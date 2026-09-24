"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickCampaignModal } from "@/components/dashboard/QuickCampaignModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickCampaignOpen, setQuickCampaignOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-[#F0FAFC] text-[#0B1F3D]">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLaunchCampaign={() => setQuickCampaignOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <DashboardHeader
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenQuickCampaign={() => setQuickCampaignOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-5 lg:p-6 w-full">
          {children}
        </main>
      </div>

      <QuickCampaignModal
        open={quickCampaignOpen}
        onClose={() => setQuickCampaignOpen(false)}
      />
    </div>
  );
}
