# Contrato de continuidad, decisiones y evidencia para agentes

**Estado:** propuesta normativa de repositorio; entra en vigor al fusionarse.  
**Ámbito:** todas las IA, agentes, chats y colaboradores que trabajen en BTF14/Micro-app.  
**Autoridad:** subordinado a `docs/CONSTITUTION.md`; complementa `AGENTS.md`, `docs/ODD_WORKFLOW.md` y `docs/AI_COLLABORATION_AND_PR_POLICY.md`.

## Objetivo

Evitar pérdida de contexto entre chats/agentes, repetición de investigaciones, contradicciones documentales y regresiones. La fuente durable es GitHub; la memoria del chat, resúmenes y mensajes no sustituyen los archivos ni el estado vivo.

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

Para decisiones que afecten arquitectura, seguridad, datos, contratos, dependencias o estrategia de integración, registrar en `docs/decisions/` un ADR breve con:

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
- [ ] ODD exige comparar checkpoint/documentación con estado vivo y cerrar con handoff reproducible.
- [ ] La política de IA/PR define registro de decisiones y evidencia exact-SHA.
- [ ] Los documentos no duplican snapshots ni contradicen los límites de seguridad y producción.
- [ ] Los cambios se validan con los checks documentales existentes en el SHA final.
- [ ] No se cambian aplicación, migraciones, secretos, Neon, Cloudflare ni datos reales.

## Fuera de alcance

Este contrato no autoriza cambios de producto, despliegues manuales, mutaciones de Neon, secretos, datos reales, billing, cambios destructivos ni bypass de revisiones/branch protection. Tampoco instala Engram, ECC, Gentle-AI, tester-army/e2e o hooks.
