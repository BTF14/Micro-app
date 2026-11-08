# Contrato de autorización server-side y aislamiento multiempresa

- Estado: **contrato técnico propuesto; no sustituye la aprobación de la matriz de roles**.
- Fecha: 2026-10-19.
- Alcance: futuras rutas HTTP comerciales de Micro app.
- Repositorio: https://github.com/BTF14/Micro-app
- Relacionados: [Constitución](../CONSTITUTION.md), [integración API/Neon](../API_INTEGRATION.md), [matriz de permisos por rol](role-permission-decision-matrix.md), [preparación para producción](../PRODUCTION_READINESS.md), [bloqueo de identidad #53](https://github.com/BTF14/Micro-app/issues/53).

## Objetivo y límites

Definir condiciones técnicas que toda ruta comercial debe cumplir antes de poder leer o modificar datos de una organización. Este documento **no aprueba permisos de negocio**, no crea endpoints y no habilita despliegues.

La autenticación identifica una sesión; no demuestra por sí sola que el usuario pueda operar sobre una organización ni sobre un recurso concreto. Las restricciones SQL y las claves foráneas compuestas ayudan a mantener integridad, pero no sustituyen la autorización de cada petición.

## Invariantes obligatorios

1. **Denegar por defecto.** Una sesión ausente, inválida, expirada o revocada, un usuario inactivo, una organización inactiva o una membresía inactiva nunca autoriza una operación comercial.
2. **Identidad desde el servidor.** Obtener el usuario desde la sesión validada. Nunca confiar en `userId`, `role`, `organizationId` ni campos equivalentes enviados por el cliente como prueba de identidad o permiso.
3. **Contexto de organización validado.** Si la ruta acepta un selector de organización en URL, cabecera o cuerpo, tratarlo solo como una selección solicitada. Comprobar en el servidor que existe una membresía activa de ese usuario para esa organización y que la organización está activa. El mecanismo concreto de selección queda pendiente de decisión de arquitectura; ninguna opción se considera aprobada por este documento.
4. **Permiso por operación.** Después de validar sesión y membresía, comprobar el permiso específico de la acción conforme a una matriz aprobada. No deducir permisos solo del nombre del rol ni de que la UI oculte un botón.
5. **Ámbito tenant en cada consulta.** Toda lectura, actualización o eliminación de un recurso propiedad de una organización debe limitarse por el identificador de la organización ya autorizado en servidor. No consultar, actualizar ni eliminar un registro tenant-scoped usando únicamente el ID recibido del cliente.
6. **Escrituras con contexto de servidor.** En las inserciones, asignar el `organization_id` a partir del contexto autorizado, no copiarlo sin validar desde el cuerpo de la petición.
7. **Relaciones dentro del mismo tenant.** Validar que productos, proveedores, ventas, pagos y movimientos relacionados pertenezcan a la misma organización. Conservar y ampliar las claves foráneas compuestas cuando corresponda; no usarlas como único control de acceso.
8. **Transacciones atómicas.** Operaciones que cambian varios registros relacionados (por ejemplo, venta, pagos, existencias y libro de movimientos) deben usar un solo cliente y una transacción, con validaciones de autorización y pertenencia antes de confirmar cambios.
9. **Sin efectos laterales al denegar.** Las peticiones no autorizadas no deben crear sesiones, filas de negocio, movimientos, pagos ni cambios de inventario. Los errores no deben filtrar datos de otra organización.
10. **Sin autorización en el frontend como control de seguridad.** La API debe aplicar los controles aunque se llame directamente sin usar la interfaz.

## Secuencia mínima para una futura ruta comercial

1. Validar y parsear la entrada.
2. Resolver la sesión en servidor y confirmar usuario activo.
3. Resolver el contexto de organización solicitado y verificar organización y membresía activas.
4. Comprobar el permiso requerido para esa operación, una vez aprobada la matriz de roles.
5. Ejecutar las consultas con ámbito tenant explícito y validar la pertenencia de cada recurso relacionado.
6. Para escrituras compuestas, ejecutar las operaciones en una transacción y revertir todo ante cualquier error.
7. Devolver una respuesta segura y probar que la denegación no produjo escrituras.

Esta secuencia es un contrato de implementación, no una afirmación de que ya exista middleware o código que la cumpla.

## Pruebas de aceptación requeridas

Antes de declarar aislamiento multiempresa listo, las pruebas de integración contra PostgreSQL deben demostrar como mínimo:

- Usuario de organización A no puede listar, leer, editar, archivar ni borrar recursos de B aunque conozca sus IDs.
- Cambiar el identificador de organización enviado por el cliente no concede membresía ni permisos.
- Usuario sin membresía, con membresía inactiva, organización inactiva o cuenta inactiva no puede acceder a rutas comerciales.
- Sesiones ausentes, inválidas, expiradas o revocadas se rechazan.
- Relaciones cruzadas entre organizaciones se rechazan, incluso si el cliente combina IDs válidos individualmente de distintos tenants.
- Cada combinación de rol y operación coincide con la matriz aprobada, con pruebas negativas para cada denegación.
- Fallos a mitad de una operación compuesta revierten todos los cambios de negocio.
- Reintentos, solicitudes concurrentes y claves de idempotencia no duplican ventas, pagos ni movimientos de inventario cuando esos flujos existan.
- Las denegaciones no crean filas, sesiones ni cookies de autenticación y no exponen datos ajenos.
- La suite se ejecuta contra una base de prueba desechable/aislada, nunca contra Neon `main` ni datos reales.

## Decisiones todavía pendientes

- Aprobación de la matriz de permisos por rol y organización: [role-permission-decision-matrix.md](role-permission-decision-matrix.md).
- Resolución de identidad y alta segura: decisiones D1–D8 de [auth-policy-decision-record.md](auth-policy-decision-record.md) y seguimiento en [issue #53](https://github.com/BTF14/Micro-app/issues/53).
- Mecanismo de selección de organización y política de respuesta cuando el recurso no pertenece al tenant.
- Diseño, implementación y pruebas de handlers comerciales reales.

No rellenar estos puntos por inferencia. Hasta que las decisiones necesarias estén aprobadas, mantener las rutas comerciales no implementadas o denegadas por defecto.

## Estado actual verificado en la revisión documental

La API tiene rutas de autenticación, pero no handlers HTTP comerciales para catálogo, proveedores, ventas, pagos ni movimientos de inventario. Por ello, este contrato prepara futuras implementaciones; no demuestra aislamiento efectivo de rutas comerciales ni cambia el estado de preparación para producción.
