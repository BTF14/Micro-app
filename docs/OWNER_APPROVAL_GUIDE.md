# Guía paso a paso para aprobar la política de acceso

Este documento está pensado para que el propietario pueda tomar la decisión en el siguiente chat sin tener que reconstruir el contexto.

## Estado actual

- **D1 aprobada por el propietario el 2026-10-19:** para la primera beta privada, la allowlist se almacenará en una variable de entorno/secreto con correos exactos autorizados; acceso denegado por defecto. No guardar correos reales ni secretos en el repositorio. Un panel administrativo con auditoría se evaluará más adelante, cuando exista un mecanismo seguro de bootstrap y recuperación.
- **D2 (primer administrador) sigue pendiente de aprobación explícita.** Recomendación propuesta: procedimiento administrativo controlado, auditable y de un solo uso; sin endpoint público de bootstrap ni cuenta `owner` implícita. Diseñarlo y probarlo en entorno aislado antes de cualquier uso real.
- Las demás decisiones de identidad y la matriz de permisos siguen pendientes de aprobación explícita.
- Por seguridad, `POST /auth/register` está temporalmente bloqueado: devuelve `503 REGISTRATION_DISABLED` antes de procesar credenciales o acceder a la base de datos (PR #57).
- No reactivar el registro hasta que el flujo aprobado esté implementado y probado.
- No compartir contraseñas, OAuth client secrets, tokens ni credenciales de Neon. No guardar una lista real de correos en este documento.

## Paso 1 — Abrir el siguiente chat con el contexto correcto

Abre un chat nuevo dentro del proyecto **Micro app**, si está disponible, y pega este texto:

> Continúa el repositorio https://github.com/BTF14/Micro-app. Primero lee `docs/HANDOFF_NEXT_CHAT.md`, `docs/CURRENT_STATE.md`, `docs/sdd/auth-policy-decision-record.md`, `docs/sdd/google-signin-allowlist-spec.md` y `docs/sdd/role-permission-decision-matrix.md`. La PR #57 bloqueó el registro público y no debe reactivarse todavía. Guíame paso a paso para aprobar la política de identidad; haz una pregunta a la vez si falta una decisión. La recomendación base es beta privada, allowlist de correos exactos, identidad Google validada en servidor con email verificado, sin autoaprovisionamiento ni rol owner implícito. Explica cada decisión en lenguaje sencillo y no despliegues producción, no modifiques Neon main, no actives servicios con coste ni inventes secretos o correos. Continúa las tareas seguras y documenta el resultado en el repositorio.

## Paso 2 — Aprobar o corregir la propuesta base

La IA debe mostrarte esta propuesta en lenguaje sencillo. Responde **“Apruebo la propuesta base de identidad”** si estás de acuerdo, o indica qué punto cambiar:

1. **Beta privada:** solo pueden entrar personas autorizadas; no habrá alta pública.
2. **Allowlist de correos exactos:** se autoriza cada dirección individual, no un dominio entero.
3. **Google verificado:** el servidor valida la autenticación de Google y exige que el proveedor confirme el email como verificado.
4. **Sin alta automática:** tener una cuenta Google permitida no crea automáticamente una organización ni concede permisos.
5. **Sin owner implícito:** no se asigna el rol `owner` por el mero hecho de iniciar sesión; la organización y la membresía se crean mediante un procedimiento administrativo explícito, controlado y auditable.
6. **Sin vinculación automática de cuentas:** no se enlazan cuentas existentes solo porque coincida el email; cualquier migración debe ser explícita y segura.
7. **Denegar por defecto:** si la allowlist está vacía, es inválida o no se puede consultar, se deniega el acceso.
8. **Sin costes nuevos:** no elegir proveedor, librería o servicio de pago sin verificar antes compatibilidad con Cloudflare Workers y coste real de $0.

Aprobar estos principios **no** significa aprobar aún todos los detalles técnicos ni autoriza un despliegue.

## Paso 3 — Resolver las decisiones que requieren una respuesta específica

La IA debe preguntarte, de una en una, lo que todavía no quede decidido. Las decisiones importantes son:

- **Quién administra la allowlist:** recomendamos un operador autorizado con registro de auditoría y un proceso de recuperación seguro. No crear una cuenta administrativa secreta ni dejar credenciales en el código.
- **Primer administrador (D2, pendiente):** recomendamos un procedimiento administrativo controlado y auditable, sin endpoint público de bootstrap. Debe exigir identidad Google autenticada y correo verificado incluido en la allowlist; impedir una segunda asignación accidental de `owner`; dejar evidencia auditable sin registrar tokens ni secretos; y probarse primero en un entorno aislado. No implementar ni considerar aprobado hasta que el propietario confirme esta política y se diseñe el mecanismo técnico concreto.
- **Login por contraseña existente (D4):** decidir si se deshabilita por completo cuando se active Google o si se conserva temporalmente detrás de la misma allowlist y verificación. Recomendación: no permitir que contraseña alguna eluda la allowlist; evaluar deshabilitarla para simplificar la beta.
- **Cuentas existentes:** decidir cómo se migran después de verificar la identidad; no vincularlas automáticamente.
- **Sesiones y orígenes:** acordar expiración, revocación y orígenes exactos permitidos según los entornos reales.
- **Implementación OAuth:** comparar opciones compatibles con Hono/Cloudflare Workers, mantenimiento, seguridad y coste antes de seleccionar una. No crear secretos ni configurar servicios todavía.

No necesitas saber detalles técnicos para aprobar la intención de cada punto; la IA debe explicar los efectos y ofrecer una recomendación clara.

## Paso 4 — Lista real de participantes de la beta

Solo cuando se haya acordado cómo se administra la allowlist, la IA te pedirá la lista de correos exactos que autorizas. No inventar direcciones, no usar dominios comodín y no guardar esa lista en archivos públicos, commits, issues o logs. La ubicación de almacenamiento debe decidirse y asegurarse antes de incorporar la lista.

## Paso 5 — Aprobar los permisos de la aplicación por separado

La identidad decide **quién puede iniciar sesión**; la matriz de roles decide **qué puede hacer cada persona**. Son decisiones distintas.

Después de resolver identidad, pide a la IA que te muestre una matriz sencilla para los roles actuales (`owner`, `admin`, `cashier`, `inventory`) y operaciones como productos, compras, ajustes de stock, ventas, devoluciones, pagos, reportes y gestión de usuarios. La recomendación es denegar por defecto, separar lectura de escritura, exigir auditoría para ajustes/devoluciones y evitar que una persona pueda elevar sus propios permisos. Aprueba o corrige la matriz antes de que se implementen rutas comerciales.

## Paso 6 — Qué debe hacer la IA después de tu aprobación

1. Registrar en el documento de decisiones exactamente qué aprobaste y qué sigue pendiente.
2. Diseñar la especificación técnica de Google Sign-In y allowlist, sin secretos.
3. Implementar en una rama aislada, con pruebas que cubran usuarios permitidos/no permitidos, email no verificado, allowlist vacía/no disponible, ausencia de escrituras no autorizadas, sesiones y vinculación de cuentas.
4. Ejecutar y revisar los controles de CI para el SHA exacto; corregir fallos antes de fusionar.
5. Mantener registro cerrado hasta que la implementación y pruebas sean correctas.
6. No tocar Neon `main`, datos reales, billing ni producción durante esta fase.
7. Actualizar `docs/PRODUCTION_READINESS.md` con evidencia. La app solo podrá declararse lista después de superar todos los gates, no por aprobar esta política.

## Respuesta mínima que puedes copiar

Si estás de acuerdo con la recomendación inicial, responde en el próximo chat:

> Apruebo como base la beta privada con allowlist de correos exactos, autenticación Google validada en servidor con email verificado, denegación por defecto, sin alta pública, sin creación automática de organizaciones/usuarios con rol owner y sin vinculación automática de cuentas. Guíame paso a paso para resolver lo que falta, una pregunta a la vez. No despliegues producción ni modifiques Neon main.

Esta respuesta aprueba solo los principios indicados. La administración de la allowlist, el bootstrap inicial, el tratamiento del login por contraseña, las cuentas existentes, las sesiones/orígenes y la matriz de permisos deben quedar documentados antes de implementarse.
