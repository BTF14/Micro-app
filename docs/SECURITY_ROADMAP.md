## Estado vivo de identidad y hardening — 2026-10-29

- PR #153 está fusionada en main; bootstrap OAuth ya no acepta secretos por query string: GET rechaza parámetros de bootstrap y el alta inicial usa POST con validación de Origin/content-type/cuerpo/campos y token de un solo uso, además de state/PKCE y cookies temporales HttpOnly. No hay evidencia de filtración activa.
- PR #155 está fusionada en main: `FRONTEND_ORIGIN` para Google OAuth exige HTTPS, salvo HTTP en loopback de desarrollo, y rechaza credenciales, path, query, hash y origen no canónico.
- Esto corrige las notas históricas inferiores que describían bootstrap y HTTPS como cambios pendientes. No implica despliegue productivo ni que toda la identidad esté lista para operar comercialmente.
- La autenticación Google/allowlist tiene implementación en código; siguen pendientes autorización comercial por operación, aislamiento cross-tenant de rutas de negocio (porque aún no hay endpoints comerciales), matriz de roles aprobada, controles de abuso en el contexto completo de la API y los demás gates P0/P1 de esta hoja.
- **Hallazgo adicional de revisión estática 2026-10-30:** `auth_rate_limits` está definido en SQL, pero no se encontró implementación/callsite runtime en `apps/api/src`. No afirmar que las rutas OAuth/bootstrap tienen rate limiting. Verificar reglas Cloudflare por separado y añadir control distribuido probado antes de ampliar acceso.
- **Protección de `main` — precisión de estado 2026-10-30:** la sección histórica inferior registra que el 2026-10-26 la API confirmó PR obligatoria, seis checks y una aprobación requerida. En esta sesión, la lectura actual de `/branches/main/protection` devolvió HTTP 403 `Resource not accessible by integration`; por tanto, esa configuración no se pudo revalidar hoy. No afirmar que está activa hoy sin una nueva lectura autorizada. La política recomienda conservar al menos una aprobación independiente.
- Verificar siempre el SHA vivo de main y los workflows exactos antes de marcar controles como completados.

---

## ESTADO VIVO — mitigación de bootstrap propuesta en rama (2026-10-29 UTC)

- PR #152 ya está fusionada; merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`.
- El riesgo de secreto en URL tiene una corrección en curso en `fix/bootstrap-token-post-body-20261029`: GET rechaza los parámetros de bootstrap; POST exige Origin del frontend, content type de formulario, campos únicos permitidos, cuerpo máximo 2 KiB y token correcto antes de iniciar OAuth.
- **No marcar como corregido aún:** rama sin fusionar; falta revisar diff y esperar todos los checks del SHA final. No hay evidencia de filtración activa.
- La prueba no toca Neon ni requiere secretos reales; usa el token sintético de integración.

---

## ESTADO VIVO — restauración real verificada y bloqueos de seguridad vigentes (2026-10-29 UTC)

