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

## Estado de seguridad e integración — 2026-11-08 UTC

Consultar `docs/CURRENT_STATE.md` para los SHA y estados vivos completos.

- #269 mantiene protecciones de ledger append-only, revocación DELETE/TRUNCATE en payments y revalidación de sucursal activa; 16/16 check-runs y 14/14 workflows SUCCESS en HEAD `0ae7f1d...`. Sigue Draft por contrato comercial checkout y decisión USD-only/BCV; CI no equivale a autorización de merge ni certificación de producción.
- #255 mantiene bloqueos P1: política de anomalías y freshness, last-attempt/last-success persistente, alerta externa, fixture HTML oficial y calendario de feriados. 15/15 check-runs y 13/13 workflows SUCCESS en HEAD `7e43d7f...`; no activar Cron productivo.
- #286 es docs-only; el commit de esta actualización cambia su HEAD y necesita CI exact-HEAD nuevo.
- Neon rehearsal #42507066215 no demuestra identidad/configuración real del Worker. No repetir migraciones ni tocar Neon main, secretos, Cloudflare, DNS, billing o datos reales. Producción **NOT READY**.

## Estado de gates de seguridad e integración — 2026-11-08 UTC

Consultar `docs/CURRENT_STATE.md` para la matriz viva de PRs y SHAs; evitar replicar su snapshot completo.

- #269 permanece Draft hasta aprobar el contrato comercial checkout y decidir si una venta USD-only depende de BCV.
- #255 permanece Draft: siguen pendientes política de anomalías/freshness, persistencia de último intento/éxito, alerta externa, fixture oficial BCV y calendario de feriados.
- La validación de migraciones 0001–0019 ocurrió únicamente en `microapp_rehearsal`; no demuestra identidad/configuración real del Worker.
- Neon main, datos reales, secretos, Cloudflare manual, DNS y billing permanecen fuera de alcance. Producción **NOT READY**.

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

## Nota autoritativa — 2026-11-08 UTC

El estado operativo vigente se centraliza en CURRENT_STATE.md y HANDOFF_NEXT_CHAT.md. Main actual: 9c6b30281ed59726e532da840568fc9e80b528f7; #280 y #282 integradas. Neon rehearsal #42507066215 aplicó 0001–0019 solo en microapp_rehearsal. #269 está OPEN/Draft en HEAD 8f05befb7ac1a46d68850b9f89f89edc8cd46283 con 16/16 check-runs y 14/14 workflows SUCCESS; #255 OPEN/Draft en HEAD 7e43d7fd1519889605174da5818190bb84685059 con 15/15 y 13/13 SUCCESS. #258 y #262 se cerraron como superseded tras preservar/evolucionar todo su contenido en #269. #233 sigue histórica abierta; #193 no se modifica. Producción NOT READY: contrato comercial checkout y gates BCV siguen abiertos. No repetir escrituras Neon ni tocar producción. El detalle, SHA y siguientes pasos están en CURRENT_STATE.md.

---

# Estado del repositorio — 2026-11-08 UTC

El estado vivo de main, PRs, SHA, checks y próximos pasos está centralizado en [CURRENT_STATE.md](CURRENT_STATE.md) y [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md). Los snapshots históricos que siguen en este documento son evidencia temporal: no reutilizar SHA ni resultados CI sin comprobar el HEAD exacto.

- GitHub main protegido: `aa2804a0a6e7879f684b3baeb60646e50f1d6419`; PR #280 integrada por squash.
- Neon rehearsal #42507066215: SUCCESS; migraciones 0001–0019 verificadas únicamente en `microapp_rehearsal`. Neon main no fue modificado.
- Producción: **NOT READY**; no extrapolar el ensayo ni los builds automáticos a certificación productiva.

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
- El nuevo workflow fijado está en main, pero **aún no se ha ejecutado**. Su modo predeterminado `verify-empty` es read-only. El conector GitHub disponible no permite iniciar workflow_dispatch; requiere una acción manual del propietario desde Actions.
- Nunca usar la DB `neondb` de la rama rehearsal: es parent-data clone con filas heredadas. Neon main/producción fuera de alcance.

### Verificación post-merge #275
- GitHub Actions en merge SHA: 9/9 workflow runs SUCCESS; required contexts `verify`, `postgres-migration`, `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history` y `Trivy filesystem and configuration scan` en SUCCESS.
- Cloudflare Pages y Workers Builds check-runs terminaron SUCCESS en el merge SHA. No se ejecutó smoke test HTTP autenticado contra endpoints productivos; por ello no se declara producción validada.
- Producción: **NOT READY**. No DDL/DML remoto, no migraciones, no cambios de Neon main, secretos de producción, DNS o billing.

## Snapshot de seguridad vigente — 2026-11-08

El encabezado y las tablas históricas de esta hoja quedaron obsoletos tras los merges #270/#272 y la reconciliación de Neon. Estado actual: main 33016a2d206c7b8cfc60e53e34a56a26651141d7; PR #275 añade un workflow manual de rehearsal main-only, default read-only verify-empty; su CI exact-HEAD sigue pendiente. El workflow nuevo aún no se ha despachado. El run previo del workflow anterior confirmó conexión tras rotación del secreto; no ejecutar migraciones hasta verificar el nuevo flujo y obtener confirmación explícita para la ruta de escritura. Neon main/producción fuera de alcance. Para estado vivo, prevalece docs/CURRENT_STATE.md.

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

## Reconciliación operativa posterior al merge #251 — 2026-11-08

**Fuente de verdad:** GitHub en vivo. **main:** `8c13da8b2d55d0a45490b19499b1b7c53e0ec966` (protegida). PR #251 está fusionada en este commit; #257 y #259 también están integradas. El inventario vivo muestra **6 PR abiertas**, no 26.

| PR | HEAD | Base actual | Estado GitHub | Check-runs exact-HEAD | Decisión |
|---|---|---|---|---:|---|
| #255 BCV | `f49fb402f9bd5a40591970c9efe3665a5e212ebb` | `main` | Ready, mergeable clean | 15/15 SUCCESS | Desapilada de #251; no fusionar todavía: faltan gates Neon/runtime/Cron. |
| #258 checkout | `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c` | `main` | Ready, mergeable=false, dirty | 16/16 SUCCESS | Conflicto de integración; sincronizar y revisar contra main antes de cualquier merge. |
| #261 documentación | `9b376b23c0c5967210533ab60ce7c968a83a07cb` | `main` | Ready, mergeable clean | 14/14 SUCCESS en el HEAD anterior a esta actualización | Este commit de reconciliación cambia su HEAD; volver a validar CI exact-SHA. |
| #262 ledger/proyección | `19103c000b354da85c1a478867a6a18e2ec25cd7` | rama #258, base registrada `df1ba996babb859a83da09d72cdec63a69b3965c` | Ready, mergeable clean | 8/8 SUCCESS | Mantener apilada; depende de sincronizar/reconstruir #258. |
| #233 checkout histórico | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | `docs/sales-checkout-design-gates-20261105` | Draft | 9/9 (snapshot previo) | No fusionar; conservar como fuente histórica hasta confirmar que #258 recupera todo lo único. |
| #193 Fase B inventario | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | main histórico | Open, no Draft | 12/12 (snapshot previo) | Restricción expresa: no modificar. |

