## ESTADO OPERATIVO VIGENTE — restauración del backup remoto verificada (2026-10-29 UTC)

- **Prueba real completada:** [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124), workflow `.github/workflows/backup-real-restore.yml`, terminó en `success`.
- **Archivo exacto probado:** `daily/backup-2026-10-29T17-29-48Z.dump.age`.
- Los pasos de ejecución confirmaron que el archivo remoto y su sidecar se descargaron, el SHA-256 coincidió (`sha256sum --check` informó `OK`), `age` descifró el archivo, `pg_restore --list` pudo leer el archivo y `pg_restore --exit-on-error` restauró correctamente en PostgreSQL 18 efímero.
- La validación posterior encontró al menos una tabla base en el esquema `public`; los archivos descifrados temporales se limpiaron. No se imprimieron filas comerciales ni secretos.
- **Alcance exacto de la evidencia:** queda verificado el recorrido de descarga, integridad, descifrado y restauración técnica de esta copia remota concreta en un entorno desechable. Esta prueba no demuestra que las tablas comerciales contengan filas, que los conteos/relaciones de negocio coincidan con el origen, ni mide RPO/RTO o el coste total. No se usó ni modificó Neon `main` o producción.
- **Siguientes comprobaciones:** inspeccionar de forma segura un manifiesto de conteos/relaciones de datos sintéticos o de metadatos no sensibles; medir duración total y RPO/RTO; comprobar alerta de fallo, retención y coste $0. No volcar datos de negocio a logs y no solicitar la clave privada age por chat.

---

## ESTADO OPERATIVO VIGENTE — backup (2026-10-29 UTC)

Esta sección supersede las notas históricas posteriores que indiquen que la subida corregida sigue pendiente. Se conserva el historial de incidentes para trazabilidad.

- **Subida remota verificada:** run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) completó correctamente. Los logs registran `pg_dump 18.6`, dump no vacío, cifrado age, checksum SHA-256, push del commit remoto `2b038bd` y retención sin eliminaciones.
- Archivo cifrado: `daily/backup-2026-10-29T17-29-48Z.dump.age`; checksum asociado: `daily/backup-2026-10-29T17-29-48Z.dump.age.sha256`.
- **Restauración técnica real: VERIFICADA** en run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): descarga del par remoto, checksum independiente, descifrado y restauración en PostgreSQL 18 efímero.
- **Pendiente:** validar conteos/relaciones de datos comerciales poblados con datos sintéticos o metadatos no sensibles; medir RPO/RTO; verificar alerta de fallo, retención y coste total $0.
- No compartir la clave privada age por chat ni incorporarla al repositorio. No tocar Neon `main`, producción ni copias existentes durante la verificación.

---

# Política de respaldo y recuperación — Micro app

**Estado:** la subida del 2026-10-29 y la restauración técnica de la copia exacta `daily/backup-2026-10-29T17-29-48Z.dump.age` están verificadas en runs [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) y [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124). La restauración ocurrió en PostgreSQL 18 efímero después de checksum y descifrado. No se han verificado conteos/relaciones de datos comerciales poblados, RPO/RTO, alertas ni coste total; no declarar completo el ciclo operativo hasta cerrar esos puntos.  
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
- [x] Una copia anterior pudo restaurarse en la rama desechable `restore-test-20261028` (run [40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192)); **esto no valida la copia remota del 2026-10-29**.
- [ ] Descargar la copia exacta, verificar independientemente SHA-256 y restaurarla en PostgreSQL efímero mediante `.github/workflows/backup-real-restore.yml`.
- [x] La prueba sintética aplica las migraciones antes del dump y verifica que el recuento de constraints se conserva tras restaurar ([run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225)); no afirma que ejecutar migraciones sobre una base ya restaurada sea necesario ni probado.
- [x] Conteos/valores y relaciones sintéticas de productos, movimientos, ventas, pagos y auditoría coinciden entre origen y restauración ([run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225)); no se usaron datos personales.
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


## Actualización viva — prueba automatizada de restauración sintética (2026-10-29)

