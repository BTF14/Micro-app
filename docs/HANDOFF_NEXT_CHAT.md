# Micro app — handoff for the next ChatGPT chat

**Last reviewed:** 2026-10-17  
**Repository:** https://github.com/BTF14/Micro-app  
**Default branch:** `main`  
**Purpose:** Preserve project decisions and resume work without repeating setup or risking the database.

## Instructions to the next assistant

Continue the existing project; do not restart it or replace its architecture without a concrete reason. First read this document and the linked repository docs, then inspect the current branch and GitHub Actions because CI was failing at the last review.

**Hard constraints**
1. **Do not apply any migration to Neon primary branch `main`.** The user explicitly withheld authorization. Do not call a migration completion action with `apply_changes: true` unless the user later grants explicit, specific approval.
2. Keep all work isolated to **Micro app**. Do not reuse or connect Cantina-pos or any other project's repository, database, credentials, deployment, domain, or configuration.
3. Budget is **$0**. Do not activate billing, paid services, paid subscriptions, or automatic charges. Prefer free tiers and explain their limits.
4. Do not deploy to production or perform irreversible data changes without user acceptance.
5. Never print, commit, log, or put secrets/connection strings in chat. Do not fetch or reveal a DB connection string unless genuinely required for a secure configuration task.
6. Make real, verifiable progress. Inspect CI and actual files before claiming something works. Commit and push useful, verified changes to this repository when safe.

## Product goal

Build a practical, professional point-of-sale (POS) and inventory app for desktop and mobile, with:
- Product catalog, barcodes, stock and stock movements, low-stock alerts, suppliers.
- Sales, payments, change, receipts, returns, reports, and audit trail.
- Authentication and roles.
- Prices and accounting base in USD; VES values derived from the stored BCV exchange rate.
- Responsive UI, keyboard support, accessibility, and automatic/system, light, and dark themes. Manual theme choice must persist.
- Server/database as source of truth. Do not treat browser localStorage as the authoritative store for financial or inventory operations.
- Atomic sale/stock updates, idempotency for sale submissions, immutable sale line/price/rate snapshots, and exact decimal handling. Use PostgreSQL `NUMERIC` and decimal-safe operations, not JS floating point for persisted money.
- Thorough unit, integration and desktop/mobile E2E tests; practical documentation.

## Intended architecture

- **Frontend:** React + Vite + TypeScript, intended for Cloudflare Pages free tier.
- **API:** Hono + TypeScript on Cloudflare Workers free tier.
- **Database:** PostgreSQL on the independent Neon Free project described below.
- **CI:** GitHub Actions.
- Keep deployment portable; document how to run and configure locally.

Avoid assuming free tiers are unlimited or permanent. Do not choose Vercel Hobby for this commercial POS use case; current plan is Cloudflare Pages/Workers + Neon Free.

## Current repository state

Repository: `BTF14/Micro-app`, private, branch `main`.

Key files:
- `apps/web/src/App.tsx`: still a placeholder (“Fundamentos iniciales en construcción”), not a functioning POS yet.
- `apps/web/src/App.test.tsx`: currently tests the placeholder screen.
- `apps/api/src/index.ts`: Hono scaffold with CORS middleware, `GET /health`, JSON 404 and generic JSON 500 handler.
- `apps/api/src/index.test.ts`: API tests for health, JSON 404 and configured-origin CORS.
- `apps/api/wrangler.toml`: Worker config; frontend origin is intentionally not committed as a real production value.
- `package.json`: workspace scripts build and test web + API.
- `.github/workflows/ci.yml`: installs dependencies, builds/typechecks and runs tests; concurrency cancels stale runs.
- `docs/INSPIRATION.md`
- `docs/ARCHITECTURE_AND_ZERO_COST.md`
- `docs/SECURITY.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/DATABASE_SCHEMA.md`

There is **no completed application**, no production-ready auth, no connected API/database, and no production deployment. Do not describe the project as ready for business use.

## Latest commits known

- `2366024f9209f7273412f3fb32b01457645b9edb` — API tests for health, 404, CORS.
- `5d208a2d77facf9d91b7622ad821407b157dfd53` — add Vitest for API.
- `cf602ec66aad331918c778cf68e91a23882ad39b` — run API tests in workspace test script.
- `f23bccc7f4560bd059b481bd44b235e7a35b5097` — cancel stale CI runs on rapid pushes.
- `b313d1b4fe4cb454ee58d9ec8a2d47aa6b1da895` — strengthen DB sale/rate invariants.

## CI status at handoff — important

Latest Actions runs were checked on 2026-10-17:
- [Run 20 — concurrency workflow commit](https://github.com/BTF14/Micro-app/actions/runs/39006164646): **failed**.
- [Run 19 — API tests commit](https://github.com/BTF14/Micro-app/actions/runs/39006151430): **failed**.
- [Run 18 — workspace API tests commit](https://github.com/BTF14/Micro-app/actions/runs/39006149676): **failed**.
- [Run 17 — add Vitest for API](https://github.com/BTF14/Micro-app/actions/runs/39006147308): **passed**.
- Earlier DB invariant commit run [39005869163](https://github.com/BTF14/Micro-app/actions/runs/39005869163): **passed**.

### Diagnosed cause to fix first

Run 20 log shows frontend test passes, but two API tests fail:
- `GET /health` expected 200 but returned 500.
- Unknown route expected 404 but returned 500.
- CORS test passes.

The API middleware reads `c.env.FRONTEND_ORIGIN`. In unit tests, `app.request(...)` is apparently being called without an environment binding, so the origin callback can throw when it accesses `c.env`. Inspect `apps/api/src/index.ts` and `apps/api/src/index.test.ts`, reproduce the issue, and fix the test/runtime-safe handling (for example, safely handle a missing env object or pass explicit Worker env bindings to test requests). Preserve fail-closed CORS behavior: no wildcard origin; only allow the exact configured frontend origin. Add/adjust tests and verify the newest CI run succeeds before moving on.

## Neon database — protected, do not migrate primary

Independent Neon organization: **Micro app DEVBTF**.  
Project: **micro-app-db**.  
Project ID: `restless-fire-99110035`.  
PostgreSQL 18, AWS US East (`aws-us-east-1`), Free tier.  
Primary branch: `main`, branch ID `br-summer-math-b7297a60`; database `neondb`.

At last inspection, the primary branch had **zero application tables**. The schema exists as a migration/preparation in the repository and was tested only on temporary branches. It has **not** been applied to primary. Temporary test branches were cleaned up; latest branch listing showed only `main`.

Never use the other Neon organization named `Vercel: btfcasheb-8016's projects`. It belongs to a different project context and must not be used.

Migration preparation IDs previously used for temporary tests (not authorization to apply):
- `10ff0955-6474-4b6c-9b55-0adcbf95beae`
- `43f7e7c5-b282-4a0a-b8d3-4ef00bb06194`
- `04787db2-1ef2-4b0c-9f34-a3eb5a0241e0`

Temporary validation confirmed nine tables and 27 indexes, decimal precision/scale, negative stock rejection, sale total consistency, and restriction against deleting a sale that has sale items. All test branches were removed afterward. The latest schema includes:
- Sale total check: `total_usd = subtotal_usd - discount_usd`.
- Completed sales require `completed_at`, exchange-rate ID/snapshot and VES total snapshot.
- Sale items reference sales with `ON DELETE RESTRICT` to preserve history.

Read `docs/DATABASE_SCHEMA.md` before changing the schema. Re-verify current Neon state using read-only inspection before any work. Do not run SQL that mutates primary.

## Exchange-rate design

BCV rates must be handled server-side. Third-party sources researched include:
- https://bcv.today/api/ — third-party, not an official BCV API.
- https://rates.dolarvzla.com — third-party.
- https://pydolarve.org/apidocs — third-party API with stated limits.
- https://github.com/Gisus07/tasa-bcv-api — third-party.

Do not represent any of these as the official BCV API. Before implementation, inspect terms, availability and free-tier limits. Design should validate positive rates and dates, record source/effective date/fetch timestamp/status, retain last known valid rate on failures, and indicate stale data. Weekends/holidays should not be marked stale solely because the rate has not changed. Consider a second-source sanity check for unusually large changes. Persist accepted rate history in Neon when DB integration is implemented.

## Security and configuration

- CORS must allow only the exact configured frontend origin; never `*`.
- Do not return stack traces or secrets to clients.
- Internal logging must be redacted and useful; do not dump request bodies, auth headers, or connection strings.
- Store credentials only in the relevant platform's secret manager/local ignored environment file. Never commit `.env` files or real values.
- Review `.gitignore`, security docs and Wrangler config before connecting DB.
- Do not connect the API to Neon or modify primary as part of CI debugging.
- Add authentication/authorization and server-side validation before any business endpoints can be used for real sales.

## UI/design status

The current UI is a placeholder. No visual direction has been selected. Do not assume the provisional palette is approved. Three design directions were recommended for review in ChatGPT Work:
“Diseña Micro app, un sistema profesional de punto de venta e inventario para PC y teléfono. Quiero tres propuestas visuales realmente distintas, no plantillas SaaS genéricas. Busca una identidad propia, sencilla, elegante y funcional, con una pantalla de caja como protagonista y una gestión de inventario coherente. Debe incluir modo claro, modo oscuro y modo automático según el sistema, además de selección manual persistente. Prioriza velocidad de uso, legibilidad, accesibilidad, navegación responsive y una estética comercial cuidada. No construyas todavía la aplicación: muestra las tres propuestas visuales para que pueda elegir una antes de implementar.”

## Recommended next work order

1. Fix the API test failure described above; re-run CI and confirm success on latest `main`.
2. Review `docs/SECURITY.md`, `.gitignore`, `apps/api/wrangler.toml`, and all environment handling. Ensure examples are placeholders only.
3. Check dependency reproducibility. There was no committed `pnpm-lock.yaml` at last inspection and CI uses `pnpm install --no-frozen-lockfile`. Generate a real lockfile with pnpm in a suitable environment if available; never hand-invent a lockfile.
4. Add a minimal, safe API configuration-validation layer and tests without needing real secrets.
5. Once CI is green, build the UI and domain features in small tested steps. First obtain a design choice if possible; otherwise build a restrained accessible shell without pretending the provisional design was approved.
6. Design the API/DB integration and migrations for review only. No migration on primary until the user explicitly approves.
7. Implement and test the business-critical flows in order: products/inventory; exchange rate history; atomic/idempotent sale; payments/change/receipt; returns; reports/audit; auth/roles; responsive UX/E2E.
8. Verify each meaningful commit and state exactly what was tested and what remains incomplete.

## What to tell the user if a decision is needed

Keep questions limited to decisions that block safe progress. The user has already authorized continuing code work and pushing commits when safe; do not repeatedly ask for permission to do ordinary reversible development. The user has **not** authorized the Neon primary migration. Do not ask them to redo connections they already completed unless a concrete missing permission or configuration is demonstrated.
