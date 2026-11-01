# Spec: inventario por sucursal y almacén

- Estado: propuesta para evaluación; no aprobada para implementación
- Issue/PR: piloto SDD aislado; sin PR
- Responsable/revisor: pendiente
- Fecha: 2026-11-01
- Riesgo: alto (stock, consistencia financiera, aislamiento tenant y concurrencia)

## Problema y objetivo

Micro-app mantiene actualmente `products.stock_quantity` como cantidad organizacional. El negocio necesita distinguir existencias físicas por almacén y sucursal sin perder trazabilidad ni permitir que una organización acceda a los datos de otra.

El objetivo de esta especificación es definir una evolución verificable desde el stock organizacional actual hacia inventario por almacén, con operaciones auditables y consistentes. Este documento no afirma que el modelo objetivo esté implementado.

## Estado actual verificado / restricciones

- `products.stock_quantity` existe y es organizacional.
- Existe `inventory_movements` en el esquema inicial, pero no está particionada por sucursal/almacén.
- `branches` y `branch_memberships` existen en la migración 0003; la asignación de sucursal no concede por sí sola autorización comercial.
- La migración 0004 define cajas/turnos; no implementa inventario por almacén.
- No existen endpoints comerciales ni middleware de autorización de inventario en producción.
- La matriz `docs/sdd/role-permission-decision-matrix.md` está APROBADA; su alcance de Inventory por sucursal define quién puede operar, no demuestra que el stock ya esté separado por sucursal.
- Las migraciones 0003/0004 no deben asumirse aplicadas a Neon `main`; comprobar estado antes de cualquier trabajo futuro.

## Alcance propuesto

Incluido en el diseño:

1. Modelo de almacenes vinculados a una sucursal y a una organización.
2. Saldo por (organización, almacén, producto), con integridad tenant-scoped.
3. Libro de movimientos atribuible y auditable, con operaciones de recepción, ajuste, venta, devolución y transferencia según el alcance aprobado.
4. Actualización atómica de movimiento y saldo en una transacción.
5. Autorización server-side por rol organizacional y membresía activa de sucursal conforme a la matriz aprobada.
6. Protección frente a stock negativo, concurrencia e idempotencia.
7. Migración gradual desde el stock organizacional actual, con backfill, conciliación y compatibilidad temporal.
8. Pruebas automatizadas de aislamiento tenant/rol, integridad, concurrencia, rollback y reconciliación.

Fuera de alcance de este piloto:

- Implementar endpoints, UI, servicios o migraciones.
- Aplicar cambios a Neon `main`, datos reales o producción.
- Desplegar, cambiar secretos, billing o infraestructura.
- Eliminar `products.stock_quantity` antes de una migración aprobada y reconciliada.
- Crear roles por sucursal o alterar la matriz de permisos aprobada.
- Añadir microservicios, colas, cachés o event framework sin necesidad demostrada.

## Actores y casos de uso

- Owner/Admin: consultar y operar inventario organizacional según la matriz aprobada.
- Inventory: consultar existencias/movimientos y recibir, ajustar o transferir dentro de sucursales donde tenga asignación activa.
- Cashier: consultar existencias de su sucursal; no recibir ni ajustar.
- API: validar sesión, organización, rol, membresía y alcance del recurso en servidor para cada operación.

Casos principales:
1. Consultar saldo de un producto en un almacén autorizado.
2. Recibir mercancía en un almacén mediante documento de recepción confirmado.
3. Registrar ajuste con motivo obligatorio y actor identificable.
4. Transferir entre almacenes autorizados, registrando salida y recepción.
5. Registrar consumo por venta y reverso/devolución con referencias trazables.
6. Rechazar acceso cross-tenant, membresía revocada, rol no autorizado y operaciones que producirían saldo negativo.

## Reglas de negocio y consistencia

- `organization_id` es la frontera tenant; usar claves foráneas compuestas para impedir relaciones cruzadas.
- Un almacén pertenece a una sucursal de la misma organización.
- El catálogo de productos permanece compartido por organización.
- El saldo operativo se identifica por organización, almacén y producto.
- Los movimientos confirmados son el historial; los balances son una proyección reconciliable.
- Movimiento y balance se escriben en la misma transacción.
- No se permite saldo disponible negativo.
- Las operaciones concurrentes deben serializarse/protegerse con actualización condicional o bloqueo de fila; no usar patrón inseguro leer-modificar-escribir.
- Las mutaciones externas son idempotentes y auditables.
- Una transferencia no aumenta el destino al solicitarse: debe conservar estados y hechos de salida/recepción.
- Correcciones se registran mediante operaciones compensatorias; no editar/borrar silenciosamente hechos históricos.
- El backfill debe conciliar cantidades y diferencias antes de cambiar la fuente de lectura/escritura.
- No eliminar el stock organizacional en la primera fase.

