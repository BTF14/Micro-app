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
