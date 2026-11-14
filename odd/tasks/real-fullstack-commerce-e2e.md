# ODD task: real-fullstack-commerce-e2e

- Status: in progress
- Issue / PR: Issue #53 (P0) remains open; dedicated PR against `main`
- Owner / reviewer: BTF14 / technical agent
- Started: 2026-11-14
- Risk: critical

## Objective and authorization

- Desired outcome: add a deterministic Chromium end-to-end commercial workflow that exercises the compiled real web application, same-origin `/api` proxy, real Hono API handlers, and disposable PostgreSQL 18 with migrations 0001–0025 and synthetic least-privilege runtime identities.
- Authorization boundary: implementation and PR integration are authorized subject to all repository gates. No Neon `main`, production data, secrets, manual Cloudflare/Google Cloud configuration, manual deployment, billing, or production mutation.
- Relevant original request: create real full-stack Playwright coverage for catalog create/read, inventory receipt, register shift open, USD/VES checkout through SalesPanel, persisted stock decrement, on-screen receipt, shift close and reload persistence, plus a real API-rejected negative sale. Do not use `page.route`, network/API mocks, production-runtime test endpoints, or weaken auth/CSRF/BCV.

## Scope and exclusions

Included:
- Real API + real PostgreSQL 18 ephemeral harness; migrations 0001–0025; synthetic user/session/organization/branch/warehouse/register/rate/sync-state fixtures created only by test harness.
- Real compiled/served web frontend and same-origin `/api` proxy to the API.
- Full-stack Playwright Chromium flow and deterministic cleanup/isolation.
- Preserve and continue running existing Chromium authentication smoke tests.
- Reconcile `docs/PRODUCTION_READINESS.md`, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md`, and `docs/HANDOFF_NEXT_CHAT.md` with PR #365 merge SHA `5e80770e73d3ed65fa92083ea5f4478d0d9f71d9`, exact results of this PR, and correction of the Turno 45 typo `Neon `main)``.
- Keep production readiness explicitly NOT READY while real BCV persistence, external Cloudflare alert routing, human RPO/RTO, legal/fiscal review, and Issue #53 remain open.

Excluded:
- Any changes to Neon `main`, secrets, production data, manual provider configuration, manual deployments, billing, or DNS.
- Any production runtime test endpoint, auth/CSRF/BCV bypass, route mocking, or weakened production security.
- Any modification or closure of PR #193; any closure of Issue #53.
- Claiming that ephemeral PostgreSQL E2E proves production BCV persistence, alert routing, recovery objectives, or legal/fiscal compliance.

## Acceptance criteria

- [ ] AC-1 — task file is the first change on an isolated branch based on verified `main` SHA `5e80770e73d3ed65fa92083ea5f4478d0d9f71d9`.
- [ ] AC-2 — CI provisions PostgreSQL 18 ephemeral and applies every migration 0001–0025 with assertions; creates synthetic least-privilege `microapp_runtime` and dedicated BCV producer role(s), with no real credentials.
- [ ] AC-3 — harness seeds valid organization, memberships/allowlist, active branch, warehouse, register, real hashed session, applicable `America/Caracas` BCV rate and valid `bcv_sync_state`; all seeding is test-only.
- [ ] AC-4 — Hono API is served with the actual production route handlers against the disposable PostgreSQL database, and compiled/served web app uses a real same-origin `/api` proxy to that API.
- [ ] AC-5 — Chromium E2E has no `page.route`, mocked fetch/XHR, fake API responses, or API interception for `/api/*`; it creates/reads a product, receives inventory, opens a shift, checks out in USD and VES as supported by the existing UI contract, verifies persisted stock decrement and visible receipt, closes the shift, reloads, and verifies closed state.
- [ ] AC-6 — negative sale with closed register or insufficient stock is rejected by the real API and the UI displays the rejection; database state remains unchanged.
- [ ] AC-7 — existing Chromium authentication smoke tests remain intact and pass alongside the new full-stack suite.
- [ ] AC-8 — complete diff, security/data review, all check-runs and workflow runs are verified on the exact final PR HEAD; squash merge only if every applicable gate passes; all post-merge `main` checks are verified.
- [ ] AC-9 — continuity/readiness documents distinguish CI full-stack E2E from production-only pending gates, record exact evidence, preserve PR #193 OPEN and Issue #53 OPEN/P0, contain no personal emails/provider resource IDs/internal business-product names/secrets, and fix the Turno 45 typo.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Harness accidentally creates a production auth or business bypass | Critical | All fixtures and seeding live in test-only code; no runtime test endpoints or production security changes; review route/auth diffs |
| Runtime PostgreSQL role has excess privilege | Critical | Use real LOGIN role in CI; assert allowed/denied SQL privileges and use admin role only for fixture setup |
| BCV checkout fixture becomes stale or timezone-dependent | High | Derive effective date using `America/Caracas`; seed a valid successful sync and rate for the test date; assert checkout fail-closed if invalid |
| Frontend/API path silently uses mocks | Critical | No `page.route`; browser network assertions and database assertions; real proxy and real API process |
| Existing authentication smoke tests regress | High | Keep current tests and execute both suites in same workflow |
| Ephemeral database cleanup leaks or cross-tests | Medium | Isolated database/service per workflow job, unique fixture identifiers, deterministic teardown |
| Documentation overstates production readiness | Critical | Explicitly retain BCV production persistence, external alerts, human RPO/RTO, legal/fiscal review, and Issue #53 as open |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect ODD, current CI, API, frontend and migrations | Verified harness architecture and seed contract | GitHub source at base SHA | in progress |
| Build test-only API/database harness | Real Hono handlers on PostgreSQL 18 with runtime LOGIN | CI job logs and privilege assertions | pending |
| Add full-stack Playwright flow | Browser exercises real UI/API/DB with no API mocks | Playwright report, HTTP and DB assertions | pending |
| Preserve existing browser smoke suite | Existing auth smoke test still executes | Same workflow run | pending |
| Reconcile readiness and continuity docs | Exact PR #365 and new PR evidence; no false production claims | Diff and docs checks | pending |
| Review, merge, and verify post-merge | Safe squash merge only after exact-HEAD gates | PR diff, check-runs, workflows, post-merge checks | pending |

## Technical decisions

- Use the existing production Hono application and route handlers; do not add test-only HTTP endpoints to `apps/api` or `apps/web`.
- Prefer a Node-based local harness adapter around the same Hono `app.fetch` and a test-only PostgreSQL driver binding if the Workers Neon driver cannot connect directly to local PostgreSQL. The adapter must not alter production runtime modules or route behavior.
- Use PostgreSQL 18 and the actual complete migration chain 0001–0025. Reuse existing migration assertion and role-contract scripts where possible rather than maintaining a parallel schema.
- Preserve all current auth, Origin/CSRF, runtime authorization, rate-limit, stock, shift and BCV checks. Seed valid test state rather than bypassing these checks.
- Do not claim the E2E suite covers real Google OAuth provider interaction; authenticate by a real persisted synthetic session following the production session-hash contract.

## Closure and handoff

- Final commit SHA:
- PR:
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
