#!/usr/bin/env bash
set -euo pipefail

: "${MIGRATION_DATABASE_URL:?Set MIGRATION_DATABASE_URL to a direct microapp_migrator connection string}"

command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum is required." >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$REPO_ROOT/apps/api/migrations}"
if [[ "$MIGRATIONS_DIR" != /* ]]; then
  MIGRATIONS_DIR="$REPO_ROOT/$MIGRATIONS_DIR"
fi
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migration directory not found: $MIGRATIONS_DIR" >&2
  exit 2
fi

shopt -s nullglob
migration_files=()
for file in "$MIGRATIONS_DIR"/[0-9][0-9][0-9][0-9]_*.sql; do
  case "$file" in
    *.assertions.sql|*.deferred_failure.sql) continue ;;
  esac
  migration_files+=("$file")
done
if [[ "${#migration_files[@]}" -eq 0 ]]; then
  echo "No numbered SQL migrations found in $MIGRATIONS_DIR" >&2
  exit 2
fi

expected=1
latest_id=""
psql_script="$(mktemp)"
trap 'rm -f "$psql_script"' EXIT

cat > "$psql_script" <<'SQL'
\set ON_ERROR_STOP on
SELECT pg_catalog.pg_try_advisory_lock(20261105, 120012) AS migration_lock_acquired
\gset
\if :migration_lock_acquired
  \echo MIGRATION_LOCK_ACQUIRED
\else
  \echo MIGRATION_LOCK_NOT_ACQUIRED
  \quit 3
\endif

DO $migration_preflight$
DECLARE
  migrator_role pg_catalog.pg_roles%ROWTYPE;
  runtime_role pg_catalog.pg_roles%ROWTYPE;
BEGIN
  IF current_user <> 'microapp_migrator' OR session_user <> 'microapp_migrator' THEN
    RAISE EXCEPTION 'MIGRATION_MUST_USE_DIRECT_MICROAPP_MIGRATOR_LOGIN';
  END IF;

  SELECT * INTO migrator_role FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator';
  SELECT * INTO runtime_role FROM pg_catalog.pg_roles WHERE rolname = 'microapp_runtime';

  IF migrator_role.rolname IS NULL OR NOT migrator_role.rolcanlogin
    OR migrator_role.rolsuper OR migrator_role.rolcreatedb OR migrator_role.rolcreaterole
    OR migrator_role.rolreplication OR migrator_role.rolbypassrls
  THEN
    RAISE EXCEPTION 'MICROAPP_MIGRATOR_ROLE_ATTRIBUTES_INVALID';
  END IF;

  IF runtime_role.rolname IS NULL OR NOT runtime_role.rolcanlogin
    OR runtime_role.rolsuper OR runtime_role.rolcreatedb OR runtime_role.rolcreaterole
    OR runtime_role.rolreplication OR runtime_role.rolbypassrls OR runtime_role.rolinherit
  THEN
    RAISE EXCEPTION 'MICROAPP_RUNTIME_ROLE_ATTRIBUTES_INVALID';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_auth_members
    WHERE member IN (migrator_role.oid, runtime_role.oid)
  ) OR pg_catalog.pg_has_role('microapp_runtime', 'microapp_migrator', 'MEMBER') THEN
    RAISE EXCEPTION 'MIGRATOR_AND_RUNTIME_ROLE_MEMBERSHIPS_MUST_BE_EMPTY';
  END IF;

  IF NOT pg_catalog.has_schema_privilege('microapp_migrator', 'public', 'USAGE')
    OR NOT pg_catalog.has_schema_privilege('microapp_migrator', 'public', 'CREATE')
    OR NOT pg_catalog.has_schema_privilege('microapp_runtime', 'public', 'USAGE')
    OR pg_catalog.has_schema_privilege('microapp_runtime', 'public', 'CREATE')
    OR NOT pg_catalog.has_database_privilege('microapp_migrator', current_database(), 'CONNECT')
    OR NOT pg_catalog.has_database_privilege('microapp_runtime', current_database(), 'CONNECT')
  THEN
    RAISE EXCEPTION 'POSTGRES_SCHEMA_BOOTSTRAP_PRIVILEGES_INVALID';
  END IF;
END;
$migration_preflight$;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY CHECK (version ~ '^[0-9]{4}$'),
  filename text NOT NULL UNIQUE,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  state text NOT NULL CHECK (state IN ('applying', 'applied')),
  started_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  applied_at timestamptz,
  CHECK (
    (state = 'applying' AND applied_at IS NULL)
    OR (state = 'applied' AND applied_at IS NOT NULL)
  )
);

DO $migration_ledger_preflight$
DECLARE
  ledger_oid oid;
  ledger_owner oid;
  required_columns integer;
BEGIN
  SELECT c.oid, c.relowner INTO ledger_oid, ledger_owner
  FROM pg_catalog.pg_class c
  WHERE c.oid = pg_catalog.to_regclass('public.schema_migrations')
    AND c.relkind = 'r';

  IF ledger_oid IS NULL THEN
    RAISE EXCEPTION 'MIGRATION_LEDGER_OBJECT_INVALID';
  END IF;

  IF ledger_owner <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'microapp_migrator') THEN
    RAISE EXCEPTION 'MIGRATION_LEDGER_MUST_BE_OWNED_BY_MICROAPP_MIGRATOR';
  END IF;

  SELECT count(*) INTO required_columns
  FROM pg_catalog.pg_attribute
  WHERE attrelid = ledger_oid
    AND attnum > 0
    AND NOT attisdropped
    AND attname IN ('version', 'filename', 'checksum', 'state', 'started_at', 'applied_at');

  IF required_columns <> 6 THEN
    RAISE EXCEPTION 'MIGRATION_LEDGER_SCHEMA_INVALID';
  END IF;

  IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE state <> 'applied') THEN
    RAISE EXCEPTION 'MIGRATION_RECONCILIATION_REQUIRED: ledger contains a non-applied migration';
  END IF;

  -- Never infer that an existing schema corresponds to this migration history.
  -- A non-empty public schema without an applied ledger requires explicit,
  -- separately reviewed baseline adoption; this runner must not guess.
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations)
    AND (
      EXISTS (
        SELECT 1 FROM pg_catalog.pg_class
        WHERE relnamespace = 'public'::regnamespace
          AND relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
          AND relname <> 'schema_migrations'
      )
      OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc
        WHERE pronamespace = 'public'::regnamespace
      )
      OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_type
        WHERE typnamespace = 'public'::regnamespace
          AND typrelid = 0
      )
    )
  THEN
    RAISE EXCEPTION 'MIGRATION_BASELINE_REQUIRED: public schema is not empty and has no applied ledger';
  END IF;
END;
$migration_ledger_preflight$;
SQL

for file in "${migration_files[@]}"; do
  base="$(basename "$file")"
  if [[ ! "$base" =~ ^([0-9]{4})_[a-z0-9_-]+\.sql$ ]]; then
    echo "Unexpected migration filename: $base" >&2
    exit 2
  fi

  migration_id="${BASH_REMATCH[1]}"
  expected_id="$(printf '%04d' "$expected")"
  if [[ "$migration_id" != "$expected_id" ]]; then
    echo "Migration sequence gap: expected $expected_id, found $migration_id ($base)" >&2
    exit 2
  fi
  expected=$((expected + 1))
  latest_id="$migration_id"

  begin_count="$(grep -Ec '^[[:space:]]*BEGIN[[:space:]]*;[[:space:]]*$' "$file" || true)"
  commit_count="$(grep -Ec '^[[:space:]]*COMMIT[[:space:]]*;[[:space:]]*$' "$file" || true)"
  if [[ "$begin_count" == "0" && "$commit_count" == "0" ]]; then
    is_transactional="false"
  elif [[ "$begin_count" == "1" && "$commit_count" == "1" ]]; then
    is_transactional="true"
  else
    echo "Migration must have either no top-level transaction markers or exactly one BEGIN/COMMIT pair: $base" >&2
    exit 2
  fi

  checksum="$(sha256sum "$file" | awk '{print $1}')"
  absolute_file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  if [[ "$absolute_file" == *"'"* ]]; then
    echo "Migration paths containing single quotes are not supported: $absolute_file" >&2
    exit 2
  fi

  cat >> "$psql_script" <<SQL
SELECT
  EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '$migration_id') AS has_row,
  COALESCE((
    SELECT checksum <> '$checksum' OR filename <> '$base'
    FROM public.schema_migrations WHERE version = '$migration_id'
  ), false) AS checksum_mismatch,
  COALESCE((
    SELECT state = 'applied' AND applied_at IS NOT NULL
    FROM public.schema_migrations WHERE version = '$migration_id'
  ), false) AS is_applied
\gset

\if :has_row
  \if :checksum_mismatch
    \echo MIGRATION_CHECKSUM_MISMATCH: $migration_id
    \quit 3
  \endif
  \if :is_applied
    \echo MIGRATION_ALREADY_APPLIED: $migration_id
  \else
    \echo MIGRATION_RECONCILIATION_REQUIRED: $migration_id
    \quit 3
  \endif
\else
  SELECT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE version > '$migration_id' AND state = 'applied'
  ) AS later_migration_applied
  \gset
  \if :later_migration_applied
    \echo MIGRATION_LEDGER_GAP: $migration_id
    \quit 3
  \endif
  \set migration_is_transactional $is_transactional
  \if :migration_is_transactional
    INSERT INTO public.schema_migrations (version, filename, checksum, state)
    VALUES ('$migration_id', '$base', '$checksum', 'applying');
    \i '$absolute_file'
    UPDATE public.schema_migrations
       SET state = 'applied', applied_at = pg_catalog.clock_timestamp()
     WHERE version = '$migration_id' AND state = 'applying';
  \else
    BEGIN;
    INSERT INTO public.schema_migrations (version, filename, checksum, state)
    VALUES ('$migration_id', '$base', '$checksum', 'applying');
    \i '$absolute_file'
    UPDATE public.schema_migrations
       SET state = 'applied', applied_at = pg_catalog.clock_timestamp()
     WHERE version = '$migration_id' AND state = 'applying';
    COMMIT;
  \endif
  DO \$migration_row_verify\$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM public.schema_migrations
      WHERE version = '$migration_id' AND checksum = '$checksum'
        AND filename = '$base' AND state = 'applied' AND applied_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'MIGRATION_LEDGER_WRITE_FAILED: $migration_id';
    END IF;
  END;
  \$migration_row_verify\$;
\endif
SQL
done

cat >> "$psql_script" <<SQL
SELECT EXISTS (
  SELECT 1 FROM public.schema_migrations WHERE version > '$latest_id'
) AS ledger_ahead_of_bundle
\gset
\if :ledger_ahead_of_bundle
  \echo MIGRATION_LEDGER_AHEAD_OF_BUNDLE
  \quit 3
\endif

DO \$migration_final_verify\$
DECLARE
  applied_count integer;
  unapplied_count integer;
BEGIN
  SELECT count(*) FILTER (WHERE state = 'applied'),
         count(*) FILTER (WHERE state <> 'applied')
    INTO applied_count, unapplied_count
  FROM public.schema_migrations;

  IF applied_count <> $((expected - 1)) OR unapplied_count <> 0 THEN
    RAISE EXCEPTION 'MIGRATION_FINAL_LEDGER_STATE_INVALID';
  END IF;
END;
\$migration_final_verify\$;

SELECT pg_catalog.pg_advisory_unlock(20261105, 120012);
SQL

psql -X -v ON_ERROR_STOP=1 --dbname "$MIGRATION_DATABASE_URL" --file "$psql_script"