Los checks indicados son check-runs de los SHA señalados; no deben confundirse con workflow runs, status contexts, aprobación formal o pruebas en producción. El endpoint completo de protección de rama devolvió 403; se conoce la lista de contextos requeridos expuesta por GitHub, pero no se debe inferir desde esa respuesta que no exista una regla adicional de reviews.

### Hallazgo operativo de Neon — solo lectura

Rama de ensayo existente: `rehearsal-baseline-20261107` (`br-curly-poetry-b7dxsddm`), proyecto `restless-fire-99110035`, base `neondb`.

- No existen `schema_migrations` ni `app_schema_migrations`.
- `exchange_rates.rate`, `sales.exchange_rate_snapshot` y `payments.exchange_rate_snapshot` siguen en `NUMERIC(14,6)`; migration 0013 no está aplicada allí.
- `microapp_runtime` tiene USAGE en `public`, no CREATE, y no tiene SELECT/INSERT/UPDATE/DELETE en `exchange_rates`.
- `microapp_migrator` puede iniciar sesión directamente, tiene CREATE en `public` y es owner de `exchange_rates`; la identidad consultada fue `current_user=session_user=microapp_migrator`.
- La prueba bajo `microapp_runtime` confirmó `current_user=session_user=microapp_runtime` y ausencia de permisos de tabla sobre `exchange_rates`.
- No se ejecutó DDL/DML ni se modificó Neon. El branch `main` de Neon permanece fuera de alcance.

El workflow `.github/workflows/migration-runner.yml` prueba el runner contra PostgreSQL desechable local de GitHub Actions. No es un runner protegido que aplique migraciones a Neon. No afirmar lo contrario ni usar SQL manual para saltarse el flujo.

### Bloqueos de integración y producción

- **#255:** aunque sus 15 check-runs están verdes y GitHub lo reporta limpio tras retarget a main, su Cron de lunes a viernes a las 22:00 UTC escribirá en `exchange_rates`. No fusionar/activar hasta disponer de una ruta reproducible de baseline/migración en la rama de ensayo, verificar migration 0013 y sus grants con login directo `microapp_migrator`, probar `microapp_runtime` y confirmar el principal/configuración real del Worker sin revelar secretos. La documentación de PR #255 ya registra estos hallazgos.
- **#258:** el HEAD exacto tiene 16/16 checks verdes, pero GitHub lo reporta `dirty` y la comparación con main muestra 29 commits de retraso. Además, el contrato comercial de pago (una moneda de liquidación por venta, pago exacto completo, sin parcial/sobrepago) debe estar explícitamente aprobado antes de habilitar checkout.
- **#262:** su base es un HEAD anterior de la rama #258; no integrar independientemente. Su mejora P1 de proyección ledger→balance tiene un residual: el actor declarado en PostgreSQL no queda criptográficamente ligado a la sesión HTTP; `authorizeBranchOperation` sigue siendo obligatorio y otros tipos de movimiento deben permanecer bloqueados.
- **#261:** el snapshot anterior afirmaba que main era `d28b80e` y que #251 no estaba fusionada; eso ya es falso. Esta actualización reemplaza el encabezado operativo. Las secciones posteriores con snapshots fechados se conservan como historial, no como estado actual.
- **#193:** no tocar ni cerrar; conservar el alcance y los hallazgos de permisos ya documentados.
- **Producción: NOT READY.** CI verde y builds Cloudflare de PR son evidencia de CI/preview, no prueba de producción. No se ha demostrado la aplicación de migraciones en Neon main, identidad/grants efectivos del Worker, smoke test autenticado de producción, backup/restore operativo ni readiness end-to-end.

### Proceso de único mantenedor

No crear otra cuenta ni fabricar una aprobación GitHub. Registrar por separado: revisión técnica asistida por IA, resultados CI exact-SHA, hallazgos/resoluciones y autorización del propietario. Una revisión asistida por IA no se denomina aprobación humana independiente. La autorización permanente del propietario del 2026-11-05 permite fusionar PR que superen todos los gates aplicables y contempla el despliegue automático inherente; no amplía permisos para Neon main, migraciones remotas, secretos, datos reales, cambios manuales de Cloudflare, DNS o billing.

### Siguiente secuencia

1. Terminar esta reconciliación documental y validar el nuevo HEAD de #261.
2. Resolver #258 contra el main actual sin force-push y sin perder cambios únicos; mantener #262 apilada hasta entonces.
3. Completar el procedimiento reproducible de baseline/migración solo en Neon rehearsal; no tocar Neon main.
4. Revalidar #255 exact-HEAD y sus gates antes de considerar integración.
5. Revisar producto, permisos y flujos end-to-end antes de habilitar checkout.
6. Mantener #193 intacta y cerrar #233 únicamente después de demostrar que no conserva contenido único.

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

## Hallazgo de seguridad — 2026-11-08 08:25 UTC — PR #262

- **P1, autorización de movimientos ledger:** #262 mantiene INSERT de `microapp_runtime` en `warehouse_inventory_movements`. La validación de conteos retorna sin validar fuente cuando `count_id IS NULL`, por lo que tipos como purchase_receipt/transfer_in/transfer_out/customer_return/reversal pueden ser insertados directamente por el rol runtime sin validar documento fuente, estado, actor ni cantidad; la proyección SECURITY DEFINER altera balances.
- Hallazgo comunicado en PR #262: https://github.com/BTF14/Micro-app/pull/262#issuecomment-6719238384.
- **Criterio de cierre:** restringir runtime a tipos cubiertos por flujos transaccionales verificados o añadir validación DB fail-closed de documento fuente/actor/estado/cantidades para cada tipo; añadir assertions SQL y pruebas con login real `microapp_runtime`. No habilitar endpoints de esos tipos antes de cerrar.
- Estado general, PRs y SHA: consultar `docs/CURRENT_STATE.md`. Producción continúa NOT READY.

---

# Estado de seguridad — 2026-11-08 06:45 UTC

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

### Clasificación de riesgos

- **P0:** identidad efectiva, ownership, grants mínimos y runner protegido de Neon rehearsal sin evidencia en esta recuperación.
- **P1:** privilegio runtime directo sobre inventory_balances frente a proyección SECURITY DEFINER; BCV no integrado; falta review independiente; decisión comercial pendiente; calendario weekday de feriados y UI checkout.
- **Ya implementado en #258 (no fusionado):** rate limit específico 60/min/IP con HMAC y fail-closed; assertions SQL para asignación USD por pago VES y residuo. Verificar en el HEAD exacto antes de cualquier integración.

---

### Riesgos de seguridad a resolver

- **P0:** evidencia de identidad efectiva/ownership/grants en Neon rehearsal mediante runner protegido aún pendiente.
- **P1:** microapp_runtime conserva INSERT/UPDATE directo en inventory_balances; pairing con ledger no equivale a proyección solo SECURITY DEFINER.
- **P1:** endpoint checkout no consume bucket específico de rate limiting.
- **P1:** SQL valida fórmulas por línea en migration 0017, pero no reproduce el reparto proporcional individual de usd_equivalent_snapshot para cada pago VES.
- **P1 funcional:** ingesta BCV aún no está en main; feriados weekday sin calendario oficial; UI checkout pendiente.
- TTL absoluto/idle de sesión de siete días sigue pendiente de decisión del propietario; no modificarlo silenciosamente.

