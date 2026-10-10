"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(() => {
    return items.filter((item) => item.defaultOpen).map((item) => item.id);
  });

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={twMerge(clsx("space-y-3", className))}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div
            key={item.id}
            className="rounded-2xl border border-[#1b253b] bg-[#0c101a] overflow-hidden transition-all duration-200 hover:border-slate-700"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer transition-colors hover:bg-slate-800/30"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 pr-4">
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.subtitle}
                    </div>
                  )}
                </div>
                {item.badge && <div className="shrink-0">{item.badge}</div>}
              </div>

              <ChevronDown
                className={clsx(
                  "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                  isOpen ? "rotate-180 text-cyan-400" : ""
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 border-t border-[#1b253b]/60 leading-relaxed">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
