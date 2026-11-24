import { getCookie } from "hono/cookie";
import type { Context, Hono } from "hono";
import { formatNumeric, parseNumeric, sumNumeric } from "@micro-app/money";
import type { Bindings } from "./bindings";
import { clearSessionCookie } from "./auth";
import { authorizeBranchOperation, authorizeCommercialOperation, authorizeTenantOperation, isCommercialOperationAllowed } from "./authorization";
import { withDatabaseClient, withDatabaseTransaction } from "./database";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISCLAIMER = "COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL";
const CARACAS_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
type Period = "daily" | "weekly" | "monthly" | "custom";
type Range = { start: string; end: string };

function dateParts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}
function caracasMidnight(date: string): number | null {
  const parts = dateParts(date);
  return parts ? Date.UTC(parts.year, parts.month - 1, parts.day) + CARACAS_OFFSET_MS : null;
}
function isoCaracas(ms: number): string {
  return new Date(ms).toISOString();
}
function parseCustomDate(value: string): number | null {
  if (dateParts(value)) return caracasMidnight(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) {
    if (!dateParts(value.slice(0, 10))) return null;
    const ms = Date.parse(value + "-04:00");
    return Number.isFinite(ms) ? ms : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (!dateParts(value.slice(0, 10))) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
export function buildCaracasReportRange(input: {
  period: Period; date?: string; from?: string; to?: string; now?: Date;
}): Range | null {
  const period = input.period;
  if (period === "custom") {
    if (!input.from || !input.to) return null;
    const start = parseCustomDate(input.from), end = parseCustomDate(input.to);
    if (start === null || end === null || start >= end || end - start > 366 * DAY_MS) return null;
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
  }
  const referenceDate = input.date ?? new Date((input.now ?? new Date()).getTime() - CARACAS_OFFSET_MS).toISOString().slice(0, 10);
  const startMs = caracasMidnight(referenceDate);
  if (startMs === null) return null;
  let start = startMs, end = startMs + DAY_MS;
  if (period === "weekly") {
    const local = new Date(startMs - CARACAS_OFFSET_MS);
    const weekday = local.getUTCDay();
    start -= ((weekday + 6) % 7) * DAY_MS;
    end = start + 7 * DAY_MS;
  } else if (period === "monthly") {
    const local = new Date(startMs - CARACAS_OFFSET_MS);
    start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + CARACAS_OFFSET_MS;
    end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) + CARACAS_OFFSET_MS;
  } else if (period !== "daily") return null;
  return { start: isoCaracas(start), end: isoCaracas(end) };
}
export function formatSafeCsvCell(value: string): string {
  const safe = /^[\u0000-\u0020]*[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function formatCaracasTimestamp(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Caracas",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
  const part=(type:string)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}
export function formatCaracasReportDate(value:string|Date):string {
  const date=value instanceof Date?value:new Date(value);
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Caracas",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const part=(type:string)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
type CsvPayment={method:string;currency:string;amount:string;usd_equivalent_snapshot:string;reference?:string|null};
export function formatPaymentsCsvSummary(payments:CsvPayment[]):string {
  const labels:Record<string,string>={cash:"Efectivo",card:"Tarjeta / Punto",transfer:"Transferencia",mobile_payment:"Pago móvil",other:"Otro"};
  return payments.map(payment=>{
    const method=labels[payment.method]??"Otro";
    const reference=payment.reference?` (Ref: ${payment.reference}; eq. USD ${payment.usd_equivalent_snapshot})`:` (eq. USD ${payment.usd_equivalent_snapshot})`;
    return `${method}: ${payment.currency} ${payment.amount}${reference}`;
  }).join(" | ");
}
export function buildSalesCsvTotalRow(totalUsd:string,totalVes:string):string[]{
  return ["TOTAL","","","","",formatCsvNumericCell(totalUsd),formatCsvNumericCell(totalVes),"","","","",formatSafeCsvCell(DISCLAIMER)];
}
function salesCsvFilename(period:Period,range:Range):string {
  const start=formatCaracasReportDate(range.start),end=formatCaracasReportDate(new Date(Date.parse(range.end)-1));
  if(period==="daily")return `reporte-ventas-diario-${start}.csv`;
  if(period==="weekly")return `reporte-ventas-semanal-${start}-${end}.csv`;
  if(period==="monthly")return `reporte-ventas-mensual-${start.slice(0,7)}.csv`;
  return `reporte-ventas-periodo-${start}-${end}.csv`;
}
function inventoryCsvFilename():string{return `reporte-inventario-${formatCaracasReportDate(new Date())}.csv`;}

export function formatCsvNumericCell(value: string): string {
  if (!/^-?(0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)) throw new TypeError("Invalid CSV numeric value.");
  return value;
}
export function subtractNumeric(left: string, right: string, precision = 14, scale = 4): string {
  return formatNumeric(parseNumeric(left, precision, scale) - parseNumeric(right, precision, scale), precision, scale);
}
function session(c: Context<{ Bindings: Bindings }>): string | null {
  const token = getCookie(c, "microapp_session");
  if (!token || token.length > 128) { clearSessionCookie(c); return null; }
  return token;
}
function pgCode(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
}
function failure(c: Context<{ Bindings: Bindings }>, error: unknown) {
  const code = pgCode(error);
  if (code && ["42P01", "42883", "42703", "42501"].includes(code)) {
    return c.json({ error: "REPORTS_NOT_ENABLED", message: "Los reportes todavía no están habilitados en esta base de datos." }, 503);
  }
  return c.json({ error: "REPORTS_READ_FAILED", message: "No se pudo generar el reporte." }, 500);
}
function csvResponse(c: Context<{ Bindings: Bindings }>, name: string, rows: string[][]) {
  const body = "\uFEFF" + rows.map((row) => row.join(",")).join("\r\n") + "\r\n";
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${name}"`);
  c.header("Cache-Control", "no-store");
  return c.body(body, 200);
}
function parseLimit(value: string | undefined): number | null {
  if (value === undefined) return 50;
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit <= 100 ? limit : null;
}

export function registerReportsRoutes(app: Hono<{ Bindings: Bindings }>): void {
  app.get("/api/orgs/:organizationId/register-shifts", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId } = c.req.param();
    const branchId = c.req.query("branch_id"), status = c.req.query("status"), limit = parseLimit(c.req.query("limit"));
    if (!UUID_PATTERN.test(organizationId) || (branchId !== undefined && !UUID_PATTERN.test(branchId)) ||
        (status !== undefined && status !== "open" && status !== "closed") || limit === null) {
      return c.json({ error: "INVALID_REPORT_QUERY" }, 400);
    }
    const token = session(c); if (!token) return c.json({ error: "UNAUTHENTICATED" }, 401);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const roleAuth = await authorizeTenantOperation(tx, token, organizationId, "register.shift.read_own", false);
        if (!roleAuth.allowed) return { kind: roleAuth.reason === "unauthenticated_or_out_of_scope" ? "unauthenticated" as const : "forbidden" as const };
        const role = roleAuth.context.role;
        if (role === "inventory") return { kind: "forbidden" as const };
        if (branchId) {
          const branchAuth = await authorizeBranchOperation(tx, token, organizationId, branchId,
            role === "cashier" ? "register.shift.read_own" : "register.shift.read_all", false);
          if (!branchAuth.allowed) return { kind: branchAuth.reason === "unauthenticated_or_out_of_scope" ? "unauthenticated" as const : "forbidden" as const };
        } else if (!authorizeCommercialOperation(role, "register.shift.read_all") && role !== "cashier") return { kind: "forbidden" as const };
        const rows = await tx.query(
          `SELECT rs.id, rs.branch_id, b.name AS branch_name, rs.register_id, r.name AS register_name,
                  rs.cashier_user_id, u.display_name AS cashier_name, rs.opened_at::text AS opened_at,
                  rs.closed_at::text AS closed_at, rs.opening_cash_usd::text AS opening_cash_usd,
                  rs.opening_cash_ves::text AS opening_cash_ves, rs.closing_cash_usd::text AS closing_cash_usd,
                  rs.closing_cash_ves::text AS closing_cash_ves
             FROM public.register_shifts rs
             JOIN public.branches b ON b.organization_id=rs.organization_id AND b.id=rs.branch_id
             JOIN public.registers r ON r.organization_id=rs.organization_id AND r.branch_id=rs.branch_id AND r.id=rs.register_id
             JOIN public.app_users u ON u.id=rs.cashier_user_id
             ${role === "cashier" ? "JOIN public.branch_memberships bm ON bm.organization_id=rs.organization_id AND bm.branch_id=rs.branch_id AND bm.user_id=rs.cashier_user_id AND bm.is_active=true" : ""}
            WHERE rs.organization_id=$1 AND ($2::uuid IS NULL OR rs.branch_id=$2)
              AND ($3::text IS NULL OR ($3='open' AND rs.closed_at IS NULL) OR ($3='closed' AND rs.closed_at IS NOT NULL))
              AND ($4::uuid IS NULL OR rs.cashier_user_id=$4)
            ORDER BY rs.opened_at DESC LIMIT $5`,
          [organizationId, branchId ?? null, status ?? null, role === "cashier" ? roleAuth.context.userId : null, limit],
        );
        return { kind: "ok" as const, items: rows.rows };
      }));
      if (result.kind !== "ok") return c.json({ error: result.kind === "unauthenticated" ? "UNAUTHENTICATED" : "FORBIDDEN" }, result.kind === "unauthenticated" ? 401 : 403);
      return c.json({ items: result.items }, 200);
    } catch (error) { return failure(c, error); }
  });

  app.get("/api/orgs/:organizationId/branches/:branchId/register-shifts/:shiftId/closure-summary", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId, branchId, shiftId } = c.req.param();
    if (![organizationId, branchId, shiftId].every((id) => UUID_PATTERN.test(id))) return c.json({ error: "INVALID_RESOURCE" }, 400);
    const token = session(c); if (!token) return c.json({ error: "UNAUTHENTICATED" }, 401);
    try {
      const result = await withDatabaseClient(c.env.DATABASE_URL, (client) => withDatabaseTransaction(client, async (tx) => {
        const auth = await authorizeBranchOperation(tx, token, organizationId, branchId, "reports.sales.organization", false);
        const cashierAuth = auth.allowed ? null : await authorizeBranchOperation(tx, token, organizationId, branchId, "reports.sales.own_shift", false);
        const context = auth.allowed ? auth.context : cashierAuth?.allowed ? cashierAuth.context : null;
        if (!context) return { kind: (!auth.allowed && auth.reason === "unauthenticated_or_out_of_scope") ||
          (cashierAuth !== null && cashierAuth !== undefined && !cashierAuth.allowed && cashierAuth.reason === "unauthenticated_or_out_of_scope")
          ? "unauthenticated" as const : "forbidden" as const };
        const rows = await tx.query<any>(
          `SELECT rs.id, rs.branch_id, b.name AS branch_name, rs.register_id, r.name AS register_name,
                  rs.cashier_user_id, u.display_name AS cashier_name, rs.opened_at::text AS opened_at,
                  rs.closed_at::text AS closed_at, rs.opening_cash_usd::text AS opening_cash_usd,
                  rs.opening_cash_ves::text AS opening_cash_ves, rs.closing_cash_usd::text AS closing_cash_usd,
                  rs.closing_cash_ves::text AS closing_cash_ves
             FROM public.register_shifts rs
             JOIN public.branches b ON b.organization_id=rs.organization_id AND b.id=rs.branch_id
             JOIN public.registers r ON r.organization_id=rs.organization_id AND r.branch_id=rs.branch_id AND r.id=rs.register_id
             JOIN public.app_users u ON u.id=rs.cashier_user_id
            WHERE rs.organization_id=$1 AND rs.branch_id=$2 AND rs.id=$3 LIMIT 1`,
          [organizationId, branchId, shiftId],
        );
        const shift = rows.rows[0];
        if (!shift) return { kind: "not_found" as const };
        if (context.organizationRole === "cashier" && shift.cashier_user_id !== context.userId) return { kind: "forbidden" as const };
        const sales = await tx.query<any>(
          `SELECT count(*) FILTER (WHERE s.status='completed')::text AS completed_sales_count,
                  count(*) FILTER (WHERE s.status IN ('void','refunded'))::text AS non_completed_sales_count,
                  COALESCE(sum(s.total_usd) FILTER (WHERE s.status='completed'),0)::numeric(38,4)::text AS total_usd,
                  COALESCE(sum(s.total_ves_snapshot) FILTER (WHERE s.status='completed'),0)::numeric(38,2)::text AS total_ves_snapshot,
                  COALESCE(jsonb_agg(jsonb_build_object('settlement_currency',s.settlement_currency,'fx_source',s.fx_source,
                    'total_usd',s.total_usd::text,'total_ves_snapshot',s.total_ves_snapshot::text,
                    'exchange_rate_snapshot',s.exchange_rate_snapshot::text,'exchange_rate_effective_date',s.exchange_rate_effective_date))
                    FILTER (WHERE s.status='completed'),'[]'::jsonb) AS sale_snapshots,
                  COALESCE((SELECT jsonb_agg(jsonb_build_object('settlement_currency',fx.settlement_currency,
                    'fx_source',fx.fx_source,'sales_count',fx.sales_count::text,'total_usd',fx.total_usd,
                    'total_ves_snapshot',fx.total_ves_snapshot))
                    FROM (SELECT settlement_currency,fx_source,count(*) AS sales_count,
                          sum(total_usd)::numeric(38,4)::text AS total_usd,
                          sum(total_ves_snapshot)::numeric(38,2)::text AS total_ves_snapshot
                            FROM public.sales WHERE organization_id=$1 AND branch_id=$2 AND register_shift_id=$3
                              AND status='completed' GROUP BY settlement_currency,fx_source) fx),'[]'::jsonb) AS fx_breakdown
             FROM public.sales s WHERE s.organization_id=$1 AND s.branch_id=$2 AND s.register_shift_id=$3`,
          [organizationId, branchId, shiftId],
        );
        const payments = await tx.query<any>(
          `SELECT p.method,p.currency,CASE WHEN p.currency='VES' THEN sum(p.amount)::numeric(38,2)::text ELSE sum(p.amount)::numeric(38,4)::text END AS amount,
                  sum(p.usd_equivalent_snapshot)::numeric(38,4)::text AS usd_equivalent_snapshot
             FROM public.payments p JOIN public.sales s ON s.organization_id=p.organization_id AND s.id=p.sale_id
            WHERE s.organization_id=$1 AND s.branch_id=$2 AND s.register_shift_id=$3 AND s.status='completed'
            GROUP BY p.method,p.currency ORDER BY p.method,p.currency`,
          [organizationId, branchId, shiftId],
        );
        const cashUsd = payments.rows.filter((p:any)=>p.method==="cash"&&p.currency==="USD").map((p:any)=>p.amount);
        const cashVes = payments.rows.filter((p:any)=>p.method==="cash"&&p.currency==="VES").map((p:any)=>p.amount);
        const expectedUsd = sumNumeric([shift.opening_cash_usd,...cashUsd],38,4);
        const expectedVes = sumNumeric([shift.opening_cash_ves,...cashVes],38,2);
        return { kind: "ok" as const, shift, sales: sales.rows[0], payments: payments.rows,
          expectedUsd, expectedVes,
          differenceUsd: shift.closed_at ? subtractNumeric(shift.closing_cash_usd,expectedUsd,38,4) : null,
          differenceVes: shift.closed_at ? subtractNumeric(shift.closing_cash_ves,expectedVes,38,2) : null };
      }));
      if (result.kind === "not_found") return c.json({ error: "SHIFT_NOT_FOUND" }, 404);
      if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED" }, 401);
      if (result.kind !== "ok") return c.json({ error: "FORBIDDEN" }, 403);
      return c.json({ shift: result.shift, ...result.sales, payments: result.payments,
        expected_cash_usd: result.expectedUsd, expected_cash_ves: result.expectedVes,
        difference_cash_usd: result.differenceUsd, difference_cash_ves: result.differenceVes,
        disclaimer: DISCLAIMER }, 200);
    } catch (error) { return failure(c, error); }
  });

  const salesHandler = (asCsv: boolean) => async (c: Context<{ Bindings: Bindings }>) => {
    c.header("Cache-Control", "private, no-store");
    const { organizationId } = c.req.param();
    const period = (c.req.query("period") ?? "daily") as Period;
    const branchId = c.req.query("branch_id");
    if (!UUID_PATTERN.test(organizationId) || !["daily","weekly","monthly","custom"].includes(period) ||
        (branchId !== undefined && !UUID_PATTERN.test(branchId))) return c.json({ error: "INVALID_REPORT_QUERY" },400);
    const range = buildCaracasReportRange({period,date:c.req.query("date"),from:c.req.query("from"),to:c.req.query("to")});
    if (!range) return c.json({error:"INVALID_REPORT_RANGE"},400);
    const token=session(c); if(!token)return c.json({error:"UNAUTHENTICATED"},401);
    try {
      const result=await withDatabaseClient(c.env.DATABASE_URL,(client)=>withDatabaseTransaction(client,async(tx)=>{
        const ownerAuth=await authorizeTenantOperation(tx,token,organizationId,"reports.sales.organization",false);
        const ownAuth=ownerAuth.allowed?null:await authorizeTenantOperation(tx,token,organizationId,"reports.sales.own_shift",false);
        const context=ownerAuth.allowed?ownerAuth.context:ownAuth?.allowed?ownAuth.context:null;
        if(!context)return {kind: (!ownerAuth.allowed && ownerAuth.reason === "unauthenticated_or_out_of_scope") ||
          (ownAuth !== null && ownAuth !== undefined && !ownAuth.allowed && ownAuth.reason === "unauthenticated_or_out_of_scope")
          ? "unauthenticated" as const : "forbidden" as const};
        if(asCsv&&!isCommercialOperationAllowed(context.role,"exports.allowed_data"))return {kind:"forbidden" as const};
        if(branchId){
          const branchAuth=await authorizeBranchOperation(tx,token,organizationId,branchId,
            context.role==="cashier"?"reports.sales.own_shift":"reports.sales.organization",false);
          if(!branchAuth.allowed)return {kind:"forbidden" as const};
        }
        const rows=await tx.query<any>(
          `SELECT s.id,s.sale_number::text AS sale_number,s.completed_at::text AS completed_at,
                  s.settlement_currency,s.total_usd::text AS total_usd,s.total_ves_snapshot::text AS total_ves_snapshot,
                  s.exchange_rate_snapshot::text AS exchange_rate_snapshot,s.fx_source,
                  b.name AS branch_name,u.display_name AS cashier_name,
                  COALESCE(jsonb_agg(jsonb_build_object('method',p.method,'currency',p.currency,'amount',p.amount::text,
                    'usd_equivalent_snapshot',p.usd_equivalent_snapshot::text,'reference',p.reference))
                    FILTER(WHERE p.id IS NOT NULL),'[]'::jsonb) AS payments
             FROM public.sales s
             JOIN public.register_shifts rs ON rs.organization_id=s.organization_id AND rs.branch_id=s.branch_id AND rs.id=s.register_shift_id
             JOIN public.branches b ON b.organization_id=s.organization_id AND b.id=s.branch_id
             JOIN public.app_users u ON u.id=rs.cashier_user_id
             LEFT JOIN public.payments p ON p.organization_id=s.organization_id AND p.sale_id=s.id
            WHERE s.organization_id=$1 AND s.status='completed' AND s.completed_at >= $2::timestamptz AND s.completed_at < $3::timestamptz
              AND ($4::uuid IS NULL OR s.branch_id=$4)
              AND ($5::uuid IS NULL OR rs.cashier_user_id=$5)
            GROUP BY s.id,b.name,u.display_name ORDER BY s.completed_at,s.id`,
          [organizationId,range.start,range.end,branchId??null,context.role==="cashier"?context.userId:null]);
        const excluded=await tx.query<{count:string}>(
          `SELECT count(*)::text AS count FROM public.sales s
            WHERE s.organization_id=$1 AND s.status IN ('void','refunded')
              AND s.created_at >= $2::timestamptz AND s.created_at < $3::timestamptz
              AND ($4::uuid IS NULL OR s.branch_id=$4)
              AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM public.register_shifts rs WHERE rs.organization_id=s.organization_id AND rs.id=s.register_shift_id AND rs.cashier_user_id=$5))`,
          [organizationId,range.start,range.end,branchId??null,context.role==="cashier"?context.userId:null]);
        return {kind:"ok" as const,items:rows.rows,excluded:excluded.rows[0]?.count??"0",range,
          totalUsd:sumNumeric(rows.rows.map((row:any)=>row.total_usd),38,4),
          totalVes:sumNumeric(rows.rows.map((row:any)=>row.total_ves_snapshot),38,2)};
      }));
      if(result.kind==="unauthenticated")return c.json({error:"UNAUTHENTICATED"},401);
      if(result.kind!=="ok")return c.json({error:"FORBIDDEN"},403);
      if(asCsv){
        const data=[["fecha_completada","sucursal","cajero","venta","moneda_liquidacion","total_usd","total_ves","tasa_snapshot","origen_fx","pagos","referencias_pago","leyenda"]];
        for(const row of result.items)data.push([formatSafeCsvCell(formatCaracasTimestamp(row.completed_at)),formatSafeCsvCell(row.branch_name),formatSafeCsvCell(row.cashier_name),
          formatSafeCsvCell(row.sale_number),formatSafeCsvCell(row.settlement_currency),formatCsvNumericCell(row.total_usd),
          formatCsvNumericCell(row.total_ves_snapshot),formatCsvNumericCell(row.exchange_rate_snapshot),
          formatSafeCsvCell(row.fx_source==="bcv_official"?"Tasa oficial BCV":row.fx_source==="manual_contingency"?"Contingencia manual":row.fx_source),
          formatSafeCsvCell(formatPaymentsCsvSummary(row.payments)),formatSafeCsvCell(row.payments.map((payment:any)=>payment.reference??"").filter(Boolean).join(" | ")),formatSafeCsvCell(DISCLAIMER)]);
        data.push(buildSalesCsvTotalRow(result.totalUsd,result.totalVes));
        return csvResponse(c,salesCsvFilename(period,result.range),data);
      }
      return c.json({period,range:result.range,items:result.items,total_usd:result.totalUsd,total_ves_snapshot:result.totalVes,excluded_non_completed_count:result.excluded,disclaimer:DISCLAIMER},200);
    }catch(error){return failure(c,error);}
  };
  app.get("/api/orgs/:organizationId/reports/sales",salesHandler(false));
  app.get("/api/orgs/:organizationId/reports/sales.csv",salesHandler(true));

  const inventoryHandler=(asCsv:boolean)=>async(c:Context<{Bindings:Bindings}>)=>{
    c.header("Cache-Control","private, no-store");
    const {organizationId}=c.req.param(),branchId=c.req.query("branch_id");
    if(!UUID_PATTERN.test(organizationId)||(branchId!==undefined&&!UUID_PATTERN.test(branchId)))return c.json({error:"INVALID_REPORT_QUERY"},400);
    const token=session(c);if(!token)return c.json({error:"UNAUTHENTICATED"},401);
    try{
      const result=await withDatabaseClient(c.env.DATABASE_URL,(client)=>withDatabaseTransaction(client,async(tx)=>{
        const auth=await authorizeTenantOperation(tx,token,organizationId,"reports.inventory",false);
        if(!auth.allowed)return {kind:auth.reason === "unauthenticated_or_out_of_scope" ? "unauthenticated" as const : "forbidden" as const};
        if(auth.context.role==="cashier")return {kind:"forbidden" as const};
        if(asCsv&&!isCommercialOperationAllowed(auth.context.role,"exports.allowed_data"))return {kind:"forbidden" as const};
        if(branchId){
          const branchAuth=await authorizeBranchOperation(tx,token,organizationId,branchId,"reports.inventory",false);
          if(!branchAuth.allowed)return {kind:"forbidden" as const};
        }
        const includeValuation=isCommercialOperationAllowed(auth.context.role,"reports.inventory.valuation");
        const membershipFilter=auth.context.role==="inventory"?
          "AND EXISTS(SELECT 1 FROM public.branch_memberships bm WHERE bm.organization_id=ib.organization_id AND bm.branch_id=ib.branch_id AND bm.user_id=$2 AND bm.is_active=true)":"";
        const costColumns=includeValuation?
          ",p.cost_usd::text AS cost_usd,(ib.on_hand_quantity*p.cost_usd)::numeric(38,4)::text AS cost_valuation_usd": "";
        const rows=await tx.query<any>(
          `SELECT ib.branch_id,b.name AS branch_name,ib.warehouse_id,w.name AS warehouse_name,
                  p.id AS product_id,p.sku,p.barcode,p.name AS product_name,p.unit,p.price_usd::text AS price_usd,
                  ib.on_hand_quantity::text AS on_hand,ib.reserved_quantity::text AS reserved,
                  (ib.on_hand_quantity-ib.reserved_quantity)::numeric(14,3)::text AS available,
                  (ib.on_hand_quantity*p.price_usd)::numeric(38,4)::text AS retail_valuation_usd
                  ${costColumns}
             FROM public.inventory_balances ib
             JOIN public.branches b ON b.organization_id=ib.organization_id AND b.id=ib.branch_id
             JOIN public.warehouses w ON w.organization_id=ib.organization_id AND w.branch_id=ib.branch_id AND w.id=ib.warehouse_id
             JOIN public.products p ON p.organization_id=ib.organization_id AND p.id=ib.product_id
            WHERE ib.organization_id=$1 AND $2::uuid IS NOT NULL AND ($3::uuid IS NULL OR ib.branch_id=$3) ${membershipFilter}
            ORDER BY b.name,w.name,p.name,p.id`,
          [organizationId,auth.context.userId,branchId??null]);
        const totalRetail=sumNumeric(rows.rows.map((row:any)=>row.retail_valuation_usd),38,4);
        const totalCost=includeValuation?sumNumeric(rows.rows.map((row:any)=>row.cost_valuation_usd),38,4):null;
        return {kind:"ok" as const,items:rows.rows,includeValuation,totalRetail,totalCost};
      }));
      if(result.kind==="unauthenticated")return c.json({error:"UNAUTHENTICATED"},401);
      if(result.kind!=="ok")return c.json({error:"FORBIDDEN"},403);
      if(asCsv){
        const header=["sucursal","almacen","sku","barcode","producto","unidad","existencia","reservado","disponible","precio_usd","valor_venta_usd"];
        if(result.includeValuation)header.push("costo_usd","valor_costo_usd");
        const data=[header];
        for(const r of result.items){
          const line=[formatSafeCsvCell(r.branch_name),formatSafeCsvCell(r.warehouse_name),formatSafeCsvCell(r.sku),
            formatSafeCsvCell(r.barcode??""),formatSafeCsvCell(r.product_name),formatSafeCsvCell(r.unit),
            formatCsvNumericCell(r.on_hand),formatCsvNumericCell(r.reserved),formatCsvNumericCell(r.available),
            formatCsvNumericCell(r.price_usd),formatCsvNumericCell(r.retail_valuation_usd)];
          if(result.includeValuation)line.push(formatCsvNumericCell(r.cost_usd),formatCsvNumericCell(r.cost_valuation_usd));
          data.push(line);
        }
        const totals=["TOTAL","","","","","","","","","",formatCsvNumericCell(result.totalRetail)];
        if(result.includeValuation)totals.push("",formatCsvNumericCell(result.totalCost!));
        data.push(totals);
        const closing=Array.from({length:header.length},()=>"");
        closing[0]=formatSafeCsvCell(DISCLAIMER);
        data.push(closing);
        return csvResponse(c,inventoryCsvFilename(),data);
      }
      return c.json({items:result.items,include_valuation:result.includeValuation,total_retail_valuation_usd:result.totalRetail,...(result.includeValuation?{total_cost_valuation_usd:result.totalCost}: {})},200);
    }catch(error){return failure(c,error);}
  };
  app.get("/api/orgs/:organizationId/reports/inventory",inventoryHandler(false));
  app.get("/api/orgs/:organizationId/reports/inventory.csv",inventoryHandler(true));
}
