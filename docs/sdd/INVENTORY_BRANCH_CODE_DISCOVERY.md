# Discovery de implementación: inventario por sucursal

- Estado: T3 completada para el snapshot exacto de main 7ff887328f25cffff69ccb9e89bbb1ba25200aea; sin cambios funcionales
- Rama: `pilot/speckit-inventory`
- Commit base de discovery: `b256c1c3e51a145e5af62fbcbdfb830a4368884c`
- Base común con main: `88213507d088b82ea9231bbc72f49afade7ec99b`
- Fecha: 2026-11-01
- Objetivo: identificar el estado real de esquema, rutas, módulos y pruebas relacionados con stock, ventas, compras, movimientos y sucursales.

## 1. Método y alcance

Se consultó el árbol Git recursivo del commit de la rama piloto. GitHub devolvió `truncated: false` y 169 rutas versionadas. Se identificaron y revisaron los archivos de migraciones, API, contexto de tenant/sucursal, turnos de caja, pruebas API y aplicación web relevantes para inventario.

La revisión es estática sobre archivos versionados. No se ejecutó el proyecto, no se ejecutaron búsquedas locales con ripgrep, no se probaron endpoints contra una base real y no se verificó el estado remoto de Neon. Por tanto, las conclusiones describen el código de este snapshot, no el estado de datos desplegados.

## 2. Hallazgo principal

**No hay flujo operativo de inventario por sucursal en el código inspeccionado.**

La API registra rutas de autenticación y Google Auth, además de `GET /health`; no registra rutas comerciales de productos, ventas, compras, recepciones, movimientos ni saldos. La interfaz web inspeccionada tampoco contiene flujo de inventario operativo.

El esquema inicial sí anticipa ventas y movimientos, pero el campo de stock es organizacional y no hay tablas de almacenes ni balances por almacén.

## 3. Evidencia por área

### 3.1 Esquema inicial

Archivo: `apps/api/migrations/0001_initial.sql`

- Líneas 72-99: tabla `products`; `stock_quantity numeric(14,3)` es una columna del producto, con restricción no negativa e índice de alertas por organización.
- Líneas 115-143: tabla `sales` con estado, clave idempotente, snapshots monetarios y creador.
- Líneas 145-163: `sale_items` conserva producto y cantidad, pero no almacén ni sucursal.
- Líneas 185-203: `inventory_movements` registra organización, producto, tipo, delta, coste, motivo, referencia libre y actor. No contiene `branch_id` ni `warehouse_id`.
- No aparecen tablas `warehouses` o `inventory_balances` en esta migración.

Tipos de movimiento permitidos: `opening`, `purchase`, `sale`, `return`, `adjustment`, `void_reversal`. La referencia de origen es `reference_type/reference_id`, sin FK tipada al documento de origen en este esquema.

### 3.2 Sucursales y membresías

Archivo: `apps/api/migrations/0003_branch_scope.sql`

- Líneas 5-18: `branches`, con `organization_id`, nombre, slug y estado activo.
- Líneas 20-38: `branch_memberships`, con clave compuesta por organización, sucursal y usuario, más FKs compuestas.
- La asignación de sucursal no crea un rol nuevo; el rol sigue en `organization_members`.

Archivo: `apps/api/src/branch-context.ts`

- Líneas 19-27: declara los roles organizacionales y documenta que Owner/Admin tienen alcance organizacional de sucursales; Cashier/Inventory requieren membresía activa.
- Líneas 27-88: resuelve el contexto de sucursal. Es una utilidad de contexto/autorización, no un servicio de inventario.

Pruebas:
- `apps/api/src/branch-context.test.ts`: prueba resolución de sucursal y membresía activa.
- `apps/api/src/branch-context.integration.test.ts`: prueba aislamiento organizacional, roles, sucursal inactiva y membresía.

Estas pruebas no prueban lectura/escritura de saldos ni movimientos de inventario.

### 3.3 Caja

Archivo: `apps/api/migrations/0004_register_shifts.sql`

- Líneas 5-25: registros/cajas asociados a organización y sucursal.
- Líneas 27-72: turnos vinculados a caja, sucursal y membresía de cajero.
- Líneas 81-207 y 213-311: triggers de apertura, ciclo de vida y protección de alcance.
- La migración implementa invariantes de caja/turnos; no añade almacenes ni existencias.

