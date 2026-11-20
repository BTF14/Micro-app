import { parseNumeric } from "@micro-app/money";
import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Bindings } from "./bindings";
import { authorizeTenantOperation } from "./authorization";
import { clearSessionCookie, isTrustedOrigin } from "./auth";
import { readBodyWithinLimit } from "./bounded-body";
import { withDatabaseClient, withDatabaseTransaction, type DatabaseClient } from "./database";
import { enforceRuntimeWriteRateLimit } from "./runtime-write-rate-limit";
import {
  CatalogCsvError,
  computeCanonicalCsvHash,
  neutralizeCsvFormula,
  parseCatalogCsv,
  type CatalogCsvRow,
  type CatalogCsvRowError,
  type CsvDelimiter,
} from "./catalog-csv";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const MAX_BODY_BYTES = 512 * 1024;
const CHUNK_SIZE = 100;

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  cost_usd: string;
  price_usd: string;
  minimum_stock: string;
  quantity_mode: "integer" | "fractional";
  is_active: boolean;
};

type Summary = {
  total_rows: number;
  creates: number;
  updates: number;
  unchanged: number;
  errors: number;
};

type PlannedItem = {
  row: number;
  sku: string;
  action: "create" | "update" | "unchanged" | "invalid";
  product_id: string | null;
  values: Record<string, string | boolean | null>;
  errors: CatalogCsvRowError[];
};

type Plan = {
  items: PlannedItem[];
  errors: CatalogCsvRowError[];
  summary: Summary;
};

function addError(
  errors: CatalogCsvRowError[],
  row: number,
  field: string,
  code: string,
  message: string,
): void {
  errors.push({ row, field, code, message });
}

