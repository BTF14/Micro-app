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

## Primer CI de integración y corrección

El primer CI completo del checkpoint anterior falló únicamente en la prueba unitaria `ignores unrelated cron expressions`: el handler combinado estaba enviando cualquier Cron no-BCV al cleanup horario. Se corrigió `apps/api/src/index.ts` para que la limpieza se ejecute exclusivamente con `controller.cron === "17 * * * *"`; otros cron no hacen nada. La migración 0021, sus assertions, build/typecheck y validaciones de schema sí pasaron en esa ejecución. El nuevo commit requiere CI exact-HEAD propio; no se reutiliza el fallo ni los éxitos anteriores.


## Revalidación del código — 2026-11-09

El código HEAD `032064cfed018545f0071116a461f21500ee7102` pasó CI (run 42609557781), Database migration validation (42609557776), PostgreSQL migration runner validation (42609557710), backup/restore (42609557715), Semgrep, Security scan, Secret history, Dependency review y ODD docs. CI incluyó build/typecheck, unit tests, PostgreSQL BCV effective-date integration, checkout integration y runtime-role API integration. Playwright E2E run 42609557746 seguía `pending` en la última consulta; no declarar suite total completa. Dos fallos de CI previos fueron corregidos y no se ocultaron: (1) cleanup horario para cron no reconocido, ahora limitado a `17 * * * *`; (2) fixture de concurrencia BCV contaminaba la prueba siguiente, ahora elimina sus filas de prueba en `finally`. Este registro documental cambia el HEAD; verificar de nuevo CI exact-HEAD antes de cualquier decisión.


---

## Revisión adicional — concurrencia de sincronizaciones BCV (2026-11-09)

Se detectó una carrera que el test previo no cubría: dos intentos con valores distintos para la misma `effective_date` podían terminar fuera de orden. El intento antiguo, al terminar después, llamaba a `persistBcvOfficialRate()`, detectaba un valor diferente y marcaba `validation_status='stale'` sobre la fila que había insertado el intento nuevo. La protección original de `attempt_id` solo evitaba sobrescribir el estado terminal; no protegía `exchange_rates`.

### Corrección aplicada y validada en CI exact-HEAD

- `syncBcvOfficialRate()` ahora verifica el `attempt_id` vigente bajo `SELECT ... FOR UPDATE` dentro de una transacción antes de persistir.
- Persistencia de tasa y actualización terminal del estado se realizan en la misma transacción.
- Un intento supersedido devuelve `superseded` sin insertar ni marcar stale ninguna fila.
- Un error de fetch de un intento supersedido no sobrescribe el estado más nuevo ni se reporta como fallo vigente.
- La regresión PostgreSQL ahora fuerza dos respuestas distintas para la misma fecha: B (más nueva) inserta 896.10; A (antigua) termina después con 895.10 y debe descartarse; la fila de B debe seguir `valid`.
- Commits de implementación/test/corrección: `a2c122cd0a030ff82131a7eb9da0742690bfca84`, `27012594b895abe2aff08ef5ee8fb065321d755a`, `ef21cfca3e18b4a51de9aa7af9c5d26397d7736c`, `c02bc31a26323384f648dc8e56a782a0394d7b80`; PR #289 integrada por squash en `f564c73b1df45fce5c8e5065e2e6f563595e0dfa`.
- Tarea ODD: `odd/tasks/bcv-checkout-sync-concurrency.md`.

### Gate P1 separado: freshness todavía no está aplicada

La migración 0021 conserva `last_attempt_at` y `last_success_at`, pero `findApplicableCheckoutRate()` sigue consultando solamente la fila de `exchange_rates` por fecha efectiva y `validation_status='valid'`. No consulta el estado persistente del sincronizador ni aplica una política de last-success. Como `fetched_at` no se actualiza en un resultado `unchanged`, no puede usarse como última sincronización exitosa. Una fila del día puede permanecer `valid` aunque un intento posterior haya fallado.

Además, `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7` son umbrales hard-coded pendientes de justificación y aprobación. No asumir que son política aprobada.

Se dejó comentario técnico en PR #287 con el escenario, riesgo y criterios de cierre. No se modificó código para freshness ni se inventó un umbral.

