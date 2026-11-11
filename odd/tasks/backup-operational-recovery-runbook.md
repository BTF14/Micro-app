# ODD Task — Operational backup and recovery runbook (zero-cost, fail-closed)

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** integration/bcv-checkout-rehearsal-20261109  
**Related:** issue #53 (OPEN/P0), .github/workflows/backup.yml, .github/workflows/backup-real-restore.yml

## Purpose and boundary

Convert the existing encrypted-backup and synthetic-restore implementation into a reproducible operator procedure without accessing production credentials, reading a real backup, changing Neon, or triggering a manual workflow.

This is an operational runbook and readiness checklist. It is **not** evidence that a real remote restore, alert delivery, RPO/RTO, or provider recovery has been exercised.

## Current backup design

Verify against the workflow before each incident:

- Scheduled GitHub Actions workflow: .github/workflows/backup.yml, daily at 07:00 UTC (03:00 Venezuela time), plus a manual trigger that is not to be used for routine validation.
- Source connection is the repository Actions secret DATABASE_URL_BACKUP_RO; its actual principal is not yet verified.
- pg_dump PostgreSQL 18 custom format, --no-owner --no-privileges; ephemeral authentication table data is excluded while table schema is retained.
- The dump is encrypted with the repository's age public key before upload to private repository BTF14/micro-app-backups.
- The encrypted artifact has a SHA-256 sidecar; retention code targets 15 days.
- The diagnostic emits six booleans only and is deliberately non-blocking. A successful backup with failed/unknown diagnostic does not close the least-privilege gate.

## Recovery decision tree

### A. Suspected logical error / accidental destructive SQL in Neon

1. Stop and identify the incident time, affected tenant/branch and whether writes are continuing. Do not run compensating SQL against the source while scope is unknown.
2. Preserve the current production branch. Do not select a destructive in-place restore as the first response.
3. If the configured Neon history window covers the incident, use the provider's point-in-time branching/recovery capability to create an isolated recovery branch at a time before the incident. Confirm current project plan, history window, branch and compute/storage costs before creating anything; free-tier retention and limits can change.
4. Inspect the isolated branch read-only. Compare schema, migration ledger, tenant boundaries and affected records. Export only the minimum approved records for a controlled reconciliation; do not copy the whole recovered database over live data without a reviewed plan.
5. Switching application traffic, changing a connection string, promoting a branch, or modifying Neon main is a separate production change requiring its own approval and recovery point. This runbook does not authorize it.

Provider references (recheck current behavior/plan at incident time):
- https://neon.com/docs/introduction/branching (branching and point-in-time recovery entry point)

### B. Provider loss, corruption outside the PITR window, or independent copy required

1. Identify the newest complete artifact in BTF14/micro-app-backups/daily. Pair it with its .sha256 sidecar. Never infer validity from filename or Git commit alone.
2. Verify the sidecar against the encrypted bytes before decryption. Record artifact filename, UTC timestamp, repository commit and checksum result in the incident record; do not publish decrypted content.
3. Verify the age private identity is held by the authorized custodian outside GitHub source and outside the backup repository. Never paste it into chat, issue comments, workflow inputs, shell history, logs or commits.
4. Use the reviewed backup-real-restore.yml workflow only after it exists on the default branch and its current HEAD, permissions, secrets prerequisites, PostgreSQL version, age public-key match and target isolation have been reviewed. It is workflow_dispatch only. This task did not dispatch it.
5. The workflow must restore into its disposable PostgreSQL 18 service, not Neon and not production. It must validate archive readability, SHA-256, age public-key match, supported migration-ledger profile, migration file checksums, ownership, ACL assertions, runtime/producer LOGIN probes and empty ephemeral-auth tables. The summary must not contain business rows or credentials.
6. A successful isolated restore establishes artifact recoverability for that artifact/profile only. It does not authorize restoring over production or promoting the disposable database.
7. If a production target is later required, provision a separate target through a provider-specific, reviewed process. Create the exact required LOGIN roles and database/schema ownership before restore; inject credentials through the provider's secure secret mechanism. Do not put passwords in the dump or SQL committed to Git. Validate role attributes, memberships, extensions, database encoding/collation, PostgreSQL major version, schema ownership and grants before any application connection is pointed at it.
8. Perform read-only smoke checks first. Keep the old source intact until the recovered target passes the agreed application, financial, inventory, tenant-isolation and audit checks. Cutover/rollback is a separate authorized change with a recorded decision point.

## Exact restore implementation and safety properties

