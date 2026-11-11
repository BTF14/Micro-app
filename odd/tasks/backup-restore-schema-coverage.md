> **Continuity note — 2026-11-11:** This task was originally implemented on the separate #303 branch. Its main paired-intent profile is now being preserved as an isolated job in the dual-profile integration task at [backup-restore-dual-profile-integration.md](backup-restore-dual-profile-integration.md). The original task history and acceptance rationale remain below; its former instruction to keep the profile separate from #287 is superseded by the explicit two-job design. The implementation remains synthetic/disposable only.

# ODD Task — Backup/restore smoke coverage for the full versioned schema

**Date opened:** 2026-11-10  
**Priority:** P0 / Security Level 1  
**Branch:** `security/backup-restore-schema-coverage-20261110`  
**Base:** `main` at `c5373564413ba086690552c6b7deeab08d7b4a89`  
**Related issue:** #53 (OPEN/P0)  
**MVP deadline:** 2026-12-01 — immovable  
**Production:** NOT READY

## Authorization and scope

This task is limited to strengthening the disposable, synthetic backup/restore verification. It does not authorize production changes, Neon access, secret access, workflow_dispatch against the production backup, Cloudflare changes, or changes to the private backup repository.

Keep the change separate from PR #287. That PR contains migrations 0017–0022 and remains OPEN/Draft; those migrations are not part of main at this task's base. Do not claim that main already contains them or make this task depend on merging #287.

## Observed baseline and defect

On 2026-11-10, the following files were inspected on main:

- `.github/workflows/backup-restore-smoke.yml` blob `0004e714c0806992dec4f87de8f1d79aa579d939`.
- `scripts/test_backup_restore.sh` blob `2ce277b7169b3424099238d237d549fd9dd65ebf`.
- `scripts/db/migrate.sh` and `.github/workflows/migration-runner.yml`.

The smoke script currently applies only migrations 0001, 0002 and 0005, manually. Its fixture/manifest covers 13 tables and excludes `auth_sessions`, `auth_rate_limits`, and `auth_bootstrap_attempts`. Main already has migrations 0001–0016, including branch scope, register shifts, warehouse inventory, count ledger validation, balance-ledger coupling, runtime grants, BCV rate precision, checkout atomicity, and inventory ledger reads. Thus the synthetic restore can pass without exercising those later tables, triggers, constraints, or relationships.

The official migration runner `scripts/db/migrate.sh` is the source of truth for applying the complete numbered migration sequence. It requires direct LOGIN roles `microapp_migrator` and `microapp_runtime` with strict role attributes and membership isolation. The smoke test must use the same disposable-only role model and must not bypass the migration runner.

## Desired outcome

A single CI workflow must prove that the complete schema versioned in the tested ref can be created, populated with a coherent synthetic business scenario, dumped, encrypted, checksummed, decrypted, restored into a second disposable PostgreSQL 18 database, and reconciled without exposing business rows in logs.

## Implementation plan

### 1. Align the disposable environment with the migration runner

- Provision the PostgreSQL 18 service and fixed disposable database names/URLs.
- Create the two non-superuser LOGIN roles with the same safe attributes and isolated memberships required by `scripts/db/migrate.sh`.
- Apply every numbered migration through `bash scripts/db/migrate.sh`; do not manually select a subset or duplicate migration logic.
- Fail closed if any migration is missing, duplicated, out of sequence, or fails.
- Keep all connection targets fixed to the disposable CI service; reject any other hostname, database, or URL before running commands.

### 2. Build a representative synthetic business graph

Create deterministic synthetic records covering, where present in the tested ref:

- tenant, application user, organization membership, allowlist and bootstrap state;
- branch and branch membership;
- register and a valid open/closed shift lifecycle;
- supplier, product, exchange rate and warehouse;
- inventory count header/lines, confirmation, ledger movement, balance projection and ledger intent;
- a completed sale with sale items, payment allocation, matching inventory movement, shift/branch/warehouse references and audit record;
- BCV synchronization state only when the migration exists in the tested ref.