- La restauración técnica de la copia remota exacta `daily/backup-2026-10-29T17-29-48Z.dump.age` quedó verificada en [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): checksum independiente, descifrado y restauración en PostgreSQL 18 efímero.
- Esto supera las notas históricas que decían que la restauración de la copia real estaba pendiente. No demuestra conteos/relaciones de datos comerciales poblados, RPO/RTO, alerta de fallo ni coste total $0; esos puntos siguen abiertos.
- La PR [#151](https://github.com/BTF14/Micro-app/pull/151) está fusionada y documenta guardrails de capacidad. El límite de organizaciones/sucursales sigue sin medir.
- **Bloqueo de negocio:** `docs/sdd/role-permission-decision-matrix.md` sigue explícitamente sin aprobación del propietario. No implementar permisos comerciales basados solo en la propuesta de IA.
- La API de la base auditada aún no tiene handlers comerciales HTTP; no hay pruebas cross-tenant reales para ventas/inventario porque esos endpoints no existen.
- No tocar Neon `main`, secretos ni producción. Conservar las notas históricas inferiores como historial, pero no usarlas como estado vivo cuando contradigan esta sección.

---

## Monitorización diaria de dependencias — corrección del informe en curso (2026-10-29)

- Workflow: `.github/workflows/daily-dependency-watch.yml`; cron diario 08:15 UTC, ejecución manual, permisos `contents: read`, instalación congelada y auditoría de vulnerabilidades.
- El run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) terminó en `success` y `pnpm audit --audit-level high` informó `No known vulnerabilities found`.
- La inspección de logs detectó un defecto de presentación: Bash interpretó backticks dentro de cadenas con comillas dobles y el informe de `pnpm outdated -r` quedó vacío. No considerar completa la información de actualizaciones por ese run.
- La fiabilidad del mantenimiento de dependencias se corrigió y fusionó mediante PR #141 (`fix: make dependency maintenance workflows reliable`); la actualización segura de tooling Cloudflare se integró en PR #142. No queda pendiente esa rama histórica.
- Dependabot continúa revisando semanalmente npm y GitHub Actions. El monitor diario es de solo lectura: no modifica dependencias ni crea PR automáticamente.
- El monitor no reemplaza Trivy, Dependency Review, escaneo de historial, revisión manual del diff ni pruebas completas; tampoco garantiza ausencia de vulnerabilidades.

# Hoja de ruta de seguridad — Micro app

- Estado: aprobada por el propietario el 2026-10-26.
- Principio rector, en palabras del propietario: **no se busca rapidez, se busca que todo salga bien y sin errores, con todos los protocolos de seguridad y ciberseguridad implementados**, pensando en que el proyecto puede escalar a varias personas a largo plazo.
- Esto no reemplaza `docs/CONSTITUTION.md` ni `docs/BACKUP_AND_RECOVERY.md`; los complementa con una lista concreta y priorizada de qué falta y en qué orden. `docs/COMPLIANCE_AND_ACCESSIBILITY.md` es un anexo en el mismo espíritu, enfocado en cumplimiento legal/privacidad y accesibilidad (WCAG).

Toda IA/chat que continúe este proyecto debe leer este documento como parte de la secuencia de arranque de `AGENTS.md`, y no debe saltarse ni relajar ninguno de estos puntos para ir más rápido, salvo instrucción explícita y nueva del propietario.

## Nivel 1 — Antes de seguir con el módulo de negocio (inventario/ventas)

### 1. Protección de la rama `main` en GitHub
**Último estado histórico verificado: 2026-10-26; no revalidado el 2026-10-30.** El propietario lo configuró manualmente (la IA no pudo por el bloqueo de proxy ya documentado). La lectura de aquella fecha registró: PR obligatorio, 6 status checks (`verify`, `Chromium authentication smoke tests`, `postgres-migration`, `JavaScript and TypeScript static analysis`, `Trivy filesystem and configuration scan`, `Scan tracked files and reachable Git history`), resolución de conversaciones obligatoria, `enforce_admins: true`, force-push y deletions deshabilitados. La consulta actual del endpoint de protección devolvió HTTP 403 `Resource not accessible by integration`; no presentar la configuración histórica como una verificación viva actual.

**Discrepancia detectada, pendiente de decisión del propietario:** el propietario reportó haber dejado "0 aprobaciones mínimas" para desarrollo fluido, pero la API en vivo devuelve `required_approving_review_count: 1`. Esto significa que, hasta que se corrija, **cada PR necesita que alguien con acceso de escritura lo apruebe en GitHub antes de poder fusionarse** — la IA no puede auto-aprobar sus propios PR (y tampoco podría cambiarlo vía API: se reintentó el PATCH y el mismo proxy lo bloquea). Si el propietario de verdad quiere 0 aprobaciones, debe ajustarlo él mismo en `Settings → Branches → main → Require approvals`. Recomendación de la IA: mantenerlo en 1 — sin una revisión humana mínima, la protección de rama se reduce a "pasar el CI", que ya se exigía antes; el valor añadido de branch protection para un proyecto que "puede escalar a varias personas" es justamente que una persona revise antes de fusionar.

La política vigente mantiene los cambios documentales en PR y no permite push directo a `main`; verificar las reglas actuales antes de depender de sus gates.

