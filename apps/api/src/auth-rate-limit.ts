import type { Context } from "hono";
import { withDatabaseClient } from "./database";
import type { Bindings } from "./bindings";

type AuthContext = Context<{ Bindings: Bindings }>;

export type AuthRateLimitPolicy = {
  bucket: "oauth_start" | "bootstrap_start" | "oauth_callback";
  limit: number;
  windowSeconds: number;
};

type RateLimitRow = {
  attempts: number;
  retry_after_seconds: number;
};

const MIN_SECRET_BYTES = 32;
const CLIENT_IP_PATTERN = /^[0-9a-fA-F:.]{3,64}$/;

async function createRateLimitKeyHash(secret: string, bucket: string, clientIp: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = new TextEncoder().encode(`micro-app-auth-rate-limit:v1:${bucket}:${clientIp}`);
  const signature = await crypto.subtle.sign("HMAC", key, message);
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Applies a database-atomic fixed-window limit to one auth endpoint and one
 * Cloudflare-provided client IP. Missing security configuration, missing
 * edge identity, or database errors fail closed with 503; there is no bypass.
 *
 * CF-Connecting-IP is trusted only because this Worker is deployed behind
 * Cloudflare, which overwrites this header at the edge. Never replace it with
 * X-Forwarded-For or another caller-controlled forwarding header.
 */
export async function enforceAuthRateLimit(
  c: AuthContext,
  policy: AuthRateLimitPolicy,
): Promise<Response | null> {
  const secret = c.env.AUTH_RATE_LIMIT_HMAC_KEY;
  const clientIp = c.req.header("CF-Connecting-IP");

  if (
    !secret ||
    new TextEncoder().encode(secret).byteLength < MIN_SECRET_BYTES ||
    !clientIp ||
    !CLIENT_IP_PATTERN.test(clientIp)
  ) {
    return c.json({
      error: "AUTH_RATE_LIMIT_UNAVAILABLE",
      message: "El servicio de autenticación no está disponible temporalmente.",
    }, 503);
  }

  try {
    const keyHash = await createRateLimitKeyHash(secret, policy.bucket, clientIp);
    const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
      client.query<RateLimitRow>(
        `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at)
         VALUES ($1, now(), 1, now())
         ON CONFLICT (key_hash) DO UPDATE
           SET window_started_at = CASE
                 WHEN auth_rate_limits.window_started_at + ($2 * interval '1 second') <= now()
                   THEN now()
                 ELSE auth_rate_limits.window_started_at
               END,
               attempts = CASE
                 WHEN auth_rate_limits.window_started_at + ($2 * interval '1 second') <= now()
                   THEN 1
                 ELSE auth_rate_limits.attempts + 1
               END,
               updated_at = now()
         RETURNING attempts,
           GREATEST(1, CEIL(EXTRACT(EPOCH FROM
             (window_started_at + ($2 * interval '1 second') - now())))::integer) AS retry_after_seconds`,
        [keyHash, policy.windowSeconds],
      ),
    );

    const row = result.rows[0];
    if (!row) {
      return c.json({
        error: "AUTH_RATE_LIMIT_UNAVAILABLE",
        message: "El servicio de autenticación no está disponible temporalmente.",
      }, 503);
    }

    if (row.attempts <= policy.limit) return null;

    c.header("Retry-After", String(row.retry_after_seconds));
    return c.json({
      error: "RATE_LIMITED",
      message: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
    }, 429);
  } catch {
    // Never silently allow authentication traffic when the limiter cannot
    // reach its durable store. Do not log IPs, hashes, keys, or DB errors.
    return c.json({
      error: "AUTH_RATE_LIMIT_UNAVAILABLE",
      message: "El servicio de autenticación no está disponible temporalmente.",
    }, 503);
  }
}
