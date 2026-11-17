# ODD task: Gestión de contingencia cambiaria

- Status: in_progress
- Issue / PR: [PR #288](https://github.com/BTF14/Micro-app/pull/288) — MERGED; documentación integrada en `main`
- Owner / reviewer: propietario del producto; implementación autorizada; AC-7 independiente obligatorio antes del merge; AC-6 contable/legal obligatorio antes de habilitación comercial
- Started: 2026-11-09
- Risk: critical

## Objective and authorization

- Desired outcome: especificar una contingencia cambiaria temporal, autorizada y auditable para permitir operación controlada ante feriados, retrasos de publicación o indisponibilidad del BCV, sin fallback automático ni pérdida de trazabilidad.
- Authorization boundary: implementación de PR 1 autorizada únicamente en `feat/fx-contingency-pr1-20261117`, base `04d3679189edaab17221f1e8cd425cc68fa53155`. Incluye migración 0026 + assertions, servicios/API, frontend mínimo y pruebas PR-1. Excluye Carril A, Carril B1 y Hardening no relacionado; no modificar PR #255/#269/#287, Neon, Cloudflare, secretos ni producción. AC-7 independiente es gate obligatorio previo al merge; AC-6 legal/contable es gate de habilitación comercial.
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
- [ ] AC-6 — Revisión legal/contable venezolana y evidencia de aceptación del precio; gate obligatorio previo a habilitación comercial (no bloquea implementación ni merge).
- [ ] AC-7 — Revisión independiente de seguridad y datos; revisión de diseño ya realizada se conserva como base de entrada; cierre independiente de migración 0026 real, triggers, privilegios, KDF Wrangler, PG-01..PG-30 y diff completo es gate obligatorio previo al merge.

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
| Implementar en rama aislada | API, DB, checkout, UI | Unit + PostgreSQL + concurrencia + E2E + seguridad + CI exact-SHA | in progress |

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


## Addendum vinculante — autorización de rama PR 1 (2026-11-17)

- Base solicitada por el propietario: `04d3679189edaab17221f1e8cd425cc68fa53155`.
- Rama creada: `feat/fx-contingency-pr1-20261117`, directamente desde ese SHA exacto. No se creó PR ni se modificó `main`.
- Autorización recibida: implementar PR 1 conforme al plan de implementabilidad aprobado, sin mezclar Carril A, Carril B1 ni Hardening ajeno.
- **Verificación temporal obligatoria:** `bcv_sync_success_observations.observed_at` y `fx_contingency_authorizations.starts_at` se asignan con `clock_timestamp()`. La recuperación compara `obs.observed_at > auth.starts_at`; no exige `obs.last_success_at > auth.starts_at`, porque el productor puede haber escrito `last_success_at = now()` al inicio de la transacción.
- **Contrato 0021:** la redefinición de `assert_sale_latest_bcv_sync_success()` conserva `SECURITY DEFINER`, propietario `microapp_migrator`, `search_path` restringido y las revocaciones de EXECUTE verificadas por `0021_bcv_sync_state.assertions.sql`.
- **Observaciones BCV:** tabla append-only con triggers `ENABLE ALWAYS`; `REVOKE ALL` de `PUBLIC` y `microapp_bcv_sync`; `GRANT SELECT` únicamente a `microapp_runtime`. El trigger de captura no amplía grants del productor.
- **ACK en sales:** `manual_contingency` exige `manual_fx_acknowledged_at IS NOT NULL` y `manual_fx_acknowledged_by_user_id = created_by`; `bcv_official` exige ambos campos `NULL`.
- **Gate comercial:** la capacidad no se habilita para operación comercial hasta recibir visto bueno escrito del asesor contable/legal sobre el comprobante (AC-6). El freeze comercial permanece.
- **Pruebas exigidas:** runtime KDF real con Wrangler; `0026_fx_contingency_management.assertions.sql`; PG-01..PG-30, incluidas carreras de concurrencia y límites de medianoche con `clock_timestamp()`; CI completo sobre el SHA final.
- **Estado de autorización actualizado (2026-11-17):** el propietario confirmó que la revisión independiente de diseño ya realizada es la base de entrada y autorizó iniciar la implementación. AC-7 completo se exige antes del merge, auditando los artefactos reales. La restricción anterior de no introducir código antes de AC-7 queda supersedida por esta autorización posterior.


## Addendum de autorización y ejecución PR 1 — 2026-11-17

- El propietario autorizó la implementación escalonada en `feat/fx-contingency-pr1-20261117`, creada desde el SHA exacto `04d3679189edaab17221f1e8cd425cc68fa53155`.
- AC-7: la revisión independiente de diseño ya realizada es la base de entrada. El cierre independiente contra la implementación real (migración 0026, assertions/triggers/ACL, KDF en runtime Wrangler, PG-01..PG-30 y diff completo del PR) es gate obligatorio **antes del merge a main**. No presentar la revisión propia de implementación como revisión independiente.
- AC-6: no bloquea implementación/merge por sí solo, pero la contingencia permanecerá deshabilitada comercialmente hasta recibir validación escrita del asesor contable/legal sobre el comprobante y su evidencia de aceptación.
- Secuencia autorizada: (1) 0026 + assertions; (2) servicios/API; (3) frontend mínimo; (4) PG-01..PG-30 + Wrangler KDF + CI; (5) revisión independiente AC-7; (6) cierre documental, incluida reconciliación SHA/estado en CURRENT_STATE y HANDOFF_NEXT_CHAT.
- Contratos SQL obligatorios:
  - `observed_at` y `starts_at` se asignan con `clock_timestamp()`; recuperación compara `obs.observed_at > auth.starts_at`, sin exigir `obs.last_success_at > auth.starts_at`.
  - Redefinición de `assert_sale_latest_bcv_sync_success()` conserva `SECURITY DEFINER`, owner `microapp_migrator`, `search_path` restringido y revocaciones exactas de 0021.
  - `bcv_sync_success_observations`: append-only, triggers `ENABLE ALWAYS`, `REVOKE ALL` a PUBLIC y `microapp_bcv_sync`; `GRANT SELECT` solo a `microapp_runtime`.
  - ACK: fuente manual exige timestamp y actor igual a `sales.created_by`; fuente BCV exige ambos campos NULL.
- Excluido explícitamente: Carril A, Carril B1 y Hardening ajeno a PR 1. Sin mutaciones remotas en Neon ni operaciones de Cloudflare/secretos.


## Ejecución PR 1 — corte de implementación (2026-11-17)

- PR: [#377 Draft](https://github.com/BTF14/Micro-app/pull/377), base `main`; rama `feat/fx-contingency-pr1-20261117`.
- Migración `0026_fx_contingency_management.sql` y assertions creadas: tablas PIN/delegaciones/autorizaciones/eventos/evidencia de sync; snapshots de venta; CHECK ACK; locks SECURITY DEFINER; triggers append-only ENABLE ALWAYS; ACL mínimo; redefinición de guards.
- Servicios/API: rutas de PIN, delegaciones, estado, autorización/renovación/revocación; lock order BCV→FX; transición `bcv_restored` en transacción separada tras rollback del checkout.
- Checkout/frontend: fuente BCV/manual, snapshot manual sin `exchange_rate_id`, ACK del cajero vinculado a la tasa exacta mostrada, recibo con literal requerido.
- KDF: PBKDF2-SHA256 versionado y salt único; Wrangler runtime test agregado a CI.
- Pruebas añadidas: PG-01..PG-30, casos integrados de checkout manual, recuperación `inserted`/`unchanged`, tasa futura, replay idempotente y UI de AC-6/ACK.
- CI: agregado paso de assertions 0026, suite PostgreSQL FX y Wrangler KDF. **Ejecución CI sobre HEAD final aún pendiente de evidencia; no marcar pruebas como PASS hasta leer sus resultados exact-SHA.**
- **ACL PIN:** el runtime requiere SELECT de los verificadores (versión/iteraciones/salt/hash) para ejecutar PBKDF2 y verificar PIN; se deniega INSERT/UPDATE/DELETE directo y la escritura pasa por función SECURITY DEFINER estrecha. `microapp_bcv_sync` no accede a credenciales. Este es un ajuste explícito del requisito de “no lectura runtime” incompatible con verificación KDF en el Worker, manteniendo la mínima capacidad necesaria.
- **AC-6:** `FX_CONTINGENCY_ENABLED` es opt-in y queda sin configurar/false fuera de pruebas; no habilitar operación comercial hasta la aprobación escrita contable/legal.
- Sin cambios en `main`, Neon, Cloudflare, secretos o despliegues. Sin Carril A, Carril B1 ni Hardening ajeno.
- `CURRENT_STATE.md` y `HANDOFF_NEXT_CHAT.md` se reconciliarán únicamente en el cierre documental final (paso 9), según instrucción del propietario.


### CI correction log — 2026-11-17

- Exact-SHA run on `67353389d73a1084d3028fde3f5b3b5d2604361e`: migration runner failed while compiling `assert_completed_sale_reconciled()`; PostgreSQL reported a syntax error at the inline `CASE` expression in the payment reconciliation `IF`.
- Corrected by parenthesizing the `CASE` expression. Fix commit: `c5130b6510063227b4502f9054e71323352c619b`.
- The failure was a migration syntax defect, not an environment/permissions failure. The new HEAD requires a fresh migration-runner and full-CI result; no PASS is inferred from the correction.


- Segundo exact-SHA intento `9847d0bdc63d60928fdb864970623a52ac18fb19`: migración avanzó más allá del parser, pero el GRANT conservaba por error la firma anterior de seis argumentos del helper PIN, mientras la función ya tenía siete (actor explícito). Se corrigió el GRANT a `set_fx_user_pin_credential(uuid,uuid,uuid,text,integer,bytea,bytea)`.
- Fix commit: `ba27538b4105c297e8429426a346eee06fe553f8`. Se requiere otra ejecución exact-SHA; no se afirma aún que el migration runner esté verde.


- Tercer exact-SHA run `ce0a01d664738247ac4588e4cb220f0ddf524ef1`: **migration-runner validation pasó**, incluida la aplicación de 0026. El job de contrato managed-owner falló porque `scripts/tests/test_managed_role_membership.sh` aún esperaba 25 migraciones y solo ejecutaba assertions hasta 0025.
- Actualizado el contrato CI a 26 migraciones y añadido `0026_fx_contingency_management.assertions.sql` tanto en la pasada principal como en la verificación positiva final.
- Fix commit: `f7b886b28813fd3befc56d078559c69cc6c0338d`. Requiere nuevo CI exact-SHA.
