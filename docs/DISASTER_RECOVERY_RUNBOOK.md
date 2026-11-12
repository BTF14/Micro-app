# Disaster Recovery Runbook — Micro-app

**Status:** operator procedure / pre-production. This document is not evidence of a completed DR drill.  
**Gate:** Issue #53 remains OPEN/P0; **PRODUCTION: NOT READY**.  
**Target:** PostgreSQL 18, clean isolated restore target.  
**Budget:** USD 0. Never enable billing or paid storage to follow this runbook.

## 1. Storage and artifact contract

### Current active transport

The repository workflow `.github/workflows/backup.yml` currently writes encrypted artifacts to the private GitHub repository `BTF14/micro-app-backups`, under `daily/`, with 15-day retention. It uses the public age recipient committed in the workflow and the GitHub secret `BACKUP_REPO_TOKEN` for transport. It does **not** currently upload to R2/S3.

Each backup consists of:
- `backup-YYYY-MM-DDTHH-MM-SSZ.dump.age`: age-encrypted PostgreSQL custom-format dump.
- Matching `.sha256` sidecar generated from the ciphertext.

The dump excludes row data (not table definitions) for `public.auth_sessions`, `public.auth_rate_limits` and `public.auth_bootstrap_attempts`. These ephemeral tables are expected to exist after restore with zero rows.

### Conditional R2 / S3-compatible contract

Cloudflare R2 is a candidate only, not an activated destination. Its published Standard free allowance is 10 GB-month storage, 1 million Class A requests and 10 million Class B requests per month; egress is free. Usage above allowances is billable, and Infrequent Access does not receive the free allowance. Therefore “10 GB free” is not a hard cost ceiling or a guarantee of USD 0. No bucket, token, payment method, billing setting or secret may be created/changed under this task.

If a separately authorized future migration is approved, require:
1. S3-compatible endpoint with region `auto`, a dedicated bucket, private access only, and a token scoped to that bucket with object read/write only.
2. Credentials only in GitHub Actions secrets; never in workflow YAML, command arguments, artifacts or logs.
3. Object key includes UTC timestamp; upload ciphertext and SHA-256 sidecar (or a signed manifest) as separate objects.
4. Verify the local ciphertext SHA-256 before upload; read back the remote object and independently hash its bytes after upload. Do not treat multipart ETag as SHA-256.
5. Bounded retries with exponential backoff; no unbounded retry loops. On terminal failure, emit only run URL, commit SHA and a generic failure category.
6. Lifecycle/retention policy and monthly usage monitoring with a hard operational stop before any paid overage. If a zero-charge guarantee cannot be established, do not activate it.
7. Keep the current GitHub backup destination until a real remote R2 upload and restore are proven and an explicit cutover is approved.

## 2. RPO / RTO objectives (not yet certified)

- **RPO objective:** less than 24 hours, contingent on at least one successful daily backup and a monitored failure alert. A daily cron alone does not guarantee this; missed schedules or failed uploads can exceed 24 hours.
- **RTO objective:** less than 15 minutes, measured from incident declaration to verified service-ready restored database. No evidence currently proves this target. Actual restore time depends on dump size, network throughput, PostgreSQL resources and post-restore checks.
- Record artifact timestamp, source commit, ciphertext size, checksum, backup completion time, restore start/end, validation outcome and operator. Never record DSNs, tokens, private keys or customer rows in the evidence.

## 3. Preconditions and safety

1. Declare the incident and identify the intended recovery point from artifact metadata. Confirm artifact timestamp and checksum sidecar.
2. Use a newly created, isolated PostgreSQL 18 instance/database. Never point this procedure at Neon `main`, a production database, or a database containing data that must be preserved.
3. Confirm sufficient disk, memory and network capacity. Do not proceed if the destination identity is ambiguous.
4. Obtain the age private identity from the owner's approved offline secret store. **Never paste it into chat, GitHub issues, CI variables in plaintext, shell transcripts or this repository.**
5. Ensure `age`, PostgreSQL 18 client tools (`pg_restore`, `psql`, `createdb`) and `sha256sum` are installed and version-checked.
6. Set shell history off for the session where practical (`set +o history` in interactive Bash), use restrictive umask and a private temporary directory. Do not put credentials in command-line arguments.

## 4. Download and verify ciphertext

Use the repository's approved private-backup access procedure (or, after a separately approved migration, the corresponding S3-compatible download tool). Do not make the backup repository public.

```bash
set -euo pipefail
umask 077
ARTIFACT='backup-YYYY-MM-DDTHH-MM-SSZ.dump.age'
# Download both the artifact and its .sha256 sidecar into a private working directory.
sha256sum --check --strict "${ARTIFACT}.sha256"
```

A failed checksum is a hard stop. Do not decrypt or restore a checksum-mismatched artifact. Download again using bounded retries and verify again.

## 5. Restore into a clean PostgreSQL 18 database

