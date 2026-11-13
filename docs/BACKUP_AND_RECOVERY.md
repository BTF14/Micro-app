## Turno 37 — cierre de Gates A/B y ejecución de Fase 3B (2026-11-13 UTC)

- **Neon main:** proyecto `restless-fire-99110035`, branch default `main` (`br-summer-math-b7297a60`), database `neondb`, PostgreSQL 18.7.
- **Principal de backup efectivo:** auditoría ejecutada directamente como `microapp_backup`; `current_user = session_user = microapp_backup`. El bloque de assertions de `scripts/audit_database_roles.sql` terminó sin excepción/FAIL. El rol conserva solo atributos no administrativos y grants de lectura aprobados; la única membresía entrante observada es la del database owner `neondb_owner`, con ADMIN=true, INHERIT=false y SET=false. No tiene membresías salientes.
- **Resultados SELECT-only del script:** `information_schema.table_privileges` devolvió 27 filas, todas `SELECT` y `is_grantable=NO`; `routine_privileges` devolvió 0 filas; las dos secuencias públicas conceden solo `SELECT`; `pg_auth_members` devolvió una sola arista entrante desde `neondb_owner` (grantor `cloud_admin`, ADMIN=true), sin aristas salientes. Las 29 relaciones públicas (27 tablas + 2 secuencias) pertenecen a `microapp_migrator`. Los default ACLs de `microapp_migrator` y `neondb_owner` conceden a `microapp_backup` solo SELECT no grantable en tablas/secuencias futuras; no se encontró un grant default de backup a `cloud_admin`.
- **Retirada del principal heredado:** `backup_readonly` tenía CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS y membresía en `neon_superuser`. Preflight confirmó cero objetos propios, cero sesiones y cero locks. Se revocaron sus ACL explícitas en database/schema/16 relaciones públicas y su default ACL de `neondb_owner`; los grants de tablas se revocaron como owner `microapp_migrator`. Neon eliminó el rol y sus membresías. Verificación posterior: rol ausente, cero ACLs explícitas y cero dependencias de objetos.
- **Integridad main:** 23 filas de migración, última `0023` (`0023_register_shift_runtime_operations.sql`); 27 tablas públicas y 2 secuencias públicas, todas las 29 relaciones propiedad de `microapp_migrator`. No se cambió ningún dato de negocio ni se inspeccionó ningún secreto.
- **Gate B — backup natural:** workflow `backup.yml` Run #24 / [43447849855](https://github.com/BTF14/Micro-app/actions/runs/43447849855), evento `schedule`, SHA `0c90aa38`, SUCCESS. Diagnóstico: `identity_ok=t`, `role_safe=t`, `has_membership=f`, `table_writes=f`, `sequence_writes=f`, `create_privilege=f`.
- **Gate A — restore real cifrado:** [backup-real-restore.yml Run #3](https://github.com/BTF14/Micro-app/actions/runs/43485484181), SHA main `71e92b24ca48ef6f6ff1dc3cea18a51f193b579b`, SUCCESS (43 s de workflow). Artefacto `backup-2026-11-13T18-41-49Z.dump.age`; checksum SHA-256 verificado, AGE descifrado, `pg_restore --list` correcto, helper recibió `BACKUP_DUMP`, perfil BCV con 23 migraciones/27 tablas, assertions 0022/0023 correctas, logins runtime/BCV sync verificados y cleanup completo. Los 43 s son duración total del workflow, **no** RTO operacional medido.
- **Snapshot temporal:** `pre-phase3-main-snapshot-20261112` (`br-nameless-poetry-b7au2w0s`) eliminado tras confirmar que era hijo sin descendientes de main y que main/backups recientes estaban sanos. El snapshot tenía un esquema anterior (15 tablas, sin `schema_migrations`); no se confundió con el estado actual.
- **Límite sobre “11/11 filas”:** la nota de Fase 3A contiene esa cifra como confirmación previa del propietario, pero no identifica tabla, consulta o assertion que la defina. No se presenta como una comprobación independiente nueva. La verificación reproducible de este turno es el audit PASS, 23 migraciones y 27 tablas.
- **Estado:** pasos 1 y 2 de Issue #53 documentados como completados con evidencia; pasos 3 (smoke autenticado staging) y 4 (cierre formal/aceptaciones) siguen pendientes. Issue #53 permanece OPEN/P0; **PRODUCTION: NOT READY**. RPO/RTO operativos, alert acknowledgement, smoke staging, aceptación legal/fiscal/contable y coste recurrente total USD 0 todavía no están demostrados.
- **PR #339:** permanece OPEN y sin merge hasta confirmación del propietario de los dos cambios manuales Google Cloud Console + Cloudflare Pages. Tras el merge de PR #341, PR #339 sigue OPEN y GitHub informa `mergeable_state=dirty` (44 ahead / 2 behind frente al main actual); no rebasear ni resolver sus conflictos documentales hasta la confirmación del propietario de los dos pasos manuales.

---

> **Estado vigente — post-merge PR #330 / Turno 21 / 2026-11-12:** Issue #53 OPEN/P0; **PRODUCTION: NOT READY**. Main `3a955763f5d259fbedbf4d714a048b04b9a69a8a` (squash merge #330). La base pre-merge `01a1b178e041128cfc1a98ab4955132368387523` tenía 11/11 checks SUCCESS; no atribuirlos al merge SHA. No se obtuvo evidencia de CI post-merge para `3a955763f5d259fbedbf4d714a048b04b9a69a8a`. USD 0; no Neon main DDL/DML, roles/grants, secretos ni deploy manual.
>

> **Contrato implementado:** .github/workflows/backup.yml programa pg_dump, age, SHA-256 y publica .age + .sha256 en el repositorio privado separado BTF14/micro-app-backups; el workflow verifica readback. Código/CI no demuestra backup natural reciente ni restore real posterior.
>

> **DR sintético:** PR #326 probó restore PostgreSQL 18 con 23 migraciones, dump cifrado/manifiestos coincidentes; RTO sintético **3.953 s**. No es RTO operacional; RPO operativo no medido.
>

> **Bloqueos P0:** operador ejecuta auditoría read-only scripts/audit_database_roles.sql; identidad efectiva del secreto no certificada y rol histórico backup_readonly privilegiado, sin demostrar que sea principal efectivo. Observar backup natural programado, confirmar .age + .sha256/readback y restaurar copia concreta en PostgreSQL aislado. Pendientes RPO/RTO, alerta/ack, smoke staging, coste USD 0 y aprobación legal/fiscal/contable.
>

> **No ejecutar** workflow_dispatch para fabricar evidencia; no usar Neon main como laboratorio, compartir secretos ni cambiar roles/grants sin autorización específica. Seguir docs/PRODUCTION_SIGN_OFF_CHECKLIST.md; no cerrar #53 ni declarar READY antes de todos los gates.

## Reconciliación del contrato de exclusión y mínimo privilegio — 2026-11-11 UTC

- **Corrección integrada en PR #305:** `.github/workflows/backup.yml` sustituye las exclusiones completas `--exclude-table` por `--exclude-table-data=public.<tabla>` para `auth_sessions`, `auth_rate_limits` y `auth_bootstrap_attempts`. El objetivo es conservar DDL/estructura e índices, omitiendo únicamente sus filas.
- **Prueba sintética PostgreSQL 18 aprobada:** run [43102529147](https://github.com/BTF14/Micro-app/actions/runs/43102529147), código de prueba en el HEAD `2b52bcaaa575c7f4d50f2ba13982041f2b3353f7`. El rol sintético `microapp_backup` completó `pg_dump` con grants de lectura; las pruebas negativas rechazaron DML, DDL, mutación de secuencias y administración de roles. El archive/restauración conservaron las tres tablas efímeras con cero filas y el manifiesto sintético de negocio coincidió.
- Esta evidencia es de PostgreSQL 18 desechable y **no** verifica el principal efectivo del secreto `DATABASE_URL_BACKUP_RO`, los grants/membresías reales en Neon ni una restauración de una copia productiva. No declarar cerrado Issue #53 ni listo producción.
- Las notas históricas posteriores que describen que las tablas efímeras no aparecen en la restauración documentan el comportamiento anterior de `--exclude-table`; no deben interpretarse como el nuevo contrato. No se reescriben esos registros históricos.
- PR #305 se fusionó; este snapshot histórico no sustituye la evidencia más reciente de Turno 16. No se ejecutó manualmente el backup operativo, no se leyeron secretos y no se conectó ni mutó Neon `main`.


---

## Snapshot histórico de PR #287 — previo a Turno 6

> Snapshot histórico anterior a la reconciliación de Turno 6; los SHA y estados aquí descritos no sustituyen la consulta viva actual. SHA de aquella captura: `e5f956271f723bfa00da2ab527c35ac422cf6d2d`. No reutilizar checks de otros SHA.

## GitHub / PR #287

- PR #287: OPEN / Draft / mergeable=true / mergeable_state=clean. HEAD `e5f956271f723bfa00da2ab527c35ac422cf6d2d`; branch `integration/bcv-checkout-rehearsal-20261109`.
- Exact-HEAD CI: **16/16 check-runs SUCCESS**, **11/11 workflow runs pull_request SUCCESS** y **2/2 workflow runs push SUCCESS**.
- CI principal: 43/43 pasos SUCCESS.
- PostgreSQL migration validation: 86/86 pasos SUCCESS, incluidos los tests de membresías y el contrato least-privilege del principal de backup.
- PostgreSQL migration runner: 21/21 pasos SUCCESS.
- Backup restore smoke: main paired-intent (migrations 0001–0016) 11/11 pasos SUCCESS; BCV projection (0001–0023) 10/10 pasos SUCCESS.
- También SUCCESS en exact HEAD: Secret history scan, ODD docs, dashboard, dependency review, Semgrep, Security y Playwright.
- Reviews formales: 0. Review threads: 0. No aprobación independiente; mantener Draft y no fusionar.
- Comparación con main `c5373564413ba086690552c6b7deeab08d7b4a89`: 527 ahead / 1 behind; merge base `03442951b2a2f63f5bf4dcf560f2c91be4f6cc71`. Divergencia exclusiva de main es documental; no hacer sync/rebase automático.
- PR: 123 archivos, 19,394 adiciones y 307 eliminaciones. Requiere revisión independiente completa antes de promover a Ready.

## Hallazgo P0 Neon main — solo lectura

- Proyecto `micro-app-db` (`restless-fire-99110035`), branch primary/default `main` (`br-summer-math-b7297a60`), DB `neondb`.
- Rol LOGIN `backup_readonly`: `rolcreaterole=true`, `rolcreatedb=true`, `rolreplication=true`, `rolbypassrls=true`, INHERIT true, SUPERUSER false.
- Membresía directa `backup_readonly -> neon_superuser`; membresía efectiva `pg_write_all_data` y `pg_read_all_data`; INSERT/UPDATE/DELETE efectivos en `public.products`. El rol llamado backup_readonly no es read-only.
- Las 15 tablas base públicas y 2 secuencias observadas pertenecen a `neondb_owner`. No RLS en las 15 tablas. Default ACL de `neondb_owner`: SELECT para futuras tablas, ningún default ACL para secuencias; secuencias existentes dan SELECT+UPDATE a `backup_readonly`.
- `microapp_runtime` y `microapp_migrator` no aparecen en el catálogo de roles consultado en Neon main.
- **No se leyó ningún secreto ni connection string.** La identidad efectiva de `DATABASE_URL_BACKUP_RO` y la del Worker `DATABASE_URL` siguen sin verificar. No afirmar que el backup use `backup_readonly` ni que el Worker use `neondb_owner`.
- No se modificaron roles, membresías, grants, passwords, secrets, datos reales, Cron, DNS, billing ni producción. Todas las consultas Neon fueron SELECT sobre catálogos y predicados de privilegio.

## Contrato candidato de backup least-privilege — CI desechable

- En PostgreSQL 18 efímero se crea LOGIN sin SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, NOINHERIT y sin membresías; owner sintético NOLOGIN.
- Se comprueban grants explícitos para objetos existentes y default ACL SELECT-only para futuras tablas y secuencias.
- Se comprueba pg_dump y pg_restore --list con el login backup.
- Se rechazan INSERT/UPDATE/DELETE/TRUNCATE, sequence USAGE/UPDATE (incluidos nextval/setval), CREATE de database/schema, CREATE ROLE y SET ROLE.
- Exact HEAD e2e CI validó el test: step `Test least-privilege backup principal can pg_dump without write access` SUCCESS dentro de PostgreSQL migration validation (86/86 pasos).
- Esto valida una propuesta de permisos y compatibilidad pg_dump en CI; no provisiona ni cambia Neon y no identifica el principal del secreto.

## Estado operativo y decisiones

- Issue #53 permanece OPEN/P0; comentario de evidencia inicial `6802571142`, actualización exact-HEAD `6804382288`.
- Producción **NOT READY**. No integrar PR #287 solo por checks verdes. Mantener Draft.
- Próximo trabajo: revisión independiente de los 123 archivos y del checkout/BCV/roles; preparar plan de reemplazo del principal backup con continuidad, prueba dump/restore y rollback. Cualquier cambio en Neon main o secreto requiere autorización específica y un plan revisado.
- Después de integración autorizada, observar únicamente el siguiente backup natural de main y su diagnóstico seguro de `current_user` / `session_user` y booleanos de privilegio; no ejecutar workflow_dispatch para fabricar evidencia.
- Gates pendientes: identidad efectiva del Worker y backup; provisioning real de roles y grants; CORS efectivo; alertas externas; RPO/RTO medidos; coste total USD 0; aceptación funcional/comercial de jornada POS/checkout y revisión formal.
- MVP objetivo 2026-12-01; GO/NO-GO 2026-11-30.

---

# Addendum — 2026-11-11 — package resilience / 23-migration BCV profile

- The scheduled backup workflow previously had direct `apt-get update/install` calls; a natural scheduled backup had failed before DB connection due Ubuntu DNS during package installation. PR #287 now uses the bounded `scripts/ci/apt-retry.sh` helper, strict update semantics, isolated helper regression test, and curl retries/timeouts for the PostgreSQL PGDG key.
- This is a code-level resilience improvement only. No manual backup was run; the next natural scheduled run is the only production evidence after a separately approved integration.
- Restore runner documentation corrected to match code: BCV projection profile contains 23 migrations (0001–0023), main profile 16 (0001–0016). Exact-head restore smoke on `9101ab502d5c52c86a8b8d01a3a79487dd07e5e8` passed both profiles.
- Current PR #287 HEAD after state documentation: `e5dbb497fbb2779f8fc1581880dc5d8c9ed00b65`; revalidate exact-head CI before relying on it. PR remains Draft, issue #53 OPEN/P0, production NOT READY.

---

# Addendum — 2026-11-11 — default ACL y contrato candidato de backup

- SELECT-only en Neon main confirmó que `backup_readonly` no es read-only: CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS, membership en `neon_superuser` y `pg_write_all_data`, e INSERT/UPDATE/DELETE sobre `public.products`.
- 15 tablas de aplicación y dos secuencias públicas pertenecen a `neondb_owner`. Su default ACL público concede SELECT a futuras tablas, pero no hay default ACL para secuencias. Las dos secuencias actuales conceden SELECT+UPDATE al rol observado.
- No se leyó `DATABASE_URL_BACKUP_RO`; su identidad efectiva permanece desconocida. El diagnóstico de identidad/privilegios sigue siendo branch-only hasta una integración separada y un backup natural posterior. No ejecutar dispatch manual para fabricar evidencia.
- Contrato candidato probado en PostgreSQL 18 desechable: permisos explícitos existentes + default SELECT para futuras tablas/secuencias; no table writes, sequence USAGE/UPDATE, CREATE DATABASE/ROLE, SET ROLE ni memberships; pg_dump y pg_restore --list. Commit de test `cb81ecdf6bb5fe2c0d7806f6d744925300c8ba7a`, 16/16 checks exact-HEAD.
- Ningún cambio remoto. Issue #53 OPEN/P0; producción NOT READY.

---

# Addendum crítico — 2026-11-11 — rol backup_readonly no es read-only

# Hallazgo P0 — rol backup_readonly con privilegios excesivos (2026-11-11)

> Verificación SELECT-only de catálogos PostgreSQL. No se consultaron filas comerciales ni secretos. No se modificó Neon.

- Proyecto Neon `micro-app-db` (`restless-fire-99110035`), branch primary/default `main` (`br-summer-math-b7297a60`), database `neondb`.
- El rol LOGIN `backup_readonly` tiene `rolsuper=false`, `rolinherit=true`, pero **`rolcreaterole=true`, `rolcreatedb=true`, `rolreplication=true`, `rolbypassrls=true`**.
- `pg_auth_members`: miembro directo de `neon_superuser`; `pg_has_role` confirma membresía efectiva en `pg_write_all_data` y `pg_read_all_data`.
- `has_table_privilege('backup_readonly','public.products',...)`: SELECT, INSERT, UPDATE y DELETE = true; TRUNCATE = false.
- `has_database_privilege(...,'CREATE')=true`; `has_schema_privilege(...,'public','CREATE')=false`.
- **Conclusión:** el rol llamado `backup_readonly` no es de solo lectura. Si `DATABASE_URL_BACKUP_RO` utiliza este principal, su privilegio efectivo viola mínimo privilegio.
- **Límite:** no se leyó el secreto ni se conoce el usuario efectivo que resuelve. No afirmar que el workflow lo utiliza hasta observar el diagnóstico de seis booleanos en un backup natural de main posterior a integrar el cambio.
- **Prohibido sin autorización específica:** revocar membresías, cambiar atributos/grants, rotar contraseñas/secreto o alterar workflows productivos. La remediación requiere un plan revisado que preserve continuidad de backup y valide `pg_dump` en entorno aislado.
- Issue #53 permanece OPEN/P0; producción NOT READY. Comentario con evidencia: `6802571142`.

---

**Remediación no autorizada todavía:** no revocar membresías, cambiar atributos/grants, resetear contraseñas ni modificar `DATABASE_URL_BACKUP_RO` desde este flujo. Primero diseñar un principal dedicado sin privilegios de creación/escalada ni memberships privilegiadas, con permisos explícitos mínimos de lectura requeridos por `pg_dump`; probarlo en rama/base desechable, validar dump cifrado y restauración, y documentar rollback/continuidad. Cualquier cambio en Neon main o secreto requiere autorización específica.

---

## Reconciliación de evidencia — 2026-11-08 UTC

- La última restauración de una copia remota concreta documentada sigue siendo la del 2026-10-29: `daily/backup-2026-10-29T17-29-48Z.dump.age`, con checksum, descifrado y restore a PostgreSQL 18 efímero. No se ha demostrado una nueva restauración de un backup remoto posterior.
- Los check-runs de backup/restore de #251 y #255 son evidencia de CI en sus SHA exactos, pero no sustituyen la restauración de la copia remota más reciente, la reconciliación de conteos/relaciones comerciales, medición RPO/RTO, alerta externa ni verificación de coste $0.
- No declarar completo el ciclo operativo de backup/restore ni cerrar el gate de Seguridad Nivel 1 solo por CI sintético.
- No se modificó el repositorio remoto de backups, Neon, secretos, workflows de producción ni datos reales.

---

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

## Reconciliación de versión PostgreSQL — 2026-10-30

El esquema principal de CI y Neon usa PostgreSQL 18. El workflow `.github/workflows/backup-restore-smoke.yml` se alinea ahora a `postgres:18` y `postgresql-client-18` para que la prueba sintética de backup/restore valide la misma versión mayor. Las ejecuciones históricas 40849167225 y 40849605695 usaron PostgreSQL 17 y siguen siendo evidencia histórica de esa versión; no se reutilizan como prueba de PG18. La ejecución PG18 [41021605481](https://github.com/BTF14/Micro-app/actions/runs/41021605481) pasó en el HEAD final de PR #167 `ad45911368e9e9a714ebbe014de2d84a7b3cf1de`. La prueba sigue siendo sintética y no accede a Neon main.


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

## Brecha vigente de cobertura sintética — 2026-11-10

La auditoría del script ejecutado por `.github/workflows/backup-restore-smoke.yml` encontró que `scripts/test_backup_restore.sh` aplica solo migraciones 0001, 0002 y 0005 y compara 13 tablas. Esto no cubre el esquema completo versionado en main (0001–0016): faltan `branches`, `branch_memberships`, `registers`, `register_shifts`, `warehouses`, `inventory_counts`, `inventory_count_lines`, `inventory_balances`, `warehouse_inventory_movements` e `inventory_balance_ledger_intents`; tampoco se valida `schema_migrations` porque el script no usa el migration runner oficial.

**Interpretación:** el round-trip sintético anterior sigue siendo evidencia de cifrado/checksum/restore para su fixture limitado, pero no demuestra recuperación del esquema actual completo ni de las relaciones nuevas de sucursal, turno, warehouse, conteo, ledger y checkout. No invalida automáticamente los backups reales; limita lo que podemos afirmar sobre su cobertura y restaurabilidad.

**Acción abierta:** ampliar el smoke test en una rama separada para aplicar todas las migraciones del ref mediante `scripts/db/migrate.sh`, poblar un grafo comercial sintético coherente y comparar manifiestos antes/después de restaurar en PostgreSQL 18 efímero. Mantener exclusión de `auth_sessions`, `auth_rate_limits` y `auth_bootstrap_attempts`. La tarea está en `odd/tasks/backup-restore-schema-coverage.md`; hallazgo en issue #53 comentarios 6772340874/6772383789. Las migraciones 0017–0022 pertenecen a PR #287 OPEN/Draft y no deben atribuirse a main.

No se ha ejecutado un restore nuevo, leído secretos ni accedido a Neon/producción. Mantener el gate P0 abierto.

## Avance parcial — prueba de esquema completo en CI (PR #303, 2026-11-10)

La rama `security/backup-restore-schema-coverage-20261110` añade `scripts/test_backup_restore_schema.sh` al workflow de smoke. Este test aplica todas las migraciones numeradas del ref con el runner oficial en PostgreSQL 18 desechable; verifica el ledger; hace dump, cifrado age efímero, checksum, descifrado y restore; compara nombres de tablas, constraints, índices, triggers, hashes de funciones y ledger; y confirma exclusión de las tres tablas efímeras.

Este avance valida **estructura de esquema**, no la recuperación de datos poblados para todas las nuevas tablas. El script de fixture de datos existente sigue aplicando 0001/0002/0005 y verificando 13 tablas. Por tanto, el ciclo backup/restore continúa incompleto: falta fixture sintético coherente de sucursal/turno/warehouse/count/ledger/checkout y relaciones, además de identidad efectiva del principal de backup, least-privilege, RPO/RTO, restauración remota reciente, alerta y coste $0. PR #303 OPEN/Draft, no fusionada; no cerrar issue #53.


## Auditoría de alcance — PR #303 fase 1 (2026-11-10)

La prueba de esquema en #303 valida la creación del esquema desde migraciones y el round-trip cifrado en bases PostgreSQL 18 desechables. No debe describirse como validación de permisos/ownership completos: el comando usa `--no-owner --no-privileges` tanto en dump como restore, de modo que los propietarios y ACL no se conservan ni comparan. El manifiesto actual tampoco inspecciona RLS/policies, grants efectivos, memberships/atributos de roles, default privileges ni `search_path` efectivo.

Para la recuperación operativa, estos controles requieren un contrato explícito: qué roles se provisionan antes/después del restore, qué grants se reaplican desde migraciones/infraestructura, qué objetos deben pertenecer a migrator/runtime y cómo se verifica que RLS y políticas permanecen activas. No inferirlos a partir de que `pg_restore` termine SUCCESS.

La fase 2 debe ser acumulativa y version-aware. Main 0001–0016 ya contiene checkout branch-aware por migration 0015 y pairing de balance/ledger por migration 0010. PR #287 añade 0017–0022 (BCV weekday/weekend, allocation, projection, sync state y rol productor); esas extensiones se prueban solo sobre el ref que las contiene. No mezclar secuencias ni omitir checkout de la fixture main.

Issue #53 permanece OPEN/P0. No se ha accedido a Neon, secretos, backup remoto ni datos reales. Producción NOT READY.


## Fase 2 — restore con grafo de datos poblado (2026-11-10)

**Implementado y verificado en PR #303 HEAD `87ca92a25538b1b1217cb78b10a6db2fd7726ef0`.** La prueba usa main migrations 0001–0016, incluyendo checkout branch-aware de migration 0015 y paired ledger intents de migration 0010.

### Fixture y verificaciones

- Dos tenants sintéticos independientes, dos usuarios owner, dos organization memberships, dos branches y branch memberships, dos suppliers/products/warehouses.
- Tenant A: apertura 10; conteo físico absoluto 11 con expected quantity 10 y balance version 1; venta completada de 2 unidades; balance final 9, version 3.
- Tenant B: apertura de 5 unidades; balance final 5, version 1.
- Cuatro movimientos inmutables (dos opening, un count adjustment y una salida sale), cero intents pendientes al commit. `products.stock_quantity` permanece 0 para ambos productos; el balance de almacén y el ledger son la fuente probada.
- Venta asociada a branch/register shift/warehouse, tasa BCV sintética con fecha efectiva Caracas del día, pago completo en USD, line snapshots y evento `sale.completed`.
- Source contiene filas sintéticas en `auth_sessions`, `auth_rate_limits` y `auth_bootstrap_attempts`; las tres tablas se excluyen del restore y se comprueba su ausencia.
- Dump custom, cifrado age con clave efímera, SHA-256, descifrado y restore en otra base PostgreSQL 18 desechable.

Se eliminaron `--no-owner --no-privileges` para que el test restaure owners y ACL. El manifest compara owners de relaciones/funciones, ACL no implícitas del owner, grants efectivos de migrator/runtime/producer, atributos y memberships, search_path efectivo por login, RLS/policies, default ACL, secuencias y estado, extensiones, funciones, triggers, constraints, indexes y ledger. La prueba usa roles cluster-globales preprovisionados en el servicio desechable; no exporta global roles como parte del dump.

### Resultado y alcance

El workflow `Backup restore smoke test` y los 11 workflow runs de PR #303 pasaron SUCCESS en el HEAD exacto. También pasaron pruebas de migration runner, branch scope, register shift, permisos de miembros, inventario, runtime-role API, Playwright, SAST, secret scan, dependency review y validación ODD.

Esto prueba un round-trip poblado sintético dentro del mismo PostgreSQL service; **no** restaura el artefacto remoto del backup programado, no demuestra la identidad del principal `DATABASE_URL_BACKUP_RO`, no mide RPO/RTO, alertas externas ni coste $0 y no certifica recuperación de producción. La fixture SQL no sustituye pruebas API de aislamiento tenant/branch/role. Issue #53 sigue OPEN/P0.

PR #287 0017–0022 (BCV effective date weekend, payment allocation, ledger projection, BCV sync state y producer role) requiere perfil de fixture/restore separado sobre su ref exacto; no mezclar esas migraciones con main 0016.


## Diferencia entre el round-trip sintético y el backup real — 2026-11-10

El run programado #20 `42842855127` terminó SUCCESS. El artefacto `backup-2026-11-10T15-18-11Z.dump.age` y su sidecar SHA-256 están presentes en el repo remoto, commit `485412b612849a888bccc5858a5272bb7400de76`. Los bytes no se descargaron, el checksum no se contrastó con el dump y no se realizó restore real.

La prueba sintética fase 2 de PR #303 usa `pg_dump` sin `--no-owner --no-privileges`, por lo que comprueba restauración de owners/ACL en un PostgreSQL 18 desechable. En cambio, el workflow real `.github/workflows/backup.yml` utiliza `pg_dump --no-owner --no-privileges`; el artefacto real no preserva esa metadata de ownership/ACL. Esto exige un proceso explícito de provisioning de roles y grants en recuperación.

La revisión del workflow confirma que consume `DATABASE_URL_BACKUP_RO`, pero no registra `current_user`, `session_user` ni privilegios efectivos. Los logs del run no permiten identificar el principal. El hallazgo conocido es que `backup_readonly` hereda `pg_write_all_data` mediante `neon_superuser`; no está demostrado que el secreto use esa identidad.

El workflow manual `.github/workflows/backup-real-restore.yml` verifica el sidecar contra bytes descargados, descifra y restaura a PostgreSQL 18 efímero, pero usa `pg_restore --no-owner --no-privileges` y solo valida que exista al menos una tabla pública. No se ejecutó porque el artefacto contiene datos reales y no están permitidos en pruebas bajo las restricciones actuales.

Pendientes P0: identidad efectiva del principal, least privilege real, provisioning de owners/ACL, restore reproducible de artefacto bajo manejo de datos autorizado, RPO/RTO medidos, alertas externas y coste total $0. Issue #53 permanece OPEN. No ejecutar backup manual ni cambiar Cron.

 
## Revalidación de fase 2 y manifiesto ampliado — 2026-11-10

Código validado en PR #303 SHA `f0dc1f90043eff4270d86f461a2dfc07187aa814`; 11/11 workflow runs exact-HEAD SUCCESS. PostgreSQL 18 aplicó main migrations 0001–0016 mediante el runner oficial, generó dump, cifró con age, verificó SHA-256, descifró y restauró a una segunda DB desechable. Job `42870784682` SUCCESS; round-trip 2 s.

El manifiesto compara columnas/defaults, vistas/materialized views, particiones, tipos/domains/enums y labels, event triggers, constraints y validación, índices y estado de validez, triggers y estado habilitado, funciones, extensiones, secuencias/estado, ledger, RLS/policies, owners/ACL, grants efectivos, roles/memberships, default ACL y search_path efectivo. El fixture poblado valida dos tenants, relaciones, conteos, balances y ledger, venta completada, líneas, pagos, tasa snapshot y auditoría; se comprueba que balance coincide con suma de movimientos y que total de venta coincide con líneas y pagos. Las tres tablas efímeras auth se sembraron en source y quedaron excluidas en restore.

El resultado es evidencia sintética de recuperación de main 0001–0016, no del artefacto remoto ni de producción. PR #287 0017–0022 requiere fixture/perfil separado. El backup real sigue usando `--no-owner --no-privileges`; el principal efectivo de `DATABASE_URL_BACKUP_RO` y least privilege no están demostrados. Run #20 `42842855127` tiene artefacto y sidecar, pero no se descargó ni se contrastó checksum con bytes ni se restauró. Issue #53 OPEN/P0; RPO/RTO sostenidos, alertas y coste $0 pendientes. Producción NOT READY.

## Perfil sintético de restauración PR #287 — 2026-11-10

PR #287 incorpora `scripts/test_backup_restore_schema_bcv.sh` y `scripts/backup_restore_fixture_bcv.sql` para probar su cadena 0001–0022, incluyendo el ledger de proyección, el estado BCV, checkout y permisos por columna del productor. Exact-HEAD `7746e86140cdf3a98911665f6955e57a256bfd4b`: 11/11 workflows SUCCESS. Job `42872318369` SUCCESS; 22 migraciones, dump cifrado age, checksum, descifrado, restore en PostgreSQL 18 desechable, ACL/owners/RLS/roles/search_path/column grants preservados, grafo BCV/checkout PASS, 3 s.

**Diferencia con producción:** el test sintético usa pg_dump/pg_restore por defecto y por tanto preserva owners y ACL. El workflow productivo `.github/workflows/backup.yml` usa `--no-owner --no-privileges`; por ello este test no demuestra que el artefacto productivo pueda restaurar ownership/grants operativos. Falta diseñar y probar el procedimiento de bootstrap/reasignación de ownership y grants después de un restore con esos flags. No modificar todavía el workflow productivo ni ejecutar backup manual.

La tasa del fixture es sintética; no es una cotización BCV. El test no restaura el artefacto remoto, no demuestra identidad efectiva de `DATABASE_URL_BACKUP_RO`, least privilege, RPO/RTO, alertas ni coste $0. Issue #53 OPEN/P0; producción NOT READY.

## Coexistencia de perfiles de restauración — 2026-11-11

La integración de cobertura mantiene dos perfiles incompatibles en **jobs PostgreSQL 18 independientes** del workflow `.github/workflows/backup-restore-smoke.yml`. Cada job crea su propio contenedor de servicio, base source y base restore; no comparte esquemas, migraciones, ledger ni fixtures.

- **Main paired-intent (0001–0016):** `scripts/test_backup_restore_schema.sh` y `scripts/backup_restore_fixture_main.sql`. La cadena de migraciones se obtiene del commit inmutable `c5373564413ba086690552c6b7deeab08d7b4a89` mediante `git archive` y se pasa al runner oficial por `MIGRATIONS_DIR`. Así, una futura migración 0019 de proyección en la rama integrada no contamina el test de regresión del modelo paired-intent.
- **BCV projection (0001–0022):** `scripts/test_backup_restore_schema_bcv.sh` y `scripts/backup_restore_fixture_bcv.sql`, aplicados desde el ref evaluado mediante el runner oficial. Comprueba proyección desde movimientos, estado latest-success y grants del productor.
- La regresión sintética legacy de 13 tablas se conserva y se ejecuta una vez, después del perfil BCV.

Los perfiles deben terminar con sus manifiestos y assertions independientes. Un éxito de un job no sustituye al otro. Los dos round-trips conservan owners/ACL para comprobar el contrato sintético; el workflow productivo continúa usando `--no-owner --no-privileges`, por lo que sigue pendiente el bootstrap operacional de ownership/grants tras un restore productivo.

La coexistencia en CI **no** demuestra restore del artefacto remoto, identidad efectiva ni least privilege de `DATABASE_URL_BACKUP_RO`, RPO/RTO sostenidos, entrega de alertas, ni coste total $0. Issue #53 permanece OPEN/P0. No leer secretos, no ejecutar backup manual, no modificar Neon/roles/grants/Cron ni producción. Producción NOT READY.

**Estado de implementación:** scripts, fixture y workflow de doble job añadidos en la rama de integración; el resultado CI del nuevo HEAD queda pendiente de comprobación exact-SHA.

## Corrección de exclusión de autenticación efímera — 2026-11-11

**Esta decisión supersede las notas históricas anteriores que afirmaban que las tablas efímeras debían estar ausentes del esquema restaurado.**

El workflow productivo y los tres smoke runners deben usar `pg_dump --exclude-table-data=` para `auth_sessions`, `auth_rate_limits` y `auth_bootstrap_attempts`, no `--exclude-table=`. La política de seguridad excluye los registros efímeros (sesiones, ventanas de rate-limit y bootstrap pendiente), pero conserva las definiciones de tablas, constraints, índices, triggers y secuencias necesarias para que la aplicación vuelva a operar tras la restauración.

Razón: si se excluye la tabla completa, el dump conserva `schema_migrations` indicando que las migraciones de autenticación ya fueron aplicadas, aunque falten las tablas. Un rerun idempotente del migrator no recrearía esos objetos y podría dejar autenticación rota tras recovery.

Los perfiles main 0001–0016 y BCV 0001–0022 ahora deben demostrar: una fila sintética por tabla en el origen, estructura presente en destino y cero filas efímeras restauradas. La regresión legacy hace la misma comprobación. El workflow de smoke se activa también ante cambios en `.github/workflows/backup.yml`.

Este cambio no cierra los gates de identidad/least privilege de `DATABASE_URL_BACKUP_RO`, ownership/grants operativos cuando el dump productivo usa `--no-owner --no-privileges`, restore del artefacto remoto, RPO/RTO, alertas externas ni coste $0. Issue #53 sigue OPEN/P0; producción NOT READY. Ver `odd/tasks/backup-ephemeral-auth-schema-retention.md`.

## Diagnóstico del principal efectivo de backup — 2026-11-11

El workflow programado ahora ejecuta una consulta read-only y no bloqueante a través de `DATABASE_URL_BACKUP_RO`. Publica únicamente seis resultados booleanos: coincidencia con la identidad esperada `backup_readonly` (`current_user` y `session_user`), atributos seguros del rol, ausencia de membresías, ausencia de escritura en tablas/columnas, ausencia de mutación de secuencias y ausencia de CREATE en schema/database. No imprime DSN, host, usuario real, credenciales ni datos. Si el diagnóstico falla, el backup continúa y el gate queda abierto.

No ejecutar manualmente el workflow para obtener evidencia. Revisar el próximo run naturalmente programado. Un resultado distinto del esperado requiere una revisión separada de identidad/least privilege; no modificar roles/grants remotos desde el workflow. Ver `odd/tasks/backup-principal-least-privilege-audit.md`. Issue #53 OPEN/P0; producción NOT READY.

## Ensayo de restore con flags productivos — 2026-11-11

Se cerró en CI la brecha de prueba del modo `pg_dump --no-owner --no-privileges`. Los dos perfiles full-schema ahora restauran con esos flags en bases PostgreSQL 18 independientes y usando conexión directa `microapp_migrator`. El restore reconstruye ownership de objetos/funciones bajo el migrator y después reproduce, en orden, únicamente los `GRANT`, `REVOKE` y `ALTER DEFAULT PRIVILEGES` del bundle exacto de migraciones. No vuelve a ejecutar DDL ni datos; el ledger de migraciones permanece intacto. La comparación de manifiestos verifica owners, ACL de tabla/columna/función, default ACL, RLS/policies, privilegios efectivos, search_path, datos y tablas efímeras vacías.

La primera prueba detectó que repetir solo los grants de 0012 reintroducía INSERT sobre `inventory_balances`, retirado después por 0019. Se corrigió reproduciendo la secuencia ACL completa; en el perfil BCV se omiten solo los ACL históricos de objetos paired-intent que 0019 elimina.

Evidencia en HEAD de implementación `0ddd0da742b474b7256675b9c32292d7750fc2b0`: backup restore run `42989180384` (main job `130417569364` y BCV job `130417569035`) SUCCESS; CI `42989180406` SUCCESS y los otros 9 workflows pull_request también SUCCESS. Ver `odd/tasks/backup-restore-no-owner-no-privileges.md`.

Límite: es una prueba sintética del procedimiento de ownership/ACL, no una restauración del artefacto remoto ni un runbook productivo completo. El aprovisionamiento de cluster/database y roles LOGIN con credenciales seguras, identidad real de `DATABASE_URL_BACKUP_RO`, custodia de age, RPO/RTO, alertas externas y coste $0 siguen pendientes. Issue #53 OPEN/P0; producción NOT READY.

## Restauración remota con roles de aplicación — procedimiento reforzado — 2026-11-11

Se corrigió el alcance del workflow manual `.github/workflows/backup-real-restore.yml`: antes restauraba el archivo remoto como administrador `microapp` y solo comprobaba que existiera alguna tabla pública. Eso demostraba legibilidad/restaurabilidad técnica, no que el servicio pudiera operar con sus roles de mínimo privilegio.

Ahora usa `scripts/db/restore_remote_backup_ephemeral.sh`: aprovisiona roles sintéticos solo si faltan, restaura el archivo como LOGIN directo `microapp_migrator` con `--no-owner --no-privileges`, detecta el perfil desde `schema_migrations`, y reconstruye ACL usando el bundle exacto de migraciones. El perfil main 0001–0016 usa el bundle inmutable `c5373564413ba086690552c6b7deeab08d7b4a89`; BCV 0001–0022 usa el bundle de la rama. Antes de ACL replay, cada filename y SHA-256 debe coincidir con el ledger restaurado. Se validan ownership de objetos/funciones, atributos y membresías de roles, tablas efímeras presentes/vacías, ledger y conexiones LOGIN independientes runtime/producer.

Los runners sintéticos main y BCV llaman al mismo script en una segunda base de datos desechable, además de mantener la comparación completa de manifiestos. Evidencia: run [42991705366](https://github.com/BTF14/Micro-app/actions/runs/42991705366), main job `130425902535` SUCCESS, BCV job `130425902488` SUCCESS (incluida regresión legacy), HEAD de implementación `f259b65175711d66f398486bcb80765dfe7aea77`.

**Límite:** el workflow de archivo remoto sigue siendo manual y no se ejecutó. La prueba es sintética y no descargó backup remoto ni usó la llave age real. No afirmar que se restauró una copia remota nueva. El diagnóstico del principal de backup continúa pendiente hasta que su workflow actualizado llegue a main y se ejecute naturalmente. RPO/RTO, alerta externa, aprovisionamiento provider-specific y coste $0 siguen abiertos. Issue #53 OPEN/P0; producción NOT READY. Ver `odd/tasks/backup-remote-restore-app-role-validation.md`.

### Evidencia posterior — runtime LOGIN probado — 2026-11-11

Se amplió el runner remoto para no limitarse a probar la conexión del runtime: también ejecuta un `SELECT` real sobre `public.organizations` como `microapp_runtime` y verifica que conserva SELECT mientras carece de CREATE en `public`. Los perfiles main y BCV pasan este probe además de validar ownership, ledger/checksums, auth efímero vacío y logins runtime/producer.

Run [42992354071](https://github.com/BTF14/Micro-app/actions/runs/42992354071): main job `130428038679` SUCCESS; BCV job `130428038320` SUCCESS (incluida regresión legacy), HEAD de implementación `7b4fdebe846952f1099a4fde323be2dc0f5ce0e8`. La restauración de un artefacto remoto real sigue sin ejecutarse; no usar workflow_dispatch sin nueva autorización.

## Addendum — actual producer write probe, rollback-only — 2026-11-11

A second review identified that checking only the producer LOGIN was weaker than the claim "producer permissions usable". The restore runner now performs an effective write-path probe **only for the BCV 0001–0022 profile**, where migration 0022 defines the dedicated producer contract:
- verifies the singleton `bcv_sync_state` row is readable;
- updates only the granted producer columns (`attempt_id`, timestamps, `last_outcome`, `updated_at`);
- inserts a uniquely tagged synthetic `exchange_rates` row using only the granted insert columns and reads its returned UUID using the permitted `id` column privilege;
- updates only `validation_status`;
- rolls the entire transaction back unconditionally.

The main 0001–0016 paired-intent profile predates migrations 0021/0022 and therefore intentionally does **not** run the BCV table write probe; it verifies only the synthetic producer LOGIN exists, not that it has BCV grants. This prevents incorrectly applying the later profile's permission contract to the historical schema.

The probe was corrected after inspection found an indented heredoc terminator in the first draft; the corrected shell block is what the passing workflow exercised. The complete main + BCV smoke run at HEAD `3e6f6f508af316ab102ac0d7fcb7c56bcb65d8eb` is `42993480715`: main job `130431717359` SUCCESS; BCV job `130431717962` SUCCESS, including the legacy regression. All 11 PR workflows at that exact HEAD passed: CI `42993480688`, migration validation `42993480726`, PostgreSQL migration runner `42993480716`, backup restore `42993480715`, Playwright `42993480670`, dependency review `42993480700`, ODD docs `42993480705`, Semgrep `42993480727`, security scan `42993480720`, secret history `42993480721`, project dashboard `42993480717`.

This remains synthetic evidence only. The remote artifact workflow was not dispatched and no remote backup/age key was accessed.

## Addendum — final-profile ACL oracle and hardened ledger parsing — 2026-11-11

The restore grant helper now rejects migration-ledger filenames unless they are safe numbered SQL basenames matching the contiguous version, and rejects checksums unless they are 64-character lowercase SHA-256 digests. It still verifies each exact file's checksum before replaying ACL statements.

A strict post-restore check initially reused migration 0012's historical assertion file after all 16 migrations had been replayed. That test failed because migrations 0013 and 0015 legitimately grant the runtime role access to BCV rates and checkout sales/payments; those are final-profile permissions, not security regressions. The historical migration assertion is valid at migration 0012's point in time, not as the final 0016 oracle. It was not weakened. Instead, added `scripts/db/restore_role_assertions_main.sql`, which validates the final main 0001–0016 runtime contract: required checkout/rate access is present; intent-table access, branch/warehouse mutations, audit reads/mutations and unsafe default ACLs remain absent. The BCV 0001–0022 profile continues to run migration 0022's full producer/runtime effective-privilege assertions.

The BCV restore probe also performs the producer's permitted state update, synthetic rate insert and validation-status update in a single transaction that is rolled back. It is intentionally not run for the main 0001–0016 profile, which predates migrations 0021/0022. The synthetic restore workflow now also runs on pushes to the integration branch, in addition to PR path-filtered runs, so this profile gate cannot silently remain unexecuted on an integration-only update.

**Validated exact HEAD:** `99ed19bd4b0f13503dc875215532e3c83941d168`. PR workflow runs 11/11 SUCCESS: CI `42995277583`; database migration validation `42995277784`; PostgreSQL migration runner `42995277586`; backup restore smoke `42995277769`; Playwright `42995277707`; dependency review `42995277737`; ODD docs `42995278007`; Semgrep `42995277801`; security scan `42995277685`; secret history `42995277589`; project dashboard `42995278070`. Independent push backup smoke `42995267480` also SUCCESS: main job `130437669142`, BCV job `130437668885`, legacy regression included.

The earlier failed run `42994254096` is a retained test-oracle failure, not hidden: it caught that the historical 0012 assertion was being applied at the final schema point. The profile-specific final assertion replaced it and the corrected main + BCV restore passed.

No remote backup artifact or age key was accessed; `.github/workflows/backup-real-restore.yml` remains manual and was not dispatched. No production, Neon, remote role/grant, secrets, Cron, DNS, Cloudflare sensitive setting, billing or deployment was changed.

### Follow-up: effective role probes

The shared ephemeral runner now proves actual direct-login behavior, not merely role existence: runtime reads `public.organizations` and cannot CREATE in schema `public`; for the BCV profile, the dedicated producer reads its singleton, updates only its narrow state columns, inserts a synthetic rate and updates only its validation status, with the entire transaction rolled back. Main profile does not claim a producer operation test because it predates the dedicated producer migration. At HEAD `f6c453d928ffaef4ab15efc5733bd3c7001089e3`, exact-HEAD PR workflows 13/13 SUCCESS, including backup smoke `42997279023` and Playwright `42997278934`; CI `42997279209` SUCCESS. Remote archive workflow itself remains manual and unexecuted.

## Runbook operativo de recuperación — 2026-11-11

Se creó odd/tasks/backup-operational-recovery-runbook.md para separar recuperación por PITR/branching de Neon frente a recuperación desde el artefacto cifrado independiente. Define verificación del archivo y sidecar SHA-256, custodia age fuera de Git, restore aislado PostgreSQL 18, comprobaciones de perfil/migraciones/ACL/roles, límites de cutover, bitácora UTC para medir RPO/RTO y gates de coste/alertas.

La documentación oficial de Neon describe branching y recuperación desde historial dentro de la ventana configurada: https://neon.com/docs/introduction/branching. La ventana, límites y coste deben comprobarse en el plan real al momento del incidente; no se asume que exista retención gratuita suficiente. La rama recuperada se debe mantener aislada para inspección, nunca promover ni conectar a producción por este runbook.

Decisión: no fijar todavía objetivos RPO/RTO. La cadencia diaria no demuestra un RPO <=24h y el tiempo de pg_restore no es el RTO operativo. Registrar timestamps de incidente, último backup íntegro, provisioning, restore, smoke y recuperación; proponer objetivos solo tras una prueba remota real y un simulacro completo.

Límites: el workflow remoto sigue manual y no fue despachado; el backup programado natural aún debe producir evidencia del diagnóstico de seis booleanos de DATABASE_URL_BACKUP_RO. El resumen de GitHub Actions no prueba alerta externa. No se accedió a secretos, archivo remoto, llave age ni Neon. Issue #53 OPEN/P0; producción NOT READY.

### Verificación de rama por defecto — diagnóstico aún no desplegado — 2026-11-11

GitHub live muestra main en c5373564413ba086690552c6b7deeab08d7b4a89. El archivo .github/workflows/backup.yml de main (blob 5df408788b9053709261ada3aa22dd73b85d5691) todavía no contiene el paso de diagnóstico de identidad/privilegios; ese cambio está solo en la rama de integración/PR #287. Los runs programados más recientes de main son 42842855127 (2026-11-10, SUCCESS) y 42659924075 (2026-11-09, SUCCESS), ambos anteriores al diagnóstico. Por tanto, no existe aún evidencia real de los seis booleanos; no inferir least privilege desde el éxito del backup. El siguiente run natural solo será válido después de que la versión que contiene el diagnóstico llegue a main. No hacer dispatch manual.


## Reconciliación viva — 2026-11-11 — HEAD `94f3e3afd561f517301175751a8b7feaf640b2b9`

- #287: OPEN/Draft, mergeable=true, 377 ahead / 1 behind main; el único commit detrás es documental (`docs/BACKLOG_RECOVERY_LEDGER.md`, +15 líneas). No hay reviews formales ni review threads.
- Exact SHA: 11/11 workflows PR SUCCESS, 3/3 workflows push SUCCESS, 18/18 check-runs SUCCESS; 0 status contexts legacy. CI, migration validation, migration runner, Playwright, backup restore, Semgrep, Security, Secret history, dependency, ODD y dashboard pasaron.
- El smoke exacto ejecutó main 0001–0016 y BCV 0001–0022, regresión legacy, guard de destino y validador de artefactos. Runs: PR backup smoke `43002919167`; push backup smoke `43002910346`.
- #303 permanece OPEN/Draft, HEAD `d527ae79cd566945cd9bdb3e1475d53b31d3923a`, 77 ahead / 0 behind, 11/11 workflows y 17/17 checks SUCCESS, sin reviews/threads. Su fixture main ya está incorporado y ampliado en #287; no fusionar #303 por separado.
- Se endureció el runner remoto para aceptar solo URLs de loopback explícitas y mismas sesiones/DB; se añadieron tests negativos. Se añadió validación estricta de filename/sidecar SHA-256 y se eliminó la interpolación de filename no confiable en shell. El diagnóstico del backup oculta stderr de psql.
- Main sigue en `c5373564413ba086690552c6b7deeab08d7b4a89`; no contiene el diagnóstico ni la exclusión solo de datos. Último schedule observado `42842855127` (2026-11-10 SUCCESS), anterior a ambos cambios. No hay run natural posterior observado; no dispatch manual.
- Los artefactos antiguos no satisfacen el contrato nuevo porque carecen del esquema de auth efímera que ahora se conserva vacío. Esperar backup natural posterior a la integración antes de cualquier ensayo remoto.
- Issue #53 OPEN/P0; producción NOT READY. Pendientes: principal efectivo/least privilege real, restore remoto real aislado, provisioning provider-specific, simulacro de aplicación, alerta externa, RPO/RTO medidos y coste $0.
- No Neon main, datos reales, secretos/age, grants remotos, Cloudflare/DNS sensibles, deploy, Cron, billing, force-push ni merge de Draft.


## Reconciliación del perfil BCV — 2026-11-11

La rama de integración #287 ahora contiene 23 migraciones numeradas. El perfil sintético de restore BCV se actualizó de 0001–0022 a **0001–0023** en `scripts/db/restore_remote_backup_ephemeral.sh` y `scripts/db/reapply_restore_role_grants.sh`; tras restaurar, ejecuta también `0023_register_shift_runtime_operations.assertions.sql`. El perfil histórico main permanece fijado en 0001–0016 mediante el bundle inmutable `c5373564413ba086690552c6b7deeab08d7b4a89`.

En el HEAD de código `0ca91ff51ec545278ceb8eabd3929083aae9022e`, el smoke test sintético PostgreSQL 18 para main 0001–0016 y BCV 0001–0023 terminó SUCCESS. El perfil BCV incluye ahora ownership/ACL de las funciones de apertura/cierre de turno y su `search_path` restringido. Esto no es restore de artefacto remoto ni demuestra el principal efectivo de backup en producción. No se ejecutó workflow manual ni se leyeron secretos/age. Issue #53 sigue OPEN/P0; producción NOT READY.


## Incidente de backup programado — 2026-11-11

- Run natural `43041961402`, evento schedule, main SHA `c5373564413ba086690552c6b7deeab08d7b4a89`: FAILURE durante instalación de `age` por `Temporary failure resolving` en mirrors Ubuntu (`azure.archive.ubuntu.com`, `archive.ubuntu.com`, `security.ubuntu.com`).
- La ejecución no llegó a comprobar `DATABASE_URL_BACKUP_RO`, conectarse a PostgreSQL, ejecutar pg_dump, cifrar, subir ni publicar el diagnóstico de identidad. No produjo artefacto nuevo; no contarla como backup del día.
- Último schedule SUCCESS observado: `42842855127`, 2026-11-10 15:17:48 UTC. No se hizo workflow_dispatch ni re-run manual.
- El diagnóstico de seis booleanos y askpass mejorado existen solo en la rama de integración #287; main sigue con el mecanismo anterior. Esperar integración segura y un nuevo schedule natural antes de afirmar evidencia operativa.
- Issue #53 permanece OPEN/P0. No restore remoto real, no secretos/age, no Neon/main, no cambios de roles/grants remotos. Producción NOT READY.


## 2026-11-11 — resilience of scheduled backup package installation

A prior natural scheduled backup failed before connecting to Neon because Ubuntu package mirror DNS resolution failed while installing age. The scheduled backup workflow previously used direct `apt-get update/install` calls, unlike the synthetic restore workflow.

PR #287 now reuses the tested bounded helper `scripts/ci/apt-retry.sh` for strict package-index refreshes and installs, runs its isolated regression test, and adds bounded retry/timeouts for fetching the PostgreSQL PGDG signing key. Persistent failures remain non-zero; this does not hide a broken package source. This is a code-level resilience change only: no backup was manually dispatched, no secret or Neon data was accessed, and no real backup success is inferred. Revalidate the exact HEAD and await the next natural scheduled run after any authorized release integration.


---

# Addendum — Turno 16 — contrato de backup least-privilege (2026-11-12 UTC)

- PR #318 se integró por squash en main, SHA 3ac66a180fcf23421b546140a419a45062e633dd. Exact-HEAD pre-merge: 19/19 check-runs SUCCESS; post-merge main: 13/13 check-runs SUCCESS.
- El principal candidato microapp_backup recibe SELECT en tablas/vistas y secuencias de public. SELECT en secuencias preserva last_value en pg_dump; USAGE (nextval) y UPDATE (setval/nextval) quedan prohibidos.
- Auditoría read-only fail-closed incorpora routine_privileges, ACLs efectivas de rutinas públicas, ownership y pg_default_acl; default ACLs son específicas del owner creador.
- PostgreSQL 18 desechable probó provisioning, auditoría por LOGIN, denegaciones de DML/DDL/nextval/setval/EXECUTE, pg_dump custom y cifrado/checksum/descifrado/restore age.
- El diagnóstico de .github/workflows/backup.yml todavía espera el nombre histórico backup_readonly. No se ha cambiado DATABASE_URL_BACKUP_RO ni se ha demostrado su principal efectivo. No rotar el secreto hasta una actualización coordinada y revisada del workflow/diagnóstico.
- --exclude-table-data excluye filas auth del artefacto, pero no impide leerlas en origen durante el dump single-pass.
- PR #319 prepara el runbook del operador. No se ejecutó Neon ni se mutaron datos, roles, grants, passwords o secrets. Issue #53 OPEN/P0; **PRODUCTION: NOT READY**; USD 0.
