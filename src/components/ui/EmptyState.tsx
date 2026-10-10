"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "rounded-2xl border border-dashed border-[#1b253b] bg-[#0c101a]/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto",
          className
        )
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/5">
        {icon || (
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <a href={actionHref}>
              <Button variant="primary" size="sm">
                {actionLabel}
              </Button>
            </a>
          ) : (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
