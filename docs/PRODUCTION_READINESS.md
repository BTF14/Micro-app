# Micro app — checklist de preparación para producción

## Estado vivo verificado — 2026-11-04 UTC

PR #196 está abierta y Draft, sin merge. PR HEAD `39a6aaf184cbbe61f9d95a942f0cb63da79c588e` (documentación); código verificado `c754881435e9096cd85defbe7a4dab5cff429326`; base main `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`.

Los checks del código `c754881` y del commit documental anterior `1f54c5c` terminaron en success; el HEAD documental actual `39a6aaf` contiene solo esta corrección de referencias y está en revalidación: build/typecheck, API unit tests 97/97, web tests 6/6 (1 test Preview-only omitido en runner normal y verificado en Preview real), PostgreSQL auth 18/18, branch scope 7/7, register shifts 5/5, cashier open-shift 7/7, catálogo 8/8, product create 8/8, product update 7/7, inventory counts 9/9, Chromium/Playwright 4/4, SAST, Trivy, dependency review, secret scan, backup/restore y dashboard. El workflow independiente ejecutó realmente migraciones 0001–0005 y sus assertions contra PostgreSQL desechable.

Pages/Workers son previews aislados; Pages informa login/datos deshabilitados, Worker `/health` responde 200 y `/auth/me` responde 503. No se modificó Neon producción ni se desplegó a producción.

La rama contiene catálogo GET/POST/PATCH y base de inventario por almacén con conteos y ledger. No implementa aún ventas, pagos, devoluciones, compras/recepciones, transferencias ni reservas comerciales. La coordinación con esos futuros escritores requiere implementar el contrato de locks y pruebas concurrentes por cada flujo.

**Producción sigue bloqueada.** Permanecen pendientes los flujos comerciales, administración de almacenes, rate limiting runtime, pruebas E2E comerciales, RPO/RTO medidos, alertas operativas, confirmación de coste total $0 y aprobación final. Los checks verdes de una vertical slice no equivalen a readiness de producción.

## Snapshot histórico — readiness anterior (supersedido por el estado vivo superior)

La PR #196 implementa en una rama basada en el HEAD vigente de `main` la primera vertical slice de catálogo: lectura tenant-scoped, alta, edición y baja lógica de productos. HEAD `d3c4196293256a34457f3b06e1b1c867caf5c97e`; CI completo success, incluyendo 83 tests unitarios, 8/8 lectura PostgreSQL, 8/8 creación PostgreSQL y 7/7 edición/baja lógica PostgreSQL. PR #196 sigue Draft y no está fusionada; por tanto, **main no tiene aún estas rutas**.

La matriz de permisos está aprobada (2026-10-31). Issue #53 sigue abierta hasta implementar y probar todas las rutas comerciales aplicables.

**P0 que siguen bloqueando producción:** operaciones comerciales completas restantes (inventario, ventas, pagos, devoluciones y reportes); stock independiente por sucursal/almacén y transferencias según las reglas aprobadas; autorización cross-tenant/rol en cada operación; rate limiting runtime; idempotencia/concurrencia; ciclo operativo de backup con RPO/RTO medidos, alerta de fallo y coste $0 confirmado; preview aislada verificada con configuración realista; y aprobación final de lanzamiento. No se ha cambiado Neon main ni producción.


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
