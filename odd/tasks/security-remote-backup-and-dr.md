# ODD task: Issue #53 — remote encrypted backup contract and disaster recovery (Turno 18)

- Status: completed (repository implementation; operational DR drill remains pending)
- Issue: #53 (OPEN / P0)
- Branch: `security/issue-53-remote-backup-dr-contract-20261112`
- Base: `main` at `27c10a5230a095778d692fba1439e0da63a99625`
- Risk: critical
- Budget: USD 0; no billing, cards, paid plans, Neon access or secret reads
- Production: **NOT READY**

## Objective and authorization

Define a portable, auditable contract for encrypted backup storage and operator-led disaster recovery; strengthen the existing GitHub Actions backup transport verification; and prove the complete dump → age encryption → SHA-256 → decrypt → PostgreSQL 18 restore → integrity audit path with disposable CI databases.

The owner authorized repository changes and PR integration only when all gates pass. This task does not authorize creating R2 buckets, API tokens, GitHub secrets, changing remote backup repositories, dispatching production backup workflows, connecting to Neon, or restoring real data.

## Scope and exclusions

Included:
- Document the current backup transport accurately (private Git repository), and an S3-compatible R2 contract as a conditional future target.
- Verify local ciphertext checksum before transfer and independently verify bytes fetched from the remote Git ref after transfer.
- Bound retries and suppress raw transport logs; never echo tokens, DSNs, key material or remote error payloads.
- Document a safe operator DR procedure for a clean PostgreSQL 18 target, including checksum, age decryption, pg_restore, ephemeral auth-table handling and relational integrity checks.
- Extend synthetic CI coverage for the transfer-integrity helper.

Excluded:
- R2 provisioning, account/bucket creation, API credentials, secret configuration, billing or any paid storage.
- Changing the currently configured backup destination or retention.
- Neon main/production connections, DDL/DML, roles/grants, secret reads/rotation, real backups or restores.
- Claiming RPO/RTO targets as achieved without measured evidence.

## Acceptance criteria

- [x] AC-1 Current and proposed storage paths are distinguished; R2 free-tier limits and overage risk are explicit.
- [x] AC-2 Backup workflow verifies the local ciphertext checksum before transfer and remote object bytes after push.
- [x] AC-3 Transport retries are bounded and raw logs cannot disclose credentials or server response bodies.
- [x] AC-4 Synthetic test proves remote bytes match expected SHA-256 and rejects tampering.
- [x] AC-5 PostgreSQL 18 synthetic backup/restore validates the full encrypted round-trip and business relationships.
- [x] AC-6 DR runbook gives safe operator steps and never asks for private age keys in chat or Git.
- [x] AC-7 RPO <24h and RTO <15m remain targets only until a real timed drill and monitoring prove them.
- [x] AC-8 Issue #53 remains OPEN/P0 and PRODUCTION remains NOT READY.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Free-tier overage | High | R2 usage caps are not hard spending caps; no activation without explicit billing-free confirmation and alerts/limits |
| Token/log disclosure | Critical | Askpass, no command-line token, generic failure output, no raw logs |
| Corrupt/incomplete upload | High | SHA-256 local check plus remote byte-for-byte digest verification |
| Restore to wrong database | Critical | Explicit disposable/clean target checks; never Neon main |
| RPO/RTO overclaim | High | Label as objectives until timed operator drill and successful daily schedule evidence |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspect current backup workflow, restore tests and policy | Accurate baseline | GitHub source at base SHA | completed |
| Define storage contract and DR procedure | Operator runbook | PR #322 merged; R2 vendor terms documented | completed |
| Add remote checksum verification and bounded transport retry | Fail-closed transfer | Backup contract tests + remote tamper test SUCCESS in exact HEAD | completed |
| Verify full synthetic restore | PostgreSQL 18 CI | 3 restore profiles SUCCESS in exact HEAD | completed |
| Reconcile PR and production gate | Reproducible handoff | PR #322 MERGED; Issue #53 remains OPEN/P0 | completed |

## Technical decisions

- Keep the existing private Git backup repository as the active destination; do not switch storage in this task.
- Treat Cloudflare R2 as a conditional candidate: Standard storage includes 10 GB-month, 1M Class A and 10M Class B requests monthly, with free egress; usage above allowances is billable. Infrequent Access is not covered by the free tier. A free allowance is not a zero-cost guarantee.
- Use the remote Git blob readback as an independent transport check; ETag is not treated as SHA-256.
- Stream decryption to pg_restore where supported; use pipefail and a clean target DB. Never persist plaintext dumps unless an isolated operator procedure explicitly requires it and guarantees secure cleanup.

## Closure and handoff

- Final PR HEAD: `944711e4a3d95b542d846cc76dc3002a016de290`; merge/main SHA: `a44fe44bd72b1e72cc461c4edb92b2b9c1f20724`
- PR: #322 MERGED (squash)
- Checks: 16/16 workflow runs and 20/20 check-runs SUCCESS on exact PR HEAD; 3 PostgreSQL 18 restore profiles and remote tamper fixture SUCCESS.
- Acceptance criteria: repository implementation AC-1–AC-8 met; real remote backup/DR/RPO/RTO/alerts remain operational gates.
- Limitations not verified: live R2 account/billing, remote backup schedule, real backup identity, real DR drill, RPO/RTO, alerts
- Residual risks: Issue #53 P0 remains open
- Next step: complete operator-led remote backup and DR drill, measure RPO/RTO and configure passive alerts only after cost/security gates; never use Neon main under this task.
