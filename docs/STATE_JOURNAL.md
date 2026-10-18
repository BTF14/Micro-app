## 2026-10-18 — Checkpoint después de PR #27

- PR #27 fusionada: https://github.com/BTF14/Micro-app/pull/27
- Merge commit / `main`: `20c0dbda2a5c6b7de95e29efc1fee429de525b00` — https://github.com/BTF14/Micro-app/commit/20c0dbda2a5c6b7de95e29efc1fee429de525b00
- El head de PR #27 `29f899a52346d342067cf8e1b22850d35aa48a69` y el merge commit de `main` fueron verificados en GitHub Actions; los checks consultados terminaron en `success`.
- Enlaces de los checks del merge commit: [Pages](https://github.com/BTF14/Micro-app/runs/117814356290), [progreso](https://github.com/BTF14/Micro-app/actions/runs/39174497033), [Chromium auth](https://github.com/BTF14/Micro-app/actions/runs/39174496914), [Trivy](https://github.com/BTF14/Micro-app/actions/runs/39174496816), [verify](https://github.com/BTF14/Micro-app/actions/runs/39174496864), [JS/TS](https://github.com/BTF14/Micro-app/actions/runs/39174496812), [migraciones PostgreSQL](https://github.com/BTF14/Micro-app/actions/runs/39174496820).
- No se ejecutaron pruebas locales, no se desplegó producción y no se modificó Neon `main`.
- Bloqueo técnico vigente: todavía no hay handlers HTTP de negocio; no añadirlos hasta definir y probar permisos por rol/organización. D1–D8 de identidad siguen pendientes. Strix solo está documentado.
- Próximo paso: revisar el adaptador Neon divergido y preparar una matriz de permisos operativa sin asumir decisiones de identidad.

---

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


## 2026-10-18 — PR #9 fusionado y SDD/continuidad versionados en main

- PR #9: https://github.com/BTF14/Micro-app/pull/9 — estado verificado `merged`.
- Merge commit (squash): `f1a38f5bc4b101f9d73ae4ca26c2acafb2b208f3`.
- Checks del HEAD del PR `ba1eebbe45b11e6e0b3562795cdb6c26b5c31c63`: CI `39107363677` success; Database migration validation `39107363637` success; Security scan `39107363647` success; Semgrep `39107363624` success; Playwright E2E `39107363688` success; SDD validation `39107363683` success; dashboard `39107363673` success.
- La integración contiene SDD, plantillas, skill, perfiles reutilizables, validador de documentación y actualización de handoff/protocolo para nuevas IA.
- Próxima verificación pendiente: Actions asociadas al commit de merge y coherencia final del handoff en `main`.
- Límites: ningún agente local se ha instalado por este merge; no se mutó Neon `main`, no se desplegó producción y el objetivo de coste sigue en $0.


## 2026-10-18 — Política de cambios controlados en Neon `main`

- Decisión documental: reemplazar la prohibición absoluta de mutaciones en Neon `main` por una autorización condicionada a necesidad demostrada, identificación inequívoca del destino, revisión de SQL/migración, pruebas aisladas cuando sean viables, recuperación comprobable y validación posterior.
- Los cambios aditivos, compatibles, de bajo riesgo y recuperables pueden ejecutarse autónomamente tras superar el gate. Cambios destructivos, irreversibles/difíciles de revertir, masivos sobre datos críticos, de permisos/credenciales, con riesgo material de indisponibilidad o impacto incierto requieren aprobación explícita previa del usuario.
- Si no se puede confirmar destino, impacto o recuperación, detenerse; no improvisar ni continuar con incertidumbre.
- Cambios aplicados en esta rama documental: `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/HANDOFF_NEXT_CHAT.md`. No se ejecutó SQL, no se aplicaron migraciones y no se modificó ninguna base Neon.
- Pendiente: revisar diff y validaciones CI en PR antes de integrar. La actualización de la política no demuestra que exista un backup ni que la restauración esté configurada; eso deberá verificarse antes de cualquier mutación real.


## 2026-10-18 — Política de backup diario y revisión quincenal

- Fuente oficial de Neon consultada: https://neon.com/docs/postgres/backup-restore/history-window y https://neon.com/docs/introduction/plans. La documentación indica que el plan Free tiene hasta 6 horas de historial PITR (máximo 1 GB de historial), una snapshot manual y no ofrece snapshots programadas. Confirmar límites en la consola antes de depender de ellos.
- Se creó `docs/BACKUP_AND_RECOVERY.md` con requisitos de cobertura, retención, cifrado, control de acceso, restauración aislada, alertas y límites de coste.
- Objetivo recomendado: backup lógico diario automático a destino independiente privado/cifrado con retención limitada; revisión de salud y recuperación cada 15 días. No generar copias diarias en GitHub ni almacenar dumps con datos reales en el repositorio.
- Estado real: política documental solamente. No se configuró backup, no se descargaron datos, no se modificó Neon y no se probó restauración. El destino independiente gratuito, la automatización y los secretos aún deben diseñarse y verificarse antes de activar.
- Se actualizan instrucciones de agentes, constitución, cumplimiento, handoff y checklist de producción para que las IA no asuman ni inventen que los backups están activos.
- PR #13 fue fusionada en `3d8b571f1d6ed3478bf3cf6182c412d3282db586`; siete workflows terminaron en success para el HEAD del PR `e03d224f8aded9534db375068f3ae5cac0db8a60`. No se afirma aquí que los checks del merge SHA estén verificados.


## 2026-10-18 — PR #14 fusionada y evaluación de Google Drive

- PR #14 fusionada en `main`: `9480f84d8b7d28e830d0fd57212d29a75e44afbb`.
- Los siete workflows consultados para el HEAD exacto de PR #14 `b421e74631db3c21addd032f2bfbd780b935585d` concluyeron en `success`. No inferir de ello que se probaron backups ni restauración.
- Evaluación externa documentada en `docs/GOOGLE_DRIVE_BACKUP_EVALUATION.md`: Drive personal puede funcionar condicionado a espacio disponible, OAuth duradero, secreto seguro, coste $0 y pruebas de recuperación. Los 15 GB se comparten entre Gmail, Drive y Photos; cuentas de servicio no pueden poseer archivos de My Drive y no tienen cuota de almacenamiento propia. Fuente oficial: https://developers.google.com/workspace/drive/api/guides/about-sdk, https://developers.google.com/identity/protocols/oauth2, https://support.google.com/drive/answer/9312312?hl=en-en.
- Estado sin cambios en servicios reales: no backup activo, no restore probado, no acceso ni espacio Drive verificado, no credenciales creadas, no datos reales descargados, no SQL/migración y no despliegue.
- Decisión: no implementar aún el workflow con datos reales. Próximo paso seguro es prototipo de backup/restore con PostgreSQL desechable y datos sintéticos; confirmar límites/coste sin activar billing.


## 2026-10-18 — Evaluación de destino de respaldo integrada; backup sigue pendiente

- PR [#15](https://github.com/BTF14/Micro-app/pull/15) fusionada con squash en `ed9c5d89f9475a6ab9ec98e991d967319f244ccb`.
- La evaluación de Google Drive queda documentada como candidata condicional, no como elección ni configuración. No se accedió a cuentas ni secretos, no se descargaron datos reales, no se modificó Neon y no se activó billing.
- Para el SHA del PR `adc636732c24f74d3d6457a93af665647a00e097`, CI, Security scan, Semgrep, Playwright E2E, validación de migraciones y dashboard dieron success. La última consulta mostró workflows del merge SHA en ejecución; verificar en vivo.
- El backup diario externo cifrado, la alerta de fallos y la restauración aislada siguen pendientes. No considerar la política documental como evidencia de ejecución.
- Revisión de continuidad: `feat/neon-transaction-adapter` tiene 14 commits por delante y 31 detrás de `main`; `apps/api/src/database.ts` ya está presente en `main` y coincide con la versión revisada en esa rama. No fusionar rama divergida; inspeccionar/rescatar solo cambios exclusivos que sigan siendo necesarios.
- Próxima prioridad: requisito P0 Google Sign-In + allowlist. PR #12 es diseño solamente y decisiones D1–D8 siguen abiertas; no implementar OAuth ni inventar reglas de acceso antes de resolverlas.


## 2026-10-18 — PR #16 fusionada; revisión de autenticación documentada

- PR [#16](https://github.com/BTF14/Micro-app/pull/16) fusionada por squash; merge SHA `8f3a0316519dd39aded179bb234de316c83bb8ee`.
- Se añadió `docs/reviews/AUTHENTICATION_AUTHORIZATION_GAP_REVIEW_2026-10-18.md`, revisión estática de controles actuales, brechas y secuencia de aceptación. No se cambió código de autenticación, base de datos, secretos ni despliegue.
- Checks del HEAD exacto `e52033d15c4f37ac862d44a5f06097642a95d75d`: CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard, todos `success`. CI: https://github.com/BTF14/Micro-app/actions/runs/39110161670 ; E2E: https://github.com/BTF14/Micro-app/actions/runs/39110161665 ; migraciones: https://github.com/BTF14/Micro-app/actions/runs/39110161643 ; Semgrep: https://github.com/BTF14/Micro-app/actions/runs/39110161698 ; seguridad: https://github.com/BTF14/Micro-app/actions/runs/39110161635 ; dashboard: https://github.com/BTF14/Micro-app/actions/runs/39110161660.
- P0: el registro crea una organización y asigna rol `owner` sin allowlist; no se encontró Google OAuth/allowlist en `apps/api/src/auth.ts`. Es revisión estática, no prueba dinámica ni pentest.
- PR #12 está fusionada como diseño SDD, SHA `a28bbc686c7b1cb9cbe615ef5bcb9c7ece45ede3`; D1–D8 siguen pendientes. No implementar OAuth ni reglas de acceso por suposición.
- Sin cambios en Neon, credenciales, datos reales o producción. Backup externo automático y restauración real siguen sin estar configurados/verificados.


## 2026-10-18 — PR #17 fusionada; continuidad y checks verificados

- PR [#17](https://github.com/BTF14/Micro-app/pull/17) fusionada por squash; merge SHA `f196077b1ad5800e287c9f88890439826bdf3f0f`. HEAD de `main` verificado en ese mismo SHA.
- Para el HEAD exacto del PR `a27f05e1e5d17bfb395671d230d1c9b6884e85ca`, los workflows CI, Playwright E2E, validación de migraciones, Semgrep, Security scan y dashboard terminaron en `success`; Security scan se ejecutó dos veces y ambas terminaron en `success`. Estos son checks del commit de documentación, no validación de producción.
- El registro público de la API sigue siendo P0: `POST /auth/register` permite crear una organización y asignar rol `owner` sin allowlist. No habilitar usuarios ni datos comerciales reales hasta cerrar el requisito de acceso.
- PR #12 es diseño SDD ya fusionado; decisiones D1–D8 aún no están documentadas como resueltas. Próximo paso seguro: releer el documento fuente de SDD y separar decisiones que ya están respaldadas por requisitos de las que requieren confirmación de producto. No inventar allowlist, administrador, dominios ni política de vinculación.
- La rama `main` no tiene protección de branch configurada según lectura de GitHub (`protected=false`, checks requeridos vacíos). Es una mejora de gobernanza a evaluar, no se cambió en este trabajo.
- Backup externo automatizado, destino independiente, alertas y restauración aislada siguen pendientes. No hay despliegue de producción ni cambios en Neon/secretos/datos reales.


## 2026-10-18 — PR #19 y #20 fusionadas; traspaso entre chats

- PR [#20](https://github.com/BTF14/Micro-app/pull/20) añade documentación de adopción controlada de Strix; merge SHA `c87361685ef1ce36e4cf6025124b09e70ffa0846`.
- PR [#19](https://github.com/BTF14/Micro-app/pull/19) añade un registro de opciones para las decisiones D1–D8 de autenticación; merge SHA `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Son opciones propuestas, no decisiones de producto aprobadas.
- HEAD de `main` verificado después de ambas fusiones: `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`.
- Para ese SHA exacto, CI, Playwright E2E, validación de migraciones, Semgrep SAST, Security scan y dashboard concluyeron en success: [CI](https://github.com/BTF14/Micro-app/actions/runs/39129579632), [E2E](https://github.com/BTF14/Micro-app/actions/runs/39129579599), [migraciones](https://github.com/BTF14/Micro-app/actions/runs/39129579656), [Semgrep](https://github.com/BTF14/Micro-app/actions/runs/39129579602), [Security](https://github.com/BTF14/Micro-app/actions/runs/39129579595), [dashboard](https://github.com/BTF14/Micro-app/actions/runs/39129579631).
- La documentación de Strix explica propósito, escenarios, requisitos de coste/aislamiento y gates. Strix no está instalado ni ejecutado; no hay escaneo ni informe y no se añadió workflow de Strix.
- Se actualiza el handoff para el cambio de chat debido al límite de duración de la conversación. Las tareas P0 de autenticación/allowlist, pruebas API+DB reales y backup/restore siguen pendientes. No se mutó Neon ni se desplegó producción.


## 2026-10-18 — Verificación viva de PR #21 y bloqueo P0

- GitHub API confirma `main` en `1228a43cb4bc5e1ef8aabb548b034a0af97ec253`. Rama sin protección activa ni checks requeridos (`protected=false`).
- PR [#21](https://github.com/BTF14/Micro-app/pull/21) permanece abierta, `merged=false`, HEAD `fb9ab271cc8b1c72e92d7874672913698c59bfe7`; no fusionada. Checks del SHA exacto: CI run 39129938686, Playwright E2E 39129938460, migraciones 39129938520, Semgrep 39129938702, Security scan 39129938471 y dashboard 39129938467; todos `success`. El status API clásico devolvió cero checks, por lo que se documentan los workflow runs como fuente de evidencia.
- El bot Codex marcó revisión como fallida/con hallazgos sin resolver, pero la API no devolvió review formal ni comentarios inline y el bot indicó límite de uso. No hay hallazgo técnico concreto reproducible que se pueda corregir; mantener PR sin fusionar hasta revisar el diff y resolver/explicar la señal.
- La lectura actual de `apps/api/src/auth.ts` (blob SHA `0735dbad34bd5c932852882da0bff6eebbab337a`) confirma que el registro por contraseña crea usuario, organización, membresía `owner` y sesión; no se ve Google OAuth ni allowlist. Test `apps/api/src/auth.integration.test.ts` usa PostgreSQL efímero en CI, pero no prueba el requisito OAuth/allowlist ni aislamiento cross-tenant integral.
- D1–D8 continúan sin aprobar. No elegir de forma autónoma correos, dominios, bootstrap, altas de organizaciones ni vinculación de cuentas. P0 continúa abierto; no declarar producción lista.
- Strix solo documentado, no instalado/ejecutado. Sin cambios en Neon, producción, credenciales, datos reales, correos ni facturación.

## 2026-10-18 — Fusión de PR #21

- El usuario autorizó fusionar PR #21 tras verificar los checks. GitHub confirmó la fusión por squash con commit `7491b97a2bde52555fe9b8a5d808ad81b829d90e`.
- Cambios incluidos: únicamente `docs/HANDOFF_NEXT_CHAT.md`, `docs/PROJECT_PLAN.md`, `docs/RESOURCE_REGISTRY.md` y `docs/STATE_JOURNAL.md`.
- Los 7 workflows de Actions reportados para el HEAD de la PR terminaron en `success`. La revisión Codex quedó fallida por límite de uso y sin hallazgo técnico concreto recuperable; no tratarla como aprobación.
- Sin despliegue de producción ni cambios en Neon, secretos, datos reales o facturación. Auth/allowlist P0, decisiones D1–D8 y backup/restore verificado continúan pendientes.


## 2026-10-18 — Checkpoint posterior a PR #23 y matriz de aislamiento tenant

- HEAD de `main` verificado: `838715d211918f521f5e6401a91dc773236ef3ad`, merge de [PR #23](https://github.com/BTF14/Micro-app/pull/23).
- Siete workflows sobre ese SHA terminaron en success: CI 39132076336, Playwright E2E 39132076316, Semgrep 39132076300, Security scan 39132076368, validación de migraciones 39132076356, validación SDD/documentación 39132076394 y panel 39132076363.
- Revisión de `apps/api/src/index.ts` y `apps/api/src/auth.ts`: solo están health y endpoints de autenticación; aún no hay handlers HTTP de productos, proveedores, ventas, pagos o movimientos. No se inventaron rutas para fabricar pruebas de aislamiento.
- Se creó `docs/TENANT_ISOLATION_TEST_PLAN.md` con escenarios positivos/negativos por recurso, roles, membresía y sesiones, para ejecutar contra PostgreSQL efímero cuando se implementen los handlers.
- Se actualizó `docs/CURRENT_STATE.md` para reflejar el SHA vivo y distinguir workflows verdes de preparación comercial.
- No se modificó Neon `main`, no se usaron datos reales y no hubo despliegue.
- Bloqueos sin cambios: Google OAuth + allowlist y decisiones D1–D8 pendientes; backups/restauración independiente no verificados; protección de rama no activa en la última consulta.


## 2026-10-18 — PR #24 fusionada y verificación de merge

- Se verificó que PR #24 (`docs: define tenant isolation acceptance matrix`) estaba abierta, mergeable y con los siete workflows en `success` en el head exacto `e7856319321f1aa1047148fd782fcadb77f091c2`.
- Se fusionó mediante squash con protección de SHA esperado; GitHub confirmó merge commit `69032a333b52ee10099c0347be3443e18f4dc4df`.
- En la primera consulta posterior al merge, el panel de progreso terminó en `success`; CI, Playwright E2E, Security scan, Semgrep SAST y validación de migraciones seguían `in_progress`. No se afirma que el SHA del merge esté completamente verde hasta volver a consultar.
- Sin cambios de código de producto, base de datos, Neon ni despliegue. La matriz documenta pruebas futuras, no evidencia de aislamiento en endpoints inexistentes.


## 2026-10-18 — PR #25 fusionada y checkpoint corregido

- PR #25: https://github.com/BTF14/Micro-app/pull/25, merge commit `ed0d39f5bc248c9e5d5a1c5008352e8a390a0374`.
- Head de PR #25 `e5d671ed5087ea18f96d4dead79b76bb933d071d`: siete workflows consultados en `success`.
- Los seis workflows del merge commit `ed0d39f5bc248c9e5d5a1c5008352e8a390a0374` estaban en ejecución en la última consulta; comprobarlos de nuevo antes de informar que el commit de main está verde.
- Se detectaron snapshots antiguos contradictorios en la documentación de continuidad. Se antepone un checkpoint autoritativo que identifica explícitamente los bloques inferiores como históricos y preserva el historial.
- Sin cambios de código, base de datos, secretos o despliegue de producción.


## 2026-10-18 — Verificación posterior a PR #26

- HEAD de `main` verificado: `a3cc3ae7533510baf2502a3f553030c2c8505a4c`.
- PR #26 fusionada: https://github.com/BTF14/Micro-app/pull/26. No hay PR abiertas en la consulta de GitHub de este checkpoint.
- Para el SHA exacto de `main`, los seis workflows terminaron en `success`: CI (https://github.com/BTF14/Micro-app/actions/runs/39133032751), Playwright E2E (https://github.com/BTF14/Micro-app/actions/runs/39133032760), Security scan (https://github.com/BTF14/Micro-app/actions/runs/39133032817), Semgrep SAST (https://github.com/BTF14/Micro-app/actions/runs/39133032755), validación de migraciones (https://github.com/BTF14/Micro-app/actions/runs/39133032686) y panel de progreso (https://github.com/BTF14/Micro-app/actions/runs/39133032670).
- No se ejecutaron pruebas localmente; esta evidencia corresponde a GitHub Actions para el SHA indicado.
- Sin cambios de código de producto, base de datos, secretos o despliegue de producción.
- Estado comercial sigue siendo no listo para producción: faltan endpoints de negocio, OAuth + allowlist con decisiones D1–D8 aprobadas, pruebas completas de aislamiento/autorización y respaldo/restauración independientes verificados.
