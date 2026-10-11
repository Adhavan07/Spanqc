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

export async function loginApi(payload: LoginPayload): Promise<{ tokens: AuthTokens; user: User; organization: Organization }> {
  return await apiClient<{ tokens: AuthTokens; user: User; organization: Organization }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMeApi(): Promise<User> {
  return await apiClient<User>("/api/v1/auth/me");
}

export async function getMyOrgApi(): Promise<Organization> {
  return await apiClient<Organization>("/api/v1/organizations/me");
}

export async function logoutApi(): Promise<void> {
  await apiClient("/api/v1/auth/logout", { method: "POST" });
}
