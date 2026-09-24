import type { Metadata } from "next";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { RevenueAreaChart } from "@/components/dashboard/charts/RevenueAreaChart";
import { LeadFunnelBarChart } from "@/components/dashboard/charts/LeadFunnelBarChart";
import { CampaignPieChart } from "@/components/dashboard/charts/CampaignPieChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { SparklesIcon, CalendarIcon, SendIcon } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "CRM Dashboard - HomeLink",
  description: "Manage your client retention, automated direct mail campaigns & ROI metrics.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-[#C4EBF2] bg-gradient-to-r from-white via-[#F0FAFC] to-[#C4EBF2]/40 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-white px-3 py-1 text-[11px] font-bold text-[#38B2D1] uppercase tracking-wider shadow-xs">
              <SparklesIcon className="h-3.5 w-3.5" />
              Live Workspace Active
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-[#0B1F3D] sm:text-3xl">
            Welcome back, Sarah
          </h1>
          <p className="mt-1 text-xs text-[#557393] sm:text-sm">
            Your automated direct mail touchpoints have generated <span className="font-bold text-[#0B1F3D]">14 repeat listing leads</span> this month.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[#C4EBF2] bg-white px-4 py-2 text-xs font-bold text-[#0B1F3D] shadow-xs">
            <CalendarIcon className="h-4 w-4 text-[#38B2D1]" />
            <span>Q3 Campaign Cycle</span>
          </div>
        </div>
      </div>

      <MetricsOverview />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <RevenueAreaChart />

          <RecentActivityTable />
        </div>

        <div className="space-y-5 xl:col-span-1">
          <CampaignPieChart />

          <LeadFunnelBarChart />
        </div>
      </div>
    </div>
  );
}
