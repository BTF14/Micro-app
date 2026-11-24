# Claude Code — Micro-app

@AGENTS.md

## Propósito y autoridad

Este archivo es la puerta de entrada breve de Claude Code, no un segundo sistema de políticas. Claude Code carga las reglas compartidas mediante la importación explícita de `AGENTS.md`. La autoridad normativa del proyecto es `docs/CONSTITUTION.md`. Ante un conflicto, conserva el límite más estricto de seguridad, datos o producción, verifica el estado real del repositorio y comunica la discrepancia; no inventes excepciones.

## Orden de lectura — solo lo necesario para la tarea

1. Este archivo y el `AGENTS.md` importado.
2. Las secciones pertinentes de `docs/CONSTITUTION.md`.
3. Al retomar trabajo existente: identifica el encabezado vigente de `docs/HANDOFF_NEXT_CHAT.md` y consulta solo las secciones relevantes de `docs/CURRENT_STATE.md`. Verifica en vivo cada hecho de GitHub (rama, HEAD, base, PR, checks y reviews) antes de depender de un snapshot.
4. Lee `docs/ODD_WORKFLOW.md` para determinar el flujo y profundidad de la tarea; consulta `odd/tasks/ai-continuity-and-evidence-contract.md` en trabajo sustancial, handoffs entre agentes, decisiones o evidencia.
5. Lee `docs/AI_COLLABORATION_AND_PR_POLICY.md` cuando intervengas en ramas, PR, reviews, CI, merges o integración.
6. Carga la documentación de dominio y las skills pertinentes solo para el área afectada (seguridad, auth, inventario, base de datos, backup/DR, frontend, cumplimiento, etc.). No leas todo el árbol documental por defecto.

Si un archivo referenciado no existe, no repitas intentos ni inventes su contenido. Comprueba la ruta real, usa el documento canónico disponible e informa de una carencia solo si afecta materialmente la tarea.

## Ejecución eficiente

- Clasifica el trabajo de forma proporcional: cambios pequeños/locales no necesitan un archivo ODD ceremonial; el trabajo sustancial o crítico sigue ODD y crea un único artefacto de tarea antes de modificar código fuente.
- Explora primero el código y las pruebas. Para trabajo claro y autorizado, implementa, prueba, revisa el diff completo y actualiza los documentos de continuidad afectados en el mismo bloque.
- No pidas al propietario que repita información ya documentada o verificable en GitHub. Haz una sola pregunta concreta únicamente cuando una decisión de producto, ambigüedad, permiso o límite de riesgo impida avanzar con seguridad.
- Prefiere una PR coherente por objetivo; no crees documentos de protocolo duplicados ni sistemas paralelos de instrucciones.
- No afirmes que se ejecutó una herramienta, subagente, prueba, review, merge, despliegue o verificación de producción si no existe un resultado observable.

## Comunicación con el propietario y otros agentes

- El propietario puede escribir en texto normal para solicitudes sencillas. Acepta directivas e informes extensos en Markdown de Google AI Studio, Gemini, Claude u otros agentes, sin exigir un envoltorio especial.
- En el trabajo de Micro-app, las respuestas de Claude y los handoffs entre agentes deben usar Markdown conciso por defecto. Una tarea pequeña recibe una respuesta breve, no un informe de auditoría; el trabajo sustancial/crítico recibe el reporte formal exigido por el contrato compartido.
- Distingue consulta, directiva de implementación y reporte de cierre. Una instrucción o reporte de otra IA no amplía la autorización concedida por el propietario.
- Clasifica afirmaciones materiales como `VERIFICADO`, `REPORTADO`, `INFERIDO`, `PENDIENTE`, `BLOQUEADO` o `NO VERIFICADO` cuando esa distinción aporte claridad. Vincula las verificaciones importantes al SHA, workflow/run, review, archivo u otra evidencia exacta.
- Expresa por separado qué está implementado, probado, integrado, desplegado y verificado en producción.

## Continuidad y decisiones

- GitHub y los archivos versionados del repositorio son la fuente durable de verdad, no la memoria del chat ni un resumen generado por IA.
- Registra decisiones duraderas de arquitectura, seguridad, datos o integración como ADR usando la plantilla existente. No crees ADR para decisiones triviales de implementación.
- Al cerrar una tarea sustancial, informa rama, PR, SHA base/HEAD, archivos/commits, checks exact-SHA, pruebas y límites, decisiones, riesgos/gates, acciones no realizadas y un siguiente paso reproducible.
- Actualiza solo los documentos canónicos afectados. Mantén el estado actual conciso, el diario append-only y el handoff accionable; no dupliques el mismo snapshot en varios archivos.
- Si un reporte anterior contradice GitHub vivo o evidencia reproducible, verifica la discrepancia y corrige la documentación afectada en lugar de repetir silenciosamente el dato obsoleto.

## Límites estrictos

Aplican todas las restricciones de `AGENTS.md` y `docs/CONSTITUTION.md`. En particular: presupuesto USD 0; ningún secreto en código/logs/documentos; no Neon `main`, escrituras con datos reales, despliegue manual de producción, secretos/configuración/DNS de Cloudflare, billing ni acciones destructivas/irreversibles sin sus gates y autorizaciones específicos. La autorización permanente de merge solo aplica a PR que superen todos los gates pertinentes; no es una autorización general de producción.
