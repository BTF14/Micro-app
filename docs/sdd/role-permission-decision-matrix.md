# Matriz de decisión de permisos comerciales — APROBADA

**Estado: APROBADA (2026-10-31).** El propietario definió explícitamente las decisiones de ventas, devoluciones y gestión de miembros, y delegó explícitamente en la IA ("elige la mejor opción o inspírate en las demás SaaS parecidas... hacerlo con criterio y fundamentos") el resto de las celdas, con el mandato de aplicar criterio técnico fundamentado. Esta matriz documenta ambas fuentes por separado para trazabilidad. **Sigue sin existir ningún endpoint comercial ni middleware de autorización en el código** — esta aprobación habilita, pero no sustituye, su implementación, revisión y pruebas de aislamiento cross-tenant antes de considerarse completa (issue #53 permanece abierta hasta entonces).

## Decisión estructural ya fijada
- Cada miembro tiene **un único rol por organización**, guardado en `organization_members.role`: `owner`, `admin`, `cashier` o `inventory`.
- El rol aplica a toda la organización; no hay roles distintos por sucursal.
- `branch_memberships` solo concede/revoca acceso a sucursales; no contiene roles.
- Cambiar el rol organizacional afecta a toda la organización. Revocar una asignación de sucursal no cambia el rol ni otras asignaciones.
- La asignación a una sucursal no es autorización para ejecutar operaciones: toda operación comercial debe validar rol **y** (cuando aplique) membresía de sucursal activa en el servidor.

Fuentes canónicas: `docs/SAAS_ARCHITECTURE_DECISIONS.md` §§3 y 14; `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`; migración `apps/api/migrations/0003_branch_scope.sql`.

## Convenciones de la tabla
- **Alcance:** `org` = toda la organización; `sucursal` = limitado a las sucursales donde el miembro tiene `branch_memberships` activa; `propio` = limitado al recurso creado/abierto por el propio miembro (p. ej. su turno de caja).
- **Auditoría:** toda operación de escritura marcada aquí debe quedar registrada en el log de auditoría (Nivel 2, punto 7 de `docs/SECURITY_ROADMAP.md`) con quién/qué/cuándo/organización/sucursal antes de exponerse en producción.
- **Revocación:** al desactivar un miembro o revocar su `branch_memberships`, sus sesiones activas deben perder la autorización en la siguiente solicitud (denegar por defecto), sin requerir que el usuario cierre sesión manualmente.

## 1. Catálogo (precios/costos) e inventario (existencias, recepción, ajuste, transferencia)
**Fuente: criterio técnico delegado por el propietario.** Razonamiento: separar "quién fija precio/costo" (decisión financiera, debe quedar en manos de quien responde por el negocio) de "quién mueve stock físico" (operación logística diaria) es el patrón estándar en POS/inventario SaaS (Square, Lightspeed, Odoo): minimiza el riesgo de que un error o fraude de inventario también altere márgenes, y viceversa.

| Operación | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Leer catálogo/precios/costos | ✅ org | ✅ org | ✅ org | ✅ org (sin costo, solo precio de venta) |
| Crear/editar/eliminar productos, precios, costos | ✅ org | ✅ org | ❌ | ❌ |
| Leer existencias y movimientos | ✅ org | ✅ org | ✅ sucursal | ✅ sucursal |
| Recepción de inventario (entrada) | ✅ org | ✅ org | ✅ sucursal | ❌ |
| Ajuste de inventario (mermas, conteos) | ✅ org | ✅ org | ✅ sucursal, con motivo obligatorio y auditado | ❌ |
| Transferencia entre sucursales | ✅ org | ✅ org | ✅ sucursal origen/destino, ambas con membresía activa | ❌ |

Nota: el costo de producto se considera dato financiero sensible; Cashier ve precio de venta pero no costo, para no exponer margen en el punto de venta.

## 2. Apertura y cierre de caja; operaciones durante un turno abierto
**Fuente: criterio técnico delegado por el propietario**, consistente con la decisión de arquitectura ya fijada y con trigger defensivo en la migración 0004 (`docs/sdd/REGISTER_SHIFT_MODEL.md` §2 y §4): *"En la política base, `closed_by_user_id` debe ser el mismo cajero responsable. No se habilita cierre por supervisor"*; *"Los turnos cerrados son históricos; no se reabren ni se sobrescriben"* (bloqueado en PostgreSQL por trigger, no solo por convención de permisos).

**Corrección 2026-10-31:** una versión anterior de esta tabla otorgaba a Owner/Admin la facultad de "cerrar/reabrir el turno de otro miembro", lo cual contradecía directamente esa decisión ya fijada (y, para "reabrir", es además técnicamente imposible: la migración 0004 bloquea con un trigger cualquier `UPDATE`/`DELETE` sobre un turno ya cerrado). Se corrige aquí.

| Operación | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Abrir turno propio | ✅ sucursal | ✅ sucursal | ❌ | ✅ sucursal |
| Cerrar turno propio (ordinario, `closed_by_user_id` = el propio cajero) | ✅ propio | ✅ propio | ❌ | ✅ propio |
| Operar ventas/cobros durante turno propio abierto | ✅ propio | ✅ propio | ❌ | ✅ propio |
| Leer turnos (propios y ajenos) | ✅ org | ✅ org | ❌ | ✅ propio únicamente |
| Cerrar el turno abierto de otro miembro (cierre por supervisor) | ❌ **no implementado en esta fase** | ❌ **no implementado en esta fase** | ❌ | ❌ |
| Reabrir o modificar un turno ya cerrado | ❌ **bloqueado a nivel de base de datos** (trigger de 0004) para todos los roles, incluido Owner | ❌ | ❌ | ❌ |

**Nadie —ni Owner ni Admin— puede cerrar el turno abierto de otro cajero ni reabrir uno ya cerrado en el modelo base.** Un cajero que no puede cerrar su propio turno (p. ej. se fue sin cerrar caja) requiere una vía de corrección separada, explícitamente fuera del alcance de esta matriz: `docs/sdd/REGISTER_SHIFT_MODEL.md` dice literalmente *"cualquier excepción futura requiere permiso separado, motivo y auditoría aprobados"*. No implementar ese flujo de excepción hasta que el propietario lo apruebe específicamente, con su propio diseño de permiso, motivo obligatorio y registro de auditoría — no asumirlo incluido en la aprobación general de esta matriz.

## 3. Ventas: creación, descuentos, cambios de precio en el momento de la venta
**Fuente: decisión explícita del propietario (2026-10-31):** *"Cashier/Admin/Owner crean ventas; cualquier descuento requiere aprobación de Admin/Owner."*

| Operación | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Crear venta a precio de lista, turno propio abierto | ✅ propio | ✅ propio | ❌ | ✅ propio |
| Aplicar descuento (cualquier monto/porcentaje) | ✅ | ✅ | ❌ | ❌ directo — requiere aprobación de Admin/Owner en el momento (ver abajo) |
| Aprobar un descuento solicitado por Cashier | ✅ | ✅ | ❌ | ❌ |
| Cambiar precio unitario en la venta (fuera de lista) | ✅ | ✅ | ❌ | ❌ — mismo flujo de aprobación que descuento |

Implementación futura esperada: la aprobación de Admin/Owner debe quedar registrada contra la venta (quién aprobó, cuándo) antes de confirmar el descuento; no basta con una autorización verbal fuera del sistema.

## 4. Devoluciones, anulaciones de venta y reversos
**Fuente: decisión explícita del propietario (2026-10-31):** *"Cashier puede anular durante el mismo turno abierto; después del cierre solo Admin/Owner."*

| Operación | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Anular venta propia, mismo turno aún abierto | ✅ | ✅ | ❌ | ✅ propio |
| Anular/devolver venta de un turno ya cerrado | ✅ org | ✅ org | ❌ | ❌ |
| Anular/devolver venta de otro miembro (turno abierto o cerrado) | ✅ org | ✅ org | ❌ | ❌ |

## 5. Gestión de miembros (invitar, desactivar, cambiar rol, asignar sucursal) y configuración de políticas comerciales
**Fuente: decisión explícita del propietario (2026-10-31):** *"Solo Owner gestiona miembros y políticas; Admin solo opera el negocio."*

| Operación | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Invitar/desactivar miembros, cambiar rol | ✅ org | ❌ | ❌ | ❌ |
| Asignar/revocar membresía de sucursal | ✅ org | ❌ | ❌ | ❌ |
| Configurar políticas comerciales de la organización (p. ej. límites, umbrales futuros) | ✅ org | ❌ | ❌ | ❌ |
| Ejecutar una excepción puntual ya cubierta en otra sección (p. ej. aprobar descuento) | ✅ | ✅ (ver sección 3, ya autorizado ahí) | ❌ | ❌ |

Nota: esta decisión es más restrictiva que la propuesta original de "Owner y Admin gestionan por igual"; Admin queda limitado a operar el negocio (ventas, inventario, aprobaciones del día a día) sin tocar personal ni configuración de la organización.

## 6. Reportes, exportaciones y acceso a auditoría
**Fuente: criterio técnico delegado por el propietario**, por analogía directa con el acceso a datos que cada rol ya tiene en las secciones anteriores (un rol no debería poder *reportar* sobre datos que no puede *operar*).

| Operación | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Reportes de ventas/caja, org completa | ✅ | ✅ | ❌ | ❌ |
| Reportes de ventas/caja, turno propio | ✅ | ✅ | ❌ | ✅ |
| Reportes de inventario/stock | ✅ org | ✅ org | ✅ sucursal | ❌ |
| Exportaciones (CSV/PDF) de lo que puede leer | ✅ | ✅ | ✅ (solo inventario) | ✅ (solo su turno) |
| Acceso al log de auditoría (quién hizo qué) | ✅ org | ✅ org | ❌ | ❌ |

## Límites que se mantienen vigentes
- No crear endpoints comerciales, middleware de autorización ni mapeos rol→operación sin pruebas automatizadas de aislamiento cross-tenant (organización A nunca ve/escribe datos de organización B, ni manipulando IDs) y de aislamiento de rol (un rol nunca ejecuta una operación fuera de esta tabla), antes de fusionar a `main`.
- No convertir `branch_memberships` en una tabla de roles por sucursal.
- Caja conserva modelo de turnos y apertura/cierre ordinario; no introducir cierres de supervisor incompatibles sin una decisión aparte.
- Inventario por sucursal/almacén no está implementado como stock separado; el stock actual sigue siendo organizacional. La columna "alcance sucursal" de Inventory en esta tabla se refiere a *quién puede operar*, no a que el stock ya esté particionado por sucursal.
- Toda autorización debe implementarse y validarse en el servidor (Hono/Workers), nunca confiar en que el frontend oculte una acción.
- Cualquier cambio a esta matriz después de esta aprobación requiere de nuevo una decisión explícita del propietario (puede delegarse de nuevo con el mismo criterio, pero debe registrarse aquí igual que esta aprobación).

## Aprobación
**Estado: APROBADA el 2026-10-31.** El propietario aprobó explícitamente las secciones 3, 4 y 5 en esta fecha y delegó explícitamente en la IA, con criterio técnico fundamentado, las secciones 1, 2 y 6. Esta aprobación habilita el diseño y la implementación de endpoints comerciales siguiendo exactamente esta tabla; no exime de completar `docs/sdd/TENANT_ISOLATION_TEST_PLAN.md` ni de las pruebas de aislamiento cross-tenant requeridas antes de cerrar el issue #53 o de marcar cualquier punto del Nivel 2 de `docs/SECURITY_ROADMAP.md` como completado.
