# SDD — Paso 7 — PR 2: Importador CSV de catálogo (v1.1)

> Este documento especifica el **Paso 7 — PR 2: Importador CSV de catálogo (`v1.1`)**. Históricamente se tituló «PR 1» antes de priorizar la Contingencia BCV; se conserva el nombre de archivo por continuidad documental.

- **Estado:** diseño reconciliado; Micro-PR 7A implementa únicamente el contrato documental y el parser puro.
- **Fecha de reconciliación:** 2026-11-20.
- **Base de referencia:** `main` en `019997f797c0e7357f05a11d3d8043899f8d5244`, posterior a la migración 0028 y al Paso 6.
- **ADR:** `docs/decisions/ADR-20261114-v11-product-scope-and-roadmap.md`.
- **Gates comerciales globales:** `PRODUCTION: NOT READY`; `AC-6 OPEN`; `FX_CONTINGENCY_ENABLED=false`; Issue #53 `OPEN/P0`; `freeze v1.1` se mantiene respecto a operación comercial real. Este trabajo preparatorio no levanta ni modifica ninguno de esos gates.

## 1. Objetivo y límites

Importar altas y actualizaciones del catálogo de productos desde CSV de forma predecible, auditable, idempotente y aislada por organización.

**Alcance estricto: catálogo únicamente.** En el esquema vigente, `products` es catálogo **a nivel de organización**, identificado por `organization_id`; no es un catálogo por sucursal. La autorización futura debe exigir `catalog.product.manage` en la organización autenticada. La idempotencia persistente de `catalog_import_batches` será única por `(organization_id, idempotency_key)`, sin incluir `branch_id`. La tabla y su restricción se implementarán exclusivamente en Micro-PR 7B.

El CSV no crea stock inicial, no modifica `stock_quantity`, no escribe `inventory_balances`, no genera `inventory_movements` ni ajusta inventario. Los campos de existencia, stock inicial, almacén o movimientos se rechazan explícitamente; nunca se ignoran silenciosamente. La inicialización y los cambios de existencias continúan por conteos/recepciones autorizados y trazables.

## 2. Formato, columnas y límites de entrada

### 2.1 Transporte y parser

- Aceptar `Uint8Array` o `string`; para bytes, decodificar con UTF-8 estricto (`TextDecoder("utf-8", { fatal: true })`). Aceptar BOM UTF-8 inicial y eliminarlo; rechazar secuencias inválidas y cualquier NUL.
- Límite estricto de **262144 bytes (256 KiB)**, medido antes del parseo; rechazar `>` 262144. Límite de **1000 filas de datos**; rechazar `>` 1000 e ignorar registros totalmente vacíos.
- Separador explícito `","`, `";"` o `"auto"`. Coma usa decimal `.`; punto y coma usa decimal `,`. En `auto`, si el encabezado contiene ambos separadores o no permite una elección unívoca, fallar con error que solicite selección manual.
- Parser RFC 4180: comillas dobles, escape `""`, delimitadores y CRLF/LF dentro de campos entrecomillados; rechazar comillas sin cerrar y caracteres inesperados después de una comilla de cierre.
- Encabezados normalizados con `trim().toLowerCase()`; rechazar vacíos, duplicados normalizados, desconocidos y columnas prohibidas.

### 2.2 Columnas de catálogo soportadas

`sku` es siempre obligatoria (1..80). En una **alta** de SKU nuevo también son obligatorios `name` (1..240) y `price_usd` (`NUMERIC(14,4) >= 0`). En una **actualización** de SKU existente solo se actualizan campos presentes en el archivo; si una columna soportada se omite, se conserva el valor actual. Si se incluye una columna con valor explícito, ese valor se aplica. El parser no conoce el catálogo existente: la decisión alta/actualización y la exigencia condicional de `name`/`price_usd` pertenecen al preview/apply server-side de 7C.

