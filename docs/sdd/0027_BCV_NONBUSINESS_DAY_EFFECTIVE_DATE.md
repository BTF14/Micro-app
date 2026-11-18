# Especificación técnica 0027 — Fecha efectiva BCV en fines de semana y feriados bancarios

**Estado:** especificación aprobada para revisión; no implementada.  
**Autoridad de producto:** `docs/decisions/ADR-20261117-bcv-nonbusiness-day-effective-date.md` (ADR aceptado el 2026-11-17).  
**Base documental:** `main` post-PR #380, merge SHA `7eebc7fc8d155c275c43859fb66fdeb0f8bd46fe`.  
**Alcance de esta especificación:** contrato para una futura migración aditiva `0027` y cambios API/UI. No crea ni autoriza la migración, código, despliegue, escritura Neon ni activación comercial.

## 1. Contexto, autoridad y precedencia

El checkout actual exige fecha efectiva igual al día Caracas. Esa regla está reflejada en `0021`, reforzada por el estado/lock de `0022` y por el guard financiero/FX de `0026`. El productor puede prepublicar una tasa cuya `effective_date` sea el siguiente día bancario. No se debe deducir ese día con un calendario SUDEBAN manual: la fecha publicada por BCV es la autoridad sobre la fecha valor de la tasa.

La precedencia normativa queda así:

1. Este contrato, derivado del ADR aceptado `ADR-20261117`, gobierna la selección de fecha efectiva para checkout BCV desde su futura implementación.
2. `0021`, `0022` y `0026` continúan gobernando el estado del productor, el límite de privilegios, el lock y la integridad de ventas/contingencia. Esta especificación no los reescribe ni reduce sus invariantes.
3. `SALES_CHECKOUT_MODEL.md` debe leerse con la enmienda de fecha efectiva de este documento. Su regla histórica de coincidencia exacta queda supersedida únicamente en cuanto a permitir, bajo las condiciones aquí definidas, una fila BCV futura dentro de cinco días; el fail-closed y la prohibición de tasas pasadas siguen vigentes.
4. `BANKING_CALENDAR_VERSIONING.md` conserva el historial y la procedencia del calendario 2026. Sus reglas de carga, versionado, revisión y publicación describen un subsistema documental opcional; quedan supersedidas para decidir la elegibilidad de una tasa de checkout. No se consultará ni exigirá calendario manual anual para seleccionar tasa BCV.
5. `PROJECT_PLAN.md` y `CURRENT_STATE.md` registran este paso como especificación, no como implementación ni cierre de gates.

No se borra ni reescribe historia de decisiones anteriores. La regla de 2026-11-08 que impedía usar la tasa del siguiente día hábil en fin de semana queda sustituida por el ADR 2026-11-17, solo para los escenarios y gates expresos de este contrato.

## 2. Definiciones y reloj de negocio

- `today`: fecha calendario calculada por el servidor en `America/Caracas`, nunca por el navegador, UTC truncado ni zona del dispositivo.
- `operation_date`: fecha Caracas de la operación de venta, congelada al completar la venta.
- `effective_date`: fecha valor que la publicación oficial BCV atribuye a una fila concreta de `exchange_rates`.
- `valid row`: fila `exchange_rates` con `source = 'BCV_OFFICIAL_HTML_V1'`, `validation_status = 'valid'`, moneda base/cotizada esperada, tasa numérica finita/positiva dentro del contrato de columna y correspondencia exacta de ID, valor y fecha efectiva.
- `healthy sync state`: singleton existente de `bcv_sync_state` con `last_success_at IS NOT NULL`, `last_error_code IS NULL`, `last_outcome IN ('inserted','unchanged')`, y `last_effective_date IS NOT NULL` que cubre la fecha efectiva elegida (`last_effective_date >= selected.effective_date`). Para los escenarios de prioridad 3 se exige además éxito ocurrido desde el inicio del día Caracas actual.
- `same Caracas day`: `last_success_at >= (today::timestamp AT TIME ZONE 'America/Caracas')`. El límite superior es implícitamente el instante actual de evaluación; una marca futura no es evidencia válida.

No existe dependencia de nombre de feriado, calendario SUDEBAN, día bancario inferido, ni etiqueta manual de feriado. La rama lunes-viernes cubre cualquier día sin fila exacta —incluido un feriado bancario— solo mediante evidencia de sync exitosa de ese mismo día.

