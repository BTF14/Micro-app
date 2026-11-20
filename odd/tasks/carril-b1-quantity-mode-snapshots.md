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

## Closure and handoff

- Final commit SHA: pendiente
- PR: pendiente
- Checks and exact outcomes: pendientes; no hay checkout local ni PostgreSQL local en este entorno.
- Acceptance criteria met / unmet: pendiente
- Limitations not verified: tests locales, PostgreSQL 18 efímero y builds/typecheck no disponibles desde este entorno; deben ejecutarse en CI sobre el SHA final.
- Residual risks: migración y rutas comerciales críticas requieren revisión independiente y CI completo.
- Next step: completar implementación, ejecutar los workflows reales de GitHub y mantener Draft.
