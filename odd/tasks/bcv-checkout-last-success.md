# ODD task: Checkout exige último éxito de sincronización BCV

- Status: completed
- Issue / PR: PR #295 (OPEN/Draft), base actual `integration/bcv-checkout-rehearsal-20261109`; se usó temporalmente una base alias para disparar CI y luego se retargeteó
- Owner / reviewer: propietario del producto; revisión técnica/seguridad pendiente
- Started: 2026-11-09
- Risk: critical

## Objective and authorization

- Desired outcome: impedir que una tasa BCV del día siga autorizando nuevas ventas después de que el último intento de sincronización haya fallado o siga en curso.
- Authorization boundary: rama nueva basada en el HEAD verificado de PR #287; cambios de código, pruebas y documentación únicamente. No merge, no main, no deploy, no Neon writes, no migraciones remotas, no Cron activation ni cambios Cloudflare/secrets/DNS/billing.
- Relevant original request: el propietario confirmó explícitamente la opción A: si el último intento BCV falla, bloquear checkout hasta una sincronización exitosa.

## Scope and exclusions

Included:
- Checkout valida la tasa de hoy y el estado singleton `bcv_sync_state` en la misma transacción de venta.
- Solo acepta outcomes exitosos `inserted` o `unchanged`, con `last_success_at` presente y `last_effective_date` igual o posterior a la fecha de operación en Caracas; una publicación futura anticipada no invalida la fila vigente de hoy.
- Checkout bloquea para `running`, `failed`, `older`, estado ausente/incompleto, fecha anterior a hoy o fila de tasa inválida/ausente.
- Serializar la lectura del estado frente al inicio de una nueva sincronización mediante lock compartido de la fila singleton hasta finalizar la transacción de checkout.
- Pruebas unitarias y PostgreSQL runtime-role para éxito, fallo posterior, intento en curso, fecha anterior/futura, ausencia de estado y recuperación por nuevo éxito.
- Documentar la decisión de producto/seguridad y actualizar el handoff.

Excluded:
- No añadir TTL arbitrario ni aprobar los umbrales parser 10/7.
- No usar `fetched_at` como sustituto de `last_success_at`.
- No cambiar el comportamiento de tasa prepublicada: solo es aplicable desde su `effective_date`.
- No habilitar tasa manual de contingencia ni cambiar permisos comerciales.
- No alterar ventas completadas ni snapshots históricos.
- No usar Neon real ni producción.

## Acceptance criteria

- [x] AC-1 — Una tasa same-day `valid` no permite una nueva venta si el último outcome es `failed` o `running`.
- [x] AC-2 — Checkout acepta únicamente `inserted`/`unchanged` con `last_success_at` no nulo y `last_effective_date` no anterior a hoy en Caracas.
- [x] AC-3 — La lectura del estado BCV queda protegida contra el inicio concurrente de un sync hasta terminar la transacción de checkout.
- [x] AC-4 — Estado ausente, inconsistente, `older`, fecha discrepante o error de DB fallan cerrados sin crear venta ni mover inventario.
- [x] AC-5 — Una nueva sincronización exitosa recupera el checkout sin TTL artificial; una tasa prepublicada se acepta solo desde su fecha efectiva.
- [x] AC-6 — Tests unitarios, PostgreSQL integración bajo `microapp_runtime`, typecheck y CI exact-HEAD pasan.
- [x] AC-7 — La documentación distingue política aprobada, código implementado, evidencia CI y gates externos todavía pendientes.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Tasa válida queda utilizable tras fallo de sync | Critical | Consultar outcome/last-success en la transacción y fail-closed |
| Carrera entre checkout y comienzo de sync | High | `SELECT ... FOR SHARE` sobre singleton durante la transacción de venta |
| Bloqueo excesivo o falsa disponibilidad | High | Lock solo durante el checkout; sync conserva update atómico y se ejecuta después |
| Permisos runtime insuficientes | High | Verificar grants SELECT + UPDATE column-scoped y prueba PostgreSQL con rol runtime |
| Rechazo de ventas USD-only inesperado | Product | Mantener el contrato existente: todas las ventas dependen de BCV, salvo decisión explícita futura |
| TTL inventado o fin de semana incorrecto | High | No añadir ventana temporal; comparar fechas efectivas y estado de último éxito |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Revalidar PR #287 y contratos de DB/checkout | Rama base y transacción identificadas | HEAD `362443524eb45c67da16811d1745d83ddc9bd3a9`; checkout corre dentro de `withDatabaseTransaction` | completed |
| Registrar decisión A y criterios | Política durable, sin TTL arbitrario | ADR `ADR-20261109-bcv-checkout-last-success.md` | completed |
| Implementar guard de estado BCV | Estado operativo consumido en checkout | `sales-checkout.ts`: `FOR SHARE`, outcomes `inserted`/`unchanged`, `last_success_at` y `last_effective_date` | implemented; CI exact-HEAD SUCCESS |
| Validar locks y permisos | Sync y venta serializados sin privilegios extra | Test PostgreSQL runtime-role con `FOR SHARE` y `lock_timeout` contra UPDATE concurrente | implemented; CI pending |
| Ejecutar CI exact-HEAD | Evidencia vinculada al SHA probado | SHA `13c8cd96becc09b0ba9ffad923ea115e5a44dcba`: CI, PostgreSQL checkout/runtime-role, unit, typecheck, migraciones, migration runner, Playwright, Semgrep, Dependency review y ODD docs SUCCESS; 13/13 check-runs SUCCESS. PR Security scan quedó pending, pero Trivy push del mismo SHA SUCCESS. | completed; docs-only commit posterior requiere revalidación exact-HEAD |
| Actualizar handoff y estado | Continuidad sin snapshots engañosos | CURRENT_STATE, STATE_JOURNAL y handoff actualizados; PR #295 OPEN/Draft | completed |

