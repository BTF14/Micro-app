# Modelo de ventas y checkout transaccional

**Estado:** política comercial aprobada por el propietario (2026-11-05); implementación técnica en PR #233 Draft. No desplegado ni probado en producción.  
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

### Brechas verificadas en la base #232 y estado de la implementación en PR #233

1. En la base #232, sales no tenía branch_id, register_shift_id ni warehouse_id. La migración 0015 de PR #233 añade esas relaciones compuestas sin backfill ni defaults.
2. La migración 0015 de PR #233 añade reconciliación diferida al COMMIT para líneas, pagos, BCV, turno, almacén, ledger y auditoría. El servicio HTTP aún debe demostrar el contrato mediante pruebas de integración.
3. payments no tiene clave idempotente independiente. La clave de idempotencia de la venta cubre el checkout completo y todos sus pagos; no se expone un endpoint separado de pagos.
4. payments.amount admite cuatro decimales por compatibilidad. La migración 0015 añade una constraint SQL que limita VES a dos decimales; el backend valida USD a cuatro y VES a dos.
5. La tabla heredada products.stock_quantity sigue en el esquema inicial, pero el inventario por almacén usa inventory_balances y warehouse_inventory_movements. Checkout no debe actualizar ambas representaciones a la vez ni inventar un backfill. El stock vendible debe proceder del balance del almacén elegido.
6. sales exige snapshots BCV/total VES para estado completed, incluso si el cliente pagó solo en USD. El propietario aprobó bloquear toda finalización si BCV no está current y validada; PR #233 exige fecha efectiva del día en Caracas y validation_status=valid.
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

### Pagos — política aprobada

- Cada venta usa una sola moneda de liquidación: USD o VES. No se mezclan monedas.
- La suma de los pagos debe ser exactamente igual al total en la moneda de liquidación. No se permiten parcialidades, sobrepago ni cálculo de cambio.
- Una venta no se completa si BCV no está current y validada, incluso si el pago se realiza en USD.
- Los métodos existentes siguen siendo cash/card/transfer/mobile_payment/other.
- Para pagos USD, usd_equivalent_snapshot coincide con amount.
- Para pagos VES, el backend calcula equivalentes con la tasa congelada. La suma de usd_equivalent_snapshot debe ser exactamente igual a total_usd; el último pago absorbe el residuo de asignación para no introducir diferencias de redondeo.
- La clave de idempotencia de la venta cubre todos los pagos del checkout; no existe endpoint independiente de pagos.

La política comercial anterior no autoriza descuentos, cupones, cambio manual de precios, mezcla de monedas, pagos parciales ni sobrepago.

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

## 8. Decisiones funcionales aprobadas y límites

| Decisión | Regla aprobada | Implementación |
|---|---|---|
| Vínculo de venta | Organización + sucursal + turno propio abierto + un almacén | Migración 0015; servicio en curso |
| Almacén por venta | Un solo almacén por checkout | Handler en PR #233 |
| Stock vendible | on_hand - reserved | Validación bajo lock de balance |
| Precio | Precio vigente de catálogo leído por backend | Sin precio enviado por el cliente |
| Descuentos | No existen en Micro-app | Sin campo ni cálculo de descuento |
| Redondeo VES | Redondear cada línea a dos decimales y sumar snapshots de línea | @micro-app/money |
| Pagos parciales | No permitidos | Total exacto obligatorio |
| Sobrepago/cambio | No permitidos | Total exacto obligatorio |
| Monedas | Una sola moneda por venta | USD o VES, nunca mixtas |
| BCV | current y validada obligatoria para toda venta | Fail-closed |
| Reversos/refunds | Fuera de v1 | Operación compensatoria futura |

No se deben ampliar estas reglas sin una decisión explícita del propietario. El soporte de varios registros de pago solo permite repartir el pago completo entre métodos de la misma moneda; la suma debe cubrir exactamente el total y no representa una parcialidad.

## 9. Secuencia técnica recomendada

1. Completar el handler POST checkout y su contrato de errores/respuesta.
2. Completar pruebas PostgreSQL para concurrencia, idempotencia, rollback, BCV, turno, stock, ledger, auditoría y aislamiento cross-tenant/cross-branch.
3. Verificar el bloqueo de turno, almacén y balances bajo el LOGIN runtime real.
4. Revisar los gates de seguridad de Issue #53 que condicionan la exposición del checkout.
5. Solo después crear UI de carrito/checkout; no duplicar cálculos monetarios en React.

## 10. Estado de infraestructura

- PR #226–#232 siguen siendo dependencias apiladas; PR #233 es la implementación inicial de checkout y permanece Draft.
- CI verde en una rama no significa que migraciones estén aplicadas a Neon.
- No se ha probado checkout en producción ni se ha aplicado la migración 0015 a Neon.
- No desplegar ni fusionar fuera del orden de dependencias.
