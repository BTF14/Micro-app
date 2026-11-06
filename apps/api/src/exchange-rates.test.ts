import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBcvOfficialRate, parseBcvOfficialRate, persistBcvOfficialRate } from "./exchange-rates";
import type { DatabaseClient } from "./database";

afterEach(() => vi.unstubAllGlobals());

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

  it("accepts the next effective date when BCV publishes in advance", () => {
    const html = OFFICIAL_PAGE.replace("05 Noviembre 2026", "06 Noviembre 2026");
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-06");
  });

  it("rejects a missing USD rate", () => {
    expect(() => parseBcvOfficialRate(OFFICIAL_PAGE.replace(/USD/g, "GBP"), NOW))
      .toThrow("BCV_USD_RATE_MISSING");
  });

  it("decodes HTML entities in the BCV effective-date weekday", () => {
    const html = OFFICIAL_PAGE.replace("Jueves", "Mi&eacute;rcoles");
    expect(parseBcvOfficialRate(html, NOW).effectiveDate).toBe("2026-11-05");
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

  it("rejects an implausibly old or future effective date", () => {
    const oldPage = OFFICIAL_PAGE.replace("05 Noviembre 2026", "01 Enero 2026");
    const futurePage = OFFICIAL_PAGE.replace("05 Noviembre 2026", "10 Noviembre 2026");
    expect(() => parseBcvOfficialRate(oldPage, NOW)).toThrow("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
    expect(() => parseBcvOfficialRate(futurePage, NOW)).toThrow("BCV_EFFECTIVE_DATE_OUT_OF_RANGE");
  });

  it("rejects oversized or empty source responses", () => {
    expect(() => parseBcvOfficialRate("", NOW)).toThrow("BCV_HTML_SIZE_INVALID");
    expect(() => parseBcvOfficialRate("x".repeat(2_000_001), NOW)).toThrow("BCV_HTML_SIZE_INVALID");
  });

  it("rejects chunked BCV HTML above the byte ceiling while streaming", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2_000_001));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, {
      headers: { "content-type": "text/html; charset=utf-8" },
    })));
    await expect(fetchBcvOfficialRate(NOW)).rejects.toThrow("BCV_HTML_SIZE_INVALID");
  });

  it("stores today's rate even when tomorrow's effective rate was stored first", async () => {
    const statements: string[] = [];
    const responses: Array<{ rows: unknown[] }> = [
      { rows: [{ id: "today-row" }] },
      { rows: [{ has_newer: true }] },
    ];
    const client = {
      connect: async () => {},
      query: async (statement: string) => {
        statements.push(statement);
        return responses.shift() ?? { rows: [] };
      },
      end: async () => {},
    } as unknown as DatabaseClient;

    await expect(persistBcvOfficialRate(client, {
      rate: "894.88760000",
      effectiveDate: "2026-11-06",
    })).resolves.toBe("older");
    expect(statements[0]).toContain("ON CONFLICT (source, effective_date) DO NOTHING");
    expect(statements[0]).not.toContain("WHERE NOT EXISTS");
    expect(statements[1]).toContain("effective_date > $2::date");
  });

  it("marks a same-date changed BCV value stale without rewriting the stored rate", async () => {
    const statements: string[] = [];
    const responses: Array<{ rows: unknown[] }> = [
      { rows: [] },
      { rows: [{ rate: "894.88760000", effective_date: "2026-11-06", validation_status: "valid" }] },
      { rows: [] },
    ];
    const client = {
      connect: async () => {},
      query: async (statement: string) => {
        statements.push(statement);
        return responses.shift() ?? { rows: [] };
      },
      end: async () => {},
    } as unknown as DatabaseClient;

    await expect(persistBcvOfficialRate(client, {
      rate: "895.00000000",
      effectiveDate: "2026-11-06",
    })).rejects.toThrow("BCV_RATE_CHANGED_FOR_EXISTING_EFFECTIVE_DATE");
    expect(statements[2]).toContain("SET validation_status = 'stale'");
    expect(statements[2]).not.toContain("SET rate");
  });
});
