# Modelo de ventas y checkout transaccional

**Estado:** la base de datos ya contiene parte importante del contrato de checkout; el handler HTTP no está integrado en `main`. El código de PR #233 es una fuente de recuperación, no una implementación aprobada para producción.  
**Fecha:** 2026-11-07 UTC  
**Dependencias vigentes:** migraciones canónicas 0013–0016 en `main`; motor monetario `@micro-app/money`; autorización tenant/branch; locks de warehouse/balances/turno; tasa BCV recuperada en PR #255.  
**Límites:** este documento no autoriza merge, Neon, Cloudflare, despliegue ni activar checkout.

## 1. Objetivo y principios

Confirmar una venta, sus líneas, pagos, consumo de inventario, snapshots monetarios e historial de auditoría en **una sola transacción PostgreSQL**. No puede existir una venta completada sin pagos/líneas conciliados ni un balance alterado sin su movimiento de ledger correspondiente.

El backend es autoridad de precios, permisos, stock, tasa BCV, importes y snapshots. El cliente envía identificadores, cantidades y pagos como strings decimales; nunca subtotales, descuentos, importes calculados ni tasas calculadas por el navegador.

Reglas ya aprobadas/documentadas:
- USD es la moneda base del catálogo.
- Sin descuentos, promociones ni override manual del precio de lista.
- Sin descuentos, promociones ni override manual del precio de lista en el modelo/checkout actual.
- La matriz de permisos conserva una decisión previa sobre autorización de descuentos por Admin/Owner (`docs/sdd/role-permission-decision-matrix.md` §3), pero es una regla de autorización futura, no una capacidad habilitada. Los descuentos están fuera del P0 y no se pueden introducir sin reconciliar este modelo, la migración 0014 y el criterio MVP.
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

## 3. Bloqueador BCV: el trigger SQL de checkout no coincide con la regla de fin de semana

**Base normativa:** el artículo 25 de la Ley del IVA dispone que, si el hecho imponible ocurre en un día no hábil para el sector financiero, la equivalencia se calcula con el tipo de cambio vigente el día hábil inmediatamente siguiente. Referencia documental: Gaceta Oficial N.º 6.507 Extraordinario (29-01-2020), artículo 25: <https://www.ivecofi.net/informacion/legislacion/leyes/ley-impuesto-valor-agregado/titulo-iv>. La fecha efectiva del BCV debe corresponder a ese siguiente día hábil. Esto es una referencia normativa para el diseño, no asesoría legal/contable; cualquier caso fiscal especial requiere validación profesional.

La API BCV recuperada en PR #255 selecciona:
- Lunes–viernes: la fila con fecha efectiva de hoy.
- Sábado/domingo: la fila válida con la fecha efectiva futura más próxima publicada para el siguiente día hábil.
- Nunca salta una fila futura más próxima marcada stale para usar otra posterior.
- Si no hay fila aplicable/validada, falla cerrado.

Sin embargo, la función `public.assert_completed_sale_reconciled()` de migration 0015 todavía exige `exchange_rates.effective_date = fecha de hoy en Caracas`. Esto rechazaría una venta de sábado/domingo aunque la API haya seleccionado correctamente la tasa del lunes.

**Gate obligatorio antes de checkout:** crear una nueva migration 0017, sin modificar retroactivamente 0015, que reemplace de forma segura `assert_completed_sale_reconciled()` para aplicar la misma regla de fecha efectiva que la API:
- weekdays → fecha de hoy;
- weekends → MIN(effective_date) futura para source `BCV_OFFICIAL_HTML_V1`, sin filtrar validation_status en el MIN;
- la fila seleccionada debe seguir siendo `validation_status = 'valid'`, misma tasa/snapshot/source y bloqueada FOR SHARE;
- si la fila futura más próxima está stale, no se permite usar una posterior;
- feriados bancarios entre semana aún no tienen calendario autoritativo; por tanto se falla cerrado si no hay fila exacta para hoy.

La migration 0017 debe exigir login directo `microapp_migrator`, preservar SECURITY DEFINER/search_path, tener assertions sobre `pg_get_functiondef` y probarse con PostgreSQL desechable y el runner real. No ejecutar en Neon main.

El handler #233 también consulta actualmente `effective_date = today`; al recuperarlo debe usar el helper compartido `findApplicableBcvRate(tx)` de PR #255 y exigir `validation_status = 'valid'`. La API y el trigger SQL deben implementar exactamente la misma selección.

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

Antes de activar checkout, el propietario debe confirmar que el contrato ya presente en SQL es el deseado:
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
- En fin de semana usar la fecha valor del siguiente día hábil; en feriados entre semana, fail closed hasta tener calendario oficial.

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
- selección BCV weekday/weekend y rechazo de nearest-future stale.

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
10. tasa BCV weekday, weekend, nearest-future stale y ausencia de tasa;
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
3. Crear y probar migration 0017 para que el trigger de checkout use la misma regla BCV weekday/weekend que la API.
4. Portar el handler de PR #233 sobre una rama basada en #255, usando `findApplicableBcvRate(tx)`, helpers canónicos y migration 0015 actual; no portar su migration 0015 antigua.
5. Añadir las assertions de cálculo por línea y asignación de equivalentes si la revisión confirma que el SQL actual no las cubre.
6. Ejecutar unitarias, CI, migration runner, PostgreSQL admin/runtime integration, E2E y backup/restore cuando aplique; todos sobre el SHA final exacto.
7. Solo después implementar UI de checkout; no duplicar cálculos monetarios en React.

## 10. Estado operativo

- Main actual al redactar: `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4`.
- PR #251: cleanup auth 48 h, Draft, 11/11 workflows PR + 2/2 push security exitosos; producción bloqueada por Neon schema/runtime.
- PR #255: BCV parser/API/UI/Cron y weekend selection, Draft; exact HEAD `4e9f01ab85fd767736f4f47f3e47ffefbe7efd88`, 10/10 workflows PR + 3/3 push runs exitosos; sin review formal, no merge.
- PR #227/#228–#233 son ramas fuente históricas. #229–#231 están mayormente supersedidas por código ya integrado; #232 aporta este diseño; #233 aporta handler/tests únicos que requieren adaptación.
- Migration 0015 existe en GitHub main, pero Neon main no ha recibido baseline/migraciones 0003–0016. No asumir que el esquema live tiene checkout listo.
- Producción **NOT READY**. No Neon main, secretos, Cloudflare productivo, DNS, billing ni datos reales modificados.
