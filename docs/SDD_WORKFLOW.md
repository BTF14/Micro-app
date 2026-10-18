# Flujo Spec-Driven Development (SDD)

**Estado:** proceso versionado para uso desde ChatGPT y otros runtimes compatibles. No implica que un runtime de subagentes esté conectado o ejecutándose.
**Objetivo:** convertir solicitudes en entregas trazables, comprobables y seguras con coste total objetivo de $0.

## Flujo de trabajo

1. **Constitution:** leer `AGENTS.md` y `docs/CONSTITUTION.md`. Sus límites prevalecen sobre cualquier tarea.
2. **Discovery / Explore:** revisar el HEAD, los documentos, código, consumidores, pruebas, PRs y Actions actuales. Registrar hechos, hipótesis y desconocidos.
3. **Spec:** escribir alcance, usuarios/casos, reglas de negocio, estados de error, seguridad, datos, criterios de aceptación y fuera de alcance. No comenzar una función significativa sin criterios comprobables.
4. **Plan:** enumerar archivos/módulos, cambios de API/DB, compatibilidad, riesgos, estrategia de prueba, rollback y dependencias.
5. **Tasks:** dividir en tareas pequeñas, ordenadas y verificables; cada tarea tiene resultado observable y archivos previstos.
6. **Build:** implementar solo lo aprobado en la especificación; no ampliar alcance silenciosamente.
7. **Review:** revisiones independientes de arquitectura, seguridad/datos y QA. Si no hay subagentes reales, hacer pasadas separadas y declarar que no hubo delegación autónoma.
8. **Validate:** ejecutar pruebas disponibles y verificar los workflows para el SHA exacto. Los mocks no prueban persistencia real; el análisis estático no prueba comportamiento.
9. **Integrate:** inspeccionar el diff completo, revisar conflictos y fusionar solo si se cumplen los criterios y los checks aplicables.
10. **Memory / Handoff:** registrar decisiones y resultados verificables en Git; actualizar plan, diario y handoff.

## Cuándo usar el flujo completo o reducido

- **Completo obligatorio:** auth/roles/tenant, esquema o migraciones, ventas/pagos/stock, tasa/impuestos, seguridad, dependencias, infraestructura, despliegue y cambios con riesgo financiero.
- **Reducido:** cambios pequeños de documentación, copy o correcciones localizadas sin impacto en contratos/datos. Aun así, definir resultado esperado, revisar diff y ejecutar validación proporcional.
- Si falta información crítica, detenerse en una propuesta segura y registrar el bloqueo; no inventar credenciales, políticas fiscales, secretos ni datos.

## Contrato de artefactos

Usar las plantillas en [`templates/sdd/`](../templates/sdd/):

- `spec.md`: qué y por qué, reglas y criterios de aceptación.
- `plan.md`: cómo, riesgos, archivos, pruebas y reversión.
- `tasks.md`: unidades ejecutables con estado y evidencia.

Cada tarea grande debe enlazar estos artefactos desde el issue o PR. No es obligatorio crear tres archivos para una errata.

## Roles y límites

- **Coordinador:** controla estado, restricciones, prioridades, conciliación y entrega.
- **Explorador:** lectura y recopilación; no implementa.
- **Planificador/arquitecto:** produce spec, plan y tareas; no modifica código de producto durante planificación.
- **Implementador:** cambia únicamente el alcance acordado.
- **Revisor de seguridad/datos:** busca defectos y exige evidencia; no se autoaprueba como implementador.
- **QA/CI:** ejecuta pruebas y verifica SHA/workflows.
- **Documentador:** sincroniza memoria, decisiones, recursos, panel y handoff.

Los perfiles de `.github/agents/` son instrucciones reutilizables. Solo se describen como subagentes activos si la plataforma confirma una ejecución real.

## Puertas de seguridad

- Nunca mutar Neon `main`, desplegar producción, activar facturación o realizar acciones irreversibles sin autorización específica.
- No almacenar secretos ni datos de clientes en specs, memoria, logs, prompts o artefactos.
- No omitir controles de tenant en API/DB ni confiar en controles exclusivos del frontend.
- No aceptar porcentajes del panel como prueba de calidad; exigir evidencia por criterio.
- No mergear si hay checks obligatorios fallidos, conflictos sin resolver o hallazgos críticos abiertos.

## Uso desde un teléfono / chat

Pega una solicitud normal. El coordinador debe leer el handoff y estado vivo, decidir el nivel SDD, preparar los artefactos en una rama, implementar los cambios seguros autorizados, ejecutar CI y resumir enlaces, SHA, checks, bloqueos y siguiente acción. No se requiere terminal local para editar documentos/código mediante las herramientas conectadas, pero algunas integraciones locales (Ollama/GGA, Engram, Chrome DevTools MCP) no pueden instalarse desde este chat y deben quedar marcadas como pendientes.

## Plantillas y prompts

La skill [`feature-sdd`](../skills/feature-sdd/SKILL.md) contiene una receta reutilizable para solicitudes de funciones. Se puede pedir en cualquier chat: “Aplica el flujo SDD completo a [función] y trabaja hasta dejar PR verificable, sin tocar Neon main ni producción”.
