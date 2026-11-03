"use client";

import { Suspense } from "react";
import { CampaignWizard } from "@/components/dashboard/campaigns/wizard/CampaignWizard";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center">
          <ThemeLoader label="Loading wizard…" />
        </div>
      }
    >
      <CampaignWizard />
    </Suspense>
  );
}
