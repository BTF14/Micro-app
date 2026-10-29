# Política de respaldo y recuperación — Micro app

**Estado:** el workflow diario cifrado y el destino privado tienen una ejecución real verificada; el 2026-10-29 se restauró correctamente el backup cifrado en una rama PostgreSQL desechable y pasaron las cinco verificaciones técnicas. La recuperación técnica está probada para la copia examinada, pero la validación de datos de negocio sigue parcial porque las tablas de ventas, productos, pagos, movimientos y auditoría estaban vacías en esa copia. No declarar probado el RPO/RTO ni todo el ciclo operativo de backup hasta completar los pendientes de la sección 6.  
**Objetivo de coste:** $0; no activar facturación, servicios pagos ni cargos automáticos.  
**Alcance:** datos comerciales, inventario y capacidad de recuperar el servicio.

## 1. Regla obligatoria para todas las IA

Antes de realizar cambios que puedan afectar datos reales, toda IA debe leer este documento y confirmar el estado real de los respaldos y de la restauración. La documentación no demuestra que existan copias válidas.

- Nunca afirmar que hay backup automático, restauración probada o recuperación garantizada sin evidencia reciente.
- Política de retención vigente: el workflow permanente genera un backup diario y conserva los últimos 15 días; elimina solo los backups cuya fecha UTC validada en el nombre supera los 15 días, junto con su checksum. No borrar automáticamente la copia más reciente por el mero hecho de crear una nueva ni acortar la ventana sin análisis de riesgo/coste y cambio revisado.
- La retención no valida la calidad de una copia. Ante un fallo de generación/subida/validación, conservar las copias anteriores y emitir una alerta visible; nunca eliminar la última copia válida para reemplazarla por una copia incompleta. La retención actual se corrige en PR #129 y tiene pruebas unitarias en CI.
- No presentar la retención de 15 días como garantía de recuperación: las pruebas de restauración aislada con datos sintéticos poblados, manifiesto de conteos/relaciones, RPO/RTO, alerta de fallo y coste $0 siguen siendo criterios pendientes hasta tener evidencia.
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

