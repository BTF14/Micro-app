## Aclaración de Cloudflare — previews de PR #207 — 2026-11-05 UTC

- Los comentarios automáticos de Cloudflare en [PR #207 Workers](https://github.com/BTF14/Micro-app/pull/207#issuecomment-6649952138) y [PR #207 Pages](https://github.com/BTF14/Micro-app/pull/207#issuecomment-6649953153) informan despliegues satisfactorios de destinos etiquetados como Commit Preview y Branch Preview para el commit `26c5270`.
- Workers Build ID asociado: `0c8394a1-4d91-4061-a850-6c78f3b11295`. Pages publica preview de commit y de rama. Esta evidencia confirma previews reportados por la integración; no certifica el entorno productivo ni el tráfico activo.
- El build histórico objetivo `3542c660-e5e3-435e-8be5-dbed236cec1c` sigue sin inspección autenticada. Tampoco se ha demostrado si la versión de #207 fue únicamente preview o si hubo una acción adicional sobre producción.
- No se cambia el estado **NO LISTO PARA PRODUCCIÓN**. No modificar Cloudflare, Neon, secretos, DNS, billing ni datos reales.

---

## Estado de preparación — 2026-11-05 00:50 EDT

**Estado: NO LISTO PARA PRODUCCIÓN.**

- Main sigue en `7b0f057b8c152515005feed40305143c0ebb94b0`; la vertical slice de inventario permanece en PRs Draft, no integrada.
- PR #207 `26c5270664b82aebc6a12fafe6973de8544bc6f7` añade una propuesta de hardening append-only para `audit_logs`, apilada sobre #200. Sus 7/7 workflow runs y 9/9 check runs pasan, pero no está fusionada.
- En PostgreSQL 18 desechable, la migración 0007 y sus assertions bloquean UPDATE/DELETE/TRUNCATE y prueban el contrato de un rol runtime sintético no propietario con SELECT/INSERT. Se verifican rollback de migración y rollback de operaciones de catálogo/conteos cuando falla la auditoría.
- **No verificado en producción:** rol efectivo del secreto Worker `DATABASE_URL`, propiedad de `audit_logs` y privilegios efectivos. No se leyó el secreto ni se accedió a Neon producción. La prueba sintética no acredita la configuración runtime real.
- Secuencia pendiente de integración: inventario 0005 (#200), roles 0006 (renumerar #194), audit_logs 0007 (#207). No integrar mientras exista colisión.
- Issue #53 permanece abierta/P0; falta cobertura completa de autorización y aislamiento tenant/sucursal/rol, más flujos comerciales y gates operativos.
- No se cambió manualmente Cloudflare ni se activó Worker Previews. El check automático `Workers Builds: micro-app-api` de #207 tiene un registro de detalles bajo `/production/builds/`; el dashboard devolvió `login_required`, por lo que el destino y si produjo una publicación/despliegue siguen NO VERIFICADOS. No declarar que producción no fue afectada hasta inspección autenticada de solo lectura. No se modificaron Neon, secretos, DNS, billing ni datos reales.

### Gate de auditoría general

No marcar `audit_logs` como inmutable en producción hasta demostrar que el runtime es no propietario, no puede alterar privilegios/triggers y solo tiene los permisos necesarios para leer/insertar. Los triggers propuestos son un control de base de datos en la rama #207, no una verificación del rol real.

---

## Corrección de seguridad Cloudflare — Worker Previews vs Version URLs — 2026-11-04 22:00 EDT

Esta aclaración corrige la formulación demasiado amplia de addenda anteriores: **no existe una prohibición permanente de usar Worker Previews**. El gate es no cambiar el modo de builds de Cloudflare hasta comprobar aislamiento y aceptar el cambio irreversible del flujo existente.

### Evidencia directa en el código de la rama #200

- `apps/api/wrangler.toml` en `feat/inventory-vertical-slice-mainline-20261104` declara `[previews.vars] APP_ENV = "preview"`; la dependencia `apps/api/package.json` declara Wrangler `^4.155.0`, superior al mínimo documentado por Cloudflare para Worker Previews (4.135.0).
- `apps/api/src/index.ts` instala un middleware global antes de registrar rutas: si `APP_ENV === "preview"` o el hostname es un `workers.dev` distinto del Worker productivo, solo permite `/health`; las demás rutas responden 503 `PREVIEW_API_DISABLED`. Esto cubre auth, catálogo, escritura e inventario.
- `apps/api/src/index.test.ts` ya prueba: API apagada incluso cuando se simula un `DATABASE_URL` de producción; bloqueo por hostname workers.dev aunque falte `APP_ENV`; y disponibilidad exclusiva de `/health`. Es una defensa de aplicación comprobada por tests unitarios, no prueba por sí sola de aislamiento Cloudflare ni sustituye credenciales separadas.
- No hay `DATABASE_URL` ni otros secretos declarados en el bloque `[previews.vars]` versionado. No se ha verificado en esta sesión el Previews Base/secret store del dashboard; no afirmar que está vacío.

### Distinción decisiva

- `npx wrangler versions upload` crea una Worker Version y Version URL. Cloudflare documenta que esta modalidad utiliza la configuración y recursos existentes de esa versión; **no es un entorno aislado de rama**.
- `npx wrangler preview` crea/actualiza Worker Preview para la rama, con variables, secretos y bindings propios definidos en `previews`. Cloudflare recomienda Previews para pruebas de ramas/PR.
- Cloudflare indica que el cambio de Workers Builds del modelo anterior a Worker Previews es de una sola vía: después de seleccionar “Switch to Worker Previews” no se puede volver al modelo anterior. Es una decisión operativa que requiere revisión previa.
- Aun con Worker Previews, recursos compartidos por el mismo ID siguen compartiendo datos (p. ej. KV/D1); Service Bindings pueden llamar al Worker productivo; Workflows se enlazan a Workflows existentes; las URLs son públicas por defecto salvo protección con Cloudflare Access. Debe configurarse explícitamente aislamiento y control de acceso.

### Decisión y gate actualizado

1. Mantener el modo actual sin cambios mientras no se complete el inventario autenticado de bindings, secrets, routes, service bindings, workflows, KV/D1/R2 y Previews Base.
2. Antes de activar, preparar `previews` con `APP_ENV=preview`, sin DATABASE_URL/BOOTSTRAP_TOKEN/GOOGLE_CLIENT_SECRET de producción; cualquier DB de prueba futura debe ser un recurso Neon independiente, con credenciales propias y datos sintéticos. No conectar Preview a Neon producción.
3. Conservar y probar el middleware API-dark; añadir/confirmar tests de hostname y secret present (ya existen en la rama #200). Verificar también Pages preview, CORS/origins, OAuth redirect, rate limits y acceso a la URL.
4. Revisar bindings uno por uno: no compartir IDs de KV/D1/R2; no usar Service Bindings hacia Workers productivos; no asociar workflows productivos; no configurar routes ni cron de producción. Aplicar Cloudflare Access si el contenido no debe ser público.
5. Evaluar el impacto de la migración irreversible en CI/branch cleanup, costos y mantenimiento. Solo entonces solicitar/ejecutar el switch, y comprobar un Preview real con evidencia de que no puede alcanzar datos o servicios productivos.

**Conclusión:** la restricción original protegía frente a Version URLs con recursos de producción y frente a una migración irreversible sin inventario. La nueva documentación de Cloudflare sí ofrece un modelo de Worker Previews con aislamiento por rama. El código de Micro-app ya tiene un primer control API-dark, por lo que debemos preparar y verificar la adopción; no mantener un “nunca activar” obsoleto.

Fuentes oficiales consultadas el 2026-11-04: Cloudflare [Previews](https://developers.cloudflare.com/workers/previews/), [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/), [Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), [Resources and isolation](https://developers.cloudflare.com/workers/previews/resources/), [Compare workflows](https://developers.cloudflare.com/workers/previews/compare-workflows/).

---

## Estado vivo — 2026-11-04 21:40 EDT

- Main `7b0f057b8c152515005feed40305143c0ebb94b0`; inventario 0005 no está integrado ni aplicado a Neon.
- #200 HEAD `243592468e9fd61b1f8c578d867887dbb7f18e4d`, abierta/Draft; 20 checks exitosos recuperados, sin reviews formales. La revisión del propietario mantiene stale-count como blocker.
- #204 HEAD `57a9f098bcb93427315e96c90e62ae13764a485b`, 8/8 checks; fixtures aislados y delta de ledger corregido.
- #205 HEAD `c1f09d09dd08b9600e7a6c0ff8ccbb5be4e9c990`, 9/9 checks; idempotencia de creación y replay. Está 1 commit detrás de #204 y no debe integrarse sin reconciliación y CI nuevo.
- #194 mantiene colisión de migración 0005; #202 documentación abierta/Draft, 9/9 workflow runs en HEAD `4e54efbf33cc160f532b26cd147b4afa783cddeb`.
- Issue #53 sigue abierta. Issue #78 cerrada completed.
- Cloudflare confirmó builds/preview deployments de Pages/Workers para ramas #200/#204/#205/#202, pero Version URLs/workers.dev no prueban aislamiento de bindings o base de datos. No activar Worker Previews ni conectar previews a Neon producción.
- Producción sigue bloqueada por stale-count, cobertura de todos los escritores comerciales, autorización/aislamiento cross-tenant/branch/role, rate limiting runtime, migración/rollback, RPO/RTO, alertas externas y confirmación de coste $0.
- No ejecutar migraciones remotas, despliegues ni cambios productivos. Checks verdes no equivalen a readiness.

---

# Estado verificado — 2026-11-04 UTC (reconciliación de Cloudflare y PR #200)

> Este bloque supersede el snapshot vivo histórico que aparece más abajo. Se conserva el resto del documento como historial y checklist; no se borra evidencia anterior.

- GitHub main actual: 7b0f057b8c152515005feed40305143c0ebb94b0. PR #200 está abierta y Draft, base exacta 7b0f057b8c152515005feed40305143c0ebb94b0, HEAD 7d2ef3d5e9ced1d4e8d386110129d21eb53af045, 12 commits ahead / 0 behind, 30 archivos. Su descripción registra 19/19 checks exitosos; en la consulta actual se recuperaron 10 workflow runs asociados al SHA y los 10 terminaron success. No equivale a aprobación de producción.
- PR #196 sigue abierta/Draft e intacta; PR #200 es la rama de integración reconstruida sobre el main actual. Issue #53 sigue abierta. Issue #78 está cerrada desde 2026-10-31 tras verificaciones automatizadas CORS y del bundle publicado; no presentarla como pendiente.
- Cloudflare Worker micro-app-api (captura del propietario, 2026-11-04): repositorio BTF14/Micro-app, production branch main, builds para ramas no productivas habilitados, build command `pnpm install --frozen-lockfile`, deploy command `npx wrangler deploy`, version command `npx wrangler versions upload`, root `apps/api`. El panel aún muestra “Set up Worker Previews”; por tanto, no asumir que el nuevo sistema Worker Previews aislado ya está activado. Cloudflare documenta que `wrangler versions upload` crea Version URLs con los recursos configurados para esa versión, no un entorno aislado por rama. PR #200 añade `[previews.vars] APP_ENV = preview`, pero no se debe asumir que esa configuración se aplica al flujo actual de Version URLs. La guardia de host/APP_ENV en código que devuelve `PREVIEW_API_DISABLED` es defensa de aplicación, no aislamiento de bindings, secretos ni recursos.
- El código de PR #200 incorpora defensa adicional: bloquea rutas de aplicación en hostnames *.workers.dev que no sean el hostname productivo y permite /health. Es una protección a nivel de aplicación, no sustituye el aislamiento de recursos de Cloudflare.
- **Condición adicional para habilitar Worker Previews:** Cloudflare indica que las Previews no heredan la configuración productiva; sus variables, secretos y bindings deben definirse expresamente. El Worker usa `DATABASE_URL` para conectarse directamente a Neon. Por tanto, nunca copiar el secreto de Neon producción a una Preview: primero se necesita una base/branch de prueba aislada y aprobada, con credenciales distintas, datos sintéticos y sin billing inesperado. La tabla de recursos de Cloudflare también advierte que los bindings a recursos compartidos pueden seguir compartiendo datos; activar el modo Preview por sí solo no aísla una base externa como Neon. Ver [Worker Previews](https://developers.cloudflare.com/workers/previews/), [Resources and isolation](https://developers.cloudflare.com/workers/previews/resources/) y [Configuration](https://developers.cloudflare.com/workers/previews/configuration/).
- Cloudflare Pages micro-app-63i (captura del propietario, 2026-11-04): production branch main, automatic deployments habilitados, build command corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build, output apps/web/dist, root directory vacío, build watch paths *, build system v3, cache deshabilitada. Un push/merge a main puede activar despliegues productivos de Pages y Workers.
- Cloudflare Workers Builds usa el deploy command para la rama productiva; el comando observado npx wrangler deploy publica la versión. Las ramas no productivas usan el version command observado npx wrangler versions upload, que produce Version URLs; Cloudflare documenta que estas URLs usan recursos de producción. La transición a Worker Previews es un cambio de modalidad de una sola vía según la documentación vigente. No pulsar Set up ni cambiar comandos sin plan revisado y autorización.
- La migración 0005_warehouse_inventory.sql y sus assertions se ejecutan en CI contra PostgreSQL 18 desechable. No se encontró un procedimiento aprobado para aplicarla a Neon main ni evidencia de aplicación remota. No desplegar la API que registra estas rutas sin un plan coordinado y aprobado para la compatibilidad del esquema.
- **Hallazgo adicional de atomicidad de migración 0005:** el archivo `0005_warehouse_inventory.sql` no contiene `BEGIN`/`COMMIT`; el workflow `migration-check.yml` lo ejecuta con `psql -v ON_ERROR_STOP=1 -f ...`. PostgreSQL/psql usa autocommit por defecto, así que un error a mitad del archivo puede dejar persistidos los DDL anteriores aunque `ON_ERROR_STOP` detenga el resto. El éxito de CI en la base desechable demuestra que el script completo funcionó, no que la aplicación sea atómica. Antes de producción, exigir una migración transaccional (si todas las sentencias lo permiten), o un procedimiento explícito de recuperación/reconciliación de estado parcial, más una prueba que fuerce fallo intermedio. No aplicar a Neon hasta resolverlo. Referencias: [PostgreSQL BEGIN](https://www.postgresql.org/docs/current/sql-begin.html) y [psql AUTOCOMMIT/ON_ERROR_STOP](https://www.postgresql.org/docs/18/app-psql.html).
- Bloqueos P0 vigentes: aislamiento completo por tenant/rol para todas las operaciones comerciales; escritores de ventas, compras/recepciones, reservas, devoluciones y transferencias aún fuera de alcance; rate limiting runtime no demostrado; migración/rollback operativos; pruebas E2E comerciales; RPO/RTO, alerta de fallo y coste total $0 aún incompletos. Estado del producto: NO LISTO PARA PRODUCCIÓN.
- Límites: no fusionar PR #200/#202, no desplegar producción, no cambiar configuración Cloudflare, no aplicar migraciones a Neon, no tocar datos reales ni secretos sin superar sus gates y autorización específica.

---
# Micro app — checklist de preparación para producción

## Estado vivo — 2026-11-04 UTC

- `main` = `2e0f4083ba577de2f301daf8c866bfbdffb5e23f`. PR #198 está fusionada; PR #197 cerrada sin merge como supersedida.
- PR #196 sigue abierta/Draft, HEAD `c332e740aff279fb8b22a8879581d4b8a3c7de21`, base registrada `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`. Quedó detrás de main y requiere actualización/reconciliación antes de evaluar integración.
- La rama #196 contiene catálogo, almacenes y conteos físicos/apertura, con migración 0005 y ledger. Nada de ese vertical slice está en main mientras la PR no se fusione.
- Los 11 workflows asociados al HEAD exacto de #196 terminaron success; no equivalen a aprobación de producción ni sustituyen revalidación después de actualizar la base.
- La matriz de roles está aprobada desde 2026-10-31. La implementación de permisos/operaciones sigue parcial; Issue #53 permanece abierta.
- Producción sigue bloqueada: faltan rutas comerciales completas, rate limiting runtime, pruebas E2E comerciales, coordinación entre todos los escritores de inventario, RPO/RTO medidos, alertas y confirmación de coste total $0.

Este archivo es la fuente de datos para el panel de avance. Un ítem solo puede marcarse `[x]` cuando existe evidencia revisable en código, pruebas o configuración. La documentación por sí sola no demuestra que una función opere correctamente.

## Cómo se calcula

- **Avance de implementación:** tareas funcionales de producto completadas / tareas funcionales inventariadas.
- **Preparación para producción:** controles de salida completados / controles de salida inventariados.
- **CI y seguridad:** se muestran como evidencia independiente; no sustituyen las pruebas funcionales.
- Los porcentajes son conteos simples de los criterios listados, no una predicción de fechas, calidad ni disponibilidad comercial.
- Los criterios bloqueantes P0 se muestran aparte. No se puede declarar listo para producción mientras quede alguno pendiente.
- No marcar una tarea completa basándose solo en un workflow de mocks.

## Estado arquitectónico al 2026-10-30

- Main contiene 0001–0004: tenant/identidad, sucursales/asignaciones y cajas/turnos; `resolveBranchContext` existe pero no está conectado a rutas.
- 0004 (`registers`/`register_shifts`) está fusionada en main y validada en PostgreSQL 18 desechable; no está aplicada a Neon main.
- No existen endpoints comerciales. La matriz de permisos por rol fue **aprobada el 2026-10-31** (`docs/sdd/role-permission-decision-matrix.md`), pero la aprobación no equivale a implementación: sigue sin existir ningún endpoint ni middleware de autorización, y sigue sin existir ninguna prueba cross-tenant porque las rutas comerciales no existen aún. Este trabajo de esquema no marca como completados los flujos POS, ventas, inventario o caja de extremo a extremo.

## Implementación funcional

### Base de producto
- [x] Repositorio independiente y alcance documentados.
- [x] Esqueleto React/Vite/TypeScript para frontend.
- [x] Esqueleto Hono/Workers/TypeScript para API.
- [ ] Flujos completos de catálogo y categorías.
- [ ] Flujos completos de inventario y movimientos auditables.
- [ ] Flujo de caja/POS de extremo a extremo.
- [ ] Pagos mixtos, cambio, recibos y cierre de caja.
- [ ] Devoluciones y reversos auditables.
- [ ] Reportes y exportaciones autorizadas.
- [ ] UX responsive final y accesibilidad validada.

### Datos e integridad
- [x] Esquema SQL versionado 0001–0004 en main y validación en PostgreSQL 18 desechable; las migraciones 0003/0004 aún no se han aplicado a Neon.
- [ ] Adaptador PostgreSQL conectado y probado en todos los flujos de negocio.
- [ ] Migraciones automatizadas y operativamente documentadas.
- [ ] Aislamiento multiempresa validado para todas las operaciones.
- [ ] Idempotencia de ventas y pagos verificada con pruebas.
- [ ] Stock concurrente protegido contra sobreventa.
- [ ] Instantáneas inmutables de precios, tasa y datos de venta.
- [ ] Ciclo completo de backup/restore: la restauración técnica del backup remoto exacto pasó en PostgreSQL 18 desechable (run 40955935124) y el smoke sintético cifrado PG18 pasó en run 41020548699. El gate completo sigue pendiente de validación de datos comerciales/conteos/relaciones, RPO/RTO, alerta y evidencia del coste total; ver [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md).

### Identidad y moneda
- [x] Registro público y login con contraseña bloqueados fail-closed; Google OAuth + allowlist + verificación de email implementados (PR #102), sesión reforzada y origen HTTPS/canónico (PR #155).
- [x] Sesiones persistidas y revocables; pruebas de identidad y límites de sesión ampliadas en PR #111 (mismatch, expiración/revocación, membresía/organización inactiva).
- [x] Matriz completa de roles/permisos **aprobada** (2026-10-31; `docs/sdd/role-permission-decision-matrix.md`). Pruebas negativas de aislamiento siguen pendientes porque no existen rutas comerciales que probar.
- [ ] Integración de tasa BCV validada con fuente, vigencia y fallos.
- [ ] Tratamiento de IVA/IGTF/documentos fiscales validado por fuentes oficiales y asesoría competente.

## Preparación para producción (gates)

### P0 — bloqueantes
- [x] CI compila y ejecuta pruebas automatizadas en PostgreSQL desechable para un SHA verificado.
- [x] Validación de migración en base efímera en el SHA verificado.
- [x] El registro público está bloqueado fail-closed y probado sin escrituras ni cookie (PR #57; SHA merge `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`).
- [x] Google sign-in + allowlist + verificación de email implementados; las pruebas core de identidad/sesión pasaron en PR #111 (14 tests de integración PostgreSQL en HEAD 233844be10bb102fdac34ad41776d4d14420b243).
- [ ] Pruebas de rutas de error de base de datos y autorización cross-tenant de futuras rutas comerciales; issue #53 sigue abierto hasta que existan endpoints comerciales con esas pruebas pasando, aunque la matriz de permisos que los gobernará ya está aprobada.
- [ ] Autorización multiempresa y aislamiento comprobados en toda la API.
- [ ] Flujos reales de venta/inventario con transacciones, idempotencia y concurrencia.
- [ ] Gestión de errores, rate limiting y protección contra abuso revisadas.
- [ ] Configuración de secretos/orígenes/cookies validada en entorno de preview.
- [ ] Requisitos fiscales locales revisados y recibos correctamente clasificados.
- [ ] Recuperación independiente completa: restauración técnica de la copia remota verificada en run 40955935124; falta demostrar integridad de datos comerciales/conteos/relaciones y medir RPO/RTO/alertas/coste. Neon PITR por sí solo no satisface el requisito.
- [ ] Prueba E2E de flujos reales contra API y DB de prueba (no solo mocks).
- [ ] Checklist de lanzamiento revisado y aprobación explícita del usuario.

### P1 — operación y UX
- [x] Análisis Semgrep configurado en CI.
- [x] Escaneo Trivy configurado en CI.
- [x] Smoke E2E de navegador con API simulada configurado.
- [ ] Pruebas E2E de ventas, inventario, caja y devoluciones en móvil/escritorio.
- [ ] Accesibilidad y uso por teclado verificados.
- [ ] Logs operativos sin secretos/datos sensibles y estrategia de retención.
- [ ] Monitorización de fallos y procedimiento de soporte documentados.
- [ ] Límites gratuitos/capacidad y ausencia de cargos automáticos revalidados.
- [ ] Preview aislada desplegada y verificada, sin datos de producción.

## Bloqueos conocidos al último análisis documental

- El registro público y el login con contraseña permanecen bloqueados fail-closed; Google OAuth + allowlist + verificación de email y HTTPS/canonical origin están implementados y probados. Issue #53 sigue abierto por aislamiento real de futuras rutas comerciales; la matriz de permisos que las gobernará ya fue aprobada el 2026-10-31 (`docs/sdd/role-permission-decision-matrix.md`), pero no se ha implementado ningún endpoint ni prueba cross-tenant todavía.
- Main incluye sucursales/asignaciones (0003) y cajas/turnos (0004). No hay endpoints ni flujos comerciales; almacenes y stock por almacén siguen pendientes.
- Las pruebas Playwright actuales son smoke tests con API simulada; no prueban el backend real.
- La aplicación no tiene aún los flujos completos de POS/ventas/inventario.
- Los cambios en Neon main deben superar el gate de `docs/CONSTITUTION.md`; producción sigue bloqueada hasta completar los gates y obtener aceptación explícita.
- La obligación fiscal no debe declararse resuelta sin fuentes oficiales y revisión competente.

Actualiza este checklist solo junto con evidencia y una entrada en `docs/STATE_JOURNAL.md`.

## Respaldo y recuperación

La política está documentada en `docs/BACKUP_AND_RECOVERY.md`. La subida cifrada está verificada y la copia remota exacta se restauró técnicamente en PostgreSQL 18 desechable (run 40955935124). El control compuesto permanece incompleto hasta validar datos comerciales/conteos/relaciones, medir RPO/RTO y comprobar alertas y coste total.


---

## Revalidación de estado — 2026-11-05 UTC

La preparación para producción permanece **bloqueada**. El estado vivo de las PR de inventario se encuentra en `docs/CURRENT_STATE.md`; este addendum corrige cualquier snapshot anterior:

- #200 HEAD `243592468e9fd61b1f8c578d867887dbb7f18e4d`: 10 workflow runs success; no reviews formales. No equivale a aprobación funcional ni readiness.
- #204 HEAD `57a9f098bcb93427315e96c90e62ae13764a485b`: no workflow runs/status contexts recuperados; CI no verificada como verde.
- #205 HEAD `c1f09d09dd08b9600e7a6c0ff8ccbb5be4e9c990`: solo backup restore smoke test success; rama 9 ahead/1 behind de #204.
- #202 docs: 9 workflows success en HEAD previo `348cf0a1067c5410ff262f817b054cef46f0afae`; cualquier commit posterior requiere revalidación.

Gates persistentes: stale-count, autorización/aislamiento multi-tenant y por sucursal (issue #53), atomicidad y rollback de migración, sincronización de ramas, coordinación de escritores de inventario, rate limiting runtime, recuperación RPO/RTO/alertas y coste operativo comprobado. No usar CI verde como sustituto de estos gates.


## Precisión de integridad de conteos — 2026-11-05 UTC

El stale-count básico no está totalmente ausente: #200 captura cantidad esperada y rechaza con 409 un conteo cuyo saldo cambió; la prueba de integración de confirmación inversa pasa en la suite de esa rama. No marcar como gate “sin protección stale-count”. El gate residual es revisar ABA/versionado y disciplina de locks al incorporar otros escritores. Esto no elimina los gates de autorización, atomicidad de migración, backup/restore operativo y readiness general.



## Reconciliación posterior: migración atómica y ramas sincronizadas — 2026-11-05 UTC

- #200 HEAD `a40d8378d792197628f70b07be04f92686d55bdb`: 17 ahead/0 behind de main, 30 archivos (+3555/-17). Diez workflow runs completados success en este SHA, incluidos CI, Playwright, Database migration validation, Semgrep, Security, Secret history, Backup restore, Dependency review, ODD docs y Project progress. Sin status contexts, reviews formales ni threads inline.
- #204 HEAD `e37847c95958c3475f90041263ca4fac7f98c2d1`, base #200 HEAD `a40d8378...`: 4 ahead/0 behind. Merge commit que incorpora la migración atómica de #200 y preserva el cambio de fixtures. No se recuperaron runs/status contexts para este SHA; sin reviews/threads.
- #205 HEAD `a2fe55847d72b4d9994b781880843ab4906c7b08`, base #204 HEAD `e37847c...`: 10 ahead/0 behind. Merge commit que incorpora el último cambio de #204, la migración atómica y el workflow de rollback, preservando idempotencia. No se recuperaron runs/status contexts para este SHA; sin reviews/threads.
- Migración 0005 tiene BEGIN/COMMIT de nivel superior. migration-check prueba una copia con fallo inyectado antes de COMMIT, espera que psql falle y comprueba que no existan tablas de inventario; después aplica la migración real y sus assertions. Los diez workflows success de #200 incluyen Database migration validation en el SHA a40d8378...
- #204/#205 requieren validación completa en sus nuevos merge HEAD; no heredar CI de SHA anteriores. Todas las PR siguen Draft; ninguna se fusionó.
- Stale-count básico está implementado: captura expected_on_hand_quantity y devuelve 409 si el saldo difiere; una prueba confirma primero el conteo nuevo y rechaza el antiguo. Riesgo residual ABA/versionado monotónico antes de sumar otros escritores.
- Issue #53 sigue abierta; autorización/aislamiento completo aún no probado. Colisión 0005 roles en #194 sigue pendiente.
- No tocar Neon producción, deploy productivo, secretos, DNS, billing ni datos reales; no force-push ni modificar main.



## Corrección de evidencia CI y sincronización de ramas — 2026-11-05 UTC

La consulta directa a GitHub Actions por `head_sha` incluye eventos `push` y `pull_request`; sus resultados amplían la consulta anterior, que solo devolvía runs PR-triggered:

- #200 HEAD `a40d8378d792197628f70b07be04f92686d55bdb`: **17/17 workflow runs success** (10 pull_request + 7 push), incluye Database migration validation con rollback inducido, CI y Playwright. 17 ejecuciones no significan 17 checks únicos. Combined statuses vacío; sin reviews formales ni threads.
- #204 HEAD `e37847c95958c3475f90041263ca4fac7f98c2d1`: **7/7 workflow runs success** (push), incluye CI, Playwright, Database migration validation, Semgrep, Security, Secret history y Backup restore. Sin status contexts, reviews ni threads.
- #205 HEAD `a2fe55847d72b4d9994b781880843ab4906c7b08`: **8/8 workflow runs success** (7 push + 1 pull_request), incluye CI, Playwright, Database migration validation, Semgrep, Security, Secret history y Backup restore. Sin status contexts, reviews ni threads.
- Relaciones verificadas: #200 17 ahead/0 behind main; #204 4 ahead/0 behind #200; #205 10 ahead/0 behind #204. No hay divergencia entre la pila.
- Los cuerpos de #200/#204/#205 reflejan estos SHA y resultados. Todas permanecen Draft; no hay aprobación formal ni merge.
- La migración 0005 está envuelta en BEGIN/COMMIT y el workflow de migración ejecuta un fallo inducido antes de COMMIT, verifica ausencia de tablas y después aplica el SQL real. Los 17/7/8 runs incluyen la validación de migraciones de sus SHA correspondientes.
- Stale-count básico: snapshot de cantidad, 409 y prueba de confirmación inversa. Residual ABA/versionado antes de futuros writers.
- #202 HEAD `2793550cb9ccb4595971ad86ce6b950203c681df` tenía 11 workflow runs (7 success, 4 in_progress) en la consulta; ese estado se recalcula para cualquier commit documental posterior.


## Actualización de gates de inventario — 2026-11-05 UTC (supersede checkpoints anteriores)

- El stale-count no se limita a comparar cantidades: `inventory_balances.balance_version` incrementa en cada cambio de on-hand/reservas, el DELETE de balance está bloqueado y cada línea física captura `expected_balance_version`. La confirmación compara versión y cantidad; el test ABA 8.250 → 8.500 → 8.250 devuelve 409. El riesgo ABA queda cubierto para escritores que actualicen la tabla de balance; los futuros escritores deben respetar el mutex y no escribir ledger sin actualizar balance.
- PR #200 código HEAD `7b58b140e50c46a3d3b087e3445a4b04e6243a81`: 16/16 workflow runs success; HEAD documental `5fbc17a48b65076cf5609a7a054bbd125a3a5d1e`: 16/16 success.
- PR #204 HEAD `07a5a41c0f5f5c36fb89a5c5950796493d56eb20`: 8 ahead/0 behind de #200, diff propio 1 archivo, 6/6 workflows success.
- PR #205 HEAD `7005d9a5b03234bd0209d0cc1ea75e8ae21e0032`: 20 ahead/0 behind de #204, diff propio 3 archivos, 8/8 workflows success; conserva idempotencia.
- Las tres PR siguen Draft y no tienen reviews formales, review threads ni combined status contexts en la consulta. No se ha fusionado ninguna. CI success no es aprobación.
- **Producción sigue bloqueada** por autorización/aislamiento completo y pruebas cross-tenant/cross-branch (issue #53), flujos comerciales incompletos, backups/restore reales y RPO/RTO operativos, alertas externas, rate limiting runtime, coste total y gates legales/fiscales. No migrar a Neon ni desplegar.


## Revalidación de seguridad e aislamiento — 2026-11-05 UTC

- PR #205 HEAD `bb4a60454061ce09fef07100e75010f3abc5b883`: 7/7 workflow runs success; suite PostgreSQL de conteos 20/20. Incluye pruebas HTTP de selector de tenant ajeno (POST/GET), producto ajeno, branch no asignado y warehouse/branch discordante, con ausencia de escrituras ante denegación.
- PR #202 HEAD `52996471ce3c143527fe4725085b38ee67bdf402`: 11/11 workflow runs success tras reconciliar seis documentos de autorización/aislamiento.
- #200 16/16, #204 6/6, #194 11/11 en sus HEAD exactos. Todas las PR siguen Draft; sin reviews formales, threads ni status contexts en la consulta. No hay merge.
- La cobertura cross-tenant/cross-branch sigue parcial: falta confirmar denegación con ID de conteo ajeno, cubrir todas las rutas de catálogo/roles y materializar lectura de balances/movimientos para Cashier/Inventory. Issue #53 permanece abierta/P0.
- La tabla `audit_logs` no tiene trigger append-only en migraciones 0001–0005. Los privilegios efectivos del rol runtime no fueron verificados; no declarar auditoría general inmutable.
- Producción continúa NO LISTA por autorización/aislamiento completo, flujos comerciales ausentes, auditoría y privilegios por cerrar, backups/restore reales, RPO/RTO, alertas, rate limiting runtime, coste total y gates legales/fiscales. No migrar a Neon ni desplegar.


### Orden de idempotencia/locks verificado — 2026-11-05 UTC

PR #205 HEAD `bb4a60454061ce09fef07100e75010f3abc5b883` reclama el documento idempotente antes de bloquear balances; los replays no bloquean stock y los nuevos documentos siguen almacén → documento → balances. CI exacto: 7/7 success, PostgreSQL inventory 20/20. Esta mejora no cierra los gaps de auditoría general, autorización completa ni producción.
