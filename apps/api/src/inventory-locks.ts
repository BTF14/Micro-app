import type { DatabaseClient } from "./database";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export interface LockedInventoryBalance {
  warehouse_id: string;
  product_id: string;
  on_hand_quantity: string;
  reserved_quantity: string;
  balance_version: string;
}

export interface InventoryWarehouseLockTarget {
  warehouseId: string;
  branchId: string;
}

/**
 * Acquire the warehouse rows that serialize inventory mutations.
 *
 * Every writer must call this before locking inventory_balances. Multi-warehouse
 * operations pass every (warehouse, branch) pair in one call so PostgreSQL
 * acquires locks in UUID order regardless of request direction. Matching both
 * IDs preserves branch scope at the lock boundary. A null result means at least
 * one requested warehouse does not belong to the supplied tenant/branch pair.
 */
export async function lockInventoryWarehouses(
  tx: DatabaseClient,
  organizationId: string,
  targets: readonly InventoryWarehouseLockTarget[],
): Promise<string[] | null> {
  if (!isUuid(organizationId)) return null;

  const targetsById = new Map<string, string>();
  for (const target of targets) {
    if (!isUuid(target.warehouseId) || !isUuid(target.branchId)) return null;
    const warehouseId = target.warehouseId.toLowerCase();
    const branchId = target.branchId.toLowerCase();
    const previousBranchId = targetsById.get(warehouseId);
    if (previousBranchId !== undefined && previousBranchId !== branchId) return null;
    targetsById.set(warehouseId, branchId);
  }

  const orderedTargets = [...targetsById.entries()]
    .map(([warehouseId, branchId]) => ({ warehouseId, branchId }))
    .sort((left, right) => left.warehouseId < right.warehouseId ? -1 : left.warehouseId > right.warehouseId ? 1 : 0);
  if (orderedTargets.length === 0) return [];

  const result = await tx.query<{ id: string }>(
    `SELECT locked.warehouse_id AS id
     FROM public.lock_inventory_warehouses(
       $1::uuid, $2::uuid[], $3::uuid[]
     ) AS locked(warehouse_id)`,
    [
      organizationId,
      orderedTargets.map((target) => target.warehouseId),
      orderedTargets.map((target) => target.branchId),
    ],
  );

  if (result.rows.length !== orderedTargets.length) return null;
  return result.rows.map((row) => row.id);
}

/**
 * Lock current balance rows through a narrow SECURITY DEFINER helper.
 *
 * Runtime intentionally has SELECT but no UPDATE privilege on inventory_balances;
 * PostgreSQL requires UPDATE for direct SELECT ... FOR UPDATE. The helper
 * validates and locks the tenant/branch warehouse pairs before locking
 * existing balances in deterministic (warehouse, product) order.
 */
export async function lockInventoryBalances(
  tx: DatabaseClient,
  organizationId: string,
  targets: readonly InventoryWarehouseLockTarget[],
  productIds?: readonly string[],
): Promise<LockedInventoryBalance[] | null> {
  if (!isUuid(organizationId) || (productIds !== undefined && productIds.some((id) => !isUuid(id)))) {
    return null;
  }

  const targetsById = new Map<string, string>();
  for (const target of targets) {
    if (!isUuid(target.warehouseId) || !isUuid(target.branchId)) return null;
    const warehouseId = target.warehouseId.toLowerCase();
    const branchId = target.branchId.toLowerCase();
    const previousBranchId = targetsById.get(warehouseId);
    if (previousBranchId !== undefined && previousBranchId !== branchId) return null;
    targetsById.set(warehouseId, branchId);
  }

  const orderedTargets = [...targetsById.entries()]
    .map(([warehouseId, branchId]) => ({ warehouseId, branchId }))
    .sort((left, right) => left.warehouseId < right.warehouseId ? -1 : left.warehouseId > right.warehouseId ? 1 : 0);
  if (orderedTargets.length === 0) return [];

  const orderedProductIds = productIds === undefined
    ? null
    : [...new Set(productIds.map((id) => id.toLowerCase()))].sort();
  if (orderedProductIds?.length === 0) return [];

  const result = await tx.query<LockedInventoryBalance>(
    `SELECT locked.warehouse_id, locked.product_id,
            locked.on_hand_quantity::text, locked.reserved_quantity::text,
            locked.balance_version::text
       FROM public.lock_inventory_balances(
         $1::uuid, $2::uuid[], $3::uuid[], $4::uuid[]
       ) AS locked`,
    [
      organizationId,
      orderedTargets.map((target) => target.warehouseId),
      orderedTargets.map((target) => target.branchId),
      orderedProductIds,
    ],
  );
  return result.rows;
}