- **Backup lógico diario implementado:** `.github/workflows/backup.yml` ejecuta `pg_dump`, cifra con `age` y sube el resultado al repositorio privado `BTF14/micro-app-backups`; el objetivo de coste sigue siendo $0. La última ejecución programada observada en esta revisión fue el 2026-10-28 y terminó en `success` ([run 40698423050](https://github.com/BTF14/Micro-app/actions/runs/40698423050)). Esto no demuestra que el próximo ciclo se ejecute ni que todas las copias sean restaurables.
- **Visibilidad de fallos:** el workflow añade un resumen visible en la ejecución de GitHub Actions cuando un paso falla, con enlace al run y recordatorio de conservar las copias previas. No es una notificación externa ni garantiza correo/push; la visibilidad debe revisarse en Actions.
- **Recuperación rápida del proveedor:** usar la ventana de restauración de Neon como una capa adicional, no como único backup. La documentación oficial consultada el 2026-10-18 indica que Free ofrece hasta 6 horas de historial PITR, limitado a 1 GB de historial, y solo una instantánea manual; los backups programados de Neon no están disponibles en Free. Ver [historial de Neon](https://neon.com/docs/postgres/backup-restore/history-window) y [planes de Neon](https://neon.com/docs/introduction/plans). Confirmar estos límites en la consola antes de depender de ellos.
- **Retención implementada y vigente:** 15 días de backups diarios en el repositorio privado `BTF14/micro-app-backups`. El workflow aplica la retención después de subir la copia cifrada; `scripts/prune_backups.py` calcula la antigüedad a partir del timestamp UTC validado del nombre `backup-YYYY-MM-DDTHH-MM-SSZ.dump.age`, no de los mtimes del checkout, y elimina también el checksum emparejado. La corrección está en PR #129, fusionada, con pruebas unitarias en CI.
- **Decisión de seguridad:** mantener los 15 días por ahora. No borrar copias recientes al crear una nueva ni reducir el plazo por conveniencia. Cambiarlo solo tras revisar necesidades de recuperación, límites del destino, coste $0 y requisitos de conservación aplicables. Una copia nueva no prueba que sea restaurable; conservar la última copia válida y alertar visiblemente ante fallos.
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

- [x] Hay una ejecución programada reciente observada con resultado `success` (run [40698423050](https://github.com/BTF14/Micro-app/actions/runs/40698423050), 2026-10-28). Verificar de nuevo después de la siguiente ventana programada.
- [x] El workflow publica un resumen visible en GitHub Actions si falla un paso. Esto no es una notificación externa; confirmar si las notificaciones nativas de GitHub cubren la necesidad operativa.
- [x] Se verificó que la copia cifrada no está vacía, se descifra y su checksum coincide (run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)).
- [x] La copia pudo restaurarse en la rama PostgreSQL desechable `restore-test-20261028`, sin usar Neon `main` (run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)).
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
- El destino independiente actual es el repositorio privado `BTF14/micro-app-backups`; no se usa Cloudflare R2 porque requiere tarjeta y el proyecto mantiene el objetivo de coste $0.
- El workflow `.github/workflows/backup.yml` se programa diariamente, usa el rol de solo lectura `backup_readonly`, excluye `auth_sessions` y `auth_rate_limits` y cifra con `age` antes de subir. Retención vigente: 15 días; PR #129 corrigió la antigüedad para usar el timestamp UTC validado del nombre del backup en vez de `find -mtime`, elimina el checksum emparejado y añade pruebas unitarias en CI. La PR está fusionada y sus checks pasaron.
- **Regla operativa para toda IA/sesión futura:** no borrar las copias recientes al crear una nueva; eliminar solo las que superen 15 días. Si falla una ejecución o la copia nueva no se valida, conservar la última copia válida y generar/confirmar una alerta visible. Retención no equivale a restauración probada. No cambiar el plazo sin análisis de recuperación, coste $0 y revisión del cambio.
- **Ejecución real verificada:** run [40587638159](https://github.com/BTF14/Micro-app/actions/runs/40587638159) terminó en success el 2026-10-27. Se confirmó que el archivo cifrado llegó a `daily/` y que el checksum coincide. No se imprimió ni inspeccionó el contenido descifrado.
- El propietario confirma que `DATABASE_URL_BACKUP_RO` y `BACKUP_REPO_TOKEN` siguen presentes; son los dos secretos que reporta en la lista actual. `RESTORE_TEST_AGE_KEY` fue eliminado y `RESTORE_TEST_DB_URL` ya no aparece en la lista actual según confirmación visual del propietario.
- **Restauración técnica verificada el 2026-10-29:** el run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) seleccionó `backup-2026-10-28T13-39-39Z.dump.age`, verificó el checksum, descifró el dump, lo restauró en la rama desechable y pasó las cinco verificaciones: 13 tablas esperadas, conteos ejecutables, 186 constraints presentes, 0 membresías huérfanas y ausencia de `auth_sessions`/`auth_rate_limits`. No se accedió a Neon `main`.
- **Limitación importante de los datos restaurados:** `organizations=1`, `app_users=1`, `organization_members=1`, `auth_allowlist=1`, `auth_bootstrap=1`; `products`, `suppliers`, `exchange_rates`, `sales`, `sale_items`, `payments`, `inventory_movements` y `audit_logs` tenían 0 filas. Por tanto, se verificó el camino de restauración y la integridad estructural, pero no la recuperación de registros de negocio poblados ni una comparación de conteos con un manifiesto original.
- **Pendientes para cerrar todo el punto de backup:** validar una copia de prueba con datos sintéticos en tablas comerciales relacionadas, generar y comparar un manifiesto de conteos/relaciones, medir RPO/RTO de extremo a extremo, comprobar alerta de fallo y coste real $0. La llave privada `age` sigue bajo custodia del propietario; no pedirla por chat ni acceder a Neon `main`. La restauración queda para la última fase.
- La aplicación aún tiene trabajo P0 de autorización multiempresa y flujos comerciales; el backup verificado no significa que el producto esté listo para producción.

## Fuentes

- [Neon — History window](https://neon.com/docs/postgres/backup-restore/history-window)
- [Neon — Plans](https://neon.com/docs/introduction/plans)
- [Neon — Instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore)


## Evaluación de Google Drive (2026-10-18)

Ver [evaluación detallada de Google Drive](GOOGLE_DRIVE_BACKUP_EVALUATION.md). Google Drive personal es un candidato viable condicionado, no una copia activa ni un destino ya aprobado. Los 15 GB de una cuenta Google se comparten entre Gmail, Drive y Photos. La automatización requiere OAuth persistente y secretos seguros; las cuentas de servicio no tienen almacenamiento propio para poseer archivos en My Drive. No habilitar billing ni asumir que el OAuth de prueba dura indefinidamente. Antes de usar datos reales, probar cifrado, subida, descarga, checksum y restauración con PostgreSQL desechable y datos sintéticos. Espacio libre, acceso a la cuenta y credenciales siguen sin verificar.


## Registro de continuidad — 2026-10-29, después de PR #127

- PR [#127](https://github.com/BTF14/Micro-app/pull/127) está fusionada; el workflow temporal de restauración fue retirado. No recrearlo como solución automática.
- Run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) valida checksum, descifrado y restauración técnica en PostgreSQL desechable, además de 13 tablas, 186 constraints, cero membresías huérfanas y exclusión de tablas de sesión/rate-limit.
- Límite importante: los datos comerciales y de auditoría de la copia probada estaban vacíos. La recuperación de datos de negocio poblados y la comparación con manifiesto del origen no están probadas.
- Limpieza: el propietario confirma la eliminación del secreto temporal `RESTORE_TEST_AGE_KEY`; `RESTORE_TEST_DB_URL` sigue pendiente de eliminación/confirmación. No solicitar ni registrar valores secretos.
- La rama Neon `restore-test-20261028` seguía existiendo en la última consulta. El intento de eliminación por herramienta fue bloqueado por controles de seguridad; no afirmar que se borró. Si se elimina manualmente, comprobar proyecto y branch ID antes de confirmar y no seleccionar `main`.
- Próximo paso: inspeccionar los mecanismos permanentes de backup y planear una sola prueba con datos sintéticos poblados en PostgreSQL desechable. Comparar un manifiesto de conteos y relaciones, y registrar RPO/RTO, alertas, retención y coste. No usar datos reales, Neon `main` ni producción; no cerrar la tarea hasta tener evidencia.
