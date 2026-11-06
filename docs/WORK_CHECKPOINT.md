# Work checkpoint — BTF14/Micro-app — 2026-11-06

## Estado verificado — PR #244 — 2026-11-06

- PR: https://github.com/BTF14/Micro-app/pull/244 — Draft, base main.
- HEAD validado: `d3de5216fac446580e4afdd39376af503cc94b51`; 56 archivos, +5,630/-218.
- **10/10 workflows SUCCESS en este SHA exacto**: CI, PostgreSQL migration validation, migration-runner validation, Playwright E2E, Semgrep, Trivy, dependency review, secret-history scan, AutoSkills preview y progress dashboard.
- CI incluye build/typecheck, unit tests, integración PostgreSQL admin/runtime para auth, branch scope, register shifts, cashier own-shift, catálogo y conteos; todas pasaron.
- Correcciones de test harness: aserciones históricas se ejecutan junto a su migración, no después de aplicar toda la cadena; las fixtures usan conexión admin y las peticiones/helper checks usan runtime. Se añadió test que prueba que cashier open-shift ejecuta realmente con login runtime.
- Seguridad añadida: lecturas de catálogo/almacenes/conteos mantienen locks de sesión/tenant/sucursal durante la consulta; la lista de conteos bloquea el warehouse. Cantidades y costos de conteo solo aceptan strings decimales, no JSON numbers.
- UI: catálogo y formularios consumen el paquete BigInt compartido; aviso BCV ya no afirma conversión vigente cuando no existe tasa validada. Descuentos ausentes.
- Cloudflare Pages preview: https://feat-recover-inventory-appli.micro-app-63i.pages.dev
- Cloudflare Worker preview: https://feat-recover-inventory-application-20261106-micro-app-api.btfcasheb.workers.dev
- Smoke directo del Worker preview: `/health` responde 200; endpoint de catálogo devuelve 503, bloqueado por el aislamiento de preview. Esto no es producción.
- No hay reviews formales ni threads de revisión registrados en PR #244. main está protegido; la integración no tiene permiso para leer el endpoint de branch protection (403). No se ha intentado eludir protección.
- Producción sigue **NOT READY**: no hay baseline/adoption de Neon ejecutado, smoke autenticado de producción, cierre completo de issue #53/P0-P1, inventory movement/read UI, BCV corregido/integrado ni checkout de ventas en la app.



## Próxima secuencia de ejecución
1. Completar revisión de diff de PR #244, resolver cualquier observación adicional y comprobar reviews/threads/status contexts sobre el HEAD vigente.
2. Si branch protection permite y todos los gates siguen verdes, convertir #244 de Draft y fusionar con squash usando el SHA esperado. No saltarse required reviews/checks.
3. Recuperar inventory movement/read endpoints y la UI de inventario en una línea separada, con idempotencia, auditoría y balance-ledger coupling.
4. Corregir #227: permitir persistir tasa de mañana y tasa de hoy en filas separadas; añadir prueba mañana→hoy y límites de cuerpo HTTP antes de habilitar BCV.
5. Recuperar checkout app handler después de completar inventario y BCV, con decimal BigInt, snapshot de precio/tasa, pagos, idempotencia y transacción.
6. Mantener Neon producción sin escrituras hasta aprobar y autorizar específicamente baseline/adoption y roles/grants. Producción NOT READY.

