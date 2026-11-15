# ODD task: BCV morning Cron window at 11:00 UTC

- Status: in progress
- Issue / PR: none yet
- Owner / reviewer: repository owner / implementation agent
- Started: 2026-11-15 UTC
- Risk: medium

## Objective and authorization

- Desired outcome: add a weekday 11:00 UTC invocation to the isolated BCV Worker while preserving the existing weekday 22:00 UTC invocation, strict production gates, dedicated database credential, and negative tests for numeric weekday expressions.
- Authorization boundary: owner explicitly authorized this narrowly scoped implementation, tests, documentation, PR, and merge when all repository gates pass. No Neon main, SQL/migrations, secrets, manual Cloudflare configuration, Issue #53, or PR #193 actions.
- Relevant original request: add 0 11 * * MON-FRI for 07:00 VET, retain 0 22 * * MON-FRI for 18:00 VET; do not add optional 23:00 retry unless justified.

## Scope and exclusions

Included:
- apps/api/wrangler.bcv.toml
- apps/api/src/index.ts
- apps/api/src/index.scheduled.test.ts
- apps/api/src/exchange-rates.integration.test.ts only if needed to cover both configured schedules
- docs/CURRENT_STATE.md, docs/STATE_JOURNAL.md, docs/HANDOFF_NEXT_CHAT.md
- this ODD task file

Excluded:
- Neon main, all SQL/migrations, secrets, Cloudflare dashboard/manual configuration, deployments, Issue #53, PR #193, v1.1 roadmap and PRODUCTION: NOT READY status.

## Acceptance criteria

- [ ] AC-1 — isolated Worker has exactly weekday 11:00 and 22:00 UTC BCV schedules (no optional 23:00 retry unless a concrete reason emerges); weekday names remain MON-FRI.
- [ ] AC-2 — scheduled handler recognizes only the exact configured BCV cron expressions and preserves APP_ENV production, BCV_SYNC_ENABLED true, mandatory DATABASE_URL_BCV_SYNC, no DATABASE_URL fallback.
- [ ] AC-3 — tests cover both schedules and reject numeric weekday forms 0 11 * * 1-5 and 0 22 * * 1-5; unrelated cron remains inert.
- [ ] AC-4 — relevant unit and integration tests plus all required CI/check-runs pass on exact PR HEAD.
- [ ] AC-5 — diff is limited to authorized files; PR #193 and Issue #53 remain untouched; Squash and Merge and post-merge checks verified on exact main SHA.
- [ ] AC-6 — continuity docs updated and this task closed; v1.1 roadmap and PRODUCTION: NOT READY remain unchanged.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| BCV sync invoked by unintended Cron | High | Exact Set membership and negative tests for numeric weekday expressions |
| Unauthorized database credential fallback | Critical | Keep strict fail-closed checks and assert only DATABASE_URL_BCV_SYNC is used |
| Duplicate weekday execution | Medium | Existing idempotent persistence semantics; only 11:00 + 22:00, no 23:00 retry |
| Schedule mistaken for successful production sync | High | CI/build is not proof of a real scheduled invocation or Neon persistence |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify live base, instructions, protected PR/issue and GitHub write access | main is expected SHA; PR #193 OPEN/intact; Issue #53 OPEN/P0; isolated branch created | GitHub live reads and branch creation | complete |
| Create this task before source changes | ODD work record exists first | First branch commit | complete |
| Update schedule and exact cron allowlist | 11:00 + 22:00 MON-FRI only | Diff and unit tests | pending |
| Expand schedule and fail-closed tests | both valid crons sync; numeric variants inert | Vitest + integration tests | pending |
| Update continuity and close task | docs current; task completed | exact file diff | pending |
| Validate, review, merge and verify | exact-HEAD checks pass; squash merge; post-merge checks including Workers Builds | GitHub check-runs/workflows and merge SHA | pending |

## Technical decisions

- Do not add the optional 23:00 UTC retry: the owner specifically needs the early morning capture plus the existing published-rate evening run; an extra run is not required for this acceptance criterion.
- Preserve the independent runtime watchdog Cron (17 * * * *) and its DATABASE_URL behavior; only the isolated BCV producer Cron is being extended.
- Keep BCV cron matching explicit and closed-set, rather than accepting any string beginning with a time or a broad schedule pattern.

## Closure and handoff

- Final commit SHA:
- PR:
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
