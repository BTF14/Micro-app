# Revisión estática de autenticación y límites de autorización

- Fecha: 2026-10-18
- Rama base observada: `main` en `099edc2706ee0d169b15c1b26c7788997b0f4d42`
- Tipo: revisión estática de código y pruebas; no es pentest ni ejecución local.
- Alcance: `apps/api/src/auth.ts`, `apps/api/src/index.ts`, `apps/api/src/auth.integration.test.ts`, `apps/api/src/config.ts`, `docs/API_INTEGRATION.md`.
- Estado: hallazgos y criterios propuestos; no se modificó lógica de autenticación, base de datos, secretos ni despliegue.

## Resumen ejecutivo

El código contiene una base de autenticación por contraseña con sesiones revocables y límites de intentos almacenados en PostgreSQL. Sin embargo, el requisito constitucional de Google Sign-In + allowlist no está implementado en los archivos revisados. El registro actual permite que cualquier persona que alcance la API intente crear una cuenta, una organización y una membresía `owner`; por tanto, no debe tratarse como control de acceso para un piloto cerrado ni como identidad lista para datos reales.

A la vez, la API todavía no expone rutas comerciales de ventas/inventario. Esta revisión no encontró una ruta comercial sin protección dentro del alcance revisado; la prioridad es impedir que se añadan rutas con datos reales antes de cerrar identidad, autorización y aislamiento por tenant.

## Hallazgos

### AUTH-01 — Registro público crea organización y rol owner

- **Prioridad:** P0 antes de incorporar usuarios/datos reales.
- **Evidencia estática:** `POST /auth/register` valida origen y campos, aplica rate limits y crea usuario, organización, membresía con rol `owner` y sesión dentro de una transacción. No consulta una allowlist.
- **Impacto:** cualquier persona que pueda acceder al endpoint y supere los controles técnicos puede intentar aprovisionar una cuenta/organización propia. Esto no satisface el requisito acordado de Google Sign-In + allowlist ni un modelo de invitación cerrado.
- **Acción requerida:** resolver decisiones D1–D8 en PR #12; implementar política de fallo cerrado y pruebas negativas antes de habilitar datos comerciales. No asignar automáticamente `owner` fuera de la política aprobada.
- **Estado:** confirmado por lectura de código; no se hizo una prueba de abuso contra un entorno desplegado.

### AUTH-02 — Google Sign-In, allowlist y verificación de email ausentes en las rutas revisadas

- **Prioridad:** P0 para completar el requisito de identidad.
- **Evidencia estática:** `apps/api/src/auth.ts` expone registro, login, consulta de sesión y logout por contraseña. No se observa flujo OAuth, validación de identidad Google ni política allowlist.
- **Impacto:** el requisito de acceso por identidad Google autorizada no se puede considerar implementado.
- **Acción requerida:** no escoger dominios, usuarios permitidos, administrador de allowlist ni política de vinculación de cuentas por inferencia. Registrar las decisiones explícitamente y seleccionar una biblioteca compatible con Hono/Workers y coste $0 antes de implementar.
- **Estado:** confirmado en los archivos inspeccionados; no se verificó cada archivo del repositorio ni configuración externa.

### AUTH-03 — La sesión autentica al usuario, pero no constituye por sí sola autorización por tenant

- **Prioridad:** P0 antes de rutas comerciales.
- **Evidencia estática:** `/auth/me` devuelve las organizaciones activas de la persona; el middleware global en `index.ts` configura CORS y registra las rutas de auth, pero no implementa una capa general de autorización para endpoints comerciales.
- **Impacto:** cualquier futura ruta de negocio deberá validar en servidor la sesión, membresía activa, rol y organización de cada operación; no basta con que el cliente envíe un `organization_id`.
- **Acción requerida:** diseñar una matriz endpoint × rol × tenant y pruebas negativas de acceso cruzado antes de implementar ventas/inventario. Mantener rutas comerciales no disponibles hasta demostrarlo.
- **Estado:** la API revisada es un scaffold y no registra rutas comerciales; no se afirma que exista una fuga de datos comerciales actual.

### AUTH-04 — Cobertura de pruebas de autorización incompleta para cerrar el riesgo

- **Prioridad:** P0/P1 según la ruta que se habilite.
- **Evidencia estática:** el test de integración ejercita registro, duplicado, login, consulta de sesión, usuario/membresía inactivos, logout y expiración en PostgreSQL. No acredita Google OAuth, allowlist, roles administrativos, acceso entre tenants ni una matriz completa de autorización.
- **Acción requerida:** añadir casos de identidad no permitida, allowlist ausente/vacía, callback inválido/replay cuando exista OAuth, revocación de acceso y pruebas de acceso cruzado para cada ruta protegida. Los E2E con API simulada no sustituyen integración real API+PostgreSQL.
- **Estado:** brechas observadas en la prueba revisada; no se ejecutó el suite en esta revisión.

## Controles presentes (no equivalen a preparación para producción)

- Hash de contraseña PBKDF2-SHA-256 con 310.000 iteraciones y sal aleatoria.
- Token de sesión aleatorio; en la base se guarda su hash SHA-256.
- Sesión de siete días con revocación y cookie HttpOnly.
- Validación exacta del origen configurado en las rutas de cambio de estado y CORS con credenciales para el origen permitido.
- Límites de intentos por IP y correo almacenados en PostgreSQL.
- Creación transaccional de usuario, organización, membresía y sesión.
- Respuestas de error sin stack trace para el cliente.

Estos controles deben seguir recibiendo pruebas y revisión. No constituyen certificación de seguridad, verificación de proveedor OAuth, autorización por tenant ni recuperación de cuentas.

## Secuencia recomendada

1. Revisar y resolver D1–D8 de [PR #12](https://github.com/BTF14/Micro-app/pull/12); separar decisiones de producto de opciones técnicas.
2. Aprobar fuente y alcance de allowlist, bootstrap de primer administrador, política de cuenta/organización, compatibilidad con contraseña, vinculación y sesión.
3. Auditar el esquema real y todas las rutas/middlewares contra una matriz de permisos por endpoint.
4. Implementar Google Sign-In + allowlist con fallo cerrado en una rama; probar callbacks/claims y persistencia en PostgreSQL efímero.
5. Añadir pruebas de autorización y aislamiento cross-tenant para cada endpoint protegido.
6. Ejecutar revisión independiente y workflows del SHA final. No tocar Neon `main`, no desplegar producción ni enviar correos durante esta fase.

## Límites de esta revisión

- No se ejecutaron pruebas, fuzzing, pentest ni solicitudes contra una API desplegada.
- No se leyó ni modificó ninguna credencial o secreto.
- No se modificó Neon, no se aplicó migración y no se desplegó.
- Los hallazgos derivan de los archivos indicados; el estado de dominios, secretos, proveedor Google, configuración de Cloudflare y despliegues externos queda no verificado.
