# Motor monetario de Micro-app

**Estado:** contrato técnico aprobado. El núcleo decimal exacto basado en BigInt vive en `packages/money` y lo consumen la API y la UI de catálogo en la PR de recuperación #244 (Draft). Esa PR incluye lectura paginada, creación/edición de productos y precios USD exactos; la validación automatizada está verde en su SHA actual, pero aún no se ha fusionado. Carrito, checkout, ventas y pagos siguen pendientes.  
**Decisión de negocio:** Micro-app no ofrece descuentos ni promociones basadas en descuentos.

## 1. Moneda base y catálogo

- USD es la moneda canónica de costos y precios del catálogo.
- products.price_usd y products.cost_usd se conservan como PostgreSQL NUMERIC(14,4).
- El formulario y la API deben enviar importes como cadenas decimales, por ejemplo "23.85", no como valores binarios de punto flotante.
- La interfaz muestra dos decimales por defecto; puede mostrar más cuando el precio guardado tenga precisión adicional.
- No se almacena un segundo precio VES por producto. La conversión se calcula con la tasa BCV compartida.
- El precio actual del catálogo nunca sustituye el precio histórico guardado en una venta.

## 2. Cantidades fraccionarias

- Cantidades y existencias usan tres decimales en el esquema actual (NUMERIC(14,3)).
- Ejemplos válidos: 1.250 kg, 0.750 L y 0.500 m.
- La unidad debe ser explícita en el producto. No asumir que todo se vende por unidad entera.
- Antes de habilitar ventas, validar la precisión permitida por unidad de medida y rechazar cantidades con más decimales de los admitidos.

## 3. Aritmética y redondeo

- No usar JavaScript Number para operaciones monetarias.
- La API utiliza la implementación TypeScript desde `@micro-app/money`; la web consume el mismo paquete en catálogo y formularios; no mantener copias separadas de las funciones. No mantener copias separadas de las funciones.
- El paquete utiliza cadenas decimales y aritmética entera escalada con BigInt.
- USD interno y subtotales: cuatro decimales.
- VES monetario: dos decimales.
- Regla única: redondeo al más cercano, con los empates alejándose de cero (ROUND_HALF_AWAY_FROM_ZERO), equivalente a round(numeric, scale) de PostgreSQL.
- Para cada línea: multiplicar cantidad por precio unitario y redondear el importe USD a cuatro decimales.
- El subtotal USD es la suma de los importes USD de las líneas; el total USD es exactamente igual al subtotal, porque no existen descuentos.
- Para cada línea: convertir el importe USD de esa línea con la tasa congelada y redondear a dos decimales VES.
- El total VES de la venta es la suma de los importes VES de las líneas. Así, el total del documento reconcilia con sus líneas y no se recalcula con una fórmula distinta en cada pantalla.
- Aplicar las mismas funciones de cálculo y formato en catálogo, carrito, checkout, pagos, comprobante e informes.

## 4. Precisión PostgreSQL y límites de dominio

El paquete valida tanto la escala fraccionaria como la precisión total de cada columna antes de calcular:

| Dato | PostgreSQL | Dígitos enteros máximos | Escala |
|---|---:|---:|---:|
| Precio/costo USD | NUMERIC(14,4) | 10 | 4 |
| Cantidad | NUMERIC(14,3) | 11 | 3 |
| Tasa BCV | NUMERIC(18,8) | 10 | 8 |
| Importe VES | NUMERIC(16,2) | 14 | 2 |

- `parseNumeric` rechaza valores que exceden la precisión total o la escala de su columna.
- `calculateLineUsd` aplica cantidad NUMERIC(14,3) × precio NUMERIC(14,4) y valida el resultado NUMERIC(14,4).
- `convertUsdToVes` aplica importe USD NUMERIC(14,4) × tasa BCV NUMERIC(18,8), redondea a dos decimales y valida NUMERIC(16,2).
- `sumNumeric` evita que una suma exceda el rango del destino.
- Los valores deben seguir siendo cadenas decimales hasta llegar al paquete; no convertirlos a Number.

## 5. Tasa BCV y snapshots

