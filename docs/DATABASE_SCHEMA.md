## Estado vivo de migraciones y ramas — 2026-11-04 21:40 EDT

- `main` = `7b0f057b8c152515005feed40305143c0ebb94b0`; contiene migraciones 0001–0004. No afirmar que 0005 esté en main ni aplicada a Neon.
- PR #200 propone `0005_warehouse_inventory.sql` y assertions para warehouses, inventory_balances, counts y ledger; HEAD actual de rama `243592468e9fd61b1f8c578d867887dbb7f18e4d`.
- PR #204 añade aislamiento de fixtures; HEAD `57a9f098bcb93427315e96c90e62ae13764a485b`.
- PR #205 extiende la misma migración 0005 con campos/índice de idempotencia; HEAD `c1f09d09dd08b9600e7a6c0ff8ccbb5be4e9c990`. Su rama está 1 commit detrás de #204. No tratar el esquema de #205 como candidato de integración hasta sincronizar y revalidar.
- PR #194 contiene `0005_register_shift_member_roles.sql` en rama `work/mvp-foundation`, HEAD `7b3ad50e5780416868a1a428b856d12c4ea1e2ea`. Colisiona por número con la migración de inventario. Mantener la secuencia prevista: inventario 0005 primero; después renombrar roles a 0006 y actualizar referencias, assertions y workflows en una sola operación coordinada.
- **Atomicidad:** `0005_warehouse_inventory.sql` no contiene transacción explícita. `migration-check.yml` invoca psql con `ON_ERROR_STOP=1`, pero el autocommit predeterminado puede conservar DDL ejecutado antes de un error. Antes de aplicación remota, implementar BEGIN/COMMIT compatible o estrategia de recuperación y una prueba de fallo inducido en PostgreSQL efímero.
- La suite PostgreSQL efímera y checks de CI no prueban migración remota. No ejecutar Neon producción ni modificar datos reales.
- Stale-count sigue siendo defecto funcional pendiente: el lock durante confirmación no detecta por sí solo que un conteo se creó a partir de un balance anterior. Añadir snapshot/version o política equivalente y test de dos conteos confirmados en orden inverso.
- Idempotencia #205 cubre clave, hash canónico, replay y conflicto, pero no resuelve stale-count ni la dependencia de rama 1 commit detrás de #204.

---

# Estado actual del esquema — reconciliación 2026-11-04

**Este addendum supersede las afirmaciones de estado que siguen fechadas 2026-10-30; el contenido anterior se conserva como historial.**

- `main` verificado en `7b0f057b8c152515005feed40305143c0ebb94b0` no incluye migración 0005.
- PR #200 permanece abierta/Draft, HEAD `7d2ef3d5e9ced1d4e8d386110129d21eb53af045`; su rama añade `0005_warehouse_inventory.sql` y assertions. CI valida 0001–0005 desde cero en PostgreSQL 18 desechable.
- El éxito de CI no demuestra que 0005 esté aplicada a Neon main ni autoriza su aplicación.
- 0005 no contiene transacción explícita y CI usa `psql -v ON_ERROR_STOP=1 -f` con autocommit predeterminado. Un fallo intermedio puede dejar DDL previo confirmado. Resolver con transacción compatible o recuperación explícita de estado parcial y prueba de fallo inducido.
- No hay evidencia verificada de procedimiento aprobado de migración/rollback en Neon. No ejecutar SQL remoto como parte de esta revisión.

## Gates antes de cualquier migración remota

Preflight de esquema, backup/restore comprobados, atomicidad o recuperación, orden de despliegue, compatibilidad hacia atrás, pruebas de concurrencia y plan de rollback. No inferir el estado remoto de Neon a partir de Git.

---


**Último SHA con cambios de esquema/runtime:** PR #169, `be35a0fde3886271b6ed98b7ccc29cc1255d50e5`. PR #170 (`af08cd913a4e0e155b1b74183a71efc51e5d4646`) fue solo documental y no cambió esquema. Consultar el ref vivo de `main` antes de cualquier cambio. Main versiona `0001_initial.sql`, `0002_google_identity.sql`, `0003_branch_scope.sql` y `0004_register_shifts.sql`; las migraciones 0003/0004 no se han aplicado a Neon main.

