# Work checkpoint — 2026-11-08 (posterior a PR #278)

## Estado verificado
- Repo: BTF14/Micro-app. Main protegido: `209e3fe9f99c96a07546bb87c04b90755257d918`.
- PR #278 fusionada por squash: https://github.com/BTF14/Micro-app/pull/278. HEAD de PR `b444344543a2edafaa70cf68f8450cade73c9fc4`; merge SHA `209e3fe9f99c96a07546bb87c04b90755257d918`.
- Causa: run Neon pinned rehearsal #2 `42502075476` comparó pin inmutable `6227a3a8497f6be94d675b64da5da61530c200fc` con tip de rama fuente mutable `a750d1868f0ad4ae78b3de197d160d376af688ab`; falló antes de conexión/SQL/migraciones.
- Fix integrado: fetch directo de SOURCE_SHA y comparación exacta FETCH_HEAD. Solo cambió el workflow de rehearsal.
- PR HEAD: 9/9 workflow runs SUCCESS. Main tiene seis contextos requeridos y branch protection activa. Revisión técnica manual; no hubo review formal ni hilos.
- Checks post-merge iniciaron; primera lectura tenía 1 queued y 9 in_progress, pendiente reconsulta.
- No se despachó workflow Neon, no hubo conexión, DDL/DML, migraciones ni bootstrap-and-migrate. Neon main y la DB parent-data clone `neondb` permanecen fuera de alcance.

## Próximo paso exacto del propietario
GitHub → Actions → “Neon pinned migration rehearsal” → Run workflow → branch `main` → dejar `operation=verify-empty` → no rellenar confirmation → Run workflow. Compartir solo el enlace/resultado y logs no sensibles. No seleccionar `bootstrap-and-migrate`.

## Límites
- Ninguna escritura remota Neon autorizada. Para cualquier escritura se requiere autorización explícita adicional tras revisar el preflight.
- No secretos, datos reales, Cloudflare manual, DNS ni billing.
- Producción NOT READY.
