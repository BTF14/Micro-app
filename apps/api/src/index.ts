import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerAuthRoutes } from "./auth";
import { registerGoogleAuthRoutes } from "./google-auth";
import { registerCatalogRoutes } from "./catalog";
import type { Bindings } from "./bindings";

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
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: true,
    maxAge: 600,
  }),
);

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
registerCatalogRoutes(app);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "micro-app-api",
    stage: "scaffold",
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

export default app;
