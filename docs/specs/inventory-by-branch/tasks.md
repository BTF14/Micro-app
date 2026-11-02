# Tasks: inventario por sucursal y almacén

- Spec: [spec.md](spec.md)
- Plan: [plan.md](plan.md)
- Estado: tareas de planificación; implementación bloqueada hasta aprobación

## Tareas

- [x] T1 — Revisar fuentes canónicas de tenant, sucursales, permisos, inventario y caja.
  **Aceptación:** distinguir modelo actual de objetivo y registrar la matriz de permisos como aprobada.
  **Archivos:** `docs/CONSTITUTION.md`, `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`, `docs/sdd/role-permission-decision-matrix.md`, migraciones 0001/0003/0004.
  **Validación/evidencia:** lectura de archivos en rama piloto; no es validación de código ni ejecución de Spec Kit.

- [x] T2 — Crear spec, plan y tasks preliminares para inventario por sucursal.
  **Aceptación:** artefactos enlazados, criterios verificables y decisiones pendientes visibles.
  **Archivos:** `docs/specs/inventory-by-branch/`.
  **Validación/evidencia:** revisión documental de coherencia; no aprobación de producto.

- [ ] T3 — Completar discovery exhaustivo de implementación existente (parcial; no cerrar todavía).
  **Aceptación:** inventario de callsites de `stock_quantity`, `inventory_movements`, ventas, compras y tests, con rutas/consumidores reales.
  **Archivos:** `docs/sdd/INVENTORY_BRANCH_CODE_DISCOVERY.md`; migraciones `0001_initial.sql`, `0003_branch_scope.sql`, `0004_register_shifts.sql`; módulos API y pruebas asociadas.
  **Validación/evidencia:** el snapshot `b256c1c3e51a145e5af62fbdfb830a4368884c` aporta un árbol recursivo de 169 rutas y revisión estática; la revalidación dirigida de `main` `7ff887328f25cffff69ccb9e89bbb1ba25200aea` está descrita con blob SHAs en `INVENTORY_BRANCH_CODE_DISCOVERY.md`. No se hizo un barrido reproducible de todos los callsites ni se ejecutaron pruebas/runtime; por eso T3 permanece parcial y no se marca completa.

- [ ] T4 — Resolver decisiones de producto/modelo abiertas (requiere respuestas/aprobación del propietario).
  **Aceptación:** coste/valoración, reservas, transferencias en tránsito, reversos, referencias de origen y almacén de venta documentados y aprobados.
  **Archivos:** spec y documentos canónicos afectados.
  **Validación/evidencia:** decisiones registradas; no inferir aprobación.

- [ ] T5 — Diseñar modelo SQL y transacciones.
  **Aceptación:** DDL propuesto con FKs compuestas, constraints, índices, estados, idempotencia y estrategia ledger/balance revisados.
  **Archivos:** plan y migración propuesta (sin aplicar).
  **Validación/evidencia:** revisión técnica y pruebas de diseño.

- [ ] T6 — Definir suite de pruebas de seguridad e integridad.
  **Aceptación:** casos cross-tenant, rol, membresía revocada, concurrencia, atomicidad, idempotencia, rollback y reconciliación especificados.
  **Archivos:** plan y tests futuros.
  **Validación/evidencia:** matriz de casos con resultado esperado.

- [ ] T7 — Diseñar backfill, reconciliación y rollback.
  **Aceptación:** estrategia repetible, comparación de cantidades, tratamiento de discrepancias y gate de cutover definidos.
  **Archivos:** plan y migración propuesta (sin ejecutar).
  **Validación/evidencia:** ensayo en PostgreSQL desechable cuando exista entorno.

- [ ] T8 — Revisión independiente de spec/plan/tasks.
  **Aceptación:** revisión separada de arquitectura, seguridad/datos y QA; registrar limitaciones y hallazgos.
  **Archivos:** los tres artefactos.
  **Validación/evidencia:** comentarios concretos; subagentes no ejecutados salvo prueba de ejecución real.

- [ ] T9 — Gate de aprobación de implementación.
  **Aceptación:** spec y plan aprobados explícitamente; tareas de implementación separadas y límites de producción preservados.
  **Archivos:** spec, plan, tasks y decisiones canónicas.
  **Validación/evidencia:** aprobación trazable. No implementar antes de este gate.

## Revisión independiente

- [ ] Arquitectura y alcance revisados.
- [ ] Seguridad / autorización / tenant revisados cuando corresponda.
- [ ] Pruebas y workflows comprobados para el SHA final.
- [ ] Diff completo inspeccionado; no hay secretos.
- [ ] Documentación y handoff actualizados.

## Criterios verificables para cerrar las tareas de diseño

- **T3:** entregar lista reproducible de todos los callsites de `stock_quantity`, `inventory_movements`, ventas, compras y tests en un SHA exacto; distinguir uso runtime, tests, migraciones y documentación; repetir el barrido si cambia el SHA antes de implementación.
- **T4:** cada decisión owner-only debe tener pregunta, respuesta explícita, fecha/fuente y alcance. Si se excluye del MVP, registrar explícitamente la exclusión; no convertir silencio en aprobación.
- **T5:** entregar DDL propuesto con FKs/constraints/índices, contratos de transacción, idempotencia y concurrencia. No fijar estados o campos de coste/reserva dependientes de T4.
- **T6:** cada caso de prueba debe indicar actor/rol, tenant, sucursal, fixture, operación, resultado HTTP/SQL esperado y aserción de cero escrituras parciales.
- **T7:** documentar origen de conteo físico, responsable/aprobador, total legado, saldo por almacén, diferencias, umbral aprobado, idempotencia de backfill, cutover y rollback ensayado en PostgreSQL efímero.
- **T8:** separar revisión de arquitectura, seguridad/datos y QA; registrar SHA, alcance, hallazgos, limitaciones y resolución. La auditoría Copilot del SHA `87049399ec458406b6d7c481d928c9b7cdc3569` es revisión documental auxiliar, no ejecución de Spec Kit ni aprobación.
- **T9:** mantener bloqueada la implementación hasta aprobación explícita de spec/plan y de los gates. Esta fase documental no crea autorización para código funcional, migraciones, PR, merge o despliegue.
## Cierre

- SHA: pendiente
- Workflows: no ejecutados
- Criterios aceptados / no aceptados: artefactos preliminares creados; criterios de diseño aún no validados
- Limitaciones no verificadas: Spec Kit CLI no instalado/ejecutado; no terminal con red; no discovery exhaustivo de código; no pruebas
- Siguiente paso: completar discovery técnico y validar personalización de rutas/plantillas en Spec Kit antes de aprobar el flujo
