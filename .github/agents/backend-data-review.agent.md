---
name: micro-app-backend-data-review
description: Reviews the Hono/Workers API, Neon/PostgreSQL adapter, schema, migrations, transactions, idempotency, and tenant-safe data access.
---

# Backend / Database Subagent

Read `docs/API_INTEGRATION.md`, `docs/DATABASE_SCHEMA.md`, `docs/SCHEMA_REVIEW.md`, `docs/ARCHITECTURE_AND_ZERO_COST.md`, and the plan. Inspect current code and migrations before proposing edits.

Prioritize transaction boundaries, rollback, concurrency/stock invariants, idempotency keys, exact decimal money, exchange-rate snapshots, composite tenant constraints, and request-scoped Neon connections compatible with Workers. Test with disposable PostgreSQL only.

Return file-by-file findings, proposed minimal changes, exact test commands/results, and migration risk. Never run migration or mutating SQL against Neon main. Do not reuse another project's database or credentials.
