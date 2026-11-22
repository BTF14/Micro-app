# ODD task: Micro-PR 6 — Paquete Final Visual y Manual

- Status: in progress
- Issue / PR: Micro-PR 6 — PR Draft contra main (se completa al abrir)
- Owner / reviewer: BTF14
- Started: 2026-11-22
- Risk: medium

## Objective and authorization

- Desired outcome: entregar favicon corporativo, tour visual E2E de nueve pantallas y dos tamaños, manual de usuario en español y continuidad verificable.
- Authorization boundary: solo repositorio BTF14/Micro-app, rama nueva basada exactamente en 012653ed9b8d72967580aa5a6dde0ef914ff656d; PR Draft sin merge ni auto-merge.
- Relevant original request: Micro-PR 6 — Paquete Final Visual y Manual.

## Scope and exclusions

Included:
- `apps/web/public/favicon.svg` y enlace desde `apps/web/index.html`.
- `apps/web/e2e/visual-tour.spec.ts` con stubs locales por `page.route`, 9 vistas × 390×844 y 1280×800, 18 capturas PNG.
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
- [ ] AC-3 — Las nueve vistas reales se recorren con sesión simulada owner y datos sintéticos en 390×844 y 1280×800.
- [ ] AC-4 — Cada una de las 18 vistas valida main, navegación, encabezado, cero overflow horizontal, cero jerga técnica y ausencia de alertas inesperadas; produce PNG nombrado.
- [ ] AC-5 — Solo browser-tests ejecuta el tour y carga artifact temporal de siete días con 18 capturas.
- [ ] AC-6 — Manual español explica acceso Google, cuatro roles, nueve pantallas, escáner, vuelto, tiendas digitales, reportes/CSV y una moneda por ticket.
- [ ] AC-7 — Continuidad registra PR #403 y #405 MERGED en main 012653ed9b8d72967580aa5a6dde0ef914ff656d, nueva PR Draft y siguiente paso independiente.
- [ ] AC-8 — Cero archivos backend/SQL/migraciones/package/dependencias modificados; gates congelados intactos.
- [ ] AC-9 — 100 % de check-runs y workflow runs reales inspeccionados en SHA final exacto; artifact verificado.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| Stubs no reflejan el contrato real | medium | Respuestas sintéticas alineadas con tipos/consumidores UI; CI E2E en SHA exacto |
| Tour crea capturas pero no se revisan | medium | Artifact temporal de 7 días; verificar cantidad 18 |
| Pantallas largas en móvil | medium | Medición scrollWidth por cada vista y viewport |
| Fuga de orígenes CSP | high | No modificar apps/web/public/_headers; SVG autocontenido |
| Cambio accidental de backend o gates | critical | Lista allowlist de archivos y revisión final del diff |

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Favicon e index | Icono corporativo servido localmente | HTTP 200 + MIME SVG en Playwright | in progress |
| Tour E2E | 18 capturas y validaciones | Playwright CI exact-SHA + artifact | in progress |
| Manual de usuario | Guía clara en español | Revisión del contenido y enlaces/pantallas reales | in progress |
| ODD y continuidad | Handoff coherente | `tools/validate-agent-docs.py` en CI/entorno local disponible | in progress |
| Guardrails | 0 backend/SQL/package/deps | Diff final exacto | in progress |

## Technical decisions

- El tour usa el rol `owner` para que las nueve opciones de navegación estén disponibles y responde exclusivamente con datos sintéticos mediante stubs de red.
- Las dos dimensiones se configuran explícitamente dentro del mismo spec; se generan nueve PNG por tamaño.
- Los screenshots son artefactos temporales de GitHub Actions (retención de siete días), no datos persistentes del negocio.
- Los gates permanecen: AC-6 OPEN; FX_CONTINGENCY_ENABLED=false; BCV_SYNC_ENABLED=false; Issue #53 OPEN/P0; freeze v1.1; PRODUCTION: NOT READY; USD 0.
- No existe checkout local/terminal en esta ejecución; no declarar validación local.

## Closure and handoff

- Final commit SHA: pendiente de CI.
- PR: Draft contra main; completar URL y número al abrir.
- Checks and exact outcomes: inspeccionar el 100 % de check-runs y workflow runs en el SHA final exacto.
- Acceptance criteria met / unmet: pendientes de CI exact-SHA y artifact con 18 capturas.
- Limitations not verified: ejecución local, revisión visual manual del artifact hasta que CI lo genere.
- Residual risks: stubs sintéticos; no sustituyen validación con backend real ni auditoría preproducción.
- Next step: tras merge, cierre independiente Pre-prod Audit → ve-fx-compliance-review → AC-6 → Issue #53.
