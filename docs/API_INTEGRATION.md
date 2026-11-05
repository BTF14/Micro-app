## Estado API vivo — actualización 2026-11-05 09:43 UTC

- PR #210 HEAD `ab5d2168a11a825a9ed6b03341b3091c13f3c06e`: 8/8 workflow runs success; 0009 acopla balance↔ledger en la misma transacción. 0005–0009 siguen solo en la pila Draft, no en main/Neon.
- Rutas actuales siguen limitadas a auth/Google OAuth, catálogo GET/POST/PATCH, conteos create/confirm, GET warehouses/count history y health. No hay endpoint de lectura de balances/ledger para Cashier, aunque la matriz aprobada lo permite en su sucursal.
- authorization.ts contiene helpers, pero no es middleware global; handlers mantienen checks locales. auth_rate_limits no tiene caller runtime.
- Issue #53 sigue abierta/P0. Principal DATABASE_URL real/ownership/grants no verificado. Producción NO LISTA.

---

## Estado API vivo — 2026-11-05 UTC

Este addendum supersede la descripción histórica de “auth/health solamente” que aparece más abajo.

### Rutas HTTP registradas en la pila actual de #207

- Auth: `POST /auth/register` y `POST /auth/login` fail-closed/deshabilitados; `GET /auth/me`; `POST /auth/logout`; Google OAuth `GET /auth/google`, bootstrap `POST /auth/google`, callback `GET /auth/google/callback`.
- Catálogo: `GET /api/orgs/:organizationId/catalog`; `POST /api/orgs/:organizationId/catalog`; `PATCH /api/orgs/:organizationId/catalog/:productId`.
- Inventario: `POST /api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts/:countType`; `POST /api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts/:countId/confirm`; `GET /api/orgs/:organizationId/branches/:branchId/warehouses`; `GET /api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts`.
- Health: `GET /health`.
- No hay todavía handlers HTTP de ventas, pagos, recepciones/compras, devoluciones, transferencias, gestión de miembros o reportes.

### Autorización y transacciones

- Catálogo GET: sesión y membresía activas; todos los roles pueden leer catálogo; Owner/Admin/Inventory reciben `cost_usd`; Cashier recibe solo precio de venta.
- Catálogo POST/PATCH: Owner/Admin únicamente; validación Origin/JSON/tamaño; tenant lock y transacción; el audit INSERT está en la misma transacción.
- Conteos: Owner/Admin/Inventory pueden crear/confirmar; la resolución de sucursal exige branch membership activa para Inventory; warehouse mutex y balance locks se mantienen en el orden documentado. Cashier no crea ni confirma conteos.
- Las consultas de warehouse/count history actuales se limitan a Owner/Admin/Inventory. No afirmar que Cashier dispone de una ruta de lectura de balances/ledger, aunque la matriz permita leer existencias/movimientos en su sucursal.
- `resolveTenantContext`, `resolveBranchContext` y `authorization.ts` derivan identidad/scope; los helpers no equivalen por sí mismos a middleware global. Los handlers existentes tienen checks locales y deben auditarse uno por uno.
- Corrección de #208: Inventory puede `catalog.read_costs`; `authorizeBranchOperation` ahora llama `resolveTenantContext(..., true)` antes de branch locks. Tests verifican orden tenant → branch → branch_membership.
- Migraciones 0005/0006/0007 y CI completo validados en PostgreSQL efímero. #207 HEAD `962b5e9d34cc23d7bb5929cd17b4599f4da06db4`, 10/10 check-runs success.

### Límites

- `auth_rate_limits` está en DDL pero no tiene caller runtime; no afirmar que OAuth/bootstrap tenga rate limiting.
- Worker DATABASE_URL principal/ownership/grants efectivos no verificados; no leer secretos ni conectar a Neon.
- Balance↔ledger no tiene todavía enforcement universal para todos los posibles writers.
- Issue #53 abierta/P0; producción NO LISTA. No merge/deploy.

---

# Reconciliación de integración API — 2026-11-04

Este bloque supersede los snapshots de integración fechados 2026-10-30 que aparecen más abajo.

