# Reconciliación autoritativa — freshness BCV y contingencia FX — 2026-11-09

> Este bloque corrige afirmaciones obsoletas de snapshots históricos. No implica que el código de integración esté en `main`, ni autoriza merge, despliegue o activación de servicios.

## PR #287 — evidencia de checkout y último sync BCV

- Rama: `integration/bcv-checkout-rehearsal-20261109`; PR #287 OPEN. La documentación/descripcion del PR mantiene el estado Draft; debe seguir Draft.
- HEAD exacto vigente de la rama, reconsultado en GitHub el 2026-11-09: `ccb430c609ceee6114038511ed93d48dc1510269`.
- En ese SHA exacto, la consulta de workflow runs asociadas a PR devolvió **11/11 SUCCESS**. El fixture HTML de regresión está identificado como sintético; la captura oficial BCV sigue pendiente. También se detectó que el wrapper DB no fija deadlines explícitos de conexión/consulta; el umbral de watchdog sigue sin definir hasta medir y probar esos límites. El combined legacy status no devolvió status contexts. No se infieren check-runs a partir de workflow runs; no reutilizar cifras históricas de 14/15 checks como si fueran evidencia del HEAD actual.
- Reviews formales: ninguna registrada. Review threads: ninguno. CI verde no equivale a aprobación formal ni readiness.
- El guard de freshness **sí está implementado en la rama #287**: `findApplicableCheckoutRate()` consulta `bcv_sync_state` con `FOR SHARE` dentro de la transacción, exige `last_success_at` no nulo, `last_outcome` `inserted` o `unchanged`, `last_effective_date` no anterior a hoy en Caracas, y después exige una fila `exchange_rates` `valid` con `effective_date` exactamente igual a hoy.
- Fallan cerrados el estado singleton ausente, last-success ausente, outcomes `running`, `failed`, `older` o desconocidos, fecha efectiva anterior, fila ausente/inválida y error de base de datos.
- Tests unitarios en `apps/api/src/sales-checkout.test.ts` cubren fallo posterior, sync running, last-success ausente, estado singleton ausente, outcome older, fecha anterior, tasa stale, fecha prepublicada antes de su vigencia y error DB. La prueba de integración PostgreSQL en `sales-checkout.integration.test.ts` y migration 0021 cubren la defensa del trigger diferido `sales_latest_bcv_sync_success` frente a completar una venta con el último sync fallido.
- Por tanto, las menciones históricas que dicen que `findApplicableCheckoutRate()` no consulta `bcv_sync_state.last_success_at` están **obsoletas para el HEAD actual de #287**. La implementación permanece en la rama Draft y todavía no está integrada en `main`.

## Gates que siguen abiertos

1. Fixture reproducible de HTML oficial BCV y prueba del parser con respuesta real; no sustituir la fuente primaria por copias de terceros.
2. Justificación y aprobación de `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7`; no inventar TTL ni cambiar esos límites sin decisión.
3. Calendario bancario oficial SUDEBAN verificable.
4. Monitor de `BCV_SYNC_FAILED`, destino autorizado y prueba de entrega; watchdog para `running` estancado basado en SLO medido.
5. Identidad efectiva del Worker, recuperación aislada, revisión legal/contable y reglas comerciales de pagos parciales, cambio, anulaciones y devoluciones.
6. Obtener revisión independiente y aprobación formal antes de promover #287. No merge, deploy, Neon main writes, migraciones remotas ni activación Cron.

## PR #288 — contingencia cambiaria

- PR #288 está **CLOSED/MERGED**, docs-only, incorporada a `main` por squash en `bfa7d0047d158d5caae4798337f239e767c30acd`.
- La especificación FX continúa como propuesta no implementada. AC-1–AC-4 están documentados; AC-5 (permiso Owner/Admin delegado), AC-6 (validación legal/contable) y AC-7 (revisión independiente de seguridad/datos) siguen pendientes.
- No crear endpoints, permisos, migraciones ni UI de contingencia hasta cerrar esos gates. El checkout actual de la rama #287 conserva el modo BCV fail-closed.

## Seguridad y estado de producción

**Producción: NOT READY.** No se ha autorizado merge de #255/#269/#287, deploy productivo, escrituras Neon, activación Cron, cambios manuales Cloudflare, secretos, DNS, billing ni uso de datos reales.

---

## Reconciliación posterior a PR #291 — snapshot 2026-11-09 UTC

**Main al iniciar esta reconciliación:** `56ad2b29b994fbad31275c801e8f23a2b9736db2` (merge de PR #291). Post-merge exact-SHA: **11/11 check-runs SUCCESS**. Este snapshot documenta el estado inmediatamente posterior a #291; el PR docs-only que lo contiene volverá a mover main, por lo que reconsultar GitHub después del merge.

### PRs de integración y conflictos de sincronización
| PR | HEAD | Base registrada | Ahead / behind main | Check-runs | Workflow runs | Estado |
|---|---|---|---:|---:|---:|---|
| #255 BCV | `b0e47205b96f636b2ab270304d2598423a50ccc3` | `9c6b30281ed59726e532da840568fc9e80b528f7` | 88 / 2 | 15/15 SUCCESS | 10/10 SUCCESS | OPEN/Draft |
| #269 checkout + ledger | `7fc91b54f869664febb6a7daf1ed05b408bd8430` | `9c6b30281ed59726e532da840568fc9e80b528f7` | 63 / 2 | 18/18 SUCCESS | 11/11 SUCCESS | OPEN/Draft |
| #287 BCV + checkout rehearsal | `254ebb6e741f7c1b147fbd4880bc188f17204807` | `9247cb24effd7d98be29aabe8d44c51fbab7a138` | 111 / 2 | 15/15 SUCCESS | 11/11 SUCCESS | OPEN/Draft |

GitHub reporta `mergeable=false` / `mergeable_state=dirty` para #255, #269 y #287 después de los dos merges documentales #288 y #291. No hacer force-push ni intentar sincronización automática.

Archivos modificados tanto en las ramas como en el tramo de main:
- #255/#269: `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PRODUCTION_READINESS.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/STATE_JOURNAL.md`, `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`, `docs/WORK_CHECKPOINT.md`.
- #287: `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/STATE_JOURNAL.md`, `docs/WORK_CHECKPOINT.md`.

La lista es la intersección de paths modificados, no una afirmación de que cada archivo tenga conflicto textual. Antes de resolver, comparar base, main y cada rama, preservar evidencia específica de cada una y validar la combinación. Preferir una PR de reconciliación aislada por rama; no sobrescribir documentos completos.

### Estado de producto y gates
- PR #288 está MERGED y documenta Gestión de contingencia cambiaria como **propuesta no implementada**.
- PR #291 está MERGED; actualizó CURRENT_STATE/HANDOFF/CHECKPOINT/PLAN/JOURNAL/SECURITY_ROADMAP y añadió tarea ODD de reconciliación.
- #287 corrigió la carrera de intentos BCV supersedidos con `attempt_id` bajo `SELECT ... FOR UPDATE` y una prueba PostgreSQL de tasas diferentes; PR #289 y #290 se integraron solo en la rama #287. Su código HEAD validado es `254ebb6...`, 15/15 check-runs y 11/11 workflows SUCCESS.
- Freshness sigue P1: checkout no consume `bcv_sync_state.last_success_at`; una fila same-day `valid` puede permanecer utilizable después de un fallo posterior. Definir política y pruebas fail-closed.
- Los umbrales `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7` no tienen justificación/aprobación de negocio.
- No se obtuvo fixture HTML real BCV ni circular/calendario oficial 2027 verificable. BCV directo devolvió 502; SUDEBAN no pudo recuperarse directamente y la búsqueda oficial no devolvió PDF 2027. No afirmar inexistencia ni usar terceros como fuente primaria.
- Revisión legal/contable de tasa efectiva, IVA/facturación, contingencia manual y evidencia de aceptación del cliente sigue pendiente.
- PR #255/#269/#287 no tienen review APPROVED formal. #269 conserva un único thread histórico RESOLVED; #255/#287 sin threads abiertos.

### Seguridad y límites
No merge de #255/#269/#287. No deploy manual, Neon writes, Cron BCV activado, Cloudflare manual, secretos, DNS, billing ni datos reales. Neon rehearsal #42507066215 fue aislado; no repetir. **Producción: NOT READY.**

### Próxima secuencia
1. Resolver conflictos de #287 primero, preservando la evidencia de integración BCV+checkout; mantener Draft.
2. Después reconciliar #255/#269 individualmente, sin copiar snapshots obsoletos ni force-push.
3. Cerrar freshness/last-success, fixture BCV, calendario oficial, permisos/runtime identity y revisión legal/contable.
4. Revalidar CI en cada SHA final y obtener la aprobación requerida antes de integrar código.

## Revalidación autoritativa — 2026-11-09 UTC

**Main observado:** `bfa7d0047d158d5caae4798337f239e767c30acd` (merge documental #288). Sus check-runs post-merge: **11/11 SUCCESS**. Este bloque prevalece sobre snapshots históricos inferiores; consultar GitHub antes de cualquier acción posterior.

### Cambios documentales recientes
- **PR #288 — Gestión de contingencia cambiaria:** MERGED por squash en main, SHA `bfa7d0047d158d5caae4798337f239e767c30acd`. Añade `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`, `docs/decisions/ADR-20261109-fx-contingency-authorization.md` y `odd/tasks/fx-contingency-management.md`. Es una propuesta documentada, no una funcionalidad implementada ni habilitada.
- La propuesta define BCV automático como modo normal; contingencia manual temporal, no automática, con motivo, tasa, alcance, vencimiento, PIN individual para pequeño negocio, MFA/doble aprobación opcional para empresa, auditoría y snapshots inmutables. Pendiente reconciliar Owner vs Admin delegado con la matriz de permisos y revisión legal/contable venezolana.

### PRs de integración — lectura viva de GitHub
| PR | HEAD exacto | Comparación contra main | Check-runs | Workflow runs | Estado |
|---|---|---:|---:|---:|---|
| #255 BCV | `b0e47205b96f636b2ab270304d2598423a50ccc3` | 88 ahead / 1 behind | 15/15 SUCCESS | 10/10 SUCCESS | OPEN/Draft |
| #269 checkout + ledger | `7fc91b54f869664febb6a7daf1ed05b408bd8430` | 63 ahead / 1 behind | 18/18 SUCCESS | 11/11 SUCCESS | OPEN/Draft |
| #287 BCV + checkout rehearsal | `254ebb6e741f7c1b147fbd4880bc188f17204807` | 111 ahead / 1 behind | 15/15 SUCCESS | 11/11 SUCCESS | OPEN/Draft |

- #255, #269 y #287 tienen `mergeable=true` en la consulta, pero **ninguna tiene aprobación formal APPROVED**. #269 tiene un review thread histórico, marcado RESOLVED; #255 y #287 no muestran threads abiertos.
- #287 incluye la corrección de concurrencia: el intento supersedido verifica `attempt_id` bajo `SELECT ... FOR UPDATE` antes de persistir; una prueba PostgreSQL fuerza dos tasas diferentes para la misma fecha y confirma que la tasa más nueva permanece `valid`. PR #289 (fix de aserción del handler) y PR #290 (handoff/ODD) se integraron únicamente en la rama de #287; no en main.
- Las ramas #255/#269 parten de base registrada `9c6b30281ed59726e532da840568fc9e80b528f7`; #287 de `9247cb24effd7d98be29aabe8d44c51fbab7a138`. Todas aparecen 1 commit detrás de main por el merge documental #288. No force-push; sincronizar no destructivamente y volver a ejecutar CI exact-HEAD cuando corresponda.

### Gates P1 pendientes — BCV y checkout
1. **Freshness:** la migración 0021 registra `last_attempt_at/last_success_at`, pero `findApplicableCheckoutRate()` no consulta `bcv_sync_state`. Una fila del día `valid` puede seguir siendo consumida tras un intento de sincronización fallido. Definir política de last-success y prueba fail-closed; no inventar ventana.
2. **Umbrales:** `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7` siguen hard-coded sin justificación/aprobación como política.
3. **Fixture BCV:** no se obtuvo HTML real oficial reproducible; la recuperación directa de `https://www.bcv.org.ve/` devolvió 502 en esta consulta.
4. **Calendario:** SUDEBAN muestra una sección “Calendario Bancario”, pero la página directa agotó el tiempo y la búsqueda restringida al dominio oficial no devolvió circular/PDF oficial 2027 verificable. No afirmar que no exista; no usar calendarios de terceros como prueba primaria.
5. **Legal/contable:** validar fecha efectiva, IVA/facturación, tasa manual excepcional y evidencia de aceptación del cliente antes de habilitar.
6. **Checkout comercial:** revisar devoluciones, anulaciones, cambio en efectivo y pagos parciales; mantener las ventas completadas append-only.

### Seguridad y producción
- No merge de #255/#269/#287; siguen Draft. CI verde no equivale a aprobación formal ni a readiness productiva.
- No deploy manual, no escrituras Neon, no Cron BCV activado, no cambios Cloudflare manual, secretos, DNS, billing ni datos reales.
- Neon rehearsal #42507066215 fue aislado y cubrió 0001–0019; no repetir escrituras.
- **Producción: NOT READY.**

### Próxima secuencia
1. Cerrar freshness/last-success con decisión de producto y pruebas PostgreSQL de fallos y concurrencia.
2. Obtener fixture oficial BCV y circular/calendario oficial SUDEBAN verificables; mantener bloqueos si la fuente no es accesible.
3. Revisar permisos y runtime identity de Worker; no activar Cron.
4. Validar legal/contablemente la política cambiaria y el contrato comercial checkout.
5. Solo después, sincronizar ramas de forma no destructiva, revisar PRs y obtener la aprobación requerida.

## Revalidación viva de integración — 2026-11-08 UTC

**Precedencia:** este bloque es la lectura más reciente antes del commit documental que lo contiene. Los snapshots inferiores son historial y no deben usarse como estado vivo. Main observado: `594382f6f191f2ea0b55d913683841e51c210e5d`; post-merge CI: 13/13 check-runs y 11/11 workflow runs `push` SUCCESS.

### PRs abiertas relevantes
- **#286 — reconciliación documental:** OPEN/Draft, docs-only. Snapshot validado antes de este commit: HEAD `3666bc1043733a21f880ca5da68a6be45e59e261`, 25 ahead / 0 behind, GitHub `mergeable=true`; 14/14 check-runs SUCCESS y 12/12 workflow runs SUCCESS (10 `pull_request` + 2 `push`). Sin reviews formales ni threads inline. Este commit cambia la punta de la rama: reconsultar HEAD y ejecutar/validar checks exactos antes de cualquier decisión. Mantener Draft.
- **#269 — checkout + ledger:** OPEN/Draft, HEAD `0ae7f1d71f9bb2155bddca5b5dcc0a2b7785b089`; base registrada `9c6b30281ed59726e532da840568fc9e80b528f7`. Contra main `594382f...`: 27 ahead / 3 behind; GitHub informa `mergeable=true`. En el HEAD exacto: 16/16 check-runs SUCCESS y 14/14 workflow runs SUCCESS (11 `pull_request` + 3 `push`). Reviews: tres COMMENTED, cero APPROVED; hilo inline de sucursal inactiva RESOLVED. Mantener Draft por contrato comercial checkout aún no aprobado y decisión pendiente sobre dependencia BCV para ventas USD-only.
- **#255 — BCV:** OPEN/Draft, HEAD `7e43d7fd1519889605174da5818190bb84685059`; base registrada `9c6b30281ed59726e532da840568fc9e80b528f7`. Contra main `594382f...`: 54 ahead / 3 behind; GitHub informa `mergeable=true`. En el HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS (10 `pull_request` + 3 `push`). Mantener Draft por política de anomalías/freshness, persistencia de último intento/éxito y alerta externa, fixture HTML oficial y calendario de feriados.
- **#233:** CLOSED como superseded por #269, no merged; conservar rama y commits históricos. **#193:** mantener intacta.

### Neon y producción
El ensayo #42507066215 aplicó y verificó 0001–0019 únicamente en `microapp_rehearsal`. No repetir escrituras ni migraciones remotas. Esto no certifica identidad del Worker productivo ni preparación comercial. Neon main, parent clone `neondb`, secretos, Cloudflare manual, DNS, billing y datos reales permanecen fuera de alcance. **Producción: NOT READY.**

## Actualización posterior a PR #285 y cierre de #233 — 2026-11-08 UTC

Esta corrección parte de main `594382f6f191f2ea0b55d913683841e51c210e5d`, merge SHA de PR #285. No etiquetar ese SHA como punta posterior a la integración de esta PR; consultar GitHub tras el merge para la punta nueva.

### Estado reconciliado
- PR #285 MERGED por squash en `594382f6f191f2ea0b55d913683841e51c210e5d`. Su HEAD exacto `8d7acfa3325f59c79e8c98cebf6e9e60ac0c4500` pasó 14/14 check-runs y 12/12 workflow runs. En el SHA de main `594382f...`, post-merge CI terminó SUCCESS: 13/13 check-runs y 11/11 workflow runs `push` SUCCESS; incluye CI, Playwright, PostgreSQL migration runner, database migration validation, seguridad, secret-history, ODD y SAST.
- **PR #286 — reconciliación documental:** OPEN/Draft, docs-only, el HEAD validado en el snapshot inicial de esta actualización fue `86ad02e426c328cd2bb4a8436d0910b0f06ecd2b`; el siguiente snapshot registró `9071c4921b38343f934a747bec77841791cfd2d6`, base `594382f6f191f2ea0b55d913683841e51c210e5d`, 21 ahead / 0 behind. En ese SHA: 13/13 check-runs SUCCESS y 10/10 workflow runs SUCCESS; los seis checks requeridos por la protección de `main` (`verify`, `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history`, `Trivy filesystem and configuration scan`, `postgres-migration`) están SUCCESS. La rama `main` aparece protegida; el resumen de branch API expone esos seis checks, pero el endpoint de configuración detallada devuelve 403. Sin reviews formales ni threads inline. Mantener Draft: CI verde no equivale a aprobación independiente ni autoriza merge automático. Este documento se actualizó desde el SHA `9071c492...`; el commit documental resultante cambia la punta. Consultar GitHub para el HEAD posterior y no reutilizar CI de SHAs anteriores.
- **PR #233 ya está CLOSED como superseded por #269, no merged.** La revisión semántica confirmó que sus 18/18 paths existen en #269; 5 son byte-idénticos y 13 fueron evolucionados. La migración 0015 y sus assertions fueron endurecidas; el endpoint/tests se ampliaron con rate limiting, BCV de fin de semana, allocation_position, ledger 0019, protección de DB desechable y regresiones. La expectativa antigua de descuentos se reemplazó por rechazo explícito acorde con el alcance vigente. El index heredado no se copió: la ruta checkout se conserva sobre el index actualizado de main. La rama y los 83 commits históricos de #233 se conservan; no borrar.
- **#269:** OPEN/Draft, HEAD `8f05befb7ac1a46d68850b9f89f89edc8cd46283`, base registrada `9c6b30281ed59726e532da840568fc9e80b528f7`; frente a main `594382f...`: 26 ahead / 3 behind, diverged y `mergeable=false`. En su HEAD exacto: 16/16 check-runs y 14/14 workflows SUCCESS. Estos resultados validan ese SHA, no resuelven divergencia ni gates de producto.
- **#255:** OPEN/Draft, HEAD `7e43d7fd1519889605174da5818190bb84685059`, base registrada `9c6b30281ed59726e532da840568fc9e80b528f7`; frente a main `594382f...`: 54 ahead / 3 behind, diverged y `mergeable=false`. En su HEAD exacto: 15/15 check-runs y 13/13 workflows SUCCESS. Mantener Draft por anomalías/freshness BCV, último intento/éxito y alerta, fixture oficial y calendario de feriados.
- PR #258/#262 siguen cerradas como superseded; #193 permanece intacta.
- #269 sigue bloqueada por aprobación del contrato comercial checkout y decisión USD-only/BCV. No inventar decisiones ni force-push. Las dos ramas requieren sincronización no destructiva y CI nuevo en HEAD resultante antes de cualquier merge.

### Límites invariables
No repetir escrituras Neon ni migraciones remotas. No modificar Neon main/`neondb`, secretos, Cloudflare, DNS, billing o producción. Producción **NOT READY**. La rama `main` aparece protegida y su resumen API expone seis checks requeridos; el endpoint de configuración detallada devuelve HTTP 403, por lo que no se afirman otros requisitos de protección.

**Precedencia:** este bloque es más reciente que los snapshots inferiores; estos se conservan como historial, no como estado vivo.

---

## Corrección posterior a PR #284 — 2026-11-08 UTC

La sección inmediatamente inferior documenta correctamente la punta que existía **antes** de integrar #284 (`d35946a88ab5c8361307b4503dd7c8a879e90f8f`), pero ya no es la punta actual tras ese merge. PR #284 está MERGED por squash en `b752d69622832e2b4cf341bf695997da4c2612fb`; ese SHA es la base de esta corrección documental, no debe reutilizarse como punta posterior si esta PR también se integra. Consultar GitHub para obtener el nuevo merge SHA.

### Estado de PRs revalidado después de #284
- **#269:** OPEN/Draft; HEAD `8f05befb7ac1a46d68850b9f89f89edc8cd46283`; base registrada todavía `9c6b30281ed59726e532da840568fc9e80b528f7`. Comparada con main `b752d696...`: 26 ahead / 2 behind, diverged; GitHub reporta `mergeable=false`. No fusionar ni reutilizar resultados CI como si validaran una base actualizada.
- **#255:** OPEN/Draft; HEAD `7e43d7fd1519889605174da5818190bb84685059`; base registrada todavía `9c6b30281ed59726e532da840568fc9e80b528f7`. Comparada con main `b752d696...`: 54 ahead / 2 behind, diverged; GitHub reporta `mergeable=false`. No fusionar ni activar BCV.
- **#284:** MERGED por squash en `b752d69622832e2b4cf341bf695997da4c2612fb`. Su HEAD exacto `764097ffe454f9551cf70b22d337c0bad1d44724` terminó con 14/14 check-runs SUCCESS y 12/12 workflow runs SUCCESS (10 pull_request + 2 push). La comprobación Workers Build y Pages fue de preview/check de PR; no representa autorización de despliegue productivo.
- **Post-merge de #284:** en el merge SHA `b752d696...`, al último sondeo había 9/11 check-runs SUCCESS y 8/9 workflow runs SUCCESS; `verify` y Workers Build seguían IN_PROGRESS, y CI push seguía IN_PROGRESS. No declarar el post-merge completo hasta que terminen.
- La PR #269 y #255 deben sincronizarse con main mediante merge no destructivo y ejecutar CI de nuevo en sus nuevos HEAD exactos antes de evaluar cualquier integración. No force-push.

### Reglas
Los SHA anteriores describen un snapshot temporal de la consulta del 2026-11-08; la punta de main cambia al integrar PRs. Esta sección es la corrección más reciente y prevalece sobre snapshots inferiores. Mantener #269/#255 Draft por sus gates de producto/BCV, aunque los checks históricos estuvieran verdes.

---

## Corrección autoritativa de punta y reconciliación — 2026-11-08 UTC

**Punta de `main` verificada en GitHub:** `d35946a88ab5c8361307b4503dd7c8a879e90f8f`. Es el commit más reciente observado en la consulta de commits del repositorio. Integra PR #283 por squash; #283 reconcilió documentación después de #280/#282 y de la recuperación checkout-ledger. Por tanto, las referencias que siguen en snapshots anteriores a `9c6b30281ed59726e532da840568fc9e80b528f7` son históricas, no la punta actual.

### Correcciones de estado que prevalecen sobre los snapshots inferiores
- PR #280 MERGED en `aa2804a0a6e7879f684b3baeb60646e50f1d6419`; PR #282 MERGED en `9c6b30281ed59726e532da840568fc9e80b528f7`; PR #283 MERGED y su commit resultante es la punta indicada arriba.
- PR #258 y #262 están CLOSED como superseded, no merged. No presentarlas como abiertas ni como trabajo perdido: su contenido fue comparado y preservado/evolucionado en #269. No borrar ramas ni commits históricos.
- PR #233 continúa OPEN/Draft como fuente histórica. El cuerpo histórico del PR todavía contiene referencias antiguas a #258/#262 como abiertas y a su antigua función de recuperación; esas referencias no describen el estado vivo. No cerrar #233 hasta completar la revisión semántica de sus 18 paths/83 commits y demostrar que no queda comportamiento único sin preservar.
- PR #193 continúa fuera de alcance de esta reconciliación; mantenerla intacta.
- #269 checkout+ledger y #255 BCV siguen OPEN/Draft según la última consulta de PRs disponible. Los SHA/checks descritos en sus cuerpos son evidencia histórica de esos SHA; antes de una decisión de integración, consultar en vivo el HEAD/base, comparación, checks exactos, reviews y threads. No reutilizar CI de SHA anteriores.
- #269 no debe fusionarse mientras permanezcan sin resolver la aprobación del contrato comercial checkout y la decisión de si ventas USD-only requieren tasa BCV. #255 no debe integrarse/activarse en producción mientras sigan abiertos los gates P1 de anomalías/freshness, persistencia de último intento/éxito y alerta, fixture oficial BCV y calendario de feriados.
- El intento de leer branch protection devolvió HTTP 403 al conector. No afirmar que la configuración de protección fue verificada; distinguir siempre workflow runs, check-runs, status contexts y reviews formales.

### Neon y límites
El ensayo autorizado #42507066215 completó bootstrap-and-migrate en la base aislada `microapp_rehearsal`, con migraciones 0001–0019, assertions 0017–0019 y comprobaciones de ownership/grants. No repetir escrituras ni migraciones remotas. Esto no certifica el Worker productivo ni autoriza cambios en Neon main, `neondb`, secretos, Cloudflare, DNS, billing o despliegues. Producción permanece **NOT READY**.

**Regla de continuidad:** este bloque prevalece sobre cualquier snapshot contradictorio inferior. Los bloques antiguos se conservan como historial append-only; no reescribirlos como si hubieran sido el estado actual. Consultar GitHub para la punta viva antes de cada decisión y actualizar este encabezado cuando cambie main.

---

## Estado autoritativo — 2026-11-08 UTC (posterior a PR #280/#282 y recuperación checkout-ledger)

**Main vivo:** 9c6b30281ed59726e532da840568fc9e80b528f7. PR #280 integrada por squash en aa2804a0a6e7879f684b3baeb60646e50f1d6419; PR #282 integrada en 9c6b30281ed59726e532da840568fc9e80b528f7. La auditoría documental de #280 ya está en main. Consultar la punta viva antes de cualquier operación.

### Estado vivo de PR
- **#269 checkout + inventory ledger projection:** OPEN/Draft, base main 9c6b30281ed59726e532da840568fc9e80b528f7, HEAD 8f05befb7ac1a46d68850b9f89f89edc8cd46283, 26 ahead / 0 behind, mergeable=true. En ese HEAD exacto: 16/16 check-runs y 14/14 workflow runs SUCCESS. Incluye verify, Chromium, JS/TS, postgres-migration, migration-runner, Trivy, secret-history, ODD, Playwright, Semgrep, backup restore y builds Pages/Workers. Reviews: tres COMMENTED, cero APPROVE; el hilo inline sobre sucursal inactiva está RESOLVED. Mantener Draft: sigue pendiente aprobación explícita del contrato comercial checkout y decisión sobre dependencia BCV en ventas USD-only.
- **#255 BCV:** OPEN/Draft, base main 9c6b30281ed59726e532da840568fc9e80b528f7, HEAD 7e43d7fd1519889605174da5818190bb84685059, 54 ahead / 0 behind, mergeable=true. En ese HEAD exacto: 15/15 check-runs y 13/13 workflows SUCCESS. Mantener Draft por gates operativos P1: política de anomalías, last-attempt/last-success persistente y alerta externa, freshness real, fixture HTML oficial BCV y calendario oficial de feriados bancarios.
- **#258 checkout** y **#262 inventory ledger projection:** cerradas como superseded, no merged. Su contenido único fue comparado por paths/blobs y preservado/evolucionado en #269. No borrar sus ramas ni commits históricos.
- **#233:** OPEN/Draft histórica; no cerrar hasta comparar todo su contenido único contra el conjunto integrado. **#193:** OPEN; mantener sin cambios.
- #280 y #282: MERGED. No presentar los checks de una PR como aprobación humana independiente.

### Neon rehearsal y alcance real
Run #42507066215 SUCCESS, operación bootstrap-and-migrate, fuente inmutable 6227a3a8497f6be94d675b64da5da61530c200fc, destino aislado microapp_rehearsal / br-curly-poetry-b7dxsddm. 0001–0019 aplicadas; 19 registros applied; assertions 0017–0019 y ownership/grants verificados. Los seis archivos de migración 0017–0019 y assertions tienen blobs idénticos entre el source ensayado y el HEAD actual #269. No repetir bootstrap-and-migrate ni realizar escrituras Neon adicionales.
El ensayo verifica el bundle SQL y roles en la base aislada; no prueba el comportamiento HTTP del Worker conectado a Neon ni la identidad real del DATABASE_URL productivo. CI ejecuta pruebas PostgreSQL desechables con login microapp_runtime real. No tocar Neon main, parent clone neondb, datos reales, secretos, Cloudflare productivo, DNS, billing o despliegues.

### Revisión de seguridad y cambios consolidados
- Migration 0018 protege allocation_position y la reconciliación diferida por pago; revoca DELETE/TRUNCATE sobre payments a PUBLIC/runtime y las assertions verifican esos privilegios.
- Migration 0019 convierte el ledger append-only en única fuente runtime de cambios de stock; runtime no tiene INSERT/UPDATE/DELETE/TRUNCATE sobre inventory_balances. El movimiento vuelve a validar y estabilizar branches.is_active con FOR SHARE NOWAIT; hay regresión PostgreSQL para sucursal desactivada.
- #269 pasó CI exact-HEAD después de estas correcciones. El resultado de CI no elimina el gate de contrato comercial ni certifica producción.
- El conector no pudo leer la configuración de branch protection: endpoint devolvió HTTP 403 Resource not accessible by integration. Por ello no afirmar una lectura nueva de la configuración; los check-runs observados sí están verdes.

### Bloqueos de producto / BCV
- Checkout: no cambiar por inferencia el contrato de una moneda de liquidación por venta, liquidación exacta, sin parciales/sobrepagos/cambio. El propietario aún no ha aprobado explícitamente ese contrato.
- Checkout exige actualmente una tasa BCV válida incluso para ventas USD-only; decidir si es requisito comercial o dependencia innecesaria antes de modificar.
- BCV: latest API/checkout usan effective_date + validation_status, no antigüedad de fetched_at. La persistencia unchanged no actualiza fetched_at; no representa last-success. Un Cron fallido o corrección tardía de BCV puede dejar una tasa antigua marcada current.
- Sin política aprobada de anomalías/freshness, registro persistente de último intento/éxito y alerta, fixture HTML real y calendario oficial de feriados, no activar Cron ni declarar conversión VES lista.
- **Producción: NOT READY.** No hubo smoke test comercial autenticado en Worker productivo, validación de identidad efectiva del Worker, ni despliegue productivo.

### Próximo orden de trabajo
1. Mantener #269 Draft hasta resolver contrato comercial checkout y dependencia BCV USD-only; no inventar decisiones.
2. Cerrar gates P1 de #255 con política aprobada y observabilidad comprobable; no activar Cron en producción.
3. Revisar #233 para determinar si queda contenido histórico único fuera de #269; no cerrar por antigüedad.
4. Continuar pruebas aisladas de checkout/pagos/idempotencia/rollback, inventario/concurrencia y runtime role; documentar evidencia.
5. Mantener main/Neon productivo intactos y actualizar este estado cuando cambie el HEAD o una PR.

---

# Estado vivo del repositorio — 2026-11-08 UTC (posterior a PR #281)

**Último main verificado antes de este checkpoint:** `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`, merge SHA de PR #281. PR #280 también está integrada (merge SHA `aa2804a0a6e7879f684b3baeb60646e50f1d6419`). La punta de `main` es dinámica: antes de cualquier decisión, consultar GitHub directamente; no interpretar este SHA histórico como garantía de la punta actual después de este checkpoint.

**Validación post-merge de PR #281:** 9/9 workflow runs SUCCESS y 11/11 check-runs SUCCESS en `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`, incluidos CI, Playwright, PostgreSQL migration runner, database migration validation, SAST, secret-history, Pages y Workers Builds. Esto confirma CI/builds automáticos; no demuestra tráfico productivo ni smoke test comercial autenticado. **Producción permanece NOT READY.**

**Neon rehearsal:** run [#42507066215](https://github.com/BTF14/Micro-app/actions/runs/42507066215) SUCCESS, `bootstrap-and-migrate`, fuente inmutable `6227a3a8497f6be94d675b64da5da61530c200fc`, destino aislado `microapp_rehearsal` / branch `br-curly-poetry-b7dxsddm`. Migraciones 0001–0019, 19 registros `applied`, fingerprint 0002, assertions 0017–0019 y ownership/grants de roles verificados. No se tocó Neon main, la parent clone `neondb`, secretos, DNS, billing ni datos productivos. No repetir escrituras ni `bootstrap-and-migrate`.

## PRs abiertas — última consulta GitHub

- **#269 checkout + ledger:** OPEN/Draft; HEAD `14afd5de938a6ff655ecdfc5cb747f0f799290c5`; 24 commits ahead / 4 behind main; diverged y `mergeable=false`. En ese HEAD hay 5 check-runs SUCCESS (postgres-migration, Trivy, secret-history, Pages y Workers) y 3 workflows de evento push SUCCESS. No hay workflows de evento `pull_request` para ese SHA; faltan los contextos requeridos `verify`, `Chromium authentication smoke tests` y `JavaScript and TypeScript static analysis`. No reutilizar el 16/16 histórico de source SHA 6227 ni de otros SHA. Reviews existentes son COMMENTED, no APPROVE; el único hilo inline está resuelto. **Mantener Draft:** el contrato comercial del checkout (una moneda por venta, liquidación exacta, sin parciales/sobrepagos/cambio) sigue pendiente de aprobación del propietario.
  - El rehearsal usó source `6227a3a8497f6be94d675b64da5da61530c200fc`. Los cinco commits posteriores solo tocan workflow/documentación/ODD; las migraciones 0017–0019 y los archivos `sales-checkout.ts` / `inventory-counts.ts` consultados conservan los mismos blobs. El ensayo valida ese bundle SQL en DB aislada, no el comportamiento funcional del Worker sobre Neon.
  - El ODD `SALES_CHECKOUT_MODEL.md` contiene snapshots antiguos: migration 0018 sí añade `allocation_position` y validación SQL diferida por pago, por lo que la antigua brecha de ordinal debe marcarse resuelta. También debe actualizarse el texto que dice que el ensayo Neon está bloqueado.
  - Riesgo BCV compartido con #255: el checkout y el trigger 0017 confían en `effective_date` + `validation_status`, no en antigüedad de `fetched_at`. Una tasa futura podría seguir aceptándose si falla el Cron o BCV la corrige después. Definir política con el propietario; no inventar umbral. Confirmar además si una venta USD-only debe depender de disponibilidad BCV.
- **#255 BCV:** OPEN/Draft; HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`; 53 ahead / 11 behind main; diverged. Los 10 workflows SUCCESS corresponden a ese HEAD anterior a sincronización. P1 pendientes: política de anomalías; freshness de `fetched_at`; falta de last-attempt/last-success y alerta externa; fixture real HTML BCV; calendario de feriados. El Cron falla/re-lanza y registra código sanitizado, pero eso no sustituye alerta persistente.
- **#258 checkout:** OPEN/Ready; HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`; 35 ahead / 42 behind main; diverged, `mergeable=false`. Mantener abierta mientras se verifica que #269 conserva todo su contenido único.
- **#262 ledger projection:** OPEN/Ready; HEAD `19103c000b354da85c1a478867a6a18e2ec25cd7`; apilada sobre #258; comparación contra main 107 ahead / 42 behind. No fusionar independientemente de su base.
- **#233:** OPEN/Draft histórica; conservar hasta demostrar que todo su contenido único está preservado. **#193:** OPEN; no modificar.

## Próxima secuencia

1. Sincronizar #269 con main mediante merge commit no destructivo, sin force-push; conservar código y aplicar los documentos/workflow actuales de main.
2. Actualizar ODD y modelo de checkout para reflejar Neon rehearsal completado, migration 0018 y riesgos BCV; revalidar los seis contextos requeridos en el HEAD exacto.
3. Mantener #269 Draft hasta CI exact-HEAD completo y aprobación explícita del contrato comercial; no inventar una decisión de pagos.
4. Sincronizar #255 por separado; revisar fecha efectiva BCV, freshness, fallos del proveedor, observabilidad y Cron. Mantener Draft hasta cerrar P1.
5. Mantener #258/#262 sin fusionar ni cerrar hasta verificar contenido único y dependencias.
6. Validar runtime, permisos, checkout, pagos, idempotencia y rollback en PostgreSQL desechable con login runtime real. No repetir escrituras remotas Neon.

---
## Estado vivo — corrección Neon pinned rehearsal integrada (2026-11-08 UTC)

- Main protegido: `209e3fe9f99c96a07546bb87c04b90755257d918`. PR [#278](https://github.com/BTF14/Micro-app/pull/278) fusionada por squash; HEAD revisado `b444344543a2edafaa70cf68f8450cade73c9fc4`; merge SHA indicado.
- Causa de Neon rehearsal #2: el workflow comparaba SOURCE_SHA `6227a3a8497f6be94d675b64da5da61530c200fc` contra el tip mutable de la rama, ya avanzado a `a750d1868f0ad4ae78b3de197d160d376af688ab`. Falló antes de extraer migraciones y antes de conectarse a Neon.
- Corrección integrada: el workflow hace fetch del SHA inmutable directamente y valida FETCH_HEAD exacto. Cambio limitado a `.github/workflows/neon-pinned-migration-rehearsal.yml`.
- Evidencia PR #278: 9/9 workflow runs SUCCESS en HEAD exacto; main base coincidía, cero commits de divergencia; branch protection activa con seis contextos requeridos. Revisión técnica manual completada; cero reviews formales/hilos, sin presentarla como aprobación humana independiente.
- Verificación manual posterior (log recibido; inicio 2026-11-08 17:21:02 UTC): `verify-empty` en `main` alcanzó `EMPTY_REHEARSAL_TARGET_VERIFIED`. Fetch exacto de SOURCE_SHA exitoso; cadena 0001–0019 validada; conexión directa a `microapp_rehearsal`; identidad de database/login/session/branch/project y restricciones de roles validadas; target vacío confirmado.
- El `verify-empty` manual ya fue ejecutado y validado por su log. No queda pendiente otra acción manual para este gate.
- Neon: hubo conexión de solo lectura a `microapp_rehearsal` y consultas SELECT de identidad/roles/estado vacío. No hubo DDL/DML ni migraciones. No tocar DB `neondb` parent-data clone ni Neon main. Producción sigue NOT READY.

---

## Estado vigente — 2026-11-08 (posterior a PR #275)

**Main:** 11ca2b49bfa650066a708d2423cc73cea6c99e2d (protegida). PR #275 se fusionó por squash en este SHA; PR #274 quedó cerrada como supersedida. #275 añadió el workflow manual `.github/workflows/neon-pinned-migration-rehearsal.yml` y el allowlist Gitleaks de un único fingerprint falso positivo. Ninguna migración Neon se ejecutó.

### Estado de integración vivo
- **#269 checkout + ledger:** Open/Draft; HEAD `bc3939510e132e6f77c751514ff1b7dca58cdd4d`; 15 ahead / 3 behind main; mergeable=false; 11/11 workflows SUCCESS en su HEAD. Mantener Draft: decisión comercial y rehearsal 0017–0019 pendientes.
- **#255 BCV:** Open/Ready; HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`; 53 ahead / 5 behind main; mergeable=false; 10/10 workflows SUCCESS en su HEAD. Persisten gates P1: política de anomalías, estado persistente/alerta y fixture HTML real BCV.
- **#258 checkout:** Open/Ready; 35 ahead / 36 behind main; mergeable=false. #262 ledger: Open/Ready, 107 ahead / 36 behind main, apilada sobre #258. #269 conserva el contenido consolidado de ambas; mantener abiertas hasta confirmar integración en main.
- **#233:** Open/Draft histórica, no fusionar por antigüedad. **#193:** Open; no modificar.
- PR abiertas actuales: #269, #262, #258, #255, #233 y #193 (6).

### Neon rehearsal
- Proyecto `restless-fire-99110035`; branch rehearsal `br-curly-poetry-b7dxsddm`; database segura objetivo `microapp_rehearsal`; rol `microapp_migrator`.
- El run anterior #42479603848 del workflow antiguo `neon-rehearsal-migrations.yml`, tras la rotación del secreto, finalizó SUCCESS: conexión directa, secreto enmascarado/no vacío, identidad esperada y baseline 0002 verificado; pasos de escritura SKIPPED.
- SELECT independiente posterior confirmó en `microapp_rehearsal`: current_database/rol/branch/project exactos; schemas solo pg_catalog, information_schema, pg_toast y public; 0 relaciones públicas, 0 funciones públicas y sin ledger. No se modificó la DB.
- El workflow fijado ya se ejecutó manualmente desde `main` en `verify-empty`: el log confirmó descarga exacta del SHA, migraciones 0001–0019, conexión a `microapp_rehearsal`, identidad/roles esperados y target vacío. No se aplicaron migraciones ni escrituras.
- Nunca usar la DB `neondb` de la rama rehearsal: es parent-data clone con filas heredadas. Neon main/producción fuera de alcance.

### Verificación post-merge #275
- GitHub Actions en merge SHA: 9/9 workflow runs SUCCESS; required contexts `verify`, `postgres-migration`, `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history` y `Trivy filesystem and configuration scan` en SUCCESS.
- Cloudflare Pages y Workers Builds check-runs terminaron SUCCESS en el merge SHA. No se ejecutó smoke test HTTP autenticado contra endpoints productivos; por ello no se declara producción validada.
- Producción: **NOT READY**. No DDL/DML remoto, no migraciones, no cambios de Neon main, secretos de producción, DNS o billing.

## Estado reconciliado — 2026-11-08 (snapshot posterior a CI de PR #274)

**Fuente de verdad:** GitHub API y consultas SELECT de Neon. Snapshot de código/main: 37e8c40d5bacfb71133942d774c3f87d71d61b9e; último commit documental integrado #272: 33016a2d206c7b8cfc60e53e34a56a26651141d7. La actualización documental y el workflow de ensayo fijado se integran conjuntamente en PR #274.

### Main y PR abiertas
- **#270:** merged en 37e8c40d5bacfb71133942d774c3f87d71d61b9e; corrección de dos líneas de quoting en el resumen Neon. 9 workflow runs SUCCESS exact-HEAD.
- **#272:** merged en 33016a2d206c7b8cfc60e53e34a56a26651141d7; documentación, 10/10 workflow runs SUCCESS exact-HEAD. #271 cerrada como supersedida, sin pérdida de contenido.
- **#269 checkout + ledger:** Open/Draft; HEAD bc3939510e132e6f77c751514ff1b7dca58cdd4d; 13 ahead / 2 behind main; mergeability fluctuó entre consultas; 11/11 workflow runs SUCCESS exact-HEAD. Reviews COMMENTED (no APPROVE). Cambio adicional en 0018: revoca DELETE/TRUNCATE de payments para PUBLIC y microapp_runtime y añade assertions; checkout runtime no expone operación DELETE. Mantener Draft: decisión comercial y ensayo 0017–0019 pendientes.
- **#255 BCV:** Open/Ready; HEAD a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7; 48 ahead / 4 behind; mergeable=true; 10/10 workflow runs SUCCESS exact-HEAD. Review COMMENTED ID 5818042583, no APPROVE. BCV_SYNC_COMPLETED registra outcome; BCV_SYNC_FAILED registra solo código permitido y relanza error genérico para que Cloudflare marque el Cron como fallido. Persisten P1: política de anomalías de tasa y estado persistente/alerta externa; fixture del HTML real BCV pendiente. No integrar.
- **Otras PR abiertas:** #258 Open/Ready/mergeable=false y #262 Open/Ready/mergeable=true (apilada sobre #258). Comparación de archivos: #269 incluye las migraciones 0017 y 0019 y sus assertions; 0019, inventory-counts.ts, inventory-locks.ts y sus tests son idénticos a #262; #269 mejora el lock de checkout pasando branchId y endurece 0018. #269 es el reemplazo consolidado candidato. Comentarios de trazabilidad en #258 y #262; mantenerlas abiertas hasta que #269 se integre y se verifique en main. #233 Open/Draft histórica; #193 Open/Ready. **No modificar #193.**
- PR #275 (branch fix/neon-pinned-rehearsal-clean-history-20261108) reemplaza el intento #274, cuyo secret-history scan detectó un falso positivo por una frase `GitHub API:` seguida de un SHA de commit en STATE_JOURNAL; el contenido se preservó desde main sin ese contexto. El HEAD/checks exactos deben leerse en GitHub vivo. Workflow manual main-only; default verify-empty read-only; no dispatch ni migración ejecutados aún.

### Neon: distinción entre copia de main y base vacía
- Proyecto restless-fire-99110035; branch rehearsal-baseline-20261107, ID br-curly-poetry-b7dxsddm.
- Esta rama tiene como padre la rama primaria/default main (br-summer-math-b7297a60) y init_source=parent-data. La DB original neondb contiene filas heredadas: app_users 1, auth_allowlist 1, auth_bootstrap 1, auth_sessions 6, organization_members 1, organizations 1; demás tablas 0. No se inspeccionó contenido. Tratar esos registros como potencialmente reales. **No ejecutar migraciones ni DDL/DML sobre esa DB.**
- Se creó una base nueva y vacía microapp_rehearsal (database ID 1333740), owner microapp_migrator, dentro de la misma branch no-primary. get_database_tables devolvió cero tablas; SELECT confirmó current_database/user/session_user y branch/project exactos.
- En microapp_rehearsal, migrator tiene CONNECT, public USAGE/CREATE; runtime tiene CONNECT y public USAGE, sin CREATE. Los atributos globales de ambos roles son restrictivos y las membresías cumplen el preflight.
- No se ha ejecutado ninguna migración en microapp_rehearsal; sigue vacía.

### GitHub Actions — secreto y verify
- El propietario confirmó que actualizó NEON_REHEARSAL_DATABASE_URL.
- Se reintentó el run #42479603848 en operación verify. SUCCESS: secreto presente y enmascarado; conexión directa; identidad exacta neondb|microapp_migrator|microapp_migrator|br-curly-poetry-b7dxsddm|restless-fire-99110035; BASELINE_VERIFIED 294 facts. Pasos de adopción/migración quedaron SKIPPED. Run: https://github.com/BTF14/Micro-app/actions/runs/42479603848.
- Ese rerun conservó SHA/ref originales y ejecutó el resumen antiguo, que emitió tres command not found inocuos; #270 corrigió el resumen en main. No se afirma que el rerun probara el summary nuevo.
- La comparación de fingerprint 294/294 se realizó sobre la DB original neondb, que es copia de main; fue estrictamente SELECT y no cambió datos.

### Alcance de migraciones y próximo diseño
- Main contiene migraciones hasta 0016. Los archivos 0017, 0018 y 0019 solo existen en la rama #269 (bc3939510e132e6f77c751514ff1b7dca58cdd4d).
- El workflow actual adopt-and-migrate desde main solo vería hasta 0016 y está pensado para adoptar un schema baseline existente. No usarlo para probar 0017–0019.
- scripts/db/migrate.sh admite MIGRATIONS_DIR; sobre una DB vacía puede ejecutar 0001–0019 con ledger/checksums. El runner no ejecuta por sí solo los archivos .assertions.sql ni .deferred_failure.sql; un workflow de rehearsal debe ejecutarlos explícitamente después de aplicar, con expectativas de rollback/fallo verificadas.
- Próximo diseño: workflow manual desde main, source SHA fijado a #269 revisado, solo extraer SQL migrations/assertions del SHA (no ejecutar scripts shell de la rama), usar runner de main y apuntar exclusivamente a microapp_rehearsal. Derivar el nombre de DB en memoria desde el secreto sin imprimirlo. Operación de escritura con confirmación exacta separada. **No ejecutar hasta aprobación explícita.**

### Dictamen
**Producción: NOT READY.** No se tocó Neon main ni la DB original neondb; no hubo DDL/DML sobre datos heredados, cambios de secretos, Worker productivo, Cloudflare, DNS, billing ni despliegues manuales.
---

## Estado operativo actualizado — 2026-11-08 UTC (posterior a PR #264)

**GitHub main:** `c46ed6f3e57a12bf92a7f0718435dfff8096b540`. PR #264 se fusionó en `c46ed6f3e57a12bf92a7f0718435dfff8096b540`; su workflow `.github/workflows/neon-rehearsal-migrations.yml` ya existe en main. En el HEAD de PR #264 los checks finalizaron correctamente (15 check-runs SUCCESS; el recuento API posterior incluyó 16 por checks duplicados). El workflow es manual; no hay evidencia de ejecución del workflow de Neon ni de migraciones remotas.

| PR | HEAD | Base declarada / SHA que GitHub reporta | Estado vivo | Checks exact-HEAD |
|---|---|---|---|---:|
| #255 BCV | `f49fb402f9bd5a40591970c9efe3665a5e212ebb` | `main` / `8c13da8b2d55d0a45490b19499b1b7c53e0ec966` (base anterior a #261/#264) | Ready, mergeable clean | 15/15 SUCCESS |
| #258 checkout | `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c` | `main` / `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67` | Ready, mergeable dirty | 16/16 SUCCESS |
| #262 ledger | `19103c000b354da85c1a478867a6a18e2ec25cd7` | `feat/sales-checkout-recovered-main-20261108` / `df1ba996babb859a83da09d72cdec63a69b3965c` | Ready, mergeable clean, pero stacked sobre #258 antiguo | 8/8 SUCCESS |
| #233 histórico | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | rama histórica | Draft | 9/9 SUCCESS histórico |
| #193 inventario Fase B | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | `main` | Open; mantener intacta | 12/12 SUCCESS histórico |
| #265 reconciliación documental | `075e3b7141149cd4423dc78ca8fbe3e9ed0b58bd` | `main` / `c46ed6f...` | Open, mergeable; checks todavía ejecutándose | Exact-HEAD pendiente |

PR #266 fue creado solo para diagnosticar la sincronización de #258; GitHub reportó `mergeable=false` y se cerró sin fusionar. El solapamiento incluye nueve archivos sensibles (workflows CI/migration, `index.ts` y documentación de estado). No se actualizó ni forzó la rama de #258.

La comparación viva de la rama de #258 contra main es **diverged: 35 commits ahead / 31 behind**, merge-base `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67`. No basta con decir “29 detrás”. No actualizar ni forzar la rama a ciegas: primero reconciliar el conjunto de commits y conflictos. Los checks verdes citados pertenecen a los HEAD exactos arriba, no validan una futura sincronización.

### Runner de Neon y límites de credenciales

- PR #264 ya está integrada en main. El workflow solo admite `workflow_dispatch` desde `main`, modo predeterminado `verify`, conexión directa/no pooler y comprobación exacta de database/login/branch/project antes de cualquier operación.
- Requiere el secreto de Actions `NEON_REHEARSAL_DATABASE_URL`. El conector GitHub disponible no permite consultar la API de secretos; por tanto **no se afirma si el secreto ya existe**. Tampoco hay evidencia de que el workflow se haya ejecutado.
- Neon rehearsal `br-curly-poetry-b7dxsddm`: fingerprint 294/294 igual al baseline 0002; 15 tablas y 2 secuencias bajo `microapp_migrator`; sin ledger; no se aplicaron 0003–0016. No se ejecutó baseline adoption ni migration runner.
- Neon main `br-summer-math-b7297a60`: consulta solo de metadatos confirmó que no existen roles `microapp_runtime`/`microapp_migrator`, `schema_migrations`, `auth_bootstrap_attempts`, `branches`, `warehouses` ni `inventory_balances`; sí existe `auth_rate_limits`; `exchange_rates.rate` es `NUMERIC(14,6)`. El esquema sigue desfasado respecto del código.
- El Cron de retención #251 está configurado en main, pero deployment y ejecución real no están verificados. Si está activo contra el esquema de Neon main observado, la segunda DELETE falla por falta de `auth_bootstrap_attempts`; la primera puede haber confirmado por separado.
- Ninguna escritura en Neon main, secreto de producción, Worker `DATABASE_URL`, Cloudflare manual, DNS o billing.

### Siguiente secuencia segura

1. Determinar si el secreto de rehearsal existe mediante el panel de GitHub Actions; no pegar su valor en chat. Si falta, crearlo como secreto de repositorio con conexión directa `microapp_migrator` únicamente a la rama rehearsal.
2. Ejecutar primero el workflow #264 en modo `verify`; revisar el resultado exacto antes de decidir si autorizar `adopt-and-migrate`. No activar modo de escritura por inferencia.
3. Completar y validar todas las migraciones en rehearsal, incluido ledger/checksums, ownership, runtime grants, precisión BCV y grants/columnas de auth cleanup.
4. Verificar el principal real de Cloudflare Worker y estado del Cron con un canal autorizado; no asumirlo desde CI previews.
5. Reconciliar #255 con el main actual y ejecutar checks en HEAD actualizado. No fusionar solo porque hoy esté clean.
6. Reconstruir/sincronizar #258 sin force-push; revisar el diff completo y validar contrato comercial. #262 debe rebasarse/reconstruirse sobre el HEAD final de #258.
7. Mantener #193 intacta y #233 como histórica hasta confirmar que no conserva contenido único.

**Producción: NOT READY.** El único paso integrado aquí es el workflow de ensayo, no las migraciones ni el despliegue productivo. Single-maintainer: revisión técnica asistida, CI exact-SHA y autorización del propietario se registran por separado; nunca inventar una aprobación independiente.

---

## Estado operativo vivo — posterior a #261 y preparación del runner Neon — 2026-11-08

**main protegido:** `10ed02c6c6d30940ef2e2a75db009f6ea6859bd3`. #251 está fusionada en `8c13da8`; #261 documentación está fusionada en `10ed02c`. El inventario de este snapshot muestra seis PR abiertas:

| PR | HEAD conocido | Estado | Próximo paso |
|---|---|---|---|
| #255 BCV | `f49fb402f9bd5a40591970c9efe3665a5e212ebb` | Ready, 15/15 checks SUCCESS, mergeable clean | No integrar hasta validar baseline/migraciones/grants en Neon rehearsal y Worker/Cron identity. |
| #258 checkout | `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c` | Ready, 16/16 checks SUCCESS, mergeable dirty, 29 commits detrás de main | Resolver conflicto/sincronizar; requiere aprobación funcional del contrato de pagos. |
| #262 ledger | `19103c000b354da85c1a478867a6a18e2ec25cd7` | Ready, 8/8 checks SUCCESS; apilada sobre un HEAD anterior de #258 | No integrar por separado; reconstruir base después de resolver #258. |
| #233 checkout histórico | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | Draft | No fusionar; conservar hasta verificar que #258 rescató todo lo único. |
| #193 inventario Fase B | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | Open | Restricción expresa: no modificar. |
| #264 runner Neon rehearsal | Rama `security/neon-rehearsal-migration-runner-20261108` | PR nueva; CI exact-HEAD en ejecución | Completar CI y revisar el workflow; aún no está fusionada ni ejecutada. |

Los checks indicados pertenecen a los SHA históricos señalados; cada commit nuevo exige volver a validar el SHA exacto. Los previews Cloudflare no son pruebas de producción.

### Neon rehearsal y runner

- Rama: `rehearsal-baseline-20261107` / `br-curly-poetry-b7dxsddm`, proyecto `restless-fire-99110035`.
- Huella de esquema: 294/294 hechos coinciden exactamente con baseline canónico 0002.
- 15 tablas y 2 secuencias existentes pertenecen a `microapp_migrator`; roles directos existen; no hay ledger de migraciones.
- `microapp_runtime` aún no tiene los grants de tabla posteriores a 0002; no se han aplicado migraciones 0003–0016.
- PR #264 prepara un workflow manual con destino fijo, login directo/no pooler, branch/project identity guard, modo verify predeterminado y confirmación separada para aplicar baseline+migraciones. Requiere el secreto nuevo `NEON_REHEARSAL_DATABASE_URL`; no se ha creado ni cambiado ningún secreto y el workflow no se ha ejecutado.
- No pegar migraciones en la herramienta SQL ni ejecutar DDL/DML manual. No tocar Neon main.

### Riesgo Cron #251

main contiene el Cron horario `17 * * * *` y el handler de retención ejecuta dos DELETE separados: `auth_rate_limits` y `auth_bootstrap_attempts`. El último snapshot de Neon main documentado y la rama rehearsal no contienen `auth_bootstrap_attempts`. Si el Worker con ese Cron ya fue desplegado contra ese esquema, el segundo DELETE fallará; la primera consulta puede haber confirmado por separado. El despliegue/ejecución real y los logs de Cloudflare no están verificados. No desactivar ni cambiar Cloudflare manualmente.

### Límites y siguiente secuencia

1. Terminar CI exact-HEAD y revisión del PR #264; fusionarlo solo si todos los gates pasan.
2. El propietario debe crear explícitamente `NEON_REHEARSAL_DATABASE_URL` con login directo/no pooler `microapp_migrator` para la rama de ensayo. Ejecutar primero `verify`; revisar resultado; después, solo con confirmación expresa en el workflow, `adopt-and-migrate`.
3. Validar ledger/checksums/ownership, precisión NUMERIC(18,8), grants de BCV y auth cleanup; probar login real de runtime con el conector Neon.
4. Mantener Neon main y secretos de producción fuera de alcance hasta autorizaciones separadas.
5. Resolver #255; luego sincronizar #258 y reestablecer #262 sobre su HEAD final.
6. Obtener aprobación funcional del propietario para una moneda de liquidación por venta, pago exacto completo, sin pagos parciales ni sobrepago.
7. Mantener #193 intacta; cerrar #233 solo cuando no quede contenido único.

**Producción: NOT READY.** La autorización permanente cubre merges elegibles y despliegue automático inherente; no autoriza Neon main, migraciones remotas, secretos, datos reales, Cloudflare manual, DNS ni billing. Single-maintainer: documentar revisión técnica asistida por IA, CI exact-SHA y autorización del propietario por separado; no fabricar una aprobación independiente.

\n## Estado GitHub verificado — 2026-11-08 ~09:20 UTC

**Fuente de verdad:** GitHub API. `main` protegido, HEAD `d28b80edc6b2a63019ded100e46bb4b11e81153a`. No se realizó ningún merge en esta sesión.

| PR | HEAD exacto | Base | Estado | Checks exact-HEAD |
|---|---|---|---|---:|
| #251 auth retention | `30ec0cedafbb8281c7b5ea56572581ddc022a180` | main (base snapshot `0a9e2f7...`) | Ready for review | 15/15 SUCCESS |
| #255 BCV | `f49fb402f9bd5a40591970c9efe3665a5e212ebb` | #251 | Ready for review | 15/15 SUCCESS |
| #258 atomic checkout | `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c` | main (base snapshot `0a9e2f7...`) | Ready for review | 16/16 SUCCESS |
| #261 state docs | `dd50e49451febfc9ecf1f9ce850dc6a1d31d41e3` | main | Ready for review | 14/14 SUCCESS |
| #262 ledger projection | `c09bc06a2caa4b99728073bd4acb8063c6187299` | #258 | Ready for review | 8/8 SUCCESS |
| #193 Phase B scope | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | main snapshot `705d3db...` | Open, not Draft | 12/12 SUCCESS |
| #233 historical checkout | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | historical docs branch | Draft | 9/9 SUCCESS |

**Formal reviews:** #251, #255, #258, #261 and #262 have zero formal reviews and zero unresolved review threads. Green CI is not approval.

### Ledger P1 — remediation verified
- #262 migration 0019 revokes runtime direct balance writes and projects ledger movements through SECURITY DEFINER triggers.
- Count movements require a matching confirmed count and line; confirmer must be active owner/admin/inventory, with active branch membership for inventory. Opening count requires an empty warehouse. Physical count movement rechecks expected on-hand quantity and balance_version under the warehouse mutex.
- Actor role/scope is revalidated at movement insertion with NOWAIT locks; sale movements must match a draft sale and exact sale line. Unsupported purchase/transfer/return/reversal movement types remain blocked.
- Exact HEAD #262 `c09bc06a2caa4b99728073bd4acb8063c6187299`: 8/8 SUCCESS, including actual `microapp_runtime` login smoke, unauthorized cashier rejection, stale snapshot rejection, PostgreSQL integration and backup/restore. P1 follow-up comment: https://github.com/BTF14/Micro-app/pull/262#issuecomment-6719627864.
- Residual: shared runtime role validates the claimed actor's role/scope but does not cryptographically bind `actor_user_id` to the HTTP session. Application `authorizeBranchOperation` remains mandatory. No new movement types until their source-document contracts exist.

### Integración ordenada
1. #251 → #255 (auth retention root, then official BCV ingestion).
2. #258 (checkout, including 0017 weekend effective date and 0018 payment allocation). After #255 merges, sync/reconcile #258 `index.ts` route registration and `wrangler.toml` Cron configuration, then rerun checks on its new HEAD.
3. #262 (after #258 merges, retarget its base to main and rerun exact-HEAD checks).
4. #261 documentation can be merged independently after formal review.
5. Keep #233 open until #255/#258 are integrated, then close as superseded based on its completed tree/migration audit. Do not modify #193 under the existing constraint; preserve its Phase B design document for separate review.

**Producción: NOT READY.** No Neon main, real data, secrets, production Worker, DNS, billing or manual deployment changed. Neon runtime identity/ownership and protected rehearsal remain unverified. No screenshots, Build IDs, terminal, CLI or TinyFish required from the user.

---

## Seguimiento técnico — 2026-11-08 ~08:55 UTC

### PR #262 — resultado de la última ejecución y corrección siguiente
- HEAD `440f9c07aa80a980d8bdb7dcb7bbebada4fec0f8`: la migración PostgreSQL, backup/restore, seguridad, build Cloudflare y demás checks pasaron; `verify` falló en una única prueba de inventario (23/24 tests pasaron).
- Fallo exacto: `CONFIRMED_INVENTORY_COUNT_LINES_IMMUTABLE` durante la limpieza de un fixture, no en el flujo de producción. El test intentaba borrar una línea de conteo ya confirmada.
- Corrección enviada en HEAD `f22aafa36236e1a49d67e051c2c4ca32c4f180dc`: deshabilita temporalmente triggers USER de `inventory_count_lines` y `inventory_counts` solo durante la limpieza del fixture desechable, y los vuelve a habilitar en `finally`. Check-runs de este SHA quedaron queued/in progress al momento de escribir esta nota. No declarar #262 verde todavía.
- La prueba ABA ya usa dos conteos físicos confirmados para probar el retorno 8.250 → 8.500 → 8.250; el conteo cero espera ausencia de fila de balance, según el contrato de la migración 0019.

### Auditoría de PR #233 — extracción histórica concluida
- El compare de #233 contra su base vieja muestra 408 commits ahead / 22 behind y un diff grande; no es una PR de un solo documento.
- Comparé los árboles completos de #233, main, #258 y #255. Las migraciones históricas de almacenes, roles, audit logs, conteos, ledger y auth bootstrap coinciden byte-a-byte con las migraciones actuales correspondientes, salvo comentarios de numeración en algunos archivos.
- La antigua migración 0015 de checkout es una versión anterior; la migración actual de main es más completa. El handler/tests de checkout históricos están reemplazados por #258; exchange-rates y documento BCV están reemplazados por #255.
- El único documento aislado `docs/security/AUTH_RATE_LIMIT_DEPLOYMENT.md` está obsoleto y contradice #251: exige `AUTH_RATE_LIMIT_HMAC_KEY` y prohíbe reutilizar `GOOGLE_CLIENT_SECRET`, mientras #251 reutiliza el secreto OAuth existente como pepper y declara que no agrega un secreto nuevo. No copiarlo.
- Comentario de auditoría publicado en #233: https://github.com/BTF14/Micro-app/pull/233#issuecomment-6719439571. Mantener #233 abierta como registro hasta integrar y validar #258/#255; después cerrar como supersedida. No se ha perdido una implementación vigente.

### PRs listas para review formal
- #258 HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`: 15/15 SUCCESS; Ready for review.
- #251 HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`: 15/15 SUCCESS; Ready for review.
- #255 HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`: 15/15 SUCCESS; Ready for review; base #251.
- Ninguna tiene aprobación formal independiente. No autoaprobar. #258 mantiene pendiente la confirmación funcional final del contrato de pago; #251/#255 conservan los gates de rehearsal y feriados descritos arriba.

No se tocaron Neon main, datos reales, secretos, Worker productivo, DNS, billing ni deploy manual. Producción NOT READY.

---

## Actualización de estado en vivo — 2026-11-08 ~08:50 UTC

- `main` confirmado: `d28b80edc6b2a63019ded100e46bb4b11e81153a`.
- **#258 checkout:** HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`; 15/15 check-runs SUCCESS en ese SHA; mergeable clean; convertido de Draft a Ready for review. Compare con main vivo: 35 ahead / 1 behind. Requiere review formal independiente; sigue pendiente la confirmación funcional final del contrato de liquidación.
- **#251 retención auth:** HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`; 15/15 SUCCESS; mergeable clean; Ready for review. Compare con main: 27 ahead / 1 behind. No activar Cron productivo ni fusionar antes de review y rehearsal de Neon/runtime.
- **#255 BCV:** HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`; 15/15 SUCCESS; mergeable clean; Ready for review. Apilada sobre #251. Compare con main: 74 ahead / 1 behind. El manejo de feriados bancarios entre semana permanece fail-closed y documentado como limitación.
- **#262 ledger:** HEAD actual `7204d327cf8c2dbd7648533ec0c351fae042df16`; PR sigue Draft. La ejecución exact-HEAD anterior `7d626512e25dee603429786c53647d401acfb8c3` pasó las pruebas PostgreSQL/migración, pero falló `verify` en TypeScript por la firma nueva de `lockInventoryBalances` en checkout. Se corrigió la llamada pasando el par warehouse/branch; los checks nuevos de 7204 están en ejecución. No considerar P1 cerrado hasta CI verde y revisión final.
- **#261 documentación:** HEAD observado antes de esta actualización `5d7c0ef985589d0561fb71f5473f56c1dfc44b42`; 14/14 SUCCESS en ese SHA; Draft; mergeable clean. Compare con main: 19 ahead / 1 behind. Esta actualización vuelve a disparar sus checks.
- **#193 inventario Fase B:** HEAD `ac57ab4f3415f82279b8a49c0befe09f8e3aec68`; compare con main: 5 ahead / 24 behind; el único archivo diferencial contra main es `docs/sdd/PHASE_B_BRANCH_INVENTORY_SCOPE.md` (543 líneas). Mantener y preservar; no cerrar por antigüedad.
- **#233 checkout histórico:** Draft, HEAD `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0`, base antigua `docs/sales-checkout-design-gates-20261105`; compare contra su base: 408 ahead / 22 behind y más de 100 archivos diferenciales. No fusionar ni cerrar; requiere comparación controlada contra main y extracción de aportaciones únicas. No describirlo como una PR de un solo documento.
- No hay reviews formales independientes registradas en estas PR al momento de esta actualización. Checks verdes no equivalen a aprobación.
- El hallazgo P1 #262 fue seguido con el comentario #6719397793: el trigger nuevo permite solo conteos confirmados y ventas vinculadas a una venta draft/línea exacta; los demás tipos de movimiento se rechazan hasta existir documentos fuente y flujos autorizados. La corrección sigue pendiente de CI exact-HEAD.
- No se modificaron Neon main, datos reales, secretos, Worker productivo, DNS, billing ni se ejecutó deploy manual. Producción sigue NOT READY.

### Próxima secuencia
1. Esperar y resolver los checks exact-HEAD de #262; inspeccionar cualquier fallo, no rerun ciego.
2. Terminar revisión de #262, confirmar el flujo checkout con proyección y pruebas runtime de movimientos no autorizados.
3. Obtener review formal de #258, #251 y #255; no autoaprobar trabajo propio. Mantener el gate funcional de checkout y los gates de Neon.
4. Actualizar esta reconciliación cuando #262 termine; luego preparar #261 para review.
5. Preservar #193 y hacer extracción controlada de #233 sin descartar contribuciones únicas.

---

## Reconciliación viva — 2026-11-08 08:25 UTC (GitHub, fuente de verdad)

- **main:** `d28b80edc6b2a63019ded100e46bb4b11e81153a` (#263 integrado). La rama está protegida; no se ha ejecutado ningún merge en esta sesión.
- **PR abiertas:** 7 (#193, #233, #251, #255, #258, #261, #262). Las siete continúan abiertas; las siete son Draft salvo #193, que está Open/no Draft.
- **Reviews formales:** ninguna de las siete tiene una review registrada; tampoco hay review threads abiertos en las consultas actuales. Checks verdes no equivalen a aprobación.

| PR | HEAD actual | Base actual de PR | Checks exact-HEAD | Estado y bloqueo principal |
|---|---|---|---:|---|
| #258 checkout | `ebccf88bd87ee47c413158e6cf3417115d5f5235` | main `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67` | 15/15 SUCCESS | Draft; 30 commits ahead y 1 detrás de main vivo; sin review formal; depende de BCV #255 y de aprobación funcional del modelo de pago |
| #262 ledger | `dc6d9228224c484a38ac332311cba3c64f876ab7` | #258 `df1ba996babb859a83da09d72cdec63a69b3965c` | 8/8 SUCCESS | Draft; apilada correctamente sobre un ancestro de #258, pero #258 avanzó 1 commit desde esa base; sin review formal; comentario de seguridad P1 registrado (issue comment 6719238384) |
| #251 retención auth | `30ec0cedafbb8281c7b5ea56572581ddc022a180` | main `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67` | 15/15 SUCCESS | Draft; base 1 commit detrás de main vivo; sin review formal; Cron no activar hasta rehearsal protegido y verificación runtime/ownership/grants |
| #255 BCV | `f49fb402f9bd5a40591970c9efe3665a5e212ebb` | #251 `30ec0cedafbb8281c7b5ea56572581ddc022a180` | 15/15 SUCCESS | Draft; dependencia #251 conservada; sin review formal; no activar Cron productivo ni integrar antes de cerrar la cadena de rehearsal |
| #261 continuidad | rama `docs/live-state-reconcile-20261108` (HEAD de esta misma reconciliación; consultar GitHub en vivo para el SHA final) | main `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67` | checks del HEAD final pendientes de completar | Draft; su snapshot 06:45 UTC quedó obsoleto por #263 y cambios posteriores; esta reconciliación actualiza los documentos canónicos |
| #233 checkout histórico | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | rama documental `docs/sales-checkout-design-gates-20261105` (`4d12b4e8d2907c41758ff6dfe1d8d66ed3dc16f8`) | 9/9 SUCCESS | Draft; fuente histórica divergida; no fusionar. Comparar y preservar cualquier contribución única después de integrar/verificar #258 |
| #193 inventario Fase B | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | main antiguo `705d3db3220894c7d3baca8dc7e7a6b623dfbb94` | 12/12 SUCCESS | Open/no Draft; 5 commits ahead y 24 detrás del main vivo; el único archivo diferencial es `docs/sdd/PHASE_B_BRANCH_INVENTORY_SCOPE.md` (543 líneas). Preservar y revisar; no cerrar por antigüedad |

### Hallazgos y límites verificados

1. #258: 15 check-runs del HEAD exacto SUCCESS; no hay status contexts combinados reportados ni review formal. El compare con main vivo indica 1 commit de atraso (el merge de #263); no reutilizar checks de SHA anteriores.
2. #262: 8 check-runs exact-HEAD SUCCESS; no hay review formal. El PR conserva el permiso runtime INSERT sobre el ledger. La validación actual deja pasar cualquier tipo no vinculado a conteo si `count_id IS NULL`; un caller runtime puede por tanto crear movimientos de compra/transferencia/devolución/reversión sin documento fuente y proyectar balances. Hallazgo P1 documentado en #262, comentario 6719238384. Antes de exponer esos tipos, restringirlos o validar fuente/actor/estado en DB con pruebas runtime.
3. #258 mantiene pendiente la aprobación funcional de una sola moneda de liquidación por venta, pago exacto y prohibición de pago parcial/sobrepago. El historial disponible no contiene aprobación explícita del propietario; no inferirla de la autorización técnica general.
4. #251/#255: ambos HEADs tienen 15/15 checks SUCCESS; no hay reviews formales. #255 depende exactamente del HEAD actual de #251. No activar Cron ni fusionar antes de validar runner protegido, identidad de login runtime, ownership y grants mínimos.
5. #261: su snapshot anterior registraba main `0a9e2f7...`; main vivo ya es `d28b80e...`. Este bloque prevalece sobre snapshots históricos inferiores.
6. #193: compare contra main vivo = 5 commits ahead / 24 behind, un solo documento nuevo de 543 líneas. No modificar su rama ni descartar el documento.
7. No se hicieron cambios en Neon, datos reales, secretos, Cloudflare manual, DNS, billing ni despliegues manuales. Los checks Cloudflare de PR son checks/previews, no prueba de producción.
8. **Producción: NOT READY.** Faltan review independiente, gates de producto, rehearsal/roles Neon, integración BCV, UI/E2E operativo y cierre de la autorización de movimientos de inventario.

### Próxima secuencia operativa

1. Completar revisión de #258/#262 y resolver el hallazgo P1 de autorización de movimientos antes de habilitar tipos no cubiertos.
2. Resolver el gate funcional del modelo de pago de #258; no asumir una decisión de producto.
3. Revisar #251 como raíz de #255 y confirmar el runner protegido/runtime roles antes de cualquier merge que active Cron.
4. Actualizar #258/#262 sobre las bases vivas después de integrar la raíz; checks nuevos en SHA final.
5. Mantener #261 como reconciliación documental, preservar #193 y #233 hasta comprobar sus contribuciones únicas.

---

## Estado operativo verificado — 2026-11-08 06:45 UTC

- **main:** `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67`. Repositorio público `BTF14/Micro-app`; rama protegida según metadatos de GitHub.
- **PR abiertas (5):** #193, #233, #251, #255 y #258. #257 (reconciliación documental), #259 (serialización de CI) y #260 (refresh de continuidad) están fusionadas.
- **PR #251 — retención auth 48 h:** Draft; HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`, base main; 27 ahead / 0 behind. HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS. Sin review formal independiente.
- **PR #255 — BCV oficial:** Draft; HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`, base #251 HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`; 47 ahead / 0 behind. HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS. Sin review formal independiente; conservar la pila #251 → #255.
- **PR #258 — checkout atómico:** Draft; HEAD `df1ba996babb859a83da09d72cdec63a69b3965c`, base main; 29 ahead / 0 behind. HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS. El workflow CI exacto (run 42450188433) pasó 141 pruebas unitarias, 85 pruebas PostgreSQL runtime-role y 19 pruebas PostgreSQL de checkout; también pasó las assertions SQL de migrations 0017 y 0018. Sin review formal independiente.
- **PR #261 — reconciliación viva de continuidad:** Draft, rama `docs/live-state-reconcile-20261108`, base main; actualiza CURRENT_STATE, HANDOFF, WORK_CHECKPOINT, SECURITY_ROADMAP, PROJECT_PLAN y STATE_JOURNAL. Su HEAD debe verificarse junto con sus propios checks antes de integrar.
- **PR #193 — alcance inventario Fase B:** abierta y mergeable según metadata; 5 commits únicos / 23 detrás de main. El compare confirma que el único archivo diferencial es `docs/sdd/PHASE_B_BRANCH_INVENTORY_SCOPE.md` (543 líneas), que no existe en main. No cerrar ni descartar: conservar y revisar el documento antes de decidir integración.
- **PR #233 — checkout histórico:** abierta, Draft y divergida (408 ahead / 21 behind al compararla con main). Es fuente histórica; no fusionar ni reutilizar sus checks. El código útil se recuperó selectivamente en #258. Mantener hasta comprobar que no queda contenido único y que #258/#255 se integran.
- **Reviews y status:** las consultas de reviews y review threads para #193/#251/#255/#258 no devolvieron revisiones formales ni hilos; los combined status contexts para los SHAs revisados no devolvieron contextos. No confundirlo con check-runs/workflow runs, que sí están verdes.
- **Checkout #258:** incluye endpoint transaccional, idempotencia, locks de sucursal/almacén/balances, ledger/auditoría, rate limit 60/min por IP Cloudflare con HMAC y fail-closed, migration 0017 (BCV weekday/weekend) y migration 0018 (asignación USD individual por pago VES y residuo). La validación exacta en CI está confirmada en df1ba99.
- **Gates todavía abiertos:** review independiente; ingesta BCV y dependencia #251/#255; rehearsal Neon mediante runner protegido y verificación de login/ownership/grants; runtime conserva escritura directa de `inventory_balances` frente a la decisión SECURITY DEFINER pendiente; aprobación de producto para una sola moneda/pago exacto sin parcial ni sobrepago; calendario oficial de feriados weekday; UI checkout y flujo operativo E2E. El rate limit checkout y la validación SQL individual por pago ya no deben listarse como ausentes.
- **Producción: NOT READY.** CI verde no demuestra Neon aplicado, runtime identity/grants efectivos, Worker productivo, flujo UI/E2E ni readiness comercial. En esta recuperación no se hicieron escrituras en Neon, cambios de secretos, Cloudflare manual, DNS, billing ni despliegues manuales.

### Orden de continuación

1. Obtener revisión independiente de #251, #255 y #258; mantenerlas Draft hasta resolver los gates aplicables.
2. Revisar #251 y luego #255 como pila; no retargetear #255 a main sin reconstruir su dependencia.
3. Completar revisión de seguridad/finanzas de #258 sobre su HEAD exacto; no reutilizar checks de SHAs anteriores.
4. Auditar y preservar el contenido único de #193; resolver el modelo de proyección de balances antes de producción.
5. Resolver Neon rehearsal solo mediante runner protegido; Neon main permanece fuera de alcance.
6. Cerrar contrato comercial y feriados antes de construir/activar checkout UI y operación real.
7. Mantener #233 como evidencia histórica hasta demostrar que no conserva contenido único; nunca fusionar su rama antigua.

---
## Estado vivo posterior a #257 — 2026-11-08 UTC

- `main` actual al iniciar esta reconciliación: `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`.
- **PR #259** fusionada por squash en `07b146a3f2b7830bbd328a585535084e57e43c4e`: serializa la batería de integración runtime-role que comparte PostgreSQL con `--no-file-parallelism`.
- **PR #257** fusionada en este `main`: reconciliación documental de 30 archivos; preserva los contratos ODD, las ocho decisiones aprobadas de inventario y el informe histórico de autenticación.
- **PR #258** sigue Draft, base main. HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94`: 15/15 check-runs y 13/13 workflows SUCCESS; 141 unitarias, 85 runtime-role PostgreSQL y 16 checkout PostgreSQL integration tests. Migration 0017 en esta rama añade selección BCV weekday/weekend y guard SQL de aritmética por línea. No está en main ni aplicada en Neon.
- **PR #251** Draft, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`: 15/15 check-runs y 13/13 workflows SUCCESS; sin review formal.
- **PR #255** Draft, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251: 15/15 check-runs y 13/13 workflows SUCCESS; sin review formal. Productor/API/Cron BCV aún no integrado.
- **PR #193** permanece sin cambios por la restricción previa; brechas de privilegios/snapshot/referencias documentadas en SECURITY_ROADMAP.
- **PR #233** permanece como fuente histórica Draft; su handler/tests fueron recuperados en #258. No fusionar la rama antigua.
- PRs abiertas en este snapshot: #193, #233, #251, #255 y #258. #257 y #259 ya están fusionadas.
- **Producción NOT READY:** falta integrar la ingesta BCV; confirmar política comercial de pagos; validar asignación USD individual por pago en DB; resolver escritura runtime directa en `inventory_balances`; decidir calendario de feriados entre semana; implementar UI checkout. La protección SQL por línea está solo en PR #258.
- Sin DDL/DML en Neon main, cambios de secretos, configuración Cloudflare manual, DNS, billing ni despliegue manual. Los checks Cloudflare de PR son builds/checks y no prueban por sí solos el estado de producción.

## Snapshot operativo autoritativo — 2026-11-08 UTC — sincronización #259 y recuperación de ventas

- **main:** `07b146a3f2b7830bbd328a585535084e57e43c4e`. #259 está fusionada; CI serializa las suites PostgreSQL runtime-role con `--no-file-parallelism`.
- **PR #251 — retención auth 48 h:** Draft, HEAD `e2015f3742c2fba62bada2468efdb3689e2e1db4`, base main, 25 ahead / 0 behind; **15/15 check-runs y 13/13 workflows SUCCESS**. La prueba ahora verifica límite 500 por tabla y drenaje del remanente en una segunda invocación. Sin review formal. Cron no activar hasta cerrar Neon/runtime.
- **PR #255 — tasa oficial BCV:** Draft, HEAD `1337d28591673dabfe5c4bf1d5c0d8c03c99162b`, base #251 `e2015f3742c2fba62bada2468efdb3689e2e1db4`, 44 ahead / 0 behind; **15/15 check-runs y 13/13 workflows SUCCESS**. Incluye parser BCV, API/UI, persistencia decimal y Cron. Sin review formal. No se ha hecho smoke test contra BCV/Worker productivo; feriados entre semana siguen fail-closed.
- **PR #258 — checkout atómico:** Draft, HEAD `313f76c132c61200ed49a7c6e4e01fcf75659bf9`, base main, 13 ahead / 0 behind; **12/15 check-runs y 12/13 workflows SUCCESS**, sin fallos. Pendientes: Workers Builds, verify, Cloudflare Pages y workflow CI. No reutilizar los verdes de SHAs anteriores. La implementación base anterior `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 141 unit tests, 85 runtime-role tests y 15 checkout PostgreSQL tests; los cambios posteriores deben revalidarse en el SHA final. Migration 0017 está solo en la PR.
- **PR #257 — esta reconciliación documental:** Draft, HEAD previo a este refresh `f791b312b53541cacca67161ed1f6e5b9ab54173`, base main, 29 ahead / 0 behind; 6/14 check-runs y 6/13 workflows SUCCESS, el resto pendiente, sin fallos. Este commit documental cambia el SHA y obliga a validar de nuevo.
- **PR #193:** sigue abierta para revisión técnica de inventario; no modificar su rama ni cerrar. **PR #233:** sigue abierta como fuente histórica; no fusionar su rama antigua. El handler/tests recuperados están en #258. #202 y #211 se cerraron tras preservar sus contenidos/hallazgos en esta rama.
- **Reviews:** no hay revisión formal independiente registrada para #251, #255 ni #258. CI verde no equivale a aprobación.
- **Neon:** no se aplicaron migraciones ni se escribieron datos en main o rehearsal. Main sigue sin roles runtime/migrator, ledger y tablas 0003–0016; rehearsal tiene los logins pero runtime carece de grants de tabla y no existe ledger. El runner CI es PostgreSQL efímero, no despliegue a Neon.
- **Producción: NOT READY.** No se modificaron secretos, configuración manual de Cloudflare, DNS, billing, Worker productivo ni datos reales. Los builds Pages/Workers de PR son previews de rama, no despliegues productivos.

### Gates técnicos que no se deben perder

1. #251/#255: revisión independiente, baseline/migraciones/grants Neon por runner protegido, login runtime real y Cron/Worker identity verificados.
2. #258: fuente BCV #255 integrada; política de feriados; UI checkout; aprobación funcional explícita de pago en una sola moneda y pago exacto completo; assertions SQL de cálculo por línea y asignación USD equivalente por pago.
3. #258/#193: migration 0012 concede UPDATE/INSERT directo a runtime en `inventory_balances`; migration 0010 exige pairing con ledger, pero no hace la proyección exclusivamente SECURITY DEFINER. Resolver antes de producción.
4. El endpoint checkout aún no tiene bucket de rate limiting específico; la idempotencia no sustituye limitación de frecuencia. Resolver antes de exponer POS real.
5. No activar Cron, aplicar migration 0017 en Neon ni fusionar estas PRs por CI verde solamente.

---

## Estado vivo actualizado — 2026-11-08 UTC — checkout recuperado y CI estabilizado

- `main`: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- **PR #251** Draft, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`: 15/15 check-runs y 13/13 workflows SUCCESS. Sin review formal; no activar Cron hasta cerrar el gate Neon.
- **PR #255** Draft, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251: 15/15 check-runs y 13/13 workflows SUCCESS. Productor/parser/API/UI/Cron BCV, sin review formal; aún no integrado en main.
- **PR #258** Draft, rama `feat/sales-checkout-recovered-main-20261108`, base main `07b146a3f2b7830bbd328a585535084e57e43c4e`. Recupera handler/tests de #233 y añade migration 0017 weekday/weekend, sin reemplazar 0015. SHA de implementación `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 15/15 checks, 13/13 workflows, 141 unitarias, 85 runtime-role integration y 15 checkout PostgreSQL tests. HEAD tras sincronizar main y actualizar el modelo `433a1fa1212f610cbb543597e620219bd91327a4`: 13/15 check-runs y 12/13 workflows SUCCESS; verify, Cloudflare Pages y CI siguen pendientes, sin fallos.
- **PR #259** fusionada a main por squash como `07b146a3f2b7830bbd328a585535084e57e43c4e`. Serializa la batería runtime-role PostgreSQL con `--no-file-parallelism` y corrige la carrera DDL/DML sobre triggers temporales de audit_logs.
- **PR #257** Draft, HEAD `2cecf9b6f462d80b38cdb58be09b21dd2f7f4d3b`, base main `07b146a3f2b7830bbd328a585535084e57e43c4e`: 12/12 check-runs SUCCESS, 10/13 workflows SUCCESS y tres workflows aún pendientes al tomar este snapshot. Sin fallos; #259 ya está integrado. Este refresh documental genera un SHA nuevo y exige revalidación.
- PR #233 sigue Draft como fuente histórica, 408 commits ahead / 18 behind y base cerrada antigua. No fusionar su rama; recuperación en #258.
- PRs abiertas: #193, #233, #251, #255, #257 y #258. #259 ya está fusionada en main; #202 y #211 están cerradas tras preservar su contenido/hallazgos.
- Neon main no recibió DDL/DML ni migraciones; no hubo cambios de secretos, Cloudflare manual, DNS, billing ni despliegue productivo.
- **Producción NOT READY:** #255 aún debe proveer la tasa BCV; falta decisión explícita del propietario sobre el contrato comercial de pagos; falta defensa SQL de cálculo por línea/asignación por pago; sigue abierta la brecha P1 de escritura runtime directa en `inventory_balances`; no existe UI checkout. Migration 0017 solo está en PR #258, no en Neon.

## Estado vivo autoritativo — 2026-11-08 UTC

> Este bloque reemplaza los snapshots anteriores de estado. GitHub y Neon son las fuentes de verdad; las secciones inferiores son historial y no deben prevalecer sobre este bloque.

### GitHub y PRs

- Repositorio: `BTF14/Micro-app`. `main` verificado en `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- **PR #251 — auth retention:** abierta, Draft, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, base `main` en `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`, cero commits detrás, 15/15 check-runs SUCCESS en el SHA exacto. Implementa limpieza horaria limitada a 500 filas por tabla, retención 48 h y `FOR UPDATE SKIP LOCKED`. No hay revisión formal ni hilos. No fusionar ni activar Cron hasta cerrar el gate Neon.
- **PR #255 — BCV oficial USD/VES:** abierta, Draft, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251 en `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, cero commits detrás. 13 workflow runs (10 pull_request + 3 push) y 15/15 check-runs SUCCESS en el SHA exacto. Incluye parser oficial limitado a 2 MB, persistencia idempotente NUMERIC(18,8), latest/history, selección por fecha efectiva, conversión decimal, Cron laborable 18:00 Caracas, validación exacta de límite con BigInt, respuestas latest no-store y revalidación UI al cambiar la fecha de Caracas. No hay revisión formal ni hilos. Una nota manual antigua apunta a otro SHA y no cuenta como revisión del HEAD actual.
- **PR #257 — recuperación documental ODD/locking:** abierta, Draft, HEAD `143a38664cf14e360801980d39e0cc3f2b7d5650`, base main `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`, 10/10 check-runs SUCCESS en ese HEAD. Conserva contrato de locking, modelo de turnos y ODDs de inventario/auditoría. Esta rama se amplía con la reconciliación documental actual.
- Otras PR abiertas que aún requieren reconciliación: #193 (inventario/documentación, base antigua y mergeable=false), #202 (19 archivos documentales, base antigua; contiene addenda útiles de 2026-11-05), #211 (auditoría auth histórica; conserva hallazgo de TTL de sesión de 7 días), #233 (handler/tests únicos de checkout, todavía apilada sobre una base antigua).
- PRs cerradas por supersesión verificada, sin merge: #200, #204, #205, #207, #208, #209, #210, #227, #228, #229, #230, #231 y #232. Sus funcionalidades están en main o recuperadas en #255; ODDs de inventario se preservan en #257. #250 y #254 ya estaban cerradas como supersedida/duplicada. #247/#248 y #253 están fusionadas.
- Cerrar una PR antigua no equivale a descartar su trabajo: cada cierre tiene comentario con evidencia de sustitución y las recuperaciones documentales siguen en #257.

### BCV y ventas

- El parser no utiliza `Number()` para el límite máximo: la comparación de entero/fracción es exacta y tiene prueba de regresión.
- El último endpoint BCV y el cliente web usan `no-store`; el dashboard revalida al cambiar la fecha local de Caracas, al volver a la pestaña y descarta respuestas iniciadas bajo una fecha anterior.
- En sábado/domingo se selecciona la fecha futura más próxima publicada para el siguiente día hábil. No hay calendario bancario oficial para feriados entre semana; la API falla cerrado y el catálogo deshabilita conversión si falta la fecha exacta.
- La migración 0015 canónica del checkout sigue comprobando `effective_date = hoy`, incompatible con la tasa de siguiente día hábil durante fines de semana. #233 conserva handler/tests únicos, pero su migración 0015 antigua es inferior y no debe copiarse. La recuperación futura debe portar solo el handler/tests a una rama nueva basada en #255 y crear migración 0017 para alinear el trigger. No activar checkout hasta la aprobación funcional explícita del modelo de pagos (una moneda, pago exacto completo; sin parcial ni cambio).

### Neon — evidencia viva, solo lectura

- Proyecto `micro-app-db` (`restless-fire-99110035`), base `neondb`.
- Neon main `br-summer-math-b7297a60`: no existen `microapp_runtime`, `microapp_migrator`, `app_schema_migrations`/`schema_migrations`, `auth_bootstrap_attempts`, `branches`, `warehouses`, `inventory_balances` ni `register_shifts`. `exchange_rates.rate` sigue en precisión 14,6.
- Ensayo `rehearsal-baseline-20261107` (`br-curly-poetry-b7dxsddm`): ambos logins conectan y no tienen membresías. `public` concede a PUBLIC solo USAGE; migrator tiene USAGE+CREATE y runtime solo USAGE. Los objetos existentes son propiedad de migrator. Runtime no tiene grants de tabla SELECT/INSERT/UPDATE/DELETE en las tablas examinadas. No existe `app_schema_migrations` ni se han aplicado 0003–0016.
- El workflow `.github/workflows/migration-runner.yml` valida el runner en PostgreSQL 18 desechable; no es un workflow de release hacia Neon. El plan documenta que falta el secreto de ensayo `NEON_REHEARSAL_DATABASE_URL` y un runner protegido que invoque `adopt-baseline.sh`/ `migrate.sh`. No pegar migraciones en el SQL tool ni ejecutar DDL manualmente.
- No se escribió en Neon main, no se aplicaron migraciones en rehearsal durante esta sesión y no se modificaron secretos. Para ejecutar el runner real en rehearsal hace falta autorización específica para crear/usar el secreto y el workflow protegido. Neon main y el secreto de producción siguen fuera de autorización.

### Estado de producción

**NOT READY.** No se han fusionado #251/#255, no se han ejecutado migraciones en Neon main, no se cambiaron secretos/DNS/billing/Cloudflare production y no se hizo despliegue manual. Check-runs verdes de PR no equivalen a revisión formal ni a prueba de producción.

## Estado vivo — reconciliación posterior a #252 — 2026-11-07 UTC

- **Main actual:** `a38463ea00415c7601d716132e70a29e381a2e34`. PR #249 y #252 están fusionadas. #252 incorporó la regresión de bootstrap oversized sin Content-Length y su documentación.
- **Backlog vivo:** 20 PR abiertas en consulta GitHub directa. No reutilizar conteos 19/28 anteriores.
- **PR #251 — retención auth:** Draft, HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662`, base main registrada `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`, compare 22 ahead/3 behind, mergeable. 11/11 workflows PR SUCCESS y 2/2 push security scans SUCCESS. Implementa Cron horario de cleanup con límite 500 filas por tabla, `FOR UPDATE SKIP LOCKED`, retención 48 h, preview skip y PostgreSQL integration bajo `microapp_runtime`. No mergear ni activar hasta que Neon main tenga `auth_bootstrap_attempts` y login/runtime grants verificados.
- **PR #255 — recuperación BCV:** Draft, HEAD actual `c45c8ec050ddf96381968535cb6bddfd24ac1feb`, base #251 `7c6df0016834e2e6f2ca4b4d062c94995e756662`, mergeable. 10/10 workflows pull_request y 3/3 runs push terminaron SUCCESS en este SHA exacto; logs confirman 2/2 pruebas PostgreSQL BCV con admin y microapp_runtime. Recupera API/UI/cron de #227 y el fix de persistencia de #250, sin duplicar migration 0013. Incluye parser streaming 2 MB, fechas BCV en español, decimal `NUMERIC(18,8)`, idempotencia, latest/history, conversión exacta y pruebas admin/runtime.
- **Regla BCV:** días hábiles seleccionan la fecha efectiva de hoy; sábado/domingo usan la fecha futura más próxima publicada para el siguiente día hábil. Un registro futuro no bloquea insertar una fecha anterior faltante; un registro futuro stale bloquea selección de fechas posteriores. Las fechas futuras se limitan a 7 días. No existe aún calendario bancario oficial para feriados entre semana: la API falla cerrado y el catálogo suspende conversión si falta la fecha exacta. No usar tasa aproximada ni terceros.
- **PRs fuente BCV:** #227 fue reabierta como ancla temporal de dependencia/procedencia porque #228–#233 aún apuntan a su familia de ramas; sigue Draft y no es merge-ready. #250 está cerrada como supersedida; su corrección mañana→hoy está preservada en #255. #254 también está cerrada como duplicado. #254 fue cerrada como duplicado recuperado por #255.
- **PRs supersedidas:** #218–#226 fueron cerradas tras recuperar o verificar sus cambios únicos. El cleanup útil de #218 quedó preservado en #251. #254 está cerrada sin merge; su implementación se copió a #255.
- **Checkout stack audit:** #229–#231 están mayormente supersedidas por money engine/CatalogPanel/ProductForm ya presentes en main; migration 0014 de #228 es idéntica a la canónica. #232 aporta `docs/sdd/SALES_CHECKOUT_MODEL.md`, ya recuperado y actualizado en esta rama documental. #233 conserva handler/tests únicos. Bloqueador detectado: migration 0015 aún exige BCV `effective_date = hoy`, incompatible con la tasa del siguiente día hábil en fin de semana; requiere migration 0017 que alinee el trigger con `findApplicableBcvRate`. La migration 0015 ya impone una moneda y pago exacto completo; no se encontró aprobación funcional explícita registrada, confirmar antes de activar checkout.
- **Documentación:** esta reconciliación está en PR #253 (Draft), base main `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4`. Mantener el snapshot superior actualizado y conservar debajo solo historia explícitamente supersedida.
- **Neon — evidencia solo lectura:** rehearsal `br-curly-poetry-b7dxsddm`, parent main `br-summer-math-b7297a60`; ambas huellas 133 columnas, 204 constraints, 46 índices, 17 relaciones, 15 tablas. En rehearsal existen logins migrator/runtime; runtime aún sin grants de tabla y no hay `schema_migrations`, `auth_bootstrap_attempts`, warehouses ni conteos. No se ejecutó baseline ni migraciones. Neon main sigue intacta.
- **Producción:** **NOT READY**. No se modificaron Neon main, secretos, Cloudflare productivo, DNS, billing ni datos reales. No activar Cron ni convertir precios en producción antes de completar migraciones, runtime identity/grants, fuente BCV y calendario de feriados.

- **PR #256:** fusionada en `a38463ea00415c7601d716132e70a29e381a2e34`; alinea el fixture sintético de backup/restore con el esquema sin descuentos sin modificar migraciones ni código de aplicación. Checks PR exactos verdes; post-merge verificados: 10/10 check-runs y 8/8 push workflows SUCCESS, incluidos Cloudflare Pages y Workers builds.

### Próximos pasos obligatorios

1. Obtener revisión independiente de #255; los 10 workflows pull_request y 3 runs push ya pasan en el SHA exacto `c45c8ec050ddf96381968535cb6bddfd24ac1feb`.
2. Revisar la integración BCV en PostgreSQL con login `microapp_runtime`, especialmente selección de fin de semana y comportamiento ante fila futura stale.
3. Obtener revisión independiente; mantener #255 Draft hasta terminarla.
4. Mantener #251 Draft hasta completar el gate Neon rehearsal/adopción y probar el Cron con runtime login real.
5. Recuperar #228–#233 en orden sobre una base vigente, preservando money engine y checkout sin reintroducir migraciones duplicadas.
6. Reconciliar #200 y cerrar solo PRs realmente supersedidas tras comparar diffs y dependencias.


---

## Reconciliación de PR y dependencias — 2026-11-07 UTC

- GitHub consultado en vivo: **28 PR abiertas**. Main: `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`. No reutilizar el snapshot anterior de 25/26 PR.
- [PR #250](https://github.com/BTF14/Micro-app/pull/250), corrección BCV mañana→hoy: HEAD `081ec1026f4bda889a633bb3fcbe420433e13336`, base #227 `83cf96b7fcb7b0e304f676d21ab721de61364a59`, 9 ahead/0 behind, Draft. Seis workflows del SHA exacto success: CI push/PR, migration runner push/PR, Security scan y Secret history scan. CI ejecutó PostgreSQL real en servicio desechable; probó insertar mañana antes que hoy, conservar ambas fechas, elegir hoy con fecha America/Caracas e idempotencia. La suite solo corre con CI=true y localhost/127.0.0.1/microapp_test. Sin reviews ni review threads.
- [PR #227](https://github.com/BTF14/Micro-app/pull/227) HEAD `83cf96b7fcb7b0e304f676d21ab721de61364a59`: 13 workflow runs success (6 pull_request + 7 push). Sigue Draft y apilada sobre #226; sus checks no sustituyen la corrección ni el CI de #250.
- [PR #200](https://github.com/BTF14/Micro-app/pull/200) HEAD `464ca08b9020fad128cc9c8a321568493d484517`: 17 workflow runs success, pero compare con main actual es **diverged 37 ahead/14 behind** y GitHub indica no mergeable. Main ya tiene migraciones canónicas 0005–0016; #200 usa una secuencia distinta que vuelve a numerar inventario/roles/auditoría/ledger. Hay solapamiento amplio en auth, catálogo, tenant context, workflows, lockfile y migraciones. No rebase/merge automático: reconstruir los cambios únicos sobre main y preservar una única secuencia de migraciones.
- [PR #204](https://github.com/BTF14/Micro-app/pull/204) HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20`: base histórica #200 en `5fbc17a48b65076cf5609a7a054bbd125a3a5d1e`; contra #200 actual diverge 8 ahead/5 behind. Su único archivo cambiado es `inventory-counts.integration.test.ts`. La finalidad (fixtures por test) ya está presente en main y evolucionó: main usa `beforeEach`, crea warehouse y product por test y `seedInventoryBalanceFor` registra fixture ledger. No re-aplicar a ciegas; comparar la suite completa y, si no queda cambio único, cerrar #204 como supersedida con evidencia.
- PRs #205/#207/#208/#209/#210 llevan comportamiento que ya está en main: #205 idempotency schema/handler y los 21 nombres de pruebas de la rama están en main (24 tests); #207 audit append-only SQL es byte-identical a main 0008 (assertions solo difieren en comentario del filename); #208 own-shift role SQL es byte-identical a main 0007; #209 count-ledger SQL es byte-identical a main 0009 (assertions solo difieren en comentario); #210 balance↔ledger SQL es byte-identical a main 0010 (assertions solo difieren en comentario). Aún revisar diffs restantes de tests/workflows/docs antes de cerrar como supersedidas.
- Pila de migraciones/auth: #224→#225→#226→#227 está apilada sin divergencia interna, pero depende de la cadena anterior. #218 fue retargeteada desde la cerrada #215 a la PR activa #211 (HEAD #218 `2115d66cca18ee094ee3b3f8148ac6a61df040da`, 51 ahead/0 behind). #214 está supersedida por #213, ya fusionada. Corrección importante: el handoff OAuth de #215 ya está integrado en main vía #240; `0005_auth_bootstrap_attempts.sql` en main es byte-identical a la antigua `0010` de #215/#218 y main `google-auth.ts` implementa handle/state hash y consumo atómico. #218 conserva una copia obsoleta que usa el rate limiter duplicado de #214 y no el camino moderno `consumeAuthRateLimit` + `readBodyWithinLimit`; no reintroducir el handoff ni la migración duplicados. El comportamiento único de cleanup ya fue portado en PR #251 (Draft), sobre main: cron cada hora solo con `APP_ENV=production`, elimina rate-limit inactivos y handoffs expirados hace más de 48 h, preview skip y pruebas PostgreSQL. HEAD `4a0662346c2a1f95bcf09d815df55755f53686cd`; 10/10 workflows PR SUCCESS, incluido el test con login `microapp_runtime`. No mergear aún: Neon main sigue sin `auth_bootstrap_attempts` ni logins `microapp_runtime`/`microapp_migrator`; el Cron fallaría hasta que se complete la adopción segura del esquema y grants. #218 sigue abierta para auditar otros deltas únicos.
- No se fusionó ninguna de estas PR. No se tocaron Neon main, datos reales, secretos, Cloudflare productivo, DNS ni billing. Producción sigue **NOT READY**.

### Orden de recuperación
1. Reconstruir #200 sobre main actual, conciliando migraciones y preservando catálogo/inventario único.
2. Verificar que #204 no aporta más que fixture isolation ya presente y ampliada en main; si se confirma, documentar y cerrar como supersedida. Auditar #205–#211 contra las implementaciones ya integradas.
3. Mantener #251 Draft hasta que Neon tenga el esquema/grants requeridos mediante el gate aprobado; terminar auditoría de los deltas de autorización de #218 sin recuperar copias obsoletas.
4. Revalidar la cadena de runtime/migrator y el runner frente a las migraciones ya canónicas en main.
5. Mantener #250 como corrección verificada en su rama apilada; no fusionarla hasta reconstruir una base actual y repetir los gates sobre el HEAD resultante.

## Reconciliación en vivo — Neon rehearsal y BCV — 2026-11-07

- Neon project micro-app-db (restless-fire-99110035), PostgreSQL 18. La rama principal br-summer-math-b7297a60 sigue sin schema_migrations, no tiene microapp_runtime ni microapp_migrator, y conserva 15 objetos de aplicación propiedad del owner. Solo se hicieron SELECT.
- La rama rehearsal-baseline-20261107 (br-curly-poetry-b7dxsddm) existe y está ready. Tiene los roles de aplicación y los 15 objetos transferidos a microapp_migrator; no tiene ledger y todavía no ejecutó adopt-baseline.sh apply ni migrate.sh.
- SELECT usando logins directos confirmó que microapp_migrator y microapp_runtime pueden conectarse. Runtime aún no tiene privilegios de tabla (esperable antes de 0003–0016). neondb_owner conserva ADMIN OPTION con SET FALSE/INHERIT FALSE sobre ambos roles. No se probó aún el runtime después de aplicar grants ni el runner real.
- No ejecutar las migraciones pegadas manualmente por SQL: debe ejecutarse el script exacto adopt-baseline.sh/migrate.sh contra la rama de ensayo, con logins directos y comparación de filas. Neon main no se tocó.
- PR #248 está fusionada en fc332946a9128e92ce39a3eb1ef1ee7ebd261598; Claude reportó 10/10 checks post-merge. La consulta de status contexts no devolvió contextos; no confundir eso con los check-runs de Actions.
- Backlog GitHub en vivo: **28 PR abiertas** en la consulta del 2026-11-07; el snapshot de 25 PR de esta sección quedó supersedido por la reconciliación al inicio del archivo. #244–#248 están fusionadas.
- Reconciliación de #227: la migración 0013_bcv_official_rate_precision_and_grants.sql ya está en main y es byte-identical a la del branch #227 (SHA de blob 2d3f5d6f8daf091e0ce25f921b517566c4c91475). Sin embargo, apps/api/src/exchange-rates.ts, tests, route registration, scheduler y UI BCV no están en main. No fusionar #227 completo: rescatar solo cambios de aplicación que sigan únicos y revisar su CI/configuración sobre el esquema ya integrado.
- Hallazgo BCV corregido en PR #250: se eliminó el filtro que impedía insertar hoy si mañana ya estaba almacenada. La regresión PostgreSQL mañana→hoy, fecha America/Caracas e idempotencia pasó en los 6 workflows del HEAD exacto `081ec1026f4bda889a633bb3fcbe420433e13336`. #250 sigue Draft y apilada sobre #227; no está integrada.
- Producción NOT READY: faltan adopción/migraciones en Neon main con autorización específica, runtime grants reales, secreto DATABASE_URL apuntando a microapp_runtime, smoke autenticado, BCV validado, checkout E2E, restore probado y cierre de los gates P0/P1.

---

## Ensayo en rama Neon — 2026-11-07 UTC

- Rama `rehearsal-baseline-20261107` (copia de `main`; producción intacta). Dos hallazgos reales corregidos en `adopt-baseline.sh`: (1) `neondb_owner` solo tiene ADMIN OPTION sobre roles creados, sin SET → se concede SET solo durante la transacción y se revoca; (2) el nuevo dueño necesita CREATE en `public`. Con eso, la transferencia de propiedad de los 15 objetos funciona y el estado de membresías queda compatible con el preflight del runner.
- Pendiente de demostrar: `migrate.sh` 0003–0016 y pruebas negativas con logins reales `microapp_migrator`/`microapp_runtime` sobre Neon (requieren red; las ejecuta el propietario contra la rama de ensayo).

---

## Adopción de baseline — 2026-11-07 UTC

- Nuevo `scripts/db/adopt-baseline.sh` + huella `baselines/0002.schema.txt`. La huella de Neon `main` coincide con 0001+0002 del repositorio (columnas, constraints, índices, relaciones). CI prueba adopción, deriva, rechazo sin confirmación, runner hasta 0016, conservación de filas y rechazo de readopción.
- **No aplicado en Neon.** Falta ensayo en rama Neon (¿puede `neondb_owner` transferir la propiedad a `microapp_migrator`?) y autorización específica. Producción sigue NO LISTA.

---

## Neon: nivel de esquema real y plan de adopción — 2026-11-06 UTC

- Lectura solo-`SELECT` de Neon: esquema en **0001+0002** (15 tablas); sin 0003–0016 ni `schema_migrations`; 1 org, 1 usuario, 1 allowlist, bootstrap consumido, 6 sesiones, 0 filas de negocio; PITR 6 h. El propietario afirma que no hay datos reales de negocio.
- **El código de #244/#245 ya desplegado depende de tablas ausentes en Neon:** las rutas autenticadas de catálogo/inventario fallarán en producción hasta adoptar el esquema. Build y preview exitosos no prueban lo contrario.
- Plan por fases (ensayo en rama Neon → producción → cambio de `DATABASE_URL` por el propietario): `docs/security/NEON_MIGRATION_APPLICATION_PLAN.md`. Ninguna fase de escritura está autorizada.

---

## Estado verificado — 2026-11-06

### PR #244 integrada
- PR #244 merged: `158ec68bd55825d6e8d5527d086023a13445a89c`.
- Post-merge commit checks: **10/10 SUCCESS**, incluyendo CI, PostgreSQL, migration runner, Playwright, Semgrep, Trivy, secret scan, Cloudflare Pages y Workers Builds.
- Cloudflare Pages y Workers Builds reportaron SUCCESS en el commit de merge. Un GET no autenticado a la ruta de catálogo de producción respondió 401 (esperado); no se realizó smoke autenticado de producción.
- PR #244 integró catálogo API/UI, BigInt exact decimals, inventory count lifecycle/idempotency, tenant/branch/warehouse locks, runtime-role tests, streaming body limits y preview API isolation.
- No hubo escrituras en Neon producción, baseline/adoption, cambios de roles/grants, secretos, DNS ni billing.

### Frente activo — inventario lectura/kardex
- Rama: `feat/inventory-read-ledger-20261106`, basada en main después de #244.
- Añade GET paginado de balances por almacén y GET paginado del kardex append-only, con tenant/branch/warehouse scope, locks de autorización, coste visible solo a owner/admin/inventory y oculto a cashier.
- Tests PostgreSQL preparan fixtures como admin y llaman API con el rol configurado; cubren saldos/reservas/disponible, coste por rol, paginación, kardex, acceso cross-tenant y almacén inactivo.
- Esta rama aún no tiene PR ni workflows ejecutados sobre su HEAD final. Mantenerla en Draft al abrir PR y validar exact-SHA.

### Pendientes de arquitectura
- Tras los endpoints de lectura, falta UI de inventario, detalle de conteos y movimientos/recepciones.
- Transferencias siguen siendo el modelo aprobado de dos etapas: despacho en origen y recepción en destino, con mercancía en tránsito y diferencias enviadas/recibidas. El esquema actual no contiene una entidad de transferencia; no simularla con movimientos sueltos. Diseñar migración/estado/idempotencia/auditoría antes de implementar.
- PR #227: corregir orden de fechas efectivas BCV (tasa futura almacenada no debe bloquear tasa de hoy), probar mañana→hoy y límites de cuerpo HTTP antes de habilitar BCV.
- Checkout de ventas sigue pendiente, después de inventario y BCV.
- Producción sigue **NOT READY**: sin baseline/adoption Neon, smoke autenticado productivo, cierre P0/P1 issue #53 ni validación integral E2E de negocio.

## Estado verificado — PR #244 — 2026-11-06

- PR: https://github.com/BTF14/Micro-app/pull/244 — Draft, base main.
- HEAD validado: `d3de5216fac446580e4afdd39376af503cc94b51`; 56 archivos, +5,630/-218.
- **10/10 workflows SUCCESS en este SHA exacto**: CI, PostgreSQL migration validation, migration-runner validation, Playwright E2E, Semgrep, Trivy, dependency review, secret-history scan, AutoSkills preview y progress dashboard.
- CI incluye build/typecheck, unit tests, integración PostgreSQL admin/runtime para auth, branch scope, register shifts, cashier own-shift, catálogo y conteos; todas pasaron.
- Correcciones de test harness: aserciones históricas se ejecutan junto a su migración, no después de aplicar toda la cadena; las fixtures usan conexión admin y las peticiones/helper checks usan runtime. Se añadió test que prueba que cashier open-shift ejecuta realmente con login runtime.
- Seguridad añadida: lecturas de catálogo/almacenes/conteos mantienen locks de sesión/tenant/sucursal durante la consulta; la lista de conteos bloquea el warehouse. Cantidades y costos de conteo solo aceptan strings decimales, no JSON numbers.
- UI: catálogo y formularios consumen el paquete BigInt compartido; aviso BCV ya no afirma conversión vigente cuando no existe tasa validada. Descuentos ausentes.
- Cloudflare Pages preview: https://feat-recover-inventory-appli.micro-app-63i.pages.dev
- Cloudflare Worker preview: https://feat-recover-inventory-application-20261106-micro-app-api.btfcasheb.workers.dev
- Smoke directo del Worker preview: `/health` responde 200; endpoint de catálogo devuelve 503, bloqueado por el aislamiento de preview. Esto no es producción.
- No hay reviews formales ni threads de revisión registrados en PR #244. main está protegido; la integración no tiene permiso para leer el endpoint de branch protection (403). No se ha intentado eludir protección.
- Producción sigue **NOT READY**: no hay baseline/adoption de Neon ejecutado, smoke autenticado de producción, cierre completo de issue #53/P0-P1, inventory movement/read UI, BCV corregido/integrado ni checkout de ventas en la app.

# Checkpoint técnico vivo — 2026-11-06

- main verificado en SHA 38e1d61acc083b3c0b9b73edcb2bc7887ca56872.
- PR #242 (registro de recuperación) fusionada en 7a719d593248341aac86b1ded980d5bb9a6f94e8.
- PR #243 (migraciones canónicas 0001–0015, assertions y runner fail-closed) fusionada en 38e1d61acc083b3c0b9b73edcb2bc7887ca56872. Su HEAD final 481f3b956c96c50b6f956541d1d675646fe66b51 pasó 10/10 workflows, incluyendo PostgreSQL migration validation y migration-runner validation.
- El bundle de migraciones ya está en main. No se ha ejecutado contra Neon producción; la base poblada sigue sin ledger y sin login roles dedicados. El baseline/adoption plan y la autorización específica siguen siendo obligatorios.
- Frente activo: feat/recover-inventory-application-20261106. Portando API y UI de catálogo, creación/edición de productos, BigInt decimal compartido, conteos de inventario idempotentes, locking tenant/branch/warehouse/balance, own-shift authorization, bounded streaming request bodies y aislamiento de previews. Se añadieron pruebas unitarias e integración con roles admin/runtime.
- Se exige Idempotency-Key en creación de conteos; el contrato de DB conserva columnas nullable solo para compatibilidad histórica.
- Política sin descuentos preservada: no hay operaciones discount en autorización ni campos discount en formularios.
- El catálogo se presenta en USD; no se inventa conversión VES hasta integrar y validar BCV. En #227 quedó registrado un riesgo: almacenar primero una tasa con fecha efectiva de mañana puede bloquear la tasa del día actual. Debe corregirse y probarse antes de habilitar el endpoint BCV.
- PR #244 está abierta en Draft. Diez workflows comenzaron en el SHA inicial; cualquier commit posterior supersede esos resultados. Consultar el HEAD y las conclusiones actuales en GitHub antes de decidir Ready/merge.
- No se realizaron escrituras Neon, cambios de roles/grants, secretos, datos reales, DNS, Cloudflare manual, billing ni despliegue manual. Producción NOT READY.

## Próximos pasos
1. Abrir PR Draft para la rama de recuperación y ejecutar todos los workflows en el HEAD exacto.
2. Corregir fallos reales de tests/typecheck/build/privilegios antes de quitar Draft.
3. Tras integración, recuperar inventory read/movement APIs y completar BCV (incluido el bug de fecha efectiva) antes del checkout app handler.
4. Reconciliar y cerrar las PR originales solo después de rescatar y verificar todos sus cambios únicos.
5. Mantener el gate de Neon producción separado: revisar baseline/adoption y pedir autorización específica antes de cualquier escritura o cambio de roles/grants.


## OBJETIVO DEL PROPIETARIO — CIERRE DEL BACKLOG DE PR Y PRODUCCIÓN (2026-11-06)

- El propietario ha reiterado que hay 26 PR en el backlog que deben completarse y llevarse a integración. Recontar el backlog en GitHub antes de cada informe; el 26 es el snapshot comunicado, no un conteo perpetuo.
- Cada PR se completa, revisa y fusiona individualmente cuando diff/base/dependencias, pruebas, seguridad, reviews solicitadas, checks del SHA exacto y branch protection estén íntegramente satisfechos. La autorización permanente de merge sigue vigente; no pedir permiso repetido. No fusionar en bloque ni dejar elegibles esperando innecesariamente a que acabe todo el backlog.
- La preparación global de producción exige además demostrar end-to-end y cerrar P0/P1 de migraciones/baseline, permisos efectivos runtime/migrator/backup, integridad de datos, autenticación/autorización, importes decimales sin descuentos, BCV verificable, backups/restore y RPO/RTO, alertas, seguridad, coste $0, despliegue y smoke test autenticado de producción.
- Una PR no se fusiona si depende de infraestructura, tablas, roles, secretos o datos aún no disponibles y validados en destino. La autorización de merge no autoriza escrituras ni cambios sensibles en Neon main, migraciones remotas, secretos, DNS, Cloudflare manual o billing.
- Mantener tablero vivo de todas las PR pendientes: objetivo, base/head, dependencias, estado de checks, bloqueo, acción y decisión (integrar/consolidar/cerrar duplicado). Máximo dos frentes activos.
## CHECKPOINT VIVO PRIORITARIO — 2026-11-06 03:49 UTC — post PR #240 y auditoría Neon

**Fuente de verdad:** GitHub/Neon consultados en vivo. Este bloque supersede los snapshots anteriores de esta sección; no reescribe el historial del diario.

- Repositorio: `BTF14/Micro-app`; `main` verificado en `71d6434a1877b5e618a093e60472621af8ef790f`.
- PR #240 fusionada: merge SHA `71d6434a1877b5e618a093e60472621af8ef790f`; 9/9 check-runs SUCCESS sobre ese SHA (Pages, Workers Build, verify, análisis JS/TS, Trivy, Chromium, migraciones y secret-history). Esto no equivale a smoke test autenticado de producción.
- PR #213 fusionada: `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`; rate limiting OAuth ya está en main.
- Backlog: 25 PR abiertas en la consulta actual. PR #215 está cerrada sin merge; #218/#220 siguen Draft y dependen de la antigua rama de #215, por lo que requieren port/rebase sobre el handoff ya fusionado en #240.
- PR #200: HEAD `464ca08b9020fad128cc9c8a321568493d484517`, 33 commits ahead y 2 behind del main actual. 19/19 check-runs SUCCESS en ese HEAD; la base ya no es actual y los checks no resuelven la colisión de migraciones.
- PR #233: HEAD `070f49ec1f1e45debb7fe99d998dc2429b5da9b1`, 9/9 check-runs SUCCESS. Es una pila Draft que incluye inventario, runtime/migrator, BCV, decimal exacto, catálogo y checkout; no fusionar mientras persistan los gates P0 y la base antigua.
- **Migraciones:** main contiene `0005_auth_bootstrap_attempts.sql`. Las ramas de la pila contienen `0005_warehouse_inventory.sql` y una copia idéntica de auth en `0010_auth_bootstrap_attempts.sql` (el SQL 0010 y el 0005 de main comparten blob SHA `ada5d01a555102959ece094946a0920c11d39a66`). Secuencia candidata: 0001 initial, 0002 Google identity, 0003 branch scope, 0004 register shifts, 0005 auth bootstrap (main), 0006 warehouse inventory, 0007 register shift member roles, 0008 audit append-only, 0009 inventory count ledger validation, 0010 inventory balance-ledger coupling, 0011 runtime lock helpers, 0012 runtime grants, 0013 BCV precision/grants, 0014 sales without discounts, 0015 sales checkout. Deben renombrarse conjuntamente SQL/assertions y actualizar workflows/scripts/docs; retirar el duplicado 0010 auth. No se ha aplicado ni probado esta reconciliación todavía.
- **Neon main, solo lectura:** conexión de auditoría `neondb_owner`; no existen logins `microapp_runtime`/`microapp_migrator`; `backup_readonly`, `neon_service`, `neondb_owner` heredan `pg_write_all_data` vía `neon_superuser`; `cloud_admin` tiene `rolsuper=true`. `public.schema_migrations` y `public.auth_bootstrap_attempts` no aparecen; el esquema público sí está poblado (incluye `products`, `inventory_movements`, `auth_rate_limits`).
- El runner `scripts/db/migrate.sh` exige conexión directa como `microapp_migrator` y rechaza esquema poblado sin ledger con `MIGRATION_BASELINE_REQUIRED`. Hoy fallaría primero por la ausencia del login migrator; incluso después de provisionarlo se necesita un plan explícito de adopción/baseline, probado y revisado.
- Se dejó comentario técnico persistente en PR #233 (comment ID `6676411612`) con la secuencia candidata y ambos bloqueos.

**Límites:** solo lecturas de GitHub/Neon y un comentario de auditoría en PR #233. No se modificaron Neon, roles/grants, datos, secretos, Cloudflare, DNS, billing ni despliegues manuales. Producción sigue **NO LISTA**.

**Siguiente acción:** consolidar en una única rama integrada la secuencia 0005–0015 y las referencias de CI/assertions, ejecutar todos los tests en PostgreSQL 18 desechable, y diseñar/adaptar por separado el baseline de la Neon ya poblada. No ejecutar migraciones en Neon main ni fusionar endpoints que dependan de tablas ausentes hasta que runtime/migrator, baseline y rollout estén aprobados y verificados.

---

# Estado actual — Micro app

## CHECKPOINT VIVO PRIORITARIO — 2026-11-06 UTC

- `main` actual verificado: `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`.
- **Autorización permanente del propietario:** fusionar PRs a `main` cuando diff, seguridad, branch protection y checks del HEAD exacto estén verificados. La autorización incluye el despliegue automático de Cloudflare Pages/Workers inherente al merge. No volver a pedir confirmación por PR elegible.
- No cubre cambios manuales de Cloudflare, secretos/variables, DNS, billing, roles/grants de Neon, migraciones remotas, escrituras ni datos reales.
- Backlog vivo: **26 PR abiertas**. PR #237, #206 y #213 fusionadas; PR #196 y #214 cerradas como duplicadas/supersedidas tras comparar implementaciones. Issue #53 sigue OPEN/P0.
- **PR #213 integrada:** rate limiting atómico en GET /auth/google (10/10m), POST bootstrap (5/h), GET callback (20/10m); HMAC con GOOGLE_CLIENT_SECRET existente, CF-Connecting-IP, 429/Retry-After y fail-closed 503. No añade secreto ni migración. Merge SHA `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`; checks post-merge de Pages, Workers Builds, CI, Playwright, PostgreSQL migration, Semgrep, Trivy, Chromium y secret-history: SUCCESS.
- **Neon main — auditoría de solo lectura:** `backup_readonly`, `neon_service` y `neondb_owner` son miembros de `neon_superuser`; este hereda `pg_write_all_data` y otros roles. `cloud_admin` tiene `rolsuper=true`. Por tanto `backup_readonly` no es readonly y `neon_service` no es mínimo privilegio. No se leyó DATABASE_URL ni secretos; no se sabe qué rol consume cada binding. No se modificaron roles/grants/datos.
- **PR #200:** vertical slice catálogo/inventario, HEAD `464ca08b9020fad128cc9c8a321568493d484517`, 33 commits ahead / 0 behind, 30 archivos de feature. Checks del SHA exacto completados SUCCESS. Se integró main como primer padre y se conservaron los cambios de feature; CI conserva el test rate-limit OAuth y añade migration/assertions 0005 y suites catálogo/inventario. Sigue Draft deliberadamente: las tablas `warehouses`, `inventory_balances`, `inventory_ledger`, `inventory_counts`, `inventory_count_lines` no existen en Neon main. No fusionar endpoints dependientes de un esquema ausente.
- **PR #214 cerrada** como rate limiter duplicado; #213 es la implementación canónica y no requiere AUTH_RATE_LIMIT_HMAC_KEY. El trabajo distinto de bootstrap handoff y streaming body se conserva en #215.
- **PR #215** sigue Draft y apilada sobre #214: preservar handoff server-side y bounded streaming body, portar sobre rate limiter #213 y eliminar dependencia de secreto nuevo; migración 0010 necesita grants runtime reales. No fusionar todavía.
- **PR #224/#226/#227** siguen parte de la ruta runtime/migrator/BCV. #227 no está lista para merge mientras la cadena de migraciones y permisos no esté integrada/verificada.
- No aplicar migraciones 0005–0013 a Neon main sin plan/permiso específico y comprobación de rol migrator, rollback y restore.
- Próximas prioridades: (1) remediar modelo de roles runtime/backup con plan revisado, (2) preparar ruta segura de migraciones 0005–0013, (3) portar bootstrap handoff #215, (4) continuar aplanando pila #207–#233. Producción sigue **NO LISTA**; CI verde no equivale a readiness real.


---

## Estado vivo verificado — 2026-11-04 UTC

- `main` = `2e0f4083ba577de2f301daf8c866bfbdffb5e23f`, merge squash de PR #198. La transición SDD → ODD y su validador documental ya están integrados.
- PR #198 está fusionada. PR #197 está cerrada **sin merge**, supersedida por #198; no describirla como abierta ni Draft.
- PR #196 permanece abierta y Draft, sin merge: rama `feat/catalog-api-vertical-slice-20261104`, HEAD `c332e740aff279fb8b22a8879581d4b8a3c7de21`, base registrada `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`. Tras el avance de main por #198, la rama está detrás y GitHub la reporta no mergeable; actualizar/reconciliar la base y volver a validar antes de cualquier decisión de integración.
- PR #196 contiene catálogo tenant-scoped (GET/POST/PATCH, baja lógica), almacenes y conteos opening/physical, migración 0005, ledger y contrato de locking. Estos cambios **no están en main** mientras #196 siga sin fusionar.
- Los 11 workflows asociados al HEAD exacto de PR #196 `c332e740...` terminaron en success. Esa evidencia corresponde a la rama y no elimina la necesidad de actualizarla contra main ni sustituye revisión funcional/seguridad.
- La matriz de permisos por rol está **APROBADA desde 2026-10-31**. Su aprobación no equivale a implementación completa: PR #196 cubre una parte del catálogo/inventario; ventas, pagos, recepciones, reservas, devoluciones, transferencias y autorización de todas las operaciones siguen pendientes.
- Issue #53 permanece abierta hasta completar las rutas aplicables y demostrar aislamiento cross-tenant/rol con pruebas negativas.
- Pendientes de seguridad/operación: rate limiting runtime probado, pruebas de autorización para todas las rutas, RPO/RTO medidos, alerta externa de fallo y confirmación de coste total $0.
- No se fusionó PR #196, no se ejecutaron migraciones ni escrituras contra Neon producción, y no se promovieron previews a producción.

## Actualización de gobernanza ODD — 2026-11-04

- El flujo operativo predeterminado pasa a **Organic Driven Development (ODD)**; ver `docs/ODD_WORKFLOW.md`. SDD deja de ser el workflow activo, pero los documentos `docs/sdd/` siguen siendo contratos, modelos y decisiones de dominio vigentes.
- PR #197: abierta, Draft, sin merge; título `chore: adopt ODD and streamline agent governance`. Rama `chore/agent-governance-speckit-20261104`. Consultar el HEAD actual en GitHub; esta PR recibió varios commits documentales después de crear este checkpoint.
- Se añadió `docs/ODD_WORKFLOW.md` y el registro de trabajo `odd/tasks/agent-governance-odd-adoption.md`. `AGENTS.md`, Constitución y perfiles de agentes fueron alineados con ODD.
- `docs/SDD_WORKFLOW.md` es ahora un redirect histórico. La propuesta Spec Kit v1.3.0 se archivó porque la CLI nunca se instaló ni ejecutó; no debe tratarse como herramienta activa.
- ECC y `tester-army/e2e` fueron revisados documentalmente. Ninguno se instaló, ejecutó ni añadió al CI. ECC se evaluará por componentes; E2E agentic solo como piloto opcional, complementario a pruebas deterministas.
- No se tocaron `main`, PR #196, PR #190/#193, issue #53, Neon producción, datos reales, secretos, dependencias, hooks ni despliegues.
- HEAD `25e7e1678b4b3c0f937b4c657f255c6453b95ead`: 9/9 workflows asociados terminaron en success (CI, Playwright E2E, migraciones PostgreSQL, Semgrep, Security, Secret history, Dependency Review, documentación y dashboard). ODD-09 quedó cerrado con esa evidencia. Este checkpoint documental genera commits adicionales; volver a consultar el HEAD y sus checks antes de cerrar la PR. No fusionar ni marcar producción lista.

---

## Estado operativo vigente — 2026-11-01 UTC

- **Estándar frontend aprobado:** `docs/FRONTEND_DESIGN_STANDARD.md` fija el estándar transversal UI/UX, responsive y WCAG 2.2 AA. Se integra en `AGENTS.md`, `micro-app-stack-guidance` y la documentación de accesibilidad. Es una adopción documental; no modifica la UI ni declara auditadas las pantallas existentes.

- Repositorio: `BTF14/Micro-app`. `main` verificado: `7ff887328f25cffff69ccb9e89bbb1ba25200aea` (merge PR #191, 2026-11-01). Consultar GitHub en vivo antes de cualquier acción posterior.
- PR #187 (merge `40244698e95d78122011019e456f3d8b392fb05c`): corrige `docs/sdd/role-permission-decision-matrix.md` §2 (caja) — se había aprobado (PR #182) una fila que permitía a Owner/Admin cerrar/reabrir el turno de otro miembro, lo cual contradecía una decisión de arquitectura ya fijada en `docs/sdd/REGISTER_SHIFT_MODEL.md` §2/§4 (sin cierre por supervisor; reapertura bloqueada por trigger de PostgreSQL en la migración 0004, para todos los roles incluido Owner). Corregido con filas de denegación explícita y nota de que cualquier excepción futura requiere diseño de permiso, motivo y auditoría aprobados aparte por el propietario. Encontrado durante la auditoría de Seguridad Nivel 1 de esta sesión, no reportado por el propietario.
- PR #188 (merge `c7bd0a198c30d190586aa6acd207d954f41ff7c9`): auditoría de Seguridad Nivel 1 completa, con evidencia en vivo volcada en `docs/SECURITY_ROADMAP.md`.
- PR #189 (merge `88213507d088b82ea9231bbc72f49afade7ec99b`): corrige la precisión del estado de Seguridad Nivel 1 y registra la revisión manual de Dependabot; no modifica runtime.
- PR #190 permanece abierta como Draft, sin fusionar, en `feat/org-catalog-read-endpoint-20261101`; HEAD reportado en vivo `42ed27fd9ce13223c6a2d1fd2a9359d3ec871345`, base `main` `88213507d088b82ea9231bbc72f49afade7ec99b`. Mantenerla independiente y no fusionar sin autorización expresa.
- PR #191 (`docs/FRONTEND_DESIGN_STANDARD.md`) fue fusionada el 2026-11-01. Merge commit y `main`: `7ff887328f25cffff69ccb9e89bbb1ba25200aea`. El estándar frontend y sus referencias documentales ya están en la rama principal.
- PR #191 está abierta como Draft en `docs/frontend-design-standard-20261101`, con el estándar frontend y sus integraciones documentales; no está fusionada. Verificar su HEAD y checks en vivo antes de cualquier decisión.
- **Auditoría de Seguridad Nivel 1 — realizada 2026-11-01, resultados volcados en `docs/SECURITY_ROADMAP.md` (sección "Nivel 1"). Estado real, no "Nivel 1 completo":**
  - **Protección de `main`:** ✅ confirmada en vivo (6 checks requeridos, `enforce_admins: true`, `required_approving_review_count: 0`, sin force-push/deletions, resolución de conversaciones obligatoria). La discrepancia de `required_approving_review_count: 1` registrada el 2026-10-30 ya no está presente.
  - **Backups:** 🟡 **no cerrado.** `backup.yml`, `backup-restore-smoke.yml` (datos sintéticos poblados) y `backup-real-restore.yml` (restauración técnica real) tienen ejecuciones recientes en éxito — ver runs exactos en `SECURITY_ROADMAP.md` y `BACKUP_AND_RECOVERY.md`. **Falta, con evidencia cero hasta ahora:** RPO/RTO medidos de extremo a extremo, alerta de fallo fuera del resumen de GitHub Actions, y confirmación explícita de coste $0. No hay ningún workflow que mida ninguno de los tres (confirmado por `grep` en `.github/workflows/`, 2026-11-01). Este punto bloquea declarar Nivel 1 "completo", no bloquea #53.
  - **Dependabot:** ✅ configuración correcta (npm + github-actions). El endpoint de alertas de la API devolvió 403 con el token de esta sesión (limitación de alcance, no del repo). **El propietario revisó manualmente `https://github.com/BTF14/Micro-app/security/dependabot` el 2026-11-01: 0 alertas abiertas, 15 cerradas** — evidencia de fuente manual (captura de pantalla), no reproducible por API/CI con el token actual.
  - **Cabeceras de seguridad y CORS/bundle (issue #78):** ✅ sin cambios desde PR #183/#185; workflows de verificación siguen en verde en sus últimas ejecuciones (CORS 2026-10-31T23:52:41Z, bundle 2026-11-01T00:08:33Z).
  - **Matriz de permisos — inventario:** ✅ se revisó el punto flagueado externamente (alcance "sucursal" de Inventory vs. `products.stock_quantity` organizacional). La matriz ya documentaba correctamente, desde su aprobación original, que ese alcance se refiere a quién puede operar y no a que el stock esté particionado por sucursal. No se encontró contradicción; no requirió corrección.
- PR #181 (merge `cf13538e5bc68af4fa544efa71dad96d8ea5412a`): añade `.github/workflows/cors-verification.yml`, un workflow de solo lectura que emite los preflight `OPTIONS` reales contra el Worker público desde un runner con salida completa a internet (este y otros sandboxes de IA del proyecto no pueden alcanzar `micro-app-api.btfcasheb.workers.dev` ni `micro-app-63i.pages.dev`: `403` en el `CONNECT` del proxy saliente, confirmado de nuevo en esta sesión para ambos hosts).
- PR #183 (merge `d8be0c6249a78f64645fcd2a794362c7cb794452`): refuerza ese workflow con aserciones explícitas de código HTTP/código de salida de `curl`, y un tercer preflight que solicita `Access-Control-Request-Headers: authorization,content-type` y exige que se reflejen en `Access-Control-Allow-Headers`.
- PR #185 (merge `51194315b8cbe9138567bdbbd46a08509235de6e`): añade `.github/workflows/frontend-bundle-verification.yml` — descarga el `index.html` público y cada `<script src>` referenciado, y confirma que el bundle realmente publicado (no solo el código fuente versionado) contiene el literal `https://micro-app-api.btfcasheb.workers.dev`, fallando si aparece cualquier otro host `*.workers.dev`.
- **Issue #78: CERRADA el 2026-10-31**, con evidencia reproducible real (no solo inferida):
  - CORS: runs [41186202382](https://github.com/BTF14/Micro-app/actions/runs/41186202382), [41186391247](https://github.com/BTF14/Micro-app/actions/runs/41186391247) y la versión reforzada en `main` [41254331839](https://github.com/BTF14/Micro-app/actions/runs/41254331839) (todos `success`). El origen permitido `https://micro-app-63i.pages.dev` recibe `Access-Control-Allow-Origin` correcto, `Access-Control-Allow-Credentials: true`, el listado completo de métodos y las cabeceras `Authorization`/`Content-Type` reflejadas; el origen externo `https://attacker.example` no recibe ningún header `Access-Control-Allow-Origin`.
  - Bundle publicado: run en `main` [41255425480](https://github.com/BTF14/Micro-app/actions/runs/41255425480) (`success`) confirma que el JS realmente servido por Pages contiene la URL de API canónica.
  - Ambos workflows quedan como guardia de regresión semanal (lunes 09:00/09:05 UTC) y manual.
  - **Pendiente real fuera del alcance de un sandbox de IA:** verificación autenticada del dashboard de Cloudflare (`FRONTEND_ORIGIN` efectivo del Worker vía panel) — requiere que el propietario la confirme manualmente; los comentarios históricos de #78 ya registran la última vez que se hizo.
- PR #182 (merge `062e5ed671a30d356891d9a28dd5d724045cdfa1`): **matriz de permisos por rol APROBADA** en `docs/sdd/role-permission-decision-matrix.md`. El propietario decidió explícitamente ventas/descuentos (cualquier descuento requiere aprobación Admin/Owner), devoluciones/anulaciones (Cashier anula solo en el mismo turno abierto; tras el cierre, solo Admin/Owner) y gestión de miembros/políticas (solo Owner); delegó explícitamente a criterio técnico catálogo/inventario, mecánica de caja y reportes/auditoría. La aprobación **no implementa nada**: sigue sin existir ningún endpoint comercial ni middleware de autorización en `apps/api/src`.
- Auditoría de callsites (solo lectura, 2026-10-31): `resolveTenantContext`, `resolveBranchContext` y `resolveOpenCashierRegisterShift` son fail-closed y correctos en su lógica SQL (UUID, sesión no revocada/expirada, `is_active` en cada capa), pero **no tienen ningún callsite fuera de sus propios archivos de test** — ninguna ruta HTTP de `apps/api/src/index.ts` los usa todavía. No se encontró ningún defecto que corregir; no se modificó código de producto.
- **Issue #53 sigue ABIERTA**: permanece así hasta que existan endpoints comerciales reales con middleware de autorización siguiendo exactamente la matriz aprobada, y pruebas automatizadas de aislamiento cross-tenant y de rol, con PostgreSQL desechable. La aprobación de la matriz es una precondición satisfecha, no el cierre del issue.
- Arquitectura: un único `organization_members.role` por miembro/organización; `branch_memberships` solo concede/revoca acceso a sucursales y no tiene roles. Inventario sigue organizacional; caja conserva turnos y apertura/cierre ordinario.
- Restricciones: no modificar Cloudflare producción, tráfico, deployments productivos, variables, secretos, DNS, billing, Neon main ni datos reales. PostgreSQL desechable primero. Presupuesto objetivo USD 0. No reescribir historial Git ni `STATE_JOURNAL.md` (append-only).

## Próxima secuencia obligatoria

1. Con Seguridad Nivel 1 auditada y documentada (ver arriba), diseñar e implementar los endpoints comerciales de #53 siguiendo exactamente `docs/sdd/role-permission-decision-matrix.md` (aprobada y ya corregida en su sección de caja), con middleware de autorización servidor-side que use `resolveTenantContext` → `resolveBranchContext` → `resolveOpenCashierRegisterShift` donde aplique, denegando por defecto.
2. Añadir pruebas automatizadas de aislamiento cross-tenant (organización A nunca lee/escribe datos de organización B, ni manipulando IDs) y de aislamiento de rol, en PostgreSQL desechable, antes de fusionar cualquier endpoint comercial a `main`.
3. Registro de auditoría (Nivel 2, punto 7 de `docs/SECURITY_ROADMAP.md`) para acciones sensibles, antes de considerar el gate de #53 completo.
4. No asumir que la aprobación documental de la matriz habilita por sí sola producción. Consultar GitHub y el estado real del código antes de cualquier trabajo posterior.
5. Pendiente, no bloqueante para #53: medir RPO/RTO de backups, confirmar coste $0 y decidir si hace falta alerta externa (fuera del resumen de GitHub Actions); revisar manualmente las alertas de Dependabot en GitHub (el token de sesión no tiene ese alcance).

## Snapshot previo — eliminación segura de rama heredada (histórico; no es estado actual de PR #178) — 2026-10-30 UTC

- La rama original `fix/vercel-api-esm-imports` fue eliminada de GitHub mediante la sesión autenticada del propietario, después de comprobar que el respaldo `archive/legacy-api-esm-experiment-20261020` existía y apuntaba al mismo HEAD exacto: `b1330a5fa547071a5f500f0481ce88109c612f81` (compare devolvió `identical`, 0 ahead / 0 behind).
- Verificación posterior independiente: la búsqueda de ramas no devuelve `fix/vercel-api-esm-imports`; sí devuelve `archive/legacy-api-esm-experiment-20261020`. El respaldo conserva los tres commits. PR #72 permanece cerrada y no fusionada; no se borró ni modificó.
- Alcance de la operación: solo la referencia de rama original. No se modificaron otras ramas, tags, archivos, PRs, settings, deployments, integraciones, Cloudflare, Neon ni producción.
- No integrar el código archivado: es una rama ESM heredada, superada por main. El archive es evidencia/recuperación, no una línea de desarrollo activa.

## Snapshot de continuidad tras PR #177 (histórico; supersedido por el checkpoint superior) — 2026-10-30 UTC

> **BLOQUE HISTÓRICO COMPLETO — NO ES ESTADO ACTUAL.** Todo el contenido desde aquí hasta el siguiente separador horizontal describe observaciones realizadas cuando `main` estaba en `82386c6e...`, antes del merge de PR #178. Los datos de Cloudflare (incluido el 100% de asignación de tráfico), Pages, issues y el próximo orden son históricos y no deben guiar acciones actuales.

**Snapshot histórico verificado — 2026-10-30 UTC.** Repositorio `BTF14/Micro-app`; `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`, merge SHA de PR #177. PR #177 está fusionada; no había PR abiertas en la consulta de continuidad. En la validación post-merge se observaron 9/9 check-runs success y los seis contextos requeridos success; no extrapolar a otros SHA.

**Trabajo documental en curso:** PR [#178](https://github.com/BTF14/Micro-app/pull/178) está abierta como draft sobre la rama `docs/reconcile-role-model-and-cloudflare-20261030`, con base `main` en `82386c6e9300e06f8fa209aa52995b939a72442a`. Snapshot previo a esta corrección: HEAD `8a3db508b10c8a8dfa9c63ace90dbd64825022e0`; sus 9/9 workflows GitHub Actions observados terminaron `success`, y las previews de Pages/Workers reportaron éxito. Ese resultado pertenece exclusivamente a ese SHA. Esta edición documental generará un HEAD nuevo: consultar de nuevo todos sus checks y previews antes de considerar la PR lista. Continuar esa misma PR; no abrir otra.

## Cloudflare — observación autenticada de solo lectura
- **Workers / `micro-app-api`:** Active Deployment en Producción, versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a` (`main`). El panel mostró **100% de asignación de tráfico** a esa versión. La vista de métricas mostró 0 req/sec y 0% de error en el instante observado; son métricas puntuales, no prueba de ausencia de tráfico histórico ni de CORS correcto.
- **Pages / `micro-app`:** rama de producción `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, deployment `https://cc23ff0c.micro-app-63i.pages.dev`. La lista visible de variables de entorno de Pages apareció vacía. Sin embargo, el repositorio versiona `apps/web/.env.production` con `VITE_API_BASE_URL=https://micro-app-api.btfcasheb.workers.dev`, y `apps/web/vite.config.ts` carga variables del archivo de entorno del modo mediante `loadEnv`. Por tanto, la ausencia en el panel no demuestra que el build carezca de la URL. No se reveló ni modificó ningún valor de configuración del dashboard. El bundle publicado aún debe verificarse para confirmar el valor efectivo.
- **Corrección de interpretación:** un comentario anterior de #78 describía 0% para `49975c43`; la observación posterior y directa de Active Deployment mostró 100% asignado. La lectura anterior no debe usarse como estado actual. No se cambió tráfico, despliegue, variables, secretos, DNS ni configuración.

## Issue #78 — CORS y configuración efectiva
Sigue **ABIERTA**. La versión activa del Worker y el deployment de Pages están identificados, pero **CORS continúa NO VERIFICADO por HTTP real**. Los tests de Hono son simulados y no sustituyen dos preflight reales:
1. `Origin: https://micro-app-63i.pages.dev`, `Access-Control-Request-Method: GET`, `Access-Control-Request-Headers: authorization,content-type`.
2. Mismo preflight con `Origin: https://attacker.example`.

Registrar status HTTP y headers `Access-Control-*` solamente. No compartir cookies, tokens ni secretos. El dashboard vacío no demuestra que falte la URL: `apps/web/.env.production` versionado define el Worker y `vite.config.ts` lo carga con `loadEnv`. La página pública muestra el enlace “Continuar con Google” apuntando a `https://micro-app-api.btfcasheb.workers.dev/auth/google`. La inspección no pudo leer el bundle JS ni confirmar el valor compilado para las demás llamadas API; tampoco prueba CORS.

## Issue #53 — permisos comerciales
Sigue **ABIERTA**. La dirección estructural acordada es **un único rol por miembro y organización**, almacenado en `organization_members.role`. `branch_memberships` solo concede/revoca acceso a sucursales; no contiene roles y no permite que una persona sea `cashier` en una sucursal e `inventory` en otra. El rol organizacional aplica uniformemente en la organización. El acceso efectivo a cada sucursal se limita por las asignaciones correspondientes.

La matriz `docs/sdd/role-permission-decision-matrix.md` permanece **NO APROBADA**: esta decisión estructural no aprueba permisos de operaciones. No crear endpoints comerciales, middleware, asignaciones de permisos ni reglas rol→operación antes de aprobación explícita. Las políticas comerciales pertenecen a cada organización; quién puede configurarlas o ejecutar excepciones sigue pendiente. Apertura y cierre ordinario de caja deben seguir el modelo de turnos; no introducir cierres de supervisor incompatibles.

## Límites permanentes
- No desplegar ni cambiar tráfico/configuración de Cloudflare; no modificar secretos, variables, DNS o billing.
- No usar Neon `main` como laboratorio ni ejecutar migraciones remotas; PostgreSQL desechable primero.
- No tocar datos reales. Presupuesto objetivo USD 0.
- No afirmar preparación comercial, CORS productivo, ledger o auditoría comercial implementados.
- La revisión independiente Claude/Codex de PR #172 sigue pendiente/no ejecutada; no convertirla en aprobación.

## Próximo orden reproducible
1. Obtener desde un equipo con conectividad real los dos preflight OPTIONS de #78 y compartir únicamente status + headers `Access-Control-*`.
2. Confirmar, si es accesible, el valor efectivo de `__MICRO_APP_API_BASE_URL__` en el bundle de Pages. La fuente versionada es `apps/web/.env.production`; no cambiar esa variable porque es necesaria para apuntar al Worker.
3. Mantener #53 bloqueada hasta que el propietario apruebe la matriz completa de permisos por operación.
4. Solo después de aprobarla, diseñar autorización server-side y pruebas negativas en PostgreSQL desechable.

---
> **Historial:** las entradas inferiores se conservan por trazabilidad. Sus SHA y estados describen su fecha; este checkpoint y GitHub en vivo prevalecen.

> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan para trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados correctos solo en su fecha. Para el estado actual, usar el checkpoint superior y verificar GitHub en vivo.



> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados que eran correctos en su fecha. Para el estado actual, usar el checkpoint de arriba y verificar GitHub en vivo.


> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Estado vivo — reconciliación de autorización server-side — 2026-10-30 UTC

> **Esta portada supersede los estados operativos anteriores de este archivo.** Las entradas históricas inferiores se conservan como historial; no deben interpretarse como estado actual.

## Estado vivo verificado

- Repositorio: `BTF14/Micro-app`.
- `main` verificado en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. No se ha modificado `main` durante este bloque.
- Último merge con cambios de runtime: PR #169, merge SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 y #171 fueron reconciliaciones documentales; no alteraron runtime ni esquema.
- PR #172: https://github.com/BTF14/Micro-app/pull/172 — abierta, base `main`, rama `docs/operation-authorization-architecture-20261030`, propuesta documental de arquitectura de autorización server-side. No está fusionada; consultar estado draft/ready y HEAD directamente en GitHub.
- Último checkpoint previamente validado: `87de879b021cd4b68ce4267b138832279d4a043a` (12/12 checks success). Después se realizaron sincronizaciones documentales; el HEAD y sus checks deben obtenerse en vivo, no inferirse de este SHA.
- No hay aprobación formal de la matriz de permisos comerciales. La matriz `docs/sdd/role-permission-decision-matrix.md` permanece **NO APROBADA**.
- Issues #53 y #78 permanecen abiertas; no se modificaron en este bloque. Revalidar estado vivo antes de actuar.
- No se verificó ni se modificó Neon main; migraciones 0003/0004 siguen sin evidencia de aplicación remota. La validación PG18 es desechable/CI.
- No hay endpoints comerciales; los resolvers tenant/branch/shift siguen siendo helpers de contexto, no autorización por operación.
- No se cambiaron secretos, DNS, billing, configuración Cloudflare, datos reales ni despliegue de producción.

## Qué se añadió en PR #172

- `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md`: separa autenticación, membresía tenant, scope del recurso y autorización por operación; propone deny-by-default, comprobaciones transaccionales, control TOCTOU/concurrencia, auditoría, catálogo de operaciones y tests negativos.
- Es propuesta técnica, no política de permisos aprobada ni autorización para crear endpoints o migraciones.
- Se amplió la sincronización de continuidad para que el siguiente chat pueda reanudar desde un solo checkpoint consistente.

## Próxima secuencia obligatoria

1. Si se realiza cualquier nuevo commit, verificar de nuevo el HEAD exacto, todos los checks y el diff.
2. La propuesta documental puede revisarse y fusionarse separadamente de la matriz comercial; la matriz debe permanecer NO APROBADA hasta decisión explícita del propietario. No habilitar implementación comercial por efecto de este documento.
3. Obtener decisiones del propietario para permisos por operación, gestión de roles/usuarios, excepciones de caja, descuentos/devoluciones/anulaciones, delegación, configuración de políticas y auditoría.
4. Solo después diseñar/implementar autorización por operación con transacción, locks/isolation, idempotencia y auditoría.
5. Diseñar ledger de caja e inventario antes de exponer operaciones financieras/comerciales.
6. No aplicar migraciones a Neon main ni desplegar producción sin gate y autorización específica.

## Regla de continuidad

Consultar siempre el ref vivo de `main`, el HEAD/base de PR #172, los check-runs exactos y los issues antes de continuar. Este archivo y `HANDOFF_NEXT_CHAT.md` son la portada operativa; las notas históricas inferiores son contexto, no estado vivo.

---

# Estado vivo — post PR #169 — 2026-10-30 UTC

## Estado verificado en GitHub

- Repositorio: `BTF14/Micro-app`.
- Último merge con cambios de runtime: PR #169, SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 (`af08cd913a4e0e155b1b74183a71efc51e5d4646`) fue solo documental; no cambió runtime ni esquema. Resolver el SHA actual de `main` en GitHub antes de cualquier cambio.
- PR #169: cerrada y fusionada; HEAD revisado `0c437509c0ad1a02b91c08d03d9dba62f0e9bd78`; merge SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`.
- PR #166–#170 están fusionadas; #170 fue reconciliación documental post-merge. No hay trabajo de código abierto.
- Checks de PR #169: 8/8 workflows Actions success y checks externos Cloudflare Pages/Workers success en el HEAD revisado.
- Post-merge sobre el merge SHA: 7/7 workflows Actions success (CI, Playwright, migration validation, Security scan, Semgrep, Secret History y Project progress dashboard) y 2/2 checks Cloudflare Pages/Workers success.
- CI post-merge: build/typecheck; unit tests; auth integration 18/18; branch scope 4/4; register shifts 5/5; cashier open-shift integration 7/7 en PostgreSQL 18 desechable. Migration validation 0001–0004 success.
- Reviews formales GitHub: 0; threads inline: 0. Codex no completó por límite de cuota; la revisión manual no se presenta como aprobación externa.
- Issues abiertos relevantes: #53 (seguridad/identidad/aislamiento tenant) y #78 (verificación efectiva Cloudflare); no se modificaron.

## Implementación fusionada en PR #169

- Helper: `apps/api/src/cashier-open-shift.ts`, función `resolveOpenCashierRegisterShift(client, branchContext)`.
- Requiere BranchContext derivado de `resolveBranchContext` después de `resolveTenantContext`; acepta solo rol `cashier`.
- Revalida organización, sucursal, caja, usuario, membresía/rol y asignación activos; filtra por organización, usuario, sucursal y turno abierto.
- Devuelve `null` si no existe turno abierto o el scope ya no es válido. No eleva owner/admin ni permite suplantación.
- Usa `FOR SHARE OF s`; el helper no abre transacciones. Un caller futuro debe invocarlo con el mismo transaction client de la operación si requiere impedir un cierre concurrente.
- Tests unitarios e integración PostgreSQL 18 desechable cubren ausencia/turno propio, usuario inactivo, membresía/rol/asignación revocados, otro cajero, otra sucursal, cross-tenant y cierre concurrente.
- No añade rutas HTTP comerciales ni autoriza ventas/pagos/caja. La matriz de permisos sigue **NO APROBADA**.

## Arquitectura y restricciones vigentes

- Main versiona migraciones 0001–0004. 0003 contiene sucursales/asignaciones; 0004 contiene `registers` y `register_shifts`.
- 0003/0004 no se han aplicado a Neon main. PostgreSQL 18 desechable es el entorno primario de pruebas.
- `resolveTenantContext`, `resolveBranchContext` y `resolveOpenCashierRegisterShift` son helpers aislados; no están conectados a rutas comerciales ni conceden autorización por operación.
- Los turnos no se transfieren; cambio de cajero requiere cierre y nueva apertura. No calcular efectivo esperado/diferencias sin ledger de caja.
- Los builds de Cloudflare del merge commit reportaron success; no equivalen a certificación funcional completa de producción.

## Próxima secuencia

1. Obtener aprobación explícita de la matriz de permisos por rol/organización/sucursal.
2. Diseñar autorización server-side por operación y scope antes de habilitar ventas, pagos, inventario o caja.
3. Diseñar ledger de caja/efectivo esperado, idempotencia y transacciones antes de handlers comerciales.
4. Mantener PostgreSQL 18 desechable como entorno primario; Neon branches solo con valor adicional demostrado.

## Guardrails

- No Neon main como laboratorio ni aplicación remota de migraciones.
- No usar datos reales, secretos, DNS, billing ni Cloudflare settings.
- Los merges a main pueden disparar despliegues automáticos; distinguir builds/previews de verificación funcional productiva.
- Objetivo de coste: $0.
- No afirmar reviews formales/Codex; las PR #166–#169 tuvieron revisión manual documentada, sin aprobación externa.

---

# Checkpoint adicional — políticas comerciales por organización (2026-10-30 UTC)

- Rama de trabajo: `docs/org-policy-architecture-20261030`.
- Base verificada: `main` = `4ab229296d8858c8c553e00a633a762b9c26a81b`; no había PR abiertas al iniciar.
- Se añadió `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`: diseño conceptual de políticas comerciales propiedad de cada organización, versionado, aplicación server-side y snapshots auditables.
- Se corrigieron `docs/sdd/role-permission-decision-matrix.md` y `docs/SAAS_ARCHITECTURE_DECISIONS.md`: no existe umbral universal de descuentos; la organización define si permite descuentos y sus condiciones.
- La matriz de permisos continúa **NO APROBADA**. No se implementaron roles, endpoints comerciales, esquema ni migraciones.
- Alcance exclusivamente documental. No se ejecutó SQL, no se tocó Neon `main`, datos reales, secretos, DNS, billing, Cloudflare ni producción.
- Pruebas runtime: no aplican a documentación; falta revisión final del diff y checks del SHA de PR.
- PR documental activa: [#163](https://github.com/BTF14/Micro-app/pull/163), rama `docs/org-policy-architecture-20261030`. La revisión manual y los checks reportados en HEAD `531296af195ff17988a4ff9fc0ce65b242d7e194` se deben revalidar si cambia el HEAD.
- Próximo gate: cerrar ERD multi-sucursal y resolver aprobación de permisos sensibles antes de implementar autorización comercial. Las políticas comerciales configurables no requieren que el propietario de Micro app establezca reglas de negocio para cada cliente.

---

# Estado vivo verificado tras PR #161 — 2026-10-30 UTC

- **main verificado antes de este checkpoint:** `c7abcb477afd649161176aad8cae707f5e42f632` (merge squash de PR #161). Este mismo checkpoint se integra mediante una PR; consultar el ref vivo de main después de su fusión.
- **PR #160:** fusionada por squash en `be6f19486caf5cf3605c6ca6615f87e305822ea7`.
- **PR #161:** fusionada por squash el 2026-10-30 a las 04:40:49 UTC; merge commit `c7abcb477afd649161176aad8cae707f5e42f632`. Su propósito fue sincronizar el estado post-#160.
- **Checks de PR #161:** 12 check runs completados con `success` en HEAD `a17a4b95312876f0bf4b201c6a84a323fb69fa3b`, incluidos verify, Chromium, postgres-migration, Semgrep, Trivy, secret-history, dependency review, progress dashboard, Pages y Workers Builds. No extrapolar a otros SHA.
- **Alcance #161:** cinco archivos documentales; sin cambios de aplicación, migraciones, workflows, secretos ni infraestructura.
- **Revisión:** Codex no pudo completar revisión por cuota agotada; revisión manual del diff documental completada, sin hallazgos materiales pendientes. No hay reviews humanas ni threads inline.
- **Cloudflare:** Pages y Workers previews exitosos para HEAD de PR; no se obtuvo evidencia de despliegue productivo post-merge.
- **Protección de `main`:** endpoint actual devolvió HTTP 403; la configuración del 26 oct es evidencia histórica, no verificación actual.
- **Estado del producto:** NO LISTO para operación comercial. No hay handlers comerciales; la matriz de permisos sigue sin aprobación; `resolveTenantContext` no aplica permisos por operación ni sucursal.
- **Siguiente prioridad:** arquitectura de autorización y sucursales, consistencia/idempotencia, rate limiting y pruebas PostgreSQL aisladas antes de endpoints comerciales.

---

## Checkpoint histórico post-PR #160


- **main:** `be6f19486caf5cf3605c6ca6615f87e305822ea7` (merge squash de PR #160). GitHub confirmó el ref `refs/heads/main` en este SHA.
- **PR #160:** fusionada el 2026-10-30 a las 04:36:49 UTC. HEAD revisado `fcb4269a459831be7858358c56e90346d5e4e9a6`; merge commit `be6f19486caf5cf3605c6ca6615f87e305822ea7`.
- **Checks de PR #160 en el HEAD exacto:** 12 check runs completados con `success`: verify, Chromium authentication smoke tests, postgres-migration, Semgrep SAST, Trivy, secret-history scan, dependency review, project progress, Cloudflare Pages y Workers Builds (Trivy y secret-history aparecen además en runs de push/PR). No extrapolar estos resultados a commits posteriores.
- **Alcance #160:** nueve archivos documentales; sin cambios de aplicación, migraciones, workflows, secretos, configuración de proveedores, DNS, billing ni SQL.
- **Revisión:** Codex no pudo completar la revisión por cuota agotada en un SHA anterior; se aplicó revisión manual fallback del diff final. No hay reviews humanas ni threads inline registrados. La revisión manual no encontró problemas materiales pendientes.
- **Cloudflare:** Pages y Workers preview del HEAD `fcb4269` finalizaron correctamente. No se obtuvo evidencia de un despliegue productivo posterior al merge; no afirmar que producción se desplegó ni que se validó.
- **Protección de `main`:** la API actual devolvió HTTP 403 `Resource not accessible by integration`. SECURITY_ROADMAP conserva la última lectura histórica del 26 oct como histórica, no como estado vivo. No afirmar configuración actual de protección sin nueva evidencia.
- **Continuidad:** el protocolo de checkpoints incrementales está en `docs/AI_COLLABORATION_AND_PR_POLICY.md`; el punto operativo está en `docs/WORK_CHECKPOINT.md`.
- **Estado del producto:** NO LISTO para operación comercial. No existen handlers comerciales; la matriz de permisos sigue sin aprobación; el contexto tenant no aplica permisos por operación ni sucursal.
- **Siguiente prioridad:** cerrar la arquitectura de autorización por operación y sucursal, ERD organización→sucursal→almacén/caja/turno, consistencia/idempotencia financiera y control de abuso/rate limiting antes de endpoints comerciales. Revisar el handoff y checkpoint antes de actuar.

---

## Checkpoint histórico pre-merge de PR #160


- **PR #160:** https://github.com/BTF14/Micro-app/pull/160; abierta, no draft, no fusionada, `mergeable=true`; base `main` SHA `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc` (revalidar en vivo al reanudar). HEAD anterior a esta sincronización: `bcc667fc6ccd154b8e4f93f041e33d16c29195f0`; checkpoint actualizado después.
- **CI del HEAD anterior:** workflow CI `41002801690` estaba `pending`; otros siete workflows (Dependency review, Project progress dashboard, Database migration validation, Secret history scan, Security scan, Semgrep SAST y Playwright E2E) terminaron `success`. Combined status vacío. No declarar CI global verde. Los nuevos commits requieren nueva comprobación de su SHA.
- **Codex:** review fallida por cuota agotada en `ce4578fed5980631f59206bd45ced3fbefcce346`; no es aprobación. No reintentar mientras siga la limitación.
- **Revisión manual:** diff de PR #160 acotado a ocho archivos documentales. Se detectaron referencias de HEAD/commits obsoletas en WORK_CHECKPOINT y en snapshots de continuidad; se corrige la información de portada y el handoff. Los bloques antiguos en CURRENT_STATE/STATE_JOURNAL son historia y deben permanecer claramente subordinados al estado vivo.
- **Continuidad incremental:** sección 10 de `docs/AI_COLLABORATION_AND_PR_POLICY.md` y `docs/WORK_CHECKPOINT.md` definen y registran checkpoints durante el trabajo.
- **Decisión:** NO fusionar mientras CI requerido esté pendiente/no verificado. Ver `docs/WORK_CHECKPOINT.md` para evidencia, limitaciones y secuencia exacta.
- **No se modificó:** código de aplicación, migraciones, workflows, secretos, Cloudflare/Neon settings, DNS, billing ni producción.
- **Siguiente acción:** verificar HEAD nuevo y CI exacto; revisar los documentos de continuidad actualizados; solo fusionar PR #160 cuando todos los checks requeridos estén completos y no haya hallazgos materiales.

---

# Estado vivo verificado — 2026-10-30 UTC

- **Fuente viva:** GitHub confirma `main` en `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`. PR #158 y #159 están fusionadas; PR #160 está abierta. La protección de rama de GitHub no se pudo confirmar por API y no debe afirmarse como verificada.
- **PR #158:** merge commit `3fba9870b69a7e1ef05cc20db6d19f3ee18df51d`; auditoría documental de Cloudflare/workflows/continuidad.
- **PR #159:** merge commit `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; fija Node.js `24.22.2` mediante `.node-version` y pnpm `10.34.9` mediante `packageManager`, con alineación en workflows.
- **Checks del SHA exacto de main:** 9/9 completed/success, incluidos Workers Build, Cloudflare Pages, Chromium smoke, verify, secret-history scan, postgres-migration, Trivy, generate-progress y static analysis. No extrapolar estos checks a commits futuros.
- **Producción observada tras merge:** Pages `https://micro-app-63i.pages.dev` cargó la pantalla de acceso; Worker `https://micro-app-api.btfcasheb.workers.dev/health` respondió HTTP 200 con `status=ok`, `service=micro-app-api`, `stage=scaffold`. Es una comprobación básica, no una certificación funcional/comercial.
- **Neon, lectura de metadatos:** proyecto `micro-app-db`, plan `free_v3`, PostgreSQL 18, región `aws-us-east-1`; periodo de consumo mostrado 2026-10-17 a 2026-11-01. Tamaño lógico de main: 32,866,304 bytes (~31.34 MiB). Consumo del periodo: 5,645,769 bytes transferencia; 5,911 segundos compute; 23,240 segundos activo; 0 bytes escritos reportados. Ramas: 3/10; main 32.87 MB, restore-test ~33.57 MB, integrity-test ~31.69 MB. Son metadatos/contadores del proveedor, no benchmark ni capacidad SaaS.
- **Seguridad Neon:** metadatos actuales muestran `main.protected=false`, `allowed_ips.ips=[]`, `protected_branches_only=false`, `block_public_connections=false`; ramas listadas sin protección. No cambiar estos ajustes sin evaluación/plan y autorización correspondiente. No se leyó SQL, secretos, roles ni datos.
- **Protocolo README:** PR #159 ya cambió toolchain de forma concreta y verificada; README debe reflejar Node/pnpm exactos. Este checkpoint actualiza el README y continuidad para no dejar instrucciones contradictorias.
- **Guardrails vigentes:** no SQL ni cambios en Neon main; no secretos, datos reales, billing, DNS ni ajustes Cloudflare; no merge/deploy de producción sin aceptación explícita. Objetivo $0. No depender de Codex.
- **Siguiente prioridad:** cerrar lectura documental de arquitectura/API/esquema e inventariar brechas P0; revisar rama `feat/neon-transaction-adapter` con diff completo antes de rescatar nada; después diseñar tenant/branch authorization y rate limiting antes de endpoints comerciales. No prometer número de organizaciones hasta pruebas sintéticas.
- **Nota histórica:** los bloques inferiores que digan #158/#159 “abiertas”, “draft” o “no mergeadas” son históricos y quedan supersedidos por este estado vivo y por GitHub.

---

# Checkpoint continuidad — 2026-10-30 UTC (Node/pnpm corregidos en PR #159)

- **PR #158** (documentación Cloudflare/CI): https://github.com/BTF14/Micro-app/pull/158. Rama docs/workflow-deployment-audit-20261030; abierta, draft, no mergeada. HEAD conocido antes de este checkpoint: 162765fac25bf3aa623a41676d56e570afabd7fd; 12/12 checks success.
- **PR #159** (pinning de toolchain): https://github.com/BTF14/Micro-app/pull/159. Rama fix/cloudflare-node-pnpm-pinning-20261030; abierta, draft, no mergeada. HEAD 57de704c03fffebfd9aee2ae91c05a0e3af7515a; 13/13 checks success.
- PR #159 añade .node-version = 24.22.2, packageManager = pnpm@10.34.9 y alinea node-version-file/pnpm exactos en CI, Playwright, AutoSkills preview, Daily Dependency Watch y Regenerate Lockfile.
- Cloudflare Pages build log del SHA 57de704 confirmó Node 24.22.2 + pnpm 10.34.9, build exitoso, sin Unsupported Engine warning; preview https://70046713.micro-app-63i.pages.dev. No se fusionó ni se desplegó producción.
- Mantener PRs separadas: #158 solo docs; #159 solo toolchain/workflows. No fusionar ninguna sin autorización explícita porque push/merge a main activa despliegues externos.
- No cambiar Cloudflare settings, Neon main, secretos, DNS, billing, datos reales ni producción. Objetivo USD 0. Sin Codex.

---

# Checkpoint final — 2026-10-30 UTC (PR #158 HEAD 5b1b573)

- **PR #158:** abierta, draft, no fusionada; base main = 1ee1808af4aae484a71dc24750237ff4f4d934a0.
- **HEAD actual:** 5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766; cinco archivos de documentación, cinco commits, sin cambios de aplicación/workflows/migraciones.
- **Checks del SHA exacto:** 12/12 success (GitHub Actions y Cloudflare). Cloudflare Pages preview: https://d8477e48.micro-app-63i.pages.dev. Workers preview: https://2935f95a-micro-app-api.btfcasheb.workers.dev. Son previews, no producción.
- **Pages Settings:** main producción; root vacío; build corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build; output apps/web/dist; build system v3; cache off; monitoring *; preview público por defecto; sin dominio custom. Detalles completos en docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- **Preview isolation:** verificado en código main: API base vacía, llamadas API bloqueadas, login deshabilitado, CSP sin API en previews; _headers define CSP/seguridad para producción. Mantener pruebas de regresión.
- **Pendientes:** revisar build logs para versión efectiva Node/pnpm; evaluar pin pnpm, build cache y semántica “Fail open” sin cambiar ahora; verificar headers HTTP efectivos; revisar cuota Pages; confirmar required checks/branch protection (no confirmado).
- **Guardrails:** no merge/deploy sin permiso explícito; no tocar Cloudflare settings, Neon main, secretos, datos reales, billing ni DNS. Objetivo USD 0. No Codex.

---

## Checkpoint Pages Settings — 2026-10-30 UTC

- TinyFish accedió a Settings de Pages `micro-app`, solo lectura. Production branch `main`; root directory vacío; build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; output `apps/web/dist`; build system v3; cache off; monitoring routes `*`; automatic deploys on; no deploy hooks; build comments on; preview access public by default; no custom domains; vars names only: `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL`.
- Compatibility date `2026-10-17`; flags panel mostró True; Functions setting mostró `Fail open` (no interpretar/cambiar sin confirmar).
- Repo main confirma monorepo pnpm `apps/*`; root package requiere Node `>=24.22.2 <25` pero no fija `packageManager`. Pendiente verificar Node/pnpm efectivos en build logs; evaluar pinning en PR separada.
- Build command compila web vía `apps/web/package.json` script `tsc -b && vite build && node scripts/postbuild.mjs`; API se valida en workflows separados.
- `apps/web/public/_headers` existe: nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP. CSP prod permite API Worker. Postbuild quita Worker de CSP en preview; Vite deja API base vacía y activa preview flag; auth.ts bloquea API y App.tsx deshabilita login y muestra aviso. Preview público por defecto, pero aislamiento API está implementado en main auditada. Mantener tests de regresión.
- `_redirects` no existe en `apps/web/public/`; UI no mostró configuración de redirects/headers.
- Cache deshabilitado puede consumir más build time; medir antes de cambiar. Pages usage/billing no consultados.
- Sin cambios en configuración/infra/secretos/builds/producción. PR #158 sigue draft y no fusionada.

# Continuidad prioritaria — 2026-10-30 UTC (Pages audit completada)

> Este bloque prevalece sobre notas inferiores. Continuar en la misma PR #158 y no crear otra PR para esta documentación.

- **PR #158:** https://github.com/BTF14/Micro-app/pull/158; abierta, draft, no mergeada. Rama `docs/workflow-deployment-audit-20261030`.
- **GitHub Actions:** corregida la clasificación anterior. Solo `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro) presentan duplicación general potencial con PR. Los otros workflows tienen filtros de rama/path o dispatch/schedule. No cambiar triggers hasta verificar contexts requeridos.
- **Cloudflare Workers:** Workers Free $0; cuotas observadas 100k requests/día, 10ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 cron triggers. Worker `micro-app-api`: main identificada como producción; docs branches como previews. PR #158 tiene previews de Worker exitosas.
- **Cloudflare Pages:** proyecto `micro-app`, repo `BTF14/Micro-app`, producción branch `main`; push a main dispara producción. Último deploy productivo observado activo para commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, timestamp `2026-10-30T01:30:08.9457Z`, URL de deployment `https://06553c7b.micro-app-63i.pages.dev`. Proyecto base `https://micro-app-63i.pages.dev`.
- **Previews Pages:** cada commit en ramas no productivas crea preview. PR #158 commit `79be208` preview successful en `https://945ae93c.micro-app-63i.pages.dev`; commit `d3f056b` preview successful en `https://70fea194.micro-app-63i.pages.dev`. Vista mostró 15 despliegues recientes (1 prod + 14 previews), 1.100 en historial; 15 visibles successful. No equivale a validar toda la historia.
- **Pendiente Pages:** Settings no cargó; build command, output dir, root dir, framework, build env, Functions, redirects, headers y uso/cuotas account-level no disponibles. No inventar.
- **Custom domain:** no se vio; solo pages.dev.
- **CI/CD:** Pages confirma auto-deploy main + previews non-main. Un merge a main puede desplegar frontend a producción aunque no haya workflow Pages deploy en GitHub. No fusionar sin autorización explícita.
- **Branch protection:** rulesets API vacío y endpoint legacy 403; estado real no confirmado.
- **Guardrails:** no Codex, no Neon main/SQL, no secretos/datos reales, no pagos, no modificar Cloudflare/DNS/tráfico, no merge/deploy sin permiso explícito. Coste objetivo USD 0; capacidad SaaS sin medir.

## Siguiente trabajo
1. Revisar Settings de Pages en solo lectura para completar root/build/output/runtime/Functions/redirects/headers.
2. Verificar los checks requeridos de GitHub por método accesible; no inferir protección ausente por 403.
3. Evaluar una reducción focalizada de los triggers push amplios, sin implementarla hasta saber los contexts requeridos.
4. Revisar diff y checks de PR #158 en su SHA exacto. Mantenerla draft y sin merge.
5. Continuar arquitectura multi-tenant y capacidad con pruebas sintéticas aisladas.

---

# Continuidad prioritaria — 2026-10-30 UTC (auditoría Cloudflare + corrección CI/CD)

> Este checkpoint prevalece sobre las notas anteriores de la auditoría de workflows. Verificar GitHub en vivo antes de cualquier operación.

- **Repositorio:** `BTF14/Micro-app`; PR de trabajo [#158](https://github.com/BTF14/Micro-app/pull/158), abierta y draft; no fusionada.
- **PR #158 HEAD observado antes de esta actualización:** `d3f056b780ddad62deb5c1e1c0f1679bba19bb50`; base `main` = `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- **Corrección crítica de auditoría:** la afirmación previa de siete workflows push+PR sin filtros fue incorrecta. La inspección directa de los 15 YAML muestra que solo `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro) tienen duplicación potencial general con PR. CI y Playwright limitan push a main; migration y project-progress usan listas explícitas de ramas; Semgrep limita a main; SDD, AutoSkills, Dependency Review, Daily Dependency Watch y Backup Restore Smoke tienen filtros de paths/branch según el detalle en [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No cambiar triggers todavía.
- **Cloudflare:** acceso al panel confirmado con TinyFish, inspección de solo lectura. Plan Workers Free ($0/mes); cuota observada 100.000 requests/día, 10 ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 Cron Triggers. Snapshot del panel: 183 requests, 0 errores y 106,68 build minutes en las últimas 24h; la vista del Worker también reportó 85 invocaciones y CPU P90 10 ms. Son métricas observadas, no benchmark ni capacidad garantizada.
- **Worker:** `micro-app-api` en `workers.dev`, conectado a `BTF14/Micro-app`. `main` figura como producción; ramas `docs/...` como previews. PR #158 obtuvo comentario automático Cloudflare Workers con preview deployment successful para commit `d3f056b7`, URLs distintas de commit y branch preview. No es producción.
- **Pages:** proyecto `micro-app`, `https://micro-app-63i.pages.dev/`, conectado al mismo repo. PR #158 obtuvo comentario automático Pages preview successful para `d3f056b`. Historial detallado de versiones/producción y consumo Pages no pudo extraerse.
- **Observabilidad:** Logs y Traces aparecían desactivados en la vista de Worker. Evaluar sin registrar secretos, cookies, tokens o datos personales.
- **Pendiente:** verificar Pages production branch/build settings/uso; confirmar uso real y alertas Workers/Pages; decidir si limitar pushes de secret-history/security tras revisar contexts obligatorios.
- **Protección GitHub:** rulesets API devolvió lista vacía; branch-protection endpoint legacy 403 por permisos. Estado real de protección/contextos requeridos NO CONFIRMADO.
- **Producción NO lista:** API aún carece de endpoints comerciales y autorización por operación/sucursal; capacidad multi-tenant no medida.
- **Guardrails:** no Codex; no Neon main/SQL remoto; no secretos; no datos reales; no pagos/upgrade; no cambios de Cloudflare/DNS/tráfico; no merge ni deploy sin autorización explícita específica. Objetivo USD 0.

## Próximas acciones
1. Completar revisión read-only de Pages y sus settings/versiones/consumo.
2. Confirmar contexts de checks y evaluar una única optimización CI dirigida a los dos workflows con push amplio.
3. Actualizar documentación/handoff y revisar PR #158 diff/checks del SHA exacto.
4. Continuar arquitectura multi-tenant y pruebas sintéticas aisladas; no habilitar operaciones comerciales antes de aprobar matriz de permisos y modelo branch/warehouse/register/shift.

---

# Continuidad prioritaria — 2026-10-30 UTC (post PR #157)

> Este checkpoint sustituye los estados inferiores que todavía describen PR #157 como abierta o main en el SHA anterior. Verificar GitHub en vivo antes de cualquier operación.

- **Main verificado:** `1ee1808af4aae484a71dc24750237ff4f4d934a0`, merge squash de [PR #157](https://github.com/BTF14/Micro-app/pull/157). PR #157 está cerrada y fusionada; su HEAD fue `6eb464c950f195ec67350977575aef77e9790e1d`.
- **Checks de PR #157:** el conector devolvió ocho workflow runs para el HEAD exacto y todos terminaron `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Secret history scan, Project progress dashboard y Dependency review. La consulta es de primera página. El combined status devolvió vacío y no se recuperó evidencia post-merge para el merge SHA; no afirmar CI post-merge.
- **PRs abiertas:** [PR #158](https://github.com/BTF14/Micro-app/pull/158), documental y en borrador. Antes de abrirla no había otras PRs abiertas.
- **Workflows/deploy:** auditoría de los 15 YAML en [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No hay workflow de GitHub Actions que despliegue Pages o Workers. Los builds de Cloudflare observados anteriormente apuntan a integración Git externa; su configuración efectiva no es visible desde el repo.
- **Riesgo de merge:** un push a `main` puede activar el despliegue externo de Cloudflare. No fusionar cambios —aunque sean solo documentación— sin autorización explícita de producción y sin conocer la configuración de esa integración.
- **Duplicación CI:** siete workflows escuchan a la vez `push` y `pull_request` sin filtros de branch/path; `sdd-docs-validation` sí limita `main` y paths; commits a ramas con PR pueden duplicar ejecuciones. No cambiar todavía: primero revisar branch protection/rulesets y contexts requeridos.
- **Estado de producto:** producción NO lista; API solo auth/health; sin rutas comerciales HTTP; tenant helper sin enforcement de permisos por operación ni branch scope; matriz de roles no aprobada; capacidad multi-tenant no medida.
- **Guardrails:** no Codex, no Neon `main`, no secretos, no datos reales, no despliegue, no planes pagos; coste objetivo USD 0.

## Próximas acciones prioritarias

1. Obtener auditoría de solo lectura de branch protection/rulesets y confirmar contexts requeridos antes de optimizar workflows.
2. Solicitar/usar acceso de solo lectura al panel Cloudflare para confirmar ramas Git conectadas, build settings, deployments y cuotas; no modificar configuración.
3. Diseñar la reducción de workflows duplicados preservando todos los checks obligatorios.
4. Continuar el inventario de queries/callers y ERD org → branch → warehouse/register/shift; no migrar ni crear endpoints comerciales hasta aprobar matriz y diseño.
5. Mantener documentación y README sincronizados con hechos comprobados.

---

# Continuidad viva — 2026-10-30 UTC

> Este bloque prevalece sobre los snapshots históricos inferiores. Verificar GitHub y el SHA vivo antes de actuar.

- **Repositorio:** `BTF14/Micro-app`; rama principal protegida: `main`.
- **Main actual verificado:** `18961456ac535146c4a1687d3b07d8f6693ce141` — merge squash de [PR #156](https://github.com/BTF14/Micro-app/pull/156). GitHub confirmó `merged=true`; commit firmado/verificado por GitHub.
- **PR #156:** fusionada. Su HEAD exacto `6c068f3e9734736ac26e51ff754e39915d660abe` tuvo 9/9 workflows de GitHub Actions en `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Secret history scan, SDD/documentation validation, Project progress dashboard y Dependency review. No se obtuvo evidencia separada de una nueva ejecución post-merge para el merge commit; no afirmar que existió. No hubo reviews formales ni threads en la PR; se aplicó revisión manual del diff completo como fallback por indisponibilidad de Codex.
- **PRs abiertas al checkpoint:** ninguna según consulta en vivo inmediatamente después del merge. Repetir antes de crear o fusionar otra.
- **Alcance de PR #156:** reconciliación documental SaaS, identidad, capacidad, plan y handoff; corrección de la matriz para dejar claro que cajero/inventario necesitan asignaciones por sucursal y caja/turno. No cambió código de aplicación, esquema, migraciones, workflows, secretos ni infraestructura.
- **Identidad:** Google OAuth + allowlist/bootstrap de un solo uso, state/PKCE, sesión HttpOnly revocable y validación Google `email_verified` están implementados según PR #153/#155. Registro y login por contraseña están fail-closed. MFA, recuperación, enlace de cuentas preexistentes, limpieza automática de sesiones/rate limits y ciclo administrativo completo siguen pendientes.
- **Control de abuso:** no se encontró rate limiting a nivel de aplicación en los módulos API; `auth_rate_limits` existe en SQL pero no tiene callers runtime. No afirmar que OAuth/bootstrap estén limitados por tasa. Verificar reglas Cloudflare por separado y diseñar protección distribuida compatible con Workers.
- **Inventario de rutas API verificado en `apps/api/src/index.ts`, `auth.ts`, `google-auth.ts`:** `GET /health`; `POST /auth/register` (deshabilitado); `POST /auth/login` (deshabilitado); `GET /auth/me`; `POST /auth/logout`; `GET /auth/google`; `POST /auth/google` (bootstrap); `GET /auth/google/callback`. No hay handlers HTTP comerciales para productos, proveedores, catálogo, compras/recepciones, inventario, ventas, pagos, devoluciones, caja o reportes.
- **Contexto tenant:** `resolveTenantContext` valida token/sesión, usuario, organización y membresía activos y devuelve user/org/role. La búsqueda de callsites no encontró llamadas desde handlers: el helper no está conectado actualmente a rutas HTTP. No aplica permisos por operación ni branch scope. El selector de organización es una solicitud validada, no autorización por sí mismo.
- **Transacciones:** `withDatabaseTransaction` existe y se usa en el bootstrap Google de un solo uso para bloquear el sentinel. No hay endpoints comerciales que lo utilicen; el helper todavía no demuestra atomicidad de ventas/inventario.
- **Esquema:** `0001_initial.sql` define organizaciones/membresías y entidades comerciales con varias FKs compuestas tenant-scoped, pero no sucursales, almacenes, cajas/turnos, compras/recepciones, devoluciones ni transferencias. `products.stock_quantity` es por organización. La migración inicial `0001_initial.sql` declara expresamente que no se ha aplicado a Neon `main`. El estado histórico del repositorio registra que `0002_google_identity.sql` sí se aplicó a Neon `main` el 2026-10-25; no se revalidó ese estado remoto en esta sesión. No ejecutar nuevas migraciones allí.
- **Hallazgos de integridad para resolver antes de handlers comerciales:** SQL no garantiza que una venta completada tenga líneas/pagos que reconcilien el total; el saldo de producto y el ledger de movimientos pueden divergir si la API no actualiza ambos atómicamente; referencias polimórficas de movimientos no tienen FK a una entidad de negocio; el esquema no impone idempotencia de pagos ni el último owner activo. Son brechas de diseño/contrato, no incidentes de datos observados.
- **Optimización Neon:** `withDatabaseClient` crea un `Client` request-scoped y el helper transaccional usa BEGIN/COMMIT/ROLLBACK. Evaluar `neon()` HTTP para lecturas simples solo con benchmark; conservar cliente interactivo para operaciones atómicas.
- **Arquitectura objetivo:** SaaS multi-organización, multi-sucursal y multiusuario. Es dirección documentada, no funcionalidad completa. La matriz de permisos sigue **NO aprobada**; no implementar permisos comerciales desde recomendaciones no aprobadas. La autoridad para administrar la allowlist global debe ser un operador de plataforma separado de los roles `owner/admin` de cada organización; identidad, recuperación y delegación aún no están aprobadas.
- **Capacidad:** número de organizaciones, sucursales y usuarios concurrentes sostenible **sin medir**. Revisar Neon y Cloudflare y ejecutar carga sintética antes de prometer límites. Presupuesto objetivo USD 0.
- **Producción:** **NO LISTA**. No desplegar, tocar secretos, datos reales ni Neon `main`; no activar planes o servicios pagos.
- **Continuidad:** la actualización de auditoría/documentación está en [PR #157](https://github.com/BTF14/Micro-app/pull/157), rama `docs/post-pr156-audit-continuity-20261030`. Sigue abierta; no fusionar hasta que todos los checks requeridos del HEAD exacto terminen en success y el diff final se revise manualmente.

## Próximas acciones obligatorias

1. Completar el inventario de consultas SQL y callers de autenticación/tenant; registrar rutas, validaciones, queries y pruebas.
2. Completar ERD organización → sucursal → almacén/caja/turno → operaciones, con propiedad y claves compuestas; mantenerlo en diseño hasta cerrar decisiones.
3. Resolver la matriz de permisos con decisiones explícitas del propietario sobre excepciones, descuentos, anulaciones, inventario, exportaciones y delegación.
4. Diseñar restricciones y transacciones para venta/pagos/stock/ledger, idempotencia, concurrencia, referencias y auditoría.
5. Crear pruebas PostgreSQL efímeras cross-tenant/cross-branch y de rollback/concurrencia antes de habilitar endpoints comerciales.
6. **Rama histórica revisada:** `feat/neon-transaction-adapter` corresponde a la PR [#1](https://github.com/BTF14/Micro-app/pull/1), ya fusionada el 2026-10-17 (merge `b6511d0876e33096f75df2466653449165888821`). La rama está 14 commits ahead y 242 behind respecto a main actual; no reabrir ni fusionar su diff antiguo. La implementación vigente está en main y se revisa desde sus callers actuales.
7. Medir límites vivos de Neon/Cloudflare y carga sintética; no fijar capacidad SaaS antes de ello.
8. Mantener README, CURRENT_STATE, PROJECT_PLAN, STATE_JOURNAL y HANDOFF sincronizados tras cada hito verificado.

---

# Continuidad viva — 2026-10-30

> Prioridad de estado para esta sesión; las notas históricas inferiores deben contrastarse con GitHub en vivo.

- PR [#156](https://github.com/BTF14/Micro-app/pull/156), rama `docs/reconcile-main-after-pr155-20261029`, base `main`. La punta de rama se consulta en GitHub; no reutilizar SHA históricos.
- Reconciliación documental realizada: README, AGENTS, política de colaboración, Constitución y SCHEMA_REVIEW. README ya refleja el estado verificado de Google OAuth/allowlist (PR #153/#155) y diferencia claramente el objetivo SaaS de lo implementado.
- Autenticación: Google OAuth, allowlist/bootstrap protegido, state/PKCE, sesión HttpOnly revocable y validación de `email_verified` implementados. Password login/registro siguen fail-closed. MFA, recuperación de cuenta/administrativa y limpieza automática de sesiones siguen pendientes.
- API: autenticación y `GET /health`; no endpoints comerciales HTTP de catálogo, inventario, compras, ventas, pagos o devoluciones. No hay esquema de sucursales/almacenes/cajas/turnos implementado.
- SaaS multi-organización/multi-sucursal es arquitectura documentada, no funcionalidad completa. Capacidad de tenants sin medir; revisar Neon y Cloudflare y ejecutar pruebas sintéticas antes de fijar cuotas.
- Regla permanente añadida: README se actualiza tras cada avance concreto y verificado, sin anunciar funciones incompletas o propuestas.
- Cambios de esta revisión solo documentales. No se modificaron código, esquema, migraciones, workflows, secretos, Neon, datos reales ni producción. Producción NO lista; presupuesto objetivo USD 0.
- Los workflows deben comprobarse para el HEAD exacto más reciente. La revisión independiente solicitada sigue siendo requisito; no fusionar sin ella.

## Siguiente acción
1. Verificar SHA vivo, diff completo, reviews/threads y workflows de PR #156.
2. Revisar cada afirmación del README contra código y API_INTEGRATION.
3. Mantener PR abierta para revisión independiente.
4. Continuar auditoría read-only de esquema, rutas, constraints, índices y diseño org-sucursal-almacén-caja; no implementar permisos comerciales antes de aprobar la matriz.

---

# Continuidad viva — 2026-10-29

> Esta sección es la fotografía prioritaria de continuidad de esta sesión. Las notas históricas debajo se conservan, pero no deben tratarse como estado actual si contradicen esta sección. Verificar GitHub otra vez antes de cualquier operación.

- Repositorio: `BTF14/Micro-app`; rama base `main`.
- PR documental activa: [#156](https://github.com/BTF14/Micro-app/pull/156), abierta y mergeable según última consulta; base SHA `5a9bdc5a18a54c3c68639f52125d913d4e725b91`. El HEAD cambia con cada commit documental: consultar el SHA vivo en GitHub antes de actuar; no copiar un SHA histórico de este archivo. La PR contiene 9 archivos modificados. No hay reviews ni review threads. En la última consulta del HEAD `a5aced77ffd1a628bb8175b91cbc7305144fb696`, se observaron 8 workflows: 1 success, 4 in_progress/pending y 3 queued; revisar el HEAD posterior y esperar sus resultados.
- PR #156 incluye `docs/SAAS_ARCHITECTURE_DECISIONS.md` y actualizaciones de CURRENT_STATE, HANDOFF, PROJECT_PLAN, STATE_JOURNAL, ARCHITECTURE_EVOLUTION_PLAN, PRICING_CACHE_ARCHITECTURE y matriz de roles. Se reutiliza; no abrir PR documental solapada.
- PR #155 está fusionada en main (merge `5a9bdc5a18a54c3c68639f52125d913d4e725b91`). La descripción de PR #156 confirma este SHA como base.
- Arquitectura recomendada: plataforma SaaS multi-organización, multi-sucursal y multiusuario; catálogo compartido por organización, existencias por sucursal/almacén, caja/turno por sucursal, usuarios multi-organización y roles con alcance. Ver `docs/SAAS_ARCHITECTURE_DECISIONS.md`.
- BCV: Cron Trigger + validación + histórico `exchange_rates` + última tasa válida con frescura visible. Fuente oficial/gratuita aún no confirmada; no inventar endpoint ni tasa.
- Buscador: barcode/SKU exactos antes que nombre; debounce, índices, límites, tenant scoping y medición. Neon fuente de verdad; KV de catálogo solo si benchmark lo justifica. La caché nunca confirma ventas ni stock.
- Modelo de sucursales/almacenes/cajas aún no implementado; stock actual por organización. No crear migraciones hasta cerrar ERD, reglas de alcance y matriz de permisos.
- Roles base recomendados: owner/admin/cashier/inventory; matriz existente sigue siendo propuesta y requiere reconciliar alcance por sucursal. Umbrales de descuento/anulación requieren decisión explícita.
- Capacidad de tenants no medida. Neon y Cloudflare tienen límites; medir sintéticamente antes de fijar planes/cuotas o prometer número de empresas.
- Producción: **NO lista**. No desplegar producción, no tocar secretos, datos reales ni Neon `main`; no incurrir en costes. Presupuesto objetivo $0.
- Backup: restauración técnica del backup remoto se verificó en run 40955935124; siguen pendientes integridad de datos comerciales representativos, RPO/RTO, alertas/retención y coste total.

- **Verificación de CI más reciente completa:** HEAD `8c15e13fa001a14a0ddf9f2432bc17efb30d476d` tuvo los 8 workflows requeridos en `success`, incluidos los seis contexts de protección (`verify`, `postgres-migration`, Chromium authentication smoke tests, JavaScript/TypeScript static analysis, Trivy y secret-history scan), además de Dependency Review y dashboard. Runs: 40978525543, 40978521649, 40978521865, 40978521671, 40978521571, 40978521386, 40978521350 y 40978521537. Después se añadieron dos commits documentales hasta `23cbb313ebb163d3c808f8d0953b85645262c520`; no se devolvieron runs/statuses para ese HEAD. Por tanto, **no declarar verde el HEAD actual** ni fusionar hasta verificarlo.

## Próximas acciones obligatorias

1. Verificar el nuevo HEAD de PR #156, diff, workflows y revisión independiente. No fusionar sin satisfacer la política y la revisión adicional solicitada.
2. Completar auditoría read-only del esquema real, handlers, constraints, índices, queries y rutas; registrar hallazgos con archivos/SHA.
3. Finalizar ERD organización → sucursal → almacén/caja/turno → operaciones, propiedad y claves tenant/branch-scoped.
4. Reconciliar `docs/sdd/role-permission-decision-matrix.md` con asignaciones por sucursal/caja; separar propuesta de decisiones que requieren al propietario.
5. Diseñar contratos API, transacciones, idempotencia, concurrencia y pruebas cross-tenant/cross-branch antes de implementar endpoints comerciales.
6. Investigar fuente BCV fiable y condiciones de acceso; diseñar job programado y fallback stale; no scrapear fuente frágil sin validar.
7. Medir Neon y Cloudflare con carga sintética y comprobar cuotas vigentes; no fijar límites SaaS todavía.
8. Mantener estado, diario y handoff actualizados al completar cada bloque.

## Estado vivo — hardening HTTPS de FRONTEND_ORIGIN en preparación (2026-10-29 UTC)

- Base verificada: `main` = `0ba45e47daa5af9bbd9034690443405aa8bedf44`; PR #154 sigue abierta, sin reviews registradas. Sus 8 workflows consultados para `b4508fda6f4d5f042dbeb2b48c7c9910a8c3852d` terminaron en `success`, pero falta la revisión adicional solicitada; no fusionar por ahora.
- Hallazgo confirmado: `apps/api/src/google-auth.ts` validaba la forma/origen de `FRONTEND_ORIGIN` pero no restringía HTTP a localhost, a diferencia de `apps/api/src/index.ts`. No hay evidencia de explotación; es una inconsistencia de configuración.
- Rama de corrección: `fix/google-auth-frontend-origin-https-20261029`. La propuesta alinea el validador de Google OAuth con la regla global: HTTPS, o HTTP solo para localhost/127.0.0.1/[::1], sin credenciales, path, query ni hash.
- Se añade prueba unitaria de regresión para origen HTTPS, loopback HTTP y entradas no válidas. En SHA `18cf2f158552ce7c97bacc66018e0cfdae60e2d3`, los 8 workflows consultados (CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Dependency review, Secret history scan y dashboard) terminaron `success`. CI incluyó build/typecheck, unit tests y PostgreSQL auth integration tests. El cambio sigue en PR #155, no fusionado.
- No se modifica bootstrap POST/GET, OAuth state/PKCE, esquema ni migraciones. No se accede/modifica Neon, secretos, datos reales ni producción. Cloudflare previews automáticos no equivalen a despliegue productivo.
- Arquitectura comercial sigue bloqueada para implementación: no hay rutas HTTP de productos/inventario/ventas; el stock existente es por organización, no sucursal; matriz de permisos sigue sin aprobación. Primero cerrar diseño organización → sucursal → membresía/rol y aprobación del propietario.
- Capacidad demostrada de empresas/sucursales sigue sin determinar; respetar `docs/CAPACITY_AND_LIMITS.md` y presupuesto $0.

---

## ESTADO VIVO PRIORITARIO — PR #152 fusionada; corrección de bootstrap en revisión (2026-10-29 UTC)

- **PR #152 fusionada:** merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`; el HEAD de PR fue `e16b577d8454b3f2109a857386516a41fdd0a271`. Los 13 checks de ese HEAD pasaron; los nueve checks post-merge del merge commit también terminaron en `success`.
- **Siguiente corrección P1 en rama** `fix/bootstrap-token-post-body-20261029`: eliminar el transporte de `bootstrap_token` por query string, aceptar bootstrap solo por POST con cuerpo `application/x-www-form-urlencoded`, validar Origin exacto, limitar tamaño/forma del cuerpo y comprobar el token antes de redirigir a Google. Se añaden pruebas de regresión para URL, origen y parámetros ambiguos.
- **Estado de la corrección:** rama de trabajo no fusionada; no declarar mitigado hasta que los checks del SHA final pasen y el cambio se revise. El bootstrap sigue siendo de un solo uso en la base mediante la transacción existente.
- **Límites preservados:** no se desplegó producción, no se tocaron secretos ni Neon `main`, no se ejecutó SQL ni se borraron ramas/backups. La PR #152 solo actualizó documentación y no cambió la aplicación.
- **Después de la corrección:** continuar auditoría multiempresa y decisión de sucursales/roles; no implementar módulos comerciales antes de aprobar la matriz de permisos. La capacidad de organizaciones/sucursales sigue sin medir.

---

## ESTADO OPERATIVO VIGENTE — restauración del backup remoto verificada (2026-10-29 UTC)

- [Run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124) del workflow `.github/workflows/backup-real-restore.yml` terminó en `success`.
- Se descargó `daily/backup-2026-10-29T17-29-48Z.dump.age`; el SHA-256 del objeto remoto coincidió con su sidecar (`OK`), `age` lo descifró y PostgreSQL 18 efímero lo restauró sin error. `pg_restore --list` leyó el archivo y la validación encontró tablas base en `public`. Se limpiaron los archivos descifrados temporales.
- **Conclusión:** verificada la restauración técnica de la copia remota exacta. No se tocó Neon `main` ni producción.
- **Límite:** no se verificaron conteos ni relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo o coste total $0. La comprobación de esquema por sí sola no garantiza que los datos comerciales estén completos.
- **Siguiente paso:** planear una comprobación segura de conteos/relaciones mediante datos sintéticos o metadatos no sensibles; medir RPO/RTO; revisar alerta, retención y coste. No imprimir datos comerciales ni solicitar la clave privada age por chat.

---

## ESTADO VIVO PRIORITARIO — PR #151 fusionada y auditoría multiempresa iniciada (2026-10-29 UTC)

- **Base de código auditada:** `70984baf7f6ac5a442e6c2364aaf6d7d4ebbc7d4`, merge squash de la PR [#151](https://github.com/BTF14/Micro-app/pull/151); los cambios de esta rama son solo documentación. La PR añadió guardrails de capacidad y referencias de límites de Neon/Cloudflare; sus checks del SHA de cabeza terminaron en éxito antes de fusionar.
- **PR abiertas:** ninguna en la consulta posterior a la fusión; repetir consulta en vivo antes de abrir o fusionar trabajo nuevo.
- **Capacidad:** organizaciones/sucursales/usuarios concurrentes siguen **sin medir**. La API Neon de solo lectura informa plan `free_v3`, límite de 10 ramas y 3 ramas existentes (`main`, `micro-app-integrity-test`, `restore-test-20261028`); tamaño lógico de rama 512 MiB y autoscaling predeterminado 0.25 CU. No se eliminó ninguna rama. El detalle/fecha está en `docs/CAPACITY_AND_LIMITS.md`. Las cuotas documentadas no demuestran capacidad sostenible de la aplicación ni verifican el consumo/plan real de Cloudflare.
- **Arquitectura comprobada en `main`:** API Hono registra rutas de autenticación y `GET /health`; no hay aún handlers comerciales HTTP para productos, proveedores, ventas, pagos o inventario. `resolveTenantContext` valida sesión/membresía/organización, pero no constituye por sí solo autorización por operación.
- **Sucursales:** no se encontró entidad/tabla de sucursal en `apps/api/migrations/0001_initial.sql` ni una relación de sucursal en el esquema inicial revisado. No crear migración hasta decidir el alcance de sucursal, pertenencia de usuarios, permisos y propiedad de datos.
- **Hallazgo de seguridad preliminar:** `apps/api/src/google-auth.ts` acepta `bootstrap_token` en la query string de `/auth/google` y luego lo copia a una cookie HttpOnly. No hay evidencia de filtración activa, pero la URL puede quedar en historial/registros; revisar un flujo que no transporte secretos en URL antes de habilitar bootstrap con usuarios reales. El análisis está documentado en `docs/ARCHITECTURE_EVOLUTION_PLAN.md`; no se modificó código.
- **Producción:** **NO lista**. Siguen pendientes flujos comerciales reales, autorización por operación y pruebas cross-tenant, matriz de roles aprobada, integridad/idempotencia/concurrencia, tasa BCV/fiscalidad y validación operativa completa de backup.
- **Siguiente paso:** cerrar la reconciliación de documentos de estado; después completar la auditoría de solo lectura de esquema, permisos y consultas y preparar un contrato explícito de organización → sucursal → membresía/rol antes de implementar rutas comerciales. No tocar Neon `main`, secretos ni producción.

> Los snapshots históricos que aparecen más abajo se conservan como historial; si contradicen este estado prioritario, no deben tratarse como estado vivo sin una verificación nueva de GitHub/código.

---

## ESTADO OPERATIVO VIGENTE — respaldo cifrado (2026-10-29 UTC)

> Esta sección prevalece sobre notas históricas inferiores que todavía digan que el incidente de subida está pendiente. No borrar el historial: interpretar cada incidente según la evidencia posterior.

- **Subida del backup: VERIFICADA.** Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) terminó en success: `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, commit remoto `2b038bd`, push a la rama `main` del repositorio privado de backups y retención `deleted 0 file(s)`.
- **Par cifrado persistido según logs:** `daily/backup-2026-10-29T17-29-48Z.dump.age` y `.sha256`.
- **Restauración técnica real: VERIFICADA** en run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124), tras checksum, descifrado y restauración en PostgreSQL 18 efímero. La prueba sintética automatizada es complementaria.
- Siguen pendientes la validación de datos comerciales poblados/conteos/relaciones, medición de RPO/RTO, alerta de fallo y evidencia del coste total $0.
- PR [#148](https://github.com/BTF14/Micro-app/pull/148) quedó fusionada el 2026-10-29; merge commit `0681aea75b555d5eb0b60dfec26c2706207fae45`. No está abierta y no debe reabrirse para este trabajo.
- **Plan de arquitectura:** [docs/ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md). La auditoría comienza después de cerrar la restauración real del backup; primero lectura y diagnóstico, sin migraciones ni cambios productivos.
- Límites vigentes: no desplegar producción, no acceder a Neon `main`, no pedir ni imprimir claves privadas age, no borrar backups/recursos, y no declarar coste $0 sin evidencia.

---

## ESTADO VIVO PRIORITARIO — tras fusionar PR #137 (2026-10-29 UTC)

**Repositorio único:** https://github.com/BTF14/Micro-app  
**Main verificado:** `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5` — merge de [PR #137](https://github.com/BTF14/Micro-app/pull/137). En la última búsqueda, no había PR abiertas; repetir la consulta antes de operar.  
**Autorización del propietario:** temporalmente autoriza a la IA a investigar, implementar, verificar y fusionar PRs con criterio. Calidad/seguridad por encima de rapidez. No inundar el repo de PRs ni dejar ramas/PRs de prueba olvidadas.

### Lo que realmente se hizo y lo que no

- PR #137 se fusionó. Añadió auditoría de versiones estables, plan de actualización, y `.github/workflows/daily-dependency-watch.yml`.
- **No se actualizaron dependencias en PR #137.** La actualización de paquetes sigue pendiente; no describir los majors propuestos como instalados.
- El monitor diario está en `main`, programado a las 08:15 UTC (04:15 Venezuela), con `workflow_dispatch`, permisos `contents: read`, `pnpm install --frozen-lockfile`, `pnpm outdated -r`, comprobación del último parche Node 24 LTS y `pnpm audit --audit-level high`. Es de solo lectura y no abre PR ni modifica dependencias.
- Se confirmó el run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) en SHA `0763c70647ff11a8bcf91386a274d549246407ef`; instalación congelada y `pnpm audit --audit-level high` pasaron, con `No known vulnerabilities found`. La revisión de logs detectó que Bash ejecutó fragmentos entre backticks y que `pnpm outdated -r` no dejó un listado visible; por tanto, el run no validó bien el informe de actualizaciones. La corrección está en `fix/dependency-watch-report-20261029`; esperar CI y un nuevo run antes de declarar el monitor verificado.
- En la última consulta de checks de `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5`: `verify`, Chromium auth, migración PostgreSQL, análisis estático y Trivy mostraban éxito; Workers, Pages y una instancia de scan de historial seguían en curso/duplicadas. Volver a consultar el estado del SHA exacto; no declarar todo verde hasta que termine.
- No se modificaron dependencias, lockfile, secretos, Neon `main`, datos reales ni se hizo despliegue manual en esta tarea. El check de Cloudflare puede generar su propia actividad automática; no equivale a que la IA hiciera un despliegue manual.

### Inventario declarado/resuelto que debe verificarse otra vez en main

- Node range `>=24.22.1 <25`; usar Node 24 LTS y actualizar al parche estable vigente tras comprobar compatibilidad.
- pnpm lockfile v9; no saltar automáticamente a otro major de pnpm.
- TypeScript `5.9.3` (raíz/API/web); TypeScript 7 no está aplicado.
- Hono `4.13.14`; Workers types `5.20261026.1`; Wrangler `4.152.0`.
- React/react-dom `19.3.1`; tipos React y React DOM `19.3.0`.
- Vite `7.3.7`; `@vitejs/plugin-react` `5.2.0`; jsdom `26.1.0`.
- Override crítico: `undici@7.30.1` en `package.json` y `pnpm-lock.yaml`. No aceptar que desaparezca el override o que el lockfile resuelva `undici@7.29.1`. Esto ya causó `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y un hallazgo alto.
- PRs #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) se cerraron sin merge. No asumir que esos upgrades se instalaron. Verificar releases estables/registry y compatibilidad actual antes de retomar.

### Siguiente trabajo obligatorio

1. Leer los documentos de arranque enumerados más abajo y verificar SHA de `main`, PRs abiertas, checks y workflows en vivo.
2. Confirmar que todos los checks post-merge de #137 terminaron y ejecutar el monitor diario manualmente; guardar URL del run, SHA, resultado y resumen.
3. Auditar versiones estables y advisories en el registry al momento de trabajar; priorizar vulnerabilidades explotables/alta severidad y parches compatibles, no solo números de versión.
4. Hacer una única PR coherente para la actualización técnica: primero parches/minors compatibles; migrar Vite 8 + plugin-react 6 + jsdom 30 y evaluar TypeScript 7 con revisión de engines, peer dependencies, breaking changes y pruebas. Separar cambios si mezclar majors impide aislar fallos, pero no abrir PR por paquete sin necesidad.
5. Generar el lockfile con la versión real de pnpm y mantener `pnpm install --frozen-lockfile` verde. Nunca editar resoluciones del lockfile a mano. Conservar el override de Undici o sustituirlo solo con evidencia de seguridad revisada.
6. Exigir checks verdes en el SHA exacto: verify, build/tests web y API, typecheck, migración PostgreSQL, Chromium auth, análisis estático, Dependency Review, Trivy, scan de secretos/historial y builds Pages/Workers. Diagnosticar logs y corregir causa raíz antes de fusionar.
7. Tras merge, comprobar versiones declaradas y resueltas, override, checks de main y ejecutar/documentar el monitor. Actualizar `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md`, `STATE_JOURNAL.md` y plan si cambia el estado.
8. Mantener los límites del proyecto: no cambiar secretos ni pedirlos, no tocar Neon `main` ni datos reales, no desplegar manualmente producción. Restauración integral con datos sintéticos sigue pendiente para la última fase. No borrar ramas/recursos a través de métodos alternativos si un control de seguridad bloquea la acción.

### Documentos que hay que leer antes de actuar

`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md`. Las notas antiguas dentro de estos archivos son histórico; esta sección de estado vivo tiene prioridad, pero siempre revalidar contra GitHub.

---

## Auditoría de versiones del mercado y plan de actualización — 2026-10-29

**Propósito:** responder a la petición del propietario de mantener Micro app al día frente a riesgos de seguridad, sin confundir “última versión publicada” con “versión más segura para producción”.

### Hechos del repositorio en main (SHA verificado antes de esta nota: 59ad394d6dc5035b114db5379b2e1680d1e7969f)

- Node declarado: >=24.22.1 <25. La línea Node 24 es LTS; la publicación oficial consultada anuncia Node 24.22.2 como parche LTS del 2026-10-28. Mantener la línea 24 y actualizar el parche, sin ampliar a Node 26 hasta probar la compatibilidad del runtime y CI.
- pnpm lockfile v9. No se debe cambiar de major del gestor sin verificar cómo afecta el lockfile y las instalaciones congeladas.
- TypeScript: ^5.9.3, lockfile 5.9.3 en raíz, API y web.
- API: Hono ^4.13.14 (resuelto 4.13.14), @cloudflare/workers-types ^5.20261026.1, Wrangler ^4.152.0.
- Web: React/React DOM ^19.1.1 (resueltos 19.3.1), Vite ^7.1.7 (resuelto 7.3.7), @vitejs/plugin-react ^5.0.4 (resuelto 5.2.0), jsdom ^26.1.0 (resuelto 26.1.0).
- Override crítico de seguridad: undici: 7.30.1 en package.json y pnpm-lock.yaml. Nunca aceptar un lockfile que quite el override o resuelva undici@7.29.1; eso ya provocó ERR_PNPM_LOCKFILE_CONFIG_MISMATCH y un hallazgo alto en Dependency Review.

### Exploración pública de versiones estables (consultada el 2026-10-29; no sustituye el registro npm en el momento de actualizar)

| Componente | Versión publicada observada | Situación en Micro app / decisión |
| --- | --- | --- |
| Node.js | 24.22.2 LTS; 26.13.0 LTS también aparece en el blog oficial | Mantener Node 24 LTS; actualizar parche y validar CI. No ampliar major sin prueba. |
| TypeScript | 7.0.2 latest | Upgrade mayor pendiente; probar en rama separada o grupo muy controlado. No usar beta/dev. |
| Vite | 8.3.5 latest; 7.3.7 figura como versión anterior | Upgrade mayor pendiente; revisar requisitos de Node y peer dependencies. |
| @vitejs/plugin-react | 6.1.2 latest | Requiere verificar compatibilidad con Vite 8 y build del frontend. |
| jsdom | 30.1.3 | Upgrade mayor pendiente; comprobar requisitos de Node y todas las pruebas DOM. |
| Wrangler | 4.154.0 latest | Subir de 4.152.0 después de CI, tipos y build Worker. |
| Hono | 4.13.14 | Ya coincide con la versión estable observada. No migrar a Hono 5 RC: es pre-release. |
| React / react-dom | 19.3.1 latest | Ya resueltos en 19.3.1. |
| @types/react, @types/react-dom | 19.3.0 latest en las páginas consultadas | Ya resueltos en 19.3.0. Mantener sincronizados con React y TypeScript. |
| pnpm | 12.16.1 latest observado; también hay líneas 10.x/11.x | No cambiar major automáticamente; verificar packageManager, lockfile v9 y CI antes de migrar. |
| @cloudflare/workers-types | Las páginas indexadas consultadas muestran versiones distintas y retrasadas respecto al repo | No declarar una “última” versión sin consultar directamente el registry durante el cambio. La versión del repo es 5.20261026.1. Cloudflare recomienda considerar wrangler types generado desde configuración/compatibility date; estudiar como migración separada. |

Fuentes públicas consultadas:
- Node releases: https://nodejs.org/en/blog/release y https://nodejs.org/en/about/previous-releases
- TypeScript: https://www.npmjs.com/package/typescript
- Vite: https://www.npmjs.com/package/vite
- plugin React: https://www.npmjs.com/package/@vitejs/plugin-react
- jsdom: https://www.npmjs.com/package/jsdom
- Wrangler: https://www.npmjs.com/package/wrangler
- Hono: https://www.npmjs.com/package/hono
- React: https://www.npmjs.com/package/react
- pnpm: https://www.npmjs.com/package/pnpm
- Workers types: https://www.npmjs.com/package/@cloudflare/workers-types

### Plan de actualización seguro — no marcar como completado hasta ejecutarlo

1. Actualizar primero los parches de Node 24 y dependencias minor/patch compatibles; comprobar advisories, pnpm install --frozen-lockfile, Dependency Review, Trivy y escaneo de secretos.
2. Preparar un único grupo coherente de herramientas frontend mayores: Vite 8 + @vitejs/plugin-react 6 + jsdom 30, junto con TypeScript 7 solo si los scripts/configuración lo soportan. Evitar cuatro PRs independientes que creen lockfiles divergentes; una PR coherente con pruebas completas es preferible.
3. Generar el lockfile con pnpm real; no editar manualmente las resoluciones del lockfile ni aceptar que desaparezca overrides: undici 7.30.1.
4. Validar en SHA exacto: instalación congelada, build frontend, tests frontend, typecheck API/web, tests API, migraciones PostgreSQL, smoke tests Chromium, análisis estático, Dependency Review, Trivy, scan de historial y builds Cloudflare Pages/Workers.
5. Inspeccionar requisitos engines, peer dependencies, breaking changes y notas de seguridad de cada paquete. Si falla algo, arreglar causa real en la misma rama; no crear una cadena de PRs de prueba.
6. Fusionar solo si todos los checks obligatorios están verdes y el diff/lockfile se revisaron. Tras merge, volver a leer manifiestos/lockfile y comprobar checks del SHA de main.
7. No actualizar Node a 26, pnpm a 12 o Workers types a una versión no verificada solo para igualar un número de versión. Tratar cada cambio de runtime/gestor como decisión de compatibilidad.
8. Continuar con actualizaciones de seguridad periódicas y Dependabot; no prometer que “todo es seguro” solo porque los paquetes estén al día.

**Límite actual:** esta nota es auditoría y plan; no ha cambiado ninguna dependencia ni lockfile. No se ha ejecutado instalación local durante esta revisión. La PR #136 fue documental y no actualizó paquetes.

### Monitorización diaria de dependencias — añadido en esta rama, pendiente de merge

- Workflow nuevo: `.github/workflows/daily-dependency-watch.yml`.
- Frecuencia: diaria a las 08:15 UTC (04:15 Venezuela) y ejecución manual mediante `workflow_dispatch`.
- Ejecuta instalación reproducible con `pnpm install --frozen-lockfile`, muestra versión del Node usado y consulta el último parche publicado de Node 24 LTS desde el índice oficial.
- Ejecuta `pnpm outdated -r` para visibilizar dependencias directas con actualizaciones y `pnpm audit --audit-level high`; un fallo del audit deja el informe en el resumen y falla el workflow para llamar la atención.
- El informe queda en el resumen de GitHub Actions. No crea PR, no actualiza dependencias, no escribe manifiestos/lockfile, no manda email y no despliega.
- Dependabot permanece semanal para PRs de npm y GitHub Actions; el workflow diario es observabilidad adicional, no remediación automática.
- Limitaciones: el resultado de `pnpm outdated` debe leerse para distinguir actualizaciones de un error de registry; un audit fallido puede ser advisory high/critical o error de registry. El resumen incluye esta advertencia. El workflow no sustituye revisión de changelogs, peer dependencies, lockfile ni CI completa.
- Guardrail obligatorio: mantener `undici@7.30.1` coherente entre `package.json` y `pnpm-lock.yaml` hasta que una actualización de seguridad revisada lo reemplace explícitamente.
- Estado actual: archivo añadido al HEAD de esta rama; todavía debe pasar los checks de la PR #137. No afirmar que la ejecución diaria funciona hasta observar al menos una ejecución real después del merge.

---

## Estado vivo — Dependabot y continuidad (2026-10-29 UTC)

**HEAD verificado de `main` al 2026-10-29:** `764ed502d2a296136d311e05d081ca8e9f7cfeb9`, merge de [PR #134](https://github.com/BTF14/Micro-app/pull/134), que documentó reglas obligatorias para Dependabot/lockfile y continuidad. PR #116 y #131 también están fusionadas; #131 añade un resumen visible en Actions ante fallos del backup, no una notificación externa. La búsqueda en vivo de PR abiertas no devolvió resultados en esta revisión; volver a comprobar antes de trabajar.

### Inventario de versiones de runtime y herramientas (verificado en `main`, 2026-10-29)

- Runtime CI/Workspace: Node `>=24.22.1 <25`; package manager pnpm (lockfile v9).
- TypeScript: `^5.9.3` en raíz, API y web; lockfile resuelve `5.9.3`. **TypeScript 7 NO está aplicado.**
- API: Hono `^4.13.14` (resuelto `4.13.14`); `@cloudflare/workers-types ^5.20261026.1`; Wrangler `^4.152.0`.
- Web: React/React DOM `^19.1.1` (resueltos `19.3.1`); Vite `^7.1.7` (resuelto `7.3.7`); `@vitejs/plugin-react ^5.0.4` (resuelto `5.2.0`); jsdom `^26.1.0` (resuelto `26.1.0`).
- Override de seguridad: `undici: 7.30.1` declarado en `package.json` y conservado en `pnpm-lock.yaml`; el lockfile contiene `undici@7.30.1` y no `undici@7.29.1`.
- PR #116 actualizó el grupo minor/patch de Hono, Workers types y Wrangler. PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) están cerradas sin merge: esos majors **no** se deben describir como instalados. No subirlos sin rama de trabajo, revisión de compatibilidad, lockfile coherente y CI verde.
- Este inventario indica las versiones declaradas/resueltas, no que todas sean las últimas publicadas ni que se haya ejecutado una auditoría de todas las dependencias transitivas.

### Incidente de Dependabot: corregido parcialmente y verificado

Las PR #116–#120 generadas originalmente quitaban del lockfile el bloque `overrides: undici: 7.30.1`, aunque `package.json` mantenía `pnpm.overrides.undici = 7.30.1`. En los HEAD originales, la instalación congelada fallaba con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y Dependency Review encontraba `undici@7.29.1` con vulnerabilidades de severidad alta. Se pidió rebase a Dependabot y se inspeccionaron los logs.

- [PR #116](https://github.com/BTF14/Micro-app/pull/116), grupo minor/patch de Hono, `@cloudflare/workers-types` y Wrangler: **fusionada** el 2026-10-29. El HEAD final `5d3f2e373e75caf71af207cba61df3066b140a86` incluyó el arreglo para conservar el override; todos los checks de la PR terminaron en `success`, incluidos `verify`, Chromium, migraciones, análisis estático, Trivy, historial de secretos, Dependency Review, Cloudflare Pages y Workers.
- [PR #117](https://github.com/BTF14/Micro-app/pull/117) TypeScript 7, [#118](https://github.com/BTF14/Micro-app/pull/118) plugin-react 6, [#119](https://github.com/BTF14/Micro-app/pull/119) Vite 8 y [#120](https://github.com/BTF14/Micro-app/pull/120) jsdom 30: actualmente **cerradas sin fusionar**. No asumir que esos upgrades están aplicados ni reabrirlos sin revisar compatibilidad, diffs y checks actuales.

Verificación posterior al merge: `package.json` declara `undici: 7.30.1`; `pnpm-lock.yaml` conserva el bloque `overrides`, contiene `undici@7.30.1` y no contiene `undici@7.29.1`. Todos los checks consultados para el commit de PR #132 `9f73f8ab0c1581145796f09a41f689fa4bdcf310` terminaron en `success`, incluidos `verify`, Chromium, migraciones, Trivy, historial de secretos, análisis estático, Pages y Workers. El HEAD posterior `764ed502d2a296136d311e05d081ca8e9f7cfeb9` (PR #134, documentación) también tiene en `success` los checks consultados: verify, Chromium, migraciones, análisis estático, Trivy, scan de historial, Cloudflare Pages y Workers.

### Siguiente trabajo

1. **Completado:** los checks del HEAD de documentación `764ed502d2a296136d311e05d081ca8e9f7cfeb9` terminaron en `success`.
2. Mantener el override de `undici@7.30.1`; cualquier futura actualización debe conservar coherencia entre `package.json` y `pnpm-lock.yaml`, pasar instalación congelada y Dependency Review.
3. No reintroducir TypeScript 7, plugin-react 6, Vite 8 ni jsdom 30 sin un plan y pruebas de compatibilidad.
4. Continuar el resto de tareas de seguridad priorizadas. La restauración integral con datos sintéticos poblados sigue pendiente para la última fase.

No se tocaron Neon, secretos, datos reales ni producción. No se hizo despliegue manual.

---

## Estado vivo — continuidad tras PR #130 (2026-10-29 UTC)

**Última referencia de `main` verificada al iniciar este trabajo:** `3ce18e2aa5bcf2a8c555a47681998405a4f14509` (commit de fusión de PR #130). Reconsultar el HEAD actual antes de operar; este SHA quedará obsoleto al fusionarse esta PR. La PR #129 está fusionada y su corrección de retención de 15 días usa el timestamp UTC validado del nombre del archivo, no `find -mtime`; elimina también el checksum emparejado y tiene pruebas unitarias en CI.

### Política operativa de backups para continuidad entre sesiones
- Backup diario; retención configurada en 15 días mediante `scripts/prune_backups.py` (timestamp UTC validado en nombre, no `mtime` del checkout) y eliminación del checksum emparejado. PR #129 fusionada y tests de retención en CI.
- No borrar todas las copias anteriores al generar una nueva ni reducir el plazo sin análisis y revisión. Si una ejecución nueva falla o no se valida, conservar la última copia válida y comprobar alerta visible. El workflow ahora publica un resumen con enlace al run en GitHub Actions ante fallos; no es una notificación externa.
- La retención no equivale a restauración probada. Sigue pendiente una prueba aislada con datos sintéticos relacionados y manifiesto de conteos/relaciones, RPO/RTO, alerta y coste $0. Restauración para la última fase.

### Secretos y recursos temporales: estado exacto
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets. Esta última comprobación es visual, informada por el propietario; no se conoce la fecha exacta de eliminación.
- Los únicos secretos que el propietario reporta actualmente son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos para el backup permanente.
- La rama Neon `restore-test-20261028` (proyecto `restless-fire-99110035`, branch ID `br-broad-dust-b7cvgjtv`) sigue existiendo en la última consulta. El borrado vía herramienta fue bloqueado por controles de seguridad; no reintentar para eludirlos. Si se decide limpiar, usar la consola Neon y verificar nombre/ID; no tocar `main`.
- No se modificó Neon `main`, datos de producción ni se hizo despliegue manual.

### Siguiente trabajo — respaldo/recuperación
- La restauración técnica previa (run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)) pasó checksum, descifrado y restauración en PostgreSQL desechable. No demostró recuperación de datos comerciales poblados: las tablas de ventas, productos, pagos, movimientos y auditoría estaban vacías en esa copia.
- Pendiente: verificar la siguiente ejecución programada y checksum de la copia más reciente; confirmar si las notificaciones nativas de GitHub son suficientes para alertar fuera de la interfaz de Actions.
- Pendiente: una única prueba aislada con datos sintéticos relacionados y un manifiesto de conteos/relaciones; restaurar a PostgreSQL desechable y comparar. Documentar RPO/RTO y coste $0. Mantener la restauración como última fase, según indicación del propietario.
- No recrear el workflow temporal retirado en PR #127. No crear PRs fragmentadas; usar el flujo CI existente.

---

## Estado vivo — continuidad tras PR #128 (2026-10-29 UTC)

**Referencia verificada:** `main` = `9b4ee7d2ed704288cd0cf149c93569a698f46e1b`; PR [#128](https://github.com/BTF14/Micro-app/pull/128) está fusionada. El workflow temporal de restauración sigue retirado; no recrearlo.

### Secretos y recursos temporales: estado exacto
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets. Esta última comprobación es visual, informada por el propietario; no se conoce la fecha exacta de eliminación. No pedir ni mostrar valores.
- Los únicos secretos que el propietario reporta actualmente en esa lista son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos porque los necesita el backup permanente.
- La rama Neon de prueba `restore-test-20261028` (proyecto `restless-fire-99110035`, branch ID `br-broad-dust-b7cvgjtv`) seguía existiendo en la última consulta. La operación de borrado vía herramienta fue bloqueada por controles de seguridad; no se debe afirmar que se eliminó ni reintentar para eludir el bloqueo. Borrar desde la consola de Neon solo tras verificar nombre/ID y que no es `main`.
- No se modificó Neon `main`, datos de producción ni se hizo despliegue manual.

### Evidencia y límites del restore
- Run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192): éxito en checksum, descifrado y restauración en PostgreSQL desechable; 13 tablas, 186 constraints, 0 membresías huérfanas y exclusión de `auth_sessions`/`auth_rate_limits`.
- Las tablas comerciales/auditoría verificadas estaban vacías. Esto demuestra la ruta técnica para esa copia, **no** recuperación integral de datos comerciales poblados ni igualdad con un manifiesto del origen.
- Inspección del mecanismo permanente: `.github/workflows/backup.yml` usa `pg_dump`, cifra con `age`, sube al repo privado `BTF14/micro-app-backups` y aplica retención de 15 días. Hallazgo: la retención previa usaba `find -mtime` sobre un checkout shallow, cuyo mtime refleja el checkout y no la fecha real del backup; puede dejar de eliminar copias antiguas. La PR de corrección reemplaza esto por la marca UTC del nombre de archivo y añade pruebas unitarias en CI.
- Pendiente después de validar/fusionar la corrección: una única prueba aislada con datos sintéticos poblados y manifiesto de conteos/relaciones, sin datos reales ni Neon `main`; medir RPO/RTO, alertas y coste $0. No recrear el workflow temporal ni abrir PRs duplicadas.
- No declarar backup/restore completamente cerrado ni Micro app lista para producción; continúan los demás bloqueos de seguridad documentados.

La entrada de continuidad más reciente prevalece sobre snapshots históricos que digan que la PR de limpieza está pendiente o que ambos secretos aún deben borrarse.

---

## Estado vivo — restauración de respaldo verificada técnicamente (2026-10-29 UTC)

- La PR #126 está fusionada; el workflow temporal se ejecutó de nuevo en `main`: [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192), resultado `success`, duración mostrada por Actions: 22 s.
- Evidencia del run: backup `backup-2026-10-28T13-39-39Z.dump.age`; checksum, descifrado y `pg_restore` correctos; 13 tablas esperadas; 186 constraints presentes; 0 membresías huérfanas; `auth_sessions` y `auth_rate_limits` ausentes.
- La copia tenía 1 organización, 1 usuario, 1 membresía, 1 entrada de allowlist y 1 registro bootstrap; las tablas comerciales y de auditoría verificadas estaban vacías. El camino técnico de restauración queda probado para esta copia, pero falta prueba con datos sintéticos poblados y comparación contra un manifiesto/conteo de origen. No afirmar integridad completa de datos comerciales.
- No se usó Neon `main` ni se modificaron datos de producción. La PR de limpieza pendiente debe eliminar el workflow temporal y actualizar la documentación. Tras fusionarla, el propietario debe borrar los secretos `RESTORE_TEST_AGE_KEY` y `RESTORE_TEST_DB_URL` y eliminar la rama Neon desechable `restore-test-20261028` después de verificar que ya no se necesita.
- El punto de backup de Nivel 1 permanece parcialmente verificado: falta evidencia del RPO/RTO extremo a extremo, alertas de fallos, retención y coste $0. No declarar Micro app lista para producción; siguen vigentes los otros bloqueos de seguridad.

---

## Checkpoint posterior a PR #114 — 2026-10-29 UTC

- PR #114 quedó fusionada por squash en `main`: [merge commit dc3fae80c485ec52c2e68c80da316df90c68ac83](https://github.com/BTF14/Micro-app/commit/dc3fae80c485ec52c2e68c80da316df90c68ac83). El HEAD revisado fue `780e057435fea4ebd6213fd973745599e71d2088`; GitHub confirmó `merged=true`.
- Los ocho workflows de PR y los dos checks externos de hosting del HEAD de PR fueron `success`. Esto no equivale a CI post-merge: en el merge SHA los estados hosting alternativo aparecen `pending` y el conector no devolvió workflows de Actions para ese SHA. Reconsultar antes de afirmar que pasó CI post-merge.
- Cloudflare Workers actualizó el estado a `Deployment successful!` y expuso URLs explícitas de preview de commit y rama: `https://36b3fea5-micro-app-api.btfcasheb.workers.dev` y `https://docs-continuity-after-pr-113-2026-10-28-micro-app-api.btfcasheb.workers.dev`. No se hizo despliegue manual.
- Esta actualización documental corrige la referencia obsoleta al estado abierto de PR #114 y al SHA anterior de `main`; conserva el historial previo sin reescribir decisiones antiguas.
- Siguen pendientes: restaurar el backup cifrado en PostgreSQL desechable; verificar headers CORS con HTTP real contra el Worker; decisión/aprobación de la matriz de permisos; aislamiento cross-tenant para rutas comerciales futuras. No declarar la app lista para producción. No tocar Neon `main`, secretos ni datos reales.

---

## Continuidad verificada — 2026-10-28, después de PR #113

- `main` quedó en `4242bcef38f33a415f472fc9c04048e1eee3bdde`, fusión squash de PR #113. La PR integró una propuesta completa para revisar permisos por rol; **la matriz continúa explícitamente NO aprobada** y no autoriza rutas comerciales.
- La PR #113 tuvo éxito en los workflows de CI, migraciones, E2E, Semgrep, escaneo de seguridad, historial de secretos, Dependency Review y dashboard en el HEAD exacto `b93df838095a043e418f5e481ce4422ed014c494`. El resumen de revisión de Codex reportó que no pudo completar por límite de uso; se realizó revisión manual y se dejó un comentario técnico en la PR. En el commit de merge, los estados clásicos consultados muestran dos checks hosting alternativo pendientes; no afirmar que hubo una nueva corrida de CI posterior al merge.
- Decisiones pendientes para revisar en la matriz: el 10 % de descuento es solo una sugerencia y requiere decisión del propietario; el alcance por sucursal/caja requiere confirmar el supuesto de MVP de un solo local; la regla de no perder al último `owner` debe tener implementación transaccional serializada y pruebas concurrentes.
- Auditoría de rama obsoleta: `security/secret-scan-current-main` está 1 commit por delante y 39 detrás de `main`. Su checklist `docs/PUBLIC_RELEASE_SECURITY_CHECKLIST.md` ya existe en `main`; el workflow de la rama usa `actions/checkout@v4`, mientras `main` usa `@v7`; su `.gitignore` no conserva la excepción `!apps/web/.env.production` presente en `main`. No fusionar ni borrar la rama tal cual.
- No se modificaron secretos, Neon, datos reales ni configuración productiva; no se hizo despliegue manual. La PR #114 de continuidad está abierta mientras se completa la verificación; no se debe describir el inventario como vacío.
- Bloqueos reales: (1) restaurar un backup cifrado real en PostgreSQL desechable; la llave privada `age` permanece bajo custodia del propietario y no está disponible en esta sesión; (2) revisar/aprobar o corregir la matriz de permisos; (3) verificar los headers CORS mediante solicitudes HTTP reales al Worker; (4) probar aislamiento cross-tenant cuando existan rutas comerciales. La aplicación no está lista para producción.
- Próxima acción segura: el propietario revisa la propuesta de permisos; en paralelo se sigue investigando una ruta autorizada y gratuita para la restauración aislada y la verificación HTTP de CORS. No usar herramientas metered, no acceder a Neon `main`, no inventar políticas ni crear otra PR para un objetivo ya cubierto.

---

## Estado vivo verificado — 2026-10-28

- Último SHA de `main` verificado antes de esta PR de continuidad: `33da237ad7592ac394cc266c6a96c4bd1d387e37` (merge de PR #110). PR #111 se fusionó antes en `3512cac28d6f0752a3699db00843a20788d91376`. Verificar el SHA vivo de `main` antes de cualquier acción futura.
- Las PR #110 (continuidad documental) y #111 (pruebas de auth) quedaron fusionadas. El inventario reciente no mostró PR abiertas; volver a comprobarlo al iniciar el siguiente trabajo.
- **PR #111 / auth:** en el HEAD probado `233844be10bb102fdac34ad41776d4d14420b243` pasaron los seis checks obligatorios. CI confirmó 48/48 tests unitarios y 14/14 pruebas PostgreSQL de auth; build/typecheck, Chromium auth smoke, migración, SAST, Trivy, secret-history y Dependency Review también pasaron. No se encontraron workflows post-merge mediante el conector; no afirmar que hubo una segunda corrida después del merge.
- **CORS:** PR #103 está fusionada. El código restringe el origen a `FRONTEND_ORIGIN` canónico y falla cerrada ante configuración ausente/inválida; las pruebas cubren preflight permitido y origen externo. La comprobación HTTP de `OPTIONS` al Worker productivo no pudo repetirse en esta sesión porque el acceso web a los endpoints falló. No declarar headers productivos verificados.
- **undici/Node:** PR #101 fijó `undici@7.30.1` con override exacto en `package.json` y `pnpm-lock.yaml`; la versión está parcheada para las ramas 7.x afectadas en el advisory consultado. PR #105, que proponía `>=7.30.1`, está cerrada sin merge y no debe reabrirse para duplicar cambios. PR #108 movió CI/Pages a Node 24.
- **Dependencias vulnerables:** el conector no permite consultar Dependabot alerts/dependency graph/code scanning; el número actual de alertas es desconocido. Trivy usa `exit-code: '0'`, por lo que un check verde no prueba ausencia de vulnerabilidades.
- **Backup:** run [40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159) terminó en success; el archivo cifrado llegó al repositorio privado y el checksum coincidió. Falta restauración real a PostgreSQL desechable; la llave privada `age` está bajo custodia del propietario.
- **Adapter de Neon:** `feat/neon-transaction-adapter` está 14 commits ahead y 124 behind; `apps/api/src/database.ts` es idéntico al de main, main tiene más pruebas, y la rama usa Vitest/workflow antiguos. No fusionar tal cual ni borrar la rama sin revisar cambios únicos.
- **Protección de main:** la consulta del endpoint de protección devuelve 403. La documentación histórica contradice si se requieren 0 o 1 aprobaciones; las PR #110/#111 se fusionaron con los checks requeridos en verde y sin reviews registradas, pero eso no determina el número actual de aprobaciones. No sortear el gate.
- La PR #103 se fusionó sin reviews/hilos registrados pese a un handoff anterior que pedía esperar revisión Claude/Codex; se conserva como discrepancia de proceso, no como revisión completada.
- No se modificaron secretos, Neon ni configuración productiva. No se hizo despliegue manual.

---




## 2026-10-28 — Aislamiento de Cloudflare Pages Preview verificado (PR #106)

- Causa raíz: Preview heredaba la URL de `apps/web/.env.production` y CSP permitía el Worker de producción. No hay API/DB de Preview aisladas verificadas.
- Solución en PR #106: las ramas de Pages distintas de `main` no incluyen la URL productiva, no consultan sesión ni muestran login de Google, y el postbuild cambia CSP Preview a `connect-src 'self'`. Producción conserva la configuración actual.
- Evidencia local en sandbox con pnpm 10: build Preview pasó; el origen productivo está ausente del bundle y de `dist/_headers`; test dedicado Preview pasó (1/1); suite web normal pasó (6 tests, el test específico de Preview queda skip fuera de Preview); build de producción pasó y mantiene el origen de API requerido.
- Evidencia HTTP real en el Preview de Cloudflare Pages: HTTP 200; CSP observada contiene `connect-src 'self'` y no permite `https://micro-app-api.btfcasheb.workers.dev`. El check Cloudflare Pages de HEAD `1d47a474351bb14f9f5e14283beec789356bafe3` pasó.
- Los checks consultados para ese HEAD terminaron en success. PR #106 fue fusionada por squash el 2026-10-28 en `main` (commit `d5d99b3a5184d6aad36ffd9a44ff34a62346dc94`). Cloudflare Pages confirma el despliegue automático exitoso. No se hizo despliegue manual ni se tocaron secretos, variables/bindings de Cloudflare o Neon. No se tocaron secretos, variables/bindings de Cloudflare ni Neon. La API/DB de Preview no se presenta como aislada; el frontend Preview queda fail-closed.

---

# Estado vivo — 2026-10-28: restauración de respaldo pendiente de probar; vulnerabilidades de Dependabot resueltas

## Política de trabajo entre agentes y PR (actualización 2026-10-28)

- Se propone como política canónica `docs/AI_COLLABORATION_AND_PR_POLICY.md`; `AGENTS.md` la incluye en la secuencia obligatoria de lectura. Hasta que la PR documental se fusione, confirmar en vivo la rama/PR y no asumir que estos cambios ya están en `main`.
- Regla del propietario: priorizar corrección y seguridad por encima de velocidad aparente; no inundar el repositorio de PR. Una PR por objetivo coherente, reutilizarla para correcciones del mismo alcance y separar objetivos independientes.
- Claude/Codex son revisores complementarios, no bloqueo para avanzar técnicamente. Si el propietario ordena expresamente mantener una PR abierta hasta disponer de ellos, no fusionarla antes de esa revisión.
- Los checks deben verificarse en el SHA exacto. CI verde no sustituye pruebas del servicio real ni autoriza despliegues. Mantener separación entre tests simulados, integración/E2E y comportamiento observado en producción.


- **Respaldo verificado con una corrida real** (`run 40587638159`, `conclusion: success`): el archivo cifrado llegó a `BTF14/micro-app-backups/daily/` y su checksum coincide. **Sigue pendiente la prueba de restauración real** (`pg_restore` contra una base desechable) — único punto que falta para dar por completamente cerrado el Nivel 1, punto 2.
- **Las 15 alertas de Dependabot abiertas (2 críticas, varias altas/moderadas)** eran todas de `vitest`/`tinypool`/`undici`/`@vitest/mocker` — dependencias de pruebas, nunca en el bundle de producción. Se resolvieron subiendo `vitest` de 3.x a 5.x en `apps/api` y `apps/web` (PR #96, regenerando `pnpm-lock.yaml` vía un workflow de un solo uso en GitHub Actions, porque este entorno no puede alcanzar `registry.npmjs.org`). CI completo (build, tests, E2E, dependency-review) pasó en verde antes de fusionar. **Pendiente de confirmación del propietario**: que la lista en `github.com/BTF14/Micro-app/security/dependabot` ya no muestre esas alertas — esta IA no tiene permiso de lectura sobre esa API desde este entorno.
- El workflow temporal usado para la actualización (`update-vulnerable-dev-deps.yml`) ya se eliminó (PR #97) — no es una herramienta permanente del proyecto.

---

# Estado vivo — 2026-10-27: respaldo automático implementado, checklist de cumplimiento evaluado

PR #91 y #92 fusionadas (`facb3dd`, `16a5367`). Cambios desde el checkpoint anterior:

- **Aprobación obligatoria de PR desactivada** por el propietario (lo prefirió así mientras el proyecto lo maneja solo él; GitHub nunca deja que el autor de un PR apruebe el suyo propio, así que con 1 aprobación requerida cada PR mío quedaba bloqueado esperándolo). Ahora cada PR solo necesita los 6 checks en verde para poder fusionarse — esta IA ya puede fusionar sola de nuevo.
- **Respaldo automático cifrado implementado** (`SECURITY_ROADMAP.md` punto 2): Cloudflare R2 se descartó porque pide tarjeta; destino final es el repositorio privado `BTF14/micro-app-backups`. Workflow `.github/workflows/backup.yml` corre diario, usa el rol de solo lectura `backup_readonly`, cifra con `age` antes de subir, retiene 15 días. **Falta que el propietario agregue el secreto `DATABASE_URL_BACKUP_RO`** en `Settings → Secrets and variables → Actions` de `BTF14/Micro-app` para que el workflow pueda correr de verdad (valor ya entregado por chat). Hasta entonces, no está verificado en producción.
- **Checklist externo de cumplimiento (legal/privacidad/accesibilidad) evaluado** en `docs/COMPLIANCE_AND_ACCESSIBILITY.md`: varios puntos no aplican todavía (banner de cookies, política de reembolsos, consentimiento parental — no hay cookies de analítica, pagos ni registro público), otros quedan como principio de diseño para módulos futuros, y se adoptó una verificación real de accesibilidad (la interfaz actual ya cubre bien `aria-label`/roles; falta foco atrapado en el modal de ayuda, no bloqueante).
- **Nuevo gate de CI**: `.github/workflows/dependency-review.yml` falla un PR que introduzca una dependencia con vulnerabilidad `high`/`critical`.

---

# Estado vivo — 2026-10-26 (noche): main protegida, decisión sobre blueprint externo, respaldos en progreso

**Main ya tiene protección de rama activada por el propietario — verificado en vivo, no solo documentado.** `GET /repos/BTF14/Micro-app/branches/main/protection` confirma: PR obligatorio, 6 checks requeridos, `enforce_admins: true`, sin force-push ni deletions. **Cambio de flujo a partir de ahora: ya no se puede empujar nada directo a `main`, ni siquiera checkpoints de documentación — todo pasa por PR.**

**Discrepancia pendiente de que el propietario la resuelva:** reportó "0 aprobaciones mínimas", pero la API en vivo dice `required_approving_review_count: 1`. Hasta que se corrija (o se confirme que así se quiere dejar), **cada PR, incluido este mismo checkpoint, necesita que el propietario lo apruebe y fusione manualmente en GitHub** — la IA no puede autoaprobarse ni cambiar el ajuste (el mismo bloqueo de proxy que afectó la configuración inicial). Ver recomendación en `docs/SECURITY_ROADMAP.md` punto 1.

**Blueprint externo (Gemini, sin contexto del proyecto) evaluado y resuelto** en `docs/PRICING_CACHE_ARCHITECTURE.md` (PR #91, abierto, CI en verde, esperando aprobación): se adopta como diseño el cron de tasa BCV y la caché de lectura en Cloudflare KV (ninguno implementado todavía); se **rechaza explícitamente el modo offline-first** de ventas (rompe el invariante transaccional anti-fraude existente, duplica superficie de error justo cuando se pidió priorizar seguridad, y resuelve un problema no confirmado); el resto de ideas del blueprint ya estaban resueltas, de forma más estricta.

**Respaldo automático (Nivel 1, punto 2) en progreso, no terminado:**
- Creado el rol Neon `backup_readonly` (solo `SELECT`, verificado contra `information_schema.role_table_grants`), y un par de llaves `age` para cifrar el volcado (llave pública documentada en `docs/SECURITY_ROADMAP.md`; la privada se le entregó una sola vez al propietario por chat y se borró de este entorno).
- **Bloqueante nuevo:** Cloudflare R2 no está habilitado en la cuenta y activarlo por primera vez puede exigir vincular una tarjeta — choca con la regla de "$0, sin tarjetas" del proyecto. Se le presentó al propietario una alternativa sin tarjeta (repositorio privado de GitHub solo para los volcados ya cifrados) junto con la opción R2. Pendiente de que el propietario elija destino antes de escribir el workflow de subida.

---

# Estado vivo — 2026-10-26 (tarde): hoja de ruta de seguridad adoptada

El propietario pidió explícitamente priorizar que todo quede **bien hecho y seguro, no rápido**, pensando en que el proyecto puede escalar a varias personas. Se creó `docs/SECURITY_ROADMAP.md` con un plan en 3 niveles (ver ese documento completo), ahora parte de la secuencia de lectura obligatoria de `AGENTS.md`. PR #85 fusionada (merge `11d29b183490286a02195d7f86b94f44853d3c5c`).

Implementado ya en este PR (Nivel 1, puntos 3 y 4 de la hoja de ruta):
- `.github/dependabot.yml`: actualizaciones semanales de dependencias npm/pnpm y de GitHub Actions.
- Cabeceras de seguridad: `apps/web/public/_headers` (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) en el frontend; middleware de cabeceras + `Cache-Control: no-store` en rutas `/auth/*` en la API.

**Pendiente, requiere acción manual del propietario (Nivel 1, punto 1):** protección de la rama `main` en GitHub. Se intentó configurar vía API con un token con permiso `admin` confirmado, pero el proxy de red de este entorno la rechazó (`403 Write access to this GitHub API path is not permitted through this proxy`) — es una restricción técnica de este agente, no de GitHub. Instrucciones paso a paso para que el propietario lo haga manualmente están en `docs/SECURITY_ROADMAP.md`, sección 1.

**Pendiente de implementación (Nivel 1, punto 2):** respaldo automático cifrado de la base de datos a un destino independiente (diseño propuesto con Cloudflare R2 + GitHub Actions programado, detallado en la hoja de ruta) — todavía no se ha creado el bucket ni el workflow.

**Importante para el siguiente chat:** si se activa la protección de `main` (punto 1), el flujo que se ha venido usando en esta sesión — empujar commits de documentación directo a `main` — dejará de funcionar y habrá que usar PR también para esos cambios. Es el comportamiento esperado, no un error.

---

# Estado vivo — 2026-10-26: centro de ayuda (WhatsApp en todo error + FAQ/Privacidad)

PR #84 fusionada (merge `0f83bae341190bf63e50b41fc7402944cda4277f`): el enlace de WhatsApp ya no vive solo en el error de login; también aparece en el banner de error genérico del panel autenticado (por ejemplo, si falla el cierre de sesión), y hay un pie de página permanente (en la pantalla de login y en el panel) con tres enlaces: "Escríbenos por WhatsApp", "Preguntas frecuentes" y "Privacidad". Los dos últimos abren una ventana modal estilo hoja inferior (`.help-modal`) con contenido en `apps/web/src/App.tsx` (constantes `FAQ_ITEMS` y `PRIVACY_SECTIONS`).

El texto de privacidad se escribió explícitamente como un aviso básico honesto para una app interna todavía en desarrollo (qué se guarda, para qué, que no se comparte fuera del negocio, dónde se aloja, cómo pedir corrección/eliminación) — con una nota aclarando que, si el negocio empieza a manejar datos de clientes o el sistema se abre al público, hace falta una revisión legal formal antes de ese paso. No es, ni pretende ser, una política de privacidad legalmente completa.

Con esto, **el trabajo de identidad, acceso y la capa básica de soporte/ayuda del usuario está terminado.** No queda ningún pendiente conocido de esta categoría.

---

# Estado vivo — 2026-10-25 (noche, tarde 2): enlace de WhatsApp para contactar al administrador

PR #83 fusionada (merge `1c65957887cceeccaa059ebd6d12fabdc73f4525`): el texto "comunícate con el administrador del sistema" (en el banner de `?auth_error=` y en la nota fija bajo el botón de Google) ahora es un enlace real a WhatsApp (`https://wa.me/584243104520`, número del dueño, con un mensaje precargado). Antes era solo texto sin ninguna acción posible. Probado por el usuario entrando con un correo no autorizado y confirmando que el mensaje de error se ve correctamente (antes de que se agregara el enlace).

Si el número de WhatsApp de contacto cambia en el futuro, está hardcodeado como constante `ADMIN_WHATSAPP_URL` en `apps/web/src/App.tsx`.

---

# Estado vivo — 2026-10-25 (noche): logout móvil + bug de variables que se autoborraban, resuelto

**Login verificado funcionando en el navegador real del dueño (no solo en base de datos): pantalla "Hola, btfcasheb@gmail.com." con la organización "Abasto 7 de Oro" cargando correctamente en `https://micro-app-63i.pages.dev/`.**

## Bug encontrado y resuelto: las variables de Cloudflare se autoborraban en cada deploy

Después de fusionar PR #81 (que solo tocaba el frontend), el login se rompió otra vez con `GOOGLE_NOT_CONFIGURED` y fallos de CORS. Causa raíz: `wrangler deploy` trata la tabla `[vars]` de `apps/api/wrangler.toml` como la fuente de verdad para las variables **no marcadas como "Secreto"**. `FRONTEND_ORIGIN`, `GOOGLE_REDIRECT_URI` y `GOOGLE_CLIENT_ID` solo se habían configurado a mano en el dashboard de Cloudflare como variables planas, nunca declaradas en el archivo — así que cada deploy automático (incluso uno que no tocaba `apps/api` en absoluto) las borraba en silencio. `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` y `BOOTSTRAP_TOKEN` sobrevivieron porque están guardadas como "Secreto", un almacén separado que `wrangler deploy` no toca.

**Resuelto en PR #82** (merge `f274d32a359dbba8e401897a41294fda1f33cbf8`): esas tres variables ahora están declaradas directamente en `apps/api/wrangler.toml` (committeado, es seguro — el client ID de Google es público por diseño, y las otras dos son solo las URLs del propio despliegue). De aquí en adelante, cualquier deploy las vuelve a crear automáticamente en vez de borrarlas. **No volver a repetir este bug**: cualquier variable nueva no-secreta que se agregue en el dashboard de Cloudflare debe agregarse también a `[vars]` en `wrangler.toml` en el mismo cambio, o se perderá en el próximo deploy.

Valores actuales confirmados en Cloudflare, Producción (los tres "Secreto" no se pueden volver a leer una vez guardados, solo reemplazar):
- `FRONTEND_ORIGIN` = `https://micro-app-63i.pages.dev`
- `GOOGLE_REDIRECT_URI` = `https://micro-app-api.btfcasheb.workers.dev/auth/google/callback`
- `GOOGLE_CLIENT_ID` = `1030757133503-huvhkok21n1br10rtfhs4827fo3v106q.apps.googleusercontent.com` (ahora también en `wrangler.toml`, así que este valor ya no depende de memoria/documentación)
- `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `BOOTSTRAP_TOKEN`: Secreto, valores no recuperables, confirmados presentes.

## Bug encontrado y resuelto: sin forma de cerrar sesión en móvil

El dueño reportó que no veía botón de "Cerrar sesión" en su teléfono. Causa: `styles.css` oculta `.sidebar-bottom` (donde vivía el único botón) por debajo de 760px de ancho — exactamente el dispositivo principal desde el que se usa esta app. **Resuelto en el mismo PR #82**: se agregó un segundo botón "Cerrar sesión" en la barra superior (topbar), visible en cualquier ancho de pantalla; en móvil se oculta el texto del chip de cuenta (redundante con el saludo "Hola, &lt;nombre&gt;") para dejar espacio.

## Próximas prioridades para el siguiente chat

1. Con identidad, login y la interfaz básica ya verificados de punta a punta en producción (incluido en el teléfono real del dueño), **no queda ningún pendiente de infraestructura/acceso conocido**. La prioridad pasa de lleno a construir el negocio: inventario, productos con precio en USD, tasa BCV y su conversión a VES, ventas.
2. Decidir e implementar un flujo real de invitación de usuarios — hoy, agregar a alguien más requiere inserciones manuales en Neon (ver sección de abajo "Cómo agregar un usuario nuevo").
3. Revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge (pendiente desde hace varias sesiones).
4. Si se agrega cualquier variable de entorno nueva al Worker en el futuro, recordar declararla también en `apps/api/wrangler.toml` si no es secreta — ver el bug documentado arriba.

---

# Estado vivo — 2026-10-25 (tarde): primer login real completado, organización creada

**El login con Google funciona de extremo a extremo en producción y ya existe la primera organización real.** Esto es lo más importante que debe saber el siguiente chat.

## Hechos verificados directamente en Neon `main` (proyecto `restless-fire-99110035`, branch `br-summer-math-b7297a60`)

- Tabla `auth_allowlist` tiene exactamente una fila activa: `btfcasheb@gmail.com` (`is_active = true`, `added_by = 'owner-bootstrap-2026-10-25'`, creada 2026-10-25 13:37:54 UTC). Para autorizar a alguien más, insertar otra fila con el mismo patrón — ver "Cómo agregar un usuario nuevo" abajo. No hay ningún otro correo autorizado todavía.
- Tabla `auth_bootstrap` quedó **sellada**: `consumed_at = 2026-10-25T13:40:13.565Z`, `consumed_by_email = 'btfcasheb@gmail.com'`, `created_organization_id` apunta a la organización creada. El `BOOTSTRAP_TOKEN` configurado en Cloudflare ya no sirve para nada — el endpoint rechaza cualquier intento nuevo de bootstrap aunque el token sea correcto, porque la fila sentinela solo permite un uso. Es seguro dejar la variable en Cloudflare (no hace daño) o borrarla como limpieza; no es urgente.
- Organización creada: **id `3ce67e70-c245-4b64-9b93-60b06f85e0f1`, nombre "Abasto 7 de Oro", slug `abasto-7-de-oro`**.
- Usuario creado: **id `36c0f3ec-e1b2-4ea5-9855-45a5ee2c3e92`, email `btfcasheb@gmail.com`**, `google_sub` vinculado, `is_active = true`, rol `owner` en `organization_members` para esa organización.

## Cómo agregar un usuario nuevo a la allowlist (patrón ya probado)

```sql
INSERT INTO auth_allowlist (email, added_by, note)
VALUES ('correo@ejemplo.com', 'owner-bootstrap-<fecha>', 'motivo breve')
ON CONFLICT DO NOTHING
RETURNING id, email, is_active, created_at;
```
Ejecutar contra el proyecto Neon `restless-fire-99110035`, base `neondb`, con `mcp__Neon__run_sql` pasando `project_id` y `database_name` (no `projectId`/`databaseName`, el esquema del tool usa snake_case). Después de agregarlo, la persona solo necesita ir a `https://micro-app-63i.pages.dev/` y tocar "Continuar con Google"; como ya existe su fila en la allowlist pero no un `app_users` con ese correo, el único camino restante sería el bootstrap — **que ya está sellado**. Es decir: **cualquier usuario nuevo después del primero necesita que alguien con acceso a Neon inserte manualmente también su fila en `app_users`/`organization_members`** (o implementar un flujo de invitación — todavía no existe, ver prioridades abajo). No hay todavía una forma de que un segundo usuario se autoprovisione, ni siquiera estando en la allowlist.

## PR #81 fusionada — interfaz de login arreglada

- Problema encontrado: el frontend (`apps/web/src/App.tsx`) seguía mostrando el formulario viejo de usuario/contraseña, y nunca leía el parámetro `?auth_error=` que pone `apps/api/src/google-auth.ts` al redirigir tras un fallo. Resultado: cuando el primer intento de login falló por `not_allowlisted`, el usuario solo vio el formulario de contraseña sin ninguna pista de qué pasó — generó bastante confusión hasta diagnosticarlo leyendo la URL completa a mano.
- PR #81 (`feat(web): Google sign-in UI, replace dead password form`), squash-merged a `main`. Merge commit **`441bdc463954aba1069cfeae9227bf75a562a53a`**. Todos los 12 checks consultados en el head final (`117cb1c`) terminaron `success`, incluido "Chromium authentication smoke tests" (Playwright) tras reescribir `apps/web/e2e/auth.spec.ts`, que todavía probaba el formulario de contraseña eliminado.
- Cambios: el formulario de contraseña/registro se reemplazó por un único enlace "Continuar con Google" hacia `GET /auth/google`; se agregó lectura de `?auth_error=` con un mensaje específico y accionable por cada código (`not_allowlisted`, `account_inactive`, `identity_mismatch`, `bootstrap_consumed`, `not_provisioned`, `email_not_verified`, `oauth_failed`, `server_error`), y se limpia el parámetro de la URL con `history.replaceState` para que un refresh no lo vuelva a mostrar.
- Cloudflare Pages se redesplegó automáticamente al fusionar (igual que el Worker se redeployó al fusionar PR #80). Pendiente de confirmación visual del usuario tras el redeploy.
- Nota de entorno para la siguiente sesión: en este sandbox, `pnpm install` no pudo resolver `registry.npmjs.org` (DNS falla pese a estar en la lista `no_proxy`), así que no se pudieron correr los tests localmente; se verificó todo vía los checks de GitHub Actions en el SHA exacto antes de fusionar, siguiendo el protocolo de `AGENTS.md`.

## Prioridades inmediatas para el siguiente chat

1. Confirmar con el usuario que `https://micro-app-63i.pages.dev/` ahora muestra el panel autenticado ("Hola, btfcasheb@gmail.com…", organización "Abasto 7 de Oro") sin pasos adicionales.
2. Si el usuario quiere agregar más personas (empleados, cajeros), seguir el patrón de "Cómo agregar un usuario nuevo" arriba — y decidir/implementar un flujo real de invitación en vez de inserciones manuales en Neon, porque hoy no escala.
3. Empezar el módulo de negocio real (inventario, productos, tasa BCV, ventas) — sigue sin ningún código de lógica de negocio; todo lo hecho hasta ahora es identidad/infraestructura.
4. Revisar `feat/neon-transaction-adapter` contra `main` actual antes de cualquier merge (pendiente desde hace varias sesiones, nunca bloqueante pero tampoco resuelto).
5. Opcional/limpieza: quitar `BOOTSTRAP_TOKEN` de las variables de runtime de Cloudflare ya que el bootstrap está sellado para siempre; no es urgente.

---

# Estado vivo — 2026-10-25: Google OAuth + allowlist fusionado

- PR #80 (`feat(auth): Google OAuth + allowlist sign-in, password login retired (D1-D8)`) se fusionó a `main` por squash. Merge commit: `e6afed5501b24f50d082ce31883ff78ee477f323`.
- En ese SHA, los nueve checks consultados terminaron en `success`: Workers Builds (micro-app-api), Cloudflare Pages, verify, escaneo de archivos/historial, Trivy, postgres-migration, pruebas de humo de autenticación (Chromium), generate-progress y análisis estático JS/TS. Consultado vía `gh api repos/BTF14/micro-app/commits/main/check-runs` el 2026-10-25.
- **Riesgo P0 de identidad resuelto en código:** `apps/api/src/google-auth.ts` implementa OAuth 2.0 + OIDC con PKCE (S256), validación de `state` vía cookie de un solo uso, verificación server-side de `email_verified` contra el endpoint `userinfo` de Google, allowlist fail-closed (`auth_allowlist`), vinculación automática por email con protección anti-reenlace (`identity_mismatch` si el `google_sub` no coincide), y bootstrap administrativo sellado de un solo uso (`auth_bootstrap`, fila única con `FOR UPDATE`). `POST /auth/login` y `POST /auth/register` quedaron retirados (503), confirmado por revisión manual del diff completo contra `main` antes de fusionar.
- Migración `0002_google_identity.sql` probada primero en una rama Neon aislada y desechable (`google-identity-verify-temp`, creada y eliminada en esta sesión) corriendo `0002_google_identity.assertions.sql`; todas las aserciones (unicidad de allowlist, sello de bootstrap, unicidad de `google_sub`) pasaron. Aplicada después a Neon `main` (proyecto `restless-fire-99110035`) el 2026-10-25.
- **Pendiente para que el login funcione de extremo a extremo:** configurar `GOOGLE_REDIRECT_URI`, `BOOTSTRAP_TOKEN` (secreto de un solo uso, generado en esta sesión) y confirmar `FRONTEND_ORIGIN` como variables del Worker `micro-app-api` en el dashboard de Cloudflare; luego completar el primer login con `bootstrap_token`/`org_name`/`org_slug` para crear la organización y el usuario owner del dueño del negocio. Ninguno de estos tres pasos se ha confirmado completado todavía.
- El Worker `micro-app-api` se redeployó automáticamente a producción al fusionar (el check `Workers Builds: micro-app-api` fue el deploy real, no solo validación), así que el código de Google OAuth ya está en vivo aunque el login no funcionará hasta configurar las variables pendientes arriba.
- Nota operativa: durante esta sesión, los ajustes de "Comando de vista previa" en el proyecto Cloudflare del Worker se quedaron pegados en `npx wrangler preview` (comando beta inválido para CI) pese a guardarse correctamente y a limpiar la caché de compilación; solo se resolvió desconectando y reconectando la integración Git del proyecto en el dashboard. Si vuelve a ocurrir un build con comando de despliegue obsoleto pese a una configuración guardada correcta, probar esa reconexión antes que otra cosa.

---

# Estado vivo — 2026-10-22: seguridad y CI actualizados

- PR #76 integró en `main` el workflow de Gitleaks con checkout completo, reglas adicionales de `.gitignore` y checklist realista de exposición. Merge commit: `5f33e82fc7a6d3e77b6b97d912034f2a2ee7c2b0`.
- En ese SHA, los ocho checks consultados terminaron en success: Gitleaks [39862510779](https://github.com/BTF14/Micro-app/actions/runs/39862510779), CI [39862510861](https://github.com/BTF14/Micro-app/actions/runs/39862510861), Playwright E2E [39862510771](https://github.com/BTF14/Micro-app/actions/runs/39862510771), migración [39862510667](https://github.com/BTF14/Micro-app/actions/runs/39862510667), Semgrep [39862510847](https://github.com/BTF14/Micro-app/actions/runs/39862510847), Trivy [39862510870](https://github.com/BTF14/Micro-app/actions/runs/39862510870), dashboard [39862510823](https://github.com/BTF14/Micro-app/actions/runs/39862510823) y Cloudflare Pages preview; los checks externos de despliegue también pasaron.
- El log real de Gitleaks para ese SHA indica **613 commits escaneados, aproximadamente 1.74 MB y “no leaks found”**. Esto aplica al historial alcanzable desde el checkout de `main`; no certifica todas las ramas, artifacts, logs, releases ni sistemas externos.
- PR #74 se cerró como supersedida porque su rama estaba divergida y no era mergeable. Sus cambios relevantes se rebasaron limpiamente en PR #76; no se integraron sus checkpoints históricos obsoletos.
- PR #71 sigue integrada: `resolveTenantContext` valida sesión/membresía activa y devuelve el rol, pero no autoriza operaciones comerciales y aún no está conectada a rutas de negocio.
- **Riesgo P0 pendiente de decisión de identidad:** [issue #53](https://github.com/BTF14/Micro-app/issues/53) ahora registra que `POST /auth/register` está bloqueado, pero `POST /auth/login` sigue aceptando contraseña para cuentas activas sin aplicar la política Google sign-in + allowlist. No sabemos si hay cuentas reales afectadas. No deshabilitar el login sin evaluar el impacto ni inventar la política D1–D8.
- GitHub reportó `main` sin protección. La conexión usada no permite configurar branch protection/required checks en Settings; requiere acción administrativa allí. No asumir que Gitleaks verde habilita la publicación/operación comercial.
- Arquitectura canónica: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. Sin despliegue de producción, sin mutaciones de Neon `main`, sin facturación ni secretos expuestos.

## Próximas prioridades
1. Resolver las decisiones D1–D8 de identidad en `docs/sdd/auth-policy-decision-record.md` y completar la política de acceso en todos los puntos de entrada.
2. Obtener aprobación de la matriz de permisos por rol antes de implementar handlers comerciales.
3. Activar protección de `main`, checks requeridos y las opciones de secret scanning/push protection disponibles desde GitHub Settings.
4. Mantener pruebas con PostgreSQL efímero; no probar contra Neon `main`.

---


# Actualización de verificación — 2026-10-22 21:58 UTC

- Resultado final confirmado para PR #71 en SHA `ef86738991fbed58090d191ffbb865e4e8f18588`: los ocho checks de GitHub que se consultaron terminaron en success: CI [39861207434](https://github.com/BTF14/Micro-app/actions/runs/39861207434), Playwright [39861207395](https://github.com/BTF14/Micro-app/actions/runs/39861207395), migraciones [39861207581](https://github.com/BTF14/Micro-app/actions/runs/39861207581), Trivy PR [39861207344](https://github.com/BTF14/Micro-app/actions/runs/39861207344), Semgrep [39861207331](https://github.com/BTF14/Micro-app/actions/runs/39861207331), dashboard [39861207369](https://github.com/BTF14/Micro-app/actions/runs/39861207369), comentarios automáticos de preview del hosting y Cloudflare Pages preview. Los dos contextos de status del proveedor externo también estaban en success.
- En particular, Playwright llegó al paso `Run browser tests` y terminó success; no fue solo una comprobación de instalación.
- La verificación corresponde al SHA indicado. Los cambios documentales que se hagan después producen un nuevo head y deben revisarse por SHA; no confundir el resultado de este head con un head futuro.
- PR #71 sigue abierta y draft. No se fusionó. Próximo paso: revisión funcional/seguridad del alcance de `resolveTenantContext` y decisión de si la utilidad está lista para uso por rutas, antes de sacarla de draft. No desplegar producción ni tocar Neon `main`.

---

# Checkpoint vivo — 2026-10-22: Playwright fix integrado y PR #71 revalidándose

- PR #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75) se revisó y fusionó por squash en `main`. Commit resultante: `3a6d8211d21cc3fbbff2cd476d8fa80adb65cd3f`. Cambio exclusivo de workflow; sin cambios de app, Neon ni deploy de producción.
- En `main`, todos los seis workflows terminaron en success en ese commit: CI [39860846216](https://github.com/BTF14/Micro-app/actions/runs/39860846216), Playwright E2E [39860846233](https://github.com/BTF14/Micro-app/actions/runs/39860846233), migraciones [39860846364](https://github.com/BTF14/Micro-app/actions/runs/39860846364), Semgrep [39860846524](https://github.com/BTF14/Micro-app/actions/runs/39860846524), security scan [39860846214](https://github.com/BTF14/Micro-app/actions/runs/39860846214) y dashboard [39860846210](https://github.com/BTF14/Micro-app/actions/runs/39860846210). dos contextos externos de hosting también aparecen success para ese SHA.
- Se sincronizó `.github/workflows/playwright-e2e.yml` en la rama de PR #71 (`feat/tenant-context-resolver`) con el workflow validado de `main`; commit de sincronización inicial `a3301896c2936ce6d50698a0d05ad920e656fe7a`. Esto es necesario porque GitHub evalúa el workflow que está en la rama del PR.
- Revalidación de PR #71 sobre SHA `a3301896c2936ce6d50698a0d05ad920e656fe7a`: CI [39861076234](https://github.com/BTF14/Micro-app/actions/runs/39861076234) success (build/typecheck, unit tests y PostgreSQL auth integration); migration [39861076210](https://github.com/BTF14/Micro-app/actions/runs/39861076210) success; security/Trivy [39861076123](https://github.com/BTF14/Micro-app/actions/runs/39861076123) success; Semgrep [39861076052](https://github.com/BTF14/Micro-app/actions/runs/39861076052) success; dashboard [39861076073](https://github.com/BTF14/Micro-app/actions/runs/39861076073) success; Playwright [39861076113](https://github.com/BTF14/Micro-app/actions/runs/39861076113) ya verificó con éxito que el browser bundled existe, pero al último chequeo seguía en `Run browser tests` (no declarar E2E final hasta que concluya).
- PR #71 sigue abierta y draft. No fusionar todavía. Esperar el resultado final de Playwright, actualizar el SHA/head después de cualquier commit documental y confirmar todos los checks del head más reciente. La función `resolveTenantContext` es una utilidad aislada nueva; revisar si el alcance de PR pretende solo introducirla o conectarla a rutas antes de sacar el PR de draft. No añadir integración de autorización por intuición: cada operación debe aplicar su política de permisos explícita.
- No se identificó un séptimo workflow distinto; la consulta actual muestra seis workflows Actions relevantes y dos contextos externos de hosting. No inventar un séptimo check.
- Arquitectura canónica: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. runtime de API alternativo sigue auxiliar/no canónica. Sin deploy de producción, cambios a Neon `main`, billing ni secretos expuestos.
- Próximo paso: confirmar Playwright E2E de PR #71, luego revisar el diff de resolver y documentar la conclusión con evidencia. Mantener presupuesto $0 y PR #71 draft hasta completar revisión.
 
---

# Checkpoint vivo — 2026-10-22: solución Playwright validada en PR #75

- El fallo repetido de PR #71 estaba localizado en el paso `Install Chromium and OS dependencies`; los tests de navegador no arrancaban y los logs del job devolvían 404 `BlobNotFound`. La causa interna del instalador original no quedó probada.
- Se creó PR draft #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75), rama `ci/playwright-container-runner`, head `09bc000d07672f731935d2bbc9e8b38f605eeb9d`. Cambia solo `.github/workflows/playwright-e2e.yml`: usa `mcr.microsoft.com/playwright:v1.55.0-noble` con Chromium/dependencias preinstalados y verifica el directorio del browser, evitando la instalación apt/browser que fallaba.
- Validación real de PR #75 en ese SHA: CI [39859323298](https://github.com/BTF14/Micro-app/actions/runs/39859323298), Playwright E2E [39859323412](https://github.com/BTF14/Micro-app/actions/runs/39859323412), migration [39859323422](https://github.com/BTF14/Micro-app/actions/runs/39859323422), Semgrep [39859323415](https://github.com/BTF14/Micro-app/actions/runs/39859323415), Trivy [39859323621](https://github.com/BTF14/Micro-app/actions/runs/39859323621) y dashboard [39859323191](https://github.com/BTF14/Micro-app/actions/runs/39859323191) terminaron todos en `success`. El browser tests step se ejecutó y pasó.
- PR #75 permanece draft y sin merge. La PR #71 sigue draft; su workflow E2E original seguirá fallando hasta que la corrección de workflow sea revisada e integrada. No fusionar por ahora sin revisar el PR y el estado vivo.
- PR #71 en head previo `fda9a20e2e0b0ca1b73f3af3a4577d0a7d6fc12c`: CI, migration, Semgrep, Trivy y progress dashboard pasaron. E2E falló en instalación de browser con el workflow antiguo. La funcionalidad del resolver y las pruebas de CI no se deben confundir con la prueba E2E, que solo pasa en PR #75.
- Arquitectura canónica sigue Cloudflare Pages + Cloudflare Workers/Hono + Neon Free; runtime de API alternativo continúa como auxiliar/no canónico. No hubo deploy de producción, cambios a Neon `main`, gasto ni exposición de secretos.

---
# Checkpoint vivo — 2026-10-22: GitHub Actions recuperado

- Visibilidad del repo confirmada como pública. GitHub-hosted runners ya ejecutan steps; la causa previa de los jobs sin steps no se atribuye retroactivamente a una causa específica.
- PR #71 sigue abierta/draft, rama `feat/tenant-context-resolver`, head observado antes de este checkpoint: `8d938ab5726d357bd9f9f79385af54bbd42c4f2f`. Al añadir este checkpoint el SHA cambiará; consultar el head vivo después del commit.
- Reintentos sobre ese head: CI run [39426320145](https://github.com/BTF14/Micro-app/actions/runs/39426320145) success (build/typecheck, unit tests y auth integration contra PostgreSQL efímero); migración run [39426320271](https://github.com/BTF14/Micro-app/actions/runs/39426320271) success; Semgrep [39426320136](https://github.com/BTF14/Micro-app/actions/runs/39426320136) success; Trivy [39426320487](https://github.com/BTF14/Micro-app/actions/runs/39426320487) success; progress dashboard [39426320168](https://github.com/BTF14/Micro-app/actions/runs/39426320168) success.
- Playwright E2E run [39426320240](https://github.com/BTF14/Micro-app/actions/runs/39426320240), intento 3, falla en el paso `Install Chromium and OS dependencies`; el paso de browser tests queda skipped. Los pasos anteriores, incluidos install de dependencias y setup del runner Playwright, pasan. La descarga de logs del job devuelve 404 `BlobNotFound`, así que la causa interna exacta (descarga de browser, apt/dependencias u otra) no está demostrada. No seguir reintentando en bucle ni afirmar que los tests E2E se ejecutaron. Resolver el paso de instalación con logs disponibles o un entorno de browser reproducible antes de quitar el bloqueo de PR.
- Existe además un run de Security scan anterior [39426310365](https://github.com/BTF14/Micro-app/actions/runs/39426310365) en failure sobre el mismo SHA por evento anterior; el run PR más reciente [39426320487](https://github.com/BTF14/Micro-app/actions/runs/39426320487) sí pasa. Distinguir runs por evento/intento, no reportar el check duplicado como un nuevo fallo de código.
- Check runs raw del SHA `8d938ab...` mostró seis workflows Actions relevantes y dos contextos externos de hosting exitosos; no se identificó un séptimo workflow distinto. El histórico reporte de siete errores no se debe completar con una suposición.
- La prueba de CI sí es evidencia real ahora que steps se ejecutan. No implica readiness de producción. PR #71 sigue draft hasta resolver Playwright y revisar los checks sobre el head final.
- Arquitectura aprobada del repo sigue siendo frontend Cloudflare Pages + API Cloudflare Workers/Hono + Neon Free, presupuesto $0. runtime de API alternativo es auxiliar/no canónico según los documentos; el error ESM histórico de despliegue alternativo no justifica reconfigurar el destino aprobado ni hacer deploy de producción.
- Sin deploy de producción, sin cambios a Neon `main`, sin migraciones a datos reales, sin billing ni secretos expuestos.

---
# Revisión viva — 2026-10-20 08:56 EDT (12:56 UTC)

> Esta revisión añade evidencia viva a los checkpoints históricos. El SHA anotado como head/base es el estado al comenzar esta revisión; las actualizaciones documentales de esta sesión crean commits nuevos y deben volver a verificarse después.

## GitHub / PRs al comenzar la revisión

- `main`: `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e` (confirmado con fetch_commit sobre ref `main`).
- PR #71: abierta, draft=true, base `main`, base SHA `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`; head de PR `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2`, rama declarada `feat/tenant-context-resolver`. Este SHA reemplaza el snapshot anterior `a4806b69a2d12225234e7a8fc72c1116957d0318`.
- PR #68 abierta, no draft; head `5d3770a23e07855f68b07e6327c83545c76e1c95`, base SHA `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`.
- PR #69 abierta, no draft; head `611f5274b5f422abe5421aef95aa77b500be7740`, misma base.
- PR #70 abierta, draft=true; head `8bdb410bf2755efdeb6db35f22bae7c8b00acf25`, misma base.
- Comentario de diagnóstico previo en PR #71 sigue presente: https://github.com/BTF14/Micro-app/pull/71#issuecomment-6289785588. No se duplicó. El bot de Cloudflare también reporta preview exitosa para el commit `f0f489f`: https://01bc0d05.micro-app-63i.pages.dev (preview, no producción).

## GitHub Actions: seis workflows actuales recuperados; el séptimo sigue sin identificar

La consulta de workflow runs asociada al head `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2` devuelve estos seis runs completos en failure. Los jobs expuestos por el conector tienen cero steps; cada descarga de logs probada devuelve HTTP 404 `BlobNotFound`. No es evidencia de tests o código fallidos: los comandos de los workflows no aparecen ejecutados.

| Workflow | Run ID | Job | Job ID | Conclusión |
|---|---:|---|---:|---|
| Project progress dashboard | 39424411848 | generate-progress | 118633193726 | failure |
| Database migration validation | 39424411977 | postgres-migration | 118633195889 | failure |
| CI | 39424412060 | verify | 118633195741 | failure |
| Semgrep SAST | 39424411782 | JavaScript and TypeScript static analysis | 118633196350 | failure |
| Security scan | 39424411907 | Trivy filesystem and configuration scan | 118633194852 | failure |
| Playwright E2E | 39424412144 | Chromium authentication smoke tests | 118633196016 | failure |

- Intentos: el wrapper de runs no expone `run_attempt` ni los timestamps completos para estos registros; por tanto, no se afirma el número de intento actual. Los jobs listados son los jobs devueltos para cada run consultado.
- Evidencia de cada job actual: `fetch_workflow_job_steps` devolvió `steps: []`; `fetch_workflow_job_logs` devolvió 404 `BlobNotFound` para los seis job IDs anteriores.
- Runs anteriores observados en el checkpoint: progress `39413291257`, Playwright `39413291129`, CI `39413291311`, Semgrep `39413291252`, Security `39413291137`, migraciones `39413291456`; también se documentaron job IDs iniciales/reintentados allí. No asumir que esos runs pertenecen al head actual sin metadatos SHA.
- El endpoint de combined status consultado para el head actual solo devuelve dos contextos externos de hosting en `success` (`micro-app-7lg5` y `micro-app`); no enumera los check-runs de Actions. La interfaz/usuario reporta siete errores, pero la conexión disponible solo permitió identificar seis workflow runs fallidos. **Séptimo check: no identificado / pendiente**, no inventar nombre ni causa. Hace falta la lista raw de check-runs o captura/URL del séptimo check desde GitHub.
- El patrón de seis jobs con cero steps y logs no disponibles sugiere fallo anterior a la ejecución de steps o indisponibilidad de almacenamiento de logs; no demuestra la causa raíz de la asignación de runner. No repetir re-runs sin nueva evidencia.
- No se ejecutaron tests del checkout real en esta sesión. Solo sigue constando la verificación histórica aislada: smoke harness 3/3 y TypeScript estricto contra interfaz mínima; no sustituye Vitest, build workspace, pruebas PostgreSQL ni Playwright.

## Auditoría de hosting — 2026-10-30

- Arquitectura operativa del proyecto: frontend estático en Cloudflare Pages, API Hono en Cloudflare Workers y PostgreSQL en Neon.
- Se revisó el árbol completo de `main` (191 entradas) y las búsquedas del repositorio. No hay archivos de configuración, directorios locales, dependencias, CLI/comandos de despliegue ni workflows de un proveedor de hosting alternativo. Se retiraron las referencias de los documentos operativos; el diario append-only conserva hechos históricos.
- No se modificó ninguna cuenta externa, integración de GitHub, webhook, deployment ni configuración de Cloudflare. El endpoint de protección de rama devolvió 403, por lo que no se afirma haber inspeccionado o cambiado GitHub App/branch protection.
- `VITE_API_BASE_URL` **se conserva**: es una variable pública de build de Vite, no una integración de hosting. `apps/web/.env.production` apunta al Worker y `vite.config.ts` la carga con `loadEnv`. El bundle JS publicado aún no pudo inspeccionarse; no afirmar que el valor compilado está verificado.
- El status combinado consultado para el SHA actual de `main` no devolvió checks externos. En PR #178 los checks observados son GitHub Actions y previews de Cloudflare Pages/Workers.
- Se encontró una única rama heredada asociada a PR #72 (cerrada sin merge): 3 commits propios y 277 commits detrás de `main`, con cambios antiguos de imports ESM en tres archivos API ya supersedidos por el código actual. Se creó `archive/legacy-api-esm-experiment-20261020` en el HEAD exacto `b1330a5fa547071a5f500f0481ce88109c612f81` para preservar esos commits. La referencia original todavía no se pudo borrar: la sesión de navegador GitHub no está autenticada y el conector no expone borrado de ramas. No forzar ni reescribir la rama.

## Cambios y límites de esta revisión

- No se cambió código de aplicación ni configuración de despliegue. Se actualizará documentación existente en esta misma rama para conservar el handoff.
- No se ejecutó build/test real del repositorio ni smoke HTTP de API en esta sesión; no se tuvo un checkout local funcional. Los logs de Actions no están disponibles.
- No se desplegó producción, no se alteró Neon `main`, no se ejecutaron migraciones y no se expusieron secretos.
- Siguiente paso: conseguir el séptimo check vía raw check-runs, recuperar logs/runners cuando GitHub permita hacerlo, y ejecutar una prueba de runtime en un entorno reproducible. Mantener PR #71 draft hasta tener CI ejecutable sobre el SHA final.

---

# Archivo histórico — checkpoint 2026-10-20 (supersedido)

El diagnóstico de despliegue alternativo y el estado de PR #71 de esta fecha ya no son instrucciones operativas. La arquitectura vigente es Cloudflare Pages + Cloudflare Workers/Hono + Neon. Los estados de GitHub, los checks y los despliegues deben consultarse en vivo; no reactivar ni reparar un runtime de hosting paralelo.

# Checkpoint autoritativo — 2026-10-19, después de PR #64

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- `main` incluye PR #64 por squash: `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`. PR #63 merge SHA: `b4b417ec5a85b8b0c48b606c718c341745af9055`; PR #62 merge SHA: `d107cfb2b80c4165ed39e3071f8256942898ffb7`; PR #61 merge SHA: `1b8098ff00e0bb7482200b486710a5611f1e109d`.
- PR #63 fusionada; sus siete workflows terminaron en success sobre el head exacto `6baffe8fb473128504361c28fd6ac0c0e01519d9`. PR #64 fusionada; seis workflows consultados terminaron en success sobre el head exacto `97088a2d0d599001f145f4e60f72556a66a5f8b4`: CI, Playwright E2E, Security scan, Semgrep SAST, database migration validation y project progress dashboard. No se ejecutaron tests locales; los workflows no certifican readiness de producción.
- PR #60 está cerrada como supersedida, no fusionada. La comparación confirmó que la política de autonomía/revisión manual quedó integrada por PR #62/#63; no se reintrodujo el handoff histórico obsoleto. No hubo force-push.
- PR #64 añadió cuatro skills de proyecto bajo `.agents/skills/`: `micro-app-auth-security`, `micro-app-postgres-testing`, `micro-app-stack-guidance` y `micro-app-skill-curation`, además de `docs/AUTOSKILLS_ADOPTION.md`. Son instrucciones locales creadas para Micro app, no bundles externos descargados.
- AutoSkills: se inspeccionaron la web, el repositorio y entradas del registro curado. El intento de preparar un checkout temporal falló por DNS al resolver `github.com`; la CLI `npx autoskills --dry-run` no llegó a ejecutarse. No afirmar instalación externa ni crear un `skills-lock.json` ficticio. Próximo paso: repetir dry-run en un checkout con red y revisar propuesta/licencia/hash antes de instalar.
- P0 de identidad sigue pendiente: Google sign-in + allowlist no está implementado; D1–D8 y matriz de permisos por rol siguen sin aprobación. `POST /auth/register` permanece fail-closed. La ruta de login por contraseña sigue existiendo; no afirmar que una allowlist la protege.
- No inventar emails/dominios, configuración OAuth, bootstrap admin ni vinculación de cuentas. No tocar producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. Presupuesto $0.
- La aplicación NO está lista para producción. Backups/restauración independiente, handlers comerciales, aislamiento tenant completo, permisos aprobados, E2E reales y controles de concurrencia/idempotencia siguen pendientes. Strix sigue documentado, no instalado/ejecutado.
- PR #64 generó una vista previa de rama por la integración automática de Cloudflare; no fue despliegue productivo ni se activó manualmente.

## Próximos pasos
1. En un entorno con red, ejecutar `npx autoskills --dry-run`; seleccionar únicamente skills compatibles con React/Vite, Hono/Workers, TypeScript, Neon y pruebas, verificando licencia y hash. Registrar la salida real.
2. Continuar revisión estática y pruebas aisladas de auth/sesión/autorización. No implementar decisiones D1–D8 ni permisos hasta su aprobación.
3. Comparar `feat/neon-transaction-adapter` contra el `main` vivo sin merge ciego.
4. Mantener handoff, plan y diario actualizados con SHA/checks exactos; no desplegar producción ni mutar Neon `main`.

--- Checkpoint autoritativo — 2026-10-19, después de PR #57

- Repositorio: https://github.com/BTF14/Micro-app
- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe` — https://github.com/BTF14/Micro-app/commit/cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe.
- PR #55 y #56 fusionadas para continuidad documental; PR #57 fusionada: https://github.com/BTF14/Micro-app/pull/57.
- PR #57 bloquea `POST /auth/register`: después de validar Origin devuelve `503 REGISTRATION_DISABLED` antes de parsear credenciales o acceder a la DB. No crea usuarios, organizaciones, membresías, sesiones ni rate-limit rows, y no emite cookie en el camino bloqueado.
- Checks de PR #57 en el head exacto `71d3e6d3ffe625b12807e9942ddd261e222cf093`: verify, PostgreSQL auth integration, Chromium smoke, JS/TS static analysis, Trivy, migration validation, generate-progress y Cloudflare Pages terminaron en success. Los checks consultados en el merge SHA también terminaron en success. No se ejecutaron pruebas locales.
- Cloudflare reportó un Preview URL para el SHA fusionado: https://1d3d60bf.micro-app-63i.pages.dev. No hay evidencia en ese check de un despliegue productivo.
- Issue P0 #53 permanece abierto: el registro está bloqueado temporalmente, pero Google sign-in + allowlist no está implementado y D1–D8 siguen sin aprobarse. No cerrar el issue hasta implementar y probar el flujo aprobado.
- La rama `feat/neon-transaction-adapter` se comparó otra vez con `main`: divergida, 14 commits propios y 76 commits detrás, merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`. El adaptador `database.ts` y workflow de seguridad son idénticos a main; la prueba de DB en la rama es más antigua, `apps/api/package.json` usa un script de test incompatible con la separación de integración actual, y sus documentos están desactualizados. **No fusionar la rama completa**.
- Matriz de roles/permisos sigue sin aprobación; no crear rutas comerciales autorizadas según supuestos.
- App **NO lista para producción**: falta Google OAuth/allowlist, permisos aprobados, handlers de POS/inventario/ventas, aislamiento tenant real, E2E real, idempotencia/concurrencia, validación fiscal y backup/restauración independiente.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado, no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main` ni mezcla con Cantina-pos.

## Próximos pasos
1. Pedir al propietario la aprobación explícita de la política de identidad D1–D8 y matriz de roles; usar las recomendaciones documentadas como propuesta, no como decisiones ya aprobadas.
2. Mantener el registro fail-closed hasta que la política de identidad se implemente y pruebe.
3. Continuar con pruebas de auth/sesión y preparación de la primera ruta comercial solo después de aprobar los permisos.
4. Mantener cambios pequeños, PRs y verificación por SHA exacto.
5. No fusionar `feat/neon-transaction-adapter` completa; rescatar solo un cambio concreto si aparece una necesidad comprobada.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #55

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado después del merge: `b7117f8aeb868e25c49db86a524405511cd3c9be` — https://github.com/BTF14/Micro-app/commit/b7117f8aeb868e25c49db86a524405511cd3c9be.
- PR #55 fusionada: https://github.com/BTF14/Micro-app/pull/55. Solo añade el checkpoint de continuidad tras PR #54.
- Los 8 check-runs consultados para el head exacto de PR #55 `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28` terminaron en `success`: Cloudflare Pages (preview de rama, no producción), Trivy filesystem/config (dos ejecuciones), análisis estático JS/TS, verify, postgres-migration, Chromium authentication smoke tests y generate-progress. No se ejecutaron pruebas localmente ni se verificaron estos checks independientemente sobre el merge SHA.
- No hay PR abiertas en el momento de esta consulta.
- Issue P0 #53 continúa abierto: https://github.com/BTF14/Micro-app/issues/53. El registro público de `apps/api/src/auth.ts` sigue sin una política de identidad Google + allowlist demostrada. No afirmar que el alta pública esté bloqueada.
- D1–D8 de identidad y la matriz de permisos por rol siguen sin aprobación. No inventar proveedor OAuth, allowlist, bootstrap administrativo, verificación de correo, linking/recuperación ni permisos.
- La app NO está lista para producción: faltan handlers comerciales completos, pruebas reales API+PostgreSQL y aislamiento tenant aplicado/verificado, idempotencia/concurrencia, revisión fiscal y backup/restauración independiente.
- Preview de la rama #55: https://docs-checkpoint-after-pr54.micro-app-63i.pages.dev. Es un preview documental, no una aprobación de lanzamiento ni despliegue productivo.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado solamente: no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main`, producción ni mezcla con Cantina-pos.

## Siguiente paso
1. Solicitar al usuario aprobación explícita de las decisiones de identidad/roles que solo él puede fijar; facilitar opciones breves en el chat.
2. Mientras tanto, continuar revisión estática de seguridad y pruebas de bajo riesgo que no dependan de decisiones pendientes.
3. Mantener PRs pequeñas, revisar diff completo y comprobar checks del SHA exacto antes de fusionar.
4. Actualizar este documento, el handoff, plan y diario al siguiente hito.
5. No fusionar `feat/neon-transaction-adapter` a ciegas; sigue requiriendo comparación con main actual.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #51

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98` — https://github.com/BTF14/Micro-app/commit/e18a3ec267f4c4d0e02678a4c0522dabf200ac98
- PR #51 fusionada: https://github.com/BTF14/Micro-app/pull/51. Añade pruebas de error de base de datos para login y registro; las respuestas son seguras y no emiten cookie. Head probado `92ea991d6333bcd1b05943f679fdd36777ab6a8f`; seis workflows success: CI 39255462405, Playwright E2E 39255462498, migraciones 39255462284, Security scan 39255462264, Semgrep SAST 39255462627 y dashboard 39255462281.
- PR #50 fusionada: https://github.com/BTF14/Micro-app/pull/50. Login sin membresía activa o con organización inactiva no emite cookie. Head probado `dcad8d6d1caf6db3aabbc95465e5983ad0014746`; seis workflows success: CI 39255158169, Playwright E2E 39255157709, migraciones 39255158077, Security scan 39255157712, Semgrep SAST 39255157509 y dashboard 39255157611.
- PR #47–#48 añadieron cobertura para fallos de validación de sesión y usuarios inactivos; PR #49 actualizó documentación previa.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Inspeccionar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #48

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `420a64152103c90d2990d47c72fc19a744786fa6` — https://github.com/BTF14/Micro-app/commit/420a64152103c90d2990d47c72fc19a744786fa6
- PR #48 fusionada: https://github.com/BTF14/Micro-app/pull/48. Prueba que el login de una cuenta inactiva devuelve 401 sin crear cookie de sesión. Head probado: `6acb78018a47eb39f74dab079b53b51b4cacf11f`; los seis workflows terminaron en success: CI 39254257051, Playwright E2E 39254256939, migraciones 39254257076, Security scan 39254256854, Semgrep SAST 39254256882 y dashboard 39254256826.
- PR #47 fusionada: https://github.com/BTF14/Micro-app/pull/47. Prueba que `/auth/me` devuelve un error seguro y no limpia la cookie cuando la base de datos no permite validar la sesión. Head probado: `7939d11678cfd1a2bb8fac22664096663603c824`; seis workflows en success: CI 39253558854, Playwright E2E 39253558793, migraciones 39253558714, Security scan 39253558727, Semgrep SAST 39253558761 y dashboard 39253558724.
- PR #46 actualizó los documentos de continuidad después de PR #45.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Primero revisar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #45

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f` — https://github.com/BTF14/Micro-app/commit/1c6ecf6a4586ab1252a43210672e123975f8941f
- PR #45 fusionada: https://github.com/BTF14/Micro-app/pull/45. Añade una aserción en `apps/api/src/auth.integration.test.ts` para verificar que `/auth/me` elimina la cookie si la cuenta está inactiva.
- Head exacto de PR #45: `cdce44a9643c5134311f9603abf1248c07970df3`. Seis workflows de GitHub Actions terminaron en `success`: CI 39252317370, Playwright E2E 39252317397, migraciones 39252317371, Security scan 39252317467, Semgrep SAST 39252317386 y dashboard 39252317373.
- PR #44 cubre sesión revocada y organización inactiva; PR #43 cubre sesión expirada. No se ejecutaron pruebas localmente ni se verificaron aquí los workflows sobre el merge SHA.
- Prioridad siguiente: revisar autorización server-side y aislamiento tenant antes de añadir handlers comerciales. D1–D8 de Google OAuth/allowlist y la matriz de permisos siguen pendientes; no elegir políticas por suposición.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E con API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix está documentado, no instalado/ejecutado. Objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #41

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `3313bf4276563c6cdac52aa7902fa9ea36558014` — https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014
- PR #41 fusionada: https://github.com/BTF14/Micro-app/pull/41. Cambio: prueba de regresión para que el endpoint de logout no borre la cookie de sesión si falla la revocación del lado del servidor.
- Head exacto probado por GitHub Actions: `0c55c180846e6286e72d35f51e502278200ee0de`. Los seis workflows fueron `success`: CI (39244454840), Playwright E2E (39244454807), Security scan (39244454911), Semgrep SAST (39244454934), Project progress dashboard (39244454952) y Database migration validation (39244456648).
- Merge SHA: `3313bf4276563c6cdac52aa7902fa9ea36558014`. La consulta de workflows asociada al merge SHA no devolvió runs porque el conector filtra a eventos de PR; no afirmar que los seis workflows del merge SHA estén verificados. No se ejecutaron pruebas locales.
- Cambio acotado: solo `apps/api/src/index.test.ts`, 24 líneas añadidas. Usa una URL de base de datos sintética inválida; no contacta ni modifica una base real.
- No se tocaron secretos, billing, datos reales, Neon `main`, producción ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado, no instalado ni ejecutado.
- Estado del producto: **NO listo para producción**. Persisten endpoints comerciales incompletos, decisiones de identidad D1–D8 pendientes, matriz de permisos por aprobar, aislamiento multiempresa y flujos reales API+PostgreSQL por validar, idempotencia/concurrencia, requisitos fiscales y backup/restauración independiente por verificar.
- Rama `feat/neon-transaction-adapter`: divergida y desactualizada; no fusionar a ciegas. Recuperar solo cambios puntuales tras comparar con `main`.
- Siguiente paso: continuar con pruebas pequeñas de auth/sesión/autorización sin inventar políticas pendientes; mantener CI verificado por SHA exacto y coste objetivo $0. No desplegar producción ni mutar Neon `main` sin superar los gates documentados.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #39

## Estado verificado en GitHub

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `50c530084f8ce402d897962cbc7c4354c512e847` — https://github.com/BTF14/Micro-app/commit/50c530084f8ce402d897962cbc7c4354c512e847
- PR #39, prueba de que el error original de operación sobrevive cuando también falla el cierre del cliente: fusionada — https://github.com/BTF14/Micro-app/pull/39. Head probado: `134c9e14a5224d83c5f280dc501ae113d374c159`; merge SHA: `50c530084f8ce402d897962cbc7c4354c512e847`.
- Los seis workflows terminaron en `success` para el head exacto de PR #39 `134c9e14a5224d83c5f280dc501ae113d374c159`: CI (run 39243670711), Project progress dashboard (39243670742), Playwright E2E (39243670784), Database migration validation (39243670921), Semgrep SAST (39243670843) y Security scan (39243670950).
- PR #38 también está fusionada: https://github.com/BTF14/Micro-app/pull/38; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`. Sus seis workflows fueron `success` en el head exacto `527dd7cc62bcceae891add8100875cc395dd5cfa`.
- No se ejecutaron pruebas locales. Los resultados indicados son de GitHub Actions sobre los head SHA especificados. No se han verificado aquí workflows para el merge SHA de PR #39; no afirmar que el merge SHA esté completamente verde.
- No se desplegó producción, no se modificó Neon `main`, no se tocaron datos reales, secretos, facturación ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.
- Automatización diaria de continuidad creada previamente con ID `6ad4c8ce247881919e0c4e83e7358dcb`; verificar su estado en la plataforma si se necesita afirmar que está activa/ejecutándose. No es un bucle continuo en tiempo real.

## Estado funcional y bloqueos

La aplicación **NO está lista para producción**. Continúan pendientes: rutas comerciales completas para catálogo/proveedores/inventario/ventas/pagos/devoluciones/reportes; Google OAuth, allowlist y verificación de correo según las decisiones D1–D8 aún no aprobadas; matriz de permisos por rol; aislamiento multiempresa validado en todos los endpoints; pruebas reales de API + PostgreSQL para flujos de negocio; idempotencia y concurrencia de ventas/stock; cumplimiento fiscal; backups independientes y restauración ensayada; preview aislada y aprobación de lanzamiento.

## Próximos pasos

1. Continuar con pruebas de auth/sesión de alcance acotado sin inventar políticas de identidad o roles.
2. Revisar la rama `feat/neon-transaction-adapter` contra el `main` actual antes de cualquier decisión; no fusionarla a ciegas.
3. Mantener cambios pequeños en ramas/PR; exigir CI exitoso para el head SHA exacto y revisar diffs/reviews antes de merge.
4. Mantener el presupuesto objetivo en $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.
5. Corregir esta documentación al cerrar hitos; no usar snapshots históricos como evidencia del estado actual.

---

# Checkpoint de continuidad — 2026-10-19, después de PR #36

## Estado verificado

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `c15c2364cd19e55ac10b2331300e7a9f4b89813f` — https://github.com/BTF14/Micro-app/commit/c15c2364cd19e55ac10b2331300e7a9f4b89813f
- PR #35, checkpoint documental tras PR #34: fusionada — https://github.com/BTF14/Micro-app/pull/35. Merge SHA: `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36, validación estricta de hashes PBKDF2: fusionada — https://github.com/BTF14/Micro-app/pull/36. Head SHA probado por CI: `cf432de6d5e8752181bc1105e9d0e91384d5936c`; merge SHA: `c15c2364cd19e55ac10b2331300e7a9f4b89813f`.
- PR #36 cambió `apps/api/src/auth.ts` para rechazar hashes con campos `$` adicionales y valores de iteraciones no canónicos; añadió regresiones en `apps/api/src/auth.test.ts`.
- Los seis workflows de PR #36 terminaron en `success` para el head exacto `cf432de6d5e8752181bc1105e9d0e91384d5936c`:
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39241705903
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39241706090
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39241705951
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39241706070
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39241705989
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39241706068
- Los seis jobs consultados tras PR #34 (run IDs 39241150482, 39241150423, 39241150283, 39241150291, 39241150500 y 39241150556) reportaron `success`. La consulta disponible no devolvió metadatos suficientes para vincular cada run al SHA de merge `02c7cd61ef2e94545849746885dede12b2df7767`; no afirmar que ese SHA tiene checks confirmados hasta verificarlo por otro medio.
- No se ejecutaron pruebas locales en esta sesión. La evidencia de tests es GitHub Actions sobre el head de PR #36, no una ejecución local.
- No se desplegó producción ni se modificó Neon `main`; no se tocaron datos reales, secretos, billing ni Cantina-pos.

## Bloqueos de producto

- La aplicación NO está lista para producción: todavía no se ha verificado la implementación completa de rutas comerciales para catálogo, proveedores, inventario, ventas, pagos, devoluciones y reportes.
- Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen pendientes de aprobación; no inventar proveedor, política ni flujo de cuentas.
- La matriz de permisos por rol sigue pendiente de aprobación. No crear rutas comerciales asumiendo permisos.
- Playwright cubre smoke tests con API simulada; faltan pruebas E2E reales de API + PostgreSQL para flujos comerciales.
- Backups independientes y restauración real siguen sin verificarse. Revalidar protección de `main`; no asumir que está activada.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.

## Próximas acciones

1. Verificar los checks del SHA de merge `c15c2364cd19e55ac10b2331300e7a9f4b89813f` y registrar evidencia exacta si la plataforma la expone.
2. Continuar con pruebas de seguridad/auth de alcance pequeño, sin cambiar decisiones de identidad o permisos pendientes.
3. Mantener cambios en ramas + PR y esperar CI en el head SHA exacto antes de fusionar.
4. Actualizar este checkpoint y los documentos de estado tras cada cambio significativo.
5. Mantener coste objetivo $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates y autorizaciones requeridos por `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

# Checkpoint autoritativo — 2026-10-19, después de PR #31

> Revalidar GitHub en cada sesión antes de actuar; este bloque es un punto de partida, no sustituto de la verificación viva.

- Repositorio canónico: https://github.com/BTF14/Micro-app
- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 (matriz de decisiones de permisos por rol, todas pendientes de aprobación): https://github.com/BTF14/Micro-app/pull/30, fusionada.
- PR #31 (pruebas de sesiones/login cuando la organización está inactiva): https://github.com/BTF14/Micro-app/pull/31, fusionada; head de PR `cfb9f82a497b35aa5a27a4a9ea78476692cf254d`.
- Comprobación viva de Actions para el SHA exacto de main: 8 check-runs visibles: 6 success y 2 in_progress al momento de esta consulta; volver a verificar antes de declarar CI completamente verde.
  - Trivy filesystem and configuration scan: in_progress — https://github.com/BTF14/Micro-app/actions/runs/39176217202/job/117819320792
  - Cloudflare Pages: in_progress — https://github.com/BTF14/Micro-app/runs/117819318705
  - Chromium authentication smoke tests: success — https://github.com/BTF14/Micro-app/actions/runs/39175964317/job/117818569851
  - Trivy filesystem and configuration scan: success — https://github.com/BTF14/Micro-app/actions/runs/39175964296/job/117818569814
  - generate-progress: success — https://github.com/BTF14/Micro-app/actions/runs/39175964326/job/117818569804
  - postgres-migration: success — https://github.com/BTF14/Micro-app/actions/runs/39175964294/job/117818569740
  - JavaScript and TypeScript static analysis: success — https://github.com/BTF14/Micro-app/actions/runs/39175964287/job/117818569696
  - verify: success — https://github.com/BTF14/Micro-app/actions/runs/39175964298/job/117818569670
- PR #32 (esta actualización documental) está abierta: https://github.com/BTF14/Micro-app/pull/32; sus checks deben verificarse para el head SHA vigente antes de fusionar.
- No se ejecutaron pruebas locales en esta sesión. El estado de CI es evidencia de GitHub Actions, no certifica preparación comercial.
- Código verificado: `apps/api/src/index.ts` registra auth y health; aún no hay handlers HTTP comerciales para catálogo/productos, proveedores, compras, ventas, pagos ni movimientos de inventario.
- Autenticación: existen registro/login con contraseña, `/auth/me` y logout; Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen sin aprobar. No cambiar el modelo de registro ni inventar reglas de acceso.
- Permisos: `docs/sdd/role-permission-decision-matrix.md` está fusionado, pero cada celda sigue pendiente. No construir rutas comerciales asumiendo permisos por rol.
- La rama de Neon adapter no debe fusionarse ciegamente; la revisión anterior encontró 14 commits propios y 49 detrás de main, sin código único que justificara la fusión completa.
- Neon `main`: no se modificó. Backups independientes y restauración real: no verificados. Protección de branch main: estaba desactivada en la última comprobación; verificar de nuevo y no modificar sin necesidad/autoridad clara.
- Strix (`https://github.com/usestrix/strix.git`) solo está documentado; no instalado ni ejecutado.
- Límites: coste objetivo $0; no mezclar Cantina-pos; no secretos, correos, billing, datos reales, mutaciones en Neon main ni despliegues de producción sin superar los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

## Instrucciones obligatorias para la siguiente IA

1. Leer primero `AGENTS.md`, luego este checkpoint, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/CONSTITUTION.md`, `docs/PRODUCTION_READINESS.md` y `docs/BACKUP_AND_RECOVERY.md`.
2. Antes de cualquier cambio, comprobar en vivo el SHA de main, PR abiertas, checks del SHA exacto y estado de ramas. No usar los SHA históricos como evidencia actual.
3. Continuar autónomamente con cambios pequeños, reversibles y útiles; no pedir al usuario permisos ya concedidos. Documentar hallazgos y pruebas reales, sin afirmar que algo se ejecutó si solo se leyó el código.
4. Próxima prioridad técnica: diseñar el primer endpoint comercial solo después de obtener aprobación explícita de la matriz de roles; hasta entonces, revisar fallos de seguridad concretos, ampliar pruebas de infraestructura/auth sin cambiar la política de identidad, y preparar contrato/criterios de aceptación sin exponer rutas inseguras.
5. D1–D8 de identidad y matriz de permisos necesitan decisión del propietario. No inventar proveedor OAuth, allowlist, email/domains, bootstrap admin, vinculación de cuentas, permisos de roles ni fiscalidad.
6. No desplegar producción ni modificar Neon main hasta cumplir gates y recibir aprobación específica cuando corresponda. Mantener presupuesto $0 y no tocar datos reales.
7. Si la conversación se acerca al límite, actualizar este archivo, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` y `docs/PROJECT_PLAN.md` en una rama/PR; incluir SHA, PR/merge, checks exactos, cambios, tests ejecutados/no ejecutados, riesgos y siguiente acción concreta. Abrir PR y esperar CI; no declarar merge sin evidencia.
8. No detener el trabajo solo por falta de una respuesta de “ok”. Detenerse únicamente ante decisión de producto necesaria, riesgo alto o bloqueo real; explicar la decisión mínima requerida.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #27

> **Esta sección prevalece sobre los snapshots históricos más abajo.** Verificar de nuevo GitHub antes de usar este estado en una sesión futura.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- PR #27, [refresco del checkpoint después de PR #26](https://github.com/BTF14/Micro-app/pull/27), está fusionada. Head revisado: `29f899a52346d342067cf8e1b22850d35aa48a69`; los ocho check-runs visibles en ese head terminaron en `success`.
- Para el merge commit de `main`, los siete checks consultados terminaron en `success`: [Cloudflare Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [smoke tests Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify/CI](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [análisis JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812) y [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No había PR abiertas en la consulta posterior al merge. No se ejecutaron pruebas locales en esta sesión; la evidencia indicada es de GitHub Actions para los SHA exactos.
- Estado del producto: **no listo para producción**. La API aún no registra handlers HTTP comerciales para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de aislamiento es un plan de aceptación, no evidencia de controles en rutas inexistentes.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 siguen pendientes de aprobación; roles/permisos por operación deben definirse antes de añadir rutas de negocio; no se han verificado backups/restauración independiente; la protección de `main` estaba desactivada en la última comprobación.
- Límites mantenidos: presupuesto $0, proyecto independiente de Cantina-pos, sin secretos ni correos, sin cambios a Neon `main`, sin despliegue de producción. Strix sigue documentado, no instalado ni ejecutado.
- Próximo paso seguro: continuar la revisión del adaptador Neon sin merge ciego y preparar una matriz explícita de permisos por rol para que el primer endpoint comercial tenga pruebas positivas y negativas de aislamiento; no inventar políticas pendientes.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #26

> **Esta sección prevalece sobre todos los snapshots históricos más abajo.** Los SHA, estados de PR y enlaces de Actions antiguos que aparezcan en el resto de este archivo no representan el estado vivo actual salvo que coincidan con una verificación nueva de GitHub.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c` — https://github.com/BTF14/Micro-app/commit/a3cc3ae7533510baf2502a3f553030c2c8505a4c
- PR #24 (matriz de aislamiento tenant), PR #25 (refresco documental) y PR #26 (checkpoint documental) están fusionadas.
- PR #26: https://github.com/BTF14/Micro-app/pull/26; head `a5576ae3db9b606bbb69fa3c7f34006e6585934e`; sus siete workflows consultados terminaron en `success`.
- Para el SHA exacto de `main` `a3cc3ae7533510baf2502a3f553030c2c8505a4c`, los seis workflows consultados terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39133032751), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39133032760), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39133032817), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39133032755), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39133032686) y [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No hay PR abiertas en la consulta actual. No se desplegó producción ni se modificó Neon `main`.
- Estado de producto: **no listo para producción**. `apps/api/src/index.ts` todavía no registra handlers HTTP de negocio para catálogo/productos, proveedores, ventas, pagos o movimientos de inventario; la matriz de tenant define criterios futuros, no evidencia de endpoints ya protegidos.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 pendientes de aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última verificación; faltan flujos POS/inventario reales y pruebas de autorización completas.
- Límites: presupuesto $0, no mezclar con Cantina-pos, no secretos ni correos, no migraciones a Neon `main` sin superar el gate de `docs/CONSTITUTION.md`, no despliegue de producción sin aceptación explícita.
- Próximo trabajo seguro: abordar identidad solo tras resolver D1–D8; mientras tanto, ampliar cobertura de autorización y preparar endpoints de negocio en entorno aislado, sin inventar políticas de registro ni OAuth.

---


# Estado vigente verificado — Micro app

**Checkpoint actualizado:** 2026-10-18.  
**HEAD de `main` verificado:** `69032a333b52ee10099c0347be3443e18f4dc4df` — [commit](https://github.com/BTF14/Micro-app/commit/69032a333b52ee10099c0347be3443e18f4dc4df).  
**PR #24 fusionada:** [matriz de aceptación para aislamiento tenant](https://github.com/BTF14/Micro-app/pull/24). Su head `e7856319321f1aa1047148fd782fcadb77f091c2` tuvo los siete workflows asociados en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39132363061), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39132363092), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39132363114), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39132363103), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39132363026) y los dos escaneos de seguridad ([1](https://github.com/BTF14/Micro-app/actions/runs/39132362959), [2](https://github.com/BTF14/Micro-app/actions/runs/39132359995)).  
**Checks del merge commit:** seis workflows detectados; el panel de progreso ya pasó y CI, Playwright, seguridad, Semgrep y validación de migraciones seguían en ejecución en la última consulta. Verificar su estado para este SHA antes de concluir que el merge commit está verde.

**Hallazgo de autorización:** `apps/api/src/index.ts` registra health y rutas de autenticación. No hay handlers HTTP de negocio para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de `docs/TENANT_ISOLATION_TEST_PLAN.md` define aceptación futura; no demuestra aislamiento funcional en endpoints que aún no existen.

**Bloqueos:** Google OAuth + allowlist y decisiones D1–D8 siguen sin aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última lectura; no desplegar producción ni modificar Neon `main` sin superar los gates de la Constitución. Los workflows verdes de documentación no certifican preparación para producción.

---


**Verificado:** 2026-10-18 (consulta directa a GitHub API y archivos de `main`).  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Propósito:** referencia breve de estado vivo. Este archivo prevalece sobre snapshots históricos de `PROJECT_PLAN.md`, `STATE_JOURNAL.md` y `HANDOFF_NEXT_CHAT.md` cuando sus SHA/estados contradigan los datos aquí. Antes de cada cambio, repetir la consulta en vivo.

## Estado Git y CI

- `main`: `1e48eb9b2056a0d472f69a7cd62c1b3930d27c13` — [commit](https://github.com/BTF14/Micro-app/commit/1e48eb9b2056a0d472f69a7cd62c1b3930d27c13).
- PR abiertas: ninguna en la consulta de GitHub.
- Para ese SHA exacto, los seis workflows más recientes consultados terminaron en `success`:
  - [CI](https://github.com/BTF14/Micro-app/actions/runs/39131400317)
  - [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39131400310)
  - [Validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39131400321)
  - [Panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39131400327)
  - [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39131400368)
  - [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39131400390)
- La rama `main` no tiene protección activa ni checks obligatorios configurados (`protected=false`). Es un riesgo de gobernanza pendiente; no se ha cambiado la configuración.
- Estos workflows verdes no demuestran que el producto esté listo para producción.

## Bloqueos y siguientes prioridades

1. **P0 identidad:** revisión estática de `apps/api/src/auth.ts` en el `main` indicado encontró solo `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no encontró Google OAuth, allowlist ni verificación de email. Las decisiones D1–D8 en `docs/sdd/auth-policy-decision-record.md` continúan expresamente sin aprobar. No inventar correos/dominios, bootstrap de administrador, política de organizaciones ni vinculación de cuentas. No activar OAuth ni enviar correos sin resolver las decisiones y configurar los secretos de forma segura.
2. **Adaptador Neon:** `feat/neon-transaction-adapter` (`7989a84e39536029819735a5202f3934a8eb12c3`) está divergida respecto a este `main`: 14 commits por delante, 43 por detrás; el merge-base es `2d2099245f2404b0a8d3689189235a577d5e632c`. El diff resumido enumera siete archivos: workflow de seguridad, paquete API, pruebas y adaptador de base de datos, integración API y dos documentos de seguridad/cumplimiento. No fusionar a ciegas; hacer revisión archivo por archivo y rescatar cambios por separado.
3. Ampliar pruebas de identidad, sesiones, autorización y aislamiento entre tenants con PostgreSQL efímero; no confundir E2E con API simulada con integración real.
4. Verificar automatización de backups y restauración real independiente; no se ha demostrado que estén operativas.
5. Seguir el checklist `docs/PRODUCTION_READINESS.md`; la app aún no está lista para despliegue comercial.

## Límites operativos

- Mantener coste objetivo $0 y separación absoluta de Cantina-pos.
- No exponer secretos ni enviar correos.
- No hacer despliegue de producción sin aprobación explícita.
- Para Neon `main`, seguir el gate de cambio de producción de `docs/CONSTITUTION.md`; probar primero en entorno aislado y no ejecutar cambios destructivos/ambiguos sin aprobación.
- Strix está documentado, pero no instalado ni ejecutado; solo evaluar en laboratorio aislado con datos sintéticos y coste confirmado $0.
- No declarar pruebas locales, instalaciones, agentes o ejecuciones autónomas como hechos si no existe evidencia.

## Protocolo de actualización

Después de cada cambio significativo, actualizar este archivo y el diario/handoff pertinentes; registrar el SHA y enlaces de Actions para ese SHA exacto. Si `main` avanza, actualizar primero este checkpoint en lugar de copiar estados antiguos.


## Revisión preliminar de `feat/neon-transaction-adapter` (2026-10-18)

Se compararon los siete archivos enumerados por GitHub al contrastar la rama con el `main` actual. Hallazgos verificables:

- `.github/workflows/security-scan.yml`, `apps/api/src/database.ts` y `apps/api/src/database.test.ts` tienen el mismo blob SHA en la rama y en `main`; no aportan diferencias actuales.
- `apps/api/package.json` difiere: la rama usa `vitest run`, mientras que `main` excluye los archivos `*.integration.test.ts` del comando unitario. No restaurar el script antiguo sin revisar cómo CI ejecuta las pruebas de integración.
- `docs/API_INTEGRATION.md`, `docs/COMPLIANCE_REQUIREMENTS.md` y `docs/SECURITY_PLAN_2026.md` están desactualizados respecto a sus versiones de `main` y podrían reintroducir afirmaciones ya corregidas.
- Con esta comparación no aparece una implementación de adaptador o pruebas unitarias que falte rescatar de esa rama: los archivos centrales del adaptador ya coinciden con `main`. La rama no debe fusionarse; si se necesita rescatar algo, hacerlo como cambios puntuales después de revisión, no mediante merge.

Esta revisión fue estática de contenidos en GitHub; no se ejecutaron tests desde un entorno local ni se cambió la rama del adaptador.


## Estado vivo — fusiones de PR #140/#142 y prueba sintética de recuperación (2026-10-29 UTC)

- `main` quedó en `c87893313534049463917af5ee17dfd36ba319c4` tras fusionar por squash [PR #140](https://github.com/BTF14/Micro-app/pull/140) y [PR #142](https://github.com/BTF14/Micro-app/pull/142). Las comprobaciones post-merge para ese SHA terminaron en `success`: CI, Playwright E2E, migración PostgreSQL, análisis estático, Semgrep, Security scan, Trivy, escaneo de historial, Cloudflare Pages y Workers. Ver runs [CI](https://github.com/BTF14/Micro-app/actions/runs/40847420758), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/40847420957), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/40847420948), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/40847420899), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/40847420845).
- PR #140 añadió pruebas unitarias y de integración para el aislamiento del selector de organización. Esto verifica el resolver de contexto, no autoriza afirmar que existan rutas comerciales completas ni que se haya probado todo el aislamiento de endpoints comerciales.
- PR #142 actualizó Wrangler a `^4.155.0`, `@cloudflare/workers-types` a `^5.20261029.1` y Node a `>=24.22.2 <25`. Se conserva TypeScript 5, Vite 7 y el override `undici@7.30.1`; no se desplegó manualmente producción.
- Prueba sintética de recuperación verificada: [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`, terminó en `success`. Validó checksum, cifrado/descifrado age, manifiesto coincidente de 13 tablas, constraints, relaciones de venta/pago/inventario/auditoría y exclusión de tablas efímeras. No mide RPO/RTO de producción ni valida restauración de una copia real.
- Restricciones vigentes: coste objetivo $0, sin tarjetas/facturación, no tocar Neon `main`, no publicar datos reales, no desplegar manualmente producción. Revalidar el SHA y los checks en vivo antes de toda decisión posterior.


## ESTADO VIVO PRIORITARIO — tras PR #143 (2026-10-29 UTC)

- **Main actual al iniciar esta actualización documental:** `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`, merge de [PR #143](https://github.com/BTF14/Micro-app/pull/143). PR #140, #142 y #143 están fusionadas. Checks post-merge de #143: Pages, Workers, CI/verify, Chromium, migraciones, análisis estático, Trivy, escaneo de historial y dashboard: todos `success` para este SHA.
- **PR #143 — backup/restore sintético:** [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) terminó en `success` en el SHA final de la PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. La prueba aplica migraciones a PostgreSQL 17 efímero, inserta datos sintéticos relacionados, genera dump, cifra con clave age efímera, valida checksum, descifra/restaura, compara manifiesto de 13 tablas y constraints, valida relaciones venta/pago/inventario/auditoría y confirma que las tablas de sesión/rate-limit no se restauran. El workflow corre manualmente y mensualmente; no usa secretos ni Neon.
- La prueba sintética **no** mide RPO/RTO de producción, no demuestra restauración de un backup real con datos poblados y no prueba alertas externas. Pendientes: medir tiempos de recuperación, comprobar respuesta visible ante fallo y confirmar coste $0.
- **Monitor diario de dependencias:** [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052), ejecutado en SHA previo `ecd7795a4699e6079bc3e372474ed24e410d2c8f`, terminó en `success`. La auditoría indicó `No known vulnerabilities found`; el informe de versiones funcionó y reportó Wrangler/workers-types y majors de Vite, plugin React, jsdom y TypeScript. PR #142 ya aplicó los dos updates compatibles de Cloudflare. No afirmar que ese run auditó el SHA actual; esperar la siguiente ejecución programada para el inventario actualizado.
- La rama `fix/dependency-watch-report-20261029` tiene cero commits exclusivos y está cuatro commits detrás de `main`; su workflow es idéntico al de `main`. Es una rama obsoleta/redundante, no necesita PR nueva.
- Restricciones sin cambios: coste objetivo $0, no tarjetas/facturación, no tocar Neon `main`, secretos ni datos reales, no desplegar manualmente producción. No abrir PR duplicadas; verificar SHA/checks en vivo antes de futuras fusiones.


## Backup workflow incident — 2026-10-29 (in progress)

- Latest manual production-backup workflow run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763), commit `872d5e54786fa6df4121c97d5e130e9b7599f8ca`, failed after 23 seconds with exit code 2.
- Logs confirm `pg_dump`, age encryption and SHA-256 checksum succeeded. The encrypted file and checksum were committed only inside the temporary runner's clone of `BTF14/micro-app-backups`; the workflow failed before `git push`, so this run did **not** persist a new backup. Existing remote backups were not pruned or changed by this run.
- Root cause: after `cd backups-repo`, `python3 ../scripts/prune_backups.py` resolved to a nonexistent path under the runner parent directory, not the checked-out repository workspace.
- Fix prepared on branch `fix/backup-workflow-path-20261029`: use `$GITHUB_WORKSPACE/scripts/prune_backups.py` and pin the backup workflow runner to `ubuntu-24.04` rather than following the newly migrated `ubuntu-latest` image. This is not considered resolved until PR checks pass and a real manual run confirms upload, checksum, retention, and success.
- No secrets, Neon main data, or existing backup repository contents were changed manually. Do not claim a fresh backup until the follow-up run is verified.


## Backup incident — PostgreSQL client mismatch (2026-10-29)

- Latest run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) failed in “Generar el volcado” with server PostgreSQL 18.6 vs pg_dump 16.15. It failed before dump creation; encryption and upload were skipped, and the remote backup repository was not modified.
- Root cause: installing `postgresql-client-17` did not guarantee that the unqualified `pg_dump` command resolved to that version; the runner selected 16.15.
- Branch `fix/backup-pg-dump-v18-20261029` switches to `postgresql-client-18`, invokes `/usr/lib/postgresql/18/bin/pg_dump` explicitly and asserts major version 18. Verify PR checks and a complete manual backup before closing the incident.


## Backup workflow incident #7 — missing checkout (2026-10-29)

- Manual run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) installed PostgreSQL client 18.6, successfully generated the dump, encrypted it with age and wrote its SHA-256 checksum. It failed in the upload/retention step because `$GITHUB_WORKSPACE/scripts/prune_backups.py` did not exist in the runner workspace.
- Root cause: `.github/workflows/backup.yml` used a repository script but had no `actions/checkout` step, so the repository files were never checked out. The prior absolute path correction alone could not fix this.
- Branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` before any step that needs repository files. Run #7 failed before `git push`; its backup commit remained only in the ephemeral clone, and remote retention did not run. Do not claim a new persisted backup until a subsequent run succeeds and remote file/checksum are verified.


## Backup workflow verified successful — 2026-10-29

- Manual run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) concluded `success` on main workflow commit `966c0e1586a4869d2ae57424bd7c32ff7d224a0f`.
- Logs prove PostgreSQL client `pg_dump 18.6` was used, the dump was generated, encrypted with age, and SHA-256 checksum written. The upload step cloned the private backup repository, committed `daily/backup-2026-10-29T17-29-48Z.dump.age` plus its `.sha256`, reported `retention complete; deleted 0 file(s)`, and pushed commit `2b038bd` to remote `main` successfully.
- This verifies a new encrypted backup was durably pushed. It does not by itself prove decryption/restoration of this production backup, real RPO/RTO, external failure alerting, or zero cost. Preserve the age private key securely and never place it in Git/chat.

---

## REGLA VIGENTE — capacidad y límites de Neon/Cloudflare (2026-10-29 UTC)

- Requisito permanente: no declarar cuántas organizaciones/sucursales soporta Micro app hasta auditar y medir capacidad con carga sintética representativa.
- Revisar Neon/PostgreSQL, Cloudflare Workers, Cloudflare Pages y los demás servicios conectados: cuotas del plan, CPU, solicitudes, conexiones, concurrencia, latencia, almacenamiento, crecimiento, errores y costes potenciales.
- Documento operativo: [CAPACITY_AND_LIMITS.md](./CAPACITY_AND_LIMITS.md); integrado con [ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md).
- Próximo trabajo: auditoría de solo lectura en GitHub + verificación de cuotas de proveedores; luego pruebas de carga sintética en entorno efímero/autorizado. No probar contra Neon `main`, no desplegar producción ni habilitar costes sin autorización.
- Capacidad numérica actual: **DESCONOCIDA / NO MEDIDA**. No presentar estimaciones como garantías.

## ESTADO OPERATIVO VIGENTE — restauración del backup remoto verificada (2026-10-29 UTC)

- [Run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124) del workflow `.github/workflows/backup-real-restore.yml` terminó en `success`.
- Se descargó `daily/backup-2026-10-29T17-29-48Z.dump.age`; el SHA-256 del objeto remoto coincidió con su sidecar (`OK`), `age` lo descifró y PostgreSQL 18 efímero lo restauró sin error. `pg_restore --list` leyó el archivo y la validación encontró tablas base en `public`. Se limpiaron los archivos descifrados temporales.
- **Conclusión:** verificada la restauración técnica de la copia remota exacta. No se tocó Neon `main` ni producción.
- **Límite:** no se verificaron conteos ni relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo o coste total $0. La comprobación de esquema por sí sola no garantiza que los datos comerciales estén completos.
- **Siguiente paso:** planear una comprobación segura de conteos/relaciones mediante datos sintéticos o metadatos no sensibles; medir RPO/RTO; revisar alerta, retención y coste. No imprimir datos comerciales ni solicitar la clave privada age por chat.


## Estado vivo prioritario — main posterior a PR #155 (2026-10-29 UTC)

- **Main actual:** `5a9bdc5a18a54c3c68639f52125d913d4e725b91`, merge commit de PR #155. PR #155 (`fix(auth): enforce HTTPS frontend origin for Google OAuth`) está cerrada y fusionada. La corrección de `getConfiguredFrontendOrigin` exige HTTPS salvo HTTP loopback (`localhost`, `127.0.0.1`, `[::1]`), rechaza credenciales y componentes URL adicionales.
- **Verificación de PR #155:** en SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`, ocho workflows terminaron `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Dependency review, Secret history scan y Project progress dashboard. CI ejecutó build/typecheck, unit tests y PostgreSQL auth integration tests. La revisión Codex no se completó por límite de uso; no afirmar review independiente.
- **Despliegues:** Cloudflare informó deployments automáticos de preview para Pages y Workers en la rama/commit. No son despliegues productivos ni validación de producción. No se hizo deploy manual.
- **PR #154:** continúa abierta, desactualizada y no mergeable contra la nueva main; su propósito documental se está reconciliando en PR #156. No fusionar #154.
- **Arquitectura:** mantener React/Vite/TypeScript + Cloudflare Pages + Workers/Hono + Neon PostgreSQL/Drizzle; no reescribir ni introducir microservicios sin medición. No existen aún rutas comerciales HTTP. El stock del esquema actual está a nivel organización, no sucursal; no añadir un `branch_id` superficial.
- **Bloqueos:** matriz `docs/sdd/role-permission-decision-matrix.md` no aprobada; diseño de sucursales y propiedad de catálogo/precios/stock por ubicación pendiente; conciliación transaccional venta-líneas-pagos-stock pendiente. No iniciar rutas comerciales ni migraciones de sucursal hasta resolver estos contratos.
- **Capacidad:** organizaciones/sucursales concurrentes no medidas. Los límites observados de Neon y las cuotas Cloudflare no permiten prometer un número de tenants. Mantener presupuesto objetivo $0 y revisar cuotas/uso real.
- **Seguridad/operación:** PR #153 y #155 están en main; no hay evidencia de validación HTTP en producción. Restauración técnica del backup remoto exacto verificada, pero conteos de datos comerciales, RPO/RTO, alertas y coste total aún pendientes. Producción sigue NO lista.

---

# Estado vivo — 2026-10-30 UTC (branch scope en PR)

- Main base verificado: `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`; PR #164 ya está fusionada. Este bloque supersede referencias históricas anteriores que la presenten abierta o pendiente.
- Rama activa: `feat/branch-scope-context-20261030`; PR #165 abierta: https://github.com/BTF14/Micro-app/pull/165.
- El propietario autorizó el alcance general: owner/admin pueden resolver sucursales activas de su organización; cashier/inventory requieren asignación activa propia. Esto no aprueba permisos sensibles por operación.
- Cambio preparado: migración aditiva 0003 para branches/branch_memberships, resolver server-side resolveBranchContext, tests unitarios, assertions SQL cross-tenant y workflow PostgreSQL 18 efímero.
- El resolver no está conectado a rutas y no concede permiso para vender, descontar, anular, pagar, ajustar inventario, transferir, operar caja ni gestionar usuarios.
- La matriz de permisos por operación sigue NO APROBADA. No hay handlers comerciales.
- En HEAD de implementación `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b`, CI, integración PostgreSQL, migration validation, Playwright, Semgrep, Trivy, secret-history, dependency review, backup smoke y Cloudflare previews finalizaron success. La primera ejecución de integración falló solo en teardown por una sucursal sintética residual; se corrigió la limpieza, se eliminó la consulta concurrente del mismo cliente pg y la ejecución posterior pasó (3/3 pruebas de branch scope, sin warning). La sincronización documental posterior debe revalidar el SHA final.
- Neon main, datos reales, Cloudflare settings, secretos, DNS, billing y producción sin cambios; migración no aplicada remotamente.

- Ampliación de validación: CI aplica también 0003 al PostgreSQL efímero y ejecuta `branch-context.integration.test.ts` contra PostgreSQL real; el workflow `postgres-migration` mantiene assertions SQL específicas. Verificar ambos resultados en el HEAD final de la PR.

- Endurecimiento posterior: `resolveBranchContext` revalida en su propia consulta que organization, app_user y organization_members siguen activos y que el rol actual en DB coincide con el TenantContext; owner/admin se determina desde la fila DB. Se añadieron pruebas PostgreSQL para membresía revocada y rol obsoleto. Esta revisión cambió el HEAD después de los checks previamente documentados; verificar nueva ejecución CI antes de merge.


## 2026-11-08 17:51 UTC — Neon pinned rehearsal #4: bootstrap-and-migrate SUCCESS

- Ejecución verificada directamente en GitHub Actions: [run #42507066215](https://github.com/BTF14/Micro-app/actions/runs/42507066215), workflow `.github/workflows/neon-pinned-migration-rehearsal.yml`, event `workflow_dispatch`, branch `main`, checkout/head SHA `37bf673895a035c84c4c18f837c12694f182a96b`, run #4, conclusión `success`; job único `rehearsal` y todos sus pasos completados SUCCESS.
- Operación registrada en el job: `bootstrap-and-migrate`. SOURCE_SHA inmutable validado: `6227a3a8497f6be94d675b64da5da61530c200fc`. Destino verificado por el workflow: proyecto `restless-fire-99110035`, branch `br-curly-poetry-b7dxsddm`, database `microapp_rehearsal`, login `microapp_migrator`. No se usó `neondb`, la rama primaria ni producción.
- Preflight confirmó target vacío antes de bootstrap y validó la confirmación exacta de escritura. Baseline 0001–0002 aplicado por el runner; fingerprint canónico 0002 comparado y verificado (`BASELINE_0002_FINGERPRINT_VERIFIED`). Luego el runner aplicó el conjunto fijado 0001–0019; 0001–0002 se reconocieron como ya aplicadas al iniciar el segundo tramo.
- Assertions SQL post-migración 0017, 0018 y 0019 ejecutadas explícitamente; cada una terminó con `MIGRATION_ASSERTIONS_PASSED`. Verificación final comprobó 19 filas únicas en `public.schema_migrations`, versión máxima 0019, todos los estados `applied`, y ownership de tablas/relaciones y funciones públicas por `microapp_migrator`. Resultado final: `PINNED_REHEARSAL_MIGRATIONS_0001_0019_VERIFIED`.
- Preflight de roles validó atributos restrictivos de `microapp_migrator` y `microapp_runtime`, grants de conexión/schema esperados y que runtime no es miembro de migrator. No se imprimieron ni se copiaron secretos/URLs.
- La migración 0019 ejecutó su `DROP TABLE` previsto para `public.inventory_balance_ledger_intents`; el SQL de esa migración exige que la tabla heredada exista en el estado esperado y esté vacía antes de eliminarla. La ejecución completa y las assertions posteriores finalizaron SUCCESS.
- Alcance: este fue un ensayo real de escritura/DDL únicamente en la base Neon aislada `microapp_rehearsal`, autorizado expresamente por el propietario. No se tocó Neon main, `neondb` parent-data clone, secretos, Cloudflare, DNS, billing ni despliegues productivos.
- Warning no bloqueante: deprecación de Node.js 20 en `actions/checkout@v4`; el runner lo fuerza a Node.js 24 y el job finalizó SUCCESS. Registrar actualización de actions como mantenimiento, no como fallo de migración.
- Dictamen: **migraciones 0001–0019 demostradas en Neon rehearsal con pin inmutable y assertions 0017–0019 satisfactorias**. Esto eleva la confianza en la ruta de migración, pero no equivale a certificación de producción: siguen pendientes validación funcional integrada sobre la DB resultante, smoke tests autenticados, revisión final de permisos/RLS y gates operativos/producto. No promover automáticamente a producción.


## 2026-11-09 — Diseño administrativo BCV + calendario (documental, no implementado)

- Se amplió el diseño en PR #296 (rama `docs/reconcile-bcv-freshness-fx-task-20261109`) con un servicio compartido de reautenticación/autorización administrativa y permisos separados por dominio.
- Nuevos/actualizados: `docs/decisions/ADR-20261109-admin-authorization-pin-recovery.md`, `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`, `docs/sdd/BANKING_CALENDAR_VERSIONING.md`, ADR FX y ODD task.
- PIN individual; mínimo documental existente de 8 dígitos para pequeño negocio; Argon2id preferido con parámetros calibrados; propuesta inicial de 5 intentos/15 minutos y backoff, aún sujeta a pruebas; recuperación como reset con MFA/código de un solo uso, nunca revelar PIN ni confiar solo en email.
- Permisos BCV y calendario separados; carga, edición y publicación de calendario diferenciadas. La matriz de roles, auth/MFA real y controles Nivel 1 siguen siendo gates.
- PDF anual: cuarentena, validación por capas, análisis/parseo aislado, almacenamiento privado, hash, revisión humana y publicación explícita. Vigilancia automática solo detecta; no publica. Recordatorios propuestos 1 dic y 1 ene.
- Todo es propuesta documental. No hay código, endpoint, migración, almacenamiento PDF, PIN ni recordatorio implementado. PR #287 permanece Draft; no se modifica su código ni se habilita contingencia.


- **Vigilancia calendario 2027 — 2026-11-09:** no se localizó publicación oficial identificable. SUDEBAN muestra la sección general Calendario Bancario, pero la consulta directa tuvo timeout; una fuente secundaria actualizada 2026-11-07 también la reporta pendiente. Estado: no localizado/no verificado, no ausencia absoluta demostrada. Detalle y fuentes en `docs/sdd/BANKING_CALENDAR_VERSIONING.md`.


## Actualización fuente oficial BCV — 2026-11-09

Una extracción de navegador alcanzó `https://www.bcv.org.ve/` y recuperó los bloques de monedas y la fecha valor del día. Sin embargo, el extractor entrega HTML semántico limpiado, no el cuerpo HTTP original. Es evidencia de acceso/contenido, no fixture raw ni prueba del parser sobre el markup original. Mantener el gate de fixture oficial raw con status, content-type, hora de captura y SHA-256. No usar mirrors ni renombrar el fixture sintético como oficial.
