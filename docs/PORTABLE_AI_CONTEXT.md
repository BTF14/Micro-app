# Portable AI context and continuity — Micro app

**Canonical repository:** https://github.com/BTF14/Micro-app

This file is the portable continuity entry point for any AI provider, model, coding agent, IDE assistant, or new chat working on Micro app. It is not automatically injected into every AI service. Each session must read it from the repository or be given the copyable prompt below.

## Mandatory startup sequence

1. Read `AGENTS.md`.
2. Read `docs/CURRENT_STATE.md` and verify its SHA/status against live GitHub.
3. Read this file and `docs/HANDOFF_NEXT_CHAT.md`.
4. Read `docs/AI_CONTINUITY_PROTOCOL.md`.
5. Read the task-relevant project skill under `.agents/skills/*/SKILL.md` and relevant domain docs.
6. Verify current default branch/head, open PRs, branch heads, and relevant GitHub Actions. Historical handoff entries are leads, not proof of current status.
7. Separate verified facts, assumptions, pending decisions, and blockers.

## Operating rules that travel across chats

- **Use the terminal when necessary and available.** Inspect the repository, run relevant tests and validation, diagnose failures, inspect Git state and review diffs. Never claim a command ran without evidence. If local network/DNS/dependencies block work, try an authorized alternative such as GitHub Actions and record exactly what ran.
- **Repository is shared memory.** Put durable decisions, evidence, current status, open questions, and next actions in versioned docs. Do not rely on a previous chat, model memory, or a copied summary as the only source of truth.
- **No invented status.** Distinguish proposed, approved, implemented, and verified. Report exact branch/PR/SHA, commands, workflow links and conclusions where relevant.
- **Keep the project independent.** Never mix Micro app with Cantina-pos or other projects.
- **Budget target is $0.** Do not enable billing, paid plans, cards, subscriptions, or automatic charges.
- **Production and data safety.** Do not deploy production, expose secrets, use real customer data, or perform destructive/irreversible changes without the required repository gates and explicit user approval. Treat Neon `main` as production-sensitive; follow `docs/CONSTITUTION.md` and the backup/recovery gate before any mutation.
- **Identity/security decisions remain governed by repository approvals.** Do not invent OAuth configuration, allowlist identities/domains, bootstrap-admin rules, or account-linking policy.
- **No simulated agents/tools.** A role file is not proof a subagent is running. Documentation of a tool is not proof it is installed. A green workflow on an old SHA is not evidence for a new SHA.
- **Finish the loop.** Inspect the full diff, run relevant tests, check CI on the exact final SHA, update the handoff/state journal/plan/resource registry when appropriate, and list remaining uncertainty.

## Copyable prompt for any new AI/chat

> Continue the Micro app project from https://github.com/BTF14/Micro-app. Before answering or editing, read AGENTS.md, docs/CURRENT_STATE.md, docs/PORTABLE_AI_CONTEXT.md, docs/HANDOFF_NEXT_CHAT.md, docs/AI_CONTINUITY_PROTOCOL.md, and the relevant .agents/skills/*/SKILL.md. Verify the live GitHub branch/head, PRs, and checks; old SHA snapshots are historical, not current proof. Use the terminal when necessary and available; if blocked, try an authorized alternative and document the exact evidence. Keep Micro app separate from Cantina-pos, preserve the $0 budget, do not deploy production, expose secrets, use real customer data, or perform destructive/irreversible actions. Do not mutate Neon main unless all repository gates and explicit approvals are satisfied. Make safe scoped changes end to end, run relevant checks, review the full diff, update the handoff and state journal, and report exact evidence. Never fabricate tool/test results. Separate verified facts, assumptions, pending decisions, and blockers.

## Session handoff template

At the end of meaningful work, update the handoff and applicable journal/plan/resource docs with:
- Date, branch, PR (if any), and exact commit SHA.
- Files changed and a short description of the actual change.
- Tests/commands run, environment, results, and what was not tested.
- CI/workflow URLs and conclusions for the exact SHA.
- Decisions made, approvals still needed, risks, blockers, and next concrete action.

Do not erase history to make a snapshot appear current. Mark old entries as historical and put the newest verified checkpoint at the top.

## Important limitation

No repository can force every external AI service or independent chat to read its files. Portability requires that the agent has repository access and follows the startup sequence, or that the prompt above is pasted into that chat. Never claim that all AIs have been automatically notified or synchronized.
