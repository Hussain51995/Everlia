"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SendIcon } from "@/components/ui/Icons";

const CAMPAIGNS = [
  { name: "Home Anniversary Cards", count: 7000, percent: 38, color: "#38B2D1" },
  { name: "Just Sold / Listed Postcards", count: 5150, percent: 28, color: "#10284D" },
  { name: "Market Valuation Letters", count: 3680, percent: 20, color: "#43c5e6" },
  { name: "Seasonal Gifts & Notes", count: 2590, percent: 14, color: "#436D75" },
];

export function CampaignPieChart() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = CAMPAIGNS.reduce((sum, c) => sum + c.percent, 0);
  let cumulativeAngle = 0;

  const slices = CAMPAIGNS.map((c) => {
    const angle = (c.percent / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;
    return { ...c, startAngle, endAngle };
  });

  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-[#C4EBF2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#38B2D1]/10 text-[#38B2D1]">
              <SendIcon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-extrabold text-[#0B1F3D]">Campaign Breakdown</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#557393]">Direct mail campaign distribution</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
        <div className="relative mx-auto h-48 w-48">
          <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
            {slices.map((slice, i) => {
              const r = 38;
              const cx = 50;
              const cy = 50;

              const x1 = cx + r * Math.cos((Math.PI * slice.startAngle) / 180);
              const y1 = cy + r * Math.sin((Math.PI * slice.startAngle) / 180);
              const x2 = cx + r * Math.cos((Math.PI * slice.endAngle) / 180);
              const y2 = cy + r * Math.sin((Math.PI * slice.endAngle) / 180);

              const largeArcFlag = slice.endAngle - slice.startAngle > 180 ? 1 : 0;
              const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

              const isHovered = hoveredIdx === i;

              return (
                <motion.path
                  key={slice.name}
                  d={pathData}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered ? "14" : "11"}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  initial={{ strokeDasharray: "0 300" }}
                  animate={{ strokeDasharray: "300 300" }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                />
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-[#0B1F3D]">18.4k</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
              Total Mailers
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {CAMPAIGNS.map((c, i) => (
            <div
              key={c.name}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between rounded-xl p-2 transition-all cursor-pointer ${hoveredIdx === i ? "bg-[#F0FAFC] ring-1 ring-[#38B2D1]" : ""
                }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-xs font-semibold text-[#0B1F3D]">{c.name}</span>
              </div>
              <span className="text-xs font-extrabold text-[#10284D]">{c.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
