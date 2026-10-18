import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

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

  it("registers atomically, rejects duplicate email, logs in, reads and revokes the session", async () => {
    const originHeaders = {
      Origin: frontendOrigin,
      "Content-Type": "application/json",
    };
    const registerBody = {
      email,
      displayName: "Integration User",
      password,
      organizationName,
    };

    const registerResponse = await app.fetch(new Request("https://api.example/auth/register", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify(registerBody),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });

    expect(registerResponse.status).toBe(201);
    const registered = await registerResponse.json() as {
      user: { id: string; email: string };
      organizations: Array<{ id: string; role: string }>;
    };
    expect(registered.user.email).toBe(email);
    expect(registered.organizations).toHaveLength(1);
    expect(registered.organizations[0]?.role).toBe("owner");
    const registrationCookie = registerResponse.headers.get("set-cookie");
    expect(registrationCookie).toContain("microapp_session=");
    expect(registrationCookie).toContain("HttpOnly");
    expect(registrationCookie).toContain("Secure");
    expect(registrationCookie).toContain("SameSite=None");
    expect(registrationCookie).toContain("Path=/");
    expect(registrationCookie).toContain("Max-Age=604800");

    const counts = await cleanupClient.query<{ users: string; orgs: string; members: string; sessions: string }>(
      `SELECT
         (SELECT count(*)::text FROM app_users WHERE email = $1) AS users,
         (SELECT count(*)::text FROM organizations o JOIN organization_members m ON m.organization_id = o.id WHERE m.user_id = (SELECT id FROM app_users WHERE email = $1)) AS orgs,
         (SELECT count(*)::text FROM organization_members WHERE user_id = (SELECT id FROM app_users WHERE email = $1)) AS members,
         (SELECT count(*)::text FROM auth_sessions WHERE user_id = (SELECT id FROM app_users WHERE email = $1)) AS sessions`,
      [email],
    );
    expect(counts.rows[0]).toEqual({ users: "1", orgs: "1", members: "1", sessions: "1" });

    const duplicateResponse = await app.fetch(new Request("https://api.example/auth/register", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify(registerBody),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(duplicateResponse.status).toBe(409);

    const badLogin = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify({ email, password: "incorrect-password" }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(badLogin.status).toBe(401);

    const staleRateLimitHash = "a".repeat(64);
    await cleanupClient.query(
      "INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at) VALUES ($1, now() - interval '2 days', 1, now() - interval '2 days') ON CONFLICT (key_hash) DO UPDATE SET updated_at = now() - interval '2 days'",
      [staleRateLimitHash],
    );

    const loginResponse = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify({ email, password }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    const staleRateLimit = await cleanupClient.query("SELECT 1 FROM auth_rate_limits WHERE key_hash = $1", [staleRateLimitHash]);
    expect(staleRateLimit.rows).toHaveLength(0);
    expect(loginResponse.status).toBe(200);
    const loginCookie = loginResponse.headers.get("set-cookie");
    expect(loginCookie).toContain("microapp_session=");
    const cookiePair = loginCookie!.split(";")[0]!;

    const meResponse = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: cookiePair },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(meResponse.status).toBe(200);
    const me = await meResponse.json() as { user: { email: string }; organizations: unknown[] };
    expect(me.user.email).toBe(email);
    expect(me.organizations).toHaveLength(1);

    await cleanupClient.query("UPDATE app_users SET is_active = false WHERE email = $1", [email]);
    const inactiveUserSession = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: cookiePair },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(inactiveUserSession.status).toBe(401);
    await cleanupClient.query("UPDATE app_users SET is_active = true WHERE email = $1", [email]);

    await cleanupClient.query("UPDATE organization_members SET is_active = false WHERE user_id = (SELECT id FROM app_users WHERE email = $1)", [email]);
    const noMembershipSession = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: cookiePair },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(noMembershipSession.status).toBe(401);
    expect(noMembershipSession.headers.get("set-cookie")).toContain("microapp_session=");

    const inactiveMembershipLogin = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify({ email, password }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(inactiveMembershipLogin.status).toBe(401);
    await cleanupClient.query("UPDATE organization_members SET is_active = true WHERE user_id = (SELECT id FROM app_users WHERE email = $1)", [email]);

    // An active membership must not keep access to an organization that has been disabled.
    await cleanupClient.query(
      "UPDATE organizations SET is_active = false WHERE id = (SELECT m.organization_id FROM organization_members m JOIN app_users u ON u.id = m.user_id WHERE u.email = $1)",
      [email],
    );
    const inactiveOrganizationSession = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: cookiePair },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(inactiveOrganizationSession.status).toBe(401);

    const inactiveOrganizationLogin = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify({ email, password }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(inactiveOrganizationLogin.status).toBe(401);

    await cleanupClient.query(
      "UPDATE organizations SET is_active = true WHERE id = (SELECT m.organization_id FROM organization_members m JOIN app_users u ON u.id = m.user_id WHERE u.email = $1)",
      [email],
    );

    const logoutResponse = await app.fetch(new Request("https://api.example/auth/logout", {
      method: "POST",
      headers: { Origin: frontendOrigin, Cookie: cookiePair },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(logoutResponse.status).toBe(204);

    const revokedSessionResponse = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: cookiePair },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(revokedSessionResponse.status).toBe(401);

    const secondLogin = await app.fetch(new Request("https://api.example/auth/login", {
      method: "POST",
      headers: { ...originHeaders, "CF-Connecting-IP": crypto.randomUUID() },
      body: JSON.stringify({ email, password }),
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(secondLogin.status).toBe(200);
    const secondCookie = secondLogin.headers.get("set-cookie")!.split(";")[0]!;
    const secondToken = secondCookie.slice("microapp_session=".length);
    const tokenDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secondToken));
    const tokenHash = Array.from(new Uint8Array(tokenDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await cleanupClient.query(
      "UPDATE auth_sessions SET created_at = now() - interval '2 days', expires_at = now() - interval '1 day' WHERE token_hash = $1",
      [tokenHash],
    );
    const expiredSessionResponse = await app.fetch(new Request("https://api.example/auth/me", {
      headers: { Cookie: secondCookie },
    }), { DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin });
    expect(expiredSessionResponse.status).toBe(401);
  });
});

void suite;
