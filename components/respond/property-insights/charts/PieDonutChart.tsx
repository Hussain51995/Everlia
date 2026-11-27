"use client";

import { useState } from "react";

export type PieSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function PieDonutChart({
  title,
  slices,
  caption,
  centerLabel,
}: {
  title: string;
  slices: PieSlice[];
  caption?: string;
  centerLabel?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const valid = slices.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = valid.reduce((sum, s) => sum + s.value, 0);
  if (valid.length < 2 || total <= 0) return null;

  let angle = 0;
  const arcs = valid.map((slice) => {
    const sweep = (slice.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...slice, start, end, percent: (slice.value / total) * 100 };
  });

  const description = `${title}: ${arcs
    .map((a) => `${a.label} ${Math.round(a.percent)}%`)
    .join(", ")}`;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
        {title}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-28 w-28 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={description}
          >
            <title>{description}</title>
            {arcs.map((arc) => {
              const isHovered = hovered === arc.id;
              if (arc.end - arc.start >= 359.9) {
                return (
                  <circle
                    key={arc.id}
                    cx={50}
                    cy={50}
                    r={34}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={isHovered ? 14 : 12}
                  />
                );
              }
              return (
                <path
                  key={arc.id}
                  d={arcPath(50, 50, 34, arc.start, arc.end)}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isHovered ? 14 : 12}
                  strokeLinecap="butt"
                  className="cursor-pointer transition-[stroke-width] duration-200"
                  onMouseEnter={() => setHovered(arc.id)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-base font-black text-[#0B1F3D]">{total}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#9BB0C2]">
              {centerLabel ?? "Total"}
            </span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {arcs.map((arc) => (
            <li
              key={arc.id}
              className={`flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-[11px] transition-colors ${
                hovered === arc.id ? "bg-[#E8F7FB]" : ""
              }`}
              onMouseEnter={() => setHovered(arc.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-[#0B1F3D]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                <span className="truncate">{arc.label}</span>
              </span>
              <span className="shrink-0 font-extrabold text-[#557393]">
                {Math.round(arc.percent)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      {caption ? (
        <p className="mt-2 text-[10px] leading-relaxed text-[#9BB0C2]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
