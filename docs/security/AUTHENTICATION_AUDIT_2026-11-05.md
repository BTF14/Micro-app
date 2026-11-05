# Authentication security audit — 2026-11-05

## Scope and evidence

Read-only source audit of the current `main` authentication implementation at the time of review, including:

- `apps/api/src/google-auth.ts`
- `apps/api/src/auth.ts`
- `apps/api/src/index.ts`
- `apps/api/src/bindings.ts`
- `apps/api/src/auth.test.ts`
- `apps/api/src/auth.integration.test.ts`
- `apps/api/src/google-auth-origin.test.ts`
- `apps/api/migrations/0001_initial.sql`

This is a code/configuration review, not a production penetration test. It does not establish the live Cloudflare Worker bindings, Neon grants, database ownership, or production routing.

## Positive controls verified in source

1. Google OAuth uses a cryptographically random state cookie, a PKCE S256 verifier/challenge, a fixed configured redirect URI, and short-lived HttpOnly/Lax cookies scoped to `/auth/google`.
2. OAuth callback checks the state cookie against the returned state, requires the PKCE verifier, obtains userinfo from Google's HTTPS endpoint, and requires a non-empty Google subject and verified email.
3. Existing users must be active, have the same previously linked Google subject, and have an active organization membership. Email equality alone does not link an existing password account.
4. New identity creation is restricted to the bootstrap path, checks the configured bootstrap token, locks a singleton bootstrap row, and consumes it transactionally.
5. Session tokens are random 32-byte values; only SHA-256 token hashes are persisted. Sessions expire after seven days and can be revoked.
6. Registration and password login return fail-closed 503 responses before parsing credentials or writing identities/sessions. Logout requires the exact configured frontend Origin.
7. CORS uses one validated configured frontend origin, credentials are enabled only for that origin, and auth responses receive `Cache-Control: no-store`; baseline anti-sniffing, frame-denial, and no-referrer headers are applied.

## Findings requiring remediation or explicit acceptance

### AUTH-P0-01 — No runtime rate limiting is wired into authentication routes

The initial migration creates `auth_rate_limits(key_hash, window_started_at, attempts, updated_at)`, but no runtime caller was found in the audited API source. The auth integration test also asserts that disabled registration/login do not write rate-limit rows. Google OAuth start, bootstrap POST, callback, and session endpoints therefore have no application-level rate limiter in the reviewed handlers.

**Risk:** repeated OAuth/bootstrap attempts and callback traffic can consume Worker, Google, and database resources. The one-time bootstrap database lock protects correctness, not request volume.

**Safe implementation prerequisites:** introduce a dedicated high-entropy HMAC pepper binding (not a hard-coded constant), define the trusted client-IP source for the actual Cloudflare deployment, use atomic PostgreSQL UPSERT/window logic, set endpoint-specific limits and Retry-After behavior, define fail-open/fail-closed behavior during database outages, and add concurrency/abuse tests plus cleanup retention. Do not trust arbitrary X-Forwarded-For. Do not store raw IP or email. The existing SHA-256-only schema does not provide keyed pseudonymization by itself.

**Deployment blocker:** `Bindings` currently has no rate-limit pepper binding. Adding a required secret in code without provisioning it in Cloudflare would either break authentication or tempt an unsafe bypass. The live secret configuration is not available to this source audit and must not be inferred or read from secret stores as part of this work.

### AUTH-P1-01 — Bootstrap bearer secret is copied into a browser cookie

The bootstrap POST validates the supplied token and then serializes the raw token into the HttpOnly, Secure-on-HTTPS, SameSite=Lax, ten-minute `microapp_oauth_bootstrap` cookie. HttpOnly limits script access, but the bearer secret is still present in browser cookie storage and in the Cookie header on callback.

**Recommendation:** replace the raw token in the cookie with a cryptographic digest or, preferably, a short-lived server-side bootstrap transaction identifier bound to OAuth state. Preserve one-time database consumption. Add tests proving the raw bootstrap token never appears in any Set-Cookie or redirect header. This should be done in a separate focused change with cookie migration/expiry behavior tested.

### AUTH-P1-02 — Session lifetime is fixed at seven days

Sessions have a seven-day absolute expiry and no refresh/rotation or idle timeout in the reviewed route. Revocation exists, but no session cleanup job was found in this scope.

**Recommendation:** explicitly decide whether seven-day absolute lifetime is acceptable for this POS system. If not, implement bounded idle/absolute lifetime and rotation with race-safe tests. Add retention/cleanup for expired and revoked sessions without deleting active records.

### AUTH-P2-01 — Duplicate frontend-origin validation

`index.ts` and `google-auth.ts` each implement frontend-origin validation. They currently express substantially the same policy but can drift.

**Recommendation:** consolidate into one shared utility and test exact canonical-origin behavior once.

### AUTH-P2-02 — Password hashing utilities remain after password login retirement

`auth.ts` still exports PBKDF2 hashing/verification helpers and unit tests, while the public password-login route is intentionally disabled. The integration test uses the hash helper to seed a legacy account.

**Recommendation:** retain only if required for legacy account migration/recovery tests; otherwise isolate it in test/migration support so it is not mistaken for an active authentication mechanism. Do not re-enable password login implicitly.

## Rate-limit design constraints

- Use a dedicated secret-backed HMAC (e.g. HMAC-SHA-256 over a versioned endpoint + normalized client identifier); do not use a plain hash of IPv4/IPv6 as a privacy boundary.
- Use Cloudflare's authenticated edge-provided client IP only when the Worker is guaranteed to be reached through Cloudflare. Reject/ignore user-controlled forwarding headers.
- Key separate buckets for OAuth start, bootstrap POST, callback, and any future credential verification; avoid an IP-only global bucket that can lock out a whole store.
- Use atomic SQL so concurrent requests cannot overshoot a bucket through read-then-write races.
- Define window reset, attempt increment, cleanup/retention, response status 429 and Retry-After, and DB-outage behavior before implementation.
- Do not log tokens, cookies, authorization codes, email addresses, raw IP addresses, or secret material.

## Current disposition

- No production configuration, secrets, live database, or Worker deployment was changed.
- No rate-limiter code is claimed to exist.
- Authentication hardening remains a production gate until AUTH-P0-01 is implemented and tested, and the live deployment prerequisites are independently verified.
- PR #210 remains a separate inventory-ledger change; this audit is stacked on its tested head and does not merge or deploy it.
