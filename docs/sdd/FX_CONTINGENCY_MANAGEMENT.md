# Gestión de contingencia cambiaria — especificación funcional y técnica

- **Estado:** propuesta de producto aprobada para especificación; no implementada ni habilitada.
- **Fecha:** 2026-11-09.
- **Ámbito:** configuración cambiaria, autorización administrativa, checkout, auditoría y reportes.
- **Relacionados:** [BCV rate integration](BCV_RATE_INTEGRATION.md) (si está presente en la rama de integración), [matriz de permisos](role-permission-decision-matrix.md), [requisitos de cumplimiento](../COMPLIANCE_REQUIREMENTS.md), [ADR-20261109-fx-contingency-authorization](../decisions/ADR-20261109-fx-contingency-authorization.md), [ODD task](../../odd/tasks/fx-contingency-management.md).

> Esta especificación describe una capacidad futura. No afirma que exista código, endpoints, migraciones, permisos, cumplimiento fiscal ni despliegue. La autorización técnica de una tasa manual no demuestra por sí misma su validez legal o fiscal.

## 1. Problema y objetivo

Evitar que un comercio quede totalmente detenido cuando la tasa BCV aplicable no pueda obtenerse por feriados, calendario bancario, retraso de publicación o indisponibilidad técnica, sin convertir la tasa manual en un mecanismo normal ni permitir cambios arbitrarios por cajeros.

Objetivos:
- Mantener BCV como fuente y modo normal.
- Ofrecer una excepción temporal, deliberada, visible y atribuible.
- Adaptar la experiencia a pequeños negocios y empresas con varias sucursales.
- Conservar evidencia financiera y operativa completa.
- Mantener aislamiento por organización y sucursal.
- Fallar de forma segura cuando no se pueda verificar una autorización.

No objetivos:
- No reemplazar ni imitar la publicación oficial del BCV.
- No inferir automáticamente una tasa alternativa ni copiar una tasa de un proveedor no oficial.
- No cambiar precios de catálogo, descuentos, impuestos ni reglas fiscales.
- No reescribir ventas ya finalizadas.
- No habilitar operación offline ni checkout sin validación server-side.
- No certificar cumplimiento tributario.

## 2. Terminología y modos

No llamar a la función «activar/desactivar el dólar». La moneda USD puede seguir disponible; la función administra la **fuente de conversión FX**.

### Modo normal — BCV automático
- Fuente: publicación oficial BCV validada.
- Se aplica la política vigente de fecha efectiva: una tasa prepublicada solo puede usarse desde su `effective_date`; nunca antes.
- No usar silenciosamente una tasa antigua si falta una tasa aplicable.
- El comportamiento actual de checkout exige una tasa BCV aplicable incluso para ventas liquidadas en USD. Cualquier excepción por contingencia debe implementarse como una política explícita y auditada, no como fallback implícito.

### Modo contingencia — tasa manual autorizada
- Excepción temporal por organización y alcance de sucursal.
- La tasa se identifica siempre como **manual/de contingencia**, nunca como BCV ni «oficial».
- Exige motivo, valor, vigencia, responsable y autenticación reforzada.
- No se activa por el solo hecho de que el fetch del BCV falle.
- No se permite cuando el servidor no puede verificar de forma autoritativa la autorización.

## 3. Actores y permisos

Roles existentes del dominio: `owner`, `admin`, `cashier`, `inventory`. La matriz aprobada reserva al Owner la configuración de políticas de organización y limita al Admin a operar el negocio. La petición de producto solicita que la contingencia solo pueda autorizarla un administrador; se necesita reconciliar formalmente esa intención con la matriz vigente antes de crear permisos/endpoints.

Propuesta de autorización mínima:
- **Owner:** configura la política organizacional, define quién puede ser delegado, límites de duración, uso de doble autorización y alcance permitido.
- **Administrador delegado de FX:** puede activar, renovar y revocar una contingencia solo si recibe un permiso específico, por ejemplo `fx.contingency.authorize`, y dentro de las sucursales asignadas. No obtiene por ello permisos generales de configuración.
- **Admin sin delegación:** no puede autorizar contingencias.
- **Cashier:** puede consultar el estado, realizar ventas permitidas y confirmar que comunicó la tasa mostrada; no puede crear, editar, renovar ni revocar autorizaciones.
- **Inventory:** sin permiso cambiario salvo acceso de lectura expresamente definido.

El permiso específico no existe todavía. No implementarlo ni asumir que `admin` lo incluye hasta reconciliar y aprobar la matriz de permisos. Si el propietario decide que solo Owner puede autorizar, usar esa política sin introducir delegación.

