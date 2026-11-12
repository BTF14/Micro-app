**Checkpoint vigente — Auditoría documental Turno 21 (2026-11-12 UTC).** Main 01a1b178e041128cfc1a98ab4955132368387523; **11/11 check-runs SUCCESS** exact-SHA. Rama docs/issue-53-full-documentation-audit-20261112. PR abiertas: #193 OPEN/Ready (intacta), #314 jsdom major, #315 Vite major, #316 plugin-react major. Bases registradas anteriores a main; comparar y revalidar checks exactos antes de integrar.

**Gobernanza:** CLAUDE.md importa AGENTS.md; Constitución autoridad normativa; perfiles .github/agents son roles descriptivos, no runtime. Autorización permanente cubre merges elegibles, no operaciones Neon ni readiness. Neon main requiere autorización explícita específica por operación.

**Issue #53 OPEN/P0 — PRODUCTION: NOT READY.** RTO DR sintético 3.953 s en PostgreSQL 18; no es RTO real ni demuestra RPO operativo. Pendiente principal/grants/ownership Neon, backup natural/restore real, RPO/RTO operacionales, alerta/ack, smoke staging, coste USD 0 y aprobación legal/fiscal/contable.

**Siguiente:** operador sigue docs/PRODUCTION_SIGN_OFF_CHECKLIST.md. Sin Neon DDL/DML, secretos, datos reales, deploy manual, Cloudflare/DNS ni billing. USD 0.

---
---

---

---

