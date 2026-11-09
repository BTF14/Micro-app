# Criterio de aceptación del MVP — POS de un solo local y hasta 1.000 productos

**Decisión de producto aprobada por el propietario:** 2026-11-09  
**Objetivo de entrega:** 2026-12-01  
**Estado:** criterio de aceptación y alcance; no afirma que las funciones estén implementadas ni aprobadas para producción.

## 1. Resultado que debe conseguir el MVP

Un comercio pequeño o mediano, con **una sola sucursal/local y un catálogo de hasta 1.000 productos**, debe poder utilizar Micro-app para completar su operación diaria de principio a fin:

1. Iniciar sesión con un usuario autorizado.
2. Confirmar su local y contexto operativo.
3. Abrir su propio turno de caja con fondo inicial.
4. Localizar productos y agregarlos al carrito.
5. Registrar una venta y sus pagos admitidos.
6. Aplicar la tasa BCV válida que corresponda a la fecha de la operación cuando la venta requiera conversión.
7. Mostrar el comprobante interno con el detalle y snapshots de la operación.
8. Reflejar venta, pagos e inventario de forma consistente.
9. Consultar existencias y Kardex.
10. Realizar un conteo físico con cantidades absolutas y revisar diferencias.
11. Cerrar su propio turno y comprobar el arqueo.
12. Recuperarse de errores y reintentos sin duplicar ventas, pagos ni movimientos.

El flujo debe completarse desde la interfaz, sin intervención manual en la base de datos, llamadas directas a API, CLI, herramientas de desarrollo ni edición de registros.

## 2. Alcance y límites

- **Primer corte funcional:** un local/sucursal, catálogo de hasta 1.000 productos, operación diaria de caja, ventas, pagos, consulta de inventario, Kardex y conteos.
- La arquitectura y las reglas de aislamiento multi-tenant/multi-branch siguen siendo obligatorias. Limitar el primer flujo de usuario a un local no autoriza eliminar tenant_id/branch_id, controles de pertenencia, autorización de servidor ni pruebas negativas de aislamiento.
- Los 1.000 productos son una capacidad mínima de aceptación del catálogo, no un límite artificial de base de datos ni una afirmación de rendimiento ya medido.
- No se exige para este primer corte completar toda la visión SaaS ni todas las funciones multi-sucursal avanzadas.
- Transferencias de inventario entre sucursales en dos fases, reportes avanzados, contingencia manual BCV/PIN, recuperación administrativa y funciones de supervisor quedan fuera del P0 salvo decisión explícita posterior. No simularlas como terminadas.
- No cambiar roles, permisos ni políticas comerciales aprobadas para acelerar el MVP.
- Mantener presupuesto $0 y las restricciones de producción, secretos, datos reales, Neon main, despliegues y billing establecidas en la Constitución y el handoff.

## 3. Requisitos funcionales P0

### Catálogo
- Crear, editar, importar y buscar productos, con SKU/código de barras cuando esté soportado.
- Probar un conjunto de 1.000 productos sintéticos; verificar importación, búsqueda exacta/parcial, navegación, actualización y selección en carrito.
- Mostrar precio, moneda, disponibilidad y estado sin datos inventados ni discrepancias entre listado y checkout.

### Caja y ventas
- Abrir, consultar y cerrar únicamente el turno propio conforme a la matriz de permisos aprobada.
- Impedir checkout si no existe turno abierto válido para el usuario y local.
- Carrito con altas, bajas, cantidades y totales consistentes.
- Pagos limitados al contrato comercial realmente implementado y validado; no inventar métodos, reglas de cambio, pagos parciales ni impuestos.
- Checkout transaccional e idempotente: doble clic, timeout y reintento no pueden crear ventas o pagos duplicados.
- Guardar snapshots inmutables de líneas, precios, moneda, tasa y datos relevantes de la operación.
- Mostrar comprobante interno. No llamarlo factura fiscal ni afirmar cumplimiento fiscal sin evidencia oficial y revisión competente.
- Anulaciones/devoluciones, si no están implementadas con operaciones compensatorias y auditoría, deben permanecer deshabilitadas y claramente fuera del alcance; nunca editar/borrar una venta completada silenciosamente.

### BCV
- Mostrar tasa, fecha efectiva, fuente/estado y momento de última sincronización de forma comprensible.
- Aplicar la tasa efectiva válida correspondiente a la fecha de venta según la política aprobada.
- Fallar de forma cerrada cuando no exista tasa válida o la política de freshness no permita usarla.
- No usar valores de ejemplo, tasas manuales ni datos de terceros como si fueran BCV oficial.
- Los gates pendientes de freshness/last-success, umbrales, fixture oficial, identidad del Worker y revisión legal/contable siguen siendo bloqueos explícitos; este criterio de MVP no los elimina.

### Inventario
- La venta debe descontar existencias de manera transaccional y consistente con el ledger.
- No permitir stock negativo por carrera, manipulación de frontend ni requests concurrentes.
- Consultar existencias por local/almacén y movimientos Kardex.
- Conteos ingresan cantidades físicas absolutas; el servidor calcula diferencias y registra el ajuste auditable.
- No habilitar transferencias multi-sucursal como si estuvieran terminadas.