Respect trigger ordering and deferred constraints. For checkout, create the draft and dependent rows in the required order, then complete it so database reconciliation guards execute. For inventory, use the approved immutable movement-ledger path; do not directly mutate balances where triggers prohibit it. Keep all quantities and money exact NUMERIC values.

### 3. Define an explicit, version-aware manifest

- Compare source and restored counts for each required table and a set of key synthetic rows.
- Compare important FK relationships across tenant, branch, warehouse, register shift, sale, payment, inventory movement, balance and audit.
- Verify schema objects needed for restore (constraints, indexes, triggers and functions) using deterministic metadata checks that do not print row data.
- Verify the migration ledger contains every migration in the tested ref with state `applied` and valid checksums.
- Assert the three ephemeral auth tables are absent from the restored dump.
- Do not hardcode a stale total such as 13 as a proxy for schema completeness. Derive the required numbered migration sequence from the checked-out ref and keep the business-table manifest explicit and reviewable.

### 4. Verify encrypted round-trip and recovery evidence

- Dump only the fixed disposable source database.
- Generate an ephemeral age keypair in the runner; never use repository or production keys.
- Encrypt the dump, calculate SHA-256, verify it, decrypt and restore into the fixed disposable target.
- Compare manifests and fail on any mismatch.
- Clean all temporary dump, key and decrypted files in an EXIT trap. Never upload the dump or fixture rows as artifacts.
- Record only elapsed synthetic test duration and pass/fail summaries. Do not print DSNs, tokens, fixture row contents or secrets.

### 5. CI and regression coverage

- Run on pull requests changing the smoke workflow, script, migration files or backup policy.
- Use PostgreSQL 18, same as the migration runner.
- Add tests for fixed-target refusal and for the expected exclusion of ephemeral auth tables.
- Review the complete diff, including workflow permissions, shell quoting, cleanup, and the migration runner interaction.
- Verify all required workflows on the exact final commit SHA; do not reuse parent SHA results.
- Do not merge automatically. PR #53 remains open until backup identity, effective privileges, scope, RPO/RTO, restore and operational alert/cost gates are independently evidenced.

## Separate follow-up for PR #287

PR #287 has migrations 0017–0022 on its own branch. Do not include them in this branch's base-schema assumptions. When those migrations are merged or otherwise tested in a dedicated ref, run the same restore contract against that exact ref and extend the manifest for payment allocation, balance projection, BCV effective-date policy, sync state and dedicated producer role. Verify the exact SHA and role-specific grants. Do not claim the backup role or producer role are least-privilege in Neon based on synthetic CI alone.

## Acceptance criteria

- [ ] Full migration runner applies every numbered migration in the tested ref to disposable PostgreSQL 18.
- [ ] Synthetic fixture satisfies current database triggers and lifecycle constraints.
- [ ] All explicitly required tables, constraints, and cross-table relationships match before and after restore.
- [ ] Encrypted dump checksum, decryption and PostgreSQL restore all pass.
- [ ] Ephemeral auth tables are absent from restored schema.
- [ ] Fixed-target guard rejects non-disposable targets.
- [ ] No secret, DSN, business row, dump, or private key is logged or uploaded.
- [ ] Exact-HEAD CI results are recorded; no inherited/stale status.
- [ ] CURRENT_STATE, STATE_JOURNAL and HANDOFF are reconciled after verified completion.
- [ ] Issue #53 remains open until all independent P0 backup controls are proven.

## Explicit non-goals

- Do not read or rotate GitHub secrets.
- Do not connect to Neon main or any production database.
- Do not run the scheduled/manual production backup workflow.
- Do not modify backup grants, roles, cron, Cloudflare, DNS, billing, or the remote backup repository.
- Do not use real customer, sales, payment or inventory data.
- Do not merge PR #287 or any other PR as part of this task.

## Current state

