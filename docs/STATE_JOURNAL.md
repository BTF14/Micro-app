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
