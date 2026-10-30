# Checkpoint vigente — diseño ERD multi-sucursal (2026-10-30 UTC)

**Rama:** docs/multibranch-erd-architecture-20261030  
**Base:** 894895cfeee1c3d67b1e92bf1fae7d0c30cd36f9 (merge verificado PR #163)  
**Alcance:** diseño documental; no código, migración, SQL ni infraestructura.

## Bloque previo completado: PR #163
- Merge commit: 894895cfeee1c3d67b1e92bf1fae7d0c30cd36f9.
- HEAD probado: 4b9a2b3993115b798ae4a78e3e0318dbdf50c24e.
- Ocho workflows success: CI, Playwright Chromium, postgres migration, Semgrep, Trivy, secret history, dependency review y project progress.
- Diff manual revisado; 8 archivos documentales; no reviews humanas ni threads inline; Codex no disponible/no ejecutado.
- No se tocó producción, Neon, Cloudflare settings, secretos, datos, DNS ni billing.

## Bloque actual
- Nuevo diseño: docs/sdd/MULTI_BRANCH_DATA_MODEL.md.
- Contrasta DDL real apps/api/migrations/0001_initial.sql con el objetivo organización→sucursal→almacén/caja/turno.
- Documenta membresía vs asignación de sucursal, FKs tenant-scoped, stock balance+ledger, transferencias, caja/turnos, integridad venta/pagos, idempotencia, último owner y auditoría.
- La matriz de permisos continúa NO APROBADA. Diseño no autoriza implementación.
- No se ejecutaron pruebas runtime porque no hay código/SQL nuevo; los criterios de aceptación quedan especificados para la fase de implementación.
- PR abierta: [#164](https://github.com/BTF14/Micro-app/pull/164). Revisión manual del diff documental de 9 archivos completada; no se detectaron hallazgos materiales pendientes.
- Se iniciaron los 8 workflows requeridos para la PR; los resultados de cualquier SHA anterior no se reutilizan. Verificar todos los workflows sobre el HEAD vivo de la PR inmediatamente antes de merge.
- No hay reviews humanas ni threads inline; Codex no se ejecutó. No fusionar hasta que todos los checks requeridos del SHA exacto finalicen correctamente.

---

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
