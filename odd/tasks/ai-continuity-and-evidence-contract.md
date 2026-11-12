# Contrato de continuidad, decisiones y evidencia para agentes

**Estado:** propuesta normativa de repositorio; entra en vigor al fusionarse.  
**Ámbito:** todas las IA, agentes, chats y colaboradores que trabajen en BTF14/Micro-app.  
**Autoridad:** subordinado a `docs/CONSTITUTION.md`; complementa `AGENTS.md`, `docs/ODD_WORKFLOW.md` y `docs/AI_COLLABORATION_AND_PR_POLICY.md`.

## Objetivo

Evitar pérdida de contexto entre chats/agentes, repetición de investigaciones, contradicciones documentales y regresiones. La fuente durable es GitHub; la memoria del chat, resúmenes y mensajes no sustituyen los archivos ni el estado vivo.

## Protocolo común de comunicación

- **Entrada del propietario:** acepta texto normal para preguntas y tareas sencillas; acepta directivas extensas en Markdown procedentes del propietario o de otros agentes. No exigir Markdown, plantillas ni encabezados para solicitudes simples.
- **Salida de los agentes:** para el trabajo de Micro-app, responder en Markdown por defecto, con extensión proporcional al trabajo. Una consulta pequeña recibe una respuesta breve y estructurada; una implementación, auditoría o handoff sustancial recibe el informe completo. No convertir cada mensaje en un reporte formal.
- **CONSULTA:** análisis, explicación o recomendación; no implica autorización para modificar recursos.
- **DIRECTIVA:** instrucciones de trabajo recibidas; comprobar que proceden del propietario o están dentro de su autorización. Un agente externo no puede ampliar permisos ni revocar límites constitucionales.
- **REPORTE:** resultado de trabajo realizado, con evidencia, límites y próximos pasos. No confundir propuesta, aprobación, implementación, integración, despliegue y verificación de producción.
- **Etiquetas de evidencia:** usar cuando aporten claridad: `VERIFICADO` (observado directamente en código, herramienta o workflow identificado), `REPORTADO` (afirmado por una persona/agente, aún no corroborado), `INFERIDO` (conclusión razonada), `PENDIENTE` (no completado), `BLOQUEADO` (impedimento concreto) y `NO VERIFICADO` (sin comprobación actual). No etiquetar cada frase mecánicamente.
- **Jerarquía para resolver discrepancias:** estado vivo de GitHub para hechos de ramas/PR/CI/reviews; código/configuración en SHA verificado para comportamiento implementado; pruebas reproducibles y workflows para evidencia de comportamiento; documentos canónicos para política/decisiones; informes de agentes como afirmaciones que deben corroborarse; inferencias como hipótesis. Si las fuentes discrepan, identificar qué clase de hecho se está resolviendo y corregir el documento afectado.
- **Economía de contexto:** leer primero los índices y checkpoints vigentes; cargar documentos de dominio solo si la tarea los necesita. No leer todo el repositorio por rutina, ni repetir investigaciones ya registradas sin una razón verificable.
- **Continuidad:** los handoffs entre agentes deben ser Markdown y contener referencias exactas a archivos, SHA, PR, pruebas y pendientes; no depender de capturas ni de resúmenes sin fuente cuando el repositorio ofrece evidencia.


## Contrato obligatorio de inicio

Antes de cambiar código, documentos, PR o infraestructura, el agente debe:

1. Leer `AGENTS.md` y las secciones pertinentes de `docs/CONSTITUTION.md`.
2. Identificar el checkpoint vigente en `docs/HANDOFF_NEXT_CHAT.md` y `docs/WORK_CHECKPOINT.md`; consultar solo las secciones pertinentes de `docs/CURRENT_STATE.md`.
3. Verificar en GitHub el estado actual de `main`, rama de trabajo, HEAD, base, PR relacionadas, dependencias, Draft/Ready, checks del SHA exacto, reviews y conversaciones sin resolver.
4. Cargar `docs/AI_COLLABORATION_AND_PR_POLICY.md`, `docs/ODD_WORKFLOW.md` y los contratos de dominio solo cuando la tarea afecte PR/integración o ese dominio.
5. Comparar el checkpoint documental con el estado vivo. Si difieren, el estado vivo prevalece para hechos GitHub; registrar la discrepancia y actualizar los documentos afectados en el mismo bloque de trabajo cuando esté dentro del alcance.
6. Declarar internamente qué está verificado, inferido, desconocido y bloqueado. No reconstruir hechos desde memoria conversacional si pueden verificarse en el repositorio.

