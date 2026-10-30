import type { DatabaseClient } from "./database";
import type { BranchContext } from "./branch-context";

export type OpenCashierRegisterShift = {
  id: string;
  organizationId: string;
  branchId: string;
  registerId: string;
  cashierUserId: string;
  openedAt: Date;
  openingCashUsd: string;
  openingCashVes: string;
};

type OpenCashierRegisterShiftRow = OpenCashierRegisterShift;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the authenticated cashier's open shift within an already-resolved
 * branch context. The context must come from resolveBranchContext after
 * resolveTenantContext; never build it from request-supplied identity fields.
 *
 * This is context lookup, not authorization for a commercial operation.
 * Call it on the same transaction client as any future operation that must
 * remain atomic with the shift check. FOR SHARE prevents a concurrent close
 * until that caller's transaction completes.
 */
export async function resolveOpenCashierRegisterShift(
  client: DatabaseClient,
  branch: BranchContext,
): Promise<OpenCashierRegisterShift | null> {
  if (
    !branch ||
    branch.organizationRole !== "cashier" ||
    typeof branch.userId !== "string" ||
    !UUID_PATTERN.test(branch.userId) ||
    typeof branch.organizationId !== "string" ||
    !UUID_PATTERN.test(branch.organizationId) ||
    typeof branch.branchId !== "string" ||
    !UUID_PATTERN.test(branch.branchId)
  ) {
    return null;
  }

  const result = await client.query<OpenCashierRegisterShiftRow>(
    `SELECT
       s.id,
       s.organization_id AS "organizationId",
       s.branch_id AS "branchId",
       s.register_id AS "registerId",
       s.cashier_user_id AS "cashierUserId",
       s.opened_at AS "openedAt",
       s.opening_cash_usd::text AS "openingCashUsd",
       s.opening_cash_ves::text AS "openingCashVes"
     FROM register_shifts s
     JOIN organizations o
       ON o.id = s.organization_id
      AND o.is_active = true
     JOIN branches b
       ON b.organization_id = s.organization_id
      AND b.id = s.branch_id
      AND b.is_active = true
     JOIN registers r
       ON r.organization_id = s.organization_id
      AND r.branch_id = s.branch_id
      AND r.id = s.register_id
      AND r.is_active = true
     JOIN app_users u
       ON u.id = s.cashier_user_id
      AND u.is_active = true
     JOIN organization_members m
       ON m.organization_id = s.organization_id
      AND m.user_id = s.cashier_user_id
      AND m.is_active = true
      AND m.role = 'cashier'
     JOIN branch_memberships bm
       ON bm.organization_id = s.organization_id
      AND bm.branch_id = s.branch_id
      AND bm.user_id = s.cashier_user_id
      AND bm.is_active = true
     WHERE s.organization_id = $1
       AND s.branch_id = $2
       AND s.cashier_user_id = $3
       AND s.closed_at IS NULL
     LIMIT 1
     FOR SHARE OF s`,
    [branch.organizationId, branch.branchId, branch.userId],
  );

  return result.rows[0] ?? null;
}
