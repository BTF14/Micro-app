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
