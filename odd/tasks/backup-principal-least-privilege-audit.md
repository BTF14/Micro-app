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

# ODD Task — Verify effective backup principal and least privilege

**Date:** 2026-11-11  
**Priority:** P0 / Security Level 1  
**Branch:** `integration/bcv-checkout-rehearsal-20261109`  
**Related issue:** #53 OPEN/P0

## Known uncertainty

The production workflow consumes `DATABASE_URL_BACKUP_RO` but has not recorded `current_user`, `session_user`, effective role attributes, memberships, or write privileges. Documentation records a possible `backup_readonly` → `neon_superuser` → `pg_write_all_data` membership path, but does not prove that the secret resolves to that principal.

Do not inspect, print, decode, copy, or otherwise reveal the secret value. Do not connect manually to production or mutate remote roles/grants. Read-only catalog metadata queries are permitted only when explicitly authorized; the 2026-11-11 SELECT-only review is recorded below.

## Implemented diagnostic

The scheduled backup workflow now runs a non-blocking, read-only SQL diagnostic using the existing secret connection. It emits only booleans into the GitHub Actions summary:

- effective identity matches `backup_readonly` for both `current_user` and `session_user`;
- login role attributes are non-privileged;
- no role memberships exist;
- no table/column write privileges exist;
- no sequence USAGE/UPDATE privileges exist;
- no CREATE privilege exists on public schema or current database.

It never prints DSN, host, username, credentials, row contents, or secret values. Failure to query or a failed contract is a warning, not a backup blocker; backup generation continues to protect recovery continuity.

## Acceptance gates

1. Observe the next naturally scheduled backup run; do not dispatch it manually.
2. Verify the summary contains all six booleans without sensitive values.
3. If any check fails, keep issue #53 open and design a least-privilege role change through a separately authorized, reviewed procedure. Do not change remote roles/grants from this diagnostic.
4. Confirm that the backup still completes and the encrypted artifact/sidecar workflow remains unchanged.
5. Do not declare least privilege verified until the effective principal and all privilege checks pass on a real scheduled run.

## Limitations

The synthetic CI profile cannot prove the real secret identity or remote privilege state. This diagnostic does not measure RPO/RTO, test remote artifact restoration, prove external alert delivery, or certify cost $0. Issue #53 remains OPEN/P0; production NOT READY.


## Coverage limitation — 2026-11-11

The six-boolean diagnostic in `.github/workflows/backup.yml` currently evaluates `has_membership` only when the backup principal is the `member` in `pg_auth_members`. It does not detect other roles that are members of `backup_readonly` (`roleid = principal.oid`) and may be able to `SET ROLE` to it. Therefore this boolean does not yet prove absence of all role-membership edges. Keep the least-privilege gate open until the predicate checks both directions and a synthetic test covers both membership orientations. Do not infer effective identity or least privilege from backup success alone.


## Predicate correction — 2026-11-11

- Finding: the original membership boolean joined `pg_auth_members.member` only, detecting roles that the backup principal belongs to but not other roles that belong to `backup_readonly`.
- Change on the integration branch: the diagnostic now matches the principal OID against both `pg_auth_members.member` and `pg_auth_members.roleid`. Any membership edge in either direction makes the boolean true and keeps the expected-false gate open.
- Regression test: `.github/scripts/test-backup-principal-membership.sql` creates disposable roles and independently tests (1) principal-as-member, (2) principal-as-granted-role, and (3) no-membership baseline. It runs only against the disposable PostgreSQL 18 service in `migration-check.yml`, using `docker exec` and no external database connection; it does not connect to Neon or inspect repository secrets.
- Status: implementation committed to the integration branch; exact-HEAD CI and the new regression test must pass before this correction is considered validated. No remote roles/grants or secrets changed.


## Regression execution — 2026-11-11

- The bidirectional membership predicate is now implemented in the integration-branch backup diagnostic.
- Disposable PostgreSQL 18 regression test passed in `migration-check` run `43044533159` on code SHA `373dbc177fc6d9876112eb57cedc21db8dd31dd7`: principal-as-member, principal-as-granted-role, and no-membership baseline.
- This proves the SQL predicate regression in CI only. It does not prove the production backup secret identity, remote grants, absence of all privileges outside the diagnostic's inspected scope, or backup artifact recovery. Keep issue #53 OPEN/P0 and production NOT READY.


## Exact-HEAD regression confirmation — 2026-11-11

- Run `43047173060` passed on SHA `53894254c26838dd56f5a39764fedf4cf1d64067`; the disposable PostgreSQL 18 membership regression passed for both directions and the empty baseline.
- This is CI predicate evidence only. The natural main backup `43041961402` failed before DB connection while installing age due Ubuntu DNS, so it produced no artifact and did not execute the six-boolean diagnostic. Effective production identity and least privilege remain unverified; issue #53 stays OPEN/P0.


