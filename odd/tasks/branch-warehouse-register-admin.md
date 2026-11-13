# Administración de estructura organizacional — PR 2

**Estado:** implementación de código y harnesses añadidos; validación PostgreSQL/CI y revisión final pendientes; no habilitada en producción.
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

- [ ] Las cuatro funciones SQL verifican organización activa, actor Owner activo, relaciones tenant-scoped, códigos/slugs normalizados, duplicados y auditoría atómica.
- [ ] La desactivación de membresía es serializable respecto a apertura de turnos y falla si el miembro tiene turno abierto en la sucursal.
- [ ] No hay grants DML directos generales para `microapp_runtime`; solo EXECUTE explícito en las funciones nuevas.
- [ ] Assertions verifican propietario, SECURITY DEFINER, search_path, ACL de PUBLIC, grants de runtime, denegación DML y auditoría.
- [ ] Los perfiles de migración/restore hasta 0024 validan orden, checksum, assertions y recuperación sintética sin debilitar perfiles históricos.
- [ ] Rutas API de administración solo Owner; miembros y sucursales se listan según sus permisos aprobados; origen no confiable, UUID/body inválidos y cuerpos sobredimensionados se rechazan.
- [ ] Ninguna ruta de lectura existente pierde sus permisos actuales.
- [ ] UI administrativa no aparece ni opera para otros roles; guía inicial clara sin sucursales; estado sincronizado tras mutaciones.
- [ ] PostgreSQL 18 efímero cubre happy paths, duplicados, cross-tenant, roles admin/cashier/inventory, origen no confiable, concurrencia, turnos abiertos y DML general runtime denegado.
- [ ] React/Vitest, build/typecheck, CI, migración, runner, restore smoke, seguridad, E2E y demás workflows obligatorios pasan en el HEAD exacto final.
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
  - Revocación explícita de DML directo a runtime/PUBLIC sobre \`branches\`, \`warehouses\`, \`registers\`, \`branch_memberships\` y \`organization_members\`.
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
  - \`scripts/tests/test_organization_structure_admin.sh\` (happy paths con runtime, normalización, duplicados, cross-tenant/branch, denegaciones de roles, auditoría, DML y ambas carreras apertura-vs-desactivación).
- Se extendió el perfil BCV de restore/migración de 0023 a 0024 en runner, restore, replay ACL, smoke y pruebas. El perfil histórico main 0001–0016 no se modificó. Se añadió rollback injection para 0024.

### Límites de evidencia

- La inspección confirmó que el esquema real usa \`organization_members\`, no una tabla llamada \`organization_memberships\`.
- \`ROLE_OPERATIONS\` no fue modificado; rutas de lectura existentes no fueron editadas.
- No se ha ejecutado todavía PostgreSQL 18, Vitest, build/typecheck, E2E ni ningún workflow sobre el HEAD actual. La existencia de los harnesses no equivale a que hayan pasado.
- No se ha abierto PR 2: la directiva exige CI verde exact-HEAD y revisión completa antes de abrirla. No se ha fusionado ni desplegado nada.
- No se tocó Neon, secretos, BCV_SYNC_ENABLED, el workflow bcv-source-connectivity.yml ni el código de sincronización/producer BCV. La única modificación relacionada con BCV es la extensión del perfil de restore/migraciones 0023→0024 solicitada para compatibilidad. PR #193/#314/#315/#316 e Issue #53 no se modificaron; Issue #53 permanece OPEN/P0 y producción sigue NOT READY.

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
