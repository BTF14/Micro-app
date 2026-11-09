# BCV Sync Alerting and Recovery

**Estado:** PROPOSED — no implementado  
**Fecha:** 2026-11-09  
**Prioridad:** P1 antes de producción

## Objetivo

Detectar y comunicar fallos de sincronización BCV, ejecuciones que queden en estado `running`, y recuperación bloqueada, sin habilitar ventas con una tasa no validada y sin introducir costes recurrentes.

## Estado comprobado en código

- El Worker programa BCV en `0 22 * * 1-5`, exige `APP_ENV=production` y `BCV_SYNC_ENABLED=true`; permanece desactivado por defecto.
- El fetch oficial tiene timeout HTTP de 10 segundos.
- El handler registra `BCV_SYNC_FAILED` y vuelve a lanzar la excepción para que el Cron aparezca fallido.
- El estado persistido permite conocer `last_attempt_at`, `last_success_at`, `last_outcome`, `last_error_code` y `last_effective_date`.
- Checkout bloquea cuando el último intento no terminó en `inserted`/`unchanged`.
- `GET /api/exchange-rates/latest` devuelve la tasa aplicable, no el estado operativo del singleton. No hay endpoint/panel administrativo dedicado al estado BCV ni watchdog de intento estancado.
- `apps/api/wrangler.toml` no declara explícitamente `observability`; no se verificó la configuración real del Worker en Cloudflare.

## Alternativa de alertas candidata

Cloudflare documenta **Observability → Alerts → Monitors**:
- Monitors evalúa consultas SQL programadas.
- Destinos email y webhook están disponibles en todos los planes.
- Queries, dashboards y alerts no tienen cargo adicional.
- Desde 2026-12-01 el plan Free documenta 0,5 GB/día de ingesta y siete días de retención para el modelo unificado de Observability. La disponibilidad de datasets depende del plan y permisos.
- Workers Logs se consulta mediante el dataset `logs.workersLogs`; la documentación de SQL API muestra `timestamp`, `scriptName` y `logType`, y la referencia de telemetría contempla `message` y `level`.

Referencias oficiales:
- https://developers.cloudflare.com/notifications/
- https://developers.cloudflare.com/notifications/monitors/
- https://developers.cloudflare.com/observability/pricing/
- https://developers.cloudflare.com/analytics/sql-api/datasets/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/

Consulta candidata, pendiente de introspección de columnas y dataset real:
```sql
SELECT COUNT(*) AS value
FROM logs.workersLogs
WHERE accountTag = '<ACCOUNT_TAG>'
  AND timestamp >= NOW() - INTERVAL '10' MINUTE
  AND scriptName = 'micro-app-api'
  AND message LIKE '%BCV_SYNC_FAILED%'
```

No asumir que el nombre/columnas están habilitados en esta cuenta hasta ejecutar introspection desde el dashboard/API y validar la consulta. No configurar token, webhook o secreto ficticio.

## Diseño pendiente

1. Verificar que Workers Logs/Observability está habilitado para `micro-app-api`, qué dataset y columnas están disponibles y el consumo real frente al límite Free.
2. Configurar un Monitor de fallos BCV con destino email; probar entrega con la función Test de Cloudflare.
3. Diseñar detección de `running` estancado. El Monitor de logs por sí solo no consulta Neon. Evaluar un watchdog controlado que lea el singleton y emita un evento estructurado; definir el umbral operativo con base en timeout HTTP + presupuesto de DB/locks, separado de cualquier política de vigencia de tasa.
4. Añadir endpoint administrativo de solo lectura con datos sanitizados del último intento/éxito/outcome/error code/fecha efectiva; restringir a Owner/Admin autorizado y tenant correcto.
5. Diseñar recuperación/retry idempotente usando `attempt_id`; evitar solapamientos y que un intento viejo sobrescriba el nuevo. No habilitar retry automático hasta definir límites y observabilidad.
6. Mostrar alerta visible en el panel admin cuando el estado sea failed/running-stale; el cajero solo ve que el checkout está temporalmente bloqueado, sin capacidad de cambiar tasa.
7. Probar fallo, estado estancado, notificación, retry, recuperación y no duplicación en entorno aislado.

## Criterios de aceptación