### Pequeño negocio
- Una persona puede tener rol Owner/Admin y operar caja con la misma cuenta individual.
- No requiere dos cuentas para la misma persona.
- Para autorizar, debe reautenticarse con su PIN administrativo individual; la sesión de cajero por sí sola no eleva privilegios.
- El PIN nunca se comparte con el cajero ni se almacena en texto plano.

### Empresa
- Identidad individual por miembro; no cuentas compartidas.
- Owner configura permisos y supervisa desde panel central.
- Administradores delegados gestionan solo sucursales/alcances asignados.
- MFA obligatorio como política recomendada para autorización cambiaria.
- Doble aprobación opcional: dos personas distintas, ninguna puede satisfacer ambas aprobaciones.

## 4. Autenticación y PIN

- PIN es una verificación adicional ligada a una cuenta ya autenticada; no reemplaza el inicio de sesión ni la autorización.
- Para pequeños negocios: PIN administrativo individual de 8 dígitos como mínimo recomendado.
- El PIN se solicita al confirmar la activación, renovación o cambio material de la autorización, no al entrar en Configuración.
- La verificación debe ocurrir en servidor y vincularse a la solicitud exacta (organización, sucursal/alcance, tasa, motivo, inicio, vencimiento y nonce/idempotency key).
- Nunca guardar PIN en texto plano, logs, analytics ni eventos de auditoría. Usar KDF de contraseñas resistente a fuerza bruta compatible con el runtime (selección pendiente de revisión técnica), sal única y parámetros revisables; un pepper solo si puede almacenarse y rotarse de forma segura fuera de la base de datos.
- Limitar intentos por cuenta y señales de dispositivo/IP, aplicar espera progresiva y alertar ante patrones anómalos. No depender únicamente de bloqueo por IP.
- Evitar enumeración de cuentas y filtrar mensajes de error.
- Para empresas: contraseña reciente + MFA; WebAuthn/passkey/TOTP según soporte y recuperación segura. El PIN de caja no sustituye MFA.
- La recuperación/reinicio de PIN exige autenticación de nivel equivalente, revocación de sesiones/tokens de autorización anteriores y auditoría.

## 5. Flujo de autorización

1. Usuario con permiso abre Configuración → Gestión cambiaria.
2. Consulta modo actual, tasa BCV aplicable, fecha efectiva, estado de sincronización y cualquier incidencia conocida.
3. Selecciona «Autorizar contingencia».
4. Completa tasa manual (VES por 1 USD), motivo obligatorio, nota explicativa y ámbito.
5. Selecciona inicio y vencimiento dentro de los límites organizacionales. El servidor asigna `authorized_at`; el cliente no puede retrofechar ni ampliar el máximo.
6. Revisa resumen inequívoco: valor, unidad, motivo, sucursales afectadas, hora Caracas, vencimiento, quién autoriza y advertencia de que no es tasa oficial BCV.
7. Confirma expresamente que comprende la naturaleza manual de la tasa.
8. Reautenticación: PIN individual para el pequeño negocio; contraseña reciente + MFA para política empresarial.
9. Si existe doble aprobación, queda `pending_approval` y no surte efecto hasta que un segundo actor elegible distinto apruebe.
10. El servidor valida permiso, tenant, sucursal, sesión, credencial, límites, vigencia, estado de la política y concurrencia dentro de una transacción.
11. Se crea registro append-only y versión activa; se registra evento de auditoría. La UI refleja el estado solo después de confirmación del servidor.

La reautenticación autoriza exclusivamente esa solicitud. No crea una sesión administrativa general ni eleva los permisos del cajero.

## 6. Vigencia, alcance y estados

- Propuesta inicial para pequeño negocio: máximo 24 horas por autorización.
- Para empresa: límite máximo definido por Owner en política organizacional; la primera versión debe usar un límite conservador y documentado, no duración ilimitada.
- La renovación crea una nueva autorización; nunca modifica la anterior.
- Vencimiento se evalúa en servidor usando reloj confiable y zona `America/Caracas`; no depende de que un Cron se ejecute ni de que el usuario abra la aplicación.
- Alcance predeterminado: una sucursal. «Todas las sucursales» requiere permiso y política explícitos, confirmación separada y auditoría de alcance.
- Una sucursal no hereda la contingencia de otra.
- Doble aprobación, cuando se active, requiere dos identidades distintas.
- No permitir períodos superpuestos incompatibles para el mismo ámbito; definir precedencia y locking transaccional antes de implementar.

Estados sugeridos:
- `pending_approval`
- `active`
- `expired`
- `revoked`
- `rejected`

Las transiciones se registran como eventos; no se reescribe el pasado. No existe estado «active» hasta que todas las aprobaciones requeridas estén completas.

## 7. Checkout y evidencia por venta

