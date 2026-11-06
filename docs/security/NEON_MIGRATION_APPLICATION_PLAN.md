# Plan de aplicación segura de migraciones en Neon — PROPUESTA (no ejecutado)

**Estado:** propuesta del 2026-11-06 UTC, ajustada a `main` tras #245. Nada de este documento se ha ejecutado. Cada fase de escritura requiere autorización específica y posterior del propietario (AGENTS.md; Constitución). Producción sigue **NO LISTA**.

## 1. Hechos verificados (Neon `micro-app-db`, solo lectura, 2026-11-06 UTC)

- Proyecto `restless-fire-99110035`, PostgreSQL 18.6, `history_retention_seconds = 21600` (**solo 6 h de PITR**; no basta como único rollback).
- El esquema público tiene 15 tablas = resultado de **0001 + 0002**. No existen `branches`, `branch_memberships`, `register_shifts`, `warehouses`, `schema_migrations` ni `auth_bootstrap_attempts`. Es decir, **0003 y 0004 tampoco están aplicadas**, no solo la 0005.
- Filas: `app_users` 1, `organizations` 1, `organization_members` 1, `auth_allowlist` 1, `auth_bootstrap` 1 (consumido), `auth_sessions` 6; el resto de tablas de negocio: 0. El propietario afirma que no hay datos reales de negocio; las filas existentes son su identidad de acceso.
- No existen `microapp_runtime` ni `microapp_migrator`. La conexión de auditoría fue `neondb_owner`.
- **Código desplegado por delante del esquema.** Desde #244 el Worker de producción monta rutas de catálogo/inventario que consultan `branches`, `branch_memberships`, `warehouses`, etc. (migraciones 0003+). Esas rutas fallarán en producción hasta que el esquema se adopte; fallan cerradas (error), no exponen datos. Un GET sin sesión a catálogo respondió 401 (observado por otro agente); **no** se ha probado una llamada autenticada, que es justo la que fallaría. Hasta aplicar el plan, no usar el catálogo en producción.
- Como el bootstrap ya está consumido, la 0005 no es urgente: `POST /auth/google` de bootstrap devolvería 503 sin la tabla, y ningún usuario existente depende de ella.

## 2. Decisión: no aplicar la 0005 sola

Aplicarla aislada deja la Neon en un estado (0001, 0002, 0005) que ningún entorno de prueba ejercita y que el runner con ledger rechaza. Se aplica como parte de la secuencia contigua 0001–0016 que ya está en `main`, tras ensayo.

## 3. Procedimiento

### Fase 0 — solo repositorio (sin Neon). Autorizada por el merge permanente.
1. **Ya integrado en `main` (#243–#245):** secuencia 0001–0016 con assertions, runner con ledger que falla cerrado ante esquema poblado sin ledger (`MIGRATION_BASELINE_REQUIRED`) y arnés de roles runtime. No se rehace.
2. **Falta:** el runner necesita un modo de **adopción de baseline**: calcular la huella del catálogo de una base recién construida con 0001–0002 y compararla con la Neon; solo si coincide, registrar 0001–0002 en el ledger. Sin coincidencia, abortar.
3. En PostgreSQL 18 desechable: migraciones completas, rollback inyectado por migración, checksum alterado, hueco de numeración, reejecución idempotente, y pruebas negativas con logins reales `microapp_runtime`/`microapp_migrator` (nunca superusuario ni `SET ROLE`).

### Fase 1 — ensayo en rama Neon (autorización A, reversible)
1. Crear rama Neon `rehearsal-<fecha>` desde `main` (copy-on-write; sin tocar la rama principal).
2. En la rama: crear roles, baseline, migraciones 0003–0016, pruebas de privilegios efectivos y comparación de filas (las 6+1+1+1+1 filas intactas).
3. Smoke del API contra esa rama desde entorno local o preview, **sin** apuntar el Worker de producción.
4. Borrar la rama al terminar o conservarla como evidencia.

### Fase 2 — producción (autorización B, separada y explícita)
Precondiciones: Fase 1 verde; snapshot reciente (`create_snapshot`) más rama de respaldo; ventana acordada; `docs/BACKUP_AND_RECOVERY.md` leído y restore probado en rama.
1. Snapshot de la rama principal.
2. Roles y grants → baseline → migraciones, cada una en su transacción con registro en el ledger.
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
