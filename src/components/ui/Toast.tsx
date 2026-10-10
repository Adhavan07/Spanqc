"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertOctagon, Info, X } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4">
        <AnimatePresence>
          {toasts.map((toast) => {
            const config = {
              success: {
                border: "border-emerald-500/40",
                bg: "bg-[#091512]/95",
                text: "text-emerald-300",
                icon: CheckCircle2,
              },
              error: {
                border: "border-rose-500/40",
                bg: "bg-[#180a0e]/95",
                text: "text-rose-300",
                icon: AlertOctagon,
              },
              info: {
                border: "border-cyan-500/40",
                bg: "bg-[#08121d]/95",
                text: "text-cyan-300",
                icon: Info,
              },
            }[toast.type];

            const Icon = config.icon;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                  "pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 text-xs font-medium",
                  config.border,
                  config.bg,
                  config.text
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{toast.message}</span>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  aria-label="Dismiss toast"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
    };
  }
  return context;
}
