import { describe, expect, it } from "vitest";
import { authorizeBranchOperation, authorizeCommercialOperation, authorizeTenantOperation, isCommercialOperationAllowed } from "./authorization";
import type { DatabaseClient } from "./database";
import type { OrganizationRole } from "./tenant-context";

const roles: OrganizationRole[] = ["owner", "admin", "inventory", "cashier"];

describe("commercial role authorization", () => {
  it("allows catalog reads for every role and cost reads for owner/admin/inventory", () => {
    for (const role of roles) {
      expect(isCommercialOperationAllowed(role, "catalog.read")).toBe(true);
    }
    expect(isCommercialOperationAllowed("owner", "catalog.read_costs")).toBe(true);
    expect(isCommercialOperationAllowed("admin", "catalog.read_costs")).toBe(true);
    expect(isCommercialOperationAllowed("inventory", "catalog.read_costs")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "catalog.read_costs")).toBe(false);
  });

  it("keeps inventory metadata reads restricted to inventory operators", () => {
    for (const role of ["owner", "admin", "inventory"] as const) {
      expect(isCommercialOperationAllowed(role, "inventory.management.read")).toBe(true);
    }
    expect(isCommercialOperationAllowed("cashier", "inventory.management.read")).toBe(false);
  });

  it("keeps inventory operations away from cashiers and limits inventory role to its approved duties", () => {
    for (const operation of ["inventory.read", "inventory.receive", "inventory.adjust", "inventory.transfer"] as const) {
      expect(isCommercialOperationAllowed("inventory", operation)).toBe(true);
      expect(isCommercialOperationAllowed("cashier", operation)).toBe(operation === "inventory.read");
    }
    expect(isCommercialOperationAllowed("inventory", "catalog.read")).toBe(true);
    expect(isCommercialOperationAllowed("inventory", "catalog.product.manage")).toBe(false);
    expect(isCommercialOperationAllowed("inventory", "sales.create_list_price")).toBe(false);
  });

  it("allows owner/admin/cashier to operate only their own shifts and keeps inventory excluded", () => {
    for (const role of ["owner", "admin", "cashier"] as const) {
      expect(isCommercialOperationAllowed(role, "register.shift.open_own")).toBe(true);
      expect(isCommercialOperationAllowed(role, "register.shift.close_own")).toBe(true);
      expect(isCommercialOperationAllowed(role, "register.shift.operate_own")).toBe(true);
    }
    expect(isCommercialOperationAllowed("cashier", "register.shift.read_own")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "register.shift.read_all")).toBe(false);
    expect(isCommercialOperationAllowed("owner", "register.shift.read_all")).toBe(true);
    expect(isCommercialOperationAllowed("admin", "register.shift.read_all")).toBe(true);
    expect(isCommercialOperationAllowed("inventory", "register.shift.open_own")).toBe(false);
    expect(isCommercialOperationAllowed("inventory", "register.shift.operate_own")).toBe(false);
  });

  it("rejects all discount operations because discounts are not part of the product", () => {
    for (const role of roles) {
      expect(authorizeCommercialOperation(role, "sales.discount.apply")).toBe(false);
      expect(authorizeCommercialOperation(role, "sales.discount.approve")).toBe(false);
    }
    expect(isCommercialOperationAllowed("owner", "sales.price.override")).toBe(true);
    expect(isCommercialOperationAllowed("admin", "sales.price.override")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "sales.price.override")).toBe(false);
    expect(isCommercialOperationAllowed("inventory", "sales.price.override")).toBe(false);
    expect(isCommercialOperationAllowed("cashier", "sales.void_own_open_shift")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "sales.void_after_shift")).toBe(false);
    expect(isCommercialOperationAllowed("cashier", "sales.void_other")).toBe(false);
    expect(isCommercialOperationAllowed("admin", "sales.void_after_shift")).toBe(true);
  });

  it("reserves member and policy management for owner", () => {
    for (const operation of ["members.manage", "branch_memberships.manage", "organization_policy.manage"] as const) {
      expect(isCommercialOperationAllowed("owner", operation)).toBe(true);
      expect(isCommercialOperationAllowed("admin", operation)).toBe(false);
      expect(isCommercialOperationAllowed("inventory", operation)).toBe(false);
      expect(isCommercialOperationAllowed("cashier", operation)).toBe(false);
    }
  });

  it("fails closed for unknown operations and forged runtime roles", () => {
    expect(authorizeCommercialOperation("cashier", "sales.refund_any")).toBe(false);
    expect(authorizeCommercialOperation("superuser", "catalog.read")).toBe(false);
  });
});

