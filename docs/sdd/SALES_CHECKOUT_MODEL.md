# Modelo de ventas y checkout transaccional

**Estado:** la base de datos ya contiene parte importante del contrato de checkout; el handler HTTP no está integrado en `main`. El código de PR #233 es una fuente de recuperación, no una implementación aprobada para producción.  
**Fecha:** 2026-11-07 UTC  
**Dependencias vigentes:** migraciones canónicas 0013–0016 en `main`; motor monetario `@micro-app/money`; autorización tenant/branch; locks de warehouse/balances/turno; integración BCV en la rama PR #287 OPEN/Draft. PR #255 fue cerrada como supersedida por #287; ninguna de estas ramas está integrada en `main`.  
**Límites:** este documento no autoriza merge, Neon, Cloudflare, despliegue ni activar checkout.

## 1. Objetivo y principios

Confirmar una venta, sus líneas, pagos, consumo de inventario, snapshots monetarios e historial de auditoría en **una sola transacción PostgreSQL**. No puede existir una venta completada sin pagos/líneas conciliados ni un balance alterado sin su movimiento de ledger correspondiente.

El backend es autoridad de precios, permisos, stock, tasa BCV, importes y snapshots. El cliente envía identificadores, cantidades y pagos como strings decimales; nunca subtotales, descuentos, importes calculados ni tasas calculadas por el navegador.

Reglas ya aprobadas/documentadas:
- USD es la moneda base del catálogo.
- Sin descuentos, promociones ni override manual del precio de lista.
- Sin descuentos, promociones ni override manual del precio de lista en el modelo/checkout actual.
- El propietario decidió el 2026-11-05 que Micro-app no tendrá descuentos. La decisión histórica del 2026-10-31 sobre quién podría aprobarlos queda supersedida; no implementar descuentos, promociones, campos, endpoints, UI ni flujos de autorización. La migración `0014_sales_without_discounts.sql` y este modelo deben permanecer sin descuentos.
- Aritmética monetaria con BigInt y strings decimales mediante `@micro-app/money`.
- Cantidad: NUMERIC(14,3); precio/costo USD: NUMERIC(14,4); BCV: NUMERIC(18,8); VES: NUMERIC(16,2).
- Redondeo half-away-from-zero donde corresponda, igual que PostgreSQL `numeric round`.
- Toda venta requiere una tasa BCV vigente y válida para su fecha efectiva, incluso si el cliente paga 100 % en USD. Los pagos USD-only no convierten importe, pero sí deben guardar el snapshot BCV obligatorio. Los pagos VES usan esa tasa para la conversión. La tasa y los importes históricos se congelan en la venta; nunca se recalculan con la tasa actual.

## 2. Evidencia real del esquema y código en main

### Garantías ya presentes

- `sales`: migración 0015 añadió `branch_id`, `register_shift_id`, `warehouse_id`, `settlement_currency` y `request_hash`; la clave idempotente es única por organización.
- `sales_completed_checkout_context_ck`: aunque se añadió `NOT VALID` para no invalidar ventas históricas, se aplica a nuevas ventas y exige branch/shift/warehouse, moneda de liquidación y hash.
- `sales_checkout_lifecycle_guard`: la venta nueva debe comenzar como `draft`; solo permite transición draft→completed y mantiene inmutables los snapshots/propiedad. No permite borrar ventas.
- `assert_completed_sale_reconciled`: trigger diferible que comprueba líneas, subtotal/total, pagos, moneda única, equivalentes USD, BCV, turno propio abierto, almacén activo, movimientos de inventario y evento de auditoría.
- `payments_ves_amount_scale_ck`: pagos VES quedan limitados a dos decimales.
- `lock_open_register_shift`: función SECURITY DEFINER con search_path restringido para bloquear el turno y comprobar organización, sucursal, caja, usuario y membresías activas sin ampliar grants runtime.
- `0010_inventory_balance_ledger_coupling.sql`: cada cambio no cero en `inventory_balances` genera un intent transaccional que debe consumirse con un movimiento ledger exacto antes del COMMIT.
- `0013_bcv_official_rate.sql`: tasa BCV con precisión NUMERIC(18,8) y grants runtime column-scoped.
- `0014_sales_without_discounts.sql`: elimina el campo de descuento del modelo comercial; total USD debe ser igual a subtotal.
- `0015_sales_checkout_atomicity.sql`: guardrails de ciclo de vida y reconciliación para checkout.
- `@micro-app/money`: motor exacto ya presente en main. `catalog-write.ts` usa validación decimal y el catálogo/UI ya están integrados.
- `withDatabaseTransaction`, `authorizeTenantOperation`, `authorizeBranchOperation`, `lockInventoryWarehouses`, `lockInventoryBalances` y `resolveOpenCashierRegisterShift` existen en main.

