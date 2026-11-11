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
