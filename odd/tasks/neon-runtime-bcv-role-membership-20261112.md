# Tarea crítica — Membresías Neon para runtime y productor BCV

- **Estado:** in progress
- **Issue / PR:** PR #337; Turno 31 / Turno 32
- **Owner / reviewer:** propietario / revisión técnica
- **Started:** 2026-11-12
- **Risk:** critical

## Objective and authorization

- **Desired outcome:** hacer compatible el contrato de mínimo privilegio de `microapp_bcv_sync` y `microapp_runtime` con la arista administrativa entrante que PostgreSQL 16+ crea al ser el rol creado por el propietario no-superuser de la base.
- **Authorization boundary:** una única rama/PR #337 desde `908a01fd891a83bfd8c2d605a37ba91fa62e3db0`; CI y squash merge solo tras gates exact-SHA. Sin Neon, Secrets, Cloudflare, despliegue manual, PRs #193/#314/#315/#316 ni Issue #53.
- **Relevant request:** directiva del propietario/Tech Lead “Revisión Turno 31 y autorización quirúrgica — PR #337”.

## Scope and exclusions

Included:
- Preflight y assertions de 0022: prohibir toda membresía saliente; permitir únicamente la arista entrante de `pg_database.datdba` con ADMIN puro; rechazar USAGE/SET efectivos para propietarios no-superuser.
- Restore assertions del runtime con la misma invariante.
- Test PostgreSQL 18 separado, con roles creados por un propietario no-superuser CREATEROLE; migraciones 0001–0023, assertions y escenarios fail-closed.
- Registrar evidencia, ADR y continuidad.

Excluded:
- Cualquier mutación Neon/Secrets/Cloudflare o acceso a datos reales.
- Cambios de permisos funcionales, grants de tablas, API o runtime de aplicación.
- Cualquier cambio a PRs #193/#314/#315/#316 o Issue #53.

## Acceptance criteria

- [ ] AC1 — 0022 preflight y assertions rechazan toda membresía saliente y toda entrante distinta de `datdba`; la entrante permitida exige ADMIN OPTION=true, INHERIT=false, SET=false y ausencia de USAGE/SET efectivos.
- [ ] AC2 — restore_role_assertions_main aplica idéntica invariante a `microapp_runtime`.
- [ ] AC3 — PostgreSQL 18 crea runtime y producer desde LOGIN propietario no-superuser CREATEROLE y demuestra la arista automática ADMIN-only.
- [ ] AC4 — adopt-baseline + migrate 0001–0023 + ambas assertions pasan con la arista legítima.
- [ ] AC5 — pruebas negativas demuestran fail-closed para outgoing, incoming rogue, owner SET e INHERIT, para producer y runtime.
- [ ] AC6 — no hay SHA literal fijado para 0022 ni cambios ajenos; diff completo y CI exact-HEAD pasan.
- [ ] AC7 — docs de estado, diario, handoff, tarea ODD y ADR quedan reconciliados.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Aceptar un miembro no propietario | Critical | Join exacto a pg_database.datdba; test incoming rogue |
| Permitir que el owner asuma/herede runtime/producer | Critical | Flags pg_auth_members y pg_has_role USAGE/SET; tests SET e INHERIT |
| Ruptura en owner superuser de CI | High | El bypass inherente de superuser se documenta; la arista administrada se prueba con owner no-superuser |
| Checks obsoletos o PR base movida | High | Reconsultar base, HEAD y todos los check-runs exact-HEAD antes del merge |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspeccionar AGENTS, Constitución, ODD y política PR | Contrato de ejecución y límites conocidos | GitHub fetch en base verificada | done |
| Modificar preflight y assertions 0022 | Invariante simétrica | PostgreSQL 18 CI | in progress |
| Modificar restore runtime assertions | Invariante simétrica | PostgreSQL 18 CI | in progress |
| Añadir harness PostgreSQL 18 propietario no-superuser | Positivo y negativos para ambos roles | workflow migration-runner | in progress |
| Documentar hallazgo y decisión | Continuidad sin duplicar snapshots | CURRENT_STATE, STATE_JOURNAL, HANDOFF, ADR | in progress |
| Revisar diff y CI exact-SHA | Todos los gates requeridos | PR #337 | pending |

## Technical decisions

- La membresía entrante legítima debe estar representada por `roleid = aplicación` y `member = pg_database.datdba`. El rol aplicación no recibe una membresía saliente.
- La arista se valida por flags explícitos y por ausencia de capacidades efectivas USAGE/SET del propietario no-superuser.
- `pg_has_role` considera el bypass inherente de superuser; el control de capacidad efectiva se ejecuta para database owners no-superuser, que es el contrato relevante para Neon managed owner.

## Closure and handoff

- **Final commit SHA:** pending
- **PR:** #337 pending creation
- **Checks and exact outcomes:** pending
- **Acceptance criteria met / unmet:** pending
- **Limitations not verified:** Neon real no se reensaya en este turno.
- **Residual risks:** requiere nueva autorización/ventana para Fase 2 definitiva Neon tras merge.
- **Next step:** abrir PR #337 y completar CI exact-HEAD antes de merge.
