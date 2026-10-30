# Revisión del esquema y la API — estado reconciliado post-PR #165 (2026-10-30 UTC)

**Fuente de código:** `main` = `1d10befe0cd3367e04bd8998a192e93d9b228063` (PR #165 fusionada).  
**Alcance:** revisión estática de solo lectura de rutas, helpers y migraciones versionadas; no se ejecutó SQL local ni se conectó a Neon.

## Estado vigente del esquema y el contexto de sucursal

## Candidato de implementación en PR #167 (rama, no main)

- PR #167 añade `0004_register_shifts.sql` con `registers`/`register_shifts`, FKs compuestas, índices parciales de un turno abierto por caja/cajero y triggers de lifecycle/desactivación. Este DDL no está en main ni se aplicó a Neon.
- La migración-check para el HEAD inicial `0b5a9adbdafce25a8483e7ce6953e2d83a826c47` aplicó 0001–0004 y pasó las assertions en PostgreSQL 18 efímero.
- El CI del mismo HEAD detectó una expectativa de SQLSTATE incorrecta en el test de integración (se esperaba FK violation donde el trigger fallaba antes). El trigger se corrigió en `4008ec7c09785298dc733e5e0c492cea34ad6f43` para que referencias inexistentes se rechacen por FK y los registros existentes pero inactivos/no-cashier por check violation. Revalidar CI en el HEAD vivo antes de integrar.
- No se añadieron endpoints comerciales, helper de turno ni autorización por operación. La matriz sigue NO APROBADA.


- `0001_initial.sql`: esquema base tenant-scoped; `products.stock_quantity` sigue a nivel organización.
- `0002_google_identity.sql`: identidad Google/allowlist/bootstrap.
- `0003_branch_scope.sql` (PR #165): añade `branches` y `branch_memberships`, FKs compuestas e índices tenant-scoped. CI aplica 0001–0003 y ejecuta assertions e integración en PostgreSQL 18 desechable.
- La migración 0003 **no se ha aplicado a Neon main**. El estado de la base remota no se infiere del DDL de Git.
- `resolveBranchContext` existe y revalida organización, usuario, membresía, rol, sucursal y asignación activa. Es un helper aislado: no se encontró conectado a middleware ni a handlers HTTP.
- `branch_memberships` no almacena un rol por sucursal; el rol sigue en `organization_members.role`. La asignación limita el alcance de cashier/inventory, pero no modela roles distintos para el mismo usuario en sucursales diferentes.
- No existen todavía `warehouses`, `registers`, `register_shifts`, `inventory_balances`, compras/recepciones, transferencias ni devoluciones.
- No hay handlers HTTP comerciales. La matriz `docs/sdd/role-permission-decision-matrix.md` continúa **NO APROBADA**; el contexto de tenant/sucursal no sustituye autorización por operación.

## Inventario de rutas HTTP observado

| Método | Ruta | Estado/propósito |
|---|---|---|
| GET | `/health` | Health scaffold |
| POST | `/auth/register` | Responde fail-closed; registro deshabilitado |
| POST | `/auth/login` | Responde fail-closed; password login deshabilitado |
| GET | `/auth/me` | Lee sesión y membresías activas |
| POST | `/auth/logout` | Revoca sesión actual |
| GET | `/auth/google` | Inicia OAuth |
| POST | `/auth/google` | Bootstrap administrativo de un solo uso |
| GET | `/auth/google/callback` | Callback OAuth; valida state/PKCE, allowlist, email verificado y vinculación de identidad |

No se encontraron rutas HTTP comerciales en el registro de Hono de `apps/api/src/index.ts` ni en los módulos de rutas importados. La lista es el inventario de los módulos de registro inspeccionados, no una afirmación sobre endpoints no montados fuera de ese árbol.

## Contexto de tenant, sucursal y sesión

- `resolveTenantContext` exige sesión y membresía activas y devuelve `userId`, `organizationId` y `role`; es un helper, no autorización comercial.
- `resolveBranchContext` recibe un `TenantContext` previamente validado, vuelve a validar estado/rol en DB y resuelve sucursal activa. Para cashier/inventory exige asignación activa; owner/admin conservan el alcance organizacional aprobado.
- Ninguno de los helpers está conectado a rutas comerciales. No se ha probado aislamiento por sucursal a través de operaciones de negocio porque esas operaciones no existen.
- `withDatabaseTransaction` existe y está probado como helper; el caller productivo observado es el bootstrap Google. No hay uso comercial de transacciones porque aún no existen handlers comerciales.

## Control de abuso / rate limiting

- La tabla `auth_rate_limits` existe en `0001_initial.sql`, pero no se encontró implementación runtime de contador/ventana ni middleware de rate limiting en `apps/api/src`.
- Estado correcto: **no demostrado/no implementado a nivel de aplicación**. Verificar aparte las reglas Cloudflare; no asumirlas por la presencia de la tabla.

## Hallazgos de integridad pendientes

1. **Venta completada no reconciliada por SQL:** no existe constraint que garantice líneas, suma de importes, pagos por moneda y total cobrado; la API futura debe validar todo en una transacción.
2. **Saldo de stock vs ledger:** `products.stock_quantity` y `inventory_movements` no se reconcilian por DB; cada mutación futura debe actualizar saldo y ledger atómicamente.
3. **Referencia polimórfica:** `inventory_movements.reference_type/reference_id` carece de FK tipada al documento origen.
4. **Idempotencia de pagos:** `payments` no tiene clave idempotente propia.
5. **Último owner:** el DDL no impide desactivar/eliminar el último `owner` activo; requiere protección transaccional y prueba de concurrencia.
6. **Autorización comercial por sucursal:** el fundamento de sucursales/asignaciones y el resolver existen; sigue pendiente conectarlos a rutas y probar autorización negativa cross-tenant/cross-branch para cada operación comercial.
7. **Auditoría append-only:** `audit_logs` no tiene protección DDL/privilegios que impida UPDATE/DELETE.
8. **Índices de búsqueda:** no se ha medido `EXPLAIN ANALYZE`; no añadir índices trigram/GIN sin benchmark sintético.

## Próximas decisiones y secuencia

- Completar CI/integración de PR #167 para 0004 y revisar lifecycle/concurrencia en PostgreSQL 18 efímero; mantener Neon main fuera del laboratorio.
- Mantener el helper de turno aislado; no conectar endpoints de caja/ventas hasta aprobar la matriz de permisos por operación y definir autorización transaccional.
- Después diseñar almacenes, balances/ledger y backfill/reconciliación de `products.stock_quantity`.
- Resolver idempotencia de pagos, integridad venta/líneas/pagos, último owner, auditoría append-only y rate limiting antes de exponer operaciones comerciales.

## Evidencia y límites

- PR #165 validó migraciones 0001–0003, assertions SQL y pruebas de contexto de sucursal contra PostgreSQL 18 efímero; no equivale a validación de Neon ni producción.
- No se leyó ni modificó Neon main, datos reales, secretos, DNS, billing ni producción en esta revisión.
- Los hallazgos describen brechas de diseño/implementación, no evidencia de explotación o corrupción actual.

---

## Auditoría estática histórica posterior a PR #156 — 2026-10-30 UTC (supersedida en el estado de sucursales por PR #165)

**Base revisada:** `main` = `18961456ac535146c4a1687d3b07d8f6693ce141`. Archivos inspeccionados mediante GitHub: `apps/api/src/index.ts`, `auth.ts`, `google-auth.ts`, `tenant-context.ts`, `database.ts`, `apps/api/migrations/0001_initial.sql` y `0002_google_identity.sql`, además de los contratos SDD. Revisión estática de solo lectura; no se ejecutó SQL ni se conectó a Neon.

### Inventario de rutas HTTP observado

| Método | Ruta | Estado/propósito |
|---|---|---|
| GET | `/health` | Health scaffold |
| POST | `/auth/register` | Responde fail-closed; registro deshabilitado |
| POST | `/auth/login` | Responde fail-closed; password login deshabilitado |
| GET | `/auth/me` | Lee sesión y membresías activas |
| POST | `/auth/logout` | Revoca sesión actual |
| GET | `/auth/google` | Inicia OAuth |
| POST | `/auth/google` | Bootstrap administrativo de un solo uso |
| GET | `/auth/google/callback` | Callback OAuth; valida state/PKCE, allowlist, email verificado y vinculación de identidad |

No se encontraron rutas HTTP comerciales en el registro de Hono de `apps/api/src/index.ts` ni en los módulos de rutas importados. La lista es el inventario de los tres módulos de registro actualmente inspeccionados, no una afirmación sobre endpoints no montados fuera de ese árbol.

### Contexto de tenant y sesión

- `resolveTenantContext` en `apps/api/src/tenant-context.ts` exige token de sesión y UUID de organización; calcula SHA-256 del token y consulta sesión no revocada/no expirada, usuario activo, membresía activa y organización activa. La búsqueda de callsites en el código de la API no encontró invocaciones desde handlers; hoy es un helper aislado probado por unit/integration tests, no un middleware aplicado a rutas.
- Devuelve `userId`, `organizationId` y `role`. El comentario del helper indica expresamente que **no autoriza una operación de negocio**.
- No hay `branchId`, asignación de sucursal, caja ni turno en el contexto.
- `GET /auth/me` devuelve las organizaciones activas del usuario; esto no concede permiso comercial por sí solo.
- El control de roles por operación y las pruebas negativas cross-tenant/cross-branch siguen pendientes porque no hay handlers comerciales.
- `withDatabaseTransaction` está implementado y probado como helper; el único caller productivo encontrado es el bootstrap Google (bloqueo de `auth_bootstrap`). No hay uso comercial de transacciones porque todavía no existen handlers comerciales.

### Control de abuso / rate limiting

- La tabla `auth_rate_limits` existe en `0001_initial.sql`, pero la búsqueda de símbolos/callers en `apps/api/src` solo encontró referencias en la migración y pruebas que verifican ausencia de escrituras para rutas de registro/login deshabilitadas. No se encontró implementación runtime de contador/ventana ni middleware de rate limiting.
- Por tanto, el estado correcto es **no demostrado/no implementado a nivel de aplicación**. Verificar aparte si hay reglas Cloudflare activas; no asumirlas por la presencia de la tabla. Prioridad P1 antes de ampliar acceso o habilitar endpoints públicos, con pruebas de límite, expiración de ventana, concurrencia y fallos de storage.

### Hallazgos de integridad de esquema

1. **Venta completada no reconciliada por SQL (alto antes de ventas):** `sales` exige `completed_at`, `exchange_rate_id`, `exchange_rate_snapshot` y `total_ves_snapshot` cuando `status='completed'`, y valida `total_usd = subtotal_usd - discount_usd`. No hay constraint que garantice existencia de líneas, suma de `sale_items.line_total_usd`, reconciliación de pagos por moneda ni correspondencia con el total cobrado. Evidencia reproducible: `apps/api/migrations/0001_initial.assertions.sql` inserta filas `sales` con `status='completed'` y snapshots completos antes de insertar cualquier `sale_items` o `payments`; la aserción no falla. La API debe calcular y verificarlo dentro de una transacción; considerar triggers/constraints diferibles solo tras diseñar y probar.
2. **Saldo de stock vs ledger (alto antes de inventario):** `products.stock_quantity` y `inventory_movements` son dos representaciones relacionadas, pero la DB no garantiza que cada cambio de saldo tenga movimiento correspondiente ni que la suma del ledger coincida. Las operaciones deben actualizar saldo y movimiento atómicamente; evaluar un ledger como fuente de verdad o reconciliación periódica con pruebas.
3. **Referencia polimórfica no validada (medio):** `inventory_movements.reference_type/reference_id` no tiene FK polimórfica a ventas/compras/devoluciones. La aplicación debe validar tenant y tipo de entidad; mejor diseñar referencias explícitas o tabla de eventos tipada si el modelo crece.
4. **Idempotencia de pagos ausente (alto antes de pagos):** `sales.idempotency_key` tiene unicidad por organización, pero `payments` no tiene una clave idempotente propia. Un retry del endpoint de pagos podría duplicar un pago si no existe una restricción/diseño de idempotencia.
5. **Último owner no protegido por esquema (alto antes de gestión de miembros):** `organization_members` limita los roles a cuatro valores, pero no impide desactivar/eliminar el último `owner` activo. Requiere transacción serializada y prueba de concurrencia; una validación solo de UI no sirve.
6. **Alcance de sucursal ausente (bloqueante de diseño):** no existen tablas de sucursal, almacén, caja o turno; `products.stock_quantity` es organization-scoped. No implementar inventario multi-sucursal sobre este campo.
7. **Auditoría no inmutable por DB (medio):** `audit_logs` guarda actor/tenant/acción/entidad/metadata, pero el DDL inspeccionado no contiene trigger/privilegios que impidan UPDATE/DELETE. Definir política append-only y privilegios antes de usarlo como libro probatorio.
8. **Índices de búsqueda (optimización pendiente, no defecto probado):** hay unicidad tenant-scoped para SKU/barcode e índice B-tree `(organization_id, lower(name))`. No se ha medido `EXPLAIN ANALYZE`; no asumir que búsquedas `ILIKE '%term%'` usan ese B-tree. Medir consultas exactas/prefijo con datos sintéticos antes de agregar trigram/GIN.

### Decisiones de diseño aún necesarias

- ERD y propiedad: organización → sucursal → almacén/caja/turno → operaciones.
- Membresía organizacional separada de asignación sucursal/rol para `cashier` y `inventory`.
- Modelo de pagos parciales/múltiples y reconciliación de monedas USD/VES.
- Política de inventario: stock no negativo, reservas, transferencias, devoluciones, costo/valoración y ledger.
- Política de idempotencia para ventas, pagos, compras, recepciones y devoluciones.
- Auditoría append-only, último owner y revocación inmediata de sesiones al desactivar usuarios/membresías.
- Identidad/rol global de operador de plataforma para gestionar allowlist, separada de `owner/admin` de cada organización; la nota con un correo específico en `SECURITY_PLAN_2026.md` no constituye por sí sola una decisión aprobada.

### Alcance y límites de la revisión

- Se inspeccionaron archivos del repositorio en GitHub; no se ejecutó suite local ni SQL en PostgreSQL durante esta revisión. La evidencia sobre ventas completadas sin líneas/pagos proviene de la propia fixture versionada `0001_initial.assertions.sql`, no de una ejecución nueva.
- No se leyó ni modificó Neon `main`, secretos, datos reales ni producción.
- Los hallazgos describen riesgos de diseño previos a habilitar handlers, no evidencia de explotación ni corrupción actual.
- La migración inicial contiene comentario explícito de que no está aplicada a Neon `main`; no inferir estado remoto distinto sin lectura autorizada y evidencia.
- Siguiente paso: completar inventario de consultas/callers y ERD, luego diseñar tests de PostgreSQL efímero antes de migraciones o endpoints.

---

## Actualización de estado — 2026-10-29

Este documento contiene observaciones históricas del esquema. Las afirmaciones antiguas de que no existe autenticación o que la API carece de helpers de conexión ya no describen el HEAD actual. En main `5a9bdc5a18a54c3c68639f52125d913d4e725b91` se verificaron rutas Google OAuth/sesión y helpers Neon en `apps/api/src/database.ts`. La API sigue sin handlers comerciales, y no hay evidencia de que las migraciones versionadas se hayan aplicado a Neon `main`. El esquema de negocio no se considera listo para operar: faltan sucursales, almacenes, cajas/turnos, compras/recepciones, devoluciones, y pruebas de autorización de rutas comerciales. Esta nota supersede solo las afirmaciones obsoletas de estado; no reemplaza el análisis de constraints que sigue.

---

# Revisión de integridad del esquema

**Estado de las observaciones siguientes:** revisión histórica del 2026-10-17. Las secciones de identidad y conexión que siguen están supersedidas por el checkpoint del 2026-10-29/30 de arriba y no describen el estado actual. Se conservan los hallazgos de integridad SQL que siguen siendo relevantes. Esta revisión es documental; no ejecuta SQL ni modifica Neon.

## Estado verificado (snapshot histórico del 2026-10-17; no usar como estado vivo)

- Proyecto: `micro-app-db`, en la organización Neon dedicada a Micro app.
- Rama primaria: `main`, estado `ready`.
- La base `neondb` no contiene tablas.
- La migración `apps/api/migrations/0001_initial.sql` permanece versionada en GitHub y no se ha aplicado a la rama primaria.
- La autorización para aplicar migraciones a `main` sigue pendiente.

## Hallazgos antes de conectar endpoints

1. **Finalización de ventas:** la restricción de `sales` valida las instantáneas de tasa y totales al pasar a `completed`, pero SQL no garantiza por sí solo que existan artículos y pagos suficientes. La operación de finalizar una venta debe hacerse en una única transacción y comprobar artículos, pagos, total y tasa.
2. **Existencias y libro de movimientos:** `products.stock_quantity` y `inventory_movements` representan el saldo y su historial. Cada compra, venta, devolución o ajuste debe actualizar ambos dentro de la misma transacción; los movimientos históricos no se deben borrar para corregir saldos.
3. **Importes de líneas:** la tabla `sale_items` conserva precios y totales como instantáneas, pero la API debe calcular y validar `line_total_usd` y `line_total_ves`; nunca confiar en totales calculados por el navegador.
4. **Pagos en dos monedas:** como los pagos pueden registrarse en USD o VES, el servidor debe convertir cada pago con la tasa capturada en la operación y validar el importe pagado contra el total de la venta. No se deben sumar importes brutos de monedas distintas.
5. **Idempotencia:** `sales.idempotency_key` es única. La API debe manejar la colisión devolviendo el resultado de la operación original o un conflicto claro; un reintento no puede crear otra venta ni descontar stock otra vez.
6. **Identidad y acceso (hallazgo histórico, supersedido):** al 2026-10-17 no se había verificado autenticación. Desde entonces se implementó Google OAuth + allowlist y sesión. Sigue vigente la conclusión de que no se deben publicar endpoints comerciales sin autorización de servidor por operación y aislamiento tenant/sucursal; nunca aceptar el rol del usuario desde el cuerpo de una petición.
7. **Correo del usuario:** la migración requiere que el correo no sea nulo y hace única su versión en minúsculas, pero no impide una cadena vacía. Antes de dar por cerrado el esquema, decidir si esta validación se incorpora a una migración posterior o se garantiza con una validación estricta en la API.

## Orden seguro de integración

1. Mantener y ampliar las pruebas de sesión/autenticación y resolver la integración PostgreSQL para Cloudflare Workers sin incluir secretos en Git. Google OAuth ya está implementado; esto no cierra autorización comercial ni la integración real de los módulos.
2. Añadir pruebas de integración contra una base aislada o rama de prueba; no usar `main` como entorno de experimentación.
3. Implementar primero operaciones transaccionales de inventario y venta, con pruebas de concurrencia, idempotencia y reversión.
4. Revisar y aprobar la migración final y el procedimiento de respaldo/restauración.
5. Solicitar autorización explícita antes de ejecutar cualquier migración en la rama primaria de Neon.
6. Configurar variables de entorno y despliegues solamente después de verificar pruebas y límites de los planes gratuitos.

## Límites actuales

- La autenticación Google OAuth/allowlist está implementada en la API; las rutas comerciales no están implementadas ni listas para producción.
- La integración operativa completa con Neon y la aplicación de migraciones a Neon `main` no están demostradas por esta revisión.
- No hay despliegue de producción.
- La interfaz actual es una pantalla inicial; no representa datos comerciales reales.
- La CI ha compilado y ejecutado las pruebas del repositorio, pero todavía no prueba transacciones reales de PostgreSQL.


---

## Revisión de diseño multi-sucursal — 2026-10-30

Se contrastó el DDL versionado en apps/api/migrations/0001_initial.sql con la propuesta docs/sdd/MULTI_BRANCH_DATA_MODEL.md.

- Verificado en el DDL: organizations/organization_members, suppliers/products, sales/sale_items/payments, inventory_movements y audit_logs; products.stock_quantity es organización-scoped.
- No existen tablas branches, warehouses, registers, register_shifts, branch_memberships ni inventory_balances.
- Las referencias de inventory_movements siguen siendo polimórficas (reference_type/reference_id) sin FK al documento origen.
- Las FKs compuestas existentes ya protegen varias relaciones por organization_id, pero no sustituyen autorización de servidor por sucursal.
- La venta completada no queda reconciliada por constraints SQL con sus líneas/pagos; payments no tiene idempotency key propia; saldo y ledger no tienen reconciliación DB; auditoría no es append-only por permisos/DDL.
- La propuesta define relaciones tenant-scoped y pruebas futuras, pero no es una migración ni se ejecutó contra PostgreSQL en este bloque.
- No se accedió a Neon ni se modificó la base remota.