### Lo que todavía NO está integrado

- No hay handler `POST checkout` registrado en `apps/api/src/index.ts`.
- No hay flujo de carrito/checkout UI integrado.
- El handler `sales-checkout.ts` de PR #233 es código fuente para recuperar y revisar; no debe copiarse wholesale.
- PR #229–#231 aportan motor monetario/catálogo/formulario que ya están en main en forma igual o más completa. PR #228 comparte la migración 0014 canónica; su handler/tests también son inferiores a la implementación actual. Comparar y cerrar como supersedidas solo después de preservar cambios realmente únicos.
- PR #232 contiene este diseño, pero su texto original quedó obsoleto respecto a las migraciones 0014/0015 y debe mantenerse actualizado.

## 3. Política BCV estricta y bloqueo de fines de semana/feriados

**Decisiones de producto vigentes:** toda venta requiere una tasa BCV válida cuya `effective_date` coincida exactamente con la fecha de operación en `America/Caracas`, incluso si el cliente paga 100 % en USD. Una tasa publicada anticipadamente solo puede usarse desde su fecha efectiva; nunca antes. Si no existe una fila oficial válida para la fecha exacta, el checkout falla cerrado.

**Estado real de migraciones en PR #287 (OPEN/Draft; no integrado en main):**
- Migration `0017_checkout_bcv_weekend_effective_date.sql` introdujo inicialmente una selección de la siguiente fecha efectiva futura en fines de semana. Es una etapa histórica/provisional de la rama, no la política final.
- Migration `0020_bcv_effective_date_strict.sql` reemplaza esa función para devolver siempre la fecha local de Caracas de la operación, cualquier día de la semana. Su comentario establece expresamente que no se sustituye por una tasa anterior ni futura.
- Migration `0021_bcv_sync_state.sql` añade el estado persistente de sincronización y un trigger diferido que exige el último éxito de sincronización al completar una venta.
- Las assertions de `0020` y `0021` forman parte de la validación de la rama #287. No crear otra migration `0017` ni volver a introducir la selección de una fecha futura en fin de semana.

**Consecuencia operativa:** sábado, domingo y feriado no reciben una excepción implícita. Si BCV no tiene una tasa con fecha efectiva exactamente igual al día de operación, el checkout queda bloqueado, aunque exista una tasa prepublicada para el siguiente día hábil. Esto respeta la prohibición de usar tasas futuras antes de su fecha efectiva.

**Riesgo legal/contable pendiente:** la referencia histórica al artículo 25 de la Ley del IVA indica que para hechos imponibles en días no hábiles del sector financiero puede corresponder el tipo de cambio del siguiente día hábil. Esa regla puede entrar en tensión con la decisión de no utilizar una tasa antes de su `effective_date`. No resolver esta tensión inventando una excepción ni cambiando la política en código: mantener el checkout bloqueado en esos días y obtener revisión legal/contable y una decisión explícita antes de habilitar operación de fines de semana/feriados.

**Regla de latest-success:** además de la fila exacta `validation_status='valid'`, checkout exige que `bcv_sync_state` exista, que el último outcome sea `inserted` o `unchanged`, que `last_success_at` no sea nulo y que `last_effective_date` no sea anterior a hoy. Los estados `running`, `failed`, `older`, ausentes o incompletos bloquean nuevas ventas. La lectura `FOR SHARE` serializa checkout frente al inicio de una nueva sincronización.

## 4. Brechas de integridad restantes para revisar

