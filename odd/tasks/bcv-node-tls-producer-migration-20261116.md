# ODD task: BCV dedicated Node TLS producer

- Status: **completed / closed** — implementation merged and first production dispatch verified
- Issue / PR: [PR #374](https://github.com/BTF14/Micro-app/pull/374) — MERGED, no auto-merge
- Main merge SHA: `98e249778a52e9306a193e838edea4503e0343e6`
- Implementation PR HEAD: `c38a77b9aef4a390f45417cb660c5e8cf44b448c`
- Production workflow: [BCV Node TLS sync #1](https://github.com/BTF14/Micro-app/actions/runs/43977544849) — `workflow_dispatch`, `force_sync=false`, completed / success
- Closed: 2026-11-16
- Risk: critical (operational monitoring remains open)

## Addendum — current BCV intermediate rotation (2026-11-19)

- The live BCV endpoint now presents Sectigo Public Server Authentication CA **OV R36**, replacing the DV R36 intermediate described in the original 2026-11-16 implementation record.
- The current `.github/workflows/bcv-sync.yml` producer validates `apps/api/certs/sectigo-public-server-authentication-ca-ov-r36.crt` before Node starts: SHA-256 `6542D176BED50F193C0CE297AE44ECD8A0A86BEC2EDE682769344059B4E78530`; subject `CN=Sectigo Public Server Authentication CA OV R36,O=Sectigo Limited,C=GB`; issuer `CN=Sectigo Public Server Authentication Root R46,O=Sectigo Limited,C=GB`; `CA:TRUE, pathlen:0`; EKU `TLS Web Server Authentication`; and current validity.
- `NODE_EXTRA_CA_CERTS` is scoped to the isolated Node runner and points to this OV R36 PEM. Normal Node TLS chain, hostname and validity verification remains enabled; no TLS bypass is permitted.
- The original DV R36 references below are historical implementation evidence, not the current certificate pin for `bcv-sync.yml`. The independent strict-connectivity workflow retains its separately validated DV+OV transition bundle.
- Global gates are unchanged: AC-6 OPEN, `FX_CONTINGENCY_ENABLED=false`, Issue #53 OPEN/P0, freeze v1.1, and Worker `BCV_SYNC_ENABLED=false`.

## Objective and authorization

Move BCV ingestion from the Cloudflare Worker runtime to a dedicated GitHub Actions Node 24.22.2 runner using the pinned Sectigo DV R36 intermediate without disabling TLS verification, preserving the checkout fail-closed contract.

Authorization was limited to one implementation branch and PR from main `e375e2d4bffb2f6cb083c0d37f0d47a4c87bab0f`. No migrations 0021/0022, Neon schema changes, secret values, Cloudflare manual changes, billing or commercial activation were authorized. This closure records evidence; it does not expand implementation scope.

## Scope and exclusions

Included and merged in PR #374:
- `.github/workflows/bcv-sync.yml` and isolated Node runner.
- Pinned Sectigo DV R36 validation and strict TLS.
- Dedicated producer identity and least-privilege preflight.
- Worker pause via `BCV_SYNC_ENABLED=false`, triggers retained.
- Unit and PostgreSQL 18 integration coverage using injected `pg`.
- Sanitized error classification and operational documentation.

Excluded:
- SQL/migrations 0021 and 0022; checkout semantics.
- Neon schema/role/secret mutation; secret values are not recorded here.
- Manual Cloudflare dashboard changes, manual deployments, billing and commercial activation.
- TLS verification bypasses.

## Acceptance criteria

- [x] AC-1 — Node workflow schedule `17 11 * * MON-FRI`, guarded dispatch with `force_sync`, least privilege, concurrency protection, main-only production execution and 5-minute timeout. Workflow definition merged and the first dispatch completed.
- [x] AC-2 — Pinned certificate fingerprint, subject, issuer, CA basic constraint, server EKU and validity validated before Node; strict TLS remains enabled. The certificate-validation step succeeded in the production run.
- [x] AC-3 — Missing dedicated URL fails closed; both `current_user` and `session_user` are checked as `microapp_bcv_sync`. The production run reached the successful DB-backed sync path; no credential value is recorded.
- [x] AC-4 — Preflight reads only the migration-0022-authorized columns and uses `BCV_OFFICIAL_HTML_V1`; skip condition is successful state + today's valid rate + `force_sync=false`, without mutating sync state.
- [x] AC-5 — Failed/running/NULL state or missing/invalid rate executes shared sync; `force_sync=true` bypasses skip. Covered by unit and PostgreSQL 18 integration tests.
- [x] AC-6 — A normal second run after today's successful sync skips rather than overwriting success with failure; no afternoon retry is scheduled. Verified by the preflight tests and workflow schedule contract.
- [x] AC-7 — PostgreSQL 18 integration tests with injected `pg` verify role identity, preflight skip, failed-state recovery and runtime-role rejection.
- [x] AC-8 — TLS/network/timeout failures map to safe allowlisted codes; raw causes/messages are not logged.
- [x] AC-9 — Worker config sets `BCV_SYNC_ENABLED=false`, retains triggers, and scheduled unit tests assert disabled behavior. Post-merge check `Workers Builds: micro-app-bcv-sync` is completed / success on the exact merge SHA.
- [x] AC-10 — PR #374 merged only after its implementation validation; post-merge merge-SHA check-runs are 16/16 completed / success. The dedicated production dispatch also completed / success.
- [x] AC-11 — Documentation preserves `PRODUCTION: NOT READY`, Issue #53 `OPEN/P0`, commercial freeze, and the Phase 2 gates and priority.

## Risks and guardrails

| Risk | Severity | Mitigation / evidence |
|---|---|---|
| `NODE_EXTRA_CA_CERTS` broadens process trust | High | Scope only to the isolated runner invocation; certificate identity and pin are validated; Node's normal hostname/chain/date validation remains enabled. |
| Producer permissions differ from assumed preflight | High | Use only migration-0022 grants: `bcv_sync_state(singleton,last_outcome)`, `exchange_rates(id,validation_status)`. |
| Failed duplicate attempt blocks checkout | Critical | Idempotent preflight; one schedule only; no afternoon retry; checkout remains fail-closed. |
| GitHub schedule jitter | Medium | Schedule is best-effort; workflow_dispatch is the explicit recovery path. |
| Neon WebSocket transport differs from `pg` | High | Closed by the successful real Node 24.22.2 production dispatch using `@neondatabase/serverless`. |
| Secret exposure or wrong principal | Critical | Missing secret fails closed; role identity is checked; no secret value or connection string is included in docs/log excerpts. |

## Tasks and evidence

| Task | Evidence | Status |
|---|---|---|
| Inspect base, grants and shared sync API | Implementation PR #374; migration 0022 grants and source ID reviewed | completed |
| Implement shared Node runner/preflight | PR #374 merged; unit + PostgreSQL 18 integration tests passed | completed |
| Add strict TLS workflow | Run #1 step “Validate pinned Sectigo DV R36 certificate” completed / success; Node runner step completed / success | completed |
| Pause Cloudflare producer | Merge-SHA check [Workers Builds: micro-app-bcv-sync](https://github.com/BTF14/Micro-app/runs/133682202852) completed / success | completed |
| Update operational docs | This ODD closure, ADR, readiness, current state and handoff updated in this documentation PR | completed |
| Verify exact merge SHA | [16/16 check-runs](https://github.com/BTF14/Micro-app/commit/98e249778a52e9306a193e838edea4503e0343e6/checks), all completed / success; includes `Workers Builds: micro-app-bcv-sync` | completed |
| Verify first production dispatch | [Run #1](https://github.com/BTF14/Micro-app/actions/runs/43977544849), workflow_dispatch, `force_sync=false`, conclusion success; job output `BCV_NODE_SYNC_COMPLETED`, outcome `inserted` | completed |
| Verify live API behavior | Owner-provided live API observation at 2026-11-16T23:17:15Z: history returned the scheduled BCV record for effective date 2026-11-17; latest returned 503 before the VET effective-time boundary | completed (evidence supplied by owner; not independently fetched in this GitHub-only pass) |

### Exact merge-SHA check-runs

All 16 check-runs reference `98e249778a52e9306a193e838edea4503e0343e6` and are `completed / success`:
1. `sync`
2. `Workers Builds: micro-app-bcv-sync`
3. `Cloudflare Pages`
4. `Workers Builds: micro-app-api`
5. `postgres-migration`
6. `verify`
7. `Chromium authentication smoke tests`
8. `PostgreSQL 18 managed-owner role membership contract`
9. `Scan tracked files and reachable Git history`
10. `JavaScript and TypeScript static analysis`
11. `generate-progress`
12. `migration-runner`
13. `Real full-stack commerce E2E (PostgreSQL 18)`
14. `Trivy filesystem and configuration scan`
15. `verify-bcv-source`
16. `validate-odd-docs`

The GitHub API returns 16 check-runs (not 15); all 16 were checked against the exact merge SHA.

### First production execution

- Workflow: `BCV Node TLS sync`, run number #1, event `workflow_dispatch`, main SHA `98e249778a52e9306a193e838edea4503e0343e6`.
- Run URL: https://github.com/BTF14/Micro-app/actions/runs/43977544849
- GitHub run created at `2026-11-16T23:14:33Z`; job completed at `23:14:53Z`. The runner log emitted `BCV_NODE_SYNC_COMPLETED` with `outcome: 'inserted'` at `23:14:50Z`.
- Certificate-validation and strict Node runner steps completed successfully; runtime is Node 24.22.2 and the production client is `@neondatabase/serverless`.
- The real transport/producer path was therefore exercised successfully. No connection string, secret value, account identifier or project identifier is retained in this record.
- Owner-provided API observation at `2026-11-16T23:17:15Z`: history endpoint returned HTTP 200, source `BCV_OFFICIAL_HTML_V1`, effective date `2026-11-17`, fetchedAt `2026-11-16T23:14:50.014Z`, status `scheduled`; panel showed successful synchronization / inserted. Latest endpoint returned `503 BCV_RATE_UNAVAILABLE`, expected before `2026-11-17 00:00 VET` (`04:00 UTC`). The API observation is recorded as owner-supplied evidence, not as a GitHub API result.

## Closure and handoff

- Implementation PR: [#374](https://github.com/BTF14/Micro-app/pull/374), merged.
- Implementation PR HEAD: `c38a77b9aef4a390f45417cb660c5e8cf44b448c`.
- Merge commit / base for this documentation PR: `98e249778a52e9306a193e838edea4503e0343e6`.
- Exact merge-SHA checks: 16/16 success; no failures or pending check-runs.
- Acceptance criteria: AC-1 through AC-11 verified and closed for the Fase 1 implementation.
- Residual operational gate: observe effective-date transition to `current` after midnight VET on 2026-11-17, the next scheduled Node sync on main, and continued harmless inactivity of the paused Cloudflare producer. This is post-closure stability monitoring, not an unclosed implementation AC.
- Residual risk: GitHub schedule is best-effort; `NODE_EXTRA_CA_CERTS` extends trust for the isolated Node process.
- Next: Fase 2 starts with closure of AC-6 (legal/accounting) and AC-7 (independent security) for Contingencia Manual BCV, Priority #1, per `ADR-20261114-v11-product-scope-and-roadmap.md`. Keep production NOT READY and commercial freeze until all launch gates pass.
