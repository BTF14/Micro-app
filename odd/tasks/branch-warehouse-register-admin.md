# Administración de estructura organizacional — PR 2

**Estado:** PR #350 OPEN / no-Draft / mergeable=true / no fusionada. HEAD validado `61cd674c47cdba4595e21bd9e6b8f4ecd0f25431`: 25/25 check-runs SUCCESS; revisión formal del Tech Lead pendiente. No habilitada en producción.
**Rama:** `feat/branch-warehouse-register-admin-20261113`
**Base:** `main` actualizado después de PR #349; merge SHA `25c0f842c7ecc8a7320b33d33abfb12402476e32`.
**Fecha:** 2026-11-13 UTC

## Objetivo

Implementar administración exclusiva de Owner para sucursales, almacenes, cajas y asignaciones de miembros por sucursal, conservando aislamiento tenant/branch, mínimo privilegio PostgreSQL y la integridad de turnos abiertos.

## Decisiones vinculantes recibidas del propietario

- Seguir las Decisiones 4–7 aprobadas y la matriz de permisos vigente.
- Operaciones de escritura: `create_branch`, `create_warehouse`, `create_register`, `set_branch_membership_active`.
- Las funciones SQL son `SECURITY DEFINER`, con `SET search_path = pg_catalog, public`, `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE` explícito a `microapp_runtime`.
- `microapp_runtime` no recibe DML general; las escrituras se realizan exclusivamente mediante funciones estrechas.
- Endpoints de administración exclusivos para Owner, usando `organization_policy.manage`, `members.manage` y `branch_memberships.manage`. No modificar `ROLE_OPERATIONS`.
- No tocar Neon `main`, activar `BCV_SYNC_ENABLED`, modificar PR #193/#314/#315/#316 ni cerrar Issue #53. Mantener Issue #53 OPEN/P0 y `PRODUCTION: NOT READY`.

## Alcance

1. Migración `0024_organization_structure_admin_operations.sql` y assertions.
2. Contratos de migración, restore, runner y CI para perfil hasta 0024.
3. API: validación estricta, trusted origin, UUID/body/size limits, no-store, errores sanitizados y auditoría.
4. Web: sección administrativa Owner-only con flujo Sucursal → Almacén → Caja → Miembros/Asignaciones; onboarding cuando no haya sucursales; coherencia con Catálogo, Inventario, Caja y turnos.
5. Pruebas PostgreSQL 18 efímero, denegaciones por rol/tenant/origen, concurrencia, runtime least privilege y React/Vitest.

## Exclusiones

- Neon main, Neon branches con mutaciones, datos reales, secrets, Cloudflare manual, deploy manual, DNS, billing y activación de Cron/BCV.
- Cambios a `ROLE_OPERATIONS`.
- Alterar la política de turnos: Owner no puede cerrar ni reabrir turnos ajenos. La desactivación de asignación debe fallar mientras exista un turno abierto del miembro en esa sucursal.
- Cambios a PR #193/#314/#315/#316 o Issue #53.

## Criterios de aceptación

- [x] Las cuatro funciones SQL verifican organización activa, actor Owner activo, relaciones tenant-scoped, códigos/slugs normalizados, duplicados y auditoría atómica.
- [ ] La desactivación de membresía es serializable respecto a apertura de turnos y falla si el miembro tiene turno abierto en la sucursal.
- [ ] No hay grants DML directos generales para `microapp_runtime`; solo EXECUTE explícito en las funciones nuevas.
- [ ] Assertions verifican propietario, SECURITY DEFINER, search_path, ACL de PUBLIC, grants de runtime, denegación DML y auditoría.
- [ ] Los perfiles de migración/restore hasta 0024 validan orden, checksum, assertions y recuperación sintética sin debilitar perfiles históricos.
- [ ] Rutas API de administración solo Owner; miembros y sucursales se listan según sus permisos aprobados; origen no confiable, UUID/body inválidos y cuerpos sobredimensionados se rechazan.
- [ ] Ninguna ruta de lectura existente pierde sus permisos actuales.
- [ ] UI administrativa no aparece ni opera para otros roles; guía inicial clara sin sucursales; estado sincronizado tras mutaciones.
- [ ] PostgreSQL 18 efímero cubre happy paths, duplicados, cross-tenant, roles admin/cashier/inventory, origen no confiable, concurrencia, turnos abiertos y DML general runtime denegado.
- [ ] React/Vitest, build/typecheck, CI, migración, runner, restore smoke, seguridad, secret-history y todos los checks aplicables de push pasan en el HEAD de código exacto `23581b2a1956c3433683820c7b2a2db3eb24b696` (11/11 check-runs SUCCESS).
- [ ] Diff revisado completo; PR 2 no se fusiona hasta 100% SUCCESS exact-HEAD y sin riesgos materiales.
- [ ] Issue #53 sigue OPEN/P0; `PRODUCTION: NOT READY`.

