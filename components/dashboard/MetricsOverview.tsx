"use client";

import { motion } from "framer-motion";
import { UsersIcon, SendIcon, TrendingUpIcon, DollarSignIcon, ArrowIcon } from "@/components/ui/Icons";

const METRICS = [
  {
    title: "Total Active Clients",
    value: "2,845",
    change: "+14.2%",
    isPositive: true,
    subtitle: "vs last month",
    icon: UsersIcon,
    sparkline: [20, 35, 25, 45, 40, 60, 55, 75, 70, 90],
    color: "#38B2D1",
  },
  {
    title: "Direct Mail Sent",
    value: "18,420",
    change: "+8.7%",
    isPositive: true,
    subtitle: "postcards & gifts",
    icon: SendIcon,
    sparkline: [30, 25, 40, 35, 55, 50, 70, 65, 80, 85],
    color: "#43c5e6",
  },
  {
    title: "QR Conversion Rate",
    value: "24.8%",
    change: "+3.1%",
    isPositive: true,
    subtitle: "scanned & responded",
    icon: TrendingUpIcon,
    sparkline: [15, 20, 18, 30, 28, 42, 38, 52, 48, 65],
    color: "#10284d",
  },
  {
    title: "Generated Commission",
    value: "$482,900",
    change: "+19.4%",
    isPositive: true,
    subtitle: "repeat & referral listings",
    icon: DollarSignIcon,
    sparkline: [25, 40, 35, 50, 45, 70, 60, 85, 75, 95],
    color: "#059669",
  },
];

export function MetricsOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((item, idx) => {
        const Icon = item.icon;
        const max = Math.max(...item.sparkline);
        const min = Math.min(...item.sparkline);
        const points = item.sparkline
          .map((val, i) => {
            const x = (i / (item.sparkline.length - 1)) * 120;
            const y = 35 - ((val - min) / (max - min || 1)) * 28;
            return `${x},${y}`;
          })
          .join(" ");

        return (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className="group relative overflow-hidden rounded-3xl border border-[#C4EBF2] bg-gradient-to-b from-white via-[#F0FAFC]/50 to-[#E2F5F8]/40 p-5 shadow-sm transition-all hover:border-[#38B2D1] hover:shadow-lg hover:shadow-[#38B2D1]/10"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#38B2D1]/10 text-[#38B2D1] transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-200">
                <ArrowIcon className="h-3 w-3 -rotate-45" />
                <span>{item.change}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-[#0B1F3D] sm:text-3xl">
                {item.value}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-bold text-[#10284D]">{item.title}</span>
                <span className="text-[10px] text-[#557393]">{item.subtitle}</span>
              </div>
            </div>

            <div className="mt-4 h-9 w-full">
              <svg viewBox="0 0 120 38" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id={`sparkGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={item.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={item.color} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,38 ${points} 120,38`}
                  fill={`url(#sparkGrad-${idx})`}
                />
                <motion.polyline
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                />
              </svg>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
