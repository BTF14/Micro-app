import {
  calculateLineUsd,
  convertUsdToVes,
  formatNumeric,
  parseNumeric,
  sumNumeric,
} from "@micro-app/money";
import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Bindings } from "./bindings";
import { isTrustedOrigin } from "./auth";
import { consumeAuthRateLimit } from "./auth-rate-limit";
import { authorizeBranchOperation } from "./authorization";
import { readBodyWithinLimit } from "./bounded-body";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { lockBranchScopes } from "./branch-context";
import { resolveOpenCashierRegisterShift } from "./cashier-open-shift";
import { lockInventoryBalances, lockInventoryWarehouses } from "./inventory-locks";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_LINES = 100;
const MAX_PAYMENTS = 10;
const CHECKOUT_RATE_LIMIT_MAX = 60;
const CHECKOUT_RATE_LIMIT_WINDOW_SECONDS = 60;
const BCV_SOURCE = "BCV_OFFICIAL_HTML_V1";
const PAYMENT_METHODS = ["cash", "card", "transfer", "mobile_payment", "other"] as const;

type Currency = "USD" | "VES";
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type CheckoutLine = { productId: string; quantity: string };
type CheckoutPayment = { method: PaymentMethod; currency: Currency; amount: string; reference: string | null };
type CheckoutInput = { warehouseId: string; lines: CheckoutLine[]; payments: CheckoutPayment[]; currency: Currency };

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  price_usd: string;
  cost_usd: string;
};
type RateRow = { id: string; rate: string; effective_date: string; validation_status: "valid" | "stale" };
type ExistingSale = { id: string; status: string; request_hash: string | null };
type SaleHeader = {
  id: string;
  sale_number: string;
  status: string;
  settlement_currency: Currency;
  subtotal_usd: string;
  total_usd: string;
  total_ves_snapshot: string;
  exchange_rate_snapshot: string;
  created_at: string;
  completed_at: string | null;
};
type SaleLineRow = {
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: string;
  unit_price_usd: string;
  line_total_usd: string;
  line_total_ves: string;
};
type SalePaymentRow = {
  method: PaymentMethod;
  currency: Currency;
  amount: string;
  usd_equivalent_snapshot: string;
  exchange_rate_snapshot: string | null;
  reference: string | null;
};

type CheckoutResult =
  | { kind: "created" | "replayed"; sale: Record<string, unknown> }
  | { kind: "unauthenticated" | "forbidden" | "branch_denied" | "warehouse_not_found" |
      "shift_required" | "rate_unavailable" | "invalid_products" | "insufficient_stock" |
      "idempotency_conflict" | "invalid_payment" };

function caracasDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function isCaracasWeekend(now: Date): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", weekday: "short" }).format(now);
  return weekday === "Sat" || weekday === "Sun";
}
/** Select the same effective date enforced by migration 0017. */
export async function findApplicableCheckoutRate(tx: import("./database").DatabaseClient, now = new Date()): Promise<RateRow | null> {
  const today = caracasDate(now);
  const weekend = isCaracasWeekend(now);
  const comparison = weekend ? ">" : "<=";
  const ordering = weekend ? "ASC" : "DESC";
  const result = await tx.query<RateRow>(
    `SELECT id, rate::text AS rate, effective_date::text AS effective_date, validation_status
       FROM public.exchange_rates
      WHERE source = $1 AND effective_date ${comparison} $2::date
      ORDER BY effective_date ${ordering}, fetched_at DESC LIMIT 1`,
    [BCV_SOURCE, today],
  );
  const row = result.rows[0];
  if (!row || row.validation_status !== "valid") return null;
  if (weekend ? row.effective_date <= today : row.effective_date !== today) return null;
  return row;
}

function normalizeDecimal(value: unknown, precision: number, scale: number, positive: boolean): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = parseNumeric(value, precision, scale);
    if (positive ? parsed <= 0n : parsed < 0n) return null;
    return formatNumeric(parsed, precision, scale);
  } catch {
    return null;
  }
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001F\u007F]/.test(normalized)) return null;
  return normalized;
}

