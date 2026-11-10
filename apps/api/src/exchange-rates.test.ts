import { describe, expect, it, vi } from "vitest";
import officialBcvHomepageHtml from "./fixtures/bcv-homepage-dom-2026-11-09.html?raw";
import { fetchBcvOfficialRate, findApplicableBcvRate, parseBcvOfficialRate, persistBcvOfficialRate, syncBcvOfficialRate, type BcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";

const NOW = new Date("2026-11-05T12:00:00-04:00");

// Synthetic regression fixture. This is NOT a captured response from bcv.org.ve.
// Replace/add a separately archived, hash-verified official fixture only after
// obtaining the real HTML from the canonical BCV HTTPS endpoint.
const SYNTHETIC_BCV_HTML_FIXTURE = `
<html><body>
<p>El tipo de cambio publicado por el BCV es el promedio ponderado.</p>
<p>EUR</p><p>1.006,03263992</p>
<p>CNY</p><p>134,13589147</p>
<p>TRY</p><p>17,89005927</p>
<p>RUB</p><p>10,93279578</p>
<p>USD</p><p>894,88760000</p>
<p>Fecha Valor: Jueves, 05 Noviembre 2026<br/></p>
<h2>Tasas Informativas del Sistema Bancario</h2>
<p>USD Banco Mercantil 895,2581</p>
</body></html>`;

describe("BCV HTML parser — synthetic regression fixtures", () => {
  it("extracts USD rate and explicit effective date from a synthetic fixture without float rounding", () => {
    expect(parseBcvOfficialRate(SYNTHETIC_BCV_HTML_FIXTURE, NOW)).toEqual({
      rate: "894.88760000",
      effectiveDate: "2026-11-05",
    });
  });

  it("normalizes Spanish thousands and decimal separators", () => {
    const html = SYNTHETIC_BCV_HTML_FIXTURE.replace("894,88760000", "1.234,56789012");
    expect(parseBcvOfficialRate(html, NOW).rate).toBe("1234.56789012");
  });

  it("parses the full Spanish date form with de and weekday", () => {
    const html = SYNTHETIC_BCV_HTML_FIXTURE.replace(
      "Jueves, 05 Noviembre 2026",
      "Lunes, 09 de noviembre de 2026",
    );
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-09");
  });

  it("skips unrelated USD mentions and decodes Spanish date entities", () => {
    const html = SYNTHETIC_BCV_HTML_FIXTURE
      .replace("<p>USD</p><p>894,88760000</p>", "<p>USD</p><p>referencia general</p><p>USD</p><p>894,88760000</p>")
      .replace("Jueves, 05 Noviembre 2026", "Mi&eacute;rcoles, 04 de noviembre de 2026");
    expect(parseBcvOfficialRate(html, NOW)).toMatchObject({
      rate: "894.88760000",
      effectiveDate: "2026-11-04",
    });
  });

  it("parses a Spanish effective date with weekday but no comma", () => {
    const html = SYNTHETIC_BCV_HTML_FIXTURE.replace(
      "Jueves, 05 Noviembre 2026",
      "Lunes 09 de noviembre de 2026",
    );
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-09");
  });

  it("accepts the next effective date when BCV publishes in advance", () => {
    const html = SYNTHETIC_BCV_HTML_FIXTURE.replace("05 Noviembre 2026", "06 Noviembre 2026");
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-06");
  });

  it("rejects a missing USD rate", () => {
    expect(() => parseBcvOfficialRate(SYNTHETIC_BCV_HTML_FIXTURE.replace(/USD/g, "GBP"), NOW))
      .toThrow("BCV_USD_RATE_MISSING");
  });

  it("rejects a missing or malformed effective date", () => {
    expect(() => parseBcvOfficialRate(SYNTHETIC_BCV_HTML_FIXTURE.replace("Fecha Valor:", "Fecha:"), NOW))
      .toThrow("BCV_EFFECTIVE_DATE_MISSING");
  });

  it("rejects zero, invalid separators and impossible values", () => {
    expect(() => parseBcvOfficialRate(SYNTHETIC_BCV_HTML_FIXTURE.replace("894,88760000", "0,00000000"), NOW))
      .toThrow("BCV_RATE_VALUE_INVALID");
    expect(() => parseBcvOfficialRate(SYNTHETIC_BCV_HTML_FIXTURE.replace("894,88760000", "894.88760000"), NOW))
      .toThrow("BCV_RATE_FORMAT_INVALID");
  });

  it("enforces the maximum rate without IEEE-754 rounding", () => {
    const exactMaximum = SYNTHETIC_BCV_HTML_FIXTURE.replace("894,88760000", "1.000.000.000,00000000");
    const justAboveMaximum = SYNTHETIC_BCV_HTML_FIXTURE.replace("894,88760000", "1.000.000.000,00000001");
    expect(parseBcvOfficialRate(exactMaximum, NOW).rate).toBe("1000000000.00000000");
    expect(() => parseBcvOfficialRate(justAboveMaximum, NOW)).toThrow("BCV_RATE_VALUE_INVALID");
  });

  it("accepts a next-business-day rate published before a weekend", () => {
    const mondayPage = SYNTHETIC_BCV_HTML_FIXTURE.replace("05 Noviembre 2026", "09 Noviembre 2026");
    expect(parseBcvOfficialRate(mondayPage, NOW).effectiveDate).toBe("2026-11-09");
  });

  it("accepts the inclusive parser sanity-window boundaries without changing checkout applicability", () => {
    const oldestAllowedPage = SYNTHETIC_BCV_HTML_FIXTURE.replace("05 Noviembre 2026", "26 Octubre 2026");
    const furthestAllowedPage = SYNTHETIC_BCV_HTML_FIXTURE.replace("05 Noviembre 2026", "12 Noviembre 2026");

    expect(parseBcvOfficialRate(oldestAllowedPage, NOW).effectiveDate).toBe("2026-10-26");
    expect(parseBcvOfficialRate(furthestAllowedPage, NOW).effectiveDate).toBe("2026-11-12");
  });

  it("rejects dates immediately outside the inclusive parser sanity-window boundaries", () => {
    const oneDayTooOldPage = SYNTHETIC_BCV_HTML_FIXTURE.replace("05 Noviembre 2026", "25 Octubre 2026");
    const oneDayTooFarPage = SYNTHETIC_BCV_HTML_FIXTURE.replace("05 Noviembre 2026", "13 Noviembre 2026");

    expect(() => parseBcvOfficialRate(oneDayTooOldPage, NOW)).toThrow("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
    expect(() => parseBcvOfficialRate(oneDayTooFarPage, NOW)).toThrow("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
  });

  it("rejects oversized or empty source responses", () => {
    expect(() => parseBcvOfficialRate("", NOW)).toThrow("BCV_HTML_SIZE_INVALID");
    expect(() => parseBcvOfficialRate("x".repeat(2_000_001), NOW)).toThrow("BCV_HTML_SIZE_INVALID");
  });
});


describe("BCV applicable-date selection", () => {
  it("does not use a Monday-prepublished rate on Friday before its effective date", async () => {
    const client = {
      query: async <Row = unknown>() => ({
        rows: [{ rate: "895.10000000", effective_date: "2026-11-09", fetched_at: "2026-11-06T22:00:00Z", validation_status: "valid" }] as Row[],
      }),
    } as unknown as DatabaseClient;
    await expect(findApplicableBcvRate(client, new Date("2026-11-06T18:00:00-04:00"))).resolves.toBeNull();
  });

  it("does not use a Monday-prepublished rate on Saturday before its effective date", async () => {
    const statements: string[] = [];
    const client = {
      query: async <Row = unknown>(statement: string) => {
        statements.push(statement);
        return { rows: [{ rate: "895.10000000", effective_date: "2026-11-09", fetched_at: "2026-11-06T22:00:00Z", validation_status: "valid" }] as Row[] };
      },
    } as unknown as DatabaseClient;

    const selected = await findApplicableBcvRate(client, new Date("2026-11-07T12:00:00-04:00"));
    expect(selected).toBeNull();
    expect(statements[0]).toContain("effective_date = $2::date");
    expect(statements[0]).not.toContain("effective_date >");
  });

  it("does not use a Monday-prepublished rate on Sunday before its effective date", async () => {
    const client = {
      query: async <Row = unknown>() => ({
        rows: [{ rate: "895.10000000", effective_date: "2026-11-09", fetched_at: "2026-11-06T22:00:00Z", validation_status: "valid" }] as Row[],
      }),
    } as unknown as DatabaseClient;
    await expect(findApplicableBcvRate(client, new Date("2026-11-08T12:00:00-04:00"))).resolves.toBeNull();
  });

  it("does not skip a stale nearest future rate to select a later date", async () => {
    const statements: string[] = [];
    const client = {
      query: async <Row = unknown>(statement: string) => {
        statements.push(statement);
        return { rows: [{ rate: "895.10000000", effective_date: "2026-11-09", fetched_at: "2026-11-06T22:00:00Z", validation_status: "stale" }] as Row[] };
      },
    } as unknown as DatabaseClient;

    const selected = await findApplicableBcvRate(client, new Date("2026-11-07T12:00:00-04:00"));
    expect(selected).toBeNull();
    expect(statements[0]).toContain("effective_date = $2::date");
  });

  it("never substitutes a future rate for a missing rate on a weekday", async () => {
    const statements: string[] = [];
    const client = {
      query: async <Row = unknown>(statement: string) => {
        statements.push(statement);
        return { rows: [] as Row[] };
      },
    } as unknown as DatabaseClient;

    await findApplicableBcvRate(client, new Date("2026-11-05T12:00:00-04:00"));
    expect(statements[0]).toContain("effective_date = $2::date");
    expect(statements[0]).not.toContain("ORDER BY effective_date DESC");
  });
});

describe("BCV effective-date persistence", () => {
  it("stores today's rate even when tomorrow's rate was stored first", async () => {
    const insertStatements: string[] = [];
    const client = {
      query: async <Row = unknown>(statement: string, values?: unknown[]) => {
        if (statement.includes("INSERT INTO public.exchange_rates")) {
          insertStatements.push(statement);
          return { rows: [{ id: String(values?.[2] ?? "rate") }] as Row[] };
        }
        throw new Error("Unexpected query in BCV persistence regression test");
      },
    } as unknown as DatabaseClient;

    const tomorrow: BcvOfficialRate = { rate: "895.10000000", effectiveDate: "2026-11-06" };
    const today: BcvOfficialRate = { rate: "894.88760000", effectiveDate: "2026-11-05" };

    await expect(persistBcvOfficialRate(client, tomorrow)).resolves.toBe("inserted");
    await expect(persistBcvOfficialRate(client, today)).resolves.toBe("inserted");

    expect(insertStatements).toHaveLength(2);
    for (const statement of insertStatements) {
      expect(statement).toContain("ON CONFLICT (source, effective_date) DO NOTHING");
      expect(statement).not.toContain("effective_date >");
    }
  });
});

  it("restores a stale row when BCV confirms the exact same effective-date value", async () => {
    const statements: Array<{ sql: string; values?: unknown[] }> = [];
    const client = {
      query: async <Row = unknown>(sql: string, values?: unknown[]) => {
        statements.push({ sql, values });
        if (sql.includes("INSERT INTO public.exchange_rates")) return { rows: [] as Row[] };
        if (sql.includes("SELECT rate::text AS rate")) {
          return { rows: [{
            rate: "894.88760000",
            effective_date: "2026-11-05",
            validation_status: "stale",
          }] as Row[] };
        }
        if (sql.includes("UPDATE public.exchange_rates")) return { rows: [] as Row[] };
        throw new Error("Unexpected query in stale BCV recovery regression test");
      },
    } as unknown as DatabaseClient;

    await expect(persistBcvOfficialRate(client, {
      rate: "894.88760000",
      effectiveDate: "2026-11-05",
    })).resolves.toBe("unchanged");

    const restore = statements.find(({ sql }) => sql.includes("UPDATE public.exchange_rates"));
    expect(restore?.sql).toContain("SET validation_status = 'valid'");
    expect(restore?.sql).toContain("AND source = $1");
    expect(restore?.sql).toContain("AND effective_date = $2::date");
    expect(restore?.sql).toContain("AND rate = $3::numeric");
    expect(restore?.sql).toContain("AND validation_status = 'stale'");
    expect(restore?.values).toEqual(["BCV_OFFICIAL_HTML_V1", "2026-11-05", "894.88760000"]);
  });

describe("BCV official fetch bounds", () => {
  it("rejects BCV redirects instead of following an untrusted destination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: "https://example.invalid/redirected" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(fetchBcvOfficialRate(NOW)).rejects.toThrow("BCV_SOURCE_HTTP_ERROR");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe("error");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects an oversized Content-Length before parsing the body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("ignored", {
        headers: { "content-type": "text/html", "content-length": "2000001" },
      }),
    ));
    try {
      await expect(fetchBcvOfficialRate(NOW)).rejects.toThrow("BCV_HTML_SIZE_INVALID");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("enforces the byte ceiling while streaming even without Content-Length", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(1_000_000)));
        controller.enqueue(new TextEncoder().encode("x".repeat(1_000_001)));
      },
      cancel() { cancelled = true; },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      headers: { "content-type": "text/html" },
    })));
    try {
      await expect(fetchBcvOfficialRate(NOW)).rejects.toThrow("BCV_HTML_SIZE_INVALID");
      expect(cancelled).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});


