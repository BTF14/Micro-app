# Matriz de decisión de permisos comerciales — pendiente de aprobación

**Estado: NO APROBADA.** Este documento no concede permisos, no autoriza endpoints ni middleware y no debe interpretarse como política operativa. Reemplaza propuestas anteriores con recomendaciones por rol/sucursal aún no aprobadas y contradictorias con la decisión estructural vigente.

## Decisión estructural ya fijada
- Cada miembro tiene **un único rol por organización**, guardado en `organization_members.role`: `owner`, `admin`, `cashier` o `inventory`.
- El rol aplica a toda la organización; no hay roles distintos por sucursal.
- `branch_memberships` solo concede/revoca acceso a sucursales; no contiene roles.
- Cambiar el rol organizacional afecta a toda la organización. Revocar una asignación de sucursal no cambia el rol ni otras asignaciones.
- La asignación a una sucursal no es autorización para ejecutar operaciones.

Fuentes canónicas: `docs/SAAS_ARCHITECTURE_DECISIONS.md` §§3 y 14; `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`; migración `apps/api/migrations/0003_branch_scope.sql`.

## Decisiones de permisos todavía requeridas
El propietario debe definir explícitamente, por rol y por operación:
1. Lectura y modificación de catálogo, precios y costos.
2. Lectura de existencias y movimientos; recepción, ajuste y transferencia de inventario.
3. Apertura y cierre ordinario de caja; operaciones permitidas durante un turno abierto.
4. Creación de ventas, descuentos, cambios de precio y aplicación de políticas comerciales.
5. Devoluciones, anulaciones, reversos y aprobaciones excepcionales.
6. Gestión de miembros, invitaciones, desactivaciones, cambios de rol y asignaciones de sucursal.
7. Configuración de políticas comerciales de la organización y ejecución de excepciones.
8. Reportes, exportaciones y acceso a auditoría.

Para cada operación hay que definir lectura/escritura, alcance organizacional/sucursal/recurso, condiciones, límites, aprobación adicional, auditoría y comportamiento al revocar acceso. No se propone aquí un valor por defecto para ninguna celda.

## Límites
- No crear endpoints comerciales, middleware de autorización ni mapeos rol→operación hasta aprobación explícita de esta matriz.
- No convertir `branch_memberships` en una tabla de roles por sucursal.
- Las políticas comerciales pertenecen a cada organización; no imponer umbrales universales. Las facultades para configurar políticas y ejecutar excepciones son decisiones distintas y ambas siguen pendientes.
- Caja conserva modelo de turnos y apertura/cierre ordinario; no introducir cierres de supervisor incompatibles.
- Inventario por sucursal/almacén no está implementado; el stock actual sigue siendo organizacional.

## Aprobación
**Estado actual: NO APROBADA.** Solo el propietario puede aprobar o corregir las decisiones de permisos. Hasta entonces, la API debe permanecer sin operaciones comerciales expuestas y cualquier autorización futura debe denegar por defecto y validarse en servidor.
