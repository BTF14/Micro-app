import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../../../functions/api/[[path]]";

function context(url: string, env: Record<string, unknown>, init?: RequestInit) {
  return {
    request: new Request(url, init),
    env,
  } as Parameters<typeof onRequest>[0];
}

describe("Cloudflare Pages same-origin API proxy", () => {
  it("fails closed on a non-main branch without touching the Service Binding", async () => {
    const env: Record<string, unknown> = { CF_PAGES_BRANCH: "preview" };
    Object.defineProperty(env, "API", {
      get() { throw new Error("preview must not read API binding"); },
    });

    const response = await onRequest(context(
      "https://micro-app-63i.pages.dev/api/auth/me",
      env,
    ));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "PREVIEW_API_DISABLED" });
  });

  it.each([
    "https://feature.micro-app-63i.pages.dev/api/auth/me",
    "https://feature.pages.dev/api/auth/me",
    "https://micro-app-63i.pages.dev.evil.example/api/auth/me",
  ])("rejects an unapproved host before touching the Service Binding: %s", async (url) => {
    const env: Record<string, unknown> = { CF_PAGES_BRANCH: "main" };
    Object.defineProperty(env, "API", {
      get() { throw new Error("unapproved host must not read API binding"); },
    });

    const response = await onRequest(context(url, env));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "PREVIEW_API_DISABLED" });
  });

  it("fails closed when the production Service Binding is missing", async () => {
    const response = await onRequest(context(
      "https://micro-app-63i.pages.dev/api/auth/me",
      { CF_PAGES_BRANCH: "main" },
    ));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "API_BINDING_MISSING" });
  });

  it("preserves method, body, query, security headers, 302 Location and individual Set-Cookie values", async () => {
    const upstreamHeaders = new Headers({
      Location: "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    upstreamHeaders.append("Set-Cookie", "microapp_oauth_state=state; Path=/auth/google; HttpOnly; Secure; SameSite=Lax");
    upstreamHeaders.append("Set-Cookie", "microapp_oauth_verifier=verifier; Path=/auth/google; HttpOnly; Secure; SameSite=Lax");
    upstreamHeaders.append("Set-Cookie", "microapp_session=session; Path=/; HttpOnly; Secure; SameSite=Lax");
    upstreamHeaders.append("Set-Cookie", "unrelated=value; Path=/auth/google; Secure");

    const fetch = vi.fn(async (request: Request, init?: RequestInit) => {
      expect(init?.redirect).toBe("manual");
      expect(request.url).toBe("https://micro-app-api.btfcasheb.workers.dev/auth/google?from=login");
      expect(request.method).toBe("POST");
      expect(request.headers.get("cookie")).toBe("existing=1");
      expect(request.headers.get("origin")).toBe("https://micro-app-63i.pages.dev");
      expect(request.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
      expect(request.headers.get("authorization")).toBe("Bearer synthetic");
      expect(request.headers.get("idempotency-key")).toBe("idem-123");
      expect(request.headers.get("cf-connecting-ip")).toBe("203.0.113.10");
      expect(await request.text()).toBe("bootstrap_token=synthetic");
      return new Response(null, { status: 302, headers: upstreamHeaders });
    });

    const response = await onRequest(context(
      "https://micro-app-63i.pages.dev/api/auth/google?from=login",
      { CF_PAGES_BRANCH: "main", API: { fetch } },
      {
        method: "POST",
        headers: {
          Cookie: "existing=1",
          Origin: "https://micro-app-63i.pages.dev",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Bearer synthetic",
          "Idempotency-Key": "idem-123",
          "CF-Connecting-IP": "203.0.113.10",
        },
        body: "bootstrap_token=synthetic",
      },
    ));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=synthetic");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(4);
    expect(cookies[0]).toContain("microapp_oauth_state=state; Path=/api/auth/google");
    expect(cookies[1]).toContain("microapp_oauth_verifier=verifier; Path=/api/auth/google");
    expect(cookies[2]).toContain("microapp_session=session; Path=/;");
    expect(cookies[3]).toBe("unrelated=value; Path=/auth/google; Secure");
  });

  it("rewrites only the three OAuth cookie names, including deletion cookies", async () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "microapp_oauth_bootstrap=; Max-Age=0; Path=/auth/google; Secure; SameSite=Lax");
    headers.append("Set-Cookie", "microapp_session=; Max-Age=0; Path=/; Secure; SameSite=Lax");

    const fetch = vi.fn(async () => new Response(null, { status: 204, headers }));
    const response = await onRequest(context(
      "https://micro-app-63i.pages.dev/api/auth/google/callback?code=synthetic",
      { CF_PAGES_BRANCH: "main", API: { fetch } },
    ));

    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain("microapp_oauth_bootstrap=; Max-Age=0; Path=/api/auth/google");
    expect(cookies[1]).toContain("microapp_session=; Max-Age=0; Path=/;");
  });
});