| Columna | Tipo y contrato | Default al crear |
|---|---|---|
| `sku` | texto 1..80, obligatorio siempre | — |
| `name` | texto 1..240; obligatorio al crear | — |
| `price_usd` | `NUMERIC(14,4) >= 0`; obligatorio al crear | — |
| `cost_usd` | `NUMERIC(14,4) >= 0` | `0.0` |
| `unit` | texto 1..40 | `unidad` |
| `quantity_mode` | `integer` o `fractional` | `integer` |
| `minimum_stock` | `NUMERIC(14,3) >= 0`; entero si modo `integer` | `0.0` |
| `barcode` | texto 1..128 o vacío/`null` | `null` |
| `description` | texto 0..2000 o vacío/`null` | `null` |
| `is_active` | booleano `true`/`false` | `true` |

Las longitudes y validaciones textuales replican `boundedText`/el contrato de `parseProductPatch` en `apps/api/src/catalog-write.ts`: trim exterior y rechazo de controles C0/DEL. Decimales replican `parseNumeric` para los límites PostgreSQL y se mantienen como strings/BigInt, nunca IEEE-754 `Number`.

### 2.3 Columnas prohibidas

Rechazo explícito fail-closed, incluidas variantes acentuadas/sin acento: `stock`, `stock_quantity`, `on_hand`, `on_hand_quantity`, `reserved_quantity`, `existencia`, `existencias`, `inventario`, `warehouse`, `warehouse_id`, `almacen`, `almacén`, `movement`, `quantity_delta`. La normalización Unicode debe impedir que la variante acentuada eluda la lista.

### 2.4 Regla de modo de cantidad — migración 0028

Un cambio `fractional -> integer` de un producto existente no puede aplicarse si el `minimum_stock` resultante, algún saldo en `inventory_balances` (`on_hand_quantity` o `reserved_quantity`) o algún conteo `draft` en `inventory_count_lines` tiene decimales. La API debe rechazarlo en servidor (conflicto); la defensa de base de datos de 0028 permanece autoritativa. El parser valida que `minimum_stock` sea entero cuando la fila declara `quantity_mode=integer`; no puede comprobar balances ni conteos.

## 3. Seguridad CSV, normalización y hash

- Tratar SKU, nombres, códigos, descripciones y cualquier texto importado como no confiable.
- Exportar/previsualizar texto neutralizando CSV Formula Injection ante prefijos `=`, `+`, `-`, `@`, tabulación y CR, incluso precedidos por espacios en blanco. Neutralización y quoting/escaping CSV son controles separados.
- Los importes/cantidades ya validados en su tipo decimal no se alteran por la neutralización. Serializar decimales canónicos usando `parseNumeric`/`formatNumeric` de `@micro-app/money`.
- No interpretar fórmulas, macros, HTML ni expresiones del archivo.
- `computeCanonicalCsvHash` usa `crypto.subtle.digest("SHA-256", ...)` sobre alcance organizacional + opciones + filas canónicas. El servidor de 7C recalcula el hash; nunca confía en uno enviado por cliente.

## 4. Flujo obligatorio en dos pasos

### Paso A — preview / validación server-side

1. Autenticar y resolver la organización desde la sesión; exigir `catalog.product.manage` en esa organización. No aceptar IDs arbitrarios como prueba de pertenencia.
2. Validar tamaño, UTF-8, delimitador, encabezados, tipos, límites, SKU requerido, altas/actualizaciones y colisiones internas y contra el catálogo (tenant-scoped).
3. Devolver preview normalizado con altas, actualizaciones, sin cambios, errores por fila/campo y colisiones.
4. No mutar DB, reservar claves ni crear batches persistentes. Puede devolver hash canónico y token efímero con caducidad.
5. La UI exige confirmación explícita del usuario autorizado; errores y conflictos son visibles antes de aplicar.

### Paso B — apply transaccional

