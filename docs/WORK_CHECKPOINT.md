# Checkpoint de trabajo vigente — Micro app

**Actualizado:** 2026-10-30 UTC  
**Repositorio:** https://github.com/BTF14/Micro-app  
**main verificado:** `be6f19486caf5cf3605c6ca6615f87e305822ea7`  
**PR #160:** fusionada por squash; [ver PR](https://github.com/BTF14/Micro-app/pull/160)  
**HEAD de PR probado:** `fcb4269a459831be7858358c56e90346d5e4e9a6`

> Punto de reanudación post-merge. Revalidar GitHub en vivo antes de actuar.

## Bloque completado

- PR #160 fusionada el 2026-10-30 04:36:49 UTC. Merge SHA `be6f19486caf5cf3605c6ca6615f87e305822ea7`; GitHub confirma `main` en ese SHA.
- La PR integró nueve archivos documentales: README, política de colaboración, capacidad, estado, handoff, plan, roadmap de seguridad, diario y checkpoint.
- Los 12 check runs del HEAD de PR `fcb4269a459831be7858358c56e90346d5e4e9a6` terminaron en `success`: verify, Chromium authentication smoke, postgres-migration, Semgrep SAST, Trivy, secret-history, dependency review, progress dashboard, Cloudflare Pages y Workers Builds (incluidos contextos push/PR duplicados).
- No hay ejecución post-merge confirmada para el squash SHA; no reutilizar los checks del HEAD PR como prueba de un run separado post-merge.
- Codex review falló por cuota agotada en `ce4578fed5980631f59206bd45ced3fbefcce346`. Se aplicó revisión manual fallback; diff documental y sin hallazgos materiales pendientes. No hay reviews humanas ni threads inline.
- Cloudflare Pages y Workers previews del HEAD PR terminaron success. No se obtuvo evidencia de despliegue productivo post-merge.
- La consulta actual de branch protection devolvió HTTP 403 `Resource not accessible by integration`; la configuración leída el 26 oct queda como evidencia histórica, no como estado actual.
- No se modificaron código, migraciones, workflows, secretos, Neon, DNS, billing ni producción.

## Estado de arquitectura verificado

- API Hono registra autenticación y `GET /health`; no hay handlers HTTP comerciales.
- `resolveTenantContext` valida sesión, usuario, organización y membresía activa; no aplica permisos por operación ni sucursal y no está conectado a handlers comerciales.
- `withDatabaseTransaction` existe; el caller transaccional productivo observado es el bootstrap Google. No hay operaciones comerciales que demuestren atomicidad.
- `auth_rate_limits` existe en el DDL, pero no hay caller/runtime rate limiter.
- `0001_initial.sql` modela stock a nivel organización; no incluye sucursales, almacenes, cajas o turnos.
- Brechas antes de ventas/inventario: reconciliación de venta/líneas/pagos, saldo stock vs ledger, referencia polimórfica de movimientos, idempotencia de pagos, último owner y auditoría append-only.
- La matriz de permisos por rol sigue NO aprobada. No implementar permisos comerciales hasta que el propietario la apruebe.
- La rama `feat/neon-transaction-adapter` corresponde a PR #1 ya fusionada; está 14 commits ahead/245 behind de main. No reabrir ni fusionar.

## Próxima secuencia exacta

1. Revalidar main y PRs abiertos; confirmar que el checkpoint post-merge quedó integrado.
2. Preparar una propuesta técnica consolidada para organización→sucursal→almacén/caja/turno y reconciliarla con SAAS_ARCHITECTURE_DECISIONS.
3. Presentar la matriz de permisos al propietario para aprobación explícita; no convertir recomendaciones de IA en política.
4. Diseñar autorización server-side por operación y scope de sucursal.
5. Diseñar rate limiting distribuido compatible con Workers y confirmar primero límites/controles Cloudflare disponibles sin coste.
6. Diseñar pruebas PostgreSQL efímeras de aislamiento cross-tenant/cross-branch, idempotencia, concurrencia y rollback.
7. Solo después, implementar rutas/migraciones en PR coherente y nunca experimentar contra Neon main.

## Restricciones

- No ejecutar SQL ni migraciones en Neon main sin superar el gate de CONSTITUTION.
- No desplegar producción ni cambiar secretos, DNS, billing o planes de pago.
- No prometer capacidad SaaS sin pruebas sintéticas.
- Guardar checkpoints después de cada bloque significativo, no esperar al cierre del chat.