- Alerta verificable y entrega confirmada al administrador.
- Detección de fallos terminales y de estado running anormal.
- Ningún retry habilita checkout antes de un nuevo éxito válido.
- La recuperación conserva `attempt_id`, locks e idempotencia.
- Ningún error bruto, token, URL sensible o dato de cliente aparece en logs/notificaciones.
- Cero cargos por encima del presupuesto aprobado.
- Evidencia de pruebas aisladas y documentación actualizada.

## Restricciones

No activar Cron de producción, no cambiar secretos/DNS/billing, no crear destinos externos sin autorización, no usar datos reales y no afirmar que existe alerta hasta probar su entrega.


## Implementación incremental — 2026-11-09

### Endpoint y panel administrativo incorporados en la rama de integración

- Endpoint `GET /api/orgs/:organizationId/bcv/sync-state` de solo lectura.
- Autorización tenant-scoped mediante `bcv.sync_state.read`; solo `owner` y `admin`. Cashier/inventory no tienen permiso.
- Respuesta con último intento/éxito, outcome, error code sanitizado, fecha efectiva, hora de actualización y segundos desde el último intento. `Cache-Control: no-store`.
- Panel de administración en dashboard owner/admin, con actualización manual y refresco cada cinco minutos. Muestra la edad del intento sin inventar un umbral de “stale”; no ofrece edición de tasa ni reintentos.
- Pruebas unitarias de política de roles y endpoint (autorizado, denegado, sin sesión), además de prueba de UI para panel administrativo. CI del HEAD posterior debe terminar antes de considerar validado este bloque.

### Workers Logs — configuración añadida en rama, aún no activada en producción

- `apps/api/wrangler.toml` declara `observability.enabled=true`, redacción de query strings, `logs.enabled=true`, `invocation_logs=false` y `head_sampling_rate=1`.
- `index.ts` emite logs JSON estructurados y mínimos: `BCV_SYNC_STARTED`, `BCV_SYNC_COMPLETED` y `BCV_SYNC_FAILED` (este último incluye solo código sanitizado). Se deshabilitan invocation logs para evitar almacenar cada request, URL o metadatos de sesión; no se registran payloads, tokens ni datos de clientes.
- La configuración solo se aplica al desplegar el Worker desde esta rama. Los previews pueden recibirla en su build; no se ha hecho despliegue manual ni promoción a producción. El Cron BCV continúa deshabilitado en preview y por defecto.
- Query Builder documenta el dataset de Workers como `workers`; la consulta previa `logs.workersLogs` no debe asumirse como la interfaz actual. Confirmar campos reales con el field browser de la cuenta antes de crear un monitor.
- **Precio y fecha corregidos:** hasta 2026-11-30, Workers Logs Free incluye 200.000 eventos/día y 3 días de retención; Paid incluye 20 millones/mes y luego USD 0,60 por millón adicional. Desde 2026-12-01 aplica el nuevo modelo Observability: Free 0,5 GB/día con 7 días incluidos y se detiene la ingesta al alcanzar el límite; Paid incluye 50 GB por ciclo y 10 GB-mes de almacenamiento, con excedentes de USD 0,25/GB de ingesta y USD 0,10/GB-mes. Queries, dashboards y alerts no tienen cargo adicional. Revisar consumo y plan antes de activar en producción.
- Fuentes oficiales:
  - https://developers.cloudflare.com/workers/observability/logs/workers-logs/
  - https://developers.cloudflare.com/workers/observability/query-builder/
  - https://developers.cloudflare.com/observability/pricing/
  - https://developers.cloudflare.com/observability/logs/datasets/

### Pendiente después de la configuración

1. Esperar CI exact-HEAD del commit que incorpora endpoint/panel/logging.
2. En Cloudflare, confirmar que Workers Logs aparece para `micro-app-api`, seleccionar dataset `workers`, inspeccionar nombres reales de campos y revisar el uso/budget.
3. Crear Monitor de fallos filtrando evento estructurado `BCV_SYNC_FAILED`, enviar correo al destino autorizado y usar Test para confirmar entrega. Aún no se ha creado monitor ni destino.
4. Diseñar alerta de intento `running` estancado. No asignar umbral hasta medir los timeouts/locks reales y aprobar un SLO operativo.
5. Añadir una prueba controlada de entrega y una prueba de fallo/recuperación en entorno aislado. No habilitar retry automático antes de cerrar idempotencia y límites.
