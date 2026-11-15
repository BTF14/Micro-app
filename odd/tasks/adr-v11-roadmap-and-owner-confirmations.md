# ODD task: ADR v1.1 roadmap and owner confirmations

- Status: in progress
- Issue / PR: none yet; single documentation-only PR planned
- Owner / reviewer: repository owner
- Started: 2026-11-14
- Risk: medium (documentation governs future product scope, operational readiness and permissions)

## Objective and authorization

- Desired outcome: record the owner-approved v1.1 product scope and frozen roadmap; preserve explicit owner confirmations in production readiness; reconcile only the four identified stale documentation areas; update continuity and close this task.
- Authorization boundary: one isolated branch and one PR. Changes are limited to `docs/**` and `odd/**`. No `apps/**`, `scripts/**`, workflows, migrations, Neon, secrets, live data, Cloudflare configuration, billing, DNS or manual deployment changes.
- Relevant original request: create this task file first, then execute the four specified documentation blocks in one clean PR; keep PR #193 and Issue #53 open and untouched.

## Scope and exclusions

Included:
- New accepted ADR `docs/decisions/ADR-20261114-v11-product-scope-and-roadmap.md` following `docs/decisions/ADR_TEMPLATE.md`.
- Owner-confirmed operational and fiscal-scope statements in `docs/PRODUCTION_READINESS.md`, without publishing personal or infrastructure identifiers.
- Surgical dated corrections in `docs/COMPLIANCE_REQUIREMENTS.md`, `docs/DATABASE_SCHEMA.md`, `docs/CONSTITUTION.md` §4 and `docs/SAAS_ARCHITECTURE_DECISIONS.md`.
- Continuity updates in `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` and `docs/HANDOFF_NEXT_CHAT.md`; close this task.
- Exact-HEAD CI, `validate-odd-docs`, diff/security review, Squash and Merge and post-merge verification if all gates pass.

Excluded:
- Any source/runtime code, tests, scripts, workflow or SQL changes.
- Neon `main`, production data, secrets, Cloudflare/Google settings, billing, DNS and manual deployment.
- Any mutation to PR #193 or Issue #53, or closing either.
- Declaring production ready or treating owner-confirmed facts as independently verified infrastructure evidence.

## Acceptance criteria

- [ ] AC-1 — ADR captures the owner-confirmed hardware/use boundary, FISC-01 internal-only status, v1.1 freeze and the three ordered PR scopes with all specified technical constraints.
- [ ] AC-2 — Readiness records budget, alert channel, accepted daily RPO and FISC-01 framing as owner-confirmed; keeps `PRODUCTION: NOT READY` and the named gates open.
- [ ] AC-3 — Exactly the four requested stale-document locations receive concise, dated corrections without broad documentation rewrites or weakening security gates.
- [ ] AC-4 — Current state, state journal and handoff point to the ADR, owner confirmations and corrections; this task is marked completed.
- [ ] AC-5 — Only `docs/**` and `odd/**` appear in the PR; `validate-odd-docs` and all required checks pass on the exact final PR HEAD; complete diff reviewed.
- [ ] AC-6 — Squash merge only after required checks/branch protection pass; post-merge checks verified on the exact merge SHA. PR #193 remains OPEN and unchanged; Issue #53 remains OPEN/P0.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Historical claims are mistaken for current implementation | High | Anchor corrections to current `main` HEAD and code/workflow evidence; preserve dated historical snapshots. |
| Owner confirmations are presented as independent verification | Medium | Label each explicitly as owner-confirmed; distinguish observed GitHub/CI facts from external operational claims. |
| Scope or sensitive infrastructure details leak into docs | High | Review every changed file; no emails, account/project IDs, inherited user-specific subdomains or hardware serials. |
| Documentation implies production approval | High | Preserve `PRODUCTION: NOT READY`; explicitly retain BCV, stability, Issue #53 and final launch gates. |
| Unintended changes outside docs | High | Enforce changed-file allowlist `docs/**` and `odd/**` before merge. |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verify repository access and baseline | Read + push permission; current main/PR #193/Issue #53 recorded | GitHub repo metadata, main commit, PR and issue reads | complete |
| Create task record first | This single ODD task file exists on isolated branch | GitHub contents API create result | complete |
| Write accepted ADR and readiness confirmations | Product decision and owner confirmations recorded | Diff review against owner request and ADR template | pending |
| Reconcile four stale documentation locations | Four surgical dated corrections only | Exact file diff and current-main code/workflow evidence | pending |
| Update continuity and close task | Three continuity docs consistent; task completed | Cross-reference and consistency review | pending |
| Validate and integrate | Exact-HEAD required checks pass; one squash merge | GitHub check-runs/workflows, PR diff/reviews/threads, merge SHA and post-merge checks | pending |

## Technical decisions

- The product freeze remains until the first real BCV rate is observed persisted in Neon `main` at 2026-11-16 22:00 UTC (18:00 VET), followed by an observed stability period.
- The ADR records an approved roadmap, not authorization to implement its future PRs or mutate Neon.
- Current source and GitHub evidence take precedence over contradictory historical prose. Owner-confirmed statements remain attributed to the owner.

## Closure and handoff

- Final commit SHA:
- PR:
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
