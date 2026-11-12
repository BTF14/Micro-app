# Tarea crítica — Contrato de backup compatible con Neon / PostgreSQL 16+

- **Workstream:** Issue #53 / PR #336
- **Base verificada:** `main` = `df19c51c96db881a922ce6da73051df4fdd04ba5`
- **Rama:** `fix/neon-compatible-backup-role-contract-20261112`
- **Estado:** implementación y validación pendientes
- **Límites:** Neon `main`, GitHub Secrets, despliegue manual, PRs #193/#314/#315/#316 y datos reales fuera de alcance; presupuesto USD 0.

## Objetivo

Ajustar provisioning y auditoría del principal `microapp_backup` a la membresía administrativa entrante que PostgreSQL 16+ puede crear cuando un rol no-superuser con CREATEROLE crea otro rol, sin permitir membresías salientes ni miembros entrantes distintos del propietario directo de la base de datos.

## Evidencia de partida

La rama aislada Neon `br-dawn-heart-b7caqdc2` permitió `CREATE ROLE ... NOSUPERUSER ...`; el catálogo mostró una arista entrante `roleid=microapp_backup, member=neondb_owner, grantor=cloud_admin, admin_option=true`, sin membresías salientes del principal. Neon rechazó `ALTER ROLE ... NOSUPERUSER` con SQLSTATE 42501 bajo `neondb_owner`. La rama temporal fue archivada/eliminada. Neon `main` no se modificó.

## Alcance

1. `scripts/provision_neon_backup_role.sql`: mantener creación restrictiva; fallar cerrado si un rol preexistente tiene SUPERUSER; exigir cero membresías salientes y permitir como única membresía entrante el propietario directo de la base actual (`pg_database.datdba`); omitir `NOSUPERUSER` de `ALTER ROLE`; conservar revocaciones/grants mínimos y documentar default ACLs owner-specific.
2. `scripts/audit_database_roles.sql`: exigir atributos no privilegiados, LOGIN, cero membresías salientes, y permitir solo la membresía entrante del database owner; mantener todas las demás comprobaciones de ownership y privilegios sin relajación.
3. `scripts/tests/test_backup_role_privileges.sh`: añadir escenario PostgreSQL 18 donde un LOGIN no-superuser con CREATEROLE y propietario de la base crea/provisiona el rol; validar que la membresía entrante única del owner se acepta, membresías salientes/entrantes no permitidas se rechazan, el audit pasa y pg_dump custom funciona.
4. `docs/NEON_LEAST_PRIVILEGE_AUDIT_RUNBOOK.md` y ADR relacionado: documentar el comportamiento observado y la semántica permitida; preservar explícitamente Issue #53 OPEN/P0 y PRODUCTION NOT READY.

## Criterios de aceptación

- El principal no tiene SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS ni INHERIT; LOGIN habilitado.
- Cero membresías salientes del principal.
- Cero membresías entrantes salvo el database owner directo identificado desde `pg_database.datdba`; ninguna identidad runtime, migrator, backup antigua u otro rol puede asumir el principal.
- Cero ownership; grants efectivos y default ACLs continúan limitados a SELECT de tablas/secuencias, CONNECT y USAGE del schema; sin CREATE, DML, USAGE/UPDATE de secuencias ni EXECUTE de rutinas.
- El test cubre tanto el flujo superuser preexistente como el flujo no-superuser Neon-like; pg_dump funciona.
- CI debe estar verde en el HEAD exacto de PR #336. No confundir workflow runs, check-runs, reviews o branch protection.
- Revisión completa del diff; sin cambios a Neon main, secrets, otras PRs o despliegue manual.

## Riesgos y límites

La membresía entrante del database owner concede a ese owner la capacidad administrativa de asumir/administrar el rol; es una relación controlada y no equivale a que el principal de backup herede roles del owner. Se acepta únicamente porque es el propietario de la base identificado por catálogo y porque el propietario de la base ya tiene autoridad administrativa sobre ella. Cualquier otro miembro es FAIL.

La prueba PostgreSQL 18 debe demostrar el comportamiento de catálogo; no sustituye el ensayo posterior en una rama Neon temporal ni la auditoría real del LOGIN, el backup natural y restore frío.

## Siguiente paso

Implementar en la rama indicada, ejecutar tests locales/CI disponibles, crear PR #336 y revisar checks exact-HEAD antes de cualquier merge.