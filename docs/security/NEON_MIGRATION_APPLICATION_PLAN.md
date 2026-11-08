# Estado del repositorio — 2026-11-08 UTC

El estado vivo de main, PRs, SHA, checks y próximos pasos está centralizado en [CURRENT_STATE.md](../CURRENT_STATE.md) y [HANDOFF_NEXT_CHAT.md](../HANDOFF_NEXT_CHAT.md). Los snapshots históricos que siguen en este documento son evidencia temporal: no reutilizar SHA ni resultados CI sin comprobar el HEAD exacto.

- GitHub main protegido: `aa2804a0a6e7879f684b3baeb60646e50f1d6419`; PR #280 integrada por squash.
- Neon rehearsal #42507066215: SUCCESS; migraciones 0001–0019 verificadas únicamente en `microapp_rehearsal`. Neon main no fue modificado.
- Producción: **NOT READY**; no extrapolar el ensayo ni los builds automáticos a certificación productiva.

---
## Reconciliación de PRs de documentación — 2026-11-08 UTC

- PR #265 `docs: reconcile live Neon and integration state after runner merge` mantiene esta reconciliación en una rama protegida y está pendiente de checks exact-HEAD.
- PR #266 se abrió temporalmente para evaluar la integración de main en la rama de #258. GitHub reportó `mergeable=false`; se cerró sin merge. Los cambios se solapan en nueve archivos: CI/migration workflows, `apps/api/src/index.ts` y cinco documentos de estado/plan. La rama #258 permanece intacta.
- No se hizo force-push, merge de #266 ni actualización de #258.

---

## Estado actualizado después de integrar el runner — 2026-11-08 UTC

- PR #264 se fusionó en main mediante commit `c46ed6f3e57a12bf92a7f0718435dfff8096b540`. Workflow manual disponible en `.github/workflows/neon-rehearsal-migrations.yml`.
- Los checks de PR #264 finalizaron SUCCESS en el HEAD `519d66a8bfab0fc9dc1ebbaeeeb0fc5418da391e`. No hay evidencia de que el workflow manual se haya ejecutado ni de que se hayan aplicado migraciones en rehearsal.
- El conector GitHub no permite leer el endpoint de Actions secrets; no se afirma si `NEON_REHEARSAL_DATABASE_URL` existe. No se creó ni modificó secreto alguno.
- Lectura solo de metadatos en Neon main `br-summer-math-b7297a60`: no hay roles runtime/migrator, migration ledger, auth_bootstrap_attempts, branches, warehouses ni inventory_balances; sí auth_rate_limits; exchange_rates.rate NUMERIC(14,6). Main sigue en baseline 0001–0002.
- No se escribió en Neon main, no se aplicaron migraciones remotas, no se modificó Worker DATABASE_URL ni configuración Cloudflare.
- El riesgo del Cron #251 sigue condicionado a que el Worker esté desplegado/activo; deployment y ejecución real no están verificados.

---

## Addendum — Neon main confirmado en vivo por SELECT — 2026-11-08 UTC

Lectura directa y de solo lectura sobre Neon main `br-summer-math-b7297a60`, proyecto `restless-fire-99110035`, base `neondb`, sesión `neondb_owner`:

- No existen roles `microapp_runtime` ni `microapp_migrator`.
- No existen `schema_migrations`, `auth_bootstrap_attempts`, `branches`, `warehouses` ni `inventory_balances`.
- Sí existe `auth_rate_limits`.
- `exchange_rates.rate` continúa `NUMERIC(14,6)`.
- La identidad de la sesión confirmó branch ID `br-summer-math-b7297a60` y project ID `restless-fire-99110035`.

Esto confirma que Neon main sigue en el esquema base 0001–0002, mientras main del repositorio contiene código/migraciones posteriores. El Cron de retención #251 está configurado en el código de main, pero no se ha verificado deployment ni ejecución real. Si está desplegado contra este esquema, la consulta de `auth_bootstrap_attempts` fallará por tabla ausente. No se cambió Neon main; no se ejecutó DDL/DML ni se leyeron filas de negocio.

---

## Addendum — riesgo operativo del Cron de retención #251 — 2026-11-08 UTC

