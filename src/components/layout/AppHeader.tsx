"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import {
  Search,
  Box,
  HelpCircle,
  LogOut,
  ChevronDown,
  Rocket,
  Grid,
} from "lucide-react";
import { Button } from "../ui/Button";

export function AppHeader() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const getPageTitle = () => {
    if (pathname === "/app") return "Launchpad™ Dashboard";
    if (pathname === "/app/check") return "Unbox™ Quality Inspection";
    if (pathname.startsWith("/app/reports")) return "QC Inspection Report";
    if (pathname === "/app/projects") return "Projects Management";
    if (pathname === "/app/history") return "Inspection History & Audit Trail";
    if (pathname === "/app/standards") return "Authoritative Standards Registry";
    if (pathname === "/app/usage") return "Usage Quotas & Analytics";
    if (pathname === "/app/billing") return "Subscription & Billing";
    if (pathname === "/app/team") return "Team & Organization Members";
    if (pathname.startsWith("/app/settings")) return "Account & Security Settings";
    return "Engineering Workspace";
  };

  return (
    <header className="h-16 px-6 border-b border-[#1b253b] bg-[#07090f]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
      {/* Left: Breadcrumbs & Title */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>{organization?.slug || "spandsons"}</span>
            <span>/</span>
            <span className="text-cyan-400">launchpad</span>
          </div>
          <h1 className="text-base font-extrabold text-white tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center / Right: Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Spaceship Command Bar (Cmd + K) */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c101a] border border-[#1b253b] text-slate-400 text-xs w-64 hover:border-cyan-500/50 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search drawings, rules, apps..."
            className="bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-500 text-xs w-full"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ⌘K
          </kbd>
        </div>

        {/* Start New QC Check Quick Button */}
        <Link href="/app/check">
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono tracking-tight shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer">
            <Box className="w-3.5 h-3.5" />
            <span>Unbox Schematic</span>
          </button>
        </Link>

        {/* Live System Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>LAUNCHPAD ONLINE</span>
        </div>

        {/* Help icon */}
        <Link
          href="/standards"
          title="Rule Documentation & Standards Guide"
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>

        {/* User Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
              {user?.full_name ? user.full_name[0] : "U"}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0d121e] border border-slate-700 shadow-2xl shadow-black/80 py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="font-semibold text-slate-200">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                  Role: {user?.role}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/app/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80"
                >
                  Settings & Profile
                </Link>
                <Link
                  href="/app/usage"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80"
                >
                  Usage & Quotas
                </Link>
                <Link
                  href="/app/billing"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80"
                >
                  Billing & Invoices
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-rose-400 hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
