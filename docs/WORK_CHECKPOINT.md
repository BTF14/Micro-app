# Reconciliación de seguridad de backups — 2026-11-11 UTC

**Línea base de esta reconciliación:** `main` en `a3966a95a97486da18fae568a9c87bac8f2772e6`, posterior a los merges secuenciales de PR #304 y #305. Este encabezado es la fuente temporal más reciente; los snapshots históricos que siguen debajo se conservan como historial y no describen el estado vivo actual.

## Merges confirmados

- **PR #304 — merged por squash.** HEAD exact-SHA validado: `b20ade030c9dc29f7689afc3ce6c1a096fe7f0ab`; 12/12 workflow runs y 14/14 check-runs SUCCESS. Merge commit en `main`: `e428a25824d48d1a6391f564c05d0287abf7d329`. Incluye hardening de diagnóstico de principal, comprobación estricta de membresía sobre `pg_auth_members.member`, helper temporal `GIT_ASKPASS`, pruebas de contrato HTTP 401 y reintentos APT.
- **PR #302 — CLOSED / superseded, no merged.** Se publicó el comentario de absorción en el hilo de PR antes del cierre. La rama histórica se conserva.
- **PR #305 — merged por squash.** Tras sincronizar con el nuevo main, el HEAD exact-SHA fue `d1e008a3df1e99f64c4efce20306a798351f6a43`; 16/16 workflow runs y 18/18 check-runs SUCCESS. Merge commit final en `main`: `a3966a95a97486da18fae568a9c87bac8f2772e6`. La combinación conserva íntegramente las mejoras de #304 y añade `--exclude-table-data=public.auth_sessions`, `public.auth_rate_limits` y `public.auth_bootstrap_attempts`, además de pruebas sintéticas PostgreSQL 18 y restauración con DDL preservado.

## Estado vivo de PRs consultado tras los merges

| PR | Estado observado | HEAD |
|---|---|---|
| #303 — backup restore smoke de esquema completo | OPEN / Draft | `d527ae79cd566945cd9bdb3e1475d53b31d3923a` |
| #300 — permiso de override manual de precio | OPEN / Draft | `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95` |
| #299 — medir duración de restore PostgreSQL aislado | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` |
| #298 — reconciliación documental previa | OPEN / Draft | `ce398214c55ba5f3d4d6caeaf683dbfea041b6a7` |
| #296 — documentación de seguridad BCV y controles admin/calendario | OPEN / Draft | `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f` |
| #287 — BCV + checkout integration rehearsal | OPEN / Draft | `fe73180dc9f2039c2a025b8d3b7700230080e19d` |
| #193 — inventario por sucursal Fase B | OPEN / Ready for review | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` |

No reducir esta lista a #303 y #287: GitHub reportó además #300, #299, #298, #296 y #193 abiertas. No alterar #193. PRs #255 y #269 permanecen CLOSED sin merge; #233 permanece cerrada como superseded. #302 está cerrada como absorbida; #304 y #305 están MERGED.

## Issue P0 #53 y readiness

- Issue #53 permanece **OPEN / P0**.
- Completado: contrato sintético de privilegios mínimos, denegación de escritura/DDL en el rol sintético, prueba de dump/restauración, preservación del DDL de tablas auth y exclusión de sus filas efímeras.
- Sigue abierto: identidad efectiva y privilegios reales del secreto `DATABASE_URL_BACKUP_RO` en Neon; cobertura demostrada de aislamiento tenant/sesiones; evidencia de restore operativo y RPO/RTO. El diagnóstico agregado al workflow es no sensible y no bloqueante: un resultado no conforme no bloquea el backup ni certifica el principal.
- No se inspeccionaron secretos ni se conectó o modificó Neon. No se ejecutó un backup productivo ni restore con datos reales.
- **Producción: NOT READY.** Los checks sintéticos verdes no cierran la identidad real, aislamiento ni recuperación productiva.

## Siguiente frente — PR #287

Continuar la revisión técnica de #287 en HEAD `fe73180dc9f2039c2a025b8d3b7700230080e19d`, manteniéndola Draft:

1. Resolver el gate P1 de freshness: `findApplicableCheckoutRate` debe considerar `bcv_sync_state.last_success_at` y fallar cerrado cuando la sincronización relevante no tenga éxito reciente, con ventana definida por decisión explícita y pruebas PostgreSQL para fallos, concurrencia y datos obsoletos.
2. Formalizar política USD-only: determinar si se permite checkout en USD sin conversión a VES cuando BCV no está disponible, y qué ocurre con ventas VES, recibos, totales, pagos parciales y auditoría. No inventar una política de negocio ni habilitar contingencia manual por inferencia.
3. No mergear #287 sin revalidar su base/HEAD, exact-SHA CI, revisión formal requerida y gates comerciales/legales.

## Límites operativos mantenidos

No Neon main, secretos, datos reales, cambios de roles/grants, backup operativo, despliegue manual, activación de Cron, Cloudflare manual, DNS ni billing. Branch-protection API devolvió 403 al conector durante la auditoría; GitHub aceptó los dos merges, pero esta reconciliación no atribuye una lectura independiente de la configuración administrativa de protección.

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

## Checkpoint vivo — 2026-11-08 UTC

