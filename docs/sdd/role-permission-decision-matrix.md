# Registro de decisión: permisos por rol y organización

- Estado: **propuesta de IA, pendiente de aprobación explícita del propietario**. Ninguna celda de este documento autoriza una implementación por sí sola; ver `## Estado` al final.
- Fecha de la propuesta: 2026-10-28 (reemplaza la matriz vacía del 2026-10-18).
- Riesgo: alto; afecta aislamiento multiempresa, datos financieros y operaciones de inventario.
- Roles que aparecen en el modelo actual: `owner`, `admin`, `cashier`, `inventory`.
- Fuente relacionada: `docs/CONSTITUTION.md`, sección 4; `docs/PRODUCTION_READINESS.md`; matriz de aceptación de aislamiento multiempresa; `docs/SECURITY_ROADMAP.md` Nivel 2, punto 5.

## Propósito y límites

Este documento recopila las decisiones necesarias antes de exponer rutas comerciales. **No cambia permisos ni autoriza una implementación por sí mismo.** Cada celda de abajo es una recomendación razonada, no una decisión ya tomada: el propietario debe revisarlas, corregir lo que no le sirva y marcar el documento como aprobado (ver `## Estado`) antes de que ninguna ruta de negocio se implemente apoyándose en esta matriz.

Hasta que se apruebe una política, no se debe inferir autorización de la interfaz, del ID enviado por el cliente, de que el usuario pertenezca a alguna organización, ni de un nombre de rol sin una regla explícita. Las futuras rutas deben denegar por defecto y validar la pertenencia a la organización en el servidor.

## Matriz por área

Valores: **Permitir**, **Denegar**, o **Permitir con condiciones** (ver columna de condiciones). Lectura y escritura se separan explícitamente cuando una operación cubre ambas.

| Área / operación | owner | admin | cashier | inventory | Condiciones / alcance |
|---|---|---|---|---|---|
| Ver catálogo y categorías (lectura) | Permitir | Permitir | Permitir | Permitir | Toda la organización; no hay razón de negocio para ocultar el catálogo a ningún rol interno. |
| Crear/editar/archivar productos | Permitir | Permitir | Denegar | Permitir con condiciones | `inventory` puede crear/editar SKU, descripción, stock mínimo y categoría, pero **no** el precio de venta ni el costo — esos campos quedan reservados a `owner`/`admin`. Archivar un producto (no borrar) requiere `owner`/`admin`. |
| Ver proveedores (lectura) | Permitir | Permitir | Denegar | Permitir | `cashier` no necesita datos de proveedores para vender. |
| Crear/editar proveedores | Permitir | Permitir | Denegar | Denegar | Relación comercial/financiera con terceros; se deja fuera de `inventory` para no mezclar "quién mueve stock" con "quién negocia condiciones de compra". |
| Registrar compras/recepciones | Permitir | Permitir | Denegar | Permitir con condiciones | `inventory` puede recibir mercancía y actualizar existencias; el costo unitario registrado en la compra es visible para `inventory` (lo necesita para el movimiento) pero no editable salvo por `owner`/`admin` una vez confirmada. |
| Consultar existencias y movimientos (lectura) | Permitir | Permitir | Permitir con condiciones | Permitir | `cashier` ve solo disponibilidad/stock (para saber si puede vender), no el historial completo de movimientos ni costos. |
| Ajustar inventario manualmente | Permitir | Permitir | Denegar | Permitir con condiciones | Motivo obligatorio en texto libre + categoría (merma, conteo, daño, corrección) en todos los casos; cada ajuste genera entrada de auditoría con usuario, fecha, cantidad anterior/nueva. `inventory` puede ajustar; ajustes por encima de un umbral a definir por el propietario requieren además confirmación de `owner`/`admin`. |
| Abrir/cerrar caja | Permitir | Permitir | Permitir con condiciones | Denegar | `cashier` abre/cierra únicamente la caja que tiene asignada en el turno actual; no puede cerrar una caja ajena. El modelo de datos de caja/turno/sucursal no existe todavía — ver decisión global 1. |
| Crear ventas | Permitir | Permitir | Permitir con condiciones | Denegar | `cashier` solo con caja abierta propia. Descuentos: hasta un porcentaje/monto máximo a definir por el propietario sin aprobación adicional; por encima de ese límite requiere autorización de `owner`/`admin` registrada (no solo verbal). Precio fuera de catálogo: denegado para `cashier`, permitido para `owner`/`admin` con motivo obligatorio. |
| Anular/devolver ventas | Permitir | Permitir | Denegar | Denegar | Reverso contable auditable (nunca borrar el hecho original); se reserva a `owner`/`admin` para evitar que quien registra la venta también pueda anularla sin control cruzado. Si el propietario quiere que `cashier` pueda anular ventas del mismo turno antes del cierre de caja, es una excepción a decidir explícitamente, no el valor por defecto. |
| Registrar/ver pagos y cambios | Permitir | Permitir | Permitir con condiciones | Denegar | `cashier` registra pagos/cambio solo de sus propias ventas en el turno abierto; no ve el historial de pagos de otros cajeros ni totales acumulados de caja ajena. |
| Consultar reportes/exportar datos | Permitir | Permitir | Denegar | Permitir con condiciones | `inventory` puede ver/exportar reportes de existencias y movimientos, no reportes de ventas/ingresos. Exportación de datos personales de clientes (si llegan a existir) queda fuera de todos los roles hasta que haya una decisión de privacidad explícita. |
| Gestionar usuarios e invitaciones | Permitir | Permitir con condiciones | Denegar | Denegar | `admin` puede invitar/desactivar `cashier`/`inventory`, no puede invitar ni desactivar a otro `admin` ni a `owner` — evita escalamiento lateral. Invitar, desactivar y revocar sesiones son tres acciones separadas en la implementación, cada una auditada. |
| Asignar/cambiar roles | Permitir | Permitir con condiciones | Denegar | Denegar | `admin` puede asignar `cashier`/`inventory`, nunca `owner` ni `admin`. Regla dura en servidor: nunca permitir que la organización quede sin ningún `owner` activo (bloquear la operación que dejaría el conteo en cero, no solo advertir). |
| Configurar organización/sucursal | Permitir | Permitir con condiciones | Denegar | Denegar | `admin` puede editar datos operativos (nombre visible, sucursales, horarios); cambios que afectan facturación, identidad legal o eliminar la organización quedan reservados a `owner`. |
| Ver auditoría | Permitir | Permitir | Denegar | Denegar | Acceso a registros de acciones de otros usuarios es información sensible de control interno; se reserva a quienes pueden actuar sobre todo el negocio. |
| Gestionar allowlist e identidad | Permitir | Denegar | Denegar | Denegar | Bloqueado también por decisiones D1–D8 de identidad (ya aprobadas, pero el flujo de invitación real — más allá de insertar filas a mano en Neon — todavía no existe). Se recomienda reservarlo a `owner` inicialmente y revisar si delegarlo a `admin` más adelante, una vez exista un flujo de invitación auditable. |

