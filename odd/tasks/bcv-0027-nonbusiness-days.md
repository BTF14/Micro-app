# ODD task: BCV non-business-day effective date — migration 0027

- Status: in progress
- Issue / PR: implementation workstream; Draft PR
- Owner / reviewer: repository owner
- Started: 2026-11-18
- Risk: critical

## Objective and authorization

Implement the approved BCV non-banking-day selection contract as an additive migration 0027 and coordinated API, UI, runner, CI, PostgreSQL 18 ephemeral tests, and ODD evidence. The owner explicitly authorized Paso 3B on 2026-11-18.

## Scope and exclusions

Included:
- Migration 0027 and its independent assertions, preserving migrations 0022 and 0026.
- API selection and immutable sale snapshots preserving operation_date and rate effective_date.
- BCV/FX contingency panels and latest-rate/checkout behavior.
- bcv-0027 migration/fixture/runner profile and CI workflow coverage.
- PostgreSQL 18 ephemeral test matrix and documentation/handoff.

Excluded:
- Neon main, remote DDL/DML, real data, secrets, production deployments, manual Cloudflare changes, billing.
- Enabling FX contingency, closing AC-6, changing freeze v1.1 or Issue #53.
- New dependencies, rewriting historical migrations, widening producer/runtime grants, merge or auto-merge.

## Acceptance criteria

- [ ] Exact branch base is a852bbd68ccb9509feccb6fc78248181e07c2b29.
- [ ] Priority 1: today's valid official row wins over any prepublished future row.
- [ ] Priority 2: on Caracas Saturday/Sunday, smallest valid official effective_date in (today,today+5] requires healthy sync and last_effective_date coverage.
- [ ] Priority 3: Monday-Friday without today's row uses the same future window only with a successful same-Caracas-day sync.
- [ ] Every other case fails closed with 409 BCV_RATE_NOT_CURRENT.
- [ ] operation_date and exchange_rate_effective_date remain distinct immutable sale facts.
- [ ] SQL guard independently enforces the API contract and serializes checkout against producer state transitions.
- [ ] No grants are broadened; 0022 and 0026 invariants remain intact.
- [ ] PostgreSQL 18 ephemeral tests cover date boundaries, stale/failed/running sync, invalid/ambiguous rows, concurrency and direct SQL writes.
- [ ] API, UI, runner, migration validation, CI and ODD docs are updated coherently.
- [ ] Full diff reviewed; latest HEAD has 100% successful required GitHub Actions checks.
- [ ] PR remains Draft; no merge, auto-merge, production deployment or Neon main mutation.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Incorrect FX date selection | Critical | Shared contract, API + independent SQL guard, date matrix |
| Sync/checkout race | Critical | Existing singleton lock; PostgreSQL concurrency tests |
| Historical sale mutation | Critical | Immutable snapshot columns/trigger invariants |
| Privilege escalation | Critical | Preserve 0022/0026 ACLs; explicit negative LOGIN probes |
| Production data exposure | Critical | PostgreSQL 18 disposable only; no Neon main |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect canonical ADR/spec and callers | Implementation contract grounded in base SHA | GitHub source at base SHA | completed |
| Add migration + assertions | Additive 0027 with API-independent SQL enforcement | migration validation + PG 18 | pending |
| Update API and UI | Consistent fail-closed selection and visible effective date | Vitest, integration, build | pending |
| Add bcv-0027 runner/workflows | Disposable 0001–0027 profile | migration runner + restore smoke | pending |
| Update ODD/current-state docs | Durable evidence and handoff | ODD validator | pending |
| Exact-HEAD CI | All required checks green on final SHA | GitHub Actions | pending |

## Technical decisions

Follow ADR-20261117 and docs/sdd/0027_BCV_NONBUSINESS_DAY_EFFECTIVE_DATE.md. Do not infer holidays from a manually maintained calendar. Use America/Caracas server time. Treat unchanged as a fresh successful official-source observation, not reuse of stale state.

## Closure and handoff

- Final commit SHA: pending
- PR: pending
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: pending
- Residual risks: pending
- Next step: implement additive 0027 and the coordinated API/runner/test changes.
