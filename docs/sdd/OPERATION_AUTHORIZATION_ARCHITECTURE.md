# Server-side operation authorization architecture

**Status:** technical proposal only; not an approved business permission policy and not implementation authorization.  
**Date:** 2026-10-30 UTC  
**Base:** `main` at `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c` when this proposal branch was created.  
**Related:** [tenant authorization contract](tenant-authorization-contract.md), [role/permission decision matrix](role-permission-decision-matrix.md), [branch scope implementation](BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md), [register shift model](REGISTER_SHIFT_MODEL.md), [organization commercial policies](ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md), [Constitution](../CONSTITUTION.md).

## 1. Purpose and non-goals

This document proposes the server-side shape for authorization when commercial API routes are eventually introduced. It separates four concerns that must not be conflated:

1. **Authentication:** identify a user from a valid server-side session.
2. **Tenant membership:** establish that the user is an active member of the selected organization.
3. **Resource scope:** establish the organization, branch, register, warehouse, or shift to which a request refers.
4. **Operation authorization:** decide whether that actor may perform this specific action on this specific resource under an explicitly approved policy.

The current `resolveTenantContext`, `resolveBranchContext`, and `resolveOpenCashierRegisterShift` helpers address parts of the first three concerns. They do **not** authorize business operations. There are currently no commercial HTTP handlers.

This proposal does not approve role permissions, introduce custom roles, choose business thresholds, authorize discounts/voids/refunds, define a supervisor override, create endpoints, add schema, or permit migrations. The role matrix remains **NOT APPROVED**. No implementation may infer missing decisions from examples in this document.

## 2. Current verified foundation

- `resolveTenantContext` derives user, organization, and role from the validated session and active database membership. The requested organization is a selector, not proof of access.
- `resolveBranchContext` rechecks active organization, user, membership, role, branch, and (for cashier/inventory) active branch assignment. Its documented owner/admin organization-wide branch resolution is an already-approved **scope-resolution** boundary only.
- `resolveOpenCashierRegisterShift` resolves the authenticated cashier's own open shift and uses `FOR SHARE OF s`. A future caller that depends on the shift remaining open must use the same transaction client through the business operation.
- These helpers are isolated and are not wired to commercial routes or middleware.
- `withDatabaseTransaction` exists, but no commercial route currently demonstrates transaction-level authorization or business atomicity.
- Main versions migrations 0001–0004. Migrations 0003/0004 have not been applied to Neon main; PostgreSQL 18 disposable CI is the current migration/integration test environment.

## 3. Proposed authorization boundary

A future API operation should call one explicit authorization boundary after parsing the request and establishing a trusted session identity. The boundary should receive server-derived context and a stable operation identifier, not a client-supplied role or permission.

Conceptual input:

- authenticated actor identity from the session;
- organization membership resolved from the database;
- resource scope resolved from server-validated organization/branch/register/shift context;
- a stable operation key (for example, a future `sales.create` or `inventory.adjust`);
- the target resource identifiers, treated only as untrusted selectors until ownership is checked;
- the transaction client used by the eventual operation.

Conceptual result:

- allow/deny;
- an internal reason code suitable for tests and security telemetry;
- the minimum trusted scope needed by the handler.

The result must never be constructed from request-body fields such as `userId`, `role`, `organizationId`, `branchId`, `registerId`, `shiftId`, `approvedBy`, or `isApproved`. Client values may identify the resource being requested, but the server must independently resolve and verify every relationship.

### 3.1 No implicit role-to-permission mapping

Do not write a production role switch or permission map until the owner has explicitly approved the corresponding matrix decisions. In particular:

- the role names `owner`, `admin`, `cashier`, and `inventory` do not by themselves grant an operation;
- organization-wide branch scope for owner/admin does not imply permission to perform every operation;
- an active branch assignment does not imply permission to adjust stock, receive purchases, refund sales, or access reports;
- an open cashier shift does not imply permission to discount, void, refund, or close another user's shift;
- an organization's configurable commercial policy does not grant the actor permission to configure or override that policy.

A missing, unknown, unapproved, inactive, or inconsistent rule must deny by default.

### 3.2 Separate capability from policy

