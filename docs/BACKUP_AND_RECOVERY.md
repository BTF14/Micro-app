# Política de respaldo y recuperación — Micro app

**Estado:** diseño operativo obligatorio; la automatización independiente aún no está implementada ni verificada.  
**Objetivo de coste:** $0; no activar facturación, servicios pagos ni cargos automáticos.  
**Alcance:** datos comerciales, inventario y capacidad de recuperar el servicio.

## 1. Regla obligatoria para todas las IA

Antes de realizar cambios que puedan afectar datos reales, toda IA debe leer este documento y confirmar el estado real de los respaldos y de la restauración. La documentación no demuestra que existan copias válidas.

- Nunca afirmar que hay backup automático, restauración probada o recuperación garantizada sin evidencia reciente.
- No guardar dumps, CSV de clientes, ventas, pagos, inventario ni secretos en Git, commits, artefactos públicos, memoria auxiliar o logs.
- No crear una copia de producción en una rama de desarrollo y tratarla como backup independiente.
- No ejecutar restauraciones, borrados masivos ni reemplazos de la base principal sin revisar el impacto, confirmar destino y seguir el gate de `docs/CONSTITUTION.md`.
- Mantener la base de datos como fuente de verdad. Las copias deben cifrarse en tránsito y en reposo, tener acceso mínimo y estar separadas de la base primaria.
- Si el método de respaldo, destino, credenciales, retención, coste o restauración no están verificados, documentarlo como pendiente y no improvisar con datos reales.

## 2. Qué debe poder recuperarse

Prioridad de datos:

1. Catálogo: productos, SKU/códigos, categorías, precios y configuración relevante.
2. Inventario: existencias y, especialmente, libro completo de movimientos, ajustes, entradas, salidas y vínculo con operaciones.
3. Operaciones: ventas finalizadas, líneas de venta, pagos, devoluciones, anulaciones/reversiones y cierres de caja.
4. Datos de negocio necesarios para operar: comercios/tenants, usuarios, membresías y roles, clientes cuando existan, configuración y reglas fiscales versionadas.
5. Auditoría y trazabilidad: quién hizo cada operación, cuándo, motivo, tasa/cambio aplicado y referencias necesarias.
6. Esquema y migraciones: código versionado, migraciones aplicadas y procedimiento de reconstrucción.

No basta con respaldar la cantidad actual de stock: deben preservarse los movimientos y las relaciones que permiten auditar y reconstruir el estado. Evitar incluir datos personales que no sean necesarios.

## 3. Frecuencia y retención recomendadas