## 3. Selección normativa de tasa BCV (orden obligatorio, fail-closed)

La API y SQL deben aplicar la misma función conceptual de elegibilidad y el mismo orden. Las fechas son inclusivas/exclusivas tal como se expresan:

### Prioridad 1 — fila oficial válida de hoy

Si existe una o más filas oficiales válidas con `effective_date = today`, elegir esa fecha exacta y usar exclusivamente la fila válida de hoy (si hay duplicados, el esquema/índice debe impedirlos o el selector debe fallar ante ambigüedad; nunca elegir arbitrariamente).

- No sustituirla por una fecha futura, aunque el productor haya prepublicado el lunes.
- Ejemplo: viernes con fila válida del viernes y fila válida del lunes → seleccionar viernes.
- El guard común de estado de sync de `0026` se mantiene: debe existir estado singleton, éxito conocido, outcome `inserted` o `unchanged`, `last_error_code IS NULL`, y `last_effective_date >= today`. La prioridad de fecha exacta no autoriza a ignorar una corrida fallida posterior ni un estado `running`.

### Prioridad 2 — sábado/domingo sin fila de hoy

Solo si no existe fila válida para `today` y `today` es sábado o domingo en Caracas:

- Buscar filas oficiales válidas con `effective_date > today AND effective_date <= today + 5`.
- Seleccionar la menor `effective_date`; exigir unicidad para esa fecha.
- Aceptar únicamente si el estado singleton cumple: `last_error_code IS NULL`, `last_outcome IN ('inserted','unchanged')`, `last_success_at IS NOT NULL` y `last_effective_date >= selected.effective_date`.
- No se exige que `last_success_at` sea del sábado/domingo: el ADR deliberadamente permite reutilizar la evidencia saludable de una publicación preobservada durante el fin de semana. Sí se exige que el estado no esté corriendo, fallido ni desactualizado respecto de la fila seleccionada.

### Prioridad 3 — lunes a viernes sin fila de hoy

Solo si no existe fila válida para `today` y el día Caracas es lunes a viernes (incluido un feriado bancario):

- Buscar y ordenar las mismas filas: `effective_date > today AND effective_date <= today + 5`; seleccionar la menor fecha, sin calendario manual.
- Exigir todas las condiciones de estado de prioridad 2 y además `last_success_at >= inicio del día calendario actual en America/Caracas`.
- La ausencia de éxito del propio día implica rechazo, incluso si existe una fila futura válida prepublicada y la última sincronización exitosa fue ayer.
- Una corrida `unchanged` de hoy es válida como evidencia de observación actual si el productor realmente consultó la fuente oficial y confirmó que la publicación no cambió; `unchanged` no significa que la tasa se haya descargado o insertado de nuevo.

### Rechazo obligatorio

Si ninguna prioridad produce una única fila elegible, responder checkout con HTTP `409`, código `BCV_RATE_NOT_CURRENT`. Nunca usar:
- una tasa con `effective_date < today`;
- una fila `stale`, inválida, de otra fuente, moneda incorrecta o tasa no positiva;
- una fecha `> today + 5`;
- una fila futura en viernes cuando sí existe fila válida exacta de viernes;
- una fila futura entre semana sin sync exitosa del propio día;
- una fila futura cuando el estado está `running`, stale-running, `failed`, con `last_error_code` no nulo, sin éxito, sin fecha efectiva de cobertura o ambiguo.

Una tasa no se convierte en elegible por tener `fetched_at` reciente; `fetched_at` es metadato de captura de la fila, no el reloj de frescura del productor.

## 4. Contrato de sincronización, `last_effective_date` y `unchanged`

### 4.1 Estado mutable y bloqueo

`bcv_sync_state` (creado en `0021`, restringido en `0022`) es un singleton operativo mutable. La API runtime solo lee/usa el helper estrecho de lock `lock_bcv_sync_state()`; el productor `microapp_bcv_sync` conserva únicamente sus grants de columnas. No conceder SELECT/INSERT/UPDATE adicionales, membership, EXECUTE nuevo ni permisos de tabla al runtime o al productor para facilitar 0027.

