# Micro app — checklist de preparación para producción

Este archivo es la fuente de datos para el panel de avance. Un ítem solo puede marcarse `[x]` cuando existe evidencia revisable en código, pruebas o configuración. La documentación por sí sola no demuestra que una función opere correctamente.

## Cómo se calcula

- **Avance de implementación:** tareas funcionales de producto completadas / tareas funcionales inventariadas.
- **Preparación para producción:** controles de salida completados / controles de salida inventariados.
- **CI y seguridad:** se muestran como evidencia independiente; no sustituyen las pruebas funcionales.
- Los porcentajes son conteos simples de los criterios listados, no una predicción de fechas, calidad ni disponibilidad comercial.
- Los criterios bloqueantes P0 se muestran aparte. No se puede declarar listo para producción mientras quede alguno pendiente.
- No marcar una tarea completa basándose solo en un workflow de mocks.

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
- [x] Esquema SQL inicial versionado y validación en PostgreSQL desechable.
- [ ] Adaptador PostgreSQL conectado y probado en todos los flujos de negocio.
- [ ] Migraciones automatizadas y operativamente documentadas.
- [ ] Aislamiento multiempresa validado para todas las operaciones.
- [ ] Idempotencia de ventas y pagos verificada con pruebas.
- [ ] Stock concurrente protegido contra sobreventa.
- [ ] Instantáneas inmutables de precios, tasa y datos de venta.
- [ ] Ciclo completo de backup/restore: backup cifrado automatizado, retención y subida están verificados (run 40587638159), pero la restauración en PostgreSQL desechable sigue pendiente (ver [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md)).

### Identidad y moneda
- [x] Registro público y login con contraseña bloqueados fail-closed; Google OAuth + allowlist + verificación de email implementados (PR #102).
- [x] Sesiones persistidas y revocables; pruebas de identidad y límites de sesión ampliadas en PR #111 (mismatch, expiración/revocación, membresía/organización inactiva).
- [ ] Matriz completa de roles/permisos y pruebas negativas.
- [ ] Integración de tasa BCV validada con fuente, vigencia y fallos.
- [ ] Tratamiento de IVA/IGTF/documentos fiscales validado por fuentes oficiales y asesoría competente.

## Preparación para producción (gates)

### P0 — bloqueantes
- [x] CI compila y ejecuta pruebas automatizadas en PostgreSQL desechable para un SHA verificado.
- [x] Validación de migración en base efímera en el SHA verificado.
- [x] El registro público está bloqueado fail-closed y probado sin escrituras ni cookie (PR #57; SHA merge `cb4b9b09ad3ff0f1bacd34f23ee653a5477cddfe`).
- [x] Google sign-in + allowlist + verificación de email implementados; las pruebas core de identidad/sesión pasaron en PR #111 (14 tests de integración PostgreSQL en HEAD 233844be10bb102fdac34ad41776d4d14420b243).
- [ ] Pruebas de rutas de error de base de datos y autorización cross-tenant de futuras rutas comerciales; issue #53 sigue abierto.
- [ ] Autorización multiempresa y aislamiento comprobados en toda la API.
- [ ] Flujos reales de venta/inventario con transacciones, idempotencia y concurrencia.
- [ ] Gestión de errores, rate limiting y protección contra abuso revisadas.
- [ ] Configuración de secretos/orígenes/cookies validada en entorno de preview.
- [ ] Requisitos fiscales locales revisados y recibos correctamente clasificados.
- [ ] Restauración desde backup independiente probada y documentada; Neon PITR por sí solo no satisface el requisito.
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

- El registro público y el login con contraseña permanecen bloqueados fail-closed; Google OAuth + allowlist + verificación de email ya están implementados y probados. Issue #53 sigue abierto por aislamiento real de futuras rutas comerciales y cobertura restante.
- Las pruebas Playwright actuales son smoke tests con API simulada; no prueban el backend real.
- La aplicación no tiene aún los flujos completos de POS/ventas/inventario.
- Los cambios en Neon main deben superar el gate de `docs/CONSTITUTION.md`; producción sigue bloqueada hasta completar los gates y obtener aceptación explícita.
- La obligación fiscal no debe declararse resuelta sin fuentes oficiales y revisión competente.

Actualiza este checklist solo junto con evidencia y una entrada en `docs/STATE_JOURNAL.md`.

## Respaldo y recuperación

La política está documentada en `docs/BACKUP_AND_RECOVERY.md`. El workflow independiente de backup cifrado y subida al repositorio privado tiene una corrida real exitosa (run 40587638159); la restauración en PostgreSQL desechable sigue pendiente, por lo que el control compuesto no está completo.
