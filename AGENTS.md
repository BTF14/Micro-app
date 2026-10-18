# Instructions for AI agents — Micro app

## Required startup sequence

Before planning or editing:
1. Read `docs/HANDOFF_NEXT_CHAT.md` for the latest verified checkpoint and copyable continuation prompt.
2. Read `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, and `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`.
3. Read the domain-specific documents relevant to the change (architecture, database schema/review, API integration, security plan, compliance, inspiration).
4. Verify live GitHub state: current `main` SHA, branch heads, pull requests, and GitHub Actions for the exact SHA. Historical documentation is a lead, not proof of current state.
5. Separate verified facts, hypotheses, and unknowns. Never fill missing evidence by guessing.

## Non-negotiable project constraints

- This repository is the independent Micro app project. Never mix it with Cantina-pos or other projects.
- Target total cost is **$0**. Do not enable billing, paid plans, cards, subscriptions, or automatic charges.
- Neon primary branch `main` is production-sensitive, not permanently read-only. The AI may apply a necessary, justified mutation only after the production-change gate in `docs/CONSTITUTION.md` is satisfied. Prefer disposable PostgreSQL or an isolated Neon branch first. Destructive, data-deleting, hard-to-reverse, high-uncertainty, or business-critical data changes require explicit user approval before execution. Never proceed without a verified recovery path, target identity, reviewed migration/SQL, and post-change validation.
- Do not deploy production or make irreversible changes without explicit user acceptance.
- Never commit or disclose secrets, credentials, access tokens, customer data, or database connection strings.
- Do not send emails; only the user can authorize sending.
- The user has authorized safe autonomous code/documentation changes and commits/pushes. Do not ask the user to repeat permissions/connections unless a concrete blocker is demonstrated.
- No force-push. No blind merge of `feat/neon-transaction-adapter`; inspect the complete diff against current `main` first.
- Identity requirement is a P0: previously agreed Google sign-in + allowlist must be reconciled with actual code. Static review of `apps/api/src/auth.ts` did not find Google OAuth, allowlist, or email verification. Do not claim identity is complete until implementation and tests prove it.
- Do not claim a tool, persistent-memory service, agent, or test is installed/running/passing unless there is current evidence. Existing `.github/agents/*.agent.md` files are reusable role instructions, not proof of active autonomous subagents.
- Do not state workflows are green without verifying their conclusion for the exact current SHA.

## Change and verification protocol

- Prefer small, reversible, scoped changes with clear acceptance criteria.
- Inspect existing implementation and callers before changing interfaces, schema, auth, or deployment configuration.
- Run relevant tests where available. Record exact command, environment, outcome, SHA, and what was not tested.
- For GitHub Actions, record the workflow run URL and exact `head_sha`; a successful documentation-only CI run does not certify production readiness or absence of vulnerabilities.
- Update `docs/STATE_JOURNAL.md`, `docs/PROJECT_PLAN.md`, and `docs/HANDOFF_NEXT_CHAT.md` after significant checkpoints. Keep journal history append-only and clearly mark the newest verified state.
- Update `docs/RESOURCE_REGISTRY.md` when evaluating tools/sources. Record date, source, conclusion, caveats, and whether the tool was actually executed.
- If documents conflict, verify the code and live GitHub evidence, resolve the contradiction, and document the correction.
- Do not install Gentleman-Programming tools merely because they are documented. Follow `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`, confirm licence, dependencies, provider requirements, security and $0 cost, and test in isolation first.

## Current known priorities (re-verify on each session)

1. P0: design/implement/test Google authentication + allowlist against the existing auth model without sending email or guessing provider configuration.
2. Review `feat/neon-transaction-adapter` against current `main`; no blind merge.
3. Expand auth/session/authorization/tenant isolation integration coverage.
4. Continue inventory, validated BCV rate, transactional sales, audit, responsive UI, and E2E in the order defined by the master plan.


## Gentleman-Programming integrations

- Read `docs/GENTLEMAN_IMPLEMENTATION.md` before enabling GGA, Engram, Gentle-AI, or Gentle Shell.
- `.gga` is configured for a local Ollama provider to preserve the $0 budget; it does not mean GGA/Ollama are installed or running.
- Never install or enable a Git hook automatically. First verify GGA + provider manually on a small, non-sensitive diff; document exact evidence and the uninstall path.
- Engram is supplementary local memory, not the source of truth and not available to all chats automatically. Never store secrets or customer data in it.
- Do not state any Gentleman tool is active until its installed version and a successful test are recorded.

## Backups and recovery — mandatory

- Read `docs/BACKUP_AND_RECOVERY.md` before any real-data migration, destructive operation, or production-sensitive change.
- Never claim that automatic backups or restoration are working without current evidence. As of the documented checkpoint, independent automated backups and a successful restore have not been verified.
- The target policy is daily automated database backups to an independent private encrypted destination, plus a health/restore review every 15 days. This is a design target, not a claim of implementation.
- Do not commit database dumps, customer data, inventory exports, sales, payment records, credentials, or connection strings. Do not use GitHub artifacts as an improvised permanent backup destination.
- Before the first real Neon `main` mutation, verify an actual recovery path. Neon Free's short PITR window is an extra recovery layer, not a substitute for independent backups.
