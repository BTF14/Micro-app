import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import { withDatabaseClient, withDatabaseTransaction, type DatabaseClient } from "./database";
import type { Bindings } from "./bindings";

type AppContext = Context<{ Bindings: Bindings }>;

const SESSION_COOKIE = "microapp_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const PBKDF2_ITERATIONS = 310_000;
const DUMMY_PASSWORD_HASH = "pbkdf2-sha256$310000$ZHVtbXktc2FsdC1mb3Itbm90LWEtc2VjcmV0$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  is_active: boolean;
};

type SessionUserRow = {
  id: string;
  email: string;
  display_name: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "cashier" | "inventory";
};

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(client: DatabaseClient, scope: string, limit: number): Promise<boolean> {
  const keyHash = await sha256Hex(scope);
  const result = await client.query<{ attempts: number }>(
    `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at)
     VALUES ($1, now(), 1, now())
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN auth_rate_limits.window_started_at < now() - interval '1 minute' THEN 1
         ELSE auth_rate_limits.attempts + 1
       END,
       window_started_at = CASE
         WHEN auth_rate_limits.window_started_at < now() - interval '1 minute' THEN now()
         ELSE auth_rate_limits.window_started_at
       END,
       updated_at = now()
     RETURNING attempts`,
    [keyHash],
  );
  return Number(result.rows[0]?.attempts ?? limit + 1) <= limit;
}

async function checkRateLimits(
  databaseUrl: string | undefined,
  route: string,
  ip: string,
  email: string | undefined,
): Promise<boolean> {
  return withDatabaseClient(databaseUrl, async (client) => {
    // Opportunistic retention: keep the table bounded without a separate scheduler.
    await client.query("DELETE FROM auth_rate_limits WHERE updated_at < now() - interval '24 hours'");
    const ipAllowed = await consumeRateLimit(client, `${route}:ip:${ip}`, route === "register" ? 5 : 15);
    if (!ipAllowed) return false;
    if (!email) return true;
    return consumeRateLimit(client, `${route}:email:${email}`, route === "register" ? 5 : 5);
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return ["pbkdf2-sha256", String(PBKDF2_ITERATIONS), encodeBase64Url(salt), encodeBase64Url(new Uint8Array(bits))].join("$");
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const candidate = encoded ?? DUMMY_PASSWORD_HASH;
  const parts = candidate.split("$");
  if (parts.length !== 4) {
    // Extra fields are not part of the persisted hash format.
    await hashPassword(password);
    return false;
  }
  const [algorithm, iterationText, saltText, expectedText] = parts;
  const iterations = Number(iterationText);
  if (
    algorithm !== "pbkdf2-sha256" ||
    !Number.isInteger(iterations) ||
    iterationText !== String(iterations) ||
    iterations < 100_000 ||
    iterations > 1_000_000 ||
    !saltText ||
    !expectedText
  ) {
    // Perform a dummy derivation for malformed or missing stored hashes as well.
    await hashPassword(password);
    return false;
  }

  try {
    const salt = decodeBase64Url(saltText);
    const expected = decodeBase64Url(expectedText);
    // Reject non-canonical or malformed encodings before deriving a key.
    if (salt.length !== 16 || expected.length !== 32 ||
        encodeBase64Url(salt) !== saltText || encodeBase64Url(expected) !== expectedText) {
      await hashPassword(password);
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const actual = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      key,
      256,
    ));

    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0 && encoded !== null;
  } catch {
    // A corrupt stored hash is invalid credentials, never an uncaught 500.
    await hashPassword(password);
    return false;
  }
}

export function isTrustedOrigin(origin: string | undefined, configuredOrigin: string | undefined): boolean {
  if (!origin || !configuredOrigin) return false;
  try {
    const parsed = new URL(configuredOrigin);
    const isLocalHttp =
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);

    // Match the CORS policy: HTTPS everywhere except local development hosts.
    if (parsed.protocol !== "https:" && !isLocalHttp) return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) return false;
    return parsed.origin === configuredOrigin && origin === configuredOrigin;
  } catch {
    return false;
  }
}

function createSessionToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function setSessionCookie(c: AppContext, token: string): void {
  const isHttps = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

function clearSessionCookie(c: AppContext): void {
  const isHttps = new URL(c.req.url).protocol === "https:";
  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
  });
}