Archivos:
- `apps/api/src/cashier-open-shift.ts`: lectura del turno abierto del cajero.
- `apps/api/src/register-shifts.integration.test.ts`: pruebas de límites tenant, sucursal, rol y ciclo de vida del turno.

No debe inferirse de la existencia de sucursales/cajas que el inventario esté segmentado por sucursal.

### 3.4 API y transacciones

Archivo: `apps/api/src/index.ts`

- Registra `registerAuthRoutes` y `registerGoogleAuthRoutes`.
- Registra `GET /health`.
- No registra rutas comerciales de productos, ventas, compras o inventario en este snapshot.

Archivo: `apps/api/src/database.ts`

- Líneas 58-82: `withDatabaseTransaction` proporciona BEGIN/COMMIT/ROLLBACK genérico.
- El comentario menciona venta, pagos, cambios de stock y ledger como ejemplos de operaciones que deberían ser atómicas; esto no demuestra que esas operaciones ya existan.
- `apps/api/src/database.test.ts` prueba el wrapper transaccional genérico, no un flujo real de inventario.

### 3.5 Frontend y pruebas

- `apps/web/src/App.tsx` y `apps/web/src/App.test.tsx` no muestran un flujo de inventario por sucursal en el snapshot revisado.
- Las pruebas API existentes relevantes cubren autenticación, contexto tenant/sucursal, turnos de caja y wrapper de base de datos.
- No se identificó una suite de integración de stock, recepción, compra, venta con descuento de stock, ajuste, transferencia, idempotencia de movimientos o reconciliación.

## 4. Inventario de callsites y estado

| Área / símbolo | Ubicación observada | Estado |
|---|---|---|
| `products.stock_quantity` | `apps/api/migrations/0001_initial.sql:84` | Columna organizacional en esquema; no se encontró servicio API que la lea/escriba |
| Índice de alerta de stock | `apps/api/migrations/0001_initial.sql:98` | Índice por organización |
| `inventory_movements` | `apps/api/migrations/0001_initial.sql:185-203` | Ledger inicial organizacional; sin sucursal/almacén |
| `sales` / `sale_items` | `apps/api/migrations/0001_initial.sql:115-163` | Modelo de datos; sin almacén de venta |
| Tipos `purchase/sale/return/adjustment` | `apps/api/migrations/0001_initial.sql:189` | Valores de esquema; no equivalen a operaciones implementadas |
| `branches` / `branch_memberships` | `apps/api/migrations/0003_branch_scope.sql:5-38` | Esquema y contexto de acceso implementados en el código |
| Contexto de sucursal | `apps/api/src/branch-context.ts:27-88` | Helper implementado; no es autorización de inventario completa |
| Turnos de caja | `apps/api/migrations/0004_register_shifts.sql`, `cashier-open-shift.ts` | Funcionalidad de caja/sucursal separada del inventario |
| Transacción genérica | `apps/api/src/database.ts:58-82` | Infraestructura reutilizable; no implementa mutaciones de stock |

## 5. Implicaciones para el diseño

1. El primer diseño de inventario por sucursal debe crear la capa de almacenes y balances; no puede limitarse a añadir un filtro `branch_id` a un endpoint de inventario existente.
2. `products.stock_quantity` es el legado organizacional que requiere estrategia explícita de backfill y reconciliación.
3. `inventory_movements` ya contiene historia potencialmente útil, pero no asigna movimientos históricos a sucursales/almacenes. No se debe inventar esa asignación durante el backfill.
4. `sale_items` no identifica almacén; el almacén de consumo de venta es una decisión de producto/contrato pendiente.
5. El helper de contexto de sucursal puede reutilizarse como una pieza de resolución de alcance, pero las operaciones de inventario necesitan autorización específica server-side y FKs/constraints tenant-scoped.
6. La transacción genérica permite envolver operaciones futuras; las garantías de no-stock-negativo, concurrencia e idempotencia deben implementarse y probarse en las operaciones concretas.
7. No crear endpoints o migraciones hasta resolver las decisiones abiertas de la spec y aprobar el diseño.

## 6. Decisiones que siguen abiertas

- Cómo asignar el stock organizacional actual a uno o varios almacenes sin falsear el historial.
- Cómo tratar movimientos históricos sin sucursal/almacén.
- Qué almacén consume cada venta y cómo se captura esa selección.
- Si las compras/recepciones serán documentos independientes o parte de un módulo común de operaciones.
- Valoración de inventario y snapshot de coste por movimiento.
- Semántica de transferencias, tránsito, cancelación y reversos.
- Reservas y disponibilidad, si forman parte de la primera versión.

