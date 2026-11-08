## Estado actualizado de controles — 2026-11-08 05:20 UTC

### Implementado en PR #258 (no integrado en main ni aplicado en Neon)
- **Rate limit checkout:** 60/minuto por IP de Cloudflare; bucket PostgreSQL atómico en `auth_rate_limits`, HMAC con secreto existente, 429/Retry-After; 503 fail-closed si falta IP/pepper o DB.
- **Asignación individual de pagos VES:** migration 0018 con `allocation_position`, índice único y triggers diferidos SECURITY DEFINER que comprueban cada equivalente USD, el truncamiento y el residuo final.
- **BCV weekday/weekend:** migration 0017; selección nearest-future en fin de semana y fail-closed en weekday si falta fecha efectiva exacta.

### Gates P1/P2 abiertos
- Migration 0012 permite INSERT/UPDATE directo a runtime sobre `inventory_balances`; pairing 0010 con ledger no equivale a proyección exclusivamente SECURITY DEFINER.
- BCV producer/API/Cron sigue en #255 Draft, apilada sobre #251; no activar Cron antes del rehearsal y grants verificados.
- Feriados bancarios weekday no tienen calendario autoritativo; la tasa no debe inventarse ni reutilizarse como vigente.
- Política comercial mono-moneda/pago exacto/sin parcial-sobrepago necesita aprobación explícita.
- Falta UI de checkout y review formal independiente.
- Neon main no tiene las migraciones de checkout 0017/0018 aplicadas. No ejecutar DDL/DML manual.

---

# Estado de seguridad — 2026-11-08 UTC

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

### Riesgos de seguridad a resolver

- **P0:** evidencia de identidad efectiva/ownership/grants en Neon rehearsal mediante runner protegido aún pendiente.
- **P1:** microapp_runtime conserva INSERT/UPDATE directo en inventory_balances; pairing con ledger no equivale a proyección solo SECURITY DEFINER.
- **P1:** endpoint checkout no consume bucket específico de rate limiting.
- **P1:** SQL valida fórmulas por línea en migration 0017, pero no reproduce el reparto proporcional individual de usd_equivalent_snapshot para cada pago VES.
- **P1 funcional:** ingesta BCV aún no está en main; feriados weekday sin calendario oficial; UI checkout pendiente.
- TTL absoluto/idle de sesión de siete días sigue pendiente de decisión del propietario; no modificarlo silenciosamente.

---
# Security state after #257 merge — 2026-11-08 UTC

- #258 checkout is green on HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94` (15/15 checks, 13/13 workflows; 16 PostgreSQL checkout tests). Its migration 0017 adds database validation of per-line USD/VES arithmetic and BCV weekday/weekend date selection. It remains a Draft branch; migration is not in main or Neon.
- **P1 BCV:** official producer/API/Cron remains Draft in #255 (base #251). No rate ingestion is active in main.
- **P1 payment allocation:** database still does not verify each individual VES payment's USD-equivalent allocation/residual; handler-only calculation is insufficient defense in depth.
- **P1 inventory:** migration 0012 still grants runtime direct INSERT/UPDATE to `inventory_balances`; ledger pairing is not equivalent to a SECURITY DEFINER-only balance projection.
- **Owner decision:** confirm one-currency/no-partial/no-overpayment policy before activation; do not infer approval.
- **Operational gaps:** no authoritative weekday bank-holiday calendar; no checkout UI.
- #259 serializes the shared PostgreSQL runtime-role tests and #257 docs are merged. No Neon main, secrets, Cloudflare manual, DNS, billing, real data or manual deploy changed.

# Estado de seguridad vivo — 2026-11-08 UTC — actualización posterior a #259

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


### Clasificación de riesgos

- **P0:** identidad efectiva/ownership/grants Neon y runner de migraciones de rehearsal todavía no demostrados en la base objetivo; revisión formal independiente pendiente.
- **P1:** privilegio directo runtime sobre `inventory_balances`; falta rate limiting específico del checkout; falta defensa SQL de cálculos monetarios; feriados weekday sin calendario; TTL de sesión de 7 días pendiente de decisión del propietario.
- **P1 funcional:** checkout API no equivale a UI POS integrada; #255 sigue siendo la fuente BCV no fusionada.
- No cambiar TTL, permisos, secretos ni configuración productiva de forma silenciosa.

---
# Estado de seguridad actualizado — 2026-11-08 UTC — checkout

