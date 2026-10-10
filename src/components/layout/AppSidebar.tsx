"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { clsx } from "clsx";
import {
  Rocket,
  FolderKanban,
  Box,
  FileSpreadsheet,
  History,
  BookOpenCheck,
  Gauge,
  CreditCard,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Grid,
  LogOut,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const mainNavItems = [
    { label: "Launchpad Overview", href: "/app", icon: Grid },
    { label: "Projects", href: "/app/projects", icon: FolderKanban },
    { label: "Unbox™ & QC", href: "/app/check", icon: Box, highlight: true },
    { label: "Reports", href: "/app/reports/run-wh402", icon: FileSpreadsheet },
    { label: "History", href: "/app/history", icon: History },
    { label: "Standards", href: "/app/standards", icon: BookOpenCheck },
  ];

  const adminNavItems = [
    { label: "Usage", href: "/app/usage", icon: Gauge },
    { label: "Billing", href: "/app/billing", icon: CreditCard },
    { label: "Team", href: "/app/team", icon: Users },
    { label: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <aside
      className={clsx(
        "h-screen sticky top-0 bg-[#07090f] border-r border-[#1b253b] flex flex-col justify-between transition-all duration-200 z-30 shrink-0 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top Header & Org Switcher */}
      <div>
        <div className="h-16 px-4 border-b border-[#1b253b] flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/20 via-blue-600/30 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Rocket className="w-4 h-4 -rotate-45 text-cyan-400" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-extrabold text-white font-mono tracking-tight">
                  SPANQC
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {organization?.name || "Spandsons Horizon"}
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 hidden lg:flex cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Organization Scope Pill */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="px-3 py-2 rounded-xl bg-[#0c101a] border border-[#1b253b] flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300 truncate">
                  {organization?.slug || "spandsons"}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                PRO
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6">
          {/* Main Inspection Workflow */}
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Launchpad Apps
              </div>
            )}
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                        : item.highlight
                        ? "bg-cyan-500/10 text-slate-200 hover:bg-cyan-500/20 hover:text-white"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-cyan-400" : item.highlight ? "text-cyan-400" : "text-slate-400"
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.highlight && (
                      <span className="ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 bg-cyan-400 text-slate-950 rounded">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Administration & Organization */}
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Settings & Account
              </div>
            )}
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    )}
                  >
                    <Icon className={clsx("w-4 h-4 shrink-0", isActive ? "text-cyan-400" : "text-slate-400")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* User Profile & Sign Out */}
      <div className="p-3 border-t border-[#1b253b]">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0c101a] border border-[#1b253b]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
              {user?.full_name ? user.full_name[0] : "E"}
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {user?.full_name || "Engineering User"}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-medium truncate">
                  {user?.role || "ADMIN"}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
