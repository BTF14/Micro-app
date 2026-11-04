# Contrato transaccional de concurrencia para inventario

**Estado:** contrato técnico aprobado para escritores de existencias/reservas; sin política comercial nueva.  
**Fecha:** 2026-11-04 UTC  
**Alcance:** toda transacción que cambie `on_hand_quantity`, `reserved_quantity`, el ledger de almacén o un documento que confirme esos cambios.  
**No autoriza:** endpoints comerciales, DDL adicional, aplicación de migraciones a Neon, merge ni despliegue.

## 1. Estado observado en el código

En el HEAD de esta revisión, `apps/api/src/index.ts` registra las rutas de auth, catálogo, escritura de catálogo y `inventory-counts.ts`. No registra rutas HTTP de ventas, recepciones, reservas, devoluciones o transferencias. Por tanto, el único escritor de inventario expuesto en esta vertical slice es la confirmación de conteos.

La confirmación de conteo ya abre una transacción, valida sesión/tenant y sucursal, bloquea el almacén con `FOR UPDATE`, bloquea el documento de conteo y luego bloquea balances. El conteo físico bloquea solo los productos incluidos en sus líneas; la apertura consulta/bloquea el conjunto completo para rechazar un almacén que ya tenga cualquier saldo. Actualiza balance, inserta movimientos y registra auditoría en esa misma transacción.

Hallazgo de implementación: después de bloquear en lote todos los balances, el handler volvía a ejecutar un `SELECT ... FOR UPDATE` individual por línea. Era redundante y dejaba dos formas de adquirir los locks de balance dentro del mismo flujo. Se sustituyó por una lectura del conjunto ya bloqueado.

## 2. Orden global obligatorio

Cada escritor debe usar una única conexión y una única transacción PostgreSQL para validación final, documento, balances, ledger y auditoría. El orden de locks es:

1. **Identidad/tenant:** resolver y bloquear sesión, usuario, membresía organizacional y organización dentro de la transacción. Estas filas se estabilizan antes de los recursos operativos.
2. **Sucursales:** bloquear todas las filas `branches` activas implicadas en orden UUID ascendente. Después bloquear todas las filas `branch_memberships` requeridas en orden `(branch_id, user_id)` ascendente. Owner/Admin no requieren fila de asignación, pero sí el lock de sucursal activa; Cashier/Inventory requieren ambos. En operaciones multi-sucursal, pasar el conjunto completo a un helper batch; nunca resolver y bloquear sucursales una a una según el orden del request.
3. **Almacenes:** bloquear *todos* los almacenes afectados con `SELECT ... ORDER BY id ASC FOR UPDATE`, en una sola adquisición lógica. El UUID del almacén determina el orden, no si es origen/destino ni el orden recibido en el request.
4. **Documento operativo:** bloquear el/los documentos que se confirman o modifican después de los almacenes y antes de balances. Si una operación bloquea más de una fila/documento, definir y respetar un orden estable por tipo de documento y clave primaria.
5. **Balances:** bloquear las filas existentes con `ORDER BY warehouse_id ASC, product_id ASC FOR UPDATE`. Para un solo almacén esto equivale a `product_id ASC`. No adquirir locks individuales por línea después de este lock de conjunto.
6. **Escrituras:** calcular desde los valores leídos bajo lock; actualizar/crear balances, insertar movimientos append-only, cambiar estado documental y escribir auditoría, todo antes del mismo COMMIT.

No se permite invertir niveles (por ejemplo, bloquear balance y después almacén), ni bloquear almacenes secuencialmente según el rol funcional (origen y luego destino).

## 3. Por qué el almacén es el mutex de inventario

Un `FOR UPDATE` sobre `inventory_balances` solo bloquea filas que ya existen. No bloquea la ausencia de una fila para un producto todavía sin balance. La fila de `warehouses` proporciona un mutex transaccional por almacén: todo escritor que siga el contrato debe adquirirlo antes de consultar, insertar o actualizar balances. Así se serializan también las creaciones de balances ausentes dentro del almacén.

Esto es una convención de todos los escritores, no una garantía frente a SQL manual, procesos externos o código que omita el mutex. La restricción única de balance sigue siendo una defensa adicional, no reemplaza el contrato.

## 4. Reglas para operaciones de una o varias ubicaciones

