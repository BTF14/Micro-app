# Arquitectura de precios, tasa BCV y caché — decisión 2026-10-26

Este documento resuelve, con evidencia, cuáles ideas de un blueprint externo (redactado por otra IA sin contexto del proyecto, aportado por el propietario como insumo) se adoptan, cuáles ya estaban implementadas y cuál se rechaza explícitamente. Reemplaza cualquier ambigüedad previa sobre caché/offline en `docs/ARCHITECTURE_AND_ZERO_COST.md`, que este documento complementa sin contradecir.

## 0. Resumen de la decisión

| Idea del blueprint | Decisión | Estado |
|---|---|---|
| 1. Precio base en USD, cálculo a Bs. al vuelo | Ya implementado, antes del blueprint | Implementado (`apps/api/migrations/0001_initial.sql`) |
| 2. Automatizar la tasa BCV con Cron Trigger | Adoptado | Diseño aprobado aquí, pendiente de implementar |
| 3. Caché de lectura rápida con Cloudflare KV | Adoptado, con límites explícitos | Diseño aprobado aquí, pendiente de implementar |
| 4. Offline-first con IndexedDB + Service Worker para ventas | **Rechazado** | No se implementa; ver razones abajo |
| 5. Tabla de auditoría de precios + índices | Ya implementado, antes del blueprint (más estricto que lo propuesto) | Implementado |
| 6. Respaldo automatizado a R2 | Ya diseñado, antes del blueprint (`docs/BACKUP_AND_RECOVERY.md`, `docs/SECURITY_ROADMAP.md` §2) | Diseño ya existente; implementación en curso |

## 1. Por qué NO se adopta offline-first para ventas (sección 4 del blueprint)

El propietario mismo lo señaló como mala idea antes de leer este análisis, y la evaluación técnica confirma esa intuición. Motivos específicos de este proyecto:

1. **Rompe el único invariante anti-fraude que ya existe.** El esquema actual garantiza, dentro de una transacción de PostgreSQL, que ninguna venta puede dejar stock negativo y que cada venta queda bloqueada contra la fila del producto (`docs/DATABASE_SCHEMA.md`, invariante 4). Una cola de ventas en IndexedDB que se sincroniza "después" no puede verificar eso en el momento de la venta: dos cajas sin internet podrían vender el mismo último artículo, y el conflicto solo se descubre al reconectar, cuando ya se entregó la mercancía.
2. **El propietario pidió explícitamente priorizar seguridad y auditoría sobre velocidad** (`docs/SECURITY_ROADMAP.md`). Un sistema offline-first duplica la superficie de ataque y de error: hay que validar y auditar dos rutas de escritura (online y offline-diferida) en vez de una, con un mantenedor único trabajando desde el teléfono. Es exactamente el tipo de complejidad que esa directriz pide evitar salvo necesidad real.
3. **El dolor que resuelve no está confirmado.** El blueprint asume cortes eléctricos/de internet frecuentes en el local, pero eso no se ha verificado con el propietario. Antes de construir una arquitectura de sincronización offline completa (cola, resolución de conflictos, reversos), hace falta confirmar que el negocio realmente pierde ventas por cortes, y con qué frecuencia.
4. **Hay una alternativa mucho más barata que cubre el riesgo real de latencia** (no el de corte total): la caché KV de la sección 3 ya elimina el cold-start de Neon para consultas de precio, que es la причина más probable de lentitud en caja, sin tocar el modelo transaccional de ventas.
5. **Costo de mantenimiento a largo plazo.** El propietario dijo que el proyecto puede escalar a varias personas; un modelo offline con cola local y reconciliación manual es más difícil de operar correctamente por un equipo pequeño que un modelo simple "si no hay internet, no se factura hasta que vuelva" — que es lo que ya implica la arquitectura actual sin cambios.

**Si en el futuro se confirma que los cortes de luz/internet son un problema operativo real y frecuente**, la alternativa más segura no es una cola de ventas offline, sino: (a) una app de Progressive Web App con *solo* caché de los recursos estáticos (que la app cargue instantáneo sin red) y de la última tasa/catálogo para *consultar* precios sin vender, o (b) una app de respaldo ultra simple ("modo degradado") que permite anotar ventas en papel/Excel para digitalizar después — deliberadamente fuera del sistema transaccional, para no mezclar datos no verificados con el libro de movimientos oficial. Esa decisión requiere autorización explícita y nueva del propietario; no se implementa por defecto.

## 2. Automatización de la tasa BCV con Cron Trigger (adoptado, sección 2 del blueprint)

La tabla `exchange_rates` ya existe y ya sigue el patrón correcto (histórico por fecha, una fila por `(source, effective_date)`, estado `valid`/`stale`). Lo que falta, y que el blueprint sí aporta, es el mecanismo de automatización:

- **Cloudflare Worker Cron Trigger**, declarado en `apps/api/wrangler.toml` bajo `[triggers] crons`, ejecutándose de lunes a viernes a primera hora (zona horaria de Venezuela, UTC-4 — convertir correctamente al definir el cron en UTC).
- Lógica del handler `scheduled()`:
  1. Consultar una fuente del BCV confiable (a decidir y documentar aquí cuando se implemente: no hay todavía una API oficial gratuita confirmada; requiere investigación previa, no asumir una URL).
  2. Insertar una fila nueva en `exchange_rates` con `source`, `effective_date`, `rate`, `validation_status = 'valid'`.
  3. **Fallback obligatorio**: si la fuente no responde o no trae dato nuevo (fin de semana, feriado, fuente caída), el job NO debe escribir una fila vacía ni reintentar en bucle; debe salir sin cambiar nada, dejando la última fila válida como la vigente. La app ya está diseñada para seguir usando la última tasa válida y advertir que está desactualizada (`docs/ARCHITECTURE_AND_ZERO_COST.md`).
  4. Tras escribir en Postgres, actualizar también la clave `bcv_rate` en Cloudflare KV (ver sección siguiente) para que la lectura rápida en caja no dependa de Neon.
