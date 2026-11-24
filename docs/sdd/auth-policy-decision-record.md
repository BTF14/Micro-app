# Registro de decisiones de identidad y acceso

- Estado: **D1–D8 aprobadas por el propietario el 2026-10-24**; revisar la tabla de aprobación al final para los valores vigentes.
- Fecha de decisión: 2026-10-24; la matriz de propuesta original se conserva como historial de deliberación.
- Relacionado: `docs/sdd/google-signin-allowlist-spec.md` (D1–D8); permisos por rol, documento independiente y todavía no aprobado: [`role-permission-decision-matrix.md`](role-permission-decision-matrix.md).
- Riesgo: alto.
- Propósito: registrar decisiones aprobadas de identidad y enlazarlas con la implementación y sus pruebas, sin inventar correos, dominios ni administradores.

## Límites

Este documento registra la política de identidad aprobada; no autoriza por sí mismo despliegues de producción, cambios de credenciales ni mutaciones en Neon `main`. No contiene una allowlist real ni valores secretos. La tabla de aprobación del 2026-10-24 es la autoridad para D1–D8; la matriz de propuestas anterior es contexto histórico.

## Matriz original de propuestas (histórica)

Las opciones siguientes documentan la discusión previa a la aprobación. Si hay diferencias, prevalece la tabla **Aprobación del propietario — 2026-10-24** al final.

| ID | Decisión requerida | Opción conservadora propuesta para evaluar | Alternativas y consecuencias |
|---|---|---|---|
| D1 | Fuente de allowlist | Tabla administrada por operador autenticado, con auditoría, solo si existe un proceso seguro de bootstrap y recuperación | Secret/env es simple pero difícil de administrar y auditar; invitaciones requieren definir emisión, expiración y revocación |
| D2 | Quién puede entrar | Emails exactos previamente autorizados; denegar si la política está vacía, inválida o no disponible | Dominios amplían el acceso a cualquier cuenta del dominio y requieren decidir si ese riesgo es aceptable |
| D3 | Alta inicial y organización | Sin autoaprovisionamiento ni rol `owner` implícito; definir un bootstrap administrativo explícito, de un solo uso y auditable | Invitación/preaprovisionamiento requieren un operador y un flujo de recuperación definidos |
| D4 | Contraseña actual | Mantenerla temporalmente solo si también queda cerrada por la misma política de acceso y se puede probar; si no, bloquear registro público antes de usuarios reales | Retirar contraseñas requiere plan de migración/recuperación; mantenerlas sin control permitiría eludir Google/allowlist |
| D5 | Email verificado | Exigir identidad Google validada en servidor y claim de email verificado antes de evaluar allowlist por email | Si se usa otro identificador, documentar su estabilidad y cómo se vincula la cuenta |
| D6 | Biblioteca/proveedor OAuth | Comparar opciones compatibles con Hono/Cloudflare Workers, mantenimiento, coste $0 real y gestión de secretos antes de seleccionar | No adoptar hasta verificar soporte vigente, costes, rotación de secretos y restricciones del plan |
| D7 | Cuentas existentes | No vincular automáticamente por coincidencia de email; exigir un flujo explícito y autenticado de vinculación/recuperación | Migración administrativa verificada puede ser viable si queda auditada y evita apropiación de cuentas |
| D8 | Sesiones y orígenes | Cookies seguras por entorno, expiración/revocación definidas, callback y orígenes exactos permitidos; nunca comodines por conveniencia | Duración y dominios concretos dependen de los entornos reales y deben confirmarse antes de configurar |

## Preguntas originales previas a la aprobación (histórico)

Las preguntas de esta sección fueron planteadas antes de la decisión del 2026-10-24; no deben interpretarse como si D1–D8 siguieran sin respuesta. Consultar la tabla aprobada al final.

