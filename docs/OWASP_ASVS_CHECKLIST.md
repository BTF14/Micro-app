# Lista de verificación de seguridad basada en OWASP ASVS

**Estado:** checklist de trabajo; no representa certificación ni prueba de que los controles estén implementados.  
**Fecha:** 2026-10-18.  
**Alcance:** Micro app (React/Vite, Hono/Cloudflare Workers, PostgreSQL/Neon).

## Cómo registrar evidencia

Para marcar un control como verificado, enlaza una prueba, archivo o resultado de CI que lo demuestre. No marques un control solo porque exista documentación o configuración. Usa `[ ]` hasta contar con evidencia repetible. Revisar la versión vigente de [OWASP ASVS](https://github.com/OWASP/ASVS) antes de una evaluación formal.

## P0 — Identidad y sesión

- [ ] Integrar inicio de sesión Google con validación de emisor, audiencia, firma, expiración y nonce/estado cuando corresponda.
- [ ] Aplicar allowlist en el servidor antes de aprovisionar o vincular una identidad; ningún usuario comercial puede modificarla.
- [ ] Verificar el correo con evidencia del proveedor de identidad; no confiar en un email recibido sin validar la identidad.
- [ ] Mantener sesiones opacas, expiración, revocación efectiva y cookies seguras (`HttpOnly`, `Secure` en HTTPS, `SameSite` apropiado).
- [ ] Probar login/logout, expiración, revocación y acceso tras revocar una sesión.
- [ ] Proteger operaciones sensibles contra CSRF según el esquema de cookies y el despliegue real.
- [ ] No registrar contraseñas, cookies, tokens OAuth ni cabeceras de autorización.

## P0 — Autorización multiempresa

- [ ] Obtener la organización autorizada desde membresías verificadas en servidor, no confiar en un `organization_id` enviado por el cliente.
- [ ] Comprobar rol, organización y pertenencia en cada ruta protegida.
- [ ] Añadir claves foráneas/constraints que impidan referencias entre organizaciones.
- [ ] Crear pruebas negativas BOLA/IDOR: el usuario A no puede leer, modificar ni borrar recursos de B.
- [ ] Probar escalada de rol, invitaciones, cambio de organización y acceso directo a endpoints.
- [ ] Auditar operaciones administrativas y cambios de permisos.

## P0 — Integridad de ventas e inventario

- [ ] Ejecutar venta, pagos, movimientos de stock y auditoría dentro de una transacción atómica.
- [ ] Evitar stock negativo con control de concurrencia en la base de datos.
- [ ] Aplicar idempotencia a creación de ventas y reintentos; rechazar reutilización de clave con payload diferente.
- [ ] Guardar instantáneas de precio, descuentos, moneda y tasa de cambio usadas en la venta.
- [ ] Implementar devoluciones/anulaciones como movimientos reversos auditables.
- [ ] Probar fallos intermedios, ventas concurrentes y reintentos con PostgreSQL desechable.

## P1 — API y abuso de recursos

- [ ] Validar esquema, tipo, longitud, límites y formato en servidor para cada entrada.
- [ ] Aplicar límites de peticiones compatibles con Hono/Workers y el modelo distribuido; no asumir que un contador en memoria es global.
- [ ] Restringir CORS a orígenes conocidos en despliegue; no usar comodines con credenciales.
- [ ] Devolver errores seguros sin trazas, SQL, rutas internas ni secretos.
- [ ] Aplicar límites de tamaño y paginación a peticiones/listados.
- [ ] Definir timeouts y manejo de fallos de servicios externos, incluida la fuente de tasa BCV.

## P1 — Datos, configuración y cadena de suministro

- [ ] No versionar secretos ni cadenas de conexión; comprobar detección de secretos en CI.
- [ ] Usar permisos mínimos en GitHub Actions y fijar/revisar acciones de terceros.
- [ ] Revisar dependencias vulnerables, licencia y procedencia; documentar excepciones con vencimiento.
- [ ] Verificar migraciones contra PostgreSQL desechable antes de cualquier propuesta de despliegue.
- [ ] Definir retención y minimización de datos; no usar datos reales en E2E.
- [ ] Generar SBOM si se confirma que aporta valor y no introduce coste.

## P1 — Registro y respuesta

- [ ] Registrar eventos de autenticación, cambios de permisos, ventas y ajustes sin datos sensibles.
- [ ] Añadir identificador de correlación para investigar errores.
- [ ] Definir quién puede acceder a logs y por cuánto tiempo se retienen.
- [ ] Documentar procedimiento para revocar sesiones y rotar credenciales comprometidas.

## P2 — Pruebas dinámicas

- [ ] Ejecutar Playwright en CI contra un frontend local y API simulada/aislada.
- [ ] Ejecutar OWASP ZAP primero en modo baseline contra un preview de prueba autorizado.
- [ ] Mantener OWASP Juice Shop solo como objetivo de laboratorio aislado.
- [ ] No ejecutar escaneo activo en producción ni contra sistemas ajenos.

## Estado conocido al crear esta lista

- La configuración CI existente contiene Trivy filesystem scan no bloqueante; esto no significa que esté libre de vulnerabilidades.
- El flujo frontend de registro/login y las pruebas de API existentes cubren solo una parte de identidad.
- Google OAuth, allowlist y verificación de email requieren revisión e implementación específicas.
- No hay evidencia de certificación ASVS ni de auditoría externa.

## Referencias

- [OWASP ASVS](https://github.com/OWASP/ASVS)
- [OWASP Cheat Sheet Series](https://github.com/OWASP/CheatSheetSeries)
- [OWASP API Security Top 10](https://github.com/OWASP/API-Security)
- [OWASP ZAP](https://github.com/zaproxy/zaproxy)
- [OWASP Juice Shop](https://github.com/juice-shop/juice-shop)
