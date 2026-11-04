> **ARCHIVADO / NO ACTIVO — 2026-11-04.** La decisión de adoptar Spec Kit como flujo SDD fue supersedida por ODD. No instalar ni invocar la CLI basándose en este documento. Se conserva como registro de evaluación y comandos considerados; la política vigente está en [`ODD_WORKFLOW.md`](ODD_WORKFLOW.md).

# Adopción de GitHub Spec Kit en Micro-app

**Decisión:** adoptar Spec Kit como motor de flujo Spec-Driven Development para cambios sustanciales. No reemplaza la Constitución, la arquitectura ni los controles propios del repositorio.

**Versión evaluada:** `github/spec-kit` v1.3.0, publicada el 2026-11-03.  
**Fuente:** https://github.com/github/spec-kit  
**Guía de proyecto existente:** https://github.com/github/spec-kit/blob/v1.3.0/docs/how-to/existing-projects.md  
**Integración elegida:** GitHub Copilot, layout de skills con invocación manual.

## Por qué esta integración

Micro-app ya tiene una Constitución, un flujo SDD, plantillas propias, skills de dominio y perfiles en `.github/agents/`. Rehacer todo el proyecto con `specify init` como si fuera nuevo duplicaría trabajo y podría introducir reglas paralelas.

Spec Kit se incorpora de forma incremental:
- Spec Kit organiza el ciclo de especificación, aclaración, plan, tareas, análisis, implementación y convergencia.
- `docs/CONSTITUTION.md` sigue siendo la Constitución normativa única.
- `docs/sdd/` conserva las decisiones y modelos de dominio existentes.
- `docs/SDD_WORKFLOW.md` define cuándo y cómo usar el proceso.
- Los perfiles `.github/agents/*.agent.md` siguen siendo roles especializados propios.
- Las skills locales `.agents/skills/` siguen siendo guías específicas del stack/seguridad.

## Instalación fijada

Requisitos oficiales: Python 3.11+ y `uv`.

En un checkout de la rama de adopción, desde la raíz:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.3.0
specify --version
specify init --here --force --integration copilot --integration-options="--no-model-invocation"
```

Se fija v1.3.0 para evitar que una instalación no reproducible siga automáticamente cambios de `main`. La opción `--no-model-invocation` evita que las skills core se carguen/invoquen automáticamente por el modelo; el usuario/agente las invoca deliberadamente cuando corresponde. No se instalan extensiones adicionales en esta etapa.

### Precaución sobre `--force`

La documentación oficial indica que `--force` permite inicializar un repositorio no vacío y puede reemplazar archivos en rutas gestionadas por Spec Kit. Por eso:
- ejecutar solo en la rama de adopción, nunca directamente en `main`;
- revisar el diff completo antes de aceptar los archivos generados;
- conservar los perfiles actuales de `.github/agents/` y las skills de `.agents/skills/`;
- no permitir que el generador sobrescriba `AGENTS.md`, `docs/CONSTITUTION.md` ni las políticas de seguridad;
- no fusionar el resultado hasta verificar que los archivos generados no duplican ni contradicen las reglas canónicas.

La inspección del árbol de `main` el 2026-11-04 no encontró `.specify/` ni `.github/skills/`; sí encontró `.github/agents/` y `.agents/skills/`. Reconfirmar antes de ejecutar el comando.

## Flujo recomendado

1. Para funciones y cambios de riesgo: `/speckit-specify`.
2. `/speckit-clarify` solo si hay ambigüedades materiales.
3. `/speckit-plan`, `/speckit-tasks` y `/speckit-analyze`.
4. `/speckit-implement`.
5. `/speckit-converge` hasta cerrar criterios o documentar un bloqueo real.

Para correcciones acotadas, documentación y mantenimiento menor, usar el proceso ligero de `docs/SDD_WORKFLOW.md`. No forzar SDD completo a cada cambio.

## Fuera de esta adopción

- No reconstruir retrospectivamente especificaciones de todo el producto.
- No instalar extensiones `bug`, `assess`, `github` ni catálogos comunitarios todavía.
- No instalar workflows que permitan ejecución headless con permisos amplios sin revisar cada permiso/step.
- No usar catálogos comunitarios sin auditar fuente, versión, licencia, scripts y efectos.
- No usar `taskstoissues`: fue retirado del core en v1.3.0.
- No cambiar stack, proveedores, hosting ni dependencias de la aplicación por instalar Spec Kit.

## Estado real de instalación

**Evaluación y decisión completadas; bootstrap de la CLI aún no ejecutado.** En esta sesión se pudo inspeccionar GitHub, pero el entorno de ejecución no pudo resolver `github.com` para clonar/instalar dependencias. Por tanto, no afirmar que `specify` esté instalado ni que los comandos/skills de Spec Kit estén activos. Hasta ejecutar y revisar el bootstrap, `docs/SDD_WORKFLOW.md` y `templates/sdd/` son el proceso operativo disponible.

## Criterios para considerar la adopción terminada

- CLI v1.3.0 instalada y `specify --version` comprobado.
- `specify init` ejecutado en rama aislada.
- Diff de todos los archivos generados revisado; ningún archivo canónico sobrescrito.
- Invocación manual de una skill core comprobada en el runtime Copilot elegido.
- Un cambio piloto pequeño atraviesa spec/plan/tasks/analyze/implement/converge.
- Documentación de uso y estado actualizados con evidencia. No instalar extensiones hasta demostrar necesidad.
