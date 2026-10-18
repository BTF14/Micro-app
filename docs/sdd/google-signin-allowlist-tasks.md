# Tasks: Google Sign-In y allowlist

- Spec: [google-signin-allowlist-spec.md](google-signin-allowlist-spec.md)
- Plan: [google-signin-allowlist-plan.md](google-signin-allowlist-plan.md)

## Tareas

- [ ] T1 — Resolver decisiones D1–D8 con política de producto explícita.  
  **Aceptación:** cada decisión tiene opción seleccionada, responsable y razón; no se infieren dominios, usuarios permitidos ni bootstrap.  
  **Archivos:** `docs/sdd/google-signin-allowlist-spec.md`, constitución si procede.  
  **Validación/evidencia:** revisión del documento y registro de decisiones.

- [ ] T2 — Verificar proveedor y biblioteca OAuth para Hono/Cloudflare Workers con coste $0.  
  **Aceptación:** compatibilidad, límites gratuitos, secretos necesarios y riesgos quedan documentados antes de elegir.  
  **Archivos:** `docs/sdd/google-signin-allowlist-plan.md`, `docs/RESOURCE_REGISTRY.md`.  
  **Validación/evidencia:** fuentes oficiales actuales y revisión de coste/billing.

- [ ] T3 — Auditar modelo actual de usuario, sesión, organización, membresía y rutas protegidas.  
  **Aceptación:** matriz de permisos por endpoint y política de vinculación de cuentas documentadas.  
  **Archivos:** `apps/api/src/auth.ts`, esquema Drizzle, middleware y tests existentes; artefactos SDD.  
  **Validación/evidencia:** revisión estática con rutas y pruebas referenciadas, sin afirmar tests no ejecutados.

- [ ] T4 — Implementar validación de identidad y allowlist tras aprobación de diseño.  
  **Aceptación:** fallo cerrado, no hay sesión ni alta parcial para usuarios denegados; secretos nunca en cliente/logs.  
  **Archivos:** módulos de auth y pruebas acordados en el plan.  
  **Validación/evidencia:** pruebas unitarias y de integración contra PostgreSQL efímero.

- [ ] T5 — Cubrir sesiones, autorización, tenant y casos negativos.  
  **Aceptación:** pruebas para state/nonce, issuer/audience, expiración, replay, revocación y cross-tenant.  
  **Archivos:** pruebas API, middleware y E2E.  
  **Validación/evidencia:** CI y workflows del SHA exacto; distinguir mocks de API+DB real.

- [ ] T6 — Revisión independiente y PR.  
  **Aceptación:** diff completo revisado; sin secretos ni hallazgos críticos abiertos; workflows obligatorios en success.  
  **Archivos:** cambios de auth, tests, migración si aplica y docs.  
  **Validación/evidencia:** PR, revisiones y enlaces de Actions del SHA final.

## Revisión independiente

- [ ] Arquitectura y alcance revisados.
- [ ] Seguridad / autorización / tenant revisados cuando corresponda.
- [ ] Pruebas y workflows comprobados para el SHA final.
- [ ] Diff completo inspeccionado; no hay secretos.
- [ ] Documentación y handoff actualizados.

## Cierre

- SHA: pendiente
- Workflows: pendiente
- Criterios aceptados / no aceptados: propuesta documental; ningún criterio de implementación se considera aceptado
- Limitaciones no verificadas: proveedor, política de allowlist, cuentas existentes, Google OAuth real y DB real
- Siguiente paso: resolver D1–D8 antes de iniciar la implementación
