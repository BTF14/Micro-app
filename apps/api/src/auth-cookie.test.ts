import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { clearSessionCookie } from "./auth";
import type { Bindings } from "./bindings";
import { clearOAuthCookies, setSessionCookie, setShortLivedCookie } from "./google-auth";

const app = new Hono<{ Bindings: Bindings }>();
app.get("/oauth/set", (c) => {
  setShortLivedCookie(c, "microapp_oauth_state", "state");
  setShortLivedCookie(c, "microapp_oauth_verifier", "verifier");
  setShortLivedCookie(c, "microapp_oauth_bootstrap", "bootstrap");
  setSessionCookie(c, "session-token");
  return c.body(null);
});
app.get("/oauth/clear", (c) => {
  clearOAuthCookies(c);
  clearSessionCookie(c);
  return c.body(null);
});

describe("OAuth and session cookie contract", () => {
  it("issues PKCE cookies on the Worker-local OAuth path and a first-party Lax session", async () => {
    const response = await app.request("https://micro-app-api.btfcasheb.workers.dev/oauth/set");
    const cookies = response.headers.getSetCookie();

    expect(cookies).toHaveLength(4);
    for (const name of ["microapp_oauth_state", "microapp_oauth_verifier", "microapp_oauth_bootstrap"]) {
      const cookie = cookies.find((value) => value.startsWith(name + "="));
      expect(cookie).toContain("Path=/auth/google");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
    }

    const session = cookies.find((value) => value.startsWith("microapp_session="));
    expect(session).toContain("Path=/");
    expect(session).toContain("SameSite=Lax");
    expect(session).toContain("HttpOnly");
    expect(session).toContain("Secure");
    expect(session).not.toContain("SameSite=None");
  });

  it("clears PKCE and session cookies with the same scope/security attributes", async () => {
    const response = await app.request("https://micro-app-api.btfcasheb.workers.dev/oauth/clear");
    const cookies = response.headers.getSetCookie();

    expect(cookies).toHaveLength(4);
    for (const name of ["microapp_oauth_state", "microapp_oauth_verifier", "microapp_oauth_bootstrap"]) {
      const cookie = cookies.find((value) => value.startsWith(name + "="));
      expect(cookie).toContain("Path=/auth/google");
      expect(cookie).toContain("Max-Age=0");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
    }

    const session = cookies.find((value) => value.startsWith("microapp_session="));
    expect(session).toContain("Path=/");
    expect(session).toContain("Max-Age=0");
    expect(session).toContain("SameSite=Lax");
    expect(session).toContain("HttpOnly");
    expect(session).toContain("Secure");
  });

  it("keeps development cookies non-Secure and Lax over local HTTP", async () => {
    const response = await app.request("http://localhost:8787/oauth/set");
    const cookies = response.headers.getSetCookie();
    const session = cookies.find((value) => value.startsWith("microapp_session="));

    expect(session).toContain("Path=/");
    expect(session).toContain("SameSite=Lax");
    expect(session).not.toContain("Secure");
  });
});
