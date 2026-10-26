# Estado vivo — 2026-10-26: centro de ayuda (WhatsApp en todo error + FAQ/Privacidad)

PR #84 fusionada (merge `0f83bae341190bf63e50b41fc7402944cda4277f`): el enlace de WhatsApp ya no vive solo en el error de login; también aparece en el banner de error genérico del panel autenticado (por ejemplo, si falla el cierre de sesión), y hay un pie de página permanente (en la pantalla de login y en el panel) con tres enlaces: "Escríbenos por WhatsApp", "Preguntas frecuentes" y "Privacidad". Los dos últimos abren una ventana modal estilo hoja inferior (`.help-modal`) con contenido en `apps/web/src/App.tsx` (constantes `FAQ_ITEMS` y `PRIVACY_SECTIONS`).

El texto de privacidad se escribió explícitamente como un aviso básico honesto para una app interna todavía en desarrollo (qué se guarda, para qué, que no se comparte fuera del negocio, dónde se aloja, cómo pedir corrección/eliminación) — con una nota aclarando que, si el negocio empieza a manejar datos de clientes o el sistema se abre al público, hace falta una revisión legal formal antes de ese paso. No es, ni pretende ser, una política de privacidad legalmente completa.

Con esto, **el trabajo de identidad, acceso y la capa básica de soporte/ayuda del usuario está terminado.** No queda ningún pendiente conocido de esta categoría.

---

# Estado vivo — 2026-10-25 (noche, tarde 2): enlace de WhatsApp para contactar al administrador

PR #83 fusionada (merge `1c65957887cceeccaa059ebd6d12fabdc73f4525`): el texto "comunícate con el administrador del sistema" (en el banner de `?auth_error=` y en la nota fija bajo el botón de Google) ahora es un enlace real a WhatsApp (`https://wa.me/584243104520`, número del dueño, con un mensaje precargado). Antes era solo texto sin ninguna acción posible. Probado por el usuario entrando con un correo no autorizado y confirmando que el mensaje de error se ve correctamente (antes de que se agregara el enlace).

Si el número de WhatsApp de contacto cambia en el futuro, está hardcodeado como constante `ADMIN_WHATSAPP_URL` en `apps/web/src/App.tsx`.

---

# Estado vivo — 2026-10-25 (noche): logout móvil + bug de variables que se autoborraban, resuelto

**Login verificado funcionando en el navegador real del dueño (no solo en base de datos): pantalla "Hola, btfcasheb@gmail.com." con la organización "Abasto 7 de Oro" cargando correctamente en `https://micro-app-63i.pages.dev/`.**

## Bug encontrado y resuelto: las variables de Cloudflare se autoborraban en cada deploy

Después de fusionar PR #81 (que solo tocaba el frontend), el login se rompió otra vez con `GOOGLE_NOT_CONFIGURED` y fallos de CORS. Causa raíz: `wrangler deploy` trata la tabla `[vars]` de `apps/api/wrangler.toml` como la fuente de verdad para las variables **no marcadas como "Secreto"**. `FRONTEND_ORIGIN`, `GOOGLE_REDIRECT_URI` y `GOOGLE_CLIENT_ID` solo se habían configurado a mano en el dashboard de Cloudflare como variables planas, nunca declaradas en el archivo — así que cada deploy automático (incluso uno que no tocaba `apps/api` en absoluto) las borraba en silencio. `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` y `BOOTSTRAP_TOKEN` sobrevivieron porque están guardadas como "Secreto", un almacén separado que `wrangler deploy` no toca.

**Resuelto en PR #82** (merge `f274d32a359dbba8e401897a41294fda1f33cbf8`): esas tres variables ahora están declaradas directamente en `apps/api/wrangler.toml` (committeado, es seguro — el client ID de Google es público por diseño, y las otras dos son solo las URLs del propio despliegue). De aquí en adelante, cualquier deploy las vuelve a crear automáticamente en vez de borrarlas. **No volver a repetir este bug**: cualquier variable nueva no-secreta que se agregue en el dashboard de Cloudflare debe agregarse también a `[vars]` en `wrangler.toml` en el mismo cambio, o se perderá en el próximo deploy.

Valores actuales confirmados en Cloudflare, Producción (los tres "Secreto" no se pueden volver a leer una vez guardados, solo reemplazar):
- `FRONTEND_ORIGIN` = `https://micro-app-63i.pages.dev`
- `GOOGLE_REDIRECT_URI` = `https://micro-app-api.btfcasheb.workers.dev/auth/google/callback`
- `GOOGLE_CLIENT_ID` = `1030757133503-huvhkok21n1br10rtfhs4827fo3v106q.apps.googleusercontent.com` (ahora también en `wrangler.toml`, así que este valor ya no depende de memoria/documentación)
- `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `BOOTSTRAP_TOKEN`: Secreto, valores no recuperables, confirmados presentes.

## Bug encontrado y resuelto: sin forma de cerrar sesión en móvil

El dueño reportó que no veía botón de "Cerrar sesión" en su teléfono. Causa: `styles.css` oculta `.sidebar-bottom` (donde vivía el único botón) por debajo de 760px de ancho — exactamente el dispositivo principal desde el que se usa esta app. **Resuelto en el mismo PR #82**: se agregó un segundo botón "Cerrar sesión" en la barra superior (topbar), visible en cualquier ancho de pantalla; en móvil se oculta el texto del chip de cuenta (redundante con el saludo "Hola, &lt;nombre&gt;") para dejar espacio.

## Próximas prioridades para el siguiente chat

1. Con identidad, login y la interfaz básica ya verificados de punta a punta en producción (incluido en el teléfono real del dueño), **no queda ningún pendiente de infraestructura/acceso conocido**. La prioridad pasa de lleno a construir el negocio: inventario, productos con precio en USD, tasa BCV y su conversión a VES, ventas.
2. Decidir e implementar un flujo real de invitación de usuarios — hoy, agregar a alguien más requiere inserciones manuales en Neon (ver sección de abajo "Cómo agregar un usuario nuevo").
3. Revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge (pendiente desde hace varias sesiones).
4. Si se agrega cualquier variable de entorno nueva al Worker en el futuro, recordar declararla también en `apps/api/wrangler.toml` si no es secreta — ver el bug documentado arriba.

---

# Estado vivo — 2026-10-25 (tarde): primer login real completado, organización creada

**El login con Google funciona de extremo a extremo en producción y ya existe la primera organización real.** Esto es lo más importante que debe saber el siguiente chat.

## Hechos verificados directamente en Neon `main` (proyecto `restless-fire-99110035`, branch `br-summer-math-b7297a60`)

- Tabla `auth_allowlist` tiene exactamente una fila activa: `btfcasheb@gmail.com` (`is_active = true`, `added_by = 'owner-bootstrap-2026-10-25'`, creada 2026-10-25 13:37:54 UTC). Para autorizar a alguien más, insertar otra fila con el mismo patrón — ver "Cómo agregar un usuario nuevo" abajo. No hay ningún otro correo autorizado todavía.
- Tabla `auth_bootstrap` quedó **sellada**: `consumed_at = 2026-10-25T13:40:13.565Z`, `consumed_by_email = 'btfcasheb@gmail.com'`, `created_organization_id` apunta a la organización creada. El `BOOTSTRAP_TOKEN` configurado en Cloudflare ya no sirve para nada — el endpoint rechaza cualquier intento nuevo de bootstrap aunque el token sea correcto, porque la fila sentinela solo permite un uso. Es seguro dejar la variable en Cloudflare (no hace daño) o borrarla como limpieza; no es urgente.
- Organización creada: **id `3ce67e70-c245-4b64-9b93-60b06f85e0f1`, nombre "Abasto 7 de Oro", slug `abasto-7-de-oro`**.
- Usuario creado: **id `36c0f3ec-e1b2-4ea5-9855-45a5ee2c3e92`, email `btfcasheb@gmail.com`**, `google_sub` vinculado, `is_active = true`, rol `owner` en `organization_members` para esa organización.

## Cómo agregar un usuario nuevo a la allowlist (patrón ya probado)

```sql
INSERT INTO auth_allowlist (email, added_by, note)
VALUES ('correo@ejemplo.com', 'owner-bootstrap-<fecha>', 'motivo breve')
ON CONFLICT DO NOTHING
RETURNING id, email, is_active, created_at;
```
Ejecutar contra el proyecto Neon `restless-fire-99110035`, base `neondb`, con `mcp__Neon__run_sql` pasando `project_id` y `database_name` (no `projectId`/`databaseName`, el esquema del tool usa snake_case). Después de agregarlo, la persona solo necesita ir a `https://micro-app-63i.pages.dev/` y tocar "Continuar con Google"; como ya existe su fila en la allowlist pero no un `app_users` con ese correo, el único camino restante sería el bootstrap — **que ya está sellado**. Es decir: **cualquier usuario nuevo después del primero necesita que alguien con acceso a Neon inserte manualmente también su fila en `app_users`/`organization_members`** (o implementar un flujo de invitación — todavía no existe, ver prioridades abajo). No hay todavía una forma de que un segundo usuario se autoprovisione, ni siquiera estando en la allowlist.

## PR #81 fusionada — interfaz de login arreglada

