# Micro app

**Micro app** es un proyecto independiente de punto de venta (POS) e inventario para comercios, pensado para PC, tablet y móvil. Su objetivo es ofrecer un flujo fiable para catálogo, existencias, ventas, pagos, caja y trazabilidad, con precios base en USD y equivalentes en VES calculados a partir de una tasa BCV validada.

> **Estado al 30 de octubre de 2026:** existe una base técnica con autenticación Google OAuth y allowlist implementadas en la API, además de automatización de calidad y seguridad. **El producto todavía no está listo para operación comercial ni para datos reales.** La autorización por operación, el aislamiento multi-organización completo y los flujos transaccionales comerciales siguen pendientes.

- **Estado técnico vigente:** [CURRENT_STATE.md](docs/CURRENT_STATE.md) y [handoff de continuidad](docs/HANDOFF_NEXT_CHAT.md).
- **Plan maestro y prioridades:** [PROJECT_PLAN.md](docs/PROJECT_PLAN.md).
- **Criterios de preparación para producción:** [PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).
- **Hoja de ruta de seguridad:** [SECURITY_ROADMAP.md](docs/SECURITY_ROADMAP.md).
- **Respaldo y recuperación:** [BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md).
- **Diario de verificaciones y decisiones:** [STATE_JOURNAL.md](docs/STATE_JOURNAL.md).

La documentación de estado puede contener notas históricas. Para tomar decisiones, contrasta el checkpoint más reciente con el código, el SHA actual de `main`, las PR y los resultados de GitHub Actions. Un test de CI no demuestra por sí solo que el producto esté desplegado ni preparado para producción.

## Qué se está construyendo

El alcance del producto incluye:

- Catálogo de productos, SKU y códigos de barras.
- Proveedores, compras, entradas y ajustes de inventario.
- Ventas, líneas de venta, pagos, cambio, recibos y devoluciones.
- Apertura/cierre de caja, reportes y auditoría.
- Usuarios, roles y separación segura de datos por comercio u organización.
- Precios base en USD y equivalentes en VES mediante una tasa validada, con trazabilidad de la tasa y de los importes aplicados a cada operación.
- Interfaz responsive y accesible para uso diario en comercios.

**Este listado describe el alcance previsto, no afirma que todos los módulos estén terminados.** Consulta los documentos de estado y los criterios de aceptación para distinguir lo implementado, lo probado y lo pendiente.

La dirección de producto aprobada como arquitectura de referencia es una plataforma SaaS multi-organización, multi-sucursal y multiusuario. Una organización es el tenant y propietario lógico de sus datos; las sucursales son unidades operativas; las cajas y almacenes pertenecen a una sucursal. **Main ya incluye** `branches`/`branch_memberships` y el helper `resolveBranchContext` por PR #165 (0003). **Main incluye ahora** `registers`/`register_shifts` mediante la migración 0004 (PR #167 fusionada). Almacenes, balances por almacén y endpoints comerciales no están implementados; el helper de sucursal no está conectado a rutas. Las migraciones 0003/0004 no se han aplicado a Neon main. Almacenes, balances por almacén y endpoints comerciales no están implementados; el helper de sucursal no está conectado a rutas. El estado de Git no demuestra que 0003/0004 estén aplicadas a Neon main.

## Estado actual: qué significa en la práctica

### Base técnica y mantenimiento

- Frontend con React, Vite y TypeScript.
- API con Hono y Cloudflare Workers.
- PostgreSQL como base de datos objetivo, con Drizzle ORM y migraciones SQL versionadas.
- Pruebas con Vitest y automatización de navegador con Playwright/Chromium en CI.
- GitHub Actions para validaciones, análisis estático y controles de seguridad.
- Workflow sintético de backup cifrado/restauración ejecutado en PostgreSQL 18; demuestra una ruta técnica aislada, no backup productivo independiente ni recuperación integral con datos comerciales poblados. RPO/RTO, alertas y coste siguen pendientes.
- Dependency Review, Secret History, Semgrep y Trivy se ejecutan en CI/PR; PR #141 integró mantenimiento de dependencias. Estos controles no equivalen a monitorización runtime ni a readiness productiva.

La existencia de archivos de configuración, workflows o migraciones no equivale a que toda la funcionalidad de negocio esté completa.

### Bloqueos importantes antes de uso comercial

