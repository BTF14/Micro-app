# ODD Task — Reconstruct ownership and ACLs for production-style backup restore

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related:** PR #287, PR #303, issue #53 (OPEN/P0)

## Problem

The scheduled backup uses `pg_dump --no-owner --no-privileges --format=custom`. A restore cannot assume that object ownership or grants are present in the archive. Re-running the migration runner is not a permissions bootstrap: the restored `schema_migrations` ledger already marks all schema migrations as applied.

An initial experiment that replayed only migration 0012's grants was rejected by the manifest: it reintroduced the `INSERT` privilege on `inventory_balances`, which later migration 0019 intentionally revoked. This confirmed that restore must reproduce the final ACL state, not just an early grant snapshot.

## Implemented synthetic procedure

Both full-schema restore runners now exercise the production dump flags in independent PostgreSQL 18 databases:

1. Provision synthetic LOGIN roles and CONNECT privileges in the disposable cluster. No production credentials or role changes are involved.
2. Prepare the target `public` schema ACL: remove PUBLIC CREATE, grant USAGE/CREATE to `microapp_migrator`, and USAGE only to runtime and producer.
3. Restore the custom dump using a direct `microapp_migrator` connection with `--no-owner --no-privileges`. Objects and SECURITY DEFINER functions are therefore reconstructed as owned by the migrator rather than by the administrative restore login.
4. Reapply only top-level `GRANT`, `REVOKE`, and `ALTER DEFAULT PRIVILEGES` statements from the exact ordered migration bundle. No schema, function, trigger, index, or data DDL is replayed. Later ACL revocations supersede historical grants.
5. For the BCV projection profile, omit only historical ACL statements for paired-intent objects deliberately removed by migration 0019.
6. Compare source and restored schema/data manifests, object/function owners, relation/column/function ACLs, default ACLs, RLS/policies, effective role privileges, role search paths, migration ledger, tenant graph, inventory/checkout invariants, and empty ephemeral-auth tables.

Implementation:
- `scripts/db/reapply_restore_role_grants.sh`
- `scripts/test_backup_restore_schema.sh`
- `scripts/test_backup_restore_schema_bcv.sh`

## Verified evidence

At implementation HEAD `0ddd0da742b474b7256675b9c32292d7750fc2b0`, GitHub Actions completed:
- Backup restore smoke run `42989180384`: main paired-intent job `130417569364` SUCCESS; BCV projection job `130417569035` SUCCESS, including the legacy regression.
- CI `42989180406` SUCCESS; unit tests, typecheck/build, full PostgreSQL integration matrix and runtime-role API integration SUCCESS.
- Database migration validation `42989180481`, migration runner `42989180433`, Playwright `42989180533`, Security `42989180423`, Secret history `42989180435`, Dependency review `42989180627`, ODD validation `42989180614`, dashboard `42989180391`, Semgrep `42989180708`: SUCCESS.
- Push-triggered Security `42989174137` and Secret history `42989174210`: SUCCESS.

The two full-schema profiles are separate jobs and separate PostgreSQL services. The test uses synthetic data only.

## Remaining production gates

This does **not** yet certify an operational production restore:
- The target cluster/database and the three LOGIN roles must be provisioned through an approved provider-specific procedure, with credentials injected securely outside the dump. The synthetic test pre-creates roles; it does not manage production credentials.
- The actual identity and effective least privilege of `DATABASE_URL_BACKUP_RO` remain unverified until the next naturally scheduled backup diagnostic completes.
- No remote encrypted artifact has been restored; age key custody/recovery, repository access, and the full operator runbook still need verification.
- RPO/RTO, external alert delivery, provider-specific ownership constraints, extension/managed-role compatibility, and total cost $0 remain open.
- Do not run backup workflow_dispatch, inspect secrets, mutate Neon roles/grants, deploy, enable Cron, or use real data for this task.

Issue #53 remains OPEN/P0. PR #287 remains OPEN/Draft. Production remains NOT READY.