Set `RESTORE_URL` to the connection string for the newly created, isolated recovery database through a protected environment variable or secret manager. Never use Neon main. Do not echo the value or enable shell tracing (`set -x`).

First confirm server major version and that the target database is empty/clean. Create a fresh database rather than dropping or overwriting an existing database. Apply no application writes until the restore is validated.

For a streaming restore (no plaintext dump file on disk):

```bash
set -euo pipefail
age --version
pg_restore --version
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'SHOW server_version_num' |
  awk '$1 >= 180000 && $1 < 190000 { ok=1 } END { exit !ok }'
age -d -i "$AGE_IDENTITY_FILE" < "$ARTIFACT" |
  pg_restore --exit-on-error --no-owner --no-privileges --dbname="$RESTORE_URL" -
```

The `AGE_IDENTITY_FILE` path points to the offline private key file and must have restrictive permissions. The private key is read by age; it is not an argument value. The pipe must run with `pipefail` so decryption or restore errors fail the procedure. If your installed pg_restore does not support reading the custom archive from stdin, stop and use a private temporary directory on encrypted ephemeral storage; restrict permissions, verify disk cleanup, and securely remove the plaintext dump immediately after restore.

Do not use `--clean` or `--create` against an existing database. If restore fails, preserve the failed target for diagnosis only if it contains no sensitive data; otherwise securely discard the isolated target and restart with a fresh database.

## 6. Post-restore validation

Run validation queries through a protected connection environment; output only counts and pass/fail status.

### Ephemeral authentication state

The three currently excluded auth tables must exist, but contain no rows:

```sql
SELECT
  (SELECT count(*) FROM public.auth_sessions) AS auth_sessions,
  (SELECT count(*) FROM public.auth_rate_limits) AS auth_rate_limits,
  (SELECT count(*) FROM public.auth_bootstrap_attempts) AS auth_bootstrap_attempts;
```

Expected result: `0 | 0 | 0`. If the schema version contains additional ephemeral auth tables, consult the current backup exclusion list and add them to the validation before declaring success. Never restore stale sessions, rate-limit counters or bootstrap attempts.

### Schema and relational integrity

- Confirm all expected application tables, indexes, constraints, sequences and non-internal triggers exist.
- Confirm no restore errors and no missing relations.
- Run PostgreSQL constraint validation / `ALTER TABLE ... VALIDATE CONSTRAINT` only in the isolated target if any constraints were intentionally created NOT VALID; do not improvise schema changes.
- Verify foreign-key integrity:

```sql
SELECT count(*) AS orphan_sale_items
FROM public.sale_items i
LEFT JOIN public.sales s
  ON s.organization_id = i.organization_id AND s.id = i.sale_id
WHERE s.id IS NULL;

SELECT count(*) AS orphan_inventory_movements
FROM public.inventory_movements m
LEFT JOIN public.products p
  ON p.organization_id = m.organization_id AND p.id = m.product_id
WHERE p.id IS NULL;

SELECT count(*) AS orphan_payments
FROM public.payments p
LEFT JOIN public.sales s
  ON s.organization_id = p.organization_id AND s.id = p.sale_id
WHERE s.id IS NULL;
```

Expected counts: zero. Compare non-sensitive table row counts and relationship manifests with the backup's approved source manifest when available. The current synthetic CI fixtures prove selected sales, payment, product, inventory movement and audit relationships; they do not supply a real-production manifest.

- Check sequences are positioned safely relative to restored identifiers where applicable.
- Confirm no unexpected owner/grants were imported; the dump uses `--no-owner --no-privileges`. Apply the reviewed runtime/migrator/backup role grants only through the separately approved provisioning procedure, not ad hoc during DR.

## 7. Recovery completion and evidence

Before restoring service, record:
- artifact timestamp and source commit;
- SHA-256 verified (yes/no);
- PostgreSQL server major version;
- restore start/end and elapsed seconds;
- expected table count and integrity query counts;
- ephemeral auth row counts (must be zero);
- operator and incident reference;
- RPO observed (incident time minus artifact time);
- RTO observed (incident declaration to validated recovery).

Do not record the connection string, access tokens, private key, user/customer data or raw database dumps.

If all checks pass, the incident commander may authorize application reconnection using the normal deployment/secret-management procedure. This runbook itself does not authorize deployment, DNS changes, secret rotation, Neon changes or production cutover.

## 8. Drill status and production gate

The repository contains synthetic PostgreSQL 18 backup/restore tests and historical evidence of a remote artifact technical restore. Those do not prove a current real-world DR drill, current remote destination availability, business-data reconciliation, RPO/RTO, alert delivery or a zero-cost guarantee.

Until a current operator-led restore drill and all Issue #53 requirements are verified:
- Issue #53 stays OPEN/P0.
- `PRODUCTION: NOT READY`.
- Do not claim RPO <24h or RTO <15m as achieved.
- Do not activate R2/S3 or incur any cost under this task.
