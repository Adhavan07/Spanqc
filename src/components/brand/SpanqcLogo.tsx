import React from "react";
import Image from "next/image";

interface SpanqcLogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

export function SpanqcLogo({
  variant = "full",
  size = "md",
  className = "",
  priority = false,
}: SpanqcLogoProps) {
  if (variant === "icon") {
    const iconDimensions = {
      sm: { size: 24, px: "w-6 h-6" },
      md: { size: 36, px: "w-9 h-9" },
      lg: { size: 44, px: "w-11 h-11" },
      xl: { size: 60, px: "w-15 h-15" },
    }[size];

    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${iconDimensions.px} ${className}`}
      >
        <Image
          src="/spanqc-icon.png"
          alt="SpanQC Icon"
          width={iconDimensions.size}
          height={iconDimensions.size}
          className="object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]"
          priority={priority}
        />
      </div>
    );
  }

  // Full logo (Icon + "spanqc" logotype, aspect ratio 3.7:1)
  const fullDimensions = {
    sm: { width: 111, height: 30, className: "h-7.5 w-auto" },
    md: { width: 148, height: 40, className: "h-9 w-auto" },
    lg: { width: 185, height: 50, className: "h-11 w-auto" },
    xl: { width: 237, height: 64, className: "h-14 w-auto" },
  }[size];

  return (
    <div
      className={`relative inline-flex items-center shrink-0 ${fullDimensions.className} ${className}`}
    >
      <Image
        src="/spanqc-logo.png"
        alt="SpanQC"
        width={fullDimensions.width}
        height={fullDimensions.height}
        className="h-full w-auto object-contain drop-shadow-[0_0_16px_rgba(0,240,255,0.35)]"
        priority={priority}
      />
    </div>
  );
}

