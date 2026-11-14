# ODD task: real-fullstack-commerce-e2e

- Status: implementation and documentation complete; final exact-HEAD merge gate pending
- Issue / PR: Issue #53 (P0) remains OPEN; implementation and reconciliation are in PR #366
- Owner / reviewer: BTF14 / technical agent
- Started: 2026-11-14
- Risk: critical

## Objective and authorization

- Desired outcome: deterministic Chromium end-to-end commercial workflow exercising the compiled real web application, same-origin `/api` and `/auth` proxy, real Hono API handlers, and disposable PostgreSQL 18 with migrations 0001–0025.
- Authorization boundary: implementation and PR integration are authorized subject to repository gates. No Neon `main`, production data, secrets, manual Cloudflare/Google Cloud configuration, manual deployment, billing, or production mutation.
- Original acceptance intent: catalog create/read, inventory receipt, register shift open, USD/VES POS checkout, persisted stock decrement, on-screen receipt, shift close and reload persistence, and a real API-rejected negative sale. No `page.route`, API/network response mocks, production test endpoints, or weakening auth/CSRF/BCV.

## Scope and exclusions

Included:
- PostgreSQL 18 ephemeral service and canonical migrations 0001–0025.
- Test-only synthetic Owner and Cashier users, persisted session hashes, allowlist, organization/branch memberships, warehouse, register, valid date-scoped BCV fixture and sync state.
- Real Hono `app.fetch` handlers over the ephemeral database, compiled/served frontend, and same-origin proxy.
- Full-stack Chromium flow and preservation of existing Chromium authentication smoke tests.
- Reconciliation of `docs/PRODUCTION_READINESS.md`, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md`, and `docs/HANDOFF_NEXT_CHAT.md` with PR #365 merge SHA `5e80770e73d3ed65fa92083ea5f4478d0d9f71d9`, exact E2E evidence, production gates, and Turno 45 typo correction.

Excluded:
- Neon `main`, production data, secrets, manual provider configuration, manual deployments, billing, or DNS.
- Production runtime test endpoints, auth/CSRF/BCV bypasses, API response mocking, or weakened security.
- Modification or closure of PR #193; closure of Issue #53.
- Claiming ephemeral CI proves production BCV persistence, external alert delivery, RPO/RTO, or legal/fiscal compliance.

## Acceptance criteria

- [x] AC-1 — this task file was the first change on the isolated branch, based on verified `main` SHA `5e80770e73d3ed65fa92083ea5f4478d0d9f71d9`.
- [x] AC-2 — CI provisions PostgreSQL 18 ephemeral, applies migrations 0001–0025, verifies the complete migration ledger, and provisions separate least-privilege `microapp_runtime` and `microapp_bcv_sync` logins.
- [x] AC-3 — test harness seeds two persisted application identities (Owner and Cashier), sessions with the production hash contract, allowlist, organization and branch memberships, active warehouse/register, an `America/Caracas`-dated valid synthetic BCV rate and valid `bcv_sync_state`. Runtime write denial is asserted; BCV state is seeded only by the dedicated producer role.
- [x] AC-4 — real Hono route handlers run through the test-only Node adapter against PostgreSQL 18; the compiled frontend is served with real same-origin `/api` and `/auth` proxying.
- [x] AC-5 — Chromium performs product create/read, inventory receipt, cashier shift open, USD and VES checkout, visible receipts, backend stock decrement, shift close, real reload and persisted closed state.
- [x] AC-6 — stale POS page attempts checkout after shift close; the real API returns HTTP 409 `OPEN_SHIFT_REQUIRED`, UI displays the rejection and stock remains unchanged.
- [x] AC-7 — existing Chromium authentication smoke tests remain intact and pass in the same workflow.
- [x] AC-9 — readiness and continuity docs distinguish CI full-stack evidence from production-only gates, include PR #365 merge SHA and correct the Turno 45 typo without adding personal emails, provider resource IDs, internal business/product names or secrets.
- [ ] AC-8 — verify the complete diff, all check-runs/workflow runs, reviews and threads on the final post-documentation PR HEAD; then squash merge only if all applicable gates pass and verify all post-merge `main` checks. This is the remaining operational gate.

## Risks and guardrails

| Risk | Severity | Mitigation / evidence |
|---|---|---|
| Production auth or business bypass | Critical | All fixtures and seeding are test-only; no runtime test endpoints or production security changes |
| Excess database privileges | Critical | Actual LOGIN roles; runtime cannot update `bcv_sync_state`; producer role seeds the valid fixture |
| Stale or timezone-dependent BCV fixture | High | Date derived in `America/Caracas`; checkout validates the rate and successful sync state |
| API network mocking | Critical | No `page.route` or API response interception; browser goes through real proxy, Hono handlers and PostgreSQL |
| Existing browser smoke regression | High | Existing Chromium auth smoke tests run in the same workflow and pass |
| Documentation overstates readiness | Critical | Production BCV, external alert routing, human RPO/RTO, legal/fiscal review and Issue #53 remain open |

## Tasks and evidence

| Task | Result | Evidence | Status |
|---|---|---|---|
| Inspect ODD, CI, API, frontend and migrations | Harness contract verified | Repository source at base `5e80770e73d3ed65fa92083ea5f4478d0d9f71d9` | complete |
| Build test-only API/database harness | Real Hono handlers and PostgreSQL 18 | Full-stack workflow; migration ledger; role assertions | complete |
| Add full-stack Playwright flow | Real browser/API/DB flow, no API mocks | Full-stack Playwright job SUCCESS | complete |
| Preserve existing browser smoke suite | Existing auth tests execute | Same Playwright workflow; SUCCESS | complete |
| Reconcile readiness/continuity docs | PR #365 and E2E evidence recorded; production gates explicit | This PR diff and ODD validation | complete |
| Review, merge and verify post-merge | Exact final PR HEAD and main checks | PR #366 check-runs/workflow runs and post-merge main | pending |

## Exact implementation evidence

- Implementation HEAD validated before this documentation reconciliation: `3329562d15f40ce744de67a088400935d9d3566a`.
- That exact HEAD had 16/16 check-runs SUCCESS and 12/12 workflow runs SUCCESS.
- CI `verify`: 52/52 steps SUCCESS.
- Real full-stack PostgreSQL 18 job: 20/20 executed steps SUCCESS; Playwright Chromium flow SUCCESS.
- Existing Chromium authentication smoke tests SUCCESS.
- Cloudflare Pages and Worker builds passed as CI/preview checks only; no deployment was performed.
- The docs commit changes the PR HEAD. All checks must be re-run and verified on that new exact SHA; do not reuse the evidence above as final-HEAD evidence.

## Technical decisions

- Use the production Hono application and route handlers; do not add test-only endpoints to `apps/api` or `apps/web`.
- A test-only adapter binds the app's Neon `Client` interface to `pg.Client` so the same Hono handlers can connect to local PostgreSQL 18. This adapts database transport only; it does not mock HTTP, API responses, SQL results, auth, CSRF, rate limits, permissions, stock or BCV logic.
- Use two synthetic application users: Owner for catalog and inventory receipt; Cashier for opening/closing their own shift and POS checkout. The database trigger requires organization role `cashier` to open a shift, so Owner must not be reused for that step.
- Seed valid BCV state using the dedicated producer login and the current `America/Caracas` effective date; runtime is explicitly denied BCV-state writes.
- No real Google OAuth provider interaction is claimed. The test uses real persisted synthetic sessions following the production session-hash contract.
- Keep rate limiting, Origin/CSRF, runtime authorization, stock, shift and BCV validation active.

## Closure and handoff

- Implementation HEAD: `3329562d15f40ce744de67a088400935d9d3566a`; PR #366.
- Checks at implementation HEAD: 16/16 check-runs, 12/12 workflow runs, CI verify 52/52, full-stack job 20/20 steps SUCCESS, existing Chromium authentication smoke tests SUCCESS.
- Acceptance criteria: AC-1 through AC-7 and AC-9 met; AC-8 remains pending exact final PR HEAD checks, merge and post-merge verification.
- Limitations not verified: first real BCV rate persisted in Neon `main`; external Cloudflare alert delivery; human RPO/RTO; legal/fiscal approval; Issue #53.
- Residual production status: **NOT READY**.
- Next step: validate final documentation HEAD, inspect complete diff/reviews/threads, squash merge only if every applicable gate passes, and verify post-merge `main` checks. Keep PR #193 and Issue #53 OPEN.
