"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircleIcon, CheckCircleIcon, CloseIcon } from "@/components/ui/Icons";

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneStyles(tone: ToastTone) {
  switch (tone) {
    case "success":
      return {
        shell: "border-emerald-200 bg-white",
        iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-200",
        accent: "bg-emerald-500",
      };
    case "error":
      return {
        shell: "border-rose-200 bg-white",
        iconWrap: "bg-rose-50 text-rose-600 border-rose-200",
        accent: "bg-rose-500",
      };
    default:
      return {
        shell: "border-[#C4EBF2] bg-white",
        iconWrap: "bg-[#38B2D1]/10 text-[#38B2D1] border-[#C4EBF2]",
        accent: "bg-[#38B2D1]",
      };
  }
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "error") return <AlertCircleIcon className="h-5 w-5" />;
  if (tone === "success") return <CheckCircleIcon className="h-5 w-5" />;
  return <CheckCircleIcon className="h-5 w-5" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = {
        id,
        title: toast.title,
        description: toast.description,
        tone: toast.tone ?? "info",
        durationMs: toast.durationMs,
      };

      setToasts((current) => [...current, item]);

      const duration = toast.durationMs ?? 5000;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        <AnimatePresence>
          {toasts.map((toast) => {
            const styles = toneStyles(toast.tone);
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border shadow-xl shadow-[#38b2d1]/15 ${styles.shell}`}
              >
                <div className={`h-1 w-full ${styles.accent}`} />
                <div className="flex items-start gap-3 p-4">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${styles.iconWrap}`}
                  >
                    <ToastIcon tone={toast.tone} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-extrabold text-[#0B1F3D]">
                      {toast.title}
                    </p>
                    {toast.description ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-[#557393]">
                        {toast.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="rounded-lg p-1 text-[#557393] transition-colors hover:bg-[#F0FAFC] hover:text-[#0B1F3D]"
                    aria-label="Dismiss notification"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
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
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