- `main` contiene `[triggers].crons = ["17 * * * *"]` en `apps/api/wrangler.toml`; el handler `scheduled()` ejecuta `cleanupExpiredAuthRecords()` cuando `APP_ENV === "production"`. Esto confirma configuración de Cron en el código de main, **no** confirma que el Worker de producción haya recibido el despliegue ni que el Cron haya ejecutado.
- `cleanupExpiredAuthRecords()` ejecuta dos DELETE independientes: primero `auth_rate_limits`, después `auth_bootstrap_attempts`. `withDatabaseClient()` no abre una transacción alrededor de ambas consultas.
- La última lectura de Neon main documentada en este plan y la rama rehearsal basada en ese snapshot no contienen `auth_bootstrap_attempts`; tampoco están aplicadas las migraciones 0003–0016. Si el Worker con ese Cron ya está desplegado y su `DATABASE_URL` apunta a ese esquema, la segunda consulta fallará por relación ausente; la primera consulta puede haber confirmado por separado. La ejecución real y los logs de Cloudflare siguen sin estar verificados.
- No se desactivó el Cron ni se tocó Cloudflare. El workflow de rehearsal añade postflight para exigir ambas tablas y los SELECT/DELETE mínimos de `microapp_runtime` que necesitan las dos consultas. La solución estructural es ensayar y validar la cadena de migraciones en rehearsal, y mantener Neon main y secretos fuera de alcance hasta la autorización específica de Fase 2/3.
- No revertir #251 automáticamente: primero comprobar despliegue/logs mediante un canal autorizado y completar la ruta de migraciones aislada.

---

## Addendum — runner Neon rehearsal preparado, no activado — 2026-11-08 UTC

- Se preparó en la rama `security/neon-rehearsal-migration-runner-20261108` el workflow `.github/workflows/neon-rehearsal-migrations.yml`.
- El workflow solo admite `workflow_dispatch` desde `main`; el modo predeterminado es `verify`. El modo `adopt-and-migrate` exige escribir la confirmación exacta `APPLY-ONLY-br-curly-poetry-b7dxsddm`.
- Antes de cualquier operación valida en SQL la base `neondb`, el login directo `microapp_migrator`, el branch ID `br-curly-poetry-b7dxsddm` y el project ID `restless-fire-99110035`. Un destino distinto falla cerrado.
- Usa exclusivamente el secreto nuevo `NEON_REHEARSAL_DATABASE_URL`, que debe ser una conexión directa/no pooler de `microapp_migrator` a esa rama de ensayo. El mismo URL se usa para `adopt-baseline.sh` y `migrate.sh`; el esquema actual y la huella exacta 0002 ya fueron comprobados.
- En modo `verify` solo ejecuta `adopt-baseline.sh verify`; en modo `adopt-and-migrate` aplica baseline 0001–0002 y luego la cadena numerada del repositorio mediante `migrate.sh`, seguida de verificaciones de ledger, ownership y grants BCV.
- **No se creó ni modificó ningún secreto y el workflow no se ha ejecutado.** El PR que contiene el workflow es preparación de repositorio; el propietario debe autorizar explícitamente crear/usar el secreto y activar el modo de escritura. Neon main, secretos de producción y Worker `DATABASE_URL` permanecen fuera de alcance.
- El workflow no se dispara por push ni por PR y no tiene ruta a Neon main: está diseñado para ejecución manual y destino fijo de rehearsal.

---

# Addendum vivo — 2026-11-08 UTC — estado de PR y gate del runner

- GitHub main `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`; PR #251 HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, 15/15 check-runs SUCCESS; PR #255 HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251, 13 workflow runs + 15/15 check-runs SUCCESS. Ambas Draft y sin revisión formal.
- Lectura directa actual de Neon main `br-summer-math-b7297a60`: no existen roles `microapp_runtime`/`microapp_migrator`, `schema_migrations`, `auth_bootstrap_attempts`, `branches`, `warehouses`, `inventory_balances` ni `register_shifts`; `exchange_rates.rate` es NUMERIC(14,6).
- Rehearsal `br-curly-poetry-b7dxsddm`: ambos roles LOGIN conectan y no tienen membresías; `public` concede a PUBLIC solo USAGE, migrator tiene USAGE+CREATE y runtime solo USAGE. Los objetos existentes pertenecen a migrator; runtime no tiene permisos SELECT/INSERT/UPDATE/DELETE sobre las tablas comprobadas. No existe `app_schema_migrations` ni se han aplicado 0003–0016. Estos atributos satisfacen el preflight de roles/schema de migration 0012, sujeto a ejecutar el runner con el login migrator.
- La prueba de login de Neon connector como `microapp_runtime` demuestra que ese rol conecta en rehearsal; **no** demuestra que el Worker de Cloudflare use esa credencial.
- `.github/workflows/migration-runner.yml` ejecuta `scripts/db/migrate.sh` en PostgreSQL 18 desechable. No es un runner de release para Neon. El plan sigue requiriendo secreto `NEON_REHEARSAL_DATABASE_URL` y workflow protegido para ejecutar `adopt-baseline.sh verify/apply` y `migrate.sh` en rehearsal.
- No pegar SQL de migraciones en la herramienta Neon: no equivale al runner, omite el ledger/checksums/advisory lock y no demuestra el login directo del migrator. No ejecutar en Neon main. No cambiar secretos.
- Para avanzar en Fase 1 hace falta autorización específica para crear/usar el secreto de rehearsal y activar el workflow protegido. La Fase 2 (Neon main) y Fase 3 (DATABASE_URL del Worker) requieren autorizaciones separadas.

