import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { authorizeBranchOperation, authorizeCommercialOperation } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { lockInventoryWarehouses } from "./inventory-locks";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function parsePageSize(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_PAGE_SIZE;
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= MAX_PAGE_SIZE ? parsed : null;
}

type InventoryBalanceRow = {
  product_id: string;
  is_active: boolean;
  sku: string;
  name: string;
  unit: string;
  price_usd: string;
  minimum_stock: string;
  on_hand_quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  balance_version: string | null;
  cost_usd?: string;
};

type InventoryMovementRow = {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  movement_type: string;
  quantity_delta: string;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  count_id: string | null;
  actor_user_id: string;
  actor_display_name: string;
  created_at: string;
  unit_cost_usd?: string | null;
};

export function registerInventoryReadRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/inventory", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    }

    const limit = parsePageSize(c.req.query("limit"));
    const cursor = c.req.query("cursor");
    if (limit === null || (cursor !== undefined && !UUID_PATTERN.test(cursor))) {
      return c.json({ error: "INVALID_INVENTORY_QUERY", message: "Los parámetros de consulta no son válidos." }, 400);
    }

    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) {
      return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx) => {
          const authorization = await authorizeBranchOperation(tx, token, organizationId, branchId, "inventory.read");
          if (!authorization.allowed) {
            if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
            if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
            return { kind: "forbidden" as const };
          }
          const branch = authorization.context;
          const locked = await lockInventoryWarehouses(tx, branch.organizationId, [{ warehouseId, branchId: branch.branchId }]);
          if (!locked) return { kind: "warehouse_not_found" as const };

          if (cursor) {
            const cursorProduct = await tx.query(
              "SELECT id FROM products WHERE organization_id = $1 AND id = $2",
              [branch.organizationId, cursor],
            );
            if (!cursorProduct.rows[0]) return { kind: "invalid_cursor" as const };
          }

          const canReadCost = authorizeCommercialOperation(branch.organizationRole, "catalog.read_costs");
          const costColumn = canReadCost ? ", p.cost_usd::text AS cost_usd" : "";
          const values = cursor
            ? [branch.organizationId, branch.branchId, warehouseId, cursor, limit + 1]
            : [branch.organizationId, branch.branchId, warehouseId, limit + 1];
          const rows = await tx.query<InventoryBalanceRow>(
            `SELECT p.id AS product_id, p.is_active, p.sku, p.name, p.unit,
                    p.price_usd::text AS price_usd, p.minimum_stock::text AS minimum_stock,
                    COALESCE(b.on_hand_quantity, 0)::numeric(14,3)::text AS on_hand_quantity,
                    COALESCE(b.reserved_quantity, 0)::numeric(14,3)::text AS reserved_quantity,
                    (COALESCE(b.on_hand_quantity, 0) - COALESCE(b.reserved_quantity, 0))::numeric(14,3)::text AS available_quantity,
                    b.balance_version::text AS balance_version${costColumn}
               FROM products p
               LEFT JOIN inventory_balances b
                 ON b.organization_id = p.organization_id
                AND b.branch_id = $2
                AND b.warehouse_id = $3
                AND b.product_id = p.id
              WHERE p.organization_id = $1
                AND (p.is_active = true OR b.balance_version IS NOT NULL)
                ${cursor ? "AND p.id > $4" : ""}
              ORDER BY p.id ASC
              LIMIT $${values.length}`,
            values,
          );
          const hasMore = rows.rows.length > limit;
          const items = rows.rows.slice(0, limit);
          return {
            kind: "ok" as const,
            body: {
              items: items.map((row) => ({
                product_id: row.product_id,
                is_active: row.is_active,
                sku: row.sku,
                name: row.name,
                unit: row.unit,
                price_usd: row.price_usd,
                minimum_stock: row.minimum_stock,
                on_hand_quantity: row.on_hand_quantity,
                reserved_quantity: row.reserved_quantity,
                available_quantity: row.available_quantity,
                balance_version: row.balance_version,
                ...(canReadCost ? { cost_usd: row.cost_usd } : {}),
              })),
              nextCursor: hasMore ? items[items.length - 1]!.product_id : null,
              limit,
            },
          };
        }),
      );

      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar inventario." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      if (result.kind === "warehouse_not_found") return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe o está inactivo." }, 404);
      if (result.kind === "invalid_cursor") return c.json({ error: "INVALID_INVENTORY_CURSOR", message: "El cursor no pertenece a esta organización." }, 400);
      return c.json(result.body, 200);
    } catch {
      return c.json({ error: "INVENTORY_READ_FAILED", message: "No se pudo consultar el inventario." }, 500);
    }
  });

  app.get("/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/inventory/movements", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    }

    const limit = parsePageSize(c.req.query("limit"));
    const cursor = c.req.query("cursor");
    const productId = c.req.query("product_id");
    if (limit === null || (cursor !== undefined && !UUID_PATTERN.test(cursor)) ||
        (productId !== undefined && !UUID_PATTERN.test(productId))) {
      return c.json({ error: "INVALID_MOVEMENT_QUERY", message: "Los parámetros de consulta no son válidos." }, 400);
    }

    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) {
      return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx) => {
          const authorization = await authorizeBranchOperation(tx, token, organizationId, branchId, "inventory.management.read");
          if (!authorization.allowed) {
            if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
            if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
            return { kind: "forbidden" as const };
          }
          const branch = authorization.context;
          const locked = await lockInventoryWarehouses(tx, branch.organizationId, [{ warehouseId, branchId: branch.branchId }]);
          if (!locked) return { kind: "warehouse_not_found" as const };

          let cursorCreatedAt: string | null = null;
          if (cursor) {
            const cursorRow = await tx.query<{ created_at: string }>(
              `SELECT created_at::text AS created_at
                 FROM warehouse_inventory_movements
                WHERE organization_id = $1 AND branch_id = $2 AND warehouse_id = $3 AND id = $4
                  AND ($5::uuid IS NULL OR product_id = $5)`,
              [branch.organizationId, branch.branchId, warehouseId, cursor, productId ?? null],
            );
            if (!cursorRow.rows[0]) return { kind: "invalid_cursor" as const };
            cursorCreatedAt = cursorRow.rows[0].created_at;
          }

          const canReadCost = authorizeCommercialOperation(branch.organizationRole, "catalog.read_costs");
          const costColumn = canReadCost ? ", m.unit_cost_usd::text AS unit_cost_usd" : "";
          const rows = await tx.query<InventoryMovementRow>(
            `SELECT m.id, m.product_id, p.sku, p.name AS product_name, m.movement_type,
                    m.quantity_delta::text AS quantity_delta, m.reason,
                    m.reference_type, m.reference_id, m.count_id, m.actor_user_id,
                    u.display_name AS actor_display_name, m.created_at::text AS created_at${costColumn}
               FROM warehouse_inventory_movements m
               JOIN products p ON p.organization_id = m.organization_id AND p.id = m.product_id
               JOIN app_users u ON u.id = m.actor_user_id
              WHERE m.organization_id = $1 AND m.branch_id = $2 AND m.warehouse_id = $3
                AND ($4::uuid IS NULL OR m.product_id = $4)
                AND ($5::timestamptz IS NULL OR (m.created_at, m.id) < ($5::timestamptz, $6::uuid))
              ORDER BY m.created_at DESC, m.id DESC
              LIMIT $7`,
            [branch.organizationId, branch.branchId, warehouseId, productId ?? null, cursorCreatedAt, cursor ?? null, limit + 1],
          );
          const hasMore = rows.rows.length > limit;
          const items = rows.rows.slice(0, limit).map((row) => ({
            id: row.id,
            product_id: row.product_id,
            sku: row.sku,
            product_name: row.product_name,
            movement_type: row.movement_type,
            quantity_delta: row.quantity_delta,
            reason: row.reason,
            reference_type: row.reference_type,
            reference_id: row.reference_id,
            count_id: row.count_id,
            actor_user_id: row.actor_user_id,
            actor_display_name: row.actor_display_name,
            created_at: row.created_at,
            ...(canReadCost ? { unit_cost_usd: row.unit_cost_usd ?? null } : {}),
          }));
          return {
            kind: "ok" as const,
            body: { items, nextCursor: hasMore ? items[items.length - 1]!.id : null, limit },
          };
        }),
      );

      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar el kardex." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      if (result.kind === "warehouse_not_found") return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe o está inactivo." }, 404);
      if (result.kind === "invalid_cursor") return c.json({ error: "INVALID_MOVEMENT_CURSOR", message: "El cursor no pertenece a este almacén o filtro." }, 400);
      return c.json(result.body, 200);
    } catch {
      return c.json({ error: "INVENTORY_MOVEMENTS_READ_FAILED", message: "No se pudo consultar el kardex." }, 500);
    }
  });
}
