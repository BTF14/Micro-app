# Checklist de firma de producción — Issue #53

**Estado:** PRODUCTION: NOT READY. **Issue:** #53 OPEN/P0.

Completar cuatro pasos no permite saltarse subgates. No cerrar #53 ni declarar READY si falta evidencia, aprobación o recuperación comprobable.

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
- **PR #339:** permanece OPEN y sin merge hasta confirmación del propietario de los dos cambios manuales Google Cloud Console + Cloudflare Pages. La reconciliación de su base/documentación se revisará después del merge de esta PR.

---


## Paso 1 — Auditoría read-only del principal efectivo Neon

Desde entorno seguro con DATABASE_URL_BACKUP_RO configurada, sin copiar URL/token a chat, logs ni documentación:

```bash
psql "$DATABASE_URL_BACKUP_RO" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql
```

Debe terminar sin FAIL. Confirmar `session_user=current_user` (sin SET ROLE), `rolsuper/createdb/createrole/replication/bypassrls=false`, sin ownership ni membresías salientes, y sin membresías entrantes salvo la arista directa del database owner con ADMIN=true, INHERIT=false y SET=false (PostgreSQL 16+). Exigir SELECT no grantable en tablas/secuencias, sin DML/DDL, mutación de secuencias, CREATE, EXECUTE callable no permitido ni grant option. Registrar principal no secreto, fecha/hora y resultado redactado. No cambiar roles/grants/secretos como parte del checklist.

## Paso 2 — Backup programado natural y restore