### Operación y experiencia
- Flujos utilizables desde móvil y escritorio, con estados de carga, vacíos, confirmación y errores claros.
- Un fallo de red/servidor debe permitir conocer si la operación se confirmó; el reintento debe ser seguro.
- No perder carrito ni ocultar una venta confirmada por un fallo posterior de interfaz.
- No depender de consola, SQL o intervención técnica para completar una jornada normal.

## 4. Pruebas de aceptación obligatorias

1. **Catálogo de 1.000 productos:** carga/importación, búsqueda, selección, edición y checkout de productos distribuidos por el catálogo. Registrar tiempos medidos y entorno; no prometer un SLA no acordado.
2. **Jornada completa:** login → apertura de turno → varias ventas → pagos → recibos → consulta de inventario/Kardex → conteo → cierre de turno.
3. **Concurrencia e idempotencia:** doble envío, timeout y reintentos; cero duplicados y saldos coherentes.
4. **Integridad:** ventas, pagos, caja y movimientos de inventario coinciden tras cada transacción.
5. **BCV:** tasa válida, ausente, desactualizada, intento fallido y carrera de sincronización; checkout bloqueado cuando corresponda.
6. **Aislamiento:** pruebas negativas de tenant, sucursal, rol y turno ajeno, aunque la demo de aceptación use un único local.
7. **PostgreSQL real efímero:** E2E contra API y base desechable; mocks aislados no sustituyen estas pruebas.
8. **Responsive/accesibilidad:** recorrido completo en móvil y escritorio; controles accesibles y mensajes comprensibles.
9. **Backup/restore:** restauración con datos sintéticos poblados y relaciones comerciales coherentes; registrar RPO/RTO medidos y limitaciones.
10. **Errores y recuperación:** fallos de red, servidor, base de datos y refresco de página sin pérdida ni duplicación silenciosa.

## 5. Criterio de salida y GO/NO-GO

El MVP solo puede declararse **aceptado para beta controlada** cuando:
- el flujo completo de extremo a extremo funciona desde la UI;
- todas las pruebas P0 aplicables pasan en el SHA exacto que se evalúa;
- no quedan defectos críticos/altos que comprometan ventas, dinero, inventario, aislamiento o recuperación;
- la revisión de seguridad y los gates BCV/checkout aplicables están cerrados con evidencia;
- backup/restore, observabilidad y límites de coste están evaluados;
- el propietario puede completar la jornada de aceptación sin consola, SQL ni intervención técnica.

La etiqueta **producción comercial lista** exige además cerrar los gates legales/fiscales, operativos, de identidad/runtime, respaldo/recuperación y despliegue que la Constitución y los documentos de readiness definan. Si un gate crítico no está demostrado el 30 de noviembre, la decisión es **NO-GO para producción**; puede considerarse beta controlada solo si sus riesgos y limitaciones están explícitos y aceptados. La fecha del 1 de diciembre es un objetivo condicionado, no permiso para rebajar controles.

## 6. Reglas de continuidad para todas las IAs y sesiones

- Este documento es la fuente canónica del **resultado de producto que se acepta**. WORK_CHECKPOINT contiene la secuencia y estado operativo; CURRENT_STATE contiene el estado vivo del repositorio; HANDOFF_NEXT_CHAT contiene instrucciones de continuidad. No copiar versiones divergentes del criterio en varios documentos.
- Leer primero AGENTS.md, docs/CONSTITUTION.md, docs/CURRENT_STATE.md, docs/HANDOFF_NEXT_CHAT.md, docs/WORK_CHECKPOINT.md, docs/PROJECT_PLAN.md y este documento antes de continuar.
- La aceptación de un objetivo funcional no modifica las restricciones de seguridad, GitHub, producción, costes, datos ni permisos. En caso de conflicto, prevalecen Constitución y guardrails; detenerse y documentar el conflicto en lugar de adivinar.
- Distinguir siempre: decisión aprobada, especificación, código existente en una rama, código integrado en main, despliegue y aceptación probada. Nunca llamar implementado a lo que solo está documentado o existe en una PR.
- Antes de cada acción sensible, consultar GitHub en vivo: rama, HEAD SHA, base, diff, estado Draft, workflows y check-runs exactos, reviews formales, threads y protección disponible. No reutilizar CI de SHAs anteriores.
- No iniciar una auditoría desde cero si el handoff aporta evidencia suficiente. Revalidar únicamente lo que cambió y registrar las discrepancias.
- No pedir al propietario datos ya documentados, Build IDs, capturas, terminal, CLI, TinyFish, tokens ni credenciales. Si existe un bloqueo que solo el propietario puede resolver, explicarlo una vez, aceptar respuesta textual y no solicitar secretos.
- Trabajar por una línea funcional coherente, con pruebas y evidencia en la misma PR; evitar PRs documentales paralelas o cambios de alcance silenciosos.
- Si un requisito, política comercial o decisión de permisos no está definido, no inventarlo: mantenerlo bloqueado/deshabilitado y elevar una única pregunta concreta cuando sea imprescindible.
- No declarar que no habrá ningún percance como garantía absoluta. El objetivo es prevenir, detectar y recuperarse de fallos mediante controles, pruebas y criterios GO/NO-GO.

## 7. Relación con el plan vigente

Este criterio concreta el alcance P0 del plan de entrega MVP 2026-12-01. No reemplaza ni invalida el plan por fechas, el roadmap de seguridad, las decisiones BCV, la matriz de permisos ni las tareas ODD/SDD. Si una tarea planificada contradice este criterio, registrar la diferencia y resolverla explícitamente antes de implementar.