Keep platform-supported capabilities separate from each organization's active commercial configuration. The authorization layer answers whether the actor may attempt an operation. A domain-policy layer answers whether the operation complies with the organization's current configured rules. Both must pass.

For example, a discount operation would require (a) approved actor permission, (b) an active and valid organization policy that permits the requested discount and any required approval, and (c) server-side recomputation and validation of the amounts. The platform must not introduce a universal percentage or monetary threshold. The exact no-policy fallback and approval semantics remain undecided and must be specified before a discount flow exists.

## 4. Transaction and time-of-check/time-of-use rules

For a state-changing operation, authorization and resource checks that can change concurrently must be evaluated in the same PostgreSQL transaction as the write:

1. Start one transaction using the request-scoped database client.
2. Revalidate the presented session in the transaction (token hash, not the raw token; not revoked; not expired), then revalidate active user, organization, membership, and the current role from database state.
3. Resolve and validate the requested branch and any register/warehouse/shift relationship from database state.
4. Evaluate the approved operation permission.
5. Lock or otherwise protect mutable authorization and domain state where required by the invariant (for example, membership/assignment rows against concurrent revocation, the open shift row, stock balance, or policy version). Define a consistent lock order and isolation strategy per operation to avoid TOCTOU gaps and deadlocks; a plain re-read without suitable locking/isolation is not sufficient when concurrent revocation must take effect before commit.
6. Validate resource ownership and all related records using tenant-scoped predicates and composite relationships.
7. Perform domain writes and append the corresponding audit event in the same transaction.
8. Commit only if every check and write succeeds; otherwise roll back all business and audit writes.

A preflight context may be useful for routing and user feedback, but it must not be the only authorization check for a mutation. It can become stale after a role, membership, assignment, branch, register, or shift is revoked/changed. Do not split a multi-statement business transaction across different database clients.

For read-only operations, derive scope from the authenticated server context and include tenant/branch predicates in the actual query. If the read spans multiple statements or needs a consistent snapshot, use an appropriate transaction.

## 5. Resource ownership and scope

Every resource lookup must be constrained by the trusted organization and, where applicable, branch/warehouse/register/shift. Never fetch a row globally by an ID and only later decide whether it belongs to the actor.

Required patterns:

- tenant-owned resource: query by both `organization_id` and resource ID;
- branch-owned resource: query by `organization_id`, `branch_id`, and resource ID;
- warehouse stock: additionally constrain the warehouse and product relationship;
- cashier transaction: additionally constrain the authenticated cashier and the active shift/register as required by the approved policy;
- related records: verify all foreign references belong to the same organization and compatible branch/scope.

Composite foreign keys remain an integrity control, not a replacement for authorization. A UUID is not an access-control mechanism. For externally visible errors, avoid revealing whether a foreign tenant's resource exists; use a consistent not-found/forbidden mapping selected by the API contract.

## 6. Auditing contract to design before implementation

The schema and semantics of audit records are not yet approved or implemented for commercial operations. Before the first commercial mutation, design an auditable event contract with at least:

- organization and applicable branch/register/shift identifiers;
- authenticated actor user ID and the role/membership state observed (do not assume a version column exists until the schema is designed);
- stable operation key and target resource type/ID;
- allow/deny outcome and a bounded internal reason code;
- request/correlation ID and idempotency key reference (never the raw session token);
- timestamp assigned by the server/database;
- before/after references or a minimal change summary appropriate to the domain;
- mandatory reason and approver identity for any approved exception.

Successful business mutations and their audit events should commit atomically. Ordinary application roles should not be able to rewrite or silently delete historical audit events. Denied-attempt telemetry must be designed separately so a failure to write an optional security event cannot accidentally turn a denied request into an allowed one. Do not log secrets, session tokens, payment credentials, or unnecessary personal data.

This document does not claim that an append-only audit store or these fields currently exist.

## 7. Stable operation catalogue

Before coding, enumerate operation identifiers at the level of individual actions rather than broad module names. The following are examples of catalogue entries to assess, not permissions:

