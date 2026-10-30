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
