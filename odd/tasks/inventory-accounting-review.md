# ODD task: inventory-accounting-review — current-model accounting and operational QA

- Status: in progress
- Issue / PR: Step 4 of docs/PROJECT_PLAN.md; PR opened as Draft after implementation.
- Owner / reviewer: Tech Lead / independent review pass
- Started: 2026-11-19
- Risk: critical

## Objective and authorization

- Desired outcome: create a versioned specialist agent and skill plus an independent, reproducible USD 0 invariant and mutation-detection harness for the current model through migrations 0001–0027, before Carril B1.
- Authorization boundary: documentation, test-only harness, test fixtures and CI for this harness only. No production business logic, migration edits, remote database mutation, production/Worker/Cloudflare changes.
- Relevant original request: owner directive for Step 4, inventory-accounting-review, 2026-11-19.

## Scope and exclusions

Included:
- .github/agents/inventory-accounting-review.agent.md
- .agents/skills/micro-app-inventory-accounting-review/SKILL.md
- Independent Python reference-model tests with controlled in-memory mutants.
- PostgreSQL temporary-table harness and loopback-only disposable database runner.
- Focused GitHub Actions workflow with ephemeral PostgreSQL 18 service.
- Minimal synchronization of Resource Registry, Current State, Handoff and State Journal.

Excluded:
- Any edits to apps/**, packages/money/**, migrations 0001–0027, or SQL 0028+.
- Carril B1: quantity_mode, changes to sale_items, commercial routes or new business logic.
- Neon (including main), Cloudflare, Worker configuration, secrets, real data, billing and production deploy.
- PRs #385 and #386; Issue #53; any merge or auto-merge.

## Acceptance criteria

- [ ] AC-1 — Agent profile has valid YAML frontmatter with name/description and adds the accounting-operational layer without replacing backend-data-review or security-review.
- [ ] AC-2 — Versioned skill defines independent invariants, edge-case matrix, USD 0 PostgreSQL + decimal-helper protocol and mutation safety.
- [ ] AC-3 — Python reference-model tests cover precision, rounding, sales, snapshots, payments, ledger/balance, shifts and tenant/branch scope.
- [ ] AC-4 — Each critical deliberate mutation is detected by a named assertion; no mutant remains active.
- [ ] AC-5 — PostgreSQL temporary-table harness verifies numeric domains, ledger/projection and tenant/branch mismatch detection; runner refuses non-loopback or non-disposable databases.
- [ ] AC-6 — Local validator and unit tests pass; applicable decimal/API tests run where a real checkout exists.
- [ ] AC-7 — Resource Registry, Current State, Handoff and State Journal reflect live main, #383/#387 merges, Neon 0027 and OV R36 without provider identifiers or secrets.
- [ ] AC-8 — Final PR remains OPEN / Draft, no merge/auto-merge; all global gates remain unchanged.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Independent model mirrors implementation assumptions | High | Define reference equations in skill/task; review against domain contracts and migrations. |
| Mutation test passes without detecting defect | Critical | Require named mutation-kill tests and explicit failure assertions. |
| Accidental use of remote/real DB | Critical | Loopback + database-name guard; temporary tables; transaction rollback; no Neon credentials. |
| Schema intent mistaken for implemented workflow | High | Label schema-only/specification/implemented separately; especially transfer dispatch/receipt. |
| Stale continuity documents | Medium | Live GitHub main SHA and read-only Neon migration ledger verified; append current block, retain history as superseded. |
| Tests not executed in actual checkout | High | Report environment limitation honestly; exact-SHA CI is required follow-up. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify live base and domain contracts | Exact main SHA; migrations/code/docs inspected | GitHub live ref, migration tree, source files, Neon read-only schema_migrations | completed |
| Create agent and skill | Versioned specialist instructions | Existing frontmatter convention and Postgres skill structure | completed |
| Implement independent model and mutants | Standard-library suite, each mutant killed | unittest output and mutation table | in progress |
| Add PostgreSQL disposable harness | Temporary-table numeric/ledger/scope assertions | PostgreSQL 18 CI service + loopback local runner | in progress |
| Synchronize canonical docs | Current state, handoff, journal, registry and plan reconciled | Live evidence, PR #388 and main/Neon checks | completed |
| Review diff and exact-SHA CI | No forbidden file changed; Draft stays open | PR file list, check-runs/workflow runs | pending |

## Initial code/schema observations

- Migration 0001 still defines products.stock_quantity at organization scope. Migration 0006 introduces branch-scoped warehouses, inventory_balances and warehouse_inventory_movements and explicitly states that no legacy stock backfill occurs. The review must prove the legacy field is not a live alternate branch-stock source.
- Migration 0006 allows transfer_out/transfer_in movement_type values, but the current API tree exposes count and receipt modules rather than a transfer dispatch/receipt workflow or transfer aggregate. Migration 0025 implements supplier receipts; do not infer it implements inter-branch transfer.
- Migration 0015 has deferred completed-sale reconciliation across sale_items, total USD/VES, payment amounts/USD equivalents, current BCV snapshot, own open shift, active warehouse, inventory movements and audit event. Migration 0018 adds unique contiguous payment allocation positions.
- Migration 0023 exposes atomic open/close shift functions with NUMERIC(14,4) USD and NUMERIC(16,2) VES cash; current shift API parses values as decimal strings.
- Existing inventory receipt integration tests cover idempotency, concurrent receipts, tenant/branch scope, runtime direct-write denial and rollback when audit insertion fails. Existing count tests exercise idempotency, stale snapshots and concurrency; these remain code-specific evidence, separate from the new reference model.

## Technical decisions

- Use Python decimal.Decimal with ROUND_HALF_UP as independent oracle for tie-away-from-zero semantics; reject Python float inputs. Do not import production TypeScript helper into the oracle.
- Treat numeric precision by actual column: VES line/total/shift cash uses NUMERIC(16,2), but payments.amount is NUMERIC(14,4) shared by currencies with a VES-specific round-to-2 check; BCV rate is NUMERIC(18,8) after 0013.
- Explicitly audit legacy products.stock_quantity from 0001 as a possible stale/alternate stock projection; 0006 introduces branch-scoped ledger/balances without legacy stock backfill.
- Use PostgreSQL TEMP TABLE fixtures in an explicit transaction and ROLLBACK; no migration application and no persistent fixture.
- Keep model mutations in memory and SQL mutations inside the temporary transaction. A mutation is test input, never a source patch.
- Current schema contains movement types for transfer out/in, but reviewed domain model describes two-stage transfer dispatch/receipt as not yet implemented; report the distinction and do not implement it here.
- BCV migration 0027 and its Neon application are separate from this task; this review uses existing decimal/checkout/shift/stock contracts only.

## Closure and handoff

- Final branch HEAD: query the live PR ref at handoff; do not treat this file's containing commit as a stable final SHA
- PR: https://github.com/BTF14/Micro-app/pull/388 (OPEN / Draft; no merge or auto-merge)
- Checks and exact outcomes: pending exact final SHA
- Acceptance criteria met / unmet: pending
- Limitations not verified: local checkout unavailable in this execution environment; no local command can be truthfully reported as run until an actual checkout is available. CI is required for repository validator and PostgreSQL workflow.
- Residual risks: independent harness does not replace code-specific concurrency/authorization tests or a full audit of all production triggers.
- Next step: run local validators in a real checkout, inspect complete PR diff, then report exact-SHA checks; keep PR Draft.
