"use client";

import { RefreshIcon } from "@/components/ui/RefreshIcon";

type RefetchButtonProps = {
  onClick: () => void;
  isRefreshing?: boolean;
  label?: string;
};

export function RefetchButton({
  onClick,
  isRefreshing = false,
  label = "Refresh",
}: RefetchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRefreshing}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#C4EBF2] bg-white px-3 py-2 text-xs font-bold text-[#0B1F3D] transition hover:border-[#38B2D1] hover:bg-[#F0FAFC] disabled:cursor-wait disabled:opacity-60"
      title="Refresh data for the active organization"
    >
      <RefreshIcon
        className={`h-3.5 w-3.5 text-[#38B2D1] ${isRefreshing ? "animate-spin" : ""}`}
      />
      <span>{isRefreshing ? "Refreshing…" : label}</span>
    </button>
  );
}