## Read-only Neon catalog verification — 2026-11-11

- Scope: project `micro-app-db` (`restless-fire-99110035`), primary/default branch `main` (`br-summer-math-b7297a60`), database `neondb`.
- Queries: SELECT only against `pg_roles`, `pg_auth_members`, and PostgreSQL privilege predicates. No business rows, secrets, connection strings or credentials were read.
- Role `backup_readonly`: LOGIN true, SUPERUSER false, INHERIT true, CREATEROLE true, CREATEDB true, REPLICATION true, BYPASSRLS true.
- Direct membership: `backup_readonly` is a member of `neon_superuser`. Effective membership: `pg_has_role` returns true for `pg_write_all_data` and `pg_read_all_data`.
- Effective privilege predicates: SELECT/INSERT/UPDATE/DELETE on `public.products` all true; TRUNCATE false; CREATE on current database true; CREATE on public schema false.
- Conclusion: the role named `backup_readonly` is not read-only and is materially overprivileged. If the backup secret uses it, least privilege is violated.
- Limit: the secret value was not read; actual `current_user` / `session_user` used by `DATABASE_URL_BACKUP_RO` remains unknown. The natural scheduled diagnostic after integration is still required.
- No role, membership, grant, password, secret, database, workflow or production state was modified. Issue #53 remains OPEN/P0. Evidence comment: `6802571142`.


## Disposable least-privilege pg_dump contract test — planned 2026-11-11

The live Neon catalog review found that the role named `backup_readonly` is overprivileged. Before any remote remediation is considered, validate a replacement permission contract using only the disposable PostgreSQL 18 service in CI.

### Proposed contract

