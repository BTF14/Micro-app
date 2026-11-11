# ODD — API de apertura/cierre del turno propio

**Estado:** IMPLEMENTADO en PR #287; validado en PostgreSQL 18 efímero en el SHA de código `0ca91ff51ec545278ceb8eabd3929083aae9022e`.
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


## Resultado de implementación — 2026-11-11

- Migración `0023_register_shift_runtime_operations.sql` y assertions: funciones `open_register_shift` y `close_register_shift` SECURITY DEFINER, propiedad del migrator, `search_path=pg_catalog, public`, con PUBLIC schema CREATE prohibido para runtime/PUBLIC.
- `microapp_runtime` conserva SELECT en `register_shifts` y `registers`; no recibe INSERT/UPDATE/DELETE/TRUNCATE directo. Solo EXECUTE sobre las funciones estrechas.
- API registrada en `apps/api/src/register-shifts.ts`: GET cajas activas, GET turno propio, POST apertura y POST cierre. La identidad `user_id` se deriva de la sesión; el body no admite user_id.
- Owner/Admin/Cashier pueden gestionar solo su turno propio con branch membership activa. Inventory, otra sucursal, otro usuario y cross-tenant quedan denegados.
- Apertura: trigger de migración 0004/0007 bloquea scope en orden canónico; autorización de aplicación usa preflight sin locks para evitar lock-upgrade/deadlock. Índices únicos son la última defensa de concurrencia.
- Cierre: fila bloqueada, solo cierre completo USD/VES por el propietario; reintento idéntico devuelve replay y no duplica audit event; importes distintos después del cierre se rechazan.
- Cada apertura/cierre crea evento append-only en `audit_logs` dentro de la misma transacción.
- CI exact code HEAD `0ca91ff51ec545278ceb8eabd3929083aae9022e`: 11/11 workflows SUCCESS; CI `43009163637` SUCCESS; 4/4 pruebas API runtime-login SUCCESS, incluyendo concurrencia, ownership, replay, audit y denegación de escritura directa. Backup restore main 0001–0016 y BCV 0001–0023 SUCCESS.

**Límites:** esto implementa la API de turnos, no la UI de caja ni checkout de ventas. No calcula saldo esperado, diferencias, retiros, arqueo financiero ni ledger de caja. No cierra la política comercial de pagos ni Seguridad Nivel 1. La implementación permanece en #287 OPEN/Draft; no está en main ni en producción.


## UI de turnos — 2026-11-11

Se añadió `apps/web/src/RegisterShiftsPanel.tsx` y su hoja responsive `register-shifts.css`, integrado en la navegación como **Caja y turnos** para Owner/Admin/Cashier. La pantalla lista sucursales asignadas, detecta el turno abierto del usuario, permite seleccionar caja y abrir turno con fondos USD/VES, y registrar conteos físicos USD/VES al cierre. El selector de sucursal queda bloqueado mientras exista turno abierto, por el índice único por cajero/organización. El cierre exige revisión y confirmación explícita; los conteos se dejan vacíos deliberadamente para evitar copiar el fondo inicial como conteo final.

Se agregó `RegisterShiftsPanel.test.tsx` con escenario de carga → apertura → revisión/cierre → confirmación y escenario de denegación de acceso. El primer CI de UI en SHA `8da81f1a6178b7fba69bf56f717954ac8d00f1cd` detectó un import `Root` sin uso en el test. Se eliminó y se estrechó el tipado de los inputs; SHA posterior `a8148f94f2ae1abd8d12f6aeb187ff1ddcdf9951`. Los workflows para ese SHA final aún deben confirmarse; no afirmar build/test verde hasta ver runs exact-SHA.

**Límite funcional:** esto habilita únicamente apertura/cierre del turno propio. No incluye UI de ventas, checkout, cobros, recibos, arqueo, efectivo esperado, diferencias, retiros, devoluciones ni anulaciones. No se añadió ledger financiero ni reglas de pago.


### CI feedback — 2026-11-11

CI at documentation HEAD `9f1f0b981fe2149ddbbc8b8e73ab5a763fddedaa` passed TypeScript build/typecheck, but the new component tests failed because their settle helper returned before the component's nested branch/register requests completed. Both assertions therefore observed the loading state. The helper now advances the event loop across eight turns in `apps/web/src/RegisterShiftsPanel.test.tsx` (commit `30d7368c05055c543171cadf7d4d103d650536d5`). This is a test synchronization fix, not a production-code assertion change. Await exact-HEAD CI to confirm.


### Corrección del diagnóstico de test — 2026-11-11

La hipótesis anterior de que el helper de espera era la causa no era correcta. El log completo mostró que el mock de `fetch` construía `new URL()` sin base, pero el API base del test puede ser una ruta relativa; eso lanzaba antes de evaluar el endpoint y producía el estado de error/carga observado. Se corrigió el mock usando una base de test explícita (`https://micro-app.test`) en `apps/web/src/RegisterShiftsPanel.test.tsx`, commit `98b24eca568dd148b50da70e0d558e996a2739a0`. La espera ampliada se mantiene inocua. Este diagnóstico reemplaza la explicación anterior; exigir CI exact-SHA para verificar el arreglo.


## Validación final UI turnos — 2026-11-11

- Código final de la UI/test: `98b24eca568dd148b50da70e0d558e996a2739a0`. HEAD documental exacto probado en GitHub: `f33f423116f2e88be6927745dd119e253025f827` (posterior al código, solo docs).
- CI `43014361783` SUCCESS: Build/typecheck SUCCESS, suite web 88/88 tests SUCCESS, API 198/198 SUCCESS, Playwright Chromium SUCCESS. PostgreSQL own register-shift API integration: 4/4 tests SUCCESS en el mismo job.
- Backup restore smoke `43014361711` SUCCESS: main 0001–0016 y BCV 0001–0023. PostgreSQL migration runner `43014361883` SUCCESS. ODD docs, Secret History, Security, Semgrep, Dependency Review y Project dashboard SUCCESS.
- Excepción pendiente: workflow `Database migration validation` run `43014361738` permanece `pending` y su consulta de jobs devuelve lista vacía; no contarlo como SUCCESS ni como fallo. Reconciliarlo antes de marcar el conjunto total como completo. No hay status contexts adicionales (`combined status` vacío).
- El CI inicial que falló en test UI se corrigió: el mock de fetch ahora resuelve URLs relativas con base `https://micro-app.test`. El CI posterior del HEAD documental f33 valida la corrección. La explicación anterior de que solo era un problema de espera fue corregida en este documento.

