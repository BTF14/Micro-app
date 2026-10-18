# Implementación de Gentleman-Programming en Micro app

**Estado del documento:** configuración inicial versionada; instalación y ejecución local todavía pendientes de verificación.  
**Fecha:** 2026-10-18  
**Repositorio:** https://github.com/BTF14/Micro-app

## Objetivo y criterio de éxito

Adoptar las piezas útiles de Gentleman-Programming dentro del flujo de desarrollo de Micro app, con coste objetivo de $0, cambios reversibles y evidencia real. No basta con enlazar herramientas: cada integración debe distinguir configuración versionada, instalación local, ejecución y resultado verificado.

## 1. Gentleman Guardian Angel (GGA): configuración preparada

Se versionó el archivo raíz `.gga` con estas decisiones:

- Reglas de revisión: `AGENTS.md`.
- Proveedor predeterminado: `ollama:qwen2.5-coder`, modelo local para evitar una API facturable.
- Modo estricto activado y timeout de cinco minutos.
- Revisión de los archivos fuente, configuración, SQL y workflows.
- No se instala automáticamente un hook Git ni se bloquean commits sin validar antes el entorno local.

**Estado real:** archivo de configuración creado. GGA, Ollama y el modelo no se han instalado ni ejecutado desde este entorno; por tanto, la revisión automática todavía no está activa.

### Activación local opcional

