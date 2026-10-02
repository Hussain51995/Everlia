"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JoinOrganizationPanel } from "@/components/dashboard/JoinOrganizationPanel";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { useSession } from "@/hooks/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function JoinOrganizationPage() {
  const router = useRouter();
  const sessionQuery = useSession();
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const canUseMemberOrganizations = useAuthStore(
    (state) => state.canUseMemberOrganizations
  );

  useEffect(() => {
    if (!sessionReady || sessionQuery.isLoading) return;
    if (!canUseMemberOrganizations) {
      router.replace("/dashboard");
    }
  }, [
    canUseMemberOrganizations,
    router,
    sessionQuery.isLoading,
    sessionReady,
  ]);

  if (!sessionReady || sessionQuery.isLoading || !canUseMemberOrganizations) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white p-8">
        <ThemeLoader label="Loading…" size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F3D]">
            Join organization
          </h1>
          <p className="mt-1 text-sm text-[#557393]">
            Add another organization to your account. You can switch between them
            from the sidebar.
          </p>
        </div>
        <RefetchButton
          onClick={() => sessionQuery.refetch()}
          isRefreshing={sessionQuery.isFetching && !sessionQuery.isLoading}
        />
      </div>
      <JoinOrganizationPanel />
    </div>
  );
}
