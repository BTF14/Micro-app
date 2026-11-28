import { getCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import type { Bindings } from "./bindings";
import { clearSessionCookie } from "./auth";
import { authorizeBranchOperation, authorizeCommercialOperation } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction } from "./database";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type NameCursor = { id: string; name: string; rank?: 0 | 1 | 2 };
type RecentCursor={id:string;created_at:string;rank?:0|1|2};
function encodeRecentCursor(x:RecentCursor):string{const bytes=new TextEncoder().encode(JSON.stringify(x));let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"");}
function decodeRecentCursor(value:string,hasSearch:boolean):RecentCursor|null{if(value.length>2048||!/^[A-Za-z0-9_-]+$/.test(value))return null;try{const base64=value.replace(/-/g,"+").replace(/_/g,"/");const binary=atob(base64+"=".repeat((4-base64.length%4)%4));const parsed:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true,ignoreBOM:false}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return null;const x=parsed as Record<string,unknown>;if(Object.keys(x).sort().join(",")!==(hasSearch?"created_at,id,rank":"created_at,id")||typeof x.id!=="string"||!UUID_PATTERN.test(x.id)||typeof x.created_at!=="string"||!x.created_at.includes("T")||!Number.isFinite(Date.parse(x.created_at))||(hasSearch&&x.rank!==0&&x.rank!==1&&x.rank!==2))return null;return{id:x.id,created_at:x.created_at,...(hasSearch?{rank:x.rank as 0|1|2}:{})};}catch{return null;}}

