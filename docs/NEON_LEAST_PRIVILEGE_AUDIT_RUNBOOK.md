# Runbook operativo — auditoría y aprovisionamiento Neon least-privilege

- **Estado:** operador pendiente; no ejecutado en Neon.
- **Relacionado:** Issue #53 (OPEN/P0), PR #318 (merged), ADR-20261112-neon-backup-principal.
- **Producción:** **NOT READY**.
- **Presupuesto:** USD 0.
- **Alcance:** identificar, aprovisionar y verificar un principal dedicado de backup; preservar el contrato de dump/restauración.
- **Regla de seguridad:** este documento no es autorización para ejecutar cambios. Requiere ventana aprobada, destino confirmado y operador autorizado.

## 1. Contrato que debe cumplirse

El principal dedicado se denomina microapp_backup. Debe conectarse directamente como LOGIN, sin SET ROLE, y cumplir:

- rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls = false.
- rolinherit = false; rolcanlogin = true.
- Cero membresías salientes (el principal de backup no puede ser miembro de ningún rol). Las membresías entrantes se permiten únicamente cuando el único miembro es el propietario directo de la base actual (`pg_database.datdba`), relación administrativa que PostgreSQL 16+ puede crear automáticamente cuando un rol no-superuser con `CREATEROLE` crea el principal. Ningún runtime, migrator, backup antiguo ni otro rol puede asumir la identidad de backup.
- Cero ownership de base, schemas, tablas, vistas, secuencias, rutinas u otros objetos.
- Base: CONNECT, sin CREATE. Schema public: USAGE, sin CREATE.
- Tablas y vistas de public: SELECT solamente; sin DML, TRUNCATE, REFERENCES, TRIGGER, grants de columna ni grant option.
- Secuencias de public: SELECT solamente. **No conceder USAGE ni UPDATE.** PostgreSQL permite nextval() con USAGE; UPDATE permite mutación adicional. Ambos violan el contrato read-only.
- Rutinas públicas ejecutables: sin EXECUTE efectivo para el principal, excepto funciones asociadas exclusivamente a triggers que PostgreSQL invoca como trigger y que no son invocables directamente.
- Default ACLs concedidos a microapp_backup: únicamente SELECT no delegable para tablas/secuencias de public, nunca EXECUTE ni privilegios de escritura.

SELECT en secuencias permite leer su estado (last_value) para que pg_dump conserve los valores. No autoriza avanzar la secuencia. Esta decisión fue probada en PostgreSQL 18 desechable dentro de PR #318.

## 2. Precondiciones obligatorias

Antes de cualquier cambio:

1. Obtener aprobación explícita del propietario para la ventana y el operador responsable.
2. Confirmar visualmente en Neon el proyecto, branch, database y endpoint exactos. No deducir el destino a partir del nombre de una variable.
3. Confirmar que se dispone de un backup reciente cifrado, checksum válido, llave privada age custodiada fuera del repositorio y un procedimiento de restauración probado.
4. Disponer de una instancia PostgreSQL 18 desechable para ensayar cualquier cambio de permisos y restauración. Nunca usar main como entorno de prueba.
5. Inventariar los owners reales de tablas, vistas, secuencias y rutinas de public, además de sus default ACLs. Los default privileges son específicos del rol que crea los objetos.
6. No activar set -x, no imprimir variables de conexión, no copiar DSNs a logs, issues, comentarios o capturas.
7. No realizar DML de prueba contra Neon. Las pruebas negativas de INSERT/UPDATE/DELETE/nextval/setval/EXECUTE se hacen exclusivamente en PostgreSQL desechable.

Si cualquiera de estas condiciones falta, detener el procedimiento. No improvisar ni ejecutar remediaciones parciales.

## 3. Identificar el principal efectivo actual (solo lectura)

Usar el entorno seguro donde ya está disponible DATABASE_URL_BACKUP_RO; no escribir el DSN en el comando ni en un archivo versionado:

    set +x
    : "${DATABASE_URL_BACKUP_RO:?La conexión de backup debe estar provisionada en el entorno seguro}"
    psql "$DATABASE_URL_BACKUP_RO" -X -v ON_ERROR_STOP=1 \
      -f scripts/audit_database_roles.sql