---
# Security state after #257 merge — 2026-11-08 UTC

- #258 checkout is green on HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94` (15/15 checks, 13/13 workflows; 16 PostgreSQL checkout tests). Its migration 0017 adds database validation of per-line USD/VES arithmetic and BCV weekday/weekend date selection. It remains a Draft branch; migration is not in main or Neon.
- **P1 BCV:** official producer/API/Cron remains Draft in #255 (base #251). No rate ingestion is active in main.
- **P1 payment allocation:** database still does not verify each individual VES payment's USD-equivalent allocation/residual; handler-only calculation is insufficient defense in depth.
- **P1 inventory:** migration 0012 still grants runtime direct INSERT/UPDATE to `inventory_balances`; ledger pairing is not equivalent to a SECURITY DEFINER-only balance projection.
- **Owner decision:** confirm one-currency/no-partial/no-overpayment policy before activation; do not infer approval.
- **Operational gaps:** no authoritative weekday bank-holiday calendar; no checkout UI.
- #259 serializes the shared PostgreSQL runtime-role tests and #257 docs are merged. No Neon main, secrets, Cloudflare manual, DNS, billing, real data or manual deploy changed.

# Estado de seguridad vivo — 2026-11-08 UTC — actualización posterior a #259

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


### Clasificación de riesgos

- **P0:** identidad efectiva/ownership/grants Neon y runner de migraciones de rehearsal todavía no demostrados en la base objetivo; revisión formal independiente pendiente.
- **P1:** privilegio directo runtime sobre `inventory_balances`; falta rate limiting específico del checkout; falta defensa SQL de cálculos monetarios; feriados weekday sin calendario; TTL de sesión de 7 días pendiente de decisión del propietario.
- **P1 funcional:** checkout API no equivale a UI POS integrada; #255 sigue siendo la fuente BCV no fusionada.
- No cambiar TTL, permisos, secretos ni configuración productiva de forma silenciosa.

---
# Estado de seguridad actualizado — 2026-11-08 UTC — checkout

- #258 implementa checkout transaccional y migration 0017 weekday/weekend en GitHub, pero no en Neon. El SHA de implementación `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 15/15 checks y 13/13 workflows, 141 unitarias, 85 runtime-role tests y 15 checkout PostgreSQL tests. HEAD tras sincronizar main y refresh del modelo `433a1fa1212f610cbb543597e620219bd91327a4`: 13/15 check-runs y 12/13 workflows SUCCESS, sin fallos y con verify/Pages/CI pendientes.
- **P1 — fuente BCV:** #255 productor/API/Cron sigue Draft y no está integrado en main. Checkout falla cerrado si no existe la fila efectiva validada. No activar hasta integrar y verificar el Worker/runtime.
- **P1 — aritmética en DB:** trigger 0015 reconcilia sumas, pero no verifica por sí mismo `quantity × unit_price_usd_snapshot`, redondeo de `line_total_ves` ni asignación proporcional individual de `usd_equivalent_snapshot`. Handler calcula con BigInt; falta defensa SQL antes de producción.
- **P1 — privilegios inventario:** migration 0012 concede a `microapp_runtime` INSERT y UPDATE(on_hand_quantity, updated_at) en `inventory_balances`. 0010 exige pairing con ledger, pero no es una proyección exclusivamente SECURITY DEFINER. Resolver antes de producción.
- **Decisión de producto pendiente:** la regla SQL actual exige una sola moneda de liquidación y no admite pagos parciales/sobrepago/cambio. No asumir que esto fue aprobado; obtener confirmación explícita antes de activar.
- **P1 operativo:** no existe UI de checkout; feriados bancarios entre semana no tienen calendario oficial y siguen fail closed.
- **Pruebas seguras:** checkout integration tests exigen conexiones localhost separadas `microapp_runtime`/`microapp` a `microapp_test`; rechazan cualquier destino no desechable.
- **CI shared-DB race:** #257 falló por DDL/DML concurrente al eliminar trigger temporal de auditoría. #259 ya está fusionada en main como `07b146a3f2b7830bbd328a585535084e57e43c4e`; #257 y #258 deben verificar sus nuevos HEADs con esa serialización.
- No Neon main, secretos, Cloudflare productivo, DNS, billing, datos reales ni deploy cambiados.

# Estado vivo de seguridad — 2026-11-08 UTC

> Este bloque prevalece sobre snapshots inferiores. No confundir implementación en GitHub con activación en producción.

- Rate limiting OAuth de #213 está integrado en main con UPSERT atómico y pruebas.
- Cleanup auth de 48 h está implementado en #251, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, 15/15 check-runs SUCCESS. Cron permanece Draft y bloqueado hasta que Neon main tenga el esquema/grants y se verifique el login real `microapp_runtime`.
- BCV oficial está implementado en #255, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, 15/15 check-runs SUCCESS. Latest y cliente usan no-store; el dashboard revalida al cambio de fecha Caracas. No hay calendario oficial de feriados entre semana: fail closed. No fusionar ni activar Cron hasta migration 0013 aplicada mediante runner autorizado y runtime grants verificados.
- Neon main no tiene `microapp_runtime`, `microapp_migrator`, `schema_migrations` ni `auth_bootstrap_attempts`; rehearsal tiene los logins, pero runtime carece de grants de tabla y no se han aplicado 0003–0016. El workflow de migration runner valida PostgreSQL efímero, no Neon. No usar SQL manual para aplicar migraciones.
- **P1 inventario — modelo de privilegios por resolver:** migration 0012 concede a `microapp_runtime` `INSERT` y `UPDATE(on_hand_quantity, updated_at)` sobre `inventory_balances`. Migration 0010 obliga a emparejar cada cambio con un movimiento append-only en la misma transacción, pero no equivale a una proyección de saldos que solo pueda ejecutar una función `SECURITY DEFINER`. El diseño técnico de #193 §7.9.I proponía runtime sin escritura directa de saldos. Resolver/aceptar explícitamente antes de producción; no afirmar que el trigger de pairing impide que un runtime comprometido invente movimientos.
- **Hallazgo de sesión pendiente:** `apps/api/src/google-auth.ts` conserva `SESSION_TTL_SECONDS = 7 * 24 * 60 * 60`. La auditoría histórica #211 recomendó revisar la exposición de una sesión robada durante 7 días. No reducir TTL silenciosamente: documentar el riesgo y obtener decisión de producto/seguridad sobre duración, renovación y revocación antes de cambiar el contrato.
- Hallazgos de #211 preservados en `docs/security/AUTHENTICATION_AUDIT_2026-11-05.md`: rate limiting OAuth start/bootstrap/callback implementado por #213 (session endpoints aún sin bucket); bootstrap raw-token cookie corregido mediante handoff opaco; TTL de sesión de 7 días sigue abierto para decisión del propietario; duplicación de validación Origin queda como mantenimiento; PBKDF2 helpers quedan para legacy/test mientras password login siga deshabilitado. #211 se cierra como supersedida tras preservar el informe y su disposición.
- #200, #204, #205, #207–#210 y #227–#232 cerradas como supersedidas con evidencia; no se descartaron funcionalidades. #257 conserva los ODD de inventario. #193/#202/#211/#233 siguen abiertos para reconciliación.
- No se modificaron secretos, Neon main, datos reales, Cloudflare production, DNS ni billing. Producción **NOT READY**.

