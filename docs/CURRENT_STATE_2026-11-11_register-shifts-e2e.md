# Reconciliación viva — PR #287 — 11 de noviembre de 2026

Este snapshot operativo reemplaza el estado anterior de este archivo. Prevalece sobre snapshots históricos contradictorios en docs extensos. Consultar GitHub en vivo antes de actuar.

## Estado GitHub exact-HEAD

- Repositorio: BTF14/Micro-app.
- Rama: integration/bcv-checkout-rehearsal-20261109.
- PR #287: OPEN / Draft / mergeable; base main.
- HEAD de código y test: 480b846fac4d6b4f2b4ee101e6207861d1189ef3.
- main: c5373564413ba086690552c6b7deeab08d7b4a89.
- Comparación: 477 ahead / 1 behind; merge base 03442951b2a2f63f5bf4dcf560f2c91be4f6cc71. El único commit exclusivo de main es documental, 15 líneas en docs/BACKLOG_RECOVERY_LEDGER.md.
- Reviews formales #287: 0. Review threads: 0. Combined legacy status contexts: 0.
- Issue #53: OPEN / P0.
- PR #303: OPEN / Draft; no fusionarla separadamente por solapamiento de backup/restore con #287.

## UI Caja y turnos

- RegisterShiftsPanel.tsx y register-shifts.css están integrados en App como Caja y turnos para Owner/Admin/Cashier.
- La UI lista sucursales/cajas asignadas, abre el turno propio con fondos USD/VES y permite cerrar con conteos físicos USD/VES tras revisión y confirmación.
- Los conteos finales empiezan vacíos; no se copian los fondos iniciales. El selector de sucursal se bloquea cuando existe turno abierto.
- No incluye ventas, checkout UI, cobros, recibos, arqueo, efectivo esperado, diferencias, retiros, devoluciones ni anulaciones.
- Migration 0023 y API de turnos tienen pruebas PostgreSQL runtime-login y assertions de privilegios separadas.

## Cobertura Playwright añadida

Archivo: apps/web/e2e/register-shifts.spec.ts.

- La prueba usa sesión owner sintética y API interceptada en navegador.
- Comprueba navegación, carga de sucursal/caja, apertura con importes USD/VES, payload enviado, conteos finales vacíos, bloqueo de sucursal, revisión explícita, confirmación de cierre, payload final y retorno a estado sin turno.
- El primer intento falló porque la aserción exigía que el texto de una opción HTML <option> fuera visible. El log mostró que el elemento era una opción seleccionada, no texto visible. Se corrigió por una aserción sobre el valor del selector. No fue un fallo del componente ni del API.
- Playwright exact-HEAD run 43022713775: SUCCESS; 5/5 tests Chromium pasaron, incluidos los cuatro de autenticación y el nuevo flujo de turnos.

Límite: la E2E usa mocks de red; valida el flujo de UI, no autorización PostgreSQL, persistencia, triggers, RLS ni aislamiento real. Esos gates dependen de las pruebas de integración PostgreSQL runtime-login.

## Validación exact-HEAD 480b846

| Workflow | Run | Resultado |
|---|---:|---|
| CI | 43022714076 | SUCCESS |
| Playwright E2E | 43022713775 | SUCCESS |
| Backup restore smoke test | 43022713769 | SUCCESS |
| Database migration validation | 43022713966 | SUCCESS |
| Semgrep SAST | 43022713995 | SUCCESS |
| Security scan | 43022714161 | SUCCESS |
| Dependency review | 43022714057 | SUCCESS |
| ODD/docs validation | 43022713779 | SUCCESS |
| Project progress dashboard | 43022713937 | SUCCESS |
| Secret history scan | 43022714024 | PENDING; jobs API sin jobs |
| PostgreSQL migration runner validation | 43022713778 | PENDING; jobs API sin jobs |

CI run 43022714076 terminó SUCCESS. Build/typecheck, preview isolation, backup askpass tests, unit tests, auth/rate-limit/BCV/branch/register-shift/catalog/inventory/checkout PostgreSQL integration y runtime-role API integration terminaron SUCCESS. Web unit suite: 88/88. Playwright: 5/5. Los dos workflows pendientes se mantienen pendientes; no contarlos como éxito ni como fallo sin jobs/logs.

## Evidencia del intento inicial y corrección

- Commit inicial de spec: eb6ac45c39db225ff3c935b97a9c16998798404c.
- Playwright run 43022478525 falló en la aserción getByText("Sucursal Centro").toBeVisible(): el locator resolvía a un <option> oculto, aunque seleccionado. Los cuatro tests previos de autenticación pasaron.
- Corrección en 480b846fac4d6b4f2b4ee101e6207861d1189ef3: comprobar el valor de select Sucursal en vez de visibilidad de option.
- En el SHA corregido, Playwright pasó 5/5 y CI pasó.

## Límites de seguridad y producto

- Mantener PR #287 Draft; checks verdes no equivalen a aprobación.
- Issue #53 permanece OPEN/P0. Producción NOT READY.
- No Neon main, datos reales, migraciones remotas, secretos, Cloudflare sensible, DNS, billing, Cron, backup manual ni restore remoto.
- No implementar nuevas reglas comerciales de pago hasta cerrar Seguridad Nivel 1 y aprobar parciales, cambio/sobrepago, recibos, anulaciones y devoluciones.
- La prueba E2E no demuestra backend real.
- Presupuesto objetivo $0; deadline MVP 2026-12-01.

## Siguiente paso

1. Resolver o diagnosticar los dos workflows PENDING que todavía no publican jobs: Secret history scan y PostgreSQL migration runner validation.
2. Revalidar la rama y PR #287 en vivo, reviews, threads, issue #53 y gates de Seguridad Nivel 1.
3. Mantener el siguiente frente en seguridad P0 y jornada UI; no ampliar lógica financiera hasta aprobar el contrato comercial.
4. Antes de promover, exigir revisión independiente, branch protection, workflows exactos y cierre de los gates operativos; no inferir readiness de producción a partir de CI.
