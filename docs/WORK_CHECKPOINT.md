# Checkpoint vigente — post PR #169 — 2026-10-30 UTC

**Repositorio:** BTF14/Micro-app  
**Main actual:** `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`  
**PR #169:** fusionada; HEAD revisado `0c437509c0ad1a02b91c08d03d9dba62f0e9bd78`.  
**Rama de reconciliación documental:** `docs/post-pr169-cashier-shift-continuity-20261030`.

## Resultado post-merge

- PR #169 fusionada; main apunta al merge SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`.
- Post-merge: 7/7 workflows Actions completed/success; Cloudflare Pages y Workers 2/2 success.
- CI: build/typecheck, unit tests, auth integration 18/18, branch scope 4/4, register shifts 5/5, cashier open-shift integration 7/7 (PostgreSQL 18 desechable).
- Migration validation: 0001–0004 aplicadas desde cero y assertions success en PG18 efímero.
- Playwright, Semgrep, Trivy, Secret History y dashboard success.
- No hubo reviews formales ni threads inline. Codex no completó por cuota; diff revisado manualmente.
- PR abiertas: ninguna. Issues abiertos #53 y #78, sin cambios.

## Helper implementado

- `apps/api/src/cashier-open-shift.ts`: `resolveOpenCashierRegisterShift(client, branchContext)`.
- Requiere BranchContext server-derived; rol cashier solamente; revalida en SQL tenant, usuario, sucursal, caja, membresía, rol y asignación.
- `FOR SHARE OF s` bloquea cierre concurrente mientras el caller mantiene su transacción.
- 6 pruebas unitarias y 7 de integración PG18; casos negativos de usuario/membresía/rol/asignación, otro cajero, otra sucursal, cross-tenant y concurrencia.
- No hay endpoints comerciales; matriz de permisos NO APROBADA.

## Estado de base de datos

- Main versiona 0001–0004; 0003/0004 no aplicadas a Neon main.
- No se ejecutó SQL remoto ni se usó Neon main como laboratorio.
- PostgreSQL 18 efímero continúa como entorno primario.

## Siguiente gate

Aprobar matriz de permisos y diseñar autorización server-side por operación/sucursal antes de endpoints comerciales. Mantener coste $0 y no alterar infraestructura/secretos.

---

# Checkpoint de trabajo vigente — Micro app

**Actualizado:** 2026-10-30 UTC  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Último main verificado antes de este checkpoint:** `c7abcb477afd649161176aad8cae707f5e42f632`  
**PR #160:** fusionada; merge `be6f19486caf5cf3605c6ca6615f87e305822ea7`  
**PR #161:** fusionada; merge `c7abcb477afd649161176aad8cae707f5e42f632`  
**Este archivo:** punto de reanudación post-PR #161. Revalidar main en vivo; el checkpoint commit de esta actualización cambiará el HEAD.

## Bloque completado

- PR #160 fusionada: nueve archivos documentales, 12 check runs success en su HEAD probado `fcb4269a459831be7858358c56e90346d5e4e9a6`.
- PR #161 fusionada: cinco archivos documentales, 12 check runs success en su HEAD probado `a17a4b95312876f0bf4b201c6a84a323fb69fa3b`.
- Merge commit #161 y main antes de esta actualización: `c7abcb477afd649161176aad8cae707f5e42f632`.
- Codex review no se completó por cuota en ambas PR; revisión manual fallback completada, sin hallazgos materiales pendientes. No hubo reviews humanas ni threads inline.
- Cloudflare Pages/Workers previews completados correctamente; no se verificó despliegue productivo post-merge.
- Branch protection no se pudo revalidar: HTTP 403 `Resource not accessible by integration`. La lectura del 26 oct se conserva como histórica.
- No se modificaron código, migraciones, workflows, secretos, Neon, DNS, billing ni producción.

## Estado de arquitectura verificado

