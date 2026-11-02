# Matriz de decisiones de arquitectura: inventario por sucursal

- Estado: análisis técnico y recomendaciones; **no es aprobación de producto ni autorización de implementación**
- Rama: `pilot/speckit-inventory`
- Fecha: 2026-11-02
- Alcance: arquitectura de datos y operaciones de inventario por sucursal/almacén
- Base documental del piloto: discovery de código `b256c1c3e51a145e5af62fbcbdfb830a4368884c`; rama piloto creada desde `88213507d088b82ea9231bbc72f49afade7ec99b`
- Estado vivo consultado durante esta revisión: `main` = `c7bd0a198c30d190586aa6acd207d954f41ff7c9`; piloto = `87049399ec458406b6d7c481d928c9b7cdc3569`

> Esta matriz separa: (1) hechos ya implementados, (2) decisiones aprobadas por el propietario, (3) recomendaciones técnicas derivadas de las reglas vigentes y (4) decisiones de producto aún abiertas. Una recomendación técnica no se convierte en requisito aprobado por aparecer aquí.

## 1. Resumen ejecutivo

El código inspeccionado no implementa inventario operativo por sucursal. El esquema inicial contiene `products.stock_quantity` y `inventory_movements` a nivel organización; la tabla de movimientos existente no identifica almacén. Las migraciones 0003/0004 añaden sucursales/asignaciones y cajas/turnos, pero no almacenes ni saldos por almacén. No se encontraron handlers comerciales de inventario conectados a la API.

La dirección técnica más coherente con el modelo relacional actual es:

1. Catálogo de productos compartido por organización.
2. Almacenes pertenecientes a una sucursal y a la misma organización.
3. Saldo por organización + almacén + producto.
4. Libro de movimientos inmutable como historial de hechos; saldo como proyección transaccional y reconciliable.
5. Movimiento, saldo e idempotencia confirmados en una misma transacción PostgreSQL.
6. Integridad tenant-scoped en base de datos y autorización server-side.
7. Transición aditiva desde el stock legado; ninguna distribución histórica inventada.

Esta dirección permite avanzar en diseño técnico, pero **no resuelve** las decisiones de negocio sobre coste, reservas, transferencias en tránsito, origen de movimientos, almacén de venta ni política de migración del stock físico existente.

## 2. Estados y autoridad

| Estado | Significado |
|---|---|
| Implementado | Evidencia en código/migración existente; no inferir comportamiento adicional |
| Aprobado | Decisión explícita ya registrada por el propietario |
| Recomendación técnica | Propuesta fundamentada que requiere revisión; no es decisión de producto |
| Pendiente de negocio | Requiere una decisión del propietario/negocio |
| Bloqueado | No se debe cerrar el diseño o implementar el punto hasta resolver su dependencia |

Fuentes de autoridad:
- `docs/CONSTITUTION.md`: reglas de tenant, seguridad, transacciones, stock negativo, coste $0 y límites de producción.
- `docs/sdd/role-permission-decision-matrix.md`: matriz de permisos comerciales **APROBADA el 2026-10-31**.
- `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`: ERD conceptual y dirección técnica; contiene una nota de aprobación de permisos desactualizada que contradice la matriz aprobada.
- `docs/sdd/INVENTORY_BRANCH_CODE_DISCOVERY.md`: evidencia estática del código inspeccionado.
- `docs/specs/inventory-by-branch/spec.md`: alcance y criterios preliminares, aún no aprobados para implementación.

### Discrepancia documental que debe corregirse en la fuente canónica

En `main` (HEAD verificado `c7bd0a198c30d190586aa6acd207d954f41ff7c9` el 2026-11-02), `docs/sdd/MULTI_BRANCH_DATA_MODEL.md` todavía afirma en §1 y en la sección de membresía que la matriz está NO APROBADA. Eso contradice `docs/sdd/role-permission-decision-matrix.md` (APROBADA el 2026-10-31) y `docs/CURRENT_STATE.md` en ese mismo HEAD, que registra la aprobación y la corrección de caja de PR #187. La copia de `MULTI_BRANCH_DATA_MODEL.md` en este piloto ya contiene el estado correcto; es una propuesta de corrección para la fuente canónica, no un cambio aplicado a `main`. También se detectó una referencia obsoleta en `docs/sdd/REGISTER_SHIFT_MODEL.md` §4 que sigue diciendo que la matriz está NO APROBADA. Ambas correcciones quedan confinadas a esta rama piloto; no se abrió PR ni se sincronizó/rebasó la rama.

