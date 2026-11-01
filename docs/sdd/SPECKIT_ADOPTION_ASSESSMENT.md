# Evaluación de adopción de GitHub Spec Kit

**Estado:** preparación manual previa al piloto; no es salida generada por Spec Kit.  
**Rama:** `pilot/speckit-inventory`  
**Base verificada al iniciar esta evaluación:** `88213507d088b82ea9231bbc72f49afade7ec99b`  
**Alcance:** integración documental y metodológica. No autoriza implementación funcional, migraciones, despliegues, cambios de datos ni operaciones de producción.

## 1. Decisión de arquitectura documental

Adoptar Spec Kit como motor de flujo SDD, no como segundo sistema documental. Mantener los documentos canónicos de Micro-app y adaptar las plantillas y comandos de Spec Kit para consumirlos.

Principios:

1. `AGENTS.md` y `docs/CONSTITUTION.md` siguen siendo las reglas rectoras del repositorio.
2. Las decisiones de producto y arquitectura aprobadas siguen viviendo en sus documentos SDD canónicos; Spec Kit no las vuelve a decidir ni las copia como otra fuente de verdad.
3. Las plantillas `templates/sdd/spec.md`, `plan.md` y `tasks.md` son la base de los artefactos de cada función.
4. Los artefactos de función continúan en `docs/specs/<feature>/`, conforme a `docs/SDD_WORKFLOW.md` y `skills/feature-sdd/SKILL.md`. No adoptar la carpeta raíz `specs/` por defecto sin verificar primero que la integración de Spec Kit permite personalizar sus rutas sin hacks.
5. `.specify/` contendrá únicamente configuración, plantillas adaptadas y memoria derivada necesaria para que Spec Kit opere. Su memoria nunca sustituye la Constitución ni los documentos SDD.
6. No mantener dos copias editables de la misma spec, plan o lista de tareas.

## 2. Mapeo entre Micro-app y Spec Kit

| Capacidad de Spec Kit | Fuente/artefacto Micro-app | Tratamiento |
|---|---|---|
| Constitution | `AGENTS.md` + `docs/CONSTITUTION.md` | Mantener como autoridad. Si Spec Kit exige una constitución propia, usar una referencia/resumen derivado y declarar explícitamente su precedencia. |
| Specify | `templates/sdd/spec.md` | Extender la plantilla existente solo con campos que falten: actores, escenarios, estados alternos, requisitos funcionales/no funcionales y criterios trazables. |
| Plan | `templates/sdd/plan.md` | Conservar el plan actual y reforzar contratos, arquitectura, compatibilidad, secuencia de migración, observabilidad, seguridad y recuperación cuando aplique. |
| Tasks | `templates/sdd/tasks.md` | Conservar tareas verificables y agregar dependencias/IDs/enlaces a criterios solo si mejoran trazabilidad. |
| Clarify | Spec + decisiones canónicas | Usar para resolver ambigüedades antes de aprobar; registrar la decisión en el documento canónico correspondiente, no solo en memoria del agente. |
| Analyze | Spec, plan, tasks y documentación/código existentes | Usar como revisión de coherencia y detección de vacíos; no crear un informe duplicado por cada ejecución si los hallazgos caben en los artefactos o revisión. |
| Checklist | Criterios de aceptación, seguridad y gates de Micro-app | Reutilizar criterios existentes; generar checklist adicional solo para riesgos específicos de la función. |
| Implement | Skill `feature-sdd` + tareas aprobadas | Fuera del alcance de este piloto de planificación. No ejecutar implementación de código. |

## 3. Contenido que no debe duplicarse

- Constitución, reglas de seguridad, coste cero, producción y datos.
- Matriz de permisos aprobada y decisiones de tenant/sucursal.
- Arquitectura multi-branch, modelo de caja/turnos y decisiones de inventario.
- Política de colaboración/PR, verificación, handoff y diario.
- Contratos de API y esquema SQL ya documentados.

Los artefactos de función deben enlazar estas fuentes y resumir solo las restricciones que apliquen. Si se requiere una memoria de Spec Kit, debe ser mínima, derivada y regenerable desde los documentos canónicos.

## 4. Requisitos específicos para el piloto de inventario

La especificación de inventario por sucursal debe tratar explícitamente:

- Estado real separado de estado objetivo: `products.stock_quantity` continúa siendo organizacional; el stock separado por sucursal/almacén no está implementado.
- `organization_id` como frontera tenant y claves foráneas compuestas.
- Sucursal como ámbito operativo; almacén perteneciente a una sucursal.
- Roles organizacionales únicos y asignación de sucursal separada de la autorización.
- Matriz de permisos de `docs/sdd/role-permission-decision-matrix.md` como aprobada; no inventar roles por sucursal.
- Libro de movimientos y balances como proyección, consistencia transaccional, concurrencia, idempotencia, no stock negativo y reversos auditables.
- Recepción física separada de orden de compra; transferencias con salida/recepción y trazabilidad.
- Backfill/reconciliación antes de retirar el stock organizacional existente.
- Pruebas cross-tenant, aislamiento de rol, concurrencia, rollback y PostgreSQL desechable.
- No aplicar migraciones a Neon `main`, no tocar datos reales ni desplegar.

La matriz de permisos está aprobada, pero esa aprobación no significa que inventario por sucursal esté implementado ni que existan endpoints comerciales.

## 5. Hallazgos de consistencia documental a conciliar

1. `docs/sdd/MULTI_BRANCH_DATA_MODEL.md` conserva una frase que indica que la matriz de permisos está “NO APROBADA”. La matriz actual está marcada APROBADA y `docs/CURRENT_STATE.md` registra esa aprobación. Debe actualizarse esa referencia obsoleta cuando se autorice la pasada de sincronización documental.
2. `docs/CURRENT_STATE.md` y `docs/HANDOFF_NEXT_CHAT.md` contienen snapshots históricos con SHA distintos. Deben tratarse como handoffs fechados, no como prueba del HEAD actual; verificar GitHub antes de cada acción y corregir solo el estado vigente, sin borrar historia útil.
3. La documentación del modelo multi-sucursal contiene decisiones objetivo y componentes aún no implementados. Cada afirmación del piloto debe etiquetarse como implementada, aprobada, propuesta o pendiente.

Estos son hallazgos de lectura; este documento no corrige ni reemplaza las fuentes originales.

## 6. Verificaciones técnicas pendientes antes de instalar

- Confirmar con la versión exacta de Spec Kit cómo personalizar la ruta de salida de specs y la ubicación de las plantillas, de modo que el flujo escriba en `docs/specs/` y use `templates/sdd/` sin mantener duplicados.
- Confirmar qué archivos modifica `specify init` en un repositorio existente y revisar el diff inmediatamente; no aceptar sobrescrituras silenciosas.
- Instalar únicamente la integración Codex en la rama piloto y revisar los skills generados.
- Comparar el resultado de cada plantilla adaptada contra los documentos actuales.
- Ejecutar Specify/Plan/Tasks/Analyze/Clarify en el caso de inventario acotado.
- Detenerse antes de cualquier comando de implementación.

**Bloqueo actual:** este entorno no tiene acceso de red a GitHub desde el terminal y no permite clonar/instalar/ejecutar el CLI. La lectura mediante GitHub permite preparar esta evaluación, pero no sustituye la ejecución real de Spec Kit. No se afirma que Spec Kit haya sido instalado o ejecutado.
