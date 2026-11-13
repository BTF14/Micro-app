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

## Nota autoritativa — 2026-11-08 UTC

El estado operativo vigente se centraliza en CURRENT_STATE.md y HANDOFF_NEXT_CHAT.md. Main actual: 9c6b30281ed59726e532da840568fc9e80b528f7; #280 y #282 integradas. Neon rehearsal #42507066215 aplicó 0001–0019 solo en microapp_rehearsal. #269 está OPEN/Draft en HEAD 8f05befb7ac1a46d68850b9f89f89edc8cd46283 con 16/16 check-runs y 14/14 workflows SUCCESS; #255 OPEN/Draft en HEAD 7e43d7fd1519889605174da5818190bb84685059 con 15/15 y 13/13 SUCCESS. #258 y #262 se cerraron como superseded tras preservar/evolucionar todo su contenido en #269. #233 sigue histórica abierta; #193 no se modifica. Producción NOT READY: contrato comercial checkout y gates BCV siguen abiertos. No repetir escrituras Neon ni tocar producción. El detalle, SHA y siguientes pasos están en CURRENT_STATE.md.

---

# Estado del repositorio — 2026-11-08 UTC

El estado vivo de main, PRs, SHA, checks y próximos pasos está centralizado en [CURRENT_STATE.md](CURRENT_STATE.md) y [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md). Los snapshots históricos que siguen en este documento son evidencia temporal: no reutilizar SHA ni resultados CI sin comprobar el HEAD exacto.

- GitHub main protegido: `aa2804a0a6e7879f684b3baeb60646e50f1d6419`; PR #280 integrada por squash.
- Neon rehearsal #42507066215: SUCCESS; migraciones 0001–0019 verificadas únicamente en `microapp_rehearsal`. Neon main no fue modificado.
- Producción: **NOT READY**; no extrapolar el ensayo ni los builds automáticos a certificación productiva.

---
# Addendum Cloudflare/CI vigente — 2026-11-08 UTC

## Configuración versionada verificada

- Worker `micro-app-api`, Wrangler `^4.156.1`.
- `apps/api/wrangler.toml`: `[vars] APP_ENV = "production"`; `[previews.vars] APP_ENV = "preview"`.
- `apps/api/src/index.ts` bloquea API en preview y hostnames `workers.dev` no productivos; solo `/health` queda disponible.
- El middleware es una defensa de aplicación; no sustituye aislamiento de secretos, bindings, bases ni recursos externos.

## Distinciones de Cloudflare

