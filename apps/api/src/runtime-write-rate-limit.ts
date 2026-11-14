import type { Context } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient } from "./database";
import { consumeAuthRateLimit } from "./auth-rate-limit";

function isValidClientIp(value: string): boolean {
  if (!value || value.length > 45 || value !== value.trim() || value.includes(",") || value.includes("%")) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split(".").every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const number = Number(part);
      return number >= 0 && number <= 255 && String(number) === part;
    });
  }
  if (!value.includes(":")) return false;
  try {
    const parsed = new URL(`http://[${value}]/`);
    return parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]");
  } catch {
    return false;
  }
}

/**
 * Enforce an independent, HMAC-keyed fixed-window bucket for a sensitive write.
 * Cloudflare's CF-Connecting-IP is the sole accepted client identity; proxy
 * headers supplied by callers are deliberately ignored.
 */
export async function enforceRuntimeWriteRateLimit(
  c: Context<{ Bindings: Bindings }>,
  scope: string,
  maxAttempts: number,
): Promise<Response | null> {
  const clientIp = c.req.header("CF-Connecting-IP");
  const pepper = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientIp || !isValidClientIp(clientIp) || !pepper || pepper.length < 16) {
    return c.json({
      error: "RATE_LIMIT_UNAVAILABLE",
      message: "No se pudo verificar el límite de solicitudes. Inténtalo de nuevo más tarde.",
    }, 503);
  }

  try {
    const decision = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
      consumeAuthRateLimit(client, `write:${scope}:ip:${clientIp}`, maxAttempts, 60, pepper),
    );
    if (!decision.allowed) {
      c.header("Retry-After", String(Math.max(1, decision.retryAfterSeconds)));
      return c.json({
        error: "RATE_LIMITED",
        message: "Has alcanzado el límite de solicitudes para esta operación. Inténtalo de nuevo más tarde.",
      }, 429);
    }
    return null;
  } catch {
    return c.json({
      error: "RATE_LIMIT_UNAVAILABLE",
      message: "No se pudo verificar el límite de solicitudes. Inténtalo de nuevo más tarde.",
    }, 503);
  }
}