describe("authorization context boundaries", () => {
  const sessionToken = "synthetic-session-token";
  const organizationId = "11111111-2222-4333-8444-555555555555";
  const branchId = "99999999-8888-4777-8666-555555555555";
  const userId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  it("resolves tenant identity from the session and denies a role without the operation", async () => {
    const query = async (sql: string) => ({
      rows: sql.includes("public.lock_tenant_context")
        ? [{ user_id: userId, organization_id: organizationId, role: "cashier" as const }]
        : [],
    });
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeTenantOperation(client, sessionToken, organizationId, "catalog.read"))
      .resolves.toMatchObject({ allowed: true, context: { userId, organizationId, role: "cashier" } });
    await expect(authorizeTenantOperation(client, sessionToken, organizationId, "catalog.read_costs"))
      .resolves.toEqual({ allowed: false, reason: "operation_denied" });
  });

  it("requires server-validated branch scope before granting a branch operation", async () => {
    const query = async (sql: string) => ({
      rows: sql.includes("public.lock_tenant_context")
        ? [{ user_id: userId, organization_id: organizationId, role: "inventory" as const }]
        : sql.includes("public.lock_branch_scopes")
          ? [{ locked: true }]
          : [{ user_id: userId, organization_id: organizationId, branch_id: branchId, role: "inventory" as const }],
    });
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.adjust"))
      .resolves.toMatchObject({ allowed: true, context: { userId, organizationId, branchId } });
    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "sales.create_list_price"))
      .resolves.toEqual({ allowed: false, reason: "operation_denied" });
  });

  it("locks tenant identity and membership before locking the requested branch scope", async () => {
    const queries: string[] = [];
    const query = async (sql: string) => {
      queries.push(sql);
      if (sql.includes("public.lock_tenant_context")) {
        return { rows: [{ user_id: userId, organization_id: organizationId, role: "inventory" as const }] };
      }
      if (sql.includes("public.lock_branch_scopes")) {
        return { rows: [{ locked: true }] };
      }
      return { rows: [{ user_id: userId, organization_id: organizationId, branch_id: branchId, role: "inventory" as const }] };
    };
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.adjust"))
      .resolves.toMatchObject({ allowed: true });
    expect(queries[0]).toContain("public.lock_tenant_context");
    expect(queries[1]).toContain("public.lock_branch_scopes");
    expect(queries[2]).toContain("FROM branches b");
  });

  it("denies an unauthorized role before resolving branch membership", async () => {
    const queries: string[] = [];
    const query = async (sql: string) => {
      queries.push(sql);
      return { rows: [{ user_id: userId, organization_id: organizationId, role: "cashier" as const }] };
    };
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.adjust"))
      .resolves.toEqual({ allowed: false, reason: "operation_denied" });
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain("public.lock_tenant_context");
  });

  it("distinguishes a valid tenant with no access to the requested branch", async () => {
    const query = async (sql: string) => ({
      rows: sql.includes("public.lock_tenant_context")
        ? [{ user_id: userId, organization_id: organizationId, role: "inventory" as const }]
        : [],
    });
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.adjust"))
      .resolves.toEqual({ allowed: false, reason: "branch_out_of_scope" });
  });

  it("supports read-only authorization without acquiring write-path row locks", async () => {
    const queries: string[] = [];
    const query = async (sql: string) => {
      queries.push(sql);
      if (sql.includes("auth_sessions")) {
        return { rows: [{ user_id: userId, organization_id: organizationId, role: "inventory" as const }] };
      }
      return { rows: [{ user_id: userId, organization_id: organizationId, branch_id: branchId, role: "inventory" as const }] };
    };
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.management.read", false))
      .resolves.toMatchObject({ allowed: true, context: { organizationId, branchId } });
    expect(queries).toHaveLength(2);
    expect(queries.every((sql) => !sql.includes("FOR SHARE"))).toBe(true);
  });

  it("fails closed when tenant or branch resolution fails", async () => {
    const client = {
      connect: async () => {},
      query: async () => ({ rows: [] }),
      end: async () => {},
    } as unknown as DatabaseClient;

    await expect(authorizeTenantOperation(client, undefined, organizationId, "catalog.read"))
      .resolves.toEqual({ allowed: false, reason: "unauthenticated_or_out_of_scope" });
    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.read"))
      .resolves.toEqual({ allowed: false, reason: "unauthenticated_or_out_of_scope" });
  });
});