- **Un almacén:** bloquear ese almacén; después bloquear el conjunto necesario de balances por producto ascendente. El conteo actual bloquea el conjunto completo para validar apertura y reservas.
- **Varias sucursales/almacenes (transferencias, movimientos entre ubicaciones):** resolver tenant una vez; bloquear todas las sucursales UUID ascendente, después todas las asignaciones requeridas por `(branch_id, user_id)`, después todos los almacenes UUID ascendente, antes de cualquier documento o balance; finalmente bloquear balances por `(warehouse_id, product_id)`. Esto elimina los ciclos por orden origen/destino y las carreras con revocación/desactivación.
- **Reservas y consumo:** modificar `reserved_quantity` bajo el mismo mutex de almacén y lock de balance que usa el consumo físico. Validar disponibilidad con datos leídos bajo lock y una actualización condicional/atómica; nunca hacer read-then-write sin protección.
- **Productos sin fila de balance:** el mutex del almacén debe seguir retenido hasta completar el INSERT/UPSERT. No asumir que `FOR UPDATE` bloqueó una fila inexistente.
- **Idempotencia:** resolver/reclamar la clave idempotente dentro de la misma transacción y antes de producir efectos. El replay no puede volver a insertar movimientos ni auditoría duplicados.

## 5. Atomicidad e invariantes

En la misma transacción deben quedar juntos:

- estado del documento confirmado;
- todos los cambios de balance;
- movimientos del ledger append-only;
- evento(s) de auditoría;
- resultado/idempotencia de la operación.

Cualquier error debe provocar ROLLBACK total. No corregir ledger histórico mediante UPDATE/DELETE. Las compensaciones futuras serán movimientos nuevos y auditados, conforme a las reglas de negocio que se aprueben para cada flujo.

Los escritores deben conservar invariantes de base de datos y servicio: cantidades NUMERIC exactas, sin saldo físico o reservado negativo, reservas no superiores a existencias físicas y disponibilidad no consumida dos veces. Las reglas específicas de asignación, backorder, recepción parcial, valoración, tolerancias o reversos no se deciden en este contrato técnico.

## 6. Pruebas obligatorias por escritor

Ejecutar con PostgreSQL efímero y transacciones/conexiones independientes, no solo mocks:

1. dos operaciones concurrentes sobre el mismo almacén y el mismo producto;
2. dos operaciones concurrentes sobre productos distintos del mismo almacén;
3. creación concurrente de un balance inicialmente ausente;
4. dos operaciones multi-almacén que soliciten los mismos almacenes en orden inverso;
5. consumo concurrente de la última disponibilidad y modificación concurrente de reservas;
6. repetición simultánea de la misma clave idempotente;
7. fallo inducido después de cambiar balance y antes de ledger/auditoría (rollback total);
8. tenant/sucursal/almacén/producto ajeno, sin escrituras parciales;
9. confirmación de conteo concurrente contra otro escritor de existencias/reservas;
10. revocación de branch membership que obtiene su UPDATE antes del lock de autorización (la mutación debe denegarse tras esperar);
11. revocación iniciada después de que la mutación obtiene `FOR SHARE` (la revocación debe esperar al COMMIT);
12. desactivación concurrente de sucursal y almacén (serialización y revalidación del estado activo).

Cada operación nueva debe demostrar que respeta el mismo orden. La prueba de doble confirmación de conteo por sí sola no demuestra coordinación con escritores futuros que aún no existen.

## 7. Implementación de referencia actual

- `apps/api/src/branch-context.ts`: `lockBranchScopes` adquiere primero todas las sucursales activas por UUID y después las asignaciones activas por `(branch_id, user_id)`; `resolveBranchContext(..., true)` usa ese contrato para una mutación transaccional.
- `apps/api/src/inventory-locks.ts`: helpers compartidos `lockInventoryWarehouses` y `lockInventoryBalances`; ordenan UUIDs, exigen cada par almacén/sucursal validado, rechazan pares conflictivos, requieren `warehouses.is_active = true` al bloquear y fallan cerrados si falta un almacén solicitado.
- `apps/api/src/inventory-counts.ts`: confirmación de conteo usa los helpers; bloquea primero el almacén, después el documento y luego balances en lote; el conteo físico limita el lock a los productos contados, mientras que apertura revisa el conjunto completo; reutiliza la lectura bloqueada para calcular los deltas.
- `apps/api/src/branch-context.test.ts` y `branch-context.integration.test.ts`: pruebas del orden batch y carreras de revocación/desactivación con conexiones PostgreSQL independientes.
- `apps/api/src/inventory-locks.test.ts` y `inventory-counts.integration.test.ts`: predicado de almacén activo, confirmación de borrador tras desactivación y serialización entre lock de inventario y desactivación.

Este helper fija el patrón para nuevos servicios; no hace que un servicio futuro lo use automáticamente. La revisión de cada escritor y sus pruebas PostgreSQL siguen siendo obligatorias.

## 8. Relación con el diseño de recepción

`docs/sdd/PURCHASE_RECEIPT_MODEL.md` sigue siendo un diseño inicial. El contrato de locks de este documento sí puede reutilizarse técnicamente en una recepción cuando se apruebe su modelo, pero no aprueba proveedor obligatorio, órdenes de compra, recepción parcial/excedente, valoración, documento externo, diferencias, ni reglas de reverso. No crear DDL ni endpoints de recepción hasta resolver esas decisiones.
