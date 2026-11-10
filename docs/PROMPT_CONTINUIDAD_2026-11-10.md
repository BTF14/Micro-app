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

La ruta `WORK_CHECKPOINT.md` no fue encontrada en la rama documental al último corte; no asumir que existe. Localizar el checkpoint real desde docs/AGENTS si hace falta.

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
