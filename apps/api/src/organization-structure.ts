import { getCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import type { Bindings } from "./bindings";
import { clearSessionCookie, isTrustedOrigin } from "./auth";
import { authorizeTenantOperation } from "./authorization";
import { readBodyWithinLimit } from "./bounded-body";
import { withDatabaseClient, withDatabaseTransaction } from "./database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 4 * 1024;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= max && !/[\u0000-\u001f\u007f]/.test(result) ? result : null;
}

function parseObject(value: unknown, allowed: string[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  return Object.keys(body).length > 0 && Object.keys(body).every((key) => allowed.includes(key)) ? body : null;
}

async function readJson(request: Request): Promise<{ kind: "ok"; value: unknown } | { kind: "invalid" } | { kind: "large" }> {
  const length = request.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) return { kind: "large" };
  const body = await readBodyWithinLimit(request.body, MAX_BODY);
  if (body.kind === "too_large") return { kind: "large" };
  if (body.kind === "invalid") return { kind: "invalid" };
  try { return { kind: "ok", value: JSON.parse(body.text) as unknown }; } catch { return { kind: "invalid" }; }
}

function mutationGuard(c: Context<{ Bindings: Bindings }>) {
  if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
    return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
    return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
  }
  return null;
}

function token(c: Context<{ Bindings: Bindings }>): string | null {
  const value = getCookie(c, "microapp_session");
  return value && value.length <= 128 ? value : null;
}

function dbFailure(c: Context<{ Bindings: Bindings }>, error: unknown) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
  const messages: Record<string, { status: 400 | 404 | 409 | 503; error: string; message: string }> = {
    "22023": { status: 400, error: "INVALID_STRUCTURE_INPUT", message: "Los datos de la estructura no son válidos." },
    "23505": { status: 409, error: "STRUCTURE_DUPLICATE", message: "Ya existe un elemento con ese código o identificador." },
    "23514": { status: 409, error: "STRUCTURE_CONFLICT", message: "No se puede cambiar la asignación mientras exista un turno abierto." },
    "P0002": { status: 404, error: "BRANCH_MEMBERSHIP_NOT_FOUND", message: "La asignación no existe." },
    "42501": { status: 403, error: "STRUCTURE_FORBIDDEN", message: "No tienes permiso para esta operación." },
    "42P01": { status: 503, error: "STRUCTURE_NOT_ENABLED", message: "La administración de estructura aún no está habilitada." },
    "42883": { status: 503, error: "STRUCTURE_NOT_ENABLED", message: "La administración de estructura aún no está habilitada." },
  };
  const known = messages[code];
  if (!known) console.error({ event: "ORGANIZATION_STRUCTURE_FAILED", code: code || "UNKNOWN" });
  const result = known ?? { status: 500 as const, error: "STRUCTURE_OPERATION_FAILED", message: "No se pudo completar la operación." };
  return c.json({ error: result.error, message: result.message }, result.status);
}


