# Desarrollo local

## Requisitos

- **Node.js `24.22.2`** (definido en `.node-version`; rango soportado en `package.json`: `>=24.22.2 <25`).
- **pnpm `10.34.9`** (definido en `packageManager`; habilitable vía `corepack enable`).
- **Git**.
- **PostgreSQL 18** local/desechable (solo requerido para ejecutar el runner de migraciones o pruebas de integración SQL).

No se requiere cuenta ni plan de pago para desarrollar o ejecutar pruebas unitarias en local. **Nunca conectes el entorno local a Neon `main` ni utilices datos reales de clientes.**

## Configuración inicial

Desde la raíz del repositorio:

```bash
corepack enable
pnpm install --frozen-lockfile
```

1. **Frontend (`apps/web`):** toma como referencia `apps/web/.env.example`, que define `VITE_API_BASE_URL=http://localhost:8787` para desarrollo local. En producción, `apps/web/.env.production` fija `VITE_API_BASE_URL=/api` para enrutar tráfico same-origin vía Cloudflare Pages Functions (`functions/api/[[path]].ts`).
2. **API (`apps/api`):** configura secretos locales en `apps/api/.dev.vars` (ignorado por Git) si vas a probar endpoints conectados a PostgreSQL local/efímero o flujo OAuth local (`DATABASE_URL`, `FRONTEND_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`). No versiones secretos ni los agregues a `wrangler.toml`.

## Ejecutar en local

En una terminal (frontend Vite):

```bash
pnpm dev:web
```

En otra terminal (API Worker local en `http://localhost:8787`):

```bash
pnpm dev:api
```

## Comprobaciones disponibles

```bash
pnpm build   # Build @micro-app/web (tsc -b + vite build + postbuild CSP/bundle) y typecheck @micro-app/api
pnpm test    # Vitest web/API (sin suites integration/manual) y typecheck API
```

### Pruebas adicionales en CI / entorno con PostgreSQL 18 y Chromium

- **Validación de migraciones (`0001–0025`):** `scripts/db/migrate.sh` (requiere `MIGRATION_DATABASE_URL` apuntando a PostgreSQL desechable con roles `microapp_migrator` y `microapp_runtime`).
- **Pruebas de integración SQL:** archivos `apps/api/src/*.integration.test.ts`, ejecutados contra PostgreSQL 18 efímero en CI.
- **Pruebas E2E de navegador:** suite Playwright en `apps/web/e2e/` (`.github/workflows/playwright-e2e.yml`).
- **Validación documental ODD/gobernanza:** `python3 tools/validate-agent-docs.py` y `python3 -m unittest discover -s tools/tests -p 'test_validate_agent_docs.py' -v`.
