# Matriz de pruebas de autorización y aislamiento multiempresa

**Estado:** plan de aceptación; no es evidencia de que los controles ya estén implementados.  
**Fecha de revisión:** 2026-11-05  
**Rama revisada:** `security/centralize-existing-route-authorization-20261105`, apilada sobre PR #215.

## Hallazgo de alcance

La API registra actualmente catálogo GET/POST/PATCH y rutas de almacenes/conteos por sucursal, además de autenticación y `GET /health`. La cobertura de autorización real se limita a esas rutas; no existen aún handlers HTTP para ventas, pagos, proveedores, recepción, reservas, devoluciones ni transferencias. No se debe inferir aislamiento completo de recursos que aún no tienen endpoints.

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

La matriz de permisos por rol está aprobada (2026-10-31). `authorization.ts` centraliza las decisiones de operación y los helpers tenant/branch se conectan a los handlers existentes en esta rama. La cobertura pendiente debe ampliarse por endpoint y por rol, sin inventar rutas ni permisos fuera de la matriz.

## Cobertura existente revisada

- `apps/api/src/auth.integration.test.ts`: autenticación, estado de sesión, revocación, expiración y casos de identidad.
- `apps/api/src/authorization.test.ts`: matriz de permisos, denegación por operación y límites de contexto tenant/branch.
- `apps/api/src/inventory-counts.integration.test.ts`: aislamiento tenant/branch, membresía de sucursal, denegación de Cashier, idempotencia, atomicidad y ledger para conteos.
- `apps/api/migrations/0001_initial.sql`: restricciones compuestas para que productos/proveedores de organizaciones diferentes no puedan vincularse mediante la clave foránea compuesta; revisar también las restricciones de ventas y líneas en la propia migración.
- Los workflows de CI y validación de migraciones deben comprobarse para el HEAD exacto de cada PR. La cobertura actual no prueba todavía las rutas comerciales futuras de ventas, pagos, proveedores, recepción, reservas, devoluciones o transferencias.

## Siguiente paso técnico

Cuando se implemente el primer handler de negocio, añadir primero pruebas de integración contra PostgreSQL efímero para autenticación, selección de organización y denegación cruzada; después implementar la operación mínima bajo esas pruebas. Repetir por recurso y rol. No marcar aislamiento multiempresa completo en `docs/PRODUCTION_READINESS.md` hasta cubrir todas las lecturas y escrituras expuestas.