- scripts/db/restore_remote_backup_ephemeral.sh restores with direct LOGIN microapp_migrator and --no-owner --no-privileges.
- It accepts only complete contiguous main 0001–0016 or BCV 0001–0022 migration profiles.
- Main profile uses immutable migration bundle ref c5373564413ba086690552c6b7deeab08d7b4a89; BCV uses the checked-out profile bundle.
- The helper verifies filenames and SHA-256 checksums against the restored migration ledger before ordered ACL replay.
- The remote workflow provisions only synthetic roles in its ephemeral PostgreSQL service. It does not provision production roles.
- Synthetic CI exercises the same restore runner and profile checks. It is not a real remote artifact test.

## Incident record: required timestamps and measurements

Record UTC timestamps (not estimates) for:
- incident detected;
- last known-good committed business transaction;
- last successful scheduled encrypted backup;
- restore decision;
- target provisioning start/end;
- checksum/decryption start/end;
- restore start/end;
- application smoke start/end;
- recovery/cutover completion (if separately authorized).

Calculate:
- **Observed backup age / practical RPO:** incident time minus timestamp of the newest backup that is both complete and independently verified. A daily schedule is not itself proof of a 24-hour RPO.
- **Measured restore duration:** restore start to database restore completion.
- **Measured operational RTO:** incident declaration to verified service recovery, including provisioning, validation and approved cutover. Do not report the pg_restore duration alone as RTO.

No RPO or RTO target is approved or measured yet. Do not invent or publish a service commitment. After at least one successful remote-artifact rehearsal and a full application recovery drill, propose targets based on measured durations, backup cadence, retention and business tolerance for owner approval.

## Alerting and zero-cost constraints

- GitHub Actions failure summary is an operator-visible signal, not proof of external alert delivery.
- Check repository Actions notifications and workflow history; record who is responsible for checking them and the maximum detection delay. No independent paging channel is currently verified.
- Do not add a paid monitoring, messaging, backup, database or compute service. Before any optional free integration, verify limits, expiration, data exposure and that it remains $0.
- Confirm actual GitHub Actions minutes/storage and backup repository storage/retention remain within free allowances. Provider free tiers and limits may change; $0 must be rechecked, not assumed.
- A backup job failure must not trigger deletion of the last known-good artifact. Retention must preserve at least one verified copy; inspect pruning behavior before modifying it.

## Hard prohibitions

No manual backup dispatch, no manual remote-restore dispatch under this task, no reading/printing secrets, no real-data download/decryption, no Neon main writes, no remote role/grant mutation, no production deployment/cutover, no Cron changes, no DNS/Cloudflare sensitive changes, no billing activation and no paid services.

## Acceptance gates to close issue #53

1. Observe a naturally scheduled backup run after the diagnostic is present on the default branch; capture the six booleans and backup outcome without exposing sensitive values.
2. Complete an explicitly authorized remote encrypted-artifact restore into an isolated disposable target; retain only safe run metadata and pass/fail evidence.
3. Validate provider-specific target/role bootstrap without committing credentials or changing production roles.
4. Demonstrate a complete application recovery drill and record measured RPO/RTO.
5. Prove alert delivery and ownership of the response process.
6. Reconfirm total cost $0 and retention of at least one independently verified artifact.
7. Keep issue #53 OPEN/P0 and production NOT READY until every gate is evidenced.

## Current status

The synthetic main and BCV restore profiles, ordered ACL reconstruction, runtime read/no-CREATE probe and BCV producer rollback-only write probe are validated in CI. The live branch HEAD at task creation is recorded in the handoff. No real remote archive or age private key has been accessed, and no manual workflow was dispatched.


## Package-install resilience correction — 2026-11-11

- A prior natural scheduled backup run failed before database connection while installing age because Ubuntu package mirrors could not resolve DNS. The backup workflow had retained direct `apt-get update/install` calls even though the synthetic restore workflow already used the bounded retry helper.
- PR #287 now runs `.github/scripts/test-apt-retry.sh` before package installation and uses `scripts/ci/apt-retry.sh` for both strict package-index updates and package installs. PostgreSQL PGDG key download also uses bounded curl retries and explicit timeouts.
- The helper has bounded attempts, strict `APT::Update::Error-Mode=any`, transport retries/timeouts, and returns non-zero after persistent failure. This improves transient mirror resilience without masking persistent dependency failure.
- No workflow_dispatch, real backup, secret access, Neon connection, or production operation was performed. Exact-HEAD CI for the resulting commit is pending; do not claim the production scheduled backup succeeded from this change alone.
