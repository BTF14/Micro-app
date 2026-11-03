# Fase B — Inventario por sucursal: auditoría y alcance técnico propuesto

**Estado: BORRADOR. No es una decisión aprobada.** Este documento es una propuesta de arquitectura para revisión del propietario. No autoriza implementación, migraciones, endpoints ni cambios de código. La implementación solo comienza tras aprobación expresa.

**Fecha:** 2026-11-02 UTC. **Revisión 2** (añade el diseño de inicialización de inventario por sucursal, sección 7.9, tras aprobación expresa del propietario de la decisión de negocio correspondiente — ver sección 1, punto 8).
**Autor:** sesión de IA (Claude), bajo las instrucciones del propietario del 2026-11-02 ("CONTINUIDAD Y AUDITORÍA ARQUITECTÓNICA — INVENTARIO MULTI-SUCURSAL DE MICRO-APP" y su seguimiento de cierre de etapa).
**No modifica:** `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`, `docs/INSPIRATION.md`, `docs/POS_REFERENCE_MATRIX.md`, `docs/sdd/role-permission-decision-matrix.md`, la PR #190 ni el issue #53. Este documento complementa y referencia esos documentos sin duplicarlos.

---

## 0. Estado verificado al iniciar este trabajo

Verificado en vivo contra GitHub, no asumido de memoria:

- `main` real (revisión 1 y revisión 2, sin cambios entre ambas): `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`. **El SHA citado en la sesión previa a la revisión 1 (`88213507d088b82ea9231bbc72f49afade7ec99b`) quedó obsoleto**: `main` avanzó con las PR #191 y #192 (fusionadas el 2026-11-01), que añadieron `docs/FRONTEND_DESIGN_STANDARD.md` y lo integraron en `AGENTS.md` y el skill de stack. Es trabajo exclusivamente documental de UI/UX; no toca runtime, autorización ni inventario.
- **PR #190**: sigue abierta como Draft, sin fusionar, rama `feat/org-catalog-read-endpoint-20261101`. HEAD **sin cambios**: `42ed27fd9ce13223c6a2d1fd2a9359d3ec871345` (confirmado de nuevo al redactar la revisión 2, no asumido). `mergeable_state: "dirty"` solo por divergencia de base, no por contenido. No se tocó su estado. Fuera de alcance de este documento.
- **Issue #53**: `state: open`. Confirmado de nuevo, sin modificar.
- `docs/INSPIRATION.md`, `docs/POS_REFERENCE_MATRIX.md`, `docs/sdd/MULTI_BRANCH_DATA_MODEL.md`, `docs/sdd/role-permission-decision-matrix.md`, `docs/SAAS_ARCHITECTURE_DECISIONS.md`: releídos íntegros (de nuevo en la revisión 2 para los dos últimos). `MULTI_BRANCH_DATA_MODEL.md` §12 contiene **exactamente 7 decisiones abiertas** — ver sección 2. Ninguno contradice el diseño de inicialización añadido en la revisión 2 (`SAAS_ARCHITECTURE_DECISIONS.md` línea 31 confirma explícitamente: *"Un negocio de una sola ubicación debe poder empezar con una sucursal predeterminada creada durante onboarding"* — compatible con "no inicializado hasta su primer conteo").
- **PR #193** (esta propuesta): `state: open`, `draft: false`, `mergeable_state: clean`, **12/12 check-runs en verde** sobre el HEAD de la revisión 1 (`178e4f7b...`). El revisor de IA (`chatgpt-codex-connector`) no llegó a revisar por cuota agotada (confirmado por su propio comentario) — no se contó como revisión, conforme al protocolo de revisión manual de `AGENTS.md`. Se hizo revisión manual línea por línea contra el repositorio real (migraciones 0001/0003/0004, `role-permission-decision-matrix.md`, resolvers, tests de concurrencia citados) antes de esta revisión 2; no se encontraron errores ni afirmaciones sin respaldo.

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
8. **(Aprobada 2026-11-02, revisión 2)** Cada sucursal inicializa su inventario mediante un primer conteo registrado y confirmado formalmente, que puede proceder de una verificación física real o de cantidades que el propietario ya tenga documentadas, siempre que se introduzcan mediante el mismo procedimiento controlado, con trazabilidad de quién las declaró, cuándo y para qué sucursal. No se asignan automáticamente las existencias actuales de `products.stock_quantity` a ninguna sucursal; tampoco se inventan distribuciones ni se pierde la información histórica existente. El diseño técnico completo de esta decisión está en la sección 7.9.

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

- `warehouses (organization_id, branch_id, id, code, name, is_active, is_default, initialized_at, initialized_by, initializing_physical_count_id, ...)` — FK compuesta a `branches (organization_id, id)`. Al menos un almacén por defecto por sucursal (backfill, ver 7.2). `is_default boolean NOT NULL DEFAULT false`, con índice único parcial `(organization_id, branch_id) WHERE is_default` (como mucho un almacén predeterminado por sucursal). `initialized_at timestamptz NULL`, `initialized_by uuid NULL` (FK compuesta a `organization_members`), `initializing_physical_count_id uuid NULL` (FK a `physical_counts.id`, se fija solo al confirmar) — ver diseño completo en 7.9.D.
- `inventory_balances (organization_id, warehouse_id, product_id, on_hand_quantity, created_at, updated_at)` — PK `(organization_id, warehouse_id, product_id)`; FKs compuestas a `warehouses` y `products`; `CHECK (on_hand_quantity >= 0)`. Una fila solo existe para pares `(warehouse, product)` que hayan tenido al menos un movimiento con cantidad positiva; nunca se borra aunque el saldo llegue a cero después (ver 7.9.C).
- `inventory_movements` (extendida, no reemplazada): añadir `warehouse_id` (FK compuesta `(organization_id, warehouse_id)`, NOT NULL tras backfill), y las columnas de referencia tipada del punto 4.D (`sale_id`, `purchase_receipt_id`, `transfer_id`, `physical_count_id` — todas nullable en esta fase salvo `physical_count_id`/ajuste manual, que son los únicos orígenes que Fase B implementa; las demás quedan reservadas para fases siguientes sin requerir otra migración de columnas). El valor `movement_type = 'opening'`, ya presente en el `CHECK` de `0001_initial.sql` y nunca usado hasta ahora, se reserva exclusivamente para la línea con `counted_quantity > 0` de un conteo inicializador (ver 7.9.C) — no se introduce ningún valor nuevo de `movement_type`.
- `physical_counts (organization_id, branch_id, warehouse_id, id, status, is_initializing, initiated_by, confirmed_by, confirmed_at, created_at)` y `physical_count_lines (physical_count_id, product_id, counted_quantity, system_quantity_snapshot, difference)` — cantidad absoluta por línea (decisión aprobada 7); el servidor calcula `difference` y genera el movimiento correspondiente dentro de la misma transacción al confirmar el conteo. `status CHECK (status IN ('draft','confirmed','cancelled'))`. `is_initializing boolean NOT NULL` se fija al crear el conteo según si el almacén tenía `initialized_at IS NULL` en ese instante, y nunca cambia después — ver 7.9.
- `legacy_stock_snapshot (organization_id, product_id, quantity_at_snapshot, snapshotted_at)` — nueva tabla, instantánea inmutable de `products.stock_quantity`. PK `(organization_id, product_id)`; FK compuesta a `products (organization_id, id)` ON DELETE RESTRICT. Diseño completo en 7.9.A.
- Triggers de inmutabilidad en `inventory_movements`, `physical_counts`/`physical_count_lines` (tras `confirmed`) y `legacy_stock_snapshot`, replicando el patrón ya probado en `register_shifts` (0004): prohibir `UPDATE`/`DELETE` de cualquier fila ya insertada o confirmada (append-only real, no solo documental). Trigger adicional sobre `products` (`BEFORE UPDATE OF stock_quantity`) que rechaza el cambio si ya existe una fila en `legacy_stock_snapshot` para ese producto — ver 7.9.A.
- Índices: `(organization_id, warehouse_id, product_id, created_at DESC)` para consulta de movimientos por almacén/producto; `(organization_id, branch_id, warehouse_id)` en `warehouses`; índice único parcial de `is_default` descrito arriba.