- #258 implementa checkout transaccional y migration 0017 weekday/weekend en GitHub, pero no en Neon. El SHA de implementación `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 15/15 checks y 13/13 workflows, 141 unitarias, 85 runtime-role tests y 15 checkout PostgreSQL tests. HEAD tras sincronizar main y refresh del modelo `433a1fa1212f610cbb543597e620219bd91327a4`: 13/15 check-runs y 12/13 workflows SUCCESS, sin fallos y con verify/Pages/CI pendientes.
- **P1 — fuente BCV:** #255 productor/API/Cron sigue Draft y no está integrado en main. Checkout falla cerrado si no existe la fila efectiva validada. No activar hasta integrar y verificar el Worker/runtime.
- **P1 — aritmética en DB:** trigger 0015 reconcilia sumas, pero no verifica por sí mismo `quantity × unit_price_usd_snapshot`, redondeo de `line_total_ves` ni asignación proporcional individual de `usd_equivalent_snapshot`. Handler calcula con BigInt; falta defensa SQL antes de producción.
- **P1 — privilegios inventario:** migration 0012 concede a `microapp_runtime` INSERT y UPDATE(on_hand_quantity, updated_at) en `inventory_balances`. 0010 exige pairing con ledger, pero no es una proyección exclusivamente SECURITY DEFINER. Resolver antes de producción.
- **Decisión de producto pendiente:** la regla SQL actual exige una sola moneda de liquidación y no admite pagos parciales/sobrepago/cambio. No asumir que esto fue aprobado; obtener confirmación explícita antes de activar.
- **P1 operativo:** no existe UI de checkout; feriados bancarios entre semana no tienen calendario oficial y siguen fail closed.
- **Pruebas seguras:** checkout integration tests exigen conexiones localhost separadas `microapp_runtime`/`microapp` a `microapp_test`; rechazan cualquier destino no desechable.
- **CI shared-DB race:** #257 falló por DDL/DML concurrente al eliminar trigger temporal de auditoría. #259 ya está fusionada en main como `07b146a3f2b7830bbd328a585535084e57e43c4e`; #257 y #258 deben verificar sus nuevos HEADs con esa serialización.
- No Neon main, secretos, Cloudflare productivo, DNS, billing, datos reales ni deploy cambiados.

# Estado vivo de seguridad — 2026-11-08 UTC

> Este bloque prevalece sobre snapshots inferiores. No confundir implementación en GitHub con activación en producción.

- Rate limiting OAuth de #213 está integrado en main con UPSERT atómico y pruebas.
- Cleanup auth de 48 h está implementado en #251, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, 15/15 check-runs SUCCESS. Cron permanece Draft y bloqueado hasta que Neon main tenga el esquema/grants y se verifique el login real `microapp_runtime`.
- BCV oficial está implementado en #255, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, 15/15 check-runs SUCCESS. Latest y cliente usan no-store; el dashboard revalida al cambio de fecha Caracas. No hay calendario oficial de feriados entre semana: fail closed. No fusionar ni activar Cron hasta migration 0013 aplicada mediante runner autorizado y runtime grants verificados.
- Neon main no tiene `microapp_runtime`, `microapp_migrator`, `schema_migrations` ni `auth_bootstrap_attempts`; rehearsal tiene los logins, pero runtime carece de grants de tabla y no se han aplicado 0003–0016. El workflow de migration runner valida PostgreSQL efímero, no Neon. No usar SQL manual para aplicar migraciones.
- **P1 inventario — modelo de privilegios por resolver:** migration 0012 concede a `microapp_runtime` `INSERT` y `UPDATE(on_hand_quantity, updated_at)` sobre `inventory_balances`. Migration 0010 obliga a emparejar cada cambio con un movimiento append-only en la misma transacción, pero no equivale a una proyección de saldos que solo pueda ejecutar una función `SECURITY DEFINER`. El diseño técnico de #193 §7.9.I proponía runtime sin escritura directa de saldos. Resolver/aceptar explícitamente antes de producción; no afirmar que el trigger de pairing impide que un runtime comprometido invente movimientos.
- **Hallazgo de sesión pendiente:** `apps/api/src/google-auth.ts` conserva `SESSION_TTL_SECONDS = 7 * 24 * 60 * 60`. La auditoría histórica #211 recomendó revisar la exposición de una sesión robada durante 7 días. No reducir TTL silenciosamente: documentar el riesgo y obtener decisión de producto/seguridad sobre duración, renovación y revocación antes de cambiar el contrato.
- Hallazgos de #211 preservados en `docs/security/AUTHENTICATION_AUDIT_2026-11-05.md`: rate limiting OAuth start/bootstrap/callback implementado por #213 (session endpoints aún sin bucket); bootstrap raw-token cookie corregido mediante handoff opaco; TTL de sesión de 7 días sigue abierto para decisión del propietario; duplicación de validación Origin queda como mantenimiento; PBKDF2 helpers quedan para legacy/test mientras password login siga deshabilitado. #211 se cierra como supersedida tras preservar el informe y su disposición.
- #200, #204, #205, #207–#210 y #227–#232 cerradas como supersedidas con evidencia; no se descartaron funcionalidades. #257 conserva los ODD de inventario. #193/#202/#211/#233 siguen abiertos para reconciliación.
- No se modificaron secretos, Neon main, datos reales, Cloudflare production, DNS ni billing. Producción **NOT READY**.

---

# Estado vivo de seguridad — 2026-11-07 UTC (corregido)

> Sustituye los snapshots antiguos de estado que aparecen debajo. Main actual: `a38463ea00415c7601d716132e70a29e381a2e34`.