## 7. Conclusión y límites

El discovery confirma que el modelo actual tiene catálogo, ventas, movimientos y sucursales como piezas de esquema separadas, pero no una implementación funcional que conecte esas piezas para operar inventario por sucursal. Esta es la línea base de diseño para el siguiente paso.

**No se ejecutaron pruebas, no se aplicaron migraciones, no se modificó Neon, no se alteró producción y no se implementó código funcional.** Las conclusiones aplican al commit indicado y deben revalidarse si cambia el código base antes de iniciar implementación.


## 8. Revalidación dirigida del código actual de main — 2026-11-02

**Snapshot de código:** `main` = `7ff887328f25cffff69ccb9e89bbb1ba25200aea` (HEAD verificado en GitHub). Esta revalidación se limita a los archivos listados abajo; no sustituye un barrido exhaustivo de todos los callsites ni una ejecución runtime. El piloto sigue en `87049399ec458406b6d7c481d928c9b7cdc3569` y no se sincronizó con `main`.

| Archivo en main | Blob SHA observado | Evidencia / conclusión |
|---|---|---|
| `apps/api/src/index.ts` | `ec6f8cea532e2018fee75400842967094af273ca` | Registra rutas de autenticación, Google Auth y `GET /health`; no registra rutas de catálogo, ventas, compras ni inventario. |
| `apps/api/src/branch-context.ts` | `89734a636c5d2ef311c1f9918e192796c4badd81` | `resolveBranchContext` valida contexto y asignación activa; el propio comentario aclara que resuelve alcance, no autoriza una operación comercial. |
| `apps/api/migrations/0001_initial.sql` | `a8ecae7dac2e232465329341e943348e267dd628` | `products.stock_quantity` es `numeric(14,3)` organizacional. `inventory_movements` no contiene `branch_id` ni `warehouse_id`; usa referencia libre `reference_type/reference_id`. |
| `apps/api/migrations/0003_branch_scope.sql` | `cebc4e2874b30b9e846433ab21202ed2929b6faa` | Crea `branches` y `branch_memberships` con FKs tenant-scoped; no crea almacenes ni balances. |
| `apps/api/migrations/0004_register_shifts.sql` | `c1d89831c18cb0d0afa1363ee9305f1e1b3bebfb` | Crea cajas y turnos vinculados a sucursal; no implementa inventario. |
| `docs/sdd/role-permission-decision-matrix.md` | consultado en `main` | Estado APROBADA (2026-10-31); permisos de inventario distinguen alcance organizacional de Owner/Admin y alcance de sucursales asignadas para Inventory/Cashier. |

**Conclusión limitada y verificable:** en el snapshot de `main` indicado, el handler HTTP principal no registra endpoints de inventario ni catálogo; el esquema versionado mantiene stock organizacional y movimientos sin almacén; 0003/0004 cubren sucursales y caja, no inventario por almacén. Esto confirma que el inventario por sucursal no está implementado en ese snapshot. No se inspeccionó Neon `main`, no se verificó despliegue/producción, y no se ejecutaron pruebas.

**Límites adicionales:** GitHub code search devolvió resultados anclados a un snapshot anterior (`705d3db...`), por lo que no se utilizó como evidencia de ausencia de callsites en `c7bd0a...`. Tampoco se hizo un `git grep` exhaustivo sobre el árbol completo de `c7bd0a...`; por ello el requisito de inventario exhaustivo de todos los callsites sigue abierto. La PR #190 está abierta como Draft y no fusionada; su alcance es lectura de catálogo, no inventario por sucursal, y no forma parte del código de `main` en el SHA inspeccionado.

**Estado de T3:** parcial, no cerrada. El snapshot anterior `b256c1c...` y esta revalidación dirigida aportan evidencia útil, pero la aceptación que exige enumerar todos los callsites/consumidores de `stock_quantity`, `inventory_movements`, ventas, compras y pruebas aún requiere un barrido reproducible completo sobre un SHA acordado.


## 9. Barrido reproducible de callsites en main — T3 completada para este SHA

