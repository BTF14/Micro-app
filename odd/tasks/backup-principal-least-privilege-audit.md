# ODD Task — Verify effective backup principal and least privilege

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related issue:** #53 OPEN/P0

## Known uncertainty

The production workflow consumes `DATABASE_URL_BACKUP_RO` but has not recorded `current_user`, `session_user`, effective role attributes, memberships, or write privileges. Documentation records a possible `backup_readonly` → `neon_superuser` → `pg_write_all_data` membership path, but does not prove that the secret resolves to that principal.

Do not inspect, print, decode, copy, or otherwise reveal the secret value. Do not connect manually to production or mutate remote roles/grants. Read-only catalog metadata queries are permitted only when explicitly authorized; the 2026-11-11 SELECT-only review is recorded below.

## Implemented diagnostic

The scheduled backup workflow now runs a non-blocking, read-only SQL diagnostic using the existing secret connection. It emits only booleans into the GitHub Actions summary:

- effective identity matches `backup_readonly` for both `current_user` and `session_user`;
- login role attributes are non-privileged;
- no role memberships exist;
- no table/column write privileges exist;
- no sequence USAGE/UPDATE privileges exist;
- no CREATE privilege exists on public schema or current database.

It never prints DSN, host, username, credentials, row contents, or secret values. Failure to query or a failed contract is a warning, not a backup blocker; backup generation continues to protect recovery continuity.

## Acceptance gates

1. Observe the next naturally scheduled backup run; do not dispatch it manually.
2. Verify the summary contains all six booleans without sensitive values.
3. If any check fails, keep issue #53 open and design a least-privilege role change through a separately authorized, reviewed procedure. Do not change remote roles/grants from this diagnostic.
4. Confirm that the backup still completes and the encrypted artifact/sidecar workflow remains unchanged.
5. Do not declare least privilege verified until the effective principal and all privilege checks pass on a real scheduled run.

## Limitations

The synthetic CI profile cannot prove the real secret identity or remote privilege state. This diagnostic does not measure RPO/RTO, test remote artifact restoration, prove external alert delivery, or certify cost $0. Issue #53 remains OPEN/P0; production NOT READY.


## Coverage limitation — 2026-11-11

The six-boolean diagnostic in `.github/workflows/backup.yml` currently evaluates `has_membership` only when the backup principal is the `member` in `pg_auth_members`. It does not detect other roles that are members of `backup_readonly` (`roleid = principal.oid`) and may be able to `SET ROLE` to it. Therefore this boolean does not yet prove absence of all role-membership edges. Keep the least-privilege gate open until the predicate checks both directions and a synthetic test covers both membership orientations. Do not infer effective identity or least privilege from backup success alone.


## Predicate correction — 2026-11-11

- Finding: the original membership boolean joined `pg_auth_members.member` only, detecting roles that the backup principal belongs to but not other roles that belong to `backup_readonly`.
- Change on the integration branch: the diagnostic now matches the principal OID against both `pg_auth_members.member` and `pg_auth_members.roleid`. Any membership edge in either direction makes the boolean true and keeps the expected-false gate open.
- Regression test: `.github/scripts/test-backup-principal-membership.sql` creates disposable roles and independently tests (1) principal-as-member, (2) principal-as-granted-role, and (3) no-membership baseline. It runs only against the disposable PostgreSQL 18 service in `migration-check.yml`, using `docker exec` and no external database connection; it does not connect to Neon or inspect repository secrets.
- Status: implementation committed to the integration branch; exact-HEAD CI and the new regression test must pass before this correction is considered validated. No remote roles/grants or secrets changed.


## Regression execution — 2026-11-11

- The bidirectional membership predicate is now implemented in the integration-branch backup diagnostic.
- Disposable PostgreSQL 18 regression test passed in `migration-check` run `43044533159` on code SHA `373dbc177fc6d9876112eb57cedc21db8dd31dd7`: principal-as-member, principal-as-granted-role, and no-membership baseline.
- This proves the SQL predicate regression in CI only. It does not prove the production backup secret identity, remote grants, absence of all privileges outside the diagnostic's inspected scope, or backup artifact recovery. Keep issue #53 OPEN/P0 and production NOT READY.


## Exact-HEAD regression confirmation — 2026-11-11

- Run `43047173060` passed on SHA `53894254c26838dd56f5a39764fedf4cf1d64067`; the disposable PostgreSQL 18 membership regression passed for both directions and the empty baseline.
- This is CI predicate evidence only. The natural main backup `43041961402` failed before DB connection while installing age due Ubuntu DNS, so it produced no artifact and did not execute the six-boolean diagnostic. Effective production identity and least privilege remain unverified; issue #53 stays OPEN/P0.


## Read-only Neon catalog verification — 2026-11-11

