"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminIndustriesPanel } from "@/components/dashboard/AdminIndustriesPanel";
import { AdminOrganizationsPanel } from "@/components/dashboard/AdminOrganizationsPanel";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { useSession } from "@/hooks/auth";
import { useAuthStore } from "@/stores/auth-store";
import { adminKeys } from "@/hooks/admin/keys";

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const sessionQuery = useSession();
  const isPlatformAdmin = useAuthStore((state) => state.isPlatformAdmin);
  const sessionReady = useAuthStore((state) => state.sessionReady);

  useEffect(() => {
    if (!sessionReady || sessionQuery.isLoading) return;
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [isPlatformAdmin, router, sessionQuery.isLoading, sessionReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
      await sessionQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (!sessionReady || sessionQuery.isLoading || !isPlatformAdmin) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white p-8">
        <ThemeLoader label="Checking platform admin access…" size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <RefetchButton onClick={handleRefresh} isRefreshing={refreshing} />
      </div>
      <AdminIndustriesPanel />
      <AdminOrganizationsPanel />
    </div>
  );
}
