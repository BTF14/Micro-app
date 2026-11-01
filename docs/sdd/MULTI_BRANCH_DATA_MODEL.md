# ERD objetivo: organización, sucursal, almacén, caja y operaciones

**Estado:** main incluye sucursales/asignaciones por PR #165 (0003); PR #167 fusionó `registers`/`register_shifts` mediante 0004 en main. Ninguna migración 0003/0004 se ha aplicado a Neon main. Almacenes, balances por almacén y operaciones comerciales siguen pendientes. No autoriza endpoints ni cambios en Neon.  
**Fecha:** 2026-10-30 UTC  
**Base original del diseño:** merge de PR #163, main = 894895cfeee1c3d67b1e92bf1fae7d0c30cd36f9.  
**Merge SHA de PR #167 (integró 0004):** `c1cd8650db33aa4a249eaf1f55d321513d576e10`.  
**Fuentes contrastadas:** apps/api/migrations/0001_initial.sql, docs/SCHEMA_REVIEW.md, docs/DATABASE_SCHEMA.md, docs/SAAS_ARCHITECTURE_DECISIONS.md y docs/sdd/role-permission-decision-matrix.md.

## 1. Propósito y límites

Diseñar la evolución del modelo actual, que solo tiene inventario a nivel organización, hacia una plataforma multi-organización y multi-sucursal sin debilitar el aislamiento ya existente.

Esta especificación separa:
- **Existente en Git:** esquema base 0001, identidad 0002 y sucursales/asignaciones 0003 (`branches`, `branch_memberships`). La 0003 fue fusionada en PR #165 y validada en PostgreSQL 18 efímero.
- **Objetivo propuesto:** entidades/relaciones que aún no están implementadas y evolución futura de las ya existentes.
- **No implementado en main:** almacenes, balances por almacén, compras/recepciones, transferencias y devoluciones. Cajas/turnos están en 0004; `products.stock_quantity` sigue siendo organización-scoped.
- **Gate de permisos:** `docs/sdd/role-permission-decision-matrix.md` está APROBADA (2026-10-31) y su sección de caja fue corregida el 2026-11-01. La aprobación documental no implementa endpoints ni middleware; toda autorización debe seguir la matriz y probarse en servidor.

La migración 0003 sí se ejecutó en PostgreSQL 18 desechable mediante CI y sus assertions; no se aplicó a Neon `main`. No hay rutas comerciales ni se ha conectado `resolveBranchContext` a handlers.

## 2. Principios de modelado

1. organization_id es la frontera de aislamiento y debe formar parte de todas las claves foráneas de datos tenant-scoped.
2. La sucursal es el ámbito operativo; el almacén contiene stock y pertenece a una sucursal; caja/terminal también pertenece a una sucursal.
3. Catálogo, SKU, proveedor, cliente y precio base permanecen compartidos por organización salvo necesidad demostrada. No duplicar productos por sucursal.
4. El stock pertenece a (organization, warehouse, product), no a products.stock_quantity.
5. Venta y pago se atribuyen a organización y sucursal; caja/turno se exige cuando el canal de operación sea caja. Operaciones no presenciales podrían no tener turno, pero nunca carecer de organización/sucursal.
6. Una transferencia entre almacenes se registra como una operación con origen/destino y dos movimientos relacionados; no se edita el saldo directamente.
7. El historial financiero y de inventario se corrige mediante reversos/compensaciones, nunca borrando hechos confirmados.
8. No añadir branch_id a cada tabla por comodidad. Añadirlo donde defina propiedad/ámbito operativo y reforzar relaciones con FKs compuestas.
9. Toda autorización se calcula en servidor a partir de sesión, membresía, asignación de sucursal y recurso; no confiar en IDs/roles/claims enviados por el navegador.
10. Evitar microservicios, particionado o cachés prematuras. PostgreSQL relacional y transacciones son suficientes hasta que benchmarks demuestren otra necesidad.

## 3. ERD conceptual

