# Actualización de continuidad — 9 de noviembre de 2026

> Esta actualización prevalece sobre snapshots históricos que indiquen otro HEAD o describan como pendientes capacidades ya implementadas. Verificar siempre el SHA vivo en GitHub antes de nuevas acciones.

## PR #287 — integración BCV + checkout

- Estado: OPEN / Draft; base `main`; HEAD de código actual `3c32b6d46a807a88962de81443af84c4d4fef3e1`; GitHub informa `mergeable=true`. No hay reviews formales ni review threads abiertos.
- CI del HEAD exacto: **15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS**. Los 11 workflows de PR incluyen CI, Playwright E2E, validación de migraciones, PostgreSQL migration runner, backup/restore, Semgrep, Security scan, secret-history, dependency review, ODD docs y dashboard. Los builds Cloudflare de la rama son previews, no promoción a producción.
- No merge, no deploy productivo, no Neon main writes, no migraciones remotas, no activación Cron, no cambios de secretos/DNS/billing ni datos reales.

## BCV: estado real de implementación

- Checkout **sí consume** `bcv_sync_state`: lee `last_success_at`, exige `last_outcome` = `inserted` o `unchanged`, exige `last_effective_date >= hoy Caracas`, y además una tasa `valid` con fecha efectiva exactamente igual a hoy. Usa `FOR SHARE` dentro de la transacción; no hay fallback a tasa vieja ni TTL arbitrario.
- La migración 0021 añade defensa SQL mediante trigger diferido para validar el estado al completar una venta, también frente a escrituras directas del rol runtime.
- La carrera de intentos supersedidos está corregida con `attempt_id` y bloqueo/validación atómica antes de persistir. La prueba PostgreSQL cubre dos respuestas diferentes para la misma fecha y verifica que el intento antiguo no invalide la tasa del nuevo.
- Existe endpoint `GET /api/orgs/:organizationId/bcv/sync-state`, solo lectura y tenant-scoped, permiso `bcv.sync_state.read` exclusivo de owner/admin. Cashier e inventory no tienen acceso. Respuesta `no-store`, errores sanitizados.
- El dashboard muestra un panel BCV solo a owner/admin, con último intento/éxito, outcome, fecha efectiva, edad del intento, error code sanitizado, actualización manual y refresco automático cada cinco minutos. No permite editar tasa ni ejecutar sincronizaciones.
- Wrangler ya declara Workers Observability/Logs: redacción de query strings, `invocation_logs=false`, logs estructurados explícitos con sampling 1. El Cron registra `BCV_SYNC_STARTED`, `BCV_SYNC_COMPLETED` y `BCV_SYNC_FAILED`; el error solo expone código sanitizado.
- No se ha creado Monitor, destino de correo ni watchdog; no se ha probado entrega de alertas. Inspeccionar dataset/campos reales y consumo de cuenta antes de configurar monitor.

## Gates aún abiertos — producción NOT READY

1. CI exact-HEAD del siguiente commit documental/código debe volver a validarse; no reutilizar los resultados de este SHA.
2. Capturar y conservar fixture reproducible de HTML oficial BCV y probar el parser con respuesta real. La recuperación oficial anterior devolvió 502; no sustituir por copias de terceros.
3. Obtener calendario bancario oficial SUDEBAN verificable. No afirmar que no existe ni codificar fechas desde terceros.
4. Justificar y aprobar límites del parser `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7`; siguen hard-coded y no aprobados.
5. Configurar monitor de `BCV_SYNC_FAILED`, destino autorizado y prueba de entrega. Diseñar watchdog de `running` estancado con SLO/umbral medido; no inventar umbral.
6. Cerrar identidad efectiva del Worker, pruebas aisladas de recuperación, revisión legal/contable y semántica append-only de cambios, pagos parciales, anulaciones y reembolsos.
7. La contingencia de tasa manual por owner/admin sigue siendo una propuesta documentada, no una función activa. Mantener el diseño de autorización reforzada (PIN secreto verificado en servidor, límites/rate-limit, auditoría, caducidad y separación de funciones); no implementar ni permitir edición directa hasta cerrar revisión legal/contable y especificación.

## Reglas de continuidad

- No pedir otra vez Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones si el dato está en GitHub o documentación. Si falta un dato imprescindible, pedirlo una sola vez y aceptar texto.
- Leer primero `AGENTS.md`, `WORK_CHECKPOINT.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y `docs/SECURITY_ROADMAP.md`.
- Mantener #287 Draft. CI verde no equivale a aprobación. No fusionar PR de procedencia por separado si su cambio ya está integrado.
- Actualizar este estado documental cuando haya una decisión, hallazgo o discrepancia nueva; después revalidar CI exact-HEAD.

---

## Reconciliación operativa — 2026-11-08 UTC (verificación Neon + estado PR)

**Fuente de verdad:** GitHub API y ejecución manual observada de GitHub Actions. Rama documental creada desde main `6f956b2336a70ec7013e20306be59d72db354b01`; este addendum no modifica main.

### Neon rehearsal — evidencia de ejecución
- Workflow `.github/workflows/neon-rehearsal-migrations.yml`, run [#42479603848](https://github.com/BTF14/Micro-app/actions/runs/42479603848), disparado manualmente desde `main` en modo `verify`.
- Resultado: **FAIL** en el paso `Require the rehearsal-only direct migrator connection`; log explícito: `Missing repository secret NEON_REHEARSAL_DATABASE_URL.`
- El job completó la instalación de PostgreSQL client y verificó que el ref es `main`. Se detuvo antes de ejecutar psql; no se conectó a Neon y no se ejecutó baseline verify, DDL, DML ni migración.
- Conclusión permitida: el secreto no está disponible para este workflow/run. No se inspeccionó ni expuso ningún valor de secreto. No se creó ni modificó secreto.
- El modo `adopt-and-migrate` no se seleccionó ni ejecutó. Neon `main` permanece fuera de alcance.

### Cron de retención auth — evaluación del riesgo
- `apps/api/wrangler.toml` declara `crons = ["17 * * * *"]`; `apps/api/src/index.ts` ejecuta `cleanupExpiredAuthRecords()` solo cuando `APP_ENV === "production"`.
- `apps/api/src/auth-rate-limit.ts` ejecuta dos DELETE secuenciales: `auth_rate_limits` y `auth_bootstrap_attempts`. No los envuelve en una transacción común.
- `auth_bootstrap_attempts` se crea en la migración `0005_auth_bootstrap_attempts.sql`. La última evidencia documental de Neon main indica que esa tabla y las migraciones posteriores no están aplicadas. Si el Worker productivo ejecuta esta versión con un DATABASE_URL apuntando a ese esquema, la segunda DELETE falla por tabla ausente; la primera puede haber confirmado por separado.
- El árbol actual de `.github/workflows` no contiene workflow de despliegue de Worker. No se obtuvo evidencia viva del deployment activo ni logs autenticados de Cloudflare. Por tanto, **el incidente no está confirmado** y no se debe afirmar que el Cron esté desplegado/ejecutándose.
- No cambiar Cloudflare, Worker, secretos ni el Cron sin verificar deployment y seguir el gate de producción.

### Estado vivo de PRs en GitHub
- `main`: `6f956b2336a70ec7013e20306be59d72db354b01`.
- #251 auth retention: **merged**; merge commit `8c13da8b2d55d0a45490b19499b1b7c53e0ec966`. El texto histórico del cuerpo de la PR que aún dice Draft no prevalece sobre el estado vivo merged.
- #255 BCV: open, HEAD `59b6b40ddf30f6711624124b719ef15234ce5fdc`, base main en SHA `c46ed6f3e57a12bf92a7f0718435dfff8096b540`; comparación actual 48 ahead / 1 behind; GitHub informa mergeable. Requiere sincronizar el único commit posterior de main y completar el gate Neon/Worker antes de integrar o activar el Cron BCV.
- #258 checkout: open, HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`; base histórica main SHA `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67`; comparación actual 35 ahead / 32 behind, diverged; GitHub informa `mergeable=false`. No force-push ni merge de sincronización improvisado.
- #262 ledger projection: open, HEAD `19103c000b354da85c1a478867a6a18e2ec25cd7`; apilada sobre rama checkout antigua `feat/sales-checkout-recovered-main-20261108`, base SHA `df1ba996babb859a83da09d72cdec63a69b3965c`; comparación contra main 107 ahead / 32 behind. No integrar separada ni asumir que mergeable en su base implica integrable a main.
- #233 checkout histórico: open/Draft; conservar hasta demostrar que no aporta cambios únicos.
- #193 inventario Fase B: open; mantener intacta según instrucción expresa.
- #255/#258/#262 no deben considerarse listas para producción por checks históricos. Revalidar en SHA final y verificar las dependencias del stack.

### Contrato comercial checkout
- No existe todavía confirmación explícita del propietario sobre moneda única, pago completo, pagos divididos y manejo de sobrepago/cambio.
- Recomendación técnica provisional: una moneda de liquidación por venta y saldo pendiente cero para completar; permitir múltiples medios de pago dentro de la misma moneda. Modelar por separado importe recibido y cambio devuelto en pagos en efectivo si el negocio lo requiere. No cambiar constraints/migraciones hasta aprobar el comportamiento de producto.
- Este bloqueo no impide auditoría ni reconstrucción técnica; sí impide cerrar el contrato comercial y declarar checkout listo.

### Acciones realizadas / no realizadas
- Ejecutado solo el workflow `verify`; falló por secreto ausente antes de conectarse a Neon.
- No se creó/modificó secreto; no hubo Neon, Cloudflare, deployment, DNS, billing, producción ni datos reales.
- No hubo merge, force-push ni cambios de código fuente. Esta rama contiene únicamente reconciliación documental.
- Siguiente paso bloqueado: el propietario debe crear el secreto de repositorio `NEON_REHEARSAL_DATABASE_URL` con conexión directa/no pooler del usuario `microapp_migrator` a la rama rehearsal exacta `br-curly-poetry-b7dxsddm` del proyecto `restless-fire-99110035`. Nunca compartir el valor en chat. Después repetir `verify`; no activar `adopt-and-migrate` sin autorización específica de escritura para rehearsal.

---

# 2026-11-08 UTC — PR #266 de sincronización cerrada sin merge; PR #265 documental en CI

- Se creó PR #266 (main hacia la rama de #258) para diagnosticar la sincronización; GitHub reportó `mergeable=false`. Se cerró sin merge.
- El análisis de archivos detectó solapamiento en nueve rutas: `.github/workflows/ci.yml`, `.github/workflows/migration-check.yml`, `apps/api/src/index.ts`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/STATE_JOURNAL.md`, `docs/WORK_CHECKPOINT.md`.
- No se modificó ni forzó la rama de #258. PR #265 contiene reconciliación documental posterior a #264; sus checks exact-HEAD estaban en ejecución al registrar.
- No se modificaron datos, credenciales, Neon main ni Cloudflare.

---

# 2026-11-08 UTC — PR #264 integrada; reconciliación de documentación posterior

- PR #264 se fusionó por BTF14 a main a las 10:09:33Z, merge commit `c46ed6f3e57a12bf92a7f0718435dfff8096b540`. Su HEAD revisado fue `519d66a8bfab0fc9dc1ebbaeeeb0fc5418da391e`; 15 checks exact-HEAD SUCCESS (la API posteriormente mostró 16 por duplicación de check-runs). Workflow manual integrado.
- No se encontró evidencia de workflow_dispatch ni de migraciones remotas. La API de secretos está fuera del alcance del conector GitHub; la existencia del secreto `NEON_REHEARSAL_DATABASE_URL` queda desconocida.
- Neon main `br-summer-math-b7297a60`, lectura solo de metadatos: no roles runtime/migrator, no schema_migrations, auth_bootstrap_attempts, branches, warehouses, inventory_balances; auth_rate_limits sí existe; exchange_rates.rate NUMERIC(14,6). No se ejecutó DDL/DML.
- PR #255: 15/15 SUCCESS, mergeable clean, pero base SHA reportada `8c13da8...` anterior a #261/#264. No usar checks antiguos para merge; sincronizar/revalidar.
- PR #258: 16/16 SUCCESS en HEAD antiguo, dirty; compare contra main diverged 35 ahead / 31 behind. No force-push ni actualización a ciegas.
- PR #262: 8/8 SUCCESS, stacked sobre HEAD antiguo de #258; no integrar independientemente.
- Se intentó actualizar documentación directamente en main; GitHub la rechazó por branch protection (6 required checks). Se abrió rama docs dedicada y se preparó PR para reconciliar CURRENT_STATE, HANDOFF_NEXT_CHAT, WORK_CHECKPOINT y SECURITY_ROADMAP. No se cambió branch protection.
- Ningún secreto, Neon main, Cloudflare manual, DNS, billing ni datos reales fue modificado.

---

# 2026-11-08 UTC — Neon main schema drift confirmado por SELECT

- Lectura de solo esquema en Neon main `br-summer-math-b7297a60`: no existen `microapp_runtime`, `microapp_migrator`, `schema_migrations`, `auth_bootstrap_attempts`, `branches`, `warehouses` ni `inventory_balances`; sí existe `auth_rate_limits`; `exchange_rates.rate` es `NUMERIC(14,6)`.
- Identidad consultada: `neondb_owner`, database `neondb`, project `restless-fire-99110035`, branch `br-summer-math-b7297a60`.
- El resultado confirma que Neon main sigue en baseline 0001–0002, desfasado del main de código. El Cron #251 está configurado en el repositorio; despliegue/ejecución real no verificados y la segunda DELETE fallaría si el Cron ejecuta contra este esquema.
- Solo SELECT de catálogos/metadatos; no se leyeron filas de negocio, no se ejecutó DDL/DML, no se tocaron secretos ni Cloudflare.

---

# 2026-11-08 UTC — PR #261 integrado; runner Neon de ensayo preparado; riesgo Cron #251 registrado

- PR #261 se fusionó en main mediante squash: merge SHA `10ed02c6c6d30940ef2e2a75db009f6ea6859bd3`. Main quedó protegido en ese SHA; sus 11 check-runs post-merge estaban en progreso al verificar. No se reutilizan como éxito post-merge hasta terminación.
- PR #264 se abrió desde main para añadir un workflow manual, branch-guarded, de ensayo Neon. HEAD actual de la rama de trabajo al registrar esta entrada: `3fce180afb3ecf174edc927e577185fe0f6723a5`; CI exact-HEAD todavía en progreso. La PR no se ha fusionado ni ejecutado.
- El workflow exige el secreto nuevo `NEON_REHEARSAL_DATABASE_URL` con login directo/no pooler `microapp_migrator`, y verifica database/project/branch/session identity antes de operar. Modo por defecto `verify`; modo de escritura requiere confirmación exacta del branch. No se creó ni modificó ningún secreto.
- Rehearsal `br-curly-poetry-b7dxsddm`: fingerprint de 294 hechos coincide exactamente con baseline 0002; 15 tablas y 2 secuencias son propiedad de `microapp_migrator`; no hay ledger. No se ejecutó baseline adoption ni ninguna migración.
- Se revisó `cleanupExpiredAuthRecords()` de #251: dos DELETE separados (auth_rate_limits y auth_bootstrap_attempts), sin transacción envolvente. El último snapshot de Neon main documentado y la rehearsal no contienen `auth_bootstrap_attempts`; si el Cron horario configurado en main ya fue desplegado contra ese esquema, el segundo DELETE fallará y el primero podría haber confirmado. Despliegue/ejecución real no verificados. No se desactivó el Cron ni se tocó Cloudflare.
- PR #255 permanece Ready, base main, HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`, 15/15 checks verdes y mergeability clean; no integrar hasta completar rehearsal, grants y verificar principal real del Worker.
- PR #258 permanece Ready pero dirty, HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`, 16/16 checks verdes, 29 commits detrás de main. Contrato de pagos sigue pendiente de aprobación funcional del propietario.
- PR #262 sigue apilada sobre un HEAD anterior de #258; no integrar independientemente. #193 permanece intacta; #233 sigue como fuente histórica Draft.
- No se modificó Neon main, secretos, datos reales, configuración Cloudflare, DNS, billing ni se ejecutó despliegue manual.

---

# 2026-11-08 UTC — verificación exacta del baseline Neon rehearsal

- Se ejecutó en modo de solo lectura `scripts/db/schema_fingerprint.sql` sobre `rehearsal-baseline-20261107` y se comparó con `apps/api/migrations/baselines/0002.schema.txt` de main.
- Resultado: 294 hechos de esquema en vivo y 294 hechos canónicos; coincidencia exacta, sin diferencias. La rama corresponde al baseline pre-ledger 0002.
- El procedimiento existente `scripts/db/adopt-baseline.sh` está diseñado para este baseline exacto. El script puede verificar/adoptar 0001-0002 y transferir ownership a `microapp_migrator`; luego `scripts/db/migrate.sh` debe aplicar secuencialmente el resto de migraciones.
- No se ejecutó `adopt-baseline.sh apply`, no se creó ledger, no se transfirió ownership y no se aplicó ninguna migración. No hay workflow Neon protegido: `migration-runner.yml` solo usa PostgreSQL desechable local. No sustituir el runner por SQL manual ni usar secretos de producción.
- El hallazgo se añadió a la descripción de PR #255. Neon main no fue consultada ni modificada en esta prueba.

---

# 2026-11-08 UTC — reconciliación posterior al merge #251 y ensayo Neon de solo lectura

- GitHub main confirmado: `8c13da8b2d55d0a45490b19499b1b7c53e0ec966`; PR #251 ya está fusionada. GitHub muestra 6 PR abiertas.
- PR #255 fue retargeteada de la rama de #251 a `main`; su descripción se corrigió. HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`, 15/15 check-runs SUCCESS y mergeability clean. No se fusionó porque el Cron nuevo escribiría en `exchange_rates` y los gates de Neon/runtime no están satisfechos.
- PR #258 HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`: 16/16 check-runs SUCCESS, pero GitHub informa `mergeable=false / dirty`; comparación con main: 29 commits detrás. #262 permanece apilada sobre un HEAD anterior de #258.
- PR #261 tenía un snapshot obsoleto (main `d28b80e`, #251 no fusionada). Se actualizó el encabezado operativo de CURRENT_STATE, HANDOFF_NEXT_CHAT, PROJECT_PLAN, SECURITY_ROADMAP y WORK_CHECKPOINT en su rama. El nuevo HEAD requiere CI exact-SHA.
- Neon rehearsal `br-curly-poetry-b7dxsddm` inspeccionada en solo lectura. No hay `schema_migrations` ni `app_schema_migrations`; rate y snapshots continúan NUMERIC(14,6); `microapp_runtime` carece de grants en `exchange_rates`; `microapp_migrator` tiene login directo, CREATE en public y ownership de exchange_rates. Se verificó identidad de ambas sesiones. No se ejecutó DDL/DML.
- `.github/workflows/migration-runner.yml` valida PostgreSQL desechable local; no es un runner de migración Neon. No afirmar que aplica migraciones remotas.
- No se modificó Neon main, secretos, Worker productivo, DNS, billing ni se ejecutó despliegue manual. Producción sigue NOT READY.
- Proceso single-maintainer: no inventar review formal ni crear otra cuenta; separar revisión técnica asistida por IA, checks exact-SHA y autorización del propietario. Respetar branch protection y los gates sensibles de producción.

---

## 2026-11-08 06:45 UTC — recuperación viva de continuidad

- GitHub confirma main `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67`; PR abiertas: #193, #233, #251, #255, #258 y #261 (reconciliación documental). #257, #259 y #260 están fusionadas.
- #251 HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`, #255 HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`, #258 HEAD `df1ba996babb859a83da09d72cdec63a69b3965c`. Cada una: 15/15 check-runs y 13/13 workflow runs SUCCESS; no se encontraron reviews formales independientes.
- CI exacto de #258 (run 42450188433) pasó 141 unitarias, 85 runtime-role PostgreSQL y 19 checkout PostgreSQL; assertions de migrations 0017/0018 pasaron.
- #193 contiene un archivo único aún ausente en main y está 5 ahead / 23 behind; conservar para revisión. #233 sigue siendo fuente histórica divergida; no fusionar.
- Corrección de continuidad: rate limit específico de checkout y validación SQL por pago individual VES ya están implementados en #258; no deben seguir apareciendo como pendientes. Permanecen los gates Neon, balance projection, decisión comercial, feriados, UI y review independiente.
- No se hicieron cambios en Neon, secretos, Cloudflare productivo, DNS, billing ni despliegues manuales. Producción continúa NOT READY.

---

# 2026-11-08 UTC — actualización posterior a la validación exact-SHA

- #251 HEAD `ded2d95681e9a9436fdb2c9630092379a60405cb`: 15/15 check-runs y 13/13 workflows SUCCESS; 26 ahead / 0 behind main.
- #255 HEAD `a31892ae74958573a741cb36470182da6bdd529e`: 15/15 + 13/13 SUCCESS; 45 ahead / 0 behind de base #251.
- #258 HEAD `48eaa489dfc062912871b98594c6db4083812087`: 15/15 + 13/13 SUCCESS; 141 unit, 85 runtime-role PostgreSQL y 16 checkout PostgreSQL tests; 23 ahead / 0 behind main.
- #260 HEAD previo `ebfc650954f9a65de0f51d36781605c36c73650c`: 13/13 + 11/11 SUCCESS; este refresh genera nuevo SHA y exige revalidación.
- #257 y #259 integradas en main `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`.
- Sin cambios de Neon, secretos, Cloudflare productivo, DNS, billing, datos reales ni deploy manual.
- Producción sigue NOT READY por gates documentados.

---
# 2026-11-08 UTC — post-merge state refresh (#257/#259)

- #259 CI serialization merged to main as `07b146a3f2b7830bbd328a585535084e57e43c4e`.
- #257 documentation reconciliation merged to main as `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`.
- #258 remains Draft, HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94`: 15/15 check-runs and 13/13 workflows SUCCESS; 141 unit tests, 85 runtime-role integration tests, 16 checkout PostgreSQL tests. Migration 0017 now validates per-line arithmetic as well as BCV weekend effective date.
- #251/#255 remain Draft, green exact SHA, no formal review; #255 is the BCV producer dependency.
- No Neon main writes, secrets, manual Cloudflare deployment, DNS or billing changes. Production NOT READY.
---

# 2026-11-08 UTC — sincronización de ramas, retención y checkout

- #251 se sincronizó con main mediante merge commit `cb43dfc3b4eced25afafd1813af28629fda48bb8`; después se añadió una regresión que ejecuta dos invocaciones del Cron y prueba el drenaje del backlog de 501 filas por tabla. HEAD final de esa actualización: `e2015f3742c2fba62bada2468efdb3689e2e1db4`, 15/15 check-runs y 13/13 workflows SUCCESS.
- #255 se sincronizó con la base actualizada #251 mediante merge commit `4d05c38c7dc7623d7c8a94894db022a542fb43b5`; se preservó controller.cron y la regresión de retención. HEAD `1337d28591673dabfe5c4bf1d5c0d8c03c99162b`, 15/15 check-runs y 13/13 workflows SUCCESS.
- #258 se sincronizó con main #259 y su árbol quedó 13 ahead / 0 behind. HEAD documental `313f76c132c61200ed49a7c6e4e01fcf75659bf9`: 12/15 check-runs y 12/13 workflows SUCCESS, sin fallos; quedan Workers Builds, verify, Pages y CI pendientes.
- #257 se sincronizó con main mediante merge commit `f791b312b53541cacca67161ed1f6e5b9ab54173`; este refresh de documentación cambia el HEAD y requiere revalidación.
- No hubo escrituras Neon, cambios de secretos, Cloudflare productivo, DNS, billing, deploy manual ni datos reales.
- Producción sigue NOT READY por gates de identidad/runtime Neon, review independiente, tasa BCV, pagos, UI, SQL monetary checks y privilegios de balances.

---

# 2026-11-08 UTC — PR #259 integrada y sincronización de ramas dependientes

- PR #259 se fusionó por squash en main como `07b146a3f2b7830bbd328a585535084e57e43c4e`. La batería runtime-role PostgreSQL ahora usa `--no-file-parallelism` para evitar que suites paralelas eliminen triggers temporales mientras otras escriben en `audit_logs`.
- PR #257 volvió a base `main`; HEAD `2cecf9b6f462d80b38cdb58be09b21dd2f7f4d3b` tenía 12/12 check-runs SUCCESS y 10/13 workflows SUCCESS (CI, Security scan y migration runner pendientes, sin fallos) antes del refresh documental actual.
- PR #258 volvió a base `main` y sincronizó el merge de #259. HEAD antes del refresh de este journal `433a1fa1212f610cbb543597e620219bd91327a4`: 13/15 check-runs y 12/13 workflows SUCCESS; verify, Cloudflare Pages y CI pendientes, sin fallos. El implementation SHA anterior `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` ya había pasado 15/15 checks, 13/13 workflows, 141 unitarias, 85 runtime-role tests y 15 checkout PostgreSQL tests.
- No Neon main, datos reales, secretos, despliegues manuales, DNS ni billing modificados. Producción NOT READY.
---

# 2026-11-08 UTC — recuperación checkout y estabilización de CI

- #233 se auditó como fuente histórica: 408 commits ahead / 18 behind, base en una PR cerrada; no se fusiona.
- #258 recuperó handler, unit tests, PostgreSQL integration tests y registro de ruta sobre main, reutilizando migration 0015 canónica y añadiendo 0017 para BCV weekday/weekend. SHA de implementación `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb`: 15/15 check-runs, 13/13 workflows, 141/141 unit tests y 15/15 checkout PostgreSQL integration SUCCESS. HEAD actual posterior a seguimiento documental/CI: `9d5ca9298b80038925ee94ed3deb2ce28dd08bb8`, requiere revalidación exact-SHA.
- La primera ejecución de #258 falló porque el workflow pasó literalmente `${RUNTIME_DATABASE_URL}`/ `${ADMIN_DATABASE_URL}`; el guard de tests rechazó correctamente los valores no válidos. Se corrigió el comando para expandir variables de entorno reales. La siguiente ejecución pasó.
- #257 HEAD `a8f7e0385ad7bb65a771e29e576bef8a2905eba9` falló solo en la batería runtime-role: `catalog-write.integration.test.ts` no pudo eliminar su trigger temporal por `XX000: tuple concurrently updated`, mientras otras suites escribían en `audit_logs`.
- Se abrió #259 para ejecutar secuencialmente los archivos de integración runtime-role mediante `--no-file-parallelism`; HEAD `98f4a8d662d07400f59bd3e8115f6da5856a4bfe`, checks pendientes.
- #251 y #255 conservan 15/15 check-runs + 13/13 workflows SUCCESS en sus HEADs exactos, siguen Draft y sin review formal.
- Ningún cambio en Neon, secretos, Cloudflare manual, DNS, billing, despliegue productivo o datos reales.
- Gaps de checkout: #255 debe proveer filas BCV; pago mono-moneda/no parcial/no sobrepago requiere confirmación explícita; SQL aún no valida fórmula por línea ni asignación por pago; runtime conserva escritura directa de balances; no hay UI; feriados weekday no soportados.
- Producción NOT READY.
---

# 2026-11-07 UTC — cierre de verificación post-merge #256

- El merge SHA `a38463ea00415c7601d716132e70a29e381a2e34` quedó verificado: los 10 check-runs de commit y 8 workflows push terminaron SUCCESS.
- Cloudflare Pages y Workers Builds reportaron SUCCESS para el merge. El cambio integrado solo afecta el script sintético de backup/restore; no hubo modificación manual de Cloudflare ni datos reales.
- La PR #253 se actualiza para reflejar este estado y el HEAD final #255 `c45c8ec050ddf96381968535cb6bddfd24ac1feb`.

---

# 2026-11-07 UTC — merge seguro del fixture backup/restore

- PR #256 `fix/backup-restore-no-discount-20261107` se fusionó por squash en main: `a38463ea00415c7601d716132e70a29e381a2e34`.
- Diff: una línea; el fixture sintético de `scripts/test_backup_restore.sh` deja de insertar la columna retirada `discount_usd`. Es compatible con el baseline de prueba (donde el campo tenía default 0) y con el esquema actual posterior a migration 0014 (donde ya no existe).
- Exact HEAD pre-merge `2d08b556529a67735d3070bd467892bc0a743164`: 10 workflows pull_request + 2 push scans SUCCESS, incluido el workflow Synthetic encrypted backup and restore. No reviews/threads; cambio aislado y reversible.
- El merge no modificó migraciones, código de aplicación, secretos, Neon, Cloudflare manual, DNS, billing ni datos reales. Los check-runs post-merge en el nuevo main estaban queued/in-progress al registrar esta entrada; verificar su conclusión antes de cerrar el ciclo.

---

# 2026-11-07 UTC — final exact-HEAD validation and dependency correction

- Main remains `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4`; live open PR count is 21 after reopening #227 as a temporary dependency anchor for #228–#233.
- #255 HEAD `c45c8ec050ddf96381968535cb6bddfd24ac1feb`, base #251 at `7c6df0016834e2e6f2ca4b4d062c94995e756662`: 10/10 pull_request workflows and 3/3 push runs completed SUCCESS. CI log confirms the two BCV PostgreSQL integration tests passed with admin and disposable `microapp_runtime` logins. Cloudflare Pages/Workers produced branch previews only; no production deployment or manual Cloudflare changes. Combined classic status contexts are empty; check-runs include all required contexts and are green.
- #255 has no formal reviews or inline threads and remains Draft. Independent review and production gates are outstanding.
- #251 HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662`: 11/11 pull_request workflows and 2/2 push security scans SUCCESS. It remains Draft because Neon main lacks `auth_bootstrap_attempts` and the dedicated runtime role/grants. Main advanced by three commits after the PR's recorded base; compare shows 22 ahead/3 behind and mergeable true.
- #227 was reopened solely as a temporary dependency/provenance anchor because #228–#233 still target its branch family. Do not merge the obsolete stack; close it only after downstream PRs are rebuilt or explicitly retired. #250 is closed as superseded by #255; #254 is closed as duplicate. All BCV code and the tomorrow-first/today-second fix are in #255; migration 0013 is byte-identical to main.
- No Neon writes, production data changes, secret changes, manual Cloudflare changes, DNS, billing, or production deployments were made. Production remains NOT READY.

---

# 2026-11-07 UTC — checkout stack audit against current canonical main

- #229 money engine, #230 CatalogPanel and #231 ProductForm are present in main in equal or stronger form. #228 migration 0014 and assertions are byte-identical to canonical main migration 0014; main catalog-write handler/tests are stronger. The backup restore fixture's no-discount INSERT is a small unique alignment, tracked separately in PR #256.
- #232's SALES_CHECKOUT_MODEL document was missing from main and is now recovered/updated in PR #253. It corrects stale claims: migration 0015 already adds branch/shift/warehouse/request-hash/settlement context, lifecycle guards, deferred sale reconciliation, single-currency exact-payment constraints, BCV check, own-shift lock and ledger/audit checks.
- #233's migration 0015 is older/weaker than canonical main migration 0015; do not port it. Its sales-checkout handler/tests are unique and require careful port to #255.
- Critical incompatibility: main migration 0015's `assert_completed_sale_reconciled()` requires BCV effective_date = today's Caracas date. PR #255's API correctly uses next-business-day rate on weekends. Before checkout can work on weekends, add migration 0017 to update the deferred SQL trigger to the same weekday/weekend selection, without skipping a stale nearest future row. Keep weekday bank holidays fail-closed until a calendar exists.
- Migration 0015 already enforces one settlement currency and exact full payment. The original design doc did not record explicit functional approval; confirm before activating checkout. Review per-line VES/USD formula and per-payment USD-equivalent allocation for DB-level integrity.
- PR #227 was reopened as a temporary dependency/provenance anchor for #228–#233, which still target its branch family; #250 and #254 are closed, with the #250 regression preserved in #255. Do not merge the old stack wholesale.

---

# 2026-11-07 UTC — BCV weekend correctness and recovered stack #255

- PR #255 created from the current #251 recovery branch; PR #254 closed as a duplicate after all its code/docs were copied to the refreshed branch. PR #255 remains Draft; latest HEAD `c45c8ec050ddf96381968535cb6bddfd24ac1feb`; 10/10 pull_request workflows and 3/3 push runs SUCCESS, including BCV PostgreSQL admin/runtime tests. No formal reviews/threads; Draft pending independent review.
- PR #251 refreshed its workflow filters so PRs stacked on `fix/**` receive the full required pull_request checks. Its exact HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662` now has 11/11 PR workflows and 2/2 push security scans successful. It remains Draft due Neon schema/runtime gate.
- BCV parser now accepts full Spanish effective dates with optional "de" and weekday comma, limits source HTML to 2 MB while streaming, and allows future effective dates up to 7 days for weekends/long weekends.
- A review of BCV effective-date practice found Saturday/Sunday operations use the next business day's effective rate (Friday publication commonly carries Monday's date). Latest selection now uses today's date on weekdays and the nearest future effective date on weekends; it does not skip a stale nearest future row. Weekday bank holidays remain fail-closed pending an authoritative calendar.
- #255 adds PostgreSQL integration of persistence and latest/history API through the actual runtime login in the runtime-role CI job; admin login is used only for fixture cleanup. Unit/UI/ODD tests are in the PR.
- No Neon production reads/writes, secret changes, Cloudflare production changes, deployments, DNS, billing or real-data operations were performed.

---

# 2026-11-07 UTC — cierre de stack supersedido y reconciliación de Neon

- Main pasó a `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4` tras fusionar #252; #249 ya estaba fusionada. #252 agregó la regresión de bootstrap oversized sin Content-Length y su documentación; 10/10 workflows PR success. El job CI necesitó un reintento por una colisión DDL transitoria en `catalog-write.integration.test.ts`; el reintento exacto pasó 32/32 pasos, incluidos auth integration admin/runtime.
- Se cerraron #218–#226 como supersedidas, con comentarios por PR y evidencia. #218 authz/handoff ya está en main; cleanup >48 h preservado en #251. #220 bounded-body helper ya está en main; la regresión route-level se fusionó en #252. #221 authorization policy está en main con no-discounts. #222 role contract actualizado en main. #223 migration 0011/helper/tests idénticos a main. #224 migration 0012/assertions idénticos y CI main más reciente. #225 atomicity script idéntico y migration-check main lo ejecuta. #226 runner es subconjunto estricto de main.
- GitHub reportó 19 PR abiertas después de cierres. #251 permanece Draft, HEAD `2a0c685a2348af87f76417b4f3ac0f77a70cbb5d`, 10/10 PR workflows y 2 push scans success. No mergear hasta resolver Neon schema/runtime gate.
- #227/#250 permanecen abiertas como snapshots BCV; #250 exact SHA `081ec1026f4bda889a633bb3fcbe420433e13336` incluye y pasó integración PostgreSQL real para insertar mañana antes que hoy, seleccionar hoy en America/Caracas e idempotencia. No fusionar old base.
- Neon project `restless-fire-99110035`, rehearsal `br-curly-poetry-b7dxsddm` parent `br-summer-math-b7297a60`: ambos schemas 133 columns, 204 constraints (98 other +106 NOT NULL), 46 indexes, 17 relations, 15 tables. Rehearsal roles: direct login migrator works (public USAGE/CREATE); runtime login works (public USAGE, no CREATE, no table grants). Existing 15 tables, 46 indexes and 2 sequences owned by migrator. No `schema_migrations`, `auth_bootstrap_attempts`, warehouses or inventory count tables. Main has only `neondb_owner` and `backup_readonly`; unchanged.
- All Neon queries in this checkpoint were SELECT-only. No baseline apply, migration 0003–0016, data write, secret change or Cloudflare production operation.
- The repo has no Neon rehearsal secret and no release workflow that invokes `adopt-baseline.sh`/`migrate.sh`. Next safe path requires a protected workflow/environment plus explicitly authorized rehearsal credentials; never paste migrations one-by-one through SQL.

---

# 2026-11-07 UTC — PR #251: port de limpieza de retención auth

- Se portó desde #218 la única función útil de retención al código canónico de main en PR #251 (`fix/auth-retention-cleanup-20261107`), HEAD `4a0662346c2a1f95bcf09d815df55755f53686cd`.
- Cron horario (`17 * * * *`) invoca cleanup solo cuando `APP_ENV === production`; preview no conecta a DB. Borra `auth_rate_limits` inactivos y `auth_bootstrap_attempts` expirados hace más de 48 horas.
- La prueba PostgreSQL verifica eliminación de filas antiguas y conservación de recientes. El job CI corrió la suite con admin y con login real `microapp_runtime`; 10/10 PR workflows SUCCESS en HEAD exacto. Las assertions de migration 0012 ahora comprueban grants DELETE mínimos ya existentes.
- PR #251 permanece Draft/no merge: Neon main, según lectura previa vigente, no contiene `auth_bootstrap_attempts` ni los roles dedicados `microapp_runtime`/`microapp_migrator`. No activar el Cron en producción hasta que el esquema y runtime role estén reconciliados y verificados por el gate de Neon. No se conectó ni escribió en Neon.
- #218 permanece abierta para auditar sus restantes cambios de autorización; no fusionar la rama obsoleta.

---

# 2026-11-07 UTC — procedencia de migraciones de inventario/security

- #205: idempotency_key/request_hash, constraint, índice parcial, handler y los 21 nombres de pruebas de la rama están presentes en main; main tiene 24 pruebas de conteos.
- #207: SQL append-only audit blob idéntico a main 0008; assertion solo cambia comentario de filename.
- #208: SQL own-shift roles idéntico a main 0007.
- #209: SQL count-ledger validation idéntico a main 0009; assertion solo cambia comentario de filename.
- #210: SQL balance↔ledger coupling idéntico a main 0010; assertion solo cambia comentario de filename.
- Revisar todavía tests/workflows/docs y dependencias downstream antes de cerrar estas PR como supersedidas. No cerrar por título ni solo por migración idéntica.

---

# 2026-11-07 UTC — delta único de limpieza de auth en #218

- Main ya tiene el handoff OAuth #215 vía #240 y el rate limiter canónico #213. No reintroducir la copia antigua de #214/#215, la migración duplicada 0010 ni `AUTH_RATE_LIMIT_HMAC_KEY`.
- Se identificó un comportamiento único en #218: cleanup programado cada hora que elimina `auth_rate_limits` y `auth_bootstrap_attempts` con retención de 48 h. Main solo poda oportunísticamente rate-limit rows de más de 7 días y no limpia handoff rows expiradas.
- Preservar ese cleanup en un port pequeño sobre el módulo canónico `consumeAuthRateLimit`, con skip de previews, verificación de permisos DELETE del runtime y pruebas PostgreSQL. No cerrar #218 hasta preservar o demostrar que ese comportamiento se ha portado.

---

# 2026-11-07 UTC — corrección de procedencia del handoff OAuth

- Corrección a la anotación anterior: el handoff OAuth server-side de PR #215 ya está integrado en main vía #240. El blob de `apps/api/migrations/0005_auth_bootstrap_attempts.sql` en main es idéntico al antiguo `0010_auth_bootstrap_attempts.sql` de #215/#218; el `google-auth.ts` de main conserva opaque handle, hash de estado y consumo atómico.
- Main usa además el rate limiter canónico de #213 (`consumeAuthRateLimit`) y `readBodyWithinLimit`. El branch #218 conserva la versión obsoleta de #214 (`enforceAuthRateLimit`) y un google-auth anterior. No portar el handoff/migración duplicados; auditar solo deltas de autorización que no estén ya en main.
- #214 está supersedida por #213; #215 cerrada sin merge pero su handoff no se perdió: está en main. #218 permanece Draft como fuente para revisión, no como implementación lista para merge.

