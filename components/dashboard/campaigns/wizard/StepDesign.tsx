"use client";

import { useCampaignEligibleTemplates } from "@/hooks/campaigns";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

export function StepDesign() {
  const { data: templates, isLoading } = useCampaignEligibleTemplates();
  const templateId = useCampaignWizardStore((s) => s.templateId);
  const setTemplateId = useCampaignWizardStore((s) => s.setTemplateId);

  if (isLoading) {
    return (
      <div className="grid min-h-[180px] place-items-center">
        <ThemeLoader label="Loading designs…" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(templates ?? []).map((template) => {
        const thumb =
          template.preview_image_url || template.front_background_url;
        const selected = templateId === template.id;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => setTemplateId(template.id)}
            className={`overflow-hidden rounded-2xl border text-left transition-all ${
              selected
                ? "border-[#38B2D1] ring-4 ring-[#38B2D1]/20"
                : "border-[#C4EBF2] hover:border-[#38B2D1]/50"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              className="aspect-[5/3] w-full bg-[#F0FAFC] object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-bold text-[#0B1F3D]">{template.name}</p>
              <p className="text-xs capitalize text-[#557393]">
                {template.category.replace(/_/g, " ")}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
