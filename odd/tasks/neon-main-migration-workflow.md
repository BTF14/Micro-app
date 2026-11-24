# Neon main migration workflow — guarded operator path

**Estado inicial:** autorizado para implementación; pendiente de CI exact-HEAD y revisión del PR.  
**Base de trabajo:** `38d32096b00d8e1601e9e9ef9022eee0147fcbb6`.  
**Rama:** `ops/neon-main-migration-workflow-20261113`.

## Objetivo

Añadir un workflow manual, auditable y fail-closed para que el propietario pueda verificar el ledger de Neon `main` y, solo con una confirmación literal adicional, invocar el runner versionado `scripts/db/migrate.sh` desde GitHub Actions.

## Límites

- Único cambio funcional permitido: `.github/workflows/neon-main-migrations.yml`.
- Sin ejecución del workflow durante esta implementación.
- Sin conexión, lectura ni escritura de Neon `main`; sin acceso o modificación de secretos, roles, grants, datos, Cloudflare o Cron.
- Sin `adopt-baseline.sh apply`: la base ya tiene un ledger poblado.
- El workflow debe exigir evento `workflow_dispatch`, ref exacta `refs/heads/main`, conexión directa, identidad exacta de proyecto/rama/DB/rol y confirmación literal para migrar.
- El modo `verify` no ejecuta DDL/DML. El modo `migrate` usa exclusivamente `scripts/db/migrate.sh` y luego valida ledger, ownership, roles y assertions rollback-safe.

## Criterios de aceptación

1. Solo `workflow_dispatch`, permisos `contents: read`, concurrencia dedicada sin cancelación.
2. Input `verify` (default) / `migrate`; confirmación exacta obligatoria para `migrate`.
3. Rechazo fail-closed de secreto ausente, hostname `-pooler`, identidad SQL distinta o ledger ausente/no contiguo/checksum inconsistente.
4. Resumen legible de migraciones aplicadas y pendientes y de los controles de ownership/roles.
5. En modo `migrate`, invocar el runner canónico, volver a verificar estado y ejecutar assertions rollback-safe de `0022`, `0023`, `0024` y posteriores aplicables.
6. PR no-Draft; ningún merge ni ejecución operativa por este agente. Exigir checks obligatorios en el SHA exacto del HEAD final.

## Evidencia y cierre

Registrar aquí el SHA final, URL/ID del PR, checks exact-HEAD y cualquier limitación de validación. Una PR abierta o CI verde no autoriza ejecutar el workflow ni tocar Neon `main`.