La aprobación de permisos no significa que existan endpoints, middleware, pruebas o inventario por sucursal implementados.

## 3. Matriz de decisiones

| Tema | Hecho / decisión vigente | Recomendación técnica | Pendiente de negocio / bloqueo |
|---|---|---|---|
| Identidad del stock | Hoy `products.stock_quantity` es organizacional. El ERD objetivo ya propone stock por almacén. | Modelar saldo con clave lógica `(organization_id, warehouse_id, product_id)`, con unicidad para un saldo por producto y almacén. No duplicar el producto por sucursal. | Confirmar si el MVP requiere múltiples almacenes por sucursal o exactamente uno predeterminado. La recomendación no fija esa cardinalidad comercial. |
| Relación almacén-sucursal | Existen `branches`; no existe tabla `warehouses`. El ERD objetivo sitúa almacenes bajo sucursales. | Cada almacén pertenece a una sucursal de la misma organización; incluir claves compuestas para que no pueda apuntar a una sucursal de otro tenant. | Definir si se permiten almacenes inactivos, archivados, temporales o compartidos físicamente; un almacén no debe pertenecer a dos sucursales sin un nuevo diseño. |
| Balances y ledger | Existe `inventory_movements` organizacional sin almacén. No existe `inventory_balances`. | Tratar movimientos confirmados como historial de hechos y balances como proyección/materialized state para lecturas rápidas. Actualizar ambos en una transacción; ofrecer una reconciliación que reconstruya/compare el saldo. | Definir qué cantidades se almacenan (físico, reservado, disponible, comprometido) según la decisión sobre reservas. |
| Atomicidad | La API tiene un helper genérico de transacciones; no hay operaciones comerciales de inventario conectadas. La Constitución exige operaciones de stock transaccionales. | Insertar movimiento, actualizar balance, registrar idempotencia y confirmar el documento de origen en una única transacción. Cualquier fallo debe revertirlo todo. | Definir límites transaccionales de recepciones, ventas, devoluciones y transferencias parciales; no confirmar estados intermedios ambiguos. |
| Stock negativo y concurrencia | La Constitución exige evitar stock negativo en base de datos/transacción. | Usar actualización condicional atómica (por ejemplo, decrementar solo si la cantidad disponible cubre la salida) o bloqueo de fila con comprobación dentro de la misma transacción. Nunca usar leer-modificar-escribir sin protección. Añadir constraint defensivo donde sea viable. | Definir si se permite backorder/venta sin stock. Hasta que exista aprobación expresa, el diseño debe denegar salidas que produzcan disponible negativo. |
| Idempotencia | La arquitectura del proyecto exige operaciones mutantes idempotentes; no hay idempotencia comercial de inventario implementada. | Clave idempotente única dentro del tenant y tipo de operación; guardar hash canónico del payload y resultado/referencia. Misma clave + mismo payload devuelve el resultado original; misma clave + payload distinto devuelve conflicto. La reserva de clave y el efecto ocurren en la misma transacción. | Definir retención/expiración de claves solo si existe una necesidad operativa concreta. No usar una caché externa para resolverlo en la primera versión. |
| Tenant y claves foráneas | El proyecto usa `organization_id` como frontera; branches y memberships ya usan relaciones tenant-scoped. | Toda entidad nueva debe incluir `organization_id`. Crear UNIQUE/FK compuestas para almacén→sucursal, balance→almacén/producto, movimiento→almacén/producto y documentos→líneas. Las relaciones entre origen/destino deben demostrar que ambos almacenes pertenecen a la misma organización. | Revisar el DDL final para garantizar que ninguna FK simple permita enlazar IDs de otro tenant. No basta con validar solo en la API. |
| Roles y membresía | La matriz de permisos está aprobada. Hay un rol único por miembro/organización; `branch_memberships` solo da alcance, no roles por sucursal. | Aplicar exactamente la matriz: Owner/Admin con alcance organizacional; Inventory con acceso a sucursales asignadas; Cashier solo lectura de existencias/movimientos en sucursal. Comprobar rol y membresía activa en servidor para cada operación. Denegar por defecto y respetar revocación en la siguiente solicitud. | No crear roles por sucursal ni cambiar las facultades aprobadas. La aprobación documental no sustituye middleware, auditoría ni pruebas cross-tenant/rol. |
| Auditoría | La matriz exige auditoría para escrituras de inventario antes de exponerlas en producción; el log de auditoría comercial aún no está implementado. | Registrar actor, organización, sucursal, almacén, operación, motivo, fecha, referencia e idempotency key. Los hechos confirmados se corrigen mediante compensaciones, no edición silenciosa. | Definir política de retención y acceso al log en la fuente canónica de auditoría; el rol Inventory no obtiene acceso general al log de auditoría. |
| Venta y consumo de stock | La matriz permite crear ventas a Owner/Admin/Cashier bajo sus reglas de turno; el esquema actual de ventas no guarda almacén en las líneas. | La venta debe tener sucursal y cada consumo debe referenciar un almacén concreto. Venta, líneas, pagos, movimientos y balance deben ser atómicos o tener una saga transaccional explícitamente diseñada; no descontar stock desde el frontend. | **Bloqueo:** decidir si la venta usa almacén predeterminado de sucursal, selección explícita por venta o selección por línea. Definir tratamiento de venta sin caja/turno y si una venta puede consumir varios almacenes. |
| Compras y recepciones | La matriz autoriza recepción por Owner/Admin a nivel organización e Inventory en sucursal asignada; el flujo operativo de compras/recepciones no está implementado. | Separar orden de compra (si existe) de recepción física. La recepción confirmada debe tener documento y líneas, almacén destino, cantidades aceptadas/rechazadas y movimientos enlazados. Permitir recepción parcial solo con estados inequívocos. | **Bloqueo:** decidir si la primera versión incluye órdenes de compra/proveedores o solo recepción directa; definir recepción parcial, duplicados, cancelación, devoluciones a proveedor y quién confirma diferencias. |
| Transferencias | La matriz autoriza transferencias a Inventory con membresía activa en origen y destino; el ERD propone dos movimientos relacionados. | Modelar una operación de transferencia con origen, destino y líneas. Cada salida/entrada debe ser trazable y compensable; nunca editar saldos directamente. | **Bloqueo:** elegir transferencia instantánea o estados en tránsito. Definir cuándo se descuenta origen, cuándo se acredita destino, quién recibe, diferencias/mermas en tránsito, cancelación y reversos. La matriz de permisos no resuelve esta semántica. |
| Referencias de origen | La tabla actual usa referencia libre; el ERD requiere trazabilidad y la spec deja abierta FK tipada vs documento común. | Preferir FKs tipadas cuando el conjunto de documentos sea pequeño y estable; considerar un documento operativo común solo si evita una proliferación real y mantiene FKs/constraints verificables. Evitar `source_type + source_id` polimórfico sin integridad referencial. | Decidir después de cerrar qué documentos existen en MVP (venta, recepción, ajuste, transferencia, devolución). |
| Devoluciones y reversos | La matriz define quién puede anular/devolver ventas; los tipos actuales incluyen `return` y `void_reversal`, pero no hay flujo operativo. | Una devolución/anulación debe crear movimientos compensatorios vinculados al movimiento/venta original y no borrar hechos confirmados. La cantidad devuelta no puede superar la cantidad neta vendida menos devoluciones previas. | Definir devolución parcial, destino físico de lo devuelto (reintegrable, dañado, cuarentena), autorización para reintegrar stock y manejo de devoluciones de ventas históricas sin almacén. |
| Valoración y coste | La matriz reserva lectura/edición de coste a Owner/Admin; el ERD propone snapshot de coste en movimientos. | Separar cantidad física de valoración financiera. Guardar snapshot de coste y moneda/base de cálculo en el hecho, sin recalcular el pasado al cambiar el coste del producto. | **Bloqueo financiero:** elegir método de valoración (p. ej. promedio ponderado, FIFO o coste estándar), momento de reconocimiento, tratamiento de devoluciones, transferencias y ajustes. No asumir un método por conveniencia técnica. |
| Reservas y disponibilidad | El ERD conceptual menciona cantidad disponible y reservada; la spec deja reservas como pregunta abierta. | Si se aprueban reservas, mantener `on_hand`, `reserved` y `available = on_hand - reserved` con invariantes y operaciones transaccionales explícitas. Si no son necesarias para MVP, no introducirlas de forma preventiva. | **Bloqueo de alcance:** confirmar si existen pedidos/preventas/reservas que aparten stock en la primera versión. No confundir reservado con físicamente existente. |
| Stock inicial y backfill | El stock legado es organizacional; los movimientos históricos no tienen almacén. No hay evidencia que asigne cada unidad histórica a una sucursal/almacén. | No distribuir automáticamente `products.stock_quantity` ni movimientos históricos entre almacenes. Obtener conteo físico inicial por almacén, registrar apertura con evidencia/actor/fecha y conciliar el total con el legado. Marcar el historial antiguo como legado no asignado; no reescribirlo inventando ubicación. | **Bloqueo crítico de migración:** el negocio debe proporcionar inventario físico por almacén y aprobar tratamiento de diferencias. Sin evidencia física, no existe backfill correcto por sucursal. |
| Campo legado `products.stock_quantity` | Existe y hoy representa stock organizacional; eliminarlo ahora perdería compatibilidad/datos. | Mantenerlo durante fase aditiva. Definir una única fuente de escritura durante transición; evitar doble escritura no atómica. Cambiar lecturas a balances solo tras backfill y reconciliación aprobados. Marcarlo deprecated antes de eliminarlo en una migración posterior. | Definir cutover, ventana de observación, rollback y criterio para dejar de leer/escribir el campo. No eliminarlo ni dejar de sincronizarlo sin aprobación y evidencia. |
| Reconciliación y rollback | No existe reconciliación por almacén implementada. | Crear consulta/proceso determinista que compare ledger vs balance y suma de balances por almacén vs total legado. Si hay diferencias no explicadas, detener cutover; rollback ensayado en PostgreSQL desechable. | Acordar umbral de discrepancia (recomendación: cero diferencias no explicadas) y quién firma el conteo inicial/cutover. |

