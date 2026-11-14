# ODD task: P1 mobile accessibility, stock rejection and log safety

- Status: in progress
- Issue / PR: new focused PR; PR #366 is already MERGED
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

- [ ] AC-1 — Real insufficient-stock checkout returns an actual API 4xx; UI exposes a clear accessible error; PostgreSQL balance and immutable movement ledger remain unchanged.
- [ ] AC-2 — Full commercial flow passes at 390x844 with no blocking horizontal overflow and usable, visible catalog, POS and receipt controls.
- [ ] AC-3 — Real browser keyboard checks exercise Tab/Enter across login, modules and checkout; critical controls have accessible names/labels, focus is visible, and live error/status regions are announced.
- [ ] AC-4 — Every production `console.*` callsite in `apps/api/src` is audited; no session tokens, secrets, cookies, raw external payloads or raw IPs are emitted.
- [ ] AC-5 — Automated static/unit regression test fails on unsafe logging patterns in `apps/api/src`.
- [ ] AC-6 — `odd/tasks/real-fullstack-commerce-e2e.md` is Status: completed and AC-8 records PR #366 HEAD `b078a02608b807a2ecdd0b59e95d8017ecd2f553` (16/16 check-runs, 12/12 workflows SUCCESS) and post-merge `main` `366334ae75c966e4fada13afed964a7f4b557954` (14/14 check-runs, 9/9 workflows SUCCESS).
- [ ] AC-7 — Production readiness and continuity docs accurately distinguish CI-validated P1 from real production gates; no personal emails, provider IDs, internal business/product names or secrets.
- [ ] AC-8 — Complete diff reviewed; all check-runs and workflow runs SUCCESS on the final exact PR HEAD; squash merge under repository policy; all post-merge checks verified on exact `main`.
- [ ] AC-9 — PR #193 and Issue #53 remain OPEN; production remains **NOT READY**.

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
| Add this ODD task before source changes | Durable scope and acceptance criteria | Commit on isolated branch | in progress |
| Extend real commerce E2E | Stock failure, mobile and keyboard assertions | PostgreSQL 18 + real Hono + Playwright | pending |
| Audit API operational logs | Safe structured output only | Full callsite inventory + regression test | pending |
| Reconcile readiness and continuity | Exact evidence, honest production gates | ODD docs validation and diff review | pending |
| Final exact-HEAD CI, review and merge | Safe integrated PR | All check-runs/workflows and post-merge main | pending |

## Technical decisions

- Reuse the existing real Hono/PostgreSQL 18 ephemeral harness and real browser proxy. No `page.route`, HTTP mocks or fake API responses.
- Assert failed checkout atomicity against both stock balance and ledger rows, not only the browser response.
- Use the existing mobile project if present; otherwise add a dedicated Playwright mobile device project without weakening desktop coverage.
- Prefer structured, allowlisted log metadata. Never serialize arbitrary request/response objects or external payloads.
- CI/preview checks are not production deployment evidence.

## Closure and handoff

- Final commit SHA: pending
- PR: pending
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: first real BCV rate persisted in Neon `main`; external alert delivery; human RPO/RTO; legal/fiscal approval.
- Residual risks: Issue #53 P0 and production gates remain open.
- Next step: implement the real stock-negative, mobile and keyboard E2E assertions, then audit API logs.
