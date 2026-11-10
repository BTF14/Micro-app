# Plan: Google Sign-In y allowlist

- Spec: [google-signin-allowlist-spec.md](google-signin-allowlist-spec.md)
- Estado vigente (reconciliación 2026-11-09): plan histórico de diseño; D1–D8 fueron aprobadas el 2026-10-24 y la implementación Google OAuth/allowlist está en `apps/api/src/google-auth.ts`. No tratar las instrucciones previas de “no implementar hasta resolver D1–D8” ni la lista de decisiones pendientes como estado actual. La implementación y su preparación para producción deben verificarse por separado conforme a `docs/PRODUCTION_READINESS.md`.
- Estado original: propuesta

## Diseño y decisiones

Nota histórica: esta sección describía la fase previa a la aprobación de D1–D8. Las decisiones ya fueron aprobadas y la implementación de Google OAuth/allowlist existe en main. Los principios técnicos aquí enumerados siguen siendo criterios de revisión, no una orden de mantener la funcionalidad sin implementar.

### Alternativas de allowlist a evaluar

| Opción | Ventajas | Riesgos/coste | Estado |
|---|---|---|---|
| Configuración por entorno (lista explícita) | Sencilla para piloto pequeño; sin tabla nueva | Cambios operativos/manuales; límites de tamaño/rotación; secretos/configuración por entorno | Evaluar |
| Tabla de allowlist administrada por operadores | Revocación/auditoría más flexible | Requiere modelo de administración, permisos, migración y UI/proceso seguro | Evaluar |
| Invitaciones de un solo uso | Control de altas y tenant | Requiere generación/expiración/revocación y proceso de invitación | Evaluar |
| Restricción por dominio | Simple cuando el dominio es controlado | No equivale a invitación individual; no usar sin regla explícita | No asumir aceptable |

Ninguna alternativa se selecciona aquí. El primer administrador/bootstrap debe definirse antes de cualquier implementación.

## Archivos / módulos previstos

| Archivo/módulo | Cambio | Motivo |
|---|---|---|
| `apps/api/src/auth.ts` | Ajustar rutas y validación solo tras aprobar decisiones | Integrar proveedor sin abrir acceso |
| Módulo de identidad OAuth nuevo | Validación del callback y claims | Separar protocolo de rutas |
| Esquema Drizzle/migración si procede | Identidad externa/allowlist/invitaciones según decisión | Persistencia consistente |
| `apps/api/src/auth.integration.test.ts` y pruebas nuevas | Matriz positiva/negativa con PostgreSQL efímero | Evidencia real de auth y persistencia |
| `apps/web` autenticación/E2E | Flujo de redirección y errores seguros | UX y regresión |
| Configuración de entorno y documentación | Nombres de bindings/secretos por entorno sin valores reales | Despliegue reproducible sin filtrar secretos |
| `docs/SECURITY_PLAN_2026.md`, checklist ASVS y handoff | Registrar controles demostrados y pendientes | Continuidad basada en evidencia |

## Secuencia de implementación

1. Resolver y registrar D1–D8; confirmar proveedor/biblioteca compatibles con Workers y coste $0.
2. Revisar el código actual, esquema de usuario/membresía/sesión y matriz de autorización; decidir compatibilidad de cuentas existentes.
3. Escribir tareas detalladas y casos de prueba antes de tocar código.
4. Implementar validación server-side y política allowlist con fallo cerrado, sin exponer secretos.
5. Implementar persistencia transaccional/identidad vinculada y migración solo probada en PostgreSQL efímero.
6. Añadir pruebas unitarias, integración real API+DB y E2E; no contar mocks como cobertura de integración.
7. Ejecutar revisión independiente de seguridad/datos, validar checks del SHA final y revisar el diff.
8. Abrir PR; no fusionar si hay checks obligatorios fallidos o hallazgos críticos.
9. Tras una futura autorización específica, preparar despliegue aislado; producción y Neon main continúan fuera de alcance de este plan.

## Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación / evidencia |
|---|---|---|
| Acceso abierto por allowlist ausente o vacía | Crítica | Fallo cerrado; prueba explícita de configuración ausente/vacía |
| Asociación insegura por email | Alta | Identidad issuer + subject; reglas explícitas para vinculación |
| Creación automática de owner/tenant | Alta | Definir bootstrap e invitación; prueba de no creación parcial |
| CSRF/replay/callback manipulado | Alta | State/nonce, redirect URI estricta, validación de claims y pruebas negativas |
| Fuga de tokens/secretos | Alta | Redacción de logs, secretos por entorno, escaneo y revisión del diff |
| Controles solo en frontend | Crítica | Middleware/validación server-side y pruebas cross-tenant |
| Dependencia/proveedor con costes | Alta | Confirmar límites y billing; mantener coste total $0 |
| Migración con impacto real | Crítica | Solo PostgreSQL efímero en esta fase; no tocar Neon main |

## Pruebas

- Unitarias: parser/validador de claims, state/nonce, allowlist exacta, normalización, fallo cerrado.
- Integración: callback válido y no válido, acceso permitido/no permitido, creación/vinculación transaccional, sesiones y revocación en PostgreSQL efímero.
- E2E: login exitoso simulado y fallos; posteriormente, integración con proveedor en entorno aislado si puede hacerse sin secretos/costes y sin comprometer cuentas reales.
- Seguridad: CSRF, replay, redirect, cookies, rate limits, filtración de información, tenant isolation, revisión Semgrep/Security.
- Migración/rollback: solo si el diseño requiere cambios DB; validar forward y rollback en PostgreSQL efímero, no Neon main.

## Reversión y compatibilidad

Desplegar solo tras definir cómo desactivar el flujo OAuth sin dejar registro abierto. Mantener contratos actuales durante la transición si no se ha aprobado su retirada. La reversión no debe crear cuentas/membresías parciales ni invalidar datos de identidad; cualquier migración debe tener estrategia de compatibilidad y rollback probada en DB efímera.

## Estado de seguimiento — reconciliación 2026-11-09

- D1–D8 ya están aprobadas; consultar `auth-policy-decision-record.md`.
- No inferir ni copiar credenciales OAuth desde este documento. La configuración real por entorno debe comprobarse mediante los mecanismos autorizados y nunca exponerse en documentación.
- La implementación usa OAuth 2.0/OIDC con `fetch` nativo y Web Crypto; la decisión D6 y sus límites están registrados en el decision record.
- La existencia del código no demuestra configuración correcta de todos los entornos, revisión independiente ni readiness de producción. Mantener esos gates abiertos hasta contar con evidencia vigente.
- La matriz de permisos por rol es independiente y está aprobada desde 2026-10-31; los handlers que falten siguen sujetos a su implementación y pruebas.
