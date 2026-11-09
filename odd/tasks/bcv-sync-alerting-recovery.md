# Actualización de continuidad — 9 de noviembre de 2026

> Esta actualización prevalece sobre snapshots históricos que indiquen otro HEAD o describan como pendientes capacidades ya implementadas. Verificar siempre el SHA vivo en GitHub antes de nuevas acciones.

## PR #287 — integración BCV + checkout

- Estado: OPEN / Draft; base `main`; HEAD de código actual `3c32b6d46a807a88962de81443af84c4d4fef3e1`; GitHub informa `mergeable=true`. No hay reviews formales ni review threads abiertos.
- CI del HEAD exacto: **15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS**. Los 11 workflows de PR incluyen CI, Playwright E2E, validación de migraciones, PostgreSQL migration runner, backup/restore, Semgrep, Security scan, secret-history, dependency review, ODD docs y dashboard. Los builds Cloudflare de la rama son previews, no promoción a producción.
- No merge, no deploy productivo, no Neon main writes, no migraciones remotas, no activación Cron, no cambios de secretos/DNS/billing ni datos reales.

## BCV: estado real de implementación

- Checkout **sí consume** `bcv_sync_state`: lee `last_success_at`, exige `last_outcome` = `inserted` o `unchanged`, exige `last_effective_date >= hoy Caracas`, y además una tasa `valid` con fecha efectiva exactamente igual a hoy. Usa `FOR SHARE` dentro de la transacción; no hay fallback a tasa vieja ni TTL arbitrario.
- La migración 0021 añade defensa SQL mediante trigger diferido para validar el estado al completar una venta, también frente a escrituras directas del rol runtime.
- La carrera de intentos supersedidos está corregida con `attempt_id` y bloqueo/validación atómica antes de persistir. La prueba PostgreSQL cubre dos respuestas diferentes para la misma fecha y verifica que el intento antiguo no invalide la tasa del nuevo.
- Existe endpoint `GET /api/orgs/:organizationId/bcv/sync-state`, solo lectura y tenant-scoped, permiso `bcv.sync_state.read` exclusivo de owner/admin. Cashier e inventory no tienen acceso. Respuesta `no-store`, errores sanitizados.
- El dashboard muestra un panel BCV solo a owner/admin, con último intento/éxito, outcome, fecha efectiva, edad del intento, error code sanitizado, actualización manual y refresco automático cada cinco minutos. No permite editar tasa ni ejecutar sincronizaciones.
- Wrangler ya declara Workers Observability/Logs: redacción de query strings, `invocation_logs=false`, logs estructurados explícitos con sampling 1. El Cron registra `BCV_SYNC_STARTED`, `BCV_SYNC_COMPLETED` y `BCV_SYNC_FAILED`; el error solo expone código sanitizado.
- No se ha creado Monitor, destino de correo ni watchdog; no se ha probado entrega de alertas. Inspeccionar dataset/campos reales y consumo de cuenta antes de configurar monitor.

## Gates aún abiertos — producción NOT READY

1. CI exact-HEAD del siguiente commit documental/código debe volver a validarse; no reutilizar los resultados de este SHA.
2. Capturar y conservar fixture reproducible de HTML oficial BCV y probar el parser con respuesta real. La recuperación oficial anterior devolvió 502; no sustituir por copias de terceros.
3. Obtener calendario bancario oficial SUDEBAN verificable. No afirmar que no existe ni codificar fechas desde terceros.
4. Justificar y aprobar límites del parser `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7`; siguen hard-coded y no aprobados.
5. Configurar monitor de `BCV_SYNC_FAILED`, destino autorizado y prueba de entrega. Diseñar watchdog de `running` estancado con SLO/umbral medido; no inventar umbral.
6. Cerrar identidad efectiva del Worker, pruebas aisladas de recuperación, revisión legal/contable y semántica append-only de cambios, pagos parciales, anulaciones y reembolsos.
7. La contingencia de tasa manual por owner/admin sigue siendo una propuesta documentada, no una función activa. Mantener el diseño de autorización reforzada (PIN secreto verificado en servidor, límites/rate-limit, auditoría, caducidad y separación de funciones); no implementar ni permitir edición directa hasta cerrar revisión legal/contable y especificación.