describe("BCV official homepage DOM capture", () => {
  it("parses the sanitized browser-captured official DOM snapshot without float rounding", () => {
    expect(parseBcvOfficialRate(officialBcvHomepageHtml, new Date("2026-11-09T12:00:00-04:00"))).toEqual({
      rate: "897.53830000",
      effectiveDate: "2026-11-09",
    });
  });
});

describe("BCV synchronization connection lifecycle", () => {
  it("closes the claim connection before fetching and uses a fresh connection to persist", async () => {
    const events: string[] = [];
    let attemptId = "";
    let clientNumber = 0;
    const createClient = vi.fn(() => {
      clientNumber += 1;
      const number = clientNumber;
      const client = {
        connect: vi.fn(async () => { events.push(`connect-${number}`); }),
        query: vi.fn(async (statement: string, values?: unknown[]) => {
          events.push(`query-${number}:${statement.trim().split(/\\s+/).slice(0, 3).join(" ")}`);
          if (statement.includes("SET attempt_id =")) {
            attemptId = String(values?.[0]);
            return { rows: [{ attempt_id: attemptId }] };
          }
          if (statement.includes("FOR UPDATE")) {
            return { rows: [{ attempt_id: attemptId }] };
          }
          if (statement.includes("INSERT INTO public.exchange_rates")) {
            return { rows: [{ id: "rate-row" }] };
          }
          return { rows: [] };
        }),
        end: vi.fn(async () => { events.push(`end-${number}`); }),
      };
      return client as unknown as DatabaseClient;
    });

    const fetchMock = vi.fn(async () => {
      events.push("fetch");
      expect(events).toContain("end-1");
      return new Response(officialBcvHomepageHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      )).resolves.toBe("inserted");

      expect(createClient).toHaveBeenCalledTimes(2);
      expect(events.indexOf("end-1")).toBeLessThan(events.indexOf("fetch"));
      expect(events.indexOf("fetch")).toBeLessThan(events.indexOf("connect-2"));
      expect(events).toContain("end-2");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});


describe("BCV synchronization failure and cleanup semantics", () => {
  it("records a fetch failure with a separate short-lived DB connection", async () => {
    const events: string[] = [];
    let attemptId = "";
    let clientNumber = 0;
    const createClient = vi.fn(() => {
      const number = ++clientNumber;
      return {
        connect: vi.fn(async () => { events.push(`connect-${number}`); }),
        query: vi.fn(async (statement: string, values?: unknown[]) => {
          events.push(`query-${number}`);
          if (statement.includes("SET attempt_id =")) {
            attemptId = String(values?.[0]);
            return { rows: [{ attempt_id: attemptId }] };
          }
          if (statement.includes("SET last_outcome = 'failed'")) {
            expect(values?.[0]).toBe(attemptId);
            expect(values?.[1]).toBe("BCV_SOURCE_HTTP_ERROR");
            return { rows: [{ attempt_id: attemptId }] };
          }
          throw new Error("Unexpected query in fetch failure test");
        }),
        end: vi.fn(async () => { events.push(`end-${number}`); }),
      } as unknown as DatabaseClient;
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("BCV_SOURCE_HTTP_ERROR")));

    try {
      await expect(syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      )).rejects.toThrow("BCV_SOURCE_HTTP_ERROR");

      expect(createClient).toHaveBeenCalledTimes(2);
      expect(events.indexOf("end-1")).toBeLessThan(events.indexOf("connect-2"));
      expect(events).toContain("end-2");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("preserves the original BCV error when DB is unavailable while recording failure", async () => {
    let clientNumber = 0;
    let attemptId = "";
    const createClient = vi.fn(() => {
      const number = ++clientNumber;
      return {
        connect: vi.fn(async () => undefined),
        query: vi.fn(async (statement: string, values?: unknown[]) => {
          if (statement.includes("SET attempt_id =")) {
            attemptId = String(values?.[0]);
            return { rows: [{ attempt_id: attemptId }] };
          }
          if (number === 2 && statement.includes("SET last_outcome = 'failed'")) {
            throw new Error("DATABASE_UNAVAILABLE");
          }
          throw new Error("Unexpected query in unavailable DB test");
        }),
        end: vi.fn(async () => undefined),
      } as unknown as DatabaseClient;
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("BCV_SOURCE_HTTP_ERROR")));

    try {
      await expect(syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      )).rejects.toThrow("BCV_SOURCE_HTTP_ERROR");
      expect(createClient).toHaveBeenCalledTimes(2);
      expect(attemptId).toMatch(/^[0-9a-f-]{36}$/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not rewrite a committed success as failed when client cleanup fails afterward", async () => {
    let attemptId = "";
    const terminalStatements: string[] = [];
    let clientNumber = 0;
    const createClient = vi.fn(() => {
      const number = ++clientNumber;
      return {
        connect: vi.fn(async () => undefined),
        query: vi.fn(async (statement: string, values?: unknown[]) => {
          const normalized = statement.trim();
          terminalStatements.push(normalized);
          if (normalized.includes("SET attempt_id =")) {
            attemptId = String(values?.[0]);
            return { rows: [{ attempt_id: attemptId }] };
          }
          if (normalized.includes("FOR UPDATE")) return { rows: [{ attempt_id: attemptId }] };
          if (normalized.includes("INSERT INTO public.exchange_rates")) return { rows: [{ id: "rate-row" }] };
          return { rows: [] };
        }),
        end: vi.fn(async () => {
          if (number === 2) throw new Error("simulated socket cleanup failure");
        }),
      } as unknown as DatabaseClient;
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(officialBcvHomepageHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })));

    try {
      await expect(syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      )).rejects.toThrow("Database connection cleanup failed.");

      expect(terminalStatements.some((statement) => statement === "COMMIT")).toBe(true);
      const guardedFailureUpdates = terminalStatements.filter((statement) =>
        statement.includes("SET last_outcome = 'failed'"),
      );
      expect(guardedFailureUpdates).toHaveLength(1);
      expect(guardedFailureUpdates[0]).toContain("AND last_outcome = 'running'");
      expect(terminalStatements.some((statement) => statement.includes("SET last_success_at = now()"))).toBe(true);
      expect(createClient).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reconciles an ambiguous COMMIT using a guarded update on a fresh connection", async () => {
    let attemptId = "";
    let clientNumber = 0;
    let commitApplied = false;
    const statements: Array<{ client: number; sql: string }> = [];
    const createClient = vi.fn(() => {
      const number = ++clientNumber;
      return {
        connect: vi.fn(async () => undefined),
        query: vi.fn(async (statement: string, values?: unknown[]) => {
          const sql = statement.trim();
          statements.push({ client: number, sql });
          if (sql.includes("SET attempt_id =")) {
            attemptId = String(values?.[0]);
            return { rows: [{ attempt_id: attemptId }] };
          }
          if (sql.includes("FOR UPDATE")) return { rows: [{ attempt_id: attemptId }] };
          if (sql.includes("INSERT INTO public.exchange_rates")) return { rows: [{ id: "rate-row" }] };
          if (sql === "COMMIT") {
            // Model PostgreSQL applying COMMIT while the client loses its reply.
            commitApplied = true;
            throw new Error("COMMIT_RESPONSE_LOST");
          }
          if (sql.includes("SET last_outcome = 'failed'")) {
            expect(number).toBe(3);
            expect(values?.[0]).toBe(attemptId);
            expect(sql).toContain("AND last_outcome = 'running'");
            // The real row is already terminal after the ambiguous COMMIT,
            // therefore the guarded UPDATE affects zero rows.
            return { rows: [] };
          }
          return { rows: [] };
        }),
        end: vi.fn(async () => undefined),
      } as unknown as DatabaseClient;
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(officialBcvHomepageHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })));

    try {
      await expect(syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      )).rejects.toThrow("COMMIT_RESPONSE_LOST");

      expect(commitApplied).toBe(true);
      expect(createClient).toHaveBeenCalledTimes(3);
      const failureUpdate = statements.find(({ sql }) => sql.includes("SET last_outcome = 'failed'"));
      expect(failureUpdate?.client).toBe(3);
      expect(failureUpdate?.sql).toContain("AND last_outcome = 'running'");
      expect(statements.some(({ client, sql }) => client === 2 && sql === "ROLLBACK")).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });


  it("does not let a superseded fetch failure overwrite the newer attempt state", async () => {
    let currentAttemptId = "";
    let clientNumber = 0;
    const createClient = vi.fn(() => {
      ++clientNumber;
      return {
        connect: vi.fn(async () => undefined),
        query: vi.fn(async (statement: string, values?: unknown[]) => {
          if (statement.includes("SET attempt_id =")) {
            currentAttemptId = String(values?.[0]);
            return { rows: [{ attempt_id: currentAttemptId }] };
          }
          if (statement.includes("FOR UPDATE")) {
            return { rows: [{ attempt_id: currentAttemptId }] };
          }
          if (statement.includes("INSERT INTO public.exchange_rates")) {
            return { rows: [{ id: "newer-rate-row" }] };
          }
          if (statement.includes("SET last_outcome = 'failed'")) {
            return values?.[0] === currentAttemptId
              ? { rows: [{ attempt_id: currentAttemptId }] }
              : { rows: [] };
          }
          return { rows: [] };
        }),
        end: vi.fn(async () => undefined),
      } as unknown as DatabaseClient;
    });

    let rejectOlderFetch!: (error: Error) => void;
    let signalOlderFetchStarted!: () => void;
    const olderFetchStarted = new Promise<void>((resolve) => { signalOlderFetchStarted = resolve; });
    const olderFetch = new Promise<Response>((_resolve, reject) => { rejectOlderFetch = reject; });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => {
        signalOlderFetchStarted();
        return olderFetch;
      })
      .mockResolvedValueOnce(new Response(officialBcvHomepageHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const olderAttempt = syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      );
      await olderFetchStarted;

      await expect(syncBcvOfficialRate(
        "postgresql://user:password@db.example/neondb?sslmode=require",
        createClient,
      )).resolves.toBe("inserted");

      const newerAttemptId = currentAttemptId;
      rejectOlderFetch(new Error("BCV_SOURCE_HTTP_ERROR"));
      await expect(olderAttempt).resolves.toBe("superseded");

      expect(currentAttemptId).toBe(newerAttemptId);
      expect(createClient).toHaveBeenCalledTimes(4);
    } finally {
      vi.unstubAllGlobals();
    }
  });

});
