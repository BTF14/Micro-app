# Modelo de cajas y turnos — decisión de arquitectura

**Estado:** migración 0004, assertions y pruebas de integración implementadas en la rama `feat/register-shifts-0004-20261030` (PR #167 fusionada en main). No aplicada a Neon main; no equivale a aprobación de la matriz comercial completa.  
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
- Los turnos cerrados son históricos; no se reabren ni se sobrescriben. La migración debe impedir en PostgreSQL UPDATE/DELETE de un turno ya cerrado mediante trigger defensivo (además de los controles de permisos del runtime). Una corrección futura será una acción separada, autorizada y auditada.
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
- Apertura con `opening_cash_usd NUMERIC(14,4)` y `opening_cash_ves NUMERIC(16,2)`, ambos no negativos y con valor inicial cero permitido; `opened_at` usa `timestamptz`.
- Cierre con `closing_cash_usd NUMERIC(14,4)`, `closing_cash_ves NUMERIC(16,2)`, `closed_at` y `closed_by_user_id`; ambos conteos de cierre son obligatorios y no negativos. El cierre se escribe en una sola transición atómica o el turno permanece abierto.
- USD y VES se guardan por separado porque el esquema de pagos admite ambas monedas. No usar un campo genérico sin moneda ni sumar importes de monedas distintas.
- En la política base, `closed_by_user_id` debe ser el mismo cajero responsable. No se habilita cierre por supervisor; cualquier excepción futura requiere permiso separado, motivo y auditoría aprobados.
- FK compuestas para evitar mezclar organizaciones, sucursales, cajas, miembros y asignaciones.
- Índice único parcial: como máximo un turno abierto por caja.
- Índice único parcial: como máximo un turno abierto por cajero dentro de la organización.
- El estado se deriva de `closed_at IS NULL` (abierto) o `closed_at IS NOT NULL` (cerrado); no duplicar estado en una columna adicional.
- Checks para importes no negativos, campos de cierre completos/incompletos y `closed_at >= opened_at`.
- Índices parciales únicos para un turno abierto por caja y por cajero/organización; estos son la defensa final ante aperturas concurrentes. Índice parcial adicional por `cashier_user_id` soporta el guard de desactivación de usuario que consulta turnos abiertos a través de todas sus organizaciones.
- Trigger de ciclo de vida: no permitir editar datos de identidad/apertura de un turno abierto; solo una transición de cierre completa; no permitir UPDATE/DELETE de turnos cerrados ni DELETE de turnos abiertos.
- Impedir desactivar una caja, sucursal, organización, usuario, membresía o asignación de sucursal mientras tenga turnos abiertos.
- No almacenar aquí pagos, ventas, movimientos de efectivo ni saldo esperado/diferencia calculada sin un ledger de caja definido. Los conteos USD/VES son efectivo físico contado, no saldo esperado.

## 3. Reglas de aplicación futuras

1. Abrir: validar sesión, tenant, branch context, rol cashier, asignación activa, caja activa y ausencia de turno abierto del cajero/caja; insertar apertura en transacción.
2. Operar: cada operación de caja debe comprobar en servidor el turno abierto, cajero autenticado y caja/sucursal correctas dentro de la misma transacción que la operación financiera.
3. Cerrar: capturar conteo real separado en USD y VES, registrar actor y hora; no calcular diferencia contra un efectivo esperado hasta que exista un ledger de caja completo. Bloquear modificaciones posteriores.
4. Cambio de cajero: cerrar el turno actual; abrir uno nuevo para el siguiente cajero. Si el cierre falla, no abrir el siguiente turno.
5. Concurrencia: índices únicos parciales son la última defensa; la API debe manejar conflictos sin crear duplicados ni filtrar detalles internos.
6. Desactivación: no permitir desactivar caja, sucursal u organización, ni revocar asignación/membresía o desactivar usuario mientras exista un turno abierto.

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
- Rechazar apertura/cierre con importes USD/VES negativos y estados/campos inconsistentes.
- Rechazar cierre incompleto y conservar abierto el turno si la transacción de cierre falla.
- Rechazar cambiar cajero, caja, sucursal, organización, hora o conteos de apertura de un turno abierto.
- Verificar que triggers PostgreSQL impiden UPDATE/DELETE de un turno cerrado y DELETE de uno abierto, incluso si el caller intenta limpiar `closed_at` o cambiar el cajero/caja.
- Rechazar desactivar caja, sucursal, organización, usuario, membresía o asignación mientras exista un turno abierto; permitirlo tras el cierre.
- Tests de integración del resolver: usuario no asignado, asignación inactiva, rol cambiado, caja inactiva, turno cerrado, turno de otro cajero, cross-tenant/cross-branch.
- Tests de concurrencia: dos aperturas simultáneas para misma caja y para mismo cajero deben producir un único turno abierto.
- Assertions SQL ejecutadas dentro de una transacción con ROLLBACK. Las pruebas de integración usan identificadores aleatorios en la base PostgreSQL efímera de CI; el job destruye la base al finalizar. Nunca Neon main ni datos reales.

## 6. Secuencia de implementación

1. **Hecho en PR #167:** migración aditiva 0004 y assertions SQL.
2. **Hecho en PR #167:** workflows CI/migration-check aplican 0001–0004 desde cero en PostgreSQL 18 efímero.
3. **Hecho en PR #167:** tests de integración para scope, lifecycle, desactivación y concurrencia. El helper de turno/runtime y los endpoints quedan fuera de esta fase.
4. Corregir cualquier fallo, revisar diff completo y verificar todos los checks sobre el SHA exacto final.
5. No aplicar 0004 a Neon main ni conectar rutas comerciales en esta fase.

## 7. Estado actual de infraestructura de pruebas

- PR #165 demuestra que CI aplica 0001–0003 y ejecuta integración branch-context contra PostgreSQL 18 efímero.
- PR #167 fusionó 0004 y sus assertions; 10/10 workflows Actions pasaron en HEAD `ad45911368e9e9a714ebbe014de2d84a7b3cf1de`.
- En el HEAD anterior `0b5a9adbdafce25a8483e7ce6953e2d83a826c47`, CI falló solo en una expectativa de código de error del test de integración; build/typecheck, unit tests, auth integration y branch integration pasaron. Se corrigió el trigger para dejar que las FKs respondan por referencias ausentes; CI se está reejecutando en el HEAD 4008.
- No se aplicó 0003 ni 0004 a Neon main. La herramienta de lectura de Neon branches no devolvió un resultado utilizable; no inferir el número actual ni crear una rama por rutina.
- PostgreSQL efímero de CI es suficiente para la migración y evita consumir ramas Neon.
