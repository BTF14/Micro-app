# ODD task: P0 FX PIN configuration, CSV downloads and credentialed CORS

- Status: in progress
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
- Return actionable Spanish messages for PIN configuration, invalid PIN and rate-limit failures without exposing secret values.
- Add regression tests for API download behavior, CORS preflight and PIN error mapping.

Excluded:
- Changing PIN cryptography, iteration count, rate-limit policy, authorization rules or database schema.
- Setting Cloudflare Worker secrets, changing Cloudflare configuration, deploying, or touching Neon.
- UI/UX work from Blocks 3–4 and multi-role/concurrency audit from Block 2.

## Acceptance criteria

- [ ] AC-1 — CSV requests use API_BASE_URL, credentials include, no-store, preview fail-closed behavior, 401 handling and consistent API error parsing.
- [ ] AC-2 — CORS permits the required PUT method for FX PIN while retaining exact-origin credentialed policy.
- [ ] AC-3 — PIN missing-secret, invalid-PIN and rate-limit responses have clear Spanish messages and never expose secret values.
- [ ] AC-4 — Regression tests cover the new behavior; web/API tests, typecheck and build are green on the final SHA.
- [ ] AC-5 — Final PR diff is restricted to Block 1; no production secrets, deploy or Neon writes.

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
| Implement shared download transport and regression tests | Downloads follow apiRequest security behavior | CI exact-SHA pending; initial CI exposed a ReportsPanel test mock mismatch, now corrected | completed |
| Fix CORS method and PIN error messages/tests | Correct preflight and actionable safe errors | CI exact-SHA pending | completed |
| Review final diff and open focused PR | No out-of-scope changes | PR #407 opened Draft; final diff review and checks pending | in progress |

## Technical decisions

- Reuse the existing API transport semantics rather than adding a second weaker fetch path.
- Do not expose `Content-Disposition`: the UI uses deterministic filenames and does not need to read that response header.
- Secret provisioning remains an operator action in Cloudflare Worker Secrets; secrets are never declared in `wrangler.toml`.

## Closure and handoff

- Final commit SHA: pending (current branch head will be recorded after the final validation pass)
- PR: https://github.com/BTF14/Micro-app/pull/407 (Draft)
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: production Cloudflare secrets and live cross-origin browser behavior are not accessible from this code-only workflow.
- Residual risks: production Worker must have both distinct secrets configured with at least 32 characters each.
- Next step: validate the corrected ReportsPanel test and all required workflows on the final PR HEAD, then review the final diff.
