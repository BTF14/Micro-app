# ADR-20261109 — Checkout requiere último éxito de sincronización BCV

- **Estado:** decisión de producto aprobada e implementación completada en PR #295 (OPEN/Draft); revisión técnica independiente sin bloqueo de código identificado, aprobación formal pendiente.
- **Fecha:** 2026-11-09.
- **Contexto:** PR #287 integra el productor BCV y checkout. La migración 0021 persiste `bcv_sync_state`, pero checkout solo comprobaba una fila de tasa `valid` para la fecha de Caracas. Un fallo posterior del sincronizador podía dejar una tasa del día habilitada para nuevas ventas.
- **Decisión aprobada por el propietario:** aplicar opción A. Si el último intento BCV está `running` o `failed`, bloquear nuevas ventas hasta que una sincronización termine exitosamente. No mantener el checkout abierto usando silenciosamente la tasa anterior.
- **Regla de aceptación:** una nueva venta solo puede usar la fila BCV de fecha efectiva exacta de hoy en `America/Caracas`, con `validation_status='valid'`, y el singleton `bcv_sync_state` debe tener `last_outcome` igual a `inserted` o `unchanged`, `last_success_at` no nulo y `last_effective_date` igual o posterior a hoy.
- **Outcomes bloqueantes:** `running`, `failed`, `older`, nulo/desconocido, estado singleton ausente, last-success ausente o fecha efectiva anterior a hoy.
- **Sin TTL artificial:** no exigir una ventana de 24 horas. Una tasa prepublicada para el lunes, sincronizada correctamente el viernes, no se usa el viernes como tasa de ese día; el viernes puede seguir usándose una fila válida con fecha efectiva viernes. El lunes se usa la fila del lunes. En ambos casos, la última sincronización exitosa puede haber devuelto una fecha efectiva igual o posterior al día de operación; nunca se acepta una fecha de sincronización anterior a hoy ni una fila de tasa futura como tasa de hoy.
- **Concurrencia:** checkout lee la fila singleton con `SELECT ... FOR SHARE` dentro de su transacción y mantiene el lock hasta commit/rollback. Un intento nuevo de sync que actualiza la fila espera a que termine una venta ya autorizada. Si el sync comenzó primero, checkout observa `running` y falla cerrado. Esto establece un orden determinista para el inicio del sync respecto a la decisión de venta, sin mantener locks durante la descarga HTTP.
- **Idempotencia:** replay de una venta ya completada puede devolver el snapshot existente; no crea una venta nueva ni consume stock. La regla de freshness aplica a toda venta nueva.
- **Alcance:** aplica al contrato actual de checkout, incluidas ventas liquidadas en USD, que ya exige BCV. Cambiar ese contrato requiere una decisión de producto separada.
- **Alternativa rechazada:** aceptar la última tasa conocida tras fallo de sincronización. Se rechaza por riesgo de ventas nuevas con una tasa cuya vigencia operativa ya no puede verificarse.
- **Alternativas no adoptadas:** TTL fijo, usar `fetched_at` como last-success, fallback a fecha anterior/futura o habilitar tasa manual automáticamente.
- **Seguridad:** la tasa anterior se conserva en el histórico; no se borra ni se modifica una venta completada. Checkout bloquea nuevas ventas hasta un éxito. La contingencia manual es una propuesta independiente y no queda habilitada por esta ADR.
- **Gates externos no resueltos:** fixture HTML oficial BCV reproducible, calendario bancario oficial, justificación de límites 10/7 del parser, revisión legal/contable, alertas/identidad Worker y decisiones comerciales adicionales del checkout. Esta decisión no certifica readiness de producción.
- **Consecuencias:** requiere que runtime pueda leer el estado singleton; la migración 0021 ya otorga SELECT y UPDATE column-scoped. Pruebas deben usar PostgreSQL desechable y rol `microapp_runtime`; no ejecutar cambios remotos ni activar Cron.


## Revisión técnica independiente — 2026-11-09

- SHA revisado y validado: `32b838c9dd90c7b5c17e359961bd67f48376d1a8`. PR #295 sigue OPEN/Draft, base `integration/bcv-checkout-rehearsal-20261109` (base SHA `362443524eb45c67da16811d1745d83ddc9bd3a9`), mergeable=true; 37 commits ahead / 0 behind. No se fusionó.
- Verificación viva: 10/10 workflow runs SUCCESS asociados al SHA; la descripción de PR registra 14/14 check-runs SUCCESS. No hay reviews formales ni hilos de revisión.
- Revisión del flujo: `syncBcvOfficialRate()` reclama el singleton con UPDATE a `running` antes del fetch HTTP; checkout toma `FOR SHARE` en la misma fila dentro de su transacción. Si checkout obtiene primero el lock, el UPDATE de inicio de sync espera hasta el final de la venta; si sync confirma primero `running`, checkout observa ese estado y falla cerrado. La finalización del sync verifica `attempt_id` bajo `FOR UPDATE` y persiste tasa + estado terminal en una transacción, evitando que intentos supersedidos sobrescriban al vigente.
- Permisos: migración 0021 concede SELECT y UPDATE por columnas a `microapp_runtime`, sin INSERT/DELETE/TRUNCATE; la prueba runtime-role verifica el lock compartido frente a UPDATE concurrente.
- Dictamen de código: no se encontró un bloqueo de corrección en el flujo revisado de checkout/sync. La validación no equivale a aprobación formal de PR ni a readiness de producción.
- Riesgo operativo pendiente: el Cron BCV está programado para `0 22 * * 1-5`, exige `APP_ENV=production` y `BCV_SYNC_ENABLED=true`, y permanece deshabilitado por defecto. No se observó un mecanismo de retry inmediato ni alerta operativa en este alcance. Si un intento falla o queda `running`, nuevas ventas siguen bloqueadas hasta el siguiente intento habilitado que finalice con éxito; hace falta definir alertas y recuperación operativa antes de producción.
- No hubo merge, cambios en main, escrituras Neon, deploy, activación Cron, cambios de secretos/DNS/billing ni uso de datos reales. Producción **NOT READY**.


## Defensa de integridad PostgreSQL — 2026-11-09

La revisión de la integración detectó que la regla de último éxito estaba aplicada en el handler, mientras que el trigger diferido previo de reconciliación de ventas solo verificaba tasa BCV válida/fecha efectiva. Como el rol runtime tiene permisos para escribir ventas, un escritor SQL directo podía no pasar por el guard del endpoint.

Se añade a migration 0021 el trigger diferido `sales_latest_bcv_sync_success`, mediante función `SECURITY DEFINER` propiedad de `microapp_migrator`, no ejecutable directamente por PUBLIC/runtime. Al completar una venta, bloquea con `FOR SHARE` el singleton y exige `last_success_at`, outcome `inserted`/`unchanged` y `last_effective_date` igual o posterior a la fecha Caracas actual. La aserción de migración verifica propietario, definición, permisos y trigger; una prueba PostgreSQL usa el login runtime para intentar completar una venta directamente con el último outcome `failed` y espera rechazo SQLSTATE 23514.

Esta defensa de base de datos complementa el guard de API; no demuestra resistencia ante compromiso del propio runtime, que conserva permisos de actualización column-scoped sobre el estado para ejecutar la sincronización. La validación exact-HEAD de esta ampliación queda pendiente hasta que termine CI del nuevo commit.
