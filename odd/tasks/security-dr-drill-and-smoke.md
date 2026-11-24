# ODD task: Issue #53 — PostgreSQL 18 DR drill and authenticated smoke readiness (Turno 20)

- Status: **implementation and exact-HEAD CI complete; PR #326 ready for merge**
- Issue: #53 (OPEN / P0); production remains **NOT READY**
- Branch: `security/issue-53-dr-drill-and-smoke-20261112`
- Base: `main` at `0ff826673f779c53ec2dd16bbd083d8fd6f2d2e0`
- Budget: USD 0
- Authorization boundary: isolated GitHub branch + disposable PostgreSQL 18 CI only. No Neon connections, no production/staging credentials, no real customer data, no remote DDL/DML, no manual backup dispatch, no deployment, DNS or billing changes.

## Objective
Add a reproducible synthetic disaster-recovery drill with formal elapsed-time reporting and checksum evidence, and consolidate authentication/cashier/branch authorization readiness checks using the existing API integration harness.

## Existing evidence and constraints
- `scripts/test_backup_restore_schema_bcv.sh` already provisions isolated PostgreSQL databases, applies the complete checked-out migration chain, seeds a coherent synthetic tenant/branch/register/shift/warehouse/count/ledger/completed-checkout graph, encrypts a custom-format dump with ephemeral age keys, checks SHA-256, restores into a second disposable database, and compares schema/data/privilege manifests.
- `apps/api/src/auth.integration.test.ts` already tests Google OAuth bootstrap and successful existing-member login using mocked Google token/userinfo endpoints, plus invalid identity, expired/revoked session rejection.
- `apps/api/src/register-shifts-api.integration.test.ts` exercises owner/admin/cashier sessions, own-shift open/read/close, unauthorized roles and branch scoping against PostgreSQL runtime LOGIN.
- Password registration/login are intentionally disabled. Do not enable password login or represent it as the cashier login path. A cashier smoke must use the existing Google OAuth/bootstrap contract with mocked provider responses, not real Google credentials.
- No current evidence proves a live pre-production deployment, real backup artifact recovery, operator RPO, or production RTO.

## Acceptance criteria
- [x] AC-1 `scripts/dr_drill_simulation.sh` fails closed unless `SOURCE_URL` is exactly the fixed disposable CI PostgreSQL 18 admin URL and current_database is `microapp_source`; it must never accept a user-supplied arbitrary target.
- [x] AC-2 The script runs the complete existing BCV/current-schema encrypted restore drill, measures wall-clock RTO using a monotonic clock, and records source/restore checksums plus machine-readable and human-readable report output.
- [x] AC-3 The restored graph proves catalog/product, completed sales, sale items, payments, inventory ledger/balances, register shifts and the available cash-closing records remain present and relationally consistent; ephemeral auth tables exist with exactly zero rows.
- [x] AC-4 Report RPO only as synthetic snapshot freshness/fixture lag, clearly stating that operational RPO (<24h) is not measured by a local synthetic restore.
- [x] AC-5 CI asserts RTO < 900 seconds on the standard runner, while recording the observed duration; a timeout/failure must fail the workflow.
- [x] AC-6 Add `apps/api/src/smoke-readiness.test.ts` (or extend existing suites) for Google bootstrap/login under mocked provider responses, invalid credentials/identity, expired/revoked session rejection, cashier authorization and cross-branch denial. Never use real OAuth secrets or production endpoints.
- [x] AC-7 Wire the drill and smoke suite into CI with explicit PostgreSQL 18 disposable service, no secret access and no production environment.
- [x] AC-8 Preserve open PRs #314–#316 and #193; keep Issue #53 OPEN/P0 and `PRODUCTION: NOT READY`.

## Planned implementation
1. Wrap the already-reviewed full-schema BCV restore harness rather than duplicating its migration/fixture/restore logic.
2. Extend restore assertions only where required; avoid a second divergent restore implementation.
3. Reuse the established mocked Google OAuth and PostgreSQL runtime LOGIN patterns. Keep password login disabled.
4. Update CURRENT_STATE, STATE_JOURNAL and HANDOFF after exact-HEAD CI is verified.

## Explicit non-goals
- No real remote backup download/decryption or Neon restore.
- No live pre-production or production HTTP smoke; no staging secrets.
- No claim of operational RPO/RTO from synthetic measurements.
- No auth policy changes, role matrix changes, new commercial endpoints or database migrations.

## Verified execution evidence — 2026-11-12 UTC

- PR: https://github.com/BTF14/Micro-app/pull/326
- Final validated PR HEAD: `50376c24c519562f9ac1d20c2ef2d1dba976ed81`
- Base SHA: `0ff826673f779c53ec2dd16bbd083d8fd6f2d2e0`
- Exact-HEAD CI: **19/19 check-runs SUCCESS** and **15/15 workflow runs SUCCESS** (including duplicate push/PR workflow events; every returned run concluded SUCCESS).
- Backup restore workflow: https://github.com/BTF14/Micro-app/actions/runs/43247681064 — all three restore profiles SUCCESS; PostgreSQL 18 BCV full-schema encrypted restore drill and report upload succeeded.
- Measured synthetic restore RTO: **3.953 seconds** on the standard GitHub-hosted runner, from wrapper start through full schema/data/role/relationship validation; acceptance threshold <900 seconds.
- Synthetic encrypted dump SHA-256: `7dc22baa65d8fab9122135e4794c23540ea926c2f8b0506bfad63ea50fdf6a97`.
- Source and restored schema/data manifest SHA-256 both: `eefbe43d3ee45151d3fea53b1363641c49f557264ce351eb616a3b77f54cdb58`.
- Drill log SHA-256: `335782e652256572d4c896b72e0b4a68e68f73e01b90a72a6b0b068c0ef67a9e`.
- Full schema migration chain: 23 migrations; auth ephemeral tables retained as schema and restored with exactly zero rows; synthetic catalog, completed sale, sale items, payment, inventory ledger/balance, cross-table relationships and closed cashier shift validated.
- API CI: smoke-readiness contract SUCCESS; PostgreSQL auth integration SUCCESS including Google OAuth cashier login after bootstrap; existing expired/revoked session checks SUCCESS; existing register-shift/cross-branch integration SUCCESS.
- Chromium authentication Playwright E2E: SUCCESS.
- Initial attempt exposed a real fixture ordering issue: sale reconciliation requires an open shift at sale commit. The fixture was corrected to close the shift only after the completed sale commits; the corrected exact-HEAD rerun passed. The initial failed attempt is retained in workflow history, not counted as success.
- RPO: synthetic fixture snapshot lag is 0 seconds because fixture creation and dump occur in one drill. **Operational RPO is not measured**; daily artifact availability remains unverified.
- The 3.953-second result is a synthetic CI RTO only. It does not certify a real-world restore time or production recovery.
- No Neon connection, real data, secrets, production backup dispatch, deployment, DNS or billing change.
- Issue #53 remains OPEN/P0; `PRODUCTION: NOT READY`.
- PRs #314, #315, #316 and #193 remain open and unchanged.
