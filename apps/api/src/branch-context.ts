import type { DatabaseClient } from "./database";
import type { TenantContext } from "./tenant-context";

export type BranchContext = {
  userId: string;
  organizationId: string;
  organizationRole: TenantContext["role"];
  branchId: string;
};

type BranchContextRow = {
  user_id: string;
  organization_id: string;
  branch_id: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORGANIZATION_ROLES = ["owner", "admin", "cashier", "inventory"] as const;

/**
 * Resolve a requested branch using a previously validated, server-derived
 * TenantContext. owner/admin have organization-wide branch scope; cashier and
 * inventory require an active branch_memberships row. This is scope resolution,
 * not authorization for a business operation.
 */
export async function resolveBranchContext(
  client: DatabaseClient,
  tenant: TenantContext,
  requestedBranchId: string | undefined,
): Promise<BranchContext | null> {
  if (
    !tenant ||
    typeof tenant.userId !== "string" ||
    !UUID_PATTERN.test(tenant.userId) ||
    typeof tenant.organizationId !== "string" ||
    !UUID_PATTERN.test(tenant.organizationId) ||
    !ORGANIZATION_ROLES.includes(tenant.role) ||
    typeof requestedBranchId !== "string" ||
    !UUID_PATTERN.test(requestedBranchId)
  ) {
    return null;
  }

  const result = await client.query<BranchContextRow>(
    `SELECT
       $1::uuid AS user_id,
       b.organization_id,
       b.id AS branch_id
     FROM branches b
     WHERE b.organization_id = $2
       AND b.id = $3
       AND b.is_active = true
       AND (
         $4 IN ('owner', 'admin')
         OR EXISTS (
           SELECT 1
           FROM branch_memberships bm
           WHERE bm.organization_id = b.organization_id
             AND bm.branch_id = b.id
             AND bm.user_id = $1
             AND bm.is_active = true
         )
       )
     LIMIT 1`,
    [tenant.userId, tenant.organizationId, requestedBranchId, tenant.role],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    organizationId: row.organization_id,
    organizationRole: tenant.role,
    branchId: row.branch_id,
  };
}
