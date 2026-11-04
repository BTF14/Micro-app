import type { OrganizationRole } from "./tenant-context";

/**
 * Stable server-side operation keys from the owner-approved role matrix.
 *
 * This is deliberately only the role/capability decision. Resource ownership,
 * branch membership, open-shift state, field redaction, approval records,
 * transaction locking, and audit writes remain mandatory handler-level checks.
 * Never treat a successful result as proof that a resource is in scope.
 */
export type CommercialOperation =
  | "catalog.read"
  | "catalog.read_costs"
  | "catalog.product.manage"
  | "inventory.read"
  | "inventory.receive"
  | "inventory.adjust"
  | "inventory.transfer"
  | "register.shift.open_own"
  | "register.shift.close_own"
  | "register.shift.operate_own"
  | "register.shift.read_all"
  | "register.shift.read_own"
  | "sales.create_list_price"
  | "sales.discount.apply"
  | "sales.discount.approve"
  | "sales.price.override"
  | "sales.void_own_open_shift"
  | "sales.void_after_shift"
  | "sales.void_other"
  | "members.manage"
  | "branch_memberships.manage"
  | "organization_policy.manage"
  | "reports.sales.organization"
  | "reports.sales.own_shift"
  | "reports.inventory"
  | "exports.allowed_data"
  | "audit.read";

const ROLE_OPERATIONS: Readonly<Record<OrganizationRole, ReadonlySet<CommercialOperation>>> = {
  owner: new Set<CommercialOperation>([
    "catalog.read", "catalog.read_costs", "catalog.product.manage",
    "inventory.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own",
    "register.shift.read_all",
    "sales.create_list_price", "sales.discount.apply", "sales.discount.approve",
    "sales.price.override", "sales.void_own_open_shift", "sales.void_after_shift", "sales.void_other",
    "members.manage", "branch_memberships.manage", "organization_policy.manage",
    "reports.sales.organization", "reports.sales.own_shift", "reports.inventory",
    "exports.allowed_data", "audit.read",
  ]),
  admin: new Set<CommercialOperation>([
    "catalog.read", "catalog.read_costs", "catalog.product.manage",
    "inventory.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own",
    "register.shift.read_all",
    "sales.create_list_price", "sales.discount.apply", "sales.discount.approve",
    "sales.price.override", "sales.void_own_open_shift", "sales.void_after_shift", "sales.void_other",
    "reports.sales.organization", "reports.sales.own_shift", "reports.inventory",
    "exports.allowed_data", "audit.read",
  ]),
  inventory: new Set<CommercialOperation>([
    "catalog.read", "inventory.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "reports.inventory", "exports.allowed_data",
  ]),
  cashier: new Set<CommercialOperation>([
    "catalog.read", "inventory.read",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own",
    "register.shift.read_own",
    "sales.create_list_price", "sales.void_own_open_shift",
    "reports.sales.own_shift", "exports.allowed_data",
  ]),
};

/**
 * Evaluate only the role's approved capability for a named operation.
 * Unknown operation values fail closed. Scope/ownership checks are separate.
 */
export function isCommercialOperationAllowed(
  role: OrganizationRole,
  operation: CommercialOperation,
): boolean {
  return ROLE_OPERATIONS[role]?.has(operation) ?? false;
}

/** Convenience boundary for untrusted runtime operation strings. */
export function authorizeCommercialOperation(
  role: OrganizationRole,
  operation: string,
): boolean {
  if (!Object.hasOwn(ROLE_OPERATIONS, role)) return false;
  if (!isCommercialOperation(operation)) return false;
  return isCommercialOperationAllowed(role, operation);
}

function isCommercialOperation(value: string): value is CommercialOperation {
  return [
    "catalog.read", "catalog.read_costs", "catalog.product.manage",
    "inventory.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own",
    "register.shift.read_all", "register.shift.read_own",
    "sales.create_list_price", "sales.discount.apply", "sales.discount.approve",
    "sales.price.override", "sales.void_own_open_shift", "sales.void_after_shift", "sales.void_other",
    "members.manage", "branch_memberships.manage", "organization_policy.manage",
    "reports.sales.organization", "reports.sales.own_shift", "reports.inventory",
    "exports.allowed_data", "audit.read",
  ].includes(value);
}
