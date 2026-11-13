# ODD task: same-origin API through Cloudflare Pages Functions

- Status: in progress
- Issue / PR: same-origin OAuth/session remediation; PR pending
- Owner / reviewer: project owner / independent architecture-security-QA pass
- Started: 2026-11-13
- Risk: high

## Objective and authorization

- Desired outcome: serve production browser API traffic through `https://micro-app-63i.pages.dev/api/*` and a Cloudflare Pages Service Binding named `API` targeting Worker `micro-app-api`, so browser cookies are first-party.
- Authorization boundary: implement a new branch and OPEN PR only. No merge, Neon, GitHub Secrets, Cloudflare Dashboard, Google Cloud Console, deploy, billing, DNS, or production data operations. Preserve the natural 07:00 UTC backup monitor and the separate restore gate.
- Base: main `0c90aa382633452daeab81e3937112fa1c0ae0ae`.

## Scope and exclusions

Included:
- Root Pages Function at `/functions/api/[[path]].ts` (Pages project root is repository root; output remains `apps/web/dist`).
- Fail-closed host/branch/binding checks, Worker request forwarding, manual redirects, individual Set-Cookie preservation and OAuth Path rewriting.
- OAuth session SameSite=Lax, exact logout cookie clearing, frontend API base/CSP, CI and regression tests, Wrangler redirect URI.
- ADR and this task record.

Excluded:
- All remote Cloudflare, Google, Neon, GitHub Secrets, backup, deployment and billing changes.
- Removing the old Google OAuth redirect URI.
- Merging this PR or declaring the production incident resolved.

## Acceptance criteria

- [ ] Production hostname is exact; if runtime `CF_PAGES_BRANCH` is present it must equal `main`; all other hosts/branches fail with JSON 503 before touching `env.API`.
- [ ] Missing/invalid `API` binding fails closed with JSON 503.
- [ ] Proxy strips only the `/api` prefix, preserves query/method/body/headers and uses manual redirect handling.
- [ ] Multiple Set-Cookie values remain separate; only the three OAuth cookies have exact `Path=/auth/google` rewritten to `Path=/api/auth/google`.
- [ ] Session and deletion cookie contract is `Path=/; SameSite=Lax; HttpOnly; Secure` on HTTPS.
- [ ] Production frontend uses `/api`; CSP permits `connect-src 'self'` only; preview build and bundle remain API-dark.
- [ ] Local development and Playwright mocks remain functional.
- [ ] Typecheck and tests cover the Pages Function, OAuth cookie contract, session cookie contract and preview isolation.
- [ ] PR is OPEN and NOT MERGED. No remote infrastructure changes. Backup monitor/restore workflow untouched.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| OAuth PKCE cookie Path mismatch | High | Proxy rewrites exact named cookie Path on issuance and deletion; unit contract test |
| Redirect/cookie loss in proxy | High | redirect manual; getSetCookie iteration; 302 + multiple-cookie test |
| Preview reaches production Worker | Critical | exact production hostname + optional branch check before binding access; spy asserts no invocation |
| Logout leaves stale session | High | same cookie scope attributes; unit tests |
| Pages runtime binding absent | High | fail-closed 503; manual production-only binding step documented |
| Google callback not yet registered | High | old URI retained until post-deploy verification; manual migration checklist |
| Backup observation disturbed | Critical | no backup workflow edits/dispatch; no merge |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect main, Cloudflare Pages root/build settings, auth and workflows | verified baseline | GitHub source + deployment audit | done |
| Add Pages proxy and cookie tests | deterministic contract | API Vitest + CI | in progress |
| Switch frontend/CSP/Google callback config | same-origin browser URLs | build, E2E and bundle checks | pending |
| Review diff and exact-HEAD CI | auditable PR | GitHub PR/checks | pending |
| Preserve manual activation/merge gate | no production changes | PR remains OPEN | required |

## Technical decisions

- Pages Functions live in repository-root `functions/`, not `apps/web/functions/`; Cloudflare Pages root directory is empty and build output is `apps/web/dist`.
- Runtime proxy allows only exact `micro-app-63i.pages.dev`; if `CF_PAGES_BRANCH` is present, it must be exactly `main`. Cloudflare documents `CF_PAGES_BRANCH` as a Pages build-system variable; runtime availability is not assumed. The exact primary production hostname is therefore the mandatory runtime discriminator.
- The Pages Service Binding is not versioned in the existing Worker Wrangler config and cannot be created from this code-only PR without changing remote Pages configuration. Owner must add it to Production only: binding name `API`, service `micro-app-api`; keep Preview binding absent.
- OAuth API continues to emit its internal `Path=/auth/google`; the Pages proxy rewrites only the three PKCE cookie names to the browser-visible `Path=/api/auth/google`, including clearing cookies. This keeps direct Worker routes unchanged.
- No zero-downtime claim until old/new Google callback registration and Pages binding are configured and live flow is verified.

## Closure and handoff

- Final commit SHA: pending
- PR: pending
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: no live Pages runtime or Brave Shields test before manual post-merge activation
- Residual risks: Pages production binding and Google callback remain owner-operated gates
- Next step: finish implementation/tests, open PR, wait for exact-HEAD CI, stop without merge