## Technical decisions

- La decisión A es política de producto aprobada por el propietario para este workstream: si el último intento de sync está `running` o `failed`, checkout bloquea hasta un intento exitoso.
- Outcome `older` no cuenta como éxito aplicable a hoy: `last_effective_date` no coincide con la fecha de operación, por lo que se bloquea.
- `inserted` y `unchanged` son los únicos outcomes aceptables, siempre que `last_success_at` no sea nulo y `last_effective_date` sea igual o posterior a hoy en Caracas.
- No se exige que `last_success_at` sea de las últimas 24 horas: si el viernes se publica anticipadamente una tasa con fecha efectiva lunes, checkout del viernes sigue usando solo la fila efectiva viernes; el lunes usa la fila efectiva lunes. La fecha devuelta por el último sync puede ser futura, pero nunca anterior a hoy.
- La lectura de estado toma un lock compartido hasta el commit/rollback del checkout. Un sync que intenta pasar a `running` espera a que termine una venta ya autorizada; si el sync comenzó primero, checkout observa `running` y falla cerrado.
- Los replays idempotentes de ventas ya completadas pueden devolver el resultado existente sin volver a ejecutar una venta ni consumir inventario; el guard de tasa aplica antes de crear una venta nueva. El handler busca ventas existentes antes del guard de tasa; el replay devuelve el snapshot previo sin crear venta ni consumir inventario. La política aplica a ventas nuevas.

## Closure and handoff

- Final tested code SHA: `3a67540c7b079bb11349552ffe92c598f0fad11f`. El checkpoint documental siguiente cambia HEAD y requiere nueva validación exact-HEAD.
- PR: https://github.com/BTF14/Micro-app/pull/295 (OPEN/Draft; base `integration/bcv-checkout-rehearsal-20261109`).
- Checks: 14/14 check-runs SUCCESS y 10/10 workflow runs SUCCESS en SHA probado. CI `42626127554`; Database migration validation `42626127525`; PostgreSQL migration runner `42626127563`; Playwright `42626127582`; Semgrep `42626127548`; Dependency review `42626127513`; ODD docs `42626127555`; Project dashboard `42626127547`; Secret history `42626127604`; Security scan `42626127524`.
- Acceptance criteria met: AC-1–AC-7. CI incluye unit tests, PostgreSQL atomic sales checkout integration y Runtime-role API integration; todos SUCCESS.
- Limitations not verified: fixture HTML oficial BCV, calendario bancario oficial, revisión legal/contable, alertas/identidad Worker.
- Residual risks: umbrales parser 10/7 sin aprobación; reglas comerciales de devolución/anulación/cambio siguen pendientes; producción NOT READY.
- Next step: mantener #295 Draft hasta revisión independiente y decisión de integración en #287; no merge automático.


## Revisión técnica independiente — 2026-11-09

- SHA revisado y validado: `32b838c9dd90c7b5c17e359961bd67f48376d1a8`. PR #295 sigue OPEN/Draft, base `integration/bcv-checkout-rehearsal-20261109` (base SHA `362443524eb45c67da16811d1745d83ddc9bd3a9`), mergeable=true; 37 commits ahead / 0 behind. No se fusionó.
- Verificación viva: 10/10 workflow runs SUCCESS asociados al SHA; la descripción de PR registra 14/14 check-runs SUCCESS. No hay reviews formales ni hilos de revisión.
- Revisión del flujo: `syncBcvOfficialRate()` reclama el singleton con UPDATE a `running` antes del fetch HTTP; checkout toma `FOR SHARE` en la misma fila dentro de su transacción. Si checkout obtiene primero el lock, el UPDATE de inicio de sync espera hasta el final de la venta; si sync confirma primero `running`, checkout observa ese estado y falla cerrado. La finalización del sync verifica `attempt_id` bajo `FOR UPDATE` y persiste tasa + estado terminal en una transacción, evitando que intentos supersedidos sobrescriban al vigente.
- Permisos: migración 0021 concede SELECT y UPDATE por columnas a `microapp_runtime`, sin INSERT/DELETE/TRUNCATE; la prueba runtime-role verifica el lock compartido frente a UPDATE concurrente.
- Dictamen de código: no se encontró un bloqueo de corrección en el flujo revisado de checkout/sync. La validación no equivale a aprobación formal de PR ni a readiness de producción.
- Riesgo operativo pendiente: el Cron BCV está programado para `0 22 * * 1-5`, exige `APP_ENV=production` y `BCV_SYNC_ENABLED=true`, y permanece deshabilitado por defecto. No se observó un mecanismo de retry inmediato ni alerta operativa en este alcance. Si un intento falla o queda `running`, nuevas ventas siguen bloqueadas hasta el siguiente intento habilitado que finalice con éxito; hace falta definir alertas y recuperación operativa antes de producción.
- No hubo merge, cambios en main, escrituras Neon, deploy, activación Cron, cambios de secretos/DNS/billing ni uso de datos reales. Producción **NOT READY**.
