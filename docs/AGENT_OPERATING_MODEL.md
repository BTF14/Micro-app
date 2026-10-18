# Modelo operativo de agentes y subagentes

Actualizado: 2026-10-18. Este documento define cómo repartir y comprobar el trabajo de Micro app entre roles especializados. No es una afirmación de que haya procesos autónomos en segundo plano: cada agente solo está activo cuando el entorno de ejecución lo inicia explícitamente.

## Objetivo

Evitar que una única pasada generalista omita seguridad, pruebas, avance del repositorio, materiales de apoyo o continuidad. El orquestador debe usar agentes independientes cuando el entorno lo permita; si no hay capacidad real de lanzar subagentes, debe ejecutar las mismas pistas como revisiones separadas y registrar esa limitación, sin simular resultados.

## Roles

| Rol | Alcance | Entregable obligatorio |
|---|---|---|
| Orquestador / Tech Lead | Lee el estado Git, asigna tareas, mantiene prioridades, reconcilia hallazgos, controla restricciones y decide integración. | Resumen de decisión, lista de bloqueos, SHA y próximo paso. |
| Subagente de seguridad | Threat modeling, OWASP ASVS/API Security, autenticación, autorización, aislamiento multiempresa, secretos, rate limits, análisis estático/DAST. | Hallazgos con severidad, archivo/línea o evidencia, reproducción y mitigación; separar verificado de hipotético. |
| Subagente backend/datos | Hono/Workers, Neon/PostgreSQL, Drizzle/migraciones, transacciones, idempotencia, concurrencia, integridad multiempresa. | Revisión por archivo, pruebas de integración, riesgos de rollback y estado de migraciones. |
| Subagente QA/CI | Revisa workflows, lockfile, build, unitarias, integración, E2E y evidencia de Actions. | SHA exacto, comandos ejecutados, resultados y enlaces de workflows. |
| Subagente frontend/UX | React/Vite/TypeScript, flujos reales de auth, responsive, accesibilidad, estados de error y diseño. | Rutas/archivos afectados, comprobaciones de UX y pruebas reproducibles. |
| Subagente documentación/recursos | Inventario de herramientas, fuentes web, repositorios de referencia, decisiones, memoria persistente y consistencia documental. | Enlaces verificables, fecha de consulta, decisión y archivos actualizados. |

## Contrato de trabajo

1. Antes de editar: comprobar `main`, SHA, ramas, PRs, árbol del repositorio y Actions.
2. Cada pista recibe una pregunta concreta y un alcance limitado. Los agentes no deben editar los mismos archivos simultáneamente; si es inevitable, el orquestador serializa la integración.
3. Los hallazgos deben etiquetarse como **verificado**, **inferido**, **pendiente** o **bloqueado**. Adjuntar evidencia (ruta/línea, commit, ejecución o URL).
4. Ningún agente puede autorizar una migración a Neon main, un despliegue de producción, un gasto o una excepción de seguridad.
5. Ningún agente puede declarar una fase terminada solo porque compile o porque un escáner esté verde.
6. El orquestador revisa conflictos y conclusiones incompatibles; no suma reportes sin conciliarlos.
7. Cada sesión que cambie el repositorio actualiza `docs/STATE_JOURNAL.md`, `docs/PROJECT_PLAN.md` y `docs/HANDOFF_NEXT_CHAT.md` cuando cambie el punto de continuidad.
8. Si no hay herramienta de agentes disponible, el asistente debe decirlo claramente y ejecutar pistas de revisión independientes; nunca afirmar “subagentes trabajando” sin ejecuciones reales.

## Ciclo por tarea

1. **Descubrimiento:** estado Git/Actions, documentos existentes y restricciones.
2. **Delegación:** definir misión, límites, evidencia esperada y archivos que puede tocar cada rol.
3. **Revisión paralela:** seguridad, backend/datos, QA, frontend y documentación según el cambio.
4. **Integración:** orquestador aplica el cambio mínimo y revisa diff.
5. **Verificación:** pruebas relevantes y Actions del nuevo SHA.
6. **Persistencia:** registrar decisiones, referencias, resultados y tareas pendientes en Git.
7. **Handoff:** enlazar el estado actual y copiar un prompt de continuidad que no dependa de memoria de chat.

## Límites de autoridad

- Presupuesto total: $0; no activar facturación, suscripciones o cargos automáticos.
- Neon `main`: inspección de solo lectura; no ejecutar migraciones/SQL mutante sin autorización específica posterior del usuario.
- No desplegar producción ni hacer cambios irreversibles sin aceptación.
- Mantener Micro app separada de Cantina-pos y cualquier otro proyecto.
- No versionar ni imprimir secretos.
- El usuario autorizó trabajo autónomo seguro, commits y push; no pedirle que repita conexiones sin evidencia de un bloqueo.

## Criterios de finalización de una sesión

- [ ] Cambios/decisiones y SHA registrados.
- [ ] Test y workflows referidos al SHA exacto.
- [ ] Recursos nuevos registrados con URL y motivo de uso.
- [ ] Riesgos y tareas no completadas visibles.
- [ ] Plan y handoff sin contradicciones conocidas.
- [ ] Sin mutaciones de Neon main, despliegue de producción ni gasto no autorizado.


## Flujo SDD y nuevos perfiles

El proceso de especificación, planificación, tareas, implementación, revisión y validación está descrito en [SDD_WORKFLOW.md](SDD_WORKFLOW.md). Las plantillas reutilizables están en [templates/sdd/](../templates/sdd/) y la receta de funciones en [feature-sdd skill](../skills/feature-sdd/SKILL.md).

Perfiles adicionales versionados: [explorer](../.github/agents/explorer.agent.md), [planner](../.github/agents/planner.agent.md), [implementer](../.github/agents/implementer.agent.md), [reviewer](../.github/agents/reviewer.agent.md) y [documentation](../.github/agents/documentation.agent.md). Son contratos de rol reutilizables, no procesos activos por sí solos. En ChatGPT se ejecutarán solo las capacidades conectadas; cuando no haya subagentes lanzables, el coordinador hará revisiones separadas y lo declarará.
