# Arquitectura SaaS de Micro app — decisiones y criterios de evolución

**Fecha:** 2026-10-29  
**Estado:** dirección arquitectónica recomendada para guiar el diseño; no autoriza por sí sola cambios de esquema, políticas comerciales sensibles, despliegues ni migraciones.  
**Repositorio:** https://github.com/BTF14/Micro-app  
**PR documental de continuidad:** https://github.com/BTF14/Micro-app/pull/156

## 1. Propósito y reglas de interpretación

Este documento conserva decisiones y criterios para que cualquier chat, agente o desarrollador pueda continuar sin reconstruir conversaciones. El repositorio es la fuente de continuidad. Distinguir siempre:

- **Dirección adoptada para diseño:** guía técnica recomendada por el propietario al delegar criterio arquitectónico.
- **Propuesta pendiente de aprobación:** especialmente permisos detallados, límites comerciales, descuentos, excepciones operativas y políticas financieras.
- **Implementado y verificado:** solo cuando existe código y evidencia identificable.
- **Pendiente:** no presentarlo como funcionalidad existente.

No inferir que una propuesta documental ya está implementada. No modificar producción, secretos, Neon `main`, datos reales ni recursos de pago. Presupuesto objetivo: **USD 0**.

## 2. Producto y modelo organizacional

Micro app será **una plataforma SaaS multi-organización, multi-sucursal y multiusuario**, no tres productos separados por tamaño.

- **Organización:** tenant y frontera de aislamiento de datos; representa el negocio que contrata Micro app, no necesariamente una entidad legal.
- **Sucursal:** unidad operativa dentro de una organización.
- **Usuario:** persona que puede pertenecer a una o varias organizaciones.
- **Membresía:** relación usuario-organización con rol, estado y alcance.
- **Almacén:** ubicación de existencias dentro de una sucursal; permitir más de uno cuando el negocio lo necesite.
- **Caja/terminal:** pertenece a una sucursal; turnos y cierres deben estar asociados a caja, sucursal y operador.
- **Operaciones:** ventas, devoluciones, compras/recepciones, movimientos, transferencias y cierres deben incluir la organización y el ámbito operativo correcto.

Un negocio de una sola ubicación debe poder empezar con una sucursal predeterminada creada durante onboarding; no obligarlo a administrar una estructura compleja.

### Propiedad y ámbito recomendado

| Dato/entidad | Ámbito predeterminado | Regla |
|---|---|---|
| Catálogo, categorías, SKU/barcodes | Organización | Compartido; evitar duplicación por sucursal |
| Proveedores y clientes | Organización | Compartidos salvo necesidad probada |
| Precio/lista de precios | Organización | Compartido por defecto; excepciones por sucursal en fase posterior |
| Existencias y reservas | Sucursal + almacén | Nunca sumar ni mostrar stock de otra sucursal como propio |
| Compras y recepciones | Organización + sucursal receptora | Recepción trazable por almacén |
| Ventas, pagos y devoluciones | Organización + sucursal + caja/turno cuando aplique | Instantáneas históricas e idempotencia |
| Movimientos de inventario | Organización + sucursal + almacén | Libro de movimientos trazable |
| Usuarios/membresías | Organización | Asignaciones de sucursal cuando el rol sea limitado |
| Informes | Organización y sucursal | Vistas por sucursal y consolidadas según permiso |
| Transferencias | Origen y destino | Salida y recepción formal, con autorizadores y trazabilidad |

No añadir `branch_id` indiscriminadamente a cada tabla. Añadirlo a las entidades operativas que realmente pertenecen a una sucursal y reforzar las relaciones con claves foráneas compuestas tenant-scoped.

## 3. Roles y autorización

Roles base recomendados: `owner`, `admin`, `cashier`, `inventory`. No introducir roles personalizados hasta que exista necesidad real y un modelo auditable.

