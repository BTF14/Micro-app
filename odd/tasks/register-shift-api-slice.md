# ODD — API de apertura/cierre del turno propio

**Estado:** tarea de implementación acotada; no afirma que los endpoints existan ni que estén integrados.
**Fecha:** 2026-11-11
**Deadline del MVP:** 2026-12-01.

## Objetivo

Exponer el ciclo de vida de un turno propio mediante API para habilitar la jornada P0 de un local. La matriz vigente autoriza a Owner, Admin y Cashier a abrir, operar y cerrar únicamente su propio turno; Inventory queda excluido. Se exige una membresía activa en la sucursal para todos los roles que posean un turno.

## Alcance de esta tarea

- Listar cajas activas de una sucursal accesible.
- Consultar el turno abierto del usuario autenticado.
- Abrir un turno propio con caja seleccionada y conteos iniciales separados USD/VES.
- Cerrar el turno propio con conteos físicos finales separados USD/VES.
- Reintento de cierre idéntico puede devolver el cierre existente; un cierre distinto o de otro usuario debe rechazarse.
- Mantener la identidad, la sucursal y los conteos de apertura inmutables; cierre solo una vez.
- Exponer escritura mediante funciones PostgreSQL SECURITY DEFINER, propiedad de microapp_migrator, con search_path fijo y EXECUTE solo para microapp_runtime. No conceder INSERT/UPDATE directo sobre register_shifts al runtime.
- El handler siempre resuelve sesión, tenant, rol y branch membership en la misma transacción y deriva user_id desde el contexto autenticado; nunca confiar en user_id del body.

## Fuera de alcance

- Cierre por supervisor, reapertura, modificación histórica, cambio de cajero.
- Ledger de efectivo, saldo esperado, diferencias, retiros, ingresos, arqueo financiero, depósitos.
- Pagos, métodos de pago, parciales, cambio/sobrepago, devoluciones/anulaciones.
- Descuentos, cambios manuales de precio, transferencias multi-sucursal.
- Aplicación de migraciones a Neon, despliegue, Cloudflare sensible, producción o datos reales.

Los conteos USD y VES son efectivo físico contado, no saldo esperado. No calcular diferencias sin un ledger de caja aprobado.

## Diseño de seguridad

1. `authorizeBranchOperation` debe comprobar sesión, tenant, operación y branch membership activa con locks.
2. Las funciones SQL validan importes, scope activo, usuario, rol elegible, caja activa y pertenencia a sucursal.
3. La función de cierre bloquea el turno y solo actualiza si pertenece al usuario autenticado y sigue abierto.
4. El runtime no recibe grants de INSERT/UPDATE sobre register_shifts; solo EXECUTE sobre las funciones estrechas.
5. No confiar en `user_id` suministrado por el cliente.
6. CORS/Origin, Content-Type, tamaño del body, UUID y decimales se validan antes de ejecutar SQL.
7. Los errores de constraint/conflicto se traducen a respuestas genéricas sin filtrar SQL, IDs internos o datos de otros usuarios.
8. No afirmar que el turno calcula efectivo esperado: esa función no existe.

## Pruebas obligatorias

- Owner, Admin y Cashier pueden operar su turno propio con branch membership activa.
- Inventory, sesión ausente, tenant ajeno, branch ajena, membresía revocada, usuario inactivo, caja inactiva y rol no elegible se rechazan.
- Dos aperturas concurrentes para mismo cajero/caja producen un único turno abierto.
- Un cajero no puede consultar ni cerrar el turno de otro.
- Cierre completo USD/VES es atómico; montos negativos, null o malformados se rechazan.
- Cierre repetido con los mismos conteos se trata como replay; distinto conteo no altera el historial.
- Runtime puede ejecutar funciones pero no escribir directamente la tabla.
- Pruebas contra PostgreSQL 18 efímero con login directo `microapp_runtime`; no mocks como sustituto.
- Assertions SQL verifican propietario SECURITY DEFINER, search_path fijo, grants y ausencia de escritura directa.
- CI valida migraciones 0001–0023 desde base vacía y tests de API exact-HEAD.

## Criterio de salida

La tarea solo se considera completa cuando migration, assertions, API, pruebas PostgreSQL y CI exact-HEAD pasan. Esto no equivale a UI de caja ni jornada POS completa, y no cierra el contrato comercial de pagos ni los gates de Seguridad Nivel 1.
