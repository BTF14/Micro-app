# ODD task: Micro-PR 6 — Paquete Final Visual y Manual

- Status: in progress
- Issue / PR: **PR #406** — https://github.com/BTF14/Micro-app/pull/406 — OPEN / Draft contra `main`; sin merge ni auto-merge.
- Owner / reviewer: BTF14
- Started: 2026-11-22
- Risk: medium

## Objective and authorization

- Desired outcome: entregar favicon corporativo, tour visual E2E de nueve pantallas en móvil, tablet y PC, manual de usuario en español y continuidad verificable.
- Authorization boundary: solo repositorio BTF14/Micro-app y rama existente `feat/final-visual-manual-micro-pr-6-20261122` de la **PR #406**; mantener Draft, sin merge ni auto-merge; todos los gates de release congelados.
- Relevant original request: Micro-PR 6 — Paquete Final Visual y Manual.

## Scope and exclusions

Included:
- `apps/web/public/favicon.svg` y enlace desde `apps/web/index.html`.
- `apps/web/e2e/visual-tour.spec.ts` con stubs locales por `page.route`, 9 vistas × 390×844, 820×1180 y 1280×800; encuadre real (`fullPage: false`), menú móvil abierto y capturas adicionales de inventario, ventas y reportes; capturas principales siempre desde el inicio del viewport.
- Solo job `browser-tests` de `.github/workflows/playwright-e2e.yml`: ejecutar el tour y subir screenshots con `actions/upload-artifact@v7`, siete días.
- `docs/USER_MANUAL.md`, ODD task y cabeceras de continuidad.
- CSP existente sin ampliar orígenes.

Excluded:
- Cualquier archivo en `apps/api/**`, SQL o migraciones.
- `package.json`, `pnpm-lock.yaml`, paquetes o dependencias nuevas.
- Cambios al job `fullstack-commerce`, producción, datos reales, secretos, servicios pagos, Neon o deploy.
- Cualquier cambio de gates de release.

## Acceptance criteria

- [ ] AC-1 — Favicon SVG autocontenido, fondo #172b2a, monograma crema, legible en 16 y 64 px; enlazado en head.
- [ ] AC-2 — El tour comprueba HTTP 200 y MIME image/svg+xml del favicon antes de recorrer vistas.
- [ ] AC-3 — Las nueve vistas reales se recorren con sesión simulada owner y datos sintéticos en móvil 390×844, tablet 820×1180 y PC 1280×800.
- [ ] AC-4 — Cada una de las 27 combinaciones vista/viewport valida main, navegación, encabezado, cero overflow horizontal, cero jerga técnica y ausencia de alertas inesperadas; produce PNG del viewport. Móvil añade menú abierto; Inventario y Reportes añaden capturas enfocadas.
- [ ] AC-5 — Solo browser-tests ejecuta el tour y carga artifact temporal de siete días con 37 capturas.
- [ ] AC-6 — Manual español explica acceso Google, cuatro roles, nueve pantallas, escáner, vuelto, tiendas digitales, reportes/CSV y una moneda por ticket.
- [ ] AC-7 — Continuidad registra PR #403 y #405 MERGED en main 012653ed9b8d72967580aa5a6dde0ef914ff656d, nueva PR Draft y siguiente paso independiente.
- [ ] AC-8 — Cero archivos backend/SQL/migraciones/package/dependencias modificados; gates congelados intactos.
- [ ] AC-9 — 100 % de check-runs y workflow runs reales inspeccionados en SHA final exacto; artifact verificado.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Stubs no reflejan el contrato real | medium | Respuestas sintéticas alineadas con tipos/consumidores UI; CI E2E en SHA exacto |
| Tour crea capturas pero no se revisan | medium | Artifact temporal de 7 días; verificar cantidad 37 |
| Pantallas largas en móvil | medium | Medición scrollWidth por cada vista y viewport |
| Fuga de orígenes CSP | high | No modificar apps/web/public/_headers; SVG autocontenido |
| Cambio accidental de backend o gates | critical | Lista allowlist de archivos y revisión final del diff |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Favicon e index | Icono corporativo servido localmente | HTTP 200 + MIME SVG en Playwright | in progress |
| Tour E2E | 37 capturas y validaciones | Playwright CI exact-SHA + artifact | in progress |
| Manual de usuario | Guía clara en español | Revisión del contenido y enlaces/pantallas reales | in progress |
| ODD y continuidad | Handoff coherente | `tools/validate-agent-docs.py` en CI/entorno local disponible | in progress |
| Guardrails | 0 backend/SQL/package/deps | Diff final exacto | in progress |

## Visual correction scope

- `apps/web/src/catalog.css`: en Tablet (hasta 1000 px) Productos e Inventario usan tarjetas apiladas para mostrar todas las columnas sin scroll interno; en PC se compacta el padding de celdas y el ancho mínimo de Producto para evitar recortes.
- `apps/web/src/styles.css`: reduce el espaciado vertical de sidebar/brand/nav/indicador/versión para que la columna lateral quepa en PC 1280×800 y tablet 820×1180; el menú móvil conserva objetivos táctiles de 2.85rem (44px).
- `apps/web/src/reports.css`: alinea el encabezado de Reportes arriba y evita que Actualizar se estire; las celdas de Desglose de pagos usan `white-space: nowrap` y desplazamiento horizontal del contenedor.
- `apps/web/src/InventoryPanel.tsx`: elimina el identificador técnico `MAX_LINES` del copy, corrige singular/plural de líneas y fija fecha/hora `es-VE` en zona `America/Caracas`.
- `apps/web/e2e/visual-tour.spec.ts`: stubs sintéticos coherentes de sucursal, caja, turno, inventario y recepción; tour de nueve vistas en tres viewports; búsqueda activa, carrito y pago exacto; capturas de menú y zonas largas; las capturas principales hacen `window.scrollTo(0, 0)` antes de guardarse y las extras se toman después desplazando solo a Recepciones recientes, Cobrar venta/pagos y Desglose de pagos. Todas usan `fullPage: false`; Productos e Inventario comprueban que `.catalog-table-wrap` no tenga overflow horizontal.

## Technical decisions

- El tour usa el rol `owner` para que las nueve opciones de navegación estén disponibles y responde exclusivamente con datos sintéticos mediante stubs de red.
- Las tres dimensiones reales se configuran explícitamente dentro del mismo spec; se generan nueve PNG por tamaño, una captura de menú móvil abierto y nueve capturas adicionales de inventario/ventas/reportes.
- Los screenshots son artefactos temporales de GitHub Actions (retención de siete días), no datos persistentes del negocio.
- Los gates permanecen: AC-6 OPEN; FX_CONTINGENCY_ENABLED=false; BCV_SYNC_ENABLED=false; Issue #53 OPEN/P0; freeze v1.1; PRODUCTION: NOT READY; USD 0.
- No existe checkout local/terminal en esta ejecución; no declarar validación local.

## Closure and handoff

- Final commit SHA: pendiente de CI.
- PR: Draft contra main; completar URL y número al abrir.
- Checks and exact outcomes: inspeccionar el 100 % de check-runs y workflow runs en el SHA final exacto.
- Acceptance criteria met / unmet: pendientes de CI exact-SHA y artifact con 37 capturas.
- Limitations not verified: ejecución local, revisión visual manual del artifact hasta que CI lo genere.
- Residual risks: stubs sintéticos; no sustituyen validación con backend real ni auditoría preproducción.
- Next step: tras merge, cierre independiente Pre-prod Audit → ve-fx-compliance-review → AC-6 → Issue #53.
