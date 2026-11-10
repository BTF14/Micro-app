# ODD task — eliminar permiso de override manual de precio del P0

**Fecha:** 2026-11-10  
**Riesgo:** alto (integridad del precio y autorización comercial).  
**Entrega P0:** 2026-12-01 — inamovible.

## Contexto y decisión

El checkout P0 no admite descuentos, promociones, cupones ni modificaciones manuales del precio de lista. La matriz anterior permitía `sales.price.override` a Owner/Admin, contradiciendo la decisión P0 vigente. El permiso no debe conservarse como una capacidad residual.

## Alcance

- Retirar `sales.price.override` del tipo `CommercialOperation`.
- Retirarlo de las allowlists Owner/Admin y del parser de operaciones válidas.
- Añadir una prueba negativa que rechace el permiso para Owner, Admin, Inventory y Cashier.
- No modificar precio de catálogo, `sales.create_list_price`, endpoints, UI, migraciones ni datos.

## Exclusiones

No introducir descuentos/promociones, PIN, overrides de emergencia, cambios de catálogo ni nuevos endpoints. No modificar main, producción, Neon, secretos ni despliegues.

## Evidencia de implementación

**Registro ODD creado durante la reconciliación posterior al cambio fuente** porque la rama original no contenía un archivo de tarea; no se afirma que este archivo existiera antes de la implementación.

- `apps/api/src/authorization.ts`: operación eliminada del contrato, allowlists Owner/Admin y parser.
- `apps/api/src/authorization.test.ts`: una prueba exige rechazo de `sales.price.override` para todos los roles y mantiene los permisos válidos de anulación de ventas.
- Diff de PR #300: exactamente esos dos archivos; sin endpoints, UI o migraciones.
- HEAD observado: `f4c98f3971463e54370b5af3a0633ab434d9ad90`.
- CI exact-HEAD observado: 13/13 check-runs SUCCESS y 9/9 workflows SUCCESS.
- No se ejecutaron pruebas locales en este entorno; la evidencia de tests es GitHub Actions en el SHA indicado.

## Estado y límites

Implementado y CI verificado en rama aislada. No hay review formal registrada. PR #300 permanece OPEN/Draft. No merge ni main writes. Reconsultar HEAD/checks si la rama avanza.
