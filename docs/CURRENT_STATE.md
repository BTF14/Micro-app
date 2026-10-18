# Estado vigente verificado — Micro app

**Verificado:** 2026-10-18 (consulta directa a GitHub API y archivos de `main`).  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Propósito:** referencia breve de estado vivo. Este archivo prevalece sobre snapshots históricos de `PROJECT_PLAN.md`, `STATE_JOURNAL.md` y `HANDOFF_NEXT_CHAT.md` cuando sus SHA/estados contradigan los datos aquí. Antes de cada cambio, repetir la consulta en vivo.

## Estado Git y CI

- `main`: `1e48eb9b2056a0d472f69a7cd62c1b3930d27c13` — [commit](https://github.com/BTF14/Micro-app/commit/1e48eb9b2056a0d472f69a7cd62c1b3930d27c13).
- PR abiertas: ninguna en la consulta de GitHub.
- Para ese SHA exacto, los seis workflows más recientes consultados terminaron en `success`:
  - [CI](https://github.com/BTF14/Micro-app/actions/runs/39131400317)
  - [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39131400310)
  - [Validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39131400321)
  - [Panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39131400327)
  - [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39131400368)
  - [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39131400390)
- La rama `main` no tiene protección activa ni checks obligatorios configurados (`protected=false`). Es un riesgo de gobernanza pendiente; no se ha cambiado la configuración.
- Estos workflows verdes no demuestran que el producto esté listo para producción.

## Bloqueos y siguientes prioridades

1. **P0 identidad:** revisión estática de `apps/api/src/auth.ts` en el `main` indicado encontró solo `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no encontró Google OAuth, allowlist ni verificación de email. Las decisiones D1–D8 en `docs/sdd/auth-policy-decision-record.md` continúan expresamente sin aprobar. No inventar correos/dominios, bootstrap de administrador, política de organizaciones ni vinculación de cuentas. No activar OAuth ni enviar correos sin resolver las decisiones y configurar los secretos de forma segura.
2. **Adaptador Neon:** `feat/neon-transaction-adapter` (`7989a84e39536029819735a5202f3934a8eb12c3`) está divergida respecto a este `main`: 14 commits por delante, 43 por detrás; el merge-base es `2d2099245f2404b0a8d3689189235a577d5e632c`. El diff resumido enumera siete archivos: workflow de seguridad, paquete API, pruebas y adaptador de base de datos, integración API y dos documentos de seguridad/cumplimiento. No fusionar a ciegas; hacer revisión archivo por archivo y rescatar cambios por separado.
3. Ampliar pruebas de identidad, sesiones, autorización y aislamiento entre tenants con PostgreSQL efímero; no confundir E2E con API simulada con integración real.
4. Verificar automatización de backups y restauración real independiente; no se ha demostrado que estén operativas.
5. Seguir el checklist `docs/PRODUCTION_READINESS.md`; la app aún no está lista para despliegue comercial.

## Límites operativos

- Mantener coste objetivo $0 y separación absoluta de Cantina-pos.
- No exponer secretos ni enviar correos.
- No hacer despliegue de producción sin aprobación explícita.
- Para Neon `main`, seguir el gate de cambio de producción de `docs/CONSTITUTION.md`; probar primero en entorno aislado y no ejecutar cambios destructivos/ambiguos sin aprobación.
- Strix está documentado, pero no instalado ni ejecutado; solo evaluar en laboratorio aislado con datos sintéticos y coste confirmado $0.
- No declarar pruebas locales, instalaciones, agentes o ejecuciones autónomas como hechos si no existe evidencia.

## Protocolo de actualización

Después de cada cambio significativo, actualizar este archivo y el diario/handoff pertinentes; registrar el SHA y enlaces de Actions para ese SHA exacto. Si `main` avanza, actualizar primero este checkpoint en lugar de copiar estados antiguos.


## Revisión preliminar de `feat/neon-transaction-adapter` (2026-10-18)

Se compararon los siete archivos enumerados por GitHub al contrastar la rama con el `main` actual. Hallazgos verificables:

- `.github/workflows/security-scan.yml`, `apps/api/src/database.ts` y `apps/api/src/database.test.ts` tienen el mismo blob SHA en la rama y en `main`; no aportan diferencias actuales.
- `apps/api/package.json` difiere: la rama usa `vitest run`, mientras que `main` excluye los archivos `*.integration.test.ts` del comando unitario. No restaurar el script antiguo sin revisar cómo CI ejecuta las pruebas de integración.
- `docs/API_INTEGRATION.md`, `docs/COMPLIANCE_REQUIREMENTS.md` y `docs/SECURITY_PLAN_2026.md` están desactualizados respecto a sus versiones de `main` y podrían reintroducir afirmaciones ya corregidas.
- Con esta comparación no aparece una implementación de adaptador o pruebas unitarias que falte rescatar de esa rama: los archivos centrales del adaptador ya coinciden con `main`. La rama no debe fusionarse; si se necesita rescatar algo, hacerlo como cambios puntuales después de revisión, no mediante merge.

Esta revisión fue estática de contenidos en GitHub; no se ejecutaron tests desde un entorno local ni se cambió la rama del adaptador.