- Rate limiting OAuth canónico de #213 está integrado en `apps/api/src/auth-rate-limit.ts`, con UPSERT atómico PostgreSQL y pruebas de concurrencia/endpoint.
- Limpieza horaria de 48 h para `auth_rate_limits` y `auth_bootstrap_attempts` está en PR #251, HEAD `2a0c685a2348af87f76417b4f3ac0f77a70cbb5d`; 10/10 workflows PR + 2 push scans SUCCESS. Sigue Draft y no se debe activar en producción hasta que Neon main tenga `auth_bootstrap_attempts`, login `microapp_runtime` y grants comprobados.
- PR #252 está fusionada: ruta de bootstrap rechaza un body oversized sin Content-Length con 413; el body limiter compartido ya cubría el stream y UTF-8 inválido.
- Neon main, verificada en vivo por SELECT: 15 tablas, sin `schema_migrations`, `auth_bootstrap_attempts`, `microapp_runtime` ni `microapp_migrator`. El ensayo tiene esos roles, pero runtime todavía carece de grants de tabla hasta aplicar 0003–0016. No hay evidencia de que el Worker de producción use el principal runtime correcto.
- No hay workflow de release ni secret de rehearsal para ejecutar el runner de migraciones contra Neon. El proceso de producción debe seguir bloqueado hasta tener runner protegido, backup/restore, grants y smoke autenticado verificados.
- #218–#226 fueron cerradas como supersedidas; los cambios útiles están en main/#251/#252. #227 permanece reabierta solo como ancla temporal para #228–#233; su aplicación BCV y la corrección de #250 están recuperadas en #255. #250 y #254 están cerradas como supersedidas/duplicada.
- PR #256 integró una corrección de fixture de backup/restore sin tocar código de aplicación ni datos reales; los checks post-merge finalizaron SUCCESS (10 check-runs y 8 push workflows, incluidos Cloudflare Pages y Workers builds).
- No se modificaron secretos, Cloudflare dashboard, DNS, billing, datos reales ni Neon main. Producción **NOT READY**.

---

# Estado vivo de seguridad — 2026-11-07 UTC

> Este bloque sustituye los snapshots antiguos de estado que aparecen debajo. Verificar SHA, PR y entorno antes de cualquier acción; Neon main y producción siguen siendo gates separados.

- `main` de GitHub verificado en `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`. La implementación actual de rate limiting OAuth vive en `apps/api/src/auth-rate-limit.ts` y usa el HMAC canónico de #213; no es correcto seguir afirmando que solo existe la tabla sin callsite runtime.
- El control de tasa usa UPSERT atómico PostgreSQL y las pruebas de concurrencia/endpoint están en `auth-rate-limit.integration.test.ts`. El CI de #251 confirmó también las pruebas con el login desechable `microapp_runtime`.
- La retención horaria de 48 h para `auth_rate_limits` y `auth_bootstrap_attempts` está implementada en PR #251, HEAD `4a0662346c2a1f95bcf09d815df55755f53686cd`, con 10/10 workflows PR SUCCESS. Sigue Draft: no activar Cron en producción hasta que Neon main tenga el esquema `auth_bootstrap_attempts` y el runtime login/grants validados.
- La lectura anterior de Neon main encontró esquema 0001+0002, sin `schema_migrations`, sin `auth_bootstrap_attempts`, sin `microapp_runtime` ni `microapp_migrator`. No se ha escrito en Neon main ni se han cambiado credenciales.
- El código de repositorio y CI no demuestran que el Worker de producción use el principal runtime correcto ni que la base productiva tenga las migraciones/grants actuales. No declarar autenticación o catálogo/inventario listos en producción por CI verde.
- No se han modificado secretos, Cloudflare dashboard, DNS, billing ni datos reales. Producción **NOT READY**.

---

## Estado vivo de seguridad y gobernanza — 2026-11-04 UTC

- `main` = `2e0f4083ba577de2f301daf8c866bfbdffb5e23f`; PR #198 integró ODD por squash. PR #197 quedó cerrada sin merge como supersedida.
- PR #196 sigue Draft y sin fusionar, HEAD `c332e740aff279fb8b22a8879581d4b8a3c7de21`, base registrada `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`; está detrás de main y debe reconciliarse antes de otra decisión. Catálogo/inventario solo existen en esa rama, no en main/producción.
- Los 11 workflows del HEAD exacto de #196 finalizaron success; esta evidencia no convierte la rama stale en mergeable ni declara readiness de producción.
- La matriz `docs/sdd/role-permission-decision-matrix.md` está **APROBADA desde 2026-10-31**. La implementación sigue parcial: los handlers de catálogo/conteos de #196 están en una PR no fusionada; las demás operaciones requieren autorización y pruebas propias.
- Issue #53 continúa abierta hasta demostrar aislamiento cross-tenant y por rol en todos los handlers aplicables.
- `auth_rate_limits` existe en SQL, pero no se ha demostrado un callsite de rate limiting runtime en `apps/api/src`; no afirmar que OAuth/bootstrap tienen limitación por tasa.
- Backup/restore sigue parcialmente verificado: faltan RPO/RTO medidos de extremo a extremo, alerta externa de fallo y evidencia de coste total $0.
- Protección de `main`: última lectura exitosa documentada el 2026-11-01; el intento de lectura del 2026-11-04 devolvió 403 por alcance de API. No presentar la configuración como revalidada hoy.
- No se tocó Neon producción, datos reales, secretos, billing ni despliegues de producción.

## Snapshot histórico — identidad y hardening — 2026-10-29


