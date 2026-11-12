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
- Cero membresías de roles, tanto concedidas como recibidas; no pertenecer a pg_database_owner, neondb_owner ni al rol runtime.
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
- Si hay memberships, ownership, atributos administrativos, grants de escritura, USAGE/UPDATE de secuencias o EXECUTE de rutinas, detener. No revocar automáticamente.
- Si la auditoría falla por EXECUTE efectivo vía PUBLIC, identificar la rutina y sus callsites. No ejecutar REVOKE EXECUTE ON ALL FUNCTIONS ... FROM PUBLIC de forma masiva: podría romper funciones de la aplicación.
- La auditoría de ACLs de tablas, vistas, secuencias y rutinas está acotada al schema public; no interpretarla como una certificación de ACLs de todos los schemas.

## 4. Revisar owners y default privileges

Antes de aprovisionar, obtener una lista de owners de objetos y default ACLs con consultas de catálogo SELECT-only. Confirmar qué rol crea realmente tablas y secuencias en futuras migraciones.

La sentencia incluida en scripts/provision_neon_backup_role.sql:

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT ON SEQUENCES TO microapp_backup;

se aplica **solo al rol que ejecuta el script**. No configura automáticamente defaults de otros owners. Si hay varios owners, el DBA debe configurar y verificar cada owner real por separado, por ejemplo:

    ALTER DEFAULT PRIVILEGES FOR ROLE <owner_verificado>
      IN SCHEMA public
      GRANT SELECT ON SEQUENCES TO microapp_backup;

No sustituir <owner_verificado> por un nombre supuesto. Ejecutar esta operación únicamente con la autoridad/membresía requerida y después de documentar el owner. No conceder USAGE ni UPDATE.

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
6. Configura default SELECT de secuencias para objetos creados por el rol que ejecuta el script.
7. Solicita la contraseña con psql \password y habilita LOGIN al final.

El modo backup_role_test_mode y BACKUP_ROLE_TEST_PASSWORD existen exclusivamente para el fixture sintético de CI. **No utilizarlos en Neon real.** En producción usar el prompt interactivo seguro; nunca incluir una contraseña en SQL versionado, argumentos, logs o shell history.

El script no corrige ownership ni memberships preexistentes: si falla el preflight, detener y preparar una remediación separada, revisada y con rollback.

## 6. Verificación posterior con el LOGIN de backup

Actualizar el gestor de secretos solo mediante el proceso autorizado de cambios de secretos. Antes de sustituir DATABASE_URL_BACKUP_RO, comprobar que el workflow de backup y su diagnóstico de identidad estén coordinados con el nombre de rol real.

**Advertencia de compatibilidad actual:** .github/workflows/backup.yml contiene un diagnóstico heredado que espera backup_readonly. PR #318 crea y prueba microapp_backup, pero no cambia el secreto ni ese diagnóstico. No rotar el secreto a microapp_backup hasta que el workflow/diagnóstico y la conexión hayan sido actualizados mediante un cambio separado, revisado y aprobado.

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

- Si la auditoría no pasa: no continuar con rotación de secreto ni con el siguiente backup natural; conservar el principal anterior hasta que el problema esté entendido.
- Si el backup natural falla: conservar el artefacto previo válido, revertir solo el cambio de secreto/workflow aprobado y restaurar el camino de backup anterior. No borrar roles ni grants como reacción automática.
- Si la restauración falla: mantener el estado PRODUCTION: NOT READY, conservar logs no sensibles y abrir seguimiento; no probar restauración sobre Neon main.
- Cualquier DROP ROLE, transferencia de ownership, revocación de grants a otros principals o cambio de password requiere un plan de reversión específico, revisión y aprobación independiente.

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
