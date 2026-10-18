# Matriz de aprendizaje de POS de referencia

**Objetivo:** convertir las investigaciones de OSPOS, NexoPOS, Lakasir y POSNext en requisitos propios y pruebas de aceptación, sin copiar código ni heredar sus licencias/arquitecturas.

| Referencia | Patrones a estudiar | Decisión para Micro app | Riesgo/condición |
|---|---|---|---|
| [OSPOS](https://github.com/opensourcepos/opensourcepos) | Ventas, caja, inventario, compras, recibos, códigos de barras, proveedores, permisos y reportes. | Usar como lista funcional para completar los flujos de caja e inventario. | Licencia/atribución requieren lectura específica antes de reutilizar cualquier material; no copiar código. |
| [NexoPOS](https://github.com/Blair2004/NexoPOS) | Pagos, devoluciones, cierres de caja, historial de stock, roles y modularidad. | Usar para diseñar módulos, permisos y auditoría. | GPL-3.0 reportada en la revisión; no incorporar código/dependencias sin análisis de obligaciones. |
| [Lakasir](https://github.com/lakasir/lakasir) | Compras, descuentos, cuentas por cobrar, códigos de barras e impresión térmica. | Incluir estos casos en backlog y validación con hardware real cuando exista POS operativo. | Revisar licencia y dependencias vigentes antes de cualquier reutilización. |
| [POSNext](https://github.com/BrainWise-DEV/POSNext) | UX de caja, actualizaciones en tiempo real y límites de trabajo offline. | Inspirar la interfaz; mantener online-first en la primera versión y estudiar offline solo si hay necesidad demostrada. | Está ligado a ERPNext; la sincronización offline añade conflictos e integridad complejos. |

## Criterios funcionales convertidos en pruebas

- [ ] Venta con múltiples líneas, cantidades, descuentos autorizados y cálculo monetario decimal.
- [ ] Reintento de venta con la misma clave idempotente no duplica el cobro ni el movimiento de stock.
- [ ] Stock concurrente no cae por debajo de cero.
- [ ] Devolución crea movimientos reversos y conserva la venta original y su auditoría.
- [ ] Apertura/cierre de caja registra fondo inicial, entradas, salidas y diferencia.
- [ ] Recibo refleja instantáneas de precio, USD/VES y tasa aplicada en el momento de venta.
- [ ] Permisos de cajero/administrador se comprueban en la API, no solo ocultando controles de interfaz.
- [ ] Búsqueda por código de barras y comportamiento de impresión se validan en navegador y hardware real.
- [ ] Si se evalúa offline, probar conflictos de stock, reintentos y recuperación de red antes de habilitarlo.

## Límite de evidencia

La matriz es una traducción de la investigación documentada en `docs/INSPIRATION.md`, no una auditoría de los repositorios ni una certificación de sus funciones actuales. Confirmar actividad, licencia y documentación upstream antes de adoptar decisiones. El diseño y el código de Micro app deben desarrollarse independientemente.
