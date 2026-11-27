"use client";

import { useId } from "react";
import type { MarketHistoricalPoint } from "@/lib/types/property-intelligence";
import { formatMoney } from "../format";

type ChartPoint = {
  t: number;
  amount: number;
  label: string;
  month: string;
};

function monthLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(ms)
  );
}

export function MarketHistoryChart({
  series,
  metric = "averagePrice",
}: {
  series: MarketHistoricalPoint[];
  metric?: "averagePrice" | "medianPrice";
}) {
  const gradId = useId().replace(/:/g, "");
  const points = series
    .map((point) => {
      const money = point.metrics[metric];
      const amount = money?.amount;
      const t = Date.parse(point.periodStart);
      if (amount == null || !Number.isFinite(amount) || !Number.isFinite(t)) {
        return null;
      }
      return {
        t,
        amount,
        label: point.periodStart,
        month: monthLabel(point.periodStart),
      };
    })
    .filter((p): p is ChartPoint => p != null)
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) {
    return (
      <p className="text-xs text-[#9BB0C2]">
        Not enough historical points to chart asking-price trends yet.
      </p>
    );
  }

  const width = 360;
  const height = 168;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const amounts = points.map((p) => p.amount);
  const minY = Math.min(...amounts);
  const maxY = Math.max(...amounts);
  const padY = Math.max((maxY - minY) * 0.12, maxY * 0.02, 1);
  const y0 = minY - padY;
  const y1 = maxY + padY;
  const spanY = Math.max(1, y1 - y0);
  const minX = points[0]!.t;
  const maxX = points[points.length - 1]!.t;
  const spanX = Math.max(1, maxX - minX);

  const coords = points.map((p) => {
    const x = padL + ((p.t - minX) / spanX) * (width - padL - padR);
    const y = padT + (1 - (p.amount - y0) / spanY) * (height - padT - padB);
    return { x, y, ...p };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const baseline = height - padB;
  const areaPath = `${path} L ${coords[coords.length - 1]!.x.toFixed(
    1
  )} ${baseline} L ${coords[0]!.x.toFixed(1)} ${baseline} Z`;

  const firstAmt = points[0]!.amount;
  const lastAmt = points[points.length - 1]!.amount;
  const changePct =
    firstAmt > 0 ? ((lastAmt - firstAmt) / firstAmt) * 100 : null;
  const first = formatMoney({ amount: firstAmt, currency: "USD" }, {
    compact: true,
  });
  const last = formatMoney({ amount: lastAmt, currency: "USD" }, {
    compact: true,
  });

  const description = `Asking-price trend across ${points.length} periods from ${first} to ${last}. These are asking-price statistics, not completed-sale prices.`;

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
          Asking-price trend
        </p>
        {changePct != null ? (
          <p
            className={`text-xs font-extrabold ${
              changePct >= 0 ? "text-[#1F8A4C]" : "text-rose-600"
            }`}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </p>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-36 w-full sm:h-40"
        role="img"
        aria-label={description}
      >
        <title>{description}</title>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38B2D1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38B2D1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => {
          const y = padT + f * (height - padT - padB);
          return (
            <line
              key={f}
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="#E8F7FB"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={path}
          fill="none"
          stroke="#38B2D1"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r={4} fill="#0B1F3D" />
            <circle cx={c.x} cy={c.y} r={2} fill="#fff" />
            <text
              x={c.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-[#9BB0C2]"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {c.month}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] font-medium text-[#9BB0C2]">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}
