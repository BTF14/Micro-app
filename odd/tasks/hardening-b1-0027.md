# ODD task: Hardening B1 + 0027

- Status: in progress — 6A merged; 6B OPEN / Draft pending exact-SHA CI
- Issue / PR: PR #391 (Micro-PR 6A) and PR #392 (Micro-PR 6B)
- Owner / reviewer: repository owner / independent review through GitHub checks
- Started: 2026-11-20
- Risk: critical

## Objective and authorization

- Desired outcome: close Step 6 hardening for Carril B1 (0028) and BCV non-business-day contract (0027), preserving deterministic lock ordering, correct integer-quantity error mapping, and authorization/isolation guarantees for completed-sale reads.
- Authorization boundary: one isolated branch and one OPEN / Draft PR from main SHA c2fa2fe453af0c3dbb7dd95e8b79a59eed828234; no merge or auto-merge.
- Relevant original request: Micro-PR 6A lock-order/concurrency hardening and Micro-PR 6B GET /sales/:saleId integration coverage plus ODD/current-state documentation reconciliation.

## Scope and exclusions

Included:
- PR #391 / Micro-PR 6A: deterministic lock order in inventory-receipts.ts and inventory-counts.ts; map PostgreSQL 23514 integer receipt/count quantity violations to HTTP 400; remove duplicate tests and add focused regressions.
- PR #392 / Micro-PR 6B: PostgreSQL 18 integration tests for authorized sale-detail reads, immutable unit/quantity-mode/price snapshots, operation/FX date receipt metadata, no cost leakage, cashier own-sale isolation, inventory-role denial, cross-tenant/branch denial, and draft-sale denial.
- Reconcile the Carril B1 closure record and prepend current-state, handoff, and project-plan status blocks.

Excluded:
- Production implementation under apps/api/src/ and apps/web/src/; only the integration test file is in scope.
- All migrations 0001–0028, Neon main, production data, secrets, DNS, Cloudflare, deployment, and billing.
- Changes to FX_CONTINGENCY_ENABLED, BCV_SYNC_ENABLED, AC-6, Issue #53, or freeze v1.1.
- Any merge, auto-merge, or scope expansion beyond the six authorized files.

## Acceptance criteria

- [x] AC-1 — PR #391 is merged; lock acquisition is deterministic in receipt/count paths; 23514 integer quantity errors map to HTTP 400; duplicate tests are removed.
- [ ] AC-2 — PostgreSQL 18 integration coverage proves GET /sales/:saleId returns receipt snapshots and metadata without exposing cost_usd or unit_cost_usd.
- [ ] AC-3 — A second cashier in the same branch receives 404 SALE_NOT_FOUND; inventory role receives 403 FORBIDDEN.
- [ ] AC-4 — Cross-tenant, foreign-branch, and draft-sale reads never return HTTP 200.
- [ ] AC-5 — Exactly six authorized files change; no production implementation or migration changes.
- [ ] AC-6 — All GitHub Actions workflows and check-runs succeed on the final PR head SHA; PR remains OPEN / Draft.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Cross-cashier disclosure of sale data | critical | Assert 404 for another cashier even with same-branch membership |
| Cost disclosure in receipt response | critical | Assert both cost field names absent at sale and line level |
| Mutable catalog data corrupting historical receipt | high | Change product unit and price after checkout; reread and assert original snapshots |
| Inventory role can read cashier sales | high | Authenticated PostgreSQL fixture asserts 403 FORBIDDEN |
| Draft or cross-scope sale becomes visible | critical | Test draft-only predicate, foreign tenant and branch scopes; all must be non-200 |
| Test fixture residue or trigger state leakage | high | try/finally cleanup for temporary membership/session and restore sale state/triggers |
| Accidental production or global-gate change | critical | Six-file allowlist; no migrations, runtime implementation, Neon, secrets, DNS, Cloudflare, deploy, or gate changes |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify exact base and 6A state | main at requested SHA; PR #391 merged | GitHub refs and PR metadata | completed |
| Complete Micro-PR 6A | Lock order, 23514 mapping, duplicate test cleanup | PR #391, merged commit 94f27defa1a4b4faca4c0fc0adefd199c31180d4 | completed |
| Add GET sale-detail PostgreSQL tests | Authorized snapshots, no cost leakage, role and scope denials | sales-checkout.integration.test.ts; PostgreSQL 18 CI required | implemented / CI pending |
| Close Step 5 ODD record | Record #390 merge, exact-SHA CI, Neon 0028 owner confirmation | carril-b1-quantity-mode-snapshots.md | implemented |
| Reconcile current state and next handoff | Current state, handoff, and plan identify Paso 7 as next after Paso 6 | Three docs, history retained below | implemented |
| Verify allowlist and final CI | Exactly six files; every exact-SHA check-run and workflow successful | GitHub PR file list, Actions runs, check-runs | pending |

## Technical decisions

- Sale detail is scoped by organization, branch, and creator for cashier roles; owner/admin branch-wide read behavior remains unchanged.
- Historical receipt fields come from sale and sale-item snapshots, never the current product catalog. The detail response must not select or serialize cost fields.
- The draft-sale fixture temporarily disables table triggers only in the disposable PostgreSQL integration database and restores sale status and trigger state in finally.
- PR #391 is a separately merged prerequisite; this PR is additive test/documentation-only work and does not rewrite its implementation.

## Closure and handoff

- Final commit SHA: pending exact final head; required base is c2fa2fe453af0c3dbb7dd95e8b79a59eed828234.
- PR: PR #392 — OPEN / Draft, base main; https://github.com/BTF14/Micro-app/pull/392
- Checks and exact outcomes: pending; do not inherit checks from the base SHA or PR #391.
- Acceptance criteria met / unmet: 6A complete; 6B awaits exact-SHA GitHub Actions validation.
- Limitations not verified: no local checkout, terminal, or local PostgreSQL 18; no local tests are claimed.
- Residual risks: CI must execute the PostgreSQL 18 suite and ODD/docs validators against the final PR SHA.
- Next step: finish exact-SHA CI validation; after Paso 6 integration, proceed to Paso 7 — PR 2 CSV Importer. Keep this PR Draft; no merge or auto-merge.
