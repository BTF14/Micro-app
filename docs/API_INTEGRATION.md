# Estado actual de integración API — Micro app

**GitHub vivo — 2026-10-30 UTC:** PR #177 fusionada; `main` observado en `82386c6e9300e06f8fa209aa52995b939a72442a`. La validación post-merge de #177 observó 9/9 check-runs success y seis contextos requeridos success. Verificar nuevamente el SHA exacto antes de cualquier cambio.

## Límite actual de API
No hay handlers comerciales ni autorización por operación demostrada. La matriz `docs/sdd/role-permission-decision-matrix.md` sigue **NO APROBADA**. La estructura vigente es un único rol por miembro/organización en `organization_members.role`; `branch_memberships` solo asigna acceso a sucursales, no define roles por sucursal. Los resolvers de tenant/branch/turno resuelven contexto/ámbito; no autorizan operaciones. No añadir endpoints, middleware ni role-switches comerciales antes de aprobación explícita. No afirmar ledger/auditoría comercial implementados.

## CORS y Cloudflare
Issue #78 sigue abierta. En `apps/api/src/index.ts`, Hono CORS compara el Origin con `FRONTEND_ORIGIN` validado y declara métodos GET/POST/PATCH/DELETE/OPTIONS, headers Content-Type/Authorization/Idempotency-Key, credenciales y max-age 600. `apps/api/src/index.test.ts` prueba preflight simulado autorizado y origen externo no autorizado; no valida el Worker desplegado.

Inspección autenticada de solo lectura del 2026-10-30: Worker `micro-app-api` Active Deployment en Producción, versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a`, 100% de asignación de tráfico. Pages `micro-app` production branch `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, URL `https://cc23ff0c.micro-app-63i.pages.dev`. La lista visible de variables de Pages estaba vacía; `apps/web/.env.production` versionado define `VITE_API_BASE_URL` y `apps/web/vite.config.ts` lo carga mediante `loadEnv`. La página pública muestra el enlace “Continuar con Google” apuntando a `/auth/google` del Worker. La inspección no pudo leer el bundle JS ni confirmar el valor compilado para las demás llamadas API. No se cambió configuración ni se revelaron valores.

**CORS sigue NO VERIFICADO:** falta ejecutar OPTIONS real con Origin autorizado `https://micro-app-63i.pages.dev` y externo `https://attacker.example`, registrar status y headers `Access-Control-*`. No inferir éxito por versión activa, métricas, CI ni tests. `VITE_API_BASE_URL` sí está definida en `apps/web/.env.production` y `apps/web/vite.config.ts` la carga mediante `loadEnv`; que el panel de Pages no muestre una variable configurada no demuestra que falte en el build. La comprobación pendiente es inspeccionar el bundle JavaScript publicado y confirmar el valor efectivo compilado que usa el frontend para las llamadas API. No declarar integración frontend/API correcta hasta verificarlo.

## Migraciones y entorno
Main versiona migraciones 0001–0004; no afirmar que 0003/0004 estén aplicadas a Neon `main`. PostgreSQL desechable es el entorno primario de validación. No ejecutar SQL remoto ni tocar datos reales en esta continuidad.

---
> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan por trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


---
> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan para trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


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
