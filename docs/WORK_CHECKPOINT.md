# Checkpoint operativo — reconciliación post-PR #177

**Verificación GitHub — 2026-10-30 UTC:** PR #177 fusionada; merge SHA y HEAD de `main` observado: `82386c6e9300e06f8fa209aa52995b939a72442a`. Cero PR abiertas al inicio del bloque. En la validación post-merge de #177: 9/9 check-runs success y seis contextos requeridos success. No extrapolar esos resultados a nuevos commits.

**PR en curso:** [#178](https://github.com/BTF14/Micro-app/pull/178), draft, rama `docs/reconcile-role-model-and-cloudflare-20261030`. Continuar allí; no crear otra PR para la misma reconciliación. Revalidar HEAD/checks.

## Cloudflare — evidencia autenticada, solo lectura
- Worker `micro-app-api`: Active Deployment en Producción; versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a`; panel mostró 100% de asignación de tráfico.
- Pages `micro-app`: production branch `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, URL `https://cc23ff0c.micro-app-63i.pages.dev`.
- El dashboard de Pages mostró lista vacía, pero `apps/web/.env.production` versionado define `VITE_API_BASE_URL` con la URL canónica del Worker y `apps/web/vite.config.ts` usa `loadEnv`. La ausencia en el panel no prueba que el build carezca de URL; falta confirmar el valor en el bundle desplegado. No se inspeccionaron valores secretos ni se modificó configuración.
- Una observación anterior de #78 registró 0% para esta versión en otra vista; la inspección posterior de Active Deployment mostró 100% asignado. No confundir asignación con tasa de éxito o volumen de solicitudes.

## Estado de issues
- **#78:** abierta. CORS no verificado mediante preflight HTTP real. Obtener dos OPTIONS desde entorno con conectividad real: origin permitido `https://micro-app-63i.pages.dev` y externo `https://attacker.example`. Registrar solo status y headers `Access-Control-*`. Verificar el bundle JavaScript desplegado si es accesible y realizar los dos preflight HTTP reales; el HTML público solo confirma que el enlace OAuth apunta al Worker, no las demás llamadas API ni CORS.
- **#53:** abierta. Un rol por miembro/organización en `organization_members.role`; `branch_memberships` solo asigna sucursales, sin roles por sucursal. Matriz de permisos por operación **NO APROBADA**. No implementar autorización comercial antes de aprobación.

## Límites
No usar Neon `main` como laboratorio; no ejecutar migraciones remotas ni tocar datos reales. No cambiar Cloudflare, tráfico, variables, secretos, DNS, billing ni producción. No desplegar. Presupuesto USD 0. La revisión independiente Claude/Codex de PR #172 sigue pendiente/no ejecutada. El inventario por sucursal no está implementado; el stock sigue organizacional. Caja conserva modelo de turnos y cierre ordinario.

## Próxima acción
Completar preflight CORS desde entorno con red real y revisar la variable ausente de Pages en solo lectura. Después obtener aprobación explícita de la matriz comercial; mantener endpoints comerciales bloqueados.

---
> **Archivo histórico — no usar como estado operativo.** Los checkpoints anteriores se preservan para trazabilidad; GitHub en vivo y este checkpoint superior prevalecen.


---
> **Archivo histórico — no usar como estado operativo.** Los checkpoints anteriores se preservan para trazabilidad; GitHub en vivo y el checkpoint superior prevalecen.


---


> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan para trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


> **Archivo histórico — no usar como estado operativo.** Los checkpoints anteriores se preservan para trazabilidad y pueden reflejar estados de su fecha. El checkpoint superior y GitHub en vivo prevalecen.



> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados que eran correctos en su fecha. Para el estado actual, usar el checkpoint de arriba y verificar GitHub en vivo.


> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Checkpoint vigente — autorización server-side propuesta — 2026-10-30 UTC

**Repositorio:** BTF14/Micro-app  
**Main verificado antes de esta sincronización:** `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`  
**Último merge runtime:** PR #169, `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`  
**PR activa:** [#172](https://github.com/BTF14/Micro-app/pull/172), abierta, lista para revisión, no fusionada, rama `docs/operation-authorization-architecture-20261030`; consultar su estado y HEAD en vivo.  
**Último checkpoint previamente validado de PR #172:** `87de879b021cd4b68ce4267b138832279d4a043a`; 12/12 check-runs completed/success en ese SHA exacto. Los commits documentales posteriores requieren checks propios.  
**Estado de matriz:** NO APROBADA.  
**Último trabajo:** propuesta técnica y sincronización de continuidad; no cambios runtime/schema/migrations.

## Resultado y límites

- PR #169 permanece como último merge de runtime; helper `resolveOpenCashierRegisterShift` ya está en main, aislado y sin rutas comerciales.
- PR #170 y #171 son reconciliaciones documentales, no cambios runtime.
- PR #172 propone arquitectura de autorización server-side y actualiza documentación de continuidad. No aprueba permisos ni habilita endpoints.
- Separación contractual: autenticación, membresía tenant, resolución de scope y autorización por operación son controles distintos.
- Mutaciones futuras: revalidar sesión/actor/membresía/rol/scope dentro de la misma transacción; definir locks/isolation frente a revocaciones y cambios concurrentes; validar tenant/branch en cada query; escribir auditoría y efectos de negocio atómicamente.
- Auditoría, ledger de caja/inventario, idempotencia de operaciones comerciales y handlers siguen pendientes de diseño/implementación.
- Main sigue en el SHA anterior al branch; no se tocó Neon main, datos reales, secretos, DNS, billing ni configuración Cloudflare.
- Migraciones 0003/0004 siguen versionadas en Git, pero no se ha demostrado aplicación a Neon primary main.

## Evidencia de CI

- En el checkpoint `87de879b021cd4b68ce4267b138832279d4a`, los 12 check-runs terminaron completed/success. Esa evidencia no se hereda a commits documentales posteriores.
- Esta evidencia no se transfiere a un SHA posterior. Consultar los check-runs del HEAD actual de #172 después de los commits de continuidad.
- Reviews formales de GitHub: ninguna en la última consulta. No afirmar aprobación humana/Codex. La consistencia fue revisada manualmente.

## Siguiente paso

La revisión documental corrigió las referencias obsoletas. Antes de merge, consultar el HEAD vivo y confirmar checks requeridos verdes, feedback resuelto y estado ready-for-review. La matriz comercial continúa pendiente y bloquea cualquier implementación de permisos/endpoints.

---

# Checkpoint vigente — post PR #169 — 2026-10-30 UTC

**Repositorio:** BTF14/Micro-app  
**Último merge con cambios de runtime:** PR #169, `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`  
**PR #169:** fusionada; HEAD revisado `0c437509c0ad1a02b91c08d03d9dba62f0e9bd78`.  
**PR #170 documental:** fusionada en `af08cd913a4e0e155b1b74183a71efc51e5d4646`; no cambió runtime/esquema. Resolver `main` en vivo antes de nuevos cambios.

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