1. Enviar lote validado, `idempotency_key` estable y alcance organizacional exacto.
2. Reautenticar/autorizar; recalcular hash canónico sobre organización, esquema, dialecto, contenido normalizado y opciones.
3. Revalidar condiciones que pudieron cambiar desde preview, incluidas restricciones de 0028.
4. Aplicar altas/actualizaciones en lotes lógicos de 100 filas dentro de una transacción atómica. Error fatal, conflicto o fallo de auditoría revierte todo; no hay importación parcial confirmada.
5. Registrar resultado en `catalog_import_batches` y auditoría append-only en la misma transacción.

## 5. Idempotencia persistente — `catalog_import_batches` (Micro-PR 7B)

Contrato mínimo, aún diseño: `organization_id`, `idempotency_key`, `request_hash`, estado terminal, resumen, actor, timestamps server-side y referencia de auditoría. Restricción única **`(organization_id, idempotency_key)`**. Misma clave/hash devuelve el resultado persistido sin repetir mutaciones; misma clave/hash distinto responde HTTP 409 sin modificar batch ni catálogo. Apply simultáneos con la misma clave se serializan con restricción/lock transaccional. La tabla no se crea en 7A.

## 6. Permisos y aislamiento multi-tenant

- Autorización server-side con permiso explícito `catalog.product.manage` sobre la organización autenticada; denegar por defecto. La UI no es frontera de seguridad.
- `products` y `catalog_import_batches` se aíslan por `organization_id`; las lecturas de colisiones, writes y auditoría siempre tenant-scoped.
- No aceptar `branch_id` como alcance del catálogo ni como parte de la clave idempotente.
- Impedir alteración de inventario, precios históricos, ventas, pagos, tasas BCV, roles o permisos.
- Auditoría del actor, organización, resumen, hash y resultado, sin guardar CSV crudo innecesariamente ni filtrar datos sensibles en logs.

## 7. Entrega por Micro-PRs

- **7A — SDD + parser puro:** reconciliar este contrato, crear ODD task, implementar parser/normalización/validación/Formula Injection/hash y suite Vitest. Sin DB, SQL, rutas ni UI.
- **7B — migración 0029:** tabla idempotente `catalog_import_batches` a nivel organización, índices, grants/RLS/seguridad y assertions. No implementar endpoints.
- **7C — API preview/apply:** endpoints, autorización organizacional, preview no mutante, apply atómico/idempotente, auditoría y pruebas PostgreSQL 18 efímeras/concurrencia.
- **7D — UI + E2E + cierre:** flujo de selección/preview/confirmación/resultado, accesibilidad, Playwright E2E, documentación final y revisión de gates.

## 8. Criterios de aceptación y exclusiones

- Unitarias: BOM, UTF-8 inválido, NUL, 256 KiB exactos/sobre límite, 1000/1001 filas, coma/punto y coma/auto ambiguo, RFC 4180, encabezados normalizados, desconocidos/prohibidos, decimales por dialecto/escala/negativos/exponentes, quantity_mode, minimum_stock entero, SKU/barcode duplicados, Formula Injection y preservación decimal.
- PostgreSQL 18 efímero en 7C: altas/actualizaciones, atomicidad/rollback, auditoría, unicidad y carreras concurrentes same-key.
- Idempotencia: misma clave/hash resultado idéntico; misma clave/hash distinto 409; tenants distintos aislados.
- Alcance: ninguna escritura de stock/balances/movimientos; columnas prohibidas rechazadas explícitamente.
- E2E en 7D: preview, confirmación, resultado y reintento de red sin duplicar mutaciones.
- Exclusiones: XLSX, macros, stock inicial, inventario, recepciones, proveedores, imágenes, importación BCV, SQL/migraciones/endpoints/UI en 7A.
- Los gates `PRODUCTION: NOT READY`, `AC-6 OPEN`, `FX_CONTINGENCY_ENABLED=false`, Issue #53 `OPEN/P0` y `freeze v1.1` permanecen intactos. Ninguna Micro-PR del importador autoriza merge, deploy ni cambio de producción por sí misma.

**Estado:** SDD reconciliado. La implementación se divide estrictamente en 7A–7D; 7A no crea migraciones, endpoints ni cambios operativos.
