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

## Required scenarios

- Tenant A session requests Tenant B sales/orders/inventory by changing organization ID or resource ID: 401/403/404, with no foreign row data and no mutation.
- Tenant A cannot use an identifier from Tenant B in checkout, inventory read, sales lookup/void or other exposed commercial operations.
- Cashier assigned to Branch 1 cannot read/operate a Branch 2 open shift, register, warehouse or inventory balance.
- Explicit organization-wide owner/admin behavior remains limited to the same organization and does not accidentally broaden cashier/inventory access.
- Invalid, revoked, expired, inactive-user, inactive-membership and inactive-organization sessions fail closed; invalid session cookies are cleared where appropriate.
- Responses carrying user/tenant data are not shared-cacheable; verify `private, no-store` or stricter on all authenticated commercial/session responses.
- Two concurrent requests with different tenant contexts cannot reuse mutable module/global state or leak tenant/branch context.

## Acceptance criteria

- [ ] AC-1 Route inventory documents all actual exposed commercial endpoints; distinguish missing endpoints from implemented modules.
- [ ] AC-2 Every tenant-scoped read and write is constrained by server-derived organization ID, not only request input.
- [ ] AC-3 Every branch-scoped operation verifies active branch scope and uses server-derived branch ID in all SQL writes/reads.
- [ ] AC-4 Joins include tenant keys where IDs are not globally unique; no cross-tenant join path.
- [ ] AC-5 Cashier Branch 1 cannot access or mutate Branch 2 shift/cash/register records absent explicit approved scope.
- [ ] AC-6 Invalid/expired/revoked sessions fail closed and cookie clearing/cache behavior is covered.
- [ ] AC-7 Tenant/branch context is request-local; no shared mutable cache or state across requests.
- [ ] AC-8 Synthetic tests run with zero external DB dependencies; PostgreSQL integration tests use disposable CI DB only.
- [ ] AC-9 Existing permission matrix is unchanged; no new commercial endpoint/permission is introduced.
- [ ] AC-10 Exact-HEAD CI, security review and diff review pass. Issue #53 remains OPEN/P0 until all production gates, including live evidence, are completed.

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
- `auth.integration.test.ts` already verifies expired and revoked sessions are rejected at `/auth/me`; the route clears the invalid cookie. However, protected commercial endpoints previously returned 401 without clearing a malformed/stale cookie. Turno 17 now exports the canonical cookie-clearing helper and applies it to protected catalog, inventory, checkout, branch and register-shift routes; a no-external-DB unit test covers malformed-cookie rejection and `private, no-store`.
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
