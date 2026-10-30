# Auditoría corregida de GitHub Actions y despliegues — 2026-10-30 UTC

**Base auditada:** `1ee1808af4aae484a71dc24750237ff4f4d934a0` (`main`).  
**Revisión adicional:** lectura directa de los 15 workflows versionados en `main`, inspección de la PR #158 y acceso de solo lectura al panel de Cloudflare mediante TinyFish.  
**Estado PR #158:** abierta, draft, no fusionada; HEAD previo a esta actualización `d3f056b780ddad62deb5c1e1c0f1679bba19bb50`.

## Corrección importante respecto a la primera auditoría

La primera versión afirmó que siete workflows escuchaban a `push` y `pull_request` sin filtros de rama/path. Esa conclusión fue incorrecta. La lectura directa de los YAML confirma que la mayoría de esos workflows sí restringe ramas. Esta sección corregida prevalece sobre cualquier afirmación anterior de duplicación generalizada.

## Inventario real de disparadores

| Workflow | Push | Pull request | Otros | Riesgo de duplicación |
|---|---|---|---|---|
| `ci.yml` | `main` | destino `main` | — | No por push a rama feature; push solo corre en main |
| `migration-check.yml` | `main`, `feat/tenant-safe-schema` | destino `main` | — | Solo ramas incluidas explícitamente en push |
| `playwright-e2e.yml` | `main` | destino `main` | `workflow_dispatch` | No por push a rama feature ordinaria |
| `project-progress.yml` | `main`, `feat/project-progress-dashboard` | destino `main` | — | Solo ramas incluidas explícitamente en push |
| `sdd-docs-validation.yml` | `main` + paths documentales | `main` + mismos paths | — | Limitado por rama y paths |
| `secret-history-scan.yml` | todas las ramas (`**`) | destino `main` | `workflow_dispatch` | **Sí, potencialmente**: push a rama con PR y evento PR |
| `security-scan.yml` | sin filtro de rama (todas) | destino `main` | — | **Sí, potencialmente**: push a rama con PR y evento PR |
| `semgrep.yml` | `main` | destino `main` | `workflow_dispatch` | No por push a rama feature ordinaria |
| `dependency-review.yml` | — | destino `main` | — | Solo PR |
| `autoskills-preview.yml` | — | destino `main` + paths de workflow/manifiestos | `workflow_dispatch` | Solo PR con paths relevantes |
| `daily-dependency-watch.yml` | — | solo cambio de su propio YAML | schedule, `workflow_dispatch` | No corre en cada PR; filtro de path específico |
| `backup.yml` | — | — | schedule, `workflow_dispatch` | No aplica |
| `backup-restore-smoke.yml` | — | paths concretos de backup/migraciones/docs | schedule, `workflow_dispatch` | Solo PR con paths relevantes |
| `backup-real-restore.yml` | — | — | `workflow_dispatch` | Operación manual sensible; no ejecutar sin autorización |
| `regenerate-lockfile.yml` | — | — | `workflow_dispatch` | Operación manual de escritura; no ejecutar sin autorización |

### Conclusión sobre duplicación

- La duplicación potencial general por rama/PR se concentra en `secret-history-scan.yml` y `security-scan.yml`, cuyos disparadores `push` no están limitados a `main`.
- Los demás workflows de la lista anterior tienen filtros de rama o paths y no deben describirse como “sin filtros”.
- No modificar triggers todavía. Primero confirmar branch protection/rulesets y contexts obligatorios; la consulta de rulesets devolvió lista vacía y el endpoint legacy de protección de `main` devolvió 403 por permisos insuficientes. No se puede afirmar que no exista protección.
- Mantener checks de PR y no usar paths filters indiscriminadamente en checks requeridos.

## Hallazgos Cloudflare verificados en vivo (solo lectura)

Perfil TinyFish Default; Cloudflare panel accesible durante la inspección. No se cambiaron ajustes, tráfico, DNS, secretos, billing ni despliegues.

### Cuenta y cuotas

- Plan observado: **Workers Free, USD 0/mes**; no se observó método de pago registrado.
- Workers: 100.000 solicitudes/día; CPU 10 ms por solicitud; 3.000 build minutes/mes; hasta 100 Workers y 5 Cron Triggers.
- El panel mostró 183 requests y 0 errores en la ventana de 24 horas observada; también se reportaron 85 invocaciones y CPU P90 de 10 ms en la vista de Worker. Es una fotografía del panel, no un benchmark ni una garantía de capacidad.
- Build minutes observados: 106,68 durante las últimas 24 horas. No confundir esa cifra con la cuota mensual ni extrapolarla linealmente.
- El consumo restante del periodo, el detalle de facturación y el uso real de Pages no quedaron completamente extraídos. No afirmar que los límites están holgados sin medirlos.

### Workers