- PR #153 está fusionada en main; bootstrap OAuth ya no acepta secretos por query string: GET rechaza parámetros de bootstrap y el alta inicial usa POST con validación de Origin/content-type/cuerpo/campos y token de un solo uso, además de state/PKCE y cookies temporales HttpOnly. No hay evidencia de filtración activa.
- PR #155 está fusionada en main: `FRONTEND_ORIGIN` para Google OAuth exige HTTPS, salvo HTTP en loopback de desarrollo, y rechaza credenciales, path, query, hash y origen no canónico.
- Esto corrige las notas históricas inferiores que describían bootstrap y HTTPS como cambios pendientes. No implica despliegue productivo ni que toda la identidad esté lista para operar comercialmente.
- La autenticación Google/allowlist tiene implementación en código; siguen pendientes autorización comercial por operación, aislamiento cross-tenant de rutas de negocio (porque aún no hay endpoints comerciales), matriz de roles aprobada, controles de abuso en el contexto completo de la API y los demás gates P0/P1 de esta hoja.
- **Hallazgo adicional de revisión estática 2026-10-30:** `auth_rate_limits` está definido en SQL, pero no se encontró implementación/callsite runtime en `apps/api/src`. No afirmar que las rutas OAuth/bootstrap tienen rate limiting. Verificar reglas Cloudflare por separado y añadir control distribuido probado antes de ampliar acceso.
- **Protección de `main` — precisión de estado 2026-10-30:** la sección histórica inferior registra que el 2026-10-26 la API confirmó PR obligatoria, seis checks y una aprobación requerida. En esta sesión, la lectura actual de `/branches/main/protection` devolvió HTTP 403 `Resource not accessible by integration`; por tanto, esa configuración no se pudo revalidar hoy. No afirmar que está activa hoy sin una nueva lectura autorizada. La política recomienda conservar al menos una aprobación independiente.
- Verificar siempre el SHA vivo de main y los workflows exactos antes de marcar controles como completados.

---

## ESTADO VIVO — mitigación de bootstrap propuesta en rama (2026-10-29 UTC)

- PR #152 ya está fusionada; merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`.
- El riesgo de secreto en URL tiene una corrección en curso en `fix/bootstrap-token-post-body-20261029`: GET rechaza los parámetros de bootstrap; POST exige Origin del frontend, content type de formulario, campos únicos permitidos, cuerpo máximo 2 KiB y token correcto antes de iniciar OAuth.
- **No marcar como corregido aún:** rama sin fusionar; falta revisar diff y esperar todos los checks del SHA final. No hay evidencia de filtración activa.
- La prueba no toca Neon ni requiere secretos reales; usa el token sintético de integración.

---

## ESTADO VIVO — restauración real verificada y bloqueos de seguridad vigentes (2026-10-29 UTC)

- La restauración técnica de la copia remota exacta `daily/backup-2026-10-29T17-29-48Z.dump.age` quedó verificada en [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): checksum independiente, descifrado y restauración en PostgreSQL 18 efímero.
- Esto supera las notas históricas que decían que la restauración de la copia real estaba pendiente. No demuestra conteos/relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo ni coste total $0; esos puntos siguen abiertos.
- La PR [#151](https://github.com/BTF14/Micro-app/pull/151) está fusionada y documenta guardrails de capacidad. El límite de organizaciones/sucursales sigue sin medir.
- **Bloqueo de negocio:** `docs/sdd/role-permission-decision-matrix.md` sigue explícitamente sin aprobación del propietario. No implementar permisos comerciales basados solo en la propuesta de IA.
- La API de la base auditada aún no tiene handlers comerciales HTTP; no hay pruebas cross-tenant reales para ventas/inventario porque esos endpoints no existen.
- No tocar Neon `main`, secretos ni producción. Conservar las notas históricas inferiores como historial, pero no usarlas como estado vivo cuando contradigan esta sección.

---

## Monitorización diaria de dependencias — corrección del informe en curso (2026-10-29)

- Workflow: `.github/workflows/daily-dependency-watch.yml`; cron diario 08:15 UTC, ejecución manual, permisos `contents: read`, instalación congelada y auditoría de vulnerabilidades.
- El run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) terminó en `success` y `pnpm audit --audit-level high` informó `No known vulnerabilities found`.
- La inspección de logs detectó un defecto de presentación: Bash interpretó backticks dentro de cadenas con comillas dobles y el informe de `pnpm outdated -r` quedó vacío. No considerar completa la información de actualizaciones por ese run.
- La fiabilidad del mantenimiento de dependencias se corrigió y fusionó mediante PR #141 (`fix: make dependency maintenance workflows reliable`); la actualización segura de tooling Cloudflare se integró en PR #142. No queda pendiente esa rama histórica.
- Dependabot continúa revisando semanalmente npm y GitHub Actions. El monitor diario es de solo lectura: no modifica dependencias ni crea PR automáticamente.
- El monitor no reemplaza Trivy, Dependency Review, escaneo de historial, revisión manual del diff ni pruebas completas; tampoco garantiza ausencia de vulnerabilidades.

# Hoja de ruta de seguridad — Micro app

- Estado: aprobada por el propietario el 2026-10-26.
- Principio rector, en palabras del propietario: **no se busca rapidez, se busca que todo salga bien y sin errores, con todos los protocolos de seguridad y ciberseguridad implementados**, pensando en que el proyecto puede escalar a varias personas a largo plazo.
- Esto no reemplaza `docs/CONSTITUTION.md` ni `docs/BACKUP_AND_RECOVERY.md`; los complementa con una lista concreta y priorizada de qué falta y en qué orden. `docs/COMPLIANCE_AND_ACCESSIBILITY.md` es un anexo en el mismo espíritu, enfocado en cumplimiento legal/privacidad y accesibilidad (WCAG).

Toda IA/chat que continúe este proyecto debe leer este documento como parte de la secuencia de arranque de `AGENTS.md`, y no debe saltarse ni relajar ninguno de estos puntos para ir más rápido, salvo instrucción explícita y nueva del propietario.

## Nivel 1 — Antes de seguir con el módulo de negocio (inventario/ventas)

