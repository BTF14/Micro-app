# Authentication rate-limit deployment gate

## Required Worker secret

The API now requires an encrypted Worker secret named `AUTH_RATE_LIMIT_HMAC_KEY` before it will start any Google OAuth flow or accept the bootstrap POST.

Requirements:
- Generate at least 32 cryptographically random bytes (not a memorable phrase).
- Provision it as a Cloudflare Worker secret, never as a `[vars]` entry.
- Keep the same secret across all production instances/environments that share the same `auth_rate_limits` table.
- Do not reuse `BOOTSTRAP_TOKEN`, `GOOGLE_CLIENT_SECRET`, database credentials, or any other secret.
- Do not commit, log, paste into issues, or expose the value in build output.
- Rotate only with an explicit plan: changing it resets all HMAC-derived buckets and temporarily resets rate-limit history.

The code deliberately returns `503 AUTH_RATE_LIMIT_UNAVAILABLE` when the secret is absent/short, when Cloudflare's `CF-Connecting-IP` is absent/malformed, or when PostgreSQL cannot update the bucket. There is no fail-open path. This means a deployment must provision the secret before deploying this change, or Google sign-in/bootstrap will be unavailable. No secret has been provisioned or read by this PR.

## Current limits

| Endpoint | Bucket | Limit | Window |
|---|---|---:|---:|
| `GET /auth/google` | `oauth_start` | 20 | 10 minutes |
| `POST /auth/google` | `bootstrap_start` | 5 | 15 minutes |
| `GET /auth/google/callback` (valid OAuth state only) | `oauth_callback` | 60 | 10 minutes |

Each bucket is isolated by endpoint and client IP. The client IP comes only from Cloudflare's `CF-Connecting-IP` header; user-controlled `X-Forwarded-For` is not used. Confirm the Worker is reachable only through Cloudflare's edge before relying on this trust boundary.

## Storage and concurrency

- A versioned HMAC-SHA-256 digest of endpoint + client IP is stored in `auth_rate_limits.key_hash`; raw IP addresses are not stored.
- PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` increments/reset attempts atomically, avoiding read-then-write races across concurrent Workers; stored attempts saturate at limit+1 to prevent integer overflow.
- Requests over the limit receive `429 RATE_LIMITED` and a `Retry-After` header.
- Missing secret/IP and database failures return `503`, never silently allow the request.
- A Worker Cron trigger runs hourly and deletes buckets inactive for more than 48 hours. The schedule is declared in `apps/api/wrangler.toml`.

## Validation still required before production

1. CI must pass on the exact PR HEAD, including PostgreSQL integration tests for concurrent requests and 48-hour cleanup.
2. Provision the dedicated secret in the intended Cloudflare environment without exposing its value.
3. Verify the actual production Worker ingress and that Cloudflare overwrites `CF-Connecting-IP`; do not infer this from local tests.
4. Confirm the database runtime role has only the required DML privileges on `auth_rate_limits`, and verify the table/index exist in the intended database.
5. Deploy only through the normal reviewed release process after all dependent PRs are approved. This PR does not deploy, modify production, or provision secrets.

## Operational note

The fixed-window policy is intentionally conservative and IP-based. Corporate/mobile NAT may aggregate legitimate users behind one IP; review real, privacy-safe 429 metrics after launch before tuning thresholds. Do not add email/account identifiers to this table without a separate privacy and abuse-resistance review.
