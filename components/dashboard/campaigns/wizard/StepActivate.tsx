"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FreeTestingBanner } from "@/components/dashboard/campaigns/FreeTestingBanner";
import { InfoBanner } from "@/components/dashboard/campaigns/shared";
import { apiClient } from "@/lib/api/client";
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
  const organizationId = useAuthStore((s) => s.activeOrganizationId);
  const role = membership?.role;
  const isAdmin =
    role === "owner" || role === "admin" || role === "org_admin";
  const customerIds = useCampaignWizardStore((s) => s.customerIds);
  const mailingMode = useCampaignWizardStore((s) => s.mailingMode);
  const setMailingMode = useCampaignWizardStore((s) => s.setMailingMode);

  const { data: capabilities } = useQuery({
    queryKey: ["campaign-mailing-capabilities", organizationId],
    enabled: Boolean(organizationId),
    queryFn: () =>
      apiClient<{
        liveMailEnabled: boolean;
        workerModes: Array<"test" | "live">;
        note: string;
      }>("/api/campaigns/mailing-capabilities"),
  });

  const liveEnabled = capabilities?.liveMailEnabled === true;

  useEffect(() => {
    if (capabilities && !liveEnabled && mailingMode === "live") {
      setMailingMode("test");
    }
  }, [capabilities, liveEnabled, mailingMode, setMailingMode]);

  return (
    <div className="space-y-4">
      {mailingMode === "test" ? (
        <FreeTestingBanner enrolledCustomerCount={customerIds.length} />
      ) : (
        <InfoBanner tone="warning">
          <strong>Live mailing</strong> will submit real PostGrid live postage
          when due mailings are processed. Confirm addresses and artwork before
          activating.
        </InfoBanner>
      )}

      {liveEnabled ? (
        <div className="rounded-2xl border border-[#C4EBF2] bg-white p-4">
          <p className="text-sm font-bold text-[#0B1F3D]">Mailing mode</p>
          <p className="mt-1 text-xs text-[#557393]">
            Live mode is available because campaign live mail is enabled on this
            environment.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: "test" as const, label: "Test (sandbox)" },
                { id: "live" as const, label: "Live (real postage)" },
              ] as const
            ).map((option) => {
              const active = mailingMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMailingMode(option.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? option.id === "live"
                        ? "border-amber-500 bg-amber-50 text-amber-900"
                        : "border-[#38B2D1] bg-[#F0FAFC] text-[#0B1F3D]"
                      : "border-[#C4EBF2] text-[#557393] hover:bg-[#F8FBFC]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <InfoBanner tone="info">
        {mailingMode === "live" ? (
          <>
            Activation creates the durable mailing schedule in{" "}
            <strong>live</strong> mode. When the cron worker runs due mailings,
            PostGrid <strong>live</strong> postage may be charged.
          </>
        ) : (
          <>
            Activation creates the durable mailing schedule in{" "}
            <strong>test</strong> mode and starts the campaign lifecycle. Usage
            is tracked for enrolled customers, scheduled cards, artworks, and
            test mailings — with <strong>$0</strong> platform charges. It does
            not submit live postage.
          </>
        )}
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
          Confirm below to save the campaign and activate scheduling.
          {mailingMode === "live"
            ? " Live postage requires a production PostGrid key."
            : " Future paid budgets and payment collection are not enabled in this phase."}
        </p>
      )}
    </div>
  );
}