- `owner` gobierna la organización y protege la continuidad de propiedad.
- `admin` gestiona operaciones según permisos delegados, sin poder apropiarse del rol owner.
- `cashier` opera caja/ventas dentro de sus sucursales y turnos asignados.
- `inventory` gestiona catálogo operativo, recepción y stock dentro del ámbito asignado, sin acceso financiero innecesario.

**Reglas de diseño obligatorias:** autorización en servidor por operación y recurso; denegar por defecto; validar organización y sucursal en cada consulta; no confiar en IDs del cliente; evitar que una organización quede sin owner activo; revocar sesiones al desactivar membresía/usuario; auditoría de cambios de rol y acciones sensibles.

La matriz `docs/sdd/role-permission-decision-matrix.md` sigue siendo propuesta. Su antigua recomendación de roles de alcance exclusivamente organizacional no debe interpretarse como decisión final para una plataforma multi-sucursal. Debe reconciliarse con asignaciones de sucursal y operaciones de caja antes de aprobarla. Cada organización define sus políticas comerciales, incluidos descuentos, límites y aprobaciones; Micro app no impone porcentajes ni importes universales. La plataforma debe aplicar esa configuración en servidor y conservar snapshots auditables. La facultad para configurar políticas y ejecutar excepciones debe definirse en la matriz aprobada. Ver `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`.

## 4. BCV y conversión USD/VES

Objetivo: USD como moneda base del catálogo/contabilidad interna y VES como conversión basada en una tasa identificable, sin inventar ni ocultar la frescura de la tasa.

### Diseño

1. Investigar y validar una fuente BCV fiable. No asumir que existe una API oficial gratuita ni codificar una URL no verificada.
2. Un Cron Trigger de Cloudflare consulta la fuente en horario programado; convertir correctamente el horario local de Venezuela a UTC y contemplar fines de semana/feriados.
3. Validar estructura, valor positivo, fecha efectiva, fuente, duplicados y cambios anómalos antes de persistir.
4. Persistir el histórico en `exchange_rates` (la tabla ya existe en el esquema revisado), con fuente, fecha efectiva, valor y estado de validación.
5. No escribir filas vacías ni repetir escrituras si no hay tasa nueva. Sin bucles de reintento.
6. Ante caída o dato inválido, conservar la última tasa válida y exponer su fecha/frescura y estado stale; no sustituirla por cero ni presentar una tasa inventada.
7. KV puede distribuir una copia de lectura de la tasa, con clave y versión controladas. Neon permanece como fuente persistente de verdad.
8. Cada venta/línea debe conservar la tasa, moneda, importe original, importe convertido, fecha efectiva y referencia/fuente usados en ese momento. Actualizar la tasa nunca recalcula ventas pasadas.

La automatización BCV y la API de consulta no están implementadas por el mero hecho de estar documentadas. El proveedor, la licencia/condiciones de acceso y la estabilidad de extracción son gates previos.

## 5. Buscador de productos y precio vigente

“Precio al momento” significa devolver el precio de venta vigente que Micro app tiene registrado, junto con la tasa BCV aplicable y su frescura cuando se muestra equivalencia en VES. No implica consultar un marketplace externo ni rastrear precios de competidores.

### Secuencia de búsqueda

1. Código de barras exacto.
2. SKU exacto.
3. Prefijo/normalización del nombre, usando índices apropiados.
4. Búsqueda parcial más costosa solo cuando sea necesaria y limitada.

Aplicar debounce en el cliente, longitud mínima razonable para búsquedas por texto, límite pequeño de resultados, paginación/cursor cuando corresponda, consultas parametrizadas, índices tenant-scoped y límites de frecuencia. La respuesta debe respetar la organización y, para existencias, sucursal/almacén.

### Fuente de verdad y caché

