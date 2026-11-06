import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { isTrustedOrigin } from "./auth";
import { authorizeBranchOperation } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { lockInventoryBalances, lockInventoryWarehouses } from "./inventory-locks";


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 128 * 1024;
const MAX_COUNT_LINES = 500;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

type CountLineInput = { productId: string; quantity: string; unitCost: string | null };

function readDecimal(value: unknown, allowZero: boolean, maxFractionDigits = 3, maxIntegerDigits = 11): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  const integerPattern = maxIntegerDigits === 10 ? "(?:0|[1-9][0-9]{0,9})" : "(?:0|[1-9][0-9]{0,10})";
  const decimalPattern = new RegExp("^" + integerPattern + "(?:\\.[0-9]{1," + maxFractionDigits + "})?$");
  if (!decimalPattern.test(raw)) return null;
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
      ? null : readDecimal(line.unit_cost_usd, true, 4, 10);
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
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
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

function canonicalDecimal(value: string, fractionDigits: number): string {
  const [whole, fraction = ""] = value.split(".");
  return whole + "." + fraction.padEnd(fractionDigits, "0");
}

async function hashCountRequest(input: {
  organizationId: string; branchId: string; warehouseId: string; countType: string;
  reason: string; lines: CountLineInput[];
}): Promise<string> {
  const canonical = JSON.stringify({
    organizationId: input.organizationId.toLowerCase(),
    branchId: input.branchId.toLowerCase(),
    warehouseId: input.warehouseId.toLowerCase(),
    countType: input.countType, reason: input.reason,
    lines: [...input.lines].sort((left, right) => left.productId.toLowerCase().localeCompare(right.productId.toLowerCase())).map((line) => ({
      productId: line.productId.toLowerCase(), quantity: canonicalDecimal(line.quantity, 3),
      unitCost: line.unitCost === null ? null : canonicalDecimal(line.unitCost, 4),
    })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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
    const idempotencyKey = c.req.header("Idempotency-Key");
    if (idempotencyKey === undefined || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      return c.json({ error: "INVALID_IDEMPOTENCY_KEY", message: "La clave de idempotencia no tiene un formato válido." }, 400);
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx) => {
          const authorization = await authorizeBranchOperation(tx, token, organizationId, branchId, "inventory.adjust");
          if (!authorization.allowed) {
            if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
            if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
            return { kind: "forbidden" as const };
          }
          const branch = authorization.context;
          const tenant = { userId: branch.userId, organizationId: branch.organizationId };
          const lockedWarehouses = await lockInventoryWarehouses(tx, tenant.organizationId, [{ warehouseId, branchId: branch.branchId }]);
          if (!lockedWarehouses) return { kind: "not_found" as const };

          const productIds = input.lines.map((line) => line.productId);
          const products = await tx.query<{ id: string }>(
            `SELECT id FROM products WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
            [tenant.organizationId, productIds],
          );
          if (products.rows.length !== productIds.length) return { kind: "invalid_products" as const };

          const requestHash = await hashCountRequest({
            organizationId: tenant.organizationId, branchId: branch.branchId, warehouseId, countType,
            reason: input.reason, lines: input.lines,
          });
          const inserted = await tx.query<{ id: string }> (
            `INSERT INTO inventory_counts
              (organization_id, branch_id, warehouse_id, count_type, reason, created_by, idempotency_key, request_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (organization_id, created_by, idempotency_key)
               WHERE idempotency_key IS NOT NULL
             DO NOTHING
             RETURNING id`,
            [tenant.organizationId, branch.branchId, warehouseId, countType, input.reason, tenant.userId, idempotencyKey, requestHash],
          );
          if (!inserted.rows[0]) {
            const existing = await tx.query<{
              id: string; status: "draft" | "confirmed" | "cancelled"; count_type: "opening" | "physical";
              request_hash: string; line_count: number;
            }>(
              `SELECT c.id, c.status, c.count_type, c.request_hash,
                      (SELECT count(*)::int FROM inventory_count_lines l
                       WHERE l.organization_id = c.organization_id AND l.count_id = c.id) AS line_count
               FROM inventory_counts c
               WHERE c.organization_id = $1 AND c.created_by = $2 AND c.idempotency_key = $3
               FOR UPDATE OF c`,
              [tenant.organizationId, tenant.userId, idempotencyKey],
            );
            const replay = existing.rows[0];
            if (!replay) throw new Error("IDEMPOTENCY_RECORD_NOT_VISIBLE");
            if (replay.request_hash !== requestHash) return { kind: "idempotency_conflict" as const };
            return { kind: "replayed" as const, countId: replay.id, status: replay.status,
              countType: replay.count_type, lineCount: replay.line_count };
          }
          // Claim the idempotency key/document before locking balances. A replay
          // returns above without holding stock locks; new documents follow the
          // global warehouse -> document -> balances lock order.
          const capturedBalances = countType === "physical"
            ? await lockInventoryBalances(tx, tenant.organizationId, [warehouseId], productIds)
            : [];
          if (capturedBalances === null) throw new Error("INVENTORY_LOCK_INVALID_SCOPE");
          const capturedByProduct = new Map(capturedBalances.map((balance) => [balance.product_id, balance]));

          const countId = inserted.rows[0].id;
          for (const line of input.lines) {
            await tx.query(
              `INSERT INTO inventory_count_lines
                (organization_id, branch_id, warehouse_id, count_id, product_id, counted_quantity, unit_cost_usd,
                 expected_on_hand_quantity, expected_balance_version)
               VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, $9::bigint)`,
              [tenant.organizationId, branch.branchId, warehouseId, countId, line.productId, line.quantity, line.unitCost,
                countType === "physical" ? (capturedByProduct.get(line.productId)?.on_hand_quantity ?? "0.000") : null,
                countType === "physical" ? (capturedByProduct.get(line.productId)?.balance_version ?? "0") : null],
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
      if (result.kind === "idempotency_conflict") return c.json({ error: "IDEMPOTENCY_KEY_REUSED", message: "La clave de idempotencia ya fue utilizada con una solicitud diferente." }, 409);
      if (result.kind === "replayed") return c.json({ id: result.countId, status: result.status, count_type: result.countType, line_count: result.lineCount, replayed: true }, 200);
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
          const authorization = await authorizeBranchOperation(tx, token, organizationId, branchId, "inventory.adjust");
          if (!authorization.allowed) {
            if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
            if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
            return { kind: "forbidden" as const };
          }
          const branch = authorization.context;
          const tenant = { userId: branch.userId, organizationId: branch.organizationId };

          const lockedWarehouses = await lockInventoryWarehouses(tx, tenant.organizationId, [{ warehouseId, branchId: branch.branchId }]);
          if (!lockedWarehouses) return { kind: "warehouse_not_found" as const };
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
            expected_on_hand_quantity: string | null; expected_balance_version: string | null;
          }>(
            `SELECT product_id, counted_quantity::text, unit_cost_usd::text,
                    expected_on_hand_quantity::text, expected_balance_version::text
             FROM inventory_count_lines
             WHERE organization_id = $1 AND count_id = $2
             ORDER BY product_id ASC`,
            [tenant.organizationId, countId],
          );
          if (!lines.rows.length) return { kind: "empty" as const };

          const balanceProductIds = count.count_type === "opening"
            ? undefined
            : lines.rows.map((line) => line.product_id);
          const existingBalances = await lockInventoryBalances(
            tx,
            tenant.organizationId,
            [warehouseId],
            balanceProductIds,
          );
          if (existingBalances === null) return { kind: "invalid_lock_scope" as const };
          const balanceByProduct = new Map(existingBalances.map((balance) => [balance.product_id, balance]));
          if (count.count_type === "opening" && existingBalances.length) {
            return { kind: "opening_balance_exists" as const };
          }
          if (count.count_type === "physical") {
            for (const line of lines.rows) {
              const currentBalance = balanceByProduct.get(line.product_id);
              const currentOnHand = currentBalance?.on_hand_quantity ?? "0.000";
              const currentVersion = currentBalance?.balance_version ?? "0";
              if (line.expected_on_hand_quantity === null || line.expected_balance_version === null ||
                  BigInt(line.expected_balance_version) !== BigInt(currentVersion) ||
                  milliUnits(line.expected_on_hand_quantity) !== milliUnits(currentOnHand)) {
                return { kind: "stale_count" as const, productId: line.product_id,
                  expectedQuantity: line.expected_on_hand_quantity, currentQuantity: currentOnHand,
                  expectedVersion: line.expected_balance_version, currentVersion };
              }
              const reserved = balanceByProduct.get(line.product_id)?.reserved_quantity ?? "0.000";
              if (milliUnits(line.counted_quantity) < milliUnits(reserved)) {
                return { kind: "below_reserved" as const, productId: line.product_id, reservedQuantity: reserved };
              }
            }
          }
          await tx.query("UPDATE inventory_counts SET status = 'confirmed', confirmed_by = $1, confirmed_at = now() WHERE organization_id = $2 AND id = $3", [tenant.userId, tenant.organizationId, countId]);

          const changes: Array<{ product_id: string; previous_quantity: string; counted_quantity: string; delta: string }> = [];
          for (const line of lines.rows) {
            // Every relevant balance row was locked above in product UUID order.
            // Re-read from that locked snapshot; do not acquire per-product locks
            // after the batch lock or introduce a second lock-order path.
            const previous = balanceByProduct.get(line.product_id)?.on_hand_quantity ?? "0.000";
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
      if (result.kind === "warehouse_not_found") return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe o está inactivo." }, 404);
      if (result.kind === "invalid_lock_scope") return c.json({ error: "INVENTORY_LOCK_INVALID_SCOPE", message: "El alcance de bloqueo de inventario no es válido." }, 500);
      if (result.kind === "not_found") return c.json({ error: "COUNT_NOT_FOUND", message: "El conteo no existe." }, 404);
      if (result.kind === "not_confirmable") return c.json({ error: "COUNT_NOT_CONFIRMABLE", message: "El conteo no puede confirmarse." }, 409);
      if (result.kind === "empty") return c.json({ error: "EMPTY_COUNT", message: "El conteo no contiene líneas." }, 409);
      if (result.kind === "opening_balance_exists") return c.json({ error: "OPENING_ALREADY_EXISTS", message: "El almacén ya tiene saldos; no se puede aplicar una apertura." }, 409);
      if (result.kind === "stale_count") return c.json({ error: "COUNT_STALE", message: "El inventario cambió desde que se creó este conteo. Crea un nuevo conteo físico antes de confirmar.", product_id: result.productId, expected_on_hand_quantity: result.expectedQuantity, current_on_hand_quantity: result.currentQuantity, expected_balance_version: result.expectedVersion, current_balance_version: result.currentVersion }, 409);
      if (result.kind === "below_reserved") return c.json({ error: "COUNT_BELOW_RESERVED_STOCK", message: "La cantidad contada no puede ser inferior a las existencias reservadas.", product_id: result.productId, reserved_quantity: result.reservedQuantity }, 409);
      if (result.kind === "replayed") return c.json({ id: result.countId, status: "confirmed", replayed: true }, 200);
      return c.json({ id: result.countId, status: "confirmed", count_type: result.countType, changes: result.changes }, 200);
    } catch {
      return c.json({ error: "INVENTORY_COUNT_CONFIRM_FAILED", message: "No se pudo confirmar el conteo." }, 500);
    }
  });
  app.get("/api/orgs/:organizationId/branches/:branchId/warehouses", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId } = c.req.param();
    if (![organizationId, branchId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    }
    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    const limitValue = c.req.query("limit");
    const limit = limitValue === undefined ? 50 : Number(limitValue);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return c.json({ error: "INVALID_LIMIT", message: "El límite debe estar entre 1 y 100." }, 400);
    }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, async (db) => {
        const authorization = await authorizeBranchOperation(db, token, organizationId, branchId, "inventory.management.read", false);
        if (!authorization.allowed) {
          if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
          if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
          return { kind: "forbidden" as const };
        }
        const branch = authorization.context;
        const tenant = { organizationId: branch.organizationId };
        const warehouses = await db.query<{
          id: string; code: string; name: string; is_active: boolean; created_at: string; updated_at: string;
        }>(
          `SELECT id, code, name, is_active, created_at, updated_at
           FROM warehouses
           WHERE organization_id = $1 AND branch_id = $2
           ORDER BY lower(name), id
           LIMIT $3`,
          [tenant.organizationId, branch.branchId, limit],
        );
        return { kind: "ok" as const, warehouses: warehouses.rows };
      });
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar inventario." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      return c.json({ warehouses: result.warehouses });
    } catch {
      return c.json({ error: "WAREHOUSE_LIST_FAILED", message: "No se pudieron consultar los almacenes." }, 500);
    }
  });

  app.get("/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/counts", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    }
    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    const limitValue = c.req.query("limit");
    const limit = limitValue === undefined ? 50 : Number(limitValue);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return c.json({ error: "INVALID_LIMIT", message: "El límite debe estar entre 1 y 100." }, 400);
    }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, async (db) => {
        const authorization = await authorizeBranchOperation(db, token, organizationId, branchId, "inventory.management.read", false);
        if (!authorization.allowed) {
          if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
          if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
          return { kind: "forbidden" as const };
        }
        const branch = authorization.context;
        const tenant = { organizationId: branch.organizationId };
        const warehouse = await db.query<{ id: string }>(
          "SELECT id FROM warehouses WHERE organization_id = $1 AND branch_id = $2 AND id = $3",
          [tenant.organizationId, branch.branchId, warehouseId],
        );
        if (!warehouse.rows[0]) return { kind: "not_found" as const };
        const counts = await db.query<{
          id: string; count_type: string; status: string; reason: string;
          created_by: string; confirmed_by: string | null; created_at: string; confirmed_at: string | null;
          line_count: string;
        }>(
          `SELECT c.id, c.count_type, c.status, c.reason, c.created_by, c.confirmed_by,
                  c.created_at, c.confirmed_at, count(l.product_id)::text AS line_count
           FROM inventory_counts c
           LEFT JOIN inventory_count_lines l
             ON l.organization_id = c.organization_id AND l.count_id = c.id
           WHERE c.organization_id = $1 AND c.branch_id = $2 AND c.warehouse_id = $3
           GROUP BY c.id
           ORDER BY c.created_at DESC, c.id DESC
           LIMIT $4`,
          [tenant.organizationId, branch.branchId, warehouseId, limit],
        );
        return { kind: "ok" as const, counts: counts.rows };
      });
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar inventario." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      if (result.kind === "not_found") return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe." }, 404);
      return c.json({ counts: result.counts });
    } catch {
      return c.json({ error: "INVENTORY_COUNT_LIST_FAILED", message: "No se pudieron consultar los conteos." }, 500);
    }
  });

}
