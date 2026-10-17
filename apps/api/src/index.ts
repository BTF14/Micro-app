import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  FRONTEND_ORIGIN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (_origin, c) => {
      // Hono's test request helper may omit the environment bindings.
      // Missing configuration must fail closed without breaking public routes.
      const configuredOrigin = c.env?.FRONTEND_ORIGIN;
      if (!configuredOrigin) return "";
      return _origin === configuredOrigin ? configuredOrigin : "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    maxAge: 600,
  }),
);

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