---

# 2026-11-07 UTC — corrección de disposición de #204 y estado de main

- Verificación adicional en main `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`: existen `inventory-counts.ts`, `inventory-locks.ts`, `catalog.ts`, `catalog-write.ts` e `inventory-read.ts`. La sección histórica del backlog que decía que faltaban inventory-counts/locks está supersedida.
- Main `inventory-counts.integration.test.ts` ya tiene fixture isolation más completa que PR #204: `beforeEach` crea warehouse y product por test; `seedInventoryBalanceFor` registra el movimiento correspondiente en el ledger. #204 probablemente está supersedida; cerrar solo después de comparar el diff completo y confirmar que no queda comportamiento único.
- PR #200 continúa divergida del main actual (37 ahead/14 behind; mergeable=false) y sus migraciones 0005–0010 chocan con la secuencia canónica 0005–0016. No importar ni rebasar la rama completa.
- PR #250 sigue validada en SHA `081ec1026f4bda889a633bb3fcbe420433e13336` con 6/6 workflows exactos; el fix BCV y su integración PostgreSQL están completos en la rama, pero no integrados.
- La recuperación debe comparar las PR #200/#204/#205/#207–#211 contra el código ya integrado por #244–#248 antes de portar o cerrar. Preservar solo cambios únicos comprobados.

---

# 2026-11-07 UTC — recuperación de PR apiladas y BCV

- GitHub main `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`; 27 PR abiertas en consulta directa.
- #250 HEAD `081ec1026f4bda889a633bb3fcbe420433e13336`: 6/6 workflows exact-HEAD success; PostgreSQL integration mañana→hoy, fecha America/Caracas e idempotencia. Sigue Draft, 9 ahead/0 behind #227, sin reviews/threads.
- #227 HEAD `83cf96b7fcb7b0e304f676d21ab721de61364a59`: 13/13 workflows success; Draft y apilada sobre #226.
- #200 HEAD `464ca08b9020fad128cc9c8a321568493d484517` diverge de main actual: 37 ahead/14 behind, mergeable=false. Main ya contiene migraciones 0005–0016 y #200 usa secuencia incompatible; reconstrucción selectiva requerida, no rebase/merge ciego.
- #204 HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` diverge del #200 actual 8 ahead/5 behind; solo un archivo solapado, `inventory-counts.integration.test.ts`. Preservar su fixture isolation sobre el archivo actualizado.
- #218 retargeteada desde base cerrada #215 a #211. #214 está supersedida por #213 merged; #215 contiene handoff único que se conserva en #218, pero el rate limiter duplicado debe portarse a la implementación canónica de #213 antes de integrar.
- Sin merges ni cambios en Neon main, datos reales, secretos, Cloudflare productivo, DNS o billing. Producción NOT READY.

## Siguiente bloque
1. Recuperar #200 sobre main actual, reconciliando migraciones 0005–0016.
2. Reaplicar aislamiento de fixtures de #204 y sincronizar descendientes en orden.
3. Portar handoff #215/#218 al rate limiter de #213.
4. Mantener #250 Draft hasta que la base esté reconstruida y los checks corran en el SHA final.

---

# 2026-11-07 UTC — verificación directa de rehearsal y auditoría de BCV

- GitHub: #248 merged fc332946a9128e92ce39a3eb1ef1ee7ebd261598; #244–#248 fusionadas; 25 PR abiertas al consultar GitHub.
- Neon project restless-fire-99110035: branch main br-summer-math-b7297a60 sigue sin ledger ni roles de aplicación; solo SELECT.
- Neon rehearsal br-curly-poetry-b7dxsddm: roles microapp_migrator y microapp_runtime conectan; 15 objetos son propiedad de migrator; no ledger; runner 0003–0016 aún no ejecutado. Runtime no tiene privilegios de tabla todavía. neondb_owner mantiene ADMIN OPTION con SET FALSE/INHERIT FALSE. No se hicieron escrituras desde esta auditoría.
- #227 source audit: se encontró que la condición WHERE NOT EXISTS (effective_date > incoming_date) bloquea insertar la tasa de hoy si una tasa futura ya existe. Requiere test mañana→hoy; #227 no es mergeable hacia main por su stack/base antigua aunque GitHub reporte mergeable true respecto a su base.
- Se actualizó docs/security/NEON_MIGRATION_APPLICATION_PLAN.md para distinguir Fase 1 parcial de Fase 2/3 no ejecutadas. Producción sigue NOT READY.

---

# 2026-11-07 UTC — Ensayo de adopción en rama Neon

- Se ensayó la adopción en una rama Neon (no en producción) y se corrigieron dos defectos del script que CI no podía ver (dueño no superusuario). Añadido escenario CI equivalente. Sin escrituras en la rama principal de Neon, secretos, Cloudflare, DNS ni billing.

---

# 2026-11-07 UTC — Modo de adopción de baseline

- Añadidos `adopt-baseline.sh`, `schema_fingerprint.sql` y la huella 0002; pruebas en `migration-runner.yml`. Huella de Neon `main` leída con `SELECT`: coincide con 0001+0002. Sin escrituras en Neon.

---

# 2026-11-06 UTC — Lectura de Neon y plan de adopción (propuesta)

- Se verificó en solo lectura que Neon está en 0001+0002 con 0 filas de negocio y PITR de 6 h, y que el código desplegado desde #244 ya excede el esquema. Se redactó `docs/security/NEON_MIGRATION_APPLICATION_PLAN.md`. Sin escrituras en Neon, roles, secretos, Cloudflare, DNS ni billing.

---

# 2026-11-06 UTC — PR #244 merged; inventory read/kardex recovery started

- PR #244 merged at `158ec68bd55825d6e8d5527d086023a13445a89c`. Post-merge commit checks 10/10 SUCCESS, including Cloudflare Pages and Workers Builds.
- Public unauthenticated production catalog request returned HTTP 401, not preview 503; no authenticated production smoke was performed.
- New branch `feat/inventory-read-ledger-20261106` adds tenant/branch/warehouse-scoped GET APIs for balances and append-only movement history, stable cursors, role-based cost redaction, and runtime-role integration coverage.
- Inventory transfer workflow remains unimplemented until persistent transfer/dispatch/receipt schema is designed. Do not simulate transit using unlinked movements.
- BCV future-date ordering bug and checkout remain pending. No Neon production writes or manual infrastructure changes.

---

# 2026-11-06 UTC — PR #244 validación completa y hardening adicional

- PR #244 HEAD `d3de5216fac446580e4afdd39376af503cc94b51`: 10/10 workflows SUCCESS. CI, PostgreSQL migration validation, migration runner, Playwright, Semgrep, Trivy, dependency review, secret scan, AutoSkills y progress dashboard.
- La CI ya no repite aserciones históricas tras la cadena completa; corre la aserción final 0015, mientras migration-check ejecuta cada assertion inmediatamente después de su migración.
- Se corrigió el runtime test harness: fixtures y limpieza usan conexión admin; rutas/helper calls usan el login runtime. Branch-context y cashier own-shift se ejercitan con runtime login real.
- Se endurecieron los GET de catálogo/almacenes/conteos con transacciones y locks de autorización; counts GET bloquea warehouse.
- Inventory count API rechaza JSON numbers para cantidad y unit cost: los decimales deben llegar como strings exactas.
- Se corrigió el texto del catálogo para no afirmar equivalencia VES cuando BCV no está disponible.
- Cloudflare Pages y Workers previews completaron correctamente. Smoke del Worker preview: /health 200; API de catálogo 503 por PREVIEW_API_DISABLED. Sin deploy de producción.
- PR #244 sigue Draft; no hay reviews formales ni threads. No se han cambiado Neon producción, roles/grants, datos, secretos, DNS, configuración manual Cloudflare ni billing.
- Producción NOT READY.

---

# 2026-11-06 UTC — PR #244 Draft abierta para recuperar API/UI de inventario y catálogo

- Se abrió PR #244: https://github.com/BTF14/Micro-app/pull/244, rama feat/recover-inventory-application-20261106, base main después de #243.
- Alcance: authorization/tenant/branch locking; catalog read/create/update; inventory count opening/physical create+confirm con Idempotency-Key obligatorio; shared BigInt money package; web catalog UI; bounded streaming body limits; Worker preview API isolation; admin/runtime PostgreSQL integration tests.
- La PR se mantiene Draft. Los workflows se ejecutan en HEAD exacto; cada commit posterior supersede las conclusiones anteriores. No marcar Ready ni mergear hasta que todos los checks y el diff completo pasen.
- BCV y checkout app handlers no se incluyen todavía. #227 tiene un bug de orden de fecha efectiva registrado; corregir antes de habilitar VES conversion.
- Sin escrituras en Neon producción ni cambios de roles/grants, secretos, DNS, Cloudflare manual, billing o datos reales.

---

# 2026-11-06 UTC — migraciones integradas; recuperación de API/UI en curso

- PR #242 se fusionó en 7a719d593248341aac86b1ded980d5bb9a6f94e8 y PR #243 en 38e1d61acc083b3c0b9b73edcb2bc7887ca56872.
- #243 integró la secuencia 0001–0015, assertions, migration runner fail-closed y validación PostgreSQL. El HEAD final 481f3b956c96c50b6f956541d1d675646fe66b51 pasó 10/10 workflows.
- Se confirmó la diferencia entre migración de inventario #200 y versión apilada #233: la versión #233 conserva balance-version/snapshot de #200 y añade idempotencia de conteos de #205. Esta versión quedó integrada en 0006.
- La rama feat/recover-inventory-application-20261106 recupera autorización centralizada, branch/tenant locking, catalog read/write, inventory counts con idempotency key obligatorio, BigInt money package, bounded streaming bodies, preview API isolation y UI de catálogo. Pendiente validación CI sobre SHA final.
- #227 recibió comentario con bug de orden de fecha BCV: tasa futura insertada primero puede bloquear tasa de hoy. Corregir antes de habilitar BCV.
- Sin escrituras en Neon producción ni cambios de roles/grants, secretos, DNS, Cloudflare manual, billing o datos reales. Producción NOT READY.

---

# 2026-11-05 UTC — autorización permanente de merge y carril rápido de integración

- El propietario confirmó que autoriza fusiones a `main` cuando la PR pase las verificaciones técnicas, de seguridad y gates requeridos, incluyendo el despliegue automático de Cloudflare Pages inherente al merge. No volver a solicitar confirmación genérica por PR.
- La autorización no se extiende a cambios manuales de Cloudflare, secretos/variables, DNS, billing, Neon `main`, migraciones remotas, escrituras/datos reales u otras operaciones sensibles.
- Se identificó fragmentación operativa por exceso de PR apiladas/Draft, solapamientos y reconstrucción repetida del contexto. Se establece máximo recomendado de dos frentes activos, raíz primero, PR única por objetivo, no duplicar ramas, verificación exacta de SHA, merge inmediato al cumplir gates y comprobación post-merge.
- Se crea la rama documental `docs/operating-model-fast-integration-20261105` desde `main` observado en `7b0f057b8c152515005feed40305143c0ebb94b0`. Cambios propuestos: AGENTS, política transversal, handoff y estado vivo. La política solo será efectiva en `main` tras merge.
- Sin cambios en producción, Cloudflare, Neon, secretos o datos reales.

---

# 2026-11-04 UTC — Adopción documental de ODD y evaluación de ECC / tester-army/e2e

- El propietario autorizó una revisión y reorganización profesional del modelo de trabajo de agentes, solicitando investigar ODD de Gentleman Programming, ECC y tester-army/e2e.
- Se revisaron fuentes upstream: Gentle AI usage/trigger rules (ODD), ECC README y target GitHub Copilot, tester-army/e2e README (modelo/proveedor, telemetría y estado de desarrollo).
- Decisión: ODD pasa a ser el workflow predeterminado de Micro-app. Se añadió `docs/ODD_WORKFLOW.md`; `AGENTS.md`, Constitución y perfiles de agentes se alinearon. SDD deja de ser el flujo activo, pero `docs/sdd/` conserva contratos, modelos y decisiones de dominio vigentes.
- `docs/SDD_WORKFLOW.md` se convirtió en redirect histórico. La propuesta Spec Kit v1.3.0 se archivó; la CLI nunca fue instalada ni ejecutada.
- ECC se mantiene como candidato de adopción selectiva por skills/reglas, no como instalación completa ni hooks. tester-army/e2e se mantiene como posible piloto opcional, sin reemplazar Vitest, PostgreSQL integration o Playwright.
- Se creó `odd/tasks/agent-governance-odd-adoption.md` y se actualizaron los registros de recursos, evaluación Gentleman, estado y handoff.
- No se instalaron ni ejecutaron Gentle-AI, Engram, ECC, GGA, Ollama o tester-army/e2e. No se añadieron dependencias, hooks, MCPs ni telemetría.
- La PR #197 continúa abierta como Draft y sin merge. La PR #196, PR #190/#193 e issue #53 no se modificaron. No se tocó main, Neon producción, datos reales, secretos, Cloudflare configuración ni despliegues.
- La validación del HEAD final debe consultarse en GitHub; los checks del SHA inicial de PR #197 no validan estos commits posteriores.
- Los gates de seguridad, coste $0, datos reales y producción permanecen intactos. Esta entrada no declara Nivel 1 completo ni readiness de producción.

---

# 2026-10-30 UTC — PR #176 fusionada; CORS sigue bloqueado por red del entorno

- GitHub en vivo confirmó PR #175 y #176 fusionadas; PR #176 merge SHA y HEAD de `main` observado en la consulta: `287ba4e3b038b434bfec1fffec140bf2acc3f29a`. No había PR abiertas.
- PR #176 HEAD `d46871f1f23387aeb98a0b25f2bbed9bb155e249`: 12/12 check-runs success; seis archivos documentales (+73/-39); cero reviews formales y cero threads.
- En el SHA observado de `main`, nueve check-runs terminaron success (siete Actions y dos Cloudflare); los seis contextos requeridos por branch protection estaban success. No extrapolar a commits posteriores.
- Se releyeron los documentos obligatorios y se inspeccionó el diff de PR #176. Las portadas de continuidad aún presentaban #176 como pendiente; esta actualización corrige la discrepancia sin reescribir el historial.
- Se inspeccionó `apps/api/src/index.ts`, `apps/api/src/index.test.ts` y `apps/api/wrangler.toml`: la política CORS y pruebas simuladas existen, pero no prueban el Worker desplegado.
- Se intentaron los dos preflight curl exactos contra `/health` desde este sandbox. Ambos fallaron con exit 6 (`Could not resolve host`); no se obtuvo status ni headers. Esto es limitación de DNS/salida de red, no fallo demostrado de CORS ni del servicio. No se modificó configuración, código runtime, Cloudflare, secretos, datos, Neon, DNS, billing ni producción.
- #78 permanece abierta y CORS **NO VERIFICADO** hasta recibir status y headers HTTP reales desde un equipo con salida de red completa. #53 permanece abierta; matriz **NO APROBADA**.
- No se ejecutaron migraciones remotas ni despliegues de producción. Coste objetivo USD 0.

---

# 2026-10-30 UTC — PR #175 fusionada y continuidad posterior

- PR #175: https://github.com/BTF14/Micro-app/pull/175. Merge SHA `b8a2a9d514839bf9fa340b5b04349621b4484385`; HEAD de `main` verificado inmediatamente después del merge en el mismo SHA.
- HEAD exacto de PR: `eac60184748fdab3eae926860e0d6c901251a462`; 9/9 workflows asociados y 6/6 contextos obligatorios en success. Diff: siete archivos documentales, +142/-50. Reviews formales: 0; threads inline: 0; revisión manual del diff completo realizada.
- PR #175 corrigió la portada de los seis documentos de continuidad y eliminó de AGENTS una lista de prioridades duplicada/obsoleta. No modificó runtime, SQL, migraciones, workflows, secretos, datos o infraestructura.
- La revisión independiente Claude/Codex de PR #172 permanece pendiente/no ejecutada. #53 continúa abierta y la matriz sigue **NO APROBADA**. #78 continúa abierta y CORS no está verificado por preflight HTTP real.
- Se abre una PR de cierre de continuidad #176 en la rama `docs/post-pr175-final-handoff-20261030`; su estado y checks deben verificarse en vivo.
- No tratar el merge SHA de #175 como HEAD perpetuo; consultar la rama `main` en GitHub al reanudar.

---

> **Archivo histórico — registro append-only.** Las entradas anteriores se conservan sin reescritura; sus SHA y estados describen el momento de cada entrada. Para reanudar, consultar `docs/CURRENT_STATE.md` y GitHub en vivo.

# 2026-10-30 UTC — Reconciliación de continuidad tras PR #174

