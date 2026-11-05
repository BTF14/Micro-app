# PostgreSQL runtime role contract — 2026-11-05

## Status and scope

Design checkpoint originated at repository HEAD `18dfc33525c792802c296469ee6140d3b5f649ff` (PR #221), which contains the #210 balance-ledger commit `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` as an ancestor.

Implementation is now split across stacked Draft PRs:
- #222: role contract and initial evidence.
- #223: hardened row-lock helpers and trigger hardening (migration 0011).
- #224: explicit runtime grants and PostgreSQL 18 direct-LOGIN harness (migration 0012).

These PRs are not merged. CI evidence is disposable PostgreSQL only; it does not establish the effective production Neon principal or authorize production grants.

No production database, Neon branch, secret, Worker binding, or deployed configuration was accessed.

## Findings

- `apps/api/src/database.ts` constructs the Neon client directly from `DATABASE_URL`. It does not issue `SET ROLE`, assert `current_user`, or inspect ownership.
- Before #224, the migration workflow used PostgreSQL 18 with `POSTGRES_USER=microapp` for all migrations, so it did not prove a non-superuser migration owner or application runtime role.
- #224 changes both migration-check and application CI to bootstrap separate disposable LOGIN principals, apply migrations as non-superuser `microapp_migrator`, run role-creation assertions as the CI administrator, and test database operations through an actual `microapp_runtime` login.
- Migration 0007 has a useful synthetic non-owner audit test. It grants SELECT/INSERT and sequence privileges to a test role, then verifies mutation denial and append-only triggers. It is not a whole-schema runtime contract.
- Migration 0009 revokes PUBLIC access to its private balance/ledger intent table and SECURITY DEFINER functions. Its assertions validate pairing invariants, not the complete runtime role.
- Migration 0010 revokes PUBLIC access to `auth_bootstrap_attempts`; its assertions validate shape, uniqueness and privacy, not runtime SELECT/INSERT/UPDATE/DELETE.
- `auth_rate_limits` is created in 0001. Migration 0012 grants only the columns used by INSERT/ON CONFLICT UPDATE/RETURNING and retention DELETE, including SELECT on `updated_at` for the cleanup predicate.
- This is an evidence/configuration gap. It does not prove that production is broken or that production uses an owner.

## Runtime SQL inventory

The following matrix is derived from active production callsites in `apps/api/src` at the HEAD above. Operations performed inside trigger functions are listed separately below. No grant should be added for a schema table merely because the table exists.

| Table/object | Active handler/callsite | Required direct operations | Notes |
|---|---|---|---|
| `auth_allowlist` | `google-auth.ts` | SELECT | Access decision only. |
| `auth_bootstrap` | `google-auth.ts` | SELECT, UPDATE | Locks and consumes the one-time bootstrap sentinel. |
| `auth_bootstrap_attempts` | `google-auth.ts`, `auth-rate-limit.ts` cleanup | SELECT, INSERT, UPDATE, DELETE | Opaque handoff; DELETE is scheduled retention cleanup. |
| `auth_rate_limits` | `auth-rate-limit.ts` | INSERT, UPDATE, DELETE | Atomic upsert plus scheduled retention cleanup. |
| `auth_sessions` | `auth.ts`, `google-auth.ts`, `tenant-context.ts` | SELECT, INSERT, UPDATE | Create, resolve and revoke sessions. |
| `app_users` | `auth.ts`, `google-auth.ts`, tenant/branch context | SELECT, INSERT | No active user UPDATE/DELETE callsite. |
| `organizations` | `google-auth.ts`, auth/tenant/branch context | SELECT, INSERT | No active organization UPDATE/DELETE callsite. |
| `organization_members` | `google-auth.ts`, auth/tenant/branch context | SELECT, INSERT | No active membership UPDATE/DELETE callsite in current API handlers. |
| `branches` | `branch-context.ts`, `cashier-open-shift.ts` | SELECT | Locking is delegated to the dedicated SECURITY DEFINER helper implemented in 0011. |
| `branch_memberships` | `branch-context.ts`, `cashier-open-shift.ts` | SELECT | Locking is delegated to the dedicated SECURITY DEFINER helper implemented in 0011. |
| `registers` | `cashier-open-shift.ts` | SELECT | No active register write handler in this source tree. |
| `register_shifts` | `cashier-open-shift.ts` | SELECT | No active shift create/close handler in this source tree. |
| `products` | `catalog.ts`, `catalog-write.ts`, `inventory-counts.ts` | SELECT, INSERT, UPDATE | Catalog writes use SELECT FOR UPDATE; inventory validates product scope. |
| `audit_logs` | `catalog-write.ts`, `inventory-counts.ts` | INSERT | Current production callsites do not read audit rows. Preserve append-only protections. |
| `warehouses` | `inventory-locks.ts`, `inventory-counts.ts` | SELECT | Warehouse mutex uses the narrowly scoped SECURITY DEFINER lock function implemented in 0011; no general UPDATE grant is given. |
| `inventory_counts` | `inventory-counts.ts` and lifecycle triggers | SELECT, INSERT, UPDATE | Confirmation updates status/actor/time; SELECT FOR UPDATE is also used. |
| `inventory_count_lines` | `inventory-counts.ts` and validation trigger | SELECT, INSERT | No direct UPDATE/DELETE callsite. Trigger-side FOR SHARE is executed by the hardened SECURITY DEFINER validator from 0011; no UPDATE grant is given on count lines. |
| `inventory_balances` | `inventory-counts.ts`, `inventory-locks.ts` | SELECT, INSERT, UPDATE | Upsert changes on-hand and updated_at; row locks serialize count snapshots. |
| `warehouse_inventory_movements` | `inventory-counts.ts` | INSERT | Append-only; do not grant UPDATE/DELETE/TRUNCATE. |
| `inventory_balance_ledger_intents` | #210 migration 0009 triggers | No direct runtime access | Private transaction-scoped table; SECURITY DEFINER trigger functions own its access. |
| `suppliers`, `exchange_rates`, `sales`, `sale_items`, `payments`, legacy `inventory_movements` | No active production callsite found in current API source tree | No runtime grant justified | Revisit only when a handler is introduced. |

### Locking and trigger privilege consequences

PostgreSQL row-locking clauses (`FOR SHARE`, `FOR UPDATE`, and related strengths) require UPDATE privilege on at least one column of each locked relation. A SELECT-only table grant is therefore not sufficient for the current lock queries.

The original lock sites included:

- `tenant-context.ts`: `FOR SHARE OF s, u, m, o` over sessions, users, organization memberships and organizations.
- `branch-context.ts`: `FOR SHARE` over branches and branch memberships.
- `inventory-locks.ts`: `FOR UPDATE` over warehouses.
- `inventory-locks.ts` and `inventory-counts.ts`: row locks over inventory balances.
- `catalog-write.ts`: `FOR UPDATE` over products.
- `inventory-counts.ts`: row locks over inventory counts.

Granting UPDATE on whole read-only tables just to obtain locks is not acceptable. Migration 0011 moves tenant/session, branch/membership and warehouse lock operations into narrow SECURITY DEFINER functions owned by the migration owner. They pin `search_path = pg_catalog`, schema-qualify application tables, use fixed SQL and narrow parameters, reject malformed/duplicate targets, revoke PUBLIC EXECUTE, and preserve deterministic lock ordering. Migration 0012 grants EXECUTE only to `microapp_runtime`.

The 0008 `validate_count_inventory_movement()` trigger function selects `inventory_count_lines ... FOR SHARE`. Migration 0011 replaces it with a SECURITY DEFINER implementation, pins the search path, and qualifies every application relation. The runtime retains SELECT/INSERT only on count lines; it receives no UPDATE/DELETE/TRUNCATE.

The 0005 count lifecycle trigger also locks `inventory_counts`; runtime already requires UPDATE there to confirm counts. The 0009 balance-ledger trigger functions are SECURITY DEFINER and access the private intents table internally; runtime must not receive direct intents-table privileges.

The 0004 register-shift opening trigger locks several identity/scope rows. There is no active runtime INSERT/UPDATE callsite for register shifts today. Do not pre-grant lock-related UPDATE rights for a future handler. When a shift writer is added, first move that trigger-side lock into a hardened SECURITY DEFINER helper or design and test its exact privilege contract.

## Implemented CI role model

1. **Bootstrap administrator**: disposable CI superuser only, used to create test roles and database. Never used by the Worker.
2. **Migration owner/login**: `microapp_migrator`, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS. It owns application objects created by migrations and has USAGE/CREATE on the application schema. It is not a member of runtime.
3. **Application runtime/login**: `microapp_runtime`, LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS. This exact principal is the username in `DATABASE_URL`; no SET ROLE or inherited owner role is assumed. It owns no application table, sequence, schema, trigger or function, has no CREATE on the application schema, and is not a member of `microapp_migrator`.
### Database/schema bootstrap prerequisite

The application-schema ACL is owned by the database/schema owner, not by the migration role. Before applying migrations 0001–0012, the controlled database bootstrap operation must:

- create the database and the two LOGIN roles with the reviewed attributes;
- revoke `CREATE` on schema `public` from `PUBLIC`;
- grant `USAGE, CREATE` on schema `public` to `microapp_migrator`;
- grant `USAGE` on schema `public` to `microapp_runtime`;
- grant database `CONNECT` to the two roles; and
- verify the effective schema owner/ACLs before handing the connection strings to migration/runtime workflows.

Migration 0012 now fails closed unless those effective schema privileges are already correct. It does not attempt to change schema ownership or schema ACLs from the non-owner migrator connection. The CI bootstrap performs these steps using its disposable administrator; production/preproduction must use the separately approved database-owner procedure.

4. **Synthetic assertion roles**: disposable test-only roles created by the CI bootstrap administrator. They are not production principals.

The #224 CI harness revokes PUBLIC schema CREATE, gives `microapp_runtime` schema USAGE only, revokes PUBLIC/runtime privileges on existing application tables/sequences/functions, and configures default privileges for `microapp_migrator` so future objects are not automatically exposed. Migration 0012 explicitly checks the effective schema ACLs before granting table privileges and fails closed if the database-owner bootstrap was incomplete. Runtime grants are explicit and table/column-specific in migration 0012. CI asserts application object ownership by the non-superuser migrator and creates a future table/function probe after grants to prove no implicit runtime access. All future migrations must continue to run as the same migration owner.

Do not grant CREATEROLE to the migration owner merely to support the existing 0007 assertion script. In the harness, the bootstrap administrator creates synthetic roles and the migration owner applies DDL. Run the assertions under the intended synthetic/runtime role as appropriate.

## Implemented PostgreSQL 18 harness

PR #224 adds a disposable PostgreSQL 18 migration/runtime contract path with these phases:

1. Bootstrap the database and the two LOGIN roles as the CI administrator. Explicitly assert role attributes, schema ownership/ACLs and absence of role membership.
2. Apply migrations 0001–0012 using `microapp_migrator`, not the superuser. Run migration assertions as the disposable CI administrator where role creation is required.
3. Apply the reviewed runtime grants and hardened lock/trigger helper functions. Migration 0012 fails closed if the named runtime role is absent or has unsafe role attributes.
4. Connect using the actual `microapp_runtime` LOGIN (not only SET ROLE). Assert role attributes, current_user, object ownership, absence of migrator membership, schema USAGE without CREATE, and inability to SET ROLE to migrator.
5. Exercise positive SQL operations derived from current handlers: organization/user/member bootstrap inserts; bootstrap sentinel update; session create/revoke and tenant lock; bootstrap handoff insert/read/consume/delete; rate-limit upsert/cleanup; branch and warehouse locks; product insert/update; count creation/confirmation; inventory balance upsert and row lock; paired ledger movements; and audit identity insert.
6. Exercise negative operations: DDL, schema CREATE, role escalation, ineffective GRANT attempts, trigger alteration, direct private-intent/audit reads, count-line/branch/warehouse/audit mutations, ledger deletion, TRUNCATE, and unsupported sales access.
7. Verify migration rollback, application-object ownership by the non-superuser migrator, and future default privileges by creating a probe table/function after grants and proving runtime receives no implicit access.
8. Keep API handler integration tests as a separate layer. A SQL harness proves database privileges and SQL behavior; it does not, by itself, prove the complete HTTP handler path.

The pre-#224 migration workflow was valuable for schema/trigger validation but did not prove the role boundary because it ran migrations as the configured superuser. PR #224 now uses separate credentials and verifies the role boundary end-to-end on disposable PostgreSQL 18.

## Remaining gates before preproduction

Resolved in migrations 0011/0012 and the PR #224 PostgreSQL 18 harness:

- Hardened SECURITY DEFINER lock helpers now cover tenant/session, branch/membership and warehouse row locks.
- `validate_count_inventory_movement()` is now a hardened trigger-only SECURITY DEFINER function.
- The runtime grants use column-level UPDATE where required; no UPDATE is granted to count lines, branches, branch memberships or warehouses.
- Audit identity INSERT succeeds through the actual runtime LOGIN without explicit sequence privileges.
- The exact runtime grant set is exercised with a direct LOGIN, including rate-limit cleanup using `updated_at`, count lifecycle, balance/ledger pairing and append-only audit insert.
- Migration ownership and future default-privilege behavior are asserted.

Still required:

- Project-owner review of the stacked Draft PRs and grant matrix.
- Extend actual-runtime handler coverage to any future write paths or handlers not included in the selected four-suite runtime integration set. The remaining broad integration suites continue to run as CI administrator and are not claimed as runtime-role verified.
- Inspect the effective preproduction/production `DATABASE_URL` principal, role membership, ownership and grants through an approved controlled operation. CI roles are synthetic and do not prove the deployed principal.
- Keep role creation, credential provisioning, DATABASE_URL rotation, migration rollout and grant application behind separate preproduction/production gates. No production change is authorized by this document.

## Evidence and residual risk

Historical baseline verified at #221 HEAD `18dfc33525c792802c296469ee6140d3b5f649ff`:
- PR #223 current HEAD `dc47c3ecc5f47f3f2dc49e5366d85d7f43b0e990` has all 7 observed check-runs completed successfully, including migration validation and Worker/Pages previews.
- PR #224 HEAD `46fe754aaef3cec45f8512c11d0b7f06d3b82da7`: 13/13 observed check-runs completed successfully. This includes build/typecheck, unit tests, PostgreSQL migration validation, all existing integration suites, 70/70 tests across five API handler suites using the actual `microapp_runtime` LOGIN, Chromium authentication smoke, Semgrep, Trivy/security, secret history, backup/restore, Cloudflare Pages Preview and Workers Build Preview.
- The PR #224 migration workflow applies migrations 0001–0012 as non-superuser `microapp_migrator`, proves application object ownership and future default privileges, and exercises both positive SQL operations and privilege denials through an actual separate `microapp_runtime` LOGIN.
- The selected runtime HTTP integration suites are `auth.integration.test.ts`, `catalog.integration.test.ts`, `catalog-write.integration.test.ts`, `catalog-update.integration.test.ts` and `inventory-counts.integration.test.ts`. They cover auth/Google bootstrap, catalog reads (including role-based cost visibility), catalog creation/update and inventory-count operations. Fixture setup/teardown uses the disposable CI administrator; app requests and lock clients use the runtime LOGIN. The auth suite also exercises scheduled rate-limit/bootstrap retention cleanup through the runtime LOGIN.
- PR #224 remains OPEN/DRAFT and has no formal review yet. The successful Workers/Pages results are previews, not production deployment.

- Source files inspected: `database.ts`, `auth.ts`, `google-auth.ts`, `auth-rate-limit.ts`, `tenant-context.ts`, `branch-context.ts`, `cashier-open-shift.ts`, `catalog.ts`, `catalog-write.ts`, `inventory-counts.ts`, `inventory-locks.ts`, `authorization.ts`.
- Migrations inspected: 0001–0012, with detailed review of 0001, 0004, 0005, 0007, 0008, 0009, 0010, 0011 and 0012 plus their relevant assertions.
- PR #221 HEAD has 6/6 GitHub Actions workflows and 8/8 check-runs completed successfully. Worker Build and Pages Preview are checks, not production deployment.
- PR #210 HEAD `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` has 7 distinct workflow names completed successfully and 14 check-runs completed successfully. #210 is an ancestor of #221 (60 commits behind #221, zero commits ahead).
- PR #210 and #221 have no formal reviews or review threads in the current GitHub response.
- Issue #53 remains OPEN/P0.

Residual risk: the effective production DATABASE_URL principal, role membership, object ownership, grants, Cloudflare bindings and actual deployed migration order remain unverified. No production readiness claim is made.