## Reglas de continuidad

- No pedir otra vez Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones si el dato está en GitHub o documentación. Si falta un dato imprescindible, pedirlo una sola vez y aceptar texto.
- Leer primero `AGENTS.md`, `WORK_CHECKPOINT.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y `docs/SECURITY_ROADMAP.md`.
- Mantener #287 Draft. CI verde no equivale a aprobación. No fusionar PR de procedencia por separado si su cambio ya está integrado.
- Actualizar este estado documental cuando haya una decisión, hallazgo o discrepancia nueva; después revalidar CI exact-HEAD.

---

# BCV Sync Alerting and Recovery

**Estado:** PARCIALMENTE IMPLEMENTADO — endpoint/panel y logs estructurados incorporados en PR #287; alertas/watchdog aún pendientes  
**Fecha:** 2026-11-09  
**Prioridad:** P1 antes de producción

## Objetivo

Detectar y comunicar fallos de sincronización BCV, ejecuciones que queden en estado `running`, y recuperación bloqueada, sin habilitar ventas con una tasa no validada y sin introducir costes recurrentes.

## Estado comprobado en código (reconciliado 2026-11-09)

- El Worker programa BCV en `0 22 * * 1-5`, exige `APP_ENV=production` y `BCV_SYNC_ENABLED=true`; permanece desactivado por defecto.
- El fetch oficial tiene timeout HTTP de 10 segundos.
- El handler registra `BCV_SYNC_FAILED` y vuelve a lanzar la excepción para que el Cron aparezca fallido.
- El estado persistido permite conocer `last_attempt_at`, `last_success_at`, `last_outcome`, `last_error_code` y `last_effective_date`.
- Checkout exige `last_success_at`, outcome `inserted`/`unchanged`, fecha efectiva no anterior a hoy Caracas y una tasa validada para la fecha exacta de hoy.
- `GET /api/orgs/:organizationId/bcv/sync-state` ya expone estado operativo en modo solo lectura para owner/admin; el dashboard incluye panel administrativo. No existe watchdog de intento estancado.
- `apps/api/wrangler.toml` ya declara Observability/Workers Logs, redacción de query strings e invocation logs desactivados. La configuración de cuenta, dataset/campos, consumo y monitor siguen sin validarse en Cloudflare.

## Alertas pendientes de configuración y prueba

Cloudflare documenta **Observability → Alerts → Monitors**:
- Monitors evalúa consultas SQL programadas.
- Destinos email y webhook están disponibles en todos los planes.
- Queries, dashboards y alerts no tienen cargo adicional.
- Desde 2026-12-01 el plan Free documenta 0,5 GB/día de ingesta y siete días de retención para el modelo unificado de Observability. La disponibilidad de datasets depende del plan y permisos.
- No fijar el dataset ni nombres de columnas por memoria de documentación antigua. Inspeccionar el field browser de la cuenta y usar el dataset vigente que Cloudflare presente para Workers.

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


## Hallazgo de revisión estática — límites de tiempo DB (2026-11-09)

La revisión de `apps/api/src/database.ts` confirma que `withDatabaseClient()` conecta, ejecuta la operación y cierra el cliente, pero no configura explícitamente un deadline de conexión/consulta ni un presupuesto temporal global. El fetch HTTP BCV sí tiene timeout de 10 segundos, pero ese límite **no acota** por sí solo la duración total de la operación: las fases DB pueden fallar o quedarse esperando por separado.

Consecuencia para el watchdog:

- No fijar todavía un umbral arbitrario como 30/60 segundos para declarar `running` estancado.
- Antes, definir y probar límites de conexión/consulta compatibles con la versión y el modo WebSocket de `@neondatabase/serverless`, incluyendo cancelación/cleanup y comportamiento cuando el cliente queda desconectado.
- Medir el presupuesto completo: inicio de intento, conexión DB, fetch (máximo 10 s), transacción de persistencia/locks y cierre.
- Separar el umbral de watchdog (operación que no termina) de la política de freshness de tasa (si una tasa puede usarse en checkout).
- Añadir pruebas de timeout en cada fase, persistencia del estado terminal cuando sea posible y comportamiento fail-closed cuando no pueda registrarse el fallo.

**Estado:** hallazgo de revisión estática; no se cambió el driver ni se asignó un umbral. Referencia: `apps/api/src/database.ts` en el HEAD actual de #287.


## Verificación de fuente oficial — 2026-11-09

Se realizó una nueva consulta directa a `https://www.bcv.org.ve/`:

- La apertura web convencional devolvió HTTP 502 en esta sesión.
- Una extracción independiente mediante navegador sí alcanzó la página oficial y devolvió contenido con título `Banco Central de Venezuela |`, canonical `https://www.bcv.org.ve/` y los bloques de monedas, seguido de `Fecha Valor: Lunes, 09 Noviembre 2026`.
- El contenido extraído mostraba USD `897,53830000`, junto con EUR/CNY/TRY/RUB. El valor solo sirve como evidencia de que la página oficial estaba accesible en esa consulta; no se usa como tasa de producción ni como dato contable.
- **Limitación decisiva:** el extractor devolvió HTML semántico limpiado, no los bytes originales de la respuesta HTTP. Quitó scripts/estilos y atributos/estructura de la página. Por tanto, esto NO satisface el criterio de fixture raw reproducible ni permite calcular un hash del documento original del BCV.
- No guardar el resultado limpiado bajo el nombre de fixture oficial raw ni cambiar la etiqueta del fixture sintético. No usar mirrors de terceros para completar el HTML faltante.
- Siguiente paso técnico: conseguir la respuesta HTTP original del host oficial con su cuerpo binario/texto exacto, status, content-type, fecha de captura y SHA-256; luego validar que el fixture está sanitizado de datos no pertinentes, preservar el HTML íntegro y añadir una prueba parser separada que espere USD `897.53830000` y fecha `2026-11-09`. Mantenerlo identificado como muestra histórica de regresión, no como tasa vigente.

**Estado:** acceso al contenido oficial confirmado; fixture raw y validación del parser con markup original siguen pendientes.


## Corrección y avance — captura DOM oficial preservada (2026-11-09)

La extracción anterior descrita como HTML semántico limpiado fue una primera lectura. Después se completó una captura de navegador de `document.documentElement.outerHTML` de `https://www.bcv.org.ve/`:

- Título: `Banco Central de Venezuela |`; URL final: `https://www.bcv.org.ve/`.
- El navegador reportó `Page loaded successfully`; no expuso código HTTP numérico ni response headers.
- Longitud UTF-8 de la serialización DOM original: 93.797 bytes.
- SHA-256 DOM original (antes de redacción): `97fe86647e11fae932c8f4495524ba0a7ed0a756bea85576079f63ec5333feb9`.
- Se preservó `apps/api/src/fixtures/bcv-homepage-dom-2026-11-09.html`, redactando solo `form_build_id`, `form_token` del formulario Drupal público y una URL `blob:` efímera. SHA-256 del archivo almacenado: `a10241b7fab8349aab1e8ba51faacc6501e7af6203cbd391fffd0264de33d36e`.
- Proveniencia y limitaciones: `apps/api/src/fixtures/bcv-homepage-dom-2026-11-09.provenance.md`.
- Se añadió un test del parser sobre esta muestra DOM: espera USD `897.53830000` y fecha efectiva `2026-11-09`.

**Alcance:** ya hay una muestra oficial del DOM completa y hash-verified, sanitizada y probada como regresión del parser. No es el cuerpo HTTP byte-for-byte; el navegador pudo normalizar/modificar el DOM y no se obtuvieron status/headers HTTP. El gate de captura raw HTTP queda abierto. La muestra es histórica y no es una fuente de tasa en runtime.