- Base de `main` verificada antes de esta tarea: `682868c5fca65a4a1f3f61a1bc428a34ae1a4dd9` (merge SHA de PR #174). Es una referencia histórica de base, no una promesa del HEAD posterior.
- PR #174: merge confirmado; cambio documental de seis archivos (+70/-0); los ocho workflows del HEAD de PR #174 terminaron en success.
- Hallazgo: los seis documentos de continuidad aún presentaban el SHA de PR #173 como HEAD vigente; `AGENTS.md` conservaba una lista de prioridades antigua. El problema era de portadas/estado activo, no una alteración de los registros históricos.
- Rama de corrección: `docs/authoritative-continuity-after-pr174-20261030`. Alcance previsto: alinear seis documentos de continuidad y sustituir la lista operativa obsoleta en AGENTS. Sin cambios de runtime, esquema, SQL, migraciones, workflows, secretos, datos o infraestructura.
- #53 continúa abierta; matriz de permisos **NO APROBADA**. #78 continúa abierta; CORS sigue sin evidencia de preflight HTTP real. Revisión independiente Claude/Codex de PR #172 sigue pendiente/no ejecutada.
- La PR de reconciliación y sus checks deben verificarse en vivo antes de declarar el trabajo completado. No inferir el merge SHA ni el HEAD posterior.

---

> **Archivo histórico — registro append-only.** Las entradas siguientes se conservan sin reescritura; sus SHA y estados describen el momento de cada entrada, no el estado operativo actual. Para reanudar, consultar `docs/CURRENT_STATE.md` y GitHub en vivo.

> **Archivo histórico — no usar como estado operativo.** Las entradas anteriores a este hito se conservan como registro append-only. Sus SHA y estados describen el momento de cada entrada; consultar GitHub para el estado actual.

> **CHECKPOINT VIGENTE — 2026-10-30 UTC; supersede snapshots anteriores:** main confirmado en GitHub: `ec6a2b84e2f84a0f5d2340ced86449804a1b6ed4`, merge de PR #173. PR #172 fusionada en `a7fa51d059d35fc679b53de112689a19f37fe967`; PR #173 fusionada en el HEAD actual. #173 solo añadió documentación (6 archivos, +12/-0), sin runtime/esquema/migraciones/workflows/infraestructura. La documentación anterior registraba #172, pero omitía el merge SHA de #173; este checkpoint corrige la omisión. Confirmar siempre main/PRs/issues/checks en vivo al reanudar.
>
> Issues #53 y #78 continúan abiertas. La matriz `docs/sdd/role-permission-decision-matrix.md` sigue **NO APROBADA**. #53 bloquea rutas comerciales hasta aprobación explícita de permisos y pruebas de aislamiento. #78: comentario [6526716084](https://github.com/BTF14/Micro-app/issues/78#issuecomment-6526716084) registra GET /health exitoso y carga de Pages, pero no se observaron headers HTTP ni se pudo emitir OPTIONS con Origin personalizado. CORS/preflight sigue **NO VERIFICADO**; no cerrar #78 hasta revisar preflight de origen autorizado y externo. No confundir GET/preview con CORS ni certificación de producción.
>
> No crear endpoints comerciales, middleware ni mapeos rol→operación antes de aprobación de matriz. Los helpers tenant/branch/shift resuelven contexto, no autorizan operaciones. No afirmar ledger/auditoría comercial implementados. Migraciones 0003/0004 no aplicadas a Neon main: no ejecutar SQL remoto. No cambiar Cloudflare, secretos, DNS, billing ni producción. Revisión independiente Codex/Claude de #172 no completada; no afirmar aprobación externa. Producción no lista para operación comercial.
>
> Próximo orden: (1) obtener status HTTP y headers Access-Control-* de ambos OPTIONS de #78 desde red completa, sin cookies/tokens; (2) evaluar y cerrar #78 solo con evidencia suficiente; (3) resolver explícitamente con el propietario la matriz #53; (4) consolidar catálogo de operaciones, scope, auditoría, idempotencia y pruebas negativas cross-tenant/cross-branch en PostgreSQL efímero; (5) solo después preparar implementación acotada. Próximo chat: leer AGENTS.md, los seis documentos de continuidad, matriz de permisos, OPERATION_AUTHORIZATION_ARCHITECTURE.md, ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md y MULTI_BRANCH_DATA_MODEL.md; verificar estado vivo de GitHub antes de actuar.
>
> Esta actualización es documental; no modifica código, esquema, migraciones, workflows, configuración, secretos, datos ni infraestructura.

---

> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

## 2026-10-30 UTC — toolchain Pages fijada y validada por PR #159

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Checkpoint continuidad — 2026-10-30 UTC (Node/pnpm corregidos en PR #159)

- **PR #158** (documentación Cloudflare/CI): https://github.com/BTF14/Micro-app/pull/158. Rama docs/workflow-deployment-audit-20261030; abierta, draft, no mergeada. HEAD conocido antes de este checkpoint: 162765fac25bf3aa623a41676d56e570afabd7fd; 12/12 checks success.
- **PR #159** (pinning de toolchain): https://github.com/BTF14/Micro-app/pull/159. Rama fix/cloudflare-node-pnpm-pinning-20261030; abierta, draft, no mergeada. HEAD 57de704c03fffebfd9aee2ae91c05a0e3af7515a; 13/13 checks success.
- PR #159 añade .node-version = 24.22.2, packageManager = pnpm@10.34.9 y alinea node-version-file/pnpm exactos en CI, Playwright, AutoSkills preview, Daily Dependency Watch y Regenerate Lockfile.
- Cloudflare Pages build log del SHA 57de704 confirmó Node 24.22.2 + pnpm 10.34.9, build exitoso, sin Unsupported Engine warning; preview https://70046713.micro-app-63i.pages.dev. No se fusionó ni se desplegó producción.
- Mantener PRs separadas: #158 solo docs; #159 solo toolchain/workflows. No fusionar ninguna sin autorización explícita porque push/merge a main activa despliegues externos.
- No cambiar Cloudflare settings, Neon main, secretos, DNS, billing, datos reales ni producción. Objetivo USD 0. Sin Codex.

---

## 2026-10-30 UTC — PR #158 HEAD 5b1b573 validado

# Checkpoint final — 2026-10-30 UTC (PR #158 HEAD 5b1b573)

- **PR #158:** abierta, draft, no fusionada; base main = 1ee1808af4aae484a71dc24750237ff4f4d934a0.
- **HEAD actual:** 5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766; cinco archivos de documentación, cinco commits, sin cambios de aplicación/workflows/migraciones.
- **Checks del SHA exacto:** 12/12 success (GitHub Actions y Cloudflare). Cloudflare Pages preview: https://d8477e48.micro-app-63i.pages.dev. Workers preview: https://2935f95a-micro-app-api.btfcasheb.workers.dev. Son previews, no producción.
- **Pages Settings:** main producción; root vacío; build corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build; output apps/web/dist; build system v3; cache off; monitoring *; preview público por defecto; sin dominio custom. Detalles completos en docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- **Preview isolation:** verificado en código main: API base vacía, llamadas API bloqueadas, login deshabilitado, CSP sin API en previews; _headers define CSP/seguridad para producción. Mantener pruebas de regresión.
- **Pendientes:** revisar build logs para versión efectiva Node/pnpm; evaluar pin pnpm, build cache y semántica “Fail open” sin cambiar ahora; verificar headers HTTP efectivos; revisar cuota Pages; confirmar required checks/branch protection (no confirmado).
- **Guardrails:** no merge/deploy sin permiso explícito; no tocar Cloudflare settings, Neon main, secretos, datos reales, billing ni DNS. Objetivo USD 0. No Codex.

---

## 2026-10-30 UTC — Pages Settings y aislamiento de previews verificados

## Checkpoint Pages Settings — 2026-10-30 UTC

- TinyFish accedió a Settings de Pages `micro-app`, solo lectura. Production branch `main`; root directory vacío; build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; output `apps/web/dist`; build system v3; cache off; monitoring routes `*`; automatic deploys on; no deploy hooks; build comments on; preview access public by default; no custom domains; vars names only: `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL`.
- Compatibility date `2026-10-17`; flags panel mostró True; Functions setting mostró `Fail open` (no interpretar/cambiar sin confirmar).
- Repo main confirma monorepo pnpm `apps/*`; root package requiere Node `>=24.22.2 <25` pero no fija `packageManager`. Pendiente verificar Node/pnpm efectivos en build logs; evaluar pinning en PR separada.
- Build command compila web vía `apps/web/package.json` script `tsc -b && vite build && node scripts/postbuild.mjs`; API se valida en workflows separados.
- `apps/web/public/_headers` existe: nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP. CSP prod permite API Worker. Postbuild quita Worker de CSP en preview; Vite deja API base vacía y activa preview flag; auth.ts bloquea API y App.tsx deshabilita login y muestra aviso. Preview público por defecto, pero aislamiento API está implementado en main auditada. Mantener tests de regresión.
- `_redirects` no existe en `apps/web/public/`; UI no mostró configuración de redirects/headers.
- Cache deshabilitado puede consumir más build time; medir antes de cambiar. Pages usage/billing no consultados.
- Sin cambios en configuración/infra/secretos/builds/producción. PR #158 sigue draft y no fusionada.

## 2026-10-30 UTC — Cloudflare Pages producción y previews verificados

- TinyFish inspeccionó Pages `micro-app` en modo solo lectura.
- Production branch = `main`; automatic deployments enabled on push to main.
- Latest production deployment observado active, commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, timestamp `2026-10-30T01:30:08.9457Z`, URL deployment `https://06553c7b.micro-app-63i.pages.dev`; primary project domain `https://micro-app-63i.pages.dev`.
- Cada commit en rama non-production crea preview. PR #158 commit `79be208` preview successful `https://945ae93c.micro-app-63i.pages.dev`; commit `d3f056b` preview `https://70fea194.micro-app-63i.pages.dev`.
- Vista mostró 15 deploys recientes (1 prod + 14 previews), 1.100 en historial; todos los 15 visibles successful. No se extrapola a todo el historial.
- Build command/output/root/framework, Functions, redirects, headers, environment y usage/quotas no fueron visibles porque Settings no cargó. No custom domain visible.
- Push a main puede desplegar producción; no mergear PR #158 sin autorización específica.
- Sin cambios de settings, builds manuales, DNS, secrets, billing o producción.

---

## 2026-10-30 UTC — auditoría Cloudflare en vivo y corrección CI/CD

- TinyFish confirmó acceso al panel Cloudflare con el perfil Default. Inspección estrictamente read-only.
- Plan Workers Free activo ($0/mes); cuotas observadas: 100.000 requests/día, 10 ms CPU/request, 3.000 build minutes/mes, 100 Workers y 5 Cron Triggers. Snapshot de panel: 183 requests, 0 errores, 106,68 build minutes últimas 24h; vista Worker también reportó 85 invocaciones y CPU P90 10 ms. No usar como benchmark ni capacidad garantizada.
- Worker `micro-app-api`: conectado a BTF14/Micro-app; main identificada como producción y ramas docs como preview. PR #158 obtuvo preview successful de Workers con URLs commit/branch preview separadas.
- Pages: proyecto `micro-app`, URL `https://micro-app-63i.pages.dev/`, repo conectado. PR #158 obtuvo Pages preview successful. Historial productivo y uso detallado Pages quedaron pendientes.
- Logs/Traces aparecían desactivados. No se cambiaron.
- **Corrección de auditoría:** relectura directa de los 15 YAML demostró que la afirmación anterior de siete workflows sin filtros era falsa. La duplicación general potencial se limita a `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro); CI, Playwright y Semgrep restringen push a main; migration-check y project-progress usan ramas explícitas; el resto usa filtros de paths/branch o disparadores manuales/programados. Detalle corregido en WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- No se modificó código, workflow, Cloudflare, DNS, tráfico, billing, Neon, secretos ni datos. No se ejecutaron workflows manuales ni deploys.
- PR #158 permanece abierta y draft; actualizar los cinco documentos de continuidad/auditoría en la misma rama, sin abrir otra PR ni fusionar.

---

## 2026-10-30 UTC — PR #157 fusionada y auditoría de workflows/deploy

- GitHub confirmó PR #157 cerrada/fusionada. Main quedó en `1ee1808af4aae484a71dc24750237ff4f4d934a0`; HEAD de PR `6eb464c950f195ec67350977575aef77e9790e1d`.
- El conector devolvió ocho workflow runs para el HEAD exacto y todos terminaron success. Combined status vacío y no se recuperaron runs post-merge para el merge SHA; no afirmar CI post-merge.
- La página de PRs abiertas no mostró PRs abiertas en la última consulta.
- Se inspeccionaron los 15 YAML de `.github/workflows`: siete ejecutan en push + pull_request sin filtros, con potencial duplicación en ramas que ya tienen PR. `sdd-docs-validation` limita ambos eventos a `main` y paths documentales. No se modificaron.
- No hay workflow de GitHub Actions que despliegue Pages/Workers. `apps/api/wrangler.toml` configura `workers.dev`, sin routes/custom_domain. Los builds Cloudflare observados en historial son compatibles con Git integration externa; no se pudo inspeccionar su dashboard.
- Se documentaron riesgos, límites y recomendaciones en `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`; el análisis distingue siete workflows sin filtros de `sdd-docs-validation`, que sí filtra `main` y paths.
- Se abrió [PR #158](https://github.com/BTF14/Micro-app/pull/158) en borrador para validar esta actualización; no se fusionó.
- Solo lectura: no se ejecutaron workflows manuales, no se modificaron código, workflows, secretos, Cloudflare, Neon, datos ni producción; no se desplegó.

---

## 2026-10-30 UTC — PR #156 fusionada y auditoría estática de API/esquema

- Se fusionó [PR #156](https://github.com/BTF14/Micro-app/pull/156) mediante squash. Merge SHA: `18961456ac535146c4a1687d3b07d8f6693ce141`; main protegido y firmado/verificado por GitHub.
- HEAD de PR: `6c068f3e9734736ac26e51ff754e39915d660abe`; 9/9 workflows en success: CI, Playwright E2E, migración DB, Semgrep, security scan, secret history, validación SDD/documentación, dashboard y Dependency Review. No hubo review formal ni threads; se aplicó revisión manual del diff completo porque Codex no está disponible. El conector no devolvió workflows ni statuses post-merge para el merge SHA; no afirmar CI post-merge.
- No se modificó código de aplicación, esquema, migraciones, workflows, secretos, Neon, datos reales ni producción en PR #156.
- Se revisaron estáticamente rutas registradas, tenant context, helpers DB y migraciones. API: health + auth; sin handlers comerciales. Tenant context comprueba sesión/membresía/organización activas, no autorización por operación ni branch scope.
- Hallazgos SQL: venta completada no exige reconciliación de líneas/pagos; stock y ledger no están ligados por constraint; referencia de movimientos polimórfica sin FK; pagos sin idempotency key propia; último owner no protegido; audit_logs no es append-only por DB; no modelo branch/warehouse/register/shift.
- Los hallazgos son brechas de diseño antes de habilitar rutas, no evidencia de explotación/corrupción. No se ejecutó SQL ni se accedió a Neon main.
- Se creó la rama documental `docs/post-pr156-audit-continuity-20261030` para mantener CURRENT_STATE, HANDOFF, SCHEMA_REVIEW y PROJECT_PLAN sincronizados; verificar PR/checks antes de considerar cerrada esa actualización.

---

## 2026-10-29 — PR #152 fusionada; mitigación P1 de bootstrap iniciada

- PR [#152](https://github.com/BTF14/Micro-app/pull/152) fusionada; merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`. Verificados 13 checks de su HEAD y nueve checks post-merge en éxito.
- Se identificó y trazó el transporte del secreto de bootstrap en query string hasta cookie HttpOnly. No hay evidencia de filtración activa.
- Rama `fix/bootstrap-token-post-body-20261029`: cambio propuesto a POST con cuerpo, Origin exacto, validación de campos y límites, token validado antes de redirigir, y pruebas de regresión. **Aún no fusionado ni declarado resuelto**.
- No se tocó Neon `main`, secretos ni producción; no se desplegó.

---

## 2026-10-29 — PR #151 fusionada y hallazgos iniciales de arquitectura multiempresa

- Se fusionó la PR [#151](https://github.com/BTF14/Micro-app/pull/151) mediante squash; merge commit `70984baf7f6ac5a442e6c2364aaf6d7d4ebbc7d4`. La PR documenta límites de Neon/Cloudflare y guardrails de capacidad. Los checks del SHA de cabeza terminaron en éxito antes de la fusión.
- La restauración técnica del backup remoto exacto se verificó en [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): checksum correcto, descifrado y restauración en PostgreSQL 18 efímero. No se usó Neon `main` ni producción.
- Límites pendientes del backup: integridad de datos comerciales poblados/conteos/relaciones, RPO/RTO, alerta de fallo y evidencia del coste total $0. La restauración técnica no demuestra esos aspectos.
- Revisión de código en `main` post-PR #151: `apps/api/src/index.ts` solo registra auth y `GET /health`; aún no hay handlers HTTP comerciales. `resolveTenantContext` comprueba sesión/membresía/organización, pero no autoriza por sí solo una operación.
- La migración inicial define entidades comerciales ligadas a organización, con algunas FK compuestas; no contiene una tabla de sucursales. Antes de crearla, definir catálogo/precios compartidos o por sucursal, inventario por ubicación, compras/proveedores y permisos organizacionales/sucursal.
- Hallazgo preliminar para revisar antes de habilitar bootstrap: `apps/api/src/google-auth.ts` acepta `bootstrap_token` en la query string de `/auth/google`. No se confirmó una filtración, pero la URL puede persistir en historial o registros; se documentó como riesgo de transporte del secreto, sin modificar código en esta PR.
- Snapshot Neon de solo lectura: plan `free_v3`, límite informado de 10 ramas y 3 ramas existentes (`main`, `micro-app-integrity-test`, `restore-test-20261028`), límite lógico 512 MiB por rama, autoscaling predeterminado 0.25 CU. No se eliminó la rama de restauración. Cloudflare no está verificado en vivo.
- Capacidad real de organizaciones/sucursales sigue **sin medir**; las cuotas documentadas no verifican la carga sostenible.
- Próximo trabajo: reconciliar estado/handoff/checklist/plan; continuar auditoría de solo lectura de constraints, consultas y matriz de permisos; proponer modelo de sucursales con pruebas sintéticas. No migrar Neon `main`, tocar secretos ni desplegar producción.

---

## 2026-10-29 — monitor diario de versiones y auditoría de dependencias (PR #137)

- Se añadió `.github/workflows/daily-dependency-watch.yml` en la rama `docs/market-dependency-audit-20261029`, dentro de la PR #137 ya existente, para evitar crear otra PR de seguimiento.
- El workflow está programado diariamente a las 08:15 UTC (04:15 Venezuela) y permite ejecución manual. Usa Node 24 y pnpm 10, instala con `pnpm install --frozen-lockfile`, informa de dependencias desactualizadas, consulta el último parche Node 24 LTS y ejecuta `pnpm audit --audit-level high`.
- Es de solo lectura (`contents: read`); no actualiza dependencias ni crea PRs. Los resultados se muestran en GitHub Actions; el audit high/critical falla la ejecución tras registrar su salida.
- Estado: código añadido; aún no verificado por checks de la PR ni por un run real del workflow. No afirmar que la monitorización diaria ya está operativa hasta fusionar y comprobar una ejecución.
- Se mantiene el guardrail de `undici@7.30.1` y la regla de no aceptar lockfiles incoherentes. Sin cambios a secretos, Neon, datos reales o producción.

---

## 2026-10-29 — auditoría de versiones estables y plan de migración segura

- El propietario pidió versiones actuales del mercado por motivos de seguridad y exigió documentar exhaustivamente la continuidad para los siguientes chats/IA. Confirmó autorización temporal para actuar con criterio y fusionar PRs cuando la evidencia lo justifique.
- Se consultó main y se confirmó que la PR #136 (merge SHA 59ad394d6dc5035b114db5379b2e1680d1e7969f) solo actualizó documentación. No cambió dependencias.
- Inventario en manifests/lockfile: Node >=24.22.1 <25; TypeScript 5.9.3; Hono 4.13.14; Workers types 5.20261026.1; Wrangler 4.152.0; React/react-dom 19.3.1; @types/react y @types/react-dom 19.3.0; Vite 7.3.7; plugin-react 5.2.0; jsdom 26.1.0; lockfile pnpm v9; override undici 7.30.1.
- Escaneo público del 2026-10-29 observó TypeScript 7.0.2, Vite 8.3.5, plugin-react 6.1.2, jsdom 30.1.3, Wrangler 4.154.0, React/react-dom 19.3.1, Hono 4.13.14, pnpm 12.16.1 y Node 24.22.2 LTS. Los índices de workers-types se mostraron inconsistentes; no afirmar última versión sin consulta directa al registry.
- PR #117 (TS7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) se cerraron sin merge. No afirmar que esas versiones se instalaron. La actualización debe incluir lockfile generado de verdad, revisión de peer dependencies/engines y CI completa.
- Guardrail crítico: no perder overrides: undici 7.30.1 en package.json y lockfile; el lockfile previo había resuelto undici 7.29.1 y provocado mismatch/finding alto.
- En esta auditoría no se modificaron paquetes, secretos, Neon, datos reales ni producción; no se ejecutó instalación local. Próximo paso: abrir/confirmar PR documental de esta nota; luego migración técnica en rama separada, una PR coherente y sin dispersar intentos.
- Fuentes del mercado: https://nodejs.org/en/blog/release ; https://www.npmjs.com/package/typescript ; https://www.npmjs.com/package/vite ; https://www.npmjs.com/package/@vitejs/plugin-react ; https://www.npmjs.com/package/jsdom ; https://www.npmjs.com/package/wrangler ; https://www.npmjs.com/package/hono ; https://www.npmjs.com/package/react ; https://www.npmjs.com/package/pnpm ; https://www.npmjs.com/package/@cloudflare/workers-types .

## 2026-10-29 — verificación post-merge final de PR #132

- Reconsultados los checks del commit `9f73f8ab0c1581145796f09a41f689fa4bdcf310`: `verify`, Chromium, migraciones PostgreSQL, análisis estático, Trivy, scan de historial de secretos, Cloudflare Pages y Workers terminaron todos en `success`.
- Se comprobó que el override de `undici` se mantiene coherente: `package.json` declara `7.30.1`; `pnpm-lock.yaml` contiene el bloque `overrides`, `undici@7.30.1` y no contiene `undici@7.29.1`.
- La prueba integral de restauración con datos sintéticos poblados sigue pendiente para la última fase. No se tocó Neon `main`, secretos, datos reales ni producción; no se hizo despliegue manual.

---

## 2026-10-29 — PR #116 fusionada tras corregir el override de Undici

- Se comprobó que los HEAD iniciales de PR #116–#120 eliminaban el bloque `overrides: undici: 7.30.1` del lockfile pese a mantener el override en `package.json`. Logs de `verify`/Chromium: `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; Dependency Review detectó `undici@7.29.1` con hallazgos de severidad alta.
- Se pidió rebase a Dependabot. La PR #116 se actualizó para preservar el override y se fusionó en `main` con SHA `fb49c32aa1451c4bf763a0b78ba12b507700f10d`; HEAD final de PR `5d3f2e373e75caf71af207cba61df3066b140a86`. Todos los checks de ese HEAD quedaron en `success`, incluidos Dependency Review, verify, Chromium, migraciones, static analysis, Trivy, scan de historial de secretos y Cloudflare Pages/Workers.
- Comprobación de lockfile en `main` tras el merge: `package.json` contiene `undici: 7.30.1`; `pnpm-lock.yaml` conserva `overrides: undici: 7.30.1`, incluye `undici@7.30.1` y no contiene `undici@7.29.1`.
- PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) aparecen cerradas sin fusionar. No considerar esos upgrades aplicados; reabrirlos solo después de revisar compatibilidad, diff y checks.
- En la primera consulta post-merge al SHA `fb49c32aa1451c4bf763a0b78ba12b507700f10d`, verify, Chromium, migraciones, Trivy, historial de secretos y Workers estaban en verde; static analysis y Cloudflare Pages aún estaban en curso. Pendiente reconsultar su conclusión final.
- No se tocaron Neon, secretos, datos reales ni producción. No hubo despliegue manual.

---

## 2026-10-29 — visibilidad de fallos de backup y evidencia viva

- Revisión en vivo de la ejecución programada de backup: run [40698423050](https://github.com/BTF14/Micro-app/actions/runs/40698423050), iniciado el 2026-10-28T13:39:19Z y concluido `success`. El repositorio privado de backups contiene dos copias cifradas, con checksums emparejados: `backup-2026-10-27T21-32-45Z.dump.age` y `backup-2026-10-28T13-39-39Z.dump.age`. No afirmar que se ejecutó el backup del día 29; en el momento de la consulta aún no había una ejecución programada más reciente.
- Se detectó que la sección 3 de `docs/BACKUP_AND_RECOVERY.md` seguía describiendo el backup diario como una implementación futura, aunque el workflow permanente ya existe. Se corrige esa contradicción.
- Se añade al workflow permanente un resumen visible en GitHub Actions cuando un paso falla, con enlace al run y recordatorio de preservar copias anteriores. No crea un issue público ni pretende ser una notificación externa; queda pendiente confirmar si las notificaciones nativas de GitHub bastan operativamente.
- No se leyó ni descargó contenido de backup, no se accedió a datos de negocio, no se modificó Neon, secretos ni producción. La restauración sintética poblada continúa para la última fase.
- Esta actualización aún no está fusionada; verificar todos los checks del HEAD exacto de la PR antes de recomendar fusión.

---

## 2026-10-29 — política de retención de backups confirmada para continuidad

- Política vigente: backup cifrado diario con retención de 15 días en el repositorio privado de backups.
- PR #129 corrigió el cálculo de antigüedad: se valida el timestamp UTC del nombre del backup, no el `mtime` del checkout, y se elimina el checksum emparejado de los archivos vencidos. Los tests de retención están en CI y los checks del HEAD de la PR pasaron.
- Instrucción obligatoria para futuras IA/chats: no borrar las copias recientes al crear una nueva; eliminar solo las que superen 15 días. Si falla la nueva ejecución o no se valida, conservar la última copia válida y verificar una alerta visible. No cambiar el plazo sin análisis de riesgo, coste $0 y revisión.
- La retención no prueba la restauración. Mantener pendientes la prueba aislada con datos sintéticos relacionados, comparación del manifiesto, RPO/RTO y alerta. La restauración se deja para la última fase.
- No se cambió código ni workflow en esta actualización documental; no se tocó Neon `main`, datos reales, secretos ni producción.

---

## 2026-10-29 — continuidad después de PR #127 y limpieza de credenciales

- HEAD verificado de `main`: `1fc95ee1a574d435523fc746a10537f1c95c5262`; PR #127 fusionada y workflow temporal retirado.
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY`. `RESTORE_TEST_DB_URL` sigue pendiente de eliminación/confirmación; no almacenar ni solicitar el valor.
- La rama Neon de prueba `restore-test-20261028` seguía presente en la última consulta. El intento de borrado vía herramienta fue bloqueado por controles de seguridad. No afirmar que está borrada ni eludir el bloqueo; si hace falta, guiar al propietario para borrarla manualmente verificando proyecto/branch ID y evitando Neon `main`.
- Restore run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) pasó las verificaciones técnicas; las tablas comerciales/auditoría de esa copia estaban vacías. Queda pendiente un ensayo aislado con datos sintéticos poblados, manifiesto de conteos/relaciones, RPO/RTO, alertas, retención y evidencia de coste $0.
- No se tocaron Neon `main`, datos reales, secretos productivos ni producción. No se hizo despliegue manual.
- Continuidad: inspeccionar primero el mecanismo permanente de backup; después proponer/ejecutar una única prueba segura y documentar resultados. No recrear el workflow temporal retirado ni duplicar PRs.

---

## 2026-10-29 — restauración técnica de backup verificada

- El workflow temporal [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) terminó en `success`; checksum/descifrado/restore correctos y cinco verificaciones en verde: 13 tablas, 186 constraints, 0 membresías huérfanas y tablas de sesión/rate-limit ausentes.
- La copia restaurada no tenía filas en tablas comerciales ni auditoría. Se registra como prueba técnica exitosa con validación de datos comerciales todavía parcial; no se afirma integridad de registros poblados ni comparación de conteos con origen.
- Siguiente paso: una PR única elimina el workflow temporal y actualiza documentación; después el propietario borra `RESTORE_TEST_AGE_KEY` y `RESTORE_TEST_DB_URL` y elimina la rama Neon desechable. No se tocó Neon `main` ni producción.

---

## 2026-10-28 — PR #110 fusionada y continuidad pos-merge

- PR #110 se fusionó por squash en `main` con SHA `33da237ad7592ac394cc266c6a96c4bd1d387e37`; HEAD de PR verificado `65eb5d1cb07199b896a5022d94e739343a7c971b`.
- En ese HEAD pasaron los seis checks obligatorios: `verify`, Chromium authentication smoke tests, `postgres-migration`, JavaScript/TypeScript static analysis, Trivy filesystem/configuration y scan de historial de secretos. También pasaron Dependency Review y el dashboard del proyecto.
- La PR #110 actualizó el handoff, estado, diario y `docs/BACKUP_AND_RECOVERY.md` para reflejar los resultados verificados.
- La PR #112 también alinea `docs/PRODUCTION_READINESS.md`: Google OAuth/allowlist/sesiones ya están implementados y probados, el backup cifrado/subida tiene evidencia real, pero la restauración y el aislamiento de futuras rutas comerciales permanecen sin completar. Codex no pudo completar la revisión por límite de uso; se revisó manualmente el diff documental. No hubo reviews registradas. GitHub aceptó el merge con los checks en verde.
- La PR #111 se fusionó previamente en `3512cac28d6f0752a3699db00843a20788d91376`; su CI pasó 14/14 tests de integración PostgreSQL de auth y 48/48 tests unitarios.
- Después del merge de #110, el último SHA visible de main fue `33da237ad7592ac394cc266c6a96c4bd1d387e37`. El conector no devolvió workflows post-merge para ese SHA; no afirmar una segunda corrida.
- No se verificó HTTP CORS productivo; backup restore sigue pendiente; Dependabot alerts no son legibles desde el conector.

---

## 2026-10-28 — PR #111 fusionada; cobertura de sesión ampliada

- PR #111 (`test/auth-session-tenant-coverage-20261028`) fue fusionada por squash en `main` con SHA `3512cac28d6f0752a3699db00843a20788d91376`; HEAD probado `233844be10bb102fdac34ad41776d4d14420b243`.
- En el HEAD probado pasaron CI, Chromium authentication smoke tests, postgres-migration, JavaScript/TypeScript static analysis, Trivy filesystem/configuration, scan de historial de secretos y Dependency Review. Los logs de CI confirman 14/14 pruebas PostgreSQL de auth y 48/48 tests unitarios; compilación y typecheck también pasaron.
- La primera ejecución de PR #111 falló porque la prueba intentó guardar `expires_at` anterior a `created_at`, violando `auth_sessions_check`. Se corrigió el fixture para que ambas fechas fueran pasadas, pero `expires_at > created_at`; la nueva ejecución pasó.
- Se verificó que PR #103 fue fusionada sin reviews/hilos registrados pese a un handoff anterior que pedía esperar revisión Claude/Codex. Se documenta como discrepancia de proceso, no como revisión completada.
- La rama `feat/neon-transaction-adapter` se comparó con main: 14 commits ahead, 124 behind; el archivo `database.ts` es idéntico, los tests de main son más completos y la rama usa dependencias/workflow obsoletos. No se fusionó ni borró.
- La prueba HTTP de CORS productivo no pudo repetirse desde este entorno; el acceso web a los endpoints falló. No se cambiaron variables, secretos, Neon ni producción.

---

## Corrección de continuidad — 2026-10-28

- La línea de inventario del checkpoint inmediatamente inferior (“no hay PR abiertas”) describe el instante anterior a abrir la PR #110; ya no describe el estado vivo. La única PR abierta identificada en el inventario reciente es #110, HEAD `c3acfdd79be7ea3b490651eeab3ccf01402309ef`.
- La PR #104 fusionó `docs/AI_COLLABORATION_AND_PR_POLICY.md`; la política ya no es una propuesta pendiente de merge.
- La PR #103 fue fusionada en `375226b50b82eb51b795089b813b6d7879c8bd0f`. El handoff anterior decía que debía permanecer abierta hasta revisión Claude/Codex; no se encontró evidencia de una review completada antes del merge en los registros consultados. No presentar ese merge como aprobación independiente. El pendiente de CORS ahora es verificar el comportamiento HTTP real del Worker, no volver a integrar el mismo diff.
- En la PR #110, Codex indicó que no pudo completar la revisión por límite de uso; el listado de reviews está vacío. Checks verdes no equivalen a esa revisión.
- La protección de `main` no pudo consultarse desde el conector (403), y la documentación contiene dos afirmaciones incompatibles sobre el número de aprobaciones requeridas. Resolver la discrepancia mediante evidencia autorizada; no saltarse el gate.
- El respaldo tiene una corrida de cifrado/subida exitosa, pero la restauración real sigue sin probarse. `docs/BACKUP_AND_RECOVERY.md` conserva un estado antiguo contradictorio; corregirlo tras verificar el procedimiento y evidencias de restauración.

---

## Verificación de continuidad — 2026-10-28 (estado vivo de GitHub)

- HEAD de `main`: `740afcd1ac122dc60fc98477273112ae831f0e46` (commit firmado: `security: move CI and Pages builds to patched Node.js 24 LTS`).
- PR abiertas: la consulta directa `GET /repos/BTF14/Micro-app/pulls?state=open&per_page=100` devolvió `[]`. No hay PR abiertas en esa consulta.
- PR #102 está fusionada en `b667dec03ff14d97b8fae571477ab69409e119b1`; PR #103 está fusionada en `375226b50b82eb51b795089b813b6d7879c8bd0f`. PR #105 está cerrada sin fusionar; su rama `chore/lockfile-regen-result` contiene cambios de runtime que ya aparecen en `main`, por lo que no debe reabrirse para volver a integrar código duplicado.
- En el SHA actual de `main`, los seis checks obligatorios de protección están en `success`: `verify`, `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history`, `Trivy filesystem and configuration scan` y `postgres-migration`. También terminaron en success los checks de Cloudflare Pages y Workers Builds.
- Dos estados de commit de Vercel (`Vercel – micro-app-7lg5` y `Vercel – micro-app`) están en `failure` con mensaje explícito `Deployment rate limited — retry in 24 hours`. No forman parte de los seis contextos obligatorios leídos en la protección de rama; son fallos de límite de despliegue de Vercel, no fallos de los checks obligatorios.
- `package.json` declara Node `>=24.22.1 <25`; `.node-version` fija `24.22.1`; CI y Playwright usan Node 24 y pnpm 10. El lockfile v9 fija `undici@7.30.1` por override, y Miniflare lo consume transitivamente. Las entradas del lockfile indican que undici requiere Node `>=20.18.1`, Vitest 5.0.5 acepta Node 24, y Wrangler 4.151.1 / Miniflare 5.20261012.1-beta declaran Node `>=22`. Playwright E2E usa el runner y la imagen de navegador ambos en `1.55.0`. Esto demuestra compatibilidad declarada en metadatos, no sustituye una instalación local reproducible.
- El check `Chromium authentication smoke tests` del SHA actual pasó; el test de integración PostgreSQL forma parte del workflow `verify`, que también pasó. En el flujo OAuth, las cuentas existentes sin `google_sub` son rechazadas como `identity_unlinked` antes de crear sesión; una identidad enlazada debe coincidir con el `sub` y tener usuario/membresía/organización activos. Solo el bootstrap de un solo uso puede crear el primer usuario y sesión. La prueba de integración comprueba que la cuenta heredada mantiene `google_sub = null`, no se crea cookie ni sesión persistida.
- La configuración CORS en código limita el origen al `FRONTEND_ORIGIN` canónico y falla cerrada si falta o es inválido; PR #103 añadió preflight autorizado y rechazo de origen externo. No se verificaron aquí las cabeceras HTTP del Worker productivo. Esa verificación no aparece entre los seis gates obligatorios, por lo que no es requisito automático de merge; sí sigue siendo evidencia operativa útil para confirmar el binding real en Cloudflare.
- **Limitación de evidencia:** el conector GitHub rechaza las rutas de Dependabot alerts/dependency graph/code scanning como endpoints no permitidos, así que el número actual de alertas abiertas no se pudo verificar. No afirmar que Dependabot está limpio basándose solo en el lockfile o en Trivy; el workflow Trivy actual declara `exit-code: '0'`, por lo que sus checks verdes no garantizan ausencia de vulnerabilidades.
- No se ejecutaron comandos localmente en este entorno. No se modificaron secretos, configuración de producción ni datos de Neon, y no se hizo despliegue manual. No se fusionó ninguna PR durante esta verificación.

---

## 2026-10-28 — Verificación HTTP de Preview y CI de PR #106

- PR #106, HEAD `1d47a474351bb14f9f5e14283beec789356bafe3`: checks consultados todos en success.
- Build/test local en sandbox con pnpm 10: suite web normal 6/6; build Preview correcto; test dedicado Preview 1/1; CSP y bundle del build Preview sin URL productiva; build de producción correcto y conserva URL productiva.
- HTTP real de Cloudflare Pages branch Preview: HTTP 200; `Content-Security-Policy` contiene `connect-src 'self'` y no permite el Worker productivo.
- PR #106 fue fusionada por squash el 2026-10-28 en `main` (commit `d5d99b3a5184d6aad36ffd9a44ff34a62346dc94`) tras autorización explícita. Cloudflare Pages y Workers Builds reportaron éxito; la API pública `/health` respondió `status: ok`. No se tocaron secretos, variables/bindings ni Neon.

---

## 2026-10-25 (noche) — Bug de variables autoborradas resuelto; logout móvil arreglado (PR #82)

- Tras fusionar PR #81, el login volvió a romperse (`GOOGLE_NOT_CONFIGURED`, fallos de CORS) pese a no haber tocado `apps/api`. Causa raíz identificada: `wrangler deploy` sincroniza las variables planas (no "Secreto") del Worker contra `[vars]` en `apps/api/wrangler.toml`; cualquier variable puesta solo a mano en el dashboard de Cloudflare y no declarada ahí se borra en el siguiente deploy, sin importar qué cambió. `FRONTEND_ORIGIN`, `GOOGLE_REDIRECT_URI` y `GOOGLE_CLIENT_ID` nunca estuvieron en el archivo.
- El usuario volvió a agregar las dos primeras a mano en el dashboard (confirmado por capturas) y proporcionó el valor del tercero (client ID, no es secreto). Se declararon los tres en `wrangler.toml` (PR #82, merge `f274d32a359dbba8e401897a41294fda1f33cbf8`) para que ningún deploy futuro los vuelva a borrar.
- En paralelo se encontró y confirmó por commit ya existente en el working tree (`a2b338f`, hecho en un tramo de esta misma sesión) un fix para que el botón de "Cerrar sesión" sea alcanzable en pantallas de teléfono (antes solo vivía en un panel lateral oculto por CSS debajo de 760px). Se completó la rama agregando el fix de `wrangler.toml`, se abrió/actualizó PR #82, se verificaron los 12 checks en el head final y se fusionó.
- Verificación visual confirmada por el usuario: el login funciona de extremo a extremo en su teléfono real, mostrando el panel de "Abasto 7 de Oro".
- Con esto, no queda ningún pendiente conocido de identidad/infraestructura. Detalle completo en el checkpoint vigente de `docs/CURRENT_STATE.md`.

---
## 2026-10-25 (tarde) — Primer login real completado; UI de login arreglada (PR #81)

- Se verificó contra Neon `main` que el bootstrap administrativo ya se consumió exitosamente: organización "Abasto 7 de Oro" (`abasto-7-de-oro`) y usuario owner `btfcasheb@gmail.com` existen, con `google_sub` vinculado y `auth_bootstrap.consumed_at` sellado. Detalle completo, IDs exactos y el patrón SQL para agregar más usuarios a `auth_allowlist` están en el checkpoint vigente de `docs/CURRENT_STATE.md`.
- Se diagnosticó por qué el primer intento de login pareció fallar silenciosamente: el frontend nunca leía `?auth_error=` de la redirección de `GET /auth/google/callback` y seguía mostrando el formulario de contraseña ya retirado en el backend (decisión D4). Se encontró un diff ya escrito localmente (no commiteado, de un trabajo previo de esta misma sesión antes de un corte de contexto) que resolvía exactamente esto; se revisó, se completó (el E2E de Playwright todavía probaba el formulario de contraseña eliminado, se reescribió), se abrió PR #81 y se fusionó tras verificar los 12 checks en el head exacto `117cb1c` (incluido el smoke test de Chromium).
- Merge commit `441bdc463954aba1069cfeae9227bf75a562a53a`. Cloudflare Pages se redeployó automáticamente.
- No se pudo correr `pnpm test`/`pnpm install` en este sandbox (DNS de `registry.npmjs.org` no resuelve pese a figurar en `no_proxy`); se verificó exclusivamente vía GitHub Actions en el SHA final, documentado explícitamente en el PR y en el checkpoint.
- Pendiente para la siguiente sesión: confirmación visual del usuario de que el panel autenticado carga correctamente; luego, iniciar el módulo real de negocio (inventario/productos/tasa BCV), ya que todo lo construido hasta ahora es solo identidad e infraestructura.

---
## 2026-10-20 — PR #71 y diagnóstico de API Vercel

- PR #71 (feat/tenant-context-resolver) sigue abierta/draft; head revisado a4806b69a2d12225234e7a8fc72c1116957d0318, base observada 832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e. Revalidar al retomar.
- Seis workflow runs identificados para ese head terminaron en failure: progress dashboard, migration validation, CI, Semgrep, Security scan y Playwright E2E. En reintentos revisados, jobs no tenían runner ni steps; logs devolvían 404 BlobNotFound. Causa de asignación de runner desconocida; no afirmar fallo del código.
- Smoke harness aislado de lógica del resolver: 3/3; TypeScript estricto contra interfaz mínima: pasó. No es la suite real del repo.
- Vercel API deployment dpl_HpAA28eKdVdWgsfMypeVuybsBhhz muestra ERR_MODULE_NOT_FOUND para apps/api/src/auth importado desde apps/api/src/index.js; proceso Node sale con código 1. Build de Vercel figura completado, por lo que el fallo observado es runtime. Causa exacta/corrección aún sin verificar.
- Usuario reporta 7 checks con error en UI; consulta de workflow runs recuperó seis. Identificar el séptimo en la siguiente sesión antes de actualizar el conteo.
- Se preparó checkpoint/handoff con evidencia, límites y secuencia. No se tocó Neon main, no se desplegó producción, no se manejaron secretos ni datos reales.
- Próximo: mantener PR #71 draft; revalidar checks/runner; reproducir y corregir runtime en rama/PR tras inspeccionar configuración/entrypoint y confirmar destino arquitectónico (Workers vs Vercel). Sin merge/deploy de producción.

---
## 2026-10-19 — Corrección de formato en checklist de preparación

- Se corrigió en `docs/PRODUCTION_READINESS.md` un `\\n` literal que unía visualmente el criterio ya verificado del bloqueo de registro con el siguiente criterio pendiente de Google sign-in.
- El cambio es solo documental: no altera el estado de los gates ni la preparación para producción.
- PR: https://github.com/BTF14/Micro-app/pull/61 — abierta, pendiente de checks; no fusionada.
- Verificación: releída la versión de la rama y confirmado que el separador es un salto de línea real y que el `\\n` literal ya no aparece en ese punto.
- Sin cambios en runtime, base de datos, secretos, datos reales, Neon ni despliegues.

## 2026-10-19 — Registro público bloqueado fail-closed (PR #57)

- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`; PR #57 fusionada.
- `POST /auth/register` valida Origin y luego devuelve `503 REGISTRATION_DISABLED` antes de leer el body, acceder a PostgreSQL, escribir rate limits/usuarios/organizaciones/membresías/sesiones o emitir cookie.
- La prueba PostgreSQL verifica ausencia de usuarios, organizaciones, membresías, sesiones y hashes de rate-limit en el camino bloqueado. Login/sesión existente se prueba con un usuario/organización sintéticos sembrados directamente en la base efímera.
- Checks de PR head `71d3e6d3ffe625b12807e9942ddd261e222cf093`: verify, Chromium auth smoke, PostgreSQL migration, JS/TS analysis, Trivy, Cloudflare Pages preview y generate-progress en success. Checks consultados en merge SHA también en success. No se ejecutaron pruebas locales.
- Issue #53 permanece abierto: Google sign-in + allowlist y D1–D8 no están implementados/aprobados. La medida es temporal y fail-closed.
- Revisión rama `feat/neon-transaction-adapter` vs main `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`: divergida 14 ahead / 76 behind; merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`. `database.ts` y security workflow son idénticos; test file más viejo, script `vitest run` no respeta exclusión de integración, documentos obsoletos. No merge.
- No se tocaron Neon main, secretos, datos reales, billing ni emails. No se afirma despliegue productivo.
- App sigue NO lista para producción; matriz de roles y flujos comerciales aún pendientes.

---

## 2026-10-19 — Checkpoint tras PR #55

- `main` verificado: `b7117f8aeb868e25c49db86a524405511cd3c9be`; PR #55 fusionada.
- PR #55: https://github.com/BTF14/Micro-app/pull/55, checkpoint documental después de PR #54.
- Head probado `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28`: 8 check-runs en success (Cloudflare Pages preview, Trivy dos ejecuciones, análisis estático JS/TS, verify, postgres-migration, Chromium authentication smoke tests y generate-progress).
- No se ejecutaron pruebas localmente; los checks citados son del head de PR, no verificación independiente del merge SHA. No se desplegó producción ni se modificó Neon `main`.
- No hay PR abiertas en la consulta actual.
- Issue P0 #53 sigue abierto. El registro público carece de política de identidad Google + allowlist demostrada; D1–D8 y matriz de roles siguen pendientes de decisión humana.
- Strix continúa documentado, no instalado ni ejecutado. Sin secretos, emails, billing, datos reales ni Cantina-pos.
- Próximo paso: continuar análisis seguro de auth y revisión de rama divergida; pedir al usuario decisiones concretas de identidad/roles cuando sean necesarias. La app no está lista para producción.

---



## 2026-10-19 — Verificación tras PR #31 y continuidad

- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56`.
- PR #30 y #31 están fusionadas. PR #31 añadió pruebas de integración para negar `/auth/me` y `/auth/login` cuando la organización está inactiva aunque la membresía siga activa.
- GitHub Actions para el SHA exacto de main: 6 de 8 check-runs visibles terminaron en success; 2 seguían in_progress al momento de la consulta. Verificar de nuevo el SHA y Actions antes de afirmar CI verde. Los enlaces y nombres están en el checkpoint superior de `docs/CURRENT_STATE.md` y `docs/HANDOFF_NEXT_CHAT.md`.
- PR #32 está abierta para revisión documental. No se ejecutaron tests localmente.
- Bloqueos siguen vigentes: handlers comerciales inexistentes, Google OAuth/allowlist y D1–D8 pendientes, matriz de roles sin aprobación, backups/restauración independiente sin verificar, app no lista para producción.
- No hubo cambios en Neon `main`, datos reales, secretos ni despliegues.
- Próximo paso: evitar PR de checkpoint repetidas salvo que la continuidad lo necesite; priorizar revisión de seguridad/código y pruebas aisladas que no dependan de inventar decisiones de identidad/roles. Preparar documentación de handoff antes de que se agote el contexto.
## 2026-10-18 — Revisión del adaptador Neon y reconciliación de política

- `main` revisado: `c782625364cacbe94ac6ef7ef2ea091e7d960eb3`; rama comparada: `feat/neon-transaction-adapter`.
- Comparación en vivo: rama divergida, 14 commits propios y 49 commits detrás de `main`; merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`.
- Los siete archivos del diff fueron revisados por contenido. `.github/workflows/security-scan.yml`, `apps/api/src/database.ts` y `apps/api/src/database.test.ts` son idénticos al contenido actual de `main`; no aportan código nuevo.
- `apps/api/package.json` en la rama cambia `test` a `vitest run`, que incluiría los tests de integración que requieren PostgreSQL; la configuración actual separa esos tests y CI ya los ejecuta explícitamente. No copiar el cambio sin reconciliar el entorno local/CI.
- `docs/API_INTEGRATION.md`, `docs/COMPLIANCE_REQUIREMENTS.md` y `docs/SECURITY_PLAN_2026.md` son versiones antiguas respecto de `main`; no sobrescribir los documentos actuales con ellas.
- Conclusión: no fusionar la rama completa; no se encontró implementación única que justifique resolver la divergencia de 49 commits. Mantenerla como referencia histórica hasta que aparezca un cambio concreto que pueda rescatarse por separado.
- Corrección documental: `docs/RESOURCE_REGISTRY.md` decía que Neon `main` era solo lectura, en contradicción con `AGENTS.md` y `docs/CONSTITUTION.md`. La política correcta es producción-sensible con gate de cambio, no prohibición permanente.
- Sin cambios a Neon, sin secretos, sin pruebas locales ni despliegue.

---

## 2026-10-18 — Checkpoint después de PR #27

- PR #27 fusionada: https://github.com/BTF14/Micro-app/pull/27
- Merge commit / `main`: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- El head de PR #27 `29f899a52346d342067cf8e1b22850d35aa48a69` y el merge commit de `main` fueron verificados en GitHub Actions; los checks consultados terminaron en `success`.
- Enlaces de los checks del merge commit: [Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812), [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No se ejecutaron pruebas locales, no se desplegó producción y no se modificó Neon `main`.
- Bloqueo técnico vigente: todavía no hay handlers HTTP de negocio; no añadirlos hasta definir y probar permisos por rol/organización. D1–D8 de identidad siguen pendientes. Strix solo está documentado.
- Próximo paso: revisar el adaptador Neon divergido y preparar una matriz de permisos operativa sin asumir decisiones de identidad.

---

# Diario persistente de estado, decisiones y verificaciones

Este diario es append-only en cuanto a historia: no borrar hitos antiguos; añadir una nueva entrada por sesión o checkpoint. El estado actual está en la parte superior del plan maestro y del handoff.

## 2026-10-18 — Revisión de continuidad y agentes

### Estado Git verificado
- Repositorio: https://github.com/BTF14/Micro-app
- Rama principal: `main`
- SHA observado: `8574bef7c5bc38cb85e55007816b6efc8b54a826`
- Últimos commits de documentación: `632ca1ed7600c888db3f38516debe85ac8053723` (plan) y `8574bef7c5bc38cb85e55007816b6efc8b54a826` (handoff).
- Ramas observadas: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/neon-transaction-adapter`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap`, `main`.
- Rama de adaptador: `feat/neon-transaction-adapter` en `7989a84e39536029819735a5202f3934a8eb12c3`; no fusionada automáticamente.

### GitHub Actions comprobadas
- CI: https://github.com/BTF14/Micro-app/actions/runs/39102311090 — success.
- Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39102311097 — success.
- Security scan: https://github.com/BTF14/Micro-app/actions/runs/39102311100 — success.
- Estos resultados corresponden al SHA de documentación indicado, no a un test manual local ni a una garantía de seguridad absoluta.

### Código/estado que se observó
- El commit `88d30d472905c81a90d9fffc967e3ba1df5084d1` conecta registro/login del frontend con la API.
- `pnpm-lock.yaml` existe en main y el workflow CI usa `--frozen-lockfile`.
- El workflow CI levanta PostgreSQL 18 efímero, aplica la migración, ejecuta build, unit tests y `src/auth.integration.test.ts`.
- El workflow de migración prueba la migración y constraints cross-tenant contra PostgreSQL desechable.
- Los documentos anteriores contenían contradicciones: `API_INTEGRATION.md` dice que el frontend no está conectado; revisar y corregir esa frase en un siguiente commit. La continuidad vieja también referenciaba un SHA anterior a los documentos.
- No hay evidencia en esta comprobación de que exista un sistema que lance subagentes autónomos en segundo plano. Se agregan perfiles de agentes reutilizables para entornos compatibles y un protocolo para no fingir ejecuciones.

### Decisiones y límites
- Mantener presupuesto $0, proyecto independiente de Cantina-pos y otros proyectos.
- No aplicar migraciones ni SQL mutante a Neon `main`; utilizar PostgreSQL efímero o una rama de prueba aislada.
- No desplegar producción ni hacer cambios irreversibles sin aceptación.
- No publicar secretos ni cadenas de conexión.
- No fusionar `feat/neon-transaction-adapter` sin revisar diff, sincronización y pruebas.

### Próximos pasos ordenados
1. Revisar y actualizar la frase obsoleta en `docs/API_INTEGRATION.md` y reconciliar todos los documentos que afirman que el frontend no está conectado.
2. Comparar `feat/neon-transaction-adapter` con el SHA actual de main, revisar archivos/diff y separar cambios rescatables de cambios incompatibles; preparar PR solo después de CI y revisión.
3. Revisar las pruebas de autenticación actuales para cobertura de allowlist, roles, aislamiento tenant, revocación, fallos de DB y rate limits; no confundir test existente con cobertura completa.
4. Seguir con pruebas de transacciones PostgreSQL e inventario/idempotencia, sin Neon main.
5. Actualizar este diario, plan y handoff después de cada checkpoint y comprobar Actions por SHA exacto.


## 2026-10-18 — Corrección del snapshot de CI
- Último SHA consultado antes de esta actualización: `995608af8584442a9f174f9cf55ed7861749b872`.
- Ejecuciones para ese SHA: CI `39102649341` pending, migración `39102649354` pending, seguridad `39102649347` queued.
- El SHA anterior `8574bef7c5bc38cb85e55007816b6efc8b54a826` tenía los tres workflows en success.
- Este commit cambia solo documentación; comprobar las ejecuciones del nuevo HEAD antes de informar de estado final.


## 2026-10-18 — Revisión separada de identidad/seguridad
- Código revisado: `apps/api/src/auth.ts` (blob `0735dbad34bd5c932852882da0bff6eebbab337a`) y `apps/api/src/auth.integration.test.ts` (blob `263ac57a536d5c136beab0baadadb2d6c64aadb5`).
- Endpoints hallados: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- En el archivo de auth no se encontraron referencias a Google OAuth, allowlist ni verificación de email. El test de integración contiene un caso principal de registro/login/consulta/revocación; no acredita toda la matriz de permisos.
- Hallazgo P0: reconciliar el código de auth con el requisito de Google + allowlist previamente acordado. Mantener la regla de que solo el usuario autoriza el envío de correos. No implementar un proveedor ni modificar el modelo de identidad por suposición.
- Esta revisión de archivos no es una prueba ejecutada; esperar CI de Actions para el SHA vigente y ampliar pruebas antes de cerrar el hallazgo.


## 2026-10-18 — Continuidad, evaluación Gentleman-Programming y estado Actions

- HEAD de `main` verificado: `12c0037f3928b2c54c3593d3f48a65bf3318f401`.
- Actions en ese SHA: CI run 39102740451 = success; Database migration validation run 39102740448 = success; Security scan run 39102740511 = success.
- Las tres ejecuciones corresponden al mismo SHA `12c0037f3928b2c54c3593d3f48a65bf3318f401`. Esto no certifica producción ni ausencia de vulnerabilidades.
- Se revisaron los README actuales de Gentleman-Programming: Gentle-AI, Engram, Gentleman Guardian Angel, Gentle Shell; también README oficial de Playwright.
- Resultado: evaluación documental y protocolo de adopción añadidos a `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`. No se instalaron ni ejecutaron esos proyectos; no hay evidencia de agentes autónomos activos.
- Se añadió un handoff de continuidad con orden de lectura, reglas anti-alucinación, prompt copiable y límites de seguridad/coste.
- Ramas verificadas: `feat/neon-transaction-adapter` = `7989a84e39536029819735a5202f3934a8eb12c3`; `feat/auth-session-foundation` = `3ac714ab0c5553c05bb73faa7046c8dead150121`; `feat/frontend-auth-flow` = `78aa6efbc81b072b57cec3ede514f41190fef713`; `feat/tenant-safe-schema` = `d4a6f7ac26ea8a56f0ee5b50bb1df2196a76a233`; `fix/pnpm-lockfile-bootstrap` = `49c4604b8d760a56598a4089c79d8cd0008b8395`.
- P0 vigente: identidad actual no muestra Google OAuth/allowlist/verificación email en `apps/api/src/auth.ts`; revisar y probar antes de declarar lista.
- Próximas tareas: diff completo de rama Neon adapter, resolver diseño de Google + allowlist con evidencia, ampliar tests, luego avanzar módulos de producto según plan. No migrar Neon main ni desplegar producción.


## 2026-10-18 — Integración inicial de Gentleman-Programming

- Commit: `ae0c189487b37d910184b0b5cfa058ddbb6919d4`.
- Cambio observable en GitHub: se añadió `.gga` para revisión local con `ollama:qwen2.5-coder`, guía `docs/GENTLEMAN_IMPLEMENTATION.md` y enlace desde README.
- No se instaló ni ejecutó GGA/Ollama/Engram/Gentle-AI; no se activó ningún hook local. Esto no debe describirse como integración en ejecución.
- CI, migration-check y security scan estaban en curso para el SHA de implementación cuando se escribió esta entrada; ver handoff para enlaces y revalidar en vivo.
- Próximo paso: verificar resultados exactos de Actions y completar una prueba aislada de herramientas en un entorno que disponga de terminal/runtime, sin costes de API ni datos sensibles.


## 2026-10-18 — Piloto de herramientas investigadas en rama `feat/security-e2e-tooling`

- Añadidos en GitHub: `apps/web/playwright.config.ts`, `apps/web/e2e/auth.spec.ts`, `.github/workflows/playwright-e2e.yml`, `.github/workflows/semgrep.yml`, `docs/OWASP_ASVS_CHECKLIST.md` y `docs/POS_REFERENCE_MATRIX.md`.
- Playwright cubre login de navegador y error de registro con respuestas de API simuladas; no valida backend real ni Google OAuth. El workflow instala temporalmente `@playwright/test@1.55.0`; pendiente fijar dependencia y lockfile en workspace.
- Semgrep analiza JavaScript/TypeScript y genera SARIF como artefacto; todavía no se han consultado los resultados de Actions.
- El checklist ASVS deja los controles sin marcar por defecto; no se afirma certificación. La matriz POS convierte referencias en criterios de aceptación sin copiar código.
- No se instaló CodeQL, Casbin, express-rate-limit, ZAP ni Juice Shop. CodeQL requiere revisar permisos/coste del repositorio privado; ZAP requiere una preview de prueba aislada; Juice Shop es únicamente laboratorio. No hay despliegue ni cambios en Neon.
- Próximo paso: abrir/revisar PR y comprobar los workflows por SHA exacto. Si falla la instalación o los selectores Playwright, corregir antes de marcar la integración como validada.


## 2026-10-18 — Verificación CI de la integración E2E/seguridad

- SHA probado: `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582` en `feat/security-e2e-tooling`.
- CI: success — https://github.com/BTF14/Micro-app/actions/runs/39104699632
- Database migration validation: success — https://github.com/BTF14/Micro-app/actions/runs/39104699591
- Security scan / Trivy: success — https://github.com/BTF14/Micro-app/actions/runs/39104699568
- Semgrep SAST: success y artefacto SARIF creado — https://github.com/BTF14/Micro-app/actions/runs/39104699596
- Playwright E2E: success; Chromium ejecutó los dos flujos con API simulada — https://github.com/BTF14/Micro-app/actions/runs/39104699653
- Interpretación: la ejecución confirma que workflows y pruebas funcionan en ese SHA. No equivale a certificación de seguridad, no prueba OAuth/allowlist ni la API real, y no cambia el estado de despliegue. Playwright sigue sin ser dependencia permanente del workspace/lockfile.


## 2026-10-18 — PR #6 fusionado

- PR https://github.com/BTF14/Micro-app/pull/6 se fusionó con squash.
- Commit de `main`: `dfe6d3efce5eddc10c25c42642faf5ea8b44eedb`.
- En el head previo a la fusión `df84d056d3edbc2191ac0fd34a39e18f3632ce03`, CI, migración, Trivy, Semgrep y Playwright E2E terminaron en success.
- Se lanzaron workflows nuevos sobre el commit de merge; verificar sus resultados por SHA antes de afirmar que `main` está verde.
- Límites que permanecen: Playwright runner no está fijado en `pnpm-lock.yaml`; E2E usa API simulada; Google OAuth/allowlist sigue siendo P0; no hubo despliegue ni migración en Neon.


## 2026-10-18 — Constitución e índice documental centralizados

- Se creó `docs/CONSTITUTION.md` como norma rectora: coste $0, separación de proyectos, protección de Neon main, no despliegue de producción sin aceptación, identidad/allowlist, aislamiento tenant, integridad de inventario/ventas, tasa BCV, cumplimiento fiscal, evidencia de pruebas y adopción responsable de herramientas.
- Se añadió al inicio de `docs/PROJECT_PLAN.md` un índice maestro y snapshot. La búsqueda de commits observó `main` en `7863973ed6e3869f525c6c89fc16412e92158fc2`; la consulta de status checks devolvió una lista vacía, así que Actions para ese SHA queda **no verificado**.
- README y handoff enlazan la constitución; el plan agrupa documentos de producto, arquitectura, datos, cumplimiento, seguridad, recursos, workflows y perfiles reutilizables.
- Se conservaron las secciones históricas del plan, handoff y diario; no se borraron hitos. Los snapshots antiguos quedan sujetos a verificación en vivo.
- Rama de trabajo: `docs/constitution-and-plan-index`. Cambio documental solamente. No se desplegó producción ni se ejecutó SQL/migración en Neon main.
- Verificación: lectura de archivos de GitHub y actualización mediante GitHub Contents API. No se ejecutaron pruebas de código en esta tarea; verificar Actions para el SHA final después del PR/merge.


## 2026-10-18 — Flujo SDD y perfiles de agentes

- PR #8 de panel de progreso fusionado en `main` con commit `449fc328bff4ffafd6b6a46c0e539ac85cbd9ebf`; los seis workflows consultados para el SHA del PR `94445d8cdbe37d3bde4eb1fa1c7f878ee75920ee` concluyeron `success` (CI, migración, Trivy/security, Semgrep, Playwright E2E y dashboard). Esos checks no certifican preparación para producción.
- Rama de trabajo actual: `feat/sdd-agent-workflow`, basada en el commit de merge anterior.
- Añadidos proceso SDD, plantillas spec/plan/tasks, skill feature-sdd y perfiles de explorador, planificador, implementador, revisor y documentación.
- No se ha instalado ni conectado desde este chat GGA, Ollama, Engram, Gentle-AI ni un runtime MCP; los perfiles son instrucciones versionadas, no agentes en ejecución.
- Próxima validación: comprobar workflows para el HEAD final de esta rama y abrir PR si pasan. No se modificó Neon main ni se desplegó producción.


## 2026-10-18 — Verificación de SDD y perfiles de agentes (PR #9)

- Rama: `feat/sdd-agent-workflow`; HEAD verificado para los checks: `68659d1c1ec0cb9996293f78f9bd487e95124bbf`.
- PR: https://github.com/BTF14/Micro-app/pull/9. En el momento de esta entrada sigue pendiente de integración; no asumir que su contenido ya está en `main`.
- Workflows para ese SHA: CI run `39107162916` = success; Database migration validation `39107162946` = success; Security scan `39107162853` = success; Semgrep SAST `39107162777` = success; Playwright E2E `39107162871` = success; Project progress dashboard `39107164456` = success; SDD and agent documentation validation `39107162905` = success.
- Se añadieron flujo SDD, plantillas de spec/plan/tasks, skill reutilizable, perfiles Explorer/Planner/Implementer/Reviewer/Documentation y validador/workflow de documentos.
- La validación automatizada verifica estructura documental, no demuestra que existan subagentes autónomos ni que GGA/Engram/Gentle-AI/MCP estén instalados. Playwright actual utiliza mocks y no demuestra integración real con PostgreSQL/Neon.
- Próximos pasos: verificar mergeability y estado vivo del PR #9; tras integración, comprobar SHA de merge y Actions sobre ese SHA; después resolver la generación/actualización automática de los artefactos del dashboard y continuar con los bloqueos P0 de identidad/autorización y transacciones.
- Restricciones conservadas: $0, sin mutar Neon `main`, sin despliegue de producción.


## 2026-10-18 — PR #9 fusionado y SDD/continuidad versionados en main

- PR #9: https://github.com/BTF14/Micro-app/pull/9 — estado verificado `merged`.
- Merge commit (squash): `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`.
- Checks del HEAD del PR `ba1eebbe45b11e6e0b3562795cdb6c26b5c31c63`: CI `39107363677` success; Database migration validation `39107363637` success; Security scan `39107363647` success; Semgrep `39107363624` success; Playwright E2E `39107363688` success; SDD validation `39107363683` success; dashboard `39107363673` success.
- La integración contiene SDD, plantillas, skill, perfiles reutilizables, validador de documentación y actualización de handoff/protocolo para nuevas IA.
- Próxima verificación pendiente: Actions asociadas al commit de merge y coherencia final del handoff en `main`.
- Límites: ningún agente local se ha instalado por este merge; no se mutó Neon `main`, no se desplegó producción y el objetivo de coste sigue en $0.


## 2026-10-18 — Política de cambios controlados en Neon `main`

- Decisión documental: reemplazar la prohibición absoluta de mutaciones en Neon `main` por una autorización condicionada a necesidad demostrada, identificación inequívoca del destino, revisión de SQL/migración, pruebas aisladas cuando sean viables, recuperación comprobable y validación posterior.
- Los cambios aditivos, compatibles, de bajo riesgo y recuperables pueden ejecutarse autónomamente tras superar el gate. Cambios destructivos, irreversibles/difíciles de revertir, masivos sobre datos críticos, de permisos/credenciales, con riesgo material de indisponibilidad o impacto incierto requieren aprobación explícita previa del usuario.
- Si no se puede confirmar destino, impacto o recuperación, detenerse; no improvisar ni continuar con incertidumbre.
- Cambios aplicados en esta rama documental: `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/HANDOFF_NEXT_CHAT.md`. No se ejecutó SQL, no se aplicaron migraciones y no se modificó ninguna base Neon.
- Pendiente: revisar diff y validaciones CI en PR antes de integrar. La actualización de la política no demuestra que exista un backup ni que la restauración esté configurada; eso deberá verificarse antes de cualquier mutación real.


## 2026-10-18 — Política de backup diario y revisión quincenal

- Fuente oficial de Neon consultada: https://neon.com/docs/postgres/backup-restore/history-window y https://neon.com/docs/introduction/plans. La documentación indica que el plan Free tiene hasta 6 horas de historial PITR (máximo 1 GB de historial), una snapshot manual y no ofrece snapshots programadas. Confirmar límites en la consola antes de depender de ellos.
- Se creó `docs/BACKUP_AND_RECOVERY.md` con requisitos de cobertura, retención, cifrado, control de acceso, restauración aislada, alertas y límites de coste.
- Objetivo recomendado: backup lógico diario automático a destino independiente privado/cifrado con retención limitada; revisión de salud y recuperación cada 15 días. No generar copias diarias en GitHub ni almacenar dumps con datos reales en el repositorio.
- Estado real: política documental solamente. No se configuró backup, no se descargaron datos, no se modificó Neon y no se probó restauración. El destino independiente gratuito, la automatización y los secretos aún deben diseñarse y verificarse antes de activar.
- Se actualizan instrucciones de agentes, constitución, cumplimiento, handoff y checklist de producción para que las IA no asuman ni inventen que los backups están activos.
- PR #13 fue fusionada en `3d8b571f1d6ed3478bf3cf6182c412d3282db586`; siete workflows terminaron en success para el HEAD del PR `e03d224f8aded9534db375068f3ae5cac0db8a60`. No se afirma aquí que los checks del merge SHA estén verificados.


## 2026-10-18 — PR #14 fusionada y evaluación de Google Drive

- PR #14 fusionada en `main`: `9480f84d8b7d28e830d0fd57212d29a75e44afbb`.
- Los siete workflows consultados para el HEAD exacto de PR #14 `b421e74631db3c21addd032f2bfbd780b935585d` concluyeron en `success`. No inferir de ello que se probaron backups ni restauración.
- Evaluación externa documentada en `docs/GOOGLE_DRIVE_BACKUP_EVALUATION.md`: Drive personal puede funcionar condicionado a espacio disponible, OAuth duradero, secreto seguro, coste $0 y pruebas de recuperación. Los 15 GB se comparten entre Gmail, Drive y Photos; cuentas de servicio no pueden poseer archivos de My Drive y no tienen cuota de almacenamiento propia. Fuente oficial: https://developers.google.com/workspace/drive/api/guides/about-sdk, https://developers.google.com/identity/protocols/oauth2, https://support.google.com/drive/answer/9312312?hl=en-en.
- Estado sin cambios en servicios reales: no backup activo, no restore probado, no acceso ni espacio Drive verificado, no credenciales creadas, no datos reales descargados, no SQL/migración y no despliegue.
- Decisión: no implementar aún el workflow con datos reales. Próximo paso seguro es prototipo de backup/restore con PostgreSQL desechable y datos sintéticos; confirmar límites/coste sin activar billing.


## 2026-10-18 — Evaluación de destino de respaldo integrada; backup sigue pendiente

- PR [#15](https://github.com/BTF14/Micro-app/pull/15) fusionada con squash en `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`.
- La evaluación de Google Drive queda documentada como candidata condicional, no como elección ni configuración. No se accedió a cuentas ni secretos, no se descargaron datos reales, no se modificó Neon y no se activó billing.
- Para el SHA del PR `adc636732c24f74d3d6457a93af665647a00e097`, CI, Security scan, Semgrep, Playwright E2E, validación de migraciones y dashboard dieron success. La última consulta mostró workflows del merge SHA en ejecución; verificar en vivo.
- El backup diario externo cifrado, la alerta de fallos y la restauración aislada siguen pendientes. No considerar la política documental como evidencia de ejecución.
- Revisión de continuidad: `feat/neon-transaction-adapter` tiene 14 commits por delante y 31 detrás de `main`; `apps/api/src/database.ts` ya está presente en `main` y coincide con la versión revisada en esa rama. No fusionar rama divergida; inspeccionar/rescatar solo cambios exclusivos que sigan siendo necesarios.
- Próxima prioridad: requisito P0 Google Sign-In + allowlist. PR #12 es diseño solamente y decisiones D1–D8 siguen abiertas; no implementar OAuth ni inventar reglas de acceso antes de resolverlas.


## 2026-10-18 — PR #16 fusionada; revisión de autenticación documentada

- PR [#16](https://github.com/BTF14/Micro-app/pull/16) fusionada por squash; merge SHA `8f3a0316519dd39aded179bb234de316c83bb8ee`.
- Se añadió `docs/reviews/AUTHENTICATION_AUTHORIZATION_GAP_REVIEW_2026-10-18.md`, revisión estática de controles actuales, brechas y secuencia de aceptación. No se cambió código de autenticación, base de datos, secretos ni despliegue.
- Checks del HEAD exacto `e52033d15c4f37ac862d44a5f06097642a95d75d`: CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard, todos `success`. CI: https://github.com/BTF14/Micro-app/actions/runs/39110161670 ; E2E: https://github.com/BTF14/Micro-app/actions/runs/39110161665 ; migraciones: https://github.com/BTF14/Micro-app/actions/runs/39110161643 ; Semgrep: https://github.com/BTF14/Micro-app/actions/runs/39110161698 ; seguridad: https://github.com/BTF14/Micro-app/actions/runs/39110161635 ; dashboard: https://github.com/BTF14/Micro-app/actions/runs/39110161660.
- P0: el registro crea una organización y asigna rol `owner` sin allowlist; no se encontró Google OAuth/allowlist en `apps/api/src/auth.ts`. Es revisión estática, no prueba dinámica ni pentest.
- PR #12 está fusionada como diseño SDD, SHA `a28bbc686c7b1cb9cbe615ef5bcb9c7ece45ede3`; D1–D8 siguen pendientes. No implementar OAuth ni reglas de acceso por suposición.
- Sin cambios en Neon, credenciales, datos reales o producción. Backup externo automático y restauración real siguen sin estar configurados/verificados.


## 2026-10-18 — PR #17 fusionada; continuidad y checks verificados

- PR [#17](https://github.com/BTF14/Micro-app/pull/17) fusionada por squash; merge SHA `f196077b1ad5800e287c9f88890439826bdf3f0f`. HEAD de `main` verificado en ese mismo SHA.
- Para el HEAD exacto del PR `a27f05e1e5d17bfb395671d230d1c9b6884e85ca`, los workflows CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard terminaron en `success`; Security scan se ejecutó dos veces y ambas terminaron en `success`. Estos son checks del commit de documentación, no validación de producción.
- El registro público de la API sigue siendo P0: `POST /auth/register` permite crear una organización y asignar rol `owner` sin allowlist. No habilitar usuarios ni datos comerciales reales hasta cerrar el requisito de acceso.
- PR #12 es diseño SDD ya fusionado; decisiones D1–D8 aún no están documentadas como resueltas. Próximo paso seguro: releer el documento fuente de SDD y separar decisiones que ya están respaldadas por requisitos de las que requieren confirmación de producto. No inventar allowlist, administrador, dominios ni política de vinculación.
- La rama `main` no tiene protección de branch configurada según lectura de GitHub (`protected=false`, checks requeridos vacíos). Es una mejora de gobernanza a evaluar, no se cambió en este trabajo.
- Backup externo automatizado, destino independiente, alertas y restauración aislada siguen pendientes. No hay despliegue de producción ni cambios en Neon/secretos/datos reales.


## 2026-10-18 — PR #19 y #20 fusionadas; traspaso entre chats

- PR [#20](https://github.com/BTF14/Micro-app/pull/20) añade documentación de adopción controlada de Strix; merge SHA `c87361685ef1ce36e4cf6025124b09e70ffa0846`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19) añade un registro de opciones para las decisiones D1–D8 de autenticación; merge SHA `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Son opciones propuestas, no decisiones de producto aprobadas.
- HEAD de `main` verificado después de ambas fusiones: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- Para ese SHA exacto, CI, Playwright E2E, validación de migraciones, Semgrep SAST, Security scan y dashboard concluyeron en success: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129579631).
- La documentación de Strix explica propósito, escenarios, requisitos de coste/aislamiento y gates. Strix no está instalado ni ejecutado; no hay escaneo ni informe y no se añadió workflow de Strix.
- Se actualiza el handoff para el cambio de chat debido al límite de duración de la conversación. Las tareas P0 de autenticación/allowlist, pruebas API+DB reales y backup/restore siguen pendientes. No se mutó Neon ni se desplegó producción.


## 2026-10-18 — Verificación viva de PR #21 y bloqueo P0

- GitHub API confirma `main` en `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Rama sin protección activa ni checks requeridos (`protected=false`).
- PR [#21](https://github.com/BTF14/Micro-app/pull/21) permanece abierta, `merged=false`, HEAD `fb9ab271cc8b1c72e92d7874672913698c59bfe7`; no fusionada. Checks del SHA exacto: CI run 39129938686, Playwright E2E 39129938460, migraciones 39129938520, Semgrep 39129938702, Security scan 39129938471 y dashboard 39129938467; todos `success`. El status API clásico devolvió cero checks, por lo que se documentan los workflow runs como fuente de evidencia.
- El bot Codex marcó revisión como fallida/con hallazgos sin resolver, pero la API no devolvió review formal ni comentarios inline y el bot indicó límite de uso. No hay hallazgo técnico concreto reproducible que se pueda corregir; mantener PR sin fusionar hasta revisar el diff y resolver/explicar la señal.
- La lectura actual de `apps/api/src/auth.ts` (blob SHA `0735dbad34bd5c932852882da0bff6eebbab337a`) confirma que el registro por contraseña crea usuario, organización, membresía `owner` y sesión; no se ve Google OAuth ni allowlist. Test `apps/api/src/auth.integration.test.ts` usa PostgreSQL efímero en CI, pero no prueba el requisito OAuth/allowlist ni aislamiento cross-tenant integral.
- D1–D8 continúan sin aprobar. No elegir de forma autónoma correos, dominios, bootstrap, altas de organizaciones ni vinculación de cuentas. P0 continúa abierto; no declarar producción lista.
- Strix solo documentado, no instalado/ejecutado. Sin cambios en Neon, producción, credenciales, datos reales, correos ni facturación.

## 2026-10-18 — Fusión de PR #21

- El usuario autorizó fusionar PR #21 tras verificar los checks. GitHub confirmó la fusión por squash con commit `7491b97a2bde52555fe9b8a5d808ad81b829d90e`.
- Cambios incluidos: únicamente `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/RESOURCE_REGISTRY.md` y `docs/STATE_JOURNAL.md`.
- Los 7 workflows de Actions reportados para el HEAD de la PR terminaron en `success`. La revisión Codex quedó fallida por límite de uso y sin hallazgo técnico concreto recuperable; no tratarla como aprobación.
- Sin despliegue de producción ni cambios en Neon, secretos, datos reales o facturación. Auth/allowlist P0, decisiones D1–D8 y backup/restore verificado continúan pendientes.


## 2026-10-18 — Checkpoint posterior a PR #23 y matriz de aislamiento tenant

- HEAD de `main` verificado: `838715d211918f521f5e6401a91dc773236ef3ad`, merge de [PR #23](https://github.com/BTF14/Micro-app/pull/23).
- Siete workflows sobre ese SHA terminaron en success: CI 39132076336, Playwright E2E 39132076316, Semgrep 39132076300, Security scan 39132076368, validación de migraciones 39132076356, validación SDD/documentación 39132076394 y panel 39132076363.
- Revisión de `apps/api/src/index.ts` y `apps/api/src/auth.ts`: solo están health y endpoints de autenticación; aún no hay handlers HTTP de productos, proveedores, ventas, pagos o movimientos. No se inventaron rutas para fabricar pruebas de aislamiento.
- Se creó `docs/TENANT_ISOLATION_TEST_PLAN.md` con escenarios positivos/negativos por recurso, roles, membresía y sesiones, para ejecutar contra PostgreSQL efímero cuando se implementen los handlers.
- Se actualizó `docs/CURRENT_STATE.md` para reflejar el SHA vivo y distinguir workflows verdes de preparación comercial.
- No se modificó Neon `main`, no se usaron datos reales y no hubo despliegue.
- Bloqueos sin cambios: Google OAuth + allowlist y decisiones D1–D8 pendientes; backups/restauración independiente no verificados; protección de rama no activa en la última consulta.


## 2026-10-18 — PR #24 fusionada y verificación de merge

- Se verificó que PR #24 (`docs: define tenant isolation acceptance matrix`) estaba abierta, mergeable y con los siete workflows en `success` en el head exacto `e7856319321f1aa1047148fd782fcadb77f091c2`.
- Se fusionó mediante squash con protección de SHA esperado; GitHub confirmó merge commit `69032a333b52ee10099c0347be3443e18f4dc4df`.
- En la primera consulta posterior al merge, el panel de progreso terminó en `success`; CI, Playwright E2E, Security scan, Semgrep SAST y validación de migraciones seguían `in_progress`. No se afirma que el SHA del merge esté completamente verde hasta volver a consultar.
- Sin cambios de código de producto, base de datos, Neon ni despliegue. La matriz documenta pruebas futuras, no evidencia de aislamiento en endpoints inexistentes.


## 2026-10-18 — PR #25 fusionada y checkpoint corregido

- PR #25: https://github.com/BTF14/Micro-app/pull/25, merge commit `ed0d39f5bc248c9e5d5a1c5008352e8a390a0374`.
- Head de PR #25 `e5d671ed5087ea18f96d4dead79b76bb933d071d`: siete workflows consultados en `success`.
- Los seis workflows del merge commit `ed0d39f5bc248c9e5d5a1c5008352e8a390a0374` estaban en ejecución en la última consulta; comprobarlos de nuevo antes de informar que el commit de main está verde.
- Se detectaron snapshots antiguos contradictorios en la documentación de continuidad. Se antepone un checkpoint autoritativo que identifica explícitamente los bloques inferiores como históricos y preserva el historial.
- Sin cambios de código, base de datos, secretos o despliegue de producción.


## 2026-10-18 — Verificación posterior a PR #26

- HEAD de `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c`.
- PR #26 fusionada: https://github.com/BTF14/Micro-app/pull/26. No hay PR abiertas en la consulta de GitHub de este checkpoint.
- Para el SHA exacto de `main`, los seis workflows terminaron en `success`: CI (https://github.com/BTF14/Micro-app/actions/runs/39133032751), Playwright E2E (https://github.com/BTF14/Micro-app/actions/runs/39133032760), Security scan (https://github.com/BTF14/Micro-app/actions/runs/39133032817), Semgrep SAST (https://github.com/BTF14/Micro-app/actions/runs/39133032755), validación de migraciones (https://github.com/BTF14/Micro-app/actions/runs/39133032686) y panel de progreso (https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No se ejecutaron pruebas localmente; esta evidencia corresponde a GitHub Actions para el SHA indicado.
- Sin cambios de código de producto, base de datos, secretos o despliegue de producción.
- Estado comercial sigue siendo no listo para producción: faltan endpoints de negocio, OAuth + allowlist con decisiones D1–D8 aprobadas, pruebas completas de aislamiento/autorización y respaldo/restauración independientes verificados.


## 2026-10-18 — Matriz de permisos por rol preparada para decisión

- PR de documentación en preparación desde `docs/role-permission-decision-matrix`.
- Añadido `docs/sdd/role-permission-decision-matrix.md` con las áreas de producto, inventario, ventas, caja, reportes, usuarios y auditoría que necesitan una decisión explícita para `owner`, `admin`, `cashier` e `inventory`.
- Todas las celdas siguen pendientes; no se convirtió una propuesta en política aprobada ni se añadieron handlers comerciales.
- Se enlazó la matriz desde el registro de decisiones de identidad/acceso. D1–D8 de Google OAuth/allowlist siguen independientes y pendientes.
- PR #29 fusionada después de que los ocho check-runs del head `bccae77f66ede9670e4887092ae13749daf39b3b` terminaran en success. Merge commit y `main`: `df9d9b90a8f0e4965d20278cc5825006d9e959aa`.
- Sin pruebas locales, sin cambios de base de datos, sin secretos, sin emails ni despliegue de producción.


## 2026-10-19 — PR #35 y PR #36

- PR #35 fusionada: checkpoint documental tras PR #34; merge SHA `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36 fusionada: validación estricta de formato de hash PBKDF2; merge SHA `c15c2364cd19e55ac10b2331300e7a9f4b89813f`; head SHA validado por CI `cf432de6d5e8752181bc1105e9d0e91384d5936c`.
- Los seis workflows de PR #36 fueron `success` para el head SHA exacto: CI, Playwright E2E, Security scan, Semgrep SAST, Database migration validation y Project progress dashboard.
- No se ejecutaron pruebas localmente. No se desplegó producción ni se modificó Neon `main`.
- El estado post-merge de PR #34 requiere confirmación de SHA exacto: los seis jobs consultados dieron `success`, pero la consulta no expuso metadatos suficientes para asociarlos inequívocamente al merge SHA.
- Bloqueos vigentes: Google OAuth/allowlist y D1–D8 pendientes; matriz de roles pendiente; rutas comerciales completas y E2E API+PostgreSQL no verificadas; backup/restauración independiente sin probar; app no lista para producción.
- Siguiente paso: confirmar Actions del merge SHA `c15c2364cd19e55ac10b2331300e7a9f4b89813f`; continuar pruebas de seguridad pequeñas y documentar resultados exactos. Coste objetivo $0; sin Cantina-pos, secretos, correos, billing, datos reales ni despliegue.


## 2026-10-19 — PR #38 y PR #39

- PR #38 fusionada: pruebas de limpieza de conexión y fallos de rollback; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`; head probado `527dd7cc62bcceae891add8100875cc395dd5cfa`; seis workflows `success` en ese head.
- PR #39 fusionada: prueba de preservación del error original cuando fallan tanto la operación como el cierre del cliente; merge SHA `50c530084f8ce402d897962cbc7c4354c512e847`; head probado `134c9e14a5224d83c5f280dc501ae113d374c159`; seis workflows `success` en ese head.
- No se ejecutaron pruebas locales y no se han verificado aquí los workflows sobre el merge SHA de PR #39. No se modificaron bases de datos ni se desplegó producción.
- La app sigue sin estar lista para producción; continúan bloqueos de identidad/allowlist, permisos, rutas comerciales, E2E real, aislamiento multiempresa y backup/restauración independiente.
- Siguiente: pruebas acotadas de auth/sesión; inspección completa de `feat/neon-transaction-adapter` antes de cualquier merge; coste $0 y respetar todos los gates de producción.


## 2026-10-19 — PR #41 fusionada

- `main`: `3313bf4276563c6cdac52aa7902fa9ea36558014` (https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014).
- PR #41: https://github.com/BTF14/Micro-app/pull/41 — prueba de regresión para conservar la cookie cuando falla la revocación de logout.
- Seis workflows `success` en el head de PR `0c55c180846e6286e72d35f51e502278200ee0de`: CI 39244454840, Playwright 39244454807, Security scan 39244454911, Semgrep 39244454934, Project progress dashboard 39244454952, Database migration validation 39244456648.
- No se ejecutaron tests locales. Los workflows del merge SHA no están confirmados por la consulta disponible.
- Sin datos reales, secretos, billing, cambios a Neon `main`, despliegue de producción ni mezcla con Cantina-pos. La app sigue sin estar lista para producción.


## 2026-10-19 — PR #45 fusionada; continuidad actualizada

- `main` verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f`.
- PR #45 https://github.com/BTF14/Micro-app/pull/45 fusionada por squash. Head probado: `cdce44a9643c5134311f9603abf1248c07970df3`.
- Seis workflows de GitHub Actions terminaron en success para ese head: CI 39252317370, Playwright E2E 39252317397, migraciones 39252317371, Security scan 39252317467, Semgrep SAST 39252317386 y dashboard 39252317373.
- Cambio: una aserción de limpieza de cookie cuando el usuario está inactivo. No se ejecutaron tests locales y los workflows del merge SHA no están verificados aquí.
- Se refrescaron los documentos de estado, plan y handoff. Sin cambios de producción, Neon, secretos, datos reales, billing ni Cantina-pos.
- La aplicación no está lista para producción; D1–D8, OAuth/allowlist, matriz de permisos, endpoints de negocio, aislamiento tenant, E2E real y backup/restauración independiente siguen pendientes.


## 2026-10-19 — PR #47 y #48 fusionadas

- `main` verificado: `420a64152103c90d2990d47c72fc19a744786fa6`.
- PR #47 https://github.com/BTF14/Micro-app/pull/47: prueba de error de `/auth/me` cuando falla la validación de sesión por DB. Head `7939d11678cfd1a2bb8fac22664096663603c824`; seis workflows success: CI 39253558854, Playwright 39253558793, migraciones 39253558714, Security 39253558727, Semgrep 39253558761, dashboard 39253558724.
- PR #48 https://github.com/BTF14/Micro-app/pull/48: prueba de que una cuenta inactiva no obtiene una cookie nueva. Head final `6acb78018a47eb39f74dab079b53b51b4cacf11f`; seis workflows success: CI 39254257051, Playwright 39254256939, migraciones 39254257076, Security 39254256854, Semgrep 39254256882, dashboard 39254256826.
- En PR #48, la primera ejecución encontró que el test excedía el límite de login por email; el fixture fue corregido para limpiar únicamente el contador hash del correo sintético antes del caso de cuenta inactiva. El head final pasó los seis workflows.
- No se ejecutaron tests localmente ni se verificaron workflows en los merge SHA. Sin cambios en producción, Neon, secretos, datos reales, billing ni Cantina-pos.
- La app sigue sin estar lista para producción. OAuth/allowlist, D1–D8, matriz de permisos, endpoints comerciales, aislamiento tenant, E2E API+PostgreSQL real y backup/restauración independiente continúan pendientes.


## 2026-10-19 — PR #50 y #51 fusionadas

- `main` verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98`.
- PR #50 https://github.com/BTF14/Micro-app/pull/50: aserciones para que login no emita cookie con membresía inactiva u organización desactivada. Head `dcad8d6d1caf6db3aabbc95465e5983ad0014746`; seis workflows success: CI 39255158169, Playwright 39255157709, migraciones 39255158077, Security 39255157712, Semgrep 39255157509, dashboard 39255157611.
- PR #51 https://github.com/BTF14/Micro-app/pull/51: respuestas seguras ante fallo de DB en login/registro, sin cookie. Head `92ea991d6333bcd1b05943f679fdd36777ab6a8f`; seis workflows success: CI 39255462405, Playwright 39255462498, migraciones 39255462284, Security 39255462264, Semgrep 39255462627, dashboard 39255462281.
- No se ejecutaron tests localmente ni se verificaron workflows sobre merge SHA. Sin cambios en producción, Neon, secretos, datos reales, billing ni Cantina-pos.
- La aplicación sigue sin estar lista para producción. OAuth/allowlist, D1–D8, matriz de permisos, endpoints comerciales, aislamiento tenant, E2E API+PostgreSQL real y backup/restauración independiente continúan pendientes.


## 2026-10-19 — Revisión manual y rebase seguro de gobernanza

- Revalidación de PR #60: head `af8479000e1e677bd84e0e11bf02cdb6d548315e`, abierta, `mergeable=false`; base SHA mostrado por PR `0a36f234d7a590905527b9cb9268bba3791215f5`. No se forzó ni se fusionó la rama conflictiva.
- Siete workflows consultados para el head exacto `af8479000e1e677bd84e0e11bf02cdb6d548315e` terminaron en `success` (CI, Security, Playwright E2E, migration validation, progress dashboard, Semgrep SAST y SDD/agent docs validation).
- El comentario de Codex confirma cuota agotada y revisión fallida para el SHA antiguo `1b7f576c38aa869ca8c17b749c7c35d473404ef8`; no se recuperaron reviews formales ni hilos inline. No se inventan ni se declaran resueltos hallazgos desconocidos.
- PR #61 está fusionada con merge SHA reportado `1b8098ff00e0bb7482200b486710a5611f1e109d`. El diario existente contenía una entrada histórica que la describía como abierta; el checkpoint nuevo de handoff corrige el estado vivo.
- Se creó `docs/ai-autonomy-governance-rebased` desde `main` para re-aplicar cambios documentales sin force-push. Pendiente de revisar diff y CI de la nueva rama/PR.
- No se ejecutaron pruebas locales. No hubo cambios en runtime, base de datos, secretos, datos reales, Neon ni despliegues productivos. Coste $0.


## 2026-10-19 — PR #62 fusionada y continuidad reconciliada

- PR #62 https://github.com/BTF14/Micro-app/pull/62 se fusionó por squash; merge SHA `d107cfb2b80c4165ed39e3071f8256942898ffb7`. Head final `9f288f68b6012f39b8ec7928b07a140b869e63cb`.
- Siete workflows del head final terminaron en success: CI, Playwright E2E, SDD/agent docs validation, progress dashboard, Security scan, Semgrep SAST y database migration validation.
- La PR era documental; no se cambiaron runtime, esquema de datos, Neon, secretos, datos reales ni producción. No se ejecutaron tests locales.
- Se actualizan checkpoint y handoff para reflejar el merge de PR #62 y evitar que el snapshot antiguo de PR #57 prevalezca como estado vivo.
- PR #60 sigue abierta con conflicto; no forzar ni fusionar. Antes de sustituirla, comparar sus cambios con lo que ya quedó integrado en PR #62.
- P0 continúa pendiente: Google sign-in, allowlist, D1–D8 y matriz de permisos requieren decisiones aprobadas. El registro sigue bloqueado; el login por contraseña aún existe y no debe asumirse que la política de acceso final ya está aplicada.
- Coste $0; no despliegues productivos, cambios en Neon `main`, emails, billing ni Cantina-pos.


## 2026-10-19 — Reconciliación de la política detallada de autonomía

- Comparé el diff original de PR #60 con lo que quedó integrado en PR #62. PR #62 portó el núcleo de la política, pero no todo el detalle operativo original de `AGENTS.md` y `docs/CONSTITUTION.md`.
- PR #63 amplía esos criterios sin reintroducir los checkpoints históricos obsoletos del handoff original: decisiones técnicas rutinarias por defecto, pedir solo la acción mínima ante bloqueos reales, verificación del SHA exacto y procedimiento de revisión manual cuando Codex no esté disponible.
- La PR #60 original permanece abierta y en conflicto; no se hace force-push ni merge directo. La revisión de PR #63 y sus checks siguen pendientes.
- No se modificó runtime ni autenticación; no se tocó base de datos, Neon, secretos, datos reales, producción o billing. Coste $0.


## 2026-10-19 — AutoSkills, skills locales y checkpoint tras PR #64

- PR #63 se fusionó por squash en `b4b417ec5a85b8b0c48b606c718c341745af9055`; sus siete workflows pasaron sobre el head exacto `6baffe8fb473128504361c28fd6ac0c0e01519d9`.
- PR #64 se fusionó por squash en `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`; seis workflows consultados terminaron en success sobre el head exacto `97088a2d0d599001f145f4e60f72556a66a5f8b4`. No se ejecutaron tests locales.
- Se añadieron cuatro skills de proyecto en `.agents/skills/` para auth/security, PostgreSQL, stack actual y curation segura; la guía `docs/AUTOSKILLS_ADOPTION.md` diferencia skills locales de paquetes externos.
- Se investigó AutoSkills y entradas de React/TypeScript/Vite/Hono, además de referencias de auth-review, secure-code-review y pruebas PostgreSQL. El intento de clonar el repo temporal falló por DNS al resolver `github.com`; la CLI `npx autoskills --dry-run` no se ejecutó. No se declara instalación oficial ni hash/lockfile generado.
- `docs/RESOURCE_REGISTRY.md` registra fuentes, decisión y limitación. Próximo paso cuando haya red: ejecutar dry-run, inspeccionar tecnologías/skills y revisar licencia, estado de seguridad y hashes antes de instalar.
- PR #60 se cerró como supersedida tras comparar el diff; no se fusionó ni se hizo force-push. Sus reglas útiles quedaron integradas por #62/#63; los snapshots históricos obsoletos no se reintrodujeron.
- Sin cambios de runtime/dependencias/DB/secretos ni despliegue productivo. Cloudflare generó automáticamente preview de rama para PR #64. Coste $0.
- P0 de identidad permanece: Google OAuth + allowlist, D1–D8 y matriz de permisos pendientes de aprobación. Registro fail-closed; login por contraseña existe y no se debe asumir que la allowlist lo protege.

## 2026-10-28 — Cobertura de preflight CORS

- Rama: `fix/cors-preflight-coverage-20261028`.
- Añadidas pruebas unitarias para el preflight `OPTIONS`: origen Pages autorizado con credenciales, método POST, cabeceras permitidas y max-age; y origen externo rechazado.
- Estas pruebas cubren el comportamiento del middleware Hono con bindings simulados. No equivalen a observar los encabezados HTTP del Worker publicado.
- No se modificaron variables de Cloudflare, secretos, Neon, datos reales ni producción. No se desplegó manualmente.
- Pendiente: revisión independiente del diff y mantener separada la verificación HTTP real de CORS frente al Worker publicado. No apuntar Preview a producción sin comprobar aislamiento y origen permitido.


## 2026-10-28 — PR #113 y auditoría de rama de seguridad

- PR #113 se fusionó por squash en `main`, commit `4242bcef38f33a415f472fc9c04048e1eee3bdde`. La matriz de permisos pasó de vacía a propuesta razonada, pero permanece **no aprobada**; no autoriza rutas comerciales.
- Workflows de PR exitosos en el HEAD `b93df838095a043e418f5e481ce4422ed014c494`; Codex no completó la revisión por límite de uso. Se revisó manualmente el diff y se dejó comentario sobre descuento del 10 %, alcance de sucursales y serialización concurrente para proteger al último owner. Los estados Vercel del merge commit quedaron pendientes; no afirmar CI post-merge.
- La rama `security/secret-scan-current-main` está 1 ahead/39 behind. Checklist ya existe en main; el workflow está obsoleto respecto a checkout v7 en main y el `.gitignore` de la rama no incluye la excepción de `apps/web/.env.production`. No se fusionó ni borró.
- Pendientes: restauración del backup cifrado en PostgreSQL desechable (llave privada age no disponible en la sesión), verificación HTTP de CORS y aislamiento tenant de futuras rutas comerciales. No se tocaron secretos, Neon, datos reales ni producción.

## 2026-10-29 — Fusión de PR #114 y estado posterior

- PR #114 se fusionó por squash en `main`, merge SHA `dc3fae80c485ec52c2e68c80da316df90c68ac83`, tras verificar el SHA esperado de la PR.
- Los ocho workflows y dos estados Vercel del HEAD de PR estaban en verde. No afirmar CI post-merge: los estados Vercel del merge SHA aparecen pendientes y no se devolvieron workflows de Actions para ese SHA.
- Cloudflare Workers reportó `Deployment successful!` y URLs explícitas de preview de commit y rama. No se realizó despliegue manual.
- La PR fusionada era de documentación; no cambió código de runtime, secretos, Neon ni datos reales.
- Bloqueos persistentes: restore del backup cifrado en PostgreSQL desechable, verificación HTTP real de CORS y aprobación/cobertura de permisos y aislamiento tenant. La aplicación no se considera lista para producción.

---

## 2026-10-29 — hallazgo y corrección de retención de backups

- Estado verificado: PR [#128](https://github.com/BTF14/Micro-app/pull/128) fusionada en `main`; merge SHA `9b4ee7d2ed704288cd0cf149c93569a698f46e1b`. En ese SHA, los checks de CI, migraciones, Playwright, escaneo de secretos, Semgrep, seguridad, dashboard, Cloudflare Pages/Workers y análisis JS/TS reportaron `success`.
- El propietario confirma que `RESTORE_TEST_AGE_KEY` fue eliminado y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets. Es una confirmación visual del propietario; no se conoce la fecha exacta. Los secretos que quedan, `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`, se conservan para el backup permanente.
- Se inspeccionó `.github/workflows/backup.yml`: el paso de retención usaba `find -mtime` sobre un repositorio clonado con `--depth 1`. Como los mtimes de archivos tras checkout no son la fecha de creación del backup, esa estrategia puede no borrar copias vencidas.
- Se abrió la [PR #129](https://github.com/BTF14/Micro-app/pull/129) para corregir ese defecto, con un script que usa la fecha UTC incluida en el nombre del backup, elimina el checksum emparejado y añade pruebas unitarias ejecutadas en CI. Checks pendientes de ejecutar en el HEAD de PR; no declarar corregido hasta verlos verdes.
- Neon confirma que la rama `restore-test-20261028` (ID `br-broad-dust-b7cvgjtv`) todavía existe. El borrado por la herramienta ya había sido bloqueado por controles de seguridad; no se reintentó ni se eludió ese control. No se tocó `main`, datos reales ni producción.
- Siguiente paso: revisar checks/diff de la PR de retención; después preparar una única restauración aislada con datos sintéticos poblados y manifiesto de conteos/relaciones. RPO/RTO, alerta visible de fallo y evidencia de coste $0 siguen pendientes.


---

## 2026-10-29 — PR #129 fusionada y continuidad actualizada

- El propietario confirmó la fusión de PR [#129](https://github.com/BTF14/Micro-app/pull/129); comprobación independiente: estado `closed`, `merged=true`.
- HEAD actual de `main`: `d196d8e3e3053e1c51d2e1133aa4ed2d52884631`. Commit de merge de PR #129. Los checks del HEAD de la PR `35bee0d04e0c1d8470d526c7f7e961b7e0b4de26` terminaron todos en `success`, incluidos `verify`, pruebas unitarias de retención, migraciones, Playwright, análisis estático, escaneos de secretos y seguridad, Pages y Worker.
- La retención de 15 días ya no depende de mtimes posteriores al checkout: usa el timestamp UTC validado en el nombre del backup y elimina el checksum emparejado. CI cubre expiración, checksum, backups recientes, nombres malformados y valor inválido de retención.
- La documentación previa contenía notas históricas que presentaban PR #129 como pendiente y contradicciones antiguas sobre secretos; se actualizó el estado vivo/handoff para separar hechos actuales de entradas históricas.
- Neon sigue mostrando `restore-test-20261028` (ID `br-broad-dust-b7cvgjtv`). El intento de borrado por herramienta fue bloqueado por controles de seguridad; no se reintentó ni se eludió.
- Pendiente: prueba única de restauración con datos sintéticos poblados, manifiesto de conteos/relaciones, RPO/RTO, alerta visible y coste $0. No usar datos reales ni Neon `main`; la restauración sigue siendo la última fase.


## 2026-10-29 — continuidad post-merge PR #137

- Main observado: `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5`; PR #137 fusionada, sin actualización real de dependencias.
- El workflow `.github/workflows/daily-dependency-watch.yml` está en main; schedule diario 08:15 UTC, ejecución manual, solo lectura. No se confirmó una ejecución post-merge porque la consulta de runs no estuvo disponible; el siguiente chat debe ejecutarlo desde Actions y documentar URL/SHA/resumen.
- Última consulta de checks de main: verify, Chromium, migración PostgreSQL, análisis estático y Trivy en success; algunos checks de Workers/Pages/scan aún figuraban en curso o duplicados. Reconsultar el SHA exacto antes de afirmar que todo pasó.
- Próximo trabajo: confirmar checks y monitor, luego una única PR de actualización de dependencias estables con lockfile generado por pnpm real y pruebas completas. No aplicar TypeScript 7/Vite 8/plugin-react 6/jsdom 30 solo porque estén publicadas; revisar compatibilidad. Preservar undici@7.30.1 en manifest/lockfile.
- Se mantiene autorización temporal para fusionar PRs con criterio, evitando PRs pequeñas repetidas. No tocar secretos, Neon main, datos reales ni producción; restauración sintética poblada sigue siendo la última fase.


## 2026-10-29 — corrección del informe diario de dependencias

- Se inspeccionó el run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589), ejecutado con SHA `0763c70647ff11a8bcf91386a274d549246407ef`. La instalación congelada pasó y `pnpm audit --audit-level high` informó `No known vulnerabilities found`.
- El run terminó en `success`, pero la revisión de logs encontró defectos en el resumen: las comillas dobles alrededor de backticks provocaron sustitución de comandos Bash (por ejemplo, SHA, versiones y la mención del override), y `pnpm outdated -r` no produjo un listado visible. Por tanto, el run exitoso no prueba que el inventario de actualizaciones estuviera completo.
- Rama de corrección: `fix/dependency-watch-report-20261029`. Se corrigió el uso de `printf` para preservar Markdown, se cambió la consulta a `pnpm -r outdated` para mostrar también majors estables y se aclaró que una salida vacía requiere inspección, no significa que no existan actualizaciones.
- Estado: corrección en revisión; no se ha verificado todavía un nuevo run con el código corregido. La auditoría de paquetes y la actualización real de dependencias siguen pendientes; no se modificó ningún paquete ni lockfile en esta corrección.
- Sin cambios a secretos, Neon, datos reales ni despliegues.


## 2026-10-29 — fusiones seguras y recuperación sintética

- Fusionadas por squash [PR #140](https://github.com/BTF14/Micro-app/pull/140) (commit `4fe2b00ed45cf5b779f44b65bcd00133745760e3`) y [PR #142](https://github.com/BTF14/Micro-app/pull/142) (commit `c87893313534049463917af5ee17dfd36ba319c4`) tras revisar diff y checks.
- Confirmado que los checks post-merge del SHA `c87893313534049463917af5ee17dfd36ba319c4` acabaron todos en `success`, incluidos CI, Playwright, PostgreSQL migration, Semgrep, Security, Trivy, scan de historial y builds de Cloudflare.
- Se implementó y verificó la prueba sintética poblada en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, relaciones y exclusión de tablas efímeras pasaron. No se tocaron Neon ni datos reales. RPO/RTO, alertas y prueba con una copia real siguen pendientes.


## 2026-10-29 — PR #143 y cierre de la prueba sintética de recuperación

- PR [#143](https://github.com/BTF14/Micro-app/pull/143) se fusionó por squash; merge commit/main: `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`.
- Checks post-merge de ese SHA: Pages, Workers, CI, Chromium, migración PostgreSQL, análisis estático, Trivy, escaneo de historial y dashboard terminaron en `success`.
- La prueba sintética de backup/restore [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) pasó en el SHA final de la PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Datos sintéticos relacionados; clave age temporal; checksum; restore; manifiesto de 13 tablas/constraints/relaciones; exclusión de tablas efímeras. No tocó Neon ni datos reales.
- El monitor diario [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) terminó en `success` y el audit reportó `No known vulnerabilities found`. Su SHA precede la fusión de #142; no es evidencia de auditoría en el main actual.
- La rama `fix/dependency-watch-report-20261029` está 4 commits detrás y 0 ahead; el workflow coincide con main, por lo que no se abrió PR duplicada.
- Pendiente: RPO/RTO real, alerta de fallo, coste $0, y evaluar upgrades mayores de frontend/TypeScript con análisis de compatibilidad. No tocar Neon `main`, secretos ni producción.


## 2026-10-29 — backup workflow failure and corrective change

- Observed manual run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763) fail at retention with exit code 2. The logs show the dump, age encryption, and SHA-256 checksum succeeded; commit existed only in the temporary clone and push was never reached.
- Exact cause: from `$GITHUB_WORKSPACE/backups-repo`, relative path `../scripts/prune_backups.py` points outside the checkout root. It is now changed on `fix/backup-workflow-path-20261029` to `$GITHUB_WORKSPACE/scripts/prune_backups.py`.
- Also pin `runs-on: ubuntu-24.04` to avoid silently following the `ubuntu-latest` migration to Ubuntu 26 before this operational workflow is explicitly tested there. The Ubuntu warning was not the direct cause of the failure.
- No claim of a new persisted backup: `git push` did not run. Verify PR checks and then a fresh manual run before considering resolved.


## 2026-10-29 — backup fails due to pg_dump major version mismatch

- Manual run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) showed PostgreSQL server 18.6 but runner executed pg_dump 16.15, aborting before a dump existed. Later steps were skipped; no upload or retention ran.
- Corrective change on `fix/backup-pg-dump-v18-20261029`: install PostgreSQL 18 client, use the explicit binary `/usr/lib/postgresql/18/bin/pg_dump`, and fail early unless `--version` reports major 18.
- Keep incident open until checks and a complete manual backup prove remote persistence and checksum.


## 2026-10-29 — backup run #7 fails due to missing checkout

- Run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) succeeded through PostgreSQL 18.6 dump, age encryption and SHA-256 checksum, then failed at retention because `$GITHUB_WORKSPACE/scripts/prune_backups.py` was not present.
- Confirmed root cause in workflow: no `actions/checkout` step existed. The path refers to a real repository script, but the runner workspace was empty of source files.
- Branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` before any repository-dependent commands. Since failure happened before push, the run did not persist a new backup or execute remote retention.
- Keep unresolved until a verified successful manual run and remote file/checksum evidence.


## 2026-10-29 — backup run #8 succeeded end-to-end

- Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) passed all steps.
- Verified `pg_dump 18.6`, dump generation, age encryption, SHA-256 checksum, commit `2b038bd` and successful push to private backup repository. Files are `daily/backup-2026-10-29T17-29-48Z.dump.age` and matching `.sha256`. Retention completed and deleted zero files.
- This closes the incident chain for the operational upload path. Remaining independent tasks: verify checksum remotely, test decrypt/restore safely with the protected private key, measure RPO/RTO, validate failure alert delivery, and confirm cost assumptions. Do not conflate synthetic restore CI with restoring this exact production backup.


## 2026-10-29 — hardening HTTPS de FRONTEND_ORIGIN iniciado

- Main consultada en vivo: `0ba45e47daa5af9bbd9034690443405aa8bedf44`. PR #154 abierta y sin reviews; ocho workflows del SHA `b4508fda6f4d5f042dbeb2b48c7c9910a8c3852d` terminaron success, pero Codex falló por cuota y no hay revisión independiente. No fusionar PR #154 hasta cumplir su gate.
- Confirmada divergencia entre `getConfiguredFrontendOrigin` de `google-auth.ts` y el validador global de `index.ts`: el primero aceptaba HTTP no local. No hay evidencia de explotación.
- Creada rama `fix/google-auth-frontend-origin-https-20261029` desde main para una corrección acotada y tests de regresión. En esta fase no se modificaron secretos, Neon, datos, migraciones ni producción.
- Pendiente: completar tests, verificar diff/CI en SHA exacto y revisión. No declarar el hallazgo cerrado antes del merge.


### Verificación CI de PR #155 — 2026-10-29

- SHA `18cf2f158552ce7c97bacc66018e0cfdae60e2d3`: los ocho workflows asociados finalizaron en `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Dependency review, Secret history scan y Project progress dashboard.
- CI ejecutó build/typecheck, unit tests y PostgreSQL auth integration tests; Playwright browser tests también completaron con éxito.
- Revisión manual del diff: cambio acotado al helper de validación y su prueba; no cambia flujo OAuth/bootstrap, DB, secretos ni despliegue. PR #155 aún abierta; falta integrar a main y verificar el estado post-merge. Codex no pudo revisar por cuota; no se afirma revisión independiente.


## 2026-10-29 — PR #155 fusionada y continuidad reconciliada

- Main avanzó a `5a9bdc5a18a54c3c68639f52125d913d4e725b91`, merge commit de PR #155.
- PR #155 implementó validación HTTPS en Google OAuth, permitiendo HTTP solo para loopback y rechazando credenciales, rutas, query, fragmentos y origen no canónico.
- En SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`, los ocho workflows consultados finalizaron success. CI cubrió build/typecheck, unit tests y PostgreSQL auth integration; Playwright E2E también pasó.
- Codex review no pudo completarse por límite de uso; no se registra revisión independiente. Cloudflare generó previews automáticos de Pages/Workers, no despliegue productivo.
- PR #154 quedó obsoleta/stale al avanzar main; su contenido documental se traslada/reconcilia en PR #156. No fusionar PR #154.
- No se tocó Neon main, secretos, datos reales ni producción; no se ejecutaron migraciones ni se habilitaron recursos pagos.

---

## 2026-10-29 — Dirección SaaS y continuidad de arquitectura

Se consolidó la dirección recomendada para Micro app: una plataforma multi-organización, multi-sucursal y multiusuario; catálogo compartido por organización por defecto; stock por sucursal/almacén; caja y operaciones vinculadas a sucursal; usuarios multi-organización y roles con alcance. Se añadieron criterios de BCV programado con validación/histórico/fallback, búsqueda por barcode/SKU con SQL indexado, caché condicionada a mediciones, confirmación transaccional de venta, idempotencia, auditoría y medición de límites Neon/Cloudflare. La especificación está en `docs/SAAS_ARCHITECTURE_DECISIONS.md`.

Estado: documentación/diseño únicamente; no se implementaron API BCV, buscador, caché de catálogo, sucursales, almacenes, cajas ni endpoints comerciales. La matriz de permisos sigue pendiente de aprobación. Capacidad SaaS sin medir. Se reutiliza PR #156 para evitar PR documental duplicada; verificar checks/revisión del HEAD actualizado antes de considerar merge.


## 2026-10-29 — Auditoría estática de API/esquema y CI documental

En `main` SHA `5a9bdc5a18a54c3c68639f52125d913d4e725b91` se revisaron `apps/api/src/index.ts`, `tenant-context.ts`, `database.ts`, `auth.ts`, migraciones `0001_initial.sql` y `0002_google_identity.sql`, además de `API_INTEGRATION.md`, `DATABASE_SCHEMA.md` y `SCHEMA_REVIEW.md`.

Hechos observados: la API registra rutas de autenticación y `GET /health`, no rutas comerciales; tenant context devuelve user/organization/role y comprueba membresía activa, pero explícitamente no autoriza operaciones ni tiene branch scope; `products.stock_quantity` es por organización; existen índices únicos tenant-scoped de SKU/barcode y B-tree sobre `(organization_id, lower(name))`; existe tabla global `exchange_rates`; no hay sucursales/almacenes/cajas/turnos/compras/devoluciones. El helper actual abre `Client` request-scoped y ofrece transacción interactiva; se documentó evaluar HTTP `neon()` para lecturas sencillas y reservar `Client` para operaciones atómicas, siempre con benchmark y pruebas.

CI documental: para HEAD `8c15e13fa001a14a0ddf9f2432bc17efb30d476d`, los 8 workflows consultados finalizaron success, incluyendo todos los contexts requeridos de protección. Se añadieron luego commits documentales hasta `23cbb313ebb163d3c808f8d0953b85645262c520`; para ese SHA posterior no se obtuvieron runs/statuses. No afirmar CI verde en el HEAD actual. PR #156 sigue abierta, sin reviews, y su metadata reportó mergeable=false; no fusionar.


## Reconciliación documental de identidad, README y SaaS — 2026-10-30

- Rama: `docs/reconcile-main-after-pr155-20261029`; PR [#156](https://github.com/BTF14/Micro-app/pull/156).
- Actualizados `README.md`, `AGENTS.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CONSTITUTION.md`, `docs/SCHEMA_REVIEW.md`, `docs/CURRENT_STATE.md` y `docs/HANDOFF_NEXT_CHAT.md`.
- README ahora refleja que Google OAuth + allowlist/bootstrap seguro y sesión revocable están implementados según PR #153/#155; contraseña permanece fail-closed; MFA, recuperación y limpieza completa de sesiones pendientes. No afirma que existan endpoints comerciales ni sucursales.
- Se aclara que SaaS multi-organización/multi-sucursal es arquitectura de destino documentada, no esquema/funcionalidad desplegada. Capacidad sigue sin medir.
- Se incorpora regla obligatoria: actualizar README después de cada avance concreto y verificado, distinguiendo implementación de propuestas; no publicitar capacidades incompletas.
- Constitución y SCHEMA_REVIEW reconciliadas para que los hallazgos de auth del 2026-10-17 se lean como históricos/supersedidos, preservando el análisis SQL útil.
- Alcance solo documental. No se cambió código, esquema, migraciones, workflows, secretos, Neon, datos reales ni producción.
- Verificación pendiente: consultar HEAD final y workflows de ese SHA exacto; revisar diff completo y obtener revisión independiente antes de fusionar. No reutilizar resultados de CI de HEAD previos.


## 2026-10-30 UTC — precisión de rate limiting y revisión de rama histórica

- La búsqueda de símbolos y callsites en `apps/api/src` no encontró runtime rate limiting; `auth_rate_limits` aparece en DDL y tests, no como mecanismo activo. Se corrigieron `API_INTEGRATION.md` y `SECURITY_ROADMAP.md` para no afirmar controles inexistentes. Verificar reglas Cloudflare aparte y diseñar protección distribuida compatible con Workers.
- La rama `feat/neon-transaction-adapter` se comparó con main: 14 commits ahead y 242 behind. Su PR [#1](https://github.com/BTF14/Micro-app/pull/1) ya está fusionada desde 2026-10-17, merge `b6511d0876e33096f75df2466653449165888821`; no se debe reabrir ni fusionar la rama antigua.
- La auditoría permanece estática/read-only. No se ejecutó SQL ni se accedió a Neon `main`, producción, secretos o datos reales.


## 2026-10-30 UTC — reconciliación de alcance de catálogo y autoridad de allowlist

- Se corrigió la matriz de permisos: el catálogo maestro se propone compartido a nivel organización, pero esto no habilita acceso a stock, movimientos, ventas o caja de otras sucursales; los roles operativos requieren asignación de sucursal.
- Se eliminó la recomendación de que el rol tenant `owner` gestione la allowlist global. D1 exige un operador autenticado/auditado, pero el rol/identidad de plataforma y su recuperación no están definidos; el email concreto citado en `SECURITY_PLAN_2026.md` se trata como propuesta histórica, no como autorización vigente.
- La matriz permanece **NO aprobada**. No implementar estos permisos ni crear endpoints administrativos hasta que el propietario confirme la autoridad de plataforma y los permisos sensibles.


## 2026-10-30 UTC — PR #157 abierta para integrar auditoría y continuidad

- Se abrió [PR #157](https://github.com/BTF14/Micro-app/pull/157) desde `docs/post-pr156-audit-continuity-20261030` con alcance documental/auditoría acotado. Incluye la reconciliación de alcance de catálogo y la separación de autoridad global de allowlist respecto a roles tenant.
- La PR permanece abierta hasta que los checks requeridos pasen en su HEAD exacto y se complete revisión manual final. No se fusiona por inercia ni se usan resultados de SHAs anteriores.


## 2026-10-30 UTC — verificación post-merge PR #158/#159 y corrección de continuidad

- GitHub confirmó `main` en `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`, protegido; PR #158 y #159 fusionadas; cero PR abiertas en la consulta.
- Checks del SHA exacto: 9/9 success, incluidos Workers Build y Cloudflare Pages.
- Pages producción cargó la pantalla de acceso; Worker `/health` respondió HTTP 200, `status=ok`, `stage=scaffold`. No se probaron sesiones ni operaciones comerciales.
- Neon metadata read-only: plan free_v3, PostgreSQL 18; 3/10 ramas; main 32,866,304 bytes; transferencia 5,645,769 bytes, compute 5,911 s, activo 23,240 s en el periodo 2026-10-17 a 2026-11-01. Main y ramas reportadas sin protección; configuración de IP allowlist vacía. No se leyó ni modificó SQL/datos/secretos.
- Se detectó que README/continuidad seguían afirmando que PR #158/#159 estaban abiertas y README describía toolchain anterior. Se actualiza esa contradicción en esta rama, manteniendo los snapshots viejos como historia.
- No se cambió producción, Neon, Cloudflare settings, secretos, DNS ni billing.

## 2026-10-30 UTC — protocolo de checkpoints incrementales y continuidad ante interrupción

- Se verificó PR #160 en vivo: abierta, no draft, no fusionada; rama `docs/continuity-post-158-159-20261030`; HEAD consultado antes de esta actualización: `ce4578fed5980631f59206bd45ced3fbefcce346`.
- Se recuperó la actividad de revisión: Codex no completó la revisión por límite de uso. Estado registrado como revisión incompleta, no como aprobación ni defecto confirmado.
- Cloudflare había reportado Pages y Worker preview exitosos en el HEAD anterior; no se consideran pruebas de producción.
- Se revisó el diff de PR #160 y la política de colaboración existente. Se detectó que la obligación de documentar hitos no definía cuándo guardar durante una tarea larga.
- Se añadió la sección 10 a `docs/AI_COLLABORATION_AND_PR_POLICY.md`: checkpoints después de cada bloque significativo, tras pruebas/hallazgos/bloqueos y antes de tareas largas; campos obligatorios; sincronización de CURRENT_STATE, STATE_JOURNAL, HANDOFF y WORK_CHECKPOINT; clasificación INCOMPLETO cuando no existe evidencia persistida.
- Se creó `docs/WORK_CHECKPOINT.md` como punto de reanudación operativo único para tareas de varios pasos. Se actualizaron CURRENT_STATE y HANDOFF para dirigir al siguiente agente a ese archivo y evitar reconstruir el chat.
- Commits de este bloque registrados por GitHub: política `f26dcca32f029edb8782ad71da8c86bcc11b4a8d`; checkpoint `63a8c752c21500ae8f45305c997ac4123e98f40e`; los commits posteriores de sincronización deben verificarse consultando el HEAD final.
- No se ejecutaron pruebas locales ni se modificó código, esquema, migraciones, workflows, secretos, Cloudflare settings, Neon, DNS, billing o producción.
- Pendiente: confirmar HEAD final, checks del SHA exacto, revisar manualmente el diff completo y comprobar que los documentos se mantienen coherentes. PR #160 sigue sin fusionar; no fusionar sin autorización explícita.

## 2026-10-30 UTC — verificación final del checkpoint incremental en PR #160

- PR #160 sigue abierta, no draft y no fusionada; base SHA `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; último HEAD consultado antes de esta entrada: `0e6c27bac8a9ef1a9d80da109a136c34aec99a9a`; 14 commits y 8 archivos.
- Para ese HEAD, `fetch_commit_workflow_runs` y combined commit status devolvieron listas vacías. Estado correcto: CI de ese SHA no verificado; no declarar verde ni rojo.
- Codex review de `ce4578f` quedó incompleta por cuota agotada. No hay aprobación automática; la revisión manual consolidada del diff actual sigue pendiente.
- Se corrigió la afirmación de protección de rama en CURRENT_STATE, HANDOFF y PROJECT_PLAN: la protección de GitHub no se pudo confirmar por API; no presentarla como activa/verificada.
- WORK_CHECKPOINT registra la secuencia, evidencias, limitaciones y siguientes acciones. No hubo cambios de código ni infraestructura y no se fusionó la PR.

## 2026-10-30 UTC — revisión manual y corrección de checkpoint antes de merge PR #160

- Se verificó PR #160: abierta, no draft, no fusionada, `mergeable=true`; HEAD previo `bcc667fc6ccd154b8e4f93f041e33d16c29195f0`; 18 commits, 8 archivos.
- Workflow runs para ese HEAD: CI `41002801690` en estado `pending`; siete workflows adicionales success. Combined status vacío. CI global no está completo.
- No hay reviews humanas ni threads inline registrados. Codex review falló por cuota en `ce4578fed5980631f59206bd45ced3fbefcce346`; no es aprobación.
- Revisión manual encontró datos obsoletos en WORK_CHECKPOINT (HEAD y cantidad de commits) y referencias iniciales antiguas en CURRENT_STATE/HANDOFF. Se actualizó WORK_CHECKPOINT y se sincronizaron CURRENT_STATE, HANDOFF_NEXT_CHAT y PROJECT_PLAN. Este journal registra el hito; volver a consultar SHA final tras los commits.
- Diff de PR #160 sigue siendo documental: README, política de colaboración, capacidad Neon, estado, handoff, plan, diario y checkpoint. No se tocaron código, migraciones, workflows, secretos, infraestructura ni producción.
- Decisión: no fusionar mientras CI esté pending/no verificado; fusionar solo cuando checks requeridos terminen en el HEAD exacto y no haya hallazgos materiales.

## 2026-10-30 UTC — sincronización final del handoff antes de cerrar bloque documental

- Se refrescó CURRENT_STATE y HANDOFF_NEXT_CHAT después de la revisión manual de PR #160.
- SHA del padre del último commit documental previo a esta entrada: `2747ae34849d8fe86e2da198779701ce97e3a711` (consultar el HEAD real después de este commit).
- Gate sigue siendo no fusionar con CI pendiente/no verificado. El último SHA con evidencia CI consultada fue `bcc667fc6ccd154b8e4f93f041e33d16c29195f0`, con workflow CI pending y siete workflows success.
- La revisión documental continúa en la misma PR #160; no se abrió PR adicional ni se modificó código o producción.

## 2026-10-30 UTC — precisión de branch protection y revisión de seguridad

- La consulta actual de `GET /repos/BTF14/Micro-app/branches/main/protection` devolvió HTTP 403 `Resource not accessible by integration`. No fue posible revalidar en vivo la protección de main.
- Se corrigió `docs/SECURITY_ROADMAP.md`: la configuración de protección y seis checks se conserva como evidencia histórica del 2026-10-26, no como estado actual confirmado. Se mantiene la recomendación de al menos una aprobación independiente.
- La auditoría de código en main confirma que no hay rutas comerciales; `resolveTenantContext` es helper aislado y no aplica permisos de operación ni sucursal. La matriz de permisos sigue no aprobada.
- La rama `feat/neon-transaction-adapter` existe, pero corresponde a PR #1 ya fusionada; está 14 commits ahead y 245 behind de main. No reabrir ni fusionar. Los cambios funcionales del adaptador ya están integrados en main.
- No se modificó código ni configuración productiva. Siguiente gate inmediato sigue siendo CI de PR #160 en el HEAD nuevo.


## 2026-10-30 UTC — PR #160 fusionada y continuidad post-merge

- PR [#160](https://github.com/BTF14/Micro-app/pull/160) se fusionó mediante squash a las 04:36:49 UTC. Merge commit y main HEAD verificado: `be6f19486caf5cf3605c6ca6615f87e305822ea7`.
- HEAD de PR probado: `fcb4269a459831be7858358c56e90346d5e4e9a6`. Los 12 check runs del SHA terminaron en success: verify, Chromium, postgres-migration, Semgrep, Trivy, secret-history, dependency review, progress dashboard, Cloudflare Pages y Workers Builds (incluyendo contextos duplicados push/PR).
- PR #160 cambió nueve archivos documentales; no modificó código de aplicación, migraciones, workflows, secretos ni infraestructura.
- Codex review no pudo completarse por cuota; se usó revisión manual fallback. No se encontraron hallazgos materiales; no hubo review humana ni threads inline.
- Cloudflare confirmó previews Pages/Workers en el HEAD de PR. No se verificó despliegue productivo post-merge.
- La API de branch protection devolvió HTTP 403; la última evidencia del 26 oct se conserva como histórica y no como configuración actual confirmada.
- Se actualizan CURRENT_STATE, HANDOFF, PROJECT_PLAN y WORK_CHECKPOINT para que el siguiente chat parta del merge SHA y no trate PR #160 como abierta.
- Próximo bloque: aprobación de matriz de roles, ERD de sucursal/almacén/caja/turno, autorización por operación, rate limiting y consistencia transaccional antes de endpoints comerciales. No tocar Neon main.


## 2026-10-30 UTC — PR #161 fusionada; checkpoint post-merge finalizado

- PR [#161](https://github.com/BTF14/Micro-app/pull/161) se fusionó mediante squash a las 04:40:49 UTC; merge SHA `c7abcb477afd649161176aad8cae707f5e42f632`; GitHub confirmó main en ese SHA.
- HEAD probado de PR #161: `a17a4b95312876f0bf4b201c6a84a323fb69fa3b`. Los 12 check runs terminaron en success.
- PR #161 modificó cinco documentos; no tocó código, migraciones, workflows, secretos ni infraestructura.
- Codex review falló por cuota; revisión manual fallback completada sin hallazgos materiales. Cloudflare previews success; no se confirmó despliegue productivo.
- Se cierra la sincronización documental posterior a PR #160. Regla: los siguientes checkpoints se actualizan dentro de la PR de trabajo, evitando PR separadas solo para cada checkpoint.
- Siguiente bloque: arquitectura multi-sucursal, aprobación de matriz de roles, autorización por operación, rate limiting, consistencia/idempotencia y pruebas PostgreSQL aisladas.


## 2026-10-30 — políticas comerciales propiedad de cada organización

- Base GitHub verificada: main `4ab229296d8858c8c553e00a633a762b9c26a81b`; cero PR abiertas al inicio del bloque.
- Se creó el diseño `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md` para configuración versionada por organización, validación server-side, aislamiento, snapshots de venta y auditoría.
- Se alinearon la matriz de permisos y `SAAS_ARCHITECTURE_DECISIONS.md`: se elimina la recomendación de umbral universal del 10 %. Cada organización decide sus condiciones comerciales; la plataforma no impone descuentos.
- La matriz sigue pendiente de aprobación; no se interpretó esta aclaración como aprobación de todos los permisos o excepciones.
- Solo documentación; no se cambiaron código, esquema, workflows, servicios ni datos. No se ejecutaron pruebas runtime.
- Próximo gate: ERD multi-sucursal y cierre explícito de la matriz antes de cualquier implementación comercial.


## 2026-10-30 — PR #163 fusionada y diseño ERD multi-sucursal iniciado

- PR #163 fusionada por squash; merge/main confirmado: 894895cfeee1c3d67b1e92bf1fae7d0c30cd36f9.
- En el HEAD probado de PR 163 (4b9a2b3993115b798ae4a78e3e0318dbdf50c24e), ocho workflows terminaron success: CI, Playwright, migración PostgreSQL, Semgrep, Trivy, secret history, Dependency Review y Project progress.
- Se revisó el diff documental; no hubo reviews humanas/threads inline y Codex no se ejecutó.
- Se inició rama docs/multibranch-erd-architecture-20261030 desde el merge #163.
- Se añadió docs/sdd/MULTI_BRANCH_DATA_MODEL.md con ERD conceptual, claves tenant-scoped, branch memberships, warehouses, registers/shifts, balances/ledger, ventas/pagos, compras/transferencias, idempotencia, último owner y auditoría.
- La propuesta se contrastó con apps/api/migrations/0001_initial.sql y SCHEMA_REVIEW. No se modificó SQL/runtime ni se ejecutaron pruebas de runtime; no se accedió a Neon.
- Matriz de permisos continúa NO APROBADA; políticas comerciales siguen bajo control de cada organización.
- Siguiente paso: revisión de coherencia del documento y de los cambios de continuidad; PR única de diseño, checks CI/SAST, sin implementación hasta cerrar gates.


## 2026-10-30 UTC — branch scope context en preparación

- Revalidado main en `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`; PR #164 fusionada; no PR abiertas al inicio.
- El propietario autorizó alcance general de sucursal: owner/admin organización-wide; cashier/inventory requieren asignación activa. La matriz de permisos sensibles permanece pendiente.
- Rama `feat/branch-scope-context-20261030`: migración aditiva branches/branch_memberships, resolver server-side, pruebas unitarias, assertions PostgreSQL y actualización de continuidad.
- La migración se valida en PostgreSQL 18 efímero por CI. No aplicar a Neon main ni datos reales.
- Estado final y SHA de PR/checks deben añadirse tras la ejecución real de Actions y revisión del diff.

- Verificación en HEAD `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b`: CI, tests unitarios, auth integration (18), branch context PostgreSQL integration (3), migration validation, Playwright, Semgrep, Trivy, secret-history, dependency review, backup smoke y Cloudflare Pages/Workers previews finalizaron success. La primera ejecución del test branch falló solo por cleanup incompleto de un fixture; se corrigió y la ejecución siguiente pasó 3/3 sin warning de uso concurrente del cliente pg. Codex review agotó cuota; revisión manual fallback, sin reviews humanas ni threads.


## 2026-10-30 UTC — reconciliación post-PR #165 y decisión de caja/turnos

- Main verificado en `1d10befe0cd3367e04bd8998a192e93d9b228063`; PR #165 fusionada por squash y no había PR abiertas al inicio de este bloque.
- Los 9 check-runs consultados directamente en el merge SHA terminaron `success`: verify, Chromium auth smoke, postgres-migration, Semgrep, Trivy, secret-history, generate-progress, Cloudflare Pages y Workers Builds. Pages reportó `Deployed successfully`; Workers build success. No se verificó de forma independiente routing autenticado, sesión OAuth ni operaciones comerciales live.
- Se detectó que CURRENT_STATE, HANDOFF y WORK_CHECKPOINT seguían encabezados en post-#161/#163 y trataban #164 como activa; se reemplaza su portada operativa y se conservan entradas antiguas como historia. PROJECT_PLAN recibe una prioridad vigente post-#165.
- La PR #165 añadió branches/branch_memberships y resolver aislado. Migración 0003 no aplicada a Neon main; no hay endpoints comerciales; resolver de sucursal no conectado a rutas.
- Decisión de diseño de caja/turnos: un turno abierto por un cajero y una caja; no compartir ni transferir; cambio de responsable mediante cierre y nueva apertura. Se propone índice único parcial por caja y por cajero/organización. Overrides de supervisión quedan pendientes de matriz de permisos.
- Decisión de entorno: PostgreSQL 18 efímero en CI como primera línea de migraciones/pruebas desde cero. Neon branches solo para validaciones adicionales justificadas, con expiración y limpieza. Neon main no se usa como laboratorio.
- No se aplicó SQL a Neon, no se creó/modificó Neon branch, no se tocó Cloudflare settings, secretos, DNS, billing ni producción. La lectura de ramas Neon no devolvió resultado utilizable; no se infiere cantidad de ramas.
- Trabajo actual solo documental, en rama `docs/post-pr165-register-shift-design-20261030`; el nuevo SDD es `docs/sdd/REGISTER_SHIFT_MODEL.md`. No se modificó runtime ni README porque no se cerró una capacidad de producto.
- Próximo bloque: revisar diff/checks de esta PR; después implementar migration 0004 y tests PostgreSQL efímeros, sin endpoints comerciales.


## 2026-10-30 UTC — auditoría de continuidad y discrepancias post-PR #165

- Estado GitHub revalidado: repositorio `BTF14/Micro-app`; `main` = `1d10befe0cd3367e04bd8998a192e93d9b228063`; PR #166 abierta, base main, rama `docs/post-pr165-register-shift-design-20261030`, HEAD consultado `8044a6614b847d580e6e1f755433f05d2b141b75`. No hay otra PR abierta en la consulta.
- Para ese HEAD se verificaron 8 workflows de GitHub Actions en `completed/success`: CI, Playwright E2E, Database migration validation (0001–0003 + assertions en PostgreSQL efímero), Security scan/Trivy, Semgrep SAST, Secret history scan, Dependency Review y Project progress dashboard. Se inspeccionaron jobs/steps. No hay reviews humanas ni threads inline.
- El combined status no devolvió status checks y la consulta no confirmó checks externos Cloudflare Pages/Workers para ese HEAD. No se declara verde Cloudflare ni se reutiliza evidencia de otro SHA. Codex no se reintentó por la limitación de cuota previamente registrada.
- Revisión manual encontró discrepancias no cubiertas por los nueve archivos iniciales de PR #166: `docs/SCHEMA_REVIEW.md` y `docs/DATABASE_SCHEMA.md` todavía afirmaban que branches/branch_memberships no existían; `docs/sdd/MULTI_BRANCH_DATA_MODEL.md` aún etiquetaba sucursales/asignaciones como no implementadas y la separación de asignaciones como pendiente sin distinguir la parte ya implementada.
- Se actualizan esos inventarios para reflejar que PR #165 versionó `0003_branch_scope.sql`, creó `branches`/`branch_memberships` y añadió `resolveBranchContext`, validado en PostgreSQL 18 efímero. Se conserva la limitación: la migración 0003 no se aplicó a Neon main; el resolver no está conectado a rutas; no existen handlers comerciales; warehouses/registers/register_shifts/inventory_balances siguen pendientes; la matriz comercial continúa NO APROBADA.
- Los documentos operativos registran PR #166 como activa y distinguen checks de Actions de checks externos no verificados. Cada actualización cambia el HEAD, por lo que los checks anteriores no certifican el HEAD final.
- No se fusionó ninguna PR, no se aplicó SQL a Neon, no se crearon ramas Neon, no se modificaron Cloudflare settings, secretos, DNS, billing ni producción.
- Siguiente trabajo técnico tras cerrar la revisión documental: diseñar e implementar migración aditiva 0004 para cajas/turnos, assertions SQL, pruebas PostgreSQL 18 desechables desde cero y pruebas de concurrencia; sin endpoints comerciales ni cambios en Neon main.



## 2026-10-30 UTC — implementación de cajas/turnos 0004 y primer ciclo CI

- Se creó la rama `feat/register-shifts-0004-20261030` apilada sobre la documentación de PR #166 y se abrió PR #167 contra main para ejecutar workflows de PR.
- Se añadió `apps/api/migrations/0004_register_shifts.sql`: tablas `registers`/`register_shifts`, FKs compuestas tenant/branch-scoped, códigos únicos por sucursal, índices parciales para un turno abierto por caja y por cajero/organización, importes de efectivo USD/VES separados, trigger de apertura con bloqueo de filas de scope, lifecycle de turno (solo cierre completo; no UPDATE/DELETE posterior) y triggers que impiden desactivar/revocar scope con turnos abiertos.
- Se añadió `0004_register_shifts.assertions.sql` con assertions de scope, rol cashier, assignment activa, importes, unicidad, lifecycle y revocaciones; corre dentro de BEGIN/ROLLBACK.
- Se extendieron `.github/workflows/ci.yml` y `migration-check.yml` para aplicar 0001–0004 desde cero en PostgreSQL 18 efímero y ejecutar `register-shifts.integration.test.ts`, con dos pruebas de concurrencia.
- HEAD inicial de PR #167 `0b5a9adbdafce25a8483e7ce6953e2d83a826c47`: migration-check pasó; CI build/typecheck, unit tests, auth integration y branch integration pasaron; register-shifts integration falló porque el test esperaba 23503, pero el trigger fail-closed devolvía 23514 antes de que las FKs evaluaran referencias inexistentes. E2E, backup restore smoke, Semgrep, Trivy, Dependency Review, secret scan y dashboard pasaron.
- Corrección comprometida en `4008ec7c09785298dc733e5e0c492cea34ad6f43`: `validate_register_shift_opening` deja que las FKs compuestas rechacen referencias ausentes (23503) y reserva 23514 para scope existente pero inactivo/no-cashier. Migration validation y controles no-CI volvieron a pasar en ese SHA; CI estaba en curso.
- Se sincronizaron CURRENT_STATE, HANDOFF_NEXT_CHAT, PROJECT_PLAN, WORK_CHECKPOINT, REGISTER_SHIFT_MODEL, DATABASE_SCHEMA, SCHEMA_REVIEW, API_INTEGRATION, MULTI_BRANCH_DATA_MODEL, SAAS_ARCHITECTURE_DECISIONS y COMPLIANCE/SECURITY plan para distinguir main 0001–0003 del candidato 0004 de PR #167.
- PR #166 sigue abierta; HEAD documental revisado `4cee6e2ff6bfb8f3eecd85b4ff9212c1ab6d98fd`, 8/8 workflows Actions success. PR #167 sigue abierta; los commits de documentación posteriores al snapshot 4008 vuelven a cambiar HEAD y requieren revalidar todos los checks.
- No se fusionó ninguna PR, no se aplicaron 0003/0004 a Neon main, no se crearon Neon branches ni se tocaron Cloudflare settings, secretos, DNS, billing, producción o datos reales.
- Límites: no hay endpoints comerciales, helper de turno runtime ni autorización por operación; matriz de permisos sigue NO APROBADA. No se calcula efectivo esperado/diferencia sin ledger de caja.
- Siguiente: terminar CI de PR #167 en su SHA final, revisar manualmente la migración/assertions/concurrencia y luego decidir integración de PR #166/#167 con autorización expresa.



## 2026-10-30 UTC — PR #166/#167 fusionadas y reconciliación post-merge

- PR #166 fusionada primero mediante merge commit `8a16b4bf70e3b35c45e91366148f4a37aa43b5e7`; su HEAD `4cee6e2ff6bfb8f3eecd85b4ff9212c1ab6d98fd` tuvo 8/8 workflows Actions success.
- PR #167 fusionada después mediante merge commit `c1cd8650db33aa4a249eaf1f55d321513d576e10`; su HEAD `ad45911368e9e9a714ebbe014de2d84a7b3cf1de` tuvo 10/10 workflows Actions success, incluidos CI con register-shifts integration, migration validation 0001–0004, Playwright, backup restore PG18, Semgrep, Trivy, Dependency Review, secret history, SDD validation y dashboard.
- No hubo reviews formales de GitHub ni threads inline; Codex no completó por cuota. Se hizo revisión manual del diff, migración 0004, assertions y pruebas; no presentar como review humana/Codex.
- Main versiona ahora migraciones 0001–0004. No se aplicaron 0003/0004 a Neon main; no se crearon Neon branches. Las pruebas fueron en PostgreSQL 18 desechable.
- Cloudflare Pages/Workers mostró previews; no se modificó configuración ni se hizo deploy manual. No afirmar que esta sesión verificó producción post-merge.
- Se abrió la rama `docs/post-merge-166-167-continuity-20261030` para corregir referencias que aún presentaban #166/#167 como abiertas/candidatas. Se actualizaron portadas de CURRENT_STATE, HANDOFF, WORK_CHECKPOINT y PROJECT_PLAN, además de README, AGENTS, API/schema/readiness/compliance/architecture/SDD y backup docs. Las entradas históricas inferiores se conservan como historia y quedan supersedidas por las portadas vigentes.
- Siguiente tarea: helper aislado para resolver el turno abierto del cajero autenticado, con pruebas PostgreSQL efímeras; no añadir endpoints comerciales hasta aprobar matriz y autorización por operación.
- No se modificaron secretos, datos reales, DNS, billing ni configuración Cloudflare. No se ejecutó SQL en Neon main.


## 2026-10-30 UTC — inicio del helper de turno abierto del cajero autenticado

- Revalidación en vivo: `main=e4e4a5f312522ec5efbcc3252958141f56fbd821`; PR #166/#167/#168 fusionadas; no había PR abiertas. Issues #53 y #78 continúan abiertas y no se modificaron.
- La consulta de workflow runs y combined status sobre el merge SHA e4e4a5f devolvió listas vacías; los resultados 8/8 de #166 y 10/10 de #167 corresponden a sus HEADs de PR, no al merge SHA actual.
- Se leyeron los 16 documentos obligatorios indicados por el propietario y se inspeccionaron los callers de auth/DB, branch context, migraciones 0001–0004 y tests PostgreSQL existentes.
- Diseño: helper separado consume BranchContext server-derived, exige role cashier, revalida en una consulta scope org/user/branch + estados activos + turno abierto; devuelve null si no hay turno o scope no válido. `FOR SHARE OF s` permite proteger el turno durante una transacción caller, sin abrir una transacción dentro del helper.
- Se prepararon helper, tests unitarios, integración PostgreSQL 18 desechable y paso CI. No se ejecutó SQL local ni remoto; CI aún pendiente. No endpoints comerciales ni cambios de matriz.
- Se detectaron encabezados obsoletos en DATABASE_SCHEMA/SCHEMA_REVIEW con SHA pre-#167; se reconciliaron en la rama de trabajo.
- Rama: `feat/authenticated-cashier-open-shift-20261030`, basada en el merge SHA e4e4a5f. Continuar con inspección del diff y workflows exactos antes de merge.


## 2026-10-30 UTC — PR #169 abierta y primera verificación de CI

- PR #169: https://github.com/BTF14/Micro-app/pull/169; rama `feat/authenticated-cashier-open-shift-20261030`; base main `e4e4a5f312522ec5efbcc3252958141f56fbd821`; HEAD inicial `69ef099d586070edf295e0302468e96c4667f11f`.
- Diff inicial: 11 archivos, helper aislado, tests unitarios, integración PG18, workflow CI y sincronización de continuidad/esquema.
- Revisión manual del diff completo realizada. Codex review falló por cuota; reviews formales y threads inline: 0. No se presenta como aprobación externa.
- Primera consulta: 8 workflow runs Actions en progreso. Check-runs de Cloudflare Pages/Workers, Dependency Review, Trivy, secret-history y dashboard observados en success; CI, migration, Chromium y Semgrep seguían en progreso. Reconsultar en el HEAD actual de PR, porque cualquier commit invalida esa evidencia.
- Cloudflare Pages y Workers publicaron previews para el SHA 69ef099; son previews y no despliegues productivos.
- No se ejecutó shell local ni SQL remoto. La integración usa exclusivamente el PostgreSQL 18 local sintético del workflow; Neon main no se tocó.

 
## 2026-10-30 UTC — ampliación de pruebas de aislamiento y concurrencia del helper

- Se amplió `cashier-open-shift.integration.test.ts` para verificar que no se devuelve el turno de otro cajero dentro de la misma organización/sucursal ni el turno del mismo cajero en otra sucursal de la misma organización.
- Se añadió una prueba PostgreSQL 18 de bloqueo: el `FOR SHARE OF s` mantiene bloqueado el cierre concurrente mientras el caller conserva la transacción; tras COMMIT, el cierre puede completarse.
- Esta ampliación cambia el HEAD de PR #169; las pruebas y workflows del SHA anterior son evidencia histórica y deben revalidarse sobre el nuevo HEAD.


## 2026-10-30 UTC — verificación final de PR #169 HEAD 253128c

- HEAD exacto: `253128c6f5213986879ce619da85285251c07416`; PR #169 mantiene base main `e4e4a5f312522ec5efbcc3252958141f56fbd821`.
- GitHub Actions: 8/8 workflows completed/success (CI, Database migration validation, Playwright E2E, Security scan, Semgrep SAST, Secret history scan, Dependency review y Project progress dashboard).
- API de check-runs: 14 entradas consultadas, todas completed/success, incluyendo Workers Builds y Cloudflare Pages. Las URLs reportadas por los bots son previews; no se afirma deploy de producción.
- Job CI: build/typecheck, unit tests, auth integration 18/18, branch-context integration 4/4, register-shifts integration 5/5 y cashier-open-shift integration 7/7. El último test cubre row-locking contra cierre concurrente con dos conexiones PostgreSQL.
- Migration validation aplica 0001–0004 y pasa assertions en PostgreSQL 18 desechable. Playwright, Semgrep, Trivy, Dependency Review, Secret History y dashboard success.
- Reviews formales GitHub: 0; inline review threads: 0. Codex no completó por cuota; no se trata como aprobación externa. Diff revisado manualmente.
- No se tocó Neon main, no se aplicaron migraciones remotas, no se modificaron secretos/Cloudflare settings/DNS/billing y no se crearon endpoints comerciales.


## 2026-10-30 UTC — checkpoint documental posterior a la verificación de implementación

- La implementación de PR #169 en SHA `253128c6f5213986879ce619da85285251c07416` pasó 8/8 workflows Actions y 14 check-runs observados success; 7/7 nuevas pruebas de integración PostgreSQL 18 pasaron, incluida la prueba de bloqueo ante cierre concurrente.
- Se sincronizan las portadas de continuidad con esos resultados y se distingue el SHA de implementación verificado de los commits documentales posteriores.
- Este checkpoint cambia el HEAD de PR #169 sin cambiar runtime; reconsultar los checks del SHA exacto actual antes de merge. No reutilizar el resultado de 253128 como evidencia de un SHA posterior.


## 2026-10-30 UTC — PR #169 fusionada y estado post-merge verificado

- PR #169 fusionada con merge SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`; main apunta al mismo SHA y la PR quedó cerrada/merged.
- En el merge SHA: 7/7 workflows Actions success y Cloudflare Pages/Workers 2/2 success. CI post-merge confirma build/typecheck, suites existentes y cashier-open-shift integration 7/7 en PostgreSQL 18 desechable.
- Migraciones 0001–0004 validan desde cero en PG18 efímero; 0003/0004 no se aplicaron a Neon main.
- Helper `resolveOpenCashierRegisterShift` ya está en main; no hay rutas comerciales ni autorización por operación. La matriz sigue NO APROBADA.
- PR abiertas: ninguna. Issues #53 y #78 siguen abiertos. No se alteraron.
- Reviews formales/threads inline: 0; Codex agotó cuota. Revisión manual realizada, no aprobación externa.
- Siguiente trabajo: aprobar matriz de permisos y diseñar autorización server-side por operación/sucursal antes de habilitar endpoints.


## 2026-10-30 UTC — PR #170 documental fusionada

- PR #170 fusionada en `af08cd913a4e0e155b1b74183a71efc51e5d4646`; actualizó continuidad, schema review, API integration y SDD del modelo de turnos después de PR #169.
- Post-merge de PR #170: 7/7 workflows Actions success y Cloudflare Pages/Workers 2/2 success. CI y PG18 tests pasaron; no hubo cambios runtime/esquema.
- Último merge con cambios de runtime sigue siendo PR #169 (`be35a0fde3886271b6ed98b7ccc29cc1255d50e5`). Resolver el ref actual de main en vivo antes de iniciar otro bloque.
- PRs abiertas: ninguna al momento de esta actualización; issues #53 y #78 siguen abiertos.


## 2026-10-30 UTC — PR #172 y reconciliación documental de autorización

- Main comprobado al inicio: `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`; no se modificó main.
- PR #172: https://github.com/BTF14/Micro-app/pull/172; draft, abierta, base main. Añade `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md` como propuesta técnica, no política aprobada ni autorización de implementación.
- El diseño separa autenticación, membresía de organización, scope de recurso y permiso por operación. Incluye deny-by-default, revalidación transaccional, concurrencia/TOCTOU, aislamiento tenant/branch, auditoría, catálogo y tests negativos.
- Se sincronizaron las portadas vigentes de `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md`, `WORK_CHECKPOINT.md`, `PROJECT_PLAN.md` y el contrato de estado en `API_INTEGRATION.md`; esta entrada registra el historial de la PR.
- La matriz `role-permission-decision-matrix.md` permanece NO APROBADA. No hay handlers comerciales ni autorización runtime por operación. Los helpers tenant/branch/shift no otorgan permisos comerciales.
- HEAD `93561f0b73f4992d5204f3f461af7961a0e087eb` tuvo 12/12 check-runs success. Los commits documentales de esta sincronización crean un HEAD nuevo y requieren revalidación; no transferir checks entre SHAs.
- No hubo reviews formales en la última consulta; no afirmar aprobación humana/Codex. Revisión técnica/manual, sin aprobación externa.
- No se tocó Neon main, datos reales, migraciones remotas, secretos, DNS, billing, configuración Cloudflare ni producción.
- Continuación: revisar el HEAD/diff/checks del nuevo SHA; mantener PR #172 draft; esperar aprobación explícita de matriz/decisiones comerciales antes de código. Diseñar ledger/auditoría/idempotencia antes de endpoints.



## 2026-10-30 UTC — revalidación exacta de PR #172

- Se reconsultó GitHub: main sigue en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`; PR #172 abierta/draft/no fusionada, base main, HEAD `7458928e87fe32b9d9134beabba3e0706bc57931`, mergeable true.
- Check-runs del HEAD exacto: 12/12 completed/success (Workers Builds, verify, scans, Chromium authentication smoke, postgres-migration validation, static analysis, dependency review, progress y Pages). El commit previo `93561f0...` ya no es la única evidencia: el HEAD `7458928...` también quedó verde.
- No hay reviews formales. PR contiene exactamente siete archivos documentales, +374/-0; no incluye runtime, esquema ni migraciones.
- Cloudflare Pages y Workers publicaron URLs de preview asociadas a la rama/commit. No se interpreta la etiqueta/ruta del bot Workers como prueba suficiente de cambio o validación de producción.
- Issues #53 y #78 siguen abiertas. #53 conserva como pendiente la autorización/aislamiento de futuras rutas comerciales; #78 mantiene pendiente la verificación HTTP CORS con headers observables desde un entorno con salida de red permitida.
- Se mantiene PR #172 draft. No se fusiona ni se implementan permisos comerciales antes de aprobación explícita de la matriz.
- Este registro documenta el SHA verificado. Cualquier commit documental posterior exige reconsultar checks del nuevo HEAD.


## 2026-10-30 UTC — revalidación y reconciliación documental de PR #172

- GitHub confirma `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`; PR #172 abierta, draft, base main, HEAD `87de879b021cd4b68ce4267b138832279d4a043a`.
- En el HEAD exacto `87de879b021cd4b68ce4267b138832279d4a043a`, 12/12 check-runs completed/success, sin fallos ni pendientes. No hay reviews formales ni threads inline.
- Revisión encontró portadas con estado antiguo (`c1bc901` y `93561f0`) aunque el HEAD vivo era `87de879`. Se actualizaron las portadas y los checkpoints activos de los seis documentos de continuidad/API para reflejar el HEAD actual; las entradas históricas permanecen como historial y no se presentan como estado vivo.
- La PR sigue siendo exclusivamente documental. La matriz `role-permission-decision-matrix.md` continúa NO APROBADA; no se autoriza inferir permisos, crear endpoints comerciales ni ejecutar migraciones remotas.
- Pages/Workers publicaron previews; no son certificación funcional ni despliegue productivo. Issues #53 y #78 continúan abiertas.
- No se modificó main, Neon main, runtime, esquema, migraciones, workflows, secretos, DNS, billing ni configuración de producción. Cualquier nuevo commit debe validarse por su propio SHA.


## 2026-10-30 UTC — reconciliación de modelo de roles y evidencia Cloudflare tras PR #177

- GitHub confirmó PR #177 fusionada; merge SHA y `main` observado: `82386c6e9300e06f8fa209aa52995b939a72442a`. No había PR abiertas al iniciar este bloque.
- Se detectó que portadas de continuidad seguían referidas a PR #176 / SHA `287ba4e`. Se actualizaron CURRENT_STATE, HANDOFF, PROJECT_PLAN, WORK_CHECKPOINT y API_INTEGRATION, conservando entradas históricas.
- Se detectó contradicción en `SAAS_ARCHITECTURE_DECISIONS.md` §§3/14 y `sdd/MULTI_BRANCH_DATA_MODEL.md`: describían roles de alcance por sucursal o futura normalización de roles por sucursal. Se corrigió para reflejar la decisión estructural: un único rol por miembro/organización en `organization_members.role`; `branch_memberships` solo asigna/revoca acceso a sucursales y no contiene rol. La matriz de permisos por operación sigue **NO APROBADA** y se reemplazó su contenido operativo contradictorio por un registro explícito de decisiones pendientes.
- Cloudflare autenticado, solo lectura: Worker `micro-app-api` Active Deployment Producción, versión `49975c43-4161-4809-9c00-8ba83e53e6a0`, Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a`, 100% de tráfico asignado. Pages `micro-app` production branch `main`, SHA `82386c6e9300e06f8fa209aa52995b939a72442a`, URL `https://cc23ff0c.micro-app-63i.pages.dev`; lista visible de variables vacía; `apps/web/.env.production` versionado define `VITE_API_BASE_URL` y `vite.config.ts` lo carga con `loadEnv`. Falta confirmar el valor efectivo en el bundle desplegado. Esto corrige lecturas antiguas en #78 que mostraban 0% para esa versión; se registra la observación posterior, sin cambios.
- La asignación de tráfico y el deployment activo no demuestran CORS. #78 sigue abierta: faltan dos preflight HTTP reales, autorizado y externo, desde un equipo con conectividad completa. La variable ausente de Pages requiere investigación de solo lectura.
- #53 sigue abierta; no se implementan endpoints ni permisos comerciales. Inventario sigue organizacional (`products.stock_quantity`); no existe inventario por sucursal. Caja sigue el modelo de turnos/cierre ordinario.
- Alcance documental; no se modifica runtime, SQL, migraciones, workflows, secretos, datos, Neon, Cloudflare, DNS, billing ni producción. No hay pruebas runtime aplicables a este cambio.
- Validación pendiente: revisar diff completo y checks del SHA exacto de la PR antes de declarar este bloque cerrado.


## 2026-10-30 UTC — precisión de VITE_API_BASE_URL tras revisar el build de Pages

- Corrección de la interpretación del dashboard: la lista de variables de Pages estaba vacía, pero eso no significa que el build carezca de URL de API.
- El commit `82386c6e9300e06f8fa209aa52995b939a72442a` versiona `apps/web/.env.production` con `VITE_API_BASE_URL=https://micro-app-api.btfcasheb.workers.dev`; `apps/web/vite.config.ts` llama a `loadEnv(mode, ".", "VITE_")` y define `__MICRO_APP_API_BASE_URL__` a partir de ese valor (salvo Pages previews, donde se vacía deliberadamente).
- Interpretación: la fuente de build esperada es el archivo versionado, no necesariamente una variable del dashboard. Aún falta inspeccionar el bundle desplegado/solicitud del navegador para confirmar el valor efectivo en producción. No cambiar variables de Cloudflare.
- La conclusión de CORS no cambia: siguen pendientes los dos preflight HTTP reales. #78 permanece abierta.


## 2026-10-30 UTC — verificación pública del enlace de API en Pages

- Inspección de solo lectura de `https://micro-app-63i.pages.dev/` con navegador: el enlace visible “Continuar con Google” tiene `href=https://micro-app-api.btfcasheb.workers.dev/auth/google`. El hostname canónico del Worker aparece en el HTML público.
- La herramienta no pudo inspeccionar el contenido del bundle JavaScript ni confirmar el valor compilado de `__MICRO_APP_API_BASE_URL__`; tampoco se observó una llamada API del frontend. La evidencia no prueba CORS.
- En conjunto con `apps/web/.env.production` y `vite.config.ts`, hay evidencia del valor esperado del build y del enlace OAuth; queda pendiente verificar el bundle JS/solicitudes de la SPA y los dos preflight OPTIONS reales. Issue #78 sigue abierta.
- No se interactuó con login ni se cambiaron Pages, Worker, tráfico, variables, secretos o producción.


## 2026-10-30 UTC — PR #178 abierta para revisión documental

- Se abrió PR [#178](https://github.com/BTF14/Micro-app/pull/178), draft, rama `docs/reconcile-role-model-and-cloudflare-20261030`, base `main` en `82386c6e9300e06f8fa209aa52995b939a72442a`.
- Alcance: 11 archivos documentales; no runtime, SQL, migraciones, workflows, secretos, datos, Neon ni infraestructura. La PR consolida las correcciones de continuidad, modelo de roles, matriz NO APROBADA y evidencia Cloudflare/frontend.
- La inspección pública confirma el enlace OAuth HTML hacia el Worker; no se pudo inspeccionar el bundle JS. CORS sigue pendiente de dos preflight HTTP reales.
- Continuar en esta PR; no crear una PR duplicada. Revalidar el HEAD exacto y sus checks antes de revisión/merge.


## 2026-10-30 UTC — auditoría y retiro de hosting alternativo del proyecto

- El propietario confirmó que desconectó el hosting alternativo del proyecto y solicitó retirar sus rastros con precaución.
- Se revisó el árbol completo de `main` (191 entradas), búsquedas del repositorio y manifiestos/configuración: no hay archivos de configuración específicos del proveedor, `vercel.json`, directorio `.vercel`, paquetes `@vercel/*`, CLI/comandos de despliegue ni workflows que lo invoquen. Las referencias operativas antiguas estaban concentradas en documentos de continuidad/arquitectura/registro.
- Se limpiaron esas referencias de los documentos operativos actuales en la PR #178. Las entradas antiguas de este diario no se reescriben porque el protocolo del proyecto exige que `STATE_JOURNAL.md` sea append-only; describen hechos históricos y no una dependencia vigente. El historial de Git tampoco se reescribe.
- `VITE_API_BASE_URL` se conserva intencionalmente: es una variable pública de build de Vite, no un servicio ni una integración de hosting. `apps/web/.env.production` define la URL canónica del Worker; `apps/web/vite.config.ts` la carga con `loadEnv`. El bundle publicado aún no pudo inspeccionarse.
- La búsqueda de código no encontró referencias del proveedor en runtime, paquetes, workflows o scripts. El status combinado consultado para el SHA de `main` no devolvió estados externos. La PR #178 muestra checks de GitHub Actions y previews de Cloudflare; branch protection devolvió 403 y no pudo auditarse la instalación/configuración externa de GitHub Apps.
- No se eliminó ni modificó ninguna cuenta externa, integración GitHub, webhook, deployment, variable, secreto, DNS, configuración Cloudflare, Neon ni producción. La limpieza fue documental.


## 2026-10-30 UTC — archivo seguro de rama heredada de runtime alternativo

- La búsqueda de ramas encontró una sola rama heredada asociada a PR #72, que está cerrada y no fusionada. Su HEAD era `b1330a5fa547071a5f500f0481ce88109c612f81`; comparación contra `main`: 3 commits ahead y 277 behind.
- La revisión del diff mostró cambios antiguos limitados a `apps/api/src/auth.ts`, `apps/api/src/database.ts` y `apps/api/src/index.ts`. La rama no contiene la implementación vigente: carece de Google auth en el entrypoint y conserva lógica de login por contraseña que la rama principal ya retiró. No debe integrarse.
- Se creó `archive/legacy-api-esm-experiment-20261020` apuntando al HEAD exacto para preservar los tres commits antes de retirar la referencia antigua.
- La eliminación de la rama original quedó bloqueada: el navegador no tiene sesión GitHub iniciada y el conector disponible no expone borrado de refs. No se intentó force-push ni se modificó la rama original. Requiere sesión GitHub autorizada o eliminación manual del propietario.
- PR #72 permanece cerrada y no fusionada; su registro y los mensajes de commits son historia GitHub, no configuración activa. No reescribir historial.


## 2026-10-30 UTC — eliminación verificada de rama heredada

- Tras autenticar la sesión GitHub del propietario, se eliminó únicamente `fix/vercel-api-esm-imports` desde la interfaz del repositorio.
- Antes de borrar, se confirmó que `archive/legacy-api-esm-experiment-20261020` existía y que la comparación entre ambas referencias era `identical`: ambas apuntaban a `b1330a5fa547071a5f500f0481ce88109c612f81`, con 0 commits de diferencia.
- Después del borrado, búsqueda independiente: la rama original no aparece; la rama de archivo sí permanece. PR #72 sigue cerrada y no fusionada. Los tres commits quedan preservados en el archive.
- Solo se eliminó la referencia de rama original. No se modificaron PR #72, otras ramas, tags, archivos, settings, deployments, integraciones ni infraestructura. No se reescribió historial.


## 2026-10-30 UTC — corrección de discrepancias documentales de PR #178

- Se corrige la interpretación anterior de Pages: no es correcto afirmar que `VITE_API_BASE_URL` está ausente. `apps/web/.env.production` la define y `apps/web/vite.config.ts` la carga mediante `loadEnv`. La verificación aún pendiente es inspeccionar el bundle JavaScript publicado y confirmar el valor efectivo compilado; no inferirlo de la lista del panel.
- La referencia `fix/vercel-api-esm-imports` ya fue eliminada tras autorización del propietario. El SHA `b1330a5fa547071a5f500f0481ce88109c612f81` permanece preservado en `archive/legacy-api-esm-experiment-20261020`; la comparación previa confirmó referencias idénticas y la búsqueda posterior confirmó la ausencia de la rama original. Cualquier texto anterior que la describa como pendiente de borrado es histórico y queda supersedido.
- Se actualizó el checkpoint de PR #178 para identificar `8a3db508b10c8a8dfa9c63ace90dbd64825022e0` como snapshot anterior con 9/9 workflows success; esos checks no se transfieren a commits posteriores.
- La matriz pendiente se describe ahora como permisos por operación y ámbito del recurso, no como roles por sucursal. La autoridad sigue siendo un único `organization_members.role` por miembro/organización; `branch_memberships` solo asigna acceso a sucursales. La matriz comercial continúa **NO APROBADA**.
- CORS sigue **NO VERIFICADO** hasta completar preflight HTTP real para origen autorizado y externo. No se realizaron cambios de runtime, configuración, despliegue, Cloudflare, Neon ni producción.
- Estas notas corrigen la interpretación operativa de entradas anteriores sin reescribirlas: el diario permanece append-only.

## 2026-10-30 UTC — verificación de PR #178 en SHA a45d84e y corrección de continuidad

- HEAD de la rama `docs/reconcile-role-model-and-cloudflare-20261030` verificado: `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`; base `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`; comparación 68 ahead / 0 behind. PR #178 permanece OPEN/DRAFT/NOT MERGED.
- Para ese SHA exacto, 11/11 workflow runs Actions terminaron success: nueve eventos pull_request y dos push. Cloudflare Pages y Workers notificaron previews exitosas para el mismo commit. Los enlaces exactos se mantienen en el checkpoint vigente de `CURRENT_STATE.md`. Estos resultados no se transfieren al nuevo SHA creado por esta sincronización.
- La preview Worker devolvió `{"status":"ok","service":"micro-app-api","stage":"scaffold"}` en GET `/health`; Pages mostró el modo aislado que deshabilita login y acceso a datos. No se probaron flujos de autenticación ni producción.
- Se repitieron los dos OPTIONS reales contra el Worker de producción; ambos terminaron con curl exit 6 (`Could not resolve host`). No se obtuvo status ni headers; Issue #78 permanece **NO VERIFICADO**. El bundle JS publicado sigue sin inspección.
- Corrección explícita de una frase ambigua en la entrada anterior: `VITE_API_BASE_URL` **no está ausente**. Está definida en `apps/web/.env.production` y `apps/web/vite.config.ts` la carga mediante `loadEnv`. La única verificación pendiente es confirmar el valor efectivo compilado inspeccionando el bundle publicado.
- La inspección de documentación detectó que CURRENT_STATE, HANDOFF, PROJECT_PLAN y WORK_CHECKPOINT todavía exponían el snapshot `d8a0001` (66 ahead, dos runs queued) como portada vigente. Se actualizan con el snapshot verificado de `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b` y se deja claro que esta sincronización creará un HEAD nuevo.
- Se precisan en `SAAS_ARCHITECTURE_DECISIONS.md` y `ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md` las distinciones entre rol organizacional único, asignación de sucursal y autorización comercial. No se aprueban permisos ni se crean endpoints/middleware.
- La matriz comercial de Issue #53 sigue **NO APROBADA**. Inventario continúa organizacional; caja conserva turnos y apertura/cierre ordinario.
- Alcance exclusivamente documental: no runtime, SQL, migraciones, workflows, Neon, Cloudflare configuración/tráfico/deployments, secretos, datos reales, DNS, billing ni producción. No se reescribió historial ni entradas anteriores del journal.


## 2026-10-30 UTC — PR #178 fusionada y continuidad reconciliada

- PR #178 fusionada por squash; merge SHA/main: `bb5bd72829db0532521857bffd62dac5c42a2eee`. Diff documental: 14 archivos (+403/-238), sin runtime, SQL, migraciones, lockfile, workflows ni infraestructura.
- En HEAD exacto de PR `8bacd57d9c3d624eae8139dadeb7fd6c0730b4dc`, 9/9 workflow runs GitHub Actions consultados terminaron success. No transferir esos resultados a SHA posteriores.
- TinyFish verificó login OAuth real y dashboard autenticado en `https://micro-app-63i.pages.dev/#inicio`, organización Abasto 7 de Oro, rol visible owner. No demuestra CORS ni operaciones comerciales.
- #78 sigue abierta: CORS NO VERIFICADO; preflight no obtuvo status/headers por fallo DNS del entorno. Falta inspección del bundle JS y preflight desde conectividad funcional.
- #53 sigue abierta: matriz comercial NO APROBADA y aislamiento cross-tenant de futuras rutas comerciales pendiente. No crear endpoints ni permisos.
- Las portadas CURRENT_STATE/HANDOFF se corrigen en la PR documental siguiente porque aún describían PR #178 como draft. No se reescriben entradas históricas.
- No se tocó Cloudflare producción, Neon main, secretos, DNS, billing ni datos reales.


## 2026-10-30 UTC — corrección de snapshots operativos post-PR #178

- Durante la revisión de PR #179 se detectó que los nuevos checkpoints estaban seguidos por bloques anteriores que aún describían main en `82386c6e9300e06f8fa209aa52995b939a72442a` y PR #178 como OPEN/DRAFT. Esos bloques no podían permanecer como estado operativo.
- Se reemplazaron las portadas operativas de CURRENT_STATE y HANDOFF por un único checkpoint basado en el merge SHA `bb5bd72829db0532521857bffd62dac5c42a2eee`; los snapshots previos se conservan íntegros a partir de sus delimitadores históricos.
- Para el HEAD anterior de PR #179 (`d958eb4e1ca7b6c79b95cf1ec1adcd87dcba685e`) se consultaron 8 workflow runs, todos completed/success; combined commit status devolvió statuses vacíos. Codex review no se completó por límite de uso. Cloudflare Pages y Workers reportaron previews exitosas para ese SHA.
- Esta entrada no certifica el nuevo commit que genera esta corrección. Reconsultar sus checks y revisar diff antes de merge. PR #179 permanece sin fusionar hasta nueva verificación.


## 2026-10-30 UTC — revisión independiente y cierre de hallazgos de continuidad PR #179

- Se incorporaron hallazgos de revisión Claude: el estado pre-merge de PR #179 queda fechado como snapshot, el HEAD y la evidencia de checks se distinguen por SHA, y el bloque de Cloudflare/Pages que describía `main=82386c6e...` y 100% de tráfico se marca explícitamente como histórico/superado.
- Se aclara que el merge a `main` puede activar despliegues automáticos de Cloudflare y que, tras fusionar #179, las portadas deben actualizarse con el merge SHA real y el nuevo HEAD de `main`. No realizar cambios manuales de producción.
- El prompt antiguo duplicado en HANDOFF queda etiquetado como histórico/no copiar. El prompt vigente permanece en la portada superior.
- Estado de PR #179 al registrar esta entrada: HEAD `fb724e0c3bd8fbaae2a838f042c1e838754675b5`; los ocho workflows Actions consultados para ese SHA terminaron completed/success. La revisión de los archivos completos confirma 1.446 líneas en CURRENT_STATE, 1.560 en HANDOFF y 1.342 en STATE_JOURNAL; el diff de journal de PR #179 añade 19 líneas y elimina 0.
- GitHub confirmó que `main` seguía exactamente en `bb5bd72829db0532521857bffd62dac5c42a2eee` al comparar contra ese SHA. Issues #78 y #53 siguen abiertas.
- No se inspeccionaron ni modificaron paneles de Cloudflare o Neon para esta PR documental; no eran necesarios para validar su alcance. Las observaciones históricas de infraestructura no se presentan como estado vivo.
- Esta entrada es append-only; no modifica entradas anteriores.


## 2026-10-30 UTC — PR #179 fusionada y checkpoint post-merge

- PR #179 se fusionó por squash; GitHub confirmó `merged=true`, estado cerrado y merge SHA `d6f41448b00b2e03ac25467378c707c6fcba1434`. La comparación de `main` contra ese SHA devolvió `identical`, 0 ahead / 0 behind.
- HEAD pre-merge revisado: `a09864ad772e3afdfabb911dc041ada1f7a71edd`; base `bb5bd72829db0532521857bffd62dac5c42a2eee`. Diff limitado a `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md` y `docs/STATE_JOURNAL.md`.
- En ese HEAD, los 8 workflows Actions consultados terminaron `completed/success`. Cloudflare Pages y Workers reportaron previews exitosas para el mismo SHA. Son previews, no validación de producción. El combined commit status devolvió statuses vacíos; branch protection/required checks no está confirmada.
- Se verificó que el `STATE_JOURNAL.md` de PR #179 conserva el contenido de la base como prefijo exacto; la edición añadió contenido al final y no reescribió entradas previas.
- Kimi 3.1 Pro auditó un HEAD anterior (`fb724e0...`). Sus tres hallazgos principales se contrastaron contra `a09864a`: las instrucciones de corrección ya no están en la secuencia vigente; el prompt anterior está rotulado `HISTÓRICO — NO COPIAR`; y el bloque Cloudflare antiguo está dentro de una sección histórica explícita. No se abrió otro commit para repetir esos arreglos.
- Issues #78 y #53 siguen abiertas: CORS continúa NO VERIFICADO por HTTP real y la matriz comercial sigue NO APROBADA. No se modificó Cloudflare producción, Neon main, secretos, DNS, billing ni datos reales.
- Esta entrada se añade al final; no se modifican ni eliminan entradas anteriores.


## 2026-10-31 UTC — cierre de #78 con evidencia real; aprobación de la matriz de permisos para #53

- **Issue #78 (CORS): CERRADA.** PR #181 (merge `cf13538e5bc68af4fa544efa71dad96d8ea5412a`) añadió `.github/workflows/cors-verification.yml`: workflow de solo lectura, manual + semanal, que emite los preflight `OPTIONS` reales contra `https://micro-app-api.btfcasheb.workers.dev/health` desde un runner de GitHub Actions con salida completa a internet. Esta sesión confirmó por sí misma, de nuevo, que su propio sandbox no puede alcanzar ese host (`curl` devolvió `403 CONNECT tunnel failed` contra el proxy saliente), consistente con el historial completo del issue.
- PR #183 (merge `d8be0c6249a78f64645fcd2a794362c7cb794452`) reforzó el workflow: valida explícitamente el código de salida de `curl` y la línea de estado HTTP (antes solo miraba headers), y añade un tercer preflight que solicita `Access-Control-Request-Headers: authorization,content-type` — exigido tras un repaso recibido de otra sesión de IA (ChatGPT), cuyas afirmaciones se verificaron de forma independiente contra la API de GitHub antes de actuar (SHA de `main`, estado de PR #178–#181, job ID del run citado) y resultaron exactas.
- Evidencia real (no inferida): runs [41186202382](https://github.com/BTF14/Micro-app/actions/runs/41186202382), [41186391247](https://github.com/BTF14/Micro-app/actions/runs/41186391247) y el run sobre el commit `06a398a11a670cafc6becae070cb53eefcf25903` de PR #183, los tres `success`. El origen permitido `https://micro-app-63i.pages.dev` recibe `Access-Control-Allow-Origin` correcto, `Access-Control-Allow-Credentials: true`, el listado completo de métodos (`GET,POST,PATCH,DELETE,OPTIONS`) y, en el tercer preflight, `Access-Control-Allow-Headers` incluye `authorization`/`content-type`. El origen externo `https://attacker.example` no recibe `Access-Control-Allow-Origin` en ningún caso. Issue cerrada con comentario de evidencia; no se cerró por conveniencia.
- **Matriz de permisos por rol (`docs/sdd/role-permission-decision-matrix.md`): APROBADA.** PR #182 (merge `062e5ed671a30d356891d9a28dd5d724045cdfa1`) registró la decisión real del propietario, tomada explícitamente en esta conversación vía preguntas directas: ventas/descuentos (cualquier descuento requiere aprobación de Admin/Owner), devoluciones/anulaciones (Cashier anula solo en el mismo turno abierto; tras el cierre, solo Admin/Owner) y gestión de miembros/políticas (solo Owner gestiona miembros y configura políticas; Admin solo opera el negocio). El propietario delegó explícitamente a criterio técnico fundamentado — con sus propias palabras: "elige la mejor opción... hacerlo con criterio y fundamentos" — catálogo/inventario, mecánica de apertura/cierre de caja y reportes/auditoría; cada celda de la tabla quedó trazada a su fuente (decisión explícita vs. criterio delegado).
- **Esta aprobación NO implementa nada.** Sigue sin existir ningún endpoint comercial, ruta HTTP de negocio ni middleware de autorización en `apps/api/src`. `docs/SECURITY_ROADMAP.md` punto 5 y `docs/PRODUCTION_READINESS.md` se actualizaron para reflejar "decisión aprobada, implementación pendiente", no "completado".
- Auditoría de causa raíz para #53 (solo lectura, sin cambios de código): se inspeccionaron `apps/api/src/tenant-context.ts`, `branch-context.ts` y `cashier-open-shift.ts` y se hizo `grep` de todos sus callsites en `apps/api/src`. Las tres funciones son fail-closed (validan patrón UUID, sesión no revocada/expirada, `is_active` en usuario/organización/membresía/sucursal/registro de caja en cada capa de su SQL) y no se encontró ningún defecto demostrable en su lógica. Confirmado: **ninguna de las tres tiene un callsite fuera de sus propios archivos de test** — solo `registerAuthRoutes`, `registerGoogleAuthRoutes` y `GET /health` están registradas en `apps/api/src/index.ts`. Esto confirma, no corrige, lo que ya indicaba `docs/CURRENT_STATE.md` ("`resolveBranchContext` existe pero no está conectado a rutas"). No se modificó ningún archivo de `apps/api/src` en esta sesión.
- **Issue #53 permanece ABIERTA.** Queda pendiente: implementar los endpoints comerciales según la matriz aprobada, el middleware de autorización server-side encadenando los tres helpers, y pruebas automatizadas de aislamiento cross-tenant y de rol en PostgreSQL desechable, antes de poder cerrarla. Se publicó un comentario de auditoría en el issue con este detalle.
- No se tocó Cloudflare producción, Neon main, secretos, DNS, billing, datos reales ni se realizó ningún despliegue manual.
- `main` verificado al cierre de esta entrada: `062e5ed671a30d356891d9a28dd5d724045cdfa1`.
- Esta entrada se añade al final; no se modifican ni eliminan entradas anteriores.


## 2026-10-31 UTC — Brecha C de #78 resuelta: verificación real del bundle publicado (PR #185)

- Se recibió un documento de continuidad redactado por ChatGPT (aportado por el propietario) señalando brechas adicionales sobre el cierre de #78: (A) falta de preflight con `Access-Control-Request-Headers: authorization,content-type`, (B) el workflow de CORS no fallaba ante error de transporte/status HTTP inesperado, (C) nunca se verificó el bundle JS realmente publicado en Pages (solo el código fuente versionado), (D) falta una verificación autenticada actual del dashboard de Cloudflare. Se verificó cada punto contra GitHub en vivo antes de actuar, sin asumir que el documento externo fuera exacto.
- (A) y (B) ya habían sido resueltos en esta misma sesión mediante PR #183 (confirmado leyendo el YAML fusionado en `main`, no solo el título del commit).
- (C) se resolvió con PR #185: nuevo workflow `.github/workflows/frontend-bundle-verification.yml`, de solo lectura, manual + semanal (lunes 09:05 UTC). Descarga `index.html` público de `https://micro-app-63i.pages.dev/`, extrae cada `<script src>` referenciado, descarga esos bundles, y confirma que al menos uno contiene el literal `https://micro-app-api.btfcasheb.workers.dev`; falla si aparece cualquier otro host `*.workers.dev`. Se confirmó de nuevo que este sandbox de IA no puede alcanzar `micro-app-63i.pages.dev` (`403` en el `CONNECT` del proxy saliente), igual que ya ocurría con el Worker.
- Evidencia real: PR #185 fusionada por squash, merge SHA `51194315b8cbe9138567bdbbd46a08509235de6e`; checks obligatorios del HEAD exacto (`66d0cf5875ef9b741b84cd86c584ac694495b42f`) en verde, incluido el job nuevo `Confirm published bundle uses the canonical API base URL`. Tras el merge, se disparó manualmente el workflow sobre `main` ([run 41255425480](https://github.com/BTF14/Micro-app/actions/runs/41255425480)): `success`. Se publicó un comentario de evidencia en el issue #78 (ya cerrado; no se reabrió, el cierre original ya era válido).
- (D) sigue sin resolverse: requiere acceso autenticado al dashboard de Cloudflare que solo tiene el propietario. No es una tarea ejecutable desde un sandbox de IA sin esas credenciales; se deja documentada como pendiente real, no como tarea evitada.
- No se tocó Cloudflare producción, Neon main, secretos, DNS, billing, datos reales ni se realizó ningún despliegue manual. No se modificó código de `apps/api` ni `apps/web`; solo se añadió un workflow de CI de solo lectura.
- `main` verificado al cierre de esta entrada: `51194315b8cbe9138567bdbbd46a08509235de6e`.
- Esta entrada se añade al final; no se modifican ni eliminan entradas anteriores.


## 2026-11-01 UTC — Corrección de la sección "caja" de la matriz de permisos (PR #187) y auditoría completa de Seguridad Nivel 1

- Se recibió un segundo documento de continuidad (atribuido a ChatGPT, aportado por el propietario) pidiendo auditar y cerrar "Seguridad Nivel 1" (protección de rama, backups, Dependabot/cabeceras, CORS/frontend) antes de avanzar con cualquier endpoint comercial, e identificar sin resolver por supuesto dos ambigüedades señaladas en la matriz de permisos aprobada (caja: cierre de turno por supervisor; inventario: alcance por sucursal vs. `products.stock_quantity` organizacional). Se verificó el estado real de GitHub antes de actuar (SHA de `main`, PR/issues abiertas, checks del HEAD) en vez de asumir la vigencia de la documentación histórica.
- **Caja — contradicción real encontrada, no solo ambigüedad.** La sección 2 de `docs/sdd/role-permission-decision-matrix.md`, aprobada en PR #182, contenía una fila que permitía a Owner/Admin cerrar o reabrir el turno de caja de otro miembro ("cierre por supervisor"). Se contrastó contra `docs/sdd/REGISTER_SHIFT_MODEL.md` §2/§4, que fija como decisión de arquitectura ya existente que no hay cierre por supervisor en el modelo base (el cierre exige que `closed_by_user_id` sea el mismo cajero) y que un turno cerrado es inmutable por trigger de PostgreSQL en la migración 0004 — para todos los roles, incluido Owner. Es decir, la fila aprobada contradecía una restricción ya fijada a nivel de base de datos, no una zona gris de negocio.
- **Corrección aplicada en PR #187** (rama `docs/caja-matrix-fix-20261101`): se reemplazó la fila errónea por denegación explícita de "cerrar turno abierto de otro miembro (cierre por supervisor)" y "reabrir o modificar un turno ya cerrado", citando literalmente `REGISTER_SHIFT_MODEL.md` como fuente, y dejando anotado que cualquier excepción futura (p. ej. cierre forzado por soporte ante un cajero que se fue sin cerrar) requiere un diseño de permiso, motivo obligatorio y auditoría aprobados aparte por el propietario — no implementado aquí. PR #187 fusionada por squash tras los 6 checks obligatorios en verde sobre su HEAD exacto; merge SHA `40244698e95d78122011019e456f3d8b392fb05c`. No se tocó código de `apps/api` ni `apps/web`.
- **Inventario — revisado, sin contradicción.** La sección 1 de la matriz ya aclaraba, desde su aprobación original, que el "alcance sucursal" de Inventory se refiere a qué sucursales puede operar ese miembro (vía `branch_memberships`), no a que `products.stock_quantity` esté particionado por sucursal (sigue siendo un campo organizacional único). No se encontró discrepancia real entre la matriz y el esquema; no se modificó nada por este punto.
- **Auditoría de Seguridad Nivel 1 — completada, con evidencia en vivo, volcada en `docs/SECURITY_ROADMAP.md` (sección "Nivel 1"):**
  - Protección de `main`: confirmada en vivo vía API (`GET /repos/BTF14/Micro-app/branches/main/protection` devolvió 200 en esta sesión, no 403 como el 2026-10-30): 6 checks requeridos, `enforce_admins: true`, `required_approving_review_count: 0` (la discrepancia de "1" registrada el 2026-10-30 ya no está presente), sin force-push/deletions, resolución de conversaciones obligatoria.
  - Backups: `backup.yml`, `backup-restore-smoke.yml` (datos sintéticos poblados) y `backup-real-restore.yml` con ejecuciones recientes en éxito, confirmadas vía `gh run list`, no solo por lectura de documentación histórica. Siguen sin medir: RPO/RTO, alerta externa fuera del resumen de Actions, y confirmación explícita de coste $0 — pendientes reales, no bloqueantes para #53.
  - Dependabot: configuración correcta (npm/pnpm + github-actions, semanal). El endpoint de alertas (`/dependabot/alerts`) devolvió 403 `Resource not accessible by integration` con el token de esta sesión — limitación de alcance, no evidencia de ausencia de alertas; requiere revisión manual del propietario en GitHub.
  - Cabeceras de seguridad, CORS y bundle publicado: sin cambios desde PR #183/#185; los workflows de verificación siguen en verde en sus últimas ejecuciones (CORS 2026-10-31T23:52:41Z, bundle 2026-11-01T00:08:33Z), confirmando que `FRONTEND_ORIGIN` del Worker desplegado coincide con el frontend real.
- No se tocó Cloudflare producción, Neon main, secretos, DNS, billing ni datos reales. No se implementó ningún endpoint comercial de #53; la matriz corregida sigue siendo solo una decisión documentada, no código.
- `main` verificado al cierre de esta entrada: `40244698e95d78122011019e456f3d8b392fb05c`.
- Esta entrada se añade al final; no se modifican ni eliminan entradas anteriores.


## 2026-11-01 UTC — Corrección de precisión sobre el cierre de Seguridad Nivel 1 y revisión de Dependabot por el propietario

- El propietario revisó el informe de cierre de la sesión anterior (PR #187/#188) y pidió, antes de iniciar #53: (1) no repetir verificaciones ya hechas, solo reconfirmar el SHA vivo al empezar; (2) el enlace directo a Dependabot y qué dato necesitaba de él; (3) documentar con precisión qué está probado de backups y qué falta para RPO/RTO y coste $0, sin declarar esos puntos verificados sin evidencia; (4) revisar que `CURRENT_STATE.md`/`HANDOFF_NEXT_CHAT.md`/`STATE_JOURNAL.md` no tuvieran contradicciones sobre el cierre de Nivel 1; (5) un diagnóstico y una propuesta técnica para #53 antes de escribir ningún código.
- **Contradicción real encontrada y corregida:** `docs/HANDOFF_NEXT_CHAT.md` (dos lugares, incluido el prompt para el siguiente chat) afirmaba "todos los controles de Nivel 1 están implementados y verificados" / "Seguridad Nivel 1 completa", lo cual era impreciso — el punto de backups (RPO/RTO, alerta externa, coste $0) seguía sin evidencia, como ya indicaba correctamente `docs/SECURITY_ROADMAP.md` §2. Se corrigió el texto del handoff para que coincida con el roadmap: Nivel 1 tiene 3 de 4 puntos verificados con evidencia reproducible (branch protection, Dependabot, cabeceras/CORS/bundle); backups permanece abierto y no bloqueante para #53, pero tampoco se declara "completo".
- **Dependabot — resuelto por el propietario directamente, sin pedirle credenciales:** se le indicó el enlace `https://github.com/BTF14/Micro-app/security/dependabot` y qué dato bastaba (conteo de alertas abiertas con filtro `is:open`). El propietario respondió con una captura de pantalla: **0 alertas abiertas, 15 cerradas**. Se registró como evidencia de fuente manual en `docs/SECURITY_ROADMAP.md` §3, `docs/CURRENT_STATE.md` y `docs/HANDOFF_NEXT_CHAT.md`, dejando explícito que la API sigue devolviendo 403 con el token de esta sesión y que el dato no es reproducible por CI.
- **Backups — desglose verificado, sin texto nuevo que no tenga evidencia:** se confirmó por `gh run list` que no hay ejecuciones nuevas desde el cierre anterior (mismas evidencias ya documentadas) y, mediante `grep -r "RPO\|RTO\|coste\|cost" .github/workflows/`, que **ningún workflow mide RPO/RTO ni coste** — confirma que esos tres puntos son brechas reales de instrumentación, no solo de documentación pendiente de actualizar.
- Se verificó de nuevo el estado vivo de GitHub antes de tocar documentos: `main` = `c7bd0a198c30d190586aa6acd207d954f41ff7c9`, 0 PR abiertas, issue #53 abierta — sin cambios desde el cierre anterior.
- No se tocó Cloudflare producción, Neon `main`, secretos, DNS, billing ni datos reales. No se implementó código de #53; esta entrada corresponde solo al diagnóstico y a la corrección de continuidad pedidos antes de presentar la propuesta técnica.
- Esta entrada se añade al final; no se modifican ni eliminan entradas anteriores.

---

# 2026-11-01 UTC — Estándar transversal UI/UX y frontend aprobado

- El propietario aprobó convertir las reglas UI/UX acordadas en un estándar oficial del proyecto: `docs/FRONTEND_DESIGN_STANDARD.md`.
- El estándar establece React + Vite/CSS existente como contexto; responsive con pruebas de referencia a 375, 768 y 1280 px; tokens semánticos centralizados tras inspeccionar estilos existentes; skeletons contextuales; estados completos; patrones POS/inventario; interacción por teclado y accesibilidad WCAG 2.2 AA (AAA cuando sea viable).
- Se corrigió el umbral de contraste del prompt original: AA requiere 4.5:1 para texto normal y 3:1 para texto grande; AAA requiere 7:1 y 4.5:1 respectivamente. Se aclaró que 44 × 44 px es una referencia de comodidad táctil, no el mínimo normativo universal.
- Integración documental: `AGENTS.md`, `.agents/skills/micro-app-stack-guidance/SKILL.md`, `docs/COMPLIANCE_AND_ACCESSIBILITY.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md` y `docs/PROJECT_PLAN.md`.
- Base verificada antes del cambio: `main` = `88213507d088b82ea9231bbc72f49afade7ec99b`; PR #190 seguía abierta como Draft con HEAD `42ed27fd9ce13223c6a2d1fd2a9359d3ec871345`. El trabajo se mantiene en la rama documental `docs/frontend-design-standard-20261101`; no se modifica ni fusiona PR #190.
- Alcance: documentación e instrucciones solamente. No se modificó código de aplicación, CSS, dependencias, APIs, esquema, migraciones, datos, Cloudflare, Neon, secretos, DNS, billing ni producción.
- La adopción no certifica la accesibilidad actual: las pantallas existentes no se han auditado como conjunto. El estándar se aplica a trabajo nuevo y a pantallas modificadas gradualmente.
- Pendiente de completar al registrar esta entrada: revisión final del diff y verificación de checks en el SHA final de la rama.

---

# 2026-11-01 UTC — PR #191 fusionada: estándar frontend incorporado

- El propietario confirmó la fusión; GitHub en vivo verificó PR #191 cerrada y `merged=true`, merge SHA `7ff887328f25cffff69ccb9e89bbb1ba25200aea`. `main` apunta a ese mismo SHA.
- El estándar oficial quedó incorporado en `docs/FRONTEND_DESIGN_STANDARD.md`, con referencias desde `AGENTS.md`, `.agents/skills/micro-app-stack-guidance/SKILL.md`, `docs/COMPLIANCE_AND_ACCESSIBILITY.md` y `docs/AI_COLLABORATION_AND_PR_POLICY.md`.
- Alcance de PR #191: 9 archivos documentales; sin cambios en código de aplicación, dependencias, API, esquema, migraciones o configuración de producción.
- En el merge SHA se consultaron 10 check-runs: Cloudflare Pages, Workers build, postgres-migration, Trivy, generate-progress, validate-sdd-docs y scans de historial completaron success; verify, análisis estático JS/TS y Chromium authentication smoke tests seguían in_progress en el momento de la consulta. No afirmar que todos los checks terminaron hasta volver a consultarlos.
- PR #190 continúa abierta como Draft y no se fusionó. Issue #53 continúa abierta.
- Próximo paso operativo: verificar el resultado final de los checks del merge SHA y continuar desde el handoff actualizado. No iniciar rediseño global; aplicar el estándar gradualmente en frontend nuevo y pantallas que se modifiquen.
- Esta entrada registra el merge; no altera ni elimina entradas anteriores.



# 2026-11-05 UTC — merges seguros, backlog y hallazgo runtime Neon

- PR #237 fusionada por squash en `66ca2b99331df6d9eb4175bf79e53a9ba118dde7`; los checks post-merge de Cloudflare Pages, Workers Builds, CI, ODD docs, migraciones, Chromium, análisis estático y Trivy terminaron en success.
- PR #206 fusionada por squash en `85f1aa46db7797ff6ae2d7e08b2a85e15e067797`; actualizó Hono 4.13.14→4.13.16, Cloudflare Workers Types 5.20261029.1→5.20261102.1 y Wrangler 4.155.0→4.156.1; se confirmó que el override undici 7.30.1 permanece. Checks post-merge de Pages, Workers Builds, CI, Chromium, migraciones, estático y Trivy: success.
- PR #196 cerrada como duplicada de implementación frente a #200 después de comparar patches completos: 16 archivos de código compartidos idénticos y 8 archivos de inventario/migración más evolucionados en #200. Nueve archivos documentales exclusivos de #196 permanecen en la rama para rescate selectivo; no se perdieron del historial.
- Backlog vivo tras esas acciones: 28 PR abiertas. No abrir nuevas PR para el mismo trabajo.
- Neon main: inspección de solo lectura de `pg_roles` y membresías. No existen logins `microapp_runtime` ni `microapp_migrator`. Se observó un login etiquetado para backup con atributos privilegiados y membresía en el rol privilegiado del proveedor; no se leyeron secretos ni connection strings, por lo que no se afirma qué secret utiliza ese login. Tratar como P0 la discrepancia entre el nombre/uso esperado readonly y los privilegios observados. No se cambiaron roles ni datos.
- `auth_rate_limits` existe en Neon main y su owner es `neondb_owner`; el principal efectivo del Worker sigue sin verificarse. Por ello #213 no se fusiona todavía aunque su SHA histórico tenga CI verde.
- #200 necesita migración 0005 y principal runtime compatible; no fusionar hasta resolver el despliegue seguro. #224 contiene el contrato y el harness para los logins dedicados, pero su stack debe aplanarse y los roles de Neon requieren aprobación específica. #227 BCV continúa bloqueada por esa cadena.
- Se reafirma la autorización permanente de merges con gates completos y despliegue automático de Pages; no incluye mutaciones de Neon main, secretos ni configuración manual de Cloudflare.


# 2026-11-06 UTC — OAuth rate limit integrado, PR inventory reconciliada y Neon roles auditados

- PR #213 fusionada en main: `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`. Su HEAD integrado pasó 12/12 check-runs y 10/10 workflows antes del squash; los checks post-merge de Pages, Workers Builds, CI, Playwright, migration validation, Semgrep, Trivy, Chromium, secret-history y dashboard finalizaron SUCCESS.
- La implementación cubre GET /auth/google (10/10m), POST bootstrap (5/h) y GET callback (20/10m); usa CF-Connecting-IP, HMAC con GOOGLE_CLIENT_SECRET existente, UPSERT atómico, 429/Retry-After y fail-closed 503. Sin nueva migración ni secreto.
- PR #214 cerrada como duplicada de #213. El trabajo de bootstrap handoff server-side y bounded body es independiente y se conserva en #215; se debe portar sin AUTH_RATE_LIMIT_HMAC_KEY ni rate limiter duplicado.
- PR #200 actualizada con merge commit de main + feature: HEAD `464ca08b9020fad128cc9c8a321568493d484517`; 33 ahead/0 behind, 30 archivos de feature. Se resolvió el único solapamiento CI con #213 conservando ambos conjuntos de tests. 19 check-runs y 17 workflow runs observados en SUCCESS. Permanece Draft porque las tablas de inventario no existen en Neon main.
- Neon main, solo lectura: `backup_readonly`, `neon_service` y `neondb_owner` pertenecen a `neon_superuser`; este pertenece a `pg_write_all_data` y `pg_read_all_data`. `cloud_admin` tiene `rolsuper=true`. La ACL por defecto de tablas de `neondb_owner` concede SELECT a `backup_readonly`, pero la membresía heredada en neon_superuser invalida el supuesto de solo lectura. No se inspeccionaron secretos/connection strings, así que no se asigna ningún rol a un binding específico. No se alteraron roles/grants/datos.
- Se añadió comentario de evidencia y próximos pasos a Issue #53; continúa OPEN/P0.
- Backlog: 26 PR abiertas. Producción NO LISTA. No se ejecutaron cambios manuales en Cloudflare, secretos ni migraciones de Neon.

## 2026-11-06 03:49 UTC — reconciliación post PR #240 y auditoría Neon (solo lectura)

- Se verificó en vivo que `main` = `71d6434a1877b5e618a093e60472621af8ef790f`; PR #240 está fusionada y su merge SHA pasó 9/9 check-runs SUCCESS. PR #213 ya está integrada. La PR #215 aparece cerrada sin merge; #218/#220 siguen abiertas como Draft con base heredada de la rama anterior de bootstrap.
- Estado de PR: 25 abiertas; #200 HEAD `464ca08b9020fad128cc9c8a321568493d484517`, 33 ahead/2 behind, 19/19 check-runs SUCCESS; #233 HEAD `070f49ec1f1e45debb7fe99d998dc2429b5da9b1`, 9/9 checks SUCCESS. Ambos resultados son específicos de esos SHA y no resuelven el estado de producción.
- Se verificó colisión de numeración: main tiene `0005_auth_bootstrap_attempts`; las ramas de la pila tienen `0005_warehouse_inventory` y `0010_auth_bootstrap_attempts`. Los archivos SQL de auth 0005 y 0010 comparten blob SHA `ada5d01a555102959ece094946a0920c11d39a66`. Se documentó una secuencia candidata 0001–0015 en comentario de PR #233, ID `6676411612`; requiere actualizar conjuntamente assertions, workflows, scripts, pruebas y documentación. No se modificó código/migraciones.
- Auditoría Neon main, solo lectura: el principal de la conexión de auditoría fue `neondb_owner`; no existen logins `microapp_runtime` ni `microapp_migrator`; `backup_readonly`, `neon_service` y `neondb_owner` heredan `pg_write_all_data` a través de `neon_superuser`; `cloud_admin` tiene `rolsuper=true`. No aparece `public.schema_migrations` ni `public.auth_bootstrap_attempts`; existen objetos/tablas de aplicación, incluyendo `products`, `inventory_movements` y `auth_rate_limits`.
- Se leyó `scripts/db/migrate.sh` y `docs/security/POSTGRES_MIGRATION_RUNNER.md` de la rama #226: el runner exige conexión directa como `microapp_migrator` y falla con `MIGRATION_BASELINE_REQUIRED` ante esquema poblado sin ledger. Neon main no es un destino ejecutable por ese runner en el estado observado; requiere plan de adopción/baseline revisado y roles correctamente provisionados.
- Se dejó un comentario técnico en PR #233 con evidencia, secuencia candidata y bloqueadores. No se ejecutaron migraciones, escrituras SQL, cambios de roles/grants, secretos, datos reales, Cloudflare, DNS, billing ni deploy manual.
- Producción continúa **NO LISTA**. Próximo paso: reconciliar numeración y pruebas completas en PostgreSQL efímero; diseñar baseline de Neon separadamente. No hacer cambios remotos sin aprobación específica.



## 2026-11-06 — Confirmación explícita del propietario: completar backlog PR y liberar producción

El propietario reiteró que el backlog comunicado es de 26 PR y que deben completarse y fusionarse cuando hayan superado todas las verificaciones y sean seguras para integrarse. Se registra como objetivo operativo: recontar en GitHub en vivo; revisar cada PR y sus dependencias; preservar cambios únicos; integrar raíz primero; máximo dos frentes; no fusionar en bloque ni por CI verde aislado; no retener una PR elegible esperando las demás; usar la autorización permanente de merge sin reconfirmación una vez satisfechos todos los gates; verificar merge SHA, checks post-merge y despliegue; continuar con la siguiente PR desbloqueada.

La preparación global para producción exige pruebas end-to-end y cierre de P0/P1: secuencia/baseline de migraciones, privilegios PostgreSQL efectivos mínimos y separación runtime/migrator/backup, integridad transaccional, auth/autorización, importes decimales exactos sin descuentos, BCV verificable, backup/restore y RPO/RTO, alertas/observabilidad, seguridad, presupuesto $0, despliegue y smoke test autenticado. La autorización de merge no amplía permisos para Neon main, migraciones remotas, roles/grants, datos reales, secretos, Cloudflare manual, DNS ni billing.


## 2026-11-08 UTC — reconciliación #251/#255, cierre de PRs supersedidas y auditoría Neon

- GitHub main verificado: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- #251 actualizado con merge commit no destructivo desde main: HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, cero commits detrás, 15/15 check-runs SUCCESS.
- #255 actualizado con merge commit no destructivo desde #251: HEAD `d4326db8e6acf75629e1fca3123885ad160dcbf3`; luego se añadió hardening BCV y UI de frescura, HEAD final `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251 `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, 13 workflow runs y 15/15 check-runs SUCCESS.
- Hardening BCV: reemplazada validación de límite con `Number()` por comparación exacta BigInt; latest API y cliente web no-store; dashboard revalida al cambiar fecha de Caracas, al volver a la pestaña y descarta respuestas iniciadas en una fecha anterior; regresión Friday→Saturday midnight y prueba de cabecera no-store.
- Cerradas sin merge y con comentarios de evidencia: #200, #204, #205, #207, #208, #209, #210, #227, #228, #229, #230, #231 y #232. Sus funcionalidades se verificaron en main/#255; ODD de inventario se preserva en #257.
- Neon solo lectura: main no tiene `microapp_runtime`, `microapp_migrator`, ledger ni tablas de migraciones posteriores; rehearsal tiene logins/ownership, pero runtime no tiene grants de tabla. No se aplicó DDL ni se ejecutó el runner en Neon.
- `.github/workflows/migration-runner.yml` valida PostgreSQL 18 desechable; no es runner de release a Neon. El plan documenta falta de secreto `NEON_REHEARSAL_DATABASE_URL` y workflow protegido. No usar SQL manual para aplicar migraciones.
- #193, #202, #211 y #233 siguen abiertos para reconciliación; #251/#255/#257 siguen Draft. No hubo merges a main ni cambios de secretos/producción.


## 2026-11-08 08:25 UTC — Reconciliación viva y revisión #262

- GitHub confirmó main `d28b80edc6b2a63019ded100e46bb4b11e81153a` y 7 PR abiertas: #193, #233, #251, #255, #258, #261 y #262.
- No se encontraron reviews formales ni review threads en ninguna de las siete PR. Check-runs exact-HEAD observados: #258 15/15, #262 8/8, #251 15/15, #255 15/15, #261 13/13, #193 12/12 y #233 9/9 SUCCESS.
- #258 y #251/#261 tienen base SHA `0a9e2f7...`, una confirmación detrás del main vivo. #262 se apila sobre un ancestro de #258; #255 se apila sobre el HEAD actual de #251. #193 está 5 ahead/24 behind y conserva un documento único de 543 líneas.
- Revisión de #262 detectó que el runtime puede insertar movimientos no-count sin documento fuente porque el trigger de conteos retorna cuando `count_id IS NULL`; se publicó comentario P1 #6719238384. No se modificó código ni se aprobó la PR.
- No se modificó Neon, datos reales, secretos, Cloudflare manual, DNS, billing ni se hizo deploy manual. Producción NOT READY.

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


## Estado GitHub verificado — 2026-11-08 ~09:20 UTC

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


## Reconciliación final de esta sesión — 2026-11-08

**GitHub main:** `d28b80edc6b2a63019ded100e46bb4b11e81153a` (protegido). Ninguna PR se fusionó durante esta sesión. No se modificó Neon ni infraestructura productiva.

| PR | HEAD | Base | Estado | Checks exact-HEAD |
|---|---|---|---|---:|
| #251 auth retention | `30ec0cedafbb8281c7b5ea56572581ddc022a180` | main | Ready for review | 15/15 |
| #255 BCV oficial | `f49fb402f9bd5a40591970c9efe3665a5e212ebb` | #251 | Ready for review | 15/15 |
| #258 checkout atómico | `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c` | main | Ready for review | 16/16 |
| #261 reconciliación documental | rama `docs/live-state-reconcile-20261108` | main | Ready for review | 14/14 en el HEAD previo a esta última actualización; esta actualización dispara checks nuevos |
| #262 ledger autoritativo | `19103c000b354da85c1a478867a6a18e2ec25cd7` | #258 | Ready for review | 8/8 |
| #193 Fase B inventario | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | main histórico | Open, no Draft | 12/12 |
| #233 checkout histórico | `07a13c7eb68e0e933f93f35a1ecd9a22f19bf2d0` | rama documental histórica | Draft | 9/9 |

**Reviews formales:** ninguna de #251, #255, #258, #261 o #262 tiene review registrada ni threads sin resolver. Los checks verdes no sustituyen la aprobación formal.

### #262 — P1 corregido y verificado
- Migration 0019 revoca escrituras runtime directas a `inventory_balances` y proyecta movimientos válidos mediante trigger SECURITY DEFINER.
- Conteos `opening`/`count_adjustment`: documento confirmado y línea coincidente; confirmer activo owner/admin/inventory; inventory requiere branch membership activa; opening exige warehouse vacío.
- Conteo físico: el movimiento revalida cantidad esperada y `balance_version` contra el balance actual bajo mutex del almacén.
- El actor/scope se revalida al insertar movimiento con `NOWAIT`; sale requiere venta draft y línea exacta por tenant/sucursal/almacén/actor/producto/cantidad/costo.
- Purchase receipt, transfer in/out, customer return y reversal siguen bloqueados hasta tener sus documentos fuente y autorización por tipo.
- HEAD #262 `19103c000b354da85c1a478867a6a18e2ec25cd7`: 8/8 SUCCESS. Pasaron build/typecheck, unit tests, integración PostgreSQL de auth, branches, registers, catalog, counts, reads, checkout, runtime-role API, migraciones 0001–0019, login real `microapp_runtime`, backup/restore, Cloudflare build checks y Trivy.
- Remediación P1 documentada: https://github.com/BTF14/Micro-app/pull/262#issuecomment-6719627864.
- Residual explícito: el rol PostgreSQL compartido valida el actor declarado pero no lo vincula criptográficamente a la sesión HTTP; `authorizeBranchOperation` sigue siendo obligatorio. No habilitar otros tipos de movimiento.

### Secuencia de integración segura
1. #251 → #255: raíz de retención auth y después ingesta oficial BCV.
2. #258: checkout. Después de #255, sincronizar su rama con el resultado integrado y resolver adiciones de rutas en `apps/api/src/index.ts` y Crons de `apps/api/wrangler.toml`; volver a ejecutar checks exactos.
3. #262: después de integrar #258, retarget base a main y volver a ejecutar checks exactos.
4. #261 documentación: merge independiente después de review formal y checks de esta actualización.
5. #233: mantener abierta hasta integrar #255/#258; después cerrar como supersedida. Su auditoría histórica no encontró implementación vigente única que portar.
6. #193: no modificar bajo la restricción vigente; conservar su propuesta de Fase B para revisión separada.

**Producción NOT READY:** no se comprobó en esta sesión la identidad/ownership del runtime de Neon ni se hizo rehearsal protegido. No se tocaron Neon main, datos reales, secretos, Worker productivo, DNS, billing ni deploy manual. No solicitar capturas, Build IDs, terminal, CLI o TinyFish.

---

## 2026-11-08 13:15 UTC — reconciliación de PR #269/#270/#255 y Neon rehearsal

- Main verificado: `5f09b87aee09d0746f6ea90f076b4eb81d168daf`; 7 PR abiertas.
- #269 HEAD `56a5f2ebf4f63c03bc4e50bbf5eb45b6e0aebbde`: Open/Draft/mergeable; 13 ahead/0 behind; 11 workflow runs completed/success; una review COMMENTED, sin APPROVE.
- #270 HEAD `d3ec41147798ab19ffb74147f319565e8ea31b31`: Open/Draft/mergeable; 1 ahead/0 behind; 9 workflow runs completed/success; diff solo dos líneas de resumen Bash.
- #255 HEAD `59b6b40ddf30f6711624124b719ef15234ce5fdc`: Open/Ready/no mergeable; base c46ed6f; diverged 48 ahead/2 behind main; 10 workflow runs completed/success; no review formal.
- Neon rehearsal verificado con SELECT directo: neondb, microapp_migrator, branch ID y project ID esperados, 15 tablas. Sin DDL/DML.
- El propietario confirmó que actualizó el secreto Actions, pero no hay run posterior que pruebe su consumo. El conector no permite workflow_dispatch; el siguiente paso es lanzar verify manualmente desde main, sin aplicar migraciones.
- #193 no se modificó. Sin merges, force-push, cambios de secretos/Cloudflare ni escrituras en Neon. Producción NOT READY.

## 2026-11-08 13:22 UTC — merge #270 y reconciliación posterior

- #270 se marcó Ready y se fusionó con squash tras inspeccionar el diff de un único archivo y confirmar 9 workflow runs SUCCESS en su HEAD exacto. Merge commit/main: `37e8c40d5bacfb71133942d774c3f87d71d61b9e`. El cambio solo corrige quoting del resumen verify; no toca lógica de migraciones.
- No se obtuvo evidencia de runs post-merge desde el endpoint de runs PR-triggered; no se afirma CI post-merge.
- #269 pasó a diverged 13 ahead/1 behind y mergeable=false; #255 diverged 48 ahead/3 behind y mergeable=false. No se fusionaron.
- Neon rehearsal SELECT confirma database/login/session/branch/project y 15 tablas; no DDL/DML.
- El secreto fue actualizado por el propietario según confirmación en chat; falta run verify posterior desde Actions.
- PR #271 conserva las actualizaciones de continuidad; #193 no se tocó. Producción NOT READY.

## 2026-11-08 13:21 UTC — revisión técnica no aprobatoria de PR #255

- Review formal COMMENTED registrada en el HEAD exacto `59b6b40ddf30f6711624124b719ef15234ce5fdc` (review ID `5818042583`); no es APPROVE.
- Dos bloqueadores P1 para producción: la tasa de una fecha nueva no tiene política de detección de variaciones anómalas (solo rango máximo 1e9); el Cron captura fallos y solo emite log genérico, sin señal/alerta fiable.
- El parser se valida con fixtures sintéticos; falta verificar markup real de BCV con fixture revisada.
- #255 permanece Open/Ready, mergeable=false, 48 ahead/3 behind main. No merge.
- #271 docs PR: HEAD actual mergeable=false (8 ahead/1 behind) y sin workflow runs reportados; no merge.

## 2026-11-08 13:24 UTC — actualización de mergeability y CI de PR #271

- GitHub recalculó mergeability: #269 Open/Draft/mergeable=true (13 ahead/1 behind); #255 Open/Ready/mergeable=true (48 ahead/3 behind). Ambos siguen bloqueados por sus gates técnicos y de producto, no por un estado dirty confirmado.
- #271 Open/Ready/mergeable=true; HEAD `bf8af19d6f96bfde8df46cef6ccc6abcbc9ff6ba`; compare 12 ahead/1 behind. Runs del HEAD: ODD docs, dependency review, dashboard y un check más completed/success; Semgrep, PostgreSQL migration runner validation, CI, database migration validation, security scan, Playwright E2E y secret history scan pending/in progress al momento de consulta. No merge mientras haya checks pendientes.
- #255 conserva review COMMENTED (ID 5818042583), sin APPROVE; dos gates P1 anotados.

## 2026-11-08 13:25 UTC — HEAD actualizado de PR #271

- Las últimas actualizaciones de CURRENT_STATE, HANDOFF, WORK_CHECKPOINT y STATE_JOURNAL movieron el HEAD de PR #271 a `c52a334cd651aa7c4352a336a8c5947be65eabde`.
- GitHub informa PR #271 Open/Ready/mergeable=true, compare 12 ahead/1 behind; el endpoint no devolvió workflow runs para el HEAD actual.
- Las 10 ejecuciones observadas previamente corresponden al HEAD anterior `bf8af19...` (3 SUCCESS y 7 pending/in_progress); no validan `c52a334...`. No fusionar hasta CI exact-HEAD.

## 2026-11-08 13:26 UTC — cierre de actualización documental de continuidad

- CURRENT_STATE, HANDOFF_NEXT_CHAT, WORK_CHECKPOINT y STATE_JOURNAL quedaron reconciliados en la rama documental de PR #271.
- No se copia un SHA de PR #271 dentro de sus propios documentos porque cada commit documental mueve el HEAD; consultar siempre el HEAD vivo de la PR.
- Los runs observados en commits anteriores de #271 no validan el HEAD final. Requerido: CI completo en el HEAD final antes de merge.

## 2026-11-08 13:27 UTC — reconciliación de estados de mergeability fluctuantes

- En consultas consecutivas GitHub alternó `mergeable` de #269 y #255 entre false y true sin cambios en sus HEADs; última respuesta para ambos: true. Se conserva compare: #269 13 ahead/1 behind; #255 48 ahead/3 behind. No inferir conflicto únicamente de una lectura anterior de mergeable.
- Para #271, la última lectura devolvió mergeable=false y compare 28 ahead/1 behind; no se han devuelto runs para su última actualización documental.
- Los gates técnicos/producto de #269/#255 permanecen; mergeable=true no equivale a elegibilidad para fusionar.

## 2026-11-08 13:29 UTC — consolidación de continuidad documental

- Se creó `docs/reconcile-neon-pr-state-clean-20261108` desde main `37e8c40d5bacfb71133942d774c3f87d71d61b9e`.
- La rama anterior de continuidad #271 acumuló commits sucesivos al registrar checkpoints y quedó 1 commit detrás de main; para evitar ruido y conflicto de base, se transfieren sus cuatro archivos finales (CURRENT_STATE, HANDOFF_NEXT_CHAT, WORK_CHECKPOINT y STATE_JOURNAL) a una rama limpia.
- No se descarta contenido: se copian los blobs finales de los cuatro archivos desde #271. La PR anterior se cerrará como supersedida solo después de verificar que la nueva PR contiene exactamente esos cuatro archivos.
- La nueva PR será #272; esperar CI exact-HEAD antes de integrar.

## 2026-11-08 13:30 UTC — baseline fingerprint y estado post-merge

- Neon rehearsal verificado por SELECT directo con `microapp_migrator`: identidad de DB/rol/branch/project correcta.
- Fingerprint live contra baseline canónico 0002: 294/294 líneas idénticas. No DDL/DML.
- Roles: migrator y runtime sin privilegios elevados; runtime sin INHERIT y sin CREATE en public; 17 relaciones públicas propiedad de migrator.
- #270 mergeado en `37e8c40d5bacfb71133942d774c3f87d71d61b9e`; #272 documentación mergeada en `33016a2d206c7b8cfc60e53e34a56a26651141d7`, 10/10 workflows SUCCESS exact-HEAD; #271 cerrado como supersedida.
- #255 revisión COMMENTED ID 5818042583: dos P1 (falta de control de variación anómala de tasas y de señal/alerta fiable ante fallos del Cron). #255 y #269 continúan sin aprobación y no se fusionaron.
- El propietario confirmó la actualización del secreto Actions, pero no se ejecutó verify posterior; el conector no permite workflow_dispatch. Próximo paso: el propietario dispara verify manualmente en main.
- Producción NOT READY.

## 2026-11-08 13:34 UTC — GitHub Actions Neon verify SUCCESS tras rotación

- Se reintentó el run #42479603848 (workflow manual, operación verify) usando el action de rerun failed jobs. El job terminó SUCCESS.
- Los logs mostraron el secreto enmascarado (no vacío), conexión directa, identidad exacta de database/login/branch/project y `BASELINE_VERIFIED` con 294 facts.
- Los pasos de baseline adoption, migration apply y post-migration assertions quedaron SKIPPED. No hubo DDL/DML ni cambios de ownership.
- Como rerun, conservó GITHUB_SHA/GITHUB_REF originales; el summary step del SHA antiguo produjo tres `command not found` por quoting, sin fallar el job. PR #270 ya corrigió el summary en main.
- Confirmado: main tiene migraciones hasta 0016; #269 aporta 0017–0019. El workflow `adopt-and-migrate` desde main no probaría 0017–0019 y no debe ejecutarse para ese objetivo. Diseñar un rehearsal de SHA fijado/revisado antes de cualquier escritura.

## 2026-11-08 13:38 UTC — detección de datos heredados y nueva base vacía

- La rama rehearsal br-curly-poetry-b7dxsddm tiene parent_id br-summer-math-b7297a60 (main), init_source=parent-data. La DB original neondb contiene filas en tablas app_users/auth/org; no se inspeccionó contenido. Se bloquea cualquier escritura/migración sobre ella.
- Se creó DB vacía microapp_rehearsal (ID 1333740), owner microapp_migrator, en la rama no-primary. SELECT confirmó 0 tablas y target identity exacta; role/schema grants son compatibles con el runner.
- GitHub Actions rerun #42479603848 verify SUCCESS después de la rotación: secreto enmascarado, conexión directa, identity exacta, baseline 0002 294 facts. Los pasos de escritura quedaron SKIPPED.
- Main contiene migraciones hasta 0016; #269 contiene 0017–0019. migrate.sh acepta MIGRATIONS_DIR, pero no ejecuta assertion/deferred-failure SQL por sí solo. El nuevo workflow debe fijar el SHA #269, extraer solo SQL y ejecutar assertions expresamente en microapp_rehearsal.
- #269 HEAD bc3939510e132e6f77c751514ff1b7dca58cdd4d: 11/11 workflows SUCCESS tras endurecer DELETE/TRUNCATE de payments. No merge; PR Draft.

## 2026-11-08 — consolidación de PR de checkout/inventario y observabilidad BCV

- Comparación read-only de PR #258/#262 con #269: 0017 migration/assertions byte-identical; 0019 migration/assertions, inventory-counts.ts, inventory-locks.ts y sus tests byte-identical; 0018 difiere por hardening DELETE/TRUNCATE de payments; sales-checkout.ts en #269 incluye branchId en el lock de warehouse. #269 contiene el stack consolidado sobre main. Comentarios de trazabilidad #6722326651 y #6722327171. No cerrar #258/#262 hasta que #269 se integre y el contenido se confirme en main.
- PR #255, HEAD a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7: se añadió log de outcome exitoso BCV y error code allowlisted; los errores del Cron se relanzan como BCV_SYNC_FAILED para que la invocación programada falle visiblemente. Tests para éxito, código permitido, sanitización y no-producción. CI exact-HEAD 10/10 SUCCESS. Esto no añade persistencia ni alerta externa; la política de anomalías sigue pendiente.
- PR #274 workflow: el rehearsal separa baseline 0001–0002 y verifica fingerprint 0002 antes de aplicar 0003–0019. Después ejecuta assertions 0017–0019. Usa solo SQL del SHA fijado de #269 y el runner de main; destino único microapp_rehearsal. La rama clonada neondb sigue prohibida para escrituras.
- migrate.sh registra state=applying antes de la migración; si una migración falla, el ledger no es auto-resumible. El workflow solo permite ledger con prefijo completo en estado applied; si aparece applying, requiere reconciliación/reset explícito. No se ha ejecutado ninguna migración.

## 2026-11-08 — CI exact-HEAD y estado de integración

- PR #255 HEAD a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7: 10/10 workflow runs SUCCESS. El Cron ahora registra outcome exitoso, código de error permitido y relanza error genérico para que el evento falle visiblemente. No hay persistencia del último intento ni alerta externa; no se considera resuelto el P1 de operación.
- PR #274 HEAD 5621eaf12744f7cfff34e87ee102d66a90b95f1d: 10/10 workflow runs SUCCESS exact-HEAD, mergeable=true. Incluye workflow de rehearsal y documentación. Aún no integrado; no se ha ejecutado verify-empty desde Actions ni ninguna migración.

## 2026-11-08 — revisión final del workflow fijado #274

- Main HEAD confirmado: 33016a2d206c7b8cfc60e53e34a56a26651141d7; branch protegido. Los seis contextos requeridos expuestos por la respuesta de branches/main están SUCCESS en el HEAD #274.
- PR #274 HEAD ee04e6d97b179a86ea842f8a1ae8a03b4c33a134, base 33016a2d206c7b8cfc60e53e34a56a26651141d7, mergeable=true; 10/10 workflow runs y 15/15 check-runs SUCCESS exact-HEAD. No formal reviews, no inline threads, no reviewers requested. Revisión técnica manual del diff/workflow; no se atribuye aprobación independiente.
- GitHub branch-protection endpoint respondió 403 por permisos del conector; se verificó la lista de seis required status contexts en el recurso de branch y todos están verdes. No se pudo leer el ajuste separado de required approvals.
- El conector GitHub disponible es GET-only para mcp__GitHub__fetch y no expone workflow_dispatch; por ello no se puede iniciar desde aquí el workflow manual nuevo. El run previo #42479603848 del workflow anterior neon-rehearsal-migrations.yml sí verificó con éxito el secreto rotado y la conexión directa, pero no sustituye el nuevo verify-empty.
- Ninguna migración, DDL/DML, escritura en Neon ni cambio de producción ejecutado.

## 2026-11-08 — corrección del falso positivo de secret-history scan

- El secret-history scan de PR #274 detectó como generic-api-key una línea de STATE_JOURNAL que contenía la frase "GitHub API:" inmediatamente antes del SHA de main. El log identificó esa única línea; no se mostró ni se identificó ninguna credencial real.
- Se creó PR #275 desde main para no conservar en su historial el commit señalado. Se preservó el contenido del workflow y de continuidad; solo se reformuló la línea que disparó el patrón. Mantener #274 abierta hasta que #275 pase todos los checks y se integre; luego cerrar #274 como supersedida.
- El historial de la rama fuente sigue accesible a Gitleaks por refs del repositorio; se añadió `.gitleaksignore` con únicamente el fingerprint exacto `a78bb9699ea00c09f9fae88b964c2aac5a08f337:docs/STATE_JOURNAL.md:generic-api-key:2124`. No se desactiva la regla ni se ignora el archivo.

## 2026-11-08 — PR #275 integrada y preflight Neon preparado

- PR #275 se fusionó por squash en main 11ca2b49bfa650066a708d2423cc73cea6c99e2d; PR #274 se cerró como supersedida.
- El commit de merge tiene 9/9 workflow runs SUCCESS y los seis required contexts SUCCESS. Cloudflare Pages y Workers Builds check-runs finalizaron SUCCESS en el merge SHA; no se ejecutó smoke test HTTP autenticado de producción.
- El secret NEON_REHEARSAL_DATABASE_URL ya había sido probado por el workflow anterior en run #42479603848 después de la rotación: conexión directa, identidad correcta, baseline 0002 verificado, pasos de escritura skipped.
- SELECT en microapp_rehearsal confirmó identidad branch/project/database/role exacta, schemas estándar, cero relaciones y funciones públicas, sin schema_migrations. Sin escrituras.
- El nuevo workflow fijado main-only está disponible con default verify-empty. No se pudo despachar desde el conector GitHub; queda como única acción manual necesaria. No se ejecutó migración.
- Inventario vivo de PR: #269 15 ahead/3 behind, Draft, mergeable=false; #255 53/5, mergeable=false y gates BCV P1; #258 35/36, mergeable=false; #262 107/36 apilada sobre #258; #233 histórica Draft; #193 no modificar.

## 2026-11-08 — verificación post-merge Cloudflare

- En main 11ca2b49bfa650066a708d2423cc73cea6c99e2d, los check-runs Cloudflare Pages y Workers Builds: micro-app-api finalizaron SUCCESS, al igual que los seis contextos requeridos y el resto de check-runs observados.
- Esto confirma los checks/builds de Cloudflare asociados al merge, no un smoke test HTTP autenticado ni la validación de flujos reales de producción. Producción sigue NOT READY.


## 2026-11-08 — PR #278 integrada: fetch del SHA inmutable para Neon rehearsal

- Run Neon pinned rehearsal #2 `42502075476` falló en `Fetch and verify pinned migration source`: el workflow hacía fetch de la rama mutable `feat/checkout-ledger-recovered-main-20261108` y exigía que su HEAD fuera `6227a3a8497f6be94d675b64da5da61530c200fc`; la rama ya había avanzado a `a750d1868f0ad4ae78b3de197d160d376af688ab` por cambios documentales. Falló antes de extraer SQL, conectar a Neon o ejecutar cualquier migración.
- PR [#278](https://github.com/BTF14/Micro-app/pull/278), branch `fix/neon-pinned-source-fetch-20261108`, HEAD `b444344543a2edafaa70cf68f8450cade73c9fc4`, se revisó manualmente y fusionó por squash. Merge SHA/main: `209e3fe9f99c96a07546bb87c04b90755257d918`.
- Diff único en `.github/workflows/neon-pinned-migration-rehearsal.yml`: fetch directo de `SOURCE_SHA`, validación exacta de FETCH_HEAD; conserva pin, DB objetivo `microapp_rehearsal`, verify-empty predeterminado y confirmación separada para escritura.
- Checks PR exact-HEAD: 9/9 workflow runs SUCCESS. Branch protection de main verificada, seis contextos requeridos. No formal reviews ni hilos; se registró revisión técnica asistida, no aprobación humana independiente.
- Primera lectura de check-runs post-merge en SHA `209e3fe...`: Chromium queued; Workers Builds, Trivy, migration-runner, postgres-migration, static analysis, dashboard, verify, secret-history y Pages in_progress. Resultado final pendiente.
- No se despachó workflow de Neon, no hubo conexión Neon, DDL/DML, bootstrap-and-migrate, cambios de secretos ni datos reales. Siguiente acción: propietario ejecuta solo `verify-empty` desde Actions/main; luego revisar logs exactos. Ninguna autorización de escritura remota concedida.
- Producción continúa NOT READY.


## 2026-11-08 17:21 UTC — Neon pinned rehearsal verify-empty SUCCESS tras PR #278

- El propietario ejecutó manualmente `.github/workflows/neon-pinned-migration-rehearsal.yml` desde `main`; el checkout fue el merge SHA `209e3fe9f99c96a07546bb87c04b90755257d918`. Log recibido en chat, inicio 17:21:02 UTC. No se asigna un run ID porque no aparece en el extracto proporcionado.
- La descarga por SHA inmutable funcionó: `6227a3a8497f6be94d675b64da5da61530c200fc`; el job imprimió `PINNED_MIGRATION_SOURCE_VERIFIED` y `MIGRATION_CHAIN_VERIFIED=0001-0019`. Verificó archivos requeridos 0017–0019, assertions y baseline 0002.
- Se derivó el target `microapp_rehearsal` desde el secreto enmascarado. psql conectó y las comprobaciones de identidad (database, current_user, session_user, Neon branch ID y project ID), atributos/membresías/privilegios de roles y ausencia de objetos/ledger en el target pasaron. Resultado explícito: `EMPTY_REHEARSAL_TARGET_VERIFIED`.
- Alcance real: hubo conexión a la base de ensayo y consultas SELECT de verificación. No se ejecutaron migraciones, DDL, DML, bootstrap-and-migrate ni operaciones de escritura. La DB `neondb` parent-data clone y Neon main no fueron destino.
- El warning final deprecación Node.js 20 de actions/checkout@v4 no hizo fallar el job; el log termina tras cleanup sin error visible. Confirmar conclusión SUCCESS en metadata del run cuando se disponga del ID/enlace.
- Esto valida el fetch exact-SHA y el preflight read-only, **no** la aplicación de migraciones 0001–0019, assertions post-migración, recuperación/rollback ni preparación productiva. Producción sigue NOT READY.


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


## 2026-11-08 UTC — PR #280 integrada y verificación post-merge

- PR [#280](https://github.com/BTF14/Micro-app/pull/280) se fusionó por squash. HEAD revisado `233c1046866c479c1e79d35c8eca0290b09e97b2`; merge SHA y main protegido: `aa2804a0a6e7879f684b3baeb60646e50f1d6419`.
- En el HEAD exacto pre-merge: 10/10 workflow runs y 14/14 check-runs SUCCESS; los seis contextos requeridos por la protección de main pasaron. No hubo reviews formales ni hilos inline abiertos; la revisión técnica del diff fue manual.
- En el merge SHA: 9/9 workflow runs y 11/11 check-runs SUCCESS; CI, Playwright, PostgreSQL, SAST, secret-history y builds de Pages/Workers completados. Esto no prueba tráfico productivo ni smoke test comercial autenticado.
- El Neon pinned rehearsal #42507066215 sigue siendo la única escritura remota de este bloque: migraciones 0001–0019 aplicadas y verificadas únicamente en `microapp_rehearsal`; Neon main, parent clone `neondb`, secretos, DNS y billing no fueron tocados.
- Estado vivo de integración: #269 Draft y divergida (24 ahead / 3 behind), sin workflows pull_request completos en su HEAD actual; #255 53 ahead / 10 behind; #258 35 ahead / 41 behind; #262 apilada sobre #258 (107 ahead / 41 behind). #233 histórica Draft; #193 permanece intacta.
- #269 conserva el mismo contenido de migraciones 0017–0019 que la fuente ensayada `6227a3a8497f6be94d675b64da5da61530c200fc`; los cinco commits posteriores solo modifican workflow/documentación/ODD. El ensayo no certifica el runtime de la aplicación ni resuelve la aprobación del contrato comercial de checkout.
- Producción continúa NOT READY. Próxima prioridad: reconciliar #269 sin force-push, completar CI exact-HEAD y mantener Draft hasta aprobación del contrato comercial; revisar #255 por separado.


## 2026-11-08 UTC — PR #281 integrada y validación post-merge

- PR [#281](https://github.com/BTF14/Micro-app/pull/281) se fusionó por squash. HEAD revisado `756526779491a74b12e1b2746963b36cec59eff6`; merge SHA `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`.
- En el HEAD exacto pre-merge: 10/10 workflow runs y 14/14 check-runs SUCCESS; los seis contextos requeridos por la protección de main pasaron. No hubo reviews formales ni hilos inline abiertos; la revisión técnica del diff fue manual.
- En el merge SHA: 9/9 workflow runs y 11/11 check-runs SUCCESS, incluidos CI, Playwright, PostgreSQL, SAST, secret-history y builds de Pages/Workers. Esto no certifica tráfico productivo ni smoke test comercial autenticado.
- #255 se convirtió a Draft por gates P1 de BCV. Se identificó además que la vigencia de la tasa no está ligada a la antigüedad de `fetched_at`; no se fijará umbral sin decisión del propietario.
- #269 permanece Draft; sus migraciones 0017–0019 coinciden con el source SHA del rehearsal. El HEAD actual aún no tiene todos los contextos pull_request requeridos y el contrato comercial sigue pendiente.
- #258/#262 permanecen abiertas y divergidas; no fusionar independientemente ni cerrar sin verificar contenido único.
- No hubo nuevas escrituras Neon. Producción continúa NOT READY.


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

## Registro de cambios — PR #258/#262 superseded y validación exact-HEAD #269/#255

- #258 y #262 cerradas como superseded después de comparar sus listas completas de archivos y árboles Git contra #269. Los archivos de checkout, ledger, lock helpers, smoke runtime y migraciones están preservados/evolucionados en #269; no se eliminaron ramas ni commits.
- #269 HEAD 8f05befb7ac1a46d68850b9f89f89edc8cd46283: 16/16 check-runs y 14/14 workflows SUCCESS. #255 HEAD 7e43d7fd1519889605174da5818190bb84685059: 15/15 check-runs y 13/13 workflows SUCCESS.
- Se verificó que migration 0017–0019 y sus assertions son blob idénticos entre source Neon rehearsal 6227a3a... y el HEAD #269. No se repitió ninguna escritura Neon.
- Correcciones de integridad incluidas en #269: payments sin DELETE/TRUNCATE para PUBLIC/runtime; movimientos revalidan branch active con lock NOWAIT y test de regresión.


---

## Reconciliación de estado vivo y contingencia cambiaria — 2026-11-09 UTC

- Main verificado: `bfa7d0047d158d5caae4798337f239e767c30acd`; post-merge check-runs 11/11 SUCCESS.
- PR #288 MERGED: propuesta de Gestión de contingencia cambiaria en SDD + ADR + ODD. No implementa ni habilita tasa manual.
- PRs abiertas y exact-HEAD verificados: #255 `b0e47205b96f636b2ab270304d2598423a50ccc3` (15/15 checks, 10/10 workflows, 88/1); #269 `7fc91b54f869664febb6a7daf1ed05b408bd8430` (18/18, 11/11, 63/1); #287 `254ebb6e741f7c1b147fbd4880bc188f17204807` (15/15, 11/11, 111/1). Todas OPEN/Draft, mergeable true, sin APPROVED formal.
- #287 corrigió carrera de intentos BCV supersedidos; PR #289 y #290 se integraron solo en esa rama. La prueba PostgreSQL con tasas diferentes y el runtime-role integration pasan en el SHA validado.
- Freshness sigue P1: checkout no consulta `bcv_sync_state.last_success_at`; 10/7 son umbrales hard-coded no aprobados. No inventar política.
- BCV homepage devolvió 502 en la consulta; SUDEBAN calendario no recuperable directamente y no se obtuvo PDF/circular oficial 2027 en búsquedas de dominio oficial. No afirmar inexistencia; no usar terceros como prueba primaria.
- No merge de #255/#269/#287, no deploy, Neon writes, Cron BCV, Cloudflare manual, secretos, DNS, billing ni datos reales. Producción NOT READY.
- PR docs-only #291 en preparación desde main para reconciliar CURRENT_STATE/HANDOFF/CHECKPOINT/PLAN/JOURNAL/SECURITY_ROADMAP. Su CI exact-HEAD queda pendiente y los snapshots de GitHub deben reconsultarse antes de actuar.


---

## Estado posterior a PR #291 — 2026-11-09 UTC

- Main merge SHA #291: `56ad2b29b994fbad31275c801e8f23a2b9736db2`; post-merge check-runs 11/11 SUCCESS.
- GitHub marca #255, #269 y #287 `mergeable=false` / `dirty`, con 2 commits detrás de main. No force-push ni sync automático.
- Intersecciones documentales identificadas y registradas en CURRENT_STATE; son paths modificados en ambos lados, no se presume que todos tengan conflicto textual.
- #287 exact HEAD `254ebb6e741f7c1b147fbd4880bc188f17204807` sigue con 15/15 checks y 11/11 workflows SUCCESS, pero el branch necesita reconciliar los docs posteriores a #288/#291 antes de futura integración.
- No merge de código, no deploy, no Neon, no Cron BCV, no cambios Cloudflare manual, secretos, DNS, billing o datos reales. Producción NOT READY.
- Próximo: reconciliar #287 con main en una rama/PR aislada, preservando docs y CI; luego #255/#269 por separado.

## 2026-11-09 — Integración BCV/checkout y concurrencia

PR #287 combinó las ramas BCV y checkout en una integración Draft y añadió migración 0021 para estado de sincronización. Se detectó que una respuesta antigua podía marcar stale una tasa nueva de la misma fecha. La corrección usa bloqueo transaccional y verificación del `attempt_id`; se añadió prueba PostgreSQL con dos tasas diferentes. PR #289 corrigió la expectativa del handler `Promise<void>`; PR #290 actualizó handoff/ODD. Ambos se integraron solo en la rama #287. HEAD de código validado antes de sincronización: `254ebb6e741f7c1b147fbd4880bc188f17204807`, 15/15 check-runs y 11/11 workflows SUCCESS. Freshness y fuentes oficiales siguen gates P1.


---

## 2026-11-09 — Política de freshness BCV aprobada e implementación aislada

El propietario confirmó opción A: si el último intento BCV está `running` o `failed`, bloquear nuevas ventas hasta una sincronización exitosa. Se registró ADR `docs/decisions/ADR-20261109-bcv-checkout-last-success.md`.

Se creó `fix/bcv-checkout-last-success-20261109` desde #287 HEAD `362443524eb45c67da16811d1745d83ddc9bd3a9`. Checkout ahora consulta el singleton con `SELECT ... FOR SHARE`, exige `last_success_at`, outcome `inserted`/`unchanged` y fecha efectiva no anterior a hoy antes de leer la tasa same-day. Una tasa futura prepublicada nunca sustituye la fila same-day. Se añadieron pruebas unitarias y PostgreSQL runtime-role, incluyendo bloqueo de UPDATE concurrente. No se declara validado hasta CI exact-HEAD. No se tocó main, Neon, deploy ni Cron; producción NOT READY.


- Revalidación de implementación BCV freshness en SHA `13c8cd96becc09b0ba9ffad923ea115e5a44dcba`: CI `42625146214` SUCCESS (incluye unit, PostgreSQL atomic sales checkout integration y Runtime-role API integration); migration validation `42625146320` SUCCESS; migration runner `42625146112` SUCCESS; Playwright `42625146437` SUCCESS; Semgrep `42625146039` SUCCESS; Dependency review `42625146027` SUCCESS; ODD docs `42625145983` SUCCESS; Project dashboard `42625146038` SUCCESS. Check-runs 13/13 SUCCESS. PR Security scan `42625146113` permaneció pending sin jobs; Trivy push `42625138416` en el mismo SHA SUCCESS. PR #295 OPEN/Draft. El siguiente commit documental exige revalidar CI exact-HEAD.


- PR #295 retargeteada de la base alias temporal a `integration/bcv-checkout-rehearsal-20261109` después de ejecutar CI. HEAD probado `3a67540c7b079bb11349552ffe92c598f0fad11f`: 14/14 check-runs y 10/10 workflow runs SUCCESS. CI incluyó unit, PostgreSQL checkout integration, runtime-role API integration y typecheck; migraciones, migration runner, Playwright, Semgrep, Dependency review, ODD docs, Secret history y Security scan SUCCESS. PR #295 sigue Draft, sin reviews formales/threads. No merge, main, Neon writes, deploy ni Cron activation.


## Revisión técnica independiente — 2026-11-09

- SHA revisado y validado: `32b838c9dd90c7b5c17e359961bd67f48376d1a8`. PR #295 sigue OPEN/Draft, base `integration/bcv-checkout-rehearsal-20261109` (base SHA `362443524eb45c67da16811d1745d83ddc9bd3a9`), mergeable=true; 37 commits ahead / 0 behind. No se fusionó.
- Verificación viva: 10/10 workflow runs SUCCESS asociados al SHA; la descripción de PR registra 14/14 check-runs SUCCESS. No hay reviews formales ni hilos de revisión.
- Revisión del flujo: `syncBcvOfficialRate()` reclama el singleton con UPDATE a `running` antes del fetch HTTP; checkout toma `FOR SHARE` en la misma fila dentro de su transacción. Si checkout obtiene primero el lock, el UPDATE de inicio de sync espera hasta el final de la venta; si sync confirma primero `running`, checkout observa ese estado y falla cerrado. La finalización del sync verifica `attempt_id` bajo `FOR UPDATE` y persiste tasa + estado terminal en una transacción, evitando que intentos supersedidos sobrescriban al vigente.
- Permisos: migración 0021 concede SELECT y UPDATE por columnas a `microapp_runtime`, sin INSERT/DELETE/TRUNCATE; la prueba runtime-role verifica el lock compartido frente a UPDATE concurrente.
- Dictamen de código: no se encontró un bloqueo de corrección en el flujo revisado de checkout/sync. La validación no equivale a aprobación formal de PR ni a readiness de producción.
- Riesgo operativo pendiente: el Cron BCV está programado para `0 22 * * 1-5`, exige `APP_ENV=production` y `BCV_SYNC_ENABLED=true`, y permanece deshabilitado por defecto. No se observó un mecanismo de retry inmediato ni alerta operativa en este alcance. Si un intento falla o queda `running`, nuevas ventas siguen bloqueadas hasta el siguiente intento habilitado que finalice con éxito; hace falta definir alertas y recuperación operativa antes de producción.
- No hubo merge, cambios en main, escrituras Neon, deploy, activación Cron, cambios de secretos/DNS/billing ni uso de datos reales. Producción **NOT READY**.


## 2026-11-09 — Reconciliación contingencia cambiaria y CI #295

- Confirmado en GitHub que PR #288 está MERGED en main. Su SDD, ADR y ODD describen la tasa manual como contingencia temporal futura; no existe implementación ni habilitación. Se corrigió odd/tasks/fx-contingency-management.md en la rama #295 para eliminar la referencia obsoleta a #288 OPEN/Draft y conservar AC-5–AC-7 como pendientes.
- PR #295 en el HEAD anterior a esta actualización (fd4487c4382ecdf90f3b03c485cb34780dc8cd9c) tiene 10/10 workflow runs pull_request SUCCESS. El endpoint de combined status no devolvió status contexts; no convertir esa respuesta en un conteo de check-runs. Sin reviews formales ni threads en la consulta.
- Los commits documentales nuevos cambian el HEAD de #295; CI exact-HEAD debe reconsultarse antes de declarar validación final. PR sigue OPEN/Draft; no merge.
- Sin implementación manual FX, sin cambios de código BCV/checkout, main, Neon, deploy o Cron. Producción NOT READY.


## Snapshot de ramas de integración — 2026-11-09

- PR #287: OPEN/Draft, HEAD 362443524eb45c67da16811d1745d83ddc9bd3a9, base main, GitHub mergeable=true. Compare main...HEAD: 114 ahead / 0 behind. En ese HEAD exacto se observaron 11/11 workflow runs pull_request SUCCESS; combined status contexts vacío. La rama sigue sin aprobación formal y no se fusiona por CI verde.
- PR #255: OPEN/Draft, HEAD b0e47205b96f636b2ab270304d2598423a50ccc3, base main en SHA registrado 9c6b30281ed59726e532da840568fc9e80b528f7, GitHub mergeable=false.
- PR #269: OPEN/Draft, HEAD 7fc91b54f869664febb6a7daf1ed05b408bd8430, base main en SHA registrado 9c6b30281ed59726e532da840568fc9e80b528f7, GitHub mergeable=false.
- No sincronizar #255/#269 de forma automática ni force-push. Primero resolver la integración/reconciliación de #287 y luego revisar cada rama por separado, preservando su contenido y ejecutando CI en el HEAD resultante.
- PR #295 parte del HEAD exacto de #287 como base de integración; su HEAD actual 20c65e2541f2701347055cd2c2be70240d151362 no tiene workflow runs pull_request ni status contexts visibles. Mantener Draft y no declarar CI exact-HEAD.


## Resultado de la corrección de filtros CI — 2026-11-09

- Rama base integration/bcv-checkout-rehearsal-20261109 avanzó seis commits desde 362443524eb45c67da16811d1745d83ddc9bd3a9; el compare confirma que los únicos seis paths modificados son los workflows CI, migration-check, Playwright, Semgrep, secret-history y security-scan. Se añadió integration/** exclusivamente a pull_request.branches; jobs y permisos no cambiaron.
- La punta de #287 tras los seis cambios es a3653df0788b320caa931f2e03a3b42886e0062f. La punta de #295 tras el asiento documental es 062a5c66f4bbff6fd60a3f88000ee9aab62d721c.
- GitHub no muestra workflow runs pull_request ni status contexts en ninguno de esos dos HEADs. El commit previo 362443524... de #287 sí tenía 11/11 workflows SUCCESS; esos resultados no se trasladan a a3653df... ni validan la nueva punta. El SHA 556fe481... previo de #295 tampoco tenía runs; no se trasladan resultados a 062a5c...
- El conector disponible no expone workflow_dispatch; las escrituras hechas mediante la integración GitHub no produjeron ejecuciones visibles. No se puede afirmar por qué GitHub no lanzó los eventos, ni simular éxito. La modificación de filtros está en la rama base de #295 y preparada para futuros eventos de PR hacia integration/**; validación exact-SHA sigue pendiente.
- #287 y #295 siguen OPEN/Draft. No se cambia base, no se fusiona, no se despliega, no se escribe en Neon ni se activa Cron. Mantener gate hasta que un evento de CI real valide cada HEAD final.


## 2026-11-09 — Integración segura de freshness BCV y defensa PostgreSQL

- PR #287 recibió la integración de los cambios funcionales de #295 mediante commit fast-forward sobre la rama de integración; no se fusionó PR ni se tocó main. La reconciliación preservó los seis commits exclusivos de #287 (filtros `integration/**`) y combinó append-only los documentos compartidos.
- Se añadió el guard de último éxito BCV en `findApplicableCheckoutRate()`: `last_success_at` presente, outcome `inserted`/`unchanged`, fecha efectiva no anterior a hoy Caracas y tasa válida con fecha exacta de hoy; lectura `FOR SHARE` en la transacción.
- La auditoría detectó que el trigger SQL de ventas previo no verificaba `bcv_sync_state`. Se reforzó migración 0021 con trigger diferido `sales_latest_bcv_sync_success`, función `SECURITY DEFINER` propiedad del migrator, permisos directos revocados y prueba PostgreSQL de escritura directa con rol runtime tras fallo. El trigger solo controla nuevas finalizaciones, no mutaciones posteriores de ventas ya completadas.
- HEAD de código validado: `12550a3c50212234b39e3e84b45f36a07465abde`. GitHub: 13/13 workflow runs SUCCESS, 15/15 check-runs SUCCESS. Combined status legacy: `pending` con lista vacía de status contexts; no se interpreta como fallo de check-runs ni como aprobación formal. PR #287 OPEN/Draft, sin APPROVED formal.
- Cloudflare check-runs muestran Pages/Workers preview URLs y alias; no hay evidencia de promoción a producción. No se realizó deploy manual ni se activó Cron.
- PR #295 permanece OPEN/Draft como procedencia, 51 ahead / 9 behind respecto a #287, mergeable=false; no debe fusionarse independientemente. PR #255/#269 siguen OPEN/Draft y mergeable=false. PR #196 se observó CLOSED/no merged; no se reabrió. Issue #53 sigue OPEN.
- Investigación operativa: Cloudflare Alerts Monitors ofrece consultas SQL y destinos email/webhook en todos los planes; el coste de queries/alerts no es adicional y el nuevo Free Observability allowance anunciado para 2026-12-01 es 0,5 GB/día + 7 días de retención. Falta comprobar Logs/columns/plan en la cuenta. No se configuró nada.
- Pendiente: actualizar/revalidar CI tras este commit documental; fixture HTML BCV oficial; calendario bancario oficial SUDEBAN; justificación parser 10/7; alertas/watchdog/recovery; legal/contable; semantics de cambio, pagos parciales, anulaciones y reembolsos. Producción NOT READY.
- Restricciones respetadas: no merge, no main, no Neon writes, no producción deploy, no Cron, no cambios de secretos/DNS/billing ni datos reales.


## 2026-11-09 — Reconciliación de progreso BCV/checkout

- HEAD de código y tests validado antes de la actualización de checklist: `27dab416a92a71f2ccf9b0310f24a80f7f6b4420`. CI terminó SUCCESS; 12/12 workflow runs pull_request y 14/14 check-runs SUCCESS. El workflow push Secret history scan reportó failure con 0 jobs, sin steps/logs; el scan pull_request sí pasó.
- Corrección de COMMIT ambiguo implementada en `apps/api/src/exchange-rates.ts`: ante error terminal se reconcilia con conexión nueva y solo se marca failed si el mismo `attempt_id` sigue `running`. Se evita sobrescribir un éxito ya confirmado.
- Tests añadidos: fetch failure; DB unavailable al registrar fallo; cleanup posterior a commit; respuesta COMMIT perdida; fetch fallido de intento supersedido. Unit tests y toda la matriz PostgreSQL pasaron en CI exact-HEAD.
- `odd/tasks/bcv-sync-alerting-recovery.md` actualizado en commit `afac566848170e117c0afaca63bc7939ed777374` con la corrección, tests, evidencia y pendientes.
- El artefacto del dashboard del run `42673632481` (HEAD `afac566...`) informó 30,4% implementación (7/23) y 31,8% producción (7/22), pero se detectó que el checklist no reflejaba el vertical slice BCV/checkout recién implementado. Esos porcentajes son una instantánea histórica del checklist anterior, no una medición reconciliada.
- Se amplió `docs/PRODUCTION_READINESS.md` con criterios separados para los vertical slices implementados y sus gates aún abiertos. Commit: `62f3f3ca16416b3f1130eaf1caa6e910a08c86aa`. El dashboard debe regenerarse y validarse en el nuevo HEAD; no reutilizar los porcentajes previos.
- Los criterios completos de POS, pagos mixtos, devoluciones, fiscalidad, aislamiento de todas las rutas, RPO/RTO, alertas, capacidad, identidad efectiva y revisión legal/contable permanecen pendientes; producción NOT READY.
- PR #287 permanece OPEN/Draft; no merge, deploy, Cron, Neon main writes, secretos, DNS, billing ni datos reales.

## PR #287 — safe default del Cron BCV y validación exact-HEAD — 2026-11-10 UTC

### Cambios
- Commit `4113e9048d9d28df093134f241ba4aa7f3e2800b`: reconcilia el ADR de last-success con migration 0022. Las afirmaciones sobre UPDATE column-scoped de `microapp_runtime` describen el estado previo a 0022 y quedan supersedidas en la rama de integración.
- Commit `6902fdf85412938deaac086d34aba0ef267afca3`: cambia `apps/api/wrangler.bcv.toml` de `BCV_SYNC_ENABLED=true` a `false`, manteniendo comentario de habilitación explícita.
- Commit `20a3801d6a9c27cae0b12098c3bfa9cf82d83d59`: añade prueba de regresión que importa `wrangler.bcv.toml?raw` y comprueba que el valor por defecto sea false y no true.
- Commit `31c0cf59414871ce6987ef4d1315dd1ded3ad6d1`: registra la reconciliación de estado en CURRENT_STATE.

### Evidencia CI del HEAD de código `20a3801d6a9c27cae0b12098c3bfa9cf82d83d59`
- 11/11 workflow runs `pull_request` SUCCESS; 0 failure, 0 pending.
- CI run `42832033772`: SUCCESS. Incluye unit tests, typecheck/build, PostgreSQL auth, BCV effective-date, atomic checkout y Runtime-role API integration.
- Playwright E2E `42832033722`: SUCCESS.
- Database migration validation `42832033808`: SUCCESS; migration 0022 y assertions del productor/runtime aprobadas en PostgreSQL desechable.
- Migration runner `42832033741`: SUCCESS; aplica secuencia, verifica ownership/ledger y denegaciones de runtime.
- Backup restore smoke sintético `42832033842`: SUCCESS; no es restore productivo.
- Security `42832033787`, Secret history `42832033903`, Semgrep `42832033221`, ODD `42832033733`, Dependency review `42832033714` y dashboard `42832033817`: SUCCESS.
- Combined status contexts: lista vacía. No se atribuye a esto un conteo de check-runs.
- PR #287 sin reviews formales ni threads inline en la consulta posterior al HEAD; permanece OPEN/Draft.

### Resultado y límites
- El Worker BCV tiene ahora configuración fail-closed por defecto: aunque el trigger Cron esté declarado, el handler retorna sin sincronizar salvo `APP_ENV=production` y `BCV_SYNC_ENABLED=true`. No se desplegó ni activó el Worker.
- El LOGIN `microapp_bcv_sync`, su secreto y la identidad efectiva del Worker no están provisionados en Neon/Cloudflare. La migración 0022 está probada solo en PostgreSQL efímero.
- No se tocó main, Neon, Cloudflare, secretos, DNS, billing ni datos reales. Producción NOT READY.
- El diff comparado con main `c537356...` queda 178 ahead / 1 behind, diverged, merge base `03442951...`; no se hizo sincronización automática ni force-push.
- La UI del branch mantiene los módulos Caja y ventas, Inventario y Reportes deshabilitados; el checkout API no satisface el P0 de jornada completa desde UI. Issue #53/P0 y el hallazgo de privilegios efectivos del rol `backup_readonly` siguen abiertos.
## 2026-11-10 — Migration 0022 ACL normalization, producer/runtime test split

### Hallazgo y decisión
- Una segunda revisión detectó que la migración 0022 no debía asumir ACL vacía en un LOGIN producer preexistente. `REVOKE ALL ON TABLE` no basta para borrar ACLs independientes por columna. También se debía proteger contra ACLs concedidas a PUBLIC.
- Se normalizó la migración: revoca ACLs table-level y column-level del productor en `bcv_sync_state`/`exchange_rates`, limpia ACLs table/column de PUBLIC, y vuelve a otorgar un allowlist column-level. Runtime mantiene lectura table-level y no tiene INSERT/UPDATE efectivo en ninguna columna BCV.
- El productor recibe SELECT solo en `singleton`, `attempt_id`, `last_outcome` del estado; UPDATE solo en los campos de sincronización; SELECT de `id`, `rate`, `source`, `effective_date`, `validation_status`; INSERT solo en columnas usadas por el INSERT; UPDATE solo en `validation_status`. No recibe table-level SELECT/INSERT/UPDATE, DELETE, TRUNCATE, REFERENCES ni TRIGGER.
- El migrator no es propietario del schema `public`; por eso no intenta revocar CREATE. El preflight exige USAGE y rechaza CREATE. El workflow prueba esta condición otorgando CREATE con el administrador, ejecutando la migración como migrator, verificando el error `MICROAPP_BCV_SYNC_SCHEMA_PRIVILEGES_INVALID` y retirando el grant como propietario.

### Pruebas de regresión
- `migration-check.yml` siembra privilegios table-level amplios al productor y PUBLIC y añade ACLs column-level específicas antes de 0022; la migración debe eliminarlos. Las assertions inspeccionan `pg_class.relacl`, `pg_attribute.attacl`, privilegios efectivos enumerando columnas, memberships y el contrato de `lock_bcv_sync_state()`.
- La primera ejecución con SHA `380bf757...` falló en `findApplicableBcvRate`: el test usaba el LOGIN producer para una lectura que pertenece al runtime. Se corrigió el test, no los grants: `producerClient` sincroniza/persiste; `runtimeClient` lee tasas y checkout; `cleanupClient` admin solo limpia el PostgreSQL disposable.
- La integración incluye una prueba dedicada que confirma que `microapp_runtime` no puede persistir tasas (SQLSTATE `42501`) y que el productor sí puede sincronizar.

### Validación final de código
- HEAD de código `24bcf66c0c570ec76566de03a70b2443e64fc69f`: 11/11 workflows SUCCESS.
- CI `42834223332` SUCCESS, incluyendo migration 0022 contract, BCV effective-date integration con producer LOGIN, runtime-role API integration y atomic sales checkout.
- Database migration validation `42834223191` SUCCESS: dirty producer ACL fixture, dirty PUBLIC ACL fixture, schema CREATE fail-closed, rollback atómico, apply migration, assertions y SQL operations/denials con runtime LOGIN.
- Migration runner `42834223048`, Playwright `42834223393`, backup smoke `42834223426`, Security `42834223440`, Secret history `42834223064`, Semgrep `42834223348`, ODD `42834223489`, Dependency review `42834223323`, dashboard `42834223080`: SUCCESS.
- PR #287 permanece OPEN/Draft, sin reviews ni threads. Comparación del HEAD de código con main `c537356...`: 199 ahead / 1 behind, diverged. Los commits de documentación posteriores no cambian código; comprobar CI exact-HEAD antes de actuar.
- Sin cambios en main, Neon, Cloudflare, secretos, DNS, billing ni datos reales. Worker/Cron BCV no desplegado/activado. Producción NOT READY.

## 2026-11-10 14:35:49 UTC — revalidación exact-HEAD y backup/RPO

- En PR #287, el run PostgreSQL migration runner `42834658189` ya completó SUCCESS. En el HEAD anterior `225dba37812112f3669af3dffa79b04ec6a8762f` había 11/11 workflows `pull_request` SUCCESS. Los commits documentales de esta reconciliación avanzaron después la punta y no heredan esas validaciones; consultar el HEAD vivo y sus runs exactos.
- Consulta de todas las ejecuciones del workflow de backup: última ejecución sigue siendo run `42659924075` (schedule, SUCCESS, 2026-11-09T16:57:34Z); artefacto timestamp 16:57:53Z. El cron declarado es diario a las 07:00 UTC y no aparece la ejecución del 10-nov a esa hora.
- A las 14:35:49Z del 10-nov aún no se alcanzaba el umbral de 24h del artefacto; faltaban ~2h22m. No declarar incumplimiento actual hasta superar 16:57:53Z sin nueva copia válida. RPO sostenido continúa NO DEMOSTRADO por gaps históricos.
- El principal efectivo de `DATABASE_URL_BACKUP_RO` sigue sin demostrarse; no inferir que sea `backup_readonly`. No leer secretos, no ejecutar backup manual, no tocar Neon/main/cron ni producción.
- Issue #53 recibió una nota de revalidación con timestamp, evidencia, umbral y límites. Próximo paso: reconsultar después del umbral y comprobar run programado + metadatos/checksum, sin descargar ni leer el dump.
- Fecha límite inamovible: **2026-12-01**. Producción **NOT READY**.

## 2026-11-10 11:43 UTC−4 — resultado de revalidación backup

La nueva consulta posterior a la nota de 10:35 UTC−4 encuentra el workflow programado run `42842855127` SUCCESS (schedule), iniciado 15:17:48Z y completado 15:18:19Z. El repositorio de respaldos contiene `backup-2026-11-10T15-18-11Z.dump.age` (42,708 bytes) y sidecar SHA-256 (103 bytes). El sidecar declara hash `68bf4409fea85aac11a3671f9ef966079bacd49bfbab052d7a1a5c819ce1a1c5`; no se descargó el dump ni se verificó ese hash contra sus bytes.

El intervalo entre el backup previo (2026-11-09T16:57:53Z) y el nuevo (2026-11-10T15:18:11Z) es ~22h20m18s: el ciclo actual permanece dentro del límite de 24h. La ausencia del run del 10-nov observada a las 10:35 quedó superada por esta ejecución posterior. No declarar breach actual. RPO sostenido y restaurabilidad siguen NO DEMOSTRADOS; principal efectivo de `DATABASE_URL_BACKUP_RO` no probado. Issue #53 sigue OPEN/P0. Se añadió comentario con evidencia en el issue.

No se ejecutó backup manual ni se tocaron secretos, dump, Neon, roles/grants, Cron o producción. Producción NOT READY. Fecha límite inamovible: **2026-12-01**.

## 2026-11-10 — auditoría estática del workflow de backup (P0)

Revisado en solo lectura .github/workflows/backup.yml de main (blob 5df408788b9053709261ada3aa22dd73b85d5691). El preflight solo comprueba que DATABASE_URL_BACKUP_RO no esté vacío y luego pasa el secreto a pg_dump; no verifica current_user, superuser, bypass RLS, memberships ni privilegios efectivos. Por ello, SUCCESS no demuestra identidad ni least-privilege.

Además, aunque el comentario superior dice “solo tablas de negocio”, el comando no aplica allowlist de esquemas/tablas; únicamente excluye tres tablas de autenticación efímera. El dump incluye el resto de objetos/datos que pg_dump recoja por defecto. No se afirma que hoy haya otra tabla sensible: el riesgo es que la política no se hace cumplir explícitamente y puede ampliarse inadvertidamente con futuras tablas.

Decisión: no modificar workflow ni grants hasta inventariar el alcance de recuperación, acordar allowlist completa y diseñar una comprobación fail-closed de identidad/privilegios que no imprima DSN ni secretos. No ejecutar workflow_dispatch, no leer secretos, no operar Neon main ni datos reales. Hallazgo registrado en issue #53, comentario 6772087455. Backup 10-nov run 42842855127 acredita ejecución y artefacto cifrado, no principal least-privilege ni restore reciente. Mantener #53 OPEN/P0 y producción NOT READY. Fecha límite inamovible: 2026-12-01.

## 2026-11-10 — no heredar CI al actualizar documentación

La punta verificada después de registrar el hallazgo de backup fue `7500ac66c17b193c053c075bd694d57370cab03b`, con 216 ahead / 1 behind de main y merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. GitHub devolvió 0 workflow runs pull_request y 0 status contexts para ese SHA. El padre `515f85260d9ae0381eb4c4de64cd0f87ac6201da` sí tenía 11/11 workflows SUCCESS, pero esos resultados no se trasladan a la nueva punta. No hay reviews formales ni review threads. Cualquier nuevo commit documental requiere revalidación exact-SHA; PR #287 sigue OPEN/Draft, #53 OPEN/P0, producción NOT READY. Deadline 2026-12-01.

 
## 2026-11-10 — perfil de restore separado para PR #287

Se creó un perfil independiente para la cadena de migraciones 0001–0022 de PR #287. La variante de ledger de esta rama elimina `inventory_balance_ledger_intents` y proyecta balances desde movimientos; por eso no se reutiliza el fixture de main ni se escribe directamente en `inventory_balances`. La fixture agrega además una tasa BCV sintética con fecha efectiva exacta de Caracas, `bcv_sync_state` latest-success, checkout completado, allocation_position y auditoría.

El manifiesto verifica ACLs de columna y privilegios efectivos para `microapp_bcv_sync`, además de ownership/ACL de tabla/función, roles, memberships, RLS/policies y search_path. Workflow `42872318369` SUCCESS: 22 migraciones por runner oficial, age/checksum/decrypt/restore, grafo poblado y exclusión de tablas auth efímeras; round-trip 3 s. SHA validado `7746e86140cdf3a98911665f6955e57a256bfd4b`, 11/11 workflows exact-HEAD SUCCESS.

Se registra limitación: el test usa pg_dump/pg_restore por defecto, mientras el backup productivo usa `--no-owner --no-privileges`; el restore operacional bajo esos flags no está probado. Issue #53 sigue OPEN/P0. No se ejecutó backup real, no se leyeron secretos, no hubo Neon, main, deploy ni Cron.