- Esperar ejecución natural de .github/workflows/backup.yml; no usar workflow_dispatch para fabricar evidencia.
- Confirmar en BTF14/micro-app-backups (repositorio privado separado) daily/*.dump.age y sidecar .sha256.
- Verificar checksum SHA-256 del archivo remoto tras push/readback; registrar run URL, timestamp, archivo y resultado sin claves/contenido.
- Restaurar una copia concreta en PostgreSQL efímero/aislado según docs/BACKUP_AND_RECOVERY.md; verificar descifrado age, pg_restore --list, restore y manifiesto de integridad/conteos sintéticos.
- Medir antigüedad (RPO observado) y duración (RTO observado). RTO sintético 3.953 s no sustituye medición real. Confirmar retención y coste total USD 0.

## Paso 3 — Smoke autenticado staging/preproducción

- Usar preview/staging con DB aislada y datos sintéticos; nunca Neon main ni credenciales/datos reales.
- Login de cuenta de prueba Cashier; verificar autorización y aislamiento tenant/sucursal.
- Abrir turno de caja, ejecutar operaciones sintéticas permitidas y cerrar turno.
- Verificar persistencia, conciliación, actor/auditoría, sesión y health/headers. Registrar URL, commit, evidencia redactada.
- Si staging aislado no existe o implica coste, marcar BLOQUEADO; no simular smoke real con mocks ni activar servicios pagos.

## Paso 4 — Cierre formal y cambio de estado

Exigir evidencia de TODOS estos subgates: pasos 1–3; backup natural y restore real; RPO/RTO medidos y aceptados; DR operacional revisado; alerta de backup entregada a destino humano y acknowledgement probado; identidad/grants runtime y aislamiento tenant/sesión verificados; revisión legal/fiscal/contable humana; coste total recurrente USD 0; CI exact-SHA, despliegue autorizado y smoke final. Un issue GitHub/test mock no demuestra pager humano. Solo propietario/operador puede cerrar #53 y aprobar PRODUCTION: READY con evidencia. La IA no cambia estado por inferencia, CI verde o RTO sintético.

## Evidencia mínima
Fecha/hora UTC, operador, entorno (sin credenciales), principal no secreto, SHA/PR/run URLs, checksum, artefacto, restore, RPO/RTO, smoke, alert acknowledgement, coste, aprobaciones y riesgos residuales.

## Límites
No compartir DATABASE_URL_BACKUP_RO, contraseñas, claves age privadas, tokens ni datos de clientes. No ejecutar DDL/DML ni cambiar roles/grants/ownership/secretos Neon main como parte del checklist. USD 0 estricto. Hasta aceptación formal: Issue #53 OPEN/P0 y PRODUCTION NOT READY.

## Turno 40 — Evidencia adicional same-origin (2026-11-13)

Evidencia live aportada por el propietario para PR #339 (`f635c01aacbe148030b3fd1d7e46851ae318f951`):
- `GET /api/health`: HTTP/2 200, JSON `status=ok`.
- `GET /api/auth/me` sin sesión: HTTP/2 401 `UNAUTHENTICATED` y expiración de cookie de sesión.
- `GET /api/auth/google`: HTTP/2 302 a Google; `redirect_uri` Pages same-origin; cookies OAuth Secure/HttpOnly/SameSite=Lax.
- CSP `connect-src 'self'`; bundle `index-qsP0OldD.js` (269,312 bytes) con `/api`, sin `workers.dev`.
- Pages Preview API devuelve 503 `PREVIEW_API_DISABLED`.
- Smoke humano con Brave Shields ON: login Google, Resumen, Catálogo, Inventario, Caja y turnos, reload conservando sesión y logout correcto.

Esto cierra la validación live de integración same-origin; no satisface el Paso 3, que exige Cashier autenticado en staging/preproducción con DB aislada y datos sintéticos, ni los subgates operativos del Paso 4. Estado permanece OPEN/P0 y PRODUCTION: NOT READY.


## Paso 4 — instrumentación de restore y canario de notificación (PR en validación, 2026-11-13)

- `.github/workflows/backup-real-restore.yml` añade marcas UTC y duraciones monotónicas por fase: descarga + SHA-256, AGE decrypt, `pg_restore --list`, y helper de restore PostgreSQL 18 que incluye `pg_restore`, ledger/migraciones, assertions 0022/0023 y logins directos runtime/BCV. Publica fases en `$GITHUB_STEP_SUMMARY`.
- T0 de la ventana de recuperación se marca después de la cola del runner y `apt-get`; así esos costes quedan fuera de la ventana medida. T1 es el fin del restore y validaciones. La duración del helper es el intervalo observado de restauración DB aislada, no RTO de producción. El timestamp del nombre de backup (`STAMP`, creado justo antes de `pg_dump`) permite calcular antigüedad del artefacto al iniciar el simulacro, que es solo proxy de frescura y NO RPO operacional. El RPO real requiere un cutoff/instante de incidente independiente y timestamp consistente del snapshot.
- `.github/workflows/alert-canary.yml` es manual (`workflow_dispatch`), permisos `permissions: {}`, sin checkout, secretos, credenciales, Neon ni conexiones externas. Solo produce fallo deliberado si `confirm_controlled_failure=true`; si no, termina sin simular alerta.
- Para probar: el propietario configura GitHub Settings → Notifications → Actions → Email (o GitHub notifications), dispara el canario confirmando fallo, comprueba recepción efectiva y registra ACK con hora UTC + URL del run en Issue #53. No tocar `backup.yml`.
- Estado: código aún requiere CI exact-HEAD SUCCESS y ejecución controlada/ACK humano. RPO/RTO operacionales no certificados. Issue #53 OPEN/P0; PRODUCTION NOT READY.

## Paso 3 — Suite integrada Cashier (PR en validación, 2026-11-13)

Se añadió `apps/api/src/cashier-full-lifecycle.integration.test.ts` y se conectó a CI. El escenario único usa los handlers reales de Hono, OAuth Google simulado (token/userinfo interceptados, sin credenciales reales), cookie de sesión Secure/HttpOnly/SameSite=Lax, y PostgreSQL 18 efímero con `microapp_runtime` para solicitudes y `microapp` admin únicamente para setup/verificación. Comprueba health/headers, `/auth/me`, sucursal/tenant, inventario, apertura de turno, checkout USD con BCV sintético válido, persistencia de pagos/movimiento/stock/auditoría, cierre y conciliación, denegaciones de scope/turno ajeno y logout invalidando sesión.

La suite falla de forma cerrada si las URLs no son localhost `/microapp_test` y no corresponden a los roles esperados. No usa Neon, Pages Preview, Workers, datos reales ni credenciales Google. Esto valida backend/API + PostgreSQL efímero de CI a coste incremental USD 0; no es staging remoto. Estado del Paso 3: PENDIENTE hasta CI exact-HEAD SUCCESS y revisión de resultados.
