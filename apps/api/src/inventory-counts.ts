import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { isTrustedOrigin } from "./auth";
import { resolveBranchContext } from "./branch-context";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { resolveTenantContext } from "./tenant-context";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 128 * 1024;
const MAX_COUNT_LINES = 500;

type CountLineInput = { productId: string; quantity: string; unitCost: string | null };

function readDecimal(value: unknown, allowZero: boolean): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  if (!/^(?:0|[1-9][0-9]{0,10})(?:\.[0-9]{1,3})?$/.test(raw)) return null;
  if (!allowZero && Number(raw) <= 0) return null;
  return raw.includes(".") ? raw : raw + ".0";
}

function parseCountBody(value: unknown): { reason: string; lines: CountLineInput[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["reason", "lines"].includes(key))) return null;
  if (typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 500 ||
      /[\u0000-\u001F\u007F]/.test(body.reason)) return null;
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > MAX_COUNT_LINES) return null;

  const seen = new Set<string>();
  const lines: CountLineInput[] = [];
  for (const raw of body.lines) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const line = raw as Record<string, unknown>;
    if (Object.keys(line).some((key) => !["product_id", "counted_quantity", "unit_cost_usd"].includes(key))) return null;
    if (typeof line.product_id !== "string" || !UUID_PATTERN.test(line.product_id) || seen.has(line.product_id)) return null;
    const quantity = readDecimal(line.counted_quantity, true);
    const unitCost = line.unit_cost_usd === undefined || line.unit_cost_usd === null
      ? null : readDecimal(line.unit_cost_usd, true);
    if (quantity === null || (line.unit_cost_usd !== undefined && line.unit_cost_usd !== null && unitCost === null)) return null;
    seen.add(line.product_id);
    lines.push({ productId: line.product_id, quantity, unitCost });
  }
  return { reason: body.reason.trim(), lines };
}

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try { await reader.cancel(); } catch { /* no-op */ }
    return null;
  } finally {
    reader.releaseLock();
  }
}

function milliUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole!) * 1000n + BigInt((fraction + "000").slice(0, 3));
}

function formatMilliUnits(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return sign + (absolute / 1000n).toString() + "." + (absolute % 1000n).toString().padStart(3, "0");
}

function isInventoryOperator(role: string): boolean {
  return role === "owner" || role === "admin" || role === "inventory";
}

