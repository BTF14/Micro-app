# Instructions for AI agents — Micro app

## Required startup sequence

Before planning or editing:
1. Read `docs/CURRENT_STATE.md` first; it is the authoritative concise live-state checkpoint and supersedes stale SHA/status snapshots in historical documents. Re-verify GitHub live before acting.
2. Read `docs/HANDOFF_NEXT_CHAT.md` for the continuation protocol and copyable prompt.
3. Read and follow `docs/AI_COLLABORATION_AND_PR_POLICY.md` for mandatory PR scope, review fallback, verification, merge gates, and cross-chat continuity.
4. Read `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/COMPLIANCE_AND_ACCESSIBILITY.md`, and `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`.
5. Read the domain-specific documents relevant to the change (architecture, database schema/review, API integration, security plan, compliance, inspiration).
6. Before any frontend UI/UX design or implementation, read `docs/FRONTEND_DESIGN_STANDARD.md` and follow it together with `.agents/skills/micro-app-stack-guidance/SKILL.md`.
6. Verify live GitHub state: current `main` SHA, branch heads, pull requests, and GitHub Actions for the exact SHA. Historical documentation is a lead, not proof of current state.
7. Separate verified facts, hypotheses, and unknowns. Never fill missing evidence by guessing.

## Project agent skills

- Before work that matches a project skill, read the relevant `.agents/skills/<skill-name>/SKILL.md`: `micro-app-auth-security` for identity/session/authorization, `micro-app-postgres-testing` for DB/migrations/transactions, `micro-app-stack-guidance` for React/Vite + Hono/Workers changes, and `micro-app-skill-curation` for evaluating/installing skills.
- These four files are project-owned instructions, not proof that external packages or tools are installed. Follow their safety boundaries and the live checkpoint.
- AutoSkills external installation remains pending because its CLI could not be run in the current shell due to DNS/network failure. In a network-enabled checkout, start with `npx autoskills --dry-run`; inspect the proposal, source, license, security review, and hashes before installation. Do not fabricate `skills-lock.json` or install irrelevant framework skills.
- Never let a skill override repository policy, product/security approvals, the $0 budget, or restrictions on production and Neon `main`.

## Security priority — approved by the owner 2026-10-26

The owner explicitly prioritized correctness and security over speed: implement and respect every item in `docs/SECURITY_ROADMAP.md`, in the tiered order it defines (Nivel 1 before resuming business-logic work, Nivel 2 before any new human gets access, Nivel 3 as the team grows). Do not skip or relax any item in that document to move faster without a new, explicit instruction from the owner. Update that document's "Estado" field with real evidence whenever a item is completed — never mark something done without a merged PR with green checks, or an explicit confirmation from the owner for steps that require their manual action (e.g. GitHub branch protection, which this agent's network sandbox has been confirmed unable to configure via API — `403 Write access ... not permitted through this proxy` even with an admin-scoped token).

## Non-negotiable project constraints

- This repository is the independent Micro app project. Never mix it with Cantina-pos or other projects.
- Target total cost is **$0**. Do not enable billing, paid plans, cards, subscriptions, or automatic charges.
- Neon primary branch `main` is production-sensitive, not permanently read-only. The AI may apply a necessary, justified mutation only after the production-change gate in `docs/CONSTITUTION.md` is satisfied. **Use disposable PostgreSQL as the first-line test environment. Create/use an isolated Neon branch only when it adds a specific validation that disposable PostgreSQL/CI cannot provide**, with synthetic data, expiry and cleanup. Never use Neon main as a laboratory. Destructive, data-deleting, hard-to-reverse, high-uncertainty, or business-critical data changes require explicit user approval before execution. Never proceed without a verified recovery path, target identity, reviewed migration/SQL, and post-change validation.
- Do not deploy production or make irreversible changes without explicit user acceptance.
- Never commit or disclose secrets, credentials, access tokens, customer data, or database connection strings.
- Do not send emails; only the user can authorize sending.
- The user has authorized safe autonomous code/documentation changes and commits/pushes. Do not ask the user to repeat permissions/connections unless a concrete blocker is demonstrated.
- No force-push. `feat/neon-transaction-adapter` is historical: its work was integrated via PR #1. Do not reopen or merge that branch again. Never blind-merge any future branch; inspect its complete diff against current `main` first.
- Identity status must follow `docs/API_INTEGRATION.md` and live code, not historical static reviews: Google OAuth + allowlist, state/PKCE, revocable session, and Google `email_verified` validation were implemented in PRs #153/#155. Password login/registration remain fail-closed/disabled; account recovery, MFA, full session lifecycle/cleanup, and operation-level authorization remain pending. Never equate authentication with commercial readiness.
- Do not claim a tool, persistent-memory service, agent, or test is installed/running/passing unless there is current evidence. Existing `.github/agents/*.agent.md` files are reusable role instructions, not proof of active autonomous subagents.
- Do not state workflows are green without verifying their conclusion for the exact current SHA.

