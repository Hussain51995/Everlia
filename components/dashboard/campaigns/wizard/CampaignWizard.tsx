"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiClientError } from "@/lib/api/client";
import { useCreateCampaign } from "@/hooks/campaigns";
import { useToast } from "@/components/ui/Toast";
import {
  primaryButtonClass,
  secondaryButtonClass,
  WizardShell,
} from "@/components/dashboard/campaigns/shared";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import { StepDesign } from "@/components/dashboard/campaigns/wizard/StepDesign";
import { StepCustomers } from "@/components/dashboard/campaigns/wizard/StepCustomers";
import { StepDuration } from "@/components/dashboard/campaigns/wizard/StepDuration";
import { StepOccasions } from "@/components/dashboard/campaigns/wizard/StepOccasions";
import { StepReview } from "@/components/dashboard/campaigns/wizard/StepReview";
import { StepActivate } from "@/components/dashboard/campaigns/wizard/StepActivate";

const TITLES: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Select design",
    subtitle: "Pick a reusable master design for this campaign.",
  },
  2: {
    title: "Select customers",
    subtitle: "Choose who should receive automated cards.",
  },
  3: {
    title: "Campaign duration",
    subtitle: "Name the campaign and set an inclusive date window.",
  },
  4: {
    title: "Configure occasions",
    subtitle: "Define the occasions you'll send to clients for scheduling.",
  },
  5: {
    title: "Review campaign",
    subtitle: "Dry-run preview of schedule, volume, and warnings.",
  },
  6: {
    title: "Activate",
    subtitle: "Start the scheduling lifecycle in free test mode.",
  },
};

export function CampaignWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const createCampaign = useCreateCampaign();

  const step = useCampaignWizardStore((s) => s.step);
  const setStep = useCampaignWizardStore((s) => s.setStep);
  const templateId = useCampaignWizardStore((s) => s.templateId);
  const setTemplateId = useCampaignWizardStore((s) => s.setTemplateId);
  const customerIds = useCampaignWizardStore((s) => s.customerIds);
  const name = useCampaignWizardStore((s) => s.name);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const timezone = useCampaignWizardStore((s) => s.timezone);
  const occasions = useCampaignWizardStore((s) => s.occasions);
  const includeCompanyLogo = useCampaignWizardStore((s) => s.includeCompanyLogo);
  const reset = useCampaignWizardStore((s) => s.reset);

  const [durationError, setDurationError] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("templateId");
    if (fromQuery && fromQuery !== templateId) {
      setTemplateId(fromQuery);
      if (step === 1) setStep(2);
    }
  }, [searchParams, templateId, setTemplateId, step, setStep]);

  const goBack = () => {
    if (step === 1) {
      router.push("/dashboard/campaigns");
      return;
    }
    setStep((step - 1) as 1 | 2 | 3 | 4 | 5 | 6);
  };

  const validateAndNext = () => {
    setDurationError(null);
    if (step === 1 && !templateId) {
      showToast({ tone: "error", title: "Select a design to continue" });
      return;
    }
    if (step === 2 && customerIds.length === 0) {
      showToast({ tone: "error", title: "Select at least one customer" });
      return;
    }
    if (step === 3) {
      if (!name.trim()) {
        setDurationError("Campaign name is required");
        return;
      }
      if (!startDate || !endDate) {
        setDurationError("Start and end dates are required");
        return;
      }
      if (startDate > endDate) {
        setDurationError("Start date must be on or before end date");
        return;
      }
    }
    if (step === 4 && !occasions.some((o) => o.isEnabled)) {
      showToast({
        tone: "error",
        title: "Enable at least one occasion",
      });
      return;
    }
    setStep((step + 1) as 1 | 2 | 3 | 4 | 5 | 6);
  };

  const saveDraft = async (activate: boolean) => {
    if (!templateId) return;
    setActivateError(null);

    const enabled = occasions.filter((o) => o.isEnabled);
    try {
      const result = await createCampaign.mutateAsync({
        name: name.trim(),
        defaultTemplateId: templateId,
        startDate,
        endDate,
        timezone,
        mailingMode: "test",
        customerIds,
        occasions: enabled.map((o) => ({
          occasionId: o.occasionId,
          occasionSlug: o.occasionSlug,
          customName: o.customName,
          occurrenceDate: o.occurrenceDate,
          leadDays: o.leadDays,
          messageTemplate: o.messageTemplate ?? null,
          isEnabled: true,
          excludedCustomerIds: o.excludedCustomerIds,
        })),
        configuration: {
          includeCompanyLogo,
        },
        activate,
      });

      reset();
      showToast({
        tone: "success",
        title: activate ? "Campaign activated" : "Draft saved",
        description: activate
          ? "Scheduling is live in test mode. No physical mail was sent."
          : undefined,
      });
      router.push(`/dashboard/campaigns/${result.campaign.id}`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not save campaign";
      setActivateError(message);
      showToast({ tone: "error", title: "Campaign failed", description: message });
    }
  };

  const meta = TITLES[step];

  return (
    <WizardShell
      title={meta.title}
      subtitle={meta.subtitle}
      step={step}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={goBack}>
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            {step === 6 ? (
              <>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={createCampaign.isPending}
                  onClick={() => saveDraft(false)}
                >
                  Save draft only
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={createCampaign.isPending}
                  onClick={() => saveDraft(true)}
                >
                  {createCampaign.isPending
                    ? "Working…"
                    : "Activate campaign"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={validateAndNext}
              >
                Continue
              </button>
            )}
          </div>
        </>
      }
    >
      {step === 1 ? <StepDesign /> : null}
      {step === 2 ? <StepCustomers /> : null}
      {step === 3 ? <StepDuration error={durationError} /> : null}
      {step === 4 ? <StepOccasions /> : null}
      {step === 5 ? <StepReview /> : null}
      {step === 6 ? (
        <StepActivate
          error={activateError}
          activating={createCampaign.isPending}
        />
      ) : null}
    </WizardShell>
  );
}
