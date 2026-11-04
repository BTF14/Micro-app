import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Bindings } from "./bindings";
import { isTrustedOrigin } from "./auth";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { resolveTenantContext } from "./tenant-context";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16 * 1024;

type ProductInput = {
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  costUsd: string;
  priceUsd: string;
  minimumStock: string;
};

type ProductRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  cost_usd: string;
  price_usd: string;
  minimum_stock: string;
  is_active: boolean;
};

function boundedText(value: unknown, maxLength: number, required: boolean): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if ((!normalized && required) || normalized.length > maxLength) return null;
  return normalized;
}

function decimalValue(value: unknown, scale: number, maxIntegerDigits: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  const pattern = new RegExp(`^(?:0|[1-9][0-9]{0,${maxIntegerDigits - 1}})(?:\\.[0-9]{1,${scale}})?$`);
  if (!pattern.test(raw)) return null;
  return raw.includes(".") ? raw : raw + ".0";
}

function parseProductInput(value: unknown): ProductInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const allowed = new Set(["sku", "barcode", "name", "description", "unit", "cost_usd", "price_usd", "minimum_stock"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return null;

  const sku = boundedText(body.sku, 80, true);
  const name = boundedText(body.name, 240, true);
  const unit = body.unit === undefined ? "unidad" : boundedText(body.unit, 40, true);
  const barcode = body.barcode === undefined || body.barcode === null ? null : boundedText(body.barcode, 128, true);
  const description = body.description === undefined || body.description === null ? null : boundedText(body.description, 2000, false);
  const costUsd = body.cost_usd === undefined ? "0.0" : decimalValue(body.cost_usd, 4, 10);
  const priceUsd = decimalValue(body.price_usd, 4, 10);
  const minimumStock = body.minimum_stock === undefined ? "0.0" : decimalValue(body.minimum_stock, 3, 11);

  if (
    sku === null || name === null || unit === null || barcode === null && body.barcode !== undefined && body.barcode !== null ||
    description === null && body.description !== undefined && body.description !== null ||
    costUsd === null || priceUsd === null || minimumStock === null
  ) return null;

  return { sku, barcode, name, description, unit, costUsd, priceUsd, minimumStock };
}

function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export function registerCatalogWriteRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.post("/api/orgs/:organizationId/catalog", async (c) => {
    c.header("Cache-Control", "private, no-store");

    const organizationId = c.req.param("organizationId");
    if (!UUID_PATTERN.test(organizationId)) {
      return c.json({ error: "INVALID_ORGANIZATION_ID", message: "El identificador de organización no es válido." }, 400);
    }
    if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
      return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
    }
    if (!/^application\\/json(?:\\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
      return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
    }
    const declaredLength = c.req.header("Content-Length");
    if (declaredLength !== undefined && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)) {
      return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la solicitud excede el límite." }, 413);
    }

    let rawBody: string;
    try {
      rawBody = await c.req.text();
    } catch {
      return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    }
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la solicitud excede el límite." }, 413);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    }
    const input = parseProductInput(parsed);
    if (!input) {
      return c.json({ error: "INVALID_PRODUCT", message: "Los datos del producto no son válidos." }, 400);
    }

    try {
      const sessionToken = getCookie(c, "microapp_session");
      if (!sessionToken || sessionToken.length > 128) {
        return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      }

      const result = await withDatabaseClient(c.env.DATABASE_URL, async (client) =>
        withDatabaseTransaction(client, async (transaction) => {
          const tenant = await resolveTenantContext(transaction, sessionToken, organizationId, true);
          if (!tenant) return { kind: "unauthenticated" as const };
          if (tenant.role !== "owner" && tenant.role !== "admin") {
            return { kind: "forbidden" as const };
          }

          const inserted = await transaction.query<ProductRow>(
            `INSERT INTO products
              (organization_id, sku, barcode, name, description, unit, cost_usd, price_usd, minimum_stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8::numeric, $9::numeric)
             RETURNING id, sku, barcode, name, description, unit,
                       cost_usd::text AS cost_usd, price_usd::text AS price_usd,
                       minimum_stock::text AS minimum_stock, is_active`,
            [tenant.organizationId, input.sku, input.barcode, input.name, input.description, input.unit, input.costUsd, input.priceUsd, input.minimumStock],
          );
          const product = inserted.rows[0];
          if (!product) throw new Error("Product insert returned no row.");

          await transaction.query(
            `INSERT INTO audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, 'product.created', 'product', $3, $4::jsonb)`,
            [tenant.organizationId, tenant.userId, product.id, JSON.stringify({ sku: product.sku, changed_fields: ["sku", "barcode", "name", "description", "unit", "cost_usd", "price_usd", "minimum_stock"] })],
          );

          return {
            kind: "created" as const,
            product: {
              id: product.id, sku: product.sku, barcode: product.barcode, name: product.name,
              description: product.description, unit: product.unit, price_usd: product.price_usd,
              cost_usd: product.cost_usd, minimum_stock: product.minimum_stock, is_active: product.is_active,
            },
          };
        }),
      );

      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para crear productos." }, 403);
      return c.json(result.product, 201);
    } catch (error) {
      if (postgresCode(error) === "23505") {
        return c.json({ error: "PRODUCT_CONFLICT", message: "Ya existe un producto con ese SKU o código de barras." }, 409);
      }
      if (postgresCode(error) === "23514" || postgresCode(error) === "22P02") {
        return c.json({ error: "INVALID_PRODUCT", message: "Los datos del producto no son válidos." }, 400);
      }
      return c.json({ error: "PRODUCT_CREATE_FAILED", message: "No se pudo crear el producto." }, 500);
    }
  });
}
