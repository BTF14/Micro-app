import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { authorizeCommercialOperation, authorizeTenantOperation } from "./authorization";
import { clearSessionCookie } from "./auth";
import type { OrganizationRole } from "./tenant-context";

const SESSION_COOKIE = "microapp_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

type CatalogRow = {
  id: string;
  is_active: boolean;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  quantity_mode: "integer" | "fractional";
  price_usd: string;
  cost_usd?: string;
};

type CatalogItem = Omit<CatalogRow, "cost_usd"> & { cost_usd?: string };


type CatalogQuery = {
  statement: string;
  values: unknown[];
  canReadCost: boolean;
};

export function buildCatalogQuery(
  role: OrganizationRole,
  organizationId: string,
  cursor: string | undefined,
  pageSize: number,
  search?: string,
): CatalogQuery {
  // Keep the SQL projection tied to the same central policy used by route authorization.
  const canReadCost = authorizeCommercialOperation(role, "catalog.read_costs");

  const columns =
    "id, is_active, sku, barcode, name, description, unit, quantity_mode, price_usd::text AS price_usd" +
    (canReadCost ? ", cost_usd::text AS cost_usd" : "");

  const normalizedSearch = search?.trim() ?? "";
  const escapedSearch = normalizedSearch.replace(/[\\%_]/g, (character) => "\\" + character);
  const values: unknown[] = [organizationId];
  const filters: string[] = [];
  if (normalizedSearch) {
    values.push(normalizedSearch, `%${escapedSearch}%`);
    filters.push("(barcode = $2 OR lower(sku) = lower($2) OR name ILIKE $3 ESCAPE '\\' OR sku ILIKE $3 ESCAPE '\\' OR barcode ILIKE $3 ESCAPE '\\')");
  }
  if (cursor) { values.push(cursor); filters.push(`id > $${values.length}`); }
  values.push(pageSize + 1);
  const statement = "SELECT " + columns + " FROM products WHERE " +
    ["organization_id = $1", ...filters].join(" AND ") +
    (normalizedSearch ? " ORDER BY CASE WHEN barcode = $2 OR lower(sku) = lower($2) THEN 0 ELSE 1 END, id ASC" : " ORDER BY id ASC") +
    ` LIMIT $${values.length}`;

  return { statement, values, canReadCost };
}

function parsePageSize(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_PAGE_SIZE;
  if (!/^[1-9][0-9]*$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_PAGE_SIZE) return null;
  return parsed;
}

export function registerCatalogRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/catalog", async (c) => {
    // Tenant-specific catalog and price data must never enter a shared cache.
    c.header("Cache-Control", "private, no-store");

    const organizationId = c.req.param("organizationId");
    if (!UUID_PATTERN.test(organizationId)) {
      return c.json(
        { error: "INVALID_ORGANIZATION_ID", message: "El identificador de organización no es válido." },
        400,
      );
    }

    const pageSize = parsePageSize(c.req.query("limit"));
    const cursor = c.req.query("cursor");
    const search = c.req.query("q")?.trim() ?? "";
    if (search.length > 120) return c.json({ error: "INVALID_CATALOG_QUERY", message: "La búsqueda no puede superar 120 caracteres." }, 400);
    if (pageSize === null || (cursor !== undefined && !UUID_PATTERN.test(cursor))) {
      return c.json(
        { error: "INVALID_CATALOG_QUERY", message: "Los parámetros de paginación no son válidos." },
        400,
      );
    }

    const sessionToken = getCookie(c, SESSION_COOKIE);
    if (!sessionToken || sessionToken.length > 128) {
      clearSessionCookie(c);
      return c.json(
        { error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." },
        401,
      );
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (transaction) => {
          // Hold the active session, user, organization and membership locks
          // through the tenant-scoped catalog read so revocation serializes.
          const authorization = await authorizeTenantOperation(transaction, sessionToken, organizationId, "catalog.read");
          if (!authorization.allowed) {
            return authorization.reason === "operation_denied"
              ? { kind: "forbidden" as const }
              : { kind: "unauthenticated" as const };
          }
          const tenant = authorization.context;

          // Do not select cost_usd at all for Cashier. Do not select stock,
          // stock_quantity, branch or register data in this catalog-only phase.
          const query = buildCatalogQuery(tenant.role, tenant.organizationId, cursor, pageSize, search);
          const queryResult = await transaction.query<CatalogRow>(query.statement, query.values);
          const hasMore = queryResult.rows.length > pageSize;
          const pageRows = queryResult.rows.slice(0, pageSize);

          const items: CatalogItem[] = pageRows.map((row) => {
            const item = {
              id: row.id,
              is_active: row.is_active,
              sku: row.sku,
              barcode: row.barcode,
              name: row.name,
              description: row.description,
              unit: row.unit,
              quantity_mode: row.quantity_mode,
              price_usd: row.price_usd,
            };
            return query.canReadCost ? { ...item, cost_usd: row.cost_usd! } : item;
          });

          return {
            kind: "ok" as const,
            body: {
              items,
              nextCursor: hasMore ? pageRows[pageRows.length - 1]!.id : null,
              limit: pageSize,
            },
          };
        }),
      );

      if (result.kind === "unauthenticated") {
        return c.json(
          { error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." },
          401,
        );
      }
      if (result.kind === "forbidden") {
        return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar el catálogo." }, 403);
      }
      return c.json(result.body, 200);
    } catch {
      // Never expose database errors, SQL, session material or product costs.
      return c.json(
        { error: "CATALOG_LOOKUP_FAILED", message: "No se pudo consultar el catálogo." },
        500,
      );
    }
  });
}
