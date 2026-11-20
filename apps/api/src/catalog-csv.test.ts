import { describe, expect, it } from "vitest";
import {
  CSV_MAX_BYTES,
  CSV_MAX_DATA_ROWS,
  CatalogCsvError,
  computeCanonicalCsvHash,
  formatSafeCsvCell,
  neutralizeCsvFormula,
  parseCatalogCsv,
} from "./catalog-csv";

const parse = (csv: string, delimiter: "," | ";" | "auto" = "auto") => parseCatalogCsv(csv, delimiter);
const codes = (csv: string, delimiter: "," | ";" | "auto" = "auto") =>
  parse(csv, delimiter).errors.map((error) => error.code);

describe("catalog CSV decoding and limits", () => {
  it("accepts UTF-8 with and without BOM", () => {
    expect(parse("sku,name\nA,Alpha").rows[0]?.name).toBe("Alpha");
    const bytes = new TextEncoder().encode("\uFEFFsku,name\nA,Alpha");
    expect(parseCatalogCsv(bytes).rows[0]?.sku).toBe("A");
  });

  it("rejects invalid UTF-8 and NUL", () => {
    expect(() => parseCatalogCsv(new Uint8Array([0x73, 0x6b, 0x75, 0x0a, 0xc3, 0x28]))).toThrowError(
      expect.objectContaining({ code: "INVALID_UTF8" }),
    );
    expect(() => parseCatalogCsv(new TextEncoder().encode("sku\nA\u0000B"))).toThrowError(
      expect.objectContaining({ code: "NUL_BYTE" }),
    );
  });

  it("accepts exactly 256 KiB and rejects one byte more", () => {
    const exact = "sku\nA" + " ".repeat(CSV_MAX_BYTES - 5);
    expect(new TextEncoder().encode(exact).byteLength).toBe(CSV_MAX_BYTES);
    expect(parse(exact, ",").rows).toHaveLength(1);
    const oversized = exact + " ";
    expect(() => parse(oversized, ",")).toThrowError(expect.objectContaining({ code: "CSV_TOO_LARGE" }));
  });

  it("accepts 1000 data rows and rejects 1001", () => {
    const rows = Array.from({ length: CSV_MAX_DATA_ROWS }, (_, index) => `SKU${index}`).join("\n");
    expect(parse(`sku\n${rows}`, ",").dataRowCount).toBe(1000);
    expect(() => parse(`sku\n${rows}\nSKU1000`, ",")).toThrowError(
      expect.objectContaining({ code: "TOO_MANY_ROWS" }),
    );
  });

  it("ignores fully empty records", () => {
    const result = parse("sku,name\n\nA,Alpha\n,,\n");
    expect(result.dataRowCount).toBe(1);
    expect(result.rows).toHaveLength(1);
  });
});

describe("delimiter selection and RFC 4180", () => {
  it("parses comma and semicolon dialects with their decimal conventions", () => {
    expect(parse("sku,price_usd\nA,12.3456", ",").rows[0]?.price_usd).toBe("12.3456");
    expect(parse("sku;price_usd\nA;12,3456", ";").rows[0]?.price_usd).toBe("12.3456");
  });

  it("detects a unique delimiter automatically", () => {
    expect(parse("sku,name\nA,Alpha").delimiter).toBe(",");
    expect(parse("sku;name\nA;Alpha").delimiter).toBe(";");
  });

  it("detects delimiters when header cells are quoted", () => {
    expect(parse('"sku","name"\\nA,Alpha').delimiter).toBe(",");
  });

  it("rejects ambiguous auto headers and requests manual selection", () => {
    expect(() => parse("sku,name;price_usd\nA,Alpha;1.00", "auto")).toThrowError(
      expect.objectContaining({ code: "AMBIGUOUS_DELIMITER" }),
    );
  });

  it("supports escaped quotes, quoted delimiters and CRLF/LF in quoted fields", () => {
    const escaped = parse('sku,name\nA,"Alpha ""Prime"""');
    expect(escaped.rows[0]?.name).toBe('Alpha "Prime"');
    const delimiter = parse('sku,name\nA,"Alpha, Prime"');
    expect(delimiter.rows[0]?.name).toBe("Alpha, Prime");
    const multiline = parse('sku,description\r\nA,"line one\r\nline two"');
    expect(multiline.errors.some((error) => error.code === "INVALID_TEXT")).toBe(true);
    expect(multiline.dataRowCount).toBe(1);
  });

  it("rejects unclosed quotes and unexpected characters after closing quotes", () => {
    expect(() => parse('sku,name\nA,"Alpha')).toThrowError(
      expect.objectContaining({ code: "UNCLOSED_QUOTE" }),
    );
    expect(() => parse('sku,name\nA,"Alpha"x')).toThrowError(
      expect.objectContaining({ code: "MALFORMED_CSV" }),
    );
  });
});

