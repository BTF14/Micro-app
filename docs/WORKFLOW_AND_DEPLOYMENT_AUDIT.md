# Auditoría de workflows y despliegues — 2026-10-30 UTC

**Base auditada:** `1ee1808af4aae484a71dc24750237ff4f4d934a0` en `main`.  
**Alcance:** lectura estática de los 15 YAML en `.github/workflows/`, configuración versionada de Wrangler y metadatos de GitHub. No se accedió al panel de Cloudflare ni a secretos.

## Estado Git confirmado

- PR [#157](https://github.com/BTF14/Micro-app/pull/157) está cerrada y fusionada; merge SHA `1ee1808af4aae484a71dc24750237ff4f4d934a0`.
- HEAD de PR #157: `6eb464c950f195ec67350977575aef77e9790e1d`. La consulta del conector devolvió ocho runs asociados a ese HEAD y los ocho terminaron `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Secret history scan, Project progress dashboard y Dependency review. La consulta devuelve solo la primera página; no usarla como prueba de que no existieron otros checks.
- El combined status consultado para el HEAD y para el merge SHA devolvió una lista vacía. El helper de runs por commit filtra ejecuciones disparadas por pull request y no devolvió runs para el merge SHA. Por tanto, no se afirma CI post-merge.
- Antes de abrir esta PR documental, la página de PRs no mostró PRs abiertas. Tras crearla, [PR #158](https://github.com/BTF14/Micro-app/pull/158) es la PR de trabajo abierta y en borrador.

## Inventario de workflows

| Workflow | Disparadores versionados | Observación |
|---|---|---|
| `ci.yml` | push, pull_request | build/typecheck, tests, PostgreSQL efímero y validaciones |
| `migration-check.yml` | push, pull_request | migraciones y assertions en PostgreSQL efímero |
| `playwright-e2e.yml` | push, pull_request, workflow_dispatch | pruebas de navegador |
| `project-progress.yml` | push, pull_request | genera y publica artefacto |
| `sdd-docs-validation.yml` | push, pull_request | valida documentación SDD |
| `secret-history-scan.yml` | push, pull_request, workflow_dispatch | escaneo del historial completo |
| `security-scan.yml` | push, pull_request | Trivy |
| `semgrep.yml` | push, pull_request, workflow_dispatch | análisis estático |
| `dependency-review.yml` | pull_request | revisión de dependencias |
| `autoskills-preview.yml` | pull_request, workflow_dispatch | dry-run; no instala skills en el repo |
| `daily-dependency-watch.yml` | schedule, workflow_dispatch, pull_request | informe/audit de dependencias; solo lectura |
| `backup.yml` | schedule, workflow_dispatch | backup cifrado y retención; escribe al repositorio remoto de backups |
| `backup-restore-smoke.yml` | schedule, workflow_dispatch, pull_request | restore sintético aislado |
| `backup-real-restore.yml` | workflow_dispatch | lee el backup remoto y restaura en PostgreSQL efímero; requiere credenciales protegidas |
| `regenerate-lockfile.yml` | workflow_dispatch | tiene permiso `contents: write`; hace commit/push únicamente a ramas `chore/dependency-update-*` |

## Hallazgos y riesgos

1. Los siete workflows (`ci`, `migration-check`, `playwright-e2e`, `project-progress`, `secret-history-scan`, `security-scan` y `semgrep`) escuchan tanto `push` como `pull_request` sin filtros `branches` ni `paths`. `sdd-docs-validation` también escucha ambos eventos, pero está limitado a `main` y a paths documentales concretos. Un commit a una rama que ya tiene PR puede ejecutar los mismos validadores por ambos eventos. Esto duplica consumo/tiempo y artefactos sin añadir cobertura proporcional.
2. `daily-dependency-watch.yml` también se ejecuta en cada PR, además de su programación y ejecución manual. Es informativo y no modifica dependencias; no parece necesario como check de cada PR.
3. No hay workflow de GitHub Actions que ejecute `wrangler deploy` o publique Cloudflare Pages. La configuración de Wrangler declara `micro-app-api`, frontend origin y callback en `workers.dev`; no declara `routes` ni `custom_domain`.
4. Los builds de Pages/Workers observados en PRs/merges en el historial son compatibles con una integración Git de Cloudflare externa a GitHub Actions. No se puede verificar desde el repositorio qué ramas están conectadas, qué eventos despliegan, los build settings, ni el estado final de Pages.
5. Por lo anterior, no asumir que un merge documental es inocuo para producción: un push a `main` puede activar el despliegue configurado en Cloudflare aunque no exista un workflow de deploy en este repositorio. Merge y autorización de producción siguen siendo decisiones separadas.
6. El Worker declara el endpoint `workers.dev`; al no existir route/custom domain en `wrangler.toml`, no asumir que reglas WAF de una zona protegen este hostname.
7. El workflow de regeneración de lockfile es una operación de escritura manual. No ejecutarlo sin rama objetivo válida, diff esperado y autorización. El backup real-restoration también es manual y usa credenciales protegidas; no se ejecutó durante esta auditoría.

## Recomendaciones priorizadas

- **P0 — mantener el gate:** no fusionar a `main` cambios que puedan activar despliegues de producción sin autorización explícita y verificación de Cloudflare.
- **P1 — reducir duplicación:** en una PR futura, evaluar limitar los eventos `push` de workflows que ya validan `pull_request` a `main`, manteniendo todos los checks requeridos en PR. Antes, inspeccionar branch protection/rulesets para no romper contexts requeridos.
- **P1 — no aplicar filtros de paths a ciegas:** definir primero el mapa de dependencias del monorepo. Un filtro incorrecto puede dejar checks requeridos en estado pendiente o saltarse validaciones necesarias.
- **P1 — separar monitor de dependencias:** evaluar quitar el evento `pull_request` del informe diario y conservar schedule + workflow_dispatch; Dependency Review ya cubre el análisis de cambios de dependencias en PR.
- **P1 — Cloudflare:** obtener acceso de solo lectura al panel para documentar Git integration, ramas de producción/preview, Pages root/build command, Worker deploy branch, últimos deployments y cuotas. No cambiar settings en esta auditoría.
- **P2 — protección de API:** verificar en Cloudflare si hay rate limiting efectivo para el hostname `workers.dev`; el código no implementa rate limiting runtime. Diseñar control distribuido en la aplicación antes de ampliar OAuth/bootstrap.
- **P2 — dominio de producción:** evaluar dominio propio y ruta/custom domain del Worker como trabajo de arquitectura separado; no configurar ni comprar ahora.

## Límites de esta auditoría

Solo lectura. No se ejecutaron workflows manuales, no se crearon recursos, no se modificaron archivos de código, workflows, secretos, Cloudflare, Neon, datos ni producción. No se desplegó nada. Objetivo de coste USD 0.
