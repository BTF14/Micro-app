import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "./database";
import { resolveTenantContext, type TenantContext } from "./tenant-context";

const sessionToken = "synthetic-session-token";
const organizationId = "11111111-2222-4333-8444-555555555555";
const userId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function makeClient(rows: Partial<TenantContext> & { user_id: string; organization_id: string; role: "owner" | "admin" | "cashier" | "inventory" }[] = []) {
  const query = vi.fn(async (_statement: string, _values?: unknown[]) => ({ rows }));
  return {
    client: { connect: vi.fn(), query, end: vi.fn() } as unknown as DatabaseClient,
    query,
  };
}

describe("resolveTenantContext", () => {
  it("resolves trusted identity and role only from the database membership row", async () => {
    const { client, query } = makeClient([
      { user_id: userId, organization_id: organizationId, role: "inventory" },
    ]);

    await expect(resolveTenantContext(client, sessionToken, organizationId)).resolves.toEqual({
      userId,
      organizationId,
      role: "inventory",
    });

    expect(query).toHaveBeenCalledOnce();
    const [statement, values] = query.mock.calls[0]!;
    expect(statement).toContain("s.revoked_at IS NULL");
    expect(statement).toContain("s.expires_at > now()");
    expect(statement).toContain("u.is_active = true");
    expect(statement).toContain("m.is_active = true");
    expect(statement).toContain("o.is_active = true");
    expect(statement).toContain("AND o.id = $2");
    expect(values?.[1]).toBe(organizationId);
    expect(values?.[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(values?.[0]).not.toBe(sessionToken);
  });

  it("does not query the database for missing, oversized, or malformed selectors", async () => {
    const { client, query } = makeClient();

    await expect(resolveTenantContext(client, undefined, organizationId)).resolves.toBeNull();
    await expect(resolveTenantContext(client, "x".repeat(129), organizationId)).resolves.toBeNull();
    await expect(resolveTenantContext(client, sessionToken, "not-a-uuid")).resolves.toBeNull();
    await expect(resolveTenantContext(client, sessionToken, undefined)).resolves.toBeNull();

    expect(query).not.toHaveBeenCalled();
  });

  it("returns null when the session has no active membership in the requested organization", async () => {
    const { client, query } = makeClient([]);

    await expect(resolveTenantContext(client, sessionToken, organizationId)).resolves.toBeNull();
    expect(query).toHaveBeenCalledOnce();
  });
});
