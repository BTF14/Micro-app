
## Addendum — contrato de roles runtime y productor BCV (Turno 32)

La misma semántica de PostgreSQL 16+ aplica a los roles de aplicación creados por el database owner no-superuser. Se extiende la invariante a `microapp_runtime` y `microapp_bcv_sync`:

- Todas las membresías salientes del rol de aplicación están prohibidas.
- Una membresía entrante solo puede tener como miembro a `pg_database.datdba` de la base conectada.
- La arista admitida debe tener `ADMIN OPTION=true`, `INHERIT=false` y `SET=false`.
- Para propietarios no-superuser, `pg_has_role(datdba, app_role, 'USAGE'/'SET')` debe ser false.
- No se relajan atributos del rol, ACLs de schema/tablas, ownership ni grants funcionales.

La comprobación efectiva se condiciona a que el database owner no sea superuser porque el superuser tiene bypass inherente de privilegios de membresía; la arista Neon relevante es la concedida a un owner administrado no-superuser. La comprobación explícita de flags de `pg_auth_members` se mantiene en todos los casos.

La implementación y prueba PostgreSQL 18 se encuentran en la PR #337 y `odd/tasks/neon-runtime-bcv-role-membership-20261112.md`. La validación real Neon posterior al merge sigue siendo un gate separado y requiere autorización específica; no se muta Neon ni secretos en Turno 32.

- 2026-11-12 — ampliación aprobada para runtime/BCV; PR #337 y CI exact-HEAD pendientes.
# ADR — Principal de backup Neon y contrato de mínimo privilegio

- **ID:** ADR-20261112-neon-backup-principal
- **Estado:** accepted
- **Fecha:** 2026-11-12
- **Responsables:** Arquitectura / Seguridad
- **Relacionado:** Issue #53, `odd/tasks/security-issue-53-neon-role-matrix.md`, PR #318, PRs #303/#305

## Contexto y problema

Las pruebas sintéticas PostgreSQL 18 demuestran que un principal dedicado puede ejecutar el dump con privilegios acotados. Eso no demuestra qué rol usa el secreto `DATABASE_URL_BACKUP_RO` en Neon ni que los grants, membresías y ownership reales sean mínimos.

La evidencia histórica SELECT-only documentada en `docs/SECURITY_ROADMAP.md` encontró que el rol llamado `backup_readonly` tenía atributos administrativos, membresías privilegiadas y grants de escritura. No se ha demostrado que sea el principal del secreto. El nombre de rol o secreto no es evidencia de identidad efectiva.

## Decisión propuesta

1. Auditar la conexión candidata usando `current_user` y `session_user`; nunca inferir el rol por el nombre del secreto.
2. Separar runtime, migrador y backup; el backup no tiene membresías salientes, no hereda roles, no posee objetos y no recibe atributos administrativos. Se permite únicamente la membresía entrante que PostgreSQL 16+ puede conceder automáticamente al creador no-superuser del rol, si y solo si ese miembro es el propietario directo de la base actual (`pg_database.datdba`).
3. La auditoría es read-only y fail-closed. El script de aprovisionamiento es una plantilla operator-run, no se ejecuta en CI ni contra Neon automáticamente.
4. No guardar ni pasar contraseñas en texto plano; usar el prompt seguro `psql \\password` y habilitar LOGIN solo después de establecerla.
5. Rechazar privilegios DML/DDL, ownership, cualquier membresía saliente y toda membresía entrante que no sea la del propietario directo de la base; rechazar BYPASSRLS.

## Enmienda — comportamiento Neon / PostgreSQL 16+ (2026-11-12)

La prueba aislada del Turno 29 verificó que Neon permite crear `microapp_backup` con atributos restrictivos desde `CREATE ROLE`, pero bajo el principal no-superuser `neondb_owner` registra una membresía administrativa entrante: el rol concedido es `microapp_backup`, el miembro es `neondb_owner`, el grantor observado fue `cloud_admin` y `ADMIN OPTION=true`. No se observó membresía saliente del backup. Esta arista no hace que el backup herede privilegios del database owner; representa la capacidad del creador/owner para administrar o asumir el rol que creó.

