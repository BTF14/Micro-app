# ODD task: bcv-stale-running-watchdog

- Status: completed
- Issue / PR: Issue #53 (P0); dedicated PR against `main`
- Owner / reviewer: BTF14 / technical agent
- Started: 2026-11-14
- Risk: high

## Objective and authorization

- Desired outcome: detect BCV synchronization attempts left in `running` for at least five minutes, expose that condition to authorized administrators, and preserve fail-closed checkout behavior.
- Authorization boundary: one isolated code-and-documentation PR. No SQL migrations, Neon `main` access or mutation, role/grant changes, secrets access/change, manual Cloudflare/Google configuration, manual deployment, or production-data access.
- Relevant original request: implement the hourly `17 * * * *` stale-running watchdog, read-only organization sync-state endpoint fields, explicit admin warning, PostgreSQL 18 runtime-LOGIN integration coverage, and reconcile PR #363 plus continuity/readiness docs.

## Scope and exclusions

Included:
- A single threshold constant: `BCV_STALE_RUNNING_THRESHOLD_SECONDS = 300`.
- Hourly Cron watchdog in `apps/api/src/index.ts`, using only `env.DATABASE_URL` and read-only SELECT against `public.bcv_sync_state`.
- Independent try/catch boundaries for watchdog and auth-retention cleanup.
- Additive `isStaleRunning` and `staleRunningThresholdSeconds` response fields; `health: "attention"` only for stale `running`; preserve `Cache-Control: no-store`.
- Admin UI warning that the attempt is stuck beyond five minutes and checkout remains blocked for safety.
- Unit tests plus disposable PostgreSQL 18 integration tests under a real `microapp_runtime` LOGIN.
- Exact closure evidence for `odd/tasks/runtime-write-rate-limiting.md` and targeted updates to production readiness and continuity documents.

Excluded:
- Any mutation of `public.bcv_sync_state` by `microapp_runtime`, especially `last_outcome`.
- SQL/schema/migration/role/grant changes; any Neon access or mutation.
- Changes to BCV producer synchronization semantics, checkout fail-closed rules, Cron schedule `0 22 * * MON-FRI`, external alert routing, or production configuration.
- Changes to PR #193 or Issue #53 state.

## Acceptance criteria

- [x] AC-1 — one explicit threshold constant equals 300 seconds; the endpoint and watchdog use the same value.
- [x] AC-2 — hourly `17 * * * *` watchdog uses only runtime `DATABASE_URL`, reads singleton state, and logs the exact sanitized `BCV_SYNC_STALE_RUNNING` event only for `running` age >= 300 seconds.
- [x] AC-3 — watchdog is strictly read-only under `microapp_runtime`; no UPDATE/INSERT/DELETE or role/schema change; `last_outcome` remains producer-owned.
- [x] AC-4 — watchdog and `cleanupExpiredAuthRecords` have independent try/catch boundaries; either subtask's failure does not prevent the other from running, and failures are not silently swallowed.
- [x] AC-5 — sync-state endpoint returns `health: "attention"`, `isStaleRunning: true`, and threshold 300 only for stale `running`; recent `running`, `inserted`, `unchanged`, and `failed` are not false positives; response remains no-store.
- [x] AC-6 — admin UI explicitly explains the five-minute stale-running condition and that checkout remains blocked for safety.
- [x] AC-7 — unit and PostgreSQL 18 disposable integration tests run with real `microapp_runtime` LOGIN and cover recent/stale states, non-running outcomes, read-only privileges, and cleanup isolation.
- [x] AC-8 — PR #363 AC-1..AC-7 are closed with exact evidence from HEAD `4a1bc3280ac974932353e9e337d0799f161d4ffa` and merge `b7dccd6eb6a1fd7971c403c4c833013bf0bd44fc`; production readiness and continuity docs are reconciled without personal/contact identifiers, provider resource IDs, internal business/product names, or secrets.
- [x] AC-9 — complete diff reviewed; every check-run and workflow run passes on the exact final PR HEAD before squash merge; post-merge main checks are verified. PR #193 remains OPEN and untouched; Issue #53 remains OPEN/P0.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Runtime accidentally mutates producer-owned sync state | Critical | Runtime LOGIN integration, migration 0022 privilege assertions, read-only SQL inspection; no schema/role changes |
| Watchdog failure blocks retention cleanup (or vice versa) | High | Independent try/catch and fault-injection tests for both directions |
| False stale alarm from recent or terminal state | High | Age boundary tests at <300 and >=300; explicit outcome predicate |
| Checkout becomes enabled after stale detection | Critical | No checkout changes; existing latest-success fail-closed contract remains untouched and tested |
| Sensitive data leaks to logs | High | Emit only event, age, threshold, timestamp; never URL, token, customer, rate or credentials |
| CI integration uses privileged test connection | High | Endpoint request and state read use actual runtime LOGIN; admin connection only seeds/cleans synthetic fixtures |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify live GitHub baseline and governing docs | Confirm main, open PRs, #193, #53 and exact-main checks | GitHub REST ref, PR list, issue, check-runs and workflow runs | completed |
| Create this ODD artifact before source edits | Durable scope and acceptance gates | ODD file committed before source edits on the PR branch | completed |
| Implement read-only watchdog and endpoint contract | One shared threshold and isolated Cron subjobs | Exact PR HEAD `ac272e8cff06029c03a13f72307b41c80a132603`; typecheck and unit tests SUCCESS | completed |
| Implement administrator warning | Clear stale state and checkout fail-closed explanation | Frontend build/typecheck SUCCESS; UI consumes the API threshold field | completed |
| Add PostgreSQL 18 runtime-login integration | Real runtime read, correct age/outcome and no mutation | CI `verify` step 31 `PostgreSQL BCV sync-state and watchdog integration tests (runtime LOGIN)` SUCCESS | completed |
| Close PR #363 task and reconcile readiness/continuity | Exact merged evidence and current handoff | PR #363 exact HEAD/merge evidence recorded in task and readiness/continuity docs | completed |
| Review and integrate | Safe isolated squash merge | PR #364 merged by squash; exact PR HEAD 16/16 checks and 13/13 workflows SUCCESS; post-merge main 14/14 checks and 10/10 workflows SUCCESS; CI verify 52/52 steps both sides | completed |