1. El trigger 0015 reconcilia sumas de `line_total_usd` y `line_total_ves`, pero no demuestra por sí solo que cada línea cumpla `quantity × unit_price_usd_snapshot` ni que `line_total_ves` sea el redondeo de la línea USD por la tasa snapshot. El handler debe calcularlo con `@micro-app/money`; evaluar una assertion SQL adicional para defensa en profundidad.
2. El trigger verifica que los equivalentes USD de pagos sumen el total USD y que los pagos VES compartan el snapshot BCV, pero no verifica completamente el algoritmo de asignación proporcional por pago. Revisar el algoritmo del handler y decidir si se añade validación SQL.
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

Antes de activar checkout, el contrato comercial de pagos sigue **sin aprobación explícita**. Las constraints actuales de SQL son límites técnicos existentes, no una decisión de producto. No ampliar el contrato ni habilitar el checkout hasta definir y documentar los métodos de pago admitidos, pagos parciales/mixtos, sobrepago/cambio y la idempotencia correspondiente. No pedir de nuevo decisiones ya aprobadas sobre BCV ni descuentos.
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
- En fines de semana y feriados, exigir una tasa oficial con `effective_date` exactamente igual a la fecha local de operación; no usar anticipadamente la tasa del siguiente día hábil. Si no existe, fail closed. Cualquier excepción requiere revisión legal/contable y decisión explícita del propietario.

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
- BCV exacta por fecha Caracas todos los días; rechazo de tasas futuras antes de su fecha efectiva y fail-closed si no existe fila exacta.

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
10. tasa BCV exacta para fecha de operación, tasa futura prepublicada aún no efectiva, fines de semana/feriados sin fila exacta y ausencia de tasa;
11. feriado entre semana sin fecha efectiva exacta: fail closed;
12. pagos con moneda/escala inválida, parcial/excesivo según contrato SQL;
13. sumas de líneas/pagos/snapshots/ledger reconciliadas;
14. ningún UPDATE/DELETE del ledger ni edición de venta completada;
15. roles owner/admin/cashier/inventory y permisos runtime;
16. migration 0020 impone fecha efectiva exacta todos los días y 0021 exige último éxito de sincronización; 0017 es una etapa histórica provisional y no debe recrearse ni restaurarse.

Todas las pruebas usan PostgreSQL efímero; nunca Neon main ni datos reales.

## 9. Secuencia de recuperación

1. Mantener esta especificación alineada con el esquema actual; no usar el texto histórico de 2026-11-05.
2. Mantener bloqueado el checkout hasta que el contrato de pagos no definido (métodos, parcial/mixto, sobrepago/cambio) tenga una decisión explícita; no inferirla de las constraints SQL.
3. Validar en la rama #287 las migrations 0020/0021 y sus assertions: fecha efectiva exacta, fail-closed en fines de semana/feriados sin fila exacta, y último sync exitoso. No crear una migration 0017 duplicada.
4. Portar el handler de PR #233 sobre una rama basada en #255, usando `findApplicableBcvRate(tx)`, helpers canónicos y migration 0015 actual; no portar su migration 0015 antigua.
5. Añadir las assertions de cálculo por línea y asignación de equivalentes si la revisión confirma que el SQL actual no las cubre.
6. Ejecutar unitarias, CI, migration runner, PostgreSQL admin/runtime integration, E2E y backup/restore cuando aplique; todos sobre el SHA final exacto.
7. Solo después implementar UI de checkout; no duplicar cálculos monetarios en React.

## 10. Estado operativo

- Main actual al redactar: `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4`.
- PR #251: cleanup auth 48 h, Draft, 11/11 workflows PR + 2/2 push security exitosos; producción bloqueada por Neon schema/runtime.
- PR #255: cerrada como supersedida por PR #287; su snapshot de HEAD/checks es histórico y no debe reutilizarse como validación actual.
- PR #287: integración BCV + checkout, OPEN/Draft; consultar `docs/CURRENT_STATE.md` para HEAD y checks exactos. No está integrada en `main`.
- PR #227/#228–#233 son ramas fuente históricas. #229–#231 están mayormente supersedidas por código ya integrado; #232 aporta este diseño; #233 aporta handler/tests únicos que requieren adaptación.
- Migration 0015 existe en GitHub main, pero Neon main no ha recibido baseline/migraciones 0003–0016. No asumir que el esquema live tiene checkout listo.
- Producción **NOT READY**. No Neon main, secretos, Cloudflare productivo, DNS, billing ni datos reales modificados.
