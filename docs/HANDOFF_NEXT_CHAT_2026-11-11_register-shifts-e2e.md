# Handoff de continuidad — 11 de noviembre de 2026

Consulta primero AGENTS.md y docs/CONSTITUTION.md. Para el snapshot vivo más reciente, usa docs/CURRENT_STATE_2026-11-11_register-shifts-e2e.md; prevalece sobre snapshots históricos contradictorios.

## Punto de continuación
- Repo: https://github.com/BTF14/Micro-app
- Rama: integration/bcv-checkout-rehearsal-20261109
- PR #287: OPEN / Draft / mergeable. No merge todavía.
- HEAD al crear este handoff: eb6ac45c39db225ff3c935b97a9c16998798404c.
- main: c5373564413ba086690552c6b7deeab08d7b4a89.
- Issue #53: OPEN/P0.
- Producción: NOT READY.

## Trabajo recién añadido
Se creó apps/web/e2e/register-shifts.spec.ts para probar en Chromium el flujo de UI de apertura y cierre con confirmación. Usa respuestas sintéticas interceptadas; no valida API/DB real. Playwright exact-HEAD run 43022478525 y CI 43022478629 estaban IN_PROGRESS en la última consulta. Revalidar todos los workflows asociados contra el SHA exacto.

La UI Caja y turnos permite apertura/cierre del turno propio para Owner/Admin/Cashier, fondos y conteos USD/VES. Los conteos finales empiezan vacíos y el cierre requiere revisión y confirmación. No existe todavía UI de ventas, pagos ni recibos.

## Reglas
- No pedir Build IDs, capturas, terminal, CLI, TinyFish ni reconexiones; consultar GitHub y docs.
- Mantener #287 Draft; CI no equivale a aprobación.
- No fusionar #303 separadamente por solapamiento de backup/restore.
- No cerrar issue #53.
- No Neon main, datos reales, secretos, deploy manual, Cloudflare sensible, DNS, billing, Cron, backup manual ni restore remoto.
- No inventar política de pagos ni ampliar lógica comercial mientras Seguridad Nivel 1 y el contrato de pagos sigan abiertos.
- Si falla un check, inspeccionar el job/log exacto y corregir sin bajar cobertura.
- Coste objetivo $0. Deadline MVP 2026-12-01.
