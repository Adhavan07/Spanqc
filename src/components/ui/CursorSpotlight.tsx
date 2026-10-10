"use client";

import React, { useRef, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CursorSpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  glowOnHover?: boolean;
}

export function CursorSpotlightCard({
  children,
  className,
  spotlightColor = "rgba(0, 240, 255, 0.15)",
  glowOnHover = true,
  ...props
}: CursorSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={twMerge(
        clsx(
          "relative overflow-hidden rounded-2xl bg-[#0d121e] border border-slate-800 transition-all duration-300",
          isHovered && glowOnHover ? "border-cyan-500/40 shadow-xl shadow-cyan-500/10" : "",
          className
        )
      )}
      {...props}
    >
      {/* Magnetic Cursor Spotlight Gradient Overlay */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 65%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
