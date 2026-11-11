# Dual backup/restore profile integration

**Date:** 2026-11-11  
**Target branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Starting HEAD:** `91b52ee6f0e501d8a0e4f2532961800390b546b1`

## Objective

Preserve both populated encrypted restore profiles without applying incompatible fixtures to one schema:

- Main baseline: migrations 0001–0016, paired-intent ledger, fixture `scripts/backup_restore_fixture_main.sql`, runner `scripts/test_backup_restore_schema.sh`.
- BCV integration: migrations 0001–0022, ledger projection, BCV sync state and producer role, fixture `scripts/backup_restore_fixture_bcv.sql`, runner `scripts/test_backup_restore_schema_bcv.sh`.

## Design decision

1. Run the main and BCV profiles as separate GitHub Actions jobs. Each job owns an independent PostgreSQL 18 service container and therefore its own isolated source/restore databases. No profile shares or reuses the other's database.
2. Pin the main profile's migration bundle to immutable baseline commit `c5373564413ba086690552c6b7deeab08d7b4a89`, the main baseline from which the two profile branches diverged. Fetch only that public commit in CI, archive its `apps/api/migrations` directory to a temporary directory, and pass it to the existing fail-closed runner through its supported `MIGRATIONS_DIR` override.
3. Keep the BCV profile on the checked-out PR ref so it applies the complete 0001–0022 chain and validates migration 0019 projection plus 0020–0022 BCV controls.
4. Run the legacy 13-table regression once in the BCV job after its full profile, preserving it without redundant execution.
5. Extend path filters to include both profile scripts/fixtures and the migration runner. Keep all tests synthetic and disposable.

The immutable main migration snapshot is intentional: after the projection branch is eventually integrated, the main paired-intent regression must continue testing the historical 0001–0016 schema rather than accidentally applying its fixture to the newer projection schema.

## Acceptance gates

- Main job proves exactly 16 migrations and paired-intent model; BCV job proves exactly 22 migrations and projection model.
- Each job runs in a distinct PostgreSQL 18 service container; no shared DB, fixture, or migration ledger.
- Both profiles independently complete encrypted dump, SHA-256 verification, decryption, restore, schema/data/ownership/ACL/RLS/role/search_path assertions and ephemeral-auth exclusion.
- Legacy regression remains enabled.
- Full workflow CI is green on the final exact HEAD; inspect job/step outcomes, not only aggregate status.
- No merge, retarget, rebase, base sync, production restore, Neon access, secret access, role/grant mutation, manual backup, Cron activation, deployment, billing, or real data.

## Open security boundary

These synthetic tests do not prove the identity/least privilege of `DATABASE_URL_BACKUP_RO`, restore of the remote scheduled artifact, production restore bootstrap under `--no-owner --no-privileges`, sustained RPO/RTO, external alert delivery, or total cost $0. Issue #53 remains OPEN/P0; production remains NOT READY.


## Backup dump principal — continuation 2026-11-11

The current integration target is the checked-out BCV/projection profile, which applies migrations **0001–0023** and uses `scripts/backup_restore_fixture_bcv.sql`. Do not reuse the historical paired-intent fixture for this profile. The full-schema BCV smoke creates a synthetic direct LOGIN `microapp_backup` in the disposable PostgreSQL service, grants database `CONNECT`, schema `USAGE`, table `SELECT` and sequence `SELECT` only; PostgreSQL requires table SELECT to acquire the `ACCESS SHARE` locks used by `pg_dump`, including on excluded tables. The archive still omits ephemeral auth rows through `--exclude-table-data`. verifies no elevated attributes/memberships/ownership or DML/DDL/sequence-write privileges, and invokes `pg_dump` using that role. It continues to use `--exclude-table-data` for the three ephemeral auth tables and asserts their DDL exists after restore with zero rows. This synthetic role test does not establish the effective identity of `DATABASE_URL_BACKUP_RO` in production.


**CI correction note:** PostgreSQL 18 `pg_dump` locks every selected relation in `ACCESS SHARE` mode even when `--exclude-table-data` skips its rows. Therefore the synthetic backup principal retains read-only `SELECT` on the three ephemeral auth tables to permit the dump lock; no DML/DDL/sequence-write privileges are granted, and their data remains excluded from the archive and absent after restore.