Task opened after a static audit on 2026-11-10. The finding is recorded in issue #53 comment 6772340874. No code or workflow changes have been made yet. The next action is implementation design against the exact current migrations and existing checkout/inventory integration fixtures, then a disposable CI run.
## Exact schema delta confirmed during follow-up

The current main migration sequence 0001–0016 adds ten persistent tables beyond the old 13-table fixture:

- 0003: `branches`, `branch_memberships`
- 0004: `registers`, `register_shifts`
- 0006: `warehouses`, `inventory_counts`, `inventory_count_lines`, `inventory_balances`, `warehouse_inventory_movements`
- 0010: `inventory_balance_ledger_intents`

The current manifest's 13 persistent tables plus these ten tables equals 23 application tables in the main baseline. The migration runner additionally creates `schema_migrations`; the test must explicitly verify whether this metadata table is included in the dump/restore contract and include it if the intended recovery procedure relies on it. The three ephemeral tables remain excluded: `auth_sessions`, `auth_rate_limits`, `auth_bootstrap_attempts`.

The PR #287 branch has one additional table from migration 0021: `bcv_sync_state`. It is not part of the main baseline at this task's base SHA and must only be included when testing that branch/ref.

Follow-up evidence was added to issue #53 comment 6772383789. No source changes or CI executions have been made.

## CI revalidation note — 2026-11-10

PR #287 HEAD `9a1792f7449ff83915bcdd672686a4860918028d` has 11/11 pull_request workflow runs SUCCESS, including Backup restore smoke run `42849454438`. This does not satisfy this task: the workflow still runs the old script that applies only 0001/0002/0005 and validates 13 tables. The green job is therefore not evidence for full current main schema recovery (0001–0016), much less the PR branch migrations 0017–0022. Follow-up recorded in issue #53 comment `6772538757`. No source/workflow code has been changed yet.

## Estado de implementación — fase 1 (2026-11-10)

**Implementado en PR #303 Draft:**
- Nuevo `scripts/test_backup_restore_schema.sh` que usa PostgreSQL 18 desechable y el migration runner oficial para aplicar todas las migraciones numeradas del ref.
- Crea roles LOGIN sintéticos aislados (migrator/runtime/producer) y bases source/restore fijas.
- Hace dump custom, age key efímera, checksum SHA-256, descifrado y restore en segunda base.
- Compara lista de tablas, constraints, índices, triggers, hashes de definiciones de funciones y ledger de migraciones; comprueba tablas core estables y exclusión de tablas efímeras.
- El workflow ejecuta esta prueba antes del fixture histórico de 13 tablas.

**Pendiente / no aceptar todavía:**
- CI exact-HEAD de PR #303 debe pasar; el SHA final debe revalidarse después de cualquier commit documental.
- El nuevo test es schema-only. Falta poblar y comparar el grafo sintético completo de sucursal/turno/warehouse/count/ledger/checkout y relaciones. El test histórico de datos sigue limitado a 13 tablas.
- Issue #53 no se cierra; identidad efectiva de `DATABASE_URL_BACKUP_RO`, privilegios efectivos least-privilege, RPO/RTO, restore remoto reciente, alerta y coste $0 siguen independientes y pendientes.

No se ha accedido a Neon, secretos, backup remoto ni producción. PR #303 se mantiene Draft y no se fusiona. Fecha límite: 2026-12-01.

## Exact-HEAD validation status — 2026-11-10

PR #303 HEAD `4e369c25bbd7e43072664c2012f6a196cc21eed1`, 30 ahead / 0 behind main, OPEN/Draft, mergeable=true. The latest exact-SHA query returned 0 pull_request workflow runs and 0 legacy status contexts. This is **not** a passing CI result; keep the PR Draft until the workflow execution is observable and all exact-HEAD checks pass. Issue #53 follow-up: `6772761216`.


## Auditoría estática de fase 1 — revisión 2026-11-10

PR #303 HEAD vivo revalidado: `3439c51b5719315e46196f7eca57cffee5a76df2`, OPEN/Draft, 37 ahead / 0 behind main, mergeable=true, 11/11 workflow runs `pull_request` SUCCESS exact-HEAD, 0 legacy status contexts, 0 reviews y 0 threads. La nota histórica de HEAD `4e369c25...` y 0 workflows queda supersedida.

