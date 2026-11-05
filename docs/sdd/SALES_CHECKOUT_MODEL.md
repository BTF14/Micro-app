# Modelo de ventas y checkout transaccional

**Estado:** diseño técnico en propuesta; no aprobado como política comercial y no implementado.  
**Fecha:** 2026-11-05 UTC  
**Dependencias de código:** PR #226–#229 (migraciones y motor monetario), PR #230 (catálogo de lectura), PR #231 (mantenimiento de productos).  
**Límites:** este documento no crea endpoints, DDL, migraciones ni cambios de infraestructura. No autoriza merge, Neon, Cloudflare ni producción.

## 1. Objetivo y principio rector

Definir una única operación de checkout que confirme una venta, sus líneas, pagos, consumo de inventario, snapshots monetarios e historial de auditoría en **una sola transacción PostgreSQL**. No puede existir un estado confirmado donde la venta se haya guardado sin sus pagos o donde el saldo haya cambiado sin su movimiento de ledger.

El backend es la autoridad para precios, permisos, stock, tasa BCV, importes y snapshots. La web envía identificadores, cantidades y datos de pago como cadenas decimales; nunca se aceptan subtotales, descuentos, importes calculados ni tasas calculadas por el cliente.

Reglas no negociables:
- USD es la moneda base del catálogo.
- Sin descuentos, promociones ni override manual del precio de lista.
- Aritmética con BigInt y strings decimales mediante @micro-app/money.
- Cantidad: NUMERIC(14,3); precio/costo USD: NUMERIC(14,4); BCV: NUMERIC(18,8); VES: NUMERIC(16,2).
- Redondeo half-away-from-zero donde corresponda, igual que PostgreSQL numeric round.
- La tasa y los importes históricos se congelan en la venta; nunca se recalculan con la tasa de hoy.

## 2. Evidencia del esquema actual

### Tablas y garantías existentes

- sales: clave de idempotencia única por organización; estados draft/completed/void/refunded; subtotal/total USD; FK a tasa; snapshots de tasa y total VES; actor creador. PR #228 elimina discount_usd y establece total_usd = subtotal_usd.
- sale_items: snapshots de nombre/SKU, cantidad, precio/costo unitario USD, total USD y total VES por línea; FKs compuestas de organización a venta y producto.
- payments: método, moneda, importe, equivalente USD, tasa snapshot, referencia y actor receptor. No tiene idempotency key propia.
- exchange_rates: fuente/fecha/tasa; PR #227 amplía tasa y snapshots a ocho decimales y limita privilegios runtime.
- register_shifts: turno individual con dueño, sucursal y caja; ciclo de vida protegido por constraints/triggers.
- warehouses, inventory_balances y warehouse_inventory_movements: inventario por almacén/sucursal. El ledger es append-only y PR #210 acopla cada cambio de balance a un movimiento mediante intentos transaccionales.
- withDatabaseTransaction: helper existente para BEGIN/COMMIT/ROLLBACK en un único cliente.

### Brechas verificadas que impiden implementar checkout sin diseño adicional

1. sales no tiene actualmente branch_id, register_shift_id ni warehouse_id; no puede vincular una venta a la sucursal, caja/turno y almacén que la originaron.
2. La base no garantiza por sí sola que una venta completada tenga al menos una línea, que la suma de líneas coincida con subtotal/total ni que los pagos concilien con lo cobrado. El servicio debe comprobarlo dentro de la transacción; se debe evaluar una constraint/trigger diferible adicional.
3. payments no tiene clave idempotente independiente. Para un checkout único, la clave de idempotencia de la venta debe cubrir el conjunto completo de pagos; no se debe exponer un endpoint separado de pago hasta definir su propia idempotencia.
4. payments.amount admite cuatro decimales independientemente de la moneda. La aplicación debe imponer escala 4 para USD y 2 para VES; se debe decidir si también se añade constraint SQL para VES.
5. La tabla heredada products.stock_quantity sigue en el esquema inicial, pero el inventario por almacén usa inventory_balances y warehouse_inventory_movements. Checkout no debe actualizar ambas representaciones a la vez ni inventar un backfill. El stock vendible debe proceder del balance del almacén elegido.
6. sales exige snapshots BCV/total VES para estado completed, incluso si el cliente pagó solo en USD. La política de tasa stale/no disponible debe cerrarse antes de exponer checkout.
7. Los importes VES por línea están almacenados en sale_items.line_total_ves; falta fijar explícitamente si sales.total_ves_snapshot es la suma de líneas redondeadas o la conversión del subtotal global. Para evitar dos totales distintos, la propuesta es sumar los line_total_ves ya redondeados.
8. No hay handlers HTTP de ventas/checkout registrados en apps/api/src/index.ts. Las tablas no significan que la operación esté implementada.