La restauración manual anterior [run 40804665192](https://github.com/BTF14/Micro-app/actions/runs/40804665192) solo demostró estructura, porque las tablas comerciales estaban vacías. Para cerrar esa brecha se prepara una prueba permanente de laboratorio:

- PostgreSQL 17 efímero, separado en base fuente y destino de restauración; aplica las migraciones versionadas actuales.
- Inserta únicamente datos sintéticos enlazados: organización, usuario/membresía, proveedor, producto, tasa de cambio, venta completada, línea de venta, pago, movimiento de inventario y auditoría; también crea filas efímeras de sesión/rate-limit para comprobar su exclusión.
- Genera un dump custom, cifra con una clave age temporal creada dentro del runner, verifica SHA-256, descifra y restaura en la base de destino.
- Compara un manifiesto determinista de 13 tablas y cuatro relaciones entre venta/línea/producto, pago/membresía, movimiento/producto/membresía y auditoría/membresía. Confirma que `auth_sessions` y `auth_rate_limits` no existen en la restauración.
- La prueba no consume secretos del repositorio, no accede a Neon, no almacena dumps como artefactos y limpia la clave y archivos temporales al finalizar. Se programa mensualmente y también corre en PRs que cambian el workflow, script, migraciones o esta política.
- La prueba sintética poblada terminó en `success` en [run 40849167225](https://github.com/BTF14/Micro-app/actions/runs/40849167225), SHA `caa8d224b0e9c939d033080432caa131b2c8e5bc`. El manifiesto de 13 tablas, constraints y relaciones coincidió entre origen/restauración; checksum, descifrado y exclusión de `auth_sessions`/`auth_rate_limits` también pasaron. La prueba no mide RPO/RTO de producción ni valida una copia real.


## Estado operativo vigente después de PR #143 — 2026-10-29

- La prueba automatizada de datos sintéticos pasó en [run 40849605695](https://github.com/BTF14/Micro-app/actions/runs/40849605695), SHA de PR `11f4efe24d8ee94f57a068c28867f8cae0aed394`. Se aplican las migraciones a PostgreSQL 17 efímero, se crea un conjunto sintético relacionado, se cifra con age temporal, se verifica checksum, se descifra/restaura y se compara el manifiesto de 13 tablas, constraints y relaciones. Las tablas `auth_sessions` y `auth_rate_limits` no aparecen en la restauración.
- Workflow permanente: `.github/workflows/backup-restore-smoke.yml`; ejecución manual y mensual. No usa secretos del repositorio, Neon, datos reales ni artefactos para persistir dumps.
- Los checks post-merge de PR #143 pasaron para main `5afe912fc53d7a7027c4ad95bf366ee2abbf6596`.
- Esta prueba cierra la brecha de fixture vacío, no la recuperación integral de producción. Pendientes: medir RPO/RTO de una recuperación real, validar la alerta de fallo del backup y confirmar el coste real $0. La clave privada age de producción no debe compartirse por chat ni incorporarse a este workflow.


## Operational incident — 2026-10-29 manual run failure

- Manual run [40916692763](https://github.com/BTF14/Micro-app/actions/runs/40916692763) failed at the retention step after generating the dump, encrypting it with age and writing its SHA-256 checksum. The encrypted file and checksum were committed only in the ephemeral clone of `BTF14/micro-app-backups`; the command failed before `git push`. Therefore, this run did not create a durable remote backup, and the retention script did not delete remote files.
- Root cause: after changing directory to `backups-repo`, `../scripts/prune_backups.py` resolved to `/home/runner/work/Micro-app/scripts/prune_backups.py`, while the checked-out script lives below `$GITHUB_WORKSPACE/scripts/`. The workflow fix uses the explicit `$GITHUB_WORKSPACE/scripts/prune_backups.py` path.
- The backup workflow runner is pinned to `ubuntu-24.04` to avoid an unverified migration of this operational job to Ubuntu 26. This is a stability precaution; the observed exit code 2 was caused by the script path, not the runner warning.
- Status remains **pending verification** until the corrected workflow passes CI and a new manual run confirms remote upload, checksum presence/validity, retention behavior and success. Preserve all existing remote backups meanwhile.


## Incident: pg_dump major-version mismatch — 2026-10-29

- Manual run [40918687069](https://github.com/BTF14/Micro-app/actions/runs/40918687069) failed before creating a dump: Neon server reported PostgreSQL 18.6, while the unqualified `pg_dump` on the runner resolved to PostgreSQL 16.15. Encryption, upload, and retention steps were skipped; this run did not change the remote backup repository.
- Corrective branch `fix/backup-pg-dump-v18-20261029` installs `postgresql-client-18`, invokes `/usr/lib/postgresql/18/bin/pg_dump` explicitly, and asserts that its reported major version is 18 before connecting. This avoids relying on the system-wide `pg_dump` alternative.
- Keep status open until PR checks pass and a new manual run confirms dump, encryption, checksum, upload, and remote presence. Do not delete or alter older backups to troubleshoot this failure.


## Incident: backup run #7 failed because repository was not checked out — 2026-10-29

- Run [40920403909](https://github.com/BTF14/Micro-app/actions/runs/40920403909) verified pg_dump 18.6 against Neon 18, generated the dump, encrypted it with age and calculated SHA-256. It then failed in the upload/retention step because the runner could not find `$GITHUB_WORKSPACE/scripts/prune_backups.py`.
- Root cause: the workflow referenced a script from the code repository but lacked an `actions/checkout` step. The absolute path was correct; the repository had not been checked out into the runner workspace.
- Corrective branch `fix/backup-checkout-repository-20261029` adds `actions/checkout@v4` as the first step. Run #7 did not reach `git push`, so no new durable backup is proven and remote retention did not run.
- Incident remains open until PR checks pass and a new manual run verifies the remote encrypted backup, matching checksum, retention and final success. Preserve all previous valid copies.


## Successful persisted encrypted backup — 2026-10-29

- Manual run [40921815702](https://github.com/BTF14/Micro-app/actions/runs/40921815702) succeeded end-to-end.
- Log evidence: PostgreSQL client `pg_dump 18.6`; dump created and checked non-empty; age encryption succeeded; SHA-256 sidecar created; both files committed in the private backup repository as commit `2b038bd`; push to remote `main` succeeded; retention reported `deleted 0 file(s)`.
- Persisted objects: `daily/backup-2026-10-29T17-29-48Z.dump.age` and `daily/backup-2026-10-29T17-29-48Z.dump.age.sha256`.
- Status: **encrypted backup upload verified**. Not yet verified by this run: decrypting this exact backup, restoring it into a disposable PostgreSQL target, measured RPO/RTO, failure notification delivery, or total cost. Keep the age private key outside chat and source control.
