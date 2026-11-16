# Actualización de readiness — 2026-11-16 — cierre de Fase 1 BCV y preparación de Fase 2

- **Main / base exacta:** `98e249778a52e9306a193e838edea4503e0343e6`, merge de PR #374.
- **PR #374:** [fix(bcv): move sync to strict-TLS Node runner](https://github.com/BTF14/Micro-app/pull/374), MERGED; implementation HEAD `c38a77b9aef4a390f45417cb660c5e8cf44b448c`.
- **Post-merge:** 16/16 check-runs `completed / success` en el SHA exacto; incluye `Workers Builds: micro-app-bcv-sync` (deployment build successful, with `BCV_SYNC_ENABLED=false` in the merged config). El total real es 16, no 15.
- **Primera ejecución productiva:** [BCV Node TLS sync #1](https://github.com/BTF14/Micro-app/actions/runs/43977544849), `workflow_dispatch`, `force_sync=false`, conclusion success. El log registró `BCV_NODE_SYNC_COMPLETED` y `outcome: 'inserted'`; certificado pineado validado y runner Node 24.22.2 con `@neondatabase/serverless` ejecutado.
- **API/panel productivo (observación aportada por el propietario, 2026-11-16T23:17:15Z):** history HTTP 200, `BCV_OFFICIAL_HTML_V1`, `effectiveDate=2026-11-17`, `fetchedAt=2026-11-16T23:14:50.014Z`, `status=scheduled`; panel informó sincronización exitosa / inserted. Latest HTTP 503 `BCV_RATE_UNAVAILABLE` antes de las 00:00 VET del 2026-11-17 es el comportamiento fail-closed esperado. No se registran credenciales ni identificadores de proveedor.
- **Gate cerrado:** primera tasa BCV real persistida en Neon main y registro asociado en `bcv_sync_state`, correspondiente a `effectiveDate: 2026-11-17`, estado `scheduled` hasta medianoche Caracas.
- **Gate todavía abierto:** estabilidad posterior de BCV; observar la transición a `current` el 2026-11-17 desde 00:00 VET, la siguiente corrida automática de Node en `main` y la inactividad inocua continuada de `micro-app-bcv-sync` en Cloudflare.
- **Fase 2 — Prioridad #1:** cerrar AC-6 legal/contable y AC-7 seguridad para Contingencia Manual BCV, según `ADR-20261114-v11-product-scope-and-roadmap.md`.
- **Issue #53 permanece OPEN/P0. PRODUCTION: NOT READY. Freeze comercial vigente.** El cierre de Fase 1 no constituye GO/NO-GO ni habilita el roadmap comercial.


---

# Readiness para producción — corte vigente 2026-11-15

## Confirmaciones del propietario — CONFIRMADO — NO VOLVER A PEDIR

Estas decisiones se registran como confirmaciones del propietario, no como una nueva lectura independiente de cuentas o proveedores:

- **Presupuesto $0:** Workers Free y sin método de pago registrado. No activar planes, billing ni servicios pagados.
- **Seguimiento y alertas:** correo de GitHub Workflows verificado por el propietario; seguimiento BCV mediante el panel de la app y logs gratuitos de Cloudflare. No se requieren alertas pagas de Cloudflare.
- **RPO:** respaldo diario aproximado cada 24 horas aceptado. No volver a pedir aceptación del RPO. El RTO operativo de plataforma Tier $0 best-effort ≤4 h desde detección ya fue aceptado el 2026-11-15; no equivale a un simulacro de caída total.
- **FISC-01:** alcance actual exclusivamente interno (inventario y verificación de precios); no es facturación fiscal SENIAT. La revisión legal/fiscal/contable será gate si cambia el alcance o se incorpora facturación fiscal.

## Estado verificado — main `f4461ea689c7283c19788724e51385537f23d217`

- Post-merge de `main`: **16/16 check-runs SUCCESS** y **11/11 workflow runs SUCCESS** sobre este SHA exacto. Incluye `Cloudflare Pages`, `Workers Builds: micro-app-api` y `Workers Builds: micro-app-bcv-sync`.
- PR #370 integró las dos ventanas de Cron del Worker aislado `micro-app-bcv-sync`; PR #371 cerró la reconciliación documental anterior. Ambas están integradas.
- Corte visual read-only de Cloudflare, 2026-11-15: aparecen ambos Cron Triggers activos, lunes a viernes:
  - `0 11 * * MON-FRI` — 11:00 UTC / 07:00 VET; próximo disparo lunes 2026-11-16 11:00 UTC.
  - `0 22 * * MON-FRI` — 22:00 UTC / 18:00 VET; próximo disparo lunes 2026-11-16 22:00 UTC.
- En la misma vista se confirmó `APP_ENV=production`, `BCV_SYNC_ENABLED=true`, el secret `DATABASE_URL_BCV_SYNC` configurado (sin leer ni registrar su valor) y Observability Logs activos.
- `GET /api/api/exchange-rates/latest` respondió HTTP 503 el domingo 2026-11-15. Es consistente con que todavía no haya ocurrido la primera ventana hábil; no demuestra por sí solo un fallo ni una tasa persistida.
- El propietario confirmó smoke autenticado live con Brave Shields ACTIVADO: Google OAuth same-origin bajo `/api`, sesión persistente en móvil/escritorio, lectura de Neon `main` y logout con 401. También confirmó retiro de la URI legacy `workers.dev`.
- El build y la configuración Cron visibles no demuestran una invocación real ni persistencia en Neon. La primera observación elegible es el lunes 2026-11-16 **después de 11:05 UTC (07:05 VET)**, mediante lectura solamente.

**PR #193 está CLOSED sin merge**; Fase C fue preservada en `docs/sdd/PHASE_C_INTERBRANCH_TRANSFERS.md`. **Issue #53 permanece OPEN/P0.**

**PRODUCTION: NOT READY.** Mantener freeze y roadmap v1.1 hasta cerrar los gates pendientes.

## Gates abiertos para el lanzamiento

1. **Primera tasa BCV real persistida en Neon main:** después de las 11:05 UTC del lunes 2026-11-16, observar read-only la invocación, resultado (`inserted`, `unchanged` o `failed`), fecha efectiva y fila persistida. Si la ventana matutina no produce una tasa válida, revisar también la ventana de 22:00 UTC / 18:00 VET.
2. **Estabilidad BCV posterior:** confirmar ejecuciones válidas posteriores, incluida la ventana de 22:00 UTC, sin estados atascados, pérdida de frescura, datos inválidos ni regresiones. No levantar el freeze v1.1 antes de esta evidencia.
3. **RTO de plataforma:** objetivo **<= 4 horas desde detección**, Tier $0 best-effort, aceptado por el propietario el 2026-11-15. Restore técnico aislado #5: 1.753 ms + ~15–30 min de cutover; no se ha ejecutado un simulacro cronometrado de caída total del proveedor. RPO diario aproximado de 24 horas aceptado.
4. **Devoluciones y reversos:** permanecen en P1, pendientes de reglas de negocio/fiscales aprobadas e implementación verificable.
5. **Accesibilidad completa:** lector de pantalla y revisión final de GO/NO-GO permanecen abiertos.
6. **Alcance fiscal/legal:** revisión legal/fiscal/contable si cambia el alcance FISC-01 interno o se incorpora facturación fiscal SENIAT.
7. **Issue #53 P0:** mantener OPEN hasta demostrar sus criterios y registrar aceptación explícita del propietario.

## Snapshot histórico — 2026-11-11 — PR #287

> Snapshot histórico del 2026-11-11; supersedido por la reconciliación vigente al inicio de este documento.

- PR #287 OPEN / Draft; HEAD actual `2b57e61ea96795f18b95e9072775ead9e351cc14`; commit inmediatamente anterior `e5f956271f723bfa00da2ab527c35ac422cf6d2d` contiene el estado de implementación revisado. El commit `2b57e61ea96795f18b95e9072775ead9e351cc14` actualiza documentación de continuidad.
- En el HEAD de código `e5f9562`: 16/16 check-runs SUCCESS; 11/11 workflows PR y 2/2 push SUCCESS. CI 43/43, PostgreSQL migration validation 86/86, migration runner 21/21, restore smoke main 11/11 y BCV 10/10.
- En el HEAD documental actual `2b57e61ea96795f18b95e9072775ead9e351cc14`: **16/16 check-runs SUCCESS**, 11/11 workflows PR y 2/2 push SUCCESS. Incluye Workers Builds y Cloudflare Pages como previews, no despliegue productivo.
- Comparación con main `c5373564413ba086690552c6b7deeab08d7b4a89`: 528 ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. PR 123 archivos; reviews formales 0; review threads 0. Mantener Draft; no merge automático.
- CI sintético PostgreSQL 18 demuestra contrato de backup mínimo: SELECT explícito en objetos existentes y default SELECT para futuras tablas/secuencias; pg_dump/pg_restore-list; deniega escrituras, sequence USAGE/UPDATE, CREATE, SET ROLE y membresías. No cambia Neon.
- Neon main SELECT-only: `backup_readonly` es privilegiado y tiene write privileges; no se leyó `DATABASE_URL_BACKUP_RO`; identidad efectiva desconocida. `microapp_runtime` y `microapp_migrator` ausentes del catálogo observado. Identidad del Worker `DATABASE_URL` también desconocida.
- Issue #53 OPEN/P0. Producción **NOT READY**. No se modificaron Neon, roles, grants, contraseñas, secretos, datos reales, Cron, DNS, billing ni producción.

## Snapshot histórico — gates bloqueantes para producción (supersedido al 2026-11-15)

1. **Primera tasa BCV real en Neon `main`:** esperar la siguiente ventana válida del Cron `MON-FRI 22:00 UTC` y comprobar, de forma read-only/autorizada, la fila real, su fecha efectiva en `America/Caracas`, `bcv_sync_state` y el resultado expuesto por la API. La tasa sintética de PostgreSQL 18 CI no satisface este gate.
2. **Enrutamiento externo de alertas en Cloudflare:** demostrar entrega efectiva al destino operativo configurado; que el build o el watchdog detecte una condición no demuestra entrega externa.
3. **RPO/RTO humano:** definir responsables y objetivos, ejecutar backup/restore autorizado y registrar tiempos y evidencia. Los tests sintéticos de CI no equivalen a una recuperación real.
4. **Revisión legal/fiscal:** validar recibos, impuestos, reglas comerciales de pagos y monedas, anulaciones, devoluciones y obligaciones aplicables antes de declarar producción.
5. **Issue #53 P0 y aceptación del propietario:** mantener el issue OPEN hasta que sus gates de producción estén demostrados y aprobados.

**Decisión vigente:** **PRODUCTION: NOT READY**. La E2E full-stack contra API real y PostgreSQL 18 efímero queda validada en CI, pero no sustituye ninguno de los gates anteriores. No promover ni declarar GO mientras permanezcan abiertos.


## Revalidación de readiness — 2026-11-11 — resiliencia backup / PR #287

- Último HEAD con código y comentarios operativos validados: `9101ab502d5c52c86a8b8d01a3a79487dd07e5e8`; 18/18 check-runs, 11/11 PR workflows, 3/3 push workflows SUCCESS. Restore smoke main 0001–0016 y BCV 0001–0023 SUCCESS; CI 43/43; migration runner 21/21.
- Commit documental posterior `e5dbb497fbb2779f8fc1581880dc5d8c9ed00b65` actualiza continuidad y necesita su propia validación exact-HEAD.
- Backup programado: se sustituyeron llamadas APT directas por reintentos acotados/estrictos y curl retry/timeouts; no se ejecutó backup manual. El run natural anterior falló antes de conectar por DNS; aún no existe evidencia de un backup natural exitoso posterior.
- PR #287 OPEN/Draft; 123 archivos, 19,233 adiciones, 307 eliminaciones; 524 ahead / 1 behind main; 0 reviews formales / 0 threads; mergeable clean. No merge.
- Neon backup role sigue P0: rol `backup_readonly` observado privilegiado; secreto efectivo no leído/desconocido. Candidate least-privilege contract sintético pasa, no sustituye producción.
- Issue #53 OPEN/P0; producción **NOT READY**. No merge/deploy/Neon mutation/secret change/Cron/DNS/billing.

---

## Revalidación — 2026-11-11 — PR #287 / backup principal

- PR #287 OPEN/Draft; último HEAD de código con validación exacta `cb81ecdf6bb5fe2c0d7806f6d744925300c8ba7a`: 16/16 check-runs, 11/11 workflows PR y 2/2 push SUCCESS. Posteriores commits documentales `9114b11` y `6f7dbac` necesitan checks propios. No merge.
- 123 archivos, 19,109 adiciones y 297 eliminaciones; rama 518 ahead / 1 behind main (único commit ausente: ledger documental). Reviews formales 0; review threads 0; mergeable=true, mergeable_state=blocked.
- Neon main SELECT-only: `backup_readonly` tiene CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS, membership en `neondb_superuser` y `pg_write_all_data`, INSERT/UPDATE/DELETE sobre products. La identidad efectiva de `DATABASE_URL_BACKUP_RO` sigue desconocida; no se leyó el secreto.
- El test candidate de PostgreSQL 18 prueba grants y default SELECT para tablas/secuencias futuras, pg_dump/restore-list y denegaciones de escritura/escalada. Es evidencia sintética, no producción.
- Issue #53 OPEN/P0; producción **NOT READY**. No merge/deploy/Neon mutation/secrets/Cron/DNS/billing.

---

## Revalidación de evidencia — integración BCV/checkout PR #287 — 2026-11-09 UTC

- Rama: `integration/bcv-checkout-rehearsal-20261109`; HEAD exacto `afac566848170e117c0afaca63bc7939ed777374`; base main `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`; 157 ahead / 0 behind; PR OPEN/Draft y mergeable=true.
- CI exact-HEAD terminó SUCCESS: build/typecheck, unit tests y matriz PostgreSQL, incluidos BCV effective-date, checkout atómico, inventario, catálogo y runtime-role API.
- Check-runs publicados para ese SHA: 9 SUCCESS. Workflow runs: 7 SUCCESS y 6 FAILURE; los seis fallos devolvieron 0 jobs y no exponen steps, annotations ni logs. No se atribuyen al código ni se omiten.
- No hay reviews formales ni review threads. CI y check-runs no sustituyen aprobación independiente.
- El trabajo BCV/checkout implementado en esta rama no está en main. Los criterios completos de producto y producción siguen separados de los vertical slices parciales descritos abajo.
- Producción: **NOT READY**. No merge, deploy productivo, Cron BCV, Neon main writes, secretos, DNS, billing ni datos reales.

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
## Readiness de producción — 2026-11-08 UTC

**Resultado: NOT READY.** Los checks exactos de #251, #255 y #258 están verdes, pero ninguna tiene review formal independiente y los gates de Neon/runtime y producto siguen abiertos.

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

## Revisión de readiness — 2026-11-08 UTC

**Resultado: NOT READY para producción.** Estado GitHub y gates:

- Main `07b146a3f2b7830bbd328a585535084e57e43c4e`; #259 fusionada (serialización CI).
- #251 HEAD `e2015f3742c2fba62bada2468efdb3689e2e1db4`: 15/15 check-runs + 13/13 workflows SUCCESS; Draft, sin review formal.
- #255 HEAD `1337d28591673dabfe5c4bf1d5c0d8c03c99162b`: 15/15 + 13/13 SUCCESS; Draft, sin review formal, base #251.
- #258 HEAD `313f76c132c61200ed49a7c6e4e01fcf75659bf9`: 12/15 check-runs + 12/13 workflows SUCCESS, sin fallos; Workers Builds, verify, Pages y CI pendientes. Draft, sin review formal.
- #257 HEAD `f791b312b53541cacca67161ed1f6e5b9ab54173` antes de este refresh: 6/14 check-runs + 6/13 workflows SUCCESS; restantes pendientes, sin fallos.
- Neon main no tiene roles runtime/migrator, ledger ni migraciones 0003–0016; rehearsal tiene roles LOGIN pero runtime carece de grants de tabla y no hay ledger. No se aplicó ninguna migración remota.
- Checkout requiere tasa BCV integrada, aprobación funcional del contrato de pagos, UI, validación SQL de cálculos, rate limiting del endpoint y resolver la escritura directa de balances.
- Backup remoto: última restauración concreta documentada 2026-10-29; CI sintético reciente no sustituye una restauración remota actual, RPO/RTO, alerta externa y coste $0.

No fusionar ni activar Cron/checkout hasta cerrar revisión independiente, gates Neon, runtime identity/grants y los bloqueos comerciales/de seguridad. No se han cambiado secretos, Neon, Cloudflare productivo, DNS, billing ni datos reales.

---

## Estado vivo — 2026-11-08 UTC

**Resultado: NOT READY para producción.**

- GitHub main: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- PR #251 (auth retention): HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, 15/15 check-runs SUCCESS, Draft y sin revisión formal.
- PR #255 (BCV): HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, 13 workflow runs + 15/15 check-runs SUCCESS, Draft y sin revisión formal.
- Neon main no tiene roles runtime/migrator, `app_schema_migrations`, `auth_bootstrap_attempts`, branches, register_shifts, warehouses ni inventory_balances; exchange_rates sigue NUMERIC(14,6).
- Rehearsal tiene logins/ownership de roles, pero runtime carece de grants de tabla. No se han aplicado migraciones 0003–0016. El workflow migration-runner valida PostgreSQL 18 desechable, no Neon.
- Checkout no está integrado; #233 contiene handler/tests únicos y requiere port a rama nueva más migration 0017 para fecha efectiva de fin de semana.
- Backup/restore: última restauración remota documentada 2026-10-29; los checks recientes son CI, no nueva restauración de esa copia remota. RPO/RTO, alerta y coste total $0 siguen pendientes.
- No hay revisión formal de #251/#255; CI verde no equivale a aprobación.

### Gates bloqueantes

1. Revisión independiente y exacta de #251/#255.
2. Runner protegido en Neon rehearsal con autorización específica para crear/usar `NEON_REHEARSAL_DATABASE_URL`; no aplicar SQL manual.
3. Aplicar y verificar migraciones, ledger/checksums, ownership, grants mínimos y login real `microapp_runtime` en rehearsal. No escribir en Neon main.
4. Corregir trigger de fecha efectiva con migration 0017 y probar fin de semana/feriados fail-closed.
5. Integrar checkout, pagos, inventario y transferencias con E2E; aprobar el modelo funcional.
6. Restaurar un backup remoto reciente y medir RPO/RTO, alerta y coste.

No se cambiaron secretos, Neon main, datos reales, Cloudflare production, DNS ni billing. No se ha hecho despliegue manual.

---

# Micro app — checklist de preparación para producción

## Snapshot histórico — estado vivo 2026-11-14 UTC (supersedido por la reconciliación 2026-11-15)

- **Main actual verificado:** `40d39fb6437f85672e65de01ea33d54ccee14aee`.
- **PR #364:** fusionada; HEAD `11b666b7d1963d573bce86248cb446de6d9f2cb2`; merge SHA igual al main actual.
- **Pre-merge:** 16/16 check-runs y 13/13 workflows SUCCESS; CI `verify` 52/52 pasos SUCCESS.
- **Post-merge:** 14/14 check-runs y 10/10 workflows SUCCESS; CI `verify` 52/52 pasos SUCCESS; builds Pages/API SUCCESS.
- **PR #363:** rate limiting runtime integrado y probado en PostgreSQL 18 efímero para OAuth, checkout y 11 endpoints de escritura.
- **PR #361:** Cron BCV `0 22 * * MON-FRI` y validación TLS estricta integrados.
- **BCV en producción:** pendiente comprobar la primera tasa real persistida en Neon `main` tras una ventana válida `MON-FRI 22:00 UTC` y el enrutamiento externo de alertas en Cloudflare. CI no demuestra persistencia real.
- **Producción:** Issue #53 sigue OPEN/P0 y `PRODUCTION: NOT READY`. No se realizaron cambios remotos de base de datos, secretos, datos reales, configuración manual ni despliegues manuales.

Este archivo es la fuente de datos para el panel de avance. Un ítem solo puede marcarse `[x]` cuando existe evidencia revisable en código, pruebas o configuración. La documentación por sí sola no demuestra que una función opere correctamente.

## Cómo se calcula

- **Avance de implementación:** tareas funcionales de producto completadas / tareas funcionales inventariadas.
- **Preparación para producción:** controles de salida completados / controles de salida inventariados.
- **CI y seguridad:** se muestran como evidencia independiente; no sustituyen las pruebas funcionales.
- Los porcentajes son conteos simples de los criterios listados, no una predicción de fechas, calidad ni disponibilidad comercial.
- Los criterios bloqueantes P0 se muestran aparte. No se puede declarar listo para producción mientras quede alguno pendiente.
- No marcar una tarea completa basándose solo en un workflow de mocks.

## Estado arquitectónico — histórico reconciliado al 2026-11-14

Los párrafos de 2026-10-30 describían el estado previo a los vertical slices integrados y quedan supersedidos por la evidencia de main `b469e05ec9d687f8f4fc98c3bdbf945ce7982370`. No deben reutilizarse para afirmar que no existen endpoints comerciales, almacenes, recepciones, conteos o checkout. El checklist siguiente distingue las funciones verificadas e integradas de los límites de producto que continúan abiertos.

## Implementación funcional

### Catálogo, inventario, caja y ventas
- [x] Catálogo de productos: lectura, búsqueda, creación y edición, con pruebas PostgreSQL de integración. **Límite:** no existe todavía un módulo completo de categorías; no se incluye esa capacidad en este ítem.
- [x] Inventario por almacén: ledger de movimientos como fuente de verdad, lectura Kardex/saldos, recepciones y conteos físicos atómicos con diferencias calculadas por el servidor.
- [x] Apertura/cierre de caja y turnos asociados a sucursal, incluidos los controles de runtime de migraciones 0004 y 0023 y el lifecycle autenticado de cajero integrado.
- [x] POS de ventas USD/VES en `SalesPanel` con checkout atómico (migraciones 0015 y 0018) y asignación de pagos. **Límites:** cada venta se liquida en una sola moneda, aunque puede contener varias líneas de pago; el recibo se presenta en pantalla, sin impresión térmica ni historial de ventas.
- [ ] Devoluciones y reversos auditables, con reglas de negocio/fiscales aprobadas.
- [ ] Reportes y exportaciones autorizadas.
- [ ] Transferencias entre almacenes/sucursales y ciclo completo de proveedores/compras.
- [ ] UX responsive final y accesibilidad verificada por teclado y lector de pantalla.

### Datos, integridad y operaciones
- [x] Esquema SQL versionado 0001–0025 integrado en main y aplicado en Neon main según workflow protegido [run #43591333198](https://github.com/BTF14/Micro-app/actions/runs/43591333198); el resultado reportado fue `pending = 0`.
- [x] Roles mínimos separados `migrator`, `runtime`, `bcv_sync` y `backup`; locks determinísticos para operaciones concurrentes e idempotencia de checkout.
- [x] Ledger autoritativo con proyección de balances protegida por triggers (0019), más snapshots inmutables de precio y tasa asociados a la venta.
- [x] Sincronización BCV aislada en Worker Cron, configuración dedicada `apps/api/wrangler.bcv.toml`, rol `microapp_bcv_sync` y migraciones 0021–0022.
- [ ] Fixture oficial reproducible del cuerpo HTTP raw del BCV (status, headers y bytes originales) y calendario oficial SUDEBAN.
- [ ] Contingencia manual de tasa BCV con PIN, reautenticación, permisos, recuperación y auditoría.
- [ ] Tratamiento fiscal de IVA/IGTF y recibos fiscales revisados por asesoría competente.

### Identidad, tenant y sucursal
- [x] Autenticación y sesiones integradas con contexto tenant/sucursal; controles de acceso por rol y lifecycle de cajero cubiertos por suites de integración aisladas.
- [x] Estructura organizacional owner-only para sucursales, almacenes y cajas integrada en migración 0024.
- [ ] Aceptación end-to-end de aislamiento y operación real en staging/producción; CI PostgreSQL efímero no sustituye el smoke live ni la aprobación humana.

## Preparación para producción (gates)

### P0 — bloqueantes para declarar producción READY
- [x] CI, build/typecheck y pruebas automatizadas reproducibles en PostgreSQL efímero para los SHAs integrados; los checks de cada PR son evidencia de integración, no certificación live.
- [x] Validación del esquema/migraciones SQL versionadas 0001–0025 y assertions en PostgreSQL efímero.
- [x] Registro público y login por contraseña permanecen fail-closed; Google OAuth, allowlist, verificación de email y sesiones reforzadas están integrados.
- [x] Proxy Pages/API same-origin y configuración de callback OAuth integrados en PR #339; la integración no sustituye el smoke autenticado real con Shields.
- [x] Lifecycle autenticado de cajero (PR #347) y E2E comercial full-stack sin mocks contra API Hono real + PostgreSQL 18 efímero (PR #366) validados en CI; no equivalen a certificación de producción.
- [x] Administración owner-only de sucursales/almacenes/cajas integrada (PR #350, 0024).
- [x] Recepciones y ajustes de inventario integrados (PR #352, 0025); lectura/Kardex y conteos atómicos tienen suites de integración.
- [x] POS y checkout atómico integrados (PR #357; 0015/0018); el alcance comercial sigue limitado por las notas del bloque de implementación.
- [x] Migraciones 0001–0025 aplicadas en Neon main según el workflow protegido, run #43591333198; no inferir de ello que la aplicación esté aceptada para lanzamiento.
- [x] Smoke autenticado live con Brave Shields ACTIVADO en móvil y escritorio: Google OAuth same-origin, sesión persistente en navegación de módulos reales y logout seguro confirmado por el propietario. La verificación de tasa BCV real persistida se mantiene como gate separado.
- [x] Primera tasa BCV real persistida en Neon main y registro correspondiente en `bcv_sync_state`: PR #374 merge SHA `98e249778a52e9306a193e838edea4503e0343e6`; [BCV Node TLS sync #1](https://github.com/BTF14/Micro-app/actions/runs/43977544849) completó con `BCV_NODE_SYNC_COMPLETED` / `inserted`; observación API/panel del propietario a 2026-11-16T23:17:15Z confirmó `BCV_OFFICIAL_HTML_V1`, `effectiveDate: 2026-11-17`, `status: scheduled`. La tasa queda programada hasta 00:00 VET del 2026-11-17.
- [x] E2E full-stack real en CI contra API Hono + PostgreSQL 18 efímero, sin mocks de `/api/*` (PR #366): catálogo, recepción, turno, checkout USD/VES, recibos, stock, cierre/recarga y rechazo de venta con caja cerrada. No valida producción real.
- [x] Rate limiting runtime en rutas sensibles: integrado y probado en PostgreSQL 18 efímero para OAuth, checkout y 11 endpoints de escritura (PR #363; exact-HEAD y post-merge checks SUCCESS).
- [x] RPO diario aproximado de 24 h aceptado por el propietario; evaluar post-estabilización una segunda corrida gratuita diaria después de 06:00 VET (p. ej. 11:00/12:00 UTC) para acercar el RPO a ~12 h sin modificar workflows durante el freeze.
- [x] **RTO de plataforma aceptado por el propietario: <= 4 horas desde detección del incidente (Tier $0, best-effort, independiente del horario de cada tenant).** Evidencia: restore técnico aislado #5 en 1753 ms + ~15–30 min de cutover según `docs/DISASTER_RECOVERY_RUNBOOK.md`; no es un simulacro cronometrado de caída total del proveedor.
- [ ] Revisión legal/fiscal/contable si cambia el alcance FISC-01 interno o se incorpora facturación fiscal SENIAT.
- [x] Watchdog BCV read-only `17 * * * *`, endpoint y UI integrados en PR #364; pre-merge 16/16 check-runs y 13/13 workflows SUCCESS, post-merge 14/14 check-runs y 10/10 workflows SUCCESS. La suite PostgreSQL 18 usa login real `microapp_runtime` y comprueba privilegios de solo lectura.
- [x] Seguimiento BCV mediante panel de la app y logs gratuitos de Cloudflare; correo de GitHub Workflows verificado por el propietario. No se usan alertas pagas de Cloudflare.
- [ ] Estabilidad posterior de BCV: observar transición de la tasa `2026-11-17` a `current` desde 00:00 VET, siguiente corrida automática del runner Node en `main` y la inactividad inocua de `micro-app-bcv-sync` en Cloudflare.
- [ ] Issue #53 P0: mantener abierto hasta demostrar todos sus criterios y obtener aceptación explícita de cierre.
- [ ] Revisión final GO/NO-GO del propietario después de cerrar todos los gates de producción.

### P1 — operación, resiliencia y UX
- [x] Análisis Semgrep, Trivy, escaneo de historia de secretos y Dependency Review configurados en CI.
- [x] Backup cifrado, restauración instrumentada aislada y canal de alerta/ACK humano tienen evidencia registrada; el restore técnico aislado no equivale a un simulacro de caída total. El RTO de plataforma Tier $0 best-effort ≤4 h fue aceptado por el propietario.
- [ ] Pruebas E2E de ventas, inventario, caja y devoluciones en móvil/escritorio con API/DB reales de prueba.
- [ ] Accesibilidad por teclado/lector y UX responsive final verificadas.
- [ ] Logs operativos, retención y soporte revisados sin exponer secretos ni datos sensibles.
- [x] Presupuesto $0 y Workers Free sin método de pago, según confirmación del propietario; revalidar límites gratuitos antes del GO/NO-GO.

**Decisión vigente:** `PRODUCTION: NOT READY`. Los gates P0 pendientes son bloqueantes y no se pueden compensar con porcentajes, CI verde, previews ni migraciones aplicadas. Issue #53 permanece OPEN/P0.

## Bloqueos conocidos — corte 2026-11-14

- El producto ya contiene catálogo de productos, inventario por almacén/ledger, recepciones, conteos atómicos, turnos por sucursal y POS/checkout; no describirlo como un frontend sin endpoints comerciales.
- No hay módulo completo de categorías, devoluciones/reversos, reportes/exportaciones, transferencias inter-sucursal ni ciclo completo de proveedores/compras.
- La venta liquida en una sola moneda; puede tener múltiples líneas de pago. El recibo es solo en pantalla; no hay impresión térmica ni historial de ventas.
- La E2E full-stack de PR #366 sí es una E2E comercial real contra API/DB efímeras sin mocks; no es una prueba live de producción. El smoke autenticado con Brave Shields ACTIVADO ya fue confirmado; permanece pendiente la primera tasa BCV real persistida en Neon `main`.
- **Ya integrados, no son bloqueos abiertos:** Cron BCV `0 22 * * MON-FRI` y validación TLS estricta del workflow (PR #361); rate limiting runtime fail-closed para OAuth, checkout y 11 endpoints de escritura, probado en PostgreSQL 18 efímero (PR #363).
- **Watchdog BCV integrado (PR #364):** detección read-only horaria `17 * * * *`, endpoint y aviso administrativo al superar 300 segundos en `running`, probados en PostgreSQL 18 con login real `microapp_runtime`; pre-merge 16/16 checks y 13/13 workflows SUCCESS, post-merge 14/14 checks y 10/10 workflows SUCCESS. No altera el estado del productor ni habilita checkout.
- **Pendientes operativos BCV:** comprobar la primera tasa real persistida en Neon `main` después de la próxima ventana programada válida `MON-FRI 22:00 UTC`, y verificar el enrutamiento externo de alertas en Cloudflare.
- También sigue pendiente la aceptación humana de RPO/RTO. IVA/IGTF y recibos fiscales requieren revisión competente; no se debe inferir cumplimiento fiscal por la existencia de snapshots de precio/tasa.
- Issue #53 permanece OPEN/P0. `PRODUCTION: NOT READY`; no promover a READY hasta cerrar todos los gates P0 y obtener aprobación humana explícita.

Actualiza este checklist solo junto con evidencia verificable en main y una entrada en `docs/STATE_JOURNAL.md`.

## Respaldo y recuperación

La política está documentada en `docs/BACKUP_AND_RECOVERY.md`. La subida cifrada está verificada y la copia remota exacta se restauró técnicamente en PostgreSQL 18 desechable (run 40955935124). El control compuesto permanece incompleto hasta validar datos comerciales/conteos/relaciones, medir RPO/RTO y comprobar alertas y coste total.


## Reconciliación de evidencia operativa — 2026-11-15 (posterior a PR #372)

- Evidencia de readiness ejecutada sobre `main` `f4461ea689c7283c19788724e51385537f23d217`; estado post-merge PR #372: `d8ec2808a22d696a291c3454679381e5364e225a`, 9/9 workflow runs y 14/14 check-runs SUCCESS.

### Restore real cifrado #5 — evidencia técnica aislada

- `backup-real-restore.yml`, **Verify and restore latest encrypted backup #5**, 2026-11-15T22:10:14Z–22:11:10Z; Success; 1m 1s total / 55s job.
- Artefacto `backup-2026-11-15T14-25-22Z.dump.age`; antigüedad T0: 27945 s.
- Tiempos T0→T1, excluyendo cola/apt: descarga + SHA-256 687 ms; descifrado age 3 ms; `pg_restore --list` 6 ms; restore + replay ACL `bcv-0025` + assertions `0022/0023` + logins independientes `microapp_runtime` y productor BCV 1.021 ms.
- **Ventana técnica total: 1.753 ms**, 29 tablas `public`, PostgreSQL 18.7. Restore aislado; no restauró sobre Neon main ni equivale a caída total cronometrada del proveedor.

### Conectividad BCV estricta TLS #19

- `bcv-source-connectivity.yml`, **BCV source connectivity (strict TLS) #19**, 2026-11-15T22:16:54Z–22:17:05Z; Success; 17 s total / 13 s job.
- Pinning SHA-256 del intermedio Sectigo DV R36 validado. Test `src/bcv-connectivity.manual.test.ts` con `NODE_EXTRA_CA_CERTS`: 1/1, 1.188 ms; `status: 200`, `contentType: text/html`, `effectiveDate: 2026-11-16`, `parser: compatible`.
- **Límite:** prueba Node/OpenSSL; no sustituye primera invocación real en Cloudflare Workers (`workerd`) el lunes 2026-11-16 11:00 UTC ni demuestra persistencia de tasa en Neon main.

### RTO aceptado por el propietario

- **RTO operativo de plataforma <= 4 horas desde detección del incidente**, Tier $0 best-effort, agnóstico de horarios de tenants (incluye jornadas 10:00–22:00 y fines de semana 10:00–06:00 cruzando medianoche).
- Base: restore aislado 1.753 ms + ~15–30 min de cutover siguiendo `docs/DISASTER_RECOVERY_RUNBOOK.md`. El margen cubre diagnóstico, coordinación y variabilidad; no es SLA contractual ni simulacro cronometrado de caída total del proveedor.
- Gate de aceptación formal del objetivo cerrado como decisión del propietario. Persistencia BCV real, estabilidad posterior, Issue #53 y GO/NO-GO siguen abiertos.

**Estado global:** **PRODUCTION: NOT READY**; **Issue #53 OPEN/P0**; freeze v1.1 vigente.