## 3. Flujo transaccional propuesto

El siguiente orden es una propuesta que debe respetar docs/architecture/INVENTORY_TRANSACTION_LOCKING.md:

1. **Validación de borde:** método/ruta, origen confiable, content-type, tamaño de cuerpo, sesión, UUIDs, clave idempotente y estructura estricta. Rechazar propiedades desconocidas.
2. **BEGIN y tenant:** usar un único cliente/una transacción; resolver y bloquear sesión, usuario, membresía y organización.
3. **Sucursal:** resolver branch context y revalidar sucursal/asignación activa dentro de la misma transacción. No confiar en organization/branch IDs del navegador.
4. **Almacén:** bloquear el almacén activo que pertenece a esa organización y sucursal con lockInventoryWarehouses. No aceptar almacén de otra sucursal/tenant.
5. **Turno:** resolver el turno abierto del usuario autenticado con resolveOpenCashierRegisterShift en el mismo cliente transaccional. Exigir que el turno pertenezca al usuario, sucursal y organización actuales. FOR SHARE mantiene el turno abierto hasta el COMMIT y evita cerrar mientras se procesa una venta.
6. **Idempotencia:** reclamar (organization_id, idempotency_key) dentro de la transacción y asociar un hash canónico de toda la petición. Mismo key + mismo hash devuelve el resultado original sin efectos nuevos; mismo key + distinto hash devuelve 409. Una restricción única resuelve concurrencia.
7. **Productos y líneas:** leer productos activos y bloquear el conjunto necesario; validar tenant, precio vigente, escala, cantidad positiva, SKU/nombre y costo snapshot. Consolidar IDs duplicados antes de bloquear balances, o definir expresamente si se conservan líneas duplicadas.
8. **Balances:** bloquear todos los balances del almacén en orden estable product_id ASC mediante el helper compartido. Validar on_hand_quantity - reserved_quantity >= quantity para cada producto; no permitir stock negativo ni consumir reservado.
9. **Cálculo exacto:** recalcular en backend cada line_total_usd = quantity × current price_usd; sumar a cuatro decimales; sin descuentos. Convertir cada línea a VES con la tasa aprobada, redondear a dos decimales y sumar esos importes para total_ves_snapshot (propuesta pendiente de aprobación).
10. **Venta draft:** insertar venta draft con tenant/sucursal/turno/almacén, actor, idempotency key/hash y snapshots calculados. Insertar líneas con snapshots de producto, precio, costo, cantidad y totales.
11. **Pagos:** validar cada método, moneda, referencia, escala y equivalencia; insertar todos los pagos. La conciliación debe seguir una política única aprobada; no aceptar pagos parciales, exceso ni cambio hasta que exista un modelo explícito.
12. **Inventario y ledger:** actualizar inventory_balances.on_hand_quantity bajo locks; insertar movimiento sale negativo por cada producto con referencia tipada a la venta y actor. El trigger de ledger debe consumir el intent correspondiente en la misma transacción.
13. **Auditoría:** insertar evento de venta completada con actor, scope, turno, almacén, venta, correlación/idempotencia y metadatos mínimos no sensibles.
14. **Finalización:** cambiar draft a completed únicamente después de verificar líneas, total, pagos, balances y ledger; establecer completed_at; COMMIT.
15. **Respuesta:** devolver snapshots persistidos. Replay idempotente devuelve la misma venta/snapshots y nunca vuelve a consumir inventario ni duplicar pagos/movimientos/auditoría.

