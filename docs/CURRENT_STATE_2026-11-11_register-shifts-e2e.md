# Reconciliación viva — PR #287 — 11 de noviembre de 2026

Este snapshot es la referencia operativa más reciente y prevalece sobre snapshots históricos contradictorios en documentos extensos. Consultar GitHub en vivo antes de actuar.

## Estado GitHub
- Rama: integration/bcv-checkout-rehearsal-20261109.
- PR #287: OPEN / Draft / mergeable; base main.
- HEAD al registrar esta actualización: eb6ac45c39db225ff3c935b97a9c16998798404c.
- main: c5373564413ba086690552c6b7deeab08d7b4a89.
- Comparación: 473 ahead / 1 behind; merge base 03442951b2a2f63f5bf4dcf560f2c91be4f6cc71. El único commit exclusivo de main es documental, de 15 líneas en docs/BACKLOG_RECOVERY_LEDGER.md.
- Reviews formales: 0. Review threads: 0. Combined legacy status contexts: 0.
- Issue #53: OPEN / P0. PR #303: OPEN / Draft; no fusionarla separadamente por solapamiento con el trabajo dual de backup/restore en #287.

## UI Caja y turnos
- RegisterShiftsPanel.tsx y register-shifts.css están integrados en App como Caja y turnos para Owner/Admin/Cashier.
- La UI lista sucursales/cajas asignadas, abre turno propio con fondo USD/VES y cierra con conteo físico USD/VES tras revisión y confirmación.
- Los conteos finales empiezan vacíos; no se copian fondos iniciales. El selector de sucursal queda bloqueado cuando hay turno abierto.
- No incluye ventas, checkout UI, cobros, recibos, arqueo, efectivo esperado, diferencias, retiros, devoluciones ni anulaciones.
- Migration 0023 y API de turnos se validan separadamente mediante PostgreSQL runtime-login tests y assertions de privilegios.

## Nueva cobertura Playwright
Se añadió apps/web/e2e/register-shifts.spec.ts. La prueba usa sesión y API sintéticas interceptadas en el navegador para comprobar navegación, carga de sucursal/caja, apertura, payload USD/VES, conteos finales vacíos, bloqueo de sucursal, revisión explícita, confirmación de cierre y retorno a estado sin turno.

Límite: la E2E valida flujo de UI con mocks; no demuestra autorización PostgreSQL, persistencia, triggers, RLS ni aislamiento real. Esos gates dependen de las pruebas de integración PostgreSQL runtime-login.

## Validación exact-HEAD
Para eb6ac45c39db225ff3c935b97a9c16998798404c:
- Playwright E2E run 43022478525 estaba IN_PROGRESS en la última consulta.
- CI run 43022478629 estaba IN_PROGRESS.
- Migration runner 43022478543, migration validation 43022478813, backup restore smoke 43022478539 y Semgrep 43022478892 estaban IN_PROGRESS.
- Dependency review 43022478522, ODD docs 43022478614 y dashboard 43022478647 habían terminado SUCCESS.
- Combined legacy status contexts: 0.
Reconsultar workflows y SHA exactos; no inferir PASS/FAIL mientras no haya conclusión.

Evidencia del HEAD anterior 255e1c145b9fbddfeeb77e30277de4b905961a52: CI 43014779622 SUCCESS, web 88/88, API 198/198, API turnos runtime-login 4/4 y Playwright 43014779660 SUCCESS. El Playwright anterior solo cubría autenticación; por eso se añadió el spec específico de turnos.

## Límites de seguridad y producto
- Mantener PR #287 Draft; checks verdes no equivalen a aprobación.
- Issue #53 permanece OPEN/P0. Producción NOT READY.
- No Neon main, datos reales, migraciones remotas, secretos, Cloudflare sensible, DNS, billing, Cron, backup manual ni restore remoto.
- No implementar nuevas reglas comerciales de pago hasta cerrar Seguridad Nivel 1 y aprobar parciales, cambio/sobrepago, recibos, anulaciones y devoluciones.
- Mantener presupuesto $0 y deadline MVP 2026-12-01.

## Siguiente paso
1. Reconsultar Playwright y CI exact-HEAD eb6ac45; si falla, inspeccionar logs y corregir sin debilitar aserciones.
2. Revisar el nuevo spec y el diff completo contra main.
3. Reconciliar los documentos canónicos de estado/checkpoint con esta evidencia, evitando snapshots obsoletos.
4. Mantener el siguiente frente en seguridad P0 y jornada de UI; no saltar a nuevas reglas financieras.
