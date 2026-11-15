# ADR — Alcance de producto y roadmap v1.1

- **ID:** ADR-20261114-v11-product-scope-and-roadmap
- **Estado:** accepted
- **Fecha:** 2026-11-14
- **Responsables:** propietario del producto y mantenimiento técnico
- **Relacionado:** odd/tasks/adr-v11-roadmap-and-owner-confirmations.md; PR #369 (esta documentación); PR #193 (OPEN, fuera de alcance); Issue #53 (OPEN/P0)

## Contexto y problema

Micro-app ya dispone en main de una base de catálogo, inventario por sucursal, recepciones, POS/checkout, cajas/turnos, tasa BCV, controles de autorización y pruebas full-stack. La siguiente evolución debe mantenerse pequeña, secuenciada y sin reabrir decisiones de hardware, coste o alcance fiscal ya confirmadas por el propietario.

El producto de esta etapa es una herramienta operativa interna para PC y teléfono: inventario, verificación rápida de precios USD/VES con tasa BCV y control interno de caja/ventas. El terminal bancario físico Android del comercio funciona de forma totalmente independiente. No existe ni se desea integración directa con el navegador, Bluetooth o Wi-Fi. Una venta liquidada por ese terminal se registra en Micro-app con el método Tarjeta / Punto (card) y la referencia del voucher en payments.reference.

Micro-app genera comprobantes de control interno identificados como FISC-01; no emite facturas fiscales SENIAT ni pretende sustituir equipos/sistemas fiscales homologados.

## Decisión

### Alcance confirmado por el propietario

1. Operación desde PC y teléfono para inventario, consulta/verificación rápida de precios USD/Bs. con tasa BCV y control interno de caja/ventas.
2. Terminal bancario Android independiente y sin integración de red o periféricos con Micro-app. La conciliación interna conserva método card y payments.reference.
3. Comprobante FISC-01 exclusivamente interno, con la leyenda visible **COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL**.
4. Presupuesto objetivo USD 0 y permanencia en niveles gratuitos; no habilitar pagos, billing ni servicios de alerta pagados.

### Congelación de nuevas funciones

Se congela la implementación de nuevas funcionalidades comerciales hasta observar la primera tasa BCV real persistida en Neon main en la ventana del lunes **2026-11-16 22:00 UTC (18:00 VET)** y comprobar estabilidad posterior del ciclo de sincronización. Una ejecución sintética, un build o un estado de CI no satisface el gate. La documentación y la preparación de decisiones no levantan el freeze.

### Roadmap v1.1 aprobado y ordenado

Las tres PR siguientes son unidades separadas. El orden no se altera ni se paraleliza antes de levantar el freeze. Este ADR aprueba el alcance de diseño; cada PR futura deberá cumplir sus propios gates, pruebas y revisión.

#### PR 1 — Importador CSV de catálogo

- Procesar CSV UTF-8 con BOM en frontend; no enviar el archivo original al servidor.
- Admitir dialecto internacional (coma como delimitador de columnas y punto decimal) y dialecto regional tipo Excel (punto y coma como delimitador y coma decimal). Detectar el dialecto con encabezados/consistencia; ofrecer selección manual si hay ambigüedad.
- Mostrar vista previa normalizada y errores/conflictos antes de confirmar.
- Procesar lotes de 100 filas, con máximo inicial de 1.000 filas por importación.
- Ajustar un límite de payload propio, inicialmente alrededor de 256 KiB, validado contra el tamaño real de los datos; no reutilizar sin análisis el límite del endpoint individual.
- Persistir en servidor mediante operación set-based dentro de una transacción.
- Crear catalog_import_batches para idempotencia persistente: ámbito de organización/sucursal, clave de idempotencia y hash canónico del request. Repetir la misma clave y hash devuelve el resultado previo; la misma clave con hash distinto responde HTTP 409.
- El importador solo modifica catálogo. No escribe stock directamente ni acepta cantidades iniciales como sustituto del proceso de conteo/recepción. La inicialización de existencias sigue siendo una operación separada, trazable y autorizada.

#### PR 2 — Escáner móvil de códigos de barras

- Usar BarcodeDetector cuando el navegador lo soporte y cámara mediante getUserMedia.
- Mantener fallback manual obligatorio para navegadores/dispositivos sin soporte, permisos denegados o cámara no disponible.
- No enviar imágenes o video a servidores; el reconocimiento ocurre en el dispositivo.
- No incorporar inicialmente una dependencia pesada. Detener la cámara al salir/cambiar de flujo y evitar detecciones repetidas.
- Conectar el resultado al verificador rápido de precios USD/VES, no a un nuevo flujo de venta autónomo.

#### PR 3 — Cierre de caja, reportes y exportación CSV

- Incluir resumen del cierre de caja y reportes Diario, Semanal, Mensual y por rango personalizado, con exportación CSV útil para el contador.
- Definir intervalos semiabiertos [inicio, fin) en America/Caracas; la semana comienza el lunes. Convertir los límites locales a instantes correctos antes de consultar PostgreSQL.
- Contabilizar ventas con sales.status = 'completed' usando completed_at, no created_at; contabilizar cierres de turno mediante register_shifts.closed_at.
- Consultar el modelo existente sales, payments (incluido el método other), sale_items y register_shifts. Mantener filtros de organización/sucursal/permiso en servidor.
- Usar snapshots históricos sales.exchange_rate_snapshot y payments.exchange_rate_snapshot / payments.usd_equivalent_snapshot; nunca recalcular ventas pasadas con la tasa BCV actual.
- Mantener aritmética exacta PostgreSQL NUMERIC y serializar decimales como strings/cadenas canónicas; no convertir importes a IEEE-754 Number.
- Añadir el permiso reports.inventory.valuation con alcance **Owner-only**. Para Cashier, el backend no debe seleccionar, devolver ni exportar products.cost_usd, sale_items.unit_cost_usd ni costes históricos. La autorización se aplica en servidor y en la consulta/proyección SQL, no solo ocultando columnas en UI.
- Neutralizar CSV Formula Injection en campos de texto no confiables (nombres, SKU, referencias de voucher y otros textos), sin alterar importes numéricos validados. La neutralización y el quoting CSV son controles separados.
- Mostrar en el comprobante la leyenda **COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL**; las exportaciones no se presentan como libros o documentos fiscales certificados.
- Evaluar índices candidatos mediante EXPLAIN y volúmenes realistas antes de proponer una migración aditiva opcional. No añadir índices preventivamente sin evidencia.

