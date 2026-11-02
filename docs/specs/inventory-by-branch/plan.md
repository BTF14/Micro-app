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

1. **Discovery — completado para el snapshot auditado:** barrido reproducible del árbol exacto de main 7ff887328f25cffff69ccb9e89bbb1ba25200aea (194 entradas, sin truncamiento), incluidos los archivos TS de API/web, migraciones SQL/assertions y E2E/config/scripts relevantes. No se encontraron callsites runtime de stock, movimientos, ventas ni compras; el esquema sí contiene definiciones organizacionales. Evidencia, blobs y clasificación: [INVENTORY_BRANCH_CODE_DISCOVERY.md](../../sdd/INVENTORY_BRANCH_CODE_DISCOVERY.md) §9. T3 queda completada para este SHA; repetir si cambia main antes de implementar. No se verificó producción ni se ejecutaron pruebas/runtime.
2. **Decisiones:** resolver los puntos abiertos de la spec y documentar las decisiones en fuentes canónicas.
3. **Modelo:** diseñar DDL aditivo, FKs compuestas, restricciones, índices, estados y estrategia de referencia.
4. **Pruebas primero:** crear casos PostgreSQL desechable para tenant, permisos, concurrencia, idempotencia, rollback y reconciliación.
5. **Servicio:** diseñar operaciones transaccionales de recepción, ajuste, consumo, reverso y transferencia.
6. **Migración:** diseñar backfill repetible, comparación, reconciliación, cutover gradual y rollback.
7. **API/UI:** implementar solo tras aprobación de spec/plan y contratos; mantener autorización en servidor.
8. **Revisión independiente:** arquitectura, seguridad/datos y QA con evidencia.
9. **Gate:** no fusionar ni desplegar si hay diferencias de stock sin explicar, fallos de aislamiento o checks obligatorios fallidos.

Esta secuencia es un plan propuesto; no se han inspeccionado todos los callsites ni aprobado los detalles.

## Contratos técnicos provisionales — sin decisión comercial implícita

Estos invariantes pueden diseñarse sin elegir todavía cardinalidad de almacenes, política de valoración, reservas ni semántica de documentos:

1. **Tenant:** toda tabla operativa nueva lleva `organization_id`; relaciones entre padres/hijos y productos usan claves únicas/FKs compuestas tenant-scoped. Un ID recibido del cliente nunca demuestra pertenencia.
2. **Autorización:** la API deriva actor, organización y rol de sesión/DB; resuelve sucursal y membresía activa cuando aplique; luego autoriza la operación concreta conforme a la matriz. Los resolvers de contexto no son autorización.
3. **Atomicidad:** documento operativo, movimiento, balance e idempotency record se confirman en una transacción PostgreSQL. No existe doble escritura fuera de la transacción.
4. **Concurrencia:** consumo mediante UPDATE condicional o bloqueo de fila dentro de la transacción; no leer-modificar-escribir sin protección. Restricciones DB defienden el saldo no negativo.
5. **Idempotencia:** clave única por tenant y tipo de operación, hash canónico del payload y resultado persistido en la misma transacción. Misma clave con distinto payload es conflicto.
6. **Historial:** los movimientos confirmados no se editan ni borran para corregir errores; se registran movimientos compensatorios vinculados. La referencia de origen debe ser verificable mediante FKs tipadas o documento común con integridad demostrable.
7. **Reconciliación:** el ledger permite recalcular balance; la reconciliación informa discrepancias y nunca las corrige silenciosamente.
8. **Compatibilidad:** conservar `products.stock_quantity` durante transición. No realizar doble escritura ni cutover hasta que se defina una fuente única, conteo físico por almacén, umbral aprobado y rollback ensayado.

No se finalizan nombres de estados, columnas de reservas/coste, ciclo de compra, recepción parcial, semántica de transferencia ni política de devolución hasta cerrar las decisiones de propietario. Los contratos anteriores son guardrails de integridad, no un DDL aprobado.

## Matriz mínima de pruebas y resultados esperados

| Caso | Preparación | Resultado exigido |
|---|---|---|
| Cross-tenant en FK | Org A referencia branch/warehouse/product/document de Org B | Rechazo de DB; cero filas parciales. |
| Membresía revocada | Usuario mantiene sesión, pero se desactiva su asignación | Siguiente mutación/read protegido denegado según matriz. |
| Rol no permitido | Cashier intenta recibir/ajustar/transferir | Denegación server-side; sin movimiento ni balance alterado. |
| Stock insuficiente | Salida supera disponible | Rechazo atómico; saldo sin cambios. |
| Última unidad concurrente | Dos transacciones consumen simultáneamente la misma última unidad | Una confirma; la otra falla por saldo insuficiente; saldo final cero. |
| Idempotencia repetida | Misma key y payload dos veces | Una operación; segunda respuesta corresponde al resultado original. |
| Colisión de idempotencia | Misma key, payload distinto | Conflicto; no segunda mutación. |
| Fallo parcial | Inyectar error tras movimiento y tras balance | Rollback completo de documento, movimiento, balance e idempotencia. |
| Ledger desincronizado | Alterar fixture de balance en entorno efímero | Reconciliación detecta diferencia y no auto-corrige. |
| Backfill repetido | Ejecutar backfill dos veces con mismo snapshot | Resultado determinista, sin duplicar saldos/movimientos. |
| Rollback | Fallar gate de conciliación antes de cutover | Volver al modo previo sin pérdida ni doble fuente de escritura. |

Los resultados son contratos de prueba propuestos. No se han ejecutado; no sustituyen decisiones sobre el comportamiento comercial.

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
