# ODD Task — Backup/restore smoke coverage for the full versioned schema

**Date opened:** 2026-11-10  
**Priority:** P0 / Security Level 1  
**Branch:** `security/backup-restore-schema-coverage-20261110`  
**Base:** `main` at `c5373564413ba086690552c6b7deeab08d7b4a89`  
**Related issue:** #53 (OPEN/P0)  
**MVP deadline:** 2026-12-01 — immovable  
**Production:** NOT READY

## Authorization and scope

This task is limited to strengthening the disposable, synthetic backup/restore verification. It does not authorize production changes, Neon access, secret access, workflow_dispatch against the production backup, Cloudflare changes, or changes to the private backup repository.

Keep the change separate from PR #287. That PR contains migrations 0017–0022 and remains OPEN/Draft; those migrations are not part of main at this task's base. Do not claim that main already contains them or make this task depend on merging #287.

## Observed baseline and defect

On 2026-11-10, the following files were inspected on main:

- `.github/workflows/backup-restore-smoke.yml` blob `0004e714c0806992dec4f87de8f1d79aa579d939`.
- `scripts/test_backup_restore.sh` blob `2ce277b7169b3424099238d237d549fd9dd65ebf`.
- `scripts/db/migrate.sh` and `.github/workflows/migration-runner.yml`.

The smoke script currently applies only migrations 0001, 0002 and 0005, manually. Its fixture/manifest covers 13 tables and excludes `auth_sessions`, `auth_rate_limits`, and `auth_bootstrap_attempts`. Main already has migrations 0001–0016, including branch scope, register shifts, warehouse inventory, count ledger validation, balance-ledger coupling, runtime grants, BCV rate precision, checkout atomicity, and inventory ledger reads. Thus the synthetic restore can pass without exercising those later tables, triggers, constraints, or relationships.

The official migration runner `scripts/db/migrate.sh` is the source of truth for applying the complete numbered migration sequence. It requires direct LOGIN roles `microapp_migrator` and `microapp_runtime` with strict role attributes and membership isolation. The smoke test must use the same disposable-only role model and must not bypass the migration runner.

## Desired outcome

A single CI workflow must prove that the complete schema versioned in the tested ref can be created, populated with a coherent synthetic business scenario, dumped, encrypted, checksummed, decrypted, restored into a second disposable PostgreSQL 18 database, and reconciled without exposing business rows in logs.

## Implementation plan

### 1. Align the disposable environment with the migration runner

- Provision the PostgreSQL 18 service and fixed disposable database names/URLs.
- Create the two non-superuser LOGIN roles with the same safe attributes and isolated memberships required by `scripts/db/migrate.sh`.
- Apply every numbered migration through `bash scripts/db/migrate.sh`; do not manually select a subset or duplicate migration logic.
- Fail closed if any migration is missing, duplicated, out of sequence, or fails.
- Keep all connection targets fixed to the disposable CI service; reject any other hostname, database, or URL before running commands.

### 2. Build a representative synthetic business graph

Create deterministic synthetic records covering, where present in the tested ref:

- tenant, application user, organization membership, allowlist and bootstrap state;
- branch and branch membership;
- register and a valid open/closed shift lifecycle;
- supplier, product, exchange rate and warehouse;
- inventory count header/lines, confirmation, ledger movement, balance projection and ledger intent;
- a completed sale with sale items, payment allocation, matching inventory movement, shift/branch/warehouse references and audit record;
- BCV synchronization state only when the migration exists in the tested ref.

Respect trigger ordering and deferred constraints. For checkout, create the draft and dependent rows in the required order, then complete it so database reconciliation guards execute. For inventory, use the approved immutable movement-ledger path; do not directly mutate balances where triggers prohibit it. Keep all quantities and money exact NUMERIC values.

### 3. Define an explicit, version-aware manifest

- Compare source and restored counts for each required table and a set of key synthetic rows.
- Compare important FK relationships across tenant, branch, warehouse, register shift, sale, payment, inventory movement, balance and audit.
- Verify schema objects needed for restore (constraints, indexes, triggers and functions) using deterministic metadata checks that do not print row data.
- Verify the migration ledger contains every migration in the tested ref with state `applied` and valid checksums.
- Assert the three ephemeral auth tables are absent from the restored dump.
- Do not hardcode a stale total such as 13 as a proxy for schema completeness. Derive the required numbered migration sequence from the checked-out ref and keep the business-table manifest explicit and reviewable.