### 2. Respaldo automático e independiente de la base de datos
**Estado: en progreso (2026-10-26).** Avance concreto de esta sesión:
- Creado en Neon un rol de solo lectura dedicado para respaldos, `backup_readonly` (proyecto `restless-fire-99110035`, rama `main`/`br-summer-math-b7297a60`, base `neondb`), con `SELECT` únicamente sobre las tablas de negocio y `ALTER DEFAULT PRIVILEGES` para que las tablas futuras también queden en solo lectura automáticamente. Verificado con una consulta a `information_schema.role_table_grants`: solo aparece `SELECT`, nunca `INSERT`/`UPDATE`/`DELETE`. Decisión de diseño: el `pg_dump` del backup debe excluir explícitamente `auth_sessions` (tokens de sesión activos) y `auth_rate_limits` (datos efímeros) — no son necesarios para reconstruir el negocio y no tiene sentido llevar tokens de sesión a un destino externo cifrado, aunque esté cifrado.
- Generado un par de llaves `age` para cifrar el volcado. La llave **pública** (no es secreta, se puede commitear) es `age1t04pgcguy87u99r4stlm0gcjsk9dj2s34jsmymw55vlarfteuakse8jmfk` — el workflow de GitHub Actions solo necesita esta para cifrar. La llave **privada** se le entregó al propietario una sola vez por chat y se borró de este entorno inmediatamente; sin ella nadie —ni esta IA— puede descifrar los respaldos. El propietario debe guardarla en un gestor de contraseñas; si se pierde, los respaldos pasados quedan irrecuperables (hay que regenerar el par y los respaldos futuros usarán la llave nueva).
- **Bloqueante nuevo, pendiente de decisión explícita del propietario:** Cloudflare R2 todavía no está habilitado en la cuenta (`r2_buckets_list` devolvió `10042: Please enable R2 through the Cloudflare Dashboard`). Por experiencia conocida de la plataforma, habilitar R2 por primera vez suele exigir vincular una tarjeta de pago a la cuenta de Cloudflare, incluso si el uso se mantiene después dentro del tier gratuito — esto no se pudo confirmar al 100% desde aquí porque la página de activación requiere sesión en el dashboard, así que el propietario debe verificarlo él mismo al entrar a *R2 → Overview*. Esto choca potencialmente con la restricción explícita del proyecto de **no tarjetas, no billing**. Dos caminos, pendientes de que el propietario elija uno:
  1. **R2** (como proponía el blueprint): si al entrar al dashboard confirma que puede habilitar R2 sin tarjeta, o está dispuesto a vincular una tarjeta y configurar una alerta de presupuesto en $0 para dormir tranquilo de que nunca se cobra nada mientras se mantenga bajo 10 GB.
  2. **Repositorio privado de GitHub dedicado solo a respaldos cifrados** (alternativa $0 real, sin tarjeta, sin proveedor nuevo): un segundo repositorio privado en la misma cuenta de GitHub, al que el workflow empuja únicamente el volcado cifrado de cada día (nunca código de la app). Como el volcado ya va cifrado con `age` antes de salir de GitHub Actions, el repositorio en sí no necesita ser tratado como secreto. Requiere política de retención manual (podar commits viejos) para que el repositorio no crezca indefinidamente.
