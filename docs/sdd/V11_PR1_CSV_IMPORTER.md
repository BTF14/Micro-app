# SDD — PR 1: Importador CSV de catálogo (v1.1)

- **Estado:** diseño aprobado para preparación; no implementado.
- **Fecha:** 2026-11-15.
- **ADR:** `docs/decisions/ADR-20261114-v11-product-scope-and-roadmap.md`.
- **Freeze:** no implementar ni abrir PR de código comercial hasta verificar persistencia y estabilidad real del Cron BCV el lunes 2026-11-16.

## 1. Objetivo y límites

Importar altas y actualizaciones del catálogo de productos desde CSV de forma predecible, auditable, idempotente y aislada por organización/sucursal.

**Alcance estricto: catálogo únicamente.** El CSV no crea stock inicial, no modifica `stock_quantity`, no escribe `inventory_balances`, no genera `inventory_movements` y no ajusta inventario. Los campos de cantidad de existencia, stock inicial, almacén o movimientos deben rechazarse como campos no soportados, no ignorarse silenciosamente. La inicialización y los cambios de existencias continúan por conteos/recepciones autorizados y trazables.

## 2. Formato y límites de entrada

- UTF-8, con o sin BOM UTF-8 inicial. Rechazar codificaciones inválidas; no reinterpretar bytes silenciosamente.
- Separadores soportados explícitamente: coma `,` y punto y coma `;`. Detectar dialecto por encabezados y consistencia; ofrecer selección explícita cuando haya ambigüedad.
- Soportar comillas dobles CSV, comillas escapadas (`""`), delimitadores y saltos de línea dentro de campos entrecomillados, CRLF/LF y espacios según política documentada.
- Normalizar encabezados (BOM, espacios exteriores y casing) a conjunto canónico; detectar encabezados duplicados/colisiones después de normalizar y rechazarlos.
- Límite inicial: **1.000 filas de datos por archivo**, procesadas en lotes lógicos de **100 filas**.
- Límite propio del cuerpo/payload: aproximadamente **256 KiB** máximo inicial. Aplicar antes de parsear; no reutilizar sin análisis el límite genérico de otro endpoint.
- Importes decimales se parsean exactamente según dialecto (punto decimal con coma separadora; coma decimal con punto y coma separador), nunca mediante IEEE-754 `Number` para cálculos monetarios.

## 3. Seguridad CSV y normalización

- Tratar nombres, SKU, descripciones, códigos y cualquier texto importado como no confiable.
- Antes de previsualizar o reexportar texto no confiable, neutralizar CSV Formula Injection ante prefijos `=`, `+`, `-`, `@`, tabulación y CR (incluidas variantes precedidas por whitespace según política explícita).
- Separar neutralización de fórmulas del quoting/escaping CSV: aplicar ambos controles. No confiar solo en envolver el valor en comillas.
- **No alterar importes numéricos validados** por la neutralización de texto. Parsear/validar en tipo decimal y serializar de forma canónica; campos numéricos inválidos generan error.
- No interpretar fórmulas, macros, HTML ni expresiones del archivo.

## 4. Flujo obligatorio en dos pasos

### Paso A — dry-run / validación server-side

1. Cliente envía contenido acotado y el servidor valida autenticación, organización, sucursal/alcance, permiso de catálogo, tamaño, encoding, dialecto, encabezados, tipos, límites y colisiones.
2. Devuelve preview normalizado con altas, actualizaciones, filas sin cambios, errores por fila/campo y colisiones (SKU/código duplicado dentro del archivo o contra catálogo).
3. **No muta la base de datos:** sin inserts/updates, sin reservar claves ni crear batches persistentes. Puede devolver hash canónico y token efímero con caducidad.
4. UI exige confirmación explícita del usuario autorizado; errores y conflictos deben ser visibles antes de aplicar.

### Paso B — apply transaccional