function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function hasValidMembershipOutsideOrganization(
  tx: DatabaseClient,
  sessionToken: string,
  organizationId: string,
): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionToken));
  const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const result = await tx.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM public.auth_sessions s
         JOIN public.app_users u ON u.id=s.user_id
         JOIN public.organization_members m ON m.user_id=u.id
         JOIN public.organizations o ON o.id=m.organization_id
        WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.now()
          AND u.is_active=true AND m.is_active=true AND o.is_active=true
          AND m.organization_id<>$2
     ) AS exists`,
    [tokenHash, organizationId],
  );
  return result.rows[0]?.exists === true;
}

function decimalEqual(field: string, left: string, right: string): boolean {
  const scale = field === "minimum_stock" ? 3 : 4;
  return parseNumeric(left, 14, scale) === parseNumeric(right, 14, scale);
}

function rowValues(row: CatalogCsvRow): Record<string, string | boolean | null> {
  const values: Record<string, string | boolean | null> = { sku: row.sku };
  for (const key of [
    "name", "price_usd", "cost_usd", "unit", "quantity_mode",
    "minimum_stock", "barcode", "description", "is_active",
  ] as const) {
    if (Object.prototype.hasOwnProperty.call(row, key)) values[key] = row[key] ?? null;
  }
  return values;
}

async function hasFractionalInventory(
  tx: DatabaseClient,
  organizationId: string,
  productId: string,
): Promise<boolean> {
  const result = await tx.query<{ has_fractional: boolean }>(
    `SELECT (
       EXISTS (
         SELECT 1 FROM public.inventory_balances
          WHERE organization_id=$1 AND product_id=$2
            AND (on_hand_quantity <> pg_catalog.trunc(on_hand_quantity)
              OR reserved_quantity <> pg_catalog.trunc(reserved_quantity))
       )
       OR EXISTS (
         SELECT 1 FROM public.inventory_count_lines l
         JOIN public.inventory_counts c
           ON c.organization_id=l.organization_id AND c.id=l.count_id
          WHERE l.organization_id=$1 AND l.product_id=$2 AND c.status='draft'
            AND l.counted_quantity <> pg_catalog.trunc(l.counted_quantity)
       )
     ) AS has_fractional`,
    [organizationId, productId],
  );
  return result.rows[0]?.has_fractional === true;
}

async function buildPlan(
  tx: DatabaseClient,
  organizationId: string,
  headers: string[],
  rows: CatalogCsvRow[],
  parserErrors: CatalogCsvRowError[],
  lockProducts: boolean,
): Promise<Plan> {
  const productsResult = await tx.query<Product>(
    `SELECT id, sku, barcode, name, description, unit, quantity_mode,
            cost_usd::text AS cost_usd, price_usd::text AS price_usd,
            minimum_stock::text AS minimum_stock, is_active
       FROM public.products
      WHERE organization_id=$1
      ORDER BY id ASC${lockProducts ? " FOR UPDATE" : ""}`,
    [organizationId],
  );
  const bySku = new Map(productsResult.rows.map((product) => [product.sku, product]));
  const errors: CatalogCsvRowError[] = [...parserErrors];
  const items: PlannedItem[] = [];
  const parserErrorsByRow = new Map<number, CatalogCsvRowError[]>();
  for (const error of parserErrors) {
    const bucket = parserErrorsByRow.get(error.row) ?? [];
    bucket.push(error);
    parserErrorsByRow.set(error.row, bucket);
  }

  const touchedExisting = rows.map((row) => bySku.get(row.sku)).filter((p): p is Product => Boolean(p));
  const finalBarcodes = new Map<string, string>();
  for (const product of productsResult.rows) {
    if (product.barcode) finalBarcodes.set(product.barcode, product.id);
  }
  if (headers.includes("barcode")) {
    for (const product of touchedExisting) {
      if (product.barcode) finalBarcodes.delete(product.barcode);
    }
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    const rowNumber = index + 2;
    const rowErrors = [...(parserErrorsByRow.get(rowNumber) ?? [])];
    const existing = bySku.get(row.sku);
    const values = rowValues(row);
    let action: PlannedItem["action"] = existing ? "unchanged" : "create";

    if (!existing) {
      if (!row.name) addError(rowErrors, rowNumber, "name", "MISSING_REQUIRED_FIELD", "name es obligatorio para crear un producto.");
      if (!row.price_usd) addError(rowErrors, rowNumber, "price_usd", "MISSING_REQUIRED_FIELD", "price_usd es obligatorio para crear un producto.");
      values.name = row.name ?? null;
      values.price_usd = row.price_usd ?? null;
      values.cost_usd = row.cost_usd ?? "0.0";
      values.unit = row.unit ?? "unidad";
      values.quantity_mode = row.quantity_mode ?? "integer";
      values.minimum_stock = row.minimum_stock ?? "0.0";
      values.barcode = row.barcode ?? null;
      values.description = row.description ?? null;
      values.is_active = row.is_active ?? true;
      if ((values.quantity_mode === "integer") && parseNumeric(String(values.minimum_stock), 14, 3) % 1000n !== 0n) {
        addError(rowErrors, rowNumber, "minimum_stock", "FRACTIONAL_MINIMUM_STOCK_CONFLICT", "minimum_stock debe ser entero cuando quantity_mode es integer.");
      }
      if (rowErrors.length === 0) action = "create";
    } else {
      const comparisons: Array<[keyof CatalogCsvRow, keyof Product, string]> = [
        ["name", "name", "name"], ["price_usd", "price_usd", "price_usd"],
        ["cost_usd", "cost_usd", "cost_usd"], ["unit", "unit", "unit"],
        ["quantity_mode", "quantity_mode", "quantity_mode"],
        ["minimum_stock", "minimum_stock", "minimum_stock"],
        ["barcode", "barcode", "barcode"], ["description", "description", "description"],
        ["is_active", "is_active", "is_active"],
      ];
      let changed = false;
      for (const [inputKey, productKey, outputKey] of comparisons) {
        if (!headers.includes(outputKey) || !Object.prototype.hasOwnProperty.call(row, inputKey)) continue;
        const next = row[inputKey];
        const previous = existing[productKey];
        const same = (outputKey === "price_usd" || outputKey === "cost_usd" || outputKey === "minimum_stock")
          ? decimalEqual(outputKey, String(previous), String(next))
          : previous === next;
        if (!same) changed = true;
      }
      action = changed ? "update" : "unchanged";
      if (headers.includes("quantity_mode")) {
        const nextMode = row.quantity_mode ?? existing.quantity_mode;
        const nextMinimum = row.minimum_stock ?? existing.minimum_stock;
        if (nextMode === "integer" && parseNumeric(nextMinimum, 14, 3) % 1000n !== 0n) {
          addError(rowErrors, rowNumber, "minimum_stock", "FRACTIONAL_MINIMUM_STOCK_CONFLICT", "minimum_stock debe ser entero cuando quantity_mode es integer.");
        }
        if (existing.quantity_mode === "fractional" && nextMode === "integer") {
          if (await hasFractionalInventory(tx, organizationId, existing.id)) {
            addError(rowErrors, rowNumber, "quantity_mode", "FRACTIONAL_INVENTORY_BALANCE_CONFLICT", "El producto conserva cantidades fraccionarias en saldos o conteos draft.");
          }
        }
      } else if (headers.includes("minimum_stock") && row.minimum_stock !== undefined &&
          (row.quantity_mode ?? existing.quantity_mode) === "integer" &&
          parseNumeric(row.minimum_stock, 14, 3) % 1000n !== 0n) {
        addError(rowErrors, rowNumber, "minimum_stock", "FRACTIONAL_MINIMUM_STOCK_CONFLICT", "minimum_stock debe ser entero cuando quantity_mode es integer.");
      }
    }

    if (headers.includes("barcode")) {
      const barcode = existing ? (Object.prototype.hasOwnProperty.call(row, "barcode") ? row.barcode ?? null : existing.barcode) : row.barcode ?? null;
      if (barcode) {
        const owner = finalBarcodes.get(barcode);
        if (owner && owner !== existing?.id) {
          addError(rowErrors, rowNumber, "barcode", "BARCODE_CONFLICT", "El código de barras ya pertenece a otro producto de la organización.");
        } else {
          finalBarcodes.set(barcode, existing?.id ?? `new:${row.sku}`);
        }
      }
    }

    if (rowErrors.length > 0) {
      action = "invalid";
      errors.push(...rowErrors.filter((error) => !errors.includes(error)));
    }
    items.push({ row: rowNumber, sku: row.sku, action, product_id: existing?.id ?? null, values, errors: rowErrors });
  }

  const summary: Summary = {
    total_rows: rows.length,
    creates: items.filter((item) => item.action === "create").length,
    updates: items.filter((item) => item.action === "update").length,
    unchanged: items.filter((item) => item.action === "unchanged").length,
    errors: errors.length,
  };
  return { items, errors, summary };
}

function safeItems(items: PlannedItem[]): PlannedItem[] {
  return items.map((item) => ({
    ...item,
    sku: neutralizeCsvFormula(item.sku),
    values: Object.fromEntries(Object.entries(item.values).map(([key, value]) => [
      key, typeof value === "string" ? neutralizeCsvFormula(value) : value,
    ])),
  }));
}

function parsePayload(value: unknown): { csv: string; delimiter: CsvDelimiter; expectedHash?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["csv", "delimiter", "expected_hash"].includes(key))) return null;
  if (typeof body.csv !== "string") return null;
  const delimiter = body.delimiter ?? "auto";
  if (delimiter !== "," && delimiter !== ";" && delimiter !== "auto") return null;
  if (body.expected_hash !== undefined && (typeof body.expected_hash !== "string" || !HASH_PATTERN.test(body.expected_hash))) return null;
  return {
    csv: body.csv,
    delimiter,
    ...(typeof body.expected_hash === "string" ? { expectedHash: body.expected_hash } : {}),
  };
}

export function registerCatalogImportRoutes(app: Hono<{ Bindings: Bindings }>): void {
  const register = (mode: "preview" | "apply") => app.post(
    `/api/orgs/:organizationId/catalog/imports/${mode}`,
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const organizationId = c.req.param("organizationId");
      if (!UUID_PATTERN.test(organizationId)) {
        return c.json({ error: "INVALID_ORGANIZATION_ID", message: "El identificador de organización no es válido." }, 400);
      }
      if (!isTrustedOrigin(c.req.header("Origin"), c.env.FRONTEND_ORIGIN)) {
        return c.json({ error: "ORIGIN_NOT_ALLOWED", message: "Origen no autorizado." }, 403);
      }
      if (!/^application\/json(?:\s*;|$)/i.test(c.req.header("Content-Type") ?? "")) {
        return c.json({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Se requiere application/json." }, 415);
      }
      const declaredLength = c.req.header("Content-Length");
      if (declaredLength !== undefined && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)) {
        return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la solicitud excede el límite." }, 413);
      }
      const sessionToken = getCookie(c, "microapp_session");
      if (!sessionToken || sessionToken.length > 128) {
        clearSessionCookie(c);
        return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
      }
      const bounded = await readBodyWithinLimit(c.req.raw.body, MAX_BODY_BYTES);
      if (bounded.kind === "too_large") return c.json({ error: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la solicitud excede el límite." }, 413);
      if (bounded.kind === "invalid") return c.json({ error: "INVALID_IMPORT_PAYLOAD", message: "El cuerpo JSON no es válido." }, 400);
      let raw: unknown;
      try { raw = JSON.parse(bounded.text); } catch {
        return c.json({ error: "INVALID_IMPORT_PAYLOAD", message: "El cuerpo JSON no es válido." }, 400);
      }
      const payload = parsePayload(raw);
      if (!payload) return c.json({ error: "INVALID_IMPORT_PAYLOAD", message: "El payload de importación no es válido." }, 400);
      const idempotencyKey = c.req.header("Idempotency-Key");
      if (mode === "apply" && (!idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey))) {
        return c.json({ error: "INVALID_IDEMPOTENCY_KEY", message: "Se requiere una Idempotency-Key válida." }, 400);
      }

      let parsed;
      try {
        parsed = parseCatalogCsv(payload.csv, payload.delimiter);
      } catch (error) {
        if (error instanceof CatalogCsvError) {
          const status = error.code === "CSV_TOO_LARGE" ? 413 : 400;
          return c.json({ error: error.code, message: error.message }, status);
        }
        return c.json({ error: "INVALID_CSV", message: "No se pudo interpretar el CSV." }, 400);
      }
      const rateLimitError = await enforceRuntimeWriteRateLimit(
        c,
        mode === "preview" ? "catalog:import:preview" : "catalog:import:apply",
        mode === "preview" ? 20 : 10,
      );
      if (rateLimitError) return rateLimitError;

      try {
        const result = await withDatabaseClient(c.env.DATABASE_URL, (client) =>
          withDatabaseTransaction(client, async (tx) => {
            const authorization = await authorizeTenantOperation(tx, sessionToken, organizationId, "catalog.product.manage");
            if (!authorization.allowed) {
              if (authorization.reason === "operation_denied") return { kind: "forbidden" as const };
              const outside = await hasValidMembershipOutsideOrganization(tx, sessionToken, organizationId);
              return { kind: outside ? "not_found" as const : "unauthenticated" as const };
            }
            const tenant = authorization.context;
            const canonicalHash = await computeCanonicalCsvHash(
              tenant.organizationId,
              { delimiter: parsed.delimiter, headers: parsed.headers },
              parsed.rows,
            );
            if (mode === "apply" && payload.expectedHash && payload.expectedHash !== canonicalHash) {
              return { kind: "hash_mismatch" as const };
            }

            if (mode === "preview") {
              const plan = await buildPlan(tx, tenant.organizationId, parsed.headers, parsed.rows, parsed.errors, false);
              return {
                kind: "preview" as const,
                delimiter: parsed.delimiter,
                headers: parsed.headers,
                canonicalHash,
                canApply: plan.errors.length === 0 && parsed.rows.length > 0,
                summary: plan.summary,
                items: safeItems(plan.items),
                errors: plan.errors,
              };
            }

            await tx.query(
              "SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1 || ':' || $2, 0))",
              [tenant.organizationId, idempotencyKey!],
            );
            const prior = await tx.query<{
              id: string; request_hash: string; summary: Summary; audit_log_id: string; created_at: string;
            }>(
              `SELECT id, request_hash, summary, audit_log_id, created_at
                 FROM public.catalog_import_batches
                WHERE organization_id=$1 AND idempotency_key=$2`,
              [tenant.organizationId, idempotencyKey!],
            );
            if (prior.rows[0]) {
              const batch = prior.rows[0];
              if (batch.request_hash !== canonicalHash) return { kind: "idempotency_conflict" as const };
              return {
                kind: "replayed" as const,
                batch_id: batch.id,
                canonical_hash: batch.request_hash,
                summary: batch.summary,
                audit_log_id: batch.audit_log_id,
                created_at: batch.created_at,
              };
            }
            if (parsed.errors.length > 0 || parsed.rows.length === 0) {
              return { kind: "validation_failed" as const, errors: parsed.errors };
            }

            const plan = await buildPlan(tx, tenant.organizationId, parsed.headers, parsed.rows, parsed.errors, true);
            if (plan.errors.some((error) => error.code === "FRACTIONAL_INVENTORY_BALANCE_CONFLICT" || error.code === "FRACTIONAL_MINIMUM_STOCK_CONFLICT")) {
              return { kind: "fractional_conflict" as const, errors: plan.errors };
            }
            if (plan.errors.some((error) => error.code === "BARCODE_CONFLICT")) {
              return { kind: "product_conflict" as const, errors: plan.errors };
            }
            if (plan.errors.length > 0) return { kind: "validation_failed" as const, errors: plan.errors };
            for (let offset = 0; offset < plan.items.length; offset += CHUNK_SIZE) {
              const chunk = plan.items.slice(offset, offset + CHUNK_SIZE);
              for (const item of chunk) {
                if (item.action === "unchanged") continue;
                if (item.action === "create") {
                  const v = item.values;
                  await tx.query(
                    `INSERT INTO public.products
                      (organization_id, sku, barcode, name, description, unit, cost_usd, price_usd, minimum_stock, quantity_mode, is_active)
                     VALUES ($1,$2,$3,$4,$5,$6,$7::numeric,$8::numeric,$9::numeric,$10,$11)`,
                    [tenant.organizationId, v.sku, v.barcode, v.name, v.description, v.unit, v.cost_usd, v.price_usd, v.minimum_stock, v.quantity_mode, v.is_active],
                  );
                } else if (item.action === "update" && item.product_id) {
                  const columns: Array<[string, string]> = [
                    ["name", "name"], ["price_usd", "price_usd"], ["cost_usd", "cost_usd"],
                    ["unit", "unit"], ["quantity_mode", "quantity_mode"], ["minimum_stock", "minimum_stock"],
                    ["barcode", "barcode"], ["description", "description"], ["is_active", "is_active"],
                  ];
                  const assignments: string[] = [];
                  const values: unknown[] = [tenant.organizationId, item.product_id];
                  for (const [column, key] of columns) {
                    if (!parsed.headers.includes(column) || !Object.prototype.hasOwnProperty.call(item.values, key)) continue;
                    values.push(item.values[key]);
                    assignments.push(`${column}=$${values.length}${["price_usd", "cost_usd", "minimum_stock"].includes(column) ? "::numeric" : ""}`);
                  }
                  if (assignments.length > 0) {
                    assignments.push("updated_at=pg_catalog.now()");
                    await tx.query(
                      `UPDATE public.products SET ${assignments.join(", ")} WHERE organization_id=$1 AND id=$2`,
                      values,
                    );
                  }
                }
              }
            }

            const summary = {
              total_rows: plan.summary.total_rows,
              creates: plan.summary.creates,
              updates: plan.summary.updates,
              unchanged: plan.summary.unchanged,
              errors: 0,
            };
            const batchId = crypto.randomUUID();
            const audit = await tx.query<{ id: string }>(
              `INSERT INTO public.audit_logs
                (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
               VALUES ($1,$2,'catalog.import.applied','catalog_import_batch',$3,$4::jsonb)
               RETURNING id`,
              [tenant.organizationId, tenant.userId, batchId, JSON.stringify({
                canonical_hash: canonicalHash,
                idempotency_key: idempotencyKey,
                total_rows: summary.total_rows,
                creates: summary.creates,
                updates: summary.updates,
                unchanged: summary.unchanged,
              })],
            );
            const auditLogId = audit.rows[0]?.id;
            if (!auditLogId) throw new Error("Catalog import audit insert returned no id.");
            const batch = await tx.query<{ created_at: string }>(
              `INSERT INTO public.catalog_import_batches
                (id, organization_id, idempotency_key, request_hash, status, total_rows,
                 created_count, updated_count, unchanged_count, summary, actor_user_id, audit_log_id)
               VALUES ($1,$2,$3,$4,'applied',$5,$6,$7,$8,$9::jsonb,$10,$11)
               RETURNING created_at`,
              [batchId, tenant.organizationId, idempotencyKey, canonicalHash, summary.total_rows,
                summary.creates, summary.updates, summary.unchanged, JSON.stringify(summary), tenant.userId, auditLogId],
            );
            return {
              kind: "applied" as const,
              batch_id: batchId,
              canonical_hash: canonicalHash,
              audit_log_id: auditLogId,
              summary,
              created_at: batch.rows[0]?.created_at ?? new Date().toISOString(),
            };
          }),
        );

        if (result.kind === "unauthenticated") return c.json({ error: "UNAUTHENTICATED", message: "Inicia sesión para continuar." }, 401);
        if (result.kind === "forbidden") return c.json({ error: "FORBIDDEN", message: "No tienes permiso para importar productos." }, 403);
        if (result.kind === "not_found") return c.json({ error: "ORGANIZATION_NOT_FOUND", message: "No se encontró la organización solicitada." }, 404);
        if (result.kind === "hash_mismatch") return c.json({ error: "HASH_MISMATCH", message: "El CSV no coincide con la vista previa confirmada." }, 409);
        if (result.kind === "idempotency_conflict") return c.json({ error: "IDEMPOTENCY_KEY_CONFLICT", message: "La clave de idempotencia ya fue utilizada con otro contenido." }, 409);
        if (result.kind === "validation_failed") return c.json({ error: "CSV_VALIDATION_FAILED", errors: result.errors }, 400);
        if (result.kind === "fractional_conflict") return c.json({ error: "FRACTIONAL_INVENTORY_BALANCE_CONFLICT", errors: result.errors }, 409);
        if (result.kind === "product_conflict") return c.json({ error: "PRODUCT_CONFLICT", errors: result.errors }, 409);
        if (result.kind === "preview") return c.json({
          delimiter: result.delimiter, headers: result.headers, canonical_hash: result.canonicalHash,
          can_apply: result.canApply, summary: result.summary, items: result.items, errors: result.errors,
        }, 200);
        if (result.kind === "replayed") return c.json({
          replayed: true, batch_id: result.batch_id, canonical_hash: result.canonical_hash,
          summary: result.summary, audit_log_id: result.audit_log_id, created_at: result.created_at,
        }, 200);
        return c.json({
          replayed: false, batch_id: result.batch_id, canonical_hash: result.canonical_hash,
          audit_log_id: result.audit_log_id, summary: result.summary, created_at: result.created_at,
        }, 200);
      } catch (error) {
        if (postgresCode(error) === "23505") return c.json({ error: "PRODUCT_CONFLICT", message: "Existe un SKU o código de barras duplicado." }, 409);
        if (postgresCode(error) === "23514") return c.json({ error: "FRACTIONAL_INVENTORY_BALANCE_CONFLICT", message: "El cambio viola una guarda de cantidades enteras; no se aplicó ninguna fila." }, 409);
        return c.json({ error: "CATALOG_IMPORT_FAILED", message: "No se pudo aplicar la importación; no se aplicó ninguna fila." }, 500);
      }
    },
  );

  register("preview");
  register("apply");
}
