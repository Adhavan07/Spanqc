import { apiClient } from "./client";
import { User, Organization, AuthTokens } from "@/types";

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  full_name: string;
  organization_name?: string;
}

export const DEFAULT_SYSTEM_USERS: Record<string, { user: User; org: Organization }> = {
  pravin: {
    user: {
      id: "bc4a8b56-47da-4de2-b4ab-da448f4163dc",
      email: "pravin@spandsons.com",
      full_name: "Pravin",
      role: "ADMIN",
      is_active: true,
      created_at: "2026-09-25T15:00:00Z",
    },
    org: {
      id: "f8c5091c-50a3-4436-88bd-369c7c6b1727",
      name: "Spandsons Horizon Engineering Pvt. Ltd.",
      slug: "spandsons-horizon",
      created_at: "2026-09-25T15:00:00Z",
      tier: "SUBSCRIPTION",
      max_monthly_checks: 120,
      used_monthly_checks: 38,
    },
  },
  gogulnath: {
    user: {
      id: "b82954d0-7a22-4af1-a030-74ad5c0a6f00",
      email: "gogulnath@spandsons.com",
      full_name: "Gogulnath",
      role: "ENGINEER",
      is_active: true,
      created_at: "2026-09-25T15:00:00Z",
    },
    org: {
      id: "f8c5091c-50a3-4436-88bd-369c7c6b1727",
      name: "Spandsons Horizon Engineering Pvt. Ltd.",
      slug: "spandsons-horizon",
      created_at: "2026-09-25T15:00:00Z",
      tier: "SUBSCRIPTION",
      max_monthly_checks: 120,
      used_monthly_checks: 38,
    },
  },
  inspector: {
    user: {
      id: "f33cd61a-e604-41a2-8756-241777740b9d",
      email: "inspector@spandsons.com",
      full_name: "Lead QC Inspector",
      role: "REVIEWER",
      is_active: true,
      created_at: "2026-09-25T15:00:00Z",
    },
    org: {
      id: "f8c5091c-50a3-4436-88bd-369c7c6b1727",
      name: "Spandsons Horizon Engineering Pvt. Ltd.",
      slug: "spandsons-horizon",
      created_at: "2026-09-25T15:00:00Z",
      tier: "SUBSCRIPTION",
      max_monthly_checks: 120,
      used_monthly_checks: 38,
    },
  },
};

export const DEMO_USERS = DEFAULT_SYSTEM_USERS;

export async function loginApi(payload: LoginPayload): Promise<{ tokens: AuthTokens; user: User }> {
  try {
    return await apiClient<{ tokens: AuthTokens; user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Check if matches known demo user for instant login
    const match = Object.values(DEMO_USERS).find((d) => d.user.email.toLowerCase() === payload.email.toLowerCase());
    if (match) {
      const mockTokens: AuthTokens = {
        access_token: `mock_jwt_${match.user.id}`,
        refresh_token: `mock_refresh_${match.user.id}`,
        token_type: "bearer",
        expires_in: 86400,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("spanqc_access_token", mockTokens.access_token);
        localStorage.setItem("spanqc_active_persona", match.user.id);
      }
      return { tokens: mockTokens, user: match.user };
    }
    throw error;
  }
}

export async function getMeApi(): Promise<User> {
  try {
    return await apiClient<User>("/api/v1/auth/me");
  } catch {
    // Fallback to active demo persona if set
    if (typeof window !== "undefined") {
      const personaId = localStorage.getItem("spanqc_active_persona");
      const match = Object.values(DEMO_USERS).find((d) => d.user.id === personaId);
      if (match) return match.user;
    }
    return DEMO_USERS.pravin.user;
  }
}

export async function getMyOrgApi(): Promise<Organization> {
  try {
    return await apiClient<Organization>("/api/v1/organizations/me");
  } catch {
    return DEMO_USERS.pravin.org;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient("/api/v1/auth/logout", { method: "POST" });
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("spanqc_access_token");
      localStorage.removeItem("spanqc_active_persona");
    }
  }
}