## Orden de implementación

1. Confirmar contratos de dominio y migraciones 0001–0023 en la base actual.
2. Diseñar e implementar migración 0024 y assertions con mínimo privilegio.
3. Extender perfiles de validación/restore/CI de forma compatible.
4. Implementar API y pruebas de integración.
5. Implementar UI y pruebas React/Vitest.
6. Ejecutar workflows, revisar diff y abrir PR no-Draft solo cuando esté completo y probado.
7. Actualizar checkpoint/handoff/diario con SHA y evidencia exactos.

## Riesgos y controles

- **Race de turno abierto vs revocación:** locking común y validación en la misma transacción; no depender solo de preflight API.
- **SECURITY DEFINER:** search_path fijo, owner controlado, PUBLIC sin EXECUTE, argumentos explícitos y no SQL dinámico no confiable.
- **Cross-tenant:** FKs compuestas y predicados organization_id/branch_id en cada operación.
- **Permisos:** no inferir rol desde cliente; resolver actor desde sesión en API y volver a comprobar Owner en SQL.
- **Restore/migraciones:** no editar secuencias históricas; extender el perfil vigente 0023 a 0024 sin alterar perfiles main históricos.
- **Evidencia:** workflow runs, check-runs/status contexts y reviews son señales distintas; ningún SHA anterior valida el HEAD final.

## Progreso de implementación — 2026-11-13

### Cambios añadidos en la rama

