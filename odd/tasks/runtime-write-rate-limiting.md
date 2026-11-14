# ODD task: runtime-write-rate-limiting

- Status: in progress
- Issue / PR: Issue #53 (P0); PR #363
- Owner / reviewer: BTF14 / technical agent
- Started: 2026-11-14
- Risk: critical

## Objective and authorization

- Desired outcome: enforce atomic, HMAC-keyed, fail-closed runtime rate limits before every in-scope commercial/administrative write.
- Authorization boundary: implement on one branch and one PR against main; permanent merge authorization applies only after all applicable gates pass. No Neon main access or mutation, no secrets access/change, no manual deployment, no new SQL migration.
- Relevant original request: extend the existing `auth_rate_limits` / `consumeAuthRateLimit` pattern from Google OAuth and sales checkout to the remaining write handlers without changing existing OAuth/checkout contracts.

## Scope and exclusions

Included:
- `catalog-write.ts`: catalog POST and PATCH.
- `inventory-counts.ts`: count creation and confirmation POST.
- `inventory-receipts.ts`: receipt creation POST.
- `register-shifts.ts`: shift open and close POST.
- `organization-structure.ts`: branch, warehouse, register POST and branch-membership PATCH.
- Shared runtime write-rate-limit helper; unit, handler, PostgreSQL 18 integration and existing caller/fixture updates.
- ODD task and justified documentation updates.

Excluded:
- Changes to `google-auth.ts` or `sales-checkout.ts` behavior, scopes, HMAC key derivation, limits, or response contracts.
- Neon `main`, production data, credentials/secrets, Cloudflare manual configuration/deployments, SQL migrations, unrelated PRs and Issue #53 state.
- Watchdog BCV work and `docs/PRODUCTION_READINESS.md` changes for that later workstream.

## Acceptance criteria

- [ ] AC-1 — every listed write route consumes its independent scope bucket before any business mutation.
- [ ] AC-2 — only a syntactically valid `CF-Connecting-IP` is trusted; `X-Forwarded-For` is never used.
- [ ] AC-3 — missing/invalid client IP, missing/weak `GOOGLE_CLIENT_SECRET` pepper, or limiter database failure returns 503 `RATE_LIMIT_UNAVAILABLE` and does not execute the business mutation.
- [ ] AC-4 — quota exhaustion returns 429 with numeric `Retry-After` and a Spanish message; no IP or secret is returned/logged.
- [ ] AC-5 — each route has a distinct scope; a quota on one route cannot block another.
- [ ] AC-6 — unit tests and PostgreSQL 18 ephemeral integration tests cover allow, 429, missing IP and database failure for each covered module; existing auth/checkout contracts remain unchanged.
- [ ] AC-7 — full relevant CI, PostgreSQL 18 suite, exact-final-SHA check-runs and workflow runs pass; full diff and reviews/gates are checked before any merge.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Rate limit checked after business mutation | Critical | Call helper before opening mutation transaction or before any write SQL; test no-mutation on 429/503 |
| Spoofed client identity | High | Trust only Cloudflare-overwritten CF-Connecting-IP; strict IPv4/IPv6 parser; ignore XFF |
| Shared bucket causes collateral blocking | High | Explicit unique scope per method/route |
| Runtime role cannot use auth_rate_limits | Critical | PostgreSQL 18 tests under the actual synthetic runtime LOGIN and verify INSERT/UPDATE rights; no Neon access |
| Existing OAuth/checkout behavior regresses | High | Preserve current scope strings, policy numbers, response body and headers; regression tests |
| Arbitrary limits harm POS/admin workflows | Medium | Start with per-route policy: catalog 30/min; inventory count create 10/min; count confirm 10/min; receipt create 10/min; shift open/close 10/min each; structure create/update 10/min. Reassess against retry/idempotency semantics and document rationale. |
| Rate-limit database unavailable | Critical | Fail closed with sanitized 503; do not log raw IP, key or pepper |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify main, open PRs, Issue #53 and required operating docs | Current baseline and constraints | Live GitHub reads | completed |
| Inspect existing limiter, handlers, tests and runtime grants | Reusable contract and test inventory | Source/docs inspection; identify all callsites | in progress |
| Implement shared helper and route coverage | All 11 write endpoints protected | Unit + route-contract tests; inspect mutation order | pending |
| Extend PostgreSQL 18 runtime integration coverage | All route scopes and fail-closed outcomes proven | Disposable PostgreSQL 18, runtime LOGIN, no Neon | pending |
| Review complete diff and exact-SHA CI | Safe, isolated PR | CI, all check-runs/workflow runs, reviews and threads | pending |
| Merge only if every gate passes | One integrated PR | Expected-head squash merge and post-merge checks | pending |

## Technical decisions

- Reuse `auth_rate_limits` and the existing atomic `consumeAuthRateLimit`; no schema change.
- Namespace buckets as `<scope>:ip:<canonical-client-ip>`; scope names are fixed literals per route/method.
- HMAC pepper is the existing `GOOGLE_CLIENT_SECRET`; never fall back to XFF or an unkeyed hash.
- Proposed initial policies (requests per 60 seconds, per client IP): catalog create 30, catalog update 30, count create 10, count confirm 10, receipt create 10, shift open 10, shift close 10, branch create 10, warehouse create 10, register create 10, membership update 10. The final code/test/documentation must agree; no policy is inherited across scopes.
- Client identity validation must accept valid IPv4 and IPv6 only, reject empty/malformed/multi-address values, and never include the raw value in diagnostics.
- 429 body must be Spanish and include `Retry-After`; 503 must be sanitized and fail closed.

## Closure and handoff

- Final commit SHA:
- PR:
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
