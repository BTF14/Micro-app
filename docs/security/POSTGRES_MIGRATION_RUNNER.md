## Bundle de migración validado en Neon rehearsal — 2026-11-08

El bundle fijado en `6227a3a8497f6be94d675b64da5da61530c200fc` contiene migraciones 0001–0019. El runner fue ejercitado por el workflow protegido en Neon `microapp_rehearsal` (run [#42507066215](https://github.com/BTF14/Micro-app/actions/runs/42507066215)): baseline 0001–0002/fingerprint y migraciones posteriores, assertions 0017–0019 y verificación final de 19 registros `applied` terminaron SUCCESS. El alcance fue solo la rama de ensayo; Neon main y producción no fueron modificados. Esta evidencia no sustituye las pruebas de rollback/fallo/concurrencia del runner en PostgreSQL efímero ni el gate de producción.

# PostgreSQL migration runner

## Purpose

`scripts/db/migrate.sh` is the single ordered entry point for applying the numbered production migrations in `apps/api/migrations`. It is deliberately separate from the CI assertion SQL files.

The runner:
- requires a direct LOGIN connection as `microapp_migrator` (both `session_user` and `current_user`);
- verifies the separate `microapp_runtime` role and the required database/schema ACL bootstrap;
- serializes concurrent invocations with a session-level PostgreSQL advisory lock;
- creates and maintains `public.schema_migrations`, recording the four-digit version, filename, SHA-256 checksum, state and timestamps;
- applies historical files without their own transaction inside a runner-owned transaction;
- preserves files that already contain one top-level `BEGIN;` / `COMMIT;` pair and records their application state around that transaction;
- skips only a matching, fully applied checksum; checksum drift, gaps and interrupted/incomplete records fail closed.

## Canonical migration order in the recovery branch

The originally documented recovery bundle ended at 0015. The pinned bundle actually rehearsed successfully now contains exactly one numbered migration for each version 0001 through 0019:

1. `0001_initial.sql`
2. `0002_google_identity.sql`
3. `0003_branch_scope.sql`
4. `0004_register_shifts.sql`
5. `0005_auth_bootstrap_attempts.sql` (already present on current `main`)
6. `0006_warehouse_inventory.sql`
7. `0007_register_shift_member_roles.sql`
8. `0008_audit_logs_append_only.sql`
9. `0009_inventory_count_ledger_validation.sql`
10. `0010_inventory_balance_ledger_coupling.sql`
11. `0011_postgres_runtime_lock_helpers.sql`
12. `0012_postgres_runtime_role_grants.sql`
13. `0013_bcv_official_rate_precision_and_grants.sql`
14. `0014_sales_without_discounts.sql`
15. `0015_sales_checkout_atomicity.sql`
16. `0016_runtime_inventory_ledger_read.sql`
17. `0017_checkout_bcv_weekend_effective_date.sql`
18. `0018_checkout_payment_allocation.sql`
19. `0019_inventory_ledger_balance_projection.sql`

The old stacked branches used `0005_warehouse_inventory.sql` and duplicated the already-integrated auth migration as `0010_auth_bootstrap_attempts.sql`. The recovery bundle moves warehouse inventory and its dependent migrations forward, keeps the existing auth migration at 0005, and omits the duplicate. Paired assertion files and workflow references must use the same canonical filenames. Migration contents are not rewritten merely to change filenames; the checksums are still computed from exact SQL contents.

## Database bootstrap prerequisites

A database owner must provision the two LOGIN roles and the `public` schema ACL before the runner is used:

- `microapp_migrator`: LOGIN, non-superuser, no CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, with `USAGE, CREATE` on `public` and CONNECT to the target database.
- `microapp_runtime`: LOGIN, non-superuser, NOINHERIT, no CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, with `USAGE` but not CREATE on `public`, and CONNECT to the target database.
- Neither role may have role memberships; runtime must not be a member of migrator.
- Revoke `CREATE ON SCHEMA public` from PUBLIC.

The runner does not create roles, change schema ownership, repair ACLs or use an owner/superuser connection. Migration 0012 remains the fail-closed enforcement point for the role/grant contract.

## Invocation

Provide a dedicated migration connection string; do not reuse the Worker runtime `DATABASE_URL`:

```bash
MIGRATION_DATABASE_URL='postgresql://microapp_migrator:<password>@<host>:5432/<database>' \
  bash scripts/db/migrate.sh
```

The runner never prints the connection string. Keep the credential in the deployment platform's protected migration environment, not in source control or the Worker runtime binding.

## Baseline and recovery policy

This first version intentionally supports a clean schema with no application objects. If `public` already contains application tables, views, sequences, functions or standalone types and the ledger has no applied entries, the runner raises `MIGRATION_BASELINE_REQUIRED`. It never guesses that a populated database corresponds to some prefix of migrations.

If a transaction-owning migration leaves a ledger row in `applying` (for example, the process stops after the migration commits but before the ledger update), the next run raises `MIGRATION_RECONCILIATION_REQUIRED`. An operator must inspect the actual schema and migration SQL, then document and perform a separately reviewed reconciliation. Do not delete or edit ledger rows merely to make a rerun pass.

For non-transactional historical migrations, the runner wraps the migration and its ledger update in one transaction, so a failure rolls both back. The original SQL files remain unchanged.

## CI harnesses and release integration

The existing `.github/workflows/ci.yml` and `.github/workflows/migration-check.yml` retain explicit per-file application because they exercise intermediate migration assertions and injected failures at the exact migration boundary. Those sequences are test harnesses, not production deployment entry points. The separate `.github/workflows/migration-runner.yml` job validates this runner as the ordered application path against disposable PostgreSQL. In addition, `.github/workflows/neon-pinned-migration-rehearsal.yml` is a manual, pinned, target-identity-checked workflow. Its `bootstrap-and-migrate` operation was executed successfully on 2026-11-08 against the isolated `microapp_rehearsal` database (run #42507066215); it applied and verified 0001–0019. This is rehearsal evidence only, not a production release workflow.

No production release/deployment workflow invokes this runner, and no production `MIGRATION_DATABASE_URL` secret was configured by this change. A production rollout still requires a separately approved and gated migration job against the verified target, a reviewed backup/restore and recovery plan, runtime identity/grants verification, and explicit production authorization. Do not move the migrator credential into the Worker runtime environment.

## What this does not prove

- It does not adopt or reconcile a pre-existing database.
- It does not detect arbitrary manual schema drift after a migration has been recorded.
- It does not provision production roles, alter Cloudflare secrets, or deploy anything.
- The rehearsal workflow has inspected and migrated only the isolated Neon rehearsal target; this does not establish that Neon main has the same schema or grants.
- Passing CI against disposable PostgreSQL 18 or a successful isolated rehearsal is not production approval.

Before any real rollout, the exact target database must be inspected through an explicitly approved, read-only baseline and role/ownership review. A populated database requires an explicit adoption plan and its own tests.

## Adopción de un esquema heredado sin ledger

El runner rechaza (`MIGRATION_BASELINE_REQUIRED`) un esquema poblado sin ledger y no se modifica. La adopción es una operación aparte y explícita: `scripts/db/adopt-baseline.sh verify|apply` (ver `docs/security/NEON_MIGRATION_APPLICATION_PLAN.md`). Si cambian 0001 o 0002, hay que regenerar `baselines/0002.schema.txt` y justificarlo en la PR; si cambia la huella pero el esquema vivo no, la adopción falla cerrada.

