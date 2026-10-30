## 2026-10-30 UTC — PR #157 fusionada y auditoría de workflows/deploy

- GitHub confirmó PR #157 cerrada/fusionada. Main quedó en `1ee1808af4aae484a71dc24750237ff4f4d934a0`; HEAD de PR `6eb464c950f195ec67350977575aef77e9790e1d`.
- El conector devolvió ocho workflow runs para el HEAD exacto y todos terminaron success. Combined status vacío y no se recuperaron runs post-merge para el merge SHA; no afirmar CI post-merge.
- La página de PRs abiertas no mostró PRs abiertas en la última consulta.
- Se inspeccionaron los 15 YAML de `.github/workflows`: ocho ejecutan en push + pull_request sin filtros, con potencial duplicación en ramas que ya tienen PR. No se modificaron.
- No hay workflow de GitHub Actions que despliegue Pages/Workers. `apps/api/wrangler.toml` configura `workers.dev`, sin routes/custom_domain. Los builds Cloudflare observados en historial son compatibles con Git integration externa; no se pudo inspeccionar su dashboard.
- Se documentaron riesgos, límites y recomendaciones en `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`; el análisis distingue siete workflows sin filtros de `sdd-docs-validation`, que sí filtra `main` y paths.
- Se abrió [PR #158](https://github.com/BTF14/Micro-app/pull/158) en borrador para validar esta actualización; no se fusionó.
- Solo lectura: no se ejecutaron workflows manuales, no se modificaron código, workflows, secretos, Cloudflare, Neon, datos ni producción; no se desplegó.

---

## 2026-10-30 UTC — PR #156 fusionada y auditoría estática de API/esquema

- Se fusionó [PR #156](https://github.com/BTF14/Micro-app/pull/156) mediante squash. Merge SHA: `18961456ac535146c4a1687d3b07d8f6693ce141`; main protegido y firmado/verificado por GitHub.
- HEAD de PR: `6c068f3e9734736ac26e51ff754e39915d660abe`; 9/9 workflows en success: CI, Playwright E2E, migración DB, Semgrep, security scan, secret history, validación SDD/documentación, dashboard y Dependency Review. No hubo review formal ni threads; se aplicó revisión manual del diff completo porque Codex no está disponible. El conector no devolvió workflows ni statuses post-merge para el merge SHA; no afirmar CI post-merge.
- No se modificó código de aplicación, esquema, migraciones, workflows, secretos, Neon, datos reales ni producción en PR #156.
- Se revisaron estáticamente rutas registradas, tenant context, helpers DB y migraciones. API: health + auth; sin handlers comerciales. Tenant context comprueba sesión/membresía/organización activas, no autorización por operación ni branch scope.
- Hallazgos SQL: venta completada no exige reconciliación de líneas/pagos; stock y ledger no están ligados por constraint; referencia de movimientos polimórfica sin FK; pagos sin idempotency key propia; último owner no protegido; audit_logs no es append-only por DB; no modelo branch/warehouse/register/shift.
- Los hallazgos son brechas de diseño antes de habilitar rutas, no evidencia de explotación/corrupción. No se ejecutó SQL ni se accedió a Neon main.
- Se creó la rama documental `docs/post-pr156-audit-continuity-20261030` para mantener CURRENT_STATE, HANDOFF, SCHEMA_REVIEW y PROJECT_PLAN sincronizados; verificar PR/checks antes de considerar cerrada esa actualización.

---

## 2026-10-29 — PR #152 fusionada; mitigación P1 de bootstrap iniciada

- PR [#152](https://github.com/BTF14/Micro-app/pull/152) fusionada; merge commit `9376419231501f837a2d85d8741f7bfa9f57a0cc`. Verificados 13 checks de su HEAD y nueve checks post-merge en éxito.
- Se identificó y trazó el transporte del secreto de bootstrap en query string hasta cookie HttpOnly. No hay evidencia de filtración activa.
- Rama `fix/bootstrap-token-post-body-20261029`: cambio propuesto a POST con cuerpo, Origin exacto, validación de campos y límites, token validado antes de redirigir, y pruebas de regresión. **Aún no fusionado ni declarado resuelto**.
- No se tocó Neon `main`, secretos ni producción; no se desplegó.

---

## 2026-10-29 — PR #151 fusionada y hallazgos iniciales de arquitectura multiempresa

- Se fusionó la PR [#151](https://github.com/BTF14/Micro-app/pull/151) mediante squash; merge commit `70984baf7f6ac5a442e6c2364aaf6d7d4ebbc7d4`. La PR documenta límites de Neon/Cloudflare y guardrails de capacidad. Los checks del SHA de cabeza terminaron en éxito antes de la fusión.
- La restauración técnica del backup remoto exacto se verificó en [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): checksum correcto, descifrado y restauración en PostgreSQL 18 efímero. No se usó Neon `main` ni producción.
- Límites pendientes del backup: integridad de datos comerciales poblados/conteos/relaciones, RPO/RTO, alerta de fallo y evidencia del coste total $0. La restauración técnica no demuestra esos aspectos.
- Revisión de código en `main` post-PR #151: `apps/api/src/index.ts` solo registra auth y `GET /health`; aún no hay handlers HTTP comerciales. `resolveTenantContext` comprueba sesión/membresía/organización, pero no autoriza por sí solo una operación.
- La migración inicial define entidades comerciales ligadas a organización, con algunas FK compuestas; no contiene una tabla de sucursales. Antes de crearla, definir catálogo/precios compartidos o por sucursal, inventario por ubicación, compras/proveedores y permisos organizacionales/sucursal.
- Hallazgo preliminar para revisar antes de habilitar bootstrap: `apps/api/src/google-auth.ts` acepta `bootstrap_token` en la query string de `/auth/google`. No se confirmó una filtración, pero la URL puede persistir en historial o registros; se documentó como riesgo de transporte del secreto, sin modificar código en esta PR.
- Snapshot Neon de solo lectura: plan `free_v3`, límite informado de 10 ramas y 3 ramas existentes (`main`, `micro-app-integrity-test`, `restore-test-20261028`), límite lógico 512 MiB por rama, autoscaling predeterminado 0.25 CU. No se eliminó la rama de restauración. Cloudflare no está verificado en vivo.
- Capacidad real de organizaciones/sucursales sigue **sin medir**; las cuotas documentadas no verifican la carga sostenible.
- Próximo trabajo: reconciliar estado/handoff/checklist/plan; continuar auditoría de solo lectura de constraints, consultas y matriz de permisos; proponer modelo de sucursales con pruebas sintéticas. No migrar Neon `main`, tocar secretos ni desplegar producción.

---

## 2026-10-29 — monitor diario de versiones y auditoría de dependencias (PR #137)

- Se añadió `.github/workflows/daily-dependency-watch.yml` en la rama `docs/market-dependency-audit-20261029`, dentro de la PR #137 ya existente, para evitar crear otra PR de seguimiento.
- El workflow está programado diariamente a las 08:15 UTC (04:15 Venezuela) y permite ejecución manual. Usa Node 24 y pnpm 10, instala con `pnpm install --frozen-lockfile`, informa de dependencias desactualizadas, consulta el último parche Node 24 LTS y ejecuta `pnpm audit --audit-level high`.
- Es de solo lectura (`contents: read`); no actualiza dependencias ni crea PRs. Los resultados se muestran en GitHub Actions; el audit high/critical falla la ejecución tras registrar su salida.
- Estado: código añadido; aún no verificado por checks de la PR ni por un run real del workflow. No afirmar que la monitorización diaria ya está operativa hasta fusionar y comprobar una ejecución.
- Se mantiene el guardrail de `undici@7.30.1` y la regla de no aceptar lockfiles incoherentes. Sin cambios a secretos, Neon, datos reales o producción.

---

## 2026-10-29 — auditoría de versiones estables y plan de migración segura

- El propietario pidió versiones actuales del mercado por motivos de seguridad y exigió documentar exhaustivamente la continuidad para los siguientes chats/IA. Confirmó autorización temporal para actuar con criterio y fusionar PRs cuando la evidencia lo justifique.
- Se consultó main y se confirmó que la PR #136 (merge SHA 59ad394d6dc5035b114db5379b2e1680d1e7969f) solo actualizó documentación. No cambió dependencias.
- Inventario en manifests/lockfile: Node >=24.22.1 <25; TypeScript 5.9.3; Hono 4.13.14; Workers types 5.20261026.1; Wrangler 4.152.0; React/react-dom 19.3.1; @types/react y @types/react-dom 19.3.0; Vite 7.3.7; plugin-react 5.2.0; jsdom 26.1.0; lockfile pnpm v9; override undici 7.30.1.
- Escaneo público del 2026-10-29 observó TypeScript 7.0.2, Vite 8.3.5, plugin-react 6.1.2, jsdom 30.1.3, Wrangler 4.154.0, React/react-dom 19.3.1, Hono 4.13.14, pnpm 12.16.1 y Node 24.22.2 LTS. Los índices de workers-types se mostraron inconsistentes; no afirmar última versión sin consulta directa al registry.
- PR #117 (TS7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) se cerraron sin merge. No afirmar que esas versiones se instalaron. La actualización debe incluir lockfile generado de verdad, revisión de peer dependencies/engines y CI completa.
- Guardrail crítico: no perder overrides: undici 7.30.1 en package.json y lockfile; el lockfile previo había resuelto undici 7.29.1 y provocado mismatch/finding alto.
- En esta auditoría no se modificaron paquetes, secretos, Neon, datos reales ni producción; no se ejecutó instalación local. Próximo paso: abrir/confirmar PR documental de esta nota; luego migración técnica en rama separada, una PR coherente y sin dispersar intentos.
- Fuentes del mercado: https://nodejs.org/en/blog/release ; https://www.npmjs.com/package/typescript ; https://www.npmjs.com/package/vite ; https://www.npmjs.com/package/@vitejs/plugin-react ; https://www.npmjs.com/package/jsdom ; https://www.npmjs.com/package/wrangler ; https://www.npmjs.com/package/hono ; https://www.npmjs.com/package/react ; https://www.npmjs.com/package/pnpm ; https://www.npmjs.com/package/@cloudflare/workers-types .

## 2026-10-29 — verificación post-merge final de PR #132

- Reconsultados los checks del commit `9f73f8ab0c1581145796f09a41f689fa4bdcf310`: `verify`, Chromium, migraciones PostgreSQL, análisis estático, Trivy, scan de historial de secretos, Cloudflare Pages y Workers terminaron todos en `success`.
- Se comprobó que el override de `undici` se mantiene coherente: `package.json` declara `7.30.1`; `pnpm-lock.yaml` contiene el bloque `overrides`, `undici@7.30.1` y no contiene `undici@7.29.1`.
- La prueba integral de restauración con datos sintéticos poblados sigue pendiente para la última fase. No se tocó Neon `main`, secretos, datos reales ni producción; no se hizo despliegue manual.

---

## 2026-10-29 — PR #116 fusionada tras corregir el override de Undici

- Se comprobó que los HEAD iniciales de PR #116–#120 eliminaban el bloque `overrides: undici: 7.30.1` del lockfile pese a mantener el override en `package.json`. Logs de `verify`/Chromium: `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; Dependency Review detectó `undici@7.29.1` con hallazgos de severidad alta.
- Se pidió rebase a Dependabot. La PR #116 se actualizó para preservar el override y se fusionó en `main` con SHA `fb49c32aa1451c4bf763a0b78ba12b507700f10d`; HEAD final de PR `5d3f2e373e75caf71af207cba61df3066b140a86`. Todos los checks de ese HEAD quedaron en `success`, incluidos Dependency Review, verify, Chromium, migraciones, static analysis, Trivy, scan de historial de secretos y Cloudflare Pages/Workers.
- Comprobación de lockfile en `main` tras el merge: `package.json` contiene `undici: 7.30.1`; `pnpm-lock.yaml` conserva `overrides: undici: 7.30.1`, incluye `undici@7.30.1` y no contiene `undici@7.29.1`.
- PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) aparecen cerradas sin fusionar. No considerar esos upgrades aplicados; reabrirlos solo después de revisar compatibilidad, diff y checks.
- En la primera consulta post-merge al SHA `fb49c32aa1451c4bf763a0b78ba12b507700f10d`, verify, Chromium, migraciones, Trivy, historial de secretos y Workers estaban en verde; static analysis y Cloudflare Pages aún estaban en curso. Pendiente reconsultar su conclusión final.
- No se tocaron Neon, secretos, datos reales ni producción. No hubo despliegue manual.

---

## 2026-10-29 — visibilidad de fallos de backup y evidencia viva

- Revisión en vivo de la ejecución programada de backup: run [40698423050](https://github.com/BTF14/Micro-app/actions/runs/40698423050), iniciado el 2026-10-28T13:39:19Z y concluido `success`. El repositorio privado de backups contiene dos copias cifradas, con checksums emparejados: `backup-2026-10-27T21-32-45Z.dump.age` y `backup-2026-10-28T13-39-39Z.dump.age`. No afirmar que se ejecutó el backup del día 29; en el momento de la consulta aún no había una ejecución programada más reciente.
- Se detectó que la sección 3 de `docs/BACKUP_AND_RECOVERY.md` seguía describiendo el backup diario como una implementación futura, aunque el workflow permanente ya existe. Se corrige esa contradicción.
- Se añade al workflow permanente un resumen visible en GitHub Actions cuando un paso falla, con enlace al run y recordatorio de preservar copias anteriores. No crea un issue público ni pretende ser una notificación externa; queda pendiente confirmar si las notificaciones nativas de GitHub bastan operativamente.
- No se leyó ni descargó contenido de backup, no se accedió a datos de negocio, no se modificó Neon, secretos ni producción. La restauración sintética poblada continúa para la última fase.
- Esta actualización aún no está fusionada; verificar todos los checks del HEAD exacto de la PR antes de recomendar fusión.

---

## 2026-10-29 — política de retención de backups confirmada para continuidad

- Política vigente: backup cifrado diario con retención de 15 días en el repositorio privado de backups.
- PR #129 corrigió el cálculo de antigüedad: se valida el timestamp UTC del nombre del backup, no el `mtime` del checkout, y se elimina el checksum emparejado de los archivos vencidos. Los tests de retención están en CI y los checks del HEAD de la PR pasaron.
- Instrucción obligatoria para futuras IA/chats: no borrar las copias recientes al crear una nueva; eliminar solo las que superen 15 días. Si falla la nueva ejecución o no se valida, conservar la última copia válida y verificar una alerta visible. No cambiar el plazo sin análisis de riesgo, coste $0 y revisión.
- La retención no prueba la restauración. Mantener pendientes la prueba aislada con datos sintéticos relacionados, comparación del manifiesto, RPO/RTO y alerta. La restauración se deja para la última fase.
- No se cambió código ni workflow en esta actualización documental; no se tocó Neon `main`, datos reales, secretos ni producción.

---

## 2026-10-29 — continuidad después de PR #127 y limpieza de credenciales

- HEAD verificado de `main`: `1fc95ee1a574d435523fc746a10537f1c95c5262`; PR #127 fusionada y workflow temporal retirado.
- El propietario confirma que eliminó `RESTORE_TEST_AGE_KEY`. `RESTORE_TEST_DB_URL` sigue pendiente de eliminación/confirmación; no almacenar ni solicitar el valor.
- La rama Neon de prueba `restore-test-20261028` seguía presente en la última consulta. El intento de borrado vía herramienta fue bloqueado por controles de seguridad. No afirmar que está borrada ni eludir el bloqueo; si hace falta, guiar al propietario para borrarla manualmente verificando proyecto/branch ID y evitando Neon `main`.
- Restore run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) pasó las verificaciones técnicas; las tablas comerciales/auditoría de esa copia estaban vacías. Queda pendiente un ensayo aislado con datos sintéticos poblados, manifiesto de conteos/relaciones, RPO/RTO, alertas, retención y evidencia de coste $0.
- No se tocaron Neon `main`, datos reales, secretos productivos ni producción. No se hizo despliegue manual.
- Continuidad: inspeccionar primero el mecanismo permanente de backup; después proponer/ejecutar una única prueba segura y documentar resultados. No recrear el workflow temporal retirado ni duplicar PRs.

---

## 2026-10-29 — restauración técnica de backup verificada

- El workflow temporal [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) terminó en `success`; checksum/descifrado/restore correctos y cinco verificaciones en verde: 13 tablas, 186 constraints, 0 membresías huérfanas y tablas de sesión/rate-limit ausentes.
- La copia restaurada no tenía filas en tablas comerciales ni auditoría. Se registra como prueba técnica exitosa con validación de datos comerciales todavía parcial; no se afirma integridad de registros poblados ni comparación de conteos con origen.
- Siguiente paso: una PR única elimina el workflow temporal y actualiza documentación; después el propietario borra `RESTORE_TEST_AGE_KEY` y `RESTORE_TEST_DB_URL` y elimina la rama Neon desechable. No se tocó Neon `main` ni producción.

---

## 2026-10-28 — PR #110 fusionada y continuidad pos-merge

- PR #110 se fusionó por squash en `main` con SHA `33da237ad7592ac394cc266c6a96c4bd1d387e37`; HEAD de PR verificado `65eb5d1cb07199b896a5022d94e739343a7c971b`.
- En ese HEAD pasaron los seis checks obligatorios: `verify`, Chromium authentication smoke tests, `postgres-migration`, JavaScript/TypeScript static analysis, Trivy filesystem/configuration y scan de historial de secretos. También pasaron Dependency Review y el dashboard del proyecto.
- La PR #110 actualizó el handoff, estado, diario y `docs/BACKUP_AND_RECOVERY.md` para reflejar los resultados verificados.
- La PR #112 también alinea `docs/PRODUCTION_READINESS.md`: Google OAuth/allowlist/sesiones ya están implementados y probados, el backup cifrado/subida tiene evidencia real, pero la restauración y el aislamiento de futuras rutas comerciales permanecen sin completar. Codex no pudo completar la revisión por límite de uso; se revisó manualmente el diff documental. No hubo reviews registradas. GitHub aceptó el merge con los checks en verde.
- La PR #111 se fusionó previamente en `3512cac28d6f0752a3699db00843a20788d91376`; su CI pasó 14/14 tests de integración PostgreSQL de auth y 48/48 tests unitarios.
- Después del merge de #110, el último SHA visible de main fue `33da237ad7592ac394cc266c6a96c4bd1d387e37`. El conector no devolvió workflows post-merge para ese SHA; no afirmar una segunda corrida.
- No se verificó HTTP CORS productivo; backup restore sigue pendiente; Dependabot alerts no son legibles desde el conector.

---

## 2026-10-28 — PR #111 fusionada; cobertura de sesión ampliada

- PR #111 (`test/auth-session-tenant-coverage-20261028`) fue fusionada por squash en `main` con SHA `3512cac28d6f0752a3699db00843a20788d91376`; HEAD probado `233844be10bb102fdac34ad41776d4d14420b243`.
- En el HEAD probado pasaron CI, Chromium authentication smoke tests, postgres-migration, JavaScript/TypeScript static analysis, Trivy filesystem/configuration, scan de historial de secretos y Dependency Review. Los logs de CI confirman 14/14 pruebas PostgreSQL de auth y 48/48 tests unitarios; compilación y typecheck también pasaron.
- La primera ejecución de PR #111 falló porque la prueba intentó guardar `expires_at` anterior a `created_at`, violando `auth_sessions_check`. Se corrigió el fixture para que ambas fechas fueran pasadas, pero `expires_at > created_at`; la nueva ejecución pasó.
- Se verificó que PR #103 fue fusionada sin reviews/hilos registrados pese a un handoff anterior que pedía esperar revisión Claude/Codex. Se documenta como discrepancia de proceso, no como revisión completada.
- La rama `feat/neon-transaction-adapter` se comparó con main: 14 commits ahead, 124 behind; el archivo `database.ts` es idéntico, los tests de main son más completos y la rama usa dependencias/workflow obsoletos. No se fusionó ni borró.
- La prueba HTTP de CORS productivo no pudo repetirse desde este entorno; el acceso web a los endpoints falló. No se cambiaron variables, secretos, Neon ni producción.

---

## Corrección de continuidad — 2026-10-28

- La línea de inventario del checkpoint inmediatamente inferior (“no hay PR abiertas”) describe el instante anterior a abrir la PR #110; ya no describe el estado vivo. La única PR abierta identificada en el inventario reciente es #110, HEAD `c3acfdd79be7ea3b490651eeab3ccf01402309ef`.
- La PR #104 fusionó `docs/AI_COLLABORATION_AND_PR_POLICY.md`; la política ya no es una propuesta pendiente de merge.
- La PR #103 fue fusionada en `375226b50b82eb51b795089b813b6d7879c8bd0f`. El handoff anterior decía que debía permanecer abierta hasta revisión Claude/Codex; no se encontró evidencia de una review completada antes del merge en los registros consultados. No presentar ese merge como aprobación independiente. El pendiente de CORS ahora es verificar el comportamiento HTTP real del Worker, no volver a integrar el mismo diff.
- En la PR #110, Codex indicó que no pudo completar la revisión por límite de uso; el listado de reviews está vacío. Checks verdes no equivalen a esa revisión.
- La protección de `main` no pudo consultarse desde el conector (403), y la documentación contiene dos afirmaciones incompatibles sobre el número de aprobaciones requeridas. Resolver la discrepancia mediante evidencia autorizada; no saltarse el gate.
- El respaldo tiene una corrida de cifrado/subida exitosa, pero la restauración real sigue sin probarse. `docs/BACKUP_AND_RECOVERY.md` conserva un estado antiguo contradictorio; corregirlo tras verificar el procedimiento y evidencias de restauración.

---

## Verificación de continuidad — 2026-10-28 (estado vivo de GitHub)

- HEAD de `main`: `740afcd1ac122dc60fc98477273112ae831f0e46` (commit firmado: `security: move CI and Pages builds to patched Node.js 24 LTS`).
- PR abiertas: la consulta directa `GET /repos/BTF14/Micro-app/pulls?state=open&per_page=100` devolvió `[]`. No hay PR abiertas en esa consulta.
- PR #102 está fusionada en `b667dec03ff14d97b8fae571477ab69409e119b1`; PR #103 está fusionada en `375226b50b82eb51b795089b813b6d7879c8bd0f`. PR #105 está cerrada sin fusionar; su rama `chore/lockfile-regen-result` contiene cambios de runtime que ya aparecen en `main`, por lo que no debe reabrirse para volver a integrar código duplicado.
- En el SHA actual de `main`, los seis checks obligatorios de protección están en `success`: `verify`, `Chromium authentication smoke tests`, `JavaScript and TypeScript static analysis`, `Scan tracked files and reachable Git history`, `Trivy filesystem and configuration scan` y `postgres-migration`. También terminaron en success los checks de Cloudflare Pages y Workers Builds.
- Dos estados de commit de Vercel (`Vercel – micro-app-7lg5` y `Vercel – micro-app`) están en `failure` con mensaje explícito `Deployment rate limited — retry in 24 hours`. No forman parte de los seis contextos obligatorios leídos en la protección de rama; son fallos de límite de despliegue de Vercel, no fallos de los checks obligatorios.
- `package.json` declara Node `>=24.22.1 <25`; `.node-version` fija `24.22.1`; CI y Playwright usan Node 24 y pnpm 10. El lockfile v9 fija `undici@7.30.1` por override, y Miniflare lo consume transitivamente. Las entradas del lockfile indican que undici requiere Node `>=20.18.1`, Vitest 5.0.5 acepta Node 24, y Wrangler 4.151.1 / Miniflare 5.20261012.1-beta declaran Node `>=22`. Playwright E2E usa el runner y la imagen de navegador ambos en `1.55.0`. Esto demuestra compatibilidad declarada en metadatos, no sustituye una instalación local reproducible.
- El check `Chromium authentication smoke tests` del SHA actual pasó; el test de integración PostgreSQL forma parte del workflow `verify`, que también pasó. En el flujo OAuth, las cuentas existentes sin `google_sub` son rechazadas como `identity_unlinked` antes de crear sesión; una identidad enlazada debe coincidir con el `sub` y tener usuario/membresía/organización activos. Solo el bootstrap de un solo uso puede crear el primer usuario y sesión. La prueba de integración comprueba que la cuenta heredada mantiene `google_sub = null`, no se crea cookie ni sesión persistida.
- La configuración CORS en código limita el origen al `FRONTEND_ORIGIN` canónico y falla cerrada si falta o es inválido; PR #103 añadió preflight autorizado y rechazo de origen externo. No se verificaron aquí las cabeceras HTTP del Worker productivo. Esa verificación no aparece entre los seis gates obligatorios, por lo que no es requisito automático de merge; sí sigue siendo evidencia operativa útil para confirmar el binding real en Cloudflare.
- **Limitación de evidencia:** el conector GitHub rechaza las rutas de Dependabot alerts/dependency graph/code scanning como endpoints no permitidos, así que el número actual de alertas abiertas no se pudo verificar. No afirmar que Dependabot está limpio basándose solo en el lockfile o en Trivy; el workflow Trivy actual declara `exit-code: '0'`, por lo que sus checks verdes no garantizan ausencia de vulnerabilidades.
- No se ejecutaron comandos localmente en este entorno. No se modificaron secretos, configuración de producción ni datos de Neon, y no se hizo despliegue manual. No se fusionó ninguna PR durante esta verificación.

---

## 2026-10-28 — Verificación HTTP de Preview y CI de PR #106

- PR #106, HEAD `1d47a474351bb14f9f5e14283beec789356bafe3`: checks consultados todos en success.
- Build/test local en sandbox con pnpm 10: suite web normal 6/6; build Preview correcto; test dedicado Preview 1/1; CSP y bundle del build Preview sin URL productiva; build de producción correcto y conserva URL productiva.
- HTTP real de Cloudflare Pages branch Preview: HTTP 200; `Content-Security-Policy` contiene `connect-src 'self'` y no permite el Worker productivo.
- PR #106 fue fusionada por squash el 2026-10-28 en `main` (commit `d5d99b3a5184d6aad36ffd9a44ff34a62346dc94`) tras autorización explícita. Cloudflare Pages y Workers Builds reportaron éxito; la API pública `/health` respondió `status: ok`. No se tocaron secretos, variables/bindings ni Neon.

---

## 2026-10-25 (noche) — Bug de variables autoborradas resuelto; logout móvil arreglado (PR #82)

- Tras fusionar PR #81, el login volvió a romperse (`GOOGLE_NOT_CONFIGURED`, fallos de CORS) pese a no haber tocado `apps/api`. Causa raíz identificada: `wrangler deploy` sincroniza las variables planas (no "Secreto") del Worker contra `[vars]` en `apps/api/wrangler.toml`; cualquier variable puesta solo a mano en el dashboard de Cloudflare y no declarada ahí se borra en el siguiente deploy, sin importar qué cambió. `FRONTEND_ORIGIN`, `GOOGLE_REDIRECT_URI` y `GOOGLE_CLIENT_ID` nunca estuvieron en el archivo.
- El usuario volvió a agregar las dos primeras a mano en el dashboard (confirmado por capturas) y proporcionó el valor del tercero (client ID, no es secreto). Se declararon los tres en `wrangler.toml` (PR #82, merge `f274d32a359dbba8e401897a41294fda1f33cbf8`) para que ningún deploy futuro los vuelva a borrar.
- En paralelo se encontró y confirmó por commit ya existente en el working tree (`a2b338f`, hecho en un tramo de esta misma sesión) un fix para que el botón de "Cerrar sesión" sea alcanzable en pantallas de teléfono (antes solo vivía en un panel lateral oculto por CSS debajo de 760px). Se completó la rama agregando el fix de `wrangler.toml`, se abrió/actualizó PR #82, se verificaron los 12 checks en el head final y se fusionó.
- Verificación visual confirmada por el usuario: el login funciona de extremo a extremo en su teléfono real, mostrando el panel de "Abasto 7 de Oro".
- Con esto, no queda ningún pendiente conocido de identidad/infraestructura. Detalle completo en el checkpoint vigente de `docs/CURRENT_STATE.md`.

---
## 2026-10-25 (tarde) — Primer login real completado; UI de login arreglada (PR #81)

- Se verificó contra Neon `main` que el bootstrap administrativo ya se consumió exitosamente: organización "Abasto 7 de Oro" (`abasto-7-de-oro`) y usuario owner `btfcasheb@gmail.com` existen, con `google_sub` vinculado y `auth_bootstrap.consumed_at` sellado. Detalle completo, IDs exactos y el patrón SQL para agregar más usuarios a `auth_allowlist` están en el checkpoint vigente de `docs/CURRENT_STATE.md`.
- Se diagnosticó por qué el primer intento de login pareció fallar silenciosamente: el frontend nunca leía `?auth_error=` de la redirección de `GET /auth/google/callback` y seguía mostrando el formulario de contraseña ya retirado en el backend (decisión D4). Se encontró un diff ya escrito localmente (no commiteado, de un trabajo previo de esta misma sesión antes de un corte de contexto) que resolvía exactamente esto; se revisó, se completó (el E2E de Playwright todavía probaba el formulario de contraseña eliminado, se reescribió), se abrió PR #81 y se fusionó tras verificar los 12 checks en el head exacto `117cb1c` (incluido el smoke test de Chromium).
- Merge commit `441bdc463954aba1069cfeae9227bf75a562a53a`. Cloudflare Pages se redeployó automáticamente.
- No se pudo correr `pnpm test`/`pnpm install` en este sandbox (DNS de `registry.npmjs.org` no resuelve pese a figurar en `no_proxy`); se verificó exclusivamente vía GitHub Actions en el SHA final, documentado explícitamente en el PR y en el checkpoint.
- Pendiente para la siguiente sesión: confirmación visual del usuario de que el panel autenticado carga correctamente; luego, iniciar el módulo real de negocio (inventario/productos/tasa BCV), ya que todo lo construido hasta ahora es solo identidad e infraestructura.

---
## 2026-10-20 — PR #71 y diagnóstico de API Vercel

- PR #71 (feat/tenant-context-resolver) sigue abierta/draft; head revisado a4806b69a2d12225234e7a8fc72c1116957d0318, base observada 832c9d10b19846f89cc5d9e5ef51b7ef6eb5b21e. Revalidar al retomar.
- Seis workflow runs identificados para ese head terminaron en failure: progress dashboard, migration validation, CI, Semgrep, Security scan y Playwright E2E. En reintentos revisados, jobs no tenían runner ni steps; logs devolvían 404 BlobNotFound. Causa de asignación de runner desconocida; no afirmar fallo del código.
- Smoke harness aislado de lógica del resolver: 3/3; TypeScript estricto contra interfaz mínima: pasó. No es la suite real del repo.
- Vercel API deployment dpl_HpAA28eKdVdWgsfMypeVuybsBhhz muestra ERR_MODULE_NOT_FOUND para apps/api/src/auth importado desde apps/api/src/index.js; proceso Node sale con código 1. Build de Vercel figura completado, por lo que el fallo observado es runtime. Causa exacta/corrección aún sin verificar.
- Usuario reporta 7 checks con error en UI; consulta de workflow runs recuperó seis. Identificar el séptimo en la siguiente sesión antes de actualizar el conteo.
- Se preparó checkpoint/handoff con evidencia, límites y secuencia. No se tocó Neon main, no se desplegó producción, no se manejaron secretos ni datos reales.
- Próximo: mantener PR #71 draft; revalidar checks/runner; reproducir y corregir runtime en rama/PR tras inspeccionar configuración/entrypoint y confirmar destino arquitectónico (Workers vs Vercel). Sin merge/deploy de producción.

---
## 2026-10-19 — Corrección de formato en checklist de preparación

- Se corrigió en `docs/PRODUCTION_READINESS.md` un `\\n` literal que unía visualmente el criterio ya verificado del bloqueo de registro con el siguiente criterio pendiente de Google sign-in.
- El cambio es solo documental: no altera el estado de los gates ni la preparación para producción.
- PR: https://github.com/BTF14/Micro-app/pull/61 — abierta, pendiente de checks; no fusionada.
- Verificación: releída la versión de la rama y confirmado que el separador es un salto de línea real y que el `\\n` literal ya no aparece en ese punto.
- Sin cambios en runtime, base de datos, secretos, datos reales, Neon ni despliegues.

## 2026-10-19 — Registro público bloqueado fail-closed (PR #57)

- `main`: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`; PR #57 fusionada.
- `POST /auth/register` valida Origin y luego devuelve `503 REGISTRATION_DISABLED` antes de leer el body, acceder a PostgreSQL, escribir rate limits/usuarios/organizaciones/membresías/sesiones o emitir cookie.
- La prueba PostgreSQL verifica ausencia de usuarios, organizaciones, membresías, sesiones y hashes de rate-limit en el camino bloqueado. Login/sesión existente se prueba con un usuario/organización sintéticos sembrados directamente en la base efímera.
- Checks de PR head `71d3e6d3ffe625b12807e9942ddd261e222cf093`: verify, Chromium auth smoke, PostgreSQL migration, JS/TS analysis, Trivy, Cloudflare Pages preview y generate-progress en success. Checks consultados en merge SHA también en success. No se ejecutaron pruebas locales.
- Issue #53 permanece abierto: Google sign-in + allowlist y D1–D8 no están implementados/aprobados. La medida es temporal y fail-closed.
- Revisión rama `feat/neon-transaction-adapter` vs main `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`: divergida 14 ahead / 76 behind; merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`. `database.ts` y security workflow son idénticos; test file más viejo, script `vitest run` no respeta exclusión de integración, documentos obsoletos. No merge.
- No se tocaron Neon main, secretos, datos reales, billing ni emails. No se afirma despliegue productivo.
- App sigue NO lista para producción; matriz de roles y flujos comerciales aún pendientes.

---

## 2026-10-19 — Checkpoint tras PR #55

- `main` verificado: `b7117f8aeb868e25c49db86a524405511cd3c9be`; PR #55 fusionada.
- PR #55: https://github.com/BTF14/Micro-app/pull/55, checkpoint documental después de PR #54.
- Head probado `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28`: 8 check-runs en success (Cloudflare Pages preview, Trivy dos ejecuciones, análisis estático JS/TS, verify, postgres-migration, Chromium authentication smoke tests y generate-progress).
- No se ejecutaron pruebas localmente; los checks citados son del head de PR, no verificación independiente del merge SHA. No se desplegó producción ni se modificó Neon `main`.
- No hay PR abiertas en la consulta actual.
- Issue P0 #53 sigue abierto. El registro público carece de política de identidad Google + allowlist demostrada; D1–D8 y matriz de roles siguen pendientes de decisión humana.
- Strix continúa documentado, no instalado ni ejecutado. Sin secretos, emails, billing, datos reales ni Cantina-pos.
- Próximo paso: continuar análisis seguro de auth y revisión de rama divergida; pedir al usuario decisiones concretas de identidad/roles cuando sean necesarias. La app no está lista para producción.

---



## 2026-10-19 — Verificación tras PR #31 y continuidad

- `main` verificado: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56`.
- PR #30 y #31 están fusionadas. PR #31 añadió pruebas de integración para negar `/auth/me` y `/auth/login` cuando la organización está inactiva aunque la membresía siga activa.
- GitHub Actions para el SHA exacto de main: 6 de 8 check-runs visibles terminaron en success; 2 seguían in_progress al momento de la consulta. Verificar de nuevo el SHA y Actions antes de afirmar CI verde. Los enlaces y nombres están en el checkpoint superior de `docs/CURRENT_STATE.md` y `docs/HANDOFF_NEXT_CHAT.md`.
- PR #32 está abierta para revisión documental. No se ejecutaron tests localmente.
- Bloqueos siguen vigentes: handlers comerciales inexistentes, Google OAuth/allowlist y D1–D8 pendientes, matriz de roles sin aprobación, backups/restauración independiente sin verificar, app no lista para producción.
- No hubo cambios en Neon `main`, datos reales, secretos ni despliegues.
- Próximo paso: evitar PR de checkpoint repetidas salvo que la continuidad lo necesite; priorizar revisión de seguridad/código y pruebas aisladas que no dependan de inventar decisiones de identidad/roles. Preparar documentación de handoff antes de que se agote el contexto.
## 2026-10-18 — Revisión del adaptador Neon y reconciliación de política

- `main` revisado: `c782625364cacbe94ac6ef7ef2ea091e7d960eb3`; rama comparada: `feat/neon-transaction-adapter`.
- Comparación en vivo: rama divergida, 14 commits propios y 49 commits detrás de `main`; merge-base `2d2099245f2404b0a8d3689189235a577d5e632c`.
- Los siete archivos del diff fueron revisados por contenido. `.github/workflows/security-scan.yml`, `apps/api/src/database.ts` y `apps/api/src/database.test.ts` son idénticos al contenido actual de `main`; no aportan código nuevo.
- `apps/api/package.json` en la rama cambia `test` a `vitest run`, que incluiría los tests de integración que requieren PostgreSQL; la configuración actual separa esos tests y CI ya los ejecuta explícitamente. No copiar el cambio sin reconciliar el entorno local/CI.
- `docs/API_INTEGRATION.md`, `docs/COMPLIANCE_REQUIREMENTS.md` y `docs/SECURITY_PLAN_2026.md` son versiones antiguas respecto de `main`; no sobrescribir los documentos actuales con ellas.
- Conclusión: no fusionar la rama completa; no se encontró implementación única que justifique resolver la divergencia de 49 commits. Mantenerla como referencia histórica hasta que aparezca un cambio concreto que pueda rescatarse por separado.
- Corrección documental: `docs/RESOURCE_REGISTRY.md` decía que Neon `main` era solo lectura, en contradicción con `AGENTS.md` y `docs/CONSTITUTION.md`. La política correcta es producción-sensible con gate de cambio, no prohibición permanente.
- Sin cambios a Neon, sin secretos, sin pruebas locales ni despliegue.

---

## 2026-10-18 — Checkpoint después de PR #27

- PR #27 fusionada: https://github.com/BTF14/Micro-app/pull/27
- Merge commit / `main`: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- El head de PR #27 `29f899a52346d342067cf8e1b22850d35aa48a69` y el merge commit de `main` fueron verificados en GitHub Actions; los checks consultados terminaron en `success`.
- Enlaces de los checks del merge commit: [Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812), [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No se ejecutaron pruebas locales, no se desplegó producción y no se modificó Neon `main`.
- Bloqueo técnico vigente: todavía no hay handlers HTTP de negocio; no añadirlos hasta definir y probar permisos por rol/organización. D1–D8 de identidad siguen pendientes. Strix solo está documentado.
- Próximo paso: revisar el adaptador Neon divergido y preparar una matriz de permisos operativa sin asumir decisiones de identidad.

---

# Diario persistente de estado, decisiones y verificaciones

Este diario es append-only en cuanto a historia: no borrar hitos antiguos; añadir una nueva entrada por sesión o checkpoint. El estado actual está en la parte superior del plan maestro y del handoff.

## 2026-10-18 — Revisión de continuidad y agentes

### Estado Git verificado
- Repositorio: https://github.com/BTF14/Micro-app
- Rama principal: `main`
- SHA observado: `8574bef7c5bc38cb85e55007816b6efc8b54a826`
- Últimos commits de documentación: `632ca1ed7600c888db3f38516debe85ac8053723` (plan) y `8574bef7c5bc38cb85e55007816b6efc8b54a826` (handoff).
- Ramas observadas: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/neon-transaction-adapter`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap`, `main`.
- Rama de adaptador: `feat/neon-transaction-adapter` en `7989a84e39536029819735a5202f3934a8eb12c3`; no fusionada automáticamente.

### GitHub Actions comprobadas
- CI: https://github.com/BTF14/Micro-app/actions/runs/39102311090 — success.
- Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39102311097 — success.
- Security scan: https://github.com/BTF14/Micro-app/actions/runs/39102311100 — success.
- Estos resultados corresponden al SHA de documentación indicado, no a un test manual local ni a una garantía de seguridad absoluta.

### Código/estado que se observó
- El commit `88d30d472905c81a90d9fffc967e3ba1df5084d1` conecta registro/login del frontend con la API.
- `pnpm-lock.yaml` existe en main y el workflow CI usa `--frozen-lockfile`.
- El workflow CI levanta PostgreSQL 18 efímero, aplica la migración, ejecuta build, unit tests y `src/auth.integration.test.ts`.
- El workflow de migración prueba la migración y constraints cross-tenant contra PostgreSQL desechable.
- Los documentos anteriores contenían contradicciones: `API_INTEGRATION.md` dice que el frontend no está conectado; revisar y corregir esa frase en un siguiente commit. La continuidad vieja también referenciaba un SHA anterior a los documentos.
- No hay evidencia en esta comprobación de que exista un sistema que lance subagentes autónomos en segundo plano. Se agregan perfiles de agentes reutilizables para entornos compatibles y un protocolo para no fingir ejecuciones.

### Decisiones y límites
- Mantener presupuesto $0, proyecto independiente de Cantina-pos y otros proyectos.
- No aplicar migraciones ni SQL mutante a Neon `main`; utilizar PostgreSQL efímero o una rama de prueba aislada.
- No desplegar producción ni hacer cambios irreversibles sin aceptación.
- No publicar secretos ni cadenas de conexión.
- No fusionar `feat/neon-transaction-adapter` sin revisar diff, sincronización y pruebas.

### Próximos pasos ordenados
1. Revisar y actualizar la frase obsoleta en `docs/API_INTEGRATION.md` y reconciliar todos los documentos que afirman que el frontend no está conectado.
2. Comparar `feat/neon-transaction-adapter` con el SHA actual de main, revisar archivos/diff y separar cambios rescatables de cambios incompatibles; preparar PR solo después de CI y revisión.
3. Revisar las pruebas de autenticación actuales para cobertura de allowlist, roles, aislamiento tenant, revocación, fallos de DB y rate limits; no confundir test existente con cobertura completa.
4. Seguir con pruebas de transacciones PostgreSQL e inventario/idempotencia, sin Neon main.
5. Actualizar este diario, plan y handoff después de cada checkpoint y comprobar Actions por SHA exacto.


## 2026-10-18 — Corrección del snapshot de CI
- Último SHA consultado antes de esta actualización: `995608af8584442a9f174f9cf55ed7861749b872`.
- Ejecuciones para ese SHA: CI `39102649341` pending, migración `39102649354` pending, seguridad `39102649347` queued.
- El SHA anterior `8574bef7c5bc38cb85e55007816b6efc8b54a826` tenía los tres workflows en success.
- Este commit cambia solo documentación; comprobar las ejecuciones del nuevo HEAD antes de informar de estado final.


## 2026-10-18 — Revisión separada de identidad/seguridad
- Código revisado: `apps/api/src/auth.ts` (blob `0735dbad34bd5c932852882da0bff6eebbab337a`) y `apps/api/src/auth.integration.test.ts` (blob `263ac57a536d5c136beab0baadadb2d6c64aadb5`).
- Endpoints hallados: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- En el archivo de auth no se encontraron referencias a Google OAuth, allowlist ni verificación de email. El test de integración contiene un caso principal de registro/login/consulta/revocación; no acredita toda la matriz de permisos.
- Hallazgo P0: reconciliar el código de auth con el requisito de Google + allowlist previamente acordado. Mantener la regla de que solo el usuario autoriza el envío de correos. No implementar un proveedor ni modificar el modelo de identidad por suposición.
- Esta revisión de archivos no es una prueba ejecutada; esperar CI de Actions para el SHA vigente y ampliar pruebas antes de cerrar el hallazgo.


## 2026-10-18 — Continuidad, evaluación Gentleman-Programming y estado Actions

- HEAD de `main` verificado: `12c0037f3928b2c54c3593d3f48a65bf3318f401`.
- Actions en ese SHA: CI run 39102740451 = success; Database migration validation run 39102740448 = success; Security scan run 39102740511 = success.
- Las tres ejecuciones corresponden al mismo SHA `12c0037f3928b2c54c3593d3f48a65bf3318f401`. Esto no certifica producción ni ausencia de vulnerabilidades.
- Se revisaron los README actuales de Gentleman-Programming: Gentle-AI, Engram, Gentleman Guardian Angel, Gentle Shell; también README oficial de Playwright.
- Resultado: evaluación documental y protocolo de adopción añadidos a `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`. No se instalaron ni ejecutaron esos proyectos; no hay evidencia de agentes autónomos activos.
- Se añadió un handoff de continuidad con orden de lectura, reglas anti-alucinación, prompt copiable y límites de seguridad/coste.
- Ramas verificadas: `feat/neon-transaction-adapter` = `7989a84e39536029819735a5202f3934a8eb12c3`; `feat/auth-session-foundation` = `3ac714ab0c5553c05bb73faa7046c8dead150121`; `feat/frontend-auth-flow` = `78aa6efbc81b072b57cec3ede514f41190fef713`; `feat/tenant-safe-schema` = `d4a6f7ac26ea8a56f0ee5b50bb1df2196a76a233`; `fix/pnpm-lockfile-bootstrap` = `49c4604b8d760a56598a4089c79d8cd0008b8395`.
- P0 vigente: identidad actual no muestra Google OAuth/allowlist/verificación email en `apps/api/src/auth.ts`; revisar y probar antes de declarar lista.
- Próximas tareas: diff completo de rama Neon adapter, resolver diseño de Google + allowlist con evidencia, ampliar tests, luego avanzar módulos de producto según plan. No migrar Neon main ni desplegar producción.


## 2026-10-18 — Integración inicial de Gentleman-Programming

- Commit: `ae0c189487b37d910184b0b5cfa058ddbb6919d4`.
- Cambio observable en GitHub: se añadió `.gga` para revisión local con `ollama:qwen2.5-coder`, guía `docs/GENTLEMAN_IMPLEMENTATION.md` y enlace desde README.
- No se instaló ni ejecutó GGA/Ollama/Engram/Gentle-AI; no se activó ningún hook local. Esto no debe describirse como integración en ejecución.
- CI, migration-check y security scan estaban en curso para el SHA de implementación cuando se escribió esta entrada; ver handoff para enlaces y revalidar en vivo.
- Próximo paso: verificar resultados exactos de Actions y completar una prueba aislada de herramientas en un entorno que disponga de terminal/runtime, sin costes de API ni datos sensibles.


## 2026-10-18 — Piloto de herramientas investigadas en rama `feat/security-e2e-tooling`

- Añadidos en GitHub: `apps/web/playwright.config.ts`, `apps/web/e2e/auth.spec.ts`, `.github/workflows/playwright-e2e.yml`, `.github/workflows/semgrep.yml`, `docs/OWASP_ASVS_CHECKLIST.md` y `docs/POS_REFERENCE_MATRIX.md`.
- Playwright cubre login de navegador y error de registro con respuestas de API simuladas; no valida backend real ni Google OAuth. El workflow instala temporalmente `@playwright/test@1.55.0`; pendiente fijar dependencia y lockfile en workspace.
- Semgrep analiza JavaScript/TypeScript y genera SARIF como artefacto; todavía no se han consultado los resultados de Actions.
- El checklist ASVS deja los controles sin marcar por defecto; no se afirma certificación. La matriz POS convierte referencias en criterios de aceptación sin copiar código.
- No se instaló CodeQL, Casbin, express-rate-limit, ZAP ni Juice Shop. CodeQL requiere revisar permisos/coste del repositorio privado; ZAP requiere una preview de prueba aislada; Juice Shop es únicamente laboratorio. No hay despliegue ni cambios en Neon.
- Próximo paso: abrir/revisar PR y comprobar los workflows por SHA exacto. Si falla la instalación o los selectores Playwright, corregir antes de marcar la integración como validada.


## 2026-10-18 — Verificación CI de la integración E2E/seguridad

- SHA probado: `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582` en `feat/security-e2e-tooling`.
- CI: success — https://github.com/BTF14/Micro-app/actions/runs/39104699632
- Database migration validation: success — https://github.com/BTF14/Micro-app/actions/runs/39104699591
- Security scan / Trivy: success — https://github.com/BTF14/Micro-app/actions/runs/39104699568
- Semgrep SAST: success y artefacto SARIF creado — https://github.com/BTF14/Micro-app/actions/runs/39104699596
- Playwright E2E: success; Chromium ejecutó los dos flujos con API simulada — https://github.com/BTF14/Micro-app/actions/runs/39104699653
- Interpretación: la ejecución confirma que workflows y pruebas funcionan en ese SHA. No equivale a certificación de seguridad, no prueba OAuth/allowlist ni la API real, y no cambia el estado de despliegue. Playwright sigue sin ser dependencia permanente del workspace/lockfile.


## 2026-10-18 — PR #6 fusionado

- PR https://github.com/BTF14/Micro-app/pull/6 se fusionó con squash.
- Commit de `main`: `dfe6d3efce5eddc10c25c42642faf5ea8b44eedb`.
- En el head previo a la fusión `df84d056d3edbc2191ac0fd34a39e18f3632ce03`, CI, migración, Trivy, Semgrep y Playwright E2E terminaron en success.
- Se lanzaron workflows nuevos sobre el commit de merge; verificar sus resultados por SHA antes de afirmar que `main` está verde.
- Límites que permanecen: Playwright runner no está fijado en `pnpm-lock.yaml`; E2E usa API simulada; Google OAuth/allowlist sigue siendo P0; no hubo despliegue ni migración en Neon.


## 2026-10-18 — Constitución e índice documental centralizados

- Se creó `docs/CONSTITUTION.md` como norma rectora: coste $0, separación de proyectos, protección de Neon main, no despliegue de producción sin aceptación, identidad/allowlist, aislamiento tenant, integridad de inventario/ventas, tasa BCV, cumplimiento fiscal, evidencia de pruebas y adopción responsable de herramientas.
- Se añadió al inicio de `docs/PROJECT_PLAN.md` un índice maestro y snapshot. La búsqueda de commits observó `main` en `7863973ed6e3869f525c6c89fc16412e92158fc2`; la consulta de status checks devolvió una lista vacía, así que Actions para ese SHA queda **no verificado**.
- README y handoff enlazan la constitución; el plan agrupa documentos de producto, arquitectura, datos, cumplimiento, seguridad, recursos, workflows y perfiles reutilizables.
- Se conservaron las secciones históricas del plan, handoff y diario; no se borraron hitos. Los snapshots antiguos quedan sujetos a verificación en vivo.
- Rama de trabajo: `docs/constitution-and-plan-index`. Cambio documental solamente. No se desplegó producción ni se ejecutó SQL/migración en Neon main.
- Verificación: lectura de archivos de GitHub y actualización mediante GitHub Contents API. No se ejecutaron pruebas de código en esta tarea; verificar Actions para el SHA final después del PR/merge.


## 2026-10-18 — Flujo SDD y perfiles de agentes

- PR #8 de panel de progreso fusionado en `main` con commit `449fc328bff4ffafd6b6a46c0e539ac85cbd9ebf`; los seis workflows consultados para el SHA del PR `94445d8cdbe37d3bde4eb1fa1c7f878ee75920ee` concluyeron `success` (CI, migración, Trivy/security, Semgrep, Playwright E2E y dashboard). Esos checks no certifican preparación para producción.
- Rama de trabajo actual: `feat/sdd-agent-workflow`, basada en el commit de merge anterior.
- Añadidos proceso SDD, plantillas spec/plan/tasks, skill feature-sdd y perfiles de explorador, planificador, implementador, revisor y documentación.
- No se ha instalado ni conectado desde este chat GGA, Ollama, Engram, Gentle-AI ni un runtime MCP; los perfiles son instrucciones versionadas, no agentes en ejecución.
- Próxima validación: comprobar workflows para el HEAD final de esta rama y abrir PR si pasan. No se modificó Neon main ni se desplegó producción.


## 2026-10-18 — Verificación de SDD y perfiles de agentes (PR #9)

- Rama: `feat/sdd-agent-workflow`; HEAD verificado para los checks: `68659d1c1ec0cb9996293f78f9bd487e95124bbf`.
- PR: https://github.com/BTF14/Micro-app/pull/9. En el momento de esta entrada sigue pendiente de integración; no asumir que su contenido ya está en `main`.
- Workflows para ese SHA: CI run `39107162916` = success; Database migration validation `39107162946` = success; Security scan `39107162853` = success; Semgrep SAST `39107162777` = success; Playwright E2E `39107162871` = success; Project progress dashboard `39107164456` = success; SDD and agent documentation validation `39107162905` = success.
- Se añadieron flujo SDD, plantillas de spec/plan/tasks, skill reutilizable, perfiles Explorer/Planner/Implementer/Reviewer/Documentation y validador/workflow de documentos.
- La validación automatizada verifica estructura documental, no demuestra que existan subagentes autónomos ni que GGA/Engram/Gentle-AI/MCP estén instalados. Playwright actual utiliza mocks y no demuestra integración real con PostgreSQL/Neon.
- Próximos pasos: verificar mergeability y estado vivo del PR #9; tras integración, comprobar SHA de merge y Actions sobre ese SHA; después resolver la generación/actualización automática de los artefactos del dashboard y continuar con los bloqueos P0 de identidad/autorización y transacciones.
- Restricciones conservadas: $0, sin mutar Neon `main`, sin despliegue de producción.


## 2026-10-18 — PR #9 fusionado y SDD/continuidad versionados en main

- PR #9: https://github.com/BTF14/Micro-app/pull/9 — estado verificado `merged`.
- Merge commit (squash): `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`.
- Checks del HEAD del PR `ba1eebbe45b11e6e0b3562795cdb6c26b5c31c63`: CI `39107363677` success; Database migration validation `39107363637` success; Security scan `39107363647` success; Semgrep `39107363624` success; Playwright E2E `39107363688` success; SDD validation `39107363683` success; dashboard `39107363673` success.
- La integración contiene SDD, plantillas, skill, perfiles reutilizables, validador de documentación y actualización de handoff/protocolo para nuevas IA.
- Próxima verificación pendiente: Actions asociadas al commit de merge y coherencia final del handoff en `main`.
- Límites: ningún agente local se ha instalado por este merge; no se mutó Neon `main`, no se desplegó producción y el objetivo de coste sigue en $0.


## 2026-10-18 — Política de cambios controlados en Neon `main`

- Decisión documental: reemplazar la prohibición absoluta de mutaciones en Neon `main` por una autorización condicionada a necesidad demostrada, identificación inequívoca del destino, revisión de SQL/migración, pruebas aisladas cuando sean viables, recuperación comprobable y validación posterior.
- Los cambios aditivos, compatibles, de bajo riesgo y recuperables pueden ejecutarse autónomamente tras superar el gate. Cambios destructivos, irreversibles/difíciles de revertir, masivos sobre datos críticos, de permisos/credenciales, con riesgo material de indisponibilidad o impacto incierto requieren aprobación explícita previa del usuario.
- Si no se puede confirmar destino, impacto o recuperación, detenerse; no improvisar ni continuar con incertidumbre.
- Cambios aplicados en esta rama documental: `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/HANDOFF_NEXT_CHAT.md`. No se ejecutó SQL, no se aplicaron migraciones y no se modificó ninguna base Neon.
- Pendiente: revisar diff y validaciones CI en PR antes de integrar. La actualización de la política no demuestra que exista un backup ni que la restauración esté configurada; eso deberá verificarse antes de cualquier mutación real.


## 2026-10-18 — Política de backup diario y revisión quincenal

- Fuente oficial de Neon consultada: https://neon.com/docs/postgres/backup-restore/history-window y https://neon.com/docs/introduction/plans. La documentación indica que el plan Free tiene hasta 6 horas de historial PITR (máximo 1 GB de historial), una snapshot manual y no ofrece snapshots programadas. Confirmar límites en la consola antes de depender de ellos.
- Se creó `docs/BACKUP_AND_RECOVERY.md` con requisitos de cobertura, retención, cifrado, control de acceso, restauración aislada, alertas y límites de coste.
- Objetivo recomendado: backup lógico diario automático a destino independiente privado/cifrado con retención limitada; revisión de salud y recuperación cada 15 días. No generar copias diarias en GitHub ni almacenar dumps con datos reales en el repositorio.
- Estado real: política documental solamente. No se configuró backup, no se descargaron datos, no se modificó Neon y no se probó restauración. El destino independiente gratuito, la automatización y los secretos aún deben diseñarse y verificarse antes de activar.
- Se actualizan instrucciones de agentes, constitución, cumplimiento, handoff y checklist de producción para que las IA no asuman ni inventen que los backups están activos.
- PR #13 fue fusionada en `3d8b571f1d6ed3478bf3cf6182c412d3282db586`; siete workflows terminaron en success para el HEAD del PR `e03d224f8aded9534db375068f3ae5cac0db8a60`. No se afirma aquí que los checks del merge SHA estén verificados.


## 2026-10-18 — PR #14 fusionada y evaluación de Google Drive

- PR #14 fusionada en `main`: `9480f84d8b7d28e830d0fd57212d29a75e44afbb`.
- Los siete workflows consultados para el HEAD exacto de PR #14 `b421e74631db3c21addd032f2bfbd780b935585d` concluyeron en `success`. No inferir de ello que se probaron backups ni restauración.
- Evaluación externa documentada en `docs/GOOGLE_DRIVE_BACKUP_EVALUATION.md`: Drive personal puede funcionar condicionado a espacio disponible, OAuth duradero, secreto seguro, coste $0 y pruebas de recuperación. Los 15 GB se comparten entre Gmail, Drive y Photos; cuentas de servicio no pueden poseer archivos de My Drive y no tienen cuota de almacenamiento propia. Fuente oficial: https://developers.google.com/workspace/drive/api/guides/about-sdk, https://developers.google.com/identity/protocols/oauth2, https://support.google.com/drive/answer/9312312?hl=en-en.
- Estado sin cambios en servicios reales: no backup activo, no restore probado, no acceso ni espacio Drive verificado, no credenciales creadas, no datos reales descargados, no SQL/migración y no despliegue.
- Decisión: no implementar aún el workflow con datos reales. Próximo paso seguro es prototipo de backup/restore con PostgreSQL desechable y datos sintéticos; confirmar límites/coste sin activar billing.


## 2026-10-18 — Evaluación de destino de respaldo integrada; backup sigue pendiente

- PR [#15](https://github.com/BTF14/Micro-app/pull/15) fusionada con squash en `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`.
- La evaluación de Google Drive queda documentada como candidata condicional, no como elección ni configuración. No se accedió a cuentas ni secretos, no se descargaron datos reales, no se modificó Neon y no se activó billing.
- Para el SHA del PR `adc636732c24f74d3d6457a93af665647a00e097`, CI, Security scan, Semgrep, Playwright E2E, validación de migraciones y dashboard dieron success. La última consulta mostró workflows del merge SHA en ejecución; verificar en vivo.
- El backup diario externo cifrado, la alerta de fallos y la restauración aislada siguen pendientes. No considerar la política documental como evidencia de ejecución.
- Revisión de continuidad: `feat/neon-transaction-adapter` tiene 14 commits por delante y 31 detrás de `main`; `apps/api/src/database.ts` ya está presente en `main` y coincide con la versión revisada en esa rama. No fusionar rama divergida; inspeccionar/rescatar solo cambios exclusivos que sigan siendo necesarios.
- Próxima prioridad: requisito P0 Google Sign-In + allowlist. PR #12 es diseño solamente y decisiones D1–D8 siguen abiertas; no implementar OAuth ni inventar reglas de acceso antes de resolverlas.


## 2026-10-18 — PR #16 fusionada; revisión de autenticación documentada

- PR [#16](https://github.com/BTF14/Micro-app/pull/16) fusionada por squash; merge SHA `8f3a0316519dd39aded179bb234de316c83bb8ee`.
- Se añadió `docs/reviews/AUTHENTICATION_AUTHORIZATION_GAP_REVIEW_2026-10-18.md`, revisión estática de controles actuales, brechas y secuencia de aceptación. No se cambió código de autenticación, base de datos, secretos ni despliegue.
- Checks del HEAD exacto `e52033d15c4f37ac862d44a5f06097642a95d75d`: CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard, todos `success`. CI: https://github.com/BTF14/Micro-app/actions/runs/39110161670 ; E2E: https://github.com/BTF14/Micro-app/actions/runs/39110161665 ; migraciones: https://github.com/BTF14/Micro-app/actions/runs/39110161643 ; Semgrep: https://github.com/BTF14/Micro-app/actions/runs/39110161698 ; seguridad: https://github.com/BTF14/Micro-app/actions/runs/39110161635 ; dashboard: https://github.com/BTF14/Micro-app/actions/runs/39110161660.
- P0: el registro crea una organización y asigna rol `owner` sin allowlist; no se encontró Google OAuth/allowlist en `apps/api/src/auth.ts`. Es revisión estática, no prueba dinámica ni pentest.
- PR #12 está fusionada como diseño SDD, SHA `a28bbc686c7b1cb9cbe615ef5bcb9c7ece45ede3`; D1–D8 siguen pendientes. No implementar OAuth ni reglas de acceso por suposición.
- Sin cambios en Neon, credenciales, datos reales o producción. Backup externo automático y restauración real siguen sin estar configurados/verificados.


## 2026-10-18 — PR #17 fusionada; continuidad y checks verificados

- PR [#17](https://github.com/BTF14/Micro-app/pull/17) fusionada por squash; merge SHA `f196077b1ad5800e287c9f88890439826bdf3f0f`. HEAD de `main` verificado en ese mismo SHA.
- Para el HEAD exacto del PR `a27f05e1e5d17bfb395671d230d1c9b6884e85ca`, los workflows CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard terminaron en `success`; Security scan se ejecutó dos veces y ambas terminaron en `success`. Estos son checks del commit de documentación, no validación de producción.
- El registro público de la API sigue siendo P0: `POST /auth/register` permite crear una organización y asignar rol `owner` sin allowlist. No habilitar usuarios ni datos comerciales reales hasta cerrar el requisito de acceso.
- PR #12 es diseño SDD ya fusionado; decisiones D1–D8 aún no están documentadas como resueltas. Próximo paso seguro: releer el documento fuente de SDD y separar decisiones que ya están respaldadas por requisitos de las que requieren confirmación de producto. No inventar allowlist, administrador, dominios ni política de vinculación.
- La rama `main` no tiene protección de branch configurada según lectura de GitHub (`protected=false`, checks requeridos vacíos). Es una mejora de gobernanza a evaluar, no se cambió en este trabajo.
- Backup externo automatizado, destino independiente, alertas y restauración aislada siguen pendientes. No hay despliegue de producción ni cambios en Neon/secretos/datos reales.


## 2026-10-18 — PR #19 y #20 fusionadas; traspaso entre chats

- PR [#20](https://github.com/BTF14/Micro-app/pull/20) añade documentación de adopción controlada de Strix; merge SHA `c87361685ef1ce36e4cf6025124b09e70ffa0846`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19) añade un registro de opciones para las decisiones D1–D8 de autenticación; merge SHA `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Son opciones propuestas, no decisiones de producto aprobadas.
- HEAD de `main` verificado después de ambas fusiones: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- Para ese SHA exacto, CI, Playwright E2E, validación de migraciones, Semgrep SAST, Security scan y dashboard concluyeron en success: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129579631).
- La documentación de Strix explica propósito, escenarios, requisitos de coste/aislamiento y gates. Strix no está instalado ni ejecutado; no hay escaneo ni informe y no se añadió workflow de Strix.
- Se actualiza el handoff para el cambio de chat debido al límite de duración de la conversación. Las tareas P0 de autenticación/allowlist, pruebas API+DB reales y backup/restore siguen pendientes. No se mutó Neon ni se desplegó producción.


## 2026-10-18 — Verificación viva de PR #21 y bloqueo P0

- GitHub API confirma `main` en `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Rama sin protección activa ni checks requeridos (`protected=false`).
- PR [#21](https://github.com/BTF14/Micro-app/pull/21) permanece abierta, `merged=false`, HEAD `fb9ab271cc8b1c72e92d7874672913698c59bfe7`; no fusionada. Checks del SHA exacto: CI run 39129938686, Playwright E2E 39129938460, migraciones 39129938520, Semgrep 39129938702, Security scan 39129938471 y dashboard 39129938467; todos `success`. El status API clásico devolvió cero checks, por lo que se documentan los workflow runs como fuente de evidencia.
- El bot Codex marcó revisión como fallida/con hallazgos sin resolver, pero la API no devolvió review formal ni comentarios inline y el bot indicó límite de uso. No hay hallazgo técnico concreto reproducible que se pueda corregir; mantener PR sin fusionar hasta revisar el diff y resolver/explicar la señal.
- La lectura actual de `apps/api/src/auth.ts` (blob SHA `0735dbad34bd5c932852882da0bff6eebbab337a`) confirma que el registro por contraseña crea usuario, organización, membresía `owner` y sesión; no se ve Google OAuth ni allowlist. Test `apps/api/src/auth.integration.test.ts` usa PostgreSQL efímero en CI, pero no prueba el requisito OAuth/allowlist ni aislamiento cross-tenant integral.
- D1–D8 continúan sin aprobar. No elegir de forma autónoma correos, dominios, bootstrap, altas de organizaciones ni vinculación de cuentas. P0 continúa abierto; no declarar producción lista.
- Strix solo documentado, no instalado/ejecutado. Sin cambios en Neon, producción, credenciales, datos reales, correos ni facturación.

## 2026-10-18 — Fusión de PR #21

- El usuario autorizó fusionar PR #21 tras verificar los checks. GitHub confirmó la fusión por squash con commit `7491b97a2bde52555fe9b8a5d808ad81b829d90e`.
- Cambios incluidos: únicamente `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/RESOURCE_REGISTRY.md` y `docs/STATE_JOURNAL.md`.
- Los 7 workflows de Actions reportados para el HEAD de la PR terminaron en `success`. La revisión Codex quedó fallida por límite de uso y sin hallazgo técnico concreto recuperable; no tratarla como aprobación.
- Sin despliegue de producción ni cambios en Neon, secretos, datos reales o facturación. Auth/allowlist P0, decisiones D1–D8 y backup/restore verificado continúan pendientes.


## 2026-10-18 — Checkpoint posterior a PR #23 y matriz de aislamiento tenant

- HEAD de `main` verificado: `838715d211918f521f5e6401a91dc773236ef3ad`, merge de [PR #23](https://github.com/BTF14/Micro-app/pull/23).
- Siete workflows sobre ese SHA terminaron en success: CI 39132076336, Playwright E2E 39132076316, Semgrep 39132076300, Security scan 39132076368, validación de migraciones 39132076356, validación SDD/documentación 39132076394 y panel 39132076363.
- Revisión de `apps/api/src/index.ts` y `apps/api/src/auth.ts`: solo están health y endpoints de autenticación; aún no hay handlers HTTP de productos, proveedores, ventas, pagos o movimientos. No se inventaron rutas para fabricar pruebas de aislamiento.
- Se creó `docs/TENANT_ISOLATION_TEST_PLAN.md` con escenarios positivos/negativos por recurso, roles, membresía y sesiones, para ejecutar contra PostgreSQL efímero cuando se implementen los handlers.
- Se actualizó `docs/CURRENT_STATE.md` para reflejar el SHA vivo y distinguir workflows verdes de preparación comercial.
- No se modificó Neon `main`, no se usaron datos reales y no hubo despliegue.
- Bloqueos sin cambios: Google OAuth + allowlist y decisiones D1–D8 pendientes; backups/restauración independiente no verificados; protección de rama no activa en la última consulta.


## 2026-10-18 — PR #24 fusionada y verificación de merge

- Se verificó que PR #24 (`docs: define tenant isolation acceptance matrix`) estaba abierta, mergeable y con los siete workflows en `success` en el head exacto `e7856319321f1aa1047148fd782fcadb77f091c2`.
- Se fusionó mediante squash con protección de SHA esperado; GitHub confirmó merge commit `69032a333b52ee10099c0347be3443e18f4dc4df`.
- En la primera consulta posterior al merge, el panel de progreso terminó en `success`; CI, Playwright E2E, Security scan, Semgrep SAST y validación de migraciones seguían `in_progress`. No se afirma que el SHA del merge esté completamente verde hasta volver a consultar.
- Sin cambios de código de producto, base de datos, Neon ni despliegue. La matriz documenta pruebas futuras, no evidencia de aislamiento en endpoints inexistentes.


## 2026-10-18 — PR #25 fusionada y checkpoint corregido

- PR #25: https://github.com/BTF14/Micro-app/pull/25, merge commit `ed0d39f5bc248c9e5d5a1c5008352e8a390a0374`.
- Head de PR #25 `e5d671ed5087ea18f96d4dead79b76bb933d071d`: siete workflows consultados en `success`.
- Los seis workflows del merge commit `ed0d39f5bc248c9e5d5a1c5008352e8a390a0374` estaban en ejecución en la última consulta; comprobarlos de nuevo antes de informar que el commit de main está verde.
- Se detectaron snapshots antiguos contradictorios en la documentación de continuidad. Se antepone un checkpoint autoritativo que identifica explícitamente los bloques inferiores como históricos y preserva el historial.
- Sin cambios de código, base de datos, secretos o despliegue de producción.


## 2026-10-18 — Verificación posterior a PR #26

- HEAD de `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c`.
- PR #26 fusionada: https://github.com/BTF14/Micro-app/pull/26. No hay PR abiertas en la consulta de GitHub de este checkpoint.
- Para el SHA exacto de `main`, los seis workflows terminaron en `success`: CI (https://github.com/BTF14/Micro-app/actions/runs/39133032751), Playwright E2E (https://github.com/BTF14/Micro-app/actions/runs/39133032760), Security scan (https://github.com/BTF14/Micro-app/actions/runs/39133032817), Semgrep SAST (https://github.com/BTF14/Micro-app/actions/runs/39133032755), validación de migraciones (https://github.com/BTF14/Micro-app/actions/runs/39133032686) y panel de progreso (https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No se ejecutaron pruebas localmente; esta evidencia corresponde a GitHub Actions para el SHA indicado.
- Sin cambios de código de producto, base de datos, secretos o despliegue de producción.
- Estado comercial sigue siendo no listo para producción: faltan endpoints de negocio, OAuth + allowlist con decisiones D1–D8 aprobadas, pruebas completas de aislamiento/autorización y respaldo/restauración independientes verificados.


## 2026-10-18 — Matriz de permisos por rol preparada para decisión

- PR de documentación en preparación desde `docs/role-permission-decision-matrix`.
- Añadido `docs/sdd/role-permission-decision-matrix.md` con las áreas de producto, inventario, ventas, caja, reportes, usuarios y auditoría que necesitan una decisión explícita para `owner`, `admin`, `cashier` e `inventory`.
- Todas las celdas siguen pendientes; no se convirtió una propuesta en política aprobada ni se añadieron handlers comerciales.
- Se enlazó la matriz desde el registro de decisiones de identidad/acceso. D1–D8 de Google OAuth/allowlist siguen independientes y pendientes.
- PR #29 fusionada después de que los ocho check-runs del head `bccae77f66ede9670e4887092ae13749daf39b3b` terminaran en success. Merge commit y `main`: `df9d9b90a8f0e4965d20278cc5825006d9e959aa`.
- Sin pruebas locales, sin cambios de base de datos, sin secretos, sin emails ni despliegue de producción.


## 2026-10-19 — PR #35 y PR #36

- PR #35 fusionada: checkpoint documental tras PR #34; merge SHA `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36 fusionada: validación estricta de formato de hash PBKDF2; merge SHA `c15c2364cd19e55ac10b2331300e7a9f4b89813f`; head SHA validado por CI `cf432de6d5e8752181bc1105e9d0e91384d5936c`.
- Los seis workflows de PR #36 fueron `success` para el head SHA exacto: CI, Playwright E2E, Security scan, Semgrep SAST, Database migration validation y Project progress dashboard.
- No se ejecutaron pruebas localmente. No se desplegó producción ni se modificó Neon `main`.
- El estado post-merge de PR #34 requiere confirmación de SHA exacto: los seis jobs consultados dieron `success`, pero la consulta no expuso metadatos suficientes para asociarlos inequívocamente al merge SHA.
- Bloqueos vigentes: Google OAuth/allowlist y D1–D8 pendientes; matriz de roles pendiente; rutas comerciales completas y E2E API+PostgreSQL no verificadas; backup/restauración independiente sin probar; app no lista para producción.
- Siguiente paso: confirmar Actions del merge SHA `c15c2364cd19e55ac10b2331300e7a9f4b89813f`; continuar pruebas de seguridad pequeñas y documentar resultados exactos. Coste objetivo $0; sin Cantina-pos, secretos, correos, billing, datos reales ni despliegue.


## 2026-10-19 — PR #38 y PR #39

- PR #38 fusionada: pruebas de limpieza de conexión y fallos de rollback; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`; head probado `527dd7cc62bcceae891add8100875cc395dd5cfa`; seis workflows `success` en ese head.
- PR #39 fusionada: prueba de preservación del error original cuando fallan tanto la operación como el cierre del cliente; merge SHA `50c530084f8ce402d897962cbc7c4354c512e847`; head probado `134c9e14a5224d83c5f280dc501ae113d374c159`; seis workflows `success` en ese head.
- No se ejecutaron pruebas locales y no se han verificado aquí los workflows sobre el merge SHA de PR #39. No se modificaron bases de datos ni se desplegó producción.
- La app sigue sin estar lista para producción; continúan bloqueos de identidad/allowlist, permisos, rutas comerciales, E2E real, aislamiento multiempresa y backup/restauración independiente.
- Siguiente: pruebas acotadas de auth/sesión; inspección completa de `feat/neon-transaction-adapter` antes de cualquier merge; coste $0 y respetar todos los gates de producción.


## 2026-10-19 — PR #41 fusionada

- `main`: `3313bf4276563c6cdac52aa7902fa9ea36558014` (https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014).
- PR #41: https://github.com/BTF14/Micro-app/pull/41 — prueba de regresión para conservar la cookie cuando falla la revocación de logout.
- Seis workflows `success` en el head de PR `0c55c180846e6286e72d35f51e502278200ee0de`: CI 39244454840, Playwright 39244454807, Security scan 39244454911, Semgrep 39244454934, Project progress dashboard 39244454952, Database migration validation 39244456648.
- No se ejecutaron tests locales. Los workflows del merge SHA no están confirmados por la consulta disponible.
- Sin datos reales, secretos, billing, cambios a Neon `main`, despliegue de producción ni mezcla con Cantina-pos. La app sigue sin estar lista para producción.


## 2026-10-19 — PR #45 fusionada; continuidad actualizada

- `main` verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f`.
- PR #45 https://github.com/BTF14/Micro-app/pull/45 fusionada por squash. Head probado: `cdce44a9643c5134311f9603abf1248c07970df3`.
- Seis workflows de GitHub Actions terminaron en success para ese head: CI 39252317370, Playwright E2E 39252317397, migraciones 39252317371, Security scan 39252317467, Semgrep SAST 39252317386 y dashboard 39252317373.
- Cambio: una aserción de limpieza de cookie cuando el usuario está inactivo. No se ejecutaron tests locales y los workflows del merge SHA no están verificados aquí.
- Se refrescaron los documentos de estado, plan y handoff. Sin cambios de producción, Neon, secretos, datos reales, billing ni Cantina-pos.
- La aplicación no está lista para producción; D1–D8, OAuth/allowlist, matriz de permisos, endpoints de negocio, aislamiento tenant, E2E real y backup/restauración independiente siguen pendientes.


## 2026-10-19 — PR #47 y #48 fusionadas

- `main` verificado: `420a64152103c90d2990d47c72fc19a744786fa6`.
- PR #47 https://github.com/BTF14/Micro-app/pull/47: prueba de error de `/auth/me` cuando falla la validación de sesión por DB. Head `7939d11678cfd1a2bb8fac22664096663603c824`; seis workflows success: CI 39253558854, Playwright 39253558793, migraciones 39253558714, Security 39253558727, Semgrep 39253558761, dashboard 39253558724.
- PR #48 https://github.com/BTF14/Micro-app/pull/48: prueba de que una cuenta inactiva no obtiene una cookie nueva. Head final `6acb78018a47eb39f74dab079b53b51b4cacf11f`; seis workflows success: CI 39254257051, Playwright 39254256939, migraciones 39254257076, Security 39254256854, Semgrep 39254256882, dashboard 39254256826.
- En PR #48, la primera ejecución encontró que el test excedía el límite de login por email; el fixture fue corregido para limpiar únicamente el contador hash del correo sintético antes del caso de cuenta inactiva. El head final pasó los seis workflows.
- No se ejecutaron tests localmente ni se verificaron workflows en los merge SHA. Sin cambios en producción, Neon, secretos, datos reales, billing ni Cantina-pos.
- La app sigue sin estar lista para producción. OAuth/allowlist, D1–D8, matriz de permisos, endpoints comerciales, aislamiento tenant, E2E API+PostgreSQL real y backup/restauración independiente continúan pendientes.


## 2026-10-19 — PR #50 y #51 fusionadas

- `main` verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98`.
- PR #50 https://github.com/BTF14/Micro-app/pull/50: aserciones para que login no emita cookie con membresía inactiva u organización desactivada. Head `dcad8d6d1caf6db3aabbc95465e5983ad0014746`; seis workflows success: CI 39255158169, Playwright 39255157709, migraciones 39255158077, Security 39255157712, Semgrep 39255157509, dashboard 39255157611.
- PR #51 https://github.com/BTF14/Micro-app/pull/51: respuestas seguras ante fallo de DB en login/registro, sin cookie. Head `92ea991d6333bcd1b05943f679fdd36777ab6a8f`; seis workflows success: CI 39255462405, Playwright 39255462498, migraciones 39255462284, Security 39255462264, Semgrep 39255462627, dashboard 39255462281.
- No se ejecutaron tests localmente ni se verificaron workflows sobre merge SHA. Sin cambios en producción, Neon, secretos, datos reales, billing ni Cantina-pos.
- La aplicación sigue sin estar lista para producción. OAuth/allowlist, D1–D8, matriz de permisos, endpoints comerciales, aislamiento tenant, E2E API+PostgreSQL real y backup/restauración independiente continúan pendientes.


## 2026-10-19 — Revisión manual y rebase seguro de gobernanza

- Revalidación de PR #60: head `af8479000e1e677bd84e0e11bf02cdb6d548315e`, abierta, `mergeable=false`; base SHA mostrado por PR `0a36f234d7a590905527b9cb9268bba3791215f5`. No se forzó ni se fusionó la rama conflictiva.
- Siete workflows consultados para el head exacto `af8479000e1e677bd84e0e11bf02cdb6d548315e` terminaron en `success` (CI, Security, Playwright E2E, migration validation, progress dashboard, Semgrep SAST y SDD/agent docs validation).
- El comentario de Codex confirma cuota agotada y revisión fallida para el SHA antiguo `1b7f576c38aa869ca8c17b749c7c35d473404ef8`; no se recuperaron reviews formales ni hilos inline. No se inventan ni se declaran resueltos hallazgos desconocidos.
- PR #61 está fusionada con merge SHA reportado `1b8098ff00e0bb7482200b486710a5611f1e109d`. El diario existente contenía una entrada histórica que la describía como abierta; el checkpoint nuevo de handoff corrige el estado vivo.
- Se creó `docs/ai-autonomy-governance-rebased` desde `main` para re-aplicar cambios documentales sin force-push. Pendiente de revisar diff y CI de la nueva rama/PR.
- No se ejecutaron pruebas locales. No hubo cambios en runtime, base de datos, secretos, datos reales, Neon ni despliegues productivos. Coste $0.


## 2026-10-19 — PR #62 fusionada y continuidad reconciliada

- PR #62 https://github.com/BTF14/Micro-app/pull/62 se fusionó por squash; merge SHA `d107cfb2b80c4165ed39e3071f8256942898ffb7`. Head final `9f288f68b6012f39b8ec7928b07a140b869e63cb`.
- Siete workflows del head final terminaron en success: CI, Playwright E2E, SDD/agent docs validation, progress dashboard, Security scan, Semgrep SAST y database migration validation.
- La PR era documental; no se cambiaron runtime, esquema de datos, Neon, secretos, datos reales ni producción. No se ejecutaron tests locales.
- Se actualizan checkpoint y handoff para reflejar el merge de PR #62 y evitar que el snapshot antiguo de PR #57 prevalezca como estado vivo.
- PR #60 sigue abierta con conflicto; no forzar ni fusionar. Antes de sustituirla, comparar sus cambios con lo que ya quedó integrado en PR #62.
- P0 continúa pendiente: Google sign-in, allowlist, D1–D8 y matriz de permisos requieren decisiones aprobadas. El registro sigue bloqueado; el login por contraseña aún existe y no debe asumirse que la política de acceso final ya está aplicada.
- Coste $0; no despliegues productivos, cambios en Neon `main`, emails, billing ni Cantina-pos.


## 2026-10-19 — Reconciliación de la política detallada de autonomía

- Comparé el diff original de PR #60 con lo que quedó integrado en PR #62. PR #62 portó el núcleo de la política, pero no todo el detalle operativo original de `AGENTS.md` y `docs/CONSTITUTION.md`.
- PR #63 amplía esos criterios sin reintroducir los checkpoints históricos obsoletos del handoff original: decisiones técnicas rutinarias por defecto, pedir solo la acción mínima ante bloqueos reales, verificación del SHA exacto y procedimiento de revisión manual cuando Codex no esté disponible.
- La PR #60 original permanece abierta y en conflicto; no se hace force-push ni merge directo. La revisión de PR #63 y sus checks siguen pendientes.
- No se modificó runtime ni autenticación; no se tocó base de datos, Neon, secretos, datos reales, producción o billing. Coste $0.


## 2026-10-19 — AutoSkills, skills locales y checkpoint tras PR #64

- PR #63 se fusionó por squash en `b4b417ec5a85b8b0c48b606c718c341745af9055`; sus siete workflows pasaron sobre el head exacto `6baffe8fb473128504361c28fd6ac0c0e01519d9`.
- PR #64 se fusionó por squash en `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`; seis workflows consultados terminaron en success sobre el head exacto `97088a2d0d599001f145f4e60f72556a66a5f8b4`. No se ejecutaron tests locales.
- Se añadieron cuatro skills de proyecto en `.agents/skills/` para auth/security, PostgreSQL, stack actual y curation segura; la guía `docs/AUTOSKILLS_ADOPTION.md` diferencia skills locales de paquetes externos.
- Se investigó AutoSkills y entradas de React/TypeScript/Vite/Hono, además de referencias de auth-review, secure-code-review y pruebas PostgreSQL. El intento de clonar el repo temporal falló por DNS al resolver `github.com`; la CLI `npx autoskills --dry-run` no se ejecutó. No se declara instalación oficial ni hash/lockfile generado.
- `docs/RESOURCE_REGISTRY.md` registra fuentes, decisión y limitación. Próximo paso cuando haya red: ejecutar dry-run, inspeccionar tecnologías/skills y revisar licencia, estado de seguridad y hashes antes de instalar.
- PR #60 se cerró como supersedida tras comparar el diff; no se fusionó ni se hizo force-push. Sus reglas útiles quedaron integradas por #62/#63; los snapshots históricos obsoletos no se reintrodujeron.
- Sin cambios de runtime/dependencias/DB/secretos ni despliegue productivo. Cloudflare generó automáticamente preview de rama para PR #64. Coste $0.
- P0 de identidad permanece: Google OAuth + allowlist, D1–D8 y matriz de permisos pendientes de aprobación. Registro fail-closed; login por contraseña existe y no se debe asumir que la allowlist lo protege.

## 2026-10-28 — Cobertura de preflight CORS

- Rama: `fix/cors-preflight-coverage-20261028`.
- Añadidas pruebas unitarias para el preflight `OPTIONS`: origen Pages autorizado con credenciales, método POST, cabeceras permitidas y max-age; y origen externo rechazado.
- Estas pruebas cubren el comportamiento del middleware Hono con bindings simulados. No equivalen a observar los encabezados HTTP del Worker publicado.
- No se modificaron variables de Cloudflare, secretos, Neon, datos reales ni producción. No se desplegó manualmente.
- Pendiente: revisión independiente del diff y mantener separada la verificación HTTP real de CORS frente al Worker publicado. No apuntar Preview a producción sin comprobar aislamiento y origen permitido.


## 2026-10-28 — PR #113 y auditoría de rama de seguridad

- PR #113 se fusionó por squash en `main`, commit `4242bcef38f33a415f472fc9c04048e1eee3bdde`. La matriz de permisos pasó de vacía a propuesta razonada, pero permanece **no aprobada**; no autoriza rutas comerciales.
- Workflows de PR exitosos en el HEAD `b93df838095a043e418f5e481ce4422ed014c494`; Codex no completó la revisión por límite de uso. Se revisó manualmente el diff y se dejó comentario sobre descuento del 10 %, alcance de sucursales y serialización concurrente para proteger al último owner. Los estados Vercel del merge commit quedaron pendientes; no afirmar CI post-merge.
- La rama `security/secret-scan-current-main` está 1 ahead/39 behind. Checklist ya existe en main; el workflow está obsoleto respecto a checkout v7 en main y el `.gitignore` de la rama no incluye la excepción de `apps/web/.env.production`. No se fusionó ni borró.
- Pendientes: restauración del backup cifrado en PostgreSQL desechable (llave privada age no disponible en la sesión), verificación HTTP de CORS y aislamiento tenant de futuras rutas comerciales. No se tocaron secretos, Neon, datos reales ni producción.

## 2026-10-29 — Fusión de PR #114 y estado posterior

- PR #114 se fusionó por squash en `main`, merge SHA `dc3fae80c485ec52c2e68c80da316df90c68ac83`, tras verificar el SHA esperado de la PR.
- Los ocho workflows y dos estados Vercel del HEAD de PR estaban en verde. No afirmar CI post-merge: los estados Vercel del merge SHA aparecen pendientes y no se devolvieron workflows de Actions para ese SHA.
- Cloudflare Workers reportó `Deployment successful!` y URLs explícitas de preview de commit y rama. No se realizó despliegue manual.
- La PR fusionada era de documentación; no cambió código de runtime, secretos, Neon ni datos reales.
- Bloqueos persistentes: restore del backup cifrado en PostgreSQL desechable, verificación HTTP real de CORS y aprobación/cobertura de permisos y aislamiento tenant. La aplicación no se considera lista para producción.

---

## 2026-10-29 — hallazgo y corrección de retención de backups

- Estado verificado: PR [#128](https://github.com/BTF14/Micro-app/pull/128) fusionada en `main`; merge SHA `9b4ee7d2ed704288cd0cf149c93569a698f46e1b`. En ese SHA, los checks de CI, migraciones, Playwright, escaneo de secretos, Semgrep, seguridad, dashboard, Cloudflare Pages/Workers y análisis JS/TS reportaron `success`.
- El propietario confirma que `RESTORE_TEST_AGE_KEY` fue eliminado y que `RESTORE_TEST_DB_URL` ya no aparece en la lista actual de Repository secrets. Es una confirmación visual del propietario; no se conoce la fecha exacta. Los secretos que quedan, `BACKUP_REPO_TOKEN` y `DATABASE_URL_BACKUP_RO`, se conservan para el backup permanente.
- Se inspeccionó `.github/workflows/backup.yml`: el paso de retención usaba `find -mtime` sobre un repositorio clonado con `--depth 1`. Como los mtimes de archivos tras checkout no son la fecha de creación del backup, esa estrategia puede no borrar copias vencidas.
- Se abrió la [PR #129](https://github.com/BTF14/Micro-app/pull/129) para corregir ese defecto, con un script que usa la fecha UTC incluida en el nombre del backup, elimina el checksum emparejado y añade pruebas unitarias ejecutadas en CI. Checks pendientes de ejecutar en el HEAD de PR; no declarar corregido hasta verlos verdes.
- Neon confirma que la rama `restore-test-20261028` (ID `br-broad-dust-b7cvgjtv`) todavía existe. El borrado por la herramienta ya había sido bloqueado por controles de seguridad; no se reintentó ni se eludió ese control. No se tocó `main`, datos reales ni producción.
- Siguiente paso: revisar checks/diff de la PR de retención; después preparar una única restauración aislada con datos sintéticos poblados y manifiesto de conteos/relaciones. RPO/RTO, alerta visible de fallo y evidencia de coste $0 siguen pendientes.


---

## 2026-10-29 — PR #129 fusionada y continuidad actualizada

- El propietario confirmó la fusión de PR [#129](https://github.com/BTF14/Micro-app/pull/129); comprobación independiente: estado `closed`, `merged=true`.
- HEAD actual de `main`: `d196d8e3e3053e1c51d2e1133aa4ed2d52884631`. Commit de merge de PR #129. Los checks del HEAD de la PR `35bee0d04e0c1d8470d526c7f7e961b7e0b4de26` terminaron todos en `success`, incluidos `verify`, pruebas unitarias de retención, migraciones, Playwright, análisis estático, escaneos de secretos y seguridad, Pages y Worker.
- La retención de 15 días ya no depende de mtimes posteriores al checkout: usa el timestamp UTC validado en el nombre del backup y elimina el checksum emparejado. CI cubre expiración, checksum, backups recientes, nombres malformados y valor inválido de retención.
- La documentación previa contenía notas históricas que presentaban PR #129 como pendiente y contradicciones antiguas sobre secretos; se actualizó el estado vivo/handoff para separar hechos actuales de entradas históricas.
- Neon sigue mostrando `restore-test-20261028` (ID `br-broad-dust-b7cvgjtv`). El intento de borrado por herramienta fue bloqueado por controles de seguridad; no se reintentó ni se eludió.
- Pendiente: prueba única de restauración con datos sintéticos poblados, manifiesto de conteos/relaciones, RPO/RTO, alerta visible y coste $0. No usar datos reales ni Neon `main`; la restauración sigue siendo la última fase.


## 2026-10-29 — continuidad post-merge PR #137

- Main observado: `2f5fb9bb837cb6f75eaf691e0d7f8281113557c5`; PR #137 fusionada, sin actualización real de dependencias.
- El workflow `.github/workflows/daily-dependency-watch.yml` está en main; schedule diario 08:15 UTC, ejecución manual, solo lectura. No se confirmó una ejecución post-merge porque la consulta de runs no estuvo disponible; el siguiente chat debe ejecutarlo desde Actions y documentar URL/SHA/resumen.
- Última consulta de checks de main: verify, Chromium, migración PostgreSQL, análisis estático y Trivy en success; algunos checks de Workers/Pages/scan aún figuraban en curso o duplicados. Reconsultar el SHA exacto antes de afirmar que todo pasó.
- Próximo trabajo: confirmar checks y monitor, luego una única PR de actualización de dependencias estables con lockfile generado por pnpm real y pruebas completas. No aplicar TypeScript 7/Vite 8/plugin-react 6/jsdom 30 solo porque estén publicadas; revisar compatibilidad. Preservar undici@7.30.1 en manifest/lockfile.
- Se mantiene autorización temporal para fusionar PRs con criterio, evitando PRs pequeñas repetidas. No tocar secretos, Neon main, datos reales ni producción; restauración sintética poblada sigue siendo la última fase.


## 2026-10-29 — corrección del informe diario de dependencias

- Se inspeccionó el run real [40829413589](https://github.com/BTF14/Micro-app/actions/runs/40829413589), ejecutado con SHA `0763c70647ff11a8bcf91386a274d549246407ef`. La instalación congelada pasó y `pnpm audit --audit-level high` informó `No known vulnerabilities found`.
- El run terminó en `success`, pero la revisión de logs encontró defectos en el resumen: las comillas dobles alrededor de backticks provocaron sustitución de comandos Bash (por ejemplo, SHA, versiones y la mención del override), y `pnpm outdated -r` no produjo un listado visible. Por tanto, el run exitoso no prueba que el inventario de actualizaciones estuviera completo.
- Rama de corrección: `fix/dependency-watch-report-20261029`. Se corrigió el uso de `printf` para preservar Markdown, se cambió la consulta a `pnpm -r outdated` para mostrar también majors estables y se aclaró que una salida vacía requiere inspección, no significa que no existan actualizaciones.
- Estado: corrección en revisión; no se ha verificado todavía un nuevo run con el código corregido. La auditoría de paquetes y la actualización real de dependencias siguen pendientes; no se modificó ningún paquete ni lockfile en esta corrección.
- Sin cambios a secretos, Neon, datos reales ni despliegues.


## 2026-10-29 — fusiones seguras y recuperación sintética

- Fusionadas por squash [PR #140](https://github.com/BTF14/Micro-app/pull/140) (commit `4fe2b00ed45cf5b779f44b65bcd00133745760e3`) y [PR #142](https://github.com/BTF14/Micro-app/pull/142) (commit `c87893313534049463917af5ee17dfd36ba319c4`) tras revisar diff y checks.
- Confirmado que los checks post-merge del SHA `c87893313534049463917af5ee17dfd36ba319c4` acabaron todos en `success`, incluidos CI, Playwright, PostgreSQL migration, Semgrep, Security, Trivy, scan de historial y builds de Cloudflare.
- Se implementó y verificó la prueba sintética poblada en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`: checksum, cifrado/descifrado, 13 tablas, constraints, relaciones y exclusión de tablas efímeras pasaron. No se tocaron Neon ni datos reales. RPO/RTO, alertas y prueba con una copia real siguen pendientes.


## 2026-10-29 — PR #143 y cierre de la prueba sintética de recuperación

- PR [#143](https://github.com/BTF14/Micro-app/pull/143) se fusionó por squash; merge commit/main: `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`.
- Checks post-merge de ese SHA: Pages, Workers, CI, Chromium, migración PostgreSQL, análisis estático, Trivy, escaneo de historial y dashboard terminaron en `success`.
- La prueba sintética de backup/restore [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695) pasó en el SHA final de la PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Datos sintéticos relacionados; clave age temporal; checksum; restore; manifiesto de 13 tablas/constraints/relaciones; exclusión de tablas efímeras. No tocó Neon ni datos reales.
- El monitor diario [run 40845877052](https://github.com/BTF14/Micro-app/actions/runs/40845877052) terminó en `success` y el audit reportó `No known vulnerabilities found`. Su SHA precede la fusión de #142; no es evidencia de auditoría en el main actual.
- La rama `fix/dependency-watch-report-20261029` está 4 commits detrás y 0 ahead; el workflow coincide con main, por lo que no se abrió PR duplicada.
- Pendiente: RPO/RTO real, alerta de fallo, coste $0, y evaluar upgrades mayores de frontend/TypeScript con análisis de compatibilidad. No tocar Neon `main`, secretos ni producción.


## 2026-10-29 — backup workflow failure and corrective change

- Observed manual run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763) fail at retention with exit code 2. The logs show the dump, age encryption, and SHA-256 checksum succeeded; commit existed only in the temporary clone and push was never reached.
- Exact cause: from `$GITHUB_WORKSPACE/backups-repo`, relative path `../scripts/prune_backups.py` points outside the checkout root. It is now changed on `fix/backup-workflow-path-20261029` to `$GITHUB_WORKSPACE/scripts/prune_backups.py`.
- Also pin `runs-on: ubuntu-24.04` to avoid silently following the `ubuntu-latest` migration to Ubuntu 26 before this operational workflow is explicitly tested there. The Ubuntu warning was not the direct cause of the failure.
- No claim of a new persisted backup: `git push` did not run. Verify PR checks and then a fresh manual run before considering resolved.


## 2026-10-29 — backup fails due to pg_dump major version mismatch

- Manual run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) showed PostgreSQL server 18.6 but runner executed pg_dump 16.15, aborting before a dump existed. Later steps were skipped; no upload or retention ran.
- Corrective change on `fix/backup-pg-dump-v18-20261029`: install PostgreSQL 18 client, use the explicit binary `/usr/lib/postgresql/18/bin/pg_dump`, and fail early unless `--version` reports major 18.
- Keep incident open until checks and a complete manual backup prove remote persistence and checksum.


## 2026-10-29 — backup run #7 fails due to missing checkout

- Run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) succeeded through PostgreSQL 18.6 dump, age encryption and SHA-256 checksum, then failed at retention because `$GITHUB_WORKSPACE/scripts/prune_backups.py` was not present.
- Confirmed root cause in workflow: no `actions/checkout` step existed. The path refers to a real repository script, but the runner workspace was empty of source files.
- Branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` before any repository-dependent commands. Since failure happened before push, the run did not persist a new backup or execute remote retention.
- Keep unresolved until a verified successful manual run and remote file/checksum evidence.


## 2026-10-29 — backup run #8 succeeded end-to-end

- Run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) passed all steps.
- Verified `pg_dump 18.6`, dump generation, age encryption, SHA-256 checksum, commit `2b038bd` and successful push to private backup repository. Files are `daily/backup-2026-10-29T17-29-48Z.dump.age` and matching `.sha256`. Retention completed and deleted zero files.
- This closes the incident chain for the operational upload path. Remaining independent tasks: verify checksum remotely, test decrypt/restore safely with the protected private key, measure RPO/RTO, validate failure alert delivery, and confirm cost assumptions. Do not conflate synthetic restore CI with restoring this exact production backup.


## 2026-10-29 — hardening HTTPS de FRONTEND_ORIGIN iniciado

- Main consultada en vivo: `0ba45e47daa5af9bbd9034690443405aa8bedf44`. PR #154 abierta y sin reviews; ocho workflows del SHA `b4508fda6f4d5f042dbeb2b48c7c9910a8c3852d` terminaron success, pero Codex falló por cuota y no hay revisión independiente. No fusionar PR #154 hasta cumplir su gate.
- Confirmada divergencia entre `getConfiguredFrontendOrigin` de `google-auth.ts` y el validador global de `index.ts`: el primero aceptaba HTTP no local. No hay evidencia de explotación.
- Creada rama `fix/google-auth-frontend-origin-https-20261029` desde main para una corrección acotada y tests de regresión. En esta fase no se modificaron secretos, Neon, datos, migraciones ni producción.
- Pendiente: completar tests, verificar diff/CI en SHA exacto y revisión. No declarar el hallazgo cerrado antes del merge.


### Verificación CI de PR #155 — 2026-10-29

- SHA `18cf2f158552ce7c97bacc66018e0cfdae60e2d3`: los ocho workflows asociados finalizaron en `success`: CI, Playwright E2E, Database migration validation, Semgrep SAST, Security scan, Dependency review, Secret history scan y Project progress dashboard.
- CI ejecutó build/typecheck, unit tests y PostgreSQL auth integration tests; Playwright browser tests también completaron con éxito.
- Revisión manual del diff: cambio acotado al helper de validación y su prueba; no cambia flujo OAuth/bootstrap, DB, secretos ni despliegue. PR #155 aún abierta; falta integrar a main y verificar el estado post-merge. Codex no pudo revisar por cuota; no se afirma revisión independiente.


## 2026-10-29 — PR #155 fusionada y continuidad reconciliada

- Main avanzó a `5a9bdc5a18a54c3c68639f52125d913d4e725b91`, merge commit de PR #155.
- PR #155 implementó validación HTTPS en Google OAuth, permitiendo HTTP solo para loopback y rechazando credenciales, rutas, query, fragmentos y origen no canónico.
- En SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`, los ocho workflows consultados finalizaron success. CI cubrió build/typecheck, unit tests y PostgreSQL auth integration; Playwright E2E también pasó.
- Codex review no pudo completarse por límite de uso; no se registra revisión independiente. Cloudflare generó previews automáticos de Pages/Workers, no despliegue productivo.
- PR #154 quedó obsoleta/stale al avanzar main; su contenido documental se traslada/reconcilia en PR #156. No fusionar PR #154.
- No se tocó Neon main, secretos, datos reales ni producción; no se ejecutaron migraciones ni se habilitaron recursos pagos.

---

## 2026-10-29 — Dirección SaaS y continuidad de arquitectura

Se consolidó la dirección recomendada para Micro app: una plataforma multi-organización, multi-sucursal y multiusuario; catálogo compartido por organización por defecto; stock por sucursal/almacén; caja y operaciones vinculadas a sucursal; usuarios multi-organización y roles con alcance. Se añadieron criterios de BCV programado con validación/histórico/fallback, búsqueda por barcode/SKU con SQL indexado, caché condicionada a mediciones, confirmación transaccional de venta, idempotencia, auditoría y medición de límites Neon/Cloudflare. La especificación está en `docs/SAAS_ARCHITECTURE_DECISIONS.md`.

Estado: documentación/diseño únicamente; no se implementaron API BCV, buscador, caché de catálogo, sucursales, almacenes, cajas ni endpoints comerciales. La matriz de permisos sigue pendiente de aprobación. Capacidad SaaS sin medir. Se reutiliza PR #156 para evitar PR documental duplicada; verificar checks/revisión del HEAD actualizado antes de considerar merge.


## 2026-10-29 — Auditoría estática de API/esquema y CI documental

En `main` SHA `5a9bdc5a18a54c3c68639f52125d913d4e725b91` se revisaron `apps/api/src/index.ts`, `tenant-context.ts`, `database.ts`, `auth.ts`, migraciones `0001_initial.sql` y `0002_google_identity.sql`, además de `API_INTEGRATION.md`, `DATABASE_SCHEMA.md` y `SCHEMA_REVIEW.md`.

Hechos observados: la API registra rutas de autenticación y `GET /health`, no rutas comerciales; tenant context devuelve user/organization/role y comprueba membresía activa, pero explícitamente no autoriza operaciones ni tiene branch scope; `products.stock_quantity` es por organización; existen índices únicos tenant-scoped de SKU/barcode y B-tree sobre `(organization_id, lower(name))`; existe tabla global `exchange_rates`; no hay sucursales/almacenes/cajas/turnos/compras/devoluciones. El helper actual abre `Client` request-scoped y ofrece transacción interactiva; se documentó evaluar HTTP `neon()` para lecturas sencillas y reservar `Client` para operaciones atómicas, siempre con benchmark y pruebas.

CI documental: para HEAD `8c15e13fa001a14a0ddf9f2432bc17efb30d476d`, los 8 workflows consultados finalizaron success, incluyendo todos los contexts requeridos de protección. Se añadieron luego commits documentales hasta `23cbb313ebb163d3c808f8d0953b85645262c520`; para ese SHA posterior no se obtuvieron runs/statuses. No afirmar CI verde en el HEAD actual. PR #156 sigue abierta, sin reviews, y su metadata reportó mergeable=false; no fusionar.


## Reconciliación documental de identidad, README y SaaS — 2026-10-30

- Rama: `docs/reconcile-main-after-pr155-20261029`; PR [#156](https://github.com/BTF14/Micro-app/pull/156).
- Actualizados `README.md`, `AGENTS.md`, `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/CONSTITUTION.md`, `docs/SCHEMA_REVIEW.md`, `docs/CURRENT_STATE.md` y `docs/HANDOFF_NEXT_CHAT.md`.
- README ahora refleja que Google OAuth + allowlist/bootstrap seguro y sesión revocable están implementados según PR #153/#155; contraseña permanece fail-closed; MFA, recuperación y limpieza completa de sesiones pendientes. No afirma que existan endpoints comerciales ni sucursales.
- Se aclara que SaaS multi-organización/multi-sucursal es arquitectura de destino documentada, no esquema/funcionalidad desplegada. Capacidad sigue sin medir.
- Se incorpora regla obligatoria: actualizar README después de cada avance concreto y verificado, distinguiendo implementación de propuestas; no publicitar capacidades incompletas.
- Constitución y SCHEMA_REVIEW reconciliadas para que los hallazgos de auth del 2026-10-17 se lean como históricos/supersedidos, preservando el análisis SQL útil.
- Alcance solo documental. No se cambió código, esquema, migraciones, workflows, secretos, Neon, datos reales ni producción.
- Verificación pendiente: consultar HEAD final y workflows de ese SHA exacto; revisar diff completo y obtener revisión independiente antes de fusionar. No reutilizar resultados de CI de HEAD previos.


## 2026-10-30 UTC — precisión de rate limiting y revisión de rama histórica

- La búsqueda de símbolos y callsites en `apps/api/src` no encontró runtime rate limiting; `auth_rate_limits` aparece en DDL y tests, no como mecanismo activo. Se corrigieron `API_INTEGRATION.md` y `SECURITY_ROADMAP.md` para no afirmar controles inexistentes. Verificar reglas Cloudflare aparte y diseñar protección distribuida compatible con Workers.
- La rama `feat/neon-transaction-adapter` se comparó con main: 14 commits ahead y 242 behind. Su PR [#1](https://github.com/BTF14/Micro-app/pull/1) ya está fusionada desde 2026-10-17, merge `b6511d0876e33096f75df2466653449165888821`; no se debe reabrir ni fusionar la rama antigua.
- La auditoría permanece estática/read-only. No se ejecutó SQL ni se accedió a Neon `main`, producción, secretos o datos reales.


## 2026-10-30 UTC — reconciliación de alcance de catálogo y autoridad de allowlist

- Se corrigió la matriz de permisos: el catálogo maestro se propone compartido a nivel organización, pero esto no habilita acceso a stock, movimientos, ventas o caja de otras sucursales; los roles operativos requieren asignación de sucursal.
- Se eliminó la recomendación de que el rol tenant `owner` gestione la allowlist global. D1 exige un operador autenticado/auditado, pero el rol/identidad de plataforma y su recuperación no están definidos; el email concreto citado en `SECURITY_PLAN_2026.md` se trata como propuesta histórica, no como autorización vigente.
- La matriz permanece **NO aprobada**. No implementar estos permisos ni crear endpoints administrativos hasta que el propietario confirme la autoridad de plataforma y los permisos sensibles.


## 2026-10-30 UTC — PR #157 abierta para integrar auditoría y continuidad

- Se abrió [PR #157](https://github.com/BTF14/Micro-app/pull/157) desde `docs/post-pr156-audit-continuity-20261030` con alcance documental/auditoría acotado. Incluye la reconciliación de alcance de catálogo y la separación de autoridad global de allowlist respecto a roles tenant.
- La PR permanece abierta hasta que los checks requeridos pasen en su HEAD exacto y se complete revisión manual final. No se fusiona por inercia ni se usan resultados de SHAs anteriores.
