# Requisitos de cumplimiento y operación — Micro app

Estado: borrador de requisitos de producto; no constituye asesoría legal ni certificación fiscal.
Alcance: POS e inventario para comercios, con foco inicial en Venezuela.
Última revisión documental: 2026-10-17.

## Principios de implementación

- No presentar una función como disponible hasta que esté implementada, probada y habilitada.
- Los porcentajes, reglas fiscales y fuentes de tasas deben ser configurables y versionados; no codificar una tasa legal como universal.
- Toda operación monetaria debe conservar moneda original, tasa aplicada, fecha/hora, fuente y totales calculados.
- No guardar contraseñas, datos de tarjetas ni datos personales innecesarios.
- Mantener la migración inicial de Neon sin aplicar a la rama principal hasta recibir autorización explícita.

## Matriz priorizada

| ID | Requisito | Prioridad | Criterio de aceptación | Estado actual |
|---|---|---|---|---|
| UX-01 | Interfaz adaptable | Alta | Flujo de caja e inventario utilizable en móvil, tablet y escritorio; navegación por teclado, foco visible, contraste suficiente y pruebas de viewport. | Parcial: existe un shell responsivo, no hay flujos comerciales funcionales. |
| PRIV-01 | Política de privacidad | Alta antes de usuarios reales | Publicar qué datos se recopilan, finalidad, base legal, conservación, proveedores, seguridad, derechos y contacto del responsable. | Pendiente. |
| PRIV-02 | Minimización de datos | Alta | Recoger solo datos necesarios; evitar datos sensibles por defecto; documentar propósito y retención por campo. | Pendiente de implementación y revisión. |
| LEG-01 | Términos de uso | Alta antes de lanzamiento | Documentar licencia, responsabilidades, límites razonables, soporte, disponibilidad, terminación y resolución de disputas; revisión legal local. | Pendiente. |
| ID-01 | Identificación del proveedor | Media/alta | Mostrar razón social o responsable, contacto de soporte y datos del proveedor que correspondan legalmente. No inventar una razón social. | Pendiente de confirmar datos reales. |
| OBS-01 | Analíticas mínimas | Media | Priorizar errores y rendimiento; no capturar contenido de ventas, nombres de clientes, tokens ni secretos en logs. Documentar cualquier telemetría. | Pendiente. |
| INT-01 | Transparencia de terceros | Alta | Inventariar proveedores y APIs, finalidades, datos transmitidos, dependencia y comportamiento ante caída. | Pendiente. |
| FX-01 | Tasa oficial BCV | Alta para conversión VES/USD | Consumir una fuente verificable; guardar tasa, fecha de vigencia, hora de consulta y fuente; validar respuesta; alertar por antigüedad; no sustituir silenciosamente una tasa fallida. | Pendiente; no existe integración. |
| FX-02 | Caída o retraso de tasa | Alta | Mostrar explícitamente la fecha de la última tasa válida y bloquear o exigir confirmación según política aprobada; nunca afirmar que es actual si está vencida. | Pendiente. |
| TAX-01 | Configuración de IVA | Alta antes de uso fiscal | Configurar alícuotas y excepciones por producto/operación según asesoría vigente; almacenar desglose y regla aplicada en cada venta. | Pendiente. |
| TAX-02 | Configuración de IGTF | Alta antes de uso fiscal | Aplicar solo cuando corresponda según sujeto, operación, medio de pago y normativa vigente; configurar la alícuota con fecha de vigencia y guardar la justificación/regla aplicada. | Pendiente. |
| AUD-01 | Historial de ventas inmutable por diseño | Alta | No editar ni borrar ventas finalizadas de forma ordinaria; usar anulaciones/reversiones con usuario, fecha, motivo y vínculo al original. Controlar permisos y auditar cambios. | Pendiente; el esquema por sí solo no garantiza inmutabilidad. |
| AUD-02 | Integridad de inventario | Alta | Registrar movimientos de inventario vinculados a operaciones; ejecutar venta, pagos, existencias y libro de movimientos en una sola transacción; evitar stock negativo según política. | Pendiente. |
| FISC-01 | Estado fiscal transparente | Bloqueante antes de emitir documentos | Confirmar requisitos aplicables de SENIAT y equipos/sistemas fiscales. Si no está autorizado/homologado cuando sea exigible, etiquetar claramente documentos como control interno y no presentarlos como facturas fiscales. | Pendiente de validación legal/técnica. |
| OFF-01 | Operación sin conexión | Media | Definir qué funciones funcionan offline, cómo se encolan operaciones, cómo se resuelven conflictos y qué se pierde ante cierre, fallo eléctrico o limpieza del dispositivo. No prometer sincronización hasta probarla. | Pendiente; no hay modo offline implementado. |
| DATA-01 | Exportación y respaldo | Alta | Permitir exportar datos autorizados (por ejemplo CSV) y definir copias de seguridad, restauración, retención, control de acceso y pruebas de recuperación. | Pendiente. |
| DATA-02 | Baja y eliminación | Alta | Definir solicitud de baja, exportación previa, plazos y eliminación; preservar registros que deban conservarse legalmente y explicar excepciones. | Pendiente. |
| SEC-01 | Autenticación y roles | Bloqueante antes de datos reales | Implementar autenticación, aislamiento por comercio/tenant, autorización en servidor, gestión de sesiones y pruebas de acceso cruzado. | Pendiente; todavía no hay autenticación real. |
| REL-01 | Pruebas de negocio y recuperación | Alta | Probar transacciones fallidas, concurrencia de ventas/stock, idempotencia, restauración, errores de tasa y límites de permisos con base de pruebas separada. | Pendiente. |

