# ODD task: Issue #53 — zero-cost backup failure alerting (Turno 19)

- Status: **completed and integrated**
- Issue: #53 (OPEN / P0)
- Branch: `security/issue-53-backup-alerting-20261112`
- Base: `main` at `22d71ef03cce2e629137dbc2f83c48ee2c99e640` (squash merge of PR #323)
- Risk: high — failure notification and GitHub issue write permission
- Budget: USD 0; GitHub Actions native `GITHUB_TOKEN` only
- Production: **NOT READY**

## Objective

Provide a passive, zero-cost notification path when the scheduled encrypted backup workflow fails, including checksum/tamper failures. Create or update one open repository issue labelled `P0: Backup Failure`, with a sanitized summary, Caracas-local timestamp, run ID and direct run URL.

## Scope and boundaries

Included:
- Add least-privilege `issues: write` to the backup workflow token permissions; retain `contents: read`.
- Add a failure-only notification step that uses the ephemeral GitHub Actions token, not a PAT or third-party service.
- Ensure the label exists idempotently and create a labelled issue or comment on the existing open alert issue.
- Include run ID, timestamp in `America/Caracas`, a generic sanitized failure category and a direct workflow-run link.
- Keep raw transport output, DSNs, tokens, keys and remote response bodies out of issue content and logs.
- Add deterministic tests for successful-job no-op, failed-job issue creation, and failed-job update/comment behavior.

Excluded:
- Email, SMS, PagerDuty, Twilio, webhooks, paid monitoring or external services.
- Neon access, production backup dispatch, real-data restore, secret reads/rotation, Cloudflare changes, DNS, billing or deployment actions.
- Claiming that an alert has been delivered to a human or that RPO/RTO are certified.

## Acceptance criteria

- [x] AC-1 Alert step runs only when the backup job has failed; a successful job performs no GitHub issue API action.
- [x] AC-2 Workflow uses only the ephemeral `GITHUB_TOKEN` with `issues: write` and existing read-only contents permission.
- [x] AC-3 An open issue with label `P0: Backup Failure` is reused; otherwise create one with that label.
- [x] AC-4 Alert includes run ID, Caracas-local timestamp, generic sanitized failure description and run URL.
- [x] AC-5 No raw logs, credentials, DSNs, age keys, response bodies or customer data enter the issue or console output.
- [x] AC-6 Alert failure does not hide or convert the original backup job failure into success.
- [x] AC-7 Synthetic tests cover success/no-op, create and update paths without network or secrets.
- [ ] AC-8 Issue #53 remains OPEN/P0; `PRODUCTION: NOT READY`.

## Implementation decisions

- Use GitHub CLI already available on GitHub-hosted runners.
- Use `gh label create ... --force` to ensure the exact alert label exists idempotently; label creation is covered by the same narrowly scoped `issues: write` permission.
- Search only open issues with the exact label. Create one if none exists; otherwise append a comment to the existing issue so each failed run is recorded without creating alert spam.
- Set `continue-on-error: true` on the notification step. The workflow's prior failed step remains the authoritative failure signal.
- Use `BACKUP_JOB_STATUS` as a second guard in the helper, making success-path no-op independently testable.
- Use `TZ=America/Caracas` for a stable local timestamp. The run URL is assembled only from GitHub context values after validating repository, run ID and server URL.
- Report only a generic category: a backup step failed, possibly including encryption, checksum verification, transport or retention. Do not parse or publish raw runner logs.

## Tasks and evidence

| Task | Expected result | Validation | Status |
|---|---|---|---|
| Verify post-#323 main and repository policy | Exact base and ODD/PR constraints | GitHub API and canonical docs | completed |
| Create ODD task and isolated branch | Durable task before source edits | Branch and ODD file commit `3fab84af655b6d9e0cfb19c9ae628724ef575fb7` | completed |
| Implement sanitized failure notifier | Idempotent issue/comment behavior | `scripts/backup_failure_alert.sh` reviewed; uses only generic failure text and GitHub context | completed |
| Add deterministic mocked-CLI tests | No-op/create/update coverage | `bash scripts/test_backup_failure_alert.sh` PASS (success no-op, issue create, existing issue comment); static assertions verify failure guard, `continue-on-error`, native token and `issues: write` wiring | completed |
| Wire failure-only workflow step | Native token, least privilege | `issues: write` + `contents: read`; `if: failure()`; `continue-on-error`; contract workflow invokes mocked test and static wiring assertions | completed |
| Open and validate PR #324 | Exact-HEAD required checks green | PR #324 merged; HEAD `eade8fb44f4da3eaf9807c491e3725bec88d14d4`: 19/19 check-runs and 12/12 workflow runs SUCCESS; merge SHA `9238f73462c9b2685465e33ed7081a1ff37757a8` | completed |

## Integration evidence

- PR #324: https://github.com/BTF14/Micro-app/pull/324 — squash-merged.
- PR HEAD: `eade8fb44f4da3eaf9807c491e3725bec88d14d4`; exact-HEAD CI: **19/19 check-runs SUCCESS** and **12/12 workflow runs SUCCESS**.
- Merge commit / current main at integration: `9238f73462c9b2685465e33ed7081a1ff37757a8`.
- Backup workflow contract test passed, including the success no-op, failure create/update paths and static workflow wiring assertions.
- No real backup failure was induced and no production backup was dispatched; human notification delivery is not proven.

## Production gate and handoff

Issue #53 remains OPEN/P0. A GitHub issue is an in-repository alert, not an external page/push notification; delivery latency depends on GitHub notifications and the operator's notification settings. This change does not prove human acknowledgement, schedule reliability, real remote backup success, a real DR drill, RPO/RTO, Neon identity/grants, or production smoke tests.

Never dispatch the backup workflow as part of this task. Never access Neon `main`, real secrets, customer data, billing, Cloudflare configuration or DNS.