### Estado y siguiente paso

- Verificar en GitHub el HEAD vivo de #287; los checks anteriores a los tres commits de corrección no validan el nuevo código.
- Ejecutar/esperar CI exact-HEAD y revisar específicamente PostgreSQL BCV integration bajo `microapp_runtime`.
- Mantener #287 Draft; no merge, no deploy, no Neon writes, no Cron BCV ni cambios Cloudflare.
- Siguiente trabajo: diseñar la política de freshness y probar: fila válida + fallo de sincronización + last-success fuera de ventana => checkout bloqueado.
- Producción permanece **NOT READY**.


---

## Revalidación exact-HEAD tras integrar PR #289 — 2026-11-09

- PR #289 corrigió la aserción del test para respetar el contrato `Promise<void>` del handler programado. Se integró por squash **solo en la rama de integración #287**, merge commit/HEAD `f564c73b1df45fce5c8e5065e2e6f563595e0dfa`; no se fusionó a main.
- La prueba PostgreSQL de concurrencia ahora usa dos valores distintos para la misma fecha. El intento B más nuevo inserta la tasa; A termina después y el handler registra `superseded`. La fila de B permanece `valid`.
- **CI exact-HEAD:** 15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS en `f564c73b1df45fce5c8e5065e2e6f563595e0dfa`. Incluye CI/verify, PostgreSQL BCV integration, Runtime-role API integration, migration validation/runner, Playwright E2E, backup/restore, Semgrep, Security scan, Secret history, Dependency review y ODD docs.
- La PR #287 permanece OPEN/Draft, 110 commits ahead / 0 behind main en la comparación consultada. Sin merge a main, sin deploy, sin Neon writes, sin activación Cron y sin cambios Cloudflare.
- La brecha freshness continúa abierta: checkout no consulta `bcv_sync_state.last_success_at`; no se ha aprobado ventana de frescura. Los umbrales de parser 10/7 días siguen sin justificación/aprobación.
- Gates restantes: fixture HTML real BCV, calendario bancario oficial verificable, política de anomalías/freshness, revisión legal/contable de effective_date y checkout, alertas/identidad Worker y contrato comercial pendiente.
- El siguiente commit documental cambia el HEAD de la rama; no reutilizar estos checks para ese nuevo SHA. Producción **NOT READY**.


---

## Revalidación tras PR #293 — sincronización main — 2026-11-09 UTC

PR #293 se integró con merge commit en la rama de #287 para preservar main como ancestro:
- Nuevo HEAD: `cabe98707c6f4c348df23bfcb7c47f5dd9756532`.
- Primer padre: `254ebb6e741f7c1b147fbd4880bc188f17204807` (código de integración previo).
- Segundo padre/main: `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`.
- Comparación: 113 ahead / 0 behind; `mergeable=true`.
- **CI exact-HEAD: 15/15 check-runs SUCCESS; 11/11 workflow runs SUCCESS**. Runtime-role API integration, PostgreSQL BCV integration, migration validation/runner, Playwright, backup/restore, seguridad, secret-history, dependency review y ODD docs pasaron.
- La rama #287 sigue OPEN/Draft, sin aprobación formal APPROVED. La sincronización fue documental; no cambió lógica de aplicación ni migraciones.
- Freshness sigue sin implementación: checkout no consume `bcv_sync_state.last_success_at`. Los umbrales 10/7 no están aprobados. Fixture real BCV, calendario SUDEBAN verificable, legal/contable y Worker runtime identity/alertas siguen pendientes.
- Producción NOT READY. No activar Cron, no deploy, no Neon writes.
- Si se añade otro commit, repetir CI exact-HEAD; los resultados anteriores no validan un SHA futuro.


---

## Implementación aislada de freshness — 2026-11-09

**Decisión confirmada por el propietario:** opción A. Si el último intento de sincronización BCV falla o está en curso, se bloquean nuevas ventas hasta un intento exitoso. La decisión está registrada en [ADR-20261109-bcv-checkout-last-success](decisions/ADR-20261109-bcv-checkout-last-success.md); no introduce TTL arbitrario ni habilita la contingencia manual.

