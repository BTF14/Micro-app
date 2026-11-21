# ODD task: Micro-PR 4A — backend de cierres, reportes y exportación CSV

- Status: in progress
- Issue / PR: [PR #402 — OPEN / Draft](https://github.com/BTF14/Micro-app/pull/402)
- Owner / reviewer: propietario del producto / revisión técnica independiente
- Started: 2026-11-21
- Risk: high

## Objective and authorization

- Desired outcome: implementar contrato backend de PR 4 (turnos, cierre, reportes de ventas/inventario y CSV) con aislamiento tenant/sucursal y valoración Owner-only.
- Authorization boundary: base exacta `main` SHA `10d24105c49f7d5c240ef298c353b782f0cca255`; exactamente doce archivos: los once del alcance original más `.github/workflows/ci.yml`; la ampliación actualiza tres de esos once archivos ya autorizados; PR Draft sin merge/auto-merge.
- Relevant original request: Micro-PR 4A; ADR v1.1 sección PR 4; matriz RBAC aprobada; `odd/TASK_TEMPLATE.md`.

## Scope and exclusions

Included:
- SDD 4A y ODD de esta tarea.
- Permiso `reports.inventory.valuation` independiente y Owner-only.
- Helpers puros Caracas, decimal exacto y CSV seguro.
- Rutas API de lista de turnos, resumen de cierre, reportes y CSV de ventas/inventario.
- Pruebas unitarias e integración con PostgreSQL 18 y rol runtime restringido; el workflow `.github/workflows/ci.yml` invoca explícitamente `src/reports.integration.test.ts` con `DATABASE_URL` y `DATABASE_URL_RUNTIME` en `microapp_runtime`, `DATABASE_URL_ADMIN` y el productor BCV de la base efímera.
- Registro de rutas y reconciliación de continuidad documental.

Excluded:
- Migraciones SQL, grants y cualquier archivo en `apps/api/migrations/**`.
- `apps/web/**`, `packages/**`, otros workflows distintos de `.github/workflows/ci.yml`, dependencias y `package.json`.
- Neon main, secretos, producción, deploy, datos reales y gates globales.
- UI ReportsPanel, resumen UI, leyenda SalesPanel y E2E frontend: corresponden a Micro-PR 4B.

## Acceptance criteria

- [ ] AC-1 — Diff limitado exactamente a doce archivos autorizados: los once originales más `.github/workflows/ci.yml`.
- [ ] AC-2 — `reports.inventory.valuation` reconocido por autorización y concedido exclusivamente a Owner.
- [ ] AC-3 — Rangos Caracas semiabiertos daily/weekly/monthly/custom válidos y límites/rechazos cubiertos.
- [ ] AC-4 — Cálculos monetarios exactos con strings NUMERIC/bigint; diferencias negativas y positivas.
- [ ] AC-5 — CSV textual neutralizado y numéricos canónicos no alterados.
- [ ] AC-6 — Endpoints de turnos/cierre/ventas/inventario aplican RBAC, sucursal, tenant y fail-closed.
- [ ] AC-7 — SQL para Admin/Inventory omite coste y valoración de coste; solo Owner puede consultarlos.
- [ ] AC-8 — Pruebas unitarias e integración PostgreSQL 18 completadas con `microapp_runtime`; incluyen valoración Owner-only con stock ledger-backed, segunda sucursal sin membresía Inventory, checkout real draft→items/payments→completed, pagos USD/VES/other, snapshot FX, corte Caracas 04:00Z, void, CSV y aislamiento tenant/cajero.
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
| CI reports PG18 | `ci.yml` invoca la suite específica bajo `microapp_runtime` | Step `PostgreSQL reports and shift closure integration tests` en `CI / verify` | in progress |
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

- Último SHA observado antes de esta sincronización ODD: `f1cda9d1d4119b08d4195467896a89a3741a78c6`; la sincronización documental generará un nuevo SHA y exige revalidación completa.
- PR: #402 debe permanecer OPEN / Draft; sin merge ni auto-merge.
- Evidencia CI: el commit `ddb853838c70f18ec131693fba854ef4ead65910` ejecutó el nuevo step en PostgreSQL 18. Falló en el setup por el fixture anterior que escribía directamente `inventory_balances` y recibió `INVENTORY_BALANCE_WRITES_MUST_ORIGINATE_FROM_LEDGER`. El fixture fue cambiado a `inventory_counts` + `warehouse_inventory_movements`; la suite se amplió y queda pendiente confirmar el resultado en el SHA final.
- Checks and exact outcomes: pendientes en SHA final exacto; no heredar resultados de SHA anteriores.
- Acceptance criteria met / unmet: pendientes de CI completo y revisión del diff de doce archivos.
- Limitations not verified: no checkout local; no ejecución local de tests/build/PG18/validador.
- Residual risks: la integración ampliada todavía debe pasar realmente en PostgreSQL 18; la suite no se considera validada hasta que el nuevo step y todos los check-runs terminen en success.
- Next step: completar CI exact-HEAD de PR #402 y revisión del diff; después Micro-PR 4B UI Cierres/Reportes/CSV + leyenda FISC-01 + E2E; luego Tour Visual + favicon.svg + docs/USER_MANUAL.md; gates finales.
