import { getCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import { formatNumeric, parseNumeric } from "@micro-app/money";
import type { Bindings } from "./bindings";
import { isTrustedOrigin } from "./auth";
import { authorizeBranchOperation } from "./authorization";
import { lockBranchScopes, type BranchContext } from "./branch-context";
import { readBodyWithinLimit } from "./bounded-body";
import { withDatabaseClient, withDatabaseTransaction } from "./database";
import { resolveOpenCashierRegisterShift } from "./cashier-open-shift";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 4 * 1024;

type ShiftBranch = BranchContext;
type RegisterRow = { id: string; name: string; code: string };
type ShiftRow = {
  id: string; organization_id: string; branch_id: string; register_id: string;
  cashier_user_id: string; opened_at: Date; opening_cash_usd: string; opening_cash_ves: string;
  closed_at?: Date | null; closing_cash_usd?: string | null; closing_cash_ves?: string | null;
  closed_by_user_id?: string | null;
};
type ShiftInput = { registerId?: string; cashUsd: string; cashVes: string };
type AuthKind = "unauthenticated" | "forbidden" | "branch_denied";

function normalizeCash(value: unknown, precision: number, scale: number): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = parseNumeric(value, precision, scale);
    if (parsed < 0n) return null;
    return formatNumeric(parsed, precision, scale);
  } catch { return null; }
}

export function parseShiftOpeningInput(value: unknown): ShiftInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["register_id", "opening_cash_usd", "opening_cash_ves"].includes(key))) return null;
  if (typeof body.register_id !== "string" || !UUID_PATTERN.test(body.register_id)) return null;
  const cashUsd = normalizeCash(body.opening_cash_usd, 14, 4);
  const cashVes = normalizeCash(body.opening_cash_ves, 16, 2);
  if (cashUsd === null || cashVes === null) return null;
  return { registerId: body.register_id.toLowerCase(), cashUsd, cashVes };
}

export function parseShiftClosingInput(value: unknown): ShiftInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["closing_cash_usd", "closing_cash_ves"].includes(key))) return null;
  const cashUsd = normalizeCash(body.closing_cash_usd, 14, 4);
  const cashVes = normalizeCash(body.closing_cash_ves, 16, 2);
  if (cashUsd === null || cashVes === null) return null;
  return { cashUsd, cashVes };
}

function postgresErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function authorizeOwnShift(
  tx: import("./database").DatabaseClient, token: string, organizationId: string, branchId: string, operation: string,
): Promise<{ kind: "ok"; branch: ShiftBranch } | { kind: AuthKind }> {
  const authorization = await authorizeBranchOperation(tx, token, organizationId, branchId, operation);
  if (!authorization.allowed) {
    if (authorization.reason === "unauthenticated_or_out_of_scope") return { kind: "unauthenticated" };
    if (authorization.reason === "branch_out_of_scope") return { kind: "branch_denied" };
    return { kind: "forbidden" };
  }
  const branch = authorization.context;
  // Owner/Admin have organization-wide branch scope, but owning a shift always
  // requires an explicit active branch assignment just like Cashier.
  const assigned = await lockBranchScopes(tx, branch.organizationId, [{
    branchId: branch.branchId, userId: branch.userId, requiresMembership: true,
  }]);
  if (!assigned) return { kind: "branch_denied" };
  return { kind: "ok", branch };
}

function authFailure(c: Context<{ Bindings: Bindings }>, kind: AuthKind) {
  if (kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
  if (kind === "branch_denied") return c.json({ error: "BRANCH_FORBIDDEN", message: "No tienes una asignación activa para operar en esta sucursal." }, 403);
  return c.json({ error: "FORBIDDEN", message: "No tienes permiso para operar tu turno de caja." }, 403);
}

function readFailure(c: Context<{ Bindings: Bindings }>, error: unknown) {
  const code = postgresErrorCode(error);
  if (code) console.error({ event: "REGISTER_SHIFT_DATABASE_FAILURE", code });
  if (code && ["42P01", "42883", "42703", "42501"].includes(code)) {
    return c.json({ error: "REGISTER_SHIFT_NOT_ENABLED", message: "La operación de turnos todavía no está habilitada en esta base de datos." }, 503);
  }
  if (code === "22023") return c.json({ error: "INVALID_SHIFT_INPUT", message: "Los importes del turno no son válidos." }, 400);
  if (code === "23505") return c.json({ error: "SHIFT_ALREADY_OPEN", message: "Ya existe un turno abierto para esta caja o usuario." }, 409);
  if (code === "23514" || code === "23503") return c.json({ error: "SHIFT_SCOPE_CONFLICT", message: "No se pudo completar la operación de turno con el alcance actual." }, 409);
  return c.json({ error: "REGISTER_SHIFT_OPERATION_FAILED", message: "No se pudo completar la operación de caja." }, 500);
}

async function parseJsonBody(request: Request): Promise<{ kind: "ok"; value: unknown } | { kind: "invalid" } | { kind: "too_large" }> {
  const length = request.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return { kind: "too_large" };
  const body = await readBodyWithinLimit(request.body, MAX_BODY_BYTES);
  if (body.kind === "too_large") return { kind: "too_large" };
  if (body.kind === "invalid") return { kind: "invalid" };
  try { return { kind: "ok", value: JSON.parse(body.text) as unknown }; } catch { return { kind: "invalid" }; }
}

function checkMutationRequest(c: Context<{ Bindings: Bindings }>) {
  if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
    return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
    return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
  }
  return null;
}

function sessionToken(c: Context<{ Bindings: Bindings }>): string | null {
  const token = getCookie(c, "microapp_session");
  return token && token.length <= 128 ? token : null;
}

