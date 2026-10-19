---
name: micro-app-postgres-testing
description: Design or review PostgreSQL integration tests, migrations, transaction boundaries, tenant isolation, inventory/sales consistency, and recovery in Micro app. Use whenever DB schema, queries, transactions, or persistence tests change.
---

# Micro app PostgreSQL and transaction testing

## Mandatory safety boundary

- Read `AGENTS.md`, `docs/CONSTITUTION.md`, and `docs/BACKUP_AND_RECOVERY.md` before any database mutation.
- Use disposable PostgreSQL, a verified ephemeral CI database, or an isolated branch. Never point tests or migration commands at Neon `main`, production, or real data.
- Verify the target identity and connection configuration without printing connection strings or credentials. Use synthetic fixtures only.
- If an isolated database or recovery path cannot be verified, stop before mutating data and report the exact blocker.

## Test workflow

1. Inspect the migration files, schema, query adapter, route callers, and existing test harness before proposing changes.
2. Verify a fresh database can migrate from zero and that constraints/indexes match application assumptions.
3. Test transaction atomicity: injected failures must roll back every related write; preserve the original error if cleanup also fails.
4. Test tenant isolation with at least two synthetic organizations. A user from tenant A must not read, update, delete, or infer tenant B records by changing IDs or request fields.
5. Test authentication/membership states, uniqueness, foreign keys, null/invalid values, and concurrent operations.
6. For inventory and sales, cover exact decimal/numeric handling, stock non-negativity policy, idempotency keys, duplicate retries, payload mismatch, rollback, and simultaneous stock consumption.
7. For migrations, assess lock duration, compatibility with old/new application versions, data loss, deterministic ordering, forward validation, and a credible rollback/restore path. Do not call a migration reversible unless that is demonstrated.
8. Prefer deterministic tests with explicit setup/cleanup. Do not rely on test order or shared mutable fixtures.
9. Run the repository's existing package scripts and CI checks. Record exact command, environment, outcome, and SHA; identify tests not run.

## Stack-specific cautions

- The API uses Hono/Cloudflare Workers and `@neondatabase/serverless`. Confirm the driver and runtime support for transactions before selecting a pattern.
- Do not add an ORM, middleware, database service, or paid test service merely because a skill suggests it.
- Do not use Express-only middleware in Hono/Workers.
- Do not run destructive SQL or migrations against the primary Neon branch.

## Expected output

Report test scenarios, commands and evidence, migration risks, concurrency/tenant-isolation gaps, and what remains unverified. A passing migration workflow does not prove production recovery or full tenant isolation.
