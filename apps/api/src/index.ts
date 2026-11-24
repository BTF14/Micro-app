import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerAuthRoutes } from "./auth";
import { registerGoogleAuthRoutes } from "./google-auth";
import { registerBranchRoutes } from "./branches";
import { registerCatalogRoutes } from "./catalog";
import { registerInventoryCountRoutes } from "./inventory-counts";
import { registerInventoryReadRoutes } from "./inventory-read";
import { registerInventoryReceiptRoutes } from "./inventory-receipts";
import { registerCatalogWriteRoutes } from "./catalog-write";
import { registerCatalogImportRoutes } from "./catalog-import";
import { registerSalesCheckoutRoutes } from "./sales-checkout";
import { registerRegisterShiftRoutes } from "./register-shifts";
import { registerReportsRoutes } from "./reports";
import { registerOrganizationStructureRoutes } from "./organization-structure";
import { registerFxContingencyRoutes } from "./fx-contingency";
import { withDatabaseClient } from "./database";
import { cleanupExpiredAuthRecords } from "./auth-rate-limit";
import {
  BCV_STALE_RUNNING_THRESHOLD_SECONDS,
  isBcvSyncStateStaleRunning,
  registerExchangeRateRoutes,
  safeBcvSyncErrorCode,
  syncBcvOfficialRate,
} from "./exchange-rates";

import type { Bindings } from "./bindings";

const BCV_SYNC_CRONS = new Set(["0 11 * * MON-FRI", "0 22 * * MON-FRI"]);

const app = new Hono<{ Bindings: Bindings }>();

function getConfiguredFrontendOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    if (url.protocol !== "https:" && !isLocalHttp) return undefined;
    if (url.username || url.password) return undefined;
    if (url.pathname !== "/" || url.search || url.hash) return undefined;
    if (url.origin !== value) return undefined;

    return url.origin;
  } catch {
    return undefined;
  }
}

app.use(
  "*",
  cors({
    origin: (_origin, c) => {
      // Missing or malformed configuration must fail closed without breaking public routes.
      const configuredOrigin = getConfiguredFrontendOrigin(c.env?.FRONTEND_ORIGIN);
      if (!configuredOrigin) return "";
      return _origin === configuredOrigin ? configuredOrigin : "";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: true,
    maxAge: 600,
  }),
);

const PRODUCTION_WORKER_HOST = "micro-app-api.btfcasheb.workers.dev";

app.use("*", async (c, next) => {
  const requestHost = new URL(c.req.url).hostname.toLowerCase();
  const isWorkersDevPreview = requestHost.endsWith(".workers.dev") && requestHost !== PRODUCTION_WORKER_HOST;
  if ((c.env?.APP_ENV === "preview" || isWorkersDevPreview) && c.req.path !== "/health") {
    return c.json({
      error: "PREVIEW_API_DISABLED",
      message: "La API de preview está aislada y no tiene acceso a datos de aplicación.",
    }, 503);
  }
  return next();
});

// Baseline security headers on every response. This is a JSON API (no HTML
// rendered here), so there's no CSP to set, but these still matter: nosniff
// stops a browser from guessing a response is HTML/script from its content,
// no-referrer avoids leaking full URLs (which can carry tokens in query
// strings) to any third party, and no-store on auth endpoints stops a shared
// or misconfigured cache/proxy from serving one user's session response to
// another.
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  if (c.req.path.startsWith("/auth/")) {
    c.header("Cache-Control", "no-store");
  }
});

registerAuthRoutes(app);
registerGoogleAuthRoutes(app);
registerBranchRoutes(app);
registerCatalogRoutes(app);
registerInventoryCountRoutes(app);
registerInventoryReadRoutes(app);
registerInventoryReceiptRoutes(app);
registerCatalogWriteRoutes(app);
registerCatalogImportRoutes(app);
registerSalesCheckoutRoutes(app);
registerRegisterShiftRoutes(app);
registerReportsRoutes(app);
registerOrganizationStructureRoutes(app);
registerFxContingencyRoutes(app);
registerExchangeRateRoutes(app);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "micro-app-api",
    stage: "catalog-inventory-read",
  }),
);

app.notFound((c) =>
  c.json({ error: "NOT_FOUND", message: "Ruta no encontrada." }, 404),
);

app.onError((_error, c) => {
  // Avoid leaking stack traces or secrets in client responses.
  // Keep internal exception details out of logs until a redacted logger is in place.
  console.error("Unhandled API error");
  return c.json(
    { error: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." },
    500,
  );
});

export default Object.assign(app, {
  async scheduled(controller: ScheduledController, env: Bindings): Promise<void> {
    // BCV ingestion is a separately gated Cron; it remains inert unless explicitly enabled.
    if (BCV_SYNC_CRONS.has(controller.cron)) {
      if (env.APP_ENV !== "production" || env.BCV_SYNC_ENABLED !== "true") return;
      // Fail closed: the isolated Worker must never borrow the API runtime credential.
      if (!env.DATABASE_URL_BCV_SYNC) {
        console.error({ event: "BCV_SYNC_FAILED", code: "BCV_SYNC_DATABASE_URL_MISSING" });
        throw new Error("BCV_SYNC_FAILED");
      }
      try {
        console.info({ event: "BCV_SYNC_STARTED" });
        const outcome = await syncBcvOfficialRate(env.DATABASE_URL_BCV_SYNC);
        console.info({ event: "BCV_SYNC_COMPLETED", outcome });
      } catch (error) {
        console.error({ event: "BCV_SYNC_FAILED", code: safeBcvSyncErrorCode(error) });
        throw new Error("BCV_SYNC_FAILED");
      }
      return;
    }
    // The hourly runtime Cron observes BCV state and cleans expired auth records.
    // These subjobs are deliberately independent: neither may suppress the other.
    if (controller.cron !== "17 * * * *") return;
    // Worker previews must never connect to the application database.
    if (env.APP_ENV !== "production") return;

    try {
      await withDatabaseClient(env.DATABASE_URL, async (client) => {
        const result = await client.query<{
          last_attempt_at: string | null;
          last_outcome: string | null;
          attempt_age_seconds: number | null;
        }>(
          `SELECT
             to_char(last_attempt_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_attempt_at,
             last_outcome,
             CASE WHEN last_attempt_at IS NULL THEN NULL
                  ELSE GREATEST(0, floor(extract(epoch FROM (now() - last_attempt_at))))::int
              END AS attempt_age_seconds
           FROM public.bcv_sync_state
          WHERE singleton = true`,
        );
        const state = result.rows[0];
        if (state && isBcvSyncStateStaleRunning(state.last_outcome, state.attempt_age_seconds)) {
          console.error({
            event: "BCV_SYNC_STALE_RUNNING",
            attemptAgeSeconds: state.attempt_age_seconds,
            thresholdSeconds: BCV_STALE_RUNNING_THRESHOLD_SECONDS,
            lastAttemptAt: state.last_attempt_at,
          });
        }
      });
    } catch {
      // Keep this diagnostic sanitized; retention cleanup must still run.
      console.error({ event: "BCV_SYNC_WATCHDOG_LOOKUP_FAILED" });
    }

    try {
      await withDatabaseClient(env.DATABASE_URL, (client) =>
        cleanupExpiredAuthRecords(client),
      );
    } catch {
      // Watchdog already ran independently; report cleanup failure without secrets.
      console.error({ event: "AUTH_RETENTION_CLEANUP_FAILED" });
    }
  },
});
