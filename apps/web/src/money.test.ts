import { describe, expect, it } from "vitest";
import { calculateLineUsd, convertUsdToVes, formatMoneyForDisplay } from "@micro-app/money";

describe("shared money package in the web workspace", () => {
  it("formats exact catalog prices without floating-point arithmetic", () => {
    expect(formatMoneyForDisplay("23.8500")).toBe("23.85");
  });

  it("uses the same exact line and BCV calculations as the API", () => {
    expect(calculateLineUsd("1.250", "23.8500")).toBe("29.8125");
    expect(convertUsdToVes("23.8500", "36.50000000")).toBe("870.53");
  });
});
