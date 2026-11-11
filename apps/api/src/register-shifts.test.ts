import { describe, expect, it } from "vitest";
import { parseShiftClosingInput, parseShiftOpeningInput } from "./register-shifts";

const registerId = "10000000-0000-4000-8000-000000000001";

describe("register shift input validation", () => {
  it("normalizes non-negative USD/VES opening counts", () => {
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: "12.5", opening_cash_ves: "125.00" })).toEqual({
      registerId, cashUsd: "12.5000", cashVes: "125.00",
    });
  });

  it("allows zero opening and closing counts", () => {
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: "0", opening_cash_ves: "0" })).toEqual({
      registerId, cashUsd: "0.0000", cashVes: "0.00",
    });
    expect(parseShiftClosingInput({ closing_cash_usd: "0", closing_cash_ves: "0" })).toEqual({
      cashUsd: "0.0000", cashVes: "0.00",
    });
  });

  it("rejects negative, over-precision, numeric, and unknown fields", () => {
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: "-1", opening_cash_ves: "0" })).toBeNull();
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: "1.00001", opening_cash_ves: "0" })).toBeNull();
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: 1, opening_cash_ves: "0" })).toBeNull();
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: "1", opening_cash_ves: "0", user_id: registerId })).toBeNull();
    expect(parseShiftClosingInput({ closing_cash_usd: "0", closing_cash_ves: "-0.01" })).toBeNull();
    expect(parseShiftClosingInput({ closing_cash_usd: "0", closing_cash_ves: "1.001" })).toBeNull();
    expect(parseShiftClosingInput({ closing_cash_usd: "0", closing_cash_ves: "0", closed_by_user_id: registerId })).toBeNull();
  });

  it("rejects invalid register IDs and missing amounts", () => {
    expect(parseShiftOpeningInput({ register_id: "not-a-uuid", opening_cash_usd: "0", opening_cash_ves: "0" })).toBeNull();
    expect(parseShiftOpeningInput({ register_id: registerId, opening_cash_usd: "0" })).toBeNull();
    expect(parseShiftClosingInput({ closing_cash_usd: "0" })).toBeNull();
    expect(parseShiftClosingInput(null)).toBeNull();
  });
});
