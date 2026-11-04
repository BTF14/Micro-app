# Micro app

**Micro app** es un proyecto independiente de punto de venta (POS) e inventario para comercios, pensado para PC, tablet y móvil. Su objetivo es ofrecer un flujo fiable para catálogo, existencias, ventas, pagos, caja y trazabilidad, con precios base en USD y equivalentes en VES calculados a partir de una tasa BCV validada.

> **Estado verificado — 4 de noviembre de 2026:** el producto **no está listo para operación comercial ni para datos reales**. La PR #200 propone una vertical de catálogo e inventario y añade la migración 0005, pero sigue abierta y en Draft; sus cambios no están en `main` ni aplicados a Neon. La PR #202 mantiene la reconciliación documental abierta; su HEAD actual tuvo 12/12 checks exitosos. Estos checks no certifican producción.

- **Estado técnico vigente:** [CURRENT_STATE.md](docs/CURRENT_STATE.md) y [handoff de continuidad](docs/HANDOFF_NEXT_CHAT.md).
- **Plan maestro y prioridades:** [PROJECT_PLAN.md](docs/PROJECT_PLAN.md).
- **Criterios de preparación para producción:** [PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).
- **Hoja de ruta de seguridad:** [SECURITY_ROADMAP.md](docs/SECURITY_ROADMAP.md).
- **Esquema de datos:** [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md).
- **Respaldo y recuperación:** [BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md).
- **Auditoría de CI/despliegues:** [WORKFLOW_AND_DEPLOYMENT_AUDIT.md](docs/WORKFLOW_AND_DEPLOYMENT_AUDIT.md).
- **Diario de verificaciones y decisiones:** [STATE_JOURNAL.md](docs/STATE_JOURNAL.md).

La documentación puede contener snapshots históricos. Para decisiones, prevalece el checkpoint más reciente y la evidencia viva de GitHub/Cloudflare/Neon. Un test de CI o una Preview no demuestra por sí solo que el producto esté desplegado ni preparado para producción.

---

