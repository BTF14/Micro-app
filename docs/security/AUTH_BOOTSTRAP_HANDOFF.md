# One-time Google bootstrap handoff

## Security change

The bootstrap POST still accepts the one-time administrative bearer token in its request body over HTTPS and validates it against the encrypted `BOOTSTRAP_TOKEN` Worker secret. After validation, the raw token is discarded by the route and is never copied into a browser cookie, redirect URL, or database row.

The bootstrap form body is read through the shared streaming byte limiter with a hard 2,048-byte ceiling. The reader cancels the stream immediately when the limit is exceeded, including when `Content-Length` is absent, and rejects malformed UTF-8. Catalog write routes use the same bounded reader. Unit tests cover early cancellation, exact-limit acceptance, malformed UTF-8 and empty bodies; the route integration test verifies an oversized bootstrap POST without `Content-Length` returns 413 without redirecting or setting a bootstrap cookie.

The API creates a cryptographically random 32-byte opaque handoff handle. It stores only SHA-256 hashes of the handle and the OAuth state, plus the organization name/slug and a ten-minute expiry, in `auth_bootstrap_attempts`. The browser receives only the base64url handle in the existing short-lived HttpOnly/SameSite=Lax cookie.

At callback:
1. OAuth state cookie must match the query state before any handoff is considered.
2. The opaque handle and state are hashed and must match the same unexpired, unconsumed server-side row.
3. The row is locked and consumed inside the same PostgreSQL transaction that locks the global `auth_bootstrap` sentinel and creates the organization, owner, membership and session.
4. A second callback cannot consume the same handle. The global sentinel still prevents a second initial owner even if multiple independent handoffs were started.

A handoff that does not match the OAuth state, is expired, is already consumed, or does not exist cannot create an organization or user.

## Data retention and permissions

- The table contains no raw bootstrap token, no raw handoff handle, and no raw OAuth state.
- `handle_hash` and `state_hash` are fixed-length SHA-256 hashes; the handle itself has 256 bits of randomness.
- PUBLIC receives no table privileges. The `microapp_runtime` role receives only the table operations needed by the OAuth flow and the explicit DELETE privilege required for retention; migration 0012 asserts this grant.
- Expired handoff rows are pruned opportunistically when a new handoff is created and by the production Worker Cron every hour once they are more than 48 hours past expiry. Each Cron invocation deletes at most 500 rows per table using row locks with `SKIP LOCKED`; repeated invocations drain any backlog without holding an unbounded delete. Preview invocations return before opening a database connection. The PostgreSQL integration suite verifies the 48-hour cutoff, preservation of recent rows, the 500-row batch cap, preview no-op, and the actual `microapp_runtime` grants.
- The encrypted database backup explicitly excludes `auth_bootstrap_attempts`, just as it excludes sessions and rate-limit buckets; pending browser authentication flows are not recovery-critical business data.
- The migration is additive (`0005_auth_bootstrap_attempts.sql`) and has dedicated PostgreSQL assertions plus rollback validation.

## Deployment gate

The migration must be applied before deploying code that reads `auth_bootstrap_attempts`. The runtime database role must have the minimum SELECT/INSERT/UPDATE/DELETE permissions required for this table. Verify those grants in the intended database; this PR does not access or modify Neon production.

No Worker secret, Cloudflare dashboard setting, live database, production data, or deployment was changed.