describe("headers and row validation", () => {
  it("normalizes header spaces and casing", () => {
    const result = parse(" SKU , NAME , PRICE_USD \nA,Alpha,1.2500");
    expect(result.headers).toEqual(["sku", "name", "price_usd"]);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects duplicate headers after normalization", () => {
    expect(() => parse("sku, SKU \nA,A")).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_HEADER" }),
    );
  });

  it("rejects unknown and prohibited inventory headers explicitly", () => {
    expect(() => parse("sku,unknown\nA,x")).toThrowError(
      expect.objectContaining({ code: "UNKNOWN_COLUMN" }),
    );
    for (const header of ["stock", "stock_quantity", "existencias", "almacén", "on_hand"]) {
      expect(() => parse(`sku,${header}\nA,1`)).toThrowError(
        expect.objectContaining({ code: "FORBIDDEN_COLUMN" }),
      );
    }
  });

  it("rejects empty headers", () => {
    expect(() => parse("sku,,name\nA,1,B")).toThrowError(
      expect.objectContaining({ code: "EMPTY_HEADER" }),
    );
  });

  it("requires SKU in the header and every data row", () => {
    expect(() => parse("name\nAlpha", ",")).toThrowError(
      expect.objectContaining({ code: "SKU_HEADER_REQUIRED" }),
    );
    expect(codes("sku,name\n,Alpha")).toContain("SKU_REQUIRED");
  });

  it("validates decimal dialect, exponent, negatives and exact scales", () => {
    expect(codes('sku,price_usd\nA,"1,25"', ",")).toContain("INVALID_DECIMAL");
    expect(codes("sku,price_usd\nA,1e3", ",")).toContain("INVALID_DECIMAL");
    expect(codes("sku,price_usd\nA,-1", ",")).toContain("INVALID_DECIMAL");
    expect(codes("sku,price_usd\nA,1.12345", ",")).toContain("INVALID_DECIMAL");
    expect(codes("sku,cost_usd\nA,1.12345", ",")).toContain("INVALID_DECIMAL");
    expect(codes("sku,minimum_stock\nA,1.1234", ",")).toContain("INVALID_DECIMAL");
  });

  it("validates quantity_mode and integer minimum_stock", () => {
    expect(codes("sku,quantity_mode\nA,other")).toContain("INVALID_QUANTITY_MODE");
    expect(codes("sku,quantity_mode,minimum_stock\nA,integer,1.250")).toContain("FRACTIONAL_INTEGER_MINIMUM");
    expect(codes("sku,quantity_mode,minimum_stock\nA,fractional,1.250")).not.toContain("FRACTIONAL_INTEGER_MINIMUM");
    expect(codes("sku,quantity_mode,minimum_stock\nA,integer,2.000")).not.toContain("FRACTIONAL_INTEGER_MINIMUM");
  });

  it("detects duplicate SKU and non-null barcode collisions", () => {
    const result = parse("sku,barcode\nA,111\nA,222\nB,111");
    expect(result.errors.map((error) => error.code)).toEqual(["DUPLICATE_SKU", "DUPLICATE_BARCODE"]);
  });

  it("parses optional fields, defaults remain the responsibility of create/apply", () => {
    const result = parse("sku,name,barcode,description,is_active\nA,Alpha,,,false");
    expect(result.rows[0]).toMatchObject({ sku: "A", name: "Alpha", barcode: null, description: null, is_active: false });
    expect(result.rows[0]?.price_usd).toBeUndefined();
  });
});

describe("CSV Formula Injection", () => {
  it.each(["=", "+", "-", "@", "\t", "\r"])("neutralizes dangerous prefix %j", (prefix) => {
    const safe = neutralizeCsvFormula(prefix + "SUM(A1)");
    expect(safe).toBe("'" + prefix + "SUM(A1)");
    expect(formatSafeCsvCell(prefix + "SUM(A1)")).toBe(prefix === "\r" ? '"' + safe + '"' : safe);
  });

  it("neutralizes a formula after leading whitespace", () => {
    expect(neutralizeCsvFormula("  =1+1")).toBe("'  =1+1");
  });

  it("quotes and escapes independently from formula neutralization", () => {
    expect(formatSafeCsvCell('=a,"b"')).toBe('"\'=a,""b"""');
    expect(formatSafeCsvCell("a;b", ";")).toBe('"a;b"');
  });

  it("preserves validated decimal strings exactly, including negative numeric representation", () => {
    expect(neutralizeCsvFormula("-12.3400")).toBe("-12.3400");
    expect(formatSafeCsvCell("-12.3400")).toBe("-12.3400");
    expect(neutralizeCsvFormula("0.0000")).toBe("0.0000");
  });
});

describe("canonical hash", () => {
  it("is deterministic for equivalent object key order and changes with scope/options/rows", async () => {
    const rows = [{ sku: "A", price_usd: "1.2300" }];
    const first = await computeCanonicalCsvHash("org-1", { delimiter: ",", strict: true }, rows);
    const reordered = await computeCanonicalCsvHash("org-1", { strict: true, delimiter: "," }, rows);
    const otherOrg = await computeCanonicalCsvHash("org-2", { delimiter: ",", strict: true }, rows);
    const otherRow = await computeCanonicalCsvHash("org-1", { delimiter: ",", strict: true }, [{ sku: "A", price_usd: "1.2400" }]);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(reordered).toBe(first);
    expect(otherOrg).not.toBe(first);
    expect(otherRow).not.toBe(first);
  });
});

describe("error contract", () => {
  it("exposes stable error codes for malformed CSV", () => {
    expect(() => parseCatalogCsv('sku,name\\nA,"unterminated', "auto")).toThrowError(
      expect.objectContaining({ code: "UNCLOSED_QUOTE" }),
    );
  });
});
