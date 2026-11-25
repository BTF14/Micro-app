import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { authorizeCommercialOperation, authorizeTenantOperation } from "./authorization";
import { clearSessionCookie } from "./auth";
import type { OrganizationRole } from "./tenant-context";

const SESSION_COOKIE = "microapp_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type NameCursor = { id: string; name: string; rank?: 0 | 1 | 2 };

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
  cursor_name?: string;
  cursor_rank?: number;
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
  sort: "id" | "name" = "id",
  cursorName?: string,
  cursorRank?: number,
): CatalogQuery {
  // Keep the SQL projection tied to the same central policy used by route authorization.
  const canReadCost = authorizeCommercialOperation(role, "catalog.read_costs");

  const normalizedSearch = search?.trim() ?? "";
  const columns =
    "id, is_active, sku, barcode, name, description, unit, quantity_mode, price_usd::text AS price_usd" +
    (sort === "name" ? ", lower(p.name) AS cursor_name" +
      (normalizedSearch ? ", CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END AS cursor_rank" : "") : "") +
    (canReadCost ? ", p.cost_usd::text AS cost_usd" : "");
  const escapedSearch = normalizedSearch.replace(/[\\%_]/g, (character) => "\\" + character);
  const values: unknown[] = [organizationId];
  const filters: string[] = [];
  if (normalizedSearch) {
    values.push(normalizedSearch, `%${escapedSearch}%`);
    filters.push("(barcode = $2 OR lower(sku) = lower($2) OR name ILIKE $3 ESCAPE '\\' OR sku ILIKE $3 ESCAPE '\\' OR barcode ILIKE $3 ESCAPE '\\')");
  }
  if (cursor) {
    if (sort === "name") {
      if (cursorName === undefined) throw new Error("A name cursor requires its normalized name.");
      if (normalizedSearch) {
        if (cursorRank === undefined) throw new Error("A searched name cursor requires its search rank.");
        values.push(cursorRank);
        const rankParameter = values.length;
        values.push(cursorName);
        const nameParameter = values.length;
        values.push(cursor);
        filters.push("(CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END, lower(p.name), p.id) > ($" + rankParameter + ", $" + nameParameter + ", $" + values.length + ")");
        filters.push("p.id <> $" + values.length);
      } else {
        values.push(cursorName);
        const nameParameter = values.length;
        values.push(cursor);
        filters.push("(lower(p.name), p.id) > ($" + nameParameter + ", $" + values.length + ")");
        filters.push("p.id <> $" + values.length);
      }
    } else {
      values.push(cursor); filters.push(`id > $${values.length}`);
    }
  }
  values.push(pageSize + 1);
  const order = sort === "name"
    ? (normalizedSearch
      ? "CASE WHEN p.barcode = $2 THEN 0 WHEN lower(p.sku) = lower($2) THEN 1 ELSE 2 END, lower(p.name) ASC, p.id ASC"
      : "lower(name) ASC, id ASC")
    : (normalizedSearch
      ? "CASE WHEN barcode = $2 OR lower(sku) = lower($2) THEN 0 ELSE 1 END, id ASC"
      : "id ASC");
  const statement = "SELECT " + columns + " FROM products p WHERE " +
    ["organization_id = $1", ...filters].join(" AND ") +
    " ORDER BY " + order + ` LIMIT $${values.length}`;

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
    const sortValue = c.req.query("sort");
    const sort: "id" | "name" = sortValue === undefined ? "id" : sortValue as "id" | "name";
    if (search.length > 120) return c.json({ error: "INVALID_CATALOG_QUERY", message: "La búsqueda no puede superar 120 caracteres." }, 400);
    const nameCursor = cursor !== undefined && sort === "name" ? decodeNameCursor(cursor, search.length > 0) : null;
    if (pageSize === null ||
        (cursor !== undefined && (sort === "name" ? nameCursor === null : !UUID_PATTERN.test(cursor))) ||
        (sortValue !== undefined && sortValue !== "id" && sortValue !== "name")) {
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

          // Validate cursor ownership, but keep its page-boundary sort tuple immutable.
          let cursorName: string | undefined;
          let cursorRank: number | undefined;
          const cursorId = sort === "name" ? nameCursor?.id : cursor;
          if (cursorId && sort === "name" && nameCursor) {
            const cursorRow = await transaction.query<{ cursor_exists: number }>(
              "SELECT 1 AS cursor_exists FROM products WHERE organization_id = $1 AND id = $2",
              [tenant.organizationId, cursorId],
            );
            if (!cursorRow.rows[0]) return { kind: "invalid_cursor" as const };
            cursorName = nameCursor.name;
            cursorRank = nameCursor.rank;
          }
          // Do not select cost_usd at all for Cashier. Do not select stock,
          // stock_quantity, branch or register data in this catalog-only phase.
          const query = buildCatalogQuery(tenant.role, tenant.organizationId, cursorId, pageSize, search, sort, cursorName, cursorRank);
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
              nextCursor: hasMore
                ? sort === "name"
                  ? encodeNameCursor({
                    id: pageRows[pageRows.length - 1]!.id,
                    name: pageRows[pageRows.length - 1]!.cursor_name!,
                    ...(search ? { rank: pageRows[pageRows.length - 1]!.cursor_rank as 0 | 1 | 2 } : {}),
                  })
                  : pageRows[pageRows.length - 1]!.id
                : null,
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
      if (result.kind === "invalid_cursor") return c.json({ error: "INVALID_CATALOG_CURSOR", message: "El cursor no pertenece a esta organización." }, 400);
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
