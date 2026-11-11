# ODD task: Issue #53 — contrato de mínimo privilegio para backup y aislamiento de identidad

- Status: approved
- Issue / PR: [Issue #53](https://github.com/BTF14/Micro-app/issues/53); task branch `security/issue-53-backup-min-privilege-20261111`
- Owner / reviewer: propietario del repositorio / revisión técnica independiente pendiente
- Started: 2026-11-11 UTC
- Risk: critical

## Objective and authorization

- Desired outcome: definir y verificar un contrato de mínimo privilegio para la identidad PostgreSQL usada por el backup, sin acceder a secretos ni modificar Neon `main`, roles, grants o datos reales. Separar este gate del resto de identidad/sesiones/autorización tenant que también mantiene abierto #53.
- Authorization boundary: investigación GitHub/código/documentación y este artefacto ODD en rama aislada. No se autoriza leer valores de `DATABASE_URL_BACKUP_RO`, conectarse a Neon, cambiar roles/membresías/grants/contraseñas/secretos, ejecutar backups manuales, restaurar datos reales, mutar Neon, desplegar ni modificar Cloudflare/DNS/billing.
- Relevant original request: definir un rol backup estrictamente de lectura sobre los objetos necesarios del esquema `public`, sin privilegios superuser ni membresía/privilegios de migrador; preservar la estructura de tablas efímeras excluyendo sus filas: `auth_sessions`, `auth_rate_limits`, `auth_bootstrap_attempts`.

## Scope and exclusions

Included:
- Identificar la identidad efectiva usada por el workflow de backup y definir cómo verificarla de forma no sensible, sin revelar URI, username completo, host, password ni secretos.
- Definir atributos y membresías prohibidos: `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS` cuando no sean estrictamente requeridos; membresía efectiva en roles privilegiados, migrator, owner o administrador.
- Definir permisos positivos mínimos necesarios para `pg_dump` sobre el esquema `public`: acceso al schema y lectura de tablas/secuencias/objetos estrictamente requeridos, validado con la versión y opciones reales de pg_dump.
- Definir permisos negativos verificables: sin INSERT/UPDATE/DELETE/TRUNCATE, CREATE/ALTER/DROP, ownership, cambios de secuencia, gestión de roles ni capacidad de elevar privilegios.
- Preservar el schema/DDL de las tablas efímeras y excluir únicamente sus datos. El contrato debe comprobar que las tres tablas existen en el dump/restauración estructural y que no contienen filas exportadas; no asumir que `--exclude-table` y `--exclude-table-data` son equivalentes.
- Diseñar pruebas reproducibles con PostgreSQL desechable, roles sintéticos independientes (owner/migrator/runtime/backup), privilegios heredados y directos, y assertions de privilegios efectivos.
- Evaluar por separado el aislamiento tenant, autorización por rol, sesiones y revocación que forman parte del Issue #53; no declarar esos gates resueltos por endurecer el rol de backup.

Excluded:
- Leer, imprimir, solicitar o cambiar secretos/credenciales, incluidas `DATABASE_URL_BACKUP_RO` y `BACKUP_REPO_TOKEN`.
- Conexión o mutación de Neon `main`, grants/roles remotos, datos reales o artefactos reales de backup.
- Activar manualmente workflows, Cron, despliegues o cambios Cloudflare; DNS, billing o servicios con coste.
- Cambiar la política comercial de permisos, endpoints o comportamiento de producto.
- Declarar producción lista o cerrar #53 con pruebas sintéticas solamente.

## Acceptance criteria

- [ ] AC-1 — La identidad efectiva del backup se puede identificar de forma segura y verificable en el entorno autorizado, sin revelar secretos; hasta entonces se etiqueta NO VERIFICADA.
- [ ] AC-2 — El principal no es superuser, no tiene atributos administrativos innecesarios y no hereda directa o indirectamente roles de superuser, migrator, owner o administración.
- [ ] AC-3 — El principal posee únicamente los permisos efectivos de lectura necesarios para completar `pg_dump` del alcance aprobado; se prueban tanto privilegios positivos como negativos.
- [ ] AC-4 — No puede escribir filas, truncar tablas, alterar schema, crear objetos, cambiar secuencias, gestionar roles ni escalar privilegios.
- [ ] AC-5 — `auth_sessions`, `auth_rate_limits` y `auth_bootstrap_attempts` conservan schema/DDL en el dump, pero sus filas se excluyen; la prueba falla si falta la estructura o se exporta alguna fila.
- [ ] AC-6 — Las pruebas usan PostgreSQL efímero y roles sintéticos; cubren grants directos, memberships transitivas, ACL de tabla/columna, secuencias, schema privileges y regresiones de migración.
- [ ] AC-7 — Se documentan límites de RLS/pg_dump: no asumir que un rol de backup ordinario respeta políticas RLS como una sesión runtime; determinar el contrato de backup sin conceder BYPASSRLS por conveniencia.
- [ ] AC-8 — La parte de aislamiento tenant/sesiones de #53 tiene criterios y evidencia propios, y no se marca resuelta por los tests del rol backup.
- [ ] AC-9 — Cualquier cambio remoto de roles/grants/secretos requiere una aprobación específica posterior, plan de reversión y gate de recuperación de la Constitución.
- [ ] AC-10 — El resultado final se valida con CI exact-SHA y revisión del diff; producción permanece NOT READY mientras persista cualquier gate P0.

## Risks and guardrails

| Risk | Severity | Mitigation / gate / evidence |
|---|---|---|
| El secreto apunta a una identidad distinta de la documentada | Critical | No inferir identidad por nombre del secreto; verificación segura del principal efectivo pendiente |
| Membresía transitiva concede privilegios elevados | Critical | Inspeccionar memberships efectivas recursivamente y atributos de cada rol en PostgreSQL efímero; sin conexión remota |
| Conceder BYPASSRLS o ownership para hacer funcionar pg_dump | Critical | No otorgar por conveniencia; evaluar cobertura/semántica y justificar cualquier requisito antes de proponer cambios |
| Excluir tablas completas elimina su estructura | High | Mantener DDL y excluir datos únicamente; assertions del archive list y restore sintético |
| ACL de columna/secuencia deja una vía de escritura | High | Probar `has_table_privilege`, `has_column_privilege`, `has_sequence_privilege`, `has_schema_privilege` y operaciones negativas |
| Confundir prueba sintética con identidad/seguridad de producción | Critical | Etiquetar claramente entorno y alcance; no cerrar #53 ni readiness por CI sintético |

## Initial findings — static inspection (2026-11-11 UTC)

- **Verified in main workflow:** `.github/workflows/backup.yml` invokes PostgreSQL 18 `pg_dump` with `--exclude-table=auth_sessions`, `--exclude-table=auth_rate_limits` and `--exclude-table=auth_bootstrap_attempts` (main blob SHA `5df408788b9053709261ada3aa22dd73b85d5691`, lines 83–87).
- **Technical consequence:** `--exclude-table` excludes each matching table from the archive, including its table definition; it is not a data-only exclusion. This conflicts with the requested contract to preserve DDL while omitting ephemeral rows. The intended candidate is `--exclude-table-data=<table>`, but it must first be validated against PostgreSQL 18 archive contents and an isolated restore test.
- This is a static finding only. No backup was run, no archive was accessed, and no secret or database connection was used. Do not change the live workflow until the isolated contract test is designed and passes.
- The workflow currently names three ephemeral tables; older policy text in `docs/BACKUP_AND_RECOVERY.md` mentions only two in some historical sections. Reconcile the policy to the actual intended three-table contract without rewriting historical evidence.

## Tasks and evidence

| Task | Expected result | Validation / evidence | Status |
|---|---|---|---|
| Reconciliar workflow y documentación de backup | Inventario exacto de opciones pg_dump, exclusiones y permisos requeridos | Main blob `5df4087`; líneas 83–87 excluyen tablas completas; docs contienen referencias históricas distintas | in progress |
| Modelar privilegios PostgreSQL mínimos | Matriz de grants/denies por objeto y rol | Docs PostgreSQL + tests en instancia efímera | pending |
| Diseñar contrato de identidad efectiva | Procedimiento no sensible para confirmar principal real | Output booleano/identificador no secreto; ejecución real aún no autorizada | pending |
| Construir pruebas de roles sintéticos | Assertions de lectura, escritura denegada, memberships y RLS | PostgreSQL desechable y CI | pending |
| Verificar exclusión de datos efímeros | DDL conservado, cero filas exportadas para las tres tablas | pg_dump archive inspection + restore sintético | pending |
| Separar gates tenant/sesión | Lista de criterios de aislamiento y autorización no cubiertos por backup | Revisión de código, callers y pruebas cross-tenant | pending |
| Revisar y cerrar issue | Evidencia completa, riesgos y remediación priorizada | PR, exact-SHA CI, revisión y decisión de seguridad | pending |

## Technical decisions

- El rol de backup debe ser una identidad dedicada; no reutilizar runtime, migrator, owner ni credenciales administrativas.
- La lista exacta de privilegios no se fija por intuición: se deriva de la invocación real de pg_dump, objetos existentes y pruebas negativas. Evitar `GRANT ALL`, ownership y `BYPASSRLS` como atajos.
- Las tablas efímeras se mantienen en el esquema y en la estructura restaurable; se excluyen sus datos, no las tablas completas.
- El diagnóstico boolean-only añadido en PR #304 es una señal de observabilidad, no una certificación de identidad ni de least privilege.
- El SQL de PR #304 que une memberships por `principal_role.oid = m.member` se debe evaluar junto con las relaciones heredadas y los privilegios efectivos; una sola dirección no basta para certificar ausencia de escalada transitiva.
- La rama de esta tarea parte del `main` verificado `797b56a23547b6bfc8c255cab5637755c7eeb0bd`. No incorpora PR #304, que permanece pendiente de CI en su SHA exacto `82099e6f54377b734a6f34ee281d069e11efd423`.

## Closure and handoff

- Final commit SHA: pending
- PR: not opened
- Checks and exact outcomes: task documentation only; no CI claim yet
- Acceptance criteria met / unmet: all pending
- Limitations not verified: effective production backup identity, live role attributes/memberships/grants, RLS behavior and production restore
- Residual risks: Issue #53 remains OPEN/P0; production NOT READY
- Next step: complete the static workflow/privilege matrix, then implement only synthetic PostgreSQL tests on this branch; no remote role/secret/database changes.