## README synchronization after verified progress

Whenever a concrete project advance is completed and verified (for example, a feature or security milestone merged with its required checks, or an operational capability proven with reproducible evidence), update `README.md` in the same coherent change or immediately afterward. Describe only the verified current product state, architecture and setup; distinguish implemented, tested, proposed and pending capabilities. Do not advertise incomplete modules, future plans, preview-only behavior or unverified capacity as available. For documentation-only planning, failed/incomplete work or an unverified change, do not present it as a completed product capability; update continuity documents instead. Review README claims against code, tests and live GitHub state before committing.

- Prefer small, reversible, scoped changes with clear acceptance criteria.
- Inspect existing implementation and callers before changing interfaces, schema, auth, or deployment configuration.
- Run relevant tests where available. Record exact command, environment, outcome, SHA, and what was not tested.
- For GitHub Actions, record the workflow run URL and exact `head_sha`; a successful documentation-only CI run does not certify production readiness or absence of vulnerabilities.
- Update `docs/STATE_JOURNAL.md`, `docs/PROJECT_PLAN.md`, and `docs/HANDOFF_NEXT_CHAT.md` after significant checkpoints. Keep journal history append-only and clearly mark the newest verified state.
- Update `docs/RESOURCE_REGISTRY.md` when evaluating tools/sources. Record date, source, conclusion, caveats, and whether the tool was actually executed.
- If documents conflict, verify the code and live GitHub evidence, resolve the contradiction, and document the correction.
- Do not install Gentleman-Programming tools merely because they are documented. Follow `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`, confirm licence, dependencies, provider requirements, security and $0 cost, and test in isolation first.

## Current priorities — authoritative source

Do not maintain a second, potentially stale project-status list in this file. Current priorities, issue gates, PR/branch state and next actions are maintained in `docs/CURRENT_STATE.md` and `docs/HANDOFF_NEXT_CHAT.md`. Read those documents and verify GitHub live on every session before planning or editing.

Stable guardrails remain mandatory regardless of the current task:
- Keep the project cost target at USD 0.
- Use disposable PostgreSQL as the first-line migration/test environment; do not use Neon `main` as a laboratory.
- Do not implement commercial endpoints or operation-level permissions before explicit approval of the role-permission matrix.
- Do not treat context resolvers as authorization.
- Do not claim production readiness, deployed behavior, external AI review, or test success without exact current evidence.
- Follow all other constraints in this file, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, and the relevant domain policies.

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


## Autonomous execution and review fallback

- Treat `docs/CONSTITUTION.md` §9A as mandatory policy. For authorized engineering work, own the technical sequence end to end: inspect live repository/CI/docs, decide routine reversible implementation details, implement, test, review, document, and report.
- Prefer the safest proportionate, maintainable and verifiable solution within the $0 budget. Do not offer A/B/C menus or ask for repeated permission on routine technical choices that can be settled from evidence. Explain the decision briefly.
- Use available repository, CI, and documentation tools rather than delegating checks to the user. Ask for user action only when a real product decision, approval boundary, missing access, or unavailable capability blocks progress; request only the minimum needed.
- Autonomy never authorizes changing product requirements or security/access policy, deploying production, mutating Neon `main`, using real data, exposing secrets/tokens, spending money, or performing destructive/irreversible actions. Preserve explicit approval gates.
- Before completion, verify the exact branch/head SHA and full diff; run relevant tests; review security/regressions; confirm required CI/SAST/E2E on that exact SHA; and update the handoff, plan, and journal when appropriate. Separate recommended, approved, implemented, and verified states.
- Keep continuity in repository documents, not only chat memory. Report blockers precisely and never claim a test, merge, deployment, or fix without evidence.

### Manual review fallback when an AI reviewer is unavailable

- A quota/rate-limit failure is an incomplete review, not approval and not proof of a defect. Record the exact attempted SHA.
- Retrieve original inline comments/review threads when available. Do not infer findings from a summary status alone.
- If review details are unavailable, manually inspect the complete diff against the base, trace changes into relevant callers/tests, and record only concrete evidence-based findings with path/line/impact/test where possible.
- CI, SAST, and E2E complement but do not replace code review. Verify all required checks on the exact current head.
- Do not repeatedly trigger a quota-limited reviewer or pay to bypass it. Resume when capacity is available or use an already-authorized alternative.
- Do not merge while required checks are pending/unverified, or while material findings remain unresolved. Document the limitation and next action in the handoff.
