## Corrección de política BCV — 2026-11-08

**Regla autoritativa:** una tasa publicada anticipadamente solo puede usarse desde su `effective_date`. Una tasa con fecha efectiva lunes no se usa viernes, sábado ni domingo. El API, handler y trigger SQL deben exigir coincidencia exacta con la fecha Caracas de la operación; sin fila oficial exacta y válida, bloquear checkout, también en ventas 100 % USD. Los pagos conservan sus importes/monedas originales y snapshots inmutables.

## Política de vigencia BCV confirmada por el propietario — 2026-11-08 UTC

**Decisión:** se permite utilizar la tasa del siguiente día hábil cuando el BCV la haya publicado anticipadamente de forma oficial y la propia fuente indique esa fecha efectiva. La tasa no se puede aplicar antes de su `effective_date`.

Reglas obligatorias:
1. La elegibilidad se determina por la fecha efectiva de la operación y la `effective_date` publicada explícitamente por BCV; nunca por la fecha local de descarga ni por una predicción del calendario.
2. Una tasa futura publicada oficialmente puede cubrir sábados, domingos y feriados únicamente desde la fecha efectiva indicada por BCV. Ejemplo: una tasa publicada el viernes con `effective_date` lunes se puede utilizar el lunes, no el viernes, sábado ni domingo.
3. Si BCV no publica anticipadamente una tasa aplicable a la fecha efectiva de la operación, no se debe promover silenciosamente la última tasa anterior como vigente: conservarla para auditoría, marcar la fuente/dato como stale o unavailable y bloquear checkout.
4. Si una sincronización falla, no se borra ni sobrescribe el último dato histórico válido. Sin embargo, su existencia no demuestra frescura ni autoriza su uso para nuevas ventas.
5. Checkout requiere tasa aplicable para todas las ventas, incluidas las pagadas 100% en USD. El snapshot aplicado es inmutable y los importes/monedas de pago no se convierten ni cobran dos veces.
6. La fuente debe ser BCV oficial; no se aceptan tasas inferidas, copias de terceros ni fechas supuestas.
7. La selección debe soportar tasas prepublicadas sin que una fila futura suprima la inserción o selección de una fecha efectiva anterior.
8. No se fija un umbral arbitrario de minutos/horas para `fetched_at`. La frescura operativa se debe basar en un registro separado de último intento/último éxito, resultado de sincronización y estado del proveedor. Definir y probar una política explícita de degradación; no confundir `fetched_at` de inserción con última comprobación exitosa.

**Ejemplos de aceptación:** viernes con tasa oficial efectiva lunes → el lunes usa esa tasa; sábado sin tasa oficial futura efectiva sábado → checkout bloqueado; tasa efectiva lunes no se usa el domingo; fallo de Cron conserva historial pero no certifica una tasa actual.

**No autoriza:** activar el Cron, desplegar #255, merge a main, escribir en Neon ni relajar gates de producción. PR #255 y #269 permanecen Draft hasta que el comportamiento, pruebas, calendario oficial, observabilidad y despliegue seguro estén revisados.

---

## Decisión de producto confirmada — 2026-11-08 UTC