**Snapshot exacto:** main = 7ff887328f25cffff69ccb9e89bbb1ba25200aea (merge PR #191).
**Árbol Git:** dd4c696ace8a931b363d1642036f7893ebdc7fc4; GitHub devolvió truncated: false, 194 entradas.
**Método:** enumeración del árbol recursivo y lectura por SHA exacto de todos los archivos de código fuente TypeScript/TSX de API y web, los ocho SQL de migraciones/assertions, pruebas E2E/configuración y scripts Python versionados relevantes. Se buscaron referencias a stock_quantity, inventory_movements, sales, sale_items, purchase, warehouse, stock y rutas/API; los resultados se contrastaron con las declaraciones SQL y los routers. No se usó GitHub Code Search como evidencia porque devolvía resultados anclados a un snapshot antiguo.

### 9.1 Resultado por símbolos/callsites

| Símbolo / flujo | Resultado del barrido en el SHA |
|---|---|
| products.stock_quantity | Solo definición/constraint/índice en apps/api/migrations/0001_initial.sql:84,98; ningún lector/escritor runtime en API o web. |
| inventory_movements | Solo definición, tipos, índices y assertions en apps/api/migrations/0001_initial.sql:185-203 y 0001_initial.assertions.sql:87-90; ningún insert/select/update runtime. |
| sales / sale_items | Definiciones y assertions en 0001_initial.sql:115-163 y 0001_initial.assertions.sql:43-77; no hay servicio, ruta, UI ni suite de flujo comercial. |
| Compras / recepciones | No se encontraron tablas, servicios, rutas, UI ni pruebas de compras/recepciones. purchase es solo un valor permitido por el CHECK de movimientos. |
| Almacenes / balances | No se encontraron tablas warehouses o inventory_balances, ni warehouse_id en el esquema actual de inventario. |
| Contexto de tenant | resolveTenantContext está implementado; no hay rutas comerciales que lo consuman. |
| Contexto de sucursal | resolveBranchContext está implementado; pruebas unitarias/integración cubren asignación y rol, pero no hay callsite en un handler HTTP comercial. |
| Turno abierto | La consulta/helper de turno abierto se usa en su suite de caja; no implementa ni consume stock. |
| Transacción genérica | withDatabaseTransaction y sus tests prueban el wrapper; no hay mutación de stock/ledger conectada a él. |
| Frontend / E2E | App, auth y pruebas E2E inspeccionadas; no se encontraron pantallas, llamadas API ni tests E2E de catálogo comercial, venta, compra o inventario. |

### 9.2 Evidencia estructural adicional

- apps/api/src/index.ts (blob ec6f8cea532e2018fee75400842967094af273ca, 88 líneas): registra autenticación, Google Auth y GET /health; no registra rutas comerciales.
- apps/api/migrations/0001_initial.sql (blob a8ecae7dac2e232465329341e943348e267dd628): stock organizacional; ventas/ítems y movimientos son solo esquema.
- apps/api/migrations/0003_branch_scope.sql (blob cebc4e2874b30b9e846433ab21202ed2929b6faa): sucursales/membresías tenant-scoped, sin inventario.
- apps/api/migrations/0004_register_shifts.sql (blob c1d89831c18cb0d0afa1363ee9305f1e1b3bebfb): caja/turnos asociados a sucursal, no almacenes ni existencias.
- apps/api/src/branch-context.ts (blob 89734a636c5d2ef311c1f9918e192796c4badd81): helper de resolución de alcance; no autoriza una operación comercial.
- apps/api/src/database.ts: transacción genérica sin callsite de inventario.

### 9.3 Clasificación y límites

- Runtime: cero callsites operativos encontrados para stock, movimientos, ventas o compras; no hay rutas comerciales registradas.
- Schema/assertions: existen definiciones y comprobaciones estructurales tenant-scoped para catálogo/ventas/movimientos; no son operaciones de negocio.
- Tests: las referencias a rol inventory prueban contexto de sucursal o permisos de caja; no prueban stock, recepción, ajuste, transferencia, venta con descuento, idempotencia de inventario ni reconciliación.
- Docs: nombres de entidades/operaciones aparecen en propuestas y comentarios, no demuestran implementación.
- Producción/Neon: no se consultaron ni modificaron; este resultado no certifica rutas desplegadas ni estado de datos.
- Cambio posterior de main: cualquier nuevo SHA requiere repetir el barrido antes de implementar.

**Cierre T3:** la aceptación de inventario reproducible de callsites queda satisfecha para el SHA exacto indicado. T3 puede marcarse completada como discovery estático del repositorio versionado; no significa que inventario esté implementado ni que se hayan ejecutado pruebas. No se ejecutó runtime, tests, Spec Kit ni migraciones.
