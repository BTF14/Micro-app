# ODD task: P0 FX PIN configuration, CSV downloads and credentialed CORS

- Status: blocked (operator-only production validation and PR review)
- Issue / PR: https://github.com/BTF14/Micro-app/pull/407
- Owner / reviewer: BTF14 / engineering review
- Started: 2026-11-23
- Risk: high

## Objective and authorization

- Desired outcome: unblock FX PIN setup/verification and Reports CSV downloads without weakening authentication, tenant/branch authorization, origin checks or preview isolation.
- Authorization boundary: implement only handoff Block 1 on a branch based on verified main. No direct main changes, production deploy, Cloudflare dashboard/secrets mutation, Neon mutation, real data, or work from Blocks 2–4.
- Relevant original request: execute Block 1 of the supplied engineering handoff.

## Scope and exclusions

Included:
- Reuse the canonical API URL, credential, timeout, preview and error handling for CSV downloads.
- Correct credentialed CORS methods for the actual PIN and report flows.
- Require two distinct PIN secrets of at least 32 characters and return actionable Spanish messages for configuration, invalid PIN and rate-limit failures without exposing secret values.
- Add regression tests for API download behavior, CORS preflight and PIN error mapping.

Excluded:
- Changing PIN cryptography, iteration count, rate-limit policy, authorization rules or database schema.
- Setting Cloudflare Worker secrets, changing Cloudflare configuration, deploying, or touching Neon.
- UI/UX work from Blocks 3–4 and multi-role/concurrency audit from Block 2.

## Acceptance criteria

- [x] AC-1 — CSV requests use API_BASE_URL, credentials include, no-store, preview fail-closed behavior, 401 handling and consistent API error parsing.
- [x] AC-2 — CORS permits the required PUT method for FX PIN while retaining exact-origin credentialed policy.
- [x] AC-3 — PIN missing/short/equal-secret, invalid-PIN and rate-limit cases fail closed with clear Spanish messages and never expose secret values.
- [x] AC-4 — Regression tests cover the new behavior; web/API tests, typecheck and build are green on exact PR HEAD `fa2392735e4e07ca20563e70f9b67e761ab35c92` (10/10 workflows SUCCESS).
- [x] AC-5 — Final PR diff is restricted to Block 1; no production secrets, deploy or Neon writes.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Broadening CORS origin policy | High | Preserve exact configured origin and credentials; change only the required HTTP method. |
| Download bypasses preview protection or session handling | High | Share the same API transport/error path as apiRequest and test it. |
| Secret leakage | Critical | Never print, log, commit or return secret values; only report configuration status. |
| Production environment unavailable | High | No Cloudflare secret/deploy action; document operator-only setup separately. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect current main, callers, API/CORS and relevant tests | Confirm root causes and current contracts | GitHub main SHA c8e3bdc05207368bdaea803ec9895add247f3ff2; source inspection | completed |
| Implement shared download transport and regression tests | Downloads follow apiRequest security behavior | CI run 45151027484 SUCCESS on code SHA `d103b61d7abaa3527014e55a20d44e93f239bceb`; web 142 passed/1 skipped | completed |
| Fix CORS method and PIN error messages/tests | Correct preflight and actionable safe errors | CI run 45151027484 SUCCESS; API 377 passed; distinct secret validation tested | completed |
| Review final diff and open focused PR | No out-of-scope changes | PR #407 open and ready for review (`draft=false`); 9 files, no review comments/threads; 10/10 workflows SUCCESS on exact HEAD | completed |

## Technical decisions

- Reuse the existing API transport semantics rather than adding a second weaker fetch path.
- Do not expose `Content-Disposition`: the UI uses deterministic filenames and does not need to read that response header.
- Secret provisioning remains an operator action in Cloudflare Worker Secrets; the application rejects missing, short or identical values and secrets are never declared in `wrangler.toml`.

## Closure and handoff

- Validated exact PR HEAD: `fa2392735e4e07ca20563e70f9b67e761ab35c92`.
- PR: https://github.com/BTF14/Micro-app/pull/407 (open, ready for review; not merged)
- Checks and exact outcomes on validated code SHA: 10/10 workflows SUCCESS; CI run `45151719256`, Playwright E2E `45151719312`, security `45151719349`, secret history `45151719370`, Semgrep `45151719361`, database migration `45151719346`, PostgreSQL migration runner `45151719224`, ODD docs `45151719633`, dependency review `45151719294`, dashboard `45151719259`.
- Acceptance criteria: AC-1 through AC-5 met for code/tests. Production live acceptance remains pending until operator-only secrets are configured and PIN/authorization/CSV flows are tested after merge.
- Limitations not verified: Cloudflare production secret values/configuration, live PIN save/authorize/renew/revoke, and real browser CSV downloads were not inspected or exercised. Production deploy and Neon remain untouched.
- Residual risks: production Worker must have both distinct secrets configured with at least 32 characters each. The Pages Service Binding same-origin architecture and existing Lax session cookie are intentionally preserved.
- Next step: complete PR review; after merge, configure two independent Cloudflare Worker Secrets (`FX_PIN_PEPPER`, `FX_PIN_RATE_LIMIT_PEPPER`) and run the live acceptance checklist without sharing their values in chat.