`0004_register_shifts.sql` añade `registers` y `register_shifts`; CI valida 0001–0004 desde cero en PostgreSQL 18 desechable. PR #169 añadió un helper runtime aislado de consulta de turno abierto, sin cambios de esquema ni aplicación remota.

## Esquema versionado actual

- Identidad/tenant: `organizations`, `app_users`, `organization_members`, `auth_sessions`, `auth_rate_limits`, `auth_allowlist`, `auth_bootstrap`.
- Catálogo/operación legacy: `suppliers`, `products`, `exchange_rates`, `sales`, `sale_items`, `payments`, `inventory_movements`, `audit_logs`.
- Sucursales y asignaciones (0003): `branches`, `branch_memberships`, con FKs compuestas tenant-scoped.
- `products.stock_quantity` continúa a nivel organización; no existe todavía stock por almacén.
- No implementado en main: `warehouses`, `inventory_balances`, compras/recepciones, transferencias y devoluciones. `registers`/`register_shifts` sí están versionados por 0004; almacenes y balances siguen pendientes.

## Estado de ejecución y límites

- CI aplica 0001–0003 desde cero en PostgreSQL 18 desechable y ejecuta assertions/integración. Esta es la validación primaria de migraciones.
- Las migraciones 0003 y 0004 no se han aplicado a Neon main. No inferir el estado remoto por el contenido de Git ni ejecutar migraciones allí por rutina.
- `resolveBranchContext` está implementado y probado, pero no conectado a rutas; no existen handlers comerciales ni autorización por operación.
- La matriz `docs/sdd/role-permission-decision-matrix.md` sigue **NO APROBADA**.
- Brechas previas a negocio: reconciliación venta/líneas/pagos, idempotencia propia de pagos, saldo/ledger, referencias tipadas de movimientos, guard del último owner y auditoría append-only. Ver `SCHEMA_REVIEW.md`.

---

La descripción histórica inferior debe leerse junto con este checkpoint y con `apps/api/migrations/0001_initial.sql` / `0002_google_identity.sql`. El esquema inicial sí incluye `organizations`, `organization_members`, `auth_sessions`, `auth_rate_limits`, `auth_allowlist` y `auth_bootstrap`, además de las tablas comerciales. La API usa `@neondatabase/serverless` en las rutas de autenticación mediante `withDatabaseClient`; por tanto, las frases históricas que dicen que no hay autenticación/conexión API están supersedidas.

**Nota de alcance:** el texto histórico de abajo describe el DDL inicial 0001, no el esquema versionado completo. Desde PR #165, `branches` y `branch_memberships` existen en 0003; siguen ausentes almacenes, cajas/turnos, balances, compras/recepciones, devoluciones y transferencias. `products.stock_quantity` sigue a nivel organización. La migración inicial `0001_initial.sql` declara que no se ha aplicado a Neon `main`. El estado histórico del repositorio registra que `0002_google_identity.sql` se aplicó a Neon `main` el 2026-10-25; ese estado remoto no se revalidó en esta sesión. No inferir que `0001` está aplicada ni ejecutar nuevas migraciones allí.

`apps/api/migrations/0001_initial.assertions.sql` prueba varias FK compuestas contra referencias cruzadas de organización, pero su fixture también inserta ventas `completed` sin insertar líneas ni pagos. Esto confirma que las constraints actuales no hacen reconciliación comercial completa. Los endpoints futuros deben calcular y verificar venta/líneas/pagos/stock/ledger dentro de transacciones, con idempotencia y pruebas de rollback/concurrencia.

Las pruebas de auth/integración usan PostgreSQL real de prueba cuando `DATABASE_URL` está configurada y fallan en CI si falta esa variable. Esto no equivale a pruebas de rutas comerciales, porque aún no existen.

---

# Modelo inicial de datos

La migración versionada `apps/api/migrations/0001_initial.sql` establece el esquema inicial de PostgreSQL para Micro app. Se probó su ejecución en una rama temporal aislada de Neon; la rama principal no se modifica hasta revisar y autorizar la aplicación de la migración.

## Tablas

