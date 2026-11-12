"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { LeadFunnelBarChart } from "@/components/dashboard/charts/LeadFunnelBarChart";
import { CampaignPieChart } from "@/components/dashboard/charts/CampaignPieChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import {
  SparklesIcon,
  CalendarIcon,
  BuildingIcon,
  UsersIcon,
} from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { useAuthStore } from "@/stores/auth-store";
import { orgScopedKeys } from "@/hooks/cards/keys";
import { authKeys } from "@/hooks/auth/keys";
import { useDashboardStats } from "@/hooks/dashboard/use-dashboard-stats";

export function DashboardHome() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const membership = useAuthStore((state) => state.membership);
  const isPlatformAdmin = useAuthStore((state) => state.isPlatformAdmin);
  const sessionReady = useAuthStore((state) => state.sessionReady);

  const { stats, isLoading: statsLoading } = useDashboardStats();

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#38B2D1] shadow-xs">
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

  const cardsThisMonthLabel =
    stats.cardsThisMonth === 1
      ? "1 card this month"
      : `${stats.cardsThisMonth.toLocaleString()} cards this month`;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#C4EBF2] bg-[#0B1F3D] p-6 shadow-sm sm:p-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#38B2D1]/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
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
            <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Automate client greetings with campaigns — the core of Everlia.
              One setup, ongoing mail for birthdays, anniversaries, and
              holidays.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <CalendarIcon className="h-3.5 w-3.5 text-[#38B2D1]" />
                {statsLoading ? "…" : cardsThisMonthLabel}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:inline-block" />
              <span>
                Workspace:{" "}
                <span className="font-bold text-[#38B2D1]">{orgName}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row">
            <Link
              href="/dashboard/customers"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-[#38B2D1] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#38B2D1]/35 transition-all hover:-translate-y-0.5 hover:bg-[#43c5e6] hover:shadow-xl hover:shadow-[#38B2D1]/40 active:translate-y-0"
            >
              <SparklesIcon className="h-5 w-5 transition-transform group-hover:rotate-6" />
              Start Campaign
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/customers?add=1"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 sm:flex-none"
              >
                <UsersIcon className="h-4 w-4" />
                Add Customer
              </Link>
              <Link
                href="/dashboard/templates"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/85 transition hover:bg-white/10 hover:text-white sm:flex-none"
              >
                Send one-off card
              </Link>
              <RefetchButton onClick={handleRefresh} isRefreshing={refreshing} />
            </div>
          </div>
        </div>
      </div>

      <MetricsOverview metrics={stats.metrics} isLoading={statsLoading} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <RecentActivityTable
            activities={stats.activities}
            isLoading={statsLoading}
          />
        </div>
        <div className="space-y-5 xl:col-span-1">
          <CampaignPieChart
            campaigns={stats.campaigns}
            totalMailers={stats.totalMailers}
            isLoading={statsLoading}
          />
          <LeadFunnelBarChart
            funnel={stats.funnel}
            overallConversionPercent={stats.overallConversionPercent}
            isLoading={statsLoading}
          />
        </div>
      </div>
    </div>
  );
}
