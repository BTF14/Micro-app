import { describe, expect, it } from "vitest";
import { hashFxPin, verifyFxPin, FX_PIN_ITERATIONS } from "./fx-pin";

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const PEPPER = "test-only-fx-pin-pepper-at-least-32-characters";

describe("FX PIN KDF", () => {
  it("creates a salted, versioned PBKDF2-SHA256 verifier and verifies it", async () => {
    const stored = await hashFxPin("12345678", ORG, USER, PEPPER);
    expect(stored.kdfVersion).toBe("pbkdf2-sha256-v1");
    expect(stored.iterations).toBe(FX_PIN_ITERATIONS);
    expect(stored.saltBase64).not.toBe(stored.hashBase64);
    expect(await verifyFxPin("12345678", {
      kdf_version: stored.kdfVersion,
      iterations: stored.iterations,
      salt_base64: stored.saltBase64,
      hash_base64: stored.hashBase64,
    }, ORG, USER, PEPPER)).toBe(true);
  });

  it("uses unique salts and binds the verifier to tenant, user and pepper", async () => {
    const first = await hashFxPin("12345678", ORG, USER, PEPPER);
    const second = await hashFxPin("12345678", ORG, USER, PEPPER);
    const record = {
      kdf_version: first.kdfVersion,
      iterations: first.iterations,
      salt_base64: first.saltBase64,
      hash_base64: first.hashBase64,
    };
    expect(first.saltBase64).not.toBe(second.saltBase64);
    expect(await verifyFxPin("12345678", record, ORG, USER, PEPPER)).toBe(true);
    expect(await verifyFxPin("12345678", record, ORG, "33333333-3333-4333-8333-333333333333", PEPPER)).toBe(false);
    expect(await verifyFxPin("12345678", record, ORG, USER, PEPPER + "-rotated")).toBe(false);
    expect(await verifyFxPin("87654321", record, ORG, USER, PEPPER)).toBe(false);
  });

  it("rejects short, nonnumeric, malformed and unsupported hashes", async () => {
    await expect(hashFxPin("1234567", ORG, USER, PEPPER)).rejects.toThrow("FX_PIN_FORMAT_INVALID");
    await expect(hashFxPin("1234abcd", ORG, USER, PEPPER)).rejects.toThrow("FX_PIN_FORMAT_INVALID");
    expect(await verifyFxPin("12345678", null, ORG, USER, PEPPER)).toBe(false);
    expect(await verifyFxPin("12345678", {
      kdf_version: "unknown", iterations: 100000, salt_base64: "AA==", hash_base64: "AA==",
    }, ORG, USER, PEPPER)).toBe(false);
  });

  it("requires a separately configured high-entropy pepper", async () => {
    await expect(hashFxPin("12345678", ORG, USER, "too-short")).rejects.toThrow("FX_PIN_PEPPER_NOT_CONFIGURED");
  });
});
