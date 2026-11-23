import { describe, expect, it } from "vitest";
import { fxPinFailure } from "./fx-contingency";

describe("FX PIN failure responses", () => {
  it.each([
    ["invalid", 403, "FX_PIN_INVALID", "El PIN no coincide."],
    ["limited", 429, "FX_PIN_RATE_LIMITED", "Espera 15 minutos"],
    ["unavailable", 503, "FX_PIN_NOT_CONFIGURED", "dos secretos de seguridad"],
  ] as const)("returns a clear Spanish response for %s", (kind, status, error, message) => {
    const result = fxPinFailure(kind);
    expect(result.status).toBe(status);
    expect(result.body.error).toBe(error);
    expect(result.body.message).toContain(message);
    expect(result.body.message).not.toContain("test-only");
  });
});
