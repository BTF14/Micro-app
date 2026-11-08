# Estado del repositorio — 2026-11-08 UTC

El estado vivo de main, PRs, SHA, checks y próximos pasos está centralizado en [CURRENT_STATE.md](CURRENT_STATE.md) y [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md). Los snapshots históricos que siguen en este documento son evidencia temporal: no reutilizar SHA ni resultados CI sin comprobar el HEAD exacto.

- GitHub main protegido: `aa2804a0a6e7879f684b3baeb60646e50f1d6419`; PR #280 integrada por squash.
- Neon rehearsal #42507066215: SUCCESS; migraciones 0001–0019 verificadas únicamente en `microapp_rehearsal`. Neon main no fue modificado.
- Producción: **NOT READY**; no extrapolar el ensayo ni los builds automáticos a certificación productiva.

---
# Addendum esquema vivo — 2026-11-08 UTC

**Código fuente:** main `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`. La carpeta versionada contiene migraciones 0001–0016:

- 0001 initial
- 0002 Google identity
- 0003 branch scope
- 0004 register shifts
- 0005 auth bootstrap attempts
- 0006 warehouse inventory
- 0007 register shift member roles
- 0008 audit logs append-only
- 0009 inventory count ledger validation
- 0010 inventory balance ledger coupling
- 0011 PostgreSQL runtime lock helpers
- 0012 PostgreSQL runtime role grants
- 0013 BCV official rate precision and grants
- 0014 sales without discounts
- 0015 sales checkout atomicity
- 0016 runtime inventory ledger read

## Neon verificado directamente (solo lectura)

Proyecto `restless-fire-99110035`, base `neondb`.

- Main `br-summer-math-b7297a60`: existen 15 tablas del esquema heredado, pero faltan `branches`, `register_shifts`, `auth_bootstrap_attempts`, `warehouses`, `inventory_balances` y `app_schema_migrations`. No existen `microapp_runtime` ni `microapp_migrator`. `exchange_rates.rate` es NUMERIC(14,6).
- Rehearsal `br-curly-poetry-b7dxsddm`: los roles LOGIN existen; migrator posee los objetos. Runtime puede conectarse y tiene USAGE en schema public, pero no CREATE ni permisos SELECT/INSERT/UPDATE/DELETE sobre las tablas examinadas. También faltan `app_schema_migrations`, `auth_bootstrap_attempts`, `branches`, `register_shifts`, `warehouses` e `inventory_balances`; exchange_rates sigue NUMERIC(14,6).
- El branch rehearsal conserva un baseline útil, pero no tiene aplicadas las migraciones 0003–0016 ni el ledger de migraciones. El login probado con el conector Neon no demuestra que Cloudflare Worker use ese mismo login.
- `.github/workflows/migration-runner.yml` prueba el runner en PostgreSQL 18 desechable; no ejecuta contra Neon. No aplicar SQL manual desde el conector: usar el procedimiento protegido `adopt-baseline.sh`/ `migrate.sh` cuando exista secreto y autorización específica.

# Estado actual del esquema — 2026-10-30 UTC (main post PR #169)

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
