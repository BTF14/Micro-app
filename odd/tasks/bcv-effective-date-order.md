# ODD task: BCV effective-date ordering regression

- Status: in progress
- Issue / PR: [PR #250](https://github.com/BTF14/Micro-app/pull/250), stacked on [PR #227](https://github.com/BTF14/Micro-app/pull/227)
- Owner / reviewer: project technical agent; independent review still pending
- Started: 2026-11-07
- Risk: critical (financial exchange-rate selection)

## Objective and authorization

- Desired outcome: ensure a BCV rate published for tomorrow does not prevent persistence of today's rate, and ensure the API's latest-rate selection continues to return the rate effective today.
- Authorization boundary: scoped code, test, workflow and documentation changes on the existing BCV PR stack. No merge, production deployment, Neon `main`, production data, secrets, billing, or production configuration changes.
- Relevant original request: continue the existing Micro-app technical work, resolve blocked PRs rather than abandoning them, and only advance changes when exact-HEAD verification supports it.

## Scope and exclusions

Included:
- Remove the future-date guard that incorrectly blocks inserting today's distinct effective-date row.
- Preserve idempotency on the unique (source, effective_date) key.
- Add a mocked unit regression and a PostgreSQL integration test using the disposable CI database.
- Ensure CI and migration-runner workflows trigger for the stacked `feat/**` and `fix/**` branch flow.

Excluded:
- Changes to BCV scraping/parsing policy, schema/migrations, exchange-rate API contract, checkout/sales behavior, Neon, secrets, Cloudflare production resources, or deployment.
- Merging #227 or #250 and changing either PR from Draft before all gates/review are satisfied.

## Acceptance criteria

- [x] AC-1 — inserting tomorrow's rate first does not block insertion of today's distinct rate.
- [x] AC-2 — PostgreSQL integration verifies both effective-date rows persist and today's rate is selected using the America/Caracas date boundary.
- [x] AC-3 — replaying the same effective date and value is idempotent and returns `unchanged`.
- [x] AC-4 — CI event filters cover the stacked branch/target combination and the PostgreSQL test is invoked when present.
- [ ] AC-5 — all required workflows pass on the final exact HEAD after branch synchronization.
- [ ] AC-6 — manual/independent review is complete and the PR is explicitly cleared for integration.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Today's official rate is omitted when tomorrow was inserted first | High | Real PostgreSQL regression with reverse date order; assert both rows and latest selection |
| A duplicate fetch rewrites or duplicates history | High | Unique key remains; integration verifies replay returns unchanged |
| CI appears green from an unrelated/older SHA | High | Query all runs by exact current HEAD; rerun after any further commit |
| Stacked PR diverges from base branch | Medium | Preserve both histories with a non-force-forward merge commit; verify compare status ahead/0 behind |
| Accidental production mutation/deployment | Critical | Only disposable CI PostgreSQL; no Neon, secrets, Cloudflare or production actions |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect persistence logic and identify the future-date guard | Root cause isolated | `apps/api/src/exchange-rates.ts`; guard incorrectly treated a later date as a reason not to insert an earlier date | Done |
| Correct insert behavior and add mocked regression | Today's insert is not filtered by future rows | PR #250 unit test; mocked test is supplementary, not database proof | Done |
| Add real PostgreSQL regression | Both rows persist; today's rate wins latest selection | Workflow CI run on SHA `6f4f5073fe566de9a830c758e3ad1a6448477a70`, job `verify`, step `PostgreSQL BCV effective-date integration tests`: success | Done; must rerun on final SHA |
| Repair CI filters for stacked PRs | Workflows execute for PR #250 | #227 branch workflows updated; CI and migration runner observed on PR and push events | Done |
| Synchronize fix branch with updated base without force-push | No base divergence | Merge commit `261b2c71d51e0bbced24962907e516f452f552d7`; compare base `83cf96b7fcb7b0e304f676d21ab721de61364a59` to head: ahead 6 / behind 0 | Done |
| Verify final exact HEAD | Required workflows all pass | Current final HEAD after this task file commit must be re-queried; prior SHA results do not carry forward | Pending |

## Technical decisions

- Use `INSERT ... ON CONFLICT (source, effective_date) DO NOTHING` as the only same-date idempotency guard. A future effective date is not evidence that today's rate already exists.
- The integration test derives dates from PostgreSQL `now() AT TIME ZONE 'America/Caracas'`, matching the API's business-date boundary rather than assuming the runner's UTC date.
- Keep the fix stacked on #227 because it corrects the BCV feature branch's behavior. Do not merge #227 until #250 is resolved and the complete final HEAD is verified.
- The integration test uses the disposable PostgreSQL service in CI. It does not connect to Neon.

## Closure and handoff

- Final commit SHA: pending after this task document is committed.
- PR: https://github.com/BTF14/Micro-app/pull/250
- Checks and exact outcomes: prior code SHA `6f4f5073fe566de9a830c758e3ad1a6448477a70` had CI success (38 steps), PostgreSQL migration runner success, Security scan success and Secret history scan success. These do not certify a later SHA.
- Acceptance criteria met / unmet: AC-1–AC-4 met; AC-5 and AC-6 pending.
- Limitations not verified: BCV live source reliability, deployed Worker behavior, checkout/sale integration in production, and actual deployment configuration.
- Residual risks: PR #227 and #250 remain Draft; no independent review; no production deployment; no Neon migration or production smoke test.
- Next step: verify all workflow runs for the final SHA, inspect the complete diff, then request/complete independent review before changing Draft state or merging.
