"use client";

import type { ComparableProperty } from "@/lib/types/property-intelligence";
import { formatMoney, formatBedsBaths, formatDistanceMiles } from "./format";

export function ComparablesList({
  comparables,
  limit = 3,
  variant = "card",
}: {
  comparables: ComparableProperty[];
  limit?: number;
  variant?: "card" | "embedded";
}) {
  if (comparables.length === 0) return null;

  const list = (
    <ul className={variant === "card" ? "mt-3 space-y-2" : "mt-2 space-y-2"}>
      {comparables.slice(0, limit).map((comp, index) => {
        const price = formatMoney(comp.listPrice);
        const beds = formatBedsBaths(
          comp.specifications.bedrooms,
          comp.specifications.bathrooms
        );
        const distance = formatDistanceMiles(comp.distanceMiles);
        const address =
          comp.identity.components.formatted ||
          comp.identity.components.line1 ||
          "Comparable property";
        return (
          <li
            key={`${address}-${index}`}
            className="rounded-xl bg-white px-3 py-2.5 text-xs text-[#557393] ring-1 ring-[#E8F7FB]"
          >
            <p className="font-semibold text-[#0B1F3D]">{address}</p>
            <p className="mt-0.5">
              {[price, beds, distance].filter(Boolean).join(" · ")}
            </p>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "embedded") {
    return (
      <div className="border-t border-[#E8F7FB] pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#557393]">
          Nearby comparables
        </p>
        {list}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        Nearby comparables
      </p>
      {list}
    </div>
  );
}
