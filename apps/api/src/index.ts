import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  FRONTEND_ORIGIN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const configuredOrigin = c.env.FRONTEND_ORIGIN;
      if (!configuredOrigin) return "";
      return origin === configuredOrigin ? configuredOrigin : "";
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

app.onError((error, c) => {
  // Avoid leaking stack traces or secrets in client responses.
  console.error("Unhandled API error", error.message);
  return c.json(
    { error: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." },
    500,
  );
});

export default app;
