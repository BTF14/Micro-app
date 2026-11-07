# ODD task: scheduled authentication metadata retention

- Status: implementation and disposable PostgreSQL verification in progress; production activation blocked on Neon schema/runtime reconciliation
- PR: #251
- Branch: `fix/auth-retention-cleanup-20261107`
- Risk: high (authentication metadata and database privileges)
- Started: 2026-11-07

## Objective

Retain only the minimum authentication metadata needed for active requests and short-lived OAuth handoffs. Remove rate-limit buckets and bootstrap handoffs only after their 48-hour retention window, using the canonical rate limiter and the existing least-privilege runtime role.

## Scope

- Reuse `consumeAuthRateLimit` and the existing `microapp_runtime` role; do not restore #214's duplicate limiter or HMAC secret.
- Run hourly from the Worker Cron only when `APP_ENV === "production"`.
- Return immediately in preview without opening a database connection.
- Delete no more than 500 rows from each table per invocation, ordered oldest first, using `FOR UPDATE SKIP LOCKED` to avoid competing Cron invocations locking the same rows.
- Use the existing migration 0012 DELETE grants; do not add broader permissions or a new secret.
- Verify with disposable PostgreSQL as both the admin test login and the actual `microapp_runtime` login.

## Acceptance criteria

- [x] Only rows older than 48 hours are eligible for deletion.
- [x] The production scheduled handler invokes cleanup.
- [x] Preview scheduled handler is a no-op and does not require DATABASE_URL.
- [x] Runtime DELETE privileges are explicitly asserted by migration 0012.
- [ ] Each table is capped at 500 deletions per invocation and subsequent hourly runs drain backlog.
- [ ] Exact-HEAD CI succeeds for unit, PostgreSQL admin/runtime integration, migration runner, backup restore, security and E2E workflows.
- [ ] Independent review completed.
- [ ] Neon schema, dedicated runtime role and grants reconciled under the separate rehearsal/production gates before enabling production Cron.

## Safety

- No Neon production reads or writes are part of this PR.
- No secrets, Cloudflare dashboard settings, production Worker deployment, DNS, billing or real business data are changed.
- Do not merge or activate the Cron until the live Neon schema contains `auth_bootstrap_attempts` and the deployed Worker database identity is proven to be the least-privilege runtime login.