El checkout toma el lock compartido del singleton antes de evaluar `today`, la fila y el snapshot. El productor debe actualizar ese mismo singleton al iniciar y terminar cada intento. El lock establece un orden serializable práctico entre checkout y transiciones del estado: si el productor ya confirmó `running`/fallo, el checkout lo observa y rechaza; si el checkout adquirió primero el lock y valida un estado sano, la actualización del productor espera y la venta queda ordenada antes de ese intento.

### 4.2 Cobertura de fecha efectiva

Para toda prioridad, la fecha reportada por el último sync exitoso debe cubrir la fila elegida: `last_effective_date >= selected.effective_date`. La fila seleccionada se valida independientemente por ID, source, validation_status, rate y effective_date. Esto evita que un estado de sync de fecha anterior certifique una fila posterior.

La fila exacta de hoy prevalece sobre una fila futura. Por ello, `last_effective_date` puede ser posterior a `today` (por ejemplo, lunes prepublicado el viernes) sin cambiar la prioridad: si existe fila válida de viernes se selecciona viernes; la cobertura del estado es suficiente, pero no transforma lunes en tasa aplicable el viernes.

### 4.3 Semántica exigida de `inserted` y `unchanged`

- `inserted`: el productor observó y validó una publicación oficial y persistió una fila nueva o la actualización permitida por el contrato existente.
- `unchanged`: el productor completó una nueva consulta/observación de la fuente oficial, verificó la fecha efectiva publicada y determinó que el contenido ya persistido no cambió. Debe actualizar `last_success_at`, `last_outcome`, `last_effective_date` y `updated_at` de forma coherente en la misma transacción. No basta con reutilizar el estado anterior ni con no hacer nada.
- El trigger de observaciones append-only incorporado en `0026` debe seguir registrando la observación exitosa; la implementación 0027 debe verificar que la observación cubre la fecha efectiva seleccionada o documentar una comprobación equivalente que no requiera grants adicionales.
- `exchange_rates.fetched_at` permanece como hora de captura/inserción de la fila y no debe reescribirse artificialmente para simular una observación nueva. La evidencia nueva está en `bcv_sync_state.last_success_at` y `bcv_sync_success_observations.observed_at`.

### 4.4 Estados degradados

| Estado observado bajo lock | Resultado |
|---|---|
| `last_outcome = 'running'` (incluye intento atascado/stale-running) | Rechazar 409; no rescatar el éxito anterior |
| `last_error_code IS NOT NULL` tras una corrida fallida posterior | Rechazar 409 aunque exista fila prepublicada válida |
| `last_outcome = 'failed'` | Rechazar 409 |
| `last_success_at` de día anterior, sábado/domingo | Puede pasar prioridad 2 si outcome/error/cobertura siguen sanos |
| `last_success_at` de día anterior, lunes-viernes sin fila de hoy | Rechazar 409 por falta de éxito del día |
| `last_effective_date < selected.effective_date` o NULL | Rechazar 409 |
| Estado singleton ausente, duplicado o incoherente | Rechazar 409 / constraint failure; no asumir salud |

Una falla posterior revoca la elegibilidad para nuevos checkouts mientras sea el último estado observado. No borra ni modifica filas históricas ni ventas completadas. Un éxito posterior puede restablecer la elegibilidad según la prioridad del día.

## 5. Snapshot histórico dual e integridad SQL

### 5.1 Fechas que no deben confundirse

Cada venta completada debe preservar, de forma inmutable y explícita:

1. `operation_date`: fecha Caracas de la operación, capturada por PostgreSQL al completar la venta, no derivada posteriormente del reloj del navegador ni recalculada al consultar.
2. `exchange_rate_effective_date` (nombre de columna propuesto): fecha valor publicada por BCV de la fila vinculada a `exchange_rate_id`.

Para `fx_source = 'bcv_official'`, ambas fechas son obligatorias. `exchange_rate_effective_date` debe coincidir exactamente con la fila oficial seleccionada; puede ser igual a `operation_date` o posterior conforme a prioridades 2/3, nunca anterior y nunca más allá de +5 días. El snapshot también conserva `exchange_rate_id`, `exchange_rate_snapshot`, `fx_source` y los campos de auditoría existentes.

