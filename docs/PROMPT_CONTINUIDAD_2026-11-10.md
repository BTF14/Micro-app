# PROMPT MAESTRO DE CONTINUIDAD — BTF14/MICRO-APP

**Fecha de continuidad:** 10 de noviembre de 2026.  
**Fecha límite de entrega:** **1 de diciembre de 2026 — INAMOVIBLE.**  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Objetivo:** entregar un MVP POS SaaS multi-tenant y multi-sucursal funcional, estable, integrado y probado para un comercio de un local y hasta 1.000 productos, con presupuesto $0.

## Instrucción principal

Actúa como ingeniero/a principal sénior y continúa el trabajo real desde GitHub. No reinicies el análisis ni repitas preguntas ya resueltas. Lee primero la documentación vigente y verifica el estado vivo de GitHub antes de cualquier acción. Toma decisiones técnicas autónomas dentro de las restricciones siguientes; no confundas un plan o una prueba sintética con una capacidad desplegada.

## Lectura obligatoria antes de actuar

1. `AGENTS.md`
2. `docs/CONSTITUTION.md`
3. `docs/CURRENT_STATE.md`
4. `docs/HANDOFF_NEXT_CHAT.md`
5. `docs/PROJECT_PLAN.md`
6. `docs/STATE_JOURNAL.md`
7. `docs/SECURITY_ROADMAP.md`
8. `docs/EXTERNAL_SOURCE_RELIABILITY_BCV_SUDEBAN.md`

El checkpoint vigente está en `docs/WORK_CHECKPOINT.md` (no en la raíz). Consultarlo junto con CURRENT_STATE/HANDOFF cuando corresponda; no asumir que exista una ruta raíz `WORK_CHECKPOINT.md`.

## Corte GitHub observado el 2026-11-10 11:37 UTC

- `main`: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- PR #302 OPEN/Draft, HEAD `1b441b3dc9e65e2cb89d765f9aff084b474dd90d`, 10/10 workflows y 14/14 checks SUCCESS. Askpass temporal mejora manejo del token Git del backup; no prueba subida ni restore real.
- PR #301 OPEN/no Draft, HEAD `ce43ab2cff91cd07e7ca2b91635b8e27a02b11c8`, 10/10 workflows y 15/15 checks SUCCESS, sin reviews ni threads. Es prioridad de revisión: API de listado de sucursales, autorización `inventory.read`, owner/admin/cashier/inventory, branch membership, tenant isolation, fixtures y consistencia de UI. No aprobar solo por CI verde.
- PR #300 OPEN/Draft, HEAD `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95`, 10/10 workflows y 14/14 checks SUCCESS; elimina permiso de override de precio no aprobado.
- PR #299 OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`; test de duración de restore PostgreSQL aislado. No equivale a restore real.
- PR #298 OPEN/Draft, HEAD anterior a este commit documental `6a455b092c43e808c9f409ae10a6206f52c7a562`, 11/11 workflows y 15/15 checks SUCCESS. Este commit genera nuevo SHA: reconsultar exact-HEAD CI antes de afirmar estado.
- PR #296 OPEN/Draft, HEAD `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f`, 10/10 workflows y 14/14 checks SUCCESS; base SHA antigua `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`.
- PR #287 OPEN/Draft, HEAD `dd587308f85f42f8019d5fc74e7f8e296229ead8`, 11/11 workflows y 15/15 checks SUCCESS. Separación de `microapp_runtime` y `microapp_bcv_sync`, helper `lock_bcv_sync_state()` y Worker Cron separado en código/configuración; rol y secreto productor no provisionados, Worker/Cron no desplegado/activado.
- PR #193 OPEN/no Draft, HEAD `ac57ab4f3415f82279b8a49c0befe09f8e3aec68`, base antigua `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`; reconciliar alcance Fase B contra trabajo reciente de branches/inventory.
- Issue #53 sigue OPEN/P0: identidad, sesiones y aislamiento tenant.

## Riesgo inmediato: backup

Último workflow de backup programado visible: run #19 `42659924075`, SUCCESS del 2026-11-09 16:57:34 UTC. A las 11:37 UTC del 10 nov habían pasado ~18h40m; RPO 24h no excedido, margen ~5h20m. No había backup posterior visible. Verificar nueva ejecución antes de invertir en tareas secundarias. Si supera 24h, tratar como incidente P0 y diagnosticar con seguridad; no leer/imprimir secretos ni activar producción.

