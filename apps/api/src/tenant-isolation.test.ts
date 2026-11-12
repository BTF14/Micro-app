import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "./database";
import { authorizeBranchOperation, authorizeTenantOperation } from "./authorization";
import { resolveTenantContext } from "./tenant-context";
import { Hono } from "hono";
import type { Bindings } from "./bindings";
import { clearSessionCookie } from "./auth";
import app from "./index";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const branchOne = "33333333-3333-4333-8333-333333333333";
const branchTwo = "44444444-4444-4444-8444-444444444444";
const cashierA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const cashierB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const tokenA = "synthetic-session-token-A";
const tokenB = "synthetic-session-token-B";

type Row = Record<string, unknown>;

function clientWith(queryImpl: (sql: string, values?: unknown[]) => Promise<{ rows: Row[] }>) {
  const query = vi.fn(queryImpl);
  const client = { connect: vi.fn(), query, end: vi.fn() } as unknown as DatabaseClient;
  return { client, query };
}

describe("tenant and branch isolation authorization boundary", () => {
  it.each([
    ["inventory read", "inventory.read"],
    ["sales checkout mutation", "sales.create_list_price"],
  ])("denies Tenant A session selecting Tenant B before %s can reach business SQL", async (_label, operation) => {
    const { client, query } = clientWith(async (sql, values) => {
      if (sql.includes("public.lock_tenant_context")) {
        // The authenticated token is a Tenant A member only. The request selector is Tenant B.
        expect(values?.[1]).toBe(tenantB);
        return { rows: [] };
      }
      throw new Error("Business SQL must not execute after tenant resolution fails");
    });

    const result = await authorizeBranchOperation(
      client, tokenA, tenantB, branchTwo, operation,
    );

    expect(result).toEqual({ allowed: false, reason: "unauthenticated_or_out_of_scope" });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toContain("public.lock_tenant_context");
  });

  it("denies a cashier assigned to Branch 1 when requesting Branch 2 inventory", async () => {
    const { client, query } = clientWith(async (sql) => {
      if (sql.includes("public.lock_tenant_context")) {
        return { rows: [{ user_id: cashierA, organization_id: tenantA, role: "cashier" }] };
      }
      if (sql.includes("public.lock_branch_scopes")) {
        return { rows: [{ locked: false }] }; // no active Branch 2 membership
      }
      throw new Error("Branch 2 business SQL must not execute");
    });

    const result = await authorizeBranchOperation(
      client, tokenA, tenantA, branchTwo, "inventory.read",
    );

    expect(result).toEqual({ allowed: false, reason: "branch_out_of_scope" });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[0]).toContain("public.lock_branch_scopes");
  });

  it("denies a cashier from Branch 1 attempting to close a Branch 2 open cash shift", async () => {
    const { client, query } = clientWith(async (sql, values) => {
      if (sql.includes("public.lock_tenant_context")) {
        expect(values?.[1]).toBe(tenantA);
        return { rows: [{ user_id: cashierA, organization_id: tenantA, role: "cashier" }] };
      }
      if (sql.includes("public.lock_branch_scopes")) {
        expect(values?.[1]).toEqual([branchTwo]);
        expect(values?.[2]).toEqual([branchTwo]);
        expect(values?.[3]).toEqual([cashierA]);
        return { rows: [{ locked: false }] };
      }
      throw new Error("close_register_shift or shift lookup must not execute");
    });

    const result = await authorizeBranchOperation(
      client, tokenA, tenantA, branchTwo, "register.shift.close_own",
    );

    expect(result).toEqual({ allowed: false, reason: "branch_out_of_scope" });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("does not grant a cashier access to another tenant even if the requested branch ID is valid", async () => {
    const { client, query } = clientWith(async (sql) => {
      if (sql.includes("public.lock_tenant_context")) return { rows: [] };
      throw new Error("No branch or business lookup is allowed for an out-of-tenant request");
    });

    await expect(authorizeBranchOperation(
      client, tokenA, tenantB, branchOne, "register.shift.read_own",
    )).resolves.toEqual({ allowed: false, reason: "unauthenticated_or_out_of_scope" });
    expect(query).toHaveBeenCalledOnce();
  });

  it("keeps concurrent tenant contexts isolated to their own request-scoped database clients", async () => {
    const makeTenantClient = (token: string, organizationId: string, userId: string) =>
      clientWith(async (sql, values) => {
        if (!sql.includes("public.lock_tenant_context")) throw new Error("Unexpected cross-request query");
        expect(values?.[1]).toBe(organizationId);
        expect(values?.[0]).not.toBe(token); // only the SHA-256 token hash reaches SQL
        return { rows: [{ user_id: userId, organization_id: organizationId, role: "owner" }] };
      });

    const first = makeTenantClient(tokenA, tenantA, cashierA);
    const second = makeTenantClient(tokenB, tenantB, cashierB);

    const [a, b] = await Promise.all([
      authorizeTenantOperation(first.client, tokenA, tenantA, "catalog.read"),
      authorizeTenantOperation(second.client, tokenB, tenantB, "catalog.read"),
    ]);

    expect(a).toMatchObject({ allowed: true, context: { organizationId: tenantA, userId: cashierA } });
    expect(b).toMatchObject({ allowed: true, context: { organizationId: tenantB, userId: cashierB } });
    expect(first.query).toHaveBeenCalledOnce();
    expect(second.query).toHaveBeenCalledOnce();
  });

  it("requires active session, membership, organization and requested tenant in the unlocked resolver query", async () => {
    const { client, query } = clientWith(async () => ({
      rows: [{ user_id: cashierA, organization_id: tenantA, role: "cashier" }],
    }));

    const result = await resolveTenantContext(client, tokenA, tenantA, false);

    expect(result).toEqual({ userId: cashierA, organizationId: tenantA, role: "cashier" });
    const sql = query.mock.calls[0]?.[0] ?? "";
    expect(sql).toContain("s.revoked_at IS NULL");
    expect(sql).toContain("s.expires_at > now()");
    expect(sql).toContain("u.is_active = true");
    expect(sql).toContain("m.is_active = true");
    expect(sql).toContain("o.is_active = true");
    expect(sql).toContain("o.id = $2");
    expect(query.mock.calls[0]?.[1]?.[1]).toBe(tenantA);
  });
});


describe("invalid session cookie handling on protected routes", () => {
  it.each([
    ["/api/orgs/" + tenantA + "/branches/" + branchOne + "/warehouses/" + "55555555-5555-4555-8555-555555555555" + "/inventory", "inventory"],
    ["/api/orgs/" + tenantA + "/branches/" + branchOne + "/register-shifts/current", "register shifts"],
  ])("clears an absent/invalid session cookie and disables shared caching for %s", async (path) => {
    const response = await app.fetch(
      new Request("https://api.example" + path, { headers: { Cookie: "microapp_session=" + "x".repeat(129) } }),
      { FRONTEND_ORIGIN: "https://frontend.example" } as Bindings,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Set-Cookie")).toContain("microapp_session=");
    expect(response.headers.get("Set-Cookie")).toMatch(/Max-Age=0|Expires=/i);
  });

  it("uses matching secure cookie attributes when clearing an HTTPS session", async () => {
    const cookieApp = new Hono<{ Bindings: Bindings }>();
    cookieApp.get("/clear", (c) => {
      clearSessionCookie(c);
      return c.body(null, 204);
    });

    const response = await cookieApp.request("https://api.example/clear", {}, {} as Bindings);
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("microapp_session=");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=None");
    expect(cookie).toMatch(/Max-Age=0|Expires=/i);
  });
});