**Snapshot histórico — Checkpoint previo a Turno 21 (PR #318):** PR #318 merged; main `3ac66a180fcf23421b546140a419a45062e633dd`; pre-merge 19/19 checks and post-merge 13/13 checks SUCCESS. PR #319 OPEN / Draft for operator runbook. Issue #53 OPEN/P0; PRODUCTION: NOT READY; no Neon writes; USD 0.



## Snapshot histórico — Checkpoint Turno 14 (superseded by Turno 16) (2026-11-12 UTC)

**main:** `a0d6d801128b3e3aa6543796436abf348c645e8f` (PR #317 y #313 MERGED). PR #317 HEAD `870a35ac4a0190b80f31c0cf0590a759195f60dc`; 14/14 check-runs SUCCESS exact-SHA.

### PR #313
- MERGED por squash; HEAD `c0895153da60845582911271e3f8f45a21a7dd53`.
- 14/14 check-runs SUCCESS exact-HEAD; merge SHA `a0d6d801128b3e3aa6543796436abf348c645e8f`.

### Rama activa
`security/issue-53-neon-role-matrix-20261112` — ODD task, ADR propuesto, auditoría read-only, plantilla de provisioning y extensión del test sintético de privilegios. CI pendiente; los scripts aún requieren ejecución/verificación PostgreSQL 18.

### Gate P0
Issue #53 OPEN. Evidencia histórica muestra que `backup_readonly` tenía privilegios peligrosos, pero no se sabe si es el principal efectivo de `DATABASE_URL_BACKUP_RO`. El script identifica el principal por `current_user`/ `session_user`, no por alias. El provisioning es manual/operator-run y no se ejecutó.

**PRODUCTION: NOT READY.** USD 0. Sin DDL/escrituras en Neon main, sin secretos ni datos reales.

---

## Checkpoint Turno 13 — #312 integrada; transición a Issue #53 (2026-11-12 UTC)

**main:** `dbeb21d97a5c738043f61629d3f0e3d25a4ea772`  
**PR #312:** MERGED por squash. HEAD previo: `bf5919e3ec80523a0d9d2c40602c3e5749fde05e`; 14/14 check-runs SUCCESS exact-SHA. Merge SHA: `dbeb21d97a5c738043f61629d3f0e3d25a4ea772`.  
**Cambios:** documentación de ADR/SDD de autorización administrativa/PIN, calendario bancario y contingencia FX; sin runtime/DDL. Codex no pudo completar revisión por cuota; diff documental revisado manualmente.

### Censo abierto verificado
| PR | Estado | Acción |
|---|---|---|
| #193 | OPEN / Ready; mergeable=false | Preservar intacta; propuesta conceptual Fase B |
| #313 | OPEN / Ready; mergeable=false | Dependabot minor/patch group; revisar diff y CI |
| #314 | OPEN / Ready; mergeable=false | Dependabot jsdom 26.1.0 → 31.0.0; revisar breaking changes |
| #315 | OPEN / Ready; mergeable=false | Dependabot Vite 7.3.7 → 8.3.6; revisar compatibilidad/toolchain |
| #316 | OPEN / Ready; mergeable=false | Dependabot plugin-react 5.2.0 → 6.2.1; revisar peer deps |
| #317 | OPEN / Ready; checks en curso | Checkpoint Turno 13; no fusionar hasta completar gates |

**Total: 6 PR abiertas.** El checkpoint solicitado como #313 no puede usar ese número porque GitHub ya lo asignó a Dependabot; la PR de continuidad se abrió como #317.

### Gate global
Issue #53 OPEN/P0. **PRODUCTION: NOT READY.** Pendiente certificación del principal efectivo de backup/runtime en Neon, grants reales, aislamiento tenant/sesiones, restauración remota, RPO/RTO, alertas y smoke tests autenticados en producción; también revisión legal/fiscal/contable. Presupuesto USD 0. Neon main sin DDL/escrituras remotas; sin secretos/datos reales, despliegues manuales, DNS ni billing.

### Continuidad inmediata
1. Confirmar HEAD/checks/mergeability de PR #317 y fusionarla solo con gates completos.
2. Hacer triage individual de #313–#316; no integrar actualizaciones mayores sin pruebas de compatibilidad.
3. Mantener #193 intacta.
4. Preparar auditoría de producción estrictamente read-only y lista de evidencias que el propietario deberá certificar externamente.

---

## Checkpoint Turno 11 — merges #310/#303 y triage de backlog (2026-11-12 UTC)

**Main:** `6343761b601d3a3e7373ab00fb9b580b3ae09e0c`.

### Integraciones confirmadas
- **PR #310 MERGED** por squash: `13ce618d6c5e14a16d79a6be4ca9b6be8587d588`. HEAD exacto validado antes del merge: `917b5d97725bceba16b6e4b242274c9b3c03cf95`; 14/14 check-runs y 10/10 workflows SUCCESS.
- **PR #303 MERGED** por squash: `6343761b601d3a3e7373ab00fb9b580b3ae09e0c`. HEAD exacto: `8535f1daa6b3616fc5ff77ef82f195b01a1f91b6`; 19/19 check-runs y 11/11 workflows SUCCESS, incluidos los tres perfiles de restore PostgreSQL 18. Tras #310, GitHub recalculó mergeability a true y aceptó el merge con expected_head_sha exacto.
- #303 integra el runner BCV 0001–0023, principal sintético `microapp_backup`, revocación inmediata de grants temporales y `--exclude-table-data` para conservar DDL y excluir filas efímeras. Esto es evidencia sintética, no certificación de Neon ni del secreto productivo.

### PR #296 — triage pendiente
- OPEN / Draft; HEAD `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f`.
- Compare contra main `6343761b601d3a3e7373ab00fb9b580b3ae09e0c`: **64 ahead / 12 behind**, divergente; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`.
- Diff: 11 archivos, todos documentales. Los cambios únicos incluyen `ADR-20261109-admin-authorization-pin-recovery.md`, `BANKING_CALENDAR_VERSIONING.md`, `FX_CONTINGENCY_MANAGEMENT.md`, ADR FX y `odd/tasks/fx-contingency-management.md`.
- Los documentos generales `CURRENT_STATE`, `HANDOFF_NEXT_CHAT`, `STATE_JOURNAL`, `WORK_CHECKPOINT`, `PROJECT_PLAN` y `SECURITY_ROADMAP` contienen snapshots de noviembre 9; no deben prevalecer sobre el estado posterior en main. Mantener #296 Draft. Reconciliar estos seis documentos desde main y preservar los artefactos únicos. No se ha hecho rebase/force-push ni se ha alterado la rama.

### PR #193 — conservar intacta
- OPEN / Ready; HEAD `ac57ab4f3415f82279b8a49c0befe09f8e3aec68`.
- Compare contra main `6343761b601d3a3e7373ab00fb9b580b3ae09e0c`: **5 ahead / 85 behind**, único archivo propio `docs/sdd/PHASE_B_BRANCH_INVENTORY_SCOPE.md` (543 líneas). No sincronizar ni modificar en este turno.

### Backlog vivo
- #296 — OPEN / Draft — triage documental pendiente.
- #193 — OPEN / Ready — conservar intacta.

**Issue #53:** OPEN / P0. **PRODUCTION: NOT READY.** Las pruebas sintéticas de esquema completo están integradas; siguen pendientes la identidad efectiva del principal de backup en runtime/Neon, privilegios reales, restauración del artefacto remoto, RPO/RTO, alertas y evidencia de coste $0.
**Presupuesto:** USD 0. Sin Neon main, DDL/escrituras remotas, secretos, datos reales, roles/grants remotos, backup remoto, Cron, Cloudflare manual, DNS, billing ni despliegues manuales.

---

# Checkpoint operativo — Turno 10

**main:** `d2761437fa624e8eed70023ded0fd7533569e96e` (#309 squash merge).  
**PR #303:** OPEN / Ready for review. HEAD `8535f1daa6b3616fc5ff77ef82f195b01a1f91b6`; base `d2761437fa624e8eed70023ded0fd7533569e96e`; 83 ahead / 0 behind; diff efectivo 3 archivos.  
**Exact-HEAD CI:** 19/19 check-runs SUCCESS; 11/11 pull_request workflows SUCCESS. Backup restore smoke PostgreSQL 18: BCV 0001–0023 SUCCESS, paired-intent 0001–0016 SUCCESS, legacy contract SUCCESS. Review COMMENT `5867016714` anclado al HEAD actual; no formal APPROVE.

## Integraciones y limpieza
- #307 MERGED: `98998cf4c13a7d13a1941b776911cc8f2df1b2db`.
- #299 MERGED: `7d79621926dd256542e43dc08ec20539ad91cf03`.
- #309 MERGED: `d2761437fa624e8eed70023ded0fd7533569e96e`.
- #308 MERGED: `90b0bdd9c856e92c05141b19b48ac5d1bd7f2eec`.
- #300 CLOSED/ABSORBED; cambio de autorización ya existe en main. Rama no borrada.
- #298 CLOSED/SUPERSEDED por #306/#307/#308. Rama no borrada.

## PR #303 — implementación verificada
- Perfil activo: migrations 0001–0023 con `scripts/backup_restore_fixture_bcv.sql` y `scripts/test_backup_restore_schema_bcv.sh`.
- Dump ejecutado con LOGIN sintético `microapp_backup`, no admin. Privilegios elevados, membership, ownership, DML/DDL y sequence writes denegados.
- Grants CONNECT/USAGE/SELECT temporales para pg_dump; revocados al terminar para no contaminar ACL manifests. SELECT es necesario para ACCESS SHARE locks incluso en tablas con data excluida.
- `--exclude-table-data` preserva DDL auth; destino comprueba las tres tablas presentes con cero filas.
- Perfil paired-intent 0001–0016 se mantiene separado. No se mezclan los dos modelos de ledger.

## Censo de PRs abiertas (3)
- #303 Ready — HEAD `8535f1daa6b3616fc5ff77ef82f195b01a1f91b6`; CI exact-SHA completo.
- #296 Draft — HEAD `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f`, base antigua `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`.
- #193 Ready — HEAD `ac57ab4f3415f82279b8a49c0befe09f8e3aec68`, base antigua `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`.
## Siguiente acción
Obtener revisión formal independiente/code-owner de #303 y comprobar branch protection; no mergear solo por CI verde. Después triage #296/#193 con bases actuales.

**Issue #53 OPEN/P0. PRODUCTION: NOT READY. Presupuesto USD 0.** Sin Neon main, secretos, datos reales, roles/grants remotos, backup remoto, Cron, Cloudflare manual, DNS, billing ni deploy manual.

---
# Checkpoint operativo — PR #299 merged; #303 siguiente

**Checkpoint vivo — 2026-11-11 UTC**
**main:** `7d79621926dd256542e43dc08ec20539ad91cf03` (squash merge de PR #299).
**PR #307:** MERGED; squash commit `98998cf4c13a7d13a1941b776911cc8f2df1b2db`.
**PR #299:** MERGED; validated HEAD `56286a4943bba6e7e1180205964eb353165af3ee`; squash commit `7d79621926dd256542e43dc08ec20539ad91cf03`. Antes del merge: 16/16 check-runs SUCCESS y 12/12 workflow runs SUCCESS, todos en el HEAD exacto; el smoke de backup pasó en los tres perfiles PostgreSQL 18 (BCV 0001–0023, paired-intent 0001–0016 y legacy backup contract). Review COMMENT `5866699291` (no formal code-owner APPROVE). La rama se sincronizó sin force-push; diff neto 1 archivo.
**PR abiertas:** 6 en total: cinco PR de backlog (#303, #300, #298, #296, #193) más esta PR documental #308. Censo de backlog: #303 Draft; #300 Draft; #298 Draft; #296 Draft; #193 Ready for review. #308 es docs-only, Ready; validar su HEAD/checks exactos antes de merge.
**PR #303:** HEAD `d527ae79cd566945cd9bdb3e1475d53b31d3923a`; 77 ahead / 7 behind de main. No sincronizar a ciegas: el script usa `--exclude-table` (elimina DDL, no solo filas), hace dump con conexión admin en vez de `microapp_backup`, y su fixture/documentación todavía presupone 0001–0016 mientras main contiene 0001–0023. Debe adaptarse antes de promover.
**Post-merge CI de main:** reconsulta completada; 12/12 check-runs SUCCESS y 10/10 workflow runs SUCCESS en el SHA `7d79621926dd256542e43dc08ec20539ad91cf03`. Sin fallos ni pendientes en esa consulta.
**Issue #53:** OPEN/P0. **Producción: NOT READY.** No se ha verificado la identidad efectiva del backup en runtime/Neon, backup remoto ni recuperación real.
**Límites respetados:** cero acceso/escritura a Neon main, secretos, datos reales, roles/grants remotos, despliegue manual, Cloudflare manual, DNS o billing. Presupuesto $0.

## Bloque #299 completado

- Rama: `test/measure-synthetic-restore-duration-20261109`.
- HEAD final: `56286a4943bba6e7e1180205964eb353165af3ee`.
- Commit squash: `7d79621926dd256542e43dc08ec20539ad91cf03`.
- Diff neto contra main previo: `scripts/test_backup_restore.sh`, +4/-1.
- Exact-HEAD: 16/16 check-runs SUCCESS; 12/12 workflow runs SUCCESS. Backup restore smoke: perfiles BCV 0001–0023, paired-intent 0001–0016 y legacy contract SUCCESS.
- No se ejecutó prueba local en shell propia; CI PostgreSQL 18 desechable ejecutó los escenarios.

## Bloque #303 pendiente

- Rama `security/backup-restore-schema-coverage-20261110`, HEAD `d527ae79cd566945cd9bdb3e1475d53b31d3923a`.
- Compare con main `7d79621926dd256542e43dc08ec20539ad91cf03`: 77 ahead / 7 behind; 11 archivos afectados.
- Bloqueos estáticos: `--exclude-table` excluye DDL; dump administrativo, no `microapp_backup`; fixture/tarea siguen ancladas a 0001–0016 y checkout anterior.
- Próximo paso: revisar y corregir el diseño del fixture para 0001–0023 antes de sincronizar/promover. Mantener Draft.

## No ejecutado

Sin acceso a Neon, secretos, backup remoto, datos reales, Cloudflare manual, Cron, DNS, billing ni deploy manual. Producción NOT READY; Issue #53 OPEN/P0.

---

# Reconciliación de checkout/BCV — 2026-11-11 UTC

**Línea base viva de main:** `425186301473a5acb9b4133c18247bc6fff58e56` (squash merge de PR #287).
**PR #287:** MERGED; HEAD validado `c44c6d9b7f3d0d09c80c4873e09c55ab6ce709b9`; commit de merge `425186301473a5acb9b4133c18247bc6fff58e56`.
**Evidencia previa al merge, exact-SHA:** 17/17 check-runs SUCCESS y 11/11 workflow runs pull_request SUCCESS; mergeable=true. Se registró review COMMENT #5866603820 (no se presentó como aprobación de code owner). PR pasó de Draft a Ready for review y GitHub aceptó el squash merge con expected_head_sha exacto.
**Protección de rama:** el conector recibió 403 al leer `/branches/main/protection`; no se afirma inspección administrativa independiente. El endpoint de merge de GitHub aceptó la operación y reportó `merged=true`. No se atribuye al 403 un fallo ni una excepción de protección.

## Hito comercial integrado

- PR #287 integra checkout/ventas, freshness BCV y ledger comercial sobre main `06e50defb2b684684262f79cf2318dcf6d32e9b1`.
- La secuencia de migraciones versionadas en la rama integrada llega de 0001 a 0023; incluye 0017 (fin de semana/fecha efectiva), 0018 (allocation de pagos) y 0021 (freshness/trigger), además de las migraciones 0022–0023.
- Se preservó el contrato de producto de la ADR: no hay bypass USD-only; la exigencia BCV aplica a todas las ventas.
- La revisión COMMENT cubrió idempotencia por organización/clave, dinero escalado con `@micro-app/money`, asignación VES proporcional con residuo determinista, bloqueo `lock_bcv_sync_state()`, validación BCV y separación de permisos para sucursales de inventario/caja. Esta nota no equivale a aprobación formal de code owner ni a prueba productiva.
- Cron BCV continúa desactivado por defecto; no se activó ni desplegó.

## Estado vivo de PRs (consulta GitHub posterior al merge)

| PR | Estado | HEAD |
|---|---|---|
| #303 — full-schema encrypted backup restore smoke | OPEN / Draft | `d527ae79cd566945cd9bdb3e1475d53b31d3923a` |
| #300 — manual price override permission | OPEN / Draft | `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95` |
| #299 — isolated PostgreSQL restore duration / RTO | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` |
| #298 — prior documentation reconciliation | OPEN / Draft | `ce398214c55ba5f3d4d6caeaf683dbfea041b6a7` |
| #296 — BCV security/admin/calendar docs | OPEN / Draft | `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f` |
| #193 — branch inventory Phase B | OPEN / Ready for review | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` |

#287 está cerrada como MERGED. #304, #305 y #306 siguen MERGED; #302 CLOSED/superseded; #255 y #269 CLOSED sin merge; #233 CLOSED/superseded. No se alteraron #193 ni las otras PR abiertas.

## Issue P0 #53 / readiness

Issue #53 permanece OPEN/P0. El contrato sintético de mínimo privilegio, preservación de DDL y exclusión de filas efímeras está integrado. Continúan pendientes la identidad efectiva de `DATABASE_URL_BACKUP_RO` en Neon, aislamiento tenant/sesiones demostrado y evidencia operativa de restore/RPO/RTO. **Producción: NOT READY.** También permanecen gates de smoke tests autenticados en entorno productivo y revisión legal/fiscal/contable. No se accedió ni modificó Neon, secretos, roles/grants remotos, datos reales, Cron, Cloudflare manual, DNS o billing.

## Siguiente frente recomendado

Priorizar resiliencia de backup en entorno efímero y coste $0:
1. #299: auditar medición de duración/RTO de restore PostgreSQL aislado, validez de la métrica, límites y ausencia de recursos facturables.
2. #303: auditar restore smoke de esquema completo 0001–0023, cifrado, integridad y exclusión de datos efímeros de auth aprobada en #305.
No promover ninguna sin reconciliar base, revisar diff completo y validar exact-SHA CI. Mantener #53 P0 y producción NOT READY.

---

# Reconciliación de seguridad de backups — 2026-11-11 UTC

**Línea base de esta reconciliación:** `main` en `a3966a95a97486da18fae568a9c87bac8f2772e6`, posterior a los merges secuenciales de PR #304 y #305. Este encabezado es la fuente temporal más reciente; los snapshots históricos que siguen debajo se conservan como historial y no describen el estado vivo actual.

## Merges confirmados

- **PR #304 — merged por squash.** HEAD exact-SHA validado: `b20ade030c9dc29f7689afc3ce6c1a096fe7f0ab`; 12/12 workflow runs y 14/14 check-runs SUCCESS. Merge commit en `main`: `e428a25824d48d1a6391f564c05d0287abf7d329`. Incluye hardening de diagnóstico de principal, comprobación estricta de membresía sobre `pg_auth_members.member`, helper temporal `GIT_ASKPASS`, pruebas de contrato HTTP 401 y reintentos APT.
- **PR #302 — CLOSED / superseded, no merged.** Se publicó el comentario de absorción en el hilo de PR antes del cierre. La rama histórica se conserva.
- **PR #305 — merged por squash.** Tras sincronizar con el nuevo main, el HEAD exact-SHA fue `d1e008a3df1e99f64c4efce20306a798351f6a43`; 16/16 workflow runs y 18/18 check-runs SUCCESS. Merge commit final en `main`: `a3966a95a97486da18fae568a9c87bac8f2772e6`. La combinación conserva íntegramente las mejoras de #304 y añade `--exclude-table-data=public.auth_sessions`, `public.auth_rate_limits` y `public.auth_bootstrap_attempts`, además de pruebas sintéticas PostgreSQL 18 y restauración con DDL preservado.

## Estado vivo de PRs consultado tras los merges

| PR | Estado observado | HEAD |
|---|---|---|
| #303 — backup restore smoke de esquema completo | OPEN / Draft | `d527ae79cd566945cd9bdb3e1475d53b31d3923a` |
| #300 — permiso de override manual de precio | OPEN / Draft | `97fa79e643d5e7b32ebf86958bd0ba9211e1fc95` |
| #299 — medir duración de restore PostgreSQL aislado | OPEN / Draft | `c82b0a10f85b59e1f81ac0ca2d439b6286558751` |
| #298 — reconciliación documental previa | OPEN / Draft | `ce398214c55ba5f3d4d6caeaf683dbfea041b6a7` |
| #296 — documentación de seguridad BCV y controles admin/calendario | OPEN / Draft | `62dde66355a937a4f6fa4efb8d9cfdf856d7ac0f` |
| #287 — BCV + checkout integration rehearsal | OPEN / Draft | `fe73180dc9f2039c2a025b8d3b7700230080e19d` |
| #193 — inventario por sucursal Fase B | OPEN / Ready for review | `ac57ab4f3415f82279b8a49c0befe09f8e3aec68` |

No reducir esta lista a #303 y #287: GitHub reportó además #300, #299, #298, #296 y #193 abiertas. No alterar #193. PRs #255 y #269 permanecen CLOSED sin merge; #233 permanece cerrada como superseded. #302 está cerrada como absorbida; #304 y #305 están MERGED.

## Issue P0 #53 y readiness

- Issue #53 permanece **OPEN / P0**.
- Completado: contrato sintético de privilegios mínimos, denegación de escritura/DDL en el rol sintético, prueba de dump/restauración, preservación del DDL de tablas auth y exclusión de sus filas efímeras.
- Sigue abierto: identidad efectiva y privilegios reales del secreto `DATABASE_URL_BACKUP_RO` en Neon; cobertura demostrada de aislamiento tenant/sesiones; evidencia de restore operativo y RPO/RTO. El diagnóstico agregado al workflow es no sensible y no bloqueante: un resultado no conforme no bloquea el backup ni certifica el principal.
- No se inspeccionaron secretos ni se conectó o modificó Neon. No se ejecutó un backup productivo ni restore con datos reales.
- **Producción: NOT READY.** Los checks sintéticos verdes no cierran la identidad real, aislamiento ni recuperación productiva.

## Siguiente frente — PR #287

Continuar la revisión técnica de #287 en HEAD `fe73180dc9f2039c2a025b8d3b7700230080e19d`, manteniéndola Draft:

1. Resolver el gate P1 de freshness: `findApplicableCheckoutRate` debe considerar `bcv_sync_state.last_success_at` y fallar cerrado cuando la sincronización relevante no tenga éxito reciente, con ventana definida por decisión explícita y pruebas PostgreSQL para fallos, concurrencia y datos obsoletos.
2. Formalizar política USD-only: determinar si se permite checkout en USD sin conversión a VES cuando BCV no está disponible, y qué ocurre con ventas VES, recibos, totales, pagos parciales y auditoría. No inventar una política de negocio ni habilitar contingencia manual por inferencia.
3. No mergear #287 sin revalidar su base/HEAD, exact-SHA CI, revisión formal requerida y gates comerciales/legales.

## Límites operativos mantenidos

No Neon main, secretos, datos reales, cambios de roles/grants, backup operativo, despliegue manual, activación de Cron, Cloudflare manual, DNS ni billing. Branch-protection API devolvió 403 al conector durante la auditoría; GitHub aceptó los dos merges, pero esta reconciliación no atribuye una lectura independiente de la configuración administrativa de protección.


---

## Snapshot histórico de PR #287 — previo a Turno 6

> Snapshot histórico anterior a la reconciliación de Turno 6; los SHA y estados aquí descritos no sustituyen la consulta viva actual. SHA de aquella captura: `e5f956271f723bfa00da2ab527c35ac422cf6d2d`. No reutilizar checks de otros SHA.

## GitHub / PR #287

- PR #287: OPEN / Draft / mergeable=true / mergeable_state=clean. HEAD `e5f956271f723bfa00da2ab527c35ac422cf6d2d`; branch `integration/bcv-checkout-rehearsal-20261109`.
- Exact-HEAD CI: **16/16 check-runs SUCCESS**, **11/11 workflow runs pull_request SUCCESS** y **2/2 workflow runs push SUCCESS**.
- CI principal: 43/43 pasos SUCCESS.
- PostgreSQL migration validation: 86/86 pasos SUCCESS, incluidos los tests de membresías y el contrato least-privilege del principal de backup.
- PostgreSQL migration runner: 21/21 pasos SUCCESS.
- Backup restore smoke: main paired-intent (migrations 0001–0016) 11/11 pasos SUCCESS; BCV projection (0001–0023) 10/10 pasos SUCCESS.
- También SUCCESS en exact HEAD: Secret history scan, ODD docs, dashboard, dependency review, Semgrep, Security y Playwright.
- Reviews formales: 0. Review threads: 0. No aprobación independiente; mantener Draft y no fusionar.
- Comparación con main `c5373564413ba086690552c6b7deeab08d7b4a89`: 527 ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. Divergencia exclusiva de main es documental; no hacer sync/rebase automático.
- PR: 123 archivos, 19,394 adiciones y 307 eliminaciones. Requiere revisión independiente completa antes de promover a Ready.

## Hallazgo P0 Neon main — solo lectura

- Proyecto `micro-app-db` (`restless-fire-99110035`), branch primary/default `main` (`br-summer-math-b7297a60`), DB `neondb`.
- Rol LOGIN `backup_readonly`: `rolcreaterole=true`, `rolcreatedb=true`, `rolreplication=true`, `rolbypassrls=true`, INHERIT true, SUPERUSER false.
- Membresía directa `backup_readonly -> neon_superuser`; membresía efectiva `pg_write_all_data` y `pg_read_all_data`; INSERT/UPDATE/DELETE efectivos en `public.products`. El rol llamado backup_readonly no es read-only.
- Las 15 tablas base públicas y 2 secuencias observadas pertenecen a `neondb_owner`. No RLS en las 15 tablas. Default ACL de `neondb_owner`: SELECT para futuras tablas, ningún default ACL para secuencias; secuencias existentes dan SELECT+UPDATE a `backup_readonly`.
- `microapp_runtime` y `microapp_migrator` no aparecen en el catálogo de roles consultado en Neon main.
- **No se leyó ningún secreto ni connection string.** La identidad efectiva de `DATABASE_URL_BACKUP_RO` y la del Worker `DATABASE_URL` siguen sin verificar. No afirmar que el backup use `backup_readonly` ni que el Worker use `neondb_owner`.
- No se modificaron roles, membresías, grants, passwords, secrets, datos reales, Cron, DNS, billing ni producción. Todas las consultas Neon fueron SELECT sobre catálogos y predicados de privilegio.

## Contrato candidato de backup least-privilege — CI desechable

- En PostgreSQL 18 efímero se crea LOGIN sin SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, NOINHERIT y sin membresías; owner sintético NOLOGIN.
- Se comprueban grants explícitos para objetos existentes y default ACL SELECT-only para futuras tablas y secuencias.
- Se comprueba pg_dump y pg_restore --list con el login backup.
- Se rechazan INSERT/UPDATE/DELETE/TRUNCATE, sequence USAGE/UPDATE (incluidos nextval/setval), CREATE de database/schema, CREATE ROLE y SET ROLE.
- Exact HEAD e2e CI validó el test: step `Test least-privilege backup principal can pg_dump without write access` SUCCESS dentro de PostgreSQL migration validation (86/86 pasos).
- Esto valida una propuesta de permisos y compatibilidad pg_dump en CI; no provisiona ni cambia Neon y no identifica el principal del secreto.

## Estado operativo y decisiones

- Issue #53 permanece OPEN/P0; comentario de evidencia inicial `6802571142`, actualización exact-HEAD `6804382288`.
- Producción **NOT READY**. No integrar PR #287 solo por checks verdes. Mantener Draft.
- Próximo trabajo: revisión independiente de los 123 archivos y del checkout/BCV/roles; preparar plan de reemplazo del principal backup con continuidad, prueba dump/restore y rollback. Cualquier cambio en Neon main o secreto requiere autorización específica y un plan revisado.
- Después de integración autorizada, observar únicamente el siguiente backup natural de main y su diagnóstico seguro de `current_user` / `session_user` y booleanos de privilegio; no ejecutar workflow_dispatch para fabricar evidencia.
- Gates pendientes: identidad efectiva del Worker y backup; provisioning real de roles y grants; CORS efectivo; alertas externas; RPO/RTO medidos; coste total USD 0; aceptación funcional/comercial de jornada POS/checkout y revisión formal.
- MVP objetivo 2026-12-01; GO/NO-GO 2026-11-30.

---

# Checkpoint — 2026-11-11 — HEAD 4b2aec7

- PR #287 OPEN/Draft; HEAD documental `4b2aec73a26a52e4f5270ade6149752160084cf3`; exact-HEAD 16/16 check-runs, 11/11 PR workflows, 2/2 push workflows SUCCESS. Código validado en `9101ab502d5c52c86a8b8d01a3a79487dd07e5e8` (18/18 checks). mergeable=true/clean; 0 reviews y 0 threads. No merge.
- 123 archivos, 19,233 adiciones, 307 eliminaciones; 524 ahead / 1 behind main; único commit ausente es ledger documental. No sync/rebase.
- Backup workflow usa APT retry bounded/strict y curl retry/timeouts; no manual backup. Restore runner 16-migration main y 23-migration BCV; ambos synthetic smoke SUCCESS.
- Neon main SELECT-only: `backup_readonly` es privilegiado (CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS, membership neon_superuser/pg_write_all_data, INSERT/UPDATE/DELETE products). Default ACL tablas futuras SELECT; sin default ACL secuencias futuras. Secret `DATABASE_URL_BACKUP_RO` no leído; identidad efectiva desconocida.
- Contrato candidato least-privilege pasa en PostgreSQL 18 desechable. No cambios Neon.
- Issue #53 OPEN/P0; producción NOT READY. No merge, deploy, secrets, roles/grants remotos, datos reales, Cron, DNS o billing. Mantener Draft y revisar 123 archivos independientemente.

---

# Checkpoint — 2026-11-11 — exact HEAD 9101ab5

- PR #287 OPEN/Draft; HEAD `9101ab502d5c52c86a8b8d01a3a79487dd07e5e8`; 18/18 check-runs SUCCESS, 11/11 PR workflows + 3/3 push workflows SUCCESS. PR mergeable=true/clean, 0 reviews formales y 0 threads. No merge.
- 123 archivos, 19,233 adiciones, 307 eliminaciones; 524 ahead / 1 behind main; único commit ausente = ledger documental. No sync/rebase.
- Backup workflow corregido: reintentos APT acotados y estrictos, test helper sin red, retries/timeouts de curl PGDG; el restore runner comenta correctamente perfil BCV de 23 migraciones. Restore smoke main 16 y BCV 23 SUCCESS.
- Neon main SELECT-only confirmó que `backup_readonly` es privilegiado (CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS, membership neon_superuser/pg_write_all_data, INSERT/UPDATE/DELETE products). Default ACL para tablas futuras SELECT; sin default ACL de secuencias futuras. Identidad del secreto `DATABASE_URL_BACKUP_RO` sigue desconocida; no se leyó.
- Contrato candidato de least privilege pasa en PostgreSQL 18 desechable, incluido pg_dump/pg_restore-list y default SELECT de futuras tablas/secuencias.
- Issue #53 OPEN/P0; producción NOT READY. No Neon writes, roles/grants/passwords/secrets, datos reales, deploy, Cron, DNS o billing.
- Siguiente: revisión independiente de los 123 archivos; mantener Draft; observar identidad solo en backup natural de main tras integración autorizada; preparar continuidad/rollback antes de cualquier cambio remoto.

---

# Checkpoint actualizado — 2026-11-11 — default ACL de backup probado

**HEAD PR #287:** `cb81ecdf6bb5fe2c0d7806f6d744925300c8ba7a`; 16/16 check-runs, 11/11 workflows PR, 2/2 push SUCCESS. PR OPEN/Draft; mergeable=true, mergeable_state=blocked; 0 reviews formales, 0 threads. No merge.

**Neon main, SELECT-only:** `backup_readonly` tiene CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS, membership directa en `neon_superuser`, membership efectiva en `pg_write_all_data`, INSERT/UPDATE/DELETE sobre `public.products`. 15 tablas y dos secuencias pertenecen a `neondb_owner`; sin RLS en las tablas. Default ACL para futuras tablas = SELECT; no hay default ACL para secuencias. Las dos secuencias existentes tienen SELECT+UPDATE para el rol observado. El rol no es read-only.

**No asumir identidad:** no se leyó `DATABASE_URL_BACKUP_RO` ni Worker `DATABASE_URL`; no se sabe qué principal utiliza cada secreto. Nunca revelar/copiar secretos.

**Contrato candidato:** test PostgreSQL 18 desechable ampliado a grants explícitos y default SELECT para futuras tablas/secuencias; prueba pg_dump/pg_restore-list y niega escritura/escalada/membresías. Exact-head CI SUCCESS. No hubo cambios Neon.

**Estado:** issue #53 OPEN/P0; producción NOT READY. PR #287 Draft, 123 archivos; rama 518 ahead / 1 behind (único commit ausente: ledger documental). No sync/rebase automático. Próximo: revisión independiente completa y plan de continuidad/rollback antes de cualquier cambio remoto.

---

# Checkpoint P0 — 2026-11-11 — backup principal privilegiado

**Hallazgo nuevo y confirmado por SELECT-only:** el rol Neon `backup_readonly` no es read-only. Tiene CREATEROLE, CREATEDB, REPLICATION y BYPASSRLS; es miembro directo de `neon_superuser` y miembro efectivo de `pg_write_all_data`; puede INSERT/UPDATE/DELETE en `public.products`. Evidencia completa en `odd/tasks/backup-principal-least-privilege-audit.md` y comentario #53 `6802571142`.

**Caveat obligatorio:** no se leyó `DATABASE_URL_BACKUP_RO`; no está demostrado que el secreto use `backup_readonly`. El nombre del rol no demuestra identidad efectiva. El diagnóstico de seis booleanos está en PR #287 pero aún no se ha observado en un backup natural de main posterior a integrarlo.

- Consultas realizadas solo sobre `pg_roles`, `pg_auth_members` y predicates `has_*_privilege` / `pg_has_role`. Sin datos comerciales ni secretos. Sin writes.
- No revocar membresías, cambiar atributos/grants ni rotar secretos sin autorización específica y plan de continuidad de backup.
- Issue #53 OPEN/P0; producción NOT READY.

**Código de referencia:** PR #287 HEAD validado `f0d9f9ad6ad995dc837a4e6cef6564fc9947676d`, 11/11 workflows PR + 2/2 push + 16/16 check-runs SUCCESS. PR sigue Draft.

---

# Checkpoint — 2026-11-11: Cashier movement-read authorization

**Último HEAD de código validado:** `f0d9f9ad6ad995dc837a4e6cef6564fc9947676d`. **11/11 PR workflows + 2/2 push + 16/16 check-runs SUCCESS.**

## P1 completado
- ODD: `odd/tasks/cashier-inventory-movement-read.md`; task commit `844b9cdd0a2115f077e77787d4188c135ec4e80f`.
- Implementación: `f0d9f9ad6ad995dc837a4e6cef6564fc9947676d`.
- La matriz permite a Cashier leer existencias y movimientos en sucursales asignadas. GET movements usaba erróneamente `inventory.management.read`; ahora reutiliza `inventory.read`.
- Cashier recibe 200 y no recibe `unit_cost_usd`; warehouses/counts siguen 403; branch sin membership 403; cross-tenant 401.
- PostgreSQL inventory read integration SUCCESS; CI `43066606680`; 11/11 PR, 2/2 push, 16/16 check-runs SUCCESS. Sin cambios de schema, roles, grants o writes.
- OAuth rate limiting y callsites del helper central ya existen en la rama; issue #53 tiene comentario de reconciliación `6802473182`.

## P0 abierto
Issue #53 OPEN/P0. Principal efectivo de backup/Worker, ownership/grants/memberships remotos, CORS, alertas, RPO/RTO y coste operativo USD 0 siguen sin demostrarse. Producción NOT READY; no secretos, Neon, datos reales, roles/grants remotos ni despliegues.

## GitHub
PR #287 OPEN/Draft, sin reviews ni threads. main `c5373564413ba086690552c6b7deeab08d7b4a89`; 512 ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. No rebase/sync/merge por rutina.

## Siguiente
Mantener Draft; continuar Seguridad Nivel 1/P0. Solo después de cerrar gates críticos, avanzar UI de caja/checkout.

---

# Checkpoint — 2026-11-11: CI APT resilience and security P0

**Último HEAD de código validado:** `5ef21974725b91649705ed1bf6e9ae3019ca8e85`, PR #287. **11/11 workflows pull_request + 3/3 push + 18/18 check-runs SUCCESS**. Los documentos que siguen a este bloque son snapshots históricos; no reutilizar sus SHA.

## Bloque completado — resiliencia de CI

- ODD: `odd/tasks/ci-apt-dns-resilience.md`.
- Commit de implementación: `5ef21974725b91649705ed1bf6e9ae3019ca8e85`.
- Archivos: `.github/workflows/ci.yml`, `.github/workflows/migration-runner.yml`, `.github/workflows/backup-restore-smoke.yml`, `scripts/ci/apt-retry.sh`, `.github/scripts/test-apt-retry.sh`.
- Root cause confirmado en los logs del SHA anterior `9bdb6aff...`: DNS temporal falló para mirrors Ubuntu; apt no pudo instalar `postgresql-client` ni `age`; las pruebas downstream fueron skipped.
- Solución: helper APT compartido con máximo 3 intentos, backoff progresivo, Acquire::Retries, timeouts HTTP/HTTPS, `APT::Update::Error-Mode=any`; no oculta fallos persistentes.
- Prueba local: simulación de 2 fallos y recuperación en el tercer intento; fallo persistente conserva exit code no-cero. Shell syntax y test del helper SUCCESS.
- CI exact-HEAD: CI `43065209868` SUCCESS; migration runner `43065209778` SUCCESS; database migration validation `43065209826` SUCCESS; backup restore `43065209708` SUCCESS (main + BCV); Playwright `43065209886` SUCCESS; Security/Semgrep/secret history/dependency review/ODD/dashboard SUCCESS.
- No se redujeron aserciones ni se saltaron suites.

## Seguridad P0 — no cerrado

- Issue #53 OPEN/P0.
- `odd/tasks/backup-principal-least-privilege-audit.md` registra el diagnóstico de identidad y privilegios en `.github/workflows/backup.yml`.
- La regresión de membresías de PostgreSQL ahora detecta ambas direcciones de `pg_auth_members`; prueba desechable pasó en database migration validation.
- Sigue sin demostrarse qué identidad efectiva usa el secreto real `DATABASE_URL_BACKUP_RO`, ni sus grants remotos. El diagnóstico no bloquea backup y no se ha ejecutado en una corrida natural posterior en main.
- No leer secreto, no ejecutar workflow_dispatch, no conectar manualmente a Neon, no cambiar roles/grants remotos.
- Producción NOT READY.

## Estado GitHub y límites

- PR #287 OPEN/Draft, `mergeable=true`, sin reviews formales ni review threads.
- main `c5373564413ba086690552c6b7deeab08d7b4a89`; comparación de #287: 509 ahead / 1 behind, merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`.
- No sincronizar/rebase/force-push por rutina. Mantener Draft.
- No merge, deploy productivo, Neon writes, datos reales, secretos, roles/grants, Cron, DNS, billing ni Cloudflare manual.

## Siguiente acción

1. Mantener #287 Draft y revalidar GitHub exact-HEAD.
2. Continuar auditoría de Seguridad Nivel 1: identidad efectiva Worker/backup, permisos efectivos, aislamiento tenant/branch y sesión.
3. Resolver gates P0/P1 con pruebas; no declarar cierre por CI verde.
4. Después de seguridad, priorizar UI de jornada de caja/checkout, sujeto al contrato comercial de pagos pendiente de aprobación.

---

# Checkpoint — 2026-11-11: API de turnos

**Código validado:** `0ca91ff51ec545278ceb8eabd3929083aae9022e` en PR #287; 11/11 workflows PR SUCCESS, CI `43009163637` SUCCESS. Los cuatro commits documentales posteriores no modifican código y requieren revalidación del HEAD exacto.

## Implementado
- Migración 0023 crea `public.open_register_shift(...)` y `public.close_register_shift(...)` SECURITY DEFINER, `microapp_migrator` owner, `search_path=pg_catalog, public`; runtime solo EXECUTE, sin escritura directa en `register_shifts`.
- API propia de turnos: lista cajas activas, consulta turno actual, apertura y cierre. User ID derivado de sesión; Owner/Admin/Cashier solo con branch membership activa y solo su propio turno.
- Eventos de auditoría `register_shift.opened` y `.closed` insertados en la misma transacción. Cierre idéntico es replay; cierre con importes distintos devuelve conflicto.
- Tests PostgreSQL 18 con runtime login directo: 4/4 API tests SUCCESS; incluye roles, scope, cross-user, concurrencia, audit y ACL de tabla.
- Restore runner reconoce BCV 0001–0023 y main histórico 0001–0016; ambos smoke restore sintéticos SUCCESS.

## Fallos intermedios corregidos y que deben conservarse en el historial
- Primera llamada API devolvió error de esquema por search_path de funciones SECURITY DEFINER; fijado a `pg_catalog, public` y protegido por la aserción de que runtime/PUBLIC no pueden CREATE en `public`.
- Primera prueba de concurrencia detectó deadlock por lock-upgrade; se quitó el prelock del handler (`lockRows=false`) y se dejó el bloqueo canónico al trigger de apertura. Re-test concurrente SUCCESS.
- Un matcher estático anterior falló por expectativa obsoleta; corregido y revalidado.

## No completado / no inferir
- La UI todavía no puede abrir/cerrar turnos ni completar una venta. No hay jornada POS completa desde navegador.
- No se definió por inferencia la política de pagos, parciales, cambio, recibos ni devoluciones. No calcular efectivo esperado ni diferencias: no existe ledger aprobado.
- GIT_ASKPASS y restore profile 23 están en la rama Draft; nada de esto está en main ni en producción.
- Issue #53 OPEN/P0; producción NOT READY. No merge/deploy/Neon main/datos reales/secrets/Cloudflare sensible/DNS/billing/Cron.

## Próximo paso
1. Revalidar HEAD documental actual y PR/issue state en GitHub.
2. Implementar UI de sucursal/turno con las nuevas rutas, pruebas Playwright y manejo de sesión/roles.
3. Resolver contrato comercial de pagos con el propietario del producto antes de finalizar checkout UI.
4. Ejecutar jornada E2E login → apertura → venta → pago → recibo → Kardex → conteo → cierre, con pruebas de aislamiento tenant/branch/role.
5. Mantener GO/NO-GO: no producción mientras falte cualquier gate crítico.

---
# Checkpoint vivo — 2026-11-11

## Seguridad backup — trabajo realizado
- Se portó a PR #287 el fix de autenticación Git de PR #302, manteniendo separado el historial de procedencia.
- `.github/workflows/backup.yml` usa helper temporal `GIT_ASKPASS` con `umask 077`, permisos 700, `GIT_ASKPASS_REQUIRE=force`, `GIT_TERMINAL_PROMPT=0`, URL HTTPS limpia, `credential.helper=` explícito en clone/push y `trap` de limpieza.
- `GH_TOKEN` se copia a variable de shell no exportada y se inyecta solo en los procesos Git que requieren autenticación; se elimina del entorno general antes de ejecutar `prune_backups.py`.
- Tests shell y HTTP loopback validan prompts, fallo cerrado, ausencia de token en URL, remote limpio, limpieza y autenticación Basic invocada por Git. El servidor de prueba no almacena el token ni emula GitHub smart-HTTP/push.
- Exact code HEAD `efb7f8a0b8731fd1805beedd8b8a5af10261d271`: 11/11 workflows PR SUCCESS; CI `43004836986` SUCCESS y paso askpass SUCCESS. Una versión intermedia del matcher estático falló; corregida y revalidada en el SHA final.
- La corrección sigue solo en #287 Draft; main conserva el patrón anterior. No backup dispatch ni uso de secretos reales.

## Estado y prioridad P0
- main `c5373564413ba086690552c6b7deeab08d7b4a89`; issue #53 OPEN/P0; producción NOT READY.
- #287 OPEN/Draft; #303 y #302 OPEN/Draft; #301 OPEN/no Draft pero no integrable mientras Seguridad Nivel 1 esté abierta.
- No merge, deploy, Neon, datos reales, secrets, DNS, Cloudflare sensible, billing, Cron ni restore remoto.
- El criterio de aceptación aprobado para 2026-12-01 es un comercio piloto, un local, hasta 1.000 productos y jornada completa desde UI. La rama actual aún no ofrece UI de caja/ventas/checkout/recibo ni endpoints HTTP de turnos.
- No asumir que los métodos de pago hardcodeados equivalen a política aprobada. SDD mantiene pendiente el contrato completo de pagos, parciales, sobrepago/cambio, recibos y anulaciones/devoluciones.

## Próximo paso sénior
1. Revalidar en vivo el HEAD actual y CI después de este commit documental.
2. Cerrar revisión independiente de seguridad Nivel 1 y mantener los gates de backup/restore real, principal efectivo, alertas, RPO/RTO y coste $0 explícitos.
3. Cambiar el foco a la jornada P0: primero contrato de turnos y pagos sin inventar decisiones; después endpoints/UI/E2E de login → apertura → venta → pago → recibo → inventario/Kardex → conteo → cierre.
4. No declarar MVP listo si la jornada completa no se completa desde UI y los gates críticos no están demostrados.

---
# Actualización de continuidad — 9 de noviembre de 2026

> Esta actualización prevalece sobre snapshots históricos que indiquen otro HEAD o describan como pendientes capacidades ya implementadas. Verificar siempre el SHA vivo en GitHub antes de nuevas acciones.

## PR #287 — integración BCV + checkout

- Estado: OPEN / Draft; base `main`; HEAD de código actual `3c32b6d46a807a88962de81443af84c4d4fef3e1`; GitHub informa `mergeable=true`. No hay reviews formales ni review threads abiertos.
- CI del HEAD exacto: **15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS**. Los 11 workflows de PR incluyen CI, Playwright E2E, validación de migraciones, PostgreSQL migration runner, backup/restore, Semgrep, Security scan, secret-history, dependency review, ODD docs y dashboard. Los builds Cloudflare de la rama son previews, no promoción a producción.
- No merge, no deploy productivo, no Neon main writes, no migraciones remotas, no activación Cron, no cambios de secretos/DNS/billing ni datos reales.

## BCV: estado real de implementación

- Checkout **sí consume** `bcv_sync_state`: lee `last_success_at`, exige `last_outcome` = `inserted` o `unchanged`, exige `last_effective_date >= hoy Caracas`, y además una tasa `valid` con fecha efectiva exactamente igual a hoy. Usa `FOR SHARE` dentro de la transacción; no hay fallback a tasa vieja ni TTL arbitrario.
- La migración 0021 añade defensa SQL mediante trigger diferido para validar el estado al completar una venta, también frente a escrituras directas del rol runtime.
- La carrera de intentos supersedidos está corregida con `attempt_id` y bloqueo/validación atómica antes de persistir. La prueba PostgreSQL cubre dos respuestas diferentes para la misma fecha y verifica que el intento antiguo no invalide la tasa del nuevo.
- Existe endpoint `GET /api/orgs/:organizationId/bcv/sync-state`, solo lectura y tenant-scoped, permiso `bcv.sync_state.read` exclusivo de owner/admin. Cashier e inventory no tienen acceso. Respuesta `no-store`, errores sanitizados.
- El dashboard muestra un panel BCV solo a owner/admin, con último intento/éxito, outcome, fecha efectiva, edad del intento, error code sanitizado, actualización manual y refresco automático cada cinco minutos. No permite editar tasa ni ejecutar sincronizaciones.
- Wrangler ya declara Workers Observability/Logs: redacción de query strings, `invocation_logs=false`, logs estructurados explícitos con sampling 1. El Cron registra `BCV_SYNC_STARTED`, `BCV_SYNC_COMPLETED` y `BCV_SYNC_FAILED`; el error solo expone código sanitizado.
- No se ha creado Monitor, destino de correo ni watchdog; no se ha probado entrega de alertas. Inspeccionar dataset/campos reales y consumo de cuenta antes de configurar monitor.

## Gates aún abiertos — producción NOT READY

1. CI exact-HEAD del siguiente commit documental/código debe volver a validarse; no reutilizar los resultados de este SHA.
2. Capturar y conservar fixture reproducible de HTML oficial BCV y probar el parser con respuesta real. La recuperación oficial anterior devolvió 502; no sustituir por copias de terceros.
3. Obtener calendario bancario oficial SUDEBAN verificable. No afirmar que no existe ni codificar fechas desde terceros.
4. Justificar y aprobar límites del parser `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7`; siguen hard-coded y no aprobados.
5. Configurar monitor de `BCV_SYNC_FAILED`, destino autorizado y prueba de entrega. Diseñar watchdog de `running` estancado con SLO/umbral medido; no inventar umbral.
6. Cerrar identidad efectiva del Worker, pruebas aisladas de recuperación, revisión legal/contable y semántica append-only de cambios, pagos parciales, anulaciones y reembolsos.
7. La contingencia de tasa manual por owner/admin sigue siendo una propuesta documentada, no una función activa. Mantener el diseño de autorización reforzada (PIN secreto verificado en servidor, límites/rate-limit, auditoría, caducidad y separación de funciones); no implementar ni permitir edición directa hasta cerrar revisión legal/contable y especificación.

## Reglas de continuidad

- No pedir otra vez Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones si el dato está en GitHub o documentación. Si falta un dato imprescindible, pedirlo una sola vez y aceptar texto.
- Leer primero `AGENTS.md`, `WORK_CHECKPOINT.md`, `docs/CONSTITUTION.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md` y `docs/SECURITY_ROADMAP.md`.
- Mantener #287 Draft. CI verde no equivale a aprobación. No fusionar PR de procedencia por separado si su cambio ya está integrado.
- Actualizar este estado documental cuando haya una decisión, hallazgo o discrepancia nueva; después revalidar CI exact-HEAD.

---

# Estado operativo vigente — 9 de noviembre de 2026

> Este bloque es la referencia operativa más reciente. Los snapshots históricos posteriores conservados debajo no deben confundirse con el estado actual. Antes de actuar, volver a consultar GitHub y confirmar el HEAD.

## Integración BCV + checkout

- PR #287: OPEN / Draft, base `main`, HEAD de código validado `12550a3c50212234b39e3e84b45f36a07465abde`, 123 ahead / 0 behind, GitHub `mergeable=true`.
- CI de ese HEAD exacto: **13/13 workflow runs SUCCESS y 15/15 check-runs SUCCESS**. Los check-runs incluyen CI, PostgreSQL migration runner, database migration validation, Playwright, Semgrep, Trivy, secret-history, backup/restore, dependency review, ODD docs y builds Cloudflare.
- El endpoint de combined commit status informa `pending` con lista vacía de status contexts; no hay contextos legacy reportados. No confundirlo con los 15 check-runs, que están SUCCESS.
- PR #287 no tiene aprobación formal APPROVED ni hilos de revisión abiertos. CI verde no es aprobación ni autorización de merge.
- PR #295 sigue OPEN / Draft, HEAD `213837969375fa87f5edca79e0d752333bc93d8c`; su cambio funcional se integró/reconcilió en #287. Comparación #295 frente al HEAD de #287: 51 ahead / 9 behind, mergeable=false. Mantener como evidencia de procedencia; no fusionar independientemente.
- PR #255 y #269 siguen OPEN / Draft, ambos mergeable=false. No fusionar.
- PR #196 aparece actualmente CLOSED y no merged, aunque la restricción histórica lo describía como Draft. No reabrir ni modificar sin autorización. Issue #53 continúa OPEN.
- Los checks Cloudflare de este HEAD muestran únicamente URLs de preview para Pages y Workers; no muestran promoción a producción. No se ejecutó deploy manual ni se activó Cron de producción. `APP_ENV=preview` y `BCV_SYNC_ENABLED=false` siguen como protección de previews.

## Cambios de código reconciliados

- Checkout exige último sync exitoso (`last_success_at`, outcome `inserted`/`unchanged`, `last_effective_date >= hoy Caracas`) y una tasa BCV validada con fecha efectiva exacta de hoy.
- Checkout lee el singleton `bcv_sync_state` con `FOR SHARE` dentro de la transacción; no hay fallback a tasa anterior ni TTL arbitrario.
- Migración 0021 añade además trigger diferido `sales_latest_bcv_sync_success` para validar el mismo estado al completar una venta, incluso en escrituras SQL directas con rol runtime.
- La función del trigger es `SECURITY DEFINER`, propiedad de `microapp_migrator`, con permisos directos revocados a PUBLIC/runtime. Las aserciones de migración verifican la definición, el lock, los permisos y el trigger.
- Prueba PostgreSQL usa el rol runtime para intentar completar una venta directamente después de un sync fallido; espera rechazo SQLSTATE 23514.
- La protección SQL complementa el handler. No prueba resistencia ante compromiso del propio runtime, que conserva permisos column-scoped para que el Worker pueda escribir el estado de sincronización.

## Producción: NOT READY

Gates todavía pendientes:
1. CI exact-HEAD del commit documental posterior a este snapshot (el HEAD de código anterior está verde; un nuevo commit exige revalidación).
2. Fixture HTML reproducible de la fuente oficial BCV y pruebas con HTML real. La consulta pública directa a BCV devolvió 502; no hay fixture oficial capturado.
3. Calendario bancario oficial SUDEBAN verificable. La página pública muestra la sección “Calendario Bancario”, pero no se recuperó un PDF/circular 2027 oficial; no afirmar que no exista ni usar terceros como evidencia primaria.
4. Justificación/aprobación de límites del parser 10/7.
5. Alertas y recuperación operativa; identidad efectiva del Worker; revisión legal/contable.
6. Semántica comercial append-only de cambio, pagos parciales, anulaciones y reembolsos.
7. Reconciliación final de permisos/runtime identity y ensayo aislado de recuperación/concurrencia.

## Alertas operativas — investigación

Cloudflare documenta Alerts > Monitors con consultas SQL y destinos email/webhook disponibles en todos los planes; consultas, dashboards y alertas no tienen cargo adicional. El modelo Observability que comienza el 1-dic-2026 incluye 0,5 GB/día y 7 días de retención en Free, sujeto a límites del plan. Candidata: monitor sobre `logs.workersLogs` para `BCV_SYNC_FAILED`. Pendiente verificar en la cuenta real que Workers Logs está habilitado, que el dataset y columnas están disponibles y que el volumen cabe en el cupo. `apps/api/wrangler.toml` no declara explícitamente `observability`. No se configuró monitor ni destino.
El endpoint público `GET /api/exchange-rates/latest` expone la tasa actual, no el estado operativo del singleton. No existe todavía endpoint/panel admin de `last_attempt_at/last_success_at/last_outcome` ni watchdog de `running` estancado. No implementar retries automáticos ni configurar canales externos hasta cerrar diseño y autorización.

## Restricciones vigentes

No merge, no producción deploy, no Neon `main` writes, no migraciones remotas, no activar Cron, no cambios de secretos/DNS/billing, no datos reales. Mantener #287 y #295 Draft. No cerrar issue #53. No pedir al usuario datos ya documentados, terminal, CLI, capturas ni reconexiones innecesarias.

---

## PR #287 — estado posterior a sincronización con main — 2026-11-09 UTC

- HEAD exacto: `cabe98707c6f4c348df23bfcb7c47f5dd9756532`.
- PR #293 integró main mediante merge commit, no squash. Main `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71` quedó como ancestro; primer padre fue el HEAD previo #287 `254ebb6e741f7c1b147fbd4880bc188f17204807`.
- Comparación: **113 ahead / 0 behind**, GitHub `mergeable=true`.
- **CI exact-HEAD: 15/15 check-runs SUCCESS y 11/11 workflow runs SUCCESS**, incluidos verify, Playwright, PostgreSQL migration runner, database migration validation, backup/restore, Semgrep, Security, secret-history, dependency review y ODD docs.
- PR #287 sigue OPEN/Draft; no tiene APPROVED formal. No merge a main.
- Freshness/last-success sigue P1: checkout no consulta `bcv_sync_state.last_success_at`. Umbrales 10/7 sin aprobación, fixture BCV oficial y calendario SUDEBAN verificable pendientes; revisión legal/contable pendiente.
- No Neon writes, no deploy, no Cron BCV, no Cloudflare manual, secretos, DNS, billing ni datos reales. Producción NOT READY.
- Detalle completo en `docs/HANDOFF_NEXT_CHAT_2026-11-09_BCV-checkout-integration.md`.

## Reconciliación posterior a PR #291 — snapshot 2026-11-09 UTC

**Main al iniciar esta reconciliación:** `56ad2b29b994fbad31275c801e8f23a2b9736db2` (merge de PR #291). Post-merge exact-SHA: **11/11 check-runs SUCCESS**. Este snapshot documenta el estado inmediatamente posterior a #291; el PR docs-only que lo contiene volverá a mover main, por lo que reconsultar GitHub después del merge.

### PRs de integración y conflictos de sincronización
| PR | HEAD | Base registrada | Ahead / behind main | Check-runs | Workflow runs | Estado |
|---|---|---|---:|---:|---:|---|
| #255 BCV | `b0e47205b96f636b2ab270304d2598423a50ccc3` | `9c6b30281ed59726e532da840568fc9e80b528f7` | 88 / 2 | 15/15 SUCCESS | 10/10 SUCCESS | OPEN/Draft |
| #269 checkout + ledger | `7fc91b54f869664febb6a7daf1ed05b408bd8430` | `9c6b30281ed59726e532da840568fc9e80b528f7` | 63 / 2 | 18/18 SUCCESS | 11/11 SUCCESS | OPEN/Draft |
| #287 BCV + checkout rehearsal | `254ebb6e741f7c1b147fbd4880bc188f17204807` | `9247cb24effd7d98be29aabe8d44c51fbab7a138` | 111 / 2 | 15/15 SUCCESS | 11/11 SUCCESS | OPEN/Draft |

GitHub reporta `mergeable=false` / `mergeable_state=dirty` para #255, #269 y #287 después de los dos merges documentales #288 y #291. No hacer force-push ni intentar sincronización automática.

Archivos modificados tanto en las ramas como en el tramo de main:
- #255/#269: `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PRODUCTION_READINESS.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/STATE_JOURNAL.md`, `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`, `docs/WORK_CHECKPOINT.md`.
- #287: `docs/CURRENT_STATE.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/SECURITY_ROADMAP.md`, `docs/STATE_JOURNAL.md`, `docs/WORK_CHECKPOINT.md`.

La lista es la intersección de paths modificados, no una afirmación de que cada archivo tenga conflicto textual. Antes de resolver, comparar base, main y cada rama, preservar evidencia específica de cada una y validar la combinación. Preferir una PR de reconciliación aislada por rama; no sobrescribir documentos completos.

### Estado de producto y gates
- PR #288 está MERGED y documenta Gestión de contingencia cambiaria como **propuesta no implementada**.
- PR #291 está MERGED; actualizó CURRENT_STATE/HANDOFF/CHECKPOINT/PLAN/JOURNAL/SECURITY_ROADMAP y añadió tarea ODD de reconciliación.
- #287 corrigió la carrera de intentos BCV supersedidos con `attempt_id` bajo `SELECT ... FOR UPDATE` y una prueba PostgreSQL de tasas diferentes; PR #289 y #290 se integraron solo en la rama #287. Su código HEAD validado es `254ebb6...`, 15/15 check-runs y 11/11 workflows SUCCESS.
- Freshness sigue P1: checkout no consume `bcv_sync_state.last_success_at`; una fila same-day `valid` puede permanecer utilizable después de un fallo posterior. Definir política y pruebas fail-closed.
- Los umbrales `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7` no tienen justificación/aprobación de negocio.
- No se obtuvo fixture HTML real BCV ni circular/calendario oficial 2027 verificable. BCV directo devolvió 502; SUDEBAN no pudo recuperarse directamente y la búsqueda oficial no devolvió PDF 2027. No afirmar inexistencia ni usar terceros como fuente primaria.
- Revisión legal/contable de tasa efectiva, IVA/facturación, contingencia manual y evidencia de aceptación del cliente sigue pendiente.
- PR #255/#269/#287 no tienen review APPROVED formal. #269 conserva un único thread histórico RESOLVED; #255/#287 sin threads abiertos.

### Seguridad y límites
No merge de #255/#269/#287. No deploy manual, Neon writes, Cron BCV activado, Cloudflare manual, secretos, DNS, billing ni datos reales. Neon rehearsal #42507066215 fue aislado; no repetir. **Producción: NOT READY.**

### Próxima secuencia
1. Resolver conflictos de #287 primero, preservando la evidencia de integración BCV+checkout; mantener Draft.
2. Después reconciliar #255/#269 individualmente, sin copiar snapshots obsoletos ni force-push.
3. Cerrar freshness/last-success, fixture BCV, calendario oficial, permisos/runtime identity y revisión legal/contable.
4. Revalidar CI en cada SHA final y obtener la aprobación requerida antes de integrar código.

## Revalidación autoritativa — 2026-11-09 UTC

**Main observado:** `bfa7d0047d158d5caae4798337f239e767c30acd` (merge documental #288). Sus check-runs post-merge: **11/11 SUCCESS**. Este bloque prevalece sobre snapshots históricos inferiores; consultar GitHub antes de cualquier acción posterior.

### Cambios documentales recientes
- **PR #288 — Gestión de contingencia cambiaria:** MERGED por squash en main, SHA `bfa7d0047d158d5caae4798337f239e767c30acd`. Añade `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`, `docs/decisions/ADR-20261109-fx-contingency-authorization.md` y `odd/tasks/fx-contingency-management.md`. Es una propuesta documentada, no una funcionalidad implementada ni habilitada.
- La propuesta define BCV automático como modo normal; contingencia manual temporal, no automática, con motivo, tasa, alcance, vencimiento, PIN individual para pequeño negocio, MFA/doble aprobación opcional para empresa, auditoría y snapshots inmutables. Pendiente reconciliar Owner vs Admin delegado con la matriz de permisos y revisión legal/contable venezolana.

### PRs de integración — lectura viva de GitHub
| PR | HEAD exacto | Comparación contra main | Check-runs | Workflow runs | Estado |
|---|---|---:|---:|---:|---|
| #255 BCV | `b0e47205b96f636b2ab270304d2598423a50ccc3` | 88 ahead / 1 behind | 15/15 SUCCESS | 10/10 SUCCESS | OPEN/Draft |
| #269 checkout + ledger | `7fc91b54f869664febb6a7daf1ed05b408bd8430` | 63 ahead / 1 behind | 18/18 SUCCESS | 11/11 SUCCESS | OPEN/Draft |
| #287 BCV + checkout rehearsal | `254ebb6e741f7c1b147fbd4880bc188f17204807` | 111 ahead / 1 behind | 15/15 SUCCESS | 11/11 SUCCESS | OPEN/Draft |

- #255, #269 y #287 tienen `mergeable=true` en la consulta, pero **ninguna tiene aprobación formal APPROVED**. #269 tiene un review thread histórico, marcado RESOLVED; #255 y #287 no muestran threads abiertos.
- #287 incluye la corrección de concurrencia: el intento supersedido verifica `attempt_id` bajo `SELECT ... FOR UPDATE` antes de persistir; una prueba PostgreSQL fuerza dos tasas diferentes para la misma fecha y confirma que la tasa más nueva permanece `valid`. PR #289 (fix de aserción del handler) y PR #290 (handoff/ODD) se integraron únicamente en la rama de #287; no en main.
- Las ramas #255/#269 parten de base registrada `9c6b30281ed59726e532da840568fc9e80b528f7`; #287 de `9247cb24effd7d98be29aabe8d44c51fbab7a138`. Todas aparecen 1 commit detrás de main por el merge documental #288. No force-push; sincronizar no destructivamente y volver a ejecutar CI exact-HEAD cuando corresponda.

### Gates P1 pendientes — BCV y checkout
1. **Freshness:** la migración 0021 registra `last_attempt_at/last_success_at`, pero `findApplicableCheckoutRate()` no consulta `bcv_sync_state`. Una fila del día `valid` puede seguir siendo consumida tras un intento de sincronización fallido. Definir política de last-success y prueba fail-closed; no inventar ventana.
2. **Umbrales:** `MAX_EFFECTIVE_DATE_AGE_DAYS=10` y `MAX_EFFECTIVE_DATE_FUTURE_DAYS=7` siguen hard-coded sin justificación/aprobación como política.
3. **Fixture BCV:** no se obtuvo HTML real oficial reproducible; la recuperación directa de `https://www.bcv.org.ve/` devolvió 502 en esta consulta.
4. **Calendario:** SUDEBAN muestra una sección “Calendario Bancario”, pero la página directa agotó el tiempo y la búsqueda restringida al dominio oficial no devolvió circular/PDF oficial 2027 verificable. No afirmar que no exista; no usar calendarios de terceros como prueba primaria.
5. **Legal/contable:** validar fecha efectiva, IVA/facturación, tasa manual excepcional y evidencia de aceptación del cliente antes de habilitar.
6. **Checkout comercial:** revisar devoluciones, anulaciones, cambio en efectivo y pagos parciales; mantener las ventas completadas append-only.

### Seguridad y producción
- No merge de #255/#269/#287; siguen Draft. CI verde no equivale a aprobación formal ni a readiness productiva.
- No deploy manual, no escrituras Neon, no Cron BCV activado, no cambios Cloudflare manual, secretos, DNS, billing ni datos reales.
- Neon rehearsal #42507066215 fue aislado y cubrió 0001–0019; no repetir escrituras.
- **Producción: NOT READY.**

### Próxima secuencia
1. Cerrar freshness/last-success con decisión de producto y pruebas PostgreSQL de fallos y concurrencia.
2. Obtener fixture oficial BCV y circular/calendario oficial SUDEBAN verificables; mantener bloqueos si la fuente no es accesible.
3. Revisar permisos y runtime identity de Worker; no activar Cron.
4. Validar legal/contablemente la política cambiaria y el contrato comercial checkout.
5. Solo después, sincronizar ramas de forma no destructiva, revisar PRs y obtener la aprobación requerida.

## Checkpoint vivo — 2026-11-08 UTC

- Main: `594382f6f191f2ea0b55d913683841e51c210e5d`; post-merge 13/13 check-runs y 11/11 workflows push SUCCESS.
- #286: snapshot anterior `3666bc1043733a21f880ca5da68a6be45e59e261`, 25 ahead / 0 behind, mergeable=true, 14/14 checks y 12/12 workflows SUCCESS; este commit cambia el HEAD y requiere revalidación.
- #269: HEAD `0ae7f1d71f9bb2155bddca5b5dcc0a2b7785b089`, 27/3, mergeable=true, 16/16 checks y 14/14 workflows SUCCESS; mantener Draft por gates comerciales.
- #255: HEAD `7e43d7fd1519889605174da5818190bb84685059`, 54/3, mergeable=true, 15/15 checks y 13/13 workflows SUCCESS; mantener Draft por gates BCV.
- Neon rehearsal #42507066215 ya completado en entorno aislado; no repetir escrituras. Producción **NOT READY**.

Siguiente: revalidar el nuevo SHA de #286; después continuar checkout/ledger y BCV sin forzar ramas ni alterar producción.

## Checkpoint vivo — 2026-11-08 UTC

Fuente autoritativa de estado: `docs/CURRENT_STATE.md`. Este checkpoint resume únicamente el punto operativo.

- Main: `594382f6f191f2ea0b55d913683841e51c210e5d` (PR #285); post-merge: 13/13 check-runs y 11/11 workflow runs push SUCCESS.
- #286: OPEN/Draft, docs-only; snapshot anterior HEAD `9071c4921b38343f934a747bec77841791cfd2d6`; 21 ahead / 0 behind; `mergeable=clean`; 13/13 check-runs y 10/10 workflow runs SUCCESS exact-HEAD. El commit documental actual requiere revalidación. Los seis checks requeridos de main están SUCCESS. Main aparece protegida (el resumen expone esos checks; reglas detalladas 403). Sin reviews formales ni threads; mantener Draft y no fusionar solo por CI.
- #233: CLOSED como superseded, no merged; 18/18 paths preservados/evolucionados; conservar rama/83 commits.
- #269: OPEN/Draft; HEAD `8f05befb7ac1a46d68850b9f89f89edc8cd46283`; 26 ahead / 3 behind; 11/11 PR workflows SUCCESS exact-HEAD; gates comerciales abiertos.
- #255: OPEN/Draft; HEAD `7e43d7fd1519889605174da5818190bb84685059`; 54 ahead / 3 behind; 10/10 PR workflows SUCCESS exact-HEAD; gates operativos BCV abiertos.
- Neon rehearsal #42507066215 SUCCESS aislado; no repetir escrituras. Producción **NOT READY**.

**Siguiente paso:** verificar los gates reales de #286; después resolver conflictos documentales y sincronizar #269/#255 sin force-push. No modificar Neon main, secretos, Cloudflare manual, DNS, billing ni datos reales.

---

## Corrección posterior a PR #284 — 2026-11-08 UTC

La sección inmediatamente inferior documenta correctamente la punta que existía **antes** de integrar #284 (`d35946a88ab5c8361307b4503dd7c8a879e90f8f`), pero ya no es la punta actual tras ese merge. PR #284 está MERGED por squash en `b752d69622832e2b4cf341bf695997da4c2612fb`; ese SHA es la base de esta corrección documental, no debe reutilizarse como punta posterior si esta PR también se integra. Consultar GitHub para obtener el nuevo merge SHA.

### Estado de PRs revalidado después de #284
- **#269:** OPEN/Draft; HEAD `8f05befb7ac1a46d68850b9f89f89edc8cd46283`; base registrada todavía `9c6b30281ed59726e532da840568fc9e80b528f7`. Comparada con main `b752d696...`: 26 ahead / 2 behind, diverged; GitHub reporta `mergeable=false`. No fusionar ni reutilizar resultados CI como si validaran una base actualizada.
- **#255:** OPEN/Draft; HEAD `7e43d7fd1519889605174da5818190bb84685059`; base registrada todavía `9c6b30281ed59726e532da840568fc9e80b528f7`. Comparada con main `b752d696...`: 54 ahead / 2 behind, diverged; GitHub reporta `mergeable=false`. No fusionar ni activar BCV.
- **#284:** MERGED por squash en `b752d69622832e2b4cf341bf695997da4c2612fb`. Su HEAD exacto `764097ffe454f9551cf70b22d337c0bad1d44724` terminó con 14/14 check-runs SUCCESS y 12/12 workflow runs SUCCESS (10 pull_request + 2 push). La comprobación Workers Build y Pages fue de preview/check de PR; no representa autorización de despliegue productivo.
- **Post-merge de #284:** en el merge SHA `b752d696...`, al último sondeo había 9/11 check-runs SUCCESS y 8/9 workflow runs SUCCESS; `verify` y Workers Build seguían IN_PROGRESS, y CI push seguía IN_PROGRESS. No declarar el post-merge completo hasta que terminen.
- La PR #269 y #255 deben sincronizarse con main mediante merge no destructivo y ejecutar CI de nuevo en sus nuevos HEAD exactos antes de evaluar cualquier integración. No force-push.

### Reglas
Los SHA anteriores describen un snapshot temporal de la consulta del 2026-11-08; la punta de main cambia al integrar PRs. Esta sección es la corrección más reciente y prevalece sobre snapshots inferiores. Mantener #269/#255 Draft por sus gates de producto/BCV, aunque los checks históricos estuvieran verdes.

---

## Corrección autoritativa de punta y reconciliación — 2026-11-08 UTC

**Punta de `main` verificada en GitHub:** `d35946a88ab5c8361307b4503dd7c8a879e90f8f`. Es el commit más reciente observado en la consulta de commits del repositorio. Integra PR #283 por squash; #283 reconcilió documentación después de #280/#282 y de la recuperación checkout-ledger. Por tanto, las referencias que siguen en snapshots anteriores a `9c6b30281ed59726e532da840568fc9e80b528f7` son históricas, no la punta actual.

### Correcciones de estado que prevalecen sobre los snapshots inferiores
- PR #280 MERGED en `aa2804a0a6e7879f684b3baeb60646e50f1d6419`; PR #282 MERGED en `9c6b30281ed59726e532da840568fc9e80b528f7`; PR #283 MERGED y su commit resultante es la punta indicada arriba.
- PR #258 y #262 están CLOSED como superseded, no merged. No presentarlas como abiertas ni como trabajo perdido: su contenido fue comparado y preservado/evolucionado en #269. No borrar ramas ni commits históricos.
- PR #233 continúa OPEN/Draft como fuente histórica. El cuerpo histórico del PR todavía contiene referencias antiguas a #258/#262 como abiertas y a su antigua función de recuperación; esas referencias no describen el estado vivo. No cerrar #233 hasta completar la revisión semántica de sus 18 paths/83 commits y demostrar que no queda comportamiento único sin preservar.
- PR #193 continúa fuera de alcance de esta reconciliación; mantenerla intacta.
- #269 checkout+ledger y #255 BCV siguen OPEN/Draft según la última consulta de PRs disponible. Los SHA/checks descritos en sus cuerpos son evidencia histórica de esos SHA; antes de una decisión de integración, consultar en vivo el HEAD/base, comparación, checks exactos, reviews y threads. No reutilizar CI de SHA anteriores.
- #269 no debe fusionarse mientras permanezcan sin resolver la aprobación del contrato comercial checkout y la decisión de si ventas USD-only requieren tasa BCV. #255 no debe integrarse/activarse en producción mientras sigan abiertos los gates P1 de anomalías/freshness, persistencia de último intento/éxito y alerta, fixture oficial BCV y calendario de feriados.
- El intento de leer branch protection devolvió HTTP 403 al conector. No afirmar que la configuración de protección fue verificada; distinguir siempre workflow runs, check-runs, status contexts y reviews formales.

### Neon y límites
El ensayo autorizado #42507066215 completó bootstrap-and-migrate en la base aislada `microapp_rehearsal`, con migraciones 0001–0019, assertions 0017–0019 y comprobaciones de ownership/grants. No repetir escrituras ni migraciones remotas. Esto no certifica el Worker productivo ni autoriza cambios en Neon main, `neondb`, secretos, Cloudflare, DNS, billing o despliegues. Producción permanece **NOT READY**.

**Regla de continuidad:** este bloque prevalece sobre cualquier snapshot contradictorio inferior. Los bloques antiguos se conservan como historial append-only; no reescribirlos como si hubieran sido el estado actual. Consultar GitHub para la punta viva antes de cada decisión y actualizar este encabezado cuando cambie main.

---

## Estado autoritativo — 2026-11-08 UTC (posterior a PR #280/#282 y recuperación checkout-ledger)

**Main vivo:** 9c6b30281ed59726e532da840568fc9e80b528f7. PR #280 integrada por squash en aa2804a0a6e7879f684b3baeb60646e50f1d6419; PR #282 integrada en 9c6b30281ed59726e532da840568fc9e80b528f7. La auditoría documental de #280 ya está en main. Consultar la punta viva antes de cualquier operación.

### Estado vivo de PR
- **#269 checkout + inventory ledger projection:** OPEN/Draft, base main 9c6b30281ed59726e532da840568fc9e80b528f7, HEAD 8f05befb7ac1a46d68850b9f89f89edc8cd46283, 26 ahead / 0 behind, mergeable=true. En ese HEAD exacto: 16/16 check-runs y 14/14 workflow runs SUCCESS. Incluye verify, Chromium, JS/TS, postgres-migration, migration-runner, Trivy, secret-history, ODD, Playwright, Semgrep, backup restore y builds Pages/Workers. Reviews: tres COMMENTED, cero APPROVE; el hilo inline sobre sucursal inactiva está RESOLVED. Mantener Draft: sigue pendiente aprobación explícita del contrato comercial checkout y decisión sobre dependencia BCV en ventas USD-only.
- **#255 BCV:** OPEN/Draft, base main 9c6b30281ed59726e532da840568fc9e80b528f7, HEAD 7e43d7fd1519889605174da5818190bb84685059, 54 ahead / 0 behind, mergeable=true. En ese HEAD exacto: 15/15 check-runs y 13/13 workflows SUCCESS. Mantener Draft por gates operativos P1: política de anomalías, last-attempt/last-success persistente y alerta externa, freshness real, fixture HTML oficial BCV y calendario oficial de feriados bancarios.
- **#258 checkout** y **#262 inventory ledger projection:** cerradas como superseded, no merged. Su contenido único fue comparado por paths/blobs y preservado/evolucionado en #269. No borrar sus ramas ni commits históricos.
- **#233:** OPEN/Draft histórica; no cerrar hasta comparar todo su contenido único contra el conjunto integrado. **#193:** OPEN; mantener sin cambios.
- #280 y #282: MERGED. No presentar los checks de una PR como aprobación humana independiente.

### Neon rehearsal y alcance real
Run #42507066215 SUCCESS, operación bootstrap-and-migrate, fuente inmutable 6227a3a8497f6be94d675b64da5da61530c200fc, destino aislado microapp_rehearsal / br-curly-poetry-b7dxsddm. 0001–0019 aplicadas; 19 registros applied; assertions 0017–0019 y ownership/grants verificados. Los seis archivos de migración 0017–0019 y assertions tienen blobs idénticos entre el source ensayado y el HEAD actual #269. No repetir bootstrap-and-migrate ni realizar escrituras Neon adicionales.
El ensayo verifica el bundle SQL y roles en la base aislada; no prueba el comportamiento HTTP del Worker conectado a Neon ni la identidad real del DATABASE_URL productivo. CI ejecuta pruebas PostgreSQL desechables con login microapp_runtime real. No tocar Neon main, parent clone neondb, datos reales, secretos, Cloudflare productivo, DNS, billing o despliegues.

### Revisión de seguridad y cambios consolidados
- Migration 0018 protege allocation_position y la reconciliación diferida por pago; revoca DELETE/TRUNCATE sobre payments a PUBLIC/runtime y las assertions verifican esos privilegios.
- Migration 0019 convierte el ledger append-only en única fuente runtime de cambios de stock; runtime no tiene INSERT/UPDATE/DELETE/TRUNCATE sobre inventory_balances. El movimiento vuelve a validar y estabilizar branches.is_active con FOR SHARE NOWAIT; hay regresión PostgreSQL para sucursal desactivada.
- #269 pasó CI exact-HEAD después de estas correcciones. El resultado de CI no elimina el gate de contrato comercial ni certifica producción.
- El conector no pudo leer la configuración de branch protection: endpoint devolvió HTTP 403 Resource not accessible by integration. Por ello no afirmar una lectura nueva de la configuración; los check-runs observados sí están verdes.

### Bloqueos de producto / BCV
- Checkout: no cambiar por inferencia el contrato de una moneda de liquidación por venta, liquidación exacta, sin parciales/sobrepagos/cambio. El propietario aún no ha aprobado explícitamente ese contrato.
- Checkout exige actualmente una tasa BCV válida incluso para ventas USD-only; decidir si es requisito comercial o dependencia innecesaria antes de modificar.
- BCV: latest API/checkout usan effective_date + validation_status, no antigüedad de fetched_at. La persistencia unchanged no actualiza fetched_at; no representa last-success. Un Cron fallido o corrección tardía de BCV puede dejar una tasa antigua marcada current.
- Sin política aprobada de anomalías/freshness, registro persistente de último intento/éxito y alerta, fixture HTML real y calendario oficial de feriados, no activar Cron ni declarar conversión VES lista.
- **Producción: NOT READY.** No hubo smoke test comercial autenticado en Worker productivo, validación de identidad efectiva del Worker, ni despliegue productivo.

### Próximo orden de trabajo
1. Mantener #269 Draft hasta resolver contrato comercial checkout y dependencia BCV USD-only; no inventar decisiones.
2. Cerrar gates P1 de #255 con política aprobada y observabilidad comprobable; no activar Cron en producción.
3. Revisar #233 para determinar si queda contenido histórico único fuera de #269; no cerrar por antigüedad.
4. Continuar pruebas aisladas de checkout/pagos/idempotencia/rollback, inventario/concurrencia y runtime role; documentar evidencia.
5. Mantener main/Neon productivo intactos y actualizar este estado cuando cambie el HEAD o una PR.

---

# Work checkpoint — 2026-11-08 UTC (posterior a PR #281)

## Estado confirmado
- Último main verificado antes de este checkpoint: `e6f0c6021d82cfffce12f4c1d5283f657dc74c64` (merge SHA PR #281). Consultar GitHub para la punta viva antes de actuar.
- PR #280 y PR #281 están integradas. PR #281 HEAD `756526779491a74b12e1b2746963b36cec59eff6`; merge SHA `e6f0c6021d82cfffce12f4c1d5283f657dc74c64`.
- Post-merge PR #281: 9/9 workflows y 11/11 check-runs SUCCESS, incluidos CI, Playwright, PostgreSQL, Security/SAST, secret-history, Pages y Workers Builds.
- Neon rehearsal #42507066215 SUCCESS: fuente `6227a3a8497f6be94d675b64da5da61530c200fc`; migraciones 0001–0019 verificadas solo en `microapp_rehearsal`. No repetir escrituras Neon.

## PRs activas y bloqueos
- #269 OPEN/Draft, HEAD `14afd5de938a6ff655ecdfc5cb747f0f799290c5`, 24 ahead / 4 behind main, mergeable=false. Solo 5 check-runs SUCCESS y 3 workflows push SUCCESS en ese HEAD; faltan workflows pull_request y contextos requeridos verify/Chromium/JS-TS. Las migraciones 0017–0019 coinciden con source SHA ensayado; cinco commits posteriores solo cambiaron workflow/docs/ODD. Contrato comercial checkout no aprobado; mantener Draft.
- #255 OPEN/Draft, HEAD `a19a5c61f3f9e878d531ef1150f9c1aa033d6cc7`, 53 ahead / 11 behind; 10 workflows SUCCESS en ese HEAD anterior a sincronización; P1 freshness, alerta, fixture real BCV, anomalías y feriados.
- #258 OPEN/Ready, 35 ahead / 42 behind; #262 OPEN/Ready, apilada sobre #258 y 107 ahead / 42 behind. No fusionar separadamente ni cerrar sin preservar contenido único.

## Próximas acciones
1. Sincronizar #269 con main sin force-push; actualizar ODD/modelo checkout y revalidar CI exact-HEAD.
2. Mantener #269 Draft hasta aprobación del contrato comercial y cierre de riesgos BCV.
3. Sincronizar #255 separadamente y cerrar sus P1 antes de integración.
4. Preservar #258/#262 hasta comparar contenido único y dependencias.
5. Ejecutar pruebas de checkout, pagos, ledger, idempotencia, rollback y permisos runtime en PostgreSQL desechable; no repetir escrituras Neon.

## Límites
- No mutar Neon main ni ejecutar otra escritura/migración remota.
- No cambiar secretos, Cloudflare settings, DNS, billing ni realizar despliegues manuales.
- No aprobar reglas comerciales ni permisos no autorizados.
- Producción permanece **NOT READY**.

## Checkpoint #287 — integración BCV + checkout

- HEAD de código validado antes de sincronización: `254ebb6e741f7c1b147fbd4880bc188f17204807`; 15/15 check-runs y 11/11 workflows SUCCESS.
- Carrera de sincronizaciones supersedidas corregida y probada con tasas distintas; migración 0021 y runtime-role integration pasan.
- La sincronización de main produce una nueva punta: revalidar todos los checks exact-HEAD antes de cualquier decisión.
- Freshness/last-success, fixture BCV, calendario oficial, permisos/identidad Worker y revisión legal/contable siguen pendientes. Producción NOT READY.

 
## Checkpoint — perfil de backup/restore BCV + ledger projection de PR #287 (2026-11-10)

- Implementado en `integration/bcv-checkout-rehearsal-20261109`; código validado en SHA `7746e86140cdf3a98911665f6955e57a256bfd4b`.
- PR #287 OPEN/Draft, mergeable=true, 224 ahead / 1 behind del main actual `c5373564413ba086690552c6b7deeab08d7b4a89`; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. No sincronizar base automáticamente.
- Exact-HEAD: 11/11 workflow runs pull_request SUCCESS; 0 status contexts; 0 reviews formales; 0 review threads.
- Job backup restore `42872318369`: 22 migraciones aplicadas con `scripts/db/migrate.sh`; PostgreSQL 18, dump age/checksum/decrypt/restore; schema, ownership, ACL, RLS/policies, roles, search_path y ACL por columna preservados; grafo BCV/checkout/ledger projection PASS; tablas auth efímeras excluidas; round-trip 3 s.
- Fixture `scripts/backup_restore_fixture_bcv.sql` no escribe directamente `inventory_balances`; genera proyección mediante movimientos. Comprueba apertura y conteo físico, balances/versiones, tasa sintética con fecha Caracas exacta, `bcv_sync_state` latest-success, checkout completado, payment allocation_position y auditoría.
- `scripts/test_backup_restore_schema_bcv.sh` compara también `pg_attribute.attacl` y privilegios efectivos por columna de `microapp_bcv_sync`, además de ACL de tabla/función, roles/memberships y search_path.
- La tasa BCV de fixture es sintética; el marker `BCV_OFFICIAL_HTML_V1` solo satisface el contrato de DB. No es cotización oficial ni debe mostrarse como dato real.
- Task ODD: `odd/tasks/backup-restore-pr287-projection-profile.md`.
- Limitación material: test sintético usa pg_dump/pg_restore por defecto para preservar ownership/ACL; producción usa `--no-owner --no-privileges`. No es reproducción exacta del restore de artefacto productivo. Falta diseñar/probar bootstrap de ownership y grants para ese modo.
- Issue #53 sigue OPEN/P0; principal efectivo `DATABASE_URL_BACKUP_RO`, least privilege, restore del artefacto remoto, RPO/RTO, alertas externas y coste total $0 siguen pendientes. No ejecutar workflow_dispatch/backup real, no leer secretos ni acceder a Neon.
- No merge, no main, no deploy, no Cron, no datos reales. Producción NOT READY. Deadline 2026-12-01.


## Reconciliación viva — PR #287/#303 y compatibilidad de perfiles (2026-11-10)

### Estado exact-SHA comprobado antes de este bloque documental

- **PR #287** OPEN/Draft, HEAD de código `f33254856e5130acad1cb20423d913e4354e0fc1`, base main actual `c5373564413ba086690552c6b7deeab08d7b4a89`; mergeable=true. Comparación: diverged, 234 commits ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. El único commit que avanzó main desde ese merge base modifica `docs/BACKLOG_RECOVERY_LEDGER.md`, sin cambio de esquema observado. En ese HEAD exacto, 11/11 workflow runs `pull_request` SUCCESS. Backup/restore run `42874207740`, job `130033078108`: 22 migraciones por runner oficial; cifrado age/checksum/restore; ownership, ACL, RLS/policies, role contract y search_path preservados; grafo BCV/checkout/projection-ledger PASS; auth efímero excluido; regresión legacy PASS. Playwright E2E SUCCESS. 0 reviews formales y 0 review threads.
- **PR #303** OPEN/Draft, HEAD `afe0a94005854843ead2526b3a5ea18a183f127a`, base main `c5373564413ba086690552c6b7deeab08d7b4a89`; 73 ahead / 0 behind, mergeable=true. 11/11 workflow runs `pull_request` SUCCESS exact-HEAD; 0 legacy status contexts, 0 reviews y 0 threads.
- Estos datos describen los SHAs previos a este bloque documental. Cada commit nuevo exige revalidar el SHA final; no heredar CI. Ambos PR siguen Draft.

### Riesgo de integración detectado — no fusionar a ciegas

Ambas PR modifican `.github/workflows/backup-restore-smoke.yml` y `docs/BACKUP_AND_RECOVERY.md`. Los perfiles representan estados incompatibles del ledger:

- #303 valida baseline main 0001–0016 y el ledger paired-intent de migration 0010; su fixture `scripts/backup_restore_fixture_main.sql` utiliza `inventory_balance_ledger_intents`.
- #287 valida 0001–0022; migration 0019 elimina `inventory_balance_ledger_intents` y proyecta balances desde `warehouse_inventory_movements`. Su fixture es `scripts/backup_restore_fixture_bcv.sql` y su runner `scripts/test_backup_restore_schema_bcv.sh`.
- El script de #303 detecta tabla-intents vs función de proyección, pero su fixture main contiene operaciones/aserciones sobre intents y no debe ejecutarse sin adaptación sobre 0017–0022. No ejecutar ambos perfiles sobre una misma DB ni asumir que el workflow de una rama reemplaza al otro.

**Decisión de integración:** mantener ambas PR Draft y separadas hasta preparar perfiles explícitos en bases desechables independientes o una fixture adaptativa validada para ambos estados. Resolver el solapamiento de workflow/documentación, confirmar la secuencia de migraciones del destino y ejecutar los tests exactos del HEAD final antes de cualquier merge. No retarget, rebase ni merge automático en este checkpoint.

### Gates abiertos

La cobertura sintética no restaura el artefacto remoto real ni prueba Neon/producción, identidad efectiva de `DATABASE_URL_BACKUP_RO`, least privilege real, RPO/RTO sostenidos, alertas externas o coste total USD 0. Issue #53 OPEN/P0; producción NOT READY. No leer secretos, ejecutar backup manual, modificar Cron, Neon main, roles/grants, Cloudflare, DNS, billing ni datos reales. Deadline MVP: 2026-12-01.


## CHECKPOINT VIGENTE — 2026-11-10 — PR #287/#303 y continuidad entre chats

Este bloque supersede los snapshots anteriores de #287/#303 que mencionen HEADs `f332548...`, `afe0a940...` u otros SHAs previos. GitHub fue consultado en vivo; volver a verificar antes de actuar.

### Estado exact-SHA verificado

- **PR #287** OPEN / Draft / mergeable=true, rama `integration/bcv-checkout-rehearsal-20261109`, base `main`; HEAD `414547da05a3a6676f4610ff7a2f2c0b66e0403e`; base SHA `c5373564413ba086690552c6b7deeab08d7b4a89`. Comparación main...HEAD: `diverged`, 238 ahead / 1 behind; merge-base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. 11/11 workflow runs `pull_request` SUCCESS en ese HEAD: ODD docs, Dependency review, dashboard, Secret history, Security, Backup restore, Semgrep, PostgreSQL migration runner, Database migration validation, CI y Playwright E2E. 0 reviews formales y 0 review threads.
- **PR #303** OPEN / Draft / mergeable=true, rama `security/backup-restore-schema-coverage-20261110`, base `main`; HEAD `d527ae79cd566945cd9bdb3e1475d53b31d3923a`; base SHA `c5373564413ba086690552c6b7deeab08d7b4a89`. Comparación main...HEAD: `ahead`, 77 ahead / 0 behind; merge-base igual a main. 11/11 workflow runs `pull_request` SUCCESS en ese HEAD. 0 reviews formales y 0 review threads.
- Ambos PR permanecen Draft. Los workflows son runs de GitHub Actions; no inferir aprobación humana ni status contexts/branch protection a partir de ellos. Revalidar los SHA antes de toda acción.

### Decisión de integración — no mezclar fixtures ni fusionar a ciegas

Ambas ramas cambian `.github/workflows/backup-restore-smoke.yml` y `docs/BACKUP_AND_RECOVERY.md`, pero prueban estados de esquema incompatibles:

- #303 representa el baseline de main con migraciones 0001–0016 y ledger paired-intent (`inventory_balance_ledger_intents`); usa `scripts/backup_restore_fixture_main.sql` y `scripts/test_backup_restore_schema.sh`.
- #287 representa la cadena 0001–0022, donde migration 0019 sustituye/elimina el ledger intents por proyección desde `warehouse_inventory_movements`; usa `scripts/backup_restore_fixture_bcv.sql` y `scripts/test_backup_restore_schema_bcv.sh`.
- En HEAD #287, el workflow ejecuta el perfil BCV/projection y la regresión legacy. En HEAD #303, ejecuta el perfil main/paired-intent y la regresión legacy. No ejecutar ambos fixtures contra la misma DB ni copiar un workflow sobre el otro sin diseñar dos bases/targets aislados o un harness explícito que aplique cada cadena de migración por separado.
- El perfil #287 añade reintentos acotados a la descarga de la llave PostgreSQL. Su CI exact-HEAD pasa. El test sintético conserva owners/ACL mediante pg_dump/pg_restore por defecto; el backup productivo usa `--no-owner --no-privileges`. El bootstrap de ownership/grants y restore operacional con esos flags aún no está demostrado.

### Prioridades y límites

1. No retarget, rebase, sync de base, merge ni cerrar PRs todavía. Primero inspeccionar diffs completos, confirmar dependencias de migraciones y diseñar una estrategia de coexistencia de perfiles de backup en DBs efímeras separadas. Mantener ambas Draft.
2. Resolver el hallazgo P0 de issue #53: principal efectivo de `DATABASE_URL_BACKUP_RO`, privilegios reales/least privilege, allowlist explícita del dump, restore de artefacto remoto reciente, RPO/RTO sostenidos y alerta externa. No leer secretos ni dumps, no lanzar workflow_dispatch/backup manual, no tocar roles/grants ni Neon.
3. La prueba sintética CI no equivale a restore operacional de backup remoto reciente ni prueba producción. Producción **NOT READY**.
4. No mutar Neon `main`, datos reales, secretos, roles/grants, Cron, Cloudflare manual, DNS, billing ni despliegues manuales. Presupuesto USD 0. No pedir Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones; usar GitHub/docs y aceptar texto si un bloqueo real requiere al propietario.
5. Tras resolver gates de seguridad Nivel 1, continuar la UI POS P0 de jornada completa y E2E real; no abrir superficies comerciales nuevas antes de cumplir la política del repositorio.
6. Deadline del MVP: **2026-12-01 — INAMOVIBLE**.

### Próxima acción reproducible

Releer `AGENTS.md`, `docs/CONSTITUTION.md`, este checkpoint, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/ODD_WORKFLOW.md`, `docs/BACKUP_AND_RECOVERY.md`, `docs/SECURITY_ROADMAP.md` y `odd/tasks/backup-restore-pr287-projection-profile.md`. Consultar GitHub en vivo; inspeccionar el diff completo de #287 y #303, incluyendo workflow, fixtures, scripts y documentación; crear una matriz de compatibilidad de perfiles y propuesta de secuencia. No tocar main ni producción. Después de cualquier commit, validar todos los checks en el SHA exacto nuevo.


## Checkpoint — 2026-11-11: dual restore profiles

- Branch: `integration/bcv-checkout-rehearsal-20261109`; PR #287 OPEN/Draft; final HEAD `0b9996f91679ce63578237c4d5e4dd9192a1c5da`; base ref `main`, PR base SHA `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. Compare against main baseline `c5373564413ba086690552c6b7deeab08d7b4a89`: 248 ahead / 1 behind; merge base remains `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. PR API reports mergeable=true / clean at this observation; it remains Draft and is not eligible for merge solely from CI.
- PR #287 exact-HEAD workflows: 11/11 SUCCESS. Backup restore run `42983608139`: BCV projection job SUCCESS (runner + legacy regression) and main paired-intent job SUCCESS, each in its own PostgreSQL 18 service. CI `42983607801`, Playwright `42983607747`, DB migration validation `42983607700`, migration runner `42983608098`, Security scan `42983607882`, dashboard `42983607995`, ODD validation `42983608036`, dependency review `42983607658`, secret history `42983607805`, Semgrep `42983607768`: SUCCESS.
- PR #303 remains OPEN/Draft at `d527ae79cd566945cd9bdb3e1475d53b31d3923a`, base `c5373564413ba086690552c6b7deeab08d7b4a89`, 11/11 exact-HEAD workflows SUCCESS; no formal reviews or review threads observed on either PR.
- Implementation on #287 branch: separate main (0001–0016 paired-intent) and BCV (0001–0022 projection) restore jobs with independent PostgreSQL services; main fixture + runner imported; main migration bundle pinned to immutable baseline `c5373564413ba086690552c6b7deeab08d7b4a89` via `git archive` and runner `MIGRATIONS_DIR`; BCV runner remains checked-out-ref; legacy 13-table regression retained once. Path filters cover both profiles and migration runner. Added ODD design task and reconciled backup docs/task history.
- Validation: exact-HEAD workflow is green after final workflow shell-continuation correction. Main profile verifies 16-migration manifest and paired-intent-vs-projection exclusivity; BCV profile verifies 22-migration projection schema and BCV producer; both restore jobs ran separately. No local execution claimed.
- Open risks: synthetic restore does not prove remote scheduled artifact recovery, actual identity/least privilege of `DATABASE_URL_BACKUP_RO`, restore bootstrap with `--no-owner --no-privileges`, operational RPO/RTO, alert delivery, or total $0 cost. Issue #53 remains OPEN/P0. Production remains NOT READY. Do not merge #287/#303 or change base until full combined diff, security gates, and integration sequence are independently reviewed.
- Next action: audit both restore scripts and workflow semantics for hidden assumptions; verify #53 status and security evidence; then assess whether the dual-profile design has complete independent restore assertions. Keep max two active fronts. No production/Neon/secrets/roles/grants/Cron/deploy/billing/manual backup/real data.

## Verification amendment — 2026-11-11

- Code/workflow implementation HEAD `0b9996f91679ce63578237c4d5e4dd9192a1c5da` passed 11/11 workflows, including the two isolated backup restore profile jobs.
- Documentation-only checkpoint commits followed; latest verified branch HEAD before this amendment: `1dd1d9a78fab7c01ef1321bf4fda963a1d4f3c11`.
- At `1dd1d9a78fab7c01ef1321bf4fda963a1d4f3c11`, all 11 workflows have now completed SUCCESS: CI `42984382399`, backup restore `42984382345` (both main and BCV jobs success), Playwright `42984382469`, DB migration validation `42984382395`, migration runner `42984382602`, Security `42984382539`, Semgrep `42984382350`, secret history `42984382378`, dependency review `42984382400`, ODD validation `42984382358`, dashboard `42984382376`.
- PR #287 remains OPEN/Draft, mergeable true; mergeable_state was `blocked` while checks were pending and must be re-read after this docs-only update. No reviews or threads. PR #303 remains OPEN/Draft at `d527ae79cd566945cd9bdb3e1475d53b31d3923a`, 11/11 success, no reviews or threads. Issue #53 remains OPEN/P0.
- Synthetic profile tests do not close production backup/security gates. Production NOT READY; no merge, Neon/production/secret/role/grant/Cron/deployment/billing/manual-backup or real-data operations performed.

## Reconciliación de continuidad — 2026-11-11 (backup restore y P0)

- **HEAD de código y workflows validado:** `f08be467d73954ca00df4314dcc18f53637da723` en `integration/bcv-checkout-rehearsal-20261109` / PR #287. GitHub: 11/11 workflows SUCCESS exact-SHA; backup restore run `42986231217`: main paired-intent job `130407943736` SUCCESS y BCV projection job `130407944272` SUCCESS, ambos con PostgreSQL 18 independiente. CI `42986231101`, DB migrations `42986231023`, migration runner `42986231220`, Playwright `42986231140`, Semgrep `42986231572`, Security `42986231107`, secret history `42986231372`, dependency review `42986231402`, ODD validation `42986231125`, dashboard `42986231038`: SUCCESS.
- **PR #287:** OPEN/Draft, head `f08be467d73954ca00df4314dcc18f53637da723`, base SHA `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`, 269 ahead / 1 behind, merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`, mergeable=true/clean en la consulta. No merge: sigue Draft y sin reviews formales/threads observados.
- **PR #303:** OPEN/Draft, head `d527ae79cd566945cd9bdb3e1475d53b31d3923a`, base `c5373564413ba086690552c6b7deeab08d7b4a89`, 11/11 workflows SUCCESS exact-SHA; sin reviews formales/threads observados. No fusionar ni combinar a ciegas.
- **Perfiles restore:** jobs separados main 0001–0016 paired-intent y BCV 0001–0022 projection; ambos conservan sus fixtures/manifiestos/ACL/RLS/roles y cifrado/checksum/restore; regresión legacy también pasa.
- **Corrección crítica auth efímera:** production `.github/workflows/backup.yml` y tres smoke runners usan `--exclude-table-data`, no `--exclude-table`. El esquema de `auth_sessions`, `auth_rate_limits`, `auth_bootstrap_attempts` se conserva; sus filas no. Main, BCV y legacy ahora verifican tablas presentes y vacías tras restore. ODD task: `odd/tasks/backup-ephemeral-auth-schema-retention.md`.
- **Identidad backup:** workflow añade diagnóstico read-only no bloqueante que publica solo booleanos (identidad esperada `backup_readonly`, atributos, membresías, DML, secuencias y CREATE). No imprime DSN, host, usuario real, secretos ni filas. Falta observar el próximo run programado natural; no hacer workflow_dispatch/manual backup ni modificar roles/grants. ODD task: `odd/tasks/backup-principal-least-privilege-audit.md`.
- **Issue #53:** permanece OPEN/P0. Pendientes: confirmar el principal real y least privilege en ejecución programada, bootstrap de ownership/grants bajo `--no-owner --no-privileges`, restauración operativa de artefacto remoto, RPO/RTO, alerta externa y coste $0; además de gates comerciales/autorización aún abiertos. Producción NOT READY.
- No se tocó Neon, datos reales, secretos, roles/grants remotos, Cron, DNS, Cloudflare sensible, billing, ni se ejecutó backup manual o despliegue.

## Checkpoint — restore no-owner/no-privileges — 2026-11-11

El procedimiento sintético de ownership/ACL ya está implementado y probado para los perfiles main 0001–0016 y BCV 0001–0022. `pg_restore` se ejecuta como LOGIN directo `microapp_migrator` con `--no-owner --no-privileges`; luego se reproducen únicamente comandos ACL del historial exacto de migraciones, en orden, preservando las revocaciones posteriores. No se ejecuta de nuevo DDL ni se altera `schema_migrations`. Ambos jobs y la regresión legacy pasaron en backup restore run `42989180384` (main `130417569364`, BCV `130417569035`); CI `42989180406` y los otros workflows exact-HEAD también SUCCESS en implementación HEAD `0ddd0da742b474b7256675b9c32292d7750fc2b0`.

No confundir este ensayo con restore productivo: faltan aprovisionamiento seguro de roles/credenciales, artefacto remoto/llave age, identidad efectiva del principal backup en ejecución programada, RPO/RTO, alerta externa y coste $0. Issue #53 OPEN/P0, producción NOT READY. Ver `odd/tasks/backup-restore-no-owner-no-privileges.md`.

## Checkpoint — restore remoto con roles de aplicación — 2026-11-11

El restore remoto ya no se valida como administrador: `scripts/db/restore_remote_backup_ephemeral.sh` restaura como LOGIN `microapp_migrator`, detecta el perfil main/BCV desde `schema_migrations`, comprueba el checksum y filename de cada migración y reproduce solo ACL ordenados. Se valida ownership, atributos/membresías de roles, auth efímero vacío y conexión runtime/producer. Los dos perfiles sintéticos ejecutaron el mismo script en una segunda DB desechable: run `42991705366`, main `130425902535` SUCCESS y BCV `130425902488` SUCCESS (incluida regresión legacy). El workflow de artefacto remoto sigue manual y NO se ejecutó; no se afirma restore remoto nuevo. Issue #53 OPEN/P0; producción NOT READY. Ver ODD `odd/tasks/backup-remote-restore-app-role-validation.md`.

### Revalidación del runner remoto — 2026-11-11

En HEAD de implementación `7b4fdebe846952f1099a4fde323be2dc0f5ce0e8`, run backup restore `42992354071`: main `130428038679` y BCV `130428038320` SUCCESS, legacy regression SUCCESS. El runner valida ahora lectura efectiva de `microapp_runtime` sobre `public.organizations` y ausencia de CREATE en public. CI `42992353978` pendiente al último chequeo; los otros workflows pull_request SUCCESS. El workflow de archivo remoto real no se ha ejecutado. Issue #53 OPEN/P0.

## Addendum — actual producer write probe, rollback-only — 2026-11-11

A second review identified that checking only the producer LOGIN was weaker than the claim "producer permissions usable". The restore runner now performs an effective write-path probe **only for the BCV 0001–0022 profile**, where migration 0022 defines the dedicated producer contract:
- verifies the singleton `bcv_sync_state` row is readable;
- updates only the granted producer columns (`attempt_id`, timestamps, `last_outcome`, `updated_at`);
- inserts a uniquely tagged synthetic `exchange_rates` row using only the granted insert columns and reads its returned UUID using the permitted `id` column privilege;
- updates only `validation_status`;
- rolls the entire transaction back unconditionally.

The main 0001–0016 paired-intent profile predates migrations 0021/0022 and therefore intentionally does **not** run the BCV table write probe; it verifies only the synthetic producer LOGIN exists, not that it has BCV grants. This prevents incorrectly applying the later profile's permission contract to the historical schema.

The probe was corrected after inspection found an indented heredoc terminator in the first draft; the corrected shell block is what the passing workflow exercised. The complete main + BCV smoke run at HEAD `3e6f6f508af316ab102ac0d7fcb7c56bcb65d8eb` is `42993480715`: main job `130431717359` SUCCESS; BCV job `130431717962` SUCCESS, including the legacy regression. All 11 PR workflows at that exact HEAD passed: CI `42993480688`, migration validation `42993480726`, PostgreSQL migration runner `42993480716`, backup restore `42993480715`, Playwright `42993480670`, dependency review `42993480700`, ODD docs `42993480705`, Semgrep `42993480727`, security scan `42993480720`, secret history `42993480721`, project dashboard `42993480717`.

This remains synthetic evidence only. The remote artifact workflow was not dispatched and no remote backup/age key was accessed.

## Addendum — final-profile ACL oracle and hardened ledger parsing — 2026-11-11

The restore grant helper now rejects migration-ledger filenames unless they are safe numbered SQL basenames matching the contiguous version, and rejects checksums unless they are 64-character lowercase SHA-256 digests. It still verifies each exact file's checksum before replaying ACL statements.

A strict post-restore check initially reused migration 0012's historical assertion file after all 16 migrations had been replayed. That test failed because migrations 0013 and 0015 legitimately grant the runtime role access to BCV rates and checkout sales/payments; those are final-profile permissions, not security regressions. The historical migration assertion is valid at migration 0012's point in time, not as the final 0016 oracle. It was not weakened. Instead, added `scripts/db/restore_role_assertions_main.sql`, which validates the final main 0001–0016 runtime contract: required checkout/rate access is present; intent-table access, branch/warehouse mutations, audit reads/mutations and unsafe default ACLs remain absent. The BCV 0001–0022 profile continues to run migration 0022's full producer/runtime effective-privilege assertions.

The BCV restore probe also performs the producer's permitted state update, synthetic rate insert and validation-status update in a single transaction that is rolled back. It is intentionally not run for the main 0001–0016 profile, which predates migrations 0021/0022. The synthetic restore workflow now also runs on pushes to the integration branch, in addition to PR path-filtered runs, so this profile gate cannot silently remain unexecuted on an integration-only update.

**Validated exact HEAD:** `99ed19bd4b0f13503dc875215532e3c83941d168`. PR workflow runs 11/11 SUCCESS: CI `42995277583`; database migration validation `42995277784`; PostgreSQL migration runner `42995277586`; backup restore smoke `42995277769`; Playwright `42995277707`; dependency review `42995277737`; ODD docs `42995278007`; Semgrep `42995277801`; security scan `42995277685`; secret history `42995277589`; project dashboard `42995278070`. Independent push backup smoke `42995267480` also SUCCESS: main job `130437669142`, BCV job `130437668885`, legacy regression included.

The earlier failed run `42994254096` is a retained test-oracle failure, not hidden: it caught that the historical 0012 assertion was being applied at the final schema point. The profile-specific final assertion replaced it and the corrected main + BCV restore passed.

No remote backup artifact or age key was accessed; `.github/workflows/backup-real-restore.yml` remains manual and was not dispatched. No production, Neon, remote role/grant, secrets, Cron, DNS, Cloudflare sensitive setting, billing or deployment was changed.

## Snapshot de HEAD y validación para continuidad — 2026-11-11

- HEAD de rama al escribir este snapshot: `2db970c88eca2fb599ca3ad48860c140f9da46bb`; los commits posteriores a la implementación `99ed19bd4b0f13503dc875215532e3c83941d168` son solo documentación.
- En el HEAD `2db970c88eca2fb599ca3ad48860c140f9da46bb`, los 11 workflows de PR terminaron SUCCESS: CI `42995670374`; DB migration `42995670345`; PostgreSQL migration runner `42995670226`; backup restore `42995670206`; Playwright `42995670377`; dependency `42995670690`; ODD docs `42995670385`; Semgrep `42995670143`; security `42995670133`; secret history `42995670458`; dashboard `42995670122`.
- El restore sintético independiente por push `42995267480` también SUCCESS: main `130437669142`, BCV `130437668885`, incluyendo regresión legacy.
- PR #287 OPEN/Draft; issue #53 OPEN/P0; PR #303 OPEN/Draft. No merge. No declarar producción lista.
- El workflow remoto real sigue manual y no se ejecutó. No leer backups reales ni usar la llave age real. Esperar el backup programado natural para el diagnóstico real de `DATABASE_URL_BACKUP_RO`, una vez que el workflow correspondiente llegue a main.
- Próximo paso: reconsultar el HEAD actual y workflows exact-HEAD antes de cualquier decisión; continuar con gates operativos de #53 (principal efectivo, provisioning seguro, integridad/restore remoto, alertas, RPO/RTO y coste $0). No repetir las investigaciones de roles/ACL ya documentadas.

Follow-up: remote restore harness additionally tests actual runtime organization read and schema CREATE denial; BCV profile tests producer's narrow state/rate writes in a rolled-back transaction. Exact HEAD `f6c453d928ffaef4ab15efc5733bd3c7001089e3`: 13/13 PR workflows SUCCESS; backup smoke `42997279023`, Playwright `42997278934`, CI `42997279209` SUCCESS. Actual remote workflow remains unexecuted; issue #53 OPEN/P0; production NOT READY.

## Checkpoint — runbook operacional de backup/restore — 2026-11-11

Se añadió odd/tasks/backup-operational-recovery-runbook.md. Documenta dos rutas de recuperación (branch PITR aislado si la ventana Neon vigente lo permite; artefacto age cifrado en repositorio privado para recuperación independiente), integridad checksum, custodia de llave, restore desechable con roles de aplicación, restricciones de cutover, timestamps de incidente y cálculo de RPO/RTO, alertas y límites $0.

No se fijan objetivos RPO/RTO sin medición y aceptación de negocio. El backup diario no prueba por sí solo RPO de 24h; pg_restore duration no equivale a RTO. No se ejecutó workflow_dispatch, no se accedió a secretos/artefactos reales/llave age, no hubo Neon ni producción. Próximo gate externo: observar backup programado natural y sus seis booleanos, después de que el workflow actualizado alcance default branch. Issue #53 OPEN/P0; producción NOT READY.

### Gate de principal backup — estado actual de main — 2026-11-11

Se verificó main live: HEAD c5373564413ba086690552c6b7deeab08d7b4a89; .github/workflows/backup.yml blob 5df408788b9053709261ada3aa22dd73b85d5691 no contiene todavía el diagnóstico de identidad. Los últimos runs schedule (42842855127 el 2026-11-10 y 42659924075 el 2026-11-09) son SUCCESS, pero anteriores al cambio y no sirven para demostrar los seis booleanos. No declarar identidad ni least privilege verificados. Esperar el primer run programado natural después de que el diagnóstico alcance main; no ejecutar workflow_dispatch.



## 2026-11-11 — checkpoint de continuidad tras validación exact-HEAD

GitHub live confirma rama `integration/bcv-checkout-rehearsal-20261109` en HEAD `3e00d2c1512e1d0c3c0acc84bcdf4663e4976296`. En ese SHA: 13/13 workflows pull_request SUCCESS, 2/2 workflows push SUCCESS y 16/16 check-runs SUCCESS. IDs de workflows y distinción de evidencias están registrados en `docs/HANDOFF_NEXT_CHAT.md`. PR #287 OPEN/Draft, #303 OPEN/Draft, issue #53 OPEN/P0. PR #287 no tiene reviews formales ni review comments; CI verde no es aprobación.

La validación sintética main 0001–0016 y BCV 0001–0022 pasó, pero no existe restore remoto real ni ensayo completo de recuperación. El diagnóstico de seis booleanos aún no está en main; los runs schedule previos no prueban identidad efectiva ni least privilege. Próximo paso: revisión técnica independiente del diff y compatibilidad #287/#303; después decidir integración segura, sin merge automático ni cambio de Draft por CI. No dispatch manual, no secretos/artefactos reales/llave age, no Neon/producción. #53 permanece OPEN/P0; producción NOT READY.


## Reconciliación viva — 2026-11-11 — HEAD `94f3e3afd561f517301175751a8b7feaf640b2b9`

- #287: OPEN/Draft, mergeable=true, 377 ahead / 1 behind main; el único commit detrás es documental (`docs/BACKLOG_RECOVERY_LEDGER.md`, +15 líneas). No hay reviews formales ni review threads.
- Exact SHA: 11/11 workflows PR SUCCESS, 3/3 workflows push SUCCESS, 18/18 check-runs SUCCESS; 0 status contexts legacy. CI, migration validation, migration runner, Playwright, backup restore, Semgrep, Security, Secret history, dependency, ODD y dashboard pasaron.
- El smoke exacto ejecutó main 0001–0016 y BCV 0001–0022, regresión legacy, guard de destino y validador de artefactos. Runs: PR backup smoke `43002919167`; push backup smoke `43002910346`.
- #303 permanece OPEN/Draft, HEAD `d527ae79cd566945cd9bdb3e1475d53b31d3923a`, 77 ahead / 0 behind, 11/11 workflows y 17/17 checks SUCCESS, sin reviews/threads. Su fixture main ya está incorporado y ampliado en #287; no fusionar #303 por separado.
- Se endureció el runner remoto para aceptar solo URLs de loopback explícitas y mismas sesiones/DB; se añadieron tests negativos. Se añadió validación estricta de filename/sidecar SHA-256 y se eliminó la interpolación de filename no confiable en shell. El diagnóstico del backup oculta stderr de psql.
- Main sigue en `c5373564413ba086690552c6b7deeab08d7b4a89`; no contiene el diagnóstico ni la exclusión solo de datos. Último schedule observado `42842855127` (2026-11-10 SUCCESS), anterior a ambos cambios. No hay run natural posterior observado; no dispatch manual.
- Los artefactos antiguos no satisfacen el contrato nuevo porque carecen del esquema de auth efímera que ahora se conserva vacío. Esperar backup natural posterior a la integración antes de cualquier ensayo remoto.
- Issue #53 OPEN/P0; producción NOT READY. Pendientes: principal efectivo/least privilege real, restore remoto real aislado, provisioning provider-specific, simulacro de aplicación, alerta externa, RPO/RTO medidos y coste $0.
- No Neon main, datos reales, secretos/age, grants remotos, Cloudflare/DNS sensibles, deploy, Cron, billing, force-push ni merge de Draft.


## UI de turnos añadida — 2026-11-11

- Nuevo `RegisterShiftsPanel.tsx` + `register-shifts.css`, integrado en App como vista Caja y turnos para roles owner/admin/cashier.
- Permite listar sucursales asignadas y cajas activas, consultar el turno propio, abrir con fondo inicial USD/VES y cerrar con conteos físicos ingresados nuevamente. La sucursal queda fija durante un turno abierto y el cierre exige revisión/confirmación explícita.
- Prueba nueva de componente para apertura/cierre y denegación 403. El CI sobre SHA `8da81f1...` falló solo en Build and typecheck por import `Root` no utilizado; corregido y además estrechado el acceso a índices de inputs en `a8148f94...`. Confirmar CI del HEAD final antes de aceptar.
- No se prellenan conteos finales con el fondo inicial; no se calculan diferencias ni efectivo esperado. No hay checkout, pagos, recibos o UI de ventas.

- CI `9f1f0b9...`: Build and typecheck SUCCESS; unit tests exposed two new component-test assertions running while nested async requests were still loading. The test helper now waits eight event-loop turns (`30d7368...`). Re-run and inspect exact current SHA; do not classify UI tests green yet.


### Corrección del diagnóstico de test — 2026-11-11

La hipótesis anterior de que el helper de espera era la causa no era correcta. El log completo mostró que el mock de `fetch` construía `new URL()` sin base, pero el API base del test puede ser una ruta relativa; eso lanzaba antes de evaluar el endpoint y producía el estado de error/carga observado. Se corrigió el mock usando una base de test explícita (`https://micro-app.test`) en `apps/web/src/RegisterShiftsPanel.test.tsx`, commit `98b24eca568dd148b50da70e0d558e996a2739a0`. La espera ampliada se mantiene inocua. Este diagnóstico reemplaza la explicación anterior; exigir CI exact-SHA para verificar el arreglo.


## Validación final UI turnos — 2026-11-11

- Código final de la UI/test: `98b24eca568dd148b50da70e0d558e996a2739a0`. HEAD documental exacto probado en GitHub: `f33f423116f2e88be6927745dd119e253025f827` (posterior al código, solo docs).
- CI `43014361783` SUCCESS: Build/typecheck SUCCESS, suite web 88/88 tests SUCCESS, API 198/198 SUCCESS, Playwright Chromium SUCCESS. PostgreSQL own register-shift API integration: 4/4 tests SUCCESS en el mismo job.
- Backup restore smoke `43014361711` SUCCESS: main 0001–0016 y BCV 0001–0023. PostgreSQL migration runner `43014361883` SUCCESS. ODD docs, Secret History, Security, Semgrep, Dependency Review y Project dashboard SUCCESS.
- Excepción pendiente: workflow `Database migration validation` run `43014361738` permanece `pending` y su consulta de jobs devuelve lista vacía; no contarlo como SUCCESS ni como fallo. Reconciliarlo antes de marcar el conjunto total como completo. No hay status contexts adicionales (`combined status` vacío).
- El CI inicial que falló en test UI se corrigió: el mock de fetch ahora resuelve URLs relativas con base `https://micro-app.test`. El CI posterior del HEAD documental f33 valida la corrección. La explicación anterior de que solo era un problema de espera fue corregida en este documento.



## Checkpoint accionable — 2026-11-11 14:07 UTC

**Punto de reanudación:** rama `integration/bcv-checkout-rehearsal-20261109`, PR #287 OPEN/Draft, HEAD `4197dbc77b2c6893abc8bb22e764e14ddf2fe8f3`; main `c5373564413ba086690552c6b7deeab08d7b4a89`; divergencia 482 ahead / 1 behind; único commit behind es documental (+15 líneas en BACKLOG_RECOVERY_LEDGER). No rebase/merge.

**Evidencia exact-HEAD:** 11/11 PR workflows SUCCESS, 2/2 push workflows SUCCESS, 16/16 check-runs SUCCESS; 0 legacy status contexts; 0 reviews/threads. CI: build/typecheck SUCCESS, web 88/88, API 198/198; Playwright 5/5. Backup restore sintético main 0001–0016 + BCV 0001–0023 SUCCESS.

**Bloqueos P0:** #53 OPEN/P0. Main todavía usa URL Git con token y no contiene diagnóstico de seis booleanos. Último schedule observado `42842855127` (2026-11-10 15:17:48 UTC) precede al diagnóstico. Identidad real/least privilege backup, restore remoto aislado, provisioning, simulacro, alertas, RPO/RTO y $0 sin verificar. No dispatch manual ni acceso a secretos/age.

**PRs:** #303 OPEN/Draft (11 workflows, 17 checks SUCCESS; restore schema fixture/script portados a #287); #302 OPEN/Draft (10 workflows, 14 checks SUCCESS; helper + HTTP test idénticos en #287, workflow/test difieren); #301 OPEN/no Draft (15 checks SUCCESS, review incompleta por límite Codex). Hallazgo #301: MAX_BRANCHES=100 sin cursor/paginación, posible truncamiento.

**Siguiente tarea:** auditoría read-only de aislamiento tenant/branch/role, migraciones 0017–0023, checkout/ledger y runner restore. No nueva lógica comercial hasta Seguridad Nivel 1. No modificar Neon main, roles/grants remotos, datos reales, secretos, Cloudflare/DNS sensible, deploy manual, Cron ni billing. Fecha MVP 2026-12-01; GO/NO-GO 2026-11-30.


## Checkpoint accionable — 2026-11-11 14:49 UTC

**Código revisado:** PR #287, SHA `b7079224e3469900170994a2dacdd889b342c171`, OPEN/Draft; main c537356; merge base 0344295; 496 ahead / 1 behind; 113 archivos. Esta actualización documental generará un nuevo tip; leer el HEAD vivo al reanudar.

**Validación exact-HEAD:** 11 PR workflows: 8 SUCCESS / 3 FAILURE; 2 push workflows SUCCESS; 16 checks: 12 SUCCESS / 4 FAILURE; 0 legacy status contexts; 0 reviews/threads. Migration validation SUCCESS, incluyendo 0021 runtime read-only inmediato, intento UPDATE con LOGIN runtime rechazado y assertions de 0022. Playwright y security/doc checks SUCCESS. CI, migration runner y restore smoke fallaron antes de tests por DNS de Ubuntu apt mirrors. No afirmar green.

**Cambio de seguridad:** 0021 ya no concede UPDATE al runtime sobre bcv_sync_state; runtime SELECT-only. 0021 assertions y prueba real LOGIN ejecutadas inmediatamente; 0022 rollback fixture distingue PUBLIC ACL intencional de grants directos. Migration validation exact SHA SUCCESS. Worker BCV aislado; Cron deshabilitado. ODD AC1–4/7 completos; AC5/6 pendientes.

**Siguiente prioridad:** reintentar jobs apt-dependientes solo cuando DNS de GitHub Actions recupere. Después terminar auditoría tenant/branch/role, 0017–0023, checkout/ledger y runner restore. Mantener dos frentes: BCV security boundary y backup principal/recuperación.

**Bloqueos:** #53 OPEN/P0; identidad backup y least privilege reales, backup natural posterior a integración, restore remoto aislado, provisioning, simulacro, alertas, RPO/RTO, coste $0 pendientes. Backup diagnostic has_membership solo detecta una dirección. #301 branch-list cap 100 sin cursor. Checkout payment contract no aprobado y precisión VES vs NUMERIC(14,4) no alineada.

No merge/rebase/force-push; no Neon main, roles/grants remotos, datos reales, secretos/age, deploy, Cron, Cloudflare/DNS sensible, billing o restore remoto. MVP 2026-12-01; GO/NO-GO 2026-11-30.


## Checkpoint vigente — 2026-11-11 (código 373dbc1)

- #287 OPEN/Draft; código `373dbc177fc6d9876112eb57cedc21db8dd31dd7`; main `c5373564413ba086690552c6b7deeab08d7b4a89`; 499 ahead / 1 behind; mergeable=true. No sync/rebase.
- Exact SHA: 11 PR workflows 8 SUCCESS / 3 IN_PROGRESS; 2 push SUCCESS; 16 checks 12 SUCCESS / 4 IN_PROGRESS / 0 FAILURE. Pendientes: CI `43044532860`, runner `43044532931`, restore `43044532854` (dos perfiles), todos en apt install. Migration validation `43044533159` SUCCESS; nueva prueba membership bidirectional SUCCESS; Playwright SUCCESS.
- Backup natural `43041961402` falló en main por DNS durante instalación de age, antes de conexión/dump. Sin artefacto ni diagnóstico; no re-run manual.
- Diagnóstico backup ahora detecta ambos sentidos de `pg_auth_members`; test PostgreSQL desechable pasó. #301 15/15 + 10/10, sin review, MAX_BRANCHES 100 sin cursor documentado; #302 14/14 Draft; #303 17/17 Draft; #53 OPEN/P0.
- Próximo: cerrar workflows pendientes exact-HEAD y continuar auditoría de seguridad/recuperación. No operaciones comerciales nuevas hasta cerrar Seguridad Nivel 1. Producción NOT READY. MVP 01/12/2026; GO/NO-GO 30/11/2026.


## Checkpoint vigente — 2026-11-11 (código 5389425)

- #287 OPEN/Draft, HEAD `53894254c26838dd56f5a39764fedf4cf1d64067`; main `c5373564413ba086690552c6b7deeab08d7b4a89`; 503 ahead / 1 behind, 114 archivos, mergeable=true. No sync/rebase/merge.
- Exact SHA: 16 checks, 12 SUCCESS / 4 IN_PROGRESS / 0 FAILURE. CI `43047172608`, migration runner `43047173013`, restore smoke `43047172753` (dos perfiles) siguen en apt install; no afirmar que las pruebas posteriores corrieron. Migration validation `43047173060` SUCCESS, Playwright `43047172725` SUCCESS.
- Migration validation demuestra 0021 runtime SELECT-only, rechazo de UPDATE por LOGIN real, limpieza de ACL de columna REFERENCES para runtime/producer/PUBLIC, rollback 0022 y contrato final de grants. Prueba de membresías backup bidireccional también SUCCESS.
- Backup natural `43041961402` (11/11, main) FAILURE durante instalación de age por DNS; no conexión, dump, cifrado, upload ni artefacto. Último backup SUCCESS `42842855127` (10/11). No re-run/dispatch manual.
- Próximo: revisar finalización/logs de los cuatro checks pendientes del SHA actual; luego continuar auditoría de recuperación y aislamiento tenant/branch/role. Máximo dos frentes.
- #53 OPEN/P0; producción NOT READY. No Neon main, datos reales, secretos/age, grants remotos, deploy, Cron, Cloudflare/DNS sensible, billing, restore remoto, force-push ni rebase/sync automático. MVP 01/12/2026; GO/NO-GO 30/11/2026.


## Actualización de evidencia — 2026-11-11, SHA `8fdc2e668bf3995d3c202b3023c59bc83ab9e0da`

- Reconsulta final exact-HEAD: 16 check-runs = 12 SUCCESS / 4 FAILURE; ya no hay pendientes. PR #287 continúa OPEN/Draft, mergeable=true; sin reviews ni review threads. No merge ni rebase.
- Las cuatro fallas son de infraestructura en la instalación de dependencias, no fallos de assertions: CI `43048869588` job `130620377176` y PostgreSQL migration runner `43048869251` job `130620375849` fallaron instalando `postgresql-client`; backup restore smoke `43048869891` jobs `130620211411` y `130620211753` fallaron instalando `age`/PostgreSQL 18 client. Los logs muestran `Temporary failure resolving` para `azure.archive.ubuntu.com`, `archive.ubuntu.com` y `security.ubuntu.com`, terminando apt con exit code 100.
- Por lo anterior, en CI y migration-runner no se ejecutaron pasos posteriores a la instalación; en ambos perfiles de restore no se ejecutó la restauración ni los guards posteriores. No describir esos suites como pasados. No hay evidencia de un fallo de lógica de aplicación en estos cuatro jobs.
- En el mismo SHA, Database migration validation `43048869994` SUCCESS; Secret history `43048870732` SUCCESS; ODD/docs `43048869895` SUCCESS; Security `43048869156` SUCCESS; Dependency review `43048869639` SUCCESS; dashboard `43048869221` SUCCESS; Semgrep `43048869247` SUCCESS; Playwright `43048869269` SUCCESS.
- Próximo trabajo prioritario: resolver la fragilidad de dependencias apt en CI con estrategia reproducible, pinning y verificación de procedencia (p.ej. imágenes/containers con herramientas ya instaladas o setup action confiable y versionada), sin saltarse tests ni descargar binarios sin validar. Luego reejecutar los jobs afectados en un nuevo SHA y verificar todos los pasos reales. Mantener #287 Draft hasta cierre integral.
- Issue #53 sigue OPEN/P0. Producción NOT READY. No Neon main, secretos, roles/grants remotos, deploy, restore real, Cron, billing, force-push ni rebase/sync automático. MVP 01/12/2026; GO/NO-GO 30/11/2026.


## Checkpoint — Turno 16 / PR \`#318\`

Rama: \`security/issue-53-neon-role-matrix-20261112\`.
Main base verificada: \`a0d6d801128b3e3aa6543796436abf348c645e8f\`.
Sincronización: commit merge de dos padres, sin force-push; la rama quedó 0 detrás de main.
Cambios de seguridad: provisioning concede SELECT-only en secuencias (sin USAGE/UPDATE); auditoría extendida a rutinas, tablas/vistas, ownership y default ACLs; test ejecuta provisioning + auditoría por LOGIN real sintético y prueba dump custom + restore cifrado en el harness.
Evidencia: PostgreSQL 18 efímero, perfil legado pasó en SHA \`071b7c599f602034b7b5b353573cc65e6b8ddadf\`. CI global exact-SHA aún debe completarse para el HEAD final de este checkpoint.
No tocar Neon, no secrets, no deploy manual, USD 0. Mantener #318 Draft hasta todos los checks y revisión completa; \`PRODUCTION: NOT READY\`.


## Checkpoint — Turno 16 completado en código; runbook pendiente

PR #318 squash-merged. Merge commit / main SHA: 3ac66a180fcf23421b546140a419a45062e633dd.
Pre-merge exact HEAD 1b27478fc1fe4a0584b8d5622e6c48acc87a6a95: 15/15 workflows SUCCESS y 19/19 check-runs SUCCESS.
Post-merge CI de main se inició; verificar su cierre exact-SHA en 3ac66a180fcf23421b546140a419a45062e633dd.
Siguiente paso: PR #319 para docs/NEON_LEAST_PRIVILEGE_AUDIT_RUNBOOK.md, instrucciones operator-run. No conectar ni mutar Neon. Issue #53 OPEN/P0; PRODUCTION: NOT READY; USD 0.


Post-merge CI de main SHA 3ac66a180fcf23421b546140a419a45062e633dd terminó SUCCESS: 11/11 workflows y 13/13 check-runs.