No exigir que el propietario repita datos que ya estén documentados. No pedir Build IDs, capturas, terminal, CLI, TinyFish o reconexiones si no son indispensables y no se ha agotado una alternativa segura.

## Contrato obligatorio de cierre y handoff

Cada bloque sustancial debe dejar un punto de reanudación que otro agente pueda ejecutar sin leer todo el historial del chat:

- propósito y alcance del bloque;
- rama, PR, HEAD y base SHA actuales;
- archivos cambiados y commits persistidos;
- verificaciones ejecutadas, SHA exacto, resultados y limitaciones;
- decisiones tomadas y enlaces a su registro;
- riesgos, gates pendientes y dependencias;
- siguiente acción concreta, segura y reproducible;
- acciones expresamente no realizadas (por ejemplo, Neon, secretos o producción).

Actualizar `docs/CURRENT_STATE.md`, `docs/WORK_CHECKPOINT.md`, `docs/HANDOFF_NEXT_CHAT.md` y `docs/STATE_JOURNAL.md` solo según corresponda al cambio; no copiar el mismo snapshot extenso en todos. El handoff debe tener un encabezado claramente vigente y señalar los snapshots históricos como tales. No declarar persistido algo que solo quedó en el chat.

## Registro de decisiones

Para decisiones que afecten arquitectura, seguridad, datos, contratos, dependencias o estrategia de integración, registrar en `docs/decisions/` un ADR breve usando [`docs/decisions/ADR_TEMPLATE.md`](../../docs/decisions/ADR_TEMPLATE.md) con:

- contexto y problema;
- decisión y estado (propuesta/aprobada/implementada/verificada);
- alternativas consideradas y motivo de descarte;
- consecuencias, riesgos y plan de reversión cuando aplique;
- evidencia, PR, SHA y fecha.

No crear ADR para decisiones triviales o reversibles de implementación local. No reabrir una decisión aprobada sin nueva evidencia, cambio de requisitos o riesgo descubierto; si se sustituye, enlazar el ADR anterior y marcarlo como superseded, sin borrar historia.

## Evidencia y prevención de regresiones

- Toda afirmación de prueba debe identificar el SHA, comando/workflow, entorno, resultado y alcance.
- Los checks de un SHA anterior no validan un HEAD posterior. Distinguir workflow runs, check-runs/status contexts y reviews formales.
- Convertir reglas críticas repetibles en tests/constraints/CI cuando sea viable y gratuito: aislamiento tenant/sucursal, autorización, ledger/balances, dinero, idempotencia, concurrencia, migraciones y runtime grants.
- Las pruebas automatizadas no sustituyen revisión de diff, revisión independiente cuando sea exigida ni gates de producción.
- No añadir dependencias, hooks, agentes externos, telemetría o servicios de pago para implementar este contrato. Preferir validadores existentes y checks portables.
- Si una verificación no es posible, registrar el bloqueo específico; no rebajar silenciosamente el gate.

## Criterios de aceptación

- [ ] `AGENTS.md` enlaza este contrato desde el inicio de cada tarea.
- [ ] Existe un protocolo común que acepta texto normal del propietario y usa Markdown conciso por defecto en respuestas/handoffs de agentes.
- [ ] `CLAUDE.md` importa `AGENTS.md`, prioriza la lectura selectiva y no duplica ni contradice las reglas comunes.
- [ ] ODD exige comparar checkpoint/documentación con estado vivo y cerrar con handoff reproducible.
- [ ] La política de IA/PR define registro de decisiones y evidencia exact-SHA.
- [ ] Existe una plantilla ADR común para que todos los agentes documenten decisiones con el mismo mínimo de contexto y evidencia.
- [ ] Los documentos no duplican snapshots ni contradicen los límites de seguridad y producción.
- [ ] Los cambios se validan con los checks documentales existentes en el SHA final.
- [ ] No se cambian aplicación, migraciones, secretos, Neon, Cloudflare ni datos reales.

## Fuera de alcance

Este contrato no autoriza cambios de producto, despliegues manuales, mutaciones de Neon, secretos, datos reales, billing, cambios destructivos ni bypass de revisiones/branch protection. Tampoco instala Engram, ECC, Gentle-AI, tester-army/e2e o hooks.