- `app_users`: identidad de aplicación y roles iniciales (`owner`, `admin`, `cashier`, `inventory`). El hash de contraseña es opcional durante la preparación; no habilitar inicio de sesión hasta implementar hash seguro, sesiones y controles de autorización.
- `suppliers`: proveedores y datos de contacto.
- `products`: SKU, código de barras, costo/precio base USD, existencias, stock mínimo y proveedor.
- `exchange_rates`: historial USD/VES con fuente, fecha efectiva, hora de consulta y estado de validación.
- `sales`: estado, clave de idempotencia única, totales USD y snapshots de tasa y total VES.
- `sale_items`: detalle de la venta con nombre/SKU, cantidad, precio y costo unitario y totales capturados en el momento.
- `payments`: pagos mixtos en USD o VES, método y equivalente USD/tasa capturados.
- `inventory_movements`: libro de movimientos de inventario, cantidades firmadas, motivo y referencia.
- `audit_logs`: trazabilidad de acciones, actor y metadatos.

## Invariantes que la API debe cumplir

1. Crear la venta, insertar sus líneas y pagos, descontar existencias, registrar movimientos y completar la venta dentro de una única transacción.
2. La base de datos verifica que `total_usd = subtotal_usd - discount_usd`; una venta completada requiere fecha de finalización y una tasa identificada y capturada.
3. Usar `idempotency_key` para que reintentos no generen ventas duplicadas.
4. Bloquear las filas de productos y validar las cantidades dentro de la transacción; una venta no puede dejar stock negativo.
5. Calcular los importes en el servidor y usar `NUMERIC`/decimales, nunca `float` de JavaScript para dinero.
6. Guardar snapshots de precio, costo y tasa; los cambios futuros de catálogo o tasa no reescriben ventas anteriores.
7. No borrar movimientos de inventario ni ventas con líneas asociadas para corregirlos: añadir un ajuste, reverso o devolución con motivo y usuario.
8. Aplicar autorización en cada endpoint. La columna `role` por sí sola no implementa seguridad.
9. Marcar la tasa como desactualizada en la lógica de servicio sin sustituir la última tasa válida por respuestas inválidas.

## Migraciones y conexión

- Mantener los archivos SQL versionados en este directorio.
- Probar primero cada migración desde cero en PostgreSQL desechable de CI. Usar una Neon branch solo si añade una validación que CI no cubre; Neon main no es laboratorio.
- No guardar cadenas de conexión, contraseñas ni tokens en Git.
- La migración inicial crea estructura vacía; no inserta usuarios ni datos comerciales.
- La API ya dispone de conexión PostgreSQL mediante `@neondatabase/serverless`; CI valida las migraciones versionadas en PostgreSQL desechable. La aplicación de migraciones a Neon main y la operación comercial siguen sin demostrarse.


---

## Reconciliación de ramas y validación — 2026-11-05 UTC

- #200: HEAD `243592468e9fd61b1f8c578d867887dbb7f18e4d`, 16 ahead/0 behind main. 10 workflow runs success para ese SHA; sin status contexts ni reviews/threads.
- #204: HEAD `57a9f098bcb93427315e96c90e62ae13764a485b`, 3 ahead/0 behind #200; no workflow runs/status contexts recuperados para ese SHA.
- #205: HEAD `c1f09d09dd08b9600e7a6c0ff8ccbb5be4e9c990`, divergida respecto a #204 (9 ahead/1 behind); solo un workflow de backup restore success. No integrar hasta sincronizar y revalidar.
- #202 docs: el SHA `348cf0a1067c5410ff262f817b054cef46f0afae` tuvo 9 workflows success, pero los commits documentales nuevos cambian el HEAD; no trasladar su estado CI.
- La migración 0005 no está en main ni aplicada a Neon. El riesgo de DDL parcial sigue abierto hasta implementar transacción/recuperación y probar fallo inducido.
- Stale-count es independiente de idempotencia: hace falta versión/snapshot al crear/confirmar conteo y prueba determinista de dos conteos confirmados en orden inverso.
- La colisión de migración 0005 de inventario con 0005 de roles en #194 sigue abierta; no fusionar #194 ni renumerar sin plan coordinado.


## Corrección de stale-count — 2026-11-05 UTC

El servicio y la prueba de integración de #200 ya implementan y demuestran el guard básico: `expected_on_hand_quantity` se captura al crear el conteo físico y la confirmación retorna 409 `COUNT_STALE` cuando el saldo actual difiere. El test confirma primero un conteo más nuevo y rechaza el anterior sin ledger movement. La afirmación anterior de que no estaba implementado queda supersedida. Queda por evaluar una versión monotónica para detectar ABA (saldo cambia y vuelve al mismo valor) antes de añadir nuevos escritores; todos deben respetar el mutex de almacén.