export function parseCheckoutInput(value: unknown): CheckoutInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["warehouse_id", "lines", "payments"].includes(key))) return null;
  if (typeof body.warehouse_id !== "string" || !UUID_PATTERN.test(body.warehouse_id)) return null;
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > MAX_LINES) return null;
  if (!Array.isArray(body.payments) || body.payments.length < 1 || body.payments.length > MAX_PAYMENTS) return null;

  const quantities = new Map<string, bigint>();
  for (const raw of body.lines) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const line = raw as Record<string, unknown>;
    if (Object.keys(line).some((key) => !["product_id", "quantity"].includes(key))) return null;
    if (typeof line.product_id !== "string" || !UUID_PATTERN.test(line.product_id)) return null;
    const quantity = normalizeDecimal(line.quantity, 14, 3, true);
    if (quantity === null) return null;
    const scaled = parseNumeric(quantity, 14, 3);
    const productId = line.product_id.toLowerCase();
    quantities.set(productId, (quantities.get(productId) ?? 0n) + scaled);
  }

  if (quantities.size < 1 || quantities.size > MAX_LINES) return null;
  let lines: CheckoutLine[];
  try {
    lines = [...quantities.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([productId, quantity]) => ({
        productId,
        quantity: formatNumeric(quantity, 14, 3),
      }));
  } catch {
    return null;
  }

  const payments: CheckoutPayment[] = [];
  for (const raw of body.payments) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const payment = raw as Record<string, unknown>;
    if (Object.keys(payment).some((key) => !["method", "currency", "amount", "reference"].includes(key))) return null;
    if (typeof payment.method !== "string" || !PAYMENT_METHODS.includes(payment.method as PaymentMethod)) return null;
    if (payment.currency !== "USD" && payment.currency !== "VES") return null;
    const scale = payment.currency === "USD" ? 4 : 2;
    const amount = normalizeDecimal(payment.amount, 14, scale, true);
    if (amount === null) return null;
    const reference = payment.reference === undefined || payment.reference === null
      ? null : boundedText(payment.reference, 128);
    if (payment.reference !== undefined && payment.reference !== null && reference === null) return null;
    payments.push({
      method: payment.method as PaymentMethod,
      currency: payment.currency,
      amount,
      reference,
    });
  }

  const currency = payments[0]!.currency;
  if (payments.some((payment) => payment.currency !== currency)) return null;
  payments.sort((a, b) => {
    const left = JSON.stringify(a);
    const right = JSON.stringify(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  try {
    sumNumeric(
      payments.map((payment) => payment.amount),
      14,
      currency === "USD" ? 4 : 2,
    );
  } catch {
    return null;
  }

  return { warehouseId: body.warehouse_id.toLowerCase(), lines, payments, currency };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function canonicalRequestHash(
  organizationId: string,
  branchId: string,
  userId: string,
  input: CheckoutInput,
): Promise<string> {
  return sha256Hex(JSON.stringify({
    organizationId: organizationId.toLowerCase(),
    branchId: branchId.toLowerCase(),
    userId: userId.toLowerCase(),
    warehouseId: input.warehouseId,
    currency: input.currency,
    lines: input.lines,
    payments: input.payments,
  }));
}

function divideProportionFloor(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) throw new RangeError("Proportion must be non-negative with a positive denominator.");
  return numerator / denominator;
}

export function allocateUsdEquivalents(
  payments: readonly CheckoutPayment[],
  currency: Currency,
  totalUsd: string,
  totalVes: string,
  rate: string,
): Array<{ amount: string; usdEquivalent: string; rateSnapshot: string | null }> {
  if (currency === "USD") {
    return payments.map((payment) => ({
      amount: payment.amount,
      usdEquivalent: payment.amount,
      rateSnapshot: null,
    }));
  }

  const totalVesUnits = parseNumeric(totalVes, 16, 2);
  const totalUsdUnits = parseNumeric(totalUsd, 14, 4);
  if (totalVesUnits <= 0n) throw new RangeError("VES settlement total must be positive.");

  let allocatedUsd = 0n;
  return payments.map((payment, index) => {
    const equivalent = index === payments.length - 1
      ? totalUsdUnits - allocatedUsd
      : divideProportionFloor(
          parseNumeric(payment.amount, 14, 2) * totalUsdUnits,
          totalVesUnits,
        );
    allocatedUsd += equivalent;
    return {
      amount: payment.amount,
      usdEquivalent: formatNumeric(equivalent, 14, 4),
      rateSnapshot: rate,
    };
  });
}

function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function loadSaleResponse(
  tx: import("./database").DatabaseClient,
  organizationId: string,
  saleId: string,
): Promise<Record<string, unknown> | null> {
  const header = await tx.query<SaleHeader>(
    `SELECT id, sale_number::text, status, settlement_currency,
            subtotal_usd::text, total_usd::text, total_ves_snapshot::text,
            exchange_rate_snapshot::text, created_at::text, completed_at::text
       FROM public.sales
      WHERE organization_id = $1 AND id = $2`,
    [organizationId, saleId],
  );
  const sale = header.rows[0];
  if (!sale) return null;
  const lines = await tx.query<SaleLineRow>(
    `SELECT product_id, product_name_snapshot, sku_snapshot, quantity::text,
            unit_price_usd::text, line_total_usd::text, line_total_ves::text
       FROM public.sale_items
      WHERE organization_id = $1 AND sale_id = $2
      ORDER BY product_id ASC`,
    [organizationId, saleId],
  );
  const payments = await tx.query<SalePaymentRow>(
    `SELECT method, currency, amount::text, usd_equivalent_snapshot::text,
            exchange_rate_snapshot::text, reference
       FROM public.payments
      WHERE organization_id = $1 AND sale_id = $2
      ORDER BY allocation_position ASC`,
    [organizationId, saleId],
  );
  return {
    id: sale.id,
    sale_number: sale.sale_number,
    status: sale.status,
    currency: sale.settlement_currency,
    subtotal_usd: sale.subtotal_usd,
    total_usd: sale.total_usd,
    total_ves: sale.total_ves_snapshot,
    bcv_rate: sale.exchange_rate_snapshot,
    created_at: sale.created_at,
    completed_at: sale.completed_at,
    lines: lines.rows,
    payments: payments.rows.map((payment) => {
      const amountUnits = parseNumeric(payment.amount, 14, 4);
      return {
        ...payment,
        amount: payment.currency === "VES"
          ? formatNumeric(amountUnits / 100n, 14, 2)
          : formatNumeric(amountUnits, 14, 4),
      };
    }),
  };
}

async function findExistingSale(
  tx: import("./database").DatabaseClient,
  organizationId: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<CheckoutResult | null> {
  const result = await tx.query<ExistingSale>(
    `SELECT id, status, request_hash
       FROM public.sales
      WHERE organization_id = $1 AND idempotency_key = $2
      LIMIT 1`,
    [organizationId, idempotencyKey],
  );
  const existing = result.rows[0];
  if (!existing) return null;
  if (existing.request_hash !== requestHash || existing.status !== "completed") {
    return { kind: "idempotency_conflict" };
  }
  const sale = await loadSaleResponse(tx, organizationId, existing.id);
  return sale ? { kind: "replayed", sale } : { kind: "idempotency_conflict" };
}

export function registerSalesCheckoutRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.post("/api/orgs/:organizationId/branches/:branchId/checkout", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const organizationId = c.req.param("organizationId");
    const branchId = c.req.param("branchId");
    if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(branchId)) {
      return c.json({ error: "INVALID_RESOURCE_ID", message: "El identificador del recurso no es válido." }, 400);
    }
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
      return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
      return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
    }
    const declaredLength = c.req.header("Content-Length");
    if (declaredLength !== undefined &&
        (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)) {
      return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la solicitud excede el límite." }, 413);
    }

    // Cloudflare overwrites CF-Connecting-IP at the edge. HMAC the address
    // before persistence; fail closed if the trusted edge identity or pepper
    // is missing rather than silently disabling the checkout abuse control.
    const clientIp = c.req.header("CF-Connecting-IP")?.trim();
    const rateLimitPepper = c.env.GOOGLE_CLIENT_SECRET;
    if (!clientIp || clientIp.length > 64 || !rateLimitPepper) {
      return c.json({ error: "RATE_LIMIT_UNAVAILABLE", message: "No se pudo verificar el límite de solicitudes." }, 503);
    }
    let rateLimit;
    try {
      rateLimit = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        consumeAuthRateLimit(
          client,
          `sales-checkout:ip:${clientIp}`,
          CHECKOUT_RATE_LIMIT_MAX,
          CHECKOUT_RATE_LIMIT_WINDOW_SECONDS,
          rateLimitPepper,
        ),
      );
    } catch {
      return c.json({ error: "RATE_LIMIT_UNAVAILABLE", message: "No se pudo verificar el límite de solicitudes." }, 503);
    }
    if (!rateLimit.allowed) {
      c.header("Retry-After", String(rateLimit.retryAfterSeconds));
      return c.json({ error: "RATE_LIMITED", message: "Demasiadas solicitudes de checkout. Inténtalo de nuevo más tarde." }, 429);
    }

    const sessionToken = getCookie(c, "microapp_session");
    if (!sessionToken || sessionToken.length > 128) {
      return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    }
    const idempotencyKey = c.req.header("Idempotency-Key");
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      return c.json({ error: "IDEMPOTENCY_KEY_REQUIRED", message: "Se requiere una clave de idempotencia válida." }, 400);
    }

    const body = await readBodyWithinLimit(c.req.raw.body, MAX_BODY_BYTES);
    if (body.kind === "too_large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite." }, 413);
    if (body.kind !== "ok") return c.json({ error: "INVALID_BODY", message: "El cuerpo no es válido." }, 400);
    let parsed: unknown;
    try { parsed = JSON.parse(body.text); } catch {
      return c.json({ error: "INVALID_JSON", message: "El JSON no es válido." }, 400);
    }
    const input = parseCheckoutInput(parsed);
    if (!input) {
      return c.json({ error: "INVALID_CHECKOUT", message: "Los datos del checkout no cumplen el contrato." }, 400);
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx): Promise<CheckoutResult> => {
          const authorization = await authorizeBranchOperation(
            tx, sessionToken, organizationId, branchId, "sales.create_list_price",
          );
          if (!authorization.allowed) {
            if (authorization.reason === "operation_denied") return { kind: "forbidden" };
            if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" };
            return { kind: "unauthenticated" };
          }
          const branch = authorization.context;
          const hash = await canonicalRequestHash(branch.organizationId, branch.branchId, branch.userId, input);

          const membershipLocked = await lockBranchScopes(tx, branch.organizationId, [{
            branchId: branch.branchId,
            userId: branch.userId,
            requiresMembership: true,
          }]);
          if (!membershipLocked) return { kind: "branch_denied" };

          const existingBeforeLocks = await findExistingSale(tx, branch.organizationId, idempotencyKey, hash);
          if (existingBeforeLocks) return existingBeforeLocks;

          const warehouses = await lockInventoryWarehouses(tx, branch.organizationId, [{
            warehouseId: input.warehouseId,
            branchId: branch.branchId,
          }]);
          if (!warehouses) return { kind: "warehouse_not_found" };

          const existingAfterWarehouseLock = await findExistingSale(tx, branch.organizationId, idempotencyKey, hash);
          if (existingAfterWarehouseLock) return existingAfterWarehouseLock;

          const shift = await resolveOpenCashierRegisterShift(tx, branch);
          if (!shift) return { kind: "shift_required" };

          const rate = await findApplicableCheckoutRate(tx);
          if (!rate) return { kind: "rate_unavailable" };

          const productIds = input.lines.map((line) => line.productId);
          const productsResult = await tx.query<ProductRow>(
            `SELECT id, sku, name, price_usd::text, cost_usd::text
               FROM public.products
              WHERE organization_id = $1
                AND id = ANY($2::uuid[])
                AND is_active = true
              ORDER BY id ASC
              FOR SHARE`,
            [branch.organizationId, productIds],
          );
          if (productsResult.rows.length !== input.lines.length) return { kind: "invalid_products" };
          const productById = new Map(productsResult.rows.map((product) => [product.id, product]));

          let computedLines: Array<{
            productId: string; name: string; sku: string; quantity: string;
            unitPriceUsd: string; unitCostUsd: string; lineUsd: string; lineVes: string;
          }>;
          let subtotalUsd: string;
          let totalVes: string;
          try {
            computedLines = input.lines.map((line) => {
              const product = productById.get(line.productId)!;
              const lineUsd = calculateLineUsd(line.quantity, product.price_usd);
              const lineVes = convertUsdToVes(lineUsd, rate.rate);
              return {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                quantity: line.quantity,
                unitPriceUsd: formatNumeric(parseNumeric(product.price_usd, 14, 4), 14, 4),
                unitCostUsd: formatNumeric(parseNumeric(product.cost_usd, 14, 4), 14, 4),
                lineUsd,
                lineVes,
              };
            });
            subtotalUsd = sumNumeric(computedLines.map((line) => line.lineUsd), 14, 4);
            totalVes = sumNumeric(computedLines.map((line) => line.lineVes), 16, 2);
          } catch {
            return { kind: "invalid_payment" };
          }
          if (parseNumeric(subtotalUsd, 14, 4) <= 0n || parseNumeric(totalVes, 16, 2) <= 0n) {
            return { kind: "invalid_payment" };
          }

          const paymentTotal = input.currency === "USD"
            ? sumNumeric(input.payments.map((payment) => payment.amount), 14, 4)
            : sumNumeric(input.payments.map((payment) => payment.amount), 14, 2);
          const expectedPaymentTotal = input.currency === "USD" ? subtotalUsd : totalVes;
          if (paymentTotal !== expectedPaymentTotal) return { kind: "invalid_payment" };

          const equivalents = allocateUsdEquivalents(
            input.payments, input.currency, subtotalUsd, totalVes, rate.rate,
          );

          // Lock and validate every required balance before claiming the sale.
          // No early return after the draft row is inserted may commit a draft.
          const balances = await lockInventoryBalances(
            tx, branch.organizationId, [input.warehouseId], productIds,
          );
          if (!balances) throw new Error("INVENTORY_BALANCE_LOCK_FAILED");
          const balanceByProduct = new Map(balances.map((balance) => [balance.product_id, balance]));
          for (const line of computedLines) {
            const balance = balanceByProduct.get(line.productId);
            if (!balance) return { kind: "insufficient_stock" };
            const available = parseNumeric(balance.on_hand_quantity, 14, 3) -
              parseNumeric(balance.reserved_quantity, 14, 3);
            if (available < parseNumeric(line.quantity, 14, 3)) return { kind: "insufficient_stock" };
          }

          const insertedSale = await tx.query<{ id: string }>(
            `INSERT INTO public.sales (
               organization_id, idempotency_key, status, subtotal_usd, total_usd,
               exchange_rate_id, exchange_rate_snapshot, total_ves_snapshot, created_by,
               branch_id, register_shift_id, warehouse_id, settlement_currency, request_hash
             ) VALUES (
               $1, $2, 'draft', $3::numeric, $3::numeric,
               $4, $5::numeric, $6::numeric, $7, $8, $9, $10, $11, $12
             )
             ON CONFLICT (organization_id, idempotency_key) DO NOTHING
             RETURNING id`,
            [
              branch.organizationId, idempotencyKey, subtotalUsd, rate.id, rate.rate, totalVes,
              branch.userId, branch.branchId, shift.id, input.warehouseId, input.currency, hash,
            ],
          );
          const saleId = insertedSale.rows[0]?.id;
          if (!saleId) {
            const raced = await findExistingSale(tx, branch.organizationId, idempotencyKey, hash);
            return raced ?? { kind: "idempotency_conflict" };
          }

          for (const line of computedLines) {
            const updated = await tx.query<{ on_hand_quantity: string }>(
              `UPDATE public.inventory_balances
                  SET on_hand_quantity = on_hand_quantity - $5::numeric,
                      updated_at = now()
                WHERE organization_id = $1 AND branch_id = $2
                  AND warehouse_id = $3 AND product_id = $4
                  AND on_hand_quantity - reserved_quantity >= $5::numeric
                RETURNING on_hand_quantity::text`,
              [branch.organizationId, branch.branchId, input.warehouseId, line.productId, line.quantity],
            );
            if (!updated.rows[0]) throw new Error("INVENTORY_BALANCE_UPDATE_FAILED");

            await tx.query(
              `INSERT INTO public.warehouse_inventory_movements (
                 organization_id, branch_id, warehouse_id, product_id, movement_type,
                 quantity_delta, unit_cost_usd, reason, reference_type, reference_id, actor_user_id
               ) VALUES ($1, $2, $3, $4, 'sale', -$5::numeric, $6::numeric,
                         'Sale checkout', 'sale', $7, $8)`,
              [
                branch.organizationId, branch.branchId, input.warehouseId, line.productId,
                line.quantity, line.unitCostUsd, saleId, branch.userId,
              ],
            );
          }

          for (const line of computedLines) {
            await tx.query(
              `INSERT INTO public.sale_items (
                 organization_id, sale_id, product_id, product_name_snapshot, sku_snapshot,
                 quantity, unit_price_usd, unit_cost_usd, line_total_usd, line_total_ves
               ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10::numeric)`,
              [
                branch.organizationId, saleId, line.productId, line.name, line.sku,
                line.quantity, line.unitPriceUsd, line.unitCostUsd, line.lineUsd, line.lineVes,
              ],
            );
          }

          for (let index = 0; index < input.payments.length; index += 1) {
            const payment = input.payments[index]!;
            const equivalent = equivalents[index]!;
            await tx.query(
              `INSERT INTO public.payments (
                 organization_id, sale_id, method, currency, amount,
                 usd_equivalent_snapshot, exchange_rate_snapshot, reference, received_by,
                 allocation_position
               ) VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric, $7::numeric, $8, $9, $10)`,
              [
                branch.organizationId, saleId, payment.method, payment.currency,
                payment.amount, equivalent.usdEquivalent, equivalent.rateSnapshot,
                payment.reference, branch.userId, index + 1,
              ],
            );
          }

          await tx.query(
            `INSERT INTO public.audit_logs (
               organization_id, actor_user_id, action, entity_type, entity_id, metadata
             ) VALUES ($1, $2, 'sale.completed', 'sale', $3, $4::jsonb)`,
            [
              branch.organizationId, branch.userId, saleId,
              JSON.stringify({
                branch_id: branch.branchId,
                warehouse_id: input.warehouseId,
                register_shift_id: shift.id,
                currency: input.currency,
                line_count: computedLines.length,
                idempotency_key: idempotencyKey,
                request_hash: hash,
                total_usd: subtotalUsd,
                total_ves: totalVes,
              }),
            ],
          );

          const completedSale = await tx.query<{ id: string }>(
            `UPDATE public.sales
                SET status = 'completed', completed_at = now()
              WHERE organization_id = $1 AND id = $2 AND status = 'draft'
              RETURNING id`,
            [branch.organizationId, saleId],
          );
          if (!completedSale.rows[0]) throw new Error("SALE_FINALIZATION_FAILED");

          const sale = await loadSaleResponse(tx, branch.organizationId, saleId);
          if (!sale) throw new Error("COMPLETED_SALE_RESPONSE_MISSING");
          return { kind: "created", sale };
        }),
      );

      switch (result.kind) {
        case "unauthenticated": return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
        case "forbidden": return c.json({ error: "FORBIDDEN", message: "No tienes permiso para registrar ventas." }, 403);
        case "branch_denied": return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
        case "warehouse_not_found": return c.json({ error: "WAREHOUSE_NOT_FOUND", message: "El almacén no existe o no pertenece a esta sucursal." }, 404);
        case "shift_required": return c.json({ error: "OPEN_SHIFT_REQUIRED", message: "Debes tener tu propio turno abierto para registrar la venta." }, 409);
        case "rate_unavailable": return c.json({ error: "BCV_RATE_NOT_CURRENT", message: "No se puede completar la venta sin una tasa BCV vigente." }, 409);
        case "invalid_products": return c.json({ error: "PRODUCT_NOT_AVAILABLE", message: "Uno o más productos no existen o están inactivos." }, 409);
        case "insufficient_stock": return c.json({ error: "INSUFFICIENT_STOCK", message: "La existencia disponible del almacén es insuficiente." }, 409);
        case "invalid_payment": return c.json({ error: "PAYMENT_TOTAL_INVALID", message: "Los pagos deben cubrir exactamente el total en una sola moneda." }, 400);
        case "idempotency_conflict": return c.json({ error: "IDEMPOTENCY_CONFLICT", message: "La clave ya fue utilizada con otra solicitud o una venta no finalizada." }, 409);
        case "replayed": return c.json(result.sale, 200);
        case "created": return c.json(result.sale, 201);
      }
    } catch (error) {
      const code = postgresCode(error);
      if (code === "23505") return c.json({ error: "IDEMPOTENCY_CONFLICT", message: "La clave de idempotencia ya fue utilizada." }, 409);
      if (code === "23503" || code === "23514" || code === "22P02") {
        return c.json({ error: "CHECKOUT_REJECTED", message: "La operación no cumple las reglas de integridad." }, 409);
      }
      return c.json({ error: "CHECKOUT_FAILED", message: "No se pudo completar la venta." }, 500);
    }
  });
}
