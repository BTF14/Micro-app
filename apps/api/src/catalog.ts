import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient } from "./database";
import { resolveTenantContext, type OrganizationRole } from "./tenant-context";

const SESSION_COOKIE = "microapp_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

type CatalogRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
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
): CatalogQuery {
  const canReadCost =
    role === "owner" ||
    role === "admin" ||
    role === "inventory";

  const columns =
    "id, sku, barcode, name, description, unit, price_usd::text AS price_usd" +
    (canReadCost ? ", cost_usd::text AS cost_usd" : "");

  const statement = cursor
    ? "SELECT " + columns +
      " FROM products WHERE organization_id = $1 AND is_active = true AND id > $2" +
      " ORDER BY id ASC LIMIT $3"
    : "SELECT " + columns +
      " FROM products WHERE organization_id = $1 AND is_active = true" +
      " ORDER BY id ASC LIMIT $2";

  const values = cursor
    ? [organizationId, cursor, pageSize + 1]
    : [organizationId, pageSize + 1];

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
    if (pageSize === null || (cursor !== undefined && !UUID_PATTERN.test(cursor))) {
      return c.json(
        { error: "INVALID_CATALOG_QUERY", message: "Los parámetros de paginación no son válidos." },
        400,
      );
    }

    const sessionToken = getCookie(c, SESSION_COOKIE);
    if (!sessionToken || sessionToken.length > 128) {
      return c.json(
        { error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." },
        401,
      );
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, async (client) => {
        // The URL organization ID is only a selector. The resolver proves the
        // session, active user, active membership and active organization.
        const tenant = await resolveTenantContext(client, sessionToken, organizationId);
        if (!tenant) return { kind: "unauthenticated" as const };

        // Do not select cost_usd at all for Cashier. Do not select stock,
        // stock_quantity, branch or register data in this catalog-only phase.
        const query = buildCatalogQuery(tenant.role, tenant.organizationId, cursor, pageSize);
        const queryResult = await client.query<CatalogRow>(query.statement, query.values);
        const hasMore = queryResult.rows.length > pageSize;
        const pageRows = queryResult.rows.slice(0, pageSize);

        const items: CatalogItem[] = pageRows.map((row) => {
          const item = {
            id: row.id,
            sku: row.sku,
            barcode: row.barcode,
            name: row.name,
            description: row.description,
            unit: row.unit,
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
      });

      if (result.kind === "unauthenticated") {
        return c.json(
          { error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." },
          401,
        );
      }
      if (result.kind === "forbidden") {
        return c.json(
          { error: "FORBIDDEN", message: "No tienes permiso para consultar este catálogo." },
          403,
        );
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
