import { describe, expect, it } from "vitest";
import { calculateLineUsd, convertUsdToVes, parseNumeric, sumNumeric } from "@micro-app/money";
import { formatLocalizedDecimal, normalizeDecimalInput } from "./decimal";

describe("web decimal helpers", () => {
  it("trims input, normalizes one comma decimal separator and accepts leading decimals", () => {
    expect(normalizeDecimalInput(" 1234,5000 ")).toBe("1234.5000");
    expect(normalizeDecimalInput("0,")).toBe("0.");
    expect(normalizeDecimalInput(" .5 ")).toBe("0.5");
    expect(normalizeDecimalInput("-.5")).toBe("-0.5");
    expect(normalizeDecimalInput("")).toBe("");
  });

  it("preserves ambiguous separators and does not reinterpret grouped-looking dot values", () => {
    for (const value of ["1.234,56", "1,234.56", "1.2.3", "1,,25"]) {
      expect(normalizeDecimalInput(value)).toBe(value);
      expect(() => parseNumeric(normalizeDecimalInput(value), 14, 4)).toThrow();
    }
    expect(normalizeDecimalInput("1.250")).toBe("1.250");
    expect(parseNumeric(normalizeDecimalInput("1.250"), 14, 3)).toBe(1250n);
  });

  it("groups and localizes exact PostgreSQL NUMERIC values", () => {
    expect(formatLocalizedDecimal("1234567.8900", 14, 4, 2)).toBe("1.234.567,89");
    expect(formatLocalizedDecimal("0.0001", 14, 4, 2)).toBe("0,0001");
    expect(formatLocalizedDecimal("894.88760000", 18, 8, 2)).toBe("894,8876");
  });

  it("enforces the maximum values for USD, stock, VES and FX database columns", () => {
    expect(parseNumeric("9999999999.9999", 14, 4)).toBe(99999999999999n);
    expect(() => parseNumeric("10000000000.0000", 14, 4)).toThrow();
    expect(parseNumeric("99999999999.999", 14, 3)).toBe(99999999999999n);
    expect(() => parseNumeric("100000000000.000", 14, 3)).toThrow();
    expect(parseNumeric("99999999999999.99", 16, 2)).toBe(9999999999999999n);
    expect(() => parseNumeric("100000000000000.00", 16, 2)).toThrow();
    expect(parseNumeric("9999999999.99999999", 18, 8)).toBe(999999999999999999n);
    expect(() => parseNumeric("10000000000.00000000", 18, 8)).toThrow();
  });

  it("rounds line calculations and USD-to-VES conversion half away from zero", () => {
    expect(calculateLineUsd("0.001", "0.0500")).toBe("0.0001");
    expect(calculateLineUsd("0.001", "0.5000")).toBe("0.0005");
    expect(convertUsdToVes("0.0001", "50.00000000")).toBe("0.01");
    expect(convertUsdToVes("23.8500", "36.50000000")).toBe("870.53");
    expect(sumNumeric(["0.1", "0.2"], 14, 4)).toBe("0.3000");
  });

  it("rejects non-decimal, ambiguous, whitespace and negative values strictly", () => {
    for (const value of ["NaN", "Infinity", "1e-4", "+10", "-1", "1 0", " 1.00 ", "1.234,56", "1,234.56"]) {
      expect(() => parseNumeric(value, 14, 4)).toThrow();
    }
  });

  it("rejects values outside NUMERIC precision and scale", () => {
    expect(() => formatLocalizedDecimal("1.00001", 14, 4)).toThrow();
    expect(() => formatLocalizedDecimal("10000000000", 14, 4)).toThrow();
  });
});
