# Estado actual del esquema — 2026-10-30 UTC

El DDL vigente de referencia es apps/api/migrations/0001_initial.sql y la propuesta futura está en docs/sdd/MULTI_BRANCH_DATA_MODEL.md. La migración inicial declara que no se ha aplicado a Neon main; no asumir que el estado remoto coincide sin una lectura autorizada y actual.

**Esquema actual confirmado en Git:** organizations, organization_members, auth_sessions, auth_rate_limits, proveedores/productos, exchange_rates, sales, sale_items, payments, inventory_movements y audit_logs. products.stock_quantity sigue a nivel organización. No existen branches, warehouses, registers, register_shifts, branch_memberships, inventory_balances, compras/recepciones, transferencias ni devoluciones en 0001_initial.sql.

**Brechas previas a negocio:** aislamiento por sucursal ausente; venta/líneas/pagos no reconciliados por constraints; pagos sin idempotencia propia; stock y ledger no están sincronizados por constraint; referencia polimórfica sin FK al origen; guard del último owner y auditoría append-only no implementados. Ver SCHEMA_REVIEW.md.

---

La descripción histórica inferior debe leerse junto con este checkpoint y con `apps/api/migrations/0001_initial.sql` / `0002_google_identity.sql`. El esquema inicial sí incluye `organizations`, `organization_members`, `auth_sessions`, `auth_rate_limits`, `auth_allowlist` y `auth_bootstrap`, además de las tablas comerciales. La API usa `@neondatabase/serverless` en las rutas de autenticación mediante `withDatabaseClient`; por tanto, las frases históricas que dicen que no hay autenticación/conexión API están supersedidas.

**Límites vigentes:** no hay sucursales, almacenes, cajas/turnos, compras/recepciones, devoluciones ni transferencias en el DDL inicial; `products.stock_quantity` sigue a nivel organización. La migración inicial `0001_initial.sql` declara que no se ha aplicado a Neon `main`. El estado histórico del repositorio registra que `0002_google_identity.sql` se aplicó a Neon `main` el 2026-10-25; ese estado remoto no se revalidó en esta sesión. No inferir que `0001` está aplicada ni ejecutar nuevas migraciones allí.

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
- Probar cada migración en una rama temporal antes de aplicarla a la rama principal.
- No guardar cadenas de conexión, contraseñas ni tokens en Git.
- La migración inicial crea estructura vacía; no inserta usuarios ni datos comerciales.
- La conexión de la API con Neon y el ejecutor de migraciones todavía deben implementarse y probarse.
