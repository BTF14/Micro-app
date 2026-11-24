# ODD task: Micro-PR 5 — Mobile scanner expansion and cash change UX

- Status: implementation in progress on feat/mobile-scanner-cash-change-evidence-criterion-20261121
- Base: main = 97b092ea8089207352ed6b30254464ed53d08592
- Budget: USD 0
- Risk: medium (frontend checkout and operator-facing cash guidance)

## Objective

Extend the existing local BarcodeScanner to Product create/edit, Inventory search and Catalog search; clarify register-shift cash guidance; add an optional exact-decimal cash-tender/change calculator that never changes the checkout accounting payload; and add an evidence-first project skill.

## Scope and hard exclusions

- Reuse apps/web/src/BarcodeScanner.tsx; do not duplicate camera lifecycle or add dependencies.
- UI-only: no apps/api/**, SQL, migrations, package.json, dependency manifests or .github/workflows/**.
- Do not add favicon, visual tour or docs/USER_MANUAL.md.
- Keep the PR OPEN / Draft, without merge or auto-merge.
- Keep AC-6 OPEN, FX_CONTINGENCY_ENABLED=false, BCV_SYNC_ENABLED=false, Issue #53 OPEN/P0, freeze v1.1, PRODUCTION: NOT READY and USD 0 unchanged.

## Evidence inspected before implementation

- .agents/skills/micro-app-skill-curation/SKILL.md: local skills must be small, focused, project-owned, free of secrets and must not bypass approvals.
- BarcodeScanner.tsx: one reusable modal owns camera permission, detector lifecycle, track cleanup, fallback and normalized code delivery.
- ProductForm.tsx: barcode is an editable controlled string and form actions use explicit button types.
- InventoryPanel.tsx: fetchBalances(cursor, searchTerm) composes the warehouse inventory query using URLSearchParams.
- CatalogPanel.tsx: fetchPage(cursor, append, searchTerm) filters catalog using URLSearchParams.
- SalesPanel.tsx: payments are explicit lines; checkout serializes only method, currency, net amount and reference. Money helpers are parseNumeric, formatNumeric and sumNumeric.
- RegisterShiftsPanel.tsx: old footnote and close-form copy contradicted the Reports > Cierres de caja summary.
- Existing jsdom suites and PostgreSQL 18 full-stack E2E are extended in place.

## Decisions

1. Barcode scan only fills a controlled input/search and does not submit a product form, select a product, add to cart or trigger checkout.
2. Inventory scan updates search text and immediately calls the existing selected-warehouse query; Catalog scan updates text and calls the existing catalog query.
3. Cash received is optional and client-only. For a single cash payment it compares against the sale total; for multiple payment lines it compares against that cash line's net amount. The checkout payload remains the net payment amount and excludes tender.
4. Exact arithmetic uses existing parseNumeric bigint and formatNumeric helpers at settlement currency scale. No Number() or parseFloat() is used for money.
5. Register guidance distinguishes digital-only shifts (zero opening/closing cash) from physical cash handling; Reports is the source for expected cash, payment breakdown and differences.

## Acceptance criteria

- [ ] Scanner button and code delivery in ProductForm create/edit, Inventory and Catalog.
- [ ] Existing QuickProductLookup scanner in Consultar precio and Ventas remains unchanged.
- [ ] Register text removes obsolete claims and explains digital-zero and cash-net expectations.
- [ ] Cash change UI shows positive change, exact zero and short tender without altering backend payment values or enabling unsupported mixed-currency settlement.
- [ ] jsdom tests cover each scanner surface, register guidance and exact change/payload behavior.
- [ ] Real full-stack E2E checks scanner affordances, shift guidance and cash-tender calculation on mobile; existing desktop coverage remains.
- [ ] No backend, SQL/migrations, package/dependency/workflow or forbidden visual/manual files changed.
- [ ] Exact-final-SHA GitHub Actions check-runs and workflow runs are all completed/success; PR remains OPEN / Draft.

## Classification

- **Mitigable en v1.1 ($0 / 0 SQL):** scanner affordances, client-only cash change, operator guidance, jsdom/E2E coverage and evidence-first skill.
- **Diferido estructural v1.2:** mixed USD+VES payment settlement in one ticket (blocked by current checkout contract), intermediate cash-drawer movements and void cancellation under migration 0015 triggers. No UI simulation.
- **Invariante no negociable:** SQL/trigger protections, server RBAC and tenant/branch isolation, immutable movement/accounting records, exact monetary arithmetic, FX gates, production freeze, Issue #53 P0 and USD 0 budget.

## Validation and handoff

No local checkout/terminal is available in this execution. Do not claim local Vitest, build, typecheck, Playwright or docs-validator execution. Inspect every exact-SHA GitHub Actions check-run and workflow run after the final commit; report pending/failed results explicitly. After merge in a separately authorized stage, the sole next package is favicon.svg + nine-view Tour Visual E2E (390×844 and 1280×800) + docs/USER_MANUAL.md, followed by Pre-prod Audit → ve-fx-compliance-review → AC-6 → Issue #53.
