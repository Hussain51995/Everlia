"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { RevenueAreaChart } from "@/components/dashboard/charts/RevenueAreaChart";
import { LeadFunnelBarChart } from "@/components/dashboard/charts/LeadFunnelBarChart";
import { CampaignPieChart } from "@/components/dashboard/charts/CampaignPieChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { SparklesIcon, CalendarIcon, BuildingIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { useAuthStore } from "@/stores/auth-store";
import { orgScopedKeys } from "@/hooks/cards/keys";
import { authKeys } from "@/hooks/auth/keys";

export function DashboardHome() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const membership = useAuthStore((state) => state.membership);
  const isPlatformAdmin = useAuthStore((state) => state.isPlatformAdmin);
  const sessionReady = useAuthStore((state) => state.sessionReady);

  const firstName = profile?.first_name?.trim() || "there";
  const orgName = membership?.organization?.name ?? "your organization";
  const industryName = membership?.organization?.industry?.name;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
      await Promise.all(
        orgScopedKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: [...key] })
        )
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white p-8">
        <ThemeLoader label="Loading workspace…" size="lg" />
      </div>
    );
  }

  if (isPlatformAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 rounded-3xl border border-[#C4EBF2] bg-[#0B1F3D] p-6 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-white px-3 py-1 text-[11px] font-bold text-[#38B2D1] uppercase tracking-wider shadow-xs">
              <SparklesIcon className="h-3.5 w-3.5" />
              Platform Admin
            </span>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-xs text-white sm:text-sm">
              Manage industries and organizations for the Everlia platform.
            </p>
            <Link
              href="/dashboard/admin/organizations"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#38B2D1] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#2ca0be]"
            >
              <BuildingIcon className="h-4 w-4" />
              Open Industries & Orgs
            </Link>
          </div>
          <RefetchButton onClick={handleRefresh} isRefreshing={refreshing} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-[#C4EBF2] bg-[#0B1F3D] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#38B2D1] shadow-xs">
              <SparklesIcon className="h-3.5 w-3.5" />
              Live Workspace Active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
              <BuildingIcon className="h-3.5 w-3.5 text-[#38B2D1]" />
              {orgName}
              {industryName ? ` · ${industryName}` : ""}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-xs text-white sm:text-sm">
            Viewing workspace for{" "}
            <span className="font-bold text-[#38B2D1]">{orgName}</span>
            {industryName ? (
              <>
                {" "}
                in <span className="font-bold text-[#38B2D1]">{industryName}</span>
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RefetchButton onClick={handleRefresh} isRefreshing={refreshing} />
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
