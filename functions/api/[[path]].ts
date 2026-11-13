const PRODUCTION_PAGES_HOST = "micro-app-63i.pages.dev";
const PRODUCTION_WORKER_ORIGIN = "https://micro-app-api.btfcasheb.workers.dev";

const OAUTH_COOKIE_NAMES = new Set([
  "microapp_oauth_state",
  "microapp_oauth_verifier",
  "microapp_oauth_bootstrap",
]);

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
] as const;

interface ApiServiceBinding {
  fetch(request: Request, init?: RequestInit): Promise<Response>;
}

interface PagesFunctionEnv {
  API?: ApiServiceBinding;
  // CF_PAGES_BRANCH is documented as a Pages build variable. Some runtimes
  // may expose it to Functions; when present, never accept a non-main value.
  CF_PAGES_BRANCH?: string;
}

interface PagesFunctionContext {
  request: Request;
  env: PagesFunctionEnv;
}

function unavailable(error: "PREVIEW_API_DISABLED" | "API_BINDING_MISSING", message: string): Response {
  return Response.json({ error, message }, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

function rewriteOAuthCookiePath(cookie: string): string {
  const name = cookie.match(/^\s*([^=;\s]+)=/)?.[1];
  if (!name || !OAUTH_COOKIE_NAMES.has(name)) return cookie;

  return cookie.replace(/(;\s*Path=)\/auth\/google(?=;|$)/i, "$1/api/auth/google");
}

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  const { request, env } = context;
  const incomingUrl = new URL(request.url);

  // The exact project hostname is the mandatory production discriminator.
  // If Cloudflare exposes the deployment branch at runtime, require main too.
  // This check intentionally happens before reading env.API.
  if (
    incomingUrl.hostname.toLowerCase() !== PRODUCTION_PAGES_HOST ||
    (env.CF_PAGES_BRANCH !== undefined && env.CF_PAGES_BRANCH !== "main")
  ) {
    return unavailable(
      "PREVIEW_API_DISABLED",
      "La API está deshabilitada en esta vista previa para proteger producción.",
    );
  }

  const api = env.API;
  if (!api || typeof api.fetch !== "function") {
    return unavailable("API_BINDING_MISSING", "El enlace interno de la API no está configurado.");
  }

  if (incomingUrl.pathname !== "/api" && !incomingUrl.pathname.startsWith("/api/")) {
    return new Response("Not Found", { status: 404 });
  }

  const remainder = incomingUrl.pathname.slice("/api".length) || "/";
  const upstreamUrl = new URL(remainder, PRODUCTION_WORKER_ORIGIN);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD" && request.body !== null) {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstreamRequest = new Request(upstreamUrl, init);
  const upstreamResponse = await api.fetch(upstreamRequest, { redirect: "manual" });

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") responseHeaders.append(name, value);
  });

  // Set-Cookie is a multi-value header. Never read it through get(), which
  // can coalesce values and corrupt Expires attributes or lose cookie boundaries.
  for (const cookie of upstreamResponse.headers.getSetCookie()) {
    responseHeaders.append("Set-Cookie", rewriteOAuthCookiePath(cookie));
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
