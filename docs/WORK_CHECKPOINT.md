# Work checkpoint — 2026-11-08 13:38 UTC

## Estado
- Main/code snapshot: 37e8c40d5bacfb71133942d774c3f87d71d61b9e; docs merge #272: 33016a2d206c7b8cfc60e53e34a56a26651141d7.
- #270 merged, 9/9 workflow runs SUCCESS exact-HEAD. #272 merged, 10/10 SUCCESS exact-HEAD. #271 closed superseded.
- #269 Open/Draft, HEAD bc3939510e132e6f77c751514ff1b7dca58cdd4d, 11/11 workflow runs SUCCESS exact-HEAD; change to 0018 revokes DELETE/TRUNCATE on payments from PUBLIC/runtime and asserts it. Reviews COMMENTED, no APPROVE.
- #255 Open/Ready, HEAD a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7; 7/10 exact-HEAD workflows SUCCESS, 3 in progress. Cron now logs sanitized completion/failure codes and rethrows failure; tests added. Remaining P1: anomaly policy and persistent status/alert; official HTML fixture pending. COMMENTED review, no APPROVE.
- #258/#262 code and migration content is included in consolidated #269; keep both open until #269 merges and main content is verified. #193 do not modify; #233 historical Draft. #274 includes docs and pinned rehearsal workflow; verify exact-HEAD CI.
- Neon branch br-curly-poetry-b7dxsddm is a parent-data clone of Neon main br-summer-math-b7297a60. Its original DB neondb has nonzero user/auth/org rows. Do not write to it or inspect row contents.
- New empty DB microapp_rehearsal (ID 1333740) created in rehearsal branch, owner migrator, zero tables; identity and roles/privileges verified by SELECT.
- GitHub Actions rerun #42479603848 verify SUCCESS after secret update: secret masked/non-empty, direct connection, exact target identity, baseline 0002 294 facts; adopt/migrate steps SKIPPED. No DDL/DML.
- Main only has migrations through 0016; #269 has 0017–0019 at exact SHA above.
- migrate.sh accepts MIGRATIONS_DIR but does not itself run .assertions.sql/.deferred_failure.sql. PR #274 now runs baseline 0001-0002, compares the 0002 fingerprint, applies pinned 0001-0019, then runs assertions 0017-0019. A migration failure may leave state=applying; the workflow blocks automatic retry and requires explicit reconciliation/reset.
- No production changes. Production NOT READY.

## Next step
Finish exact-HEAD CI for #274. If checks pass, integrate the docs/workflow PR, run its default read-only verify-empty dispatch, then request explicit confirmation before bootstrap-and-migrate. Never target parent-clone neondb.
