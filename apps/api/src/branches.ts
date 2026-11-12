import { getCookie } from "hono/cookie";
import type { Hono } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { authorizeTenantOperation } from "./authorization";
import { clearSessionCookie } from "./auth";

const SESSION_COOKIE = "microapp_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BRANCHES = 100;

type BranchRow = { id: string; name: string; slug: string };

/**
 * Lists only the active branches the authenticated member may operate in.
 * owner/admin have organization-wide scope; cashier/inventory are limited to
 * active branch_memberships (same rule as resolveBranchContext). This is scope
 * discovery for the UI; every branch-scoped route still authorizes server-side.
 * Any role holding inventory.read may list scope; no new permission is created.
 */
export function registerBranchRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/branches", async (c) => {
    c.header("Cache-Control", "private, no-store");

    const organizationId = c.req.param("organizationId");
    if (!UUID_PATTERN.test(organizationId)) {
      return c.json({ error: "INVALID_ORGANIZATION_ID", message: "El identificador de organización no es válido." }, 400);
    }

    const token = getCookie(c, SESSION_COOKIE);
    if (!token || token.length > 128) {
      clearSessionCookie(c);
      return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    }

    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
        withDatabaseTransaction(client, async (tx) => {
          const authorization = await authorizeTenantOperation(tx, token, organizationId, "inventory.read");
          if (!authorization.allowed) {
            return authorization.reason === "operation_denied"
              ? { kind: "forbidden" as const }
              : { kind: "unauthenticated" as const };
          }
          const tenant = authorization.context;
          const rows = await tx.query<BranchRow>(
            `SELECT b.id, b.name, b.slug
               FROM branches b
              WHERE b.organization_id = $1
                AND b.is_active = true
                AND (
                  $3::boolean
                  OR EXISTS (
                    SELECT 1
                      FROM branch_memberships bm
                     WHERE bm.organization_id = b.organization_id
                       AND bm.branch_id = b.id
                       AND bm.user_id = $2
                       AND bm.is_active = true
                  )
                )
              ORDER BY lower(b.name), b.id
              LIMIT $4`,
            [tenant.organizationId, tenant.userId, tenant.role === "owner" || tenant.role === "admin", MAX_BRANCHES],
          );
          return { kind: "ok" as const, branches: rows.rows };
        }),
      );

      if (result.kind === "unauthenticated") {
        clearSessionCookie(c);
        return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      }
      if (result.kind === "forbidden") {
        return c.json({ error: "FORBIDDEN", message: "No tienes permiso para consultar sucursales." }, 403);
      }
      return c.json({ branches: result.branches.map((row) => ({ id: row.id, name: row.name, slug: row.slug })) });
    } catch {
      return c.json({ error: "BRANCH_LIST_FAILED", message: "No se pudieron consultar las sucursales." }, 500);
    }
  });
}
