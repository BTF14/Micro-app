# ODD task: Gestión de contingencia cambiaria

- Status: proposed
- Issue / PR: [PR #288](https://github.com/BTF14/Micro-app/pull/288) — MERGED; documentación integrada en `main`
- Owner / reviewer: propietario del producto; revisión técnica/seguridad y contable/legal pendientes
- Started: 2026-11-09
- Risk: critical

## Objective and authorization

- Desired outcome: especificar una contingencia cambiaria temporal, autorizada y auditable para permitir operación controlada ante feriados, retrasos de publicación o indisponibilidad del BCV, sin fallback automático ni pérdida de trazabilidad.
- Authorization boundary: autorizado documentar la propuesta y su diseño. No autorizado por este trabajo crear endpoints, permisos, migraciones, cambiar checkout, modificar PR #255/#269/#287, habilitar feature flags, escribir en Neon, activar Cron, desplegar o alterar Cloudflare/secretos.
- Relevant original request: el propietario quiere una opción en Configuración para gestionar una fuente manual de conversión durante contingencias, restringida a actores autorizados, con PIN individual al autorizar en pequeños comercios, control empresarial, confirmación explícita y registro completo.

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
- [x] AC-5 — Resuelto 2026-11-15: Owner o Admin con delegación explícita `fx.contingency.authorize`, limitada a sucursales asignadas al Admin y no concedida por defecto; vigencia máxima 24 h, expiración automática y renovación explícita auditable con PIN.
- [ ] AC-6 — Revisión legal/contable venezolana y evidencia de aceptación del precio, pendiente antes de implementar.
- [ ] AC-7 — Revisión independiente de seguridad y datos antes de implementación, pendiente.

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
| Resolver permiso | Owner vs Admin delegado según matriz | Confirmación del propietario 2026-11-15: Owner o Admin con delegación explícita y alcance de sucursales asignadas | completed |
| Validar legal/contable | Política admisible y evidencia de cliente | Fuentes primarias + asesoría profesional | pending |
| Auditar auth/auditoría existente | Reusar modelo, seleccionar KDF/MFA y schema | Revisión de código y tests | pending |
| Implementar en rama aislada | API, DB, checkout, UI | Unit + PostgreSQL + concurrencia + E2E + seguridad + CI exact-SHA | blocked |

## Technical decisions

- ADR: `docs/decisions/ADR-20261109-fx-contingency-authorization.md` (accepted para política/arquitectura; implementación gated).
- Spec: `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`.
- AC-5 está resuelto como decisión. No crear endpoints hasta cerrar AC-6/AC-7 y levantar el freeze v1.1.
- La especificación no cambia la política BCV actual; describe una excepción futura sujeta a aprobación legal y de producto.

## Closure and handoff

- Final commit SHA: consultar HEAD vivo de PR #288; el propio asiento de cierre cambia la punta.
- PR: #288 OPEN/Draft.
- Último HEAD validado antes de este asiento documental: `d6c580dcc63e5bba3147a6660bce2820aa8ca455`; 14/14 check-runs SUCCESS y 10/10 workflow runs SUCCESS (CI, Playwright E2E, migration validation/runner, Security scan, Semgrep, Secret history, Dependency review, ODD docs y dashboard). Este nuevo commit del task log cambia el HEAD y exige revalidación exact-SHA.
- Acceptance criteria met / unmet: AC-1–AC-5 cubiertos como especificación/decisión; AC-6 revisión legal/contable y AC-7 revisión independiente de seguridad siguen pendientes. No hay implementación; validar CI sobre el HEAD final de la PR documental.
- Limitations not verified: estado exacto de autenticación MFA/PIN y esquema de auditoría; legalidad de tasa manual; capacidad de aceptación digital.
- Residual risks: la excepción manual no puede habilitarse hasta cerrar gates críticos.
- Next step: revisar los documentos en la rama, ejecutar validadores documentales/CI y abrir PR Draft docs-only.


## Resolución AC-5 y controles obligatorios — 2026-11-15

**AC-5: DONE (decisión del propietario; no implementación).** Owner o Admin con delegación explícita `fx.contingency.authorize`, solo en sucursales asignadas; no concedido por defecto. PIN individual >=8 dígitos, KDF fuerte, rate limit por cuenta/IP, banda de desviación razonable y confirmación reforzada ante desvíos altos. Auditoría inmutable server-side con actor_user_id, rol efectivo, sucursal, timestamp UTC del servidor, motivo, origen manual, tasa y vigencia. Autorización máxima 24 h; expiración automática; renovación explícita con PIN y auditoría separada; retorno automático a BCV al existir tasa oficial válida aplicable. Revalidación tenant/sucursal/permiso server-side y fail-closed.

**AC-6 y AC-7 permanecen OPEN:** revisión legal/contable y revisión independiente de seguridad antes de cualquier implementación. Freeze v1.1 vigente.