- Create a disposable LOGIN role with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT` and no memberships.
- Grant only database CONNECT, schema USAGE, table SELECT and sequence SELECT needed by `pg_dump`; do not grant CREATE, INSERT, UPDATE, DELETE, TRUNCATE, role memberships or role-administration attributes.
- Verify the role can read a synthetic fixture and complete `pg_dump` plus `pg_restore --list`.
- Verify it cannot INSERT/UPDATE/DELETE, CREATE DATABASE, CREATE ROLE or `SET ROLE` to an elevated role.
- Verify role attributes and absence of membership edges in both directions.
- Cleanup all fixture objects and the test role. This test runs only inside the ephemeral CI PostgreSQL 18 service; it never connects to Neon and uses no repository secrets.

### Evidence and limits

- Current Neon main has 15 application base tables in `public`, with neither RLS nor FORCE RLS enabled. This supports testing an explicit-SELECT role without BYPASSRLS for the currently observed schema; re-evaluate if RLS is introduced.
- This test validates a candidate role contract and `pg_dump` compatibility only. It does not prove which user `DATABASE_URL_BACKUP_RO` uses and does not authorize remote role/grant/password/secret changes.
- Status: implemented in commit `cb81ecdf6bb5fe2c0d7806f6d744925300c8ba7a`; exact-HEAD CI passed 16/16 check-runs, 11/11 PR workflows and 2/2 push workflows. Issue #53 remains OPEN/P0 and production NOT READY.


## Default sequence privileges gap — 2026-11-11

- All 15 application base tables in Neon main `public` are owned by `neondb_owner`; both existing public sequences (`audit_logs_id_seq`, `sales_sale_number_seq`) are also owned by `neondb_owner`.
- `pg_default_acl` for `neondb_owner` in `public` contains only object type `r` (tables): `{backup_readonly=r/neondb_owner}`. No default ACL for sequences (`defaclobjtype='S'`) was found.
- Existing sequences have effective SELECT and UPDATE for `backup_readonly`, with USAGE false. The role's elevated memberships/attributes must not be relied on for this access.
- A replacement role contract must grant SELECT on existing sequences and add default SELECT on future sequences, without USAGE/UPDATE. Future tables also need default SELECT grants owned by `neondb_owner`.
- Extend the disposable PostgreSQL contract test to prove both explicit grants on existing objects and default SELECT grants on future tables/sequences. This remains CI-only; no Neon default ACL or role was modified.


## Default ACL regression implemented — 2026-11-11

The disposable PostgreSQL 18 contract test now exercises the exact missing sequence-default case observed in Neon main:

- Creates a synthetic object owner and backup login with no memberships or elevated role attributes.
- Adds default `SELECT` privileges for future tables and future sequences, scoped to the synthetic schema.
- Creates pre-existing and future tables/identity sequences plus a standalone future sequence as the object owner.
- Grants explicit SELECT on all existing objects, then asserts SELECT-only access to existing and future tables/sequences.
- Asserts no INSERT/UPDATE/DELETE/TRUNCATE, no sequence USAGE/UPDATE, no database/schema CREATE, no membership edges, and exact default ACL entries for both table and sequence object classes.
- Exercises `pg_dump` and `pg_restore --list` as the backup login; negative tests include sequence `nextval` and `setval` denial.

This is an isolated candidate contract only. It does not alter Neon default ACLs, roles, grants, passwords, secrets or production workflows. The live secret identity remains unknown; issue #53 remains OPEN/P0.


## Exact-HEAD validation — 2026-11-11 — PR #287 HEAD `e5f956271f723bfa00da2ab527c35ac422cf6d2d`

- Exact HEAD: 16/16 check-runs SUCCESS; 11/11 PR workflows and 2/2 push workflows SUCCESS.
- PostgreSQL migration validation 86/86 steps SUCCESS, including this test; migration runner 21/21; backup restore main 11/11 and BCV 10/10; CI main 43/43.
- Formal reviews 0, review threads 0. PR remains OPEN/Draft. Issue #53 OPEN/P0; production NOT READY.
- Live secret principal remains unknown; this test is disposable CI only. No Neon role/grant/secret changes were made.


## Turno 35 — direct database-owner ADMIN-only exception

**Authorization:** PR #338 only, based on main SHA `3b0b8d0ce24ab823ff41b84cd56a48b36dedae88`. No Neon, GitHub Secrets, Cloudflare manual settings, backup dispatch, or remote backup repository writes are authorized in this change.

### Finding and correction

- The live `.github/workflows/backup.yml` diagnostic rejected every membership edge. After the owner-confirmed Fase 3A rotation, the backup login is expected to be `microapp_backup`; PostgreSQL 16+ can retain an incoming creator edge from `pg_database.datdba` with ADMIN=true, INHERIT=false, SET=false. Rejecting that exact edge would be a false positive.
- The prior `scripts/audit_database_roles.sql` rejected outgoing edges and non-owner incoming members but did not validate the ADMIN/INHERIT/SET flags or effective owner USAGE/SET. This discrepancy is corrected in the same PR; do not describe the previous script as already enforcing the full contract.
- The diagnostic now sets `has_membership=t` for every outgoing edge; any incoming member other than `d.datdba`; any owner edge without ADMIN or with INHERIT/SET; or effective owner USAGE/SET when the database owner is not a superuser.
- The sole accepted edge is `m.member=d.datdba AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option`, with effective owner USAGE/SET absent for a non-superuser owner. The six-boolean output, non-blocking diagnostic behavior, and temporary identity allowlist `backup_readonly` / `microapp_backup` remain unchanged.

### Regression coverage

- PostgreSQL 18 disposable CI test provisions a non-superuser database owner with CREATEROLE, creates the backup principal under that owner, and verifies the real direct-owner ADMIN-only edge exists.
- It asserts the accepted edge yields `has_membership=f`; outgoing, rogue incoming, owner SET=true, owner INHERIT=true, and owner ADMIN=false each yield `t`. The owner is non-superuser so the effective `pg_has_role(..., 'USAGE'/'SET')` checks are exercised rather than bypassed.
- `.github/workflows/migration-check.yml` already runs this test against its ephemeral PostgreSQL 18 service. No Neon connection or repository secret is used.
- The read-only operator audit now enforces the same membership contract.

### Fase 3A / owner-confirmed facts

- The owner reports Fase 3A complete on Neon main: baseline 0002 adopted; migrations 0001–0023 applied; least-privilege roles/default privileges established; audit and rollback assertions passed; 11/11 rows intact; snapshot `pre-phase3-main-snapshot` / `br-nameless-poetry-b7au2w0s` preserved; `backup_readonly` retained temporarily.
- The owner confirms `DATABASE_URL_BACKUP_RO` has been rotated to `microapp_backup` using a direct (non-pooler) connection. `AGE_PRIVATE_KEY` and `BACKUP_REPO_TOKEN` are present. No agent inspected or changed any secret.
- These are owner-confirmed operational facts, not independently re-read by this PR. No Neon operation is performed here.

### Gates / limits

- PR #338 exact-HEAD CI, full diff review, review threads, branch protection, squash merge, and post-merge main checks remain mandatory.
- After integration, observe only the next natural 07:00 UTC scheduled backup. Never use `workflow_dispatch` to manufacture evidence. Verify the six booleans, encrypted artifact and sidecar, and remote readback SHA-256 before the separate real-restore gate.
- Issue #53 remains OPEN/P0 and production remains NOT READY until the natural backup, isolated encrypted restore, and all remaining Security Level 1 gates are evidenced.
- PRs #193/#314/#315/#316 and Issue #53 are outside scope and remain untouched. No Neon, secrets, Cloudflare manual settings, billing, DNS, or deployment operations.
