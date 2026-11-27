import { getCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import type { Bindings } from "./bindings";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { clearSessionCookie, isTrustedOrigin } from "./auth";
import { enforceRuntimeWriteRateLimit } from "./runtime-write-rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 4096;
type Ctx = Context<{ Bindings: Bindings }>;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function inputText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= max && !/[\u0000-\u001f\u007f]/.test(result) ? result : null;
}
async function readBody(c: Ctx): Promise<Record<string, unknown> | null> {
  const length = c.req.header("Content-Length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) return null;
  const raw = await c.req.text();
  if (raw.length > MAX_BODY) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
async function authorize(c: Ctx) {
  const token = getCookie(c, "microapp_session");
  if (!token || token.length > 128) return { kind: "unauthenticated" as const };
  const hash = await sha256Hex(token);
  return withDatabaseClient(c.env.DATABASE_URL, async (db) => {
    const result = await db.query<{ user_id: string; allowed: boolean }>(
      `SELECT s.user_id,
              (u.is_active AND u.google_sub IS NOT NULL AND pa.is_active) AS allowed
         FROM public.auth_sessions s
         JOIN public.app_users u ON u.id=s.user_id
         LEFT JOIN public.platform_admins pa ON pa.user_id=u.id
        WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
        LIMIT 1`, [hash]);
    const row = result.rows[0];
    if (!row) return { kind: "unauthenticated" as const };
    return row.allowed ? { kind: "ok" as const, userId: row.user_id } : { kind: "forbidden" as const };
  });
}
function mutationGuard(c: Ctx) {
  if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
  return null;
}
function dbError(c: Ctx, error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const map: Record<string, { status: 400|403|404|409; error: string; message: string }> = {
    "22023": { status: 400, error: "INVALID_PLATFORM_INPUT", message: "Los datos suministrados no son válidos." },
    "42501": { status: 403, error: "PLATFORM_ADMIN_FORBIDDEN", message: "No tienes permisos para esta operación." },
    "P0002": { status: 404, error: "PLATFORM_RESOURCE_NOT_FOUND", message: "El recurso solicitado no existe." },
    "23505": { status: 409, error: "PLATFORM_CONFLICT", message: "Ya existe un registro con esos datos." },
    "23514": { status: 409, error: "PLATFORM_CONFLICT", message: "La operación incumple una regla de seguridad." },
  };
  const result = map[code];
  return result ? c.json({ error: result.error, message: result.message }, result.status) : c.json({ error: "PLATFORM_OPERATION_FAILED", message: "No se pudo completar la operación." }, 500);
}

export function registerPlatformAdminRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/platform/overview", async (c) => {
    c.header("Cache-Control", "private, no-store");
    try {
      const auth = await authorize(c);
      if (auth.kind === "unauthenticated") { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
      if (auth.kind === "forbidden") return c.json({ error: "PLATFORM_ADMIN_FORBIDDEN", message: "Acceso exclusivo a administradores de plataforma." }, 403);
      const data = await withDatabaseClient(c.env.DATABASE_URL, async (db) => {
        const organizations = await db.query(
          `SELECT o.id,o.name,o.slug,o.is_active,o.created_at,
             (SELECT count(*)::int FROM public.organization_members m WHERE m.organization_id=o.id AND m.is_active) AS member_count,
             (SELECT count(*)::int FROM public.branches b WHERE b.organization_id=o.id AND b.is_active) AS branch_count,
             (SELECT jsonb_build_object('email',u.email,'display_name',u.display_name)
                FROM public.organization_members m JOIN public.app_users u ON u.id=m.user_id
               WHERE m.organization_id=o.id AND m.role='owner' AND m.is_active LIMIT 1) AS owner,
             (SELECT jsonb_build_object('email',i.email,'created_at',i.created_at)
                FROM public.organization_invitations i WHERE i.organization_id=o.id AND i.role='owner' AND i.status='pending'
               ORDER BY i.created_at DESC LIMIT 1) AS pending_owner_invitation
            FROM public.organizations o ORDER BY o.created_at DESC,o.id`);
        const admins = await db.query(
          `SELECT pa.user_id,u.email,u.display_name,pa.is_active,pa.note,pa.created_at
             FROM public.platform_admins pa JOIN public.app_users u ON u.id=pa.user_id
            ORDER BY pa.created_at,pa.user_id`);
        const audit = await db.query(
          `SELECT l.id,l.action,l.target_organization_id,l.target_user_id,l.metadata,l.created_at,u.email AS actor_email
             FROM public.platform_audit_logs l JOIN public.app_users u ON u.id=l.actor_user_id
            ORDER BY l.created_at DESC,l.id DESC LIMIT 50`);
        return { organizations: organizations.rows, admins: admins.rows, audit_logs: audit.rows };
      });
      return c.json(data);
    } catch (error) { return dbError(c, error); }
  });

  app.post("/api/platform/organizations", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const guard = mutationGuard(c); if (guard) return guard;
    const auth = await authorize(c);
    if (auth.kind === "unauthenticated") { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
    if (auth.kind === "forbidden") return c.json({ error: "PLATFORM_ADMIN_FORBIDDEN", message: "Acceso exclusivo a administradores de plataforma." }, 403);
    const body = await readBody(c);
    const name = body && inputText(body.name,120), slug = body && inputText(body.slug,80), email = body && inputText(body.owner_email,320), note = body?.note === undefined || body.note === null ? null : inputText(body.note,500);
    if (!body || Object.keys(body).some(k=>!["name","slug","owner_email","note"].includes(k)) || !name || !slug || !email || (body.note != null && !note) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return c.json({ error: "INVALID_PLATFORM_INPUT", message: "Nombre, código y correo del Owner deben ser válidos." },400);
    const limited = await enforceRuntimeWriteRateLimit(c,"platform:organization:create",5); if (limited) return limited;
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, db => withDatabaseTransaction(db, async tx => {
        const rows = await tx.query("SELECT * FROM public.platform_create_organization($1::uuid,$2::text,$3::text,$4::text,$5::text)",[auth.userId,name,slug,email,note]);
        return rows.rows[0];
      }));
      return c.json({ organization: result },201);
    } catch (error) { return dbError(c,error); }
  });

  app.patch("/api/platform/organizations/:organizationId", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const guard = mutationGuard(c); if (guard) return guard;
    const organizationId=c.req.param("organizationId");
    if(!UUID.test(organizationId)) return c.json({error:"INVALID_ORGANIZATION_ID",message:"El identificador no es válido."},400);
    const auth=await authorize(c);
    if(auth.kind==="unauthenticated"){clearSessionCookie(c);return c.json({error:"UNAUTHENTICATED",message:"Inicia sesión para continuar."},401);}
    if(auth.kind==="forbidden")return c.json({error:"PLATFORM_ADMIN_FORBIDDEN",message:"Acceso exclusivo a administradores de plataforma."},403);
    const body=await readBody(c);
    const note=body?.note===undefined||body.note===null?null:inputText(body.note,500);
    if(!body||typeof body.is_active!=="boolean"||Object.keys(body).some(k=>!["is_active","note"].includes(k))||(body.note!=null&&!note))return c.json({error:"INVALID_PLATFORM_INPUT",message:"Indica un estado válido y una nota opcional."},400);
    const limited=await enforceRuntimeWriteRateLimit(c,"platform:organization:status",10);if(limited)return limited;
    try{
      const result=await withDatabaseClient(c.env.DATABASE_URL,db=>withDatabaseTransaction(db,async tx=>{
        const rows=await tx.query("SELECT * FROM public.platform_set_organization_active($1::uuid,$2::uuid,$3::boolean,$4::text)",[auth.userId,organizationId,body.is_active,note]);
        return rows.rows[0];
      }));
      return c.json({organization:result});
    }catch(error){return dbError(c,error);}
  });

  app.post("/api/platform/admins", async (c) => {
    c.header("Cache-Control","private, no-store");
    const guard=mutationGuard(c);if(guard)return guard;
    const auth=await authorize(c);
    if(auth.kind==="unauthenticated"){clearSessionCookie(c);return c.json({error:"UNAUTHENTICATED",message:"Inicia sesión para continuar."},401);}
    if(auth.kind==="forbidden")return c.json({error:"PLATFORM_ADMIN_FORBIDDEN",message:"Acceso exclusivo a administradores de plataforma."},403);
    const body=await readBody(c);
    const email=body&&inputText(body.email,320),note=body?.note===undefined||body.note===null?null:inputText(body.note,500);
    if(!body||typeof body.is_active!=="boolean"||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||Object.keys(body).some(k=>!["email","is_active","note"].includes(k))||(body.note!=null&&!note))return c.json({error:"INVALID_PLATFORM_INPUT",message:"Correo, estado y nota deben ser válidos."},400);
    const limited=await enforceRuntimeWriteRateLimit(c,"platform:admin:access",5);if(limited)return limited;
    try{
      const result=await withDatabaseClient(c.env.DATABASE_URL,db=>withDatabaseTransaction(db,async tx=>{
        const rows=await tx.query("SELECT * FROM public.platform_set_admin_access($1::uuid,$2::text,$3::boolean,$4::text)",[auth.userId,email,body.is_active,note]);
        return rows.rows[0];
      }));
      return c.json({admin:result});
    }catch(error){return dbError(c,error);}
  });
}
