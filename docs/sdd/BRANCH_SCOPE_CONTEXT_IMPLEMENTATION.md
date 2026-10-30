# Implementación base de alcance por sucursal

**Estado:** implementada y fusionada en PR #165; migración 0003 NO aplicada a Neon main. `resolveBranchContext` sigue aislado y no conectado a rutas comerciales. PR #169 añadió el helper separado `resolveOpenCashierRegisterShift` para turno abierto; tampoco está conectado a rutas ni autoriza operaciones.  
**Fecha:** 2026-10-30.  
**Base:** `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`.

## Decisión autorizada

El propietario autorizó el alcance general siguiente:

- `owner` y `admin`: pueden resolver cualquier sucursal activa de su organización.
- `cashier` e `inventory`: solo pueden resolver sucursales con una asignación activa propia.
- La organización sigue siendo la frontera de aislamiento.
- El rol y la identidad proceden del `TenantContext` validado en servidor, nunca de campos de cliente.

Esto aprueba únicamente la resolución del ámbito organización/sucursal. **No aprueba** permisos por operación ni autoriza ventas, descuentos, anulaciones, pagos, ajustes, transferencias, caja/turnos, administración de usuarios o exportaciones.

## Modelo SQL propuesto

La migración aditiva `0003_branch_scope.sql` introduce:

- `branches`: sucursales pertenecientes a una organización, con slug único por organización y estado activo.
- `branch_memberships`: asignaciones de usuarios a sucursales, ligadas por FKs compuestas tanto a `branches` como a `organization_members`.
- Índices orientados a resolver asignaciones activas por usuario y sucursal.

Las FKs compuestas impiden persistir una asignación cuyo usuario o sucursal pertenezca a otra organización. Los registros se restringen con `ON DELETE RESTRICT`; la desactivación es explícita y auditable en futuras operaciones de administración.

Alcance de PR #165: no creó almacenes, cajas, turnos, stock por almacén ni migró `products.stock_quantity`; tampoco modificó el esquema inicial histórico. Trabajo posterior: PR #167 fusionó `registers`/`register_shifts` mediante 0004 en main; no está aplicado a Neon.

## Resolución de contexto

`resolveBranchContext(client, tenant, requestedBranchId)`:

1. Exige un `TenantContext` server-derived ya validado por `resolveTenantContext`.
2. Valida UUIDs y enumera roles conocidos; entradas malformadas deniegan sin consultar DB.
3. Busca la sucursal activa por `organization_id` y `branch_id`.
4. Para `owner/admin`, permite resolver la sucursal dentro de la organización.
5. Para `cashier/inventory`, exige fila `branch_memberships` activa para el usuario y sucursal.
6. Devuelve solo identidad y scope; no decide permisos de negocio.

El helper aún no está conectado a middleware ni rutas. Los futuros handlers deberán llamar ambos resolvers y aplicar autorización por operación antes de leer o escribir datos.

## Pruebas requeridas

- Unitarias: roles de organización, asignación requerida, sucursal ausente/inactiva, selector malformado y rol inválido.
- PostgreSQL efímero: FKs cross-tenant para sucursal y usuario, unicidad de slug por organización.
- Evidencia histórica de PR #165: CI aplicó 0001–0003 en PostgreSQL 18 desechable y ejecutó assertions.
- PR #167 fusionó la ampliación de workflows a 0001–0004 y assertions de caja/turno; los 10 workflows pasaron en su HEAD final.
- PR #169 implementó un resolver aislado de turno abierto; sus 7 tests de integración PG18 y 6 unitarios pasaron, incluido el bloqueo frente a cierre concurrente.
- Antes de producción: pruebas de integración del resolver con DB real aislada, membresías revocadas, acceso IDOR, concurrencia de cambios de asignación y auditoría de cambios.

## Límites y pendientes

- No se ha ejecutado localmente el workspace desde esta conexión; la verificación automatizada depende de GitHub Actions para el HEAD de PR.
- No se ha ejecutado la migración contra Neon ni se ha creado una sucursal en datos reales.
- La matriz `docs/sdd/role-permission-decision-matrix.md` continúa NO APROBADA en las operaciones comerciales sensibles.
- El modelo estructural de caja/turno está implementado en 0004; siguen abiertas las políticas de ventas fuera de caja, ledger/efectivo esperado, override de supervisor y permisos por operación.
- No declarar aislamiento comercial completo ni preparación de producción por este cambio.

## Secuencia posterior