- Servicio: `micro-app-api`, URL `https://micro-app-api.btfcasheb.workers.dev/`, repositorio `BTF14/Micro-app`, root `/apps/api`.
- El panel mostró `main` como versión de producción activa observada; las ramas `docs/...` aparecen como Preview versions, con URLs de commit/branch preview distintas. No-main previews no deben confundirse con tráfico de producción.
- La PR #158 recibió comentario automático de Cloudflare indicando despliegue exitoso de preview de Worker para commit `d3f056b7`, con URL de commit preview y URL de branch preview. No es evidencia de un deploy productivo.
- El historial incluyó versiones Ready y cuatro entradas Skipped. La inspección no permite inferir que cada versión Ready recibiera tráfico; el panel identificó previews separadas.
- No se encontró dominio personalizado ni routes en `apps/api/wrangler.toml`. No asumir que reglas WAF de una zona cubren el hostname `workers.dev`.
- Logs y Traces aparecían desactivados en la vista observada. Evaluar observabilidad con control de datos sensibles y coste.

### Pages

- Proyecto existente: `micro-app`, URL `https://micro-app-63i.pages.dev/`, repositorio `BTF14/Micro-app`.
- El panel mostró un despliegue reciente.
- La PR #158 recibió comentario automático de Cloudflare Pages: preview deploy successful para commit `d3f056b`, con URL de commit preview y branch preview. Esto confirma que la integración Git de Pages produce previews en PR; no confirma que el despliegue de producción esté sano.
- La vista de historial de versiones de Pages no terminó de cargar; commit de producción, tráfico, ramas de producción/preview y consumo detallado siguen pendientes.

## GitHub / Cloudflare CI-CD

- No hay workflow GitHub Actions que ejecute `wrangler deploy` o publique Pages. Los comentarios automáticos de Cloudflare en la PR #158 prueban que hay integraciones Git de Workers y Pages activas, al menos para previews.
- El comentario de Workers enlaza el log del build y muestra URLs separadas de commit preview y branch preview. El comentario de Pages hace lo mismo. La rama de PR no debe interpretarse como producción.
- Aún falta documentar desde el panel la rama configurada como producción, filtros de build, root/build command de Pages, política de previews y versión/traffic split de Pages.
- Mantener el gate: un merge/push a `main` puede publicar por la integración externa. Merge y autorización de producción siguen siendo decisiones separadas.

## Acciones recomendadas

1. **P0:** no fusionar PR #158 ni otros cambios a `main` sin autorización explícita de producción y sin comprobar qué despliegue productivo activaría.
2. **P1:** evaluar limitar el `push` de `secret-history-scan.yml` y `security-scan.yml` a ramas relevantes, pero solo tras confirmar checks requeridos. No tocar los triggers en esta actualización documental.
3. **P1:** completar Pages: production branch, build settings, root directory, build command, previews, historial y consumo.
4. **P1:** confirmar los límites/uso reales de Workers y Pages desde Analytics/Usage; definir alertas y presupuesto con margen.
5. **P1:** evaluar Logs/Traces sin capturar tokens, cookies, datos personales ni payloads sensibles.
6. **P2:** diseñar dominio propio y protección de API; no comprar ni configurar ahora.
7. **P2:** mantener capacity target de organizaciones/sucursales como DESCONOCIDO hasta pruebas sintéticas aisladas y medición de Neon + Cloudflare.

## Límites y seguridad

Inspección de solo lectura. No se ejecutaron workflows manuales; no se modificaron archivos de aplicación/workflows, secretos, Neon, datos, DNS, configuración de Cloudflare, tráfico, billing ni producción. No se activaron servicios pagos. Objetivo de coste: USD 0.

## Addendum — Cloudflare Pages audit (2026-10-30 UTC, read-only)

- Project `micro-app`, repository `BTF14/Micro-app`; production branch confirmed as `main`; automatic production deploy on push to `main`.
- Latest production deployment observed: active, branch `main`, commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, timestamp `2026-10-30T01:30:08.9457Z`. Production deployment URL observed: `https://06553c7b.micro-app-63i.pages.dev`; primary project domain remains `https://micro-app-63i.pages.dev`.
- Each new commit on non-production branches creates a Pages preview. PR #158 commit `79be208` has a successful preview URL `https://945ae93c.micro-app-63i.pages.dev`; previous PR commit `d3f056b` preview `https://70fea194.micro-app-63i.pages.dev`. These are not production.
- The deployments view showed 15 recent entries (1 production + 14 previews) and 1,100 total deployments in history. The 15 visible entries showed successful status; this does not prove every historical deployment succeeded.
- No custom domain was visible; only `micro-app-63i.pages.dev` was observed.
- Build command, output directory, root directory, framework detection, build environment variables, Functions, redirects, custom headers and account-level Pages usage/quotas were not accessible because the Settings view did not load. Do not infer them from the deployment list.
- This confirms Pages production deploys from `main`, and non-main commits create preview deployments. Merge/push to main can therefore trigger a production frontend deployment even though GitHub Actions contains no Pages deploy workflow.
- No settings, builds, DNS, secrets, billing or deployment state were changed.


## Addendum — Cloudflare Pages Settings + verificación de aislamiento (2026-10-30 UTC)

**Método:** panel Cloudflare abierto con TinyFish, navegación directa a Workers & Pages → `micro-app` → Settings. Solo lectura; no se guardó ningún cambio, no se inició build/deploy, no se visitó billing y no se revelaron valores de secretos.

