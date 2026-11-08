## Checkpoint operativo — 2026-11-08 06:45 UTC

## Estado operativo verificado — 2026-11-08 06:45 UTC

- **main:** `0a9e2f7c0d8b4d68b1efe6b372c10c107b160d67`. Repositorio público `BTF14/Micro-app`; rama protegida según metadatos de GitHub.
- **PR abiertas (5):** #193, #233, #251, #255 y #258. #257 (reconciliación documental), #259 (serialización de CI) y #260 (refresh de continuidad) están fusionadas.
- **PR #251 — retención auth 48 h:** Draft; HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`, base main; 27 ahead / 0 behind. HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS. Sin review formal independiente.
- **PR #255 — BCV oficial:** Draft; HEAD `f49fb402f9bd5a40591970c9efe3665a5e212ebb`, base #251 HEAD `30ec0cedafbb8281c7b5ea56572581ddc022a180`; 47 ahead / 0 behind. HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS. Sin review formal independiente; conservar la pila #251 → #255.
- **PR #258 — checkout atómico:** Draft; HEAD `df1ba996babb859a83da09d72cdec63a69b3965c`, base main; 29 ahead / 0 behind. HEAD exacto: 15/15 check-runs SUCCESS y 13/13 workflow runs SUCCESS. El workflow CI exacto (run 42450188433) pasó 141 pruebas unitarias, 85 pruebas PostgreSQL runtime-role y 19 pruebas PostgreSQL de checkout; también pasó las assertions SQL de migrations 0017 y 0018. Sin review formal independiente.
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
