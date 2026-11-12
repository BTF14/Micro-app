# Instrucciones para agentes — Micro app

Este archivo es el punto de entrada operativo. La autoridad normativa está en `docs/CONSTITUTION.md`; los procedimientos detallados se cargan según la tarea. No conviertas la lectura de documentación en un requisito ceremonial.

La convención de comunicación entre propietario y agentes está definida en `odd/tasks/ai-continuity-and-evidence-contract.md`: el propietario puede escribir en texto normal para tareas sencillas o enviar directivas extensas en Markdown; los agentes usarán Markdown conciso por defecto para el trabajo de Micro-app, sin convertir cada consulta simple en un informe formal. Claude Code tiene además `CLAUDE.md` como índice de entrada, que importa este archivo y no crea una autoridad paralela.

## Inicio de cada tarea

1. Verifica en vivo el repositorio, rama, HEAD, base, PR relacionadas y checks pertinentes. No confíes en SHA o estados copiados de snapshots.
2. Si estás retomando trabajo, localiza el checkpoint más reciente o el encabezado del workstream en `docs/HANDOFF_NEXT_CHAT.md`; no leas el historial completo (es extenso). Para preguntas de estado, consulta `docs/CURRENT_STATE.md` por secciones concretas; tampoco lo leas completo por rutina.
3. Lee `docs/CONSTITUTION.md` y esta guía. Para cambios de PR/merge, consulta `docs/AI_COLLABORATION_AND_PR_POLICY.md`; sigue su sección de carril rápido de integración y la autorización permanente de merge del propietario.
4. Carga solo los documentos y skills del dominio afectado. Consulta `docs/STATE_JOURNAL.md` y `docs/RESOURCE_REGISTRY.md` cuando necesites decisiones históricas o evidencia de herramientas; no son lecturas obligatorias en cada sesión.
5. Separa hechos verificados, inferencias, hipótesis, desconocidos y bloqueos.

## Autonomía y responsabilidad

- Actúa como responsable técnico: investiga, decide detalles técnicos rutinarios, implementa, prueba, revisa y documenta el trabajo autorizado de principio a fin.
- No pidas al propietario que elija entre alternativas técnicas que puedes resolver con evidencia. Explica la decisión y continúa.
- No solicites permiso repetido para cambios reversibles, acotados y ya autorizados.
- No conviertas el proceso en una cadena de planes y reportes: ejecuta el siguiente paso seguro en la misma sesión, integra resultados y deja un único checkpoint accionable.
- Para PRs que cumplan los gates, usa la autorización de merge ya concedida; no detengas el flujo por una reconfirmación genérica del despliegue automático.
- Consulta solo ante decisiones reales de producto, cambios de requisitos, ambigüedad material, permisos/roles, riesgos financieros, acciones destructivas/irreversibles o una frontera explícita de autoridad.
- Si una herramienta, permiso o dato realmente falta, prueba la alternativa segura disponible y comunica el bloqueo concreto. No finjas que ejecutaste una herramienta ni esperes pasivamente cuando puedas avanzar por otra vía.

## Límites no negociables

- Micro-app es independiente de Cantina-pos y de cualquier otro proyecto.
- Presupuesto objetivo: **USD 0**. No actives billing, planes de pago, tarjetas, suscripciones ni cargos automáticos.
- **Fusiones a `main`:** el propietario autorizó el 2026-11-05 fusionar PRs cuando superen todos los gates técnicos, de seguridad, CI y branch protection. En este repositorio, el merge a `main` puede activar el despliegue automático de Cloudflare Pages; esa consecuencia está incluida en la autorización. No vuelvas a pedir permiso para cada merge que cumpla los gates.
- Esta autorización **no** permite despliegues manuales, cambios directos de Cloudflare, secretos/variables, DNS, billing, Neon `main`, migraciones remotas, escrituras/datos reales ni otras operaciones sensibles. Para ellas siguen siendo necesarios los permisos y gates específicos.
- Antes de cualquier migración con datos reales, operación destructiva o cambio sensible a producción, lee `docs/BACKUP_AND_RECOVERY.md` y verifica una ruta real de recuperación; no supongas que los backups funcionan.
- No habilites GGA, Engram, Gentle-AI, Gentle Shell ni hooks de Git sin revisar primero `docs/GENTLEMAN_IMPLEMENTATION.md`, coste, permisos, seguridad y desinstalación. Nunca actives hooks automáticamente.
- Neon main permanece sin DDL/DML, escrituras, cambios de roles/grants, ownership o credenciales salvo autorización explícita y específica del propietario para cada operación, posterior al análisis, prueba aislada y gate de recuperación de la Constitución. La autorización permanente de merge no cubre Neon. PostgreSQL desechable es el entorno primario de pruebas.
- No conectar previews a producción ni a datos reales por conveniencia. Usa datos sintéticos y verifica aislamiento.
- No expongas, registres ni versionees secretos, credenciales, tokens, cadenas de conexión o datos de clientes.
- No envíes correos ni realices acciones externas en nombre del propietario sin autorización expresa.
- No force-push. No fusiones a ciegas: inspecciona el diff completo, base, conflictos, checks y gates. Respeta instrucciones específicas que mantengan una PR abierta o Draft.
- No modifiques PR, ramas, issues o recursos fuera del alcance autorizado.
- No declares producción lista, seguridad certificada, despliegue activo, herramienta instalada o agente ejecutándose sin evidencia actual.

## Seguridad y calidad