## 4. Decisiones de producto que bloquean el cierre del diseño

Estas decisiones no pueden deducirse del esquema ni de la matriz de permisos:

1. **Almacenes:** ¿uno o varios por sucursal? ¿Se necesita almacén predeterminado?
2. **Ventas:** ¿qué almacén descuenta stock: predeterminado, selección explícita o por línea? ¿Se permite venta multi-almacén?
3. **Compras:** ¿MVP incluye órdenes de compra o solo recepción física? ¿Se aceptan recepciones parciales?
4. **Transferencias:** ¿instantáneas o en tránsito? ¿Cuándo se acredita destino? ¿Cómo se resuelven pérdidas/diferencias y cancelaciones?
5. **Devoluciones:** ¿qué destino recibe lo devuelto y bajo qué condición vuelve a disponible?
6. **Valoración:** ¿promedio ponderado, FIFO, coste estándar u otro método? ¿Qué snapshots son obligatorios?
7. **Reservas:** ¿son necesarias en la primera versión? ¿Qué estados de pedido reservan/liberan stock?
8. **Apertura inicial:** ¿quién realizará y aprobará el conteo físico por almacén? ¿Cómo se documentan diferencias contra el legado?
9. **Referencias:** ¿qué documentos operativos entran en la primera versión y cuál es su ciclo de vida?