### 1. Protección de la rama `main` en GitHub
**Estado: implementado y revalidado en vivo el 2026-11-01** contra `GET /repos/BTF14/Micro-app/branches/main/protection` (en esta sesión el endpoint respondió 200, a diferencia del 403 `Resource not accessible by integration` reportado el 2026-10-30 — probablemente una diferencia de alcance de token entre sesiones, no un cambio de configuración). Evidencia en vivo:
- `required_status_checks.contexts`: `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history`, `Trivy filesystem and configuration scan`, `postgres-migration`, `verify` (6, igual que el histórico).
- `enforce_admins.enabled: true`.
- `required_pull_request_reviews.required_approving_review_count: 0`.
- `allow_force_pushes.enabled: false`, `allow_deletions.enabled: false`.
- `required_conversation_resolution.enabled: true`.

**Discrepancia anterior resuelta:** el 2026-10-30 se había registrado `required_approving_review_count: 1` frente a la intención declarada del propietario de "0 aprobaciones mínimas". La lectura en vivo de esta sesión (2026-11-01) confirma `0`; la discrepancia ya no está presente. No se modificó la configuración de branch protection desde esta sesión de IA (sigue bloqueado por proxy para escritura); se asume que el propietario lo ajustó manualmente, o que la lectura del 2026-10-30 reflejaba un valor transitorio. Si una sesión futura vuelve a observar `1`, repetir este chequeo antes de asumir que es un valor estable.

