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

## Checkpoint vigente — 2026-11-08 08:25 UTC

Consultar `docs/CURRENT_STATE.md` para el inventario autoritativo, SHA exactos, bases, checks y dependencias. Main vivo: `d28b80edc6b2a63019ded100e46bb4b11e81153a`; 7 PR abiertas (#193, #233, #251, #255, #258, #261, #262). No hay reviews formales registradas. Los checks exactos observados están verdes, pero no sustituyen revisión ni gates de producción.

**Última acción técnica:** revisión de #262; se publicó el hallazgo P1 #6719238384: el runtime conserva INSERT en ledger y el trigger de validación retorna cuando `count_id IS NULL`, permitiendo tipos de movimiento sin documento fuente. Cerrar esa frontera antes de habilitar esos tipos.

**Siguiente:** revisar/cerrar #258 y #262; resolver aprobación de producto para el modelo de pago; auditar #251 como raíz de #255 y no activar Cron hasta rehearsal protegido/runtime grants; preservar #193/#233 hasta recuperar todo trabajo único. Producción sigue NOT READY. No Neon main ni cambios sensibles.

---

## Checkpoint operativo — 2026-11-08 06:45 UTC

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

## Checkpoint posterior a #257 — 2026-11-08 UTC

- Main: `912e4d269de3b7ac2d43632c9bfcdb10041dbae8`; #257 docs y #259 CI serialization ya integradas.
- #258 Draft, HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94`: 15/15 check-runs, 13/13 workflows; 141 unitarias, 85 runtime-role y 16 checkout PostgreSQL integration tests. Migration 0017 en la rama, no en main/Neon. Incluye guard SQL por línea.
- #251 y #255 Draft, ambos con 15/15 check-runs + 13/13 workflows SUCCESS en HEADs registrados; sin review formal. #255 no integrado.
- #193 sin cambios. #233 fuente histórica recuperada por #258.
- Producción NOT READY: ingesta BCV, contrato de pagos, asignación por pago en DB, privilegios balances, feriados y UI.
- Ningún cambio en Neon main, secretos o despliegue manual.

## Checkpoint vivo — 2026-11-08 UTC

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


## Checkpoint actualizado — 2026-11-08 UTC

- Main: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- #258 checkout: implementation SHA `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 15/15 checks, 13/13 workflows, 141 unit tests, 85 runtime-role integration tests y 15 checkout PostgreSQL integration tests. HEAD actual `433a1fa1212f610cbb543597e620219bd91327a4` tiene 13/15 check-runs y 12/13 workflows SUCCESS; verify, Cloudflare Pages y CI pendientes. Migration 0017 está en la rama, no en Neon.
- #259 CI race fix fusionada en main como `07b146a3f2b7830bbd328a585535084e57e43c4e`.
- #257: HEAD previo al refresh `2cecf9b6f462d80b38cdb58be09b21dd2f7f4d3b`, 12/12 check-runs SUCCESS y 10/13 workflows SUCCESS; 3 pendientes sin fallos. El refresh de documentos exige nueva comprobación exact-SHA.
- #251/#255: Draft; 15/15 check-runs y 13/13 workflows SUCCESS en sus HEADs exactos; sin review formal. #255 sigue dependiendo de #251 y no está en main.
- #233 no se fusiona: código recuperado en #258; conservar hasta que no quede contenido único.
- Producción NOT READY. No Neon main, secretos, despliegue ni datos reales modificados.

# Work checkpoint — BTF14/Micro-app — 2026-11-08 UTC

## Estado GitHub

- `main`: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- #251 Draft, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, base main, 15/15 check-runs SUCCESS, cero commits detrás.
- #255 Draft, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251 `5dec5d5...`, 13 workflow runs + 15/15 check-runs SUCCESS, cero commits detrás.
- #257 Draft, HEAD `143a38664cf14e360801980d39e0cc3f2b7d5650`, base main, 10/10 check-runs SUCCESS.
- Abiertas para reconciliación: #193, #202, #211, #233. Cerradas por supersesión verificada: #200, #204, #205, #207–#210, #227–#232. No se fusionaron esas PR.
- No hay revisión formal de #251/#255; mantener Draft.

## BCV

- Parser oficial HTTPS con streaming máximo 2 MB; fecha efectiva validada; persistencia idempotente NUMERIC(18,8).
- Validación del límite de tasa exacta con BigInt.
- Latest API y cliente web no-store; dashboard revalida al cambiar fecha Caracas y al volver a primer plano; respuestas antiguas se descartan.
- Fines de semana seleccionan la fecha futura más próxima; feriados entre semana sin calendario oficial → fail closed.
- No fusionar ni activar Cron hasta migration 0013 aplicada en rehearsal, runtime grants verificados y revisión independiente.

## Neon

- Main `br-summer-math-b7297a60`: no roles runtime/migrator, no ledger, no `auth_bootstrap_attempts`, no branches/warehouses/inventory_balances/register_shifts; exchange_rates NUMERIC(14,6).
- Rehearsal `br-curly-poetry-b7dxsddm`: roles LOGIN existen y conectan; objetos bajo owner migrator; runtime no tiene grants de tabla. No ledger ni migraciones 0003–0016.
- `migration-runner.yml` solo valida PostgreSQL 18 desechable. Falta secreto/runner protegido para Neon rehearsal. No ejecutar SQL manual ni escribir en main.

## Siguiente acción

Revisión independiente #251/#255; preparar autorización específica para el runner Neon de rehearsal; después recuperar #233 en rama nueva con migration 0017, sin copiar migration 0015 antigua. Producción NOT READY.
