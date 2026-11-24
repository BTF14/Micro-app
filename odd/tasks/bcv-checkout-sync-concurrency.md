# ODD task: Rehearsal BCV + checkout — concurrencia del sincronizador y freshness

- Status: completed
- Issue / PR: [PR #287](https://github.com/BTF14/Micro-app/pull/287) — OPEN/Draft
- Owner / reviewer: propietario del producto; revisión técnica/seguridad pendiente
- Started: 2026-11-09
- Risk: critical

## Objective and authorization

- Desired outcome: asegurar que una sincronización BCV supersedida no pueda insertar ni invalidar una tasa de una ejecución más nueva, y cerrar el contrato de frescura para checkout antes de producción.
- Authorization boundary: cambios acotados en la rama aislada de PR #287, tests y documentación. No merge, deploy, Neon writes, Cron activation, Cloudflare manual, secrets, DNS, billing ni cambios en main.
- Relevant original request: continuar la integración BCV + checkout con rigor de concurrencia, estado persistente, fail-closed y evidencia exact-HEAD.

## Scope and exclusions

Included:
- Revisar migración 0021 y semántica de `attempt_id`.
- Serializar verificación del intento vigente y persistencia de la tasa.
- Añadir regresión PostgreSQL con respuestas concurrentes diferentes para la misma fecha.
- Documentar la brecha pendiente de freshness/last-success en checkout.

Excluded:
- Cambiar política legal/contable de effective_date o inventar umbrales de frescura.
- Activar Cron, cambiar configuración Cloudflare o ejecutar migraciones remotas.
- Fusionar PR #255/#269/#287 o modificar main.
- Usar fixtures de terceros como evidencia oficial BCV.

## Acceptance criteria

- [x] AC-1 — Una ejecución supersedida no puede insertar, actualizar ni marcar stale una fila BCV.
- [x] AC-2 — Test PostgreSQL determinista con A retrasada y tasa Y distinta; B más nueva inserta tasa X; A termina después y se descarta sin alterar X.
- [x] AC-3 — La fila de B permanece `valid`, la tasa permanece X y el estado terminal conserva el intento B.
- [x] AC-4 — Errores de una ejecución supersedida no sobrescriben el estado más nuevo ni generan falso fallo operativo.
- [x] AC-5 — CI exact-HEAD y PostgreSQL runtime-role integration pasan.
- [x] AC-6 — Freshness se documenta como gate: `bcv_sync_state` aún no es consumido por checkout y no existe política aprobada de last-success.
- [x] AC-7 — Umbrales `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7` no se aceptan como política hasta justificarlos y aprobarlos.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Intento antiguo invalida tasa nueva | Critical | Lock de fila singleton, verificación attempt_id dentro de transacción y prueba con tasas distintas |
| Checkout acepta tasa sin freshness verificable | Critical | Gate P1 separado; no producción hasta política y tests |
| Umbrales hard-coded sin aprobación | High | No inventar threshold; justificar con calendario/fuentes y aprobación |
| Regresión runtime-role | High | PostgreSQL con login microapp_runtime y CI exact-HEAD |
| Activación accidental Cron | Critical | `BCV_SYNC_ENABLED=false`, no Cloudflare ni deploy |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspeccionar 0021 y sincronizador | Identificar carreras entre attempt state y exchange_rates | Revisión de `syncBcvOfficialRate`, `persistBcvOfficialRate` y test actual | completed |
| Proteger persistencia con attempt_id | Intento supersedido no muta tasas | Commit `a2c122cd0a030ff82131a7eb9da0742690bfca84` | implemented; CI SUCCESS en HEAD `f564c73b1df45fce5c8e5065e2e6f563595e0dfa` |
| Probar tasas concurrentes diferentes | B válida permanece intacta cuando A termina después | Commit `27012594b895abe2aff08ef5ee8fb065321d755a` | implemented; CI SUCCESS en HEAD `f564c73b1df45fce5c8e5065e2e6f563595e0dfa` |
| Ignorar fallo de fetch supersedido | No sobrescribir último estado ni reportar fallo obsoleto | Commit `ef21cfca3e18b4a51de9aa7af9c5d26397d7736c` + hardening `c02bc31a26323384f648dc8e56a782a0394d7b80` | implemented; CI SUCCESS en HEAD `f564c73b1df45fce5c8e5065e2e6f563595e0dfa` |
| Revalidar freshness en checkout | Política aprobada y consulta transaccional fail-closed | PR comment #287; código todavía no lo implementa | pending |
| Justificar ventanas 10/7 | Umbrales con evidencia oficial y aprobación | PR comment #287; no aprobado | pending |
| CI exact-HEAD | Todos los checks requeridos pasan | HEAD `f564c73b1df45fce5c8e5065e2e6f563595e0dfa`: 15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS; incluye PostgreSQL BCV y Runtime-role integration | completed |

## Technical decisions

- La persistencia de tasa y la actualización de estado terminal ocurren en una transacción que bloquea la fila singleton y compara `attempt_id`.
- Si el intento fue supersedido, devuelve `superseded` y no toca `exchange_rates`.
- Si un valor diferente para la misma fecha se detecta en el intento vigente, la invalidación y el estado failed se confirman juntos; otros errores abortan la transacción.
- ADR adicional solo si esta semántica cambia el modelo de sincronización de forma duradera; por ahora se registra en el diff y handoff.
- La brecha freshness sigue abierta: la migración 0021 registra salud del sincronizador pero `findApplicableCheckoutRate()` no consulta `bcv_sync_state`.

## Closure and handoff

- Final code SHA validated: `cabe98707c6f4c348df23bfcb7c47f5dd9756532` (tras merge de PR #293, main es ancestro).
- PR: #287 OPEN/Draft.
- Checks and exact outcomes: HEAD `cabe98707c6f4c348df23bfcb7c47f5dd9756532`, 15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS. Cualquier commit posterior requiere CI exact-HEAD nuevo.
- Acceptance criteria met / unmet: AC-1–AC-7 cumplidos como tarea de detección/corrección/documentación; la implementación de freshness y aprobación de thresholds son tareas posteriores separadas.
- Limitations not verified: fixture HTML real BCV, calendario bancario oficial, thresholds de freshness, integración de estado last-success en checkout.
- Residual risks: no producción, no Cron, checkout puede aceptar una fila same-day `valid` aunque la sincronización posterior falle; sujeto a política freshness.
- Next step: diseñar y probar freshness/last-success con decisión de negocio explícita; mantener gates legales y de fuentes oficiales.

---

## Reconciliación de freshness/last-success — 2026-11-09 UTC

> Este addendum supersede únicamente las afirmaciones anteriores de que checkout todavía no consumía `bcv_sync_state`. El resto de los gates BCV de esta tarea continúa vigente.

- La brecha de freshness/last-success quedó implementada en la PR apilada **#295** (OPEN/Draft), no en el HEAD aislado de #287.
- En `apps/api/src/sales-checkout.ts`, `findApplicableCheckoutRate()` consulta `bcv_sync_state` dentro de la transacción de checkout mediante `SELECT ... FOR SHARE`. Solo permite outcomes `inserted`/`unchanged`, `last_success_at` presente, `last_effective_date` no anterior a hoy en Caracas y una fila BCV `valid` con `effective_date` exacta de hoy.
- Estados `running`, `failed`, `older`, ausentes/incompletos, errores de DB o falta de tasa exacta bloquean ventas nuevas. La regla no usa TTL arbitrario ni `fetched_at` como last-success. Las ventas ya completadas conservan replay idempotente de su snapshot.
- Evidencia al crear este addendum: PR #295 HEAD `f29de35f90e5bb57ed4f53aa5d8551d1fc8b04e0`; 6/6 workflow runs `pull_request` SUCCESS en ese SHA exacto. Este cambio documental crea un nuevo SHA y requiere CI exact-HEAD propio; no reutilizar esos resultados.
- PR #295 está 50 commits ahead / 6 behind de la punta actual de su base #287 `a3653df0788b320caa931f2e03a3b42886e0062f`; sincronizar de forma no destructiva y volver a validar antes de integrar.
- Los umbrales parser 10/7 siguen sin justificación/aprobación. Fixture HTML real BCV, calendario bancario oficial, política de anomalías, alertas/recuperación operativa, revisión legal/contable y Worker runtime identity siguen pendientes.
- No merge, deploy, Neon writes, activación de Cron ni cambios de configuración productiva. Producción **NOT READY**.
