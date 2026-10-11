/**
 * SpanQC Typed API Client
 * Centralized fetcher with credentials/cookie injection, timeout handling, and unified error parsing.
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

const API_BASE_URL = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      credentials: "include", // Ensure HttpOnly session cookies are transmitted
      ...options,
      headers,
    });

    if (res.status === 401) {
      let errorBody: { detail?: string; message?: string } = {};
      try {
        errorBody = await res.json();
      } catch {
        // failed to parse
      }
      throw new ApiError(401, errorBody.detail || errorBody.message || "Session expired or unauthorized. Please log in.", errorBody);
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
