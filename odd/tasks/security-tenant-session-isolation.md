# ODD task: Issue #53 — tenant, branch and session isolation (Turno 17)

- Status: approved for static audit and synthetic tests
- Branch: `security/issue-53-tenant-session-isolation-20261112`
- Base: `main` at `fc1a599a4d78350d3af2f239390459e168e3ff14` (PR #319 squash merge)
- Risk: critical
- Budget: USD 0
- Production: **NOT READY**
- Neon `main`: no connections, DDL, DML, grants, secrets or real data.

## Objective

Audit and prove tenant and branch isolation for commercial API paths and session context. Authentication is not authorization. A user authenticated in Tenant A must not read or mutate Tenant B data; a cashier assigned to Branch 1 must not operate Branch 2 cash shifts unless a separately approved explicit multi-branch permission exists.

## Scope

1. Static review of `apps/api/src/auth.ts`, `google-auth.ts`, `tenant-context.ts`, `branch-context.ts`, `authorization.ts`, and API modules for checkout/sales, inventory, register shifts/cash shifts.
2. Trace every exposed route to its authorization call and every SQL statement to its tenant and branch predicates, including joins, inserts, updates, idempotency lookups and database-side functions/triggers.
3. Review `auth_sessions` lifecycle: opaque token hashing, expiration, revocation, cookie clearing on invalid/expired session, cache headers, tenant selection derived from active membership, no cross-request/global tenant cache.
4. Add synthetic tests in `apps/api/src/tenant-isolation.test.ts`; tests must not connect to external databases. Use deterministic fake DB/client responses to assert deny behavior and scope predicates; where real PostgreSQL behavior is required, use the repository's disposable CI database only.
5. Preserve current role policy; do not invent multi-branch privileges or add commercial capabilities.

## Route inventory at audited HEAD

| Domain | Exposed HTTP routes | Server authorization / scope |
|---|---|---|
| Catalog | GET `/api/orgs/:organizationId/catalog`; POST/PATCH `/api/orgs/:organizationId/catalog[/:productId]` | `authorizeTenantOperation`; every catalog SQL query is organization-scoped |
| Branch discovery | GET `/api/orgs/:organizationId/branches` | `authorizeTenantOperation`; organization + active branch membership filter |
| Inventory | GET warehouse inventory, movements, warehouses, counts; POST count creation and confirmation | `authorizeBranchOperation`; organization + branch + warehouse; count/line SQL and ledger writes retain tenant keys |
| Sales | POST `/api/orgs/:organizationId/branches/:branchId/checkout` | `authorizeBranchOperation`; products, sales, balances, movements, payments and audit writes use server-derived scope |
| Cash/register shifts | GET current shift, branch discovery and registers; POST open and close | Tenant/branch authorization; active branch assignment; SQL functions bind organization + branch + user |

There are no separate sales-order GET/void HTTP endpoints at this HEAD. Do not infer or test routes that are not exposed. The cash-shift domain is implemented in `register-shifts.ts`, not a `cash_shifts.ts` file.

## Required scenarios

- Tenant A session requests Tenant B sales/orders/inventory by changing organization ID or resource ID: 401/403/404, with no foreign row data and no mutation.
- Tenant A cannot use an identifier from Tenant B in checkout, inventory read, sales lookup/void or other exposed commercial operations.
- Cashier assigned to Branch 1 cannot read/operate a Branch 2 open shift, register, warehouse or inventory balance.
- Explicit organization-wide owner/admin behavior remains limited to the same organization and does not accidentally broaden cashier/inventory access.
- Invalid, revoked, expired, inactive-user, inactive-membership and inactive-organization sessions fail closed; invalid session cookies are cleared where appropriate.
- Responses carrying user/tenant data are not shared-cacheable; verify `private, no-store` or stricter on all authenticated commercial/session responses.
- Two concurrent requests with different tenant contexts cannot reuse mutable module/global state or leak tenant/branch context.

## Acceptance criteria

- [x] AC-1 Route inventory documents all actual exposed commercial endpoints; distinguishes missing sales-order endpoints from implemented checkout.
- [x] AC-2 Static review confirms tenant-scoped reads/writes use server-derived organization ID.
- [x] AC-3 Static review confirms branch scope and server-derived branch ID in reviewed branch operations.
- [x] AC-4 Reviewed joins retain organization keys for tenant-owned relations; composite foreign keys reinforce tenant/branch identity.
- [x] AC-5 Authorization helper and existing disposable PostgreSQL branch/shift tests deny unassigned branch operations; no multi-branch permission added.
- [x] AC-6 Expired/revoked sessions are covered by auth integration tests; malformed cookie clearing and no-store are covered by new unit tests.
- [x] AC-7 Database client is request-scoped; new concurrent tenant-context test verifies independent clients.
- [x] AC-8 New synthetic suite uses fake clients; CI PostgreSQL integration runs on disposable PostgreSQL 18.
- [x] AC-9 Permission matrix and commercial endpoint set unchanged.
- [ ] AC-10 Final exact-HEAD CI and independent review complete. Manual diff/security review performed; formal review and final docs-only HEAD verification remain pending.

## Initial static findings — 2026-11-12

- `auth.ts` validates `auth_sessions.revoked_at IS NULL`, `expires_at > now()`, and active user on session lookup. `/auth/me` clears the cookie when session/user/active membership resolution returns no result. Auth middleware sets `Cache-Control: no-store` for `/auth/*`.
- `resolveTenantContext` hashes the opaque session token and resolves active session + active organization membership + active organization using the requested organization selector. The selector is not itself trusted authorization.
- `authorizeBranchOperation` resolves tenant membership and role, checks the existing operation matrix, then resolves branch scope. Cashier/inventory require active `branch_memberships`; owner/admin have organization-wide branch scope.
- `inventory-read.ts` uses `authorizeBranchOperation`, and observed product/balance/movement queries include organization and branch/warehouse predicates.
- `sales-checkout.ts` uses `authorizeBranchOperation`; observed sales/product/inventory writes are parameterized with server-derived organization and branch IDs. Full route/SQL/call graph review remains required.
- `register-shifts.ts` contains register/cash-shift routes (the repository does not have a `cash_shifts.ts` module); route-by-route branch assignment and SQL scope audit remains required.
- `database.ts` explicitly creates and closes a separate database client per operation; no shared connection or mutable tenant context is cached at module scope.
- The repository uses parameterized raw SQL with `@neondatabase/serverless`; GitHub code search found no Drizzle ORM imports, no `ENABLE ROW LEVEL SECURITY`, and no `CREATE POLICY`. Tenant isolation is therefore enforced by server-side authorization/scoped SQL, composite tenant/branch foreign keys, row-lock helpers and database triggers/functions — not by PostgreSQL RLS. This is a defense-in-depth limitation that must remain explicit.
- Existing disposable-PostgreSQL integration suites already cover cross-tenant inventory reads, cross-branch warehouse denial, cross-tenant count creation/confirmation without writes, and checkout rejection for a foreign-tenant product / foreign-branch warehouse. Existing register-shift API tests cover unauthorized branch operations and closing another cashier's shift.
- `auth.integration.test.ts` already verifies expired and revoked sessions are rejected at `/auth/me`; the route clears the invalid cookie. However, protected commercial endpoints previously returned 401 without clearing a missing/oversized cookie. Turno 17 now exports the canonical cookie-clearing helper and applies it to early token-shape rejection in protected catalog, inventory, checkout, branch and register-shift routes; a no-external-DB unit test covers malformed-cookie rejection and `private, no-store`. Authorization failures that conflate an invalid session with a valid session selecting an out-of-scope tenant do **not** clear the cookie, avoiding logout of a valid multi-tenant session. Expired/revoked server sessions are rejected and cleared by `/auth/me`.
- The scheduled retention worker deletes old `auth_rate_limits` and `auth_bootstrap_attempts`, but not expired `auth_sessions`. Expiration is enforced at lookup; physical session-row retention is a separate hygiene/retention decision, not an authorization bypass.
- There is no separate sales read/void HTTP module at this HEAD. The exposed sales mutation route is checkout; do not claim that nonexistent sales-order endpoints were tested. Cash-shift routes live in `register-shifts.ts`.
- Full SQL review confirms inventory balance/movement/count paths bind server-derived organization and branch identifiers; checkout binds server-derived organization/branch and scopes products, sales, balance changes, movements and payments; shift reads/writes scope organization + branch + user and delegate open/close to narrowly granted SQL functions.
- The register-shift opening trigger's eligible role list was corrected by migration 0007 to owner/admin/cashier; the earlier 0004 cashier-only definition is superseded, not a current mismatch.
- No conclusion of complete isolation is made solely from source inspection. RLS absence remains an explicit architectural limitation; the test suite and disposable PostgreSQL CI evidence are required before considering this work complete.

## Risks / review gates

| Risk | Severity | Required evidence |
|---|---|---|
| Request organization/branch ID trusted without session membership | Critical | cross-tenant/branch denial tests |
| An update/delete uses a foreign resource ID without organization predicate | Critical | complete SQL write-path review and tests |
| A join omits tenant key | High | join-by-join inspection and synthetic collision test |
| Cash shift branch is inferred from cashier's active shift but not revalidated | Critical | SQL + trigger/function review and cross-branch test |
| Session context cached globally or response shared by cache | High | source audit and no-store/concurrency tests |
| Cookie not cleared for invalid/expired session | Medium | route tests |
| Synthetic mocks mistaken for real DB proof | High | label unit vs disposable PostgreSQL evidence |

## Implementation / evidence log

- Branch created from verified post-#319 `main`: `fc1a599a4d78350d3af2f239390459e168e3ff14`.
- ODD task created before source-code changes.
- Static review and tests: in progress.
- External database / Neon: not accessed.
- Production: **NOT READY**.


## Implementation update — Turno 17

- Added `apps/api/src/tenant-isolation.test.ts` with synthetic authorization tests:
  - Tenant A cannot select Tenant B for inventory read or checkout mutation; the helper returns before any business SQL.
  - A cashier assigned to Branch 1 cannot resolve Branch 2 inventory or close a Branch 2 shift; the branch lock rejects before business SQL.
  - Concurrent requests use distinct DB clients and retain their own tenant/user contexts.
  - The unlocked tenant resolver SQL includes active session, revocation, expiry, active user/membership/organization and requested organization predicates.
  - Malformed session cookie is cleared on protected inventory and register-shift responses; authenticated responses remain private/no-store.
- Exported the canonical `clearSessionCookie` helper and applied it to invalid/missing-session denials in catalog, inventory reads/counts, checkout, branch discovery and register-shift routes. This does not change authorization policy or grant new permissions.
- Existing integration suites remain the authoritative HTTP/PostgreSQL cross-tenant coverage. The new test file is an additional unit-level guard, not a substitute for the PostgreSQL 18 integration tests.
- CI exact-HEAD: pending.
- No Neon connection, remote DDL/DML, secrets access, Cloudflare manual operation or paid service used.


## Exact-HEAD evidence — code HEAD before final continuity reconciliation

- Code HEAD `9714b5848532d55593e552e40ffb3dfcbb873410`.
- GitHub check-runs: 15/15 SUCCESS.
- CI workflow run `43183806227`: SUCCESS. It executed root `pnpm test` (including the new API unit suite), typecheck/build, PostgreSQL 18 disposable migrations and all configured API integration suites.
- Playwright E2E `43183806360`: SUCCESS.
- ODD docs validation `43183806292`: SUCCESS.
- Semgrep `43183806337`: SUCCESS.
- Database migration validation `43183806298`: SUCCESS.
- Security scan `43183806464`: SUCCESS.
- Secret history scan `43183806156`: SUCCESS.
- Dependency review `43183806208`: SUCCESS.
- Project progress dashboard `43183806096`: SUCCESS.
- Cloudflare Pages check: SUCCESS (PR preview/build check only, not production certification).
- PostgreSQL migration runner check-run: SUCCESS. A duplicate PR workflow-run record remained pending without jobs; the same exact-SHA check context completed successfully via run `43183798677` (push event).
- Formal GitHub reviews: 0; inline review threads: 0 at the last review census.
- No Neon, secret, production-data, manual Cloudflare or billing operation.
