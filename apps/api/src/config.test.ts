import { describe, expect, it } from "vitest";
import { isDatabaseUrlConfigured } from "./config";

describe("isDatabaseUrlConfigured", () => {
  it("accepts a PostgreSQL URL with credentials and TLS parameters", () => {
    expect(
      isDatabaseUrlConfigured(
        "postgresql://micro_app:example-password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toBe(true);
  });

  it("accepts the postgres URL scheme", () => {
    expect(
      isDatabaseUrlConfigured("postgres://user:password@localhost:5432/micro_app"),
    ).toBe(true);
  });

  it.each([
    undefined,
    "",
    " ",
    " postgresql://user:password@db.example/neondb",
    "https://user:password@db.example/neondb",
    "postgresql://db.example/neondb",
    "postgresql://user@db.example/neondb",
    "not-a-url",
    "postgresql://user:password@db.example/neondb#fragment",
  ])("rejects missing or malformed database configuration: %s", (value) => {
    expect(isDatabaseUrlConfigured(value)).toBe(false);
  });
});
