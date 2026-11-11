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

## Estado vivo — 2026-11-04 UTC

- `main` = `2e0f4083ba577de2f301daf8c866bfbdffb5e23f`. PR #198 está fusionada; PR #197 cerrada sin merge como supersedida.
- PR #196 sigue abierta/Draft, HEAD `c332e740aff279fb8b22a8879581d4b8a3c7de21`, base registrada `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`. Quedó detrás de main y requiere actualización/reconciliación antes de evaluar integración.
- La rama #196 contiene catálogo, almacenes y conteos físicos/apertura, con migración 0005 y ledger. Nada de ese vertical slice está en main mientras la PR no se fusione.
- Los 11 workflows asociados al HEAD exacto de #196 terminaron success; no equivalen a aprobación de producción ni sustituyen revalidación después de actualizar la base.
- La matriz de roles está aprobada desde 2026-10-31. La implementación de permisos/operaciones sigue parcial; Issue #53 permanece abierta.
- Producción sigue bloqueada: faltan rutas comerciales completas, rate limiting runtime, pruebas E2E comerciales, coordinación entre todos los escritores de inventario, RPO/RTO medidos, alertas y confirmación de coste total $0.

Este archivo es la fuente de datos para el panel de avance. Un ítem solo puede marcarse `[x]` cuando existe evidencia revisable en código, pruebas o configuración. La documentación por sí sola no demuestra que una función opere correctamente.

## Cómo se calcula

- **Avance de implementación:** tareas funcionales de producto completadas / tareas funcionales inventariadas.
- **Preparación para producción:** controles de salida completados / controles de salida inventariados.
- **CI y seguridad:** se muestran como evidencia independiente; no sustituyen las pruebas funcionales.
- Los porcentajes son conteos simples de los criterios listados, no una predicción de fechas, calidad ni disponibilidad comercial.
- Los criterios bloqueantes P0 se muestran aparte. No se puede declarar listo para producción mientras quede alguno pendiente.
- No marcar una tarea completa basándose solo en un workflow de mocks.

## Estado arquitectónico al 2026-10-30

- Main contiene 0001–0004: tenant/identidad, sucursales/asignaciones y cajas/turnos; `resolveBranchContext` existe pero no está conectado a rutas.
- 0004 (`registers`/`register_shifts`) está fusionada en main y validada en PostgreSQL 18 desechable; no está aplicada a Neon main.
- No existen endpoints comerciales. La matriz de permisos por rol fue **aprobada el 2026-10-31** (`docs/sdd/role-permission-decision-matrix.md`), pero la aprobación no equivale a implementación: sigue sin existir ningún endpoint ni middleware de autorización, y sigue sin existir ninguna prueba cross-tenant porque las rutas comerciales no existen aún. Este trabajo de esquema no marca como completados los flujos POS, ventas, inventario o caja de extremo a extremo.

## Implementación funcional

### Base de producto
- [x] Repositorio independiente y alcance documentados.
- [x] Esqueleto React/Vite/TypeScript para frontend.
- [x] Esqueleto Hono/Workers/TypeScript para API.
- [ ] Flujos completos de catálogo y categorías.
- [ ] Flujos completos de inventario y movimientos auditables.
- [ ] Flujo de caja/POS de extremo a extremo.
- [ ] Pagos mixtos, cambio, recibos y cierre de caja.
- [ ] Devoluciones y reversos auditables.
- [ ] Reportes y exportaciones autorizadas.
- [ ] UX responsive final y accesibilidad validada.

