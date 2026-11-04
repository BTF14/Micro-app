import type { DatabaseClient } from "./database";

export interface LockedInventoryBalance {
  warehouse_id: string;
  product_id: string;
  on_hand_quantity: string;
  reserved_quantity: string;
}

/**
 * Acquire the warehouse rows that serialize inventory mutations.
 *
 * Every writer must call this before locking inventory_balances. Multi-warehouse
 * operations pass all participating warehouses in one call so PostgreSQL
 * acquires the locks in the same UUID order regardless of request direction.
 * A null result means at least one requested warehouse is outside the tenant
 * or no longer exists; callers must abort the transaction.
 */
export async function lockInventoryWarehouses(
  tx: DatabaseClient,
  organizationId: string,
  warehouseIds: readonly string[],
): Promise<string[] | null> {
  const orderedIds = [...new Set(warehouseIds.map((id) => id.toLowerCase()))].sort();
  if (orderedIds.length === 0) return [];

  const result = await tx.query<{ id: string }>(
    `SELECT id
     FROM warehouses
     WHERE organization_id = $1 AND id = ANY($2::uuid[])
     ORDER BY id ASC
     FOR UPDATE`,
    [organizationId, orderedIds],
  );

  if (result.rows.length !== orderedIds.length) return null;
  return result.rows.map((row) => row.id);
}

/**
 * Lock the current balance rows after all warehouse mutex rows are held.
 *
 * Omitting productIds locks every existing balance in the participating
 * warehouses. Supplying productIds narrows the set. Missing balance rows are
 * protected from concurrent creation by the already-held warehouse mutex;
 * row locks alone cannot lock a row that does not exist.
 */
export async function lockInventoryBalances(
  tx: DatabaseClient,
  organizationId: string,
  warehouseIds: readonly string[],
  productIds?: readonly string[],
): Promise<LockedInventoryBalance[]> {
  const orderedWarehouseIds = [...new Set(warehouseIds.map((id) => id.toLowerCase()))].sort();
  if (orderedWarehouseIds.length === 0) return [];

  const orderedProductIds = productIds === undefined
    ? undefined
    : [...new Set(productIds.map((id) => id.toLowerCase()))].sort();
  if (orderedProductIds?.length === 0) return [];

  if (orderedProductIds === undefined) {
    const result = await tx.query<LockedInventoryBalance>(
      `SELECT warehouse_id, product_id, on_hand_quantity::text, reserved_quantity::text
       FROM inventory_balances
       WHERE organization_id = $1 AND warehouse_id = ANY($2::uuid[])
       ORDER BY warehouse_id ASC, product_id ASC
       FOR UPDATE`,
      [organizationId, orderedWarehouseIds],
    );
    return result.rows;
  }

  const result = await tx.query<LockedInventoryBalance>(
    `SELECT warehouse_id, product_id, on_hand_quantity::text, reserved_quantity::text
     FROM inventory_balances
     WHERE organization_id = $1
       AND warehouse_id = ANY($2::uuid[])
       AND product_id = ANY($3::uuid[])
     ORDER BY warehouse_id ASC, product_id ASC
     FOR UPDATE`,
    [organizationId, orderedWarehouseIds, orderedProductIds],
  );
  return result.rows;
}
