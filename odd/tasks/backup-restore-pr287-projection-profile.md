# Restore profile for PR #287 — BCV + ledger projection

**Date:** 2026-11-10  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Validated code SHA:** `7746e86140cdf3a98911665f6955e57a256bfd4b`

## Objective

Add an isolated encrypted backup/restore test for the actual migration model in PR #287 (0001–0022), without reusing the incompatible main-ref ledger-intent fixture.

## Required branch-specific invariants

- Migration 0019 removes `inventory_balance_ledger_intents`; `warehouse_inventory_movements` is the write source and `project_inventory_movement_to_balance()` projects balances.
- Fixture SQL must not INSERT/UPDATE/DELETE `inventory_balances` directly.
- Opening and physical counts must be confirmed by an authorized synthetic owner; their ledger movements must project balance changes.
- Checkout must use the exact Caracas effective date required by migration 0020 and a latest successful `bcv_sync_state` row required by 0021.
- Completed sale must satisfy migration 0017 reconciliation and migration 0018 sequential `allocation_position` contract.
- Migration 0022's `microapp_bcv_sync` LOGIN must remain NOINHERIT, membership-free, USAGE-only on public schema, and restricted to required column-level grants.
- The manifest must compare `pg_attribute.attacl` and effective column privileges; table-level ACLs alone do not prove the producer's contract.

## Implementation

- `scripts/backup_restore_fixture_bcv.sql`: two synthetic tenants, opening/physical counts, ledger-projected balances, current-date synthetic BCV sentinel, successful sync-state sentinel, completed checkout, payment allocation, audit.
- The BCV rate value is fabricated for disposable CI. `BCV_OFFICIAL_HTML_V1` is only the source marker required by the database guard; it is not a real quote and must never be presented as official data.
- `scripts/test_backup_restore_schema_bcv.sh`: applies the full checked-out migration chain through the official runner, provisions disposable migrator/runtime/producer roles, compares schema/data/ownership/ACL/RLS/role/search_path/column grants, encrypts with age, verifies checksum, decrypts and restores to a second disposable PostgreSQL 18 database.
- `.github/workflows/backup-restore-smoke.yml`: runs the new profile and retains the legacy 13-table synthetic test as an additional regression.

## Validation

- Backup restore job: `42872318369` SUCCESS.
- 22 numbered migrations applied by `scripts/db/migrate.sh`.
- Schema, ownership, ACL, RLS/policies, role contract, effective search_path and column-level ACL/effective privileges preserved.
- Populated BCV/checkout/projection-ledger graph restored; auth ephemeral tables seeded in source and excluded from restore.
- Round-trip: 3 seconds.
- Exact HEAD `7746e86140cdf3a98911665f6955e57a256bfd4b`: 11/11 pull_request workflows SUCCESS; 0 legacy status contexts; 0 formal reviews; 0 review threads.
- PR #287 remains OPEN/Draft, 224 ahead / 1 behind main; mergeable=true. No merge or base sync.

## Limitations and next gates

- This synthetic test uses default `pg_dump`/`pg_restore` semantics to preserve ownership and ACLs. The production backup workflow uses `--no-owner --no-privileges`; this profile is not an exact replay of the production artifact's restore semantics. A separate restore bootstrap for production flags remains unproven.
- It does not restore the real remote backup artifact, prove the effective principal behind `DATABASE_URL_BACKUP_RO`, or prove least privilege, RPO/RTO, external alerts or total cost USD 0.
- Issue #53 remains OPEN/P0. Production NOT READY.
- No manual backup, no workflow_dispatch against production, no Neon access, no secrets, no Cron, no main changes, no deploy, no real data.
