# Work checkpoint — BTF14/Micro-app — 2026-11-06

## Estado verificado — 2026-11-06

### PR #244 integrada
- PR #244 merged: `158ec68bd55825d6e8d5527d086023a13445a89c`.
- Post-merge commit checks: **10/10 SUCCESS**, incluyendo CI, PostgreSQL, migration runner, Playwright, Semgrep, Trivy, secret scan, Cloudflare Pages y Workers Builds.
- Cloudflare Pages y Workers Builds reportaron SUCCESS en el commit de merge. Un GET no autenticado a la ruta de catálogo de producción respondió 401 (esperado); no se realizó smoke autenticado de producción.
- PR #244 integró catálogo API/UI, BigInt exact decimals, inventory count lifecycle/idempotency, tenant/branch/warehouse locks, runtime-role tests, streaming body limits y preview API isolation.
- No hubo escrituras en Neon producción, baseline/adoption, cambios de roles/grants, secretos, DNS ni billing.

### Frente activo — inventario lectura/kardex
- Rama: `feat/inventory-read-ledger-20261106`, basada en main después de #244.
- Añade GET paginado de balances por almacén y GET paginado del kardex append-only, con tenant/branch/warehouse scope, locks de autorización, coste visible solo a owner/admin/inventory y oculto a cashier.
- Tests PostgreSQL preparan fixtures como admin y llaman API con el rol configurado; cubren saldos/reservas/disponible, coste por rol, paginación, kardex, acceso cross-tenant y almacén inactivo.
- Esta rama aún no tiene PR ni workflows ejecutados sobre su HEAD final. Mantenerla en Draft al abrir PR y validar exact-SHA.

### Pendientes de arquitectura
- Tras los endpoints de lectura, falta UI de inventario, detalle de conteos y movimientos/recepciones.
- Transferencias siguen siendo el modelo aprobado de dos etapas: despacho en origen y recepción en destino, con mercancía en tránsito y diferencias enviadas/recibidas. El esquema actual no contiene una entidad de transferencia; no simularla con movimientos sueltos. Diseñar migración/estado/idempotencia/auditoría antes de implementar.
- PR #227: corregir orden de fechas efectivas BCV (tasa futura almacenada no debe bloquear tasa de hoy), probar mañana→hoy y límites de cuerpo HTTP antes de habilitar BCV.
- Checkout de ventas sigue pendiente, después de inventario y BCV.
- Producción sigue **NOT READY**: sin baseline/adoption Neon, smoke autenticado productivo, cierre P0/P1 issue #53 ni validación integral E2E de negocio.



## Próximos pasos
1. Abrir PR Draft para `feat/inventory-read-ledger-20261106`, ejecutar 10 workflows y corregir fallos en el SHA exacto.
2. Revisar runtime-role y cost visibility; no ampliar permisos SQL para habilitar lectura.
3. Después de API validada, añadir UI de inventario y detalle de conteos.
4. Diseñar transferencias two-stage con entidad persistente, estados dispatched/received, tránsito, diferencias y ledger atómico.
5. Corregir BCV #227 y luego recuperar checkout app handler.
6. Mantener Neon producción sin escrituras hasta aprobación específica del baseline/adoption y roles/grants.

