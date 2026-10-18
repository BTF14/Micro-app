# Registro de decisión: permisos por rol y organización

- Estado: **pendiente de aprobación del propietario**.
- Fecha: 2026-10-18.
- Riesgo: alto; afecta aislamiento multiempresa, datos financieros y operaciones de inventario.
- Roles que aparecen en el modelo actual: `owner`, `admin`, `cashier`, `inventory`.
- Fuente relacionada: `docs/CONSTITUTION.md`, sección 4; `docs/PRODUCTION_READINESS.md`; matriz de aceptación de aislamiento multiempresa.

## Propósito y límites

Este documento recopila las decisiones necesarias antes de exponer rutas comerciales. No cambia permisos ni autoriza una implementación. **Todas las celdas quedan pendientes**: los nombres de rol del código no definen por sí solos qué operaciones puede realizar cada rol.

Hasta que se apruebe una política, no se debe inferir autorización de la interfaz, del ID enviado por el cliente, de que el usuario pertenezca a alguna organización, ni de un nombre de rol sin una regla explícita. Las futuras rutas deben denegar por defecto y validar la pertenencia a la organización en el servidor.

## Matriz por área

Completar cada celda con una decisión explícita: **permitir**, **denegar** o **permitir con condiciones** (describirlas). Definir permisos distintos para lectura y escritura; no asumir que quien puede consultar puede modificar.

| Área / operación | owner | admin | cashier | inventory | Condiciones / alcance |
|---|---|---|---|---|---|
| Ver catálogo y categorías | Pendiente | Pendiente | Pendiente | Pendiente | ¿Toda la organización o categorías asignadas? |
| Crear/editar/archivar productos | Pendiente | Pendiente | Pendiente | Pendiente | Separar edición de precio, coste, SKU y estado. |
| Ver proveedores | Pendiente | Pendiente | Pendiente | Pendiente | Definir campos sensibles. |
| Crear/editar proveedores | Pendiente | Pendiente | Pendiente | Pendiente |  |
| Registrar compras/recepciones | Pendiente | Pendiente | Pendiente | Pendiente | Afecta existencias y costes. |
| Consultar existencias y movimientos | Pendiente | Pendiente | Pendiente | Pendiente |  |
| Ajustar inventario manualmente | Pendiente | Pendiente | Pendiente | Pendiente | Motivo obligatorio y auditoría. |
| Abrir/cerrar caja | Pendiente | Pendiente | Pendiente | Pendiente | Definir caja/sucursal asignada. |
| Crear ventas | Pendiente | Pendiente | Pendiente | Pendiente | Incluir descuentos y precio fuera de catálogo. |
| Anular/devolver ventas | Pendiente | Pendiente | Pendiente | Pendiente | Reversos auditables; no borrar hechos. |
| Registrar/ver pagos y cambios | Pendiente | Pendiente | Pendiente | Pendiente | Restringir información financiera según necesidad. |
| Consultar reportes/exportar datos | Pendiente | Pendiente | Pendiente | Pendiente | Definir datos personales y límites de exportación. |
| Gestionar usuarios e invitaciones | Pendiente | Pendiente | Pendiente | Pendiente | Separar invitar, desactivar y revocar sesiones. |
| Asignar/cambiar roles | Pendiente | Pendiente | Pendiente | Pendiente | Evitar autoelevación y pérdida del último administrador. |
| Configurar organización/sucursal | Pendiente | Pendiente | Pendiente | Pendiente |  |
| Ver auditoría | Pendiente | Pendiente | Pendiente | Pendiente | Definir acceso a registros de otros usuarios. |
| Gestionar allowlist e identidad | Pendiente | Pendiente | Pendiente | Pendiente | Bloqueado también por decisiones D1–D8 de identidad. |

## Decisiones globales que también deben resolverse

1. ¿Los roles aplican a toda la organización o se necesitan permisos por sucursal/caja?
2. ¿Se permitirán permisos personalizados o solo estos cuatro roles fijos?
3. ¿Quién puede conceder/revocar roles y cómo se evita quitar el acceso al último propietario/administrador?
4. ¿Qué operaciones requieren motivo obligatorio, aprobación adicional o límite monetario (descuentos, devoluciones, ajustes de stock)?
5. ¿Qué datos pueden exportarse y qué acciones deben quedar en auditoría?
6. ¿Cómo se revoca acceso inmediatamente al desactivar un usuario o quitarlo de una organización?

## Criterios mínimos de implementación posterior

- Cada operación de lectura/escritura obtiene la organización desde una sesión/membresía validada en servidor, no desde un ID confiado del cliente.
- La consulta SQL limita los registros a esa organización; validar autorización no debe depender solo de UUID difíciles de adivinar.
- Pruebas negativas con usuario sin sesión, membresía inactiva, rol no autorizado, organización ajena y recurso ajeno.
- Pruebas positivas por rol únicamente después de aprobar esta matriz.
- Operaciones de ventas, pagos y stock se implementan con transacciones, idempotencia y auditoría según la Constitución.
- Los resultados de autorización no se consideran probados hasta que existan rutas reales y pruebas de integración contra PostgreSQL de prueba.

## Estado

No aprobado; no implementar permisos de negocio a partir de una matriz vacía. La próxima decisión del propietario es completar/aprobar esta matriz y resolver por separado D1–D8 de identidad.