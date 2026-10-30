# Checkpoint vigente — resolver de turno abierto del cajero — 2026-10-30 UTC

**Repositorio:** BTF14/Micro-app  
**Main base:** `e4e4a5f312522ec5efbcc3252958141f56fbd821`  
**Rama:** `feat/authenticated-cashier-open-shift-20261030`  
**PR:** [#169](https://github.com/BTF14/Micro-app/pull/169), abierta.  
**HEAD inicial:** `69ef099d586070edf295e0302468e96c4667f11f`.

## Inspección completada (solo lectura)

- Revalidado repo, main, PR #166–#168, PRs abiertas/cerradas, issues abiertos y commits recientes.
- Código inspeccionado: `index.ts`, `auth.ts`, `google-auth.ts`, `tenant-context.ts`, `branch-context.ts`, `database.ts`, migraciones 0001–0004, tests de branch/register shifts y workflow CI.
- `resolveTenantContext` verifica sesión y membresía activa; `resolveBranchContext` revalida usuario/organización/rol/sucursal/asignación. Ninguno concede autorización comercial.
- `register_shifts` tiene FKs compuestas, índices parciales de unicidad por caja y cajero/organización, triggers de apertura/lifecycle y protección de revocación/desactivación.
- PR #169 abierta; issues abiertos relevantes: #53 y #78; no se modificaron.
- Checks en merge SHA e4e4a5f: runs/status vacíos; no se afirma CI post-merge.
- SHA de implementación/test PR #169 `253128c6f5213986879ce619da85285251c07416`: 8/8 workflow runs Actions y 14 check-runs consultados completed/success. CI confirma build/typecheck, unit tests, auth 18/18, branch 4/4, register-shifts 5/5 y cashier-open-shift integration 7/7 en PostgreSQL 18. Después se añadió un checkpoint documental; revalidar checks en el HEAD actual.
- Codex review falló por cuota. Reviews formales: 0; threads inline: 0. Diff inspeccionado manualmente; no es aprobación externa.
- Cloudflare generó previews Pages/Workers para HEAD final 253128c; no son producción.
- Documentos canónicos DATABASE_SCHEMA y SCHEMA_REVIEW tenían encabezados con SHA 1d10... anterior a #167; se actualizarán a e4e4a5f.

## Decisión de diseño

- Implementar helper aislado que recibe un BranchContext producido por `resolveBranchContext` después de `resolveTenantContext`.
- Rechazar cualquier rol distinto de cashier antes de consultar DB.
- En una sola consulta, filtrar por organization_id, branch_id y cashier_user_id; exigir turno abierto y revalidar organización/sucursal/caja/usuario/membresía/rol/asignación activos.
- Devolver `null` si no hay turno o el scope dejó de ser válido.
- Seleccionar datos de turno y usar `FOR SHARE OF s`; el helper no abre transacción. Los futuros callers comerciales deben invocarlo con el mismo transaction client de la operación.
- No calcular efectivo esperado ni diferencias; no permitir impersonation, supervisor override ni autorización comercial.

## Cambios preparados en la rama

- `apps/api/src/cashier-open-shift.ts`: helper aislado.
- `apps/api/src/cashier-open-shift.test.ts`: pruebas unitarias.
- `apps/api/src/cashier-open-shift.integration.test.ts`: PostgreSQL desechable con guard estricto localhost/microapp_test/microapp.
- `.github/workflows/ci.yml`: nuevo paso de integración PG18.
- CURRENT_STATE, HANDOFF, WORK_CHECKPOINT, PROJECT_PLAN y STATE_JOURNAL: continuidad incremental; DATABASE_SCHEMA/SCHEMA_REVIEW: encabezados reconciliados.

## Estado de pruebas

El SHA de implementación/test `253128c6f5213986879ce619da85285251c07416` pasó 8/8 workflows Actions y los check-runs consultados; el job CI confirmó las 7 pruebas de integración nuevas en PostgreSQL 18, además de build/typecheck y suites existentes. Se añadieron después commits exclusivamente documentales; consultar y exigir el resultado del HEAD exacto actual de la PR antes de merge. No se ejecutó shell local ni SQL remoto. La suite de integración exige el URL local sintético exacto de CI y no permite apuntar a Neon.

## Próxima acción

Revalidar HEAD de PR #169, esperar workflows completos, revisar logs y corregir cualquier fallo en la misma PR. No fusionar hasta todos los gates en verde.

# Checkpoint de trabajo vigente — PR de políticas comerciales por organización (2026-10-30 UTC)

**Rama:** `docs/org-policy-architecture-20261030`  
**Base:** `4ab229296d8858c8c553e00a633a762b9c26a81b`  
**Alcance:** documentación de arquitectura; no código, esquema, migraciones ni infraestructura.

- Diseño nuevo: `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`.
- Alineación de `docs/sdd/role-permission-decision-matrix.md` y `docs/SAAS_ARCHITECTURE_DECISIONS.md`.
- Cada organización controla su propia política comercial; no hay porcentajes/umbrales universales de descuento.
- La matriz de roles sigue NO APROBADA; ninguna autorización comercial se implementa en esta PR.
- No se tocó Neon main, producción, secretos, DNS, billing ni datos reales.
- No hay pruebas runtime aplicables al cambio documental; falta revisión completa del diff y verificación de checks del HEAD exacto tras abrir PR.
- PR abierta: [#163](https://github.com/BTF14/Micro-app/pull/163). Revisión manual de los ocho archivos completada; no se detectó contradicción pendiente sobre descuentos universales. En HEAD `531296af195ff17988a4ff9fc0ce65b242d7e194`, los ocho workflows devueltos por GitHub terminaron `success` (CI, Chromium, postgres-migration, Semgrep, Trivy, secret-history, Dependency Review y project progress). Este checkpoint cambia el HEAD: revalidar workflows sobre el HEAD final antes de merge. Codex no se ejecutó; revisión manual fallback. No hay reviews humanas ni threads inline.

---

# Checkpoint de trabajo vigente — Micro app

**Actualizado:** 2026-10-30 UTC  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Último main verificado antes de este checkpoint:** `c7abcb477afd649161176aad8cae707f5e42f632`  
**PR #160:** fusionada; merge `be6f19486caf5cf3605c6ca6615f87e305822ea7`  
**PR #161:** fusionada; merge `c7abcb477afd649161176aad8cae707f5e42f632`  
**Este archivo:** punto de reanudación post-PR #161. Revalidar main en vivo; el checkpoint commit de esta actualización cambiará el HEAD.

## Bloque completado

- PR #160 fusionada: nueve archivos documentales, 12 check runs success en su HEAD probado `fcb4269a459831be7858358c56e90346d5e4e9a6`.
- PR #161 fusionada: cinco archivos documentales, 12 check runs success en su HEAD probado `a17a4b95312876f0bf4b201c6a84a323fb69fa3b`.
- Merge commit #161 y main antes de esta actualización: `c7abcb477afd649161176aad8cae707f5e42f632`.
- Codex review no se completó por cuota en ambas PR; revisión manual fallback completada, sin hallazgos materiales pendientes. No hubo reviews humanas ni threads inline.
- Cloudflare Pages/Workers previews completados correctamente; no se verificó despliegue productivo post-merge.
- Branch protection no se pudo revalidar: HTTP 403 `Resource not accessible by integration`. La lectura del 26 oct se conserva como histórica.
- No se modificaron código, migraciones, workflows, secretos, Neon, DNS, billing ni producción.

## Estado de arquitectura verificado

- API Hono registra auth y health; no hay handlers HTTP comerciales.
- `resolveTenantContext` valida sesión, usuario, organización y membresía activa; no aplica permisos por operación ni sucursal y no está conectado a handlers comerciales.
- `withDatabaseTransaction` existe; el caller transaccional productivo observado es el bootstrap Google. No hay operaciones comerciales que demuestren atomicidad.
- `auth_rate_limits` existe en DDL, pero no hay caller/runtime rate limiter.
- El esquema inicial mantiene stock a nivel organización y no incluye sucursales, almacenes, cajas o turnos.
- Brechas previas a ventas/inventario: reconciliación venta/líneas/pagos, saldo stock vs ledger, referencia polimórfica de movimientos, idempotencia de pagos, último owner y auditoría append-only.
- La matriz de permisos por rol sigue NO aprobada. No implementar permisos comerciales hasta aprobación explícita.
- `feat/neon-transaction-adapter` corresponde a PR #1 ya fusionada; rama 14 ahead/245 behind. No reabrir ni fusionar.

## Próxima secuencia exacta

1. Revalidar main y PRs abiertas; confirmar este checkpoint post-PR #161.
2. Preparar propuesta técnica consolidada para organización→sucursal→almacén/caja/turno y reconciliarla con SAAS_ARCHITECTURE_DECISIONS.
3. Presentar la matriz de permisos al propietario para aprobación explícita; no convertir recomendaciones de IA en política.
4. Diseñar autorización server-side por operación y scope de sucursal.
5. Diseñar rate limiting distribuido compatible con Workers y confirmar opciones sin coste.
6. Diseñar pruebas PostgreSQL efímeras de aislamiento cross-tenant/cross-branch, idempotencia, concurrencia y rollback.
7. Implementar solo después de aprobar contratos; una PR coherente con código, tests y documentación.

## Restricciones

- No ejecutar SQL ni migraciones en Neon main.
- No desplegar producción ni cambiar secretos, DNS, billing o planes de pago.
- No prometer capacidad SaaS sin pruebas sintéticas.
- Guardar checkpoints dentro de cada PR de trabajo después de cada bloque significativo, no al final de la sesión.


## Checkpoint incremental — 2026-10-30 UTC — branch scope

- Base verificada: main `ce8b0e491fe8b9f6154380cc8b0eea0a19fe8114`; #164 fusionada; no PR abiertas al inicio.
- Rama de trabajo: `feat/branch-scope-context-20261030`. PR/checks: consultar estado vivo.
- Decisión autorizada: owner/admin organización-wide; cashier/inventory requieren asignación activa a sucursal. No se aprobó matriz de permisos comerciales sensibles.
- Archivos añadidos: migración 0003, assertions PostgreSQL cross-tenant, helper `resolveBranchContext`, tests unitarios, extensión de workflow migration-check y SDD `BRANCH_SCOPE_CONTEXT_IMPLEMENTATION.md`.
- No se modificó el tenant resolver existente, no se conectó el nuevo helper a rutas, no hay handlers comerciales y no se creó modelo de caja/turnos/almacenes ni migración de stock legacy.
- HEAD de implementación `c3ae1192f0841090ee1b3dea71ed803f1d3c1d8b` verificado: build/typecheck, unit tests, 18 auth integration tests, 3 branch context PostgreSQL integration tests, migración 0003 + assertions, Playwright, Semgrep, Trivy, secret-history, dependency review, backup smoke, Cloudflare Pages/Workers previews: todos success. Primera ejecución de branch integration falló únicamente en cleanup de branch de tenant B; cleanup corregido y segunda ejecución 3/3 pasó sin warning de queries concurrentes. Codex review no concluyó por cuota; no hay reviews humanas ni inline threads; revisión manual del diff realizada. La sincronización documental posterior dispara una nueva ejecución: revalidar SHA final antes de merge.
- No tocar Neon main, datos reales, secretos, Cloudflare settings, DNS, billing ni producción. No afirmar despliegue.

- Validación ampliada en la misma PR: CI aplica 0003 al PostgreSQL efímero y ejecuta `branch-context.integration.test.ts` con casos owner/admin, cashier/inventory asignado/no asignado, sucursal inactiva y selector cross-tenant. El workflow de migración ejecuta también assertions SQL.
- PR #165 abierta; revalidar HEAD y checks después de cualquier commit adicional.

- Hardening antes del merge: `resolveBranchContext` vuelve a comprobar organization/app_user/organization_members activos y que el rol actual en DB coincida con el TenantContext; pruebas de integración añadidas para membresía revocada y rol cambiado. HEAD nuevo invalida la evidencia CI del SHA previo; esperar y verificar todos los checks del HEAD final.
