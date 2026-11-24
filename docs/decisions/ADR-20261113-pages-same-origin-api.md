## Turno 39 — PR #339 integrada y verificación post-merge same-origin (2026-11-13 UTC)

- PR #339 `feat/pages-same-origin-api-20261113` fusionada por squash en main. Merge SHA: `f635c01aacbe148030b3fd1d7e46851ae318f951`. HEAD reconciliado exacto previo al merge: `7e9f05b4e8783fb1707b7b78b6429bf58089e885`.
- PR #339 exact-HEAD CI: 16/16 check-runs SUCCESS, incluyendo Cloudflare Pages, Workers Builds: micro-app-api, Chromium authentication smoke, verify/CI, Semgrep, Trivy, dependency review, validate-odd-docs, PostgreSQL/migration runner y secret-history scan. Los checks de SHA anteriores no se reutilizaron.
- Checks post-merge sobre el merge SHA: 12/12 SUCCESS; Cloudflare Pages y Workers Builds: micro-app-api completados SUCCESS, además de CI/verify, Chromium smoke, PostgreSQL/migration, Semgrep, Trivy, secret scan, ODD validation y dependency review.
- El propietario confirmó que Google OAuth Client tiene la callback nueva `https://micro-app-63i.pages.dev/api/auth/google/callback` y que Cloudflare Pages Production tiene Service Binding `API` → `micro-app-api`; la variable heredada `VITE_API_BASE_URL` fue eliminada. La URI antigua de workers.dev se mantiene durante la transición.
- Verificación pública read-only: `https://micro-app-63i.pages.dev/api/health` devolvió el cuerpo JSON `{"status":"ok","service":"micro-app-api","stage":"catalog-inventory-read"}`. El extractor público no expuso el status HTTP numérico, por lo que no se afirma de forma independiente el código 200. La homepage publicada ya enlaza Google login a `/api/auth/google` (same-origin); la extracción HTML no expuso los `script src`/bundles.
- El workflow `.github/workflows/frontend-bundle-verification.yml` dispone de `workflow_dispatch` y schedule, pero la conexión GitHub de esta sesión no ofrece acción de dispatch. La verificación automatizada del bundle publicado (literal `/api`, ausencia de cualquier `*.workers.dev`) queda pendiente. El intento de browser automation no inició por saldo TinyFish negativo; no se recargó ni se incurrió en gasto.
- No se hizo login real ni prueba con Brave Shields ACTIVADO. El propietario debe probar `https://micro-app-63i.pages.dev` con Shields activado; conservar la URI OAuth antigua hasta confirmar callback y sesión reales.
- Issue #53 permanece OPEN/P0; pasos 1 y 2 completos, pasos 3 y 4 pendientes; **PRODUCTION: NOT READY**. No cerrar el issue ni declarar production readiness.
- Los checks post-merge no equivalen a RPO/RTO medidos ni al smoke autenticado final de staging. El cuerpo de health confirma el proxy same-origin, pero no certifica por sí solo el flujo de login.

---

## Turno 38 — PR #339: prerrequisitos manuales confirmados y reconciliación post-Fase 3B (2026-11-13 UTC)

- El propietario confirma que Google OAuth Client ya incluye `https://micro-app-63i.pages.dev/api/auth/google/callback`, manteniendo temporalmente la URI anterior de `workers.dev`.
- El propietario confirma que Cloudflare Pages Production tiene Service Binding `API` → `micro-app-api`, y que eliminó la variable heredada `VITE_API_BASE_URL` que apuntaba a `workers.dev`; el build toma `VITE_API_BASE_URL=/api` desde `apps/web/.env.production`.
- PR #341/Fase 3B ya está integrada en main: merge SHA `5a93c9c5fbc9eb2064cc3d3f4df1a2d5708a9f3e`. Se incorporan al árbol de PR #339 los registros de Gates A/B, retirada de `backup_readonly`, test de contrato y runbook actualizado. Issue #53 permanece OPEN/P0; pasos 1 y 2 completos, pasos 3 y 4 pendientes; **PRODUCTION: NOT READY**.
- La rama de PR #339 se reconcilia con main usando un merge commit con ambos padres, sin editar el comportamiento de `functions/api/[[path]].ts`, `apps/api/src/*`, `apps/web/*` ni `postbuild.mjs`.
- Después de actualizar la rama, todos los checks deben volver a ejecutarse en el nuevo HEAD exacto. Los checks históricos del SHA `87369c8eca6780ccb78c0677688a27b4a26e9c4e` no se reutilizan.
- No se elimina la URI OAuth antigua hasta verificar login real. El smoke con Brave Shields ACTIVADO queda pendiente post-deploy.
- PR #339 solo puede fusionarse tras revisar diff reconciliado, CI exact-HEAD, Pages/Workers deploy checks y verificación pública del proxy `/api/health`. No se declara resuelto el incidente de cookies hasta el smoke real.
- Issue #53 sigue OPEN/P0 y **PRODUCTION: NOT READY** hasta completar sus pasos 3 y 4.
- Main de partida: `5a93c9c5fbc9eb2064cc3d3f4df1a2d5708a9f3e`; PR #339 anterior: `87369c8eca6780ccb78c0677688a27b4a26e9c4e`.

---

# ADR — API same-origin mediante Cloudflare Pages Functions

