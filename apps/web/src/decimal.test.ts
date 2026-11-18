import { describe, expect, it } from "vitest";
import { formatLocalizedDecimal, normalizeDecimalInput } from "./decimal";

describe("web decimal helpers", () => {
  it("normalizes comma input without converting through Number", () => {
    expect(normalizeDecimalInput("1234,5000")).toBe("1234.5000");
    expect(normalizeDecimalInput("0,")).toBe("0.");
    expect(normalizeDecimalInput("")).toBe("");
  });

  it("groups and localizes exact decimal strings", () => {
    expect(formatLocalizedDecimal("1234567.8900", 14, 4, 2)).toBe("1.234.567,89");
    expect(formatLocalizedDecimal("0.0001", 14, 4, 2)).toBe("0,0001");
    expect(formatLocalizedDecimal("894.88760000", 18, 8, 2)).toBe("894,88760000");
  });

  it("rejects values outside NUMERIC precision and scale", () => {
    expect(() => formatLocalizedDecimal("1.00001", 14, 4)).toThrow();
    expect(() => formatLocalizedDecimal("100000000000", 14, 4)).toThrow();
  });
});