La decisión sobre transferencias no debe confundirse con la autorización: la matriz ya autoriza quién puede transferir, pero no define cuándo el stock se considera en tránsito o disponible en destino.

## 5. Decisiones técnicas recomendadas que pueden prepararse sin inventar reglas de negocio

Se puede continuar el diseño técnico de:
- DDL tenant-scoped con claves compuestas y unicidad.
- Contratos transaccionales y manejo de errores.
- Idempotencia con clave + hash de payload.
- Estrategia de concurrencia mediante update condicional/row lock.
- Modelo de ledger y proyección de balances, manteniendo reversos.
- Suite de pruebas de tenant, rol, membresía, concurrencia, rollback e idempotencia.
- Reconciliación y observabilidad de discrepancias.

No se debe finalizar DDL ni tareas de implementación que dependan de las decisiones de §4. Los nombres de tablas, columnas, índices, estados y tipos de movimiento siguen sujetos a revisión del modelo final.

## 6. Gates antes de implementación

1. Resolver las decisiones de producto de §4 y registrar aprobación explícita.
2. Corregir la contradicción de estado de aprobación en `docs/sdd/MULTI_BRANCH_DATA_MODEL.md` de la rama canónica mediante el flujo de revisión correspondiente.
3. Actualizar discovery si cambió el SHA de código relevante; el discovery existente es estático y pertenece al snapshot documentado.
4. Aprobar spec y plan; esta matriz no los aprueba.
5. Revisar DDL y contratos con FKs compuestas, constraints, índices, estados, idempotencia y transacciones.
6. Especificar y ejecutar pruebas con PostgreSQL desechable: cross-tenant, rol, membresía revocada, saldo insuficiente concurrente, atomicidad, repetición idempotente, reversos, transferencia y reconciliación.
7. Definir backfill desde conteos físicos verificables, rollback y cutover; no usar Neon `main` como laboratorio.
8. Confirmar presupuesto $0, revisar seguridad y obtener gate explícito antes de cualquier implementación que afecte datos reales/producción.

