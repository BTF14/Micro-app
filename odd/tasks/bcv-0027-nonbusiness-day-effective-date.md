# BCV 0027 — non-business-day effective date

- Status: implementation complete on code SHA `af422a0f08dcc9b3a1b4228cd76fbf958b4040e5`; exact code HEAD has 22/22 check-runs `completed / success`. Documentation reconciliation is in progress; final documentation SHA still requires its own 22/22 validation. PR remains OPEN / Draft.
- Base: `main` / `a852bbd68ccb9509feccb6fc78248181e07c2b29`.
- Branch: `feat/bcv-0027-nonbusiness-day-effective-date-20261118`.
- Scope: implement the accepted ADR `docs/decisions/ADR-20261117-bcv-nonbusiness-day-effective-date.md` and specification `docs/sdd/0027_BCV_NONBUSINESS_DAY_EFFECTIVE_DATE.md`; open Draft PR only.
- Explicit exclusions: merge/auto-merge; Neon main or any remote DB writes; production data/secrets; manual Cloudflare changes/deployments; enabling `FX_CONTINGENCY_ENABLED`; closing AC-6; lifting freeze v1.1; closing Issue #53; claiming production readiness.
- Preserve: AC-6 OPEN, `FX_CONTINGENCY_ENABLED=false`, freeze v1.1, Issue #53 OPEN/P0, `PRODUCTION: NOT READY`, existing 0026 guarantees and all existing branch/tenant/role/financial invariants.

## Required implementation
1. Add migration `0027_bcv_nonbusiness_day_effective_date.sql` and companion assertions, strictly additive after 0026. Do not edit 0021/0022/0026. Preserve role grants, owners, SECURITY DEFINER/search_path/trigger-only ACL contracts, append-only observations and all 0026 sale reconciliation.
2. Implement the shared fail-closed BCV eligibility/priority contract in API: exact Caracas date first; otherwise weekend prepublication within +5 with healthy sync; otherwise weekday/holiday prepublication within +5 with same-Caracas-day successful sync; reject ambiguity, stale/running/failed/uncovered state with 409 `BCV_RATE_NOT_CURRENT`.
3. Preserve immutable dual snapshots: operation_date captured in PostgreSQL after sync lock and BCV exchange_rate_effective_date from the exact selected official row. Keep manual contingency date semantics unchanged.
4. Integrate checkout transaction/lock ordering and independent SQL guard for direct runtime writes. Extend manual contingency recovery only where the accepted ADR requires; do not enable the feature.
5. Update API latest semantics and web status/panel to distinguish current/scheduled/stale/unavailable and handle Caracas midnight deterministically.
6. Add disposable PostgreSQL 18 tests for the complete ADR matrix, including direct SQL runtime paths, concurrency, rollback, midnight, failed later sync, stale-running, duplicate candidates, +5 boundary, and preservation of 0026 invariants.
7. Add/adjust `bcv-0027` scripts, migration runner/CI workflows and ODD task/docs as required by repository conventions. No production or Neon connection.
8. Open and keep a Draft PR against main. No merge and no auto-merge.

## Acceptance gates
- Migration upgrades 0001–0027 from empty disposable PostgreSQL 18 and passes full assertions; existing 0026 checks remain intact.
- API and SQL make identical priority decisions and fail closed.
- PostgreSQL concurrency/negative cases prove complete rollback and immutable snapshots.
- Frontend labels never describe future scheduled rate as current; timezone comes from America/Caracas, not device locale.
- All repository-required checks pass on the exact final PR HEAD; no inherited checks from earlier SHAs.
- Final review covers full diff, security/ACL/owner/trigger assertions, migration runner, CI workflows, scripts, tests, docs and PR metadata.
- Update CURRENT_STATE, HANDOFF_NEXT_CHAT and STATE_JOURNAL only when the milestone is complete; retain explicit global gates above.

## Work log
- Branch created from the requested base SHA.
- Owner supplied post-merge main evidence: 14/14 check-runs and 9/9 post-merge workflows successful; this is accepted as the entry gate.

## Progress checkpoint — 2026-11-18

- Draft PR: https://github.com/BTF14/Micro-app/pull/383 (OPEN / Draft; no merge or auto-merge).
- Latest known HEAD at this checkpoint: `02134e303c52850cf0b32262ca2456108853cb11`.
- Implemented in branch: additive migration 0027, dual-date columns and trigger guards, shared SQL eligibility selector, updated 0026 sale reconciliation and contingency transition/authorization guards, API checkout/latest/recovery selection, web scheduled/current labels and receipt date snapshots, 0027 SQL assertions, PostgreSQL 18 matrix tests, migration CI/restore scripts.
- Added explicit checks for exact-date precedence, weekend prepublication, weekday same-day sync, +5 boundary, stale/failed/running/error/uncovered states, positive numeric rates, duplicate candidates in pure selection, immutable completed-sale dates, and migration rollback atomicity.
- Latest-head Actions validation is still pending; prior successful migration-runner evidence was on an earlier branch HEAD and is not accepted as final-HEAD evidence.
- Remaining: inspect and repair all latest-HEAD CI failures; verify PostgreSQL integration matrix and full E2E; inspect final diff and PR checks/reviews; update CURRENT_STATE, STATE_JOURNAL and HANDOFF_NEXT_CHAT only after all work closes.


## Final implementation checkpoint — 2026-11-19

- PR #383 remains OPEN / Draft; no merge and no auto-merge.
- Code HEAD validated: `af422a0f08dcc9b3a1b4228cd76fbf958b4040e5`.
- GitHub Check Runs API for that exact SHA: **22/22 completed / success**. Associated workflows: **13/13 completed / success**, including CI, PostgreSQL migration validation, PostgreSQL migration runner, Playwright E2E, BCV source connectivity, backup restore, security, Semgrep, dependency review, secret-history, ODD docs and project dashboard.
- CI run `44625145706`: `verify` completed / success. Within it: PostgreSQL 18 BCV 0027 effective-date matrix, build/typecheck, unit tests, PostgreSQL atomic sales checkout integration, FX contingency PG-01..PG-30, isolated Cashier lifecycle and runtime-role integration all completed / success.
- Playwright E2E run `44625146088`: both Real full-stack commerce E2E (PostgreSQL 18) and Chromium authentication smoke tests completed / success.
- Additional check-runs include Cloudflare Pages and Workers Builds, both completed / success. These are preview/build checks, not production deployment authorization.
- Fixed the residual closed-shift fixture by reopening an active shift in `finally` and reusing that same shift in the subsequent parallel-checkout test; do not insert a second open shift for the same register.
- Added deterministic Caracas midnight tests for `03:59:59Z` (Friday 23:59:59 VET) and `04:00:00Z` (Saturday 00:00:00 VET) in TypeScript policy, checkout, latest-rate status and PostgreSQL 18 selection. PostgreSQL test also verifies the trigger's shared-lock-before-clock ordering and that both snapshots derive from the same captured `operation_at`.
- All successful evidence above is for the exact code SHA only. Documentation changes now require a new exact-final-SHA check-run validation before this task can be handed off as complete.

### Gates retained (not closed by CI)

- AC-6 remains OPEN; `FX_CONTINGENCY_ENABLED=false`.
- Issue #53 remains OPEN/P0.
- Freeze v1.1 remains in force.
- Neon `main` remains at migration 0025; no Neon connection or mutation was performed in this work.
- `PRODUCTION: NOT READY`.
- No merge, auto-merge, production deployment, production data access, or manual Cloudflare changes.
