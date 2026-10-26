# Hoja de ruta de seguridad — Micro app

- Estado: aprobada por el propietario el 2026-10-26.
- Principio rector, en palabras del propietario: **no se busca rapidez, se busca que todo salga bien y sin errores, con todos los protocolos de seguridad y ciberseguridad implementados**, pensando en que el proyecto puede escalar a varias personas a largo plazo.
- Esto no reemplaza `docs/CONSTITUTION.md` ni `docs/BACKUP_AND_RECOVERY.md`; los complementa con una lista concreta y priorizada de qué falta y en qué orden.

Toda IA/chat que continúe este proyecto debe leer este documento como parte de la secuencia de arranque de `AGENTS.md`, y no debe saltarse ni relajar ninguno de estos puntos para ir más rápido, salvo instrucción explícita y nueva del propietario.

## Nivel 1 — Antes de seguir con el módulo de negocio (inventario/ventas)

### 1. Protección de la rama `main` en GitHub
**Estado: pendiente, requiere acción manual del propietario.** Se intentó configurar vía API (`PUT /repos/BTF14/Micro-app/branches/main/protection`) con el token de esta sesión, que sí tiene permiso `admin` sobre el repositorio, pero la solicitud fue rechazada por el proxy de red del entorno de este agente con `403 Write access to this GitHub API path is not permitted through this proxy`. Es una restricción del entorno de la IA, no de GitHub ni del repositorio. Pasos para que el propietario lo active manualmente:

1. Ir a `github.com/BTF14/Micro-app` → **Settings** → **Branches**.
2. En "Branch protection rules", agregar una regla para `main`.
3. Activar: "Require a pull request before merging" (0 aprobaciones mínimas está bien para un equipo pequeño, pero fuerza que todo pase por PR).
4. Activar: "Require status checks to pass before merging" y seleccionar al menos: `verify`, `Chromium authentication smoke tests`, `postgres-migration`, `JavaScript and TypeScript static analysis`, `Trivy filesystem and configuration scan`, `Scan tracked files and reachable Git history`.
5. Activar: "Require conversation resolution before merging".
6. Activar: "Do not allow bypassing the above settings" (incluye a administradores, para que ni siquiera yo pueda saltarme la regla con push directo).
7. Desactivar "Allow force pushes" y "Allow deletions".
8. En **Settings** → **Code security and analysis**, activar también "Secret scanning" y "Push protection" si no están activos (son gratis en repos públicos).

Una vez activado esto, los checkpoints de documentación que hasta ahora se empujaban directo a `main` también deberán pasar por PR — es más lento, pero es exactamente lo que el propietario pidió priorizar.

### 2. Respaldo automático e independiente de la base de datos
**Estado: pendiente de implementación.** Neon Free solo ofrece una ventana corta de recuperación puntual (PITR), que no es un respaldo real. Diseño propuesto, dentro del presupuesto $0:
- Un workflow de GitHub Actions programado (cron diario) que ejecute `pg_dump` contra Neon usando una cadena de conexión guardada como secreto de GitHub Actions (nunca en el código).
- El volcado se cifra (por ejemplo con `age` o `gpg` simétrico, con la clave también como secreto de GitHub Actions) antes de subirse.
- Destino: un bucket de Cloudflare R2 (gratis hasta 10 GB, más que suficiente para esta base de datos), nunca un artifact/release de GitHub ni el propio repositorio.
- Política de retención: conservar al menos 15 días de respaldos diarios; borrar los más viejos para no exceder el tier gratuito.
- Verificación periódica (cada 15 días, como ya pide `docs/BACKUP_AND_RECOVERY.md`): restaurar un respaldo en una rama Neon desechable y confirmar que los datos cargan correctamente.
- Siguiente paso técnico concreto: crear el bucket R2, generar las credenciales S3-compatibles, y escribir el workflow. No se ha hecho todavía en esta sesión.

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

## Nivel 3 — Cuando el equipo crezca de verdad

9. Límite de intentos fallidos / protección contra fuerza bruta en `GET /auth/google` y `GET /auth/google/callback`.
10. Revisión periódica (mensual) de `auth_allowlist`: desactivar de inmediato a quien deje de trabajar en el negocio.
11. Política interna (no técnica, pero documentada aquí): exigir verificación en dos pasos en las cuentas de Google de todo el personal con acceso.
12. Si el sistema llega a guardar datos personales de **clientes** (no solo del negocio), reemplazar el aviso básico de privacidad actual (en el centro de ayuda de la app) por una política revisada por un abogado.

## Cómo usar este documento

- Cada vez que se complete un punto, actualizar su "Estado" aquí mismo (no basta con mencionarlo en el journal) y referenciarlo desde el checkpoint correspondiente de `docs/CURRENT_STATE.md`.
- No marcar nada como "implementado" sin evidencia verificada (igual que el resto de `AGENTS.md`): un PR fusionado con los checks en verde, o una confirmación explícita del propietario para los pasos que requieren su acción manual.
- Si un futuro chat necesita ir más rápido por alguna razón, debe pedir confirmación explícita del propietario antes de saltarse cualquier punto de este documento — la instrucción vigente es priorizar que todo esto quede bien hecho sobre la velocidad.
