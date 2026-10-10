"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Card } from "./Card";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  statusColor?: "blue" | "emerald" | "rose" | "amber";
  progress?: number; // 0 - 100
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  trend,
  icon,
  statusColor = "blue",
  progress,
  className,
}: MetricCardProps) {
  const colorMap = {
    blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    rose: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  };

  const progressColorMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  };

  return (
    <Card className={twMerge(clsx("p-5 relative overflow-hidden", className))} hoverable>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono-tabular">
              {value}
            </span>
            {trend && (
              <span
                className={clsx(
                  "text-xs font-medium inline-flex items-center",
                  trend.isPositive ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>

        {icon && (
          <div
            className={twMerge(
              clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0",
                colorMap[statusColor]
              )
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={twMerge(clsx("h-full rounded-full transition-all duration-500", progressColorMap[statusColor]))}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
