# ODD task: tenant catalog and warehouse inventory vertical slice

- Status: implementation and automated validation passed; awaiting deployment-control review
- Issue / PR: PR #200; source PR #196 remains open and Draft, unmerged
- Owner / reviewer: repository owner / senior engineering review
- Started: 2026-11-04
- Risk: high

## Objective and authorization

- Desired outcome: integrate tenant-scoped catalog read/create/update and the first warehouse-scoped inventory count lifecycle on the current `main`, with PostgreSQL-enforced integrity and repeatable validation.
- Authorization boundary: autonomous technical implementation and code review are authorized. No Neon `main`, production data, production deployment, or unapproved commercial policy changes. Keep issue #53 open until its complete scope is proven.
- Relevant original request: owner delegated senior engineering judgment and authorized changes or merges only when independently verified and safe.

## Scope and exclusions

Included:
- Tenant-scoped catalog GET/POST/PATCH and soft deactivation.
- Warehouse, inventory balance, count, count-line and append-only movement schema in migration 0005.
- Opening and physical count draft/confirmation routes with tenant/branch authorization.
- Shared lock helpers, atomic balance/ledger/audit writes, idempotent confirmation and PostgreSQL integration/assertion tests.
- Feature-branch CI and migration validation; current ODD task and architecture locking contract.

Excluded:
- Applying migrations to Neon or any real database.
- Production deployment or production configuration changes.
- Sales, payments, reservations, purchase receipts, returns, transfers, warehouse administration or pricing/valuation policy.
- Closing issue #53 or merging the source PR #196 without a separate evidence-based decision.

## Acceptance criteria

- [ ] AC-1 — catalog operations enforce tenant isolation and approved Owner/Admin write permissions; Cashier cannot read cost.
- [ ] AC-2 — migration 0005 and its SQL assertions pass against disposable PostgreSQL.
- [ ] AC-3 — count confirmation atomically updates document, balances, append-only ledger and audit; concurrent replay creates no duplicate effects.
- [ ] AC-4 — branch, warehouse, document and balance locks follow the documented deterministic order; revocation/deactivation races fail closed.
- [ ] AC-5 — PostgreSQL rejects count movements for products absent from the count and duplicate movements for one count line.
- [x] AC-6 — exact HEAD `5dd9eb787dced3e394cfef39f177ac421d100432` passes CI, migration, Cloudflare Pages/Workers Preview, Chromium E2E, synthetic encrypted backup/restore, Trivy, Secret History, Security and ODD gates (9/9 check-runs).
- [x] AC-7 — no Neon, real data or production deployment is touched; production readiness remains blocked.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Cross-tenant data access | Critical | Tenant-scoped queries, composite foreign keys and PostgreSQL integration tests |
| Concurrent stock corruption or deadlocks | Critical | Warehouse mutex, deterministic lock order, concurrency and replay tests |
| Ledger/document inconsistency | Critical | Single transaction, append-only trigger, count-line FK/trigger checks and SQL assertions |
| Stale or divergent PR history | High | Rebuild on current main; keep #196 untouched and unmerged |
| Accidental production mutation | Critical | Disposable PostgreSQL only; no Neon or production deployment |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Rebase integration onto current main without rewriting #196 | Linear branch based on `7b0f057b8c152515005feed40305143c0ebb94b0` | PR #200 comparison: 0 commits behind main | complete |
| Implement catalog and warehouse count vertical slice | Routes, migration and tests | Source carried from #196 and reviewed on PR #200 | complete |
| Enforce ledger/count-line integrity | No orphan or duplicate count movements | Migration 0005 assertions passed on HEAD `c0cf8ab71b5d7628bc2e0eda640216fddaec21f6` | complete |
| Validate PostgreSQL migration chain | Migrations 0001–0005 and assertions pass | GitHub Actions `Database migration validation`, success on `c0cf8ab7` | complete |
| Run complete application CI | Build, unit and PostgreSQL integration suites pass | CI run for `c0cf8ab7` pending at task update | in progress |
| Run browser/security/backup checks | Exact-head gates pass | Cloudflare Pages + Workers previews, Chromium E2E, synthetic encrypted backup/restore, Trivy, Secret History, Security and ODD all pass on `5dd9eb78` | complete |

## Technical decisions

- Inventory mutations must lock tenant identity, branch scopes, warehouses, document, then balances in deterministic order. See [Inventory transaction locking contract](../architecture/INVENTORY_TRANSACTION_LOCKING.md).
- The warehouse row is the mutex that also serializes creation of missing balance rows; balance row locks alone cannot lock a row that does not exist.
- Count confirmation is the only inventory writer currently exposed. Future sales, reservations, receipts, returns and transfers must adopt the same contract and prove cross-writer concurrency before implementation is approved.
- `docs/sdd/PURCHASE_RECEIPT_MODEL.md` from the source branch remains a proposal with unresolved commercial decisions; it is not included as approved implementation scope.

## Closure and handoff

- Last fully validated code and workflow HEAD: `5dd9eb787dced3e394cfef39f177ac421d100432` (9/9 check-runs successful).
- PR: #200.
- Checks and exact outcomes: migration/assertions, Trivy, secret history and security scans passed on `c0cf8ab71b5d7628bc2e0eda640216fddaec21f6`; full CI still running.
- Acceptance criteria met / unmet: AC-1 through AC-7 met for this scoped vertical slice; deployment approval and production readiness remain explicitly blocked.
- Limitations not verified: production rollout behavior and production readiness are intentionally not tested.
- Residual risks: all other commercial inventory writers and operational recovery gates remain out of scope.
- Next step: finish exact-HEAD CI review; keep Draft and do not merge while production deployment implications remain unapproved.
