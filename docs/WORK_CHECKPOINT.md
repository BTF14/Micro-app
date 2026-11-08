# Work checkpoint — 2026-11-08

## Estado verificado
- Repo: BTF14/Micro-app. Main protegido: 11ca2b49bfa650066a708d2423cc73cea6c99e2d.
- PR #275 merged en main 11ca2b49bfa650066a708d2423cc73cea6c99e2d; PR #274 cerrada como supersedida.
- PR #275 agregó el workflow manual main-only de ensayo Neon, default read-only verify-empty, y un .gitleaksignore de fingerprint exacto para un falso positivo confirmado de SHA.
- Post-merge GitHub Actions: 9/9 workflow runs SUCCESS; los seis required contexts de main SUCCESS. Cloudflare Pages y Workers Builds check-runs todavía en progreso al último chequeo.
- PR abiertas: #269 (Draft; 15 ahead/3 behind; mergeable=false), #255 (53 ahead/5 behind; mergeable=false), #258 (35 ahead/36 behind; mergeable=false), #262 (107 ahead/36 behind, stacked sobre #258), #233 (histórica Draft), #193 (no modificar).
- Neon: rama rehearsal br-curly-poetry-b7dxsddm; DB neondb es parent-data clone y está prohibida para escrituras. DB microapp_rehearsal fue consultada con SELECT: identidad exacta, schemas estándar, 0 relaciones/funciones públicas, sin schema_migrations.
- El run anterior #42479603848 del workflow antiguo confirmó que NEON_REHEARSAL_DATABASE_URL funciona después de rotación; conexión directa y baseline 0002 verificado; ningún paso de escritura corrió.
- El nuevo workflow .github/workflows/neon-pinned-migration-rehearsal.yml está en main pero aún no se ha despachado. El conector GitHub no ofrece workflow_dispatch.

## Próximo paso exacto
El propietario debe abrir Actions → “Neon pinned migration rehearsal” → Run workflow, seleccionar branch main y dejar operation en su valor predeterminado verify-empty. No rellenar confirmation. Después compartir únicamente el resultado/resumen del run (no secretos ni URI). Inspeccionar logs; no ejecutar bootstrap-and-migrate todavía. Para cualquier escritura se requerirá autorización explícita adicional tras revisar el preflight.

## Límites
- No migraciones, DDL/DML remotos, Neon main, producción, Cloudflare manual, DNS ni billing.
- Producción NOT READY.