1. **Identidad y acceso:** Google OAuth, allowlist, state/PKCE, sesión revocable y validación de `email_verified` están implementados en la API según el estado documentado tras PR #153 y #155. Siguen pendientes recuperación de cuenta, MFA y gestión/limpieza completa de sesiones; además, la autenticación no sustituye la autorización por operación.
2. **Aislamiento multiempresa:** probar autorización en el servidor y acceso cruzado entre organizaciones en todas las rutas y recursos pertinentes.
3. **Operaciones de negocio:** demostrar con PostgreSQL de prueba los flujos completos de inventario y venta, incluyendo transacciones, idempotencia y concurrencia.
4. **Tasa BCV y dinero:** validar origen, vigencia y errores de la tasa; preservar snapshots históricos y usar cálculos decimales seguros.
5. **Recuperación:** probar la restauración con datos sintéticos poblados y relaciones entre ventas, productos, pagos, movimientos y auditoría; definir y verificar objetivos de recuperación.
6. **Salida a producción:** completar pruebas E2E contra API y base de datos reales de prueba, revisar errores/limitación de abuso, requisitos fiscales venezolanos y hardware de punto de venta.

No habilitar operación comercial ni datos reales hasta cerrar los bloqueos aplicables con evidencia verificable. La lista completa y su estado viven en [preparación para producción](docs/PRODUCTION_READINESS.md) y [hoja de ruta de seguridad](docs/SECURITY_ROADMAP.md).

## Arquitectura

La dirección arquitectónica actual es un **monolito modular**, no una colección de microservicios:

```text
apps/
  web/   React + Vite + TypeScript
  api/   Hono + Cloudflare Workers
                 |
                 v
          PostgreSQL (Neon)
          Drizzle ORM + SQL migrations
```

- **Frontend:** aplicación web estática con React/Vite/TypeScript.
- **API:** Hono sobre Cloudflare Workers; hoy expone flujos de autenticación y `GET /health`, no endpoints comerciales de productos, inventario, ventas o pagos.
- **Persistencia:** PostgreSQL/Neon como destino arquitectónico y Drizzle/SQL versionados. No se debe asumir que las migraciones del repositorio ya estén aplicadas a Neon `main`.
- **Automatización:** GitHub Actions para build, pruebas y análisis.
- **Tasa y precios:** la base de datos debe conservar la tasa y los importes aplicados a una venta; cualquier caché es una optimización, no la fuente de verdad de una transacción.

La arquitectura objetivo contempla Cloudflare Pages para el frontend, Cloudflare Workers para la API y Neon PostgreSQL, sujetos a límites y condiciones vigentes de cada proveedor. El fundamento de sucursales/asignaciones está en main (0003); el aislamiento integral de operaciones, los roles distintos por sucursal, almacenes y stock por almacén siguen pendientes. Main incluye el esquema de cajas/turnos en 0004; almacenes y stock por almacén siguen pendientes. El coste objetivo es **$0**: no activar planes pagos, facturación, tarjetas ni cargos automáticos sin autorización explícita. Los niveles gratuitos pueden cambiar y no garantizan capacidad ilimitada ni disponibilidad comercial.

## Reglas de ingeniería que no se deben romper

- **Proyecto independiente:** no mezclar código, bases de datos, secretos, despliegues ni datos con `Cantina-pos` u otros proyectos.
- **USD como moneda base:** los equivalentes en VES deben vincularse a una tasa validada y registrada.
- **PostgreSQL como fuente de verdad:** la interfaz, la memoria del navegador y los mocks no sustituyen la persistencia autoritativa.
- **Integridad de ventas e inventario:** las operaciones críticas deben ser transaccionales, idempotentes y seguras ante concurrencia; no permitir stock negativo por carreras.
- **Trazabilidad:** conservar movimientos de inventario, usuario responsable, auditoría y snapshots de precios, moneda, tasa e importes de cada venta.
- **Tasa segura:** registrar fuente, fecha efectiva, hora de consulta y estado; ante fallo, conservar la última tasa válida y marcarla como desactualizada. Nunca aceptar datos inválidos como tasa vigente.
- **Seguridad por servidor:** la autenticación no sustituye autorización; cada operación debe verificar permisos y pertenencia al tenant.
- **Dependencias:** actualizar con revisión de compatibilidad, lockfile y pruebas; no confundir la última versión publicada con una actualización validada para este proyecto.
- **Evidencia antes de declarar terminado:** diferenciar entre código escrito, pruebas automatizadas, integración real y comportamiento desplegado.

