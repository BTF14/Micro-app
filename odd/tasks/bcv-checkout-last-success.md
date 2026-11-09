# ODD task: Checkout exige último éxito de sincronización BCV

- Status: completed
- Issue / PR: PR #295 (Draft), contra base temporal de validación idéntica al HEAD de integración #287
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
| Implementar guard de estado BCV | Estado operativo consumido en checkout | `sales-checkout.ts`: `FOR SHARE`, outcomes `inserted`/`unchanged`, `last_success_at` y `last_effective_date` | implemented; CI pending |
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

- Final commit SHA:
- PR: https://github.com/BTF14/Micro-app/pull/295 (OPEN/Draft; base temporal de validación)
- Checks and exact outcomes:
- Acceptance criteria met / unmet:
- Limitations not verified:
- Residual risks:
- Next step:
