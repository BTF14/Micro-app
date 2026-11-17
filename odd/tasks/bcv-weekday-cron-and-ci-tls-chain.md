> **Reconciliación posterior — 2026-11-17:** la tarea original evolucionó mediante PR #361 y PR #374. PR #374 está MERGED; el productor operativo temporal es `.github/workflows/bcv-sync.yml` (Node 24.22.2, TLS estricto, Sectigo DV R36 pineada). El Worker `micro-app-bcv-sync` conserva triggers pero está pausado (`BCV_SYNC_ENABLED=false`). Primera ejecución Node #1: SUCCESS / `inserted`; transición a `current`, estabilidad y schedule automático aún pendientes. El campo `Issue / PR: pending` es histórico, no estado vivo.

---

# ODD task: BCV weekday Cron and strict CI TLS chain validation

- Status: completed
- Issue / PR: PR #361 (MERGED; superseded operationally by PR #374)
- Owner / reviewer: repository owner / technical maintainer
- Started: 2026-11-14
- Risk: high

## Objective and authorization

- Desired outcome: schedule the isolated BCV Worker only Monday–Friday at 22:00 UTC and make the manual CI connectivity/parser test validate the live BCV endpoint with normal TLS verification despite its omitted intermediate CA.
- Authorization boundary: one technical PR covering the four named Cron references/tests, the BCV connectivity workflow, and the public CA certificate/verification files. No production deployment, Cloudflare configuration mutation, Neon access or writes, secret access, billing, or real-data changes.
- Relevant original request: correct `0 22 * * 1-5` to `0 22 * * MON-FRI` consistently; resolve `UNABLE_TO_VERIFY_LEAF_SIGNATURE` by supplying and validating the missing Sectigo intermediate without disabling TLS verification.

## Scope and exclusions

Included:
- `apps/api/wrangler.bcv.toml`
- `apps/api/src/index.ts`
- `apps/api/src/index.scheduled.test.ts`
- `apps/api/src/exchange-rates.integration.test.ts`
- `.github/workflows/bcv-source-connectivity.yml`
- A pinned public Sectigo DV R36 intermediate certificate and its fingerprint/metadata.
- A CI-only trust configuration for the manual connectivity test.
- This task and an ADR recording the constrained trust decision.

Excluded:
- Neon `main`, database migrations, secrets, Cloudflare dashboard/Worker settings, Google Cloud, production deploys, and manual changes to the live BCV Worker.
- Any TLS bypass, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `rejectUnauthorized: false`, or application-wide production trust-store changes.
- Claiming the first real BCV rate is persisted in Neon.

## Acceptance criteria

- [x] AC-1 — Worker Cron config, handler predicate, scheduled unit test and PostgreSQL integration test all use exactly `0 22 * * MON-FRI`.
- [x] AC-2 — regression test proves the legacy numeric `0 22 * * 1-5` no longer triggers BCV synchronization.
- [x] AC-3 — CI pins the exact Sectigo Public Server Authentication CA DV R36 certificate, verifies its SHA-256 fingerprint and certificate identity/validity before use.
- [x] AC-4 — `NODE_EXTRA_CA_CERTS` is scoped only to the manual BCV connectivity test process; Node keeps its default trust roots and still validates hostname, validity and certificate signatures.
- [x] AC-5 — the PR-triggered/manual connectivity-parser test succeeds against the real BCV HTTPS endpoint without disabling TLS verification.
- [x] AC-6 — relevant API unit/type checks and PostgreSQL integration tests pass in CI; all required PR checks pass on the exact final HEAD.
- [x] AC-7 — PR diff is limited to this workstream; no Neon, Cloudflare, Google Cloud, secret, migration or production changes.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Trusting a CA certificate more broadly than intended | High | Pin only the publicly trusted, pathLen=0 DV R36 intermediate by SHA-256; limit NODE_EXTRA_CA_CERTS to one manual CI test step; do not alter production Worker trust. |
| Certificate rotation or revocation | Medium | Validate fingerprint, subject, issuer, validity and official Sectigo publication; a changed certificate must fail closed and require review/update. |
| Cron expression mismatch across runtime and tests | High | Update every enumerated reference and add a legacy-expression regression assertion. |
| Accidentally contacting real databases | High | Manual test remains no-database/no-secret; integration suite requires disposable localhost PostgreSQL in CI. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify Cloudflare weekday semantics | MON-FRI is the weekday expression; numeric 1-5 means Sunday–Thursday | Cloudflare Cron Triggers documentation | completed |
| Identify BCV issuing CA | Current wildcard certificate issuer is Sectigo Public Server Authentication CA DV R36 | CT record for `*.bcv.org.ve`; Sectigo official CA hierarchy | completed |
| Record trust decision | CI-only pinned intermediate trust, no TLS bypass | ADR-20261114-bcv-ci-intermediate-trust.md | in progress |
| Align Cron config/handler/tests | All references use MON-FRI; legacy value ignored | Exact-HEAD CI; unit and PostgreSQL integration suites SUCCESS | completed |
| Add and validate CI CA bundle | Exact certificate identity/fingerprint validated before Node test | Two strict-TLS connectivity workflow runs SUCCESS (push + pull_request) | completed |
| Run checks and inspect final diff | Exact-HEAD success, no unrelated mutations | HEAD `d0e0ddf522c07bdf2e7bf0054cf7be079e3f2c90`: 17/17 check-runs and 14/14 workflow runs SUCCESS; 9 files in scope | completed |

## Technical decisions

- Cloudflare weekday names are used instead of weekday numbers to avoid the Sunday=1 convention trap.
- The current CT record for `*.bcv.org.ve` identifies the issuing CA as Sectigo Public Server Authentication CA DV R36. The Sectigo public certificate has SHA-256 fingerprint `8C54C334B66BA4E426772AF4A3F9136C19A1AEC729FDB28C535C07A5A4EF22E0`.
- The intermediate is a CI-only trust anchor because the BCV server omits it. This trust is isolated to the PR-triggered/manual connectivity test process, not Worker production runtime.
- The connectivity workflow retains manual dispatch and also runs on PRs that change its TLS trust input, test, or parser, so this fix is exercised by CI without making unrelated PRs depend on BCV uptime.

## Closure and handoff

- Final commit SHA: `d0e0ddf522c07bdf2e7bf0054cf7be079e3f2c90`
- PR: [#361](https://github.com/BTF14/Micro-app/pull/361), open and eligible for merge after final live-state confirmation.
- Checks and exact outcomes: 17/17 check-runs SUCCESS and 14/14 workflow runs SUCCESS on the exact HEAD. BCV strict-TLS connectivity workflow passed twice (push and pull_request); the live response parsed successfully with effective date 2026-11-16.
- Acceptance criteria met / unmet: AC-1 through AC-7 met in CI; PR merge is the remaining integration step.
- Limitations not verified: first scheduled BCV persistence in Neon `main` remains outside scope and unverified.
- Residual risks: external BCV endpoint may rotate certificates or change its chain; the pinned trust must fail closed until reviewed. The certificate trust applies only to the connectivity-test Node process.
- Next step: merge PR #361 when the live exact-HEAD checks remain green, then verify post-merge main checks. Do not mutate Neon or live Worker configuration.
