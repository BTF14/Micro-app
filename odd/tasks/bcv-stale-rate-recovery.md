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

## Siguiente paso
Implementar en `exchange-rates.ts`, añadir regresiones unitarias e integración PostgreSQL y verificar permisos runtime existentes antes de cerrar.