export function registerInventoryCountRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.post("/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts/:countType", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId, countType } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id)) ||
        (countType !== "opening" && countType !== "physical")) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores o el tipo de conteo no son válidos." }, 400);
    }
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
      return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
      return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
    }
    const length = c.req.header("Content-Length");
    if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
      return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite permitido." }, 413);
    }
    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    const raw = await readBoundedBody(c.req.raw);
    if (raw === null) return c.json({ error: "INVALID_OR_TOO_LARGE_BODY", message: "El cuerpo no es válido o excede el límite." }, 400);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return c.json({ error: "INVALID_JSON", message: "El JSON no es válido." }, 400); }
    const input = parseCountBody(parsed);
    if (!input) return c.json({ error: "INVALID_COUNT", message: "El motivo o las líneas del conteo no son válidos." }, 400);

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx) => {
          const tenant = await resolveTenantContext(tx, token, organizationId, true);
          if (!tenant) return { kind: "unauthenticated" as const };
          if (!isInventoryOperator(tenant.role)) return { kind: "forbidden" as const };
          const branch = await resolveBranchContext(tx, tenant, branchId);
          if (!branch) return { kind: "branch_denied" as const };
          const warehouse = await tx.query<{ id: string }>(
            `SELECT id FROM warehouses
             WHERE organization_id = $1 AND branch_id = $2 AND id = $3 AND is_active = true
             FOR SHARE`,
            [tenant.organizationId, branch.branchId, warehouseId],
          );
          if (!warehouse.rows[0]) return { kind: "not_found" as const };

          const productIds = input.lines.map((line) => line.productId);
          const products = await tx.query<{ id: string }>(
            `SELECT id FROM products WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
            [tenant.organizationId, productIds],
          );
          if (products.rows.length !== productIds.length) return { kind: "invalid_products" as const };

          const inserted = await tx.query<{ id: string }>(
            `INSERT INTO inventory_counts
              (organization_id, branch_id, warehouse_id, count_type, reason, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [tenant.organizationId, branch.branchId, warehouseId, countType, input.reason, tenant.userId],
          );
          const countId = inserted.rows[0]!.id;
          for (const line of input.lines) {
            await tx.query(
              `INSERT INTO inventory_count_lines
                (organization_id, branch_id, warehouse_id, count_id, product_id, counted_quantity, unit_cost_usd)
               VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric)`,
              [tenant.organizationId, branch.branchId, warehouseId, countId, line.productId, line.quantity, line.unitCost],
            );
          }
          await tx.query(
            `INSERT INTO audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, 'inventory.count.created', 'inventory_count', $3, $4::jsonb)`,
            [tenant.organizationId, tenant.userId, countId, JSON.stringify({
              branch_id: branch.branchId, warehouse_id: warehouseId, count_type: countType,
              reason: input.reason, line_count: input.lines.length,
            })],
          );
          return { kind: "created" as const, countId, lineCount: input.lines.length };
        }),
      );
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para operar inventario." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      if (result.kind === "not_found") return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe o está inactivo." }, 404);
      if (result.kind === "invalid_products") return c.json({ error: "INVALID_PRODUCTS", message: "Uno o más productos no pertenecen a la organización." }, 400);
      return c.json({ id: result.countId, status: "draft", count_type: countType, line_count: result.lineCount }, 201);
    } catch {
      return c.json({ error: "INVENTORY_COUNT_CREATE_FAILED", message: "No se pudo registrar el conteo." }, 500);
    }
  });

  app.post("/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts/:countId/confirm", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId, countId } = c.req.param();
    if (![organizationId, branchId, warehouseId, countId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE_ID", message: "El identificador del recurso no es válido." }, 400);
    }
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx) => {
          const tenant = await resolveTenantContext(tx, token, organizationId, true);
          if (!tenant) return { kind: "unauthenticated" as const };
          if (!isInventoryOperator(tenant.role)) return { kind: "forbidden" as const };
          const branch = await resolveBranchContext(tx, tenant, branchId);
          if (!branch) return { kind: "branch_denied" as const };

          await tx.query(
            `SELECT id FROM warehouses
             WHERE organization_id = $1 AND branch_id = $2 AND id = $3
             FOR UPDATE`,
            [tenant.organizationId, branch.branchId, warehouseId],
          );
          const countResult = await tx.query<{
            id: string; count_type: "opening" | "physical"; status: "draft" | "confirmed" | "cancelled"; reason: string;
          }>(
            `SELECT id, count_type, status, reason FROM inventory_counts
             WHERE organization_id = $1 AND branch_id = $2 AND warehouse_id = $3 AND id = $4
             FOR UPDATE`,
            [tenant.organizationId, branch.branchId, warehouseId, countId],
          );
          const count = countResult.rows[0];
          if (!count) return { kind: "not_found" as const };
          if (count.status === "confirmed") return { kind: "replayed" as const, countId };
          if (count.status !== "draft") return { kind: "not_confirmable" as const };

          const lines = await tx.query<{
            product_id: string; counted_quantity: string; unit_cost_usd: string | null;
          }>(
            `SELECT product_id, counted_quantity::text, unit_cost_usd::text
             FROM inventory_count_lines
             WHERE organization_id = $1 AND count_id = $2
             ORDER BY product_id ASC`,
            [tenant.organizationId, countId],
          );
          if (!lines.rows.length) return { kind: "empty" as const };

          if (count.count_type === "opening") {
            const existingBalance = await tx.query(
              "SELECT 1 FROM inventory_balances WHERE organization_id = $1 AND warehouse_id = $2 LIMIT 1 FOR UPDATE",
              [tenant.organizationId, warehouseId],
            );
            if (existingBalance.rows.length) return { kind: "opening_balance_exists" as const };
          }
          await tx.query("UPDATE inventory_counts SET status = 'confirmed', confirmed_by = $1, confirmed_at = now() WHERE organization_id = $2 AND id = $3", [tenant.userId, tenant.organizationId, countId]);

          const changes: Array<{ product_id: string; previous_quantity: string; counted_quantity: string; delta: string }> = [];
          for (const line of lines.rows) {
            const current = await tx.query<{ on_hand_quantity: string }>(
              `SELECT on_hand_quantity::text FROM inventory_balances
               WHERE organization_id = $1 AND warehouse_id = $2 AND product_id = $3
               FOR UPDATE`,
              [tenant.organizationId, warehouseId, line.product_id],
            );
            const previous = current.rows[0]?.on_hand_quantity ?? "0.000";
            const deltaUnits = milliUnits(line.counted_quantity) - milliUnits(previous);
            const delta = formatMilliUnits(deltaUnits);
            await tx.query(
              `INSERT INTO inventory_balances
                (organization_id, branch_id, warehouse_id, product_id, on_hand_quantity)
               VALUES ($1, $2, $3, $4, $5::numeric)
               ON CONFLICT (organization_id, warehouse_id, product_id)
               DO UPDATE SET on_hand_quantity = EXCLUDED.on_hand_quantity, updated_at = now()`,
              [tenant.organizationId, branch.branchId, warehouseId, line.product_id, line.counted_quantity],
            );
            if ((count.count_type === "opening" && milliUnits(line.counted_quantity) > 0n) || (count.count_type === "physical" && deltaUnits !== 0n)) {
              const movementType = count.count_type === "opening" ? "opening" : "count_adjustment";
              await tx.query(
                `INSERT INTO warehouse_inventory_movements
                  (organization_id, branch_id, warehouse_id, product_id, movement_type, quantity_delta,
                   unit_cost_usd, reason, count_id, actor_user_id)
                 VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8, $9, $10)`,
                [tenant.organizationId, branch.branchId, warehouseId, line.product_id, movementType,
                  count.count_type === "opening" ? line.counted_quantity : delta, line.unit_cost_usd,
                  count.reason, countId, tenant.userId],
              );
            }
            changes.push({ product_id: line.product_id, previous_quantity: previous, counted_quantity: line.counted_quantity, delta });
          }

          await tx.query(
            `INSERT INTO audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, 'inventory.count.confirmed', 'inventory_count', $3, $4::jsonb)`,
            [tenant.organizationId, tenant.userId, countId, JSON.stringify({
              branch_id: branch.branchId, warehouse_id: warehouseId, count_type: count.count_type,
              reason: count.reason, changes,
            })],
          );
          return { kind: "confirmed" as const, countId, countType: count.count_type, changes };
        }),
      );
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para operar inventario." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      if (result.kind === "not_found") return c.json({ error: "COUNT_NOT_FOUND", message: "El conteo no existe." }, 404);
      if (result.kind === "not_confirmable") return c.json({ error: "COUNT_NOT_CONFIRMABLE", message: "El conteo no puede confirmarse." }, 409);
      if (result.kind === "empty") return c.json({ error: "EMPTY_COUNT", message: "El conteo no contiene líneas." }, 409);
      if (result.kind === "opening_balance_exists") return c.json({ error: "OPENING_ALREADY_EXISTS", message: "El almacén ya tiene saldos; no se puede aplicar una apertura." }, 409);
      if (result.kind === "replayed") return c.json({ id: result.countId, status: "confirmed", replayed: true }, 200);
      return c.json({ id: result.countId, status: "confirmed", count_type: result.countType, changes: result.changes }, 200);
    } catch {
      return c.json({ error: "INVENTORY_COUNT_CONFIRM_FAILED", message: "No se pudo confirmar el conteo." }, 500);
    }
  });
}