---

# Estado vivo de seguridad — 2026-11-07 UTC (corregido)

> Sustituye los snapshots antiguos de estado que aparecen debajo. Main actual: `a38463ea00415c7601d716132e70a29e381a2e34`.

- Rate limiting OAuth canónico de #213 está integrado en `apps/api/src/auth-rate-limit.ts`, con UPSERT atómico PostgreSQL y pruebas de concurrencia/endpoint.
- Limpieza horaria de 48 h para `auth_rate_limits` y `auth_bootstrap_attempts` está en PR #251, HEAD `2a0c685a2348af87f76417b4f3ac0f77a70cbb5d`; 10/10 workflows PR + 2 push scans SUCCESS. Sigue Draft y no se debe activar en producción hasta que Neon main tenga `auth_bootstrap_attempts`, login `microapp_runtime` y grants comprobados.
- PR #252 está fusionada: ruta de bootstrap rechaza un body oversized sin Content-Length con 413; el body limiter compartido ya cubría el stream y UTF-8 inválido.
- Neon main, verificada en vivo por SELECT: 15 tablas, sin `schema_migrations`, `auth_bootstrap_attempts`, `microapp_runtime` ni `microapp_migrator`. El ensayo tiene esos roles, pero runtime todavía carece de grants de tabla hasta aplicar 0003–0016. No hay evidencia de que el Worker de producción use el principal runtime correcto.
- No hay workflow de release ni secret de rehearsal para ejecutar el runner de migraciones contra Neon. El proceso de producción debe seguir bloqueado hasta tener runner protegido, backup/restore, grants y smoke autenticado verificados.
- #218–#226 fueron cerradas como supersedidas; los cambios útiles están en main/#251/#252. #227 permanece reabierta solo como ancla temporal para #228–#233; su aplicación BCV y la corrección de #250 están recuperadas en #255. #250 y #254 están cerradas como supersedidas/duplicada.
- PR #256 integró una corrección de fixture de backup/restore sin tocar código de aplicación ni datos reales; los checks post-merge finalizaron SUCCESS (10 check-runs y 8 push workflows, incluidos Cloudflare Pages y Workers builds).
- No se modificaron secretos, Cloudflare dashboard, DNS, billing, datos reales ni Neon main. Producción **NOT READY**.

---

# Estado vivo de seguridad — 2026-11-07 UTC

> Este bloque sustituye los snapshots antiguos de estado que aparecen debajo. Verificar SHA, PR y entorno antes de cualquier acción; Neon main y producción siguen siendo gates separados.

- `main` de GitHub verificado en `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`. La implementación actual de rate limiting OAuth vive en `apps/api/src/auth-rate-limit.ts` y usa el HMAC canónico de #213; no es correcto seguir afirmando que solo existe la tabla sin callsite runtime.
- El control de tasa usa UPSERT atómico PostgreSQL y las pruebas de concurrencia/endpoint están en `auth-rate-limit.integration.test.ts`. El CI de #251 confirmó también las pruebas con el login desechable `microapp_runtime`.
- La retención horaria de 48 h para `auth_rate_limits` y `auth_bootstrap_attempts` está implementada en PR #251, HEAD `4a0662346c2a1f95bcf09d815df55755f53686cd`, con 10/10 workflows PR SUCCESS. Sigue Draft: no activar Cron en producción hasta que Neon main tenga el esquema `auth_bootstrap_attempts` y el runtime login/grants validados.
- La lectura anterior de Neon main encontró esquema 0001+0002, sin `schema_migrations`, sin `auth_bootstrap_attempts`, sin `microapp_runtime` ni `microapp_migrator`. No se ha escrito en Neon main ni se han cambiado credenciales.
- El código de repositorio y CI no demuestran que el Worker de producción use el principal runtime correcto ni que la base productiva tenga las migraciones/grants actuales. No declarar autenticación o catálogo/inventario listos en producción por CI verde.
- No se han modificado secretos, Cloudflare dashboard, DNS, billing ni datos reales. Producción **NOT READY**.

---

## Estado vivo de seguridad y gobernanza — 2026-11-04 UTC

- `main` = `2e0f4083ba577de2f301daf8c866bfbdffb5e23f`; PR #198 integró ODD por squash. PR #197 quedó cerrada sin merge como supersedida.
- PR #196 sigue Draft y sin fusionar, HEAD `c332e740aff279fb8b22a8879581d4b8a3c7de21`, base registrada `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`; está detrás de main y debe reconciliarse antes de otra decisión. Catálogo/inventario solo existen en esa rama, no en main/producción.
- Los 11 workflows del HEAD exacto de #196 finalizaron success; esta evidencia no convierte la rama stale en mergeable ni declara readiness de producción.
- La matriz `docs/sdd/role-permission-decision-matrix.md` está **APROBADA desde 2026-10-31**. La implementación sigue parcial: los handlers de catálogo/conteos de #196 están en una PR no fusionada; las demás operaciones requieren autorización y pruebas propias.
- Issue #53 continúa abierta hasta demostrar aislamiento cross-tenant y por rol en todos los handlers aplicables.
- `auth_rate_limits` existe en SQL, pero no se ha demostrado un callsite de rate limiting runtime en `apps/api/src`; no afirmar que OAuth/bootstrap tienen limitación por tasa.
- Backup/restore sigue parcialmente verificado: faltan RPO/RTO medidos de extremo a extremo, alerta externa de fallo y evidencia de coste total $0.
- Protección de `main`: última lectura exitosa documentada el 2026-11-01; el intento de lectura del 2026-11-04 devolvió 403 por alcance de API. No presentar la configuración como revalidada hoy.
- No se tocó Neon producción, datos reales, secretos, billing ni despliegues de producción.

## Snapshot histórico — identidad y hardening — 2026-10-29


- PR #153 está fusionada en main; bootstrap OAuth ya no acepta secretos por query string: GET rechaza parámetros de bootstrap y el alta inicial usa POST con validación de Origin/content-type/cuerpo/campos y token de un solo uso, además de state/PKCE y cookies temporales HttpOnly. No hay evidencia de filtración activa.
- PR #155 está fusionada en main: `FRONTEND_ORIGIN` para Google OAuth exige HTTPS, salvo HTTP en loopback de desarrollo, y rechaza credenciales, path, query, hash y origen no canónico.
- Esto corrige las notas históricas inferiores que describían bootstrap y HTTPS como cambios pendientes. No implica despliegue productivo ni que toda la identidad esté lista para operar comercialmente.
- La autenticación Google/allowlist tiene implementación en código; siguen pendientes autorización comercial por operación, aislamiento cross-tenant de rutas de negocio (porque aún no hay endpoints comerciales), matriz de roles aprobada, controles de abuso en el contexto completo de la API y los demás gates P0/P1 de esta hoja.
- **Hallazgo adicional de revisión estática 2026-10-30:** `auth_rate_limits` está definido en SQL, pero no se encontró implementación/callsite runtime en `apps/api/src`. No afirmar que las rutas OAuth/bootstrap tienen rate limiting. Verificar reglas Cloudflare por separado y añadir control distribuido probado antes de ampliar acceso.
- **Protección de `main` — precisión de estado 2026-10-30:** la sección histórica inferior registra que el 2026-10-26 la API confirmó PR obligatoria, seis checks y una aprobación requerida. En esta sesión, la lectura actual de `/branches/main/protection` devolvió HTTP 403 `Resource not accessible by integration`; por tanto, esa configuración no se pudo revalidar hoy. No afirmar que está activa hoy sin una nueva lectura autorizada. La política recomienda conservar al menos una aprobación independiente.
- Verificar siempre el SHA vivo de main y los workflows exactos antes de marcar controles como completados.

