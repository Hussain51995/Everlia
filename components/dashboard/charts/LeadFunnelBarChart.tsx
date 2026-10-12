"use client";

import { motion } from "framer-motion";
import { FilterIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import type { FunnelStage } from "@/lib/dashboard/stats";

type LeadFunnelBarChartProps = {
  funnel: FunnelStage[];
  overallConversionPercent: number;
  isLoading?: boolean;
};

export function LeadFunnelBarChart({
  funnel,
  overallConversionPercent,
  isLoading = false,
}: LeadFunnelBarChartProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[280px] flex-col justify-center rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5">
        <ThemeLoader label="Loading pipeline…" size="md" />
      </div>
    );
  }

  const isEmpty = funnel.every((s) => s.count === 0);

  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5">
      <div className="flex items-center justify-between border-b border-[#C4EBF2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#38B2D1]/10 text-[#38B2D1]">
              <FilterIcon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-extrabold text-[#0B1F3D]">
              Mail Pipeline
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[#557393]">
            Share of all cards by mail status
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
          {overallConversionPercent}% QR scanned
        </span>
      </div>

      {isEmpty ? (
        <div className="mt-8 grid place-items-center py-10 text-center">
          <p className="text-sm font-semibold text-[#0B1F3D]">No pipeline data</p>
          <p className="mt-1 text-xs text-[#557393]">
            Create and send cards to see mail status stages.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {funnel.map((item, idx) => (
            <div key={item.stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-[#0B1F3D]">
                  <span className="grid h-5 w-5 place-items-center rounded-md border border-[#C4EBF2] bg-[#F0FAFC] text-[10px] font-extrabold text-[#38B2D1]">
                    0{idx + 1}
                  </span>
                  {item.stage}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#557393]">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="w-12 text-right font-extrabold text-[#0B1F3D]">
                    {item.percent}%
                  </span>
                </div>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full border border-[#C4EBF2] bg-[#F0FAFC]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.percent, 100)}%` }}
                  transition={{
                    duration: 0.8,
                    delay: idx * 0.1,
                    ease: "easeOut",
                  }}
                  className={`h-full rounded-full ${item.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
