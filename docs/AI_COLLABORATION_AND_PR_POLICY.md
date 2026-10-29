# Política de colaboración de IA, PR y verificación

**Estado:** propuesta documental; se convierte en política canónica al fusionarse en `main`.  
**Última actualización:** 2026-10-29.  
**Aplicación:** toda IA, agente, sesión o chat que trabaje en Micro app, independientemente del proveedor (ChatGPT, Claude, Codex u otro).

Esta política complementa `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/SECURITY_ROADMAP.md` y los requisitos de seguridad existentes. Si hay conflicto, no se debe elegir silenciosamente la regla más permisiva: verificar la fuente canónica, preservar las restricciones de seguridad y documentar el conflicto antes de actuar.

## 1. Principio rector

**Priorizar corrección, seguridad, mantenibilidad y evidencia por encima de velocidad aparente o cantidad de PR.** El avance se mide por problemas resueltos y verificados, no por commits, ramas o PR creadas.

La IA debe hacerse cargo del trabajo técnico autorizado de principio a fin: investigar, proponer una solución proporcional, implementarla, probarla, revisar el diff, verificar CI y dejar documentación de continuidad. No debe trasladar al propietario tareas que pueda ejecutar con las herramientas y permisos disponibles.

## 2. Política de PR: pocas, pequeñas y con un propósito

1. **Una PR debe tener un objetivo coherente, explícito y comprobable.** Su descripción debe explicar problema, causa, solución, pruebas y limitaciones.
2. **No crear PR por cada pequeño paso ni duplicar trabajo.** Antes de abrir una PR, inspeccionar las PR existentes y comprobar si el trabajo pertenece legítimamente a una de ellas.
3. **Si un cambio es una corrección o continuación del mismo objetivo y alcance, preferir actualizar la misma rama/PR.** No abrir otra PR para volver a solucionar lo mismo.
4. **No mezclar objetivos independientes para reducir artificialmente el número de PR.** Por ejemplo, una política general de colaboración no debe añadirse a una PR que solo cubre tests de CORS. Un cambio separado está justificado cuando tiene otro objetivo, revisión o riesgo.
5. **No crear PR de documentación vacías, de apariencia o sin aceptación clara.** La documentación que establezca política transversal debe integrarse en los archivos canónicos de instrucciones y continuidad.
6. **Antes de abrir una PR nueva**, revisar las PR abiertas relacionadas, comparar sus diffs con la rama base y determinar si alguna ya cubre el trabajo. Anotar la decisión; no suponer que una PR está obsoleta solo por su antigüedad.
7. **No cerrar, fusionar, reemplazar ni abandonar automáticamente PR antiguas.** Primero inspeccionar su propósito, estado, checks, commits y posibles cambios únicos. Presentar o ejecutar una limpieza solo con criterio, evitando perder trabajo.
8. Mantener la rama y el diff limitados al objetivo. No añadir refactors, dependencias, cambios de configuración o archivos ajenos “ya que estamos”.
9. Evitar force-push. No reescribir historia compartida ni borrar ramas sin una razón verificada y un plan seguro.

## 3. Revisión y herramientas de IA

- Claude y Codex son revisores adicionales valiosos, pero **su indisponibilidad o cuota agotada no debe paralizar la investigación y el desarrollo que puedan realizarse de forma segura**.
- Una revisión que no se pudo ejecutar por cuota, permisos o error es **incompleta**; nunca equivale a aprobación ni demuestra que haya un defecto.
- Cuando un revisor no esté disponible, revisar manualmente el diff completo contra la base, seguir el impacto por los llamadores y pruebas, inspeccionar los riesgos de seguridad y registrar hallazgos concretos con ruta, línea, impacto y evidencia cuando sea posible.
- No insistir repetidamente con un revisor limitado ni incurrir en pagos para eludir límites. Reintentar cuando haya capacidad o usar una alternativa ya autorizada.
- Si el propietario ha pedido expresamente mantener una PR abierta hasta disponer de Claude/Codex u otra revisión concreta, **respetar esa instrucción**: continuar con el trabajo técnico no significa fusionarla antes de esa revisión.
- CI, SAST y E2E complementan la revisión humana/IA; no la sustituyen.

## 4. Verificación: no confundir tests con realidad desplegada

Antes de declarar una tarea resuelta:

1. Definir criterios de aceptación que correspondan al problema real, no solo a la implementación elegida.
2. Ejecutar las pruebas relevantes disponibles y comprobar sus resultados.
3. Verificar los workflows requeridos en el **SHA exacto del HEAD actual**. No extrapolar checks de commits anteriores, otra rama o un SHA ya superado.
4. Inspeccionar el diff completo y buscar regresiones, exposición de secretos, cambios de permisos, dependencias y efectos colaterales.
5. Distinguir claramente:
   - **probado en unit tests**;
   - **probado en integración/E2E**;
   - **observado en un servicio desplegado**;
   - **confirmado por el propietario**.
6. No presentar una prueba simulada como prueba de producción. Por ejemplo, tests del middleware CORS con bindings simulados no demuestran por sí solos que el Worker desplegado devuelva los encabezados HTTP correctos.
7. Si no se puede ejecutar una prueba por limitación de red, permisos o herramientas, registrar la limitación exacta y la prueba pendiente. No afirmar que pasó, no inventar resultados y no repetir intentos que ya demostraron ser imposibles sin un cambio concreto de condiciones.
8. Toda afirmación de “resuelto” debe señalar evidencia verificable, el alcance que cubre y lo que sigue sin probarse.

## 5. Criterios antes de fusionar o cerrar una PR

Una PR solo está lista para considerar fusión cuando:

- el propósito y el diff son coherentes y acotados;
- todos los checks obligatorios pasan en el HEAD exacto;
- no quedan hallazgos materiales de seguridad o corrección sin resolver;
- las pruebas cubren el comportamiento requerido y las limitaciones están declaradas;
- se ha comprobado el estado de la rama base y los conflictos;
- la revisión adicional solicitada expresamente por el propietario se ha realizado;
- se respetan los gates de aprobación, branch protection y las instrucciones específicas del propietario.

Una PR verde **no es una garantía de preparación para producción**. No fusionar por inercia ni porque la PR lleve mucho tiempo abierta. Si un gate está pendiente o no se puede verificar, mantenerla abierta y documentar la próxima acción.

### Dependabot, pnpm y overrides del workspace

En este repositorio, `package.json` declara `pnpm.overrides.undici: 7.30.1`. El `pnpm-lock.yaml` debe conservar un bloque `overrides` equivalente y resoluciones compatibles. El 2026-10-29 se comprobó que varias PR de Dependabot omitían ese bloque y resolvían `undici@7.29.1`; las instalaciones congeladas fallaban con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` y Dependency Review detectaba vulnerabilidades de alta severidad.

Reglas obligatorias:
1. Antes de fusionar una PR de Dependabot, revisar el diff y el SHA exacto, no solo el título ni que el bot la haya creado.
2. En este workspace, verificar la correspondencia entre `package.json` y `pnpm-lock.yaml`; ejecutar o exigir la instalación congelada (`pnpm install --frozen-lockfile`) y revisar Dependency Review.
3. No quitar ni cambiar el override de `undici` sin revisar avisos de seguridad, la versión resuelta en todo el lockfile y el resultado de las pruebas.
4. No aceptar actualizaciones mayores de TypeScript, Vite, plugins o jsdom dentro del grupo de parches rutinarios. Separarlas, probar compatibilidad y mantenerlas fuera de `main` mientras fallen gates obligatorios.
5. Si varias PR de Dependabot comparten el mismo fallo estructural, corregir la causa una sola vez y limpiar las PR fallidas con comentarios explícitos. No fusionar una PR con checks obligatorios fallidos ni dejar PR redundantes abiertas indefinidamente.

## 6. Producción, datos y configuración

Esta política no concede permiso para operaciones sensibles. Siguen aplicando las restricciones más estrictas de `AGENTS.md`, `docs/CONSTITUTION.md` y `docs/BACKUP_AND_RECOVERY.md`.

- No desplegar producción ni realizar cambios irreversibles sin la aprobación explícita requerida.
- No cambiar secretos, variables, OAuth, dominios, proveedores, permisos, datos reales o Neon `main` por conveniencia ni para hacer que una prueba pase.
- Antes de cambiar infraestructura/configuración, confirmar el destino canónico, el entorno afectado, la fuente de verdad, el plan de reversión y la validación posterior.
- No conectar Preview a producción de forma automática. Primero definir aislamiento, origen CORS permitido, credenciales y estrategia de datos. No mezclar datos ni entornos por resolver un error temporal.
- Respetar el presupuesto del proyecto de **$0**: no activar servicios de pago, tarjetas, suscripciones o cargos automáticos.
- No revelar ni introducir secretos, tokens, datos de clientes o cadenas de conexión en commits, logs, issues o documentación.

## 7. Continuidad entre chats y agentes

El repositorio, no la memoria de una IA ni una conversación aislada, es la fuente de continuidad del trabajo.

- Leer primero `docs/CURRENT_STATE.md` y después `docs/HANDOFF_NEXT_CHAT.md`; seguir la secuencia de lectura obligatoria de `AGENTS.md`.
- Verificar en vivo el estado de GitHub antes de actuar: rama base, SHA, PR relacionadas, diff y checks.
- Al cerrar un bloque de trabajo significativo, actualizar `docs/CURRENT_STATE.md` con el estado actual y los hechos comprobados; añadir el hito a `docs/STATE_JOURNAL.md` (historial append-only); actualizar `docs/HANDOFF_NEXT_CHAT.md` con próximos pasos concretos.
- Mantener separados **hechos verificados, hipótesis, decisiones, pendientes y bloqueos**. Las notas históricas no sustituyen la verificación en vivo.
- Documentar la PR/URL, rama, SHA, archivos modificados, pruebas ejecutadas y no ejecutadas, resultados de CI, decisiones y riesgos pendientes.
- No inundar los documentos con duplicados. El estado vivo debe ser conciso; el diario conserva el historial; el handoff debe ayudar al siguiente agente a actuar sin reconstruir todo el chat.
- No decir “lo haré” como sustituto de realizar el trabajo. Ejecutar lo que sea posible en la sesión actual y reportar solo acciones realmente completadas.

## 8. Lista de comprobación breve

### Antes de editar
- [ ] Leí las instrucciones y el estado vivo.
- [ ] Verifiqué el estado actual del repositorio y las PR relacionadas.
- [ ] Definí el problema, el alcance y criterios de aceptación.
- [ ] Confirmé que no estoy duplicando una PR ni mezclando objetivos.

### Antes de pedir revisión o fusión
- [ ] Revisé el diff completo y el SHA exacto.
- [ ] Ejecuté pruebas relevantes y comprobé CI/SAST/E2E requeridos.
- [ ] Separé las pruebas simuladas de las pruebas reales del servicio.
- [ ] Documenté límites, riesgos y pasos pendientes.
- [ ] Respeté la revisión solicitada por el propietario y todos los gates de seguridad.

### Al terminar la sesión
- [ ] Actualicé estado, diario y handoff cuando correspondía.
- [ ] Dejé enlaces, SHA y resultados reproducibles.
- [ ] No afirmé haber desplegado, fusionado o verificado algo que no ocurrió.
