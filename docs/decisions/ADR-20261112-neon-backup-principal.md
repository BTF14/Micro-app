# ADR — Principal de backup Neon y contrato de mínimo privilegio

- **ID:** ADR-20261112-neon-backup-principal
- **Estado:** proposed
- **Fecha:** 2026-11-12
- **Responsables:** Arquitectura / Seguridad
- **Relacionado:** Issue #53, `odd/tasks/security-issue-53-neon-role-matrix.md`, PR #318, PRs #303/#305

## Contexto y problema

Las pruebas sintéticas PostgreSQL 18 demuestran que un principal dedicado puede ejecutar el dump con privilegios acotados. Eso no demuestra qué rol usa el secreto `DATABASE_URL_BACKUP_RO` en Neon ni que los grants, membresías y ownership reales sean mínimos.

La evidencia histórica SELECT-only documentada en `docs/SECURITY_ROADMAP.md` encontró que el rol llamado `backup_readonly` tenía atributos administrativos, membresías privilegiadas y grants de escritura. No se ha demostrado que sea el principal del secreto. El nombre de rol o secreto no es evidencia de identidad efectiva.

## Decisión propuesta

1. Auditar la conexión candidata usando `current_user` y `session_user`; nunca inferir el rol por el nombre del secreto.
2. Separar runtime, migrador y backup; el backup no hereda roles, no tiene membresías, no posee objetos y no recibe atributos administrativos.
3. La auditoría es read-only y fail-closed. El script de aprovisionamiento es una plantilla operator-run, no se ejecuta en CI ni contra Neon automáticamente.
4. No guardar ni pasar contraseñas en texto plano; usar el prompt seguro `psql \\password` y habilitar LOGIN solo después de establecerla.
5. Rechazar privilegios DML/DDL, ownership, membresías y BYPASSRLS en el principal de backup.

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

## Historial

- 2026-11-12 — propuesta creada a partir de la evidencia histórica y el contrato sintético existente.
