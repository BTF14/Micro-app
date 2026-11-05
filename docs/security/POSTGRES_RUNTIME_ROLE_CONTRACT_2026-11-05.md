# PostgreSQL runtime role contract — 2026-11-05

## Status and scope

Design checkpoint based on repository HEAD `18dfc33525c792802c296469ee6140d3b5f649ff` (PR #221), which contains the #210 balance-ledger commit `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` as an ancestor. This document is an evidence-based design, not a claim that the live Neon principal has been inspected or that production grants have been applied.

No production database, Neon branch, secret, Worker binding, or deployed configuration was accessed.

## Findings

- `apps/api/src/database.ts` constructs the Neon client directly from `DATABASE_URL`. It does not issue `SET ROLE`, assert `current_user`, or inspect ownership.
- The current migration workflow uses PostgreSQL 18 with `POSTGRES_USER=microapp`; the official image initializes that configured user as the database superuser. Therefore the existing migration workflow validates DDL, constraints, triggers, rollback and assertions, but does not validate a non-superuser migration owner or the application runtime role.
- Migration 0007 has a useful synthetic non-owner audit test. It grants SELECT/INSERT and sequence privileges to a test role, then verifies mutation denial and append-only triggers. It is not a whole-schema runtime contract.
- Migration 0009 revokes PUBLIC access to its private balance/ledger intent table and SECURITY DEFINER functions. Its assertions validate pairing invariants, not the complete runtime role.
- Migration 0010 revokes PUBLIC access to `auth_bootstrap_attempts`; its assertions validate shape, uniqueness and privacy, not runtime SELECT/INSERT/UPDATE/DELETE.
- `auth_rate_limits` is created in 0001. Runtime performs INSERT/ON CONFLICT UPDATE and scheduled DELETE. No whole-schema non-owner runtime grant test currently proves these operations.
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
| `branches` | `branch-context.ts`, `cashier-open-shift.ts` | SELECT | Locking is delegated to the dedicated lock helper proposed below. |
| `branch_memberships` | `branch-context.ts`, `cashier-open-shift.ts` | SELECT | Locking is delegated to the dedicated lock helper proposed below. |
| `registers` | `cashier-open-shift.ts` | SELECT | No active register write handler in this source tree. |
| `register_shifts` | `cashier-open-shift.ts` | SELECT | No active shift create/close handler in this source tree. |
| `products` | `catalog.ts`, `catalog-write.ts`, `inventory-counts.ts` | SELECT, INSERT, UPDATE | Catalog writes use SELECT FOR UPDATE; inventory validates product scope. |
| `audit_logs` | `catalog-write.ts`, `inventory-counts.ts` | INSERT | Current production callsites do not read audit rows. Preserve append-only protections. |
| `warehouses` | `inventory-locks.ts`, `inventory-counts.ts` | SELECT | Current warehouse mutex uses SELECT FOR UPDATE; use a narrowly scoped SECURITY DEFINER lock function rather than granting general UPDATE. |
| `inventory_counts` | `inventory-counts.ts` and lifecycle triggers | SELECT, INSERT, UPDATE | Confirmation updates status/actor/time; SELECT FOR UPDATE is also used. |
| `inventory_count_lines` | `inventory-counts.ts` and validation trigger | SELECT, INSERT | No direct UPDATE/DELETE callsite. Trigger-side FOR SHARE currently creates a lock-privilege issue; see below. |
| `inventory_balances` | `inventory-counts.ts`, `inventory-locks.ts` | SELECT, INSERT, UPDATE | Upsert changes on-hand and updated_at; row locks serialize count snapshots. |
| `warehouse_inventory_movements` | `inventory-counts.ts` | INSERT | Append-only; do not grant UPDATE/DELETE/TRUNCATE. |
| `inventory_balance_ledger_intents` | #210 migration 0009 triggers | No direct runtime access | Private transaction-scoped table; SECURITY DEFINER trigger functions own its access. |
| `suppliers`, `exchange_rates`, `sales`, `sale_items`, `payments`, legacy `inventory_movements` | No active production callsite found in current API source tree | No runtime grant justified | Revisit only when a handler is introduced. |

### Locking and trigger privilege consequences

PostgreSQL row-locking clauses (`FOR SHARE`, `FOR UPDATE`, and related strengths) require UPDATE privilege on at least one column of each locked relation. A SELECT-only table grant is therefore not sufficient for the current lock queries.

Current lock sites include:

- `tenant-context.ts`: `FOR SHARE OF s, u, m, o` over sessions, users, organization memberships and organizations.
- `branch-context.ts`: `FOR SHARE` over branches and branch memberships.
- `inventory-locks.ts`: `FOR UPDATE` over warehouses.
- `inventory-locks.ts` and `inventory-counts.ts`: row locks over inventory balances.
- `catalog-write.ts`: `FOR UPDATE` over products.
- `inventory-counts.ts`: row locks over inventory counts.

Granting UPDATE on whole read-only tables just to obtain locks is not an acceptable default. The implementation should move the read-only lock operations into small SECURITY DEFINER functions owned by the migration owner, with `SET search_path = pg_catalog`, schema-qualified table references, fixed SQL (no dynamic identifiers), narrow parameters, and PUBLIC EXECUTE revoked. Grant EXECUTE only to the runtime role. The functions must preserve deterministic lock ordering and existing revocation/concurrency semantics.

The 0008 `validate_count_inventory_movement()` trigger function selects `inventory_count_lines ... FOR SHARE`. The runtime has no legitimate UPDATE callsite on count lines. Convert this trigger function to SECURITY DEFINER with a hardened search path and fully qualified table references, or otherwise prove an equally narrow safe solution. Do not grant broad UPDATE on count lines to make the trigger pass.

The 0005 count lifecycle trigger also locks `inventory_counts`; runtime already requires UPDATE there to confirm counts. The 0009 balance-ledger trigger functions are SECURITY DEFINER and access the private intents table internally; runtime must not receive direct intents-table privileges.

The 0004 register-shift opening trigger locks several identity/scope rows. There is no active runtime INSERT/UPDATE callsite for register shifts today. Do not pre-grant lock-related UPDATE rights for a future handler. When a shift writer is added, first move that trigger-side lock into a hardened SECURITY DEFINER helper or design and test its exact privilege contract.

## Proposed role model

1. **Bootstrap administrator**: disposable CI superuser only, used to create test roles and database. Never used by the Worker.
2. **Migration owner/login**: `microapp_migrator`, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS. It owns application objects created by migrations and has USAGE/CREATE on the application schema. It is not a member of runtime.
3. **Application runtime/login**: `microapp_runtime`, LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS. This exact principal is the username in `DATABASE_URL`; no SET ROLE or inherited owner role is assumed. It owns no application table, sequence, schema, trigger or function, has no CREATE on the application schema, and is not a member of `microapp_migrator`.
4. **Synthetic assertion roles**: disposable test-only roles created by the CI bootstrap administrator. They are not production principals.

Revoke PUBLIC schema CREATE and PUBLIC privileges on application tables, sequences and functions. Runtime receives schema USAGE only. Configure default privileges for objects created by `microapp_migrator` so new tables, sequences and functions are not automatically exposed to PUBLIC or runtime. Runtime grants remain explicit and table-specific in reviewed migrations. All future migrations must run as the same migration owner; the CI harness must reject a migration that silently changes object ownership.

Do not grant CREATEROLE to the migration owner merely to support the existing 0007 assertion script. In the harness, the bootstrap administrator creates synthetic roles and the migration owner applies DDL. Run the assertions under the intended synthetic/runtime role as appropriate.

## Harness design

Add a PostgreSQL 18 disposable CI job with these phases:

1. Bootstrap the database and the two LOGIN roles as the CI administrator. Explicitly assert role attributes, schema ownership/ACLs and absence of role membership.
2. Apply migrations 0001–0010 in order using `microapp_migrator`, not the superuser. Run migration assertions as a separate test administrator where role creation is required.
3. Apply the reviewed runtime grants and hardened lock/trigger helper functions. Fail if the named runtime role does not exist; do not silently skip grants.
4. Connect using the actual `microapp_runtime` login (not only SET ROLE). Assert `current_user`, `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false`, `rolbypassrls=false`, no ownership of application objects, no membership in migrator, no schema CREATE, and inability to SET ROLE to migrator.
5. Exercise positive SQL operations derived from the current handlers: session lookup/create/revoke; allowlist and bootstrap lookup/consume; bootstrap handoff insert/read/consume/cleanup; rate-limit INSERT/ON CONFLICT UPDATE/cleanup; catalog SELECT/INSERT/UPDATE and audit INSERT; branch/tenant resolution locks; warehouse/balance locking; count insert/read/confirm; balance upsert; paired ledger insert; and audit append.
6. Exercise negative operations: DDL, schema CREATE, role escalation, grants, trigger/function alteration, direct private-intent access, audit UPDATE/DELETE/TRUNCATE, ledger UPDATE/DELETE/TRUNCATE, and unsupported table access.
7. Verify trigger behavior and invariants under runtime privileges, including count lifecycle, count-to-ledger validation, balance-ledger pairing, rollback and append-only audit behavior.
8. Verify default privileges by creating a disposable future table/function as migrator after the grant migration and proving runtime receives no implicit access. Verify migrator can still apply a forward DDL probe after runtime grants are in place.
9. Keep existing handler integration tests as a separate layer. A SQL harness proves database privileges and SQL behavior; it does not, by itself, prove the complete HTTP handler path.

The current migration workflow is valuable for schema/trigger validation but is not this harness: it initializes `POSTGRES_USER=microapp` and runs migrations with that superuser. The new job must use distinct credentials and prove the role boundary end-to-end.

## Open decisions before grant migration

- Implement and test SECURITY DEFINER lock helpers for tenant, branch and warehouse mutex locks, preserving the existing lock order and concurrency tests.
- Harden `validate_count_inventory_movement()` as a trigger-only SECURITY DEFINER function with a fixed search path and qualified references.
- Verify whether INSERT into the `audit_logs` GENERATED ALWAYS AS IDENTITY column requires any explicit sequence privilege in the target PostgreSQL version. Do not copy the broader USAGE/SELECT sequence grant from the synthetic 0007 test without proving it is needed.
- Confirm the exact set of table and column privileges by running the actual SQL statements as `microapp_runtime`. Column-level UPDATE should be used where it matches real update callsites; no UPDATE should be granted solely to make a read-only lock query pass once helper functions are in place.
- Keep production role creation, credential provisioning, DATABASE_URL rotation and grant application as separate preproduction/operations gates. No Neon or production change is authorized by this document.

## Evidence and residual risk

Verified at #221 HEAD `18dfc33525c792802c296469ee6140d3b5f649ff`:

- Source files inspected: `database.ts`, `auth.ts`, `google-auth.ts`, `auth-rate-limit.ts`, `tenant-context.ts`, `branch-context.ts`, `cashier-open-shift.ts`, `catalog.ts`, `catalog-write.ts`, `inventory-counts.ts`, `inventory-locks.ts`, `authorization.ts`.
- Migrations inspected: 0001–0010, with detailed review of 0001, 0004, 0005, 0007, 0008, 0009 and 0010 plus their relevant assertions.
- PR #221 HEAD has 6/6 GitHub Actions workflows and 8/8 check-runs completed successfully. Worker Build and Pages Preview are checks, not production deployment.
- PR #210 HEAD `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` has 7 distinct workflow names completed successfully and 14 check-runs completed successfully. #210 is an ancestor of #221 (60 commits behind #221, zero commits ahead).
- PR #210 and #221 have no formal reviews or review threads in the current GitHub response.
- Issue #53 remains OPEN/P0.

Residual risk: the effective production DATABASE_URL principal, role membership, object ownership, grants, Cloudflare bindings and actual deployed migration order remain unverified. No production readiness claim is made.