### Confirmaciones operativas del propietario

Se registran en docs/PRODUCTION_READINESS.md con la marca **CONFIRMADO POR EL PROPIETARIO — NO VOLVER A PEDIR**: presupuesto $0 / Workers Free sin método de pago; canal de alertas por correo de GitHub Workflows verificado por el propietario más panel BCV y logs gratuitos; RPO diario aproximado de 24 horas aceptado; y alcance FISC-01 exclusivamente interno. La aceptación del RPO no equivale a medición/aceptación de RTO.

## Alternativas consideradas

- **Implementar importación, escáner y reportes en una sola PR:** rechazada. Mezcla dominios, amplía el riesgo y dificulta aislar aceptación y regresiones.
- **Procesar XLSX en servidor desde la primera versión:** rechazada. CSV UTF-8/BOM reduce dependencias, superficie de ataque y coste; XLSX puede evaluarse después con necesidad demostrada.
- **Conectar el terminal bancario Android a Micro-app:** rechazada. El hardware existente es independiente; el registro de método y referencia del voucher cubre la conciliación interna.
- **Importar cantidades de stock junto con catálogo o actualizar stock directamente:** rechazada. El stock inicial debe seguir conteo/recepción auditables y su autorización específica.
- **Recalcular reportes históricos con la tasa BCV vigente:** rechazada. Alteraría retrospectivamente equivalentes y totales; se usan snapshots de la operación.
- **Usar floats o neutralizar todos los campos CSV indiscriminadamente:** rechazada. Importes exactos y textos no confiables requieren tratamientos distintos.

## Consecuencias y riesgos

- La secuencia limita el cambio comercial y mantiene el freeze hasta evidencia real del BCV y estabilidad posterior.
- PR1 necesita validación robusta de dialectos, comillas, duplicados, payload, idempotencia concurrente, aislamiento tenant/sucursal y rollback atómico.
- PR2 depende de soporte real de cámara/navegador y permisos del dispositivo; el fallback manual es obligatorio.
- PR3 requiere revisar estados anulados/reembolsados, cierres, permisos y agregaciones sin inferir que existe un módulo completo de reversos. No se debe presentar un neto fiscal ni reconstruir operaciones compensatorias no implementadas.
- El permiso de valoración Owner-only debe ser independiente de permisos operativos de inventario o lectura de costes de catálogo.
- El RPO diario (~24 h) está aceptado por el propietario para esta etapa; el RTO permanece pendiente de medición y aceptación si se ejecuta una prueba formal de restauración.
- El uso de FISC-01 no constituye dictamen legal ni fiscal. Si en el futuro se habilita facturación fiscal SENIAT, deberá abrirse una decisión y revisión legal/técnica específica antes de implementar o emitir documentos fiscales.
- La aplicación permanece **PRODUCTION: NOT READY** mientras sigan abiertos los gates BCV, estabilidad, Issue #53 y aprobación final.

## Reversión o sustitución

El roadmap puede cambiarse mediante un ADR sucesor que identifique expresamente qué decisiones sustituye. No borrar este historial. La implementación futura puede pausarse o dividirse si la evidencia de pruebas, seguridad, coste o uso real contradice el alcance. Ninguna parte de este ADR autoriza migraciones en Neon main, cambios de permisos productivos, despliegues manuales ni facturación fiscal.

## Evidencia

- **Repositorio/rama/PR:** BTF14/Micro-app; base main; rama documental docs/adr-v11-roadmap-owner-confirmations-20261114; PR documental única #369: https://github.com/BTF14/Micro-app/pull/369.
- **SHA exacto de base:** fac1e87d4cd9569b92cfc5fbaa41706f99b72430.
- **Archivos y evidencia de código:** apps/api/src/authorization.ts, tenant-context.ts, branch-context.ts, runtime-write-rate-limit.ts, catalog.ts, sales-checkout.ts, register-shifts.ts, inventory-receipts.ts, exchange-rates.ts y apps/api/src/index.ts; workflow .github/workflows/playwright-e2e.yml; validación documental .github/workflows/odd-docs-validation.yml.
- **Esquema:** main versiona migraciones 0001–0025; el ledger de Neon main registró 25 migraciones aplicadas en la verificación read-only previa. Las tablas de operación incluyen sales, payments, sale_items, register_shifts, bcv_sync_state y audit_logs; los roles de migración, runtime, sincronización BCV y backup son separados.
- **Limitaciones:** esta tarea no vuelve a consultar ni muta Neon, no observa la futura ejecución real del 2026-11-16 y no certifica producción. Los checks de la nueva PR documental se deben validar en su HEAD final exacto.

## Historial

- 2026-11-14 — ADR aceptado para fijar alcance v1.1, secuencia de implementación y confirmaciones del propietario; no implica que las tres PR futuras estén implementadas.
