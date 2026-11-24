import { describe, expect, it, vi } from "vitest";
import {
  withDatabaseClient,
  withDatabaseTransaction,
  type DatabaseClient,
} from "./database";

function makeClient(): DatabaseClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
  };
}

const databaseUrl = "postgresql://user:password@db.example/neondb?sslmode=require";

describe("withDatabaseClient", () => {
  it("connects, runs the operation, and closes the request-scoped client", async () => {
    const client = makeClient();
    const createClient = vi.fn(() => client);

    const result = await withDatabaseClient(
      databaseUrl,
      async (connection) => {
        expect(connection).toBe(client);
        return "ok";
      },
      createClient,
    );

    expect(result).toBe("ok");
    expect(createClient).toHaveBeenCalledWith(databaseUrl);
    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.end).toHaveBeenCalledOnce();
  });

  it("closes the client and preserves the original operation error", async () => {
    const client = makeClient();
    const failure = new Error("query failed");

    await expect(
      withDatabaseClient(databaseUrl, async () => {
        throw failure;
      }, () => client),
    ).rejects.toBe(failure);

    expect(client.end).toHaveBeenCalledOnce();
  });

  it("closes the client after a connection failure and preserves that failure", async () => {
    const client = makeClient();
    const failure = new Error("connection failed");
    vi.mocked(client.connect).mockRejectedValue(failure);

    await expect(
      withDatabaseClient(databaseUrl, async () => "unreachable", () => client),
    ).rejects.toBe(failure);

    expect(client.end).toHaveBeenCalledOnce();
  });

  it("preserves the operation error if client cleanup also fails", async () => {
    const client = makeClient();
    const operationFailure = new Error("query failed");
    vi.mocked(client.end).mockRejectedValue(new Error("driver cleanup detail"));

    await expect(
      withDatabaseClient(
        databaseUrl,
        async () => {
          throw operationFailure;
        },
        () => client,
      ),
    ).rejects.toBe(operationFailure);

    expect(client.end).toHaveBeenCalledOnce();
  });

  it("reports cleanup failure after a successful operation without leaking the driver error", async () => {
    const client = makeClient();
    vi.mocked(client.end).mockRejectedValue(new Error("driver detail"));

    await expect(
      withDatabaseClient(databaseUrl, async () => "saved", () => client),
    ).rejects.toThrow("Database connection cleanup failed.");
  });

  it("rejects invalid configuration without creating a client", async () => {
    const createClient = vi.fn(() => makeClient());

    await expect(
      withDatabaseClient(undefined, async () => "unreachable", createClient),
    ).rejects.toThrow("Database configuration is missing or invalid.");

    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("withDatabaseTransaction", () => {
  it("commits when all statements succeed", async () => {
    const client = makeClient();

    await expect(
      withDatabaseTransaction(client, async () => "saved"),
    ).resolves.toBe("saved");

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it("rolls back and preserves the operation error when a statement fails", async () => {
    const client = makeClient();
    const failure = new Error("write failed");

    await expect(
      withDatabaseTransaction(client, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
  });

  it("preserves the original operation error if rollback also fails", async () => {
    const client = makeClient();
    const failure = new Error("write failed");
    vi.mocked(client.query).mockImplementation(async (statement) => {
      if (statement === "ROLLBACK") throw new Error("rollback failed");
      return { rows: [] };
    });

    await expect(
      withDatabaseTransaction(client, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
  });

  it("attempts rollback if commit fails", async () => {
    const client = makeClient();
    vi.mocked(client.query).mockImplementation(async (statement) => {
      if (statement === "COMMIT") throw new Error("commit failed");
      return { rows: [] };
    });

    await expect(
      withDatabaseTransaction(client, async () => "saved"),
    ).rejects.toThrow("commit failed");

    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
  });
});
