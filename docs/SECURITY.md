# Guardrails de seguridad y datos

## Aislamiento

- Micro app es un proyecto independiente.
- No reutilizar el proyecto Neon, credenciales, variables de entorno, dominios, buckets ni despliegues de Cantina-pos u otros proyectos.
- Crear un proyecto de base de datos dedicado a Micro app antes de conectar la aplicación.
- No incluir secretos, tokens, cadenas de conexión ni datos reales de clientes en el repositorio o en pruebas.

## Reglas de datos

- PostgreSQL es la fuente de verdad para ventas, caja e inventario.
- Usar transacciones para completar venta, registrar pago y descontar stock como una única operación atómica.
- Aplicar claves de idempotencia para evitar ventas duplicadas por doble clic o reintentos de red.
- Bloquear/validar stock dentro de la transacción para evitar vender más unidades que las disponibles.
- Guardar precio USD, tasa aplicada, equivalente VES, usuario y fecha como instantánea de la venta.
- Usar tipos DECIMAL/NUMERIC para dinero y cantidades fraccionarias cuando correspondan.
- Los movimientos de stock no se borran para corregir errores: registrar reversos/ajustes con motivo y usuario.

## Autorización

- Autenticación y permisos comprobados en cada endpoint protegido del servidor.
- Los controles de interfaz no sustituyen autorización en la API.
- Aplicar principio de mínimo privilegio a roles, secretos y acceso a datos.
- Proteger cookies de sesión con HttpOnly, Secure en producción y SameSite apropiado.
- Validar entradas en el servidor y devolver errores sin filtrar secretos ni trazas internas.

## Tasa de cambio

- Una fuente externa gratuita no se describirá como API oficial del BCV salvo evidencia verificable.
- Validar valor positivo, moneda, fecha y formato antes de aceptar una tasa.
- Guardar fuente, fecha efectiva, hora de consulta y estado.
- Si falla la consulta o la tasa no pasa validación, conservar la última válida y mostrar advertencia de desactualización.
- No sustituir la última tasa válida con una respuesta vacía, inválida o antigua.
- No considerar obsoleta automáticamente una tasa solo porque sea fin de semana o feriado; evaluar fecha y calendario de publicación.

## Verificación mínima antes de producción

- Pruebas de autorización por rol, validación de entradas y manejo de errores.
- Pruebas de concurrencia y reintentos para ventas/stock.
- Pruebas de migraciones y exportación/restauración.
- Playwright en viewport de escritorio y móvil.
- Revisar cuotas gratuitas y desactivar cualquier opción que pueda generar cargos.
