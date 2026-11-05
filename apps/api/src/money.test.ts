import { describe, expect, it } from "vitest";
import {
  formatDecimal,
  formatMoneyForDisplay,
  multiplyDecimals,
  parseDecimal,
  sumDecimals,
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

  it("rejects floats, exponents, whitespace, excess precision and oversized integers", () => {
    expect(() => parseDecimal("1.23456", 4)).toThrow(RangeError);
    expect(() => parseDecimal("1e3", 4)).toThrow(TypeError);
    expect(() => parseDecimal(" 1.00", 2)).toThrow(TypeError);
    expect(() => parseDecimal("10000000000.00", 2, 10)).toThrow(RangeError);
    expect(() => parseDecimal(23.85 as unknown as string, 2)).toThrow(TypeError);
  });
});