- API Hono registra auth y health; no hay handlers HTTP comerciales.
- `resolveTenantContext` valida sesión, usuario, organización y membresía activa; no aplica permisos por operación ni sucursal y no está conectado a handlers comerciales.
- `withDatabaseTransaction` existe; el caller transaccional productivo observado es el bootstrap Google. No hay operaciones comerciales que demuestren atomicidad.
- `auth_rate_limits` existe en DDL, pero no hay caller/runtime rate limiter.
- El esquema inicial mantiene stock a nivel organización y no incluye sucursales, almacenes, cajas o turnos.
- Brechas previas a ventas/inventario: reconciliación venta/líneas/pagos, saldo stock vs ledger, referencia polimórfica de movimientos, idempotencia de pagos, último owner y auditoría append-only.
- La matriz de permisos por rol sigue NO aprobada. No implementar permisos comerciales hasta aprobación explícita.
- `feat/neon-transaction-adapter` corresponde a PR #1 ya fusionada; rama 14 ahead/245 behind. No reabrir ni fusionar.

## Próxima secuencia exacta

1. Revalidar main y PRs abiertas; confirmar este checkpoint post-PR #161.
2. Preparar propuesta técnica consolidada para organización→sucursal→almacén/caja/turno y reconciliarla con SAAS_ARCHITECTURE_DECISIONS.
3. Presentar la matriz de permisos al propietario para aprobación explícita; no convertir recomendaciones de IA en política.
4. Diseñar autorización server-side por operación y scope de sucursal.
5. Diseñar rate limiting distribuido compatible con Workers y confirmar opciones sin coste.
6. Diseñar pruebas PostgreSQL efímeras de aislamiento cross-tenant/cross-branch, idempotencia, concurrencia y rollback.
7. Implementar solo después de aprobar contratos; una PR coherente con código, tests y documentación.

## Restricciones

- No ejecutar SQL ni migraciones en Neon main.
- No desplegar producción ni cambiar secretos, DNS, billing o planes de pago.
- No prometer capacidad SaaS sin pruebas sintéticas.
- Guardar checkpoints dentro de cada PR de trabajo después de cada bloque significativo, no al final de la sesión.


## Checkpoint incremental — 2026-10-30 UTC — branch scope

- Base verificada: main `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`; #164 fusionada; no PR abiertas al inicio.
- Rama de trabajo: `feat/branch-scope-context-20261030`. PR/checks: consultar estado vivo.
- Decisión autorizada: owner/admin organización-wide; cashier/inventory requieren asignación activa a sucursal. No se aprobó matriz de permisos comerciales sensibles.
- Archivos añadidos: migración 0003, assertions PostgreSQL cross-tenant, helper `resolveBranchContext`, tests unitarios, extensión de workflow migration-check y SDD `BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md`.
- No se modificó el tenant resolver existente, no se conectó el nuevo helper a rutas, no hay handlers comerciales y no se creó modelo de caja/turnos/almacenes ni migración de stock legacy.
- HEAD de implementación `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b` verificado: build/typecheck, unit tests, 18 auth integration tests, 3 branch context PostgreSQL integration tests, migración 0003 + assertions, Playwright, Semgrep, Trivy, secret-history, dependency review, backup smoke, Cloudflare Pages/Workers previews: todos success. Primera ejecución de branch integration falló únicamente en cleanup de branch de tenant B; cleanup corregido y segunda ejecución 3/3 pasó sin warning de queries concurrentes. Codex review no concluyó por cuota; no hay reviews humanas ni inline threads; revisión manual del diff realizada. La sincronización documental posterior dispara una nueva ejecución: revalidar SHA final antes de merge.
- No tocar Neon main, datos reales, secretos, Cloudflare settings, DNS, billing ni producción. No afirmar despliegue.

- Validación ampliada en la misma PR: CI aplica 0003 al PostgreSQL efímero y ejecuta `branch-context.integration.test.ts` con casos owner/admin, cashier/inventory asignado/no asignado, sucursal inactiva y selector cross-tenant. El workflow de migración ejecuta también assertions SQL.
- PR #165 abierta; revalidar HEAD y checks después de cualquier commit adicional.

- Hardening antes del merge: `resolveBranchContext` vuelve a comprobar organization/app_user/organization_members activos y que el rol actual en DB coincida con el TenantContext; pruebas de integración añadidas para membresía revocada y rol cambiado. HEAD nuevo invalida la evidencia CI del SHA previo; esperar y verificar todos los checks del HEAD final.
