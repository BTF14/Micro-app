# ODD task: P1 mobile accessibility, stock rejection and log safety

- Status: completed
- Issue / PR: PR #367 MERGED; implementation merge SHA `46a24f3d617bc07f4cf47931b0bece4cccfb5440`; PR #366 also MERGED
- Owner / reviewer: repository owner / technical agent
- Started: 2026-11-14
- Risk: high

## Objective and authorization

- Desired outcome: close verifiable P1 gaps in real full-stack mobile commerce UX, keyboard accessibility and operational log safety, while reconciling the completed PR #366 evidence.
- Authorization boundary: one isolated branch and one coherent PR. No Neon `main`, real data, secrets, manual Cloudflare/Google Cloud configuration, manual deployment, billing or production mutation.
- Relevant original request: real Hono + PostgreSQL 18 ephemeral E2E without HTTP/API mocks; insufficient-stock negative checkout with unchanged balance and ledger; mobile viewport; keyboard/ARIA checks; static regression guard for unsafe `console.*` logging.

## Scope and exclusions

Included:
- Extend `apps/web/e2e/real-fullstack-commerce.spec.ts` and the mobile Playwright project/config.
- Fix only failing critical UX/accessibility behavior in `apps/web/src`.
- Audit production `console.*` callsites in `apps/api/src` (excluding tests), sanitize unsafe output and add a regression test.
- Reconcile the #366 task and production/continuity documents with exact verified merge evidence.

Excluded:
- Any production database, secret, Cloudflare/Google Cloud setting, manual deployment or real customer data.
- Modifying/closing PR #193 or closing Issue #53.
- Reopening or duplicating PR #361, #363, #364, #365 or #366.
- Claiming CI proves real BCV persistence, external alert delivery, human RPO/RTO or legal/fiscal compliance.

## Acceptance criteria

- [x] AC-1 — Real insufficient-stock checkout returns an actual API 4xx; UI exposes a clear accessible error; PostgreSQL balance and immutable movement ledger remain unchanged.
- [x] AC-2 — Full commercial flow passes at 390x844 with no blocking horizontal overflow and usable, visible catalog, POS and receipt controls.
- [x] AC-3 — Real browser keyboard checks exercise Tab/Enter across login, modules and checkout; critical controls have accessible names/labels, focus is visible, and live error/status regions are announced.
- [x] AC-4 — Every production `console.*` callsite in `apps/api/src` is audited; no session tokens, secrets, cookies, raw external payloads or raw IPs are emitted.
- [x] AC-5 — Automated static/unit regression test fails on unsafe logging patterns in `apps/api/src`.
- [x] AC-6 — `odd/tasks/real-fullstack-commerce-e2e.md` is Status: completed and AC-8 records PR #366 HEAD `b078a02608b807a2ecdd0b59e95d8017ecd2f553` (16/16 check-runs, 12/12 workflows SUCCESS) and post-merge `main` `366334ae75c966e4fada13afed964a7f4b557954` (14/14 check-runs, 9/9 workflows SUCCESS).
- [x] AC-7 — Production readiness and continuity docs accurately distinguish CI-validated P1 from real production gates; no personal emails, provider IDs, internal business/product names or secrets.
- [x] AC-8 — Complete diff reviewed; all check-runs and workflow runs SUCCESS on the final exact PR HEAD; squash merge under repository policy; all post-merge checks verified on exact `main`.
- [x] AC-9 — PR #193 and Issue #53 remain OPEN; production remains **NOT READY**.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Stock rejection mutates ledger or balance | Critical | Real PostgreSQL 18 transaction; snapshot balance and ledger before/after failed checkout |
| Accessibility changes alter workflows | High | Add browser assertions first; limit source fixes to demonstrated failures |
| Sensitive operational data leaks through logs | Critical | Audit callsites and add static regression guard; never inspect or print secret values |
| CI overstates production readiness | Critical | Keep BCV live window, external alert routing, human RPO/RTO and legal/fiscal review explicitly open |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Reconcile live repository and PR #366 closure | Correct base and no duplicate work | GitHub reads; #366 closed/merged; #193 and #53 open | complete |
| Add this ODD task before source changes | Durable scope and acceptance criteria | First branch commit `cb96d544f3d8df1505dc5acde9b264c7226e3917` | complete |
| Extend real commerce E2E | Stock failure, mobile and keyboard assertions | PR #367 HEAD `4285d183a53ba43c4f471ca242102389c8697080`: 17/17 checks, 13/13 workflows SUCCESS; mobile full-stack 1/1 passed | complete |
| Audit API operational logs | Safe structured output only | 10 reviewed production calls across 3 source files; deny-by-default static test passed in CI | complete |
| Reconcile readiness and continuity | Exact evidence, honest production gates | #366 task, readiness, current state, journal and handoff updated | complete |
| Final exact-HEAD CI, review and merge | Safe integrated PR | PR #367 HEAD `e467c636506158b8f3be4361033e1e40473eccdd`: 17/17 checks, 13/13 workflows; merge `46a24f3d617bc07f4cf47931b0bece4cccfb5440`; post-merge 14/14 checks, 9/9 workflows | complete |

## Technical decisions

- Reuse the existing real Hono/PostgreSQL 18 ephemeral harness and real browser proxy. No `page.route`, HTTP mocks or fake API responses.
- Assert failed checkout atomicity against both stock balance and ledger rows, not only the browser response.
- Added a dedicated Playwright `mobile-chromium` project at 390×844; the real full-stack spec and auxiliary browser contexts use mobile emulation.
- Prefer structured, allowlisted log metadata. Never serialize arbitrary request/response objects or external payloads.
- CI/preview checks are not production deployment evidence.

## Closure and handoff

- CI history: pre-fix heads exposed a TypeScript Node URL type conflict, a mobile-only hidden-session assertion and an allowlist-normalization mismatch. These were corrected before the validated implementation HEAD `4285d183a53ba43c4f471ca242102389c8697080`. Earlier failed/cancelled runs are diagnostic only and are not reused.
- Validated implementation evidence: PR #367 final HEAD `e467c636506158b8f3be4361033e1e40473eccdd`: 17/17 check-runs SUCCESS, 13/13 workflow runs SUCCESS, CI verify 52/52, Playwright mobile full-stack 1/1 passed in 9.6 seconds, Chromium authentication smoke SUCCESS.
- Squash merge: `46a24f3d617bc07f4cf47931b0bece4cccfb5440` at 2026-11-14 23:23:30 UTC. Post-merge on `46a24f3d617bc07f4cf47931b0bece4cccfb5440`: 14/14 check-runs SUCCESS and 9/9 workflow runs SUCCESS.
- AC-8 complete: full diff manually reviewed, mergeability clean, no formal reviews or unresolved threads; merge and post-merge checks verified.

- PR #367 MERGED. Implementation HEAD `e467c636506158b8f3be4361033e1e40473eccdd`; squash merge `46a24f3d617bc07f4cf47931b0bece4cccfb5440`.
- Pre-merge exact-HEAD evidence: 17/17 check-runs SUCCESS, 13/13 workflow runs SUCCESS, CI verify 52/52, Playwright mobile full-stack 1/1 SUCCESS, Chromium authentication smoke SUCCESS.
- Post-merge evidence on `46a24f3d617bc07f4cf47931b0bece4cccfb5440`: 14/14 check-runs SUCCESS and 9/9 workflow runs SUCCESS.
- AC-1–AC-9 COMPLETED. The only remaining blockers are the external production gates documented above.
- Residual risks: Issue #53 remains P0/OPEN; production is NOT READY.
- Next step: keep the external production gates open; no further P1 implementation work is pending.
