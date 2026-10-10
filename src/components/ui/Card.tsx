"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  active?: boolean;
  variant?: "default" | "elevated" | "blueprint" | "glass";
}

export function Card({
  className,
  hoverable = false,
  active = false,
  variant = "default",
  children,
  ...props
}: CardProps) {
  const baseStyles = "rounded-2xl border transition-all duration-200";

  const variantStyles = {
    default: "bg-[#0c101a] border-[#1b253b] text-slate-100",
    elevated: "bg-[#111726] border-[#222e47] shadow-xl shadow-black/60 text-slate-100",
    blueprint: "bg-[#080d1a] border-cyan-500/30 text-slate-100 relative overflow-hidden",
    glass: "bg-[#0c101a]/80 backdrop-blur-md border-[#1b253b] text-slate-100",
  };

  const hoverStyles = hoverable
    ? "hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5"
    : "";

  const activeStyles = active ? "border-cyan-400 ring-1 ring-cyan-400/40 shadow-md shadow-cyan-500/15" : "";

  return (
    <div
      className={twMerge(clsx(baseStyles, variantStyles[variant], hoverStyles, activeStyles, className))}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx("px-5 py-4 border-b border-[#1b253b] flex items-center justify-between", className)
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={twMerge(
        clsx("text-base font-bold text-white tracking-tight", className)
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={twMerge(clsx("text-xs text-slate-400 mt-0.5", className))}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx("p-5", className))} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx("px-5 py-3.5 border-t border-[#1b253b] bg-[#070a12]/60 flex items-center justify-between", className)
      )}
      {...props}
    >
      {children}
    </div>
  );
}
