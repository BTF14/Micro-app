# Micro app

Sistema **POS e inventario multi-sucursal** independiente para comercios en Venezuela, con precios base en **USD** y liquidación trazable en **VES** mediante la tasa oficial del BCV. Diseñado para escritorio, tablet y móvil bajo una arquitectura de **monolito modular** en el borde (Cloudflare) y consistencia transaccional en PostgreSQL (Neon).

> **Estado técnico:** el núcleo funcional está integrado en `main`: autenticación Google OAuth same-origin, administración de sucursales/almacenes/cajas, catálogo, inventario con ledger y conteos/recepciones, turnos de caja, sincronización BCV aislada y checkout POS en USD o VES.
>
> **Estado comercial:** **`PRODUCTION: NOT READY`**. No habilitar operación comercial ni datos reales. El lanzamiento permanece bloqueado hasta cerrar los gates del Issue `#53`: estabilidad BCV posterior, alertas/ACK de extremo a extremo, revisión legal/fiscal/contable (AC-6), revisión independiente de seguridad (AC-7), medición operativa RPO/RTO, cierre del Issue `#53`, aprobación GO/NO-GO y verificación continua del coste total `$0`. El smoke autenticado con Brave Shields y la aceptación propietaria de objetivos RPO/RTO ya están confirmados; no equivalen a medición operativa formal. Consulta [CURRENT_STATE.md](docs/CURRENT_STATE.md) y [PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).

---

## Decisión comercial v1.1 vigente (2026-11-17)

1. PR 1: Contingencia Manual BCV (solo tras cerrar AC-6 legal/contable y AC-7 seguridad).
2. PR 2: Importador CSV.
3. PR 3: Escáner móvil.
4. PR 4: Cierre de caja, reportes y exportación CSV.

El freeze comercial sigue activo; Issue #53 OPEN/P0; PRODUCTION: NOT READY.

---

## Arquitectura del monorepo

El sistema separa interfaz estática, proxy same-origin, API de negocio, Cron de tasa BCV y librería monetaria compartida, sin introducir microservicios ni dependencias de ORM:

```text
Navegador (React 19 + Vite 7 + TypeScript)
   │ same-origin (/api/*; cookies first-party; OAuth PKCE)
   ▼
Cloudflare Pages + Pages Functions (functions/api/[[path]].ts)
   │ Service Binding API: solo producción; previews aisladas → 503
   ▼
Cloudflare Worker API (apps/api — Hono + TypeScript)
   │ @neondatabase/serverless (SQL parametrizado + transacciones explícitas)
   ├─────────────────────────────────────────────┐
   ▼                                             ▼
PostgreSQL 18 (Neon)                    Worker BCV aislado (pausado)
Migraciones SQL 0001–0025               (apps/api/wrangler.bcv.toml)
Roles: migrator / runtime /             Triggers conservados; BCV_SYNC_ENABLED=false
       bcv_sync / backup

Productor BCV temporal activo:
GitHub Actions .github/workflows/bcv-sync.yml
Node 24.22.2 · TLS estricto · Sectigo DV R36 pineada
Credencial dedicada: DATABASE_URL_BCV_SYNC

packages/money → aritmética decimal exacta con bigint, compartida entre Web y API
```

### Estructura del repositorio

| Ruta | Responsabilidad |
|---|---|
| `apps/web/` | SPA en React 19, Vite 7 y TypeScript. Vistas de Resumen, Productos, Inventario, Consultar precio, Caja y turnos, Ventas POS y Estructura organizacional. |
| `functions/api/[[path]].ts` | Proxy same-origin de Cloudflare Pages Functions hacia el Worker mediante Service Binding `API`; conserva `CF-Connecting-IP`, reescribe el `Path` de cookies PKCE y bloquea previews con `503`. |
| `apps/api/` | API HTTP en Hono sobre Cloudflare Workers; migraciones SQL `0001–0025` y aserciones rollback-safe. Incluye `wrangler.toml` (API + limpieza horaria de metadatos de autenticación) y `wrangler.bcv.toml` (Worker Cron BCV aislado). |
| `packages/money/` | Librería compartida `@micro-app/money` con aritmética decimal fija sobre `bigint`; evita punto flotante binario para dinero y cantidades. |
| `scripts/` | Runner fail-closed de migraciones (`scripts/db/migrate.sh`), adopción de baseline, verificación/restauración cifrada con `age`, auditoría de privilegios PostgreSQL y pruebas de contrato. |
| `docs/` y `odd/` | Constitución operativa, ADRs (`docs/decisions/`), especificaciones de dominio (`docs/sdd/`), continuidad, runbooks de DR/Neon y tareas ODD. |

---

## Capacidades integradas y matriz de acceso

La autorización es **server-side**: cada operación valida tenant, sucursal, permiso y pertenencia aplicable. La visibilidad de la interfaz no sustituye las comprobaciones de API y PostgreSQL.

