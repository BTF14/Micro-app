# ODD task: BCV dedicated Node TLS producer

- Status: in progress
- Issue / PR: [PR #374](https://github.com/BTF14/Micro-app/pull/374) — OPEN, sin auto-merge
- Owner / reviewer: repository owner / technical maintainer
- Started: 2026-11-16
- Risk: critical

## Objective and authorization

- Desired outcome: move BCV ingestion from the Cloudflare Worker runtime to a dedicated GitHub Actions Node 24.22.2 runner that can use the pinned Sectigo DV R36 intermediate without disabling TLS verification, while preserving the checkout fail-closed contract.
- Authorization boundary: one implementation branch and one PR from main `e375e2d4bffb2f6cb083c0d37f0d47a4c87bab0f`. No auto-merge, Neon main access/writes, Secrets inspection or mutation, migrations 0021/0022, real data, manual Cloudflare changes, billing or commercial activation.
- Relevant original request: final architecture agreement and authorization dated 2026-11-16.

## Scope and exclusions

Included:
- `.github/workflows/bcv-sync.yml`
- Node runner entrypoint and shared database/preflight module
- Safe TLS/network/timeout classification
- Worker pause through `BCV_SYNC_ENABLED=false`, preserving triggers
- Unit and PostgreSQL 18 integration tests with injected `pg`
- CI integration step and documentation/ADR/current-state/handoff/readiness updates

Excluded:
- Neon main and production data; GitHub Secrets values or mutation
- SQL/migrations 0021 and 0022; checkout semantics
- Cloudflare dashboard/manual deploy; production activation or auto-merge
- TLS verification bypasses

## Acceptance criteria

- [ ] AC-1 — Node workflow runs at `17 11 * * MON-FRI`, has guarded dispatch with `force_sync`, least privilege, concurrency protection, main-only production execution and 5-minute timeout.
- [ ] AC-2 — Before Node starts, validate pinned certificate fingerprint, subject, issuer, CA basic constraint, server EKU and validity; strict TLS remains enabled.
- [ ] AC-3 — Runner fails closed before DB connection if dedicated URL is missing and verifies both current_user/session_user as `microapp_bcv_sync`.
- [ ] AC-4 — Preflight reads only the 0022-authorized columns and uses source `BCV_OFFICIAL_HTML_V1`; skips only on successful state + today's valid rate + force=false, without mutating sync state.
- [ ] AC-5 — failed/running/NULL or missing/invalid rate runs the shared sync; force=true bypasses skip.
- [ ] AC-6 — A normal second run after today's successful sync cannot overwrite state with failed because it skips; no afternoon retry is scheduled.
- [ ] AC-7 — PostgreSQL 18 integration tests use injected pg and verify role identity, preflight skip, failed-state recovery and runtime-role rejection.
- [ ] AC-8 — TLS/network/timeout errors map to safe allowlisted codes without raw cause/message logging.
- [ ] AC-9 — Worker is configured false with triggers preserved; scheduled unit test asserts the disabled config.
- [ ] AC-10 — All exact-HEAD required workflows/check-runs pass; PR remains open and unmerged.
- [ ] AC-11 — Docs state PRODUCTION NOT READY, Issue #53 OPEN/P0, and Phase 2 gates/priority accurately.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| NODE_EXTRA_CA_CERTS broadens process trust | High | Scope only to runner invocation; validate pin and identity; document added trust is process-wide, not hostname-scoped. |
| Producer permissions differ from assumed preflight | High | Use only 0022 grants: bcv_sync_state(singleton,last_outcome), exchange_rates(id,validation_status). |
| A failed duplicate attempt blocks checkout | Critical | Idempotent preflight; one schedule only; no afternoon retry. |
| GitHub schedule jitter | Medium | Best-effort only; dispatch recovery and explicit event timestamps. |
| Neon WebSocket transport differs from pg | High | First real dispatch is separate owner-operated gate; CI does not claim Neon transport proven. |
| Secret exposure or wrong principal | Critical | Missing secret fail-closed; identity check on every client connection; sanitized logs. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect base, grants and shared sync API | Source ID and least-privilege reads align with migration 0022 | Main SHA and migration 0022 reviewed | completed |
| Implement shared Node runner/preflight | Neon default, injectable pg, strict identity | Unit + PostgreSQL 18 tests | in progress |
| Add strict TLS workflow | Pinned certificate checked before Node | Exact fingerprint/subject/issuer/CA/EKU/validity checks | in progress |
| Pause Cloudflare producer | Config false, triggers retained | Scheduled unit test + Workers Builds after merge | in progress |
| Update operational docs | Handoff, current state, readiness and ADR aligned | PR diff review | in progress |
| Verify final PR | All checks on exact HEAD; no auto-merge | GitHub check-runs and workflow runs | pending |

## Technical decisions

- `BCV_SOURCE_ID` is `BCV_OFFICIAL_HTML_V1`; do not substitute a generic `bcv` alias.
- The preflight deliberately avoids `last_attempt_at`, `last_success_at`, `last_error_code`, `last_effective_date` and `updated_at`, which are not granted to the producer by 0022.
- Neon `Client` is the production default; the shared factory contract allows `pg` in disposable PostgreSQL 18 CI.
- A successful preflight is read-only. Only an actual source fetch and shared sync path may establish success.
- The first real `workflow_dispatch` on main is required to validate Node 24 Neon WebSocket transport.

## Closure and handoff

- Final commit SHA: pending
- PR: pending
- Checks and exact outcomes: pending
- Acceptance criteria met / unmet: pending
- Limitations not verified: production Neon transport and Cloudflare deployment until post-merge owner checks
- Residual risks: GitHub schedule is best-effort; NODE_EXTRA_CA_CERTS extends trust for the isolated Node process
- Next step: verify Workers Builds, owner confirms the dedicated GitHub secret, then first manual dispatch from main; start Phase 2 after first real rate is confirmed in Neon main.