- El propietario confirma que **toda venta exige una tasa BCV vigente, incluso si todos los pagos se liquidan exclusivamente en USD**. Esta decisión reemplaza cualquier snapshot histórico de este documento que marque USD-only/BCV como pendiente.
- El handler de checkout consulta una tasa aplicable antes de crear/finalizar la venta y responde `409 BCV_RATE_NOT_CURRENT` si no existe una tasa aplicable con `validation_status = 'valid'`. La migración 0017 también valida la tasa y su fecha efectiva al reconciliar la venta completada.
- Los importes y monedas originales de los pagos se conservan. El equivalente USD/VES se registra como snapshot contable de asignación; el total VES derivado de la tasa es referencial para ventas liquidadas en USD y no representa conversión ni cobro adicional.
- La tasa aplicada queda en `sales.exchange_rate_id` y `sales.exchange_rate_snapshot`; no se debe reescribir retroactivamente una venta al cambiar una tasa posterior.
- **No queda aprobado por esta decisión:** contrato comercial completo de parciales, sobrepago/cambio, UI/recibos, y flujos de devolución/anulación con su auditoría. Esos puntos requieren revisión y pruebas antes de sacar Draft.
- La regla de checkout depende de la fiabilidad del productor BCV (#255). No activar su Cron ni desplegarlo como consecuencia de esta decisión.

---

## Estado autoritativo posterior al rehearsal Neon y PR #282 — 2026-11-08 UTC

- Main usado: `9c6b30281ed59726e532da840568fc9e80b528f7`; PR #269 actual HEAD `8615c75ac8a339f5591ea268e0b6c6d6473ae6d3`, 25 ahead / 0 behind tras merge commit no destructivo. Ese HEAD pasó 16/16 check-runs y 14/14 workflows SUCCESS, incluidos los seis contextos requeridos. Mantener Draft por gates de producto.
- Neon rehearsal #42507066215 SUCCESS aplicó 0001–0019 desde source `6227a3a8497f6be94d675b64da5da61530c200fc` exclusivamente en `microapp_rehearsal`. Los blobs de 0017–0019 y del código checkout/counts consultado coinciden con el HEAD pre-sync. No hubo escrituras en Neon main.
- Migration 0018 **resuelve** la antigua brecha de ordinal: `allocation_position`, índice único y constraint triggers diferidos verifican posiciones contiguas, asignación USD por pago, redondeo y residuo final; assertions y test de manipulación/rollback incluidos.
- Migration 0019 elimina las escrituras runtime directas de `inventory_balances`; el ledger append-only proyecta balances. Los tipos de movimiento soportados por esta implementación son opening, count_adjustment y sale; transfer dispatch/receipt de dos etapas todavía no está implementado y se rechaza.
- El source SHA 6227 pasó 16/16 check-runs y 14/14 workflows con pruebas runtime-role/checkout en PostgreSQL desechable; además, el HEAD sincronizado `8615c75...` pasó sus propios 16/16 check-runs y 14/14 workflows. Nuevos commits requieren nueva validación exact-SHA.
- **Bloqueos del snapshot histórico:** la decisión de BCV para ventas USD-only ya fue confirmada después; sigue pendiente el contrato comercial completo de pagos. La política estricta por fecha efectiva está en la rama de trabajo mediante migration 0020 y requiere CI nuevo. Freshness/last-success, alerta persistente, fixture HTML oficial, calendario de feriados, UI de checkout y validación runtime/producción siguen abiertos. Producción NOT READY.

Los snapshots de SHA/PR y los estados que siguen en este documento son históricos; prevalece este bloque y el estado vivo de CURRENT_STATE/HANDOFF. No reutilizar checks antiguos ni ejecutar más escrituras Neon.

---

## Actualización autoritativa de recuperación — 2026-11-08 UTC

Este modelo incorpora el diseño técnico más reciente recuperado de PR #258/#262. La implementación está en PR #269 (`feat/checkout-ledger-recovered-main-20261108`), no en `main`, Neon ni producción. Main al sincronizar esta rama: `9c6b30281ed59726e532da840568fc9e80b528f7`. La validación inicial de código en HEAD `730bcd32776b76b22d2176fa3d09c5b7035e62a3` pasó 16/16 check-runs y 11/11 workflows; cualquier commit posterior exige revalidación exact-SHA.

**Bloqueos vigentes:** productor/Cron BCV #255 no integrado; Neon rehearsal #42507066215 completado en `microapp_rehearsal`; no repetir escrituras; contrato comercial de pagos pendiente de aprobación; UI de checkout y calendario oficial de feriados weekday pendientes. No declarar checkout listo ni habilitarlo en producción.

---

## Delta autoritativo — 2026-11-08 05:20 UTC

> Este delta actualiza el estado de las brechas que se enumeran más abajo. La implementación sigue en PR #258 Draft; no está integrada en main ni aplicada en Neon.

- **Migration 0018 — asignación individual de pagos VES:** añade `payments.allocation_position` nullable (para no reescribir pagos históricos), rango 1..10, índice único por organización/venta/posición y constraint triggers diferidos sobre `sales` y `payments`. La función SECURITY DEFINER, propiedad de `microapp_migrator`, con `search_path=pg_catalog` y sin EXECUTE para PUBLIC/runtime, comprueba posiciones contiguas, equivalentes USD truncados a 4 decimales y residuo del último pago.
- **Handler:** persiste la posición de cada pago y devuelve pagos en ese orden.
- **Pruebas PostgreSQL:** caso positivo de pago VES dividido; caso negativo modifica +0.0001/-0.0001 manteniendo el agregado total y demuestra rollback de venta, balance y ledger. Ambas pasan.
- **Rate limit:** 60 solicitudes/minuto por IP confiada `CF-Connecting-IP`; HMAC con `GOOGLE_CLIENT_SECRET` existente, sin guardar IP cruda; 429 con `Retry-After`, y 503 fail-closed si falta IP/pepper o falla DB. La prueba de integración verifica el 61.º intento.
- **Validación exacta del HEAD de código e44b3b606daab7a5470a2315f8545143a9b4dceb:** 15/15 check-runs, 13/13 workflows, 141 unit tests, 85 runtime-role PostgreSQL tests y 19 checkout PostgreSQL integration tests SUCCESS.
- **No equivale a producción:** #258 sigue Draft y sin review formal independiente; falta integrar el productor BCV #255, aprobar el contrato comercial de pagos, mantener la proyección ledger-only de migration 0019 y revalidar permisos runtime en CI exact-HEAD, UI, calendario weekday y Neon rehearsal protegido.

---

# Modelo de ventas y checkout transaccional

**Estado:** handler HTTP, pruebas unitarias/PostgreSQL y migración 0017 recuperados sobre main en PR #258 Draft. HEAD `31a1d14f1fa85fa826035ea0f10d6db18e93e2fd`: 15/15 check-runs y 13/13 workflows SUCCESS; 141 unit tests, 85 runtime-role tests y 16 checkout PostgreSQL tests. No desplegado ni aprobado para producción.  
**Fecha:** 2026-11-08 UTC  
**Dependencias vigentes:** main `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`; migraciones canónicas 0013–0016; motor monetario `@micro-app/money`; autorización tenant/branch; locks de warehouse/balances/turno. El productor/API/Cron BCV sigue en PR #255 Draft, HEAD `a31892ae74958573a741cb36470182da6bdd529e`, 15/15 check-runs y 13/13 workflows SUCCESS, pero todavía no está integrado en main.  
**Límites:** este documento no autoriza merge, Neon, Cloudflare, despliegue ni activar checkout.

## 1. Objetivo y principios

Confirmar una venta, sus líneas, pagos, consumo de inventario, snapshots monetarios e historial de auditoría en **una sola transacción PostgreSQL**. No puede existir una venta completada sin pagos/líneas conciliados ni un balance alterado sin su movimiento de ledger correspondiente.

El backend es autoridad de precios, permisos, stock, tasa BCV, importes y snapshots. El cliente envía identificadores, cantidades y pagos como strings decimales; nunca subtotales, descuentos, importes calculados ni tasas calculadas por el navegador.

Reglas ya aprobadas/documentadas:
- USD es la moneda base del catálogo.
- Sin descuentos, promociones ni override manual del precio de lista.
- Aritmética monetaria con BigInt y strings decimales mediante `@micro-app/money`.
- Cantidad: NUMERIC(14,3); precio/costo USD: NUMERIC(14,4); BCV: NUMERIC(18,8); VES: NUMERIC(16,2).
- Redondeo half-away-from-zero donde corresponda, igual que PostgreSQL `numeric round`.
- La tasa y los importes históricos se congelan en la venta; nunca se recalculan con la tasa actual.

## 2. Evidencia real del esquema y código en main

### Garantías ya presentes

- `sales`: migración 0015 añadió `branch_id`, `register_shift_id`, `warehouse_id`, `settlement_currency` y `request_hash`; la clave idempotente es única por organización.
- `sales_completed_checkout_context_ck`: aunque se añadió `NOT VALID` para no invalidar ventas históricas, se aplica a nuevas ventas y exige branch/shift/warehouse, moneda de liquidación y hash.
- `sales_checkout_lifecycle_guard`: la venta nueva debe comenzar como `draft`; solo permite transición draft→completed y mantiene inmutables los snapshots/propiedad. No permite borrar ventas.
- `assert_completed_sale_reconciled`: trigger diferible que comprueba líneas, subtotal/total, pagos, moneda única, equivalentes USD, BCV, turno propio abierto, almacén activo, movimientos de inventario y evento de auditoría.
- `payments_ves_amount_scale_ck`: pagos VES quedan limitados a dos decimales.
- `lock_open_register_shift`: función SECURITY DEFINER con search_path restringido para bloquear el turno y comprobar organización, sucursal, caja, usuario y membresías activas sin ampliar grants runtime.
- `0010_inventory_balance_ledger_coupling.sql`: cada cambio no cero en `inventory_balances` genera un intent transaccional que debe consumirse con un movimiento ledger exacto antes del COMMIT.
- `0013_bcv_official_rate_precision_and_grants.sql`: tabla/tasa BCV con precisión NUMERIC(18,8) y grants runtime column-scoped; el parser/API/Cron proveedor está pendiente de PR #255.
- `0014_sales_without_discounts.sql`: elimina el campo de descuento del modelo comercial; total USD debe ser igual a subtotal.
- `0015_sales_checkout_atomicity.sql`: guardrails de ciclo de vida y reconciliación para checkout.
- `@micro-app/money`: motor exacto ya presente en main. `catalog-write.ts` usa validación decimal y el catálogo/UI ya están integrados.
- `withDatabaseTransaction`, `authorizeTenantOperation`, `authorizeBranchOperation`, `lockInventoryWarehouses`, `lockInventoryBalances` y `resolveOpenCashierRegisterShift` existen en main.

### Lo que todavía NO está integrado

- PR #258 registra `POST /api/orgs/:organizationId/branches/:branchId/checkout`, con autorización branch, idempotencia, exact decimals, locks de warehouse/stock/turno, pagos, ledger y audit en una sola transacción. Sigue Draft; HEAD `31a1d14f1fa85fa826035ea0f10d6db18e93e2fd` pasó 15/15 check-runs y 13/13 workflows; no hay review formal independiente registrada.
- No hay flujo de carrito/checkout UI integrado.
- La selección BCV anterior weekday/weekend de migration 0017 es histórica y queda supersedida por migration 0020; el productor/Cron sigue en la rama separada #255.
- PR #229–#231 aportan motor monetario/catálogo/formulario que ya están en main en forma igual o más completa. PR #228 comparte la migración 0014 canónica; su handler/tests también son inferiores a la implementación actual. Comparar y cerrar como supersedidas solo después de preservar cambios realmente únicos.
- PR #232 contiene este diseño, pero su texto original quedó obsoleto respecto a las migraciones 0014/0015 y debe mantenerse actualizado.

## 3. Política BCV estricta por fecha efectiva

**Base normativa:** el artículo 25 de la Ley del IVA dispone que, si el hecho imponible ocurre en un día no hábil para el sector financiero, la equivalencia se calcula con el tipo de cambio vigente el día hábil inmediatamente siguiente. Referencia documental: Gaceta Oficial N.º 6.507 Extraordinario (29-01-2020), artículo 25: <https://www.ivecofi.net/informacion/legislacion/leyes/ley-impuesto-valor-agregado/titulo-iv>. La fecha efectiva del BCV debe corresponder a ese siguiente día hábil. Esto es una referencia normativa para el diseño, no asesoría legal/contable. La instrucción operativa expresa del propietario es no aplicar una tasa antes de su `effective_date`, incluso en fin de semana; la conciliación jurídica/fiscal de esa política con el artículo 25 requiere validación profesional antes de producción.

La API y el handler de checkout requieren `effective_date = fecha Caracas de hoy` para todos los días, incluidos sábado, domingo y feriados. Una tasa publicada anticipadamente para el lunes permanece `scheduled` hasta el lunes; nunca se usa viernes, sábado ni domingo. Si falta la fila exacta del día o está stale, la API no la presenta como vigente y checkout falla cerrado. No hay fallback a una fecha anterior ni futura.

La migration 0017 histórica introdujo originalmente selección weekday/weekend y fue aplicada en el ensayo aislado documentado. Su contenido y checksum se preservan. La corrección de política se añade mediante migration 0020 (`0020_bcv_effective_date_strict.sql`), que reemplaza `applicable_bcv_effective_date()` para devolver estrictamente la fecha Caracas de la operación. La migration 0020 tiene assertions de seguridad y de fechas sábado/domingo/lunes; CI y migration-check la ejecutan, y migration-check verifica rollback atómico. Esta nueva migración todavía requiere validación CI exact-HEAD; no se han repetido escrituras Neon.

Las validaciones SQL diferidas por línea de migration 0017 siguen exigiendo `line_total_usd = round(quantity * unit_price_usd, 4)` y `line_total_ves = round(line_total_usd * exchange_rate_snapshot, 2)`. No se debe modificar retrospectivamente la migration 0017 ni reutilizar sus checks históricos para el nuevo HEAD.

El handler #269 consulta una fila BCV válida con fecha efectiva exactamente igual a la fecha Caracas actual. La fuente de datos/Cron sigue dependiendo de la integración #255. El calendario oficial de feriados continúa siendo un gate operativo para la programación y verificación de publicaciones; no permite anticipar la aplicación de una tasa futura. No ejecutar migraciones en Neon main.

## 4. Brechas de integridad restantes para revisar

1. **Resuelto en la rama #258 mediante migration 0017:** el trigger diferido ahora valida por línea `quantity × unit_price_usd` redondeado a 4 decimales y `line_total_usd × exchange_rate_snapshot` redondeado a 2 decimales. La assertion SQL comprueba el contrato y el test PostgreSQL manipula el importe antes del COMMIT para demostrar rechazo/rollback. No está todavía en main ni aplicado en Neon.
2. **Resuelto por migration 0018:** `payments.allocation_position` conserva el ordinal de cada pago; el constraint trigger diferido valida posiciones contiguas, equivalentes USD truncados a cuatro decimales y residuo del último pago. Las assertions SQL y la prueba PostgreSQL de manipulación +0.0001/-0.0001 demuestran rechazo y rollback. No queda abierta la brecha de ordinal descrita en el snapshot histórico.
3. `payments` no tiene idempotencia individual; la clave/hash de `sales` debe cubrir el conjunto completo de pagos. No crear endpoint separado de pagos sin diseño de idempotencia.
4. `products.stock_quantity` es legado. Checkout solo puede consumir `inventory_balances` del warehouse elegido y registrar el movimiento correspondiente; no actualizar ambas representaciones.
5. La regla de feriados bancarios entre semana no está implementada. La conversión y checkout deben fallar cerrado si falta la fecha efectiva exacta.

## 5. Flujo transaccional requerido

El orden final debe respetar `docs/architecture/INVENTORY_TRANSACTION_LOCKING.md` y usar un único cliente:

1. Validar método/ruta, Origin confiable, content-type, límite de cuerpo, sesión, UUIDs, clave idempotente y estructura estricta; rechazar propiedades desconocidas.
2. BEGIN; resolver sesión, usuario, organización y membresía; revalidar tenant dentro de la transacción.
3. Resolver y bloquear branch context; no confiar en IDs de tenant/sucursal del navegador.
4. Bloquear warehouse activo de esa organización/sucursal con `lockInventoryWarehouses`.
5. Resolver el turno abierto del usuario autenticado con `resolveOpenCashierRegisterShift`; mantenerlo bloqueado hasta COMMIT.
6. Reclamar idempotency key/hash canónico por organización. Mismo key/hash devuelve la venta original sin efectos; mismo key/diferente hash devuelve 409.
7. Leer y bloquear productos activos; validar precio vigente, tenant y escala; consolidar IDs duplicados antes de bloquear balances.
8. Bloquear balances en orden estable product_id ASC; validar `on_hand - reserved >= quantity`; nunca stock negativo ni consumo de reservado.
9. Obtener tasa mediante `findApplicableBcvRate(tx)`; rechazar ausencia/stale y guardar ID, tasa y fecha efectiva exactos.
10. Calcular líneas en backend con BigInt; USD a 4 decimales; VES por línea a 2 decimales y sumar los importes VES ya redondeados.
11. Insertar venta draft con branch/shift/warehouse/actor/idempotency/hash/snapshots; insertar líneas y pagos.
12. Actualizar balances bajo locks; el trigger crea el intent. Insertar el movimiento sale exacto que consume el intent en la misma transacción.
13. Insertar evento audit `sale.completed` con actor, scope, turno, warehouse, sale y correlación; no incluir secretos ni datos sensibles.
14. Cambiar draft→completed; dejar que los triggers diferibles reconcilien líneas, pagos, BCV, turno, warehouse, ledger y audit antes de COMMIT.
15. Devolver snapshots persistidos. Replay idempotente no vuelve a consumir stock ni duplica pagos/movimientos/audit.

Cualquier error antes de COMMIT produce ROLLBACK total. No ejecutar correos/webhooks ni efectos externos dentro de la transacción.

## 6. Contrato monetario y pagos

### Líneas y totales
- Entrada de cantidad y pago solo como strings decimales; nunca confiar en Number/float del navegador.
- Precio de línea se lee de catálogo bajo scope autorizado; no aceptar precio enviado por cliente.
- `calculateLineUsd` produce cuatro decimales y valida límites; subtotal es suma exacta; total USD = subtotal.
- Calcular VES por línea con la tasa aprobada, redondear a dos decimales y sumar esos snapshots para `total_ves_snapshot`.
- No redondear subtotales USD a dos decimales ni introducir descuento.

### Pagos: estado actual y decisión funcional

La migration 0015 ya impone a nivel SQL una sola `settlement_currency` por venta y conciliación exacta del importe pagado con el total de esa moneda; por tanto no admite pagos parciales ni sobrepago/cambio en una venta completada. El handler de PR #233 sigue esa misma forma. No se encontró en el documento original una aprobación funcional explícita de estas reglas.

Antes de activar checkout, debe cerrarse la decisión comercial sobre si el contrato ya presente en SQL es el deseado:
- una sola moneda de liquidación por venta (USD o VES);
- no pagos parciales;
- no sobrepago ni cambio;
- pagos VES con dos decimales;
- equivalente USD por pago VES asignado con un algoritmo determinista cuya suma coincida exactamente con total_usd.

Si alguna regla no es la deseada, no se debe eludir el trigger: diseñar una nueva migration que cambie constraints y tests antes de activar el endpoint.

### Tasa y VES
- Una sola tasa BCV validada por venta.
- Congelar `exchange_rate_id`, `exchange_rate_snapshot` y `total_ves_snapshot`.
- No usar tasa de terceros, tasa stale ni tasa aproximada.
- Todos los días, usar exclusivamente la tasa con `effective_date` igual a la fecha Caracas de la operación; una tasa futura permanece programada y no se usa antes de su fecha, incluso en fines de semana y feriados.

## 7. Idempotencia, concurrencia y reversos

- Clave obligatoria para POST checkout, patrón acotado 1–128 caracteres ASCII seguros.
- Hash canónico incluye organización, sucursal, turno, warehouse, líneas ordenadas y pagos normalizados; no incluye subtotales ni tasas del cliente.
- Mismo key/hash: replay sin efectos. Mismo key/diferente hash: 409.
- Requests concurrentes con misma clave: una sola venta/pagos/movimientos/audit.
- Dos ventas concurrentes por la última unidad: solo una completa; la otra ve stock insuficiente.
- Locks en orden estable tenant→branch→warehouse→shift/document→balances→writes.
- No incluir void/refund/reversos, ajustes manuales de precio, reservas/backorders, fulfillment multi-warehouse por línea ni cierre/arqueo de caja en el primer checkout.
- Todo reverso futuro será una operación compensatoria, append-only, auditada e idempotente; nunca editar/borrar ventas, pagos o movimientos completados.

## 8. Pruebas de aceptación obligatorias

### Unitarias
- precio USD 23.8500 × cantidad 1.250 = 29.8125;
- escala excesiva, floats JSON, exponentes, espacios, negativos y overflow;
- redondeos half-away-from-zero;
- BCV ocho decimales y VES dos;
- hash estable ante orden distinto de líneas y normalización decimal;
- key reutilizada con payload distinto;
- selección BCV por fecha exacta de operación y rechazo de tasas futuras/prepublicadas antes de su `effective_date`.

### PostgreSQL desechable con migrator/runtime reales
1. venta completa: sale + líneas + pagos + balance + movimiento + audit en un COMMIT;
2. fallo tras update de balance y antes de ledger: rollback total;
3. mismo key/body simultáneo: una venta y replay;
4. mismo key/diferente body: 409 sin efectos adicionales;
5. dos checkouts por última unidad: solo uno completa;
6. stock reservado: rechazo;
7. producto/warehouse/branch/tenant cruzado: rechazo;
8. turno cerrado, de otro usuario o sucursal: rechazo;
9. cierre de turno concurrente: nunca venta fuera de turno;
10. tasa BCV exacta para la fecha de operación; rechazo de tasas futuras y de ausencia/stale;
11. feriado entre semana sin fecha efectiva exacta: fail closed;
12. pagos con moneda/escala inválida, parcial/excesivo según contrato SQL;
13. sumas de líneas/pagos/snapshots/ledger reconciliadas;
14. ningún UPDATE/DELETE del ledger ni edición de venta completada;
15. roles owner/admin/cashier/inventory y permisos runtime;
16. migration 0017 reemplaza solo la regla BCV y conserva todos los demás guardrails 0015.

Todas las pruebas usan PostgreSQL efímero; nunca Neon main ni datos reales.

## 9. Secuencia de recuperación

1. Mantener esta especificación alineada con el esquema actual; no usar el texto histórico de 2026-11-05.
2. Resolver la confirmación funcional del contrato de pagos antes de activar checkout.
3. Validar la migration 0017 de PR #258 y sus assertions PostgreSQL/migration-runner en el SHA exacto.
4. Validar PR #258 sobre la migración 0015 canónica y 0017 nueva; recuperar el productor y Cron BCV de #255 antes de activar checkout. No portar la migration 0015 antigua de #233.
5. La validación SQL por línea está añadida en migration 0017; queda abierta la validación independiente de la asignación proporcional individual por pago VES, resuelta por migration 0018 y `allocation_position`.
6. Ejecutar unitarias, CI, migration runner, PostgreSQL admin/runtime integration, E2E y backup/restore cuando aplique; todos sobre el SHA final exacto.
7. Solo después implementar UI de checkout; no duplicar cálculos monetarios en React.

## 10. Estado operativo

- Main actual al redactar: `912e4d269de3b7ac2d43632c9bfcdb10041dbae8` (#257 integrada por squash).
- PR #251: cleanup auth 48 h, Draft, HEAD `ded2d95681e9a9436fdb2c9630092379a60405cb`; 15/15 check-runs y 13/13 workflows SUCCESS; 26 ahead / 0 behind main; sin review formal.
- PR #255: BCV parser/API/UI/Cron y weekend selection, Draft, HEAD `a31892ae74958573a741cb36470182da6bdd529e`; 15/15 check-runs y 13/13 workflows SUCCESS; 45 ahead / 0 behind de base #251 `ded2d95681e9a9436fdb2c9630092379a60405cb`; sin review formal. No está integrado.
- PR #258: recuperación del checkout y migration 0017 weekday/weekend + aritmética SQL por línea, Draft, base main `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`; HEAD `31a1d14f1fa85fa826035ea0f10d6db18e93e2fd` pasó 15/15 check-runs y 13/13 workflows, 141 unit tests, 85 runtime-role tests y 16 checkout PostgreSQL tests. 22 ahead / 0 behind; sin review formal. La ingesta BCV #255 es prerequisite para activar operaciones con tasa real.
- PR #259: mergeada en main por squash como `07b146a3f2b7830bbd328a585535084e57e43c4e`; CI runtime-role PostgreSQL serializado. PR #257 documentación se integró por squash como main `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`.
- PR #233 queda como fuente histórica; su handler/tests se recuperaron en #258 sobre main. No fusionar la rama antigua ni reutilizar sus checks.
- Migration 0015 existe en GitHub main, pero Neon main no ha recibido baseline/migraciones 0003–0016. No asumir que el esquema live tiene checkout listo.
- Producción **NOT READY**. No Neon main, secretos, Cloudflare productivo, DNS, billing ni datos reales modificados.
