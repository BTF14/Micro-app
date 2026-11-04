# Registro histórico — evaluación de GitHub Spec Kit

> **ARCHIVADO / NO ACTIVO — 2026-11-04.** La propuesta de adoptar Spec Kit como workflow SDD fue supersedida por ODD. No instalar ni invocar la CLI basándose en este documento.

## Evaluación previa

- Repositorio: https://github.com/github/spec-kit
- Versión evaluada: v1.3.0 (2026-11-03).
- Integración contemplada: GitHub Copilot mediante skills.
- Objetivo original: estructurar spec/clarify/plan/tasks/analyze/implement/converge.
- Riesgo identificado: bootstrap en repositorio existente con `--force` podía sobrescribir archivos gestionados y duplicar instrucciones canónicas.

## Resultado real

- La CLI nunca fue instalada ni ejecutada.
- `specify init` nunca se ejecutó.
- No existen comandos ni skills de Spec Kit activos por esta evaluación.
- No se instalaron extensiones comunitarias.
- La decisión de flujo activo fue reemplazada por ODD, documentado en [ODD_WORKFLOW.md](ODD_WORKFLOW.md).

## Qué se conserva

- Los documentos técnicos y de dominio en `docs/sdd/` siguen vigentes según su propio estado y aprobación.
- La retirada de SDD como workflow no invalida modelos de datos, contratos de autorización, decisiones de concurrencia ni diseños aprobados.
- `docs/SDD_WORKFLOW.md` se mantiene únicamente como redirect histórico.
- La evaluación de Spec Kit queda aquí para trazabilidad, no como instrucción operativa.

## Fuentes consultadas en la evaluación anterior

- https://github.com/github/spec-kit
- https://github.com/github/spec-kit/releases/tag/v1.3.0
- https://github.com/github/spec-kit/blob/v1.3.0/docs/how-to/existing-projects.md
- https://github.com/github/spec-kit/blob/v1.3.0/docs/integrations/copilot.md
