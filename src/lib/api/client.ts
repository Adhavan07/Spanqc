/**
 * SpanQC Typed API Client
 * Centralized fetcher with token injection, timeout handling, and unified error parsing.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("spanqc_access_token") : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        // If unauthorized and not a login request, clear token
        if (!endpoint.includes("/auth/login")) {
          localStorage.removeItem("spanqc_access_token");
        }
      }
      throw new ApiError(401, "Session expired or unauthorized. Please log in.");
    }

    if (!res.ok) {
      let errorBody: { detail?: string; message?: string } = {};
      try {
        errorBody = await res.json();
      } catch {
        // failed to parse JSON error
      }
      throw new ApiError(
        res.status,
        errorBody.detail || errorBody.message || `Request failed with status ${res.status}`,
        errorBody
      );
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error instanceof Error ? error.message : "Network error occurred");
  }
}
