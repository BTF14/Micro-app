# Checkpoint más reciente — 2026-10-18

> **Estado actual verificado:** PR #9 está fusionado en `main` mediante squash commit `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`. Todos los workflows de PR para su HEAD `ba1eebbe45b11e6e0b3562795cdb6c26b5c31c63` finalizaron en `success`: CI, migraciones, Security/Trivy, Semgrep, Playwright E2E, dashboard y validación SDD. Los checks del commit de merge en `main` aún deben verificarse por separado; no confundirlos con los checks del HEAD del PR.

> **Actualización de continuidad:** el PR #9 (`feat/sdd-agent-workflow`) tiene los seis workflows de CI/seguridad/E2E y la validación SDD en `success` para el HEAD `68659d1c1ec0cb9996293f78f9bd487e95124bbf`. PR #9 sigue pendiente de integración en este punto. La sección histórica inferior contiene snapshots anteriores; no usar sus SHA como estado vivo. Última verificación de checks: [Actions para el commit](https://github.com/BTF14/Micro-app/commits/feat/sdd-agent-workflow/).

- PR #8, panel de avance, fusionado: https://github.com/BTF14/Micro-app/pull/8
- Commit de merge: `449fc328bff4ffafd6b6a46c0e539ac85cbd9ebf`.
- Rama de trabajo integrada: `feat/sdd-agent-workflow`; PR #9 añadido a `main` con SDD, plantillas, perfiles y protocolo de continuidad.
- El SHA `94445d8cdbe37d3bde4eb1fa1c7f878ee75920ee` tuvo seis workflows con conclusión `success`: CI, validación de migraciones, security/Trivy, Semgrep, Playwright E2E y dashboard. Playwright usa mocks para el piloto; no acredita integración real API+DB.
- Archivos nuevos: `docs/SDD_WORKFLOW.md`, `templates/sdd/{spec,plan,tasks}.md`, `skills/feature-sdd/SKILL.md`, `.github/agents/{explorer,planner,implementer,reviewer,documentation}.agent.md`.
- Perfiles versionados no equivalen a procesos autónomos activos. GGA/Ollama/Engram/Gentle-AI/MCP siguen sin instalación/conexión verificada desde este chat.
- No se desplegó producción ni se mutó Neon `main`. Verificar el HEAD y los checks actuales antes de fusionar la nueva PR.

---

# Protocolo de continuidad para IA/chat — Micro app

**Última actualización:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app  
**Rama:** `main`  
**SHA verificado al escribir este handoff:** `12c0037f3928b2c54c3593d3f48a65bf3318f401`  
**Objetivo:** que una nueva IA retome el trabajo con evidencia, sin repetir solicitudes al usuario, perder decisiones ni inventar estados.

## Lectura obligatoria, en este orden

0. [Constitución del proyecto](CONSTITUTION.md) — reglas no negociables y jerarquía documental.
1. [Este handoff](HANDOFF_NEXT_CHAT.md).
2. [Plan maestro](PROJECT_PLAN.md).
3. [Diario de estado y decisiones](STATE_JOURNAL.md).
4. [Registro de recursos, herramientas y fuentes](RESOURCE_REGISTRY.md).
5. [Evaluación de Gentleman-Programming y adopción](GENTLEMAN_PROGRAMMING_EVALUATION.md).
6. [Modelo operativo de agentes](AGENT_OPERATING_MODEL.md) y perfiles en [`.github/agents/`](../.github/agents/).
7. Documentación de dominio: [API integration](API_INTEGRATION.md), [arquitectura/coste cero](ARCHITECTURE_AND_ZERO_COST.md), [esquema DB](DATABASE_SCHEMA.md), [revisión schema](SCHEMA_REVIEW.md), [inspiración](INSPIRATION.md), [seguridad](SECURITY_PLAN_2026.md), [cumplimiento](COMPLIANCE_REQUIREMENTS.md).

No asumir que un archivo está actualizado solo porque exista. Contrastar la sección de estado vigente con el código, GitHub y Actions.

## Snapshot de continuidad corregido — 2026-10-18

- Último commit observado en la búsqueda de GitHub: `7863973ed6e3869f525c6c89fc16412e92158fc2`.
- La consulta de status checks para ese SHA no devolvió checks; **Actions no verificado en este checkpoint**. Consultar las ejecuciones actuales antes de declarar éxito.
- Índice maestro: [PROJECT_PLAN.md](PROJECT_PLAN.md). Reglas rectoras: [CONSTITUTION.md](CONSTITUTION.md).
- Los snapshots históricos inferiores pueden estar obsoletos; no tratarlos como estado vivo sin verificación.

## Estado verificado en GitHub

