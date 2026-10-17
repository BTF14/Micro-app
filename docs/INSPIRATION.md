# Referencias técnicas y criterios para Micro-app

Fecha de revisión: 2026-10-17. Las estrellas y actividad cambian con el tiempo; se registran como una fotografía de la revisión.

## Referencias revisadas

### 1. Open Source Point of Sale (OSPOS)
- Repositorio: https://github.com/opensourcepos/opensourcepos
- Métricas observadas: ~4.4k estrellas, ~2.6k forks; actividad reciente y proyecto no archivado.
- Licencia reportada por GitHub API: NOASSERTION. El README incluye condiciones específicas de licencia y atribución; revisar el archivo LICENSE completo antes de reutilizar cualquier código.
- Lo útil para Micro-app: amplitud funcional de POS real — inventario, ventas, caja, recibos, códigos de barras, proveedores, permisos, compras y reportes — y enfoque en procesos operativos completos.
- Diferencias: PHP/CodeIgniter y MySQL; interfaz basada en Bootstrap 3. No se debe copiar su stack ni asumir que su arquitectura encaja con la nuestra.
- Uso previsto: checklist funcional y referencia para flujos de caja/inventario, no como plantilla para copiar.

### 2. NexoPOS
- Repositorio: https://github.com/Blair2004/NexoPOS
- Métricas observadas: ~1.3k estrellas, ~566 forks; actividad reciente.
- Licencia: GPL-3.0. No copiar ni incorporar código sin una decisión consciente sobre obligaciones de licencia y distribución.
- Lo útil: POS, pagos, recibos, devoluciones, registros de caja, inventario, compras, historial de stock, roles, auditoría, códigos de barras y arquitectura modular.
- Diferencias: Laravel/Vue y un ecosistema de módulos; no adoptaremos automáticamente sus dependencias ni su arquitectura.
- Uso previsto: referencia de módulos, permisos y separación de extensiones.

### 3. Lakasir
- Repositorio: https://github.com/lakasir/lakasir
- Métricas observadas: ~911 estrellas, ~348 forks; actividad reciente.
- Licencia: GPL-3.0.
- Lo útil: POS práctico, existencias, compras, descuentos/vouchers, cuentas por cobrar, códigos de barras e impresión térmica.
- Uso previsto: checklist de necesidades cotidianas de un comercio y pruebas de hardware/impresión.

### 4. POSNext
- Repositorio: https://github.com/BrainWise-DEV/POSNext
- Métricas observadas: ~162 estrellas, ~205 forks; actividad reciente.
- Licencia: AGPL-3.0.
- Lo útil: enfoque de UX para caja, actualizaciones en tiempo real y trabajo offline, con integración específica para ERPNext.
- Diferencias: está construido para ERPNext y no es una base directa para nuestra app. Offline-first añadiría complejidad y riesgos de sincronización.
- Uso previsto: estudiar patrones de interfaz y los límites de la sincronización offline; no adoptar offline-first en la primera versión.

## Decisión

Usar estas referencias para aprender y contrastar requisitos, no para clonar ni importar repositorios. El número de estrellas es una señal de adopción, no una auditoría de seguridad, calidad de código o adecuación al producto.

## Principios que sí trasladamos al diseño de Micro-app

1. Venta rápida con búsqueda y lector de códigos de barras, carrito, pagos y recibo.
2. Caja con apertura/cierre, efectivo inicial, entradas/salidas y diferencias.
3. Inventario basado en movimientos trazables; devoluciones y ajustes con motivo.
4. Roles de administrador/cajero y validación de permisos en servidor.
5. Historial/auditoría para operaciones sensibles.
6. Pruebas para concurrencia, reintentos, devoluciones, cálculos monetarios y fallos de red.
7. Responsive para PC y móvil, con impresión térmica validada en hardware real.
8. USD como moneda base; tasa VES registrada por venta con fuente, fecha efectiva, hora de consulta y estado de frescura.
9. PostgreSQL/Neon independiente como fuente de verdad; ventas y stock transaccionales.
10. Seguridad, licencia y mantenibilidad por encima de añadir funciones solo porque existan en otro POS.

## Revisión de licencia

Este documento no es asesoría legal. Antes de copiar código, assets, textos o componentes, revisar la licencia exacta, sus condiciones y dependencias. La opción por defecto es implementar los requisitos de forma independiente y documentar las decisiones técnicas.