## 7. Evidencia consultada y límites

- `docs/CONSTITUTION.md` en main: tenant boundary, autorización server-side, transacciones, stock negativo, coste $0 y aprobación para cambios sensibles.
- `docs/sdd/role-permission-decision-matrix.md` en main: estado APROBADA 2026-10-31, roles organizacionales y permisos de lectura/recepción/ajuste/transferencia.
- `docs/sdd/MULTI_BRANCH_DATA_MODEL.md` en main: ERD conceptual, almacenes por sucursal, balances por almacén, ledger y relaciones tenant-scoped; contiene la contradicción documental descrita en §2.
- `docs/sdd/INVENTORY_BRANCH_CODE_DISCOVERY.md` en piloto: revisión estática del snapshot `b256c1c3e51a145e5af62fbcbdfb830a4368884c`.
- `docs/specs/inventory-by-branch/spec.md`, `plan.md`, `tasks.md` en piloto: artefactos preliminares y bloqueos ya identificados.

No se ejecutaron pruebas, migraciones, Spec Kit CLI ni código funcional para crear esta matriz. No se consultó ni modificó Neon, Cloudflare, datos reales o producción. La rama piloto estaba divergente respecto de main al momento de redactar este documento; no se incorporaron automáticamente los commits de main.


## 8. Auditoría documental posterior — 2026-11-02

### Estado GitHub y límites de esta revisión

- `main` verificado: `c7bd0a198c30d190586aa6acd207d954f41ff7c9`.
- `pilot/speckit-inventory` verificado: `87049399ec458406b6d7c481d928c9b7cdc3569d`; su padre inmediato es `ea89d1f304e2ee5967bb6cc96259a3402134ed6d`.
- PR #190 está abierta como Draft y corresponde a una lectura de catálogo; no está fusionada en `main` y no se incorpora a este piloto. No es evidencia de inventario por sucursal.
- No se sincronizó ni rebasó el piloto con `main`. No se abrió PR, no se implementó código y no se ejecutó Spec Kit.

### Resultado de la auditoría Copilot

La revisión documental del SHA `87049399ec458406b6d7c481d928c9b7cdc3569d` es una fuente auxiliar, no una autoridad. Sus nueve decisiones de producto abiertas siguen sin respuesta y no se deben cerrar por inferencia. Sus cinco prioridades se convierten en este orden de trabajo: (1) corregir referencias canónicas obsoletas en la rama piloto como propuesta, (2) actualizar el discovery con un snapshot vivo claramente identificado, (3) registrar preguntas de negocio y sus impactos para decisión del propietario, (4) convertir criterios de aceptación en resultados observables, y (5) preparar contratos técnicos y pruebas sin fijar reglas de negocio pendientes.

### Decisiones de negocio: bloqueos explícitos

Las nueve preguntas de §4 son de autoridad del propietario. Hasta recibir decisiones expresas:
- no fijar cardinalidad de almacenes ni almacén predeterminado;
- no elegir estrategia de consumo de stock por venta;
- no ampliar MVP a órdenes de compra ni decidir recepción parcial;
- no fijar estados/semántica de tránsito y recepción de transferencias;
- no decidir reintegro físico de devoluciones;
- no elegir método de valoración/coste;
- no introducir reservas;
- no inventar cantidades o ubicaciones de stock inicial;
- no cerrar el conjunto de documentos operativos ni el ciclo de vida.

La recomendación técnica puede definir integridad, atomicidad, idempotencia, concurrencia y pruebas negativas; no puede seleccionar los resultados comerciales anteriores.

### Gate de salida de esta fase documental

La fase documental solo podrá proponerse como lista para revisión cuando: la matriz aprobada sea la única autoridad de permisos; los snapshots y límites del discovery estén explícitos; las decisiones de negocio estén respondidas o excluidas formalmente del MVP; cada criterio tenga resultado esperado y prueba; y el diff completo siga siendo documental. La aprobación de esta fase no autoriza implementación, migraciones, acceso a datos reales, PR ni despliegue.
