# ODD task — eliminar permiso de override manual de precio del P0

**Fecha:** 2026-11-10  
**Riesgo:** alto (integridad del precio y autorización comercial).  
**Entrega P0:** 2026-12-01 — inamovible.

## Contexto y decisión

El checkout P0 no admite descuentos, promociones, cupones ni modificaciones manuales del precio de lista. La matriz anterior permitía `sales.price.override` a Owner/Admin, contradiciendo la decisión P0 vigente. El permiso no debe conservarse como capacidad residual.

## Alcance

- Retirar `sales.price.override` del tipo `CommercialOperation`.
- Retirarlo de las allowlists Owner/Admin y del parser de operaciones válidas.
- Añadir una prueba negativa que rechace el permiso para Owner, Admin, Inventory y Cashier.
- No modificar precio de catálogo, `sales.create_list_price`, endpoints, UI, migraciones ni datos.

## Implementación en la rama de integración #287

- `apps/api/src/authorization.ts`: permiso eliminado del contrato, allowlists Owner/Admin y parser.
- `apps/api/src/authorization.test.ts`: todos los roles deben rechazar el permiso; se conservan las aserciones válidas de anulación de ventas.
- La misma corrección aislada existe en PR #300; se incorpora aquí porque #287 integra el checkout y no debe reintroducir el permiso al llegar a main.
- La validación debe ejecutarse en CI exact-HEAD de #287. No se reutilizan resultados de PR #300.

## Exclusiones y límites

No introducir descuentos/promociones, PIN, overrides de emergencia, cambios de catálogo ni endpoints. No modificar main, producción, Neon, secretos ni despliegues. Mantener PR #287 Draft y sin merge hasta cerrar los gates BCV/checkout/seguridad y obtener aprobación formal.
