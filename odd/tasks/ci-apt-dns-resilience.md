# ODD task: CI package-install resilience for PostgreSQL and backup tests

- Status: completed
- Issue / PR: PR #287
- Owner / reviewer: BTF14 / independent technical review pending
- Started: 2026-11-11
- Risk: medium

## Objective and authorization

- Desired outcome: prevent transient Ubuntu package-mirror DNS failures from prematurely skipping PostgreSQL migration, integration, and synthetic backup/restore tests.
- Authorization boundary: reversible workflow and documentation changes on the existing integration branch only. No merge, production deployment, Neon writes, real data, secrets, remote role/grant changes, DNS, billing, or destructive Git operations.
- Relevant original request: investigate infrastructure failures, preserve test gates, and continue independent work without declaring skipped tests successful.

## Scope and exclusions

Included:
- Add bounded retries to apt metadata/package installation in the CI, migration-runner, and backup-restore-smoke workflows.
- Keep the final workflow step fail-closed if package installation remains unavailable.
- Record exact-HEAD evidence and limitations.

Excluded:
- Do not skip installation, tests, or restore steps.
- Do not use `--ignore-missing`, `continue-on-error`, or convert infrastructure failures to success.
- Do not download unverified binaries or add paid services.
- Do not alter application code, migrations, production backup workflow, or remote infrastructure.

## Acceptance criteria

- [x] AC-1 — All affected apt operations use bounded retries and explicit network timeouts.
- [x] AC-2 — Persistent DNS/package errors still fail the job; downstream tests remain skipped rather than falsely passed.
- [x] AC-3 — Workflow YAML and shell syntax validate.
- [x] AC-4 — CI, PostgreSQL migration runner, and both synthetic restore profiles execute successfully on the final exact HEAD.
- [x] AC-5 — Any tests not executed are explicitly reported as pending, with cause and exact SHA.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Apt DNS outage blocks tests before execution | High | Bounded retries; never suppress terminal failure |
| Retries extend runner time | Low | Three bounded attempts, finite apt timeouts and backoff |
| Workflow edits accidentally weaken gates | High | Diff review; preserve all test steps and fail-closed semantics |
| Green workflow with skipped steps | Critical | Inspect job steps, not only workflow conclusion |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect exact-HEAD failures | Identify failing step and root cause | HEAD `9bdb6aff8358409a715b8b440b30c3577b16dc32`; Ubuntu 26.04 apt logs show temporary DNS failures for Ubuntu archive/security hosts | completed |
| Update affected workflows | Bounded apt retries without bypass | Commit `5ef21974725b91649705ed1bf6e9ae3019ca8e85`; three workflows use the helper | completed |
| Re-run exact-HEAD CI | All relevant test stages execute | 11/11 PR workflows, 3/3 push workflows, 18/18 check-runs SUCCESS on `5ef21974725b91649705ed1bf6e9ae3019ca8e85` | completed |
| Update continuity docs | Preserve live state and next action | CURRENT_STATE, WORK_CHECKPOINT, HANDOFF, STATE_JOURNAL updated in follow-up documentation commit | completed |

## Technical decisions

- Use native apt retry and timeout options plus a bounded outer retry/backoff. This addresses transient mirror DNS failures without assuming a different runner image or introducing an unverified binary source.
- A terminal package-install failure remains a failure. No downstream test is reported as passed unless it actually ran.

## Closure and handoff

- Final tested code commit SHA: `5ef21974725b91649705ed1bf6e9ae3019ca8e85`
- PR: https://github.com/BTF14/Micro-app/pull/287
- Checks and exact outcomes: 11/11 PR workflows SUCCESS; 3/3 push workflows SUCCESS; 18/18 check-runs SUCCESS. CI `43065209868`; migration runner `43065209778`; database migration validation `43065209826`; backup restore `43065209708`; Playwright `43065209886`.
- Acceptance criteria met / unmet: AC-1 through AC-5 met for the tested code SHA.
- Limitations not verified: APT retries cannot recover from an outage that persists beyond the bounded attempts; no production service was touched.
- Residual risks: Ubuntu mirror/network outages can still persist beyond the bounded retry window. Issue #53 remains OPEN/P0; backup production identity is not verified.
- Next step: keep PR #287 Draft and continue the independent Security Level 1/P0 audit; do not use CI success as production readiness.
