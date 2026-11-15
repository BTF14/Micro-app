# Fase C — Transferencias inter-sucursal

- **Estado:** BACKLOG POST-v1.1 — diseño preservado, no implementado.
- **Origen:** extracción selectiva del diseño de Fase C en `docs/sdd/PHASE_B_BRANCH_INVENTORY_SCOPE.md`, PR #193 HEAD `ac57ab4f3415f82279b8a49c0befe09f8e3aec68`.
- **Alcance:** transferencias entre sucursales, dos etapas (despacho y recepción), mercancía en tránsito, discrepancias y autorización independiente de origen/destino.
- **No autoriza:** endpoints, migraciones, SQL, código de aplicación, cambios de permisos productivos ni activación.

## 1. Decisiones de negocio vinculantes

1. Cada sucursal mantiene existencias independientes.
2. La transferencia tiene dos momentos: despacho desde origen y recepción en destino.
3. El despacho reduce el stock del origen; no acredita automáticamente stock disponible en destino.
4. La mercancía permanece representada como tránsito hasta la recepción real.
5. El sistema conserva cantidad enviada, cantidad recibida y diferencia; nunca elimina discrepancias mediante ajuste automático.
6. Los permisos de origen y destino se verifican independientemente para cada acción.
7. Los movimientos son la fuente de verdad y las correcciones se registran mediante movimientos explícitos y auditados, nunca borrando o reescribiendo historia.

## 2. Modelo de estados propuesto

| Estado | Transición | Efecto de inventario |
|---|---|---|
| `draft` | Estado inicial | Ninguno |
| `dispatched` | `draft → dispatched` | Movimiento de salida en almacén de origen; decrementa origen |
| `received` | `dispatched → received`, cantidades iguales | Movimiento de entrada en destino por la cantidad recibida |
| `received_with_discrepancy` | `dispatched → received_with_discrepancy`, cantidades distintas | Entrada en destino por cantidad realmente recibida; diferencia permanece visible y abierta |
| `cancelled` | Solo `draft → cancelled` | Ninguno; después del despacho no se cancela ni revierte silenciosamente |

No existe transición directa `draft → received`: el despacho es obligatorio. Una recepción parcial se representa como `received_with_discrepancy`, no como estado duplicado.

## 3. Resolución de discrepancias

- No crear movimiento de ajuste automático para cuadrar enviado y recibido.
- Registrar entrada en destino por cantidad física realmente recibida.
- Mantener calculada y visible la diferencia (enviado − recibido) y estado de discrepancia sin resolver.
- Cerrar discrepancia solo mediante acción humana explícita, con permiso de ajuste de inventario, motivo obligatorio, actor y timestamp del servidor; la resolución produce movimiento manual auditable cuando corresponda.
- La transferencia no se autocierra ni se oculta mientras exista discrepancia pendiente.

## 4. Seguridad y aislamiento multi-tenant

- Comprobar en servidor organización, sucursal, almacén y asignación activa del actor en cada etapa.
- Despacho exige permiso sobre sucursal/almacén de origen; recepción exige permiso independiente sobre destino. No inferir autorización de origen a destino.
- Denegar por defecto y fallar cerrado ante membresía revocada, almacén inactivo, transferencia ajena o alcance ambiguo.
- Toda consulta y mutación debe incluir tenant scope; FKs compuestas y restricciones DB son defensa adicional, no sustituyen autorización.
- Auditoría append-only de creación, despacho, recepción, discrepancia y resolución; actor/rol efectivo, origen/destino, cantidades, motivo y timestamp UTC generados por servidor.
- Aplicar idempotencia persistente y concurrencia transaccional; evitar doble despacho/recepción y movimientos duplicados.

## 5. Modelo de datos y dependencias

Diseñar `inventory_transfers` y sus líneas con organización, sucursales/almacenes origen y destino, estado, actor/fechas de despacho y recepción, cantidad enviada/recibida y referencia tipada `transfer_id` desde movimientos. Nombres finales, constraints, índices, reglas de unicidad y estrategia de locks quedan para el SDD de implementación post-v1.1; este documento no fija una migración concreta.

La transferencia requiere que inventario por sucursal, saldos y ledger ya estén operativos. La referencia tipada relaciona movimientos de salida/entrada con el documento de transferencia sin una referencia polimórfica sin FK.

## 6. Pruebas de aceptación futuras

- PostgreSQL 18 efímero: despacho, recepción completa, parcial y con exceso; discrepancia no se autoajusta.
- Permisos independientes: actor autorizado solo en origen no puede recibir en destino; actor solo en destino no puede despachar; cross-tenant/cross-branch denegado.
- Concurrencia: doble despacho/recepción simultánea produce exactamente un efecto; rollback atómico si falla auditoría o movimiento.
- Idempotencia persistente por organización/alcance; reintento igual devuelve resultado previo y payload distinto con misma clave devuelve 409.
- Inmutabilidad de movimientos y auditoría; discrepancia permanece hasta resolución explícita.
- UI muestra tránsito, enviado, recibido, diferencia y estado pendiente sin ocultar mercancía faltante.

## 7. Dependencias y estado

- **Backlog post-v1.1.** No iniciar mientras el freeze v1.1 siga vigente.
- Antes de implementar: SDD detallado, permisos de doble sucursal revisados, diseño de locks, constraints/FKs, idempotencia, pruebas de seguridad y CI exact-HEAD.
- Fase B ya está superada/integrada en `main` mediante migraciones `0006`, `0019`, `0025` y PR #350/#352; este documento conserva exclusivamente el alcance de Fase C.
- La PR #193 original se cierra sin merge para evitar reintroducir una propuesta de Fase B desactualizada. No se borra su historial.
