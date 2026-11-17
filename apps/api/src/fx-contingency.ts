import { getCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import { formatNumeric, parseNumeric } from "@micro-app/money";
import type { Bindings } from "./bindings";
import { clearSessionCookie, isTrustedOrigin } from "./auth";
import { consumeAuthRateLimit } from "./auth-rate-limit";
import { readBodyWithinLimit } from "./bounded-body";
import { resolveBranchContext } from "./branch-context";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { hashFxPin, verifyFxPin } from "./fx-pin";
import { resolveTenantContext } from "./tenant-context";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 8 * 1024;
const PIN_LIMIT = 5;
const PIN_WINDOW_SECONDS = 15 * 60;

type RequestContext = Context<{ Bindings: Bindings }>;
type Tenant = NonNullable<Awaited<ReturnType<typeof resolveTenantContext>>>;

function session(c: RequestContext): string | null {
  const value = getCookie(c, "microapp_session");
  return value && value.length <= 128 ? value : null;
}

function mutationGuard(c: RequestContext) {
  if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
    return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
    return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
  }
  return null;
}

async function readJson(request: Request): Promise<unknown | null> {
  const length = request.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) return null;
  const result = await readBodyWithinLimit(request.body, MAX_BODY);
  if (result.kind !== "ok") return null;
  try { return JSON.parse(result.text) as unknown; } catch { return null; }
}

function object(value: unknown, allowed: string[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  return Object.keys(body).every((key) => allowed.includes(key)) ? body : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= max && !/[\u0000-\u001f\u007f]/.test(result) ? result : null;
}

function normalizeRate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const amount = parseNumeric(value, 18, 8);
    return amount > 0n ? formatNumeric(amount, 18, 8) : null;
  } catch { return null; }
}

function postgresCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code : null;
}

function failure(c: RequestContext, error: unknown) {
  const code = postgresCode(error);
  const known: Record<string, { status: 400 | 403 | 404 | 409 | 503; error: string; message: string }> = {
    "23505": { status: 409, error: "FX_CONFLICT", message: "Ya existe una autorización activa o una delegación equivalente." },
    "23514": { status: 409, error: "FX_POLICY_REJECTED", message: "La operación no cumple la política de contingencia." },
    "23503": { status: 409, error: "FX_SCOPE_INVALID", message: "La organización, sucursal o actor ya no tiene el alcance requerido." },
    "42501": { status: 403, error: "FX_FORBIDDEN", message: "No tienes permiso para esta operación." },
    "42P01": { status: 503, error: "FX_NOT_ENABLED", message: "La gestión cambiaria todavía no está habilitada en esta base de datos." },
    "42883": { status: 503, error: "FX_NOT_ENABLED", message: "La gestión cambiaria todavía no está habilitada en esta base de datos." },
  };
  const result = (code && known[code]) || { status: 500 as const, error: "FX_OPERATION_FAILED", message: "No se pudo completar la operación cambiaria." };
  if (!code || !known[code]) console.error({ event: "FX_CONTINGENCY_FAILURE", code: code ?? "UNKNOWN" });
  return c.json({ error: result.error, message: result.message }, result.status);
}

async function resolveActor(tx: import("./database").DatabaseClient, token: string, orgId: string): Promise<
  { kind: "ok"; tenant: Tenant } | { kind: "unauthenticated" | "forbidden" }
> {
  const tenant = await resolveTenantContext(tx, token, orgId, true);
  if (!tenant) return { kind: "unauthenticated" };
  if (tenant.role !== "owner" && tenant.role !== "admin") return { kind: "forbidden" };
  return { kind: "ok", tenant };
}