| Módulo | Capacidades implementadas en `main` | Acceso en UI |
|---|---|---|
| **Identidad y sesión** | Google OAuth con PKCE/state, allowlist, `email_verified` y sesiones revocables same-origin (`HttpOnly`, `SameSite=Lax`). Registro y login por contraseña bloqueados fail-closed. | Según `auth_allowlist` y membresía activa. |
| **Resumen y BCV** | Tasa, fuente/fecha y estado de sincronización (`inserted` / `unchanged` / `failed`); refresco de lectura. Sin edición manual de tasa. | Resumen: todos. Panel operativo BCV: `owner` y `admin`. |
| **Productos (catálogo)** | Listado y búsqueda por nombre/SKU/código de barras; precios base USD y equivalente VES; creación y edición. | Lectura: todos. Escritura: `owner`, `admin`. |
| **Inventario** | Existencias y movimientos Kardex por sucursal/almacén, recepción de mercancía y conteos físicos con confirmación atómica sobre el ledger. | Lectura: todos. Recepciones/conteos: `owner`, `admin`, `inventory`. |
| **Consultar precio** | Búsqueda rápida de mostrador con precio USD/VES y disponibilidad por sucursal/almacén. | `owner`, `admin`, `inventory`, `cashier`. |
| **Caja y turnos** | Selección de sucursal/caja, apertura y cierre del turno propio, saldos inicial/esperado/contado y validación de pertenencia. | `owner`, `admin`, `cashier`; operaciones limitadas al turno propio. |
| **Ventas (POS)** | Carrito con cantidades fraccionarias (`scale 3`), validación de existencias por almacén, total USD y equivalente VES según BCV vigente, clave de idempotencia y recibo. Admite hasta 10 líneas de pago en **una sola moneda de liquidación** (USD o VES). | `owner`, `admin`, `cashier`; requiere turno propio abierto. |
| **Estructura organizacional** | Administración de sucursales, almacenes, cajas registradoras y asignaciones de miembros a sucursales. | Exclusivo `owner`. |

**Importante sobre pagos:** una venta puede dividirse entre varios medios de pago, pero todas las líneas deben usar la misma moneda de liquidación (USD o VES). No se admite mezclar líneas USD y VES dentro de una misma venta.

---

## Garantías de ingeniería, datos y seguridad

- **USD como moneda base y aritmética exacta:** importes/cantidades usan `bigint` en `@micro-app/money` y `NUMERIC` en PostgreSQL; no se usa `number` IEEE-754 para cálculos financieros.
- **Tasa BCV fail-closed:** la ingestión automática temporal corre en `.github/workflows/bcv-sync.yml` con Node 24.22.2, TLS estricto y CA intermedia Sectigo DV R36 pineada; usa la credencial dedicada `DATABASE_URL_BCV_SYNC`. El Worker aislado `micro-app-bcv-sync` conserva sus triggers, pero está pausado (`BCV_SYNC_ENABLED=false`). El checkout valida el último intento exitoso (`inserted`/`unchanged`) y la fecha efectiva vigente en zona horaria Caracas; usa `FOR SHARE` y defensa SQL diferida en la migración `0021`. Un fallo de fuente no reemplaza una tasa válida.
- **Integridad de ventas e inventario:** `POST /api/orgs/:organizationId/branches/:branchId/checkout` ejecuta locks determinísticos por organización/sucursal/almacén/producto, exige turno abierto, aplica `Idempotency-Key` y proyecta saldos desde el ledger mediante triggers SQL protegidos (`0019`).
- **Mínimo privilegio en PostgreSQL:** separación de roles `microapp_migrator`, `microapp_runtime`, `microapp_bcv_sync` y `microapp_backup`; sin `SUPERUSER`, sin membresías salientes y con contratos SQL automatizados en CI.
- **Aislamiento de previews:** Pages Preview y los entornos `workers.dev` de preview no tienen acceso a la API operativa ni a datos de aplicación; responden `503` fail-closed. El post-build bloquea referencias directas a `*.workers.dev` en el bundle.
- **Presupuesto objetivo `$0`:** no activar planes de pago, add-ons ni cargos automáticos sin autorización explícita. La verificación del coste recurrente total y de las cuotas vigentes sigue siendo un gate de producción; los planes gratuitos no garantizan capacidad ilimitada.

---

## Empezar a trabajar en local

### Requisitos

- **Node.js `24.22.2`** (fijado en `.node-version`; rango `>=24.22.2 <25` en `package.json`).
- **pnpm `10.34.9`** (fijado mediante `packageManager`; habilitar con `corepack enable`).
- **PostgreSQL 18** local/desechable solo para runner de migraciones y pruebas de integración SQL.
- Git.

