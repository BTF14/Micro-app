# Arquitectura y política de costo cero

Fecha: 2026-10-17

## Decisión

Adoptar una aplicación web separada en frontend estático y API, con PostgreSQL como fuente de verdad:

- Frontend: React + Vite + TypeScript, servido desde Cloudflare Pages.
- API: Cloudflare Workers + Hono + TypeScript.
- Datos: PostgreSQL en un proyecto Neon dedicado exclusivamente a Micro app.
- ORM y esquema: Drizzle ORM y migraciones versionadas en Git.
- Pruebas: Vitest para lógica y Playwright para recorridos E2E.
- Automatización: GitHub Actions, respetando las cuotas gratuitas del repositorio privado.

## Por qué esta opción

1. Mantiene el frontend estático simple, rápido y fácil de alojar gratuitamente.
2. Mantiene un único plano de hosting operativo y evita duplicar proyectos, despliegues y configuración entre proveedores.
3. PostgreSQL es una tecnología estándar y portable. El proyecto de Neon deberá estar separado y no podrá reutilizar bases, credenciales ni ramas de otros proyectos.
4. React/Vite puede migrarse a otro hosting estático y la API puede migrarse a otro runtime compatible con estándares web si cambian los límites del proveedor.
5. Las dependencias principales son open source; no se necesitan componentes visuales premium ni servicios de pago.

## Política estricta de gasto

- Presupuesto de hosting, base de datos, API de tasa, diseño, pruebas y dominio: $0.
- Usar subdominios gratuitos al inicio. Un dominio propio no se presupone gratuito.
- No activar planes de pago, add-ons, créditos que luego se facturen ni escalado con cobro automático.
- No introducir dependencias que exijan suscripción para compilar o ejecutar.
- Cuando se acerque una cuota, reducir consumo, avisar y evaluar una migración; nunca superar el límite con cargos.
- Los proveedores pueden modificar sus cuotas o términos. El objetivo de diseño es costo cero, pero no se puede garantizar que un proveedor mantenga para siempre su plan gratuito.
- En desarrollo local, permitir ejecutar frontend y API sin desplegar ni contratar servicios.
- No guardar ventas, caja o inventario como fuente de verdad en el navegador.

## Límites y riesgos que se aceptan conscientemente

- Los planes gratuitos pueden limitar solicitudes, almacenamiento, cómputo, ejecución programada, logs o soporte.
- El escalado a cero o las pausas pueden provocar latencia inicial.
- Los servicios gratuitos no equivalen a una garantía de disponibilidad ni sustituyen las copias de seguridad.
- La tasa BCV dependerá de fuentes externas gratuitas; la app guardará la última tasa válida, registrará la fuente y avisará cuando la tasa esté obsoleta.
- La operación real de caja debe probarse con impresora, lector y dispositivos físicos antes de declararse lista.

## Seguridad y portabilidad

- Secretos solo en variables de entorno/secretos del proveedor; nunca en Git.
- La API valida autenticación y permisos en el servidor.
- PostgreSQL usa transacciones para ventas, pagos y movimientos de stock.
- Importes monetarios con decimal exacto; nunca aritmética binaria de punto flotante para dinero.
- Cada venta conserva instantáneas de precios y tasa de cambio.
- Migraciones reversibles cuando sea viable, y procedimientos de exportación/restauración documentados.
- No acoplar lógica comercial a una API propietaria del hosting.
- No copiar código de los repositorios de inspiración; implementar requisitos de forma independiente.

## Fuentes oficiales para volver a comprobar antes del despliegue

- Cloudflare Workers: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Pages: https://pages.cloudflare.com/
- Neon planes y límites: https://neon.com/pricing

Revisar límites actuales antes de publicar. No asumir que las cuotas actuales serán permanentes.
