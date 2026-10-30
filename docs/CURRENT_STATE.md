# Estado actual — Micro app

## Checkpoint vigente de continuidad — 2026-10-30 UTC

**Snapshot GitHub verificado antes de esta sincronización documental:** rama `docs/reconcile-role-model-and-cloudflare-20261030`, HEAD `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b` (commit `docs: remove duplicate project plan heading`). El commit de sincronización que actualiza este checkpoint moverá la punta; volver a resolver la rama y validar los checks de su nuevo SHA antes de cualquier decisión.

- Repositorio: `BTF14/Micro-app`; rama base `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`.
- Comparación de HEAD `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b` contra `main`: 68 commits ahead, 0 behind.
- PR [#178](https://github.com/BTF14/Micro-app/pull/178): OPEN, DRAFT, NOT MERGED; rama `docs/reconcile-role-model-and-cloudflare-20261030`. El último reporte de GitHub indicó `mergeable=true`; no equivale a autorización de merge.
- Diff de PR #178: 13 archivos, todos documentales (343 adiciones / 235 eliminaciones según la comparación por archivo); sin cambios de runtime, SQL, migraciones, workflows ni infraestructura.
- GitHub Actions asociado al SHA exacto `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`: 11/11 workflow runs completados en `success` (9 por evento pull_request y 2 por push). Runs PR: [CI](https://github.com/BTF14/Micro-app/actions/runs/41123992893), [Project progress](https://github.com/BTF14/Micro-app/actions/runs/41123992664), [SDD validation](https://github.com/BTF14/Micro-app/actions/runs/41123992694), [Dependency review](https://github.com/BTF14/Micro-app/actions/runs/41123992706), [Secret history](https://github.com/BTF14/Micro-app/actions/runs/41123992695), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/41123992650), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/41123992682), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/41123992653), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/41123992663). Runs push: [Security scan](https://github.com/BTF14/Micro-app/actions/runs/41123984676), [Secret history scan](https://github.com/BTF14/Micro-app/actions/runs/41123984639). Estos resultados no se transfieren al nuevo SHA que produzca esta sincronización.
- Cloudflare notificó previews exitosas para el mismo SHA `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`: [Pages commit preview](https://16be43d4.micro-app-63i.pages.dev), [Pages branch preview](https://docs-reconcile-role-model-an.micro-app-63i.pages.dev), [Workers commit preview](https://d0883f1d-micro-app-api.btfcasheb.workers.dev), [Workers branch preview](https://docs-reconcile-role-model-and-cloudflare-20261030-micro-app-api.btfcasheb.workers.dev). El GET de `/health` en la preview de Worker respondió `{"status":"ok","service":"micro-app-api","stage":"scaffold"}`; Pages muestra la vista aislada que deshabilita login y acceso a datos. Son previews, no producción.
- Reviews formales: 0; threads inline: 0. La protección de rama no pudo auditarse en una consulta anterior (403); no afirmar que se verificaron los contextos requeridos.
- **No marcar Ready ni fusionar:** permanece Draft y no existe autorización explícita para promoverla o fusionarla. Un merge puede activar despliegues automáticos de Cloudflare.

## Issue #78 — CORS y configuración efectiva

Issue #78 sigue abierta. Hono configura CORS y los tests de `app.request` son simulados; no demuestran headers del Worker desplegado. En esta sesión se intentaron ambos preflight OPTIONS contra `https://micro-app-api.btfcasheb.workers.dev/health`:
- Origin permitido `https://micro-app-63i.pages.dev`: curl exit 6, `Could not resolve host`.
- Origin externo `https://attacker.example`: curl exit 6, `Could not resolve host`.

No se obtuvo status HTTP ni headers `Access-Control-*`; esto es una limitación DNS/red del entorno, no evidencia de éxito ni de fallo de CORS. Mantener **NO VERIFICADO** y repetir solo desde un entorno con conectividad real.

`VITE_API_BASE_URL` está definida en `apps/web/.env.production` y `apps/web/vite.config.ts` la carga mediante `loadEnv`. No describirla como ausente por no aparecer en el panel de Pages. Sigue pendiente inspeccionar el bundle JavaScript publicado y confirmar el valor efectivo compilado; no se verificó en esta sesión.

## Issue #53 — permisos comerciales

Issue #53 sigue abierta. La matriz `docs/sdd/role-permission-decision-matrix.md` permanece **NO APROBADA**. La estructura vigente es un único `organization_members.role` por miembro/organización; `branch_memberships` solo concede/revoca acceso a sucursales y no contiene roles. No crear endpoints comerciales, middleware ni mapeos rol→operación antes de aprobación explícita.

## Otros límites y próxima secuencia

- La rama `fix/vercel-api-esm-imports` fue eliminada tras preservar el SHA `b1330a5fa547071a5f500f0481ce88109c612f81` en `archive/legacy-api-esm-experiment-20261020`; PR #72 sigue cerrada y no fusionada.
- Inventario actual organizacional (`products.stock_quantity`); inventario por sucursal/almacén no implementado.
- Caja mantiene modelo de turnos y apertura/cierre ordinario; no introducir cierres de supervisor incompatibles.
- PostgreSQL desechable primero; no usar Neon `main` como laboratorio ni ejecutar migraciones remotas.
- No modificar Cloudflare, tráfico, deployments, variables, secretos, DNS, billing, datos reales ni producción. Presupuesto objetivo USD 0.
- No reescribir historial Git ni `STATE_JOURNAL.md` (append-only).

Siguiente orden: (1) obtener los dos preflight reales desde entorno con red; (2) inspeccionar el bundle JS publicado; (3) mantener bloqueada la implementación comercial hasta aprobación explícita de la matriz; (4) revisar el nuevo HEAD y todos sus checks/previews antes de considerar cualquier estado de PR.
## Snapshot previo — eliminación segura de rama heredada (histórico; no es estado actual de PR #178) — 2026-10-30 UTC

- La rama original `fix/vercel-api-esm-imports` fue eliminada de GitHub mediante la sesión autenticada del propietario, después de comprobar que el respaldo `archive/legacy-api-esm-experiment-20261020` existía y apuntaba al mismo HEAD exacto: `b1330a5fa547071a5f500f0481ce88109c612f81` (compare devolvió `identical`, 0 ahead / 0 behind).
- Verificación posterior independiente: la búsqueda de ramas no devuelve `fix/vercel-api-esm-imports`; sí devuelve `archive/legacy-api-esm-experiment-20261020`. El respaldo conserva los tres commits. PR #72 permanece cerrada y no fusionada; no se borró ni modificó.
- Alcance de la operación: solo la referencia de rama original. No se modificaron otras ramas, tags, archivos, PRs, settings, deployments, integraciones, Cloudflare, Neon ni producción.
- No integrar el código archivado: es una rama ESM heredada, superada por main. El archive es evidencia/recuperación, no una línea de desarrollo activa.

## Snapshot de continuidad tras PR #177 (histórico; supersedido por el checkpoint superior) — 2026-10-30 UTC

**Checkpoint vivo verificado — 2026-10-30 UTC.** Repositorio `BTF14/Micro-app`; `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`, merge SHA de PR #177. PR #177 está fusionada; no había PR abiertas en la consulta de continuidad. En la validación post-merge se observaron 9/9 check-runs success y los seis contextos requeridos success; no extrapolar a otros SHA.

**Trabajo documental en curso:** PR [#178](https://github.com/BTF14/Micro-app/pull/178) está abierta como draft sobre la rama `docs/reconcile-role-model-and-cloudflare-20261030`, con base `main` en `82386c6e9300e06f8fa209aa52995b939a72442a`. Snapshot previo a esta corrección: HEAD `8a3db508b10c8a8dfa9c63ace90dbd64825022e0`; sus 9/9 workflows GitHub Actions observados terminaron `success`, y las previews de Pages/Workers reportaron éxito. Ese resultado pertenece exclusivamente a ese SHA. Esta edición documental generará un HEAD nuevo: consultar de nuevo todos sus checks y previews antes de considerar la PR lista. Continuar esa misma PR; no abrir otra.

## Cloudflare — observación autenticada de solo lectura
- **Workers / `micro-app-api`:** Active Deployment en Producción, versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a` (`main`). El panel mostró **100% de asignación de tráfico** a esa versión. La vista de métricas mostró 0 req/sec y 0% de error en el instante observado; son métricas puntuales, no prueba de ausencia de tráfico histórico ni de CORS correcto.
- **Pages / `micro-app`:** rama de producción `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, deployment `https://cc23ff0c.micro-app-63i.pages.dev`. La lista visible de variables de entorno de Pages apareció vacía. Sin embargo, el repositorio versiona `apps/web/.env.production` con `VITE_API_BASE_URL=https://micro-app-api.btfcasheb.workers.dev`, y `apps/web/vite.config.ts` carga variables del archivo de entorno del modo mediante `loadEnv`. Por tanto, la ausencia en el panel no demuestra que el build carezca de la URL. No se reveló ni modificó ningún valor de configuración del dashboard. El bundle publicado aún debe verificarse para confirmar el valor efectivo.
- **Corrección de interpretación:** un comentario anterior de #78 describía 0% para `49975c43`; la observación posterior y directa de Active Deployment mostró 100% asignado. La lectura anterior no debe usarse como estado actual. No se cambió tráfico, despliegue, variables, secretos, DNS ni configuración.

## Issue #78 — CORS y configuración efectiva
Sigue **ABIERTA**. La versión activa del Worker y el deployment de Pages están identificados, pero **CORS continúa NO VERIFICADO por HTTP real**. Los tests de Hono son simulados y no sustituyen dos preflight reales:
1. `Origin: https://micro-app-63i.pages.dev`, `Access-Control-Request-Method: GET`, `Access-Control-Request-Headers: authorization,content-type`.
2. Mismo preflight con `Origin: https://attacker.example`.

Registrar status HTTP y headers `Access-Control-*` solamente. No compartir cookies, tokens ni secretos. El dashboard vacío no demuestra que falte la URL: `apps/web/.env.production` versionado define el Worker y `vite.config.ts` lo carga con `loadEnv`. La página pública muestra el enlace “Continuar con Google” apuntando a `https://micro-app-api.btfcasheb.workers.dev/auth/google`. La inspección no pudo leer el bundle JS ni confirmar el valor compilado para las demás llamadas API; tampoco prueba CORS.

## Issue #53 — permisos comerciales
Sigue **ABIERTA**. La dirección estructural acordada es **un único rol por miembro y organización**, almacenado en `organization_members.role`. `branch_memberships` solo concede/revoca acceso a sucursales; no contiene roles y no permite que una persona sea `cashier` en una sucursal e `inventory` en otra. El rol organizacional aplica uniformemente en la organización. El acceso efectivo a cada sucursal se limita por las asignaciones correspondientes.

La matriz `docs/sdd/role-permission-decision-matrix.md` permanece **NO APROBADA**: esta decisión estructural no aprueba permisos de operaciones. No crear endpoints comerciales, middleware, asignaciones de permisos ni reglas rol→operación antes de aprobación explícita. Las políticas comerciales pertenecen a cada organización; quién puede configurarlas o ejecutar excepciones sigue pendiente. Apertura y cierre ordinario de caja deben seguir el modelo de turnos; no introducir cierres de supervisor incompatibles.

## Límites permanentes
- No desplegar ni cambiar tráfico/configuración de Cloudflare; no modificar secretos, variables, DNS o billing.
- No usar Neon `main` como laboratorio ni ejecutar migraciones remotas; PostgreSQL desechable primero.
- No tocar datos reales. Presupuesto objetivo USD 0.
- No afirmar preparación comercial, CORS productivo, ledger o auditoría comercial implementados.
- La revisión independiente Claude/Codex de PR #172 sigue pendiente/no ejecutada; no convertirla en aprobación.

## Próximo orden reproducible
1. Obtener desde un equipo con conectividad real los dos preflight OPTIONS de #78 y compartir únicamente status + headers `Access-Control-*`.
2. Confirmar, si es accesible, el valor efectivo de `__MICRO_APP_API_BASE_URL__` en el bundle de Pages. La fuente versionada es `apps/web/.env.production`; no cambiar esa variable porque es necesaria para apuntar al Worker.
3. Mantener #53 bloqueada hasta que el propietario apruebe la matriz completa de permisos por operación.
4. Solo después de aprobarla, diseñar autorización server-side y pruebas negativas en PostgreSQL desechable.

---
> **Historial:** las entradas inferiores se conservan por trazabilidad. Sus SHA y estados describen su fecha; este checkpoint y GitHub en vivo prevalecen.

> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan para trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados correctos solo en su fecha. Para el estado actual, usar el checkpoint superior y verificar GitHub en vivo.



> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados que eran correctos en su fecha. Para el estado actual, usar el checkpoint de arriba y verificar GitHub en vivo.


> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Estado vivo — reconciliación de autorización server-side — 2026-10-30 UTC

> **Esta portada supersede los estados operativos anteriores de este archivo.** Las entradas históricas inferiores se conservan como historial; no deben interpretarse como estado actual.

## Estado vivo verificado

- Repositorio: `BTF14/Micro-app`.
- `main` verificado en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. No se ha modificado `main` durante este bloque.
- Último merge con cambios de runtime: PR #169, merge SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 y #171 fueron reconciliaciones documentales; no alteraron runtime ni esquema.
- PR #172: https://github.com/BTF14/Micro-app/pull/172 — abierta, base `main`, rama `docs/operation-authorization-architecture-20261030`, propuesta documental de arquitectura de autorización server-side. No está fusionada; consultar estado draft/ready y HEAD directamente en GitHub.
- Último checkpoint previamente validado: `87de879b021cd4b68ce4267b138832279d4a043a` (12/12 checks success). Después se realizaron sincronizaciones documentales; el HEAD y sus checks deben obtenerse en vivo, no inferirse de este SHA.
- No hay aprobación formal de la matriz de permisos comerciales. La matriz `docs/sdd/role-permission-decision-matrix.md` permanece **NO APROBADA**.
- Issues #53 y #78 permanecen abiertas; no se modificaron en este bloque. Revalidar estado vivo antes de actuar.
- No se verificó ni se modificó Neon main; migraciones 0003/0004 siguen sin evidencia de aplicación remota. La validación PG18 es desechable/CI.
- No hay endpoints comerciales; los resolvers tenant/branch/shift siguen siendo helpers de contexto, no autorización por operación.
- No se cambiaron secretos, DNS, billing, configuración Cloudflare, datos reales ni despliegue de producción.

## Qué se añadió en PR #172

- `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md`: separa autenticación, membresía tenant, scope del recurso y autorización por operación; propone deny-by-default, comprobaciones transaccionales, control TOCTOU/concurrencia, auditoría, catálogo de operaciones y tests negativos.
- Es propuesta técnica, no política de permisos aprobada ni autorización para crear endpoints o migraciones.
- Se amplió la sincronización de continuidad para que el siguiente chat pueda reanudar desde un solo checkpoint consistente.

## Próxima secuencia obligatoria

1. Si se realiza cualquier nuevo commit, verificar de nuevo el HEAD exacto, todos los checks y el diff.
2. La propuesta documental puede revisarse y fusionarse separadamente de la matriz comercial; la matriz debe permanecer NO APROBADA hasta decisión explícita del propietario. No habilitar implementación comercial por efecto de este documento.
3. Obtener decisiones del propietario para permisos por operación, gestión de roles/usuarios, excepciones de caja, descuentos/devoluciones/anulaciones, delegación, configuración de políticas y auditoría.
4. Solo después diseñar/implementar autorización por operación con transacción, locks/isolation, idempotencia y auditoría.
5. Diseñar ledger de caja e inventario antes de exponer operaciones financieras/comerciales.
6. No aplicar migraciones a Neon main ni desplegar producción sin gate y autorización específica.

## Regla de continuidad

Consultar siempre el ref vivo de `main`, el HEAD/base de PR #172, los check-runs exactos y los issues antes de continuar. Este archivo y `HANDOFF_NEXT_CHAT.md` son la portada operativa; las notas históricas inferiores son contexto, no estado vivo.

---

# Estado vivo — post PR #169 — 2026-10-30 UTC

## Estado verificado en GitHub

- Repositorio: `BTF14/Micro-app`.
- Último merge con cambios de runtime: PR #169, SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 (`af08cd913a4e0e155b1b74183a71efc51e5d4646`) fue solo documental; no cambió runtime ni esquema. Resolver el SHA actual de `main` en GitHub antes de cualquier cambio.
- PR #169: cerrada y fusionada; HEAD revisado `0c437509c0ad1a02b91c08d03d9dba62f0e9bd78`; merge SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`.
- PR #166–#170 están fusionadas; #170 fue reconciliación documental post-merge. No hay trabajo de código abierto.
- Checks de PR #169: 8/8 workflows Actions success y checks externos Cloudflare Pages/Workers success en el HEAD revisado.
- Post-merge sobre el merge SHA: 7/7 workflows Actions success (CI, Playwright, migration validation, Security scan, Semgrep, Secret History y Project progress dashboard) y 2/2 checks Cloudflare Pages/Workers success.
- CI post-merge: build/typecheck; unit tests; auth integration 18/18; branch scope 4/4; register shifts 5/5; cashier open-shift integration 7/7 en PostgreSQL 18 desechable. Migration validation 0001–0004 success.
- Reviews formales GitHub: 0; threads inline: 0. Codex no completó por límite de cuota; la revisión manual no se presenta como aprobación externa.
- Issues abiertos relevantes: #53 (seguridad/identidad/aislamiento tenant) y #78 (verificación efectiva Cloudflare); no se modificaron.

## Implementación fusionada en PR #169

- Helper: `apps/api/src/cashier-open-shift.ts`, función `resolveOpenCashierRegisterShift(client, branchContext)`.
- Requiere BranchContext derivado de `resolveBranchContext` después de `resolveTenantContext`; acepta solo rol `cashier`.
- Revalida organización, sucursal, caja, usuario, membresía/rol y asignación activos; filtra por organización, usuario, sucursal y turno abierto.
- Devuelve `null` si no existe turno abierto o el scope ya no es válido. No eleva owner/admin ni permite suplantación.
- Usa `FOR SHARE OF s`; el helper no abre transacciones. Un caller futuro debe invocarlo con el mismo transaction client de la operación si requiere impedir un cierre concurrente.
- Tests unitarios e integración PostgreSQL 18 desechable cubren ausencia/turno propio, usuario inactivo, membresía/rol/asignación revocados, otro cajero, otra sucursal, cross-tenant y cierre concurrente.
- No añade rutas HTTP comerciales ni autoriza ventas/pagos/caja. La matriz de permisos sigue **NO APROBADA**.

## Arquitectura y restricciones vigentes

- Main versiona migraciones 0001–0004. 0003 contiene sucursales/asignaciones; 0004 contiene `registers` y `register_shifts`.
- 0003/0004 no se han aplicado a Neon main. PostgreSQL 18 desechable es el entorno primario de pruebas.
- `resolveTenantContext`, `resolveBranchContext` y `resolveOpenCashierRegisterShift` son helpers aislados; no están conectados a rutas comerciales ni conceden autorización por operación.
- Los turnos no se transfieren; cambio de cajero requiere cierre y nueva apertura. No calcular efectivo esperado/diferencias sin ledger de caja.
- Los builds de Cloudflare del merge commit reportaron success; no equivalen a certificación funcional completa de producción.

## Próxima secuencia

1. Obtener aprobación explícita de la matriz de permisos por rol/organización/sucursal.
2. Diseñar autorización server-side por operación y scope antes de habilitar ventas, pagos, inventario o caja.
3. Diseñar ledger de caja/efectivo esperado, idempotencia y transacciones antes de handlers comerciales.
4. Mantener PostgreSQL 18 desechable como entorno primario; Neon branches solo con valor adicional demostrado.

## Guardrails

- No Neon main como laboratorio ni aplicación remota de migraciones.
- No usar datos reales, secretos, DNS, billing ni Cloudflare settings.
- Los merges a main pueden disparar despliegues automáticos; distinguir builds/previews de verificación funcional productiva.
- Objetivo de coste: $0.
- No afirmar reviews formales/Codex; las PR #166–#169 tuvieron revisión manual documentada, sin aprobación externa.

---

# Checkpoint adicional — políticas comerciales por organización (2026-10-30 UTC)

- Rama de trabajo: `docs/org-policy-architecture-20261030`.
- Base verificada: `main` = `4ab229296d8858c8c553e00a633a762b9c26a81b`; no había PR abiertas al iniciar.
- Se añadió `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`: diseño conceptual de políticas comerciales propiedad de cada organización, versionado, aplicación server-side y snapshots auditables.
- Se corrigieron `docs/sdd/role-permission-decision-matrix.md` y `docs/SAAS_ARCHITECTURE_DECISIONS.md`: no existe umbral universal de descuentos; la organización define si permite descuentos y sus condiciones.
- La matriz de permisos continúa **NO APROBADA**. No se implementaron roles, endpoints comerciales, esquema ni migraciones.
- Alcance exclusivamente documental. No se ejecutó SQL, no se tocó Neon `main`, datos reales, secretos, DNS, billing, Cloudflare ni producción.
- Pruebas runtime: no aplican a documentación; falta revisión final del diff y checks del SHA de PR.
- PR documental activa: [#163](https://github.com/BTF14/Micro-app/pull/163), rama `docs/org-policy-architecture-20261030`. La revisión manual y los checks reportados en HEAD `531296af195ff17988a4ff9fc0ce65b242d7e194` se deben revalidar si cambia el HEAD.
- Próximo gate: cerrar ERD multi-sucursal y resolver aprobación de permisos sensibles antes de implementar autorización comercial. Las políticas comerciales configurables no requieren que el propietario de Micro app establezca reglas de negocio para cada cliente.

---

# Estado vivo verificado tras PR #161 — 2026-10-30 UTC

- **main verificado antes de este checkpoint:** `c7abcb477afd649161176aad8cae707f5e42f632` (merge squash de PR #161). Este mismo checkpoint se integra mediante una PR; consultar el ref vivo de main después de su fusión.
- **PR #160:** fusionada por squash en `be6f19486caf5cf3605c6ca6615f87e305822ea7`.
- **PR #161:** fusionada por squash el 2026-10-30 a las 04:40:49 UTC; merge commit `c7abcb477afd649161176aad8cae707f5e42f632`. Su propósito fue sincronizar el estado post-#160.
- **Checks de PR #161:** 12 check runs completados con `success` en HEAD `a17a4b95312876f0bf4b201c6a84a323fb69fa3b`, incluidos verify, Chromium, postgres-migration, Semgrep, Trivy, secret-history, dependency review, progress dashboard, Pages y Workers Builds. No extrapolar a otros SHA.
- **Alcance #161:** cinco archivos documentales; sin cambios de aplicación, migraciones, workflows, secretos ni infraestructura.
- **Revisión:** Codex no pudo completar revisión por cuota agotada; revisión manual del diff documental completada, sin hallazgos materiales pendientes. No hay reviews humanas ni threads inline.
- **Cloudflare:** Pages y Workers previews exitosos para HEAD de PR; no se obtuvo evidencia de despliegue productivo post-merge.
- **Protección de `main`:** endpoint actual devolvió HTTP 403; la configuración del 26 oct es evidencia histórica, no verificación actual.
- **Estado del producto:** NO LISTO para operación comercial. No hay handlers comerciales; la matriz de permisos sigue sin aprobación; `resolveTenantContext` no aplica permisos por operación ni sucursal.
- **Siguiente prioridad:** arquitectura de autorización y sucursales, consistencia/idempotencia, rate limiting y pruebas PostgreSQL aisladas antes de endpoints comerciales.

---

## Checkpoint histórico post-PR #160


- **main:** `be6f19486caf5cf3605c6ca6615f87e305822ea7` (merge squash de PR #160). GitHub confirmó el ref `refs/heads/main` en este SHA.
- **PR #160:** fusionada el 2026-10-30 a las 04:36:49 UTC. HEAD revisado `fcb4269a459831be7858358c56e90346d5e4e9a6`; merge commit `be6f19486caf5cf3605c6ca6615f87e305822ea7`.
- **Checks de PR #160 en el HEAD exacto:** 12 check runs completados con `success`: verify, Chromium authentication smoke tests, postgres-migration, Semgrep SAST, Trivy, secret-history scan, dependency review, project progress, Cloudflare Pages y Workers Builds (Trivy y secret-history aparecen además en runs de push/PR). No extrapolar estos resultados a commits posteriores.
- **Alcance #160:** nueve archivos documentales; sin cambios de aplicación, migraciones, workflows, secretos, configuración de proveedores, DNS, billing ni SQL.
- **Revisión:** Codex no pudo completar la revisión por cuota agotada en un SHA anterior; se aplicó revisión manual fallback del diff final. No hay reviews humanas ni threads inline registrados. La revisión manual no encontró problemas materiales pendientes.
- **Cloudflare:** Pages y Workers preview del HEAD `fcb4269` finalizaron correctamente. No se obtuvo evidencia de un despliegue productivo posterior al merge; no afirmar que producción se desplegó ni que se validó.
- **Protección de `main`:** la API actual devolvió HTTP 403 `Resource not accessible by integration`. SECURITY_ROADMAP conserva la última lectura histórica del 26 oct como histórica, no como estado vivo. No afirmar configuración actual de protección sin nueva evidencia.
- **Continuidad:** el protocolo de checkpoints incrementales está en `docs/AI_COLLABORATION_AND_PR_POLICY.md`; el punto operativo está en `docs/WORK_CHECKPOINT.md`.
- **Estado del producto:** NO LISTO para operación comercial. No existen handlers comerciales; la matriz de permisos sigue sin aprobación; el contexto tenant no aplica permisos por operación ni sucursal.
- **Siguiente prioridad:** cerrar la arquitectura de autorización por operación y sucursal, ERD organización→sucursal→almacén/caja/turno, consistencia/idempotencia financiera y control de abuso/rate limiting antes de endpoints comerciales. Revisar el handoff y checkpoint antes de actuar.

---

## Checkpoint histórico pre-merge de PR #160


- **PR #160:** https://github.com/BTF14/Micro-app/pull/160; abierta, no draft, no fusionada, `mergeable=true`; base `main` SHA `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc` (revalidar en vivo al reanudar). HEAD anterior a esta sincronización: `bcc667fc6ccd154b8e4f93f041e33d16c29195f0`; checkpoint actualizado después.
- **CI del HEAD anterior:** workflow CI `41002801690` estaba `pending`; otros siete workflows (Dependency review, Project progress dashboard, Database migration validation, Secret history scan, Security scan, Semgrep SAST y Playwright E2E) terminaron `success`. Combined status vacío. No declarar CI global verde. Los nuevos commits requieren nueva comprobación de su SHA.
- **Codex:** review fallida por cuota agotada en `ce4578fed5980631f59206bd45ced3fbefcce346`; no es aprobación. No reintentar mientras siga la limitación.
- **Revisión manual:** diff de PR #160 acotado a ocho archivos documentales. Se detectaron referencias de HEAD/commits obsoletas en WORK_CHECKPOINT y en snapshots de continuidad; se corrige la información de portada y el handoff. Los bloques antiguos en CURRENT_STATE/STATE_JOURNAL son historia y deben permanecer claramente subordinados al estado vivo.
- **Continuidad incremental:** sección 10 de `docs/AI_COLLABORATION_AND_PR_POLICY.md` y `docs/WORK_CHECKPOINT.md` definen y registran checkpoints durante el trabajo.
- **Decisión:** NO fusionar mientras CI requerido esté pendiente/no verificado. Ver `docs/WORK_CHECKPOINT.md` para evidencia, limitaciones y secuencia exacta.
- **No se modificó:** código de aplicación, migraciones, workflows, secretos, Cloudflare/Neon settings, DNS, billing ni producción.
- **Siguiente acción:** verificar HEAD nuevo y CI exacto; revisar los documentos de continuidad actualizados; solo fusionar PR #160 cuando todos los checks requeridos estén completos y no haya hallazgos materiales.

---

# Estado vivo verificado — 2026-10-30 UTC

- **Fuente viva:** GitHub confirma `main` en `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`. PR #158 y #159 están fusionadas; PR #160 está abierta. La protección de rama de GitHub no se pudo confirmar por API y no debe afirmarse como verificada.
- **PR #158:** merge commit `3fba9870b69a7e1ef05cc20db6d19f3ee18df51d`; auditoría documental de Cloudflare/workflows/continuidad.
- **PR #159:** merge commit `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; fija Node.js `24.22.2` mediante `.node-version` y pnpm `10.34.9` mediante `packageManager`, con alineación en workflows.
- **Checks del SHA exacto de main:** 9/9 completed/success, incluidos Workers Build, Cloudflare Pages, Chromium smoke, verify, secret-history scan, postgres-migration, Trivy, generate-progress y static analysis. No extrapolar estos checks a commits futuros.
- **Producción observada tras merge:** Pages `https://micro-app-63i.pages.dev` cargó la pantalla de acceso; Worker `https://micro-app-api.btfcasheb.workers.dev/health` respondió HTTP 200 con `status=ok`, `service=micro-app-api`, `stage=scaffold`. Es una comprobación básica, no una certificación funcional/comercial.
- **Neon, lectura de metadatos:** proyecto `micro-app-db`, plan `free_v3`, PostgreSQL 18, región `aws-us-east-1`; periodo de consumo mostrado 2026-10-17 a 2026-11-01. Tamaño lógico de main: 32,866,304 bytes (~31.34 MiB). Consumo del periodo: 5,645,769 bytes transferencia; 5,911 segundos compute; 23,240 segundos activo; 0 bytes escritos reportados. Ramas: 3/10; main 32.87 MB, restore-test ~33.57 MB, integrity-test ~31.69 MB. Son metadatos/contadores del proveedor, no benchmark ni capacidad SaaS.
- **Seguridad Neon:** metadatos actuales muestran `main.protected=false`, `allowed_ips.ips=[]`, `protected_branches_only=false`, `block_public_connections=false`; ramas listadas sin protección. No cambiar estos ajustes sin evaluación/plan y autorización correspondiente. No se leyó SQL, secretos, roles ni datos.
- **Protocolo README:** PR #159 ya cambió toolchain de forma concreta y verificada; README debe reflejar Node/pnpm exactos. Este checkpoint actualiza el README y continuidad para no dejar instrucciones contradictorias.
- **Guardrails vigentes:** no SQL ni cambios en Neon main; no secretos, datos reales, billing, DNS ni ajustes Cloudflare; no merge/deploy de producción sin aceptación explícita. Objetivo $0. No depender de Codex.
- **Siguiente prioridad:** cerrar lectura documental de arquitectura/API/esquema e inventariar brechas P0; revisar rama `feat/neon-transaction-adapter` con diff completo antes de rescatar nada; después diseñar tenant/branch authorization y rate limiting antes de endpoints comerciales. No prometer número de organizaciones hasta pruebas sintéticas.
- **Nota histórica:** los bloques inferiores que digan #158/#159 “abiertas”, “draft” o “no mergeadas” son históricos y quedan supersedidos por este estado vivo y por GitHub.

---

# Checkpoint continuidad — 2026-10-30 UTC (Node/pnpm corregidos en PR #159)

- **PR #158** (documentación Cloudflare/CI): https://github.com/BTF14/Micro-app/pull/158. Rama docs/workflow-deployment-audit-20261030; abierta, draft, no mergeada. HEAD conocido antes de este checkpoint: 162765fac25bf3aa623a41676d56e570afabd7fd; 12/12 checks success.
- **PR #159** (pinning de toolchain): https://github.com/BTF14/Micro-app/pull/159. Rama fix/cloudflare-node-pnpm-pinning-20261030; abierta, draft, no mergeada. HEAD 57de704c03fffebfd9aee2ae91c05a0e3af7515a; 13/13 checks success.
- PR #159 añade .node-version = 24.22.2, packageManager = pnpm@10.34.9 y alinea node-version-file/pnpm exactos en CI, Playwright, AutoSkills preview, Daily Dependency Watch y Regenerate Lockfile.
- Cloudflare Pages build log del SHA 57de704 confirmó Node 24.22.2 + pnpm 10.34.9, build exitoso, sin Unsupported Engine warning; preview https://70046713.micro-app-63i.pages.dev. No se fusionó ni se desplegó producción.
- Mantener PRs separadas: #158 solo docs; #159 solo toolchain/workflows. No fusionar ninguna sin autorización explícita porque push/merge a main activa despliegues externos.
- No cambiar Cloudflare settings, Neon main, secretos, DNS, billing, datos reales ni producción. Objetivo USD 0. Sin Codex.

---

# Checkpoint final — 2026-10-30 UTC (PR #158 HEAD 5b1b573)

- **PR #158:** abierta, draft, no fusionada; base main = 1ee1808af4aae484a71dc24750237ff4f4d934a0.
- **HEAD actual:** 5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766; cinco archivos de documentación, cinco commits, sin cambios de aplicación/workflows/migraciones.
- **Checks del SHA exacto:** 12/12 success (GitHub Actions y Cloudflare). Cloudflare Pages preview: https://d8477e48.micro-app-63i.pages.dev. Workers preview: https://2935f95a-micro-app-api.btfcasheb.workers.dev. Son previews, no producción.
- **Pages Settings:** main producción; root vacío; build corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build; output apps/web/dist; build system v3; cache off; monitoring *; preview público por defecto; sin dominio custom. Detalles completos en docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- **Preview isolation:** verificado en código main: API base vacía, llamadas API bloqueadas, login deshabilitado, CSP sin API en previews; _headers define CSP/seguridad para producción. Mantener pruebas de regresión.
- **Pendientes:** revisar build logs para versión efectiva Node/pnpm; evaluar pin pnpm, build cache y semántica “Fail open” sin cambiar ahora; verificar headers HTTP efectivos; revisar cuota Pages; confirmar required checks/branch protection (no confirmado).
- **Guardrails:** no merge/deploy sin permiso explícito; no tocar Cloudflare settings, Neon main, secretos, datos reales, billing ni DNS. Objetivo USD 0. No Codex.

---

## Checkpoint Pages Settings — 2026-10-30 UTC

- TinyFish accedió a Settings de Pages `micro-app`, solo lectura. Production branch `main`; root directory vacío; build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; output `apps/web/dist`; build system v3; cache off; monitoring routes `*`; automatic deploys on; no deploy hooks; build comments on; preview access public by default; no custom domains; vars names only: `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL`.
- Compatibility date `2026-10-17`; flags panel mostró True; Functions setting mostró `Fail open` (no interpretar/cambiar sin confirmar).
- Repo main confirma monorepo pnpm `apps/*`; root package requiere Node `>=24.22.2 <25` pero no fija `packageManager`. Pendiente verificar Node/pnpm efectivos en build logs; evaluar pinning en PR separada.
- Build command compila web vía `apps/web/package.json` script `tsc -b && vite build && node scripts/postbuild.mjs`; API se valida en workflows separados.
- `apps/web/public/_headers` existe: nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP. CSP prod permite API Worker. Postbuild quita Worker de CSP en preview; Vite deja API base vacía y activa preview flag; auth.ts bloquea API y App.tsx deshabilita login y muestra aviso. Preview público por defecto, pero aislamiento API está implementado en main auditada. Mantener tests de regresión.
- `_redirects` no existe en `apps/web/public/`; UI no mostró configuración de redirects/headers.
- Cache deshabilitado puede consumir más build time; medir antes de cambiar. Pages usage/billing no consultados.
- Sin cambios en configuración/infra/secretos/builds/producción. PR #158 sigue draft y no fusionada.

# Continuidad prioritaria — 2026-10-30 UTC (Pages audit completada)

> Este bloque prevalece sobre notas inferiores. Continuar en la misma PR #158 y no crear otra PR para esta documentación.

- **PR #158:** https://github.com/BTF14/Micro-app/pull/158; abierta, draft, no mergeada. Rama `docs/workflow-deployment-audit-20261030`.
- **GitHub Actions:** corregida la clasificación anterior. Solo `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro) presentan duplicación general potencial con PR. Los otros workflows tienen filtros de rama/path o dispatch/schedule. No cambiar triggers hasta verificar contexts requeridos.
- **Cloudflare Workers:** Workers Free $0; cuotas observadas 100k requests/día, 10ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 cron triggers. Worker `micro-app-api`: main identificada como producción; docs branches como previews. PR #158 tiene previews de Worker exitosas.
- **Cloudflare Pages:** proyecto `micro-app`, repo `BTF14/Micro-app`, producción branch `main`; push a main dispara producción. Último deploy productivo observado activo para commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, timestamp `2026-10-30T01:30:08.9457Z`, URL de deployment `https://06553c7b.micro-app-63i.pages.dev`. Proyecto base `https://micro-app-63i.pages.dev`.
- **Previews Pages:** cada commit en ramas no productivas crea preview. PR #158 commit `79be208` preview successful en `https://945ae93c.micro-app-63i.pages.dev`; commit `d3f056b` preview successful en `https://70fea194.micro-app-63i.pages.dev`. Vista mostró 15 despliegues recientes (1 prod + 14 previews), 1.100 en historial; 15 visibles successful. No equivale a validar toda la historia.
- **Pendiente Pages:** Settings no cargó; build command, output dir, root dir, framework, build env, Functions, redirects, headers y uso/cuotas account-level no disponibles. No inventar.
- **Custom domain:** no se vio; solo pages.dev.
- **CI/CD:** Pages confirma auto-deploy main + previews non-main. Un merge a main puede desplegar frontend a producción aunque no haya workflow Pages deploy en GitHub. No fusionar sin autorización explícita.
- **Branch protection:** rulesets API vacío y endpoint legacy 403; estado real no confirmado.
- **Guardrails:** no Codex, no Neon main/SQL, no secretos/datos reales, no pagos, no modificar Cloudflare/DNS/tráfico, no merge/deploy sin permiso explícito. Coste objetivo USD 0; capacidad SaaS sin medir.

## Siguiente trabajo
1. Revisar Settings de Pages en solo lectura para completar root/build/output/runtime/Functions/redirects/headers.
2. Verificar los checks requeridos de GitHub por método accesible; no inferir protección ausente por 403.
3. Evaluar una reducción focalizada de los triggers push amplios, sin implementarla hasta saber los contexts requeridos.
4. Revisar diff y checks de PR #158 en su SHA exacto. Mantenerla draft y sin merge.
5. Continuar arquitectura multi-tenant y capacidad con pruebas sintéticas aisladas.

---

# Continuidad prioritaria — 2026-10-30 UTC (auditoría Cloudflare + corrección CI/CD)

> Este checkpoint prevalece sobre las notas anteriores de la auditoría de workflows. Verificar GitHub en vivo antes de cualquier operación.

- **Repositorio:** `BTF14/Micro-app`; PR de trabajo [#158](https://github.com/BTF14/Micro-app/pull/158), abierta y draft; no fusionada.
- **PR #158 HEAD observado antes de esta actualización:** `d3f056b780ddad62deb5c1e1c0f1679bba19bb50`; base `main` = `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- **Corrección crítica de auditoría:** la afirmación previa de siete workflows push+PR sin filtros fue incorrecta. La inspección directa de los 15 YAML muestra que solo `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro) tienen duplicación potencial general con PR. CI y Playwright limitan push a main; migration y project-progress usan listas explícitas de ramas; Semgrep limita a main; SDD, AutoSkills, Dependency Review, Daily Dependency Watch y Backup Restore Smoke tienen filtros de paths/branch según el detalle en [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No cambiar triggers todavía.
- **Cloudflare:** acceso al panel confirmado con TinyFish, inspección de solo lectura. Plan Workers Free ($0/mes); cuota observada 100.000 requests/día, 10 ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 Cron Triggers. Snapshot del panel: 183 requests, 0 errores y 106,68 build minutes en las últimas 24h; la vista del Worker también reportó 85 invocaciones y CPU P90 10 ms. Son métricas observadas, no benchmark ni capacidad garantizada.
- **Worker:** `micro-app-api` en `workers.dev`, conectado a `BTF14/Micro-app`. `main` figura como producción; ramas `docs/...` como previews. PR #158 obtuvo comentario automático Cloudflare Workers con preview deployment successful para commit `d3f056b7`, URLs distintas de commit y branch preview. No es producción.
- **Pages:** proyecto `micro-app`, `https://micro-app-63i.pages.dev/`, conectado al mismo repo. PR #158 obtuvo comentario automático Pages preview successful para `d3f056b`. Historial detallado de versiones/producción y consumo Pages no pudo extraerse.
- **Observabilidad:** Logs y Traces aparecían desactivados en la vista de Worker. Evaluar sin registrar secretos, cookies, tokens o datos personales.
- **Pendiente:** verificar Pages production branch/build settings/uso; confirmar uso real y alertas Workers/Pages; decidir si limitar pushes de secret-history/security tras revisar contexts obligatorios.
- **Protección GitHub:** rulesets API devolvió lista vacía; branch-protection endpoint legacy 403 por permisos. Estado real de protección/contextos requeridos NO CONFIRMADO.
- **Producción NO lista:** API aún carece de endpoints comerciales y autorización por operación/sucursal; capacidad multi-tenant no medida.
- **Guardrails:** no Codex; no Neon main/SQL remoto; no secretos; no datos reales; no pagos/upgrade; no cambios de Cloudflare/DNS/tráfico; no merge ni deploy sin autorización explícita específica. Objetivo USD 0.

## Próximas acciones
1. Completar revisión read-only de Pages y sus settings/versiones/consumo.
2. Confirmar contexts de checks y evaluar una única optimización CI dirigida a los dos workflows con push amplio.
3. Actualizar documentación/handoff y revisar PR #158 diff/checks del SHA exacto.
4. Continuar arquitectura multi-tenant y pruebas sintéticas aisladas; no habilitar operaciones comerciales antes de aprobar matriz de permisos y modelo branch/warehouse/register/shift.

---

# Continuidad prioritaria — 2026-10-30 UTC (post PR #157)

> Este checkpoint sustituye los estados inferiores que todavía describen PR #157 como abierta o main en el SHA anterior. Verificar GitHub en vivo antes de cualquier operación.

- **Main verificado:** `1ee1808af4aae484a71dc24750237ff4f4d934a0`, merge squash de [PR #157](https://github.com/BTF14/Micro-app/pull/157). PR #157 está cerrada y fusionada; su HEAD fue `6eb464c950f195ec67350977575aef77e9790e1d`.
- **Checks de PR #157:** el conector devolvió ocho workflow runs para el HEAD exacto y todos terminaron `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Secret history scan, Project progress dashboard y Dependency review. La consulta es de primera página. El combined status devolvió vacío y no se recuperó evidencia post-merge para el merge SHA; no afirmar CI post-merge.
- **PRs abiertas:** [PR #158](https://github.com/BTF14/Micro-app/pull/158), documental y en borrador. Antes de abrirla no había otras PRs abiertas.
- **Workflows/deploy:** auditoría de los 15 YAML en [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No hay workflow de GitHub Actions que despliegue Pages o Workers. Los builds de Cloudflare observados anteriormente apuntan a integración Git externa; su configuración efectiva no es visible desde el repo.
- **Riesgo de merge:** un push a `main` puede activar el despliegue externo de Cloudflare. No fusionar cambios —aunque sean solo documentación— sin autorización explícita de producción y sin conocer la configuración de esa integración.
- **Duplicación CI:** siete workflows escuchan a la vez `push` y `pull_request` sin filtros de branch/path; `sdd-docs-validation` sí limita `main` y paths; commits a ramas con PR pueden duplicar ejecuciones. No cambiar todavía: primero revisar branch protection/rulesets y contexts requeridos.
- **Estado de producto:** producción NO lista; API solo auth/health; sin rutas comerciales HTTP; tenant helper sin enforcement de permisos por operación ni branch scope; matriz de roles no aprobada; capacidad multi-tenant no medida.
- **Guardrails:** no Codex, no Neon `main`, no secretos, no datos reales, no despliegue, no planes pagos; coste objetivo USD 0.

## Próximas acciones prioritarias

1. Obtener auditoría de solo lectura de branch protection/rulesets y confirmar contexts requeridos antes de optimizar workflows.
2. Solicitar/usar acceso de solo lectura al panel Cloudflare para confirmar ramas Git conectadas, build settings, deployments y cuotas; no modificar configuración.
3. Diseñar la reducción de workflows duplicados preservando todos los checks obligatorios.
4. Continuar el inventario de queries/callers y ERD org → branch → warehouse/register/shift; no migrar ni crear endpoints comerciales hasta aprobar matriz y diseño.
5. Mantener documentación y README sincronizados con hechos comprobados.

---

# Continuidad viva — 2026-10-30 UTC

> Este bloque prevalece sobre los snapshots históricos inferiores. Verificar GitHub y el SHA vivo antes de actuar.

- **Repositorio:** `BTF14/Micro-app`; rama principal protegida: `main`.
- **Main actual verificado:** `18961456ac535146c4a1687d3b07d8f6693ce141` — merge squash de [PR #156](https://github.com/BTF14/Micro-app/pull/156). GitHub confirmó `merged=true`; commit firmado/verificado por GitHub.
- **PR #156:** fusionada. Su HEAD exacto `6c068f3e9734736ac26e51ff754e39915d660abe` tuvo 9/9 workflows de GitHub Actions en `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Secret history scan, SDD/documentation validation, Project progress dashboard y Dependency review. No se obtuvo evidencia separada de una nueva ejecución post-merge para el merge commit; no afirmar que existió. No hubo reviews formales ni threads en la PR; se aplicó revisión manual del diff completo como fallback por indisponibilidad de Codex.
- **PRs abiertas al checkpoint:** ninguna según consulta en vivo inmediatamente después del merge. Repetir antes de crear o fusionar otra.
- **Alcance de PR #156:** reconciliación documental SaaS, identidad, capacidad, plan y handoff; corrección de la matriz para dejar claro que cajero/inventario necesitan asignaciones por sucursal y caja/turno. No cambió código de aplicación, esquema, migraciones, workflows, secretos ni infraestructura.
- **Identidad:** Google OAuth + allowlist/bootstrap de un solo uso, state/PKCE, sesión HttpOnly revocable y validación Google `email_verified` están implementados según PR #153/#155. Registro y login por contraseña están fail-closed. MFA, recuperación, enlace de cuentas preexistentes, limpieza automática de sesiones/rate limits y ciclo administrativo completo siguen pendientes.
- **Control de abuso:** no se encontró rate limiting a nivel de aplicación en los módulos API; `auth_rate_limits` existe en SQL pero no tiene callers runtime. No afirmar que OAuth/bootstrap estén limitados por tasa. Verificar reglas Cloudflare por separado y diseñar protección distribuida compatible con Workers.
- **Inventario de rutas API verificado en `apps/api/src/index.ts`, `auth.ts`, `google-auth.ts`:** `GET /health`; `POST /auth/register` (deshabilitado); `POST /auth/login` (deshabilitado); `GET /auth/me`; `POST /auth/logout`; `GET /auth/google`; `POST /auth/google` (bootstrap); `GET /auth/google/callback`. No hay handlers HTTP comerciales para productos, proveedores, catálogo, compras/recepciones, inventario, ventas, pagos, devoluciones, caja o reportes.
- **Contexto tenant:** `resolveTenantContext` valida token/sesión, usuario, organización y membresía activos y devuelve user/org/role. La búsqueda de callsites no encontró llamadas desde handlers: el helper no está conectado actualmente a rutas HTTP. No aplica permisos por operación ni branch scope. El selector de organización es una solicitud validada, no autorización por sí mismo.
- **Transacciones:** `withDatabaseTransaction` existe y se usa en el bootstrap Google de un solo uso para bloquear el sentinel. No hay endpoints comerciales que lo utilicen; el helper todavía no demuestra atomicidad de ventas/inventario.
- **Esquema:** `0001_initial.sql` define organizaciones/membresías y entidades comerciales con varias FKs compuestas tenant-scoped, pero no sucursales, almacenes, cajas/turnos, compras/recepciones, devoluciones ni transferencias. `products.stock_quantity` es por organización. La migración inicial `0001_initial.sql` declara expresamente que no se ha aplicado a Neon `main`. El estado histórico del repositorio registra que `0002_google_identity.sql` sí se aplicó a Neon `main` el 2026-10-25; no se revalidó ese estado remoto en esta sesión. No ejecutar nuevas migraciones allí.
- **Hallazgos de integridad para resolver antes de handlers comerciales:** SQL no garantiza que una venta completada tenga líneas/pagos que reconcilien el total; el saldo de producto y el ledger de movimientos pueden divergir si la API no actualiza ambos atómicamente; referencias polimórficas de movimientos no tienen FK a una entidad de negocio; el esquema no impone idempotencia de pagos ni el último owner activo. Son brechas de diseño/contrato, no incidentes de datos observados.
- **Optimización Neon:** `withDatabaseClient` crea un `Client` request-scoped y el helper transaccional usa BEGIN/COMMIT/ROLLBACK. Evaluar `neon()` HTTP para lecturas simples solo con benchmark; conservar cliente interactivo para operaciones atómicas.
- **Arquitectura objetivo:** SaaS multi-organización, multi-sucursal y multiusuario. Es dirección documentada, no funcionalidad completa. La matriz de permisos sigue **NO aprobada**; no implementar permisos comerciales desde recomendaciones no aprobadas. La autoridad para administrar la allowlist global debe ser un operador de plataforma separado de los roles `owner/admin` de cada organización; identidad, recuperación y delegación aún no están aprobadas.
- **Capacidad:** número de organizaciones, sucursales y usuarios concurrentes sostenible **sin medir**. Revisar Neon y Cloudflare y ejecutar carga sintética antes de prometer límites. Presupuesto objetivo USD 0.
- **Producción:** **NO LISTA**. No desplegar, tocar secretos, datos reales ni Neon `main`; no activar planes o servicios pagos.
- **Continuidad:** la actualización de auditoría/documentación está en [PR #157](https://github.com/BTF14/Micro-app/pull/157), rama `docs/post-pr156-audit-continuity-20261030`. Sigue abierta; no fusionar hasta que todos los checks requeridos del HEAD exacto terminen en success y el diff final se revise manualmente.

## Próximas acciones obligatorias

1. Completar el inventario de consultas SQL y callers de autenticación/tenant; registrar rutas, validaciones, queries y pruebas.
2. Completar ERD organización → sucursal → almacén/caja/turno → operaciones, con propiedad y claves compuestas; mantenerlo en diseño hasta cerrar decisiones.
3. Resolver la matriz de permisos con decisiones explícitas del propietario sobre excepciones, descuentos, anulaciones, inventario, exportaciones y delegación.
4. Diseñar restricciones y transacciones para venta/pagos/stock/ledger, idempotencia, concurrencia, referencias y auditoría.
5. Crear pruebas PostgreSQL efímeras cross-tenant/cross-branch y de rollback/concurrencia antes de habilitar endpoints comerciales.
6. **Rama histórica revisada:** `feat/neon-transaction-adapter` corresponde a la PR [#1](https://github.com/BTF14/Micro-app/pull/1), ya fusionada el 2026-10-17 (merge `b6511d0876e33096f75df2466653449165888821`). La rama está 14 commits ahead y 242 behind respecto a main actual; no reabrir ni fusionar su diff antiguo. La implementación vigente está en main y se revisa desde sus callers actuales.
7. Medir límites vivos de Neon/Cloudflare y carga sintética; no fijar capacidad SaaS antes de ello.
8. Mantener README, CURRENT_STATE, PROJECT_PLAN, STATE_JOURNAL y HANDOFF sincronizados tras cada hito verificado.

---

# Continuidad viva — 2026-10-30

> Prioridad de estado para esta sesión; las notas históricas inferiores deben contrastarse con GitHub en vivo.

- PR [#156](https://github.com/BTF14/Micro-app/pull/156), rama `docs/reconcile-main-after-pr155-20261029`, base `main`. La punta de rama se consulta en GitHub; no reutilizar SHA históricos.
- Reconciliación documental realizada: README, AGENTS, política de colaboración, Constitución y SCHEMA_REVIEW. README ya refleja el estado verificado de Google OAuth/allowlist (PR #153/#155) y diferencia claramente el objetivo SaaS de lo implementado.
- Autenticación: Google OAuth, allowlist/bootstrap protegido, state/PKCE, sesión HttpOnly revocable y validación de `email_verified` implementados. Password login/registro siguen fail-closed. MFA, recuperación de cuenta/administrativa y limpieza automática de sesiones siguen pendientes.
- API: autenticación y `GET /health`; no endpoints comerciales HTTP de catálogo, inventario, compras, ventas, pagos o devoluciones. No hay esquema de sucursales/almacenes/cajas/turnos implementado.
- SaaS multi-organización/multi-sucursal es arquitectura documentada, no funcionalidad completa. Capacidad de tenants sin medir; revisar Neon y Cloudflare y ejecutar pruebas sintéticas antes de fijar cuotas.
- Regla permanente añadida: README se actualiza tras cada avance concreto y verificado, sin anunciar funciones incompletas o propuestas.
- Cambios de esta revisión solo documentales. No se modificaron código, esquema, migraciones, workflows, secretos, Neon, datos reales ni producción. Producción NO lista; presupuesto objetivo USD 0.
- Los workflows deben comprobarse para el HEAD exacto más reciente. La revisión independiente solicitada sigue siendo requisito; no fusionar sin ella.

## Siguiente acción
1. Verificar SHA vivo, diff completo, reviews/threads y workflows de PR #156.
2. Revisar cada afirmación del README contra código y API_INTEGRATION.
3. Mantener PR abierta para revisión independiente.
4. Continuar auditoría read-only de esquema, rutas, constraints, índices y diseño org-sucursal-almacén-caja; no implementar permisos comerciales antes de aprobar la matriz.

---

# Continuidad viva — 2026-10-29

> Esta sección es la fotografía prioritaria de continuidad de esta sesión. Las notas históricas debajo se conservan, pero no deben tratarse como estado actual si contradicen esta sección. Verificar GitHub otra vez antes de cualquier operación.

- Repositorio: `BTF14/Micro-app`; rama base `main`.
- PR documental activa: [#156](https://github.com/BTF14/Micro-app/pull/156), abierta y mergeable según última consulta; base SHA `5a9bdc5a18a54c3c68639f52125d913d4e725b91`. El HEAD cambia con cada commit documental: consultar el SHA vivo en GitHub antes de actuar; no copiar un SHA histórico de este archivo. La PR contiene 9 archivos modificados. No hay reviews ni review threads. En la última consulta del HEAD `a5aced77ffd1a628bb8175b91cbc7305144fb696`, se observaron 8 workflows: 1 success, 4 in_progress/pending y 3 queued; revisar el HEAD posterior y esperar sus resultados.
- PR #156 incluye `docs/SAAS_ARCHITECTURE_DECISIONS.md` y actualizaciones de CURRENT_STATE, HANDOFF, PROJECT_PLAN, STATE_JOURNAL, ARCHITECTURE_EVOLUTION_PLAN, PRICING_CACHE_ARCHITECTURE y matriz de roles. Se reutiliza; no abrir PR documental solapada.
- PR #155 está fusionada en main (merge `5a9bdc5a18a54c3c68639f52125d913d4e725b91`). La descripción de PR #156 confirma este SHA como base.
- Arquitectura recomendada: plataforma SaaS multi-organización, multi-sucursal y multiusuario; catálogo compartido por organización, existencias por sucursal/almacén, caja/turno por sucursal, usuarios multi-organización y roles con alcance. Ver `docs/SAAS_ARCHITECTURE_DECISIONS.md`.
- BCV: Cron Trigger + validación + histórico `exchange_rates` + última tasa válida con frescura visible. Fuente oficial/gratuita aún no confirmada; no inventar endpoint ni tasa.
- Buscador: barcode/SKU exactos antes que nombre; debounce, índices, límites, tenant scoping y medición. Neon fuente de verdad; KV de catálogo solo si benchmark lo justifica. La caché nunca confirma ventas ni stock.
- Modelo de sucursales/almacenes/cajas aún no implementado; stock actual por organización. No crear migraciones hasta cerrar ERD, reglas de alcance y matriz de permisos.
- Roles base recomendados: owner/admin/cashier/inventory; matriz existente sigue siendo propuesta y requiere reconciliar alcance por sucursal. Umbrales de descuento/anulación requieren decisión explícita.
- Capacidad de tenants no medida. Neon y Cloudflare tienen límites; medir sintéticamente antes de fijar planes/cuotas o prometer número de empresas.
- Producción: **NO lista**. No desplegar producción, no tocar secretos, datos reales ni Neon `main`; no incurrir en costes. Presupuesto objetivo $0.
- Backup: restauración técnica del backup remoto se verificó en run 40955935124; siguen pendientes integridad de datos comerciales representativos, RPO/RTO, alertas/retención y coste total.

- **Verificación de CI más reciente completa:** HEAD `8c15e13fa001a14a0ddf9f2432bc17efb30d476d` tuvo los 8 workflows requeridos en `success`, incluidos los seis contexts de protección (`verify`, `postgres-migration`, Chromium authentication smoke tests, JavaScript/TypeScript static analysis, Trivy y secret-history scan), además de Dependency Review y dashboard. Runs: 40978525543, 40978521649, 40978521865, 40978521671, 40978521571, 40978521386, 40978521350 y 40978521537. Después se añadieron dos commits documentales hasta `23cbb313ebb163d3c808f8d0953b85645262c520`; no se devolvieron runs/statuses para ese HEAD. Por tanto, **no declarar verde el HEAD actual** ni fusionar hasta verificarlo.

## Próximas acciones obligatorias

1. Verificar el nuevo HEAD de PR #156, diff, workflows y revisión independiente. No fusionar sin satisfacer la política y la revisión adicional solicitada.
2. Completar auditoría read-only del esquema real, handlers, constraints, índices, queries y rutas; registrar hallazgos con archivos/SHA.
3. Finalizar ERD organización → sucursal → almacén/caja/turno → operaciones, propiedad y claves tenant/branch-scoped.
4. Reconciliar `docs/sdd/role-permission-decision-matrix.md` con asignaciones por sucursal/caja; separar propuesta de decisiones que requieren al propietario.
5. Diseñar contratos API, transacciones, idempotencia, concurrencia y pruebas cross-tenant/cross-branch antes de implementar endpoints comerciales.
6. Investigar fuente BCV fiable y condiciones de acceso; diseñar job programado y fallback stale; no scrapear fuente frágil sin validar.
7. Medir Neon y Cloudflare con carga sintética y comprobar cuotas vigentes; no fijar límites SaaS todavía.
8. Mantener estado, diario y handoff actualizados al completar cada bloque.

## Estado vivo — hardening HTTPS de FRONTEND_ORIGIN en preparación (2026-10-29 UTC)

- Base verificada: `main` = `0ba45e47daa5af9bbd9034690443405aa8bedf44`; PR #154 sigue abierta, sin reviews registradas. Sus 8 workflows consultados para `b4508fda6f4d5f042dbeb2b48c7c9910a8c3852d` terminaron en `success`, pero falta la revisión adicional solicitada; no fusionar por ahora.
- Hallazgo confirmado: `apps/api/src/google-auth.ts` validaba la forma/origen de `FRONTEND_ORIGIN` pero no restringía HTTP a localhost, a diferencia de `apps/api/src/index.ts`. No hay evidencia de explotación; es una inconsistencia de configuración.
- Rama de corrección: `fix/google-auth-frontend-origin-https-20261029`. La propuesta alinea el validador de Google OAuth con la regla global: HTTPS, o HTTP solo para localhost/127.0.0.1/[::1], sin credenciales, path, query ni hash.
- Se añade prueba unitaria de regresión para origen HTTPS, loopback HTTP y entradas no válidas. En SHA `18cf2f158552ce7c97bacc66018e0cfdae60e2d3`, los 8 workflows consultados (CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Dependency review, Secret history scan y dashboard) terminaron `success`. CI incluyó build/typecheck, unit tests y PostgreSQL auth integration tests. El cambio sigue en PR #155, no fusionado.
- No se modifica bootstrap POST/GET, OAuth state/PKCE, esquema ni migraciones. No se accede/modifica Neon, secretos, datos reales ni producción. Cloudflare previews automáticos no equivalen a despliegue productivo.
- Arquitectura comercial sigue bloqueada para implementación: no hay rutas HTTP de productos/inventario/ventas; el stock existente es por organización, no sucursal; matriz de permisos sigue sin aprobación. Primero cerrar diseño organización → sucursal → membresía/rol y aprobación del propietario.
- Capacidad demostrada de empresas/sucursales sigue sin determinar; respetar `docs/CAPACITY_AND_LIMITS.md` y presupuesto $0.

---

## ESTADO VIVO PRIORITARIO — PR #152 fusionada; corrección de bootstrap en revisión (2026-10-29 UTC)

- **PR #152 fusionada:** merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`; el HEAD de PR fue `e16b577d8454b3f2109a857386516a41fdd0a271`. Los 13 checks de ese HEAD pasaron; los nueve checks post-merge del merge commit también terminaron en `success`.
- **Siguiente corrección P1 en rama** `fix/bootstrap-token-post-body-20261029`: eliminar el transporte de `bootstrap_token` por query string, aceptar bootstrap solo por POST con cuerpo `application/x-www-form-urlencoded`, validar Origin exacto, limitar tamaño/forma del cuerpo y comprobar el token antes de redirigir a Google. Se añaden pruebas de regresión para URL, origen y parámetros ambiguos.
- **Estado de la corrección:** rama de trabajo no fusionada; no declarar mitigado hasta que los checks del SHA final pasen y el cambio se revise. El bootstrap sigue siendo de un solo uso en la base mediante la transacción existente.
- **Límites preservados:** no se desplegó producción, no se tocaron secretos ni Neon `main`, no se ejecutó SQL ni se borraron ramas/backups. La PR #152 solo actualizó documentación y no cambió la aplicación.
- **Después de la corrección:** continuar auditoría multiempresa y decisión de sucursales/roles; no implementar módulos comerciales antes de aprobar la matriz de permisos. La capacidad de organizaciones/sucursales sigue sin medir.

---

## ESTADO OPERATIVO VIGENTE — restauración del backup remoto verificada (2026-10-29 UTC)

- [Run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124) del workflow `.github/workflows/backup-real-restore.yml` terminó en `success`.
- Se descargó `daily/backup-2026-10-29T17-29-48Z.dump.age`; el SHA-256 del objeto remoto coincidió con su sidecar (`OK`), `age` lo descifró y PostgreSQL 18 efímero lo restauró sin error. `pg_restore --list` leyó el archivo y la validación encontró tablas base en `public`. Se limpiaron los archivos descifrados temporales.
- **Conclusión:** verificada la restauración técnica de la copia remota exacta. No se tocó Neon `main` ni producción.
- **Límite:** no se verificaron conteos ni relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo o coste total $0. La comprobación de esquema por sí sola no garantiza que los datos comerciales estén completos.
- **Siguiente paso:** planear una comprobación segura de conteos/relaciones mediante datos sintéticos o metadatos no sensibles; medir RPO/RTO; revisar alerta, retención y coste. No imprimir datos comerciales ni solicitar la clave privada age por chat.

---

## ESTADO VIVO PRIORITARIO — PR #151 fusionada y auditoría multiempresa iniciada (2026-10-29 UTC)

- **Base de código auditada:** `70984baf7f6ac5a442e6c2364aaf6d7d4ebbc7d4`, merge squash de la PR [#151](https://github.com/BTF14/Micro-app/pull/151); los cambios de esta rama son solo documentación. La PR añadió guardrails de capacidad y referencias de límites de Neon/Cloudflare; sus checks del SHA de cabeza terminaron en éxito antes de fusionar.
- **PR abiertas:** ninguna en la consulta posterior a la fusión; repetir consulta en vivo antes de abrir o fusionar trabajo nuevo.
- **Capacidad:** organizaciones/sucursales/usuarios concurrentes siguen **sin medir**. La API Neon de solo lectura informa plan `free_v3`, límite de 10 ramas y 3 ramas existentes (`main`, `micro-app-integrity-test`, `restore-test-20261028`); tamaño lógico de rama 512 MiB y autoscaling predeterminado 0.25 CU. No se eliminó ninguna rama. El detalle/fecha está en `docs/CAPACITY_AND_LIMITS.md`. Las cuotas documentadas no demuestran capacidad sostenible de la aplicación ni verifican el consumo/plan real de Cloudflare.
- **Arquitectura comprobada en `main`:** API Hono registra rutas de autenticación y `GET /health`; no hay aún handlers comerciales HTTP para productos, proveedores, ventas, pagos o inventario. `resolveTenantContext` valida sesión/membresía/organización, pero no constituye por sí solo autorización por operación.
- **Sucursales:** no se encontró entidad/tabla de sucursal en `apps/api/migrations/0001_initial.sql` ni una relación de sucursal en el esquema inicial revisado. No crear migración hasta decidir el alcance de sucursal, pertenencia de usuarios, permisos y propiedad de datos.
- **Hallazgo de seguridad preliminar:** `apps/api/src/google-auth.ts` acepta `bootstrap_token` en la query string de `/auth/google` y luego lo copia a una cookie HttpOnly. No hay evidencia de filtración activa, pero la URL puede quedar en historial/registros; revisar un flujo que no transporte secretos en URL antes de habilitar bootstrap con usuarios reales. El análisis está documentado en `docs/ARCHITECTURE_EVOLUTION_PLAN.md`; no se modificó código.
- **Producción:** **NO lista**. Siguen pendientes flujos comerciales reales, autorización por operación y pruebas cross-tenant, matriz de roles aprobada, integridad/idempotencia/concurrencia, tasa BCV/fiscalidad y validación operativa completa de backup.
- **Siguiente paso:** cerrar la reconciliación de documentos de estado; después completar la auditoría de solo lectura de esquema, permisos y consultas y preparar un contrato explícito de organización → sucursal → membresía/rol antes de implementar rutas comerciales. No tocar Neon `main`, secretos ni producción.

> Los snapshots históricos que aparecen más abajo se conservan como historial; si contradicen este estado prioritario, no deben tratarse como estado vivo sin una verificación nueva de GitHub/código.

---

## ESTADO OPERATIVO VIGENTE — respaldo cifrado (2026-10-29 UTC)

> Esta sección prevalece sobre notas históricas inferiores que todavía digan que el incidente de subida está pendiente. No borrar el historial: interpretar cada incidente según la evidencia posterior.

- **Subida del backup: VERIFICADA.** Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) terminó en success: `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, commit remoto `2b038bd`, push a la rama `main` del repositorio privado de backups y retención `deleted 0 file(s)`.
- **Par cifrado persistido según logs:** `daily/backup-2026-10-29T17-29-48Z.dump.age` y `.sha256`.
- **Restauración técnica real: VERIFICADA** en run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124), tras checksum, descifrado y restauración en PostgreSQL 18 efímero. La prueba sintética automatizada es complementaria.
- Siguen pendientes la validación de datos comerciales poblados/conteos/relaciones, medición de RPO/RTO, alerta de fallo y evidencia del coste total $0.
- PR [#148](https://github.com/BTF14/Micro-app/pull/148) quedó fusionada el 2026-10-29; merge commit `0681aea75b555d5eb0b60dfec26c2706207fae45`. No está abierta y no debe reabrirse para este trabajo.
- **Plan de arquitectura:** [docs/ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md). La auditoría comienza después de cerrar la restauración real del backup; primero lectura y diagnóstico, sin migraciones ni cambios productivos.
- Límites vigentes: no desplegar producción, no acceder a Neon `main`, no pedir ni imprimir claves privadas age, no borrar backups/recursos, y no declarar coste $0 sin evidencia.

---

## ESTADO VIVO PRIORITARIO — tras fusionar PR #137 (2026-10-29 UTC)

**Repositorio único:** https://github.com/BTF14/Micro-app  
**Main verificado:** `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5` — merge de [PR #137](https://github.com/BTF14/Micro-app/pull/137). En la última búsqueda, no había PR abiertas; repetir la consulta antes de operar.  
**Autorización del propietario:** temporalmente autoriza a la IA a investigar, implementar, verificar y fusionar PRs con criterio. Calidad/seguridad por encima de rapidez. No inundar el repo de PRs ni dejar ramas/PRs de prueba olvidadas.

### Lo que realmente se hizo y lo que no

- PR #137 se fusionó. Añadió auditoría de versiones estables, plan de actualización, y `.github/workflows/daily-dependency-watch.yml`.
- **No se actualizaron dependencias en PR #137.** La actualización de paquetes sigue pendiente; no describir los majors propuestos como instalados.
- El monitor diario está en `main`, programado a las 08:15 UTC (04:15 Venezuela), con `workflow_dispatch`, permisos `contents: read`, `pnpm install --frozen-lockfile`, `pnpm outdated -r`, comprobación del último parche Node 24 LTS y `pnpm audit --audit-level high`. Es de solo lectura y no abre PR ni modifica dependencias.
- Se confirmó el run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) en SHA `0763c70647ff11a8bcf91386a274d549246407ef`; instalación congelada y `pnpm audit --audit-level high` pasaron, con `No known vulnerabilities found`. La revisión de logs detectó que Bash ejecutó fragmentos entre backticks y que `pnpm outdated -r` no dejó un listado visible; por tanto, el run no validó bien el informe de actualizaciones. La corrección está en `fix/dependency-watch-report-20261029`; esperar CI y un nuevo run antes de declarar el monitor verificado.
- En la última consulta de checks de `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5`: `verify`, Chromium auth, migración PostgreSQL, análisis estático y Trivy mostraban éxito; Workers, Pages y una instancia de scan de historial seguían en curso/duplicadas. Volver a consultar el estado del SHA exacto; no declarar todo verde hasta que termine.
- No se modificaron dependencias, lockfile, secretos, Neon `main`, datos reales ni se hizo despliegue manual en esta tarea. El check de Cloudflare puede generar su propia actividad automática; no equivale a que la IA hiciera un despliegue manual.

### Inventario declarado/resuelto que debe verificarse otra vez en main

- Node range `>=24.22.1 <25`; usar Node 24 LTS y actualizar al parche estable vigente tras comprobar compatibilidad.
- pnpm lockfile v9; no saltar automáticamente a otro major de pnpm.
- TypeScript `5.9.3` (raíz/API/web); TypeScript 7 no está aplicado.
- Hono `4.13.14`; Workers types `5.20261026.1`; Wrangler `4.152.0`.
- React/react-dom `19.3.1`; tipos React y React DOM `19.3.0`.
- Vite `7.3.7`; `@vitejs/plugin-react` `5.2.0`; jsdom `26.1.0`.
- Override crítico: `undici@7.30.1` en `package.json` y `pnpm-lock.yaml`. No aceptar que desaparezca el override o que el lockfile resuelva `undici@7.29.1`. Esto ya causó `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y un hallazgo alto.
- PRs #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) se cerraron sin merge. No asumir que esos upgrades se instalaron. Verificar releases estables/registry y compatibilidad actual antes de retomar.

### Siguiente trabajo obligatorio

1. Leer los documentos de arranque enumerados más abajo y verificar SHA de `main`, PRs abiertas, checks y workflows en vivo.
2. Confirmar que todos los checks post-merge de #137 terminaron y ejecutar el monitor diario manualmente; guardar URL del run, SHA, resultado y resumen.
3. Auditar versiones estables y advisories en el registry al momento de trabajar; priorizar vulnerabilidades explotables/alta severidad y parches compatibles, no solo números de versión.
4. Hacer una única PR coherente para la actualización técnica: primero parches/minors compatibles; migrar Vite 8 + plugin-react 6 + jsdom 30 y evaluar TypeScript 7 con revisión de engines, peer dependencies, breaking changes y pruebas. Separar cambios si mezclar majors impide aislar fallos, pero no abrir PR por paquete sin necesidad.
5. Generar el lockfile con la versión real de pnpm y mantener `pnpm install --frozen-lockfile` verde. Nunca editar resoluciones del lockfile a mano. Conservar el override de Undici o sustituirlo solo con evidencia de seguridad revisada.
6. Exigir checks verdes en el SHA exacto: verify, build/tests web y API, typecheck, migración PostgreSQL, Chromium auth, análisis estático, Dependency Review, Trivy, scan de secretos/historial y builds Pages/Workers. Diagnosticar logs y corregir causa raíz antes de fusionar.
7. Tras merge, comprobar versiones declaradas y resueltas, override, checks de main y ejecutar/documentar el monitor. Actualizar `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md`, `STATE_JOURNAL.md` y plan si cambia el estado.
8. Mantener los límites del proyecto: no cambiar secretos ni pedirlos, no tocar Neon `main` ni datos reales, no desplegar manualmente producción. Restauración integral con datos sintéticos sigue pendiente para la última fase. No borrar ramas/recursos a través de métodos alternativos si un control de seguridad bloquea la acción.

### Documentos que hay que leer antes de actuar

`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md`. Las notas antiguas dentro de estos archivos son histórico; esta sección de estado vivo tiene prioridad, pero siempre revalidar contra GitHub.

---

## Auditoría de versiones del mercado y plan de actualización — 2026-10-29

**Propósito:** responder a la petición del propietario de mantener Micro app al día frente a riesgos de seguridad, sin confundir “última versión publicada” con “versión más segura para producción”.

### Hechos del repositorio en main (SHA verificado antes de esta nota: 59ad394d6dc5035b114db5379b2e1680d1e7969f)

- Node declarado: >=24.22.1 <25. La línea Node 24 es LTS; la publicación oficial consultada anuncia Node 24.22.2 como parche LTS del 2026-10-28. Mantener la línea 24 y actualizar el parche, sin ampliar a Node 26 hasta probar la compatibilidad del runtime y CI.
- pnpm lockfile v9. No se debe cambiar de major del gestor sin verificar cómo afecta el lockfile y las instalaciones congeladas.
- TypeScript: ^5.9.3, lockfile 5.9.3 en raíz, API y web.
- API: Hono ^4.13.14 (resuelto 4.13.14), @cloudflare/workers-types ^5.20261026.1, Wrangler ^4.152.0.
- Web: React/React DOM ^19.1.1 (resueltos 19.3.1), Vite ^7.1.7 (resuelto 7.3.7), @vitejs/plugin-react ^5.0.4 (resuelto 5.2.0), jsdom ^26.1.0 (resuelto 26.1.0).
- Override crítico de seguridad: undici: 7.30.1 en package.json y pnpm-lock.yaml. Nunca aceptar un lockfile que quite el override o resuelva undici@7.29.1; eso ya provocó ERR_PNPM_LOCKFILE_CONFIG_MISMATCH y un hallazgo alto en Dependency Review.

### Exploración pública de versiones estables (consultada el 2026-10-29; no sustituye el registro npm en el momento de actualizar)

| Componente | Versión publicada observada | Situación en Micro app / decisión |
| --- | --- | --- |
| Node.js | 24.22.2 LTS; 26.13.0 LTS también aparece en el blog oficial | Mantener Node 24 LTS; actualizar parche y validar CI. No ampliar major sin prueba. |
| TypeScript | 7.0.2 latest | Upgrade mayor pendiente; probar en rama separada o grupo muy controlado. No usar beta/dev. |
| Vite | 8.3.5 latest; 7.3.7 figura como versión anterior | Upgrade mayor pendiente; revisar requisitos de Node y peer dependencies. |
| @vitejs/plugin-react | 6.1.2 latest | Requiere verificar compatibilidad con Vite 8 y build del frontend. |
| jsdom | 30.1.3 | Upgrade mayor pendiente; comprobar requisitos de Node y todas las pruebas DOM. |
| Wrangler | 4.154.0 latest | Subir de 4.152.0 después de CI, tipos y build Worker. |
| Hono | 4.13.14 | Ya coincide con la versión estable observada. No migrar a Hono 5 RC: es pre-release. |
| React / react-dom | 19.3.1 latest | Ya resueltos en 19.3.1. |
| @types/react, @types/react-dom | 19.3.0 latest en las páginas consultadas | Ya resueltos en 19.3.0. Mantener sincronizados con React y TypeScript. |
| pnpm | 12.16.1 latest observado; también hay líneas 10.x/11.x | No cambiar major automáticamente; verificar packageManager, lockfile v9 y CI antes de migrar. |
| @cloudflare/workers-types | Las páginas indexadas consultadas muestran versiones distintas y retrasadas respecto al repo | No declarar una “última” versión sin consultar directamente el registry durante el cambio. La versión del repo es 5.20261026.1. Cloudflare recomienda considerar wrangler types generado desde configuración/compatibility date; estudiar como migración separada. |

Fuentes públicas consultadas:
- Node releases: https://nodejs.org/en/blog/release y https://nodejs.org/en/about/previous-releases
- TypeScript: https://www.npmjs.com/package/typescript
- Vite: https://www.npmjs.com/package/vite
- plugin React: https://www.npmjs.com/package/@vitejs/plugin-react
- jsdom: https://www.npmjs.com/package/jsdom
- Wrangler: https://www.npmjs.com/package/wrangler
- Hono: https://www.npmjs.com/package/hono
- React: https://www.npmjs.com/package/react
- pnpm: https://www.npmjs.com/package/pnpm
- Workers types: https://www.npmjs.com/package/@cloudflare/workers-types

### Plan de actualización seguro — no marcar como completado hasta ejecutarlo

1. Actualizar primero los parches de Node 24 y dependencias minor/patch compatibles; comprobar advisories, pnpm install --frozen-lockfile, Dependency Review, Trivy y escaneo de secretos.
2. Preparar un único grupo coherente de herramientas frontend mayores: Vite 8 + @vitejs/plugin-react 6 + jsdom 30, junto con TypeScript 7 solo si los scripts/configuración lo soportan. Evitar cuatro PRs independientes que creen lockfiles divergentes; una PR coherente con pruebas completas es preferible.
3. Generar el lockfile con pnpm real; no editar manualmente las resoluciones del lockfile ni aceptar que desaparezca overrides: undici 7.30.1.
4. Validar en SHA exacto: instalación congelada, build frontend, tests frontend, typecheck API/web, tests API, migraciones PostgreSQL, smoke tests Chromium, análisis estático, Dependency Review, Trivy, scan de historial y builds Cloudflare Pages/Workers.
5. Inspeccionar requisitos engines, peer dependencies, breaking changes y notas de seguridad de cada paquete. Si falla algo, arreglar causa real en la misma rama; no crear una cadena de PRs de prueba.
6. Fusionar solo si todos los checks obligatorios están verdes y el diff/lockfile se revisaron. Tras merge, volver a leer manifiestos/lockfile y comprobar checks del SHA de main.
7. No actualizar Node a 26, pnpm a 12 o Workers types a una versión no verificada solo para igualar un número de versión. Tratar cada cambio de runtime/gestor como decisión de compatibilidad.
8. Continuar con actualizaciones de seguridad periódicas y Dependabot; no prometer que “todo es seguro” solo porque los paquetes estén al día.

**Límite actual:** esta nota es auditoría y plan; no ha cambiado ninguna dependencia ni lockfile. No se ha ejecutado instalación local durante esta revisión. La PR #136 fue documental y no actualizó paquetes.

### Monitorización diaria de dependencias — añadido en esta rama, pendiente de merge

- Workflow nuevo: `.github/workflows/daily-dependency-watch.yml`.
- Frecuencia: diaria a las 08:15 UTC (04:15 Venezuela) y ejecución manual mediante `workflow_dispatch`.
- Ejecuta instalación reproducible con `pnpm install --frozen-lockfile`, muestra versión del Node usado y consulta el último parche publicado de Node 24 LTS desde el índice oficial.
- Ejecuta `pnpm outdated -r` para visibilizar dependencias directas con actualizaciones y `pnpm audit --audit-level high`; un fallo del audit deja el informe en el resumen y falla el workflow para llamar la atención.
- El informe queda en el resumen de GitHub Actions. No crea PR, no actualiza dependencias, no escribe manifiestos/lockfile, no manda email y no despliega.
- Dependabot permanece semanal para PRs de npm y GitHub Actions; el workflow diario es observabilidad adicional, no remediación automática.
- Limitaciones: el resultado de `pnpm outdated` debe leerse para distinguir actualizaciones de un error de registry; un audit fallido puede ser advisory high/critical o error de registry. El resumen incluye esta advertencia. El workflow no sustituye revisión de changelogs, peer dependencies, lockfile ni CI completa.
- Guardrail obligatorio: mantener `undici@7.30.1` coherente entre `package.json` y `pnpm-lock.yaml` hasta que una actualización de seguridad revisada lo reemplace explícitamente.
- Estado actual: archivo añadido al HEAD de esta rama; todavía debe pasar los checks de la PR #137. No afirmar que la ejecución diaria funciona hasta observar al menos una ejecución real después del merge.

---

## Estado vivo — Dependabot y continuidad (2026-10-29 UTC)

**HEAD verificado de `main` al 2026-10-29:** `764ed502d2a296136d311e05d081ca8e9f7cfeb9`, merge de [PR #134](https://github.com/BTF14/Micro-app/pull/134), que documentó reglas obligatorias para Dependabot/lockfile y continuidad. PR #116 y #131 también están fusionadas; #131 añade un resumen visible en Actions ante fallos del backup, no una notificación externa. La búsqueda en vivo de PR abiertas no devolvió resultados en esta revisión; volver a comprobar antes de trabajar.

### Inventario de versiones de runtime y herramientas (verificado en `main`, 2026-10-29)

- Runtime CI/Workspace: Node `>=24.22.1 <25`; package manager pnpm (lockfile v9).
- TypeScript: `^5.9.3` en raíz, API y web; lockfile resuelve `5.9.3`. **TypeScript 7 NO está aplicado.**
- API: Hono `^4.13.14` (resuelto `4.13.14`); `@cloudflare/workers-types ^5.20261026.1`; Wrangler `^4.152.0`.
- Web: React/React DOM `^19.1.1` (resueltos `19.3.1`); Vite `^7.1.7` (resuelto `7.3.7`); `@vitejs/plugin-react ^5.0.4` (resuelto `5.2.0`); jsdom `^26.1.0` (resuelto `26.1.0`).
- Override de seguridad: `undici: 7.30.1` declarado en `package.json` y conservado en `pnpm-lock.yaml`; el lockfile contiene `undici@7.30.1` y no `undici@7.29.1`.
- PR #116 actualizó el grupo minor/patch de Hono, Workers types y Wrangler. PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) están cerradas sin merge: esos majors **no** se deben describir como instalados. No subirlos sin rama de trabajo, revisión de compatibilidad, lockfile coherente y CI verde.
- Este inventario indica las versiones declaradas/resueltas, no que todas sean las últimas publicadas ni que se haya ejecutado una auditoría de todas las dependencias transitivas.

### Incidente de Dependabot: corregido parcialmente y verificado

Las PR #116–#120 generadas originalmente quitaban del lockfile el bloque `overrides: undici: 7.30.1`, aunque `package.json` mantenía `pnpm.overrides.undici = 7.30.1`. En los HEAD originales, la instalación congelada fallaba con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y Dependency Review encontraba `undici@7.29.1` con vulnerabilidades de severidad alta. Se pidió rebase a Dependabot y se inspeccionaron los logs.

- [PR #116](https://github.com/BTF14/Micro-app/pull/116), grupo minor/patch de Hono, `@cloudflare/workers-types` y Wrangler: **fusionada** el 2026-10-29. El HEAD final `5d3f2e373e75caf71af207cba61df3066b140a86` incluyó el arreglo para conservar el override; todos los checks de la PR terminaron en `success`, incluidos `verify`, Chromium, migraciones, análisis estático, Trivy, historial de secretos, Dependency Review, Cloudflare Pages y Workers.
- [PR #117](https://github.com/BTF14/Micro-app/pull/117) TypeScript 7, [#118](https://github.com/BTF14/Micro-app/pull/118) plugin-react 6, [#119](https://github.com/BTF14/Micro-app/pull/119) Vite 8 y [#120](https://github.com/BTF14/Micro-app/pull/120) jsdom 30: actualmente **cerradas sin fusionar**. No asumir que esos upgrades están aplicados ni reabrirlos sin revisar compatibilidad, diffs y checks actuales.

Verificación posterior al merge: `package.json` declara `undici: 7.30.1`; `pnpm-lock.yaml` conserva el bloque `overrides`, contiene `undici@7.30.1` y no contiene `undici@7.29.1`. Todos los checks consultados para el commit de PR #132 `9f73f8ab0c1581145796f09a41f689fa4bdcf310` terminaron en `success`, incluidos `verify`, Chromium, migraciones, Trivy, historial de secretos, análisis estático, Pages y Workers. El HEAD posterior `764ed502d2a296136d311e05d081ca8e9f7cfeb9` (PR #134, documentación) también tiene en `success` los checks consultados: verify, Chromium, migraciones, análisis estático, Trivy, scan de historial, Cloudflare Pages y Workers.

### Siguiente trabajo

1. **Completado:** los checks del HEAD de documentación `764ed502d2a296136d311e05d081ca8e9f7cfeb9` terminaron en `success`.
2. Mantener el override de `undici@7.30.1`; cualquier futura actualización debe conservar coherencia entre `package.json` y `pnpm-lock.yaml`, pasar instalación congelada y Dependency Review.
3. No reintroducir TypeScript 7, plugin-react 6, Vite 8 ni jsdom 30 sin un plan y pruebas de compatibilidad.
4. Continuar el resto de tareas de seguridad priorizadas. La restauración integral con datos sintéticos poblados sigue pendiente para la última fase.

No se tocaron Neon, secretos, datos reales ni producción. No se hizo despliegue manual.

---

## Estado vivo — continuidad tras PR #130 (2026-10-29 UTC)

**Última referencia de `main` verificada al iniciar este trabajo:** `3ce18e2aa5bcf2a8c555a47681998405a4f14509` (commit de fusión de PR #130). Reconsultar el HEAD actual antes de operar; este SHA quedará obsoleto al fusionarse esta PR. La PR #129 está fusionada y su corrección de retención de 15 días usa el timestamp UTC validado del nombre del archivo, no `find -mtime`; elimina también el checksum emparejado y tiene pruebas unitarias en CI.

### Política operativa de backups para continuidad entre sesiones
- Backup diario; retención configurada en 15 días mediante `scripts/prune_backups.py` (timestamp UTC validado en nombre, no `mtime` del checkout) y eliminación del checksum emparejado. PR #129 fusionada y tests de retención en CI.
- No borrar todas las copias anteriores al generar una nueva ni reducir el plazo sin análisis y revisión. Si una ejecución nueva falla o no se valida, conservar la última copia válida y comprobar alerta visible. El workflow ahora publica un resumen con enlace al run en GitHub Actions ante fallos; no es una notificación externa.
- La retención no equivale a restauración probada. Sigue pendiente una prueba aislada con datos sintéticos relacionados y manifiesto de conteos/relaciones, RPO/RTO, alerta y coste $0. Restauración para la última fase.

### Secretos y recursos temporales: estado exacto
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets. Esta última comprobación es visual, informada por el propietario; no se conoce la fecha exacta de eliminación.
- Los únicos secretos que el propietario reporta actualmente son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos para el backup permanente.
- La rama Neon `restore-test-20261028` (proyecto `restless-fire-99110035`, branch ID `br-broad-dust-b7cvgjtv`) sigue existiendo en la última consulta. El borrado vía herramienta fue bloqueado por controles de seguridad; no reintentar para eludirlos. Si se decide limpiar, usar la consola Neon y verificar nombre/ID; no tocar `main`.
- No se modificó Neon `main`, datos de producción ni se hizo despliegue manual.

### Siguiente trabajo — respaldo/recuperación
- La restauración técnica previa (run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)) pasó checksum, descifrado y restauración en PostgreSQL desechable. No demostró recuperación de datos comerciales poblados: las tablas de ventas, productos, pagos, movimientos y auditoría estaban vacías en esa copia.
- Pendiente: verificar la siguiente ejecución programada y checksum de la copia más reciente; confirmar si las notificaciones nativas de GitHub son suficientes para alertar fuera de la interfaz de Actions.
- Pendiente: una única prueba aislada con datos sintéticos relacionados y un manifiesto de conteos/relaciones; restaurar a PostgreSQL desechable y comparar. Documentar RPO/RTO y coste $0. Mantener la restauración como última fase, según indicación del propietario.
- No recrear el workflow temporal retirado en PR #127. No crear PRs fragmentadas; usar el flujo CI existente.

---

## Estado vivo — continuidad tras PR #128 (2026-10-29 UTC)

**Referencia verificada:** `main` = `9b4ee7d2ed704288cd0cf149c93569a698f46e1b`; PR [#128](https://github.com/BTF14/Micro-app/pull/128) está fusionada. El workflow temporal de restauración sigue retirado; no recrearlo.

### Secretos y recursos temporales: estado exacto
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets. Esta última comprobación es visual, informada por el propietario; no se conoce la fecha exacta de eliminación. No pedir ni mostrar valores.
- Los únicos secretos que el propietario reporta actualmente en esa lista son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos porque los necesita el backup permanente.
- La rama Neon de prueba `restore-test-20261028` (proyecto `restless-fire-99110035`, branch ID `br-broad-dust-b7cvgjtv`) seguía existiendo en la última consulta. La operación de borrado vía herramienta fue bloqueada por controles de seguridad; no se debe afirmar que se eliminó ni reintentar para eludir el bloqueo. Borrar desde la consola de Neon solo tras verificar nombre/ID y que no es `main`.
- No se modificó Neon `main`, datos de producción ni se hizo despliegue manual.

### Evidencia y límites del restore
- Run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192): éxito en checksum, descifrado y restauración en PostgreSQL desechable; 13 tablas, 186 constraints, 0 membresías huérfanas y exclusión de `auth_sessions`/`auth_rate_limits`.
- Las tablas comerciales/auditoría verificadas estaban vacías. Esto demuestra la ruta técnica para esa copia, **no** recuperación integral de datos comerciales poblados ni igualdad con un manifiesto del origen.
- Inspección del mecanismo permanente: `.github/workflows/backup.yml` usa `pg_dump`, cifra con `age`, sube al repo privado `BTF14/micro-app-backups` y aplica retención de 15 días. Hallazgo: la retención previa usaba `find -mtime` sobre un checkout shallow, cuyo mtime refleja el checkout y no la fecha real del backup; puede dejar de eliminar copias antiguas. La PR de corrección reemplaza esto por la marca UTC del nombre de archivo y añade pruebas unitarias en CI.
- Pendiente después de validar/fusionar la corrección: una única prueba aislada con datos sintéticos poblados y manifiesto de conteos/relaciones, sin datos reales ni Neon `main`; medir RPO/RTO, alertas y coste $0. No recrear el workflow temporal ni abrir PRs duplicadas.
- No declarar backup/restore completamente cerrado ni Micro app lista para producción; continúan los demás bloqueos de seguridad documentados.

La entrada de continuidad más reciente prevalece sobre snapshots históricos que digan que la PR de limpieza está pendiente o que ambos secretos aún deben borrarse.

---

## Estado vivo — restauración de respaldo verificada técnicamente (2026-10-29 UTC)

- La PR #126 está fusionada; el workflow temporal se ejecutó de nuevo en `main`: [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192), resultado `success`, duración mostrada por Actions: 22 s.
- Evidencia del run: backup `backup-2026-10-28T13-39-39Z.dump.age`; checksum, descifrado y `pg_restore` correctos; 13 tablas esperadas; 186 constraints presentes; 0 membresías huérfanas; `auth_sessions` y `auth_rate_limits` ausentes.
- La copia tenía 1 organización, 1 usuario, 1 membresía, 1 entrada de allowlist y 1 registro bootstrap; las tablas comerciales y de auditoría verificadas estaban vacías. El camino técnico de restauración queda probado para esta copia, pero falta prueba con datos sintéticos poblados y comparación contra un manifiesto/conteo de origen. No afirmar integridad completa de datos comerciales.
- No se usó Neon `main` ni se modificaron datos de producción. La PR de limpieza pendiente debe eliminar el workflow temporal y actualizar la documentación. Tras fusionarla, el propietario debe borrar los secretos `RESTORE_TEST_AGE_KEY` y `RESTORE_TEST_DB_URL` y eliminar la rama Neon desechable `restore-test-20261028` después de verificar que ya no se necesita.
- El punto de backup de Nivel 1 permanece parcialmente verificado: falta evidencia del RPO/RTO extremo a extremo, alertas de fallos, retención y coste $0. No declarar Micro app lista para producción; siguen vigentes los otros bloqueos de seguridad.

---

## Checkpoint posterior a PR #114 — 2026-10-29 UTC

- PR #114 quedó fusionada por squash en `main`: [merge commit dc3fae80c485ec52c2e68c80da316df90c68ac83](https://github.com/BTF14/Micro-app/commit/dc3fae80c485ec52c2e68c80da316df90c68ac83). El HEAD revisado fue `780e057435fea4ebd6213fd973745599e71d2088`; GitHub confirmó `merged=true`.
- Los ocho workflows de PR y los dos checks externos de hosting del HEAD de PR fueron `success`. Esto no equivale a CI post-merge: en el merge SHA los estados hosting alternativo aparecen `pending` y el conector no devolvió workflows de Actions para ese SHA. Reconsultar antes de afirmar que pasó CI post-merge.
- Cloudflare Workers actualizó el estado a `Deployment successful!` y expuso URLs explícitas de preview de commit y rama: `https://36b3fea5-micro-app-api.btfcasheb.workers.dev` y `https://docs-continuity-after-pr-113-2026-10-28-micro-app-api.btfcasheb.workers.dev`. No se hizo despliegue manual.
- Esta actualización documental corrige la referencia obsoleta al estado abierto de PR #114 y al SHA anterior de `main`; conserva el historial previo sin reescribir decisiones antiguas.
- Siguen pendientes: restaurar el backup cifrado en PostgreSQL desechable; verificar headers CORS con HTTP real contra el Worker; decisión/aprobación de la matriz de permisos; aislamiento cross-tenant para rutas comerciales futuras. No declarar la app lista para producción. No tocar Neon `main`, secretos ni datos reales.

---

## Continuidad verificada — 2026-10-28, después de PR #113

- `main` quedó en `4242bcef38f33a415f472fc9c04048e1eee3bdde`, fusión squash de PR #113. La PR integró una propuesta completa para revisar permisos por rol; **la matriz continúa explícitamente NO aprobada** y no autoriza rutas comerciales.
- La PR #113 tuvo éxito en los workflows de CI, migraciones, E2E, Semgrep, escaneo de seguridad, historial de secretos, Dependency Review y dashboard en el HEAD exacto `b93df838095a043e418f5e481ce4422ed014c494`. El resumen de revisión de Codex reportó que no pudo completar por límite de uso; se realizó revisión manual y se dejó un comentario técnico en la PR. En el commit de merge, los estados clásicos consultados muestran dos checks hosting alternativo pendientes; no afirmar que hubo una nueva corrida de CI posterior al merge.
- Decisiones pendientes para revisar en la matriz: el 10 % de descuento es solo una sugerencia y requiere decisión del propietario; el alcance por sucursal/caja requiere confirmar el supuesto de MVP de un solo local; la regla de no perder al último `owner` debe tener implementación transaccional serializada y pruebas concurrentes.
- Auditoría de rama obsoleta: `security/secret-scan-current-main` está 1 commit por delante y 39 detrás de `main`. Su checklist `docs/PUBLIC_RELEASE_SECURITY_CHECKLIST.md` ya existe en `main`; el workflow de la rama usa `actions/checkout@v4`, mientras `main` usa `@v7`; su `.gitignore` no conserva la excepción `!apps/web/.env.production` presente en `main`. No fusionar ni borrar la rama tal cual.
- No se modificaron secretos, Neon, datos reales ni configuración productiva; no se hizo despliegue manual. La PR #114 de continuidad está abierta mientras se completa la verificación; no se debe describir el inventario como vacío.
- Bloqueos reales: (1) restaurar un backup cifrado real en PostgreSQL desechable; la llave privada `age` permanece bajo custodia del propietario y no está disponible en esta sesión; (2) revisar/aprobar o corregir la matriz de permisos; (3) verificar los headers CORS mediante solicitudes HTTP reales al Worker; (4) probar aislamiento cross-tenant cuando existan rutas comerciales. La aplicación no está lista para producción.
- Próxima acción segura: el propietario revisa la propuesta de permisos; en paralelo se sigue investigando una ruta autorizada y gratuita para la restauración aislada y la verificación HTTP de CORS. No usar herramientas metered, no acceder a Neon `main`, no inventar políticas ni crear otra PR para un objetivo ya cubierto.

---

## Estado vivo verificado — 2026-10-28

- Último SHA de `main` verificado antes de esta PR de continuidad: `33da237ad7592ac394cc266c6a96c4bd1d387e37` (merge de PR #110). PR #111 se fusionó antes en `3512cac28d6f0752a3699db00843a20788d91376`. Verificar el SHA vivo de `main` antes de cualquier acción futura.
- Las PR #110 (continuidad documental) y #111 (pruebas de auth) quedaron fusionadas. El inventario reciente no mostró PR abiertas; volver a comprobarlo al iniciar el siguiente trabajo.
- **PR #111 / auth:** en el HEAD probado `233844be10bb102fdac34ad41776d4d14420b243` pasaron los seis checks obligatorios. CI confirmó 48/48 tests unitarios y 14/14 pruebas PostgreSQL de auth; build/typecheck, Chromium auth smoke, migración, SAST, Trivy, secret-history y Dependency Review también pasaron. No se encontraron workflows post-merge mediante el conector; no afirmar que hubo una segunda corrida después del merge.
- **CORS:** PR #103 está fusionada. El código restringe el origen a `FRONTEND_ORIGIN` canónico y falla cerrada ante configuración ausente/inválida; las pruebas cubren preflight permitido y origen externo. La comprobación HTTP de `OPTIONS` al Worker productivo no pudo repetirse en esta sesión porque el acceso web a los endpoints falló. No declarar headers productivos verificados.
- **undici/Node:** PR #101 fijó `undici@7.30.1` con override exacto en `package.json` y `pnpm-lock.yaml`; la versión está parcheada para las ramas 7.x afectadas en el advisory consultado. PR #105, que proponía `>=7.30.1`, está cerrada sin merge y no debe reabrirse para duplicar cambios. PR #108 movió CI/Pages a Node 24.
- **Dependencias vulnerables:** el conector no permite consultar Dependabot alerts/dependency graph/code scanning; el número actual de alertas es desconocido. Trivy usa `exit-code: '0'`, por lo que un check verde no prueba ausencia de vulnerabilidades.
- **Backup:** run [40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159) terminó en success; el archivo cifrado llegó al repositorio privado y el checksum coincidió. Falta restauración real a PostgreSQL desechable; la llave privada `age` está bajo custodia del propietario.
- **Adapter de Neon:** `feat/neon-transaction-adapter` está 14 commits ahead y 124 behind; `apps/api/src/database.ts` es idéntico al de main, main tiene más pruebas, y la rama usa Vitest/workflow antiguos. No fusionar tal cual ni borrar la rama sin revisar cambios únicos.
- **Protección de main:** la consulta del endpoint de protección devuelve 403. La documentación histórica contradice si se requieren 0 o 1 aprobaciones; las PR #110/#111 se fusionaron con los checks requeridos en verde y sin reviews registradas, pero eso no determina el número actual de aprobaciones. No sortear el gate.
- La PR #103 se fusionó sin reviews/hilos registrados pese a un handoff anterior que pedía esperar revisión Claude/Codex; se conserva como discrepancia de proceso, no como revisión completada.
- No se modificaron secretos, Neon ni configuración productiva. No se hizo despliegue manual.

---




## 2026-10-28 — Aislamiento de Cloudflare Pages Preview verificado (PR #106)

- Causa raíz: Preview heredaba la URL de `apps/web/.env.production` y CSP permitía el Worker de producción. No hay API/DB de Preview aisladas verificadas.
- Solución en PR #106: las ramas de Pages distintas de `main` no incluyen la URL productiva, no consultan sesión ni muestran login de Google, y el postbuild cambia CSP Preview a `connect-src 'self'`. Producción conserva la configuración actual.
- Evidencia local en sandbox con pnpm 10: build Preview pasó; el origen productivo está ausente del bundle y de `dist/_headers`; test dedicado Preview pasó (1/1); suite web normal pasó (6 tests, el test específico de Preview queda skip fuera de Preview); build de producción pasó y mantiene el origen de API requerido.
- Evidencia HTTP real en el Preview de Cloudflare Pages: HTTP 200; CSP observada contiene `connect-src 'self'` y no permite `https://micro-app-api.btfcasheb.workers.dev`. El check Cloudflare Pages de HEAD `1d47a474351bb14f9f5e14283beec789356bafe3` pasó.
- Los checks consultados para ese HEAD terminaron en success. PR #106 fue fusionada por squash el 2026-10-28 en `main` (commit `d5d99b3a5184d6aad36ffd9a44ff34a62346dc94`). Cloudflare Pages confirma el despliegue automático exitoso. No se hizo despliegue manual ni se tocaron secretos, variables/bindings de Cloudflare o Neon. No se tocaron secretos, variables/bindings de Cloudflare ni Neon. La API/DB de Preview no se presenta como aislada; el frontend Preview queda fail-closed.

---

# Estado vivo — 2026-10-28: restauración de respaldo pendiente de probar; vulnerabilidades de Dependabot resueltas

## Política de trabajo entre agentes y PR (actualización 2026-10-28)

- Se propone como política canónica `docs/AI_COLLABORATION_AND_PR_POLICY.md`; `AGENTS.md` la incluye en la secuencia obligatoria de lectura. Hasta que la PR documental se fusione, confirmar en vivo la rama/PR y no asumir que estos cambios ya están en `main`.
- Regla del propietario: priorizar corrección y seguridad por encima de velocidad aparente; no inundar el repositorio de PR. Una PR por objetivo coherente, reutilizarla para correcciones del mismo alcance y separar objetivos independientes.
- Claude/Codex son revisores complementarios, no bloqueo para avanzar técnicamente. Si el propietario ordena expresamente mantener una PR abierta hasta disponer de ellos, no fusionarla antes de esa revisión.
- Los checks deben verificarse en el SHA exacto. CI verde no sustituye pruebas del servicio real ni autoriza despliegues. Mantener separación entre tests simulados, integración/E2E y comportamiento observado en producción.


- **Respaldo verificado con una corrida real** (`run 40587638159`, `conclusion: success`): el archivo cifrado llegó a `BTF14/micro-app-backups/daily/` y su checksum coincide. **Sigue pendiente la prueba de restauración real** (`pg_restore` contra una base desechable) — único punto que falta para dar por completamente cerrado el Nivel 1, punto 2.
- **Las 15 alertas de Dependabot abiertas (2 críticas, varias altas/moderadas)** eran todas de `vitest`/`tinypool`/`undici`/`@vitest/mocker` — dependencias de pruebas, nunca en el bundle de producción. Se resolvieron subiendo `vitest` de 3.x a 5.x en `apps/api` y `apps/web` (PR #96, regenerando `pnpm-lock.yaml` vía un workflow de un solo uso en GitHub Actions, porque este entorno no puede alcanzar `registry.npmjs.org`). CI completo (build, tests, E2E, dependency-review) pasó en verde antes de fusionar. **Pendiente de confirmación del propietario**: que la lista en `github.com/BTF14/Micro-app/security/dependabot` ya no muestre esas alertas — esta IA no tiene permiso de lectura sobre esa API desde este entorno.
- El workflow temporal usado para la actualización (`update-vulnerable-dev-deps.yml`) ya se eliminó (PR #97) — no es una herramienta permanente del proyecto.

---

# Estado vivo — 2026-10-27: respaldo automático implementado, checklist de cumplimiento evaluado

PR #91 y #92 fusionadas (`facb3dd`, `16a5367`). Cambios desde el checkpoint anterior:

- **Aprobación obligatoria de PR desactivada** por el propietario (lo prefirió así mientras el proyecto lo maneja solo él; GitHub nunca deja que el autor de un PR apruebe el suyo propio, así que con 1 aprobación requerida cada PR mío quedaba bloqueado esperándolo). Ahora cada PR solo necesita los 6 checks en verde para poder fusionarse — esta IA ya puede fusionar sola de nuevo.
- **Respaldo automático cifrado implementado** (`SECURITY_ROADMAP.md` punto 2): Cloudflare R2 se descartó porque pide tarjeta; destino final es el repositorio privado `BTF14/micro-app-backups`. Workflow `.github/workflows/backup.yml` corre diario, usa el rol de solo lectura `backup_readonly`, cifra con `age` antes de subir, retiene 15 días. **Falta que el propietario agregue el secreto `DATABASE_URL_BACKUP_RO`** en `Settings → Secrets and variables → Actions` de `BTF14/Micro-app` para que el workflow pueda correr de verdad (valor ya entregado por chat). Hasta entonces, no está verificado en producción.
- **Checklist externo de cumplimiento (legal/privacidad/accesibilidad) evaluado** en `docs/COMPLIANCE_AND_ACCESSIBILITY.md`: varios puntos no aplican todavía (banner de cookies, política de reembolsos, consentimiento parental — no hay cookies de analítica, pagos ni registro público), otros quedan como principio de diseño para módulos futuros, y se adoptó una verificación real de accesibilidad (la interfaz actual ya cubre bien `aria-label`/roles; falta foco atrapado en el modal de ayuda, no bloqueante).
- **Nuevo gate de CI**: `.github/workflows/dependency-review.yml` falla un PR que introduzca una dependencia con vulnerabilidad `high`/`critical`.

---

# Estado vivo — 2026-10-26 (noche): main protegida, decisión sobre blueprint externo, respaldos en progreso

**Main ya tiene protección de rama activada por el propietario — verificado en vivo, no solo documentado.** `GET /repos/BTF14/Micro-app/branches/main/protection` confirma: PR obligatorio, 6 checks requeridos, `enforce_admins: true`, sin force-push ni deletions. **Cambio de flujo a partir de ahora: ya no se puede empujar nada directo a `main`, ni siquiera checkpoints de documentación — todo pasa por PR.**

**Discrepancia pendiente de que el propietario la resuelva:** reportó "0 aprobaciones mínimas", pero la API en vivo dice `required_approving_review_count: 1`. Hasta que se corrija (o se confirme que así se quiere dejar), **cada PR, incluido este mismo checkpoint, necesita que el propietario lo apruebe y fusione manualmente en GitHub** — la IA no puede autoaprobarse ni cambiar el ajuste (el mismo bloqueo de proxy que afectó la configuración inicial). Ver recomendación en `docs/SECURITY_ROADMAP.md` punto 1.

**Blueprint externo (Gemini, sin contexto del proyecto) evaluado y resuelto** en `docs/PRICING_CACHE_ARCHITECTURE.md` (PR #91, abierto, CI en verde, esperando aprobación): se adopta como diseño el cron de tasa BCV y la caché de lectura en Cloudflare KV (ninguno implementado todavía); se **rechaza explícitamente el modo offline-first** de ventas (rompe el invariante transaccional anti-fraude existente, duplica superficie de error justo cuando se pidió priorizar seguridad, y resuelve un problema no confirmado); el resto de ideas del blueprint ya estaban resueltas, de forma más estricta.

**Respaldo automático (Nivel 1, punto 2) en progreso, no terminado:**
- Creado el rol Neon `backup_readonly` (solo `SELECT`, verificado contra `information_schema.role_table_grants`), y un par de llaves `age` para cifrar el volcado (llave pública documentada en `docs/SECURITY_ROADMAP.md`; la privada se le entregó una sola vez al propietario por chat y se borró de este entorno).
- **Bloqueante nuevo:** Cloudflare R2 no está habilitado en la cuenta y activarlo por primera vez puede exigir vincular una tarjeta — choca con la regla de "$0, sin tarjetas" del proyecto. Se le presentó al propietario una alternativa sin tarjeta (repositorio privado de GitHub solo para los volcados ya cifrados) junto con la opción R2. Pendiente de que el propietario elija destino antes de escribir el workflow de subida.

---

# Estado vivo — 2026-10-26 (tarde): hoja de ruta de seguridad adoptada

El propietario pidió explícitamente priorizar que todo quede **bien hecho y seguro, no rápido**, pensando en que el proyecto puede escalar a varias personas. Se creó `docs/SECURITY_ROADMAP.md` con un plan en 3 niveles (ver ese documento completo), ahora parte de la secuencia de lectura obligatoria de `AGENTS.md`. PR #85 fusionada (merge `11d29b183490286a02195d7f86b94f44853d3c5c`).

Implementado ya en este PR (Nivel 1, puntos 3 y 4 de la hoja de ruta):
- `.github/dependabot.yml`: actualizaciones semanales de dependencias npm/pnpm y de GitHub Actions.
- Cabeceras de seguridad: `apps/web/public/_headers` (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) en el frontend; middleware de cabeceras + `Cache-Control: no-store` en rutas `/auth/*` en la API.

**Pendiente, requiere acción manual del propietario (Nivel 1, punto 1):** protección de la rama `main` en GitHub. Se intentó configurar vía API con un token con permiso `admin` confirmado, pero el proxy de red de este entorno la rechazó (`403 Write access to this GitHub API path is not permitted through this proxy`) — es una restricción técnica de este agente, no de GitHub. Instrucciones paso a paso para que el propietario lo haga manualmente están en `docs/SECURITY_ROADMAP.md`, sección 1.

**Pendiente de implementación (Nivel 1, punto 2):** respaldo automático cifrado de la base de datos a un destino independiente (diseño propuesto con Cloudflare R2 + GitHub Actions programado, detallado en la hoja de ruta) — todavía no se ha creado el bucket ni el workflow.

**Importante para el siguiente chat:** si se activa la protección de `main` (punto 1), el flujo que se ha venido usando en esta sesión — empujar commits de documentación directo a `main` — dejará de funcionar y habrá que usar PR también para esos cambios. Es el comportamiento esperado, no un error.

---

# Estado vivo — 2026-10-26: centro de ayuda (WhatsApp en todo error + FAQ/Privacidad)

PR #84 fusionada (merge `0f83bae341190bf63e50b41fc7402944cda4277f`): el enlace de WhatsApp ya no vive solo en el error de login; también aparece en el banner de error genérico del panel autenticado (por ejemplo, si falla el cierre de sesión), y hay un pie de página permanente (en la pantalla de login y en el panel) con tres enlaces: "Escríbenos por WhatsApp", "Preguntas frecuentes" y "Privacidad". Los dos últimos abren una ventana modal estilo hoja inferior (`.help-modal`) con contenido en `apps/web/src/App.tsx` (constantes `FAQ_ITEMS` y `PRIVACY_SECTIONS`).

El texto de privacidad se escribió explícitamente como un aviso básico honesto para una app interna todavía en desarrollo (qué se guarda, para qué, que no se comparte fuera del negocio, dónde se aloja, cómo pedir corrección/eliminación) — con una nota aclarando que, si el negocio empieza a manejar datos de clientes o el sistema se abre al público, hace falta una revisión legal formal antes de ese paso. No es, ni pretende ser, una política de privacidad legalmente completa.

Con esto, **el trabajo de identidad, acceso y la capa básica de soporte/ayuda del usuario está terminado.** No queda ningún pendiente conocido de esta categoría.

---

# Estado vivo — 2026-10-25 (noche, tarde 2): enlace de WhatsApp para contactar al administrador

PR #83 fusionada (merge `1c65957887cceeccaa059ebd6d12fabdc73f4525`): el texto "comunícate con el administrador del sistema" (en el banner de `?auth_error=` y en la nota fija bajo el botón de Google) ahora es un enlace real a WhatsApp (`https://wa.me/584243104520`, número del dueño, con un mensaje precargado). Antes era solo texto sin ninguna acción posible. Probado por el usuario entrando con un correo no autorizado y confirmando que el mensaje de error se ve correctamente (antes de que se agregara el enlace).

Si el número de WhatsApp de contacto cambia en el futuro, está hardcodeado como constante `ADMIN_WHATSAPP_URL` en `apps/web/src/App.tsx`.

---

# Estado vivo — 2026-10-25 (noche): logout móvil + bug de variables que se autoborraban, resuelto

**Login verificado funcionando en el navegador real del dueño (no solo en base de datos): pantalla "Hola, btfcasheb@gmail.com." con la organización "Abasto 7 de Oro" cargando correctamente en `https://micro-app-63i.pages.dev/`.**

## Bug encontrado y resuelto: las variables de Cloudflare se autoborraban en cada deploy

Después de fusionar PR #81 (que solo tocaba el frontend), el login se rompió otra vez con `GOOGLE_NOT_CONFIGURED` y fallos de CORS. Causa raíz: `wrangler deploy` trata la tabla `[vars]` de `apps/api/wrangler.toml` como la fuente de verdad para las variables **no marcadas como "Secreto"**. `FRONTEND_ORIGIN`, `GOOGLE_REDIRECT_URI` y `GOOGLE_CLIENT_ID` solo se habían configurado a mano en el dashboard de Cloudflare como variables planas, nunca declaradas en el archivo — así que cada deploy automático (incluso uno que no tocaba `apps/api` en absoluto) las borraba en silencio. `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` y `BOOTSTRAP_TOKEN` sobrevivieron porque están guardadas como "Secreto", un almacén separado que `wrangler deploy` no toca.

**Resuelto en PR #82** (merge `f274d32a359dbba8e401897a41294fda1f33cbf8`): esas tres variables ahora están declaradas directamente en `apps/api/wrangler.toml` (committeado, es seguro — el client ID de Google es público por diseño, y las otras dos son solo las URLs del propio despliegue). De aquí en adelante, cualquier deploy las vuelve a crear automáticamente en vez de borrarlas. **No volver a repetir este bug**: cualquier variable nueva no-secreta que se agregue en el dashboard de Cloudflare debe agregarse también a `[vars]` en `wrangler.toml` en el mismo cambio, o se perderá en el próximo deploy.

Valores actuales confirmados en Cloudflare, Producción (los tres "Secreto" no se pueden volver a leer una vez guardados, solo reemplazar):
- `FRONTEND_ORIGIN` = `https://micro-app-63i.pages.dev`
- `GOOGLE_REDIRECT_URI` = `https://micro-app-api.btfcasheb.workers.dev/auth/google/callback`
- `GOOGLE_CLIENT_ID` = `1030757133503-huvhkok21n1br10rtfhs4827fo3v106q.apps.googleusercontent.com` (ahora también en `wrangler.toml`, así que este valor ya no depende de memoria/documentación)
- `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `BOOTSTRAP_TOKEN`: Secreto, valores no recuperables, confirmados presentes.

## Bug encontrado y resuelto: sin forma de cerrar sesión en móvil

El dueño reportó que no veía botón de "Cerrar sesión" en su teléfono. Causa: `styles.css` oculta `.sidebar-bottom` (donde vivía el único botón) por debajo de 760px de ancho — exactamente el dispositivo principal desde el que se usa esta app. **Resuelto en el mismo PR #82**: se agregó un segundo botón "Cerrar sesión" en la barra superior (topbar), visible en cualquier ancho de pantalla; en móvil se oculta el texto del chip de cuenta (redundante con el saludo "Hola, &lt;nombre&gt;") para dejar espacio.

## Próximas prioridades para el siguiente chat

1. Con identidad, login y la interfaz básica ya verificados de punta a punta en producción (incluido en el teléfono real del dueño), **no queda ningún pendiente de infraestructura/acceso conocido**. La prioridad pasa de lleno a construir el negocio: inventario, productos con precio en USD, tasa BCV y su conversión a VES, ventas.
2. Decidir e implementar un flujo real de invitación de usuarios — hoy, agregar a alguien más requiere inserciones manuales en Neon (ver sección de abajo "Cómo agregar un usuario nuevo").
3. Revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge (pendiente desde hace varias sesiones).
4. Si se agrega cualquier variable de entorno nueva al Worker en el futuro, recordar declararla también en `apps/api/wrangler.toml` si no es secreta — ver el bug documentado arriba.

---

# Estado vivo — 2026-10-25 (tarde): primer login real completado, organización creada

**El login con Google funciona de extremo a extremo en producción y ya existe la primera organización real.** Esto es lo más importante que debe saber el siguiente chat.

## Hechos verificados directamente en Neon `main` (proyecto `restless-fire-99110035`, branch `br-summer-math-b7297a60`)

- Tabla `auth_allowlist` tiene exactamente una fila activa: `btfcasheb@gmail.com` (`is_active = true`, `added_by = 'owner-bootstrap-2026-10-25'`, creada 2026-10-25 13:37:54 UTC). Para autorizar a alguien más, insertar otra fila con el mismo patrón — ver "Cómo agregar un usuario nuevo" abajo. No hay ningún otro correo autorizado todavía.
- Tabla `auth_bootstrap` quedó **sellada**: `consumed_at = 2026-10-25T13:40:13.565Z`, `consumed_by_email = 'btfcasheb@gmail.com'`, `created_organization_id` apunta a la organización creada. El `BOOTSTRAP_TOKEN` configurado en Cloudflare ya no sirve para nada — el endpoint rechaza cualquier intento nuevo de bootstrap aunque el token sea correcto, porque la fila sentinela solo permite un uso. Es seguro dejar la variable en Cloudflare (no hace daño) o borrarla como limpieza; no es urgente.
- Organización creada: **id `3ce67e70-c245-4b64-9b93-60b06f85e0f1`, nombre "Abasto 7 de Oro", slug `abasto-7-de-oro`**.
- Usuario creado: **id `36c0f3ec-e1b2-4ea5-9855-45a5ee2c3e92`, email `btfcasheb@gmail.com`**, `google_sub` vinculado, `is_active = true`, rol `owner` en `organization_members` para esa organización.

## Cómo agregar un usuario nuevo a la allowlist (patrón ya probado)

```sql
INSERT INTO auth_allowlist (email, added_by, note)
VALUES ('correo@ejemplo.com', 'owner-bootstrap-<fecha>', 'motivo breve')
ON CONFLICT DO NOTHING
RETURNING id, email, is_active, created_at;
```
Ejecutar contra el proyecto Neon `restless-fire-99110035`, base `neondb`, con `mcp__Neon__run_sql` pasando `project_id` y `database_name` (no `projectId`/`databaseName`, el esquema del tool usa snake_case). Después de agregarlo, la persona solo necesita ir a `https://micro-app-63i.pages.dev/` y tocar "Continuar con Google"; como ya existe su fila en la allowlist pero no un `app_users` con ese correo, el único camino restante sería el bootstrap — **que ya está sellado**. Es decir: **cualquier usuario nuevo después del primero necesita que alguien con acceso a Neon inserte manualmente también su fila en `app_users`/`organization_members`** (o implementar un flujo de invitación — todavía no existe, ver prioridades abajo). No hay todavía una forma de que un segundo usuario se autoprovisione, ni siquiera estando en la allowlist.

## PR #81 fusionada — interfaz de login arreglada

- Problema encontrado: el frontend (`apps/web/src/App.tsx`) seguía mostrando el formulario viejo de usuario/contraseña, y nunca leía el parámetro `?auth_error=` que pone `apps/api/src/google-auth.ts` al redirigir tras un fallo. Resultado: cuando el primer intento de login falló por `not_allowlisted`, el usuario solo vio el formulario de contraseña sin ninguna pista de qué pasó — generó bastante confusión hasta diagnosticarlo leyendo la URL completa a mano.
- PR #81 (`feat(web): Google sign-in UI, replace dead password form`), squash-merged a `main`. Merge commit **`441bdc463954aba1069cfeae9227bf75a562a53a`**. Todos los 12 checks consultados en el head final (`117cb1c`) terminaron `success`, incluido "Chromium authentication smoke tests" (Playwright) tras reescribir `apps/web/e2e/auth.spec.ts`, que todavía probaba el formulario de contraseña eliminado.
- Cambios: el formulario de contraseña/registro se reemplazó por un único enlace "Continuar con Google" hacia `GET /auth/google`; se agregó lectura de `?auth_error=` con un mensaje específico y accionable por cada código (`not_allowlisted`, `account_inactive`, `identity_mismatch`, `bootstrap_consumed`, `not_provisioned`, `email_not_verified`, `oauth_failed`, `server_error`), y se limpia el parámetro de la URL con `history.replaceState` para que un refresh no lo vuelva a mostrar.
- Cloudflare Pages se redesplegó automáticamente al fusionar (igual que el Worker se redeployó al fusionar PR #80). Pendiente de confirmación visual del usuario tras el redeploy.
- Nota de entorno para la siguiente sesión: en este sandbox, `pnpm install` no pudo resolver `registry.npmjs.org` (DNS falla pese a estar en la lista `no_proxy`), así que no se pudieron correr los tests localmente; se verificó todo vía los checks de GitHub Actions en el SHA exacto antes de fusionar, siguiendo el protocolo de `AGENTS.md`.

## Prioridades inmediatas para el siguiente chat

1. Confirmar con el usuario que `https://micro-app-63i.pages.dev/` ahora muestra el panel autenticado ("Hola, btfcasheb@gmail.com…", organización "Abasto 7 de Oro") sin pasos adicionales.
2. Si el usuario quiere agregar más personas (empleados, cajeros), seguir el patrón de "Cómo agregar un usuario nuevo" arriba — y decidir/implementar un flujo real de invitación en vez de inserciones manuales en Neon, porque hoy no escala.
3. Empezar el módulo de negocio real (inventario, productos, tasa BCV, ventas) — sigue sin ningún código de lógica de negocio; todo lo hecho hasta ahora es identidad/infraestructura.
4. Revisar `feat/neon-transaction-adapter` contra `main` actual antes de cualquier merge (pendiente desde hace varias sesiones, nunca bloqueante pero tampoco resuelto).
5. Opcional/limpieza: quitar `BOOTSTRAP_TOKEN` de las variables de runtime de Cloudflare ya que el bootstrap está sellado para siempre; no es urgente.

---

# Estado vivo — 2026-10-25: Google OAuth + allowlist fusionado

- PR #80 (`feat(auth): Google OAuth + allowlist sign-in, password login retired (D1-D8)`) se fusionó a `main` por squash. Merge commit: `e6afed5501b24f50d082ce31883ff78ee477f323`.
- En ese SHA, los nueve checks consultados terminaron en `success`: Workers Builds (micro-app-api), Cloudflare Pages, verify, escaneo de archivos/historial, Trivy, postgres-migration, pruebas de humo de autenticación (Chromium), generate-progress y análisis estático JS/TS. Consultado vía `gh api repos/BTF14/micro-app/commits/main/check-runs` el 2026-10-25.
- **Riesgo P0 de identidad resuelto en código:** `apps/api/src/google-auth.ts` implementa OAuth 2.0 + OIDC con PKCE (S256), validación de `state` vía cookie de un solo uso, verificación server-side de `email_verified` contra el endpoint `userinfo` de Google, allowlist fail-closed (`auth_allowlist`), vinculación automática por email con protección anti-reenlace (`identity_mismatch` si el `google_sub` no coincide), y bootstrap administrativo sellado de un solo uso (`auth_bootstrap`, fila única con `FOR UPDATE`). `POST /auth/login` y `POST /auth/register` quedaron retirados (503), confirmado por revisión manual del diff completo contra `main` antes de fusionar.
- Migración `0002_google_identity.sql` probada primero en una rama Neon aislada y desechable (`google-identity-verify-temp`, creada y eliminada en esta sesión) corriendo `0002_google_identity.assertions.sql`; todas las aserciones (unicidad de allowlist, sello de bootstrap, unicidad de `google_sub`) pasaron. Aplicada después a Neon `main` (proyecto `restless-fire-99110035`) el 2026-10-25.
- **Pendiente para que el login funcione de extremo a extremo:** configurar `GOOGLE_REDIRECT_URI`, `BOOTSTRAP_TOKEN` (secreto de un solo uso, generado en esta sesión) y confirmar `FRONTEND_ORIGIN` como variables del Worker `micro-app-api` en el dashboard de Cloudflare; luego completar el primer login con `bootstrap_token`/`org_name`/`org_slug` para crear la organización y el usuario owner del dueño del negocio. Ninguno de estos tres pasos se ha confirmado completado todavía.
- El Worker `micro-app-api` se redeployó automáticamente a producción al fusionar (el check `Workers Builds: micro-app-api` fue el deploy real, no solo validación), así que el código de Google OAuth ya está en vivo aunque el login no funcionará hasta configurar las variables pendientes arriba.
- Nota operativa: durante esta sesión, los ajustes de "Comando de vista previa" en el proyecto Cloudflare del Worker se quedaron pegados en `npx wrangler preview` (comando beta inválido para CI) pese a guardarse correctamente y a limpiar la caché de compilación; solo se resolvió desconectando y reconectando la integración Git del proyecto en el dashboard. Si vuelve a ocurrir un build con comando de despliegue obsoleto pese a una configuración guardada correcta, probar esa reconexión antes que otra cosa.

---

# Estado vivo — 2026-10-22: seguridad y CI actualizados

- PR #76 integró en `main` el workflow de Gitleaks con checkout completo, reglas adicionales de `.gitignore` y checklist realista de exposición. Merge commit: `5f33e82fc7a6d3e77b6b97d912034f2a2ee7c2b0`.
- En ese SHA, los ocho checks consultados terminaron en success: Gitleaks [39862510779](https://github.com/BTF14/Micro-app/actions/runs/39862510779), CI [39862510861](https://github.com/BTF14/Micro-app/actions/runs/39862510861), Playwright E2E [39862510771](https://github.com/BTF14/Micro-app/actions/runs/39862510771), migración [39862510667](https://github.com/BTF14/Micro-app/actions/runs/39862510667), Semgrep [39862510847](https://github.com/BTF14/Micro-app/actions/runs/39862510847), Trivy [39862510870](https://github.com/BTF14/Micro-app/actions/runs/39862510870), dashboard [39862510823](https://github.com/BTF14/Micro-app/actions/runs/39862510823) y Cloudflare Pages preview; los checks externos de despliegue también pasaron.
- El log real de Gitleaks para ese SHA indica **613 commits escaneados, aproximadamente 1.74 MB y “no leaks found”**. Esto aplica al historial alcanzable desde el checkout de `main`; no certifica todas las ramas, artifacts, logs, releases ni sistemas externos.
- PR #74 se cerró como supersedida porque su rama estaba divergida y no era mergeable. Sus cambios relevantes se rebasaron limpiamente en PR #76; no se integraron sus checkpoints históricos obsoletos.
- PR #71 sigue integrada: `resolveTenantContext` valida sesión/membresía activa y devuelve el rol, pero no autoriza operaciones comerciales y aún no está conectada a rutas de negocio.
- **Riesgo P0 pendiente de decisión de identidad:** [issue #53](https://github.com/BTF14/Micro-app/issues/53) ahora registra que `POST /auth/register` está bloqueado, pero `POST /auth/login` sigue aceptando contraseña para cuentas activas sin aplicar la política Google sign-in + allowlist. No sabemos si hay cuentas reales afectadas. No deshabilitar el login sin evaluar el impacto ni inventar la política D1–D8.
- GitHub reportó `main` sin protección. La conexión usada no permite configurar branch protection/required checks en Settings; requiere acción administrativa allí. No asumir que Gitleaks verde habilita la publicación/operación comercial.
- Arquitectura canónica: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. Sin despliegue de producción, sin mutaciones de Neon `main`, sin facturación ni secretos expuestos.

## Próximas prioridades
1. Resolver las decisiones D1–D8 de identidad en `docs/sdd/auth-policy-decision-record.md` y completar la política de acceso en todos los puntos de entrada.
2. Obtener aprobación de la matriz de permisos por rol antes de implementar handlers comerciales.
3. Activar protección de `main`, checks requeridos y las opciones de secret scanning/push protection disponibles desde GitHub Settings.
4. Mantener pruebas con PostgreSQL efímero; no probar contra Neon `main`.

---


# Actualización de verificación — 2026-10-22 21:58 UTC

- Resultado final confirmado para PR #71 en SHA `ef86738991fbed58090d191ffbb865e4e8f18588`: los ocho checks de GitHub que se consultaron terminaron en success: CI [39861207434](https://github.com/BTF14/Micro-app/actions/runs/39861207434), Playwright [39861207395](https://github.com/BTF14/Micro-app/actions/runs/39861207395), migraciones [39861207581](https://github.com/BTF14/Micro-app/actions/runs/39861207581), Trivy PR [39861207344](https://github.com/BTF14/Micro-app/actions/runs/39861207344), Semgrep [39861207331](https://github.com/BTF14/Micro-app/actions/runs/39861207331), dashboard [39861207369](https://github.com/BTF14/Micro-app/actions/runs/39861207369), comentarios automáticos de preview del hosting y Cloudflare Pages preview. Los dos contextos de status del proveedor externo también estaban en success.
- En particular, Playwright llegó al paso `Run browser tests` y terminó success; no fue solo una comprobación de instalación.
- La verificación corresponde al SHA indicado. Los cambios documentales que se hagan después producen un nuevo head y deben revisarse por SHA; no confundir el resultado de este head con un head futuro.
- PR #71 sigue abierta y draft. No se fusionó. Próximo paso: revisión funcional/seguridad del alcance de `resolveTenantContext` y decisión de si la utilidad está lista para uso por rutas, antes de sacarla de draft. No desplegar producción ni tocar Neon `main`.

---

# Checkpoint vivo — 2026-10-22: Playwright fix integrado y PR #71 revalidándose

- PR #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75) se revisó y fusionó por squash en `main`. Commit resultante: `3a6d8211d21cc3fbbff2cd476d8fa80adb65cd3f`. Cambio exclusivo de workflow; sin cambios de app, Neon ni deploy de producción.
- En `main`, todos los seis workflows terminaron en success en ese commit: CI [39860846216](https://github.com/BTF14/Micro-app/actions/runs/39860846216), Playwright E2E [39860846233](https://github.com/BTF14/Micro-app/actions/runs/39860846233), migraciones [39860846364](https://github.com/BTF14/Micro-app/actions/runs/39860846364), Semgrep [39860846524](https://github.com/BTF14/Micro-app/actions/runs/39860846524), security scan [39860846214](https://github.com/BTF14/Micro-app/actions/runs/39860846214) y dashboard [39860846210](https://github.com/BTF14/Micro-app/actions/runs/39860846210). dos contextos externos de hosting también aparecen success para ese SHA.
- Se sincronizó `.github/workflows/playwright-e2e.yml` en la rama de PR #71 (`feat/tenant-context-resolver`) con el workflow validado de `main`; commit de sincronización inicial `a3301896c2936ce6d50698a0d05ad920e656fe7a`. Esto es necesario porque GitHub evalúa el workflow que está en la rama del PR.
- Revalidación de PR #71 sobre SHA `a3301896c2936ce6d50698a0d05ad920e656fe7a`: CI [39861076234](https://github.com/BTF14/Micro-app/actions/runs/39861076234) success (build/typecheck, unit tests y PostgreSQL auth integration); migration [39861076210](https://github.com/BTF14/Micro-app/actions/runs/39861076210) success; security/Trivy [39861076123](https://github.com/BTF14/Micro-app/actions/runs/39861076123) success; Semgrep [39861076052](https://github.com/BTF14/Micro-app/actions/runs/39861076052) success; dashboard [39861076073](https://github.com/BTF14/Micro-app/actions/runs/39861076073) success; Playwright [39861076113](https://github.com/BTF14/Micro-app/actions/runs/39861076113) ya verificó con éxito que el browser bundled existe, pero al último chequeo seguía en `Run browser tests` (no declarar E2E final hasta que concluya).
- PR #71 sigue abierta y draft. No fusionar todavía. Esperar el resultado final de Playwright, actualizar el SHA/head después de cualquier commit documental y confirmar todos los checks del head más reciente. La función `resolveTenantContext` es una utilidad aislada nueva; revisar si el alcance de PR pretende solo introducirla o conectarla a rutas antes de sacar el PR de draft. No añadir integración de autorización por intuición: cada operación debe aplicar su política de permisos explícita.
- No se identificó un séptimo workflow distinto; la consulta actual muestra seis workflows Actions relevantes y dos contextos externos de hosting. No inventar un séptimo check.
- Arquitectura canónica: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. runtime de API alternativo sigue auxiliar/no canónica. Sin deploy de producción, cambios a Neon `main`, billing ni secretos expuestos.
- Próximo paso: confirmar Playwright E2E de PR #71, luego revisar el diff de resolver y documentar la conclusión con evidencia. Mantener presupuesto $0 y PR #71 draft hasta completar revisión.
 
---

# Checkpoint vivo — 2026-10-22: solución Playwright validada en PR #75

- El fallo repetido de PR #71 estaba localizado en el paso `Install Chromium and OS dependencies`; los tests de navegador no arrancaban y los logs del job devolvían 404 `BlobNotFound`. La causa interna del instalador original no quedó probada.
- Se creó PR draft #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75), rama `ci/playwright-container-runner`, head `09bc000d07672f731935d2bbc9e8b38f605eeb9d`. Cambia solo `.github/workflows/playwright-e2e.yml`: usa `mcr.microsoft.com/playwright:v1.55.0-noble` con Chromium/dependencias preinstalados y verifica el directorio del browser, evitando la instalación apt/browser que fallaba.
- Validación real de PR #75 en ese SHA: CI [39859323298](https://github.com/BTF14/Micro-app/actions/runs/39859323298), Playwright E2E [39859323412](https://github.com/BTF14/Micro-app/actions/runs/39859323412), migration [39859323422](https://github.com/BTF14/Micro-app/actions/runs/39859323422), Semgrep [39859323415](https://github.com/BTF14/Micro-app/actions/runs/39859323415), Trivy [39859323621](https://github.com/BTF14/Micro-app/actions/runs/39859323621) y dashboard [39859323191](https://github.com/BTF14/Micro-app/actions/runs/39859323191) terminaron todos en `success`. El browser tests step se ejecutó y pasó.
- PR #75 permanece draft y sin merge. La PR #71 sigue draft; su workflow E2E original seguirá fallando hasta que la corrección de workflow sea revisada e integrada. No fusionar por ahora sin revisar el PR y el estado vivo.
- PR #71 en head previo `fda9a20e2e0b0ca1b73f3af3a4577d0a7d6fc12c`: CI, migration, Semgrep, Trivy y progress dashboard pasaron. E2E falló en instalación de browser con el workflow antiguo. La funcionalidad del resolver y las pruebas de CI no se deben confundir con la prueba E2E, que solo pasa en PR #75.
- Arquitectura canónica sigue Cloudflare Pages + Cloudflare Workers/Hono + Neon Free; runtime de API alternativo continúa como auxiliar/no canónico. No hubo deploy de producción, cambios a Neon `main`, gasto ni exposición de secretos.

---
# Checkpoint vivo — 2026-10-22: GitHub Actions recuperado

- Visibilidad del repo confirmada como pública. GitHub-hosted runners ya ejecutan steps; la causa previa de los jobs sin steps no se atribuye retroactivamente a una causa específica.
- PR #71 sigue abierta/draft, rama `feat/tenant-context-resolver`, head observado antes de este checkpoint: `8d938ab5726d357bd9f9f79385af54bbd42c4f2f`. Al añadir este checkpoint el SHA cambiará; consultar el head vivo después del commit.
- Reintentos sobre ese head: CI run [39426320145](https://github.com/BTF14/Micro-app/actions/runs/39426320145) success (build/typecheck, unit tests y auth integration contra PostgreSQL efímero); migración run [39426320271](https://github.com/BTF14/Micro-app/actions/runs/39426320271) success; Semgrep [39426320136](https://github.com/BTF14/Micro-app/actions/runs/39426320136) success; Trivy [39426320487](https://github.com/BTF14/Micro-app/actions/runs/39426320487) success; progress dashboard [39426320168](https://github.com/BTF14/Micro-app/actions/runs/39426320168) success.
- Playwright E2E run [39426320240](https://github.com/BTF14/Micro-app/actions/runs/39426320240), intento 3, falla en el paso `Install Chromium and OS dependencies`; el paso de browser tests queda skipped. Los pasos anteriores, incluidos install de dependencias y setup del runner Playwright, pasan. La descarga de logs del job devuelve 404 `BlobNotFound`, así que la causa interna exacta (descarga de browser, apt/dependencias u otra) no está demostrada. No seguir reintentando en bucle ni afirmar que los tests E2E se ejecutaron. Resolver el paso de instalación con logs disponibles o un entorno de browser reproducible antes de quitar el bloqueo de PR.
- Existe además un run de Security scan anterior [39426310365](https://github.com/BTF14/Micro-app/actions/runs/39426310365) en failure sobre el mismo SHA por evento anterior; el run PR más reciente [39426320487](https://github.com/BTF14/Micro-app/actions/runs/39426320487) sí pasa. Distinguir runs por evento/intento, no reportar el check duplicado como un nuevo fallo de código.
- Check runs raw del SHA `8d938ab...` mostró seis workflows Actions relevantes y dos contextos externos de hosting exitosos; no se identificó un séptimo workflow distinto. El histórico reporte de siete errores no se debe completar con una suposición.
- La prueba de CI sí es evidencia real ahora que steps se ejecutan. No implica readiness de producción. PR #71 sigue draft hasta resolver Playwright y revisar los checks sobre el head final.
- Arquitectura aprobada del repo sigue siendo frontend Cloudflare Pages + API Cloudflare Workers/Hono + Neon Free, presupuesto $0. runtime de API alternativo es auxiliar/no canónico según los documentos; el error ESM histórico de despliegue alternativo no justifica reconfigurar el destino aprobado ni hacer deploy de producción.
- Sin deploy de producción, sin cambios a Neon `main`, sin migraciones a datos reales, sin billing ni secretos expuestos.

---
# Revisión viva — 2026-10-20 08:56 EDT (12:56 UTC)

> Esta revisión añade evidencia viva a los checkpoints históricos. El SHA anotado como head/base es el estado al comenzar esta revisión; las actualizaciones documentales de esta sesión crean commits nuevos y deben volver a verificarse después.

## GitHub / PRs al comenzar la revisión

- `main`: `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e` (confirmado con fetch_commit sobre ref `main`).
- PR #71: abierta, draft=true, base `main`, base SHA `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`; head de PR `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2`, rama declarada `feat/tenant-context-resolver`. Este SHA reemplaza el snapshot anterior `a4806b69a2d12225234e7a8fc72c1116957d0318`.
- PR #68 abierta, no draft; head `5d3770a23e07855f68b07e6327c83545c76e1c95`, base SHA `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`.
- PR #69 abierta, no draft; head `611f5274b5f422abe5421aef95aa77b500be7740`, misma base.
- PR #70 abierta, draft=true; head `8bdb410bf2755efdeb6db35f22bae7c8b00acf25`, misma base.
- Comentario de diagnóstico previo en PR #71 sigue presente: https://github.com/BTF14/Micro-app/pull/71#issuecomment-6289785588. No se duplicó. El bot de Cloudflare también reporta preview exitosa para el commit `f0f489f`: https://01bc0d05.micro-app-63i.pages.dev (preview, no producción).

## GitHub Actions: seis workflows actuales recuperados; el séptimo sigue sin identificar

La consulta de workflow runs asociada al head `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2` devuelve estos seis runs completos en failure. Los jobs expuestos por el conector tienen cero steps; cada descarga de logs probada devuelve HTTP 404 `BlobNotFound`. No es evidencia de tests o código fallidos: los comandos de los workflows no aparecen ejecutados.

| Workflow | Run ID | Job | Job ID | Conclusión |
|---|---:|---|---:|---|
| Project progress dashboard | 39424411848 | generate-progress | 118633193726 | failure |
| Database migration validation | 39424411977 | postgres-migration | 118633195889 | failure |
| CI | 39424412060 | verify | 118633195741 | failure |
| Semgrep SAST | 39424411782 | JavaScript and TypeScript static analysis | 118633196350 | failure |
| Security scan | 39424411907 | Trivy filesystem and configuration scan | 118633194852 | failure |
| Playwright E2E | 39424412144 | Chromium authentication smoke tests | 118633196016 | failure |

- Intentos: el wrapper de runs no expone `run_attempt` ni los timestamps completos para estos registros; por tanto, no se afirma el número de intento actual. Los jobs listados son los jobs devueltos para cada run consultado.
- Evidencia de cada job actual: `fetch_workflow_job_steps` devolvió `steps: []`; `fetch_workflow_job_logs` devolvió 404 `BlobNotFound` para los seis job IDs anteriores.
- Runs anteriores observados en el checkpoint: progress `39413291257`, Playwright `39413291129`, CI `39413291311`, Semgrep `39413291252`, Security `39413291137`, migraciones `39413291456`; también se documentaron job IDs iniciales/reintentados allí. No asumir que esos runs pertenecen al head actual sin metadatos SHA.
- El endpoint de combined status consultado para el head actual solo devuelve dos contextos externos de hosting en `success` (`micro-app-7lg5` y `micro-app`); no enumera los check-runs de Actions. La interfaz/usuario reporta siete errores, pero la conexión disponible solo permitió identificar seis workflow runs fallidos. **Séptimo check: no identificado / pendiente**, no inventar nombre ni causa. Hace falta la lista raw de check-runs o captura/URL del séptimo check desde GitHub.
- El patrón de seis jobs con cero steps y logs no disponibles sugiere fallo anterior a la ejecución de steps o indisponibilidad de almacenamiento de logs; no demuestra la causa raíz de la asignación de runner. No repetir re-runs sin nueva evidencia.
- No se ejecutaron tests del checkout real en esta sesión. Solo sigue constando la verificación histórica aislada: smoke harness 3/3 y TypeScript estricto contra interfaz mínima; no sustituye Vitest, build workspace, pruebas PostgreSQL ni Playwright.

## Auditoría de hosting — 2026-10-30

- Arquitectura operativa del proyecto: frontend estático en Cloudflare Pages, API Hono en Cloudflare Workers y PostgreSQL en Neon.
- Se revisó el árbol completo de `main` (191 entradas) y las búsquedas del repositorio. No hay archivos de configuración, directorios locales, dependencias, CLI/comandos de despliegue ni workflows de un proveedor de hosting alternativo. Se retiraron las referencias de los documentos operativos; el diario append-only conserva hechos históricos.
- No se modificó ninguna cuenta externa, integración de GitHub, webhook, deployment ni configuración de Cloudflare. El endpoint de protección de rama devolvió 403, por lo que no se afirma haber inspeccionado o cambiado GitHub App/branch protection.
- `VITE_API_BASE_URL` **se conserva**: es una variable pública de build de Vite, no una integración de hosting. `apps/web/.env.production` apunta al Worker y `vite.config.ts` la carga con `loadEnv`. El bundle JS publicado aún no pudo inspeccionarse; no afirmar que el valor compilado está verificado.
- El status combinado consultado para el SHA actual de `main` no devolvió checks externos. En PR #178 los checks observados son GitHub Actions y previews de Cloudflare Pages/Workers.
- Se encontró una única rama heredada asociada a PR #72 (cerrada sin merge): 3 commits propios y 277 commits detrás de `main`, con cambios antiguos de imports ESM en tres archivos API ya supersedidos por el código actual. Se creó `archive/legacy-api-esm-experiment-20261020` en el HEAD exacto `b1330a5fa547071a5f500f0481ce88109c612f81` para preservar esos commits. La referencia original todavía no se pudo borrar: la sesión de navegador GitHub no está autenticada y el conector no expone borrado de ramas. No forzar ni reescribir la rama.

## Cambios y límites de esta revisión

- No se cambió código de aplicación ni configuración de despliegue. Se actualizará documentación existente en esta misma rama para conservar el handoff.
- No se ejecutó build/test real del repositorio ni smoke HTTP de API en esta sesión; no se tuvo un checkout local funcional. Los logs de Actions no están disponibles.
- No se desplegó producción, no se alteró Neon `main`, no se ejecutaron migraciones y no se expusieron secretos.
- Siguiente paso: conseguir el séptimo check vía raw check-runs, recuperar logs/runners cuando GitHub permita hacerlo, y ejecutar una prueba de runtime en un entorno reproducible. Mantener PR #71 draft hasta tener CI ejecutable sobre el SHA final.

---

# Archivo histórico — checkpoint 2026-10-20 (supersedido)

El diagnóstico de despliegue alternativo y el estado de PR #71 de esta fecha ya no son instrucciones operativas. La arquitectura vigente es Cloudflare Pages + Cloudflare Workers/Hono + Neon. Los estados de GitHub, los checks y los despliegues deben consultarse en vivo; no reactivar ni reparar un runtime de hosting paralelo.

# Checkpoint autoritativo — 2026-10-19, después de PR #64

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- `main` incluye PR #64 por squash: `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`. PR #63 merge SHA: `b4b417ec5a85b8b0c48b606c718c341745af9055`; PR #62 merge SHA: `d107cfb2b80c4165ed39e3071f8256942898ffb7`; PR #61 merge SHA: `1b8098ff00e0bb7482200b486710a5611f1e109d`.
- PR #63 fusionada; sus siete workflows terminaron en success sobre el head exacto `6baffe8fb473128504361c28fd6ac0c0e01519d9`. PR #64 fusionada; seis workflows consultados terminaron en success sobre el head exacto `97088a2d0d599001f145f4e60f72556a66a5f8b4`: CI, Playwright E2E, Security scan, Semgrep SAST, database migration validation y project progress dashboard. No se ejecutaron tests locales; los workflows no certifican readiness de producción.
- PR #60 está cerrada como supersedida, no fusionada. La comparación confirmó que la política de autonomía/revisión manual quedó integrada por PR #62/#63; no se reintrodujo el handoff histórico obsoleto. No hubo force-push.
- PR #64 añadió cuatro skills de proyecto bajo `.agents/skills/`: `micro-app-auth-security`, `micro-app-postgres-testing`, `micro-app-stack-guidance` y `micro-app-skill-curation`, además de `docs/AUTOSKILLS_ADOPTION.md`. Son instrucciones locales creadas para Micro app, no bundles externos descargados.
- AutoSkills: se inspeccionaron la web, el repositorio y entradas del registro curado. El intento de preparar un checkout temporal falló por DNS al resolver `github.com`; la CLI `npx autoskills --dry-run` no llegó a ejecutarse. No afirmar instalación externa ni crear un `skills-lock.json` ficticio. Próximo paso: repetir dry-run en un checkout con red y revisar propuesta/licencia/hash antes de instalar.
- P0 de identidad sigue pendiente: Google sign-in + allowlist no está implementado; D1–D8 y matriz de permisos por rol siguen sin aprobación. `POST /auth/register` permanece fail-closed. La ruta de login por contraseña sigue existiendo; no afirmar que una allowlist la protege.
- No inventar emails/dominios, configuración OAuth, bootstrap admin ni vinculación de cuentas. No tocar producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. Presupuesto $0.
- La aplicación NO está lista para producción. Backups/restauración independiente, handlers comerciales, aislamiento tenant completo, permisos aprobados, E2E reales y controles de concurrencia/idempotencia siguen pendientes. Strix sigue documentado, no instalado/ejecutado.
- PR #64 generó una vista previa de rama por la integración automática de Cloudflare; no fue despliegue productivo ni se activó manualmente.

## Próximos pasos
1. En un entorno con red, ejecutar `npx autoskills --dry-run`; seleccionar únicamente skills compatibles con React/Vite, Hono/Workers, TypeScript, Neon y pruebas, verificando licencia y hash. Registrar la salida real.
2. Continuar revisión estática y pruebas aisladas de auth/sesión/autorización. No implementar decisiones D1–D8 ni permisos hasta su aprobación.
3. Comparar `feat/neon-transaction-adapter` contra el `main` vivo sin merge ciego.
4. Mantener handoff, plan y diario actualizados con SHA/checks exactos; no desplegar producción ni mutar Neon `main`.

--- Checkpoint autoritativo — 2026-10-19, después de PR #57

- Repositorio: https://github.com/BTF14/Micro-app
- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe` — https://github.com/BTF14/Micro-app/commit/cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe.
- PR #55 y #56 fusionadas para continuidad documental; PR #57 fusionada: https://github.com/BTF14/Micro-app/pull/57.
- PR #57 bloquea `POST /auth/register`: después de validar Origin devuelve `503 REGISTRATION_DISABLED` antes de parsear credenciales o acceder a la DB. No crea usuarios, organizaciones, membresías, sesiones ni rate-limit rows, y no emite cookie en el camino bloqueado.
- Checks de PR #57 en el head exacto `71d3e6d3ffe625b12807e9942ddd261e222cf093`: verify, PostgreSQL auth integration, Chromium smoke, JS/TS static analysis, Trivy, migration validation, generate-progress y Cloudflare Pages terminaron en success. Los checks consultados en el merge SHA también terminaron en success. No se ejecutaron pruebas locales.
- Cloudflare reportó un Preview URL para el SHA fusionado: https://1d3d60bf.micro-app-63i.pages.dev. No hay evidencia en ese check de un despliegue productivo.
- Issue P0 #53 permanece abierto: el registro está bloqueado temporalmente, pero Google sign-in + allowlist no está implementado y D1–D8 siguen sin aprobarse. No cerrar el issue hasta implementar y probar el flujo aprobado.
- La rama `feat/neon-transaction-adapter` se comparó otra vez con `main`: divergida, 14 commits propios y 76 commits detrás, merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`. El adaptador `database.ts` y workflow de seguridad son idénticos a main; la prueba de DB en la rama es más antigua, `apps/api/package.json` usa un script de test incompatible con la separación de integración actual, y sus documentos están desactualizados. **No fusionar la rama completa**.
- Matriz de roles/permisos sigue sin aprobación; no crear rutas comerciales autorizadas según supuestos.
- App **NO lista para producción**: falta Google OAuth/allowlist, permisos aprobados, handlers de POS/inventario/ventas, aislamiento tenant real, E2E real, idempotencia/concurrencia, validación fiscal y backup/restauración independiente.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado, no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main` ni mezcla con Cantina-pos.

## Próximos pasos
1. Pedir al propietario la aprobación explícita de la política de identidad D1–D8 y matriz de roles; usar las recomendaciones documentadas como propuesta, no como decisiones ya aprobadas.
2. Mantener el registro fail-closed hasta que la política de identidad se implemente y pruebe.
3. Continuar con pruebas de auth/sesión y preparación de la primera ruta comercial solo después de aprobar los permisos.
4. Mantener cambios pequeños, PRs y verificación por SHA exacto.
5. No fusionar `feat/neon-transaction-adapter` completa; rescatar solo un cambio concreto si aparece una necesidad comprobada.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #55

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado después del merge: `b7117f8aeb868e25c49db86a524405511cd3c9be` — https://github.com/BTF14/Micro-app/commit/b7117f8aeb868e25c49db86a524405511cd3c9be.
- PR #55 fusionada: https://github.com/BTF14/Micro-app/pull/55. Solo añade el checkpoint de continuidad tras PR #54.
- Los 8 check-runs consultados para el head exacto de PR #55 `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28` terminaron en `success`: Cloudflare Pages (preview de rama, no producción), Trivy filesystem/config (dos ejecuciones), análisis estático JS/TS, verify, postgres-migration, Chromium authentication smoke tests y generate-progress. No se ejecutaron pruebas localmente ni se verificaron estos checks independientemente sobre el merge SHA.
- No hay PR abiertas en el momento de esta consulta.
- Issue P0 #53 continúa abierto: https://github.com/BTF14/Micro-app/issues/53. El registro público de `apps/api/src/auth.ts` sigue sin una política de identidad Google + allowlist demostrada. No afirmar que el alta pública esté bloqueada.
- D1–D8 de identidad y la matriz de permisos por rol siguen sin aprobación. No inventar proveedor OAuth, allowlist, bootstrap administrativo, verificación de correo, linking/recuperación ni permisos.
- La app NO está lista para producción: faltan handlers comerciales completos, pruebas reales API+PostgreSQL y aislamiento tenant aplicado/verificado, idempotencia/concurrencia, revisión fiscal y backup/restauración independiente.
- Preview de la rama #55: https://docs-checkpoint-after-pr54.micro-app-63i.pages.dev. Es un preview documental, no una aprobación de lanzamiento ni despliegue productivo.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado solamente: no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main`, producción ni mezcla con Cantina-pos.

## Siguiente paso
1. Solicitar al usuario aprobación explícita de las decisiones de identidad/roles que solo él puede fijar; facilitar opciones breves en el chat.
2. Mientras tanto, continuar revisión estática de seguridad y pruebas de bajo riesgo que no dependan de decisiones pendientes.
3. Mantener PRs pequeñas, revisar diff completo y comprobar checks del SHA exacto antes de fusionar.
4. Actualizar este documento, el handoff, plan y diario al siguiente hito.
5. No fusionar `feat/neon-transaction-adapter` a ciegas; sigue requiriendo comparación con main actual.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #51

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98` — https://github.com/BTF14/Micro-app/commit/e18a3ec267f4c4d0e02678a4c0522dabf200ac98
- PR #51 fusionada: https://github.com/BTF14/Micro-app/pull/51. Añade pruebas de error de base de datos para login y registro; las respuestas son seguras y no emiten cookie. Head probado `92ea991d6333bcd1b05943f679fdd36777ab6a8f`; seis workflows success: CI 39255462405, Playwright E2E 39255462498, migraciones 39255462284, Security scan 39255462264, Semgrep SAST 39255462627 y dashboard 39255462281.
- PR #50 fusionada: https://github.com/BTF14/Micro-app/pull/50. Login sin membresía activa o con organización inactiva no emite cookie. Head probado `dcad8d6d1caf6db3aabbc95465e5983ad0014746`; seis workflows success: CI 39255158169, Playwright E2E 39255157709, migraciones 39255158077, Security scan 39255157712, Semgrep SAST 39255157509 y dashboard 39255157611.
- PR #47–#48 añadieron cobertura para fallos de validación de sesión y usuarios inactivos; PR #49 actualizó documentación previa.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Inspeccionar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #48

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `420a64152103c90d2990d47c72fc19a744786fa6` — https://github.com/BTF14/Micro-app/commit/420a64152103c90d2990d47c72fc19a744786fa6
- PR #48 fusionada: https://github.com/BTF14/Micro-app/pull/48. Prueba que el login de una cuenta inactiva devuelve 401 sin crear cookie de sesión. Head probado: `6acb78018a47eb39f74dab079b53b51b4cacf11f`; los seis workflows terminaron en success: CI 39254257051, Playwright E2E 39254256939, migraciones 39254257076, Security scan 39254256854, Semgrep SAST 39254256882 y dashboard 39254256826.
- PR #47 fusionada: https://github.com/BTF14/Micro-app/pull/47. Prueba que `/auth/me` devuelve un error seguro y no limpia la cookie cuando la base de datos no permite validar la sesión. Head probado: `7939d11678cfd1a2bb8fac22664096663603c824`; seis workflows en success: CI 39253558854, Playwright E2E 39253558793, migraciones 39253558714, Security scan 39253558727, Semgrep SAST 39253558761 y dashboard 39253558724.
- PR #46 actualizó los documentos de continuidad después de PR #45.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Primero revisar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #45

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f` — https://github.com/BTF14/Micro-app/commit/1c6ecf6a4586ab1252a43210672e123975f8941f
- PR #45 fusionada: https://github.com/BTF14/Micro-app/pull/45. Añade una aserción en `apps/api/src/auth.integration.test.ts` para verificar que `/auth/me` elimina la cookie si la cuenta está inactiva.
- Head exacto de PR #45: `cdce44a9643c5134311f9603abf1248c07970df3`. Seis workflows de GitHub Actions terminaron en `success`: CI 39252317370, Playwright E2E 39252317397, migraciones 39252317371, Security scan 39252317467, Semgrep SAST 39252317386 y dashboard 39252317373.
- PR #44 cubre sesión revocada y organización inactiva; PR #43 cubre sesión expirada. No se ejecutaron pruebas localmente ni se verificaron aquí los workflows sobre el merge SHA.
- Prioridad siguiente: revisar autorización server-side y aislamiento tenant antes de añadir handlers comerciales. D1–D8 de Google OAuth/allowlist y la matriz de permisos siguen pendientes; no elegir políticas por suposición.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E con API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix está documentado, no instalado/ejecutado. Objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #41

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `3313bf4276563c6cdac52aa7902fa9ea36558014` — https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014
- PR #41 fusionada: https://github.com/BTF14/Micro-app/pull/41. Cambio: prueba de regresión para que el endpoint de logout no borre la cookie de sesión si falla la revocación del lado del servidor.
- Head exacto probado por GitHub Actions: `0c55c180846e6286e72d35f51e502278200ee0de`. Los seis workflows fueron `success`: CI (39244454840), Playwright E2E (39244454807), Security scan (39244454911), Semgrep SAST (39244454934), Project progress dashboard (39244454952) y Database migration validation (39244456648).
- Merge SHA: `3313bf4276563c6cdac52aa7902fa9ea36558014`. La consulta de workflows asociada al merge SHA no devolvió runs porque el conector filtra a eventos de PR; no afirmar que los seis workflows del merge SHA estén verificados. No se ejecutaron pruebas locales.
- Cambio acotado: solo `apps/api/src/index.test.ts`, 24 líneas añadidas. Usa una URL de base de datos sintética inválida; no contacta ni modifica una base real.
- No se tocaron secretos, billing, datos reales, Neon `main`, producción ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado, no instalado ni ejecutado.
- Estado del producto: **NO listo para producción**. Persisten endpoints comerciales incompletos, decisiones de identidad D1–D8 pendientes, matriz de permisos por aprobar, aislamiento multiempresa y flujos reales API+PostgreSQL por validar, idempotencia/concurrencia, requisitos fiscales y backup/restauración independiente por verificar.
- Rama `feat/neon-transaction-adapter`: divergida y desactualizada; no fusionar a ciegas. Recuperar solo cambios puntuales tras comparar con `main`.
- Siguiente paso: continuar con pruebas pequeñas de auth/sesión/autorización sin inventar políticas pendientes; mantener CI verificado por SHA exacto y coste objetivo $0. No desplegar producción ni mutar Neon `main` sin superar los gates documentados.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #39

## Estado verificado en GitHub

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `50c530084f8ce402d897962cbc7c4354c512e847` — https://github.com/BTF14/Micro-app/commit/50c530084f8ce402d897962cbc7c4354c512e847
- PR #39, prueba de que el error original de operación sobrevive cuando también falla el cierre del cliente: fusionada — https://github.com/BTF14/Micro-app/pull/39. Head probado: `134c9e14a5224d83c5f280dc501ae113d374c159`; merge SHA: `50c530084f8ce402d897962cbc7c4354c512e847`.
- Los seis workflows terminaron en `success` para el head exacto de PR #39 `134c9e14a5224d83c5f280dc501ae113d374c159`: CI (run 39243670711), Project progress dashboard (39243670742), Playwright E2E (39243670784), Database migration validation (39243670921), Semgrep SAST (39243670843) y Security scan (39243670950).
- PR #38 también está fusionada: https://github.com/BTF14/Micro-app/pull/38; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`. Sus seis workflows fueron `success` en el head exacto `527dd7cc62bcceae891add8100875cc395dd5cfa`.
- No se ejecutaron pruebas locales. Los resultados indicados son de GitHub Actions sobre los head SHA especificados. No se han verificado aquí workflows para el merge SHA de PR #39; no afirmar que el merge SHA esté completamente verde.
- No se desplegó producción, no se modificó Neon `main`, no se tocaron datos reales, secretos, facturación ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.
- Automatización diaria de continuidad creada previamente con ID `6ad4c8ce247881919e0c4e83e7358dcb`; verificar su estado en la plataforma si se necesita afirmar que está activa/ejecutándose. No es un bucle continuo en tiempo real.

## Estado funcional y bloqueos

La aplicación **NO está lista para producción**. Continúan pendientes: rutas comerciales completas para catálogo/proveedores/inventario/ventas/pagos/devoluciones/reportes; Google OAuth, allowlist y verificación de correo según las decisiones D1–D8 aún no aprobadas; matriz de permisos por rol; aislamiento multiempresa validado en todos los endpoints; pruebas reales de API + PostgreSQL para flujos de negocio; idempotencia y concurrencia de ventas/stock; cumplimiento fiscal; backups independientes y restauración ensayada; preview aislada y aprobación de lanzamiento.

## Próximos pasos

1. Continuar con pruebas de auth/sesión de alcance acotado sin inventar políticas de identidad o roles.
2. Revisar la rama `feat/neon-transaction-adapter` contra el `main` actual antes de cualquier decisión; no fusionarla a ciegas.
3. Mantener cambios pequeños en ramas/PR; exigir CI exitoso para el head SHA exacto y revisar diffs/reviews antes de merge.
4. Mantener el presupuesto objetivo en $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.
5. Corregir esta documentación al cerrar hitos; no usar snapshots históricos como evidencia del estado actual.

---

# Checkpoint de continuidad — 2026-10-19, después de PR #36

## Estado verificado

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `c15c2364cd19e55ac10b2331300e7a9f4b89813f` — https://github.com/BTF14/Micro-app/commit/c15c2364cd19e55ac10b2331300e7a9f4b89813f
- PR #35, checkpoint documental tras PR #34: fusionada — https://github.com/BTF14/Micro-app/pull/35. Merge SHA: `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36, validación estricta de hashes PBKDF2: fusionada — https://github.com/BTF14/Micro-app/pull/36. Head SHA probado por CI: `cf432de6d5e8752181bc1105e9d0e91384d5936c`; merge SHA: `c15c2364cd19e55ac10b2331300e7a9f4b89813f`.
- PR #36 cambió `apps/api/src/auth.ts` para rechazar hashes con campos `$` adicionales y valores de iteraciones no canónicos; añadió regresiones en `apps/api/src/auth.test.ts`.
- Los seis workflows de PR #36 terminaron en `success` para el head exacto `cf432de6d5e8752181bc1105e9d0e91384d5936c`:
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39241705903
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39241706090
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39241705951
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39241706070
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39241705989
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39241706068
- Los seis jobs consultados tras PR #34 (run IDs 39241150482, 39241150423, 39241150283, 39241150291, 39241150500 y 39241150556) reportaron `success`. La consulta disponible no devolvió metadatos suficientes para vincular cada run al SHA de merge `02c7cd61ef2e94545849746885dede12b2df7767`; no afirmar que ese SHA tiene checks confirmados hasta verificarlo por otro medio.
- No se ejecutaron pruebas locales en esta sesión. La evidencia de tests es GitHub Actions sobre el head de PR #36, no una ejecución local.
- No se desplegó producción ni se modificó Neon `main`; no se tocaron datos reales, secretos, billing ni Cantina-pos.

## Bloqueos de producto

- La aplicación NO está lista para producción: todavía no se ha verificado la implementación completa de rutas comerciales para catálogo, proveedores, inventario, ventas, pagos, devoluciones y reportes.
- Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen pendientes de aprobación; no inventar proveedor, política ni flujo de cuentas.
- La matriz de permisos por rol sigue pendiente de aprobación. No crear rutas comerciales asumiendo permisos.
- Playwright cubre smoke tests con API simulada; faltan pruebas E2E reales de API + PostgreSQL para flujos comerciales.
- Backups independientes y restauración real siguen sin verificarse. Revalidar protección de `main`; no asumir que está activada.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.

## Próximas acciones

1. Verificar los checks del SHA de merge `c15c2364cd19e55ac10b2331300e7a9f4b89813f` y registrar evidencia exacta si la plataforma la expone.
2. Continuar con pruebas de seguridad/auth de alcance pequeño, sin cambiar decisiones de identidad o permisos pendientes.
3. Mantener cambios en ramas + PR y esperar CI en el head SHA exacto antes de fusionar.
4. Actualizar este checkpoint y los documentos de estado tras cada cambio significativo.
5. Mantener coste objetivo $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates y autorizaciones requeridos por `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

# Checkpoint autoritativo — 2026-10-19, después de PR #31

> Revalidar GitHub en cada sesión antes de actuar; este bloque es un punto de partida, no sustituto de la verificación viva.

- Repositorio canónico: https://github.com/BTF14/Micro-app
- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 (matriz de decisiones de permisos por rol, todas pendientes de aprobación): https://github.com/BTF14/Micro-app/pull/30, fusionada.
- PR #31 (pruebas de sesiones/login cuando la organización está inactiva): https://github.com/BTF14/Micro-app/pull/31, fusionada; head de PR `cfb9f82a497b35aa5a27a4a9ea78476692cf254d`.
- Comprobación viva de Actions para el SHA exacto de main: 8 check-runs visibles: 6 success y 2 in_progress al momento de esta consulta; volver a verificar antes de declarar CI completamente verde.
  - Trivy filesystem and configuration scan: in_progress — https://github.com/BTF14/Micro-app/actions/runs/39176217202/job/117819320792
  - Cloudflare Pages: in_progress — https://github.com/BTF14/Micro-app/runs/117819318705
  - Chromium authentication smoke tests: success — https://github.com/BTF14/Micro-app/actions/runs/39175964317/job/117818569851
  - Trivy filesystem and configuration scan: success — https://github.com/BTF14/Micro-app/actions/runs/39175964296/job/117818569814
  - generate-progress: success — https://github.com/BTF14/Micro-app/actions/runs/39175964326/job/117818569804
  - postgres-migration: success — https://github.com/BTF14/Micro-app/actions/runs/39175964294/job/117818569740
  - JavaScript and TypeScript static analysis: success — https://github.com/BTF14/Micro-app/actions/runs/39175964287/job/117818569696
  - verify: success — https://github.com/BTF14/Micro-app/actions/runs/39175964298/job/117818569670
- PR #32 (esta actualización documental) está abierta: https://github.com/BTF14/Micro-app/pull/32; sus checks deben verificarse para el head SHA vigente antes de fusionar.
- No se ejecutaron pruebas locales en esta sesión. El estado de CI es evidencia de GitHub Actions, no certifica preparación comercial.
- Código verificado: `apps/api/src/index.ts` registra auth y health; aún no hay handlers HTTP comerciales para catálogo/productos, proveedores, compras, ventas, pagos ni movimientos de inventario.
- Autenticación: existen registro/login con contraseña, `/auth/me` y logout; Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen sin aprobar. No cambiar el modelo de registro ni inventar reglas de acceso.
- Permisos: `docs/sdd/role-permission-decision-matrix.md` está fusionado, pero cada celda sigue pendiente. No construir rutas comerciales asumiendo permisos por rol.
- La rama de Neon adapter no debe fusionarse ciegamente; la revisión anterior encontró 14 commits propios y 49 detrás de main, sin código único que justificara la fusión completa.
- Neon `main`: no se modificó. Backups independientes y restauración real: no verificados. Protección de branch main: estaba desactivada en la última comprobación; verificar de nuevo y no modificar sin necesidad/autoridad clara.
- Strix (`https://github.com/usestrix/strix.git`) solo está documentado; no instalado ni ejecutado.
- Límites: coste objetivo $0; no mezclar Cantina-pos; no secretos, correos, billing, datos reales, mutaciones en Neon main ni despliegues de producción sin superar los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

## Instrucciones obligatorias para la siguiente IA

1. Leer primero `AGENTS.md`, luego este checkpoint, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/CONSTITUTION.md`, `docs/PRODUCTION_READINESS.md` y `docs/BACKUP_AND_RECOVERY.md`.
2. Antes de cualquier cambio, comprobar en vivo el SHA de main, PR abiertas, checks del SHA exacto y estado de ramas. No usar los SHA históricos como evidencia actual.
3. Continuar autónomamente con cambios pequeños, reversibles y útiles; no pedir al usuario permisos ya concedidos. Documentar hallazgos y pruebas reales, sin afirmar que algo se ejecutó si solo se leyó el código.
4. Próxima prioridad técnica: diseñar el primer endpoint comercial solo después de obtener aprobación explícita de la matriz de roles; hasta entonces, revisar fallos de seguridad concretos, ampliar pruebas de infraestructura/auth sin cambiar la política de identidad, y preparar contrato/criterios de aceptación sin exponer rutas inseguras.
5. D1–D8 de identidad y matriz de permisos necesitan decisión del propietario. No inventar proveedor OAuth, allowlist, email/domains, bootstrap admin, vinculación de cuentas, permisos de roles ni fiscalidad.
6. No desplegar producción ni modificar Neon main hasta cumplir gates y recibir aprobación específica cuando corresponda. Mantener presupuesto $0 y no tocar datos reales.
7. Si la conversación se acerca al límite, actualizar este archivo, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` y `docs/PROJECT_PLAN.md` en una rama/PR; incluir SHA, PR/merge, checks exactos, cambios, tests ejecutados/no ejecutados, riesgos y siguiente acción concreta. Abrir PR y esperar CI; no declarar merge sin evidencia.
8. No detener el trabajo solo por falta de una respuesta de “ok”. Detenerse únicamente ante decisión de producto necesaria, riesgo alto o bloqueo real; explicar la decisión mínima requerida.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #27

> **Esta sección prevalece sobre los snapshots históricos más abajo.** Verificar de nuevo GitHub antes de usar este estado en una sesión futura.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- PR #27, [refresco del checkpoint después de PR #26](https://github.com/BTF14/Micro-app/pull/27), está fusionada. Head revisado: `29f899a52346d342067cf8e1b22850d35aa48a69`; los ocho check-runs visibles en ese head terminaron en `success`.
- Para el merge commit de `main`, los siete checks consultados terminaron en `success`: [Cloudflare Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [smoke tests Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify/CI](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [análisis JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812) y [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No había PR abiertas en la consulta posterior al merge. No se ejecutaron pruebas locales en esta sesión; la evidencia indicada es de GitHub Actions para los SHA exactos.
- Estado del producto: **no listo para producción**. La API aún no registra handlers HTTP comerciales para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de aislamiento es un plan de aceptación, no evidencia de controles en rutas inexistentes.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 siguen pendientes de aprobación; roles/permisos por operación deben definirse antes de añadir rutas de negocio; no se han verificado backups/restauración independiente; la protección de `main` estaba desactivada en la última comprobación.
- Límites mantenidos: presupuesto $0, proyecto independiente de Cantina-pos, sin secretos ni correos, sin cambios a Neon `main`, sin despliegue de producción. Strix sigue documentado, no instalado ni ejecutado.
- Próximo paso seguro: continuar la revisión del adaptador Neon sin merge ciego y preparar una matriz explícita de permisos por rol para que el primer endpoint comercial tenga pruebas positivas y negativas de aislamiento; no inventar políticas pendientes.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #26

> **Esta sección prevalece sobre todos los snapshots históricos más abajo.** Los SHA, estados de PR y enlaces de Actions antiguos que aparezcan en el resto de este archivo no representan el estado vivo actual salvo que coincidan con una verificación nueva de GitHub.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c` — https://github.com/BTF14/Micro-app/commit/a3cc3ae7533510baf2502a3f553030c2c8505a4c
- PR #24 (matriz de aislamiento tenant), PR #25 (refresco documental) y PR #26 (checkpoint documental) están fusionadas.
- PR #26: https://github.com/BTF14/Micro-app/pull/26; head `a5576ae3db9b606bbb69fa3c7f34006e6585934e`; sus siete workflows consultados terminaron en `success`.
- Para el SHA exacto de `main` `a3cc3ae7533510baf2502a3f553030c2c8505a4c`, los seis workflows consultados terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39133032751), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39133032760), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39133032817), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39133032755), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39133032686) y [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No hay PR abiertas en la consulta actual. No se desplegó producción ni se modificó Neon `main`.
- Estado de producto: **no listo para producción**. `apps/api/src/index.ts` todavía no registra handlers HTTP de negocio para catálogo/productos, proveedores, ventas, pagos o movimientos de inventario; la matriz de tenant define criterios futuros, no evidencia de endpoints ya protegidos.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 pendientes de aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última verificación; faltan flujos POS/inventario reales y pruebas de autorización completas.
- Límites: presupuesto $0, no mezclar con Cantina-pos, no secretos ni correos, no migraciones a Neon `main` sin superar el gate de `docs/CONSTITUTION.md`, no despliegue de producción sin aceptación explícita.
- Próximo trabajo seguro: abordar identidad solo tras resolver D1–D8; mientras tanto, ampliar cobertura de autorización y preparar endpoints de negocio en entorno aislado, sin inventar políticas de registro ni OAuth.

---


# Estado vigente verificado — Micro app

**Checkpoint actualizado:** 2026-10-18.  
**HEAD de `main` verificado:** `69032a333b52ee10099c0347be3443e18f4dc4df` — [commit](https://github.com/BTF14/Micro-app/commit/69032a333b52ee10099c0347be3443e18f4dc4df).  
**PR #24 fusionada:** [matriz de aceptación para aislamiento tenant](https://github.com/BTF14/Micro-app/pull/24). Su head `e7856319321f1aa1047148fd782fcadb77f091c2` tuvo los siete workflows asociados en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39132363061), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39132363092), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39132363114), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39132363103), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39132363026) y los dos escaneos de seguridad ([1](https://github.com/BTF14/Micro-app/actions/runs/39132362959), [2](https://github.com/BTF14/Micro-app/actions/runs/39132359995)).  
**Checks del merge commit:** seis workflows detectados; el panel de progreso ya pasó y CI, Playwright, seguridad, Semgrep y validación de migraciones seguían en ejecución en la última consulta. Verificar su estado para este SHA antes de concluir que el merge commit está verde.

**Hallazgo de autorización:** `apps/api/src/index.ts` registra health y rutas de autenticación. No hay handlers HTTP de negocio para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de `docs/TENANT_ISOLATION_TEST_PLAN.md` define aceptación futura; no demuestra aislamiento funcional en endpoints que aún no existen.

**Bloqueos:** Google OAuth + allowlist y decisiones D1–D8 siguen sin aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última lectura; no desplegar producción ni modificar Neon `main` sin superar los gates de la Constitución. Los workflows verdes de documentación no certifican preparación para producción.

---


**Verificado:** 2026-10-18 (consulta directa a GitHub API y archivos de `main`).  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Propósito:** referencia breve de estado vivo. Este archivo prevalece sobre snapshots históricos de `PROJECT_PLAN.md`, `STATE_JOURNAL.md` y `HANDOFF_NEXT_CHAT.md` cuando sus SHA/estados contradigan los datos aquí. Antes de cada cambio, repetir la consulta en vivo.

## Estado Git y CI

- `main`: `1e48eb9b2056a0d472f69a7cd62c1b3930d27c13` — [commit](https://github.com/BTF14/Micro-app/commit/1e48eb9b2056a0d472f69a7cd62c1b3930d27c13).
- PR abiertas: ninguna en la consulta de GitHub.
- Para ese SHA exacto, los seis workflows más recientes consultados terminaron en `success`:
  - [CI](https://github.com/BTF14/Micro-app/actions/runs/39131400317)
  - [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39131400310)
  - [Validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39131400321)
  - [Panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39131400327)
  - [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39131400368)
  - [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39131400390)
- La rama `main` no tiene protección activa ni checks obligatorios configurados (`protected=false`). Es un riesgo de gobernanza pendiente; no se ha cambiado la configuración.
- Estos workflows verdes no demuestran que el producto esté listo para producción.

## Bloqueos y siguientes prioridades

1. **P0 identidad:** revisión estática de `apps/api/src/auth.ts` en el `main` indicado encontró solo `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no encontró Google OAuth, allowlist ni verificación de email. Las decisiones D1–D8 en `docs/sdd/auth-policy-decision-record.md` continúan expresamente sin aprobar. No inventar correos/dominios, bootstrap de administrador, política de organizaciones ni vinculación de cuentas. No activar OAuth ni enviar correos sin resolver las decisiones y configurar los secretos de forma segura.
2. **Adaptador Neon:** `feat/neon-transaction-adapter` (`7989a84e39536029819735a5202f3934a8eb12c3`) está divergida respecto a este `main`: 14 commits por delante, 43 por detrás; el merge-base es `2d2099245f2404b0a8d3689189235a577d5e632c`. El diff resumido enumera siete archivos: workflow de seguridad, paquete API, pruebas y adaptador de base de datos, integración API y dos documentos de seguridad/cumplimiento. No fusionar a ciegas; hacer revisión archivo por archivo y rescatar cambios por separado.
3. Ampliar pruebas de identidad, sesiones, autorización y aislamiento entre tenants con PostgreSQL efímero; no confundir E2E con API simulada con integración real.
4. Verificar automatización de backups y restauración real independiente; no se ha demostrado que estén operativas.
5. Seguir el checklist `docs/PRODUCTION_READINESS.md`; la app aún no está lista para despliegue comercial.

## Límites operativos

- Mantener coste objetivo $0 y separación absoluta de Cantina-pos.
- No exponer secretos ni enviar correos.
- No hacer despliegue de producción sin aprobación explícita.
- Para Neon `main`, seguir el gate de cambio de producción de `docs/CONSTITUTION.md`; probar primero en entorno aislado y no ejecutar cambios destructivos/ambiguos sin aprobación.
- Strix está documentado, pero no instalado ni ejecutado; solo evaluar en laboratorio aislado con datos sintéticos y coste confirmado $0.
- No declarar pruebas locales, instalaciones, agentes o ejecuciones autónomas como hechos si no existe evidencia.

## Protocolo de actualización

Después de cada cambio significativo, actualizar este archivo y el diario/handoff pertinentes; registrar el SHA y enlaces de Actions para ese SHA exacto. Si `main` avanza, actualizar primero este checkpoint en lugar de copiar estados antiguos.


## Revisión preliminar de `feat/neon-transaction-adapter` (2026-10-18)

Se compararon los siete archivos enumerados por GitHub al contrastar la rama con el `main` actual. Hallazgos verificables:

- `.github/workflows/security-scan.yml`, `apps/api/src/database.ts` y `apps/api/src/database.test.ts` tienen el mismo blob SHA en la rama y en `main`; no aportan diferencias actuales.
- `apps/api/package.json` difiere: la rama usa `vitest run`, mientras que `main` excluye los archivos `*.integration.test.ts` del comando unitario. No restaurar el script antiguo sin revisar cómo CI ejecuta las pruebas de integración.
- `docs/API_INTEGRATION.md`, `docs/COMPLIANCE_REQUIREMENTS.md` y `docs/SECURITY_PLAN_2026.md` están desactualizados respecto a sus versiones de `main` y podrían reintroducir afirmaciones ya corregidas.
- Con esta comparación no aparece una implementación de adaptador o pruebas unitarias que falte rescatar de esa rama: los archivos centrales del adaptador ya coinciden con `main`. La rama no debe fusionarse; si se necesita rescatar algo, hacerlo como cambios puntuales después de revisión, no mediante merge.

Esta revisión fue estática de contenidos en GitHub; no se ejecutaron tests desde un entorno local ni se cambió la rama del adaptador.


## Estado vivo — fusiones de PR #140/#142 y prueba sintética de recuperación (2026-10-29 UTC)

- `main` quedó en `c87893313534049463917af5ee17dfd36ba319c4` tras fusionar por squash [PR #140](https://github.com/BTF14/Micro-app/pull/140) y [PR #142](https://github.com/BTF14/Micro-app/pull/142). Las comprobaciones post-merge para ese SHA terminaron en `success`: CI, Playwright E2E, migración PostgreSQL, análisis estático, Semgrep, Security scan, Trivy, escaneo de historial, Cloudflare Pages y Workers. Ver runs [CI](https://github.com/BTF14/Micro-app/actions/runs/40847420758), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/40847420957), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/40847420948), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/40847420899), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/40847420845).
- PR #140 añadió pruebas unitarias y de integración para el aislamiento del selector de organización. Esto verifica el resolver de contexto, no autoriza afirmar que existan rutas comerciales completas ni que se haya probado todo el aislamiento de endpoints comerciales.
- PR #142 actualizó Wrangler a `^4.155.0`, `@cloudflare/workers-types` a `^5.20261029.1` y Node a `>=24.22.2 <25`. Se conserva TypeScript 5, Vite 7 y el override `undici@7.30.1`; no se desplegó manualmente producción.
- Prueba sintética de recuperación verificada: [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`, terminó en `success`. Validó checksum, cifrado/descifrado age, manifiesto coincidente de 13 tablas, constraints, relaciones de venta/pago/inventario/auditoría y exclusión de tablas efímeras. No mide RPO/RTO de producción ni valida restauración de una copia real.
- Restricciones vigentes: coste objetivo $0, sin tarjetas/facturación, no tocar Neon `main`, no publicar datos reales, no desplegar manualmente producción. Revalidar el SHA y los checks en vivo antes de toda decisión posterior.


## ESTADO VIVO PRIORITARIO — tras PR #143 (2026-10-29 UTC)

- **Main actual al iniciar esta actualización documental:** `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`, merge de [PR #143](https://github.com/BTF14/Micro-app/pull/143). PR #140, #142 y #143 están fusionadas. Checks post-merge de #143: Pages, Workers, CI/verify, Chromium, migraciones, análisis estático, Trivy, escaneo de historial y dashboard: todos `success` para este SHA.
- **PR #143 — backup/restore sintético:** [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) terminó en `success` en el SHA final de la PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. La prueba aplica migraciones a PostgreSQL 17 efímero, inserta datos sintéticos relacionados, genera dump, cifra con clave age efímera, valida checksum, descifra/restaura, compara manifiesto de 13 tablas y constraints, valida relaciones venta/pago/inventario/auditoría y confirma que las tablas de sesión/rate-limit no se restauran. El workflow corre manualmente y mensualmente; no usa secretos ni Neon.
- La prueba sintética **no** mide RPO/RTO de producción, no demuestra restauración de un backup real con datos poblados y no prueba alertas externas. Pendientes: medir tiempos de recuperación, comprobar respuesta visible ante fallo y confirmar coste $0.
- **Monitor diario de dependencias:** [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052), ejecutado en SHA previo `ecd7795a4699e6079bc3e372474ed24e410d2c8f`, terminó en `success`. La auditoría indicó `No known vulnerabilities found`; el informe de versiones funcionó y reportó Wrangler/workers-types y majors de Vite, plugin React, jsdom y TypeScript. PR #142 ya aplicó los dos updates compatibles de Cloudflare. No afirmar que ese run auditó el SHA actual; esperar la siguiente ejecución programada para el inventario actualizado.
- La rama `fix/dependency-watch-report-20261029` tiene cero commits exclusivos y está cuatro commits detrás de `main`; su workflow es idéntico al de `main`. Es una rama obsoleta/redundante, no necesita PR nueva.
- Restricciones sin cambios: coste objetivo $0, no tarjetas/facturación, no tocar Neon `main`, secretos ni datos reales, no desplegar manualmente producción. No abrir PR duplicadas; verificar SHA/checks en vivo antes de futuras fusiones.


## Backup workflow incident — 2026-10-29 (in progress)

- Latest manual production-backup workflow run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763), commit `872d5e54786fa6df4121c97d5e130e9b7599f8ca`, failed after 23 seconds with exit code 2.
- Logs confirm `pg_dump`, age encryption and SHA-256 checksum succeeded. The encrypted file and checksum were committed only inside the temporary runner's clone of `BTF14/micro-app-backups`; the workflow failed before `git push`, so this run did **not** persist a new backup. Existing remote backups were not pruned or changed by this run.
- Root cause: after `cd backups-repo`, `python3 ../scripts/prune_backups.py` resolved to a nonexistent path under the runner parent directory, not the checked-out repository workspace.
- Fix prepared on branch `fix/backup-workflow-path-20261029`: use `$GITHUB_WORKSPACE/scripts/prune_backups.py` and pin the backup workflow runner to `ubuntu-24.04` rather than following the newly migrated `ubuntu-latest` image. This is not considered resolved until PR checks pass and a real manual run confirms upload, checksum, retention, and success.
- No secrets, Neon main data, or existing backup repository contents were changed manually. Do not claim a fresh backup until the follow-up run is verified.


## Backup incident — PostgreSQL client mismatch (2026-10-29)

- Latest run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) failed in “Generar el volcado” with server PostgreSQL 18.6 vs pg_dump 16.15. It failed before dump creation; encryption and upload were skipped, and the remote backup repository was not modified.
- Root cause: installing `postgresql-client-17` did not guarantee that the unqualified `pg_dump` command resolved to that version; the runner selected 16.15.
- Branch `fix/backup-pg-dump-v18-20261029` switches to `postgresql-client-18`, invokes `/usr/lib/postgresql/18/bin/pg_dump` explicitly and asserts major version 18. Verify PR checks and a complete manual backup before closing the incident.


## Backup workflow incident #7 — missing checkout (2026-10-29)

- Manual run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) installed PostgreSQL client 18.6, successfully generated the dump, encrypted it with age and wrote its SHA-256 checksum. It failed in the upload/retention step because `$GITHUB_WORKSPACE/scripts/prune_backups.py` did not exist in the runner workspace.
- Root cause: `.github/workflows/backup.yml` used a repository script but had no `actions/checkout` step, so the repository files were never checked out. The prior absolute path correction alone could not fix this.
- Branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` before any step that needs repository files. Run #7 failed before `git push`; its backup commit remained only in the ephemeral clone, and remote retention did not run. Do not claim a new persisted backup until a subsequent run succeeds and remote file/checksum are verified.


## Backup workflow verified successful — 2026-10-29

- Manual run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) concluded `success` on main workflow commit `966c0e1586a4869d2ae57424bd7c32ff7d224a0f`.
- Logs prove PostgreSQL client `pg_dump 18.6` was used, the dump was generated, encrypted with age, and SHA-256 checksum written. The upload step cloned the private backup repository, committed `daily/backup-2026-10-29T17-29-48Z.dump.age` plus its `.sha256`, reported `retention complete; deleted 0 file(s)`, and pushed commit `2b038bd` to remote `main` successfully.
- This verifies a new encrypted backup was durably pushed. It does not by itself prove decryption/restoration of this production backup, real RPO/RTO, external failure alerting, or zero cost. Preserve the age private key securely and never place it in Git/chat.

---

## REGLA VIGENTE — capacidad y límites de Neon/Cloudflare (2026-10-29 UTC)

- Requisito permanente: no declarar cuántas organizaciones/sucursales soporta Micro app hasta auditar y medir capacidad con carga sintética representativa.
- Revisar Neon/PostgreSQL, Cloudflare Workers, Cloudflare Pages y los demás servicios conectados: cuotas del plan, CPU, solicitudes, conexiones, concurrencia, latencia, almacenamiento, crecimiento, errores y costes potenciales.
- Documento operativo: [CAPACITY_AND_LIMITS.md](./CAPACITY_AND_LIMITS.md); integrado con [ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md).
- Próximo trabajo: auditoría de solo lectura en GitHub + verificación de cuotas de proveedores; luego pruebas de carga sintética en entorno efímero/autorizado. No probar contra Neon `main`, no desplegar producción ni habilitar costes sin autorización.
- Capacidad numérica actual: **DESCONOCIDA / NO MEDIDA**. No presentar estimaciones como garantías.

## ESTADO OPERATIVO VIGENTE — restauración del backup remoto verificada (2026-10-29 UTC)

- [Run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124) del workflow `.github/workflows/backup-real-restore.yml` terminó en `success`.
- Se descargó `daily/backup-2026-10-29T17-29-48Z.dump.age`; el SHA-256 del objeto remoto coincidió con su sidecar (`OK`), `age` lo descifró y PostgreSQL 18 efímero lo restauró sin error. `pg_restore --list` leyó el archivo y la validación encontró tablas base en `public`. Se limpiaron los archivos descifrados temporales.
- **Conclusión:** verificada la restauración técnica de la copia remota exacta. No se tocó Neon `main` ni producción.
- **Límite:** no se verificaron conteos ni relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo o coste total $0. La comprobación de esquema por sí sola no garantiza que los datos comerciales estén completos.
- **Siguiente paso:** planear una comprobación segura de conteos/relaciones mediante datos sintéticos o metadatos no sensibles; medir RPO/RTO; revisar alerta, retención y coste. No imprimir datos comerciales ni solicitar la clave privada age por chat.


## Estado vivo prioritario — main posterior a PR #155 (2026-10-29 UTC)

- **Main actual:** `5a9bdc5a18a54c3c68639f52125d913d4e725b91`, merge commit de PR #155. PR #155 (`fix(auth): enforce HTTPS frontend origin for Google OAuth`) está cerrada y fusionada. La corrección de `getConfiguredFrontendOrigin` exige HTTPS salvo HTTP loopback (`localhost`, `127.0.0.1`, `[::1]`), rechaza credenciales y componentes URL adicionales.
- **Verificación de PR #155:** en SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`, ocho workflows terminaron `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Dependency review, Secret history scan y Project progress dashboard. CI ejecutó build/typecheck, unit tests y PostgreSQL auth integration tests. La revisión Codex no se completó por límite de uso; no afirmar review independiente.
- **Despliegues:** Cloudflare informó deployments automáticos de preview para Pages y Workers en la rama/commit. No son despliegues productivos ni validación de producción. No se hizo deploy manual.
- **PR #154:** continúa abierta, desactualizada y no mergeable contra la nueva main; su propósito documental se está reconciliando en PR #156. No fusionar #154.
- **Arquitectura:** mantener React/Vite/TypeScript + Cloudflare Pages + Workers/Hono + Neon PostgreSQL/Drizzle; no reescribir ni introducir microservicios sin medición. No existen aún rutas comerciales HTTP. El stock del esquema actual está a nivel organización, no sucursal; no añadir un `branch_id` superficial.
- **Bloqueos:** matriz `docs/sdd/role-permission-decision-matrix.md` no aprobada; diseño de sucursales y propiedad de catálogo/precios/stock por ubicación pendiente; conciliación transaccional venta-líneas-pagos-stock pendiente. No iniciar rutas comerciales ni migraciones de sucursal hasta resolver estos contratos.
- **Capacidad:** organizaciones/sucursales concurrentes no medidas. Los límites observados de Neon y las cuotas Cloudflare no permiten prometer un número de tenants. Mantener presupuesto objetivo $0 y revisar cuotas/uso real.
- **Seguridad/operación:** PR #153 y #155 están en main; no hay evidencia de validación HTTP en producción. Restauración técnica del backup remoto exacto verificada, pero conteos de datos comerciales, RPO/RTO, alertas y coste total aún pendientes. Producción sigue NO lista.

---

# Estado vivo — 2026-10-30 UTC (branch scope en PR)

- Main base verificado: `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`; PR #164 ya está fusionada. Este bloque supersede referencias históricas anteriores que la presenten abierta o pendiente.
- Rama activa: `feat/branch-scope-context-20261030`; PR #165 abierta: https://github.com/BTF14/Micro-app/pull/165.
- El propietario autorizó el alcance general: owner/admin pueden resolver sucursales activas de su organización; cashier/inventory requieren asignación activa propia. Esto no aprueba permisos sensibles por operación.
- Cambio preparado: migración aditiva 0003 para branches/branch_memberships, resolver server-side resolveBranchContext, tests unitarios, assertions SQL cross-tenant y workflow PostgreSQL 18 efímero.
- El resolver no está conectado a rutas y no concede permiso para vender, descontar, anular, pagar, ajustar inventario, transferir, operar caja ni gestionar usuarios.
- La matriz de permisos por operación sigue NO APROBADA. No hay handlers comerciales.
- En HEAD de implementación `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b`, CI, integración PostgreSQL, migration validation, Playwright, Semgrep, Trivy, secret-history, dependency review, backup smoke y Cloudflare previews finalizaron success. La primera ejecución de integración falló solo en teardown por una sucursal sintética residual; se corrigió la limpieza, se eliminó la consulta concurrente del mismo cliente pg y la ejecución posterior pasó (3/3 pruebas de branch scope, sin warning). La sincronización documental posterior debe revalidar el SHA final.
- Neon main, datos reales, Cloudflare settings, secretos, DNS, billing y producción sin cambios; migración no aplicada remotamente.

- Ampliación de validación: CI aplica también 0003 al PostgreSQL efímero y ejecuta `branch-context.integration.test.ts` contra PostgreSQL real; el workflow `postgres-migration` mantiene assertions SQL específicas. Verificar ambos resultados en el HEAD final de la PR.

- Endurecimiento posterior: `resolveBranchContext` revalida en su propia consulta que organization, app_user y organization_members siguen activos y que el rol actual en DB coincide con el TenantContext; owner/admin se determina desde la fila DB. Se añadieron pruebas PostgreSQL para membresía revocada y rol obsoleto. Esta revisión cambió el HEAD después de los checks previamente documentados; verificar nueva ejecución CI antes de merge.
