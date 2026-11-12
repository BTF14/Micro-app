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
- No conclusion of complete isolation is made from these partial observations. Inspect all SQL and database-side functions before closing the audit.

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