- Main: `594382f6f191f2ea0b55d913683841e51c210e5d`; post-merge 13/13 check-runs y 11/11 workflows push SUCCESS.
- #286: snapshot anterior `3666bc1043733a21f880ca5da68a6be45e59e261`, 25 ahead / 0 behind, mergeable=true, 14/14 checks y 12/12 workflows SUCCESS; este commit cambia el HEAD y requiere revalidación.
- #269: HEAD `0ae7f1d71f9bb2155bddca5b5dcc0a2b7785b089`, 27/3, mergeable=true, 16/16 checks y 14/14 workflows SUCCESS; mantener Draft por gates comerciales.
- #255: HEAD `7e43d7fd1519889605174da5818190bb84685059`, 54/3, mergeable=true, 15/15 checks y 13/13 workflows SUCCESS; mantener Draft por gates BCV.
- Neon rehearsal #42507066215 ya completado en entorno aislado; no repetir escrituras. Producción **NOT READY**.

Siguiente: revalidar el nuevo SHA de #286; después continuar checkout/ledger y BCV sin forzar ramas ni alterar producción.

## Checkpoint vivo — 2026-11-08 UTC

Fuente autoritativa de estado: `docs/CURRENT_STATE.md`. Este checkpoint resume únicamente el punto operativo.

- Main: `594382f6f191f2ea0b55d913683841e51c210e5d` (PR #285); post-merge: 13/13 check-runs y 11/11 workflow runs push SUCCESS.
- #286: OPEN/Draft, docs-only; snapshot anterior HEAD `9071c4921b38343f934a747bec77841791cfd2d6`; 21 ahead / 0 behind; `mergeable=clean`; 13/13 check-runs y 10/10 workflow runs SUCCESS exact-HEAD. El commit documental actual requiere revalidación. Los seis checks requeridos de main están SUCCESS. Main aparece protegida (el resumen expone esos checks; reglas detalladas 403). Sin reviews formales ni threads; mantener Draft y no fusionar solo por CI.
- #233: CLOSED como superseded, no merged; 18/18 paths preservados/evolucionados; conservar rama/83 commits.
- #269: OPEN/Draft; HEAD `8f05befb7ac1a46d68850b9f89f89edc8cd46283`; 26 ahead / 3 behind; 11/11 PR workflows SUCCESS exact-HEAD; gates comerciales abiertos.
- #255: OPEN/Draft; HEAD `7e43d7fd1519889605174da5818190bb84685059`; 54 ahead / 3 behind; 10/10 PR workflows SUCCESS exact-HEAD; gates operativos BCV abiertos.
- Neon rehearsal #42507066215 SUCCESS aislado; no repetir escrituras. Producción **NOT READY**.

**Siguiente paso:** verificar los gates reales de #286; después resolver conflictos documentales y sincronizar #269/#255 sin force-push. No modificar Neon main, secretos, Cloudflare manual, DNS, billing ni datos reales.

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

# Work checkpoint — 2026-11-08 UTC (posterior a PR #281)

## Estado confirmado
- Último main verificado antes de este checkpoint: `e6f0c6021d82cfffce12f4c1d5283f657dc74c64` (merge SHA PR #281). Consultar GitHub para la punta viva antes de actuar.
- PR #280 y PR #281 están integradas. PR #281 HEAD `756526779491a74b12e1b2746963b36cec59eff6`; merge SHA `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`.
- Post-merge PR #281: 9/9 workflows y 11/11 check-runs SUCCESS, incluidos CI, Playwright, PostgreSQL, Security/SAST, secret-history, Pages y Workers Builds.
- Neon rehearsal #42507066215 SUCCESS: fuente `6227a3a8497f6be94d675b64da5da61530c200fc`; migraciones 0001–0019 verificadas solo en `microapp_rehearsal`. No repetir escrituras Neon.

## PRs activas y bloqueos
- #269 OPEN/Draft, HEAD `14afd5de938a6ff655ecdfc5cb747f0f799290c5`, 24 ahead / 4 behind main, mergeable=false. Solo 5 check-runs SUCCESS y 3 workflows push SUCCESS en ese HEAD; faltan workflows pull_request y contextos requeridos verify/Chromium/JS-TS. Las migraciones 0017–0019 coinciden con source SHA ensayado; cinco commits posteriores solo cambiaron workflow/docs/ODD. Contrato comercial checkout no aprobado; mantener Draft.
- #255 OPEN/Draft, HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`, 53 ahead / 11 behind; 10 workflows SUCCESS en ese HEAD anterior a sincronización; P1 freshness, alerta, fixture real BCV, anomalías y feriados.
- #258 OPEN/Ready, 35 ahead / 42 behind; #262 OPEN/Ready, apilada sobre #258 y 107 ahead / 42 behind. No fusionar separadamente ni cerrar sin preservar contenido único.

## Próximas acciones
1. Sincronizar #269 con main sin force-push; actualizar ODD/modelo checkout y revalidar CI exact-HEAD.
2. Mantener #269 Draft hasta aprobación del contrato comercial y cierre de riesgos BCV.
3. Sincronizar #255 separadamente y cerrar sus P1 antes de integración.
4. Preservar #258/#262 hasta comparar contenido único y dependencias.
5. Ejecutar pruebas de checkout, pagos, ledger, idempotencia, rollback y permisos runtime en PostgreSQL desechable; no repetir escrituras Neon.

## Límites
- No mutar Neon main ni ejecutar otra escritura/migración remota.
- No cambiar secretos, Cloudflare settings, DNS, billing ni realizar despliegues manuales.
- No aprobar reglas comerciales ni permisos no autorizados.
- Producción permanece **NOT READY**.