## Technical decisions

- The single threshold is 300 seconds (five minutes), inclusive at the boundary.
- Age is calculated in PostgreSQL from `now() - last_attempt_at`, clamped to zero for future timestamps, matching the existing endpoint contract.
- The Cron watchdog is observational only. The producer owns `last_outcome`; the runtime role has SELECT but no write privilege under migration 0022.
- A missing singleton row is not a stale-running event. Query failures produce a sanitized diagnostic and do not suppress cleanup.
- The retention cleanup remains best-effort and independent. Neither subtask can turn the other into a silent skip.
- A stale state is an operational warning, not a state repair. Checkout must continue to fail closed until a successful current BCV state is established by the producer.

## Closure and handoff

- Final PR HEAD: `11b666b7d1963d573bce86248cb446de6d9f2cb2`; base `main` at review time: `b7dccd6eb6a1fd7971c403c4c833013bf0bd44fc`.
- PR: [#364](https://github.com/BTF14/Micro-app/pull/364), squash-merged on 2026-11-14.
- Merge commit / current `main`: `40d39fb6437f85672e65de01ea33d54ccee14aee`.
- Pre-merge exact-HEAD evidence: 16/16 check-runs SUCCESS and 13/13 workflow runs SUCCESS. CI `verify` completed 52/52 steps, including PostgreSQL 18 sync-state/watchdog integration under real `microapp_runtime` LOGIN and assertions that runtime can SELECT but cannot INSERT/UPDATE/DELETE or write `last_outcome`.
- Post-merge exact-main evidence: 14/14 check-runs SUCCESS and 10/10 workflow runs SUCCESS. CI `verify` completed 52/52 steps; Pages and API build checks completed successfully.
- Acceptance criteria AC-1..AC-9 met. Watchdog remains read-only; producer retains exclusive write ownership of `last_outcome`.
- Review transparency: 0 formal reviews and 0 inline review threads. Complete diff manually reviewed; no independent formal approval is claimed.
- Limitations not verified: no live production Cron invocation, Neon `main` query, production persistence, or external alert-routing verification was performed.
- Residual risks: first BCV rate persistence after a valid `MON-FRI 22:00 UTC` window and external alert routing remain pending. Issue #53 remains OPEN/P0; production remains NOT READY.
- Next step: operationally verify the first scheduled BCV persistence and external alert routing when the relevant production gates and authorization allow.
