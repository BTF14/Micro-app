import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import { withDatabaseClient, withDatabaseTransaction, type DatabaseClient } from "./database";
import type { Bindings } from "./bindings";

type AppContext = Context<{ Bindings: Bindings }>;

const SESSION_COOKIE = "microapp_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const STATE_COOKIE = "microapp_oauth_state";
const VERIFIER_COOKIE = "microapp_oauth_verifier";
const BOOTSTRAP_COOKIE = "microapp_oauth_bootstrap";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;
const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleUserInfo = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
};

type BootstrapRequest = {
  token: string;
  organizationName: string;
  organizationSlug: string;
};

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(byteLength: number): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function pkceChallengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return encodeBase64Url(new Uint8Array(digest));
}

function isHttps(c: AppContext): boolean {
  return new URL(c.req.url).protocol === "https:";
}

function setShortLivedCookie(c: AppContext, name: string, value: string): void {
  const secure = isHttps(c);
  setCookie(c, name, value, {
    httpOnly: true,
    secure,
    // Lax is required (not None) so the cookie is still sent on the top-level
    // GET navigation back from Google, without needing a cross-site cookie.
    sameSite: "Lax",
    path: "/auth/google",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

function clearOAuthCookies(c: AppContext): void {
  const secure = isHttps(c);
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, BOOTSTRAP_COOKIE]) {
    deleteCookie(c, name, { path: "/auth/google", secure, sameSite: "Lax" });
  }
}

function setSessionCookie(c: AppContext, token: string): void {
  const secure = isHttps(c);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

async function createSession(client: DatabaseClient, userId: string): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await client.query(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
  return token;
}

export function getConfiguredFrontendOrigin(value: string | undefined): string | undefined {
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

function redirectToFrontend(c: AppContext, path: string): Response {
  const configured = getConfiguredFrontendOrigin(c.env.FRONTEND_ORIGIN);
  if (!configured) {
    // No safe place to send the browser; fail closed with a plain response
    // instead of guessing a redirect target.
    return c.json({ error: "FRONTEND_NOT_CONFIGURED", message: "No se pudo completar el inicio de sesión." }, 500);
  }
  return c.redirect(`${configured}${path}`, 302);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function startGoogleAuthorization(c: AppContext, bootstrapRequest?: BootstrapRequest): Promise<Response> {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const redirectUri = c.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return c.json({ error: "GOOGLE_NOT_CONFIGURED", message: "El inicio de sesión con Google no está configurado." }, 503);
  }

  const state = randomToken(24);
  const codeVerifier = randomToken(48);
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);

  setShortLivedCookie(c, STATE_COOKIE, state);
  setShortLivedCookie(c, VERIFIER_COOKIE, codeVerifier);
  if (bootstrapRequest) {
    setShortLivedCookie(c, BOOTSTRAP_COOKIE, JSON.stringify(bootstrapRequest));
  }

  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("access_type", "online");
  authorizationUrl.searchParams.set("prompt", "select_account");

  return c.redirect(authorizationUrl.toString(), 302);
}

export function registerGoogleAuthRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/auth/google", async (c) => {
    const url = new URL(c.req.url);
    if (["bootstrap_token", "org_name", "org_slug"].some((key) => url.searchParams.has(key))) {
      return c.json({
        error: "BOOTSTRAP_METHOD_REQUIRED",
        message: "El alta inicial debe iniciarse mediante una petición POST protegida.",
      }, 400);
    }
    return startGoogleAuthorization(c);
  });

  app.post("/auth/google", async (c) => {
    const configuredOrigin = getConfiguredFrontendOrigin(c.env.FRONTEND_ORIGIN);
    if (!configuredOrigin || c.req.header("Origin") !== configuredOrigin) {
      return c.json({ error: "INVALID_BOOTSTRAP_ORIGIN", message: "No se pudo iniciar el alta administrativa." }, 403);
    }

    const contentType = c.req.header("Content-Type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== "application/x-www-form-urlencoded") {
      return c.json({ error: "INVALID_BOOTSTRAP_CONTENT_TYPE", message: "Formato de solicitud inválido." }, 415);
    }

    if (new URL(c.req.url).search) {
      return c.json({ error: "BOOTSTRAP_QUERY_NOT_ALLOWED", message: "No se permiten parámetros de alta en la URL." }, 400);
    }

    const declaredLength = c.req.header("Content-Length");
    if (declaredLength !== undefined && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > 2048)) {
      return c.json({ error: "INVALID_BOOTSTRAP_BODY", message: "Solicitud de alta inválida." }, 400);
    }

    let rawBody: string;
    try {
      rawBody = await c.req.text();
    } catch {
      return c.json({ error: "INVALID_BOOTSTRAP_BODY", message: "Solicitud de alta inválida." }, 400);
    }
    if (new TextEncoder().encode(rawBody).byteLength > 2048) {
      return c.json({ error: "INVALID_BOOTSTRAP_BODY", message: "Solicitud de alta inválida." }, 413);
    }

    const params = new URLSearchParams(rawBody);
    const allowed = new Set(["bootstrap_token", "org_name", "org_slug"]);
    if (
      Array.from(params.keys()).some((key) => !allowed.has(key)) ||
      ["bootstrap_token", "org_name", "org_slug"].some((key) => params.getAll(key).length !== 1)
    ) {
      return c.json({ error: "INVALID_BOOTSTRAP_PARAMS", message: "Datos de organización inválidos." }, 400);
    }

    const token = params.get("bootstrap_token") ?? "";
    const organizationName = (params.get("org_name") ?? "").trim();
    const organizationSlug = params.get("org_slug") ?? "";
    if (
      !token ||
      token.length > 512 ||
      organizationName.length < 2 ||
      organizationName.length > 120 ||
      organizationSlug.length > 80 ||
      !SLUG_PATTERN.test(organizationSlug)
    ) {
      return c.json({ error: "INVALID_BOOTSTRAP_PARAMS", message: "Datos de organización inválidos." }, 400);
    }

    if (!c.env.BOOTSTRAP_TOKEN || token !== c.env.BOOTSTRAP_TOKEN) {
      return c.json({ error: "BOOTSTRAP_NOT_AUTHORIZED", message: "No se pudo iniciar el alta administrativa." }, 403);
    }

    return startGoogleAuthorization(c, { token, organizationName, organizationSlug });
  });

  app.get("/auth/google/callback", async (c) => {
    const storedState = getCookie(c, STATE_COOKIE);
    const codeVerifier = getCookie(c, VERIFIER_COOKIE);
    const bootstrapCookieRaw = getCookie(c, BOOTSTRAP_COOKIE);
    clearOAuthCookies(c);

    const queryState = c.req.query("state");
    const code = c.req.query("code");
    const oauthError = c.req.query("error");

    if (oauthError || !code || !storedState || !queryState || storedState !== queryState || !codeVerifier) {
      return redirectToFrontend(c, "/?auth_error=oauth_failed");
    }

    const clientId = c.env.GOOGLE_CLIENT_ID;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = c.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return c.json({ error: "GOOGLE_NOT_CONFIGURED", message: "El inicio de sesión con Google no está configurado." }, 503);
    }

    let userInfo: GoogleUserInfo;
    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
          code_verifier: codeVerifier,
        }),
      });
      if (!tokenResponse.ok) return redirectToFrontend(c, "/?auth_error=oauth_failed");
      const tokenPayload = await tokenResponse.json() as { access_token?: unknown };
      const accessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : "";
      if (!accessToken) return redirectToFrontend(c, "/?auth_error=oauth_failed");

      // Google's userinfo endpoint only returns claims for a token it issued
      // and validated itself, which gives us server-verified identity data
      // over TLS without implementing JWT signature verification ourselves.
      const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoResponse.ok) return redirectToFrontend(c, "/?auth_error=oauth_failed");
      userInfo = await userInfoResponse.json() as GoogleUserInfo;
    } catch {
      return redirectToFrontend(c, "/?auth_error=oauth_failed");
    }

    const sub = typeof userInfo.sub === "string" ? userInfo.sub : "";
    const rawEmail = typeof userInfo.email === "string" ? userInfo.email : "";
    const emailVerified = userInfo.email_verified === true || userInfo.email_verified === "true";
    const displayName = typeof userInfo.name === "string" && userInfo.name.trim() ? userInfo.name.trim() : rawEmail;
    const email = rawEmail.trim().toLowerCase();

    if (!sub || !email || !emailVerified) {
      return redirectToFrontend(c, "/?auth_error=email_not_verified");
    }

    let bootstrapRequest: BootstrapRequest | null = null;
    if (bootstrapCookieRaw) {
      try {
        const parsed = JSON.parse(bootstrapCookieRaw) as Partial<BootstrapRequest>;
        if (
          typeof parsed.token === "string" &&
          typeof parsed.organizationName === "string" &&
          typeof parsed.organizationSlug === "string"
        ) {
          bootstrapRequest = parsed as BootstrapRequest;
        }
      } catch {
        bootstrapRequest = null;
      }
    }

    try {
      const outcome = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        const allowlistResult = await client.query<{ id: string }>(
          "SELECT id FROM auth_allowlist WHERE lower(email) = $1 AND is_active = true LIMIT 1",
          [email],
        );
        if (allowlistResult.rows.length === 0) {
          return { kind: "not_allowlisted" as const };
        }

        const existingUser = await client.query<{
          id: string;
          is_active: boolean;
          google_sub: string | null;
        }>(
          "SELECT id, is_active, google_sub FROM app_users WHERE lower(email) = $1 LIMIT 1",
          [email],
        );

        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0]!;
          if (!user.is_active) return { kind: "inactive" as const };

          if (user.google_sub === null) {
            // Decision D7: never link a pre-existing account solely because its
            // email matches. Account linking requires a separate, explicit,
            // authenticated recovery flow; none is implemented yet.
            return { kind: "identity_unlinked" as const };
          }
          if (user.google_sub !== sub) {
            // The Google account presenting this email no longer matches the
            // one originally linked; do not silently re-link.
            return { kind: "identity_mismatch" as const };
          }

          const memberships = await client.query<{ organization_id: string }>(
            `SELECT o.id AS organization_id
               FROM organization_members m
               JOIN organizations o ON o.id = m.organization_id
              WHERE m.user_id = $1 AND m.is_active = true AND o.is_active = true
              LIMIT 1`,
            [user.id],
          );
          if (memberships.rows.length === 0) return { kind: "no_membership" as const };

          const token = await createSession(client, user.id);
          return { kind: "ok" as const, token };
        }

        // No existing user: only the sealed, single-use bootstrap path may
        // create one, and only when the caller supplied the correct secret.
        if (!bootstrapRequest || !c.env.BOOTSTRAP_TOKEN || bootstrapRequest.token !== c.env.BOOTSTRAP_TOKEN) {
          return { kind: "not_provisioned" as const };
        }

        return withDatabaseTransaction(client, async (tx) => {
          // Locks the single sentinel row so two concurrent bootstrap
          // attempts cannot both pass the consumed_at check.
          const bootstrapRow = await tx.query<{ consumed_at: string | null }>(
            "SELECT consumed_at FROM auth_bootstrap WHERE id = true FOR UPDATE",
          );
          if (bootstrapRow.rows.length === 0 || bootstrapRow.rows[0]!.consumed_at !== null) {
            return { kind: "bootstrap_consumed" as const };
          }

          const orgResult = await tx.query<{ id: string }>(
            "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
            [bootstrapRequest.organizationName, bootstrapRequest.organizationSlug],
          );
          const organizationId = orgResult.rows[0]!.id;

          const userResult = await tx.query<{ id: string }>(
            `INSERT INTO app_users (email, display_name, google_sub, email_verified_at)
             VALUES ($1, $2, $3, now()) RETURNING id`,
            [email, displayName, sub],
          );
          const userId = userResult.rows[0]!.id;

          await tx.query(
            "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
            [organizationId, userId],
          );
          await tx.query(
            "UPDATE auth_bootstrap SET consumed_at = now(), consumed_by_email = $1, created_organization_id = $2 WHERE id = true",
            [email, organizationId],
          );

          const token = await createSession(tx, userId);
          return { kind: "ok" as const, token };
        });
      });

      if (outcome.kind === "ok") {
        setSessionCookie(c, outcome.token);
        return redirectToFrontend(c, "/");
      }
      if (outcome.kind === "not_allowlisted") return redirectToFrontend(c, "/?auth_error=not_allowlisted");
      if (outcome.kind === "inactive" || outcome.kind === "no_membership") return redirectToFrontend(c, "/?auth_error=account_inactive");
      if (outcome.kind === "identity_mismatch") return redirectToFrontend(c, "/?auth_error=identity_mismatch");
      if (outcome.kind === "identity_unlinked") return redirectToFrontend(c, "/?auth_error=account_link_required");
      if (outcome.kind === "bootstrap_consumed") return redirectToFrontend(c, "/?auth_error=bootstrap_consumed");
      return redirectToFrontend(c, "/?auth_error=not_provisioned");
    } catch {
      return redirectToFrontend(c, "/?auth_error=server_error");
    }
  });
}