## Fuentes BCV / SUDEBAN — decisión ya tomada, no volver a preguntar

- Sus webs son inestables. No depender exclusivamente de ellas ni repetir búsquedas improductivas.
- El calendario 2026 proporcionado por el propietario es la mejor información disponible, pero NO oficial; conservarlo como `SECUNDARIO_PROVISIONAL`. No volver a pedirlo.
- No hay calendario oficial 2027 disponible de forma verificable al corte. No perseguir indefinidamente un documento inexistente/inaccesible: apoyarse en terceros trazables, con fecha, URL, fuente y corroboración si se puede.
- Nunca etiquetar fuentes de terceros como oficiales. Distinguir `OFICIAL`, `SECUNDARIO_CORROBORADO`, `SECUNDARIO_PROVISIONAL` y `NO_VERIFICADO`.
- Un fallo web no prueba que un dato no exista ni que no se haya publicado. Para BCV, no bloquear integración por web inestable; atribuir claramente fuentes alternativas, validar coherencia y no permitir tasa stale en checkout.

## Restricciones no negociables

- No Neon `main`, no datos reales, no cambios remotos de roles/grants, no secretos, no Cloudflare manual, DNS, billing ni deploy de producción.
- No activar Worker/Cron BCV hasta revisar identidad aislada, secreto, observabilidad y pruebas no productivas.
- No fusionar una PR solo porque CI esté verde. Exigir diff revisado, exact-HEAD workflows/check-runs, reviews formales, threads resueltos, base actual y pruebas relevantes.
- Distinguir workflows, check-runs, status contexts y reviews; no reutilizar resultados de SHA anteriores.
- Máximo dos frentes activos. Priorizar seguridad P0 y continuidad de backups; después flujo POS integral y piloto.
- No solicitar Build IDs, capturas, terminal, CLI, TinyFish, reconexiones ni datos ya documentados. Si algo esencial falta, preguntar una sola vez y aceptar respuesta en texto.
- Si la documentación contradice GitHub, GitHub es fuente de verdad para estado de PR/commits/CI; corregir docs en la rama documental y anotar discrepancia, no ocultarla.

## Modo de trabajo esperado

1. Lee docs obligatorios.
2. Reconsulta main, PRs abiertas, diffs, workflows exactos, check-runs, status contexts, reviews y review threads.
3. Identifica el mayor riesgo P0; trabaja en un máximo de dos frentes.
4. Haz cambios pequeños, seguros, testeables, con ODD y documentación coherente.
5. Ejecuta/revisa pruebas aisladas; nunca uses Neon main ni secretos productivos.
6. Actualiza `CURRENT_STATE`, `HANDOFF_NEXT_CHAT`, `STATE_JOURNAL`, `SECURITY_ROADMAP` y este prompt cuando el estado cambie.
7. Antes de terminar, valida SHA exacto y deja instrucciones concretas para el siguiente turno.

**Estado de producto al corte: NOT READY FOR PRODUCTION.** Fecha límite **2026-12-01**, inamovible. No declarar MVP listo hasta superar seguridad, backup/restore, flujo POS realista, pruebas E2E y piloto controlado.

 
## Addendum de continuidad — corte vivo 2026-11-10 11:59 UTC

