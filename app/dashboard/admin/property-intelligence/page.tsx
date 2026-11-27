"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/auth";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { PropertyIntelligenceAdmin } from "@/components/dashboard/property-intelligence-admin/PropertyIntelligenceAdmin";

export default function PropertyIntelligenceAdminPage() {
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

  return <PropertyIntelligenceAdmin />;
}
