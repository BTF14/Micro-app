# ODD task: listado de sucursales en alcance y panel de inventario de solo lectura

- Status: completed (CI exact-SHA verified; independent review and merge pending)
- Issue / PR: PR #301 from `feat/branch-list-and-inventory-panel-20261109`
- Owner / reviewer: propietario / revisión técnica
- Started: 2026-11-09
- Risk: medium (nuevo endpoint de solo lectura con alcance tenant/sucursal; sin escrituras)

## Objective and authorization

- Desired outcome: que el frontend pueda descubrir las sucursales a las que el usuario tiene acceso y consultar existencias por almacén usando los endpoints de lectura que ya existen en main. Hasta ahora el cliente no podía obtener un `branchId`, por lo que la lectura de inventario no era utilizable desde la UI.
- Authorization boundary: autonomía técnica del propietario (2026-11-09). Sin escrituras de inventario, sin nuevos permisos, sin migraciones, sin Neon/Cloudflare/secretos/producción.
- Relevant original request: "Audita el repositorio y darle continuidad para terminar proyecto".

## Scope and exclusions

Included:
- `GET /api/orgs/:organizationId/branches` (`apps/api/src/branches.ts`): sucursales activas en alcance; owner/admin reciben hasta 100 sucursales activas de la organización; cashier/inventory solo las asignadas mediante `branch_memberships` activas. Reutiliza `inventory.read`; no crea permiso nuevo.
- `InventoryPanel` (web): selector de sucursal/almacén, balances con cantidades exactas (strings numeric → bigint, sin floats), costo solo si la API lo devuelve, estados de carga/vacío/error, paginación por cursor de productos.
- Pruebas: unitarias de guardas, integración PostgreSQL (owner/admin/cashier/inventory, tenant ajeno, sucursal inactiva) y pruebas de componente. CI ejecuta las pruebas de integración explícitamente.

Excluded:
- Escrituras de inventario, conteos desde la UI, movimientos/Kardex en la UI, transferencias, checkout.
- Cambios de esquema, grants o la matriz de permisos.

## Acceptance criteria

- [x] AC-1 — owner/admin reciben sucursales activas dentro del límite explícito de 100; nunca inactivas ni de otro tenant.
- [x] AC-2 — cashier solo recibe sucursales activas asignadas; inventory sin asignación recibe lista vacía.
- [x] AC-3 — otro tenant y petición sin sesión devuelven 401; respuestas con `Cache-Control: private, no-store`.
- [x] AC-4 — la integración PostgreSQL se ejecuta tanto con conexión administrativa para fixtures como con el rol runtime `microapp_runtime` para atender la API.
- [x] AC-5 — el panel renderiza cantidades exactas, muestra costo solo si viene en la respuesta, y maneja sin sucursal / sin almacén / 503 `INVENTORY_READ_NOT_ENABLED`.
- [x] AC-6 — CI exact-SHA verde en el HEAD final `99ec165cc6edd239405f481bcc864a582bfaf61e`.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Revelar sucursales fuera de alcance | High | Consulta filtrada por rol/membresía bajo `authorizeTenantOperation`; pruebas cross-tenant y por rol; cada ruta branch-scoped vuelve a autorizar en servidor |
| Neon main sin migraciones 0003–0016 | High | La lectura de inventario falla cerrada si faltan tablas/helpers/grants; no se tocó Neon |
| UI sugiere que el inventario está listo | Medium | Texto declara vista de solo lectura; producción sigue NOT READY |
| Carreras de peticiones al cambiar sucursal/almacén | Low | Contador de secuencia por panel y reinicio del almacén al cambiar sucursal |
| Más de 100 sucursales activas en una organización | Medium | El endpoint aplica `LIMIT 100` y aún no expone cursor/paginación para sucursales; la UI no puede seleccionar las restantes. No afecta el piloto de un local, pero requiere paginación antes de afirmar soporte completo para organizaciones con más de 100 sucursales |

## Tasks and evidence

| Task | Validation / evidence | Status |
|---|---|---|
| Typecheck API y web | Evidencia local registrada por la implementación; Node local v22 (el repo pide 24) | complete |
| Unit + componente | API 133/133, web 19 pasados (1 skipped preexistente), según evidencia local de implementación | complete |
| Integración PostgreSQL | PostgreSQL local desechable: branches 4/4, inventory-read 5/5, catalog 8/8; CI exact-HEAD vuelve a validar la ruta bajo runtime | complete |
| CI exact-HEAD | SHA `99ec165cc6edd239405f481bcc864a582bfaf61e`: **10/10 workflow runs pull_request SUCCESS y 15/15 check-runs SUCCESS**. CI run `42795860898`: pasos "PostgreSQL branch list integration tests" y "Runtime-role API integration tests" SUCCESS. Los otros tres workflows push se mantienen separados del contador PR | complete |

## Technical decisions

- Se usa `authorizeTenantOperation` (no `authorizeBranchOperation`): la ruta descubre el alcance del tenant y no opera sobre una sucursal concreta. Cada ruta posterior por sucursal sigue autorizando en servidor.
- No se añade `lockBranchScopes`: es una lectura de descubrimiento; una lista obsoleta no concede acceso porque cada ruta branch-scoped revalida identidad, sucursal y membresía en servidor.
- Límite de 100 sucursales por respuesta; sin cursor actualmente. No describir el endpoint como exhaustivo por encima de ese límite.

## Closure and handoff

- Final commit SHA: `99ec165cc6edd239405f481bcc864a582bfaf61e`.
- Checks: 10/10 PR workflows SUCCESS; 15/15 check-runs SUCCESS en el SHA exacto.
- No hay reviews formales ni review threads en la consulta actual. PR #301 permanece OPEN, no fusionada y no aprobada.
- Limitations not verified: ejecución local en Node 24; comportamiento contra Neon (no tocado); accesibilidad con lector de pantalla.
- Residual risks: sucursales y asignaciones siguen sin gestión por API/UI; branch discovery requiere paginación si el negocio supera 100 sucursales; movimientos/Kardex y conteos siguen sin UI.
- Next step: revisión independiente; luego priorizar el siguiente bloque P0 de caja/ventas y seguridad, no ampliar inventario a escrituras sin completar contratos y gates.
