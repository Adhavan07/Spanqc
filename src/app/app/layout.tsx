"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Rocket } from "lucide-react";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 animate-pulse mb-3">
          <Rocket className="w-5 h-5 -rotate-45" />
        </div>
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Loading Workspace...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#06070a] text-slate-100">
      {/* Collapsible Sidebar */}
      <AppSidebar />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#06070a] bg-cosmic-mesh">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