Para `fx_source = 'manual_contingency'`, no inventar una fecha efectiva para la tasa manual. Mantener `operation_date` y los snapshots/referencia `reference_effective_date` ya guardados en la autorización 0026; la columna de fecha efectiva de la tasa oficial seleccionada permanece NULL si no existe tal tasa. La contingencia manual no se habilita ni se amplía por esta especificación.

Las ventas históricas no se revalúan ni se reescriben. La migración futura debe añadir columnas nullable para compatibilidad histórica y exigirlas solo a nuevas ventas completadas mediante constraints/guards apropiados; no rellenar retrospectivamente una fecha de operación no demostrable.

### 5.2 Guard/trigger independiente en 0027

La futura migración debe ser estrictamente aditiva después de `0026`, sin editar `0021`, `0022` o `0026`. Debe:

- Añadir snapshots de fecha y constraints compatibles con filas históricas.
- Capturar una sola marca temporal de finalización con `clock_timestamp()` y derivar `operation_date = (captured_at AT TIME ZONE 'America/Caracas')::date`. La captura se realiza después de adquirir el lock de sync para evitar discrepancias de medianoche; la misma fecha congelada se usa en todas las validaciones de esa finalización.
- Congelar las fechas junto a los campos FX al pasar de draft a completed; impedir UPDATE posterior de `operation_date`, `exchange_rate_effective_date` y el resto del snapshot. Un trigger BEFORE debe capturar/validar para que el guard diferible no dependa del día en que se ejecute al commit.
- Reemplazar/evolucionar mediante `CREATE OR REPLACE FUNCTION` solo las funciones estrictamente necesarias, preservando owner `microapp_migrator`, `SECURITY DEFINER`, `SET search_path = pg_catalog`, EXECUTE solo trigger-only cuando corresponda y revocaciones explícitas a PUBLIC/runtime/producer. No conceder privilegios directos nuevos.
- En la validación independiente de venta completada, tomar `bcv_sync_state` `FOR SHARE`, recomputar desde PostgreSQL la prioridad aplicable usando `operation_date`, verificar outcome/error/same-day según corresponda, cobertura `last_effective_date`, y comprobar que la fila `exchange_rates` vinculada coincide en ID, source, estado valid, valor y `effective_date` con los snapshots.
- Aplicar el mismo contrato a INSERT/UPDATE directos de roles runtime: el trigger se ejecuta independientemente del endpoint y no puede confiar en flags enviados por el cliente, en el resultado de la API ni en un permiso especial del rol. Las ventas manuales siguen su rama de 0026 y sus comprobaciones propias.
- Mantener el lock de la fila de sync hasta que termine la transacción de checkout; definir orden de locks único para evitar deadlocks con la actualización del productor.
- Incluir assertions que inspeccionen owner, SECURITY DEFINER, search_path, trigger enabled/always cuando aplique, funciones/ACL, columnas, constraints, triggers y ausencia de nuevos grants directos a `microapp_runtime` y `microapp_bcv_sync`.

No debilitar ni reemplazar silenciosamente `assert_completed_sale_reconciled()` de 0026: preservar íntegramente reconciliación de líneas, subtotal/total, pagos, moneda, equivalentes USD, turno, sucursal/almacén, stock/ledger, auditoría, fuente FX, ACK manual y append-only. Las nuevas comprobaciones se insertan como extensión compatible y se prueban junto con todos los invariantes previos.

### 5.3 Carrera, fallo posterior y medianoche

- Sync y checkout se serializan sobre el mismo singleton. Checkout que toma primero el lock usa el estado sano que existía en ese punto; una corrida que toma primero el lock deja `running` o su resultado visible antes de que checkout continúe.
- Si una sincronización falla después de prepublicar una tasa, `last_error_code`/outcome fallido bloquea nuevos checkouts. La fila prepublicada permanece para auditoría, no se borra ni se convierte en tasa vigente.
- Un fallo que se confirma después de que el checkout ya adquirió el lock no invalida retroactivamente esa venta; la transacción queda ordenada antes del intento fallido.
- Si la operación cruza medianoche Caracas, el instante capturado después del lock determina una sola `operation_date`. El API debe usar la fecha devuelta/derivada en el mismo contexto transaccional; no recalcularla antes/después de locks en procesos distintos.

## 6. Impacto por capa — futura PR de implementación

### 6.1 PostgreSQL aditivo

