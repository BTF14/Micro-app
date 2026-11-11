# ODD task: align cashier inventory movement reads with approved role matrix

- Status: in progress
- Issue: #53 (security / P0 umbrella); subtask priority: P1
- PR: #287
- Started: 2026-11-11
- Risk: medium

## Objective and authorization

Implement the already-approved permission for Cashier to read stock and movement history within assigned branches, without granting inventory-management permissions.

Source of truth: `docs/sdd/role-permission-decision-matrix.md`, section 1, which explicitly allows all four organization roles to read stock and movements at their approved scope. The implementation must keep cost data hidden from Cashier.

Authorization boundary: code, tests and documentation changes on the existing integration branch only. No migration, production, Neon, real data, secret, remote role/grant, deployment, DNS, billing, destructive Git or PR merge actions.

## Evidence / root cause

- `apps/api/src/inventory-read.ts` balance GET uses `inventory.read`, which allows Cashier.
- The movement-history GET incorrectly uses `inventory.management.read`, which deliberately excludes Cashier.
- `apps/api/src/authorization.test.ts` confirms Cashier is allowed `inventory.read` but denied `inventory.management.read`.
- `apps/api/src/inventory-read.integration.test.ts` currently asserts Cashier receives HTTP 403 from the movement-history endpoint.
- The approved matrix says Cashier can read stock and movements within assigned branches, but cannot receive, adjust, transfer, or administer inventory.

## Scope

Included:
- Use the existing `inventory.read` permission for movement-history reads; do not introduce a new permission name.
- Keep `inventory.management.read` on warehouse and count-management endpoints.
- Add integration coverage for Cashier movement reads, cost redaction, branch membership and tenant isolation.
- Assert Cashier remains denied warehouse/count management reads.
- Preserve transaction, tenant/branch locks, warehouse scope, pagination and cursor behavior.

Excluded:
- No new commercial policy, roles, branch-role model, schema/migration, write endpoint or UI.
- Do not grant Cashier `inventory.management.read`, `inventory.receive`, `inventory.adjust` or `inventory.transfer`.
- Do not expose `unit_cost_usd` or product cost to Cashier.
- Do not weaken cross-tenant/branch tests or change the approved matrix.

## Acceptance criteria

- [ ] AC-1 — Movement history authorizes with the existing `inventory.read` operation.
- [ ] AC-2 — Cashier can read movements only in a branch with active membership.
- [ ] AC-3 — Cashier responses omit `unit_cost_usd`; Owner/Admin/Inventory cost visibility remains unchanged.
- [ ] AC-4 — Cashier remains denied warehouse/count management reads and all inventory write operations.
- [ ] AC-5 — Cross-tenant and unassigned-branch requests remain denied.
- [ ] AC-6 — Unit, PostgreSQL integration, CI, ODD and security checks pass on the final exact HEAD.

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Confirm approved policy and current mismatch | Exact mismatch identified | Role matrix section 1; route and integration test show movement 403 for Cashier | completed |
| Change route authorization | Reuse `inventory.read` | `apps/api/src/inventory-read.ts` | pending |
| Add regression tests | Positive cashier read + cost redaction; negative management and cross-scope checks | `authorization.test.ts`, `inventory-read.integration.test.ts` | pending |
| Run full exact-HEAD validation | No regression or bypass | GitHub PR workflows and check-runs | pending |
| Update continuity and issue evidence | Keep #53 accurate and open | CURRENT_STATE, WORK_CHECKPOINT, HANDOFF, STATE_JOURNAL | pending |

## Risks and guardrails

| Risk | Severity | Mitigation |
|---|---|---|
| Granting management access to Cashier accidentally | High | Keep separate `inventory.management.read`; add negative route and unit tests |
| Exposing movement cost to Cashier | High | Preserve conditional SQL projection and assert response omission |
| Cross-branch/tenant data exposure | Critical | Keep `authorizeBranchOperation`, active membership locks and add explicit negative integration cases |
| Scope drift into inventory writers | Medium | Read-only route only; no migrations or write operations |

## Closure

- Implementation SHA: pending
- Exact-HEAD CI: pending
- Acceptance criteria: pending
- Residual risks: pending
- Next step: implement the minimal permission correction and run exact-HEAD validation.