function encodeNameCursor(cursor: NameCursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeNameCursor(value: string, hasSearch: boolean): NameCursor | null {
  if (value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    const keys = Object.keys(candidate).sort().join(",");
    if (keys !== (hasSearch ? "id,name,rank" : "id,name")) return null;
    if (typeof candidate.id !== "string" || !UUID_PATTERN.test(candidate.id)) return null;
    if (typeof candidate.name !== "string" || candidate.name.trim().length === 0 || candidate.name.length > 240 || candidate.name.includes("\u0000")) return null;
    if (hasSearch && candidate.rank !== 0 && candidate.rank !== 1 && candidate.rank !== 2) return null;
    return hasSearch
      ? { id: candidate.id, name: candidate.name, rank: candidate.rank as 0 | 1 | 2 }
      : { id: candidate.id, name: candidate.name };
  } catch {
    return null;
  }
}
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function parsePageSize(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_PAGE_SIZE;
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= MAX_PAGE_SIZE ? parsed : null;
}

function postgresErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function inventoryReadFailure(
  c: Context<{ Bindings: Bindings }>,
  error: unknown,
  errorCode: "INVENTORY_READ_FAILED" | "INVENTORY_MOVEMENTS_READ_FAILED",
  message: string,
) {
  const code = postgresErrorCode(error);
  // The application may be deployed before the separately authorized Neon
  // migration/baseline work is complete. Fail closed as unavailable, not as
  // an internal server error, when required schema/helpers/grants are absent.
  if (code && ["42P01", "42883", "42703", "42501"].includes(code)) {
    return c.json({
      error: "INVENTORY_READ_NOT_ENABLED",
      message: "La lectura de inventario todavía no está habilitada en esta base de datos.",
    }, 503);
  }
  return c.json({ error: errorCode, message }, 500);
}

type InventoryBalanceRow = {
  product_id: string;
  is_active: boolean;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  quantity_mode: "integer" | "fractional";
  price_usd: string;
  minimum_stock: string;
  on_hand_quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  balance_version: string | null;
  cost_usd?: string;
  cursor_name?: string;
  cursor_rank?: number;
  cursor_created_at?: string;
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


export type InventoryReadSort = "id" | "name" | "relevance" | "recent";
export function buildInventoryReadQuery(input: {
  organizationId: string; branchId: string; warehouseId: string; search: string;
  activeOnly: boolean; cursor?: string; cursorName?: string; cursorRank?: number; cursorCreatedAt?: string; limit: number; sort: InventoryReadSort; canReadCost: boolean;
}): { statement: string; values: unknown[] } {
  const values: unknown[] = [input.organizationId, input.branchId, input.warehouseId];
  const filters = ["p.organization_id = $1", input.activeOnly ? "p.is_active = true" : "(p.is_active = true OR b.balance_version IS NOT NULL)"];
  let exact: number | null = null;
  let partial: number | null = null;
  let prefix: number | null = null;
  if (input.search) {
    const escaped = input.search.replace(/[\\%_]/g, (character) => "\\" + character);
    values.push(input.search); exact = values.length;
    values.push(`%${escaped}%`); partial = values.length;
    if (input.sort === "relevance") {
      values.push(`${escaped}%`); prefix = values.length;
    }
    filters.push(`(p.barcode = $${exact} OR lower(p.sku) = lower($${exact}) OR p.barcode ILIKE $${partial} ESCAPE '\\' OR p.sku ILIKE $${partial} ESCAPE '\\' OR p.name ILIKE $${partial} ESCAPE '\\')`);
  }
  if (input.cursor) {
    if (input.sort === "name") {
      if (input.cursorName === undefined) throw new Error("A name cursor requires its normalized name.");
      if (input.search) {
        if (input.cursorRank === undefined) throw new Error("A searched name cursor requires its search rank.");
        values.push(input.cursorRank);
        const rankParameter = values.length;
        values.push(input.cursorName);
        const nameParameter = values.length;
        values.push(input.cursor);
        filters.push("(CASE WHEN p.barcode = $" + exact + " THEN 0 WHEN lower(p.sku) = lower($" + exact + ") THEN 1 ELSE 2 END, lower(p.name), p.id) > ($" + rankParameter + ", $" + nameParameter + ", $" + values.length + ")");
        filters.push("p.id <> $" + values.length);
      } else {
        values.push(input.cursorName);
        const nameParameter = values.length;
        values.push(input.cursor);
        filters.push("(lower(p.name), p.id) > ($" + nameParameter + ", $" + values.length + ")");
        filters.push("p.id <> $" + values.length);
      }
    } else if(input.sort==="recent") {
      if(!input.cursorCreatedAt)throw new Error("A recent cursor requires its creation timestamp.");
      if(input.search){if(input.cursorRank===undefined)throw new Error("A searched recent cursor requires its rank.");values.push(input.cursorRank);const rank=values.length;values.push(input.cursorCreatedAt);const created=values.length;values.push(input.cursor);filters.push(`((CASE WHEN p.barcode = ${exact} THEN 0 WHEN lower(p.sku) = lower(${exact}) THEN 1 ELSE 2 END) > ${rank} OR ((CASE WHEN p.barcode = ${exact} THEN 0 WHEN lower(p.sku) = lower(${exact}) THEN 1 ELSE 2 END) = ${rank} AND (p.created_at,p.id) < (${created},${values.length}))`);}
      else{values.push(input.cursorCreatedAt);const created=values.length;values.push(input.cursor);filters.push(`(p.created_at,p.id) < (${created},${values.length})`);}
    } else { values.push(input.cursor); filters.push(`p.id > ${values.length}`); }
  }
  values.push(input.limit + 1);
  let order = "p.id ASC";
  if(input.sort==="recent")order=input.search&&exact!==null?`CASE WHEN p.barcode = ${exact} THEN 0 WHEN lower(p.sku) = lower(${exact}) THEN 1 ELSE 2 END ASC, p.created_at DESC, p.id DESC`:"p.created_at DESC, p.id DESC";
  if (input.sort === "relevance" && input.search && exact !== null && partial !== null && prefix !== null) {
    order = `CASE
      WHEN p.barcode = $${exact} THEN 0
      WHEN lower(p.sku) = lower($${exact}) THEN 1
      WHEN p.barcode ILIKE $${prefix} ESCAPE '\\' OR p.sku ILIKE $${prefix} ESCAPE '\\' OR p.name ILIKE $${prefix} ESCAPE '\\' THEN 2
      ELSE 3 END, lower(p.name) ASC, p.id ASC`;
  } else if (input.sort === "relevance") {
    order = "lower(p.name) ASC, p.id ASC";
  } else if (input.sort === "name") {
    order = input.search && exact !== null
      ? `CASE WHEN p.barcode = $${exact} THEN 0 WHEN lower(p.sku) = lower($${exact}) THEN 1 ELSE 2 END, lower(p.name) ASC, p.id ASC`
      : "lower(p.name) ASC, p.id ASC";
  }
  const cursorProjection = input.sort === "name"
    ? `, lower(p.name) AS cursor_name${input.search && exact !== null ? `, CASE WHEN p.barcode = ${exact} THEN 0 WHEN lower(p.sku) = lower(${exact}) THEN 1 ELSE 2 END AS cursor_rank` : ""}`
    : input.sort === "recent" ? `, p.created_at::text AS cursor_created_at${input.search && exact !== null ? `, CASE WHEN p.barcode = ${exact} THEN 0 WHEN lower(p.sku) = lower(${exact}) THEN 1 ELSE 2 END AS cursor_rank` : ""}` : "";
  const cost = input.canReadCost ? ", p.cost_usd::text AS cost_usd" : "";
  const statement = `SELECT p.id AS product_id, p.is_active, p.sku, p.barcode, p.name, p.unit, p.quantity_mode,
      p.price_usd::text AS price_usd, p.minimum_stock::text AS minimum_stock,
      COALESCE(b.on_hand_quantity, 0)::numeric(14,3)::text AS on_hand_quantity,
      COALESCE(b.reserved_quantity, 0)::numeric(14,3)::text AS reserved_quantity,
      (COALESCE(b.on_hand_quantity, 0) - COALESCE(b.reserved_quantity, 0))::numeric(14,3)::text AS available_quantity,
      b.balance_version::text AS balance_version${cursorProjection}${cost}
    FROM products p LEFT JOIN inventory_balances b ON b.organization_id = p.organization_id
      AND b.branch_id = $2 AND b.warehouse_id = $3 AND b.product_id = p.id
    WHERE ${filters.join(" AND ")} ORDER BY ${order} LIMIT $${values.length}`;
  return { statement, values };
}

export function registerInventoryReadRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/inventory", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    }

    const limit = parsePageSize(c.req.query("limit"));
    const cursor = c.req.query("cursor");
    const search = c.req.query("q")?.trim() ?? "";
    const activeOnlyValue = c.req.query("active_only");
    const sortValue = c.req.query("sort");
    const activeOnly = activeOnlyValue === "true";
    const sort: InventoryReadSort = sortValue === undefined ? "id" : sortValue as InventoryReadSort;
    if (search.length > 120) return c.json({ error: "INVALID_INVENTORY_QUERY", message: "La búsqueda no puede superar 120 caracteres." }, 400);
    const nameCursor = cursor !== undefined && sort === "name" ? decodeNameCursor(cursor, search.length > 0) : null;
    const recentCursor = cursor !== undefined && sort === "recent" ? decodeRecentCursor(cursor,search.length>0) : null;
    if (limit === null ||
        (cursor !== undefined && (sort === "name" ? nameCursor === null : sort === "recent" ? recentCursor === null : !UUID_PATTERN.test(cursor))) ||
        (activeOnlyValue !== undefined && activeOnlyValue !== "true" && activeOnlyValue !== "false") ||
        (sortValue !== undefined && sortValue !== "id" && sortValue !== "name" && sortValue !== "relevance" && sortValue !== "recent") ||
        (sort === "relevance" && cursor !== undefined)) {
      return c.json({ error: "INVALID_INVENTORY_QUERY", message: "Los parámetros de consulta no son válidos." }, 400);
    }

    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) {
      clearSessionCookie(c);
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
          const warehouse = await tx.query<{ id: string }>(
            `SELECT id FROM public.warehouses
              WHERE organization_id = $1 AND branch_id = $2 AND id = $3 AND is_active = true`,
            [branch.organizationId, branch.branchId, warehouseId],
          );
          if (!warehouse.rows[0]) return { kind: "warehouse_not_found" as const };

          let cursorName: string | undefined;
          let cursorRank: number | undefined;
          let cursorCreatedAt: string | undefined;
          const cursorId = sort === "name" ? nameCursor?.id : sort === "recent" ? recentCursor?.id : cursor;
          if (cursorId && sort !== "id" && sort !== "relevance") {
            const cursorProduct = await tx.query<{ cursor_exists: number }>(
              "SELECT 1 AS cursor_exists FROM products WHERE organization_id = $1 AND id = $2",
              [branch.organizationId, cursorId],
            );
            if (!cursorProduct.rows[0]) return { kind: "invalid_cursor" as const };
            if(sort==="name"&&nameCursor){cursorName=nameCursor.name;cursorRank=nameCursor.rank;}
            if(sort==="recent"&&recentCursor){cursorCreatedAt=recentCursor.created_at;cursorRank=recentCursor.rank;}
          }

          const canReadCost = authorizeCommercialOperation(branch.organizationRole, "catalog.read_costs");
          const query = buildInventoryReadQuery({
            organizationId: branch.organizationId, branchId: branch.branchId, warehouseId,
            search, activeOnly, cursor: cursorId, cursorName, cursorRank, cursorCreatedAt, limit, sort, canReadCost,
          });
          const rows = await tx.query<InventoryBalanceRow>(query.statement, query.values);
          const hasMore = rows.rows.length > limit;
          const items = rows.rows.slice(0, limit);
          return {
            kind: "ok" as const,
            body: {
              items: items.map((row) => ({
                product_id: row.product_id,
                is_active: row.is_active,
                sku: row.sku,
                barcode: row.barcode,
                name: row.name,
                unit: row.unit,
                quantity_mode: row.quantity_mode,
                price_usd: row.price_usd,
                minimum_stock: row.minimum_stock,
                on_hand_quantity: row.on_hand_quantity,
                reserved_quantity: row.reserved_quantity,
                available_quantity: row.available_quantity,
                balance_version: row.balance_version,
                ...(canReadCost ? { cost_usd: row.cost_usd } : {}),
              })),
              nextCursor: hasMore
                ? sort === "name"
                  ? encodeNameCursor({
                    id: items[items.length - 1]!.product_id,
                    name: items[items.length - 1]!.cursor_name!,
                    ...(search ? { rank: items[items.length - 1]!.cursor_rank as 0 | 1 | 2 } : {}),
                  })
                  : sort === "recent" ? encodeRecentCursor({id:items[items.length-1]!.product_id,created_at:items[items.length-1]!.cursor_created_at!,...(search?{rank:items[items.length-1]!.cursor_rank as 0|1|2}:{})})
                  : items[items.length - 1]!.product_id
                : null,
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
    } catch (error) {
      return inventoryReadFailure(c, error, "INVENTORY_READ_FAILED", "No se pudo consultar el inventario.");
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
      clearSessionCookie(c);
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
          const warehouse = await tx.query<{ id: string }>(
            `SELECT id FROM public.warehouses
              WHERE organization_id = $1 AND branch_id = $2 AND id = $3 AND is_active = true`,
            [branch.organizationId, branch.branchId, warehouseId],
          );
          if (!warehouse.rows[0]) return { kind: "warehouse_not_found" as const };

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
    } catch (error) {
      return inventoryReadFailure(c, error, "INVENTORY_MOVEMENTS_READ_FAILED", "No se pudo consultar el kardex.");
    }
  });
}
