"use client";

import React, { useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  isLoading?: boolean;
  shortcut?: string;
  variant?: "default" | "hero";
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      onClear,
      isLoading = false,
      shortcut = "⌘K",
      variant = "default",
      placeholder = "Search...",
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement | null>(null);

    const handleContainerClick = () => {
      internalRef.current?.focus();
    };

    const isHero = variant === "hero";

    return (
      <div
        onClick={handleContainerClick}
        className={twMerge(
          clsx(
            "relative flex items-center w-full transition-all duration-200 cursor-text",
            isHero
              ? "spaceship-search-bar h-14 px-4 sm:px-5"
              : "bg-[#0c101a] border border-[#1b253b] hover:border-slate-600 rounded-xl px-3.5 h-10 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/25",
            className
          )
        )}
      >
        <div className="shrink-0 text-slate-400 mr-3 flex items-center">
          {isLoading ? (
            <Loader2 className={clsx("animate-spin text-cyan-400", isHero ? "w-5 h-5" : "w-4 h-4")} />
          ) : (
            <Search className={clsx("text-slate-400", isHero ? "w-5 h-5" : "w-4 h-4")} />
          )}
        </div>

        <input
          ref={(node) => {
            internalRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={clsx(
            "w-full bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500",
            isHero ? "text-sm sm:text-base" : "text-xs sm:text-sm"
          )}
          {...props}
        />

        {value && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors mr-2 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {shortcut && !value && (
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-[#141b2d] border border-[#222e47] rounded-md shrink-0 select-none">
            {shortcut}
          </kbd>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