1. ¿El producto será inicialmente de acceso privado para un grupo cerrado, o debe permitir que nuevos comercios se registren por invitación?
2. ¿La allowlist debe contener correos exactos o se necesita permitir dominios completos? No se presupone ningún correo ni dominio.
3. ¿Quién administrará la allowlist y cómo se recupera el acceso si ese administrador pierde su cuenta?
4. ¿Debe seguir existiendo el login por contraseña durante la transición? Si sí, ¿aceptas que se cierre el registro público y que el acceso por contraseña respete la misma allowlist?
5. ¿Un usuario autorizado debe crear su propio comercio o recibir una invitación a una organización existente? No se asignará `owner` automáticamente sin una política definida.
6. ¿Hay cuentas actuales con datos reales que deban vincularse? Si las hay, la vinculación necesita un procedimiento que evite apropiación de cuentas.
7. ¿Qué dominios/orígenes se usarán en desarrollo, preview y producción? No inventar URLs ni configurar OAuth antes de confirmarlas.

## Controles mínimos antes de implementación

- La configuración ausente o inválida debe denegar acceso, no abrir el registro.
- Verificar la identidad en servidor; validar issuer, audience, expiración, state/nonce y redirect URI.
- No crear usuario, organización, membresía ni sesión antes de aprobar la política; las escrituras relacionadas deben ser transaccionales.
- Autorizar cada operación protegida en servidor y comprobar pertenencia al tenant.
- Añadir pruebas de integración con PostgreSQL efímero y pruebas negativas de aislamiento entre tenants.
- Secretos solo en el almacén de secretos del entorno; no en Git, logs ni mensajes.
- No ejecutar migraciones sobre Neon `main`, desplegar ni activar servicios con cobro durante la fase de decisión.
- Revisión de seguridad independiente y CI verde para el SHA exacto antes de integrar.

## Estado de implementación (no equivale a preparación para producción)

D1–D8 fueron aprobadas el 2026-10-24 y la migración `apps/api/migrations/0002_google_identity.sql` registra esa aprobación. La implementación Google OAuth/allowlist está en `apps/api/src/google-auth.ts`; el registro público y login por contraseña permanecen fail-closed en `apps/api/src/auth.ts`. Esto no significa que el producto esté listo para usuarios reales: seguir `docs/PRODUCTION_READINESS.md`, verificar la configuración de entornos y mantener la matriz de permisos por rol como decisión separada pendiente de aprobación.

## Aprobación del propietario — 2026-10-24

El propietario confirmó las ocho decisiones, todas con la opción conservadora propuesta en la matriz:

| ID | Decisión aprobada |
|---|---|
| D1 | Allowlist en tabla administrada, con auditoría; requiere bootstrap y recuperación seguros antes de activarse |
| D2 | Solo correos exactos previamente autorizados; denegar si la política está vacía/inválida/no disponible |
| D3 | Sin autoaprovisionamiento ni rol `owner` implícito; bootstrap administrativo explícito, de un solo uso y auditable |
| D4 | Retirar el login por contraseña: cerrar `POST /auth/login` con el mismo patrón fail-closed que ya aplica a `POST /auth/register` |
| D5 | Exigir identidad Google validada en servidor y claim `email_verified` antes de evaluar la allowlist |
| D6 | Librería OAuth: Arctic aprobado como preferencia, pero el entorno de implementación no tiene acceso de red para instalar paquetes npm nuevos ni regenerar `pnpm-lock.yaml` de forma verificable. Implementación real: cliente OAuth 2.0 + OIDC hecho a mano con `fetch` nativo y Web Crypto (sin dependencias nuevas), siguiendo el mismo flujo que Arctic implementaría (PKCE S256, `state` en cookie httpOnly, intercambio de código, `userinfo` de Google). Revisar la migración a Arctic en una sesión con red disponible si se prefiere reducir código propio |
| D7 | No hay cuentas ni datos reales existentes que vincular; no se diseña flujo de vinculación por ahora |
| D8 | Cookies seguras (HttpOnly, Secure, SameSite), expiración y revocación definidas; orígenes/callback exactos ya registrados en Google Cloud Console (`https://micro-app-63i.pages.dev` como origen, `https://micro-app-api.btfcasheb.workers.dev` como base de redirect); sin comodines |

Estas decisiones autorizan el diseño e implementación descritos en este registro. Siguen vigentes los controles mínimos de la sección anterior: no crear usuario/organización/membresía/sesión antes de que el código implemente esta política; probar en PostgreSQL efímero o branch aislado de Neon antes de tocar `main`; no desplegar producción sin verificación.
