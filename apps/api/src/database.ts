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
  if (!isDatabaseUrlConfigured(databaseUrl)) {
    throw new Error("Database configuration is missing or invalid.");
  }

  const client = createClient(databaseUrl);
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
export async function withDatabaseTransaction<Result>(
  client: DatabaseClient,
  operation: (transaction: DatabaseClient) => Promise<Result>,
): Promise<Result> {
  await client.query("BEGIN");

  try {
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
