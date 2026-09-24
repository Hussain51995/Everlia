"use client";

import { motion } from "framer-motion";
import { FilterIcon } from "@/components/ui/Icons";

const FUNNEL_STAGES = [
  { stage: "Contacts & Sphere", count: 2845, percent: 100, color: "bg-[#38B2D1]" },
  { stage: "Direct Mail Delivered", count: 2180, percent: 76.6, color: "bg-[#43c5e6]" },
  { stage: "QR Scan Response", count: 710, percent: 25.0, color: "bg-[#10284d]" },
  { stage: "Listing Consultations", count: 342, percent: 12.0, color: "bg-[#436D75]" },
  { stage: "Closed Deals", count: 148, percent: 5.2, color: "bg-emerald-500" },
];

export function LeadFunnelBarChart() {
  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5">
      <div className="flex items-center justify-between pb-4 border-b border-[#C4EBF2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#38B2D1]/10 text-[#38B2D1]">
              <FilterIcon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-extrabold text-[#0B1F3D]">CRM Pipeline Conversion</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#557393]">Conversion breakdown by campaign stage</p>
        </div>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-600">
          5.2% Overall Conversion
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {FUNNEL_STAGES.map((item, idx) => (
          <div key={item.stage} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0B1F3D] flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#F0FAFC] border border-[#C4EBF2] text-[10px] font-extrabold text-[#38B2D1]">
                  0{idx + 1}
                </span>
                {item.stage}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#557393]">{item.count.toLocaleString()} leads</span>
                <span className="w-12 text-right font-extrabold text-[#0B1F3D]">{item.percent}%</span>
              </div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-[#F0FAFC] border border-[#C4EBF2]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                className={`h-full rounded-full ${item.color}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-[#F0FAFC] border border-[#C4EBF2] p-3 text-center text-xs font-semibold text-[#0B1F3D]">
        💡 Top performing touchpoint: <span className="text-[#38B2D1] font-bold">Home Anniversary Postcards</span> (+34% scan rate)
      </div>
    </div>
  );
}
