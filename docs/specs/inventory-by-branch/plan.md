# Plan: inventario por sucursal y almacén

- Spec: [spec.md](spec.md)
- Estado: propuesta; planificación, no aprobada para implementación

## Diseño y decisiones

- Mantener el tenant como frontera de integridad y autorización.
- Mantener roles en `organization_members.role`; `branch_memberships` solo asigna alcance.
- Evaluar almacenes bajo sucursal y balances por almacén/producto.
- Mantener `inventory_movements` como libro de hechos y balances como proyección transaccional.
- Diseñar una transición aditiva: no borrar ni dejar de leer/escribir el campo legado hasta que backfill y reconciliación tengan evidencia.
- Evitar referencias polimórficas sin FK; comparar FKs tipadas frente a documento operativo común.
- No añadir infraestructura distribuida, colas ni cachés en la primera fase sin medición/caso de uso.
- No tocar producción ni Neon `main`.

## Archivos / módulos previstos (solo hipótesis para futura implementación)

| Archivo/módulo | Cambio potencial | Motivo |
|---|---|---|
| `apps/api/migrations/00xx_inventory_warehouses.sql` | Almacenes, balances, constraints e índices | Persistencia tenant-scoped |
| `apps/api/src/` módulos de inventario | Servicios transaccionales y autorización | Recepciones, ajustes, transferencias y consultas |
| `apps/api/tests/` | Pruebas integración PostgreSQL | Tenant, roles, concurrencia, rollback |
| `apps/web/` | UI de selección/consulta de almacén | Solo tras contrato API aprobado |
| `docs/sdd/` | Decisiones de modelo y operación | Mantener fuente canónica |
| `docs/specs/inventory-by-branch/` | Artefactos de función | Trazabilidad |

Los nombres de migración, rutas, archivos y módulos son placeholders; descubrir el layout real y consumidores antes de modificar código.

## Secuencia propuesta

1. **Discovery — completado para el snapshot documentado:** revisar esquema, API, contexto de sucursal, caja, frontend y pruebas. Resultado: no existe flujo operativo de inventario por sucursal ni rutas comerciales de stock; `stock_quantity` y `inventory_movements` solo aparecen como modelo de datos organizacional en el esquema inicial. Evidencia y rutas: [INVENTORY_BRANCH_CODE_DISCOVERY.md](../../sdd/INVENTORY_BRANCH_CODE_DISCOVERY.md). Repetir/actualizar este discovery si cambia el SHA antes de diseñar o implementar.
2. **Decisiones:** resolver los puntos abiertos de la spec y documentar las decisiones en fuentes canónicas.
3. **Modelo:** diseñar DDL aditivo, FKs compuestas, restricciones, índices, estados y estrategia de referencia.
4. **Pruebas primero:** crear casos PostgreSQL desechable para tenant, permisos, concurrencia, idempotencia, rollback y reconciliación.
5. **Servicio:** diseñar operaciones transaccionales de recepción, ajuste, consumo, reverso y transferencia.
6. **Migración:** diseñar backfill repetible, comparación, reconciliación, cutover gradual y rollback.
7. **API/UI:** implementar solo tras aprobación de spec/plan y contratos; mantener autorización en servidor.
8. **Revisión independiente:** arquitectura, seguridad/datos y QA con evidencia.
9. **Gate:** no fusionar ni desplegar si hay diferencias de stock sin explicar, fallos de aislamiento o checks obligatorios fallidos.

Esta secuencia es un plan propuesto; no se han inspeccionado todos los callsites ni aprobado los detalles.

## Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación / evidencia |
|---|---|---|
| Fuga cross-tenant | Crítica | FKs compuestas + autorización server-side + tests con IDs manipulados |
| Stock negativo por concurrencia | Crítica | Update condicional/row lock + pruebas concurrentes |
| Doble movimiento por reintento | Alta | Idempotencia con hash canónico del payload |
| Divergencia ledger/balance | Alta | Escritura atómica + reconciliación reproducible |
| Pérdida de stock durante backfill | Crítica | Snapshot, backfill repetible, comparación y gate de cutover |
| Movimiento huérfano | Alta | FK tipadas o documento operativo con integridad |
| Permisos inconsistentes | Alta | Seguir matriz aprobada y probar cada rol/alcance |
| Complejidad prematura | Media | Una base PostgreSQL; no microservicios/colas/caché sin evidencia |

## Pruebas

- Unitarias: validación de cantidades, estados y transiciones.
- Integración: PostgreSQL efímero desde cero, constraints/FKs y transacciones.
- Seguridad: cross-tenant, rol, sucursal asignada/revocada, acceso denegado por defecto.
- Concurrencia: dos consumos simultáneos del último stock; no saldo negativo.
- Idempotencia: repetición misma key/payload y misma key/payload distinto.
- Integridad: atomicidad ledger/balance, reversos, transferencia origen/destino.
- Migración: backfill repetible, reconciliación y rollback en base efímera.
- E2E: solo después de existir API real; distinguirlo de mocks.

## Reversión y compatibilidad

La primera fase debe ser aditiva. Conservar `products.stock_quantity` y compatibilidad de lectura/escritura durante la transición definida. Antes del cutover, comparar saldo legado con suma de balances por almacén y documentar diferencias. Si falla la conciliación, detener el cutover; no corregir automáticamente ni descartar movimientos. El plan concreto de rollback debe acompañar la migración y probarse en PostgreSQL desechable.

## Bloqueos / decisiones pendientes

- Resolver las decisiones abiertas enumeradas en la spec.
- Confirmar el estado vivo de `main`, migraciones y PRs antes de cualquier implementación.
- Definir la estrategia de stock inicial y la asignación de cantidades existentes a almacenes.
- Confirmar que las pruebas pueden ejecutarse sin costes ni acceso a datos reales.
- Obtener aprobación explícita de la spec/plan antes de tareas de implementación.
