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

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (IS_PAGES_PREVIEW) {
    throw new Error("La API está deshabilitada en esta vista previa para proteger los datos de producción.");
  }
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
      redirect: "error",
    });
  } catch {
    throw new Error("No se pudo conectar con la API. Comprueba VITE_API_BASE_URL y que el servicio esté disponible.");
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
}
