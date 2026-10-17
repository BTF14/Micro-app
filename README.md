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

## Stack elegido para mantener el costo en $0

- **Frontend:** React + Vite + TypeScript; archivos estáticos servidos por Cloudflare Pages.
- **API:** Cloudflare Workers + Hono + TypeScript, en un servicio separado del frontend.
- **Base de datos:** PostgreSQL independiente en Neon Free, con Drizzle ORM y migraciones versionadas.
- **Pruebas:** Vitest y Playwright; automatización de CI con GitHub Actions dentro de las cuotas gratuitas.
- **Diseño:** CSS propio y dependencias open source; sin componentes premium.
- **Dominio:** usar el subdominio gratuito del proveedor al principio; un dominio personalizado normalmente cuesta dinero.

La arquitectura evita depender de funciones propietarias de un único hosting: React/Vite se puede servir en otros hostings estáticos, la API usa estándares web y PostgreSQL es portable. Los planes gratuitos tienen límites y pueden cambiar; no se promete capacidad ilimitada ni disponibilidad comercial garantizada. No se habilitará facturación automática ni se añadirá un servicio de pago para sortear límites.

No se usará Vercel Hobby como alojamiento objetivo de la operación: sus términos reservan ese plan al uso personal/no comercial. Si el uso de Micro app llega a requerir recursos de pago, se priorizará reducir/optimizar el uso o migrar a infraestructura gratuita que el usuario pueda operar, nunca generar cargos sin autorización.

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
- [x] Decisión inicial de arquitectura gratuita documentada.
- [x] Esqueleto inicial de frontend React/Vite y API Hono/Workers.
- [x] CI inicial: compilación, revisión de tipos y prueba de pantalla pasan en GitHub Actions.
- [ ] Proyecto PostgreSQL independiente creado; la conexión actual de Neon bloquea crear proyectos desde esta integración.
- [ ] Migraciones, autenticación, funciones de negocio y preview desplegados.

El estado se actualizará a partir de trabajo verificable, no de estimaciones optimistas.
