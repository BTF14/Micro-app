# Modelo SDD: recepción de inventario

**Estado:** diseño inicial; no implementado.  
**Fecha:** 2026-11-04 UTC  
**Alcance:** recepción física de mercancía en un almacén, independiente de la futura gestión de órdenes de compra.  
**No autoriza:** migraciones en Neon, despliegues, merge ni la implementación de decisiones de negocio marcadas como pendientes.

## 1. Hechos y decisiones ya vigentes

- El inventario por almacén usa `inventory_balances` como proyección transaccional y `warehouse_inventory_movements` como ledger append-only.
- Solo una recepción **confirmada** puede aumentar existencias. Crear, editar o guardar un borrador nunca mueve stock.
- La recepción se atribuye a organización, sucursal receptora, almacén, actor y momento de confirmación.
- Productos y proveedores son recursos compartidos dentro de la organización. La tabla `suppliers` ya existe en 0001 y `products.supplier_id` representa una asociación del producto; no demuestra por sí sola que una recepción deba limitarse a ese proveedor.
- La matriz aprobada autoriza recepción a Owner y Admin en alcance organizacional y a Inventory en sucursales asignadas. Cashier no puede recibir.
- Todas las operaciones mutantes deben ser tenant-scoped, idempotentes, auditables y transaccionales.
- Los movimientos y documentos confirmados son hechos históricos: no se editan ni eliminan; los errores se corrigen con movimientos compensatorios auditados.
- No se deriva ni se copia inventario desde `products.stock_quantity`; no existe backfill ni distribución automática.

## 2. Contrato funcional mínimo

La futura API debe separar claramente:
1. Crear un borrador de recepción sin impacto en existencias.
2. Consultar borrador e historial con aislamiento tenant/branch.
3. Confirmar una recepción una sola vez, escribiendo en una misma transacción el estado confirmado, movimientos `purchase_receipt`, actualización de balances y auditoría.
4. Reintentar una confirmación con la misma clave idempotente y el mismo payload devuelve el resultado original; reutilizarla con payload diferente produce conflicto.
5. Un error en cualquier paso revierte documento, ledger, balance y auditoría conjuntamente.

La confirmación debe bloquear las filas de balance afectadas en orden determinista, comprobar límites NUMERIC y aplicar cantidades decimales exactas. No se permite saldo negativo ni actualizar el ledger histórico.

## 3. Decisiones de esquema que se deben resolver antes de migrar

La propuesta de entidades `purchase_receipts` y `purchase_receipt_lines` del ERD es un punto de partida, no un esquema aprobado. Antes de DDL y endpoints hay que decidir y documentar:

- **Relación con orden de compra:** si habrá órdenes de compra dentro del producto, si una recepción puede existir sin orden, y cómo se vinculan varias recepciones parciales a una orden. La orden no se debe simular como recepción.
- **Proveedor:** si proveedor es obligatorio, opcional o puede ser desconocido en una recepción; si se guarda snapshot de nombre/datos fiscales; y si se permite recibir productos cuyo `products.supplier_id` sea distinto.
- **Documento externo:** tipo, número, fecha, unicidad por proveedor y política ante documentos repetidos.
- **Recepción parcial/excedente:** límites respecto a lo pedido, backorders, tolerancias y tratamiento de cantidades no aceptadas.
- **Costes:** coste recibido por línea, impuestos/flete/descuentos, moneda, tipo de cambio y efecto en coste promedio/valoración. No actualizar `products.cost_usd` automáticamente sin política de valoración aprobada.
- **Diferencias y daños:** si se rechaza cantidad, se registra una incidencia separada o se acepta parcialmente; no compensar silenciosamente el ledger.
- **Correcciones:** reverso total/parcial, quién lo autoriza y motivo; nunca editar una recepción confirmada.
- **Idempotencia:** ámbito y formato de clave, hash canónico del payload y retención del resultado.
- **Almacén:** confirmar si una recepción puede distribuir líneas entre varios almacenes (la regla base actual asocia recepción a un almacén).

## 4. Controles técnicos obligatorios

- FKs compuestas tenant-scoped para organización, sucursal, almacén, proveedor, producto, actor y documento padre.
- Validar membresía organizacional activa, rol y asignación de sucursal en servidor en cada solicitud; no confiar en frontend.
- Bloqueo transaccional de recepción y balances; prevenir doble confirmación concurrente.
- Restricción de unicidad para idempotencia y protección contra payload distinto.
- Ledger inmutable y auditoría atómica.
- Pruebas PostgreSQL de cross-tenant/cross-branch, roles, cantidades decimales, doble envío concurrente, rollback inducido, proveedor inválido, producto inválido, reintento y reverso.
- Pruebas HTTP de origin, sesión, Content-Type, tamaño máximo de body, validación estricta y no exposición de coste a Cashier.
- No modificar `products.stock_quantity` como efecto lateral.

## 5. Secuencia de implementación propuesta

1. Cerrar las decisiones del §3 con evidencia en SDD.
2. Aprobar ERD/DDL y assertions SQL en PostgreSQL efímero.
3. Implementar servicio transaccional y pruebas de integración.
4. Implementar handlers HTTP y pruebas de autorización/aislamiento.
5. Actualizar documentación operativa y gates de readiness.
6. Revisar CI completo en PR Draft antes de solicitar cualquier decisión de merge.

**Criterio de salida:** ninguna recepción confirmada puede duplicar stock, mezclar tenants/sucursales, omitir auditoría o quedar parcialmente aplicada tras un fallo.
