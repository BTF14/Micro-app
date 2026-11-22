---
name: micro-app-evidence-criterion
description: Apply evidence-first technical judgment to Micro-app architecture, security, accounting, FX, RBAC, database and UI decisions.
---

# Evidence-first technical criterion

## Required evidence before advice or design

1. Read the relevant source, migrations, triggers, constraints, tests and project invariants in the current repository revision before answering, proposing a design or changing code. Prefer executable code and database contracts over summaries or assumptions.
2. Trace the complete path: UI → API → authorization → SQL functions/triggers/constraints → persisted values → tests. Cite exact repository paths and line ranges for consequential claims; if line numbers are unavailable, identify the exact symbol and file.
3. Verify tests that actually exercise the behavior. A green workflow, typecheck, mock-only test or documentation statement is not proof of a database invariant. Never reuse CI evidence from a different commit SHA.
4. State what was inspected, what was unavailable and what remains unverified. Never claim local commands, database access, browser execution or deployment that did not occur.

## Independent technical judgment

- Do not agree merely to be agreeable. Challenge a proposal when repository evidence contradicts it.
- If an idea violates an SQL invariant, FX gate, RBAC boundary, tenant/branch isolation, accounting contract or requires an unauthorized migration, stop that part and explain the conflict with file/symbol/line evidence.
- Do not bypass triggers, constraints, approvals, feature flags, production freezes or user-authority boundaries to make a UI appear to work.
- Keep money as exact decimal strings / integer minor units using existing helpers. Never use JavaScript Number() or parseFloat() for monetary values.
- Prefer $0, existing dependencies and local project-owned guidance. Never add secrets, tokens, customer data or paid-service requirements to skills or documentation.

## Mandatory classification of every material finding

Classify each finding explicitly into one category:

### (a) Mitigable en v1.1 ($0 / 0 SQL)

UI clarity, accessibility, client-side validation, exact-decimal presentation, tests, documentation, safe query composition and other changes that preserve existing backend contracts and database invariants. State the precise no-SQL boundary.

### (b) Diferido estructural v1.2

Changes requiring a deliberate contract/data-model decision, backend or migration work, or separately authorized security/accounting review. Examples: mixed USD+VES settlement in one ticket when blocked by apps/api/src/sales-checkout.ts; intermediate cash-drawer movements; and void cancellation under triggers introduced in migration 0015. Do not simulate these capabilities in the UI or silently alter the accounting model.

### (c) Invariante no negociable

Tenant/branch isolation, server-side RBAC, immutable ledger and audit evidence, SQL constraints/triggers, exact money arithmetic, FX authorization and feature gates, no production writes without approval, no unauthorized migrations, zero-secret handling, and explicit freeze/readiness/budget gates. Never trade these away for convenience.

## Response and change discipline

- Separate observed facts, deductions and recommendations.
- For conflicts, show the smallest decisive evidence and explain the consequence; do not hide uncertainty.
- Before editing, confirm requested scope and exclusions against the current branch/base. Keep diffs minimal and tests adjacent to behavior.
- Review the final diff and exact-SHA CI/check-runs. Draft PRs remain unmerged unless separately authorized.
- A skill is guidance, not proof of installed tools, permissions, execution or approval.
