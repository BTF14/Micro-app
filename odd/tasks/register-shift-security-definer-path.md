# ODD task: tighten SECURITY DEFINER search_path for register-shift operations

- Status: completed (audit decision; no source change)
- Issue / PR: #287
- Owner / reviewer: repository owner; independent review via CI assertions
- Started: 2026-11-11
- Risk: high

## Objective and authorization

- Desired outcome: determine whether the migration-0023 SECURITY DEFINER search_path can safely be narrowed without breaking trigger execution.
- Authorization boundary: integration branch only; no production deployment, remote database mutation, role/grant changes or secret access.
- Relevant original request: audit SECURITY DEFINER, ownership, grants and real caller authorization before production.

## Scope and exclusions

Included:
- Inspect both SECURITY DEFINER function bodies and all triggers they invoke.
- Determine whether the public schema is required by nested trigger functions.
- Preserve the current path unless all nested trigger dependencies are qualified and pinned independently.
- Validate the existing owner, search_path and schema ACL contract through PostgreSQL 18 migration-check.

Excluded:
- Changing function behavior, signatures, authorization rules, ownership, grants, API callers or audit payloads.
- Neon/main, production, Worker deployment, secrets, remote roles/grants or real data.

## Acceptance criteria

- [x] AC-1 — The open/close functions use schema-qualified public objects, but the nested 0004/0007 trigger functions contain unqualified public table references.
- [x] AC-2 — Narrowing the outer SECURITY DEFINER path to pg_catalog only would break those nested trigger references; retain pg_catalog, public with pg_catalog first.
- [x] AC-3 — Runtime and PUBLIC cannot CREATE in public by the 0023 assertion; producer cannot CREATE by the 0022 role assertion. The migration principal is the trusted DDL role.
- [x] AC-4 — PostgreSQL 18 migration-check passed on the evaluated code SHA; no function behavior, owner or grant changed.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Unqualified object reference after removing public from search_path | High | Inspect full function bodies; schema-qualify every public object; run migration-check |
| Function contract regression | Medium | Preserve signatures, body behavior, ownership and grants; run existing migration assertions |
| Accidental production change | Critical | Integration branch only; no remote DB access or deployment |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect both function bodies | No unqualified application relation/function dependencies | Migration source review | completed |
| Pin both functions to pg_catalog | Remove public from SECURITY DEFINER search_path | Exact migration diff | in progress |
| Tighten assertions | Exact pg_catalog-only path required | PostgreSQL 18 migration-check | pending |

## Technical decisions

The outer open/close functions schema-qualify their direct relations, but they INSERT/UPDATE tables whose 0004/0007 triggers contain unqualified references to organizations, branches, registers, memberships, users and register_shifts. Those nested trigger functions inherit the caller's search_path. Removing public from the SECURITY DEFINER path would break these operations. Keep pg_catalog first and public second; the disposable migration contract denies CREATE on public to PUBLIC/runtime/producer and reserves DDL to the trusted migrator. A future narrowing requires refactoring every nested trigger to schema-qualified references and its own pinned search_path.

## Closure and handoff

- Final evaluated code SHA: `53894254c26838dd56f5a39764fedf4cf1d64067`
- PR: #287 OPEN/Draft
- Checks and exact outcomes: migration validation run `43047173060` SUCCESS; subsequent docs-only HEAD migration validation `43048113718` SUCCESS. Existing 0023 assertions passed.
- Acceptance criteria met / unmet: all met as an audit decision; no source change was warranted.
- Limitations not verified: production schema ACLs and live runtime role provisioning; no remote database was accessed.
- Residual risks: full CI and restore gates remain independently required.
- Next step: only narrow the path if 0004/0007 trigger functions are refactored and separately validated.
