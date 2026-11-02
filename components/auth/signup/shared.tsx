"use client";

import type { ReactNode } from "react";
import { AlertCircleIcon } from "@/components/ui/Icons";

export const fieldLabelClass =
  "block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]";

export const textInputClass =
  "w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15";

export const textInputNoIconClass =
  "mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 px-4 text-sm font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15";

export const primaryButtonClass =
  "inline-flex min-h-[46px] flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-4 text-sm font-bold text-white shadow-lg shadow-[#38B2D1]/30 transition-all hover:bg-[#2ca0be] disabled:cursor-not-allowed disabled:opacity-70";

export const secondaryButtonClass =
  "inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl border border-[#C4EBF2] bg-white px-4 text-sm font-bold text-[#0B1F3D] transition-all hover:bg-[#F0FAFC] disabled:opacity-70";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
    >
      <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function InfoBanner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning";
}) {
  const tones = {
    info: "border-[#C4EBF2] bg-[#F0FAFC] text-[#557393]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div className={`rounded-2xl border px-3 py-2 text-xs ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = "h-5 w-5 border-white" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

export function joinPolicyLabel(policy: string) {
  switch (policy) {
    case "invite_only":
      return "Invitation required";
    case "approval_required":
      return "Approval required";
    case "verified_domain":
      return "Verified domain join";
    default:
      return policy;
  }
}
