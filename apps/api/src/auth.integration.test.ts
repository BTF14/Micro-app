import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { hashPassword } from "./auth";

// In integration tests, exercise the real PostgreSQL protocol while keeping
// production Workers on @neondatabase/serverless. Adapt Neon’s string
// constructor to node-postgres’ connection config constructor.
vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) {
        super({ connectionString });
      }
    },
  };
});

const appModule = await import("./index");
const app = appModule.default;
const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
const frontendOrigin = "https://micro-app.example";
const password = "integration-test-password-2026";
const email = `auth-integration-${crypto.randomUUID()}@example.test`;
const organizationName = `Integration Shop ${crypto.randomUUID()}`;
const databaseAvailable = Boolean(databaseUrl);
const isCi = Boolean((globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI);
if (isCi && !databaseAvailable) {
  throw new Error("DATABASE_URL is required in CI; refusing to silently skip PostgreSQL auth integration tests.");
}

const suite = describe.skipIf(!databaseAvailable)("authentication routes against PostgreSQL", () => {
  let cleanupClient: Client;

  beforeAll(async () => {
    cleanupClient = new Client({ connectionString: databaseUrl });
    await cleanupClient.connect();
  });

  afterAll(async () => {
    if (cleanupClient) {
      await cleanupClient.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM app_users WHERE email = $1)", [email]);
      await cleanupClient.query("DELETE FROM organization_members WHERE user_id IN (SELECT id FROM app_users WHERE email = $1)", [email]);
      await cleanupClient.query("DELETE FROM organizations WHERE name = $1", [organizationName]);
      await cleanupClient.query("DELETE FROM app_users WHERE email = $1", [email]);
      await cleanupClient.end();
    }
  });

  it("blocks public registration and password login without any writes", async () => {
    const originHeaders = {
      Origin: frontendOrigin,
      "Content-Type": "application/json",
    };
    const registrationIp = crypto.randomUUID();
    const registerBody = {
      email,
      displayName: "Integration User",
      password,
      organizationName,
    };

    const registerResponse = await app.fetch(new Request("https://api.example/auth/register", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": registrationIp },
      body: JSON.stringify(registerBody),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });

    expect(registerResponse.status).toBe(503);
    await expect(registerResponse.json()).resolves.toMatchObject({ error: "REGISTRATION_DISABLED" });
    expect(registerResponse.headers.get("set-cookie")).toBeNull();

    const deniedWrites = await cleanupClient.query<{ users: string; orgs: string; members: string; sessions: string }>(
      `SELECT
         (SELECT count(*)::text FROM app_users WHERE email = $1) AS users,
         (SELECT count(*)::text FROM organizations WHERE name = $2) AS orgs,
         (SELECT count(*)::text FROM organization_members WHERE user_id = (SELECT id FROM app_users WHERE email = $1)) AS members,
         (SELECT count(*)::text FROM auth_sessions WHERE user_id = (SELECT id FROM app_users WHERE email = $1)) AS sessions`,
      [email, organizationName],
    );
    expect(deniedWrites.rows[0]).toEqual({ users: "0", orgs: "0", members: "0", sessions: "0" });

    const sha256Hex = async (value: string): Promise<string> => {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    };
    const [ipLimitHash, emailLimitHash] = await Promise.all([
      sha256Hex(`register:ip:${registrationIp}`),
      sha256Hex(`register:email:${email}`),
    ]);
    const deniedRateLimitWrites = await cleanupClient.query(
      "SELECT key_hash FROM auth_rate_limits WHERE key_hash = ANY($1::char(64)[])",
      [[ipLimitHash, emailLimitHash]],
    );
    expect(deniedRateLimitWrites.rows).toHaveLength(0);

    // Seed a synthetic pre-authorized account directly so the disabled-login
    // assertion below exercises a real, otherwise-loginable account.
    const passwordHash = await hashPassword(password);
    const userResult = await cleanupClient.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [email, "Integration User", passwordHash],
    );
    const organizationResult = await cleanupClient.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [organizationName, `integration-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`],
    );
    await cleanupClient.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organizationResult.rows[0]!.id, userResult.rows[0]!.id],
    );

    const passwordLogin = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify({ email, password }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });

    expect(passwordLogin.status).toBe(503);
    await expect(passwordLogin.json()).resolves.toMatchObject({ error: "PASSWORD_LOGIN_DISABLED" });
    expect(passwordLogin.headers.get("set-cookie")).toBeNull();

    const noSessionCreated = await cleanupClient.query(
      "SELECT count(*)::text AS sessions FROM auth_sessions WHERE user_id = $1",
      [userResult.rows[0]!.id],
    );
    expect(noSessionCreated.rows[0]).toEqual({ sessions: "0" });
  });
});