export function registerRegisterShiftRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/branches/:branchId/registers", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId } = c.req.param();
    if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(branchId)) return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    const token = sessionToken(c);
    if (!token) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeOwnShift(tx, token, organizationId, branchId, "register.shift.open_own");
        if (auth.kind !== "ok") return auth;
        const rows = await tx.query<RegisterRow>(
          `SELECT id, name, code FROM public.registers
            WHERE organization_id = $1 AND branch_id = $2 AND is_active = true
            ORDER BY lower(name), id`,
          [auth.branch.organizationId, auth.branch.branchId],
        );
        return { kind: "ok" as const, items: rows.rows };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.json({ items: result.items }, 200);
    } catch (error) { return readFailure(c, error); }
  });

  app.get("/api/orgs/:organizationId/branches/:branchId/register-shifts/current", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId } = c.req.param();
    if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(branchId)) return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    const token = sessionToken(c);
    if (!token) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeOwnShift(tx, token, organizationId, branchId, "register.shift.read_own");
        if (auth.kind !== "ok") return auth;
        const shift = await resolveOpenCashierRegisterShift(tx, auth.branch);
        return { kind: "ok" as const, shift };
      }));
      if (result.kind !== "ok") return authFailure(c, result.kind);
      return c.json({ shift: result.shift }, 200);
    } catch (error) { return readFailure(c, error); }
  });

  app.post("/api/orgs/:organizationId/branches/:branchId/register-shifts", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const mutationError = checkMutationRequest(c);
    if (mutationError) return mutationError;
    const { organizationId, branchId } = c.req.param();
    if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(branchId)) return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    const token = sessionToken(c);
    if (!token) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    const body = await parseJsonBody(c.req.raw);
    if (body.kind === "too_large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite permitido." }, 413);
    if (body.kind === "invalid") return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    const input = parseShiftOpeningInput(body.value);
    if (!input || !input.registerId) return c.json({ error: "INVALID_SHIFT_INPUT", message: "La caja o los importes iniciales no son válidos." }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeOwnShift(tx, token, organizationId, branchId, "register.shift.open_own");
        if (auth.kind !== "ok") return auth;
        const inserted = await tx.query<ShiftRow>(
          `SELECT * FROM public.open_register_shift($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::numeric, $6::numeric)`,
          [auth.branch.organizationId, auth.branch.branchId, input.registerId, auth.branch.userId, input.cashUsd, input.cashVes],
        );
        if (!inserted.rows[0]) return { kind: "not_found" as const };
        return { kind: "created" as const, shift: inserted.rows[0] };
      }));
      if (result.kind !== "created") {
        if (result.kind === "not_found") return c.json({ error: "REGISTER_NOT_FOUND", message: "La caja no existe o no está activa en esta sucursal." }, 404);
        return authFailure(c, result.kind);
      }
      return c.json({ shift: result.shift }, 201);
    } catch (error) { return readFailure(c, error); }
  });

  app.post("/api/orgs/:organizationId/branches/:branchId/register-shifts/:shiftId/close", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const mutationError = checkMutationRequest(c);
    if (mutationError) return mutationError;
    const { organizationId, branchId, shiftId } = c.req.param();
    if (![organizationId, branchId, shiftId].every((id) => UUID_PATTERN.test(id))) return c.json({ error: "INVALID_RESOURCE", message: "Los identificadores no son válidos." }, 400);
    const token = sessionToken(c);
    if (!token) return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
    const body = await parseJsonBody(c.req.raw);
    if (body.kind === "too_large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el límite permitido." }, 413);
    if (body.kind === "invalid") return c.json({ error: "INVALID_JSON", message: "El cuerpo JSON no es válido." }, 400);
    const input = parseShiftClosingInput(body.value);
    if (!input) return c.json({ error: "INVALID_SHIFT_INPUT", message: "Los importes de cierre no son válidos." }, 400);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeOwnShift(tx, token, organizationId, branchId, "register.shift.close_own");
        if (auth.kind !== "ok") return auth;
        const closed = await tx.query<ShiftRow>(
          `SELECT * FROM public.close_register_shift($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::numeric, $6::numeric)`,
          [auth.branch.organizationId, auth.branch.branchId, shiftId, auth.branch.userId, input.cashUsd, input.cashVes],
        );
        if (closed.rows[0]) return { kind: "closed" as const, shift: closed.rows[0], replayed: false };
        const existing = await tx.query<ShiftRow>(
          `SELECT id, organization_id, branch_id, register_id, cashier_user_id, opened_at,
                  opening_cash_usd::text AS opening_cash_usd, opening_cash_ves::text AS opening_cash_ves,
                  closed_at, closing_cash_usd::text AS closing_cash_usd, closing_cash_ves::text AS closing_cash_ves, closed_by_user_id
             FROM public.register_shifts
            WHERE organization_id = $1 AND branch_id = $2 AND id = $3 AND cashier_user_id = $4`,
          [auth.branch.organizationId, auth.branch.branchId, shiftId, auth.branch.userId],
        );
        const row = existing.rows[0];
        if (row && row.closed_at && row.closed_by_user_id === auth.branch.userId &&
            row.closing_cash_usd === input.cashUsd && row.closing_cash_ves === input.cashVes) {
          return { kind: "closed" as const, shift: row, replayed: true };
        }
        return { kind: "not_found" as const };
      }));
      if (result.kind !== "closed") {
        if (result.kind !== "not_found") return authFailure(c, result.kind);
        return c.json({ error: "SHIFT_NOT_OPEN_OR_NOT_OWNED", message: "El turno no está abierto o no pertenece a tu usuario." }, 409);
      }
      return c.json({ shift: result.shift, replayed: result.replayed }, 200);
    } catch (error) { return readFailure(c, error); }
  });
}