- `main` observado: `7b0f057b8c152515005feed40305143c0ebb94b0`.
- PR #200 permanece abierta/Draft, HEAD `7d2ef3d5e9ced1d4e8d386110129d21eb53af045`; 19/19 check-runs success. La rama añade una vertical de catálogo/inventario y migración 0005; no está integrada en main ni aplicada a Neon.
- Issue #78 está cerrada desde 2026-10-31 después de las verificaciones CORS y bundle frontend. No repetir el antiguo estado “CORS no verificado / issue abierta” como condición vigente; mantener workflows de regresión y reabrir solo con evidencia de regresión.
- Issue #53 continúa abierta. La existencia de helpers de tenant/branch y checks de CI no demuestra que todas las rutas estén protegidas. Revisar autorización server-side, aislamiento cross-tenant/branch, writers y pruebas negativas.
- La migración 0005 se ejecutó en PostgreSQL 18 desechable en CI, no en Neon main. Además, el SQL carece de transacción explícita y el workflow usa psql autocommit; resolver riesgo de aplicación parcial antes de cualquier ejecución remota.
- No se desplegó ni modificó Cloudflare, Neon, secretos o producción.

---

# Estado actual de integración API — Micro app

**GitHub/PR checkpoint — 2026-10-30 UTC:** `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`; PR #178 OPEN, DRAFT, NOT MERGED, rama `docs/reconcile-role-model-and-cloudflare-20261030`. HEAD verificado antes de esta sincronización: `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`, 68 ahead / 0 behind. En ese SHA se observaron 11/11 workflow runs Actions success (9 PR + 2 push) y previews Cloudflare Pages/Workers exitosas. Este commit documental produce un SHA posterior; revalidar antes de cualquier decisión. No extrapolar checks/previews.

**Estado de hosting en main:** PR #177 fusionada; `main` observado en `82386c6e9300e06f8fa209aa52995b939a72442a`. La validación post-merge de #177 observó 9/9 check-runs success y seis contextos requeridos success; ese resultado es histórico y no valida PR #178 ni commits posteriores.

## Límite actual de API
No hay handlers comerciales ni autorización por operación demostrada. La matriz `docs/sdd/role-permission-decision-matrix.md` sigue **NO APROBADA**. La estructura vigente es un único rol por miembro/organización en `organization_members.role`; `branch_memberships` solo asigna acceso a sucursales, no define roles por sucursal. Los resolvers de tenant/branch/turno resuelven contexto/ámbito; no autorizan operaciones. No añadir endpoints, middleware ni role-switches comerciales antes de aprobación explícita. No afirmar ledger/auditoría comercial implementados.

## CORS y Cloudflare
Issue #78 sigue abierta. En `apps/api/src/index.ts`, Hono CORS compara el Origin con `FRONTEND_ORIGIN` validado y declara métodos GET/POST/PATCH/DELETE/OPTIONS, headers Content-Type/Authorization/Idempotency-Key, credenciales y max-age 600. `apps/api/src/index.test.ts` prueba preflight simulado autorizado y origen externo no autorizado; no valida el Worker desplegado.

Inspección autenticada de solo lectura del 2026-10-30: Worker `micro-app-api` Active Deployment en Producción, versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a`, 100% de asignación de tráfico. Pages `micro-app` production branch `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, URL `https://cc23ff0c.micro-app-63i.pages.dev`. La lista visible de variables de Pages estaba vacía; `apps/web/.env.production` versionado define `VITE_API_BASE_URL` y `apps/web/vite.config.ts` lo carga mediante `loadEnv`. La página pública muestra el enlace “Continuar con Google” apuntando a `/auth/google` del Worker. La inspección no pudo leer el bundle JS ni confirmar el valor compilado para las demás llamadas API. No se cambió configuración ni se revelaron valores.

**CORS sigue NO VERIFICADO:** falta ejecutar OPTIONS real con Origin autorizado `https://micro-app-63i.pages.dev` y externo `https://attacker.example`, registrar status y headers `Access-Control-*`. No inferir éxito por versión activa, métricas, CI ni tests. `VITE_API_BASE_URL` sí está definida en `apps/web/.env.production` y `apps/web/vite.config.ts` la carga mediante `loadEnv`; que el panel de Pages no muestre una variable configurada no demuestra que falte en el build. La comprobación pendiente es inspeccionar el bundle JavaScript publicado y confirmar el valor efectivo compilado que usa el frontend para las llamadas API. No declarar integración frontend/API correcta hasta verificarlo.


**Preflight de esta sesión:** se intentaron OPTIONS reales contra `https://micro-app-api.btfcasheb.workers.dev/health` para el origen permitido `https://micro-app-63i.pages.dev` y el externo `https://attacker.example`. Ambos fallaron con curl exit 6 (`Could not resolve host`); no se recibió status ni headers. CORS permanece **NO VERIFICADO**. La preview Worker del SHA padre respondió `status=ok` en GET `/health`, pero no sustituye estos preflight. El bundle JS publicado no se pudo inspeccionar.

