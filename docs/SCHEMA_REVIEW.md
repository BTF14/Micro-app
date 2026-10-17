# Revisión de integridad del esquema

Estado revisado: 2026-10-17. Esta revisión es documental; no ejecuta SQL ni modifica Neon.

## Estado verificado

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
6. **Identidad y acceso:** `app_users` define roles, pero todavía no existe autenticación implementada. No publicar endpoints de catálogo, caja o inventario hasta añadir autenticación y autorización de servidor. Nunca aceptar el rol del usuario desde el cuerpo de una petición.
7. **Correo del usuario:** la migración requiere que el correo no sea nulo y hace única su versión en minúsculas, pero no impide una cadena vacía. Antes de dar por cerrado el esquema, decidir si esta validación se incorpora a una migración posterior o se garantiza con una validación estricta en la API.

## Orden seguro de integración

1. Resolver la estrategia de sesión/autenticación y la conexión PostgreSQL para Cloudflare Workers sin incluir secretos en Git.
2. Añadir pruebas de integración contra una base aislada o rama de prueba; no usar `main` como entorno de experimentación.
3. Implementar primero operaciones transaccionales de inventario y venta, con pruebas de concurrencia, idempotencia y reversión.
4. Revisar y aprobar la migración final y el procedimiento de respaldo/restauración.
5. Solicitar autorización explícita antes de ejecutar cualquier migración en la rama primaria de Neon.
6. Configurar variables de entorno y despliegues solamente después de verificar pruebas y límites de los planes gratuitos.

## Límites actuales

- No hay conexión de la API a Neon.
- No hay autenticación ni endpoints comerciales listos para producción.
- No hay despliegue de producción.
- La interfaz actual es una pantalla inicial; no representa datos comerciales reales.
- La CI ha compilado y ejecutado las pruebas del repositorio, pero todavía no prueba transacciones reales de PostgreSQL.
