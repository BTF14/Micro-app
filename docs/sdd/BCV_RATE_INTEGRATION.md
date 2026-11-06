# Integración de tasa oficial BCV — Micro-app

**Estado:** implementación recuperada en rama feat/bcv-official-recovery-20261106; pendiente de CI, revisión y despliegue controlado.
**Fuente primaria:** https://www.bcv.org.ve/.
**Costo adicional objetivo:** USD 0; no se usa proveedor comercial ni API de terceros.

## Contrato de datos

- Moneda base: USD.
- Moneda cotizada: VES.
- Fuente persistida: BCV_OFFICIAL_HTML_V1.
- Se conserva el valor como decimal textual y PostgreSQL NUMERIC(18,8), sin aritmética monetaria en coma flotante.
- effective_date procede del campo oficial “Fecha Valor”; fetched_at registra la consulta.
- La migración 0013_bcv_official_rate_precision_and_grants.sql ya forma parte de main, pero su aplicación a Neon producción sigue pendiente de autorización específica.
- Ventas y pagos históricos conservan su propia tasa snapshot; una nueva publicación no recalcula transacciones anteriores.

## Extracción y límites

La página oficial es HTML público, no una API JSON documentada. El Worker consulta únicamente https://www.bcv.org.ve/ por HTTPS.

El extractor:
- Rechaza redirecciones fuera del host oficial, respuestas HTTP no exitosas y contenido que no sea HTML.
- Rechaza Content-Length inválido o superior a 2 MB.
- Lee el cuerpo mediante streaming y detiene la lectura al superar 2 MB; no descarga primero un cuerpo ilimitado para comprobar el tamaño después.
- Decodifica entidades HTML españolas comunes para poder interpretar la fecha publicada.
- Valida formato local, valor positivo, precisión NUMERIC, fecha calendario y rango temporal.
- No usa una fuente de terceros como sustituto automático.

## Fechas efectivas y orden de llegada

BCV puede publicar por adelantado una tasa cuya vigencia empieza mañana. Esa fila se conserva como scheduled; el endpoint latest solo devuelve fechas efectivas iguales o anteriores al día de Caracas.

**Una tasa futura ya almacenada no puede bloquear la inserción de la tasa de hoy.** Cada fecha efectiva tiene su propia fila única. Si primero llega mañana y después se publica hoy, ambas filas se guardan; la de hoy se devuelve como vigente y la futura sigue programada.

Si BCV publica un valor diferente para una fecha que ya existe, Micro-app no reescribe el importe histórico: marca la fila existente stale y falla de forma cerrada para revisión.

## API y operación

- GET /api/exchange-rates/latest: última tasa validada cuya vigencia ya comenzó.
- GET /api/exchange-rates/history?limit=30: histórico acotado, con estados current, scheduled y stale.
- Worker Cron: 0 22 * * 1-5 (18:00 hora de Caracas, lunes a viernes).
- Los previews no ejecutan sincronización programada.
- La API devuelve decimales como strings; si no hay una tasa válida, responde 503 y no inventa una conversión.

## Verificación requerida antes de producción

1. Pasar unit tests del parser, límites de streaming, entidades HTML, conflictos de fecha y persistencia.
2. Pasar integración PostgreSQL con el login microapp_runtime: mañana→hoy, consulta latest/history, y conflicto de valor del mismo día.
3. Confirmar permisos de 0013: SELECT/INSERT y actualización exclusiva de validation_status; sin UPDATE de rate/fecha/source ni DELETE.
4. Verificar el Cron real y los secretos/DATABASE_URL existentes en Cloudflare sin imprimirlos ni modificarlos.
5. Ejecutar smoke controlado solo después de aprobar el baseline/adoption de Neon y autorizar específicamente las escrituras y grants de producción.

La integración no se considera activa ni lista para producción por el mero hecho de que el código o el Cron estén en main.