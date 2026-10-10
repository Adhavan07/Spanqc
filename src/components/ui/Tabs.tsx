"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}: TabsProps) {
  if (variant === "pills") {
    return (
      <div
        className={twMerge(
          clsx(
            "inline-flex items-center p-1 rounded-xl bg-[#0a0e18] border border-[#1b253b] gap-1 overflow-x-auto",
            className
          )
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer select-none",
                isActive
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              )}
            >
              {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                    isActive ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        clsx("flex items-center gap-1 border-b border-[#1b253b] overflow-x-auto no-scrollbar", className)
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border-b-2 flex items-center gap-2 whitespace-nowrap -mb-px cursor-pointer",
              isActive
                ? "border-cyan-400 text-cyan-400 bg-cyan-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold",
                  isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