### Cobertura confirmada

- PostgreSQL 18 desechable, bases source/restore fijas, migration runner oficial, ledger, dump custom, age key efímera, SHA-256, descifrado, restore y comparación de tablas/constraints/indexes/triggers/secuencias/extensiones/funciones/ledger.
- Workflow con `permissions: contents: read`; no consume secretos ni usa Neon.
- La prueba de fase 1 es schema-only y no sustituye el fixture poblado.

### Límites detectados

- `pg_dump` y `pg_restore` usan `--no-owner --no-privileges`: no preservan ni demuestran ownership/ACL/grants del origen.
- El manifest no compara RLS activado/forzado ni `pg_policies`, ACL/grants efectivos, atributos/membresías de roles, `pg_default_acl` o `search_path` efectivo.
- El runner comprueba atributos/memberships de `microapp_migrator` y `microapp_runtime`; el rol sintético `microapp_bcv_sync` creado por el smoke no queda validado por esas aserciones en el baseline main.
- Estos son límites de evidencia detectados por lectura estática; no se han observado fallos de ejecución ni se ha demostrado una vulnerabilidad explotable.

### Diseño de fase 2: perfiles por ref

No mezclar main 0001–0016 con PR #287 0017–0022. Main 0001–0016 ya contiene checkout branch-aware en migration 0015 (`branch_id`, `register_shift_id`, `warehouse_id`, `settlement_currency`, `request_hash`) y pairing de balance/ledger por migration 0010. Por tanto:

1. Perfil main: organización/usuario/membresía, branch/branch membership, register/shift, supplier/product/rate, warehouse, count/lines, movimiento/ledger/balance, venta completada/pagos de una moneda y auditoría, con reconciliación de todas las relaciones.
2. Perfil #287 acumulativo: mismo grafo base más BCV effective-date weekday/weekend, payment allocation, ledger projection, BCV sync state y rol productor, ejecutado solo contra el HEAD/ref que realmente contiene 0017–0022.
3. Cada perfil deriva su secuencia de migraciones del ref probado; no importa migraciones desde otra rama ni asume columnas ausentes.

### Estado

No se ha implementado todavía la fase 2 ni se ha ejecutado una restauración con el nuevo grafo poblado. No se ha tocado Neon, secretos, backup remoto, producción, Cron, Cloudflare o datos reales. Issue #53 OPEN/P0; producción NOT READY; deadline 2026-12-01. Siguiente acción: inspeccionar íntegramente las migraciones y fixtures del ref exacto, en particular la variante de ledger de main, antes de escribir el SQL del fixture.


## Estado final de fase 2 — 2026-11-10

**Estado: implementada y CI verificada en PR #303.**

HEAD `87ca92a25538b1b1217cb78b10a6db2fd7726ef0`, OPEN/Draft, 61 ahead / 0 behind main, mergeable=true. 11/11 workflow runs `pull_request` SUCCESS exact-HEAD; 0 legacy status contexts, 0 reviews formales y 0 threads.

### Entregables

- `scripts/backup_restore_fixture_main.sql`: grafo sintético de dos tenants, usuarios/roles/membresías, sucursales, proveedores/productos/almacenes, conteos opening/physical, balances, ledger, checkout branch-aware, pagos y auditoría.
- `scripts/test_backup_restore_schema.sh`: ejecuta migraciones 0001–0016 mediante runner oficial, fixture, dump cifrado, checksum, descifrado, restore y comparaciones.
- `.github/workflows/backup-restore-smoke.yml`: ejecuta el perfil de esquema/datos y la regresión histórica en PR.

### Resultado probado