export function registerOrganizationStructureRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/structure", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const organizationId = c.req.param("organizationId");
    if (!UUID.test(organizationId)) return c.json({ error: "INVALID_ORGANIZATION_ID", message: "El identificador de organización no es válido." }, 400);
    const session = token(c);
    if (!session) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeTenantOperation(tx, session, organizationId, "organization_policy.manage", false);
        if (!auth.allowed) return { kind: auth.reason === "operation_denied" ? "forbidden" as const : "unauthenticated" as const };
        const branches = await tx.query(
          `SELECT b.id, b.name, b.slug, b.is_active,
                  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'code',w.code,'is_active',w.is_active) ORDER BY lower(w.name),w.id)
                    FROM public.warehouses w WHERE w.organization_id=b.organization_id AND w.branch_id=b.id),'[]'::jsonb) AS warehouses,
                  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'code',r.code,'is_active',r.is_active) ORDER BY lower(r.name),r.id)
                    FROM public.registers r WHERE r.organization_id=b.organization_id AND r.branch_id=b.id),'[]'::jsonb) AS registers
             FROM public.branches b WHERE b.organization_id=$1 ORDER BY lower(b.name),b.id`,
          [auth.context.organizationId],
        );
        const members = await tx.query(
          `SELECT m.user_id, u.display_name, u.email, m.role, m.is_active AS organization_active,
                  COALESCE(jsonb_object_agg(bm.branch_id::text,bm.is_active) FILTER (WHERE bm.branch_id IS NOT NULL),'{}'::jsonb) AS branch_memberships
             FROM public.organization_members m
             JOIN public.app_users u ON u.id=m.user_id
             LEFT JOIN public.branch_memberships bm ON bm.organization_id=m.organization_id AND bm.user_id=m.user_id
            WHERE m.organization_id=$1
            GROUP BY m.organization_id,m.user_id,u.display_name,u.email,m.role,m.is_active
            ORDER BY lower(u.display_name),m.user_id`,
          [auth.context.organizationId],
        );
        return { kind: "ok" as const, branches: branches.rows, members: members.rows };
      }));
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "Solo el Owner puede administrar la estructura organizacional." }, 403);
      return c.json({ branches: result.branches, members: result.members });
    } catch (error) { return dbFailure(c, error); }
  });

  app.post("/api/orgs/:organizationId/branches", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const org = c.req.param("organizationId");
    if (!UUID.test(org)) return c.json({ error: "INVALID_ORGANIZATION_ID", message: "El identificador de organización no es válido." }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const session = token(c); if (!session) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    const parsed = await readJson(c.req.raw);
    if (parsed.kind === "large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite." }, 413);
    if (parsed.kind === "invalid") return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    const body = parseObject(parsed.value, ["name", "slug"]);
    const name = body && text(body.name, 120), slug = body && text(body.slug, 80);
    if (!body || !name || !slug) return c.json({ error: "INVALID_BRANCH", message: "Nombre y código de sucursal son obligatorios." }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeTenantOperation(tx, session, org, "organization_policy.manage", false);
        if (!auth.allowed) return { kind: auth.reason === "operation_denied" ? "forbidden" as const : "unauthenticated" as const };
        const row = await tx.query("SELECT * FROM public.create_branch($1::uuid,$2::uuid,$3::text,$4::text)", [auth.context.organizationId,auth.context.userId,name,slug]);
        return { kind: "ok" as const, branch: row.rows[0] };
      }));
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "Solo el Owner puede crear sucursales." }, 403);
      return c.json({ branch: result.branch }, 201);
    } catch (error) { return dbFailure(c, error); }
  });

  const createChild = (kind: "warehouses" | "registers") => async (c: Context<{ Bindings: Bindings }>) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId)) return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const session = token(c); if (!session) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    const parsed = await readJson(c.req.raw);
    if (parsed.kind === "large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite." }, 413);
    if (parsed.kind === "invalid") return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    const body = parseObject(parsed.value, ["name", "code"]);
    const name = body && text(body.name, 120), code = body && text(body.code, 80);
    if (!body || !name || !code) return c.json({ error: "INVALID_STRUCTURE_ITEM", message: "Nombre y código son obligatorios." }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeTenantOperation(tx, session, org, "organization_policy.manage", false);
        if (!auth.allowed) return { kind: auth.reason === "operation_denied" ? "forbidden" as const : "unauthenticated" as const };
        const fn = kind === "warehouses" ? "create_warehouse" : "create_register";
        const row = await tx.query(`SELECT * FROM public.${fn}($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)`,
          [auth.context.organizationId,branchId,auth.context.userId,name,code]);
        return { kind: "ok" as const, item: row.rows[0] };
      }));
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "Solo el Owner puede administrar la estructura." }, 403);
      return c.json({ [kind === "warehouses" ? "warehouse" : "register"]: result.item }, 201);
    } catch (error) { return dbFailure(c, error); }
  };
  app.post("/api/orgs/:organizationId/branches/:branchId/warehouses", createChild("warehouses"));
  app.post("/api/orgs/:organizationId/branches/:branchId/registers", createChild("registers"));

  app.patch("/api/orgs/:organizationId/branches/:branchId/members/:userId", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId, userId } = c.req.param();
    if (![org,branchId,userId].every((id) => UUID.test(id))) return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const session = token(c); if (!session) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    const parsed = await readJson(c.req.raw);
    if (parsed.kind === "large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite." }, 413);
    if (parsed.kind === "invalid") return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    const body = parseObject(parsed.value, ["is_active"]);
    if (!body || typeof body.is_active !== "boolean") return c.json({ error: "INVALID_MEMBERSHIP", message: "El estado de la asignación no es válido." }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeTenantOperation(tx, session, org, "members.manage", false);
        if (!auth.allowed) return { kind: auth.reason === "operation_denied" ? "forbidden" as const : "unauthenticated" as const };
        const branchPermission = await authorizeTenantOperation(tx, session, org, "branch_memberships.manage", false);
        if (!branchPermission.allowed) return { kind: branchPermission.reason === "operation_denied" ? "forbidden" as const : "unauthenticated" as const };
        if (auth.context.userId !== branchPermission.context.userId || auth.context.organizationId !== branchPermission.context.organizationId) {
          return { kind: "forbidden" as const };
        }
        const row = await tx.query(
          "SELECT * FROM public.set_branch_membership_active($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::boolean)",
          [auth.context.organizationId,branchId,userId,auth.context.userId,body.is_active],
        );
        return { kind: "ok" as const, membership: row.rows[0] };
      }));
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "Solo el Owner puede administrar asignaciones." }, 403);
      return c.json({ membership: result.membership });
    } catch (error) { return dbFailure(c, error); }
  });
}
\n