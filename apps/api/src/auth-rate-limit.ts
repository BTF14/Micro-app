import type { DatabaseClient } from "./database";

export type AuthRateLimitDecision = {
  allowed: boolean;
  attempts: number;
  retryAfterSeconds: number;
};

/**
 * HMAC a namespaced rate-limit key before it reaches PostgreSQL.
 * Callers must include the route scope and trusted client IP in the value;
 * the existing Google OAuth client secret is the per-environment HMAC pepper.
 */
export async function hashAuthRateLimitKey(value: string, pepper: string): Promise<string> {
  if (!value || value.length > 512 || !pepper || pepper.length < 16) {
    throw new Error("Invalid authentication rate-limit key or HMAC pepper.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Atomically increments one fixed-window bucket. The UPSERT row lock makes
 * concurrent requests share one counter; the counter saturates at max+1.
 * Only a keyed HMAC is stored, never the raw IP or caller-supplied key.
 */
export async function consumeAuthRateLimit(
  client: DatabaseClient,
  key: string,
  maxAttempts: number,
  windowSeconds: number,
  pepper: string,
): Promise<AuthRateLimitDecision> {
  if (
    !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10_000 ||
    !Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86_400
  ) {
    throw new Error("Invalid authentication rate-limit policy.");
  }

  const keyHash = await hashAuthRateLimitKey(key, pepper);
  const result = await client.query<{
    attempts: number;
    window_started_at: string | Date;
  }>(
    `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at)
     VALUES ($1, now(), 1, now())
     ON CONFLICT (key_hash) DO UPDATE
       SET attempts = CASE
             WHEN auth_rate_limits.window_started_at <= now() - ($2::integer * interval '1 second') THEN 1
             ELSE LEAST(auth_rate_limits.attempts + 1, $3::integer + 1)
           END,
           window_started_at = CASE
             WHEN auth_rate_limits.window_started_at <= now() - ($2::integer * interval '1 second') THEN now()
             ELSE auth_rate_limits.window_started_at
           END,
           updated_at = now()
     RETURNING attempts, window_started_at`,
    [keyHash, windowSeconds, maxAttempts],
  );

  const row = result.rows[0];
  if (!row) throw new Error("Authentication rate-limit counter was not returned.");

  const attempts = Number(row.attempts);
  const windowStartMs = row.window_started_at instanceof Date
    ? row.window_started_at.getTime()
    : Date.parse(row.window_started_at);
  const retryAfterSeconds = attempts <= maxAttempts
    ? 0
    : Math.max(
        1,
        Number.isFinite(windowStartMs)
          ? Math.min(windowSeconds, Math.ceil((windowStartMs + windowSeconds * 1000 - Date.now()) / 1000))
          : windowSeconds,
      );

  // Opportunistically prune a bounded batch of expired buckets when a new
  // window starts. The updated_at index keeps this bounded and infrequent.
  if (attempts === 1) {
    await client.query(
      `DELETE FROM auth_rate_limits
        WHERE key_hash IN (
          SELECT key_hash
            FROM auth_rate_limits
           WHERE updated_at < now() - interval '7 days'
           ORDER BY updated_at ASC
           LIMIT 100
        )`,
    );
  }

  return { allowed: attempts <= maxAttempts, attempts, retryAfterSeconds };
}