Tenant A: apertura 10, conteo físico 11 (expected 10/version 1), venta de 2; balance final 9/version 3. Tenant B: apertura 5; balance 5/version 1. Cuatro movimientos, cero intents pendientes. Dos productos mantienen `stock_quantity=0`; existencias por almacén y ledger son los datos comprobados. Venta: sucursal/turno/almacén, BCV sintético con fecha efectiva actual, pago íntegro USD, movimiento y auditoría.

La restauración conserva owners/ACL y compara privilegios efectivos, roles/memberships, search_path, RLS/policies, default ACL, secuencias/estado, migraciones y grafo de datos. Los tres tipos de tabla auth efímera se siembran en source y se excluyen de restore. PostgreSQL 18 backup restore smoke SUCCESS; 11/11 workflow runs exact-HEAD SUCCESS.

### Gates que siguen abiertos

- No se restauró el artefacto remoto real ni se midieron RPO/RTO.
- No se probó la identidad efectiva del secreto de backup; no leer secretos.
- No hay evidencia final de alertas externas ni coste operativo $0.
- La fixture SQL no prueba autorización API multi-tenant/branch/role; eso requiere tests específicos y review.
- PR #287 0017–0022 necesita perfil separado para BCV weekend, allocation, ledger projection, sync state y producer role.
- Issue #53 sigue OPEN/P0. Producción NOT READY.

No merge, no main, no deploy, no Neon, no secretos, no Cron, no datos reales. Próxima tarea: fixture de restore separada sobre #287 y continuar gates P0 de #53.


## Límite del backup real y siguiente gate P0 — 2026-11-10

El run programado #20 `42842855127` terminó SUCCESS y publicó artefacto + sidecar (commit remoto `485412b612849a888bccc5858a5272bb7400de76`). No se descargó ni restauró el artefacto real. El workflow `backup.yml` usa `pg_dump --no-owner --no-privileges` y no registra identidad efectiva de `DATABASE_URL_BACKUP_RO`. El workflow manual `backup-real-restore.yml` verifica bytes/checksum y restaura a PG18 efímero, pero usa `--no-owner --no-privileges` y solo comprueba que haya tablas; no se ejecutó por contener datos reales.

La fixture sintética de esta tarea conserva owners/ACL y prueba dos tenants, pero no es evidencia de metadata ni restauración del artefacto real. El rol `backup_readonly` conocido hereda `pg_write_all_data` vía `neon_superuser`; no asumir que sea el principal del secreto. Próxima tarea separada: obtener identidad y privilegios efectivos con consulta read-only no secreta, sin datos de negocio; luego resolver provisioning/restore real, RPO/RTO, alertas y coste. Issue #53 sigue OPEN/P0. No backup manual, no Cron, no secretos.

 
## Estado de revisión — fase 2 y manifiesto ampliado (2026-11-10)

El código de esta tarea quedó validado en PR #303 SHA `f0dc1f90043eff4270d86f461a2dfc07187aa814`, con 11/11 workflows exact-HEAD SUCCESS. El manifiesto incluye columnas/defaults, vistas, particiones, tipos y enum labels, event triggers, estado de constraints/índices/triggers, funciones, extensiones, secuencias, roles, ACL, RLS/policies y search_path. Las aserciones del fixture verifican balances contra suma del ledger, integridad de movimientos, conteos absolutos y reconciliación venta/líneas/pagos.

Se corrigieron dos defectos detectados por CI: concatenación text/char mediante casts explícitos y normalización de attnum tras restore (comparar orden lógico porque pg_dump compacta columnas eliminadas). La ejecución posterior pasó. Job PostgreSQL 18 `42870784682` SUCCESS, 16 migraciones, fixture poblada, age/checksum/restore, 2 s.

La cobertura se limita a main 0001–0016. La variante PR #287 0017–0022 queda fuera y requiere prueba separada. La tarea de fase 2 para main queda completada técnicamente, pero no cierra issue #53 ni readiness productiva: falta principal efectivo/least privilege, restore de artefacto remoto, RPO/RTO, alertas y coste $0. Issue #53 OPEN/P0. No merge, no deploy, no Neon, no secretos, no Cron ni datos reales.
