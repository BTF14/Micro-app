## Revalidación de CI exact-HEAD — 2026-11-09 UTC

> Actualización posterior a la lectura del bloque anterior. Este bloque registra resultados del HEAD indicado; cualquier commit posterior requiere otra consulta exacta.

- PR #298 continúa OPEN/Draft en `2e5b5745f4cc2023b7f64436e93cd15261f932e8`, base `c5373564413ba086690552c6b7deeab08d7b4a89` (`main` observado). Comparación: 122 commits ahead / 0 behind; 37 archivos modificados, todos Markdown/documentación.
- Los **11 workflow runs** asociados exactamente a ese HEAD terminaron SUCCESS, incluido Semgrep SAST (antes IN_PROGRESS). No se observaron workflow failures en ese SHA.
- La interfaz de status combinado legacy devolvió una lista vacía; no se debe convertir eso en un contador de check-runs ni afirmar que se consultaron todos los check-runs formales. La lista de workflow runs sí está completa en la consulta realizada.
- PR #298 sigue sin reviews formales ni review threads. `mergeable=true` no equivale a aprobación, autorización de merge, aceptación funcional ni readiness productiva. Mantener Draft.
- PR #287 continúa OPEN/Draft en `7df318b233cfb95f7fcc3076d46984a11614a14c`: 11 workflows exact-HEAD, 6 SUCCESS y 5 FAILURE (ODD docs, Dependency review, Project dashboard, Playwright E2E y CI). La causa raíz sigue sin evidencia accesible; no inferirla.
- `main` no cambió. No se hicieron modificaciones de aplicación, migraciones, Neon, producción, secretos, DNS, billing ni datos reales.
- La revisión de los archivos de configuración en main confirma CORS fail-closed, bloqueo de rutas de preview, cabeceras de seguridad, Dependabot semanal y workflow de backup cifrado. Esto es evidencia estática de configuración, no prueba HTTP/runtime actual, estado de alertas Dependabot, RPO/RTO completos ni coste total.
- El acceso web de esta sesión no pudo recuperar `/health` del Worker ni el frontend Pages; por tanto no se declara smoke test HTTP ni se infieren headers reales desde el código.
- Seguridad Nivel 1 permanece ABIERTO y producción **NOT READY**. La aceptación P0 desde UI continúa sin demostración completa (0/1 jornada). La fecha límite sigue siendo **2026-12-01**, inamovible.
- Mantener todas las restricciones: no merge, no main writes, no deploy manual/productivo, no migraciones remotas, no Cron productivo, no datos reales, no cambios de secretos/DNS/billing. No iniciar lógica comercial ni UI de caja mientras Seguridad Nivel 1 siga abierta.

---

## Reconciliación viva de continuidad — 2026-11-10 03:35 UTC

> Este bloque sustituye como referencia operativa a los snapshots anteriores de este documento. El SHA de #298 que se muestra es el HEAD consultado inmediatamente antes de este commit documental; este mismo cambio mueve la rama. Reconsultar GitHub para el HEAD y CI posteriores. Nunca reutilizar contadores de otro SHA.

### GitHub verificado
- `main`: `c5373564413ba086690552c6b7deeab08d7b4a89`; `protected=true`, seis checks requeridos. La configuración detallada de approvals no quedó accesible/verificada.
- PR #287: OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; 13 workflow runs exact-HEAD: 8 SUCCESS / 5 FAILURE; 10/10 check-runs SUCCESS. Fallan ODD docs, Dependency review, Project dashboard, Playwright E2E y CI. Los cinco endpoints de jobs devolvieron listas vacías; causa desconocida, sin atribuir a código o infraestructura. Sin reviews formales ni review threads.
- PR #296: OPEN/Draft, HEAD `73b0b134c14cb30f7c93d038c10acd0da5aa274c`; 12/12 workflows y 14/14 check-runs SUCCESS. Especificaciones documentales; PIN/calendario no implementados. Sin reviews formales ni threads.
- PR #298: OPEN/Draft, HEAD pre-actualización `5259153367a9228a5c5b5fd83427065c4f0610e4`; 13 workflows exact-HEAD: 7 SUCCESS / 6 IN_PROGRESS; 14 check-runs: 7 SUCCESS / 7 IN_PROGRESS. 110 commits ahead / 0 behind, 37 archivos Markdown. Sin reviews formales ni threads. Los resultados no validan el commit creado por esta actualización.
- PR #299: OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`; 12/12 workflows y 14/14 check-runs SUCCESS. Mide solo `pg_restore` sintético, no RTO completo.
- PR #255, #269 y #295: CLOSED, no merged, supersedidas por #287; ramas históricas conservadas. #297 registró la disposición en main.

### Decisiones P0 vigentes
- Fecha límite inamovible: **2026-12-01**.
- Objetivo de producción: un comercio piloto, un solo local y capacidad verificada de hasta 1.000 productos, con jornada POS completa desde la UI. Una demo, preview o beta parcial no cumple el objetivo.
- No hay descuentos ni promociones en Micro-app. No crear campos, endpoints, UI ni autorizaciones de descuento. Cambios manuales de precio fuera del checkout P0.
- Toda venta exige tasa BCV válida con fecha efectiva exacta de la operación, incluso 100 % USD. Una tasa futura no se usa antes de su fecha efectiva; fines de semana/feriados sin fila exacta fallan cerrado, pendiente revisión legal/contable.
- Se conserva aislamiento multi-tenant/multi-branch aunque la aceptación inicial use un local.
- Los métodos y reglas comerciales de pagos que no tienen aprobación explícita (parciales, mixtos, sobrepago/cambio y catálogo final de métodos) no se infieren de las constraints SQL.

### Estado de producto y seguridad
- Producción: **NOT READY**. La aceptación P0 completa desde UI no está demostrada; no publicar porcentajes de implementación como porcentaje de aceptación end-to-end.
- Seguridad Nivel 1 sigue ABIERTO: Dependabot alertas no revalidadas; cabeceras/CORS solo tienen evidencia histórica; backup/restore parcialmente probado. Se observó un intervalo de backup de 27 h, por lo que no se garantiza RPO <=24 h; RTO integral, alerta controlada y coste $0 siguen pendientes.
- En #287, migration 0017 fue provisional; 0020 impone fecha efectiva exacta todos los días y 0021 exige último sync exitoso. Se conserva el hallazgo: una tasa marcada stale puede permanecer stale cuando una sincronización posterior confirma exactamente el valor original y devuelve unchanged.
- Previews Pages/Workers reportados para SHA anterior `98675da` no son producción ni evidencia de preview en el HEAD actual.
- El handoff anterior registra que Caja/Ventas, Inventario y Reportes no completan todavía el recorrido de UI y que no hay apertura/cierre de turnos demostrados end-to-end. Revalidar al cerrar Nivel 1.

### Evidencia directa del P0 en main — comprobada en este turno
- En main `c5373564413ba086690552c6b7deeab08d7b4a89`, `apps/web/src/App.tsx` (blob `90d43a3cb6ba79a7a26b980084c7aec96d0be824`) marca “Caja y ventas” e “Inventario” como “Pendiente de implementación” y presenta Caja/Ventas, Inventario y Reportes como navegación deshabilitada (“Pronto”).
- `apps/api/src/index.ts` (blob `8c962b92e448dfea735301274efaa81a70ad2097`) registra autenticación, Google auth, catálogo y rutas de inventario; no registra rutas HTTP de checkout/ventas ni de apertura/cierre de turnos.
- Existe el helper `apps/api/src/cashier-open-shift.ts`, pero un helper no equivale a endpoints ni a un flujo de UI.
- PR #287 contiene checkout/BCV y migrations 0017–0021 en una rama Draft, pero no está integrada en main; tampoco se encontró en esa rama un router HTTP de turnos. Sus cinco workflow failures siguen sin causa raíz observable.
- Conclusión: main **no puede completar hoy el P0**. No se ha demostrado ninguna jornada completa desde UI ni una venta real de prueba end-to-end. No calcular porcentaje de implementación a partir de archivos o endpoints aislados; aceptación P0 demostrada: **0/1 recorrido completo**.
- Esta comprobación es de código fuente en GitHub; no ejecuta la aplicación ni sustituye una prueba autenticada de UI.

### Restricciones y siguiente orden
- No merge ni cambios en main en esta fase; no deploy manual/productivo, Neon main, migraciones remotas, Cron productivo, datos reales, secretos, DNS ni billing.
- No iniciar nueva lógica comercial ni UI de Caja/Ventas mientras Seguridad Nivel 1 siga abierto.
- Priorizar cierre demostrable de Nivel 1 con pruebas sintéticas, diagnóstico de los cinco fallos #287 solo si aparece evidencia nueva y reconciliación de los contratos BCV/pagos antes de habilitar checkout.
- PR #296 y #298 modifican seis archivos de continuidad en paralelo. Antes de cualquier futura integración, reconciliar sus diffs por archivo para preservar el contenido único de PIN/calendario y evitar sobrescrituras; no fusionar ni cerrar ninguna en este bloque.

---

## Última lectura de GitHub antes de esta actualización de continuidad — 2026-11-10 02:50 UTC

- `main` observado: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- PR #298: OPEN/Draft, HEAD observado `5597ed38e545b70138f5e677c29c6c40f4f1d78b`, 29 archivos modificados y todos son documentación; comparación con main: 87 commits ahead / 0 behind. `mergeable=true`, `mergeable_state=clean` en la última lectura; no es aprobación ni autorización para fusionar.
- En ese SHA exacto: 11/11 workflow runs SUCCESS y 14/14 check-runs SUCCESS. No había reviews formales ni threads inline.
- **Esta actualización de continuidad crea commits posteriores y cambia el HEAD.** Los resultados verdes anteriores validan únicamente `5597ed38e545b70138f5e677c29c6c40f4f1d78b`; no validan el HEAD resultante. Reconsultar PR #298 y todos los checks del SHA final. Mantener Draft y no fusionar.
- Revalidación de protección de `main`: `GET /branches/main` confirma `protected=true` y seis contextos requeridos; el endpoint detallado de protección sigue devolviendo 403, por lo que el número actual de approvals y opciones adicionales permanece desconocido.
- No se modificaron `main`, runtime, migraciones, Neon, producción, secretos, DNS, billing ni datos reales.

---

## Corrección de consistencia y estado vivo — 2026-11-09 UTC

> Este bloque es la referencia operativa más reciente de esta rama. Los snapshots posteriores/anteriores que sigan debajo se conservan como historial fechado; no deben reutilizarse como estado vivo. Revalidar GitHub antes de cualquier acción sensible.

### Objetivo y aceptación que no cambian
- **Fecha objetivo obligatoria: 2026-12-01.** P0: comercio pequeño/mediano, un solo local y catálogo de hasta 1.000 productos, jornada completa desde la UI según `docs/MVP_SINGLE_STORE_ACCEPTANCE.md`.
- No confundir objetivo con funcionalidad implementada, aceptación probada ni autorización de producción. No mover fecha ni alcance sin decisión expresa.
- El MVP de un local conserva aislamiento multi-tenant/multi-branch, permisos aprobados, presupuesto objetivo $0 y guardrails. Si un gate crítico sigue abierto el 30 nov, NO-GO para producción; beta controlada solo con riesgos explícitos y aceptación correspondiente.

> **Vigencia específica de PR #298:** la fila de la tabla que indica HEAD `98675da595b0c20906f2674ba3dd9d9fba677a63` y CI 13/13 + 15/15 corresponde exclusivamente a ese SHA anterior a la auditoría documental. Los commits posteriores de esta misma rama cambiaron el HEAD; esos resultados no validan los commits nuevos. Consultar siempre el HEAD vivo y su CI exacto en GitHub antes de decidir. No reutilizar los contadores históricos como estado actual.

### Estado GitHub revalidado por SHA exacto
Main observado: `c5373564413ba086690552c6b7deeab08d7b4a89`.