### 4. Verify encrypted round-trip and recovery evidence

- Dump only the fixed disposable source database.
- Generate an ephemeral age keypair in the runner; never use repository or production keys.
- Encrypt the dump, calculate SHA-256, verify it, decrypt and restore into the fixed disposable target.
- Compare manifests and fail on any mismatch.
- Clean all temporary dump, key and decrypted files in an EXIT trap. Never upload the dump or fixture rows as artifacts.
- Record only elapsed synthetic test duration and pass/fail summaries. Do not print DSNs, tokens, fixture row contents or secrets.

### 5. CI and regression coverage

- Run on pull requests changing the smoke workflow, script, migration files or backup policy.
- Use PostgreSQL 18, same as the migration runner.
- Add tests for fixed-target refusal and for the expected exclusion of ephemeral auth tables.
- Review the complete diff, including workflow permissions, shell quoting, cleanup, and the migration runner interaction.
- Verify all required workflows on the exact final commit SHA; do not reuse parent SHA results.
- Do not merge automatically. PR #53 remains open until backup identity, effective privileges, scope, RPO/RTO, restore and operational alert/cost gates are independently evidenced.

## Separate follow-up for PR #287

PR #287 has migrations 0017–0022 on its own branch. Do not include them in this branch's base-schema assumptions. When those migrations are merged or otherwise tested in a dedicated ref, run the same restore contract against that exact ref and extend the manifest for payment allocation, balance projection, BCV effective-date policy, sync state and dedicated producer role. Verify the exact SHA and role-specific grants. Do not claim the backup role or producer role are least-privilege in Neon based on synthetic CI alone.

## Acceptance criteria

- [ ] Full migration runner applies every numbered migration in the tested ref to disposable PostgreSQL 18.
- [ ] Synthetic fixture satisfies current database triggers and lifecycle constraints.
- [ ] All explicitly required tables, constraints, and cross-table relationships match before and after restore.
- [ ] Encrypted dump checksum, decryption and PostgreSQL restore all pass.
- [ ] Ephemeral auth tables are absent from restored schema.
- [ ] Fixed-target guard rejects non-disposable targets.
- [ ] No secret, DSN, business row, dump, or private key is logged or uploaded.
- [ ] Exact-HEAD CI results are recorded; no inherited/stale status.
- [ ] CURRENT_STATE, STATE_JOURNAL and HANDOFF are reconciled after verified completion.
- [ ] Issue #53 remains open until all independent P0 backup controls are proven.

## Explicit non-goals

- Do not read or rotate GitHub secrets.
- Do not connect to Neon main or any production database.
- Do not run the scheduled/manual production backup workflow.
- Do not modify backup grants, roles, cron, Cloudflare, DNS, billing, or the remote backup repository.
- Do not use real customer, sales, payment or inventory data.
- Do not merge PR #287 or any other PR as part of this task.

## Current state

Task opened after a static audit on 2026-11-10. The finding is recorded in issue #53 comment 6772340874. No code or workflow changes have been made yet. The next action is implementation design against the exact current migrations and existing checkout/inventory integration fixtures, then a disposable CI run.
## Exact schema delta confirmed during follow-up

The current main migration sequence 0001–0016 adds ten persistent tables beyond the old 13-table fixture:

- 0003: `branches`, `branch_memberships`
- 0004: `registers`, `register_shifts`
- 0006: `warehouses`, `inventory_counts`, `inventory_count_lines`, `inventory_balances`, `warehouse_inventory_movements`
- 0010: `inventory_balance_ledger_intents`

The current manifest's 13 persistent tables plus these ten tables equals 23 application tables in the main baseline. The migration runner additionally creates `schema_migrations`; the test must explicitly verify whether this metadata table is included in the dump/restore contract and include it if the intended recovery procedure relies on it. The three ephemeral tables remain excluded: `auth_sessions`, `auth_rate_limits`, `auth_bootstrap_attempts`.

The PR #287 branch has one additional table from migration 0021: `bcv_sync_state`. It is not part of the main baseline at this task's base SHA and must only be included when testing that branch/ref.

Follow-up evidence was added to issue #53 comment 6772383789. No source changes or CI executions have been made.
