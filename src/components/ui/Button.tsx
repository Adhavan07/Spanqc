"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "pass" | "cobalt";
  size?: "xs" | "sm" | "md" | "lg";
  rounded?: "default" | "pill";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      rounded = "default",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070a] active:scale-[0.98]";

    const radiusStyles = {
      default: "rounded-xl",
      pill: "rounded-full",
    };

    const sizeStyles = {
      xs: "text-xs px-2.5 py-1 gap-1.5 h-7",
      sm: "text-xs px-3 py-1.5 gap-2 h-8.5 font-medium",
      md: "text-sm px-4 py-2 gap-2 h-10",
      lg: "text-base px-6 py-3 gap-2.5 h-12 font-semibold",
    };

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 border border-cyan-300/40",
      secondary:
        "bg-[#0e1422] hover:bg-[#151e33] text-slate-200 border border-[#1b253b] hover:border-slate-600 shadow-sm",
      outline:
        "bg-transparent hover:bg-slate-800/60 text-slate-200 border border-[#1b253b] hover:border-cyan-500/40 hover:text-white",
      danger:
        "bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500 shadow-sm hover:shadow-rose-500/20",
      ghost:
        "bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white border-transparent",
      pass:
        "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-500/20 border border-emerald-500/40",
      cobalt:
        "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 border border-blue-400/30",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            baseStyles,
            radiusStyles[rounded],
            sizeStyles[size],
            variantStyles[variant],
            className
          )
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