Antes de completar una venta, el servidor determina la fuente aplicable y verifica dentro de la transacción:
- organización y sucursal correctas;
- autorización vigente en ese instante;
- alcance correcto;
- estado activo y aprobaciones requeridas;
- permiso del actor;
- valor exacto y versión de autorización;
- reglas comerciales y fiscales vigentes.

Si la fuente BCV oficial es aplicable y la política está en modo normal, se usa BCV.
Si existe contingencia autorizada y la política permite expresamente esa excepción, el checkout usa el snapshot manual.
Si no se puede validar la autorización, está vencida/revocada, no cubre la sucursal o la base no está disponible, se bloquea la conversión afectada. No se presume validez por caché del navegador ni por una lectura anterior.

Cada venta debe conservar snapshot inmutable:
- `fx_source`: por ejemplo `bcv_official` o `manual_contingency`;
- valor decimal exacto y unidad;
- fecha efectiva oficial, cuando aplique;
- `authorization_id` y versión, si es manual;
- actor que autorizó y hora de autorización;
- hora de aplicación, zona horaria y sucursal;
- motivo y vigencia de la autorización;
- moneda e importe originales y resultados calculados;
- versión de reglas de redondeo/impuestos aplicables.

No cambiar ni recalcular ventas ya completadas cuando se desactive o cambie la tasa.

### Confirmación del cajero y del cliente
Son evidencias distintas:
- El cajero confirma que la tasa y la condición manual se mostraron/comunicaron antes de confirmar la venta. Esa acción se atribuye al usuario.
- La aceptación del cliente no se presume por la casilla del cajero. Si se exige evidencia de aceptación del cliente, definir un mecanismo y un documento/recibo adecuado al canal de venta, con minimización de datos y revisión legal. Una casilla local sin identidad o evidencia no prueba por sí sola aceptación contractual.
- No exigir firma, OTP, teléfono ni datos personales adicionales en la primera versión sin análisis de privacidad, coste y usabilidad.

## 8. Recuperación del BCV

- La recuperación de la fuente oficial no modifica ventas ni snapshots existentes.
- No cambiar automáticamente la fuente en medio de una venta.
- Cuando exista tasa BCV aplicable, la UI informa al administrador y recomienda cerrar/revocar la contingencia.
- Política recomendada: al vencimiento, pasar a modo normal BCV solo si existe tasa oficial aplicable y la configuración lo permite; de lo contrario, quedar en estado «sin tasa autorizada» y bloquear conversión. No usar tasa manual vencida ni BCV antiguo.
- La revocación es explícita y auditada; puede ser inmediata para nuevas ventas, pero no afecta operaciones ya finalizadas.
- No confiar en Cron para hacer cumplir vencimiento; toda consulta/checkout valida la hora y el estado.

## 9. Auditoría, reportes y alertas

Registro append-only para:
- solicitud, activación, aprobación/rechazo, renovación, cambio, revocación y expiración;
- actor, autenticación utilizada (tipo y resultado, nunca el secreto), organización, sucursal/alcance;
- tasa, unidad, motivo, nota, timestamps UTC y representación de hora Caracas;
- identificadores de correlación/idempotencia y versión de política;
- intentos fallidos y señales de abuso con retención proporcional;
- ventas que consumieron la autorización.

Prohibido actualizar o borrar eventos financieros desde rutas normales. Correcciones se registran como nuevos eventos compensatorios. La base de datos debe proteger auditoría frente al rol runtime con grants/constraints/triggers según el modelo de amenazas.

Panel Owner:
- contingencias activas, pendientes y vencidas;
- tasa, motivo, alcance, autor y vencimiento;
- ventas y volumen monetario que utilizaron cada autorización;
- historial de renovaciones/revocaciones;
- intentos fallidos y alertas.
Exportaciones sujetas a permisos y minimización.

Alertas: activación, primera venta, renovación, doble aprobación pendiente, vencimiento próximo, expiración, revocación, fallos de autenticación repetidos y nueva tasa BCV aplicable. No depender de proveedor pago; evaluar canales disponibles y coste $0 antes de prometer alertas externas.

## 10. Modelo de datos conceptual

Diseño lógico, no migración aprobada:
- `fx_policies`: política por organización, límites, delegación, MFA/doble aprobación y defaults; control de versión.
- `fx_contingency_authorizations`: solicitud/autorización inmutable con tenant, scope, rate, reason, start/end, creator, status, policy_version y approval requirements.
- `fx_contingency_approvals`: aprobaciones individuales ligadas a actores distintos y a la misma autorización.
- `fx_audit_events`: eventos append-only o integración con el ledger de auditoría existente.
- Checkout snapshot: referencia al identificador/versionado de autorización y datos FX congelados en la venta.