## Decisiones globales que también deben resolverse

Recomendación para cada una; el propietario puede aceptar, ajustar o rechazar:

1. **¿Los roles aplican a toda la organización o por sucursal/caja?** Recomendación: empezar por organización completa (no hay todavía modelo de sucursal/caja en el esquema); introducir alcance por sucursal como una fase posterior si el negocio llega a tener más de un punto de venta. No bloquea el MVP de un solo local.
2. **¿Permisos personalizados o solo estos cuatro roles fijos?** Recomendación: mantener los cuatro roles fijos por ahora. Permisos personalizados añaden superficie de error (una matriz dinámica es más difícil de auditar) y el negocio no los necesita todavía; revisar si aparece un caso de uso real.
3. **¿Quién concede/revoca roles y cómo se evita quitar el acceso al último `owner`?** Recomendación: `owner` y `admin` con el límite de la fila "Asignar/cambiar roles" de arriba; regla dura en base de datos/transacción que impida dejar la organización sin `owner` activo (constraint o verificación transaccional, no solo validación en el cliente).
4. **¿Qué operaciones requieren motivo obligatorio, aprobación adicional o límite monetario?** Recomendación inicial (valores exactos a confirmar por el propietario): ajustes de inventario siempre con motivo; descuentos en venta con un techo porcentual fijo sin aprobación (sugerido: 10%, pero es decisión de negocio del propietario) y cualquier excedente requiere `owner`/`admin`; anulación de venta siempre con motivo y siempre reservada a `owner`/`admin` salvo que el propietario decida la excepción de "mismo turno" mencionada arriba.
5. **¿Qué datos pueden exportarse y qué queda en auditoría?** Recomendación: todo cambio de precio/costo, ajuste de inventario, anulación de venta, cambio de rol y gestión de allowlist queda en auditoría sin excepción. Exportación de reportes financieros reservada a `owner`/`admin`; exportación de reportes de inventario también a `inventory`, como arriba.
6. **¿Cómo se revoca acceso inmediatamente al desactivar un usuario?** Recomendación: desactivar un usuario (`is_active = false` en `app_users` o su membresía) debe invalidar en el mismo paso transaccional todas sus sesiones activas (`auth_sessions`), no solo impedir logins futuros — ya existe precedente de este patrón en `getSessionUser`/`resolveTenantContext`, que ya filtran por `u.is_active`/`m.is_active`; falta el paso explícito de revocar sesiones vigentes en el momento de la desactivación.

## Criterios mínimos de implementación posterior

- Cada operación de lectura/escritura obtiene la organización desde una sesión/membresía validada en servidor, no desde un ID confiado del cliente.
- La consulta SQL limita los registros a esa organización; validar autorización no debe depender solo de UUID difíciles de adivinar.
- Pruebas negativas con usuario sin sesión, membresía inactiva, rol no autorizado, organización ajena y recurso ajeno.
- Pruebas positivas por rol únicamente después de aprobar esta matriz.
- Operaciones de ventas, pagos y stock se implementan con transacciones, idempotencia y auditoría según la Constitución.
- Los resultados de autorización no se consideran probados hasta que existan rutas reales y pruebas de integración contra PostgreSQL de prueba.

## Estado

**No aprobado todavía.** Esta versión reemplaza la matriz vacía del 2026-10-18 con una propuesta completa y razonada, pero sigue siendo una recomendación de IA: no implementar permisos de negocio apoyándose en ella hasta que el propietario la revise y declare explícitamente qué acepta, qué corrige y qué rechaza. La restauración técnica de la copia remota se verificó en el run 40955935124; el gate completo de recuperación aún requiere validar datos/conteos/relaciones, RPO/RTO, alertas y coste. La matriz no aprobada sigue siendo un bloqueo independiente para iniciar el módulo de negocio real (inventario/ventas), junto con las pruebas de autorización cross-tenant que deberán existir al implementar rutas comerciales.
