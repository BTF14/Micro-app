# ODD task: Carril B1 — quantity_mode y snapshots de venta

- Status: in progress
- Issue / PR: PR #390 OPEN / Draft — https://github.com/BTF14/Micro-app/pull/390
- Owner / reviewer: Tech Lead / revisión independiente backend-data, security e inventory-accounting
- Started: 2026-11-20
- Risk: critical

## Objective and authorization

- Desired outcome: introducir el modo explícito de cantidad `integer | fractional`, preservar unidad/modo históricos en `sale_items`, y mantener coherencia entre catálogo, checkout, conteos, recepciones, Kardex y proyecciones.
- Authorization boundary: rama `feat/carril-b1-quantity-mode-snapshots-20261120` desde main verificado `5b9bbec69b7fcd006dcbfa9dd4a9a7bd1ac80061`; PR OPEN / Draft; sin merge, auto-merge, deploy ni escrituras en Neon main/producción.
- Relevant original request: misión Paso 5 / Carril B1 del propietario fechada 2026-11-20.

## Scope and exclusions

Included:
- Migración aditiva 0028 y assertions; no editar 0001–0027.
- API de catálogo, inventario, checkout, conteos y recepciones.
- UX de modo de cantidad en formulario, inventario, lookup y POS.
- Pruebas unitarias, integración PostgreSQL 18, reconciliación y mutantes.
- Actualización de inventory-accounting-review para auditar 0028+ y snapshots.
- Reconciliación de CURRENT_STATE, HANDOFF_NEXT_CHAT, STATE_JOURNAL y PROJECT_PLAN.

Excluded:
- PR #385 y PR #386.
- Neon main, producción, datos reales, secretos, Cloudflare settings, deploy y billing.
- Alterar AC-6, FX_CONTINGENCY_ENABLED, Issue #53, freeze v1.1 o BCV_SYNC_ENABLED.
- Lectura o escritura de `products.stock_quantity` como fuente de inventario.
- Merge o auto-merge.

## Acceptance criteria

- [ ] AC-1 — quantity_mode se deriva de forma segura del histórico y valida mínimo de stock entero cuando corresponde.
- [ ] AC-2 — sale_items conserva unit_snapshot y quantity_mode_snapshot inmutables y verificados contra products al insertar.
- [ ] AC-3 — conteos y recepciones rechazan cantidades fraccionarias para productos integer en API y base de datos.
- [ ] AC-4 — checkout rechaza fracciones para integer, persiste snapshots y nunca expone costes a rutas de venta/cajero.
- [ ] AC-5 — cambio fractional → integer devuelve 409 si existen mínimos de stock, saldos o conteos pendientes fraccionarios.
- [ ] AC-6 — frontend comunica el modo, autocompleta unidades métricas sin sobrescribir selección manual y aplica pasos/teclado correctos.
- [ ] AC-7 — pruebas unitarias, integración PostgreSQL 18, reconciliación y mutantes cubren los invariantes; no hay regresión de ventas/pagos/ledger/turnos.
- [ ] AC-8 — validadores y revisiones independientes backend-data-review, security-review e inventory-accounting-review completados con evidencia exact-SHA.
- [ ] AC-9 — documentación de continuidad actualizada; PR permanece OPEN / Draft y sin merge.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Productos históricos con saldos o movimientos fraccionarios | critical | Backfill conservador a fractional (unidades, mínimos, balances, movimientos legacy y ledger); no modificar 0001–0027; assertions de migración |
| Snapshot falso o mutable en SQL directo | critical | Trigger SECURITY DEFINER de INSERT, propietario migrator, search_path pg_catalog, sin EXECUTE público |
| Decimal convertido a Number | high | Mantener strings/BigInt y NUMERIC exacto |
| Conteos/recepciones fuera del checkout | high | Validación API + triggers DB en tablas reales |
| Cambio de modo con saldo fraccionario | critical | Rechazo 409 en API y defensa DB |
| Confusión de nombre de tabla | medium | El esquema real usa inventory_count_lines, no inventory_count_items; proteger la tabla existente |
| Riesgo de producción/gates globales | critical | Solo rama/PR Draft; no Neon main, deploy ni secretos |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Verificar main y PR relacionadas | SHA vivo y límites de alcance | GitHub API | completed |
| Inspeccionar contratos SQL/API/UX y skills | Mapa de impacto real; divergencias de nombres y grants identificadas | Fuentes main | completed |
| Crear migración 0028 + assertions | Schema y defensas aditivas | PR #390; PostgreSQL 18 migration workflow pendiente | implemented / CI pending |
| Implementar API y frontend | Contratos coherentes, GET de recibo con snapshots y sin costes | PR #390; unit/integration/typecheck/build pendientes de CI | implemented / CI pending |
| QA de reconciliación y mutantes | Cada mutante crítico detectado | Python + PostgreSQL 18 | pending |
| Revisiones independientes | Hallazgos y mitigaciones | Pasadas secuenciales pendientes de cierre | pending |
| Actualizar continuidad y abrir PR Draft | Handoff coherente | PR #390 OPEN / Draft; documentos de continuidad pendientes | in progress |

## Technical decisions

- El esquema vivo de 0006 nombra la tabla `inventory_count_lines`; la misión menciona `inventory_count_items`, que no existe en este esquema. La defensa se implementa en `inventory_count_lines`, sin crear una tabla paralela.
- La función RPC de recepción vigente desde 0025 es `public.create_inventory_receipt(...)`; no existe `receive_inventory_batch` en el esquema inspeccionado. La validación DB se aplica en `inventory_receipt_lines`, dentro de la transacción de la RPC.
- El ledger append-only `warehouse_inventory_movements` y `inventory_balances` siguen siendo la fuente de stock. No usar `products.stock_quantity`.
- Las revisiones especialistas no son subagentes persistentes. Si no hay ejecución delegada verificable, registrar revisión secuencial y sus límites.

### Decisiones de migración y concurrencia

- El backfill de `sale_items` debe respetar el lifecycle append-only de 0015 y la reconciliación diferida de 0027: desactivar solo `sale_items_checkout_lifecycle_guard` y `sale_items_completed_reconciliation` dentro de la transacción de 0028, ejecutar el backfill, reactivarlos antes del COMMIT y comprobar `tgenabled='O'` en assertions.
- El trigger de transición a integer revisa saldos fraccionarios y conteos draft; las rutas de escritura bloquean producto con `FOR SHARE` al validar cantidad. El API devuelve 409 también para minimum_stock fraccionario al cambiar de fractional a integer.

## Closure and handoff

- PR #390: MERGED en main; merge commit 495f9fd637507715acea4054c461aa5d08b8f5ee.
- SHA final de PR #390: 371aeff35db965802318228664d2ed767001e048.
- CI exact-SHA de PR #390: 22/22 check-runs y 15/15 workflows completados en success.
- Verificación post-merge en el merge commit 495f9fd637507715acea4054c461aa5d08b8f5ee: 20/20 check-runs y 14/14 workflows en success.
- Base main vigente c2fa2fe453af0c3dbb7dd95e8b79a59eed828234: 15/15 check-runs y 10/10 workflows en success.
- Neon main: el propietario confirmó la migración a 0028; no se accedió ni se modificó Neon durante esta tarea.
- Acceptance criteria: Paso 5 / Carril B1 (0028) CERRADO Y MIGRADO.
- Residual risks: ninguno pendiente dentro del alcance de Paso 5; los gates globales de producción permanecen vigentes.
- Next step único: Paso 6 — Hardening B1 + 0027 (Micro-PR 6A + Micro-PR 6B).
