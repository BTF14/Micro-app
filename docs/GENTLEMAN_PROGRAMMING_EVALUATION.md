# Evaluación documentada: Gentleman-Programming y herramientas de continuidad

**Fecha de revisión:** 2026-10-18  
**Repositorio del producto:** https://github.com/BTF14/Micro-app  
**Regla de evidencia:** se inspeccionaron los README públicos actuales de los cuatro repositorios enlazados abajo. Esto es una evaluación documental inicial; no significa que se hayan instalado, ejecutado ni integrado.

## Objetivo

Reducir pérdida de contexto y trabajo repetido entre chats/agentes, mantener evidencia verificable, revisar cambios de forma independiente y evitar afirmaciones no demostradas. La documentación versionada en Micro-app es la fuente de verdad; memoria de chat o una herramienta externa son complementos, nunca la única copia.

## Repositorios de Gentleman-Programming inspeccionados

| Proyecto | Evidencia consultada | Qué aporta potencialmente | Estado para Micro app |
|---|---|---|---|
| Gentle-AI | [README](https://github.com/Gentleman-Programming/gentle-ai) | Entorno de ingeniería para agentes, flujos, memoria y evidencia; documenta integración con agentes compatibles. | **Evaluado a nivel README; no instalado ni configurado.** Extraer prácticas sin asumir compatibilidad automática con ChatGPT o GitHub Actions. |
| Engram | [README](https://github.com/Gentleman-Programming/engram) | Memoria persistente para agentes de programación; README lo describe como agnóstico al agente y con opciones local/nube. | **Candidato para prueba aislada.** No conectado a esta conversación ni al repo; no se afirma que la memoria ya funcione. |
| Gentleman Guardian Angel (GGA) | [README](https://github.com/Gentleman-Programming/gentleman-guardian-angel) | Revisión de cambios por IA, hook de Git y revisión de PR; el proyecto declara core Bash y múltiples proveedores. | **Candidato para piloto local**, sujeto a evaluar CLI/proveedor/coste. No instalar hook ni bloquear commits sin prueba y aprobación del flujo. |
| Gentle Shell | [README](https://github.com/Gentleman-Programming/gentle-shell) | Workspace de agente centrado en Pi, tareas, delegación, permisos y revisión por riesgo. | **Referencia de diseño, no adoptado.** La dependencia de Pi y el coste/compatibilidad deben verificarse antes de cualquier adopción. |
| Playwright | [README oficial](https://github.com/microsoft/playwright) · [documentación](https://playwright.dev/docs/intro) | Pruebas E2E de navegador, Chromium/Firefox/WebKit, trazas y evidencia de fallos. | **Recomendado para fase E2E**, aún no declarar integrado salvo que package/config/tests lo demuestren. |

## Qué significa “usar Gentleman-Programming” en este proyecto

1. Ya existe una adaptación documental local: perfiles de revisión en `.github/agents/`, modelo operativo y registros de recursos/estado.
2. Esos archivos son perfiles e instrucciones. **No demuestran que se estén ejecutando subagentes autónomos**, ni que se haya instalado Gentle-AI, Engram, GGA o Gentle Shell.
3. La adopción debe hacerse por etapas: leer documentación completa y licencia; verificar actividad/releases/dependencias; probar en rama o entorno aislado; medir coste; registrar evidencia; solo entonces decidir.
4. No instalar herramientas que requieran plan de pago, claves facturables, suscripción o servicio con cobro potencial. El presupuesto acordado es **$0**.
5. No permitir que un agente/hook realice migraciones sobre Neon `main`, despliegue producción, cambie credenciales, envíe correos o ejecute acciones irreversibles.
6. No guardar secretos, tokens, URLs de conexión ni datos de clientes en Engram, Markdown, issues o prompts.
7. El sistema de memoria debe almacenar hechos verificables, SHA, decisiones, fallos, pruebas, próximos pasos y fuentes; no opiniones presentadas como hechos.

## Protocolo de evaluación y adopción

Para cada herramienta candidata, abrir una entrada con:
- URL y fecha de consulta;
- versión/release y licencia verificadas;
- compatibilidad real con el entorno disponible;
- dependencias, permisos, tratamiento de datos y superficie de ataque;
- coste estimado y confirmación de que permanece en $0;
- prueba ejecutada, comando exacto, resultado y evidencia;
- decisión: adoptar, probar después o descartar, con motivo y fecha de revisión.

No afirmar “instalado”, “integrado”, “memoria persistente activa”, “agentes corriendo” ni “revisión automática” sin prueba observable.

## Diseño mínimo de memoria sin depender de un proveedor

- Fuente de verdad: `docs/PROJECT_PLAN.md`, `docs/HANDOFF_NEXT_CHAT.md`, `docs/STATE_JOURNAL.md`, `docs/RESOURCE_REGISTRY.md`, decisiones y documentos específicos.
- En cada checkpoint: SHA actual de `main`, ramas/PR relevantes, Actions del SHA exacto, cambios hechos, pruebas y sus límites, riesgos, siguiente tarea.
- El handoff debe contener un prompt de continuación copiable y enlaces directos a archivos.
- Mantener el diario histórico append-only; el bloque de estado vigente debe señalar fecha y SHA y reemplazar explícitamente snapshots obsoletos.
- Si dos documentos discrepan, comprobar código/CI/GitHub en vivo, corregirlos y registrar la resolución; no elegir por intuición.
- Antes de reusar una afirmación previa, verificar si sigue vigente. Las conversaciones son pistas, no evidencia actual.

## Próxima evaluación concreta

1. Estudiar el contenido completo de las guías de inicio/instalación de Engram, Gentle-AI y GGA, no solo los README.
2. Verificar releases, licencias, requisitos y costes actuales en la fecha de la prueba.
3. Hacer una prueba aislada en un clon/branch temporal sin secretos: escribir y recuperar un dato técnico no sensible, revisar un diff de ejemplo y medir si el flujo aporta evidencia reproducible.
4. No activar un hook obligatorio ni cambiar CI hasta que la prueba pase y se documente cómo desactivarlo/recuperarlo.
5. Comparar lo obtenido con el protocolo local de agentes y conservar solo lo que reduzca errores sin aumentar coste ni permisos.

## Fuentes oficiales consultadas

- https://github.com/Gentleman-Programming/gentle-ai
- https://github.com/Gentleman-Programming/engram
- https://github.com/Gentleman-Programming/gentleman-guardian-angel
- https://github.com/Gentleman-Programming/gentle-shell
- https://github.com/microsoft/playwright
- https://playwright.dev/docs/intro