- Crear `apps/api/migrations/0027_bcv_nonbusiness_day_effective_date.sql` y su `.assertions.sql`.
- Migración transaccional, idempotencia/preflight siguiendo los patrones del repo, lock_timeout y login directo `microapp_migrator`.
- No modificar migraciones históricas ni cambiar grants de roles. Incluir pruebas de upgrade sobre perfil BCV 0001–0027 y restore/assertions pertinentes.

### 6.2 API — `exchange-rates.ts`

- Compartir una única función pura de selección/eligibilidad para API y latest; todas las comparaciones de fechas usan date strings/SQL date, no parseo UTC implícito.
- Devolver la fila elegida, `operation_date`, `effective_date`, razón de prioridad (`today_exact`, `weekend_prepublished`, `weekday_same_day_sync`) y estado de sync sanitizado.
- Si no hay elegible: `409 BCV_RATE_NOT_CURRENT` en checkout. Latest debe distinguir `current`, `scheduled`, `stale` y `unavailable`; una futura prepublicada no se presenta como current antes de su fecha elegible.
- Mantener la tasa decimal como string NUMERIC exacto; nunca float.

### 6.3 Checkout — `sales-checkout.ts`

- Ejecutar selección, lock, lectura de sync y creación/completado/snapshot dentro de la misma transacción y orden de locks definido.
- Persistir `operation_date` y `exchange_rate_effective_date`; el SQL recalcula y valida de forma independiente.
- Toda venta exige tasa BCV aplicable, incluso liquidación 100% USD. Preservar montos/monedas originales de pagos y conciliación 0026.
- Ante mismatch entre selección API y guard SQL, abortar toda la transacción; no fallback silencioso.

### 6.4 Contingencia — `fx-contingency.ts`

- Una fila futura que ya sea elegible según 0027 es tasa BCV oficial aplicable; no debe dispararse contingencia manual por la mera ausencia de fila exacta de hoy.
- La contingencia manual solo puede ser candidata cuando el selector 0027 no encuentra ninguna tasa oficial elegible y se cumplen todos los gates preexistentes de 0026/AC-6. Esta especificación no enciende `FX_CONTINGENCY_ENABLED` ni cierra AC-6.
- Recuperación: una nueva observación exitosa posterior a `starts_at` solo restaura BCV cuando la fila observada es elegible para la fecha Caracas actual bajo la misma prioridad 0027, su fecha está cubierta por `last_effective_date`, y se preservan los requisitos de evidencia de 0026. No marcar restored solo porque exista cualquier fila futura o porque `last_outcome = unchanged` sin verificar la fecha/valor observados.

### 6.5 Panel BCV — `apps/web/src/App.tsx`

- Mostrar estado inequívoco: `current` para tasa aplicable hoy, `scheduled` para prepublicada aún no aplicable, `stale` para estado fallido/running/cobertura insuficiente, `unavailable` si no hay fila elegible.
- Mostrar fecha de operación Caracas y fecha valor BCV por separado. Mensajes para cajero/admin deben decir “Tasa BCV válida para la operación de hoy” o “Tasa publicada para el DD/MM; aún no aplicable”, sin llamar current a una futura.
- El estado debe reevaluarse al cambio de fecha Caracas, al recuperar visibilidad/foco y al refrescar datos. No depender de la zona del dispositivo. Al cruzar medianoche, refrescar selector/latest y no seguir mostrando la tasa del día anterior como actual.
- Nunca mostrar una tasa stale como vigente; no revelar datos internos sensibles del productor.

## 7. Matriz obligatoria de pruebas PostgreSQL efímero

Todas las pruebas usan PostgreSQL efímero, roles sintéticos con los privilegios equivalentes, fuente BCV fixture oficial sintética, fechas de reloj controladas y ninguna conexión a Neon main/producción. Cada caso debe probar tanto selección API como rechazo/aceptación SQL directa.

