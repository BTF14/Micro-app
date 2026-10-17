# API and Neon integration prerequisites

## Current state

- The API runs on Hono for Cloudflare Workers.
- `apps/api/src/config.ts` validates the shape of a PostgreSQL connection URL without opening a connection or returning/logging credentials.
- The validator is deliberately not wired to a route: configuration validity is not proof that Neon is reachable or that a schema is installed.
- No database connection is opened by tests, and no data is written to Neon.
- The initial migration remains versioned in `apps/api/migrations/0001_initial.sql` and has not been applied to the primary `main` branch.

## Runtime configuration

When database integration is implemented, configure `DATABASE_URL` as a Cloudflare Worker secret in the target environment. Never commit it to Git, place it in `wrangler.toml`, expose it to the frontend, or print it in logs. Use the dedicated Micro app Neon project only.

The validator accepts `postgres:` or `postgresql:` URLs with a hostname, username, password, and no URL fragment. It does not verify credentials, TLS negotiation, database availability, permissions, or schema compatibility.

## Integration gate

Before enabling database-backed routes:

1. Choose and document a Neon serverless driver approach compatible with Cloudflare Workers and the transaction semantics required by sales and inventory.
2. Add a separate, isolated Neon branch for integration tests; do not test against the primary branch.
3. Implement a server-only database adapter that reads `DATABASE_URL` from Worker bindings and never exposes it to responses or logs.
4. Test connectivity and schema version against the isolated branch, including failure paths and timeouts.
5. Test sale creation, payment recording, stock updates, and inventory movement ledger writes within a single transaction, including idempotent retries and rollback cases.
6. Add authenticated session handling and role checks before exposing any commercial data or mutation endpoints.
7. Review the migration and integration results. Applying a migration to Neon primary requires separate, explicit authorization.

## Security boundary

The public `/health` endpoint is only a process-level health check. Do not make it reveal connection strings, database errors, user data, or secret configuration. Until authentication and transaction tests exist, do not expose catalog, inventory, sales, payments, user, or audit-log endpoints.
