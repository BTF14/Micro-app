# ODD task: listado de sucursales en alcance y panel de inventario de solo lectura

- Status: completed (pendiente de CI exact-SHA y merge)
- Issue / PR: PR abierta desde `feat/branch-list-and-inventory-panel-20261109`
- Owner / reviewer: propietario / revisión técnica
- Started: 2026-11-09
- Risk: medium (nuevo endpoint de solo lectura con alcance tenant/sucursal; sin escrituras)

## Objective and authorization

- Desired outcome: que el frontend pueda descubrir las sucursales a las que el usuario tiene acceso y consultar existencias por almacén usando los endpoints de lectura que ya existen en main. Hasta ahora el cliente no podía obtener un `branchId`, por lo que la lectura de inventario no era utilizable desde la UI.
- Authorization boundary: autonomía técnica del propietario (2026-11-09). Sin escrituras de inventario, sin nuevos permisos, sin migraciones, sin Neon/Cloudflare/secretos/producción.
- Relevant original request: "Audita el repositorio y darle continuidad para terminar proyecto".

## Scope and exclusions

Included:
- `GET /api/orgs/:organizationId/branches` (`apps/api/src/branches.ts`): sucursales activas en alcance; owner/admin ven todas las de la organización, cashier/inventory solo las de `branch_memberships` activas (misma regla que `resolveBranchContext`). Reutiliza la operación existente `inventory.read` (los cuatro roles la poseen); no crea permiso nuevo.
- `InventoryPanel` (web): selector de sucursal/almacén, balances con cantidades exactas (strings numeric → bigint, sin floats), costo solo si la API lo devuelve, estados de carga/vacío/error, paginación por cursor.
- Pruebas: unitarias de guardas, integración PostgreSQL (owner/admin/cashier/inventory, tenant ajeno, sucursal inactiva) y pruebas de componente. Paso añadido a `ci.yml` (CI solo ejecuta las pruebas de integración listadas).

Excluded:
- Escrituras de inventario, conteos desde la UI, movimientos/Kardex en la UI, transferencias, checkout.
- Cambios de esquema, grants o la matriz de permisos.

## Acceptance criteria

- [x] AC-1 — owner/admin reciben todas las sucursales activas y nunca inactivas ni de otro tenant.
- [x] AC-2 — cashier solo recibe sucursales activas asignadas; inventory sin asignación recibe lista vacía.
- [x] AC-3 — otro tenant y petición sin sesión devuelven 401; respuestas con `Cache-Control: private, no-store`.
- [x] AC-4 — la prueba de integración pasa con el rol runtime de mínimo privilegio (`microapp_runtime`), no solo con superusuario.
- [x] AC-5 — el panel renderiza cantidades exactas, muestra costo solo si viene en la respuesta, y maneja sin sucursal / sin almacén / 503 `INVENTORY_READ_NOT_ENABLED`.
- [ ] AC-6 — CI exact-SHA verde en el HEAD final de la PR.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Revelar sucursales fuera de alcance | High | Consulta filtrada por rol/membresía bajo `authorizeTenantOperation` (locks de tenant/sesión); prueba cross-tenant y por rol |
| Neon main sin migraciones 0003–0016 | High | El endpoint falla cerrado con 500 genérico si faltan tablas; la UI muestra el mensaje de la API. No se tocó Neon |
| UI sugiere que el inventario está listo | Medium | Texto declara vista de solo lectura; producción sigue NOT READY |
| Carreras de peticiones al cambiar sucursal/almacén | Low | Contador de secuencia por panel y reinicio síncrono del almacén al cambiar la sucursal |

## Tasks and evidence (entorno local, no CI)

| Task | Validation / evidence | Status |
|---|---|---|
| Typecheck API y web | `tsc --noEmit` sin errores | complete |
| Unit + componente | API 133/133, web 19 pasados (1 skipped preexistente) | complete |
| Integración PostgreSQL | PostgreSQL 16 desechable local, migraciones 0001–0016 aplicadas como `microapp_migrator` con roles idénticos a CI; `branches.integration` 4/4, `inventory-read.integration` 5/5 y `catalog.integration` 8/8 con `DATABASE_URL` = rol runtime. Node local v22 (el repo pide 24): diferencia declarada | complete |

## Technical decisions

- Se usa `authorizeTenantOperation` (no `authorizeBranchOperation`): la ruta no opera sobre una sucursal concreta sino que descubre alcance. Cada ruta por sucursal sigue autorizando en servidor.
- No se añade `lockBranchScopes`: es una lectura de descubrimiento sin escritura posterior; los locks de tenant/sesión/membresía de `resolveTenantContext` serializan revocaciones. Una vista obsoleta tras la respuesta no concede acceso porque cada ruta posterior revalida.
- Límite de 100 sucursales por respuesta.

## Closure and handoff

- Final commit SHA: ver HEAD vivo de la PR.
- Checks and exact outcomes: pendientes en el SHA final.
- Limitations not verified: ejecución en Node 24; comportamiento contra Neon (no tocado); accesibilidad con lector de pantalla.
- Residual risks: las sucursales siguen sin gestión por API/UI (alta/baja de sucursales y asignaciones); la UI de movimientos/conteos queda para el siguiente bloque.
- Next step: panel de movimientos (`/inventory/movements`) y conteos; luego revisar #287 cuando cierren los gates P1.
