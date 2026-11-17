import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const adminUrl = env?.DATABASE_URL_ADMIN;
const runtimeUrl = env?.RUNTIME_DATABASE_URL ?? env?.DATABASE_URL;
const producerUrl = env?.BCV_DATABASE_URL;
const ci = Boolean(env?.CI);

function disposable(url: string | undefined, user: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
      && parsed.pathname === "/microapp_test" && parsed.username === user
      && ["postgres:", "postgresql:"].includes(parsed.protocol);
  } catch { return false; }
}
const safeDb = disposable(adminUrl, "microapp") &&
  disposable(runtimeUrl, "microapp_runtime") &&
  disposable(producerUrl, "microapp_bcv_sync");
if (ci && !safeDb) throw new Error("FX PG integration tests require disposable localhost microapp, microapp_runtime and microapp_bcv_sync connections.");

const SOURCE = "BCV_OFFICIAL_HTML_V1";
const OWNER = "owner";
const ADMIN = "admin";

describe.skipIf(!safeDb)("FX contingency PostgreSQL integration — PG-01..PG-30", () => {
  let admin: Client;
  let runtime: Client;
  let runtime2: Client;
  let producer: Client;
  let organizationId = "";
  let ownerId = "";
  let adminId = "";
  let cashierId = "";
  let today = "";
  let yesterday = "";
  let tomorrow = "";
  let referenceRateId = "";
  let referenceRate = "100.00000000";
  let currentRateId = "";
  let currentRateCreated = false;
  let previousCurrentRate: { id: string; rate: string; validation_status: string; fetched_at: Date } | null = null;
  let previousReferenceRate: { id: string; rate: string; validation_status: string; fetched_at: Date } | null = null;
  let previousSync: Record<string, unknown> | null = null;
  const branches: string[] = [];
  const authIds: string[] = [];
  const attemptIds: string[] = [];
  const futureRateIds: string[] = [];
  let futureRateCreated = false;

  function caracasDate(offsetDays = 0): string {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const get = (key: string) => Number(parts.find((part) => part.type === key)?.value ?? 0);
    const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + offsetDays, 12));
    return date.toISOString().slice(0, 10);
  }

  function safeExpiry(minutes = 20): string {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const get = (key: string) => Number(parts.find((part) => part.type === key)?.value ?? 0);
    const midnightUtc = Date.UTC(get("year"), get("month") - 1, get("day") + 1, 4, 0, 0);
    return new Date(Math.min(Date.now() + minutes * 60_000, midnightUtc - 2_000)).toISOString();
  }

  async function createBranch(label: string, includeAdmin = true): Promise<string> {
    const branch = await admin.query<{ id: string }>(
      "INSERT INTO public.branches(organization_id,name,slug) VALUES($1,$2,$3) RETURNING id",
      [organizationId, label, "fx-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16)],
    );
    const id = branch.rows[0]!.id;
    branches.push(id);
    if (includeAdmin) {
      await admin.query(
        "INSERT INTO public.branch_memberships(organization_id,branch_id,user_id) VALUES($1,$2,$3)",
        [organizationId, id, adminId],
      );
    }
    return id;
  }

  async function createAuthorization(
    branchId: string,
    rate: string,
    actorId = ownerId,
    actorRole = OWNER,
    expiry = safeExpiry(),
    elevatedReason: string | null = null,
    eventType = "authorized",
  ): Promise<string> {
    const result = await runtime.query<{ id: string }>(
      "SELECT public.create_fx_contingency_authorization($1::uuid,$2::uuid,$3::numeric,$4::numeric,$5::uuid,$6::text,$7::timestamptz,$8::uuid,$9::text,$10::text,$11::text) AS id",
      [organizationId, branchId, rate, referenceRate, referenceRateId,
        "PG integration test authorization", expiry, actorId, actorRole, elevatedReason, eventType],
    );
    const id = result.rows[0]!.id;
    authIds.push(id);
    return id;
  }

  async function updateSync(
    outcome: "inserted" | "unchanged" | "failed",
    effectiveDate: string,
    successAt: Date | string | null,
  ): Promise<string> {
    const attemptId = crypto.randomUUID();
    attemptIds.push(attemptId);
    await producer.query(
      "UPDATE public.bcv_sync_state SET attempt_id=$1::uuid,last_attempt_at=pg_catalog.clock_timestamp(),last_success_at=$2::timestamptz,last_outcome=$3,last_error_code=CASE WHEN $3='failed' THEN 'BCV_SYNC_UNKNOWN' ELSE NULL END,last_effective_date=$4::date,updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      [attemptId, successAt, outcome, effectiveDate],
    );
    return attemptId;
  }

  async function setCurrentRateStale(): Promise<void> {
    if (currentRateId) await admin.query(
      "UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1",
      [currentRateId],
    );
    await admin.query(
      "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN',last_effective_date=$1::date,updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      [yesterday],
    );
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    runtime = new Client({ connectionString: runtimeUrl });
    runtime2 = new Client({ connectionString: runtimeUrl });
    producer = new Client({ connectionString: producerUrl });
    await Promise.all([admin.connect(), runtime.connect(), runtime2.connect(), producer.connect()]);
    await admin.query("SELECT pg_advisory_lock(20261117, 260026)");

    today = caracasDate();
    yesterday = caracasDate(-1);
    tomorrow = caracasDate(1);

    const org = await admin.query<{ id: string }>(
      "INSERT INTO public.organizations(name,slug) VALUES($1,$2) RETURNING id",
      ["FX Integration " + crypto.randomUUID(), "fx-integration-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12)],
    );
    organizationId = org.rows[0]!.id;

    const users = await admin.query<{ id: string; email: string }>(
      "INSERT INTO public.app_users(email,display_name) VALUES($1,'FX Owner'),($2,'FX Admin'),($3,'FX Cashier') RETURNING id,email",
      ["fx-owner-" + crypto.randomUUID() + "@example.test", "fx-admin-" + crypto.randomUUID() + "@example.test", "fx-cashier-" + crypto.randomUUID() + "@example.test"],
    );
    ownerId = users.rows.find((row) => row.email.startsWith("fx-owner-"))!.id;
    adminId = users.rows.find((row) => row.email.startsWith("fx-admin-"))!.id;
    cashierId = users.rows.find((row) => row.email.startsWith("fx-cashier-"))!.id;
    await admin.query(
      "INSERT INTO public.organization_members(organization_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'admin'),($1,$4,'cashier')",
      [organizationId, ownerId, adminId, cashierId],
    );

    const current = await admin.query<{ id: string; rate: string; validation_status: string; fetched_at: Date }>(
      "SELECT id,rate::text,validation_status,fetched_at FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
      [SOURCE, today],
    );
    if (current.rows[0]) {
      previousCurrentRate = current.rows[0];
      currentRateId = current.rows[0].id;
      await admin.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE id=$1", [currentRateId]);
    } else {
      const inserted = await admin.query<{ id: string }>(
        "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status,fetched_at) VALUES('USD','VES',250.00000000,$1,$2::date,'stale',pg_catalog.clock_timestamp()-interval '2 days') RETURNING id",
        [SOURCE, today],
      );
      currentRateId = inserted.rows[0]!.id;
      currentRateCreated = true;
    }

    const reference = await admin.query<{ id: string; rate: string; validation_status: string; fetched_at: Date }>(
      "SELECT id,rate::text,validation_status,fetched_at FROM public.exchange_rates WHERE source=$1 AND effective_date=$2::date",
      [SOURCE, yesterday],
    );
    if (reference.rows[0]) {
      previousReferenceRate = reference.rows[0];
      referenceRateId = reference.rows[0].id;
      referenceRate = reference.rows[0].rate;
      await admin.query("UPDATE public.exchange_rates SET rate=100.00000000,validation_status='valid' WHERE id=$1", [referenceRateId]);
      referenceRate = "100.00000000";
    } else {
      const inserted = await admin.query<{ id: string }>(
        "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',100.00000000,$1,$2::date,'valid') RETURNING id",
        [SOURCE, yesterday],
      );
      referenceRateId = inserted.rows[0]!.id;
    }

    const sync = await admin.query(
      "SELECT attempt_id,last_attempt_at,last_success_at,last_outcome,last_error_code,last_effective_date,updated_at FROM public.bcv_sync_state WHERE singleton=true",
    );
    previousSync = sync.rows[0] ?? null;
    await admin.query(
      "UPDATE public.bcv_sync_state SET last_outcome='failed',last_error_code='BCV_SYNC_UNKNOWN',last_effective_date=$1::date,updated_at=pg_catalog.clock_timestamp() WHERE singleton=true",
      [yesterday],
    );
  });

  afterAll(async () => {
    if (!admin) return;
    try {
      await admin.query("BEGIN");
      await admin.query("ALTER TABLE public.fx_contingency_events DISABLE TRIGGER ALL");
      await admin.query("ALTER TABLE public.bcv_sync_success_observations DISABLE TRIGGER ALL");
      await admin.query("ALTER TABLE public.audit_logs DISABLE TRIGGER USER");
      if (organizationId) {
        await admin.query("DELETE FROM public.fx_contingency_events WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.fx_contingency_authorizations WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.fx_contingency_delegations WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.fx_user_pin_credentials WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.audit_logs WHERE organization_id=$1", [organizationId]);
        if (attemptIds.length) await admin.query("DELETE FROM public.bcv_sync_success_observations WHERE attempt_id=ANY($1::uuid[])", [attemptIds]);
        await admin.query("DELETE FROM public.branch_memberships WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.branches WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.organization_members WHERE organization_id=$1", [organizationId]);
        await admin.query("DELETE FROM public.organizations WHERE id=$1", [organizationId]);
        await admin.query("DELETE FROM public.app_users WHERE id=ANY($1::uuid[])", [[ownerId, adminId, cashierId]]);
      }
      await admin.query("ALTER TABLE public.fx_contingency_events ENABLE ALWAYS TRIGGER fx_contingency_events_10_append_only_rows");
      await admin.query("ALTER TABLE public.fx_contingency_events ENABLE ALWAYS TRIGGER fx_contingency_events_20_append_only_truncate");
      await admin.query("ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_10_append_only_rows");
      await admin.query("ALTER TABLE public.bcv_sync_success_observations ENABLE ALWAYS TRIGGER bcv_sync_success_observations_20_append_only_truncate");
      await admin.query("ALTER TABLE public.audit_logs ENABLE TRIGGER USER");
      if (previousCurrentRate) {
        await admin.query("UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1", [previousCurrentRate.id, previousCurrentRate.rate, previousCurrentRate.validation_status, previousCurrentRate.fetched_at]);
      } else if (currentRateCreated && currentRateId) {
        await admin.query("DELETE FROM public.exchange_rates WHERE id=$1", [currentRateId]);
      }
      if (previousReferenceRate) {
        await admin.query("UPDATE public.exchange_rates SET rate=$2::numeric,validation_status=$3,fetched_at=$4 WHERE id=$1", [previousReferenceRate.id, previousReferenceRate.rate, previousReferenceRate.validation_status, previousReferenceRate.fetched_at]);
      } else if (referenceRateId) {
        await admin.query("DELETE FROM public.exchange_rates WHERE id=$1", [referenceRateId]);
      }
      if (previousSync) {
        await admin.query(
          "UPDATE public.bcv_sync_state SET attempt_id=$1,last_attempt_at=$2,last_success_at=$3,last_outcome=$4,last_error_code=$5,last_effective_date=$6,updated_at=$7 WHERE singleton=true",
          [previousSync.attempt_id, previousSync.last_attempt_at, previousSync.last_success_at, previousSync.last_outcome, previousSync.last_error_code, previousSync.last_effective_date, previousSync.updated_at],
        );
      }
      await admin.query("COMMIT");
    } catch {
      await admin.query("ROLLBACK").catch(() => undefined);
    } finally {
      await admin.query("SELECT pg_advisory_unlock(20261117, 260026)").catch(() => undefined);
      await Promise.all([admin.end(), runtime.end(), runtime2.end(), producer.end()]);
    }
  });

  it("PG-01 migration creates exact source, authorization and audit tables", async () => {
    const result = await admin.query("SELECT to_regclass('public.fx_user_pin_credentials') IS NOT NULL AS pin,to_regclass('public.fx_contingency_authorizations') IS NOT NULL AS auth,to_regclass('public.fx_contingency_events') IS NOT NULL AS events,to_regclass('public.bcv_sync_success_observations') IS NOT NULL AS obs");
    expect(result.rows[0]).toEqual({ pin: true, auth: true, events: true, obs: true });
  });

  it("PG-02 rate and reference snapshots use NUMERIC(18,8)", async () => {
    const result = await admin.query("SELECT pg_catalog.format_type(a.atttypid,a.atttypmod) AS type FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.fx_contingency_authorizations'::regclass AND a.attname IN ('rate','reference_rate_value') ORDER BY a.attname");
    expect(result.rows.map((row) => row.type)).toEqual(["numeric(18,8)", "numeric(18,8)"]);
  });

  it("PG-03 authorization starts_at has a server clock default", async () => {
    const result = await admin.query("SELECT pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS expr FROM pg_catalog.pg_attrdef d JOIN pg_catalog.pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE d.adrelid='public.fx_contingency_authorizations'::regclass AND a.attname='starts_at'");
    expect(result.rows[0].expr).toContain("clock_timestamp");
  });

  it("PG-04 observations expose a non-null durable observed_at timestamp", async () => {
    const result = await admin.query("SELECT a.attnotnull,pg_catalog.format_type(a.atttypid,a.atttypmod) AS type FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.bcv_sync_success_observations'::regclass AND a.attname='observed_at'");
    expect(result.rows[0]).toEqual({ attnotnull: true, type: "timestamp with time zone" });
  });

  it("PG-05 only one active authorization is permitted per organization and branch", async () => {
    const branch = await createBranch("PG05");
    await createAuthorization(branch, "101.00000000");
    await expect(createAuthorization(branch, "102.00000000")).rejects.toMatchObject({ code: "23505" });
  });

  it("PG-06 cross-tenant PIN credentials fail their composite foreign key", async () => {
    const foreign = await admin.query<{ id: string }>("INSERT INTO public.organizations(name,slug) VALUES($1,$2) RETURNING id", ["FX foreign", "fx-foreign-" + crypto.randomUUID().slice(0, 8)]);
    await expect(admin.query("INSERT INTO public.fx_user_pin_credentials(organization_id,user_id,kdf_version,iterations,salt,pin_hash) VALUES($1,$2,'pbkdf2-sha256-v1',100000,decode(repeat('01',16),'hex'),decode(repeat('02',32),'hex'))", [foreign.rows[0]!.id, ownerId])).rejects.toMatchObject({ code: "23503" });
    await admin.query("DELETE FROM public.organizations WHERE id=$1", [foreign.rows[0]!.id]);
  });

  it("PG-07 owner can create branch-scoped admin delegation only for an active branch member", async () => {
    const branch = await createBranch("PG07");
    const result = await runtime.query<{ id: string }>("SELECT public.set_fx_contingency_delegation($1::uuid,$2::uuid,$3::uuid,$4::uuid,'owner',false) AS id", [organizationId, branch, adminId, ownerId]);
    expect(result.rows[0]!.id).toBeTruthy();
  });

  it("PG-08 admin cannot authorize without explicit active delegation", async () => {
    const branch = await createBranch("PG08");
    await expect(createAuthorization(branch, "101.00000000", adminId, ADMIN)).rejects.toMatchObject({ code: "23514" });
  });

  it("PG-09 admin authorization succeeds only after branch delegation", async () => {
    const branch = await createBranch("PG09");
    await runtime.query("SELECT public.set_fx_contingency_delegation($1::uuid,$2::uuid,$3::uuid,$4::uuid,'owner',false)", [organizationId, branch, adminId, ownerId]);
    const id = await createAuthorization(branch, "101.00000000", adminId, ADMIN);
    expect(id).toBeTruthy();
  });

  it("PG-10 revoking delegation blocks subsequent admin authorization", async () => {
    const branch = await createBranch("PG10");
    await runtime.query("SELECT public.set_fx_contingency_delegation($1::uuid,$2::uuid,$3::uuid,$4::uuid,'owner',false)", [organizationId, branch, adminId, ownerId]);
    await runtime.query("SELECT public.set_fx_contingency_delegation($1::uuid,$2::uuid,$3::uuid,$4::uuid,'owner',true)", [organizationId, branch, adminId, ownerId]);
    await expect(createAuthorization(branch, "101.00000000", adminId, ADMIN)).rejects.toMatchObject({ code: "23514" });
  });

  it("PG-11 exactly 500 bps does not require elevated confirmation", async () => {
    const branch = await createBranch("PG11");
    const id = await createAuthorization(branch, "105.00000000");
    const row = await admin.query("SELECT deviation_bps,elevated_confirmation_at FROM public.fx_contingency_authorizations WHERE id=$1", [id]);
    expect(row.rows[0]).toEqual({ deviation_bps: 500, elevated_confirmation_at: null });
  });

  it("PG-12 501 bps fails closed without elevated reason", async () => {
    const branch = await createBranch("PG12");
    await expect(createAuthorization(branch, "105.01000000")).rejects.toMatchObject({ code: "23514" });
  });

  it("PG-13 501 bps requires and stores elevated confirmation", async () => {
    const branch = await createBranch("PG13");
    const id = await createAuthorization(branch, "105.01000000", ownerId, OWNER, safeExpiry(), "Owner confirms deviation above five percent.");
    const row = await admin.query("SELECT deviation_bps,elevated_confirmation_at,elevated_confirmation_reason FROM public.fx_contingency_authorizations WHERE id=$1", [id]);
    expect(row.rows[0].deviation_bps).toBe(501);
    expect(row.rows[0].elevated_confirmation_at).toBeTruthy();
    expect(row.rows[0].elevated_confirmation_reason).toContain("above five percent");
  });

  it("PG-14 exactly 2000 bps is within the hard ceiling", async () => {
    const branch = await createBranch("PG14");
    const id = await createAuthorization(branch, "120.00000000", ownerId, OWNER, safeExpiry(), "Owner confirms the twenty percent limit.");
    const row = await admin.query("SELECT deviation_bps FROM public.fx_contingency_authorizations WHERE id=$1", [id]);
    expect(row.rows[0].deviation_bps).toBe(2000);
  });

  it("PG-15 2001 bps is rejected", async () => {
    const branch = await createBranch("PG15");
    await expect(createAuthorization(branch, "120.01000000", ownerId, OWNER, safeExpiry(), "Outside the permitted range.")).rejects.toMatchObject({ code: "23514" });
  });

  it("PG-16 expiration above 24 hours is rejected", async () => {
    const branch = await createBranch("PG16");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5000).toISOString();
    await expect(createAuthorization(branch, "101.00000000", ownerId, OWNER, expiry)).rejects.toMatchObject({ code: "23514" });
  });

  it("PG-17 expiry beyond Caracas midnight is rejected even when under 24 hours", async () => {
    const branch = await createBranch("PG17");
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (key: string) => Number(parts.find((part) => part.type === key)?.value ?? 0);
    const nextMidnight = Date.UTC(get("year"), get("month") - 1, get("day") + 1, 4, 0, 0);
    const expiry = new Date(nextMidnight + 1000).toISOString();
    await expect(createAuthorization(branch, "101.00000000", ownerId, OWNER, expiry)).rejects.toMatchObject({ code: "23514" });
  });

  it("PG-18 authorization renewal closes the old row and records a replacement event", async () => {
    const branch = await createBranch("PG18");
    const oldId = await createAuthorization(branch, "101.00000000");
    await runtime.query("SELECT public.transition_fx_contingency_authorization($1::uuid,$2::uuid,$3::uuid,'revoked',$4::uuid,'owner','renewed by replacement authorization')", [organizationId, branch, oldId, ownerId]);
    const newId = await createAuthorization(branch, "102.00000000", ownerId, OWNER, safeExpiry(), null, "renewed");
    const rows = await admin.query("SELECT id,status FROM public.fx_contingency_authorizations WHERE id=ANY($1::uuid[]) ORDER BY created_at", [[oldId, newId]]);
    expect(rows.rows).toEqual([{ id: oldId, status: "revoked" }, { id: newId, status: "active" }]);
    const event = await admin.query("SELECT count(*)::int AS count FROM public.fx_contingency_events WHERE authorization_id=$1 AND event_type='renewed'", [newId]);
    expect(event.rows[0].count).toBe(1);
  });

  it("PG-19 runtime can read PIN verifier fields but cannot write credential rows directly", async () => {
    const salt = Buffer.alloc(16, 7);
    const hash = Buffer.alloc(32, 9);
    await runtime.query("SELECT public.set_fx_user_pin_credential($1::uuid,$2::uuid,'pbkdf2-sha256-v1',100000,$3::bytea,$4::bytea)", [organizationId, ownerId, salt, hash]);
    const row = await runtime.query("SELECT kdf_version,iterations FROM public.fx_user_pin_credentials WHERE organization_id=$1 AND user_id=$2", [organizationId, ownerId]);
    expect(row.rows[0]).toEqual({ kdf_version: "pbkdf2-sha256-v1", iterations: 100000 });
    await expect(runtime.query("UPDATE public.fx_user_pin_credentials SET iterations=200000 WHERE organization_id=$1 AND user_id=$2", [organizationId, ownerId])).rejects.toMatchObject({ code: "42501" });
  });

  it("PG-20 BCV producer cannot read, write or truncate durable success observations", async () => {
    await expect(producer.query("SELECT * FROM public.bcv_sync_success_observations")).rejects.toMatchObject({ code: "42501" });
    await expect(producer.query("INSERT INTO public.bcv_sync_success_observations(observed_at,last_success_at,last_outcome,last_effective_date) VALUES(now(),now(),'inserted',current_date)")).rejects.toMatchObject({ code: "42501" });
  });

  it("PG-21 runtime has SELECT-only access to durable BCV success observations", async () => {
    await runtime.query("SELECT count(*) FROM public.bcv_sync_success_observations");
    await expect(runtime.query("INSERT INTO public.bcv_sync_success_observations(observed_at,last_success_at,last_outcome,last_effective_date) VALUES(now(),now(),'inserted',current_date)")).rejects.toMatchObject({ code: "42501" });
    await expect(runtime.query("DELETE FROM public.bcv_sync_success_observations")).rejects.toMatchObject({ code: "42501" });
  });

  it("PG-22 runtime cannot mutate append-only events or call the internal append function", async () => {
    const branch = await createBranch("PG22");
    const id = await createAuthorization(branch, "101.00000000");
    await expect(runtime.query("UPDATE public.fx_contingency_events SET details='{}' WHERE authorization_id=$1", [id])).rejects.toMatchObject({ code: "42501" });
    await expect(runtime.query("SELECT public.append_fx_contingency_event($1::uuid,$2::uuid,$3::uuid,'authorized',$4::uuid,'owner','{}'::jsonb)", [organizationId, branch, id, ownerId])).rejects.toMatchObject({ code: "42501" });
  });

  it("PG-23 fx_contingency_events rejects UPDATE and DELETE", async () => {
    const branch = await createBranch("PG23");
    const id = await createAuthorization(branch, "101.00000000");
    await expect(admin.query("UPDATE public.fx_contingency_events SET details='{}' WHERE authorization_id=$1", [id])).rejects.toThrow(/FX_APPEND_ONLY/);
    await expect(admin.query("DELETE FROM public.fx_contingency_events WHERE authorization_id=$1", [id])).rejects.toThrow(/FX_APPEND_ONLY/);
  });

  it("PG-24 fx_contingency_events rejects TRUNCATE", async () => {
    await expect(admin.query("TRUNCATE public.fx_contingency_events")).rejects.toThrow(/FX_APPEND_ONLY/);
  });

  it("PG-25 append-only triggers remain effective in replica mode", async () => {
    const branch = await createBranch("PG25");
    const id = await createAuthorization(branch, "101.00000000");
    await admin.query("BEGIN");
    try {
      await admin.query("SET LOCAL session_replication_role='replica'");
      await expect(admin.query("UPDATE public.fx_contingency_events SET details='{}' WHERE authorization_id=$1", [id])).rejects.toThrow(/FX_APPEND_ONLY/);
    } finally { await admin.query("ROLLBACK"); }
  });

  it("PG-26 inserted BCV success is observed after authorization even if a later failed attempt overwrites state", async () => {
    const branch = await createBranch("PG26");
    const authId = await createAuthorization(branch, "101.00000000");
    const auth = await admin.query<{ starts_at: Date }>("SELECT starts_at FROM public.fx_contingency_authorizations WHERE id=$1", [authId]);
    await admin.query("UPDATE public.exchange_rates SET validation_status='valid',fetched_at=pg_catalog.clock_timestamp() WHERE id=$1", [currentRateId]);
    const oldSuccess = new Date(auth.rows[0]!.starts_at.getTime() - 1000);
    await updateSync("inserted", today, oldSuccess);
    await updateSync("failed", today, oldSuccess);
    const observation = await admin.query<{ observed_at: Date; last_success_at: Date; rate_fetched_at: Date }>(
      "SELECT observed_at,last_success_at,rate_fetched_at FROM public.bcv_sync_success_observations WHERE attempt_id=$1",
      [attemptIds[attemptIds.length - 2]],
    );
    expect(observation.rows[0]!.observed_at.getTime()).toBeGreaterThan(auth.rows[0]!.starts_at.getTime());
    expect(observation.rows[0]!.last_success_at.getTime()).toBeLessThan(auth.rows[0]!.starts_at.getTime());
    expect(observation.rows[0]!.rate_fetched_at.getTime()).toBeGreaterThan(auth.rows[0]!.starts_at.getTime());
    await runtime.query("SELECT public.transition_fx_contingency_authorization($1::uuid,$2::uuid,$3::uuid,'bcv_restored',$4::uuid,'owner','BCV inserted recovery test')", [organizationId, branch, authId, ownerId]);
    const state = await admin.query("SELECT status FROM public.fx_contingency_authorizations WHERE id=$1", [authId]);
    expect(state.rows[0].status).toBe("bcv_restored");
  });

  it("PG-27 unchanged BCV success is durable despite immutable old fetched_at and earlier last_success_at", async () => {
    await setCurrentRateStale();
    const branch = await createBranch("PG27");
    const authId = await createAuthorization(branch, "101.00000000");
    const auth = await admin.query<{ starts_at: Date }>("SELECT starts_at FROM public.fx_contingency_authorizations WHERE id=$1", [authId]);
    const fetchedBefore = await admin.query<{ fetched_at: Date }>("SELECT fetched_at FROM public.exchange_rates WHERE id=$1", [currentRateId]);
    await admin.query("UPDATE public.exchange_rates SET validation_status='valid' WHERE id=$1", [currentRateId]);
    const oldSuccess = new Date(auth.rows[0]!.starts_at.getTime() - 1000);
    const attemptId = await updateSync("unchanged", today, oldSuccess);
    const observation = await admin.query<{ observed_at: Date; last_success_at: Date; rate_fetched_at: Date }>(
      "SELECT observed_at,last_success_at,rate_fetched_at FROM public.bcv_sync_success_observations WHERE attempt_id=$1",
      [attemptId],
    );
    expect(observation.rows[0]!.observed_at.getTime()).toBeGreaterThan(auth.rows[0]!.starts_at.getTime());
    expect(observation.rows[0]!.last_success_at.getTime()).toBeLessThan(auth.rows[0]!.starts_at.getTime());
    expect(observation.rows[0]!.rate_fetched_at.getTime()).toBe(fetchedBefore.rows[0]!.fetched_at.getTime());
    await updateSync("failed", today, oldSuccess);
    await runtime.query("SELECT public.transition_fx_contingency_authorization($1::uuid,$2::uuid,$3::uuid,'bcv_restored',$4::uuid,'owner','BCV unchanged recovery test')", [organizationId, branch, authId, ownerId]);
    const state = await admin.query("SELECT status FROM public.fx_contingency_authorizations WHERE id=$1", [authId]);
    expect(state.rows[0].status).toBe("bcv_restored");
  });

  it("PG-28 future-effective BCV observations do not restore today's contingency", async () => {
    await setCurrentRateStale();
    const branch = await createBranch("PG28");
    const authId = await createAuthorization(branch, "101.00000000");
    const future = await admin.query<{ id: string }>(
      "INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES',300.00000000,$1,$2::date,'valid') RETURNING id",
      [SOURCE, tomorrow],
    );
    futureRateIds.push(future.rows[0]!.id); futureRateCreated = true;
    const attemptId = await updateSync("inserted", tomorrow, new Date(Date.now() - 1000));
    const observation = await admin.query("SELECT observed_at,last_effective_date,validation_status FROM public.bcv_sync_success_observations WHERE attempt_id=$1", [attemptId]);
    expect(observation.rows[0].last_effective_date.toISOString?.() ?? String(observation.rows[0].last_effective_date)).toContain(tomorrow);
    await expect(runtime.query("SELECT public.transition_fx_contingency_authorization($1::uuid,$2::uuid,$3::uuid,'bcv_restored',$4::uuid,'owner','future rate must not restore')", [organizationId, branch, authId, ownerId])).rejects.toMatchObject({ code: "23514" });
    const stillActive = await admin.query("SELECT status FROM public.fx_contingency_authorizations WHERE id=$1", [authId]);
    expect(stillActive.rows[0].status).toBe("active");
  });

  it("PG-29 concurrent authorization attempts serialize through the unique active-branch index", async () => {
    await setCurrentRateStale();
    const branch = await createBranch("PG29");
    const attempts = await Promise.allSettled([
      createAuthorization(branch, "101.00000000"),
      (async () => {
        const result = await runtime2.query<{ id: string }>(
          "SELECT public.create_fx_contingency_authorization($1::uuid,$2::uuid,101.00000000,100.00000000,$3::uuid,'Concurrent contender', $4::timestamptz,$5::uuid,'owner',NULL,'authorized') AS id",
          [organizationId, branch, referenceRateId, safeExpiry(), ownerId],
        );
        const id = result.rows[0]!.id; authIds.push(id); return id;
      })(),
    ]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1);
    const count = await admin.query("SELECT count(*)::int AS count FROM public.fx_contingency_authorizations WHERE organization_id=$1 AND branch_id=$2 AND status='active'", [organizationId, branch]);
    expect(count.rows[0].count).toBe(1);
  });

  it("PG-30 server clock rejects authorization expiry after Caracas midnight", async () => {
    const branch = await createBranch("PG30");
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (key: string) => Number(parts.find((part) => part.type === key)?.value ?? 0);
    const nextMidnight = Date.UTC(get("year"), get("month") - 1, get("day") + 1, 4, 0, 0);
    await expect(createAuthorization(branch, "101.00000000", ownerId, OWNER, new Date(nextMidnight + 5000).toISOString())).rejects.toMatchObject({ code: "23514" });
  });
});
