# ODD Task — Inventory Receive and Adjust (Block 2)

**Status:** Implementation committed; final exact-HEAD validation pending.  
**Repository:** `BTF14/Micro-app`  
**Base:** `main` = `bc08e00468769a54c69d5c8d6464ff423d5c17d5`  
**Working branch:** `feat/inventory-receive-and-adjust-20261113`  
**Draft PR:** [#352](https://github.com/BTF14/Micro-app/pull/352)  
**Current implementation HEAD before this documentation update:** `45b632ebb3037e440a3f3d9ad4e98eafb37efbde`

## 1. Objective

Implement branch-scoped inventory receipts and physical-count adjustments without changing the authorization matrix, without granting direct runtime writes to `inventory_balances`, and without modifying production resources.

The receipt document is immutable source evidence. Stock changes are appended to the existing inventory movement ledger; `inventory_balances` remains a projection.

## 2. Scope and technical decisions

- [x] Create this ODD task file as the first deliverable on the existing branch.
- [x] Read the existing 0019 ledger migration/assertions, inventory count/read routes, UI, restore scripts, and affected workflows before implementation.
- [x] Preserve `apps/api/src/authorization.ts` byte-for-byte; `ROLE_OPERATIONS`, `authorizeBranchOperation()`, and `resolveBranchContext()` were not edited.
- [x] Keep `inventory.receive` and `inventory.adjust` owner/admin/inventory-only; cashier remains read-only.
- [x] Reuse existing physical-count create/confirm endpoints for `inventory.adjust`; do not introduce a second adjustment ledger.
- [x] Preserve the existing 0019 movement-source validator contract and all of its literal error tokens while adding the receipt source case.

## 3. Database implementation

Migration `0025_inventory_receipts.sql` and `0025_inventory_receipts.assertions.sql` are present.

- [x] Receipt header and immutable receipt-line tables with tenant/branch/warehouse/product foreign keys.
- [x] Idempotency key, SHA-256 request hash, canonical request payload, and 409-compatible conflict signal when payload, reason, branch, or warehouse differs.
- [x] `create_inventory_receipt(...)` is `SECURITY DEFINER`, owned by `microapp_migrator`, with `SET search_path = pg_catalog, public`.
- [x] `PUBLIC` execution revoked; only `microapp_runtime` receives explicit EXECUTE.
- [x] Runtime receives SELECT-only access to receipt tables; no direct INSERT/UPDATE/DELETE.
- [x] Runtime retains zero direct table/column write privileges on `inventory_balances`; projection is updated only through the existing ledger trigger path.
- [x] The function revalidates active organization membership, allowed role, branch scope, inventory-role branch membership, active warehouse, and product tenant scope.
- [x] Lock order is organization/membership → branch/branch membership → warehouse → document/idempotency → ledger/projection/balance → audit.
- [x] Receipt document, lines, movements, balance projection, and audit event commit or roll back atomically.

## 4. API and UI

- [x] GET/POST `/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/receipts`.
- [x] POST checks `isTrustedOrigin`, JSON content type, 128 KiB body cap, 500-line cap, UUID/product scope, positive quantity (max 3 decimals), non-negative unit cost (max 4 decimals), reason (1–500 chars), and required `Idempotency-Key`.
- [x] Incompatible reuse of an idempotency key returns HTTP 409.
- [x] Both receipt routes set `Cache-Control: private, no-store`; API errors are sanitized.
- [x] `InventoryPanel.tsx` provides receipt and physical-count workflows; after success it refreshes inventory balances and receipt history.
- [x] `App.tsx` passes `canManageInventory` only for owner/admin/inventory; cashier sees no write controls.
- [x] Physical-count flow uses the existing create + confirm API.

## 5. Restore and CI integration

- [x] Added `bcv-0025` without changing the existing profiles: main=16, bcv=23, bcv-0024=24, bcv-0025=25.
- [x] Updated `reapply_restore_role_grants.sh`, `restore_remote_backup_ephemeral.sh`, `test_restore_role_grants_profiles.sh`, BCV backup-restore schema test, and managed-owner membership test.
- [x] Added 0025 assertions to CI/migration validation and managed-owner validation.
- [x] Ensured PR branches `feat/**` trigger verify, Playwright, and Semgrep; backup/restore smoke covers this branch and migration paths.
- [x] Opened PR #352 as Draft to trigger real runners. It must remain Draft until every required check is SUCCESS on the exact final HEAD.

## 6. Tests added

PostgreSQL 18 runtime-login integration tests cover:

- successful receipt, ledger movement, balance projection, and audit;
- idempotent replay and HTTP 409 on changed payload;
- strict input, content-type, idempotency-header, body-size, line-count, and decimal validation;
- concurrent receipts for the same product without lost stock/deadlock;
- untrusted origin, cashier write, foreign product, cross-tenant, and cross-branch denial;
- atomic rollback when audit insertion fails;
- direct runtime balance-write denial.

Frontend tests verify write controls are hidden without management permission and visible when authorized.

## 7. CI history and current gate

A previous exact HEAD, `9fc679dd6eb9152ed822d8455661aa42ec6947aa`, completed all reported checks successfully, including verify, PostgreSQL migration validation, migration-runner, PostgreSQL 18 managed-owner contract, BCV/main/legacy restore smoke, Playwright, Semgrep, Trivy, secret-history scan, dependency review, and Cloudflare Pages.

That HEAD exposed and resolved a real concurrency deadlock in the receipt path. The current branch adds additional strict-validation and cashier-visibility tests after that successful run. **Those newer tests and the documentation update still require a fresh full CI pass on the final exact HEAD.** Do not reuse the previous SHA's checks as evidence for the final commit.

- [ ] All required check-runs/workflow runs SUCCESS on the exact final PR HEAD, with no pending or failed checks.
- [ ] Only after that gate, convert PR #352 from Draft to Ready for review and request Tech Lead audit.
- [ ] Do not merge this PR; merge authority remains with the owner/Tech Lead.

## 8. Explicit exclusions and invariants

- Do not modify `main`, Neon `main`, production data, database secrets, Cloudflare manually, or Cron.
- Do not activate `BCV_SYNC_ENABLED`; preserve the disabled state.
- Do not modify PRs #193, #314, #315, or #316.
- Keep issue #53 OPEN / P0.
- Keep `PRODUCTION: NOT READY`.
- Keep budget at USD 0.
- No merge is authorized by this task.
