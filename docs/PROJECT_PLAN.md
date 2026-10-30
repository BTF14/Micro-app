# Prioridad operativa viva — post PR #161 — 2026-10-30 UTC

- PR #160 y #161 fusionadas. La continuidad incremental y el checkpoint post-merge ya están integrados.
- No crear más PR solo para volver a sincronizar el mismo checkpoint. Desde ahora, actualizar WORK_CHECKPOINT y STATE_JOURNAL en la PR de trabajo que corresponda.
- Prioridades antes de módulos comerciales:
  1. Obtener aprobación explícita de la matriz de permisos por rol/organización/sucursal.
  2. Cerrar ERD y ownership para organización, sucursal, almacén, caja y turno.
  3. Diseñar autorización server-side por operación y scope de sucursal.
  4. Diseñar control distribuido de abuso/rate limiting compatible con Workers y verificar opciones gratuitas.
  5. Cerrar consistencia venta-líneas-pagos-stock-ledger, idempotencia por operación, último owner y auditoría append-only.
  6. Preparar pruebas PostgreSQL efímeras de aislamiento, rollback y concurrencia.
- No añadir `branch_id` superficial, no migrar Neon main y no crear endpoints comerciales antes de resolver contratos.
- No prometer capacidad de organizaciones/sucursales hasta medir carga sintética y límites reales Neon/Cloudflare. Mantener objetivo $0.
- Documentar cada bloque importante durante el trabajo, dentro de la PR coherente; no esperar al cierre del chat.

---


- PR #160 fusionada en main: `be6f19486caf5cf3605c6ca6615f87e305822ea7`. La continuidad incremental ya está integrada; no abrir otra PR para el mismo objetivo.
- Primero cerrar el checkpoint post-merge y verificar que CURRENT_STATE, HANDOFF, PROJECT_PLAN y STATE_JOURNAL apunten al merge SHA real.
- Continuar auditoría/diseño de arquitectura antes de módulos comerciales:
  1. Obtener aprobación explícita de la matriz de permisos por rol/organización/sucursal; está NO aprobada.
  2. Cerrar ERD y ownership para organización, sucursal, almacén, caja y turno; no añadir `branch_id` superficial ni migrar Neon main.
  3. Diseñar autorización server-side por operación y scope de sucursal; `resolveTenantContext` es helper aislado, no middleware comercial.
  4. Diseñar control distribuido de abuso/rate limiting compatible con Workers; `auth_rate_limits` no tiene runtime caller.
  5. Cerrar consistencia venta-líneas-pagos-stock-ledger, idempotencia por operación, último owner y auditoría append-only.
  6. Preparar pruebas de integración y concurrencia en PostgreSQL efímero; no usar Neon main.
- No prometer capacidad de organizaciones/sucursales hasta medir carga sintética y límites reales Neon/Cloudflare.
- Mantener el objetivo de coste $0 y no activar servicios de pago.
- Registrar cada bloque importante en WORK_CHECKPOINT y STATE_JOURNAL durante el trabajo, no al final.

---


