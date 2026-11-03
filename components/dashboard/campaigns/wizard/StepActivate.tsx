"use client";

import { FreeTestingBanner } from "@/components/dashboard/campaigns/FreeTestingBanner";
import { InfoBanner } from "@/components/dashboard/campaigns/shared";
import { useAuthStore } from "@/stores/auth-store";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";

export function StepActivate({
  error,
  activating,
}: {
  error?: string | null;
  activating?: boolean;
}) {
  const membership = useAuthStore((s) => s.membership);
  const role = membership?.role;
  const isAdmin =
    role === "owner" || role === "admin" || role === "org_admin";
  const customerIds = useCampaignWizardStore((s) => s.customerIds);

  return (
    <div className="space-y-4">
      <FreeTestingBanner enrolledCustomerCount={customerIds.length} />

      <InfoBanner tone="info">
        Activation creates the durable mailing schedule in <strong>test</strong>{" "}
        mode and starts the campaign lifecycle. Usage is tracked for enrolled
        customers, scheduled cards, artworks, and test mailings — with{" "}
        <strong>$0</strong> platform charges. It does not submit live postage.
      </InfoBanner>

      {!isAdmin ? (
        <InfoBanner tone="warning">
          Only organization owners and admins can activate a campaign. You can
          still save a draft from earlier steps via the Campaigns page after
          creating one.
        </InfoBanner>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {activating ? (
        <p className="text-sm font-medium text-[#557393]">
          Creating campaign and activating schedule…
        </p>
      ) : (
        <p className="text-sm text-[#557393]">
          Confirm below to save the campaign and activate scheduling. Future
          paid budgets and payment collection are not enabled in this phase.
        </p>
      )}
    </div>
  );
}