La política vigente mantiene los cambios documentales en PR y no permite push directo a `main` (demostrado de nuevo en PR #187: rama → PR → 6 checks en verde → squash-merge, sin push directo).

### 2. Respaldo automático e independiente de la base de datos
**Estado: en progreso (2026-10-26).** Avance concreto de esta sesión:
- Creado en Neon un rol de solo lectura dedicado para respaldos, `backup_readonly` (proyecto `restless-fire-99110035`, rama `main`/`br-summer-math-b7297a60`, base `neondb`), con `SELECT` únicamente sobre las tablas de negocio y `ALTER DEFAULT PRIVILEGES` para que las tablas futuras también queden en solo lectura automáticamente. Verificado con una consulta a `information_schema.role_table_grants`: solo aparece `SELECT`, nunca `INSERT`/`UPDATE`/`DELETE`. Decisión de diseño: el `pg_dump` del backup debe excluir explícitamente `auth_sessions` (tokens de sesión activos) y `auth_rate_limits` (datos efímeros) — no son necesarios para reconstruir el negocio y no tiene sentido llevar tokens de sesión a un destino externo cifrado, aunque esté cifrado.
- Generado un par de llaves `age` para cifrar el volcado. La llave **pública** (no es secreta, se puede commitear) es `age1t04pgcguy87u99r4stlm0gcjsk9dj2s34jsmymw55vlarfteuakse8jmfk` — el workflow de GitHub Actions solo necesita esta para cifrar. La llave **privada** se le entregó al propietario una sola vez por chat y se borró de este entorno inmediatamente; sin ella nadie —ni esta IA— puede descifrar los respaldos. El propietario debe guardarla en un gestor de contraseñas; si se pierde, los respaldos pasados quedan irrecuperables (hay que regenerar el par y los respaldos futuros usarán la llave nueva).
- **Bloqueante nuevo, pendiente de decisión explícita del propietario:** Cloudflare R2 todavía no está habilitado en la cuenta (`r2_buckets_list` devolvió `10042: Please enable R2 through the Cloudflare Dashboard`). Por experiencia conocida de la plataforma, habilitar R2 por primera vez suele exigir vincular una tarjeta de pago a la cuenta de Cloudflare, incluso si el uso se mantiene después dentro del tier gratuito — esto no se pudo confirmar al 100% desde aquí porque la página de activación requiere sesión en el dashboard, así que el propietario debe verificarlo él mismo al entrar a *R2 → Overview*. Esto choca potencialmente con la restricción explícita del proyecto de **no tarjetas, no billing**. Dos caminos, pendientes de que el propietario elija uno:
  1. **R2** (como proponía el blueprint): si al entrar al dashboard confirma que puede habilitar R2 sin tarjeta, o está dispuesto a vincular una tarjeta y configurar una alerta de presupuesto en $0 para dormir tranquilo de que nunca se cobra nada mientras se mantenga bajo 10 GB.
  2. **Repositorio privado de GitHub dedicado solo a respaldos cifrados** (alternativa $0 real, sin tarjeta, sin proveedor nuevo): un segundo repositorio privado en la misma cuenta de GitHub, al que el workflow empuja únicamente el volcado cifrado de cada día (nunca código de la app). Como el volcado ya va cifrado con `age` antes de salir de GitHub Actions, el repositorio en sí no necesita ser tratado como secreto. Requiere política de retención manual (podar commits viejos) para que el repositorio no crezca indefinidamente.
- **Decisión tomada (2026-10-27): el propietario confirmó que Cloudflare pide tarjeta para habilitar R2**, así que se descarta R2 y se adopta la alternativa sin tarjeta: repositorio privado dedicado [`BTF14/micro-app-backups`](https://github.com/BTF14/micro-app-backups), creado manualmente por el propietario (esta IA no puede crear repositorios nuevos desde este entorno — solo opera sobre los repositorios ya configurados en la sesión).
- **Workflow implementado**: `.github/workflows/backup.yml` (este cambio). Todos los días a las 03:00 hora de Venezuela, hace `pg_dump` con `backup_readonly` excluyendo `auth_sessions`/`auth_rate_limits`, cifra con la llave pública `age` del punto anterior, sube el archivo cifrado a `micro-app-backups/daily/` usando el secreto `BACKUP_REPO_TOKEN` (token de acceso de solo ese repositorio, creado por el propietario), y borra del repositorio de respaldos lo que tenga más de 15 días.
- **Generación, cifrado, subida y checksum verificados** en la ejecución real del 2026-10-27 ([run 40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159)).
- **Restauración técnica verificada el 2026-10-29** en PostgreSQL desechable ([run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)): checksum y descifrado correctos, restauración completada, 13 tablas esperadas, 186 constraints presentes, 0 membresías huérfanas y tablas de sesión excluidas.
- **Estado: parcialmente verificado; no marcar aún como cerrado.** La copia probada tenía vacías las tablas de productos, ventas, pagos, movimientos, tipos de cambio, proveedores y auditoría; no demuestra recuperación de datos comerciales poblados. La retención de 15 días tiene pruebas unitarias y el workflow publica un resumen visible en Actions si falla un paso; esto no es notificación externa. Pendientes: verificar la siguiente ejecución y el checksum de la copia reciente, decidir si hacen falta notificaciones externas, probar datos sintéticos poblados, medir RPO/RTO y confirmar coste $0. Ver `docs/BACKUP_AND_RECOVERY.md`, secciones 6 y 8.

**Evidencia adicional de ejecuciones, verificada en vivo el 2026-11-01** (`gh run list`, no solo lectura de documentación histórica):
- `backup.yml` (diario): últimas 3 ejecuciones consecutivas en éxito (2026-10-29 a 2026-10-31); dos fallos anteriores el 2026-10-29 ya investigados y corregidos en su momento (ver entradas previas del journal), sin repetirse desde entonces.
- `backup-restore-smoke.yml` (datos sintéticos poblados, PostgreSQL desechable): últimas 3 ejecuciones en éxito (todas 2026-10-30). Esto es la prueba de **datos poblados** pendiente mencionada arriba — pendiente seguía siendo, al cierre del punto anterior, "probar datos sintéticos poblados"; ese workflow ya existe y pasa, pero su cobertura exacta (qué tablas pobladas, qué se compara post-restauración) no se reverificó línea por línea en esta sesión y debe confirmarse contra `docs/BACKUP_AND_RECOVERY.md` antes de marcar el punto como cerrado.
- `backup-real-restore.yml` (restauración técnica del volcado cifrado real): 1 ejecución registrada, éxito, 2026-10-29.
- **Seguimos sin RPO/RTO medido, sin alerta externa (fuera del resumen de Actions) y sin confirmación explícita de coste $0** — estos tres puntos permanecen abiertos y no se tocaron en esta sesión.

### 3. Dependabot
**Estado: implementado**, verificado en vivo el 2026-11-01. `.github/dependabot.yml` cubre `package-ecosystem: npm` (lockfile pnpm, agrupando parches/menores en un PR semanal, mayores sin agrupar) y `package-ecosystem: github-actions` (semanal). **Limitación de esta sesión, no del repositorio:** `GET /repos/BTF14/Micro-app/dependabot/alerts` devolvió `403 Resource not accessible by integration` con el token de esta sesión — la IA no puede leer la lista de alertas de seguridad abiertas desde aquí, y sesiones futuras deben asumir la misma limitación salvo que cambie el alcance del token.
- **Alertas revisadas por el propietario el 2026-11-01**, directamente en `https://github.com/BTF14/Micro-app/security/dependabot` (filtro `is:open`): **0 alertas abiertas, 15 cerradas**. Evidencia de fuente manual (captura de pantalla del propietario), no reproducible por API/CI con el token actual — tratar como válida pero no como una verificación automatizada propia. Si una sesión futura necesita reconfirmar este número sin pedírselo de nuevo al propietario, debe intentar primero con un token/alcance de `security_events` antes de asumir que sigue en 0.

### 4. Cabeceras de seguridad
**Estado: implementado**, confirmado en código el 2026-11-01:
- Frontend (Cloudflare Pages): `apps/web/public/_headers` agrega `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy` a toda respuesta.
- API (Cloudflare Worker): middleware en `apps/api/src/index.ts` agrega `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` a toda respuesta, y `Cache-Control: no-store` específicamente en las rutas `/auth/*` para que ningún caché/proxy intermedio sirva por error la respuesta de sesión de un usuario a otro.
- **CORS (parte de este mismo punto, frontend↔API):** verificado en vivo desde un runner con egreso completo (`.github/workflows/cors-verification.yml`, última ejecución exitosa 2026-10-31T23:52:41Z) contra el Worker real: el origen permitido (`https://micro-app-63i.pages.dev`) recibe `Access-Control-Allow-Origin` exacto + `Access-Control-Allow-Credentials: true` + los métodos y cabeceras (`authorization`, `content-type`) que el navegador solicita; un origen externo no listado (`https://attacker.example`) no recibe ninguna cabecera CORS. Esto es evidencia directa de que `FRONTEND_ORIGIN` en el Worker desplegado coincide con el frontend real — no una inferencia a partir del código fuente versionado.
- **Bundle publicado (issue #78, brecha C):** `.github/workflows/frontend-bundle-verification.yml` (última ejecución exitosa 2026-11-01T00:08:33Z) descarga el `index.html` y los bundles JS realmente publicados en Cloudflare Pages y confirma que contienen literalmente `https://micro-app-api.btfcasheb.workers.dev` como base de API, y que ningún otro host `*.workers.dev` quedó incrustado por error (build obsoleto/mal configurado).

## Nivel 2 — Antes de dar acceso al primer empleado

5. **Matriz de permisos por rol — APROBADA el 2026-10-31, corregida el 2026-11-01** (`docs/sdd/role-permission-decision-matrix.md`): el propietario decidió explícitamente ventas/descuentos, devoluciones/anulaciones y gestión de miembros/políticas; delegó explícitamente en la IA, con criterio técnico fundamentado, catálogo/inventario, caja y reportes/auditoría. La aprobación habilita, pero no sustituye, la implementación. **Corrección (PR #187):** la sección 2 (caja) contenía una fila que contradecía `docs/sdd/REGISTER_SHIFT_MODEL.md` (cierre de turno por supervisor) — corregida para denegar explícitamente cierre/reapertura de turno ajeno, consistente con el trigger de la migración 0004. La sección 1 (inventario) ya documentaba correctamente, desde la aprobación original, que el "alcance sucursal" de Inventory se refiere a quién puede operar y no a que el stock esté particionado por sucursal (`products.stock_quantity` sigue siendo organizacional); revisado el 2026-11-01 y no se encontró contradicción ahí. Ningún endpoint de negocio (ventas, inventario) debe fusionarse a `main` sin pruebas automatizadas de aislamiento cross-tenant y de rol cubriendo esa tabla; hasta entonces este punto permanece **aplicar: pendiente**, solo la decisión está **aprobada**.
6. **Pruebas negativas de aislamiento entre negocios (multi-tenant)**: confirmar con pruebas automatizadas que un usuario del negocio A nunca puede leer ni escribir datos del negocio B, ni siquiera manipulando IDs en la URL/body. Ya es requisito de `docs/CONSTITUTION.md`; hacerlo bloqueante antes de exponer cualquier endpoint de negocio real.
7. **Registro de auditoría** para acciones sensibles (cambios de precio, anulación de ventas, eliminación de productos/usuarios): quién, qué, cuándo. Sin esto, con varias personas con acceso, no hay forma de reconstruir qué pasó ante un error o un fraude.
8. **Flujo real de invitación de usuarios**, en vez de inserciones manuales en Neon. Ver el patrón SQL actual (manual) en `docs/CURRENT_STATE.md`.
8.1. **Diseño de "derecho al olvido" sin romper el libro de movimientos**: al construir el flujo de baja de usuarios, anonimizar el vínculo personal en auditoría/ventas sin borrar el registro financiero en sí. Detalle y motivo en `docs/COMPLIANCE_AND_ACCESSIBILITY.md` punto 12.
8.2. **Foco atrapado en el modal de ayuda** (`HelpModal` en `apps/web/src/App.tsx`): hoy `Tab` puede salirse del modal hacia el fondo de la página, y el foco no vuelve al elemento que lo abrió al cerrarlo. Barato de arreglar, no bloqueante. Detalle en `docs/COMPLIANCE_AND_ACCESSIBILITY.md` punto 20.

## Nivel 3 — Cuando el equipo crezca de verdad

9. Límite de intentos fallidos / protección contra fuerza bruta en `GET /auth/google` y `GET /auth/google/callback`.
10. Revisión periódica (mensual) de `auth_allowlist`: desactivar de inmediato a quien deje de trabajar en el negocio.
11. Política interna (no técnica, pero documentada aquí): exigir verificación en dos pasos en las cuentas de Google de todo el personal con acceso.
12. Si el sistema llega a guardar datos personales de **clientes** (no solo del negocio), reemplazar el aviso básico de privacidad actual (en el centro de ayuda de la app) por una política revisada por un abogado.

## Cómo usar este documento

- Cada vez que se complete un punto, actualizar su "Estado" aquí mismo (no basta con mencionarlo en el journal) y referenciarlo desde el checkpoint correspondiente de `docs/CURRENT_STATE.md`.
- No marcar nada como "implementado" sin evidencia verificada (igual que el resto de `AGENTS.md`): un PR fusionado con los checks en verde, o una confirmación explícita del propietario para los pasos que requieren su acción manual.
- Si un futuro chat necesita ir más rápido por alguna razón, debe pedir confirmación explícita del propietario antes de saltarse cualquier punto de este documento — la instrucción vigente es priorizar que todo esto quede bien hecho sobre la velocidad.


---

## Actualizaciones de runtime y cadena de suministro — regla vigente (2026-10-29)

La actualización frecuente reduce exposición a vulnerabilidades conocidas solo si se combina con advisories, lockfile reproducible, revisión de compatibilidad y pruebas. La versión más nueva no es por sí sola una garantía de seguridad.

- Mantener actualizados parches y releases compatibles; revisar Dependabot, Dependency Review, Trivy y avisos oficiales.
- Para upgrades mayores (TypeScript 7, Vite 8, plugin-react 6, jsdom 30), revisar breaking changes, engines/peer dependencies y ejecutar toda la suite en una sola rama coherente.
- Mantener Node en la línea LTS 24 por ahora; aplicar el último parche 24.x tras verificar CI. No cambiar a Node 26 ni actualizar pnpm a major 12 sin prueba de compatibilidad/lockfile.
- No usar versiones beta, RC, canary o nightly para runtime de producción sin una excepción explícita y una justificación documentada.
- Preservar siempre overrides.undici = 7.30.1 tanto en package.json como en pnpm-lock.yaml. Una actualización que lo elimine o resuelva undici 7.29.1 debe rechazarse.
- No editar manualmente resoluciones del lockfile. Usar pnpm, --frozen-lockfile en CI y Dependency Review.
- Registrar en CURRENT_STATE/HANDOFF el número de versión declarada y resuelta, fecha de consulta, fuente y SHA verificado; distinguir versión publicada de versión realmente fusionada.
- Cloudflare recomienda evaluar wrangler types para generar tipos según compatibility date/configuración; no mezclar esa migración con un upgrade masivo sin pruebas.
- El inventario de versiones y plan de migración al 2026-10-29 se encuentra en docs/CURRENT_STATE.md y docs/HANDOFF_NEXT_CHAT.md.


## 2026-10-29 — recuperación con datos sintéticos: implementación en verificación

- Las PR #140 y #142 se fusionaron y los checks post-merge en `c87893313534049463917af5ee17dfd36ba319c4` terminaron en `success`.
- La prueba sintética poblada pasó en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, manifiesto y relaciones preservadas, y exclusión de tablas efímeras. Siguen pendientes RPO/RTO de extremo a extremo, alerta de fallo y confirmación de coste $0; no se ha probado restauración integral de una copia real.
- Se añade en la rama `test/backup-restore-synthetic-20261029` un workflow mensual/manual de backup-restore smoke test con PostgreSQL efímero, fixture sintético, clave age temporal, checksum, comparación de manifiesto de 13 tablas y relaciones, y exclusión de tablas efímeras de auth. No usa secretos, Neon ni datos reales.
- Estado de este punto: **en verificación** hasta ver CI verde para el SHA exacto. La prueba sintética no sustituye el RPO/RTO real ni la recuperación operativa de una copia de producción.


## Estado vivo — 2026-10-29 UTC, recuperación y dependencias

- PR #143 añadió el smoke test sintético de backup/restore. El run [40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) terminó en `success` para SHA `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Verifica datos sintéticos relacionados, checksum, cifrado/descifrado, manifiesto de 13 tablas/constraints/relaciones y exclusión de tablas efímeras.
- El punto de backup continúa **parcialmente verificado**: no se han medido RPO/RTO reales ni probado la alerta de fallo y el coste $0; no confundir el laboratorio sintético con la restauración integral de una copia real.
- PR #142 actualizó Wrangler y workers-types a versiones compatibles y fijó Node en `>=24.22.2 <25`, manteniendo TypeScript 5, Vite 7 y `undici@7.30.1`.
- El monitor diario [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) reportó `No known vulnerabilities found` en SHA anterior a #142. Detectó majors estables de Vite, plugin React, jsdom y TypeScript; evaluar compatibilidad antes de actualizar, sin hacer upgrades masivos a ciegas.
- La rama de corrección del monitor `fix/dependency-watch-report-20261029` ya no contiene cambios exclusivos frente a `main` (0 ahead, 4 behind); no abrir una PR redundante. La siguiente ejecución programada debe informar las versiones actuales tras #142.


### Backup workflow incident — 2026-10-29

Snapshot histórico: el manual run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763) generó/cifró/checksum un dump, pero falló antes de subirlo por una ruta incorrecta del script de retención. La corrección se integró en PR #143 (merged 2026-10-29); el run fallido no alteró backups remotos ni ejecutó retención. La validación posterior de backup/restore está documentada por los runs 40955935124 (restore remoto exacto en PG18) y 41020548699 (smoke sintético cifrado PG18).


## Actualización 2026-10-29 — consistencia HTTPS de FRONTEND_ORIGIN

- **Hallazgo:** el helper local de `apps/api/src/google-auth.ts` no exigía HTTPS ni restringía HTTP a loopback, a diferencia del validador de `apps/api/src/index.ts`. No hay evidencia de explotación; clasificado como hardening de configuración P1 antes de habilitar bootstrap en condiciones reales.
- **Corrección implementada y fusionada en PR #155 (2026-10-29):** aplica el mismo allowlist de protocolos/hosts y rechaza credenciales, rutas, query, fragmentos y representaciones no canónicas. El código está en main; no reabrir la rama histórica.
- **Pruebas:** HTTPS válido; HTTP loopback permitido para desarrollo; HTTP remoto, credenciales y URL con path/query/hash rechazados.
- **Estado:** corrección HTTPS/canonical frontend origin para Google OAuth integrada en PR #155 (merged 2026-10-29); no reabrir la rama histórica. La implementación no significa que la API tenga endpoints comerciales.
- **Alcance excluido:** no cambia secrets, OAuth provider, bootstrap, DB, producción ni despliegues manuales.


## Estado de seguridad posterior a PR #155 — 2026-10-29 UTC

- PR #153 (bootstrap POST sin secreto en URL) y PR #155 (validación HTTPS de FRONTEND_ORIGIN) están fusionadas en main.
- PR #155 SHA verificado: `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`; ocho workflows finalizaron success, incluidos CI y Playwright. Codex review no se completó por límite de uso; no se afirma revisión independiente.
- Cloudflare informó previews de Pages/Workers para el commit; no hay evidencia de despliegue productivo ni prueba HTTP contra producción.
- Siguen P0/P1 de producto: autorización por operación, aislamiento cross-tenant end-to-end, matriz de roles aprobada, límites de abuso/rate limiting revisados, integridad transaccional/idempotencia y recuperación operativa. No abrir módulos comerciales antes de estos gates.
- No hay evidencia de explotación del hallazgo HTTPS anterior; se corrigió en código main. La corrección no sustituye verificación de configuración productiva.

---