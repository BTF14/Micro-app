import { describe, expect, it } from "vitest";
import { buildCaracasReportRange, buildSalesCsvTotalRow, formatCaracasReportDate, formatCaracasTimestamp, formatCsvNumericCell, formatPaymentsCsvSummary, formatSafeCsvCell, subtractNumeric } from "./reports";

describe("Caracas report ranges", () => {
  it("builds daily half-open ranges at Caracas midnight", () => {
    expect(buildCaracasReportRange({ period: "daily", date: "2026-11-21" })).toEqual({
      start: "2026-11-21T04:00:00.000Z", end: "2026-11-22T04:00:00.000Z",
    });
  });
  it("starts weeks on Monday and handles month boundaries", () => {
    expect(buildCaracasReportRange({ period: "weekly", date: "2026-11-21" })).toEqual({
      start: "2026-11-16T04:00:00.000Z", end: "2026-11-23T04:00:00.000Z",
    });
    expect(buildCaracasReportRange({ period: "monthly", date: "2026-11-21" })).toEqual({
      start: "2026-11-01T04:00:00.000Z", end: "2026-12-01T04:00:00.000Z",
    });
  });
  it("interprets local custom date-times as UTC-4 and accepts zoned instants", () => {
    expect(buildCaracasReportRange({ period: "custom", from: "2026-11-21T00:00", to: "2026-11-22T00:00" })).toEqual({
      start: "2026-11-21T04:00:00.000Z", end: "2026-11-22T04:00:00.000Z",
    });
    expect(buildCaracasReportRange({ period: "custom", from: "2026-11-21T04:00:00Z", to: "2026-11-22T04:00:00Z" })).not.toBeNull();
  });
  it("rejects invalid dates, inverted ranges and spans above 366 days", () => {
    expect(buildCaracasReportRange({ period: "daily", date: "2026-02-30" })).toBeNull();
    expect(buildCaracasReportRange({ period: "custom", from: "2026-02-30T00:00", to: "2026-03-01T00:00" })).toBeNull();
    expect(buildCaracasReportRange({ period: "custom", from: "2026-11-22T00:00", to: "2026-11-21T00:00" })).toBeNull();
    expect(buildCaracasReportRange({ period: "custom", from: "2025-01-01T00:00Z", to: "2026-01-03T00:00Z" })).toBeNull();
  });
});

describe("CSV output safety", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-cmd", "@evil", "\t=1+1", "\r=1+1", "  =1+1"])("neutralizes formula-leading text %j", (value) => {
    expect(formatSafeCsvCell(value).startsWith('"')).toBe(true);
    expect(formatSafeCsvCell(value)).toContain("'");
  });
  it("quotes commas and doubles embedded quotes", () => {
    expect(formatSafeCsvCell('a,"b"')).toBe('"a,""b"""');
  });
  it("preserves negative numeric values without formula escaping", () => {
    expect(formatCsvNumericCell("-5.0000")).toBe("-5.0000");
    expect(formatCsvNumericCell("0.0100")).toBe("0.0100");
    expect(() => formatCsvNumericCell("1e3")).toThrow();
    expect(() => formatCsvNumericCell("+5")).toThrow();
  });
});

describe("exact cash differences", () => {
  it("preserves positive and negative differences exactly", () => {
    expect(subtractNumeric("12.0000", "10.2500")).toBe("1.7500");
    expect(subtractNumeric("9.0000", "10.2500")).toBe("-1.2500");
    expect(subtractNumeric("99.00", "100.25", 16, 2)).toBe("-1.25");
  });
});

describe("CSV report presentation",()=>{
 it("formats timestamps in Caracas without milliseconds",()=>{
  expect(formatCaracasTimestamp("2026-11-24T12:34:56.987Z")).toBe("2026-11-24 08:34:56");
  expect(formatCaracasReportDate("2026-11-24T03:30:00.000Z")).toBe("2026-11-23");
 });
 it("renders Spanish payment summaries and protects malicious references",()=>{
  const summary=formatPaymentsCsvSummary([
   {method:"cash",currency:"VES",amount:"500.00",reference:"12354",usd_equivalent_snapshot:"0.5435"},
   {method:"other",currency:"USD",amount:"2.0000",reference:"+SUM(2,2)",usd_equivalent_snapshot:"2.0000"},
  ]);
  expect(formatSafeCsvCell(summary)).toContain("Efectivo: VES 500.00 (Ref: 12354; eq. USD 0.5435)");
  expect(formatSafeCsvCell(summary)).toContain("'+SUM(2,2)");
  expect(summary).toContain("Otro: USD 2.0000");
 });
 it("builds the sales TOTAL row with unquoted numeric values and disclaimer",()=>{
  const row=buildSalesCsvTotalRow("20.0000","700.00");
  expect(row[0]).toBe("TOTAL");expect(row[5]).toBe("20.0000");expect(row[6]).toBe("700.00");
  expect(row[11]).toBe(formatSafeCsvCell("COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL"));
  expect(row).toHaveLength(12);
 });
});
