#!/usr/bin/env bash
# Explicit, reviewed adoption of a pre-ledger legacy schema.
#
#   adopt-baseline.sh verify   read-only: live public schema must equal the
#                              canonical 0001+0002 structure and have no ledger.
#   adopt-baseline.sh apply    one transaction: re-verify, create the ledger,
#                              transfer object ownership to microapp_migrator and
#                              record 0001-0002 with the repository checksums.
#
# scripts/db/migrate.sh is intentionally NOT changed: it still refuses a populated
# schema without a ledger. Adoption never guesses; it compares structure.
set -euo pipefail

mode="${1:-}"
case "$mode" in verify|apply) ;; *) echo "Usage: $0 verify|apply" >&2; exit 2 ;; esac
: "${ADOPTION_DATABASE_URL:?Set ADOPTION_DATABASE_URL to a connection that owns the legacy objects}"
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum is required." >&2; exit 2; }

BASELINE_VERSION="0002"
LOCK_A=20261105; LOCK_B=120012            # same advisory lock as migrate.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$REPO_ROOT/apps/api/migrations}"
EXPECTED="$MIGRATIONS_DIR/baselines/$BASELINE_VERSION.schema.txt"
[[ -f "$EXPECTED" ]] || { echo "Missing baseline fingerprint: $EXPECTED" >&2; exit 2; }

psql_q() { psql -X -At -v ON_ERROR_STOP=1 --dbname "$ADOPTION_DATABASE_URL" "$@"; }

verify() {
  local has_ledger live
  has_ledger="$(psql_q -c "SELECT pg_catalog.to_regclass('public.schema_migrations') IS NOT NULL")"
  if [[ "$has_ledger" != "f" ]]; then
    echo "BASELINE_LEDGER_ALREADY_PRESENT: adoption applies only to a schema without a ledger" >&2
    return 1
  fi
  live="$(mktemp)"
  psql_q --file "$SCRIPT_DIR/schema_fingerprint.sql" > "$live"
  if ! diff -u "$EXPECTED" "$live" > /tmp/baseline-diff.$$ 2>&1; then
    echo "BASELINE_SCHEMA_MISMATCH: live schema differs from canonical $BASELINE_VERSION (first lines):" >&2
    head -40 /tmp/baseline-diff.$$ >&2
    rm -f "$live" /tmp/baseline-diff.$$
    return 1
  fi
  rm -f "$live" /tmp/baseline-diff.$$
  echo "BASELINE_VERIFIED: live public schema matches canonical $BASELINE_VERSION ($(wc -l < "$EXPECTED") facts)"
}

verify
[[ "$mode" == "verify" ]] && exit 0

if [[ "${ADOPT_BASELINE_CONFIRM:-}" != "adopt-$BASELINE_VERSION" ]]; then
  echo "Refusing to write: set ADOPT_BASELINE_CONFIRM=adopt-$BASELINE_VERSION after reviewing the verify output." >&2
  exit 3
fi

rows=""
for id in 0001 0002; do
  files=("$MIGRATIONS_DIR/${id}_"*.sql)
  base=""
  for f in "${files[@]}"; do
    case "$f" in *.assertions.sql|*.deferred_failure.sql) continue ;; esac
    base="$f"
  done
  [[ -n "$base" && -f "$base" ]] || { echo "Missing migration file for $id" >&2; exit 2; }
  sum="$(sha256sum "$base" | awk '{print $1}')"
  rows+="$( [[ -n "$rows" ]] && echo ',' ) ('$id', '$(basename "$base")', '$sum', 'applied', pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp())"
done

psql -X -v ON_ERROR_STOP=1 --dbname "$ADOPTION_DATABASE_URL" <<SQL
BEGIN;
SELECT pg_catalog.pg_try_advisory_xact_lock($LOCK_A, $LOCK_B) AS locked \gset
\if :locked
\else
  DO \$e\$ BEGIN RAISE EXCEPTION 'MIGRATION_LOCK_NOT_ACQUIRED'; END \$e\$;
\endif

