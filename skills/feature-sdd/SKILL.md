---
name: feature-sdd
description: Run a traceable spec-driven workflow for Micro app feature requests, from discovery through validation and handoff.
---

# Feature SDD skill

Use for new features or changes to auth, data, inventory, sales, payments, tax/rates, security, dependencies, infrastructure or production readiness.

## Procedure

1. Read `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, and the relevant domain docs.
2. Verify current `main`, target branch, PRs and workflow results. Historical notes are not live evidence.
3. Explore existing code and callers before proposing a design. Do not make assumptions about provider credentials or fiscal rules.
4. Create a feature branch and copy `templates/sdd/spec.md`, `plan.md`, and `tasks.md` into a feature-specific directory under `docs/specs/`. Fill them with concrete criteria. For trivial documentation-only changes, record a compact scope and validation in the PR instead.
5. Plan first. Separate discovery, code implementation, security review and QA. Do not ask two writers to edit the same file concurrently.
6. Implement only the approved scope. Keep changes small and reversible. Never mutate Neon `main`, deploy production, incur costs or expose secrets.
7. Run the most relevant tests available. Verify Actions against the exact final SHA. Report mocks, skipped tests and environment limitations explicitly.
8. Review the diff and address critical/high findings before merging. Never self-certify based only on compilation or a green scanner.
9. Update the progress checklist only when there is evidence for a criterion. Update project plan, state journal, resource registry if tools/sources changed, and handoff.
10. Final report: PR/commit links, SHA, checks and outcomes, acceptance criteria met, remaining risks, and next step.

## Delegation fallback

If the runtime supports subagents, delegate independent bounded read/review tasks. If it does not, perform distinct review passes and state “subagentes no ejecutados; revisión secuencial”. Never invent agent output or claim background work.