- La PR de continuidad activa es [#160](https://github.com/BTF14/Micro-app/pull/160). Consultar siempre `docs/WORK_CHECKPOINT.md` y `docs/CURRENT_STATE.md` antes de continuar.
- No fusionar #160 hasta que CI requerido esté completo en el HEAD exacto y la revisión manual del diff no encuentre problemas materiales. Codex quedó limitado por cuota y no constituye aprobación.
- Tras cerrar #160, continuar auditoría de arquitectura/API/esquema y resolver brechas de seguridad/consistencia antes de crear endpoints comerciales. No reabrir auditorías ya completadas sin evidencia nueva.
- Mantener documentación incremental en cada bloque, no al final de la sesión.

---

# Estado vivo verificado — 2026-10-30 UTC

- **Fuente viva:** GitHub confirma `main` en `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`. PR #158 y #159 están fusionadas; PR #160 está abierta. La protección de rama de GitHub no se pudo confirmar por API y no debe afirmarse como verificada.
- **PR #158:** merge commit `3fba9870b69a7e1ef05cc20db6d19f3ee18df51d`; auditoría documental de Cloudflare/workflows/continuidad.
- **PR #159:** merge commit `dbc7b6c9cf57113a38cddb4155d2917cc3aaeafc`; fija Node.js `24.22.2` mediante `.node-version` y pnpm `10.34.9` mediante `packageManager`, con alineación en workflows.
- **Checks del SHA exacto de main:** 9/9 completed/success, incluidos Workers Build, Cloudflare Pages, Chromium smoke, verify, secret-history scan, postgres-migration, Trivy, generate-progress y static analysis. No extrapolar estos checks a commits futuros.
- **Producción observada tras merge:** Pages `https://micro-app-63i.pages.dev` cargó la pantalla de acceso; Worker `https://micro-app-api.btfcasheb.workers.dev/health` respondió HTTP 200 con `status=ok`, `service=micro-app-api`, `stage=scaffold`. Es una comprobación básica, no una certificación funcional/comercial.
- **Neon, lectura de metadatos:** proyecto `micro-app-db`, plan `free_v3`, PostgreSQL 18, región `aws-us-east-1`; periodo de consumo mostrado 2026-10-17 a 2026-11-01. Tamaño lógico de main: 32,866,304 bytes (~31.34 MiB). Consumo del periodo: 5,645,769 bytes transferencia; 5,911 segundos compute; 23,240 segundos activo; 0 bytes escritos reportados. Ramas: 3/10; main 32.87 MB, restore-test ~33.57 MB, integrity-test ~31.69 MB. Son metadatos/contadores del proveedor, no benchmark ni capacidad SaaS.
- **Seguridad Neon:** metadatos actuales muestran `main.protected=false`, `allowed_ips.ips=[]`, `protected_branches_only=false`, `block_public_connections=false`; ramas listadas sin protección. No cambiar estos ajustes sin evaluación/plan y autorización correspondiente. No se leyó SQL, secretos, roles ni datos.
- **Protocolo README:** PR #159 ya cambió toolchain de forma concreta y verificada; README debe reflejar Node/pnpm exactos. Este checkpoint actualiza el README y continuidad para no dejar instrucciones contradictorias.
- **Guardrails vigentes:** no SQL ni cambios en Neon main; no secretos, datos reales, billing, DNS ni ajustes Cloudflare; no merge/deploy de producción sin aceptación explícita. Objetivo $0. No depender de Codex.
- **Siguiente prioridad:** cerrar lectura documental de arquitectura/API/esquema e inventariar brechas P0; revisar rama `feat/neon-transaction-adapter` con diff completo antes de rescatar nada; después diseñar tenant/branch authorization y rate limiting antes de endpoints comerciales. No prometer número de organizaciones hasta pruebas sintéticas.
- **Nota histórica:** los bloques inferiores que digan #158/#159 “abiertas”, “draft” o “no mergeadas” son históricos y quedan supersedidos por este estado vivo y por GitHub.

---

# Checkpoint continuidad — 2026-10-30 UTC (Node/pnpm corregidos en PR #159)

- **PR #158** (documentación Cloudflare/CI): https://github.com/BTF14/Micro-app/pull/158. Rama docs/workflow-deployment-audit-20261030; abierta, draft, no mergeada. HEAD conocido antes de este checkpoint: 162765fac25bf3aa623a41676d56e570afabd7fd; 12/12 checks success.
- **PR #159** (pinning de toolchain): https://github.com/BTF14/Micro-app/pull/159. Rama fix/cloudflare-node-pnpm-pinning-20261030; abierta, draft, no mergeada. HEAD 57de704c03fffebfd9aee2ae91c05a0e3af7515a; 13/13 checks success.
- PR #159 añade .node-version = 24.22.2, packageManager = pnpm@10.34.9 y alinea node-version-file/pnpm exactos en CI, Playwright, AutoSkills preview, Daily Dependency Watch y Regenerate Lockfile.
- Cloudflare Pages build log del SHA 57de704 confirmó Node 24.22.2 + pnpm 10.34.9, build exitoso, sin Unsupported Engine warning; preview https://70046713.micro-app-63i.pages.dev. No se fusionó ni se desplegó producción.
- Mantener PRs separadas: #158 solo docs; #159 solo toolchain/workflows. No fusionar ninguna sin autorización explícita porque push/merge a main activa despliegues externos.
- No cambiar Cloudflare settings, Neon main, secretos, DNS, billing, datos reales ni producción. Objetivo USD 0. Sin Codex.

---

# Checkpoint final — 2026-10-30 UTC (PR #158 HEAD 5b1b573)

- **PR #158:** abierta, draft, no fusionada; base main = 1ee1808af4aae484a71dc24750237ff4f4d934a0.
- **HEAD actual:** 5b1b5734f3fa8024f060694e5dbc5f5f9f8ab766; cinco archivos de documentación, cinco commits, sin cambios de aplicación/workflows/migraciones.
- **Checks del SHA exacto:** 12/12 success (GitHub Actions y Cloudflare). Cloudflare Pages preview: https://d8477e48.micro-app-63i.pages.dev. Workers preview: https://2935f95a-micro-app-api.btfcasheb.workers.dev. Son previews, no producción.
- **Pages Settings:** main producción; root vacío; build corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build; output apps/web/dist; build system v3; cache off; monitoring *; preview público por defecto; sin dominio custom. Detalles completos en docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md.
- **Preview isolation:** verificado en código main: API base vacía, llamadas API bloqueadas, login deshabilitado, CSP sin API en previews; _headers define CSP/seguridad para producción. Mantener pruebas de regresión.
- **Pendientes:** revisar build logs para versión efectiva Node/pnpm; evaluar pin pnpm, build cache y semántica “Fail open” sin cambiar ahora; verificar headers HTTP efectivos; revisar cuota Pages; confirmar required checks/branch protection (no confirmado).
- **Guardrails:** no merge/deploy sin permiso explícito; no tocar Cloudflare settings, Neon main, secretos, datos reales, billing ni DNS. Objetivo USD 0. No Codex.

---

## Checkpoint Pages Settings — 2026-10-30 UTC

- TinyFish accedió a Settings de Pages `micro-app`, solo lectura. Production branch `main`; root directory vacío; build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build`; output `apps/web/dist`; build system v3; cache off; monitoring routes `*`; automatic deploys on; no deploy hooks; build comments on; preview access public by default; no custom domains; vars names only: `CLOUDFLARE_INCLUDE_PROCESS_ENV`, `VITE_API_BASE_URL`.
- Compatibility date `2026-10-17`; flags panel mostró True; Functions setting mostró `Fail open` (no interpretar/cambiar sin confirmar).
- Repo main confirma monorepo pnpm `apps/*`; root package requiere Node `>=24.22.2 <25` pero no fija `packageManager`. Pendiente verificar Node/pnpm efectivos en build logs; evaluar pinning en PR separada.
- Build command compila web vía `apps/web/package.json` script `tsc -b && vite build && node scripts/postbuild.mjs`; API se valida en workflows separados.
- `apps/web/public/_headers` existe: nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP. CSP prod permite API Worker. Postbuild quita Worker de CSP en preview; Vite deja API base vacía y activa preview flag; auth.ts bloquea API y App.tsx deshabilita login y muestra aviso. Preview público por defecto, pero aislamiento API está implementado en main auditada. Mantener tests de regresión.
- `_redirects` no existe en `apps/web/public/`; UI no mostró configuración de redirects/headers.
- Cache deshabilitado puede consumir más build time; medir antes de cambiar. Pages usage/billing no consultados.
- Sin cambios en configuración/infra/secretos/builds/producción. PR #158 sigue draft y no fusionada.

## Checkpoint — 2026-10-30 UTC: Pages y despliegues confirmados

- Pages `micro-app` usa `main` como production branch y auto-deploy al push a main. Último deploy productivo observado activo: commit `1ee1808af4aae484a71dc24750237ff4f4d934a0`, timestamp `2026-10-30T01:30:08.9457Z`, URL `https://06553c7b.micro-app-63i.pages.dev`.
- Las ramas no productivas generan previews. PR #158 commit `79be208` preview successful; no es producción. Vista: 15 despliegues recientes (1 producción + 14 previews), 1.100 total en historial, los 15 visibles successful.
- Settings Pages no accesible: root/build/output/framework/Functions/redirects/headers/env/uso no confirmados. No custom domain visible.
- Merge a main puede desplegar frontend automáticamente; PR #158 sigue draft y no debe fusionarse sin autorización explícita.
- CI duplicación: corregido el falso positivo anterior; solo secret-history-scan y security-scan tienen push amplio con duplicación potencial general. No modificar hasta confirmar required checks.
- Detalle completo en `docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md`.

---

## Checkpoint prioritario — 2026-10-30 UTC: corrección CI/CD + Cloudflare

- La primera auditoría de workflows clasificó erróneamente siete workflows como push+PR sin filtros. La lectura directa posterior de los 15 YAML corrige esto: duplicación general potencial solo en `secret-history-scan.yml` (push todas las ramas) y `security-scan.yml` (push sin filtro). Otros workflows restringen ramas o paths. No modificar triggers hasta confirmar branch protection y contexts requeridos.
- Cloudflare panel confirmado mediante TinyFish, solo lectura. Workers Free $0/mes; 100k requests/día, 10ms CPU/request, 3.000 build minutes/mes, 100 Workers, 5 cron triggers. Snapshot: 183 requests, 0 errores y 106,68 build minutes últimas 24h; el Worker view reportó 85 invocaciones y P90 CPU 10ms. Métricas puntuales, no benchmark.
- Worker `micro-app-api`: `main` identificada como producción; ramas `docs/*` como previews. PR #158 obtuvo Worker preview successful y Pages preview successful para `d3f056b`; no son deploys productivos.
- Pages existe: proyecto `micro-app`, URL `https://micro-app-63i.pages.dev/`, repo BTF14/Micro-app. Historial detallado, producción branch/build settings y consumo no extraídos.
- Logs/Traces aparecían desactivados. No activar hasta definir redacción de datos y revisar coste.
- No fusionar PR #158 sin autorización específica de producción. Mantener $0, no tocar Neon main, secretos, datos reales ni infraestructura.

Próximos pasos: completar Pages read-only; verificar branch protection/check contexts; proponer reducción de triggers solo en los dos workflows de push amplio; mantener PR #158 como única PR documental y actualizar handoff.

---

## Checkpoint prioritario — 2026-10-30 UTC, post PR #157

- Main = `1ee1808af4aae484a71dc24750237ff4f4d934a0`; PR #157 fusionada (HEAD `6eb464c950f195ec67350977575aef77e9790e1d`). Ocho workflow runs devueltos para ese HEAD finalizaron success; no se recuperó evidencia post-merge para el merge SHA.
- Auditoría de 15 workflows en [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](WORKFLOW_AND_DEPLOYMENT_AUDIT.md). No existe workflow de deploy de Cloudflare en GitHub Actions; los builds de Cloudflare parecen gestionados por Git integration externa, no inspeccionable desde las herramientas actuales.
- Siete workflows (`ci`, `migration-check`, `playwright-e2e`, `project-progress`, `secret-history-scan`, `security-scan` y `semgrep`) ejecutan tanto en `push` como en `pull_request` sin filtros de branch/path, por lo que commits a una rama con PR pueden duplicar runs. `sdd-docs-validation` también escucha ambos eventos, pero limita `main` y paths documentales. Antes de optimizar, verificar branch protection y contexts requeridos.
- No fusionar a main sin autorización explícita para el posible deploy automático externo. Producción sigue NO LISTA.
- Prioridades: (1) branch protection/rulesets y Cloudflare dashboard en solo lectura; (2) optimización de triggers preservando checks; (3) inventario de queries/callers; (4) ERD branch/warehouse/register/shift; (5) matriz de permisos aprobada antes de endpoints o migraciones.

---

## Checkpoint de arquitectura y auditoría — 2026-10-30 UTC

- PR #156 fusionada en main: `18961456ac535146c4a1687d3b07d8f6693ce141`. Su HEAD `6c068f3e9734736ac26e51ff754e39915d660abe` pasó 9/9 workflows antes de la fusión. Revisión manual del diff por indisponibilidad de Codex; no hubo review formal registrada.
- La revisión estática de rutas confirma que API solo expone auth/health; no hay handlers HTTP comerciales. `resolveTenantContext` verifica sesión y membresía, no permisos por operación ni alcance sucursal.
- El DDL inicial carece de sucursales/almacenes/cajas/turnos/compras/devoluciones; stock se mantiene por organización. Antes de endpoints, cerrar ERD y scope de roles.
- Hallazgos a resolver en diseño: venta/pagos no reconciliados por constraints SQL; saldo stock y ledger pueden divergir sin transacción; referencias polimórficas no validadas; falta idempotencia propia de pagos; regla del último owner; auditoría no append-only por DB.
- Seguridad de autenticación: no se encontró rate limiting runtime en `apps/api/src`; `auth_rate_limits` solo existe en DDL y no tiene callers. Verificar reglas Cloudflare en vivo y añadir control distribuido compatible con Workers antes de ampliar acceso.
- Capacidad sostenible Neon/Cloudflare no medida. No fijar cuotas SaaS hasta ejecutar carga sintética y verificar límites actuales de los proveedores.
- Revisión de `feat/neon-transaction-adapter`: la rama pertenece a PR #1, fusionada el 2026-10-17 (merge `b6511d0876e33096f75df2466653449165888821`). Está divergida frente a main (14 ahead/242 behind); no reabrir ni fusionar. La implementación vigente se audita en `apps/api/src/database.ts` y sus callers.
- Próximo bloque: inventario completo de queries y callers; ERD org→branch→warehouse/register/shift; contrato de autorización; definir autoridad de plataforma para allowlist; diseño de transacciones y pruebas negativas. No migrar Neon main ni desplegar producción.

---

## Monitorización diaria de dependencias — 2026-10-29, PR #137

Se añadió `.github/workflows/daily-dependency-watch.yml` para producir un informe diario de actualizaciones estables y vulnerabilidades conocidas sin modificar el árbol de dependencias. Está programado a las 08:15 UTC (04:15 Venezuela), con ejecución manual, permisos de solo lectura, instalación congelada, `pnpm outdated -r`, comprobación del parche de Node 24 LTS y `pnpm audit --audit-level high`.

**Criterio de aceptación:** YAML válido, instalación congelada y checks obligatorios verdes en el SHA exacto de la PR; tras el merge, una ejecución real con resumen visible. No declarar el monitor operativo antes de esa ejecución. No cambiar a actualizaciones automáticas diarias ni crear PR por paquete. Dependabot sigue semanal para npm y GitHub Actions. Preservar `undici@7.30.1` en manifiesto y lockfile.

---

## Plan vigente — actualización de dependencias orientada a seguridad (2026-10-29)

El propietario solicita mantener versiones modernas para reducir exposición a vulnerabilidades y autoriza a la IA a avanzar con criterio. La estrategia no es “todo lo más nuevo sin importar compatibilidad”: mantener parches/minors al día, comprobar advisories y migrar majors con lockfile y CI coherentes.

### Base comprobada
- Node range >=24.22.1 <25; mantener Node 24 LTS y llevarlo al parche actual tras verificar CI.
- TypeScript 5.9.3; Hono 4.13.14; Workers types 5.20261026.1; Wrangler 4.152.0.
- React/react-dom 19.3.1; tipos React 19.3.0; Vite 7.3.7; plugin-react 5.2.0; jsdom 26.1.0.
- pnpm lockfile v9 y override obligatorio undici@7.30.1.
- Versiones latest estables observadas públicamente: TypeScript 7.0.2, Vite 8.3.5, plugin-react 6.1.2, jsdom 30.1.3, Wrangler 4.154.0, pnpm 12.16.1, Node 24.22.2 LTS. React/react-dom ya están en 19.3.1 y Hono en 4.13.14. Verificar siempre en registry antes de ejecutar porque las páginas pueden quedar desfasadas.
- PRs #117–#120 fueron cerradas sin merge; no asumir esos upgrades aplicados.

### Gate de aceptación de actualización
1. Crear una rama para una migración coherente, no una PR por paquete.
2. Generar pnpm-lock.yaml con la versión real del gestor; prohibido inventar/editar a mano las resoluciones.
3. Conservar undici@7.30.1 en manifests y lockfile; instalación congelada y Dependency Review deben confirmarlo.
4. Revisar breaking changes, engines, peer dependencies y configuración TS/Vite/Vitest/jsdom.
5. Exigir build, tests web/API, typecheck, migración PostgreSQL, Chromium auth, static analysis, Trivy, secret scan, Dependency Review y Cloudflare Pages/Workers en verde para el SHA exacto.
6. Si falla, diagnosticar logs y corregir causa raíz en la misma rama. No fusionar con checks rojos ni dejar PR de prueba olvidadas.
7. Fusionar solo tras revisión completa; después comprobar el SHA de main, versiones resueltas y checks post-merge. Actualizar CURRENT_STATE, HANDOFF_NEXT_CHAT y STATE_JOURNAL.
8. No cambiar major de pnpm ni pasar a Node 26 sin una prueba deliberada. No desplegar manualmente producción ni tocar Neon main, datos reales o secretos.


---

## Continuidad — Dependabot y override de Undici (2026-10-29 UTC)

PR #116 se fusionó por squash/merge; el HEAD vivo posterior de `main` verificado el 2026-10-29 es `764ed502d2a296136d311e05d081ca8e9f7cfeb9` (PR #134, reglas Dependabot/lockfile). El HEAD final de PR fue `5d3f2e373e75caf71af207cba61df3066b140a86`; todos los checks de PR pasaron, incluidos Dependency Review, verify, Chromium, migraciones, static analysis, Trivy, scan de historial de secretos y Cloudflare Pages/Workers. La PR incorporó la corrección para conservar el override de Undici.

Causa original: los lockfiles generados en PR #116–#120 quitaban `overrides: undici: 7.30.1` mientras `package.json` conservaba `pnpm.overrides.undici = 7.30.1`. La instalación congelada fallaba con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; Dependency Review detectaba `undici@7.29.1` vulnerable de severidad alta. Tras el merge, se comprobó que el lockfile de `main` mantiene el override, contiene `undici@7.30.1` y no contiene `undici@7.29.1`.

Las PR #117 (TypeScript 7), #118 (plugin-react 6), #119 (Vite 8) y #120 (jsdom 30) figuran cerradas sin fusionar. No asumir que esos upgrades se aplicaron. Para futuras actualizaciones: verificar SHA exacto, coherencia `package.json`/lockfile, instalación congelada, Dependency Review y compatibilidad. No fusionar majors sin un plan y pruebas.

**Verificación post-merge completada:** los checks consultados para el commit de PR #132 (`9f73f8ab0c1581145796f09a41f689fa4bdcf310`) terminaron en `success`; el HEAD documental actual `764ed502d2a296136d311e05d081ca8e9f7cfeb9` también tiene los checks consultados en `success`, incluidos análisis estático, Cloudflare Pages y Workers. Continuar los pendientes de seguridad ya priorizados; la restauración con datos sintéticos poblados sigue reservada para la última fase.

---

## Checkpoint posterior a PR #114 — 2026-10-29 UTC

- PR #114 quedó fusionada por squash en `main`: [merge commit dc3fae80c485ec52c2e68c80da316df90c68ac83](https://github.com/BTF14/Micro-app/commit/dc3fae80c485ec52c2e68c80da316df90c68ac83). El HEAD revisado fue `780e057435fea4ebd6213fd973745599e71d2088`; GitHub confirmó `merged=true`.
- Los ocho workflows de PR y los dos estados Vercel del HEAD de PR fueron `success`. Esto no equivale a CI post-merge: en el merge SHA los estados Vercel aparecen `pending` y el conector no devolvió workflows de Actions para ese SHA. Reconsultar antes de afirmar que pasó CI post-merge.
- Cloudflare Workers actualizó el estado a `Deployment successful!` y expuso URLs explícitas de preview de commit y rama: `https://36b3fea5-micro-app-api.btfcasheb.workers.dev` y `https://docs-continuity-after-pr-113-2026-10-28-micro-app-api.btfcasheb.workers.dev`. No se hizo despliegue manual.
- Esta actualización documental corrige la referencia obsoleta al estado abierto de PR #114 y al SHA anterior de `main`; conserva el historial previo sin reescribir decisiones antiguas.
- Siguen pendientes: restaurar el backup cifrado en PostgreSQL desechable; verificar headers CORS con HTTP real contra el Worker; decisión/aprobación de la matriz de permisos; aislamiento cross-tenant para rutas comerciales futuras. No declarar la app lista para producción. No tocar Neon `main`, secretos ni datos reales.

---

## Continuidad verificada — 2026-10-28, después de PR #113

- `main` quedó en `4242bcef38f33a415f472fc9c04048e1eee3bdde`, fusión squash de PR #113. La PR integró una propuesta completa para revisar permisos por rol; **la matriz continúa explícitamente NO aprobada** y no autoriza rutas comerciales.
- La PR #113 tuvo éxito en los workflows de CI, migraciones, E2E, Semgrep, escaneo de seguridad, historial de secretos, Dependency Review y dashboard en el HEAD exacto `b93df838095a043e418f5e481ce4422ed014c494`. El resumen de revisión de Codex reportó que no pudo completar por límite de uso; se realizó revisión manual y se dejó un comentario técnico en la PR. En el commit de merge, los estados clásicos consultados muestran dos checks Vercel pendientes; no afirmar que hubo una nueva corrida de CI posterior al merge.
- Decisiones pendientes para revisar en la matriz: el 10 % de descuento es solo una sugerencia y requiere decisión del propietario; el alcance por sucursal/caja requiere confirmar el supuesto de MVP de un solo local; la regla de no perder al último `owner` debe tener implementación transaccional serializada y pruebas concurrentes.
- Auditoría de rama obsoleta: `security/secret-scan-current-main` está 1 commit por delante y 39 detrás de `main`. Su checklist `docs/PUBLIC_RELEASE_SECURITY_CHECKLIST.md` ya existe en `main`; el workflow de la rama usa `actions/checkout@v4`, mientras `main` usa `@v7`; su `.gitignore` no conserva la excepción `!apps/web/.env.production` presente en `main`. No fusionar ni borrar la rama tal cual.
- No se modificaron secretos, Neon, datos reales ni configuración productiva; no se hizo despliegue manual. La PR #114 de continuidad está abierta mientras se completa la verificación; no se debe describir el inventario como vacío.
- Bloqueos reales: (1) restaurar un backup cifrado real en PostgreSQL desechable; la llave privada `age` permanece bajo custodia del propietario y no está disponible en esta sesión; (2) revisar/aprobar o corregir la matriz de permisos; (3) verificar los headers CORS mediante solicitudes HTTP reales al Worker; (4) probar aislamiento cross-tenant cuando existan rutas comerciales. La aplicación no está lista para producción.
- Próxima acción segura: el propietario revisa la propuesta de permisos; en paralelo se sigue investigando una ruta autorizada y gratuita para la restauración aislada y la verificación HTTP de CORS. No usar herramientas metered, no acceder a Neon `main`, no inventar políticas ni crear otra PR para un objetivo ya cubierto.

---

## Checkpoint de continuidad — 2026-10-27: respaldo automático implementado, checklist de cumplimiento evaluado

- Aprobación obligatoria de PR desactivada por el propietario (GitHub no deja auto-aprobarse; con 1 requerida, todo quedaba bloqueado esperándolo). La IA puede fusionar sola de nuevo, con PR + 6 checks en verde.
- Respaldo automático cifrado implementado (`.github/workflows/backup.yml`) hacia el repositorio privado `BTF14/micro-app-backups` (R2 descartado: pide tarjeta). Falta un solo paso del propietario: agregar el secreto `DATABASE_URL_BACKUP_RO`; después, probar y verificar restauración real.
- Evaluado un checklist externo de 20 puntos de cumplimiento legal/privacidad/accesibilidad (`docs/COMPLIANCE_AND_ACCESSIBILITY.md`): la mayoría no aplica al modelo actual del negocio (sin pagos, sin registro público, sin cookies de analítica); se adoptaron los puntos que sí aplican (gate de dependencias vulnerables, principios de diseño para módulos futuros, un diseño de "derecho al olvido" que no rompe el libro de movimientos).

## Checkpoint de continuidad — 2026-10-26 (noche): main protegida, blueprint externo resuelto, respaldos bloqueados en la elección de destino

- **`main` tiene branch protection activa, verificada en vivo** (el propietario la configuró). A partir de ahora todo, incluidos los checkpoints de documentación, pasa por PR + aprobación del propietario — ya no hay push directo a `main`. Hay una discrepancia sin resolver sobre el número de aprobaciones requeridas (propietario dice 0, la API en vivo dice 1); ver `docs/SECURITY_ROADMAP.md` punto 1.
- Se evaluó un blueprint de arquitectura externo (Gemini, sin contexto del proyecto) que el propietario compartió: se adopta el diseño del cron de tasa BCV y la caché de lectura en Cloudflare KV; **se rechaza explícitamente el modo offline-first de ventas** por romper el invariante transaccional anti-fraude ya existente. Documentado en `docs/PRICING_CACHE_ARCHITECTURE.md`, PR #91 (abierto, CI verde, esperando aprobación del propietario).
- Respaldo automático (Nivel 1, punto 2): avance parcial (rol Neon de solo lectura `backup_readonly`, par de llaves `age` para cifrar), pero bloqueado porque Cloudflare R2 no está habilitado en la cuenta y activarlo puede requerir tarjeta — en conflicto con la regla de $0 sin tarjetas. Pendiente de que el propietario elija entre R2 (con tarjeta + alerta de presupuesto) o un repositorio privado de GitHub dedicado a los volcados ya cifrados.

## Checkpoint de continuidad — 2026-10-26 (tarde): prioridad del proyecto cambia a seguridad primero

- El propietario pidió explícitamente priorizar que todo quede bien hecho y seguro sobre avanzar rápido, pensando en escalar a varias personas. Se adoptó `docs/SECURITY_ROADMAP.md`, un plan en 3 niveles, ya referenciado como lectura obligatoria en `AGENTS.md`.
- Implementado: Dependabot y cabeceras de seguridad (frontend y API). PR #85, merge `11d29b183490286a02195d7f86b94f44853d3c5c`.
- Pendiente del Nivel 1: protección de `main` en GitHub (requiere al propietario, confirmado que la IA no puede hacerlo desde este entorno) y respaldo automático cifrado de la base de datos (diseño listo, falta implementar).
- **El plan de construir el módulo de negocio (inventario, productos, tasa BCV, ventas) sigue siendo la prioridad funcional, pero ahora detrás de completar el Nivel 1 de seguridad**, salvo que el propietario autorice explícitamente avanzar en paralelo.

## Checkpoint de continuidad — 2026-10-25 (noche): identidad/infraestructura cerrada, listo para negocio

- Dos bugs de producción encontrados y resueltos el mismo día, ambos documentados en detalle en `docs/CURRENT_STATE.md`: (1) `wrangler deploy` borraba en silencio las variables del Worker no declaradas en `apps/api/wrangler.toml`, rompiendo el login dos veces; ahora las tres variables no-secretas están declaradas en el archivo. (2) El botón de cerrar sesión no era alcanzable en pantallas de teléfono; ahora hay uno también en la barra superior. PR #82, merge `f274d32a359dbba8e401897a41294fda1f33cbf8`.
- El usuario confirmó visualmente, en su teléfono real, que el login funciona de extremo a extremo y carga el panel de "Abasto 7 de Oro".
- **No queda ningún pendiente conocido de identidad, infraestructura o interfaz básica de acceso.** Toda la energía del siguiente chat debe ir a construir la lógica de negocio real (inventario, productos, tasa BCV, ventas), que sigue sin existir en código.

## Checkpoint de continuidad — 2026-10-25 (tarde): identidad completa de punta a punta

- **El riesgo P0 de identidad quedó resuelto y verificado en producción, no solo en código.** Existe una organización real ("Abasto 7 de Oro") con un usuario owner real (`btfcasheb@gmail.com`) creado a través del flujo de Google OAuth + bootstrap sellado. Ver `docs/CURRENT_STATE.md` para IDs exactos, el estado de `auth_allowlist`/`auth_bootstrap`, y el patrón SQL para autorizar usuarios adicionales.
- PR #81 fusionada (merge `441bdc463954aba1069cfeae9227bf75a562a53a`): la interfaz dejó de mostrar el formulario de contraseña retirado y ahora tiene un botón real de Google + mensajes claros para cada tipo de fallo de login.
- **El trabajo de identidad/infraestructura (auth, allowlist, bootstrap, UI de login, deploy de Worker y Pages) está, en esencia, terminado.** La prioridad ahora cambia a construir la lógica de negocio real: inventario, productos con precio en USD, tasa BCV y su conversión a VES, ventas. Nada de esto existe todavía en código — la app solo tiene una pantalla de bienvenida con módulos marcados "Pendiente de implementación".
- Sigue pendiente, sin bloquear lo anterior: revisar `feat/neon-transaction-adapter` contra `main` antes de cualquier merge; decidir un flujo real de invitación de usuarios (hoy agregar a alguien requiere inserciones manuales en Neon).

## Checkpoint de continuidad — 2026-10-19 después de PR #64

- PR #64 fusionada por squash; merge SHA `f15e3b0da415b8f31641a81ed8a883deb7fcfc5f`. PR #63 merge SHA `b4b417ec5a85b8b0c48b606c718c341745af9055`.
- PR #64 integró cuatro skills locales bajo `.agents/skills/` y `docs/AUTOSKILLS_ADOPTION.md`. No son paquetes externos instalados por AutoSkills.
- AutoSkills CLI no llegó a ejecutarse porque el intento de checkout falló al resolver `github.com`; no hay `skills-lock.json` generado ni hashes externos declarados. Próximo paso: `npx autoskills --dry-run` en un entorno con red, revisar tecnologías detectadas, licencia y hash, y elegir solo skills aplicables.
- PR #60 está cerrada como supersedida; la política útil se integró en #62/#63. No force-push.
- P0 sigue pendiente: Google sign-in + allowlist, D1–D8 y matriz de permisos requieren aprobación. Mantener registro fail-closed y no asumir que el login por contraseña respeta allowlist.
- No se ejecutaron tests locales. Seis workflows consultados para el head exacto de PR #64 terminaron en success. App no lista para producción; coste $0, sin producción ni Neon `main`.

## Política permanente de ejecución técnica autónoma

- Resolver decisiones rutinarias y reversibles con evidencia; implementar, probar, revisar seguridad/regresiones y documentar de punta a punta.
- No delegar comprobaciones disponibles en las herramientas ni pedir permisos repetidos. Pedir intervención solo ante una decisión de producto, autorización, acceso o capacidad realmente ausente.
- Presupuesto $0; sin producción, mutaciones de Neon `main`, datos reales, secretos, gastos ni acciones destructivas fuera de los gates vigentes.
- Si un revisor IA está limitado por cuota, hacer revisión manual del diff y contexto relacionado; no inventar findings y no fusionar con checks requeridos pendientes.
- La PR #62 incorporó una versión resumida de esta política. Esta PR conserva los criterios operativos detallados de la propuesta original #60, sin traer checkpoints históricos obsoletos.

## Checkpoint de continuidad — 2026-10-19 después de PR #62

- PR #61 y PR #62 están fusionadas. PR #62 merge SHA: `d107cfb2b80c4165ed39e3071f8256942898ffb7`; siete workflows en success sobre el head final `9f288f68b6012f39b8ec7928b07a140b869e63cb`.
- PR #60 sigue abierta con conflicto. Comparar sus cambios con el diff integrado de PR #62 antes de decidir si se necesita una PR sustituta; no force-push.
- La revisión Codex de PR #60 falló por cuota para un SHA antiguo; no inferir hallazgos desconocidos. En PR #62 se atendió la observación P2 sobre checkpoint obsoleto.
- P0: Google sign-in + allowlist requiere aprobación de D1–D8 y de la matriz de permisos. Mantener el registro fail-closed. El login por contraseña sigue en el código; su convivencia con la política de acceso continúa sin decisión aprobada.
- Límites: $0, sin producción, sin mutaciones de Neon `main`, sin datos reales/secretos, sin emails y sin mezclar Cantina-pos.

## Checkpoint de continuidad — 2026-10-19

- PR #61 está fusionada; PR #60 no pudo integrarse directamente por conflicto con `main`. Se re-aplicó el cambio documental en `docs/ai-autonomy-governance-rebased` y se abrió PR #62 sobre `main`, sin force-push; revisar sus checks para el head vigente antes de fusionar.
- La revisión Codex de PR #60 falló por cuota para un SHA antiguo; no se recuperaron hilos inline. La revisión manual debe tratarse como evidencia independiente, no como aprobación automática.
- P0: Google sign-in + allowlist requiere aprobación de D1–D8 y de la matriz de permisos. Mantener el registro fail-closed mientras la política siga pendiente.
- Límites: $0, sin producción, sin mutaciones de Neon `main`, sin datos reales/secretos, sin emails y sin mezclar Cantina-pos.

## Checkpoint vigente — 2026-10-19 después de PR #57

Main verificado: `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`. PR #57 bloquea fail-closed el registro público mientras se aprueba la política de identidad. Checks del head exacto `71d3e6d3ffe625b12807e9942ddd261e222cf093` y los checks consultados del merge SHA terminaron en success; no se ejecutaron tests locales.

Prioridades:
1. Resolver Google sign-in + allowlist según D1–D8 aprobados; mantener registro público bloqueado hasta entonces.
2. Obtener aprobación de la matriz de permisos antes de exponer handlers comerciales.
3. Mantener pruebas de auth/sesión y tests PostgreSQL negativos; no inventar políticas.
4. No fusionar `feat/neon-transaction-adapter`: divergida 14 ahead / 76 behind, con test script y documentos antiguos.
5. Implementar POS/inventario/ventas con aislamiento tenant, transacciones, idempotencia, concurrencia y auditoría.
6. Probar backup/restauración independiente, requisitos fiscales y E2E API+DB antes de producción.
7. Coste objetivo $0; sin producción ni mutaciones de Neon main fuera de los gates.

Ver [CURRENT_STATE.md](CURRENT_STATE.md), [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md), [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

---

## Checkpoint vigente — 2026-10-19 después de PR #55

Main verificado: `b7117f8aeb868e25c49db86a524405511cd3c9be`. PR #55 fusionada. Ocho check-runs de su head exacto `a4e51ec10bcbc0ac786bb3e518d50de9ec7eee28` en success; no se ejecutaron pruebas locales ni se verificó independientemente el merge SHA. Cloudflare fue solo preview de rama.

Prioridades:
1. Cerrar el riesgo P0 del registro con política Google sign-in + allowlist aprobada, sin inventar D1–D8.
2. Obtener aprobación explícita de la matriz de permisos de roles antes de crear handlers comerciales.
3. Continuar pruebas seguras de auth/sesión y revisar la rama feat/neon-transaction-adapter contra main sin merge ciego.
4. Implementar endpoints comerciales solo con autorización server-side y pruebas PostgreSQL negativas de acceso cruzado, membresía inactiva y rollback.
5. Demostrar backup/restauración independiente antes de cualquier operación real.
6. Mantener coste $0; no producción ni mutaciones de Neon main sin gates y recuperación verificada.

Issue P0 #53 permanece abierto. No hay PR abiertas en la consulta actual. La app no está lista para producción. Ver [CURRENT_STATE.md](CURRENT_STATE.md), [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

---

## Checkpoint vigente — 2026-10-19 después de PR #51

Main verificado: `e18a3ec267f4c4d0e02678a4c0522dabf200ac98`. PR #50 y #51 fusionadas; los seis workflows pasaron en cada head exacto. No se ejecutaron pruebas locales ni se verificaron workflows sobre merge SHA. Ver [CURRENT_STATE.md](CURRENT_STATE.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

Prioridades:
1. Revisar autorización server-side y aislamiento tenant antes de crear handlers comerciales.
2. Obtener decisiones aprobadas D1–D8 de Google OAuth/allowlist y matriz de permisos antes de implementar políticas.
3. Validar aislamiento tenant y flujos API+PostgreSQL reales cuando existan handlers de negocio.
4. Preparar backup independiente y demostrar restauración antes de cualquier operación real.
5. Mantener coste $0; no desplegar producción ni modificar Neon `main` sin los gates definidos.

---

## Checkpoint vigente — 2026-10-19 después de PR #48

Main verificado: `420a64152103c90d2990d47c72fc19a744786fa6`. PR #47 y #48 fusionadas; los seis workflows pasaron en cada head exacto. No se ejecutaron pruebas locales ni se verificaron workflows sobre los merge SHA. Ver [CURRENT_STATE.md](CURRENT_STATE.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

Prioridades:
1. Revisar autorización server-side y aislamiento tenant antes de crear handlers comerciales.
2. Obtener decisiones aprobadas D1–D8 de Google OAuth/allowlist y matriz de permisos antes de implementar políticas.
3. Validar aislamiento tenant y flujos API+PostgreSQL reales cuando existan handlers de negocio.
4. Preparar backup independiente y demostrar restauración antes de cualquier operación real.
5. Mantener coste $0; no desplegar producción ni modificar Neon `main` sin los gates definidos.

---

## Checkpoint vigente — 2026-10-19 después de PR #45

Main verificado: `1c6ecf6a4586ab1252a43210672e123975f8941f`. PR #45 está fusionada; los seis workflows pasaron en el head exacto de la PR. No se ejecutaron pruebas locales ni se verificó el merge SHA con workflows. Ver [CURRENT_STATE.md](CURRENT_STATE.md) y [STATE_JOURNAL.md](STATE_JOURNAL.md).

Prioridades inmediatas:
1. Continuar pruebas acotadas de autenticación/sesión y límites de autorización.
2. Obtener decisiones aprobadas D1–D8 de Google OAuth/allowlist y matriz de permisos antes de implementar políticas.
3. Validar aislamiento tenant y flujos API+PostgreSQL reales cuando existan handlers de negocio.
4. Preparar backup independiente y demostrar restauración antes de cualquier operación real.
5. Mantener coste $0; no desplegar producción ni modificar Neon `main` sin los gates definidos.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #41

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `3313bf4276563c6cdac52aa7902fa9ea36558014` — https://github.com/BTF14/Micro-app/commit/3313bf4276563c6cdac52aa7902fa9ea36558014
- PR #41 fusionada: https://github.com/BTF14/Micro-app/pull/41. Cambio: prueba de regresión para que el endpoint de logout no borre la cookie de sesión si falla la revocación del lado del servidor.
- Head exacto probado por GitHub Actions: `0c55c180846e6286e72d35f51e502278200ee0de`. Los seis workflows fueron `success`: CI (39244454840), Playwright E2E (39244454807), Security scan (39244454911), Semgrep SAST (39244454934), Project progress dashboard (39244454952) y Database migration validation (39244456648).
- Merge SHA: `3313bf4276563c6cdac52aa7902fa9ea36558014`. La consulta de workflows asociada al merge SHA no devolvió runs porque el conector filtra a eventos de PR; no afirmar que los seis workflows del merge SHA estén verificados. No se ejecutaron pruebas locales.
- Cambio acotado: solo `apps/api/src/index.test.ts`, 24 líneas añadidas. Usa una URL de base de datos sintética inválida; no contacta ni modifica una base real.
- No se tocaron secretos, billing, datos reales, Neon `main`, producción ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) continúa documentado, no instalado ni ejecutado.
- Estado del producto: **NO listo para producción**. Persisten endpoints comerciales incompletos, decisiones de identidad D1–D8 pendientes, matriz de permisos por aprobar, aislamiento multiempresa y flujos reales API+PostgreSQL por validar, idempotencia/concurrencia, requisitos fiscales y backup/restauración independiente por verificar.
- Rama `feat/neon-transaction-adapter`: divergida y desactualizada; no fusionar a ciegas. Recuperar solo cambios puntuales tras comparar con `main`.
- Siguiente paso: continuar con pruebas pequeñas de auth/sesión/autorización sin inventar políticas pendientes; mantener CI verificado por SHA exacto y coste objetivo $0. No desplegar producción ni mutar Neon `main` sin superar los gates documentados.

---

# Checkpoint autoritativo — 2026-10-19, después de PR #39

## Estado verificado en GitHub

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `50c530084f8ce402d897962cbc7c4354c512e847` — https://github.com/BTF14/Micro-app/commit/50c530084f8ce402d897962cbc7c4354c512e847
- PR #39, prueba de que el error original de operación sobrevive cuando también falla el cierre del cliente: fusionada — https://github.com/BTF14/Micro-app/pull/39. Head probado: `134c9e14a5224d83c5f280dc501ae113d374c159`; merge SHA: `50c530084f8ce402d897962cbc7c4354c512e847`.
- Los seis workflows terminaron en `success` para el head exacto de PR #39 `134c9e14a5224d83c5f280dc501ae113d374c159`: CI (run 39243670711), Project progress dashboard (39243670742), Playwright E2E (39243670784), Database migration validation (39243670921), Semgrep SAST (39243670843) y Security scan (39243670950).
- PR #38 también está fusionada: https://github.com/BTF14/Micro-app/pull/38; merge SHA `bdf340a0e7157b6398b498fabedc3a8e2158b9c4`. Sus seis workflows fueron `success` en el head exacto `527dd7cc62bcceae891add8100875cc395dd5cfa`.
- No se ejecutaron pruebas locales. Los resultados indicados son de GitHub Actions sobre los head SHA especificados. No se han verificado aquí workflows para el merge SHA de PR #39; no afirmar que el merge SHA esté completamente verde.
- No se desplegó producción, no se modificó Neon `main`, no se tocaron datos reales, secretos, facturación ni Cantina-pos.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.
- Automatización diaria de continuidad creada previamente con ID `6ad4c8ce247881919e0c4e83e7358dcb`; verificar su estado en la plataforma si se necesita afirmar que está activa/ejecutándose. No es un bucle continuo en tiempo real.

## Estado funcional y bloqueos

La aplicación **NO está lista para producción**. Continúan pendientes: rutas comerciales completas para catálogo/proveedores/inventario/ventas/pagos/devoluciones/reportes; Google OAuth, allowlist y verificación de correo según las decisiones D1–D8 aún no aprobadas; matriz de permisos por rol; aislamiento multiempresa validado en todos los endpoints; pruebas reales de API + PostgreSQL para flujos de negocio; idempotencia y concurrencia de ventas/stock; cumplimiento fiscal; backups independientes y restauración ensayada; preview aislada y aprobación de lanzamiento.

## Próximos pasos

1. Continuar con pruebas de auth/sesión de alcance acotado sin inventar políticas de identidad o roles.
2. Revisar la rama `feat/neon-transaction-adapter` contra el `main` actual antes de cualquier decisión; no fusionarla a ciegas.
3. Mantener cambios pequeños en ramas/PR; exigir CI exitoso para el head SHA exacto y revisar diffs/reviews antes de merge.
4. Mantener el presupuesto objetivo en $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.
5. Corregir esta documentación al cerrar hitos; no usar snapshots históricos como evidencia del estado actual.

---

# Checkpoint de continuidad — 2026-10-19, después de PR #36

## Estado verificado

- Repositorio: https://github.com/BTF14/Micro-app
- HEAD de `main`: `c15c2364cd19e55ac10b2331300e7a9f4b89813f` — https://github.com/BTF14/Micro-app/commit/c15c2364cd19e55ac10b2331300e7a9f4b89813f
- PR #35, checkpoint documental tras PR #34: fusionada — https://github.com/BTF14/Micro-app/pull/35. Merge SHA: `f2fdd532fb67dd98f31eb02b99bbe326945cabb0`.
- PR #36, validación estricta de hashes PBKDF2: fusionada — https://github.com/BTF14/Micro-app/pull/36. Head SHA probado por CI: `cf432de6d5e8752181bc1105e9d0e91384d5936c`; merge SHA: `c15c2364cd19e55ac10b2331300e7a9f4b89813f`.
- PR #36 cambió `apps/api/src/auth.ts` para rechazar hashes con campos `$` adicionales y valores de iteraciones no canónicos; añadió regresiones en `apps/api/src/auth.test.ts`.
- Los seis workflows de PR #36 terminaron en `success` para el head exacto `cf432de6d5e8752181bc1105e9d0e91384d5936c`:
  - CI: https://github.com/BTF14/Micro-app/actions/runs/39241705903
  - Playwright E2E: https://github.com/BTF14/Micro-app/actions/runs/39241706090
  - Security scan: https://github.com/BTF14/Micro-app/actions/runs/39241705951
  - Semgrep SAST: https://github.com/BTF14/Micro-app/actions/runs/39241706070
  - Database migration validation: https://github.com/BTF14/Micro-app/actions/runs/39241705989
  - Project progress dashboard: https://github.com/BTF14/Micro-app/actions/runs/39241706068
- Los seis jobs consultados tras PR #34 (run IDs 39241150482, 39241150423, 39241150283, 39241150291, 39241150500 y 39241150556) reportaron `success`. La consulta disponible no devolvió metadatos suficientes para vincular cada run al SHA de merge `02c7cd61ef2e94545849746885dede12b2df7767`; no afirmar que ese SHA tiene checks confirmados hasta verificarlo por otro medio.
- No se ejecutaron pruebas locales en esta sesión. La evidencia de tests es GitHub Actions sobre el head de PR #36, no una ejecución local.
- No se desplegó producción ni se modificó Neon `main`; no se tocaron datos reales, secretos, billing ni Cantina-pos.

## Bloqueos de producto

- La aplicación NO está lista para producción: todavía no se ha verificado la implementación completa de rutas comerciales para catálogo, proveedores, inventario, ventas, pagos, devoluciones y reportes.
- Google OAuth, allowlist y verificación de correo no están implementados en el código revisado. Las decisiones D1–D8 siguen pendientes de aprobación; no inventar proveedor, política ni flujo de cuentas.
- La matriz de permisos por rol sigue pendiente de aprobación. No crear rutas comerciales asumiendo permisos.
- Playwright cubre smoke tests con API simulada; faltan pruebas E2E reales de API + PostgreSQL para flujos comerciales.
- Backups independientes y restauración real siguen sin verificarse. Revalidar protección de `main`; no asumir que está activada.
- Strix (`https://github.com/usestrix/strix.git`) sigue documentado solamente; no instalado ni ejecutado.

## Próximas acciones

1. Verificar los checks del SHA de merge `c15c2364cd19e55ac10b2331300e7a9f4b89813f` y registrar evidencia exacta si la plataforma la expone.
2. Continuar con pruebas de seguridad/auth de alcance pequeño, sin cambiar decisiones de identidad o permisos pendientes.
3. Mantener cambios en ramas + PR y esperar CI en el head SHA exacto antes de fusionar.
4. Actualizar este checkpoint y los documentos de estado tras cada cambio significativo.
5. Mantener coste objetivo $0. No desplegar producción ni mutar Neon `main` hasta satisfacer los gates y autorizaciones requeridos por `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

# Checkpoint operativo — 2026-10-19, después de PR #31

> Confirmar el estado vivo de GitHub y reemplazar los SHA/status de este checkpoint cuando cambien.

- Repositorio: https://github.com/BTF14/Micro-app
- Último `main` verificado antes de abrir la actualización documental: `31d1a09a9ba9bf41a797fea7c442f5d9e2223c56` — https://github.com/BTF14/Micro-app/commit/31d1a09a9ba9bf41a797fea7c442f5d9e2223c56.
- PR #30 y #31 fusionadas; PR #32 actualiza continuidad, checkpoint y diario: https://github.com/BTF14/Micro-app/pull/32. No fusionar PR #32 hasta verificar que todos los checks requeridos del head SHA vigente terminaron correctamente.
- PR #31 añadió pruebas de integración para denegar `/auth/me` y `/auth/login` cuando la organización está inactiva; su head tuvo checks exitosos antes del merge. El estado post-merge se debe verificar por SHA exacto.
- La API todavía no registra rutas HTTP comerciales para catálogo, proveedores, compras, ventas, pagos o movimientos de inventario. No existe aislamiento de rutas de negocio que se pueda certificar hasta implementar endpoints y pruebas de integración reales.
- Google OAuth + allowlist y decisiones D1–D8 continúan pendientes; la matriz de roles/permisos también está pendiente de aprobación. No inventar reglas ni exponer rutas comerciales hasta resolver permisos.
- Backups independientes/restauración probada no verificados. No modificar Neon `main`, desplegar producción, activar billing, enviar correos ni tocar datos reales como parte de este trabajo.
- Siguiente trabajo: verificar CI/PR #32; después priorizar una revisión concreta de seguridad o prueba aislada que no dependa de decisiones de identidad/roles. Evitar nuevos PR de documentación salvo que mejoren continuidad o corrijan hechos.
- No se ejecutaron pruebas localmente durante esta revisión; los resultados deben citarse desde GitHub Actions para el SHA exacto.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #27

> **Esta sección prevalece sobre los snapshots históricos más abajo.** Verificar de nuevo GitHub antes de usar este estado en una sesión futura.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- PR #27, [refresco del checkpoint después de PR #26](https://github.com/BTF14/Micro-app/pull/27), está fusionada. Head revisado: `29f899a52346d342067cf8e1b22850d35aa48a69`; los ocho check-runs visibles en ese head terminaron en `success`.
- Para el merge commit de `main`, los siete checks consultados terminaron en `success`: [Cloudflare Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [smoke tests Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify/CI](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [análisis JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812) y [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No había PR abiertas en la consulta posterior al merge. No se ejecutaron pruebas locales en esta sesión; la evidencia indicada es de GitHub Actions para los SHA exactos.
- Estado del producto: **no listo para producción**. La API aún no registra handlers HTTP comerciales para productos, proveedores, ventas, pagos ni movimientos de inventario. La matriz de aislamiento es un plan de aceptación, no evidencia de controles en rutas inexistentes.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 siguen pendientes de aprobación; roles/permisos por operación deben definirse antes de añadir rutas de negocio; no se han verificado backups/restauración independiente; la protección de `main` estaba desactivada en la última comprobación.
- Límites mantenidos: presupuesto $0, proyecto independiente de Cantina-pos, sin secretos ni correos, sin cambios a Neon `main`, sin despliegue de producción. Strix sigue documentado, no instalado ni ejecutado.
- Próximo paso seguro: continuar la revisión del adaptador Neon sin merge ciego y preparar una matriz explícita de permisos por rol para que el primer endpoint comercial tenga pruebas positivas y negativas de aislamiento; no inventar políticas pendientes.

---

# Checkpoint autoritativo — 2026-10-18, después de PR #26

> **Esta sección prevalece sobre todos los snapshots históricos más abajo.** Los SHA, estados de PR y enlaces de Actions antiguos que aparezcan en el resto de este archivo no representan el estado vivo actual salvo que coincidan con una verificación nueva de GitHub.

- Repositorio: https://github.com/BTF14/Micro-app
- `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c` — https://github.com/BTF14/Micro-app/commit/a3cc3ae7533510baf2502a3f553030c2c8505a4c
- PR #24 (matriz de aislamiento tenant), PR #25 (refresco documental) y PR #26 (checkpoint documental) están fusionadas.
- PR #26: https://github.com/BTF14/Micro-app/pull/26; head `a5576ae3db9b606bbb69fa3c7f34006e6585934e`; sus siete workflows consultados terminaron en `success`.
- Para el SHA exacto de `main` `a3cc3ae7533510baf2502a3f553030c2c8505a4c`, los seis workflows consultados terminaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39133032751), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39133032760), [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39133032817), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39133032755), [validación de migraciones](https://github.com/BTF14/Micro-app/actions/runs/39133032686) y [panel de progreso](https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No hay PR abiertas en la consulta actual. No se desplegó producción ni se modificó Neon `main`.
- Estado de producto: **no listo para producción**. `apps/api/src/index.ts` todavía no registra handlers HTTP de negocio para catálogo/productos, proveedores, ventas, pagos o movimientos de inventario; la matriz de tenant define criterios futuros, no evidencia de endpoints ya protegidos.
- Bloqueos: Google OAuth + allowlist y decisiones D1–D8 pendientes de aprobación; backups/restauración independiente no verificados; protección de rama `main` desactivada en la última verificación; faltan flujos POS/inventario reales y pruebas de autorización completas.
- Límites: presupuesto $0, no mezclar con Cantina-pos, no secretos ni correos, no migraciones a Neon `main` sin superar el gate de `docs/CONSTITUTION.md`, no despliegue de producción sin aceptación explícita.
- Próximo trabajo seguro: abordar identidad solo tras resolver D1–D8; mientras tanto, ampliar cobertura de autorización y preparar endpoints de negocio en entorno aislado, sin inventar políticas de registro ni OAuth.

---


# Índice principal de documentación y checkpoint vigente

> **Aviso de frescura:** los SHA y estados que aparecen en checkpoints históricos deben confirmarse en GitHub antes de usarse como estado actual. El checkpoint vigente está en `docs/HANDOFF_NEXT_CHAT.md`; no tratar los SHA de entradas antiguas como HEAD vivo.
>
> Documento rector: [Constitución del proyecto](CONSTITUTION.md). Sus reglas de coste, seguridad, identidad, integridad de datos y evidencia prevalecen sobre atajos.

## Checkpoint documental — 2026-10-18

- Repositorio: https://github.com/BTF14/Micro-app
- Rama de este cambio: `docs/constitution-and-plan-index`
- HEAD de `main` observado en la búsqueda de commits: `7863973ed6e3869f525c6c89fc16412e92158fc2`.
- La consulta de status checks para ese SHA devolvió una lista vacía; el estado actual de Actions queda **no verificado**. Consultar ejecuciones actuales antes de declarar éxito.
- No se desplegó producción ni se modificó Neon `main` en esta tarea.

## Panel visual de avance y salida a producción

- [Panel HTML](progress/index.html)
- [Gráfica SVG](progress/progress.svg)
- [Datos JSON](progress/progress.json)
- [Fuente de verdad: checklist de preparación](PRODUCTION_READINESS.md)
- Generador: [tools/project-progress.py](../tools/project-progress.py)

El panel distingue el avance de implementación del porcentaje de preparación para producción. Cada criterio solo se marca completado con evidencia. Los gates P0 pendientes bloquean la declaración de listo para producción, independientemente del porcentaje.

## Índice maestro de documentos

### Constitución, planificación y continuidad
- [Constitución](CONSTITUTION.md) — reglas no negociables.
- [Plan maestro](PROJECT_PLAN.md) — fases, prioridades, criterios de aceptación e índice.
- [Handoff siguiente chat](HANDOFF_NEXT_CHAT.md) — protocolo y prompt copiable.
- [Diario de estado](STATE_JOURNAL.md) — historial append-only.
- [Instrucciones de agentes](../AGENTS.md) — inicio y guardrails.
- [Modelo operativo de agentes](AGENT_OPERATING_MODEL.md) — roles, entregables y límites.
- [Protocolo continuidad IA/chat](AI_CONTINUITY_PROTOCOL.md).

### Producto, arquitectura y datos
- [Arquitectura y coste cero](ARCHITECTURE_AND_ZERO_COST.md)
- [Integración API](API_INTEGRATION.md)
- [Esquema de base de datos](DATABASE_SCHEMA.md)
- [Revisión del esquema](SCHEMA_REVIEW.md)
- [Inspiración POS](INSPIRATION.md)
- [Matriz de aceptación POS](POS_REFERENCE_MATRIX.md)

### Seguridad, fiscalidad y herramientas
- [Plan de seguridad 2026](SECURITY_PLAN_2026.md)
- [Checklist OWASP ASVS](OWASP_ASVS_CHECKLIST.md)
- [Requisitos de cumplimiento](COMPLIANCE_REQUIREMENTS.md)
- [Registro de herramientas y fuentes](RESOURCE_REGISTRY.md)
- [Evaluación Gentleman-Programming](GENTLEMAN_PROGRAMMING_EVALUATION.md)
- [Implementación Gentleman-Programming](GENTLEMAN_IMPLEMENTATION.md)

### Código, pruebas y automatización
- [CI](../.github/workflows/ci.yml)
- [Validación de migraciones](../.github/workflows/database-migration-validation.yml)
- [Escaneo de seguridad](../.github/workflows/security-scan.yml)
- [Semgrep](../.github/workflows/semgrep.yml)
- [Playwright E2E](../.github/workflows/playwright-e2e.yml)
- [Pruebas E2E frontend](../apps/web/e2e/auth.spec.ts)
- [Perfiles reutilizables de revisión](../.github/agents/)

Los enlaces indican documentación/código versionados, no que cada herramienta esté activa o cada control satisfecho. Los estados de ejecución se comprueban en vivo.

---

## Checkpoint actual — Gentleman-Programming (2026-10-18)

Se comenzó la implementación real en el commit `ae0c189487b37d910184b0b5cfa058ddbb6919d4`: `.gga` preparado para revisión local mediante Ollama, guía de implementación y enlace en README. **Aún no están instalados/ejecutándose GGA, Ollama, Engram ni Gentle-AI desde este entorno.** Verifica las tres Actions enlazadas en el handoff para el SHA exacto antes de declarar estado CI.

Siguiente prioridad de esta línea: probar GGA manualmente en un terminal local sin instalar el hook hasta validar el proveedor; luego Engram y Gentle-AI en un runtime compatible. Coste $0 y guardrails existentes permanecen obligatorios.

---

# Checkpoint vigente — 2026-10-18

> Este checkpoint se añade como referencia más reciente; las secciones históricas inferiores pueden contener snapshots antiguos. Antes de trabajar, verificar HEAD/Actions en vivo y registrar cualquier corrección.

- `main` verificado: `12c0037f3928b2c54c3593d3f48a65bf3318f401`.
- CI, validación de migración y escaneo de seguridad terminaron en success para ese SHA: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102740451), [migración](https://github.com/BTF14/Micro-app/actions/runs/39102740448), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39102740511).
- Handoff y prompt de continuidad: [docs/HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md).
- Evaluación de Gentleman-Programming (documental, sin instalación): [docs/GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md).
- Bloqueo P0 de identidad: revisar Google OAuth + allowlist + verificación de email; la revisión estática de `apps/api/src/auth.ts` no encontró esos componentes.
- Rama `feat/neon-transaction-adapter` requiere comparación y revisión de diff antes de rescatar cambios.
- Mantener $0, proyecto separado de Cantina-pos, sin mutaciones en Neon main, sin deploy de producción y sin secretos en Git.

---

## Estado vivo verificado — 2026-10-18 (prevalece sobre el historial inferior)

- Último SHA de `main` comprobado antes de este checkpoint documental: `995608af8584442a9f174f9cf55ed7861749b872` (`docs: refresh handoff with current repository state`).
- En el SHA anterior `8574bef7c5bc38cb85e55007816b6efc8b54a826`, [CI](https://github.com/BTF14/Micro-app/actions/runs/39102311090), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102311097) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102311100) terminaron en `success`. Para el SHA `995608af8584442a9f174f9cf55ed7861749b872`, las nuevas ejecuciones estaban `pending/queued` al consultarlas: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102649341), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102649354) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102649347). Reconsultar el SHA más reciente después de este commit documental; los checks verdes no demuestran que el producto esté listo para producción.
- El CI actual usa `pnpm install --frozen-lockfile`, ejecuta build, pruebas unitarias y `src/auth.integration.test.ts` con PostgreSQL efímero. La migración también se valida contra PostgreSQL desechable; no se ha autorizado migrar Neon main.
- `pnpm-lock.yaml` existe en main (tamaño 77,520 bytes al consultar el contenido de GitHub). La afirmación histórica de que no había lockfile ya no describe main.
- El último commit de código anterior a los documentos es `88d30d472905c81a90d9fffc967e3ba1df5084d1`, que conectó el flujo frontend de registro/login con la API. El contenido de `docs/API_INTEGRATION.md` conserva una frase antigua que dice lo contrario; debe corregirse para evitar contradicción.
- La rama `feat/neon-transaction-adapter` está en `7989a84e39536029819735a5202f3934a8eb12c3`; no se fusionó automáticamente. Debe revisarse su diff completo con respecto a main antes de decidir qué rescatar.
- Otras ramas que existen al comprobar GitHub: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Los SHA de las ramas pueden avanzar; volver a consultarlos antes de trabajar.
- Ya hay material persistente en `docs/INSPIRATION.md`, `docs/SECURITY_PLAN_2026.md`, `docs/API_INTEGRATION.md`, `docs/ARCHITECTURE_AND_ZERO_COST.md`, `docs/DATABASE_SCHEMA.md`, `docs/SCHEMA_REVIEW.md` y `docs/COMPLIANCE_REQUIREMENTS.md`. La continuidad debe enlazar y reconciliar estos documentos, no sustituirlos por un resumen corto.
- **Bloqueo de requisitos de identidad detectado en revisión del código:** `apps/api/src/auth.ts` solo expone `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no se encontró implementación de Google OAuth, allowlist ni verificación de email. La prueba de integración `apps/api/src/auth.integration.test.ts` tiene un escenario principal de registro/login/sesión/revocación, no la matriz completa de autorización. Esto contradice el requisito previamente acordado de acceso Google + allowlist y debe tratarse como P0 antes de considerar identidad lista; no declarar producción-ready. No cambiar el modelo de identidad ni enviar correos sin decisión del usuario.
- Se añaden el modelo operativo de agentes, el registro de recursos y el diario de estado. Los archivos `.github/agents/*.agent.md` definen roles reutilizables en entornos compatibles con agentes; no implican que GitHub Actions ni este chat estén ejecutando agentes autónomos en segundo plano.

# Micro app — plan maestro y estado de continuidad

## Índice de memoria operativa persistente

- [Plan maestro](PROJECT_PLAN.md)
- [Modelo operativo de agentes/subagentes](AGENT_OPERATING_MODEL.md)
- [Registro de herramientas, repositorios y fuentes](RESOURCE_REGISTRY.md)
- [Diario cronológico de estado y decisiones](STATE_JOURNAL.md)
- [Inspiración POS](INSPIRATION.md)
- [Plan de ciberseguridad 2026](SECURITY_PLAN_2026.md)
- [Integración API/Neon](API_INTEGRATION.md)
- [Arquitectura y coste cero](ARCHITECTURE_AND_ZERO_COST.md)
- [Esquema de base de datos](DATABASE_SCHEMA.md) · [Revisión del esquema](SCHEMA_REVIEW.md) · [Cumplimiento](COMPLIANCE_REQUIREMENTS.md)

**Última actualización:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Rama base de referencia:** `main`  
**Propósito:** documento operativo para que cualquier nuevo chat o colaborador pueda continuar el trabajo sin depender del historial de conversación.

> Este documento es la fuente de verdad del plan y del estado conocido. Antes de actuar, comprobar el SHA actual de `main`, las ramas/PR abiertos y GitHub Actions. Si el repositorio ha cambiado desde esta actualización, corregir el estado aquí mediante un commit.

## 1. Objetivo del producto

Crear un punto de venta (POS) y sistema de inventario profesional para PC, tablet y teléfono, con:

- Catálogo de productos, códigos de barras, categorías, proveedores y alertas de bajo inventario.
- Entradas, salidas, ajustes y trazabilidad del inventario.
- Caja y ventas, descuentos autorizados, pagos mixtos, cálculo de cambio, recibos, devoluciones y cierres.
- Informes y auditoría de operaciones.
- Autenticación, sesiones revocables, roles y aislamiento estricto entre organizaciones/comercios.
- USD como moneda base y conversión a VES usando una tasa BCV validada, con fuente, fecha efectiva y hora de consulta.
- Interfaz responsive, accesible y usable por teclado; temas automático (sistema), claro y oscuro, con preferencia manual persistente.
- Pruebas unitarias, integración con PostgreSQL desechable y E2E en vistas de escritorio/móvil.

No presentar la aplicación como lista para operar un comercio hasta que las funciones, autorización, persistencia, pruebas y configuración de despliegue hayan sido implementadas y verificadas.

## 2. Restricciones no negociables

1. **Neon main no está autorizado para migraciones.** Se permite inspección de solo lectura en la rama principal. Las migraciones y pruebas se preparan y validan en PostgreSQL efímero o en ramas desechables aisladas. No ejecutar cambios sobre Neon main sin autorización explícita y específica posterior.
2. **Coste total objetivo: $0.** No activar facturación, planes de pago, suscripciones ni cargos automáticos. Antes de crear recursos, comprobar que sean gratuitos y sus límites.
3. **Independencia total:** no reutilizar repositorios, bases de datos, secretos, despliegues, dominios ni configuración de Cantina-pos u otros proyectos.
4. No desplegar a producción ni hacer cambios irreversibles sin aceptación del usuario.
5. No imprimir, registrar, versionar ni compartir secretos, tokens, contraseñas o cadenas de conexión. Usar variables de entorno locales ignoradas y gestores de secretos.
6. Hacer cambios reales, pequeños y verificables; actualizar el plan en el repositorio. No afirmar que una prueba o workflow pasó sin revisar el resultado real del SHA correspondiente.
7. No pedir al usuario que repita conexiones/permisos ya configurados, salvo que se haya identificado un bloqueo concreto y comprobable.

## 3. Arquitectura objetivo

- **Frontend:** React + Vite + TypeScript; despliegue estático previsto en Cloudflare Pages.
- **API:** Hono + TypeScript sobre Cloudflare Workers.
- **Base de datos:** PostgreSQL independiente en Neon Free; migraciones versionadas y revisadas.
- **CI:** GitHub Actions; pruebas, compilación/typecheck y escaneos de seguridad.
- **Pruebas:** Vitest, PostgreSQL temporal para integración, Playwright para E2E.
- **Dependencias:** open source y sin componentes premium. Mantener la aplicación portable.
- No usar Vercel Hobby como alojamiento objetivo para un POS comercial. No crear recursos facturables para sortear límites gratuitos.

## 4. Estado del repositorio al preparar este documento

### Referencia comprobada

- La rama `main` se encontraba en el commit `88d30d472905c81a90d9fffc967e3ba1df5084d1`, mensaje `Connect frontend sign-in and registration to auth API`.
- PR #4 (`Add initial authentication and revocable sessions`) figura como **fusionado** el 2026-10-17, con merge commit `e9e146020e7195c12da5f880a5dbf26b4e96752c`.
- El commit de integración del frontend declara que CI, escaneo de seguridad y validación de migración pasaron. Reconfirmar los workflows de la punta actual de `main` antes de usar esto como garantía de estado actual.
- La rama `feat/neon-transaction-adapter` existía y, al compararla con `main`, tenía 14 commits por delante y 5 por detrás. Incluye trabajo adicional de adaptador de base de datos, pruebas y plan de seguridad. **No asumir que esa rama es segura para fusionar**: primero sincronizar/revisar el diff, evitar sobrescribir cambios posteriores de `main` y verificar cada workflow. No mezclarla a ciegas.
- Ramas observadas: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/neon-transaction-adapter`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Reconsultar su estado real al continuar.
- El documento de transferencia anterior tenía secciones históricas contradictorias. Esta sección y el archivo `docs/HANDOFF_NEXT_CHAT.md` actualizado deben prevalecer sobre anotaciones antiguas.

### Ya presente en el código (revalidar en archivos/CI)

- Base de frontend React/Vite y API Hono/Workers.
- Rutas de autenticación inicial: registro, login, sesión actual y logout/revocación.
- Hash de contraseñas PBKDF2-SHA-256 y almacenamiento de hashes de tokens de sesión.
- Cookie HttpOnly, comprobación de origen configurado y límites de intentos persistidos en base de datos.
- Integración inicial de pantallas de registro/login del frontend con la API.
- Esquema/migración SQL versionados y workflows de validación en PostgreSQL temporal.
- Escaneo de seguridad con Trivy incorporado en una rama de trabajo; confirmar si el workflow y el archivo de plan ya están en `main` antes de darlos por integrados.

### Aún no debe considerarse listo

- No hay POS comercial completo ni flujo de ventas/inventario terminado.
- No declarar autenticación lista para producción sin pruebas de integración completas, revisión de seguridad, limpieza/retención de sesiones y límites, configuración de cookies/orígenes para los dominios finales y verificación del CI actual.
- No hay integración BCV terminada.
- No hay despliegue de producción aprobado.
- La migración de esquema no debe aplicarse a Neon main sin autorización expresa.

## 5. Plan por fases y criterios de salida

### Fase 0 — Base reproducible, seguridad y CI (P0)

- [ ] Comprobar `main`, PRs, commits y Actions más recientes.
- [ ] Confirmar instalación reproducible y lockfile real de pnpm; nunca inventar un lockfile.
- [ ] Revisar `.gitignore`, ejemplos `.env.example`, Wrangler y manejo de secretos.
- [ ] Revisar workflows y permisos mínimos; escaneo de dependencias/configuración/secretos.
- [ ] Mantener documentación de arquitectura, amenazas, pruebas y decisiones.
- **Salida:** CI verde en el SHA actual; sin secretos versionados; instrucciones locales reproducibles.

### Fase 1 — Autenticación, sesiones y aislamiento multiempresa (P0)

- [ ] Completar pruebas de integración HTTP con PostgreSQL efímero: registro, creación atómica de usuario/organización/membresía/sesión, email duplicado, login correcto/incorrecto, `/auth/me`, usuario o membresía inactivos, logout, revocación y fallos de DB.
- [ ] Verificar que un fallo de revocación no se reporte como logout exitoso.
- [ ] Probar autorización por organización en cada consulta y operación; evitar BOLA/IDOR y escalada de privilegios.
- [ ] Revisar rate limiting, retención/limpieza de contadores y limpieza de sesiones expiradas.
- [ ] Validar expiración de sesión, origen permitido, cookie HttpOnly/Secure/SameSite según despliegue, mensajes de error genéricos y manejo de datos malformados.
- [ ] Definir recuperación de cuenta/verificación de email/MFA solo con decisión de producto y opciones gratuitas verificadas; no añadir servicios de pago.
- **Salida:** pruebas de integración fiables y autorización del lado del servidor. No fusionar código no revisado solo porque un workflow esté verde.

### Fase 2 — Datos y adaptador PostgreSQL (P0)

- [ ] Revisar el trabajo de `feat/neon-transaction-adapter` contra el `main` actual, archivo por archivo; sincronizar la rama antes de considerar PR.
- [ ] Probar adaptador y transacciones contra PostgreSQL temporal, con pruebas de errores y rollback.
- [ ] Validar migraciones desde cero y restricciones en base efímera.
- [ ] Confirmar aislamiento multiempresa mediante claves foráneas/consultas y pruebas cruzadas.
- [ ] Mantener el esquema en revisión; Neon main solo lectura hasta autorización.
- **Salida:** integración de DB probada sin depender de Neon principal.

### Fase 3 — Catálogo e inventario (P0)

- [ ] CRUD de productos/categorías y códigos de barras con validación de servidor.
- [ ] Proveedores y recepción de mercancía.
- [ ] Movimientos de inventario auditables: entradas, salidas, ajustes y motivo/usuario.
- [ ] Política explícita de stock negativo; controles seguros ante concurrencia.
- [ ] Alertas de inventario bajo.
- **Salida:** cada cambio de existencia se explica mediante un movimiento persistido y autorizado.

### Fase 4 — Tasa USD/VES (P0 para conversión)

- [ ] Elegir una fuente verificable y revisar términos, disponibilidad y límites gratuitos.
- [ ] Guardar fuente, valor, fecha efectiva, fecha/hora de consulta y estado.
- [ ] Validar tasa positiva y respuesta; conservar última tasa válida ante fallos y avisar de datos desactualizados.
- [ ] No marcar una tasa obsoleta solo porque sea fin de semana/feriado si sigue vigente.
- [ ] Evitar afirmar que un tercero es una API oficial del BCV sin evidencia.
- **Salida:** pruebas de respuestas inválidas, retrasos, fallos y cambios de tasa; historial auditable.

### Fase 5 — Caja, ventas y devoluciones (P0)

- [ ] Carrito, búsqueda/escaneo, descuentos sujetos a permisos y cálculo de totales.
- [ ] Venta, pagos, cambio, stock, movimientos y auditoría dentro de una transacción atómica.
- [ ] Idempotencia por organización; misma clave con payload distinto debe rechazarse.
- [ ] Guardar instantáneas inmutables de descripción/precio/tasa USD/VES usados en cada venta.
- [ ] Usar precisión decimal en PostgreSQL y aritmética decimal segura; no persistir importes mediante aritmética flotante JS.
- [ ] Reintentos no duplican ventas; concurrencia no consume stock de más; fallo revierte todo.
- [ ] Devoluciones/anulaciones mediante operaciones de reverso auditables, nunca borrar silenciosamente ventas finalizadas.
- [ ] Recibos claramente etiquetados como control interno hasta validar requisitos fiscales aplicables.
- **Salida:** pruebas de concurrencia, rollback, idempotencia, cálculos y permisos.

### Fase 6 — Interfaz y operación (P1)

- [ ] Elegir una dirección visual antes de pulir la UI; no asumir que una paleta provisional está aprobada.
- [ ] Completar navegación y flujo de caja, catálogo e inventario para móvil/tablet/escritorio.
- [ ] Temas automático/claro/oscuro con elección manual persistente.
- [ ] Accesibilidad: teclado, foco visible, contraste, etiquetas y mensajes de error.
- [ ] Reportes, cierres de caja, exportación autorizada y auditoría.
- [ ] Definir respaldos/restauración, privacidad, retención y eliminación de datos.
- [ ] Playwright E2E en viewports de escritorio y móvil.
- **Salida:** flujos principales probados de extremo a extremo y documentación operativa.

### Fase 7 — Cumplimiento, preview y lanzamiento (bloqueado hasta aceptación)

- [ ] Confirmar con asesoría competente obligaciones locales aplicables (IVA/IGTF, SENIAT, documentos fiscales y equipos autorizados); no codificar tasas fiscales universales sin revisión.
- [ ] Preparar política de privacidad, términos, contacto real del responsable y transparencia de terceros.
- [ ] Revisar seguridad, recuperación ante fallos, respaldos y límites de planes gratuitos.
- [ ] Solo cuando el usuario acepte y los flujos críticos estén probados, valorar un preview gratuito y aislado.
- [ ] Producción requiere aceptación explícita y no debe activar costes automáticos.
- **Salida:** checklist completo y aprobación del usuario. No declarar certificación legal/fiscal.

## 6. Plan de ciberseguridad 2026 y referencias

Estas referencias son guías de revisión; no implican certificación y no se debe copiar código sin revisar licencia/compatibilidad.

| Prioridad | Recurso | Aplicación prevista |
|---|---|---|
| P0 | [OWASP Cheat Sheet Series](https://github.com/OWASP/CheatSheetSeries) | Sesiones, autenticación, autorización, secretos, validación y logs. |
| P0 | [OWASP ASVS](https://github.com/OWASP/ASVS) | Lista de controles y criterios de aceptación. |
| P0 | [OWASP API Security](https://github.com/OWASP/API-Security) | Pruebas BOLA/IDOR, autenticación, autorización y abuso de recursos. |
| P1 | [GitHub CodeQL](https://github.com/github/codeql) | SAST para JS/TS si permisos y cobertura están disponibles. |
| P1 | [Semgrep](https://github.com/semgrep/semgrep) y [reglas](https://github.com/semgrep/semgrep-rules) | SAST; revisar licencia, cobertura y falsos positivos. |
| P1 | [Trivy](https://github.com/aquasecurity/trivy) | Dependencias, configuración, secretos y SBOM; confirmar cobertura del workflow. |
| P2 | [OWASP ZAP](https://github.com/zaproxy/zaproxy) | DAST en preview/staging aislado, nunca escaneo activo de producción. |
| P2 | [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) | Blanco de entrenamiento aislado; no integrar código vulnerable en Micro app. |
| Condicional | [Apache Casbin Node](https://github.com/apache/casbin-node-casbin) | Revaluar si las políticas de autorización crecen; no instalar sin verificar compatibilidad Workers. |

**Límite importante:** `express-rate-limit` es middleware de Express; no instalarlo directamente en Hono/Workers. El rate limiting debe adaptarse a la plataforma y al modelo distribuido, no depender solo de memoria local.

## 7. Orden inmediato de trabajo

1. Leer este archivo y `docs/HANDOFF_NEXT_CHAT.md`; consultar el SHA actual de `main`, ramas/PRs y Actions.
2. Actualizar el handoff con la punta real del repositorio y el siguiente paso confirmado.
3. Revisar la rama `feat/neon-transaction-adapter` contra `main`; comprobar sus cambios y CI sin fusionarla a ciegas.
4. Confirmar/añadir pruebas de integración de autenticación sobre PostgreSQL efímero y revisar los puntos de seguridad de la Fase 1.
5. Arreglar lockfile/reproducibilidad y seguridad de CI según evidencia real.
6. Seguir por catálogo/inventario, tasa, ventas, devoluciones, UX y E2E, en pequeños cambios con pruebas.
7. Después de cada avance: commit/push, consultar Actions del SHA nuevo, actualizar este plan y anotar lo que realmente pasó.
8. No desplegar producción ni aplicar migraciones a Neon main.

## 8. Prompt para continuar en otro chat

Copia y pega:

> Continúa Micro app leyendo primero `docs/PROJECT_PLAN.md` y `docs/HANDOFF_NEXT_CHAT.md` en https://github.com/BTF14/Micro-app. Verifica el estado real del repositorio, el SHA de main, las ramas/PR y GitHub Actions; no confíes en estados históricos. Trabaja directamente sobre el código existente, realiza cambios seguros, súbelos a GitHub y documenta el resultado en esos dos archivos. Prioriza revisar la rama feat/neon-transaction-adapter contra main y completar/revisar las pruebas de integración de autenticación con PostgreSQL temporal antes de fusionar nada más. No apliques migraciones a Neon main, no conectes otros proyectos, no despliegues producción y mantén el coste total en $0. Nunca expongas secretos ni me pidas repetir conexiones/permisos sin demostrar un bloqueo concreto. Indica commits, pruebas y checks verificados de verdad.


## Checkpoint — herramientas investigadas implementadas en rama de trabajo (2026-10-18)

Rama: `feat/security-e2e-tooling`. Se agregaron una configuración Playwright y dos pruebas de navegador de autenticación con API simulada, un workflow Chromium de CI, un workflow Semgrep JS/TS y el checklist OWASP ASVS y matriz de criterios POS.

**Estado verificado:** en SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`, CI, validación de migración, Security scan, Semgrep y Playwright E2E terminaron en success: [CI](https://github.com/BTF14/Micro-app/actions/runs/39104699632), [migración](https://github.com/BTF14/Micro-app/actions/runs/39104699591), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39104699568), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39104699596), [Playwright](https://github.com/BTF14/Micro-app/actions/runs/39104699653). Estos resultados no garantizan producción ni cubren backend real con las pruebas E2E. Playwright se instala de forma temporal en el workflow (`@playwright/test@1.55.0`) para no modificar el lockfile en esta operación; esto es un piloto y deja pendiente incorporarlo correctamente a `apps/web/package.json` y `pnpm-lock.yaml` cuando pueda ejecutarse pnpm 10 y validarse el lockfile. Las pruebas mockean la API y no demuestran que Google OAuth, allowlist, autorización multiempresa o backend estén completos.

No se instala CodeQL (coste/permisos de code scanning privado por confirmar), Casbin ni middleware Express incompatible; ZAP queda para una preview aislada y Juice Shop solo para laboratorio. Mantener presupuesto $0 y no apuntar herramientas dinámicas a producción.


## Fusión verificada — 2026-10-18

PR [#6](https://github.com/BTF14/Micro-app/pull/6) fusionado con squash en `main`, commit `dfe6d3efce5eddc10c25c42642faf5ea8b44eedb`. CI, migración, Trivy, Semgrep y Playwright E2E pasaron para el head de PR `df84d056d3edbc2191ac0fd34a39e18f3632ce03`. GitHub Actions se están ejecutando de nuevo sobre el commit de merge; no declarar el nuevo SHA verde hasta consultar esas ejecuciones.


## Sistema de trabajo SDD y agentes

- Proceso: [docs/SDD_WORKFLOW.md](SDD_WORKFLOW.md).
- Perfiles reutilizables: [`.github/agents/`](../.github/agents/), incluyendo explorador, planificador, implementador, revisor y documentador.
- Plantillas: [spec](../templates/sdd/spec.md), [plan](../templates/sdd/plan.md), [tasks](../templates/sdd/tasks.md).
- Skill: [feature-sdd](../skills/feature-sdd/SKILL.md).
- Memoria durable: GitHub, [diario de estado](STATE_JOURNAL.md), [registro de recursos](RESOURCE_REGISTRY.md) y [handoff](HANDOFF_NEXT_CHAT.md). No guardar secretos ni datos de clientes.
- Estado de herramientas: los perfiles y el flujo están versionados; esto no significa que GGA, Ollama, Engram, Gentle-AI, MCP ni subagentes estén instalados o conectados a este chat.
- Próxima mejora: automatizar validación de artefactos SDD y enlazar specs a issues/PRs sin permitir saltarse los controles de Neon main, producción o costes.


## SDD y continuidad entre chats — 2026-10-18

El flujo SDD, sus plantillas y perfiles de roles están en la rama `feat/sdd-agent-workflow` y PR [#9](https://github.com/BTF14/Micro-app/pull/9). Los workflows asociados al HEAD `68659d1c1ec0cb9996293f78f9bd487e95124bbf` se comprobaron en `success` (CI, migraciones, seguridad/Trivy, Semgrep, Playwright E2E y validación SDD; el dashboard también tuvo éxito). El PR debe verificarse como fusionado antes de afirmar que esos archivos están en `main`. Playwright en este proyecto usa mocks para el piloto y no certifica integración real API+DB. No hubo despliegue de producción ni mutación de Neon `main`.


## SDD y continuidad entre chats — resultado de integración

PR [#9](https://github.com/BTF14/Micro-app/pull/9) está fusionado en `main` mediante `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`. Para el HEAD del PR `ba1eebbe45b11e6e0b3562795cdb6c26b5c31c63`, CI, validación de migraciones, Security/Trivy, Semgrep, Playwright E2E, dashboard y validación SDD terminaron en `success`. Esta evidencia corresponde al HEAD del PR; comprobar Actions para el commit de merge antes de certificar el estado de `main`. Playwright usa mocks y no acredita integración real API+DB. No hubo despliegue de producción ni mutación de Neon `main`.


## Herramienta de pentesting Strix (añadido 2026-10-18)

- Recurso: https://github.com/usestrix/strix. Plan detallado: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md).
- Uso previsto: pentesting dinámico autorizado cuando la API y el entorno efímero/staging estén preparados; prioridad a auth/sesiones, aislamiento multiempresa, BOLA/IDOR, validación de entradas y configuración.
- No ejecutar en producción, Neon main, datos reales ni sistemas de terceros. Empezar con laboratorio aislado y datos sintéticos; revisar manualmente hallazgos y añadir pruebas de regresión.
- Requisitos/coste: Docker y un proveedor LLM; confirmar que el proveedor local o elegido no cuesta dinero antes de ejecutar. No habilitar billing ni añadir secretos/workflows de CI sin validar el coste y la seguridad.
- Estado: documentado para evaluación, no instalado ni ejecutado; no se ha escaneado Micro app. Primero resolver el bloqueo P0 de autenticación/allowlist y preparar PostgreSQL efímero.


## Herramienta Strix — adopción planificada (2026-10-18)

- Recurso: https://github.com/usestrix/strix. Plan operativo: [STRIX_INTEGRATION.md](STRIX_INTEGRATION.md).
- Incorporar Strix cuando la API y un entorno de pruebas aislado estén preparados; priorizar autenticación, sesiones, separación entre organizaciones, validación de entradas y configuración.
- Empezar con laboratorio o entorno efímero autorizado y datos sintéticos. No apuntar a producción, Neon main ni sistemas de terceros.
- Requiere Docker y un proveedor de modelo de lenguaje. Verificar coste total de $0, aislamiento y manejo de informes antes de ejecutarlo; no habilitar facturación ni añadirlo a CI hasta una evaluación separada.
- Estado: documentado para evaluación, aún no instalado ni ejecutado. Resolver primero el bloqueo P0 de autenticación/allowlist y preparar pruebas con PostgreSQL efímero.


## Continuidad verificada — PR #19/#20 y handoff (2026-10-18)

- HEAD de `main` consultado: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19) se fusionó por squash en ese SHA; registra opciones D1–D8 para Google Sign-In/allowlist, explícitamente propuestas pendientes de aprobación.
- PR [#20](https://github.com/BTF14/Micro-app/pull/20) se fusionó previamente en `c87361685ef1ce36e4cf6025124b09e70ffa0846`; incorpora el plan de evaluación controlada de Strix.
- En el HEAD actual indicado, CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y panel de progreso finalizaron en `success`: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129579631). Los tests E2E actuales usan API simulada; no acreditan integración real API+DB ni producción.
- Strix está documentado para que futuras IA sepan cuándo y cómo usarlo, pero no está instalado/ejecutado y no se ha escaneado Micro app. Mantenerlo fuera de CI activa hasta validar aislamiento y coste $0.
- Siguiente prioridad: revalidar en vivo la autenticación actual y resolver D1–D8 sin inventar políticas; preparar PostgreSQL efímero y pruebas de autorización multiempresa. Backup/restore independiente sigue sin automatización ni restauración real verificada.
- Ver también [handoff](HANDOFF_NEXT_CHAT.md) para el prompt de continuidad y guardrails. No se modificó Neon ni se desplegó producción.


## Revalidación operativa — 2026-10-18

- Estado vivo: `main` = `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`; PR #21 continúa abierta y sin fusionar en head `fb9ab271cc8b1c72e92d7874672913698c59bfe7`.
- Para el HEAD de PR #21, CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard dieron `success`; véanse los enlaces actuales en `docs/HANDOFF_NEXT_CHAT.md`. El aviso del bot Codex sigue sin detalle de hallazgo reproducible (review/comments inline vacíos, bot alcanzó límite); no tratarlo como aprobación ni como vulnerabilidad confirmada.
- P0 sigue abierto: `apps/api/src/auth.ts` aún permite registro por contraseña con creación de organización/rol owner/sesión sin allowlist y no contiene Google OAuth. El test API+PostgreSQL efímero actual valida el flujo de contraseña/sesiones, no OAuth/allowlist ni la matriz cross-tenant completa.
- D1–D8 siguen sin aprobar en `docs/sdd/auth-policy-decision-record.md`; no implementar política de identidad/organización hasta que haya decisión explícita. Mientras tanto, no habilitar usuarios/datos comerciales reales ni declarar identidad lista.
- Siguiente orden: (1) resolver D1–D8; (2) diseñar/implementar fail-closed y Google Sign-In con pruebas negativas; (3) ampliar pruebas de autorización/aislamiento multiempresa con PostgreSQL efímero; (4) comparar rama `feat/neon-transaction-adapter` contra main sin merge ciego; (5) piloto Strix solo después de disponer de API+DB efímera y proveedor local gratuito verificado.
- No hubo despliegue de producción, mutación de Neon, cambio de secretos ni coste añadido. Rama `main` no está protegida en GitHub (`protected=false`, sin checks requeridos); evaluar protección como tarea de gobernanza separada.

## Checkpoint posterior a PR #21 — 2026-10-18

- PR #21 (`docs: refresh handoff for next chat`) quedó fusionada por squash; merge commit `7491b97a2bde52555fe9b8a5d808ad81b829d90e`.
- El alcance fue documentación solamente; no cambia el estado de autenticación/allowlist P0 ni aprueba las decisiones D1–D8.
- CI, E2E, migraciones, Semgrep, seguridad y dashboard habían pasado en el SHA exacto de la PR; la revisión Codex no concluyó por límite de uso y no debe registrarse como aprobación formal.
- Siguiente prioridad de producto/técnica sigue siendo resolver decisiones D1–D8 sin suposiciones, luego implementar y probar auth fail-closed y aislamiento multi-tenant con PostgreSQL efímero. No desplegar producción.


---

## Seguridad API — coherencia HTTPS de FRONTEND_ORIGIN (2026-10-29)

**Objetivo:** eliminar la divergencia entre la validación global de CORS/configuración y la validación específica del flujo Google OAuth.

- [x] Implementar en la rama `fix/google-auth-frontend-origin-https-20261029`: HTTPS; HTTP solo para `localhost`, `127.0.0.1` y `[::1]`; rechazar HTTP remoto, credenciales, rutas, query, fragmentos y orígenes no canónicos. Pendiente de merge.
- [ ] Añadir pruebas unitarias negativas y positivas para el helper usado por OAuth.
- [ ] Ejecutar tests API, typecheck/build y CI/SAST/E2E en el SHA exacto.
- [ ] Revisar diff y obtener la revisión requerida antes de merge.
- [ ] Tras merge, verificar main y checks post-merge; no inferir despliegue productivo por previews.

**Gate:** no cambiar el contrato bootstrap ni secretos. Esta corrección de configuración no certifica el flujo OAuth completo ni la preparación comercial.

**Siguiente fase de producto (bloqueada por diseño/aprobación):** cerrar ownership de catálogo/precios, inventario por sucursal, compras/recepciones, caja/turnos, devoluciones y matriz de permisos organización/sucursal. Mantener stack React/Vite/TypeScript + Workers/Hono + Neon/Drizzle; no reescribir ni introducir microservicios sin medición. Capacidad por organización/sucursal: no determinada hasta pruebas sintéticas y auditoría de cuotas Neon/Cloudflare.


## Actualización del plan — reconciliación posterior a PR #155 (2026-10-29)

### Completado
- [x] PR #153 fusionada: bootstrap ya no transporta el token en query string; POST protegido y validado.
- [x] PR #155 fusionada: validador de `FRONTEND_ORIGIN` en Google OAuth exige HTTPS salvo loopback HTTP y rechaza URLs con credenciales/componentes extra.
- [x] En SHA `824e4d02fe4aa56a92c8e6493e65989d4325eaa9`, ocho workflows finalizaron success: CI, E2E, migraciones, SAST, security, dependency review, secret history y dashboard.

### Pendiente / orden de ejecución
1. [ ] Cerrar reconciliación documental de PR #154 mediante PR #156; cerrar #154 solo después de confirmar que todo su contenido útil quedó preservado.
2. [ ] Completar auditoría read-only de esquema, FKs, índices, queries, rutas y límites de tenant.
3. [ ] Proponer contrato de organización, sucursales, catálogo/precios, inventario por sucursal, compras/recepciones, caja/turnos y devoluciones.
4. [ ] Obtener aprobación del propietario para la matriz de permisos por rol y alcance organización/sucursal.
5. [ ] Diseñar invariantes y transacciones de ventas, líneas, pagos, stock y auditoría; añadir idempotencia y pruebas de concurrencia sobre PostgreSQL efímero.
6. [ ] Medir límites de Neon y Cloudflare con cuotas/consumo actual y pruebas sintéticas; no prometer número de empresas/locales sin datos.
7. [ ] Solo después de los gates anteriores implementar productos/proveedores, inventario y luego POS/ventas/caja en PRs coherentes y acotadas.

**Arquitectura elegida:** conservar React/Vite/TypeScript, Cloudflare Pages, Workers/Hono, Neon PostgreSQL y Drizzle. No reescritura, microservicios, Redis ni servicios de pago anticipados sin evidencia medible. Presupuesto objetivo $0.

**Estado de salida:** producción NO lista. No tocar Neon main, secretos, datos reales ni producción; no aplicar migraciones sin diseño y autorización.

---

## SaaS multi-organización y operaciones POS — dirección 2026-10-29

Dirección de producto: una plataforma multi-organización, multi-sucursal y multiusuario. El catálogo/precio es compartido por organización por defecto; existencias, cajas y operaciones pertenecen a sucursal/almacén. BCV se actualizará mediante job programado validado y caché de lectura; el buscador prioriza barcode/SKU, SQL indexado y límites; KV de catálogo queda condicionado a benchmark. Las ventas deben validar precio/stock/tasa en transacción y conservar snapshots. Ver [SAAS_ARCHITECTURE_DECISIONS.md](./SAAS_ARCHITECTURE_DECISIONS.md) para reglas y pendientes.

### Fases pendientes
1. Auditoría read-only y ERD/scope.
2. Aprobación/reconciliación de roles y operaciones sensibles.
3. Diseño de migraciones y pruebas cross-tenant/cross-branch.
4. Catálogo/búsqueda, inventario, compras, caja, ventas, devoluciones y transferencias.
5. Fuente BCV y job de actualización con fallback.
6. Benchmarks Neon/Cloudflare y definición de cuotas comerciales.

No declarar comercial/producción listo hasta completar flujos, seguridad, pruebas, backups, observabilidad y capacidad.


## Arquitectura comercial configurable por organización — 2026-10-30

- La plataforma no impone reglas universales de descuentos ni límites comerciales. Cada organización define si los permite y sus condiciones.
- La capacidad técnica prevista incluye configuración versionada por organización, evaluación server-side, aislamiento tenant-scoped, snapshots históricos y auditoría.
- Diseño de referencia: `docs/sdd/ORGANIZATION_COMMERCIAL_POLICY_CONFIGURATION.md`.
- Estado: diseño documental; no implementado. La matriz de roles sigue pendiente de aprobación y bloquea la implementación de autorización comercial.
- Criterios previos a código: ERD multi-sucursal; alcance de roles y asignaciones aprobado; integridad venta/líneas/pagos/stock; idempotencia y auditoría; pruebas PostgreSQL efímeras cross-tenant/cross-branch, concurrencia y rollback.
