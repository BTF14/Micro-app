# Work checkpoint — 2026-11-08 13:30 UTC

## Estado
- Repo BTF14/Micro-app; main snapshot `33016a2d206c7b8cfc60e53e34a56a26651141d7`.
- #270 merged: `37e8c40d5bacfb71133942d774c3f87d71d61b9e`; fix textual de quoting; 9 workflow runs SUCCESS exact-HEAD.
- #272 merged: `33016a2d206c7b8cfc60e53e34a56a26651141d7`; docs-only; 10/10 workflow runs SUCCESS exact-HEAD. #271 closed as superseded.
- 6 PR abiertas: #193, #233, #255, #258, #262, #269. #193 no modificar.
- #269 Open/Draft, HEAD `56a5f2ebf4f63c03bc4e50bbf5eb45b6e0aebbde`, 13 ahead/2 behind, 11 workflow runs SUCCESS, review COMMENTED.
- #255 Open/Ready, HEAD `59b6b40ddf30f6711624124b719ef15234ce5fdc`, 48 ahead/4 behind, 10 workflow runs SUCCESS, review COMMENTED. Dos P1 pendientes: anomalías de tasa y observabilidad del Cron. Sin aprobación.
- Neon rehearsal `br-curly-poetry-b7dxsddm`: SELECT identidad correcta, fingerprint baseline 0002 294/294 exacto, 15 tablas; roles migrator/runtime con atributos restrictivos; 17 objetos públicos propiedad del migrator. No DDL/DML.
- Usuario confirmó que actualizó `NEON_REHEARSAL_DATABASE_URL`; falta verificarlo desde Actions. Último run conocido #42479603848 falló por secreto ausente antes de conectar.
- El workflow `verify` es solo SELECT/fingerprint; `adopt-and-migrate` escribe y no está autorizado todavía.
- El conector no permite workflow_dispatch; requiere ejecución manual desde UI de Actions.
- Producción NOT READY.

## Siguiente acción exacta
GitHub Actions → workflow `.github/workflows/neon-rehearsal-migrations.yml` → branch `main` → `operation=verify` solamente. Nunca seleccionar `adopt-and-migrate`; no compartir URI/secret.
