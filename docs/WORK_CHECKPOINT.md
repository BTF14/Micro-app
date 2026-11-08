# Work checkpoint — 2026-11-08 13:38 UTC

## Estado
- Main/code snapshot: 37e8c40d5bacfb71133942d774c3f87d71d61b9e; docs merge #272: 33016a2d206c7b8cfc60e53e34a56a26651141d7.
- #270 merged, 9/9 workflow runs SUCCESS exact-HEAD. #272 merged, 10/10 SUCCESS exact-HEAD. #271 closed superseded.
- #269 Open/Draft, HEAD bc3939510e132e6f77c751514ff1b7dca58cdd4d, 11/11 workflow runs SUCCESS exact-HEAD; change to 0018 revokes DELETE/TRUNCATE on payments from PUBLIC/runtime and asserts it. Reviews COMMENTED, no APPROVE.
- #255 Open/Ready, HEAD 59b6b40ddf30f6711624124b719ef15234ce5fdc, 10/10 SUCCESS exact-HEAD; COMMENTED review with P1 blockers for BCV anomaly guard and Cron failure alerting. No APPROVE.
- Other PRs: #193 (do not modify), #233, #258, #262. #274 includes this docs refresh and pinned rehearsal workflow; verify CI exact-HEAD.
- Neon branch br-curly-poetry-b7dxsddm is a parent-data clone of Neon main br-summer-math-b7297a60. Its original DB neondb has nonzero user/auth/org rows. Do not write to it or inspect row contents.
- New empty DB microapp_rehearsal (ID 1333740) created in rehearsal branch, owner migrator, zero tables; identity and roles/privileges verified by SELECT.
- GitHub Actions rerun #42479603848 verify SUCCESS after secret update: secret masked/non-empty, direct connection, exact target identity, baseline 0002 294 facts; adopt/migrate steps SKIPPED. No DDL/DML.
- Main only has migrations through 0016; #269 has 0017–0019 at exact SHA above.
- migrate.sh accepts MIGRATIONS_DIR but does not itself run .assertions.sql/.deferred_failure.sql; pinned rehearsal workflow must run them explicitly.
- No production changes. Production NOT READY.

## Next step
Prepare a manual, main-dispatched pinned-SHA rehearsal workflow that extracts only SQL migration/assertion files from the reviewed #269 SHA, runs main's migration runner against the empty microapp_rehearsal DB, and requires explicit confirmation for writes. Never target the parent-clone neondb.