## Migraciones y entorno
Main versiona migraciones 0001–0004; no afirmar que 0003/0004 estén aplicadas a Neon `main`. PostgreSQL desechable es el entorno primario de validación. No ejecutar SQL remoto ni tocar datos reales en esta continuidad.

---
> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan por trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


> **Archivo histórico — no usar como estado operativo.** Las notas siguientes se preservan para trazabilidad y pueden contener SHA o límites correspondientes a sesiones anteriores. Usar el checkpoint superior y verificar GitHub en vivo.


> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
## Estado y contrato de autorización por operación (PR #172, 2026-10-30)

La propuesta técnica está en [OPERATION_AUTHORIZATION_ARCHITECTURE.md](sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md). Se mantiene como diseño, no implementación.

- `resolveTenantContext`, `resolveBranchContext` y `resolveOpenCashierRegisterShift` resuelven identidad/membresía/scope contextual; ninguno concede por sí mismo permiso para ejecutar una operación comercial.
- No hay rutas comerciales ni middleware de autorización por operación.
- La matriz `sdd/role-permission-decision-matrix.md` sigue **NO APROBADA**. No implementar un mapa de permisos a partir de roles ni deducir excepciones desde ejemplos.
- Toda futura mutación debe revalidar sesión, usuario, organización, membresía, rol, asignación y recursos dentro de la misma transacción que las escrituras, con protección concurrente adecuada; definir lock order/isolation por invariante.
- Consultas y mutaciones deben aplicar filtros tenant-scoped y branch-scoped en la consulta real; IDs enviados por cliente son selectores no confiables.
- Auditoría de mutaciones, ledger, idempotencia, handlers comerciales y pruebas end-to-end de autorización siguen pendientes. No afirmar que ya existen.
- No crear endpoints, esquema ni migraciones hasta aprobar matriz y contratos de operación. No aplicar migraciones 0003/0004 a Neon main.

El checkpoint anterior `87de879b021cd4b68ce4267b138832279d4a043a` tuvo 12/12 check-runs completed/success. La sincronización documental posterior genera un HEAD nuevo; consultar la PR y validar ese SHA antes de merge.

---

# API and Neon integration status

## Current boundary

The API is a Hono/Cloudflare Workers scaffold. It registers Google OAuth/bootstrap/callback and session routes plus `GET /health`; registration and password login remain fail-closed/disabled. Neon client and transaction helpers are available in `src/database.ts`. No commercial HTTP route currently uses the database helpers. Sales and inventory endpoints must remain unavailable until tenant-scoped authorization and transaction-level integration tests are in place.

Google sign-in uses OAuth state and PKCE, short-lived HttpOnly cookies, a one-time bootstrap path, allowlist/email-verification checks, random opaque session tokens stored only as SHA-256 hashes, revocable seven-day sessions, and exact configured Origin checks for state-changing routes. Legacy PBKDF2 helpers remain in the auth module, but password login and public registration are disabled fail-closed. No application-level rate-limiting implementation was found in the current API source: `auth_rate_limits` exists in the migration but has no runtime caller. Do not describe auth routes as rate-limited. Add a Workers-compatible, distributed abuse-control design for OAuth/bootstrap before expanding access; separately verify whether Cloudflare account-level rules provide any protection. `DATABASE_URL` and `FRONTEND_ORIGIN` must be configured as server-side Worker variables/secrets. The frontend registration/login flow was connected to the auth API in commit `88d30d472905c81a90d9fffc967e3ba1df5084d1`; verify actual route behavior and UI error states before claiming the end-to-end flow is complete. Google email verification is enforced by requiring the verified-email claim from Google's userinfo response. Password recovery, MFA, explicit account-linking/recovery for legacy unlinked users, administrative account recovery, and automated cleanup of expired sessions/rate-limit rows are not implemented; do not treat this as production-ready identity management.

