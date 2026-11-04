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
  role: TenantContext["role"];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORGANIZATION_ROLES = ["owner", "admin", "cashier", "inventory"] as const;

export interface BranchAccessLockTarget {
  branchId: string;
  userId: string;
  requiresMembership: boolean;
}

/**
 * Acquire every branch row first, then every required membership row.
 * Call once with the complete set for multi-branch operations; never loop
 * over branches in request order. The caller must already hold tenant identity
 * and organization-membership locks from resolveTenantContext(..., true).
 */
export async function lockBranchScopes(
  tx: DatabaseClient,
  organizationId: string,
  targets: readonly BranchAccessLockTarget[],
): Promise<boolean> {
  if (!UUID_PATTERN.test(organizationId)) return false;

  const branchIds = new Set<string>();
  const membershipKeys = new Map<string, { branchId: string; userId: string }>();
  for (const target of targets) {
    if (!UUID_PATTERN.test(target.branchId) || !UUID_PATTERN.test(target.userId)) return false;
    const branchId = target.branchId.toLowerCase();
    const userId = target.userId.toLowerCase();
    branchIds.add(branchId);
    if (target.requiresMembership) {
      membershipKeys.set(\`\${branchId}:\${userId}\`, { branchId, userId });
    }
  }

  const orderedBranchIds = [...branchIds].sort();
  if (orderedBranchIds.length === 0) return true;

  const branches = await tx.query<{ id: string }>(
    \`SELECT b.id
     FROM branches b
     WHERE b.organization_id = $1
       AND b.id = ANY($2::uuid[])
       AND b.is_active = true
     ORDER BY b.id ASC
     FOR SHARE OF b\`,
    [organizationId, orderedBranchIds],
  );
  if (branches.rows.length !== orderedBranchIds.length) return false;

  const orderedMemberships = [...membershipKeys.values()].sort((left, right) =>
    left.branchId < right.branchId ? -1 :
      left.branchId > right.branchId ? 1 :
        left.userId < right.userId ? -1 : left.userId > right.userId ? 1 : 0,
  );
  if (orderedMemberships.length === 0) return true;

  const memberships = await tx.query<{ branch_id: string; user_id: string }>(
    \`SELECT bm.branch_id, bm.user_id
     FROM branch_memberships bm
     JOIN unnest($2::uuid[], $3::uuid[]) AS requested(branch_id, user_id)
       ON requested.branch_id = bm.branch_id
      AND requested.user_id = bm.user_id
     WHERE bm.organization_id = $1
       AND bm.is_active = true
     ORDER BY bm.branch_id ASC, bm.user_id ASC
     FOR SHARE OF bm\`,
    [
      organizationId,
      orderedMemberships.map((target) => target.branchId),
      orderedMemberships.map((target) => target.userId),
    ],
  );
  return memberships.rows.length === orderedMemberships.length;
}

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
  lockRows = false,
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

  if (lockRows) {
    const locked = await lockBranchScopes(client, tenant.organizationId, [{
      branchId: requestedBranchId,
      userId: tenant.userId,
      requiresMembership: tenant.role === "cashier" || tenant.role === "inventory",
    }]);
    if (!locked) return null;
  }

  const result = await client.query<BranchContextRow>(
    `SELECT
       m.user_id,
       m.organization_id,
       b.id AS branch_id,
       m.role
     FROM branches b
     JOIN organizations o
       ON o.id = b.organization_id
      AND o.is_active = true
     JOIN organization_members m
       ON m.organization_id = b.organization_id
      AND m.user_id = $1
      AND m.is_active = true
      AND m.role = $4
     JOIN app_users u
       ON u.id = m.user_id
      AND u.is_active = true
     WHERE b.organization_id = $2
       AND b.id = $3
       AND b.is_active = true
       AND (
         m.role IN ('owner', 'admin')
         OR EXISTS (
           SELECT 1
           FROM branch_memberships bm
           WHERE bm.organization_id = b.organization_id
             AND bm.branch_id = b.id
             AND bm.user_id = m.user_id
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
    organizationRole: row.role,
    branchId: row.branch_id,
  };
}
