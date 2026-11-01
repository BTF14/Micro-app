# Mapeo de plantillas SDD y auditoría del piloto Spec Kit

- Estado: análisis documental; no equivale a ejecución de Spec Kit
- Rama: `pilot/speckit-inventory`
- Base de referencia: `main` en el SHA `88213507d088b82ea9231bbc72f49afade7ec99b`
- Alcance: comparar las plantillas SDD canónicas del proyecto con los artefactos preliminares del piloto y fijar el contrato para una futura integración.
- Restricción: no se inspeccionaron plantillas instaladas de Spec Kit porque la CLI todavía no se ha instalado ni ejecutado.

## 1. Fuentes canónicas del proyecto

El flujo de `docs/SDD_WORKFLOW.md` declara como contrato las tres plantillas de `templates/sdd/`:

| Plantilla | Responsabilidad obligatoria |
|---|---|
| `templates/sdd/spec.md` | Problema, alcance, casos/reglas, datos/contratos, errores, seguridad/coste, criterios verificables y evidencia |
| `templates/sdd/plan.md` | Diseño, archivos/módulos, secuencia, riesgos, pruebas, reversión/compatibilidad y bloqueos |
| `templates/sdd/tasks.md` | Tareas pequeñas con aceptación, archivos y validación; revisión independiente y cierre con SHA/workflows/limitaciones |

La Constitución y `AGENTS.md` prevalecen sobre cualquier plantilla o automatización. Spec Kit debe orquestar el flujo, no sustituir la autoridad documental ni introducir un segundo sistema de decisiones.

## 2. Mapeo de cobertura: piloto frente a plantillas canónicas

| Requisito canónico | Artefacto piloto | Resultado documental |
|---|---|---|
| Estado, issue/PR, responsable, fecha y riesgo | `spec.md` | Cubierto; responsable/revisor queda explícitamente pendiente |
| Problema, objetivo, incluido y excluido | `spec.md` | Cubierto |
| Casos de uso y reglas de negocio | `spec.md` | Cubierto |
| Entradas/salidas, persistencia, compatibilidad, tenant/roles, moneda/tasa/impuestos | `spec.md` | Parcial: tenant/roles y persistencia están tratados; los contratos API aún no existen y moneda/tasa/impuestos se declaran no aplicables o pendientes de impacto |
| Errores y casos límite | `spec.md` | Cubierto |
| Seguridad, privacidad, abuso, coste cero y gate de producción | `spec.md` | Cubierto |
| Criterios verificables y evidencia | `spec.md` | Cubierto; los criterios permanecen sin marcar como aceptados |
| Diseño y decisiones | `plan.md` | Cubierto como propuesta |
| Archivos/módulos y motivo | `plan.md` | Cubierto; rutas expresamente hipotéticas, pendientes de discovery |
| Secuencia de implementación | `plan.md` | Cubierto como secuencia futura |
| Riesgos, severidad y mitigación | `plan.md` | Cubierto |
| Pruebas unitarias, integración, E2E y seguridad | `plan.md` | Cubierto; se distinguen pruebas futuras de evidencia ejecutada |
| Migración/rollback y compatibilidad | `plan.md` | Cubierto a nivel de estrategia; el diseño detallado queda pendiente |
| Bloqueos y decisiones pendientes | `plan.md` y `spec.md` | Cubierto |
| Tareas pequeñas con aceptación, archivos y validación | `tasks.md` | Cubierto |
| Revisión independiente y cierre con SHA/workflows | `tasks.md` | Estructura presente; revisión y workflows todavía pendientes |

## 3. Ajustes necesarios antes de adoptar templates de Spec Kit

1. Conservar los campos de negocio del proyecto aunque el template upstream no los incluya: coste total $0, tenant/roles, compatibilidad, reversión, evidencia, SHA y estado de aprobación.
2. Mantener explícita la separación entre propuesta, aprobación, implementación y validación.
3. Mantener enlaces a Constitución, `AGENTS.md`, `docs/SDD_WORKFLOW.md` y decisiones canónicas; no copiar sus contenidos completos a cada feature.
4. No permitir que un comando de generación cambie automáticamente criterios, roles, políticas o decisiones abiertas.
5. Mantener las rutas actuales bajo `docs/specs/<feature>/` si la versión instalada permite configurar el directorio; verificarlo con la CLI real.
6. No crear overrides hasta inspeccionar los nombres y el contenido exacto de los templates instalados. No asumir nombres de archivos upstream.

## 4. Contrato de integración propuesto

- Spec Kit genera y estructura borradores.
- Las plantillas y normas de Micro-app siguen siendo la referencia de contenido y seguridad.
- Los overrides locales, si hacen falta, deben ser mínimos y versionados en la rama piloto.
- Los artefactos generados deben quedar en `docs/specs/<feature>/`, sin duplicar copias editables en otro directorio.
- Los comandos de análisis pueden detectar omisiones, pero no aprobar decisiones de producto ni autorizar implementación.
- La fase de implementación permanece bloqueada hasta que el usuario apruebe explícitamente spec y plan.
- Cualquier inicialización con `--force` requiere inspección inmediata del diff y reversión selectiva de cambios no aceptados.

## 5. Resultado de la auditoría documental

**Resultado:** las tres piezas del piloto cubren la estructura esencial de las plantillas SDD del proyecto. No se observa una omisión estructural que obligue a rehacer los artefactos antes de probar la herramienta.

**Limitaciones abiertas:**
- No se compararon los archivos con templates reales instalados de Spec Kit.
- No se ejecutaron `specify init`, `specify check`, `specify version`, `specify integration status` ni los comandos de flujo.
- No se inspeccionó exhaustivamente el código ni los consumidores de stock; T3 continúa pendiente.
- La auditoría es documental, no revisión independiente de arquitectura/seguridad ni aprobación de producto.

## 6. Próximo gate técnico

Cuando exista un terminal con acceso a GitHub/PyPI y sin coste adicional:
1. Inicializar Spec Kit únicamente en esta rama y registrar versión exacta.
2. Inspeccionar el diff de inicialización antes de continuar.
3. Comparar los templates instalados con este mapeo.
4. Añadir solo los overrides mínimos necesarios.
5. Ejecutar Specify, Plan, Tasks y Analyze sobre el feature directory configurado.
6. Comparar la salida generada con las plantillas canónicas y registrar diferencias.
7. Detenerse antes de Implement.

No se declara instalado, configurado ni ejecutado Spec Kit en este estado.
