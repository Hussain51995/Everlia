"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon, CalendarIcon, DownloadIcon } from "@/components/ui/Icons";

const DATA_SETS = {
  "30D": [
    { label: "Jan 01", revenue: 24500, mailers: 420 },
    { label: "Jan 05", revenue: 31000, mailers: 580 },
    { label: "Jan 10", revenue: 28400, mailers: 490 },
    { label: "Jan 15", revenue: 45000, mailers: 820 },
    { label: "Jan 20", revenue: 41200, mailers: 760 },
    { label: "Jan 25", revenue: 62000, mailers: 1100 },
    { label: "Jan 30", revenue: 58900, mailers: 950 },
    { label: "Feb 05", revenue: 74000, mailers: 1350 },
    { label: "Feb 10", revenue: 89500, mailers: 1620 },
  ],
  "7D": [
    { label: "Mon", revenue: 12000, mailers: 210 },
    { label: "Tue", revenue: 19500, mailers: 340 },
    { label: "Wed", revenue: 16800, mailers: 290 },
    { label: "Thu", revenue: 24000, mailers: 410 },
    { label: "Fri", revenue: 28900, mailers: 480 },
    { label: "Sat", revenue: 22000, mailers: 390 },
    { label: "Sun", revenue: 31500, mailers: 520 },
  ],
  "90D": [
    { label: "Oct", revenue: 120000, mailers: 2200 },
    { label: "Nov", revenue: 165000, mailers: 3100 },
    { label: "Dec", revenue: 210000, mailers: 4200 },
  ],
};

export function RevenueAreaChart() {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D">("30D");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = DATA_SETS[timeframe];
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  const width = 650;
  const height = 220;
  const paddingX = 40;
  const paddingY = 20;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.revenue / (maxRevenue * 1.15)) * (height - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#C4EBF2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#38B2D1]/10 text-[#38B2D1]">
              <SparklesIcon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-extrabold text-[#0B1F3D]">Revenue & ROI Growth</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#557393]">
            Commission generated from automated direct mail touchpoints
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-1">
            {(["7D", "30D", "90D"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${timeframe === t
                  ? "bg-[#38B2D1] text-white shadow-xs"
                  : "text-[#557393] hover:text-[#0B1F3D]"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            title="Export Report"
            className="grid h-8 w-8 place-items-center rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] text-[#0B1F3D] hover:bg-white"
          >
            <DownloadIcon className="h-4 w-4 text-[#38B2D1]" />
          </button>
        </div>
      </div>

      <div className="relative mt-6 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38B2D1" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#43c5e6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#C4EBF2" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#E2F5F8"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          <motion.path
            d={areaD}
            fill="url(#revenueGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />

          <motion.path
            d={pathD}
            fill="none"
            stroke="#38B2D1"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          {points.map((pt, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

              <motion.circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 6 : 4}
                fill={hoveredIdx === i ? "#0B1F3D" : "#38B2D1"}
                stroke="#ffffff"
                strokeWidth="2.5"
                className="transition-all duration-200"
              />

              <text
                x={pt.x}
                y={height - 2}
                textAnchor="middle"
                className="fill-[#557393] text-[10px] font-bold"
              >
                {pt.data.label}
              </text>
            </g>
          ))}
        </svg>

        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute z-20 rounded-2xl border border-[#38B2D1] bg-[#0B1F3D] p-3 text-white shadow-xl backdrop-blur-md"
              style={{
                left: `${(points[hoveredIdx].x / width) * 100}%`,
                top: `${(points[hoveredIdx].y / height) * 100 - 30}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="text-[10px] font-bold text-[#C4EBF2] uppercase tracking-wider">
                {points[hoveredIdx].data.label}
              </div>
              <div className="mt-1 text-base font-black text-[#43c5e6]">
                ${points[hoveredIdx].data.revenue.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-white/80">
                📫 {points[hoveredIdx].data.mailers} Mailers Delivered
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#C4EBF2] pt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#38B2D1]" />
          <span className="font-semibold text-[#0B1F3D]">Commission Revenue</span>
        </div>
        <div className="font-extrabold text-[#38B2D1] sm:text-sm">
          Avg. ROI: <span className="text-[#0B1F3D]">4.8x per dollar spent</span>
        </div>
      </div>
    </div>
  );
}
