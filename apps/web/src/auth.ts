export type AuthUser = { id: string; email: string; display_name: string };
export type AuthOrganization = { id: string; name: string; slug: string; role: "owner" | "admin" | "cashier" | "inventory" };
export type AuthResponse = { user: AuthUser; organizations: AuthOrganization[] };

type ApiErrorPayload = { message?: unknown };
const API_BASE_URL = __MICRO_APP_API_BASE_URL__;
const IS_PAGES_PREVIEW = __MICRO_APP_IS_PREVIEW__;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// Password login/registration were retired (decision D4): the only working
// sign-in path is a top-level navigation to this endpoint, which starts the
// server-side Google OAuth + allowlist flow.
export function googleLoginUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}

export type ApiRequestOptions = RequestInit & { skipAuth401Handling?: boolean };

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (IS_PAGES_PREVIEW) {
    throw new Error("La API está deshabilitada en esta vista previa para proteger los datos de producción.");
  }
  const { skipAuth401Handling = false, signal: callerSignal, ...init } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers,
      credentials: "include",
      redirect: "error",
    });

    if (response.status === 401 && !skipAuth401Handling && path.split("?")[0] !== "/auth/me") {
      window.dispatchEvent(new CustomEvent("micro-app:unauthorized"));
    }

    if (!response.ok) {
      let message = "No se pudo completar la solicitud. Inténtalo de nuevo.";
      try {
        const payload = await response.json() as ApiErrorPayload;
        if (typeof payload.message === "string" && payload.message.trim()) message = payload.message;
      } catch {
        // Keep a generic message if the API response is not JSON.
      }
      throw new ApiError(message, response.status);
    }

    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (reason) {
    if (reason instanceof ApiError) throw reason;
    if (callerSignal?.aborted) throw new Error("La solicitud fue cancelada.");
    if (controller.signal.aborted) throw new Error("La solicitud tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.");
    throw new Error("No se pudo conectar con la API. Comprueba VITE_API_BASE_URL y que el servicio esté disponible.");
  } finally {
    window.clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
