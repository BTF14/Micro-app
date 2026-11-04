import { describe, expect, it } from "vitest";
import { authorizeBranchOperation, authorizeCommercialOperation, authorizeTenantOperation, isCommercialOperationAllowed } from "./authorization";
import type { DatabaseClient } from "./database";
import type { OrganizationRole } from "./tenant-context";

const roles: OrganizationRole[] = ["owner", "admin", "inventory", "cashier"];

describe("commercial role authorization", () => {
  it("allows catalog reads for every role but exposes cost capability only to owner/admin", () => {
    for (const role of roles) {
      expect(isCommercialOperationAllowed(role, "catalog.read")).toBe(true);
    }
    expect(isCommercialOperationAllowed("owner", "catalog.read_costs")).toBe(true);
    expect(isCommercialOperationAllowed("admin", "catalog.read_costs")).toBe(true);
    expect(isCommercialOperationAllowed("inventory", "catalog.read_costs")).toBe(false);
    expect(isCommercialOperationAllowed("cashier", "catalog.read_costs")).toBe(false);
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

  it("allows only own-shift cashier operations and blocks supervisor exceptions", () => {
    expect(isCommercialOperationAllowed("cashier", "register.shift.open_own")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "register.shift.close_own")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "register.shift.operate_own")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "register.shift.read_own")).toBe(true);
    expect(isCommercialOperationAllowed("cashier", "register.shift.read_all")).toBe(false);
    expect(isCommercialOperationAllowed("owner", "register.shift.read_all")).toBe(true);
    expect(isCommercialOperationAllowed("admin", "register.shift.read_all")).toBe(true);
  });

  it("requires owner/admin for discounts and price overrides; cashier can void only own open-shift sale", () => {
    for (const operation of ["sales.discount.apply", "sales.discount.approve", "sales.price.override"] as const) {
      expect(isCommercialOperationAllowed("owner", operation)).toBe(true);
      expect(isCommercialOperationAllowed("admin", operation)).toBe(true);
      expect(isCommercialOperationAllowed("cashier", operation)).toBe(false);
      expect(isCommercialOperationAllowed("inventory", operation)).toBe(false);
    }
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
      rows: sql.includes("auth_sessions")
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
      rows: sql.includes("auth_sessions")
        ? [{ user_id: userId, organization_id: organizationId, role: "inventory" as const }]
        : [{ user_id: userId, organization_id: organizationId, branch_id: branchId, role: "inventory" as const }],
    });
    const client = { connect: async () => {}, query, end: async () => {} } as unknown as DatabaseClient;

    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "inventory.adjust"))
      .resolves.toMatchObject({ allowed: true, context: { userId, organizationId, branchId } });
    await expect(authorizeBranchOperation(client, sessionToken, organizationId, branchId, "sales.create_list_price"))
      .resolves.toEqual({ allowed: false, reason: "operation_denied" });
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