---

# Verificación en vivo adicional — 2026-11-07 UTC (solo lectura)

Proyecto `micro-app-db` (`restless-fire-99110035`), base de datos `neondb`.

- Neon main `br-summer-math-b7297a60`; rehearsal `br-curly-poetry-b7dxsddm` (`rehearsal-baseline-20261107`), parentada a main en LSN `0/27226A8` y timestamp `2026-11-07T13:43:46Z`. Rehearsal está `ready`, no default; main no se modificó.
- Fingerprint consultado en ambas ramas: 133 columnas, 204 constraints PostgreSQL (98 constraints distintos de NOT NULL + 106 NOT NULL), 46 índices, 17 relaciones y 15 tablas. Ambas tienen las mismas tablas públicas. No hay `schema_migrations`, `auth_bootstrap_attempts`, `warehouses`, `inventory_counts`, `inventory_balances` ni `warehouse_inventory_movements`.
- En rehearsal existen roles LOGIN `microapp_migrator` y `microapp_runtime`; ambos logins reales conectan. Migrator tiene public USAGE/CREATE; runtime tiene public USAGE y no CREATE. Runtime no tiene aún SELECT/INSERT/UPDATE/DELETE sobre `auth_rate_limits`; la tabla `auth_bootstrap_attempts` todavía no existe, por tanto sus grants no se pueden probar hasta aplicar migraciones.
- Los 15 objetos de tabla, 46 índices y 2 secuencias existentes aparecen bajo owner `microapp_migrator`. `neondb_owner` conserva membership ADMIN OPTION a ambos roles, con SET FALSE e INHERIT FALSE. Esto es estado del ensayo, no de producción.
- En Neon main solo aparecen los roles `neondb_owner` y `backup_readonly`; no hay roles de aplicación ni ledger. Su huella es igual a rehearsal.
- Consultas usadas fueron SELECT-only. No se ejecutó `adopt-baseline.sh apply`, `migrate.sh`, grants, DDL, escritura de datos ni cambios de secretos.

**Siguiente gate:** el repositorio no contiene actualmente un secret `NEON_REHEARSAL_DATABASE_URL`/migrator ni un workflow de release que invoque los scripts reales. La adopción baseline debe ejecutarse con el runner protegido en la rama rehearsal, no pegando SQL manualmente. El usuario debe autorizar explícitamente cualquier creación de credencial/secret y el uso de ese runner. Neon main, secrets y Cloudflare production permanecen fuera de alcance.

---

# Plan de aplicación segura de migraciones en Neon — Fase 1 parcial; producción no ejecutada

**Estado actualizado:** Fase 1 tiene una rama de ensayo creada y preparada parcialmente; no se ha ejecutado aún `adopt-baseline.sh apply` ni `migrate.sh` en esa rama. Fase 2 (Neon main) y Fase 3 (secreto `DATABASE_URL`) no se han ejecutado. La Fase 1 parcial fue verificada en vivo el 2026-11-07; producción sigue **NO LISTA**. Toda escritura en Neon main y todo cambio de secreto siguen fuera de la autorización general.

## 1. Hechos verificados (Neon `micro-app-db`, solo lectura, 2026-11-06 UTC)