Antes de schema real: inspeccionar el modelo de auditoría y auth existente, evitar duplicación, definir claves foráneas compuestas tenant-safe, constraints, índices, ownership y grants mínimos. No añadir una tabla si el modelo existente cubre la misma función.

## 11. API conceptual

No son endpoints aprobados ni implementados:
- consultar política/estado vigente;
- solicitar autorización;
- aprobar/rechazar una autorización pendiente;
- revocar una autorización;
- consultar historial e informes.

Todas las mutaciones requieren autorización server-side, idempotencia, reautenticación cuando corresponda, validación de tenant/sucursal y transacción. El cliente nunca decide el rol ni el estado final. No exponer endpoints hasta aprobar matriz de permisos y cerrar gates de seguridad Nivel 1.

## 12. Seguridad, concurrencia y fallos

Pruebas requeridas antes de implementación:
- cross-tenant y cross-branch denegados;
- cashier y inventory no pueden autorizar;
- admin no delegado denegado;
- revocación de membresía/sesión invalida autorización posterior;
- PIN equivocado, rate limit, bloqueo y recuperación;
- segundo aprobador debe ser persona distinta;
- doble solicitud concurrente no crea dos autorizaciones activas incompatibles;
- expiración mientras una venta está en curso: checkout serializa/valida bajo transacción y guarda una única fuente;
- revocación concurrente con checkout tiene orden transaccional determinista;
- reintentos idempotentes no duplican eventos ni ventas;
- error DB, timeout, estado desconocido o reloj no confiable: fail-closed;
- tenant/sucursal no pueden alterar tasa ni autorización por payload;
- no hay secretos/PIN en logs, errores, analytics o auditoría;
- grants runtime no permiten borrar/reescribir autorizaciones ni auditoría;
- una venta histórica conserva exactamente su snapshot tras renovar, revocar o cambiar BCV.

## 13. Cumplimiento y transparencia

- La función es control operativo, no dictamen legal ni autorización para incumplir normativa.
- Validar con asesoría venezolana las reglas aplicables a tasa de cambio, IVA, documentos fiscales, fecha/hora de operación y aceptación del precio.
- Verificar fuentes primarias vigentes antes de publicar política por defecto.
- No presentar la tasa manual como tasa oficial, BCV, tasa fiscal ni referencia obligatoria.
- No etiquetar recibos internos como documentos fiscales válidos sin la validación exigida.
- La evidencia de aceptación no sustituye requisitos legales ni consentimiento válido.

## 14. Criterios de aceptación de producto

- [ ] Modo BCV sigue siendo predeterminado y no se activa contingencia automáticamente.
- [ ] Solo Owner o actores con permiso específico aprobado pueden autorizar.
- [ ] El cajero no puede cambiar tasa ni elevar privilegios.
- [ ] PIN individual en negocio pequeño y MFA en modalidad empresarial.
- [ ] Doble aprobación opcional con dos actores distintos.
- [ ] Autorización tiene motivo, tasa, alcance, inicio, expiración y actor.
- [ ] La tasa manual se identifica claramente y nunca como BCV.
- [ ] El checkout valida autorización en servidor y transacción.
- [ ] Venta guarda snapshot inmutable y evidencia diferenciada de cajero/cliente.
- [ ] Vencimiento/revocación bloquean nuevas ventas; no alteran ventas previas.
- [ ] Panel e historial permiten auditoría por organización/sucursal.
- [ ] Pruebas de aislamiento, concurrencia, idempotencia, abuso y fail-closed pasan.
- [ ] Revisión legal/contable completada antes de habilitar uso comercial.
- [ ] Ningún comportamiento se declara implementado hasta pasar CI exact-HEAD y revisión.

## 15. Secuencia recomendada de entrega

1. Resolver la compatibilidad con la matriz de permisos y aprobar el contrato comercial de excepción BCV.
2. Revisar el gate de seguridad Nivel 1 y el modelo de autenticación/MFA/PIN existente.
3. Auditar esquema de auditoría, tenancy y sucursales; producir diseño SQL con constraints/grants.
4. Implementar primero servicios y pruebas PostgreSQL en rama aislada.
5. Implementar API con autorización server-side e idempotencia.
6. Integrar checkout y snapshots.
7. Construir panel y UX para owner/admin/cashier.
8. Ejecutar pruebas unitarias, PostgreSQL, concurrencia, Playwright, seguridad y exact-HEAD CI.
9. Obtener revisión legal/contable y aprobación de política.
10. Habilitar gradualmente; feature flag por tenant, inicialmente desactivado, con rollback operativo.

## Historial de cambios

- 2026-11-09 — primera especificación basada en la conversación con el propietario. Propuesta aprobada para documentación; implementación, matriz de permisos, límites legales y habilitación siguen pendientes.