- **No implementado todavía.** Antes de escribir el código: confirmar una fuente de datos BCV gratuita y estable (investigación previa necesaria), y decidir si el fetch se hace en el propio Worker o requiere un paso de scraping — un scraping fragil que rompe silenciosamente es peor que no tener automatización; el fallback del punto 3 es lo que evita que eso se vuelva un incidente de precios incorrectos.

## 3. Caché de lectura con Cloudflare KV (adoptado, con límites verificados, sección 3 del blueprint)

Confirmado en la documentación oficial de Cloudflare (2026-10-26) para el plan gratuito de Workers KV:

- Lecturas: 100 000/día.
- Escrituras a claves distintas: 1000/día (y máximo 1 escritura/segundo a la *misma* clave).
- Almacenamiento: 1 GB por cuenta y por namespace.
- Tamaño de valor: hasta 25 MiB; tamaño de clave: 512 bytes.

Fuente: https://developers.cloudflare.com/kv/platform/limits — **volver a verificar en la consola antes de depender de estos números**, como exige `docs/ARCHITECTURE_AND_ZERO_COST.md` para cualquier límite de proveedor.

Implicación de diseño importante que el blueprint no menciona: **1000 escrituras/día es poco** si se sincroniza KV en cada creación/edición de producto (`Hook` por cada cambio, como sugiere el blueprint). Para un negocio pequeño editando catálogo manualmente, probablemente nunca se acerque a ese límite — pero si en el futuro se agrega importación masiva de productos (cientos de filas de una vez), escribir una clave KV por producto en el mismo evento podría agotar el presupuesto diario y dejar de actualizarse en silencio. Mitigación que se adopta: el hook de sincronización escribe directo por producto en el flujo normal (alta/edición individual), pero cualquier operación de importación masiva debe agrupar los productos en un único valor KV (o un número pequeño de "páginas"), no una clave por producto.

- **Tasa BCV**: una sola clave `bcv_rate`, escrita por el Cron Trigger de la sección 2 (como máximo un par de veces al día, muy por debajo del límite).
- **Catálogo rápido**: `id`, SKU/código de barras, nombre, `price_usd` por producto, sincronizado al crear/editar un producto individualmente. Neon sigue siendo la fuente de verdad; KV es una copia de lectura desechable que se puede reconstruir en cualquier momento desde Postgres.
- **Lectura en caja**: el Worker resuelve el código de barras leyendo KV primero (`<50ms` esperado); solo toca Neon para registrar la venta (escritura), nunca para leer precios repetidamente. Esto protege directamente las 100 horas de cómputo mensuales gratis de Neon, que es justo el riesgo que el propio `docs/ARCHITECTURE_AND_ZERO_COST.md` ya identificaba sin tener todavía una solución concreta.
- **No implementado todavía.** Requiere crear el namespace KV, declarar el binding en `wrangler.toml`, y construir el endpoint de búsqueda — trabajo de negocio (catálogo/caja), por lo tanto sigue detrás de cerrar el Nivel 1 de `docs/SECURITY_ROADMAP.md`, salvo autorización explícita del propietario para avanzar en paralelo.

## 4. Lo que el blueprint propuso y ya estaba resuelto (secciones 1 y 5)

- **Precio base en USD + `NUMERIC`**: ya es exactamente así en `products.price_usd`, `products.cost_usd` (`numeric(14,4)`), desde antes de este blueprint.
- **Tabla de historial de precios**: el proyecto ya tiene algo más completo que lo propuesto — `inventory_movements` (libro de movimientos con motivo/usuario/referencia) y `audit_logs` (trazabilidad genérica de acciones), en vez de una tabla aislada `historial_precios`. No se duplica esa tabla; el patrón ya cubre el mismo objetivo con mejor trazabilidad general.
- **Índices en columnas de búsqueda**: ya existen (`products_org_name_lower_idx`, `UNIQUE (organization_id, barcode)`, `UNIQUE (organization_id, sku)`, etc., en `0001_initial.sql`) y van más allá de lo propuesto porque ya incorporan el aislamiento multiempresa (`organization_id`) que el blueprint, al no conocer el proyecto, no podía anticipar.

## 5. Lo que el blueprint propuso y ya tenía un diseño más riguroso (sección 6, respaldos)

`docs/BACKUP_AND_RECOVERY.md` y `docs/SECURITY_ROADMAP.md` §2 ya cubrían, con más detalle que el blueprint: cifrado antes de subir, checksum, prueba de restauración periódica cada 15 días, política de retención, y una lista explícita de qué NO hacer (no usar artifacts de GitHub Actions como backup, no guardar dumps en el repo). El destino propuesto por el blueprint (Cloudflare R2) coincide con el ya elegido. No se cambia el diseño; se procede a implementarlo (ver checkpoint de esta sesión).

## 6. Gobernanza

Esta decisión sigue la misma regla que `docs/SECURITY_ROADMAP.md`: ningún chat futuro debe revertir el rechazo de offline-first, ni adoptar partes del blueprint marcadas aquí como ya resueltas de otra forma, sin una instrucción explícita y nueva del propietario.