async function createSession(client: DatabaseClient, userId: string): Promise<string> {
  const token = createSessionToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await client.query(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
  return token;
}

async function getSessionUser(client: DatabaseClient, token: string | undefined): Promise<SessionUserRow | null> {
  if (!token || token.length > 128) return null;
  const tokenHash = await sha256Hex(token);
  const result = await client.query<SessionUserRow>(
    `SELECT u.id, u.email, u.display_name
       FROM auth_sessions s
       JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.is_active = true
      LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export function registerAuthRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.post("/auth/register", async (c) => {
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
      return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    }

    const body = await c.req.json<{
      email?: unknown;
      displayName?: unknown;
      password?: unknown;
      organizationName?: unknown;
    }>().catch(() => null);

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const organizationName = typeof body?.organizationName === "string" ? body.organizationName.trim() : "";

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      displayName.length < 2 ||
      displayName.length > 100 ||
      password.length < 12 ||
      password.length > 128 ||
      organizationName.length < 2 ||
      organizationName.length > 120
    ) {
      return c.json({
        error: "INVALID_REGISTRATION",
        message: "Revisa el correo, el nombre, el negocio y la contraseña (mínimo 12 caracteres).",
      }, 400);
    }

    try {
      const allowed = await checkRateLimits(
        c.env.DATABASE_URL,
        "register",
        c.req.header("CF-Connecting-IP") ?? "unknown",
        email,
      );
      if (!allowed) {
        return c.json({ error: "RATE_LIMITED", message: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." }, 429);
      }
    } catch {
      return c.json({ error: "AUTH_UNAVAILABLE", message: "El servicio de registro no está disponible." }, 503);
    }

    const passwordHash = await hashPassword(password);
    const slugBase = organizationName.normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "negocio";
    const organizationSlug = `${slugBase}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const token = createSessionToken();
        const tokenHash = await sha256Hex(token);
        const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

        const created = await withDatabaseTransaction(client, async (transaction) => {
          const userResult = await transaction.query<{ id: string; email: string; display_name: string }>(
            "INSERT INTO app_users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, display_name",
            [email, displayName, passwordHash],
          );
          const user = userResult.rows[0];
          if (!user) throw new Error("USER_CREATION_FAILED");

          const orgResult = await transaction.query<{ id: string; name: string; slug: string }>(
            "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug",
            [organizationName, organizationSlug],
          );
          const organization = orgResult.rows[0];
          if (!organization) throw new Error("ORGANIZATION_CREATION_FAILED");

          await transaction.query(
            "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
            [organization.id, user.id],
          );
          await transaction.query(
            "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
            [user.id, tokenHash, expiresAt],
          );
          return { user, organization };
        });

        return { ...created, token };
      });

      setSessionCookie(c, result.token);
      return c.json({
        user: result.user,
        organizations: [{ ...result.organization, role: "owner" }],
      }, 201);
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      if (code === "23505") {
        return c.json({ error: "REGISTRATION_CONFLICT", message: "No se pudo crear la cuenta con esos datos." }, 409);
      }
      return c.json({ error: "REGISTRATION_FAILED", message: "No se pudo completar el registro." }, 500);
    }
  });

  app.post("/auth/login", async (c) => {
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
      return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    }

    const body = await c.req.json<{ email?: unknown; password?: unknown }>().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (email.length > 254 || !email || password.length > 128 || !password) {
      return c.json({ error: "INVALID_CREDENTIALS", message: "Correo o contraseña incorrectos." }, 401);
    }

    try {
      const allowed = await checkRateLimits(
        c.env.DATABASE_URL,
        "login",
        c.req.header("CF-Connecting-IP") ?? "unknown",
        email,
      );
      if (!allowed) {
        return c.json({ error: "RATE_LIMITED", message: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." }, 429);
      }

      const result = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const userResult = await client.query<UserRow>(
          "SELECT id, email, display_name, password_hash, is_active FROM app_users WHERE lower(email) = $1 LIMIT 1",
          [email],
        );
        const user = userResult.rows[0];
        const validPassword = await verifyPassword(password, user?.password_hash ?? null);
        if (!user || !user.is_active || !validPassword) return null;

        const memberships = await client.query<OrganizationRow>(
          `SELECT o.id, o.name, o.slug, m.role
             FROM organization_members m
             JOIN organizations o ON o.id = m.organization_id
            WHERE m.user_id = $1 AND m.is_active = true AND o.is_active = true
            ORDER BY o.name`,
          [user.id],
        );
        if (memberships.rows.length === 0) return null;

        const token = await createSession(client, user.id);
        return {
          token,
          user: { id: user.id, email: user.email, display_name: user.display_name },
          organizations: memberships.rows,
        };
      });

      if (!result) {
        return c.json({ error: "INVALID_CREDENTIALS", message: "Correo o contraseña incorrectos." }, 401);
      }
      setSessionCookie(c, result.token);
      return c.json({ user: result.user, organizations: result.organizations });
    } catch {
      return c.json({ error: "LOGIN_FAILED", message: "No se pudo iniciar sesión." }, 500);
    }
  });

  app.get("/auth/me", async (c) => {
    try {
      const token = getCookie(c, SESSION_COOKIE);
      const result = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const user = await getSessionUser(client, token);
        if (!user) return null;
        const memberships = await client.query<OrganizationRow>(
          `SELECT o.id, o.name, o.slug, m.role
             FROM organization_members m
             JOIN organizations o ON o.id = m.organization_id
            WHERE m.user_id = $1 AND m.is_active = true AND o.is_active = true
            ORDER BY o.name`,
          [user.id],
        );
        if (memberships.rows.length === 0) return null;
        return { user, organizations: memberships.rows };
      });
      if (!result) {
        clearSessionCookie(c);
        return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      }
      return c.json(result);
    } catch {
      return c.json({ error: "SESSION_LOOKUP_FAILED", message: "No se pudo validar la sesión." }, 500);
    }
  });

  app.post("/auth/logout", async (c) => {
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
      return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    }

    const token = getCookie(c, SESSION_COOKIE);
    if (!token || token.length > 128) {
      clearSessionCookie(c);
      return c.body(null, 204);
    }

    try {
      const tokenHash = await sha256Hex(token);
      await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        await client.query(
          "UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
          [tokenHash],
        );
      });
      // Only clear the client cookie after the server confirms revocation.
      clearSessionCookie(c);
      return c.body(null, 204);
    } catch {
      // Keep the cookie so the client can retry; do not disguise a failed revocation.
      return c.json({ error: "LOGOUT_FAILED", message: "No se pudo cerrar la sesión de forma segura." }, 500);
    }
  });
}
