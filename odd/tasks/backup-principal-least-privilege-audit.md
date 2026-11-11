# ODD Task — Verify effective backup principal and least privilege

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related issue:** #53 OPEN/P0

## Known uncertainty

The production workflow consumes `DATABASE_URL_BACKUP_RO` but has not recorded `current_user`, `session_user`, effective role attributes, memberships, or write privileges. Documentation records a possible `backup_readonly` → `neon_superuser` → `pg_write_all_data` membership path, but does not prove that the secret resolves to that principal.

Do not inspect, print, decode, copy, or otherwise reveal the secret value. Do not connect manually to production, inspect Neon, or mutate remote roles/grants.

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
