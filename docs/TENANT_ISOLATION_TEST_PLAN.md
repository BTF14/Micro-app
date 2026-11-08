# Matriz de pruebas de autorización y aislamiento multiempresa

**Estado:** implementación parcial con pruebas de integración existentes; este plan conserva los gates de aceptación que faltan.  
**Fecha de revisión:** 2026-11-08 UTC.  
**Rama base revisada:** `main` en `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.

## Hallazgo de alcance actualizado

La API registrada expone auth/Google, catálogo read/write, lectura de inventario y conteos. Los handlers de inventario usan `authorizeBranchOperation`, contexto tenant/sucursal y locks. La matriz de permisos fue aprobada el 2026-10-31. Hay pruebas HTTP reales de aislamiento de catálogo, contexto de sucursal y conteos; no hay todavía handlers integrados de checkout/pagos, transferencias ni operaciones de caja/turnos. El plan sigue siendo un gate porque no todas las operaciones de la matriz tienen handlers/pruebas y las migraciones no están aplicadas en Neon.

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

La matriz detallada está aprobada en `docs/sdd/role-permission-decision-matrix.md`. La implementación no cubre todavía todas sus operaciones: checkout/pagos, transferencias, rutas de turnos y administración de miembros/políticas permanecen pendientes.

## Cobertura existente revisada

- `apps/api/src/auth.integration.test.ts`: sesión, usuario/membresía inactivos, revocación/expiración y rate limits.
- `apps/api/src/catalog.integration.test.ts`: cashier no recibe costo/stock; organización A no puede leer B; sesión/usuario/membresía/organización inactivos se deniegan.
- `apps/api/src/catalog-write.integration.test.ts`: tenant A no puede escribir en B; campos de stock/unknown, Origin y precisión se rechazan; rollback de auditoría.
- `apps/api/src/branch-context.integration.test.ts`: owner/admin, asignación cashier/inventory, revocación concurrente, desactivación de sucursal y rechazo cross-tenant.
- `apps/api/src/inventory-counts.integration.test.ts`: idempotencia, concurrencia, ledger/audit, conteos stale, reservas, tenant/branch isolation y denegación de cashier.
- `apps/api/src/authorization.test.ts`: matriz por rol, denegaciones, contexto tenant/sucursal y locks.
- No se ha demostrado aún la cobertura E2E completa de cada operación aprobada ni la ejecución con el runtime de Neon real.

## Siguiente paso técnico

Cuando se implemente el primer handler de negocio, añadir primero pruebas de integración contra PostgreSQL efímero para autenticación, selección de organización y denegación cruzada; después implementar la operación mínima bajo esas pruebas. Repetir por recurso y rol. No marcar aislamiento multiempresa completo en `docs/PRODUCTION_READINESS.md` hasta cubrir todas las lecturas y escrituras expuestas.
