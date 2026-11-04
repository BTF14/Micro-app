# Estado del esquema — reconciliación 2026-11-04

**Fuente de verdad:** migraciones versionadas en la rama que se esté evaluando; no confundir una migración propuesta en una PR con el esquema de `main` o con el estado remoto de Neon.

- `main` verificado en `7b0f057b8c152515005feed40305143c0ebb94b0` no incluye la migración 0005 de inventario.
- PR #200 sigue abierta y Draft, HEAD `7d2ef3d5e9ced1d4e8d386110129d21eb53af045`. Su rama añade `0005_warehouse_inventory.sql` y assertions para warehouses/inventory; CI ejecuta 0001–0005 desde cero en PostgreSQL 18 desechable.
- El éxito de `postgres-migration` valida el script en esa base desechable. **No demuestra que 0005 esté aplicada a Neon main** ni autoriza aplicarla.
- 0005 no contiene una transacción explícita; el workflow usa `psql -v ON_ERROR_STOP=1 -f` con autocommit predeterminado. Un fallo intermedio puede dejar DDL previo confirmado. Este riesgo debe resolverse con transacción compatible o recuperación explícita de estado parcial y prueba de fallo inducido.
- No hay evidencia verificada de procedimiento aprobado de migración/rollback en Neon. No ejecutar SQL remoto como parte de esta revisión.

## Estado de ejecución y límites

- El esquema de `main` termina en migración 0004 (`registers` y `register_shifts`) según el checkpoint de main citado arriba.
- La vertical de catálogo/inventario de PR #200 no debe describirse como ya integrada en main.
- No inferir el estado remoto de Neon a partir del contenido Git. Las migraciones 0003/0004 tampoco se consideran aplicadas a Neon main sin evidencia remota actual.
- La matriz de permisos y los helpers tenant/branch no sustituyen la cobertura de autorización server-side en cada ruta comercial.
- Antes de cualquier aplicación remota: preflight de esquema, backup y restore comprobados, transacción/recuperación, compatibilidad hacia atrás del código, orden de despliegue, concurrencia y plan de rollback.

---