Cualquier error antes de COMMIT produce ROLLBACK total. No enviar correos, webhooks ni efectos externos dentro de la transacción.

## 4. Contrato monetario

### Líneas y total

- Entrada de cantidad y precio solo como strings decimales.
- El precio de cada línea se obtiene de la base bajo el scope autorizado; nunca del precio enviado por el navegador.
- calculateLineUsd(quantity, unitPriceUsd) produce cuatro decimales y valida el límite de la columna.
- sumNumeric(..., 14, 4) calcula subtotal; el total USD es igual al subtotal.
- No redondear subtotales parciales a dos decimales.
- Guardar snapshots de precio y costo unitario para preservar el margen histórico.
- No incluir campos de descuento en request, respuesta, UI o persistencia.

### Tasa y VES

- Obtener una sola tasa BCV validada para toda la venta; nunca hacer query por producto.
- Congelar exchange_rate_id, exchange_rate_snapshot y total_ves_snapshot.
- Convertir cada línea a VES a dos decimales y definir una regla única de agregación; la propuesta actual es sumar líneas ya redondeadas porque cada línea tiene su propio snapshot VES.
- No usar Number para multiplicación, división, suma o redondeo monetario.
- Si la tasa está stale/no disponible, no inventar ni reutilizar silenciosamente una tasa.

### Pagos

El esquema permite métodos cash/card/transfer/mobile_payment/other y monedas USD/VES, pero no define por sí solo mezcla de monedas, cambio ni tolerancias. No implementar la conciliación hasta aprobar:
- si una venta acepta pagos mixtos USD+VES;
- si se permite sobrepago en efectivo y cómo se registra el cambio;
- si se permiten pagos parciales o la venta solo se completa al cubrir el total;
- cómo asignar el equivalente USD de cada pago VES y cómo conciliar el redondeo con total_usd;
- si se admite un pago en moneda distinta a la moneda de liquidación de la venta.

Recomendación técnica inicial: en la primera versión, un solo checkout atómico, sin pagos parciales ni sobrepago/cambio, y una sola moneda de liquidación por venta. Esto reduce ambigüedad contable; requiere aprobación funcional antes de codificarlo.

## 5. Idempotencia y concurrencia

- La clave es obligatoria para POST checkout; patrón acotado, por ejemplo 1–128 caracteres ASCII seguros.
- El hash canónico debe incluir organización, sucursal, turno, almacén, líneas ordenadas (product_id + quantity), y pagos normalizados (method, currency, amount, reference si aplica). No incluir campos calculados por cliente.
- Mismo key/hash: replay sin efectos; mismo key/diferente hash: 409.
- Dos requests simultáneas con la misma clave deben producir una sola venta, un conjunto de pagos, un conjunto de movimientos y un evento de auditoría.
- Dos ventas concurrentes que consumen el último stock deben serializarse en el mutex del almacén/balance; solo una puede completar.
- El orden de locks debe ser estable y común con conteos/recepciones futuras: tenant → sucursal(es) → almacén(es) → turno/documento → balances → escrituras.
- No adquirir balances antes de almacenes ni bloquear almacenes en orden origen/destino recibido por el cliente.

## 6. Reversos y límites de primera versión

No incluir en el primer checkout:
- void/cancelación de una venta completada;
- devoluciones o reembolsos;
- reversos de pagos;
- ajustes manuales de precio;
- reservas/backorders;
- fulfillment multi-almacén por línea;
- cierre/arqueo de caja o cálculo de efectivo esperado.

Cada reverso futuro deberá ser un documento/operación compensatoria y auditada, con movimientos inversos append-only, idempotencia propia y autorización explícita. Nunca editar/eliminar una venta, pago o movimiento histórico para corregirlo.

## 7. Pruebas de aceptación obligatorias

