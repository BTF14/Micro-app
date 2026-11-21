# ODD task: PR 4 — Cierres de caja, reportes y exportación CSV

- Status: 4A integrated; 4B implementation in Draft pending exact-SHA validation
- 4A: [PR #402 — MERGED](https://github.com/BTF14/Micro-app/pull/402), merge commit `37cab712cb2ced5c08cbf9f762a7e05c935fe422`
- 4B branch: `feat/reports-shift-closure-4b-ui-20261121`
- Started: 2026-11-21; risk: high

## Objective and authorization
Deliver the approved frontend for cash shift closure summaries, role-aware sales/inventory reports, authenticated CSV downloads, FISC-01 disclaimer and PostgreSQL 18 full-stack browser coverage. Base is exactly `37cab712cb2ced5c08cbf9f762a7e05c935fe422`. Exactly 14 files; PR must remain OPEN / Draft, no merge or auto-merge.

## Integrated 4A evidence
PR #402 is MERGED into the base. Backend routes and contracts are in `apps/api/src/reports.ts`; its restricted-runtime PostgreSQL 18 suite and exact-HEAD CI passed on PR HEAD `85e1ebd94d9de7965ee2534334a37831e5874660`. Merge commit is the base for 4B. Do not inherit 4A checks as 4B evidence.

## Scope — exactly 14 files
1. `apps/web/src/ReportsPanel.tsx` (new)
2. `apps/web/src/reports.css` (new)
3. `apps/web/src/ReportsPanel.test.tsx` (new)
4. `apps/web/src/App.tsx`
5. `apps/web/src/App.test.tsx`
6. `apps/web/src/RegisterShiftsPanel.tsx`
7. `apps/web/src/SalesPanel.tsx`
8. `apps/web/src/sales-panel.css`
9. `apps/web/src/SalesPanel.test.tsx`
10. `apps/web/e2e/real-fullstack-commerce.spec.ts`
11. `odd/tasks/reports-and-shift-closure.md`
12. `docs/CURRENT_STATE.md`
13. `docs/HANDOFF_NEXT_CHAT.md`
14. `docs/PROJECT_PLAN.md`

## Exclusions and gates
No changes to `apps/api/**`, SQL/migrations, `packages/**`, workflows, `package.json`, secrets, Neon main, Cloudflare config, DNS, deploy or real data. Keep AC-6 OPEN, `FX_CONTINGENCY_ENABLED=false`, `BCV_SYNC_ENABLED=false`, Issue #53 OPEN/P0, freeze v1.1, PRODUCTION: NOT READY and USD 0 budget unchanged.

## Acceptance criteria
- [x] 4A backend integrated by PR #402.
- [ ] Role-aware navigation/tabs: Owner closures/sales/inventory valuation; Admin closures/sales/inventory without costs; Cashier own closures/sales; Inventory only inventory.
- [ ] Shift selector and initialShift, closure balances, exact negative differences, payment methods, historical FX and FISC-01.
- [ ] Daily/weekly/monthly/custom Caracas sales reports, branch filter, completed/excluded counts.
- [ ] Authenticated CSV download via fetch credentials, Blob, anchor and URL cleanup; no window.open/window.alert.
- [ ] Cost fields only when include_valuation === true.
- [ ] Sales receipt FISC-01 disclaimer.
- [ ] jsdom tests for roles, negative exact money, custom period and CSV.
- [ ] Playwright PostgreSQL 18: checkout disclaimer, reports, CSV, 390×844 and 1280×800.
- [ ] Exactly 14 files and zero excluded-path changes.
- [ ] All exact-final-SHA check-runs/workflows success; PR OPEN / Draft, no merge/auto-merge.

## Technical decisions
Use backend contracts in `apps/api/src/reports.ts`; UI is not an authorization boundary. Keep money as decimal strings; never use Number/parseFloat for amounts. Completed sales use completed_at; void/refunded counts stay separate. Historical FX uses saved snapshots. Costs are rendered only when API returns include_valuation === true. FISC-01 is internal, not a tax invoice.

## Closure and handoff
4A is integrated; 4B is not complete until exact-HEAD CI, PostgreSQL 18 E2E, RBAC/cost-visibility review and diff verification pass. No local checkout/terminal in this execution; do not claim local verify/Vitest/Playwright/docs validation. After PR 4 integration: (1) mobile scanner expansion to product create/edit, inventory and catalog search; (2) favicon.svg + visual tour of all nine views at 390×844 and 1280×800 + docs/USER_MANUAL.md; (3) Pre-prod Audit → ve-fx-compliance-review → AC-6 → Issue #53.