- **Backup lógico diario** (por ejemplo, `pg_dump` consistente) una vez que exista un destino independiente, privado, cifrado y de coste confirmado en $0. Ejecutarlo automáticamente y alertar ante fallos; no subir el archivo al repositorio.
- **Recuperación rápida del proveedor:** usar la ventana de restauración de Neon como una capa adicional, no como único backup. La documentación oficial consultada el 2026-10-18 indica que Free ofrece hasta 6 horas de historial PITR, limitado a 1 GB de historial, y solo una instantánea manual; los backups programados de Neon no están disponibles en Free. Ver [historial de Neon](https://neon.com/docs/postgres/backup-restore/history-window) y [planes de Neon](https://neon.com/docs/introduction/plans). Confirmar estos límites en la consola antes de depender de ellos.
- **Retención inicial sugerida:** 7 copias diarias y 4 copias semanales, solo si el destino lo permite sin coste y sin incumplir límites. No guardar copias indefinidamente. La política final debe cumplir requisitos legales de conservación aplicables, que aún requieren validación.
- **Revisión cada 15 días:** verificar ejecuciones, fecha y tamaño de la última copia, accesos, retención, costes y errores; hacer una prueba de restauración en un entorno aislado cuando haya cambios relevantes y, como mínimo, definir y ejecutar un calendario de prueba periódica antes de producción.
- **Tras cambios de esquema importantes:** crear un punto de recuperación comprobado antes de migrar, y ensayar la migración y rollback en una base desechable.
- **Antes de producción y antes de la primera mutación real de Neon `main`:** comprobar un camino de recuperación real y documentado. Una ventana PITR de seis horas no protege frente a errores descubiertos días después ni sustituye una copia externa.

La frecuencia diaria corresponde al proceso automático de datos; la revisión humana/técnica cada 15 días no crea archivos extra ni genera ruido en Git.

## 4. Selección de destino y límite de $0

Neon Free no ofrece backups programados de snapshots según su documentación actual. Por tanto, no asumir que la consola está generando un backup diario.

Antes de implementar el dump automático, comparar opciones independientes (por ejemplo, almacenamiento privado de objetos o un destino de backup administrado por el usuario) verificando precio, cuotas, límites de transferencia, retención, autenticación, restauración y riesgo de suspensión. No elegir un proveedor ni habilitar un servicio hasta confirmar explícitamente que se mantiene en $0 y no tiene cargos automáticos.

GitHub Actions puede coordinar una tarea, pero los artefactos de Actions no deben asumirse como almacenamiento permanente o backup suficiente sin verificar retención, límites, permisos, exposición de datos y proceso de recuperación. No persistir dumps de producción en artifacts como solución improvisada.

Si todavía no hay un destino independiente seguro y gratuito, mantener el backup automatizado como **bloqueante pendiente de diseño**, registrar el riesgo y no anunciarlo como completado. No crear un workflow que parezca exitoso pero no copie los datos a un destino recuperable.

## 5. Seguridad del proceso

- Usar credenciales de solo lectura para el origen siempre que el método lo permita.
- Guardar secretos únicamente en el almacén de secretos adecuado; nunca imprimirlos ni incluirlos en argumentos/logs visibles.
- Cifrar antes de transferir y comprobar integridad mediante checksum.
- Limitar quién puede leer, descargar, restaurar o borrar copias.
- Separar permisos de ejecución y de borrado; preferir retención automática a borrado manual frecuente.
- No incluir tarjetas, contraseñas, tokens de sesión ni secretos de proveedores en los datos de respaldo.
- Registrar metadatos no sensibles: fecha, resultado, tamaño, checksum, versión de esquema, destino lógico y duración; nunca la cadena de conexión.
- En caso de fallo, alertar y conservar la última copia válida. No sobrescribir la única copia válida con una copia incompleta.

## 6. Pruebas de recuperación y criterios de aceptación

Un sistema de backup no se considera listo hasta que:

- [ ] La ejecución programada funciona y su fallo genera alerta visible.
- [ ] Se verifica que la copia no está vacía, se puede descifrar y su checksum coincide.
- [ ] La copia puede restaurarse en una base PostgreSQL aislada sin afectar Neon `main`.
- [ ] Las migraciones y restricciones de integridad pasan tras restaurar.
- [ ] Se validan conteos y relaciones de productos, movimientos, ventas, pagos y auditoría con datos de prueba; no imprimir datos personales.
- [ ] Se mide el tiempo de recuperación y la pérdida máxima de datos esperable.
- [ ] La retención elimina copias vencidas sin eliminar la última copia válida.
- [ ] Se demuestra que no hay costes ni cargos automáticos fuera del presupuesto.
- [ ] El procedimiento de recuperación está documentado y una segunda IA puede ejecutarlo siguiendo pasos comprobables.

Definir objetivos iniciales para aprobar antes de producción: RPO (máxima pérdida de datos tolerable) de 24 horas como techo provisional para backups diarios y RTO (tiempo objetivo de recuperación) por medir en pruebas. Para inventario/ventas en uso real, evaluar si un RPO de 24 horas es aceptable; si no lo es, el diseño diario no basta y debe resolverse antes de lanzar.

## 7. Procedimiento ante pérdida o corrupción

1. Detener operaciones de escritura afectadas si continuar podría agravar la pérdida; comunicar el impacto.
2. Identificar proyecto, rama, base y ventana temporal exactos. No ejecutar una restauración sobre la principal por intuición.
3. Preservar el estado actual y evidencia cuando sea posible.
4. Restaurar primero en una rama/base aislada y validar integridad y consistencia.
5. Comparar los datos recuperados con la evidencia de auditoría y determinar las operaciones que faltan o deben reconciliarse.
6. Obtener aprobación explícita antes de reemplazar datos reales o cambiar la línea temporal de Neon `main`.
7. Ejecutar recuperación aprobada, verificar integridad, documentar SHA de código, punto de restauración, pruebas y resultado.
8. No inventar ni reconstruir silenciosamente ventas o movimientos financieros; registrar reconciliaciones como operaciones auditables.

## 8. Estado actual y próximo trabajo

- Neon Free documentado: PITR hasta 6 horas/1 GB de historial; una snapshot manual; no hay backups programados de Neon Free (ver fuentes arriba; revalidar en consola).
- No se ha verificado una copia externa automática, un destino de backup independiente ni una restauración de producción.
- La aplicación aún tiene trabajo P0 en autorización multiempresa y flujos reales de venta/inventario; no debe tratarse como sistema de producción.
- Próximo paso: diseñar un mecanismo de dump cifrado, programado, privado y de coste $0; verificar destino y secretos; probar primero contra PostgreSQL desechable; añadir alerta de fallo y prueba de restauración; solo después habilitarlo para datos reales.

## Fuentes

- [Neon — History window](https://neon.com/docs/postgres/backup-restore/history-window)
- [Neon — Plans](https://neon.com/docs/introduction/plans)
- [Neon — Instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore)
