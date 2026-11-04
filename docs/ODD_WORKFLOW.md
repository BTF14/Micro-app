# Organic Driven Development (ODD) — Micro-app

**Estado:** flujo operativo predeterminado del repositorio.  
**Inspiración:** Organic Driven Development de [Gentleman-Programming/gentle-ai](https://github.com/Gentleman-Programming/gentle-ai), revisado el 2026-11-04.  
**Adaptación:** este documento define el proceso propio de Micro-app; no afirma que Gentle-AI, Engram, Gentle Shell ni sus hooks estén instalados.

## Principio

Describe el resultado que necesitas. El agente explora primero y aplica el proceso mínimo que preserve calidad, seguridad y evidencia. No se exige al propietario invocar fases, escoger plantillas ni administrar tareas. La autorización para investigar no equivale a autorización para modificar; la autorización para modificar no elimina los gates de producción, datos, seguridad o gasto.

## Protocolo

1. **Autorizar.** Clasificar la petición como lectura/investigación, propuesta o implementación autorizada. Si la intención de cambio no está clara, mantener el trabajo en solo lectura y preguntar una sola cosa concreta cuando sea indispensable.
2. **Explorar.** Verificar el estado vivo de GitHub, rama, HEAD, PR y CI; inspeccionar código, callers, tests, documentos del dominio y restricciones pertinentes. No empezar escribiendo un plan genérico.
3. **Resolver incertidumbre.** Investigar fuentes primarias cuando una decisión dependa de información externa. Separar hechos, supuestos, contradicciones y vacíos. Preguntar solo ante una decisión real de producto, permisos, gasto, datos reales, producción o riesgo irreversible.
4. **Clasificar.** Trabajo pequeño si el resultado está claro, el riesgo está contenido y puede retomarse desde la petición más el diff. Trabajo sustancial si necesita continuidad durable o varias unidades coordinadas. Trabajo crítico si afecta identidad, permisos, aislamiento tenant/sucursal, dinero, inventario, migraciones, seguridad, backups o infraestructura. La cantidad de archivos o comandos por sí sola no determina el tamaño.
5. **Registrar antes de modificar.** Para trabajo pequeño no crear artefactos persistentes innecesarios. Para trabajo sustancial/crítico crear un único archivo `odd/tasks/<feature>.md` antes de modificar código fuente. Debe contener objetivo, petición original relevante, alcance/exclusiones, requisitos y criterios verificables, riesgos, tareas estables, pruebas, evidencia y siguiente paso. Actualizarlo durante el trabajo; no duplicar el mismo plan en varios documentos. Si la función de memoria externa no está instalada, el archivo Git es la fuente durable y se informa que no existe espejo Engram.
6. **Implementar y verificar por unidades.** Resolver tareas en el orden más pequeño que conserve coherencia. Aplicar test-first cuando exista una prueba determinista ejecutable y un resultado esperado claro (RED → GREEN → REFACTOR); explicar excepciones. Cada tarea se cierra con evidencia observada, no con una casilla marcada por intención. Ejecutar validaciones proporcionales al riesgo y revisar el diff completo. Separar revisiones de arquitectura, seguridad/datos, QA y documentación; afirmar delegación solo si el runtime confirma subagentes reales.
7. **Cerrar y dar continuidad.** Informar qué cambió, SHA/PR, pruebas y resultados exactos, limitaciones, riesgos residuales y siguiente paso. Actualizar `CURRENT_STATE`, `HANDOFF_NEXT_CHAT` y `STATE_JOURNAL` solo cuando el hito lo justifique, sin duplicar contenido. No declarar completo lo que tenga checks pendientes o evidencia insuficiente.

## Profundidad por riesgo

| Nivel | Aplicación |
|---|---|
| Ligero | Corrección localizada, documentación o refactor seguro: explorar, cambiar, comprobar y revisar diff. Sin spec/task file salvo que haga falta continuidad. |
| Sustancial | Funcionalidad o cambio transversal: un archivo ODD de feature, diseño técnico suficiente, tareas, criterios, pruebas y revisión independiente. |
| Crítico | ODD completo más especificación técnica explícita, revisión de seguridad y datos, análisis de fallos, migración/rollback, pruebas PostgreSQL/concurrencia y gates del dominio. La especificación no es una autorización de producto ni de producción. |

## Reglas específicas de Micro-app

- `docs/CONSTITUTION.md` es la autoridad normativa. `docs/SECURITY_ROADMAP.md`, `docs/BACKUP_AND_RECOVERY.md`, la matriz aprobada de permisos y los contratos de dominio conservan su autoridad dentro de sus ámbitos.
- No crear nuevos endpoints comerciales ni ampliar permisos antes de cerrar los gates Nivel 1 y respetar la matriz de permisos aprobada.
- Inventario, caja, dinero y auditoría requieren transacciones, constraints, idempotencia, orden de locks, aislamiento tenant/sucursal y pruebas reales con PostgreSQL desechable.
- Antes de migraciones con datos reales, cambios destructivos o sensibles a producción, seguir el gate de recuperación de la Constitución y `docs/BACKUP_AND_RECOVERY.md`.
- No mutar Neon `main`, desplegar producción, habilitar billing, vincular tarjetas, enviar correos ni hacer cambios irreversibles fuera de las autorizaciones específicas requeridas.
- Las pruebas deterministas (Vitest, PostgreSQL, Playwright) son la evidencia base. Las pruebas agentic son complementarias y nunca sustituyen asserts verificables.
- Receipt-Driven Development (RDD) es una revisión independiente distinta de ODD. No se habilita automáticamente ni se presume disponible; solo se adopta tras evaluar consentimiento, privacidad, coste, proveedor y compatibilidad del runtime.

## Herramientas externas: política de adopción

- **Gentle-AI:** ODD es la referencia de proceso. Instalar Gentle-AI no es requisito para seguir este protocolo ni se afirma compatibilidad de ChatGPT con sus hooks/runtimes.
- **Engram:** opcional; no es requisito para la continuidad. GitHub y los documentos versionados siguen siendo la fuente de verdad.
- **ECC:** no copiar el catálogo completo. Evaluar skills/reglas concretas por tarea y runtime; fijar release, revisar licencia, scripts, permisos, telemetría y compatibilidad antes de incorporar componentes.
- **tester-army/e2e:** candidato para un piloto aislado después de estabilizar la suite Playwright determinista. No añadirlo al pipeline requerido hasta validar coste real, modelo/proveedor, telemetría, reproducibilidad y flakiness.
- No instalar hooks, MCPs, agentes, servicios ni extensiones comunitarias automáticamente.

## Referencias

- Gentle AI ODD: https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/usage.md
- Gentle AI trigger rules: https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/trigger-rules.md
- ECC: https://github.com/affaan-m/ECC
- Tester Army E2E: https://github.com/tester-army/e2e