### Rama y alcance
- Rama nueva: `fix/bcv-checkout-last-success-20261109`, creada desde el HEAD verificado de PR #287: `362443524eb45c67da16811d1745d83ddc9bd3a9`.
- PR #287 permanece OPEN/Draft; esta rama no modifica #287 ni main. PR de esta corrección aún no creada en el momento de este registro.
- Implementación: `findApplicableCheckoutRate()` primero lee `bcv_sync_state` con `SELECT ... FOR SHARE` y solo continúa si hay `last_success_at`, outcome `inserted`/ `unchanged` y `last_effective_date` igual o posterior a hoy en Caracas. Luego exige la fila BCV same-day `valid`.
- El lock compartido permanece durante la transacción del checkout y serializa el inicio de un sync nuevo (UPDATE de la fila singleton). Si sync comenzó primero, checkout ve `running`; si checkout obtuvo el lock primero, la venta autorizada termina antes de que el nuevo intento pase a `running`. El lock no se mantiene durante el fetch HTTP.
- Replay idempotente de una venta completada puede devolver su snapshot existente; no crea una venta ni consume inventario. La regla aplica a ventas nuevas.

### Pruebas añadidas; aún sin resultado CI
- Unitarias: éxito `unchanged` con tasa prepublicada del lunes descargada el viernes; rechazo antes de la fecha efectiva; `failed`, `running`, `older`, last-success ausente, singleton ausente, fecha discrepante, tasa stale y error DB.
- PostgreSQL integración: tasa same-day válida + estado futuro prepublicado permite la fila de hoy; último intento fallido/running/fecha anterior => HTTP 409, sin venta ni movimiento de stock; recuperación solo tras nuevo éxito.
- PostgreSQL runtime-role: lectura `FOR SHARE` mantiene lock y un UPDATE concurrente de sincronización recibe lock timeout hasta liberar la transacción.
- Se conserva y restaura el estado singleton previo al terminar el fixture de integración; no hay migración nueva.

### Estado de validación
- No se ha ejecutado todavía CI exact-HEAD ni se declara que los tests pasen. La apertura de la PR Draft debe disparar los workflows; revisar cada check/run contra el SHA final.
- No se hicieron escrituras Neon, deploy, activación Cron, ni cambios de Cloudflare/secrets/DNS/billing.
- Pendientes globales siguen vigentes: fixture HTML oficial BCV, calendario bancario oficial, umbrales parser 10/7 sin aprobación, revisión legal/contable, alertas/identidad Worker y contrato comercial completo. Producción NOT READY.


---

## Corrección final de estado — PR #295 y CI exact-HEAD — 2026-11-09

- PR #295 está OPEN/Draft y su base actual es `integration/bcv-checkout-rehearsal-20261109`, no la rama alias. La rama `fix/bcv-checkout-validation-base-20261109` se utilizó temporalmente solo para disparar workflows cuyo filtro excluye bases `integration/**`; después se retargeteó PR #295 a la rama real de integración.
- HEAD de código probado: `3a67540c7b079bb11349552ffe92c598f0fad11f`. CI `42625578491`, migraciones `42625578392`, migration runner `42625578739`, Playwright `42625578611`, Semgrep `42625578676`, Dependency review `42625578410`, ODD docs `42625578554`, dashboard `42625578403`, secret-history `42625578857` y Security scan `42625578492`: todos SUCCESS. Resultado exacto: **14/14 check-runs SUCCESS y 10/10 workflow runs SUCCESS**.
- CI verify incluyó build/typecheck, unit tests, PostgreSQL atomic sales checkout integration y Runtime-role API integration; los pasos terminaron SUCCESS. La prueba de checkout incluye estado `failed`, `running`, discrepancia de fecha, recuperación tras éxito, tasa actual durante prepublicación futura y lock `FOR SHARE` frente a UPDATE concurrente.
- Cloudflare Pages/Workers checks son builds de preview; no hubo deploy productivo. No hubo escrituras Neon, activación Cron ni cambios manuales de Cloudflare.
- No hay reviews formales ni threads en #295. Se mantiene Draft. #287 también sigue Draft. Producción NOT READY.
- Este commit documental cambiará el HEAD; ejecutar CI exact-HEAD otra vez antes de cualquier decisión posterior.
