# ODD task — recuperación de tasa BCV stale tras confirmación idéntica

**Fecha:** 2026-11-10  
**Riesgo:** crítico (disponibilidad/validez de tasa que autoriza checkout).  
**Objetivo de entrega:** 2026-12-01 — inamovible.

## Hallazgo verificado
`persistBcvOfficialRate()` devuelve `unchanged` cuando la tasa recibida coincide con la tasa almacenada para la misma fecha efectiva. Si la fila existente está marcada `stale`, el código anterior no restauraba `validation_status='valid'`. El sync podía registrar `last_outcome='unchanged'` y `last_success_at`, mientras checkout seguía bloqueado por la fila stale. La recuperación por una confirmación oficial idéntica no completaba el ciclo.

## Alcance
- Al recibir la misma tasa y fecha efectiva, restaurar `validation_status='valid'` únicamente si la fila está `stale`.
- Mantener tasa, fecha efectiva, fuente y snapshots históricos sin modificación.
- No recuperar filas cuyo valor oficial difiera del valor almacenado.
- Añadir regresión unitaria y prueba PostgreSQL usando el principal runtime cuando el job lo configure.
- Mantener checkout fail-closed y la política de último intento exitoso.

## Exclusiones
No añadir TTL, freshness arbitraria, umbrales nuevos, tasa manual, cambios de precios, endpoints comerciales ni migraciones remotas. No tocar main, producción, secretos ni datos reales.

## Criterios de aceptación
1. Una fila stale con mismo source/date/rate puede volver a valid solo tras una respuesta BCV parseada y confirmada con el mismo valor.
2. Una fila valid con el mismo valor sigue siendo idempotente y devuelve unchanged.
3. Una tasa distinta para la misma fecha sigue marcando stale y fallando cerrado; nunca sobrescribe la tasa almacenada.
4. La actualización se limita por source, effective_date, rate y estado stale.
5. Prueba unitaria y PostgreSQL integration verifican la recuperación.
6. Checkout sigue rechazando la fila stale y acepta la fila tras recuperación exitosa y estado de sync actualizado.
7. CI exact-HEAD y revisión de diff pasan; PR #287 permanece Draft.

## Implementación y evidencia — 2026-11-10

**Estado:** implementado en la rama #287; CI exact-HEAD previo a este registro: 15/15 check-runs SUCCESS y 11/11 workflows SUCCESS.

- `apps/api/src/exchange-rates.ts`: ante mismo source/effective_date/rate, si la fila existente está `stale`, actualiza únicamente `validation_status='valid'` mediante UPDATE acotado por las cuatro condiciones. No cambia tasa, fecha, source ni fetched_at.
- `apps/api/src/exchange-rates.test.ts`: regresión unitaria comprueba que devuelve `unchanged` y que la consulta UPDATE contiene filtros de source/date/rate/stale.
- `apps/api/src/exchange-rates.integration.test.ts`: prueba PostgreSQL marca una fila sintética stale mediante conexión admin y confirma el mismo valor usando `DATABASE_URL`. El workflow CI ejecuta esta suite también con `DATABASE_URL=$RUNTIME_DATABASE_URL` y `DATABASE_URL_ADMIN=$ADMIN_DATABASE_URL`, por lo que el UPDATE se valida con el LOGIN real `microapp_runtime` del entorno desechable.
- La migración 0013 ya concede UPDATE column-scoped de `validation_status`; no se añadió grant ni migración.
- La primera ejecución de CI encontró una aserción unitaria incorrecta (`AND source` en vez de `WHERE source`); se corrigió en un commit posterior y el HEAD final pasó.
- No se añadió TTL, freshness arbitraria ni umbrales. No se ejecutó PostgreSQL remoto ni se tocó Neon main.

## Integración de recuperación de checkout — 2026-11-10

Se reforzó `apps/api/src/sales-checkout.integration.test.ts` para probar el ciclo completo de recuperación a nivel API/PostgreSQL:

1. La fila BCV del día se marca `stale` y el último sync queda `failed`.
2. Checkout devuelve 409 y no consume existencias.
3. `persistBcvOfficialRate()` recibe la misma tasa/fecha efectiva ya parseada y se ejecuta con conexión LOGIN `microapp_runtime`.
4. La función devuelve `unchanged` y restaura únicamente el estado de la fila a `valid`.
5. Se registra el resultado de sync exitoso en el fixture; checkout devuelve 201 y el saldo baja exactamente una unidad.

**CI exact-HEAD anterior a este registro:** SHA `43e920297cfbc08b248ab95bee8f3d202891e3c8`; 15/15 check-runs SUCCESS y 11/11 workflows SUCCESS. El workflow `CI` (run `42788781507`) terminó SUCCESS; la suite PostgreSQL atomic checkout y el paso runtime-role completaron correctamente. El test usa PostgreSQL 18 desechable y una tasa sintética; no prueba captura live del sitio BCV ni recorrido UI.

## Pendiente residual

- Ejecutar el recorrido E2E desde la UI y una validación productiva controlada autorizada después de cerrar Seguridad Nivel 1.
- Mantener fail-closed ante stale, ausencia de tasa y último sync fallido/running.
- No añadir TTL ni umbral de frescura arbitrario. La secuencia concurrente de intentos sigue protegida por `attempt_id`.

**Limitación de estado:** el SHA/CI citados son los observados antes de este commit documental; consultar el HEAD exacto posterior. PR #287 permanece OPEN/Draft.
