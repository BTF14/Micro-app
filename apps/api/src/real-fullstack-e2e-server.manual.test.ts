import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Client } from "pg";
import { test, vi } from "vitest";

// Test-only database transport adapter. The real Hono application, middleware,
// authorization, SQL and transaction handlers run unchanged against PostgreSQL.
// This does not intercept, stub, or mock any HTTP/API request or response.
vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return {
    Client: class extends postgres.Client {
      constructor(connectionString: string) {
        super({ connectionString });
      }
    },
  };
});

const app = (await import("./index")).default;

type TestFixture = {
  organizationId: string;
  branchId: string;
  warehouseId: string;
  registerId: string;
  ownerSessionToken: string;
  cashierSessionToken: string;
  productName: string;
  productSku: string;
  bcvRate: string;
  effectiveDate: string;
  ownerDisplayName: string;
  cashierDisplayName: string;
};

function caracasDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function assertDirectLogin(client: Client, expectedRole: string, expectedSuperuser = false): Promise<void> {
  const result = await client.query<{ role: string; is_superuser: boolean }>(
    "SELECT current_user AS role, rolsuper AS is_superuser FROM pg_catalog.pg_roles WHERE rolname = current_user",
  );
  if (result.rows[0]?.role !== expectedRole || result.rows[0]?.is_superuser !== expectedSuperuser) {
    throw new Error(`E2E_DATABASE_LOGIN_CONTRACT_INVALID:${expectedRole}`);
  }
}

async function seedRealDatabase(): Promise<{ fixture: TestFixture; runtimeUrl: string; frontendOrigin: string }> {
  const adminUrl = process.env.DATABASE_URL_ADMIN;
  const runtimeUrl = process.env.DATABASE_URL_RUNTIME;
  const bcvSyncUrl = process.env.DATABASE_URL_BCV_SYNC;
  const fixturePath = process.env.E2E_FIXTURE_PATH;
  const frontendOrigin = process.env.E2E_FRONTEND_ORIGIN;
  const required = [adminUrl, runtimeUrl, bcvSyncUrl, fixturePath, frontendOrigin];
  if (required.some((value) => !value)) throw new Error("E2E_DATABASE_CONFIGURATION_MISSING");

  const admin = new Client({ connectionString: adminUrl });
  const runtime = new Client({ connectionString: runtimeUrl });
  const bcvSync = new Client({ connectionString: bcvSyncUrl });
  try {
    await Promise.all([admin.connect(), runtime.connect(), bcvSync.connect()]);
    await assertDirectLogin(admin, "microapp", true);
    await assertDirectLogin(runtime, "microapp_runtime");
    await assertDirectLogin(bcvSync, "microapp_bcv_sync");
    const serverVersion = await admin.query<{ version: string }>(
      "SELECT current_setting('server_version_num') AS version",
    );
    if (!serverVersion.rows[0]?.version.startsWith("18")) {
      throw new Error("E2E_REQUIRES_POSTGRESQL_18");
    }

    let runtimeBcvWriteDenied = false;
    await runtime.query("BEGIN");
    try {
      await runtime.query(
        "UPDATE public.bcv_sync_state SET last_error_code = 'runtime-role-must-not-write' WHERE singleton = true",
      );
    } catch (error) {
      runtimeBcvWriteDenied = (error as { code?: string }).code === "42501";
    } finally {
      await runtime.query("ROLLBACK");
    }
    if (!runtimeBcvWriteDenied) throw new Error("E2E_RUNTIME_ROLE_HAS_BCV_WRITE_PRIVILEGE");

    const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
    const ownerEmail = `owner-${suffix}@example.invalid`;
    const cashierEmail = `cashier-${suffix}@example.invalid`;
    const productName = `E2E Product ${suffix}`;
    const productSku = `E2E-${suffix.toUpperCase()}`;

    const organization = await admin.query<{ id: string }>(
      "INSERT INTO public.organizations (name, slug) VALUES ($1, $2) RETURNING id::text AS id",
      ["E2E Test Organization", `e2e-${suffix}`],
    );
    const organizationId = organization.rows[0]!.id;
    const owner = await admin.query<{ id: string }>(
      "INSERT INTO public.app_users (email, display_name, google_sub, email_verified_at) VALUES ($1, $2, $3, now()) RETURNING id::text AS id",
      [ownerEmail, "Owner E2E", `e2e-owner-${suffix}`],
    );
    const cashier = await admin.query<{ id: string }>(
      "INSERT INTO public.app_users (email, display_name, google_sub, email_verified_at) VALUES ($1, $2, $3, now()) RETURNING id::text AS id",
      [cashierEmail, "Cashier E2E", `e2e-cashier-${suffix}`],
    );
    const ownerId = owner.rows[0]!.id;
    const cashierId = cashier.rows[0]!.id;

    await admin.query(
      "INSERT INTO public.auth_allowlist (email, added_by, note) VALUES ($1, 'e2e-test-harness', 'Synthetic owner identity for disposable full-stack CI'), ($2, 'e2e-test-harness', 'Synthetic cashier identity for disposable full-stack CI')",
      [ownerEmail, cashierEmail],
    );
    await admin.query(
      "INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner'), ($1, $3, 'cashier')",
      [organizationId, ownerId, cashierId],
    );

    const branch = await admin.query<{ id: string }>(
      "INSERT INTO public.branches (organization_id, name, slug) VALUES ($1, 'E2E Test Branch', $2) RETURNING id::text AS id",
      [organizationId, `e2e-${suffix}`],
    );
    const branchId = branch.rows[0]!.id;
    await admin.query(
      "INSERT INTO public.branch_memberships (organization_id, branch_id, user_id) VALUES ($1, $2, $3), ($1, $2, $4)",
      [organizationId, branchId, ownerId, cashierId],
    );

    const warehouse = await admin.query<{ id: string }>(
      "INSERT INTO public.warehouses (organization_id, branch_id, code, name) VALUES ($1, $2, $3, 'E2E Test Warehouse') RETURNING id::text AS id",
      [organizationId, branchId, `e2e-${suffix}`],
    );
    const warehouseId = warehouse.rows[0]!.id;
    const register = await admin.query<{ id: string }>(
      "INSERT INTO public.registers (organization_id, branch_id, name, code) VALUES ($1, $2, 'E2E Test Register', $3) RETURNING id::text AS id",
      [organizationId, branchId, `e2e-${suffix}`],
    );
    const registerId = register.rows[0]!.id;

    const ownerSessionToken = randomBytes(32).toString("base64url");
    const cashierSessionToken = randomBytes(32).toString("base64url");
    const ownerTokenHash = createHash("sha256").update(ownerSessionToken).digest("hex");
    const cashierTokenHash = createHash("sha256").update(cashierSessionToken).digest("hex");
    await admin.query(
      "INSERT INTO public.auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '2 hours'), ($3, $4, now() + interval '2 hours')",
      [ownerId, ownerTokenHash, cashierId, cashierTokenHash],
    );

    // Seed BCV through the same dedicated, non-superuser LOGIN used by the
    // producer. The date is computed in Caracas, not from the runner's UTC day.
    const effectiveDate = caracasDate();
    const bcvRate = "40.12345678";
    await bcvSync.query(
      "INSERT INTO public.exchange_rates (base_currency, quote_currency, rate, source, effective_date, fetched_at, validation_status) VALUES ('USD', 'VES', $1::numeric, 'BCV_OFFICIAL_HTML_V1', $2::date, now(), 'valid')",
      [bcvRate, effectiveDate],
    );
    const syncState = await bcvSync.query(
      "UPDATE public.bcv_sync_state SET attempt_id = $1::uuid, last_attempt_at = now(), last_success_at = now(), last_outcome = 'inserted', last_error_code = NULL, last_effective_date = $2::date, updated_at = now() WHERE singleton = true",
      [randomUUID(), effectiveDate],
    );
    if (syncState.rowCount !== 1) throw new Error("E2E_BCV_SYNC_STATE_SEED_FAILED");

    const fixture: TestFixture = {
      organizationId,
      branchId,
      warehouseId,
      registerId,
      ownerSessionToken,
      cashierSessionToken,
      productName,
      productSku,
      bcvRate,
      effectiveDate,
      ownerDisplayName: "Owner E2E",
      cashierDisplayName: "Cashier E2E",
    };
    await writeFile(fixturePath!, JSON.stringify(fixture), { encoding: "utf8", mode: 0o600 });
    return { fixture, runtimeUrl: runtimeUrl!, frontendOrigin: frontendOrigin! };
  } finally {
    await Promise.allSettled([admin.end(), runtime.end(), bcvSync.end()]);
  }
}

