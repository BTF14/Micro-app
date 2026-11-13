# Administración de estructura organizacional — PR 2

**Estado:** implementación en curso; no habilitada en producción.
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

## Estado inicial

- PR #349 fusionada por squash; merge SHA `25c0f842c7ecc8a7320b33d33abfb12402476e32`.
- La rama de trabajo se creó desde `main` después de la fusión.
- El workflow manual `.github/workflows/bcv-source-connectivity.yml` está disponible en main.
- El wrapper de workflow-runs no devolvió runs post-merge para el merge SHA; el estado de checks post-merge aún no está confirmado por esa vía.
