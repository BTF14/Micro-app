import { describe, expect, it } from "vitest";
import { getConfiguredFrontendOrigin } from "./google-auth";

describe("Google OAuth frontend origin configuration", () => {
  it("accepts canonical HTTPS origins", () => {
    expect(getConfiguredFrontendOrigin("https://micro-app.pages.dev")).toBe("https://micro-app.pages.dev");
  });

  it("allows HTTP only for loopback development origins", () => {
    expect(getConfiguredFrontendOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(getConfiguredFrontendOrigin("http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173");
    expect(getConfiguredFrontendOrigin("http://[::1]:5173")).toBe("http://[::1]:5173");
  });

  it("rejects HTTP origins on non-local hosts", () => {
    expect(getConfiguredFrontendOrigin("http://micro-app.pages.dev")).toBeUndefined();
    expect(getConfiguredFrontendOrigin("http://attacker.example")).toBeUndefined();
  });

  it("rejects credentials and non-origin URL components", () => {
    expect(getConfiguredFrontendOrigin("https://user:pass@micro-app.pages.dev")).toBeUndefined();
    expect(getConfiguredFrontendOrigin("https://micro-app.pages.dev/path")).toBeUndefined();
    expect(getConfiguredFrontendOrigin("https://micro-app.pages.dev/?next=/")).toBeUndefined();
    expect(getConfiguredFrontendOrigin("https://micro-app.pages.dev/#fragment")).toBeUndefined();
    expect(getConfiguredFrontendOrigin("https://micro-app.pages.dev/")).toBeUndefined();
  });

  it("rejects missing or malformed values", () => {
    expect(getConfiguredFrontendOrigin(undefined)).toBeUndefined();
    expect(getConfiguredFrontendOrigin("")).toBeUndefined();
    expect(getConfiguredFrontendOrigin("not a URL")).toBeUndefined();
  });
});