La primera salida identifica current_user, session_user, database y versión de PostgreSQL. La auditoría no cambia datos ni privilegios. Puede terminar con error si encuentra una condición prohibida; conserva el resultado no sensible y registra el motivo.

- No asumir que el secreto usa backup_readonly ni que el nombre del secreto identifica al rol.
- Si current_user difiere de session_user, hay SET ROLE o proxy/intermediación: detener y resolver la identidad antes de seguir.
- Si hay membresías salientes, membresías entrantes de cualquier rol distinto del propietario directo de la base, ownership, atributos administrativos, grants de escritura, USAGE/UPDATE de secuencias o EXECUTE de rutinas, detener. No revocar automáticamente. La única arista entrante permitida no es herencia del propietario hacia backup: `pg_auth_members.roleid` apunta a `microapp_backup` y `member` al database owner; `microapp_backup` no hereda los privilegios del owner.
- Si la auditoría falla por EXECUTE efectivo vía PUBLIC, identificar la rutina y sus callsites. No ejecutar REVOKE EXECUTE ON ALL FUNCTIONS ... FROM PUBLIC de forma masiva: podría romper funciones de la aplicación.
- La auditoría de ACLs de tablas, vistas, secuencias y rutinas está acotada al schema public; no interpretarla como una certificación de ACLs de todos los schemas.

## 4. Revisar owners y default privileges

Antes de aprovisionar, obtener una lista de owners de objetos y default ACLs con consultas de catálogo SELECT-only. Confirmar qué rol crea realmente tablas y secuencias en futuras migraciones.

El script configura los defaults de tablas/vistas y secuencias únicamente para el rol que ejecuta el script:

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT ON TABLES TO microapp_backup;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT ON SEQUENCES TO microapp_backup;

Esto **no configura automáticamente los defaults de otros owners**. Primero inventariar con consultas SELECT-only todos los owners reales que crean tablas, vistas y secuencias. Para cada owner adicional verificado, un administrador autorizado debe ejecutar y comprobar ambas sentencias:

    ALTER DEFAULT PRIVILEGES FOR ROLE <owner_verificado>
      IN SCHEMA public
      GRANT SELECT ON TABLES TO microapp_backup;
    ALTER DEFAULT PRIVILEGES FOR ROLE <owner_verificado>
      IN SCHEMA public
      GRANT SELECT ON SEQUENCES TO microapp_backup;

No sustituir <owner_verificado> por un nombre supuesto (incluido neondb_owner). No conceder USAGE ni UPDATE sobre secuencias. Si no se dispone de autoridad/membresía para modificar los defaults de un owner, detener el provisioning y documentar el bloqueo; no cambiar ownership para sortearlo. Verificar los registros resultantes en pg_default_acl y ejecutar la auditoría desde el LOGIN de backup.

## 5. Aprovisionar microapp_backup (DDL; solo tras aprobación)

Este paso cambia roles y ACLs en la base objetivo. No ejecutarlo como parte de CI, ni desde una automatización, ni antes de completar las secciones 2–4.

Conectar directamente con el usuario autorizado que administra los objetos (normalmente el migrador real) y confirmar primero current_user, session_user, current_database() y el destino. No usar un usuario superuser si existe un migrador no-superuser autorizado.

    set +x
    : "${APP_MIGRATOR_DATABASE_URL:?Falta la conexión directa autorizada del migrador}"
    psql "$APP_MIGRATOR_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
      -f scripts/provision_neon_backup_role.sql

El script:

1. Crea microapp_backup como NOLOGIN si no existe.
2. Falla cerrado si detecta memberships u ownership previos que requieren investigación.
3. Fija atributos no administrativos, NOINHERIT y NOBYPASSRLS.
4. Revoca los privilegios previos directos sobre la base, schema public, tablas y secuencias.
5. Concede CONNECT, USAGE del schema, SELECT de tablas/vistas y SELECT de secuencias.
6. Configura default SELECT de tablas/vistas y secuencias para objetos creados por el rol que ejecuta el script. Los demás owners requieren las sentencias FOR ROLE de la sección 4, ejecutadas solo después de inventariarlos y confirmar autoridad.
7. Solicita la contraseña con psql \password y habilita LOGIN al final.

