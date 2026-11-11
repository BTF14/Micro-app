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

## Hardening review — 2026-11-10

### Finding

Migration 0022 checked producer role attributes and membership isolation, but it did not normalize pre-existing direct ACLs on the BCV tables. Table-level REVOKE statements do not clear independent column-level ACLs. The assertions covered selected columns and did not prove that every non-required producer privilege was absent. A pre-existing `microapp_bcv_sync` LOGIN could therefore retain direct grants not created by the migration.

### Decision

- Treat the producer LOGIN as potentially pre-granted/dirty. Reset its table-level privileges and every relevant column-level INSERT/UPDATE/SELECT grant before applying the required grants.
- Narrow producer access to the actual SQL callsites: read only the state columns needed to claim/reconcile an attempt; update only the synchronization columns; read only BCV columns used by `persistBcvOfficialRate`; insert only the columns written by that function; update only `validation_status`.
- Deny producer CREATE on schema `public`; require USAGE only. Keep no role memberships, no INHERIT, no elevated role attributes.
- Expand migration assertions to enumerate table columns and reject any effective producer/runtime INSERT or UPDATE privilege outside the allowlist, as well as DELETE/TRUNCATE and schema CREATE.
- Seed deliberately overprivileged direct table/column grants in the disposable migration-check harness before migration 0022, then prove the migration removes them. Do not test or repair this against Neon.

### Scope and safety

This is a correction inside the unmerged integration branch. Migration 0022 has not been applied to Neon or production. No role, grant, password, secret, Worker, Cron or real data is changed remotely. PostgreSQL 18 disposable CI is the acceptance environment.
### Implementación y evidencia — 2026-11-10

- Migration 0022 elimina ACLs de tabla y de columna para PUBLIC en `bcv_sync_state` y `exchange_rates`, antes de otorgar permisos nominales. Las assertions inspeccionan `pg_class.relacl` y `pg_attribute.attacl` para impedir ACLs PUBLIC residuales.
- El LOGIN productor recibe privilegios por columna: SELECT de `singleton`, `attempt_id`, `last_outcome`; UPDATE de los campos de sincronización; SELECT de `id`, `rate`, `source`, `effective_date`, `validation_status`; INSERT solo de las columnas que escribe el sincronizador; UPDATE únicamente de `validation_status`. No tiene SELECT/INSERT/UPDATE table-level, DELETE, TRUNCATE, REFERENCES ni TRIGGER.
- `microapp_runtime` conserva SELECT table-level para checkout/lectura, pero las assertions enumeran todas las columnas y rechazan cualquier INSERT/UPDATE efectivo a nivel de columna o tabla.
- `public` schema: el migrator no es propietario del esquema y no intenta revocar grants ajenos. El preflight exige USAGE y rechaza CREATE para el productor antes de cambiar ACLs.
- `migration-check.yml` siembra grants deliberadamente amplios de tabla y columna al productor y a PUBLIC; después verifica que migration 0022 los elimina. También concede CREATE al productor como admin, comprueba que el preflight falle con `MICROAPP_BCV_SYNC_SCHEMA_PRIVILEGES_INVALID` y revoca el grant con el propietario.
- La prueba de integración BCV separa los clientes producer/runtime/admin: sincronización e INSERT con producer, lectura/checkout con runtime, limpieza solo con admin. Incluye una prueba que confirma que runtime recibe SQLSTATE `42501` al intentar persistir una tasa.
- SHA `24bcf66c0c570ec76566de03a70b2443e64fc69f`: 11/11 workflows `pull_request` SUCCESS; migration validation, migration runner, CI, BCV effective-date integration con producer LOGIN, runtime-role API integration, Playwright, backup smoke, security scans, dependency review y ODD validation SUCCESS.

## Critical sequencing hardening — 2026-11-11

### New finding

The live migration-check workflow applies 0021, then deliberately tests a failed/rolled-back 0022 and currently expects `microapp_runtime` to retain UPDATE on `bcv_sync_state.last_success_at`. Migration 0021 itself grants runtime column-level UPDATE on all synchronization fields. Because each numbered migration commits independently, a missing/misconfigured `microapp_bcv_sync` LOGIN or any 0022 preflight failure leaves the database at the 0021 state.

