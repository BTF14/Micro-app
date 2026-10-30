# API and Neon integration status

## Current boundary

The API is a Hono/Cloudflare Workers scaffold. It registers Google OAuth/bootstrap/callback and session routes plus `GET /health`; registration and password login remain fail-closed/disabled. Neon client and transaction helpers are available in `src/database.ts`. No commercial HTTP route currently uses the database helpers. Sales and inventory endpoints must remain unavailable until tenant-scoped authorization and transaction-level integration tests are in place.

Google sign-in uses OAuth state and PKCE, short-lived HttpOnly cookies, a one-time bootstrap path, allowlist/email-verification checks, random opaque session tokens stored only as SHA-256 hashes, revocable seven-day sessions, and exact configured Origin checks for state-changing routes. Legacy PBKDF2 helpers remain in the auth module, but password login and public registration are disabled fail-closed. Database-backed rate-limit controls exist for the auth paths; this does not establish rate limiting for future commercial endpoints. `DATABASE_URL` and `FRONTEND_ORIGIN` must be configured as server-side Worker variables/secrets. The frontend registration/login flow was connected to the auth API in commit `88d30d472905c81a90d9fffc967e3ba1df5084d1`; verify actual route behavior and UI error states before claiming the end-to-end flow is complete. Email verification, password recovery, MFA, administrative account recovery, and automated cleanup of expired sessions/rate-limit rows are not implemented; do not treat this as production-ready identity management.

The proposed initial schema now includes `organizations` and `organization_members`. Business records carry `organization_id`; composite foreign keys prevent products, sales, memberships and inventory movements from linking across organizations. BCV exchange-rate source data is shared globally, while each sale stores its own rate snapshot. A disposable PostgreSQL 18 GitHub Actions job validates migration syntax and key cross-tenant constraints. This does not replace API authorization: every query must still scope by the authenticated organization. See the [server-side tenant authorization contract](sdd/tenant-authorization-contract.md) for mandatory invariants and integration-test acceptance criteria.

## Driver choice

The API uses `@neondatabase/serverless` with a request-scoped `Client`. Neon documents that the HTTP `neon()` function is suitable for one-shot queries and fixed batches, while `Client` supports sessions and interactive transactions over WebSockets. Interactive transactions are necessary for operations such as creating a sale, recording payments, decrementing stock and writing the inventory ledger atomically.

Official references:
- [Neon serverless driver: sessions and transactions](https://github.com/neondatabase/serverless#sessions-transactions-and-node-postgres-compatibility)
- [Cloudflare Workers database integrations](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/)

Cloudflare's Hyperdrive is another supported option and is recommended by Cloudflare for pooled PostgreSQL access. It requires a separately configured Hyperdrive binding, so this implementation does not assume that one exists.

## Connection safety

- Supply `DATABASE_URL` only as a server-side Cloudflare Worker secret.
- Never put the URL in `wrangler.toml`, frontend code, committed environment files, logs or API responses.
- Create, connect, use and close a Neon `Client` within one request operation; do not retain it across Worker requests.
- `isDatabaseUrlConfigured` validates URL shape only. It does not prove the host is reachable, credentials work, permissions are correct or the schema is installed.
- The API health route remains a scaffold status endpoint and does not claim that Neon is connected.

## Transaction helper

`withDatabaseTransaction` issues `BEGIN`, runs the supplied operation, and issues `COMMIT`; it attempts `ROLLBACK` when the operation or commit fails. All queries in the operation must use the same client. Do not use this helper for parallel statements or use the HTTP-only query function for interactive transaction workflows.

The helper is not yet called by commercial endpoints. Before enabling it for sales/inventory, add integration tests on a separate Neon branch covering:
1. A successful sale with multiple items and mixed USD/VES payments using a rate snapshot.
2. Rollback when any payment, stock update or ledger insert fails.
3. Concurrent sales against limited stock.
4. Idempotency-key retries without duplicate sales or stock movements.
5. Schema version mismatch, missing credentials and database timeouts.

## Migration gate

`apps/api/migrations/0001_initial.sql` remains a versioned migration file only. It has not been applied to Neon primary `main`. Do not apply it there without explicit user authorization. Use a temporary or dedicated test branch to validate migrations and transaction behavior first.

## Remaining requirements before commercial API routes

- Real authentication and server-side role checks.
- Tenant/store scoping for every query.
- Database schema version and connectivity checks that do not expose secrets.
- Request validation, rate limiting where appropriate, idempotency semantics and safe error mapping.
- PostgreSQL integration tests, including atomic sale/inventory behavior.
- A deliberate deployment and secret-configuration review.


## Optimización de lecturas frente a transacciones

Para endpoints de consulta (por ejemplo, búsqueda de catálogo/precio), evaluar `neon()` HTTP de `@neondatabase/serverless` para una consulta o batch fijo, en lugar de abrir un `Client` WebSocket por petición. Mantener `Client` interactivo para ventas, pagos, inventario y otras operaciones que requieren atomicidad. El helper actual `withDatabaseClient` crea un `Client` por operación y no debe sustituirse globalmente sin benchmark ni pruebas. Ver [decisiones de arquitectura SaaS](SAAS_ARCHITECTURE_DECISIONS.md) §13.

No usar `ILIKE '%texto%'` asumiendo que el índice B-tree actual lo acelera; probar barcode/SKU exactos y búsqueda de prefijo con `EXPLAIN ANALYZE` sobre datos sintéticos. Añadir trigram/GIN u otros índices solo si se justifican por volumen/latencia medidos.


## Estado actual de identidad (main 2026-10-29)

Las decisiones D1–D8 de identidad están aprobadas y Google OAuth + allowlist se implementaron en PR #153; HTTPS/canonical origin para Google OAuth se reforzó en PR #155. Las rutas de registro y login por contraseña siguen deshabilitadas fail-closed. Esto no aprueba la matriz de permisos comerciales ni demuestra autorización por sucursal. La API sigue sin endpoints comerciales. Ver `docs/SAAS_ARCHITECTURE_DECISIONS.md`.