- Problema encontrado: el frontend (`apps/web/src/App.tsx`) seguía mostrando el formulario viejo de usuario/contraseña, y nunca leía el parámetro `?auth_error=` que pone `apps/api/src/google-auth.ts` al redirigir tras un fallo. Resultado: cuando el primer intento de login falló por `not_allowlisted`, el usuario solo vio el formulario de contraseña sin ninguna pista de qué pasó — generó bastante confusión hasta diagnosticarlo leyendo la URL completa a mano.
- PR #81 (`feat(web): Google sign-in UI, replace dead password form`), squash-merged a `main`. Merge commit **`441bdc463954aba1069cfeae9227bf75a562a53a`**. Todos los 12 checks consultados en el head final (`117cb1c`) terminaron `success`, incluido "Chromium authentication smoke tests" (Playwright) tras reescribir `apps/web/e2e/auth.spec.ts`, que todavía probaba el formulario de contraseña eliminado.
- Cambios: el formulario de contraseña/registro se reemplazó por un único enlace "Continuar con Google" hacia `GET /auth/google`; se agregó lectura de `?auth_error=` con un mensaje específico y accionable por cada código (`not_allowlisted`, `account_inactive`, `identity_mismatch`, `bootstrap_consumed`, `not_provisioned`, `email_not_verified`, `oauth_failed`, `server_error`), y se limpia el parámetro de la URL con `history.replaceState` para que un refresh no lo vuelva a mostrar.
- Cloudflare Pages se redesplegó automáticamente al fusionar (igual que el Worker se redeployó al fusionar PR #80). Pendiente de confirmación visual del usuario tras el redeploy.
- Nota de entorno para la siguiente sesión: en este sandbox, `pnpm install` no pudo resolver `registry.npmjs.org` (DNS falla pese a estar en la lista `no_proxy`), así que no se pudieron correr los tests localmente; se verificó todo vía los checks de GitHub Actions en el SHA exacto antes de fusionar, siguiendo el protocolo de `AGENTS.md`.

## Prioridades inmediatas para el siguiente chat

1. Confirmar con el usuario que `https://micro-app-63i.pages.dev/` ahora muestra el panel autenticado ("Hola, btfcasheb@gmail.com…", organización "Abasto 7 de Oro") sin pasos adicionales.
2. Si el usuario quiere agregar más personas (empleados, cajeros), seguir el patrón de "Cómo agregar un usuario nuevo" arriba — y decidir/implementar un flujo real de invitación en vez de inserciones manuales en Neon, porque hoy no escala.
3. Empezar el módulo de negocio real (inventario, productos, tasa BCV, ventas) — sigue sin ningún código de lógica de negocio; todo lo hecho hasta ahora es identidad/infraestructura.
4. Revisar `feat/neon-transaction-adapter` contra `main` actual antes de cualquier merge (pendiente desde hace varias sesiones, nunca bloqueante pero tampoco resuelto).
5. Opcional/limpieza: quitar `BOOTSTRAP_TOKEN` de las variables de runtime de Cloudflare ya que el bootstrap está sellado para siempre; no es urgente.

---

# Estado vivo — 2026-10-25: Google OAuth + allowlist fusionado

- PR #80 (`feat(auth): Google OAuth + allowlist sign-in, password login retired (D1-D8)`) se fusionó a `main` por squash. Merge commit: `e6afed5501b24f50d082ce31883ff78ee477f323`.
- En ese SHA, los nueve checks consultados terminaron en `success`: Workers Builds (micro-app-api), Cloudflare Pages, verify, escaneo de archivos/historial, Trivy, postgres-migration, pruebas de humo de autenticación (Chromium), generate-progress y análisis estático JS/TS. Consultado vía `gh api repos/BTF14/micro-app/commits/main/check-runs` el 2026-10-25.
- **Riesgo P0 de identidad resuelto en código:** `apps/api/src/google-auth.ts` implementa OAuth 2.0 + OIDC con PKCE (S256), validación de `state` vía cookie de un solo uso, verificación server-side de `email_verified` contra el endpoint `userinfo` de Google, allowlist fail-closed (`auth_allowlist`), vinculación automática por email con protección anti-reenlace (`identity_mismatch` si el `google_sub` no coincide), y bootstrap administrativo sellado de un solo uso (`auth_bootstrap`, fila única con `FOR UPDATE`). `POST /auth/login` y `POST /auth/register` quedaron retirados (503), confirmado por revisión manual del diff completo contra `main` antes de fusionar.
- Migración `0002_google_identity.sql` probada primero en una rama Neon aislada y desechable (`google-identity-verify-temp`, creada y eliminada en esta sesión) corriendo `0002_google_identity.assertions.sql`; todas las aserciones (unicidad de allowlist, sello de bootstrap, unicidad de `google_sub`) pasaron. Aplicada después a Neon `main` (proyecto `restless-fire-99110035`) el 2026-10-25.
- **Pendiente para que el login funcione de extremo a extremo:** configurar `GOOGLE_REDIRECT_URI`, `BOOTSTRAP_TOKEN` (secreto de un solo uso, generado en esta sesión) y confirmar `FRONTEND_ORIGIN` como variables del Worker `micro-app-api` en el dashboard de Cloudflare; luego completar el primer login con `bootstrap_token`/`org_name`/`org_slug` para crear la organización y el usuario owner del dueño del negocio. Ninguno de estos tres pasos se ha confirmado completado todavía.
- El Worker `micro-app-api` se redeployó automáticamente a producción al fusionar (el check `Workers Builds: micro-app-api` fue el deploy real, no solo validación), así que el código de Google OAuth ya está en vivo aunque el login no funcionará hasta configurar las variables pendientes arriba.
- Nota operativa: durante esta sesión, los ajustes de "Comando de vista previa" en el proyecto Cloudflare del Worker se quedaron pegados en `npx wrangler preview` (comando beta inválido para CI) pese a guardarse correctamente y a limpiar la caché de compilación; solo se resolvió desconectando y reconectando la integración Git del proyecto en el dashboard. Si vuelve a ocurrir un build con comando de despliegue obsoleto pese a una configuración guardada correcta, probar esa reconexión antes que otra cosa.

---

# Estado vivo — 2026-10-22: seguridad y CI actualizados

- PR #76 integró en `main` el workflow de Gitleaks con checkout completo, reglas adicionales de `.gitignore` y checklist realista de exposición. Merge commit: `5f33e82fc7a6d3e77b6b97d912034f2a2ee7c2b0`.
- En ese SHA, los ocho checks consultados terminaron en success: Gitleaks [39862510779](https://github.com/BTF14/Micro-app/actions/runs/39862510779), CI [39862510861](https://github.com/BTF14/Micro-app/actions/runs/39862510861), Playwright E2E [39862510771](https://github.com/BTF14/Micro-app/actions/runs/39862510771), migración [39862510667](https://github.com/BTF14/Micro-app/actions/runs/39862510667), Semgrep [39862510847](https://github.com/BTF14/Micro-app/actions/runs/39862510847), Trivy [39862510870](https://github.com/BTF14/Micro-app/actions/runs/39862510870), dashboard [39862510823](https://github.com/BTF14/Micro-app/actions/runs/39862510823) y Cloudflare Pages preview. Vercel statuses también pasaron.
- El log real de Gitleaks para ese SHA indica **613 commits escaneados, aproximadamente 1.74 MB y “no leaks found”**. Esto aplica al historial alcanzable desde el checkout de `main`; no certifica todas las ramas, artifacts, logs, releases ni sistemas externos.
- PR #74 se cerró como supersedida porque su rama estaba divergida y no era mergeable. Sus cambios relevantes se rebasaron limpiamente en PR #76; no se integraron sus checkpoints históricos obsoletos.
- PR #71 sigue integrada: `resolveTenantContext` valida sesión/membresía activa y devuelve el rol, pero no autoriza operaciones comerciales y aún no está conectada a rutas de negocio.
- **Riesgo P0 pendiente de decisión de identidad:** [issue #53](https://github.com/BTF14/Micro-app/issues/53) ahora registra que `POST /auth/register` está bloqueado, pero `POST /auth/login` sigue aceptando contraseña para cuentas activas sin aplicar la política Google sign-in + allowlist. No sabemos si hay cuentas reales afectadas. No deshabilitar el login sin evaluar el impacto ni inventar la política D1–D8.
- GitHub reportó `main` sin protección. La conexión usada no permite configurar branch protection/required checks en Settings; requiere acción administrativa allí. No asumir que Gitleaks verde habilita la publicación/operación comercial.
- Arquitectura canónica: Cloudflare Pages + Cloudflare Workers/Hono + Neon Free. Sin despliegue de producción, sin mutaciones de Neon `main`, sin facturación ni secretos expuestos.

## Próximas prioridades
1. Resolver las decisiones D1–D8 de identidad en `docs/sdd/auth-policy-decision-record.md` y completar la política de acceso en todos los puntos de entrada.
2. Obtener aprobación de la matriz de permisos por rol antes de implementar handlers comerciales.
3. Activar protección de `main`, checks requeridos y las opciones de secret scanning/push protection disponibles desde GitHub Settings.
4. Mantener pruebas con PostgreSQL efímero; no probar contra Neon `main`.

---


# Actualización de verificación — 2026-10-22 21:58 UTC

- Resultado final confirmado para PR #71 en SHA `ef86738991fbed58090d191ffbb865e4e8f18588`: los ocho checks de GitHub que se consultaron terminaron en success: CI [39861207434](https://github.com/BTF14/Micro-app/actions/runs/39861207434), Playwright [39861207395](https://github.com/BTF14/Micro-app/actions/runs/39861207395), migraciones [39861207581](https://github.com/BTF14/Micro-app/actions/runs/39861207581), Trivy PR [39861207344](https://github.com/BTF14/Micro-app/actions/runs/39861207344), Semgrep [39861207331](https://github.com/BTF14/Micro-app/actions/runs/39861207331), dashboard [39861207369](https://github.com/BTF14/Micro-app/actions/runs/39861207369), Vercel Preview Comments y Cloudflare Pages preview. Los dos contextos de status Vercel también están success.
- En particular, Playwright llegó al paso `Run browser tests` y terminó success; no fue solo una comprobación de instalación.
- La verificación corresponde al SHA indicado. Los cambios documentales que se hagan después producen un nuevo head y deben revisarse por SHA; no confundir el resultado de este head con un head futuro.
- PR #71 sigue abierta y draft. No se fusionó. Próximo paso: revisión funcional/seguridad del alcance de `resolveTenantContext` y decisión de si la utilidad está lista para uso por rutas, antes de sacarla de draft. No desplegar producción ni tocar Neon `main`.

---

# Checkpoint vivo — 2026-10-22: Playwright fix integrado y PR #71 revalidándose

- PR #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75) se revisó y fusionó por squash en `main`. Commit resultante: `3a6d8211d21cc3fbbff2cd476d8fa80adb65cd3f`. Cambio exclusivo de workflow; sin cambios de app, Neon ni deploy de producción.
- En `main`, todos los seis workflows terminaron en success en ese commit: CI [39860846216](https://github.com/BTF14/Micro-app/actions/runs/39860846216), Playwright E2E [39860846233](https://github.com/BTF14/Micro-app/actions/runs/39860846233), migraciones [39860846364](https://github.com/BTF14/Micro-app/actions/runs/39860846364), Semgrep [39860846524](https://github.com/BTF14/Micro-app/actions/runs/39860846524), security scan [39860846214](https://github.com/BTF14/Micro-app/actions/runs/39860846214) y dashboard [39860846210](https://github.com/BTF14/Micro-app/actions/runs/39860846210). Dos contextos Vercel también aparecen success para ese SHA.
- Se sincronizó `.github/workflows/playwright-e2e.yml` en la rama de PR #71 (`feat/tenant-context-resolver`) con el workflow validado de `main`; commit de sincronización inicial `a3301896c2936ce6d50698a0d05ad920e656fe7a`. Esto es necesario porque GitHub evalúa el workflow que está en la rama del PR.
- Revalidación de PR #71 sobre SHA `a3301896c2936ce6d50698a0d05ad920e656fe7a`: CI [39861076234](https://github.com/BTF14/Micro-app/actions/runs/39861076234) success (build/typecheck, unit tests y PostgreSQL auth integration); migration [39861076210](https://github.com/BTF14/Micro-app/actions/runs/39861076210) success; security/Trivy [39861076123](https://github.com/BTF14/Micro-app/actions/runs/39861076123) success; Semgrep [39861076052](https://github.com/BTF14/Micro-app/actions/runs/39861076052) success; dashboard [39861076073](https://github.com/BTF14/Micro-app/actions/runs/39861076073) success; Playwright [39861076113](https://github.com/BTF14/Micro-app/actions/runs/39861076113) ya verificó con éxito que el browser bundled existe, pero al último chequeo seguía en `Run browser tests` (no declarar E2E final hasta que concluya).
- PR #71 sigue abierta y draft. No fusionar todavía. Esperar el resultado final de Playwright, actualizar el SHA/head después de cualquier commit documental y confirmar todos los checks del head más reciente. La función `resolveTenantContext` es una utilidad aislada nueva; revisar si el alcance de PR pretende solo introducirla o conectarla a rutas antes de sacar el PR de draft. No añadir integración de autorización por intuición: cada operación debe aplicar su política de permisos explícita.
- No se identificó un séptimo workflow distinto; la consulta actual muestra seis workflows Actions relevantes y dos contextos Vercel. No inventar un séptimo check.
- Arquitectura canónica: Cloudflare Pages frontend + Cloudflare Workers/Hono API + Neon Free. Vercel API sigue auxiliar/no canónica. Sin deploy de producción, cambios a Neon `main`, billing ni secretos expuestos.
- Próximo paso: confirmar Playwright E2E de PR #71, luego revisar el diff de resolver y documentar la conclusión con evidencia. Mantener presupuesto $0 y PR #71 draft hasta completar revisión.
 
---

# Checkpoint vivo — 2026-10-22: solución Playwright validada en PR #75

- El fallo repetido de PR #71 estaba localizado en el paso `Install Chromium and OS dependencies`; los tests de navegador no arrancaban y los logs del job devolvían 404 `BlobNotFound`. La causa interna del instalador original no quedó probada.
- Se creó PR draft #75 [ci: stabilize Playwright browser setup](https://github.com/BTF14/Micro-app/pull/75), rama `ci/playwright-container-runner`, head `09bc000d07672f731935d2bbc9e8b38f605eeb9d`. Cambia solo `.github/workflows/playwright-e2e.yml`: usa `mcr.microsoft.com/playwright:v1.55.0-noble` con Chromium/dependencias preinstalados y verifica el directorio del browser, evitando la instalación apt/browser que fallaba.
- Validación real de PR #75 en ese SHA: CI [39859323298](https://github.com/BTF14/Micro-app/actions/runs/39859323298), Playwright E2E [39859323412](https://github.com/BTF14/Micro-app/actions/runs/39859323412), migration [39859323422](https://github.com/BTF14/Micro-app/actions/runs/39859323422), Semgrep [39859323415](https://github.com/BTF14/Micro-app/actions/runs/39859323415), Trivy [39859323621](https://github.com/BTF14/Micro-app/actions/runs/39859323621) y dashboard [39859323191](https://github.com/BTF14/Micro-app/actions/runs/39859323191) terminaron todos en `success`. El browser tests step se ejecutó y pasó.
- PR #75 permanece draft y sin merge. La PR #71 sigue draft; su workflow E2E original seguirá fallando hasta que la corrección de workflow sea revisada e integrada. No fusionar por ahora sin revisar el PR y el estado vivo.
- PR #71 en head previo `fda9a20e2e0b0ca1b73f3af3a4577d0a7d6fc12c`: CI, migration, Semgrep, Trivy y progress dashboard pasaron. E2E falló en instalación de browser con el workflow antiguo. La funcionalidad del resolver y las pruebas de CI no se deben confundir con la prueba E2E, que solo pasa en PR #75.
- Arquitectura canónica sigue Cloudflare Pages + Cloudflare Workers/Hono + Neon Free; Vercel API continúa como auxiliar/no canónico. No hubo deploy de producción, cambios a Neon `main`, gasto ni exposición de secretos.

---
# Checkpoint vivo — 2026-10-22: GitHub Actions recuperado

- Visibilidad del repo confirmada como pública. GitHub-hosted runners ya ejecutan steps; la causa previa de los jobs sin steps no se atribuye retroactivamente a una causa específica.
- PR #71 sigue abierta/draft, rama `feat/tenant-context-resolver`, head observado antes de este checkpoint: `8d938ab5726d357bd9f9f79385af54bbd42c4f2f`. Al añadir este checkpoint el SHA cambiará; consultar el head vivo después del commit.
- Reintentos sobre ese head: CI run [39426320145](https://github.com/BTF14/Micro-app/actions/runs/39426320145) success (build/typecheck, unit tests y auth integration contra PostgreSQL efímero); migración run [39426320271](https://github.com/BTF14/Micro-app/actions/runs/39426320271) success; Semgrep [39426320136](https://github.com/BTF14/Micro-app/actions/runs/39426320136) success; Trivy [39426320487](https://github.com/BTF14/Micro-app/actions/runs/39426320487) success; progress dashboard [39426320168](https://github.com/BTF14/Micro-app/actions/runs/39426320168) success.
- Playwright E2E run [39426320240](https://github.com/BTF14/Micro-app/actions/runs/39426320240), intento 3, falla en el paso `Install Chromium and OS dependencies`; el paso de browser tests queda skipped. Los pasos anteriores, incluidos install de dependencias y setup del runner Playwright, pasan. La descarga de logs del job devuelve 404 `BlobNotFound`, así que la causa interna exacta (descarga de browser, apt/dependencias u otra) no está demostrada. No seguir reintentando en bucle ni afirmar que los tests E2E se ejecutaron. Resolver el paso de instalación con logs disponibles o un entorno de browser reproducible antes de quitar el bloqueo de PR.
- Existe además un run de Security scan anterior [39426310365](https://github.com/BTF14/Micro-app/actions/runs/39426310365) en failure sobre el mismo SHA por evento anterior; el run PR más reciente [39426320487](https://github.com/BTF14/Micro-app/actions/runs/39426320487) sí pasa. Distinguir runs por evento/intento, no reportar el check duplicado como un nuevo fallo de código.
- Check runs raw del SHA `8d938ab...` mostró seis workflows Actions relevantes y dos contextos Vercel exitosos; no se identificó un séptimo workflow distinto. El histórico reporte de siete errores no se debe completar con una suposición.
- La prueba de CI sí es evidencia real ahora que steps se ejecutan. No implica readiness de producción. PR #71 sigue draft hasta resolver Playwright y revisar los checks sobre el head final.
- Arquitectura aprobada del repo sigue siendo frontend Cloudflare Pages + API Cloudflare Workers/Hono + Neon Free, presupuesto $0. Vercel API es auxiliar/no canónico según los documentos; el error ESM de Vercel no justifica reconfigurar el destino aprobado ni hacer deploy de producción.
- Sin deploy de producción, sin cambios a Neon `main`, sin migraciones a datos reales, sin billing ni secretos expuestos.

---
# Revisión viva — 2026-10-20 08:56 EDT (12:56 UTC)

> Esta revisión añade evidencia viva a los checkpoints históricos. El SHA anotado como head/base es el estado al comenzar esta revisión; las actualizaciones documentales de esta sesión crean commits nuevos y deben volver a verificarse después.

## GitHub / PRs al comenzar la revisión

- `main`: `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e` (confirmado con fetch_commit sobre ref `main`).
- PR #71: abierta, draft=true, base `main`, base SHA `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`; head de PR `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2`, rama declarada `feat/tenant-context-resolver`. Este SHA reemplaza el snapshot anterior `a4806b69a2d12225234e7a8fc72c1116957d0318`.
- PR #68 abierta, no draft; head `5d3770a23e07855f68b07e6327c83545c76e1c95`, base SHA `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`.
- PR #69 abierta, no draft; head `611f5274b5f422abe5421aef95aa77b500be7740`, misma base.
- PR #70 abierta, draft=true; head `8bdb410bf2755efdeb6db35f22bae7c8b00acf25`, misma base.
- Comentario de diagnóstico previo en PR #71 sigue presente: https://github.com/BTF14/Micro-app/pull/71#issuecomment-6289785588. No se duplicó. El bot de Cloudflare también reporta preview exitosa para el commit `f0f489f`: https://01bc0d05.micro-app-63i.pages.dev (preview, no producción).

## GitHub Actions: seis workflows actuales recuperados; el séptimo sigue sin identificar

La consulta de workflow runs asociada al head `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2` devuelve estos seis runs completos en failure. Los jobs expuestos por el conector tienen cero steps; cada descarga de logs probada devuelve HTTP 404 `BlobNotFound`. No es evidencia de tests o código fallidos: los comandos de los workflows no aparecen ejecutados.

| Workflow | Run ID | Job | Job ID | Conclusión |
|---|---:|---|---:|---|
| Project progress dashboard | 39424411848 | generate-progress | 118633193726 | failure |
| Database migration validation | 39424411977 | postgres-migration | 118633195889 | failure |
| CI | 39424412060 | verify | 118633195741 | failure |
| Semgrep SAST | 39424411782 | JavaScript and TypeScript static analysis | 118633196350 | failure |
| Security scan | 39424411907 | Trivy filesystem and configuration scan | 118633194852 | failure |
| Playwright E2E | 39424412144 | Chromium authentication smoke tests | 118633196016 | failure |

- Intentos: el wrapper de runs no expone `run_attempt` ni los timestamps completos para estos registros; por tanto, no se afirma el número de intento actual. Los jobs listados son los jobs devueltos para cada run consultado.
- Evidencia de cada job actual: `fetch_workflow_job_steps` devolvió `steps: []`; `fetch_workflow_job_logs` devolvió 404 `BlobNotFound` para los seis job IDs anteriores.
- Runs anteriores observados en el checkpoint: progress `39413291257`, Playwright `39413291129`, CI `39413291311`, Semgrep `39413291252`, Security `39413291137`, migraciones `39413291456`; también se documentaron job IDs iniciales/reintentados allí. No asumir que esos runs pertenecen al head actual sin metadatos SHA.
- El endpoint de combined status consultado para el head actual solo devuelve dos contextos Vercel en `success` (`micro-app-7lg5` y `micro-app`); no enumera los check-runs de Actions. La interfaz/usuario reporta siete errores, pero la conexión disponible solo permitió identificar seis workflow runs fallidos. **Séptimo check: no identificado / pendiente**, no inventar nombre ni causa. Hace falta la lista raw de check-runs o captura/URL del séptimo check desde GitHub.
- El patrón de seis jobs con cero steps y logs no disponibles sugiere fallo anterior a la ejecución de steps o indisponibilidad de almacenamiento de logs; no demuestra la causa raíz de la asignación de runner. No repetir re-runs sin nueva evidencia.
- No se ejecutaron tests del checkout real en esta sesión. Solo sigue constando la verificación histórica aislada: smoke harness 3/3 y TypeScript estricto contra interfaz mínima; no sustituye Vitest, build workspace, pruebas PostgreSQL ni Playwright.

## Vercel: configuración, runtime y arquitectura

- Proyecto frontend `micro-app`, ID `prj_ZoTwHAy4pwGfnnyCz9BmKUIuaBTy`, framework Vite. Proyecto API `micro-app-7lg5`, ID `prj_LW6O1VQIhV0EFG3iRwLDQde3vT5V`, framework Hono, Node `24.x`, región `iad1`. Vercel reporta `READY`, que no equivale a smoke test exitoso.
- Deployment previo con error runtime: `dpl_HpAA28eKdVdWgsfMypeVuybsBhhz`, SHA de main `832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e`; error reportado anteriormente: `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/apps/api/src/auth' imported from /var/task/apps/api/src/index.js`. No se obtuvo un log histórico nuevo: la API de runtime logs rechaza ventanas de 7 días en Hobby por retención. Para la preview actual, una consulta de los últimos 30 minutos no encontró registros de error; esto no prueba que las peticiones funcionen.
- Preview API actual inspeccionada: deployment `dpl_8XPehis1a6KTyb9RontJoVeHZT1V`, estado `READY`, commit `f0f489fc6ac2f5ada84105610ae3eb0e1ff286e2`, rama `feat/tenant-context-resolver`, alias `micro-app-7lg5-git-feat-tenant-context-resolver-devbtf.vercel.app`. No se obtuvieron logs de error en ventana reciente; no se realizó una prueba HTTP/runtime end-to-end.
- `apps/api/src/index.ts` usa imports relativos sin extensión (`./auth`, `./bindings`) y exporta la app Hono. `apps/api/package.json` tiene `type: module`; `apps/api/tsconfig.json` configura `module: ESNext`, `moduleResolution: Bundler`, `noEmit: true`. La compilación raíz es `pnpm --filter @micro-app/web build && pnpm --filter @micro-app/api typecheck`: comprueba frontend y tipos, no produce bundle Node de API. `apps/api/wrangler.toml` declara `main = "src/index.ts"`; el script de desarrollo API es `wrangler dev`.
- No se encontraron `vercel.json` en la raíz ni `apps/api/vercel.json` en los refs consultados (404). La notificación Vercel de la PR confirma root directory `apps/api` para el proyecto API. La configuración del proyecto Vercel no se modificó.
- Variables: el endpoint de listado devolvió `envs: []` y `hiddenProductionEnvCount: 0` para ambos proyectos, pero no se puede concluir que no existan variables por todos los mecanismos/targets; no se mostraron ni recuperaron valores secretos.
- Arquitectura normativa del repo (Constitución §2): frontend estático Cloudflare Pages, API Cloudflare Workers + Hono, PostgreSQL Neon Free, objetivo de coste $0; Vercel Hobby no es el destino para operación comercial. Evidencia concreta: `wrangler.toml` apunta a `src/index.ts`, `dev:api` ejecuta Wrangler, y no hay configuración Vercel versionada para el runtime API.
- Recomendación segura: mantener Workers como destino de API y Pages como frontend; tratar Vercel API como un deployment auxiliar/no soportado hasta que exista una decisión arquitectónica explícita. El error ESM en Vercel es consistente con que el output runtime intenta resolver `./auth` como módulo separado no presente, pero la causa interna exacta del builder no quedó demostrada. No añadir extensiones, reconfigurar proyectos, aliases, variables ni desplegar producción a ciegas.
- La preview de Cloudflare en el comentario de PR confirma un despliegue de preview; no demuestra que el runtime API en Vercel o la conexión a Neon estén operativos.

## Cambios y límites de esta revisión

- No se cambió código de aplicación ni configuración de Vercel. Se actualizará documentación existente en esta misma rama para conservar el handoff.
- No se ejecutó build/test real del repositorio ni smoke HTTP de API en esta sesión; no se tuvo un checkout local funcional. Los logs de Actions no están disponibles.
- No se desplegó producción, no se alteró Neon `main`, no se ejecutaron migraciones y no se expusieron secretos.
- Siguiente paso: conseguir el séptimo check vía raw check-runs, recuperar logs/runners cuando GitHub permita hacerlo, y ejecutar una prueba de runtime en un entorno reproducible. Mantener PR #71 draft hasta tener CI ejecutable sobre el SHA final.

---

# Checkpoint de continuidad — 2026-10-20: PR #71 y API Vercel

> Esta sección prevalece sobre snapshots históricos inferiores. Revalidar SHA, PR y checks en vivo antes de actuar.

## Estado GitHub verificado

- Repo: https://github.com/BTF14/Micro-app
- SHA main de referencia durante la revisión: 832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e. Revalidar main actual al iniciar.
- PR #71: https://github.com/BTF14/Micro-app/pull/71 — rama feat/tenant-context-resolver, head observado a4806b69a2d12225234e7a8fc72c1116957d0318, base observada 832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e. Mantener draft; NO fusionar hasta tener CI verificable.
- La PR añade apps/api/src/tenant-context.ts y apps/api/src/tenant-context.test.ts. El resolver valida token y UUID de organización, calcula SHA-256 del token, consulta sesión y membresía activa con scope de organización y devuelve userId/organizationId/role. No autoriza operaciones comerciales y no está conectado a rutas HTTP.
- Seis workflow runs fallidos identificados en GitHub:
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39413291257
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39413291456
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39413291311
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39413291252
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39413291137
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39413291129
- El usuario ve 7 errores en la interfaz de GitHub; la consulta disponible devolvió seis runs. No afirmar cuál es el séptimo sin inspeccionar los checks actuales del SHA/PR.
- En los reintentos consultados, jobs tenían runner_id 0, runner_name vacío y steps vacíos; terminaban en ~2 s. Descargas de logs daban 404 BlobNotFound y no había artifacts. Las ejecuciones consultadas no alcanzaron los pasos del workflow; la causa raíz de no asignación de runner sigue desconocida. Esto NO demuestra que el código o tests hayan fallado.
- Smoke harness aislado (no checkout del repo): 3/3 checks de lógica del resolver pasaron; tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM pasó contra interfaz mínima. No reemplaza Vitest, build workspace, integración PostgreSQL ni Playwright del repo.
- Cloudflare Pages informó preview exitosa para head a4806b6: https://922aa7da.micro-app-63i.pages.dev y https://feat-tenant-context-resolver.micro-app-63i.pages.dev. Es preview, no producción.
- No se hicieron cambios a Neon main, no se ejecutaron migraciones de producción ni se desplegó producción.

## Hallazgo independiente: API en Vercel no inicia

- Proyecto API Vercel: https://vercel.com/devbtf/micro-app-7lg5 (ID prj_LW6O1VQIhV0EFG3iRwLDQde3vT5V).
- Deployment observado: dpl_HpAA28eKdVdWgsfMypeVuybsBhhz, alias https://micro-app-7lg5.vercel.app, target mostrado production, commit 832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e. Vercel muestra READY, pero runtime logs muestran fallos al atender requests.
- Error exacto: ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/apps/api/src/auth' imported from /var/task/apps/api/src/index.js; el proceso Node.js termina con exit status 1. GET / y favicon también provocan el error.
- apps/api/src/index.ts importa registerAuthRoutes desde ./auth y Bindings desde ./bindings. apps/api/package.json declara type: module; apps/api/tsconfig.json usa module ESNext, moduleResolution Bundler y noEmit true. El build raíz compila web y hace typecheck de API, pero eso no prueba que API pueda ejecutarse como ESM de Node.
- El build de Vercel aparece completado en ~11 s desde la raíz con pnpm 10.28; runtime falla después. Esto apunta a incompatibilidad de empaquetado/resolución ESM/entrypoint, pero la corrección exacta aún NO está probada. El proyecto se diseñó para Hono en Cloudflare Workers; no asumir que Vercel sea el destino correcto.
- La consulta de variables de ambos proyectos devolvió envs: [] y hiddenProductionEnvCount: 0. Es solo el resultado de esa API, no prueba definitiva de ausencia de cada variable. No pedir ni copiar secretos al chat.
- Web Vercel: https://vercel.com/devbtf/micro-app; alias observado https://micro-app-devbtf.vercel.app. Estado READY no acredita salud del runtime de la API.
- NO modificar configuración de Vercel, aliases, variables, producción o dominio a ciegas. Inspeccionar build/entrypoint y confirmar si la API debe desplegarse en Workers según arquitectura y política de coste cero.

## Restricciones vigentes

- Presupuesto $0; no activar planes pagos, billing ni cargos automáticos.
- No tocar Cantina-pos, datos reales, secretos, emails ni Neon main sin gate de producción y recuperación verificada.
- No desplegar producción sin aceptación explícita.
- Google sign-in + allowlist y decisiones D1–D8 siguen pendientes; matriz de permisos por rol no aprobada. POST /auth/register debe seguir fail-closed. No describir login por contraseña como protegido por allowlist.
- No hay endpoints comerciales para catálogo/proveedores/ventas/pagos/movimientos de inventario registrados en apps/api/src/index.ts. Resolver tenant no sustituye autorización por operación.

## Secuencia para el próximo chat

1. Leer AGENTS.md, docs/CONSTITUTION.md, este CURRENT_STATE.md, docs/HANDOFF_NEXT_CHAT.md, docs/STATE_JOURNAL.md y .agents/skills/micro-app-stack-guidance/SKILL.md. Si se toca auth/tenant, leer también .agents/skills/micro-app-auth-security/SKILL.md.
2. Consultar en vivo SHA de main, PR #71, head exacto y todos los checks actuales. Aclarar el séptimo check que ve el usuario. No repetir reintentos sin evidencia de que el runner puede asignarse.
3. Mantener PR #71 draft. Si Actions vuelve a fallar antes de steps, registrar metadata/URL y no atribuirlo al código sin logs. Cuando haya runner funcional, ejecutar CI real.
4. Para Vercel, inspeccionar archivos de configuración/entrypoint y artefacto de build; reproducir ejecución en entorno aislado. Determinar si corregir empaquetado ESM o mantener API en Cloudflare Workers. Preparar cambio en rama/PR; no publicar producción.
5. Verificar el cambio con tests/build y runtime smoke test reproducible; registrar qué pasó y qué no.
6. No implementar OAuth, allowlist ni endpoints de negocio hasta resolver decisiones de producto/roles pendientes.

# Checkpoint autoritativo — 2026-10-19, después de PR #64

- Repositorio canónico: https://github.com/BTF14/Micro-app.
- `main` incluye PR #64 por squash: `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`. PR #63 merge SHA: `b4b417ec5a85b8b0c48b606c718c341745af9055`; PR #62 merge SHA: `d107cfb2b80c4165ed39e3071f8256942898ffb7`; PR #61 merge SHA: `1b8098ff00e0bb7482200b486710a5611f1e109d`.
- PR #63 fusionada; sus siete workflows terminaron en success sobre el head exacto `6baffe8fb473128504361c28fd6ac0c0e01519d9`. PR #64 fusionada; seis workflows consultados terminaron en success sobre el head exacto `97088a2d0d599001f145f4e60f72556a66a5f8b4`: CI, Playwright E2E, Security scan, Semgrep SAST, database migration validation y project progress dashboard. No se ejecutaron tests locales; los workflows no certifican readiness de producción.
- PR #60 está cerrada como supersedida, no fusionada. La comparación confirmó que la política de autonomía/revisión manual quedó integrada por PR #62/#63; no se reintrodujo el handoff histórico obsoleto. No hubo force-push.
- PR #64 añadió cuatro skills de proyecto bajo `.agents/skills/`: `micro-app-auth-security`, `micro-app-postgres-testing`, `micro-app-stack-guidance` y `micro-app-skill-curation`, además de `docs/AUTOSKILLS_ADOPTION.md`. Son instrucciones locales creadas para Micro app, no bundles externos descargados.
- AutoSkills: se inspeccionaron la web, el repositorio y entradas del registro curado. El intento de preparar un checkout temporal falló por DNS al resolver `github.com`; la CLI `npx autoskills --dry-run` no llegó a ejecutarse. No afirmar instalación externa ni crear un `skills-lock.json` ficticio. Próximo paso: repetir dry-run en un checkout con red y revisar propuesta/licencia/hash antes de instalar.
- P0 de identidad sigue pendiente: Google sign-in + allowlist no está implementado; D1–D8 y matriz de permisos por rol siguen sin aprobación. `POST /auth/register` permanece fail-closed. La ruta de login por contraseña sigue existiendo; no afirmar que una allowlist la protege.
- No inventar emails/dominios, configuración OAuth, bootstrap admin ni vinculación de cuentas. No tocar producción, Neon `main`, datos reales, secretos, emails, billing ni Cantina-pos. Presupuesto $0.
- La aplicación NO está lista para producción. Backups/restauración independiente, handlers comerciales, aislamiento tenant completo, permisos aprobados, E2E reales y controles de concurrencia/idempotencia siguen pendientes. Strix sigue documentado, no instalado/ejecutado.
- PR #64 generó una vista previa de rama por la integración automática de Cloudflare; no fue despliegue productivo ni se activó manualmente.

## Próximos pasos
1. En un entorno con red, ejecutar `npx autoskills --dry-run`; seleccionar únicamente skills compatibles con React/Vite, Hono/Workers, TypeScript, Neon y pruebas, verificando licencia y hash. Registrar la salida real.
2. Continuar revisión estática y pruebas aisladas de auth/sesión/autorización. No implementar decisiones D1–D8 ni permisos hasta su aprobación.
3. Comparar `feat/neon-transaction-adapter` contra el `main` vivo sin merge ciego.
4. Mantener handoff, plan y diario actualizados con SHA/checks exactos; no desplegar producción ni mutar Neon `main`.

--- Checkpoint autoritativo — 2026-10-19, después de PR #57

- Repositorio: https://github.com/BTF14/Micro-app
- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe` — https://github.com/BTF14/Micro-app/commit/cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe.
- PR #55 y #56 fusionadas para continuidad documental; PR #57 fusionada: https://github.com/BTF14/Micro-app/pull/57.
- PR #57 bloquea `POST /auth/register`: después de validar Origin devuelve `503 REGISTRATION_DISABLED` antes de parsear credenciales o acceder a la DB. No crea usuarios, organizaciones, membresías, sesiones ni rate-limit rows, y no emite cookie en el camino bloqueado.
- Checks de PR #57 en el head exacto `71d3e6d3ffe625b12807e9942ddd261e222cf093`: verify, PostgreSQL auth integration, Chromium smoke, JS/TS static analysis, Trivy, migration validation, generate-progress y Cloudflare Pages terminaron en success. Los checks consultados en el merge SHA también terminaron en success. No se ejecutaron pruebas locales.
- Cloudflare reportó un Preview URL para el SHA fusionado: https://1d3d60bf.micro-app-63i.pages.dev. No hay evidencia en ese check de un despliegue productivo.
- Issue P0 #53 permanece abierto: el registro está bloqueado temporalmente, pero Google sign-in + allowlist no está implementado y D1–D8 siguen sin aprobarse. No cerrar el issue hasta implementar y probar el flujo aprobado.
- La rama `feat/neon-transaction-adapter` se comparó otra vez con `main`: divergida, 14 commits propios y 76 commits detrás, merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`. El adaptador `database.ts` y workflow de seguridad son idénticos a main; la prueba de DB en la rama es más antigua, `apps/api/package.json` usa un script de test incompatible con la separación de integración actual, y sus documentos están desactualizados. **No fusionar la rama completa**.
- Matriz de roles/permisos sigue sin aprobación; no crear rutas comerciales autorizadas según supuestos.
- App **NO lista para producción**: falta Google OAuth/allowlist, permisos aprobados, handlers de POS/inventario/ventas, aislamiento tenant real, E2E real, idempotencia/concurrencia, validación fiscal y backup/restauración independiente.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado, no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main` ni mezcla con Cantina-pos.

## Próximos pasos
1. Pedir al propietario la aprobación explícita de la política de identidad D1–D8 y matriz de roles; usar las recomendaciones documentadas como propuesta, no como decisiones ya aprobadas.
2. Mantener el registro fail-closed hasta que la política de identidad se implemente y pruebe.
3. Continuar con pruebas de auth/sesión y preparación de la primera ruta comercial solo después de aprobar los permisos.
4. Mantener cambios pequeños, PRs y verificación por SHA exacto.
5. No fusionar `feat/neon-transaction-adapter` completa; rescatar solo un cambio concreto si aparece una necesidad comprobada.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #55

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado después del merge: `b7117f8aeb868e25c49db86a524405511cd3c9be` — https://github.com/BTF14/Micro-app/commit/b7117f8aeb868e25c49db86a524405511cd3c9be.
- PR #55 fusionada: https://github.com/BTF14/Micro-app/pull/55. Solo añade el checkpoint de continuidad tras PR #54.
- Los 8 check-runs consultados para el head exacto de PR #55 `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28` terminaron en `success`: Cloudflare Pages (preview de rama, no producción), Trivy filesystem/config (dos ejecuciones), análisis estático JS/TS, verify, postgres-migration, Chromium authentication smoke tests y generate-progress. No se ejecutaron pruebas localmente ni se verificaron estos checks independientemente sobre el merge SHA.
- No hay PR abiertas en el momento de esta consulta.
- Issue P0 #53 continúa abierto: https://github.com/BTF14/Micro-app/issues/53. El registro público de `apps/api/src/auth.ts` sigue sin una política de identidad Google + allowlist demostrada. No afirmar que el alta pública esté bloqueada.
- D1–D8 de identidad y la matriz de permisos por rol siguen sin aprobación. No inventar proveedor OAuth, allowlist, bootstrap administrativo, verificación de correo, linking/recuperación ni permisos.
- La app NO está lista para producción: faltan handlers comerciales completos, pruebas reales API+PostgreSQL y aislamiento tenant aplicado/verificado, idempotencia/concurrencia, revisión fiscal y backup/restauración independiente.
- Preview de la rama #55: https://docs-checkpoint-after-pr54.micro-app-63i.pages.dev. Es un preview documental, no una aprobación de lanzamiento ni despliegue productivo.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado solamente: no instalado ni ejecutado. Coste objetivo $0. Sin secretos, emails, billing, datos reales, mutaciones de Neon `main`, producción ni mezcla con Cantina-pos.

## Siguiente paso
1. Solicitar al usuario aprobación explícita de las decisiones de identidad/roles que solo él puede fijar; facilitar opciones breves en el chat.
2. Mientras tanto, continuar revisión estática de seguridad y pruebas de bajo riesgo que no dependan de decisiones pendientes.
3. Mantener PRs pequeñas, revisar diff completo y comprobar checks del SHA exacto antes de fusionar.
4. Actualizar este documento, el handoff, plan y diario al siguiente hito.
5. No fusionar `feat/neon-transaction-adapter` a ciegas; sigue requiriendo comparación con main actual.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #51

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98` — https://github.com/BTF14/Micro-app/commit/e18a3ec267f4c4d0e02678a4c0522dabf200ac98
- PR #51 fusionada: https://github.com/BTF14/Micro-app/pull/51. Añade pruebas de error de base de datos para login y registro; las respuestas son seguras y no emiten cookie. Head probado `92ea991d6333bcd1b05943f679fdd36777ab6a8f`; seis workflows success: CI 39255462405, Playwright E2E 39255462498, migraciones 39255462284, Security scan 39255462264, Semgrep SAST 39255462627 y dashboard 39255462281.
- PR #50 fusionada: https://github.com/BTF14/Micro-app/pull/50. Login sin membresía activa o con organización inactiva no emite cookie. Head probado `dcad8d6d1caf6db3aabbc95465e5983ad0014746`; seis workflows success: CI 39255158169, Playwright E2E 39255157709, migraciones 39255158077, Security scan 39255157712, Semgrep SAST 39255157509 y dashboard 39255157611.
- PR #47–#48 añadieron cobertura para fallos de validación de sesión y usuarios inactivos; PR #49 actualizó documentación previa.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Inspeccionar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #48

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `420a64152103c90d2990d47c72fc19a744786fa6` — https://github.com/BTF14/Micro-app/commit/420a64152103c90d2990d47c72fc19a744786fa6
- PR #48 fusionada: https://github.com/BTF14/Micro-app/pull/48. Prueba que el login de una cuenta inactiva devuelve 401 sin crear cookie de sesión. Head probado: `6acb78018a47eb39f74dab079b53b51b4cacf11f`; los seis workflows terminaron en success: CI 39254257051, Playwright E2E 39254256939, migraciones 39254257076, Security scan 39254256854, Semgrep SAST 39254256882 y dashboard 39254256826.
- PR #47 fusionada: https://github.com/BTF14/Micro-app/pull/47. Prueba que `/auth/me` devuelve un error seguro y no limpia la cookie cuando la base de datos no permite validar la sesión. Head probado: `7939d11678cfd1a2bb8fac22664096663603c824`; seis workflows en success: CI 39253558854, Playwright E2E 39253558793, migraciones 39253558714, Security scan 39253558727, Semgrep SAST 39253558761 y dashboard 39253558724.
- PR #46 actualizó los documentos de continuidad después de PR #45.
- No se ejecutaron pruebas localmente. Los workflows citados corresponden al head exacto de cada PR; no se verificaron aquí sobre los merge SHA.
- Próximo foco: autorización server-side y aislamiento tenant. Primero revisar handlers reales; no inventar endpoints comerciales. D1–D8 de Google OAuth/allowlist y matriz de permisos siguen pendientes de aprobación.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E contra API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix documentado, no instalado ni ejecutado. Coste objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #45

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f` — https://github.com/BTF14/Micro-app/commit/1c6ecf6a4586ab1252a43210672e123975f8941f
- PR #45 fusionada: https://github.com/BTF14/Micro-app/pull/45. Añade una aserción en `apps/api/src/auth.integration.test.ts` para verificar que `/auth/me` elimina la cookie si la cuenta está inactiva.
- Head exacto de PR #45: `cdce44a9643c5134311f9603abf1248c07970df3`. Seis workflows de GitHub Actions terminaron en `success`: CI 39252317370, Playwright E2E 39252317397, migraciones 39252317371, Security scan 39252317467, Semgrep SAST 39252317386 y dashboard 39252317373.
- PR #44 cubre sesión revocada y organización inactiva; PR #43 cubre sesión expirada. No se ejecutaron pruebas localmente ni se verificaron aquí los workflows sobre el merge SHA.
- Prioridad siguiente: revisar autorización server-side y aislamiento tenant antes de añadir handlers comerciales. D1–D8 de Google OAuth/allowlist y la matriz de permisos siguen pendientes; no elegir políticas por suposición.
- Bloqueos P0: OAuth/allowlist/verificación de correo no demostrados como implementados; faltan flujos comerciales completos, E2E con API+PostgreSQL reales, aislamiento multiempresa completo y backup/restauración independiente probados.
- No desplegar producción ni modificar Neon `main` sin superar los gates de `docs/CONSTITUTION.md`. Sin secretos, correos, billing, datos reales ni mezcla con Cantina-pos. Strix está documentado, no instalado/ejecutado. Objetivo $0.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #41

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `3313bf4276563c6cdac52aa7902fa9ea36558014` — https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014
- PR #41 fusionada: https://github.com/BTF14/Micro-app/pull/41. Cambio: prueba de regresión para que el endpoint de logout no borre la cookie de sesión si falla la revocación del lado del servidor.
- Head exacto probado por GitHub Actions: `0c55c180846e6286e72d35f51e502278200ee0de`. Los seis workflows fueron `success`: CI (39244454840), Playwright E2E (39244454807), Security scan (39244454911), Semgrep SAST (39244454934), Project progress dashboard (39244454952) y Database migration validation (39244456648).
- Merge SHA: `3313bf4276563c6cdac52aa7902fa9ea36558014`. La consulta de workflows asociada al merge SHA no devolvió runs porque el conector filtra a eventos de PR; no afirmar que los seis workflows del merge SHA estén verificados. No se ejecutaron pruebas locales.
- Cambio acotado: solo `apps/api/src/index.test.ts`, 24 líneas añadidas. Usa una URL de base de datos sintética inválida; no contacta ni modifica una base real.
- No se tocaron secretos, billing, datos reales, Neon `main`, producción ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado, no instalado ni ejecutado.
- Estado del producto: **NO listo para producción**. Persisten endpoints comerciales incompletos, decisiones de identidad D1–D8 pendientes, matriz de permisos por aprobar, aislamiento multiempresa y flujos reales API+PostgreSQL por validar, idempotencia/concurrencia, requisitos fiscales y backup/restauración independiente por verificar.
- Rama `feat/neon-transaction-adapter`: divergida y desactualizada; no fusionar a ciegas. Recuperar solo cambios puntuales tras comparar con `main`.
- Siguiente paso: continuar con pruebas pequeñas de auth/sesión/autorización sin inventar políticas pendientes; mantener CI verificado por SHA exacto y coste objetivo $0. No desplegar producción ni mutar Neon `main` sin superar los gates documentados.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #39

## Estado verificado en GitHub

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `50c530084f8ce402d897962cbc7c4354c512e847` — https://github.com/BTF14/Micro-app/commit/50c530084f8ce402d897962cbc7c4354c512e847
- PR #39, prueba de que el error original de operación sobrevive cuando también falla el cierre del cliente: fusionada — https://github.com/BTF14/Micro-app/pull/39. Head probado: `134c9e14a5224d83c5f280dc501ae113d374c159`; merge SHA: `50c530084f8ce402d897962cbc7c4354c512e847`.
- Los seis workflows terminaron en `success` para el head exacto de PR #39 `134c9e14a5224d83c5f280dc501ae113d374c159`: CI (run 39243670711), Project progress dashboard (39243670742), Playwright E2E (39243670784), Database migration validation (39243670921), Semgrep SAST (39243670843) y Security scan (39243670950).
- PR #38 también está fusionada: https://github.com/BTF14/Micro-app/pull/38; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`. Sus seis workflows fueron `success` en el head exacto `527dd7cc62bcceae891add8100875cc395dd5cfa`.
- No se ejecutaron pruebas locales. Los resultados indicados son de GitHub Actions sobre los head SHA especificados. No se han verificado aquí workflows para el merge SHA de PR #39; no afirmar que el merge SHA esté completamente verde.
- No se desplegó producción, no se modificó Neon `main`, no se tocaron datos reales, secretos, facturación ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.
- Automatización diaria de continuidad creada previamente con ID `6ad4c8ce247881919e0c4e83e7358dcb`; verificar su estado en la plataforma si se necesita afirmar que está activa/ejecutándose. No es un bucle continuo en tiempo real.

## Estado funcional y bloqueos

La aplicación **NO está lista para producción**. Continúan pendientes: rutas comerciales completas para catálogo/proveedores/inventario/ventas/pagos/devoluciones/reportes; Google OAuth, allowlist y verificación de correo según las decisiones D1–D8 aún no aprobadas; matriz de permisos por rol; aislamiento multiempresa validado en todos los endpoints; pruebas reales de API + PostgreSQL para flujos de negocio; idempotencia y concurrencia de ventas/stock; cumplimiento fiscal; backups independientes y restauración ensayada; preview aislada y aprobación de lanzamiento.

## Próximos pasos

1. Continuar con pruebas de auth/sesión de alcance acotado sin inventar políticas de identidad o roles.
2. Revisar la rama `feat/neon-transaction-adapter` contra el `main` actual antes de cualquier decisión; no fusionarla a ciegas.
3. Mantener cambios pequeños en ramas/PR; exigir CI exitoso para el head SHA exacto y revisar diffs/reviews antes de merge.
4. Mantener el presupuesto objetivo en $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.
5. Corregir esta documentación al cerrar hitos; no usar snapshots históricos como evidencia del estado actual.

---

# Checkpoint de continuidad — 2026-10-19, después de PR #36

## Estado verificado

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `c15c2364cd19e55ac10b2331300e7a9f4b89813f` — https://github.com/BTF14/Micro-app/commit/c15c2364cd19e55ac10b2331300e7a9f4b89813f
- PR #35, checkpoint documental tras PR #34: fusionada — https://github.com/BTF14/Micro-app/pull/35. Merge SHA: `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36, validación estricta de hashes PBKDF2: fusionada — https://github.com/BTF14/Micro-app/pull/36. Head SHA probado por CI: `cf432de6d5e8752181bc1105e9d0e91384d5936c`; merge SHA: `c15c2364cd19e55ac10b2331300e7a9f4b89813f`.
- PR #36 cambió `apps/api/src/auth.ts` para rechazar hashes con campos `$` adicionales y valores de iteraciones no canónicos; añadió regresiones en `apps/api/src/auth.test.ts`.
- Los seis workflows de PR #36 terminaron en `success` para el head exacto `cf432de6d5e8752181bc1105e9d0e91384d5936c`:
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39241705903
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39241706090
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39241705951
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39241706070
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39241705989
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39241706068
- Los seis jobs consultados tras PR #34 (run IDs 39241150482, 39241150423, 39241150283, 39241150291, 39241150500 y 39241150556) reportaron `success`. La consulta disponible no devolvió metadatos suficientes para vincular cada run al SHA de merge `02c7cd61ef2e94545849746885dede12b2df7767`; no afirmar que ese SHA tiene checks confirmados hasta verificarlo por otro medio.
- No se ejecutaron pruebas locales en esta sesión. La evidencia de tests es GitHub Actions sobre el head de PR #36, no una ejecución local.
- No se desplegó producción ni se modificó Neon `main`; no se tocaron datos reales, secretos, billing ni Cantina-pos.

## Bloqueos de producto

- La aplicación NO está lista para producción: todavía no se ha verificado la implementación completa de rutas comerciales para catálogo, proveedores, inventario, ventas, pagos, devoluciones y reportes.
- Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen pendientes de aprobación; no inventar proveedor, política ni flujo de cuentas.
- La matriz de permisos por rol sigue pendiente de aprobación. No crear rutas comerciales asumiendo permisos.
- Playwright cubre smoke tests con API simulada; faltan pruebas E2E reales de API + PostgreSQL para flujos comerciales.
- Backups independientes y restauración real siguen sin verificarse. Revalidar protección de `main`; no asumir que está activada.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.

## Próximas acciones

1. Verificar los checks del SHA de merge `c15c2364cd19e55ac10b2331300e7a9f4b89813f` y registrar evidencia exacta si la plataforma la expone.
2. Continuar con pruebas de seguridad/auth de alcance pequeño, sin cambiar decisiones de identidad o permisos pendientes.
3. Mantener cambios en ramas + PR y esperar CI en el head SHA exacto antes de fusionar.
4. Actualizar este checkpoint y los documentos de estado tras cada cambio significativo.
5. Mantener coste objetivo $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates y autorizaciones requeridos por `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

# Checkpoint autoritativo — 2026-10-19, después de PR #31

> Revalidar GitHub en cada sesión antes de actuar; este bloque es un punto de partida, no sustituto de la verificación viva.

- Repositorio canónico: https://github.com/BTF14/Micro-app
- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 (matriz de decisiones de permisos por rol, todas pendientes de aprobación): https://github.com/BTF14/Micro-app/pull/30, fusionada.
- PR #31 (pruebas de sesiones/login cuando la organización está inactiva): https://github.com/BTF14/Micro-app/pull/31, fusionada; head de PR `cfb9f82a497b35aa5a27a4a9ea78476692cf254d`.
- Comprobación viva de Actions para el SHA exacto de main: 8 check-runs visibles: 6 success y 2 in_progress al momento de esta consulta; volver a verificar antes de declarar CI completamente verde.
  - Trivy filesystem and configuration scan: in_progress — https://github.com/BTF14/Micro-app/actions/runs/39176217202/job/117819320792
  - Cloudflare Pages: in_progress — https://github.com/BTF14/Micro-app/runs/117819318705
  - Chromium authentication smoke tests: success — https://github.com/BTF14/Micro-app/actions/runs/39175964317/job/117818569851
  - Trivy filesystem and configuration scan: success — https://github.com/BTF14/Micro-app/actions/runs/39175964296/job/117818569814
  - generate-progress: success — https://github.com/BTF14/Micro-app/actions/runs/39175964326/job/117818569804
  - postgres-migration: success — https://github.com/BTF14/Micro-app/actions/runs/39175964294/job/117818569740
  - JavaScript and TypeScript static analysis: success — https://github.com/BTF14/Micro-app/actions/runs/39175964287/job/117818569696
  - verify: success — https://github.com/BTF14/Micro-app/actions/runs/39175964298/job/117818569670
- PR #32 (esta actualización documental) está abierta: https://github.com/BTF14/Micro-app/pull/32; sus checks deben verificarse para el head SHA vigente antes de fusionar.
- No se ejecutaron pruebas locales en esta sesión. El estado de CI es evidencia de GitHub Actions, no certifica preparación comercial.
- Código verificado: `apps/api/src/index.ts` registra auth y health; aún no hay handlers HTTP comerciales para catálogo/productos, proveedores, compras, ventas, pagos ni movimientos de inventario.
- Autenticación: existen registro/login con contraseña, `/auth/me` y logout; Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen sin aprobar. No cambiar el modelo de registro ni inventar reglas de acceso.
- Permisos: `docs/sdd/role-permission-decision-matrix.md` está fusionado, pero cada celda sigue pendiente. No construir rutas comerciales asumiendo permisos por rol.
- La rama de Neon adapter no debe fusionarse ciegamente; la revisión anterior encontró 14 commits propios y 49 detrás de main, sin código único que justificara la fusión completa.
- Neon `main`: no se modificó. Backups independientes y restauración real: no verificados. Protección de branch main: estaba desactivada en la última comprobación; verificar de nuevo y no modificar sin necesidad/autoridad clara.
- Strix (`https://github.com/usestrix/strix.git`) solo está documentado; no instalado ni ejecutado.
- Límites: coste objetivo $0; no mezclar Cantina-pos; no secretos, correos, billing, datos reales, mutaciones en Neon main ni despliegues de producción sin superar los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

## Instrucciones obligatorias para la siguiente IA

1. Leer primero `AGENTS.md`, luego este checkpoint, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/CONSTITUTION.md`, `docs/PRODUCTION_READINESS.md` y `docs/BACKUP_AND_RECOVERY.md`.
2. Antes de cualquier cambio, comprobar en vivo el SHA de main, PR abiertas, checks del SHA exacto y estado de ramas. No usar los SHA históricos como evidencia actual.
3. Continuar autónomamente con cambios pequeños, reversibles y útiles; no pedir al usuario permisos ya concedidos. Documentar hallazgos y pruebas reales, sin afirmar que algo se ejecutó si solo se leyó el código.
4. Próxima prioridad técnica: diseñar el primer endpoint comercial solo después de obtener aprobación explícita de la matriz de roles; hasta entonces, revisar fallos de seguridad concretos, ampliar pruebas de infraestructura/auth sin cambiar la política de identidad, y preparar contrato/criterios de aceptación sin exponer rutas inseguras.
5. D1–D8 de identidad y matriz de permisos necesitan decisión del propietario. No inventar proveedor OAuth, allowlist, email/domains, bootstrap admin, vinculación de cuentas, permisos de roles ni fiscalidad.
6. No desplegar producción ni modificar Neon main hasta cumplir gates y recibir aprobación específica cuando corresponda. Mantener presupuesto $0 y no tocar datos reales.
7. Si la conversación se acerca al límite, actualizar este archivo, `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` y `docs/PROJECT_PLAN.md` en una rama/PR; incluir SHA, PR/merge, checks exactos, cambios, tests ejecutados/no ejecutados, riesgos y siguiente acción concreta. Abrir PR y esperar CI; no declarar merge sin evidencia.
8. No detener el trabajo solo por falta de una respuesta de “ok”. Detenerse únicamente ante decisión de producto necesaria, riesgo alto o bloqueo real; explicar la decisión mínima requerida.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #27

> **Esta sección prevalece sobre los snapshots históricos más abajo.** Verificar de nuevo GitHub antes de usar este estado en una sesión futura.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- PR #27, [refresco del checkpoint después de PR #26](https://github.com/BTF14/Micro-app/pull/27), está fusionada. Head revisado: `29f899a52346d342067cf8e1b22850d35aa48a69`; los ocho check-runs visibles en ese head terminaron en `success`.
- Para el merge commit de `main`, los siete checks consultados terminaron en `success`: [Cloudflare Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [smoke tests Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify/CI](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [análisis JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812) y [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No había PR abiertas en la consulta posterior al merge. No se ejecutaron pruebas locales en esta sesión; la evidencia indicada es de GitHub Actions para los SHA exactos.
- Estado del producto: **no listo para producción**. La API aún no registra handlers HTTP comerciales para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de aislamiento es un plan de aceptación, no evidencia de controles en rutas inexistentes.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 siguen pendientes de aprobación; roles/permisos por operación deben definirse antes de añadir rutas de negocio; no se han verificado backups/restauración independiente; la protección de `main` estaba desactivada en la última comprobación.
- Límites mantenidos: presupuesto $0, proyecto independiente de Cantina-pos, sin secretos ni correos, sin cambios a Neon `main`, sin despliegue de producción. Strix sigue documentado, no instalado ni ejecutado.
- Próximo paso seguro: continuar la revisión del adaptador Neon sin merge ciego y preparar una matriz explícita de permisos por rol para que el primer endpoint comercial tenga pruebas positivas y negativas de aislamiento; no inventar políticas pendientes.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #26

> **Esta sección prevalece sobre todos los snapshots históricos más abajo.** Los SHA, estados de PR y enlaces de Actions antiguos que aparezcan en el resto de este archivo no representan el estado vivo actual salvo que coincidan con una verificación nueva de GitHub.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c` — https://github.com/BTF14/Micro-app/commit/a3cc3ae7533510baf2502a3f553030c2c8505a4c
- PR #24 (matriz de aislamiento tenant), PR #25 (refresco documental) y PR #26 (checkpoint documental) están fusionadas.
- PR #26: https://github.com/BTF14/Micro-app/pull/26; head `a5576ae3db9b606bbb69fa3c7f34006e6585934e`; sus siete workflows consultados terminaron en `success`.
- Para el SHA exacto de `main` `a3cc3ae7533510baf2502a3f553030c2c8505a4c`, los seis workflows consultados terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39133032751), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39133032760), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39133032817), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39133032755), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39133032686) y [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No hay PR abiertas en la consulta actual. No se desplegó producción ni se modificó Neon `main`.
- Estado de producto: **no listo para producción**. `apps/api/src/index.ts` todavía no registra handlers HTTP de negocio para catálogo/productos, proveedores, ventas, pagos o movimientos de inventario; la matriz de tenant define criterios futuros, no evidencia de endpoints ya protegidos.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 pendientes de aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última verificación; faltan flujos POS/inventario reales y pruebas de autorización completas.
- Límites: presupuesto $0, no mezclar con Cantina-pos, no secretos ni correos, no migraciones a Neon `main` sin superar el gate de `docs/CONSTITUTION.md`, no despliegue de producción sin aceptación explícita.
- Próximo trabajo seguro: abordar identidad solo tras resolver D1–D8; mientras tanto, ampliar cobertura de autorización y preparar endpoints de negocio en entorno aislado, sin inventar políticas de registro ni OAuth.

---


# Estado vigente verificado — Micro app

**Checkpoint actualizado:** 2026-10-18.  
**HEAD de `main` verificado:** `69032a333b52ee10099c0347be3443e18f4dc4df` — [commit](https://github.com/BTF14/Micro-app/commit/69032a333b52ee10099c0347be3443e18f4dc4df).  
**PR #24 fusionada:** [matriz de aceptación para aislamiento tenant](https://github.com/BTF14/Micro-app/pull/24). Su head `e7856319321f1aa1047148fd782fcadb77f091c2` tuvo los siete workflows asociados en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39132363061), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39132363092), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39132363114), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39132363103), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39132363026) y los dos escaneos de seguridad ([1](https://github.com/BTF14/Micro-app/actions/runs/39132362959), [2](https://github.com/BTF14/Micro-app/actions/runs/39132359995)).  
**Checks del merge commit:** seis workflows detectados; el panel de progreso ya pasó y CI, Playwright, seguridad, Semgrep y validación de migraciones seguían en ejecución en la última consulta. Verificar su estado para este SHA antes de concluir que el merge commit está verde.

**Hallazgo de autorización:** `apps/api/src/index.ts` registra health y rutas de autenticación. No hay handlers HTTP de negocio para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de `docs/TENANT_ISOLATION_TEST_PLAN.md` define aceptación futura; no demuestra aislamiento funcional en endpoints que aún no existen.

**Bloqueos:** Google OAuth + allowlist y decisiones D1–D8 siguen sin aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última lectura; no desplegar producción ni modificar Neon `main` sin superar los gates de la Constitución. Los workflows verdes de documentación no certifican preparación para producción.

---


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