- Worker Preview es distinto de Version URL. Previews usan variables/secretos/bindings propios definidos en `previews`; Version URLs no son por sí mismas un entorno aislado de rama.
- Cloudflare indica que los recursos solo quedan aislados si el Preview usa IDs separados. Service Bindings de un Preview llaman al Worker productivo; Workflow bindings usan Workflows existentes; **Routes y Cron Triggers apuntan a producción**. Las Preview URLs son públicas por defecto y deben protegerse con Cloudflare Access cuando corresponda.
- No existe prohibición permanente de Worker Previews. La decisión es no cambiar el modo de builds hasta inventariar bindings, secretos, recursos compartidos, acceso y costo; el cambio del modelo anterior es operativo y debe tener aprobación explícita.
- Última observación documentada del dashboard (2026-11-04): el Worker mostraba “Set up Worker Previews” y el Version command `npx wrangler versions upload`. No se volvió a leer el dashboard autenticado en esta sesión; tratarlo como evidencia histórica, no como estado vivo.
- Referencias oficiales: [Worker Previews](https://developers.cloudflare.com/workers/previews/), [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/).

## Estado de PR y producción

- #251 HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`: 15/15 check-runs SUCCESS.
- #255 HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`: 13 workflow runs + 15/15 check-runs SUCCESS.
- Los check-runs Cloudflare Pages/Workers asociados a estas PR son builds/checks de PR; no prueban un despliegue productivo, aislamiento de Preview ni CORS real.
- Los Crons de #251/#255 no se han activado en producción; Cloudflare documenta que Routes y Cron Triggers apuntan a producción, no a cada Preview. El guard `APP_ENV` añade fail-closed en el handler.
- No se modificaron dashboard, Worker mode, variables, secretos, bindings, tráfico, DNS, billing ni producción.

## Evidencia histórica preservada de PR previews (2026-11-04)

Los siguientes destinos son previews/version URLs de PRs antiguas ya cerradas; no son endpoints actuales ni evidencia de producción:
- PR #200: Pages commit preview `https://6ff8d968.micro-app-63i.pages.dev`; Worker Version URL `https://09254838-micro-app-api.btfcasheb.workers.dev`.
- PR #204: Pages commit preview `https://12d9c5bc.micro-app-63i.pages.dev`; Worker Version URL `https://8b3b7e8d-micro-app-api.btfcasheb.workers.dev`.
- PR #205: Pages commit preview `https://9d8491b5.micro-app-63i.pages.dev`; Worker Version URL `https://d4532b6a-micro-app-api.btfcasheb.workers.dev`.
- PR #202: Pages commit preview `https://aff7f4d7.micro-app-63i.pages.dev`; Worker Version URL `https://df3c17b4-micro-app-api.btfcasheb.workers.dev`.
- Branch Preview URLs, exact heads and dashboard observations remain in the historical #202 addendum on its branch; no re-authentication or screenshot is required merely to continue code/PR work.

# Auditoría corregida de GitHub Actions y despliegues — 2026-10-30 UTC

## Addendum vigente — PR #178, SHA exacto y previews Cloudflare

**Snapshot verificado antes de esta sincronización documental:** `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b` en `docs/reconcile-role-model-and-cloudflare-20261030`; base `main` = `82386c6e9300e06f8fa209aa52995b939a72442a`; 68 ahead / 0 behind. La PR permanece OPEN/DRAFT/NOT MERGED.

- GitHub Actions: 11/11 workflow runs asociados al SHA exacto `a45d84eb5f51e50d3a24f9d6858b5d14efb3ce6b` terminaron `success`: nueve eventos pull_request y dos eventos push. Los run IDs y enlaces están en `docs/CURRENT_STATE.md`.
- Cloudflare Pages notificó deployment exitoso para commit `a45d84e`: [commit preview](https://16be43d4.micro-app-63i.pages.dev) y [branch preview](https://docs-reconcile-role-model-an.micro-app-63i.pages.dev).
- Cloudflare Workers notificó deployment exitoso para commit `a45d84e`: [commit preview](https://d0883f1d-micro-app-api.btfcasheb.workers.dev) y [branch preview](https://docs-reconcile-role-model-and-cloudflare-20261030-micro-app-api.btfcasheb.workers.dev). GET `/health` en el commit preview respondió `status=ok`.
- La preview Pages muestra el mensaje de entorno aislado y deshabilita login/acceso a datos. Estos resultados son previews; no certifican producción ni la integración API/frontend completa.
- Los dos OPTIONS reales contra el Worker de producción no pudieron ejecutarse por DNS en este entorno (curl exit 6 para ambos origins); no se obtuvo status ni headers CORS. El bundle JS publicado tampoco se pudo inspeccionar.
- No se modificaron deployments, tráfico, variables, secretos, DNS, billing ni producción. El commit documental que añade este addendum crea un SHA nuevo, cuyos checks deben verificarse por separado.


## Addendum vigente — Cloudflare tras PR #177 (2026-10-30 UTC, sesión autenticada de solo lectura)

Este addendum sustituye las observaciones anteriores sobre el entorno efectivo de los builds de PR #177 / merge a `main`; el historial se conserva.

### Worker `micro-app-api`
- Panel: entorno **Producción**, Active Deployment versión `49975c43-4161-4809-9c00-8ba83e53e6a0` (prefijo `49975c43`).
- Build ID `957478f6-0f43-4b5c-932a-621be067d6d9`, commit `82386c6e9300e06f8fa209aa52995b939a72442a` (`main`).
- Active Deployment mostró **100% de tráfico asignado** a esa versión. La vista de métricas mostró 0 req/sec y 0% de errores en el instante observado; no equivale a una prueba HTTP ni a CORS correcto.
- Un comentario anterior de #78 documentó 0% para esta versión en otra vista/observación. La inspección autenticada posterior de Active Deployment mostró 100%; usar esta observación posterior como estado actual, sin interpretar el extremo del slider como métrica.

### Pages `micro-app`
- Production branch `main`; SHA `82386c6e9300e06f8fa209aa52995b939a72442a`; URL de deployment `https://cc23ff0c.micro-app-63i.pages.dev`.
- La lista visible de variables de entorno estaba vacía; sin embargo, `apps/web/.env.production` versionado define `VITE_API_BASE_URL` y `apps/web/vite.config.ts` lo carga mediante `loadEnv`. La ausencia en el panel no prueba que el build carezca de URL. Falta confirmar el valor efectivo en el bundle desplegado; no se modificó configuración.
- El dashboard no lista variables configuradas, pero el código versionado define `VITE_API_BASE_URL` en `apps/web/.env.production` y `vite.config.ts` lo carga mediante `loadEnv`. La página pública muestra el enlace OAuth hacia el Worker; la inspección no pudo leer el bundle JS ni confirmar el valor compilado para otras llamadas API. No cambiar configuración.

### Límites
- Inspección autenticada, de solo lectura. No se modificó tráfico, versiones, deployments, variables, secretos, DNS, billing ni producción.
- La observación del deployment no prueba que CORS funcione. #78 permanece abierta hasta obtener preflight HTTP real para origen permitido y origen externo.
- No inferir preparación productiva a partir de CI, deployment activo o métricas puntuales.


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


## Check final de PR #158 HEAD 5b1b573

- SHA `5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766`: 12/12 check runs success. Cloudflare Pages preview `https://d8477e48.micro-app-63i.pages.dev`; Worker preview `https://2935f95a-micro-app-api.btfcasheb.workers.dev`. No production deployment.
- PR #158 abierta, draft, no mergeada; cinco archivos docs. Pendiente verificar Node/pnpm efectivos, build cache, headers HTTP y usage Pages. No cambios productivos.

## Hallazgo resuelto por PR #159 — pinning Node/pnpm

- El build previo ejecutó Node 24.22.1 y pnpm 10.11.1, con Unsupported Engine porque root package requiere >=24.22.2 <25. Cloudflare Pages Build System v3 no detecta engines/package manager desde package.json; docs oficiales permiten pin Node con .node-version o NODE_VERSION. Fuente: https://developers.cloudflare.com/pages/configuration/build-image/.
- PR #159 añade .node-version 24.22.2, packageManager pnpm@10.34.9 y alinea workflows. Build log Cloudflare del SHA 57de704 confirma Node 24.22.2, pnpm 10.34.9, cero warning de engine y preview successful https://70046713.micro-app-63i.pages.dev. GitHub/Cloudflare 13/13 checks success.
- PR #159 permanece draft y no fusionada. El build fue preview; no producción. PR #158 sigue separada y documental.


## Addendum — verificación final de PRs, protección de main y Fail open (2026-10-30 UTC)

### PRs y checks obligatorios verificados en GitHub
- La rama `main` está protegida (`protected=true`). La API devolvió enforcement `everyone` y seis contexts requeridos: `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history`, `Trivy filesystem and configuration scan`, `postgres-migration` y `verify`.
- PR #158 permanece abierta/draft, HEAD `517b3496c47b3e82136aadee192717600c558146`, base `1ee1808af4aae484a71dc24750237ff4f4d934a0`. Sus 12 check runs del SHA exacto terminaron `success`; los seis contexts requeridos están presentes y verdes. Cloudflare Pages y Workers preview también reportaron success.
- PR #159 permanece abierta/draft, HEAD `57de704c03fffebfd9aee2ae91c05a0e3af7515a`, misma base. Sus 13 check runs del SHA exacto terminaron `success`; los seis contexts requeridos están presentes y verdes. Cloudflare Pages preview y el build de CI también reportaron success.
- No hay reviews ni hilos de revisión registrados en ninguna PR. No se fusionó ninguna. La protección de main no elimina el gate de autorización de producción: un merge puede activar el deploy automático de Pages/Workers.

### Semántica documentada de Pages “Fail open”
- La opción observada en Pages corresponde al comportamiento cuando se agota el límite diario gratuito de invocaciones de Pages Functions: **Fail open** permite servir los assets estáticos aunque una Pages Function normalmente se hubiera ejecutado primero; **Fail closed** devuelve una página de error en vez de servir esos assets. Fuente oficial: https://developers.cloudflare.com/pages/functions/routing/.
- En el repositorio inspeccionado no existe directorio `functions/` en la raíz del proyecto Pages ni `apps/web/functions/`; la autenticación actual usa el Worker API separado. Por tanto, no hay evidencia de que la app actual dependa de Pages Functions para aplicar autenticación. El riesgo de Fail open sería relevante si en el futuro se traslada autenticación/autorización crítica a Pages Functions; no cambiar el ajuste ahora ni asumir que protege/bloquea el Worker API.
- La documentación de la API de Pages también expone un campo `fail_open` descrito como comportamiento ante fallo al aplicar configuración de despliegue; no confundir ese campo de API con la opción Runtime “Fail open / closed” explicada en la guía de routing. No se leyó ni cambió el valor mediante API.

### Preview y headers HTTP
- La preview `https://70046713.micro-app-63i.pages.dev/` mostró el aviso explícito de vista previa aislada; no mostró controles funcionales de login ni formulario de autenticación. No se enviaron formularios ni se llamaron APIs.
- El archivo `apps/web/public/_headers` en main define CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` y `Permissions-Policy`. Sin embargo, la sesión de navegador no expuso las cabeceras HTTP reales y la inspección DOM no permite demostrar que Cloudflare las haya servido. Estado: **configuradas en el repositorio, efectividad HTTP pendiente de verificación**.
- No se modificaron ajustes, variables, secretos, workflows, DNS, billing, tráfico, Neon ni producción. No se dispararon builds manuales.



## Addendum — 2026-11-13: Pages Functions same-origin API (PR #339, OPEN)

- Cloudflare Pages project `micro-app`: Production branch `main`; root directory vacío (raíz del repositorio); build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; build output `apps/web/dist`.
- La Pages Function debe vivir en `/functions/api/[[path]].ts` en la raíz del repositorio, no dentro de `apps/web/functions/` ni dentro de `apps/web/dist`.
- PR #339 añade proxy same-origin, CSP `connect-src 'self'`, cookies de sesión Lax y reescritura acotada de Path PKCE. El Service Binding no se configuró durante la PR.
- Activación manual posterior: proyecto Pages `micro-app` → Settings → Bindings → Add → Service binding; entorno Production; Variable name `API`; Service `micro-app-api`. No crear el binding en Preview. Cloudflare requiere un redeploy para que el binding entre en vigor.
- Google OAuth: agregar la callback `https://micro-app-63i.pages.dev/api/auth/google/callback` sin retirar la URI antigua hasta completar la prueba real con Brave Shields ON.
- PR #339 permanece OPEN/no mergeada durante la observación de backup natural 07:00 UTC y el gate `backup-real-restore.yml`. No se tocó Cloudflare, Google, Neon, secrets ni backup.

## Addendum — 2026-11-13: runtime guard and client-IP provenance (PR #339)

Cloudflare Pages exposes `CF_PAGES_BRANCH` as a build variable; do not assume it is injected into the Pages Function runtime. The Pages Function guard therefore uses the exact HTTPS hostname `micro-app-63i.pages.dev` as a mandatory discriminator, rejects a present non-`main` runtime branch, and then requires the `API` Service Binding. **The `API` binding must be configured for Production only and must not be configured for Preview.** This makes the undefined-branch production case work while preview hostnames fail before the binding is read.

Runtime matrix:

| Request host | Runtime `CF_PAGES_BRANCH` | Production-only `API` binding | Expected |
|---|---|---|---|
| exact `micro-app-63i.pages.dev` | `main` | present | proxy |
| exact `micro-app-63i.pages.dev` | undefined | present | proxy (Pages runtime may omit build variable) |
| exact `micro-app-63i.pages.dev` | any value other than `main` | any | 503 before reading binding |
| any preview/hash/other host | `main` or undefined | any | 503 before reading binding |
| exact production host | `main` or undefined | missing | 503 `API_BINDING_MISSING` |

Client IP provenance: Cloudflare documents that `CF-Connecting-IP` is only sent from its edge to the origin and represents the connecting client IP. The Function explicitly re-sets that edge-provided header on the Service Binding request and drops `X-Forwarded-For` rather than trusting a client-controlled forwarding chain. The incoming `Origin` remains unchanged for API CSRF validation. This trust assumption is valid only for requests entering through Cloudflare Pages; do not expose an alternate untrusted route to this proxy. See Cloudflare's [HTTP headers documentation](https://developers.cloudflare.com/fundamentals/reference/http-headers/).

The proxy streams request/response bodies, uses manual redirects, preserves non-hop-by-hop response headers and each individual `Set-Cookie`, and rewrites only the three OAuth PKCE cookie paths. The Worker direct endpoint remains configured for its existing host/origin contract.
