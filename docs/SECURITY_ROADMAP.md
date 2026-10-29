## Monitorización diaria de dependencias — corrección del informe en curso (2026-10-29)

- Workflow: `.github/workflows/daily-dependency-watch.yml`; cron diario 08:15 UTC, ejecución manual, permisos `contents: read`, instalación congelada y auditoría de vulnerabilidades.
- El run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589) terminó en `success` y `pnpm audit --audit-level high` informó `No known vulnerabilities found`.
- La inspección de logs detectó un defecto de presentación: Bash interpretó backticks dentro de cadenas con comillas dobles y el informe de `pnpm outdated -r` quedó vacío. No considerar completa la información de actualizaciones por ese run.
- La rama `fix/dependency-watch-report-20261029` corrige el formato y consulta `pnpm -r outdated --latest` para exponer también actualizaciones mayores. El arreglo sigue pendiente de CI y de un nuevo run del código corregido.
- Dependabot continúa revisando semanalmente npm y GitHub Actions. El monitor diario es de solo lectura: no modifica dependencias ni crea PR automáticamente.
- El monitor no reemplaza Trivy, Dependency Review, escaneo de historial, revisión manual del diff ni pruebas completas; tampoco garantiza ausencia de vulnerabilidades.

# Hoja de ruta de seguridad — Micro app

- Estado: aprobada por el propietario el 2026-10-26.
- Principio rector, en palabras del propietario: **no se busca rapidez, se busca que todo salga bien y sin errores, con todos los protocolos de seguridad y ciberseguridad implementados**, pensando en que el proyecto puede escalar a varias personas a largo plazo.
- Esto no reemplaza `docs/CONSTITUTION.md` ni `docs/BACKUP_AND_RECOVERY.md`; los complementa con una lista concreta y priorizada de qué falta y en qué orden. `docs/COMPLIANCE_AND_ACCESSIBILITY.md` es un anexo en el mismo espíritu, enfocado en cumplimiento legal/privacidad y accesibilidad (WCAG).

Toda IA/chat que continúe este proyecto debe leer este documento como parte de la secuencia de arranque de `AGENTS.md`, y no debe saltarse ni relajar ninguno de estos puntos para ir más rápido, salvo instrucción explícita y nueva del propietario.

## Nivel 1 — Antes de seguir con el módulo de negocio (inventario/ventas)

### 1. Protección de la rama `main` en GitHub
**Estado: implementado (2026-10-26), verificado en vivo vía API.** El propietario lo configuró manualmente (la IA no pudo por el bloqueo de proxy ya documentado). Verificación en vivo (`GET /repos/BTF14/Micro-app/branches/main/protection`) confirma: PR obligatorio antes de fusionar, 6 status checks obligatorios (`verify`, `Chromium authentication smoke tests`, `postgres-migration`, `JavaScript and TypeScript static analysis`, `Trivy filesystem and configuration scan`, `Scan tracked files and reachable Git history`), resolución de conversaciones obligatoria, `enforce_admins: true` (nadie puede saltarse la regla, ni con push directo), force-push y deletions deshabilitados.

**Discrepancia detectada, pendiente de decisión del propietario:** el propietario reportó haber dejado "0 aprobaciones mínimas" para desarrollo fluido, pero la API en vivo devuelve `required_approving_review_count: 1`. Esto significa que, hasta que se corrija, **cada PR necesita que alguien con acceso de escritura lo apruebe en GitHub antes de poder fusionarse** — la IA no puede auto-aprobar sus propios PR (y tampoco podría cambiarlo vía API: se reintentó el PATCH y el mismo proxy lo bloquea). Si el propietario de verdad quiere 0 aprobaciones, debe ajustarlo él mismo en `Settings → Branches → main → Require approvals`. Recomendación de la IA: mantenerlo en 1 — sin una revisión humana mínima, la protección de rama se reduce a "pasar el CI", que ya se exigía antes; el valor añadido de branch protection para un proyecto que "puede escalar a varias personas" es justamente que una persona revise antes de fusionar.

Una vez resuelto esto, los checkpoints de documentación que hasta ahora se empujaban directo a `main` también deben pasar por PR — es más lento, pero es exactamente lo que el propietario pidió priorizar.

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

5. **Aprobar y aplicar la matriz de permisos por rol** (`docs/sdd/role-permission-decision-matrix.md`, pendiente desde hace varias sesiones). Ningún endpoint de negocio (ventas, inventario) debe construirse sin que esta matriz esté aprobada primero.
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