---

## ESTADO VIVO — mitigación de bootstrap propuesta en rama (2026-10-29 UTC)

- PR #152 ya está fusionada; merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`.
- El riesgo de secreto en URL tiene una corrección en curso en `fix/bootstrap-token-post-body-20261029`: GET rechaza los parámetros de bootstrap; POST exige Origin del frontend, content type de formulario, campos únicos permitidos, cuerpo máximo 2 KiB y token correcto antes de iniciar OAuth.
- **No marcar como corregido aún:** rama sin fusionar; falta revisar diff y esperar todos los checks del SHA final. No hay evidencia de filtración activa.
- La prueba no toca Neon ni requiere secretos reales; usa el token sintético de integración.

---

## ESTADO VIVO — restauración real verificada y bloqueos de seguridad vigentes (2026-10-29 UTC)

- La restauración técnica de la copia remota exacta `daily/backup-2026-10-29T17-29-48Z.dump.age` quedó verificada en [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): checksum independiente, descifrado y restauración en PostgreSQL 18 efímero.
- Esto supera las notas históricas que decían que la restauración de la copia real estaba pendiente. No demuestra conteos/relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo ni coste total $0; esos puntos siguen abiertos.
- La PR [#151](https://github.com/BTF14/Micro-app/pull/151) está fusionada y documenta guardrails de capacidad. El límite de organizaciones/sucursales sigue sin medir.
- **Bloqueo de negocio:** `docs/sdd/role-permission-decision-matrix.md` sigue explícitamente sin aprobación del propietario. No implementar permisos comerciales basados solo en la propuesta de IA.
- La API de la base auditada aún no tiene handlers comerciales HTTP; no hay pruebas cross-tenant reales para ventas/inventario porque esos endpoints no existen.
- No tocar Neon `main`, secretos ni producción. Conservar las notas históricas inferiores como historial, pero no usarlas como estado vivo cuando contradigan esta sección.

---

## Monitorización diaria de dependencias — corrección del informe en curso (2026-10-29)

- Workflow: `.github/workflows/daily-dependency-watch.yml`; cron diario 08:15 UTC, ejecución manual, permisos `contents: read`, instalación congelada y auditoría de vulnerabilidades.
- El run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) terminó en `success` y `pnpm audit --audit-level high` informó `No known vulnerabilities found`.
- La inspección de logs detectó un defecto de presentación: Bash interpretó backticks dentro de cadenas con comillas dobles y el informe de `pnpm outdated -r` quedó vacío. No considerar completa la información de actualizaciones por ese run.
- La fiabilidad del mantenimiento de dependencias se corrigió y fusionó mediante PR #141 (`fix: make dependency maintenance workflows reliable`); la actualización segura de tooling Cloudflare se integró en PR #142. No queda pendiente esa rama histórica.
- Dependabot continúa revisando semanalmente npm y GitHub Actions. El monitor diario es de solo lectura: no modifica dependencias ni crea PR automáticamente.
- El monitor no reemplaza Trivy, Dependency Review, escaneo de historial, revisión manual del diff ni pruebas completas; tampoco garantiza ausencia de vulnerabilidades.

# Hoja de ruta de seguridad — Micro app

- Estado: aprobada por el propietario el 2026-10-26.
- Principio rector, en palabras del propietario: **no se busca rapidez, se busca que todo salga bien y sin errores, con todos los protocolos de seguridad y ciberseguridad implementados**, pensando en que el proyecto puede escalar a varias personas a largo plazo.
- Esto no reemplaza `docs/CONSTITUTION.md` ni `docs/BACKUP_AND_RECOVERY.md`; los complementa con una lista concreta y priorizada de qué falta y en qué orden. `docs/COMPLIANCE_AND_ACCESSIBILITY.md` es un anexo en el mismo espíritu, enfocado en cumplimiento legal/privacidad y accesibilidad (WCAG).

Toda IA/chat que continúe este proyecto debe leer este documento como parte de la secuencia de arranque de `AGENTS.md`, y no debe saltarse ni relajar ninguno de estos puntos para ir más rápido, salvo instrucción explícita y nueva del propietario.

## Nivel 1 — Antes de seguir con el módulo de negocio (inventario/ventas)

### 1. Protección de la rama `main` en GitHub
**Estado: implementado y revalidado en vivo el 2026-11-01** contra `GET /repos/BTF14/Micro-app/branches/main/protection` (en esta sesión el endpoint respondió 200, a diferencia del 403 `Resource not accessible by integration` reportado el 2026-10-30 — probablemente una diferencia de alcance de token entre sesiones, no un cambio de configuración). Evidencia en vivo:
- `required_status_checks.contexts`: `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history`, `Trivy filesystem and configuration scan`, `postgres-migration`, `verify` (6, igual que el histórico).
- `enforce_admins.enabled: true`.
- `required_pull_request_reviews.required_approving_review_count: 0`.
- `allow_force_pushes.enabled: false`, `allow_deletions.enabled: false`.
- `required_conversation_resolution.enabled: true`.

**Discrepancia anterior resuelta:** el 2026-10-30 se había registrado `required_approving_review_count: 1` frente a la intención declarada del propietario de "0 aprobaciones mínimas". La lectura en vivo de esta sesión (2026-11-01) confirma `0`; la discrepancia ya no está presente. No se modificó la configuración de branch protection desde esta sesión de IA (sigue bloqueado por proxy para escritura); se asume que el propietario lo ajustó manualmente, o que la lectura del 2026-10-30 reflejaba un valor transitorio. Si una sesión futura vuelve a observar `1`, repetir este chequeo antes de asumir que es un valor estable.

