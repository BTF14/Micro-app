# ODD task: Reconciliación de estado vivo — 2026-11-09

- Status: in progress
- PR: docs-only PR #291 (pendiente de creación)
- Risk: medium (documentation accuracy; no runtime changes)

## Objective

Actualizar la documentación operativa principal después de integrar PR #288 y completar la corrección de concurrencia BCV en la rama #287. Los snapshots del 2026-11-08 no representan la punta actual.

## Authorization boundary

Autorizado: lectura GitHub, conciliación de documentos y PR docs-only desde main. No autorizado por esta tarea: merge de #255/#269/#287, deploy, escrituras Neon, activar Cron BCV, cambios manuales Cloudflare, secretos, DNS, billing o producción.

## Evidence at start

- Main: `bfa7d0047d158d5caae4798337f239e767c30acd`; post-merge checks 11/11 SUCCESS.
- PR #288 merged docs-only en main; feature FX contingency documentada como propuesta no implementada.
- PR #255: HEAD `b0e47205b96f636b2ab270304d2598423a50ccc3`, 88 ahead / 1 behind main, 15/15 check-runs SUCCESS; 10 workflow runs SUCCESS; OPEN/Draft, sin aprobación formal.
- PR #269: HEAD `7fc91b54f869664febb6a7daf1ed05b408bd8430`, 63 ahead / 1 behind, 18/18 check-runs SUCCESS; 11 workflow runs SUCCESS; OPEN/Draft, sin aprobación formal, su único review thread está RESOLVED.
- PR #287: HEAD `254ebb6e741f7c1b147fbd4880bc188f17204807`, 111 ahead / 1 behind, 15/15 check-runs SUCCESS y 11/11 workflows SUCCESS; OPEN/Draft, sin aprobación formal ni threads.
- #287 contiene corrección de carrera BCV y test PostgreSQL con dos tasas diferentes; PRs #289 y #290 integradas solo en la rama #287, no en main.
- Freshness sigue siendo gate P1: checkout no consume `bcv_sync_state.last_success_at`; umbrales parser 10/7 sin justificación aprobada.
- Fixture HTML real BCV y calendario bancario oficial 2027 no obtenidos; BCV directo devolvió 502 y SUDEBAN no devolvió PDF oficial verificable en esta búsqueda.

## Acceptance criteria

- [ ] AC-1 — CURRENT_STATE, HANDOFF_NEXT_CHAT, WORK_CHECKPOINT, PROJECT_PLAN, STATE_JOURNAL y SECURITY_ROADMAP contienen una sección reciente coherente.
- [ ] AC-2 — Cada PR/HEAD/base/check count está claramente identificado como snapshot, sin reutilizar SHA antiguos.
- [ ] AC-3 — Se documenta que la contingencia FX está en propuesta y no implementada.
- [ ] AC-4 — Se documentan gates P1 de freshness, fixture, calendario y validación legal.
- [ ] AC-5 — CI exact-HEAD del PR documental pasa y se integra solo documentación.

## Guardrails

- No afirmar que #255/#269/#287 están listos para merge por CI verde.
- No convertir búsqueda fallida en afirmación de que una fuente oficial no existe.
- No usar calendario de terceros como prueba oficial.
- No tocar producción ni servicios externos.

## Closure

- PR #291 y SHA final: pendientes.
- CI exact-HEAD: pendiente.
- Residual risk: el estado de GitHub puede cambiar; reconsultar antes de cualquier merge o despliegue.
