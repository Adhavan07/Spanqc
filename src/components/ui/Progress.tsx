"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ProgressProps {
  value: number; // 0 - 100
  label?: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "pass" | "fail" | "amber";
  className?: string;
}

export function Progress({
  value,
  label,
  subtext,
  size = "md",
  variant = "brand",
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  const variantStyles = {
    brand: "bg-gradient-to-r from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/30",
    pass: "bg-emerald-500 shadow-sm shadow-emerald-500/30",
    fail: "bg-rose-500 shadow-sm shadow-rose-500/30",
    amber: "bg-amber-500 shadow-sm shadow-amber-500/30",
  };

  return (
    <div className={twMerge(clsx("w-full", className))}>
      {(label || subtext) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
          {label && <span className="font-semibold text-slate-300 uppercase tracking-wider">{label}</span>}
          {subtext && <span className="text-slate-400">{subtext}</span>}
        </div>
      )}
      <div className={twMerge(clsx("w-full bg-[#070b14] rounded-full overflow-hidden border border-[#1b253b]", sizeStyles[size]))}>
        <div
          className={twMerge(
            clsx(
              "h-full rounded-full transition-all duration-300 ease-out",
              variantStyles[variant]
            )
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