## Reconciliación posterior: migración atómica y ramas sincronizadas — 2026-11-05 UTC

- #200 HEAD `a40d8378d792197628f70b07be04f92686d55bdb`: 17 ahead/0 behind de main, 30 archivos (+3555/-17). Diez workflow runs completados success en este SHA, incluidos CI, Playwright, Database migration validation, Semgrep, Security, Secret history, Backup restore, Dependency review, ODD docs y Project progress. Sin status contexts, reviews formales ni threads inline.
- #204 HEAD `e37847c95958c3475f90041263ca4fac7f98c2d1`, base #200 HEAD `a40d8378...`: 4 ahead/0 behind. Merge commit que incorpora la migración atómica de #200 y preserva el cambio de fixtures. No se recuperaron runs/status contexts para este SHA; sin reviews/threads.
- #205 HEAD `a2fe55847d72b4d9994b781880843ab4906c7b08`, base #204 HEAD `e37847c...`: 10 ahead/0 behind. Merge commit que incorpora el último cambio de #204, la migración atómica y el workflow de rollback, preservando idempotencia. No se recuperaron runs/status contexts para este SHA; sin reviews/threads.
- Migración 0005 tiene BEGIN/COMMIT de nivel superior. migration-check prueba una copia con fallo inyectado antes de COMMIT, espera que psql falle y comprueba que no existan tablas de inventario; después aplica la migración real y sus assertions. Los diez workflows success de #200 incluyen Database migration validation en el SHA a40d8378...
- #204/#205 requieren validación completa en sus nuevos merge HEAD; no heredar CI de SHA anteriores. Todas las PR siguen Draft; ninguna se fusionó.
- Stale-count básico está implementado: captura expected_on_hand_quantity y devuelve 409 si el saldo difiere; una prueba confirma primero el conteo nuevo y rechaza el antiguo. Riesgo residual ABA/versionado monotónico antes de sumar otros escritores.
- Issue #53 sigue abierta; autorización/aislamiento completo aún no probado. Colisión 0005 roles en #194 sigue pendiente.
- No tocar Neon producción, deploy productivo, secretos, DNS, billing ni datos reales; no force-push ni modificar main.



## Corrección de evidencia CI y sincronización de ramas — 2026-11-05 UTC

La consulta directa a GitHub Actions por `head_sha` incluye eventos `push` y `pull_request`; sus resultados amplían la consulta anterior, que solo devolvía runs PR-triggered:

- #200 HEAD `a40d8378d792197628f70b07be04f92686d55bdb`: **17/17 workflow runs success** (10 pull_request + 7 push), incluye Database migration validation con rollback inducido, CI y Playwright. 17 ejecuciones no significan 17 checks únicos. Combined statuses vacío; sin reviews formales ni threads.
- #204 HEAD `e37847c95958c3475f90041263ca4fac7f98c2d1`: **7/7 workflow runs success** (push), incluye CI, Playwright, Database migration validation, Semgrep, Security, Secret history y Backup restore. Sin status contexts, reviews ni threads.
- #205 HEAD `a2fe55847d72b4d9994b781880843ab4906c7b08`: **8/8 workflow runs success** (7 push + 1 pull_request), incluye CI, Playwright, Database migration validation, Semgrep, Security, Secret history y Backup restore. Sin status contexts, reviews ni threads.
- Relaciones verificadas: #200 17 ahead/0 behind main; #204 4 ahead/0 behind #200; #205 10 ahead/0 behind #204. No hay divergencia entre la pila.
- Los cuerpos de #200/#204/#205 reflejan estos SHA y resultados. Todas permanecen Draft; no hay aprobación formal ni merge.
- La migración 0005 está envuelta en BEGIN/COMMIT y el workflow de migración ejecuta un fallo inducido antes de COMMIT, verifica ausencia de tablas y después aplica el SQL real. Los 17/7/8 runs incluyen la validación de migraciones de sus SHA correspondientes.
- Stale-count básico: snapshot de cantidad, 409 y prueba de confirmación inversa. Residual ABA/versionado antes de futuros writers.
- #202 HEAD `2793550cb9ccb4595971ad86ce6b950203c681df` tenía 11 workflow runs (7 success, 4 in_progress) en la consulta; ese estado se recalcula para cualquier commit documental posterior.


