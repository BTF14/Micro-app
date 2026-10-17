# Micro-app

Sistema web de punto de venta e inventario, diseñado para PC y móvil.

## Objetivo

Gestionar productos, códigos de barras, existencias, compras, ventas, pagos, caja, devoluciones y reportes con una interfaz rápida y accesible.

## Reglas fundamentales

- **Proyecto independiente:** no compartir código, base de datos, secretos ni despliegues con `Cantina-pos` u otros proyectos.
- **Moneda base:** USD. Los equivalentes en VES se calculan usando una tasa BCV validada y registrada.
- **Integridad:** PostgreSQL es la fuente de verdad para ventas e inventario; las operaciones críticas deben ser transaccionales e idempotentes.
- **Trazabilidad:** guardar movimientos de inventario, usuario responsable, auditoría y una instantánea de precios y tasa aplicada a cada venta.
- **Tasa:** guardar fuente, fecha efectiva, hora de consulta y estado; si falla la actualización, conservar la última tasa válida y advertir que está desactualizada.
- **Calidad:** no marcar funcionalidades como terminadas hasta que estén implementadas y verificadas con pruebas.

## Plan de trabajo

1. Fundamentos del repositorio, documentación, controles de seguridad y CI.
2. Base de datos PostgreSQL independiente, migraciones y autenticación/roles.
3. Catálogo, códigos de barras, movimientos de inventario, proveedores y tasa BCV.
4. Caja/POS: carrito, descuentos autorizados, pagos, cambio, recibos, devoluciones y cierre de caja.
5. Interfaz responsive, temas automático/claro/oscuro y reportes.
6. Pruebas unitarias, integración y E2E en escritorio/móvil; despliegue de preview independiente.

## Criterios de aceptación

- Las ventas repetidas por reintento no se duplican.
- El stock no puede venderse por debajo de cero por concurrencia.
- Cada venta conserva precios y tasa usados en el momento de la operación.
- La tasa desactualizada se identifica claramente y nunca reemplaza una tasa válida con datos inválidos.
- Los permisos se validan en el servidor.
- Migraciones, pruebas y CI pasan antes de considerar una fase completada.

## Estado

- [x] Repositorio privado independiente creado.
- [x] Alcance y reglas iniciales documentados.
- [ ] Diseño visual final seleccionado.
- [ ] Arquitectura y migraciones implementadas.
- [ ] Aplicación, pruebas y preview desplegados.

El estado se actualizará a partir de trabajo verificable, no de estimaciones optimistas.