La política vigente mantiene los cambios documentales en PR y no permite push directo a `main` (demostrado de nuevo en PR #187: rama → PR → 6 checks en verde → squash-merge, sin push directo).

### 2. Respaldo automático e independiente de la base de datos
**Estado: en progreso (2026-10-26).** Avance concreto de esta sesión:
- Creado en Neon un rol de solo lectura dedicado para respaldos, `backup_readonly` (proyecto `restless-fire-99110035`, rama `main`/`br-summer-math-b7297a60`, base `neondb`), con `SELECT` únicamente sobre las tablas de negocio y `ALTER DEFAULT PRIVILEGES` para que las tablas futuras también queden en solo lectura automáticamente. Verificado con una consulta a `information_schema.role_table_grants`: solo aparece `SELECT`, nunca `INSERT`/`UPDATE`/`DELETE`. Decisión de diseño: el `pg_dump` del backup debe excluir explícitamente `auth_sessions` (tokens de sesión activos) y `auth_rate_limits` (datos efímeros) — no son necesarios para reconstruir el negocio y no tiene sentido llevar tokens de sesión a un destino externo cifrado, aunque esté cifrado.
- Generado un par de llaves `age` para cifrar el volcado. La llave **pública** (no es secreta, se puede commitear) es `age1t04pgcguy87u99r4stlm0gcjsk9dj2s34jsmymw55vlarfteuakse8jmfk` — el workflow de GitHub Actions solo necesita esta para cifrar. La llave **privada** se le entregó al propietario una sola vez por chat y se borró de este entorno inmediatamente; sin ella nadie —ni esta IA— puede descifrar los respaldos. El propietario debe guardarla en un gestor de contraseñas; si se pierde, los respaldos pasados quedan irrecuperables (hay que regenerar el par y los respaldos futuros usarán la llave nueva).
- **Bloqueante nuevo, pendiente de decisión explícita del propietario:** Cloudflare R2 todavía no está habilitado en la cuenta (`r2_buckets_list` devolvió `10042: Please enable R2 through the Cloudflare Dashboard`). Por experiencia conocida de la plataforma, habilitar R2 por primera vez suele exigir vincular una tarjeta de pago a la cuenta de Cloudflare, incluso si el uso se mantiene después dentro del tier gratuito — esto no se pudo confirmar al 100% desde aquí porque la página de activación requiere sesión en el dashboard, así que el propietario debe verificarlo él mismo al entrar a *R2 → Overview*. Esto choca potencialmente con la restricción explícita del proyecto de **no tarjetas, no billing**. Dos caminos, pendientes de que el propietario elija uno:
  1. **R2** (como proponía el blueprint): si al entrar al dashboard confirma que puede habilitar R2 sin tarjeta, o está dispuesto a vincular una tarjeta y configurar una alerta de presupuesto en $0 para dormir tranquilo de que nunca se cobra nada mientras se mantenga bajo 10 GB.
  2. **Repositorio privado de GitHub dedicado solo a respaldos cifrados** (alternativa $0 real, sin tarjeta, sin proveedor nuevo): un segundo repositorio privado en la misma cuenta de GitHub, al que el workflow empuja únicamente el volcado cifrado de cada día (nunca código de la app). Como el volcado ya va cifrado con `age` antes de salir de GitHub Actions, el repositorio en sí no necesita ser tratado como secreto. Requiere política de retención manual (podar commits viejos) para que el repositorio no crezca indefinidamente.
- **Decisión tomada (2026-10-27): el propietario confirmó que Cloudflare pide tarjeta para habilitar R2**, así que se descarta R2 y se adopta la alternativa sin tarjeta: repositorio privado dedicado [`BTF14/micro-app-backups`](https://github.com/BTF14/micro-app-backups), creado manualmente por el propietario (esta IA no puede crear repositorios nuevos desde este entorno — solo opera sobre los repositorios ya configurados en la sesión).
- **Workflow implementado**: `.github/workflows/backup.yml` (este cambio). Todos los días a las 03:00 hora de Venezuela, hace `pg_dump` con `backup_readonly` excluyendo `auth_sessions`/`auth_rate_limits`, cifra con la llave pública `age` del punto anterior, sube el archivo cifrado a `micro-app-backups/daily/` usando el secreto `BACKUP_REPO_TOKEN` (token de acceso de solo ese repositorio, creado por el propietario), y borra del repositorio de respaldos lo que tenga más de 15 días.
- **Generación, cifrado, subida y checksum verificados** en la ejecución real del 2026-10-27 ([run 40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159)).
- **Restauración técnica verificada el 2026-10-29** en PostgreSQL desechable ([run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)): checksum y descifrado correctos, restauración completada, 13 tablas esperadas, 186 constraints presentes, 0 membresías huérfanas y tablas de sesión excluidas.
- **Estado: parcialmente verificado; no marcar aún como cerrado.** La copia probada tenía vacías las tablas de productos, ventas, pagos, movimientos, tipos de cambio, proveedores y auditoría; no demuestra recuperación de datos comerciales poblados. La retención de 15 días tiene pruebas unitarias y el workflow publica un resumen visible en Actions si falla un paso; esto no es notificación externa. Pendientes: verificar la siguiente ejecución y el checksum de la copia reciente, decidir si hacen falta notificaciones externas, probar datos sintéticos poblados, medir RPO/RTO y confirmar coste $0. Ver `docs/BACKUP_AND_RECOVERY.md`, secciones 6 y 8.

**Evidencia adicional de ejecuciones, verificada en vivo el 2026-11-01** (`gh run list`, no solo lectura de documentación histórica):
- `backup.yml` (diario): últimas 3 ejecuciones consecutivas en éxito (2026-10-29 a 2026-10-31); dos fallos anteriores el 2026-10-29 ya investigados y corregidos en su momento (ver entradas previas del journal), sin repetirse desde entonces.
- `backup-restore-smoke.yml` (datos sintéticos poblados, PostgreSQL desechable): últimas 3 ejecuciones en éxito (todas 2026-10-30). Esto es la prueba de **datos poblados** pendiente mencionada arriba — pendiente seguía siendo, al cierre del punto anterior, "probar datos sintéticos poblados"; ese workflow ya existe y pasa, pero su cobertura exacta (qué tablas pobladas, qué se compara post-restauración) no se reverificó línea por línea en esta sesión y debe confirmarse contra `docs/BACKUP_AND_RECOVERY.md` antes de marcar el punto como cerrado.
- `backup-real-restore.yml` (restauración técnica del volcado cifrado real): 1 ejecución registrada, éxito, 2026-10-29.
- **Seguimos sin RPO/RTO medido, sin alerta externa (fuera del resumen de Actions) y sin confirmación explícita de coste $0** — estos tres puntos permanecen abiertos y no se tocaron en esta sesión.

### 3. Dependabot
**Estado: implementado**, verificado en vivo el 2026-11-01. `.github/dependabot.yml` cubre `package-ecosystem: npm` (lockfile pnpm, agrupando parches/menores en un PR semanal, mayores sin agrupar) y `package-ecosystem: github-actions` (semanal). **Limitación de esta sesión, no del repositorio:** `GET /repos/BTF14/Micro-app/dependabot/alerts` devolvió `403 Resource not accessible by integration` con el token de esta sesión — la IA no puede leer la lista de alertas de seguridad abiertas desde aquí, y sesiones futuras deben asumir la misma limitación salvo que cambie el alcance del token.
- **Alertas revisadas por el propietario el 2026-11-01**, directamente en `https://github.com/BTF14/Micro-app/security/dependabot` (filtro `is:open`): **0 alertas abiertas, 15 cerradas**. Evidencia de fuente manual (captura de pantalla del propietario), no reproducible por API/CI con el token actual — tratar como válida pero no como una verificación automatizada propia. Si una sesión futura necesita reconfirmar este número sin pedírselo de nuevo al propietario, debe intentar primero con un token/alcance de `security_events` antes de asumir que sigue en 0.

### 4. Cabeceras de seguridad
**Estado: implementado**, confirmado en código el 2026-11-01:
- Frontend (Cloudflare Pages): `apps/web/public/_headers` agrega `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy` a toda respuesta.
- API (Cloudflare Worker): middleware en `apps/api/src/index.ts` agrega `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` a toda respuesta, y `Cache-Control: no-store` específicamente en las rutas `/auth/*` para que ningún caché/proxy intermedio sirva por error la respuesta de sesión de un usuario a otro.
- **CORS (parte de este mismo punto, frontend↔API):** verificado en vivo desde un runner con egreso completo (`.github/workflows/cors-verification.yml`, última ejecución exitosa 2026-10-31T23:52:41Z) contra el Worker real: el origen permitido (`https://micro-app-63i.pages.dev`) recibe `Access-Control-Allow-Origin` exacto + `Access-Control-Allow-Credentials: true` + los métodos y cabeceras (`authorization`, `content-type`) que el navegador solicita; un origen externo no listado (`https://attacker.example`) no recibe ninguna cabecera CORS. Esto es evidencia directa de que `FRONTEND_ORIGIN` en el Worker desplegado coincide con el frontend real — no una inferencia a partir del código fuente versionado.
- **Bundle publicado (issue #78, brecha C):** `.github/workflows/frontend-bundle-verification.yml` (última ejecución exitosa 2026-11-01T00:08:33Z) descarga el `index.html` y los bundles JS realmente publicados en Cloudflare Pages y confirma que contienen literalmente `https://micro-app-api.btfcasheb.workers.dev` como base de API, y que ningún otro host `*.workers.dev` quedó incrustado por error (build obsoleto/mal configurado).

## Nivel 2 — Antes de dar acceso al primer empleado

5. **Matriz de permisos por rol — APROBADA el 2026-10-31, corregida el 2026-11-01** (`docs/sdd/role-permission-decision-matrix.md`): el propietario decidió explícitamente ventas/descuentos, devoluciones/anulaciones y gestión de miembros/políticas; delegó explícitamente en la IA, con criterio técnico fundamentado, catálogo/inventario, caja y reportes/auditoría. La aprobación habilita, pero no sustituye, la implementación. **Corrección (PR #187):** la sección 2 (caja) contenía una fila que contradecía `docs/sdd/REGISTER_SHIFT_MODEL.md` (cierre de turno por supervisor) — corregida para denegar explícitamente cierre/reapertura de turno ajeno, consistente con el trigger de la migración 0004. La sección 1 (inventario) ya documentaba correctamente, desde la aprobación original, que el "alcance sucursal" de Inventory se refiere a quién puede operar y no a que el stock esté particionado por sucursal (`products.stock_quantity` sigue siendo organizacional); revisado el 2026-11-01 y no se encontró contradicción ahí. Ningún endpoint de negocio (ventas, inventario) debe fusionarse a `main` sin pruebas automatizadas de aislamiento cross-tenant y de rol cubriendo esa tabla; hasta entonces este punto permanece **aplicar: pendiente**, solo la decisión está **aprobada**.
6. **Pruebas negativas de aislamiento entre negocios (multi-tenant)**: confirmar con pruebas automatizadas que un usuario del negocio A nunca puede leer ni escribir datos del negocio B, ni siquiera manipulando IDs en la URL/body. Ya es requisito de `docs/CONSTITUTION.md`; hacerlo bloqueante antes de exponer cualquier endpoint de negocio real.
7. **Registro de auditoría** para acciones sensibles (cambios de precio, anulación de ventas, eliminación de productos/usuarios): quién, qué, cuándo. Sin esto, con varias personas con acceso, no hay forma de reconstruir qué pasó ante un error o un fraude.
8. **Flujo real de invitación de usuarios**, en vez de inserciones manuales en Neon. Ver el patrón SQL actual (manual) en `docs/CURRENT_STATE.md`.
8.1. **Diseño de "derecho al olvido" sin romper el libro de movimientos**: al construir el flujo de baja de usuarios, anonimizar el vínculo personal en auditoría/ventas sin borrar el registro financiero en sí. Detalle y motivo en `docs/COMPLIANCE_AND_ACCESSIBILITY.md` punto 12.
8.2. **Foco atrapado en el modal de ayuda** (`HelpModal` en `apps/web/src/App.tsx`): hoy `Tab` puede salirse del modal hacia el fondo de la página, y el foco no vuelve al elemento que lo abrió al cerrarlo. Barato de arreglar, no bloqueante. Detalle en `docs/COMPLIANCE_AND_ACCESSIBILITY.md` punto 20.

## Nivel 3 — Cuando el equipo crezca de verdad

9. Límite de intentos fallidos / protección contra fuerza bruta en `GET /auth/google` y `GET /auth/google/callback`.
10. Revisión periódica (mensual) de `auth_allowlist`: desactivar de inmediato a quien deje de trabajar en el negocio.
11. Política interna (no técnica, pero documentada aquí): exigir verificación en dos pasos en las cuentas de Google de todo el personal con acceso.
12. Si el sistema llega a guardar datos personales de **clientes** (no solo del negocio), reemplazar el aviso básico de privacidad actual (en el centro de ayuda de la app) por una política revisada por un abogado.

## Cómo usar este documento

- Cada vez que se complete un punto, actualizar su "Estado" aquí mismo (no basta con mencionarlo en el journal) y referenciarlo desde el checkpoint correspondiente de `docs/CURRENT_STATE.md`.
- No marcar nada como "implementado" sin evidencia verificada (igual que el resto de `AGENTS.md`): un PR fusionado con los checks en verde, o una confirmación explícita del propietario para los pasos que requieren su acción manual.
- Si un futuro chat necesita ir más rápido por alguna razón, debe pedir confirmación explícita del propietario antes de saltarse cualquier punto de este documento — la instrucción vigente es priorizar que todo esto quede bien hecho sobre la velocidad.


---

## Actualizaciones de runtime y cadena de suministro — regla vigente (2026-10-29)

La actualización frecuente reduce exposición a vulnerabilidades conocidas solo si se combina con advisories, lockfile reproducible, revisión de compatibilidad y pruebas. La versión más nueva no es por sí sola una garantía de seguridad.

- Mantener actualizados parches y releases compatibles; revisar Dependabot, Dependency Review, Trivy y avisos oficiales.
- Para upgrades mayores (TypeScript 7, Vite 8, plugin-react 6, jsdom 30), revisar breaking changes, engines/peer dependencies y ejecutar toda la suite en una sola rama coherente.
- Mantener Node en la línea LTS 24 por ahora; aplicar el último parche 24.x tras verificar CI. No cambiar a Node 26 ni actualizar pnpm a major 12 sin prueba de compatibilidad/lockfile.
- No usar versiones beta, RC, canary o nightly para runtime de producción sin una excepción explícita y una justificación documentada.
- Preservar siempre overrides.undici = 7.30.1 tanto en package.json como en pnpm-lock.yaml. Una actualización que lo elimine o resuelva undici 7.29.1 debe rechazarse.
- No editar manualmente resoluciones del lockfile. Usar pnpm, --frozen-lockfile en CI y Dependency Review.
- Registrar en CURRENT_STATE/HANDOFF el número de versión declarada y resuelta, fecha de consulta, fuente y SHA verificado; distinguir versión publicada de versión realmente fusionada.
- Cloudflare recomienda evaluar wrangler types para generar tipos según compatibility date/configuración; no mezclar esa migración con un upgrade masivo sin pruebas.
- El inventario de versiones y plan de migración al 2026-10-29 se encuentra en docs/CURRENT_STATE.md y docs/HANDOFF_NEXT_CHAT.md.


## 2026-10-29 — recuperación con datos sintéticos: implementación en verificación

- Las PR #140 y #142 se fusionaron y los checks post-merge en `c87893313534049463917af5ee17dfd36ba319c4` terminaron en `success`.
- La prueba sintética poblada pasó en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, manifiesto y relaciones preservadas, y exclusión de tablas efímeras. Siguen pendientes RPO/RTO de extremo a extremo, alerta de fallo y confirmación de coste $0; no se ha probado restauración integral de una copia real.
- Se añade en la rama `test/backup-restore-synthetic-20261029` un workflow mensual/manual de backup-restore smoke test con PostgreSQL efímero, fixture sintético, clave age temporal, checksum, comparación de manifiesto de 13 tablas y relaciones, y exclusión de tablas efímeras de auth. No usa secretos, Neon ni datos reales.
- Estado de este punto: **en verificación** hasta ver CI verde para el SHA exacto. La prueba sintética no sustituye el RPO/RTO real ni la recuperación operativa de una copia de producción.


## Estado vivo — 2026-10-29 UTC, recuperación y dependencias

- PR #143 añadió el smoke test sintético de backup/restore. El run [40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) terminó en `success` para SHA `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Verifica datos sintéticos relacionados, checksum, cifrado/descifrado, manifiesto de 13 tablas/constraints/relaciones y exclusión de tablas efímeras.
- El punto de backup continúa **parcialmente verificado**: no se han medido RPO/RTO reales ni probado la alerta de fallo y el coste $0; no confundir el laboratorio sintético con la restauración integral de una copia real.
- PR #142 actualizó Wrangler y workers-types a versiones compatibles y fijó Node en `>=24.22.2 <25`, manteniendo TypeScript 5, Vite 7 y `undici@7.30.1`.
- El monitor diario [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) reportó `No known vulnerabilities found` en SHA anterior a #142. Detectó majors estables de Vite, plugin React, jsdom y TypeScript; evaluar compatibilidad antes de actualizar, sin hacer upgrades masivos a ciegas.
- La rama de corrección del monitor `fix/dependency-watch-report-20261029` ya no contiene cambios exclusivos frente a `main` (0 ahead, 4 behind); no abrir una PR redundante. La siguiente ejecución programada debe informar las versiones actuales tras #142.


### Backup workflow incident — 2026-10-29

Snapshot histórico: el manual run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763) generó/cifró/checksum un dump, pero falló antes de subirlo por una ruta incorrecta del script de retención. La corrección se integró en PR #143 (merged 2026-10-29); el run fallido no alteró backups remotos ni ejecutó retención. La validación posterior de backup/restore está documentada por los runs 40955935124 (restore remoto exacto en PG18) y 41020548699 (smoke sintético cifrado PG18).


## Actualización 2026-10-29 — consistencia HTTPS de FRONTEND_ORIGIN

- **Hallazgo:** el helper local de `apps/api/src/google-auth.ts` no exigía HTTPS ni restringía HTTP a loopback, a diferencia del validador de `apps/api/src/index.ts`. No hay evidencia de explotación; clasificado como hardening de configuración P1 antes de habilitar bootstrap en condiciones reales.
- **Corrección implementada y fusionada en PR #155 (2026-10-29):** aplica el mismo allowlist de protocolos/hosts y rechaza credenciales, rutas, query, fragmentos y representaciones no canónicas. El código está en main; no reabrir la rama histórica.
- **Pruebas:** HTTPS válido; HTTP loopback permitido para desarrollo; HTTP remoto, credenciales y URL con path/query/hash rechazados.
- **Estado:** corrección HTTPS/canonical frontend origin para Google OAuth integrada en PR #155 (merged 2026-10-29); no reabrir la rama histórica. La implementación no significa que la API tenga endpoints comerciales.
- **Alcance excluido:** no cambia secrets, OAuth provider, bootstrap, DB, producción ni despliegues manuales.


## Estado de seguridad posterior a PR #155 — 2026-10-29 UTC

- PR #153 (bootstrap POST sin secreto en URL) y PR #155 (validación HTTPS de FRONTEND_ORIGIN) están fusionadas en main.
- PR #155 SHA verificado: `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`; ocho workflows finalizaron success, incluidos CI y Playwright. Codex review no se completó por límite de uso; no se afirma revisión independiente.
- Cloudflare informó previews de Pages/Workers para el commit; no hay evidencia de despliegue productivo ni prueba HTTP contra producción.
- Siguen P0/P1 de producto: autorización por operación, aislamiento cross-tenant end-to-end, matriz de roles aprobada, límites de abuso/rate limiting revisados, integridad transaccional/idempotencia y recuperación operativa. No abrir módulos comerciales antes de estos gates.
- No hay evidencia de explotación del hallazgo HTTPS anterior; se corrigió en código main. La corrección no sustituye verificación de configuración productiva.

---

## Corrección de evidencia — backup role y cobertura de restauración (2026-11-10)

Las notas históricas de la sección 2 que describen `backup_readonly` como SELECT-only reflejan una comprobación anterior de grants visibles en tablas; no demuestran sus privilegios efectivos actuales. La consulta posterior documentada en CURRENT_STATE/issue #53 detectó que el rol observado hereda capacidades de escritura por membresías (`neon_superuser` / `pg_write_all_data`). No asumir que el secreto `DATABASE_URL_BACKUP_RO` autentica como `backup_readonly`: el principal efectivo del secreto sigue sin demostrarse. Mantener el punto P0 abierto y no tocar roles/grants de Neon main sin procedimiento y autorización específicos.

La prueba sintética `backup-restore-smoke.yml` tampoco cubre el esquema vigente: aplica solo 0001, 0002 y 0005, y valida 13 tablas, mientras main versiona 0001–0016. Quedan fuera tablas de sucursales, turnos, warehouses, inventory counts, balances, ledger y el ledger de migraciones. Ver `odd/tasks/backup-restore-schema-coverage.md` y issue #53 comentarios 6772340874/6772383789. No marcar backup/restore como cerrado por un smoke test histórico o un run SUCCESS.

Fecha límite inamovible: **2026-12-01**. Producción NOT READY.

## Actualización — cobertura de esquema en restore smoke (PR #303, 2026-11-10)

La fase 1 de hardening añade un round-trip sintético de esquema completo a `backup-restore-smoke.yml`: migration runner oficial, PostgreSQL 18 desechable, dump/age/checksum/restore y comparación de nombres/definiciones de objetos y ledger. Se mantiene separada de la prueba de datos histórica. No cierra el gate de backup: siguen pendientes el fixture comercial poblado completo, identidad efectiva de `DATABASE_URL_BACKUP_RO`, privilegios least-privilege, RPO/RTO, restore de copia remota reciente, alerta y coste $0. PR #303 OPEN/Draft, sin merge. Issue #53 OPEN/P0; producción NOT READY; deadline 2026-12-01.
