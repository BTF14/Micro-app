import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "hono";
import type { Bindings } from "./bindings";

const limiter = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock("./runtime-write-rate-limit", () => ({ enforceRuntimeWriteRateLimit: limiter.enforce }));

import app from "./index";

const organizationId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const warehouseId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";
const shiftId = "55555555-5555-4555-8555-555555555555";
const userId = "66666666-6666-4666-8666-666666666666";

const cases: Array<{
  name: string;
  method: "POST" | "PATCH";
  path: string;
  scope: string;
  limit: number;
  headers?: Record<string, string>;
  body?: unknown;
}> = [
  {
    name: "catalog create",
    method: "POST",
    path: `/api/orgs/${organizationId}/catalog`,
    scope: "catalog:create",
    limit: 30,
    body: { sku: "SKU-1", name: "Product", price_usd: "1.00" },
  },
  {
    name: "catalog import preview",
    method: "POST",
    path: `/api/orgs/${organizationId}/catalog/imports/preview`,
    scope: "catalog:import:preview",
    limit: 20,
    body: { csv: "sku,name,price_usd\nSKU-1,Product,1.00" },
  },
  {
    name: "catalog import apply",
    method: "POST",
    path: `/api/orgs/${organizationId}/catalog/imports/apply`,
    scope: "catalog:import:apply",
    limit: 10,
    headers: { "Idempotency-Key": "catalog-import-rate-limit-test" },
    body: { csv: "sku,name,price_usd\nSKU-1,Product,1.00" },
  },
  {
    name: "catalog update",
    method: "PATCH",
    path: `/api/orgs/${organizationId}/catalog/${productId}`,
    scope: "catalog:update",
    limit: 30,
    body: { name: "Updated product" },
  },
  {
    name: "inventory count create",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/counts/physical`,
    scope: "inventory:count:create",
    limit: 10,
    headers: { "Idempotency-Key": "count-rate-limit-test" },
    body: { reason: "Physical count", lines: [{ product_id: productId, counted_quantity: "2" }] },
  },
  {
    name: "inventory count confirm",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/counts/${shiftId}/confirm`,
    scope: "inventory:count:confirm",
    limit: 10,
  },
  {
    name: "inventory receipt create",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/warehouses/${warehouseId}/receipts`,
    scope: "inventory:receipt:create",
    limit: 10,
    headers: { "Idempotency-Key": "receipt-rate-limit-test" },
    body: { reason: "Supplier receipt", lines: [{ product_id: productId, quantity: "2", unit_cost_usd: "1.00" }] },
  },
  {
    name: "register shift open",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/register-shifts`,
    scope: "register-shift:open",
    limit: 10,
    body: { register_id: productId, opening_cash_usd: "1.00", opening_cash_ves: "1.00" },
  },
  {
    name: "register shift close",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/register-shifts/${shiftId}/close`,
    scope: "register-shift:close",
    limit: 10,
    body: { closing_cash_usd: "1.00", closing_cash_ves: "1.00" },
  },
  {
    name: "organization branch create",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches`,
    scope: "organization:branch:create",
    limit: 10,
    body: { name: "Central", slug: "central" },
  },
  {
    name: "organization warehouse create",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/warehouses`,
    scope: "organization:warehouse:create",
    limit: 10,
    body: { name: "Main warehouse", code: "MAIN" },
  },
  {
    name: "organization register create",
    method: "POST",
    path: `/api/orgs/${organizationId}/branches/${branchId}/registers`,
    scope: "organization:register:create",
    limit: 10,
    body: { name: "Main register", code: "REG-1" },
  },
  {
    name: "organization branch membership update",
    method: "PATCH",
    path: `/api/orgs/${organizationId}/branches/${branchId}/members/${userId}`,
    scope: "organization:branch-membership:update",
    limit: 10,
    body: { is_active: false },
  },
 ];

describe("runtime write rate-limit route coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limiter.enforce.mockImplementation(async (c: Context<{ Bindings: Bindings }>) =>
      c.json({ error: "RATE_LIMITED", message: "Límite de prueba." }, 429),
    );
  });

  it.each(cases)("fails closed for $name when the trusted client identity is unavailable", async (route) => {
    limiter.enforce.mockImplementation(async (context: Context<{ Bindings: Bindings }>) =>
      context.json({
        error: "RATE_LIMIT_UNAVAILABLE",
        message: "No se pudo verificar el límite de solicitudes. Inténtalo de nuevo más tarde.",
      }, 503),
    );
    const headers = new Headers({
      Cookie: "microapp_session=synthetic-runtime-write-session",
      Origin: "https://frontend.example",
      "Content-Type": "application/json",
    });
    for (const [name, value] of Object.entries(route.headers ?? {})) headers.set(name, value);

    const response = await app.fetch(new Request("https://api.example" + route.path, {
      method: route.method,
      headers,
      ...(route.body === undefined ? {} : { body: JSON.stringify(route.body) }),
    }), {
      FRONTEND_ORIGIN: "https://frontend.example",
      GOOGLE_CLIENT_SECRET: "unit-test-google-client-secret",
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "RATE_LIMIT_UNAVAILABLE" });
    expect(limiter.enforce).toHaveBeenCalledTimes(1);
    expect(limiter.enforce).toHaveBeenCalledWith(expect.anything(), route.scope, route.limit);
  });

  it.each(cases)("stops $name at the limiter before opening a business transaction", async (route) => {
    const headers = new Headers({
      Cookie: "microapp_session=synthetic-runtime-write-session",
      Origin: "https://frontend.example",
      "Content-Type": "application/json",
      "CF-Connecting-IP": "198.51.100.240",
    });
    for (const [name, value] of Object.entries(route.headers ?? {})) headers.set(name, value);

    const response = await app.fetch(new Request("https://api.example" + route.path, {
      method: route.method,
      headers,
      ...(route.body === undefined ? {} : { body: JSON.stringify(route.body) }),
    }), {
      FRONTEND_ORIGIN: "https://frontend.example",
      GOOGLE_CLIENT_SECRET: "unit-test-google-client-secret",
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: "RATE_LIMITED" });
    expect(limiter.enforce).toHaveBeenCalledTimes(1);
    expect(limiter.enforce).toHaveBeenCalledWith(expect.anything(), route.scope, route.limit);
  });
});
