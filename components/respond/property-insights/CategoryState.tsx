"use client";

import type { CategoryResultStatus } from "@/lib/types/property-intelligence";
import { categoryStatusCopy, isEmptyAvailableData } from "./status-copy";

export function CategorySkeleton({ label }: { label: string }) {
  return (
    <div
      className="animate-pulse rounded-2xl border border-[#D7EAF1] bg-white p-4 shadow-[0_10px_30px_-18px_rgba(11,31,61,0.25)]"
      aria-busy="true"
      aria-label={`Loading ${label}`}
    >
      <div className="h-3 w-28 rounded bg-[#C4EBF2]/80" />
      <div className="mt-3 h-8 w-40 rounded bg-[#C4EBF2]/60" />
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-full rounded bg-[#E8F7FB]" />
        <div className="h-2.5 w-4/5 rounded bg-[#E8F7FB]" />
        <div className="h-2.5 w-3/5 rounded bg-[#E8F7FB]" />
      </div>
    </div>
  );
}

export function CategoryUnavailable({
  label,
  status,
}: {
  label: string;
  status: CategoryResultStatus;
}) {
  const copy = categoryStatusCopy(status);
  if (!copy) return null;

  return (
    <div
      className="rounded-2xl border border-dashed border-[#C4EBF2] bg-white/90 px-4 py-3.5 shadow-sm"
      role="status"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9BB0C2]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[#0B1F3D]">{copy.title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-[#6B849E]">{copy.body}</p>
    </div>
  );
}

export function CategoryEmpty({
  label,
  title = "Nothing to show",
  body = "No published details are available for this section right now.",
}: {
  label: string;
  title?: string;
  body?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-dashed border-[#C4EBF2] bg-white/90 px-4 py-3.5 shadow-sm"
      role="status"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9BB0C2]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[#0B1F3D]">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-[#6B849E]">{body}</p>
    </div>
  );
}

export function shouldRenderCategoryShell(
  status: CategoryResultStatus,
  data: unknown
): "loading" | "empty" | "unavailable" | "content" | "hide" {
  if (status === "disabled") return "hide";
  if (status === "loading") return "loading";
  if (isEmptyAvailableData(status, data)) return "empty";
  if (status === "available") return "content";
  return "unavailable";
}
