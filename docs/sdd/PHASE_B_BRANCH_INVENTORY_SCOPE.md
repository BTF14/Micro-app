# Fase B — Inventario por sucursal: auditoría y alcance técnico propuesto

**Estado: BORRADOR. No es una decisión aprobada.** Este documento es una propuesta de arquitectura para revisión del propietario. No autoriza implementación, migraciones, endpoints ni cambios de código. La implementación solo comienza tras aprobación expresa.

**Fecha:** 2026-11-02 UTC.
**Autor:** sesión de IA (Claude), bajo las instrucciones del propietario del 2026-11-02 ("CONTINUIDAD Y AUDITORÍA ARQUITECTÓNICA — INVENTARIO MULTI-SUCURSAL DE MICRO-APP").
**No modifica:** `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`, `docs/INSPIRATION.md`, `docs/POS_REFERENCE_MATRIX.md`, `docs/sdd/role-permission-decision-matrix.md`, la PR #190 ni el issue #53. Este documento complementa y referencia esos documentos sin duplicarlos.

---

## 0. Estado verificado al iniciar este trabajo (2026-11-02 UTC)

Verificado en vivo contra GitHub, no asumido de memoria:

- `main` real: `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`. **El SHA citado en la sesión anterior (`88213507d088b82ea9231bbc72f49afade7ec99b`) quedó obsoleto**: `main` avanzó con las PR #191 y #192 (fusionadas el 2026-11-01), que añadieron `docs/FRONTEND_DESIGN_STANDARD.md` y lo integraron en `AGENTS.md` y el skill de stack. Es trabajo exclusivamente documental de UI/UX (ya mencionado por el propietario como regla permanente para trabajo futuro de frontend); no toca runtime, autorización ni inventario, y no fue creado por esta sesión.
- **PR #190**: sigue abierta como Draft, sin fusionar, rama `feat/org-catalog-read-endpoint-20261101`. HEAD **sin cambios**: `42ed27fd9ce13223c6a2d1fd2a9359d3ec871345` (igual al citado anteriormente — confirmado, no asumido). Dato nuevo: GitHub reporta ahora `mergeable: false`, `mergeable_state: "dirty"` porque su base (`main`) avanzó; esto es una divergencia de base, no un cambio en el contenido de la PR. No se tocó su estado, no se solicitó pasarla a Ready, no se fusionó. Se mantiene fuera del alcance de este documento.
- **Issue #53**: `state: open`. Confirmado, sin modificar.
- `docs/INSPIRATION.md` y `docs/POS_REFERENCE_MATRIX.md`: releídos íntegros en esta sesión; contenido igual al ya analizado (sin cambios recientes relevantes a inventario/sucursales).
- `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`: releído íntegro en esta sesión (205 líneas). Su sección 12 contiene **exactamente 7 decisiones abiertas** — ver sección 2 de este documento para el análisis punto por punto, verificado contra el texto real, no reconstruido de memoria.

---

## 1. Las 7 decisiones de negocio ya aprobadas (no se reconsultan)

Para que no haya ambigüedad, se transcriben tal como las aprobó el propietario el 2026-11-01/02. Son restricciones obligatorias para todo lo que sigue:

1. El registro de movimientos es la fuente de verdad del inventario.
2. Cada sucursal tiene existencias independientes.
3. Las transferencias tienen dos momentos: despacho desde origen y recepción en destino.
4. El despacho **no** acredita automáticamente existencias disponibles en destino.
5. El sistema debe representar mercancía en tránsito y diferencias entre cantidad enviada y recibida.
6. Los permisos de origen y destino se verifican independientemente.
7. Los conteos físicos envían cantidades absolutas; el servidor calcula las diferencias.

No se vuelve a preguntar ninguna de estas. El resto de este documento las trata como restricciones fijas.

---

## 2. Las 7 decisiones abiertas reales de `MULTI_BRANCH_DATA_MODEL.md` §12

Importante: estas **no coinciden exactamente** con las cuestiones que se discutieron en la sesión anterior (diferencias de transferencia, bandera de disponibilidad, estados de transferencia, referencias tipadas). Solo la decisión 4 del documento coincide con una de esas cuestiones. Las demás son distintas y se analizan tal como el documento las plantea.

### Decisión 1 — "Aprobar/corregir la estructura de membresía organizacional y asignación de sucursal; el propietario debe resolver la matriz de permisos sensibles antes de implementar autorizaciones"