## Autorización

Aplicar exactamente `docs/sdd/role-permission-decision-matrix.md`:
- Owner/Admin: alcance organizacional según la matriz.
- Inventory: operaciones de inventario en sucursales con membresía activa.
- Cashier: lectura de existencias/movimientos en sucursal; sin recepción ni ajuste.
- La asignación a sucursal no reemplaza el rol ni autoriza por sí sola.
- Toda comprobación debe ocurrir server-side y fallar cerrada.
- No implementar permisos por sucursal ni cierre de turno por supervisor como efecto colateral.

## Datos y contratos

Entidades objetivo a evaluar:
- `warehouses`: organización + sucursal + identificador.
- `inventory_balances`: organización + almacén + producto, cantidades y restricciones.
- `inventory_movements`: libro con almacén, producto, cantidad, actor, motivo, coste snapshot y referencia operativa tipada.
- Recepciones y transferencias: documentos y líneas tenant-scoped, con estados explícitos e idempotencia.

La elección definitiva de referencia de origen (FKs tipadas o documento operativo común) queda pendiente de análisis de integridad y ciclo de vida; no introducir referencias polimórficas débiles sin justificación.

## Errores y casos límite

- Organización, sucursal, almacén o producto inexistente o cruzado.
- Membresía de sucursal revocada o inactiva.
- Rol no autorizado.
- Cantidad cero, negativa o precisión inválida.
- Saldo insuficiente, incluso bajo solicitudes concurrentes.
- Repetición de una misma clave idempotente con payload idéntico o distinto.
- Recepción/transferencia parcialmente confirmada o cancelada.
- Reverso de movimiento ya compensado.
- Backfill con diferencia entre saldo heredado y suma de movimientos.
- Fallo a mitad de transacción: no debe persistir solo movimiento o solo balance.

## Requisitos no funcionales, seguridad y coste

- Aislamiento tenant garantizado por API y FKs compuestas.
- Auditoría atribuible para operaciones mutantes.
- No confiar en frontend para autorización.
- No secretos ni datos de clientes en especificaciones/logs.
- Pruebas con PostgreSQL efímero antes de cualquier migración.
- Coste total objetivo $0; no activar servicios ni planes de pago.
- Neon `main`, producción y despliegues permanecen fuera de alcance sin autorización y gates específicos.

## Criterios de aceptación verificables

- [ ] CA-1: la spec distingue claramente estado implementado, aprobado y propuesto.
- [ ] CA-2: cada entidad nueva mantiene integridad tenant-scoped mediante claves compuestas.
- [ ] CA-3: las reglas de autorización corresponden exactamente a la matriz aprobada.
- [ ] CA-4: movimiento y balance son atómicos y reconciliables.
- [ ] CA-5: concurrencia e idempotencia impiden sobreventa y duplicación.
- [ ] CA-6: recepción, ajuste, venta, devolución y transferencia tienen estados y trazabilidad definidos.
- [ ] CA-7: el backfill conserva compatibilidad y exige conciliación antes de cambiar la fuente de verdad.
- [ ] CA-8: se definen pruebas cross-tenant, por rol, concurrencia, rollback y reconciliación.
- [ ] CA-9: ninguna decisión abierta se presenta como aprobada ni se ejecuta migración/despliegue.

## Decisiones pendientes antes de aprobar

- Política de valoración/coste de inventario y snapshots por movimiento.
- Tratamiento exacto de reservas y disponibilidad (si se requieren en primera versión).
- Semántica de transferencia: cuándo se descuenta origen, cuándo se acredita destino y cómo se representan pérdidas/diferencias en tránsito.
- Estados y permisos de cancelación/reverso de recepciones y transferencias.
- Relación tipada entre movimientos y documentos de origen.
- Estrategia detallada de backfill y reconciliación con los movimientos históricos existentes.
- Si las ventas deben consumir stock en una única ubicación o admitir selección de almacén.

## Evidencia requerida

Diseño SQL revisado; pruebas PostgreSQL desechable; pruebas de autorización y cross-tenant; pruebas de concurrencia/idempotencia; comparación de balances antes/después del backfill; revisión de seguridad; CI para SHA exacto. Ninguna evidencia se considera obtenida por esta spec.