### Datos e integridad
- [x] Esquema SQL versionado 0001–0004 en main y validación en PostgreSQL 18 desechable; las migraciones 0003/0004 aún no se han aplicado a Neon.
- [ ] Adaptador PostgreSQL conectado y probado en todos los flujos de negocio.
- [ ] Migraciones automatizadas y operativamente documentadas.
- [ ] Aislamiento multiempresa validado para todas las operaciones.
- [ ] Idempotencia de ventas y pagos verificada con pruebas.
- [ ] Stock concurrente protegido contra sobreventa.
- [ ] Instantáneas inmutables de precios, tasa y datos de venta.
- [ ] Ciclo completo de backup/restore: la restauración técnica del backup remoto exacto pasó en PostgreSQL 18 desechable (run 40955935124) y el smoke sintético cifrado PG18 pasó en run 41020548699. El gate completo sigue pendiente de validación de datos comerciales/conteos/relaciones, RPO/RTO, alerta y evidencia del coste total; ver [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md).

### Identidad y moneda
- [x] Registro público y login con contraseña bloqueados fail-closed; Google OAuth + allowlist + verificación de email implementados (PR #102), sesión reforzada y origen HTTPS/canónico (PR #155).
- [x] Sesiones persistidas y revocables; pruebas de identidad y límites de sesión ampliadas en PR #111 (mismatch, expiración/revocación, membresía/organización inactiva).
- [x] Matriz completa de roles/permisos **aprobada** (2026-10-31; `docs/sdd/role-permission-decision-matrix.md`). Pruebas negativas de aislamiento siguen pendientes porque no existen rutas comerciales que probar.
- [ ] Integración de tasa BCV validada con fuente, vigencia y fallos.
- [ ] Tratamiento de IVA/IGTF/documentos fiscales validado por fuentes oficiales y asesoría competente.

### Vertical slice BCV/checkout — evidencia en PR #287 (no equivale a POS completo)
- [x] Productor BCV implementado: fetch HTTPS acotado, validación de host/content-type/redirect, parser decimal/fecha efectiva y persistencia idempotente; pruebas sintéticas y regresión con DOM oficial sanitizado.
- [x] Estado persistente de sincronización BCV y checkout fail-closed por último éxito, outcome y fecha efectiva; migration 0021 incluye defensa SQL diferida para nuevas ventas.
- [x] Ciclo de sincronización en tres fases, claim/attempt_id, bloqueo transaccional y protección frente a intentos supersedidos.
- [x] Vertical slice de checkout atómico + ledger de inventario integrado en la rama, con migraciones 0017–0021 y pruebas PostgreSQL.
- [x] Endpoint BCV de solo lectura y panel administrativo owner/admin para consultar el estado operativo; no permite editar tasa ni ejecutar sincronización.
- [ ] Fixture reproducible del cuerpo HTTP raw del BCV con status, headers y bytes originales; el DOM serializado no satisface este criterio.
- [ ] Contingencia manual de tasa con PIN, reautenticación, recuperación, permisos y auditoría implementada; por ahora solo está especificada documentalmente.

## Preparación para producción (gates)

### P0 — bloqueantes
- [x] CI compila y ejecuta pruebas automatizadas en PostgreSQL desechable para un SHA verificado.
- [x] Validación de migración en base efímera en el SHA verificado.
- [x] El registro público está bloqueado fail-closed y probado sin escrituras ni cookie (PR #57; SHA merge `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`).
- [x] Google sign-in + allowlist + verificación de email implementados; las pruebas core de identidad/sesión pasaron en PR #111 (14 tests de integración PostgreSQL en HEAD 233844be10bb102fdac34ad41776d4d14420b243).
- [ ] Pruebas de rutas de error de base de datos y autorización cross-tenant de futuras rutas comerciales; issue #53 sigue abierto hasta que existan endpoints comerciales con esas pruebas pasando, aunque la matriz de permisos que los gobernará ya está aprobada.
- [ ] Autorización multiempresa y aislamiento comprobados en toda la API.
- [ ] Flujos reales de venta/inventario con transacciones, idempotencia y concurrencia.
- [ ] Gestión de errores, rate limiting y protección contra abuso revisadas.
- [ ] Configuración de secretos/orígenes/cookies validada en entorno de preview.
- [ ] Requisitos fiscales locales revisados y recibos correctamente clasificados.
- [ ] Recuperación independiente completa: restauración técnica de la copia remota verificada en run 40955935124; falta demostrar integridad de datos comerciales/conteos/relaciones y medir RPO/RTO/alertas/coste. Neon PITR por sí solo no satisface el requisito.
- [ ] Prueba E2E de flujos reales contra API y DB de prueba (no solo mocks).
- [ ] Checklist de lanzamiento revisado y aprobación explícita del usuario.

### P1 — operación y UX
- [x] Análisis Semgrep configurado en CI.
- [x] Escaneo Trivy configurado en CI.
- [x] Smoke E2E de navegador con API simulada configurado.
- [ ] Pruebas E2E de ventas, inventario, caja y devoluciones en móvil/escritorio.
- [ ] Accesibilidad y uso por teclado verificados.
- [ ] Logs operativos sin secretos/datos sensibles y estrategia de retención.
- [ ] Monitorización de fallos y procedimiento de soporte documentados.
- [ ] Límites gratuitos/capacidad y ausencia de cargos automáticos revalidados.
- [ ] Preview aislada desplegada y verificada, sin datos de producción.

### Controles BCV/checkout — evidencia en PR #287
- [x] Checkout valida el último éxito BCV con fecha efectiva de hoy y falla cerrado cuando el intento más reciente está running/failed; cobertura de aplicación y trigger diferido con rol runtime.
- [x] Concurrencia BCV probada: un intento supersedido no puede insertar/inutilizar tasas ni cambiar el estado del intento nuevo.
- [x] Fallos de sincronización cubiertos por tests: fetch fallido, DB no disponible al registrar fallo, cleanup posterior al commit, respuesta COMMIT ambigua y fetch fallido de intento supersedido.
- [ ] Fixture HTTP raw oficial del BCV capturado y reproducible con status/headers.
- [ ] Presupuesto de timeout medido por fase (conexión, statement, lock, transacción y cleanup) y watchdog con umbral basado en datos.
- [ ] Monitor de fallos y destino de alerta probados de extremo a extremo; no basta con configurar logs estructurados.
- [ ] Identidad efectiva del Worker y recuperación operativa validadas en entorno aislado con permisos mínimos.

## Bloqueos conocidos al último análisis documental

- El registro público y el login con contraseña permanecen bloqueados fail-closed; Google OAuth + allowlist + verificación de email y HTTPS/canonical origin están implementados y probados. Issue #53 sigue abierto por aislamiento real de futuras rutas comerciales; la matriz de permisos que las gobernará ya fue aprobada el 2026-10-31 (`docs/sdd/role-permission-decision-matrix.md`), pero no se ha implementado ningún endpoint ni prueba cross-tenant todavía.
- Main incluye sucursales/asignaciones (0003) y cajas/turnos (0004). No hay endpoints ni flujos comerciales; almacenes y stock por almacén siguen pendientes.
- Las pruebas Playwright actuales son smoke tests con API simulada; no prueban el backend real.
- La aplicación no tiene aún los flujos completos de POS/ventas/inventario.
- Los cambios en Neon main deben superar el gate de `docs/CONSTITUTION.md`; producción sigue bloqueada hasta completar los gates y obtener aceptación explícita.
- La obligación fiscal no debe declararse resuelta sin fuentes oficiales y revisión competente.

Actualiza este checklist solo junto con evidencia y una entrada en `docs/STATE_JOURNAL.md`.

## Respaldo y recuperación

La política está documentada en `docs/BACKUP_AND_RECOVERY.md`. La subida cifrada está verificada y la copia remota exacta se restauró técnicamente en PostgreSQL 18 desechable (run 40955935124). El control compuesto permanece incompleto hasta validar datos comerciales/conteos/relaciones, medir RPO/RTO y comprobar alertas y coste total.
