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

## What this does not prove

- It does not adopt or reconcile a pre-existing database.
- It does not detect arbitrary manual schema drift after a migration has been recorded.
- It does not provision production roles, alter Cloudflare secrets, inspect Neon, or deploy anything.
- Passing CI against disposable PostgreSQL 18 is not production approval.

Before any real rollout, the exact target database must be inspected through an explicitly approved, read-only baseline and role/ownership review. A populated database requires an explicit adoption plan and its own tests.