That intermediate state is incompatible with the approved isolated-producer architecture: the public API runtime can forge `last_success_at`, `last_outcome` and `last_effective_date`, undermining the database-enforced checkout freshness gate. The 0021 assertion file currently runs only after 0022 in the workflow, so it does not validate the state immediately after 0021.

### Decision

- Migration 0021 must grant `microapp_runtime` SELECT only on `bcv_sync_state`; it must never grant runtime INSERT/UPDATE on that table.
- The isolated BCV Worker remains the only writer and uses its own encrypted `DATABASE_URL` under `microapp_bcv_sync`, as declared in `apps/api/wrangler.bcv.toml`. Do not merge the BCV Worker credential into the API Worker.
- Keep migration 0022 responsible for normalizing any pre-existing PUBLIC/producer ACLs and granting the dedicated producer allowlist. If 0022 fails, the prior 0021 state must remain safe and checkout must fail closed.
- Run `0021_bcv_sync_state.assertions.sql` immediately after applying 0021, before seeding producer ACL fixtures or attempting 0022.
- Change the 0022 rollback test: after its injected failure, prove runtime still has SELECT but no table- or column-level UPDATE on BCV state. Never encode the unsafe intermediate privilege as an expected result.

### Acceptance criteria

- [x] AC-1 — 0021 SQL grants no runtime UPDATE/INSERT on `bcv_sync_state`; runtime retains SELECT only.
- [x] AC-2 — 0021 assertions pass immediately after 0021, before migration 0022.
- [x] AC-3 — Injected 0022 transaction failure preserves the deliberately seeded PUBLIC ACL fixture but adds no direct runtime UPDATE ACL; the clean 0021 state is separately proven read-only before the fixture.
- [x] AC-4 — 0022 still grants the exact producer column allowlist and the runtime lock helper remains callable.
- [ ] AC-5 — BCV integration tests continue to use the isolated producer LOGIN; runtime direct writes fail with SQLSTATE 42501.
- [ ] AC-6 — Full migration-check, migration-runner, CI and exact-HEAD check-runs pass.
- [x] AC-7 — No Neon/main role/grant changes, secrets, Cron activation, Worker deploy or real data are used.

### Scope and safety

This is an integration-branch-only SQL/CI/ODD correction. No production or Neon database has been touched. Do not add remote role provisioning or activate the isolated BCV Worker as part of this task. Preserve the existing separate Worker configuration and its disabled-by-default setting.


Validation note 2026-11-11: AC-1 through AC-4 and AC-7 are complete on the evaluated code SHA; the dedicated migration-check passed. AC-5 and AC-6 remain open because CI, migration runner and restore smoke could not reach their test steps while Ubuntu apt mirrors failed DNS resolution.


## Follow-up hardening — column-level REFERENCES ACL normalization — 2026-11-11

### Finding

Migration 0022 checks table-level REFERENCES privileges and normalizes column-level SELECT/INSERT/UPDATE ACLs, but it does not revoke or assert column-level REFERENCES for the runtime and producer roles. A pre-existing direct column REFERENCES ACL can therefore survive the normalization without being detected by the final assertions. This is not evidence that a remote role currently has such a grant; the migration remains unmerged and remote roles were not inspected.

### Decision

- Normalize the runtime table ACLs to SELECT-only on both BCV tables, then explicitly revoke column-level INSERT/UPDATE/REFERENCES.
- Explicitly revoke column-level REFERENCES from microapp_bcv_sync on both BCV tables before applying the existing narrow allowlist.
- Extend final assertions to reject column-level REFERENCES for runtime and producer, in addition to the existing table-level checks.
- Extend the disposable PostgreSQL 18 fixture with deliberately seeded column-level REFERENCES for runtime, producer and PUBLIC, then prove migration 0022 removes them. Extend the immediate 0021 intermediate-state assertion to cover REFERENCES as well.
- Do not modify remote roles/grants or use Neon.

### Acceptance criteria

- [ ] 0021 intermediate runtime state is SELECT-only with no table/column INSERT, UPDATE, REFERENCES, DELETE, TRUNCATE or TRIGGER.
- [ ] 0022 removes dirty column-level REFERENCES for runtime and producer while preserving only the intended SELECT and producer column allowlists.
- [ ] PostgreSQL assertions enumerate and reject residual column-level REFERENCES.
- [ ] Disposable fixture proves cleanup for both runtime and producer and PUBLIC.
- [ ] Migration validation passes on the exact final SHA; full CI limitations remain classified separately.