- **Problema que resuelve:** si la estructura `organization_members.role` (rol único por organización) + `branch_memberships` (acceso sin rol por sucursal) es la correcta antes de construir autorización de inventario sobre ella.
- **Qué dice el documento:** la sección 4 ("Membresía, rol organizacional y asignaciones de sucursal — decisión vigente") ya la describe como "decisión vigente", no como pregunta abierta en el sentido de incertidumbre de diseño; §12.1 la mantiene listada porque el *gate* real pendiente es la matriz de permisos por operación, no la estructura de membresía en sí.
- **Evidencia en código:** confirmada en `apps/api/migrations/0003_branch_scope.sql` (`branches`, `branch_memberships`, sin columna de rol). Confirmada en `docs/sdd/role-permission-decision-matrix.md` (aprobada 2026-10-31, corregida PR #187): ya usa exactamente esta estructura — ve rol único por organización y delega alcance "sucursal" solo a nivel de *qué* puede operar un `inventory`/`cashier`, nunca un rol distinto por sucursal.
- **Relación con decisiones aprobadas:** no contradice ninguna de las 7; es la base estructural sobre la que actúan (p. ej. la decisión 6, "permisos de origen y destino verificados independientemente", se apoya exactamente en `branch_memberships` por sucursal).
- **Técnica, operativa o de negocio:** la estructura (rol único + asignación de sucursal) ya es una decisión de negocio tomada y vigente desde PR #165/#182. Lo que queda pendiente dentro de esta entrada —la matriz de permisos por operación de inventario específica de Fase B (quién puede hacer transferencias, ajustes, conteos)— es **de negocio**, pero la matriz ya existente delega expresamente "catálogo/inventario" a criterio técnico (`role-permission-decision-matrix.md` §1: *"Fuente: criterio técnico delegado por el propietario"*).
- **¿Se puede resolver por criterio arquitectónico?:** Sí, con una condición: debe mantenerse estrictamente dentro de lo que la matriz aprobada ya delega (lectura org, mutaciones de stock con alcance sucursal, Cashier sin mutación de inventario) y no inventar un rol o jerarquía nuevos.
- **Recomendación:** no crear una matriz de permisos nueva para Fase B. Extender las filas ya aprobadas de "Recepción de inventario", "Ajuste de inventario" y "Transferencia entre sucursales" (`role-permission-decision-matrix.md` líneas 27-29) al modelo de almacén/saldo por sucursal, sin cambiar a quién autorizan. Esto es una aplicación técnica de una decisión ya tomada, no una decisión nueva.
- **¿Requiere mi confirmación?:** No. La matriz ya cubre este punto con autoridad delegada explícita.

### Decisión 2 — "Definir si todas las ventas requieren turno o si habrá ventas no asociadas a caja (ventas online/facturación externa)"

- **Problema que resuelve:** si el modelo de venta debe permitir `register_shift_id` nulo (venta sin caja) desde el principio, lo que afecta a cómo el inventario se descuenta en esos casos.
- **Qué dice el documento:** §7 dice *"Venta y pago se atribuyen a organización y sucursal; caja/turno se exige cuando el canal de operación sea caja. Operaciones no presenciales podrían no tener turno, pero nunca carecer de organización/sucursal."* — es decir, el documento ya deja la puerta estructuralmente abierta (branch_id obligatorio, shift_id opcional), pero no decide si Micro-app venderá por canales sin caja en esta fase.
- **Evidencia:** no hay código de ventas en `main` en absoluto (ver auditoría de sección 3 de este documento — `apps/api/src/index.ts` no registra más rutas que `/health` y auth). No hay evidencia de que exista hoy ningún canal de venta sin caja.
- **Relación con decisiones aprobadas:** ninguna de las 7 decisiones aprobadas la determina; es ortogonal a inventario por sucursal.
- **Técnica, operativa o de negocio:** de negocio (si Micro-app venderá en línea/facturación externa) y además **fuera del alcance de Fase B**, que es inventario, no ventas.
- **¿Se puede resolver por criterio arquitectónico?:** Sí, para efectos de Fase B: basta con que el modelo de inventario (saldo y movimiento) no dependa de si existe o no un turno. Un movimiento de inventario se atribuye a `(organization_id, branch_id)` y opcionalmente a un turno/caja si el canal lo tiene; nunca al revés. Esto es compatible con cualquier respuesta futura a la pregunta de ventas sin caja.
- **Recomendación:** no decidir ahora si habrá ventas sin caja — no es necesario para diseñar el inventario. Diseñar el modelo de inventario de Fase B de forma que **no asuma** que todo movimiento proviene de una venta de caja (ya lo exige la decisión aprobada 1: el movimiento es la fuente de verdad, independiente del origen).
- **¿Requiere mi confirmación?:** No para Fase B. Si en el futuro se diseña el módulo de ventas, esa sí será una pregunta de negocio real en ese momento.

### Decisión 3 — "Cerrar el flujo de recepción y transferencia, especialmente transferencias inter-sucursal"

- **Problema que resuelve:** el documento original (del 2026-10-30, antes de las 7 decisiones aprobadas el 2026-11-01/02) no tenía resuelto el modelo de transferencias. **Esta decisión ya fue resuelta por el propietario** con las decisiones aprobadas 2-6 (existencias independientes por sucursal, dos momentos despacho/recepción, no acreditación automática, representación de tránsito y diferencias, permisos de origen/destino verificados independientemente).
- **Qué dice el documento:** §8 ("Compras, recepciones y transferencias") ya anticipaba el modelo de dos pasos (*"reservar/emitir salida del origen, confirmar recepción en destino. No aumentar destino al crear solicitud"*) — es decir, el documento ya proponía exactamente lo que el propietario aprobó después. No hay contradicción; la aprobación convierte la propuesta técnica en decisión de negocio vinculante.
- **Evidencia en código:** no implementado (no existe tabla `inventory_transfers` ni rutas).
- **Técnica, operativa o de negocio:** era de negocio; **ya resuelta**. Lo que queda es exclusivamente técnico: el modelo de estados concreto (ver sección 4 de este documento, punto C) y si las transferencias se implementan en Fase B o se difieren (ver sección 3).
- **¿Se puede resolver por criterio arquitectónico?:** El diseño de estados, sí. El calendario (¿en qué fase?), también, con criterio técnico (ver sección 3).
- **Recomendación:** tratar esta entrada del §12 como **cerrada por las decisiones aprobadas 2-6**; no reabrir el "si" de las transferencias en dos pasos. Lo pendiente es puramente el diseño técnico, cubierto en la sección 4.C y 5 de este documento.
- **¿Requiere mi confirmación?:** No. Ya está resuelta.

### Decisión 4 — "Elegir el diseño de referencia tipada para movimientos, tras prueba de integridad y consultas"

- **Problema que resuelve:** `inventory_movements.reference_type`/`reference_id` es una referencia polimórfica sin FK real (ver `0001_initial.sql` línea ~207: columnas `text`/`uuid` sueltas, sin `FOREIGN KEY`). Esto permite insertar un `reference_id` que no corresponda a ninguna fila real, y no hay integridad referencial que lo impida.
- **Qué dice el documento:** §6 ("Movimientos y referencias") plantea dos alternativas: (a) una tabla `inventory_documents` común con subtipo controlado y FKs tipadas desde cada origen, o (b) columnas FK tipadas opcionales por origen con una regla que exija exactamente una. Pide evaluar "borrado/reverso, ciclo de vida, integridad y consultas" antes de elegir.
- **Evidencia:** confirmado en el esquema real; no hay FK en esas dos columnas hoy.
- **Relación con decisiones aprobadas:** relacionada indirectamente con la decisión aprobada 1 (el movimiento es la fuente de verdad) — si la fuente de verdad no tiene integridad referencial fuerte, una referencia rota puede quedar indetectable.
- **Técnica, operativa o de negocio:** **técnica.** No hay ninguna decisión de negocio involucrada; es un problema de integridad de base de datos.
- **¿Se puede resolver por criterio arquitectónico?:** Sí. Ver el análisis crítico en la sección 4.D de este documento, que evalúa las dos opciones y recomienda una.
- **¿Requiere mi confirmación?:** No.

### Decisión 5 — "Definir estados y reglas contables de pagos parciales, reversos y devoluciones con fuentes fiscales aplicables"

- **Problema que resuelve:** cómo se contabilizan pagos parciales/reversos/devoluciones a efectos fiscales y contables.
- **Qué dice el documento:** aparece en §12 como pendiente general; no tiene desarrollo propio en otra sección del documento (las devoluciones se mencionan solo tangencialmente en §1 principio 7, "corregir mediante reversos, nunca borrando").
- **Evidencia:** no hay ninguna tabla ni lógica de devoluciones/pagos parciales implementada; `payments` (migración 0001) registra pagos individuales sin modelo de "pago parcial pendiente" ni de devolución de dinero.
- **Relación con decisiones aprobadas:** ninguna. Las 7 decisiones aprobadas son sobre inventario/transferencias, no sobre pagos o fiscalidad.
- **Técnica, operativa o de negocio:** **de negocio y fuera del alcance de inventario por sucursal.** Es un tema de ventas/caja/contabilidad, no de almacenes.
- **¿Se puede resolver por criterio arquitectónico?:** No corresponde resolverlo aquí; introducirlo en el alcance de Fase B sería exactamente el "no introducir funcionalidades prematuramente" que se pidió evitar.
- **Recomendación:** **excluir explícitamente esta decisión del alcance de Fase B.** Pertenece a un futuro módulo de ventas/caja/devoluciones. No se necesita resolverla para construir inventario por sucursal.
- **¿Requiere mi confirmación?:** No ahora. Volverá a ser relevante cuando se diseñe el módulo de ventas; se dejará constancia en la sección 9 de este documento para que no se pierda.

### Decisión 6 — "Definir retención/partición solo tras medir volumen; no anticipar particionado"

- **Problema que resuelve:** si `inventory_movements` (que crece indefinidamente) necesita particionado o política de retención.
- **Qué dice el documento:** el propio texto de §12.6 ya contiene su respuesta: *"no anticipar particionado"*. Es una decisión ya tomada por el documento mismo (principio 10, §2: *"Evitar microservicios, particionado o cachés prematuras... hasta que benchmarks demuestren otra necesidad"*).
- **Evidencia:** no hay volumen real (0 organizaciones con datos reales); no aplica medir nada todavía.
- **Técnica, operativa o de negocio:** técnica, y ya resuelta por el propio documento como "no actuar todavía".
- **Recomendación:** no diseñar particionado en Fase B. Sí diseñar los índices correctos desde el principio (cubierto en sección 5 de este documento) para que la migración a particionado, si algún día hace falta, no requiera rediseñar las claves.
- **¿Requiere mi confirmación?:** No.

### Decisión 7 — "Preparar pruebas de carga y límites por organización después de tener un flujo vertical real"

- **Problema que resuelve:** cuándo hacer pruebas de carga/capacidad.
- **Qué dice el documento:** el propio texto dice "después de tener un flujo vertical real" — es decir, explícitamente no ahora, no antes de que exista una operación de inventario funcionando de extremo a extremo.
- **Evidencia:** no hay flujo vertical real todavía (ver sección 3: cero endpoints comerciales en `main`).
- **Técnica, operativa o de negocio:** técnica, y ya resuelta por el documento como "diferida".
- **Recomendación:** no incluir pruebas de carga en los criterios de aceptación de Fase B. Sí incluir pruebas de concurrencia funcional (dos operaciones simultáneas no corrompen el saldo), que es un requisito de corrección, no de capacidad.
- **¿Requiere mi confirmación?:** No.

**Resumen de la sección 2:** de las 7 decisiones abiertas reales, ninguna requiere una pregunta nueva al propietario. Tres (3, 6, 7) ya estaban resueltas por el propio documento o por las decisiones aprobadas. Dos (2, 5) quedan correctamente fuera del alcance de Fase B por pertenecer a ventas/pagos, no a inventario. Una (1) se resuelve aplicando la matriz de permisos ya aprobada sin cambiarla. Una (4) es puramente técnica y se resuelve en la sección 4.D.

---

## 3. Auditoría de la implementación real

Metodología: cada afirmación cita archivo y, cuando aplica, línea. Clasificación: **Implementado** / **Parcialmente implementado** / **Documentado, no implementado** / **Propuesto** / **Pendiente** / **No encontrado**.

### 3.1 Inventario de archivos revisados

- `apps/api/migrations/0001_initial.sql`, `0003_branch_scope.sql`, `0004_register_shifts.sql` (y sus `.assertions.sql`).
- `apps/api/src/index.ts` (único registro de rutas HTTP de la API).
- `apps/api/src/database.ts` (helpers de conexión y transacción).
- `apps/api/src/tenant-context.ts`, `branch-context.ts`, `cashier-open-shift.ts` y sus tests.
- `apps/api/src/*.test.ts`, `*.integration.test.ts` (listado completo, no solo grep).
- `docs/sdd/role-permission-decision-matrix.md`.

No se pudo ni se intentó leer código de Neon main ni ejecutar nada contra producción.

### 3.2 Respuestas a las 10 preguntas de la sección 5 del encargo

1. **¿Las ventas generan movimientos de inventario?** → **No encontrado.** No existe ningún archivo de servicio de ventas en `apps/api/src/` (no hay `sales.ts`, `payments.ts`, ni ninguna ruta además de `/health` y auth en `index.ts`). Las tablas `sales`/`sale_items`/`payments`/`inventory_movements` existen en el esquema (migración 0001) pero no hay una sola línea de código de aplicación que las use. No es un "parcialmente implementado": la operación de venta no existe como funcionalidad en absoluto.
2. **¿Los movimientos tienen protección real de inmutabilidad?** → **Documentado, no implementado.** `MULTI_BRANCH_DATA_MODEL.md` §1 principio 7 dice que el historial se corrige por reversos, nunca borrando. Pero a diferencia de `register_shifts` (que sí tiene triggers `guard_register_shift_lifecycle` y `register_shifts_20_guard_lifecycle` en `0004_register_shifts.sql`, bloqueando DELETE y UPDATE de campos cerrados), **`inventory_movements` no tiene ningún trigger, regla ni política RLS que impida UPDATE/DELETE** en ninguna de las migraciones 0001-0004. Solo el rol de aplicación podría, en teoría, autodisciplinarse a no hacerlo, pero eso no es protección real — cualquier conexión con permisos de escritura puede alterar el historial.
3. **¿Movimientos y saldos se actualizan en la misma transacción?** → **No encontrado / no aplica todavía.** No existe tabla de saldo (`inventory_balances` no está en ninguna migración; `products.stock_quantity` es el único saldo existente y no hay código que lo actualice junto con `inventory_movements`, porque no hay código que escriba en ninguna de las dos).
4. **¿Existe una estrategia fiable para reconstruir y verificar saldos?** → **Propuesto, no implementado.** `MULTI_BRANCH_DATA_MODEL.md` §6 propone la idea (suma de movimientos = saldo, tarea de reconciliación que detecta sin autocorregir) pero no hay ninguna consulta, vista ni job que lo haga.
5. **¿Las operaciones usan correctamente los mecanismos transaccionales existentes?** → **Implementado como helper genérico, sin consumidor de inventario.** `apps/api/src/database.ts` define `withDatabaseTransaction` (BEGIN/COMMIT/ROLLBACK correcto, con rollback en catch) y `withDatabaseClient` (ciclo de vida de conexión por request, sin reutilización entre requests — correcto para Workers). Es un helper genérico correctamente implementado y con tests, pero **ninguna operación de inventario lo usa todavía** porque no hay operaciones de inventario.
6. **¿La idempotencia comprueba también el contenido de solicitudes repetidas?** → **Parcialmente implementado, solo a nivel de esquema, sin lógica de aplicación.** `sales.idempotency_key` existe como columna `UNIQUE (organization_id, idempotency_key)` (0001_initial.sql línea ~131), lo que impide dos filas con la misma key — pero no hay columna de hash de payload ni lógica que compare el contenido de una solicitud repetida contra la original para distinguir "mismo payload → mismo resultado" de "payload distinto → conflicto". El propio `MULTI_BRANCH_DATA_MODEL.md` §9 lo reconoce como diseño pendiente ("hash de payload estable"), no como algo ya resuelto. Para Fase B, ninguna operación propuesta (transferencia, ajuste, conteo) tiene todavía columna de idempotencia en el esquema actual.
7. **¿Existen pruebas de concurrencia real con PostgreSQL?** → **Implementado, pero solo para `register_shifts`, no para inventario.** `apps/api/src/register-shifts.integration.test.ts` líneas 363-421 ejecuta dos aperturas concurrentes reales con `Promise.allSettled` contra PostgreSQL desechable y verifica que solo una tenga éxito (protegido por los índices únicos parciales `register_shifts_one_open_per_register_uq`/`..._cashier_uq`). `cashier-open-shift.integration.test.ts` línea 203 prueba un cierre concurrente contra un turno ya resuelto con `FOR SHARE`. Es el patrón correcto y reutilizable, pero no existe ningún test equivalente para saldo de inventario porque no hay tabla de saldo.
8. **¿Los resolvers existentes están conectados a operaciones comerciales?** → **No, salvo una excepción aislada y sin fusionar.** Confirmado de nuevo: en `main`, `resolveTenantContext`/`resolveBranchContext`/`resolveOpenCashierRegisterShift` solo tienen callers en sus propios archivos de test. La única excepción es la PR #190 (no fusionada, fuera de alcance de este documento), que usa `resolveTenantContext` en una ruta de catálogo de solo lectura.
9. **¿El aislamiento por organización y sucursal está realmente garantizado en las consultas?** → **Parcialmente, a nivel de esquema; no probado a nivel de consulta porque no hay consultas comerciales.** Las FKs compuestas (`FOREIGN KEY (organization_id, branch_id) REFERENCES branches (organization_id, id)`, repetido en `registers`, `register_shifts`) impiden que una fila referencie una sucursal de otra organización — defensa en profundidad real a nivel de base de datos. Pero esto es integridad referencial, no autorización: no sustituye una cláusula `WHERE organization_id = $1 AND branch_id = $2` explícita en cada consulta de aplicación, porque no existe ninguna consulta de aplicación de inventario todavía que auditar.
10. **¿Hay contradicciones entre la matriz de permisos aprobada y otros documentos?** → **No encontrada ninguna nueva.** Ya se revisó en la sesión anterior (documentado en `CURRENT_STATE.md`, auditoría de Seguridad Nivel 1, 2026-11-01): el alcance "sucursal" de Inventory en la matriz (líneas 26-29 de `role-permission-decision-matrix.md`) es consistente con "sucursales con existencias independientes" — de hecho, la matriz ya anticipaba branch-scoped inventory antes de que el propietario aprobara formalmente la decisión 2. No se encontró contradicción adicional al releer ambos documentos para esta auditoría.

### 3.3 Conclusión de la auditoría

**La base de Fase B parte de cero en código de aplicación, no de una implementación parcial que haya que corregir.** Lo único reutilizable y correcto hoy es: el patrón de migración con `.assertions.sql`, el patrón de trigger de inmutabilidad/concurrencia de `register_shifts` (replicable para `inventory_movements`), el helper de transacción `withDatabaseTransaction`, el patrón de FKs compuestas tenant+branch-scoped, y la matriz de permisos ya aprobada. No hay ningún defecto que corregir en lo existente — el trabajo de Fase B es **construcción nueva sobre cimientos correctos**, no reparación.

---

## 4. Revisión crítica de las propuestas anteriores (ninguna pre-aprobada)

### A. Reconciliación automática de diferencias en transferencias — **no aprobado, recomendación con reservas**

Riesgo real: un ajuste automático que "corrige" la diferencia entre despacho y recepción borra la señal de que algo salió mal (robo, error de conteo, daño en tránsito) convirtiéndola silenciosamente en un número de inventario "correcto". Esto contradice el principio 7 de `MULTI_BRANCH_DATA_MODEL.md` (corregir por reversos explícitos, nunca automáticamente) y la decisión aprobada 5 (el sistema debe *representar* la diferencia, no eliminarla).

Recomendación: **no crear un movimiento de ajuste automático.** En su lugar: al confirmar la recepción, registrar la cantidad realmente recibida como un movimiento de entrada en destino (ligado a la transferencia) y dejar la diferencia (enviado − recibido) como un campo calculado y visible en la transferencia, en estado "con discrepancia". Esa discrepancia requiere una acción humana explícita y auditada (quién, cuándo, motivo) para cerrarse — por ejemplo un movimiento de ajuste *manual*, con el mismo permiso y motivo obligatorio que ya exige la matriz aprobada para "Ajuste de inventario" (línea 28). La transferencia permanece visible como "con discrepancia sin resolver" hasta ese cierre explícito; no se autocierra. Esto conserva trazabilidad completa y no inventa una regla de negocio nueva — simplemente reutiliza el modelo de ajuste-con-motivo-auditado ya aprobado.

### B. Bandera de disponibilidad independiente de la cantidad ("86'd" estilo Toast) — **descartada por falta de necesidad demostrada**

No hay ninguna evidencia en el repositorio, en la matriz aprobada ni en los principios del documento de que Micro-app necesite "ocultar temporalmente un producto sin tocar su stock" (el caso de uso real de esa bandera en Toast: un plato de cocina que se acaba a media jornada antes de que el stock físico llegue a cero). Micro-app vende productos con stock numérico exacto (abarrotes/retail), no platos preparados con mermas no contabilizadas minuto a minuto. El campo `products.is_active` ya cubre "dejar de vender un producto indefinidamente"; el stock en cero ya impide la venta por sí solo si se valida en servidor. Añadir una bandera adicional sería exactamente el caso que el propietario pidió evitar: *"no agregues funcionalidades por imitación"*. **Descartada para Fase B.** Si en el futuro aparece un caso de uso real y documentado, se puede reconsiderar entonces.

### C. Modelo de estados de transferencia — propuesta técnica concreta

Estados mínimos que representan correctamente las decisiones aprobadas 3-5 sin estados superfluos:

| Estado | Significa | Transición desde | Efecto en inventario |
|---|---|---|---|
| `draft` | Transferencia creada, aún no despachada | (inicial) | Ninguno |
| `dispatched` | Despachada desde origen | `draft` | Movimiento de salida en origen (decrementa origen) |
| `received` | Recepción confirmada y cantidades coinciden | `dispatched` | Movimiento de entrada en destino (incrementa destino) |
| `received_with_discrepancy` | Recepción confirmada pero cantidad recibida ≠ despachada | `dispatched` | Movimiento de entrada en destino por la cantidad **realmente recibida**; diferencia queda registrada y pendiente de resolución explícita (ver punto A) |
| `cancelled` | Cancelada antes de despacho | `draft` únicamente | Ninguno (nunca se cancela después de `dispatched`: la mercancía ya salió físicamente del origen; a partir de ahí solo cabe recibir, con o sin discrepancia, nunca "deshacer") |

Nota de diseño: no existe transición directa `draft → received`; el despacho es obligatorio como paso intermedio (decisión aprobada 3). No se modela "recepción parcial" como un estado distinto de `received_with_discrepancy` — una recepción parcial *es* un caso de discrepancia (recibido < enviado); tratarlo como el mismo estado evita duplicar la lógica de resolución de diferencias para dos casos que requieren exactamente la misma acción humana.

### D. Referencias tipadas en movimientos — recomendación técnica

De las dos alternativas que plantea `MULTI_BRANCH_DATA_MODEL.md` §6:

- Opción (a), tabla `inventory_documents` común: añade una capa de indirección que no resuelve el problema real (seguiría siendo polimórfica un nivel más abajo) y complica las consultas más frecuentes ("movimientos de este producto en esta sucursal").
- Opción (b), columnas FK tipadas opcionales por origen con regla de "exactamente una presente": es el patrón estándar en PostgreSQL para este caso (varias FK nullable + `CHECK` de exclusividad), es consultable directamente con `JOIN`, cada FK se beneficia de integridad referencial real del motor, y no requiere inventar una tabla de documentos genérica sin consumidor claro todavía (el propietario pidió evitar "un framework genérico de eventos sin caso de uso").

**Recomendación: opción (b).** Ejemplo concreto para Fase B (columnas adicionales en `inventory_movements`, todas nullable, con un `CHECK` que exija exactamente una no nula entre las que correspondan a los orígenes habilitados en cada fase): `sale_id`, `purchase_receipt_id`, `transfer_id`, `physical_count_id`, `adjustment_reason` (el ajuste manual no necesita una tabla propia, solo motivo + autor, ya exigidos por la matriz). Esto es evaluable y revertible por migración aditiva; no bloquea añadir más orígenes tipados después (compras, Fase E) sin romper los existentes.

### E. UX — sin cambios

Conforme a la instrucción del propietario, no se diseñan pantallas. La única influencia de UX en este documento es que el modelo de estados de transferencia (punto C) y la distinción saldo-disponible/saldo-en-tránsito (sección 5) deben ser representables en una interfaz futura sin rediseño — ambos ya lo son por construcción.

---

## 5. Reevaluación de las fases B/C/D/E

Separación anterior: B = inventario básico por sucursal, C = ajustes, D = transferencias, E = recepción de compras.

**Hallazgo central:** las decisiones aprobadas 2-6 son específicamente sobre transferencias. Si Fase B no incluyera al menos el *modelo de datos* de transferencias y mercancía en tránsito, Fase D obligaría a alterar las tablas base de Fase B (saldo, movimiento) — exactamente el rediseño que el propietario pidió evitar ("qué elementos estructurales deben diseñarse desde ahora para evitar rediseños").

Los conteos físicos (decisión aprobada 7) son distintos: no tienen dependencias estructurales nuevas — un conteo físico es, en el modelo de movimientos, simplemente otro tipo de movimiento con referencia tipada a `physical_count_id` (punto D) que ajusta el saldo a la cantidad absoluta declarada. No requiere ninguna tabla que Fase B no necesite ya por otras razones.

**Propuesta revisada:**

- **Fase B (alcance de este documento) — Inventario por sucursal, fuente de verdad y conteos físicos.** Incluye: `warehouses`, `inventory_balances`, `inventory_movements` extendido con `branch_id`/`warehouse_id` y referencias tipadas, backfill desde `products.stock_quantity`, endpoints de lectura de saldo/movimientos, endpoint de ajuste manual con motivo (reutilizando la fila ya aprobada de la matriz), y endpoint de conteo físico (cantidad absoluta → el servidor calcula y registra la diferencia, decisión aprobada 7). **Se incluyen los conteos/ajustes en Fase B** porque sin ellos el inventario por sucursal no es operable de forma realista (no hay forma de corregir un error sin ellos) y porque no añaden ninguna tabla nueva fuera de lo que Fase B ya necesita.
- **Fase C (siguiente) — Transferencias entre sucursales.** El *modelo de datos* (tabla `inventory_transfers`/líneas, estados del punto C, referencia tipada `transfer_id`) se diseña en Fase B para no romper el esquema de movimientos, pero **la implementación de endpoints y lógica de negocio de transferencias se difiere a esta fase**, porque depende de resolver primero permisos de doble sucursal con asignaciones activas reales (decisión aprobada 6) sobre un inventario que ya funcione.
- **Fase D (antes "E") — Recepción de compras.** Sin cambios de fondo respecto a la propuesta anterior: depende de que exista saldo e inventario por sucursal funcionando (Fase B) y de un flujo de proveedor/orden de compra que todavía no está diseñado. Se mantiene al final porque compras introduce su propio conjunto de decisiones de negocio (condiciones de pago a proveedor, etc.) ajenas a inventario.

Fase "E" de la numeración anterior desaparece como fase propia: no hay una "Fase E" distinta de D; lo que antes era C (ajustes) se fusiona en B por las razones anteriores.

---

## 6. Investigación externa — resultado honesto

Se intentó localizar contenido del canal `@CodigoEspinoza` y los dos videos compartidos (`baRJ_gva-8Y`, `IMU_KLmT6gM`) mediante búsqueda web; la búsqueda no devolvió resultados identificables de ese canal ni transcripciones de esos videos específicos (ver fuentes abajo — los resultados fueron sobre kardex en general, de otras fuentes). Este documento **no inventa contenido de esos videos** que no pudo verificar. Si el propietario puede compartir una transcripción, un resumen propio, o acceso directo, se puede incorporar en una revisión posterior de este borrador.

Como complemento con conocimiento general verificable (no específico de esos videos), los dos sistemas más citados para comparar (Odoo, ERPNext) comparten un patrón de diseño coincidente con lo que ya propone `MULTI_BRANCH_DATA_MODEL.md` y con las decisiones aprobadas: modelan el inventario como movimientos entre dos "ubicaciones" (un almacén interno, un cliente, un proveedor, una ubicación virtual de "tránsito"), y una transferencia entre almacenes se representa como un movimiento cuyo origen y destino son ambos ubicaciones internas, pasando por un estado intermedio mientras la mercancía está en tránsito — es la misma estructura de dos momentos que el propietario ya aprobó de forma independiente. Esto se cita como una convención de la industria que **confirma, no origina**, el diseño ya decidido; no se copia ningún esquema de tablas de esos sistemas, conforme a la instrucción de no adoptar sus modelos sin contrastarlos.

No se evaluó una "propuesta de Gemini" en este documento porque no se encontró su contenido en el historial disponible de esta sesión; si el propietario la tiene disponible y quiere que se evalúe, se puede incorporar en la siguiente revisión del borrador.

---

## 7. Alcance técnico propuesto — Fase B

### 7.1 Modelo de datos (adición aditiva, no destructiva)

Tablas nuevas (migración `0005_branch_inventory.sql`, propuesta):

- `warehouses (organization_id, branch_id, id, code, name, is_active, ...)` — FK compuesta a `branches (organization_id, id)`. Al menos un almacén por defecto por sucursal (backfill, ver 7.2).
- `inventory_balances (organization_id, warehouse_id, product_id, on_hand_quantity, created_at, updated_at)` — PK `(organization_id, warehouse_id, product_id)`; FKs compuestas a `warehouses` y `products`; `CHECK (on_hand_quantity >= 0)`.
- `inventory_movements` (extendida, no reemplazada): añadir `warehouse_id` (FK compuesta `(organization_id, warehouse_id)`, NOT NULL tras backfill), y las columnas de referencia tipada del punto 4.D (`sale_id`, `purchase_receipt_id`, `transfer_id`, `physical_count_id` — todas nullable en esta fase salvo `physical_count_id`/ajuste manual, que son los únicos orígenes que Fase B implementa; las demás quedan reservadas para fases siguientes sin requerir otra migración de columnas).
- `physical_counts (organization_id, branch_id, warehouse_id, id, status, counted_by, counted_at, ...)` y `physical_count_lines (..., product_id, counted_quantity, system_quantity_snapshot, difference)` — cantidad absoluta por línea (decisión aprobada 7); el servidor calcula `difference` y genera el movimiento de ajuste correspondiente dentro de la misma transacción al confirmar el conteo.
- Triggers de inmutabilidad en `inventory_movements`, replicando el patrón ya probado en `register_shifts` (0004): prohibir `UPDATE`/`DELETE` de cualquier fila ya insertada (append-only real, no solo documental).
- Índices: `(organization_id, warehouse_id, product_id, created_at DESC)` para consulta de movimientos por almacén/producto; `(organization_id, branch_id, warehouse_id)` en `warehouses`; índice único parcial si se decide que solo pueda existir un almacén "predeterminado" por sucursal.

### 7.2 Migración

- **Backfill de almacenes:** crear un almacén predeterminado por sucursal existente (`warehouses`, un registro por `branch_id`), de forma determinista y reversible.
- **Punto de negocio marcado — distribución inicial de existencias entre sucursales:** hoy solo existe `products.stock_quantity`, un único número por producto a nivel de organización; **no existe ningún dato histórico de cuánto de ese stock está físicamente en cada sucursal.** No hay ninguna fuente de evidencia en el repositorio (código, migraciones, documentos) que permita inferir esa distribución automáticamente. Las alternativas reales son:
  - **(a)** Asignar todo el stock existente a un único almacén "predeterminado" por organización (el de la sucursal marcada como principal/primera creada) y dejar el resto de sucursales en cero; las cantidades se corrigen después con transferencias reales o conteos físicos.
  - **(b)** No migrar ningún stock automáticamente: todas las sucursales empiezan en cero y el primer conteo físico de cada sucursal (ya forma parte del alcance de Fase B, decisión aprobada 7) establece su saldo real, mientras `products.stock_quantity` permanece como referencia de solo lectura hasta que todas las sucursales activas hayan hecho su primer conteo.
  - **(c)** Pedir al propietario (o a cada organización, si aplica) una distribución manual aprobada antes de la migración, organización por organización.

  **Recomendación técnica: (b).** Es la única alternativa que no inventa un reparto sin base real, reutiliza un mecanismo que Fase B ya construye por otras razones (el conteo físico, decisión aprobada 7) en lugar de crear uno nuevo solo para la migración, y dado que (al momento de esta auditoría) no hay evidencia de datos reales de clientes en Neon main, el costo de "empezar en cero y contar" es bajo. (a) es más rápida pero fuerza a asumir cuál es la sucursal "principal", dato que tampoco existe hoy en el esquema. (c) no escala y depende de que el propietario tenga ese dato por cada organización cliente, lo cual no se puede asumir.

  **Esta es la pregunta de negocio real que requiere la confirmación del propietario antes de fijar la regla de asignación** — se presenta formalmente al final de este documento.

- **Compatibilidad temporal:** mientras no todas las sucursales de una organización tengan `inventory_balances` poblado y reconciliado, `products.stock_quantity` se mantiene como fuente de lectura para cualquier superficie que no esté todavía migrada (no existe tal superficie hoy, pero el principio queda documentado para cuando exista un frontend). Ninguna escritura nueva debe ir a `products.stock_quantity` una vez Fase B esté activa — una sola fuente de escritura, conforme al principio 2 de `MULTI_BRANCH_DATA_MODEL.md` §6.
- **Retirada del campo legacy:** en una migración posterior, solo tras confirmar que `SUM(inventory_balances.on_hand_quantity) por producto` ha sido auditado y no hay escrituras pendientes al campo antiguo.
- **Recuperación ante errores:** cada paso de la migración 0005 debe tener su `.assertions.sql` (patrón ya establecido en 0001-0004) ejecutado en PostgreSQL desechable antes de considerarse completo; ningún paso se aplica a Neon main sin ese gate.

### 7.3 Backend y API (propuesta de endpoints, no implementada)

Todos bajo autorización `resolveTenantContext → resolveBranchContext`, denegando por defecto, siguiendo la matriz ya aprobada:

- `GET /api/orgs/:organizationId/branches/:branchId/inventory` — saldo por almacén/producto (rol: todos los de la matriz línea 26, alcance sucursal para Inventory/Cashier).
- `GET /api/orgs/:organizationId/branches/:branchId/inventory/movements` — historial de movimientos, paginado.
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/adjustments` — ajuste manual con motivo obligatorio (rol Inventory/Owner/Admin, matriz línea 28).
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/physical-counts` — crear conteo, cantidades absolutas por línea.
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/physical-counts/:id/confirm` — confirmar conteo; el servidor calcula diferencias y genera movimientos dentro de una transacción.

Cada mutación: transacción única (saldo + movimiento juntos, usando `withDatabaseTransaction`), validación server-side de cantidades (`NUMERIC`, nunca negativas tras el movimiento salvo que se decida permitir saldo negativo explícitamente — no se propone permitirlo), manejo de errores sin filtrar detalles internos (patrón ya usado en `index.ts` `onError`).

### 7.4 Seguridad

- Aislamiento de organización y sucursal verificado en cada consulta con cláusula explícita, no solo por FK compuesta (la FK es defensa en profundidad, no sustituto).
- Permiso verificado server-side contra la matriz ya aprobada; Cashier nunca puede mutar inventario (coherente con línea 27-29 de la matriz: columna Cashier = ❌ en recepción/ajuste/transferencia).
- Denegación por defecto: cualquier combinación de org/sucursal/rol no cubierta explícitamente por la matriz se rechaza, no se asume permitida.
- Reutilizar `resolveBranchContext` (ya fail-closed y probado) en vez de reconstruir validación de sucursal ad-hoc.

### 7.5 Pruebas

- Unitarias: cálculo de diferencias de conteo, validación de cantidades, construcción de queries.
- Integración PostgreSQL desechable: cada endpoint contra PG real (patrón ya usado en `*.integration.test.ts`).
- Concurrencia: dos ajustes/conteos simultáneos sobre el mismo `(warehouse_id, product_id)` no deben producir saldo negativo ni condición de carrera — replicar el patrón `Promise.allSettled` + índice/lock usado en `register-shifts.integration.test.ts`.
- Aislamiento multi-tenant: organización A no puede leer/escribir inventario de B ni manipulando IDs (patrón ya exigido en `MULTI_BRANCH_DATA_MODEL.md` §11, fila "Tenant").
- Aislamiento por sucursal: usuario asignado solo a la sucursal A no puede operar inventario de B.
- Migración: comparación de totales antes/después del backfill en PostgreSQL desechable con datos sintéticos.
- Consistencia movimiento-saldo: todo movimiento insertado debe corresponder exactamente a la variación del saldo materializado (test de reconciliación).
- Rollback: forzar fallo a mitad de una operación (p. ej. tras insertar el movimiento, antes de actualizar el saldo) y verificar que la transacción completa se revierte.

### 7.6 Criterios de aceptación

Fase B se considera terminada cuando, con evidencia reproducible en PostgreSQL desechable y CI:

1. `inventory_balances` y `inventory_movements` (extendida) existen con `.assertions.sql` en verde.
2. `inventory_movements` es append-only real (trigger probado: un intento de UPDATE/DELETE falla).
3. Toda mutación de inventario ocurre en una única transacción (probado con fallo forzado + rollback).
4. Los tres endpoints de mutación (ajuste, conteo, confirmación de conteo) están protegidos por `resolveTenantContext → resolveBranchContext` y rechazan cross-tenant/cross-branch con pruebas negativas.
5. Dos mutaciones concurrentes sobre el mismo saldo no producen una cantidad negativa ni una condición de carrera (prueba real con PostgreSQL, no mock).
6. El backfill desde `products.stock_quantity` tiene su regla de asignación aprobada por el propietario (ver pregunta pendiente) y pruebas de reconciliación de totales.
7. La matriz de permisos aplicada es exactamente la ya aprobada, sin desviaciones.

### 7.7 Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migración de backfill dejando `products.stock_quantity` y `inventory_balances` divergentes | Comparación de totales automatizada en CI antes de considerar el backfill completo; no se corta la fuente antigua hasta que coincidan |
| Condición de carrera en ajuste/conteo concurrente | Lock de fila (`FOR UPDATE`) o actualización condicional, con prueba de concurrencia real en PostgreSQL desechable antes de fusionar |
| Referencia polimórfica heredada reapareciendo por descuido en nuevo código | Revisión de PR explícita contra este documento; cualquier nueva referencia debe usar FK tipada (sección 4.D) |
| Confundir "existe la tabla" con "funcionalidad terminada" | Los criterios de aceptación (7.6) exigen evidencia de comportamiento, no solo de esquema |
| Exposición cruzada entre organizaciones/sucursales por error de query | Pruebas negativas obligatorias antes de fusionar cualquier endpoint (igual que exige `AGENTS.md`/`AI_COLLABORATION_AND_PR_POLICY.md` para #53) |

### 7.8 Orden de implementación propuesto

1. Migración 0005 (esquema + triggers + `.assertions.sql`), sin backfill todavía — validada en PostgreSQL desechable.
2. Backfill de almacenes predeterminados (sin stock, solo estructura).
3. Resolver la pregunta de asignación inicial de stock (pendiente del propietario) y aplicar el backfill de saldo correspondiente.
4. Endpoints de lectura (saldo, movimientos) — menor riesgo, habilita verificación visual temprana.
5. Endpoint de ajuste manual.
6. Endpoint de conteo físico (crear + confirmar).
7. Pruebas de concurrencia, aislamiento y reconciliación — gate final antes de considerar Fase B cerrada.
8. Documentación de continuidad actualizada **solo después** de que lo anterior esté fusionado y verificado en CI.

---

## 8. Documentación — contradicciones y alcance de este borrador

No se encontró ninguna contradicción entre este borrador y `MULTI_BRANCH_DATA_MODEL.md`, `role-permission-decision-matrix.md`, `INSPIRATION.md` o `POS_REFERENCE_MATRIX.md`: este documento se apoya en ellos y no los reemplaza. `MULTI_BRANCH_DATA_MODEL.md` conserva autoridad sobre el ERD objetivo a largo plazo (incluye compras, pagos avanzados, etc., fuera del alcance de Fase B); este documento es su concreción para la fase inmediata siguiente, no una versión alternativa.

No se modificó `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md` ni `STATE_JOURNAL.md`: conforme a la instrucción del propietario, esos documentos de estado general se actualizan solo cuando el trabajo correspondiente esté terminado y autorizado, no mientras es un borrador de propuesta.

---

## 9. Pregunta pendiente de negocio (la única indispensable)

**Problema en lenguaje sencillo:** hoy el stock de cada producto es un solo número por organización. Al dividir el inventario por sucursal, alguien tiene que decidir cómo repartir ese número inicial entre las sucursales — y no existe ningún dato en el sistema que diga cuánto de ese stock está físicamente en cada una.

**Alternativas:**
- **(a) Repartir todo a una sucursal "principal"** y dejar las demás en cero, a corregir después manualmente.
- **(b) Empezar todas las sucursales en cero** y que el primer conteo físico de cada una (que de todos modos hay que construir en esta fase) establezca su saldo real.
- **(c) Pedir una distribución manual** aprobada antes de migrar, sucursal por sucursal.

**Consecuencias:** (a) es rápida pero asume una sucursal "principal" que hoy no existe como concepto en el sistema, y dejaría las demás sucursales con saldo cero aunque tengan stock real hasta que alguien lo corrija. (b) no arriesga ningún número inventado, pero exige literalmente contar el inventario físico de cada sucursal antes de operar con datos fiables — trabajo real, no solo de software. (c) es la más precisa pero no es escalable ni verificable por el sistema, y hoy no hay ningún dato de ese tipo disponible para ninguna organización.

**Recomendación:** (b) — empezar en cero y usar el conteo físico real, porque es la única opción que no inventa un número sin respaldo y porque reutiliza una pieza que Fase B construye de todas formas.

¿Cuál de las tres prefieres, o hay una cuarta opción que no se haya contemplado?