## Reglas de diseño para dinero e impuestos

1. No usar porcentajes fijos en el código como si fueran aplicables a todos los comercios.
2. Mantener configuración de impuestos con alícuota, vigencia desde/hasta, ámbito, motivo y referencia normativa revisada.
3. Para cada pago, conservar importe y moneda de origen; para conversiones, conservar la tasa exacta y el instante/fuente utilizados.
4. No calcular IGTF únicamente porque el pago esté denominado en divisas: primero debe determinarse si la operación está gravada y quién es el sujeto aplicable.
5. Separar documentos de control interno de documentos fiscales. No usar la palabra “factura fiscal” ni afirmar homologación sin verificación.
6. Las ventas finalizadas se corrigen mediante notas de reversión/anulación auditables, no mediante edición silenciosa.

## Revisión normativa y fuentes a verificar

- Banco Central de Venezuela (fuente primaria para publicaciones de tasa): https://www.bcv.org.ve/
- SENIAT (fuente primaria para obligaciones tributarias y sistemas de facturación): http://www.seniat.gob.ve/
- Ley de IGTF y reformas: verificar texto consolidado y Gaceta Oficial vigente antes de programar reglas.
- Decreto 4.972, Gaceta Oficial Extraordinaria 6.821 (12-07-2024), referido a alícuota 0% para determinados contribuyentes y mantenimiento de la regla específica para los supuestos de los numerales 5 y 6: consultar el texto oficial y confirmar si hubo modificaciones posteriores.
- Para IVA, IGTF, máquinas fiscales, documentos equivalentes, conservación de registros y protección de datos: solicitar revisión de un profesional venezolano con normativa vigente.

Las fuentes secundarias pueden ayudar a localizar normas, pero no deben ser la única base para una regla fiscal automatizada. Esta revisión no confirma que las alícuotas o requisitos mencionados sigan vigentes a la fecha de lanzamiento.

## Secuencia recomendada

1. Confirmar modelo de negocio, usuarios, datos recogidos y responsabilidades contractuales.
2. Revisar legalmente IVA, IGTF, documentos fiscales y conservación de registros.
3. Implementar autenticación y aislamiento por comercio antes de almacenar datos reales.
4. Implementar operaciones POS/inventario con transacciones, auditoría e idempotencia.
5. Integrar tasa BCV con trazabilidad y política de contingencia.
6. Implementar exportación, respaldos, restauración y baja.
7. Ejecutar pruebas funcionales, de seguridad, concurrencia y accesibilidad.
8. Publicar términos y privacidad, y habilitar producción solo después de validar requisitos legales y técnicos.

## Estado técnico conocido al documentar

- La interfaz es un shell provisional y no está conectada a datos comerciales.
- La API no tiene autenticación real ni endpoints comerciales.
- Existe un esquema SQL versionado, pero la migración inicial no se ha aplicado a la rama principal de Neon.
- Hay una rama de trabajo para el adaptador de transacciones Neon; aún requiere CI y pruebas de integración.
- No hay despliegue de producción ni integración real con BCV.
