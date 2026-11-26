import { Client } from "@neondatabase/serverless";
import { isDatabaseUrlConfigured } from "./config";

export interface DatabaseQueryResult<Row = unknown> {
  rows: Row[];
}

export interface DatabaseClient {
  connect(): Promise<void>;
  query<Row = unknown>(
    statement: string,
    values?: unknown[],
  ): Promise<DatabaseQueryResult<Row>>;
  end(): Promise<void>;
}

export type DatabaseClientFactory = (databaseUrl: string) => DatabaseClient;

const createNeonClient: DatabaseClientFactory = (databaseUrl) =>
  new Client(databaseUrl) as unknown as DatabaseClient;

/**
 * Owns a single connection for the lifetime of one request operation.
 * Never reuse a Client across Workers requests, and never log DATABASE_URL.
 */
export async function withDatabaseClient<Result>(
  databaseUrl: string | undefined,
  operation: (client: DatabaseClient) => Promise<Result>,
  createClient: DatabaseClientFactory = createNeonClient,
): Promise<Result> {
  const validatedDatabaseUrl =
    typeof databaseUrl === "string" && isDatabaseUrlConfigured(databaseUrl)
      ? databaseUrl
      : undefined;

  if (!validatedDatabaseUrl) {
    throw new Error("Database configuration is missing or invalid.");
  }

  const client = createClient(validatedDatabaseUrl);
  let operationFailed = false;

  try {
    await client.connect();
    return await operation(client);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await client.end();
    } catch {
      // Preserve the original connection/query error if cleanup also fails.
      if (!operationFailed) {
        throw new Error("Database connection cleanup failed.");
      }
    }
  }
}

/**
 * Runs statements that must succeed or fail together (e.g. sale, payments,
 * stock changes and inventory ledger entries) on one interactive transaction.
 */
export interface DatabaseTransactionOptions {
  lockTimeoutMs?: number;
}

export async function withDatabaseTransaction<Result>(
  client: DatabaseClient,
  operation: (transaction: DatabaseClient) => Promise<Result>,
  options: DatabaseTransactionOptions = {},
): Promise<Result> {
  const lockTimeoutMs = options.lockTimeoutMs ?? 5_000;
  if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs <= 0) {
    throw new Error("Database transaction lock timeout must be a positive safe integer.");
  }

  await client.query("BEGIN");

  try {
    await client.query(`SET LOCAL lock_timeout = '${lockTimeoutMs}ms'`);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Do not hide the original transaction failure.
    }
    throw error;
  }
}
