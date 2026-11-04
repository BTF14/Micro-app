# Flujo de desarrollo guiado por especificaciones (SDD)

**Propósito:** aplicar suficiente estructura para reducir ambigüedad, riesgo y retrabajo, sin convertir cada cambio en burocracia.

## Selección del proceso

| Nivel | Cuándo usarlo | Artefactos mínimos |
|---|---|---|
| Ligero | Erratas, documentación, copy, refactor localizado o bug de bajo riesgo sin cambio de contrato/datos | Alcance breve, resultado esperado y validación en PR |
| Estándar | Función nueva o cambio de comportamiento entre módulos | Spec, plan, tareas, pruebas y revisión |
| Crítico | Auth, permisos, tenant/sucursal, migraciones, inventario, ventas/pagos, tasas/impuestos, seguridad o infraestructura | SDD completo, revisión de seguridad/datos, plan de rollback, pruebas de integración/concurrencia y gates específicos |

El coordinador decide el nivel y lo explica brevemente. No debe pedir al propietario que elija el nivel salvo que el alcance sea una decisión de producto.

## Flujo estándar/crítico

1. **Constitución y descubrimiento:** leer `AGENTS.md`, `docs/CONSTITUTION.md`, estado vivo y fuentes del dominio. Inspeccionar código, callers, tests, PRs y CI.
2. **Spec:** definir problema, usuarios, resultados, reglas, casos límite, errores, seguridad, datos, criterios verificables y fuera de alcance.
3. **Clarify:** usarlo cuando queden decisiones ambiguas que cambien producto, contrato o seguridad. No ejecutar una fase de preguntas por rutina cuando los requisitos ya estén claros.
4. **Plan:** definir arquitectura, archivos, dependencias, compatibilidad, migración/rollback, riesgos y estrategia de pruebas.
5. **Tasks:** dividir en unidades pequeñas, ordenadas y observables; indicar dependencias y criterio de cierre.
6. **Analyze:** comprobar consistencia entre spec, plan y tareas antes de implementar cambios de riesgo.
7. **Implement:** ejecutar las tareas autorizadas, actualizar tests y documentación; no ampliar silenciosamente el alcance.
8. **Review:** revisar de forma independiente arquitectura, seguridad/datos, QA y UX según el impacto. Delegar solo cuando exista runtime real; de lo contrario hacer pasadas separadas.
9. **Validate / Converge:** ejecutar pruebas pertinentes, verificar checks en el SHA final y corregir gaps hasta que los criterios se cumplan o quede un bloqueo demostrado.
10. **Handoff:** registrar decisión, SHA, evidencia, limitaciones, riesgos y siguiente acción concreta.

## Uso de Spec Kit

La adopción prevista es GitHub Spec Kit (versión fijada en `docs/SPEC_KIT_ADOPTION.md`). Cuando esté instalado y disponible, usar sus comandos equivalentes:

- `/speckit-specify` — especificación.
- `/speckit-clarify` — solo si hay incertidumbres relevantes.
- `/speckit-plan` — diseño técnico.
- `/speckit-tasks` — tareas ejecutables.
- `/speckit-analyze` — consistencia antes de implementar.
- `/speckit-implement` — implementación.
- `/speckit-converge` — brechas restantes y cierre verificable.

La Constitución de Micro-app sigue siendo la autoridad; el contexto Spec Kit no puede reemplazarla. No ejecutar `/speckit-constitution` para recrear las políticas del proyecto sin revisar primero `docs/CONSTITUTION.md`.

## Artefactos y fuentes de verdad

- Los nuevos artefactos de Spec Kit deben vivir en la estructura que cree la versión fijada de la CLI; no inventar rutas ni duplicar los modelos de dominio existentes.
- Mantener `docs/sdd/` como arquitectura/decisiones de dominio y evidencia técnica, no convertir retrospectivamente todo el sistema en una especificación artificial.
- `templates/sdd/` y `skills/feature-sdd/` son el fallback legado hasta que la CLI y su integración estén instaladas y verificadas. Después, decidir su consolidación en un cambio separado.
- El diario conserva historia; el handoff conserva el punto de continuación; el estado vivo resume el presente. No copiar el mismo contenido en los tres.

## Reglas de cierre

- Criterios de aceptación probados o pendientes explícitos.
- Diff completo revisado y checks del SHA exacto.
- Mocks diferenciados de integración real; Preview diferenciado de producción.
- Migraciones probadas en PostgreSQL desechable y rollback documentado.
- Ningún secreto/dato real en artefactos.
- No fusionar ni desplegar por el mero hecho de que CI esté verde.
