# Work checkpoint — BTF14/Micro-app

**Updated:** 2026-11-06 03:49 UTC  
**Base:** `main` at `71d6434a1877b5e618a093e60472621af8ef790f`  
**Branch:** `docs/reconcile-post-pr240-neon-migration-audit-20261106`  
**Scope:** read-only reconciliation and documentation checkpoint; no application, database or infrastructure changes.

## Verified
- PR #240 merged at `71d6434a1877b5e618a093e60472621af8ef790f`; 9/9 check-runs SUCCESS on that exact SHA.
- PR #213 merged at `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`.
- PR #200: `464ca08b9020fad128cc9c8a321568493d484517`, 33 ahead/2 behind current main; 19/19 checks SUCCESS on its head.
- PR #233: `070f49ec1f1e45debb7fe99d998dc2429b5da9b1`, 9/9 checks SUCCESS on its head.
- Migration collision: main `0005_auth_bootstrap_attempts`; stack `0005_warehouse_inventory` and duplicate auth `0010_auth_bootstrap_attempts`. Auth SQL blob is identical between main 0005 and stack 0010.
- Neon main read-only audit: no dedicated runtime/migrator logins; provider role inheritance grants read/write-all to backup/service/owner roles; cloud_admin superuser; no schema_migrations ledger; public schema populated.
- Migration runner requires direct microapp_migrator login and a clean schema or a separately reviewed baseline adoption. It cannot safely initialize current Neon main as observed.

## Candidate migration order
0001 initial; 0002 Google identity; 0003 branch scope; 0004 register shifts; 0005 auth bootstrap; 0006 warehouse inventory; 0007 register shift roles; 0008 audit append-only; 0009 inventory count validation; 0010 inventory balance-ledger coupling; 0011 runtime lock helpers; 0012 runtime role grants; 0013 BCV precision/grants; 0014 sales without discounts; 0015 sales checkout atomicity.

This is a proposed reconciliation only. Rename paired SQL/assertion files and update CI workflows, runner fixtures, scripts, tests and documentation together. Remove duplicate auth 0010 and use main's 0005 migration.

## Persisted communication
Comment on PR #233: ID `6676411612`, containing the verified collision, candidate order and Neon blockers.

## Not done
No migration or write on Neon; no role/grant/secret change; no production data change; no Cloudflare/DNS/billing change; no production deployment or smoke test. No application code or migration file modified. Production remains **NOT READY**.

## Next actions
1. Build one coherent integration branch from current main for migration renumbering and all corresponding references.
2. Run migration-check, migration-runner, injected rollback, checksum/gap/reconciliation tests, API integration tests, typecheck, build, SAST and E2E on the integrated HEAD.
3. Separately design and test an adoption baseline for the already populated Neon schema; require specific owner approval before any production role/grant or migration operation.
4. Reconcile the stacked PRs on current main; do not merge stale bases or code depending on missing tables.