- **Decisión tomada (2026-10-27): el propietario confirmó que Cloudflare pide tarjeta para habilitar R2**, así que se descarta R2 y se adopta la alternativa sin tarjeta: repositorio privado dedicado [`BTF14/micro-app-backups`](https://github.com/BTF14/micro-app-backups), creado manualmente por el propietario (esta IA no puede crear repositorios nuevos desde este entorno — solo opera sobre los repositorios ya configurados en la sesión).
- **Workflow implementado**: `.github/workflows/backup.yml` (este cambio). Todos los días a las 03:00 hora de Venezuela, hace `pg_dump` con `backup_readonly` excluyendo `auth_sessions`/`auth_rate_limits`, cifra con la llave pública `age` del punto anterior, sube el archivo cifrado a `micro-app-backups/daily/` usando el secreto `BACKUP_REPO_TOKEN` (token de acceso de solo ese repositorio, creado por el propietario), y borra del repositorio de respaldos lo que tenga más de 15 días.
- **Generación, cifrado, subida y checksum verificados** en la ejecución real del 2026-10-27 ([run 40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159)).
- **Restauración técnica verificada el 2026-10-29** en PostgreSQL desechable ([run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)): checksum y descifrado correctos, restauración completada, 13 tablas esperadas, 186 constraints presentes, 0 membresías huérfanas y tablas de sesión excluidas.
- **Estado: parcialmente verificado; no marcar aún como cerrado.** La copia probada tenía vacías las tablas de productos, ventas, pagos, movimientos, tipos de cambio, proveedores y auditoría; no demuestra recuperación de datos comerciales poblados. La retención de 15 días tiene pruebas unitarias y el workflow publica un resumen visible en Actions si falla un paso; esto no es notificación externa. Pendientes: verificar la siguiente ejecución y el checksum de la copia reciente, decidir si hacen falta notificaciones externas, probar datos sintéticos poblados, medir RPO/RTO y confirmar coste $0. Ver `docs/BACKUP_AND_RECOVERY.md`, secciones 6 y 8.

### 3. Dependabot
**Estado: implementado** en `.github/dependabot.yml` (este cambio). Cubre actualizaciones semanales de dependencias npm/pnpm (agrupando parches y menores en un solo PR, dejando los mayores sin agrupar para revisión individual) y de las GitHub Actions usadas en los workflows.

### 4. Cabeceras de seguridad
**Estado: implementado** (este cambio):
- Frontend (Cloudflare Pages): `apps/web/public/_headers` agrega `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy` a toda respuesta.
- API (Cloudflare Worker): middleware en `apps/api/src/index.ts` agrega `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` a toda respuesta, y `Cache-Control: no-store` específicamente en las rutas `/auth/*` para que ningún caché/proxy intermedio sirva por error la respuesta de sesión de un usuario a otro.

## Nivel 2 — Antes de dar acceso al primer empleado

5. **Matriz de permisos por rol — APROBADA el 2026-10-31** (`docs/sdd/role-permission-decision-matrix.md`): el propietario decidió explícitamente ventas/descuentos, devoluciones/anulaciones y gestión de miembros/políticas; delegó explícitamente en la IA, con criterio técnico fundamentado, catálogo/inventario, caja y reportes/auditoría. La aprobación habilita, pero no sustituye, la implementación. Ningún endpoint de negocio (ventas, inventario) debe fusionarse a `main` sin pruebas automatizadas de aislamiento cross-tenant y de rol cubriendo esa tabla; hasta entonces este punto permanece **aplicar: pendiente**, solo la decisión está **aprobada**.
6. **Pruebas negativas de aislamiento entre negocios (multi-tenant)**: confirmar con pruebas automatizadas que un usuario del negocio A nunca puede leer ni escribir datos del negocio B, ni siquiera manipulando IDs en la URL/body. Ya es requisito de `docs/CONSTITUTION.md`; hacerlo bloqueante antes de exponer cualquier endpoint de negocio real.
7. **Registro de auditoría** para acciones sensibles (cambios de precio, anulación de ventas, eliminación de productos/usuarios): quién, qué, cuándo. Sin esto, con varias personas con acceso, no hay forma de reconstruir qué pasó ante un error o un fraude.
8. **Flujo real de invitación de usuarios**, en vez de inserciones manuales en Neon. Ver el patrón SQL actual (manual) en `docs/CURRENT_STATE.md`.
8.1. **Diseño de "derecho al olvido" sin romper el libro de movimientos**: al construir el flujo de baja de usuarios, anonimizar el vínculo personal en auditoría/ventas sin borrar el registro financiero en sí. Detalle y motivo en `docs/COMPLIANCE_AND_ACCESSIBILITY.md` punto 12.
8.2. **Foco atrapado en el modal de ayuda** (`HelpModal` en `apps/web/src/App.tsx`): hoy `Tab` puede salirse del modal hacia el fondo de la página, y el foco no vuelve al elemento que lo abrió al cerrarlo. Barato de arreglar, no bloqueante. Detalle en `docs/COMPLIANCE_AND_ACCESSIBILITY.md` punto 20.

## Nivel 3 — Cuando el equipo crezca de verdad

9. Límite de intentos fallidos / protección contra fuerza bruta en `GET /auth/google` y `GET /auth/google/callback`.
10. Revisión periódica (mensual) de `auth_allowlist`: desactivar de inmediato a quien deje de trabajar en el negocio.
11. Política interna (no técnica, pero documentada aquí): exigir verificación en dos pasos en las cuentas de Google de todo el personal con acceso.
12. Si el sistema llega a guardar datos personales de **clientes** (no solo del negocio), reemplazar el aviso básico de privacidad actual (en el centro de ayuda de la app) por una política revisada por un abogado.

## Cómo usar este documento

- Cada vez que se complete un punto, actualizar su "Estado" aquí mismo (no basta con mencionarlo en el journal) y referenciarlo desde el checkpoint correspondiente de `docs/CURRENT_STATE.md`.
- No marcar nada como "implementado" sin evidencia verificada (igual que el resto de `AGENTS.md`): un PR fusionado con los checks en verde, o una confirmación explícita del propietario para los pasos que requieren su acción manual.
- Si un futuro chat necesita ir más rápido por alguna razón, debe pedir confirmación explícita del propietario antes de saltarse cualquier punto de este documento — la instrucción vigente es priorizar que todo esto quede bien hecho sobre la velocidad.


---

## Actualizaciones de runtime y cadena de suministro — regla vigente (2026-10-29)

La actualización frecuente reduce exposición a vulnerabilidades conocidas solo si se combina con advisories, lockfile reproducible, revisión de compatibilidad y pruebas. La versión más nueva no es por sí sola una garantía de seguridad.

- Mantener actualizados parches y releases compatibles; revisar Dependabot, Dependency Review, Trivy y avisos oficiales.
- Para upgrades mayores (TypeScript 7, Vite 8, plugin-react 6, jsdom 30), revisar breaking changes, engines/peer dependencies y ejecutar toda la suite en una sola rama coherente.
- Mantener Node en la línea LTS 24 por ahora; aplicar el último parche 24.x tras verificar CI. No cambiar a Node 26 ni actualizar pnpm a major 12 sin prueba de compatibilidad/lockfile.
- No usar versiones beta, RC, canary o nightly para runtime de producción sin una excepción explícita y una justificación documentada.
- Preservar siempre overrides.undici = 7.30.1 tanto en package.json como en pnpm-lock.yaml. Una actualización que lo elimine o resuelva undici 7.29.1 debe rechazarse.
- No editar manualmente resoluciones del lockfile. Usar pnpm, --frozen-lockfile en CI y Dependency Review.
- Registrar en CURRENT_STATE/HANDOFF el número de versión declarada y resuelta, fecha de consulta, fuente y SHA verificado; distinguir versión publicada de versión realmente fusionada.
- Cloudflare recomienda evaluar wrangler types para generar tipos según compatibility date/configuración; no mezclar esa migración con un upgrade masivo sin pruebas.
- El inventario de versiones y plan de migración al 2026-10-29 se encuentra en docs/CURRENT_STATE.md y docs/HANDOFF_NEXT_CHAT.md.


## 2026-10-29 — recuperación con datos sintéticos: implementación en verificación

- Las PR #140 y #142 se fusionaron y los checks post-merge en `c87893313534049463917af5ee17dfd36ba319c4` terminaron en `success`.
- La prueba sintética poblada pasó en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, manifiesto y relaciones preservadas, y exclusión de tablas efímeras. Siguen pendientes RPO/RTO de extremo a extremo, alerta de fallo y confirmación de coste $0; no se ha probado restauración integral de una copia real.
- Se añade en la rama `test/backup-restore-synthetic-20261029` un workflow mensual/manual de backup-restore smoke test con PostgreSQL efímero, fixture sintético, clave age temporal, checksum, comparación de manifiesto de 13 tablas y relaciones, y exclusión de tablas efímeras de auth. No usa secretos, Neon ni datos reales.
- Estado de este punto: **en verificación** hasta ver CI verde para el SHA exacto. La prueba sintética no sustituye el RPO/RTO real ni la recuperación operativa de una copia de producción.


## Estado vivo — 2026-10-29 UTC, recuperación y dependencias

- PR #143 añadió el smoke test sintético de backup/restore. El run [40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) terminó en `success` para SHA `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Verifica datos sintéticos relacionados, checksum, cifrado/descifrado, manifiesto de 13 tablas/constraints/relaciones y exclusión de tablas efímeras.
- El punto de backup continúa **parcialmente verificado**: no se han medido RPO/RTO reales ni probado la alerta de fallo y el coste $0; no confundir el laboratorio sintético con la restauración integral de una copia real.
- PR #142 actualizó Wrangler y workers-types a versiones compatibles y fijó Node en `>=24.22.2 <25`, manteniendo TypeScript 5, Vite 7 y `undici@7.30.1`.
- El monitor diario [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) reportó `No known vulnerabilities found` en SHA anterior a #142. Detectó majors estables de Vite, plugin React, jsdom y TypeScript; evaluar compatibilidad antes de actualizar, sin hacer upgrades masivos a ciegas.
- La rama de corrección del monitor `fix/dependency-watch-report-20261029` ya no contiene cambios exclusivos frente a `main` (0 ahead, 4 behind); no abrir una PR redundante. La siguiente ejecución programada debe informar las versiones actuales tras #142.


### Backup workflow incident — 2026-10-29

Snapshot histórico: el manual run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763) generó/cifró/checksum un dump, pero falló antes de subirlo por una ruta incorrecta del script de retención. La corrección se integró en PR #143 (merged 2026-10-29); el run fallido no alteró backups remotos ni ejecutó retención. La validación posterior de backup/restore está documentada por los runs 40955935124 (restore remoto exacto en PG18) y 41020548699 (smoke sintético cifrado PG18).