DO \$adopt_preflight\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator') THEN
    RAISE EXCEPTION 'MICROAPP_MIGRATOR_ROLE_MISSING';
  END IF;
  IF pg_catalog.to_regclass('public.schema_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'BASELINE_LEDGER_ALREADY_PRESENT';
  END IF;
  -- ALTER ... OWNER TO requires the new owner to hold CREATE on the schema.
  IF NOT pg_catalog.has_schema_privilege('microapp_migrator', 'public', 'CREATE')
    OR NOT pg_catalog.has_schema_privilege('microapp_migrator', 'public', 'USAGE')
  THEN
    RAISE EXCEPTION 'POSTGRES_SCHEMA_BOOTSTRAP_PRIVILEGES_INVALID: grant USAGE, CREATE on schema public to microapp_migrator first';
  END IF;
  -- Managed PostgreSQL (Neon): the owner is not a superuser and holds only ADMIN
  -- OPTION on roles it created, which cannot SET ROLE. Grant SET for this
  -- transaction only; it is revoked below, before the runner's membership check.
  IF NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname = current_user)
    AND NOT pg_catalog.pg_has_role(current_user, 'microapp_migrator', 'SET')
  THEN
    EXECUTE pg_catalog.format('GRANT microapp_migrator TO %I WITH SET TRUE, INHERIT FALSE', current_user);
    PERFORM pg_catalog.set_config('microapp.adopt_temp_set_grant', 'on', true);
  END IF;
END
\$adopt_preflight\$;

CREATE TABLE public.schema_migrations (
  version text PRIMARY KEY CHECK (version ~ '^[0-9]{4}\$'),
  filename text NOT NULL UNIQUE,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}\$'),
  state text NOT NULL CHECK (state IN ('applying', 'applied')),
  started_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  applied_at timestamptz,
  CHECK (
    (state = 'applying' AND applied_at IS NULL)
    OR (state = 'applied' AND applied_at IS NOT NULL)
  )
);

-- Ledger is written and verified first: after the ownership transfer below the
-- adopting owner (without SET on microapp_migrator) can no longer touch it.
INSERT INTO public.schema_migrations (version, filename, checksum, state, started_at, applied_at)
VALUES $rows;

DO \$adopt_ledger_verify\$
BEGIN
  IF (SELECT count(*) FROM public.schema_migrations WHERE state = 'applied') <> 2 THEN
    RAISE EXCEPTION 'BASELINE_LEDGER_WRITE_FAILED';
  END IF;
END
\$adopt_ledger_verify\$;

-- Future migrations run as microapp_migrator, which must own what they ALTER.
DO \$adopt_ownership\$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, c.relkind
      FROM pg_catalog.pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relkind IN ('r','p','v','m','f','S')
       -- Sequences owned by a column follow their table.
       AND NOT (c.relkind = 'S' AND EXISTS (
             SELECT 1 FROM pg_catalog.pg_depend d
              WHERE d.objid = c.oid AND d.deptype IN ('a','i')
                AND d.refobjid <> 0 AND d.classid = 'pg_class'::regclass))
  LOOP
    EXECUTE pg_catalog.format('ALTER %s %I.%I OWNER TO microapp_migrator',
      CASE r.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW'
                     WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END,
      'public', r.relname);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_catalog.pg_proc p WHERE p.pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE pg_catalog.format('ALTER FUNCTION %s OWNER TO microapp_migrator', r.sig);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_catalog.pg_type t
            WHERE t.typnamespace = 'public'::regnamespace AND t.typtype IN ('e','d')
  LOOP
    EXECUTE pg_catalog.format('ALTER TYPE public.%I OWNER TO microapp_migrator', r.typname);
  END LOOP;
END
\$adopt_ownership\$;

DO \$adopt_revoke\$
BEGIN
  IF pg_catalog.current_setting('microapp.adopt_temp_set_grant', true) = 'on' THEN
    EXECUTE pg_catalog.format('REVOKE microapp_migrator FROM %I', current_user);
  END IF;
  IF pg_catalog.pg_has_role(current_user, 'microapp_migrator', 'SET')
    AND NOT (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname = current_user)
  THEN
    RAISE EXCEPTION 'BASELINE_TEMPORARY_ROLE_GRANT_NOT_REVOKED';
  END IF;
END
\$adopt_revoke\$;

DO \$adopt_verify\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p','v','m','f')
       AND pg_catalog.pg_get_userbyid(c.relowner) <> 'microapp_migrator'
  ) THEN
    RAISE EXCEPTION 'BASELINE_OWNERSHIP_TRANSFER_INCOMPLETE';
  END IF;
END
\$adopt_verify\$;
COMMIT;
\echo BASELINE_ADOPTED: ledger created, ownership transferred, 0001-0002 recorded
SQL
