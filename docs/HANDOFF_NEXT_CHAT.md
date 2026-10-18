# Micro app — handoff vigente para continuar en otro chat

## Estado vivo verificado — 2026-10-18 (prevalece sobre el historial inferior)

- Último SHA de `main` comprobado antes de este checkpoint documental: `995608af8584442a9f174f9cf55ed7861749b872` (`docs: refresh handoff with current repository state`).
- En el SHA anterior `8574bef7c5bc38cb85e55007816b6efc8b54a826`, [CI](https://github.com/BTF14/Micro-app/actions/runs/39102311090), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102311097) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102311100) terminaron en `success`. Para el SHA `995608af8584442a9f174f9cf55ed7861749b872`, las nuevas ejecuciones estaban `pending/queued` al consultarlas: [CI](https://github.com/BTF14/Micro-app/actions/runs/39102649341), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102649354) y [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102649347). Reconsultar el SHA más reciente después de este commit documental; no afirmar que esos checks están verdes sin comprobarlos.
- El CI actual usa `pnpm install --frozen-lockfile`, ejecuta build, pruebas unitarias y `src/auth.integration.test.ts` con PostgreSQL efímero. La migración también se valida contra PostgreSQL desechable; no se ha autorizado migrar Neon main.
- `pnpm-lock.yaml` existe en main (tamaño 77,520 bytes al consultar el contenido de GitHub). La afirmación histórica de que no había lockfile ya no describe main.
- El último commit de código anterior a los documentos es `88d30d472905c81a90d9fffc967e3ba1df5084d1`, que conectó el flujo frontend de registro/login con la API. El contenido de `docs/API_INTEGRATION.md` conserva una frase antigua que dice lo contrario; debe corregirse para evitar contradicción.
- La rama `feat/neon-transaction-adapter` está en `7989a84e39536029819735a5202f3934a8eb12c3`; no se fusionó automáticamente. Debe revisarse su diff completo con respecto a main antes de decidir qué rescatar.
- Otras ramas que existen al comprobar GitHub: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. Los SHA de las ramas pueden avanzar; volver a consultarlos antes de trabajar.
- Ya hay material persistente en `docs/INSPIRATION.md`, `docs/SECURITY_PLAN_2026.md`, `docs/API_INTEGRATION.md`, `docs/ARCHITECTURE_AND_ZERO_COST.md`, `docs/DATABASE_SCHEMA.md`, `docs/SCHEMA_REVIEW.md` y `docs/COMPLIANCE_REQUIREMENTS.md`. La continuidad debe enlazar y reconciliar estos documentos, no sustituirlos por un resumen corto.
- **Bloqueo de requisitos de identidad detectado en revisión del código:** `apps/api/src/auth.ts` solo expone `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/logout`; no se encontró implementación de Google OAuth, allowlist ni verificación de email. La prueba de integración `apps/api/src/auth.integration.test.ts` tiene un escenario principal de registro/login/sesión/revocación, no la matriz completa de autorización. Esto contradice el requisito previamente acordado de acceso Google + allowlist y debe tratarse como P0 antes de considerar identidad lista; no declarar producción-ready. No cambiar el modelo de identidad ni enviar correos sin decisión del usuario.
- Se añaden el modelo operativo de agentes, el registro de recursos y el diario de estado. Los archivos `.github/agents/*.agent.md` definen roles reutilizables en entornos compatibles con agentes; no implican que GitHub Actions ni este chat estén ejecutando agentes autónomos en segundo plano.

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

**Actualizado:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Plan maestro obligatorio:** [docs/PROJECT_PLAN.md](https://github.com/BTF14/Micro-app/blob/main/docs/PROJECT_PLAN.md)

> Lee primero `docs/PROJECT_PLAN.md` completo. Este archivo complementa el plan con el punto de continuidad. Las secciones antiguas de chats anteriores quedan reemplazadas por este bloque vigente y por el plan maestro cuando haya contradicciones. Antes de empezar a programar, vuelve a comprobar la punta actual de `main`, ramas, PR y Actions.

## Estado actual confirmado al preparar este traspaso

- `main` estaba en `88d30d472905c81a90d9fffc967e3ba1df5084d1` antes de añadir `docs/PROJECT_PLAN.md`.
- PR #4, **Add initial authentication and revocable sessions**, ya está **fusionado**, con merge commit `e9e146020e7195c12da5f880a5dbf26b4e96752c`. No seguir describiéndolo como abierto ni en borrador.
- El commit `88d30d472905c81a90d9fffc967e3ba1df5084d1` conectó el flujo de inicio de sesión/registro del frontend a la API. Su mensaje informa CI, escaneo de seguridad y validación de migración aprobados; volver a comprobar las ejecuciones reales para el SHA más reciente antes de afirmar que todo está verde.
- Se creó el plan maestro en `docs/PROJECT_PLAN.md`, commit documental `632ca1ed7600c888db3f38516debe85ac8053723`. Comprobar que el commit quedó en `main` y revisar Actions posteriores.
- Existe la rama `feat/neon-transaction-adapter`; la comparación observada frente a `main` indicó 14 commits por delante y 5 por detrás, con cambios de adaptador DB, pruebas y documentación de seguridad. **No fusionar a ciegas.** Revisar el diff completo, sincronizar de forma segura y ejecutar CI. Los planes y cambios de esa rama no se consideran integrados en `main` hasta comprobarlo.
- Otras ramas observadas: `feat/auth-session-foundation`, `feat/frontend-auth-flow`, `feat/tenant-safe-schema`, `fix/pnpm-lockfile-bootstrap` y `main`. La lista puede cambiar; consultarla de nuevo.
- La interfaz y API siguen siendo un trabajo en curso. No declarar el POS completo ni listo para uso comercial.

## Restricciones obligatorias

1. **No ejecutar migraciones ni SQL mutante en Neon main.** La rama principal de la base de datos permanece protegida hasta recibir autorización explícita y específica del usuario. Para integración usar PostgreSQL temporal/destruible.
2. Mantener Micro app independiente de Cantina-pos y otros proyectos.
3. Coste objetivo $0: no habilitar facturación, servicios de pago, suscripciones ni cargos automáticos.
4. No desplegar a producción ni hacer cambios irreversibles sin aceptación.
5. No revelar ni versionar secretos, credenciales, tokens o cadenas de conexión.
6. El usuario ya autorizó trabajo autónomo y commits/push cuando sea seguro. No pedirle que repita conexiones/permisos sin demostrar un bloqueo real.
7. Actualizar `docs/PROJECT_PLAN.md` y este archivo con cada checkpoint importante.

## Trabajo inmediato

1. Verificar el commit actual de `main` y los checks/Actions posteriores al commit documental del plan. Informar de resultados por SHA exacto.
2. Revisar `feat/neon-transaction-adapter` contra `main`: adaptador, transacciones, pruebas, dependencias y plan de seguridad. Resolver los 5 commits de divergencia con cuidado; no sobrescribir los cambios ya fusionados en main.
3. Completar y ejecutar pruebas HTTP de integración de autenticación usando un PostgreSQL efímero: registro atómico, duplicados, login correcto/incorrecto, sesión actual, usuarios/membresías inactivos, logout/revocación y fallos de DB.
4. Revisar expiración/limpieza de sesiones, retención de rate limits, validación de hashes malformados y configuración de cookies/orígenes. Mantener autorización de servidor por organización para cada operación.
5. Confirmar reproducibilidad de dependencias y lockfile pnpm real; no fabricar el lockfile a mano.
6. Continuar por las fases del plan maestro: DB, productos/inventario, tasa USD/VES, ventas atómicas/idempotentes, pagos/recibos, devoluciones, reportes/auditoría, UI responsive y E2E.
7. Cada cambio significativo debe tener commit, pruebas reales y revisión de Actions en el SHA nuevo. Actualizar documentación antes de terminar el trabajo.

## Base de datos Neon — recordatorio

- Proyecto independiente: `micro-app-db`, ID `restless-fire-99110035`, PostgreSQL 18, región `aws-us-east-1`, plan Free.
- Rama primaria `main`, ID `br-summer-math-b7297a60`, base `neondb`.
- La migración se ha preparado/probado en entornos aislados, pero no se debe aplicar a la rama primaria sin aprobación explícita.
- No usar la organización Neon `Vercel: btfcasheb-8016's projects`; pertenece a otro contexto.

## Prompt para el próximo chat

> Continúa Micro app leyendo primero el plan maestro https://github.com/BTF14/Micro-app/blob/main/docs/PROJECT_PLAN.md y este handoff https://github.com/BTF14/Micro-app/blob/main/docs/HANDOFF_NEXT_CHAT.md. Verifica el estado real de main, ramas/PR y GitHub Actions antes de modificar código. PR #4 ya fue fusionado; no repitas ese trabajo ni supongas que feat/neon-transaction-adapter está integrado. Revisa esa rama contra main y continúa las pruebas de integración de autenticación con PostgreSQL temporal, arreglando cualquier fallo. Haz cambios reales y seguros, súbelos a GitHub y documenta commits y pruebas verificadas. No apliques migraciones a Neon main, no uses otros proyectos, no despliegues producción y mantén coste $0. No expongas secretos ni pidas repetir conexiones/permisos sin una causa demostrada.