**Nunca apuntar el entorno local a Neon `main` ni usar datos reales.**

### Instalación y comandos

```bash
corepack enable
pnpm install --frozen-lockfile
```

Configura `apps/web/.env.local` tomando como base `apps/web/.env.example` (`VITE_API_BASE_URL=http://localhost:8787`) y las variables locales de Wrangler en `apps/api/.dev.vars` (no versionadas).

```bash
pnpm dev:web   # Vite en http://localhost:5173
pnpm dev:api   # Wrangler dev en http://localhost:8787
pnpm build     # Build frontend, validación CSP/bundle y typecheck API
pnpm test      # Tests unitarios web/API y typecheck API
```

Para variables, pruebas PostgreSQL y Playwright E2E, consulta [Desarrollo local](docs/LOCAL_DEVELOPMENT.md).

---

## CI, seguridad y recuperación ante desastres

Los cambios se verifican mediante workflows dedicados en `.github/workflows/`. Entre los principales:

| Área | Workflows | Propósito |
|---|---|---|
| **Calidad e integración** | [CI](.github/workflows/ci.yml), [Playwright E2E](.github/workflows/playwright-e2e.yml) | Build, post-build, unit tests, suites PostgreSQL 18 con roles mínimos, lifecycle de cajero y smoke E2E Chromium. |
| **Base de datos y Neon** | [Migration check](.github/workflows/migration-check.yml), [Migration runner](.github/workflows/migration-runner.yml), [Neon main migrations](.github/workflows/neon-main-migrations.yml) | Validación limpia `0001–0025`, aserciones de permisos/ownership, runner idempotente con checksums SHA-256 y despacho protegido para Neon `main`. |
| **Backup y DR** | [Backup](.github/workflows/backup.yml), [Restore real](.github/workflows/backup-real-restore.yml), [Restore smoke](.github/workflows/backup-restore-smoke.yml) | Respaldo cifrado con `age` + sidecar SHA-256, verificación de restauración aislada en PostgreSQL 18 y pruebas de contrato. |
| **Seguridad y dependencias** | [Semgrep](.github/workflows/semgrep.yml), [Security scan](.github/workflows/security-scan.yml), [Secret history](.github/workflows/secret-history-scan.yml), [Dependency review](.github/workflows/dependency-review.yml), [Daily dependency watch](.github/workflows/daily-dependency-watch.yml) | SAST, Trivy, detección de secretos en historia Git y vigilancia diaria de solo lectura. |

Los resultados deben revisarse en GitHub para el SHA exacto. Un workflow configurado no prueba que se haya ejecutado correctamente; CI tampoco demuestra por sí solo despliegue, readiness comercial o recuperación operativa.

---

## Gobernanza, continuidad y documentación

El repositorio sigue **Organic Driven Development (ODD)** con evidencia exacta por SHA para trabajo humano y asistido por IA.

- **Normativa y flujo:** [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) · [Constitución](docs/CONSTITUTION.md) · [Flujo ODD](docs/ODD_WORKFLOW.md) · [Política de PRs](docs/AI_COLLABORATION_AND_PR_POLICY.md).
- **Estado y continuidad:** [Estado actual](docs/CURRENT_STATE.md) · [Handoff vigente](docs/HANDOFF_NEXT_CHAT.md) · [Diario de estado](docs/STATE_JOURNAL.md) · [Plan maestro](docs/PROJECT_PLAN.md).
- **Arquitectura y datos:** [Arquitectura y costo cero](docs/ARCHITECTURE_AND_ZERO_COST.md) · [Esquema de base de datos](docs/DATABASE_SCHEMA.md) · [Integración API](docs/API_INTEGRATION.md) · [Especificaciones de dominio](docs/sdd/) · [ADRs](docs/decisions/).
- **Seguridad y operación:** [Guardrails de seguridad](docs/SECURITY.md) · [Hoja de ruta de seguridad](docs/SECURITY_ROADMAP.md) · [Preparación para producción](docs/PRODUCTION_READINESS.md) · [Checklist OWASP ASVS](docs/OWASP_ASVS_CHECKLIST.md) · [Backup y recuperación](docs/BACKUP_AND_RECOVERY.md) · [Runbook DR](docs/DISASTER_RECOVERY_RUNBOOK.md).
- **Perfiles y skills versionados:** [Skills](.agents/skills/) · [Perfiles](.github/agents/). Son instrucciones reutilizables; su presencia no implica agentes autónomos activos.

---

## Licencia y estado del producto

El repositorio está **público en GitHub**. Revisa los avisos de licencia de las dependencias antes de redistribuir cualquier componente.

**No es una versión aprobada para operación comercial ni una promesa de capacidad SaaS.** No se fijan límites comerciales de organizaciones, sucursales o cajas hasta completar pruebas de carga y auditar las cuotas gratuitas vigentes.
