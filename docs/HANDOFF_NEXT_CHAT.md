## Estado exacto de PR #298 antes de este último refresh — 2026-11-10 UTC

- HEAD observado: `7b6dd3824b959786868e09986b7c2cf6be8067d3`.
- OPEN/Draft; 175 ahead / 0 behind de main.
- 14/14 check-runs SUCCESS.
- En la lista de workflows exact-HEAD: 12 SUCCESS y 1 CANCELLED. El run de PR `Secret history scan` fue cancelado por concurrencia; el run push `Secret history scan` del mismo SHA terminó SUCCESS. No describir como 13/13 workflows SUCCESS.
- Cero reviews formales y cero review threads.
- Esta actualización documental vuelve a avanzar la misma rama #298; consultar su nuevo HEAD y CI exactos después del commit. No propagar checks de `7b6dd38` al SHA nuevo.

---

## Hallazgo bloqueante de UI — inspección #287, 2026-11-10

La rama #287 no entrega todavía el recorrido POS completo desde interfaz:
- `apps/web/src/App.tsx` declara “Caja y ventas” e “Inventario” como pendientes y solo muestra `CatalogPanel` para la vista autenticada.
- No existe componente de carrito/checkout/recibo en `apps/web/src`.
- `apps/api/src/index.ts` registra checkout, pero no rutas HTTP de apertura/cierre de turnos; `cashier-open-shift.ts` es solo un helper.
- Las pruebas de checkout son API/PostgreSQL, no E2E de venta desde navegador.
- P0 continúa 0/1 jornadas completas. Tras cerrar Seguridad Nivel 1 y aprobar el contrato de pagos, la UI de caja, turnos, carrito, checkout y comprobante será trabajo de implementación obligatorio, no se debe dar por cubierto por #287.

# Handoff vivo — 2026-11-10 UTC

**Deadline inamovible: 2026-12-01.** Un comercio, un local, hasta 1.000 productos, jornada completa desde UI, persistencia/conciliación demostradas. Sin descuentos ni promociones.

## Estado exact-HEAD

- main `c5373564413ba086690552c6b7deeab08d7b4a89`; sin cambios.
- #287 `2e7cdd44f89a3b3765a0c69ad23bdb87faacf99c`, OPEN/Draft, 167 ahead/1 behind, 15/15 check-runs y 13/13 workflows SUCCESS. El único commit behind es #297, documental. No rebase/sync.
- #298 OPEN/Draft, PR documental única. El refresh actual avanza su HEAD; consultar SHA/checks exactos después del commit. Antes del refresh: 15/15 checks y 13/13 workflows SUCCESS.
- #299 `c82b0a10f85b59e1f81ac0ca2d439b6286558751`, 14/14 checks y 12/12 workflows SUCCESS.
- #300 `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95`, 14/14 y 12/12 SUCCESS.
- #302 `1b441b3dc9e65e2cb89d765f9aff084b474dd90d`, 14/14 y 12/12 SUCCESS.
- Las cinco PR siguen OPEN/Draft, sin reviews formales ni threads. No merge.

## Bloqueos que no se deben ocultar

1. Seguridad Nivel 1 abierta; producción NOT READY. Branch protection legacy API 403; rulesets [] y requerimientos actuales de aprobación/checks no verificados. Dependabot alerts no accesibles, aunque daily pnpm audit del 9 nov pasó sin vulnerabilidades conocidas de nivel high.
2. Backup: 13 ejecuciones programadas (12 success, 1 failure), máximo 48 h 03 min 03 s entre backups exitosos; RPO ≤24 h no cumplido. Fallo 29 oct: faltaba actions/checkout en ese SHA; ya corregido en main con checkout + ruta absoluta. #299 solo mide pg_restore sintético 1 s, no RTO integral. Ver BACKUP_AND_RECOVERY.md.
3. #287 checkout contiene métodos hardcodeados cash/card/transfer/mobile_payment/other y MAX_PAYMENTS=10; el contrato de pagos permanece sin aprobación en SDD. No activar esos defaults. Ventanas parser BCV 10 días pasados/7 futuros no justificadas; no convertirlas en TTL/freshness.
4. #287 BCV stale recovery y checkout API integration pasan CI sintético/runtime-role, pero no hay E2E UI ni BCV live.
5. #300 elimina override solo en branch; #302 elimina token URL solo en branch. Ninguno integrado en main.
6. CORS OPTIONS público y bundle API canónico pasaron verificación read-only; no equivale a CSRF de mutaciones ni jornada POS.
7. P0 UI: 0/1 jornadas completas demostradas.

## Siguiente trabajo

- Esperar/validar CI exact-HEAD de la actualización documental #298.
- Mantener #287/#299/#300/#302 Draft y sin merge.
- Continuar auditoría de Seguridad Nivel 1 con evidencia aislada; no iniciar nueva lógica comercial.
- Resolver contracto de pagos antes de habilitar checkout; no inferir métodos.
- Evaluar estrategia gratuita de backup que reduzca gaps y mida RTO integral; no tocar secretos/cron productivo ni datos reales.
- Mantener **2026-12-01** en todo plan/checkpoint futuro.

No pedir terminal, CLI, tokens, Build IDs, capturas o reconexiones ya documentadas.


---

## Bloqueo de recuperación — RPO

La revisión de 13 ejecuciones programadas encontró un gap de **48 h 03 min 03 s** entre backups exitosos; RPO ≤24 h no se cumple. #299 midió 1 s de pg_restore sintético, no RTO integral. Consultar [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md); no modificar cron/secretos/proveedor sin estrategia segura y sin coste.

---

## Bloqueo comercial que no debe inferirse — pagos checkout

La inspección de #287 encontró métodos hardcodeados `cash/card/transfer/mobile_payment/other` y `MAX_PAYMENTS=10`. El SDD mantiene sin aprobación los métodos y las reglas de pagos parciales/mixtos/sobrepago/cambio. No exponer ni integrar el handler con esas suposiciones; la decisión de pagos es un bloqueo de producto pendiente, no una tarea que deba resolverse inventando defaults. La capacidad de catálogo de 1.000 productos no implica 1.000 líneas por venta; #287 tiene límite técnico de 100 líneas.

La PR #298 es esta misma rama documental y se ha actualizado durante la sesión; cualquier SHA anotado antes de estas actualizaciones es histórico. Consultar su HEAD/checks en vivo.

---

## Punto de entrada vigente — revalidado 2026-11-10 UTC

**Fecha límite inamovible: 2026-12-01.** Objetivo: un comercio piloto, un local, hasta 1.000 productos, una jornada POS completa desde UI; persistencia y conciliación verificadas. Sin descuentos ni promociones.

- `main`: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- #287 OPEN/Draft, HEAD `25e0de8c0236880febaad9a14a47d5ec55931641`, 164 ahead/1 behind; el único commit faltante en main es #297 y modifica solo `docs/BACKLOG_RECOVERY_LEDGER.md`. No sincronizar/rebasar automáticamente. CI exact-HEAD: 15/15 check-runs y 11/11 workflows SUCCESS. Contiene la recuperación BCV stale→valid bajo confirmación oficial idéntica y regresiones unitarias/PostgreSQL, incluyendo ejecución con LOGIN runtime en el workflow de CI.
- #298 OPEN/Draft, 177 ahead/0 behind. Su HEAD cambia con esta reconciliación documental; el último SHA observado antes de este update fue `09bbe3d2d38494eebe68333fd3bdc38edbe5c576` con CI aún en ejecución (10 check-runs in_progress, 4 success; 7 workflows in_progress, 3 success, 1 pending). No reutilizar checks de HEAD anteriores. Es la PR documental existente; no crear otra duplicada.
- #299 OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`, 14/14 checks y 10/10 workflows SUCCESS. Mide duración de `pg_restore` sintético y round-trip; no RTO integral.
- #300 OPEN/Draft, HEAD `f4c98f3971463e54370b5af3a0633ab434d9ad90`, 13/13 checks y 9/9 workflows SUCCESS. Retira `sales.price.override` de autorización; sin cambios de endpoint/UI/migración.
- #302 OPEN/Draft, HEAD `c6daacee7825f3e2d3dd9de031fd5c3e33fc9320`, 14/14 checks y 10/10 workflows SUCCESS. Cambia autenticación Git del backup a helper temporal GIT_ASKPASS; no se ejecutó backup real.
- No hay reviews formales registradas en esas cinco PR. Mantenerlas Draft; el usuario ha prohibido merge/main writes/despliegues durante esta fase.

**Bloqueo principal:** Seguridad Nivel 1 ABIERTO / producción NOT READY. Branch protection API 403; aprobación requerida actual no verificada. Dependabot alerts y principal/grants efectivos en producción no verificados. CI runtime roles es PostgreSQL 18 sintético, no prueba Neon/Worker productivo. Backup RPO ≤24h, RTO integral, alertas externas y coste $0 no cerrados. No describir grants/helpers como RLS.

**Siguiente secuencia senior:**
1. Mantener las correcciones #287/#300/#302 en Draft y revisar sus diffs finales; no ampliar lógica comercial.
2. Completar los gates Nivel 1 con evidencia aislada: privilegios y secuencia de migraciones en PostgreSQL efímero; inventario de grants; revisión de CORS/CSRF/cookies; backups/RPO/RTO/alertas; branch protection/Dependabot por vía autorizada.
3. Resolver solo con decisión/evidencia los gates que requieren configuración productiva o revisión humana; no inventar resultados ni pedir capturas/CLI si existe alternativa.
4. Solo después de cerrar seguridad, habilitar checkout/turnos/UI y E2E de jornada con 1.000 productos sintéticos.
5. Mantener fecha **2026-12-01** en todos los planes y checkpoints.

No tocar main, merge, deploy manual, migraciones remotas, Neon main, datos reales, secretos, DNS, billing, Cloudflare manual ni Cron BCV/de negocio. No pedir al propietario terminal, tokens, Build IDs o capturas ya documentadas.


---

## Punto de entrada vigente — estado verificado 2026-11-10 UTC

> Este snapshot describe el estado justo antes de esta actualización documental. El commit que lo contiene mueve el HEAD de #298; volver a consultar el SHA y sus checks antes de cualquier acción. Las secciones inferiores conservan evidencia histórica y addenda; este punto de entrada prevalece.

- **Objetivo inamovible: 2026-12-01.** Producción para un comercio piloto, un local, hasta 1.000 productos y una jornada POS completa desde UI. Demo/preview/beta parcial no cumple. No hay descuentos ni promociones.
- **main:** `c5373564413ba086690552c6b7deeab08d7b4a89`.
- **PR #298:** OPEN/Draft, rama `docs/reconcile-live-github-state-20261109`, HEAD `ce762467024ca2794db96f90ed10b15a2341c6ca`, 37 archivos documentales, 143 ahead / 0 behind de main, `mergeable=true`; sin reviews formales ni review threads. Para este HEAD, la consulta de workflow runs exactos y el combined legacy status devolvieron listas vacías: **CI no verificado en el HEAD actual**. Los 11/11 workflow runs SUCCESS pertenecen al HEAD anterior `7dbcdf1d9c8339d524140d09ab0cf446460a0a9b`, no reutilizarlos.
- **PR #287:** OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; compare con main: diverged, 159 ahead / 1 behind, 65 archivos (10.208 adiciones / 232 eliminaciones). La consulta exact-HEAD devolvió 11 workflow runs: 6 SUCCESS y 5 FAILURE. Fallos: ODD docs `42674363952`, Dependency Review `42674363725`, Project Progress `42674364153`, Playwright E2E `42674364197`, CI `42674364170`. Jobs vacíos y cero artifacts en los cinco; causa raíz desconocida. No rerun ciego, rebase, cambio de base ni merge automático.
- Revisión estática de Playwright/CI aporta contexto, no root cause. El workflow Playwright usa imagen `v1.55.0-noble` y verifica el browser path; CI agrupa muchas migraciones e integraciones en un job. Sin logs no atribuir fallos.
- Defecto BCV pendiente en #287: una fila `stale` con mismo valor y fecha puede seguir `stale` cuando la sincronización devuelve `unchanged`. Requiere corrección aislada y regresión; no iniciar lógica comercial mientras Seguridad Nivel 1 esté abierta.
- **Seguridad Nivel 1: ABIERTO. Producción: NOT READY. P0 UI: 0/1 jornadas completas demostradas.** Backup/restore parcial; RPO ≤24 h, RTO integral, alertas, Dependabot y comprobaciones runtime no cerrados.
- Guardrails: no tocar main, no merge, no deploy, no migraciones remotas, no Neon main, no datos reales, no secretos, DNS, billing, Cloudflare manual ni Cron BCV/de negocio. No tocar el Cron horario existente de limpieza de autenticación.
- Siguiente paso: auditar el alcance de integración y compatibilidad de #287 sin modificarlo; recuperar evidencia de CI si la plataforma vuelve a exponer jobs/logs; cerrar Seguridad Nivel 1 antes de habilitar caja/UI.

---

## Corrección de precisión: Cron existente vs Cron BCV — 2026-11-09 UTC

- Relectura directa de `apps/api/wrangler.toml` en `main` confirma un trigger versionado `17 * * * *` (cada hora). El comentario y el handler `scheduled()` en `apps/api/src/index.ts` lo destinan exclusivamente a `cleanupExpiredAuthRecords` (limpieza de metadatos de autenticación); el handler retorna sin ejecutar en `APP_ENV !== "production"`.
- Por tanto, no debe afirmarse que el repositorio carece de cualquier Cron. La formulación correcta es: **existe configuración de Cron para limpieza de autenticación en el Worker de producción; no se ha activado ni demostrado ningún Cron BCV**. Esta inspección estática no confirma el estado del trigger en el dashboard ni su ejecución efectiva reciente.
- No modificar ni desactivar el Cron de limpieza existente como parte de esta tarea. No activar Cron BCV, Cron de negocio ni nuevos triggers productivos mientras los gates sigan abiertos.
- Esta precisión corrige cualquier frase anterior que dijera genéricamente “no hay Cron productivo”; no cambia los guardrails de no deploy ni la conclusión **NO-GO**.

---

## Revalidación de CI exact-HEAD — 2026-11-09 UTC

> Actualización posterior a la lectura del bloque anterior. Este bloque registra resultados del HEAD indicado; cualquier commit posterior requiere otra consulta exacta.

- PR #298 continúa OPEN/Draft en `2e5b5745f4cc2023b7f64436e93cd15261f932e8`, base `c5373564413ba086690552c6b7deeab08d7b4a89` (`main` observado). Comparación: 122 commits ahead / 0 behind; 37 archivos modificados, todos Markdown/documentación.
- Los **11 workflow runs** asociados exactamente a ese HEAD terminaron SUCCESS, incluido Semgrep SAST (antes IN_PROGRESS). No se observaron workflow failures en ese SHA.
- La interfaz de status combinado legacy devolvió una lista vacía; no se debe convertir eso en un contador de check-runs ni afirmar que se consultaron todos los check-runs formales. La lista de workflow runs sí está completa en la consulta realizada.
- PR #298 sigue sin reviews formales ni review threads. `mergeable=true` no equivale a aprobación, autorización de merge, aceptación funcional ni readiness productiva. Mantener Draft.
- PR #287 continúa OPEN/Draft en `7df318b233cfb95f7fcc3076d46984a11614a14c`: 11 workflows exact-HEAD, 6 SUCCESS y 5 FAILURE (ODD docs, Dependency review, Project dashboard, Playwright E2E y CI). La causa raíz sigue sin evidencia accesible; no inferirla.
- `main` no cambió. No se hicieron modificaciones de aplicación, migraciones, Neon, producción, secretos, DNS, billing ni datos reales.
- La revisión de los archivos de configuración en main confirma CORS fail-closed, bloqueo de rutas de preview, cabeceras de seguridad, Dependabot semanal y workflow de backup cifrado. Esto es evidencia estática de configuración, no prueba HTTP/runtime actual, estado de alertas Dependabot, RPO/RTO completos ni coste total.
- El acceso web de esta sesión no pudo recuperar `/health` del Worker ni el frontend Pages; por tanto no se declara smoke test HTTP ni se infieren headers reales desde el código.
- Seguridad Nivel 1 permanece ABIERTO y producción **NOT READY**. La aceptación P0 desde UI continúa sin demostración completa (0/1 jornada). La fecha límite sigue siendo **2026-12-01**, inamovible.
- Mantener todas las restricciones: no merge, no main writes, no deploy manual/productivo, no migraciones remotas, no Cron productivo, no datos reales, no cambios de secretos/DNS/billing. No iniciar lógica comercial ni UI de caja mientras Seguridad Nivel 1 siga abierta.

---

## Reconciliación viva de continuidad — 2026-11-10 03:35 UTC

> Este bloque sustituye como referencia operativa a los snapshots anteriores de este documento. El SHA de #298 que se muestra es el HEAD consultado inmediatamente antes de este commit documental; este mismo cambio mueve la rama. Reconsultar GitHub para el HEAD y CI posteriores. Nunca reutilizar contadores de otro SHA.

### GitHub verificado
- `main`: `c5373564413ba086690552c6b7deeab08d7b4a89`; `protected=true`, seis checks requeridos. La configuración detallada de approvals no quedó accesible/verificada.
- PR #287: OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; 13 workflow runs exact-HEAD: 8 SUCCESS / 5 FAILURE; 10/10 check-runs SUCCESS. Fallan ODD docs, Dependency review, Project dashboard, Playwright E2E y CI. Los cinco endpoints de jobs devolvieron listas vacías; causa desconocida, sin atribuir a código o infraestructura. Sin reviews formales ni review threads.
- PR #296: OPEN/Draft, HEAD `73b0b134c14cb30f7c93d038c10acd0da5aa274c`; 12/12 workflows y 14/14 check-runs SUCCESS. Especificaciones documentales; PIN/calendario no implementados. Sin reviews formales ni threads.
- PR #298: OPEN/Draft, HEAD pre-actualización `5259153367a9228a5c5b5fd83427065c4f0610e4`; 13 workflows exact-HEAD: 7 SUCCESS / 6 IN_PROGRESS; 14 check-runs: 7 SUCCESS / 7 IN_PROGRESS. 110 commits ahead / 0 behind, 37 archivos Markdown. Sin reviews formales ni threads. Los resultados no validan el commit creado por esta actualización.
- PR #299: OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`; 12/12 workflows y 14/14 check-runs SUCCESS. Mide solo `pg_restore` sintético, no RTO completo.
- PR #255, #269 y #295: CLOSED, no merged, supersedidas por #287; ramas históricas conservadas. #297 registró la disposición en main.

### Decisiones P0 vigentes
- Fecha límite inamovible: **2026-12-01**.
- Objetivo de producción: un comercio piloto, un solo local y capacidad verificada de hasta 1.000 productos, con jornada POS completa desde la UI. Una demo, preview o beta parcial no cumple el objetivo.
- No hay descuentos ni promociones en Micro-app. No crear campos, endpoints, UI ni autorizaciones de descuento. Cambios manuales de precio fuera del checkout P0.
- Toda venta exige tasa BCV válida con fecha efectiva exacta de la operación, incluso 100 % USD. Una tasa futura no se usa antes de su fecha efectiva; fines de semana/feriados sin fila exacta fallan cerrado, pendiente revisión legal/contable.
- Se conserva aislamiento multi-tenant/multi-branch aunque la aceptación inicial use un local.
- Los métodos y reglas comerciales de pagos que no tienen aprobación explícita (parciales, mixtos, sobrepago/cambio y catálogo final de métodos) no se infieren de las constraints SQL.

### Estado de producto y seguridad
- Producción: **NOT READY**. La aceptación P0 completa desde UI no está demostrada; no publicar porcentajes de implementación como porcentaje de aceptación end-to-end.
- Seguridad Nivel 1 sigue ABIERTO: Dependabot alertas no revalidadas; cabeceras/CORS solo tienen evidencia histórica; backup/restore parcialmente probado. Se observó un intervalo de backup de 27 h, por lo que no se garantiza RPO <=24 h; RTO integral, alerta controlada y coste $0 siguen pendientes.
- En #287, migration 0017 fue provisional; 0020 impone fecha efectiva exacta todos los días y 0021 exige último sync exitoso. Se conserva el hallazgo: una tasa marcada stale puede permanecer stale cuando una sincronización posterior confirma exactamente el valor original y devuelve unchanged.
- Previews Pages/Workers reportados para SHA anterior `98675da` no son producción ni evidencia de preview en el HEAD actual.
- El handoff anterior registra que Caja/Ventas, Inventario y Reportes no completan todavía el recorrido de UI y que no hay apertura/cierre de turnos demostrados end-to-end. Revalidar al cerrar Nivel 1.

### Evidencia directa del P0 en main — comprobada en este turno
- En main `c5373564413ba086690552c6b7deeab08d7b4a89`, `apps/web/src/App.tsx` (blob `90d43a3cb6ba79a7a26b980084c7aec96d0be824`) marca “Caja y ventas” e “Inventario” como “Pendiente de implementación” y presenta Caja/Ventas, Inventario y Reportes como navegación deshabilitada (“Pronto”).
- `apps/api/src/index.ts` (blob `8c962b92e448dfea735301274efaa81a70ad2097`) registra autenticación, Google auth, catálogo y rutas de inventario; no registra rutas HTTP de checkout/ventas ni de apertura/cierre de turnos.
- Existe el helper `apps/api/src/cashier-open-shift.ts`, pero un helper no equivale a endpoints ni a un flujo de UI.
- PR #287 contiene checkout/BCV y migrations 0017–0021 en una rama Draft, pero no está integrada en main; tampoco se encontró en esa rama un router HTTP de turnos. Sus cinco workflow failures siguen sin causa raíz observable.
- Conclusión: main **no puede completar hoy el P0**. No se ha demostrado ninguna jornada completa desde UI ni una venta real de prueba end-to-end. No calcular porcentaje de implementación a partir de archivos o endpoints aislados; aceptación P0 demostrada: **0/1 recorrido completo**.
- Esta comprobación es de código fuente en GitHub; no ejecuta la aplicación ni sustituye una prueba autenticada de UI.

### Restricciones y siguiente orden
- No merge ni cambios en main en esta fase; no deploy manual/productivo, Neon main, migraciones remotas, Cron productivo, datos reales, secretos, DNS ni billing.
- No iniciar nueva lógica comercial ni UI de Caja/Ventas mientras Seguridad Nivel 1 siga abierto.
- Priorizar cierre demostrable de Nivel 1 con pruebas sintéticas, diagnóstico de los cinco fallos #287 solo si aparece evidencia nueva y reconciliación de los contratos BCV/pagos antes de habilitar checkout.
- PR #296 y #298 modifican seis archivos de continuidad en paralelo. Antes de cualquier futura integración, reconciliar sus diffs por archivo para preservar el contenido único de PIN/calendario y evitar sobrescrituras; no fusionar ni cerrar ninguna en este bloque.

---

## Revalidación viva para continuidad — 2026-11-10 03:20 UTC

**Esta sección sustituye cualquier snapshot anterior de estado vivo dentro de este documento.** Los bloques inferiores son historia; no reutilizar sus SHA, contadores ni estados dinámicos.

### GitHub comprobado
- `main`: `c5373564413ba086690552c6b7deeab08d7b4a89` (sin cambio).
- [PR #287](https://github.com/BTF14/Micro-app/pull/287): OPEN/Draft, rama `integration/bcv-checkout-rehearsal-20261109`, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; 13 workflow runs = 8 SUCCESS / 5 FAILURE; 10/10 check-runs SUCCESS. Los cinco workflows fallidos siguen sin jobs/logs/artifacts accesibles; causa raíz desconocida. Mantener Draft.
- [PR #296](https://github.com/BTF14/Micro-app/pull/296): OPEN/Draft, HEAD `73b0b134c14cb30f7c93d038c10acd0da5aa274c`; 12/12 workflow runs y 14/14 check-runs SUCCESS. Documentación, no funcionalidad implementada.
- [PR #298](https://github.com/BTF14/Micro-app/pull/298): OPEN/Draft, rama `docs/reconcile-live-github-state-20261109`, HEAD actual `fd69566be9dfbb9729e46ff234979c011e402bc6`; 101 commits ahead / 0 behind, merge base `c5373564413ba086690552c6b7deeab08d7b4a89`, `mergeable=true`. En este SHA exacto: 13/13 workflow runs SUCCESS y 15/15 check-runs SUCCESS; sin reviews formales ni review threads. Contiene 37 archivos, todos documentación. Los previews automáticos de Cloudflare Pages y Workers reportaron éxito para este SHA; son previews de rama, no producción ni despliegue manual.
- [PR #299](https://github.com/BTF14/Micro-app/pull/299): OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`; 12/12 workflow runs y 14/14 check-runs SUCCESS. Solo mide `pg_restore` sintético; no representa RTO completo.
- Las cuatro PR siguen Draft y sin aprobación formal. Mergeability y CI verde no equivalen a aprobación, aceptación end-to-end ni readiness productiva.

### Procedencia y supersesión que debe conservarse
- [PR #255](https://github.com/BTF14/Micro-app/pull/255), [#269](https://github.com/BTF14/Micro-app/pull/269) y [#295](https://github.com/BTF14/Micro-app/pull/295) están CLOSED, no merged, como supersedidas por [#287](https://github.com/BTF14/Micro-app/pull/287); las ramas históricas se conservan.
- #295 HEAD de cierre: `213837969375fa87f5edca79e0d752333bc93d8c`. La auditoría registrada en `docs/BACKLOG_RECOVERY_LEDGER.md` confirma que no queda código único de sus directorios de runtime fuera de #287; el guard de freshness `bcv_sync_state ... FOR SHARE` está en #287. No reabrir ni eliminar su rama automáticamente.
- PR #297 registró esta disposición en main. Este punto debe figurar en cada continuidad para evitar tratar #295 como trabajo pendiente.

### Guardrails y fecha
- Objetivo inamovible: **2026-12-01**; P0: un comercio pequeño/mediano, un local, hasta 1.000 productos y jornada POS completa desde la UI. Ver `docs/MVP_SINGLE_STORE_ACCEPTANCE.md`.
- Producción sigue **NOT READY**: Seguridad Nivel 1 abierto, checkout/turnos/UI todavía no demostrados end-to-end y BCV conserva hallazgos por resolver.
- No merge, no cambiar main, no despliegue manual/productivo, no migraciones remotas, no Neon main, no datos reales, secretos, DNS, billing ni Cron productivo. Mantener #287/#296/#298/#299 Draft.
- No solicitar al propietario Build IDs, capturas, terminal, CLI, credenciales o reconexiones ya documentadas. Si falta un dato realmente imprescindible, investigar alternativas y preguntar una sola vez, aceptando texto.

---

## Última lectura de GitHub antes de esta actualización de continuidad — 2026-11-10 02:50 UTC

- `main` observado: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- PR #298: OPEN/Draft, HEAD observado `5597ed38e545b70138f5e677c29c6c40f4f1d78b`, 29 archivos modificados y todos son documentación; comparación con main: 87 commits ahead / 0 behind. `mergeable=true`, `mergeable_state=clean` en la última lectura; no es aprobación ni autorización para fusionar.
- En ese SHA exacto: 11/11 workflow runs SUCCESS y 14/14 check-runs SUCCESS. No había reviews formales ni threads inline.
- **Esta actualización de continuidad crea commits posteriores y cambia el HEAD.** Los resultados verdes anteriores validan únicamente `5597ed38e545b70138f5e677c29c6c40f4f1d78b`; no validan el HEAD resultante. Reconsultar PR #298 y todos los checks del SHA final. Mantener Draft y no fusionar.
- Revalidación de protección de `main`: `GET /branches/main` confirma `protected=true` y seis contextos requeridos; el endpoint detallado de protección sigue devolviendo 403, por lo que el número actual de approvals y opciones adicionales permanece desconocido.
- No se modificaron `main`, runtime, migraciones, Neon, producción, secretos, DNS, billing ni datos reales.

---

## Aclaración de permisos aprobados — 2026-11-09 UTC

La matriz `docs/sdd/role-permission-decision-matrix.md` está **APROBADA desde 2026-10-31**. No volver a pedir aprobación general ni describirla como pendiente. La implementación en handlers sigue parcial; la aprobación no significa que checkout, pagos o todas las operaciones de caja estén disponibles. El bloqueo actual para nueva lógica comercial es Seguridad Nivel 1, no la falta de aprobación de la matriz. Mantener la matriz sin cambios salvo nueva decisión explícita del propietario.

---

## Corrección de consistencia y estado vivo — 2026-11-09 UTC

> Este bloque es la referencia operativa más reciente de esta rama. Los snapshots posteriores/anteriores que sigan debajo se conservan como historial fechado; no deben reutilizarse como estado vivo. Revalidar GitHub antes de cualquier acción sensible.

### Objetivo y aceptación que no cambian
- **Fecha objetivo obligatoria: 2026-12-01.** P0: comercio pequeño/mediano, un solo local y catálogo de hasta 1.000 productos, jornada completa desde la UI según `docs/MVP_SINGLE_STORE_ACCEPTANCE.md`.
- No confundir objetivo con funcionalidad implementada, aceptación probada ni autorización de producción. No mover fecha ni alcance sin decisión expresa.
- El MVP de un local conserva aislamiento multi-tenant/multi-branch, permisos aprobados, presupuesto objetivo $0 y guardrails. Si un gate crítico sigue abierto el 30 nov, NO-GO para producción; beta controlada solo con riesgos explícitos y aceptación correspondiente.

> **Vigencia específica de PR #298:** la fila de la tabla que indica HEAD `98675da595b0c20906f2674ba3dd9d9fba677a63` y CI 13/13 + 15/15 corresponde exclusivamente a ese SHA anterior a la auditoría documental. Los commits posteriores de esta misma rama cambiaron el HEAD; esos resultados no validan los commits nuevos. Consultar siempre el HEAD vivo y su CI exacto en GitHub antes de decidir. No reutilizar los contadores históricos como estado actual.

### Estado GitHub revalidado por SHA exacto
Main observado: `c5373564413ba086690552c6b7deeab08d7b4a89`.

| PR | Estado | HEAD | Workflow runs exact-HEAD | Check-runs exact-HEAD | Decisión |
|---|---|---|---:|---:|---|
| [#287](https://github.com/BTF14/Micro-app/pull/287) | OPEN / Draft | `7df318b233cfb95f7fcc3076d46984a11614a14c` | 13: 8 SUCCESS, 5 FAILURE | 10/10 SUCCESS | Bloqueada; no declarar CI completamente verde |
| [#296](https://github.com/BTF14/Micro-app/pull/296) | OPEN / Draft | `73b0b134c14cb30f7c93d038c10acd0da5aa274c` | 12/12 SUCCESS | 14/14 SUCCESS | Documental; no declarar PIN/calendario implementados |
| [#298](https://github.com/BTF14/Micro-app/pull/298) | OPEN / Draft | `5597ed38e545b70138f5e677c29c6c40f4f1d78b` (snapshot previo) | 11/11 SUCCESS | 14/14 SUCCESS | Docs-only; los checks no validan commits posteriores; no merge |
| [#299](https://github.com/BTF14/Micro-app/pull/299) | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` | 12/12 SUCCESS | 14/14 SUCCESS | Medición de pg_restore sintético; no merge |

- #287 mantiene cinco fallos: ODD documentation, Dependency Review, Project progress dashboard, Playwright E2E y CI. Jobs/artifacts/logs no fueron accesibles por las interfaces consultadas; causa raíz desconocida. Los 10 check-runs SUCCESS no anulan los cinco workflow FAILURE.
- Las cuatro PR siguen Draft y sin aprobación formal. `mergeable=true`, cuando aparece, no es review APPROVED ni readiness.
- En #298 los bots de Cloudflare reportaron éxito de **previews automáticos de PR** para Pages y Workers en el commit `98675da`, con URLs identificadas como Commit Preview/Branch Preview. Esto sí es un despliegue de preview automatizado; no fue un despliegue manual ni demuestra promoción a producción, merge a main o smoke test autenticado de producción. Los snapshots que dicen “no deploy” describen el momento previo o la ausencia de despliegue productivo/manual; no deben interpretarse como ausencia de preview.
- No se fusionó ninguna de estas PR ni se modificó main en esta reconciliación.

### Seguridad Nivel 1 y backups
- **Gate Nivel 1 sigue ABIERTO**: `GET /branches/main` confirmó `protected=true` y seis checks requeridos; el endpoint detallado de protección sigue 403, por lo que el requisito actual de approvals no está verificado; Dependabot figura implementado pero las alertas no se pudieron revalidar (confirmación manual histórica de cero alertas); cabeceras/CORS verificados históricamente el 1 nov sin nueva prueba HTTP; backup/restore parcialmente verificado.
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

### Instrucción para la siguiente sesión
Leer primero `AGENTS.md`, `docs/CONSTITUTION.md`, este bloque, `docs/MVP_SINGLE_STORE_ACCEPTANCE.md` y el checkpoint vigente. No volver a pedir Build IDs, capturas, terminal, CLI, tokens, TinyFish ni reconexiones. No repetir consultas que ya devolvieron jobs/artifacts vacíos salvo que exista una vía nueva. Revalidar únicamente lo que haya cambiado desde los SHA anteriores. Mantener siempre el objetivo **2026-12-01** y P0 de un local/1.000 productos.

---
# Actualización operativa — backup y fecha obligatoria (2026-11-09 UTC)

**La fecha objetivo no se pierde en ninguna transferencia:** el MVP funcional y estable debe estar listo para aceptación el **1 de diciembre de 2026**. Todo prompt de continuidad, handoff, checkpoint o instrucción a otra IA debe repetir explícitamente esta fecha, el alcance P0 de comercio de un local/hasta 1.000 productos y la regla NO-GO si un gate crítico sigue abierto. No mover la fecha ni redefinir el alcance sin decisión expresa del propietario.

**Backup:** el run [42659924075](https://github.com/BTF14/Micro-app/actions/runs/42659924075) terminó success el 2026-11-09 y se encontraron el objeto cifrado y el sidecar en el repo privado. Ocho ejecuciones programadas del 2 al 9 de noviembre están en success. No obstante, el intervalo entre las copias del 8 y 9 fue 27 h 00 min 16 s; no afirmar RPO ≤24 h. El checksum está disponible en el sidecar, pero esta sesión no recalculó el hash del blob, ni descifró/restauró esa copia. La prueba sintética PG18 pasó en run 41323379454 y en #287; no sustituye una restauración de datos reales. RPO/RTO, prueba controlada de alerta y coste $0 siguen pendientes. Bajo las restricciones vigentes, no restaurar ni manipular backups que contengan datos reales de producción.

**#298:** el nuevo HEAD 9248f370b0d1a0cf6b01be4c0e8ac77935f45a1f tiene 13 workflow runs exact-HEAD, todos todavía en ejecución o cola en la última consulta; volver a validar antes de considerar la PR. Sigue OPEN/Draft, no mergear.

---

# Addendum prioritario — 2026-11-09 UTC

Antes de cualquier implementación comercial, leer el addendum más reciente de `docs/WORK_CHECKPOINT.md` titulado **“gate Nivel 1 y diagnóstico de Actions”**. Hallazgo confirmado: los controles Nivel 1 no están demostrados como cerrados; el backup/restore permanece parcialmente verificado y bloquea reanudar endpoints/funcionalidad comercial. No iniciar turnos, caja ni checkout UI hasta cerrar ese gate.

#287 sigue OPEN/Draft en HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`; cinco workflow runs exact-HEAD fallaron y no fue posible recuperar jobs, artifacts ni logs utilizables. La causa permanece desconocida. No atribuirla ni reintentar a ciegas. #298 sigue OPEN/Draft; el addendum recién añadido cambia su HEAD, por lo que deben comprobarse los diez workflows exact-HEAD de nuevo.

Siguiente trabajo: avanzar en el cierre verificable de backup/restore con datos sintéticos en PostgreSQL desechable, medir RPO/RTO y comprobar alerta/coste $0; en paralelo, buscar una vía autorizada para leer jobs/logs de Actions. No pedir al propietario Build IDs, capturas, terminal, CLI, tokens ni reconexiones. Mantener todos los límites de producción y datos reales.

---

# Objetivo de entrega — 2026-12-01

## Decisión de aceptación MVP — POS de un local / 1.000 productos

- Decisión aprobada por el propietario el 2026-11-09: el objetivo de aceptación del 2026-12-01 es que un comercio pequeño/mediano, de un solo local y hasta 1.000 productos, pueda completar desde la UI una jornada POS: login, apertura de turno propio, búsqueda/carrito, venta/pagos admitidos, tasa BCV válida cuando aplique, comprobante interno, consistencia de venta/pagos/inventario y consulta de inventario/Kardex, conteo y cierre de turno.
- La especificación canónica, con pruebas y límites detallados, es [docs/MVP_SINGLE_STORE_ACCEPTANCE.md](MVP_SINGLE_STORE_ACCEPTANCE.md). Leerla antes de planificar o implementar.
- Esto concreta el P0; no cambia guardrails, permisos aprobados, presupuesto $0 ni los gates de seguridad/BCV/legal/operación. El MVP de un local no elimina el aislamiento multi-tenant/multi-branch. No afirmar que está implementado hasta probar el recorrido completo en el SHA exacto.
- Si un gate crítico no está demostrado, NO-GO para producción; como máximo beta controlada con limitaciones explícitas y aceptación correspondiente.


La prioridad de gestión cambió: entregar un MVP utilizable el 1 de diciembre de 2026 o antes, sin afirmar que todo el SaaS está terminado. Leer primero el plan de entrega y línea base verificada en `docs/WORK_CHECKPOINT.md` (bloque “Plan de entrega MVP — objetivo 2026-12-01”); ese bloque documenta el estado de GitHub, la separación main/PR, el estado real de UI/API, los gates y la secuencia hasta el 1 de diciembre.

**Brecha funcional central confirmada en #287:** el frontend aún deshabilita Caja/Ventas, Inventario y Reportes; checkout solo tiene API y depende de un turno abierto, pero no hay rutas registradas para abrir/cerrar/consultar turnos. No declarar POS end-to-end terminado. El próximo frente de implementación debe ser turno propio + UI de caja/checkout, seguido de UI de inventario/Kardex/conteos.

No repetir la auditoría base de #287/#296/#298. Reconsultar solo cambios desde los SHA documentados. Mantener #287/#296/#298 Draft hasta que cada uno supere sus gates; no usar 10 check-runs SUCCESS como sustituto de los workflow runs fallidos ni de revisión independiente. No tocar Neon main, producción, secretos, DNS, billing, Cron productivo ni datos reales.

---

# Continuidad prioritaria — 2026-11-09 19:25 UTC

**Estado vigente:** main `c5373564413ba086690552c6b7deeab08d7b4a89`. Las fuentes vivas de PR prevalecen sobre snapshots de este archivo.

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



### Instrucciones para la siguiente sesión
- No volver a empezar auditorías ya realizadas: usar el addendum anterior como baseline y solo refrescar lo que cambió.
- No pedir al propietario Build IDs, terminal, CLI, capturas, TinyFish, tokens o credenciales.
- No tratar los cinco fallos de #287 como resueltos: sus jobs/artifacts no son accesibles en la consulta y la causa queda desconocida.
- No considerar #287 ni #296 aprobadas por tener `mergeable=true`; ambas continúan Draft.
- Próximo hito: obtener evidencia adicional de los cinco workflows, luego completar revisión técnica P0/P1 de #287 sin alterar su HEAD hasta decidir una corrección específica. Si la causa no puede recuperarse, proponer re-run aislado de los workflows fallidos y validar el SHA resultante, sin rebajar gates.
- Mantener el estado global de producción en NOT READY.

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

## Revalidación de continuidad — 2026-11-08 UTC

Fuente autoritativa y detalle técnico: `docs/CURRENT_STATE.md`. Main observado: `594382f6f191f2ea0b55d913683841e51c210e5d`; post-merge 13/13 check-runs y 11/11 workflow runs push SUCCESS.

- #269: HEAD `0ae7f1d71f9bb2155bddca5b5dcc0a2b7785b089`; 27 ahead / 3 behind main, mergeable=true; 16/16 check-runs y 14/14 workflow runs SUCCESS exact-HEAD. Sigue Draft por contrato comercial checkout y decisión USD-only/BCV.
- #255: HEAD `7e43d7fd1519889605174da5818190bb84685059`; 54 ahead / 3 behind main, mergeable=true; 15/15 check-runs y 13/13 workflow runs SUCCESS exact-HEAD. Sigue Draft por gates P1 BCV.
- #286: snapshot previo al commit actual `3666bc1043733a21f880ca5da68a6be45e59e261`, 14/14 checks y 12/12 workflows SUCCESS, mergeable=true, sin reviews formales ni threads. El commit documental de esta rama cambia el HEAD; consultar nuevo SHA y revalidar CI exact-HEAD.

## Próxima secuencia
1. Validar el nuevo HEAD y CI de #286; no reutilizar resultados del SHA anterior.
2. Mantener #269 Draft hasta que se aprueben contrato checkout y decisión BCV USD-only.
3. Mantener #255 Draft hasta resolver anomalías/freshness, observabilidad, fixture oficial y feriados.
4. Continuar pruebas PostgreSQL desechables y auditoría técnica; no ejecutar más escrituras Neon.

No pedir terminal, CLI, capturas ni TinyFish salvo necesidad real demostrada. No tocar Neon main, datos reales, secretos, Cloudflare manual, DNS, billing ni despliegues.

# Handoff operativo — BTF14/Micro-app — 2026-11-08 UTC

**Punto de partida verificado:** `main` está en `594382f6f191f2ea0b55d913683841e51c210e5d`, merge SHA de #285 y último commit observado en GitHub. La sección autoritativa y detallada del estado está en `docs/CURRENT_STATE.md`; no duplicarla aquí.

## Estado vivo
- **#286 — documentación:** OPEN/Draft, docs-only; HEAD `86ad02e426c328cd2bb4a8436d0910b0f06ecd2b`, 17 ahead / 0 behind de main; GitHub `mergeable=true`, `mergeable_state=clean`. En el SHA exacto: 14/14 check-runs y 10/10 workflow runs SUCCESS; los seis checks requeridos de `main` están SUCCESS. `main` aparece protegida; el resumen expone los seis checks, pero el endpoint de reglas detalladas devuelve 403. Sin reviews formales ni threads inline. Mantener Draft; checks verdes no equivalen a aprobación independiente. El commit de actualización documental posterior cambia el HEAD: consultar GitHub y revalidar exact-HEAD antes de decidir.
- **#233:** CLOSED como superseded por #269, no merged. Auditoría semántica: 18/18 paths preservados/evolucionados; 5 idénticos y 13 evolucionados. Conservar la rama y sus 83 commits históricos.
- **#269 — checkout + ledger:** OPEN/Draft; HEAD `8f05befb7ac1a46d68850b9f89f89edc8cd46283`; frente a main 26 ahead / 3 behind. En el SHA exacto se observaron 11/11 workflow runs pull_request SUCCESS. Mantener Draft por contrato comercial checkout y dependencia BCV para ventas USD-only aún sin decisión.
- **#255 — BCV:** OPEN/Draft; HEAD `7e43d7fd1519889605174da5818190bb84685059`; frente a main 54 ahead / 3 behind. En el SHA exacto se observaron 10/10 workflow runs pull_request SUCCESS. Mantener Draft por anomalías/freshness, last-attempt/last-success y alertas, fixture HTML oficial y calendario de feriados.
- **Neon:** rehearsal #42507066215 SUCCESS en `microapp_rehearsal`, migraciones 0001–0019. No repetir escrituras ni migraciones remotas.

## Próxima secuencia
1. #286 ya tiene mergeability `clean` y sus seis checks requeridos pasan en el HEAD observado; no fusionar mientras siga Draft y sin review formal independiente. Si se modifica, repetir validación exact-HEAD.
2. Revisar el solapamiento documental antes de sincronizar #269 y #255 con main; usar merges no destructivos, nunca force-push, y ejecutar CI en cada HEAD nuevo.
3. Mantener ambas PR Draft hasta cerrar sus gates de producto/operación.
4. Continuar validaciones en PostgreSQL desechable. Producción sigue **NOT READY**.

## Límites
No tocar Neon main, datos reales, secretos, Cloudflare manual, DNS, billing ni despliegues. No repetir Neon bootstrap-and-migrate. No reutilizar CI de SHAs anteriores.

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

# Handoff operativo — BTF14/Micro-app — 2026-11-08 UTC

**Último main verificado antes de este checkpoint:** `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`, merge SHA de PR #281. PR #280 también está integrada (merge SHA `aa2804a0a6e7879f684b3baeb60646e50f1d6419`). La punta de `main` es dinámica: antes de cualquier decisión, consultar GitHub directamente; no interpretar este SHA histórico como garantía de la punta actual después de este checkpoint.

**Validación post-merge de PR #281:** 9/9 workflow runs SUCCESS y 11/11 check-runs SUCCESS en `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`, incluidos CI, Playwright, PostgreSQL migration runner, database migration validation, SAST, secret-history, Pages y Workers Builds. Esto confirma CI/builds automáticos; no demuestra tráfico productivo ni smoke test comercial autenticado. **Producción permanece NOT READY.**

**Neon rehearsal:** run [#42507066215](https://github.com/BTF14/Micro-app/actions/runs/42507066215) SUCCESS, `bootstrap-and-migrate`, fuente inmutable `6227a3a8497f6be94d675b64da5da61530c200fc`, destino aislado `microapp_rehearsal` / branch `br-curly-poetry-b7dxsddm`. Migraciones 0001–0019, 19 registros `applied`, fingerprint 0002, assertions 0017–0019 y ownership/grants de roles verificados. No se tocó Neon main, la parent clone `neondb`, secretos, DNS, billing ni datos productivos. No repetir escrituras ni `bootstrap-and-migrate`.

## PRs abiertas — última consulta GitHub

- **#269 checkout + ledger:** OPEN/Draft; HEAD `14afd5de938a6ff655ecdfc5cb747f0f799290c5`; 24 commits ahead / 4 behind main; diverged y `mergeable=false`. En ese HEAD hay 5 check-runs SUCCESS (postgres-migration, Trivy, secret-history, Pages y Workers) y 3 workflows de evento push SUCCESS. No hay workflows de evento `pull_request` para ese SHA; faltan los contextos requeridos `verify`, `Chromium authentication smoke tests` y `JavaScript and TypeScript static analysis`. No reutilizar el 16/16 histórico de source SHA 6227 ni de otros SHA. Reviews existentes son COMMENTED, no APPROVE; el único hilo inline está resuelto. **Mantener Draft:** el contrato comercial del checkout (una moneda por venta, liquidación exacta, sin parciales/sobrepagos/cambio) sigue pendiente de aprobación del propietario.
  - El rehearsal usó source `6227a3a8497f6be94d675b64da5da61530c200fc`. Los cinco commits posteriores solo tocan workflow/documentación/ODD; las migraciones 0017–0019 y los archivos `sales-checkout.ts` / `inventory-counts.ts` consultados conservan los mismos blobs. El ensayo valida ese bundle SQL en DB aislada, no el comportamiento funcional del Worker sobre Neon.
  - El ODD `SALES_CHECKOUT_MODEL.md` contiene snapshots antiguos: migration 0018 sí añade `allocation_position` y validación SQL diferida por pago, por lo que la antigua brecha de ordinal debe marcarse resuelta. También debe actualizarse el texto que dice que el ensayo Neon está bloqueado.
  - Riesgo BCV compartido con #255: el checkout y el trigger 0017 confían en `effective_date` + `validation_status`, no en antigüedad de `fetched_at`. Una tasa futura podría seguir aceptándose si falla el Cron o BCV la corrige después. Definir política con el propietario; no inventar umbral. Confirmar además si una venta USD-only debe depender de disponibilidad BCV.
- **#255 BCV:** OPEN/Draft; HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`; 53 ahead / 11 behind main; diverged. Los 10 workflows SUCCESS corresponden a ese HEAD anterior a sincronización. P1 pendientes: política de anomalías; freshness de `fetched_at`; falta de last-attempt/last-success y alerta externa; fixture real HTML BCV; calendario de feriados. El Cron falla/re-lanza y registra código sanitizado, pero eso no sustituye alerta persistente.
- **#258 checkout:** OPEN/Ready; HEAD `8935842cab6a7e2b8a6c0aa078e9b3e77866e48c`; 35 ahead / 42 behind main; diverged, `mergeable=false`. Mantener abierta mientras se verifica que #269 conserva todo su contenido único.
- **#262 ledger projection:** OPEN/Ready; HEAD `19103c000b354da85c1a478867a6a18e2ec25cd7`; apilada sobre #258; comparación contra main 107 ahead / 42 behind. No fusionar independientemente de su base.
- **#233:** OPEN/Draft histórica; conservar hasta demostrar que todo su contenido único está preservado. **#193:** OPEN; no modificar.

## Próxima secuencia

1. Sincronizar #269 con main mediante merge commit no destructivo, sin force-push; conservar código y aplicar los documentos/workflow actuales de main.
2. Actualizar ODD y modelo de checkout para reflejar Neon rehearsal completado, migration 0018 y riesgos BCV; revalidar los seis contextos requeridos en el HEAD exacto.
3. Mantener #269 Draft hasta CI exact-HEAD completo y aprobación explícita del contrato comercial; no inventar una decisión de pagos.
4. Sincronizar #255 por separado; revisar fecha efectiva BCV, freshness, fallos del proveedor, observabilidad y Cron. Mantener Draft hasta cerrar P1.
5. Mantener #258/#262 sin fusionar ni cerrar hasta verificar contenido único y dependencias.
6. Validar runtime, permisos, checkout, pagos, idempotencia y rollback en PostgreSQL desechable con login runtime real. No repetir escrituras remotas Neon.

---
## Estado vivo — corrección Neon pinned rehearsal integrada (2026-11-08 UTC)

- Main protegido: `209e3fe9f99c96a07546bb87c04b90755257d918`. PR [#278](https://github.com/BTF14/Micro-app/pull/278) fusionada por squash; HEAD revisado `b444344543a2edafaa70cf68f8450cade73c9fc4`; merge SHA indicado.
- Causa de Neon rehearsal #2: el workflow comparaba SOURCE_SHA `6227a3a8497f6be94d675b64da5da61530c200fc` contra el tip mutable de la rama, ya avanzado a `a750d1868f0ad4ae78b3de197d160d376af688ab`. Falló antes de extraer migraciones y antes de conectarse a Neon.
- Corrección integrada: el workflow hace fetch del SHA inmutable directamente y valida FETCH_HEAD exacto. Cambio limitado a `.github/workflows/neon-pinned-migration-rehearsal.yml`.
- Evidencia PR #278: 9/9 workflow runs SUCCESS en HEAD exacto; main base coincidía, cero commits de divergencia; branch protection activa con seis contextos requeridos. Revisión técnica manual completada; cero reviews formales/hilos, sin presentarla como aprobación humana independiente.
- Verificación manual posterior (log recibido; inicio 2026-11-08 17:21:02 UTC): `verify-empty` en `main` alcanzó `EMPTY_REHEARSAL_TARGET_VERIFIED`. Fetch exacto de SOURCE_SHA exitoso; cadena 0001–0019 validada; conexión directa a `microapp_rehearsal`; identidad de database/login/session/branch/project y restricciones de roles validadas; target vacío confirmado.
- El `verify-empty` manual ya fue ejecutado y validado por su log. No queda pendiente otra acción manual para este gate.
- Neon: hubo conexión de solo lectura a `microapp_rehearsal` y consultas SELECT de identidad/roles/estado vacío. No hubo DDL/DML ni migraciones. No tocar DB `neondb` parent-data clone ni Neon main. Producción sigue NOT READY.

---

## Estado vigente — 2026-11-08 (posterior a PR #275)

**Main:** 11ca2b49bfa650066a708d2423cc73cea6c99e2d (protegida). PR #275 se fusionó por squash en este SHA; PR #274 quedó cerrada como supersedida. #275 añadió el workflow manual `.github/workflows/neon-pinned-migration-rehearsal.yml` y el allowlist Gitleaks de un único fingerprint falso positivo. Ninguna migración Neon se ejecutó.

### Estado de integración vivo
- **#269 checkout + ledger:** Open/Draft; HEAD `bc3939510e132e6f77c751514ff1b7dca58cdd4d`; 15 ahead / 3 behind main; mergeable=false; 11/11 workflows SUCCESS en su HEAD. Mantener Draft: decisión comercial y rehearsal 0017–0019 pendientes.
- **#255 BCV:** Open/Ready; HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`; 53 ahead / 5 behind main; mergeable=false; 10/10 workflows SUCCESS en su HEAD. Persisten gates P1: política de anomalías, estado persistente/alerta y fixture HTML real BCV.
- **#258 checkout:** Open/Ready; 35 ahead / 36 behind main; mergeable=false. #262 ledger: Open/Ready, 107 ahead / 36 behind main, apilada sobre #258. #269 conserva el contenido consolidado de ambas; mantener abiertas hasta confirmar integración en main.
- **#233:** Open/Draft histórica, no fusionar por antigüedad. **#193:** Open; no modificar.
- PR abiertas actuales: #269, #262, #258, #255, #233 y #193 (6).

### Neon rehearsal
- Proyecto `restless-fire-99110035`; branch rehearsal `br-curly-poetry-b7dxsddm`; database segura objetivo `microapp_rehearsal`; rol `microapp_migrator`.
- El run anterior #42479603848 del workflow antiguo `neon-rehearsal-migrations.yml`, tras la rotación del secreto, finalizó SUCCESS: conexión directa, secreto enmascarado/no vacío, identidad esperada y baseline 0002 verificado; pasos de escritura SKIPPED.
- SELECT independiente posterior confirmó en `microapp_rehearsal`: current_database/rol/branch/project exactos; schemas solo pg_catalog, information_schema, pg_toast y public; 0 relaciones públicas, 0 funciones públicas y sin ledger. No se modificó la DB.
- El workflow fijado ya se ejecutó manualmente desde `main` en `verify-empty`: el log confirmó descarga exacta del SHA, migraciones 0001–0019, conexión a `microapp_rehearsal`, identidad/roles esperados y target vacío. No se aplicaron migraciones ni escrituras.
- Nunca usar la DB `neondb` de la rama rehearsal: es parent-data clone con filas heredadas. Neon main/producción fuera de alcance.

### Verificación post-merge #275
- GitHub Actions en merge SHA: 9/9 workflow runs SUCCESS; required contexts `verify`, `postgres-migration`, `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history` y `Trivy filesystem and configuration scan` en SUCCESS.
- Cloudflare Pages y Workers Builds check-runs terminaron SUCCESS en el merge SHA. No se ejecutó smoke test HTTP autenticado contra endpoints productivos; por ello no se declara producción validada.
- Producción: **NOT READY**. No DDL/DML remoto, no migraciones, no cambios de Neon main, secretos de producción, DNS o billing.

## Estado reconciliado — 2026-11-08 (snapshot posterior a CI de PR #274)

**Fuente de verdad:** GitHub API y consultas SELECT de Neon. Snapshot de código/main: 37e8c40d5bacfb71133942d774c3f87d71d61b9e; último commit documental integrado #272: 33016a2d206c7b8cfc60e53e34a56a26651141d7. La actualización documental y el workflow de ensayo fijado se integran conjuntamente en PR #274.

### Main y PR abiertas
- **#270:** merged en 37e8c40d5bacfb71133942d774c3f87d71d61b9e; corrección de dos líneas de quoting en el resumen Neon. 9 workflow runs SUCCESS exact-HEAD.
- **#272:** merged en 33016a2d206c7b8cfc60e53e34a56a26651141d7; documentación, 10/10 workflow runs SUCCESS exact-HEAD. #271 cerrada como supersedida, sin pérdida de contenido.
- **#269 checkout + ledger:** Open/Draft; HEAD bc3939510e132e6f77c751514ff1b7dca58cdd4d; 13 ahead / 2 behind main; mergeability fluctuó entre consultas; 11/11 workflow runs SUCCESS exact-HEAD. Reviews COMMENTED (no APPROVE). Cambio adicional en 0018: revoca DELETE/TRUNCATE de payments para PUBLIC y microapp_runtime y añade assertions; checkout runtime no expone operación DELETE. Mantener Draft: decisión comercial y ensayo 0017–0019 pendientes.
- **#255 BCV:** Open/Ready; HEAD a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7; 48 ahead / 4 behind; mergeable=true; 10/10 workflow runs SUCCESS exact-HEAD. Review COMMENTED ID 5818042583, no APPROVE. BCV_SYNC_COMPLETED registra outcome; BCV_SYNC_FAILED registra solo código permitido y relanza error genérico para que Cloudflare marque el Cron como fallido. Persisten P1: política de anomalías de tasa y estado persistente/alerta externa; fixture del HTML real BCV pendiente. No integrar.
- **Otras PR abiertas:** #258 Open/Ready/mergeable=false y #262 Open/Ready/mergeable=true (apilada sobre #258). Comparación de archivos: #269 incluye las migraciones 0017 y 0019 y sus assertions; 0019, inventory-counts.ts, inventory-locks.ts y sus tests son idénticos a #262; #269 mejora el lock de checkout pasando branchId y endurece 0018. #269 es el reemplazo consolidado candidato. Comentarios de trazabilidad en #258 y #262; mantenerlas abiertas hasta que #269 se integre y se verifique en main. #233 Open/Draft histórica; #193 Open/Ready. **No modificar #193.**
- PR #275 (branch fix/neon-pinned-rehearsal-clean-history-20261108) reemplaza el intento #274, cuyo secret-history scan detectó un falso positivo por una frase `GitHub API:` seguida de un SHA de commit en STATE_JOURNAL; el contenido se preservó desde main sin ese contexto. El HEAD/checks exactos deben leerse en GitHub vivo. Workflow manual main-only; default verify-empty read-only; no dispatch ni migración ejecutados aún.

### Neon: distinción entre copia de main y base vacía
- Proyecto restless-fire-99110035; branch rehearsal-baseline-20261107, ID br-curly-poetry-b7dxsddm.
- Esta rama tiene como padre la rama primaria/default main (br-summer-math-b7297a60) y init_source=parent-data. La DB original neondb contiene filas heredadas: app_users 1, auth_allowlist 1, auth_bootstrap 1, auth_sessions 6, organization_members 1, organizations 1; demás tablas 0. No se inspeccionó contenido. Tratar esos registros como potencialmente reales. **No ejecutar migraciones ni DDL/DML sobre esa DB.**
- Se creó una base nueva y vacía microapp_rehearsal (database ID 1333740), owner microapp_migrator, dentro de la misma branch no-primary. get_database_tables devolvió cero tablas; SELECT confirmó current_database/user/session_user y branch/project exactos.
- En microapp_rehearsal, migrator tiene CONNECT, public USAGE/CREATE; runtime tiene CONNECT y public USAGE, sin CREATE. Los atributos globales de ambos roles son restrictivos y las membresías cumplen el preflight.
- No se ha ejecutado ninguna migración en microapp_rehearsal; sigue vacía.

### GitHub Actions — secreto y verify
- El propietario confirmó que actualizó NEON_REHEARSAL_DATABASE_URL.
- Se reintentó el run #42479603848 en operación verify. SUCCESS: secreto presente y enmascarado; conexión directa; identidad exacta neondb|microapp_migrator|microapp_migrator|br-curly-poetry-b7dxsddm|restless-fire-99110035; BASELINE_VERIFIED 294 facts. Pasos de adopción/migración quedaron SKIPPED. Run: https://github.com/BTF14/Micro-app/actions/runs/42479603848.
- Ese rerun conservó SHA/ref originales y ejecutó el resumen antiguo, que emitió tres command not found inocuos; #270 corrigió el resumen en main. No se afirma que el rerun probara el summary nuevo.
- La comparación de fingerprint 294/294 se realizó sobre la DB original neondb, que es copia de main; fue estrictamente SELECT y no cambió datos.

### Alcance de migraciones y próximo diseño
- Main contiene migraciones hasta 0016. Los archivos 0017, 0018 y 0019 solo existen en la rama #269 (bc3939510e132e6f77c751514ff1b7dca58cdd4d).
- El workflow actual adopt-and-migrate desde main solo vería hasta 0016 y está pensado para adoptar un schema baseline existente. No usarlo para probar 0017–0019.
- scripts/db/migrate.sh admite MIGRATIONS_DIR; sobre una DB vacía puede ejecutar 0001–0019 con ledger/checksums. El runner no ejecuta por sí solo los archivos .assertions.sql ni .deferred_failure.sql; un workflow de rehearsal debe ejecutarlos explícitamente después de aplicar, con expectativas de rollback/fallo verificadas.
- Próximo diseño: workflow manual desde main, source SHA fijado a #269 revisado, solo extraer SQL migrations/assertions del SHA (no ejecutar scripts shell de la rama), usar runner de main y apuntar exclusivamente a microapp_rehearsal. Derivar el nombre de DB en memoria desde el secreto sin imprimirlo. Operación de escritura con confirmación exacta separada. **No ejecutar hasta aprobación explícita.**

### Dictamen
**Producción: NOT READY.** No se tocó Neon main ni la DB original neondb; no hubo DDL/DML sobre datos heredados, cambios de secretos, Worker productivo, Cloudflare, DNS, billing ni despliegues manuales.
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

## Handoff vigente — 2026-11-08 08:25 UTC

La fuente de estado completa es `docs/CURRENT_STATE.md` (reconciliación GitHub en vivo). Main: `d28b80edc6b2a63019ded100e46bb4b11e81153a`. Hay 7 PR abiertas: #193, #233, #251, #255, #258, #261 y #262. Ninguna tiene review formal registrada. #258/#262/#251/#255/#261/#193/#233 tienen respectivamente 15/8/15/15/13/12/9 check-runs SUCCESS en sus HEADs observados; consultar CURRENT_STATE para SHA, bases y bloqueos exactos.

**Bloqueos que no deben perderse:**
- #258: aprobación funcional pendiente para una moneda por venta, pago exacto, sin parcial/sobrepago; BCV #255 y rehearsal Neon siguen pendientes.
- #262: comentario P1 #6719238384 sobre runtime INSERT directo al ledger sin validación DB de documento fuente para tipos no-count. No habilitar esos tipos hasta cerrar.
- #251 → #255: mantener la pila; no activar Cron productivo antes de rehearsal protegido y verificación de runtime login/ownership/grants.
- #193: conservar el documento único de 543 líneas; no cerrar ni reescribir la rama sin análisis.
- #233: no fusionar la rama histórica; preservar contenido único.

No modificar Neon main, datos reales, secretos, Worker productivo, DNS, billing ni hacer deploy manual. No pedir capturas/Build IDs/terminal/CLI/TinyFish. No confundir checks verdes con review ni readiness productiva. Continuar el siguiente paso técnico seguro; actualizar CURRENT_STATE, este handoff, checkpoint y diario al cambiar el estado.

---

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

### Instrucción de continuidad
Revalidar GitHub antes de actuar. No solicitar información ya documentada; no tocar Neon main, secretos ni configuraciones productivas. Trabajar por bloques completos y conservar todo cambio único.

---

Empieza leyendo `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md` y los SDD/ODD aplicables. Usa GitHub como fuente de verdad y comprueba refs/HEADs antes de actuar.

No pedir Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones ya documentadas. No hacer SQL manual ni escribir en Neon main. No cambiar secretos, Worker productivo, DNS o billing. No fusionar por CI verde solamente; separar check-runs, workflows, status contexts y reviews formales.
## Handoff vigente posterior a #257 — 2026-11-08 UTC

Empieza leyendo `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md` y los SDD/ODD aplicables. Usa GitHub como fuente de verdad y comprueba los HEADs actuales antes de actuar.

### Estado exacto de trabajo

- #259 CI serialization y #257 documentación ya están fusionadas en main.
- #258 Draft: HEAD `7cc80b47b39d557c1d1837c3176d97d7d23c8d94`, 15/15 check-runs y 13/13 workflows SUCCESS; 141 unit tests, 85 runtime-role tests y 16 checkout PostgreSQL tests. Incluye handler transaccional, migration 0017, selección BCV weekday/weekend y defensa SQL de aritmética por línea. No está fusionada ni aplicada en Neon.
- #255 Draft, base #251: parser/productor/API/Cron BCV; no está en main. #251 también Draft. Sus checks verdes no son review formal ni prueba de despliegue/Neon.
- #233 es la fuente antigua divergida; no fusionar. El código de checkout se recuperó en #258.
- #193 no modificar; respetar la restricción previa. Su revisión de privilegios inventario está registrada.

### Próximas acciones

1. Mantener #258 Draft hasta resolver los gates restantes: BCV #255, aprobación explícita de política de pagos, assertion SQL por pago, privilegios de balances, feriados y UI.
2. Resolver ordenadamente la pila #251 → #255 y después sincronizar #258; revisar conflictos de `index.ts`, `ci.yml` y `wrangler.toml`. No copiar checks de SHA anterior.
3. Continuar el plan de Neon rehearsal solo con runner protegido y autorización específica; Neon main permanece intocable.
4. Cerrar #233 solo después de integrar #258/#255 y comprobar que no queda contenido único.
5. Actualizar documentación viva después de cada cambio sustancial; no dejar HEADs, PRs o gates obsoletos.

### Límites

No Neon main, datos reales, secretos, Cloudflare manual, DNS, billing ni deploy manual. No pedir Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones ya documentadas. No fusionar por CI verde solamente; distinguir check-runs, workflows, status contexts y reviews formales.

## Handoff vivo — 2026-11-08 UTC — usar este snapshot antes de continuar

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


### Orden de trabajo

1. Terminar los checks exactos pendientes de #258 HEAD `313f76c132c61200ed49a7c6e4e01fcf75659bf9`; no reutilizar checks de SHAs previos.
2. Terminar este refresh documental y verificar el nuevo SHA de #257.
3. Obtener revisión independiente de #251, #255 y #258; mantener Draft mientras no exista.
4. Mantener #251 → #255 como pila: no retargetear #255 a main sin reconstruir la dependencia.
5. Resolver los gates de Neon rehearsal, identidad runtime, balance projection y checkout antes de cualquier activación productiva.
6. Continuar #193 sin cambiar su rama; mantener #233 histórica hasta que la recuperación #258 esté completa.

## Continuidad actualizada — 2026-11-08 UTC

Retoma desde el estado vivo de `docs/CURRENT_STATE.md`. No repitas investigaciones ni vuelvas a preguntar decisiones ya documentadas. Lee primero `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md` y los SDD/ODD aplicables.

### Estado de checkout

- #233 no es integrable: rama antigua divergida y basada en PR cerrada. Se preservó como fuente; no fusionar.
- #258 recupera handler, unit tests, PostgreSQL integration tests y route registration sobre main. Añade migration 0017, sin tocar migration 0015. El implementation SHA `d9ae6cd7f65c99126e7c4e45faa20a1dadaf3cdb` pasó 15/15 checks, 13/13 workflows, 141/141 unit tests y 15/15 checkout PostgreSQL tests. Tras sincronizar el merge #259, el HEAD `433a1fa1212f610cbb543597e620219bd91327a4` tenía 13/15 check-runs y 12/13 workflows SUCCESS; verificar los checks pendientes de ese SHA antes de cualquier integración.
- #255 contiene el productor y Cron BCV, sigue Draft y no está en main. #258 debe fallar cerrado sin tasa válida; no activar checkout hasta integrar la ingesta BCV y reconciliar `index.ts`, `ci.yml` y `wrangler.toml`.
- #257 falló en el runtime-role batch por concurrencia DDL/DML entre archivos de test que comparten la misma DB desechable. #259 añade `--no-file-parallelism`; verificar sus checks y luego actualizar/revalidar #257. No etiquetar el fallo como flaky sin resolver la causa.

### Orden siguiente

1. #259 ya está fusionada en main como `07b146a3f2b7830bbd328a585535084e57e43c4e`; no reabrirla.
2. Verificar los workflows pendientes del HEAD vivo de #258; revisar handler/migration 0017 y no reutilizar checks de SHA anterior.
3. #257 volvió a basarse en main; verificar su nuevo SHA tras este refresh documental.
4. Resolver la dependencia #255 (ingesta/Cron BCV) y planificar integración sin perder cambios de `index.ts`, `ci.yml` ni `wrangler.toml`.
4. Antes de producción, cerrar: aprobación explícita de moneda única/sin pagos parciales/sin sobrepago; assertions SQL de fórmula por línea y asignación USD equivalente por pago; privilegio directo runtime sobre `inventory_balances`; feriados bancarios entre semana; UI checkout.
5. Actualizar esta documentación y el estado de #233 solo después de preservar y verificar cada cambio único. No cerrar #233 antes de que #258/#255 queden integradas.
6. Continuar la reconciliación de inventario #193 sin alterar su rama ni su PR mientras siga vigente la restricción documentada.

### Límites operativos

- No Neon main, datos reales, secretos, Cloudflare productivo, DNS, billing, ni deploy manual.
- Neon rehearsal solo mediante runner protegido y autorización específica documentada; nunca SQL manual.
- No pedir Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones ya documentadas. Si un dato imprescindible falta, preguntar una sola vez y aceptar texto.
- No fusionar por CI verde solamente. Distinguir check-runs, workflow runs, status contexts y reviews formales.

# CONTINUIDAD MAESTRA — BTF14/Micro-app — 2026-11-08 UTC

Actúa como Staff Engineer/arquitecto senior. Continúa desde el estado real descrito aquí; no reinicies el proyecto ni repitas investigaciones ya documentadas.

## Fuentes obligatorias antes de intervenir

Lee `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CURRENT_STATE.md`, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md`, `docs/security/NEON_MIGRATION_APPLICATION_PLAN.md`, los SDD y ODD relacionados con la tarea.

## Estado exacto

- GitHub main: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- PR #251: Draft, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, base main, 15/15 check-runs SUCCESS, cero commits detrás.
- PR #255: Draft, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251 HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, 13 workflow runs y 15/15 check-runs SUCCESS, cero commits detrás.
- PR #257: Draft, HEAD `143a38664cf14e360801980d39e0cc3f2b7d5650`, base main, 10/10 check-runs SUCCESS.
- PRs #193, #202, #211 y #233 siguen abiertas para reconciliación; #233 conserva checkout handler/tests únicos. No fusionar sus ramas antiguas directamente.
- #200, #204, #205, #207–#210 y #227–#232 fueron cerradas como supersedidas tras comparar su contenido con main y/o #255/#257. No reabrir ni recrear esas PRs.

## Próximo orden de ejecución

1. Revisión técnica independiente y exacta de #251 y #255; CI verde no es aprobación. Mantener Draft si no existe revisión requerida.
2. Completar el gate Neon solo mediante runner protegido. El branch de ensayo tiene roles, pero runtime no tiene grants de tabla y no se han aplicado 0003–0016. No usar SQL manual para aplicar migraciones. Antes de ejecutar `adopt-baseline.sh apply`/`migrate.sh` en rehearsal, obtener autorización específica para crear/usar `NEON_REHEARSAL_DATABASE_URL` y el workflow protegido. No tocar Neon main ni secretos de producción.
3. No fusionar #251 ni #255 hasta verificar esquema, grants, login real de runtime y comportamiento del Cron. Los checks de Cloudflare de PR son checks de preview/build, no evidencia de producción.
4. Después de cerrar BCV, recuperar #233 en una rama nueva basada en la línea actual #255: portar únicamente handler/tests únicos, no su migration 0015 antigua; preparar migration 0017 para que el trigger use la misma regla de fecha efectiva que BCV latest. Mantener pendiente la aprobación funcional del modelo de pagos.
5. Revisar PR #193 y reconciliar sus diferencias con el código: migration 0012 permite INSERT/UPDATE directo de `inventory_balances` a runtime (0010 obliga a pairing con ledger, pero no reemplaza una proyección estrictamente SECURITY DEFINER); `reference_type/reference_id` siguen sin FK tipada y `legacy_stock_snapshot` no existe. Decidir/implementar el modelo de privilegios y preservación legado antes de producción. Las ocho decisiones de negocio ya aprobadas no se vuelven a preguntar.
6. Continuar auditoría del inventario y aislamiento tenant/sucursal; no reabrir ramas obsoletas. Recuperar cualquier cambio único antes de cerrar PRs.
7. Mantener actualizados CURRENT_STATE, WORK_CHECKPOINT, PROJECT_PLAN, STATE_JOURNAL y SECURITY_ROADMAP después de cada bloque.

## Reglas de colaboración

- El usuario trabaja principalmente desde el teléfono. No pedir terminal, CLI, capturas, Build IDs, reconexiones ni datos ya documentados.
- No pedir «continúa» tras cada paso. Investiga, decide, implementa, prueba y documenta de forma autónoma dentro de los gates.
- No cambiar secretos, Neon main, datos reales, DNS, billing ni Cloudflare production sin autorización específica.
- No declarar MVP/producción listo solo por CI. Separar workflows, check-runs, status contexts y revisiones formales.
- Si falta una autorización humana imprescindible, pedirla una sola vez, con el nombre exacto del permiso y la razón.

## Criterio de salida

MVP solo se declara funcional y listo cuando migraciones, permisos runtime, aislamiento multi-tenant/sucursal, inventario/Kardex, transferencias, checkout/pagos, backup/restore, E2E, Worker/API/frontend, observabilidad y recuperación estén probados de forma integrada en un entorno autorizado. Producción sigue NOT READY.

---

# Handoff operativo — 2026-11-07 UTC

## Estado actual y prioridades

- GitHub main: `a38463ea00415c7601d716132e70a29e381a2e34`; 20 PR abiertas en consulta directa.
- PR #251 auth retention: Draft, HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662`; 11/11 workflows PR y 2/2 push security scans SUCCESS. Incluye cleanup 48 h limitado a 500 filas por tabla, `SKIP LOCKED`, preview skip y pruebas PostgreSQL con `microapp_runtime`. No mergear ni activar hasta resolver Neon schema/runtime gate.
- PR #255 BCV: Draft, HEAD `c45c8ec050ddf96381968535cb6bddfd24ac1feb`, base #251 HEAD `7c6df0016834e2e6f2ca4b4d062c94995e756662`, mergeable. 10/10 workflows pull_request y 3/3 runs push SUCCESS en SHA exacto; CI logs confirman 2/2 tests PostgreSQL BCV con admin y microapp_runtime. Reconstruye BCV de #227 y fix de #250 sobre la cadena actual, sin duplicar migration 0013.
- #254 está cerrada como duplicado de recuperación; su código completo está copiado en #255. #218–#226 están cerradas como supersedidas tras recuperación/verificación. #218 cleanup se conserva en #251.
- #227 fue reabierta como ancla temporal de dependencia/procedencia mientras #228–#233 sigan apuntando a su rama; Draft, no merge-ready. #250 está cerrada como supersedida; su fix está preservado en #255. #254 está cerrada como duplicado.
- PR #253 es esta reconciliación documental (Draft, base main `c4be53ea3247c69206a79ebe5fa2f875a4f9aac4`).

- PR #256 merged to main at `a38463ea00415c7601d716132e70a29e381a2e34`: backup/restore synthetic sale fixture no longer references removed `discount_usd`; exact-HEAD PR workflows passed, post-merge checks 10/10 check-runs + 8/8 push workflows SUCCESS, incluidos Cloudflare Pages y Workers builds.

## Reglas BCV verificadas

- **Base normativa para operaciones en días no hábiles:** el artículo 25 de la Ley del IVA dispone que, si el hecho imponible ocurre en un día no hábil para el sector financiero, se aplica el tipo de cambio vigente el día hábil inmediatamente siguiente. Referencia documental: Gaceta Oficial N.º 6.507 Extraordinario (29-01-2020), texto del artículo 25: <https://www.ivecofi.net/informacion/legislacion/leyes/ley-impuesto-valor-agregado/titulo-iv>. La publicación BCV lleva `Fecha Valor`; se usa la tasa con la fecha valor que corresponda al día hábil siguiente para sábado/domingo/feriado. El BCV suele publicar esa tasa en la tarde del día hábil anterior. Verificación explicativa secundaria: <https://elcambiove.com/guias/tasa-bcv-fin-de-semana/>. Esto documenta la regla de conversión de IVA; no sustituye revisión contable/fiscal del caso concreto.
- Días hábiles: usar fecha efectiva de hoy. Sábado/domingo: elegir la fecha efectiva futura más cercana. Una fecha futura no bloquea insertar una fecha anterior faltante. Nunca saltar una fila futura stale para usar una posterior.
- Fechas futuras aceptadas hasta 7 días. Los feriados bancarios entre semana todavía no tienen calendario autoritativo: fail closed, sin conversión VES, hasta implementar y validar el calendario.
- No usar tasa estimada ni proveedor tercero. La conversión requiere tasa BCV actual/validada y aritmética decimal exacta.

## Neon y seguridad

- Neon rehearsal `br-curly-poetry-b7dxsddm`, parent main `br-summer-math-b7297a60`. La huella es 133 columnas, 204 constraints, 46 índices, 17 relaciones y 15 tablas. En rehearsal existen logins migrator/runtime; runtime todavía no tiene grants de tabla. No hay ledger, `auth_bootstrap_attempts`, warehouses ni conteos.
- No se ejecutó baseline ni migraciones 0003–0016. Neon main intacta. No pegar SQL manualmente ni pedir secretos/terminal/capturas/TinyFish al usuario.
- PR #251 no puede mergearse/activarse hasta aplicar schema y probar roles/grants con el runner protegido en rehearsal y, después, obtener autorización específica para cualquier cambio de producción.
- PR #255 no puede mergearse/desplegarse hasta que migration 0013 esté aplicada y runtime login/grants y Cron real estén verificados.
- No cambiar secretos, Cloudflare dashboard, DNS, billing ni datos reales. No hacer despliegues manuales. El merge de #256 generó automáticamente builds/checks de Cloudflare Pages y Workers con SUCCESS; no se hizo smoke HTTP independiente contra producción. Producción sigue **NOT READY**.

## Próximas acciones

1. Solicitar/obtener revisión independiente de #255 y resolver cualquier hallazgo; su CI exacto ya terminó verde.
2. Confirmar PostgreSQL admin/runtime integration de BCV: mañana/fecha siguiente hábil primero, fecha de hoy después, idempotencia, latest de fin de semana, stale nearest future y endpoints latest/history.
4. Mantener #251 Draft hasta el gate de Neon; no activar Cron antes de la adopción segura y prueba con runtime login.
5. Reconciliar #228–#231 como supersedidas solo tras conservar la corrección útil del fixture de backup; portar #232 y revisar/portar #233 sobre #255, sin migration 0015 duplicada.
6. Diseñar migration 0017 para alinear el trigger SQL de checkout con BCV weekday/weekend; no activar checkout hasta resolver el contrato de pagos que migration 0015 ya impone (una moneda y pago exacto completo) y obtener confirmación funcional.
7. Resolver #200 por reconstrucción de cambios únicos sobre main; no rebase/merge wholesale.
8. Actualizar este handoff y el journal con cada cambio de estado real. No repetir preguntas ya documentadas.

---

## Snapshot histórico supersedido — 2026-11-07 (antes de #252/#255)



Fuente de verdad: GitHub consultado en vivo; main `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`; 28 PR abiertas. El snapshot anterior de 25 PR quedó obsoleto.

### BCV corregido, aún no integrado
- PR #250 HEAD `081ec1026f4bda889a633bb3fcbe420433e13336`, base #227 `83cf96b7fcb7b0e304f676d21ab721de61364a59`, 9 ahead/0 behind, Draft. Seis workflows exact-HEAD success: CI push/PR, migration-runner push/PR, Security scan, Secret history scan. La prueba PostgreSQL real valida mañana→hoy, selección por fecha America/Caracas e idempotencia. La prueba está protegida para ejecutarse solo contra localhost/127.0.0.1 y DB /microapp_test con CI=true. No reviews formales ni threads.
- PR #227 HEAD `83cf96b7fcb7b0e304f676d21ab721de61364a59`: 13 workflows success; Draft, base #226. No integrar su stack completo sin reconstruirlo sobre main actual.
- #250 debe conservarse; no cerrar ni fusionar mientras su base dependa de la cadena vieja.

### Bloqueo estructural del stack
- PR #200 HEAD `464ca08b9020fad128cc9c8a321568493d484517`, main actual `fc332946a9128e92ce39a3eb1ef1ee7ebd261598`: diverged 37 ahead/14 behind, GitHub no mergeable. Main ya contiene migraciones 0005–0016; #200 tiene numeración incompatible (inventario 0005 y migraciones posteriores desplazadas) y amplio solapamiento de auth/catalog/tenant/workflows/lockfile. **No rebase ni merge automático**; reconstruir los cambios únicos en ramas basadas en main.
- PR #204 HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20` está diverged 8 ahead/5 behind respecto al #200 actual, con un único archivo cambiado (`inventory-counts.integration.test.ts`). Su fixture isolation ya está en main de forma más completa: `beforeEach` crea warehouse/product por test y `seedInventoryBalanceFor` registra el movimiento de fixture. Revisar el diff completo; si no queda comportamiento único, cerrar #204 como supersedida con comentario/evidencia.
- La secuencia descendiente activa incluye #205, #208, #207, #209, #210, #211, #218, #220–#227. Máximo dos frentes activos; resolver raíz y dependencias en orden. No cerrar PR sin rescatar y verificar sus cambios únicos.

- #205/#207/#208/#209/#210 llevan comportamiento ya integrado en main: #205 idempotency fields, handler y sus 21 test names están en main; #207 SQL igual a main 0008; #208 SQL igual a main 0007; #209 SQL igual a main 0009; #210 SQL igual a main 0010. Las assertions solo difieren en el comentario del filename. Auditar tests/workflows/docs restantes y dependencias downstream antes de cerrar como supersedidas.

### PR cerradas conservadas
- #214: cerrada como supersedida por #213, que está fusionada en main. No reintroducir su módulo rate-limit ni su secreto HMAC alternativo.
- #215: cerrada sin merge, pero el handoff OAuth server-side ya está integrado en main vía #240: migración main 0005 byte-identical a la antigua 0010 y flujo opaque handle/state hash/consumo atómico presente en `google-auth.ts`.
- #218 fue retargeteada a la rama activa #211 (51 ahead/0 behind) solo para auditar procedencia. Su branch contiene copias obsoletas de #214/#215 (`enforceAuthRateLimit`, migration 0010, google-auth antiguo) y no debe integrarse como está. El handoff y migration 0010 ya están en main vía #240; main usa #213 `consumeAuthRateLimit` y `readBodyWithinLimit`. El delta útil ya está portado en PR #251 (Draft), basada en main: Cron horario solo producción, cleanup de auth rows mayores a 48 h, preview skip, grants runtime verificados y PostgreSQL integration tests. HEAD `4a0662346c2a1f95bcf09d815df55755f53686cd`; 10/10 PR workflows success, incluido login real `microapp_runtime`. No mergear hasta que la adopción segura en Neon resuelva que main no tiene `auth_bootstrap_attempts` ni roles `microapp_runtime`/`microapp_migrator`. #218 queda abierta para revisar otros deltas únicos.

### Seguridad y límites
- Neon main intacta. Ensayo `rehearsal-baseline-20261107` aún sin aplicar baseline ni migraciones 0003–0016; runtime grants posteriores siguen pendientes.
- No tocar Neon main, datos reales, secretos, Cloudflare productivo, DNS, billing ni hacer despliegues manuales. No force-push. No fusionar PRs Draft ni stacks obsoletos.
- Producción **NOT READY**; gates P0/P1 e issue #53 continúan abiertos.

### Próximas acciones exactas
1. Auditar y reconstruir PR #200 sobre main actual, resolviendo numeración y contenido de migraciones con pruebas PostgreSQL.
2. Verificar que #204 no aporta más que fixture isolation ya presente y ampliada en main; si se confirma, documentar y cerrar como supersedida. Auditar #205–#211 contra las implementaciones ya integradas.
3. Sincronizar o portar solo diferencias únicas downstream en orden y revisar diff/CI en cada SHA final.
4. Portar #215/#218 sobre el rate limiter de #213 y validar grants para migration 0010.
5. Mantener #250 como corrección verificada; integrar solo después de tener base actual y exact-HEAD CI.

## Continuidad inmediata — estado real 2026-11-07

El main de GitHub está actualizado por #248; merge SHA fc332946a9128e92ce39a3eb1ef1ee7ebd261598. PR #244–#248 están fusionadas. La consulta viva más reciente reporta **28 PR abiertas**; ver la reconciliación al inicio de este archivo.

Neon: la rama principal br-summer-math-b7297a60 no fue modificada y sigue sin ledger ni roles app. La rama rehearsal-baseline-20261107 (br-curly-poetry-b7dxsddm) está lista, tiene microapp_migrator/microapp_runtime, 15 objetos propiedad de migrator, pero no ledger ni migraciones 0003–0016. SELECT con ambos logins confirmó conexión; runtime aún no tiene grants de tablas. El propietario debe ejecutar los scripts versionados reales en la rama de ensayo (no pegar migraciones manualmente) y verificar runtime después de grants. No usar Neon main.

BCV: la migración 0013 de #227 ya está en main. El bug mañana→hoy se corrigió en #250; HEAD `081ec1026f4bda889a633bb3fcbe420433e13336` pasó 6/6 workflows exactos, incluida integración PostgreSQL real con fecha America/Caracas e idempotencia. #250 sigue Draft y apilada sobre #227; no fusionar #227 completo ni su base antigua. Rescatar código BCV único sobre main después de reconstruir la cadena.

Backlog: 28 PR abiertas según consulta viva. #214 está cerrada como supersedida por #213; #215 cerrada sin merge conserva handoff único portado a #218. #200/#204 tienen drift y #218 se retargeteó a #211. Ver sección superior para refs actuales. El objetivo es consolidar en ramas basadas en main y fusionar PR elegibles, no rebasar/mergear a ciegas cada rama apilada.

Prioridad próxima: 1) auditar diferencias únicas de #200 frente a main y reconciliar migraciones; 2) verificar #204 como posible supersedida y revisar #205–#211 contra main; 3) portar handoff #215/#218 sobre rate limiter canónico #213; 4) mantener #250 y recuperar su código BCV sobre base actual; 5) continuar ensayo Neon solo en rama de rehearsal y bajo los gates específicos. Producción sigue NOT READY. No ejecutar Neon main, cambiar secretos, Cloudflare manual, DNS ni billing.

---

## Estado verificado — 2026-11-06

### PR #244 integrada
- PR #244 merged: `158ec68bd55825d6e8d5527d086023a13445a89c`.
- Post-merge commit checks: **10/10 SUCCESS**, incluyendo CI, PostgreSQL, migration runner, Playwright, Semgrep, Trivy, secret scan, Cloudflare Pages y Workers Builds.
- Cloudflare Pages y Workers Builds reportaron SUCCESS en el commit de merge. Un GET no autenticado a la ruta de catálogo de producción respondió 401 (esperado); no se realizó smoke autenticado de producción.
- PR #244 integró catálogo API/UI, BigInt exact decimals, inventory count lifecycle/idempotency, tenant/branch/warehouse locks, runtime-role tests, streaming body limits y preview API isolation.
- No hubo escrituras en Neon producción, baseline/adoption, cambios de roles/grants, secretos, DNS ni billing.

### Frente activo — inventario lectura/kardex
- Rama: `feat/inventory-read-ledger-20261106`, basada en main después de #244.
- Añade GET paginado de balances por almacén y GET paginado del kardex append-only, con tenant/branch/warehouse scope, locks de autorización, coste visible solo a owner/admin/inventory y oculto a cashier.
- Tests PostgreSQL preparan fixtures como admin y llaman API con el rol configurado; cubren saldos/reservas/disponible, coste por rol, paginación, kardex, acceso cross-tenant y almacén inactivo.
- Esta rama aún no tiene PR ni workflows ejecutados sobre su HEAD final. Mantenerla en Draft al abrir PR y validar exact-SHA.

### Pendientes de arquitectura
- Tras los endpoints de lectura, falta UI de inventario, detalle de conteos y movimientos/recepciones.
- Transferencias siguen siendo el modelo aprobado de dos etapas: despacho en origen y recepción en destino, con mercancía en tránsito y diferencias enviadas/recibidas. El esquema actual no contiene una entidad de transferencia; no simularla con movimientos sueltos. Diseñar migración/estado/idempotencia/auditoría antes de implementar.
- PR #227: corregir orden de fechas efectivas BCV (tasa futura almacenada no debe bloquear tasa de hoy), probar mañana→hoy y límites de cuerpo HTTP antes de habilitar BCV.
- Checkout de ventas sigue pendiente, después de inventario y BCV.
- Producción sigue **NOT READY**: sin baseline/adoption Neon, smoke autenticado productivo, cierre P0/P1 issue #53 ni validación integral E2E de negocio.

## Estado verificado — PR #244 — 2026-11-06

- PR: https://github.com/BTF14/Micro-app/pull/244 — Draft, base main.
- HEAD validado: `d3de5216fac446580e4afdd39376af503cc94b51`; 56 archivos, +5,630/-218.
- **10/10 workflows SUCCESS en este SHA exacto**: CI, PostgreSQL migration validation, migration-runner validation, Playwright E2E, Semgrep, Trivy, dependency review, secret-history scan, AutoSkills preview y progress dashboard.
- CI incluye build/typecheck, unit tests, integración PostgreSQL admin/runtime para auth, branch scope, register shifts, cashier own-shift, catálogo y conteos; todas pasaron.
- Correcciones de test harness: aserciones históricas se ejecutan junto a su migración, no después de aplicar toda la cadena; las fixtures usan conexión admin y las peticiones/helper checks usan runtime. Se añadió test que prueba que cashier open-shift ejecuta realmente con login runtime.
- Seguridad añadida: lecturas de catálogo/almacenes/conteos mantienen locks de sesión/tenant/sucursal durante la consulta; la lista de conteos bloquea el warehouse. Cantidades y costos de conteo solo aceptan strings decimales, no JSON numbers.
- UI: catálogo y formularios consumen el paquete BigInt compartido; aviso BCV ya no afirma conversión vigente cuando no existe tasa validada. Descuentos ausentes.
- Cloudflare Pages preview: https://feat-recover-inventory-appli.micro-app-63i.pages.dev
- Cloudflare Worker preview: https://feat-recover-inventory-application-20261106-micro-app-api.btfcasheb.workers.dev
- Smoke directo del Worker preview: `/health` responde 200; endpoint de catálogo devuelve 503, bloqueado por el aislamiento de preview. Esto no es producción.
- No hay reviews formales ni threads de revisión registrados en PR #244. main está protegido; la integración no tiene permiso para leer el endpoint de branch protection (403). No se ha intentado eludir protección.
- Producción sigue **NOT READY**: no hay baseline/adoption de Neon ejecutado, smoke autenticado de producción, cierre completo de issue #53/P0-P1, inventory movement/read UI, BCV corregido/integrado ni checkout de ventas en la app.

# Continuidad inmediata BTF14/Micro-app — 2026-11-06

Continúa desde el repositorio real, no desde supuestos. El último main verificado es 38e1d61acc083b3c0b9b73edcb2bc7887ca56872.

## Ya integrado
- PR #242: backlog recovery ledger, merge 7a719d593248341aac86b1ded980d5bb9a6f94e8.
- PR #243: secuencia canónica de migraciones 0001–0015, assertions, migration runner fail-closed y harness PostgreSQL. Merge 38e1d61acc083b3c0b9b73edcb2bc7887ca56872; final head 481f3b956c96c50b6f956541d1d675646fe66b51, 10/10 workflows SUCCESS.

## Frente activo
Rama feat/recover-inventory-application-20261106:
- API catalog read/create/update; BigInt exact-decimal package compartido.
- Inventario: create/confirm opening/physical counts, Idempotency-Key obligatorio, deterministic locks para tenant/branch/warehouse/balances.
- Central authorization sin operaciones de descuento.
- Streaming body limits para bootstrap/catalog writes.
- Worker preview API isolation.
- Web catalog navigation, product form, USD pricing; VES conversion permanece desactivada hasta BCV verificado.
- Nuevas pruebas unitarias y PostgreSQL integration para roles admin/runtime.
- PR #244 está abierta en Draft. Consultar el HEAD vivo y ejecutar/esperar todos los workflows sobre ese SHA exacto; no tratar resultados del SHA anterior como evidencia del HEAD actual.

## Hallazgos pendientes
- #227: validateEffectiveDate permite mañana, pero persistBcvOfficialRate puede rechazar la tasa de hoy si ya se guardó mañana. Corregir y probar el orden mañana→hoy.
- Aún falta portar BCV route/scheduler y checkout handler; no declarar ventas completas.
- Las PR originales deben permanecer abiertas hasta rescatar y verificar todo su contenido único.

## Seguridad / producción
No ejecutar escrituras Neon, baseline/ledger adoption, roles/grants, secretos, DNS, Cloudflare manual o billing sin autorización específica. El Neon main audit encontró esquema poblado sin ledger y sin login roles dedicados; no ejecutar el runner allí. Preview/CI green no equivale a smoke autenticado de producción. Producción sigue NOT READY.

## Instrucción de ejecución
Primero abre/consulta la PR de la rama activa, verifica el SHA exacto y deja correr CI, PostgreSQL, runtime-role, Playwright, SAST, Trivy, secret scan y backup/restore. Corrige todo fallo antes de marcar Ready. Después continúa con inventory read/movement, BCV y checkout, recuperando cambios de las PR fuente sin fusionar ramas antiguas divergidas.


## INSTRUCCIÓN EXPLÍCITA DEL PROPIETARIO — BACKLOG PR Y LIBERACIÓN

El propietario confirma que el backlog comunicado es de 26 PR y que el objetivo es completarlas y fusionarlas cuando cada una supere **todas** sus verificaciones y sea segura para integrarse. El número debe reconciliarse con GitHub en vivo (puede cambiar). No fusionar en bloque ni por CI verde aislado; tampoco dejar una PR elegible esperando a que finalicen todas las demás. Integrar raíz primero, actualizar/rebasar dependientes, preservar cambios únicos y mantener máximo dos frentes.

Para cada PR: revisar diff/base/head/dependencias, tests funcionales y de regresión, seguridad, migraciones/roles cuando aplique, typecheck/build/E2E, checks obligatorios del SHA final, reviews solicitadas y branch protection. Si todo pasa y no queda riesgo material, usar la autorización permanente de merge sin volver a preguntar; luego comprobar merge SHA, checks post-merge y despliegue, diferenciando preview y producción.

La liberación global requiere evidencia end-to-end y cierre de P0/P1, especialmente baseline y secuencia de migraciones, privilegios PostgreSQL efectivos mínimos y separación runtime/migrator/backup, integridad de inventario/ventas, auth y permisos, importes exactos sin descuentos, BCV verificable, backup/restore + RPO/RTO, alertas, seguridad, coste $0 y smoke test autenticado de producción. La autorización de merge no autoriza operaciones sensibles en Neon main, migraciones remotas, roles/grants, secretos, datos reales, Cloudflare manual, DNS o billing.
## CHECKPOINT DE CONTINUIDAD — 2026-11-06 03:49 UTC — estado vivo tras PR #240

Continuar desde el estado real de GitHub, no desde los snapshots históricos que siguen debajo.

### Estado verificado
- `main` = `71d6434a1877b5e618a093e60472621af8ef790f`. PR #240 está fusionada con 9/9 check-runs SUCCESS en su merge SHA. PR #213 también está integrada en `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`.
- PR #215 está cerrada sin merge; su handoff server-side fue integrado mediante #240. PR #218/#220 siguen Draft con base heredada de #215: portar/reconciliar su diff con el código de main antes de considerar sus checks.
- 25 PR abiertas. PR #200 HEAD `464ca08b9020fad128cc9c8a321568493d484517` (33 ahead/2 behind; 19/19 checks success). PR #233 HEAD `070f49ec1f1e45debb7fe99d998dc2429b5da9b1` (9/9 checks success) y representa la pila funcional más integrada, pero sigue Draft.
- El éxito de Pages/Workers checks es evidencia del build/deployment reportado por CI; no se ha demostrado smoke test autenticado de producción.

### Bloqueadores P0 confirmados por lectura
1. Neon main carece de logins `microapp_runtime` y `microapp_migrator`; los roles backup/service/owner heredan `pg_write_all_data` vía `neon_superuser`, y `cloud_admin` es superuser.
2. No existe `public.schema_migrations`; el esquema `public` está poblado. El runner requiere conexión directa como migrator y falla cerrado con `MIGRATION_BASELINE_REQUIRED` para un esquema poblado sin ledger. No intentar ejecutarlo contra Neon main.
3. La numeración colisiona: main tiene `0005_auth_bootstrap_attempts`; el stack tiene `0005_warehouse_inventory` y repite la misma migración auth como `0010_auth_bootstrap_attempts`. SQL de auth 0010 y 0005 de main es el mismo blob.

### Secuencia candidata a consolidar (aún no implementada)
0001 initial → 0002 Google identity → 0003 branch scope → 0004 register shifts → 0005 auth bootstrap (main) → 0006 warehouse inventory → 0007 register shift roles → 0008 audit append-only → 0009 inventory count validation → 0010 balance-ledger coupling → 0011 runtime lock helpers → 0012 runtime grants → 0013 BCV precision/grants → 0014 no-discount sales → 0015 atomic checkout.

Actualizar todos los nombres SQL/assertions, pasos explícitos de migration-check/CI, runner tests y documentación. Retirar la copia 0010 auth y utilizar la migración/assertions 0005 ya fusionadas. Probar orden completo, checksums, rollback/injected failure, ledger gaps, role smoke y regresión API en PostgreSQL 18 efímero.

### Siguiente ejecución recomendada
1. Inspeccionar diff completo y bases actuales de #200, #204/#205/#207–#211 y #218–#233. Evitar fusionar PRs encadenadas con bases antiguas.
2. Preparar una única rama integrada desde main actual para la reconciliación de migraciones y sus pruebas, conservando los cambios de dominio y eliminando la duplicidad auth.
3. Diseñar baseline/adopción de la Neon poblada. Comparar el esquema real contra migraciones 0001–0005 y ownership/ACLs; no insertar filas de ledger por suposición. La provisión de roles/grants y cualquier migración remota siguen requiriendo autorización específica.
4. Mantener #200/#233 y endpoints dependientes de tablas nuevas sin merge/despliegue hasta resolver el P0 de runtime/migrator y un rollout seguro.
5. Mantener BCV y checkout con decimales exactos; no reintroducir descuentos.

### Evidencia persistente
- Comentario de auditoría en PR #233, ID `6676411612`, contiene la secuencia candidata y bloqueos.
- Merge #240: `71d6434a1877b5e618a093e60472621af8ef790f`, 9/9 checks success.
- Neon: consultas exclusivamente SELECT; no se cambiaron roles, grants ni datos.
- Producción: **NO LISTA**. No se ha probado un smoke test de producción.

---

## CHECKPOINT ACTUAL — 2026-11-06 UTC — fuente de verdad

> Este bloque supersede checkpoints antiguos. Si una sección histórica contradice este estado o `AGENTS.md` / `docs/AI_COLLABORATION_AND_PR_POLICY.md`, prevalece la política permanente y el estado vivo. Revalidar GitHub antes de cada acción.

- Repo `BTF14/Micro-app`; main `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`.
- El propietario autoriza merge a main al pasar todos los gates y acepta Pages/Workers auto-deploy inherente. No pedir reconfirmación por PR. No cubre cambios manuales de Cloudflare, secretos, DNS, billing, roles/grants, migraciones o datos reales de Neon.
- Últimos merges: #237 (política), #206 (deps) y #213 (rate limit OAuth). #213 cubre start/bootstrap/callback con HMAC de GOOGLE_CLIENT_SECRET existente, CF-Connecting-IP, contador atómico y fail-closed; checks post-merge SUCCESS. #214 cerrada como duplicada. Backlog: 26 PR abiertas.
- Hallazgo Neon main, solo lectura: `backup_readonly`, `neon_service` y `neondb_owner` son miembros de `neon_superuser`; este hereda `pg_write_all_data`. `cloud_admin` es superuser. El supuesto rol backup readonly y el rol de servicio incumplen el principio de mínimo privilegio. No se leyeron secretos ni se modificó DB; identidad de cada Worker binding sigue sin mapear.
- #200: HEAD `464ca08b9020fad128cc9c8a321568493d484517`, 33 ahead/0 behind, 30 archivos; check-runs/workflows SUCCESS. Sigue Draft porque las tablas de inventario 0005 no existen en Neon main. No fusionar hasta que migración/runtime estén preparados y autorizados.
- #213 merge SHA `0f2c142a8e3dc624437e3c6c36c0951c64d3890b`. #214 cerrada; el trabajo de bootstrap handoff distinto se conserva en #215.
- #215: Draft sobre #214; preservar handoff server-side + streaming body, eliminar rate-limit duplicado/secreto nuevo y portar sobre #213. Migración 0010 exige grants reales; no fusionar antes de resolver runtime/migrator.
- #224 runtime grants harness; #226 migration runner; #227 BCV dependen de la cadena de roles/migraciones. No se han aplicado migraciones 0005–0013 a Neon main.
- Issue #53 permanece OPEN/P0. Producción NO LISTA. Checks sintéticos no verifican grants efectivos, migraciones remotas, backup real ni smoke tests reales.
- Próxima secuencia: (1) plan de remediación de roles, (2) migrator/runtime separado y grants, (3) migración segura con rollback/restore, (4) portar #215, (5) integrar inventario y BCV raíz primero. Máximo dos frentes activos; no crear PR duplicadas; continuar al siguiente paso seguro sin pedir autorización de merge repetida.


---

# Handoff operativo — continuidad Micro-app — 2026-11-01 UTC

## Handoff — adopción ODD y evaluación ECC/E2E — 2026-11-04

- Repositorio: BTF14/Micro-app. Revalidar rama, HEAD, PR y checks en vivo antes de continuar.
- PR #197: `https://github.com/BTF14/Micro-app/pull/197`; rama `chore/agent-governance-speckit-20261104`; abierta como Draft, sin merge. Base SHA observado en la metadata de PR: `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`. HEAD documental más reciente al escribir este checkpoint: `7f44102792855f2c39f5393fad2e8bd55c27b0d3`; verificar que no haya commits posteriores.
- ODD es el workflow predeterminado, definido en `docs/ODD_WORKFLOW.md`. El SDD workflow está retirado y `docs/SDD_WORKFLOW.md` redirige al nuevo documento. Los documentos de dominio en `docs/sdd/` permanecen vigentes y no deben borrarse por esta transición.
- Trabajo sustancial/crítico: un solo `odd/tasks/<feature>.md` antes de editar código. Trabajo pequeño: sin artefactos innecesarios. GitHub es la memoria durable; Engram no está instalado ni es requisito.
- Spec Kit v1.3.0: evaluación anterior archivada en `docs/SPEC_KIT_ADOPTION.md`; CLI no instalada/ejecutada. No instalar ni invocar como flujo activo.
- ECC: evaluación documental, licencia MIT declarada, soporte target Copilot CLI; no instalar perfil full ni hooks. Seleccionar skills concretas solo tras fijar release y revisar permisos/coste/telemetría.
- tester-army/e2e: evaluación documental, Apache-2.0 declarado; framework en desarrollo hacia 1.0, telemetría anónima documentada. No instalar ni añadir a CI. Candidato a piloto aislado tras estabilizar Playwright determinista y demostrar coste $0.
- RDD es independiente de ODD y no se activa automáticamente.
- **Gates intactos:** presupuesto $0; no tocar main/Neon producción/datos reales; no desplegar ni fusionar; Seguridad Nivel 1 no está cerrada mientras falten RPO/RTO, alerta externa y evidencia de coste $0; respetar la matriz aprobada y no crear lógica comercial nueva hasta cerrar los gates aplicables.
- PR #196 permanece independiente y Draft; PR #190/#193 e issue #53 no fueron modificadas por este trabajo.
- HEAD `25e7e1678b4b3c0f937b4c657f255c6453b95ead` tuvo 9/9 workflows en success (CI, Playwright E2E, migraciones PostgreSQL, Semgrep, Security, Secret history, Dependency Review, documentación y dashboard). ODD-09 quedó cerrado. Este checkpoint puede generar un commit documental posterior: revalidar el HEAD vivo y sus checks al retomar.
- Próximo paso: revisar diff completo, validar enlaces/documentación y obtener CI del HEAD exacto desde un entorno que dispare Actions; corregir errores y dejar PR #197 Draft. No instalar herramientas externas en este paso.

---

> No reiniciar el proyecto. Este handoff describe el último estado comprobado; verificar GitHub en vivo antes de actuar.

## Estándar frontend aprobado — 2026-11-01

- El propietario aprobó `docs/FRONTEND_DESIGN_STANDARD.md` como estándar transversal para UI/UX y frontend.
- Antes de diseñar o implementar vistas, leer ese documento y `.agents/skills/micro-app-stack-guidance/SKILL.md`.
- Objetivo de accesibilidad: WCAG 2.2 AA; AAA cuando sea viable. Revisar contraste, teclado, foco, responsive (375/768/1280 px), estados de carga/vacío/error/éxito y patrones POS.
- Aplicación gradual: nuevas funcionalidades y pantallas modificadas. No rehacer todo el frontend ni declarar conformidad de pantallas existentes sin auditoría.
- El cambio es documental: no altera runtime, dependencias, despliegues ni producción.

## Punto exacto de reanudación

- Repositorio: `BTF14/Micro-app`. `main` verificado: `7ff887328f25cffff69ccb9e89bbb1ba25200aea` (merge PR #191, 2026-11-01).
- **PR #190:** abierta como Draft, no fusionada; rama `feat/org-catalog-read-endpoint-20261101`, HEAD `42ed27fd9ce13223c6a2d1fd2a9359d3ec871345`, base `main` `88213507d088b82ea9231bbc72f49afade7ec99b`. Mantenerla independiente y no fusionar sin aprobación expresa.
- **PR #191:** fusionada el 2026-11-01. Merge commit y `main`: `7ff887328f25cffff69ccb9e89bbb1ba25200aea`. El estándar frontend está en `docs/FRONTEND_DESIGN_STANDARD.md` y se integra en `AGENTS.md`, el skill de stack, accesibilidad y colaboración.
- **PR #187 (merge `40244698e95d78122011019e456f3d8b392fb05c`):** corrige `docs/sdd/role-permission-decision-matrix.md` §2 (caja). La aprobación original (PR #182) había otorgado a Owner/Admin la facultad de cerrar/reabrir el turno de otro miembro ("cierre por supervisor"), lo cual contradice `docs/sdd/REGISTER_SHIFT_MODEL.md` §2/§4 (sin cierre por supervisor en la política base; reapertura bloqueada por trigger de PostgreSQL en la migración 0004 para todos los roles, incluido Owner — no solo una cuestión de permisos de aplicación). Corregido con filas de denegación explícita; cualquier excepción futura (p. ej. cierre forzado por soporte) requiere un diseño de permiso, motivo obligatorio y auditoría aprobados aparte por el propietario.
- **Auditoría de Seguridad Nivel 1 — realizada 2026-11-01** (branch protection, backups, Dependabot, cabeceras/CORS/bundle). Resultados volcados en `docs/SECURITY_ROADMAP.md` (sección "Nivel 1") y resumidos en `docs/CURRENT_STATE.md`. **Corrección de precisión (2026-11-01, misma sesión):** una versión anterior de este párrafo decía "todos los controles de Nivel 1 están implementados y verificados" y "Seguridad Nivel 1 completa" — eso era impreciso. Lo verificado con evidencia reproducible es: protección de `main` (en vivo), Dependabot (config + ver nota de alertas abajo) y cabeceras/CORS/bundle (en vivo). **Backups no está cerrado**: la restauración técnica y la prueba sintética con datos poblados pasaron, pero RPO/RTO no están medidos, no hay alerta externa fuera del resumen de GitHub Actions, y el coste $0 no está confirmado con evidencia (ver desglose completo en `docs/BACKUP_AND_RECOVERY.md` §6 y §8). No declarar Nivel 1 cerrado mientras ese punto siga abierto.
- **Dependabot — alertas revisadas por el propietario el 2026-11-01:** el propietario confirmó visualmente en `https://github.com/BTF14/Micro-app/security/dependabot` (filtro `is:open`): **0 alertas abiertas, 15 cerradas**. Esta IA no pudo leer `/repos/BTF14/Micro-app/dependabot/alerts` vía API (403 `Resource not accessible by integration`); el dato proviene de la captura de pantalla del propietario, no de una verificación automatizada propia. Tratar como evidencia válida pero de fuente manual, no reproducible por CI.
- **Punto "inventario" revisado y sin contradicción:** el documento externo que motivó esta auditoría flagueó una posible ambigüedad entre el alcance "sucursal" de Inventory en la matriz y que `products.stock_quantity` sigue siendo organizacional. Se revisó: la matriz ya aclaraba esto correctamente desde su aprobación original (sección "Límites que se mantienen vigentes"); no requirió corrección.
- **Issue #78 (CORS): CERRADA el 2026-10-31.** PR #181 añadió `.github/workflows/cors-verification.yml` (manual + semanal, runner con salida completa a internet, a diferencia de los sandboxes de IA de este proyecto, que confirmaron `403` en el `CONNECT` saliente tanto hacia el Worker como hacia Pages). PR #183 lo reforzó con aserciones explícitas de status HTTP/código de salida de `curl` y un tercer preflight pidiendo `Access-Control-Request-Headers: authorization,content-type`. PR #185 añadió `.github/workflows/frontend-bundle-verification.yml`, que descarga el bundle JS realmente publicado en Pages y confirma que contiene la URL de API canónica (no solo el código fuente versionado). Evidencia real en runs [41186202382](https://github.com/BTF14/Micro-app/actions/runs/41186202382), [41186391247](https://github.com/BTF14/Micro-app/actions/runs/41186391247), [41254331839](https://github.com/BTF14/Micro-app/actions/runs/41254331839) (CORS) y [41255425480](https://github.com/BTF14/Micro-app/actions/runs/41255425480) (bundle): todos `success`. Origen permitido recibe ACAO/ACAC/métodos/headers correctos; origen externo no recibe ACAO; el bundle publicado contiene `https://micro-app-api.btfcasheb.workers.dev`. Ambos workflows quedan como guardia de regresión semanal. **Pendiente real fuera de alcance de IA:** verificación autenticada del dashboard de Cloudflare, requiere al propietario.
- **Matriz de permisos por rol (`docs/sdd/role-permission-decision-matrix.md`): APROBADA el 2026-10-31, corregida el 2026-11-01** (PR #182, corrección en PR #187). El propietario decidió explícitamente ventas/descuentos, devoluciones/anulaciones y gestión de miembros/políticas; delegó explícitamente a criterio técnico catálogo/inventario, caja y reportes/auditoría. **No implementa nada**: cero endpoints comerciales, cero middleware de autorización en `apps/api/src`.
- Auditoría de callsites (2026-10-31, solo lectura): `resolveTenantContext`, `resolveBranchContext`, `resolveOpenCashierRegisterShift` son fail-closed y correctos en su SQL, pero no tienen ningún callsite de producción — solo los invocan sus propios archivos de test. No se encontró defecto que corregir.
- **Issue #53 sigue ABIERTA**: falta implementar los endpoints comerciales siguiendo la matriz aprobada, el middleware de autorización server-side, y pruebas automatizadas de aislamiento cross-tenant/rol en PostgreSQL desechable, antes de poder cerrarla.
- Arquitectura: `organization_members.role` es un rol único por miembro/organización; `branch_memberships` solo asigna acceso a sucursales, sin roles. Inventario organizacional; caja por turnos y apertura/cierre ordinario.

## Orden de trabajo

1. Diseñar e implementar los primeros endpoints comerciales (sugerido: empezar por lectura de catálogo/inventario, el caso más simple y de menor riesgo) siguiendo exactamente `docs/sdd/role-permission-decision-matrix.md` (ya corregida en su sección de caja), con middleware server-side que encadene `resolveTenantContext` → `resolveBranchContext` → `resolveOpenCashierRegisterShift` donde aplique, denegando por defecto.
2. Antes de fusionar cualquier endpoint comercial: pruebas automatizadas de aislamiento cross-tenant (organización A nunca lee/escribe datos de B, ni manipulando IDs) y de aislamiento de rol, con PostgreSQL desechable.
3. Registro de auditoría (Nivel 2, punto 7 de `docs/SECURITY_ROADMAP.md`) para acciones sensibles antes de considerar el gate de #53 completo.
4. Revisar periódicamente el workflow `cors-verification.yml` (corre solo automáticamente los lunes); si falla, es una regresión real de CORS, no un falso positivo de entorno.
5. No asumir que la aprobación documental de la matriz habilita por sí sola producción ni que sustituye las pruebas de aislamiento.
6. No bloqueante para #53, pero pendiente: medir RPO/RTO de backups, confirmar coste $0, decidir sobre alerta externa de backups, y que el propietario revise manualmente las alertas de Dependabot en GitHub.

## Restricciones no negociables

- Cloudflare Pages/Workers, Neon PostgreSQL. Presupuesto USD 0.
- No tocar Cloudflare producción, tráfico, deployments productivos, variables, secretos, DNS, billing, Neon main ni datos reales.
- PostgreSQL desechable primero; no ejecutar migraciones remotas.
- No reescribir historial Git ni entradas previas de `docs/STATE_JOURNAL.md`.
- No afirmar pruebas, revisiones, aprobaciones o verificaciones sin evidencia.
- No crear endpoints comerciales, middleware ni mapeos rol→operación que se aparten de la matriz ya aprobada sin una nueva decisión explícita del propietario.

## Prompt para el siguiente chat de ChatGPT

Continúa BTF14/Micro-app como responsable técnico senior. Lee `AGENTS.md`, este handoff, `docs/CURRENT_STATE.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, los registros de recursos/seguridad (incluida la sección "Nivel 1" de `docs/SECURITY_ROADMAP.md`, auditada el 2026-11-01) y los SDD de autorización/sucursales (incluida la matriz de permisos, aprobada y corregida). Verifica GitHub en vivo. `main` verificado: `c7bd0a198c30d190586aa6acd207d954f41ff7c9`. Issue #78 (CORS) está CERRADA con evidencia real reproducible (PRs #181/#183/#185, incluida verificación del bundle JS realmente publicado). La matriz de permisos de #53 está APROBADA y su sección de caja fue corregida en PR #187 (ya no permite cierre de turno por supervisor, consistente con `REGISTER_SHIFT_MODEL.md` y el trigger de la migración 0004). Seguridad Nivel 1: branch protection, Dependabot (0 alertas abiertas confirmadas por el propietario el 2026-11-01) y cabeceras/CORS/bundle están verificados con evidencia reproducible; **backups NO está cerrado** — faltan RPO/RTO medidos, alerta externa y confirmación de coste $0 (ver `docs/BACKUP_AND_RECOVERY.md` §6/§8). No declarar Nivel 1 completo mientras ese punto siga abierto. #53 sigue abierta: falta implementar endpoints comerciales con middleware de autorización y pruebas de aislamiento cross-tenant/rol, con PostgreSQL desechable — ese es el siguiente trabajo de fondo, con un alcance técnico propuesto pendiente de aprobación del propietario antes de escribir código. No tocar producción/Neon main/secretos/DNS/billing/datos reales. No te apartes de la matriz aprobada sin una nueva decisión explícita del propietario. Registrar solo hechos verificados y mantener STATE_JOURNAL append-only.

## Snapshot previo — retiro de rama heredada (histórico; no usar como estado actual)

## Actualización posterior — eliminación segura de rama heredada (2026-10-30 UTC)

- La rama original `fix/vercel-api-esm-imports` fue eliminada de GitHub mediante la sesión autenticada del propietario, después de comprobar que el respaldo `archive/legacy-api-esm-experiment-20261020` existía y apuntaba al mismo HEAD exacto: `b1330a5fa547071a5f500f0481ce88109c612f81` (compare devolvió `identical`, 0 ahead / 0 behind).
- Verificación posterior independiente: la búsqueda de ramas no devuelve `fix/vercel-api-esm-imports`; sí devuelve `archive/legacy-api-esm-experiment-20261020`. El respaldo conserva los tres commits. PR #72 permanece cerrada y no fusionada; no se borró ni modificó.
- Alcance de la operación: solo la referencia de rama original. No se modificaron otras ramas, tags, archivos, PRs, settings, deployments, integraciones, Cloudflare, Neon ni producción.
- No integrar el código archivado: es una rama ESM heredada, superada por main. El archive es evidencia/recuperación, no una línea de desarrollo activa.

## Handoff anterior (histórico; supersedido por el checkpoint y prompt superiores)

**Checkpoint verificado — 2026-10-30 UTC:** `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`, merge SHA de PR #177. PR #177 fusionada; no había PR abiertas al verificar. Cloudflare autenticado, solo lectura: Worker `micro-app-api` versión `49975c43` en Producción con 100% de tráfico asignado; Pages `micro-app` producción `main` en el mismo SHA. El dashboard de Pages muestra una lista vacía, pero `apps/web/.env.production` versionado define `VITE_API_BASE_URL` hacia el Worker y `vite.config.ts` la carga con `loadEnv`. La página pública contiene el enlace OAuth al Worker; no se pudo inspeccionar el bundle JS ni confirmar todas las llamadas API. CORS real sigue sin probarse. La matriz comercial continúa **NO APROBADA**.

**PR activa:** [#178](https://github.com/BTF14/Micro-app/pull/178) está abierta como draft en `docs/reconcile-role-model-and-cloudflare-20261030`. Continuar y revisar esa PR; no crear otra para el mismo alcance. Revalidar su HEAD y checks en vivo después de cada actualización.

**Auditoría de hosting alternativo — 2026-10-30:** el inventario completo del repositorio no encontró configuración, dependencias, scripts, CLI ni workflows de otro proveedor de hosting. La arquitectura vigente es Cloudflare Pages + Cloudflare Workers/Hono + Neon. Se limpiaron las referencias operativas obsoletas en CURRENT_STATE, HANDOFF, PROJECT_PLAN, CONSTITUTION, ARCHITECTURE_AND_ZERO_COST y RESOURCE_REGISTRY. El diario histórico se conserva append-only. `VITE_API_BASE_URL` se mantiene porque es una variable pública de Vite que apunta al Worker; no es específica del proveedor de hosting. Se encontró una rama heredada asociada a PR #72 (cerrada sin merge), con HEAD `b1330a5fa547071a5f500f0481ce88109c612f81`; ese SHA exacto se preservó en `archive/legacy-api-esm-experiment-20261020` y la comparación confirmó referencias idénticas (0 ahead / 0 behind). Tras autorización explícita del propietario, se eliminó únicamente `fix/vercel-api-esm-imports` desde la interfaz GitHub autenticada. La verificación posterior confirmó que la rama original ya no aparece, el archive permanece y PR #72 sigue cerrada y sin merge. Los tres commits continúan preservados en la rama archive.

## Lectura obligatoria
1. `AGENTS.md`.
2. `docs/CURRENT_STATE.md`.
3. `docs/HANDOFF_NEXT_CHAT.md`.
4. `docs/AI_COLLABORATION_AND_PR_POLICY.md`.
5. `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/COMPLIANCE_AND_ACCESSIBILITY.md`, `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`.
6. `docs/API_INTEGRATION.md`, `docs/sdd/role-permission-decision-matrix.md`, `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md`, `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`, `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`.
7. Verificar GitHub en vivo y leer las skills del proyecto aplicables antes de editar.

## Prompt de continuación anterior (HISTÓRICO — NO COPIAR; supersedido por el prompt superior)

Continúa el proyecto existente **BTF14/Micro-app** como responsable técnico senior. No reinicies el proyecto ni repitas trabajo completado. Lee `AGENTS.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/WORK_CHECKPOINT.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/API_INTEGRATION.md` y los SDD de permisos/sucursales. Sigue también la secuencia adicional de lectura de `AGENTS.md`. Verifica GitHub en vivo antes de cualquier cambio.

**Punto de reanudación GitHub:** repositorio `BTF14/Micro-app`; rama `docs/reconcile-role-model-and-cloudflare-20261030`; base conocida `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`. El último HEAD verificado antes del commit de sincronización documental fue `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`; ese commit mueve la punta. Resolver el HEAD real y consultar todos los checks del nuevo SHA, no reutilizar los 11/11 Actions ni las previews del padre. PR #178: https://github.com/BTF14/Micro-app/pull/178; último estado observado OPEN, DRAFT, NOT MERGED; no marcar Ready ni fusionar sin autorización explícita.

**Evidencia del SHA padre `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b`:** comparación 68 ahead / 0 behind; 13 archivos documentales; 11/11 Actions success (9 runs PR y 2 runs push); Cloudflare Pages y Workers previews success para el mismo SHA; 0 reviews formales y 0 threads inline. Los enlaces y run IDs están en la portada de `docs/CURRENT_STATE.md`. Branch protection no pudo confirmarse por 403 anterior.

**Revisión de los cinco hallazgos:** `VITE_API_BASE_URL` existe en `apps/web/.env.production` y `vite.config.ts` la carga mediante `loadEnv`; solo falta inspeccionar el valor efectivo en el bundle publicado. Los snapshots vivos se actualizaron con SHA/estado exactos y los anteriores quedan históricos. La rama `fix/vercel-api-esm-imports` fue eliminada y el SHA `b1330a5fa547071a5f500f0481ce88109c612f81` permanece preservado en `archive/legacy-api-esm-experiment-20261020`. Los checkpoints se alinearon con el estado real. La matriz se formula como permisos por operación/ámbito de recurso y no como roles por sucursal. Revalidar el diff completo del nuevo HEAD.

**Arquitectura y gates:** Cloudflare Pages, Cloudflare Workers + Hono, Neon PostgreSQL. Un único `organization_members.role` por miembro/organización; `branch_memberships` solo concede/revoca acceso a sucursales. Issue #53 sigue abierta y la matriz comercial **NO APROBADA**: no crear endpoints comerciales, middleware ni mapeos rol→operación antes de aprobación explícita. Inventario sigue organizacional; inventario por sucursal/almacén no está implementado. Caja conserva turnos y apertura/cierre ordinario; no introducir cierres de supervisor incompatibles.

**Issue #78 / CORS:** sigue **NO VERIFICADO**. Ambos OPTIONS reales contra `https://micro-app-api.btfcasheb.workers.dev/health`, con origins `https://micro-app-63i.pages.dev` y `https://attacker.example`, fallaron en este entorno con curl exit 6 (`Could not resolve host`); no se obtuvo status ni headers `Access-Control-*`. Repetir solo desde un entorno con conectividad real. Inspeccionar también el bundle JS publicado para confirmar el valor compilado de `VITE_API_BASE_URL`. No modificar configuración, variables, secretos ni despliegues.

**Restricciones permanentes:** no modificar Cloudflare, tráfico, deployments, variables, secretos, DNS, billing ni producción; no tocar Neon main ni datos reales; PostgreSQL desechable primero; presupuesto USD 0. No reescribir historial Git ni `STATE_JOURNAL.md`. No afirmar pruebas, reviews, aprobaciones o verificaciones sin evidencia. Cada commit requiere revisar los checks del SHA nuevo.

---
> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se conservan para trazabilidad y describen estados de su fecha. GitHub en vivo y el checkpoint superior prevalecen.


> **Archivo histórico — no usar como estado operativo.** Los handoffs y prompts anteriores se conservan para trazabilidad; pueden contener instrucciones, ramas, SHA o estados superados. Utilizar únicamente el prompt superior y verificar GitHub en vivo.



> **Archivo histórico — no usar como estado operativo.** Las entradas siguientes se preservan para trazabilidad y pueden contener SHA, prioridades o estados que eran correctos en su fecha. Para el estado actual, usar el checkpoint de arriba y verificar GitHub en vivo.


> **Estado post-merge PR #172 — 2026-10-30 UTC:** GitHub confirma PR #172 fusionada (merge SHA y HEAD de `main`: `a7fa51d059d35fc679b53de112689a19f37fe967`). HEAD de PR validado: `2301a33810067b99ed9b8bd4e74105e65beff701`. En ese HEAD: 12 check-runs; 11 success y `Cloudflare Pages` seguía `in_progress` en la última consulta. Los seis checks requeridos por protección de `main` estaban completed/success; cero checks fallidos. PR #172 era exclusivamente documental (7 archivos, 413 adiciones, 0 eliminaciones), mergeable y autorizada por el propietario tras revisión manual y CI. Reviews formales: 0; threads inline sin resolver: 0. Codex no completó por límite de uso; revisión independiente Claude/Codex queda pendiente y no se considera aprobada. La preview Cloudflare no es certificación de producción. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**. El merge no autoriza permisos comerciales, endpoints, middleware, migraciones ni cambios de producción. Issues #53 y #78 siguen abiertas.

> **Revisión pre-merge — 2026-10-30 UTC:** PR #172, HEAD previo `6ade1ed1daad8a50b34eb6fd33c5767255d3aa93`, base `main` en `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. GitHub reportó 12/12 check-runs completados con éxito; los seis checks requeridos por protección de `main` están incluidos y verdes. Diff documental: 7 archivos; sin runtime, esquema, migraciones, workflows, secretos, datos ni infraestructura. Revisión manual del alcance y del contenido realizada; no hay reviews formales ni threads inline. La revisión Codex no pudo completarse por límite de uso, por lo que **no se considera aprobada**. Se deja pendiente una revisión independiente por Claude o Codex cuando vuelva a estar disponible; esa revisión futura debe registrar hallazgos y correcciones, pero no invalida esta decisión de fusionar el cambio documental con revisión manual y CI verde. La matriz comercial sigue **NO APROBADA**; este merge no autoriza endpoints ni permisos comerciales. Consultar GitHub en vivo antes de cualquier acción posterior, porque el siguiente commit generará un HEAD nuevo y requerirá sus propios checks.

> **Snapshot de revisión GitHub — 2026-10-30 UTC:** `main` = `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Antes de esta sincronización, PR #172 estaba abierta y lista para revisión, con HEAD `785d4a912baf6787eafa6d2a7f51e37697f22de4`; en ese SHA se observaron 9/11 check-runs success y 2 in progress (`verify` y `Chromium authentication smoke tests`), sin fallos. No había reviews formales ni threads inline. **Este snapshot es histórico y no identifica el HEAD de la rama después de esta edición**: consultar siempre [PR #172](https://github.com/BTF14/Micro-app/pull/172) y los checks del SHA vivo antes de actuar. Pages/Workers son previews, no certificación de producción. Issues #53 y #78 abiertas; matriz comercial **NO APROBADA**. No se modificaron `main`, Neon main, datos reales, secretos, DNS, billing ni configuración de producción.
# Handoff operativo — continuar autorización server-side — 2026-10-30 UTC

> **Instrucción para el siguiente chat:** no reiniciar el proyecto ni repetir trabajo completado. Leer esta portada y el checkpoint; después consultar GitHub en vivo antes de escribir.

## Punto exacto de reanudación

- Repo: `BTF14/Micro-app`.
- Main conocido: `a6db2dcaf57e2a0bf1735eb282c3ac2256cd314c`. Consultar el ref vivo; no asumir que sigue igual.
- Último merge runtime: PR #169, `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`.
- PR #170 y #171: solo documentación/continuidad, fusionadas.
- PR activa: [#172 — server-side operation authorization architecture](https://github.com/BTF14/Micro-app/pull/172), abierta, no fusionada, base main. Rama `docs/operation-authorization-architecture-20261030`; consultar estado draft/ready y HEAD vivo.
- Último checkpoint previamente validado: `87de879b021cd4b68ce4267b138832279d4a043a` (12/12 checks success). Los commits documentales posteriores requieren validación propia; no reutilizar checks de un SHA anterior.
- Matriz `docs/sdd/role-permission-decision-matrix.md`: **NO APROBADA**. No asumir permisos desde los nombres owner/admin/cashier/inventory.
- Issues #53 y #78: abiertas al último chequeo previo; consultar estado actual.
- No hay handlers/endpoints comerciales. Los helpers de tenant, branch y turno no autorizan operaciones.
- Neon main no se tocó; no se aplicaron 0003/0004 remotamente. No cambiar secretos, DNS, billing, Cloudflare settings ni producción.

## Qué se hizo en esta continuación

1. Se revalidó `main` y PR #172 directamente en GitHub.
2. Se verificó el documento técnico contra el contrato tenant, resolvers de contexto, helper de turno, DB transaction helper y documentación API existente.
3. Se añadió `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md` con límites explícitos: autenticación ≠ tenant membership ≠ resource scope ≠ operación autorizada.
4. Se reforzó el texto para requerir revalidación de sesión dentro de la transacción y protección frente a revocaciones concurrentes/TOCTOU; no asumir columnas de versión que aún no existen.
5. Se abrió PR #172 como draft, no fusionada. No se tocó runtime, esquema, migraciones ni infraestructura.
6. En HEAD `87de879b021cd4b68ce4267b138832279d4a043a`, GitHub reportó 12/12 check-runs completed/success; corresponde a ese SHA histórico, no a commits posteriores.

## Orden recomendado desde aquí

1. Consultar `main`, PR #172, diff completo, reviews/threads y checks exactos del HEAD vivo.
2. Antes de fusionar, confirmar que el HEAD vivo tiene los seis checks requeridos verdes y que no hay feedback pendiente. La matriz comercial no queda aprobada por fusionar esta propuesta.
3. No programar permisos por rol hasta aprobación explícita de la matriz.
4. Cuando el propietario apruebe decisiones, cerrar catálogo de operaciones, scope por recurso y reglas sensibles.
5. Diseñar auditoría (evento, actor, scope, operación, motivo, aprobador, idempotency/correlation, retención/immutabilidad) sin afirmar que ya existe.
6. Diseñar autorización dentro de la misma transacción de cada mutación, con sesión/membresía/rol/assignment revalidados y locks/isolation definidos por invariantes.
7. Diseñar ledger de caja e inventario antes de ventas/pagos/ajustes/reversos.
8. Implementar una sola vertical slice, con pruebas PostgreSQL efímeras reales de handler, denegación sin side effects, cross-tenant/branch, revocación concurrente, rollback e idempotencia.

## Gates que no se deben saltar

- No inferir permisos comerciales de roles, sucursal asignada, turno abierto o configuración comercial.
- No habilitar descuentos, anulaciones, devoluciones, cambios de precio, cierres ajenos ni aprobaciones sin decisión explícita.
- No crear endpoints comerciales antes de autorización por operación y pruebas end-to-end.
- No aplicar 0003/0004 a Neon main ni ejecutar SQL en producción desde esta tarea.
- No declarar Cloudflare preview como producción validada.
- No afirmar que auditoría/ledger ya existen.
- No volver a repetir auditorías previas o reconstruir helper de turno ya fusionado.

## Archivos de continuidad a leer

`AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/API_INTEGRATION.md`, `docs/sdd/OPERATION_AUTHORIZATION_ARCHITECTURE.md` y `docs/sdd/role-permission-decision-matrix.md`.

---

# Handoff operativo — post PR #169 — 2026-10-30 UTC

## Punto de reanudación verificado

- Repositorio: `BTF14/Micro-app`.
- Último merge con cambios de runtime: PR #169, SHA `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 (`af08cd913a4e0e155b1b74183a71efc51e5d4646`) fue documental. Consultar el SHA vivo de `main` antes de cualquier cambio.
- PR #169 fusionada; head revisado `0c437509c0ad1a02b91c08d03d9dba62f0e9bd78`.
- PR #166–#170 fusionadas; #170 sincronizó el estado documental posterior a #169. No hay PR de código abierta.
- Post-merge en el SHA real de main: 7/7 workflows Actions success y Cloudflare Pages/Workers 2/2 success. CI confirma 7/7 tests del nuevo helper en PostgreSQL 18 desechable, además de build/typecheck y suites existentes.
- Reviews formales/threads GitHub: 0. Codex review agotó cuota; revisión manual fallback, no aprobación externa.
- Issues #53 y #78 siguen abiertos. No se modificaron.
- Migraciones 0001–0004 están en Git; 0003/0004 no aplicadas a Neon main.

## Lectura obligatoria antes de otro cambio

Seguir AGENTS.md y volver a leer: README, CURRENT_STATE, HANDOFF_NEXT_CHAT, WORK_CHECKPOINT, PROJECT_PLAN, STATE_JOURNAL, AI_COLLABORATION_AND_PR_POLICY, CONSTITUTION, DATABASE_SCHEMA, SCHEMA_REVIEW, SAAS_ARCHITECTURE_DECISIONS, SDD/MULTI_BRANCH_DATA_MODEL, SDD/REGISTER_SHIFT_MODEL, SDD/role-permission-decision-matrix.md y el skill PostgreSQL. Para mutaciones DB, leer BACKUP_AND_RECOVERY.

## Helper fusionado

- Archivo: `apps/api/src/cashier-open-shift.ts`.
- Función: `resolveOpenCashierRegisterShift(client, branchContext)`.
- El contexto debe proceder de `resolveBranchContext` tras `resolveTenantContext`; no construirlo desde request data.
- Exige role `cashier`; revalida org/branch/register/user/membership/role/assignment activos; filtra org/user/branch/open shift.
- Retorna null si no existe turno o el scope no es válido.
- `FOR SHARE OF s` mantiene el turno estable frente a cierre concurrente si el caller comparte la transacción. El helper no crea una transacción.
- Pruebas unitarias y 7 integraciones PG18 pasan. No hay endpoints comerciales ni permisos de operación implementados.

## Próximo trabajo

1. Obtener aprobación del propietario de la matriz de permisos por rol, organización y sucursal.
2. Diseñar autorización server-side por operación (incluidos actor, scope, permisos y auditoría) antes de crear handlers.
3. Solo después diseñar endpoints y pruebas transaccionales de ventas/pagos/inventario/caja.
4. Mantener pruebas PostgreSQL 18 desechables; no usar Neon main.

## Restricciones

- No endpoints comerciales antes de aprobación de permisos y diseño de autorización.
- No asumir que owner/admin pueden operar como cajero.
- No Neon main, migraciones remotas, datos reales, secretos, DNS, billing ni Cloudflare settings.
- Coste $0; no depender de Codex mientras su cuota esté agotada.
- No pedir autorización de merge de nuevo; fusionar PR futuras cuando todos los gates estén completos.

---

# Reanudación inmediata — 2026-10-30 UTC, post PR #161

**Leer primero:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md), [docs/CURRENT_STATE.md](CURRENT_STATE.md), [AGENTS.md](../AGENTS.md) y la política de colaboración.

- PR #160 y PR #161 están fusionadas. Merge #160: `be6f19486caf5cf3605c6ca6615f87e305822ea7`; merge #161: `c7abcb477afd649161176aad8cae707f5e42f632`.
- La sincronización de continuidad está integrada. No abrir otra PR solo para repetir estos checkpoints; a partir de ahora, actualizar checkpoint y journal dentro de la PR de trabajo que corresponda.
- Los 12 checks del HEAD PR #161 `a17a4b95312876f0bf4b201c6a84a323fb69fa3b` terminaron success. No equivalen a un run post-merge separado.
- Codex review falló por cuota; se realizó revisión manual fallback. Protección de rama no revalidada (HTTP 403).
- **Siguiente trabajo técnico:** cerrar arquitectura antes de endpoints comerciales. La matriz de permisos por rol/sucursal sigue sin aprobación explícita; no implementar permisos de negocio basados en la propuesta de IA.
- API: auth/health solamente; no hay handlers comerciales. `resolveTenantContext` valida sesión/membresía/organización, no permisos por operación ni sucursal y no está conectado a handlers.
- `auth_rate_limits` existe en DDL pero no tiene caller runtime.
- Esquema: stock por organización; faltan sucursales, almacenes, cajas/turnos; faltan reconciliación venta-líneas-pagos, idempotencia de pagos, consistencia stock-ledger, guard del último owner y auditoría append-only.
- `feat/neon-transaction-adapter` corresponde a PR #1 ya fusionada; rama 14 ahead/245 behind. No reabrir ni fusionar.
- No tocar Neon main, secretos, datos reales, billing, DNS ni producción. No ejecutar migraciones ni desplegar producción sin gates.

---

## Handoff histórico previo a PR #161


**Leer primero:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md), después [docs/CURRENT_STATE.md](CURRENT_STATE.md), [AGENTS.md](../AGENTS.md) y la política de colaboración.

- PR #160 está fusionada en `main`; merge commit `be6f19486caf5cf3605c6ca6615f87e305822ea7`. No reabrirla ni duplicar su trabajo.
- Los 12 checks del HEAD PR `fcb4269a459831be7858358c56e90346d5e4e9a6` terminaron en success. Esos checks cubren el HEAD de PR, no son una ejecución post-merge sobre el squash commit.
- Codex review no se completó por cuota. Se realizó revisión manual del diff y no quedaron hallazgos materiales.
- La protección de rama no se pudo revalidar por HTTP 403; no asumir que sigue configurada como en la lectura histórica del 26 oct.
- **Siguiente trabajo técnico:** completar diseño de arquitectura antes de handlers comerciales. La matriz de permisos por rol sigue sin aprobación explícita del propietario; no implementar permisos comerciales a partir de la propuesta de IA.
- Inventario verificado: API solo registra auth/health; no hay handlers comerciales. `resolveTenantContext` valida sesión/membresía/organización pero no permisos por operación ni sucursal y no aparece conectado a handlers. `auth_rate_limits` existe en DDL pero no tiene caller runtime.
- Esquema inicial: stock por organización; faltan sucursales, almacenes, cajas y turnos; faltan reconciliación venta-líneas-pagos, idempotencia propia de pagos, vínculo fuerte entre saldo y ledger, guard del último owner y política append-only de auditoría.
- La rama `feat/neon-transaction-adapter` pertenece a PR #1 ya fusionada; está 14 commits ahead/245 behind de main. No reabrir ni fusionar; el código vigente está en main.
- No tocar Neon main, secretos, datos reales, billing, DNS ni producción. No ejecutar migraciones ni desplegar producción sin superar los gates de AGENTS/CONSTITUTION.
- Documentar cada bloque significativo durante el trabajo; actualizar WORK_CHECKPOINT y STATE_JOURNAL antes de cambiar de área o cerrar el chat.

---

## Handoff histórico previo a la fusión de PR #160


**Leer primero:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md), después [docs/CURRENT_STATE.md](CURRENT_STATE.md).

- PR #160 está abierta, no draft, no fusionada. Último SHA verificado antes de esta actualización: `be9475d85e1739e3ea5fecabf69ac0104928fa98` (WORK_CHECKPOINT actualizado; CURRENT_STATE/HANDOFF/PROJECT_PLAN/STATE_JOURNAL pueden mover el HEAD después).
- En el HEAD previo `bcc667fc6ccd154b8e4f93f041e33d16c29195f0`, CI workflow `41002801690` estaba pending; siete workflows adicionales terminaron success. No declarar CI completo ni reutilizar resultados para un SHA posterior.
- Codex review agotó cuota en un SHA anterior. No es aprobación. No depender de Codex.
- **Siguiente paso inmediato:** consultar el HEAD vivo de PR #160, consultar workflows de ese SHA, completar revisión manual del diff final y mantener abierta la PR mientras cualquier check requerido esté pendiente/no verificado.
- **Después:** si todo pasa y no hay hallazgos materiales, fusionar #160 con squash, verificar main y registrar merge. La autorización general del propietario permite fusionar cuando se cumplan los gates.
- Continuar auditoría de arquitectura/API/esquema; revisar `feat/neon-transaction-adapter` sin merge ciego. Priorizar autorización por operación, aislamiento organización/sucursal, idempotencia, consistencia transaccional y rate limiting antes de endpoints comerciales.
- No modificar Neon main, secretos, datos reales, billing, DNS ni producción; no desplegar manualmente ni incurrir en costes.

---

# Reanudación inmediata — 2026-10-30 UTC

**Punto de entrada obligatorio:** [docs/WORK_CHECKPOINT.md](WORK_CHECKPOINT.md).

- PR activa: [#160](https://github.com/BTF14/Micro-app/pull/160), rama `docs/continuity-post-158-159-20261030`, abierta, no draft y no fusionada; HEAD verificado `0e6c27bac8a9ef1a9d80da109a136c34aec99a9a`, base `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; 14 commits y 8 archivos. Workflow runs y combined status devolvieron listas vacías para ese SHA: CI pendiente de verificación.
- La revisión automática de Codex quedó incompleta por cuota agotada; no tratarla como aprobación. Ver comentarios enlazados en WORK_CHECKPOINT.
- Se añadió a la misma PR la política de checkpoints incrementales en `docs/AI_COLLABORATION_AND_PR_POLICY.md` y se creó `docs/WORK_CHECKPOINT.md`. No abrir otra PR para este objetivo.
- **Primero:** verificar SHA actual y leer WORK_CHECKPOINT; completar sincronización de CURRENT_STATE/HANDOFF/STATE_JOURNAL; comprobar checks del SHA exacto; revisar manualmente el diff completo de PR #160.
- **Después:** continuar la prioridad técnica del estado vivo: cerrar auditoría de arquitectura/API/esquema y brechas P0; revisar `feat/neon-transaction-adapter` sin merge ciego; diseñar autorización por operación y aislamiento organización/sucursal antes de rutas comerciales.
- No repetir tareas ya verificadas ni afirmar pruebas que no se ejecutaron. No merge, producción, Neon main, secretos, DNS, billing ni cambios de infraestructura sin los gates/consentimientos aplicables.

---

# Estado vivo verificado — 2026-10-30 UTC

- **Fuente viva:** GitHub confirma `main` en `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`. PR #158 y #159 están fusionadas; PR #160 está abierta. La protección de rama de GitHub no se pudo confirmar por API y no debe afirmarse como verificada.
- **PR #158:** merge commit `3fba9870b69a7e1ef05cc20db6d19f3ee18df51d`; auditoría documental de Cloudflare/workflows/continuidad.
- **PR #159:** merge commit `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; fija Node.js `24.22.2` mediante `.node-version` y pnpm `10.34.9` mediante `packageManager`, con alineación en workflows.
- **Checks del SHA exacto de main:** 9/9 completed/success, incluidos Workers Build, Cloudflare Pages, Chromium smoke, verify, secret-history scan, postgres-migration, Trivy, generate-progress y static analysis. No extrapolar estos checks a commits futuros.
- **Producción observada tras merge:** Pages `https://micro-app-63i.pages.dev` cargó la pantalla de acceso; Worker `https://micro-app-api.btfcasheb.workers.dev/health` respondió HTTP 200 con `status=ok`, `service=micro-app-api`, `stage=scaffold`. Es una comprobación básica, no una certificación funcional/comercial.
- **Neon, lectura de metadatos:** proyecto `micro-app-db`, plan `free_v3`, PostgreSQL 18, región `aws-us-east-1`; periodo de consumo mostrado 2026-10-17 a 2026-11-01. Tamaño lógico de main: 32,866,304 bytes (~31.34 MiB). Consumo del periodo: 5,645,769 bytes transferencia; 5,911 segundos compute; 23,240 segundos activo; 0 bytes escritos reportados. Ramas: 3/10; main 32.87 MB, restore-test ~33.57 MB, integrity-test ~31.69 MB. Son metadatos/contadores del proveedor, no benchmark ni capacidad SaaS.
- **Seguridad Neon:** metadatos actuales muestran `main.protected=false`, `allowed_ips.ips=[]`, `protected_branches_only=false`, `block_public_connections=false`; ramas listadas sin protección. No cambiar estos ajustes sin evaluación/plan y autorización correspondiente. No se leyó SQL, secretos, roles ni datos.
- **Protocolo README:** PR #159 ya cambió toolchain de forma concreta y verificada; README debe reflejar Node/pnpm exactos. Este checkpoint actualiza el README y continuidad para no dejar instrucciones contradictorias.
- **Guardrails vigentes:** no SQL ni cambios en Neon main; no secretos, datos reales, billing, DNS ni ajustes Cloudflare; no merge/deploy de producción sin aceptación explícita. Objetivo $0. No depender de Codex.
- **Siguiente prioridad:** cerrar lectura documental de arquitectura/API/esquema e inventariar brechas P0; revisar rama `feat/neon-transaction-adapter` con diff completo antes de rescatar nada; después diseñar tenant/branch authorization y rate limiting antes de endpoints comerciales. No prometer número de organizaciones hasta pruebas sintéticas.
- **Nota histórica:** los bloques inferiores que digan #158/#159 “abiertas”, “draft” o “no mergeadas” son históricos y quedan supersedidos por este estado vivo y por GitHub.

---

## Instrucción de continuidad para la siguiente IA

Continúa Micro app desde el estado vivo de este documento, no desde los snapshots históricos inferiores. Primero vuelve a verificar main, PRs y checks exactos. Lee `AGENTS.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CONSTITUTION.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/CAPACITY_AND_LIMITS.md`, `docs/SAAS_ARCHITECTURE_DECISIONS.md` y `docs/SCHEMA_REVIEW.md`. Sigue el orden de inicio de AGENTS.md y el protocolo README. No dependas de Codex. No crees PRs de relleno. No toques Neon main, secretos, datos reales, billing, DNS ni producción. Haz auditoría estática y pruebas aisladas; distingue implementado, probado, desplegado y pendiente. Revisa `feat/neon-transaction-adapter` sin merge ciego. Antes de habilitar rutas comerciales, resuelve autorización por operación, aislamiento organización/sucursal, abuso/rate limiting y consistencia transaccional. Documenta SHA, comandos, checks y limitaciones. README solo se actualiza para avances concretos verificados.

---

# Checkpoint continuidad — 2026-10-30 UTC (Node/pnpm corregidos en PR #159)

- **PR #158** (documentación Cloudflare/CI): https://github.com/BTF14/Micro-app/pull/158. Rama docs/workflow-deployment-audit-20261030; abierta, draft, no mergeada. HEAD conocido antes de este checkpoint: 162765fac25bf3aa623a41676d56e570afabd7fd; 12/12 checks success.
- **PR #159** (pinning de toolchain): https://github.com/BTF14/Micro-app/pull/159. Rama fix/cloudflare-node-pnpm-pinning-20261030; abierta, draft, no mergeada. HEAD 57de704c03fffebfd9aee2ae91c05a0e3af7515a; 13/13 checks success.
- PR #159 añade .node-version = 24.22.2, packageManager = pnpm@10.34.9 y alinea node-version-file/pnpm exactos en CI, Playwright, AutoSkills preview, Daily Dependency Watch y Regenerate Lockfile.
- Cloudflare Pages build log del SHA 57de704 confirmó Node 24.22.2 + pnpm 10.34.9, build exitoso, sin Unsupported Engine warning; preview https://70046713.micro-app-63i.pages.dev. No se fusionó ni se desplegó producción.
- Mantener PRs separadas: #158 solo docs; #159 solo toolchain/workflows. No fusionar ninguna sin autorización explícita porque push/merge a main activa despliegues externos.
- No cambiar Cloudflare settings, Neon main, secretos, DNS, billing, datos reales ni producción. Objetivo USD 0. Sin Codex.

---

# Checkpoint final — 2026-10-30 UTC (PR #158 HEAD 5b1b573)

- **PR #158:** abierta, draft, no fusionada; base main = 1ee1808af4aae484a71dc24750237ff4f4d934a0.
- **HEAD actual:** 5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766; cinco archivos de documentación, cinco commits, sin cambios de aplicación/workflows/migraciones.
- **Checks del SHA exacto:** 12/12 success (GitHub Actions y Cloudflare). Cloudflare Pages preview: https://d8477e48.micro-app-63i.pages.dev. Workers preview: https://2935f95a-micro-app-api.btfcasheb.workers.dev. Son previews, no producción.
- **Pages Settings:** main producción; root vacío; build corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build; output apps/web/dist; build system v3; cache off; monitoring *; preview público por defecto; sin dominio custom. Detalles completos en docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- **Preview isolation:** verificado en código main: API base vacía, llamadas API bloqueadas, login deshabilitado, CSP sin API en previews; _headers define CSP/seguridad para producción. Mantener pruebas de regresión.
- **Pendientes:** revisar build logs para versión efectiva Node/pnpm; evaluar pin pnpm, build cache y semántica “Fail open” sin cambiar ahora; verificar headers HTTP efectivos; revisar cuota Pages; confirmar required checks/branch protection (no confirmado).
- **Guardrails:** no merge/deploy sin permiso explícito; no tocar Cloudflare settings, Neon main, secretos, datos reales, billing ni DNS. Objetivo USD 0. No Codex.

---

## Checkpoint Pages Settings — 2026-10-30 UTC

- TinyFish accedió a Settings de Pages `micro-app`, solo lectura. Production branch `main`; root directory vacío; build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; output `apps/web/dist`; build system v3; cache off; monitoring routes `*`; automatic deploys on; no deploy hooks; build comments on; preview access public by default; no custom domains; vars names only: `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL`.
- Compatibility date `2026-10-17`; flags panel mostró True; Functions setting mostró `Fail open` (no interpretar/cambiar sin confirmar).
- Repo main confirma monorepo pnpm `apps/*`; root package requiere Node `>=24.22.2 <25` pero no fija `packageManager`. Pendiente verificar Node/pnpm efectivos en build logs; evaluar pinning en PR separada.
- Build command compila web vía `apps/web/package.json` script `tsc -b && vite build && node scripts/postbuild.mjs`; API se valida en workflows separados.
- `apps/web/public/_headers` existe: nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP. CSP prod permite API Worker. Postbuild quita Worker de CSP en preview; Vite deja API base vacía y activa preview flag; auth.ts bloquea API y App.tsx deshabilita login y muestra aviso. Preview público por defecto, pero aislamiento API está implementado en main auditada. Mantener tests de regresión.
- `_redirects` no existe en `apps/web/public/`; UI no mostró configuración de redirects/headers.
- Cache deshabilitado puede consumir más build time; medir antes de cambiar. Pages usage/billing no consultados.
- Sin cambios en configuración/infra/secretos/builds/producción. PR #158 sigue draft y no fusionada.

# Handoff prioritario — 2026-10-30 UTC (Pages audit y continuidad)

- Repo `BTF14/Micro-app`; PR #158 abierta/draft: https://github.com/BTF14/Micro-app/pull/158. Rama `docs/workflow-deployment-audit-20261030`. No mergear.
- Corregir auditoría CI: duplicación general potencial solo `secret-history-scan.yml` (push ** todas las ramas) y `security-scan.yml` (push sin filtro). Los demás workflows restringen ramas/paths o son manuales/programados. Ver `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`.
- Cloudflare Workers Free $0: 100k req/día, 10ms CPU/req, 3.000 build minutes/mes, 100 Workers, 5 Cron triggers. Worker `micro-app-api`: main producción; docs branches previews. PR #158 preview Worker successful.
- Cloudflare Pages `micro-app`: producción branch `main`, auto deploy push main. Último deploy prod observado activo: commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, URL `https://06553c7b.micro-app-63i.pages.dev`; primary `https://micro-app-63i.pages.dev`. PR #158 commit `79be208` preview successful `https://945ae93c.micro-app-63i.pages.dev`; `d3f056b` preview `https://70fea194.micro-app-63i.pages.dev`. No confundir previews con producción.
- Pages mostró 15 deployments recientes (1 prod + 14 previews), 1.100 total en historial; todos los 15 visibles success. No implica historial completo sin fallos.
- Settings de Pages no cargó: build command, output dir, root dir, framework, env, Functions, redirects, headers y uso/cuotas no disponibles. No inventar.
- No custom domain visible. Push/merge a main despliega producción. Merge y deploy separados; no autorizar deploy por inferencia.
- Rulesets API vacío, legacy branch protection 403; protección/contextos requeridos no confirmados.
- Sin Codex; no Neon main/SQL remoto; no secretos/datos reales; no billing/upgrade; no cambios Cloudflare/DNS/tráfico. Objetivo $0. Capacidad multi-tenant no medida.

## Próximos pasos
1. Completar Settings Pages read-only.
2. Confirmar required checks y evaluar los dos triggers push amplios.
3. Revisar PR #158 diff/checks SHA exacto, mantener draft.
4. Continuar arquitectura y pruebas sintéticas aisladas.

---

# Handoff prioritario — 2026-10-30 UTC (Cloudflare y corrección de auditoría CI/CD)

> Continuar el mismo proyecto. Este checkpoint corrige explícitamente una conclusión equivocada de la auditoría anterior.

- **Repositorio:** `BTF14/Micro-app`.
- **PR #158:** https://github.com/BTF14/Micro-app/pull/158 — abierta, draft, documental; mantener sin merge hasta autorización explícita de producción.
- **Rama PR:** `docs/workflow-deployment-audit-20261030`. HEAD observado antes de actualizar: `d3f056b780ddad62deb5c1e1c0f1679bba19bb50`; base `main` = `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- **Corrección CI:** no son siete workflows sin filtros. Solo `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro) tienen potencial duplicación general con PR. CI/Playwright/Semgrep restringen push a main; migration-check y project-progress usan ramas explícitas; otros workflows tienen filtros paths/branch. Leer siempre `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`.
- **Cloudflare Workers Free:** $0/mes; cuotas observadas: 100k requests/día, 10 ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 cron triggers. Snapshot: 183 requests, 0 errores, 106,68 build minutes últimas 24 h; Worker view también 85 invocaciones y P90 CPU 10 ms. No usar esto como benchmark.
- **Worker:** `micro-app-api` en workers.dev. `main` es producción observada; ramas docs son previews. PR #158 obtuvo previews exitosos de Worker y Pages confirmados por comentarios automáticos de Cloudflare; no producción.
- **Pages:** proyecto `micro-app`, URL `https://micro-app-63i.pages.dev/`; conectado a BTF14/Micro-app. Preview de PR #158 successful. Historial de versiones productivas, build settings y consumo Pages todavía no extraídos.
- **Logs/Traces:** aparecían desactivados; evaluar seguridad/coste antes de activarlos.
- **No confirmados:** usage restante, billing detallado, Pages deployment history/production branch, branch protection y contexts requeridos (rulesets vacío; legacy endpoint 403).
- **No Codex. No Neon main ni SQL remoto. No secretos ni datos reales. No pagos. No tocar Cloudflare/DNS/tráfico. No merge ni deploy sin permiso explícito. Producción no lista y capacidad SaaS no medida.**

## Secuencia de continuación
1. Completar Pages read-only: producción branch, root/build command, previews, versiones y Analytics/usage.
2. Confirmar checks requeridos en GitHub si la conexión permite leer branch protection; no asumir ausencia por 403.
3. Proponer optimización focalizada de los dos workflows con push amplio, solo si preserva los checks requeridos.
4. Actualizar PR #158 y ejecutar revisión manual de diff/checks exactos. Mantener draft.
5. Seguir con arquitectura org → branch → warehouse/register/shift, autorización, integridad transaccional y pruebas aisladas.

---

# Handoff prioritario — 2026-10-30 UTC (post PR #157)

> Este bloque prevalece sobre notas inferiores. Continuar el mismo proyecto y verificar el estado vivo antes de actuar.

- **Repositorio:** `BTF14/Micro-app`; **main:** `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- **PR #157:** cerrada y fusionada. Merge SHA = main. HEAD `6eb464c950f195ec67350977575aef77e9790e1d`; ocho workflow runs recuperados para ese HEAD y los ocho success. No hay evidencia recuperada de CI post-merge; no afirmar que existió.
- **PRs abierta:** [PR #158](https://github.com/BTF14/Micro-app/pull/158), documental y en borrador. No fusionar.
- **Auditoría:** leer [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No hay deploy de Cloudflare en GitHub Actions; los builds históricos de Pages/Workers parecen provenir de Git integration externa. No se puede inspeccionar el dashboard con las conexiones disponibles.
- **Peligro de merge:** push a `main` puede activar producción por integración externa. No fusionar sin autorización explícita de producción, aunque el cambio sea documental.
- **CI:** siete workflows usan ambos eventos `push` y `pull_request` sin filtros; un commit a rama con PR puede duplicar validaciones. `sdd-docs-validation` sí limita ramas y paths. Primero revisar branch protection/rulesets, luego proponer una sola optimización coherente.
- **Producto:** API auth/health únicamente; sin endpoints comerciales; tenant context no autoriza operaciones ni branch scope; esquema sin sucursales/almacenes/cajas/turnos; matriz de permisos NO aprobada; capacidad sin medir.
- **Restricciones:** no depender de Codex; no tocar Neon `main`, secretos, datos reales ni producción; no ejecutar SQL remoto; no activar servicios pagos; objetivo USD 0.

## Secuencia

1. Revisar branch protection/rulesets y los contexts obligatorios en GitHub.
2. Verificar en Cloudflare, solo lectura, Git integration, ramas de deploy, build settings y estado real de Pages/Workers.
3. Reducir duplicación CI sin eliminar checks requeridos ni aplicar paths filters sin mapa de dependencias.
4. Continuar inventario de queries/callers y ERD multi-sucursal.
5. Preparar decisiones de roles sensibles para aprobación del propietario; no implementarlas por inferencia.
6. Mantener CURRENT_STATE, PROJECT_PLAN, STATE_JOURNAL, README y este handoff alineados.

---

# Handoff prioritario — 2026-10-30 UTC

> Fuente de verdad: repositorio `BTF14/Micro-app`. Leer primero `AGENTS.md`, `docs/CURRENT_STATE.md` y `docs/AI_COLLABORATION_AND_PR_POLICY.md`. No depender de Codex: está fuera de disponibilidad por tiempo indefinido y el trabajo debe continuar con revisión manual, tests y GitHub Actions.

- **Main:** `18961456ac535146c4a1687d3b07d8f6693ce141`, merge de PR #156.
- **PR #156:** cerrada y fusionada. HEAD de PR `6c068f3e9734736ac26e51ff754e39915d660abe`; 9/9 workflows success en ese SHA. No hubo review formal ni threads; diff revisado manualmente. No se comprobó un nuevo workflow post-merge del merge SHA.
- **PRs abiertas al último chequeo:** ninguna. Volver a consultar en vivo.
- **PR #157 abierta:** `docs/post-pr156-audit-continuity-20261030`; consolida CURRENT_STATE, HANDOFF, PROJECT_PLAN, STATE_JOURNAL, SCHEMA_REVIEW, DATABASE_SCHEMA, API_INTEGRATION, SECURITY_ROADMAP y la matriz de roles. Comprobar el SHA vivo, revisar diff y exigir todos los checks obligatorios antes de fusionar.
- **API:** rutas existentes: auth register/login (ambas fail-closed), me/logout, Google OAuth GET/POST bootstrap/callback, y health. No existen endpoints comerciales HTTP.
- **Tenant context:** valida sesión/membresía/organización activas, pero no aplica autorización por operación ni sucursal; la búsqueda de callsites no encontró handlers que invoquen el helper. `withDatabaseTransaction` solo tiene uso actual en el bootstrap Google, no en operaciones comerciales.
- **Esquema actual:** organización/membresía y entidades comerciales iniciales con FK tenant-scoped; no hay sucursales, almacenes, cajas/turnos, compras/recepciones, devoluciones ni transferencias. Stock por organización. La migración inicial no está aplicada a Neon main.
- **Hallazgos SQL pendientes:** reconciliación venta-líneas-pagos; consistencia stock-ledger; referencias polimórficas de movimientos; idempotencia de pagos; regla del último owner; índices y consultas a validar con datos sintéticos.
- **Matriz de roles:** sigue NO aprobada. Cajero/inventario no deben obtener acceso global; requieren asignación de sucursal, y caja/turno para operaciones de caja. La gestión de allowlist es privilegio de plataforma separado de `owner/admin` de tenant; falta definir identidad/recuperación del operador.
- **Rate limiting:** `auth_rate_limits` solo existe en el DDL; no se encontraron funciones ni callers en runtime. Verificar si Cloudflare aplica límites de cuenta y diseñar control distribuido antes de ampliar acceso OAuth/bootstrap.
- **Capacidad SaaS:** sin medir; no prometer empresas/locales concurrentes. Objetivo de coste USD 0.
- **No usar Codex, no esperar a Codex.** Revisión manual del diff completo + pruebas + workflows; si una herramienta de IA revisora no está disponible, documentar limitación sin convertirla en bloqueo artificial.
- **No producción, no Neon main, no secretos, no datos reales, no billing.**

## Secuencia de continuación

1. Verificar rama principal, PRs abiertas, PR #156 fusionada y workflows del SHA actual.
2. Completar el inventario de queries SQL y el mapa de llamadas de auth/tenant; agregar rutas y tests concretos al contrato de autorización.
3. Completar ERD organizacional y operacional sin ejecutar migraciones.
4. Preparar decisión de roles y permisos sensibles para aprobación del propietario; no inferir porcentajes ni excepciones.
5. Diseñar esquema v2 y migraciones solo después del ERD; probar desde base vacía y upgrade en PostgreSQL desechable.
6. Diseñar pruebas negativas cross-tenant/cross-branch, transacción, idempotencia y concurrencia.
7. No reabrir `feat/neon-transaction-adapter`: su PR #1 ya se fusionó el 2026-10-17 (merge `b6511d0876e33096f75df2466653449165888821`); la rama está divergida (14 ahead/242 behind). La tarea correcta es revisar la implementación vigente en main y sus callsites, no fusionar la rama histórica.
8. Actualizar README solo tras avances concretos verificados y mantener CURRENT_STATE, PROJECT_PLAN, STATE_JOURNAL y este handoff al día.

## Prompt de continuidad

Continúa el trabajo existente de `BTF14/Micro-app`, no crees un proyecto nuevo. Lee los documentos obligatorios de `AGENTS.md` y verifica GitHub en vivo. No uses ni dependas de Codex. La PR #156 ya está fusionada en main con merge SHA `18961456ac535146c4a1687d3b07d8f6693ce141`; su SHA de PR `6c068f3e9734736ac26e51ff754e39915d660abe` tuvo 9/9 workflows success. Continúa desde el inventario de API/schema/queries y los hallazgos de integridad descritos en CURRENT_STATE y SCHEMA_REVIEW. Trabaja con ramas y una PR coherente, revisa manualmente el diff, exige checks del SHA exacto y documenta todo. No despliegues producción, no toques Neon main, secretos, datos reales ni recursos pagos. No implementes endpoints comerciales ni migraciones hasta cerrar ERD, matriz de permisos y pruebas de aislamiento. Mantén el coste objetivo USD 0.

---

# Handoff prioritario — 2026-10-30

> Leer AGENTS.md, CURRENT_STATE.md y AI_COLLABORATION_AND_PR_POLICY.md. Verificar el estado vivo de GitHub antes de actuar.

- Reutilizar PR [#156](https://github.com/BTF14/Micro-app/pull/156), rama `docs/reconcile-main-after-pr155-20261029`; no abrir otra PR documental.
- Último bloque: README, AGENTS, política, Constitución y SCHEMA_REVIEW reconciliados con el estado actual de auth. Cambios solo documentales.
- Google OAuth + allowlist/bootstrap seguro, state/PKCE, sesión HttpOnly revocable y validación Google `email_verified` implementados según PR #153/#155. Login/registro por contraseña disabled/fail-closed. MFA, recuperación de cuenta/administrativa y limpieza automática de sesiones pendientes.
- API actual sin endpoints comerciales HTTP; solo identidad y health. Sucursales/almacenes/cajas/turnos no están modelados en esquema. SaaS multi-org/multi-sucursal es dirección documentada, no producto implementado.
- Capacidad no medida. Verificar límites de Neon y Cloudflare, hacer pruebas sintéticas y mantener USD 0; no prometer número de empresas/locales.
- README debe actualizarse al cerrar avances concretos y verificados, nunca para presentar propuestas como funcionalidades.
- No producción, secretos, datos reales ni Neon main.

## Próximas acciones
1. Consultar SHA actual de la rama/PR #156, base, estado, diff y workflows exactos.
2. Revisar README contra `apps/api/src/index.ts`, `google-auth.ts`, `auth.ts`, `tenant-context.ts` y `docs/API_INTEGRATION.md`.
3. Obtener revisión independiente solicitada; no autoaprobar ni fusionar.
4. Seguir auditoría read-only de rutas/esquema/constraints/índices/queries; preparar ERD org→sucursal→almacén/caja/turno y reconciliar matriz de permisos. No migraciones/endpoints comerciales antes de gates.

---

# Handoff prioritario — 2026-10-29

> Leer primero este bloque y `AGENTS.md`. Después seguir la política y los documentos canónicos. Las secciones históricas inferiores son contexto, no estado vivo.

- Repo único: `BTF14/Micro-app`; PR documental en curso [#156](https://github.com/BTF14/Micro-app/pull/156); rama `docs/reconcile-main-after-pr155-20261029`.
- PR #156 se debe reutilizar para integrar decisiones de arquitectura y continuidad; no abrir una segunda PR documental solapada.
- Última consulta: PR #156 abierta/mergeable; base `main` SHA `5a9bdc5a18a54c3c68639f52125d913d4e725b91`; 9 archivos modificados; sin reviews ni review threads. El HEAD cambia al actualizar documentos: consultar siempre el SHA vivo. En HEAD observado `a5aced77ffd1a628bb8175b91cbc7305144fb696` se dispararon 8 workflows (1 success, 4 pending/in_progress, 3 queued); esperar y verificar los resultados del HEAD más reciente en GitHub Actions antes de solicitar merge.
- Leer `docs/SAAS_ARCHITECTURE_DECISIONS.md` antes de proponer esquema, API comercial, BCV, búsqueda, caché, roles o cuotas.
- Decisión arquitectónica de dirección: una plataforma multi-organización, multi-sucursal y multiusuario; catálogo compartido por organización, stock por sucursal/almacén, caja/turno por sucursal.
- BCV y buscador siguen NO implementados. Fuente BCV aún debe investigarse; no inventar API. Búsqueda SQL indexada primero; caché de catálogo solo después de medir. KV nunca autoriza ni confirma una venta.
- La matriz de roles sigue pendiente de aprobación y debe reconciliarse con alcance de sucursal/caja. No implementar permisos comerciales basándose en celdas no aprobadas.
- No hay modelo de sucursales/almacenes/cajas ni rutas comerciales HTTP verificadas; stock actual es por organización.
- Capacidad SaaS sin medir. Revisar límites de Neon, Workers, Pages, KV y transferencia; pruebas sintéticas solamente. Presupuesto $0.
- No producción, secretos, datos reales ni Neon `main`. Producción NO lista.

- **Verificación de CI más reciente completa:** HEAD `8c15e13fa001a14a0ddf9f2432bc17efb30d476d` tuvo los 8 workflows requeridos en `success`, incluidos los seis contexts de protección (`verify`, `postgres-migration`, Chromium authentication smoke tests, JavaScript/TypeScript static analysis, Trivy y secret-history scan), además de Dependency Review y dashboard. Runs: 40978525543, 40978521649, 40978521865, 40978521671, 40978521571, 40978521386, 40978521350 y 40978521537. Después se añadieron dos commits documentales hasta `23cbb313ebb163d3c808f8d0953b85645262c520`; no se devolvieron runs/statuses para ese HEAD. Por tanto, **no declarar verde el HEAD actual** ni fusionar hasta verificarlo.

## Pasos para el siguiente agente

1. Confirmar branch HEAD, main SHA, estado PR #156, reviews, threads y checks exactos.
2. Revisar el diff de PR #156 completo; corregir errores documentales y esperar revisión adicional antes de merge.
3. Continuar auditoría read-only de esquema/rutas/constraints/índices/queries, y registrar evidencias.
4. Preparar ERD y matriz de propiedad/scope de organización-sucursal-almacén-caja.
5. Cerrar decisiones de roles y operaciones sensibles con aprobación explícita.
6. Diseñar API y transacciones de catálogo/inventario/compra/caja/venta/devolución, con idempotencia y pruebas negativas.
7. Investigar proveedor BCV, fuente/fecha/frescura/fallback; implementar después de validar fiabilidad y condiciones.
8. Medir capacidad antes de definir límites comerciales.

## Continuidad prioritaria — hardening de FRONTEND_ORIGIN (2026-10-29 UTC)

- Main base verificada: `0ba45e47daa5af9bbd9034690443405aa8bedf44`.
- PR #154: abierta, sin reviews; ocho workflows consultados para su SHA exacto terminaron success. Codex review falló por cuota; no existe review independiente. Respetar el gate de revisión y no fusionar.
- Rama de trabajo nueva: `fix/google-auth-frontend-origin-https-20261029`; objetivo único: alinear validación de `FRONTEND_ORIGIN` en `google-auth.ts` con `index.ts` (HTTPS salvo loopback HTTP), y añadir pruebas negativas.
- Diff revisado manualmente. En SHA `18cf2f158552ce7c97bacc66018e0cfdae60e2d3`, los 8 workflows consultados terminaron `success`, incluidos CI (build/typecheck, unit tests, PostgreSQL auth integration) y Playwright E2E. PR #155 sigue abierta; no declarar corregido en main hasta merge autorizado y verificado.
- No tocar Neon `main`, secretos, datos reales, esquema/migraciones ni producción. Previews de Cloudflare son automáticos y no son producción.
- Tras cerrar este hardening, continuar auditoría de arquitectura multiempresa y preparar propuesta de sucursales. No implementar endpoints comerciales ni permisos hasta aprobación de la matriz de roles.
- La capacidad sostenible de tenants no está medida; revisar todos los límites Neon/Cloudflare y probar en entorno sintético antes de prometer cantidades.

---

## CONTINUIDAD VIVA — después de PR #152 (2026-10-29 UTC)

- PR [#152](https://github.com/BTF14/Micro-app/pull/152) fusionada en `main`, merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`. Los 13 checks del HEAD de PR y los nueve checks post-merge observados terminaron en `success`.
- Rama activa para la siguiente corrección: `fix/bootstrap-token-post-body-20261029`. Objetivo único: dejar de aceptar `bootstrap_token` por URL, exigir POST con cuerpo, Origin exacto del frontend configurado, campos únicos/permitidos y límite de 2 KiB; pruebas de regresión incluidas.
- No considerar el riesgo mitigado hasta comprobar CI del SHA final, revisar diff y fusionar por el proceso protegido. No autoaprobar ni saltar reglas.
- No producción, secretos ni Neon `main`; no ejecutar migraciones ni borrar ramas/backups.
- Luego retomar auditoría de consultas/constraints, contrato organización → sucursal → membresía/rol y matriz de permisos aún pendiente de aprobación.

---

## ESTADO OPERATIVO VIGENTE — respaldo cifrado (2026-10-29 UTC)

> Esta sección prevalece sobre notas históricas inferiores que todavía digan que el incidente de subida está pendiente. No borrar el historial: interpretar cada incidente según la evidencia posterior.

- **Subida del backup: VERIFICADA.** Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) terminó en success: `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, commit remoto `2b038bd`, push a la rama `main` del repositorio privado de backups y retención `deleted 0 file(s)`.
- **Par cifrado persistido según logs:** `daily/backup-2026-10-29T17-29-48Z.dump.age` y `.sha256`.
- **Restauración técnica real: VERIFICADA** en run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124), tras checksum, descifrado y restauración en PostgreSQL 18 efímero. La prueba sintética automatizada es complementaria.
- Siguen pendientes la validación de datos comerciales poblados/conteos/relaciones, medición de RPO/RTO, alerta de fallo y evidencia del coste total $0.
- PR [#148](https://github.com/BTF14/Micro-app/pull/148) quedó fusionada el 2026-10-29; merge commit `0681aea75b555d5eb0b60dfec26c2706207fae45`. No está abierta y no debe reabrirse para este trabajo.
- **Plan de arquitectura:** [docs/ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md). La restauración técnica está cerrada; continuar la auditoría de solo lectura de esquema, autorización, sucursales y capacidad antes de proponer cambios de código o migraciones.
- **Base de código auditada antes de esta actualización documental:** `70984baf7f6ac5a442e6c2364aaf6d7d4ebbc7d4`; PR [#151](https://github.com/BTF14/Micro-app/pull/151) está fusionada. No había PR abiertas en la consulta posterior; comprobar de nuevo antes de crear otra.
- **Capacidad:** sin medir; el proyecto Neon conectado informa `free_v3`, 10 ramas máximas y 3 existentes, incluido `restore-test-20261028`; límite lógico reportado de 512 MiB por rama y compute predeterminado 0.25 CU. El límite de empresas/sucursales sigue sin medir y Cloudflare no está verificado en vivo. Ver `docs/CAPACITY_AND_LIMITS.md`. La API expone autenticación y `GET /health`, sin endpoints comerciales HTTP aún. No se encontró tabla de sucursales en la migración inicial.
- **Seguridad a revisar:** `apps/api/src/google-auth.ts` recibe `bootstrap_token` en la URL. Es un riesgo potencial de exposición, no una filtración confirmada; revisar mitigación con POST/cuerpo y pruebas antes de cambiar el flujo.
- **Producción: NO lista.** Faltan handlers comerciales, matriz aprobada de permisos, autorización cross-tenant real, idempotencia/concurrencia, pruebas E2E, BCV/fiscalidad y validación completa de recuperación.
- Límites vigentes: no desplegar producción, no acceder a Neon `main`, no pedir ni imprimir claves privadas age, no borrar backups/recursos, y no declarar coste $0 sin evidencia.

> Estado prioritario de continuidad: la restauración técnica ya pasó y las PR #150/#151 están fusionadas. Las notas históricas posteriores se conservan, pero cualquier afirmación anterior de restauración pendiente o PR abierta está superada por este encabezado y por `docs/CURRENT_STATE.md`. No borrar el historial.

---

## REGLA PERMANENTE PARA EL SIGUIENTE CHAT — capacidad y límites (2026-10-29 UTC)

Antes de declarar listo para producción o aceptar un número de empresas, leer `docs/CAPACITY_AND_LIMITS.md` y `docs/ARCHITECTURE_EVOLUTION_PLAN.md`. El límite de organizaciones/sucursales está **sin medir**. Revisar Neon/PostgreSQL, Cloudflare Workers, Cloudflare Pages y servicios auxiliares; comprobar las cuotas vigentes y probar carga sintética en un entorno efímero/autorizado. Medir latencia, errores, CPU, conexiones, concurrencia, almacenamiento y crecimiento. Entregar capacidad demostrada, límite operativo conservador y umbrales de alerta; no inventar cifras.

No usar Neon `main`, datos reales, despliegues de producción ni servicios de pago para esta auditoría; no cambiar planes/secretos ni incurrir en costes sin autorización. Optimizar según evidencia y no introducir microservicios prematuramente.

### Estado del trabajo en curso
- Backup real: run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124) verificó descarga, checksum, descifrado y restauración en PostgreSQL 18 efímero. No demuestra integridad de todos los datos comerciales ni RPO/RTO/alertas/coste $0.
- PR [#150](https://github.com/BTF14/Micro-app/pull/150) y PR [#151](https://github.com/BTF14/Micro-app/pull/151) están fusionadas. La #151 añadió `docs/CAPACITY_AND_LIMITS.md` y guardrails de capacidad; sus checks del SHA de cabeza pasaron antes de la fusión. Verificar siempre el estado vivo antes de asumir que una PR histórica sigue abierta.

## ESTADO OPERATIVO VIGENTE — respaldo cifrado (2026-10-29 UTC)

> Esta sección prevalece sobre notas históricas inferiores que todavía digan que el incidente de subida está pendiente. No borrar el historial: interpretar cada incidente según la evidencia posterior.

- **Subida del backup: VERIFICADA.** Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) terminó en success: `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, commit remoto `2b038bd`, push a la rama `main` del repositorio privado de backups y retención `deleted 0 file(s)`.
- **Par cifrado persistido según logs:** `daily/backup-2026-10-29T17-29-48Z.dump.age` y `.sha256`.
- **Pendiente:** ejecutar `.github/workflows/backup-real-restore.yml` manualmente tras configurar `AGE_PRIVATE_KEY` como secreto protegido. El workflow verifica checksum de los bytes descargados y restaura en PostgreSQL efímero, sin Neon ni recursos persistentes. También siguen pendientes RPO/RTO, alerta de fallo y evidencia de coste $0.
- La prueba sintética automatizada de restauración es complementaria; no sustituye la restauración del backup real.
- PR [#148](https://github.com/BTF14/Micro-app/pull/148) quedó fusionada el 2026-10-29; merge commit `0681aea75b555d5eb0b60dfec26c2706207fae45`. No está abierta y no debe reabrirse para este trabajo.
- **Plan de arquitectura:** [docs/ARCHITECTURE_EVOLUTION_PLAN.md](./ARCHITECTURE_EVOLUTION_PLAN.md). La auditoría comienza después de cerrar la restauración real del backup; primero lectura y diagnóstico, sin migraciones ni cambios productivos.
- Límites vigentes: no desplegar producción, no acceder a Neon `main`, no pedir ni imprimir claves privadas age, no borrar backups/recursos, y no declarar coste $0 sin evidencia.


---

## ESTADO VIVO PRIORITARIO — tras fusionar PR #137 (2026-10-29 UTC)

**Repositorio único:** https://github.com/BTF14/Micro-app  
**Main verificado:** `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5` — merge de [PR #137](https://github.com/BTF14/Micro-app/pull/137). En la última búsqueda, no había PR abiertas; repetir la consulta antes de operar.  
**Autorización del propietario:** temporalmente autoriza a la IA a investigar, implementar, verificar y fusionar PRs con criterio. Calidad/seguridad por encima de rapidez. No inundar el repo de PRs ni dejar ramas/PRs de prueba olvidadas.

### Lo que realmente se hizo y lo que no

- PR #137 se fusionó. Añadió auditoría de versiones estables, plan de actualización, y `.github/workflows/daily-dependency-watch.yml`.
- **No se actualizaron dependencias en PR #137.** La actualización de paquetes sigue pendiente; no describir los majors propuestos como instalados.
- El monitor diario está en `main`, programado a las 08:15 UTC (04:15 Venezuela), con `workflow_dispatch`, permisos `contents: read`, `pnpm install --frozen-lockfile`, `pnpm outdated -r`, comprobación del último parche Node 24 LTS y `pnpm audit --audit-level high`. Es de solo lectura y no abre PR ni modifica dependencias.
- Se confirmó el run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) en SHA `0763c70647ff11a8bcf91386a274d549246407ef`; instalación congelada y `pnpm audit --audit-level high` pasaron, con `No known vulnerabilities found`. La revisión de logs detectó que Bash ejecutó fragmentos entre backticks y que `pnpm outdated -r` no dejó un listado visible; por tanto, el run no validó bien el informe de actualizaciones. La corrección está en `fix/dependency-watch-report-20261029`; esperar CI y un nuevo run antes de declarar el monitor verificado.
- En la última consulta de checks de `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5`: `verify`, Chromium auth, migración PostgreSQL, análisis estático y Trivy mostraban éxito; Workers, Pages y una instancia de scan de historial seguían en curso/duplicadas. Volver a consultar el estado del SHA exacto; no declarar todo verde hasta que termine.
- No se modificaron dependencias, lockfile, secretos, Neon `main`, datos reales ni se hizo despliegue manual en esta tarea. El check de Cloudflare puede generar su propia actividad automática; no equivale a que la IA hiciera un despliegue manual.

### Inventario declarado/resuelto que debe verificarse otra vez en main

- Node range `>=24.22.1 <25`; usar Node 24 LTS y actualizar al parche estable vigente tras comprobar compatibilidad.
- pnpm lockfile v9; no saltar automáticamente a otro major de pnpm.
- TypeScript `5.9.3` (raíz/API/web); TypeScript 7 no está aplicado.
- Hono `4.13.14`; Workers types `5.20261026.1`; Wrangler `4.152.0`.
- React/react-dom `19.3.1`; tipos React y React DOM `19.3.0`.
- Vite `7.3.7`; `@vitejs/plugin-react` `5.2.0`; jsdom `26.1.0`.
- Override crítico: `undici@7.30.1` en `package.json` y `pnpm-lock.yaml`. No aceptar que desaparezca el override o que el lockfile resuelva `undici@7.29.1`. Esto ya causó `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y un hallazgo alto.
- PRs #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) se cerraron sin merge. No asumir que esos upgrades se instalaron. Verificar releases estables/registry y compatibilidad actual antes de retomar.

### Siguiente trabajo obligatorio

1. Leer los documentos de arranque enumerados más abajo y verificar SHA de `main`, PRs abiertas, checks y workflows en vivo.
2. Confirmar que todos los checks post-merge de #137 terminaron y ejecutar el monitor diario manualmente; guardar URL del run, SHA, resultado y resumen.
3. Auditar versiones estables y advisories en el registry al momento de trabajar; priorizar vulnerabilidades explotables/alta severidad y parches compatibles, no solo números de versión.
4. Hacer una única PR coherente para la actualización técnica: primero parches/minors compatibles; migrar Vite 8 + plugin-react 6 + jsdom 30 y evaluar TypeScript 7 con revisión de engines, peer dependencies, breaking changes y pruebas. Separar cambios si mezclar majors impide aislar fallos, pero no abrir PR por paquete sin necesidad.
5. Generar el lockfile con la versión real de pnpm y mantener `pnpm install --frozen-lockfile` verde. Nunca editar resoluciones del lockfile a mano. Conservar el override de Undici o sustituirlo solo con evidencia de seguridad revisada.
6. Exigir checks verdes en el SHA exacto: verify, build/tests web y API, typecheck, migración PostgreSQL, Chromium auth, análisis estático, Dependency Review, Trivy, scan de secretos/historial y builds Pages/Workers. Diagnosticar logs y corregir causa raíz antes de fusionar.
7. Tras merge, comprobar versiones declaradas y resueltas, override, checks de main y ejecutar/documentar el monitor. Actualizar `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md`, `STATE_JOURNAL.md` y plan si cambia el estado.
8. Mantener los límites del proyecto: no cambiar secretos ni pedirlos, no tocar Neon `main` ni datos reales, no desplegar manualmente producción. Restauración integral con datos sintéticos sigue pendiente para la última fase. No borrar ramas/recursos a través de métodos alternativos si un control de seguridad bloquea la acción.

### Documentos que hay que leer antes de actuar

`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md`. Las notas antiguas dentro de estos archivos son histórico; esta sección de estado vivo tiene prioridad, pero siempre revalidar contra GitHub.

---

## Prioridad del siguiente chat — auditoría de versiones y migración segura (2026-10-29)

**Repo:** https://github.com/BTF14/Micro-app  
**HEAD vivo conocido al iniciar esta nota:** 59ad394d6dc5035b114db5379b2e1680d1e7969f (merge PR #136). Antes de actuar, volver a consultar SHA de main, PRs abiertas y checks. Esta auditoría se está documentando en la rama docs/market-dependency-audit-20261029; revisar si su PR se abrió/fusionó antes de crear trabajo adicional.

### Qué quiere el propietario
Quiere versiones modernas y seguras del mercado por la evolución de amenazas y de la cadena de suministro de software. Tiene autorización temporal para que la IA revise, implemente, pruebe y fusione PRs con criterio. El propietario recalca: documentar exhaustivamente la continuidad para el siguiente chat/IA; calidad y seguridad por encima de rapidez; evitar inundar el repo con PRs de limpieza.

### Estado comprobado y corrección importante
- PR #136 solo actualizó documentación; no actualizó paquetes.
- En main: TypeScript 5.9.3, Vite 7.3.7, @vitejs/plugin-react 5.2.0, jsdom 26.1.0, Wrangler 4.152.0, Hono 4.13.14, React/react-dom 19.3.1, tipos React 19.3.0, Workers types 5.20261026.1, override de undici 7.30.1.
- PR #117 (TypeScript 7.0.2), #118 (plugin-react 6.1.2), #119 (Vite 8.3.5), #120 (jsdom 30.1.3) están cerradas sin merge. No declarar que sus versiones están aplicadas.
- Dependabot anteriormente quitó el override undici@7.30.1 del lockfile y provocó ERR_PNPM_LOCKFILE_CONFIG_MISMATCH; Dependency Review encontró undici@7.29.1 con severidad alta. La PR #116 se fusionó tras preservar el override. Este guardrail es obligatorio.
- Última consulta de PRs: no se devolvieron PR abiertas; repetir búsqueda en vivo, porque el estado puede cambiar.

### Versiones publicadas observadas el 2026-10-29
- TypeScript 7.0.2 stable/latest: https://www.npmjs.com/package/typescript
- Vite 8.3.5 latest, Vite 7.3.7 versión anterior: https://www.npmjs.com/package/vite
- plugin-react 6.1.2 latest: https://www.npmjs.com/package/@vitejs/plugin-react
- jsdom 30.1.3: https://www.npmjs.com/package/jsdom
- Wrangler 4.154.0 latest: https://www.npmjs.com/package/wrangler
- Hono 4.13.14 estable; no migrar a 5.0.0-rc: https://www.npmjs.com/package/hono
- React/react-dom 19.3.1; tipos React 19.3.0.
- pnpm 12.16.1 latest observado, pero el repo usa lockfile v9: https://www.npmjs.com/package/pnpm
- Node 24.22.2 LTS publicado el 2026-10-28; Node 26.13.0 también aparece como LTS. Mantener línea Node 24 por ahora y probar parches.
- Las páginas indexadas de @cloudflare/workers-types no coinciden temporalmente entre sí; repo declara 5.20261026.1. Consultar registry en la ejecución real antes de afirmar que hay una versión superior; considerar wrangler types como proyecto de migración separado.

### Monitor diario de versiones y vulnerabilidades — PR #137

- Se añadió `.github/workflows/daily-dependency-watch.yml` en la rama de la PR #137; verificar que siga en esa PR y revisar checks del HEAD actual.
- Cron: 08:15 UTC diario (04:15 Venezuela), además de ejecución manual. Solo lectura: permisos `contents: read`, instalación congelada, `pnpm outdated -r`, consulta del parche Node 24 LTS e informe `pnpm audit --audit-level high`.
- La salida se guarda en el resumen de Actions. No abre PRs ni actualiza paquetes. Un audit con hallazgos high/critical hace fallar el workflow después de escribir el resumen; inspeccionar el log para separar advisories de errores de registry.
- Dependabot continúa semanal para npm y GitHub Actions. No cambiar a PRs diarias automáticas: se busca visibilidad diaria sin inundar el repositorio.
- Antes de fusionar, revisar YAML/diff y comprobar checks obligatorios del SHA exacto. Después del merge, verificar el primer run manual del workflow y dejar evidencia (run URL, SHA, resultado) en CURRENT_STATE y STATE_JOURNAL.
- No afirmar que el monitor ya corre diariamente hasta que esté fusionado y exista al menos una ejecución real. Mantener `undici@7.30.1` en ambos manifiestos de dependencia/lockfile; no editar el lockfile a mano.

### Qué hacer a continuación
1. Terminar la auditoría/documentación de esta rama y abrir una sola PR documental si no existe ya una equivalente.
2. Luego ejecutar una actualización de dependencias real en una rama aparte, generando el lockfile con pnpm real (no edición manual). Agrupar coherentemente Vite 8 + plugin-react 6 + jsdom 30; evaluar TypeScript 7 en la misma migración solo tras revisar compatibilidad. Wrangler patch/minor se puede incluir si pasa CI.
3. No tocar majors del gestor pnpm ni cambiar Node a 26 sin una prueba explícita.
4. Preservar overrides.undici = 7.30.1 en package.json y pnpm-lock.yaml; rechazar cualquier lockfile que elimine el bloque o resuelva 7.29.1.
5. Exigir checks obligatorios verdes en el HEAD exacto: verify, Chromium auth smoke tests, PostgreSQL migration, static analysis, Trivy, secret-history scan; además Dependency Review, Pages y Workers. Revisar logs si falla, arreglar causa real y evitar PRs pequeñas repetidas.
6. Después del merge, verificar manifests y lockfile en main, checks post-merge y documentar SHA, PR, versiones declaradas/resueltas, limitaciones y siguiente tarea.
7. No desplegar manualmente a producción, no cambiar secretos, no tocar Neon main ni datos reales. No realizar restore integral hasta la última fase sintética; el backup probado anteriormente tenía tablas comerciales vacías.
8. Antes de cualquier trabajo, leer AGENTS.md, docs/CONSTITUTION.md, docs/CURRENT_STATE.md, este archivo, docs/AI_COLLABORATION_AND_PR_POLICY.md, docs/PROJECT_PLAN.md, docs/STATE_JOURNAL.md, docs/RESOURCE_REGISTRY.md, docs/SECURITY_ROADMAP.md y docs/BACKUP_AND_RECOVERY.md.


---

## Arranque obligatorio — estado vivo tras PR #134 (2026-10-29 UTC)

Repositorio: https://github.com/BTF14/Micro-app. HEAD verificado de `main`: `764ed502d2a296136d311e05d081ca8e9f7cfeb9`, merge de PR #134 (reglas Dependabot/lockfile y continuidad). PR #116 y #131 también están fusionadas. En la última búsqueda no había PR abiertas; reconsultar SHA, PRs y checks en vivo antes de actuar. Leer primero `AGENTS.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md` y `docs/BACKUP_AND_RECOVERY.md`.

### Inventario actual de versiones

- Node `>=24.22.1 <25`; pnpm lockfile v9.
- TypeScript `^5.9.3` (resuelto `5.9.3`) en raíz/API/web. TypeScript 7 NO se fusionó.
- API: Hono `^4.13.14` (resuelto `4.13.14`), `@cloudflare/workers-types ^5.20261026.1`, Wrangler `^4.152.0`.
- Web: React/React DOM `^19.1.1` (resueltos `19.3.1`), Vite `^7.1.7` (resuelto `7.3.7`), plugin React `^5.0.4` (resuelto `5.2.0`), jsdom `^26.1.0` (resuelto `26.1.0`).
- `undici@7.30.1` sigue fijado en el override y lockfile; no aceptar lockfiles que quiten el override o resuelvan `7.29.1`.
- PR #117 TypeScript 7, #118 plugin-react 6, #119 Vite 8 y #120 jsdom 30 cerradas sin merge. No presentarlas como actualizaciones aplicadas ni reintroducirlas sin plan de compatibilidad y CI verde.

### Dependabot — resultado y guardrails

- PR #116 (Hono, Cloudflare Workers types y Wrangler) está fusionada. HEAD final de PR: `5d3f2e373e75caf71af207cba61df3066b140a86`. Los checks de la PR pasaron, incluidos Dependency Review, `verify`, Chromium, migraciones, static analysis, Trivy, scan de historial de secretos y builds de Cloudflare.
- La causa de los fallos anteriores era que el lockfile generado por Dependabot eliminaba `overrides: undici: 7.30.1`, en desacuerdo con `package.json`, y resolvía `undici@7.29.1`. El arreglo de #116 preserva el override. En el `main` actual, `pnpm-lock.yaml` contiene el override y `undici@7.30.1`, y no contiene `undici@7.29.1`.
- PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) están cerradas sin fusionar. No afirmar que sus versiones se aplicaron. No reabrir ni aplicar los upgrades sin revisar compatibilidad y plan de pruebas.
- Seguimiento post-merge completado: los checks consultados para `9f73f8ab0c1581145796f09a41f689fa4bdcf310` terminaron todos en `success`. El HEAD de documentación posterior `764ed502d2a296136d311e05d081ca8e9f7cfeb9` también tiene los checks consultados en `success`, incluidos `verify`, Chromium, migraciones, Trivy, scan de secretos/historial, análisis estático, Cloudflare Pages y Workers.

### Próximos pasos

1. **Completado:** todos los checks consultados del merge de PR #132 están en `success`.
2. Mantener `pnpm.overrides.undici = 7.30.1` coherente con el lockfile; exigir `pnpm install --frozen-lockfile` y Dependency Review verdes en toda actualización.
3. No fusionar PR solo porque sea de Dependabot: comprobar SHA exacto, diff, lockfile, seguridad y compatibilidad. Evitar múltiples PR para una causa común.
4. Continuar la hoja de ruta de seguridad; la prueba integral de restauración con datos sintéticos poblados sigue pendiente y debe quedar para la última fase.

PR #131 está fusionada y añade solo un resumen visible ante fallos de backup en Actions; no envía por sí mismo correo/push. No se tocaron Neon `main`, secretos, datos reales ni producción, y no se hizo despliegue manual.

---

## Arranque obligatorio — continuidad tras PR #130 (2026-10-29 UTC)

Repositorio: https://github.com/BTF14/Micro-app. Última referencia de `main` verificada al iniciar este trabajo: `3ce18e2aa5bcf2a8c555a47681998405a4f14509` (fusión de PR #130); reconsultar el SHA vivo antes de operar, pues cambiará al fusionarse la PR de monitorización. PR #129 corrigió la retención de 15 días y sus checks pasaron.

### Lee primero
`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este archivo, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md` y `docs/BACKUP_AND_RECOVERY.md`. No asumir que notas históricas más abajo siguen describiendo el estado vivo.

### Secretos y rama Neon de prueba
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets; no se conoce la fecha exacta de eliminación. Nunca pedir valores ni imprimirlos.
- Los únicos secretos que el propietario reporta actualmente son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos para el backup permanente.
- Neon todavía muestra la rama `restore-test-20261028`, ID `br-broad-dust-b7cvgjtv`, en el proyecto `restless-fire-99110035`. El borrado vía herramienta fue bloqueado por controles de seguridad; no eludir el bloqueo. Si se necesita limpiar, indicar los pasos para borrarla manualmente desde la consola Neon y confirmar el ID para evitar `main`.

### Política de retención obligatoria para cualquier IA o chat
- Mantener la retención actual de **15 días**; el backup permanente se genera a diario y el workflow elimina solo los archivos cuyo timestamp UTC validado del nombre supera los 15 días, junto con su checksum.
- No borrar los backups anteriores cada vez que se crea uno nuevo. Si la ejecución nueva falla o no se valida, conservar la última copia válida y comprobar que exista una alerta visible.
- No reducir/aumentar la retención ni crear otro workflow sin revisar primero `docs/BACKUP_AND_RECOVERY.md`, coste objetivo $0 y riesgos de recuperación. Cualquier cambio debe ir en el flujo existente, con pruebas y documentación; evitar PRs fragmentadas.
- La retención automática no demuestra que un backup pueda restaurarse. La prueba aislada con datos sintéticos relacionados, el manifiesto comparativo, RPO/RTO y confirmación de notificaciones externas siguen pendientes. El workflow publica ahora un resumen visible en el run de Actions ante fallos, pero no envía por sí mismo un correo/push. La restauración se mantiene para la última fase.

### Backup permanente y siguiente trabajo
- PR #129 corrigió la retención: ahora se analiza el timestamp UTC validado del nombre `backup-YYYY-MM-DDTHH-MM-SSZ.dump.age`, y se elimina el checksum correspondiente cuando se elimina el backup vencido. CI incluye pruebas unitarias; todos los checks de ese HEAD pasaron.
- La restauración técnica del backup cifrado se verificó en PostgreSQL desechable en [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192), pero las tablas comerciales estaban vacías. El siguiente paso es preparar una única prueba aislada con datos sintéticos relacionados y manifiesto de conteos/relaciones, restaurar y comparar. Documentar RPO/RTO, alertas y coste $0.
- La restauración debe ser la última fase. No usar datos reales, Neon `main`, producción ni herramientas de pago. No recrear el workflow temporal de PR #127 y no abrir PRs fragmentadas.
- No declarar recuperación integral probada hasta que la prueba sintética poblada y las verificaciones operativas queden documentadas.

---

## Arranque obligatorio — continuidad después de PR #128 (2026-10-29 UTC)

Repositorio único: https://github.com/BTF14/Micro-app. SHA verificado de `main`: `9b4ee7d2ed704288cd0cf149c93569a698f46e1b`. PR [#128](https://github.com/BTF14/Micro-app/pull/128) está fusionada. Reconsultar el estado vivo antes de operar.

### Lee primero
`AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este archivo, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md` y cualquier documento de decisión pertinente al siguiente trabajo. No asumir que un snapshot histórico sigue describiendo el estado vivo.

### Estado exacto de limpieza del restore
- PR #127 eliminó `.github/workflows/restore-test-20261028.yml` y actualizó documentación. No recrear ese workflow ni crear una PR duplicada para retirarlo.
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY` y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets; no se conoce la fecha exacta de eliminación. Nunca pedir valores ni imprimirlos.
- Los únicos secretos que el propietario reporta actualmente son `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`; conservarlos para el backup permanente.
- La rama Neon `restore-test-20261028` todavía existía en la última comprobación; el intento de borrado de la herramienta fue bloqueado por controles de seguridad. No afirmar que se borró ni intentar eludir el bloqueo. Si se requiere terminar la limpieza, indicar al propietario cómo verificar y borrar esa rama desde la consola Neon, comprobando el ID y evitando `main`.
- No se tocó Neon `main`, datos reales ni producción.

### Restore y opción D
Run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) fue exitoso: checksum, descifrado, `pg_restore`, 13 tablas, 186 constraints, 0 membresías huérfanas y exclusión de `auth_sessions`/`auth_rate_limits`. Las tablas comerciales/auditoría estaban vacías; esto no prueba la recuperación de un conjunto comercial poblado.
Inspección ya realizada: `.github/workflows/backup.yml` usa `pg_dump`, `age`, repositorio privado de backups y retención de 15 días. Se detectó que `find -mtime` no es fiable después de `git clone` porque los mtimes corresponden al checkout, no a la fecha del backup. La PR de corrección sustituye retención por timestamp UTC del nombre del backup y añade pruebas unitarias al CI. Tras comprobar los checks y resolver la revisión, continuar con una sola prueba aislada de datos sintéticos relacionados y manifiesto de conteos; comparar en PostgreSQL desechable y registrar límites, RPO/RTO, alertas y coste $0. No usar datos reales, Neon `main`, producción ni herramientas de pago.

### Disciplina de continuidad
Documentar en `CURRENT_STATE.md`, `STATE_JOURNAL.md`, este handoff y el documento técnico afectado. Mantener estado de cada tarea como verificado / pendiente / bloqueado y guardar SHA, PR, run IDs, causa raíz y siguiente paso. No declarar éxito si la herramienta bloqueó una operación. Una sola PR para un objetivo documental coherente, no inundar el repositorio.

---

## Continuidad verificada — restore de backup (2026-10-29 UTC)

- PR #126 fusionada. Run manual del workflow temporal: [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192), `success`; las cinco verificaciones terminaron en verde.
- Backup usado: `backup-2026-10-28T13-39-39Z.dump.age`. Confirmado checksum, descifrado, restauración en rama PostgreSQL desechable, 13 tablas esperadas, 186 constraints, cero membresías huérfanas y ausencia de `auth_sessions`/`auth_rate_limits`.
- Limitación: las tablas de negocio (`products`, `suppliers`, `exchange_rates`, `sales`, `sale_items`, `payments`, `inventory_movements`, `audit_logs`) estaban vacías en la copia. Se prueba la restauración técnica, no la recuperación de un conjunto comercial poblado ni la igualdad de conteos con origen.
- PR de limpieza por completar: eliminar `.github/workflows/restore-test-20261028.yml` y actualizar `BACKUP_AND_RECOVERY.md`, `SECURITY_ROADMAP.md`, este handoff, `CURRENT_STATE.md` y `STATE_JOURNAL.md`. No fusionar sin los checks requeridos.
- Después del merge, el propietario debe borrar manualmente los secretos de repositorio `RESTORE_TEST_AGE_KEY` y `RESTORE_TEST_DB_URL`, y eliminar la rama Neon desechable `restore-test-20261028`. No tocar Neon `main` ni revelar secretos en chat.
- El punto de backup de Nivel 1 sigue parcialmente pendiente: datos sintéticos poblados, manifiesto/conteos comparativos, RPO/RTO, alertas, retención y evidencia de coste $0. La aplicación no está lista para producción por los bloqueos restantes de seguridad.

---

## Checkpoint posterior a PR #114 — 2026-10-29 UTC

- PR #114 quedó fusionada por squash en `main`: [merge commit dc3fae80c485ec52c2e68c80da316df90c68ac83](https://github.com/BTF14/Micro-app/commit/dc3fae80c485ec52c2e68c80da316df90c68ac83). El HEAD revisado fue `780e057435fea4ebd6213fd973745599e71d2088`; GitHub confirmó `merged=true`.
- Los ocho workflows de PR y los dos checks externos de hosting del HEAD de PR fueron `success`. Esto no equivale a CI post-merge: en el merge SHA los estados hosting alternativo aparecen `pending` y el conector no devolvió workflows de Actions para ese SHA. Reconsultar antes de afirmar que pasó CI post-merge.
- Cloudflare Workers actualizó el estado a `Deployment successful!` y expuso URLs explícitas de preview de commit y rama: `https://36b3fea5-micro-app-api.btfcasheb.workers.dev` y `https://docs-continuity-after-pr-113-2026-10-28-micro-app-api.btfcasheb.workers.dev`. No se hizo despliegue manual.
- Esta actualización documental corrige la referencia obsoleta al estado abierto de PR #114 y al SHA anterior de `main`; conserva el historial previo sin reescribir decisiones antiguas.
- Siguen pendientes: restaurar el backup cifrado en PostgreSQL desechable; verificar headers CORS con HTTP real contra el Worker; decisión/aprobación de la matriz de permisos; aislamiento cross-tenant para rutas comerciales futuras. No declarar la app lista para producción. No tocar Neon `main`, secretos ni datos reales.

---

## Siguiente sesión — continuidad posterior a PR #113 (2026-10-28)

**SHA de referencia:** `4242bcef38f33a415f472fc9c04048e1eee3bdde`. Consultar HEAD/PR/Actions en vivo antes de actuar.

1. La PR #113 se fusionó: [commit](https://github.com/BTF14/Micro-app/commit/4242bcef38f33a415f472fc9c04048e1eee3bdde). La matriz de `docs/sdd/role-permission-decision-matrix.md` es una propuesta no aprobada; no implementar rutas de negocio hasta aprobación explícita o autorización nueva y concreta.
2. La revisión manual dejó en la PR tres advertencias: el descuento del 10 % es solo un ejemplo que requiere decisión; el alcance por sucursal/caja debe confirmarse; y la regla de último `owner` necesita serialización transaccional/pruebas concurrentes, no un CHECK ordinario.
3. Backup: run [40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159) verificó cifrado, subida y checksum. Falta restauración a PostgreSQL desechable. La llave privada `age` está bajo custodia del propietario y no está en la sesión. No pedir que se pegue en el chat ni usar Neon `main`.
4. CORS de producción sigue sin prueba HTTP reciente de `OPTIONS` con origen permitido y atacante; no confundir tests del middleware con headers del Worker publicado. No usar automatización metered ni cambiar configuración Cloudflare a ciegas.
5. Issue #53: aislamiento cross-tenant de rutas comerciales todavía no se puede dar por cerrado porque esas rutas no están expuestas/probadas; issue #78: CORS/configuración efectiva sigue pendiente.
6. Auditoría de rama `security/secret-scan-current-main`: 1 ahead / 39 behind; checklist duplicado en `main`, workflow de rama usa checkout v4 mientras `main` usa v7, y su `.gitignore` omite la excepción de `apps/web/.env.production`. No fusionar ni eliminar sin revisión selectiva.
7. PR #113 tuvo workflows de PR exitosos en su HEAD exacto, pero Codex no completó la revisión por límite de uso; se hizo revisión manual. Los dos checks externos de hosting del commit de merge aparecen pendientes y no equivalen a CI posterior al merge. No declarar una segunda corrida.
8. Mantener coste $0, no crear PR duplicadas, no desplegar producción, no tocar secretos/Neon/datos reales y no marcar la app lista para producción. Priorizar tareas verificables sin saltarse las decisiones del propietario.

---

## Próximos pasos ejecutables — estado verificado 2026-10-28

1. **CORS de producción:** PR #103 está fusionada. Repetir `OPTIONS` al Worker productivo con el origin Pages autorizado y con `https://attacker.example`, guardando código HTTP y headers completos. En esta sesión el acceso web a los endpoints falló; no usar automatización metered ni cambiar variables Cloudflare a ciegas. Si no hay vía de red autorizada, continuar tareas independientes y dejar este control pendiente.
2. **Backup/restore:** run 40587638159 verificó cifrado, subida y checksum; restaura esa copia en PostgreSQL desechable y valida esquema, constraints, conteos/relaciones, duración y RPO/RTO conforme a la sección 6 de `docs/BACKUP_AND_RECOVERY.md`. La llave privada `age` está bajo custodia del propietario, no en el repositorio ni en esta sesión. No acceder ni escribir Neon `main`.
3. **Auth/tenant:** PR #111 está fusionada. El issue #53 sigue abierto: faltan rutas comerciales para demostrar aislamiento cross-tenant real y falta aprobación de la matriz de permisos por rol/organización. No declarar todo el issue resuelto.
4. **Dependabot:** el conector no permite leer alertas actuales. Mantener desconocido el recuento; no afirmar que el panel está limpio solo por el pin `undici@7.30.1` o Trivy.
5. **Adapter de Neon:** no fusionar `feat/neon-transaction-adapter` tal cual. Tiene 14 commits ahead y 124 behind; módulo database igual a main, pero pruebas más débiles y dependencias/workflow obsoletos. No borrar la rama ni PR antiguas hasta revisar si conservan cambios únicos.
6. **Inventario y protección:** al iniciar, verificar el SHA vivo de `main`, las PR abiertas y los checks de sus HEADs. La API de protección devuelve 403 y las fuentes documentales discrepan sobre el número de aprobaciones; confiar en los gates de GitHub y no sortearlos.

No presentar pruebas unitarias como prueba de producción. No hacer despliegues, cambios de secretos ni escrituras en Neon `main` sin el gate aplicable.

---




## Handoff vigente — 2026-10-28: PR #106 aisla Pages Preview de producción

- PR: https://github.com/BTF14/Micro-app/pull/106. Rama `fix/isolate-pages-preview-from-production-20261028`.
- HEAD verificado: `1d47a474351bb14f9f5e14283beec789356bafe3`; todos los checks consultados en ese SHA terminaron en success, incluido verify, Chromium auth smoke, JS/TS static analysis, dependency-review, postgres-migration, Trivy, secret-history scan, Cloudflare Pages y preview.
- Pruebas en sandbox: build de Preview pasó; bundle y CSP de salida no contienen el origen del Worker de producción; test dedicado de Preview pasó 1/1; suite web normal pasó 6/6 con el test de Preview omitido fuera de Preview; build de producción conserva la URL de API.
- HTTP real del branch Preview de Pages: HTTP 200 y CSP `connect-src 'self'`, sin permiso al Worker productivo.
- El frontend Preview no consulta sesión ni permite Google login. Esto evita que Preview use producción aunque todavía no haya API/DB de Preview aisladas. No ampliar CORS productivo ni configurar Preview con la DB real a ciegas.
- PR #106 ya fue fusionada mediante squash en `main` con commit `d5d99b3a5184d6aad36ffd9a44ff34a62346dc94`; Cloudflare Pages y Workers Builds reportaron éxito, y el endpoint público `/health` respondió `status: ok`. No se cambiaron secretos, variables/bindings de Cloudflare ni Neon. No se hizo despliegue manual.
- PR #103 permanece separada y abierta por la instrucción previa de revisión independiente. PR #105 no se debe fusionar con su override global de `undici >=7.30.1` que resuelve a 8.x.

---

## Handoff vigente — 2026-10-28: política de PR y continuidad entre agentes

- Documento normativo nuevo: `docs/AI_COLLABORATION_AND_PR_POLICY.md`. Leerlo junto con `AGENTS.md`; define alcance de PR, revisión alternativa cuando Claude/Codex no estén disponibles, verificación por SHA exacto, gates de merge/producción y continuidad entre chats.
- Se modificó `AGENTS.md` para incluir la política en la secuencia obligatoria de arranque. Estos cambios están en la rama documental `docs/ai-pr-policy-20261028`; comprobar en vivo si la PR correspondiente ya fue fusionada antes de asumir que la política está en `main`.
- Principio clave del propietario: priorizar que quede bien y seguro sobre la velocidad aparente; evitar PR redundantes y no inundar el repositorio. Reutilizar la misma PR para cambios del mismo objetivo; separar objetivos independientes.
- Claude y Codex son revisores adicionales, no bloqueo para continuar el trabajo técnico. Pero si el propietario pide explícitamente dejar una PR abierta hasta que estén disponibles, respetar esa instrucción.
- Estado CORS vigente: PR #103 (`fix/cors-preflight-coverage-20261028`) sigue abierta por instrucción del propietario hasta que Claude y Codex estén disponibles. El HEAD `39fc7c118fc5b99eef022a26fa91481bb2ef5638` tuvo los workflows consultados en `success`, pero la verificación HTTP real de preflight del Worker y la estrategia segura de API/CORS para Preview siguen pendientes. No afirmar que CORS de producción está resuelto, no fusionar ni desplegar por adelantado.
- No mezclar la política general de PR con PR #103: esa PR es solo para cobertura de pruebas CORS. La política se tramita como cambio documental independiente.

---

## Handoff vigente — 2026-10-28: falta la prueba de restauración; confirmar que las alertas de Dependabot bajaron

1. **Único pendiente real del respaldo automático**: probar una restauración real (`pg_restore`) contra una base PostgreSQL desechable, con los datos actuales de Neon, y verificar conteos/relaciones — criterios de aceptación en `docs/BACKUP_AND_RECOVERY.md` sección 6. El respaldo en sí (generación + cifrado + subida) ya está verificado con una corrida real.
2. **Confirmar con el propietario** que `github.com/BTF14/Micro-app/security/dependabot` ya no muestra las 15 alertas de vitest/tinypool/undici/@vitest-mocker (se resolvieron en PR #96 subiendo vitest a 5.x) — esta IA no puede leer esa lista desde este entorno (403 de permisos), así que la confirmación tiene que venir del propietario mirando la página directamente.
3. **La IA puede fusionar sola** (aprobación obligatoria desactivada desde 2026-10-27, PR + 6 checks en verde siguen siendo obligatorios).
4. Leer `docs/COMPLIANCE_AND_ACCESSIBILITY.md` (checklist externo de cumplimiento, evaluado; la mayoría no aplica todavía al modelo actual del negocio — no reactivar esos puntos sin pedírselo antes al propietario).
5. No adelantar el negocio real (inventario, ventas, BCV) hasta: (a) cerrar la prueba de restauración del punto 1, y (b) que la matriz de permisos por rol (`docs/sdd/role-permission-decision-matrix.md`, Nivel 2 punto 5) esté aprobada — o recibir autorización explícita y nueva del propietario para avanzar en paralelo.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`; varios PRs viejos abiertos (#59, #67–70, #72, #73, #77, #79) sin revisar — se le ofreció al propietario hacer limpieza de esto, sin respuesta todavía.
7. Nota de entorno: `pnpm install`/`npm` siguen sin poder resolver `registry.npmjs.org` por DNS en este sandbox (reconfirmado 2026-10-28); para cualquier cambio de dependencias, usar el patrón de esta sesión (workflow de un solo uso en GitHub Actions que regenera el lockfile y lo empuja a una rama) en vez de reintentar localmente.

---

## Handoff vigente — 2026-10-27: respaldo implementado, falta 1 secreto; checklist de cumplimiento evaluado

1. **La IA puede volver a fusionar sola.** El propietario desactivó la aprobación obligatoria (prefiere eso mientras es el único con acceso de escritura); GitHub nunca deja que el autor de un PR se apruebe a sí mismo, así que con 1 aprobación requerida todo quedaba bloqueado. Sigue requiriéndose PR + los 6 checks en verde.
2. **Pendiente único y bloqueante del respaldo automático (`.github/workflows/backup.yml`):** el propietario debe agregar el secreto `DATABASE_URL_BACKUP_RO` en `github.com/BTF14/Micro-app/settings/secrets/actions` (valor ya entregado por chat, nunca commiteado, no reconstruirlo de memoria — si se perdió, regenerar el rol `backup_readonly` en Neon y pedir el valor de nuevo). Una vez agregado: correr el workflow manualmente (`workflow_dispatch`) para confirmar que corre de punta a punta, y luego hacer una prueba de restauración real en una base desechable antes de confiar en él para datos reales (criterios de aceptación en `docs/BACKUP_AND_RECOVERY.md` sección 6).
3. **Leer `docs/COMPLIANCE_AND_ACCESSIBILITY.md`** (ahora parte de la secuencia de arranque de `AGENTS.md`): evalúa un checklist externo de 20 puntos legal/privacidad/accesibilidad. La mayoría no aplica todavía (no hay pagos, cookies de analítica ni registro público) — no reactivar esos puntos sin pedírselo antes al propietario. Dos pendientes reales y baratos: foco atrapado en `HelpModal` (`apps/web/src/App.tsx`), y una auditoría de contraste de color con herramienta cuando exista una vista de negocio real que auditar.
4. **PR #91 y #92 fusionados**: decisión sobre el blueprint externo de Gemini (`docs/PRICING_CACHE_ARCHITECTURE.md`) y respaldo automático + gate de dependencias + checklist de cumplimiento.
5. No adelantar el negocio real (inventario, ventas, BCV) hasta cerrar Nivel 1 completo (ya solo falta el secreto del punto 2 y su verificación) o recibir autorización explícita y nueva del propietario para avanzar en paralelo.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`; varios PRs viejos abiertos (#59, #67–70, #72, #73, #77, #79) sin revisar.
7. Nota de entorno: `pnpm install`/`npm` siguen sin poder resolver `registry.npmjs.org` por DNS en este sandbox; verificar todo vía GitHub Actions en el SHA exacto. Escrituras a rutas administrativas de la API de GitHub (branch protection, secrets, creación de repositorios) siguen bloqueadas por el proxy del entorno — no reintentar, ya confirmado varias veces.

---

## Handoff vigente — 2026-10-26 (noche): main protegida (flujo cambia), decisión sobre backups pendiente del propietario

1. **`main` ya tiene branch protection activa, verificada en vivo.** A partir de ahora **todo cambio, incluidos los checkpoints de documentación, pasa por PR** — ya no se puede empujar directo a `main`. Abrir rama → PR → esperar CI en verde → **esperar que el propietario apruebe y fusione en GitHub** (la IA no puede autoaprobarse: `required_approving_review_count: 1` en vivo, aunque el propietario reportó haberlo dejado en 0 — ver la discrepancia documentada en `docs/SECURITY_ROADMAP.md` punto 1 y pedirle que la revise/confirme).
2. **PR #91 abierto, CI en verde, esperando aprobación del propietario:** evaluación del blueprint externo de Gemini (`docs/PRICING_CACHE_ARCHITECTURE.md`) — adopta el diseño del cron BCV y la caché KV, rechaza explícitamente el offline-first de ventas. No revertir ese rechazo sin autorización nueva y explícita del propietario.
3. **Respaldo automático (Nivel 1, punto 2): en progreso, no terminado.** Ya hecho: rol Neon de solo lectura `backup_readonly` y un par de llaves `age` (pública documentada en el roadmap; privada entregada una sola vez al propietario, no vive en este entorno). **Bloqueado en el destino:** R2 no está habilitado en la cuenta de Cloudflare y activarlo puede exigir tarjeta, lo que choca con la regla de $0 sin tarjetas del proyecto. Se le presentaron dos opciones al propietario (R2 con alerta de presupuesto en $0, o un repositorio privado de GitHub dedicado solo a los volcados ya cifrados). **No escribir el workflow de subida hasta que el propietario elija.**
4. Ya implementado y verificado antes de esta sesión: identidad, login, UI de acceso, centro de ayuda, Dependabot, cabeceras de seguridad. Sin pendientes conocidos ahí.
5. No adelantar el negocio real (inventario, ventas, BCV) hasta cerrar Nivel 1 completo o recibir autorización explícita y nueva del propietario para avanzar en paralelo.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`; varios PRs viejos abiertos (#59, #67–70, #72, #73, #77, #79) sin revisar.
7. Nota de entorno: `pnpm install`/`npm` siguen sin poder resolver `registry.npmjs.org` por DNS en este sandbox; verificar todo vía GitHub Actions en el SHA exacto. Confirmado de nuevo en esta sesión: cualquier escritura a rutas administrativas de la API de GitHub (branch protection, secrets) sigue bloqueada por el proxy del entorno (`403 ... not permitted through this proxy`) — no reintentar, es un callejón sin salida ya documentado dos veces.

---

## Handoff vigente — 2026-10-26 (tarde): hoja de ruta de seguridad adoptada, léela primero

1. **Leer `docs/SECURITY_ROADMAP.md` completo antes de hacer nada más.** El propietario pidió explícitamente priorizar seguridad/corrección sobre velocidad, pensando en que el proyecto puede escalar a varias personas. Ese documento ahora es lectura obligatoria según `AGENTS.md` y define en qué orden implementar cada cosa (Nivel 1 antes de seguir con negocio, Nivel 2 antes del primer empleado, Nivel 3 al crecer el equipo).
2. **Pendiente urgente que requiere al propietario, no a la IA:** activar la protección de la rama `main` en GitHub (instrucciones exactas en la sección 1 de la hoja de ruta). Confirmado técnicamente que este agente no puede hacerlo vía API (el proxy de red del sandbox lo rechaza con 403 aunque el token tenga permiso admin) — no reintentar eso, es un callejón sin salida ya documentado.
3. Pendiente de implementación por la IA: respaldo automático cifrado de Neon a un destino independiente (diseño en la sección 2 de la hoja de ruta — Cloudflare R2 + GitHub Action programada). No se ha empezado.
4. Ya implementado: Dependabot (`.github/dependabot.yml`) y cabeceras de seguridad (frontend `_headers` + middleware de la API). PR #85, merge `11d29b183490286a02195d7f86b94f44853d3c5c`.
5. Identidad, login, UI de acceso y centro de ayuda siguen cerrados y verificados de punta a punta (ver el checkpoint de 2026-10-26 más arriba en `docs/CURRENT_STATE.md`). No hay pendientes conocidos ahí.
6. Una vez resueltos los puntos 2 y 3 (o con confirmación explícita del propietario de que se puede avanzar sin ellos), recién ahí construir el negocio real: inventario, productos, tasa BCV, ventas. No adelantar esa parte saltándose la hoja de ruta de seguridad sin que el propietario lo autorice de nuevo.
7. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main`. También hay varios PRs viejos abiertos y aparentemente abandonados (#59, #67, #68, #69, #70, #72, #73, #77, #79) que valdría revisar y cerrar como supersedidos si corresponde — no se tocaron en esta sesión.
8. Nota de entorno: en el sandbox usado hasta ahora, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS; verificar cambios de frontend/API vía los checks de GitHub Actions en el SHA exacto, no localmente.

---

## Handoff vigente — 2026-10-26: todo lo de identidad/acceso/ayuda cerrado — arrancar negocio de cero

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md`.
2. **Estado confirmado end-to-end por el dueño en su teléfono real:** login con Google, organización "Abasto 7 de Oro", botón de logout alcanzable en móvil, enlace de WhatsApp en cualquier error de la app, y un centro de ayuda básico (FAQ + Privacidad) en el pie de página. PRs #80–#84, todas fusionadas y desplegadas. **No hay ningún pendiente conocido de identidad, acceso o UI básica.**
3. Recordatorio del bug ya resuelto que no debe repetirse: cualquier variable de entorno nueva no-secreta del Worker debe declararse también en `apps/api/wrangler.toml`, o `wrangler deploy` la borra en el siguiente despliegue (pasó dos veces el 2026-10-25).
4. **La prioridad total del siguiente chat es construir el negocio real**: inventario, productos con precio en USD, tasa BCV con conversión a VES, ventas/caja. No existe código de nada de esto todavía — todo lo hecho hasta ahora (varias sesiones) ha sido identidad e infraestructura.
5. Para agregar un usuario nuevo (más allá del primero), seguir el patrón SQL documentado en `docs/CURRENT_STATE.md` (inserciones manuales en Neon por ahora).
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge.
7. Nota de entorno: en el sandbox usado hasta ahora, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS; verificar cambios de frontend vía los checks de GitHub Actions en el SHA exacto, no localmente.

---

## Handoff vigente — 2026-10-25 (noche): identidad/infraestructura terminada, ver el bug de wrangler.toml antes de tocar variables

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md` (bloque "Estado vivo — 2026-10-25 (noche)"). Contiene el bug más importante a recordar para no repetirlo.
2. **Bug ya resuelto pero crítico de no repetir:** `wrangler deploy` borra en silencio cualquier variable del Worker que esté puesta a mano en el dashboard de Cloudflare pero no declarada en `apps/api/wrangler.toml` (solo afecta a las que NO son "Secreto"). Ya pasó dos veces en esta sesión y rompió producción ambas veces sin que el cambio desplegado tuviera nada que ver con `apps/api`. Si se agrega una variable nueva no-secreta al Worker, agregarla también a `[vars]` en `wrangler.toml` en el mismo cambio.
3. Login con Google verificado funcionando de extremo a extremo, confirmado visualmente por el usuario en su teléfono real: organización "Abasto 7 de Oro", owner `btfcasheb@gmail.com`. Botón de "Cerrar sesión" ahora también es alcanzable en móvil (PR #82, merge `f274d32a359dbba8e401897a41294fda1f33cbf8`).
4. **No queda ningún pendiente conocido de identidad/infraestructura/UI básica.** La prioridad pasa por completo a construir el negocio: inventario, productos con precio en USD, tasa BCV y conversión a VES, ventas. No existe código de esto todavía.
5. Para agregar un usuario nuevo (más allá del primero), seguir el patrón SQL documentado en `docs/CURRENT_STATE.md` — hoy requiere inserciones manuales en Neon; considerar diseñar un flujo de invitación real antes de que se necesite de verdad.
6. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge.
7. Nota de entorno: en el sandbox de esta sesión, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS; los cambios de frontend se verificaron exclusivamente vía los checks de GitHub Actions en el SHA exacto antes de fusionar.

---

## Handoff vigente — 2026-10-25 (tarde): login real funcionando, siguiente fase es negocio

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md` (el bloque que empieza "Estado vivo — 2026-10-25 (tarde)"). Contiene los IDs exactos de la organización/usuario creados, el estado sellado de `auth_bootstrap`, y el patrón SQL exacto para agregar más correos a `auth_allowlist`.
2. El login con Google ya funciona en producción de extremo a extremo. Primera organización real: "Abasto 7 de Oro" (`abasto-7-de-oro`), owner `btfcasheb@gmail.com`. El bootstrap de un solo uso ya se consumió y no se puede volver a usar — es por diseño, no un bug.
3. PR #81 fusionada (`441bdc463954aba1069cfeae9227bf75a562a53a`): se reemplazó el formulario de contraseña muerto por un botón real "Continuar con Google" y mensajes de error claros (`?auth_error=...`). Todos los checks pasaron en el head exacto `117cb1c` antes de fusionar, incluido Playwright, que hubo que reescribir porque probaba el formulario eliminado.
4. **No asumir que agregar un correo a `auth_allowlist` alcanza para que esa persona entre.** Solo el primer login (vía bootstrap, ya sellado) puede crear `app_users`/`organization_members`. Para un segundo usuario real hace falta, hoy, una inserción manual adicional en esas tablas o — mejor — diseñar e implementar un flujo de invitación antes de que haga falta de verdad.
5. Confirmar primero con el usuario que `https://micro-app-63i.pages.dev/` carga el panel autenticado tras el redeploy de Cloudflare Pages (se disparó automáticamente al fusionar PR #81, pero no se verificó visualmente en esta sesión más allá de los checks de CI).
6. Con identidad resuelta, la prioridad del proyecto pasa a construir la lógica de negocio: inventario, productos en USD, tasa BCV/conversión a VES, ventas. No existe código de esto todavía.
7. Pendiente sin resolver, no bloqueante: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge (arrastrado desde hace varias sesiones).
8. Nota de entorno: en el sandbox de esta sesión, `pnpm install`/`npm` no pudieron resolver `registry.npmjs.org` por DNS pese a estar en `no_proxy`; si vuelve a pasar, verificar cambios de frontend exclusivamente vía los checks de GitHub Actions en el SHA exacto antes de fusionar, como se hizo aquí.

---

## Handoff vigente — 2026-10-22

1. Leer primero el checkpoint superior de `docs/CURRENT_STATE.md`.
2. PR #76 está integrada en `main` (merge `5f33e82fc7a6d3e77b6b97d912034f2a2ee7c2b0`). El workflow de Gitleaks con historial completo pasó en el SHA final y reportó 613 commits, ~1.74 MB y cero leaks encontrados: https://github.com/BTF14/Micro-app/actions/runs/39862510779. Los ocho checks del SHA también pasaron.
3. PR #74 está cerrada como supersedida; no reabrirla. Los cambios vigentes son los de PR #76.
4. PR #71 está integrada. `resolveTenantContext` solo valida sesión/membresía activa; no aplica permisos por operación ni se conecta todavía a handlers comerciales.
5. Issue P0 #53 registra el riesgo actual: registro deshabilitado, pero login por contraseña sigue activo sin comprobar Google sign-in/allowlist. Resolver D1–D8 antes de declarar autenticación lista; no inventar allowlist, proveedor, bootstrap o política de vinculación, y no deshabilitar login sin evaluar cuentas existentes.
6. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa pendiente de aprobación. No implementar permisos comerciales por intuición.
7. GitHub informó `main` sin protección; la conexión no pudo leer/editar reglas administrativas. El propietario debe activar branch protection, required checks y opciones disponibles de secret scanning/push protection en Settings.
8. Arquitectura: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. No producción deploy, no Neon `main`, no billing ni secretos.

---


## Verificación más reciente — 2026-10-22 21:58 UTC

- En PR #71, head verificado `ef86738991fbed58090d191ffbb865e4e8f18588`: CI, Playwright E2E, migración PostgreSQL, Trivy, Semgrep, dashboard, Cloudflare Pages preview y comentarios automáticos de preview del hosting terminaron success. Runs: CI https://github.com/BTF14/Micro-app/actions/runs/39861207434; E2E https://github.com/BTF14/Micro-app/actions/runs/39861207395; migration https://github.com/BTF14/Micro-app/actions/runs/39861207581; Trivy https://github.com/BTF14/Micro-app/actions/runs/39861207344; Semgrep https://github.com/BTF14/Micro-app/actions/runs/39861207331; dashboard https://github.com/BTF14/Micro-app/actions/runs/39861207369.
- El workflow E2E ejecutó `Run browser tests` y concluyó success. La corrección de CI de PR #75 está integrada en main.
- PR #71 sigue open/draft y sin merge. Revisar el alcance funcional/seguridad de `resolveTenantContext` antes de promoverla a revisión final. La función es actualmente una utilidad aislada; no aparece conectada a rutas en `apps/api/src/index.ts`.
- SHA anterior verificado: `ef86738991fbed58090d191ffbb865e4e8f18588`. Los commits documentales siguientes generan un nuevo head; consultar los checks del SHA vivo antes de cualquier decisión de merge.
- Límites: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free; runtime de API alternativo auxiliar/no canónica; presupuesto $0; sin deploy de producción, sin cambios a Neon `main`, sin secretos expuestos.

---

## Handoff vivo — 2026-10-22: Playwright fix integrado; PR #71 pendiente de E2E

Leer primero el checkpoint más reciente al inicio de `docs/CURRENT_STATE.md`.

- PR #75 se fusionó en `main` por squash; commit `3a6d8211d21cc3fbbff2cd476d8fa80adb65cd3f`. Los seis workflows pasaron en `main`, incluido Playwright E2E.
- Se copió el workflow Playwright validado de `main` a `feat/tenant-context-resolver`, commit inicial `a3301896c2936ce6d50698a0d05ad920e656fe7a`, para que PR #71 ejecute la nueva configuración.
- En ese head, CI, migración, Trivy/security scan, Semgrep y dashboard pasan. Playwright [39861076113](https://github.com/BTF14/Micro-app/actions/runs/39861076113) pasó el paso de verificación de Chromium y seguía ejecutando los browser tests en la última consulta. Confirmar conclusión final antes de marcar E2E como verde.
- PR #71 sigue open/draft. No fusionar hasta revisar el resultado E2E y el diff final del resolver. La utilidad `resolveTenantContext` no aparece conectada a rutas en `apps/api/src/index.ts`; confirmar que esto concuerda con el alcance previsto y no añadir autorización implícita.
- No se identificó un séptimo workflow distinto: seis workflows Actions y dos contextos externos de hosting observados. No inventar un check faltante.
- Arquitectura canónica: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. runtime de API alternativo es auxiliar/no canónica. No deploy de producción, no tocar Neon `main`, sin billing ni secretos expuestos. Presupuesto $0.

---

## Handoff vivo — 2026-10-22: Playwright fix passed on PR #75

Leer el checkpoint más reciente al inicio de `docs/CURRENT_STATE.md`.

- GitHub Actions ya ejecuta jobs en runners tras hacer público el repositorio.
- PR #71 (`feat/tenant-context-resolver`) tiene CI, PostgreSQL migration, Semgrep, Trivy y progress dashboard pasados sobre el head anterior; Playwright falla en el workflow antiguo al instalar Chromium/dependencias. Los logs del job son inaccesibles (`404 BlobNotFound`), por lo que no se inventó causa raíz.
- Se creó PR draft #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75), solo workflow. Usa imagen oficial Playwright `v1.55.0-noble`, con browser y dependencias preinstalados. Todos sus seis workflows pasaron sobre SHA `09bc000d07672f731935d2bbc9e8b38f605eeb9d`, incluido Playwright E2E; enlace de E2E: https://github.com/BTF14/Micro-app/actions/runs/39859323412.
- Mantener #75 draft hasta revisión; no se ha fusionado. Tras integrar la corrección de workflow, volver a verificar los checks de #71 en su SHA final y solo entonces considerar sacar #71 de draft. No mezclar el cambio de CI dentro del resolver.
- No se identificó un séptimo workflow distinto: los raw check-runs de la revisión muestran seis workflows Actions relevantes y dos checks hosting alternativo exitosos. No inventar un séptimo nombre.
- Arquitectura canónica: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. runtime de API alternativo auxiliar/no canónica; no deploy de producción ni cambios a Neon `main`.
- Límites: coste $0, no exponer secretos, no migrar datos reales, no fusionar PRs sin revisar el estado de checks.

---
## Handoff vivo — 2026-10-22: GitHub Actions ejecuta jobs

Leer primero el checkpoint más reciente al inicio de `docs/CURRENT_STATE.md`. Repo público; runners ya ejecutan steps.

- En PR #71, SHA base de esta revisión `8d938ab5726d357bd9f9f79385af54bbd42c4f2f`: CI (build/typecheck/unit/auth integration), PostgreSQL migration validation, Semgrep, Trivy y project progress dashboard pasaron en reintentos reales. Links e IDs están en `CURRENT_STATE.md`.
- El único workflow relevante que permanece fallando es Playwright E2E run [39426320240](https://github.com/BTF14/Micro-app/actions/runs/39426320240), intento 3. Falla en `Install Chromium and OS dependencies`; los tests del navegador ni siquiera arrancan. Logs del job retornan 404 `BlobNotFound`, por lo que no se conoce la causa interna. No hacer reruns en bucle ni cambiar el workflow a ciegas. Próximo trabajo: recuperar salida del paso; si la API de logs sigue devolviendo 404, ajustar el entorno de browser de forma reproducible en una rama de CI separada y probarlo antes de mezclarlo con PR #71.
- La causa del histórico de siete errores no se inventa: raw check-runs en el SHA consultado muestran seis workflows Actions relevantes más dos contextos externos de hosting exitosos; un run viejo duplicado de Security scan falló, mientras el run PR más reciente pasó.
- Mantener PR #71 draft hasta resolver E2E y verificar checks en el head final. No fusionar sin revisión.
- Arquitectura aprobada: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. No existe un runtime de API alternativo soportado; no recuperar despliegues paralelos ni cambiar la arquitectura sin decisión explícita.
- Restricciones: $0, no deploy de producción, no tocar Neon `main`, no exponer secretos, no ejecutar migraciones con datos reales.

---
## Handoff actualizado — revisión viva 2026-10-20 08:56 EDT / 12:56 UTC

La evidencia detallada y la tabla de workflows están al inicio de `docs/CURRENT_STATE.md`. Se actualizó ese archivo en esta misma rama mediante commit `e2d9812e2406969f2e0bf6b32dbc6040f108b8e1`; el head de la rama ahora habrá avanzado, por lo que vuelve a consultarlo antes de actuar.

- Al comenzar la revisión, `main` seguía en `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`; PR #71 abierta/draft, head `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2` (ya no `a4806b6...`). PR #68 y #69 siguen abiertas no-draft; PR #70 sigue abierta draft. SHA exactos registrados en CURRENT_STATE.
- Sobre el head actual consultado, se recuperaron seis workflows fallidos: Project progress dashboard, Database migration validation, CI, Semgrep SAST, Security scan y Playwright E2E. Cada job expuesto reporta `steps: []`; las descargas de logs para los seis job IDs actuales devuelven 404 `BlobNotFound`. La causa de no inicio/asignación del runner no está demostrada. El usuario reporta siete errores, pero el conector no permitió identificar el séptimo; no adivinar. El combined status solo expone dos contextos externos de hosting en success, no los check-runs de Actions.
- El comentario de diagnóstico anterior sigue presente en PR #71; no se duplicó. No hacer más reruns sin evidencia nueva. Mantener la PR en draft hasta que los jobs ejecuten steps y exista CI real verificable.
- El diagnóstico histórico de un despliegue alternativo no forma parte del runtime soportado ni de las tareas vigentes. La configuración ejecutable del repositorio usa `apps/api/wrangler.toml` y Wrangler para Cloudflare Workers.
- El inventario actual no contiene manifiestos, dependencias, scripts ni workflows de un segundo proveedor de hosting. No se modificaron cuentas externas ni integraciones GitHub.
- No se cambió código de aplicación ni configuración de despliegue; solo se actualizó documentación. No se desplegó producción, no se alteró Neon `main`, no se ejecutaron migraciones ni se expusieron secretos.

### Siguiente secuencia

1. Verificar el nuevo head después de las actualizaciones documentales y volver a consultar runs/checks para ese SHA.
2. Recuperar el séptimo check mediante el listado raw de check-runs de GitHub (no disponible en el conector consultado). Si se comparte una URL/captura, registrar nombre y conclusión sin repetir comentarios innecesarios.
3. Obtener runner metadata/raw logs cuando estén disponibles; distinguir fallo de infraestructura de tests no ejecutados.
4. No modificar el resolver, OAuth/allowlist, permisos, Neon ni configuración de hosting alternativo para intentar ocultar checks. Ejecutar la suite real cuando haya un checkout/runner funcional.
5. Tratar runtime de API alternativo como auxiliar/no destino comercial hasta decisión arquitectónica explícita; la arquitectura documentada es Cloudflare Workers + Hono.

---
## Archivo histórico — 2026-10-20 (supersedido)

El diagnóstico de un runtime de hosting alternativo y el estado de PR #71 pertenecen a una etapa anterior. No son una tarea vigente ni justifican recuperar un segundo hosting. La arquitectura vigente y soportada es Cloudflare Pages + Cloudflare Workers/Hono + Neon. Consultar siempre el checkpoint superior y GitHub en vivo.

## Estado prioritario de continuidad — 2026-10-19, después de PR #64

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- `main` incluye PR #64, merge SHA `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`; PR #63 merge SHA `b4b417ec5a85b8b0c48b606c718c341745af9055`.
- PR #63 tuvo siete workflows success en su head exacto; PR #64 tuvo seis workflows success en su head exacto: CI, Playwright E2E, Security scan, Semgrep SAST, migration validation y progress dashboard. No se ejecutaron tests locales.
- PR #60 se cerró como supersedida tras comparar el diff: sus reglas útiles de autonomía están en PR #62/#63; el bloque de handoff histórico no se reintrodujo porque sus SHA/estados eran obsoletos. No se hizo force-push ni merge directo.
- PR #64 añadió skills locales `.agents/skills/micro-app-auth-security/SKILL.md`, `micro-app-postgres-testing/SKILL.md`, `micro-app-stack-guidance/SKILL.md` y `micro-app-skill-curation/SKILL.md`; guía en `docs/AUTOSKILLS_ADOPTION.md`. Son skills propias del proyecto, no paquetes oficiales instalados desde AutoSkills.
- AutoSkills se investigó, pero la CLI no se ejecutó: el shell no pudo resolver `github.com` al intentar preparar un checkout. No afirmar que la instalación oficial ocurrió ni que existe un lockfile de hashes. Repetir `npx autoskills --dry-run` en un checkout con red y revisar cada skill antes de instalar.
- P0: Google OAuth + allowlist sigue sin implementar; D1–D8 y matriz de roles pendientes. Registro fail-closed; el login por contraseña aún existe y no debe suponerse protegido por allowlist.
- Límites: $0; sin producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. La app no está lista para producción.

## Próximas acciones
1. Repetir AutoSkills dry-run cuando haya conectividad y seleccionar solo skills relevantes/licenciadas/hash-verificadas.
2. Continuar auth/sesión y aislamiento multiempresa con pruebas sintéticas; no inventar decisiones pendientes.
3. Revisar `feat/neon-transaction-adapter` contra `main` sin merge ciego.
4. Verificar cada PR/check sobre el SHA final y mantener el diario actualizado.

---

## Estado prioritario de continuidad — 2026-10-19, después de PR #62

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- PR #61 fusionada; merge SHA reportado `1b8098ff00e0bb7482200b486710a5611f1e109d`.
- PR #62 fusionada; merge SHA `d107cfb2b80c4165ed39e3071f8256942898ffb7`; head final `9f288f68b6012f39b8ec7928b07a140b869e63cb`. Los siete workflows de ese head terminaron `success`: CI, Playwright E2E, SDD/agent docs, progress dashboard, Security scan, Semgrep SAST y migration validation. Cambio documental únicamente.
- PR #60 sigue abierta con conflicto (`mergeable=false`), head `af8479000e1e677bd84e0e11bf02cdb6d548315e`. No force-push ni merge directo. PR #62 integró los principios básicos de autonomía; esta PR #63 amplía los criterios operativos detallados que no se portaron íntegramente. No fusionar PR #60 original con conflictos.
- Codex no dejó hilos inline recuperables para PR #60 y la revisión de su SHA antiguo falló por cuota. PR #62 recibió una observación P2 de checkpoint obsoleto en su head inicial; se corrigió en el head final actualizando `CURRENT_STATE.md` y `HANDOFF_NEXT_CHAT.md`.
- P0: Google sign-in + allowlist sigue sin implementar; D1–D8 y matriz de permisos por rol siguen pendientes. `POST /auth/register` debe permanecer fail-closed. La ruta de login por contraseña continúa en código; no asumir que la política de allowlist ya la protege.
- No inventar correos, dominios, bootstrap de admin, proveedor OAuth ni política de vinculación. No tocar producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. Presupuesto $0; aplicación no lista para producción.
- `feat/neon-transaction-adapter` sigue divergida y no debe fusionarse a ciegas. Strix está documentado, no instalado ni ejecutado.
- No se ejecutaron tests locales. Los workflows del head final de PR #62 fueron satisfactorios; no son prueba de readiness de producción.

## Próximos pasos
1. Comparar la PR #60 contra el contenido integrado por PR #62; si queda contenido útil, crear PR nueva desde `main` sin force-push.
2. Hacer análisis/test aislado de auth y sesión sin elegir decisiones pendientes.
3. Actualizar SHA y checks de continuidad tras cada cambio.

---

## Estado prioritario de continuidad — 2026-10-19 (revalidar antes de actuar)

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- PR #61 está fusionada; merge SHA reportado: `1b8098ff00e0bb7482200b486710a5611f1e109d`. El cambio fue documental, no despliegue de producción.
- PR #60 (`docs/ai-autonomy-governance`) sigue abierta con head `af8479000e1e677bd84e0e11bf02cdb6d548315e`; `mergeable=false`. Se consultaron siete workflows del head exacto y todos terminaron `success`: CI, Security scan, Playwright E2E, Database migration validation, Project progress dashboard, Semgrep SAST y SDD/agent documentation validation. El comentario de Codex marca `failed` y cuota agotada para un SHA antiguo (`1b7f576c38aa869ca8c17b749c7c35d473404ef8`); no hay review threads ni reviews formales recuperados. No inferir cuáles eran los hallazgos.
- Para evitar force-push, se creó `docs/ai-autonomy-governance-rebased` desde `main` y se abrió la PR #62: https://github.com/BTF14/Micro-app/pull/62. La PR contiene seis cambios documentales re-aplicados sobre la base actual. El head `ff1d6926da478c2ad0c38e2aca7d29b8903fca76` tuvo siete workflows en `success` y `mergeable=true`; después se actualizó el checkpoint para registrar ese resultado, lo cual generó un nuevo head. Revalidar SHA, diff y los checks de ese nuevo head antes de integrar. No fusionar la #60 original con conflictos.
- P0: Google sign-in + allowlist sigue sin implementar; D1–D8 y matriz de permisos siguen pendientes de aprobación. `POST /auth/register` debe permanecer fail-closed. No inventar correos, dominios, bootstrap de admin, proveedor OAuth ni política de vinculación.
- La rama `feat/neon-transaction-adapter` sigue sin fusionarse a ciegas; solo rescatar cambios concretos tras comparación con el `main` vigente.
- Coste $0; no despliegues de producción, Neon `main`, datos reales, secretos, emails, billing ni mezcla con Cantina-pos. App no lista para producción. Strix está documentado, no instalado ni ejecutado.
- Próximo paso: revisar la nueva PR de gobernanza y sus checks; después hacer análisis/test aislado de auth/sesión sin escoger políticas pendientes y actualizar `CURRENT_STATE.md` con SHA real de `main` una vez obtenido por evidencia.

---

## Estado vivo — 2026-10-19 después de PR #57

Revalidar GitHub antes de actuar; este bloque prevalece sobre snapshots históricos inferiores.

- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`.
- PR #57 fusionada: el registro público devuelve `503 REGISTRATION_DISABLED` después de validar Origin, antes de procesar credenciales o acceder a la base de datos. Tests unitarios e integración PostgreSQL verifican que no hay escrituras ni cookie y preservan login/sesión con fixtures sintéticos.
- Checks del head exacto de PR #57 `71d3e6d3ffe625b12807e9942ddd261e222cf093` en success, y checks consultados del merge SHA también en success. No se ejecutaron pruebas localmente.
- Preview reportada por Cloudflare: https://1d3d60bf.micro-app-63i.pages.dev; el check no acredita despliegue productivo.
- Issue P0 #53 sigue abierto hasta implementar Google sign-in + allowlist y resolver D1–D8. No reactivar el registro ni inventar identidad.
- `feat/neon-transaction-adapter`: divergida, 14 commits ahead / 76 behind; no fusionar a ciegas. Los únicos cambios aparentes son tests antiguos/script de test y documentación obsoleta; `database.ts` y security workflow ya son idénticos a main.
- Matriz de roles sigue pendiente; no crear endpoints comerciales que dependan de permisos no aprobados.
- App no lista para producción. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y documentos de dominio.
- Continuar autónomamente con cambios pequeños y reversibles. No secretos, emails, billing, datos reales, Neon main, despliegue productivo ni Cantina-pos. Strix documentado, no instalado/ejecutado. Coste $0.

---

## Estado vivo — 2026-10-19 después de PR #55

Este bloque prevalece sobre snapshots históricos inferiores. Revalidar GitHub en cada sesión.

- `main`: `b7117f8aeb868e25c49db86a524405511cd3c9be`; PR #55 fusionada.
- Head exacto probado de PR #55: `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28`; los 8 check-runs observados terminaron en success. Cloudflare Pages fue preview de rama; no producción. No se ejecutaron pruebas locales ni se verificó independientemente el merge SHA.
- No hay PR abiertas en la consulta actual.
- Issue P0 #53 está abierto: el registro público no tiene una política Google + allowlist demostrada y crea usuario, organización, membresía owner y sesión. No afirmar que ya esté bloqueado.
- D1–D8 de identidad y matriz de permisos pendientes de decisión humana. No inventar reglas.
- Continuar autónomamente con cambios seguros, pequeños, reversibles y verificables. Revisar AGENTS.md, docs/CONSTITUTION.md, docs/CURRENT_STATE.md, este handoff, docs/PROJECT_PLAN.md, docs/STATE_JOURNAL.md y documentos de dominio.
- Próximo trabajo: análisis estático y pruebas aisladas de auth/sesión/autorización que no seleccionen políticas pendientes; revisar la rama feat/neon-transaction-adapter contra main sin merge ciego.
- No producción, no mutar Neon main sin gates, no secretos, emails, billing, datos reales ni Cantina-pos. Strix documentado solamente. Presupuesto objetivo $0. La app no está lista para producción.
- Para continuar el bloqueado de identidad, el usuario debe aprobar las decisiones D1–D8 y la matriz de roles; pedirlas de forma concreta y con recomendaciones explícitas.

---

## Estado vivo — 2026-10-19 después de PR #51

Usa este bloque antes que snapshots históricos inferiores y revalida GitHub antes de actuar.

- `main`: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98`. PR #50 y #51 fusionadas; PR #49 actualizó documentación tras #48.
- Los seis workflows pasaron en los heads exactos de PR #50 (`dcad8d6d1caf6db3aabbc95465e5983ad0014746`) y PR #51 (`92ea991d6333bcd1b05943f679fdd36777ab6a8f`). No se ejecutaron tests locales ni se verificaron workflows sobre merge SHA.
- Continuar autónomamente con cambios pequeños y reversibles. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y documentos de dominio.
- Próximo foco: autorización server-side y aislamiento tenant. Revisar handlers reales antes de añadir pruebas de negocio; no inventar endpoints inexistentes.
- No implementar OAuth/allowlist ni elegir D1–D8 o permisos por suposición. No desplegar producción ni mutar Neon `main`; no secretos, correos, billing, datos reales ni Cantina-pos. La app no está lista para producción.

---

## Estado vivo — 2026-10-19 después de PR #48

Usa este bloque antes que snapshots históricos inferiores y revalida GitHub antes de actuar.

- `main`: `420a64152103c90d2990d47c72fc19a744786fa6`. PR #48 y PR #47 fusionadas; PR #46 actualizó la continuidad.
- Los seis workflows pasaron en los heads exactos de PR #47 (`7939d11678cfd1a2bb8fac22664096663603c824`) y PR #48 (`6acb78018a47eb39f74dab079b53b51b4cacf11f`). No se ejecutaron tests locales ni se verificaron workflows en los merge SHA.
- Continuar autónomamente con cambios pequeños, reversibles y verificables. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, este handoff, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y los documentos de dominio.
- Próximo foco: autorización server-side y aislamiento tenant. Inspeccionar handlers reales antes de añadir pruebas de negocio; no inventar endpoints inexistentes.
- No implementar OAuth/allowlist ni elegir políticas D1–D8 o permisos por suposición. No desplegar producción ni mutar Neon `main`; no secretos, correos, billing, datos reales ni Cantina-pos. La app no está lista para producción.

---

## Estado vivo — 2026-10-19 después de PR #45

Usa este bloque antes que snapshots históricos inferiores y revalida GitHub antes de actuar.

- `main`: `1c6ecf6a4586ab1252a43210672e123975f8941f`; PR #45 fusionada: https://github.com/BTF14/Micro-app/pull/45.
- Los seis workflows de Actions pasaron en el head exacto `cdce44a9643c5134311f9603abf1248c07970df3`; no se ejecutaron pruebas localmente ni se verificó el merge SHA con workflows.
- Continuar autónomamente con cambios pequeños y reversibles. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, este handoff, `docs/CURRENT_STATE.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y documentos de dominio antes de modificar.
- Próximo foco: pruebas acotadas de auth/sesión y límites de autorización. Inspeccionar handlers reales antes de proponer pruebas de negocio; no inventar endpoints inexistentes.
- No implementar OAuth/allowlist ni elegir políticas D1–D8 o permisos por suposición. No desplegar producción ni mutar Neon `main`; no secretos, correos, billing, datos reales ni Cantina-pos. No declarar la app lista para producción.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #41

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `3313bf4276563c6cdac52aa7902fa9ea36558014` — https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014
- PR #41 fusionada: https://github.com/BTF14/Micro-app/pull/41. Cambio: prueba de regresión para que el endpoint de logout no borre la cookie de sesión si falla la revocación del lado del servidor.
- Head exacto probado por GitHub Actions: `0c55c180846e6286e72d35f51e502278200ee0de`. Los seis workflows fueron `success`: CI (39244454840), Playwright E2E (39244454807), Security scan (39244454911), Semgrep SAST (39244454934), Project progress dashboard (39244454952) y Database migration validation (39244456648).
- Merge SHA: `3313bf4276563c6cdac52aa7902fa9ea36558014`. La consulta de workflows asociada al merge SHA no devolvió runs porque el conector filtra a eventos de PR; no afirmar que los seis workflows del merge SHA estén verificados. No se ejecutaron pruebas locales.
- Cambio acotado: solo `apps/api/src/index.test.ts`, 24 líneas añadidas. Usa una URL de base de datos sintética inválida; no contacta ni modifica una base real.
- No se tocaron secretos, billing, datos reales, Neon `main`, producción ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado, no instalado ni ejecutado.
- Estado del producto: **NO listo para producción**. Persisten endpoints comerciales incompletos, decisiones de identidad D1–D8 pendientes, matriz de permisos por aprobar, aislamiento multiempresa y flujos reales API+PostgreSQL por validar, idempotencia/concurrencia, requisitos fiscales y backup/restauración independiente por verificar.
- Rama `feat/neon-transaction-adapter`: divergida y desactualizada; no fusionar a ciegas. Recuperar solo cambios puntuales tras comparar con `main`.
- Siguiente paso: continuar con pruebas pequeñas de auth/sesión/autorización sin inventar políticas pendientes; mantener CI verificado por SHA exacto y coste objetivo $0. No desplegar producción ni mutar Neon `main` sin superar los gates documentados.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #39

## Estado verificado en GitHub

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `50c530084f8ce402d897962cbc7c4354c512e847` — https://github.com/BTF14/Micro-app/commit/50c530084f8ce402d897962cbc7c4354c512e847
- PR #39, prueba de que el error original de operación sobrevive cuando también falla el cierre del cliente: fusionada — https://github.com/BTF14/Micro-app/pull/39. Head probado: `134c9e14a5224d83c5f280dc501ae113d374c159`; merge SHA: `50c530084f8ce402d897962cbc7c4354c512e847`.
- Los seis workflows terminaron en `success` para el head exacto de PR #39 `134c9e14a5224d83c5f280dc501ae113d374c159`: CI (run 39243670711), Project progress dashboard (39243670742), Playwright E2E (39243670784), Database migration validation (39243670921), Semgrep SAST (39243670843) y Security scan (39243670950).
- PR #38 también está fusionada: https://github.com/BTF14/Micro-app/pull/38; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`. Sus seis workflows fueron `success` en el head exacto `527dd7cc62bcceae891add8100875cc395dd5cfa`.
- No se ejecutaron pruebas locales. Los resultados indicados son de GitHub Actions sobre los head SHA especificados. No se han verificado aquí workflows para el merge SHA de PR #39; no afirmar que el merge SHA esté completamente verde.
- No se desplegó producción, no se modificó Neon `main`, no se tocaron datos reales, secretos, facturación ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.
- Automatización diaria de continuidad creada previamente con ID `6ad4c8ce247881919e0c4e83e7358dcb`; verificar su estado en la plataforma si se necesita afirmar que está activa/ejecutándose. No es un bucle continuo en tiempo real.

## Estado funcional y bloqueos

La aplicación **NO está lista para producción**. Continúan pendientes: rutas comerciales completas para catálogo/proveedores/inventario/ventas/pagos/devoluciones/reportes; Google OAuth, allowlist y verificación de correo según las decisiones D1–D8 aún no aprobadas; matriz de permisos por rol; aislamiento multiempresa validado en todos los endpoints; pruebas reales de API + PostgreSQL para flujos de negocio; idempotencia y concurrencia de ventas/stock; cumplimiento fiscal; backups independientes y restauración ensayada; preview aislada y aprobación de lanzamiento.

## Próximos pasos

1. Continuar con pruebas de auth/sesión de alcance acotado sin inventar políticas de identidad o roles.
2. Revisar la rama `feat/neon-transaction-adapter` contra el `main` actual antes de cualquier decisión; no fusionarla a ciegas.
3. Mantener cambios pequeños en ramas/PR; exigir CI exitoso para el head SHA exacto y revisar diffs/reviews antes de merge.
4. Mantener el presupuesto objetivo en $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.
5. Corregir esta documentación al cerrar hitos; no usar snapshots históricos como evidencia del estado actual.

---

# Checkpoint de continuidad — 2026-10-19, después de PR #36

## Estado verificado

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `c15c2364cd19e55ac10b2331300e7a9f4b89813f` — https://github.com/BTF14/Micro-app/commit/c15c2364cd19e55ac10b2331300e7a9f4b89813f
- PR #35, checkpoint documental tras PR #34: fusionada — https://github.com/BTF14/Micro-app/pull/35. Merge SHA: `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36, validación estricta de hashes PBKDF2: fusionada — https://github.com/BTF14/Micro-app/pull/36. Head SHA probado por CI: `cf432de6d5e8752181bc1105e9d0e91384d5936c`; merge SHA: `c15c2364cd19e55ac10b2331300e7a9f4b89813f`.
- PR #36 cambió `apps/api/src/auth.ts` para rechazar hashes con campos `$` adicionales y valores de iteraciones no canónicos; añadió regresiones en `apps/api/src/auth.test.ts`.
- Los seis workflows de PR #36 terminaron en `success` para el head exacto `cf432de6d5e8752181bc1105e9d0e91384d5936c`:
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39241705903
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39241706090
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39241705951
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39241706070
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39241705989
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39241706068
- Los seis jobs consultados tras PR #34 (run IDs 39241150482, 39241150423, 39241150283, 39241150291, 39241150500 y 39241150556) reportaron `success`. La consulta disponible no devolvió metadatos suficientes para vincular cada run al SHA de merge `02c7cd61ef2e94545849746885dede12b2df7767`; no afirmar que ese SHA tiene checks confirmados hasta verificarlo por otro medio.
- No se ejecutaron pruebas locales en esta sesión. La evidencia de tests es GitHub Actions sobre el head de PR #36, no una ejecución local.
- No se desplegó producción ni se modificó Neon `main`; no se tocaron datos reales, secretos, billing ni Cantina-pos.

## Bloqueos de producto

- La aplicación NO está lista para producción: todavía no se ha verificado la implementación completa de rutas comerciales para catálogo, proveedores, inventario, ventas, pagos, devoluciones y reportes.
- Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen pendientes de aprobación; no inventar proveedor, política ni flujo de cuentas.
- La matriz de permisos por rol sigue pendiente de aprobación. No crear rutas comerciales asumiendo permisos.
- Playwright cubre smoke tests con API simulada; faltan pruebas E2E reales de API + PostgreSQL para flujos comerciales.
- Backups independientes y restauración real siguen sin verificarse. Revalidar protección de `main`; no asumir que está activada.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.

## Próximas acciones

1. Verificar los checks del SHA de merge `c15c2364cd19e55ac10b2331300e7a9f4b89813f` y registrar evidencia exacta si la plataforma la expone.
2. Continuar con pruebas de seguridad/auth de alcance pequeño, sin cambiar decisiones de identidad o permisos pendientes.
3. Mantener cambios en ramas + PR y esperar CI en el head SHA exacto antes de fusionar.
4. Actualizar este checkpoint y los documentos de estado tras cada cambio significativo.
5. Mantener coste objetivo $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates y autorizaciones requeridos por `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

# Checkpoint autoritativo — 2026-10-19, después de PR #31

> Revalidar GitHub en cada sesión antes de actuar; este bloque es un punto de partida, no sustituto de la verificación viva.

- Repositorio canónico: https://github.com/BTF14/Micro-app
- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 (matriz de decisiones de permisos por rol, todas pendientes de aprobación): https://github.com/BTF14/Micro-app/pull/30, fusionada.
- PR #31 (pruebas de sesiones/login cuando la organización está inactiva): https://github.com/BTF14/Micro-app/pull/31, fusionada; head de PR `cfb9f82a497b35aa5a27a4a9ea78476692cf254d`.
- Comprobación viva de Actions para el SHA exacto de main: 8 check-runs visibles: 6 success y 2 in_progress al momento de esta consulta; volver a verificar antes de declarar CI completamente verde.
  - Trivy filesystem and configuration scan: in_progress — https://github.com/BTF14/Micro-app/actions/runs/39176217202/job/117819320792
  - Cloudflare Pages: in_progress — https://github.com/BTF14/Micro-app/runs/117819318705
  - Chromium authentication smoke tests: success — https://github.com/BTF14/Micro-app/actions/runs/39175964317/job/117818569851
  - Trivy filesystem and configuration scan: success — https://github.com/BTF14/Micro-app/actions/runs/39175964296/job/117818569814
  - generate-progress: success — https://github.com/BTF14/Micro-app/actions/runs/39175964326/job/117818569804
  - postgres-migration: success — https://github.com/BTF14/Micro-app/actions/runs/39175964294/job/117818569740
  - JavaScript and TypeScript static analysis: success — https://github.com/BTF14/Micro-app/actions/runs/39175964287/job/117818569696
  - verify: success — https://github.com/BTF14/Micro-app/actions/runs/39175964298/job/117818569670
- PR #32 (esta actualización documental) está abierta: https://github.com/BTF14/Micro-app/pull/32; sus checks deben verificarse para el head SHA vigente antes de fusionar.
- No se ejecutaron pruebas locales en esta sesión. El estado de CI es evidencia de GitHub Actions, no certifica preparación comercial.
- Código verificado: `apps/api/src/index.ts` registra auth y health; aún no hay handlers HTTP comerciales para catálogo/productos, proveedores, compras, ventas, pagos ni movimientos de inventario.
- Autenticación: existen registro/login con contraseña, `/auth/me` y logout; Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen sin aprobar. No cambiar el modelo de registro ni inventar reglas de acceso.
- Permisos: `docs/sdd/role-permission-decision-matrix.md` está fusionado, pero cada celda sigue pendiente. No construir rutas comerciales asumiendo permisos por rol.
- La rama de Neon adapter no debe fusionarse ciegamente; la revisión anterior encontró 14 commits propios y 49 detrás de main, sin código único que justificara la fusión completa.
- Neon `main`: no se modificó. Backups independientes y restauración real: no verificados. Protección de branch main: estaba desactivada en la última comprobación; verificar de nuevo y no modificar sin necesidad/autoridad clara.
- Strix (`https://github.com/usestrix/strix.git`) solo está documentado; no instalado ni ejecutado.
- Límites: coste objetivo $0; no mezclar Cantina-pos; no secretos, correos, billing, datos reales, mutaciones en Neon main ni despliegues de producción sin superar los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

## Instrucciones obligatorias para la siguiente IA

1. Leer primero `AGENTS.md`, luego este checkpoint, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/CONSTITUTION.md`, `docs/PRODUCTION_READINESS.md` y `docs/BACKUP_AND_RECOVERY.md`.
2. Antes de cualquier cambio, comprobar en vivo el SHA de main, PR abiertas, checks del SHA exacto y estado de ramas. No usar los SHA históricos como evidencia actual.
3. Continuar autónomamente con cambios pequeños, reversibles y útiles; no pedir al usuario permisos ya concedidos. Documentar hallazgos y pruebas reales, sin afirmar que algo se ejecutó si solo se leyó el código.
4. Próxima prioridad técnica: diseñar el primer endpoint comercial solo después de obtener aprobación explícita de la matriz de roles; hasta entonces, revisar fallos de seguridad concretos, ampliar pruebas de infraestructura/auth sin cambiar la política de identidad, y preparar contrato/criterios de aceptación sin exponer rutas inseguras.
5. D1–D8 de identidad y matriz de permisos necesitan decisión del propietario. No inventar proveedor OAuth, allowlist, email/domains, bootstrap admin, vinculación de cuentas, permisos de roles ni fiscalidad.
6. No desplegar producción ni modificar Neon main hasta cumplir gates y recibir aprobación específica cuando corresponda. Mantener presupuesto $0 y no tocar datos reales.
7. Si la conversación se acerca al límite, actualizar este archivo, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` y `docs/PROJECT_PLAN.md` en una rama/PR; incluir SHA, PR/merge, checks exactos, cambios, tests ejecutados/no ejecutados, riesgos y siguiente acción concreta. Abrir PR y esperar CI; no declarar merge sin evidencia.
8. No detener el trabajo solo por falta de una respuesta de “ok”. Detenerse únicamente ante decisión de producto necesaria, riesgo alto o bloqueo real; explicar la decisión mínima requerida.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #27

> **Esta sección prevalece sobre los snapshots históricos más abajo.** Verificar de nuevo GitHub antes de usar este estado en una sesión futura.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- PR #27, [refresco del checkpoint después de PR #26](https://github.com/BTF14/Micro-app/pull/27), está fusionada. Head revisado: `29f899a52346d342067cf8e1b22850d35aa48a69`; los ocho check-runs visibles en ese head terminaron en `success`.
- Para el merge commit de `main`, los siete checks consultados terminaron en `success`: [Cloudflare Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [smoke tests Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify/CI](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [análisis JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812) y [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No había PR abiertas en la consulta posterior al merge. No se ejecutaron pruebas locales en esta sesión; la evidencia indicada es de GitHub Actions para los SHA exactos.
- Estado del producto: **no listo para producción**. La API aún no registra handlers HTTP comerciales para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de aislamiento es un plan de aceptación, no evidencia de controles en rutas inexistentes.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 siguen pendientes de aprobación; roles/permisos por operación deben definirse antes de añadir rutas de negocio; no se han verificado backups/restauración independiente; la protección de `main` estaba desactivada en la última comprobación.
- Límites mantenidos: presupuesto $0, proyecto independiente de Cantina-pos, sin secretos ni correos, sin cambios a Neon `main`, sin despliegue de producción. Strix sigue documentado, no instalado ni ejecutado.
- Próximo paso seguro: continuar la revisión del adaptador Neon sin merge ciego y preparar una matriz explícita de permisos por rol para que el primer endpoint comercial tenga pruebas positivas y negativas de aislamiento; no inventar políticas pendientes.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #26

> **Esta sección prevalece sobre todos los snapshots históricos más abajo.** Los SHA, estados de PR y enlaces de Actions antiguos que aparezcan en el resto de este archivo no representan el estado vivo actual salvo que coincidan con una verificación nueva de GitHub.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c` — https://github.com/BTF14/Micro-app/commit/a3cc3ae7533510baf2502a3f553030c2c8505a4c
- PR #24 (matriz de aislamiento tenant), PR #25 (refresco documental) y PR #26 (checkpoint documental) están fusionadas.
- PR #26: https://github.com/BTF14/Micro-app/pull/26; head `a5576ae3db9b606bbb69fa3c7f34006e6585934e`; sus siete workflows consultados terminaron en `success`.
- Para el SHA exacto de `main` `a3cc3ae7533510baf2502a3f553030c2c8505a4c`, los seis workflows consultados terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39133032751), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39133032760), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39133032817), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39133032755), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39133032686) y [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No hay PR abiertas en la consulta actual. No se desplegó producción ni se modificó Neon `main`.
- Estado de producto: **no listo para producción**. `apps/api/src/index.ts` todavía no registra handlers HTTP de negocio para catálogo/productos, proveedores, ventas, pagos o movimientos de inventario; la matriz de tenant define criterios futuros, no evidencia de endpoints ya protegidos.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 pendientes de aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última verificación; faltan flujos POS/inventario reales y pruebas de autorización completas.
- Límites: presupuesto $0, no mezclar con Cantina-pos, no secretos ni correos, no migraciones a Neon `main` sin superar el gate de `docs/CONSTITUTION.md`, no despliegue de producción sin aceptación explícita.
- Próximo trabajo seguro: abordar identidad solo tras resolver D1–D8; mientras tanto, ampliar cobertura de autorización y preparar endpoints de negocio en entorno aislado, sin inventar políticas de registro ni OAuth.

---


# Checkpoint más reciente — 2026-10-18

## Estado vivo después de fusionar PR #24

- `main` verificado en `69032a333b52ee10099c0347be3443e18f4dc4df`: [commit](https://github.com/BTF14/Micro-app/commit/69032a333b52ee10099c0347be3443e18f4dc4df).
- PR #24, [matriz de aceptación para aislamiento tenant](https://github.com/BTF14/Micro-app/pull/24), está fusionada. Los siete workflows para su head `e7856319321f1aa1047148fd782fcadb77f091c2` terminaron en `success`; los checks del merge commit son un conjunto separado y seguían parcialmente en ejecución en la última consulta.
- `apps/api/src/index.ts` registra health y auth; aún no existen handlers HTTP de negocio para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz no sustituye pruebas reales de aislamiento.
- Bloqueos vigentes: Google OAuth + allowlist y decisiones D1–D8 no aprobadas; backups/restauración independiente no verificados; protección de `main` desactivada en la última consulta; sin despliegue de producción ni mutaciones en Neon `main`.
- Antes de continuar, verificar de nuevo HEAD, PRs y Actions en vivo. No afirmar preparación de producción por tener CI verde.

## Política vigente de cambios en Neon `main`

Neon `main` ya no se considera permanentemente de solo lectura. La IA puede realizar cambios necesarios de bajo riesgo, compatibles y recuperables si confirma inequívocamente el destino, documenta la necesidad, prueba primero en entorno aislado cuando sea viable, revisa el SQL/migración, comprueba un camino de recuperación y valida después. Cambios destructivos, difíciles de revertir, masivos sobre datos financieros/inventario/usuarios, permisos/credenciales, indisponibilidad material o impacto incierto requieren aprobación explícita previa del usuario. Si el destino, respaldo o impacto no están claros, detenerse. Esta política autoriza cambios prudentes necesarios; no autoriza acciones innecesarias ni riesgos ilimitados. Detalles normativos en [Constitución](CONSTITUTION.md) y `AGENTS.md`.


> **Estado verificado:** `main` apunta a `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. En ese SHA terminaron en `success` CI, Playwright E2E, Semgrep SAST, panel de progreso, validación de migraciones y Security/Trivy. Enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39107481317), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/39107481327), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39107481311), [panel](https://github.com/BTF14/Micro-app/actions/runs/39107481301), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39107481282), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39107481281).
>
> PR #9 está fusionada: https://github.com/BTF14/Micro-app/pull/9. Su squash commit es `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`. No usar como estado actual los snapshots históricos de SHA que aparecen en secciones antiguas.
>
> **PR #10 fusionada:** panel de progreso reproducible; todos sus siete workflows terminaron en `success` en el HEAD `be146676cfaef09310c270854bf303079b209b81`. Merge commit: `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. [PR #10](https://github.com/BTF14/Micro-app/pull/10). Los checks del merge commit deben verificarse por separado.
>
> **Límites:** los tests Playwright actuales usan API simulada; no prueban la integración real API+DB. No se desplegó producción ni se mutó Neon `main`. Los perfiles `.github/agents/` son instrucciones versionadas, no prueba de subagentes activos. GGA/Ollama/Engram/Gentle-AI no están instalados ni conectados desde este chat.

# Protocolo de continuidad para IA/chat — Micro app

**Última actualización:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Rama:** `main`  
**SHA de referencia de `main` al actualizar este handoff:** `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. Verificar siempre el HEAD vivo antes de actuar.  
**Objetivo:** que una nueva IA retome el trabajo con evidencia, sin repetir solicitudes al usuario, perder decisiones ni inventar estados.

## Lectura obligatoria, en este orden

0. [Constitución del proyecto](CONSTITUTION.md) — reglas no negociables y jerarquía documental.
1. [Este handoff](HANDOFF_NEXT_CHAT.md).
2. [Plan maestro](PROJECT_PLAN.md).
3. [Diario de estado y decisiones](STATE_JOURNAL.md).
4. [Registro de recursos, herramientas y fuentes](RESOURCE_REGISTRY.md).
5. [Evaluación de Gentleman-Programming y adopción](GENTLEMAN_PROGRAMMING_EVALUATION.md).
6. [Modelo operativo de agentes](AGENT_OPERATING_MODEL.md) y perfiles en [`.github/agents/`](../.github/agents/).
7. Documentación de dominio: [API integration](API_INTEGRATION.md), [arquitectura/coste cero](ARCHITECTURE_AND_ZERO_COST.md), [esquema DB](DATABASE_SCHEMA.md), [revisión schema](SCHEMA_REVIEW.md), [inspiración](INSPIRATION.md), [seguridad](SECURITY_PLAN_2026.md), [cumplimiento](COMPLIANCE_REQUIREMENTS.md).

No asumir que un archivo está actualizado solo porque exista. Contrastar la sección de estado vigente con el código, GitHub y Actions.

## Estado histórico y verificación en vivo

- El SHA `d42daeba36d5f8027ab2ea5a417d64a873bc3a20` es histórico, no el HEAD actual de `main`.
- Referencia observada para `main` tras fusionar PR #10: `b85305d11b59b138cd2b6a5e4c796d19ef2cff59`. En PR #10, los siete workflows pasaron en su HEAD `be146676cfaef09310c270854bf303079b209b81`; los checks del merge SHA deben consultarse por separado.
- PR #11 (`docs/refresh-handoff-current-state`) está abierta mientras se actualiza este documento. En el HEAD previo `26808cc778489f7ad0867510e800cd2ac2d68bdd`, seis workflows observados finalizaron en `success`; el estado del PR y los checks del nuevo HEAD deben verificarse antes de integrar.
- PR #4 (autenticación inicial y sesiones revocables), PR #8 (panel), PR #9 (SDD) y PR #10 (reproducibilidad del panel) están fusionadas. Verificar PRs y ramas en vivo antes de rescatar trabajo.
- Rama `feat/neon-transaction-adapter` observada previamente en `7989a84e39536029819735a5202f3934a8eb12c3`; no fusionar a ciegas. Comparar contra `main`, separar cambios únicos y probar con PostgreSQL efímero.
- Las ramas listadas en el historial pueden haber avanzado o sido eliminadas; consultar GitHub antes de basarse en sus SHA.
- El frontend de registro/login se conectó a la API en un commit previo; inspeccionar el código actual antes de modificarlo.

## Bloqueos y tareas prioritarias

### P0 — identidad/autorización incompleta respecto al requisito

La revisión estática de `apps/api/src/auth.ts` encontró `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`; en ese archivo no se encontró Google OAuth, allowlist ni verificación de email. La prueba `apps/api/src/auth.integration.test.ts` no acredita toda la matriz de autorización. Esto es un hallazgo de revisión estática, no una ejecución de prueba adicional.

Próximo paso: estudiar el modelo de identidad y requisitos existentes, proponer una implementación segura de Google + allowlist, documentar opciones y pruebas, sin inventar proveedor/configuración ni enviar correos. No declarar identidad completa hasta que código y tests lo demuestren.

### Integración Neon

Revisar `feat/neon-transaction-adapter` frente a `main`, identificar commits/archivos únicos y cambios ya superados; separar lo rescatable, probar con PostgreSQL efímero y abrir PR solo después de revisión y CI.

### Herramientas y memoria

Leer [GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md). Se inspeccionaron los README de Gentle-AI, Engram, GGA, Gentle Shell y Playwright. **No se han instalado ni integrado las herramientas Gentleman**, y no hay evidencia de subagentes autónomos corriendo en segundo plano. Los perfiles locales son instrucciones reutilizables, no ejecución efectiva.

## Restricciones no negociables

- Proyecto independiente de Cantina-pos y de otros repositorios.
- Presupuesto total objetivo **$0**. No habilitar billing, tarjetas, suscripciones ni servicios con cobro automático.
- No ejecutar migraciones ni SQL mutante en Neon `main`; usar PostgreSQL efímero o rama aislada.
- No desplegar producción ni realizar cambios irreversibles sin aceptación del usuario.
- No versionar ni exponer secretos, credenciales, tokens ni URLs de conexión.
- No enviar correos: solo el usuario puede autorizar su envío.
- No pedir que repita permisos/conexiones si no se ha demostrado un bloqueo concreto.
- El usuario autorizó cambios/commits/push seguros de forma autónoma; mantener guardrails para acciones de alto riesgo.
- No declarar tests verdes sin verificar el SHA exacto, el workflow y su conclusión.
- No afirmar que una herramienta/agente/memoria está activa sin evidencia observable.

## Protocolo obligatorio para cada sesión

1. Consultar HEAD actual de `main`, ramas, PR abiertos y Actions relevantes; este handoff es un snapshot, no una fuente viva.
2. Leer el código y documentos directamente afectados. No hacer cambios basados únicamente en resúmenes antiguos.
3. Registrar hipótesis por separado de hechos confirmados. Si falta evidencia, escribir “no verificado”.
4. Elegir un cambio acotado, con criterio de aceptación y plan de reversión.
5. Ejecutar tests relevantes. Registrar comando, resultado, SHA y limitaciones; no inventar ejecución local si solo corrió CI.
6. Revisar seguridad, coste y posibles efectos secundarios.
7. Hacer commit/push si el cambio es seguro y autorizado; nunca force-push ni cambiar producción por comodidad.
8. Actualizar diario, plan y handoff antes de cerrar, incluyendo SHA nuevo y enlaces de Actions.
9. Si se descubre contradicción, resolverla con evidencia y añadir una nota de corrección; no dejar dos instrucciones vigentes en paralelo.

## Prompt copiable para el próximo chat

> Continúa el proyecto Micro app en https://github.com/BTF14/Micro-app. Antes de cambiar código, lee completos `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md` y `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`; luego verifica en vivo el HEAD de main, ramas, PR y GitHub Actions. No confíes en snapshots viejos sin verificarlos. El requisito P0 es reconciliar autenticación Google + allowlist con el código actual; la rama feat/neon-transaction-adapter requiere diff completo, no merge ciego. Investiga Gentle-AI, Engram, Gentleman Guardian Angel, Gentle Shell y Playwright según la evaluación, pero no digas que están instalados o que hay subagentes corriendo si no hay evidencia. Haz cambios seguros, pruebas reales y push cuando proceda; actualiza documentación y registra SHA/resultados. Mantén el coste $0, no mezcles Cantina-pos, no mutar Neon `main` fuera del gate de `docs/CONSTITUTION.md`, no despliegues producción, no expongas secretos ni envíes correos. No me pidas repetir conexiones/permisos salvo bloqueo demostrado. Distingue hechos, hipótesis y tareas pendientes; no alucines estados.



## Implementación Gentleman-Programming — checkpoint 2026-10-18

- Commit de implementación: `ae0c189487b37d910184b0b5cfa058ddbb6919d4` ([ver en GitHub](https://github.com/BTF14/Micro-app/commit/ae0c189487b37d910184b0b5cfa058ddbb6919d4)).
- Se añadió `.gga` configurado para Ollama local, `docs/GENTLEMAN_IMPLEMENTATION.md` y un enlace desde README.
- Esto es una primera integración versionada, **no** una instalación activa: GGA, Ollama, el modelo, Engram y Gentle-AI no se han ejecutado en este entorno. No se activó un hook local ni se instaló software en el dispositivo del usuario.
- En el momento de registrar el checkpoint, CI, validación de migraciones y escaneo de seguridad estaban `in_progress` para el SHA de implementación. Comprobar sus conclusiones actuales en los enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39103745784), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39103745734), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39103745953). No reutilizar este estado como si fuera el resultado final.
- Siguiente paso: confirmar Actions del SHA exacto; después, validar instalación y prueba de GGA/Engram en un terminal local o entorno compatible y continuar Gentle-AI. Mantener $0, no activar proveedor de pago, y documentar cada comando/resultado observable.


## Checkpoint nuevo — herramientas de seguridad y E2E (2026-10-18)

Este bloque es más reciente que los snapshots históricos de arriba. PR [#6](https://github.com/BTF14/Micro-app/pull/6) contiene los cambios de la rama `feat/security-e2e-tooling`. Para el SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`, CI, migración, Security scan, Semgrep y Playwright E2E terminaron en success; verificar el SHA más reciente si hubo commits posteriores:

- `apps/web/playwright.config.ts` + `apps/web/e2e/auth.spec.ts`: dos pruebas de navegador (login exitoso y error de registro) con API simulada.
- `.github/workflows/playwright-e2e.yml`: instala Chromium y ejecuta Playwright; runner `@playwright/test@1.55.0` se instala temporalmente para no editar el lockfile en esta operación. No es aún una dependencia versionada del workspace.
- `.github/workflows/semgrep.yml`: análisis estático JS/TS y reporte SARIF como artefacto; terminó en success para el SHA indicado, pero no bloquea merges.
- `docs/OWASP_ASVS_CHECKLIST.md`: controles P0/P1/P2 que deben seguir sin marcar hasta aportar evidencia.
- `docs/POS_REFERENCE_MATRIX.md`: traduce investigación de OSPOS/NexoPOS/Lakasir/POSNext en criterios de aceptación.

Después de la fusión, verificar los workflows del commit nuevo de main y actualizar este handoff con sus resultados. Próximo paso técnico: fijar Playwright en el workspace y actualizar `pnpm-lock.yaml` mediante pnpm 10 en un entorno ejecutable; luego ampliar E2E y cubrir auth/allowlist real. Google OAuth + allowlist siguen siendo P0. No migrar Neon main ni desplegar producción.


## Prompt de inicio para cualquier IA nueva

> Trabaja exclusivamente en `BTF14/Micro-app`. Antes de tocar código, lee `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/AI_CONTINUITY_PROTOCOL.md` y los documentos de dominio relevantes. Verifica en vivo el SHA de `main`, PRs, ramas y Actions para el SHA exacto. Sigue `docs/ODD_WORKFLOW.md`; para trabajo sustancial/crítico crea un único registro desde `odd/TASK_TEMPLATE.md`. Preserva coste $0; no mezcles Cantina-pos; no expongas secretos; seguir el gate de `docs/CONSTITUTION.md` para Neon `main` y no desplegar producción sin aceptación explícita. Los perfiles `.github/agents/` no prueban que existan subagentes activos. Distingue hechos, inferencias y pendientes. No pidas repetir permisos o contexto ya documentado salvo bloqueo concreto. Al terminar, actualiza plan, diario, handoff y registro de recursos según corresponda, y proporciona enlaces a commits/PR/checks.


## Checkpoint — política de respaldo y recuperación (2026-10-18)

- PR #13 fusionada: https://github.com/BTF14/Micro-app/pull/13; merge SHA `3d8b571f1d6ed3478bf3cf6182c412d3282db586`. Los siete workflows consultados para el HEAD exacto del PR `e03d224f8aded9534db375068f3ae5cac0db8a60` finalizaron en success: CI, Playwright E2E, Semgrep SAST, Security scan, validación de migraciones, validación SDD/documentación y dashboard. Esto valida ese HEAD del PR, no el merge SHA ni producción.
- La regla de Neon `main` se actualizó con gate de cambios necesarios y guardrails. No se ejecutó SQL, no se aplicó migración ni se modificó Neon.
- Nueva política: [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md). El backup diario es el objetivo de automatización; la revisión de salud y recuperación será cada 15 días. No se ha habilitado aún backup automático.
- Fuente oficial Neon revisada el 2026-10-18: Free ofrece historial PITR de hasta 6 horas (máximo 1 GB) y una snapshot manual; los backups programados no están disponibles en Free. No considerar PITR como sustituto de un backup independiente.
- Bloqueo de backup: aún no se ha verificado un destino independiente, privado, cifrado y gratuito ni una restauración real. No almacenar dumps de producción en Git ni artefactos improvisados. Diseñar, probar en PostgreSQL desechable y confirmar coste/retención antes de activar.
- No desplegar producción ni declarar recuperación lista hasta que una restauración aislada se haya ejecutado y documentado.


## Checkpoint actual — 2026-10-18 (PR #14 y evaluación Drive)

Este bloque es más reciente que los snapshots históricos anteriores; si contradicen este bloque, verificar el estado vivo y aplicar la política vigente de `AGENTS.md` y `docs/CONSTITUTION.md`.

- PR [#14](https://github.com/BTF14/Micro-app/pull/14) está fusionada por squash en `main`, merge SHA `9480f84d8b7d28e830d0fd57212d29a75e44afbb`.
- Se verificaron siete workflows de PR #14 en el HEAD exacto `b421e74631db3c21addd032f2bfbd780b935585d`: CI, Playwright E2E, Semgrep SAST, Security scan, validación de migraciones, validación SDD/documentación y dashboard; todos terminaron en `success`. Esto valida el HEAD del PR, no sustituye la verificación de checks del merge SHA ni prueba backup/restore.
- La política de backups está documentada en [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md); automatización y restauración siguen **no implementadas/no verificadas**.
- Google Drive se investigó como posible destino $0. Conclusión: candidato viable condicionado, no seleccionado ni configurado. Véase [GOOGLE_DRIVE_BACKUP_EVALUATION.md](GOOGLE_DRIVE_BACKUP_EVALUATION.md). Los 15 GB de una cuenta personal se comparten entre Gmail/Drive/Photos; OAuth persistente, espacio disponible y capacidad de restauración requieren validación. No habilitar facturación.
- No se accedió a la cuenta Google, no se generaron credenciales, no se descargó una base real y no se modificó Neon ni se desplegó producción.
- Próximo paso: crear una prueba automatizada con PostgreSQL desechable y datos sintéticos; validar cifrado, OAuth/upload/download, checksum, restore y alertas antes de activar cualquier copia real. Luego actualizar el handoff con SHA de main y resultados de Actions verificados.


## Continuidad vigente — respaldo pendiente y siguiente prioridad (2026-10-18)

- `main` observado después de integrar evaluación documental: `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`.
- PR [#15](https://github.com/BTF14/Micro-app/pull/15) se fusionó con squash; merge SHA `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`. La evaluación de Google Drive está versionada, pero Drive sigue siendo una opción pendiente, no un destino seleccionado ni configurado. No hay backup automático ni restauración verificada; no se accedió a Google, no se crearon credenciales, no se exportaron datos reales ni se modificó Neon.
- Para el HEAD de PR #15 `adc636732c24f74d3d6457a93af665647a00e097`, los workflows consultados (CI, Security scan, Semgrep, Playwright E2E, validación de migraciones y dashboard) finalizaron en success. Esta evidencia es del HEAD del PR, no demuestra backup/restauración real ni certifica por sí sola el merge SHA.
- Los workflows disparados para el merge SHA aún estaban ejecutándose en la última consulta; reconsultar antes de informar estado final.
- Siguiente prioridad de producto: cerrar revisión del requisito P0 Google Sign-In + allowlist sin inventar decisiones de política. PR [#12](https://github.com/BTF14/Micro-app/pull/12) es solo propuesta SDD y sigue abierto; D1–D8 continúan sin resolver, así que no iniciar implementación OAuth ni inventar allowlist/credenciales. Reconciliar primero estado del PR y la evidencia de CI.
- La rama `feat/neon-transaction-adapter` está divergida de `main`: 14 commits exclusivos y 31 commits detrás según comparación actual. `apps/api/src/database.ts` ya existe en `main` y su contenido coincide con el inspeccionado en la rama; no fusionar esa rama. Revisar únicamente archivos/cambios exclusivos restantes y rescatar de forma selectiva si aportan valor.
- Respaldo: continuar diseñando una prueba sintética/restauración aislada cuando haya entorno ejecutable. No usar datos reales, no almacenar dumps en Git/artefactos y no anunciar el backup como activo hasta probar destino, cifrado, checksum, alerta, retención y restore.
- Guardrails vigentes: presupuesto $0, no mezclar Cantina-pos, no revelar secretos, no desplegar producción, y para Neon `main` aplicar el gate de `docs/CONSTITUTION.md`; detenerse ante impacto/destino/respaldo incierto.


## Checkpoint verificado — PR #16 revisión de autenticación (2026-10-18)

- PR [#16](https://github.com/BTF14/Micro-app/pull/16) fusionada por squash. Merge SHA: `8f3a0316519dd39aded179bb234de316c83bb8ee`.
- El cambio añade `docs/reviews/AUTHENTICATION_AUTHORIZATION_GAP_REVIEW_2026-10-18.md`; es una revisión documental estática, no modifica código de aplicación, secretos, Neon ni producción.
- Para el HEAD exacto del PR `e52033d15c4f37ac862d44a5f06097642a95d75d`, estos seis workflows terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39110161670), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39110161665), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39110161643), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39110161698), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39110161635), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39110161660). Son resultados del HEAD del PR, no una prueba de producción ni de OAuth.
- Hallazgo P0 confirmado por inspección estática: el registro actual permite crear una organización y asignar rol `owner` sin verificar una allowlist; Google OAuth/allowlist no están implementados en `apps/api/src/auth.ts`. Corregir antes de usuarios/datos comerciales reales.
- PR [#12](https://github.com/BTF14/Micro-app/pull/12) ya está fusionada con diseño SDD para Google Sign-In + allowlist (merge SHA `a28bbc686c7b1cb9cbe615ef5bcb9c7ece45ede3`), pero decisiones D1–D8 siguen pendientes. No iniciar OAuth ni inventar reglas, credenciales, dominios o administradores.
- Siguiente: actualizar/reconciliar el estado vivo de main y Actions; resolver D1–D8 mediante evidencia del proyecto y decisiones explícitas necesarias; luego implementar con SDD, pruebas de allowlist, sesiones, roles y aislamiento tenant. Mantener backup externo y restauración como pendientes: no hay backup automático activo ni restore real probado.


## Checkpoint vigente — continuidad verificada 2026-10-18 (PR #16)

- HEAD verificado de `main`: `c092f0a68054dd8cb4c1d1d2d506e8c1bb66b614`. La rama principal ya contiene el merge de PR #16 y las actualizaciones del diario.
- PR [#16](https://github.com/BTF14/Micro-app/pull/16) está fusionada; merge SHA `8f3a0316519dd39aded179bb234de316c83bb8ee`. Su revisión documental es estática, no un pentest ni una ejecución de tests.
- Para el SHA exacto de `main` `c092f0a68054dd8cb4c1d1d2d506e8c1bb66b614`, GitHub Actions confirma al menos CI y Playwright E2E en `success`; verificar también los demás workflows asociados al mismo SHA antes de declarar la matriz completa de checks.
- La revisión AUTH-01 confirma por lectura que `POST /auth/register` crea usuario, organización, membresía `owner` y sesión sin consultar allowlist. No habilitar usuarios ni datos comerciales con ese flujo como si fuese acceso cerrado.
- La PR #12 era un diseño SDD para Google Sign-In + allowlist, no implementación. La búsqueda de PR abiertas en la última consulta no devolvió ninguna; comprobar su estado histórico y recuperar el documento de diseño antes de decidir el siguiente cambio. No asumir que D1–D8 fueron resueltas.
- Próximo trabajo: recuperar las decisiones D1–D8 del diseño, convertirlas en opciones explícitas y detectar cuáles se pueden cerrar usando requisitos ya documentados sin preguntar al usuario; mantener sin implementar OAuth/allowlist hasta que las decisiones de producto imprescindibles estén confirmadas.
- Respaldo: sigue sin existir evidencia de backup externo automatizado ni restauración probada. Mantenerlo como pendiente; coste total objetivo $0, no guardar dumps en Git ni Actions artifacts.
- No se modificó Neon, no se tocaron secretos ni se desplegó producción.


## Continuidad — Strix añadido al plan (2026-10-18)

- Documento: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md), enlazado también desde el plan maestro, registro de recursos y plan de seguridad.
- Estado: documentación únicamente. Strix no está instalado ni ejecutado; no hay informe de evaluación.
- Próximo paso condicionado: cerrar auth/allowlist P0 y disponer de API + PostgreSQL efímero; luego probar en laboratorio aislado con datos sintéticos y coste $0 comprobado. Nunca usar producción, Neon main o sistemas ajenos.
- Requiere Docker y proveedor LLM; no activar facturación ni integrar ejecución en CI sin revisar coste, permisos y alcance. Mantener informes sin secretos y revisar hallazgos manualmente.
- PR de Strix separada de PR #19; comprobar el estado de ambas en GitHub antes de integrar.


## Checkpoint de continuidad actualizado — 2026-10-18 (PR #19 y #20)

**HEAD vivo de `main` verificado:** `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Este SHA es la referencia al momento de esta actualización; volver a consultar GitHub antes de actuar.

### Integraciones documentales recientes
- PR [#20](https://github.com/BTF14/Micro-app/pull/20), `docs: plan controlled Strix security testing`, fusionada. Merge SHA anterior: `c87361685ef1ce36e4cf6025124b09e70ffa0846`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19), `docs: make authentication policy decisions explicit`, también fusionada. Merge SHA: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- En el SHA actual de `main` `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`, GitHub Actions devolvió éxito para CI, Playwright E2E, validación de migraciones, Semgrep SAST, Security scan y panel de progreso. Enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [panel](https://github.com/BTF14/Micro-app/actions/runs/39129579631). Esto no es prueba de producción ni de pentest dinámico.

### Strix: intención y límites
- La documentación de Strix existe en [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md), enlazada desde plan, registro de recursos y plan de seguridad.
- El usuario pidió documentar e implementar conocimiento reutilizable para que otra IA/chat sepa **qué es Strix, cuándo conviene usarlo y cómo hacerlo con seguridad**; no pidió ejecutarlo de inmediato.
- Estado real: Strix **no está instalado ni ejecutado**, no se escaneó Micro app, no hay informe, no se conectó un proveedor LLM ni se creó un workflow de Strix en CI.
- Usarlo cuando API + PostgreSQL efímero/datos sintéticos estén disponibles, tras aclarar el bloqueo P0 de autenticación/allowlist. Antes de cualquier escaneo confirmar destino autorizado, aislamiento, Docker, proveedor LLM de coste $0 y redacción de informes. No usar producción, Neon main, datos reales ni sistemas de terceros. No añadir CI activa por defecto.

### Decisiones de autenticación
- PR #19 documenta opciones para decisiones D1–D8 como propuestas, **no política aprobada**. Leer el registro de decisiones en el repo antes de diseñar la implementación.
- Hallazgo estático P0 previamente documentado: `POST /auth/register` permite crear usuario/organización/membresía owner/sesión sin comprobación de allowlist; Google OAuth/allowlist no constaban en `apps/api/src/auth.ts`. Revalidar en código actual antes de tocarlo. No inventar correos admin, dominios permitidos, política de vinculación ni credenciales.

### Otras tareas y límites vigentes
1. Revisar el estado actual de ramas/PRs y comparar `feat/neon-transaction-adapter` selectivamente; nunca hacer merge ciego de una rama divergida.
2. Resolver requisitos de identidad y autorización con las decisiones de producto documentadas; después implementar con SDD y pruebas reales, incluida separación entre tenants.
3. Preparar PostgreSQL efímero para pruebas API+DB; Playwright actual usa API simulada y no demuestra integración real.
4. Diseñar y probar backup/restore con datos sintéticos y destino independiente gratuito; no hay backup automático ni restauración real verificada.
5. No declarar producción lista ni desplegar sin cumplir los gates del proyecto.

### Prompt de arranque para el próximo chat
> Continúa exclusivamente https://github.com/BTF14/Micro-app. El chat anterior alcanzó el límite de duración, por lo que este handoff es el traspaso de contexto. Lee primero `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, el registro de decisiones de autenticación y `docs/STRIX_INTEGRATION.md`. Luego consulta en vivo HEAD de main, PRs, ramas y Actions; el SHA anotado aquí es solo un snapshot. PR #19 y #20 ya estaban fusionadas al actualizar este documento; verifica que siga siendo así. El usuario autorizó avanzar autónomamente con cambios seguros, documentación, pruebas, PR/merge y push cuando sea prudente; no pidas repetir permisos/conexiones sin bloqueo concreto. Mantén coste $0, no mezcles Cantina-pos, no expongas secretos, no envíes correos ni despliegues producción. No ejecutes Strix todavía: está documentado, no instalado ni ejecutado; usarlo más adelante solo en laboratorio autorizado, aislado y con datos sintéticos, tras confirmar proveedor LLM sin coste. No mutar Neon main fuera del gate de la Constitución. Prioriza auth/allowlist P0 y decisiones D1–D8 sin inventar políticas; PostgreSQL efímero y pruebas API+DB son necesarios. Backup/restore sigue sin estar activo/verificado. Distingue hechos de hipótesis, verifica checks contra SHA exacto y actualiza plan, diario, registro y handoff al cerrar trabajo.


## Verificación viva de continuidad — 2026-10-18 (sesión actual)

- Consultado GitHub API en vivo: `main` = `1228a43cb4bc5e1ef8aabb548b034a0af97ec253` (confirmado en `GET /repos/BTF14/Micro-app/branches/main`). La rama no tiene protección activa ni checks requeridos configurados (`protected=false`); registrar como riesgo de gobernanza, no cambiarlo sin evaluación.
- PR [#21](https://github.com/BTF14/Micro-app/pull/21) sigue **open**, `merged=false`, base `main`, head `fb9ab271cc8b1c72e92d7874672913698c59bfe7`. No declarar fusión por el campo `merge_commit_sha` que aparece en el objeto; el estado explícito es open/no merged.
- Para ese HEAD exacto, CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan y Project progress dashboard terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129938686), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129938460), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129938520), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129938702), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129938471), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129938467). Los status checks clásicos para ese SHA devolvieron cero; usar los workflows asociados al SHA como evidencia.
- El comentario de Codex informa revisión fallida/hallazgos sin resolver para `fb9ab271...`, pero no hay review formal ni comentarios inline recuperables y el bot indica límite de uso. Esto no prueba un defecto concreto ni permite ignorar el aviso: revisar manualmente el diff y no fusionar hasta aclarar/registrar la limitación. La preview de Cloudflare es solo preview de rama, no producción.
- El listado vivo de PR abiertas devuelve únicamente PR #21. Las ramas consultadas incluyen `main`, `docs/handoff-next-chat-2026-10-18`, `feat/neon-transaction-adapter`, `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `feat/security-e2e-tooling`, `sdd/google-signin-allowlist-design` y ramas documentales; los nombres/heads deben reconsultarse antes de usarlos.
- Revisión actual de `apps/api/src/auth.ts` en main (blob SHA `0735dbad34bd5c932852882da0bff6eebbab337a`): las rutas existentes incluyen registro por contraseña que crea usuario, organización, membresía `owner` y sesión en una transacción; no hay Google OAuth ni allowlist en ese archivo. `apps/api/src/auth.integration.test.ts` sí usa PostgreSQL real/efímero en CI para el flujo contraseña/sesión, pero solo cubre un escenario integrado y no prueba OAuth, allowlist ni aislamiento cross-tenant completo.
- D1–D8 permanecen propuestas no aprobadas en `docs/sdd/auth-policy-decision-record.md`; no se debe inventar email, dominio, bootstrap administrativo, política de organización ni vinculación de cuentas. Por tanto, el cambio OAuth/allowlist completo sigue bloqueado por decisiones de producto; la P0 no está resuelta.
- Strix permanece documentado únicamente; no instalado, ejecutado ni usado para escanear Micro app. No cambiar este estado sin evidencia de instalación/ejecución aislada y coste $0.
- Neon `main`, datos reales, credenciales y producción no se tocaron. No se envió correo ni se habilitó facturación.

## Estado posterior a la fusión — 2026-10-18

- PR [#21](https://github.com/BTF14/Micro-app/pull/21) se fusionó por squash tras autorización del usuario. Merge commit: `7491b97a2bde52555fe9b8a5d808ad81b829d90e`; GitHub confirmó `merged=true` y `state=closed`.
- La fusión solo incluye documentación: handoff, plan, diario y registro de recursos. No desplegó producción ni modificó Neon, secretos o datos reales.
- Los 7 workflows de Actions habían terminado en `success` para el HEAD de la PR `46d5a9a0ec40a699176dc4109943cd7f7bfa4ad1`. El aviso de revisión Codex fue una ejecución fallida sin detalle técnico recuperable; no equivale a aprobación formal.
- La verificación posterior confirmó que `main` avanzó un commit desde `1228a43cb4bc5e1ef8aabb548b034a0af97ec253` mediante la fusión indicada. Consultar GitHub en vivo antes de la siguiente operación.


## Continuidad viva — 2026-10-29 UTC: PR #140/#142 fusionadas

- PR [#140](https://github.com/BTF14/Micro-app/pull/140) fusionada por squash, commit `4fe2b00ed45cf5b779f44b65bcd00133745760e3`.
- PR [#142](https://github.com/BTF14/Micro-app/pull/142) fusionada por squash, commit/HEAD de `main` `c87893313534049463917af5ee17dfd36ba319c4`.
- Checks post-merge en ese SHA: verify/CI, Chromium authentication, migración PostgreSQL, análisis estático, Trivy, escaneo de historial, Semgrep, Playwright E2E, Cloudflare Pages y Workers: todos `success`. No equivale a validar recuperación de datos reales ni a probar endpoints comerciales aún inexistentes.
- La prueba sintética poblada pasó en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, relaciones y exclusión de tablas efímeras. Siguen pendientes RPO/RTO de extremo a extremo, alerta de fallo y confirmación de coste $0; esto no equivale a restaurar una copia real.
- No abrir PR adicionales para documentar cada micro-paso; integrar test, workflow y continuidad en una sola PR coherente. Si el test falla, inspeccionar logs, corregir la causa en esta misma rama y repetir.


## Handoff vivo — 2026-10-29 UTC, después de PR #143

- Main: `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`. PR [#140](https://github.com/BTF14/Micro-app/pull/140), [#142](https://github.com/BTF14/Micro-app/pull/142) y [#143](https://github.com/BTF14/Micro-app/pull/143) están fusionadas.
- Todos los checks post-merge de #143 en ese SHA terminaron en `success`: CI/verify, Playwright, PostgreSQL migration, análisis estático, Trivy, scan de historial, Cloudflare Pages y Workers.
- El smoke test sintético de recuperación [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) pasó en el SHA de PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Incluye PostgreSQL 17 efímero, fixture de venta/pago/inventario/auditoría, age efímero, checksum, restore, manifiesto de 13 tablas/constraints/relaciones y exclusión de tablas efímeras. No usa secretos, Neon ni datos reales.
- Pendientes reales de backup: medir RPO/RTO de extremo a extremo; validar alerta de fallo y el coste $0; la prueba sintética no sustituye restaurar una copia real poblada.
- Monitor diario: [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) pasó en SHA anterior y el audit no encontró vulnerabilidades conocidas. Detectó versiones mayores pendientes (Vite 8, plugin React 6, jsdom 30, TypeScript 7); no actualizarlas a ciegas. Las versiones compatibles Wrangler 4.155.0 y workers-types 5.20261029.1 ya se fusionaron en #142. La rama `fix/dependency-watch-report-20261029` es redundante (0 ahead, 4 behind; workflow idéntico a main); no abrir PR desde ella.
- Próxima prioridad: cuando haya evidencia y compatibilidad suficientes, evaluar el conjunto de upgrades mayores en una rama coherente. Antes, revalidar registry/advisories y compatibilidad con Node 24, Vite, Vitest, React plugin y lockfile; conservar `undici@7.30.1`. No cambiar pnpm major ni introducir pre-releases sin autorización.


## Immediate continuation — fix failed encrypted backup (2026-10-29)

1. PR branch `fix/backup-workflow-path-20261029` contains the minimal workflow fix: use absolute checked-out script path `$GITHUB_WORKSPACE/scripts/prune_backups.py` after changing into the backup clone, and pin runner to `ubuntu-24.04` for a stable, known runner image.
2. Failure evidence: [run 40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763). Dump, age encryption and checksum succeeded; a commit was made only in the ephemeral clone. The path error happened before push; no new backup was persisted and retention did not run.
3. Inspect diff and PR checks at exact head SHA. Do not merge if required checks fail or are unverified. Then merge only if repository policy/gates allow it.
4. After merge, manually dispatch the backup workflow once. Verify run conclusion `success`, a new timestamped encrypted file and matching checksum in private repository `BTF14/micro-app-backups/daily/`, and retention output. Never share tokens or the age private key. Existing backups must remain intact if any step fails.
5. Continue pending backup work only after this is verified: failure-alert validation, RPO/RTO measurement, and cost-$0 confirmation. Synthetic restore CI does not prove a fresh production backup was uploaded.


## Immediate continuation — pg_dump PostgreSQL 18 mismatch (2026-10-29)

- Run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) failed before dump creation: Neon is PostgreSQL 18.6; command resolved to pg_dump 16.15. Encryption/upload/retention did not run; remote backups were untouched.
- Corrective branch `fix/backup-pg-dump-v18-20261029` installs `postgresql-client-18`, calls `/usr/lib/postgresql/18/bin/pg_dump` explicitly and asserts the major version is 18.
- Inspect exact diff and required PR checks; do not merge with failing or unverified required checks. After merge, dispatch backup workflow and verify dump generation, age encryption, SHA-256, remote file/checksum in private repo, retention output and final success. Never share secrets or private age key.


## Immediate continuation — backup run #7 missing checkout (2026-10-29)

- Run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) used pg_dump 18.6 successfully, created the dump, encrypted it and generated SHA-256, then failed because `$GITHUB_WORKSPACE/scripts/prune_backups.py` was absent.
- Root cause: workflow did not use `actions/checkout`; the script exists in repository `main`, but runner workspace was not populated. Fix on branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` before installing/running backup steps.
- Verify diff and required checks; after merge, manually run backup once. Confirm success, remote encrypted file + checksum in private repo, and retention output. Do not share secrets or age private key, and do not delete existing backups during troubleshooting.


## Backup success verified — 2026-10-29

- Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) completed `success`. Logs explicitly show `pg_dump 18.6`, successful dump and age encryption, SHA-256 sidecar, remote backup commit `2b038bd` pushed to `BTF14/Micro-app-backups` (GitHub notes canonical repository URL is now `BTF14/Micro-App-backups`), and retention deleted zero files.
- Persisted pair: `daily/backup-2026-10-29T17-29-48Z.dump.age` and `daily/backup-2026-10-29T17-29-48Z.dump.age.sha256`.
- Do not ask user to rerun backup immediately. Next work should be planned: safely verify remote file and checksum, validate backup failure alerting, assess restore procedure using a disposable target and secure age private key without sharing it, then measure RPO/RTO and confirm cost. Do not claim production restore was tested by the synthetic CI test.


## Continuidad prioritaria — main posterior a PR #155 (2026-10-29 UTC)

- Main: `5a9bdc5a18a54c3c68639f52125d913d4e725b91`.
- PR #155 fusionada; la corrección HTTPS de Google OAuth está en main. Ocho workflows del SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9` terminaron success (CI, E2E, migraciones, SAST, security, dependency review, secret scan, dashboard). CI incluye build/typecheck, unit y PostgreSQL auth integration tests. Codex review falló por límite de uso; no declarar revisión independiente.
- Cloudflare generó previews de Pages y Workers; no es producción. No despliegue manual.
- PR #154 sigue abierta pero stale/no mergeable. PR #156 reconcilia documentación y plan; no crear otra PR para los mismos cambios.
- Antes de programar productos/inventario/ventas: terminar inventario del esquema, consultas, FKs, índices y rutas; diseñar organización → sucursales → membresías/permisos; decidir catálogo compartido y stock/caja por sucursal; obtener aprobación explícita de la matriz de roles.
- No implementar permisos de negocio a partir de la matriz no aprobada. No añadir branch_id aislado.
- No tocar Neon main, secretos, datos reales ni producción. No activar recursos de pago. Capacidad por tenants aún no medida; comprobar cuotas Neon/Cloudflare y pruebas sintéticas antes de fijar límites.
- Producción continúa NO lista; faltan rutas comerciales, autorización por operación, aislamiento cross-tenant probado, integridad/idempotencia/concurrencia, BCV/fiscalidad y recuperación operativa completa.

---

## Continuidad 2026-10-30 — políticas comerciales configurables por organización

- Leer `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md` antes de continuar el diseño de ventas.
- Cada organización decide sus propias políticas comerciales, incluidos descuentos, límites y aprobaciones. Micro app no debe imponer porcentajes ni importes universales.
- La plataforma aporta configuración segura, versionado, aplicación server-side, aislamiento por organización y snapshots/auditoría por operación.
- La matriz `docs/sdd/role-permission-decision-matrix.md` sigue NO APROBADA; no implementar permisos comerciales ni asumir quién puede administrar políticas hasta resolverla.
- La rama `docs/org-policy-architecture-20261030` parte de main `4ab229296d8858c8c553e00a633a762b9c26a81b`. Verificar el HEAD y el estado vivo de la PR antes de actuar.
- Siguiente secuencia: (1) revisar diff y checks de esta PR; (2) consolidar ERD organización→sucursal→almacén/caja/turno con FKs tenant-scoped; (3) resolver la matriz de roles; (4) diseñar integridad/idempotencia/auditoría; (5) solo después preparar una PR de código/migraciones/tests con PostgreSQL efímero.
- No ejecutar migraciones en Neon main ni desplegar producción.


# Reanudación inmediata — 2026-10-30 UTC — branch scope

**Rama:** `feat/branch-scope-context-20261030`  
**Base:** `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`.  
**PR:** [#165](https://github.com/BTF14/Micro-app/pull/165), abierta; revalidar estado y HEAD en vivo.

- #164 está fusionada. Cualquier bloque histórico que la describa como abierta queda supersedido por el estado vivo de GitHub y el checkpoint de esta sección.
- Alcance autorizado: owner/admin organización-wide; cashier/inventory solo sucursales con asignación activa. No se aprobaron permisos comerciales sensibles ni excepciones.
- Archivos: `apps/api/migrations/0003_branch_scope.sql`, `0003_branch_scope.assertions.sql`, `apps/api/src/branch-context.ts`, `branch-context.test.ts`, `.github/workflows/migration-check.yml` y `docs/sdd/BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md`.
- `resolveBranchContext` requiere un TenantContext previamente validado en servidor; verifica sucursal activa dentro del tenant y asignación activa para cashier/inventory. No está conectado a handlers y no autoriza operaciones.
- HEAD de implementación verificado `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b`: todos los checks (incluidos CI, PostgreSQL branch integration, postgres-migration, Chromium, Semgrep, Trivy, secret-history, dependency review, backup smoke, Pages y Workers preview) success; PR mergeable/clean. Revalidar el SHA actual después de la sincronización documental y comprobar reviews/threads antes de integrar. Codex review falló por cuota agotada; no reintentar. No hay review humana ni threads; usar revisión manual completa como fallback.
- La migración solo se ejecuta en PostgreSQL 18 efímero de CI. No ejecutar en Neon main ni sobre datos reales.
- Próximo trabajo: cerrar decisiones de caja/turnos y matriz de permisos por operación; después diseño de stock por almacén y reconciliación. No crear rutas comerciales hasta cerrar gates.
- Para continuar: leer AGENTS.md, WORK_CHECKPOINT.md, CURRENT_STATE.md, HANDOFF_NEXT_CHAT.md, PROJECT_PLAN.md y STATE_JOURNAL.md; revalidar main/PR/Actions en vivo.

- CI aplica 0003 a PostgreSQL efímero y ejecuta el test de integración del resolver; el workflow separado `postgres-migration` también aplica 0003 y sus assertions SQL. Comprobar ambos en el HEAD final.

- Endurecimiento adicional de la rama: el resolver ahora vuelve a validar organización, usuario y membresía activos y exige que el rol DB coincida con el TenantContext; integración cubre revocación y cambio de rol. La evidencia de checks del HEAD anterior queda supersedida; verificar el HEAD vivo actual.


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


## Handoff operativo vigente — 2026-11-10 UTC

Este bloque prevalece sobre los snapshots anteriores. Revalidar GitHub antes de cualquier acción posterior. Los contadores corresponden únicamente a los SHA indicados; no reutilizarlos después de un commit nuevo.

### Estado de GitHub verificado
- `main` sigue en `c5373564413ba086690552c6b7deeab08d7b4a89`; se usó como base exacta de la comparación actual.
- PR #298: OPEN/Draft, rama `docs/reconcile-live-github-state-20261109`, HEAD `7dbcdf1d9c8339d524140d09ab0cf446460a0a9b`, 37 archivos y alcance documental. `mergeable=true`, pero sin reviews formales ni review threads. La consulta del SHA exacto devolvió 11 workflow runs, los 11 SUCCESS: Secret history scan, Project progress dashboard, Dependency review, ODD/agent docs, Security scan, Backup restore smoke test, PostgreSQL migration runner validation, Database migration validation, CI, Semgrep SAST y Playwright E2E. Esto es un recuento de workflow runs; no equivale a una enumeración completa de check-runs ni a aprobación humana. Mantener Draft.
- PR #287: OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`. Comparación contra el main anterior: `diverged`, 159 commits ahead y 1 behind; 65 archivos, 10.208 adiciones y 232 eliminaciones. No rebasear, cambiar base, fusionar ni reducir este diff automáticamente.
- La consulta actual de workflows exactos para #287 devolvió 11 runs: 6 SUCCESS y 5 FAILURE. Los fallos son ODD/agent documentation validation (`42674363952`), Dependency review (`42674363725`), Project progress dashboard (`42674364153`), Playwright E2E (`42674364197`) y CI (`42674364170`). Este recuento actual sustituye snapshots anteriores que mostraban 13 runs; conservar esos contadores solo como históricos.
- Para los cinco fallos, la consulta de jobs devolvió listas vacías y la consulta de artifacts devolvió cero artifacts. No hay job IDs, steps ni logs recuperables mediante estas rutas. La causa raíz sigue DESCONOCIDA; no etiquetar ningún fallo como problema de producto, infraestructura, dependencia o permisos sin evidencia.
- Revisión estática de `.github/workflows/playwright-e2e.yml` en #287: la ejecución usa imagen Playwright fijada `v1.55.0-noble` y verifica la existencia del navegador bajo `PLAYWRIGHT_BROWSERS_PATH` o `/ms-playwright`; el YAML comenta que sustituyó un bootstrap apt/browser que fallaba repetidamente. Esto identifica un área a comprobar, pero no demuestra que ese paso causara el fallo actual.
- Revisión estática de `.github/workflows/ci.yml`: un único job de hasta 30 minutos ejecuta migraciones PostgreSQL, contratos 0016/0018/0019/0020/0021, build/typecheck y una batería amplia de integraciones; `cancel-in-progress: true` está configurado. Es contexto de complejidad, no causa raíz demostrada. Dependency Review y Project Progress también tienen contratos específicos; sin logs no atribuir sus fallos.
- La rama #287 contiene código BCV/checkout, migraciones 0017–0021, UI y pruebas, pero no está integrada en main. En la lectura estática se mantiene el defecto conocido de `persistBcvOfficialRate`: cuando ya existe una fila de la misma fecha y el mismo valor, devuelve `unchanged` sin restaurar `validation_status='valid'` si la fila estaba `stale`. No modificar la lógica comercial mientras Seguridad Nivel 1 siga abierta; conservarlo como defecto bloqueante para una corrección aislada y una prueba de regresión antes de cualquier aprobación futura.
- La inspección estática de `sales-checkout.ts` confirma que el handler exige fila BCV válida con fecha efectiva exacta de hoy y estado de última sincronización exitosa; la migración 0021 añade una protección diferida en DB. Esto no acredita despliegue, autorización operativa, UI integrada ni aceptación comercial de métodos de pago.
- No hubo merge, cambio de base, rebase, rerun, deploy, Neon, Cloudflare manual, migraciones remotas, secretos, DNS, billing ni datos reales.

### Dictamen y siguiente secuencia
1. Mantener #287 y #298 en Draft; no convertir el CI verde documental de #298 en autorización de merge.
2. No reintentar a ciegas los cinco workflows de #287. Si la vía de jobs/logs sigue devolviendo vacío, documentar la limitación y usar una ejecución diagnóstica aislada solo cuando pueda capturarse evidencia útil, sin alterar la lógica de negocio ni los guardrails.
3. Revisar por separado el alcance de integración de #287 y la compatibilidad de las migraciones 0017–0021 con main; su divergencia y tamaño hacen inseguro un merge/rebase automático.
4. Seguridad Nivel 1 permanece ABIERTO; producción NOT READY; aceptación P0 end-to-end desde UI no demostrada (0/1 jornada).
5. Fecha límite inamovible: **2026-12-01**. Objetivo: un comercio piloto, un local, hasta 1.000 productos y jornada completa desde UI en producción. Sin descuentos ni promociones.
6. Mantener los guardrails: no tocar main, no merge, no deploy, no migraciones remotas, no Neon main, no datos reales, no secretos, DNS, billing ni nuevos Cron de negocio. No iniciar nueva UI/lógica comercial hasta el cierre demostrado de Seguridad Nivel 1.


## Handoff: corrección posterior de HEAD — 2026-11-10 UTC

La sección de reconciliación anterior registraba el HEAD inmediatamente anterior a tres commits documentales. No trasladar el resultado 11/11 SUCCESS del SHA `7dbcdf1d9c8339d524140d09ab0cf446460a0a9b` al SHA nuevo.

- HEAD inmediatamente antes de esta corrección: `7902acbfa9184b4cb4213b7fda60b10d1ece5b1b`.
- Para ese SHA, la consulta de workflow runs exactos devolvió 0 y el estado combinado legacy devolvió 0 status contexts. Esto significa **sin evidencia CI/status disponible en esa consulta**, no que los checks hayan pasado ni fallado.
- PR #298: OPEN/Draft, 37 archivos documentales, 140 commits ahead / 0 behind de main `c5373564413ba086690552c6b7deeab08d7b4a89`, `mergeable=true` en la última relectura; 0 reviews formales y 0 review threads. No convertir `mergeable=true` en aprobación.
- Este commit de corrección vuelve a mover el HEAD. Consultar el SHA resultante y sus workflows antes de cualquier decisión posterior; no crear más commits de estado si no hay un hallazgo material nuevo.
- PR #287 permanece OPEN/Draft, HEAD `7df318b233cfb95f7fcc3076d46984a11614a14c`, 159 ahead / 1 behind, 6/11 workflow runs SUCCESS y 5/11 FAILURE; jobs vacíos y cero artifacts para los cinco fallos, causa raíz desconocida.
- Seguridad Nivel 1 ABIERTO; producción NOT READY; aceptación P0 end-to-end 0/1. Fecha límite inamovible **2026-12-01**: un comercio piloto, un local, hasta 1.000 productos y jornada completa desde UI en producción. Sin descuentos ni promociones. Mantener todos los guardrails vigentes.


## Handoff de continuidad — 2026-11-10 UTC (revalidación final)

### Objetivo y criterio de aceptación no negociables
- Fecha límite: **2026-12-01**.
- Aceptación P0: un comercio pequeño/mediano, un solo local, hasta 1.000 productos, jornada real completa desde la interfaz y preparado para operar en producción.
- Recorrido requerido: autenticación; tenant/sucursal; apertura de caja; búsqueda; carrito; checkout; tasa BCV vigente; pagos; venta/comprobante; descuento de inventario; existencias/Kardex; conteos; cierre de turno; consistencia posterior.
- **Sin descuentos, promociones ni override manual del precio de lista.** No añadir esta capacidad al P0 ni inferirla de permisos históricos. PR #300 elimina el permiso residual `sales.price.override`.
- El objetivo de aceptación sigue **0/1 jornadas end-to-end demostradas**; producción **NOT READY**. No declarar progreso porcentual sin evidencia de ejecución desde UI.

### Estado vivo de PRs — consulta 2026-11-10 UTC
| PR | Estado | HEAD | Workflows exact-HEAD | Decisión |
|---|---|---|---:|---|
| #287 | OPEN / Draft | `7df318b233cfb95f7fcc3076d46984a11614a14c` | 6 SUCCESS / 5 FAILURE de 11 | Mantener Draft. Los cinco fallos no exponen jobs/logs; causa raíz desconocida. 159 ahead / 1 behind en comparación previamente consultada. |
| #298 | OPEN / Draft | `10df34082e9270fdaa4b2ac838c0b1fc4da85bbc` | 11/11 SUCCESS | Reconciliación documental; no merge automático. |
| #299 | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` | 10/10 SUCCESS | Rehearsal de duración de pg_restore sintético; no demuestra RTO integral. |
| #300 | OPEN / Draft | `f4c98f3971463e54370b5af3a0633ab434d9ad90` | 9/9 SUCCESS | Elimina `sales.price.override` de allowlists y prueba que todos los roles lo rechazan. Sin merge. |

Los cuatro PR permanecen Draft; no hay autorización para fusionar durante esta fase. Workflow SUCCESS no equivale a aprobación formal, review, runtime, preview productivo ni GO.

### Hallazgo nuevo de backup pendiente
- Inspección de `.github/workflows/backup.yml` en `main`: el paso de subida hace `git clone https://x-access-token:${GH_TOKEN}@github.com/...`.
- Esto puede persistir la credencial en la configuración local del checkout clonado durante el job. No se ha demostrado exposición externa ni fuga en logs; clasificar como hardening de manejo de credenciales, no como incidente confirmado.
- Próxima tarea: rama aislada para reemplazar autenticación embebida en URL por `GIT_ASKPASS`/mecanismo temporal, revisar logs/configuración y probar sin secretos reales. No cambiar el workflow productivo hasta CI/review completos.

### Seguridad y backup
- Seguridad Nivel 1 permanece ABIERTO; producción NOT READY. No iniciar nuevas rutas/UI/lógica comercial hasta cerrar los gates.
- Backup: ocho ejecuciones programadas SUCCESS históricas no garantizan RPO <=24 h; entre dos inicios observados hubo 27 h 00 min 14 s. RPO/RTO integral, restauración independiente completa y alerta externa siguen abiertos.
- #299 mide únicamente duración de restauración PostgreSQL sintética y tiene límites de alcance documentados.
- No confundir grants/helpers con RLS; no afirmar privilegios productivos efectivos sin evidencia autorizada del runtime.

### Guardrails
No modificar main; no merge; no deploy manual; no migraciones remotas; no Neon main como laboratorio; no datos reales; no secretos, DNS, billing, Cron productivo ni force-push. Usar PostgreSQL efímero y datos sintéticos. No pedir al propietario terminal/CLI, Build IDs, capturas o reconexiones ya documentadas; investigar primero por GitHub y herramientas disponibles.

### Primera secuencia para el siguiente chat
1. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/WORK_CHECKPOINT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md`, `docs/ODD_WORKFLOW.md`, `docs/MVP_SINGLE_STORE_ACCEPTANCE.md`, `docs/BACKUP_AND_RECOVERY.md` y `docs/BACKLOG_RECOVERY_LEDGER.md`; revisar también SDD de BCV, checkout, turnos, inventario y calendario bancario.
2. Consultar GitHub de nuevo y validar HEAD + workflows exact-HEAD de #287, #298, #299 y #300; no reutilizar snapshots de esta sección como estado vivo.
3. Inspeccionar diff, reviews, threads y branch/base divergence de #300; no fusionar sin política aplicable y aprobación formal.
4. Preparar hardening aislado de `GIT_ASKPASS` para backup, sin tocar producción ni exponer secretos.
5. Continuar Seguridad Nivel 1 con evidencia; después integrar BCV/checkout, caja y UI, y diseñar E2E de la jornada completa con 1.000 productos sintéticos.
6. Cada avance debe registrar qué cambió realmente, pruebas realmente ejecutadas, qué está en main vs Draft, bloqueos, riesgo a 2026-12-01 y siguiente acción concreta.

No crear otra PR documental duplicada. Si se modifica esta rama documental, volver a consultar el nuevo HEAD y su CI exacto; no propagar resultados de SHA anteriores.


## Reconciliación técnica BCV — 2026-11-10 10:26–10:28 UTC

**Fuente de verdad:** GitHub, PR #287, SHA exacto `dd587308f85f42f8019d5fc74e7f8e296229ead8`. La rama `integration/bcv-checkout-rehearsal-20261109` está 175 commits ahead / 0 behind de su base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. `main` permanece en `c5373564413ba086690552c6b7deeab08d7b4a89`; nada de este trabajo está en main. Comparada contra `main` actual, la rama #287 diverge **175 ahead / 1 behind** con merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`; el único commit ausente es `docs/BACKLOG_RECOVERY_LEDGER.md` (15 líneas añadidas en `c537356...`), sin cambios de código. No se ha actualizado la rama ni hecho merge.

### Cambio y validación

- Migration 0022 separa `microapp_runtime` (lectura de estado/tasas BCV) de `microapp_bcv_sync` (escritura de estado y tasas oficiales con privilegios de columna mínimos). El productor es LOGIN directo, NOINHERIT y sin memberships.
- `public.lock_bcv_sync_state()` es SECURITY DEFINER, propiedad de `microapp_migrator`, con `search_path=pg_catalog`; runtime tiene EXECUTE y PUBLIC/productor no. Checkout mantiene el bloqueo FOR SHARE sin UPDATE directo del runtime.
- `apps/api/wrangler.toml` ya no declara el Cron BCV. `apps/api/wrangler.bcv.toml` define un Worker separado, sin workers.dev ni rutas, con su propio secreto `DATABASE_URL` que deberá corresponder al LOGIN productor.
- Pruebas de integración BCV usan el LOGIN productor; checkout HTTP y sus operaciones de negocio usan runtime. El test de concurrencia confirma que el lock de checkout bloquea el UPDATE del productor hasta terminar la transacción.
- **HEAD exacto #287:** 10/10 workflows pull_request SUCCESS y 15/15 check-runs SUCCESS. Incluye CI, migration validation, migration runner, backup smoke, Playwright, Semgrep, security scan, secret history, dependency review y ODD validation.
- Fallos de iteraciones previas no se heredan: faltaba crear el rol productor en migration-runner harness y dos tests aún intentaban escribir/usar FOR SHARE directo con runtime. Ambos se corrigieron; solo el SHA indicado arriba es evidencia final.

### Límites que siguen abiertos

- PR #287 sigue OPEN/Draft, sin review formal ni merge. Issue #53 sigue OPEN/P0.
- El rol `microapp_bcv_sync` y su contraseña aún no están provisionados en Neon ni como secreto de Cloudflare; el Worker separado no está desplegado y el Cron no está activado. No afirmar que la sincronización BCV productiva esté operativa.
- No hubo conexión/escritura a Neon, rotación de secretos, cambio de binding ni deploy.
- Backup programado: último éxito verificado run #19 (`42659924075`), 2026-11-09 16:57:34 UTC, en SHA main `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. A las 10:28 UTC del 10 nov habían transcurrido ~17h30; RPO 24h no estaba excedido, pero no había run posterior visible.
- Producción continúa NOT READY. El 1 de diciembre de 2026 sigue siendo fecha límite inamovible. Siguientes gates: revisión independiente #287, provisión separada de identidad/secretos solo en entorno autorizado no productivo, aceptación BCV y alertas, luego recorrido POS/UI y jornada piloto 1 local/1.000 productos.

No fusionar ni activar el Worker/Cron por el mero hecho de que CI esté verde. No reutilizar resultados de SHAs anteriores.


## Reconciliación de continuidad y fuentes externas — 2026-11-10 10:55 UTC

- Política de fuentes: leer también `docs/EXTERNAL_SOURCE_RELIABILITY_BCV_SUDEBAN.md`. SUDEBAN y BCV presentan inestabilidad; no insistir en una búsqueda oficial que no arroje evidencia nueva. Usar terceros con procedencia/fecha/corroboración, sin presentarlos como fuente oficial. El calendario 2026 aportado por el propietario se conserva como referencia NO OFICIAL / SECUNDARIO_PROVISIONAL. Para 2027 no se ha verificado un calendario oficial disponible; recurrir a fuentes secundarias si el producto lo necesita.
- PR #298 HEAD `4a7a578ac6fbc6b2fd9e116d5243f06e09b2c009`: revalidación exacta terminada con 11/11 workflows `pull_request` SUCCESS y 15/15 check-runs SUCCESS. Sigue OPEN/Draft; no merge.
- PR #287 HEAD `dd587308f85f42f8019d5fc74e7f8e296229ead8`: 11/11 workflows `pull_request` SUCCESS y 15/15 check-runs SUCCESS. El recuento anterior de 10/10 workflows queda supersedido. Sigue OPEN/Draft; no merge.
- PR #301: el ODD contenía un SHA de implementación obsoleto (`99ec165...`) aunque el HEAD real era `d7af46c...`. Se corrigió el ODD; el HEAD documental `ce43ab2cff91cd07e7ca2b91635b8e27a02b11c8` terminó con 10/10 workflows PR SUCCESS y 15/15 check-runs SUCCESS. No hay review formal ni review comments; revisión independiente pendiente. PR abierta, no fusionada.
- PR #299: 10/10 workflows PR SUCCESS en HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`; mide restauración sintética de PostgreSQL, no RTO operativo completo.
- PR #300: 10/10 workflows PR SUCCESS en HEAD `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95`; su corrección de precio está incorporada en #287 según los artefactos, por lo que no integrar ambas independientemente sin reconciliar historial.
- PR #302: 10/10 workflows PR SUCCESS en HEAD `1b441b3dc9e65e2cb89d765f9aff084b474dd90d`; cambio de askpass sigue en Draft y CI no demuestra ejecución real del backup con token.
- Issue #53 permanece OPEN/P0. Producción NOT READY. No Neon writes, secretos, deploy, Cron ni datos reales.
- Backup: la última ejecución programada exitosa verificada sigue siendo run #19 `42659924075` (2026-11-09 16:57:34 UTC). En el último sondeo no se pudo confirmar una ejecución programada posterior del 10 nov; no declarar RPO cumplido hasta comprobarla. No ejecutar backup manual ni tocar secretos.
- Fecha límite inamovible: **2026-12-01**. Aceptación P0: un comercio, una sucursal, hasta 1.000 productos y una jornada completa de UI, además de todos los gates de seguridad/recuperación.


## Bloqueo de privilegios efectivos del backup — 2026-11-10

La evidencia de solo lectura registrada en issue #53 (2026-11-06) indica que `backup_readonly`, `neon_service` y `neondb_owner` eran miembros de `neon_superuser`, que hereda `pg_write_all_data`; `cloud_admin` tenía `rolsuper=true`. Los grants directos SELECT observados en octubre no bastan para demostrar privilegios efectivos. No afirmar que `DATABASE_URL_BACKUP_RO` usa un principal least-privilege ni que el nombre `backup_readonly` refleja su poder real. Falta verificar sin revelar secretos el `current_user` efectivo del workflow, membresías heredadas, ownership y ACL efectivos. PR #302 solo corrige exposición del token Git; no soluciona este riesgo DB. Issue #53 sigue OPEN/P0. No tocar roles/grants en Neon main desde esta tarea.


## Neon main — revalidación directa de privilegios efectivos (2026-11-10 UTC)

**Solo lectura.** Proyecto `restless-fire-99110035`, rama `main`, base `neondb`. No se leyeron secretos/connection strings y no hubo DDL/DML.

- Con LOGIN `backup_readonly`: `current_user = session_user = backup_readonly`; membresía efectiva en `neon_superuser` y `pg_write_all_data`; `has_table_privilege` confirmó UPDATE y DELETE sobre `public.products`. El rol además tiene LOGIN, INHERIT, CREATEDB y CREATEROLE. **No es least-privilege ni readonly efectivo.**
- `neon_service` y `neondb_owner` también heredan `pg_write_all_data` vía `neon_superuser`; `cloud_admin` tiene `rolsuper=true`.
- No aparecen `microapp_runtime`, `microapp_migrator` ni `microapp_bcv_sync` en `pg_roles` del branch consultado.
- **No se demostró que el secreto GitHub `DATABASE_URL_BACKUP_RO` utilice `backup_readonly`**; el workflow no revela el principal. No inferir identidad del secreto por su nombre.
- Se registró evidencia y límites en el comentario del issue #53 (comment ID `6765600704`). Issue #53 permanece OPEN/P0.
- Gate: verificar de forma autorizada el principal real del Worker/API y del backup, memberships heredadas, ownership y ACL efectivos. Diseñar bootstrap/upgrade least-privilege en PostgreSQL desechable. No cambiar roles/grants en Neon main desde esta tarea; no leer ni imprimir secretos.
- PR #302 solo elimina el token Git de la URL del remote; no corrige ni prueba los privilegios PostgreSQL. Producción NOT READY.


## Continuidad verificada — 2026-11-10 11:37 UTC (07:37 UTC-04:00)

### Fuente de verdad y corte GitHub
- Repositorio: `BTF14/Micro-app`; `main` observado: `c5373564413ba086690552c6b7deeab08d7b4a89`.
- PR abiertas encontradas en la consulta: #302, #301, #300, #299, #298, #296, #287 y #193. No asumir que la lista histórica de PR 287/298/299/300/301/302 sea exhaustiva: #296 y #193 siguen abiertas y requieren triage.
- #302 OPEN/Draft, HEAD `1b441b3dc9e65e2cb89d765f9aff084b474dd90d`; 10/10 workflows PR SUCCESS y 14/14 check-runs SUCCESS. Diff acotado a autenticación Git de backup vía GIT_ASKPASS. No ejecutó backup real ni prueba subida/restauración; sigue Draft.
- #301 OPEN, no Draft, HEAD `ce43ab2cff91cd07e7ca2b91635b8e27a02b11c8`; 10/10 workflows PR SUCCESS y 15/15 check-runs SUCCESS; sin reviews formales ni review threads. Añade GET de sucursales y pruebas. CI verde no sustituye revisión de autorización; revisar especialmente la ruta, la autorización `inventory.read`, scope owner/admin/cashier/inventory, tenant isolation, branch memberships y fixtures DB antes de aprobar o fusionar.
- #300 OPEN/Draft, HEAD `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95`; 10/10 workflows y 14/14 checks SUCCESS. Revisar que el permiso de override se retire sin romper los flujos autorizados ni contradecir la matriz aprobada.
- #299 OPEN/Draft, HEAD `c82b0a10f85b59e1f81ac0ca2d439b6286558751`; pendiente revisar alcance, aislamiento de restore sintético y métricas RTO; no inferir que prueba restauración real.
- #298 OPEN/Draft, HEAD observado antes de este commit documental `6a455b092c43e808c9f409ae10a6206f52c7a562`; 11/11 workflows y 15/15 checks SUCCESS. Este commit generará un SHA nuevo y requiere validación exact-HEAD.
- #296 OPEN/Draft, HEAD `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f`; 10/10 workflows y 14/14 checks SUCCESS. Su base SHA es antigua `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`; no actualizarla sin comparar diff y revisar impacto.
- #287 OPEN/Draft, HEAD `dd587308f85f42f8019d5fc74e7f8e296229ead8`; 11/11 workflows y 15/15 checks SUCCESS. Base SHA antigua `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`; el aislamiento BCV y el helper de lock están probados en CI, pero el rol/secreto productor, Worker dedicado y Cron siguen sin provisionar/activar.
- #193 OPEN/no Draft, HEAD `ac57ab4f3415f82279b8a49c0befe09f8e3aec68`, base SHA antigua `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`; su alcance de Fase B debe reconciliarse con el inventario/branches ya implementado en ramas recientes. No fusionar sin revisar duplicidad y vigencia.

### Backup y P0
- Último workflow programado de backup identificado: run `42659924075`, SUCCESS, `2026-11-09T16:57:34Z`; a este corte han transcurrido ~18h40m, por debajo del RPO de 24h pero con margen restante ~5h20m. No hay ejecución posterior de backup en los runs programados consultados. Prioridad inmediata: vigilar la próxima ejecución y no confundir CORS/bundle/dependency workflows con backup.
- Issue #53 sigue OPEN con labels `security` y `P0`: identidad, sesiones y aislamiento tenant.
- #302 mejora higiene del token Git, pero no demuestra permisos PostgreSQL ni recuperación. #299 es restore sintético; tampoco sustituye un restore operativo autorizado.

### BCV / SUDEBAN: decisión del propietario, no reabrir búsqueda improductiva
- Leer siempre `docs/EXTERNAL_SOURCE_RELIABILITY_BCV_SUDEBAN.md`.
- SUDEBAN y BCV tienen webs inestables. Si el origen oficial no es accesible, continuar con terceros trazables, fecha/URL/procedencia y corroboración cuando sea posible. Distinguir OFICIAL, SECUNDARIO_CORROBORADO, SECUNDARIO_PROVISIONAL y NO_VERIFICADO.
- El calendario 2026 entregado por el propietario se conserva como mejor información disponible, NO OFICIAL / SECUNDARIO_PROVISIONAL. No volver a pedirlo.
- No insistir buscando un calendario oficial 2027 que no está disponible de forma verificable. Usar fuentes secundarias si el producto lo necesita; nunca etiquetarlas como oficiales. Un error web no demuestra inexistencia ni falta de publicación.
- BCV: no bloquear la integración por indisponibilidad web; usar fuente alternativa con trazabilidad y controles. No convertir dato secundario en dato oficial ni permitir tasa stale en checkout.

### Restricciones y decisiones
- Fecha límite del MVP: **2026-12-01, inamovible**. Objetivo P0: un local y hasta 1.000 productos, estable y probado.
- Máximo dos frentes activos. Prioridad sugerida: (1) seguridad Nivel 1 / issue #53 / autorización y sesión; (2) backup/RPO y recuperación. Después POS end-to-end, caja/ventas, pagos, turnos y UX para piloto.
- No tocar Neon `main`, datos reales, roles/grants remotos, secretos, Cloudflare manual, DNS, billing ni producción. No desplegar Worker ni activar Cron BCV sin gate explícito, pruebas no productivas y evidencia.
- No fusionar por CI verde solamente. Revisar diff, approvals formales, threads, checks del SHA exacto, base divergence, migration ordering, tests de integración y riesgo operacional.
- No pedir al propietario Build IDs, capturas, terminal, CLI, TinyFish, reconexiones ni el calendario 2026 ya entregado. Si un dato verdaderamente bloqueante falta, preguntar una sola vez y aceptar texto.

### Próximas acciones del siguiente chat
1. Leer `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/SECURITY_ROADMAP.md` y `docs/EXTERNAL_SOURCE_RELIABILITY_BCV_SUDEBAN.md` desde la rama correcta; `WORK_CHECKPOINT.md` no existe en esa rama consultada, no asumir que existe ni recrearlo sin comprobar la estructura.
2. Reconciliar #301 con revisión completa de su diff (es la única PR abierta no Draft) y verificar exact-HEAD CI/approvals/threads; no aprobar hasta revisar authorization/tenant/branch semantics.
3. Revisar próximo backup programado y RPO/RTO; si el backup no se ejecuta dentro del RPO, tratarlo como incidente P0 y diagnosticar workflow/secret sin exponer valores ni cambiar secretos.
4. Triage #300/#299/#296/#287/#193; cerrar duplicidades solo con evidencia, mantener drafts cuando falte aprobación.
5. Validar el nuevo SHA de #298 generado por este commit documental; actualizar PR description y los contadores solo tras consultar GitHub.

**Estado de producto al corte:** NO READY FOR PRODUCTION. Checks verdes de PR no equivalen a aprobación, integración en main, despliegue ni aceptación piloto.

 
## Reanudación prioritaria — 2026-11-10 11:59 UTC

**Deadline inamovible: 2026-12-01. Estado: NOT READY FOR PRODUCTION.**

- Main confirmado: `c5373564413ba086690552c6b7deeab08d7b4a89` (`protected=true` según objeto branch; configuración detallada de approvals/checks no legible por 403).
- Último backup programado: run #19 `42659924075`, SUCCESS, 2026-11-09 16:57:34 UTC; job `129308412112` confirma pg_dump 18.6, cifrado, checksum, push remoto commit `828ef31` y retención sin borrados. A las 11:59 UTC del 10 nov tenía ~19 h.
- El ciclo actual todavía no supera 24 h, pero RPO ≤24 h no está demostrado: #18→#19 tardó 27 h 00 min 14 s y el máximo histórico registrado fue 48 h 03 min 03 s. Si la copia siguiente no se completa antes de 24 h desde #19, escalar como incidente P0.
- La última restauración remota documentada sigue siendo la copia del 29 oct (run `40955935124`); no se restauró la copia del 9 nov. #299 es solo restore sintético.
- #302: main todavía usa token en URL Git; la corrección GIT_ASKPASS está Draft, HEAD `1b441b3dc9e65e2cb89d765f9aff084b474dd90d`, 10/10 workflows y 14/14 check-runs SUCCESS; sin review formal/thread y sin prueba dinámica con token efímero.
- Riesgo separado: `backup_readonly` tiene membresía heredada de `pg_write_all_data` según evidencia read-only ya registrada; no está probado que el secreto `DATABASE_URL_BACKUP_RO` use ese usuario. No inspeccionar secretos ni cambiar Neon main.

### Estado exact-HEAD de PR

| PR | HEAD | Estado | Ahead/behind | Workflows / checks |
|---|---|---|---:|---:|
| #287 | `dd587308f85f42f8019d5fc74e7f8e296229ead8` | OPEN/Draft | 175/1 | 11/11 + 15/15 SUCCESS |
| #296 | `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f` | OPEN/Draft | 64/1 | 10/10 + 14/14 SUCCESS |
| #298 | `44def211e264fd34d5bef7db5cead8c5fd6d509b` | OPEN/Draft | 223/0 | 13/13 + 15/15 SUCCESS |
| #299 | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` | OPEN/Draft | 1/0 | 10/10 + 14/14 SUCCESS |
| #300 | `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95` | OPEN/Draft | 3/0 | 10/10 + 14/14 SUCCESS |
| #301 | `ce43ab2cff91cd07e7ca2b91635b8e27a02b11c8` | OPEN, no Draft | 5/0 | 10/10 + 15/15 SUCCESS |
| #302 | `5420896eb591d3ae513254a064c787624678da14` | OPEN/Draft | 5/0 | 12/12 + 14/14 SUCCESS |
| #193 | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` | OPEN, no Draft | 5/74 | 8/8 + 12/12 SUCCESS |

No formal reviews or inline review threads were returned for these PRs. #287/#296 are each one commit behind main from merge base 0344295; #193 is 74 behind with merge base 705d3db. No automatic rebase/sync. Combined legacy statuses are empty where queried; check-runs and workflow runs remain separate evidence.

### Próximos pasos obligatorios

1. Mantener el foco en backup/RPO y seguridad Nivel 1; comprobar la siguiente ejecución programada y medir el gap real, sin lanzar backup manual ni cambiar secretos.
2. Diseñar un procedimiento aislado y autorizado para identificar el principal real del backup y validar privilegios efectivos; no leer secretos ni mutar Neon main.
3. Revisar dinámicamente GIT_ASKPASS en repositorio sintético y secreto efímero, si puede añadirse al CI sin tocar credenciales reales.
4. Completar revisión independiente de #301 (ruta, autorización, aislamiento tenant/branch, límite 100 y UI); no aprobar solo por CI.
5. Mantener #287/#296/#298/#299/#300/#302 Draft y #193 abierta mientras falten revisión/decisiones/gates. No fusionar #300 y #287 independientemente.
6. Solo después de cerrar Seguridad Nivel 1 avanzar a UI POS completa, turnos, pagos aprobados y E2E de jornada.
7. Mantener BCV/SUDEBAN según `docs/EXTERNAL_SOURCE_RELIABILITY_BCV_SUDEBAN.md`; no volver a pedir calendario 2026 ni insistir con calendario oficial 2027 no verificable.

No pedir terminal, CLI, Build IDs, capturas, TinyFish, reconexiones, ni datos ya documentados.

 
## Revalidación posterior — PR #302 GIT_ASKPASS y revisión inicial #301 — 2026-11-10

- PR #302 nuevo HEAD: `5420896eb591d3ae513254a064c787624678da14`, OPEN/Draft, 5 ahead / 0 behind de main, 14/14 check-runs SUCCESS y 12/12 workflow runs SUCCESS. Sin reviews formales ni threads.
- Se extrajo `scripts/backup_git_askpass.sh`; el workflow copia el helper a `$RUNNER_TEMP` con modo 700 y lo elimina con el clon temporal. `scripts/test_backup_git_askpass.sh` comprueba con token ficticio las respuestas Username/Password, rechazo de prompts desconocidos, fallo por GH_TOKEN ausente y ausencia del token en el archivo helper.
- La prueba aislada local pasó. En CI exact-HEAD, el paso **Test backup Git askpass contract** terminó SUCCESS dentro del workflow CI run `42813175458`; el SHA final de PR #302 pasó 14/14 checks y 12/12 workflows. Esto valida el contrato local del helper, no autenticación HTTPS real, push remoto, backup productivo ni restore.
- No se ejecutó el workflow real de backup ni se usaron secretos reales. Main sigue usando la URL Git con token hasta que exista una integración segura; PR #302 continúa Draft por falta de review independiente y porque el principal PostgreSQL/RPO/RTO siguen abiertos.
- Primera pasada estática de PR #301: `branches.ts` reutiliza `authorizeTenantOperation(..., "inventory.read")`, filtra por organization_id y sucursales activas, y limita cashier/inventory a branch_memberships activas; owner/admin reciben sucursales activas de su organización. Tests cubren owner/admin/cashier/inventory, tenant ajeno y sesión ausente. No se observó un bypass directo en esta pasada; el límite `MAX_BRANCHES=100` sin cursor permanece explícito. No equivale a revisión independiente completa ni aprobación; #301 sigue OPEN/no Draft, sin review formal.
- PR #298, antes de esta nueva actualización, estaba en HEAD `44def211e264fd34d5bef7db5cead8c5fd6d509b`, 223 ahead / 0 behind, 15/15 check-runs y 13/13 workflows SUCCESS. El commit documental actual mueve nuevamente su HEAD y exige CI exact-HEAD nuevo.


---

## Handoff vivo — reconciliación exacta 2026-11-10 12:29 UTC

- Deadline inamovible **2026-12-01**.
- main `c5373564413ba086690552c6b7deeab08d7b4a89`; no modificar.
- #298 OPEN/Draft, HEAD `34ff7c343516ac95220a13d74b91b2a61c0ad80f`, 15/15 check-runs y 11/11 workflows PR SUCCESS; sin review formal. Si se añade un commit documental, refrescar CI exact-HEAD.
- #302 OPEN/Draft, HEAD `5420896eb591d3ae513254a064c787624678da14`, 14/14 check-runs y 10/10 workflows PR SUCCESS; sin review formal. Los SHA anteriores que figuran en bloques históricos no describen su HEAD actual.
- Backup programado: run #19 `42659924075`, SUCCESS `2026-11-09T16:57:34Z`; no run #20 localizado a `12:29Z` del 10-nov. Repositorio remoto confirma commit `828ef3193f3b8e4935d0e945f504cd81aca4b78e` y ambos archivos (dump cifrado + checksum). Umbral de 24h: `2026-11-10T16:57:34Z`.
- RPO≤24h sostenido NO-GO por gaps históricos. No ejecutar workflow manualmente ni alterar cron/secrets/proveedor. Tras el umbral, reconsultar schedule runs y confirmar copia remota antes de declarar incumplimiento del intervalo actual.
- Issue #53 OPEN/P0; última nota de seguimiento `6767292787`.
- No Neon, secretos, datos reales, main writes, merge, deploy, DNS, billing ni Cloudflare manual. No leer contenido del dump.
- Próximo paso: comprobar run programado después del umbral; en paralelo, revisar discrepancias documentales y exact-HEAD CI sin ampliar a un tercer frente. Restore real y RTO integral continúan pendientes.
- Producción **NOT READY**; P0 UI 0/1 jornada completa. Mantener estas limitaciones visibles.


---

## Corrección de checkpoint: #295/#255/#269 — 2026-11-10 12:35 UTC

La observación de la conversación de PR #298 sobre la omisión de #295 queda resuelta en este checkpoint. El registro autoritativo ya integrado en `main` `c5373564413ba086690552c6b7deeab08d7b4a89`, `docs/BACKLOG_RECOVERY_LEDGER.md` (filas 215–217), confirma:

- #295, HEAD `213837969375fa87f5edca79e0d752333bc93d8c`: CLOSED/superseded por #287. No falta código añadido por #295 en `apps/`, `packages/`, `scripts/` o `tools/`; el guard de freshness `findApplicableCheckoutRate()` con `bcv_sync_state ... FOR SHARE` está ya en #287.
- #255, HEAD `b0e47205b96f636b2ab270304d2598423a50ccc3`: CLOSED/superseded por #287; el ledger documenta que las diferencias restantes son refactors de funciones ya recuperadas, sin funcionalidad perdida detectada.
- #269, HEAD `7fc91b54f869664febb6a7daf1ed05b408bd8430`: CLOSED/superseded por #287; su HEAD es ancestro de #287 y no tiene commits propios fuera de esa rama.

No reabrir ni fusionar estas ramas superseded sin nueva evidencia. Esta corrección solo actualiza el checkpoint en esta PR documental; no cambia main. Cualquier nuevo commit exige CI exact-HEAD nuevo. **Deadline inamovible: 2026-12-01.**
