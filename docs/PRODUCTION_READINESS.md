# Estado verificado — 2026-11-04 UTC (reconciliación de Cloudflare y PR #200)

> Este bloque supersede el snapshot vivo histórico que aparece más abajo. Se conserva el resto del documento como historial y checklist; no se borra evidencia anterior.

- GitHub main actual: 7b0f057b8c152515005feed40305143c0ebb94b0. PR #200 está abierta y Draft, base exacta 7b0f057b8c152515005feed40305143c0ebb94b0, HEAD 7d2ef3d5e9ced1d4e8d386110129d21eb53af045, 12 commits ahead / 0 behind, 30 archivos. Su descripción registra 19/19 checks exitosos; en la consulta actual se recuperaron 10 workflow runs asociados al SHA y los 10 terminaron success. No equivale a aprobación de producción.
- PR #196 sigue abierta/Draft e intacta; PR #200 es la rama de integración reconstruida sobre el main actual. Issue #53 sigue abierta. Issue #78 está cerrada desde 2026-10-31 tras verificaciones automatizadas CORS y del bundle publicado; no presentarla como pendiente.
- Cloudflare Worker micro-app-api (captura del propietario, 2026-11-04): repositorio BTF14/Micro-app, production branch main, builds para ramas no productivas habilitados, build command `pnpm install --frozen-lockfile`, deploy command `npx wrangler deploy`, version command `npx wrangler versions upload`, root `apps/api`. El panel aún muestra “Set up Worker Previews”; por tanto, no asumir que el nuevo sistema Worker Previews aislado ya está activado. Cloudflare documenta que `wrangler versions upload` crea Version URLs con los recursos configurados para esa versión, no un entorno aislado por rama. PR #200 añade `[previews.vars] APP_ENV = preview`, pero no se debe asumir que esa configuración se aplica al flujo actual de Version URLs. La guardia de host/APP_ENV en código que devuelve `PREVIEW_API_DISABLED` es defensa de aplicación, no aislamiento de bindings, secretos ni recursos.
- El código de PR #200 incorpora defensa adicional: bloquea rutas de aplicación en hostnames *.workers.dev que no sean el hostname productivo y permite /health. Es una protección a nivel de aplicación, no sustituye el aislamiento de recursos de Cloudflare.
- Cloudflare Pages micro-app-63i (captura del propietario, 2026-11-04): production branch main, automatic deployments habilitados, build command corepack enable && pnpm install --frozen-lockfile && pnpm --filter @micro-app/web build, output apps/web/dist, root directory vacío, build watch paths *, build system v3, cache deshabilitada. Un push/merge a main puede activar despliegues productivos de Pages y Workers.
- Cloudflare Workers Builds usa el deploy command para la rama productiva; el comando observado npx wrangler deploy publica la versión. Las ramas no productivas usan el version command observado npx wrangler versions upload, que produce Version URLs; Cloudflare documenta que estas URLs usan recursos de producción. La transición a Worker Previews es un cambio de modalidad de una sola vía según la documentación vigente. No pulsar Set up ni cambiar comandos sin plan revisado y autorización.
- La migración 0005_warehouse_inventory.sql y sus assertions se ejecutan en CI contra PostgreSQL 18 desechable. No se encontró un procedimiento aprobado para aplicarla a Neon main ni evidencia de aplicación remota. No desplegar la API que registra estas rutas sin un plan coordinado y aprobado para la compatibilidad del esquema.
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
