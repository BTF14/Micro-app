import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { clearSessionCookie, isTrustedOrigin } from "./auth";
import { authorizeBranchOperation } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { lockInventoryWarehouses } from "./inventory-locks";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_BODY_BYTES = 128 * 1024;
const MAX_LINES = 500;

type ReceiptLine = { product_id: string; quantity: string; unit_cost_usd: string };

function decimal(value: unknown, fractionDigits: number, maxIntegerDigits: number, allowZero: boolean): string | null {
  if (typeof value !== "string") return null;
  const pattern = new RegExp("^(0|[1-9][0-9]{0," + (maxIntegerDigits - 1) + "})(?:\\.[0-9]{1," + fractionDigits + "})?$");
  if (!pattern.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const scaled = BigInt(whole!) * 10n ** BigInt(fractionDigits) + BigInt(fraction.padEnd(fractionDigits, "0"));
  if (!allowZero && scaled === 0n) return null;
  return value;
}

function canonical(value: string, digits: number): string {
  const [whole, fraction = ""] = value.split(".");
  return whole + "." + fraction.padEnd(digits, "0");
}

async function requestHash(organizationId: string, branchId: string, warehouseId: string, reason: string, lines: ReceiptLine[]): Promise<string> {
  const normalized = JSON.stringify({
    organizationId: organizationId.toLowerCase(),
    branchId: branchId.toLowerCase(),
    warehouseId: warehouseId.toLowerCase(),
    reason,
    lines: [...lines].sort((a, b) => a.product_id.toLowerCase().localeCompare(b.product_id.toLowerCase())).map((line) => ({
      productId: line.product_id.toLowerCase(),
      quantity: canonical(line.quantity, 3),
      unitCost: canonical(line.unit_cost_usd, 4),
    })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

function parseReceiptBody(value: unknown): { reason: string; lines: ReceiptLine[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["reason", "lines"].includes(key))) return null;
  if (typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 500 ||
      /[\u0000-\u001F\u007F]/.test(body.reason)) return null;
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > MAX_LINES) return null;
  const seen = new Set<string>();
  const lines: ReceiptLine[] = [];
  for (const raw of body.lines) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const line = raw as Record<string, unknown>;
    if (Object.keys(line).some((key) => !["product_id", "quantity", "unit_cost_usd"].includes(key)) ||
        Object.keys(line).length !== 3 || typeof line.product_id !== "string" ||
        !UUID_PATTERN.test(line.product_id) || seen.has(line.product_id.toLowerCase())) return null;
    const quantity = decimal(line.quantity, 3, 11, false);
    const cost = decimal(line.unit_cost_usd, 4, 10, true);
    if (quantity === null || cost === null) return null;
    seen.add(line.product_id.toLowerCase());
    lines.push({ product_id: line.product_id.toLowerCase(), quantity: canonical(quantity, 3), unit_cost_usd: canonical(cost, 4) });
  }
  return { reason: body.reason.trim(), lines };
}

function postgresCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

export function registerInventoryReceiptRoutes(app: Hono<{ Bindings: Bindings }>): void {
  const root = "/api/orgs/:organizationId/branches/:branchId/warehouses/:warehouseId/receipts";

  app.get(root, async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    }
    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (db) => withDatabaseTransaction(db, async (tx) => {
        const auth = await authorizeBranchOperation(tx, token, organizationId, branchId, "inventory.read");
        if (!auth.allowed) {
          if (auth.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
          if (auth.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
          return { kind: "forbidden" as const };
        }
        const branch = auth.context;
        const locked = await lockInventoryWarehouses(tx, branch.organizationId, [{ warehouseId, branchId: branch.branchId }]);
        if (!locked) return { kind: "not_found" as const };
        const rows = await tx.query<{ id: string; reason: string; created_by: string; created_at: string; line_count: string }>(
          `SELECT r.id,r.reason,r.created_by,r.created_at::text AS created_at,
             count(l.product_id)::text AS line_count
           FROM public.inventory_receipts r
           LEFT JOIN public.inventory_receipt_lines l
             ON l.organization_id=r.organization_id AND l.receipt_id=r.id
           WHERE r.organization_id=$1 AND r.branch_id=$2 AND r.warehouse_id=$3
           GROUP BY r.id ORDER BY r.created_at DESC,r.id DESC LIMIT 50`,
          [branch.organizationId, branch.branchId, warehouseId],
        );
        return { kind: "ok" as const, receipts: rows.rows };
      }));
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar inventario." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      if (result.kind === "not_found") return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe o está inactivo." }, 404);
      return c.json({ receipts: result.receipts }, 200);
    } catch (error) {
      const code = postgresCode(error);
      if (code && ["42P01", "42883", "42703", "42501"].includes(code)) {
        return c.json({ error: "INVENTORY_RECEIPTS_NOT_ENABLED", message: "El registro de recepciones todavía no está habilitado en esta base de datos." }, 503);
      }
      return c.json({ error: "INVENTORY_RECEIPTS_READ_FAILED", message: "No se pudieron consultar las recepciones." }, 500);
    }
  });

  app.post(root, async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, warehouseId } = c.req.param();
    if (![organizationId, branchId, warehouseId].every((id) => UUID_PATTERN.test(id))) {
      return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
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
    const idempotencyKey = c.req.header("Idempotency-Key");
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      return c.json({ error: "INVALID_IDEMPOTENCY_KEY", message: "Se requiere una clave de idempotencia válida." }, 400);
    }
    const token = getCookie(c, "microapp_session");
    if (!token || token.length > 128) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    const raw = await readBoundedBody(c.req.raw);
    if (raw === null) return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo no es válido o excede el límite permitido." }, 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return c.json({ error: "INVALID_JSON", message: "El JSON no es válido." }, 400); }
    const input = parseReceiptBody(parsed);
    if (!input) return c.json({ error: "INVALID_RECEIPT", message: "El motivo o las líneas de recepción no son válidos." }, 400);
    const hash = await requestHash(organizationId, branchId, warehouseId, input.reason, input.lines);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (db) => withDatabaseTransaction(db, async (tx) => {
        const auth = await authorizeBranchOperation(tx, token, organizationId, branchId, "inventory.receive");
        if (!auth.allowed) {
          if (auth.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" as const };
          if (auth.reason === "branch_out_of_scope") return { kind: "branch_denied" as const };
          return { kind: "forbidden" as const };
        }
        const branch = auth.context;
        const created = await tx.query<{ receipt_id: string; replayed: boolean }>(
          "SELECT receipt_id,replayed FROM public.create_inventory_receipt($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
          [branch.organizationId, branch.branchId, warehouseId, branch.userId, input.reason, idempotencyKey, hash, JSON.stringify([...input.lines].sort((a, b) => a.product_id.localeCompare(b.product_id)))],
        );
        const row = created.rows[0];
        if (!row) throw new Error("INVENTORY_RECEIPT_RESULT_MISSING");
        return { kind: "ok" as const, id: row.receipt_id, replayed: row.replayed };
      }));
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para recibir mercancía." }, 403);
      if (result.kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
      return c.json({ id: result.id, status: "recorded", replayed: result.replayed }, result.replayed ? 200 : 201);
    } catch (error) {
      const code = postgresCode(error);
      const message = error instanceof Error ? error.message : "";
      if (code === "23505" && message.includes("INVENTORY_RECEIPT_IDEMPOTENCY_CONFLICT")) {
        return c.json({ error: "IDEMPOTENCY_KEY_REUSED", message: "La clave de idempotencia ya fue utilizada con una solicitud diferente." }, 409);
      }
      if (code === "23503" || message.includes("INVENTORY_RECEIPT_PRODUCT_OUT_OF_SCOPE")) {
        return c.json({ error: "INVALID_PRODUCTS", message: "Uno o más productos no pertenecen a esta organización." }, 400);
      }
      if (code === "42501") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para recibir mercancía en esta sucursal." }, 403);
      if (code === "22023") return c.json({ error: "INVALID_RECEIPT", message: "El motivo o las líneas de recepción no son válidos." }, 400);
      if (code && ["42P01", "42883", "42703"].includes(code)) {
        return c.json({ error: "INVENTORY_RECEIPTS_NOT_ENABLED", message: "El registro de recepciones todavía no está habilitado en esta base de datos." }, 503);
      }
      return c.json({ error: "INVENTORY_RECEIPT_CREATE_FAILED", message: "No se pudo registrar la recepción." }, 500);
    }
  });
}