test("serves the real Hono API on disposable PostgreSQL 18 for browser E2E", async () => {
  const { runtimeUrl, frontendOrigin } = await seedRealDatabase();
  const port = Number(process.env.E2E_API_PORT ?? "4174");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("E2E_API_PORT_INVALID");

  const bindings = {
    DATABASE_URL: runtimeUrl,
    FRONTEND_ORIGIN: frontendOrigin,
    GOOGLE_CLIENT_SECRET: process.env.E2E_RATE_LIMIT_PEPPER ?? "disposable-fullstack-e2e-rate-limit-pepper",
  };

  const server = createServer(async (incoming, outgoing) => {
    try {
      const headers = new Headers();
      const hopByHop = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "host"]);
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value === undefined || hopByHop.has(name.toLowerCase())) continue;
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      // Cloudflare supplies this trusted edge header in production. The local
      // loopback-only harness supplies a reserved documentation IP for tests.
      headers.set("CF-Connecting-IP", "198.51.100.17");

      const method = incoming.method ?? "GET";
      const chunks: Buffer[] = [];
      if (method !== "GET" && method !== "HEAD") {
        for await (const chunk of incoming) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      const init: RequestInit & { duplex?: "half" } = { method, headers };
      if (body) {
        init.body = body;
        init.duplex = "half";
      }

      const request = new Request(
        `http://127.0.0.1:${port}${incoming.url ?? "/"}`,
        init,
      );
      const response = await app.fetch(request, bindings);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, name) => outgoing.setHeader(name, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.statusCode = 500;
      outgoing.setHeader("Content-Type", "application/json; charset=utf-8");
      outgoing.end(JSON.stringify({ error: "E2E_API_HARNESS_ERROR", message: "The local API harness could not complete the request." }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const pidFile = process.env.E2E_API_PID_FILE;
  if (!pidFile) throw new Error("E2E_API_PID_FILE_MISSING");
  await writeFile(pidFile, String(process.pid), { encoding: "utf8", mode: 0o600 });
  process.stdout.write("FULLSTACK_API_READY\n");

  await new Promise<void>((resolve) => {
    process.once("SIGUSR2", () => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  });
}, 900_000);
