"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subtext?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                "w-full appearance-none bg-[#0c101a] text-slate-100",
                "border border-[#1b253b] rounded-xl text-sm pl-3.5 pr-10 py-2.5 transition-all duration-200 cursor-pointer",
                "focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                error ? "border-rose-500 focus:ring-rose-500/25" : "",
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0c101a] text-slate-100 py-1">
                {opt.label} {opt.subtext ? `(${opt.subtext})` : ""}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
