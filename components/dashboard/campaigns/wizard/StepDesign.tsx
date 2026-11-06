"use client";

import { useEffect, useState } from "react";
import { useCampaignEligibleTemplates } from "@/hooks/campaigns";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { apiClient } from "@/lib/api/client";
import type { OrganizationBranding } from "@/lib/types/cards";

export function StepDesign() {
  const { data: templates, isLoading } = useCampaignEligibleTemplates();
  const templateId = useCampaignWizardStore((s) => s.templateId);
  const setTemplateId = useCampaignWizardStore((s) => s.setTemplateId);
  const includeCompanyLogo = useCampaignWizardStore((s) => s.includeCompanyLogo);
  const setIncludeCompanyLogo = useCampaignWizardStore(
    (s) => s.setIncludeCompanyLogo
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLogoLoading(true);
    apiClient<{ branding: OrganizationBranding }>("/api/organization/branding")
      .then((data) => {
        if (!cancelled) setLogoUrl(data.branding.logo_url?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setLogoUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLogoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!logoUrl && includeCompanyLogo) {
      setIncludeCompanyLogo(false);
    }
  }, [logoUrl, includeCompanyLogo, setIncludeCompanyLogo]);

  if (isLoading) {
    return (
      <div className="grid min-h-[180px] place-items-center">
        <ThemeLoader label="Loading designs…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
              <img
                src={thumb}
                alt=""
                className="aspect-[5/3] w-full bg-[#F0FAFC] object-cover"
              />
              <div className="p-3">
                <p className="text-sm font-bold text-[#0B1F3D]">
                  {template.name}
                </p>
                <p className="text-xs text-[#557393]">
                  Text-free master — filled when events send
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4">
        {logoLoading ? (
          <p className="text-xs text-[#557393]">Checking branding…</p>
        ) : logoUrl ? (
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={includeCompanyLogo}
              onChange={(e) => setIncludeCompanyLogo(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#C4EBF2] text-[#38B2D1] focus:ring-[#38B2D1]"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg border border-[#C4EBF2] bg-white object-contain p-0.5"
                />
                <span>
                  <span className="block text-sm font-bold text-[#0B1F3D]">
                    Add organization logo on the back
                  </span>
                  <span className="mt-0.5 block text-xs text-[#557393]">
                    When enabled, mailings place your saved logo next to the QR
                    code.
                  </span>
                </span>
              </span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-[#557393]">
            No organization logo is set yet.{" "}
            <a
              href="/dashboard/settings/branding"
              className="font-bold text-[#38B2D1] hover:underline"
            >
              Add one in branding settings
            </a>{" "}
            to enable adding it on cards.
          </p>
        )}
      </div>
    </div>
  );
}
