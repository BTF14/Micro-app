# ODD task: BCV USD/VES rate ingestion and read API

- Status: in progress (implementation and architecture documentation complete; final CI/review pending)
- Issue / PR: [PR #235](https://github.com/BTF14/Micro-app/pull/235); consolidated replacement for initial PR #234
- Owner / reviewer: repository owner / technical implementation delegated to assistant
- Started: 2026-11-05
- Risk: critical (financial reference data; no sales execution or production database mutation)

## Objective and authorization

- Desired outcome: implement and verify a reliable, auditable BCV USD/VES rate ingestion path, scheduled refresh, and read-only API over the existing `exchange_rates` table.
- Authorization boundary: owner explicitly authorized implementation, correction of defects, and necessary PR merges. Work is isolated on a feature branch. No production deployment, Neon main writes/migrations, secret changes, billing, DNS, or live commercial operations are authorized.
- Relevant original request: finish the BCV API first, then focus on reducing and integrating the accumulated PR backlog.

## Scope and exclusions

Included:
- Validate an external read-only JSON feed whose documented scraper reads the public BCV website.
- Fail closed on stale, malformed, mismatched, implausible, or incomplete source data.
- Persist USD/VES rates idempotently in the existing `exchange_rates` table, preserving sales snapshots.
- Add a read-only endpoint that returns the latest valid rate, effective date, fetch time, provenance, and stale status.
- Add a Cloudflare Worker scheduled handler and deterministic unit tests for parsing, validation, persistence, endpoint behavior, and scheduler wiring.
- Document the source as an unofficial intermediary; never describe it as the BCV's own API.

Excluded:
- Direct writes/migrations against Neon production or any real business data.
- Production deployment or Cloudflare dashboard/secrets changes.
- Sales, payment, inventory, or other commercial endpoints.
- Recalculation or mutation of historical sales.
- KV caching unless a measured need and authorized configuration change justify it.
- Public UI changes before a real business dashboard exists.

## Acceptance criteria

- [ ] AC-1 — source contract and provenance are explicit; BCV Today is identified as unofficial and its scraper's upstream is the public BCV website.
- [ ] AC-2 — source payload and status are validated, including USD positive finite numeric rate, ISO dates, Caracas date, freshness, and matching date metadata.
- [ ] AC-3 — invalid/unavailable source data never overwrites a valid database rate and never produces a zero/default/invented rate.
- [ ] AC-4 — scheduled refresh is configured in UTC and runs at a bounded cadence; unchanged rates do not create duplicate rows or writes; same-date official corrections update the existing source/date row without changing sale snapshots.
- [ ] AC-5 — read API returns latest valid rate with provenance and effective/fetched timestamps; if no valid rate exists it returns a safe service-unavailable response.
- [ ] AC-6 — stale data is explicitly labelled; the last valid rate remains available and is never silently represented as fresh.
- [ ] AC-7 — tests cover valid payload, invalid/missing fields, stale status, date mismatch, duplicate no-op, same-date correction, database failure, no-rate state, and API output.
- [ ] AC-8 — typecheck, unit tests, PostgreSQL migration validation, security checks, and all required CI checks pass on the exact final HEAD.
- [ ] AC-9 — code is reviewed, a PR is created, and it is merged only if checks, branch protection, dependency state, and applicable security gates permit it.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Third-party feed is unofficial or unavailable | High | Disclose provider and upstream; validate source status; fail closed; retain last valid rate. |
| Stale or incorrect financial rate | Critical | Validate dates, freshness, USD value and metadata; expose stale status; never default to zero. |
| Duplicate/corrected source data | Medium | Unique (source,effective_date), conditional upsert only on actual value/status change. |
| Historical sale integrity | Critical | Never recalculate sales; existing sale rate/total snapshots remain immutable. |
| Production data/configuration impact | Critical | Feature branch and CI only; no Neon main, secrets, dashboard, or production deploy. |
| Scope drift into commercial API | High | Keep this work to global public reference data; no sales/inventory/payment endpoints. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect current API/schema/security contracts | Existing table and Worker structure understood | Live main SHA `7b0f057b8c152515005feed40305143c0ebb94b0`; migration 0001 defines `exchange_rates` and unique `(source,effective_date)` | complete |
| Research candidate source | Source behavior and limitations documented | `bcv.today` docs/API/OpenAPI and upstream scraper README inspected 2026-11-05; see `docs/RESOURCE_REGISTRY.md` | complete |
| Implement source validation and persistence | Strict, idempotent ingestion | `apps/api/src/bcv.ts`; conditional upsert and source validation tests | implemented; CI pending |
| Implement read-only endpoint | Safe current-rate contract | `GET /exchange-rates/current`; route tests include no-rate, stale and DB failure | implemented; CI pending |
| Add Worker scheduled handler | Automated bounded polling | `apps/api/src/worker.ts`; `worker.test.ts` verifies `waitUntil`; `wrangler.toml` Cron `0,30 * * * *` | implemented; CI pending |
| Review, PR and merge | Verified integration | PR #235 targets main; first CI exposed a generic test-double typing error, corrected in this consolidated PR | pending final CI/review |

## Technical decisions

- Candidate provider: `https://bcv.today/api/v1/rate.json` plus `/api/v1/status.json`. Its public docs state the scraper fetches `https://www.bcv.org.ve/`; the service explicitly states it is unofficial and disclaims accuracy/uptime guarantees. The API status must therefore be validated and provenance exposed; do not call it an official BCV API.
- Persist source as `bcv.today`, not `BCV`, to avoid falsely representing the intermediary as the issuing authority.
- Use Neon/PostgreSQL as the only persistent source of truth. No KV dependency is required for the first implementation.
- Keep USD as the base currency and VES as the quote currency. Store rates as PostgreSQL NUMERIC; never use binary floating-point for monetary calculations in sales.
- Use a conditional upsert keyed by `(source,effective_date)`: no write for an unchanged rate; update the same row only for a changed value or invalid-to-valid transition. Existing sale snapshots are not recalculated.
- The endpoint is read-only global reference data, not a commercial operation endpoint. Do not add sales/inventory/payment functionality.

## Closure and handoff

- Final commit SHA: pending final CI; current branch is `fix/bcv-rate-validation-20261106` (re-read exact HEAD before merge)
- PR: https://github.com/BTF14/Micro-app/pull/235
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: direct live access to `bcv.org.ve` was unavailable during source verification; the third-party feed's upstream scraper is documented but has no uptime/accuracy guarantee.
- Residual risks: external source outage or upstream scraping changes; monitor freshness and keep last valid value explicitly stale.
- Next step: complete CI on the final PR #235 HEAD, inspect all checks, merge when required gates pass, then close any duplicate PRs only after verifying the integrated diff.