- \`apps/api/migrations/0024_organization_structure_admin_operations.sql\`:
  - Cuatro funciones \`SECURITY DEFINER\` exactas, propiedad de \`microapp_migrator\`, con \`search_path = pg_catalog, public\`.
  - \`REVOKE ALL FROM PUBLIC\` y \`GRANT EXECUTE\` únicamente a \`microapp_runtime\`.
  - Revocación de DML de tabla a runtime/PUBLIC sobre branches, warehouses, registers, branch_memberships y organization_members. Se conserva únicamente INSERT por columnas (organization_id, user_id, role) en organization_members, exigido por el bootstrap Google preexistente de migración 0012; no hay INSERT de tabla ni UPDATE/DELETE runtime sobre esa tabla.
  - El creador Owner queda asignado a la nueva sucursal dentro de la misma transacción. La función de asignación también crea una asignación ausente cuando se solicita \`is_active=true\`.
  - Serialización por organización/sucursal/asignación antes de comprobar turnos abiertos. No se cambia la política de turnos.
- \`apps/api/migrations/0024_organization_structure_admin_operations.assertions.sql\` verifica propietario, \`SECURITY DEFINER\`, search_path, ACL limitado, ausencia de DML runtime y presencia de auditoría/guard de turno.
- Backend nuevo \`apps/api/src/organization-structure.ts\`, registrado en \`index.ts\`:
  - GET de estructura y POST/PATCH de administración.
  - Autorización Owner mediante los permisos ya existentes; asignaciones requieren \`members.manage\` y \`branch_memberships.manage\`.
  - El actor se deriva exclusivamente de la sesión. Se conserva el orden de locks SQL al autorizar sin bloquear filas previamente.
  - Trusted Origin, UUID, JSON estricto, límite de 4 KiB, \`Cache-Control: private, no-store\` y errores sanitizados.
- Frontend nuevo \`OrganizationStructurePanel.tsx\` y navegación Owner-only en \`App.tsx\`: sucursales, almacenes, cajas y asignaciones; onboarding para cero sucursales y refresco tras mutaciones.
- Pruebas añadidas:
  - \`organization-structure.test.ts\` (guards de origen, UUID, JSON y tamaño).
  - \`organization-structure.integration.test.ts\` (API real con PostgreSQL y login runtime).
  - \`OrganizationStructurePanel.test.tsx\` y \`OrganizationStructureRoleIsolation.test.tsx\`.
  - \`scripts/tests/test_organization_structure_admin.sh\` (happy paths con runtime, normalización, duplicados, cross-tenant, cross-branch, denegaciones de roles, auditoría, DML y ambas carreras apertura-vs-desactivación).
- Se añadió el perfil BCV 0001–0024 (`bcv-0024`) en runner, restore, replay ACL y smoke, conservando el perfil histórico BCV 0001–0023 (`bcv`) y el perfil main 0001–0016. `scripts/db/test_restore_role_grants_profiles.sh` valida los tres perfiles; se añadió rollback injection para 0024. Se añadió rollback injection para 0024.

### Límites de evidencia y resultados exactos

- La inspección confirmó que el esquema real usa `organization_members`, no una tabla llamada `organization_memberships`.
- `ROLE_OPERATIONS` no fue modificado; las rutas de lectura existentes permanecen intactas.
- HEAD `61cd674c47cdba4595e21bd9e6b8f4ecd0f25431` en PR #350: 25/25 check-runs SUCCESS; 11/11 workflow runs pull_request y 6/6 workflow runs push SUCCESS. Runs: CI 43525236567; migration-runner 43525236428; migration-check 43525236620; backup-restore-smoke 43525236472; security scan 43525236548; secret-history 43525236628.
- PostgreSQL 18 cubrió las cuatro operaciones con LOGIN runtime, auditoría, duplicados, cross-tenant, cross-branch, denegaciones admin/cashier/inventory, DML directo y ambas carreras concurrentes apertura/desactivación.
- API integration, React/Vitest, build/typecheck, migración 0024, rollback atómico, restore main 0016, restore BCV 0024 y compatibilidad de perfiles 16/23/24: SUCCESS.
- Se añadió prueba API de aislamiento entre sucursales: un turno abierto en Norte no bloquea desactivar la asignación en Sur; en la misma sucursal sí se rechaza.
- El diff completo contra main fue revisado. Main permanece en `25c0f842c7ecc8a7320b33d33abfb12402476e32`; la rama está 0 detrás. PR #350 está OPEN y no-Draft, mergeable=true, sin merge. No hay reviews formales ni hilos de revisión. El resumen automático Codex no pudo completarse por límite de uso; no equivale a aprobación ni a hallazgo. Revisión del Tech Lead pendiente.
- No se tocó Neon, secretos, BCV_SYNC_ENABLED, `bcv-source-connectivity.yml` ni el código BCV sync/producer. Solo se amplió el perfil de restore de forma compatible, manteniendo BCV 0023. PR #193/#314/#315/#316 e Issue #53 no se modificaron; Issue #53 permanece OPEN/P0 y producción sigue NOT READY.
### Base de integración confirmada

- PR #349 fusionada por squash; merge SHA \`25c0f842c7ecc8a7320b33d33abfb12402476e32\`.
- La rama parte directamente de ese SHA, sin commits detrás de \`main\` en la comparación consultada.
- El Tech Lead confirma 15/15 check-runs SUCCESS post-merge para PR #349 y el workflow BCV disponible en main. Ese trabajo queda fuera de PR 2.

## Estado inicial

- PR #349 fusionada por squash; merge SHA `25c0f842c7ecc8a7320b33d33abfb12402476e32`.
- La rama de trabajo se creó desde `main` después de la fusión.
- El workflow manual `.github/workflows/bcv-source-connectivity.yml` está disponible en main.
- Confirmación posterior del Tech Lead: 15/15 check-runs post-merge SUCCESS en el merge SHA exacto.

### Reconciliación de continuidad

- Commit de documentación de continuidad: 54cb4cffba050e68af033de829565a7af52be1c9 (CURRENT_STATE, HANDOFF_NEXT_CHAT, STATE_JOURNAL y WORK_CHECKPOINT).
- Este commit sigue al checkpoint de implementación c0b3764dcbb17d74b05e1d096767f357dd975134. Consultar la rama viva para obtener el HEAD definitivo antes de validar.

- Reconciliación final del alcance BCV/restore y docs BACKUP_AND_RECOVERY: commit b727ad7ef524cde97d574213dde9c4bf4e5887dd. Se aclara que solo cambia el perfil de restore 0023→0024, no BCV sync/producer ni bcv-source-connectivity.yml.

- Último HEAD de código/docs comprobado antes de esta anotación: 3bb6557a4b5c1c320a3ffd7683cf553d20d02899; comparación contra main 25c0f842: ahead 63, behind 0. GitHub no reporta status contexts ni workflow runs para ese SHA porque todavía no existe PR; por eso CI exact-HEAD sigue pendiente.

- Para validar antes de abrir PR, se añadieron triggers push limitados a esta rama en CI, migration-runner y backup-restore-smoke; migration-check ya escucha feat/**. El wrapper disponible de workflow runs solo devuelve ejecuciones pull_request y no aporta evidencia de ejecuciones push; combined status del HEAD consultado sigue vacío. La validación continúa pendiente hasta obtener los check-runs reales.

- HEAD de continuidad al cerrar esta iteración: 77d96ccf3b3fc1d77ecea3242641f6b714f5c900 (incluye triggers push exactos y documentación). Comparación contra main: ahead 70 / behind 0. Combined status vacío; el wrapper de workflow runs devuelve solo runs pull_request y no permite certificar los runs push. No se abrió PR.


Nota de continuidad: el SHA anterior indicado es el último HEAD completamente validado (25/25 check-runs SUCCESS). Este commit solo actualiza documentación; verificar el nuevo HEAD vivo y sus checks exactos antes de cualquier merge. PR #350 sigue OPEN/no-Draft y no se debe fusionar.