~~~mermaid
erDiagram
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
  APP_USERS ||--o{ ORGANIZATION_MEMBERS : joins
  ORGANIZATIONS ||--o{ BRANCHES : owns
  ORGANIZATION_MEMBERS ||--o{ BRANCH_MEMBERSHIPS : assigned
  BRANCHES ||--o{ BRANCH_MEMBERSHIPS : scopes
  BRANCHES ||--o{ WAREHOUSES : contains
  BRANCHES ||--o{ REGISTERS : contains
  WAREHOUSES ||--o{ INVENTORY_BALANCES : stores
  PRODUCTS ||--o{ INVENTORY_BALANCES : balanced
  WAREHOUSES ||--o{ INVENTORY_MOVEMENTS : records
  BRANCHES ||--o{ SALES : operates
  REGISTERS ||--o{ REGISTER_SHIFTS : opens
  REGISTER_SHIFTS ||--o{ SALES : serves
  SALES ||--o{ SALE_ITEMS : contains
  SALES ||--o{ PAYMENTS : receives
  BRANCHES ||--o{ PURCHASE_RECEIPTS : receives
  PURCHASE_RECEIPTS ||--o{ PURCHASE_RECEIPT_LINES : contains
  BRANCHES ||--o{ INVENTORY_TRANSFERS : transfers
  INVENTORY_TRANSFERS ||--o{ INVENTORY_TRANSFER_LINES : contains
~~~

El diagrama omite claves técnicas y tablas de auditoría/idempotencia para que sea legible. Todas las entidades operativas indicadas llevan organization_id, aunque la relación lógica se dibuje por separado.

## 4. Entidades objetivo y responsabilidades

| Entidad | Clave lógica | Responsabilidad / invariantes |
|---|---|---|
| organizations | id | Tenant; estado y datos del negocio |
| organization_members | (organization_id,user_id) | Pertenencia activa a la organización; no implica acceso a todas las sucursales |
| branches | (organization_id,id) | Unidad operativa; código único por organización; permitir sucursal predeterminada |
| branch_memberships | (organization_id,branch_id,user_id) | Asignación explícita de un miembro a una sucursal y estado de la asignación |
| warehouses | (organization_id,branch_id,id) | Almacén perteneciente a una sucursal; código único en el ámbito definido |
| registers | (organization_id,branch_id,id) | Caja/terminal física o lógica dentro de sucursal |
| register_shifts | (organization_id,branch_id,id) | Apertura/cierre de caja, operador, importes de apertura/cierre y estado |
| inventory_balances | (organization_id,warehouse_id,product_id) | Saldo materializado por almacén/producto; cantidad disponible y reservada |
| inventory_movements | (organization_id,id) | Libro inmutable de entradas/salidas/ajustes con almacén, producto, cantidad y coste snapshot |
| sales | (organization_id,id) | Venta atribuida a sucursal y opcionalmente a caja/turno según canal |
| sale_items | (organization_id,sale_id,id) | Líneas y snapshots de producto/precio/coste/tasa |
| payments | (organization_id,id) | Pagos asociados a venta, con idempotencia propia |
| purchase_receipts / lines | tenant-scoped | Recepción física de mercancía en sucursal/almacén; no confundir orden de compra con recepción |
| inventory_transfers / lines | tenant-scoped | Transferencia entre dos almacenes de la misma organización, con salida y recepción |
| audit_logs | (organization_id,id) | Auditoría atribuible, protegida contra modificación ordinaria |

### Membresía, rol organizacional y asignaciones de sucursal — decisión vigente

La migración 0003 crea `branch_memberships` como asignación explícita de un miembro organizacional a una sucursal, con FKs compuestas tenant-scoped y estado revocable. La autoridad del rol permanece en `organization_members.role`.

- Cada miembro tiene **un único rol por organización** (`owner`, `admin`, `cashier` o `inventory`); ese rol aplica uniformemente en todas las sucursales de la organización.
- `branch_memberships` solo concede/revoca acceso a sucursales. No contiene rol por sucursal y no permite roles distintos para una misma persona según la sucursal.
- Cambiar `organization_members.role` afecta al miembro en toda la organización. Revocar una asignación de sucursal no modifica el rol ni otras asignaciones.
- La pertenencia organizacional, el rol global y la asignación activa de sucursal son comprobaciones distintas. Ninguna de ellas, aislada o combinada, autoriza una operación comercial sin una regla explícita server-side.
- No crear migraciones/backfills para roles por sucursal. Cualquier cambio de esta decisión requiere nueva aprobación explícita del propietario.
- La matriz de permisos por operación está **APROBADA** en `docs/sdd/role-permission-decision-matrix.md` (2026-10-31; corrección de caja 2026-11-01). Aplicar exactamente sus reglas; no inferir permisos adicionales a partir del nombre del rol. La aprobación no equivale a implementación.

Esto describe la estructura implementada y la decisión vigente; no aprueba facultades comerciales. El inventario continúa organizacional mediante `products.stock_quantity`; el inventario por sucursal/almacén no está implementado.

## 5. Relaciones e integridad tenant-scoped

Usar claves foráneas compuestas para que el propio PostgreSQL impida asociaciones cruzadas:
- branches UNIQUE (organization_id,id); warehouses FOREIGN KEY (organization_id,branch_id).
- registers FOREIGN KEY (organization_id,branch_id).
- branch_memberships FOREIGN KEY (organization_id,user_id) REFERENCES organization_members y FOREIGN KEY (organization_id,branch_id) REFERENCES branches.
- inventory_balances FOREIGN KEY (organization_id,warehouse_id) y FOREIGN KEY (organization_id,product_id).
- sales FOREIGN KEY (organization_id,branch_id); caja/turno con FK compuesta a la misma organización y sucursal.
- sale_items, payments, inventory_movements, compras y transferencias mantienen FKs compuestas hacia sus padres y productos.
- Las relaciones de una transferencia exigen origen y destino distintos y pertenecientes a la misma organización; una constraint puede verificar que no sean iguales, las FKs compuestas validan pertenencia.

No basta con UUID globales. Las FKs compuestas son defensa en profundidad; la API sigue obligada a autorizar cada acción.

## 6. Inventario: saldo y libro

### Fuente de verdad propuesta

- inventory_movements es el historial de cambios confirmados.
- inventory_balances es una proyección/materialización transaccional para lectura rápida.
- Cada operación escribe movimientos y actualiza balances dentro de la misma transacción.
- El saldo se puede reconstruir/reconciliar sumando movimientos; una tarea de reconciliación detecta diferencias, no las corrige silenciosamente.
- Restricciones: cantidades con NUMERIC; no aceptar saldo disponible negativo; reserved_quantity >= 0 y reserved_quantity <= on_hand_quantity si se separan ambas magnitudes.
- Para consumo concurrente, actualizar condicionalmente la fila de balance (on_hand - reserved >= requested) o bloquearla con SELECT ... FOR UPDATE; nunca leer y luego escribir sin protección.
- No borrar products.stock_quantity en el primer cambio. Migrar con backfill y comparación por organización/producto; mantener compatibilidad temporal, cortar escrituras antiguas y eliminar el campo solo en una migración posterior tras reconciliación demostrada.

### Movimientos y referencias

La referencia polimórfica actual (reference_type/reference_id) no tiene FK fuerte. Evitar que el nuevo diseño amplíe ese patrón. Evaluar:
- documento operativo común inventory_documents con identidad tenant-scoped y subtipo controlado, con FKs tipadas desde venta/recepción/transferencia; o
- columnas FK tipadas opcionales por origen con una regla que exija exactamente una referencia válida.

La elección final debe probar borrado/reverso, ciclo de vida, integridad y consultas. No crear un framework genérico de eventos sin caso de uso.

## 7. Caja, turnos y ventas

- Una caja pertenece a una sucursal; un turno pertenece a una caja y sucursal y tiene operador de apertura/cierre.
- Impedir dos turnos abiertos simultáneos en la misma caja mediante índice único parcial por organization_id,register_id para estado abierto.
- Validar que el operador tenga asignación activa a esa sucursal/caja y que el turno esté abierto.
- La venta conserva branch_id, el turno/caja cuando aplique y snapshots de precio, coste, tipo de cambio, importes y versión de política comercial de la organización si se utiliza.
- Venta, líneas, pagos, balance y movimientos se confirman en una sola transacción.
- No declarar completed una venta sin líneas y reconciliación de pagos. CHECK no puede validar agregados de otras tablas: usar servicio transaccional más constraint trigger diferible o procedimiento SQL tras comparar complejidad y rendimiento en PostgreSQL efímero.
- Los pagos deben tener idempotencia propia por organización y hash canónico del payload; misma key/mismo payload devuelve el resultado original, misma key/payload distinto devuelve conflicto.
- Los importes se calculan en servidor con NUMERIC; nunca usar float JS para dinero ni sumar importes brutos USD y VES sin conversión snapshot.

## 8. Compras, recepciones y transferencias

- Separar orden/compromiso de compra de recepción física. Solo la recepción confirmada aumenta stock.
- La recepción se asocia a sucursal y almacén; cada línea referencia producto de la misma organización y conserva cantidad/coste recibido.
- Transferir entre almacenes: crear transferencia, reservar/emitir salida del origen, confirmar recepción en destino. No aumentar destino al crear solicitud.
- Si la transferencia es entre sucursales, el operador debe tener permiso sobre origen y destino o existir flujo de aprobación explícito; la política de roles permanece pendiente.
- Cada paso es idempotente, atribuible y auditable. Las diferencias/daños se registran como incidencias/ajustes, no se corrige el historial.

## 9. Último owner, auditoría e idempotencia

- Proteger cambios de miembros/roles bloqueando la fila de organizations en una transacción antes de contar/modificar owners; evita que dos operaciones concurrentes eliminen simultáneamente al último owner. La regla se prueba con dos transacciones concurrentes.
- Auditoría: append-only para el rol de aplicación; retirar privilegios UPDATE/DELETE sobre la tabla de eventos al rol runtime y añadir defensa adicional si la arquitectura de DB lo permite. Un trigger aislado no protege frente al owner de la tabla/superusuario.
- Cada operación mutante externa (venta, pago, recepción, transferencia, ajuste, cierre) tiene clave idempotente por tenant y tipo de operación y un hash de payload estable.
- Registrar actor, organización, sucursal, recurso, acción, timestamp y correlación. No guardar secretos ni datos sensibles innecesarios en metadata.

## 10. Secuencia de migración segura propuesta

No ejecutar hasta que exista un SDD de migración, revisión y autorización de los gates correspondientes.

1. Crear branches, crear una sucursal predeterminada por organización y validar unicidad.
2. Crear branch_memberships; definir y revisar backfill de miembros existentes. No inferir asignaciones sensibles automáticamente sin una política aprobada.
3. Crear warehouses, al menos un almacén predeterminado por sucursal.
4. Crear registers y turnos sin inventar caja abierta ni saldos iniciales.
5. Crear inventory_balances y poblar desde products.stock_quantity en almacén predeterminado, conservando evidencia de origen; comparar totales antes de cortar.
6. Añadir branch_id/FKs compuestas a ventas y operaciones, con estrategia nullable/backfill/NOT NULL por fases y pruebas de compatibilidad.
7. Añadir idempotencia de pagos, hash de payload, referencias de inventario tipadas y controles de auditoría.
8. Activar escrituras nuevas solo después de tests de lectura dual/reconciliación; eliminar campos legacy únicamente en migración posterior.
9. Aplicar a Neon main solo tras el gate de producción, recuperación verificada y autorización exigida por la Constitución.

## 11. Matriz de pruebas obligatorias para la futura implementación

| Área | Prueba | Resultado exigido |
|---|---|---|
| Tenant | Org A intenta referenciar branch/warehouse/product de Org B | FK/servicio rechaza; cero escrituras parciales |
| Branch | Usuario asignado a A intenta leer/operar B | 403/denegación, sin filtración |
| Membresía | Membresía o asignación desactivada con sesión vigente | siguiente operación denegada |
| Stock | Dos ventas concurrentes consumen el último stock | solo una confirma; saldo nunca negativo |
| Ledger | Movimiento falla después de actualizar balance (y viceversa) | rollback total |
| Reconciliación | suma ledger difiere de balance | alerta/hallazgo; no autocorrección silenciosa |
| Caja | dos aperturas simultáneas de la misma caja | una sola abierta |
| Turno | venta contra turno cerrado/de otra sucursal | denegada |
| Venta | completar sin líneas o con pagos insuficientes/excedidos | rechazo atómico |
| Pago | retry con misma key/payload | un pago; respuesta idempotente |
| Pago | misma key, payload distinto | conflicto |
| Transferencia | recepción repetida o almacén destino de otro tenant | no duplica; FK/servicio rechaza |
| Owner | dos revocaciones concurrentes intentan quitar último owner | al menos un owner permanece |
| Auditoría | usuario runtime intenta UPDATE/DELETE | denegado |
| Snapshots | cambiar precio/tasa/política después de venta | venta histórica no cambia |

Ejecutar contra PostgreSQL efímero con fixtures sintéticas, no Neon main. Las pruebas de esquema deben incluir constraints reales; los mocks no sustituyen concurrencia/FKs/transacciones.

## 12. Decisiones abiertas y gates

1. La estructura de membresía organizacional y asignación de sucursal, así como la matriz de permisos, ya están decididas/aprobadas en sus documentos canónicos. Antes de implementar autorizaciones, aplicar exactamente la matriz aprobada y completar pruebas cross-tenant y de rol.
2. Definir si todas las ventas requieren turno o si habrá ventas no asociadas a caja (por ejemplo ventas online/facturación externa).
3. Cerrar el flujo de recepción y transferencia, especialmente transferencias inter-sucursal.
4. Elegir el diseño de referencia tipada para movimientos, tras prueba de integridad y consultas.
5. Definir estados y reglas contables de pagos parciales, reversos y devoluciones con fuentes fiscales aplicables.
6. Definir retención/partición solo tras medir volumen; no anticipar particionado.
7. Preparar pruebas de carga y límites por organización después de tener un flujo vertical real.

## 13. Evidencia y alcance de este diseño

- Se inspeccionó la migración real apps/api/migrations/0001_initial.sql: catálogo/proveedores, products.stock_quantity por organización, ventas/líneas/pagos, movimientos con referencia polimórfica, auditoría y membresías; no hay sucursales/almacenes/cajas/turnos.
- Se contrastó con SCHEMA_REVIEW.md, DATABASE_SCHEMA.md, SAAS_ARCHITECTURE_DECISIONS.md, matriz de roles y Constitución.
- Este trabajo es análisis y documentación; no se editó código, SQL, migraciones, workflows, secretos ni infraestructura.
- No se ejecutó suite de runtime ni SQL porque no se introdujo implementación. Las pruebas enumeradas son criterios de aceptación futuros, no pruebas ejecutadas.
- No se accedió a Neon ni a datos reales; no se tocó Cloudflare, DNS, billing ni producción.
