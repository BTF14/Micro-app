import { describe, expect, it } from "vitest";
import { parseBcvOfficialRate } from "./exchange-rates";

const SOURCE = "https://www.bcv.org.ve/";
const MAX_HTML_BYTES = 2_000_000;

describe("manual BCV source connectivity (no database)", () => {
  it("checks HTTPS status, HTML content type, and compatibility with the production parser", async () => {
    const response = await fetch(SOURCE, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType.toLowerCase()).toContain("text/html");

    const declaredLength = response.headers.get("content-length");
    if (declaredLength && /^\d+$/.test(declaredLength)) {
      expect(Number(declaredLength)).toBeLessThanOrEqual(MAX_HTML_BYTES);
    }
    if (!response.body) throw new Error("BCV response body is missing");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error("BCV HTML exceeds the 2 MB safety limit");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = parseBcvOfficialRate(html);

    console.info({
      event: "BCV_CONNECTIVITY_VERIFIED",
      status: response.status,
      contentType: contentType.split(";")[0],
      effectiveDate: parsed.effectiveDate,
      parser: "compatible",
    });
    expect(parsed.rate).toMatch(/^\d+\\.\d{1,8}$/);
    expect(parsed.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }, 20_000);
});