## Addendum de integridad de inventario — 2026-11-05 UTC

Este addendum describe el esquema propuesto en las ramas de PR #200/#204/#205. **No forma parte de `main` ni ha sido aplicado a Neon** mientras las PR sigan abiertas.

### Versionado monotónico de balances

- `inventory_balances.balance_version BIGINT NOT NULL DEFAULT 1 CHECK (balance_version > 0)`: el trigger `inventory_balances_version` fija 1 en INSERT y suma 1 en cada UPDATE que cambie `on_hand_quantity` o `reserved_quantity`. Cambios solo de metadatos conservan la versión.
- `inventory_balances_no_delete` rechaza DELETE. Los balances se ponen en cero mediante UPDATE; no se elimina y recrea una fila porque eso reiniciaría la secuencia.
- `inventory_count_lines.expected_balance_version BIGINT`: snapshot capturado al crear un conteo físico junto con `expected_on_hand_quantity`; versión 0 representa que aún no existe fila de balance. En conteos opening ambos campos permanecen NULL.
- Al confirmar un conteo físico, el servicio compara cantidad y versión contra el balance bloqueado. Una diferencia en cualquiera devuelve 409 `COUNT_STALE` sin confirmar el documento ni crear movimientos.
- La prueba ABA modifica 8.250 → 8.500 → 8.250 y exige 409 aunque la cantidad final coincida, porque la versión aumenta en ambos cambios. Assertions SQL también verifican incrementos por saldo/reserva, ausencia de incremento por metadatos y rechazo de DELETE.

### Evidencia de validación de las ramas

- PR #200 código HEAD `7b58b140e50c46a3d3b087e3445a4b04e6243a81`: 16/16 workflow runs success, incluidos CI/PostgreSQL y Database migration validation. HEAD documental `5fbc17a48b65076cf5609a7a054bbd125a3a5d1e`: 16/16 success.
- PR #204 HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20`: 6/6 workflow runs success.
- PR #205 HEAD `7005d9a5b03234bd0209d0cc1ea75e8ae21e0032`: 8/8 workflow runs success; conserva idempotencia y lleva el versionado ABA.
- Son workflow runs de los SHA indicados, no status contexts ni aprobación formal. Las tres PR siguen Draft, sin merge ni despliegue.


## Reconciliación de cobertura HTTP — 2026-11-05 UTC

- PR #205 HEAD vigente `bb4a60454061ce09fef07100e75010f3abc5b883`, base #204 `07a5a41c0f5f5c36fb89a5c5950796493d56eb20`: 25 ahead/0 behind, diff propio de 3 archivos, 7/7 workflow runs success. Su suite PostgreSQL de conteos pasó 20/20 pruebas.
- La suite ahora prueba selector de tenant ajeno en POST/GET, producto de otro tenant en la solicitud, Inventory sin asignación a otra sucursal y warehouse cuyo branch no coincide; las denegaciones verifican que no se creen conteos/líneas.
- El alcance sigue parcial: falta probar, entre otros, un ID de conteo ajeno en confirmación y todas las rutas de catálogo/lectura contra cada combinación de rol. No existen todavía endpoints de balances/movimientos para completar permisos de lectura de Cashier/Inventory.
- La tabla `audit_logs` definida en migración 0001 no tiene trigger append-only en las migraciones 0001–0005. No se verificaron aquí los GRANT/privilegios efectivos del rol runtime. El ledger `warehouse_inventory_movements` sí tiene protección UPDATE/DELETE en 0005.
- PR #202 con estos addenda: HEAD `52996471ce3c143527fe4725085b38ee67bdf402`, 74 ahead/0 behind, 18 archivos documentales, 11/11 workflow runs success. Sin reviews formales, threads ni status contexts en la consulta; sigue Draft.


## Orden de idempotencia y locks — 2026-11-05 UTC

En PR #205 HEAD `bb4a60454061ce09fef07100e75010f3abc5b883`, la creación reclama/inserta el documento idempotente después del mutex del almacén y antes de bloquear balances. Un replay retorna sin adquirir locks de stock; una creación nueva sigue el orden almacén → documento → balances. Si falla la validación del lock scope tras insertar el draft, se fuerza ROLLBACK. Para este SHA exacto: 7/7 workflow runs success, incluida la suite PostgreSQL de inventario (20/20 pruebas).