El modo backup_role_test_mode y BACKUP_ROLE_TEST_PASSWORD existen exclusivamente para el fixture sintético de CI. **No utilizarlos en Neon real.** En producción usar el prompt interactivo seguro; nunca incluir una contraseña en SQL versionado, argumentos, logs o shell history.

El script no corrige ownership ni memberships preexistentes: si falla el preflight, detener y preparar una remediación separada, revisada y con rollback.

### Compatibilidad de membresías PostgreSQL 16+ / Neon

Cuando un rol no-superuser con `CREATEROLE` crea otro rol, PostgreSQL 16+ puede registrar automáticamente al creador como miembro administrador del rol recién creado. En `pg_auth_members` la dirección es:

- `roleid = microapp_backup` (rol concedido).
- `member = pg_database.datdba` (propietario directo de la base).
- El creador puede aparecer con `ADMIN OPTION = true`.

Esta es una **membresía entrante** al rol de backup. No convierte a `microapp_backup` en miembro del database owner, no le hace heredar privilegios del owner y no permite asumir las identidades runtime/migrator. Se acepta solo si el miembro es exactamente el propietario de la base conectada. Toda membresía saliente del backup y toda membresía entrante de otro rol siguen siendo FAIL.

La prueba aislada de Neon del 2026-11-12 observó esta arista con `neondb_owner` como miembro y `cloud_admin` como grantor. También observó que `ALTER ROLE ... NOSUPERUSER` fue rechazado con SQLSTATE 42501 bajo `neondb_owner`. Por eso el script establece NOSUPERUSER al crear el rol, rechaza roles preexistentes con `rolsuper=true` y no incluye NOSUPERUSER en el ALTER ROLE posterior. La corrección debe volver a probarse en una rama temporal Neon después de integrarse; esta evidencia no certifica aún el principal real de backup.

## 6. Verificación posterior con el LOGIN de backup

Actualizar el gestor de secretos solo mediante el proceso autorizado de cambios de secretos. Antes de sustituir DATABASE_URL_BACKUP_RO, comprobar que el workflow de backup y su diagnóstico de identidad estén coordinados con el nombre de rol real.

**Contrato de transición temporal:** la PR #335 actualiza el diagnóstico para aceptar únicamente una conexión directa cuyo current_user y session_user coincidan y cuyo nombre sea backup_readonly o microapp_backup. La allowlist dual existe solo para permitir una transición controlada; no convierte backup_readonly en un principal certificado ni corrige sus privilegios. No rotar DATABASE_URL_BACKUP_RO hasta que la PR #335 esté integrada, el provisioning de microapp_backup haya sido ejecutado y auditado en la ventana autorizada, y la nueva conexión directa haya pasado scripts/audit_database_roles.sql. Después de observar el backup natural y completar restore, una PR posterior debe retirar backup_readonly de la allowlist.

Cuando el secreto apunte al nuevo LOGIN, ejecutar la auditoría directamente por esa conexión (no mediante SET ROLE):

    set +x
    : "${DATABASE_URL_BACKUP_RO:?Falta el secreto ya aprobado y actualizado}"
    psql "$DATABASE_URL_BACKUP_RO" -X -v ON_ERROR_STOP=1 \
      -f scripts/audit_database_roles.sql

El resultado debe terminar en PASS. Cualquier error es NO-GO. No realizar pruebas DML/DDL sobre la base real; usar únicamente los predicados de privilegio y la auditoría read-only.

## 7. Verificación de backup y restauración

1. Confirmar que el workflow programado usa el secreto aprobado y el diagnóstico de identidad actualizado.
2. No ejecutar workflow_dispatch para fabricar evidencia de producción. Observar el siguiente backup natural programado.
3. Verificar que el artefacto cifrado y su sidecar SHA-256 existen y cumplen el formato esperado mediante scripts/db/verify_backup_artifact.sh.
4. Restaurar el artefacto únicamente en PostgreSQL 18 desechable, siguiendo docs/BACKUP_AND_RECOVERY.md y scripts/db/restore_remote_backup_ephemeral.sh. El script exige destino loopback desechable; no desactivar esos guards.
5. Verificar integridad del esquema, manifiestos, relaciones y datos permitidos; registrar el tiempo medido de backup/restauración y evidencia RPO/RTO.
6. Confirmar que la llave privada age permanece fuera del repositorio y que ningún dump sin cifrar se sube o conserva fuera del runner.