### Configuración observada en Cloudflare Pages

| Campo | Valor observado |
|---|---|
| Repositorio | `BTF14/Micro-app` |
| Production branch | `main` |
| Root directory | vacío (raíz del repo) |
| Build command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build` |
| Build output | `apps/web/dist` |
| Framework preset | ninguno seleccionado explícitamente |
| Automatic deployments | habilitados |
| Build system | versión 3 |
| Build cache | deshabilitado |
| Build monitoring routes | `*` |
| Deploy hooks | ninguno definido |
| Build comments | habilitados |
| Preview deployment access | público por defecto; Cloudflare Access puede restringirlo |
| Compatibility date | `2026-10-17` |
| Compatibility flags | panel mostró `True`; semántica/flags concretos no visibles |
| Functions setting | panel mostró `Fail open`; confirmar significado exacto en documentación Cloudflare antes de cambiar |
| Execution location | Default |
| Custom domains | ninguno; usa `micro-app-63i.pages.dev` |
| Variables (nombres solamente) | `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL` |
| Headers/redirects en UI | no se expusieron secciones de configuración; inspección del repo sí encontró `_headers`; `_redirects` no existe en `apps/web/public/` |

No se copiaron ni registraron valores de variables de entorno. No afirmar que estas dos variables sean secretas; `VITE_*` se inyecta normalmente en el bundle frontend y debe tratarse como público.

### Contraste con el repositorio (rama main observada durante la auditoría)

- `package.json` raíz declara Node `>=24.22.2 <25`; no declara campo `packageManager`.
- `pnpm-workspace.yaml` define `apps/*`; el root directory vacío y el comando con filtro `@micro-app/web` son coherentes con el monorepo.
- `apps/web/package.json` define `build = tsc -b && vite build && node scripts/postbuild.mjs`; el comando Pages ejecuta ese script.
- El comando Pages solo compila el frontend web. El typecheck/test de API se validan en workflows separados; no inferir que Pages comprueba el Worker.
- No se observó un pin explícito de versión pnpm en el root `package.json`. Como `corepack enable` no equivale por sí solo a fijar una versión reproducible, verificar versión efectiva de Node/pnpm en build logs y considerar pinning explícito en una tarea futura. No modificar ahora.
- Build cache deshabilitado: posible optimización de duración/minutos, pero medir primero y probar sin comprometer builds reproducibles.
- `apps/web/public/_headers` existe y define: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS y CSP restrictiva. CSP productiva permite `connect-src 'self' https://micro-app-api.btfcasheb.workers.dev`.
- `apps/web/scripts/postbuild.mjs` elimina el origen de API de `connect-src` para previews y falla el build si no encuentra la directiva esperada.
- `apps/web/vite.config.ts` deja API base vacía en Pages previews y define `__MICRO_APP_IS_PREVIEW__ = true`.
- `apps/web/src/auth.ts` rechaza peticiones API cuando `IS_PAGES_PREVIEW` es true.
- `apps/web/src/App.tsx` no intenta consultar sesión en preview y reemplaza el botón de login por aviso explícito: login y acceso a datos deshabilitados para proteger producción.
- Por tanto, aunque Pages previews sean públicos por defecto, el código observado implementa aislamiento frente a API/datos productivos en la rama main auditada. Mantener pruebas que aseguren ese comportamiento en futuros cambios; la publicidad del preview sigue significando que el contenido estático es visible públicamente.

### Evaluación y acciones recomendadas (sin cambios aplicados)

1. **No cambiar ahora** build command, root ni output: son coherentes con monorepo y scripts observados.
2. Confirmar en build logs la versión efectiva Node y pnpm. Añadir un `packageManager` exacto (y alinear CI/Pages) solo mediante PR y pruebas si se confirma deriva.
3. Evaluar activar build cache para reducir minutos/tiempo solo después de medir y validar builds limpios/reproducibles.
4. Revisar `Fail open` y compatibility flags con documentación oficial y caso de uso; no cambiar por intuición.
5. Mantener la protección de previews: API base vacía, bloqueo runtime, CSP sin API y CTA OAuth deshabilitada. Añadir/regresar tests E2E para impedir regresiones.
6. Los headers se sirven desde `apps/web/public/_headers`; revisar el resultado HTTP real de producción y preview en una tarea de QA separada. No confundir que exista el archivo con que el navegador recibió correctamente cada header.
7. Revisar el acceso público a previews y considerar Cloudflare Access si los previews futuros contienen material que no deba ser público. Hoy el código observado bloquea auth/API, pero no convierte el preview en privado.
8. `VITE_API_BASE_URL` no debe contener secretos; cualquier variable `VITE_*` puede terminar en el cliente. No registrar sus valores en documentación.
9. Uso/cuotas de Pages y billing siguen sin verificar; no extrapolar desde el número histórico de despliegues.

**Guardrails:** no se cambiaron settings, variables, DNS, dominios, billing, builds, tráfico, Workers, Neon, workflows ni secretos. PR #158 sigue abierta/draft y no fusionada; su merge puede activar producción vía integración Git.

