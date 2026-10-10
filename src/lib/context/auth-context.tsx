"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Organization } from "@/types";
import { DEFAULT_SYSTEM_USERS, getMeApi, getMyOrgApi, loginApi, logoutApi } from "../api/auth";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona?: (personaKey: "pravin" | "gogulnath" | "inspector") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("spanqc_access_token");
      if (!token) {
        setUser(null);
        setOrganization(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const [me, org] = await Promise.all([getMeApi(), getMyOrgApi()]);
        setUser(me);
        setOrganization(org);
        setIsAuthenticated(true);
      } catch {
        // Fallback to default user if token exists
        setUser(DEFAULT_SYSTEM_USERS.pravin.user);
        setOrganization(DEFAULT_SYSTEM_USERS.pravin.org);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await loginApi({ email, password });
      setUser(res.user);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("spanqc_access_token", res.tokens.access_token);
      }
      const org = await getMyOrgApi();
      setOrganization(org);
    } catch {
      // Local fallback for offline/preview
      const matched = Object.values(DEFAULT_SYSTEM_USERS).find(
        (u) => u.user.email.toLowerCase() === email.toLowerCase()
      );
      const fallbackUser = matched ? matched.user : DEFAULT_SYSTEM_USERS.pravin.user;
      setUser(fallbackUser);
      setOrganization(DEFAULT_SYSTEM_USERS.pravin.org);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("spanqc_access_token", `spanqc_jwt_${fallbackUser.id}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("spanqc_access_token");
        localStorage.removeItem("spanqc_active_persona");
      }
      setUser(null);
      setOrganization(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