1. Verificar checks y revisión del diff de esta PR.
2. Integrar únicamente si migración, tests y checks obligatorios pasan.
3. Completar la revisión/CI del esquema de caja/turnos 0004 sin activar handlers comerciales.
4. Resolver la matriz de permisos sensibles con decisiones explícitas.
5. Diseñar stock por almacén, ledger/balance y migración con backfill/reconciliación.
6. Solo después implementar handlers comerciales con pruebas PostgreSQL cross-tenant/cross-branch, concurrencia, rollback e idempotencia.


## Cobertura de integración añadida

La PR incorpora `apps/api/src/branch-context.integration.test.ts`, ejecutado por CI contra PostgreSQL 18 efímero después de aplicar migraciones 0001–0003. Comprueba owner/admin sin asignación, cashier/inventory con asignación activa, cashier sin asignación, asignación inactiva, sucursal inactiva y un identificador de sucursal de otra organización. El test usa datos sintéticos y limpia las filas creadas. Esta cobertura complementa las assertions SQL del workflow `postgres-migration`; no prueba aún handlers comerciales ni producción.


## Resultado de verificación observado

En el HEAD de implementación `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b` finalizaron en success: build/typecheck, unit tests, 18 auth integration tests, 3 branch context PostgreSQL integration tests, migración 0003 + assertions, Chromium E2E, Semgrep, Trivy, secret-history, dependency review, backup restore smoke y Cloudflare Pages/Workers previews. La primera ejecución del nuevo test falló en teardown porque no eliminaba la sucursal sintética de la segunda organización; se corrigió la limpieza. Una segunda ejecución pasó 3/3 y se eliminó además la consulta concurrente del mismo cliente pg (sin warning deprecado). Esta evidencia es de CI en PostgreSQL 18 efímero, no de Neon main ni producción. La sincronización documental genera un SHA posterior y debe revalidarse antes de merge.

La revisión Codex no pudo completarse por límite de uso. No hay review humana ni comentarios inline; se realizó revisión manual del diff y no se detectaron otros defectos materiales. No tratar el fallo de cuota como aprobación.


## Revalidación de membresía en la consulta de sucursal

La consulta del resolver también vuelve a unir `organization_members`, `organizations` y `app_users`, exigiendo que organización, usuario y membresía sigan activos y que el rol de la fila coincida con el rol del `TenantContext` recibido. El ámbito owner/admin se deriva del rol leído en DB; cashier/inventory siguen requiriendo asignación activa. Esto reduce el riesgo de usar un contexto obsoleto tras una revocación o cambio de rol entre la resolución de tenant y la resolución de sucursal. No sustituye la autorización por operación ni elimina la necesidad de transacciones/controles al ejecutar futuras mutaciones.

La integración PostgreSQL ahora cubre además membresía de organización desactivada y rol cambiado desde un contexto previamente resuelto; ambos casos deben denegar. El test restaura los datos sintéticos antes de finalizar.


## Estado post-merge verificado — 2026-10-30 UTC

- PR #165 fusionada por squash; merge/main SHA `1d10befe0cd3367e04bd8998a192e93d9b228063`.
- 9/9 check-runs del merge SHA completados en success. Pages reportó deployment exitoso y Workers build success; no se ha validado el routing autenticado de producción.
- La migración 0003 sigue sin aplicarse a Neon main. Las pruebas de integración se ejecutaron en PostgreSQL 18 efímero mediante CI.
- `resolveBranchContext` sigue siendo un helper aislado, no conectado a middleware ni rutas. No implica autorización comercial ni preparación de ventas/inventario.


## Continuidad posterior a PR #165 — PR #167

- La migración 0003 y `resolveBranchContext` siguen siendo el fundamento de organización/sucursal; el helper no está conectado a rutas.
- PR #167 fusionó `0004_register_shifts.sql` con `registers`/`register_shifts`, índices de un turno abierto por caja/cajero, FKs compuestas, validación de apertura y lifecycle inmutable. Está en main; no se aplicó a Neon.
- CI de PR #167 aplica 0001–0004 en PostgreSQL 18 desechable y ejecuta assertions y tests de integración/concurrencia. No confundir la evidencia histórica de PR #165 (0001–0003) con la validación actual de PR #167.
- La matriz de permisos comerciales sigue NO APROBADA; el helper de sucursal y el esquema de turnos no autorizan ventas, pagos, descuentos, anulaciones ni endpoints de caja.