**Límite de privacidad conocido:** --exclude-table-data excluye filas de auth_sessions, auth_rate_limits y auth_bootstrap_attempts del artefacto, pero el principal de dump todavía necesita poder leer esas filas en origen para el perfil single-pass actual. No afirmar que esas filas son ilegibles para el backup en origen. Si se requiere impedir esa lectura, hace falta un diseño schema-only + data allowlist y pruebas específicas antes de cambiar el contrato.

## 8. Criterios de cierre de Issue #53

Issue #53 permanece OPEN/P0 hasta que se adjunte evidencia verificable de:

- Identidad efectiva current_user = session_user = microapp_backup en la conexión real de backup.
- Atributos, memberships, ownership, grants de tablas/vistas, secuencias, rutinas y default ACLs aprobados.
- Default privileges verificados para **cada owner real** que crea objetos.
- Workflow de backup alineado con el nuevo principal y su diagnóstico no sensible.
- Al menos un backup natural posterior al cambio, con artefacto cifrado y checksum válido.
- Restauración exitosa en PostgreSQL 18 desechable, con tiempos RPO/RTO medidos.
- Custodia/recuperación de la llave privada age y continuidad/rollback documentados.

Solo después de reunir esa evidencia se puede proponer cerrar el P0. La fusión de PR #318 valida código y pruebas sintéticas; no certifica la configuración real de Neon ni el principal efectivo del secreto.

## 9. Rollback y respuesta a fallos

- Antes de rotar DATABASE_URL_BACKUP_RO, el propietario debe conservar el valor anterior en un gestor de contraseñas seguro bajo su control. GitHub no permite recuperar el valor anterior de un Secret después de sobrescribirlo. Nunca copiarlo a issues, comentarios, logs, archivos versionados o esta conversación.
- Validar la nueva credencial/conexión de forma segura antes de modificar el Secret. La rotación solo ocurre después de que el workflow dual esté integrado y el provisioning/auditoría de microapp_backup haya pasado en la ventana autorizada.
- Si la nueva conexión o el backup natural falla, restaurar DATABASE_URL_BACKUP_RO desde la copia segura del propietario y verificar el workflow de respaldo. No asumir que el valor anterior es least-privilege: este rollback recupera continuidad, no certifica seguridad; mantener Issue #53 OPEN/P0 y PRODUCTION: NOT READY.
- No retirar ni borrar automáticamente backup_readonly, microapp_backup, grants ni ownership como reacción a un fallo. Cualquier revocación, DROP ROLE, transferencia de ownership o cambio de password requiere un plan de reversión específico, revisión y aprobación independiente.
- Conservar el último artefacto cifrado válido y su checksum. No ejecutar workflow_dispatch como sustituto de un backup natural de producción.
- Si la restauración falla, mantener PRODUCTION: NOT READY, conservar logs no sensibles y abrir seguimiento; nunca probar restauración sobre Neon main.
- Tras un backup natural correcto y una restauración fría satisfactoria, preparar un cambio separado para retirar la identidad heredada de la allowlist; no mantener la compatibilidad dual indefinidamente.

## 10. Registro de ejecución del operador

Completar fuera de este repositorio o en un registro aprobado, sin DSNs, passwords, tokens ni filas reales:

- Fecha/hora UTC y operador responsable:
- Proyecto / branch / database confirmados:
- current_user y session_user observados:
- Owners y default ACLs inventariados:
- Resultado de auditoría pre-cambio:
- Cambios autorizados y ventana:
- Resultado de auditoría post-cambio:
- Run del siguiente backup natural y SHA-256 del artefacto:
- Resultado y duración de restore PostgreSQL 18:
- RPO/RTO observados:
- Decisión final de Issue #53:

**Estado final de este documento:** instrucciones preparadas; ejecución real pendiente. **PRODUCTION: NOT READY.**
