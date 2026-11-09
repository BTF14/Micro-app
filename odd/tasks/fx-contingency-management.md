# ODD task: Gestión de contingencia cambiaria

- Status: proposed
- Issue / PR: [PR #288](https://github.com/BTF14/Micro-app/pull/288) — CLOSED/MERGED docs-only into main
- Owner / reviewer: propietario del producto; revisión técnica/seguridad y contable/legal pendientes
- Started: 2026-11-09
- Risk: critical

## Objective and authorization

- Desired outcome: especificar una contingencia cambiaria temporal, autorizada y auditable para permitir operación controlada ante feriados, retrasos de publicación o indisponibilidad del BCV, sin fallback automático ni pérdida de trazabilidad.
- Authorization boundary: autorizado documentar la propuesta y su diseño. No autorizado por este trabajo crear endpoints, permisos, migraciones, cambiar checkout, modificar PR #255/#269/#287, habilitar feature flags, escribir en Neon, activar Cron, desplegar o alterar Cloudflare/secretos.
- Relevant original request: el propietario quiere una opción en Configuración para gestionar el modo BCV/tasa manual, restringida a administradores, con PIN al autorizar en pequeños comercios, control empresarial, confirmación explícita y registro completo.

## Scope and exclusions

Included:
- Definición funcional de modo BCV y contingencia manual.
- Flujos pequeño negocio y empresa multi-sucursal.
- PIN individual, MFA, doble aprobación y permisos mínimos.
- Vigencia, alcance por sucursal, recuperación BCV, snapshots y auditoría.
- Criterios de aceptación, fallos, pruebas y secuencia de implementación.
- ADR para decisión de arquitectura.

Excluded:
- Código fuente de aplicación, endpoints, migraciones y cambios de esquema.
- Cambios a PR #255, #269 o #287.
- Cambios en main, Neon, Cloudflare, secretos, DNS, billing o producción.
- Dictamen legal/contable o afirmación de validez de tasa manual.

## Acceptance criteria

- [x] AC-1 — Existe especificación funcional/técnica que distingue modo BCV de contingencia manual.
- [x] AC-2 — Se documentan PIN individual para pequeños negocios y MFA/doble aprobación para empresas.
- [x] AC-3 — Se documentan vigencia, alcance, permisos, snapshots, auditoría, recuperación BCV y fail-closed.
- [x] AC-4 — Se documenta que aceptación del cajero y aceptación del cliente son distintas.
- [ ] AC-5 — Se resuelve compatibilidad con la matriz aprobada de permisos y se aprueba el rol exacto que autoriza.
- [ ] AC-6 — Se valida el tratamiento legal/contable venezolano y la evidencia de aceptación del precio.
- [ ] AC-7 — Revisión independiente de seguridad y datos antes de implementación.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Tasa manual no admisible fiscal/legalmente | Critical | Revisión legal/contable primaria antes de habilitar |
| Cajero eleva privilegios o comparte PIN | High | Identidad individual, permiso server-side, reauth vinculada a solicitud, rate limit |
| Cruce entre tenants/sucursales | Critical | Claves tenant-safe, checks server/DB y pruebas cross-scope |
| Venta termina con tasa vencida/revocada | Critical | Validación transaccional, locks/orden determinista y pruebas de carrera |
| Auditoría modificable | High | Eventos append-only, grants mínimos y pruebas de integridad |
| Fallback silencioso o BCV futuro/antiguo | Critical | Fuente explícita, effective_date y fail-closed |
| Complejidad/coste de MFA/alertas | Medium | Reusar capacidades existentes y mantener presupuesto $0 |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Inspeccionar normas y contratos existentes | Reconciliar BCV, roles y compliance | Lectura de AGENTS, Constitución, matriz de permisos, ODD y compliance | completed |
| Escribir especificación | Contrato funcional y técnico versionado | `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md` | completed |
| Registrar decisión | ADR propuesto y límites | `docs/decisions/ADR-20261109-fx-contingency-authorization.md` | completed |
| Resolver permiso | Owner vs Admin delegado según matriz | Aprobación explícita del propietario/matriz | pending |
| Validar legal/contable | Política admisible y evidencia de cliente | Fuentes primarias + asesoría profesional | pending |
| Auditar auth/auditoría existente | Reusar modelo, seleccionar KDF/MFA y schema | Revisión de código y tests | pending |
| Implementar en rama aislada | API, DB, checkout, UI | Unit + PostgreSQL + concurrencia + E2E + seguridad + CI exact-SHA | blocked |

## Technical decisions

- ADR: `docs/decisions/ADR-20261109-fx-contingency-authorization.md` (proposed).
- Spec: `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`.
- No ampliar la matriz de permisos ni crear endpoints comerciales hasta resolver AC-5.
- La especificación no cambia la política BCV actual; describe una excepción futura sujeta a aprobación legal y de producto.

## Closure and handoff

- Merge commit SHA: `bfa7d0047d158d5caae4798337f239e767c30acd` (squash en main).
- PR: #288 CLOSED/MERGED (docs-only).
- Merge realizado por squash en `bfa7d0047d158d5caae4798337f239e767c30acd`. Los checks de la PR se validaron antes del merge; este asiento corrige el estado documental, no certifica implementación ni habilitación.
- Acceptance criteria met / unmet: AC-1–AC-4 cubiertos; AC-5–AC-7 pendientes. La propuesta sigue sin implementación.
- Limitations not verified: estado exacto de autenticación MFA/PIN y esquema de auditoría; legalidad de tasa manual; capacidad de aceptación digital.
- Residual risks: la excepción manual no puede habilitarse hasta cerrar gates críticos.
- Next step: cerrar AC-5–AC-7 mediante decisiones de permisos, validación legal/contable y revisión independiente antes de autorizar cualquier implementación.
