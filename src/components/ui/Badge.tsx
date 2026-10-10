"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FindingSeverity, FindingStatus } from "@/types";
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Clock,
} from "lucide-react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "severity" | "status" | "result" | "neutral" | "ai" | "outline";
  severity?: FindingSeverity;
  status?: FindingStatus;
  result?: "PASS" | "FAIL" | "PENDING";
  size?: "xs" | "sm" | "md";
  rounded?: "default" | "pill";
  showIcon?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  severity,
  status,
  result,
  size = "md",
  rounded = "pill",
  showIcon = true,
  children,
  ...props
}: BadgeProps) {
  const sizeClass = {
    xs: "text-[10px] px-2 py-0.5 gap-1 font-mono font-medium",
    sm: "text-[11px] px-2.5 py-0.5 gap-1.5 font-mono font-medium",
    md: "text-xs px-3 py-1 gap-1.5 font-mono font-semibold",
  };

  const radiusClass = rounded === "pill" ? "rounded-full" : "rounded-md";

  // Result Badge (PASS / FAIL / PENDING)
  if (variant === "result" && result) {
    if (result === "PASS") {
      return (
        <span
          className={twMerge(
            clsx(
              "inline-flex items-center tracking-wider uppercase border",
              "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10",
              sizeClass[size],
              radiusClass,
              className
            )
          )}
          {...props}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          <span>{children || "PASS"}</span>
        </span>
      );
    }
    if (result === "FAIL") {
      return (
        <span
          className={twMerge(
            clsx(
              "inline-flex items-center tracking-wider uppercase border",
              "bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/10",
              sizeClass[size],
              radiusClass,
              className
            )
          )}
          {...props}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          <span>{children || "FAIL"}</span>
        </span>
      );
    }
    return (
      <span
        className={twMerge(
          clsx(
            "inline-flex items-center uppercase border",
            "bg-blue-500/15 text-blue-400 border-blue-500/30",
            sizeClass[size],
            radiusClass,
            className
          )
        )}
        {...props}
      >
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
        <span>{children || "PENDING"}</span>
      </span>
    );
  }

  // Severity Badge
  if (variant === "severity" && severity) {
    const config = {
      CRITICAL: {
        bg: "bg-rose-500/15 text-rose-400 border-rose-500/40",
        icon: AlertOctagon,
      },
      MAJOR: {
        bg: "bg-orange-500/15 text-orange-400 border-orange-500/40",
        icon: AlertTriangle,
      },
      MINOR: {
        bg: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
        icon: AlertTriangle,
      },
      WARNING: {
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/40",
        icon: AlertTriangle,
      },
      INFO: {
        bg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
        icon: Info,
      },
    };

    const current = config[severity] || config.INFO;
    const IconComponent = current.icon;

    return (
      <span
        className={twMerge(
          clsx(
            "inline-flex items-center uppercase border",
            current.bg,
            sizeClass[size],
            radiusClass,
            className
          )
        )}
        {...props}
      >
        {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
        <span>{children || severity}</span>
      </span>
    );
  }

  // Status Badge
  if (variant === "status" && status) {
    const statusConfig: Record<FindingStatus, { bg: string; icon: React.ComponentType<{ className?: string }> }> = {
      OPEN: {
        bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        icon: AlertCircleIcon,
      },
      CONFIRMED: {
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: AlertTriangle,
      },
      NEEDS_REVIEW: {
        bg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        icon: HelpCircle,
      },
      RESOLVED: {
        bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2,
      },
      REJECTED: {
        bg: "bg-slate-700/50 text-slate-300 border-slate-600",
        icon: X,
      },
    };

    const currentStatus = statusConfig[status] || statusConfig.OPEN;
    const IconComp = currentStatus.icon;

    return (
      <span
        className={twMerge(
          clsx(
            "inline-flex items-center uppercase border",
            currentStatus.bg,
            sizeClass[size],
            radiusClass,
            className
          )
        )}
        {...props}
      >
        {showIcon && <IconComp className="w-3.5 h-3.5 shrink-0" />}
        <span>{children || status}</span>
      </span>
    );
  }

  // AI Assistant Badge
  if (variant === "ai") {
    return (
      <span
        className={twMerge(
          clsx(
            "inline-flex items-center uppercase border",
            "bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 text-cyan-300 border-cyan-400/30",
            sizeClass[size],
            radiusClass,
            className
          )
        )}
        {...props}
      >
        {showIcon && <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />}
        <span>{children || "AI ASSISTED"}</span>
      </span>
    );
  }

  // Outline variant
  if (variant === "outline") {
    return (
      <span
        className={twMerge(
          clsx(
            "inline-flex items-center uppercase border border-[#1b253b] text-slate-300 bg-[#0c101a]",
            sizeClass[size],
            radiusClass,
            className
          )
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  // Neutral default
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center font-medium border border-slate-700/60 bg-slate-800/60 text-slate-300",
          sizeClass[size],
          radiusClass,
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