- La autenticación no sustituye autorización. Valida tenant, sucursal, rol y propiedad en servidor y base de datos según el dominio.
- Para dinero, inventario, reservas y movimientos: prioriza constraints, transacciones, idempotencia, orden de locks, concurrencia y auditoría.
- Inspecciona callers y contratos antes de cambiar interfaces, schema, auth o configuración.
- Ejecuta pruebas proporcionales al riesgo y verifica CI en el SHA exacto del HEAD final. Distingue unit, integración, E2E, preview y producción.
- No rebajes ni omitas gates de `docs/SECURITY_ROADMAP.md`. Los controles Nivel 1 deben completarse antes de reanudar nueva lógica comercial, salvo instrucción expresa posterior del propietario. Esta puerta no bloquea documentación, gobernanza, investigación ni correcciones de seguridad no relacionadas.
- No implementes nuevos endpoints comerciales ni permisos de operación hasta que el propietario haya aprobado explícitamente la matriz de permisos por rol.
- Un check verde no demuestra por sí solo readiness de producción.

## ODD — flujo operativo

- Sigue `docs/ODD_WORKFLOW.md` en toda petición: autorizar, explorar, resolver incertidumbre, clasificar, registrar solo cuando el trabajo lo requiera, implementar/verificar y cerrar.
- ODD es el flujo predeterminado; no pidas al propietario que invoque fases ni generes planes/artefactos para cambios pequeños y claros.
- Para trabajo sustancial/crítico, crea un único `odd/tasks/<feature>.md` antes de modificar código fuente. Git es la fuente durable; Engram no está asumido ni es requisito.
- En trabajo crítico conserva especificaciones técnicas, pruebas de concurrencia, gates de seguridad, recuperación y aprobaciones de producto/datos. ODD no reduce esos controles.
- `docs/sdd/` conserva modelos, decisiones y contratos de dominio vigentes. `docs/SDD_WORKFLOW.md`, `templates/sdd/` y `skills/feature-sdd/` quedan como compatibilidad histórica, no como flujo operativo activo.
- Spec Kit no se instalará ni invocará como flujo por defecto; su evaluación anterior queda archivada en `docs/SPEC_KIT_ADOPTION.md`.

## Skills y agentes

- Lee una skill de `.agents/skills/` solo cuando la tarea corresponda a su ámbito. Son instrucciones versionadas, no evidencia de software externo instalado.
- Los perfiles `.github/agents/*.agent.md` describen roles. Solo afirma que un subagente fue lanzado si el runtime confirma una ejecución real.
- Si no hay delegación real, realiza pasadas de revisión independientes (arquitectura, seguridad/datos, QA y documentación según corresponda) y dilo con claridad.
- No habilites hooks, servicios, MCPs o agentes externos sin revisar licencia, coste, permisos, seguridad y procedimiento de desinstalación.

## Continuidad verificable y decisiones

- Aplica `odd/tasks/ai-continuity-and-evidence-contract.md` como contrato transversal para inicio, cierre, handoff, decisiones y evidencia.
- Antes de actuar, contrasta los checkpoints con GitHub vivo; los snapshots y la memoria del chat nunca sustituyen la verificación de HEAD, base, PR, checks y reviews.
- Para decisiones de arquitectura, seguridad, datos o integración con efecto duradero, registra un ADR en `docs/decisions/`; no crees ADR para decisiones triviales.
- Cada bloque sustancial debe dejar rama/PR/HEAD, pruebas exact-SHA, límites, riesgos y siguiente acción reproducible.

## Evidencia y continuidad

- Registra comandos, entorno, SHA, resultados y límites de las pruebas. No extrapoles evidencia de un commit anterior.
- Revisa el diff completo y busca regresiones, secretos, cambios de permisos y efectos secundarios.
- Actualiza `docs/CURRENT_STATE.md`, `docs/STATE_JOURNAL.md` y `docs/HANDOFF_NEXT_CHAT.md` cuando el trabajo cambie de forma significativa el estado o el punto de continuidad; no dupliques el diario en todos los documentos.
- Actualiza `README.md` solo cuando cambie de forma verificada el producto público, la instalación o la arquitectura; no por cambios internos de documentación.
- Mantén explícita la diferencia entre recomendado, aprobado, implementado y verificado.


## Objetivo explícito de cierre del backlog y producción

- El objetivo del propietario es completar el backlog de PR abiertas (26 en el snapshot 2026-11-06; recontar en GitHub antes de informar), preservar los cambios únicos y fusionar a `main` cada PR cuando haya superado íntegramente los gates aplicables. **No** fusionar las 26 en bloque, por antigüedad o por checks verdes aislados.
- Para cada PR: verificar diff/base/head/dependencias; rescatar cambios únicos; corregir y probar; exigir checks obligatorios en el SHA final, reviews solicitadas y branch protection; resolver riesgos materiales; fusionar sin reconfirmación cuando sea elegible; comprobar merge SHA, checks post-merge y despliegue automático; continuar con la siguiente PR desbloqueada.
- No esperar a terminar las 26 para fusionar una PR que ya sea segura y elegible. No fusionar una PR que dependa de migraciones, tablas, roles, secretos, configuración o decisiones no disponibles/validadas en el destino.
- La liberación de producción es un gate global adicional: demostrar integración end-to-end, migraciones y baseline seguros, roles efectivos runtime/migrator/backup de mínimo privilegio, autorización, integridad transaccional, precisión monetaria decimal sin descuentos, BCV trazable, auth, backup/restore y RPO/RTO, alertas/observabilidad, seguridad, presupuesto $0, despliegue y smoke tests autenticados. CI verde no basta.
- La autorización permanente cubre merges elegibles y el despliegue automático inherente. No amplía los permisos para Neon `main`, migraciones remotas, roles/grants, datos reales, secretos, Cloudflare manual, DNS ni billing. Mantener máximo dos frentes activos y un tablero vivo de las PR pendientes.
