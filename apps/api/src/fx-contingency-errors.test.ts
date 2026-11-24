import { describe, expect, it } from "vitest";
import { fxPinFailure, isFxPinSecretConfigValid } from "./fx-contingency";

describe("FX PIN failure responses", () => {
  it.each([
    ["invalid", 403, "FX_PIN_INVALID", "El PIN no coincide."],
    ["limited", 429, "FX_PIN_RATE_LIMITED", "Espera 15 minutos"],
    ["unavailable", 503, "FX_PIN_NOT_CONFIGURED", "configuración del Worker"],
  ] as const)("returns a clear Spanish response for %s", (kind, status, error, message) => {
    const result = fxPinFailure(kind);
    expect(result.status).toBe(status);
    expect(result.body.error).toBe(error);
    expect(result.body.message).toContain(message);
    expect(result.body.message).not.toContain("test-only");
  });
});

describe("FX PIN secret configuration", () => {
  it("requires two distinct secrets of at least 32 characters", () => {
    const pepper = "fx-pin-pepper-test-value-with-more-than-32-chars";
    const ratePepper = "fx-pin-rate-limit-test-value-with-more-than-32";
    expect(isFxPinSecretConfigValid(pepper, ratePepper)).toBe(true);
    expect(isFxPinSecretConfigValid(pepper, pepper)).toBe(false);
    expect(isFxPinSecretConfigValid("too-short", ratePepper)).toBe(false);
    expect(isFxPinSecretConfigValid(pepper, undefined)).toBe(false);
  });
});