- Main confirmado: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- Último backup programado: run #19 `42659924075`, SUCCESS; job `129308412112` verificó pg_dump 18.6, age, checksum, push remoto commit `828ef31` y retención sin borrados. No había ejecución programada posterior al corte.
- Edad de copia ~19 h al corte; el ciclo actual no había superado 24 h. Sin embargo, el intervalo entre #18 y #19 fue 27h00m14s y el máximo histórico documentado 48h03m03s: RPO≤24 h sostenido NO cumplido. El último restore remoto documentado es del 29 oct, no de la copia más reciente.
- #302 corrige en rama el token Git persistido en URL mediante GIT_ASKPASS; sigue Draft, sin review, CI 10/10 workflows y 14/14 check-runs, sin prueba real con credencial.
- Riesgo P0: `backup_readonly` hereda `pg_write_all_data` según evidencia read-only previa; no se demostró que el secreto `DATABASE_URL_BACKUP_RO` use ese usuario. No tocar Neon main ni leer secretos.
- PR exact-HEAD, ahead/behind y reviews están consolidados en CURRENT_STATE.md y HANDOFF_NEXT_CHAT.md. Todos los ocho PRs (#287/#296/#298/#299/#300/#301/#302/#193) siguen OPEN; no hay reviews formales ni threads. #301 y #193 no son Draft; #193 está 74 commits detrás.
- Issue #53 permanece OPEN/P0. Seguridad Nivel 1 ABIERTO. P0 UI sigue 0/1 jornadas completas. No desplegar ni declarar producción lista.
- Fecha límite absoluta: **2026-12-01**.

 
## Revalidación posterior — PR #302 GIT_ASKPASS y revisión inicial #301 — 2026-11-10

- PR #302 nuevo HEAD: `5420896eb591d3ae513254a064c787624678da14`, OPEN/Draft, 5 ahead / 0 behind de main, 14/14 check-runs SUCCESS y 12/12 workflow runs SUCCESS. Sin reviews formales ni threads.
- Se extrajo `scripts/backup_git_askpass.sh`; el workflow copia el helper a `$RUNNER_TEMP` con modo 700 y lo elimina con el clon temporal. `scripts/test_backup_git_askpass.sh` comprueba con token ficticio las respuestas Username/Password, rechazo de prompts desconocidos, fallo por GH_TOKEN ausente y ausencia del token en el archivo helper.
- La prueba aislada local pasó. En CI exact-HEAD, el paso **Test backup Git askpass contract** terminó SUCCESS dentro del workflow CI run `42813175458`; el SHA final de PR #302 pasó 14/14 checks y 12/12 workflows. Esto valida el contrato local del helper, no autenticación HTTPS real, push remoto, backup productivo ni restore.
- No se ejecutó el workflow real de backup ni se usaron secretos reales. Main sigue usando la URL Git con token hasta que exista una integración segura; PR #302 continúa Draft por falta de review independiente y porque el principal PostgreSQL/RPO/RTO siguen abiertos.
- Primera pasada estática de PR #301: `branches.ts` reutiliza `authorizeTenantOperation(..., "inventory.read")`, filtra por organization_id y sucursales activas, y limita cashier/inventory a branch_memberships activas; owner/admin reciben sucursales activas de su organización. Tests cubren owner/admin/cashier/inventory, tenant ajeno y sesión ausente. No se observó un bypass directo en esta pasada; el límite `MAX_BRANCHES=100` sin cursor permanece explícito. No equivale a revisión independiente completa ni aprobación; #301 sigue OPEN/no Draft, sin review formal.
- PR #298, antes de esta nueva actualización, estaba en HEAD `44def211e264fd34d5bef7db5cead8c5fd6d509b`, 223 ahead / 0 behind, 15/15 check-runs y 13/13 workflows SUCCESS. El commit documental actual mueve nuevamente su HEAD y exige CI exact-HEAD nuevo.


---

## Revalidación de backup y CI — 2026-11-10 12:57:55 UTC

- Main observado: `c5373564413ba086690552c6b7deeab08d7b4a89`; no modificado.
- Última copia programada: run #19 `42659924075`, SUCCESS, inicio `2026-11-09T16:57:34Z`; artefacto `backup-2026-11-09T16-57-53Z.dump.age`; commit remoto `828ef3193f3b8e4935d0e945f504cd81aca4b78e` a `2026-11-09T16:57:59Z`.
- A `2026-11-10T12:57:55Z` no aparece run #20 en eventos `schedule`, tampoco ejecución posterior por `workflow_dispatch`; el repositorio remoto conserva como HEAD `828ef319...` y no lista artefactos del 10-nov.
- Edad del dump: 20 h 00 min 02 s. Umbral estricto de 24 h desde el timestamp del artefacto: `2026-11-10T16:57:53Z` (12:57:53 UTC−4); margen al corte: 3 h 59 min 58 s. **El ciclo actual aún NO ha superado 24 h.** No declarar incidente de RPO de este ciclo antes de ese instante y de una reconsulta posterior.
- RPO≤24 h sostenido continúa **NO-GO** por intervalos históricos entre artefactos superiores a 24 h (incluido #18→#19, 27 h 00 min 16 s; máximo histórico documentado 48 h 03 min 03 s). Una nueva copia a tiempo no borra esas brechas históricas.
- Run #19 completó pg_dump PostgreSQL 18.6, cifrado age, SHA-256 y push. Existencia del dump y sidecar confirmada en destino; no se descargó, descifró ni restauró el archivo en esta revisión.
- No se lanzó ejecución manual, no se leyeron secretos, no se accedió a Neon ni se modificaron cron, retención, Cloudflare, DNS, billing o producción. Issue #53 continúa OPEN/P0; la corrección de hora publicada en el comentario `6767940665` retracta una declaración prematura y deja claro que el umbral aún no se había alcanzado.
- Restauración real más reciente documentada: 2026-10-29. RTO integral, restore de la copia del 9-nov, alertas externas y principal PostgreSQL efectivo de mínimo privilegio siguen sin demostrarse.
- Deadline inamovible: **2026-12-01**. Producción **NOT READY**.


## Reconciliación de documentación y CI — 2026-11-10 12:57:55 UTC

- #298 OPEN/Draft, HEAD `1e7d656c8e054fc6e88d0f4148c39e4823f59d04`, 226 ahead / 0 behind, 42 archivos documentales, 11/11 workflows PR y 15/15 check-runs SUCCESS; no reviews formales. Cualquier commit nuevo requiere revalidar el SHA final.
- #302 OPEN/Draft, HEAD `5420896eb591d3ae513254a064c787624678da14`, 10/10 workflows PR y 14/14 checks SUCCESS; prueba de askpass no demuestra autenticación real ni backup real.
- El checkpoint está en `docs/WORK_CHECKPOINT.md`. Las propuestas de descuentos y la aprobación de matriz descritas como pendientes en bloques fechados 2026-10-30 son históricas; matriz aprobada 2026-10-31 y no descuentos/promociones desde 2026-11-05.
- El último dump es de `2026-11-09T16:57:53Z`; a `12:57:55Z` aún faltaban ~4h para el umbral de 24h. No declarar incumplimiento actual. Revalidar después de `16:57:53Z`.
- Fecha límite inamovible **2026-12-01**. Producción **NOT READY**.


---

## Revalidación RPO — 2026-11-10T13:15:32Z (09:15:32 UTC−4)

- Último artefacto remoto sigue siendo `backup-2026-11-09T16-57-53Z.dump.age`, run programado #19 `42659924075` SUCCESS; commit remoto `828ef3193f3b8e4935d0e945f504cd81aca4b78e` (`2026-11-09T16:57:59Z`).
- La consulta de Actions `event=schedule` sigue mostrando #19 como último run; no aparece #20. La consulta `event=workflow_dispatch` no muestra ejecución posterior del workflow. El repo remoto no cambió y `daily/` no lista artefactos del 10-nov.
- Edad exacta del dump al corte: **20 h 17 min 39 s**. Umbral estricto de 24 h desde el timestamp del dump: `2026-11-10T16:57:53Z` (12:57:53 UTC−4); restan **3 h 42 min 21 s**. El ciclo actual continúa dentro de la ventana; no declarar breach aún.
- RPO sostenido sigue **NO-GO** por brechas históricas entre artefactos superiores a 24 h. La restauración real de la copia del 9-nov, RTO integral, alertas externas y principal PostgreSQL efectivo siguen sin demostrarse.
- No se lanzó workflow manual, no se usaron/leyeron secretos, no se accedió a Neon, no se descargó/descifró/restauró el dump y no se cambió cron, retención ni producción. Issue #53 OPEN/P0; comentario `6767940665` contiene la corrección de zona horaria y no declara brecha en el corte previo.
- Deadline inamovible **2026-12-01**. Producción **NOT READY**.


## Estado de PRs exact-HEAD — 2026-11-10T13:15:32Z (09:15:32 UTC−4)

- PR #302 OPEN/Draft, HEAD `a8ee511ae87fdeb5cc86081449ee407dda45b121`, base main `c5373564413ba086690552c6b7deeab08d7b4a89`; 14/14 check-runs SUCCESS y 10/10 workflows `pull_request` SUCCESS; cero reviews formales. El test HTTP loopback de askpass pasó en CI; no demuestra push real, TLS/GitHub ni backup real. Comentario de evidencia en PR #302: `6768302795`.
- PR #298 antes de este commit: HEAD `aee9feac49c389c217c511c03c798b0474145ee5`, OPEN/Draft, 230 commits ahead / 0 behind, 42 archivos documentales, 15/15 check-runs y 11/11 workflows PR SUCCESS, cero reviews formales. **Este commit cambia su HEAD e invalida esos resultados para el SHA nuevo**; volver a consultar checks/workflows exactos antes de cualquier decisión.
- No mergear #298 ni #302. Mantener Draft; no force-push/rebase. Legacy combined status puede devolver pending con cero contextos; no tratarlo como check ni aprobación.
