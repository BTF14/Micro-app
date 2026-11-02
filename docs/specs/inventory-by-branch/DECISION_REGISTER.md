# Registro de decisiones de producto — inventario por sucursal

**Estado:** pendiente de decisión expresa del propietario.  
**Fecha de preparación:** 2026-11-02 UTC.  
**Ámbito:** MVP de inventario por sucursal/almacén.  
**Autoridad:** solo el propietario puede cerrar las preguntas marcadas como negocio.  
**Regla:** ninguna opción de ejemplo es una recomendación aprobada. El silencio no equivale a aceptación.

Este registro convierte las preguntas abiertas de `INVENTORY_BRANCH_ARCHITECTURE_DECISIONS.md` §4 en decisiones trazables. Cada respuesta debe indicar alcance, fecha y fuente de aprobación. Si una decisión se excluye del MVP, debe quedar explícitamente fuera de alcance.

## D-01 — Cardinalidad de almacenes por sucursal

**Pregunta:** ¿Cada sucursal tendrá exactamente un almacén o podrá tener varios? ¿Debe existir un almacén predeterminado?

**Impacto:** modelo de datos, unicidad, selección en UI, permisos, transferencias y complejidad de consultas. Un almacén predeterminado no debe inferirse solo porque facilite el código.

**Estado:** pendiente del propietario.

## D-02 — Almacén que consume una venta

**Pregunta:** ¿La venta descuenta del almacén predeterminado de la sucursal, de un almacén seleccionado para toda la venta o de un almacén elegido por línea? ¿Se permite que una misma venta consuma de varios almacenes?

**Impacto:** contrato de venta, snapshots, autorización sobre almacén, idempotencia, concurrencia, experiencia de caja y reversos.

**Estado:** pendiente del propietario.

## D-03 — Compras y recepción física en el MVP

**Pregunta:** ¿El MVP incluye órdenes de compra/proveedores o solo recepción directa de mercancía? Si existen órdenes, ¿se aceptan recepciones parciales y múltiples recepciones por orden?

**Impacto:** entidades y estados de compra, recepción, cantidades pedidas/recibidas/rechazadas, referencias de origen y conciliación con proveedor.

**Estado:** pendiente del propietario.

## D-04 — Semántica de transferencias

**Pregunta:** ¿La transferencia es instantánea o tiene estado en tránsito? ¿En qué momento se descuenta el origen y se acredita el destino? ¿Quién confirma la recepción? ¿Cómo se documentan pérdida, daño, diferencia, cancelación y reverso?

**Impacto:** estados, ledger, disponibilidad, balances de origen/destino, auditoría, operaciones parciales e idempotencia. La matriz de permisos ya define quién puede transferir; no define esta semántica.

**Estado:** pendiente del propietario.

## D-05 — Destino de devoluciones

**Pregunta:** ¿Lo devuelto vuelve directamente al stock disponible o debe poder quedar en cuarentena/dañado/no vendible? ¿Quién confirma que una unidad puede volver a estar disponible? ¿Se permiten devoluciones parciales?

**Impacto:** cantidades vendibles, movimientos compensatorios, inspección, motivo, permisos y reversos de ventas históricas que no tienen almacén asignado.

**Estado:** pendiente del propietario.

## D-06 — Valoración y snapshots de coste

**Pregunta:** ¿Qué método de valoración se utilizará (promedio ponderado, FIFO, coste estándar u otro)? ¿En qué momento se reconoce el coste y qué coste snapshot se guarda en ventas, recepciones, transferencias, devoluciones y ajustes?

**Impacto:** coste de ventas, margen, estados financieros, valoración de inventario y tratamiento histórico. No elegir método por conveniencia de implementación.

**Estado:** pendiente del propietario.

## D-07 — Reservas y disponibilidad

**Pregunta:** ¿El MVP necesita reservas de stock para pedidos, preventas o apartados? Si sí, ¿qué estados reservan, liberan o consumen la reserva y cuándo expira?

**Impacto:** separación entre existencia física, cantidad reservada y disponible; índices, concurrencia, cancelaciones y disponibilidad mostrada al usuario.

**Estado:** pendiente del propietario.

## D-08 — Conteo físico y stock inicial

**Pregunta:** ¿Quién realizará el conteo físico por almacén y quién lo aprobará? ¿En qué fecha de corte? ¿Cómo se documentarán y aprobarán diferencias frente al stock organizacional legado?

**Impacto:** apertura de balances, fiabilidad del saldo inicial, auditoría, backfill, reconciliación y cutover. No hay evidencia que permita distribuir automáticamente `products.stock_quantity` o movimientos históricos entre sucursales.

**Estado:** pendiente del propietario.

## D-09 — Documentos operativos y ciclo de vida del MVP

**Pregunta:** ¿Qué documentos entran en la primera versión (venta, recepción, ajuste, transferencia, devolución, orden de compra u otros)? Para cada uno, ¿cuáles son sus estados, quién confirma/cancela y qué reversos se permiten?

**Impacto:** integridad referencial de movimientos, FKs tipadas frente a documento operativo común, estados, auditoría, idempotencia y tamaño del MVP.

**Estado:** pendiente del propietario.

## Regla de cierre

Una decisión solo pasa a **APROBADA** cuando exista respuesta explícita del propietario y se registre aquí con fecha, alcance y evidencia. Una decisión puede quedar **EXCLUIDA DEL MVP** solo si el propietario lo confirma. Hasta entonces, los contratos técnicos deben mantenerse neutrales respecto a esa semántica y no debe generarse DDL final ni implementación dependiente de ella.

## Estado de cierre

- Decisiones aprobadas: 0/9.
- Decisiones excluidas del MVP: 0/9.
- Decisiones pendientes: 9/9.
- No se ha elegido ningún método de valoración, cardinalidad de almacenes, política de reservas, semántica de transferencias ni estrategia de apertura inicial.