- catalog: read, create, update, archive, change sale price, change cost;
- suppliers/purchases: read supplier, manage supplier, create purchase, receive purchase;
- inventory: read availability, read movement history, adjust, transfer, reconcile;
- register: open shift, close own shift, close another shift, inspect cash totals;
- sales: create, apply configured discount, change price, cancel, refund, inspect;
- payments: record, inspect own, inspect other operators, reverse;
- organization: invite, deactivate, revoke sessions, assign role, manage branches;
- policy: draft, activate, retire, approve exception;
- reporting: view operational report, view financial report, export each report class;
- audit: read audit events, export audit events.

Do not collapse read and write, own-resource and other-user resource, or ordinary and exceptional actions into a single permission. The final catalogue must be reconciled with the owner-approved matrix and actual product requirements.

## 8. Required negative and concurrency test matrix

Use PostgreSQL 18 disposable integration databases with synthetic organizations, users, branches, registers, shifts, and domain records. Tests must exercise the real API handler and database authorization path once handlers exist; helper-only tests do not prove route security.

At minimum, test:

- no session; invalid, expired, revoked session; inactive user; inactive organization; inactive membership;
- role changed or membership revoked between initial context resolution and transaction authorization;
- missing/inactive branch assignment; inactive branch/register; wrong branch/register/shift;
- resource ID from another tenant, another branch, another cashier, or another shift;
- every denied role-operation pair in the approved matrix;
- unknown operation key and missing/unapproved policy rule;
- forged client fields for actor, role, tenant, branch, register, shift, approver, or policy version;
- concurrent role/membership/assignment revocation against a mutation;
- concurrent shift close against a cashier operation;
- concurrent policy activation/change against a sale;
- failure after each write stage, proving complete rollback including audit and ledger records;
- idempotency-key replay with same payload and with a different payload;
- no data leakage in status codes, messages, logs, or timing-sensitive resource existence paths.

Each denial test must assert that no business side effect occurred. Concurrency tests must verify the invariant, not merely that both requests returned a response.

## 9. Implementation sequence and gates

1. Owner reviews and explicitly approves/corrects the role-permission decision matrix, including sensitive exceptions and delegation. Until then, no role-to-operation mapping is implemented.
2. Finalize the operation catalogue and resource-scope table against the approved matrix.
3. Design the audit event schema and retention/immutability model.
4. Design the transaction protocol for each domain operation, including idempotency and lock ordering.
5. Add a small authorization module with explicit operation identifiers and deny-by-default behavior, but only after step 1. Avoid adopting a policy engine or dynamic custom permissions without a demonstrated need.
6. Add PostgreSQL integration tests for the real authorization boundary and routes before exposing them.
7. Implement one narrow vertical slice at a time; do not expose sales, payments, inventory, or cash operations until its policy, ledger, transaction, and tests are complete.
8. Reassess production deployment and Neon migration gates separately; no schema or infrastructure changes are authorized by this proposal.

## 10. Decisions requiring owner input

The following are deliberately unresolved and must not be filled by implementation assumptions:

- final role/operation allow-deny matrix and scope exceptions;
- whether only the four fixed roles remain or a later custom-role model is needed;
- who may manage user lifecycle, role assignment, and branch assignments;
- exact delegation and multi-branch behavior;
- whether any cashier void/refund/discount exception exists and its approval flow;
- who may configure and activate organization commercial policies;
- no-active-policy behavior for discounts and other configurable rules;
- audit visibility, retention, export, and any immutable-storage requirements;
- resource-not-found versus forbidden response semantics where existence could leak;
- session revocation guarantees and the concurrency boundary for in-flight operations.

The owner should approve business outcomes, not low-level implementation details. Once those outcomes are approved, the technical design can be completed and implemented without repeatedly asking for routine engineering choices.

## 11. Explicit non-claims

This proposal does not mean:

- commercial authorization is implemented;
- any business role has newly approved permissions;
- branch or shift helpers are connected to routes;
- sales, inventory, payments, refunds, or cash endpoints exist;
- the audit schema or ledger is ready;
- migrations 0003/0004 are deployed to Neon main;
- production has been functionally certified.

The application remains not ready for commercial operation until the relevant gates and end-to-end evidence are complete.
