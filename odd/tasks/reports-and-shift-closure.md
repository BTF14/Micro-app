# ODD task: Micro-PR 4A — backend de cierres, reportes y exportación CSV

- Status: in progress
- Issue / PR: Micro-PR 4A; PR por crear en Draft
- Owner / reviewer: propietario del producto / revisión técnica independiente
- Started: 2026-11-21
- Risk: high

## Objective and authorization

- Desired outcome: implementar contrato backend de PR 4 (turnos, cierre, reportes de ventas/inventario y CSV) con aislamiento tenant/sucursal y valoración Owner-only.
- Authorization boundary: base exacta `main` SHA `10d24105c49f7d5c240ef298c353b782f0cca255`; solo los once archivos enumerados en la solicitud; PR Draft sin merge/auto-merge.
- Relevant original request: Micro-PR 4A; ADR v1.1 sección PR 4; matriz RBAC aprobada; `odd/TASK_TEMPLATE.md`.

## Scope and exclusions

Included:
- SDD 4A y ODD de esta tarea.
- Permiso `reports.inventory.valuation` independiente y Owner-only.
- Helpers puros Caracas, decimal exacto y CSV seguro.
- Rutas API de lista de turnos, resumen de cierre, reportes y CSV de ventas/inventario.
- Pruebas unitarias e integración con PostgreSQL 18 y rol runtime restringido.
- Registro de rutas y reconciliación de continuidad documental.

Excluded:
- Migraciones SQL, grants y cualquier archivo en `apps/api/migrations/**`.
- `apps/web/**`, `packages/**`, workflows, dependencias y `package.json`.
- Neon main, secretos, producción, deploy, datos reales y gates globales.
- UI ReportsPanel, resumen UI, leyenda SalesPanel y E2E frontend: corresponden a Micro-PR 4B.

## Acceptance criteria

- [ ] AC-1 — Diff limitado exactamente a los once archivos autorizados.
- [ ] AC-2 — `reports.inventory.valuation` reconocido por autorización y concedido exclusivamente a Owner.
- [ ] AC-3 — Rangos Caracas semiabiertos daily/weekly/monthly/custom válidos y límites/rechazos cubiertos.
- [ ] AC-4 — Cálculos monetarios exactos con strings NUMERIC/bigint; diferencias negativas y positivas.
- [ ] AC-5 — CSV textual neutralizado y numéricos canónicos no alterados.
- [ ] AC-6 — Endpoints de turnos/cierre/ventas/inventario aplican RBAC, sucursal, tenant y fail-closed.
- [ ] AC-7 — SQL para Admin/Inventory omite coste y valoración de coste; solo Owner puede consultarlos.
- [ ] AC-8 — Pruebas unitarias e integración PostgreSQL 18 con rol `microapp_runtime` completadas.
- [ ] AC-9 — Continuidad documental corregida y siguiente paso 4B explícito.
- [ ] AC-10 — Todos los check-runs y workflows sobre SHA final exacto terminan en success; PR queda OPEN/Draft.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Fuga de coste por proyección SQL o CSV | Critical | Rama SQL condicional Owner-only; tests JSON/CSV por rol |
| Cross-tenant / sucursal | Critical | Contexto de sesión y authorizeBranchOperation; filtros SQL explícitos |
| Errores decimales y caja negativa | High | @micro-app/money, NUMERIC::text, bigint |
| Fórmulas en CSV | High | Neutralizar texto no confiable + quoting RFC-4180 |
| Objetos/grants aún no presentes | High | 503 ante 42P01/42883/42703/42501 |
| Evidencia CI obsoleta | High | Validar SHA final exacto; no heredar checks |
| Drift documental | Medium | Encabezados vigentes post-#401 en los tres docs |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verificar main y PRs abiertas | Base coincide; sin conflicto | GitHub branch + pulls API | completed |
| Crear rama desde SHA base | Rama aislada | GitHub branch ref | completed |
| SDD y ODD | Contrato 4A/4B registrado | Diff y validación documental CI | in progress |
| RBAC Owner-only | Permiso independiente | authorization.test.ts + verify | in progress |
| Helpers/rutas backend | Contratos 4A implementados | Vitest + verify | in progress |
| Integración PG18 | Pruebas con runtime real | CI PostgreSQL 18 | pending |
| Continuidad | Estado post-#401 y 4B siguiente | Revisión documental | pending |
| Check-runs final | 100 % success en SHA exacto | GitHub Actions/check-runs | pending |

## Technical decisions

- `register_shifts` es una sesión; no se corta a medianoche.
- Reportes calendario usan America/Caracas UTC-4, intervalos semiabiertos.
- `completed_at` es el timestamp de selección de ventas completadas.
- Snapshots FX son históricos e inmutables.
- La valoración de costo es Owner-only y se aplica en SQL.
- No se añade índice ni migración sin evidencia y autorización independiente.

## Closure and handoff

- Final commit SHA: pendiente.
- PR: pendiente; debe crearse OPEN / Draft.
- Checks and exact outcomes: pendientes en SHA final exacto.
- Acceptance criteria met / unmet: pendientes de CI y revisión final.
- Limitations not verified: no checkout local; no ejecución local de tests/build/PG18/validador.
- Residual risks: integración completa de pagos y snapshots requiere validación PG18; revisión de rutas y proyecciones pendiente.
- Next step: Micro-PR 4B UI Cierres/Reportes/CSV + leyenda FISC-01 + E2E; luego Tour Visual + favicon.svg + docs/USER_MANUAL.md; gates finales.
