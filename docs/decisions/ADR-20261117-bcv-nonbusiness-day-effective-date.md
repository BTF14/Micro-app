# ADR-20261117 — BCV effective date on non-banking days without annual manual calendar

- **Status:** Accepted for specification; implementation not authorized by this ADR.
- **Date:** 2026-11-17.
- **Owner decision:** approved.
- **Base:** 25e37dc5dcfb18349a6b7f384d109e493a581c3d.
- **Related:** 0022_bcv_dedicated_producer_role.sql, 0026_fx_contingency_management.sql, AC-6, freeze v1.1.

## Context

The current checkout contract requires a valid BCV rate whose effective date equals the Caracas operation date. A BCV publication can expose a Fecha Valor on the next banking business day. A manually maintained annual SUDEBAN calendar is not a durable dependency because future-year calendars are not necessarily published in advance; the official BCV publication already provides the next value date.

The owner supersedes the 2026-11-08 decision that rejected use of the next-business-day rate during weekends.

## Decision

Do not maintain a manually hardcoded annual banking calendar. Use the official BCV-published effective date, with the following strict precedence:

1. If a valid official BCV row exists for today in America/Caracas, use that row exclusively. A Friday operation continues to use Friday's row even if a Monday row has been prepublished.
2. If no valid row exists for today and today is Saturday or Sunday in Caracas, select the smallest official valid effective_date > today and <= today + 5 days, only when bcv_sync_state.last_error_code IS NULL and last_outcome IN ('inserted','unchanged').
3. If no valid row exists for today and today is Monday–Friday, select the smallest official valid future effective date within the same five-day window only when a successful BCV sync occurred on the current Caracas calendar day: last_success_at >= start of Caracas day and last_error_code IS NULL.
4. Otherwise reject checkout with 409 BCV_RATE_NOT_CURRENT. Never fall back to a previous effective date, invalid row, or future date outside the window.

The sale's actual operation date and the BCV rate's published effective date are separate historical facts and must both be preserved in the immutable sale snapshot.

## Required 0027 specification and migration constraints

- Keep 0022 role/privilege boundaries and sync-state locking; do not broaden producer or runtime grants.
- Keep 0026 financial reconciliation, append-only/audit, payment, stock, recovery and completed-sale invariants.
- Implement only through an additive migration after 0026; do not rewrite historical migrations.
- Update application selection, latest-rate API, BCV panel, contingency recovery and SQL triggers/guards consistently.
- The SQL guard must independently enforce the same date relationship as the API, including direct SQL writes by runtime roles.
- Specify how last_effective_date must cover the selected row and how unchanged proves a successful observation of the current official publication.
- Prove race behavior between sync and checkout, later sync failure, stale healthy state, future row >5 days, no row, invalid row, missing same-day weekday sync, and concurrent updates.
- Test Friday with both Friday and Monday rows, Saturday/Sunday with Monday value date, weekday bank holiday, regular weekday, and failure cases using PostgreSQL ephemeral fixtures.

## QA anti-blind-spots

Carril A must use pure decimal helpers with explicit rounding and boundary tests; no binary float for money, quantities or FX. The future inventory-accounting-review must independently reconcile ledger/balances, sale lines/totals/payments/shift close and prove test sensitivity through deliberate targeted mutants in money, stock and tenant/branch isolation. Use free tooling and synthetic data.

## Consequences and limits

- Product operations on weekends and bank holidays can proceed only when the BCV publication and sync evidence satisfy the approved rules.
- If BCV does not publish a usable value date or the sync evidence is insufficient, checkout remains fail-closed.
- This ADR authorizes writing the 0027 specification only. It does not authorize migration implementation, Neon writes, production rollout, enabling manual FX contingency, or closing AC-6.
- AC-6 remains an independent professional/legal/accounting gate. FX_CONTINGENCY_ENABLED remains off/unconfigured.
- Freeze v1.1, Issue #53 OPEN/P0 and PRODUCTION: NOT READY remain in force.