- Proyecto `restless-fire-99110035`, PostgreSQL 18.6, `history_retention_seconds = 21600` (**solo 6 h de PITR**; no basta como único rollback).
- El esquema público tiene 15 tablas = resultado de **0001 + 0002**. No existen `branches`, `branch_memberships`, `register_shifts`, `warehouses`, `schema_migrations` ni `auth_bootstrap_attempts`. Es decir, **0003 y 0004 tampoco están aplicadas**, no solo la 0005.
- Filas: `app_users` 1, `organizations` 1, `organization_members` 1, `auth_allowlist` 1, `auth_bootstrap` 1 (consumido), `auth_sessions` 6; el resto de tablas de negocio: 0. El propietario afirma que no hay datos reales de negocio; las filas existentes son su identidad de acceso.
- No existen `microapp_runtime` ni `microapp_migrator`. La conexión de auditoría fue `neondb_owner`.
- **Código desplegado por delante del esquema.** Desde #244 el Worker de producción monta rutas de catálogo/inventario que consultan `branches`, `branch_memberships`, `warehouses`, etc. (migraciones 0003+). Esas rutas fallarán en producción hasta que el esquema se adopte; fallan cerradas (error), no exponen datos. Un GET sin sesión a catálogo respondió 401 (observado por otro agente); **no** se ha probado una llamada autenticada, que es justo la que fallaría. Hasta aplicar el plan, no usar el catálogo en producción.
- Como el bootstrap ya está consumido, la 0005 no es urgente: `POST /auth/google` de bootstrap devolvería 503 sin la tabla, y ningún usuario existente depende de ella.

## 1b. Evidencia: Neon coincide con 0001+0002 del repositorio

Se ejecutó la huella (solo `SELECT`) sobre Neon `main` (PG 18.6) y sobre una base nueva construida con 0001+0002 (PG 16). Los hashes por tipo coinciden: columnas 133 (`a695404a…`), constraints 98 (`3f0efe69…`), índices 46 (`a977bb66…`), relaciones 17 (`26186200…`). No hay funciones, triggers, tipos ni extensiones en ninguno. Es evidencia estructural, no prueba de que los checksums históricos coincidan.

CI (`migration-runner.yml`) prueba: verify correcto, deriva detectada sin escribir, rechazo sin confirmación, checksums registrados, propiedad transferida, el runner completa 0003–0016 como `microapp_migrator`, una fila centinela se conserva y una segunda adopción se rechaza.

## 1c. Ensayo en rama Neon `rehearsal-baseline-20261107` (`br-curly-poetry-b7dxsddm`, copia de `main`)

Resultados reales (ejecutado con la herramienta SQL de Neon como `neondb_owner`; producción no se tocó):
- `CREATE ROLE` como `neondb_owner` otorga **ADMIN OPTION sin SET ni INHERIT** sobre los roles nuevos. `ALTER TABLE … OWNER TO microapp_migrator` falla con `must be able to SET ROLE`. Segundo bloqueo: el nuevo dueño necesita `CREATE` en `public`.
- Con los grants de esquema del contrato y un `GRANT … WITH SET TRUE, INHERIT FALSE` temporal, los 15 objetos pasaron a `microapp_migrator`. Tras `REVOKE`, `neondb_owner` volvió a tener solo ADMIN OPTION, `pg_auth_members` no tiene membresías del migrator/runtime (lo que exige el preflight del runner), el runtime no tiene `CREATE` y el migrator sí.
- `adopt-baseline.sh` incorpora ambos requisitos y CI los cubre con un escenario de dueño no superusuario.
- Un ensayo en CI con superusuario no habría mostrado ninguno de los dos fallos.

**No demostrado en Neon:** la ejecución real de `migrate.sh` 0003→0016 con login `microapp_migrator`, ni pruebas negativas con login real `microapp_runtime`. El agente no tiene ruta de red a Neon desde su entorno de ejecución (solo la herramienta SQL), y volcar 14 migraciones por esa vía no es una prueba fiel del runner. Ese ensayo lo ejecuta el propietario (o un job con secreto de la rama) apuntando a la rama de ensayo, no a producción. La rama no tiene el ledger todavía: contiene solo los roles, los grants de esquema y la propiedad transferida, y puede borrarse sin efecto en producción.

## 2. Decisión: no aplicar la 0005 sola

Aplicarla aislada deja la Neon en un estado (0001, 0002, 0005) que ningún entorno de prueba ejercita y que el runner con ledger rechaza. Se aplica como parte de la secuencia contigua 0001–0016 que ya está en `main`, tras ensayo.

## 3. Procedimiento