- Empezar con consulta SQL indexada y medir. No introducir KV para el catálogo antes de demostrar que Neon es cuello de botella.
- Neon/PostgreSQL es autoridad para catálogo, precio y stock.
- Caché es opcional, reconstruible, con TTL corto/versionado e invalidación al cambiar precio/producto; nunca debe cruzar tenants.
- No escribir una clave KV por producto en cada importación masiva. Los límites gratuitos de KV documentados históricamente incluyen una cuota de escrituras mucho menor que lecturas y límite de frecuencia por clave; verificar límites actuales de cuenta antes de depender de ellos.
- Si las mediciones justifican caché de catálogo, preferir snapshots/páginas por organización con versión y publicación agrupada, o caché HTTP cuidadosamente privada; comparar coste/consistencia y aislar sucursal cuando la respuesta incluya stock.
- No cachear respuestas autenticadas en caché pública compartida. No confiar en KV para autorización ni inventario transaccional.

La UI no debe emitir una petición por cada tecla. Agrupar consultas para listas y evitar N+1. Instrumentar cache hit ratio, SQL calls, latencia y coste por operación.

### Confirmación de venta

La caché solo acelera lectura. Al confirmar venta, la API debe volver a validar en PostgreSQL, dentro de una transacción, el precio autorizado, la existencia de la sucursal/almacén, la tasa seleccionada según la política vigente y los permisos. Guardar snapshots de precio, coste/tasa cuando aplique, descripción/SKU y cantidades para que el recibo histórico no cambie.

## 6. Integridad transaccional y finanzas

- Usar unidades monetarias decimales/NUMERIC; definir redondeo una sola vez y documentarlo.
- Cada venta, pago, devolución, compra, recepción y transferencia debe tener clave idempotente para que un reintento no duplique efectos.
- Venta, líneas, pagos, movimientos de stock y caja deben reconciliarse mediante transacciones y restricciones/validaciones.
- Controlar concurrencia al vender la última unidad; no permitir stock negativo por defecto.
- No borrar ventas cerradas ni editar hechos históricos: usar reversos/ajustes auditados.
- Registrar quién, cuándo, organización, sucursal, caja/turno, motivo y referencia.
- Los movimientos polimórficos deben validar que la referencia realmente pertenece al tenant y al tipo esperado.
- Probar pagos parciales/múltiples, redondeos, devoluciones parciales/totales, doble envío, timeout y concurrencia.

No activar offline-first de ventas en esta etapa. Es una decisión de complejidad y riesgo; reconsiderar solo con evidencia de una necesidad operativa real y una política explícita de reconciliación.

## 7. Seguridad, privacidad y operación

- Aislamiento multi-tenant como propiedad central: FKs compuestas, consultas filtradas por tenant, pruebas negativas cross-tenant y, si se evalúa RLS, primero probar contexto por request y pooling de Neon.
- Separar autenticación de autorización; sesión/membresía válida no concede acceso a toda operación.
- Validación de entradas, límites de cuerpo, rate limiting/abuse controls, paginación, timeouts y errores sin filtración de datos.
- Auditoría append-only desde las rutas normales para operaciones sensibles.
- Minimizar datos personales, limitar exportaciones y definir retención antes de añadir analítica.
- Backups cifrados y restauración técnica ya tienen evidencia; quedan pruebas de integridad de datos representativos, RPO/RTO, alertas, retención y coste total.

## 8. Capacidad y coste

No prometer número de organizaciones, sucursales, usuarios concurrentes ni búsquedas por segundo sin pruebas. Neon y Cloudflare tienen cuotas y límites independientes. Antes de fijar planes o límites comerciales, ejecutar pruebas sintéticas autorizadas y medir:
- latencia p50/p95/p99, errores y throughput;
- CU/compute, conexiones, almacenamiento y crecimiento de Neon;
- Workers requests/CPU/duración, KV reads/writes, Pages, egress/transferencia;
- tasa de aciertos de caché, consultas por búsqueda y coste por operación;
- concurrencia por organización y sucursal, y comportamiento bajo picos.

Definir umbrales conservadores, alertas, cuotas server-side y política de degradación. Los planes comerciales pueden diferenciarse por sucursales/capacidades/uso razonable, pero no fijar precios ni cuotas hasta medir costes reales. Evitar pérdida/bloqueo de datos al exceder cuota.