## Actualización 2026-10-29 — consistencia HTTPS de FRONTEND_ORIGIN

- **Hallazgo:** el helper local de `apps/api/src/google-auth.ts` no exigía HTTPS ni restringía HTTP a loopback, a diferencia del validador de `apps/api/src/index.ts`. No hay evidencia de explotación; clasificado como hardening de configuración P1 antes de habilitar bootstrap en condiciones reales.
- **Corrección implementada y fusionada en PR #155 (2026-10-29):** aplica el mismo allowlist de protocolos/hosts y rechaza credenciales, rutas, query, fragmentos y representaciones no canónicas. El código está en main; no reabrir la rama histórica.
- **Pruebas:** HTTPS válido; HTTP loopback permitido para desarrollo; HTTP remoto, credenciales y URL con path/query/hash rechazados.
- **Estado:** corrección HTTPS/canonical frontend origin para Google OAuth integrada en PR #155 (merged 2026-10-29); no reabrir la rama histórica. La implementación no significa que la API tenga endpoints comerciales.
- **Alcance excluido:** no cambia secrets, OAuth provider, bootstrap, DB, producción ni despliegues manuales.


## Estado de seguridad posterior a PR #155 — 2026-10-29 UTC

- PR #153 (bootstrap POST sin secreto en URL) y PR #155 (validación HTTPS de FRONTEND_ORIGIN) están fusionadas en main.
- PR #155 SHA verificado: `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`; ocho workflows finalizaron success, incluidos CI y Playwright. Codex review no se completó por límite de uso; no se afirma revisión independiente.
- Cloudflare informó previews de Pages/Workers para el commit; no hay evidencia de despliegue productivo ni prueba HTTP contra producción.
- Siguen P0/P1 de producto: autorización por operación, aislamiento cross-tenant end-to-end, matriz de roles aprobada, límites de abuso/rate limiting revisados, integridad transaccional/idempotencia y recuperación operativa. No abrir módulos comerciales antes de estos gates.
- No hay evidencia de explotación del hallazgo HTTPS anterior; se corrigió en código main. La corrección no sustituye verificación de configuración productiva.

---