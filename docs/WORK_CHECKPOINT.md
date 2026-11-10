## Corrección de consistencia y estado vivo — 2026-11-09 UTC

> Este bloque es la referencia operativa más reciente de esta rama. Los snapshots posteriores/anteriores que sigan debajo se conservan como historial fechado; no deben reutilizarse como estado vivo. Revalidar GitHub antes de cualquier acción sensible.

### Objetivo y aceptación que no cambian
- **Fecha objetivo obligatoria: 2026-12-01.** P0: comercio pequeño/mediano, un solo local y catálogo de hasta 1.000 productos, jornada completa desde la UI según `docs/MVP_SINGLE_STORE_ACCEPTANCE.md`.
- No confundir objetivo con funcionalidad implementada, aceptación probada ni autorización de producción. No mover fecha ni alcance sin decisión expresa.
- El MVP de un local conserva aislamiento multi-tenant/multi-branch, permisos aprobados, presupuesto objetivo $0 y guardrails. Si un gate crítico sigue abierto el 30 nov, NO-GO para producción; beta controlada solo con riesgos explícitos y aceptación correspondiente.

### Estado GitHub revalidado por SHA exacto
Main observado: `c5373564413ba086690552c6b7deeab08d7b4a89`.

| PR | Estado | HEAD | Workflow runs exact-HEAD | Check-runs exact-HEAD | Decisión |
|---|---|---|---:|---:|---|
| [#287](https://github.com/BTF14/Micro-app/pull/287) | OPEN / Draft | `7df318b233cfb95f7fcc3076d46984a11614a14c` | 13: 8 SUCCESS, 5 FAILURE | 10/10 SUCCESS | Bloqueada; no declarar CI completamente verde |
| [#296](https://github.com/BTF14/Micro-app/pull/296) | OPEN / Draft | `73b0b134c14cb30f7c93d038c10acd0da5aa274c` | 10/10 SUCCESS | No usar status legacy vacío como contador | Documental; no declarar PIN/calendario implementados |
| [#298](https://github.com/BTF14/Micro-app/pull/298) | OPEN / Draft | `98675da595b0c20906f2674ba3dd9d9fba677a63` | 13/13 SUCCESS | 15/15 SUCCESS | Docs-only; no merge |
| [#299](https://github.com/BTF14/Micro-app/pull/299) | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` | 12/12 SUCCESS | 14/14 SUCCESS | Medición de pg_restore sintético; no merge |

- #287 mantiene cinco fallos: ODD documentation, Dependency Review, Project progress dashboard, Playwright E2E y CI. Jobs/artifacts/logs no fueron accesibles por las interfaces consultadas; causa raíz desconocida. Los 10 check-runs SUCCESS no anulan los cinco workflow FAILURE.
- Las cuatro PR siguen Draft y sin aprobación formal. `mergeable=true`, cuando aparece, no es review APPROVED ni readiness.
- En #298 los bots de Cloudflare reportaron éxito de **previews automáticos de PR** para Pages y Workers en el commit `98675da`, con URLs identificadas como Commit Preview/Branch Preview. Esto sí es un despliegue de preview automatizado; no fue un despliegue manual ni demuestra promoción a producción, merge a main o smoke test autenticado de producción. Los snapshots que dicen “no deploy” describen el momento previo o la ausencia de despliegue productivo/manual; no deben interpretarse como ausencia de preview.
- No se fusionó ninguna de estas PR ni se modificó main en esta reconciliación.

### Seguridad Nivel 1 y backups
- **Gate Nivel 1 sigue ABIERTO**: protección de main no revalidada (API 403); Dependabot figura implementado pero las alertas no se pudieron revalidar (confirmación manual histórica de cero alertas); cabeceras/CORS verificados históricamente el 1 nov sin nueva prueba HTTP; backup/restore parcialmente verificado.
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

### Punto de reanudación
El trabajo documental de reconciliación no cierra Seguridad Nivel 1. Próxima tarea permitida: terminar auditoría semántica de documentos canónicos, corregir contradicciones y diseñar/validar monitor RPO/alerta en entorno no productivo con fixture sintético. No abrir lógica comercial hasta cierre demostrado del gate. No crear otra PR documental si la corrección cabe en esta rama.

---
# Addendum de continuidad — gate Nivel 1 y diagnóstico de Actions (2026-11-09 UTC)

## Resultado de la revisión de seguridad

- Se localizó el criterio normativo exacto en `AGENTS.md`: no reanudar nueva lógica comercial ni añadir endpoints comerciales hasta completar los controles Nivel 1 de `docs/SECURITY_ROADMAP.md`. `docs/ODD_WORKFLOW.md` reitera la misma prohibición.
- El bloque Nivel 1 está en `docs/SECURITY_ROADMAP.md` (sección a partir de la línea 615 en el SHA de #287). Incluye: (1) protección de `main`, (2) backup/restore independiente, (3) Dependabot y (4) cabeceras de seguridad/CORS.
- **El gate no está demostrado como cerrado.** El punto 2 de backup/restore sigue explícitamente parcial/abierto en `docs/BACKUP_AND_RECOVERY.md`: la última restauración de un backup remoto concreto documentada es del 2026-10-29; la prueba sintética poblada existe, pero faltan restauración de una copia remota reciente, RPO/RTO medidos, alerta de fallo verificada y confirmación de coste total $0. No usar éxito de CI sintético para declarar cerrado el ciclo operativo.
- Punto 1: la evidencia documental de branch protection es del 2026-11-01. Se intentó revalidar el endpoint GitHub de protección de `main` el 2026-11-09 y devolvió 403 `Resource not accessible by integration`; estado actual no revalidado por esta sesión.
- Punto 3: Dependabot figura implementado; el registro de 0 alertas abiertas procede de confirmación manual del propietario el 2026-11-01. La sesión no pudo volver a comprobar el endpoint de alertas con el acceso actual.
- Punto 4: cabeceras y CORS constan como implementados y verificados en la evidencia del 2026-11-01; no se volvió a ejecutar una comprobación HTTP contra runtime en esta sesión.
- Conclusión operativa: **mantener bloqueada la nueva lógica comercial** hasta cerrar las evidencias pendientes del Nivel 1. No iniciar endpoints de turnos ni habilitar caja/ventas todavía. Sí se permite investigación, diagnóstico, correcciones de seguridad no relacionadas y trabajo documental necesario.

## Diagnóstico de los cinco workflows fallidos de #287

- PR #287 sigue OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`, base `main`, base SHA `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`, `mergeable=true` (dato informativo, no aprobación).
- En ese SHA hay 11 workflow runs: 6 SUCCESS y 5 FAILURE: ODD docs (run `42674363952`), Dependency review (`42674363725`), Project progress dashboard (`42674364153`), Playwright E2E (`42674364197`) y CI (`42674364170`).
- Se consultaron de nuevo los cinco endpoints de jobs y artifacts: todos devolvieron listas vacías. La descarga de logs del run CI devolvió contenido vacío; los enlaces de logs de los otros runs tampoco expusieron logs utilizables. La API de GitHub reportó `total_count: 0, jobs: []` para el run CI.
- Causa raíz: **desconocida/no observable** con las interfaces y permisos disponibles. No atribuir fallos a código, dependencias, infraestructura o tests sin logs/annotations. No reutilizar los 10 check-runs SUCCESS como sustituto de los workflow runs fallidos.
- No se reintentaron runs: sin job/step diagnóstico, un rerun no identifica ni corrige la causa y puede repetir el mismo fallo opaco. Reconsiderarlo solo si se habilita una vía de lectura de jobs/logs o se justifica una prueba de transitoriedad controlada.

## PR #298 — validación exact-HEAD

- PR #298 sigue OPEN/Draft, rama `docs/reconcile-live-github-state-20261109`, HEAD previo a este addendum `6ae9b985017bd3087ce63c61d65935c833c45421`, base SHA `c5373564413ba086690552c6b7deeab08d7b4a89`; no mergear ni cambiar el estado Draft.
- Los 10 workflow runs del HEAD anterior finalizaron SUCCESS. Este addendum cambiará el HEAD y requiere volver a validar todos los workflows del SHA nuevo.
- No se alteran #287, main, Neon, producción, secretos, DNS, billing, datos reales ni despliegues.

## Próxima acción segura

1. Mantener P0 comercial en pausa hasta que el gate Nivel 1 tenga evidencia suficiente.
2. Resolver el backup/restore pendiente únicamente en PostgreSQL desechable y con datos sintéticos; medir RPO/RTO y verificar alertas/coste sin tocar Neon main ni datos reales.
3. Conseguir una vía autorizada de lectura de jobs/logs de GitHub Actions; después diagnosticar cada run fallido exacto de #287 y corregir la causa concreta en rama aislada.
4. Tras cada cambio, revisar diff y workflows del SHA exacto. No declarar producción lista.

---

# Plan de entrega MVP — objetivo 2026-12-01

## Decisión de aceptación MVP — POS de un local / 1.000 productos

- Decisión aprobada por el propietario el 2026-11-09: el objetivo de aceptación del 2026-12-01 es que un comercio pequeño/mediano, de un solo local y hasta 1.000 productos, pueda completar desde la UI una jornada POS: login, apertura de turno propio, búsqueda/carrito, venta/pagos admitidos, tasa BCV válida cuando aplique, comprobante interno, consistencia de venta/pagos/inventario y consulta de inventario/Kardex, conteo y cierre de turno.
- La especificación canónica, con pruebas y límites detallados, es [docs/MVP_SINGLE_STORE_ACCEPTANCE.md](MVP_SINGLE_STORE_ACCEPTANCE.md). Leerla antes de planificar o implementar.
- Esto concreta el P0; no cambia guardrails, permisos aprobados, presupuesto $0 ni los gates de seguridad/BCV/legal/operación. El MVP de un local no elimina el aislamiento multi-tenant/multi-branch. No afirmar que está implementado hasta probar el recorrido completo en el SHA exacto.
- Si un gate crítico no está demostrado, NO-GO para producción; como máximo beta controlada con limitaciones explícitas y aceptación correspondiente.


**Objetivo de gestión:** llegar al 1 de diciembre con un MVP funcional, demostrable y candidato a producción; no prometer producción comercial hasta cerrar los gates técnicos, de seguridad y operación. Desde el 2026-11-09 quedan 22 días naturales. Se congela el alcance: un frente técnico principal (#287) y un frente documental mínimo (#298); no abrir PRs paralelas por tareas pequeñas.

## Línea base comprobada — no confundir código de rama con producto integrado

- Main observado al crear este checkpoint: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- #287 sigue OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`, 159 ahead / 1 behind, `mergeable=true`. No tiene review formal APPROVED ni threads de revisión.
- #287 incorpora en su rama productor BCV, sync-state/attempt_id, checkout atómico con migraciones 0017–0021, protección PostgreSQL de último éxito, lectura/conteo de inventario y pruebas unitarias/PostgreSQL. No está integrado en main ni desplegado.
- Distinción CI de #287: la consulta de check-runs devolvió 10 y los 10 están SUCCESS (incluyen previews Cloudflare y checks de seguridad/migración). La consulta de workflow runs devolvió 11: 6 SUCCESS y 5 FAILURE. Los cinco fallos no exponen jobs ni artifacts; no se recuperaron logs de job. No llamar a esto “CI totalmente verde”: CI y Playwright no tienen evidencia de ejecución de jobs en ese snapshot.
- #298 docs-only sigue OPEN/Draft, HEAD `380ac05343d0fde267b6f7fc6838174c722b5a51`; sus 10/10 workflow runs terminaron SUCCESS en ese SHA.
- Realidad de UI en #287: autenticación, resumen, catálogo y panel de estado BCV. La navegación “Caja y ventas”, “Inventario” y “Reportes” sigue deshabilitada como “Pronto”. No existe todavía una pantalla de carrito/checkout ni UI operativa de inventario.
- Realidad de API: checkout está registrado y requiere un turno abierto propio; existe el helper `resolveOpenCashierRegisterShift`, pero `index.ts` no registra rutas para abrir/cerrar/consultar turnos ni administración/listado de cajas. Por tanto el flujo comercial todavía no es utilizable de extremo a extremo.
- Inventario tiene API de lectura y conteos; la transferencia entre sucursales en dos fases (despacho/recepción) aún no está implementada. No declarar el módulo completo.
- El fixture BCV existente es serialización DOM sanitizada, no cuerpo HTTP raw con status/headers originales. Alertas/watchdog e identidad efectiva del Worker siguen pendientes. La contingencia manual con PIN está especificada, no implementada. No codificar calendario SUDEBAN 2027 sin circular oficial verificable.
- El tablero de progreso basado en `PRODUCTION_READINESS.md` cuenta 12/30 criterios de implementación (40 %) y 10/29 gates productivos (34,5 %) en esta rama. Es una cuenta de checklist, no porcentaje real de producto: hay criterios históricos y mezcla de main/PR; no usarla para afirmar “80 % terminado”.

## Alcance prioritario para la entrega

### P0 — imprescindible para un MVP POS utilizable
1. Cerrar la validación exact-HEAD de #287: resolver los cinco workflow failures a nivel de ejecución, obtener CI y Playwright ejecutados, revisar diff completo y conseguir revisión independiente. No reutilizar checks de SHA anteriores.
2. Completar el ciclo de turno propio: listar cajas activas por sucursal, abrir turno con efectivo inicial USD/VES, consultar turno propio y cerrar turno propio con conteo final; mantener las restricciones aprobadas (owner/admin/cashier solo su propio turno; inventory sin acceso; nadie cierra turno ajeno).
3. Completar UI de caja/ventas: seleccionar sucursal/caja/almacén, abrir turno si no existe, buscar/agregar productos, carrito, pagos admitidos por contrato, confirmación idempotente, recibo/snapshot y errores BCV/stock claros. No habilitar ventas hasta tener turno abierto y BCV válido.
4. Completar UI de inventario: existencias por almacén/sucursal, historial Kardex, creación/confirmación de conteo absoluto y visualización de diferencias; conservar aislamiento tenant/branch y permisos.
5. E2E real contra API + PostgreSQL desechable para login → turno → checkout → pagos → ledger → inventario, además de conteo y denegaciones cross-tenant/branch/role.
6. Validar preview aislada, responsive móvil/escritorio, accesibilidad básica, logs sanitizados, restauración de backup con datos sintéticos relacionados y límites de coste $0.

### P1 — cierre antes de producción comercial
- Fixture HTTP raw BCV reproducible, alertas de fallo y watchdog con umbrales medidos, identidad runtime/Worker y ensayo aislado de recuperación.
- Revisión legal/contable de tasa efectiva, IVA/IGTF y recibos; no inventar cumplimiento fiscal.
- Transferencias de inventario en dos fases y conciliación despacho/recepción si la primera entrega promete operación multi-sucursal completa.
- Política y procedimiento de anulaciones/devoluciones como operaciones compensatorias append-only; no editar ventas ni movimientos completados.
- Calendario SUDEBAN solo cuando exista fuente oficial verificable; mientras no exista, el sistema no debe inventar feriados ni sustituir la fecha efectiva BCV.

### Fuera del primer corte salvo decisión explícita
- Contingencia manual de tasa con PIN, recuperación y doble aprobación: mantener especificada y deshabilitada hasta cerrar seguridad/legal/contabilidad.
- Reportes avanzados, exportaciones amplias y analítica no necesaria para vender/contar stock.
- Flujos de excepción para que un supervisor cierre el turno de otro cajero.

## Secuencia de trabajo hasta el 1 de diciembre

- **9–11 nov:** resolver diagnóstico de #287 y cerrar revisión de código/migraciones; fijar contrato mínimo de turno y pagos sin ampliar permisos.
- **12–17 nov:** API de turnos/cajas y flujo de apertura/cierre propio; UI de caja/checkout integrada al backend existente.
- **18–21 nov:** UI de inventario, conteos y Kardex; cerrar pruebas de aislamiento y concurrencia.
- **22–26 nov:** E2E reales en PostgreSQL desechable, hardening de errores/rate limits, responsive/accesibilidad, backup/restore y observabilidad.
- **27–29 nov:** preview aislada, pruebas de aceptación de extremo a extremo y corrección de defectos críticos.
- **30 nov:** decisión formal GO/NO-GO con evidencia exacta; si queda cualquier gate crítico sin verificar, entregar como beta controlada y no como producción comercial.
- **1 dic:** fecha objetivo de entrega del MVP, condicionada a todos los gates P0 y a la aprobación final. No prometer que cada módulo futuro del SaaS estará terminado.

## Regla de avance

Cada bloque debe producir código funcional, pruebas y evidencia en el mismo PR. Reducir snapshots y documentos duplicados; actualizar este checkpoint solo ante un cambio de estado/decisión verificable. Si una fuente externa (BCV/SUDEBAN) no está disponible, no simularla: avanzar en los módulos independientes y dejar el gate externo explícito.

---

# Checkpoint operativo vigente — 2026-11-09 19:25 UTC

Este bloque reemplaza como punto de entrada los checkpoints históricos que aparecen debajo. Los registros históricos se conservan por procedencia, pero no deben usarse como estado vivo.

## Reconciliación viva de GitHub — 2026-11-09 19:25 UTC

> Este bloque es el estado operativo vigente observado directamente en GitHub. Prevalece sobre snapshots históricos anteriores de estos archivos. No sustituye una nueva consulta antes de cada merge o acción sensible.

### Fuente y alcance de la comprobación
- Repositorio: `BTF14/Micro-app`; rama base consultada: `main`.
- SHA de main: `c5373564413ba086690552c6b7deeab08d7b4a89` (commit `docs(ledger): record closure of PR 255, 269 and 295 as superseded by 287 (#297)`).
- El commit de main inspeccionado cambia únicamente `docs/BACKLOG_RECOVERY_LEDGER.md`.
- Se inspeccionaron metadatos y diffs de PR #287/#296, comparaciones contra main, workflow runs del HEAD exacto, reviews formales, review threads y estado combinado legacy.

### PR #287 — integración BCV + checkout
- URL: https://github.com/BTF14/Micro-app/pull/287
- Estado vivo: OPEN, Draft, `mergeable=true`; no merged.
- Rama: `integration/bcv-checkout-rehearsal-20261109`.
- HEAD: `7df318b233cfb95f7fcc3076d46984a11614a14c`.
- Base: `main`, base SHA informado por PR: `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`.
- Compare actual contra main: 159 ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`; status `diverged`.
- Workflow runs asociados exactamente a este HEAD: 11; 6 SUCCESS y 5 FAILURE. Fallos: ODD and agent documentation validation (run `42674363952`), Dependency review (`42674363725`), Project progress dashboard (`42674364153`), Playwright E2E (`42674364197`) y CI (`42674364170`). Los otros seis workflows terminaron SUCCESS.
- Para cada uno de los cinco fallos, el endpoint de jobs devolvió `jobs: []`; los cinco endpoints de artifacts devolvieron listas vacías. No se obtuvieron steps, annotations, logs de job ni artifacts que permitan diagnosticar causa. Clasificación: FAILURE confirmado, causa desconocida/no observable con la interfaz consultada. No atribuir a código ni infraestructura sin evidencia.
- Combined legacy status: lista vacía. No equivale a check-runs ni permite derivar su contador.
- Reviews formales: 0. Review threads: 0.
- GitHub metadata devuelve `mergeable=true` en esta consulta, contradiciendo el snapshot previo `mergeable=false`. Mantener Draft: mergeability no es aprobación ni readiness.
- El diff de la rama no incluye `docs/BACKLOG_RECOVERY_LEDGER.md`, único archivo del commit posterior de main. No hay solapamiento de archivo con ese commit; no se justifica sincronización automática ni force-push.

### PR #296 — documentación de BCV, autorización y calendario
- URL: https://github.com/BTF14/Micro-app/pull/296
- Estado vivo: OPEN, Draft, `mergeable=true`; no merged.
- Rama: `docs/reconcile-bcv-freshness-fx-task-20261109`.
- HEAD: `73b0b134c14cb30f7c93d038c10acd0da5aa274c`.
- Compare actual contra main: 63 ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`; status `diverged`.
- Workflow runs asociados exactamente a este HEAD: 10/10 SUCCESS.
- Combined legacy status: lista vacía. Reviews formales: 0. Review threads: 0.
- Su diff tampoco incluye `docs/BACKLOG_RECOVERY_LEDGER.md`, por lo que el commit posterior de main no crea solapamiento de archivo con esta rama.
- Todo lo relativo a PIN, recuperación, calendario, PDF, alertas y recordatorios descrito en esta PR sigue siendo especificación documental, no implementación.

### Diagnóstico de divergencia y decisión
- Ambas ramas están un commit detrás porque main avanzó con el cambio documental del ledger. Ambas comparaciones devuelven `mergeable=true`; el commit nuevo de main toca un archivo no modificado por ninguna de las dos ramas.
- No se observa conflicto de archivo con ese único commit. La divergencia de historia no es por sí sola un conflicto textual ni motivo para reescribir ramas.
- Conservar ambos HEADs y Draft. No hacer force-push, merge ni sincronización solo para eliminar el contador behind.
- Los workflows de #287 siguen siendo bloqueadores de validación exact-HEAD: no presentar el HEAD como CI completamente verde. La ausencia de jobs/artifacts impide determinar la causa de los cinco fallos.
- Producción: NOT READY. No merge de #287/#296, deploy productivo, Neon main writes, migraciones remotas, Cron, Cloudflare manual, cambios de secretos/DNS/billing ni datos reales.

### Próximas acciones verificables
1. Obtener diagnósticos de los cinco workflows fallidos mediante una vía que exponga run-level logs/event details; si GitHub sigue sin jobs/artifacts, registrar el bloqueo como no diagnosticable y pedir re-ejecución desde GitHub solo cuando exista un mecanismo autorizado y útil.
2. Antes de cualquier merge futuro, reconsultar SHA, compare, mergeability, workflows/check-runs exactos, reviews, threads y branch protection.
3. Mantener #287 Draft hasta resolver validación exact-HEAD, revisión independiente y gates BCV/checkout; mantener #296 Draft hasta revisión documental y reconciliación final.
4. Continuar P0/P1 únicamente en ramas aisladas y con pruebas proporcionales al riesgo. No iniciar endpoints comerciales ni permisos sin matriz aprobada.



## Trabajo técnico inmediato
1. Los cinco workflow failures de #287 no exponen jobs ni artifacts. No hay diagnóstico demostrable todavía.
2. #287 incluye código BCV/checkout e inventario; no tocar hasta revisar el diff y confirmar la causa de CI o preparar una corrección delimitada.
3. #296 es documental; no describir sus propuestas como funcionalidades implementadas.
4. El único commit de main posterior al merge base afecta solo el ledger de recuperación, sin solapamiento con los paths modificados por #287/#296.
5. Antes de continuar con implementación, leer el ODD task específico y validar los permisos contra la matriz aprobada; no añadir endpoints ni permisos comerciales por inferencia.

## Restricciones no negociables
- No Neon main, datos reales, migraciones remotas, Cron productivo, Cloudflare manual, DNS, billing, secretos ni deploy manual.
- No force-push ni reescritura de historia.
- No usar CI de SHA anterior como evidencia del HEAD actual.
- No convertir checks verdes en aprobación formal o readiness.
- No trasladar al propietario tareas que las herramientas permitan ejecutar directamente.

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


## Reconciliación viva de backup — 2026-11-09 UTC

- Se verificó en GitHub que el backup programado del 2026-11-09 terminó success: [run 42659924075](https://github.com/BTF14/Micro-app/actions/runs/42659924075), 30 segundos de duración total, todos los pasos del job correctos.
- Se consultaron ocho runs programados consecutivos del 2026-11-02 al 2026-11-09; todos terminaron success. En el repositorio privado existe `daily/backup-2026-11-09T16-57-53Z.dump.age` (42,708 bytes) y su sidecar SHA-256, cuyo valor quedó registrado en `docs/BACKUP_AND_RECOVERY.md`. La sesión no descargó el blob para recalcular el hash ni descifró/restauró esa copia.
- El intervalo de timestamp UTC entre los backups del 8 y 9 de noviembre fue 27 h 00 min 16 s; no puede afirmarse RPO ≤24 h. El workflow sintético poblado PG18 pasó en run [41323379454](https://github.com/BTF14/Micro-app/actions/runs/41323379454) el 2026-11-01 y en el SHA de #287, pero no valida el backup real.
- La duración del backup no mide RTO. RPO/RTO, alerta de fallo controlada y coste total $0 siguen pendientes. La restauración de una copia real que pueda contener datos de producción está bloqueada por la restricción vigente de no usar datos reales; no ejecutar ni solicitar credenciales para hacerlo.
- Se actualizaron `docs/BACKUP_AND_RECOVERY.md` y el punto 2 de `docs/SECURITY_ROADMAP.md` en esta misma rama. El gate Nivel 1 continúa abierto. No se tocaron Neon, datos reales, secretos, el repositorio remoto de backups ni workflows productivos.



## Continuidad verificada — PR #299 y estado de gates (2026-11-09 UTC)

- **Fecha objetivo inalterable del MVP:** 2026-12-01. El primer corte P0 acepta un comercio pequeño/mediano de un solo local con hasta 1.000 productos y flujo completo desde UI; no reducir ni ampliar este alcance sin decisión expresa.
- **PR #299** ([test: medir restauración sintética](https://github.com/BTF14/Micro-app/pull/299)): OPEN/Draft, un archivo cambiado, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`, base main `c5373564413ba086690552c6b7deeab08d7b4a89`, 12/12 workflow runs SUCCESS y 14/14 check-runs SUCCESS en ese SHA; sin reviews formales ni comentarios de revisión. Añade una medición separada, en segundos enteros, alrededor de `pg_restore` en el fixture PostgreSQL 18 desechable y conserva el tiempo total del round-trip. No está fusionada.
- La métrica de #299 **no equivale al RTO operativo completo**: excluye detección, aprovisionamiento, recuperación de credenciales, descarga, checksum, descifrado, validación y recuperación del servicio. La resolución es de segundos enteros y no se dispone aquí del valor numérico impreso por el job. No declarar RTO cumplido por el simple éxito del workflow.
- **PR #298** permanece OPEN/Draft, HEAD `be86a68d87cbd124971c2016a5904e7ca83880b6`, base main `c5373564413ba086690552c6b7deeab08d7b4a89`; revalidación exact-HEAD: 13/13 workflow runs SUCCESS y 15/15 check-runs SUCCESS. No fusionar sin revisar aprobaciones y guardrails.
- **PR #287** permanece OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; 13 workflows exact-HEAD: 8 SUCCESS y 5 FAILURE (ODD docs, Dependency review, Project dashboard, Playwright E2E y CI). La API de jobs devuelve listas vacías; causa raíz no observable. No atribuirla a código ni repetir runs a ciegas.
- **Seguridad Nivel 1 sigue OPEN**. No iniciar endpoints comerciales de turnos ni UI Caja/Ventas hasta demostrar protección de main, backup/restore independiente, Dependabot y cabeceras/CORS. El backup programado más reciente observado fue run [42659924075](https://github.com/BTF14/Micro-app/actions/runs/42659924075), SUCCESS; el intervalo de timestamps entre 8 y 9 nov fue 27 h 00 min 16 s, por lo que no se garantiza RPO <=24 h. RPO, RTO operativo completo, alerta controlada y coste total $0 siguen pendientes.
- No usar backup real ni datos de producción; no tocar Neon main, secretos, billing, DNS, repositorio de backups ni workflows productivos. No merge ni deploy manual. GitHub sigue siendo la fuente de verdad y cada CI debe corresponder al SHA exacto.


## Revalidación posterior — 2026-11-09 UTC

- PR #298 avanzó a HEAD `be86a68d87cbd124971c2016a5904e7ca83880b6` (base `c5373564413ba086690552c6b7deeab08d7b4a89`), OPEN/Draft, 9 archivos. En ese SHA exacto terminaron **13/13 workflow runs SUCCESS y 15/15 check-runs SUCCESS**. No tiene reviews formales ni hilos de revisión. Sigue sin merge.
- PR #299 continúa OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`, base main `c5373564413ba086690552c6b7deeab08d7b4a89`; **12/12 workflows SUCCESS y 14/14 check-runs SUCCESS**; sin hilos de revisión. Su métrica aislada de pg_restore es de fixture sintético y no acredita RTO operacional completo.
- PR #287 continúa OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; **13 workflows exact-HEAD: 8 SUCCESS, 5 FAILURE**. Fallan ODD docs, Dependency review, Project dashboard, Playwright E2E y CI. Los jobs/logs de estos cinco runs no son accesibles por las vías consultadas; la causa raíz sigue desconocida. No rerun ciego.
- La revalidación de PRs no cierra Seguridad Nivel 1. El endpoint de branch protection y la API de alertas Dependabot no han sido revalidados con la conexión actual; las respuestas de permisos anteriores fueron 403. No inferir configuración actual a partir de un estado histórico. Backup RPO/RTO/alerta/coste siguen abiertos según la sección de backup.
- **Objetivo obligatorio: MVP funcional y estable para el 1 de diciembre de 2026**, P0: un comercio pequeño/mediano, un solo local, hasta 1.000 productos, flujo end-to-end desde UI. Mantener Draft #287/#296/#298 y no fusionar #299. No abrir endpoints comerciales ni Caja/Ventas hasta cierre demostrado del gate Nivel 1.
