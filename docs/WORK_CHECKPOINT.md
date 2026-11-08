# Work checkpoint — 2026-11-08 13:15 UTC

## Fuente y alcance
- Repo: BTF14/Micro-app.
- Rama de checkpoint: `docs/reconcile-neon-pr-state-20261108`, creada desde main `5f09b87aee09d0746f6ea90f076b4eb81d168daf`.
- Trabajo realizado en este bloque: solo lectura GitHub/Neon y actualización documental. No cambios de código, merges, force-push ni migraciones.
- El archivo raíz `WORK_CHECKPOINT.md` no existe; este es el checkpoint operativo canónico indicado por `AGENTS.md`.

## Evidencia actual
- Main: `5f09b87aee09d0746f6ea90f076b4eb81d168daf`.
- #269: Open/Draft/mergeable; HEAD `56a5f2ebf4f63c03bc4e50bbf5eb45b6e0aebbde`; 13 ahead/0 behind; 11 workflow runs success; una review COMMENTED, no APPROVE.
- #270: Open/Draft/mergeable; HEAD `d3ec41147798ab19ffb74147f319565e8ea31b31`; 1 ahead/0 behind; 9 workflow runs success; diff limitado a 2 líneas del resumen del workflow; sin reviews.
- #255: Open/Ready/no mergeable; HEAD `59b6b40ddf30f6711624124b719ef15234ce5fdc`; base SHA `c46ed6f...`; 48 ahead/2 behind main; merge-base `c46ed6f...`; 10 workflow runs success; sin reviews.
- Open PR count: 7 (#193, #233, #255, #258, #262, #269, #270). #193 permanece intacta.
- Neon rehearsal SELECT: `neondb`, login/session `microapp_migrator`, branch `br-curly-poetry-b7dxsddm`, project `restless-fire-99110035`, 15 tablas base públicas. Rama `ready`; roles migrator/runtime presentes.
- El usuario confirmó que actualizó el secreto `NEON_REHEARSAL_DATABASE_URL`; aún falta prueba de consumo por GitHub Actions. El último run conocido falló por secreto ausente antes de conectar. No se pudo despachar otro workflow porque el conector GitHub no expone workflow_dispatch.
- Workflow inspeccionado: solo `verify` no hace DDL/DML; `adopt-and-migrate` es operación separada de escritura.

## Riesgos y bloqueos
- No asumir que conexión directa desde el conector Neon equivale a que Actions use el secreto correcto.
- #255 diverge de main y GitHub informa mergeable=false; no integrar.
- #269 mantiene gates de producto checkout y migraciones 0017–0019.
- #258 tiene conflicto de integración; #262 depende de una base antigua de #258.
- Producción NOT READY.

## Próxima acción exacta
Desde GitHub Actions, ejecutar `.github/workflows/neon-rehearsal-migrations.yml` en branch `main`, input `operation=verify` únicamente. No seleccionar `adopt-and-migrate`. Después revisar el resultado del run; nunca compartir el secreto ni su URI.
