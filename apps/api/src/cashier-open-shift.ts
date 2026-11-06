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
const SHIFT_OWNER_ROLES = ["owner", "admin", "cashier"] as const;

/**
 * Resolve the authenticated member's own open register shift within an
 * already-resolved branch context. Owner, Admin and Cashier may own a shift;
 * the active branch_memberships join remains mandatory for all three roles.
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
    !SHIFT_OWNER_ROLES.includes(branch.organizationRole as (typeof SHIFT_OWNER_ROLES)[number]) ||
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
     FROM public.lock_open_register_shift($1::uuid, $2::uuid, $3::uuid) locked
     JOIN public.register_shifts s ON s.id = locked.shift_id`,
    [branch.organizationId, branch.branchId, branch.userId],
  );

  return result.rows[0] ?? null;
}
