"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminIndustriesPanel } from "@/components/dashboard/AdminIndustriesPanel";
import { AdminOrganizationsPanel } from "@/components/dashboard/AdminOrganizationsPanel";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useSession } from "@/hooks/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const sessionQuery = useSession();
  const isPlatformAdmin = useAuthStore((state) => state.isPlatformAdmin);
  const sessionReady = useAuthStore((state) => state.sessionReady);

  useEffect(() => {
    if (!sessionReady || sessionQuery.isLoading) return;
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [isPlatformAdmin, router, sessionQuery.isLoading, sessionReady]);

  if (!sessionReady || sessionQuery.isLoading || !isPlatformAdmin) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white p-8">
        <ThemeLoader label="Checking platform admin access…" size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AdminIndustriesPanel />
      <AdminOrganizationsPanel />
    </div>
  );
}
