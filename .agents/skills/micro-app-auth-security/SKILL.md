---
name: micro-app-auth-security
description: Review and implement authentication, sessions, origin checks, rate limits, authorization, and tenant isolation in Micro app. Use for auth changes, security reviews, API route work, or identity readiness.
---

# Micro app authentication and authorization security

## Scope and source of truth

- Work only in the independent Micro app repository. Never mix in Cantina-pos.
- Read `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, and `docs/sdd/auth-policy-decision-record.md` before changing auth.
- Verify the live branch, PR head SHA, and relevant workflow results. Historical docs are not live evidence.
- The API uses Hono on Cloudflare Workers and currently has password/session code. Inspect current source before relying on this description.

## Review workflow

1. Enumerate every externally reachable route and middleware path. Record method, path, handler, authentication requirement, authorization rule, tenant scope, and tests.
2. Trace untrusted input from request headers, cookies, URL parameters, and body through validation to privileged operations and database queries.
3. Review session creation, expiry, revocation, cookie flags, origin/CSRF boundaries, generic errors, password hashing, rate limiting, and inactive users/memberships.
4. Check authorization on the server for every read/write. Never trust a client-supplied organization ID, role, owner flag, or user ID without verifying current membership and permission.
5. Check cross-tenant negative cases, account enumeration, replay, brute force, malformed payloads, DB failures, and partial-failure behavior.
6. Link every finding to concrete file/line evidence and explain impact, exploit preconditions, and a regression test. Label hypotheses as hypotheses.
7. Review the complete diff and relevant callers/tests after any fix. Verify CI, SAST, and E2E against the exact final SHA.

## Identity policy guardrails

- Google OAuth, allowlist semantics, email verification, account linking, bootstrap administrator, and role permissions are product/security decisions, not implementation guesses.
- Read D1–D8 and the role-permission matrix. Treat any item marked proposal/pending as unapproved.
- Keep public registration fail-closed until policy, implementation, and negative tests are approved and verified.
- The existing password-login route must be reviewed independently; do not claim an allowlist protects it unless code and tests prove that.
- Never invent allowed emails/domains, provider credentials, OAuth secrets, or account-linking rules.
- Do not send email, expose secrets, use real customer data, deploy production, or change Neon `main`.

## Expected output

Provide an endpoint inventory, prioritized findings (P0/P1/P2/P3), file/line evidence, missing tests, exact checks/SHA, and unresolved policy decisions. Distinguish observed, inferred, fixed, and verified states. A green scanner is not proof that auth is complete.