- Fuente primaria propuesta: publicación oficial del BCV en PR #227. No está integrada en main ni habilitada en producción; corregir primero el bug de orden de fechas efectivas.
- La tasa conserva sus ocho decimales como cadena decimal y PostgreSQL NUMERIC(18,8).
- Una operación utiliza una sola tasa de referencia durante todo el checkout.
- Guardar en la venta la tasa, fecha efectiva, identificador de tasa y total VES capturados.
- Guardar en cada línea precio, costo, cantidad e importes USD/VES capturados.
- Guardar en cada pago moneda, importe, equivalente USD y tasa utilizada cuando aplique.
- Cambios posteriores de la tasa o del catálogo nunca modifican operaciones históricas.
- Una tasa stale no debe usarse silenciosamente para nuevas operaciones que requieran conversión a VES. La política exacta para ventas exclusivamente USD se cerrará junto con el contrato de checkout antes de habilitar ventas.

## 6. Sin descuentos

- No existe descuento porcentual ni fijo.
- No existen campos de descuento en formularios, API, modelo comercial o documentos.
- El backend rechaza propiedades desconocidas de descuento.
- La base de datos exige sales.total_usd = sales.subtotal_usd.
- La migración 0014 elimina el campo heredado discount_usd. Si encuentra ventas históricas con total_usd <> subtotal_usd, se detiene y exige reconciliación manual; nunca reescribe importes históricos para forzar la migración.

## 7. Integridad transaccional de ventas y pagos

Antes de implementar endpoints comerciales, cada checkout deberá:

1. Revalidar sesión, organización, sucursal, permisos y estado del producto en servidor.
2. Leer precios actuales desde Neon; no confiar en importes enviados por el navegador.
3. Revalidar stock y bloquear los recursos afectados con el orden de locks documentado para inventario.
4. Calcular líneas, subtotal, tasa, equivalencias y pagos en el servidor.
5. Verificar que las líneas sumen el subtotal y que los pagos reconcilien con el total cobrado.
6. Insertar venta, líneas, pagos, movimientos de inventario y auditoría en una sola transacción.
7. Usar idempotencia para que reintentos no dupliquen ventas ni pagos.
8. Confirmar la venta únicamente si todas las validaciones y escrituras terminan correctamente.

La ausencia de endpoints de ventas/pagos es deliberada en el estado actual; este documento no afirma que el flujo ya esté implementado.

## 8. Rendimiento y coste

- Consultar la tasa compartida una vez por sesión o cuando expire su caché; nunca una consulta por producto.
- No almacenar una copia VES en cada producto.
- Mantener catálogo paginado y consultas agrupadas; evitar N+1.
- Usar las conexiones agrupadas existentes y transacciones cortas.
- No añadir Redis, otra base de datos ni un proveedor de tasa sin evidencia de que sea necesario.
- Medir consultas y latencia antes de añadir índices o cachés adicionales.

## 9. Pruebas de aceptación monetaria

La suite debe cubrir, como mínimo:

- Precio 23.85, 12.99, 0.75 y precios con cuatro decimales.
- Cantidades 1.250, 0.750 y límites de precisión por unidad.
- Conversión con tasa BCV de ocho decimales.
- Redondeos exactos y casos de empate en USD/VES.
- Venta con varias líneas y reconciliación de sus importes.
- Pagos USD, VES y mixtos.
- Cambio de tasa entre dos ventas sin alterar la primera.
- Cambio de precio de catálogo sin alterar ventas anteriores.
- Pagos mixtos, tasa stale, reintentos idempotentes, anulaciones y devoluciones.
- Rollback completo ante fallo de inventario, pago o auditoría.

## 10. Estado de implementación

- Catálogo API: lectura paginada y escrituras POST/PATCH tenant-scoped incluidas en PR #244 Draft; pruebas PostgreSQL admin/runtime exitosas en el SHA validado.
- Esquema base: cantidades con tres decimales y snapshots comerciales previstos.
- PR #227: integración BCV propuesta; no afirmar despliegue de Worker/Cron ni tasa en producción.
- PR #228: migración propuesta para retirar el campo de descuentos.
- Paquete interno compartido de aritmética BigInt y límites NUMERIC: recuperado e integrado en PR #244 Draft; validado por build, unit tests y pruebas de catálogo.
- Los cambios únicos de #229, #230 y #231 se están consolidando en PR #244; las PR fuente siguen abiertas hasta completar el rescate de sus demás cambios únicos.
- Carrito, checkout, ventas, pagos, facturación y reportes: pendientes de integración, contrato transaccional y pruebas.
