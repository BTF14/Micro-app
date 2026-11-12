# Issue #53 — matriz de roles Neon y auditoría de mínimo privilegio

**Estado:** en implementación/verificación sintética; no autoriza ejecución en Neon.
**Issue:** #53 OPEN / P0.
**Base:** `bd9af0cc5b92858fd5063b3d8d102dbc327469ac`.
**Restricciones:** USD 0; cero lecturas de secretos; cero DDL/DML/conexiones operativas en Neon main; no desplegar.

## Objetivo

Formalizar y comprobar la separación entre identidad runtime, migrador y principal de backup. La identidad efectiva del backup solo se conocerá ejecutando la auditoría con la conexión `DATABASE_URL_BACKUP_RO` en un entorno expresamente autorizado. El nombre del secreto no demuestra qué rol contiene.

## Evidencia previa que condiciona el trabajo

La documentación de seguridad registra una consulta SELECT-only anterior en Neon main: el rol `backup_readonly` tenía `CREATEROLE`, `CREATEDB`, `REPLICATION`, `BYPASSRLS`, membresía en `neon_superuser` y `pg_write_all_data`, además de INSERT/UPDATE/DELETE en `public.products`. No se ha demostrado que ese rol sea el principal de `DATABASE_URL_BACKUP_RO`. No repetir ni ampliar consultas remotas en este trabajo; usar evidencia documentada y pruebas desechables.

## Matriz objetivo

| Principal | Propósito | Atributos / alcance |
|---|---|---|
| `app_runtime` / `microapp_runtime` | API runtime | LOGIN de aplicación; DML estrictamente acotado por contrato; sin SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS ni DDL; no propietario de objetos. |
| `app_migrator` / `microapp_migrator` | Migraciones | Identidad separada, activada solo por pipeline de migraciones; DDL acotado al schema; nunca usada por API ni backup. |
| `microapp_backup` | pg_dump | LOGIN dedicado, NOINHERIT, sin atributos administrativos ni membresías, no owner, CONNECT y USAGE; SELECT sobre tablas; sin DML/DDL ni permisos de uso/actualización de secuencias. |

**Excepción técnica que debe resolverse explícitamente:** PostgreSQL `pg_dump` necesita leer el estado de las secuencias para producir un dump restaurable. El contrato sintético ya probado en `scripts/tests/test_backup_role_privileges.sh` concede SELECT sobre secuencias y niega USAGE/UPDATE. Por ello no se puede prometer “cero privilegios de secuencia” y simultáneamente afirmar que el dump preserva sus valores. La implementación inicial mantiene SELECT de solo lectura y prohíbe USAGE/UPDATE; si el propietario exige cero privilegios incluso de lectura, deberá cambiarse el alcance del backup (p. ej. omitir estado de secuencias) y aceptar/validar sus consecuencias antes de afirmar equivalencia.

## Entregables

- `odd/tasks/security-issue-53-neon-role-matrix.md` (esta tarea).
- `scripts/audit_database_roles.sql`: auditoría fail-closed del usuario conectado, sin DDL/DML.
- `scripts/provision_neon_backup_role.sql`: plantilla idempotente, sin contraseña incrustada; crea NOLOGIN, solicita contraseña con `psql \\password` y solo entonces habilita LOGIN. No ejecutar en Neon en este trabajo.
- Extender la matriz sintética existente para ejecutar la auditoría como el principal de prueba y demostrar denegaciones administrativas/escritura.

## Criterios de aceptación

- [ ] La auditoría identifica el principal efectivo mediante `current_user`; no acepta un nombre supuesto.
- [ ] Falla ante atributos administrativos, membresías, ownership, grants de escritura o RLS que requiera BYPASSRLS.
- [ ] Verifica CONNECT/USAGE/SELECT y distingue SELECT de secuencias de USAGE/UPDATE.
- [ ] El aprovisionamiento no contiene contraseña ni la imprime; no concede membresías ni ownership.
- [ ] La matriz sintética de PostgreSQL 18 prueba resultado positivo y negativo.
- [ ] CI exact-HEAD verde y revisión del diff completo.
- [ ] Ninguna consulta, escritura, migración o cambio de secreto en Neon main.

## Estado de producción

**PRODUCTION: NOT READY.** La certificación real de identidad/grants, backup remoto, aislamiento tenant/sesiones, restore y RPO/RTO permanece pendiente.
