import { Client } from "@neondatabase/serverless";
import {
  withDatabaseClient,
  type DatabaseClient,
  type DatabaseClientFactory,
} from "./database";
import { BCV_SOURCE_ID, safeBcvSyncErrorCode, syncBcvOfficialRate } from "./exchange-rates";

type IdentityRow = { current_user: string; session_user: string };
type StateRow = { singleton: boolean; last_outcome: string | null };
type RateRow = { id: string; validation_status: "valid" | "stale" };

export type BcvNodeSyncResult =
  | { status: "skipped"; outcome: "inserted" | "unchanged" }
  | { status: "synced"; outcome: "inserted" | "unchanged" | "older" | "superseded" };

export function caracasHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).find((part) => part.type === "hour")?.value;
  return Number(hour ?? "0");
}

export function isCaracasWeekend(now = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    weekday: "short",
  }).format(now);
  return weekday === "Sat" || weekday === "Sun";
}

export function caracasCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((entry) => entry.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Verify the effective PostgreSQL identity on every connection before any application query. */
export function createVerifiedBcvDatabaseClientFactory(
  createClient?: DatabaseClientFactory,
): DatabaseClientFactory {
  const underlying: DatabaseClientFactory = createClient ?? ((databaseUrl) =>
    new Client(databaseUrl) as unknown as DatabaseClient);
  return (databaseUrl) => {
    const client = underlying(databaseUrl);
    return {
      async connect() {
        await client.connect();
        const identity = await client.query<IdentityRow>(
          "SELECT current_user, session_user",
        );
        if (
          identity.rows.length !== 1 ||
          identity.rows[0]?.current_user !== "microapp_bcv_sync" ||
          identity.rows[0]?.session_user !== "microapp_bcv_sync"
        ) {
          throw new Error("BCV_SYNC_DATABASE_ROLE_INVALID");
        }
      },
      query<Row = unknown>(statement: string, values?: unknown[]) {
        return client.query<Row>(statement, values);
      },
      end() {
        return client.end();
      },
    };
  };
}

/** Read only the columns explicitly granted to microapp_bcv_sync by migration 0022. */
export async function shouldSkipBcvNodeSync(
  databaseUrl: string,
  forceSync = false,
  now = new Date(),
  createClient: DatabaseClientFactory = createVerifiedBcvDatabaseClientFactory(),
): Promise<boolean> {
  if (forceSync) return false;
  const today = caracasCalendarDate(now);
  const useFutureRate = isCaracasWeekend(now) || caracasHour(now) >= 16;
  return withDatabaseClient(databaseUrl, async (client) => {
    const state = await client.query<StateRow>(
      "SELECT singleton, last_outcome FROM public.bcv_sync_state WHERE singleton = true",
    );
    const outcome = state.rows[0]?.last_outcome;
    if (outcome !== "inserted" && outcome !== "unchanged") return false;

    const rate = useFutureRate
      ? await client.query<RateRow>(
          `SELECT id, validation_status
             FROM public.exchange_rates
            WHERE source = $1
              AND effective_date > $2::date
              AND effective_date <= ($2::date + 5)
            LIMIT 1`,
          [BCV_SOURCE_ID, today],
        )
      : await client.query<RateRow>(
          `SELECT id, validation_status
             FROM public.exchange_rates
            WHERE source = $1 AND effective_date = $2::date
            LIMIT 1`,
          [BCV_SOURCE_ID, today],
        );
    return rate.rows.some((row) => row.validation_status === "valid");
  }, createClient);
}

/**
 * Production defaults to Neon Client + Node 24 WebSocket. CI injects pg through
 * the same factory contract. Identity verification wraps either transport.
 */
export async function runBcvNodeSync(
  databaseUrl: string | undefined,
  forceSync = false,
  createClient?: DatabaseClientFactory,
  now = new Date(),
): Promise<BcvNodeSyncResult> {
  if (!databaseUrl) throw new Error("BCV_SYNC_DATABASE_URL_MISSING");
  const verifiedFactory = createVerifiedBcvDatabaseClientFactory(createClient);
  const shouldSkip = await shouldSkipBcvNodeSync(databaseUrl, forceSync, now, verifiedFactory);
  if (shouldSkip) {
    const state = await withDatabaseClient(databaseUrl, async (client) =>
      client.query<StateRow>(
        "SELECT singleton, last_outcome FROM public.bcv_sync_state WHERE singleton = true",
      ), verifiedFactory);
    const outcome = state.rows[0]?.last_outcome;
    if (outcome === "inserted" || outcome === "unchanged") {
      return { status: "skipped", outcome };
    }
  }
  try {
    return { status: "synced", outcome: await syncBcvOfficialRate(databaseUrl, verifiedFactory) };
  } catch (error) {
    throw new Error(safeBcvSyncErrorCode(error));
  }
}
