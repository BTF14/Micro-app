## Implementation status update — 2026-11-05 10:09 UTC

PR #213 adds runtime rate limiting for Google OAuth start/bootstrap/callback on an independent Draft branch from main; exact HEAD `0c1e5e40eb259cc50d0a3f602e96e07bd88fac32`, 12/12 check-runs and 10/10 workflows success. It uses HMAC-SHA-256 keyed by the existing GOOGLE_CLIENT_SECRET, trusted CF-Connecting-IP, atomic PostgreSQL fixed-window counters, 429/Retry-After, and fail-closed 503. No new migration/secret. It does not rate-limit /auth/me or /auth/logout and is not in main until merged.

The role/permission matrix remains APPROVED (2026-10-31). Main remains `7b0f057b8c152515005feed40305143c0ebb94b0`. PRs #200–#210 are open Draft and not merged; migrations 0005–0009 passed disposable PostgreSQL 18 validation in #210 but are not in main or Neon.

Current handlers:
- Catalog GET is tenant-scoped; all roles can read catalog, but Cashier does not receive cost data.
- Catalog POST/PATCH are Owner/Admin only.
- Inventory count create/confirm are Owner/Admin/Inventory and resolve tenant + branch scope with locks.
- Warehouse/count GET handlers currently exclude Cashier; no HTTP endpoint reads balances or ledger movements for Cashier, although the approved matrix grants branch-scoped inventory read access.
- `authorization.ts` contains role-operation helpers but is not wired as global middleware; route-level checks remain in handlers.
- `auth_rate_limits` now has a runtime caller only in PR #213, not main. OAuth/session endpoints /auth/me and /auth/logout are not rate-limited by this PR.

Issue #53 remains open/P0. Runtime DATABASE_URL principal/ownership/grants remain NO VERIFICADO. Production remains not ready.

