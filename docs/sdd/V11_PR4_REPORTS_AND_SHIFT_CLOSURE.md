# SDD — V11 PR 4A: cierres, reportes y exportación CSV (backend)

- Estado: propuesta de implementación para Micro-PR 4A; la PR debe permanecer Draft.
- Base: `main` = `10d24105c49f7d5c240ef298c353b782f0cca255` (post-PR #401).
- Alcance: backend API, RBAC, helpers puros, pruebas y continuidad documental. La UI/E2E visual queda en Micro-PR 4B.
- ADR vinculante: `docs/decisions/ADR-20261114-v11-product-scope-and-roadmap.md`, sección PR 4.

## 1. Decisiones de dominio

1. `register_shifts` representa una sesión individual: `opened_at` → `closed_at`. No existe corte ni cierre automático a medianoche.
2. PR 4 expone resumen de turno cerrado, reportes diarios, semanales, mensuales y rangos personalizados, además de exportación CSV.
3. Los cortes calendario se expresan como intervalos semiabiertos `[start, end)` en `America/Caracas` (VET UTC-4): día 00:00 local a día siguiente 00:00; semana lunes 00:00 a lunes siguiente; mes día 1 00:00 a día 1 del mes siguiente.
4. Los límites se convierten en instantes ISO antes de consultar PostgreSQL. Los reportes de ventas usan exclusivamente `completed_at >= start AND completed_at < end`; no usar `created_at` para seleccionar ventas completadas.
5. El parámetro futuro por organización `business_day_cutoff_hour` queda previsto en diseño, pero no se agrega a runtime ni al esquema durante el freeze.
6. Los montos se conservan como strings `NUMERIC::text`; las sumas y diferencias monetarias usan exclusivamente `@micro-app/money` y `bigint`. Una diferencia de caja negativa es faltante y una positiva es sobrante.
7. Las ventas `void` y `refunded` se cuentan separadamente; sus importes no se suman ni se construye un neto fiscal.
8. El historial FX procede de snapshots persistidos en la venta y pagos; nunca se recalcula con una tasa actual.
9. La valoración de costo es un permiso independiente `reports.inventory.valuation`, exclusivo de Owner. No se hereda de `catalog.read_costs`. La protección debe ocurrir en SQL: roles no Owner no consultan `products.cost_usd`.
10. No seleccionar ni exponer `sale_items.unit_cost_usd` ni `cost_usd` en reportes de ventas.

## 2. RBAC y aislamiento

| Recurso | Owner | Admin | Inventory | Cashier |
|---|---|---|---|---|
| Lista de turnos | Organización | Organización | 403 | Solo propios |
| Resumen de turno | Organización + sucursal válida | Organización + sucursal válida | 403 | Solo propio; turno ajeno 403 |
| Reporte ventas | Organización o sucursal | Organización o sucursal | 403 | Solo sus turnos |
| CSV ventas | Igual + `exports.allowed_data` | Igual + `exports.allowed_data` | 403 | Solo sus turnos + export |
| Reporte inventario | Organización/sucursal + valoración | Organización/sucursal sin costo | Sucursales con membresía activa, sin costo | 403 |
| CSV inventario | Igual + export; costo visible | Igual; sin costo | Igual; sin costo | 403 |

- Toda sesión se resuelve desde cookie y contexto de tenant servidor.
- `branch_id` se valida con `authorizeBranchOperation(..., false)`; no se confía en el identificador enviado por cliente.
- Inventory sin `branch_id` queda limitado en SQL a `branch_memberships.is_active = true`.
- Cashier queda limitado en SQL por `register_shifts.cashier_user_id = context.userId`.
- Los errores de esquema/grants SQL `42P01`, `42883`, `42703`, `42501` responden 503 (fail closed).
- Las respuestas son privadas y `no-store`.

## 3. Contratos HTTP

### 3.1 `GET /api/orgs/:organizationId/register-shifts`

Filtros: `branch_id`, `status=open|closed`, `limit` (1–100; default 50). Owner/Admin consultan la organización completa; si indican sucursal se valida con autorización de sucursal. Cashier solo ve turnos propios y con membresía activa. Inventory recibe 403.

### 3.2 `GET /api/orgs/:organizationId/branches/:branchId/register-shifts/:shiftId/closure-summary`

Devuelve datos de sesión, caja, sucursal y cajero; conteo de ventas completadas; conteo aparte de `void/refunded`; totales USD/VES; snapshots de liquidación y origen FX; pagos agrupados por método y moneda con monto y equivalente USD histórico; efectivo esperado y diferencia exacta por moneda. En turnos abiertos la diferencia es `null`. Nunca incluye costes. Incluye la leyenda FISC-01.

### 3.3 Reporte de ventas

- `GET /api/orgs/:organizationId/reports/sales`
- `GET /api/orgs/:organizationId/reports/sales.csv`
- Query: `period=daily|weekly|monthly|custom` (default daily), `date=YYYY-MM-DD`, `from`, `to`, `branch_id`.
- Solo `status='completed'` suma montos y usa `completed_at`. `void/refunded` se reporta como conteo separado usando su fecha de registro para la ventana de exclusión.
- Se incluyen `total_usd`, `total_ves_snapshot`, `exchange_rate_snapshot`, `fx_source`, sucursal, cajero y desglose de pagos. No se consulta costo histórico.

### 3.4 Reporte de inventario

- `GET /api/orgs/:organizationId/reports/inventory`
- `GET /api/orgs/:organizationId/reports/inventory.csv`
- Owner: SQL puede proyectar `p.cost_usd` y valoración de costo.
- Admin/Inventory: SQL no selecciona `p.cost_usd` ni calcula valoración de costo; respuesta JSON y CSV carecen de esas columnas. Se mantiene cantidad, reservado, disponible, precio y valoración retail.
- Inventory queda limitado a sucursales asignadas activas.

## 4. Rango Caracas y CSV

- `buildCaracasReportRange` es pura y valida calendario, semana lunes, mes, límites semiabiertos y rango custom máximo 366 días con `start < end`.
- Los datetime locales custom sin offset se interpretan en UTC-4; ISO con zona/Z se respeta como instante absoluto.
- `formatSafeCsvCell` aplica neutralización de fórmula a texto no confiable y quoting RFC-4180 como pasos separados.
- `formatCsvNumericCell` valida decimal plano y preserva negativos canónicos sin apóstrofo.
- CSV: BOM UTF-8, `text/csv; charset=utf-8`, attachment, `Cache-Control: no-store`.

## 5. No-go / exclusiones

- Cero migraciones, grants o cambios en `apps/api/migrations/**`; se consume el esquema existente.
- No cambios en `apps/web/**`, `packages/**`, workflows, dependencias ni `package.json`.
- No activar gates: AC-6 OPEN; `FX_CONTINGENCY_ENABLED=false`; `BCV_SYNC_ENABLED=false`; Issue #53 OPEN/P0; freeze v1.1; `PRODUCTION: NOT READY`; presupuesto USD 0.
- No acceso a Neon main, secretos, producción, despliegue ni datos reales.
- La leyenda FISC-01 es comprobante de control interno, no factura fiscal ni libro certificado.

## 6. Micro-PR 4B pendiente

- UI `ReportsPanel` para filtros, resumen y descarga de reportes.
- Resumen de cierre dentro de `RegisterShiftsPanel`.
- Leyenda exacta `COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL` en `SalesPanel`.
- E2E Playwright con datos sintéticos/PostgreSQL 18: RBAC, períodos Caracas, descarga CSV/BOM, neutralización de fórmulas, diferencias negativas/positivas y responsive.
- Mantener fuera de 4A toda modificación de frontend.

## 7. Evidencia y límites

La base se verificó en GitHub y no había PR abiertas conflictivas al iniciar. La implementación se realiza mediante integración GitHub, sin checkout local: no declarar ejecución local de verify/Vitest/PG18 ni del validador documental. La aceptación requiere todos los check-runs y workflows reales sobre el SHA final exacto y revisión del diff de los 11 archivos permitidos.