Desde un terminal con Git y Bash, instala GGA siguiendo su [README oficial](https://github.com/Gentleman-Programming/gentleman-guardian-angel), instala Ollama desde https://ollama.com/ y descarga el modelo local:

```bash
ollama pull qwen2.5-coder
```

Verifica que el modelo responde y que GGA está en PATH antes de continuar. Desde la raíz del repositorio:

```bash
gga config
gga run
```

Solo después de validar una revisión manual, se puede habilitar el hook local con `gga install`. Para retirarlo, usa el comando de desinstalación documentado por GGA (`gga uninstall`). La instalación del hook afecta únicamente al clon local; no la ejecuta este commit.

Si el modelo resulta demasiado pesado para el equipo, no cambies a un proveedor de pago: documenta el hardware y prueba otro modelo local compatible.

## 2. Engram: memoria persistente para agentes compatibles

Engram se adopta como candidato de memoria local, no como sustituto de la documentación Git. Su licencia pública figura como MIT y su diseño documentado usa un binario local con SQLite.

### Instalación e integración local

1. Sigue la guía oficial de instalación: https://github.com/Gentleman-Programming/engram/blob/main/docs/INSTALLATION.md.
2. Verifica la instalación con `engram version` y `engram doctor` (consulta la sintaxis de la versión instalada).
3. Para Codex, usa el mecanismo oficial `engram setup codex`; no sobrescribas a mano la configuración personal ni elimines otros servidores MCP.
4. Reinicia la sesión del agente y realiza una prueba no sensible: guardar una decisión técnica ficticia, buscarla y recuperarla desde una sesión nueva.
5. Documenta versión, comandos, resultado y limitaciones. No guardes tokens, cadenas de conexión, datos de clientes ni secretos en la memoria.

**Estado real:** evaluado documentalmente; no instalado, conectado a esta conversación ni probado desde este entorno. El setup local requiere acceso al terminal del usuario o de su agente de programación.

## 3. Gentle-AI: flujo de ingeniería

Gentle-AI aporta flujos, reglas, memoria y evidencia para agentes compatibles; no es una extensión universal que se active dentro de cualquier chat.

La guía oficial consultada requiere, según su quickstart actual, Go y Node.js/npm y un runtime de agente compatible para las integraciones elegidas. Antes de instalar, verifica requisitos y componentes en https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/quickstart.md.

Adopción propuesta:
- Mantener `AGENTS.md` como contrato principal del repositorio.
- Mapear sus reglas a un agente/runtime compatible en un clon de prueba.
- Ejecutar una tarea inocua de documentación y verificar artefactos/evidencia antes de delegar cambios de código.
- No habilitar instalaciones globales, componentes comunitarios ni permisos de shell innecesarios sin revisión.

**Estado real:** no instalado ni ejecutado. La integración de runtime depende de que el entorno local tenga uno de los agentes soportados.

## 4. Gentle Shell

No se instala en esta fase. Es un entorno de agente separado, con dependencia de su runtime compatible y requisitos propios. Se reconsiderará cuando Gentle-AI/Engram y GGA estén verificados en un entorno real. No debe confundirse con los perfiles de instrucciones existentes en `.github/agents/`.

## 5. Playwright

Playwright no es un producto de Gentleman-Programming; es una herramienta complementaria para pruebas E2E. El proyecto aún debe incorporar la dependencia, configuración, pruebas de flujos críticos y ejecución en CI en una fase separada. No afirmar que está integrado hasta que existan package, lockfile, configuración, pruebas y un workflow que las ejecute.

## Orden de adopción

1. **GGA local:** instalar herramienta y Ollama, revisar manualmente un diff pequeño, medir uso de recursos y comprobar cómo desinstalar el hook.
2. **Engram local:** instalación, diagnóstico y prueba de guardar/recuperar memoria sin datos sensibles.
3. **Gentle-AI:** prueba aislada con un runtime compatible y verificación de artefactos.
4. **Playwright:** añadir pruebas E2E repetibles al proyecto y a CI.
5. **Gentle Shell:** decidir solo con resultados de las fases anteriores.

## Restricciones y límites

- Coste total objetivo: $0; no introducir API keys facturables, planes de pago ni servicios con cobro automático.
- No instalar ni activar hooks en nombre del usuario desde un entorno al que no tenemos acceso.
- No realizar migraciones en Neon `main`, despliegues de producción, envíos de correo ni cambios irreversibles.
- Los agentes y perfiles `.github/agents/*.agent.md` no demuestran subagentes ejecutándose.
- La documentación versionada es la fuente de verdad. Engram es complementario y su memoria local no se debe presentar como disponible para todos los chats.
- Verificar las instrucciones de los proyectos upstream antes de cada instalación; los comandos y requisitos pueden cambiar.

## Fuentes oficiales

- GGA: https://github.com/Gentleman-Programming/gentleman-guardian-angel
- Configuración GGA: https://github.com/Gentleman-Programming/gentleman-guardian-angel/blob/main/docs/configuration.md
- Engram: https://github.com/Gentleman-Programming/engram
- Engram installation: https://github.com/Gentleman-Programming/engram/blob/main/docs/INSTALLATION.md
- Engram agent setup: https://github.com/Gentleman-Programming/engram/blob/main/docs/AGENT-SETUP.md
- Gentle-AI: https://github.com/Gentleman-Programming/gentle-ai
- Gentle-AI quickstart: https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/quickstart.md
- Playwright: https://playwright.dev/docs/intro


## 4. Integración con el flujo SDD y agentes del repositorio

El proceso operativo general está en [SDD_WORKFLOW.md](SDD_WORKFLOW.md), con plantillas [spec](../templates/sdd/spec.md), [plan](../templates/sdd/plan.md), [tasks](../templates/sdd/tasks.md) y la [skill feature-sdd](../skills/feature-sdd/SKILL.md). Los perfiles de agentes están en [`.github/agents/`](../.github/agents/).

La memoria durable canónica es GitHub: constitución, plan, diario, registro de recursos y handoff. Engram sería una capa auxiliar local para runtimes compatibles; no se debe depender de ella para recuperar decisiones del proyecto. No guardar secretos, tokens, cadenas de conexión, datos personales o datos de clientes en memoria persistente.

**Estado verificado:** archivos de proceso y roles creados en GitHub; instalación local y ejecución real de GGA/Ollama/Engram/Gentle-AI/MCP no verificadas. El trabajo desde este chat depende de herramientas conectadas y GitHub Actions; no puede instalar software en el teléfono ni afirmar que un MCP local esté conectado.
