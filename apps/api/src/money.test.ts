import { describe, expect, it } from "vitest";
import {
  calculateLineUsd,
  convertUsdToVes,
  formatDecimal,
  formatMoneyForDisplay,
  formatNumeric,
  multiplyDecimals,
  parseDecimal,
  parseNumeric,
  sumDecimals,
  sumNumeric,
} from "./money";

describe("exact decimal arithmetic", () => {
  it("preserves a catalog price such as USD 23.85 without binary floating point", () => {
    expect(parseDecimal("23.85", 4)).toBe(238500n);
    expect(formatMoneyForDisplay("23.8500")).toBe("23.85");
    expect(formatMoneyForDisplay("23.8501")).toBe("23.8501");
  });

  it("multiplies fractional quantities by unit prices at four USD decimals", () => {
    expect(multiplyDecimals("1.250", 3, "23.8500", 4, 4)).toBe("29.8125");
    expect(multiplyDecimals("0.750", 3, "0.9900", 4, 4)).toBe("0.7425");
  });

  it("converts a USD amount using an eight-decimal BCV rate and rounds VES to cents", () => {
    expect(multiplyDecimals("23.8500", 4, "36.50000000", 8, 2)).toBe("870.53");
  });

  it("uses half-away-from-zero for positive and negative midpoint ties", () => {
    expect(multiplyDecimals("1.005", 3, "1", 0, 2)).toBe("1.01");
    expect(multiplyDecimals("-1.005", 3, "1", 0, 2)).toBe("-1.01");
    expect(multiplyDecimals("1.004", 3, "1", 0, 2)).toBe("1.00");
  });

  it("sums line totals at the stored scale without re-rounding", () => {
    expect(sumDecimals(["29.8125", "0.7425", "0.0075"], 4)).toBe("30.5625");
  });

  it("formats without losing significant fractional digits", () => {
    expect(formatDecimal(238500n, 4, 2)).toBe("23.85");
    expect(formatDecimal(238501n, 4, 2)).toBe("23.8501");
    expect(formatDecimal(-5n, 2, 2)).toBe("-0.05");
  });

  it("rejects floats, exponents, whitespace and excess decimal scale", () => {
    expect(() => parseDecimal("1.23456", 4)).toThrow(RangeError);
    expect(() => parseDecimal("1e3", 4)).toThrow(TypeError);
    expect(() => parseDecimal(" 1.00", 2)).toThrow(TypeError);
    expect(() => parseDecimal(23.85 as unknown as string, 2)).toThrow(TypeError);
  });

  it("enforces PostgreSQL NUMERIC precision and scale for catalog, quantity and BCV values", () => {
    expect(parseNumeric("9999999999.9999", 14, 4)).toBe(99999999999999n);
    expect(parseNumeric("99999999999.999", 14, 3)).toBe(99999999999999n);
    expect(parseNumeric("9999999999.99999999", 18, 8)).toBe(999999999999999999n);
    expect(parseNumeric("0.99", 2, 2)).toBe(99n);
    expect(() => parseNumeric("10000000000.0000", 14, 4)).toThrow(RangeError);
    expect(() => parseNumeric("100000000000.000", 14, 3)).toThrow(RangeError);
    expect(() => parseNumeric("10000000000.00000000", 18, 8)).toThrow(RangeError);
    expect(() => parseNumeric("1.00", 2, 2)).toThrow(RangeError);
    expect(() => parseNumeric("1.23456", 14, 4)).toThrow(RangeError);
  });

  it("validates formatted values and prevents aggregate overflow", () => {
    expect(formatNumeric(238500n, 14, 4)).toBe("23.8500");
    expect(() => formatNumeric(100000000000000n, 14, 4)).toThrow(RangeError);
    expect(() => sumNumeric(["9999999999.9999", "0.0001"], 14, 4)).toThrow(RangeError);
  });

  it("provides domain-safe line USD and BCV conversion operations", () => {
    expect(calculateLineUsd("1.250", "23.8500")).toBe("29.8125");
    expect(convertUsdToVes("23.8500", "36.50000000")).toBe("870.53");
    expect(() => calculateLineUsd("1.2500", "23.8500")).toThrow(RangeError);
    expect(() => convertUsdToVes("23.8500", "10000000000.00000000")).toThrow(RangeError);
    expect(() => calculateLineUsd("0.000", "23.8500")).toThrow(RangeError);
    expect(() => calculateLineUsd("-1.000", "23.8500")).toThrow(RangeError);
    expect(() => calculateLineUsd("1.000", "-23.8500")).toThrow(RangeError);
    expect(() => convertUsdToVes("23.8500", "0.00000000")).toThrow(RangeError);
    expect(() => convertUsdToVes("23.8500", "-36.50000000")).toThrow(RangeError);
    expect(() => calculateLineUsd("99999999999.999", "9999999999.9999")).toThrow(RangeError);
  });
});
