import type { DatabaseClient } from "./database";
import { resolveBranchContext, type BranchContext } from "./branch-context";
import { resolveTenantContext, type TenantContext, type OrganizationRole } from "./tenant-context";

export type CommercialOperation =
  | "catalog.read" | "catalog.read_costs" | "catalog.product.manage"
  | "inventory.read" | "inventory.management.read" | "inventory.receive" | "inventory.adjust" | "inventory.transfer"
  | "register.shift.open_own" | "register.shift.close_own" | "register.shift.operate_own"
  | "register.shift.read_all" | "register.shift.read_own"
  | "sales.create_list_price"
  | "sales.price.override" | "sales.void_own_open_shift" | "sales.void_after_shift" | "sales.void_other"
  | "members.manage" | "branch_memberships.manage" | "organization_policy.manage"
  | "reports.sales.organization" | "reports.sales.own_shift" | "reports.inventory"
  | "exports.allowed_data" | "audit.read" | "bcv.sync_state.read";

const ROLE_OPERATIONS: Readonly<Record<OrganizationRole, ReadonlySet<CommercialOperation>>> = {
  owner: new Set<CommercialOperation>([
    "catalog.read", "catalog.read_costs", "catalog.product.manage",
    "inventory.read", "inventory.management.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own", "register.shift.read_all",
    "sales.create_list_price", "sales.price.override",
    "sales.void_own_open_shift", "sales.void_after_shift", "sales.void_other",
    "members.manage", "branch_memberships.manage", "organization_policy.manage",
    "reports.sales.organization", "reports.sales.own_shift", "reports.inventory", "exports.allowed_data", "audit.read", "bcv.sync_state.read",
  ]),
  admin: new Set<CommercialOperation>([
    "catalog.read", "catalog.read_costs", "catalog.product.manage",
    "inventory.read", "inventory.management.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own", "register.shift.read_all",
    "sales.create_list_price", "sales.price.override",
    "sales.void_own_open_shift", "sales.void_after_shift", "sales.void_other",
    "reports.sales.organization", "reports.sales.own_shift", "reports.inventory", "exports.allowed_data", "audit.read", "bcv.sync_state.read",
  ]),
  inventory: new Set<CommercialOperation>([
    "catalog.read", "catalog.read_costs", "inventory.read", "inventory.management.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "reports.inventory", "exports.allowed_data",
  ]),
  cashier: new Set<CommercialOperation>([
    "catalog.read", "inventory.read",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own", "register.shift.read_own",
    "sales.create_list_price", "sales.void_own_open_shift", "reports.sales.own_shift", "exports.allowed_data",
  ]),
};

export function isCommercialOperationAllowed(role: OrganizationRole, operation: CommercialOperation): boolean {
  return ROLE_OPERATIONS[role]?.has(operation) ?? false;
}

export function authorizeCommercialOperation(role: string, operation: string): boolean {
  if (!Object.hasOwn(ROLE_OPERATIONS, role) || !isCommercialOperation(operation)) return false;
  return isCommercialOperationAllowed(role as OrganizationRole, operation);
}

function isCommercialOperation(value: string): value is CommercialOperation {
  return [
    "catalog.read", "catalog.read_costs", "catalog.product.manage",
    "inventory.read", "inventory.management.read", "inventory.receive", "inventory.adjust", "inventory.transfer",
    "register.shift.open_own", "register.shift.close_own", "register.shift.operate_own",
    "register.shift.read_all", "register.shift.read_own",
    "sales.create_list_price", "sales.price.override",
    "sales.void_own_open_shift", "sales.void_after_shift", "sales.void_other",
    "members.manage", "branch_memberships.manage", "organization_policy.manage",
    "reports.sales.organization", "reports.sales.own_shift", "reports.inventory", "exports.allowed_data", "audit.read", "bcv.sync_state.read",
  ].includes(value);
}

export type AuthorizationResult<Context> =
  | { allowed: true; context: Context }
  | { allowed: false; reason: "unauthenticated_or_out_of_scope" | "branch_out_of_scope" | "operation_denied" };

export async function authorizeTenantOperation(
  client: DatabaseClient,
  sessionToken: string | undefined,
  requestedOrganizationId: string | undefined,
  operation: string,
  lockRows = true,
): Promise<AuthorizationResult<TenantContext>> {
  const tenant = await resolveTenantContext(client, sessionToken, requestedOrganizationId, lockRows);
  if (!tenant) return { allowed: false, reason: "unauthenticated_or_out_of_scope" };
  if (!authorizeCommercialOperation(tenant.role, operation)) return { allowed: false, reason: "operation_denied" };
  return { allowed: true, context: tenant };
}

export async function authorizeBranchOperation(
  client: DatabaseClient,
  sessionToken: string | undefined,
  requestedOrganizationId: string | undefined,
  requestedBranchId: string | undefined,
  operation: string,
  lockRows = true,
): Promise<AuthorizationResult<BranchContext>> {
  const tenant = await resolveTenantContext(client, sessionToken, requestedOrganizationId, lockRows);
  if (!tenant) return { allowed: false, reason: "unauthenticated_or_out_of_scope" };
  if (!authorizeCommercialOperation(tenant.role, operation)) return { allowed: false, reason: "operation_denied" };
  const branch = await resolveBranchContext(client, tenant, requestedBranchId, lockRows);
  if (!branch) return { allowed: false, reason: "branch_out_of_scope" };
  return { allowed: true, context: branch };
}