1. Cliente envía lote validado, `idempotency_key` estable y alcance exacto.
2. Servidor vuelve a autenticar y autorizar; recalcula hash canónico sobre alcance, esquema, dialecto, contenido normalizado y opciones.
3. Revalida condiciones que pudieron cambiar desde dry-run.
4. Aplica altas/actualizaciones set-based en servidor, en lotes lógicos de 100 filas, dentro de **una transacción atómica**. Error fatal/conflicto/fallo de auditoría revierte todo; no hay importación parcial confirmada.
5. Registra resultado persistente en `catalog_import_batches` y auditoría append-only en la misma transacción.

## 5. Idempotencia persistente — `catalog_import_batches`

Contrato mínimo de tabla (diseño, no migración):

- Identidad/alcance: `organization_id`, `branch_id` o descriptor explícito del alcance de catálogo.
- Idempotencia: `idempotency_key`, `request_hash`, estado terminal, resumen de resultado, actor, timestamps server-side y referencia de auditoría.
- Restricción única sobre `(organization_id, branch_id/alcance, idempotency_key)`.
- Misma clave + mismo hash: devolver resultado previamente persistido sin repetir mutaciones.
- Misma clave + hash distinto: responder **HTTP 409 Conflict**, sin modificar batch ni catálogo.
- Dos apply simultáneos con la misma clave se serializan mediante restricción/lock transaccional; solo una ejecución muta.
- El hash se calcula en servidor; nunca se acepta como autoridad un hash del cliente.

## 6. Permisos y aislamiento multi-tenant

- Autorización server-side: `owner` o permiso explícito de catálogo definido en la matriz; denegar por defecto. La UI no es frontera de seguridad.
- Verificar `organization_id`, sucursal y membresía activa desde contexto autenticado; no aceptar IDs arbitrarios como prueba de pertenencia.
- Lecturas de colisiones, writes y auditoría siempre tenant-scoped; si catálogo es compartido a nivel organización, explicitarlo como scope.
- Impedir que el importador altere inventario, precios históricos, ventas, pagos, tasas BCV, roles o permisos.
- Auditoría server-side del actor, alcance, resumen, hash y resultado, sin guardar CSV crudo innecesariamente ni filtrar datos sensibles en logs.

## 7. Criterios de aceptación y pruebas

- Unitarias: BOM, UTF-8 inválido, separadores coma/punto y coma, detección ambigua, comillas escapadas, saltos de línea entrecomillados, CRLF/LF, encabezados duplicados, decimales por dialecto, filas vacías, 1.000/1.001 filas, payload bajo/sobre 256 KiB.
- Seguridad: neutralización de `=`, `+`, `-`, `@`, tab y CR en texto; valores monetarios válidos conservan importe exacto; quoting CSV independiente; sin evaluación de fórmulas.
- Validación: preview no muta DB; errores y colisiones deterministas; revalidación detecta cambios desde dry-run.
- PostgreSQL 18 efímero: altas/actualizaciones set-based, transacción atómica, rollback completo ante fallo intermedio/auditoría, unicidad y carreras concurrentes same-key.
- Idempotencia: misma clave/hash devuelve resultado idéntico; misma clave/hash distinto responde 409; distinto tenant/sucursal no comparte clave ni resultado.
- Aislamiento: pruebas cross-tenant, cross-branch y rol no autorizado; IDs manipulados no permiten leer colisiones ni escribir fuera de ámbito.
- Alcance: ningún camino escribe stock, balances o movimientos; columna de stock se rechaza explícitamente.
- E2E: preview, confirmación, resultado y reintento de red sin duplicar mutaciones.

## 8. Exclusiones y gates

- No XLSX, macros, importación de stock, stock inicial, inventario, recepciones, proveedores, imágenes ni importación masiva de precios BCV.
- No implementar antes de que el gate BCV real (persistencia y estabilidad) levante el freeze v1.1.
- Antes de abrir PR: pruebas unitarias, PostgreSQL 18 efímero, seguridad, auditoría, exact-HEAD CI y revisión del diff.

**Estado:** SDD de diseño. No contiene ni autoriza código, migraciones, endpoints o cambios de producción.
