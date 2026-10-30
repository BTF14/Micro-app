# Modelo de cajas y turnos — decisión de arquitectura

**Estado:** decisión base adoptada para diseño; no implementada en SQL/runtime y no equivale a aprobación de la matriz comercial completa.  
**Fecha:** 2026-10-30 UTC  
**Base de diseño:** main `1d10befe0cd3367e04bd8998a192e93d9b228063`, PR #165 fusionada.  
**Objetivo:** trazabilidad de efectivo y atribución inequívoca de operaciones en un POS multi-sucursal.

## 1. Decisión operativa

- Una caja/terminal pertenece a exactamente una sucursal y una organización.
- Un turno pertenece a exactamente una caja, una sucursal, una organización y un cajero.
- Un turno abierto no se comparte entre cajeros y su responsable no se cambia.
- Un cajero no puede mantener más de un turno abierto simultáneamente dentro de la misma organización.
- Una caja no puede tener más de un turno abierto simultáneamente.
- El cambio de responsable se modela como **cierre del turno anterior + apertura de un turno nuevo**. No se realiza handover modificando el usuario del turno abierto.
- Los turnos cerrados son históricos; no se reabren ni se sobrescriben. Una corrección futura será una acción separada, autorizada y auditada.
- La caja puede reutilizarse por otro cajero después del cierre confirmado.

Esta es la opción base más simple de auditar: cada venta/pago asociado a caja puede atribuirse a un solo cajero y a un intervalo de turno concreto.

## 2. Invariantes de datos propuestos para migración 0004

### registers
- UUID como identificador.
- `organization_id` y `branch_id` obligatorios.
- Nombre y código no vacíos; código único dentro de la sucursal.
- Estado activo/inactivo.
- Clave única compuesta para que los turnos referencien la caja dentro de la misma organización y sucursal.
- Una caja con turno abierto no se puede desactivar mediante una operación normal.

### register_shifts
- UUID, `organization_id`, `branch_id`, `register_id` y `cashier_user_id` obligatorios.
- El cajero debe pertenecer a la organización y tener asignación de sucursal. La FK garantiza pertenencia estructural; el runtime debe volver a validar que membresía y asignación sigan activas y que el rol actual sea `cashier`.
- Apertura con `opening_cash` NUMERIC (nunca float), no negativo, y `opened_at`.
- Cierre con `closing_cash` NUMERIC no negativo, `closed_at` y `closed_by_user_id`; el cierre debe quedar completo o permanecer abierto, nunca parcialmente cerrado.
- `opened_by_user_id` debe ser el mismo cajero responsable en la política base. El cierre normal corresponde al mismo cajero; una excepción de supervisor se reservará para un permiso separado, con motivo y auditoría, si la matriz futura lo aprueba.
- FK compuestas para evitar mezclar organizaciones, sucursales, cajas, miembros y asignaciones.
- Índice único parcial: como máximo un turno abierto por caja.
- Índice único parcial: como máximo un turno abierto por cajero dentro de la organización.
- Checks que mantienen coherencia entre estado abierto/cerrado y campos de cierre.
- No almacenar aquí pagos, ventas, movimientos de efectivo ni saldo esperado calculado sin un ledger de caja definido.

## 3. Reglas de aplicación futuras

1. Abrir: validar sesión, tenant, branch context, rol cashier, asignación activa, caja activa y ausencia de turno abierto del cajero/caja; insertar apertura en transacción.
2. Operar: cada operación de caja debe comprobar en servidor el turno abierto, cajero autenticado y caja/sucursal correctas dentro de la misma transacción que la operación financiera.
3. Cerrar: capturar conteo real, calcular diferencias cuando exista un ledger completo, registrar actor y hora; bloquear modificaciones posteriores.
4. Cambio de cajero: cerrar el turno actual; abrir uno nuevo para el siguiente cajero. Si el cierre falla, no abrir el siguiente turno.
5. Concurrencia: índices únicos parciales son la última defensa; la API debe manejar conflictos sin crear duplicados ni filtrar detalles internos.
6. Desactivación: no permitir desactivar caja/sucursal o revocar asignación mientras existan operaciones abiertas sin un flujo de cierre controlado.

## 4. Autorización y límites

- `resolveBranchContext` ya existe, pero no está conectado a rutas.
- Un contexto owner/admin de alcance organizacional no significa que puedan operar como cajero en un turno ajeno.
- No aprobar aquí permisos de apertura/cierre por supervisor, arqueo, diferencias, retiros, ingresos, anulaciones ni reportes financieros.
- La matriz `docs/sdd/role-permission-decision-matrix.md` sigue NO APROBADA. Antes de endpoints, debe aprobarse o sustituirse por una matriz corregida con autorización server-side por operación.
- Este diseño no implementa endpoints, pagos, ventas, ledger de caja, ni autoriza operaciones comerciales.

## 5. Pruebas de aceptación para 0004

En PostgreSQL 18 efímero, desde una base vacía y aplicando migraciones 0001–0004 en orden:

- Crear cajas en dos sucursales/organizaciones y rechazar referencias cruzadas.
- Rechazar cajero que no pertenece a la organización o no está asignado a la sucursal.
- Permitir un turno abierto por caja y rechazar el segundo por índice único parcial.
- Permitir un turno abierto por cajero en una caja y rechazar simultáneo en otra caja de la misma organización.
- Permitir abrir un nuevo turno después de cerrar el anterior.
- Rechazar apertura/cierre con importes negativos y estados/campos inconsistentes.
- Rechazar cierre incompleto y conservar abierto el turno si la transacción de cierre falla.
- Verificar que un turno cerrado no puede reabrirse modificando su estado/campos.
- Tests de integración del resolver: usuario no asignado, asignación inactiva, rol cambiado, caja inactiva, turno cerrado, turno de otro cajero, cross-tenant/cross-branch.
- Tests de concurrencia: dos aperturas simultáneas para misma caja y para mismo cajero deben producir un único turno abierto.
- Fixtures sintéticos y limpieza determinista; nunca Neon main ni datos reales.

## 6. Secuencia de implementación

1. Implementar migración aditiva 0004 y assertions SQL.
2. Extender workflows CI para aplicar 0001–0004 desde cero en PostgreSQL 18 efímero.
3. Añadir tests de integración y helper aislado para resolver el turno del cajero autenticado.
4. Revisar diff completo, checks exactos, seguridad y documentación.
5. No aplicar 0004 a Neon main ni conectar rutas comerciales en esta fase.

## 7. Estado actual de infraestructura de pruebas

- PR #165 ya demuestra que CI aplica 0001–0003 y ejecuta integración branch-context contra PostgreSQL 18 efímero.
- No se aplicó 0003 a Neon main.
- La herramienta de lectura de Neon branches no devolvió un resultado utilizable en esta sesión; no se infiere el número actual de ramas ni se crea una rama por rutina.
- La base efímera de CI es suficiente para la siguiente migración y permite reconstrucción determinista sin consumir ramas Neon.