| Caso | Filas BCV | Sync state | Resultado esperado |
|---|---|---|---|
| Viernes exacto + prepublicada lunes | viernes y lunes válidas | sano, cubre lunes | elegir viernes |
| Sábado sin fila exacta | lunes válida | sano; outcome inserted | elegir lunes |
| Domingo sin fila exacta | lunes válida | sano; outcome unchanged | elegir lunes |
| Lunes-viernes feriado, sync hoy | siguiente fecha hábil publicada dentro de +5 | éxito hoy; error NULL; outcome inserted/unchanged | elegir menor fecha |
| Lunes-viernes feriado, sync de ayer | misma fila futura | last_success_at < inicio del día | 409 |
| Lunes-viernes sin fila exacta y sin sync hoy | fila futura válida | last_success_at NULL/ayer | 409 |
| Feriado puente largo dentro de +5 | menor fecha futura válida en ventana | sync requerido por día | elegir menor fecha |
| Única fila futura > +5 | fecha > today+5 | sano | 409 |
| Fila válida hoy y fila futura posterior | ambas válidas | sano | elegir hoy exclusivamente |
| Fila futura con estado stale/invalid | future row invalid/stale | sano | 409 |
| Fila pasada solamente | effective_date < today | sano | 409 |
| Sin filas / singleton ausente | ninguna | cualquier estado | 409 / integridad fail-closed |
| Duplicado de fecha candidata | dos filas oficiales válidas para misma fecha | sano | constraint o rechazo por ambigüedad |
| Sync concurrente antes de checkout | fila futura | sync confirma running/failure primero | checkout espera lock y rechaza |
| Checkout lock antes de sync | fila futura | estado sano inicial; sync posterior espera | checkout puede completar; sync queda después |
| Fallo posterior a prepublish | future row previamente insertada | last_error_code no NULL / failed | siguientes checkouts 409 |
| Stale running | future row | last_outcome running atascado | 409 |
| Carrera de medianoche | filas en torno al límite de fecha | locks intercalados | una operation_date consistente capturada después del lock |
| Ventas concurrentes | misma fila/sync | N checkouts paralelos | todos validan misma fecha/estado sin doble consumo |
| Actualización concurrente de exchange_rates | fila seleccionada | sync intenta invalidar/cambiar mientras checkout | locks/constraints serializan; sin snapshot mixto |
| Escritura SQL directa runtime | intento de completar venta con tasa pasada/futura inválida/sin sync | cualquiera no elegible | trigger rechaza; grants no ampliados |
| Conciliación 0026 | venta válida por 0027 | pagos/líneas/stock/turno/auditoría | todas las assertions previas siguen pasando |

Para cada negativo se comprueba rollback completo: no queda venta completada, pago, movimiento de stock, asiento de auditoría parcial ni snapshot inconsistente. Para cada positivo se comprueba ID/valor/effective_date congelados y que cambiar la tasa posterior no reescribe la venta.

## 8. Criterios de aceptación de la futura implementación

- [ ] Prioridades 1–3 idénticas en API y SQL, con rechazo 409 para cualquier ambigüedad o falta de evidencia.
- [ ] Viernes exacto nunca reemplazado por lunes prepublicado.
- [ ] Fin de semana usa menor fecha oficial futura solo con estado sano y cobertura.
- [ ] Lunes-viernes sin fila exacta exige sync exitoso del mismo día Caracas.
- [ ] Ninguna dependencia de calendario manual ni feriado codificado.
- [ ] Snapshot dual operation/effective date inmutable y compatible con histórico.
- [ ] Lock/orden de concurrencia probado, incluidas corrida posterior fallida y stale-running.
- [ ] SQL protege también escrituras directas runtime; 0022 privilegios intactos.
- [ ] Invariantes financieros, contables, stock, auditoría y append-only de 0026 conservados.
- [ ] API latest y panel muestran current/scheduled/stale/unavailable con cambio de medianoche.
- [ ] Contingencia manual no se activa por tasa futura válida y sigue bloqueada por AC-6/flag.
- [ ] Suite PostgreSQL efímera completa; assertions de ACL/owner/trigger; CI exact-SHA.
- [ ] Sin Neon main, producción, secretos ni datos reales en pruebas.

## 9. Límites explícitos de esta entrega documental

Esta especificación no crea `0027_*.sql`, no modifica `apps/**`, no altera workflows/dependencias, no despliega, no ejecuta migraciones, no escribe en Neon, no activa `FX_CONTINGENCY_ENABLED`, no cierra AC-6/AC-7 ni Issue #53, y no levanta freeze v1.1. La implementación requiere una PR posterior y sus gates independientes.