| PR | Estado | HEAD | Workflow runs exact-HEAD | Check-runs exact-HEAD | Decisión |
|---|---|---|---:|---:|---|
| [#287](https://github.com/BTF14/Micro-app/pull/287) | OPEN / Draft | `7df318b233cfb95f7fcc3076d46984a11614a14c` | 13: 8 SUCCESS, 5 FAILURE | 10/10 SUCCESS | Bloqueada; no declarar CI completamente verde |
| [#296](https://github.com/BTF14/Micro-app/pull/296) | OPEN / Draft | `73b0b134c14cb30f7c93d038c10acd0da5aa274c` | 12/12 SUCCESS | 14/14 SUCCESS | Documental; no declarar PIN/calendario implementados |
| [#298](https://github.com/BTF14/Micro-app/pull/298) | OPEN / Draft | `5597ed38e545b70138f5e677c29c6c40f4f1d78b` (snapshot previo) | 11/11 SUCCESS | 14/14 SUCCESS | Docs-only; los checks no validan commits posteriores; no merge |
| [#299](https://github.com/BTF14/Micro-app/pull/299) | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` | 12/12 SUCCESS | 14/14 SUCCESS | Medición de pg_restore sintético; no merge |

- #287 mantiene cinco fallos: ODD documentation, Dependency Review, Project progress dashboard, Playwright E2E y CI. Jobs/artifacts/logs no fueron accesibles por las interfaces consultadas; causa raíz desconocida. Los 10 check-runs SUCCESS no anulan los cinco workflow FAILURE.
- Las cuatro PR siguen Draft y sin aprobación formal. `mergeable=true`, cuando aparece, no es review APPROVED ni readiness.
- En #298 los bots de Cloudflare reportaron éxito de **previews automáticos de PR** para Pages y Workers en el commit `98675da`, con URLs identificadas como Commit Preview/Branch Preview. Esto sí es un despliegue de preview automatizado; no fue un despliegue manual ni demuestra promoción a producción, merge a main o smoke test autenticado de producción. Los snapshots que dicen “no deploy” describen el momento previo o la ausencia de despliegue productivo/manual; no deben interpretarse como ausencia de preview.
- No se fusionó ninguna de estas PR ni se modificó main en esta reconciliación.

### Seguridad Nivel 1 y backups
- **Gate Nivel 1 sigue ABIERTO**: `GET /branches/main` confirmó `protected=true` y seis checks requeridos; el endpoint detallado de protección sigue 403, por lo que el requisito actual de approvals no está verificado; Dependabot figura implementado pero las alertas no se pudieron revalidar (confirmación manual histórica de cero alertas); cabeceras/CORS verificados históricamente el 1 nov sin nueva prueba HTTP; backup/restore parcialmente verificado.
- Backup automático: ocho ejecuciones programadas del 2 al 9 nov SUCCESS. Run más reciente `42659924075`, 30 s de workflow; objeto cifrado y sidecar existen. El blob no se descargó, su hash no se recalculó independientemente, ni se descifró/restauró en esta sesión.
- La separación entre inicios de workflow del 8 y 9 nov fue 27 h 00 min 14 s; entre timestamps de nombres de backup, 27 h 00 min 16 s. No se garantiza RPO <=24 h. Los 30 s del workflow no son RTO.
- #299 mide únicamente el tiempo de `pg_restore` en un fixture PostgreSQL 18 desechable, no RTO operativo completo.
- Siguen pendientes RPO continuo/alerta, RTO end-to-end con fixture sintético poblado, prueba controlada de alerta, coste total $0 y revisión de los controles de acceso/seguridad. No restaurar ni manipular copias que puedan contener datos reales; solo fixture sintético en destino desechable salvo autorización nueva, explícita y acotada.

### Hallazgo BCV que debe conservarse
En el código de #287, si una tasa para una fecha ya almacenada cambia, la fila se marca `stale` y la sincronización registra fallo. Si una sincronización posterior recibe exactamente el valor previamente almacenado, `persistBcvOfficialRate` devuelve `unchanged` sin restaurar `validation_status='valid'`. Como checkout exige estado `valid`, la fecha podría seguir bloqueada aunque BCV vuelva a confirmar el valor original. Es un hallazgo estático de revisión, no una prueba runtime ni autorización para reactivar automáticamente tasas. Diseñar recuperación explícita y auditable antes de cerrar BCV.

### Secuencia y límites
1. No iniciar endpoints comerciales ni UI de Caja/Ventas mientras Nivel 1 siga abierto.
2. Continuar auditoría/correcciones documentales y pruebas de seguridad/backup sintéticas, sin duplicar PRs documentales.
3. Diagnosticar #287 solo si aparece una vía nueva de logs/annotations; no rerun ciego.
4. Mantener #287/#296/#298/#299 Draft; no merge, main writes, despliegue manual/productivo, Neon main, migraciones remotas, Cron productivo, secretos, DNS, billing ni datos reales.
5. Toda IA debe distinguir decisión, especificación, código en rama, código en main, preview, producción y aceptación probada.

### Replanificación P0 al 1 de diciembre
El plan por fechas que aparece debajo es una previsión, no evidencia de avance. La secuencia queda subordinada a los gates: (1) cerrar Nivel 1 con pruebas verificables; (2) resolver CI y revisión de #287; (3) solo entonces implementar turnos propios y UI de caja/checkout; (4) inventario/Kardex/conteos; (5) E2E PostgreSQL, hardening, backup/restore, observabilidad y aceptación. No iniciar fase 3 mientras Nivel 1 esté abierto. Si la evidencia no permite cerrar un gate a tiempo, declarar NO-GO producción, no rebajar controles para cumplir la fecha.

---
## Reconciliación posterior a PR #291 — snapshot 2026-11-09 UTC

## Decisión de aceptación MVP — POS de un local / 1.000 productos

- Decisión aprobada por el propietario el 2026-11-09: el objetivo de aceptación del 2026-12-01 es que un comercio pequeño/mediano, de un solo local y hasta 1.000 productos, pueda completar desde la UI una jornada POS: login, apertura de turno propio, búsqueda/carrito, venta/pagos admitidos, tasa BCV válida cuando aplique, comprobante interno, consistencia de venta/pagos/inventario y consulta de inventario/Kardex, conteo y cierre de turno.
- La especificación canónica, con pruebas y límites detallados, es [docs/MVP_SINGLE_STORE_ACCEPTANCE.md](MVP_SINGLE_STORE_ACCEPTANCE.md). Leerla antes de planificar o implementar.
- Esto concreta el P0; no cambia guardrails, permisos aprobados, presupuesto $0 ni los gates de seguridad/BCV/legal/operación. El MVP de un local no elimina el aislamiento multi-tenant/multi-branch. No afirmar que está implementado hasta probar el recorrido completo en el SHA exacto.
- Si un gate crítico no está demostrado, NO-GO para producción; como máximo beta controlada con limitaciones explícitas y aceptación correspondiente.


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

## Estado de integración actualizado — 2026-11-08 UTC

La matriz viva está en `docs/CURRENT_STATE.md`; este plan evita duplicar sus snapshots completos.

- #269 checkout/ledger: CI exact-HEAD completo en `0ae7f1d...` (16/16 check-runs, 14/14 workflows); mergeable=true pero sigue Draft por decisiones comerciales pendientes. No fusionar por CI verde.
- #255 BCV: CI exact-HEAD completo en `7e43d7f...` (15/15 check-runs, 13/13 workflows); sigue Draft por gates P1 operativos.
- #286: actualización documental en curso. El commit que añade este bloque cambia su HEAD y exige nueva validación exact-HEAD; no reutilizar checks del SHA anterior.

Prioridad: cerrar primero los gates explícitos de producto/operación y preservar main/Neon productivo. El ensayo Neon #42507066215 ya verificó 0001–0019 en `microapp_rehearsal`; no repetir escrituras remotas. Producción **NOT READY**.

## Estado de integración — 2026-11-08 UTC

La reconciliación detallada y los SHA autoritativos se mantienen en `docs/CURRENT_STATE.md`; este plan no replica snapshots de PR.

- #286 contiene la actualización documental posterior a #285; El snapshot previo validó HEAD `9071c492...`, 21 ahead / 0 behind, `mergeable=clean`, 13/13 check-runs y 10/10 workflows SUCCESS exact-HEAD, incluidos los seis checks requeridos de main. El commit documental actual exige nueva validación. Sigue Draft y sin review formal independiente; no fusionar solo por CI verde. Si cambia el SHA, revalidar.
- #269 y #255 siguen Draft y divergidas respecto a main (26/3 y 54/3); los gates de checkout y BCV continúan abiertos.
- Prioridad: resolver los gates de producto/operación y sincronizar ambas ramas de forma no destructiva antes de considerar su integración.
- Neon rehearsal #42507066215 ya pasó en entorno aislado; no repetir escrituras remotas. Producción sigue **NOT READY**.

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

## Snapshot operativo vigente — 2026-11-08 (supersede la tabla histórica inmediatamente inferior)

- main: 33016a2d206c7b8cfc60e53e34a56a26651141d7 (protegida; 6 contextos requeridos expuestos por GitHub).
- PR abiertas: #274 (workflow de rehearsal, 10/10 workflows SUCCESS en HEAD ee04e6d97b179a86ea842f8a1ae8a03b4c33a134; sin reviews formales), #269 (checkout+ledger Draft; 11/11), #262 (ledger apilada), #258 (checkout), #255 (BCV; 10/10), #233 (histórica Draft), #193 (no modificar).
- El detalle vivo y los bloqueos están en docs/CURRENT_STATE.md y docs/WORK_CHECKPOINT.md. Las tablas históricas de abajo no representan el estado actual y deben tratarse como historial.

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

## Prioridad operativa — reconciliada 2026-11-08 08:25 UTC

El estado actual de GitHub, la matriz de siete PR abiertas y los bloqueos exactos están en `docs/CURRENT_STATE.md`. Main vivo `d28b80edc6b2a63019ded100e46bb4b11e81153a`. No usar los snapshots históricos inferiores como estado actual.

1. #258/#262: completar revisión de checkout y proyección ledger; resolver el hallazgo P1 #6719238384 antes de exponer movimientos sin documento fuente.
2. #258: obtener decisión explícita de producto sobre liquidación en una sola moneda, pago exacto, sin parcial ni sobrepago.
3. #251 → #255: revisar la raíz primero; mantener Cron desactivado hasta rehearsal protegido y verificación de runtime login, ownership y grants.
4. #261: reconciliación documental en curso; #193 y #233 conservan material que debe revisarse antes de cerrar.
5. Producción NOT READY: no Neon main, secretos, configuración Cloudflare manual, DNS, billing ni deploy manual.

---

## Prioridad operativa — 2026-11-08 06:45 UTC

El estado vivo de GitHub está registrado en `docs/CURRENT_STATE.md` y el checkpoint de continuidad. Main es `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67`; hay seis PR abiertas (#193, #233, #251, #255, #258 y #261, esta reconciliación documental). #251, #255 y #258 tienen 15/15 check-runs y 13/13 workflow runs SUCCESS en sus HEADs exactos; siguen Draft y sin review formal independiente.

Orden:
1. Revisión independiente y gates de integración de #251 → #255.
2. Revisión completa de #258, incluyendo migrations 0017/0018, checkout transaccional, rate limit y sus 19 pruebas PostgreSQL exact-SHA.
3. Resolver Neon rehearsal/runner/identidad/grants sin tocar Neon main.
4. Resolver proyección de balances SECURITY DEFINER, decisión comercial de pago, feriados y UI checkout.
5. Preservar y revisar el documento único de #193; no cerrar #233 hasta completar provenance del contenido histórico.

No interpretar CI verde como aprobación ni readiness productiva.

---

## Prioridad operativa — 2026-11-08 UTC

## Estado operativo autoritativo — 2026-11-08 UTC

- **main:** `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`. #259 (serialización CI) y #257 (reconciliación documental) están integradas.
- **PR #251 — retención auth 48 h:** Draft, HEAD `ded2d95681e9a9436fdb2c9630092379a60405cb`, base main, 26 ahead / 0 behind; **15/15 check-runs y 13/13 workflows SUCCESS**. Prueba de cap 500 por tabla y segunda invocación que drena el remanente. Sin review formal independiente.
- **PR #255 — BCV oficial:** Draft, HEAD `a31892ae74958573a741cb36470182da6bdd529e`, base #251, 45 ahead / 0 behind; **15/15 check-runs y 13/13 workflows SUCCESS**. Parser/productor/API/UI/Cron y selección weekend. Sin review formal independiente; no integrado en main.
- **PR #258 — checkout atómico:** Draft, HEAD `48eaa489dfc062912871b98594c6db4083812087`, base main, 23 ahead / 0 behind; **15/15 check-runs y 13/13 workflows SUCCESS**. CI exact-SHA: 141 unit tests, 85 runtime-role PostgreSQL tests y 16 checkout PostgreSQL tests. Migration 0017 añade BCV weekday/weekend y validación SQL por línea; no está en main ni Neon. Sin review formal independiente.
- **PR #260 — este refresh:** HEAD previo `ebfc650954f9a65de0f51d36781605c36c73650c` pasó 13/13 check-runs y 11/11 workflows. Este commit actualiza el snapshot y cambia el SHA; revalidar el nuevo HEAD.
- **PR #193:** sigue abierta; no modificar la rama. Privilegios directos de runtime sobre balances, referencias sin FK tipada y snapshot legado ausente siguen documentados como gates.
- **PR #233:** fuente histórica; el checkout fue recuperado en #258. No fusionar la rama antigua ni cerrarla antes de integrar y verificar #258/#255.
- **PR #202 y #211:** cerradas después de preservar material único/hallazgos en documentación.
- **Producción: NOT READY.** No hay revisión independiente formal; Neon main/rehearsal no tiene las migraciones 0003–0017 aplicadas mediante runner protegido; falta validar login runtime/ownership/grants. No se ha activado ningún Cron productivo.
- **Gates checkout:** tasa BCV real #255; política comercial de pago (una moneda, pago exacto, sin parcial/sobrepago) sin aprobación funcional explícita; asignación USD proporcional por pago VES no validada individualmente por SQL; falta rate limit específico de checkout; privilegio directo de escritura de balances; falta UI y calendario oficial de feriados weekday.
- **No acciones productivas:** sin DDL/DML en Neon, cambios de secretos, configuración manual de Cloudflare, DNS, billing, deploy manual ni datos reales. Builds Cloudflare de PR son previews de rama, no prueba de producción.

### Orden de continuación

1. Esperar/validar los SHA exactos de #251, #255 y #258; no copiar checks de commits anteriores.
2. Obtener review formal independiente de las tres PR; mantener Draft mientras no exista.
3. Mantener la pila #251 → #255; no retargetear #255 a main sin reconstruir su base.
4. Resolver Neon rehearsal por runner protegido, verificar current_user, ownership, grants mínimos y Worker identity; main permanece intocable.
5. Resolver asignación por pago, rate limit checkout y privilegios de balances antes de producción.
6. Integrar UI de checkout después de cerrar contrato funcional y API; cerrar #233 solo cuando #258/#255 estén integradas y se confirme que no queda contenido único.

---

## Prioridad operativa posterior a #257 — 2026-11-08 UTC

1. **Checkout #258:** implementation/test suite verde en HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94` (15/15 checks, 13/13 workflows, 141 unitarias, 85 runtime-role, 16 checkout PostgreSQL). Sigue Draft por gates de producto/seguridad; migration 0017 aún no está en main/Neon.
2. **BCV #251 → #255:** ambas Draft y verdes en sus SHA exactos; integrar solo tras revisión y gate Neon, después reconciliar el Cron/router con #258.
3. **Inventario:** mantener ledger append-only, locks tenant/sucursal, conteos absolutos y transferencias en dos etapas. #193 no modificar por restricción previa; brechas P1 siguen documentadas.
4. **Neon:** main no tiene el esquema/roles de aplicación ni migraciones 0003–0017. Rehearsal solo mediante runner protegido; no SQL manual.
5. **Cierre histórico:** #233 no fusionar; cerrar solo después de integrar #258 y confirmar que todo contenido único está recuperado.

Producción **NOT READY**. CI verde no equivale a aprobación ni a evidencia de Neon/Worker desplegado.

## Prioridad operativa — 2026-11-08 UTC — actualización posterior a #259

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


## Prioridad operativa actual — 2026-11-08 UTC

1. **CI compartido:** #259 ya está fusionada en main como `07b146a3f2b7830bbd328a585535084e57e43c4e`; serializa runtime-role PostgreSQL y resuelve la carrera de triggers temporales. #257 debe revalidar el HEAD posterior.
2. **Checkout recuperado:** #258 porta handler/tests desde #233 y añade migration 0017. Implementation SHA `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 15/15 checks, 13/13 workflows, 141 unitarias, 85 runtime-role integration y 15 checkout PostgreSQL. HEAD `433a1fa1212f610cbb543597e620219bd91327a4` tiene 13/15 check-runs y 12/13 workflows SUCCESS; 3 verificaciones pendientes, sin fallos.
3. **Dependencia BCV.** #255 mantiene parser/API/UI/Cron oficial, Draft y no integrado. Resolver la pila #251→#255 y reconciliar sus cambios de Worker/router con #258 antes de activar checkout.
4. **Gates de producción de checkout:** aprobación explícita del contrato de pagos; assertions SQL de fórmula por línea y equivalentes por pago; resolver privilegio runtime directo sobre balances; calendario de feriados; UI. No fusionar ni activar checkout antes.
5. **Neon.** Main no tiene roles runtime/migrator ni migraciones 0003–0017. Rehearsal tiene logins pero sin ledger/migraciones. Solo runner protegido y autorización específica; no SQL manual.
6. **Inventario.** Mantener Kardex/ledger, locks tenant/sucursal, conteos absolutos y transferencias en dos etapas. No alterar PR #193 mientras siga la restricción específica registrada.

Producción **NOT READY**. No tratar CI verde como aprobación; reviews formales y decisiones de producto siguen separadas.

## Prioridad operativa vigente — 2026-11-08 UTC

Este bloque prevalece sobre prioridades históricas inferiores.

### Estado de ejecución

1. **Reconciliación GitHub — completada para la pila auth/BCV.** Main está en `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`. #251 HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6` y #255 HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0` están actualizadas, cero commits detrás de sus bases y con 15/15 check-runs SUCCESS. Ambas siguen Draft por falta de revisión formal y gates Neon.
2. **BCV — código y regresiones completados; revisión/Neon pendientes.** Parser oficial, precisión exacta, latest/history, fin de semana, UI, no-store, revalidación al cambio de fecha Caracas y Cron laborable. Feriados entre semana siguen fail closed por falta de calendario oficial.
3. **Neon — gate bloqueante.** Main no tiene roles de aplicación ni migraciones 0003–0016. Rehearsal tiene roles/ownership, pero runtime no tiene grants de tabla. El CI migration runner solo usa PostgreSQL desechable. No ejecutar SQL manual; falta autorización específica para crear/usar el secreto de rehearsal y un runner protegido.
4. **Checkout — siguiente recuperación técnica.** #233 contiene handler/tests únicos, pero su base y migration 0015 son antiguas. Portar solo el handler/tests a una rama nueva basada en #255, y diseñar migration 0017 para alinear el trigger con la regla de fecha efectiva BCV. Mantener bloqueada la activación hasta aprobación funcional del modelo de pagos.
5. **Inventario y sucursales.** Mantener el modelo Kardex/ledger, locks por tenant/sucursal, conteos absolutos, idempotencia y transferencias en dos etapas. Reconciliar #193 y documentación restante antes de crear nuevas ramas.
6. **Documentación.** #257 reúne ODD/locking y el estado de continuidad actual. #202 conserva addenda documentales de 2026-11-05 que todavía deben reconciliarse; no cerrar hasta recuperar lo útil.

### PRs

- Abiertas para trabajo/reconciliación: #193, #202, #211, #233, #251, #255, #257.
- Cerradas por supersesión verificada sin merge: #200, #204, #205, #207–#210, #227–#232. No reabrirlas ni duplicar sus cambios.
- No tratar check-runs verdes como aprobación formal.

### Gate de producción

**Producción NOT READY.** No mergear #251/#255 hasta que la rama Neon de ensayo ejecute el runner completo, runtime tenga permisos mínimos comprobados con login directo, backup/restore y smoke autenticado pasen, y exista revisión independiente. No modificar Neon main, secretos, DNS, billing ni Cloudflare production por conveniencia.

---

# Snapshot histórico de prioridades — 2026-10-30

> Esta sección conserva el plan operativo de su fecha y no es el orden de trabajo actual. La referencia vigente está al principio de este archivo y en `docs/CURRENT_STATE.md` / `docs/HANDOFF_NEXT_CHAT.md`; verificar GitHub antes de actuar.

## Estándar frontend aprobado — 2026-11-01

El propietario aprobó `docs/FRONTEND_DESIGN_STANDARD.md` para todo trabajo UI/UX nuevo y cambios sustanciales de frontend. Aplicar React + Vite/CSS existente, responsive (375/768/1280 px), WCAG 2.2 AA, tokens centralizados tras auditar los estilos existentes, estados completos y patrones específicos de POS/inventario. AAA es aspiracional cuando sea viable.

La adopción es documental y gradual: no requiere rehacer el login ni pantallas existentes, no añade dependencias y no cambia el estado de funcionalidades de producto. Antes de implementar frontend, leer el estándar y el skill `.agents/skills/micro-app-stack-guidance/SKILL.md`.


**Snapshot GitHub verificado antes de esta sincronización:** PR #178 OPEN, DRAFT, NOT MERGED; rama `docs/reconcile-role-model-and-cloudflare-20261030`; HEAD `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`; base `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`; 68 ahead / 0 behind. El commit de sincronización generará un SHA nuevo: consultar ese SHA y sus checks/previews antes de cualquier decisión.
**Validación del SHA padre:** 11/11 workflow runs de GitHub Actions success (9 PR + 2 push); Cloudflare Pages y Workers previews success para el mismo SHA. Diff de 13 archivos documentales (343 adiciones / 235 eliminaciones), 0 reviews formales, 0 threads inline. No marcar Ready ni fusionar sin autorización explícita. No se confirmó branch protection (403 en auditoría anterior).

## Orden de trabajo y gates
1. **P0 — Issue #78 / CORS y configuración efectiva:** obtener dos preflight HTTP reales al Worker: origen permitido `https://micro-app-63i.pages.dev` y origen externo `https://attacker.example`, método GET, headers authorization/content-type. Registrar status y headers `Access-Control-*`; el origen externo no debe recibir `Access-Control-Allow-Origin`. No exigir necesariamente 403 si el servidor responde 204 sin ese header. Ejecutar desde equipo con conectividad real; no repetir desde entorno que ya falló por DNS. El dashboard de Pages muestra una lista vacía, pero `apps/web/.env.production` versionado define `VITE_API_BASE_URL` hacia el Worker y `vite.config.ts` la carga con `loadEnv`. La página pública muestra el enlace OAuth al Worker; el bundle JS publicado aún no pudo inspeccionarse. Mantener la variable: no es específica de un hosting y forma parte de la configuración de build de Vite. No cambiar variables, secretos, tráfico ni despliegues.
2. **P1 — Issue #53 / decisión de permisos:** la estructura está definida como un rol único por miembro/organización en `organization_members.role`; `branch_memberships` solo asigna acceso a sucursales y no contiene roles por sucursal. La matriz de permisos por operación sigue **NO APROBADA**. Obtener aprobación explícita antes de implementar autorización comercial.
3. Solo tras aprobación de la matriz: diseñar catálogo de operaciones, autorización server-side, aislamiento cross-tenant/cross-branch, auditoría, idempotencia y pruebas negativas con PostgreSQL desechable.
4. Mantener inventario actual organizacional (`products.stock_quantity`); no afirmar inventario por sucursal implementado. Mantener caja por turnos y cierre ordinario; no añadir cierres de supervisor incompatibles.
5. Continuar roadmap de seguridad y producto respetando backup, coste cero y gates de producción.

## Evidencia Cloudflare observada
Worker `micro-app-api`: Active Deployment Producción, versión `49975c43`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a`, 100% de asignación de tráfico en el panel. Pages `micro-app`: producción `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, URL `https://cc23ff0c.micro-app-63i.pages.dev`; lista visible de variables vacía; `apps/web/.env.production` versionado define `VITE_API_BASE_URL` y `vite.config.ts` la carga con `loadEnv`. Solo lectura; no se modificó Cloudflare. CORS no queda probado por esta inspección.

No crear PR de apariencia ni duplicar trabajo. Toda PR debe tener propósito coherente, diff acotado, revisión manual y checks del SHA exacto.

---
> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan para trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


> **Archivo histórico — no usar como estado operativo.** Las prioridades y snapshots siguientes se conservan como historial y pueden estar superados. Usar el orden superior y verificar GitHub en vivo.



> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados que eran correctos en su fecha. Para el estado actual, usar el checkpoint de arriba y verificar GitHub en vivo.


> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Prioridad operativa vigente — autorización por operación — 2026-10-30 UTC

> Esta portada supersede prioridades anteriores que presenten la matriz o PR #172 en otro estado.

- Main conocido: `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`; resolver en vivo antes de cualquier cambio.
- Último merge runtime: PR #169 (`be35a0fde3886271b6ed98b7ccc29cc1255d50e5`). PR #170/#171 solo documentación.
- PR #172 abierta y no fusionada: propuesta de arquitectura de autorización server-side y sincronización de continuidad. El último checkpoint previamente validado fue `87de879b021cd4b68ce4267b138832279d4a043a` (12/12 checks success); consultar el HEAD vivo y sus propios checks antes de merge.
- Matriz comercial de roles/permisos: **NO APROBADA**. No implementar mapeos role→permission ni excepciones.
- No hay rutas comerciales ni auditoría/ledger comercial implementados. Los resolvers tenant/branch/shift solo resuelven contexto.
- No Neon main, no cambios de secretos/infra/producción, no aplicar migraciones 0003/0004 remotamente.

## Orden de trabajo

1. Verificar PR #172 y su CI final; revisar documentación/diff. La propuesta de arquitectura se puede fusionar como documentación sin aprobar la matriz comercial, pero no habilita implementación.
2. Obtener decisiones explícitas para operaciones, scope, delegación, gestión de usuarios/roles, caja, descuentos, anulaciones, devoluciones y administración de políticas.
3. Cerrar catálogo operación→recurso→scope y matriz aprobada.
4. Diseñar contrato de auditoría, retención e inmutabilidad.
5. Diseñar autorización transaccional, lock order/isolation, idempotencia, rollback y error mapping.
6. Diseñar ledger de caja e inventario y conciliación.
7. Implementar una vertical slice por vez con integración PostgreSQL efímera y pruebas de handlers reales.
8. Solo tras pruebas y gates separados, revisar deployment/Neon.

---

# Prioridad operativa vigente — post PR #169 — 2026-10-30 UTC

**Último merge con cambios de runtime:** PR #169, `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 fue documental (`af08cd913a4e0e155b1b74183a71efc51e5d4646`); consultar `main` en vivo.  
**PR #169:** fusionada; helper de resolución del turno abierto del cajero autenticado implementado y probado.  
**Continuidad documental post-merge:** PR #170 fusionada; sin cambios de runtime/esquema.  
**Post-merge:** 7/7 workflows Actions success; Cloudflare Pages/Workers 2/2 success; PostgreSQL 18 integration 7/7 para el helper.  
**Base de datos:** main versiona 0001–0004; 0003/0004 no aplicadas a Neon main.

## Prioridades

1. Obtener aprobación explícita de la matriz de permisos por rol/organización/sucursal.
2. Diseñar autorización server-side por operación, actor y scope antes de habilitar endpoints comerciales.
3. Definir ledger de caja/efectivo esperado, conciliación y auditoría append-only.
4. Diseñar transacciones, idempotencia y concurrencia para ventas/pagos/stock antes de crear handlers.
5. Diseñar almacenes/balances y reconciliación/backfill de stock legacy.
6. Medir límites Neon/Cloudflare con pruebas sintéticas y mantener coste $0.

**Gates:** PostgreSQL 18 desechable primero; Neon branches solo si aportan validación específica; Neon main nunca es laboratorio. No tocar secretos, datos reales, DNS, billing ni Cloudflare settings sin necesidad demostrada y autorización aplicable. No declarar readiness comercial.

Los bloques inferiores son históricos; esta portada prevalece y se debe contrastar con GitHub live al comenzar cada sesión.


- PR #160 fusionada en main: `be6f19486caf5cf3605c6ca6615f87e305822ea7`. La continuidad incremental ya está integrada; no abrir otra PR para el mismo objetivo.
- Primero cerrar el checkpoint post-merge y verificar que CURRENT_STATE, HANDOFF, PROJECT_PLAN y STATE_JOURNAL apunten al merge SHA real.
- Continuar auditoría/diseño de arquitectura antes de módulos comerciales:
  1. Obtener aprobación explícita de la matriz de permisos por rol/organización/sucursal; está NO aprobada.
  2. Cerrar ERD y ownership para organización, sucursal, almacén, caja y turno; no añadir `branch_id` superficial ni migrar Neon main.
  3. Diseñar autorización server-side por operación y scope de sucursal; `resolveTenantContext` es helper aislado, no middleware comercial.
  4. Diseñar control distribuido de abuso/rate limiting compatible con Workers; `auth_rate_limits` no tiene runtime caller.
  5. Cerrar consistencia venta-líneas-pagos-stock-ledger, idempotencia por operación, último owner y auditoría append-only.
  6. Preparar pruebas de integración y concurrencia en PostgreSQL efímero; no usar Neon main.
- No prometer capacidad de organizaciones/sucursales hasta medir carga sintética y límites reales Neon/Cloudflare.
- Mantener el objetivo de coste $0 y no activar servicios de pago.
- Registrar cada bloque importante en WORK_CHECKPOINT y STATE_JOURNAL durante el trabajo, no al final.

---


- La PR de continuidad activa es [#160](https://github.com/BTF14/Micro-app/pull/160). Consultar siempre `docs/WORK_CHECKPOINT.md` y `docs/CURRENT_STATE.md` antes de continuar.
- No fusionar #160 hasta que CI requerido esté completo en el HEAD exacto y la revisión manual del diff no encuentre problemas materiales. Codex quedó limitado por cuota y no constituye aprobación.
- Tras cerrar #160, continuar auditoría de arquitectura/API/esquema y resolver brechas de seguridad/consistencia antes de crear endpoints comerciales. No reabrir auditorías ya completadas sin evidencia nueva.
- Mantener documentación incremental en cada bloque, no al final de la sesión.

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

## Checkpoint — 2026-10-30 UTC: Pages y despliegues confirmados

- Pages `micro-app` usa `main` como production branch y auto-deploy al push a main. Último deploy productivo observado activo: commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, timestamp `2026-10-30T01:30:08.9457Z`, URL `https://06553c7b.micro-app-63i.pages.dev`.
- Las ramas no productivas generan previews. PR #158 commit `79be208` preview successful; no es producción. Vista: 15 despliegues recientes (1 producción + 14 previews), 1.100 total en historial, los 15 visibles successful.
- Settings Pages no accesible: root/build/output/framework/Functions/redirects/headers/env/uso no confirmados. No custom domain visible.
- Merge a main puede desplegar frontend automáticamente; PR #158 sigue draft y no debe fusionarse sin autorización explícita.
- CI duplicación: corregido el falso positivo anterior; solo secret-history-scan y security-scan tienen push amplio con duplicación potencial general. No modificar hasta confirmar required checks.
- Detalle completo en `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`.

---

## Checkpoint prioritario — 2026-10-30 UTC: corrección CI/CD + Cloudflare

- La primera auditoría de workflows clasificó erróneamente siete workflows como push+PR sin filtros. La lectura directa posterior de los 15 YAML corrige esto: duplicación general potencial solo en `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro). Otros workflows restringen ramas o paths. No modificar triggers hasta confirmar branch protection y contexts requeridos.
- Cloudflare panel confirmado mediante TinyFish, solo lectura. Workers Free $0/mes; 100k requests/día, 10ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 cron triggers. Snapshot: 183 requests, 0 errores y 106,68 build minutes últimas 24h; el Worker view reportó 85 invocaciones y P90 CPU 10ms. Métricas puntuales, no benchmark.
- Worker `micro-app-api`: `main` identificada como producción; ramas `docs/*` como previews. PR #158 obtuvo Worker preview successful y Pages preview successful para `d3f056b`; no son deploys productivos.
- Pages existe: proyecto `micro-app`, URL `https://micro-app-63i.pages.dev/`, repo BTF14/Micro-app. Historial detallado, producción branch/build settings y consumo no extraídos.
- Logs/Traces aparecían desactivados. No activar hasta definir redacción de datos y revisar coste.
- No fusionar PR #158 sin autorización específica de producción. Mantener $0, no tocar Neon main, secretos, datos reales ni infraestructura.

Próximos pasos: completar Pages read-only; verificar branch protection/check contexts; proponer reducción de triggers solo en los dos workflows de push amplio; mantener PR #158 como única PR documental y actualizar handoff.

---

## Checkpoint prioritario — 2026-10-30 UTC, post PR #157

- Main = `1ee1808af4aae484a71dc24750237ff4f4d934a0`; PR #157 fusionada (HEAD `6eb464c950f195ec67350977575aef77e9790e1d`). Ocho workflow runs devueltos para ese HEAD finalizaron success; no se recuperó evidencia post-merge para el merge SHA.
- Auditoría de 15 workflows en [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No existe workflow de deploy de Cloudflare en GitHub Actions; los builds de Cloudflare parecen gestionados por Git integration externa, no inspeccionable desde las herramientas actuales.
- Siete workflows (`ci`, `migration-check`, `playwright-e2e`, `project-progress`, `secret-history-scan`, `security-scan` y `semgrep`) ejecutan tanto en `push` como en `pull_request` sin filtros de branch/path, por lo que commits a una rama con PR pueden duplicar runs. `sdd-docs-validation` también escucha ambos eventos, pero limita `main` y paths documentales. Antes de optimizar, verificar branch protection y contexts requeridos.
- No fusionar a main sin autorización explícita para el posible deploy automático externo. Producción sigue NO LISTA.
- Prioridades: (1) branch protection/rulesets y Cloudflare dashboard en solo lectura; (2) optimización de triggers preservando checks; (3) inventario de queries/callers; (4) ERD branch/warehouse/register/shift; (5) matriz de permisos aprobada antes de endpoints o migraciones.

---

## Checkpoint de arquitectura y auditoría — 2026-10-30 UTC

- PR #156 fusionada en main: `18961456ac535146c4a1687d3b07d8f6693ce141`. Su HEAD `6c068f3e9734736ac26e51ff754e39915d660abe` pasó 9/9 workflows antes de la fusión. Revisión manual del diff por indisponibilidad de Codex; no hubo review formal registrada.
- La revisión estática de rutas confirma que API solo expone auth/health; no hay handlers HTTP comerciales. `resolveTenantContext` verifica sesión y membresía, no permisos por operación ni alcance sucursal.
- El DDL inicial carece de sucursales/almacenes/cajas/turnos/compras/devoluciones; stock se mantiene por organización. Antes de endpoints, cerrar ERD y scope de roles.
- Hallazgos a resolver en diseño: venta/pagos no reconciliados por constraints SQL; saldo stock y ledger pueden divergir sin transacción; referencias polimórficas no validadas; falta idempotencia propia de pagos; regla del último owner; auditoría no append-only por DB.
- Seguridad de autenticación: no se encontró rate limiting runtime en `apps/api/src`; `auth_rate_limits` solo existe en DDL y no tiene callers. Verificar reglas Cloudflare en vivo y añadir control distribuido compatible con Workers antes de ampliar acceso.
- Capacidad sostenible Neon/Cloudflare no medida. No fijar cuotas SaaS hasta ejecutar carga sintética y verificar límites actuales de los proveedores.
- Revisión de `feat/neon-transaction-adapter`: la rama pertenece a PR #1, fusionada el 2026-10-17 (merge `b6511d0876e33096f75df2466653449165888821`). Está divergida frente a main (14 ahead/242 behind); no reabrir ni fusionar. La implementación vigente se audita en `apps/api/src/database.ts` y sus callers.
- Próximo bloque: inventario completo de queries y callers; ERD org→branch→warehouse/register/shift; contrato de autorización; definir autoridad de plataforma para allowlist; diseño de transacciones y pruebas negativas. No migrar Neon main ni desplegar producción.

---

## Monitorización diaria de dependencias — 2026-10-29, PR #137

Se añadió `.github/workflows/daily-dependency-watch.yml` para producir un informe diario de actualizaciones estables y vulnerabilidades conocidas sin modificar el árbol de dependencias. Está programado a las 08:15 UTC (04:15 Venezuela), con ejecución manual, permisos de solo lectura, instalación congelada, `pnpm outdated -r`, comprobación del parche de Node 24 LTS y `pnpm audit --audit-level high`.

**Criterio de aceptación:** YAML válido, instalación congelada y checks obligatorios verdes en el SHA exacto de la PR; tras el merge, una ejecución real con resumen visible. No declarar el monitor operativo antes de esa ejecución. No cambiar a actualizaciones automáticas diarias ni crear PR por paquete. Dependabot sigue semanal para npm y GitHub Actions. Preservar `undici@7.30.1` en manifiesto y lockfile.

---

## Plan vigente — actualización de dependencias orientada a seguridad (2026-10-29)

El propietario solicita mantener versiones modernas para reducir exposición a vulnerabilidades y autoriza a la IA a avanzar con criterio. La estrategia no es “todo lo más nuevo sin importar compatibilidad”: mantener parches/minors al día, comprobar advisories y migrar majors con lockfile y CI coherentes.

### Base comprobada
- Node range >=24.22.1 <25; mantener Node 24 LTS y llevarlo al parche actual tras verificar CI.
- TypeScript 5.9.3; Hono 4.13.14; Workers types 5.20261026.1; Wrangler 4.152.0.
- React/react-dom 19.3.1; tipos React 19.3.0; Vite 7.3.7; plugin-react 5.2.0; jsdom 26.1.0.
- pnpm lockfile v9 y override obligatorio undici@7.30.1.
- Versiones latest estables observadas públicamente: TypeScript 7.0.2, Vite 8.3.5, plugin-react 6.1.2, jsdom 30.1.3, Wrangler 4.154.0, pnpm 12.16.1, Node 24.22.2 LTS. React/react-dom ya están en 19.3.1 y Hono en 4.13.14. Verificar siempre en registry antes de ejecutar porque las páginas pueden quedar desfasadas.
- PRs #117–#120 fueron cerradas sin merge; no asumir esos upgrades aplicados.

### Gate de aceptación de actualización
1. Crear una rama para una migración coherente, no una PR por paquete.
2. Generar pnpm-lock.yaml con la versión real del gestor; prohibido inventar/editar a mano las resoluciones.
3. Conservar undici@7.30.1 en manifests y lockfile; instalación congelada y Dependency Review deben confirmarlo.
4. Revisar breaking changes, engines, peer dependencies y configuración TS/Vite/Vitest/jsdom.
5. Exigir build, tests web/API, typecheck, migración PostgreSQL, Chromium auth, static analysis, Trivy, secret scan, Dependency Review y Cloudflare Pages/Workers en verde para el SHA exacto.
6. Si falla, diagnosticar logs y corregir causa raíz en la misma rama. No fusionar con checks rojos ni dejar PR de prueba olvidadas.
7. Fusionar solo tras revisión completa; después comprobar el SHA de main, versiones resueltas y checks post-merge. Actualizar CURRENT_STATE, HANDOFF_NEXT_CHAT y STATE_JOURNAL.
8. No cambiar major de pnpm ni pasar a Node 26 sin una prueba deliberada. No desplegar manualmente producción ni tocar Neon main, datos reales o secretos.


---

## Continuidad — Dependabot y override de Undici (2026-10-29 UTC)

PR #116 se fusionó por squash/merge; el HEAD vivo posterior de `main` verificado el 2026-10-29 es `764ed502d2a296136d311e05d081ca8e9f7cfeb9` (PR #134, reglas Dependabot/lockfile). El HEAD final de PR fue `5d3f2e373e75caf71af207cba61df3066b140a86`; todos los checks de PR pasaron, incluidos Dependency Review, verify, Chromium, migraciones, static analysis, Trivy, scan de historial de secretos y Cloudflare Pages/Workers. La PR incorporó la corrección para conservar el override de Undici.

Causa original: los lockfiles generados en PR #116–#120 quitaban `overrides: undici: 7.30.1` mientras `package.json` conservaba `pnpm.overrides.undici = 7.30.1`. La instalación congelada fallaba con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; Dependency Review detectaba `undici@7.29.1` vulnerable de severidad alta. Tras el merge, se comprobó que el lockfile de `main` mantiene el override, contiene `undici@7.30.1` y no contiene `undici@7.29.1`.

Las PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) figuran cerradas sin fusionar. No asumir que esos upgrades se aplicaron. Para futuras actualizaciones: verificar SHA exacto, coherencia `package.json`/lockfile, instalación congelada, Dependency Review y compatibilidad. No fusionar majors sin un plan y pruebas.

**Verificación post-merge completada:** los checks consultados para el commit de PR #132 (`9f73f8ab0c1581145796f09a41f689fa4bdcf310`) terminaron en `success`; el HEAD documental actual `764ed502d2a296136d311e05d081ca8e9f7cfeb9` también tiene los checks consultados en `success`, incluidos análisis estático, Cloudflare Pages y Workers. Continuar los pendientes de seguridad ya priorizados; la restauración con datos sintéticos poblados sigue reservada para la última fase.

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
- La PR #113 tuvo éxito en los workflows de CI, migraciones, E2E, Semgrep, escaneo de seguridad, historial de secretos, Dependency Review y dashboard en el HEAD exacto `b93df838095a043e418f5e481ce4422ed014c494`. El resumen de revisión de Codex reportó que no pudo completar por límite de uso; se realizó revisión manual y se dejó un comentario técnico en la PR. En el commit de merge, los estados clásicos consultados muestran dos checks externos de hosting pendientes; no afirmar que hubo una nueva corrida de CI posterior al merge.
- Decisiones pendientes para revisar en la matriz: el 10 % de descuento es solo una sugerencia y requiere decisión del propietario; el alcance por sucursal/caja requiere confirmar el supuesto de MVP de un solo local; la regla de no perder al último `owner` debe tener implementación transaccional serializada y pruebas concurrentes.
- Auditoría de rama obsoleta: `security/secret-scan-current-main` está 1 commit por delante y 39 detrás de `main`. Su checklist `docs/PUBLIC_RELEASE_SECURITY_CHECKLIST.md` ya existe en `main`; el workflow de la rama usa `actions/checkout@v4`, mientras `main` usa `@v7`; su `.gitignore` no conserva la excepción `!apps/web/.env.production` presente en `main`. No fusionar ni borrar la rama tal cual.
- No se modificaron secretos, Neon, datos reales ni configuración productiva; no se hizo despliegue manual. La PR #114 de continuidad está abierta mientras se completa la verificación; no se debe describir el inventario como vacío.
- Bloqueos reales: (1) restaurar un backup cifrado real en PostgreSQL desechable; la llave privada `age` permanece bajo custodia del propietario y no está disponible en esta sesión; (2) revisar/aprobar o corregir la matriz de permisos; (3) verificar los headers CORS mediante solicitudes HTTP reales al Worker; (4) probar aislamiento cross-tenant cuando existan rutas comerciales. La aplicación no está lista para producción.
- Próxima acción segura: el propietario revisa la propuesta de permisos; en paralelo se sigue investigando una ruta autorizada y gratuita para la restauración aislada y la verificación HTTP de CORS. No usar herramientas metered, no acceder a Neon `main`, no inventar políticas ni crear otra PR para un objetivo ya cubierto.

---

## Checkpoint de continuidad — 2026-10-27: respaldo automático implementado, checklist de cumplimiento evaluado

- Aprobación obligatoria de PR desactivada por el propietario (GitHub no deja auto-aprobarse; con 1 requerida, todo quedaba bloqueado esperándolo). La IA puede fusionar sola de nuevo, con PR + 6 checks en verde.
- Respaldo automático cifrado implementado (`.github/workflows/backup.yml`) hacia el repositorio privado `BTF14/micro-app-backups` (R2 descartado: pide tarjeta). Falta un solo paso del propietario: agregar el secreto `DATABASE_URL_BACKUP_RO`; después, probar y verificar restauración real.
- Evaluado un checklist externo de 20 puntos de cumplimiento legal/privacidad/accesibilidad (`docs/COMPLIANCE_AND_ACCESSIBILITY.md`): la mayoría no aplica al modelo actual del negocio (sin pagos, sin registro público, sin cookies de analítica); se adoptaron los puntos que sí aplican (gate de dependencias vulnerables, principios de diseño para módulos futuros, un diseño de "derecho al olvido" que no rompe el libro de movimientos).

## Checkpoint de continuidad — 2026-10-26 (noche): main protegida, blueprint externo resuelto, respaldos bloqueados en la elección de destino

- **`main` tiene branch protection activa, verificada en vivo** (el propietario la configuró). A partir de ahora todo, incluidos los checkpoints de documentación, pasa por PR + aprobación del propietario — ya no hay push directo a `main`. Hay una discrepancia sin resolver sobre el número de aprobaciones requeridas (propietario dice 0, la API en vivo dice 1); ver `docs/SECURITY_ROADMAP.md` punto 1.
- Se evaluó un blueprint de arquitectura externo (Gemini, sin contexto del proyecto) que el propietario compartió: se adopta el diseño del cron de tasa BCV y la caché de lectura en Cloudflare KV; **se rechaza explícitamente el modo offline-first de ventas** por romper el invariante transaccional anti-fraude ya existente. Documentado en `docs/PRICING_CACHE_ARCHITECTURE.md`, PR #91 (abierto, CI verde, esperando aprobación del propietario).
- Respaldo automático (Nivel 1, punto 2): avance parcial (rol Neon de solo lectura `backup_readonly`, par de llaves `age` para cifrar), pero bloqueado porque Cloudflare R2 no está habilitado en la cuenta y activarlo puede requerir tarjeta — en conflicto con la regla de $0 sin tarjetas. Pendiente de que el propietario elija entre R2 (con tarjeta + alerta de presupuesto) o un repositorio privado de GitHub dedicado a los volcados ya cifrados.

## Checkpoint de continuidad — 2026-10-26 (tarde): prioridad del proyecto cambia a seguridad primero

- El propietario pidió explícitamente priorizar que todo quede bien hecho y seguro sobre avanzar rápido, pensando en escalar a varias personas. Se adoptó `docs/SECURITY_ROADMAP.md`, un plan en 3 niveles, ya referenciado como lectura obligatoria en `AGENTS.md`.
- Implementado: Dependabot y cabeceras de seguridad (frontend y API). PR #85, merge `11d29b183490286a02195d7f86b94f44853d3c5c`.
- Pendiente del Nivel 1: protección de `main` en GitHub (requiere al propietario, confirmado que la IA no puede hacerlo desde este entorno) y respaldo automático cifrado de la base de datos (diseño listo, falta implementar).
- **El plan de construir el módulo de negocio (inventario, productos, tasa BCV, ventas) sigue siendo la prioridad funcional, pero ahora detrás de completar el Nivel 1 de seguridad**, salvo que el propietario autorice explícitamente avanzar en paralelo.

## Checkpoint de continuidad — 2026-10-25 (noche): identidad/infraestructura cerrada, listo para negocio

- Dos bugs de producción encontrados y resueltos el mismo día, ambos documentados en detalle en `docs/CURRENT_STATE.md`: (1) `wrangler deploy` borraba en silencio las variables del Worker no declaradas en `apps/api/wrangler.toml`, rompiendo el login dos veces; ahora las tres variables no-secretas están declaradas en el archivo. (2) El botón de cerrar sesión no era alcanzable en pantallas de teléfono; ahora hay uno también en la barra superior. PR #82, merge `f274d32a359dbba8e401897a41294fda1f33cbf8`.
- El usuario confirmó visualmente, en su teléfono real, que el login funciona de extremo a extremo y carga el panel de "Abasto 7 de Oro".
- **No queda ningún pendiente conocido de identidad, infraestructura o interfaz básica de acceso.** Toda la energía del siguiente chat debe ir a construir la lógica de negocio real (inventario, productos, tasa BCV, ventas), que sigue sin existir en código.

## Checkpoint de continuidad — 2026-10-25 (tarde): identidad completa de punta a punta

- **El riesgo P0 de identidad quedó resuelto y verificado en producción, no solo en código.** Existe una organización real ("Abasto 7 de Oro") con un usuario owner real (`btfcasheb@gmail.com`) creado a través del flujo de Google OAuth + bootstrap sellado. Ver `docs/CURRENT_STATE.md` para IDs exactos, el estado de `auth_allowlist`/`auth_bootstrap`, y el patrón SQL para autorizar usuarios adicionales.
- PR #81 fusionada (merge `441bdc463954aba1069cfeae9227bf75a562a53a`): la interfaz dejó de mostrar el formulario de contraseña retirado y ahora tiene un botón real de Google + mensajes claros para cada tipo de fallo de login.
- **El trabajo de identidad/infraestructura (auth, allowlist, bootstrap, UI de login, deploy de Worker y Pages) está, en esencia, terminado.** La prioridad ahora cambia a construir la lógica de negocio real: inventario, productos con precio en USD, tasa BCV y su conversión a VES, ventas. Nada de esto existe todavía en código — la app solo tiene una pantalla de bienvenida con módulos marcados "Pendiente de implementación".
- Sigue pendiente, sin bloquear lo anterior: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge; decidir un flujo real de invitación de usuarios (hoy agregar a alguien requiere inserciones manuales en Neon).

## Checkpoint de continuidad — 2026-10-19 después de PR #64

- PR #64 fusionada por squash; merge SHA `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`. PR #63 merge SHA `b4b417ec5a85b8b0c48b606c718c341745af9055`.
- PR #64 integró cuatro skills locales bajo `.agents/skills/` y `docs/AUTOSKILLS_ADOPTION.md`. No son paquetes externos instalados por AutoSkills.
- AutoSkills CLI no llegó a ejecutarse porque el intento de checkout falló al resolver `github.com`; no hay `skills-lock.json` generado ni hashes externos declarados. Próximo paso: `npx autoskills --dry-run` en un entorno con red, revisar tecnologías detectadas, licencia y hash, y elegir solo skills aplicables.
- PR #60 está cerrada como supersedida; la política útil se integró en #62/#63. No force-push.
- P0 sigue pendiente: Google sign-in + allowlist, D1–D8 y matriz de permisos requieren aprobación. Mantener registro fail-closed y no asumir que el login por contraseña respeta allowlist.
- No se ejecutaron tests locales. Seis workflows consultados para el head exacto de PR #64 terminaron en success. App no lista para producción; coste $0, sin producción ni Neon `main`.

## Política permanente de ejecución técnica autónoma

- Resolver decisiones rutinarias y reversibles con evidencia; implementar, probar, revisar seguridad/regresiones y documentar de punta a punta.
- No delegar comprobaciones disponibles en las herramientas ni pedir permisos repetidos. Pedir intervención solo ante una decisión de producto, autorización, acceso o capacidad realmente ausente.
- Presupuesto $0; sin producción, mutaciones de Neon `main`, datos reales, secretos, gastos ni acciones destructivas fuera de los gates vigentes.
- Si un revisor IA está limitado por cuota, hacer revisión manual del diff y contexto relacionado; no inventar findings y no fusionar con checks requeridos pendientes.
- La PR #62 incorporó una versión resumida de esta política. Esta PR conserva los criterios operativos detallados de la propuesta original #60, sin traer checkpoints históricos obsoletos.

## Checkpoint de continuidad — 2026-10-19 después de PR #62

- PR #61 y PR #62 están fusionadas. PR #62 merge SHA: `d107cfb2b80c4165ed39e3071f8256942898ffb7`; siete workflows en success sobre el head final `9f288f68b6012f39b8ec7928b07a140b869e63cb`.
- PR #60 sigue abierta con conflicto. Comparar sus cambios con el diff integrado de PR #62 antes de decidir si se necesita una PR sustituta; no force-push.
- La revisión Codex de PR #60 falló por cuota para un SHA antiguo; no inferir hallazgos desconocidos. En PR #62 se atendió la observación P2 sobre checkpoint obsoleto.
- P0: Google sign-in + allowlist requiere aprobación de D1–D8 y de la matriz de permisos. Mantener el registro fail-closed. El login por contraseña sigue en el código; su convivencia con la política de acceso continúa sin decisión aprobada.
- Límites: $0, sin producción, sin mutaciones de Neon `main`, sin datos reales/secretos, sin emails y sin mezclar Cantina-pos.

## Checkpoint de continuidad — 2026-10-19

- PR #61 está fusionada; PR #60 no pudo integrarse directamente por conflicto con `main`. Se re-aplicó el cambio documental en `docs/ai-autonomy-governance-rebased` y se abrió PR #62 sobre `main`, sin force-push; revisar sus checks para el head vigente antes de fusionar.
- La revisión Codex de PR #60 falló por cuota para un SHA antiguo; no se recuperaron hilos inline. La revisión manual debe tratarse como evidencia independiente, no como aprobación automática.
- P0: Google sign-in + allowlist requiere aprobación de D1–D8 y de la matriz de permisos. Mantener el registro fail-closed mientras la política siga pendiente.
- Límites: $0, sin producción, sin mutaciones de Neon `main`, sin datos reales/secretos, sin emails y sin mezclar Cantina-pos.

## Checkpoint vigente — 2026-10-19 después de PR #57

Main verificado: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`. PR #57 bloquea fail-closed el registro público mientras se aprueba la política de identidad. Checks del head exacto `71d3e6d3ffe625b12807e9942ddd261e222cf093` y los checks consultados del merge SHA terminaron en success; no se ejecutaron tests locales.

Prioridades:
1. Resolver Google sign-in + allowlist según D1–D8 aprobados; mantener registro público bloqueado hasta entonces.
2. Obtener aprobación de la matriz de permisos antes de exponer handlers comerciales.
3. Mantener pruebas de auth/sesión y tests PostgreSQL negativos; no inventar políticas.
4. No fusionar `feat/neon-transaction-adapter`: divergida 14 ahead / 76 behind, con test script y documentos antiguos.
5. Implementar POS/inventario/ventas con aislamiento tenant, transacciones, idempotencia, concurrencia y auditoría.
6. Probar backup/restauración independiente, requisitos fiscales y E2E API+DB antes de producción.
7. Coste objetivo $0; sin producción ni mutaciones de Neon main fuera de los gates.

Ver [CURRENT_STATE.md](CURRENT_STATE.md), [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md), [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

---

## Checkpoint vigente — 2026-10-19 después de PR #55

Main verificado: `b7117f8aeb868e25c49db86a524405511cd3c9be`. PR #55 fusionada. Ocho check-runs de su head exacto `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28` en success; no se ejecutaron pruebas locales ni se verificó independientemente el merge SHA. Cloudflare fue solo preview de rama.

Prioridades:
1. Cerrar el riesgo P0 del registro con política Google sign-in + allowlist aprobada, sin inventar D1–D8.
2. Obtener aprobación explícita de la matriz de permisos de roles antes de crear handlers comerciales.
3. Continuar pruebas seguras de auth/sesión y revisar la rama feat/neon-transaction-adapter contra main sin merge ciego.
4. Implementar endpoints comerciales solo con autorización server-side y pruebas PostgreSQL negativas de acceso cruzado, membresía inactiva y rollback.
5. Demostrar backup/restauración independiente antes de cualquier operación real.
6. Mantener coste $0; no producción ni mutaciones de Neon main sin gates y recuperación verificada.

Issue P0 #53 permanece abierto. No hay PR abiertas en la consulta actual. La app no está lista para producción. Ver [CURRENT_STATE.md](CURRENT_STATE.md), [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

---

## Checkpoint vigente — 2026-10-19 después de PR #51

Main verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98`. PR #50 y #51 fusionadas; los seis workflows pasaron en cada head exacto. No se ejecutaron pruebas locales ni se verificaron workflows sobre merge SHA. Ver [CURRENT_STATE.md](CURRENT_STATE.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

Prioridades:
1. Revisar autorización server-side y aislamiento tenant antes de crear handlers comerciales.
2. Obtener decisiones aprobadas D1–D8 de Google OAuth/allowlist y matriz de permisos antes de implementar políticas.
3. Validar aislamiento tenant y flujos API+PostgreSQL reales cuando existan handlers de negocio.
4. Preparar backup independiente y demostrar restauración antes de cualquier operación real.
5. Mantener coste $0; no desplegar producción ni modificar Neon `main` sin los gates definidos.

---

## Checkpoint vigente — 2026-10-19 después de PR #48

Main verificado: `420a64152103c90d2990d47c72fc19a744786fa6`. PR #47 y #48 fusionadas; los seis workflows pasaron en cada head exacto. No se ejecutaron pruebas locales ni se verificaron workflows sobre los merge SHA. Ver [CURRENT_STATE.md](CURRENT_STATE.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

Prioridades:
1. Revisar autorización server-side y aislamiento tenant antes de crear handlers comerciales.
2. Obtener decisiones aprobadas D1–D8 de Google OAuth/allowlist y matriz de permisos antes de implementar políticas.
3. Validar aislamiento tenant y flujos API+PostgreSQL reales cuando existan handlers de negocio.
4. Preparar backup independiente y demostrar restauración antes de cualquier operación real.
5. Mantener coste $0; no desplegar producción ni modificar Neon `main` sin los gates definidos.

---

## Checkpoint vigente — 2026-10-19 después de PR #45

Main verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f`. PR #45 está fusionada; los seis workflows pasaron en el head exacto de la PR. No se ejecutaron pruebas locales ni se verificó el merge SHA con workflows. Ver [CURRENT_STATE.md](CURRENT_STATE.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

Prioridades inmediatas:
1. Continuar pruebas acotadas de autenticación/sesión y límites de autorización.
2. Obtener decisiones aprobadas D1–D8 de Google OAuth/allowlist y matriz de permisos antes de implementar políticas.
3. Validar aislamiento tenant y flujos API+PostgreSQL reales cuando existan handlers de negocio.
4. Preparar backup independiente y demostrar restauración antes de cualquier operación real.
5. Mantener coste $0; no desplegar producción ni modificar Neon `main` sin los gates definidos.

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

# Checkpoint operativo — 2026-10-19, después de PR #31

> Confirmar el estado vivo de GitHub y reemplazar los SHA/status de este checkpoint cuando cambien.

- Repositorio: https://github.com/BTF14/Micro-app
- Último `main` verificado antes de abrir la actualización documental: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 y #31 fusionadas; PR #32 actualiza continuidad, checkpoint y diario: https://github.com/BTF14/Micro-app/pull/32. No fusionar PR #32 hasta verificar que todos los checks requeridos del head SHA vigente terminaron correctamente.
- PR #31 añadió pruebas de integración para denegar `/auth/me` y `/auth/login` cuando la organización está inactiva; su head tuvo checks exitosos antes del merge. El estado post-merge se debe verificar por SHA exacto.
- La API todavía no registra rutas HTTP comerciales para catálogo, proveedores, compras, ventas, pagos o movimientos de inventario. No existe aislamiento de rutas de negocio que se pueda certificar hasta implementar endpoints y pruebas de integración reales.
- Google OAuth + allowlist y decisiones D1–D8 continúan pendientes; la matriz de roles/permisos también está pendiente de aprobación. No inventar reglas ni exponer rutas comerciales hasta resolver permisos.
- Backups independientes/restauración probada no verificados. No modificar Neon `main`, desplegar producción, activar billing, enviar correos ni tocar datos reales como parte de este trabajo.
- Siguiente trabajo: verificar CI/PR #32; después priorizar una revisión concreta de seguridad o prueba aislada que no dependa de decisiones de identidad/roles. Evitar nuevos PR de documentación salvo que mejoren continuidad o corrijan hechos.
- No se ejecutaron pruebas localmente durante esta revisión; los resultados deben citarse desde GitHub Actions para el SHA exacto.

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


# Índice principal de documentación y checkpoint vigente

> **Aviso de frescura:** los SHA y estados que aparecen en checkpoints históricos deben confirmarse en GitHub antes de usarse como estado actual. El checkpoint vigente está en `docs/HANDOFF_NEXT_CHAT.md`; no tratar los SHA de entradas antiguas como HEAD vivo.
>
> Documento rector: [Constitución del proyecto](CONSTITUTION.md). Sus reglas de coste, seguridad, identidad, integridad de datos y evidencia prevalecen sobre atajos.

## Checkpoint documental — 2026-10-18

- Repositorio: https://github.com/BTF14/Micro-app
- Rama de este cambio: `docs/constitution-and-plan-index`
- HEAD de `main` observado en la búsqueda de commits: `7863973ed6e3869f525c6c89fc16412e92158fc2`.
- La consulta de status checks para ese SHA devolvió una lista vacía; el estado actual de Actions queda **no verificado**. Consultar ejecuciones actuales antes de declarar éxito.
- No se desplegó producción ni se modificó Neon `main` en esta tarea.

## Panel visual de avance y salida a producción

- [Panel HTML](progress/index.html)
- [Gráfica SVG](progress/progress.svg)
- [Datos JSON](progress/progress.json)
- [Fuente de verdad: checklist de preparación](PRODUCTION_READINESS.md)
- Generador: [tools/project-progress.py](../tools/project-progress.py)

El panel distingue el avance de implementación del porcentaje de preparación para producción. Cada criterio solo se marca completado con evidencia. Los gates P0 pendientes bloquean la declaración de listo para producción, independientemente del porcentaje.

## Índice maestro de documentos

### Constitución, planificación y continuidad
- [Constitución](CONSTITUTION.md) — reglas no negociables.
- [Plan maestro](PROJECT_PLAN.md) — fases, prioridades, criterios de aceptación e índice.
- [Handoff siguiente chat](HANDOFF_NEXT_CHAT.md) — protocolo y prompt copiable.
- [Diario de estado](STATE_JOURNAL.md) — historial append-only.
- [Instrucciones de agentes](../AGENTS.md) — inicio y guardrails.
- [Modelo operativo de agentes](AGENT_OPERATING_MODEL.md) — roles, entregables y límites.
- [Protocolo continuidad IA/chat](AI_CONTINUITY_PROTOCOL.md).

### Producto, arquitectura y datos
- [Arquitectura y coste cero](ARCHITECTURE_AND_ZERO_COST.md)
- [Integración API](API_INTEGRATION.md)
- [Esquema de base de datos](DATABASE_SCHEMA.md)
- [Revisión del esquema](SCHEMA_REVIEW.md)
- [Inspiración POS](INSPIRATION.md)
- [Matriz de aceptación POS](POS_REFERENCE_MATRIX.md)

### Seguridad, fiscalidad y herramientas
- [Plan de seguridad 2026](SECURITY_PLAN_2026.md)
- [Checklist OWASP ASVS](OWASP_ASVS_CHECKLIST.md)
- [Requisitos de cumplimiento](COMPLIANCE_REQUIREMENTS.md)
- [Registro de herramientas y fuentes](RESOURCE_REGISTRY.md)
- [Evaluación Gentleman-Programming](GENTLEMAN_PROGRAMMING_EVALUATION.md)
- [Implementación Gentleman-Programming](GENTLEMAN_IMPLEMENTATION.md)

### Código, pruebas y automatización
- [CI](../.github/workflows/ci.yml)
- [Validación de migraciones](../.github/workflows/database-migration-validation.yml)
- [Escaneo de seguridad](../.github/workflows/security-scan.yml)
- [Semgrep](../.github/workflows/semgrep.yml)
- [Playwright E2E](../.github/workflows/playwright-e2e.yml)
- [Pruebas E2E frontend](../apps/web/e2e/auth.spec.ts)
- [Perfiles reutilizables de revisión](../.github/agents/)

Los enlaces indican documentación/código versionados, no que cada herramienta esté activa o cada control satisfecho. Los estados de ejecución se comprueban en vivo.

---

## Checkpoint actual — Gentleman-Programming (2026-10-18)

Se comenzó la implementación real en el commit `ae0c189487b37d910184b0b5cfa058ddbb6919d4`: `.gga` preparado para revisión local mediante Ollama, guía de implementación y enlace en README. **Aún no están instalados/ejecutándose GGA, Ollama, Engram ni Gentle-AI desde este entorno.** Verifica las tres Actions enlazadas en el handoff para el SHA exacto antes de declarar estado CI.

Siguiente prioridad de esta línea: probar GGA manualmente en un terminal local sin instalar el hook hasta validar el proveedor; luego Engram y Gentle-AI en un runtime compatible. Coste $0 y guardrails existentes permanecen obligatorios.

---

# Checkpoint vigente — 2026-10-18

> Este checkpoint se añade como referencia más reciente; las secciones históricas inferiores pueden contener snapshots antiguos. Antes de trabajar, verificar HEAD/Actions en vivo y registrar cualquier corrección.

- `main` verificado: `12c0037f3928b2c54c3593d3f48a65bf3318f401`.
- CI, validación de migración y escaneo de seguridad terminaron en success para ese SHA: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102740451), [migración](https://github.com/BTF14/Micro-app/actions/runs/39102740448), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39102740511).
- Handoff y prompt de continuidad: [docs/HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md).
- Evaluación de Gentleman-Programming (documental, sin instalación): [docs/GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md).
- Bloqueo P0 de identidad: revisar Google OAuth + allowlist + verificación de email; la revisión estática de `apps/api/src/auth.ts` no encontró esos componentes.
- Rama `feat/neon-transaction-adapter` requiere comparación y revisión de diff antes de rescatar cambios.
- Mantener $0, proyecto separado de Cantina-pos, sin mutaciones en Neon main, sin deploy de producción y sin secretos en Git.

---

## Estado vivo verificado — 2026-10-18 (prevalece sobre el historial inferior)

- Último SHA de `main` comprobado antes de este checkpoint documental: `995608af8584442a9f174f9cf55ed7861749b872` (`docs: refresh handoff with current repository state`).
- En el SHA anterior `8574bef7c5bc38cb85e55007816b6efc8b54a826`, [CI](https://github.com/BTF14/Micro-app/actions/runs/39102311090), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102311097) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102311100) terminaron en `success`. Para el SHA `995608af8584442a9f174f9cf55ed7861749b872`, las nuevas ejecuciones estaban `pending/queued` al consultarlas: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102649341), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102649354) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102649347). Reconsultar el SHA más reciente después de este commit documental; los checks verdes no demuestran que el producto esté listo para producción.
- El CI actual usa `pnpm install --frozen-lockfile`, ejecuta build, pruebas unitarias y `src/auth.integration.test.ts` con PostgreSQL efímero. La migración también se valida contra PostgreSQL desechable; no se ha autorizado migrar Neon main.
- `pnpm-lock.yaml` existe en main (tamaño 77,520 bytes al consultar el contenido de GitHub). La afirmación histórica de que no había lockfile ya no describe main.
- El último commit de código anterior a los documentos es `88d30d472905c81a90d9fffc967e3ba1df5084d1`, que conectó el flujo frontend de registro/login con la API. El contenido de `docs/API_INTEGRATION.md` conserva una frase antigua que dice lo contrario; debe corregirse para evitar contradicción.
- La rama `feat/neon-transaction-adapter` está en `7989a84e39536029819735a5202f3934a8eb12c3`; no se fusionó automáticamente. Debe revisarse su diff completo con respecto a main antes de decidir qué rescatar.
- Otras ramas que existen al comprobar GitHub: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Los SHA de las ramas pueden avanzar; volver a consultarlos antes de trabajar.
- Ya hay material persistente en `docs/INSPIRATION.md`, `docs/SECURITY_PLAN_2026.md`, `docs/API_INTEGRATION.md`, `docs/ARCHITECTURE_AND_ZERO_COST.md`, `docs/DATABASE_SCHEMA.md`, `docs/SCHEMA_REVIEW.md` y `docs/COMPLIANCE_REQUIREMENTS.md`. La continuidad debe enlazar y reconciliar estos documentos, no sustituirlos por un resumen corto.
- **Bloqueo de requisitos de identidad detectado en revisión del código:** `apps/api/src/auth.ts` solo expone `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no se encontró implementación de Google OAuth, allowlist ni verificación de email. La prueba de integración `apps/api/src/auth.integration.test.ts` tiene un escenario principal de registro/login/sesión/revocación, no la matriz completa de autorización. Esto contradice el requisito previamente acordado de acceso Google + allowlist y debe tratarse como P0 antes de considerar identidad lista; no declarar producción-ready. No cambiar el modelo de identidad ni enviar correos sin decisión del usuario.
- Se añaden el modelo operativo de agentes, el registro de recursos y el diario de estado. Los archivos `.github/agents/*.agent.md` definen roles reutilizables en entornos compatibles con agentes; no implican que GitHub Actions ni este chat estén ejecutando agentes autónomos en segundo plano.

# Micro app — plan maestro y estado de continuidad

## Índice de memoria operativa persistente

- [Plan maestro](PROJECT_PLAN.md)
- [Modelo operativo de agentes/subagentes](AGENT_OPERATING_MODEL.md)
- [Registro de herramientas, repositorios y fuentes](RESOURCE_REGISTRY.md)
- [Diario cronológico de estado y decisiones](STATE_JOURNAL.md)
- [Inspiración POS](INSPIRATION.md)
- [Plan de ciberseguridad 2026](SECURITY_PLAN_2026.md)
- [Integración API/Neon](API_INTEGRATION.md)
- [Arquitectura y coste cero](ARCHITECTURE_AND_ZERO_COST.md)
- [Esquema de base de datos](DATABASE_SCHEMA.md) · [Revisión del esquema](SCHEMA_REVIEW.md) · [Cumplimiento](COMPLIANCE_REQUIREMENTS.md)

**Última actualización:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Rama base de referencia:** `main`  
**Propósito:** documento operativo para que cualquier nuevo chat o colaborador pueda continuar el trabajo sin depender del historial de conversación.

> Este documento es la fuente de verdad del plan y del estado conocido. Antes de actuar, comprobar el SHA actual de `main`, las ramas/PR abiertos y GitHub Actions. Si el repositorio ha cambiado desde esta actualización, corregir el estado aquí mediante un commit.

## 1. Objetivo del producto

Crear un punto de venta (POS) y sistema de inventario profesional para PC, tablet y teléfono, con:

- Catálogo de productos, códigos de barras, categorías, proveedores y alertas de bajo inventario.
- Entradas, salidas, ajustes y trazabilidad del inventario.
- Caja y ventas, descuentos autorizados, pagos mixtos, cálculo de cambio, recibos, devoluciones y cierres.
- Informes y auditoría de operaciones.
- Autenticación, sesiones revocables, roles y aislamiento estricto entre organizaciones/comercios.
- USD como moneda base y conversión a VES usando una tasa BCV validada, con fuente, fecha efectiva y hora de consulta.
- Interfaz responsive, accesible y usable por teclado; temas automático (sistema), claro y oscuro, con preferencia manual persistente.
- Pruebas unitarias, integración con PostgreSQL desechable y E2E en vistas de escritorio/móvil.

No presentar la aplicación como lista para operar un comercio hasta que las funciones, autorización, persistencia, pruebas y configuración de despliegue hayan sido implementadas y verificadas.

## 2. Restricciones no negociables

1. **Neon main no está autorizado para migraciones.** Se permite inspección de solo lectura en la rama principal. Las migraciones y pruebas se preparan y validan en PostgreSQL efímero o en ramas desechables aisladas. No ejecutar cambios sobre Neon main sin autorización explícita y específica posterior.
2. **Coste total objetivo: $0.** No activar facturación, planes de pago, suscripciones ni cargos automáticos. Antes de crear recursos, comprobar que sean gratuitos y sus límites.
3. **Independencia total:** no reutilizar repositorios, bases de datos, secretos, despliegues, dominios ni configuración de Cantina-pos u otros proyectos.
4. No desplegar a producción ni hacer cambios irreversibles sin aceptación del usuario.
5. No imprimir, registrar, versionar ni compartir secretos, tokens, contraseñas o cadenas de conexión. Usar variables de entorno locales ignoradas y gestores de secretos.
6. Hacer cambios reales, pequeños y verificables; actualizar el plan en el repositorio. No afirmar que una prueba o workflow pasó sin revisar el resultado real del SHA correspondiente.
7. No pedir al usuario que repita conexiones/permisos ya configurados, salvo que se haya identificado un bloqueo concreto y comprobable.

## 3. Arquitectura objetivo

- **Frontend:** React + Vite + TypeScript; despliegue estático previsto en Cloudflare Pages.
- **API:** Hono + TypeScript sobre Cloudflare Workers.
- **Base de datos:** PostgreSQL independiente en Neon Free; migraciones versionadas y revisadas.
- **CI:** GitHub Actions; pruebas, compilación/typecheck y escaneos de seguridad.
- **Pruebas:** Vitest, PostgreSQL temporal para integración, Playwright para E2E.
- **Dependencias:** open source y sin componentes premium. Mantener la aplicación portable.
- No usar un hosting alternativo no adoptado como alojamiento objetivo para un POS comercial. No crear recursos facturables para sortear límites gratuitos.

## 4. Estado del repositorio al preparar este documento

### Referencia comprobada

- La rama `main` se encontraba en el commit `88d30d472905c81a90d9fffc967e3ba1df5084d1`, mensaje `Connect frontend sign-in and registration to auth API`.
- PR #4 (`Add initial authentication and revocable sessions`) figura como **fusionado** el 2026-10-17, con merge commit `e9e146020e7195c12da5f880a5dbf26b4e96752c`.
- El commit de integración del frontend declara que CI, escaneo de seguridad y validación de migración pasaron. Reconfirmar los workflows de la punta actual de `main` antes de usar esto como garantía de estado actual.
- La rama `feat/neon-transaction-adapter` existía y, al compararla con `main`, tenía 14 commits por delante y 5 por detrás. Incluye trabajo adicional de adaptador de base de datos, pruebas y plan de seguridad. **No asumir que esa rama es segura para fusionar**: primero sincronizar/revisar el diff, evitar sobrescribir cambios posteriores de `main` y verificar cada workflow. No mezclarla a ciegas.
- Ramas observadas: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/neon-transaction-adapter`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Reconsultar su estado real al continuar.
- El documento de transferencia anterior tenía secciones históricas contradictorias. Esta sección y el archivo `docs/HANDOFF_NEXT_CHAT.md` actualizado deben prevalecer sobre anotaciones antiguas.

### Ya presente en el código (revalidar en archivos/CI)

- Base de frontend React/Vite y API Hono/Workers.
- Rutas de autenticación inicial: registro, login, sesión actual y logout/revocación.
- Hash de contraseñas PBKDF2-SHA-256 y almacenamiento de hashes de tokens de sesión.
- Cookie HttpOnly, comprobación de origen configurado y límites de intentos persistidos en base de datos.
- Integración inicial de pantallas de registro/login del frontend con la API.
- Esquema/migración SQL versionados y workflows de validación en PostgreSQL temporal.
- Escaneo de seguridad con Trivy incorporado en una rama de trabajo; confirmar si el workflow y el archivo de plan ya están en `main` antes de darlos por integrados.

### Aún no debe considerarse listo

- No hay POS comercial completo ni flujo de ventas/inventario terminado.
- No declarar autenticación lista para producción sin pruebas de integración completas, revisión de seguridad, limpieza/retención de sesiones y límites, configuración de cookies/orígenes para los dominios finales y verificación del CI actual.
- No hay integración BCV terminada.
- No hay despliegue de producción aprobado.
- La migración de esquema no debe aplicarse a Neon main sin autorización expresa.

## 5. Plan por fases y criterios de salida

### Fase 0 — Base reproducible, seguridad y CI (P0)

- [ ] Comprobar `main`, PRs, commits y Actions más recientes.
- [ ] Confirmar instalación reproducible y lockfile real de pnpm; nunca inventar un lockfile.
- [ ] Revisar `.gitignore`, ejemplos `.env.example`, Wrangler y manejo de secretos.
- [ ] Revisar workflows y permisos mínimos; escaneo de dependencias/configuración/secretos.
- [ ] Mantener documentación de arquitectura, amenazas, pruebas y decisiones.
- **Salida:** CI verde en el SHA actual; sin secretos versionados; instrucciones locales reproducibles.

### Fase 1 — Autenticación, sesiones y aislamiento multiempresa (P0)

- [ ] Completar pruebas de integración HTTP con PostgreSQL efímero: registro, creación atómica de usuario/organización/membresía/sesión, email duplicado, login correcto/incorrecto, `/auth/me`, usuario o membresía inactivos, logout, revocación y fallos de DB.
- [ ] Verificar que un fallo de revocación no se reporte como logout exitoso.
- [ ] Probar autorización por organización en cada consulta y operación; evitar BOLA/IDOR y escalada de privilegios.
- [ ] Revisar rate limiting, retención/limpieza de contadores y limpieza de sesiones expiradas.
- [ ] Validar expiración de sesión, origen permitido, cookie HttpOnly/Secure/SameSite según despliegue, mensajes de error genéricos y manejo de datos malformados.
- [ ] Definir recuperación de cuenta/verificación de email/MFA solo con decisión de producto y opciones gratuitas verificadas; no añadir servicios de pago.
- **Salida:** pruebas de integración fiables y autorización del lado del servidor. No fusionar código no revisado solo porque un workflow esté verde.

### Fase 2 — Datos y adaptador PostgreSQL (P0)

- [ ] Revisar el trabajo de `feat/neon-transaction-adapter` contra el `main` actual, archivo por archivo; sincronizar la rama antes de considerar PR.
- [ ] Probar adaptador y transacciones contra PostgreSQL temporal, con pruebas de errores y rollback.
- [ ] Validar migraciones desde cero y restricciones en base efímera.
- [ ] Confirmar aislamiento multiempresa mediante claves foráneas/consultas y pruebas cruzadas.
- [ ] Mantener el esquema en revisión; Neon main solo lectura hasta autorización.
- **Salida:** integración de DB probada sin depender de Neon principal.

### Fase 3 — Catálogo e inventario (P0)

- [ ] CRUD de productos/categorías y códigos de barras con validación de servidor.
- [ ] Proveedores y recepción de mercancía.
- [ ] Movimientos de inventario auditables: entradas, salidas, ajustes y motivo/usuario.
- [ ] Política explícita de stock negativo; controles seguros ante concurrencia.
- [ ] Alertas de inventario bajo.
- **Salida:** cada cambio de existencia se explica mediante un movimiento persistido y autorizado.

### Fase 4 — Tasa USD/VES (P0 para conversión)

- [ ] Elegir una fuente verificable y revisar términos, disponibilidad y límites gratuitos.
- [ ] Guardar fuente, valor, fecha efectiva, fecha/hora de consulta y estado.
- [ ] Validar tasa positiva y respuesta; conservar última tasa válida ante fallos y avisar de datos desactualizados.
- [ ] No marcar una tasa obsoleta solo porque sea fin de semana/feriado si sigue vigente.
- [ ] Evitar afirmar que un tercero es una API oficial del BCV sin evidencia.
- **Salida:** pruebas de respuestas inválidas, retrasos, fallos y cambios de tasa; historial auditable.

### Fase 5 — Caja, ventas y devoluciones (P0)

- [ ] Carrito, búsqueda/escaneo, descuentos sujetos a permisos y cálculo de totales.
- [ ] Venta, pagos, cambio, stock, movimientos y auditoría dentro de una transacción atómica.
- [ ] Idempotencia por organización; misma clave con payload distinto debe rechazarse.
- [ ] Guardar instantáneas inmutables de descripción/precio/tasa USD/VES usados en cada venta.
- [ ] Usar precisión decimal en PostgreSQL y aritmética decimal segura; no persistir importes mediante aritmética flotante JS.
- [ ] Reintentos no duplican ventas; concurrencia no consume stock de más; fallo revierte todo.
- [ ] Devoluciones/anulaciones mediante operaciones de reverso auditables, nunca borrar silenciosamente ventas finalizadas.
- [ ] Recibos claramente etiquetados como control interno hasta validar requisitos fiscales aplicables.
- **Salida:** pruebas de concurrencia, rollback, idempotencia, cálculos y permisos.

### Fase 6 — Interfaz y operación (P1)

- [ ] Elegir una dirección visual antes de pulir la UI; no asumir que una paleta provisional está aprobada.
- [ ] Completar navegación y flujo de caja, catálogo e inventario para móvil/tablet/escritorio.
- [ ] Temas automático/claro/oscuro con elección manual persistente.
- [ ] Accesibilidad: teclado, foco visible, contraste, etiquetas y mensajes de error.
- [ ] Reportes, cierres de caja, exportación autorizada y auditoría.
- [ ] Definir respaldos/restauración, privacidad, retención y eliminación de datos.
- [ ] Playwright E2E en viewports de escritorio y móvil.
- **Salida:** flujos principales probados de extremo a extremo y documentación operativa.

### Fase 7 — Cumplimiento, preview y lanzamiento (bloqueado hasta aceptación)

- [ ] Confirmar con asesoría competente obligaciones locales aplicables (IVA/IGTF, SENIAT, documentos fiscales y equipos autorizados); no codificar tasas fiscales universales sin revisión.
- [ ] Preparar política de privacidad, términos, contacto real del responsable y transparencia de terceros.
- [ ] Revisar seguridad, recuperación ante fallos, respaldos y límites de planes gratuitos.
- [ ] Solo cuando el usuario acepte y los flujos críticos estén probados, valorar un preview gratuito y aislado.
- [ ] Producción requiere aceptación explícita y no debe activar costes automáticos.
- **Salida:** checklist completo y aprobación del usuario. No declarar certificación legal/fiscal.

## 6. Plan de ciberseguridad 2026 y referencias

Estas referencias son guías de revisión; no implican certificación y no se debe copiar código sin revisar licencia/compatibilidad.

| Prioridad | Recurso | Aplicación prevista |
|---|---|---|
| P0 | [OWASP Cheat Sheet Series](https://github.com/OWASP/CheatSheetSeries) | Sesiones, autenticación, autorización, secretos, validación y logs. |
| P0 | [OWASP ASVS](https://github.com/OWASP/ASVS) | Lista de controles y criterios de aceptación. |
| P0 | [OWASP API Security](https://github.com/OWASP/API-Security) | Pruebas BOLA/IDOR, autenticación, autorización y abuso de recursos. |
| P1 | [GitHub CodeQL](https://github.com/github/codeql) | SAST para JS/TS si permisos y cobertura están disponibles. |
| P1 | [Semgrep](https://github.com/semgrep/semgrep) y [reglas](https://github.com/semgrep/semgrep-rules) | SAST; revisar licencia, cobertura y falsos positivos. |
| P1 | [Trivy](https://github.com/aquasecurity/trivy) | Dependencias, configuración, secretos y SBOM; confirmar cobertura del workflow. |
| P2 | [OWASP ZAP](https://github.com/zaproxy/zaproxy) | DAST en preview/staging aislado, nunca escaneo activo de producción. |
| P2 | [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) | Blanco de entrenamiento aislado; no integrar código vulnerable en Micro app. |
| Condicional | [Apache Casbin Node](https://github.com/apache/casbin-node-casbin) | Revaluar si las políticas de autorización crecen; no instalar sin verificar compatibilidad Workers. |

**Límite importante:** `express-rate-limit` es middleware de Express; no instalarlo directamente en Hono/Workers. El rate limiting debe adaptarse a la plataforma y al modelo distribuido, no depender solo de memoria local.

## 7. Orden inmediato de trabajo

1. Leer este archivo y `docs/HANDOFF_NEXT_CHAT.md`; consultar el SHA actual de `main`, ramas/PRs y Actions.
2. Actualizar el handoff con la punta real del repositorio y el siguiente paso confirmado.
3. Revisar la rama `feat/neon-transaction-adapter` contra `main`; comprobar sus cambios y CI sin fusionarla a ciegas.
4. Confirmar/añadir pruebas de integración de autenticación sobre PostgreSQL efímero y revisar los puntos de seguridad de la Fase 1.
5. Arreglar lockfile/reproducibilidad y seguridad de CI según evidencia real.
6. Seguir por catálogo/inventario, tasa, ventas, devoluciones, UX y E2E, en pequeños cambios con pruebas.
7. Después de cada avance: commit/push, consultar Actions del SHA nuevo, actualizar este plan y anotar lo que realmente pasó.
8. No desplegar producción ni aplicar migraciones a Neon main.

## 8. Prompt para continuar en otro chat

Copia y pega:

> Continúa Micro app leyendo primero `docs/PROJECT_PLAN.md` y `docs/HANDOFF_NEXT_CHAT.md` en https://github.com/BTF14/Micro-app. Verifica el estado real del repositorio, el SHA de main, las ramas/PR y GitHub Actions; no confíes en estados históricos. Trabaja directamente sobre el código existente, realiza cambios seguros, súbelos a GitHub y documenta el resultado en esos dos archivos. Prioriza revisar la rama feat/neon-transaction-adapter contra main y completar/revisar las pruebas de integración de autenticación con PostgreSQL temporal antes de fusionar nada más. No apliques migraciones a Neon main, no conectes otros proyectos, no despliegues producción y mantén el coste total en $0. Nunca expongas secretos ni me pidas repetir conexiones/permisos sin demostrar un bloqueo concreto. Indica commits, pruebas y checks verificados de verdad.


## Checkpoint — herramientas investigadas implementadas en rama de trabajo (2026-10-18)

Rama: `feat/security-e2e-tooling`. Se agregaron una configuración Playwright y dos pruebas de navegador de autenticación con API simulada, un workflow Chromium de CI, un workflow Semgrep JS/TS y el checklist OWASP ASVS y matriz de criterios POS.

**Estado verificado:** en SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`, CI, validación de migración, Security scan, Semgrep y Playwright E2E terminaron en success: [CI](https://github.com/BTF14/Micro-app/actions/runs/39104699632), [migración](https://github.com/BTF14/Micro-app/actions/runs/39104699591), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39104699568), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39104699596), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/39104699653). Estos resultados no garantizan producción ni cubren backend real con las pruebas E2E. Playwright se instala de forma temporal en el workflow (`@playwright/test@1.55.0`) para no modificar el lockfile en esta operación; esto es un piloto y deja pendiente incorporarlo correctamente a `apps/web/package.json` y `pnpm-lock.yaml` cuando pueda ejecutarse pnpm 10 y validarse el lockfile. Las pruebas mockean la API y no demuestran que Google OAuth, allowlist, autorización multiempresa o backend estén completos.

No se instala CodeQL (coste/permisos de code scanning privado por confirmar), Casbin ni middleware Express incompatible; ZAP queda para una preview aislada y Juice Shop solo para laboratorio. Mantener presupuesto $0 y no apuntar herramientas dinámicas a producción.


## Fusión verificada — 2026-10-18

PR [#6](https://github.com/BTF14/Micro-app/pull/6) fusionado con squash en `main`, commit `dfe6d3efce5eddc10c25c42642faf5ea8b44eedb`. CI, migración, Trivy, Semgrep y Playwright E2E pasaron para el head de PR `df84d056d3edbc2191ac0fd34a39e18f3632ce03`. GitHub Actions se están ejecutando de nuevo sobre el commit de merge; no declarar el nuevo SHA verde hasta consultar esas ejecuciones.


## Sistema de trabajo ODD y agentes

- Proceso activo: [ODD_WORKFLOW.md](ODD_WORKFLOW.md).
- Para trabajo sustancial/crítico se mantiene un único registro `odd/tasks/<feature>.md`, creado desde [TASK_TEMPLATE.md](../odd/TASK_TEMPLATE.md); el detalle técnico se incorpora solo cuando el riesgo lo exige.
- Perfiles reutilizables: [`.github/agents/`](../.github/agents/). Su presencia no demuestra ejecución de subagentes.
- Memoria durable: GitHub, [diario de estado](STATE_JOURNAL.md), [registro de recursos](RESOURCE_REGISTRY.md) y [handoff](HANDOFF_NEXT_CHAT.md). No guardar secretos ni datos de clientes.
- Estado de herramientas: los perfiles y el flujo están versionados; esto no significa que GGA, Ollama, Engram, Gentle-AI, MCP ni subagentes estén instalados o conectados a este chat.
- Validación automatizada: `.github/workflows/odd-docs-validation.yml` comprueba la plantilla ODD y los perfiles de agente sin reintroducir artefactos SDD.


## SDD y continuidad entre chats — 2026-10-18

El flujo SDD, sus plantillas y perfiles de roles están en la rama `feat/sdd-agent-workflow` y PR [#9](https://github.com/BTF14/Micro-app/pull/9). Los workflows asociados al HEAD `68659d1c1ec0cb9996293f78f9bd487e95124bbf` se comprobaron en `success` (CI, migraciones, seguridad/Trivy, Semgrep, Playwright E2E y validación SDD; el dashboard también tuvo éxito). El PR debe verificarse como fusionado antes de afirmar que esos archivos están en `main`. Playwright en este proyecto usa mocks para el piloto y no certifica integración real API+DB. No hubo despliegue de producción ni mutación de Neon `main`.


## SDD y continuidad entre chats — resultado de integración

PR [#9](https://github.com/BTF14/Micro-app/pull/9) está fusionado en `main` mediante `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`. Para el HEAD del PR `ba1eebbe45b11e6e0b3562795cdb6c26b5c31c63`, CI, validación de migraciones, Security/Trivy, Semgrep, Playwright E2E, dashboard y validación SDD terminaron en `success`. Esta evidencia corresponde al HEAD del PR; comprobar Actions para el commit de merge antes de certificar el estado de `main`. Playwright usa mocks y no acredita integración real API+DB. No hubo despliegue de producción ni mutación de Neon `main`.


## Herramienta de pentesting Strix (añadido 2026-10-18)

- Recurso: https://github.com/usestrix/strix. Plan detallado: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md).
- Uso previsto: pentesting dinámico autorizado cuando la API y el entorno efímero/staging estén preparados; prioridad a auth/sesiones, aislamiento multiempresa, BOLA/IDOR, validación de entradas y configuración.
- No ejecutar en producción, Neon main, datos reales ni sistemas de terceros. Empezar con laboratorio aislado y datos sintéticos; revisar manualmente hallazgos y añadir pruebas de regresión.
- Requisitos/coste: Docker y un proveedor LLM; confirmar que el proveedor local o elegido no cuesta dinero antes de ejecutar. No habilitar billing ni añadir secretos/workflows de CI sin validar el coste y la seguridad.
- Estado: documentado para evaluación, no instalado ni ejecutado; no se ha escaneado Micro app. Primero resolver el bloqueo P0 de autenticación/allowlist y preparar PostgreSQL efímero.


## Herramienta Strix — adopción planificada (2026-10-18)

- Recurso: https://github.com/usestrix/strix. Plan operativo: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md).
- Incorporar Strix cuando la API y un entorno de pruebas aislado estén preparados; priorizar autenticación, sesiones, separación entre organizaciones, validación de entradas y configuración.
- Empezar con laboratorio o entorno efímero autorizado y datos sintéticos. No apuntar a producción, Neon main ni sistemas de terceros.
- Requiere Docker y un proveedor de modelo de lenguaje. Verificar coste total de $0, aislamiento y manejo de informes antes de ejecutarlo; no habilitar facturación ni añadirlo a CI hasta una evaluación separada.
- Estado: documentado para evaluación, aún no instalado ni ejecutado. Resolver primero el bloqueo P0 de autenticación/allowlist y preparar pruebas con PostgreSQL efímero.


## Continuidad verificada — PR #19/#20 y handoff (2026-10-18)

- HEAD de `main` consultado: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19) se fusionó por squash en ese SHA; registra opciones D1–D8 para Google Sign-In/allowlist, explícitamente propuestas pendientes de aprobación.
- PR [#20](https://github.com/BTF14/Micro-app/pull/20) se fusionó previamente en `c87361685ef1ce36e4cf6025124b09e70ffa0846`; incorpora el plan de evaluación controlada de Strix.
- En el HEAD actual indicado, CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y panel de progreso finalizaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129579631). Los tests E2E actuales usan API simulada; no acreditan integración real API+DB ni producción.
- Strix está documentado para que futuras IA sepan cuándo y cómo usarlo, pero no está instalado/ejecutado y no se ha escaneado Micro app. Mantenerlo fuera de CI activa hasta validar aislamiento y coste $0.
- Siguiente prioridad: revalidar en vivo la autenticación actual y resolver D1–D8 sin inventar políticas; preparar PostgreSQL efímero y pruebas de autorización multiempresa. Backup/restore independiente sigue sin automatización ni restauración real verificada.
- Ver también [handoff](HANDOFF_NEXT_CHAT.md) para el prompt de continuidad y guardrails. No se modificó Neon ni se desplegó producción.


## Revalidación operativa — 2026-10-18

- Estado vivo: `main` = `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`; PR #21 continúa abierta y sin fusionar en head `fb9ab271cc8b1c72e92d7874672913698c59bfe7`.
- Para el HEAD de PR #21, CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard dieron `success`; véanse los enlaces actuales en `docs/HANDOFF_NEXT_CHAT.md`. El aviso del bot Codex sigue sin detalle de hallazgo reproducible (review/comments inline vacíos, bot alcanzó límite); no tratarlo como aprobación ni como vulnerabilidad confirmada.
- P0 sigue abierto: `apps/api/src/auth.ts` aún permite registro por contraseña con creación de organización/rol owner/sesión sin allowlist y no contiene Google OAuth. El test API+PostgreSQL efímero actual valida el flujo de contraseña/sesiones, no OAuth/allowlist ni la matriz cross-tenant completa.
- D1–D8 siguen sin aprobar en `docs/sdd/auth-policy-decision-record.md`; no implementar política de identidad/organización hasta que haya decisión explícita. Mientras tanto, no habilitar usuarios/datos comerciales reales ni declarar identidad lista.
- Siguiente orden: (1) resolver D1–D8; (2) diseñar/implementar fail-closed y Google Sign-In con pruebas negativas; (3) ampliar pruebas de autorización/aislamiento multiempresa con PostgreSQL efímero; (4) comparar rama `feat/neon-transaction-adapter` contra main sin merge ciego; (5) piloto Strix solo después de disponer de API+DB efímera y proveedor local gratuito verificado.
- No hubo despliegue de producción, mutación de Neon, cambio de secretos ni coste añadido. Rama `main` no está protegida en GitHub (`protected=false`, sin checks requeridos); evaluar protección como tarea de gobernanza separada.

## Checkpoint posterior a PR #21 — 2026-10-18

- PR #21 (`docs: refresh handoff for next chat`) quedó fusionada por squash; merge commit `7491b97a2bde52555fe9b8a5d808ad81b829d90e`.
- El alcance fue documentación solamente; no cambia el estado de autenticación/allowlist P0 ni aprueba las decisiones D1–D8.
- CI, E2E, migraciones, Semgrep, seguridad y dashboard habían pasado en el SHA exacto de la PR; la revisión Codex no concluyó por límite de uso y no debe registrarse como aprobación formal.
- Siguiente prioridad de producto/técnica sigue siendo resolver decisiones D1–D8 sin suposiciones, luego implementar y probar auth fail-closed y aislamiento multi-tenant con PostgreSQL efímero. No desplegar producción.


---

## Seguridad API — coherencia HTTPS de FRONTEND_ORIGIN (2026-10-29)

**Objetivo:** eliminar la divergencia entre la validación global de CORS/configuración y la validación específica del flujo Google OAuth.

- [x] Implementar en la rama `fix/google-auth-frontend-origin-https-20261029`: HTTPS; HTTP solo para `localhost`, `127.0.0.1` y `[::1]`; rechazar HTTP remoto, credenciales, rutas, query, fragmentos y orígenes no canónicos. Pendiente de merge.
- [ ] Añadir pruebas unitarias negativas y positivas para el helper usado por OAuth.
- [ ] Ejecutar tests API, typecheck/build y CI/SAST/E2E en el SHA exacto.
- [ ] Revisar diff y obtener la revisión requerida antes de merge.
- [ ] Tras merge, verificar main y checks post-merge; no inferir despliegue productivo por previews.

**Gate:** no cambiar el contrato bootstrap ni secretos. Esta corrección de configuración no certifica el flujo OAuth completo ni la preparación comercial.

**Siguiente fase de producto (bloqueada por diseño/aprobación):** cerrar ownership de catálogo/precios, inventario por sucursal, compras/recepciones, caja/turnos, devoluciones y matriz de permisos organización/sucursal. Mantener stack React/Vite/TypeScript + Workers/Hono + Neon/Drizzle; no reescribir ni introducir microservicios sin medición. Capacidad por organización/sucursal: no determinada hasta pruebas sintéticas y auditoría de cuotas Neon/Cloudflare.


## Actualización del plan — reconciliación posterior a PR #155 (2026-10-29)

### Completado
- [x] PR #153 fusionada: bootstrap ya no transporta el token en query string; POST protegido y validado.
- [x] PR #155 fusionada: validador de `FRONTEND_ORIGIN` en Google OAuth exige HTTPS salvo loopback HTTP y rechaza URLs con credenciales/componentes extra.
- [x] En SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`, ocho workflows finalizaron success: CI, E2E, migraciones, SAST, security, dependency review, secret history y dashboard.

### Pendiente / orden de ejecución
1. [ ] Cerrar reconciliación documental de PR #154 mediante PR #156; cerrar #154 solo después de confirmar que todo su contenido útil quedó preservado.
2. [ ] Completar auditoría read-only de esquema, FKs, índices, queries, rutas y límites de tenant.
3. [ ] Proponer contrato de organización, sucursales, catálogo/precios, inventario por sucursal, compras/recepciones, caja/turnos y devoluciones.
4. [ ] Obtener aprobación del propietario para la matriz de permisos por rol y alcance organización/sucursal.
5. [ ] Diseñar invariantes y transacciones de ventas, líneas, pagos, stock y auditoría; añadir idempotencia y pruebas de concurrencia sobre PostgreSQL efímero.
6. [ ] Medir límites de Neon y Cloudflare con cuotas/consumo actual y pruebas sintéticas; no prometer número de empresas/locales sin datos.
7. [ ] Solo después de los gates anteriores implementar productos/proveedores, inventario y luego POS/ventas/caja en PRs coherentes y acotadas.

**Arquitectura elegida:** conservar React/Vite/TypeScript, Cloudflare Pages, Workers/Hono, Neon PostgreSQL y Drizzle. No reescritura, microservicios, Redis ni servicios de pago anticipados sin evidencia medible. Presupuesto objetivo $0.

**Estado de salida:** producción NO lista. No tocar Neon main, secretos, datos reales ni producción; no aplicar migraciones sin diseño y autorización.

---

## SaaS multi-organización y operaciones POS — dirección 2026-10-29

Dirección de producto: una plataforma multi-organización, multi-sucursal y multiusuario. El catálogo/precio es compartido por organización por defecto; existencias, cajas y operaciones pertenecen a sucursal/almacén. BCV se actualizará mediante job programado validado y caché de lectura; el buscador prioriza barcode/SKU, SQL indexado y límites; KV de catálogo queda condicionado a benchmark. Las ventas deben validar precio/stock/tasa en transacción y conservar snapshots. Ver [SAAS_ARCHITECTURE_DECISIONS.md](./SAAS_ARCHITECTURE_DECISIONS.md) para reglas y pendientes.

### Fases pendientes
1. Auditoría read-only y ERD/scope.
2. Aprobación/reconciliación de roles y operaciones sensibles.
3. Diseño de migraciones y pruebas cross-tenant/cross-branch.
4. Catálogo/búsqueda, inventario, compras, caja, ventas, devoluciones y transferencias.
5. Fuente BCV y job de actualización con fallback.
6. Benchmarks Neon/Cloudflare y definición de cuotas comerciales.

No declarar comercial/producción listo hasta completar flujos, seguridad, pruebas, backups, observabilidad y capacidad.


## Arquitectura comercial configurable por organización — 2026-10-30

- La plataforma no impone reglas universales de descuentos ni límites comerciales. Cada organización define si los permite y sus condiciones.
- La capacidad técnica prevista incluye configuración versionada por organización, evaluación server-side, aislamiento tenant-scoped, snapshots históricos y auditoría.
- Diseño de referencia: `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`.
- Estado: diseño documental; no implementado. La matriz de roles sigue pendiente de aprobación y bloquea la implementación de autorización comercial.
- Criterios previos a código: ERD multi-sucursal; alcance de roles y asignaciones aprobado; integridad venta/líneas/pagos/stock; idempotencia y auditoría; pruebas PostgreSQL efímeras cross-tenant/cross-branch, concurrencia y rollback.


## ERD multi-sucursal — 2026-10-30

- Diseño de referencia: docs/sdd/MULTI_BRANCH_DATA_MODEL.md.
- Objetivo: organización como tenant; sucursal como unidad operativa; almacén como ámbito de stock; caja/turno como ámbito de cobro; asignaciones de usuario por sucursal.
- Stock objetivo: ledger de movimientos + balance transaccional por almacén/producto; migración desde products.stock_quantity solo con backfill y reconciliación.
- Operaciones: venta/pago/recepción/transferencia con claves tenant-scoped, FKs compuestas, transacciones, idempotencia y auditoría.
- Estado: propuesta documental, no implementada. La matriz de roles sigue pendiente de aprobación; no crear handlers comerciales ni migraciones hasta cerrar contratos.
- Criterios previos a implementación: decidir ventas fuera de caja, flujo de recepción/transferencias, referencia tipada de movimientos, pagos/reversos y matriz de permisos; diseñar migración aditiva y pruebas PostgreSQL efímeras cross-tenant/cross-branch, concurrencia, rollback y reconciliación.


## Estado vivo — 2026-10-30 UTC — fundamento de alcance por sucursal

- PR #164 ya está fusionada en main `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`; referencias históricas que la indiquen pendiente quedan supersedidas.
- Trabajo actual en `feat/branch-scope-context-20261030`: modelo mínimo de sucursales/asignaciones y resolución de contexto en servidor.
- Alcance autorizado: owner/admin organización-wide; cashier/inventory requieren asignación activa a sucursal. No implica aprobar permisos por operación, caja/turnos ni excepciones sensibles.
- Orden: validar migración y assertions en PostgreSQL efímero; comprobar tests/typecheck/CI del SHA exacto; revisar diff; integrar solo con checks obligatorios verdes. Luego cerrar matriz de permisos sensibles y modelo de caja/turnos antes de rutas comerciales.
- No ejecutar migraciones en Neon main ni desplegar producción en este bloque.

- Resultado técnico PR #165 (HEAD de implementación `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b`): checks y pruebas completas en success, incluidas 3 pruebas de resolución contra PostgreSQL efímero y assertions cross-tenant. Revalidar el SHA final tras los commits de sincronización documental antes de integrar.
