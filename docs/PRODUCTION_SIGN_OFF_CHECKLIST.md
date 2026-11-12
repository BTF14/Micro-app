# Checklist de firma de producción — Issue #53

**Estado:** PRODUCTION: NOT READY. **Issue:** #53 OPEN/P0.

Completar cuatro pasos no permite saltarse subgates. No cerrar #53 ni declarar READY si falta evidencia, aprobación o recuperación comprobable.

## Paso 1 — Auditoría read-only del principal efectivo Neon

Desde entorno seguro con DATABASE_URL_BACKUP_RO configurada, sin copiar URL/token a chat, logs ni documentación:

```bash
psql "$DATABASE_URL_BACKUP_RO" -X -v ON_ERROR_STOP=1 -f scripts/audit_database_roles.sql
```

Debe terminar sin FAIL. Confirmar session_user=current_user (sin SET ROLE), rolsuper/createdb/createrole/replication/bypassrls false, sin membresías ni ownership, y grants solo SELECT; sin DML/DDL, mutación de secuencias, CREATE, EXECUTE no permitido ni grant option. Registrar principal no secreto, fecha/hora y resultado redactado. No cambiar roles/grants/secretos. Cualquier remediación exige análisis, prueba aislada y autorización explícita específica. El nombre backup_readonly no demuestra identidad ni mínimo privilegio.

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