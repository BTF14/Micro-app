# Plan de ciberseguridad para Micro app — 2026

**Estado:** propuesta; controles aún no implementados. Stack considerado: React/Vite, Hono en Cloudflare Workers, PostgreSQL en Neon y Better Auth con Google OAuth.

## Límites de seguridad
Trabajar en una rama de desarrollo y un entorno de pruebas. No aplicar migraciones a Neon main, desplegar a producción ni activar servicios de pago sin autorización expresa.

## Repositorios seleccionados

| Prioridad | Recurso | Uso en Micro app | Precaución |
|---|---|---|---|
| P0 | [OWASP Cheat Sheet Series](https://github.com/OWASP/CheatSheetSeries) | Guía para sesiones, autenticación, autorización, secretos, validación y logs. | Referencia, no dependencia ejecutable. |
| P0 | [OWASP ASVS](https://github.com/OWASP/ASVS) | Checklist de controles y criterios de aceptación. | No implica certificación. |
| P0 | [OWASP API Security](https://github.com/OWASP/API-Security) | Pruebas API; priorizar BOLA/IDOR, autenticación y abuso de recursos. | Adaptar al modelo multiempresa. |
| P1 | [GitHub CodeQL](https://github.com/github/codeql) | SAST JavaScript/TypeScript en Actions, si está disponible. | Revisar permisos y cobertura reales. |
| P1 | [Semgrep](https://github.com/semgrep/semgrep) y [reglas](https://github.com/semgrep/semgrep-rules) | SAST JS/TS en CI o local. | Ajustar falsos positivos y revisar licencia/condiciones. |
| P1 | [Trivy](https://github.com/aquasecurity/trivy) | Escaneo de filesystem, dependencias, configuración, secretos y posible SBOM. | No escanear imágenes Docker salvo que el proyecto realmente las construya. |
| P2 | [OWASP ZAP](https://github.com/zaproxy/zaproxy) | DAST en staging aislado con endpoints de prueba reales. | Nunca escaneo activo en producción; /health por sí solo no basta. |
| P2 | [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) | Blanco de entrenamiento aislado para comprobar los escáneres. | No integrar código vulnerable en Micro app. |
| Condicional | [Apache Casbin Node](https://github.com/apache/casbin-node-casbin) | Reevaluar si las políticas de autorización crecen. | No instalar de inicio; verificar compatibilidad Workers. |

### Rate limiting
[express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) es middleware de Express y no debe instalarse directamente en la API Hono/Cloudflare Workers. El requisito de limitar abuso permanece, pero la solución debe ser compatible con Hono/Workers y con un modelo de despliegue distribuido. No depender solo de memoria local como límite global.

## Plan por fases

### Fase 0 — Higiene y CI (P0)
- Verificar los workflows existentes antes de cambiarlos.
- Guardar DATABASE_URL, credenciales Google y secreto Better Auth solo como secretos del entorno; nunca en Git, frontend, logs o respuestas.
- Revisar disponibilidad de protección de ramas, revisión de PR, Dependabot y detección de secretos.
- Mantener inventario de dependencias y decisiones de seguridad.

**Aceptación:** no hay secretos en el repo; se conocen los controles CI reales; cambios en rama de desarrollo.

### Fase 1 — Identidad, autorización y multiempresa (P0)
- Separar identidad Better Auth, perfiles comerciales, membresías y administrador global.
- Exigir organization_id y claves foráneas compuestas para impedir referencias entre comercios.
- En cada ruta protegida validar en el servidor sesión vigente, allowlist, membresía, rol y organización.
- Solo el administrador global btfcasheb@gmail.com puede gestionar la allowlist; usuarios comerciales no pueden elevarse a privilegios globales.
- Verificar email Google, aplicar allowlist antes de aprovisionar/vincular cuentas y hacer efectiva la revocación en las solicitudes protegidas.
- La interfaz nunca sustituye la autorización del servidor.

**Aceptación:** usuario A no puede leer ni modificar registros de B; revocación bloquea la siguiente petición protegida; sin escalada de privilegios.

### Fase 2 — Ventas e inventario (P0)
- Venta, pagos, stock, movimientos y auditoría en una transacción atómica.
- Actualización de stock segura ante concurrencia.
- Idempotencia por organización; rechazar el uso de una clave con payload diferente.
- Conciliar líneas, descuentos, pagos, total y snapshots USD/VES.
- Devoluciones/anulaciones mediante reversos auditables.
- Versionar migraciones y probarlas en una rama Neon aislada; main requiere autorización expresa.

**Aceptación:** no hay ventas parciales tras un fallo; dos ventas concurrentes no consumen stock de más; reintentos no duplican ventas ni movimientos.

### Fase 3 — Escaneo automatizado (P1)
- Elegir CodeQL o Semgrep primero, según permisos, cobertura y falsos positivos.
- Workflow inicial Trivy filesystem ya añadido en esta rama como no bloqueante para dependencias/configuración; comprobar ejecución y cobertura (incluida la necesidad de lockfile) antes de hacerlo bloqueante. Añadir análisis de secretos y evaluar SBOM.
- Bloquear secretos filtrados y hallazgos críticos confirmados; documentar falsos positivos.
- Revisar licencias y condiciones actuales antes de adoptar herramientas.

**Aceptación:** análisis reproducible, informes legibles y detección demostrada con un caso ficticio.

### Fase 4 — DAST (P2)
- Preparar staging sin datos ni secretos de producción.
- Ejecutar ZAP baseline primero; escaneo activo solo con alcance autorizado.
- Probar CORS, cookies, cabeceras, auth, rate limiting, autorización por objeto, validación y errores.
- Usar Juice Shop solo como blanco aislado de entrenamiento.

**Aceptación:** hallazgos triageados y ningún crítico/alto pendiente sin aceptación documentada del riesgo.

## Matriz mínima de pruebas

| Prueba | Resultado esperado |
|---|---|
| Usuario A solicita por ID un producto/venta de B | Rechazo sin filtrar datos de B. |
| Administrador comercial intenta editar allowlist o promoverse | 403 y auditoría segura. |
| Revocar email y reutilizar sesión | Siguiente petición protegida rechazada. |
| Google OAuth no verificado/no autorizado | No se concede acceso. |
| Repetir venta o clave idempotente con payload distinto | Sin duplicados; payload distinto rechazado. |
| Dos ventas compran la última unidad en paralelo | Solo una se confirma. |
| Error al guardar pago o movimiento | Rollback completo. |
| Escáner encuentra marcador ficticio de secreto | Alerta; no usar credenciales reales. |
| ZAP contra staging | Informe guardado; producción fuera del alcance. |

## Reglas y fuentes
Los escáneres no sustituyen las pruebas de autorización ni la revisión de lógica comercial. No declarar Micro app certificada o libre de vulnerabilidades por tener CI verde. No introducir Express, Redis, Casbin o contenedores sin necesidad demostrada y revisión de compatibilidad/coste. Fiscalidad y privacidad requieren revisión local adicional.

- https://github.com/OWASP/CheatSheetSeries
- https://github.com/OWASP/ASVS
- https://github.com/OWASP/API-Security
- https://github.com/github/codeql
- https://github.com/semgrep/semgrep
- https://github.com/semgrep/semgrep-rules
- https://github.com/aquasecurity/trivy
- https://github.com/zaproxy/zaproxy
- https://github.com/juice-shop/juice-shop
- https://github.com/apache/casbin-node-casbin
- https://github.com/express-rate-limit/express-rate-limit
