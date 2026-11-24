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
    incomingUrl.protocol !== "https:" ||
    incomingUrl.port !== "" ||
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
  const upstreamUrl = new URL(PRODUCTION_WORKER_ORIGIN);
  // Assign pathname instead of resolving a relative URL: a path beginning with
  // // must never be interpreted as a different authority/host.
  upstreamUrl.pathname = remainder;
  upstreamUrl.search = incomingUrl.search;

  // Cloudflare overwrites CF-Connecting-IP at its public edge and only
  // sends that edge-generated value to the Pages Function. Capture it before
  // copying headers, then explicitly replace the forwarded value. Do not trust
  // X-Forwarded-For (which can contain client-supplied values) as an IP source.
  const edgeClientIp = request.headers.get("CF-Connecting-IP");
  const headers = new Headers(request.headers);
  const connectionTokens = (headers.get("connection") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const name of [...HOP_BY_HOP_HEADERS, ...connectionTokens]) headers.delete(name);
  headers.delete("x-forwarded-for");
  headers.delete("cf-connecting-ip");
  if (edgeClientIp) headers.set("CF-Connecting-IP", edgeClientIp);

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
  let upstreamResponse: Response;
  try {
    upstreamResponse = await api.fetch(upstreamRequest, { redirect: "manual" });
  } catch {
    return Response.json(
      { error: "API_UPSTREAM_UNAVAILABLE", message: "El servicio de API no está disponible temporalmente." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const responseHeaders = new Headers();
  const responseConnectionTokens = (upstreamResponse.headers.get("connection") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const hopByHopResponseHeaders = new Set([
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", ...responseConnectionTokens,
  ]);
  upstreamResponse.headers.forEach((value, name) => {
    const normalizedName = name.toLowerCase();
    if (normalizedName !== "set-cookie" && !hopByHopResponseHeaders.has(normalizedName)) {
      responseHeaders.append(name, value);
    }
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
