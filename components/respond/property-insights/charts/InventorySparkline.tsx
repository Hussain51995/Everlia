"use client";

import { useId } from "react";
import type { MarketHistoricalPoint } from "@/lib/types/property-intelligence";

export function InventorySparkline({
  series,
}: {
  series: MarketHistoricalPoint[];
}) {
  const gradId = useId().replace(/:/g, "");
  const points = series
    .map((p) => {
      const v = p.metrics.totalListings;
      const t = Date.parse(p.periodStart);
      if (v == null || !Number.isFinite(v) || !Number.isFinite(t)) return null;
      return { t, v, label: p.periodStart };
    })
    .filter((p): p is { t: number; v: number; label: string } => p != null)
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) return null;

  const width = 120;
  const height = 36;
  const minV = Math.min(...points.map((p) => p.v));
  const maxV = Math.max(...points.map((p) => p.v));
  const span = Math.max(1, maxV - minV);
  const minX = points[0]!.t;
  const maxX = points[points.length - 1]!.t;
  const spanX = Math.max(1, maxX - minX);

  const coords = points.map((p) => ({
    x: 4 + ((p.t - minX) / spanX) * (width - 8),
    y: 4 + (1 - (p.v - minV) / span) * (height - 8),
  }));

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#F7FCFE] px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9BB0C2]">
          Inventory over time
        </p>
        <p className="text-xs font-semibold text-[#0B1F3D]">
          {points[0]!.v} → {points[points.length - 1]!.v} listings
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-9 w-[7.5rem] shrink-0"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9FD8E8" />
            <stop offset="100%" stopColor="#38B2D1" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
