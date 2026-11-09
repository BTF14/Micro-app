# Continuidad técnica — integración BCV + checkout
**Fecha:** 2026-11-09  
**Repositorio:** BTF14/Micro-app  
**Rama aislada:** `integration/bcv-checkout-rehearsal-20261109`  
**PR de ensayo:** [#287](https://github.com/BTF14/Micro-app/pull/287) — OPEN / Draft

## Propósito y alcance

Esta rama combina, solo para ensayo, el productor oficial BCV de PR #255 y el checkout atómico/ledger de PR #269. No se fusionó ninguna de esas PR. La rama parte del checkout y conserva sus migraciones 0017–0020; incorpora las rutas, parser, persistencia idempotente, UI y pruebas del productor BCV. Los archivos compartidos `apps/api/src/index.ts` y `.github/workflows/ci.yml` se integraron preservando ambas funcionalidades y los contratos de CI.

## Estado persistente del sincronizador BCV — migración 0021

Se añadió `apps/api/migrations/0021_bcv_sync_state.sql` y sus assertions. La tabla singleton `public.bcv_sync_state` separa:
- `last_attempt_at`: inicio de la última ejecución.
- `last_success_at`: última ejecución completada correctamente.
- `last_outcome`: running / inserted / unchanged / older / failed.
- `last_error_code`: código sanitizado, nunca mensaje SQL/credenciales.
- `last_effective_date`: fecha efectiva procesada.
- `attempt_id`: identificador de concurrencia.

Las escrituras terminales incluyen `WHERE attempt_id = ...`; una ejecución antigua que termina después de una nueva no puede sobrescribir su estado. Runtime tiene SELECT y UPDATE solo sobre las columnas necesarias; no INSERT, DELETE ni TRUNCATE. La migración exige login directo `microapp_migrator`, tiene assertions de ownership/ACL y se valida con rollback atómico en migration-check.

## Pruebas incorporadas

- CI incluye las assertions de checkout 0018/0019, BCV 0020 y estado BCV 0021.
- Migration-check aplica la cadena hasta 0021, verifica sus grants y comprueba rollback atómico.
- Integración PostgreSQL verifica sincronización exitosa, error de fuente persistido sin borrar `last_success_at`, y dos ejecuciones solapadas donde la más antigua no pisa el resultado de la más reciente.
- La ruta de Cron BCV se separa de la limpieza horaria; requiere `APP_ENV=production` y `BCV_SYNC_ENABLED=true`. `apps/api/wrangler.toml` conserva `BCV_SYNC_ENABLED=false` por defecto. No se activó Cron ni se modificó Cloudflare.

## Estado de GitHub y CI

- PR #287 está OPEN/Draft, apuntando a main; no es candidata a merge.
- PR #255 y PR #269 permanecen separadas y Draft.
- Revalidar workflows/check-runs exclusivamente contra el HEAD actual de #287. No reutilizar resultados de SHAs anteriores. Una revisión COMMENTED o CI verde no equivale a aprobación formal.
- Consultar el estado vivo en la PR; este documento no sustituye el estado actual de GitHub.

## Restricciones cumplidas

No se modificó main; no se fusionó ninguna PR; no hubo deploy, escritura Neon, ejecución de bootstrap/migrate remoto, Cron BCV activado, cambio de secretos, DNS, billing o configuración manual Cloudflare. No hubo force-push ni aprobación simulada.

## Bloqueos antes de producción

1. Fixture HTML real del sitio oficial BCV, conservado y verificado; las pruebas actuales usan HTML sintético.
2. Calendario bancario oficial verificable para el año operativo correspondiente; no codificar fechas desde copias no verificadas.
3. Política de anomalías/freshness definida por negocio/contabilidad. No inventar umbrales ni reutilizar `exchange_rates.fetched_at` como last-success.
4. Validación legal/contable de la política efectiva: una tasa prepublicada solo se usa desde su `effective_date`; sin tasa válida para el día de operación, checkout bloquea, también para ventas USD-only.
5. Alertas/visibilidad operativa sin servicio de pago, más validación de identidad y permisos del Worker runtime en entorno aislado.
6. Decisiones comerciales: cambio en efectivo, pagos parciales, anulaciones, devoluciones y reembolsos append-only.
7. Revisión técnica independiente y aprobación formal requerida por la política de PR.

## Próximo orden de trabajo

1. Dejar completar CI de #287 y corregir cualquier fallo solo en esta rama.
2. Revalidar diff de integración y revisar la migración 0021, grants y pruebas de concurrencia.
3. Completar fixture BCV/calendario y política de operación con evidencia oficial.
4. Revisión contable/legal y definición de devoluciones/cambio.
5. Solo después de cerrar los gates, preparar un plan explícito de integración; no fusionar ni desplegar automáticamente.

**Estado de producción: NOT READY.**