La prueba también rechazó `ALTER ROLE ... NOSUPERUSER` bajo `neondb_owner` con SQLSTATE 42501. En consecuencia:
- `NOSUPERUSER` se establece en `CREATE ROLE`.
- El provisioning falla cerrado si el rol ya existe con `rolsuper=true`.
- El `ALTER ROLE` posterior no intenta reafirmar `NOSUPERUSER`.
- El preflight y la auditoría permiten solo membresías entrantes cuyo miembro sea el propietario directo de la base (`pg_database.datdba`); cualquier membresía saliente o cualquier otro miembro es FAIL.
- La prueba PostgreSQL 18 debe ejecutar el provisioning desde un LOGIN no-superuser con `CREATEROLE` que sea propietario de la base, validar la arista automática, comprobar que el audit pasa y verificar que miembros adicionales y membresías salientes hacen fallar la auditoría.

Esta enmienda adapta el control al modelo administrado sin relajar la separación de privilegios. No certifica por sí sola Neon real tras el cambio; requiere el ensayo aislado post-merge. Neon `main`, GitHub Secrets y el principal efectivo del secreto permanecen fuera de alcance.

## Alternativas y tensión técnica de secuencias

La solicitud de cero privilegios sobre secuencias entra en conflicto con el contrato de dump completo ya probado: `pg_dump` necesita leer el estado de secuencia para preservar valores. El contrato sintético vigente concede SELECT y niega USAGE/UPDATE. La propuesta conserva SELECT como permiso estrictamente de lectura y bloquea nextval/setval. Eliminar también SELECT requeriría aceptar explícitamente un dump que no preserva el estado de secuencias y probar su recuperación; no se declarará equivalente sin esa evidencia.

## Consecuencias y riesgos

- La auditoría puede fallar por grants heredados de PUBLIC o por permisos indirectos; el resultado debe investigarse, no corregirse automáticamente.
- Los default privileges son específicos del rol creador de objetos; una concesión global no se puede asumir. Cada owner real debe inventariarse.
- El aprovisionamiento no elimina memberships ni transfiere ownership; falla cerrado si detecta memberships/ownership y exige remediación explícita.
- No se cambia Neon, secretos ni configuración de backup en esta fase.

## Reversión o sustitución

No se aplica DDL remoto. En pruebas sintéticas, recrear la base desechable. Antes de aplicar en Neon, requiere aprobación específica, identificación inequívoca del destino, inventario de owners/default ACLs, prueba PostgreSQL efímera, continuidad del backup y recuperación comprobada.

## Evidencia

- Repositorio/rama: `BTF14/Micro-app` / `security/issue-53-neon-role-matrix-20261112`.
- Base: `bd9af0cc5b92858fd5063b3d8d102dbc327469ac`.
- Scripts: `scripts/audit_database_roles.sql`, `scripts/provision_neon_backup_role.sql`.
- Prueba: extensión de `scripts/tests/test_backup_role_privileges.sh`, ejecutada por el restore smoke legado.
- Limitaciones: aún no se ejecutó CI exact-HEAD ni se conectó a Neon.

## Implementación de compatibilidad Neon — Turno 30 (pendiente de CI)

- Rama: `fix/neon-compatible-backup-role-contract-20261112`.
- Cambio propuesto: permitir únicamente la membresía entrante del database owner, prohibir todas las salientes y omitir `NOSUPERUSER` del `ALTER ROLE` posterior.
- Añadido escenario PostgreSQL 18 con creador no-superuser `CREATEROLE`; pendiente de ejecutar en CI exact-HEAD.
- No se modificó Neon `main`, GitHub Secrets ni se rotaron credenciales. Issue #53 permanece OPEN/P0; **PRODUCTION: NOT READY**.


## Historial

- 2026-11-12 — propuesta creada a partir de la evidencia histórica y el contrato sintético existente.


## Aceptación e implementación — Turno 16 (2026-11-12)

- PR #318 squash-merged en main: 3ac66a180fcf23421b546140a419a45062e633dd.
- Exact-HEAD pre-merge: 15/15 workflows y 19/19 check-runs SUCCESS.
- El test PostgreSQL 18 desechable verificó provisioning, auditoría, rechazo de DML/DDL/nextval/setval/EXECUTE, pg_dump custom y cifrado/restore age.
- Se conserva SELECT-only en secuencias; no se concede USAGE ni UPDATE.
- Esta aceptación cubre el diseño/código y la evidencia sintética. No certifica Neon real, no identifica el principal efectivo de DATABASE_URL_BACKUP_RO y no autoriza cambiar secrets o grants remotos.
- Issue #53 permanece OPEN/P0 hasta la ejecución documentada del runbook y evidencia de backup natural + restore. **PRODUCTION: NOT READY**.
