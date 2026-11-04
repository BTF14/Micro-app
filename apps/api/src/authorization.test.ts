import { describe, expect, it } from "vitest";
import { authorizeCommercialOperation, isCommercialOperationAllowed } from "./authorization";
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
