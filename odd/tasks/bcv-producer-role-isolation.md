# ODD task — aislar la identidad productora de BCV

- Date: 2026-11-10
- Risk: high — trusted FX input and checkout freshness gate
- P0 deadline: 2026-12-01 (fixed)
- Branch / PR: `integration/bcv-checkout-rehearsal-20261109` / #287
- Status: implementation in CI validation; not deployed

## Finding

Migration 0021 granted `microapp_runtime` UPDATE on `bcv_sync_state`, including `last_success_at`, `last_outcome` and `last_effective_date`. The same runtime could therefore forge the successful producer state used by the checkout freshness gate. Migration 0013 also granted the runtime INSERT on `exchange_rates` and UPDATE of `validation_status`.

## Decision

Use three independent direct PostgreSQL LOGIN identities:

- `microapp_migrator`: owns schema objects and applies migrations.
- `microapp_runtime`: serves the public API; BCV state and rates are read-only.
- `microapp_bcv_sync`: belongs only to the isolated Cron Worker; writes BCV rates and synchronization state.

No role memberships, inheritance, role escalation, or shared connection string. The dedicated Worker configuration is `apps/api/wrangler.bcv.toml`; it has no workers.dev endpoint or routes and uses its own encrypted `DATABASE_URL` secret. The public API Worker configuration removes the BCV Cron. Do not enable or deploy the Cron until a separate Worker identity/secret has been provisioned and independently verified.

## Database contract

Migration 0022:
- Revokes direct BCV state/rate writes from `microapp_runtime`; preserves SELECT.
- Grants only the required rate INSERT and `validation_status` update plus synchronization-state updates to `microapp_bcv_sync`.
- Keeps immutable rate fields, delete and truncate privileges unavailable to the producer.
- Exposes `lock_bcv_sync_state()`, a migrator-owned SECURITY DEFINER function with pinned `search_path=pg_catalog`, only to runtime EXECUTE. It returns the three checkout gate fields and retains the `FOR SHARE` row lock without granting UPDATE on the underlying table.

## CI evidence and gates

- Disposable PostgreSQL 18 creates separate migrator, runtime and BCV producer LOGINs.
- Migration runner and migration-check harnesses must provision the producer LOGIN in each disposable database.
- Migration assertions verify runtime cannot INSERT/UPDATE/DELETE/TRUNCATE BCV state or rates; producer can perform only required operations; helper ownership, SECURITY DEFINER, pinned search path, PUBLIC denial and runtime-only EXECUTE are checked.
- Runtime SQL smoke must prove direct BCV mutation is denied while the lock helper remains callable.
- BCV integration tests run using the producer LOGIN; checkout HTTP integration continues using the runtime LOGIN and exercises the helper.

## Exclusions

No Neon/production role creation, password rotation, Cloudflare secret change, Worker deployment, Cron activation, or real BCV HTTP run. No production readiness claim.

## Closure criteria

- All workflows and check-runs green on the exact final PR HEAD.
- Independent review of migration 0022, helper function, Worker isolation and grants.
- Separate producer LOGIN/secret provisioned and verified in the intended non-production environment before any activation.
- Formal acceptance of the BCV freshness policy and source/alerting controls.
