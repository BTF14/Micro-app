# Spec: Google Sign-In y allowlist

- Estado: propuesta
- Issue/PR: pendiente de crear
- Responsable/revisor: coordinador; revisión independiente de seguridad pendiente
- Fecha: 2026-10-18
- Riesgo: alto

## Problema y objetivo

La constitución del proyecto exige Google Sign-In y allowlist. La revisión estática de `apps/api/src/auth.ts` encontró registro y login por credenciales, consulta de sesión y logout, pero no encontró integración Google, allowlist ni verificación de email en ese archivo. La funcionalidad de identidad no debe declararse completa hasta que la política esté definida, implementada y probada.

## Alcance

Incluido:
- Definir un contrato seguro para iniciar sesión con Google y decidir el acceso mediante allowlist.
- Documentar decisiones de política que aún no están especificadas, sin inventarlas.
- Especificar protección de sesión, autorización server-side, aislamiento por tenant, rate limits y pruebas negativas.
- Definir criterios para convivir o retirar el registro/login por contraseña existente.

Fuera de alcance:
- Implementar OAuth o modificar código de producto en esta fase.
- Crear credenciales, registrar una app OAuth, configurar dominios o inventar una allowlist.
- Enviar emails, realizar migraciones en Neon `main`, desplegar producción o activar servicios de pago.
- Declarar cumplimiento legal/fiscal o de seguridad solo por tener login Google.

## Casos de uso y reglas de negocio

1. Una persona inicia el flujo Google y la aplicación valida el resultado usando una biblioteca/protocolo mantenido y el lado servidor; nunca confiar solo en datos enviados por el navegador.
2. La identidad solo obtiene una sesión de aplicación si la prueba de identidad es válida y la política allowlist vigente permite el acceso.
3. Una identidad válida pero no incluida en la allowlist se deniega sin crear una organización, membresía, usuario activo ni sesión de acceso no autorizada.
4. La allowlist no sustituye autorización: cada endpoint protegido debe comprobar identidad, permiso y pertenencia al tenant en servidor.
5. Las respuestas de denegación no revelan si un correo está registrado o permitido; los logs excluyen tokens, códigos OAuth, cookies y secretos.
6. Callback, state, nonce, issuer, audience/client ID, expiración, redirect URI y protección CSRF se validan según el flujo elegido.
7. Los cambios de membresía/allowlist y la política de creación de organización deben ser explícitos, auditables y probados; no se decide aquí si el usuario permitido crea una organización o recibe invitación.
8. La sesión se crea/revoca en servidor y las cookies conservan atributos seguros adecuados al entorno.
9. Las rutas de registro/login por contraseña actuales se consideran un punto de decisión, no se mantienen ni eliminan por suposición.

## Datos y contratos

- Entradas/salidas: flujo de autorización redirigido y callback validado; no aceptar una identidad basada en email sin verificar la firma/claims del proveedor.
- Persistencia y consistencia: definir una identidad externa estable (issuer + subject) y reglas de asociación con cuentas existentes antes de implementar; evitar duplicar usuarios por cambios de email.
- Compatibilidad/API: preservar contratos actuales hasta decidir una transición; evitar cambios silenciosos a `/auth/register` y `/auth/login`.
- Tenant/roles: crear membresías únicamente después de autorizar el acceso; no asignar `owner` automáticamente sin una política aprobada.
- Moneda/tasa/impuestos: no aplica.

## Errores y casos límite

- OAuth cancelado, callback repetido, state/nonce incorrectos, token expirado, issuer/audience incorrectos, redirect URI no permitida, proveedor caído.
- Usuario válido fuera de allowlist, usuario existente sin identidad externa vinculada, correo duplicado/no verificado, allowlist vacía o mal configurada.
- Fallo de DB al crear/vincular usuario o sesión; operación transaccional sin usuario/membresía parcial.
- Reintentos, rate limiting, sesiones revocadas y acceso a recursos de otro tenant.
- Configuración ausente: fallo cerrado; nunca abrir el registro como fallback.

## Seguridad, privacidad y coste

- Secretos/datos sensibles: OAuth client secret y claves solo en secretos del entorno; nunca en Git, logs, tests ni documentación. No almacenar tokens de proveedor si no son necesarios.
- Abuso/rate limits: limitar inicio/callback y rutas de autenticación; respuesta genérica en denegaciones.
- Coste total $0: seleccionar solo opciones con nivel gratuito suficiente y sin billing requerido; no activar servicios con cobro automático. La elegibilidad del proveedor debe verificarse antes de adoptarlo.
- ¿Afecta Neon main o producción? No en diseño. Implementación futura debe usar PostgreSQL efímero o entorno aislado; Neon `main` y producción siguen bloqueados sin autorización específica.
- No enviar emails sin autorización expresa.
- Cumplir política de cookies, CORS, CSRF, sesiones y tenant según la constitución y checklist ASVS.

## Decisiones pendientes — bloquean implementación

- D1: fuente de allowlist: variable/secret de entorno, tabla administrada por operadores, invitaciones u otro mecanismo. Definir quién la administra y cómo se audita.
- D2: alcance de la allowlist: emails exactos, dominios, usuarios invitados, o combinación; reglas de normalización y revocación.
- D3: creación de cuentas/organizaciones: alta solo por invitación, usuarios preaprovisionados, o bootstrap explícito del primer administrador. No asignar rol `owner` automáticamente sin decisión.
- D4: login por contraseña: retirarlo, mantenerlo solo para administradores, o conservarlo sujeto a la misma allowlist.
- D5: verificación de email: si Google es el único proveedor y qué claims se aceptan; requisitos adicionales de verificación.
- D6: proveedor/biblioteca compatible con Hono y Cloudflare Workers, costes y gestión de secretos.
- D7: proceso de vinculación con usuarios existentes y recuperación de cuentas.
- D8: política de sesión/expiración y dominios/orígenes permitidos por entorno.

## Criterios de aceptación verificables

- [ ] CA-1: decisiones D1–D8 documentadas y aprobadas antes de implementar.
- [ ] CA-2: identidad Google se valida en servidor y pruebas cubren issuer, audience, expiración, state/nonce y redirect URI.
- [ ] CA-3: identidad no permitida no obtiene sesión ni provoca creación parcial de usuario/organización/membresía.
- [ ] CA-4: las rutas protegidas validan autorización y tenant en servidor; las pruebas negativas verifican aislamiento cross-tenant.
- [ ] CA-5: login/logout, expiración y revocación de sesión están cubiertos por pruebas de integración con DB efímera.
- [ ] CA-6: los tests y logs no contienen secretos ni tokens; rate limits y respuestas genéricas están comprobados.
- [ ] CA-7: CI, migración y seguridad pasan para el SHA exacto del PR; revisión independiente no deja hallazgos críticos.
- [ ] CA-8: ninguna prueba o implementación requiere mutar Neon `main`, desplegar producción, enviar correos o activar cobros.

## Evidencia requerida

- Pruebas unitarias del validador de claims y de la política allowlist.
- Pruebas de integración contra PostgreSQL efímero para identidad, membresía y sesión transaccionales.
- Pruebas negativas para no permitido, callback manipulado, replay/state inválido, sesión revocada y acceso cross-tenant.
- CI, migración, Semgrep/Security scan y E2E referenciados por SHA; distinguir mocks de integración real.
- Revisión del diff, configuración de secretos por entorno y revisión de seguridad independiente.