- `main` = `12c0037f3928b2c54c3593d3f48a65bf3318f401` — commit `docs: flag identity requirements gap from code review`.
- En ese SHA, los tres workflows terminaron en **success**:
  - [CI](https://github.com/BTF14/Micro-app/actions/runs/39102740451)
  - [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39102740448)
  - [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39102740511)
- “Success” significa que pasaron esos workflows en ese SHA; no significa que el producto esté listo para producción ni que no existan vulnerabilidades.
- Rama `feat/neon-transaction-adapter` observada en `7989a84e39536029819735a5202f3934a8eb12c3`. No está fusionada según la evidencia consultada. Comparar diff completo contra `main`; no fusionar a ciegas.
- Otras ramas observadas: `feat/auth-session-foundation` (`3ac714ab0c5553c05bb73faa7046c8dead150121`), `feat/frontend-auth-flow` (`78aa6efbc81b072b57cec3ede514f41190fef713`), `feat/tenant-safe-schema` (`d4a6f7ac26ea8a56f0ee5b50bb1df2196a76a233`) y `fix/pnpm-lockfile-bootstrap` (`49c4604b8d760a56598a4089c79d8cd0008b8395`). Volver a consultar antes de usarlas.
- PR #4 “Add initial authentication and revocable sessions” ya fue fusionado; no repetirlo como tarea pendiente.
- El frontend de registro/login se conectó a la API en el commit `88d30d472905c81a90d9fffc967e3ba1df5084d1`; leer el código actual antes de hacer más cambios.

## Bloqueos y tareas prioritarias

### P0 — identidad/autorización incompleta respecto al requisito

La revisión estática de `apps/api/src/auth.ts` encontró `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`; en ese archivo no se encontró Google OAuth, allowlist ni verificación de email. La prueba `apps/api/src/auth.integration.test.ts` no acredita toda la matriz de autorización. Esto es un hallazgo de revisión estática, no una ejecución de prueba adicional.

Próximo paso: estudiar el modelo de identidad y requisitos existentes, proponer una implementación segura de Google + allowlist, documentar opciones y pruebas, sin inventar proveedor/configuración ni enviar correos. No declarar identidad completa hasta que código y tests lo demuestren.

### Integración Neon

Revisar `feat/neon-transaction-adapter` frente a `main`, identificar commits/archivos únicos y cambios ya superados; separar lo rescatable, probar con PostgreSQL efímero y abrir PR solo después de revisión y CI.

### Herramientas y memoria

Leer [GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md). Se inspeccionaron los README de Gentle-AI, Engram, GGA, Gentle Shell y Playwright. **No se han instalado ni integrado las herramientas Gentleman**, y no hay evidencia de subagentes autónomos corriendo en segundo plano. Los perfiles locales son instrucciones reutilizables, no ejecución efectiva.

## Restricciones no negociables

- Proyecto independiente de Cantina-pos y de otros repositorios.
- Presupuesto total objetivo **$0**. No habilitar billing, tarjetas, suscripciones ni servicios con cobro automático.
- No ejecutar migraciones ni SQL mutante en Neon `main`; usar PostgreSQL efímero o rama aislada.
- No desplegar producción ni realizar cambios irreversibles sin aceptación del usuario.
- No versionar ni exponer secretos, credenciales, tokens ni URLs de conexión.
- No enviar correos: solo el usuario puede autorizar su envío.
- No pedir que repita permisos/conexiones si no se ha demostrado un bloqueo concreto.
- El usuario autorizó cambios/commits/push seguros de forma autónoma; mantener guardrails para acciones de alto riesgo.
- No declarar tests verdes sin verificar el SHA exacto, el workflow y su conclusión.
- No afirmar que una herramienta/agente/memoria está activa sin evidencia observable.

## Protocolo obligatorio para cada sesión

1. Consultar HEAD actual de `main`, ramas, PR abiertos y Actions relevantes; este handoff es un snapshot, no una fuente viva.
2. Leer el código y documentos directamente afectados. No hacer cambios basados únicamente en resúmenes antiguos.
3. Registrar hipótesis por separado de hechos confirmados. Si falta evidencia, escribir “no verificado”.
4. Elegir un cambio acotado, con criterio de aceptación y plan de reversión.
5. Ejecutar tests relevantes. Registrar comando, resultado, SHA y limitaciones; no inventar ejecución local si solo corrió CI.
6. Revisar seguridad, coste y posibles efectos secundarios.
7. Hacer commit/push si el cambio es seguro y autorizado; nunca force-push ni cambiar producción por comodidad.
8. Actualizar diario, plan y handoff antes de cerrar, incluyendo SHA nuevo y enlaces de Actions.
9. Si se descubre contradicción, resolverla con evidencia y añadir una nota de corrección; no dejar dos instrucciones vigentes en paralelo.

## Prompt copiable para el próximo chat

> Continúa el proyecto Micro app en https://github.com/BTF14/Micro-app. Antes de cambiar código, lee completos `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md` y `docs/GENTLEMAN_PROGRAMMING_EVALUATION.md`; luego verifica en vivo el HEAD de main, ramas, PR y GitHub Actions. No confíes en snapshots viejos sin verificarlos. El requisito P0 es reconciliar autenticación Google + allowlist con el código actual; la rama feat/neon-transaction-adapter requiere diff completo, no merge ciego. Investiga Gentle-AI, Engram, Gentleman Guardian Angel, Gentle Shell y Playwright según la evaluación, pero no digas que están instalados o que hay subagentes corriendo si no hay evidencia. Haz cambios seguros, pruebas reales y push cuando proceda; actualiza documentación y registra SHA/resultados. Mantén el coste $0, no mezcles Cantina-pos, no migres Neon main, no despliegues producción, no expongas secretos ni envíes correos. No me pidas repetir conexiones/permisos salvo bloqueo demostrado. Distingue hechos, hipótesis y tareas pendientes; no alucines estados.



## Implementación Gentleman-Programming — checkpoint 2026-10-18

- Commit de implementación: `ae0c189487b37d910184b0b5cfa058ddbb6919d4` ([ver en GitHub](https://github.com/BTF14/Micro-app/commit/ae0c189487b37d910184b0b5cfa058ddbb6919d4)).
- Se añadió `.gga` configurado para Ollama local, `docs/GENTLEMAN_IMPLEMENTATION.md` y un enlace desde README.
- Esto es una primera integración versionada, **no** una instalación activa: GGA, Ollama, el modelo, Engram y Gentle-AI no se han ejecutado en este entorno. No se activó un hook local ni se instaló software en el dispositivo del usuario.
- En el momento de registrar el checkpoint, CI, validación de migraciones y escaneo de seguridad estaban `in_progress` para el SHA de implementación. Comprobar sus conclusiones actuales en los enlaces: [CI](https://github.com/BTF14/Micro-app/actions/runs/39103745784), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39103745734), [seguridad](https://github.com/BTF14/Micro-app/actions/runs/39103745953). No reutilizar este estado como si fuera el resultado final.
- Siguiente paso: confirmar Actions del SHA exacto; después, validar instalación y prueba de GGA/Engram en un terminal local o entorno compatible y continuar Gentle-AI. Mantener $0, no activar proveedor de pago, y documentar cada comando/resultado observable.


## Checkpoint nuevo — herramientas de seguridad y E2E (2026-10-18)

Este bloque es más reciente que los snapshots históricos de arriba. PR [#6](https://github.com/BTF14/Micro-app/pull/6) contiene los cambios de la rama `feat/security-e2e-tooling`. Para el SHA `c0bab00aeaee21a4848d6efd5fcf5c5066a5b582`, CI, migración, Security scan, Semgrep y Playwright E2E terminaron en success; verificar el SHA más reciente si hubo commits posteriores:

- `apps/web/playwright.config.ts` + `apps/web/e2e/auth.spec.ts`: dos pruebas de navegador (login exitoso y error de registro) con API simulada.
- `.github/workflows/playwright-e2e.yml`: instala Chromium y ejecuta Playwright; runner `@playwright/test@1.55.0` se instala temporalmente para no editar el lockfile en esta operación. No es aún una dependencia versionada del workspace.
- `.github/workflows/semgrep.yml`: análisis estático JS/TS y reporte SARIF como artefacto; terminó en success para el SHA indicado, pero no bloquea merges.
- `docs/OWASP_ASVS_CHECKLIST.md`: controles P0/P1/P2 que deben seguir sin marcar hasta aportar evidencia.
- `docs/POS_REFERENCE_MATRIX.md`: traduce investigación de OSPOS/NexoPOS/Lakasir/POSNext en criterios de aceptación.

Después de la fusión, verificar los workflows del commit nuevo de main y actualizar este handoff con sus resultados. Próximo paso técnico: fijar Playwright en el workspace y actualizar `pnpm-lock.yaml` mediante pnpm 10 en un entorno ejecutable; luego ampliar E2E y cubrir auth/allowlist real. Google OAuth + allowlist siguen siendo P0. No migrar Neon main ni desplegar producción.


## Prompt de inicio para cualquier IA nueva

> Trabaja exclusivamente en `BTF14/Micro-app`. Antes de tocar código, lee `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, `docs/AI_CONTINUITY_PROTOCOL.md` y los documentos de dominio relevantes. Verifica en vivo el SHA de `main`, PRs, ramas y Actions para el SHA exacto. Sigue `docs/SDD_WORKFLOW.md` para cambios significativos y usa `templates/sdd/`. Preserva coste $0; no mezcles Cantina-pos; no expongas secretos; no mutar Neon `main` ni desplegar producción sin autorización específica. Los perfiles `.github/agents/` no prueban que existan subagentes activos. Distingue hechos, inferencias y pendientes. No pidas repetir permisos o contexto ya documentado salvo bloqueo concreto. Al terminar, actualiza plan, diario, handoff y registro de recursos según corresponda, y proporciona enlaces a commits/PR/checks.
