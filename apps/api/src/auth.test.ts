import { describe, expect, it } from "vitest";
import { hashPassword, isTrustedOrigin, verifyPassword } from "./auth";

describe("password hashing", () => {
  it("stores a salted PBKDF2 hash rather than the original password", async () => {
    const password = "a-long-test-password-2026";
    const encoded = await hashPassword(password);

    expect(encoded).toMatch(/^pbkdf2-sha256\$310000\$/);
    expect(encoded).not.toContain(password);
    expect(await verifyPassword(password, encoded)).toBe(true);
    expect(await verifyPassword("a-different-password", encoded)).toBe(false);
  });

  it("uses a different salt for separate password hashes", async () => {
    const first = await hashPassword("a-long-test-password-2026");
    const second = await hashPassword("a-long-test-password-2026");

    expect(first).not.toBe(second);
    expect(await verifyPassword("a-long-test-password-2026", second)).toBe(true);
  });

  it("rejects missing, malformed, and invalid-base64 stored hashes without throwing", async () => {
    const password = "a-long-test-password-2026";
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyPassword(password, "not-a-password-hash")).toBe(false);
    expect(await verifyPassword(password, "pbkdf2-sha256$310000$%%%$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).toBe(false);
    expect(await verifyPassword(password, "pbkdf2-sha256$310000$ZHVtbXktc2FsdC1mb3Itbm90LWEtc2VjcmV0$%%%")).toBe(false);
    expect(await verifyPassword(password, "pbkdf2-sha256$310000$c2hvcnQ$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).toBe(false);
  });
});

describe("trusted frontend origin", () => {
  it("allows only the exact configured origin", () => {
    expect(isTrustedOrigin("https://micro-app.pages.dev", "https://micro-app.pages.dev")).toBe(true);
    expect(isTrustedOrigin("https://attacker.example", "https://micro-app.pages.dev")).toBe(false);
    expect(isTrustedOrigin(undefined, "https://micro-app.pages.dev")).toBe(false);
    expect(isTrustedOrigin("https://micro-app.pages.dev", undefined)).toBe(false);
    expect(isTrustedOrigin("https://micro-app.pages.dev/path", "https://micro-app.pages.dev")).toBe(false);
  });
});