### 7.2 Migración

- **Backfill de almacenes:** crear un almacén predeterminado (`is_default = true`) por cada sucursal existente (`warehouses`, un registro por `branch_id`), de forma determinista y reversible. Ningún almacén nace inicializado (`initialized_at = NULL`).
- **Instantánea del inventario anterior y sin reparto automático (decisión aprobada 8):** en la misma transacción de backfill por organización, se copia a `legacy_stock_snapshot` el `stock_quantity` de **todos** los productos de esa organización (activos e inactivos, para no perder referencia de productos descontinuados). No se escribe ninguna fila en `inventory_balances` ni en `inventory_movements` durante el backfill — ningún almacén queda con existencias hasta que su primer conteo se confirme (7.9). No hay ya ninguna regla de reparto que decidir: se eliminó la pregunta de negocio de la revisión 1 de este documento porque el propietario aprobó que no se reparte nada automáticamente. Diseño completo en 7.9.A y 7.9.B.
- **Compatibilidad temporal:** `products.stock_quantity` queda congelado (trigger, 7.9.A) pero visible como referencia histórica de solo lectura desde el momento del backfill de esa organización. Ninguna escritura nueva va a `products.stock_quantity` una vez Fase B esté activa para esa organización — una sola fuente de escritura, conforme al principio 2 de `MULTI_BRANCH_DATA_MODEL.md` §6.
- **Retirada del campo legacy:** en una migración posterior, solo tras confirmar que **todos** los almacenes de una organización tienen `initialized_at` no nulo y que una conciliación no encontró escrituras pendientes al campo antiguo (que además el trigger de 7.9.A ya impide desde el snapshot).
- **Recuperación ante errores:** cada paso de la migración 0005 debe tener su `.assertions.sql` (patrón ya establecido en 0001-0004) ejecutado en PostgreSQL desechable antes de considerarse completo; ningún paso se aplica a Neon main sin ese gate.

### 7.3 Backend y API (propuesta de endpoints, no implementada)

Todos bajo autorización `resolveTenantContext → resolveBranchContext`, denegando por defecto, siguiendo la matriz ya aprobada:

- `GET /api/orgs/:organizationId/branches/:branchId/inventory` — saldo por almacén/producto (rol: todos los de la matriz línea 26, alcance sucursal para Inventory/Cashier).
- `GET /api/orgs/:organizationId/branches/:branchId/inventory/movements` — historial de movimientos, paginado.
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/adjustments` — ajuste manual con motivo obligatorio (rol Inventory/Owner/Admin, matriz línea 28). Rechaza con 409 si el almacén destino no está inicializado (7.9.B).
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/physical-counts` — crea el conteo en estado `draft`. `is_initializing` se fija automáticamente según el estado de `initialized_at` del almacén en ese instante.
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/physical-counts/:id/lines` — añade/actualiza líneas (producto, cantidad contada) mientras el conteo esté en `draft`. Registra el progreso del conteo (7.9.E).
- `POST /api/orgs/:organizationId/branches/:branchId/inventory/physical-counts/:id/confirm` — confirma el conteo dentro de una única transacción. Comportamiento distinto según `is_initializing` — diseño completo en 7.9.B y 7.9.C.

Cada mutación: transacción única (saldo + movimiento juntos, usando `withDatabaseTransaction`), validación server-side de cantidades (`NUMERIC`, nunca negativas tras el movimiento salvo que se decida permitir saldo negativo explícitamente — no se propone permitirlo), manejo de errores sin filtrar detalles internos (patrón ya usado en `index.ts` `onError`).

### 7.4 Seguridad

- Aislamiento de organización y sucursal verificado en cada consulta con cláusula explícita, no solo por FK compuesta (la FK es defensa en profundidad, no sustituto).
- Permiso verificado server-side contra la matriz ya aprobada; Cashier nunca puede mutar inventario (coherente con línea 27-29 de la matriz: columna Cashier = ❌ en recepción/ajuste/transferencia). La inicialización, al ser un conteo físico (decisión aprobada 7), hereda el mismo permiso que cualquier conteo — no se crea una fila de matriz nueva (7.9.F).
- Denegación por defecto: cualquier combinación de org/sucursal/rol no cubierta explícitamente por la matriz se rechaza, no se asume permitida. Extiende también a almacenes no inicializados: toda mutación de inventario (salvo la propia confirmación del conteo inicializador) rechaza con 409 si `warehouses.initialized_at IS NULL`.
- Reutilizar `resolveBranchContext` (ya fail-closed y probado) en vez de reconstruir validación de sucursal ad-hoc — también para iniciar/confirmar la inicialización (7.9.F).

### 7.5 Pruebas

- Unitarias: cálculo de diferencias de conteo, validación de cantidades, construcción de queries.
- Integración PostgreSQL desechable: cada endpoint contra PG real (patrón ya usado en `*.integration.test.ts`).
- Concurrencia: dos ajustes/conteos simultáneos sobre el mismo `(warehouse_id, product_id)` no deben producir saldo negativo ni condición de carrera — replicar el patrón `Promise.allSettled` + índice/lock usado en `register-shifts.integration.test.ts`. Incluye específicamente dos confirmaciones simultáneas de conteos inicializadores del mismo almacén: solo una debe tener éxito (7.9.B/E).
- Aislamiento multi-tenant: organización A no puede leer/escribir inventario de B ni manipulando IDs (patrón ya exigido en `MULTI_BRANCH_DATA_MODEL.md` §11, fila "Tenant").
- Aislamiento por sucursal: usuario asignado solo a la sucursal A no puede operar inventario de B, incluida la inicialización.
- Migración: snapshot de `legacy_stock_snapshot` cubre el 100% de los productos (activos e inactivos) de cada organización migrada, en PostgreSQL desechable con datos sintéticos.
- Consistencia movimiento-saldo: todo movimiento insertado debe corresponder exactamente a la variación del saldo materializado (test de reconciliación).
- Rollback: forzar fallo a mitad de una operación (p. ej. tras insertar los movimientos `opening`, antes de marcar `initialized_at`) y verificar que la transacción completa se revierte, sin dejar el almacén parcialmente inicializado.
- Cobertura obligatoria: confirmar un conteo inicializador con productos activos faltantes debe rechazarse con 409 y no debe crear ninguna fila (7.9.E).
- Línea en cero: confirmar un conteo con una línea en 0 no debe crear fila en `inventory_balances` ni en `inventory_movements`; la línea debe persistir y ser consultable como evidencia (7.9.C).
- Congelación del dato legado: un intento de `UPDATE` sobre `products.stock_quantity` tras su snapshot debe fallar (trigger, 7.9.A); un intento de `UPDATE`/`DELETE` sobre `legacy_stock_snapshot` o sobre un `physical_counts` ya confirmado debe fallar.
- Operación bloqueada pre-inicialización: cualquier endpoint de mutación de inventario contra un almacén con `initialized_at IS NULL` (salvo su propio conteo inicializador) debe rechazar con 409.

### 7.6 Criterios de aceptación

Fase B se considera terminada cuando, con evidencia reproducible en PostgreSQL desechable y CI:

1. `inventory_balances` y `inventory_movements` (extendida) existen con `.assertions.sql` en verde.
2. `inventory_movements`, `physical_counts`/`physical_count_lines` confirmados y `legacy_stock_snapshot` son append-only real (trigger probado: un intento de UPDATE/DELETE falla en cada uno).
3. Toda mutación de inventario ocurre en una única transacción (probado con fallo forzado + rollback), incluida la confirmación de un conteo inicializador.
4. Todos los endpoints de mutación están protegidos por `resolveTenantContext → resolveBranchContext` y rechazan cross-tenant/cross-branch con pruebas negativas.
5. Dos mutaciones concurrentes sobre el mismo saldo, y dos confirmaciones concurrentes del mismo conteo inicializador, no producen una cantidad negativa, doble inicialización ni condición de carrera (prueba real con PostgreSQL, no mock).
6. `legacy_stock_snapshot` cubre el 100% de los productos de cada organización migrada **antes** de que cualquiera de sus almacenes pueda inicializarse, con pruebas de cobertura.
7. Ningún almacén permite mutaciones de inventario mientras `initialized_at` sea nulo, salvo la confirmación de su propio conteo inicializador, con prueba negativa.
8. La confirmación de un conteo inicializador rechaza cobertura incompleta (producto activo sin línea) con prueba positiva y negativa.
9. La matriz de permisos aplicada es exactamente la ya aprobada, sin desviaciones, incluida la inicialización.

### 7.7 Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migración de backfill dejando `products.stock_quantity` y `inventory_balances` divergentes | Ya no aplica como riesgo de reparto (decisión aprobada 8: no hay reparto automático); se mantiene como riesgo de trigger de congelación mal aplicado — prueba explícita de que `UPDATE` sobre el campo legado falla tras el snapshot |
| Condición de carrera en ajuste/conteo concurrente, incluida la inicialización | Actualización condicional (`UPDATE ... WHERE initialized_at IS NULL`) dentro de la transacción + prueba de concurrencia real en PostgreSQL desechable antes de fusionar |
| Confirmar un conteo inicializador incompleto deja productos con saldo implícito en cero sin haber sido realmente contados | Validación de cobertura obligatoria contra `products.is_active`, bloqueante, antes de permitir la confirmación (7.9.E) |
| Referencia polimórfica heredada reapareciendo por descuido en nuevo código | Revisión de PR explícita contra este documento; cualquier nueva referencia debe usar FK tipada (sección 4.D) |
| Confundir "sin fila en `inventory_balances`" con "no inicializado" | Disambiguado exclusivamente por `warehouses.initialized_at`, nunca por ausencia de fila (7.9.C/D) |
| Confundir "existe la tabla" con "funcionalidad terminada" | Los criterios de aceptación (7.6) exigen evidencia de comportamiento, no solo de esquema |
| Exposición cruzada entre organizaciones/sucursales por error de query | Pruebas negativas obligatorias antes de fusionar cualquier endpoint (igual que exige `AGENTS.md`/`AI_COLLABORATION_AND_PR_POLICY.md` para #53) |

### 7.8 Orden de implementación propuesto

1. Migración 0005 (esquema + triggers + `.assertions.sql`), sin backfill todavía — validada en PostgreSQL desechable.
2. Backfill de almacenes predeterminados (sin stock, solo estructura) y, en la misma transacción por organización, snapshot a `legacy_stock_snapshot` (7.9.A) — ya no hay pregunta de reparto pendiente, el backfill nunca escribe saldo.
3. Endpoints de lectura (saldo, movimientos) — menor riesgo, habilita verificación visual temprana.
4. Endpoint de ajuste manual (bloqueado por `initialized_at` como cualquier otra mutación).
5. Endpoints de conteo físico (crear, añadir líneas, confirmar) — incluye el flujo de inicialización (`is_initializing`) descrito en 7.9.
6. Pruebas de concurrencia, aislamiento, cobertura de inicialización y reconciliación — gate final antes de considerar Fase B cerrada.
7. Documentación de continuidad actualizada **solo después** de que lo anterior esté fusionado y verificado en CI.

### 7.9 Inicialización del inventario por sucursal — diseño detallado (decisión aprobada 8)

Esta sección resuelve, con criterio técnico, los seis aspectos planteados por el propietario sobre cómo implementar la decisión ya aprobada. Ninguno de los puntos siguientes reabre la decisión de negocio; todos son su concreción técnica.

#### A. Conservación del inventario anterior

`legacy_stock_snapshot (organization_id, product_id, quantity_at_snapshot, snapshotted_at)`, PK `(organization_id, product_id)`, FK compuesta `(organization_id, product_id) → products (organization_id, id)` ON DELETE RESTRICT.

- **Cuándo se toma:** en la misma transacción que el backfill de almacenes predeterminados de esa organización (paso 2 de 7.8), antes de que exista ningún almacén operable. Un solo `snapshotted_at` por organización — instantánea completa del catálogo, no parcial.
- **Qué cubre:** todos los productos de la organización, activos e inactivos, para no perder referencia de productos descontinuados que de todos modos tenían un `stock_quantity` histórico.
- **Por qué no se sobrescribe ni se descarta:** la tabla es aditiva (migración nueva, no toca `products`); un trigger de inmutabilidad (mismo patrón `guard_register_shift_lifecycle` de `0004_register_shifts.sql`) prohíbe `UPDATE`/`DELETE` sobre cualquier fila ya insertada. La restricción `PK (organization_id, product_id)` impide además una segunda instantánea accidental del mismo producto — el snapshot ocurre, por diseño, una sola vez por organización.
- **Cómo se impide que el sistema siga usando la columna como fuente de verdad:** no es solo una convención de código. Un trigger `BEFORE UPDATE OF stock_quantity ON products` consulta `legacy_stock_snapshot`; si ya existe una fila para `(NEW.organization_id, NEW.id)`, la actualización se rechaza con una excepción de PostgreSQL. Esto congela el campo a nivel de base de datos en el momento exacto del snapshot de esa organización, no por disciplina de los desarrolladores — detecta en tiempo real cualquier escritura accidental futura, incluida la de código que aún no existe hoy.
- **Alcance del congelamiento:** es por `(organization_id, product_id)`, no global. Una organización que todavía no haya activado Fase B (sin fila de snapshot) sigue pudiendo escribir su `stock_quantity` con normalidad — no hay efecto cruzado entre organizaciones en distintos estados de adopción.

#### B. Inicialización por sucursal

La unidad real de inicialización es el **almacén** (`warehouses.initialized_at`), no la sucursal — ver justificación en el punto D. En Fase B, cada sucursal tiene exactamente un almacén predeterminado, así que en la práctica equivalen; el diseño no depende de esa coincidencia.

- **Independencia:** cada almacén se inicializa con su propio conteo, sin relación con el estado de otros almacenes de la misma organización (consistente con la decisión aprobada 2, existencias independientes por sucursal).
- **Atomicidad:** la confirmación de un conteo inicializador ocurre dentro de una única transacción (`withDatabaseTransaction`) que: (1) valida cobertura completa (7.9.E); (2) inserta `inventory_balances`/`inventory_movements` para las líneas con cantidad > 0; (3) ejecuta `UPDATE warehouses SET initialized_at = now(), initialized_by = $actor, initializing_physical_count_id = $count_id WHERE id = $warehouse_id AND initialized_at IS NULL`. Si cualquier paso falla, o si la actualización condicional afecta 0 filas (ver concurrencia abajo), toda la transacción se revierte — no hay estado intermedio "parcialmente inicializado".
- **Concurrencia:** la cláusula `WHERE initialized_at IS NULL` en el `UPDATE` es la guarda real. Si dos conteos inicializadores del mismo almacén se confirman a la vez, PostgreSQL serializa ambas transacciones por el bloqueo de fila sobre `warehouses`; la segunda ve `initialized_at` ya no nulo, su `UPDATE` afecta 0 filas, y su transacción se revierte completa con un 409 — sin doble inicialización y sin inconsistencia, sin necesitar un índice único adicional (el propio `UPDATE` condicional cumple el mismo papel que el patrón de índice único parcial de `register_shifts`, adaptado a una transición de estado de una sola vez en lugar de un recurso que se abre/cierra repetidamente).
- **Bloqueo de operaciones comerciales:** cualquier endpoint que mute inventario de ese almacén (ajuste, conteo rutinario, y los puntos de extensión reservados para transferencia/recepción en fases futuras) debe comprobar `warehouses.initialized_at IS NOT NULL` y rechazar con 409 en caso contrario — única excepción, la propia confirmación del conteo inicializador. Esto es, además, la base sobre la que las fases C (transferencias) y D (compras) deberán apoyarse: ningún endpoint futuro de esas fases podrá mutar un almacén no inicializado sin violar este contrato ya establecido aquí.

#### C. Productos con existencia cero

El `CHECK (quantity_delta <> 0)` de `inventory_movements` (heredado de `0001_initial.sql`, no se modifica) impide generar un movimiento de cantidad cero. En vez de forzar una excepción a esa restricción o inventar un movimiento ficticio:

- **Ningún movimiento ni fila de `inventory_balances` se crea para una línea contada en cero.** La ausencia de saldo ya significa "cero" exactamente igual que antes de inicializar — por eso la inicialización no se infiere por la existencia de filas de saldo, sino exclusivamente por `warehouses.initialized_at` (punto D).
- **La evidencia de que el producto fue contado y declarado en cero es la propia fila de `physical_count_lines`**, que pasa a ser inmutable en cuanto su `physical_counts` padre queda `confirmed` (mismo trigger de inmutabilidad que protege `inventory_movements` y `legacy_stock_snapshot`). Esa fila es permanente y consultable: "el producto X fue contado el día Y por el usuario Z y se declaró en 0 unidades" — sin necesitar un movimiento de inventario para probarlo.
- **Distinción contada-en-cero vs. no-contada-todavía:** se resuelve en el punto de confirmación, no por inspección posterior de `inventory_balances`. La validación de cobertura obligatoria (7.9.E) exige que exista una línea de `physical_count_lines` para cada producto activo antes de permitir que el conteo inicializador se confirme — así que, una vez `initialized_at` no es nulo, todo producto activo de esa organización tiene garantizado tener una línea en el conteo que inicializó ese almacén (contada en 0 o en una cantidad positiva). Un producto sin fila de saldo en un almacén ya inicializado significa, sin ambigüedad, "contado y confirmado en cero" o "creado después de la inicialización, aún no contado ahí" — ambos casos son datos legítimos, no un error de datos.

#### D. Estado de inicialización — unidad correcta

`initialized_at`, `initialized_by` e `initializing_physical_count_id` pertenecen a **`warehouses`**, no a `branches`.

- **Por qué:** `inventory_balances` está modelado por `(organization_id, warehouse_id, product_id)` — el propio `MULTI_BRANCH_DATA_MODEL.md` (§4, "almacén: ubicación de existencias dentro de una sucursal; permitir más de uno cuando el negocio lo necesite") y `SAAS_ARCHITECTURE_DECISIONS.md` (tabla de alcance, fila "Existencias y reservas → Sucursal + almacén") fijan el almacén, no la sucursal, como la unidad real donde existe una cantidad física. Poner el estado de inicialización en `branches` presupondría una equivalencia 1:1 entre sucursal y almacén que el propio ERD objetivo ya rechaza (permite más de un almacén por sucursal).
- **Por qué no es un problema práctico en Fase B:** esta fase solo crea un almacén predeterminado (`is_default = true`) por sucursal existente (backfill, 7.2); no expone todavía ninguna funcionalidad de múltiples almacenes por sucursal. En este alcance concreto, inicializar el almacén predeterminado de una sucursal equivale, en la práctica, a inicializar la sucursal — pero el campo vive en la entidad correcta del modelo de datos, preparado para cuando una organización necesite más de un almacén por sucursal sin requerir otra migración de columnas ni mover el campo.
- **Resolución de "¿puede operar la sucursal?":** por ahora (un único almacén por sucursal), la pregunta "¿puede esta sucursal vender/ajustar/recibir?" se responde consultando el `initialized_at` de su único almacén `is_default`. Qué almacén exacto usa cada operación cuando una sucursal tenga varios almacenes (fase futura, no de Fase B) es una cuestión de enrutamiento de ventas que no está resuelta en ningún documento vigente — se deja fuera de alcance explícitamente, sin inventar una regla de negocio que nadie ha pedido todavía.

#### E. Conteos parciales y correcciones

- **Progreso:** mientras `physical_counts.status = 'draft'`, el endpoint de líneas (7.3) permite insertar/actualizar filas de `physical_count_lines` de forma incremental, una por producto contado hasta ese momento. No hay límite de tiempo impuesto por el diseño para completar un conteo en `draft`.
- **Completitud exigida solo para el conteo inicializador:** al llamar a `confirm` sobre un conteo con `is_initializing = true`, la transacción primero ejecuta una comprobación de cobertura: todo producto con `is_active = true` de la organización debe tener una línea en ese conteo. Si falta alguno, la confirmación se rechaza con 409 y la lista de productos faltantes, sin modificar nada — un conteo parcial nunca se confirma ni se trata como si las cantidades faltantes fueran cero. Un conteo **no** inicializador (routine recount posterior, ya con el almacén inicializado) no exige esta cobertura total — puede ser un recuento parcial legítimo de unos pocos productos, porque el almacén ya tiene una línea base fiable para todo lo demás.
- **Corregir un conteo inicial que resultó incorrecto:** no se edita ni se borra el `opening` original (inmutable por trigger, igual que cualquier otro movimiento). Se corrige exactamente como cualquier otra discrepancia detectada después: un nuevo conteo (rutinario) o un ajuste manual con motivo obligatorio (fila ya aprobada de la matriz, "Ajuste de inventario") que registra la diferencia como un nuevo movimiento. El historial conserva ambos hechos — el conteo inicial declarado y la corrección posterior — sin perder trazabilidad ni requerir un mecanismo nuevo.

#### F. Seguridad y permisos

- **Quién puede iniciar/registrar líneas/confirmar:** la inicialización es, por la decisión aprobada 7, un conteo físico — hereda sin cambios la fila ya aprobada "Ajuste de inventario (mermas, conteos)" de `role-permission-decision-matrix.md`: Owner/Admin con alcance de organización; Inventory con alcance de sucursal, motivo obligatorio y auditoría; Cashier sin acceso. No se crea una fila de matriz nueva ni un rol nuevo.
- **Verificación server-side:** mismo encadenamiento ya construido y probado, `resolveTenantContext → resolveBranchContext` — un Inventory sin `branch_memberships` activa sobre la sucursal del almacén no puede iniciar, registrar líneas en, ni confirmar su conteo inicializador. No se reconstruye validación de sucursal ad-hoc.
- **Sin flujo de doble aprobación:** el esquema distingue `initiated_by` de `confirmed_by` (permite que sean personas distintas si una organización lo opera así), pero el sistema no exige un segundo revisor — introducir esa exigencia sería una regla de negocio nueva no solicitada, así que no se añade.
- **Auditoría:** `physical_counts` registra `initiated_by`, `confirmed_by`, `confirmed_at`, `organization_id`, `branch_id`, `warehouse_id`; cada línea queda ligada a esa fila, inmutable tras confirmar. `warehouses.initialized_by`/`initializing_physical_count_id` dejan, además, la traza directa de qué conteo y qué persona inicializaron cada almacén, consultable sin tener que reconstruirlo a partir del historial de movimientos.

---

## 8. Documentación — contradicciones y alcance de este borrador

No se encontró ninguna contradicción entre este borrador y `MULTI_BRANCH_DATA_MODEL.md`, `role-permission-decision-matrix.md`, `INSPIRATION.md`, `POS_REFERENCE_MATRIX.md` o `SAAS_ARCHITECTURE_DECISIONS.md` (los cinco releídos de nuevo para esta revisión 2): este documento se apoya en ellos y no los reemplaza. `MULTI_BRANCH_DATA_MODEL.md` conserva autoridad sobre el ERD objetivo a largo plazo (incluye compras, pagos avanzados, etc., fuera del alcance de Fase B); este documento es su concreción para la fase inmediata siguiente, no una versión alternativa.

No se modificó `CURRENT_STATE.md`, `HANDOFF_NEXT_CHAT.md` ni `STATE_JOURNAL.md`: conforme a la instrucción del propietario, esos documentos de estado general se actualizan solo cuando el trabajo correspondiente esté terminado y autorizado, no mientras es un borrador de propuesta.

---

## 9. Decisión de inicialización — aprobada y registrada

La pregunta de negocio planteada en la revisión 1 de este documento (cómo repartir `products.stock_quantity` entre sucursales) quedó **resuelta por el propietario el 2026-11-02**: no se reparte automáticamente nada; cada sucursal se inicializa mediante un primer conteo confirmado formalmente (decisión aprobada 8, sección 1). El diseño técnico completo de esa decisión está en la sección 7.9.

Ninguna cuestión de negocio nueva surgió al profundizar en los seis aspectos solicitados (7.9.A-F): los seis se resolvieron con criterio técnico, apoyados en mecanismos que Fase B ya necesitaba por otras razones (conteo físico, trigger de inmutabilidad, resolvers existentes, matriz ya aprobada). No hay, a cierre de esta revisión, ninguna pregunta de negocio pendiente para que Fase B pueda aprobarse formalmente.