## 9. Secuencia de implementación

1. Reconciliar documentación y estado vivo de GitHub.
2. Completar auditoría read-only de esquema, rutas, índices, constraints, consultas y límites.
3. Aprobar el modelo de sucursal/almacén/caja y la matriz de roles/scope; dibujar ERD y reglas de integridad.
4. Diseñar migraciones compatibles y pruebas cross-tenant/cross-branch en PostgreSQL efímero.
5. Implementar por etapas: catálogo/búsqueda → inventario → compras/recepciones → caja/turnos → ventas/pagos → devoluciones/transferencias/reportes.
6. Investigar fuente BCV y automatización en paralelo documental; implementar después de contrato y pruebas de frescura/fallback.
7. Medir carga/coste y definir límites comerciales después de tener flujos reales.
8. Validar producción, backups, observabilidad, seguridad y recuperación antes de declarar readiness.

No saltar directamente a migraciones ni endpoints comerciales mientras la matriz de permisos y el modelo de datos no estén resueltos.

## 10. Pendientes explícitos

- Fuente BCV fiable/gratuita y mecanismo de extracción verificado.
- Contrato API para consulta de tasa y buscador de productos.
- Política de frescura/TTL de tasa y manejo de feriados/fuente caída.
- ERD de organización/sucursal/almacén/caja y entidades operativas.
- Matriz de roles con alcance por organización/sucursal/caja y umbrales comerciales.
- Método de valoración de inventario y política de costo/margen.
- Límites de descuento, cancelación/devolución y aprobaciones.
- Estrategia de caché de catálogo solo tras benchmark.
- Pruebas de capacidad de Neon y Cloudflare, cuotas y coste total.
- RPO/RTO, retención/alertas y validación de integridad del backup.

## 11. Estado de implementación conocido al 2026-10-29

- API Hono tiene autenticación y `GET /health`; no se han verificado rutas comerciales HTTP para catálogo/inventario/ventas/pagos/devoluciones.
- `exchange_rates` existe en el esquema inicial; Cron BCV y API pública/interna de tasa no están implementados.
- Índices tenant-scoped para nombre/SKU/barcode ya existen en el esquema inicial; buscador de producto todavía no está implementado como flujo comercial HTTP.
- El stock existente es por organización, no por sucursal.
- No hay modelo de sucursal/almacén/caja/turno en el esquema inicial revisado.
- La matriz de roles sigue sin aprobación.
- Capacidad sostenible y cuotas vivas de Cloudflare no están demostradas.
- Producción: **NO lista**.

## 12. Referencias del proyecto

Consultar `docs/INSPIRATION.md` y `docs/POS_REFERENCE_MATRIX.md` para patrones funcionales de OSPOS, NexoPOS, Lakasir y POSNext. Son referencias para requisitos y pruebas, no permiso para copiar código. Revisar licencias antes de reutilizar cualquier material.


## 13. Estrategia de consultas y conexiones Neon/Workers

La optimización debe reducir conexiones y trabajo de base de datos sin debilitar la consistencia:

- Para búsquedas/lecturas independientes de una sola consulta o batch fijo, evaluar el helper HTTP `neon()` de `@neondatabase/serverless`; evita abrir una sesión WebSocket interactiva para cada lectura.
- Reservar `Client` con transacción interactiva para operaciones que realmente necesitan varias sentencias atómicas: venta, pago, stock, ledger, devolución, recepción y transferencia.
- No usar el driver HTTP para simular una transacción de varias sentencias: no ofrece la misma semántica interactiva.
- El código actual `apps/api/src/database.ts` crea un `Client` request-scoped en `withDatabaseClient`; los endpoints de autenticación también lo usan para lecturas sencillas. Es un punto de medición/optimización, no un defecto demostrado ni permiso para refactorizar a ciegas.
- Antes de cambiar el helper, comparar en PostgreSQL efímero/preview aislado: latencia p50/p95, número de conexiones/sesiones, compute, errores, comportamiento en Workers y pruebas de integración. Mantener transacciones con `Client` hasta que se demuestre el patrón seguro.
- Cloudflare Hyperdrive es una opción futura de pooling, no una dependencia asumida: no está configurado en el repo y debe verificarse disponibilidad, cuotas y coste $0 antes de adoptarlo.
- Evitar N+1: la búsqueda devuelve campos necesarios en una sola consulta, y las pantallas cargan listas con límites/paginación. No ejecutar una consulta por cada resultado.
- Índices observados en `0001_initial.sql`: unicidad tenant-scoped para SKU y barcode y B-tree sobre `(organization_id, lower(name))`. Barcode/SKU exactos pueden aprovechar índices únicos. Para nombre, medir plan de ejecución de prefijo normalizado; no asumir que `ILIKE '%texto%'` usará el índice B-tree. Considerar `text_pattern_ops` o trigram/GIN solo si un benchmark realista demuestra necesidad y el coste de escritura/almacenamiento es aceptable.
- Usar `EXPLAIN (ANALYZE, BUFFERS)` con datos sintéticos representativos, nunca datos de clientes, para justificar índices. No añadir índices redundantes por anticipado: elevan almacenamiento y coste de escrituras.

**Criterio:** optimizar primero consultas, conexión y paginación; introducir caché distribuida o pooling solo cuando las mediciones demuestren un cuello de botella y la cuota gratuita vigente lo soporte.


## 14. Asignación de roles por alcance — diseño recomendado

Para evitar que un cajero de una sucursal pueda operar accidentalmente en todas las sucursales, el modelo debe separar **membresía organizacional** de **asignación operativa**:

- `owner` y `admin`: roles de alcance organizacional. Pueden administrar o supervisar varias sucursales según los permisos concretos aprobados.
- `cashier` y `inventory`: asignaciones de alcance sucursal, no roles globales que automáticamente den acceso a todas las ubicaciones.
- Una persona puede ser `cashier` en la sucursal A y `inventory` en la sucursal B, sin duplicar su identidad ni crear cuentas separadas.
- La membresía organizacional confirma que el usuario pertenece al tenant y está activa. La asignación sucursal-usuario confirma en qué sucursales y con qué rol puede operar.
- Dirección de esquema recomendada para la futura migración: mantener una relación de membresía `organization_members` y añadir una tabla tenant-scoped de asignaciones por sucursal (por ejemplo, `organization_member_branches` o `branch_memberships`) con `organization_id`, `branch_id`, `user_id`, rol permitido (`cashier`/`inventory`), estado y timestamps. Las FKs compuestas deben garantizar que usuario y sucursal pertenecen a la misma organización.
- No permitir que el valor `cashier` o `inventory` en la membresía se interprete como acceso a todas las sucursales. La migración debe retirar esa ambigüedad del modelo actual de `organization_members.role`; el diseño exacto de columnas y compatibilidad se cierra en el ERD antes de migrar.
- El contexto de API futuro debe resolver `userId`, `organizationId`, `organizationRole` y, cuando corresponda, `branchId`/asignación activa desde el servidor. Un `branchId` recibido del cliente es solo un selector solicitado; nunca una prueba de permiso.
- La autorización de caja requiere además una asignación/turno activo: ser cajero de una sucursal no autoriza a abrir, consultar ni cerrar la caja/turno de otra persona.
- El alcance de inventario por almacén puede restringirse más adelante si existe una necesidad real; empezar por sucursal y no crear permisos granulares innecesarios.
- Mantener el último `owner` activo protegido por una operación transaccional. Las altas, bajas y cambios de asignación deben auditarse.

Este es el diseño recomendado para el ERD y la futura matriz; **no es una migración implementada ni sustituye la aprobación explícita de permisos sensibles**. La matriz debe decidir por separado lectura de catálogo, edición de precios/costos, recepción, ajuste, descuento, devolución, cierre de caja, reportes y exportaciones.