Main versiona 0001–0004: identidad Google (0002), branch scope (0003) y cajas/turnos (0004, PR #167). PR #169 añade `resolveOpenCashierRegisterShift(client, branchContext)`: exige contexto derivado de `resolveTenantContext` + `resolveBranchContext`, rol cashier y revalida org/user/branch/register/membership/assignment activos en SQL. Filtra por org/usuario/sucursal y turno abierto; usa `FOR SHARE OF s` para proteger el cierre mientras el caller mantiene su transacción. El helper sigue aislado, no está conectado a rutas y no autoriza operaciones. CI post-merge valida 0001–0004 en PostgreSQL 18 desechable; esto no demuestra aplicación remota ni sustituye autorización API. Ver [contrato tenant](sdd/tenant-authorization-contract.md) y [implementación branch scope](sdd/BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md).

## Driver choice

The API uses `@neondatabase/serverless` with a request-scoped `Client`. Neon documents that the HTTP `neon()` function is suitable for one-shot queries and fixed batches, while `Client` supports sessions and interactive transactions over WebSockets. Interactive transactions are necessary for operations such as creating a sale, recording payments, decrementing stock and writing the inventory ledger atomically.

Official references:
- [Neon serverless driver: sessions and transactions](https://github.com/neondatabase/serverless#sessions-transactions-and-node-postgres-compatibility)
- [Cloudflare Workers database integrations](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/)

Cloudflare's Hyperdrive is another supported option and is recommended by Cloudflare for pooled PostgreSQL access. It requires a separately configured Hyperdrive binding, so this implementation does not assume that one exists.

## Connection safety

- Supply `DATABASE_URL` only as a server-side Cloudflare Worker secret.
- Never put the URL in `wrangler.toml`, frontend code, committed environment files, logs or API responses.
- Create, connect, use and close a Neon `Client` within one request operation; do not retain it across Worker requests.
- `isDatabaseUrlConfigured` validates URL shape only. It does not prove the host is reachable, credentials work, permissions are correct or the schema is installed.
- The API health route remains a scaffold status endpoint and does not claim that Neon is connected.

## Transaction helper

`withDatabaseTransaction` issues `BEGIN`, runs the supplied operation, and issues `COMMIT`; it attempts `ROLLBACK` when the operation or commit fails. All queries in the operation must use the same client. Do not use this helper for parallel statements or use the HTTP-only query function for interactive transaction workflows.

The helper is not yet called by commercial endpoints. Before enabling it for sales/inventory, add integration tests on a separate Neon branch covering:
1. A successful sale with multiple items and mixed USD/VES payments using a rate snapshot.
2. Rollback when any payment, stock update or ledger insert fails.
3. Concurrent sales against limited stock.
4. Idempotency-key retries without duplicate sales or stock movements.
5. Schema version mismatch, missing credentials and database timeouts.

## Migration gate

Main versiona 0001–0004. PR #167 fusionó 0004 (`registers`/`register_shifts`); 10/10 workflows Actions pasaron en HEAD `ad45911368e9e9a714ebbe014de2d84a7b3cf1de`, incluida la aplicación desde cero y assertions en PostgreSQL 18 efímero. La primera ejecución tuvo una expectativa SQLSTATE incorrecta que se corrigió antes del HEAD final. Las migraciones 0003 y 0004 no se han aplicado a Neon primary `main`; no inferir estado remoto desde Git. PostgreSQL efímero es el entorno primario. Usar Neon branch solo si añade validación adicional, con datos sintéticos, expiración y limpieza. Toda mutación de Neon main sigue sujeta al gate de `docs/CONSTITUTION.md` y aprobación requerida.

## Remaining requirements before commercial API routes

- Real authentication and server-side role checks.
- Tenant/store scoping for every query.
- Database schema version and connectivity checks that do not expose secrets.
- Request validation, rate limiting where appropriate, idempotency semantics and safe error mapping.
- PostgreSQL integration tests, including atomic sale/inventory behavior.
- A deliberate deployment and secret-configuration review.


## Optimización de lecturas frente a transacciones

Para endpoints de consulta (por ejemplo, búsqueda de catálogo/precio), evaluar `neon()` HTTP de `@neondatabase/serverless` para una consulta o batch fijo, en lugar de abrir un `Client` WebSocket por petición. Mantener `Client` interactivo para ventas, pagos, inventario y otras operaciones que requieren atomicidad. El helper actual `withDatabaseClient` crea un `Client` por operación y no debe sustituirse globalmente sin benchmark ni pruebas. Ver [decisiones de arquitectura SaaS](SAAS_ARCHITECTURE_DECISIONS.md) §13.

No usar `ILIKE '%texto%'` asumiendo que el índice B-tree actual lo acelera; probar barcode/SKU exactos y búsqueda de prefijo con `EXPLAIN ANALYZE` sobre datos sintéticos. Añadir trigram/GIN u otros índices solo si se justifican por volumen/latencia medidos.


## Estado actual de identidad y sucursal (post PR #170, 2026-10-30)

Las decisiones D1–D8 de identidad están aprobadas y Google OAuth + allowlist se implementaron en PR #153; HTTPS/canonical origin para Google OAuth se reforzó en PR #155. Las rutas de registro y login por contraseña siguen deshabilitadas fail-closed. PR #165 añadió `branches`, `branch_memberships` y `resolveBranchContext`; PR #169 añadió `resolveOpenCashierRegisterShift` como helper aislado para el turno del cajero. Ninguno está conectado a rutas comerciales ni concede autorización por operación. La matriz de permisos comerciales continúa NO APROBADA. No hay endpoints comerciales. Ver `docs/SAAS_ARCHITECTURE_DECISIONS.md`, `docs/sdd/BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md` y `docs/SCHEMA_REVIEW.md`.


---

## Estado de inventario y PRs — 2026-11-05 UTC

- #200 propone la vertical slice de inventario en HEAD `243592468e9fd61b1f8c578d867887dbb7f18e4d`; no está integrada en main.
- #204 añade aislamiento de fixtures sobre el HEAD #200; su HEAD `57a9f098bcb93427315e96c90e62ae13764a485b` no tiene workflow runs/status contexts recuperados en la comprobación actual.
- #205 añade idempotencia en HEAD `c1f09d09dd08b9600e7a6c0ff8ccbb5be4e9c990`, pero está 9 ahead/1 behind #204 y no tiene validación CI completa acreditada.
- Idempotencia de creación no resuelve el riesgo stale-count: el servicio debe rechazar o reconciliar snapshots antiguos al confirmar un conteo físico.
- No declarar endpoints de inventario disponibles en main ni conectados a Neon producción.


## Precisión del contrato stale-count — 2026-11-05 UTC

La API de #200 ya persiste el saldo esperado al crear un conteo físico y rechaza con HTTP 409 `COUNT_STALE` cuando el saldo actual ha cambiado al confirmar. Hay prueba de integración de dos conteos confirmados fuera de orden. No presentar este caso básico como pendiente de implementación. Antes de añadir otros escritores, evaluar versión monotónica/ABA y hacer cumplir el lock contract de almacén.



## Estado reconciliado de inventario — 2026-11-05 UTC

- #200 HEAD `a40d8378d792197628f70b07be04f92686d55bdb`: 17 ahead/0 behind main, 30 archivos; 10 workflow runs success, incluidos CI y validación PostgreSQL de migraciones. No reviews formales.
- #204 HEAD `e37847c95958c3475f90041263ca4fac7f98c2d1`, base #200 `a40d8378...`: 4 ahead/0 behind. Incluye el cambio atómico de migración. Sin workflow runs/status contexts recuperados en este SHA.
- #205 HEAD `a2fe55847d72b4d9994b781880843ab4906c7b08`, base #204 `e37847c...`: 10 ahead/0 behind. Incluye el último ajuste de #204 y preserva idempotencia. Solo Backup restore smoke test success; no status contexts. Requiere CI completa.
- La migración 0005 tiene transacción explícita y el workflow de migración prueba rollback ante fallo inducido antes de aplicar el SQL real. No se aplicó a Neon.
- Stale-count básico está cubierto por snapshot de cantidad, HTTP 409 y test de confirmación inversa. Riesgo residual ABA/versionado antes de nuevos writers.
- Issue #53 sigue abierta; autorización/aislamiento total no se ha demostrado. La colisión de migración 0005 de roles en #194 sigue pendiente.
- Ninguna PR se fusionó. No tocar producción, Neon, secretos, DNS, billing ni configuración productiva.



## Corrección de evidencia CI y sincronización de ramas — 2026-11-05 UTC

La consulta directa a GitHub Actions por `head_sha` incluye push y pull_request:
- #200 HEAD `a40d8378d792197628f70b07be04f92686d55bdb`: 17/17 workflow runs success (10 PR + 7 push), incluye CI, Playwright y migración PostgreSQL con prueba de rollback inducido.
- #204 HEAD `e37847c95958c3475f90041263ca4fac7f98c2d1`: 7/7 workflow runs success (push), incluye CI, Playwright y migración PostgreSQL.
- #205 HEAD `a2fe55847d72b4d9994b781880843ab4906c7b08`: 8/8 workflow runs success (7 push + 1 PR), incluye CI, Playwright y migración PostgreSQL.
- Relaciones: #200 17 ahead/0 behind main; #204 4 ahead/0 behind #200; #205 10 ahead/0 behind #204. Sin divergencia. No status contexts ni reviews formales/threads en esas PR.
- Todas siguen Draft y ninguna se fusionó. Los cuerpos de PR ya reflejan los SHA y recuentos.
- Migración 0005 con BEGIN/COMMIT y prueba de fallo/rollback inducido en PostgreSQL efímero. No se aplicó a Neon.
- Stale-count básico tiene snapshot, 409 y test de confirmación inversa; revisar ABA/versionado antes de otros writers.
- Issue #53 sigue abierta; la colisión 0005 de roles en #194 sigue pendiente.
