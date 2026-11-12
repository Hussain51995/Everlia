"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useSession } from "@/hooks/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  useSession();

  return (
    <div className="flex min-h-screen w-full bg-[#F0FAFC] text-[#0B1F3D]">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onStartCampaign={() => {
          setMobileSidebarOpen(false);
          router.push("/dashboard/customers");
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <DashboardHeader
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-5 lg:p-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
