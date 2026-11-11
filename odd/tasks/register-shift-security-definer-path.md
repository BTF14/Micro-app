# ODD task: tighten SECURITY DEFINER search_path for register-shift operations

- Status: in progress
- Issue / PR: #287
- Owner / reviewer: repository owner; independent review via CI assertions
- Started: 2026-11-11
- Risk: high

## Objective and authorization

- Desired outcome: reduce the trusted search path of the two migration-0023 SECURITY DEFINER functions to pg_catalog only.
- Authorization boundary: integration branch only; no production deployment, remote database mutation, role/grant changes or secret access.
- Relevant original request: audit SECURITY DEFINER, ownership, grants and real caller authorization before production.

## Scope and exclusions

Included:
- Set search_path to pg_catalog only for open_register_shift and close_register_shift.
- Update PostgreSQL assertions to require the exact pinned search_path.
- Confirm every application object reference in both function bodies is schema-qualified.
- Validate through the existing disposable PostgreSQL 18 migration-check workflow.

Excluded:
- Changing function behavior, signatures, authorization rules, ownership, grants, API callers or audit payloads.
- Neon/main, production, Worker deployment, secrets, remote roles/grants or real data.

## Acceptance criteria

- [ ] AC-1 — Both SECURITY DEFINER function bodies use only schema-qualified application objects and pg_catalog built-ins.
- [ ] AC-2 — Both functions pin search_path to pg_catalog only.
- [ ] AC-3 — Assertions verify owner, SECURITY DEFINER, exact search_path, runtime-only EXECUTE, no PUBLIC EXECUTE and no direct runtime table writes.
- [ ] AC-4 — PostgreSQL 18 migration-check passes on the exact final SHA.

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

Both functions already schema-qualify all application relations under public and call JSON/clock built-ins through pg_catalog. Keeping public in search_path is unnecessary. Pinning to pg_catalog reduces the SECURITY DEFINER trust surface without changing function semantics.

## Closure and handoff

- Final commit SHA: pending
- PR: #287
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: production runtime role provisioning and live API operation
- Residual risks: full CI and restore gates remain independently required
- Next step: apply the two-file change and run exact-HEAD migration validation
