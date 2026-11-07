import { describe, expect, it, vi } from "vitest";
import { fetchBcvOfficialRate, findApplicableBcvRate, parseBcvOfficialRate, persistBcvOfficialRate, type BcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";

const NOW = new Date("2026-11-05T12:00:00-04:00");

const OFFICIAL_PAGE = `
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

describe("BCV official HTML parser", () => {
  it("extracts the official USD rate and explicit effective date without float rounding", () => {
    expect(parseBcvOfficialRate(OFFICIAL_PAGE, NOW)).toEqual({
      rate: "894.88760000",
      effectiveDate: "2026-11-05",
    });
  });

  it("normalizes Spanish thousands and decimal separators", () => {
    const html = OFFICIAL_PAGE.replace("894,88760000", "1.234,56789012");
    expect(parseBcvOfficialRate(html, NOW).rate).toBe("1234.56789012");
  });

  it("parses the full Spanish date form with de and weekday", () => {
    const html = OFFICIAL_PAGE.replace(
      "Jueves, 05 Noviembre 2026",
      "Lunes, 09 de noviembre de 2026",
    );
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-09");
  });

  it("accepts the next effective date when BCV publishes in advance", () => {
    const html = OFFICIAL_PAGE.replace("05 Noviembre 2026", "06 Noviembre 2026");
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-06");
  });

  it("rejects a missing USD rate", () => {
    expect(() => parseBcvOfficialRate(OFFICIAL_PAGE.replace(/USD/g, "GBP"), NOW))
      .toThrow("BCV_USD_RATE_MISSING");
  });

  it("rejects a missing or malformed effective date", () => {
    expect(() => parseBcvOfficialRate(OFFICIAL_PAGE.replace("Fecha Valor:", "Fecha:"), NOW))
      .toThrow("BCV_EFFECTIVE_DATE_MISSING");
  });

  it("rejects zero, invalid separators and impossible values", () => {
    expect(() => parseBcvOfficialRate(OFFICIAL_PAGE.replace("894,88760000", "0,00000000"), NOW))
      .toThrow("BCV_RATE_VALUE_INVALID");
    expect(() => parseBcvOfficialRate(OFFICIAL_PAGE.replace("894,88760000", "894.88760000"), NOW))
      .toThrow("BCV_RATE_FORMAT_INVALID");
  });

  it("accepts a next-business-day rate published before a weekend", () => {
    const mondayPage = OFFICIAL_PAGE.replace("05 Noviembre 2026", "09 Noviembre 2026");
    expect(parseBcvOfficialRate(mondayPage, NOW).effectiveDate).toBe("2026-11-09");
  });

  it("rejects implausibly old or distant future effective dates", () => {
    const oldPage = OFFICIAL_PAGE.replace("05 Noviembre 2026", "01 Enero 2026");
    const futurePage = OFFICIAL_PAGE.replace("05 Noviembre 2026", "20 Noviembre 2026");
    expect(() => parseBcvOfficialRate(oldPage, NOW)).toThrow("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
    expect(() => parseBcvOfficialRate(futurePage, NOW)).toThrow("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
  });

  it("rejects oversized or empty source responses", () => {
    expect(() => parseBcvOfficialRate("", NOW)).toThrow("BCV_HTML_SIZE_INVALID");
    expect(() => parseBcvOfficialRate("x".repeat(2_000_001), NOW)).toThrow("BCV_HTML_SIZE_INVALID");
  });
});


describe("BCV applicable-date selection", () => {
  it("selects the next effective date on a Caracas weekend", async () => {
    const statements: string[] = [];
    const client = {
      query: async <Row = unknown>(statement: string) => {
        statements.push(statement);
        return { rows: [{ rate: "895.10000000", effective_date: "2026-11-09", fetched_at: "2026-11-06T22:00:00Z", validation_status: "valid" }] as Row[] };
      },
    } as unknown as DatabaseClient;

    const selected = await findApplicableBcvRate(client, new Date("2026-11-07T12:00:00-04:00"));
    expect(selected?.effective_date).toBe("2026-11-09");
    expect(statements[0]).toContain("effective_date > $2::date");
    expect(statements[0]).toContain("ORDER BY effective_date ASC");
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
    expect(statements[0]).toContain("effective_date <= $2::date");
    expect(statements[0]).toContain("ORDER BY effective_date DESC");
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

describe("BCV official fetch bounds", () => {
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
