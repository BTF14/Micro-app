# Matriz de pruebas de autorización y aislamiento multiempresa

**Estado:** plan de aceptación; no es evidencia de que los controles ya estén implementados.  
**Fecha de revisión:** 2026-10-18  
**Rama base revisada:** `main` en `838715d211918f521f5e6401a91dc773236ef3ad`.

## Hallazgo de alcance

La API registrada actualmente en `apps/api/src/index.ts` expone las rutas de autenticación registradas por `apps/api/src/auth.ts` y `GET /health`. No hay todavía handlers de negocio para productos, proveedores, ventas, pagos o movimientos de inventario. Por ello no es posible escribir una prueba HTTP real de acceso cruzado a esos recursos sin inventar rutas o interfaces que no existen. Las pruebas de esquema/migración y las de sesión existentes son controles parciales, no sustitutos de las pruebas de autorización por recurso.

## Reglas de seguridad para las pruebas

- Ejecutar con PostgreSQL efímero creado por CI; no usar Neon `main`, datos reales ni secretos.
- Preparar dos organizaciones A y B, usuarios con membresía activa en cada una y recursos sintéticos asociados a cada organización.
- Obtener la organización autorizada desde la sesión y la membresía validada en servidor; nunca confiar en un `organization_id` enviado por el cliente como prueba de autorización.
- No aceptar IDs de recursos pertenecientes a otra organización aunque el usuario conozca sus UUID.
- Las lecturas y escrituras deben filtrar por organización en SQL y comprobar roles en el servidor. Las restricciones compuestas/FK de la base de datos son defensa adicional, no reemplazan autorización HTTP.
- Para peticiones no autorizadas, verificar que no se revela información del recurso ajeno. Elegir entre 403 y 404 de forma consistente al implementar la política, sin filtrar si un ID existe en otra organización.
- Las pruebas negativas deben comprobar también que no hubo cambios laterales en filas, stock, pagos, movimientos o auditoría.

## Matriz de aceptación futura por recurso

| Recurso/acción | Escenario positivo | Escenario negativo obligatorio |
|---|---|---|
| Productos | Miembro autorizado de A consulta/crea/edita producto de A según su rol | Usuario de B no puede leer, editar ni desactivar producto de A; tampoco reasignarlo a B |
| Proveedores | Miembro autorizado consulta y gestiona proveedores de su organización | Producto de A no puede referenciar proveedor de B; el FK compuesto debe rechazarlo |
| Inventario | Movimiento autorizado modifica stock y deja registro atribuible | Usuario de B no puede crear movimiento para producto de A; ninguna escritura cruzada ni stock negativo |
| Ventas/líneas | Venta de A usa productos de A y una clave de idempotencia dentro de su ámbito acordado | Venta de A no puede incluir producto de B; repetir solicitud no duplica venta, pago ni movimiento |
| Pagos | Usuario con permiso registra pago de venta de su organización | No se puede pagar/consultar venta de otra organización ni cambiar importes desde el cliente |
| Auditoría | Acción autorizada queda vinculada a actor y organización correctos | Usuario no puede leer ni fabricar eventos de auditoría de otra organización |
| Roles | Cada rol accede solo a las operaciones explícitamente permitidas | `cashier` y `inventory` no adquieren permisos de `admin/owner` por manipular cuerpo, ruta o cabeceras |
| Membresía/sesión | Membresía activa permite acceso conforme al rol | Membresía revocada, organización inactiva, usuario inactivo o sesión revocada/expirada deniega acceso inmediatamente |

La matriz no asigna todavía permisos detallados por operación; deben definirse a partir de requisitos documentados antes de implementar los handlers. No inventar reglas de identidad, allowlist ni vinculación de cuentas como parte de este trabajo.

## Cobertura existente revisada

- `apps/api/src/auth.integration.test.ts`: registro, duplicado, credenciales incorrectas, consulta de sesión, usuario/membresía inactivos, cierre y revocación, expiración y limpieza de rate limits.
- `apps/api/migrations/0001_initial.sql`: restricciones compuestas para que productos/proveedores de organizaciones diferentes no puedan vincularse mediante la clave foránea compuesta; revisar también las restricciones de ventas y líneas en la propia migración.
- Workflows de CI y validación de migración sobre el SHA base revisado terminaron en éxito después de la fusión documental. Eso no prueba las rutas de negocio que todavía no existen.

## Siguiente paso técnico

Cuando se implemente el primer handler de negocio, añadir primero pruebas de integración contra PostgreSQL efímero para autenticación, selección de organización y denegación cruzada; después implementar la operación mínima bajo esas pruebas. Repetir por recurso y rol. No marcar aislamiento multiempresa completo en `docs/PRODUCTION_READINESS.md` hasta cubrir todas las lecturas y escrituras expuestas.