const googleOrigin = "https://micro-app.example";
const googleEmail = `google-integration-${crypto.randomUUID()}@example.test`;
const bootstrapOrgName = `Bootstrap Shop ${crypto.randomUUID()}`;
const bootstrapOrgSlug = `bootstrap-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
const bootstrapToken = `test-bootstrap-${crypto.randomUUID()}`;

const googleEnv = {
  DATABASE_URL: databaseUrl,
  FRONTEND_ORIGIN: googleOrigin,
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_REDIRECT_URI: "https://api.example/auth/google/callback",
  BOOTSTRAP_TOKEN: bootstrapToken,
};

function extractCookiePairs(response: Response): Record<string, string> {
  const pairs: Record<string, string> = {};
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [name, value] = pair!.split("=");
    if (name && value !== undefined) pairs[name] = value;
  }
  return pairs;
}

async function startGoogleFlow(extraQuery = ""): Promise<{ cookieHeader: string; state: string }> {
  const startResponse = await app.fetch(
    new Request(`https://api.example/auth/google${extraQuery}`),
    googleEnv,
  );
  expect(startResponse.status).toBe(302);
  const cookies = extractCookiePairs(startResponse);
  expect(cookies.microapp_oauth_state).toBeTruthy();
  expect(cookies.microapp_oauth_verifier).toBeTruthy();
  const cookieHeader = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  return { cookieHeader, state: cookies.microapp_oauth_state! };
}