### Unitarias
- precio USD 23.8500, cantidad 1.250, total línea 29.8125;
- escala excesiva, floats JSON, exponentes, espacios, negativos y overflow;
- redondeos positivos/negativos half-away-from-zero;
- BCV ocho decimales y VES dos;
- hash idempotente estable ante orden distinto de líneas y normalización decimal;
- rechazo de key reutilizada con payload distinto.

### PostgreSQL desechable, conexiones independientes
1. venta completa: sale + líneas + pagos + balance + movimiento + auditoría en un COMMIT;
2. fallo inducido tras actualizar balance y antes de insertar ledger: rollback de todo;
3. duplicado simultáneo misma clave/mismo cuerpo: una sola venta y replay consistente;
4. misma clave/cuerpo distinto: 409 y ningún efecto adicional;
5. dos checkouts concurrentes por la última unidad: solo uno completa;
6. stock reservado: rechazar venta que intente consumirlo;
7. producto/almacén/sucursal/turno de otro tenant: rechazo sin escrituras;
8. turno cerrado, de otro usuario o de otra sucursal: rechazo;
9. cierre de turno concurrente: esperar al checkout o checkout rechazado, nunca venta fuera de turno;
10. tasa stale/no disponible según política aprobada;
11. pago incorrecto, moneda/escala inválida, pago insuficiente/excesivo según política;
12. producto inactivo o precio modificado concurrentemente: resultado coherente con el lock/snapshot definido;
13. sumas de líneas, pagos, snapshots y ledger reconciliados después del COMMIT;
14. ningún UPDATE/DELETE del ledger para venta completada;
15. pruebas de aislamiento y permisos por owner/admin/cashier/inventory.

Las pruebas deben correr contra PostgreSQL efímero con roles migrator/runtime reales; nunca contra Neon main o datos reales.

## 8. Decisiones funcionales pendientes antes del primer endpoint

| Decisión | Recomendación inicial | Motivo |
|---|---|---|
| Vínculo de venta | Organización + sucursal + turno propio + un almacén explícito | Trazabilidad y aislamiento |
| Almacén por venta | Un solo almacén por checkout v1 | Evita fulfillment ambiguo |
| Stock disponible | on_hand - reserved | No consumir stock reservado |
| Precio | Precio actual de catálogo leído por backend | Sin override ni descuento |
| Redondeo VES | Redondear por línea y sumar snapshots de línea | Coherencia con sale_items.line_total_ves |
| Pagos parciales | No en v1 | Simplifica estado y conciliación |
| Sobrepago/cambio | No en v1 | No existe modelo de cambio/ledger de caja |
| Mezcla USD/VES | Una moneda de liquidación por venta v1 | Evita tolerancias de equivalencia no definidas |
| BCV stale | Bloquear finalización si no hay tasa current validada | Cumple fail-closed y snapshots obligatorios actuales |
| Reversos/refunds | Fuera de v1 | Requiere flujos compensatorios separados |

Estas recomendaciones no son políticas aprobadas. El propietario debe confirmarlas o cambiarlas antes de cerrar el contrato funcional y añadir DDL/handlers.

## 9. Secuencia técnica recomendada

1. Revisar y cerrar las decisiones de la sección 8.
2. Diseñar migración aditiva para vincular venta a sucursal, turno y almacén, request hash/idempotencia y constraints de integridad.
3. Añadir constraints diferibles o un mecanismo de reconciliación SQL que impida completar una venta sin líneas/pagos conciliados.
4. Implementar un servicio de dominio puro para normalizar request, calcular líneas, totales, VES y pagos sin IO.
5. Implementar handler POST checkout usando una única transacción y helpers existentes de tenant, branch, shift, warehouse y balances.
6. Añadir pruebas de concurrencia/rollback/idempotencia contra PostgreSQL desechable.
7. Solo después crear UI de carrito/checkout; no duplicar cálculos monetarios en React.

## 10. Estado de infraestructura

- PR #226–#231 siguen siendo ramas/PRs de trabajo; verificar sus estados vivos antes de integrar.
- CI verde en una rama no significa que migraciones estén aplicadas a Neon.
- No se ha probado checkout en producción porque no existe handler de checkout.
- No desplegar ni fusionar fuera del orden de dependencias.
