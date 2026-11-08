# Work checkpoint — BTF14/Micro-app — 2026-11-08 UTC

## Estado GitHub

- `main`: `96e2e2d9f76bc8fcc3bab2fa9503e480545c8869`.
- #251 Draft, HEAD `5dec5d5a9025de16b19d0cb7cfeac6585e2ad5d6`, base main, 15/15 check-runs SUCCESS, cero commits detrás.
- #255 Draft, HEAD `35b9ac6894f79c5760a1f56fb37506ed2278afa0`, base #251 `5dec5d5...`, 13 workflow runs + 15/15 check-runs SUCCESS, cero commits detrás.
- #257 Draft, HEAD `143a38664cf14e360801980d39e0cc3f2b7d5650`, base main, 10/10 check-runs SUCCESS.
- Abiertas para reconciliación: #193, #202, #211, #233. Cerradas por supersesión verificada: #200, #204, #205, #207–#210, #227–#232. No se fusionaron esas PR.
- No hay revisión formal de #251/#255; mantener Draft.

## BCV

- Parser oficial HTTPS con streaming máximo 2 MB; fecha efectiva validada; persistencia idempotente NUMERIC(18,8).
- Validación del límite de tasa exacta con BigInt.
- Latest API y cliente web no-store; dashboard revalida al cambiar fecha Caracas y al volver a primer plano; respuestas antiguas se descartan.
- Fines de semana seleccionan la fecha futura más próxima; feriados entre semana sin calendario oficial → fail closed.
- No fusionar ni activar Cron hasta migration 0013 aplicada en rehearsal, runtime grants verificados y revisión independiente.

## Neon

- Main `br-summer-math-b7297a60`: no roles runtime/migrator, no ledger, no `auth_bootstrap_attempts`, no branches/warehouses/inventory_balances/register_shifts; exchange_rates NUMERIC(14,6).
- Rehearsal `br-curly-poetry-b7dxsddm`: roles LOGIN existen y conectan; objetos bajo owner migrator; runtime no tiene grants de tabla. No ledger ni migraciones 0003–0016.
- `migration-runner.yml` solo valida PostgreSQL 18 desechable. Falta secreto/runner protegido para Neon rehearsal. No ejecutar SQL manual ni escribir en main.

## Siguiente acción

Revisión independiente #251/#255; preparar autorización específica para el runner Neon de rehearsal; después recuperar #233 en rama nueva con migration 0017, sin copiar migration 0015 antigua. Producción NOT READY.