const suiteGoogle = describe.skipIf(!databaseAvailable)("Google OAuth routes against PostgreSQL", () => {
  let cleanupClient: Client;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    cleanupClient = new Client({ connectionString: databaseUrl });
    await cleanupClient.connect();
  });

  afterAll(async () => {
    await cleanupClient.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM app_users WHERE email = $1)", [googleEmail]);
    await cleanupClient.query("DELETE FROM organization_members WHERE user_id IN (SELECT id FROM app_users WHERE email = $1)", [googleEmail]);
    await cleanupClient.query("DELETE FROM app_users WHERE email = $1", [googleEmail]);
    // auth_bootstrap still references the organization this test's bootstrap
    // run created (ON DELETE RESTRICT by design, so a sealed bootstrap can
    // never be silently orphaned in production). Reset the singleton sentinel
    // back to its unconsumed state before the organization can be deleted,
    // so later re-runs of this suite against a long-lived database exercise
    // the bootstrap path again instead of immediately finding it sealed.
    await cleanupClient.query(
      "UPDATE auth_bootstrap SET consumed_at = NULL, consumed_by_email = NULL, created_organization_id = NULL WHERE id = true AND created_organization_id IN (SELECT id FROM organizations WHERE name = $1)",
      [bootstrapOrgName],
    );
    await cleanupClient.query("DELETE FROM organizations WHERE name = $1", [bootstrapOrgName]);
    await cleanupClient.query("DELETE FROM auth_allowlist WHERE lower(email) = lower($1)", [googleEmail]);
    await cleanupClient.end();
  });

  function mockGoogleIdentity(sub: string, emailVerified: boolean): void {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "mock-access-token" }), { status: 200 });
      }
      if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
        return new Response(JSON.stringify({ sub, email: googleEmail, email_verified: emailVerified, name: "Google Test User" }), { status: 200 });
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });
  }

  async function loginGoogleSession(): Promise<string> {
    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-bootstrap-owner", true);
    try {
      const callback = await app.fetch(new Request(
        `https://api.example/auth/google/callback?code=test-code&state=${state}`,
        { headers: { Cookie: cookieHeader } },
      ), googleEnv);
      expect(callback.status).toBe(302);
      expect(callback.headers.get("location")).toBe(`${googleOrigin}/`);
      const token = extractCookiePairs(callback).microapp_session;
      expect(token).toBeTruthy();
      return token!;
    } finally {
      fetchSpy.mockRestore();
    }
  }

  async function hashSessionToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  it("denies an email that is not on the allowlist, without creating any identity", async () => {
    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-not-allowlisted", true);

    const callback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${state}`,
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toContain("auth_error=not_allowlisted");
    const user = await cleanupClient.query("SELECT 1 FROM app_users WHERE email = $1", [googleEmail]);
    expect(user.rows).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("does not implicitly link an existing allowlisted account without a Google subject", async () => {
    await cleanupClient.query(
      "INSERT INTO auth_allowlist (email, added_by) VALUES ($1, 'integration-test')",
      [googleEmail],
    );
    const passwordHash = await hashPassword(password);
    const userResult = await cleanupClient.query<{ id: string }>(
      "INSERT INTO app_users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [googleEmail, "Legacy Account", passwordHash],
    );
    const organizationResult = await cleanupClient.query<{ id: string }>(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [bootstrapOrgName, bootstrapOrgSlug],
    );
    await cleanupClient.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organizationResult.rows[0]!.id, userResult.rows[0]!.id],
    );

    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-unlinked-legacy-account", true);
    const callback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${state}`,
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toContain("auth_error=account_link_required");
    expect(extractCookiePairs(callback).microapp_session).toBeUndefined();

    const persistedUser = await cleanupClient.query<{ google_sub: string | null }>(
      "SELECT google_sub FROM app_users WHERE id = $1",
      [userResult.rows[0]!.id],
    );
    expect(persistedUser.rows).toEqual([{ google_sub: null }]);
    const sessions = await cleanupClient.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM auth_sessions WHERE user_id = $1",
      [userResult.rows[0]!.id],
    );
    expect(sessions.rows[0]).toEqual({ total: "0" });

    fetchSpy.mockRestore();
    await cleanupClient.query("DELETE FROM auth_sessions WHERE user_id = $1", [userResult.rows[0]!.id]);
    await cleanupClient.query("DELETE FROM organization_members WHERE user_id = $1", [userResult.rows[0]!.id]);
    await cleanupClient.query("DELETE FROM organizations WHERE id = $1", [organizationResult.rows[0]!.id]);
    await cleanupClient.query("DELETE FROM app_users WHERE id = $1", [userResult.rows[0]!.id]);
    await cleanupClient.query("DELETE FROM auth_allowlist WHERE lower(email) = lower($1)", [googleEmail]);
  });

  it("rejects a callback whose state cookie does not match the query parameter", async () => {
    const { cookieHeader } = await startGoogleFlow();
    mockGoogleIdentity("sub-mismatch", true);

    const callback = await app.fetch(new Request(
      "https://api.example/auth/google/callback?code=test-code&state=not-the-real-state",
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toContain("auth_error=oauth_failed");
    fetchSpy.mockRestore();
  });

  it("runs the one-time bootstrap exactly once, then seals it even with the correct token", async () => {
    await cleanupClient.query(
      "INSERT INTO auth_allowlist (email, added_by) VALUES ($1, 'integration-test')",
      [googleEmail],
    );

    const bootstrapQuery = `?bootstrap_token=${encodeURIComponent(bootstrapToken)}&org_name=${encodeURIComponent(bootstrapOrgName)}&org_slug=${encodeURIComponent(bootstrapOrgSlug)}`;
    const { cookieHeader, state } = await startGoogleFlow(bootstrapQuery);
    mockGoogleIdentity("sub-bootstrap-owner", true);

    const callback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${state}`,
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(`${googleOrigin}/`);
    const sessionCookies = extractCookiePairs(callback);
    expect(sessionCookies.microapp_session).toBeTruthy();
    fetchSpy.mockRestore();

    const owner = await cleanupClient.query<{ role: string }>(
      `SELECT m.role FROM organization_members m
         JOIN app_users u ON u.id = m.user_id
         JOIN organizations o ON o.id = m.organization_id
        WHERE u.email = $1 AND o.name = $2`,
      [googleEmail, bootstrapOrgName],
    );
    expect(owner.rows).toEqual([{ role: "owner" }]);

    const bootstrapRow = await cleanupClient.query<{ consumed_at: string | null }>(
      "SELECT consumed_at FROM auth_bootstrap WHERE id = true",
    );
    expect(bootstrapRow.rows[0]!.consumed_at).not.toBeNull();

    // A second, independent allowlisted identity must not be able to reuse the bootstrap.
    const secondEmail = `google-second-${crypto.randomUUID()}@example.test`;
    await cleanupClient.query("INSERT INTO auth_allowlist (email, added_by) VALUES ($1, 'integration-test')", [secondEmail]);
    const secondOrgName = `Second Shop ${crypto.randomUUID()}`;
    const secondQuery = `?bootstrap_token=${encodeURIComponent(bootstrapToken)}&org_name=${encodeURIComponent(secondOrgName)}&org_slug=second-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const second = await startGoogleFlow(secondQuery);
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "mock-access-token" }), { status: 200 });
      if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
        return new Response(JSON.stringify({ sub: "sub-second-user", email: secondEmail, email_verified: true, name: "Second User" }), { status: 200 });
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    });
    const secondCallback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${second.state}`,
      { headers: { Cookie: second.cookieHeader } },
    ), googleEnv);
    expect(secondCallback.status).toBe(302);
    expect(secondCallback.headers.get("location")).toContain("auth_error=bootstrap_consumed");
    fetchSpy.mockRestore();
    await cleanupClient.query("DELETE FROM auth_allowlist WHERE lower(email) = lower($1)", [secondEmail]);
    await cleanupClient.query("DELETE FROM organizations WHERE name = $1", [secondOrgName]);
  });

  it("logs an existing allowlisted, active member back in without creating a second user row", async () => {
    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-bootstrap-owner", true);

    const callback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${state}`,
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(`${googleOrigin}/`);
    const sessionCookies = extractCookiePairs(callback);
    expect(sessionCookies.microapp_session).toBeTruthy();
    fetchSpy.mockRestore();

    const users = await cleanupClient.query("SELECT count(*)::text AS total FROM app_users WHERE email = $1", [googleEmail]);
    expect(users.rows[0]).toEqual({ total: "1" });
  });

  it("rejects a Google subject that does not match the subject already linked to the email", async () => {
    const before = await cleanupClient.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM auth_sessions WHERE user_id = (SELECT id FROM app_users WHERE lower(email) = lower($1))",
      [googleEmail],
    );
    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-attacker-different-account", true);
    try {
      const callback = await app.fetch(new Request(
        `https://api.example/auth/google/callback?code=test-code&state=${state}`,
        { headers: { Cookie: cookieHeader } },
      ), googleEnv);
      expect(callback.status).toBe(302);
      expect(callback.headers.get("location")).toContain("auth_error=identity_mismatch");
      expect(extractCookiePairs(callback).microapp_session).toBeUndefined();
    } finally {
      fetchSpy.mockRestore();
    }
    const after = await cleanupClient.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM auth_sessions WHERE user_id = (SELECT id FROM app_users WHERE lower(email) = lower($1))",
      [googleEmail],
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("rejects an expired session at /auth/me", async () => {
    const token = await loginGoogleSession();
    const tokenHash = await hashSessionToken(token);
    await cleanupClient.query(
      "UPDATE auth_sessions SET expires_at = now() - interval '1 minute' WHERE token_hash = $1",
      [tokenHash],
    );

    const response = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: `microapp_session=${token}` },
    }), googleEnv);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "UNAUTHENTICATED" });
  });

  it("rejects a revoked session at /auth/me after logout", async () => {
    const token = await loginGoogleSession();
    const tokenHash = await hashSessionToken(token);
    const logout = await app.fetch(new Request("https://api.example/auth/logout", {
      method: "POST",
      headers: { Origin: googleOrigin, Cookie: `microapp_session=${token}` },
    }), googleEnv);
    expect(logout.status).toBe(204);

    const persisted = await cleanupClient.query<{ revoked: boolean }>(
      "SELECT revoked_at IS NOT NULL AS revoked FROM auth_sessions WHERE token_hash = $1",
      [tokenHash],
    );
    expect(persisted.rows).toEqual([{ revoked: true }]);

    const response = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: `microapp_session=${token}` },
    }), googleEnv);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "UNAUTHENTICATED" });
  });

  it("rejects a session when its only organization membership is inactive", async () => {
    const token = await loginGoogleSession();
    await cleanupClient.query(
      `UPDATE organization_members SET is_active = false
        WHERE user_id = (SELECT id FROM app_users WHERE lower(email) = lower($1))
          AND organization_id = (SELECT id FROM organizations WHERE name = $2)`,
      [googleEmail, bootstrapOrgName],
    );
    try {
      const response = await app.fetch(new Request("https://api.example/auth/me", {
        headers: { Cookie: `microapp_session=${token}` },
      }), googleEnv);
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "UNAUTHENTICATED" });
    } finally {
      await cleanupClient.query(
        `UPDATE organization_members SET is_active = true
          WHERE user_id = (SELECT id FROM app_users WHERE lower(email) = lower($1))
            AND organization_id = (SELECT id FROM organizations WHERE name = $2)`,
        [googleEmail, bootstrapOrgName],
      );
    }
  });

  it("rejects a session when its only organization is inactive", async () => {
    const token = await loginGoogleSession();
    await cleanupClient.query("UPDATE organizations SET is_active = false WHERE name = $1", [bootstrapOrgName]);
    try {
      const response = await app.fetch(new Request("https://api.example/auth/me", {
        headers: { Cookie: `microapp_session=${token}` },
      }), googleEnv);
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "UNAUTHENTICATED" });
    } finally {
      await cleanupClient.query("UPDATE organizations SET is_active = true WHERE name = $1", [bootstrapOrgName]);
    }
  });

  it("does not expose a different user's tenant membership in /auth/me", async () => {
    const token = await loginGoogleSession();
    const otherEmail = `other-tenant-${crypto.randomUUID()}@example.test`;
    const otherOrgName = `Other Tenant ${crypto.randomUUID()}`;
    const otherPasswordHash = await hashPassword(`other-tenant-password-${crypto.randomUUID()}`);
    let otherUserId: string | undefined;
    let otherOrganizationId: string | undefined;
    try {
      const user = await cleanupClient.query<{ id: string }>(
        "INSERT INTO app_users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [otherEmail, "Other Tenant User", otherPasswordHash],
      );
      otherUserId = user.rows[0]!.id;
      const org = await cleanupClient.query<{ id: string }>(
        "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
        [otherOrgName, `other-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`],
      );
      otherOrganizationId = org.rows[0]!.id;
      await cleanupClient.query(
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
        [otherOrganizationId, otherUserId],
      );

      const response = await app.fetch(new Request("https://api.example/auth/me", {
        headers: { Cookie: `microapp_session=${token}` },
      }), googleEnv);
      expect(response.status).toBe(200);
      const payload = await response.json() as { organizations: Array<{ name: string }> };
      expect(payload.organizations.map((organization) => organization.name)).toEqual([bootstrapOrgName]);
      expect(payload.organizations.some((organization) => organization.name === otherOrgName)).toBe(false);
    } finally {
      if (otherUserId) {
        await cleanupClient.query("DELETE FROM organization_members WHERE user_id = $1", [otherUserId]);
        await cleanupClient.query("DELETE FROM auth_sessions WHERE user_id = $1", [otherUserId]);
        await cleanupClient.query("DELETE FROM app_users WHERE id = $1", [otherUserId]);
      }
      if (otherOrganizationId) {
        await cleanupClient.query("DELETE FROM organizations WHERE id = $1", [otherOrganizationId]);
      }
    }
  });

  it("denies an existing user whose account has been deactivated", async () => {
    await cleanupClient.query("UPDATE app_users SET is_active = false WHERE email = $1", [googleEmail]);
    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-bootstrap-owner", true);

    const callback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${state}`,
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toContain("auth_error=account_inactive");
    fetchSpy.mockRestore();
    await cleanupClient.query("UPDATE app_users SET is_active = true WHERE email = $1", [googleEmail]);
  });

  it("denies a Google identity whose email_verified claim is false", async () => {
    const { cookieHeader, state } = await startGoogleFlow();
    mockGoogleIdentity("sub-unverified", false);

    const callback = await app.fetch(new Request(
      `https://api.example/auth/google/callback?code=test-code&state=${state}`,
      { headers: { Cookie: cookieHeader } },
    ), googleEnv);

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toContain("auth_error=email_not_verified");
    fetchSpy.mockRestore();
  });
});

void suite;