- Scope: project `micro-app-db` (`restless-fire-99110035`), primary/default branch `main` (`br-summer-math-b7297a60`), database `neondb`.
- Queries: SELECT only against `pg_roles`, `pg_auth_members`, and PostgreSQL privilege predicates. No business rows, secrets, connection strings or credentials were read.
- Role `backup_readonly`: LOGIN true, SUPERUSER false, INHERIT true, CREATEROLE true, CREATEDB true, REPLICATION true, BYPASSRLS true.
- Direct membership: `backup_readonly` is a member of `neon_superuser`. Effective membership: `pg_has_role` returns true for `pg_write_all_data` and `pg_read_all_data`.
- Effective privilege predicates: SELECT/INSERT/UPDATE/DELETE on `public.products` all true; TRUNCATE false; CREATE on current database true; CREATE on public schema false.
- Conclusion: the role named `backup_readonly` is not read-only and is materially overprivileged. If the backup secret uses it, least privilege is violated.
- Limit: the secret value was not read; actual `current_user` / `session_user` used by `DATABASE_URL_BACKUP_RO` remains unknown. The natural scheduled diagnostic after integration is still required.
- No role, membership, grant, password, secret, database, workflow or production state was modified. Issue #53 remains OPEN/P0. Evidence comment: `6802571142`.


## Disposable least-privilege pg_dump contract test — planned 2026-11-11

The live Neon catalog review found that the role named `backup_readonly` is overprivileged. Before any remote remediation is considered, validate a replacement permission contract using only the disposable PostgreSQL 18 service in CI.

### Proposed contract

- Create a disposable LOGIN role with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT` and no memberships.
- Grant only database CONNECT, schema USAGE, table SELECT and sequence SELECT needed by `pg_dump`; do not grant CREATE, INSERT, UPDATE, DELETE, TRUNCATE, role memberships or role-administration attributes.
- Verify the role can read a synthetic fixture and complete `pg_dump` plus `pg_restore --list`.
- Verify it cannot INSERT/UPDATE/DELETE, CREATE DATABASE, CREATE ROLE or `SET ROLE` to an elevated role.
- Verify role attributes and absence of membership edges in both directions.
- Cleanup all fixture objects and the test role. This test runs only inside the ephemeral CI PostgreSQL 18 service; it never connects to Neon and uses no repository secrets.

### Evidence and limits

- Current Neon main has 15 application base tables in `public`, with neither RLS nor FORCE RLS enabled. This supports testing an explicit-SELECT role without BYPASSRLS for the currently observed schema; re-evaluate if RLS is introduced.
- This test validates a candidate role contract and `pg_dump` compatibility only. It does not prove which user `DATABASE_URL_BACKUP_RO` uses and does not authorize remote role/grant/password/secret changes.
- Status: planned; implementation pending. Issue #53 remains OPEN/P0 and production NOT READY.


## Default sequence privileges gap — 2026-11-11

- All 15 application base tables in Neon main `public` are owned by `neondb_owner`; both existing public sequences (`audit_logs_id_seq`, `sales_sale_number_seq`) are also owned by `neondb_owner`.
- `pg_default_acl` for `neondb_owner` in `public` contains only object type `r` (tables): `{backup_readonly=r/neondb_owner}`. No default ACL for sequences (`defaclobjtype='S'`) was found.
- Existing sequences have effective SELECT and UPDATE for `backup_readonly`, with USAGE false. The role's elevated memberships/attributes must not be relied on for this access.
- A replacement role contract must grant SELECT on existing sequences and add default SELECT on future sequences, without USAGE/UPDATE. Future tables also need default SELECT grants owned by `neondb_owner`.
- Extend the disposable PostgreSQL contract test to prove both explicit grants on existing objects and default SELECT grants on future tables/sequences. This remains CI-only; no Neon default ACL or role was modified.


## Default ACL regression implemented — 2026-11-11

The disposable PostgreSQL 18 contract test now exercises the exact missing sequence-default case observed in Neon main:

- Creates a synthetic object owner and backup login with no memberships or elevated role attributes.
- Adds default `SELECT` privileges for future tables and future sequences, scoped to the synthetic schema.
- Creates pre-existing and future tables/identity sequences plus a standalone future sequence as the object owner.
- Grants explicit SELECT on all existing objects, then asserts SELECT-only access to existing and future tables/sequences.
- Asserts no INSERT/UPDATE/DELETE/TRUNCATE, no sequence USAGE/UPDATE, no database/schema CREATE, no membership edges, and exact default ACL entries for both table and sequence object classes.
- Exercises `pg_dump` and `pg_restore --list` as the backup login; negative tests include sequence `nextval` and `setval` denial.

This is an isolated candidate contract only. It does not alter Neon default ACLs, roles, grants, passwords, secrets or production workflows. The live secret identity remains unknown; issue #53 remains OPEN/P0.