async function authorizeBranch(
  tx: import("./database").DatabaseClient, tenant: Tenant, branchId: string,
): Promise<"ok" | "unauthenticated" | "branch_denied" | "delegation_required"> {
  const branch = await resolveBranchContext(tx, tenant, branchId, false);
  if (!branch) return "branch_denied";
  if (tenant.role === "admin") {
    const assignment = await tx.query<{ allowed: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM public.branch_memberships bm
         JOIN public.fx_contingency_delegations d
           ON d.organization_id=bm.organization_id AND d.branch_id=bm.branch_id
          AND d.user_id=bm.user_id AND d.status='active'
        WHERE bm.organization_id=$1 AND bm.branch_id=$2
          AND bm.user_id=$3 AND bm.is_active
       ) AS allowed`,
      [tenant.organizationId, branchId, tenant.userId],
    );
    if (!assignment.rows[0]?.allowed) return "delegation_required";
  }
  return "ok";
}

async function verifyAndRateLimitPin(
  tx: import("./database").DatabaseClient, c: RequestContext, tenant: Tenant, pin: unknown,
): Promise<"ok" | "invalid" | "limited" | "unavailable"> {
  const pepper = c.env.FX_PIN_PEPPER;
  const ratePepper = c.env.FX_PIN_RATE_LIMIT_PEPPER;
  if (!pepper || pepper.length < 32 || !ratePepper || ratePepper.length < 32) return "unavailable";
  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Real-IP") ?? "unknown";
  const account = await consumeAuthRateLimit(tx, `fx-pin:user:${tenant.organizationId}:${tenant.userId}`, PIN_LIMIT, PIN_WINDOW_SECONDS, ratePepper);
  const address = await consumeAuthRateLimit(tx, `fx-pin:ip:${ip}`, PIN_LIMIT * 3, PIN_WINDOW_SECONDS, ratePepper);
  if (!account.allowed || !address.allowed) return "limited";
  const result = await tx.query<{
    kdf_version: string; iterations: number; salt_base64: string; hash_base64: string;
  }>(
    `SELECT kdf_version, iterations, pg_catalog.encode(salt,'base64') AS salt_base64,
            pg_catalog.encode(pin_hash,'base64') AS hash_base64
       FROM public.fx_user_pin_credentials
      WHERE organization_id=$1 AND user_id=$2`,
    [tenant.organizationId, tenant.userId],
  );
  return await verifyFxPin(pin, result.rows[0] ?? null, tenant.organizationId, tenant.userId, pepper) ? "ok" : "invalid";
}

function authFailure(c: RequestContext, kind: string) {
  if (kind === "unauthenticated") { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401); }
  if (kind === "delegation_required") return c.json({ error: "FX_DELEGATION_REQUIRED", message: "El administrador necesita una delegación activa para esta sucursal." }, 403);
  if (kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes acceso a esta sucursal." }, 403);
  return c.json({ error: "FORBIDDEN", message: "No tienes permiso para esta operación." }, 403);
}

export function registerFxContingencyRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/fx-delegated-branches", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const org = c.req.param("organizationId");
    if (!UUID.test(org)) return c.json({ error: "INVALID_ORGANIZATION_ID" }, 400);
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        const rows = await tx.query(
          `SELECT branch.id,branch.name,branch.slug
             FROM public.branches branch
            WHERE branch.organization_id=$1 AND branch.is_active
              AND (
                $2::text='owner'
                OR EXISTS (
                  SELECT 1 FROM public.branch_memberships bm
                  JOIN public.fx_contingency_delegations d
                    ON d.organization_id=bm.organization_id AND d.branch_id=bm.branch_id
                   AND d.user_id=bm.user_id AND d.status='active'
                  WHERE bm.organization_id=branch.organization_id
                    AND bm.branch_id=branch.id AND bm.user_id=$3 AND bm.is_active
                )
              )
            ORDER BY lower(branch.name),branch.id`,
          [actor.tenant.organizationId, actor.tenant.role, actor.tenant.userId],
        );
        return { kind: "ok" as const, branches: rows.rows };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.json({ branches: result.branches });
    } catch (error) { return failure(c, error); }
  });

  app.put("/api/orgs/:organizationId/fx-pin", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const org = c.req.param("organizationId");
    if (!UUID.test(org)) return c.json({ error: "INVALID_ORGANIZATION_ID" }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    const body = object(await readJson(c.req.raw), ["pin", "current_pin"]);
    if (!body || typeof body.pin !== "string" || !/^[0-9]{8,32}$/.test(body.pin) ||
        (body.current_pin !== undefined && typeof body.current_pin !== "string")) {
      return c.json({ error: "INVALID_FX_PIN", message: "El PIN debe contener entre 8 y 32 dígitos." }, 400);
    }
    if (!c.env.FX_PIN_PEPPER || c.env.FX_PIN_PEPPER.length < 32 ||
        !c.env.FX_PIN_RATE_LIMIT_PEPPER || c.env.FX_PIN_RATE_LIMIT_PEPPER.length < 32) {
      return c.json({ error: "FX_PIN_NOT_CONFIGURED", message: "La configuración segura del PIN no está disponible." }, 503);
    }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        const existing = await tx.query<{ kdf_version: string; iterations: number; salt_base64: string; hash_base64: string }>(
          `SELECT kdf_version,iterations,pg_catalog.encode(salt,'base64') AS salt_base64,
                  pg_catalog.encode(pin_hash,'base64') AS hash_base64
             FROM public.fx_user_pin_credentials WHERE organization_id=$1 AND user_id=$2 FOR UPDATE`,
          [actor.tenant.organizationId, actor.tenant.userId],
        );
        if (existing.rows[0]) {
          const checked = await verifyAndRateLimitPin(tx, c, actor.tenant, body.current_pin);
          if (checked !== "ok") return { kind: checked === "limited" ? "limited" as const : checked === "unavailable" ? "unavailable" as const : "invalid" as const };
        }
        const hash = await hashFxPin(body.pin, actor.tenant.organizationId, actor.tenant.userId, c.env.FX_PIN_PEPPER!);
        await tx.query(
          `SELECT public.set_fx_user_pin_credential(
             $1::uuid,$2::uuid,$3::text,$4::integer,
             pg_catalog.decode($5,'base64'),pg_catalog.decode($6,'base64')
           )`,
          [actor.tenant.organizationId, actor.tenant.userId, hash.kdfVersion, hash.iterations, hash.saltBase64, hash.hashBase64],
        );
        await tx.query(
          `INSERT INTO public.audit_logs
             (organization_id,actor_user_id,action,entity_type,entity_id,metadata)
           VALUES ($1,$2,'fx.pin.configured','fx_pin_credential',$3,$4::jsonb)`,
          [actor.tenant.organizationId, actor.tenant.userId, actor.tenant.userId,
            JSON.stringify({ kdf_version: hash.kdfVersion, iterations: hash.iterations })],
        );
        return { kind: "ok" as const };
      }));
      if (result.kind === "unauthenticated" || result.kind === "forbidden") return authFailure(c, result.kind);
      if (result.kind === "limited") return c.json({ error: "FX_PIN_RATE_LIMITED" }, 429);
      if (result.kind === "unavailable") return c.json({ error: "FX_PIN_NOT_CONFIGURED" }, 503);
      if (result.kind === "invalid") return c.json({ error: "FX_PIN_INVALID" }, 403);
      return c.json({ status: "configured" }, 200);
    } catch (error) { return failure(c, error); }
  });

  app.get("/api/orgs/:organizationId/branches/:branchId/fx-delegations", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId)) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        if (actor.tenant.role !== "owner") return { kind: "forbidden" as const };
        const rows = await tx.query(
          `SELECT d.id,d.user_id,u.display_name,d.granted_by_user_id,d.created_at
             FROM public.fx_contingency_delegations d
             JOIN public.app_users u ON u.id=d.user_id
            WHERE d.organization_id=$1 AND d.branch_id=$2 AND d.status='active'
            ORDER BY lower(u.display_name),d.user_id`,
          [actor.tenant.organizationId, branchId],
        );
        return { kind: "ok" as const, delegations: rows.rows };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.json({ delegations: result.delegations });
    } catch (error) { return failure(c, error); }
  });

  app.post("/api/orgs/:organizationId/branches/:branchId/fx-delegations", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId)) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    const body = object(await readJson(c.req.raw), ["user_id"]);
    if (!body || typeof body.user_id !== "string" || !UUID.test(body.user_id)) return c.json({ error: "INVALID_DELEGATE" }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        if (actor.tenant.role !== "owner") return { kind: "forbidden" as const };
        const inserted = await tx.query<{ id: string }>(
          `SELECT public.set_fx_contingency_delegation($1::uuid,$2::uuid,$3::uuid,$4::uuid,'owner',false) AS id`,
          [actor.tenant.organizationId, branchId, body.user_id, actor.tenant.userId],
        );
        return { kind: "ok" as const, id: inserted.rows[0]!.id };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.json({ delegation_id: result.id }, 201);
    } catch (error) { return failure(c, error); }
  });

  app.delete("/api/orgs/:organizationId/branches/:branchId/fx-delegations/:userId", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId, userId } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId) || !UUID.test(userId)) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        if (actor.tenant.role !== "owner") return { kind: "forbidden" as const };
        await tx.query(
          `SELECT public.set_fx_contingency_delegation($1::uuid,$2::uuid,$3::uuid,$4::uuid,'owner',true)`,
          [actor.tenant.organizationId, branchId, userId, actor.tenant.userId],
        );
        return { kind: "ok" as const };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.body(null, 204);
    } catch (error) { return failure(c, error); }
  });

  app.get("/api/orgs/:organizationId/branches/:branchId/fx-contingency", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId)) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        const scope = await authorizeBranch(tx, actor.tenant, branchId);
        if (scope !== "ok") return { kind: scope };
        const rows = await tx.query(
          `SELECT a.id,a.rate::text,a.reference_rate_value::text,a.deviation_bps,a.reason,
                  a.starts_at,a.expires_at,a.status,a.authorized_by_user_id,
                  a.elevated_confirmation_at
             FROM public.fx_contingency_authorizations a
            WHERE a.organization_id=$1 AND a.branch_id=$2 AND a.status='active'
              AND a.starts_at <= pg_catalog.clock_timestamp()
              AND a.expires_at > pg_catalog.clock_timestamp()
            ORDER BY a.starts_at DESC LIMIT 1`,
          [actor.tenant.organizationId, branchId],
        );
        const bcv = await tx.query(
          `SELECT state.last_success_at,state.last_outcome,state.last_effective_date,
                  rate.id AS exchange_rate_id,rate.rate::text AS rate,rate.validation_status
             FROM public.bcv_sync_state state
             LEFT JOIN public.exchange_rates rate
               ON rate.source='BCV_OFFICIAL_HTML_V1'
              AND rate.effective_date=(pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date
            WHERE state.singleton=true
            LIMIT 1`,
        );
        return { kind: "ok" as const, authorization: rows.rows[0] ?? null, bcv: bcv.rows[0] ?? null, commercial_enabled: c.env.FX_CONTINGENCY_ENABLED === "true" };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.json(result);
    } catch (error) { return failure(c, error); }
  });

  const authorize = async (c: RequestContext, renewalId?: string) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId) || (renewalId && !UUID.test(renewalId))) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    const body = object(await readJson(c.req.raw), ["rate", "reason", "expires_at", "pin", "elevated_confirmation", "elevated_confirmation_reason"]);
    const rate = body && normalizeRate(body.rate);
    const reason = body && cleanText(body.reason, 1000);
    const expiry = body && typeof body.expires_at === "string" ? new Date(body.expires_at) : null;
    const elevatedReason = body && body.elevated_confirmation === true ? cleanText(body.elevated_confirmation_reason, 500) : null;
    if (body && body.elevated_confirmation !== undefined && typeof body.elevated_confirmation !== "boolean") return c.json({ error: "INVALID_ELEVATED_CONFIRMATION" }, 400);
    if (body && body.elevated_confirmation === true && !elevatedReason) return c.json({ error: "ELEVATED_CONFIRMATION_REASON_REQUIRED" }, 400);
    if (body && body.elevated_confirmation !== true && body.elevated_confirmation_reason !== undefined) return c.json({ error: "ELEVATED_CONFIRMATION_FLAG_REQUIRED" }, 400);
    if (!body || !rate || !reason || !expiry || !Number.isFinite(expiry.getTime()) ||
        typeof body.pin !== "string" || !/^[0-9]{8,32}$/.test(body.pin)) {
      return c.json({ error: "INVALID_FX_AUTHORIZATION", message: "Revisa tasa, motivo, vencimiento y PIN." }, 400);
    }
    if (!c.env.FX_PIN_PEPPER || !c.env.FX_PIN_RATE_LIMIT_PEPPER) return c.json({ error: "FX_PIN_NOT_CONFIGURED" }, 503);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        const scope = await authorizeBranch(tx, actor.tenant, branchId);
        if (scope !== "ok") return { kind: scope };
        const pin = await verifyAndRateLimitPin(tx, c, actor.tenant, body.pin);
        if (pin !== "ok") return { kind: pin === "limited" ? "limited" as const : pin === "unavailable" ? "unavailable" as const : "invalid_pin" as const };
        const active = await tx.query<{ id: string; expires_at: string | Date; starts_at: string | Date; authorized_by_user_id: string; authorized_by_role: 'owner' | 'admin' }>(
          `SELECT id,starts_at,expires_at,authorized_by_user_id,authorized_by_role FROM public.fx_contingency_authorizations
            WHERE organization_id=$1 AND branch_id=$2 AND status='active'
            ORDER BY starts_at DESC LIMIT 1 FOR UPDATE`,
          [actor.tenant.organizationId, branchId],
        );
        if (renewalId && active.rows[0]?.id !== renewalId) return { kind: "authorization_not_active" as const };
        if (active.rows[0]) {
          const recovery = await tx.query<{ restored: boolean }>(
            `SELECT EXISTS (
               SELECT 1 FROM public.bcv_sync_success_observations obs
                WHERE obs.observed_at > $1::timestamptz
                  AND obs.last_outcome IN ('inserted','unchanged')
                  AND obs.last_error_code IS NULL
                  AND obs.last_effective_date=(pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date
                  AND obs.validation_status='valid'
                  AND ((obs.last_outcome='inserted' AND obs.rate_fetched_at > $1::timestamptz)
                    OR obs.last_outcome='unchanged')
             ) AS restored`,
            [active.rows[0].starts_at],
          );
          if (recovery.rows[0]?.restored) {
            await tx.query(
              `SELECT public.transition_fx_contingency_authorization(
                 $1::uuid,$2::uuid,$3::uuid,'bcv_restored',$4::uuid,$5::text,
                 'official BCV rate recovered before authorization renewal'
               )`,
              [actor.tenant.organizationId, branchId, active.rows[0].id,
                active.rows[0].authorized_by_user_id, active.rows[0].authorized_by_role],
            );
            return { kind: "bcv_restored" as const };
          }
          const expiryTime = new Date(active.rows[0].expires_at).getTime();
          if (expiryTime <= Date.now()) {
            await tx.query(
              `SELECT public.transition_fx_contingency_authorization(
                 $1::uuid,$2::uuid,$3::uuid,'expired',$4::uuid,$5::text,'authorization expired before renewal'
               )`,
              [actor.tenant.organizationId, branchId, active.rows[0].id, active.rows[0].authorized_by_user_id, active.rows[0].authorized_by_role],
            );
          } else if (!renewalId) {
            return { kind: "authorization_already_active" as const };
          }
        }
        const reference = await tx.query<{ id: string; rate: string }>(
          `SELECT id,rate::text FROM public.exchange_rates
            WHERE source='BCV_OFFICIAL_HTML_V1' AND validation_status='valid'
              AND effective_date <= (pg_catalog.clock_timestamp() AT TIME ZONE 'America/Caracas')::date
            ORDER BY effective_date DESC,fetched_at DESC LIMIT 1 FOR SHARE`,
        );
        if (!reference.rows[0]) return { kind: "reference_unavailable" as const };
        if (renewalId && active.rows[0] && new Date(active.rows[0].expires_at).getTime() > Date.now()) {
          await tx.query(
            `SELECT public.transition_fx_contingency_authorization(
               $1::uuid,$2::uuid,$3::uuid,'revoked',$4::uuid,$5::text,'renewed by replacement authorization'
             )`,
            [actor.tenant.organizationId, branchId, renewalId, actor.tenant.userId, actor.tenant.role],
          );
        }
        const created = await tx.query<{ id: string }>(
          `SELECT public.create_fx_contingency_authorization(
             $1::uuid,$2::uuid,$3::numeric,$4::numeric,$5::uuid,$6::text,$7::timestamptz,
             $8::uuid,$9::text,$10::text,$11::text
           ) AS id`,
          [actor.tenant.organizationId, branchId, rate, reference.rows[0].rate,
            reference.rows[0].id, reason, expiry.toISOString(), actor.tenant.userId,
            actor.tenant.role, elevatedReason,
            renewalId ? "renewed" : "authorized"],
        );
        return { kind: "ok" as const, id: created.rows[0]!.id };
      }));
      if (result.kind !== "ok") {
        if (result.kind === "limited") return c.json({ error: "FX_PIN_RATE_LIMITED" }, 429);
        if (result.kind === "invalid_pin") return c.json({ error: "FX_PIN_INVALID" }, 403);
        if (result.kind === "unavailable") return c.json({ error: "FX_PIN_NOT_CONFIGURED" }, 503);
        if (result.kind === "reference_unavailable") return c.json({ error: "BCV_REFERENCE_UNAVAILABLE" }, 409);
        if (result.kind === "authorization_not_active") return c.json({ error: "FX_AUTHORIZATION_NOT_ACTIVE" }, 409);
        if (result.kind === "authorization_already_active") return c.json({ error: "FX_AUTHORIZATION_ALREADY_ACTIVE" }, 409);
        if (result.kind === "bcv_restored") return c.json({ error: "BCV_RATE_RESTORED", message: "La tasa oficial BCV se recuperó; la contingencia fue cerrada." }, 409);
        return authFailure(c, result.kind);
      }
      return c.json({ authorization_id: result.id }, 201);
    } catch (error) { return failure(c, error); }
  };

  app.post("/api/orgs/:organizationId/branches/:branchId/fx-contingency/authorizations", (c) => authorize(c));
  app.post("/api/orgs/:organizationId/branches/:branchId/fx-contingency/authorizations/:id/renew", (c) => authorize(c, c.req.param("id")));
  app.post("/api/orgs/:organizationId/branches/:branchId/fx-contingency/authorizations/:id/revoke", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId: org, branchId, id } = c.req.param();
    if (!UUID.test(org) || !UUID.test(branchId) || !UUID.test(id)) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const guard = mutationGuard(c); if (guard) return guard;
    const token = session(c); if (!token) { clearSessionCookie(c); return c.json({ error: "UNAUTHENTICATED" }, 401); }
    const body = object(await readJson(c.req.raw), ["pin", "reason"]);
    const reason = body && cleanText(body.reason, 500);
    if (!body || typeof body.pin !== "string" || !/^[0-9]{8,32}$/.test(body.pin) || !reason) return c.json({ error: "INVALID_FX_REVOCATION" }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const actor = await resolveActor(tx, token, org);
        if (actor.kind !== "ok") return actor;
        const scope = await authorizeBranch(tx, actor.tenant, branchId);
        if (scope !== "ok") return { kind: scope };
        const pin = await verifyAndRateLimitPin(tx, c, actor.tenant, body.pin);
        if (pin !== "ok") return { kind: pin === "limited" ? "limited" as const : pin === "unavailable" ? "unavailable" as const : "invalid_pin" as const };
        await tx.query(
          `SELECT public.transition_fx_contingency_authorization(
             $1::uuid,$2::uuid,$3::uuid,'revoked',$4::uuid,$5::text,$6::text
           )`,
          [actor.tenant.organizationId, branchId, id, actor.tenant.userId, actor.tenant.role, reason],
        );
        return { kind: "ok" as const };
      }));
      if (result.kind !== "ok") {
        if (result.kind === "limited") return c.json({ error: "FX_PIN_RATE_LIMITED" }, 429);
        if (result.kind === "invalid_pin") return c.json({ error: "FX_PIN_INVALID" }, 403);
        if (result.kind === "unavailable") return c.json({ error: "FX_PIN_NOT_CONFIGURED" }, 503);
        return authFailure(c, result.kind);
      }
      return c.json({ status: "revoked" });
    } catch (error) { return failure(c, error); }
  });
}