- **ID:** ADR-20261113-pages-same-origin-api
- **Estado:** accepted; implementation submitted in PR #339 (OPEN, CI pending)
- **Fecha:** 2026-11-13
- **Responsables:** Arquitectura / Seguridad
- **Relacionado:** [PR #339](https://github.com/BTF14/Micro-app/pull/339) (OPEN, no merge); `odd/tasks/pages-same-origin-api.md`

## Contexto y problema

El frontend de producción `https://micro-app-63i.pages.dev` llama directamente a `https://micro-app-api.btfcasheb.workers.dev`. Las cookies de sesión `SameSite=None` dependen de aceptación de cookies cross-site y pueden bloquearse en Brave Shields y navegadores con ITP. Las cookies PKCE emitidas por la API usan `Path=/auth/google`, que no coincide con el callback de navegador `/api/auth/google/callback` una vez se introduce un prefijo same-origin.

El proyecto tiene presupuesto USD 0 y no puede modificar Neon, secretos, infraestructura remota ni producción durante esta PR.

## Decisión

- Añadir una Pages Function en `/functions/api/[[path]].ts`, ubicada en la raíz del proyecto Pages (root directory vacío), para proxy de `/api/*` a `https://micro-app-api.btfcasheb.workers.dev/*` mediante Service Binding.
- Permitir el proxy únicamente para hostname exacto `micro-app-63i.pages.dev`; si `CF_PAGES_BRANCH` está presente en el entorno runtime, exigir `main`. Rechazar cualquier host alternativo y cualquier branch explícitamente distinta de main antes de acceder al binding.
- Exigir binding `API.fetch`; ausencia produce 503 JSON.
- Preservar método, body, query y cabeceras end-to-end, sin cabeceras hop-by-hop; usar redirect manual y conservar status/Location.
- Preservar individualmente Set-Cookie mediante `Headers.getSetCookie()`. Reescribir `Path=/auth/google` a `Path=/api/auth/google` solo para `microapp_oauth_state`, `microapp_oauth_verifier` y `microapp_oauth_bootstrap`; aplicar también a cookies de borrado. La cookie de sesión mantiene `Path=/`.
- Emitir y borrar `microapp_session` como first-party `SameSite=Lax; HttpOnly; Secure; Path=/` en HTTPS.
- Compilar frontend con API base `/api`; CSP `connect-src 'self'`; previews sin host Worker y bloqueadas en servidor.
- Mantener la URL OAuth anterior durante transición. La nueva callback será `https://micro-app-63i.pages.dev/api/auth/google/callback`.
- Configurar el Service Binding en el entorno Production de Pages después de merge, sin binding de Preview. Esta configuración manual no se ejecuta en esta PR.

## Alternativas consideradas

- Mantener cross-site cookies con `SameSite=None`: descartada porque Brave Shields/ITP puede bloquearlas.
- Comprar dominio propio o plan: descartado por coste USD 0.
- Migrar toda la API o autenticación: descartado por mayor superficie y riesgo.
- Hacer que el Worker redirija/proxyee por Internet: descartado; Pages Service Binding ofrece invocación interna y evita dependencia de red pública.
- Cambiar los paths PKCE dentro del Worker: descartado para no romper el flujo directo existente; el proxy aplica una transformación acotada a las tres cookies exactas.

## Consecuencias y riesgos

- El navegador usa un único origen para frontend, API y cookies, evitando cookies de terceros.
- El Worker conserva su hostname canónico y el middleware `isHttps(c)` recibe URL HTTPS del Worker.
- Preview debe permanecer sin binding y el handler rechaza cualquier hostname distinto del dominio primario; los tests prueban que el binding no se invoca.
- `CF_PAGES_BRANCH` es documentado como variable de build; no se presupone su disponibilidad runtime. Si aparece en `context.env`, se valida estrictamente.
- La PR no configura Cloudflare ni Google. Hasta que el binding y el callback estén agregados manualmente, el proxy responderá 503 o Google rechazará el callback nuevo. El URI viejo debe mantenerse hasta verificar el flujo real.
- El flujo real con Brave Shields activado, sesión, `/api/auth/me`, logout y callback Google sigue siendo un gate post-deploy; CI no lo sustituye.
- Cualquier cliente externo del Worker conserva el contrato actual; no se elimina el endpoint `workers.dev`.

## Reversión o sustitución

Revertir la PR restaura el frontend a la URL Worker anterior y elimina Pages Function. Mantener ambas URIs OAuth autorizadas durante la transición; no borrar la antigua hasta demostrar que no quedan clientes. Si el binding manual causa errores, quitarlo del entorno Production y mantener el proxy fail-closed; no habilitar fallback cross-site automático.

## Evidencia

- Repositorio: `BTF14/Micro-app`
- Rama: `feat/pages-same-origin-api-20261113`
- Base SHA: `0c90aa382633452daeab81e3937112fa1c0ae0ae`
- Implementación y pruebas añadidas en PR #339; el último cambio añade casos de branch runtime ausente y procedencia de IP. CI exact-HEAD pendiente.
- Fuentes primarias: Cloudflare Pages Functions [get started](https://developers.cloudflare.com/pages/functions/get-started/), [bindings](https://developers.cloudflare.com/pages/functions/bindings/), [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/); revisión 2026-11-13.
- Limitaciones: no se inspeccionó ni modificó el dashboard durante esta intervención; la raíz/build settings constan en auditoría versionada del repo y directiva del propietario. No se ejecutó localmente el toolchain porque el sandbox no pudo resolver github.com para clonar el checkout.

## Historial

- 2026-11-13 — decisión aceptada para PR aislada; producción y merge expresamente fuera de alcance.
