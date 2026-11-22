---
name: micro-app-evidence-criterion
description: Apply evidence-first engineering judgment to Micro-app design, implementation, reviews, operational claims and agent handoffs. Use before proposing or evaluating behavior that touches SQL, FX, RBAC, accounting or production gates.
---

# Micro-app evidence criterion

## Non-negotiable method

1. Read applicable project instructions and current-state documents first. Inspect the live target branch/PR SHA; historical notes are leads, never proof of current behavior.
2. Before answering or designing, inspect actual callers, handlers, schema/migrations, triggers/functions/grants, and relevant positive and negative tests. Follow the complete path from UI through API to database and back. Do not infer implementation from a UI label, type, comment, plan, or green CI badge.
3. Cite evidence as repository path plus exact line/range (and SHA). If evidence is absent, say “not found in inspected scope”; do not invent a file, trigger, permission, test, or guarantee. Re-fetch line numbers at the reviewed SHA because line numbers drift.
4. Separate observed facts, inference, proposal, implementation, and verification. A passing workflow proves only the jobs/assertions it actually ran on that exact SHA.
5. Do not agree for politeness. Challenge proposals that contradict a real constraint, and explain the conflict with file/line evidence, impact, and the smallest safe alternative. No silent scope expansion.
6. Never introduce secrets, real customer data, paid services, production/Neon-main mutations, unapproved deployments, or dependency/workflow/schema changes outside explicit authorization. Budget target is USD 0.

## Required classification for every finding or proposal

### A. Mitigable en v1.1 ($0 / 0 SQL)
Only changes implementable within existing schema, API contracts, grants, feature flags and approved scope. Typical candidates: copy, accessible UI, client-only preview/calculation that does not alter accounting payloads, tests, docs, pure helpers and existing read paths. Verify that the existing backend contract already supports the behavior; otherwise do not label it mitigable.

### B. Deferred structural v1.2
Requires new persisted state, schema/trigger/grant/API contract, or a product/accounting policy decision. Examples to re-verify against current code before asserting: mixed USD+VES tenders within one ticket may be rejected by currency-consistency checks in apps/api/src/sales-checkout.ts; intermediate cash-drawer movements need an explicit immutable movement model and reconciliation contract; sale void/annulment must be reconciled with immutable/guard triggers introduced by apps/api/migrations/0015_sales_checkout_atomicity.sql. Do not bypass these with UI-only workarounds or reinterpret net payments as gross cash tender.

### C. Invariante no negociable
Must remain true in every proposal and test: tenant/branch/actor RBAC enforced server-side and by database boundaries; immutable ledger/history and trigger protections; exact decimal arithmetic (no JS Number() or parseFloat() for money); FX fail-closed and authorized feature flags; no unauthorized SQL/migrations or production writes; no secrets or real data; AC-6 OPEN, FX_CONTINGENCY_ENABLED=false, BCV_SYNC_ENABLED=false, Issue #53 OPEN/P0, freeze v1.1, PRODUCTION: NOT READY, budget USD 0 unless an explicitly approved, evidence-backed gate transition changes them.

## Review checklist

- [ ] Verify branch and exact SHA; inspect current code, migration DDL, triggers/functions/grants and tests before making claims.
- [ ] Trace UI → request payload → route → authorization → SQL function/query → persisted rows → report/read model.
- [ ] Check adversarial cases: wrong tenant/branch/actor, revoked membership, replay/idempotency, concurrency, invalid decimals, FX stale/future/off, and negative authorization.
- [ ] For cash/change, distinguish physical tender received, net sale payment allocation, change returned and drawer movements. A display-only change calculator must not silently change payments.amount or claim to persist change.
- [ ] State classification A/B/C, evidence paths/lines, risk, test that would falsify the claim, exact-SHA validation and unverified limitations.
- [ ] If a proposal needs SQL or changes an invariant, stop within a 0-SQL authorization and explain why; do not “make it work” by weakening a trigger, permission, flag or test.

A skill is guidance, not evidence that a tool ran, a test passed, or production is ready.