Las reglas completas están en [AGENTS.md](AGENTS.md), [Constitución del proyecto](docs/CONSTITUTION.md) y [política de colaboración y PR](docs/AI_COLLABORATION_AND_PR_POLICY.md).

## Empezar a trabajar en local

### Requisitos

- Node.js `24.22.2`, fijado en `.node-version` y compatible con el rango `>=24.22.2 <25` de `package.json`.
- pnpm `10.34.9`, fijado mediante `packageManager` en el `package.json` raíz; Corepack debe respetar esa versión.
- Acceso y configuración de variables de entorno para los servicios que se quieran ejecutar. No copies secretos al repositorio ni uses la base de datos principal para pruebas.

### Instalación y comandos

Desde la raíz del repositorio:

```bash
pnpm install --frozen-lockfile
```

Scripts disponibles en el `package.json` raíz:

```bash
pnpm dev:web   # servidor de desarrollo del frontend
pnpm dev:api   # servidor de desarrollo de la API
pnpm build     # build del frontend y typecheck de la API
pnpm test      # pruebas del frontend y API, más typecheck de la API
```

Los comandos requieren las variables y servicios que cada aplicación necesite. Consulta la configuración de `apps/web` y `apps/api` y los documentos de integración antes de conectar servicios externos. Las pruebas locales no deben apuntar a producción ni a datos reales.

## Calidad, seguridad y operación

- [Workflow de vigilancia diaria de dependencias](.github/workflows/daily-dependency-watch.yml): informe de dependencias y auditoría; es de solo lectura y no actualiza paquetes automáticamente.
- [Workflow de backup](.github/workflows/backup.yml): respaldo cifrado y política de retención descritos en [BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md).
- [Checklist OWASP ASVS](docs/OWASP_ASVS_CHECKLIST.md).
- [Matriz de requisitos POS](docs/POS_REFERENCE_MATRIX.md).
- [Flujo Spec-Driven Development (SDD)](docs/SDD_WORKFLOW.md) y [modelo operativo de agentes](docs/AGENT_OPERATING_MODEL.md).

Los workflows y sus resultados deben revisarse en GitHub para el SHA exacto que se evalúa. Un workflow configurado no prueba que se haya ejecutado correctamente, y los tests con mocks no demuestran integración real con la base de datos.

## Desarrollo asistido por IA y continuidad

Este repositorio usa documentación explícita para reducir errores y preservar decisiones entre sesiones. Antes de hacer cambios, sigue la secuencia de arranque de [AGENTS.md](AGENTS.md), revisa el [handoff vigente](docs/HANDOFF_NEXT_CHAT.md) y confirma el estado real de GitHub.

- [Constitución](docs/CONSTITUTION.md)
- [Plan maestro](docs/PROJECT_PLAN.md)
- [Diario de estado](docs/STATE_JOURNAL.md)
- [Registro de herramientas y fuentes](docs/RESOURCE_REGISTRY.md)
- [Protocolo de continuidad IA/chat](docs/AI_CONTINUITY_PROTOCOL.md)
- [Plantillas SDD](templates/sdd/)
- [Skill SDD para funcionalidades](skills/feature-sdd/SKILL.md)

Los archivos de perfiles y skills son instrucciones reutilizables; su presencia no significa que haya agentes autónomos o herramientas externas instaladas y activas.

## Licencia y estado del producto

El repositorio es privado. Revisa la configuración y los avisos de licencia de las dependencias antes de redistribuir cualquier componente.

**No es una versión de producción ni una promesa de disponibilidad comercial.** El estado cambia con cada PR: usa los documentos de continuidad y las evidencias de GitHub como referencia, no solo la fecha de este README.


## Arquitectura SaaS y capacidad

No se promete un número máximo de empresas, sucursales, cajas o usuarios hasta completar pruebas de carga sintéticas y revisar conjuntamente cuotas de Neon, Cloudflare Workers, Pages, KV y transferencia. Las cuotas de un plan gratuito no equivalen a capacidad sostenible del producto. No fijar límites comerciales ni activar servicios de pago sin evidencia y autorización.
