# BCV 0027 — non-business-day effective date

- Status: implementation in progress; critical financial/DB work.
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