### Fase 0 — solo repositorio (sin Neon). Autorizada por el merge permanente.
1. **Ya integrado en `main` (#243–#245):** secuencia 0001–0016 con assertions, runner con ledger que falla cerrado ante esquema poblado sin ledger (`MIGRATION_BASELINE_REQUIRED`) y arnés de roles runtime. No se rehace.
2. **Hecho en esta entrega:** `scripts/db/adopt-baseline.sh` (`verify` solo lectura; `apply` en una transacción) y `scripts/db/schema_fingerprint.sql`. Compara la estructura viva contra la huella canónica `apps/api/migrations/baselines/0002.schema.txt` (294 hechos de catálogo; excluye propietarios, ACL y datos). Solo si coincide y no hay ledger, crea el ledger, transfiere la propiedad de los objetos a `microapp_migrator` y registra 0001–0002 con los checksums reales del repositorio. `migrate.sh` no se modificó y sigue rechazando un esquema poblado sin ledger. Requiere `ADOPT_BASELINE_CONFIRM=adopt-0002`.
3. En PostgreSQL 18 desechable: migraciones completas, rollback inyectado por migración, checksum alterado, hueco de numeración, reejecución idempotente, y pruebas negativas con logins reales `microapp_runtime`/`microapp_migrator` (nunca superusuario ni `SET ROLE`).

### Fase 1 — ensayo en rama Neon (autorización A, reversible)
1. **Hecho:** existe `rehearsal-baseline-20261107` (`br-curly-poetry-b7dxsddm`), derivada de Neon main (`br-summer-math-b7297a60`). La rama está `ready`; main no se modificó.
2. **Hecho parcialmente:** roles `microapp_migrator` y `microapp_runtime` creados; los 15 objetos existentes aparecen propiedad de `microapp_migrator`; no existe ledger todavía. `neondb_owner` conserva membresías con `ADMIN OPTION` y `SET FALSE`/`INHERIT FALSE`. Las consultas de login confirman que ambos logins conectan; runtime no tiene todavía privilegios de tabla (las migraciones 0003–0016 no se han aplicado). El runner aún no se ha ejecutado.
3. **Pendiente:** ejecutar `adopt-baseline.sh verify` y `apply`, luego `migrate.sh` 0003–0016 usando login directo `microapp_migrator`; después probar permisos negativos/positivos con login directo `microapp_runtime`, preservar y comparar filas, y ejecutar smoke autenticado de API en entorno aislado. No ejecutar desde el SQL tool pegando migraciones una por una: no equivale al runner.
4. **Pendiente:** conservar la rama como evidencia hasta cerrar todas las verificaciones. No borrarla aún.

### Fase 2 — producción (autorización B, separada y explícita)
Precondiciones: Fase 1 verde; snapshot reciente (`create_snapshot`) más rama de respaldo; ventana acordada; `docs/BACKUP_AND_RECOVERY.md` leído y restore probado en rama.
1. Snapshot de la rama principal.
2. Roles y grants de esquema (contrato #222–#224) → `adopt-baseline.sh verify` → `apply` → `migrate.sh` (cada migración en su transacción con registro en el ledger). Precondición comprobada por el script: `microapp_migrator` con USAGE y CREATE en `public`, porque `ALTER … OWNER TO` lo exige.
3. Validación (sección 5). Si falla cualquier comprobación: **detener**.

### Fase 3 — cambio de credenciales (autorización C, la ejecuta el propietario)
Cambiar el secreto `DATABASE_URL` del Worker al login `microapp_runtime`, y el de backup a un rol realmente de solo lectura. Es cambio de secretos: fuera de la autoridad del agente. Hasta entonces el Worker sigue con el rol actual y el mínimo privilegio **no** está demostrado en producción.

## 4. Rollback

- Fallo dentro de una migración: la transacción revierte; el ledger no registra.
- Fallo después de varias migraciones: `restore_snapshot` a rama nueva y `finalize_branch_restore` (reasigna cómputo; **reinicia** el endpoint). Con tan pocos datos, reconstruir las 5 filas de identidad a partir del snapshot es trivial.
- No depender del PITR de 6 h. Subir la retención es decisión del propietario (puede implicar coste; el objetivo es USD 0).
- Roles creados: `DROP OWNED BY` + `DROP ROLE` solo si ningún secreto los usa todavía (por eso la Fase 3 va al final).

## 5. Validación posterior

- Ledger: una fila por migración, checksums idénticos a los del repositorio, sin huecos.
- `has_table_privilege`/`has_column_privilege` para `microapp_runtime` en **todas** las tablas: sin DDL, sin `TRUNCATE`, sin escritura en `audit_logs` más allá de INSERT, sin acceso a `schema_migrations`.
- Pruebas negativas con conexión real del runtime (intento de DROP, ALTER, lectura de ledger, UPDATE de `audit_logs`).
- Conteos: mismas filas que antes en las 6 tablas pobladas.
- Login real del propietario con Google contra la rama/entorno validado (acción manual del propietario).
- Cloudflare: distinguir build exitoso, preview, deployment de producción y respuesta real de endpoints (el agente no alcanza `workers.dev` desde su red; verificarlo exige una máquina con red abierta).
