"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useCampaignEligibleTemplates,
  useCampaignSchedulePreview,
} from "@/hooks/campaigns";
import { useCustomers } from "@/hooks/cards";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import { FreeTestingBanner } from "@/components/dashboard/campaigns/FreeTestingBanner";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

type PreviewResult = {
  upcomingOccasions: Array<{
    occasionName: string;
    occasionDate: string;
    sendOn: string;
    customerId: string;
  }>;
  eligibleCustomerIds: string[];
  skipped: Array<{ occasionName: string; reason: string; detail?: string }>;
  expectedCardCount: number;
};

export function StepReview() {
  const templateId = useCampaignWizardStore((s) => s.templateId);
  const customerIds = useCampaignWizardStore((s) => s.customerIds);
  const name = useCampaignWizardStore((s) => s.name);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const timezone = useCampaignWizardStore((s) => s.timezone);
  const occasions = useCampaignWizardStore((s) => s.occasions);

  const { data: templates } = useCampaignEligibleTemplates();
  const { data: customers } = useCustomers();
  const preview = useCampaignSchedulePreview();

  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  const template = templates?.find((t) => t.id === templateId);
  const enabledOccasions = useMemo(
    () => occasions.filter((o) => o.isEnabled),
    [occasions]
  );

  const occasionSlugs = enabledOccasions
    .map((o) => o.occasionSlug)
    .filter(Boolean) as string[];
  const customCount = enabledOccasions.filter(
    (o) => o.occurrenceDate && o.customName
  ).length;

  const customerKey = customerIds.join(",");
  const occasionKey = `${occasionSlugs.join(",")}|${customCount}`;

  useEffect(() => {
    if (!customerIds.length || (!occasionSlugs.length && !customCount)) {
      setPreviewResult(null);
      return;
    }

    let cancelled = false;
    setPreviewError(null);
    preview.mutate(
      {
        startDate,
        endDate,
        timezone,
        customerIds,
        occasionSlugs,
        customOccasions: enabledOccasions
          .filter((o) => o.occurrenceDate && o.customName)
          .map((o) => ({
            key: o.key,
            name: o.customName || o.name,
            occurrenceDate: o.occurrenceDate!,
            leadDays: o.leadDays,
            excludedCustomerIds: o.excludedCustomerIds,
          })),
        leadDaysByOccasionSlug: Object.fromEntries(
          enabledOccasions
            .filter((o) => o.occasionSlug)
            .map((o) => [o.occasionSlug!, o.leadDays])
        ),
        exclusionsByOccasionSlug: Object.fromEntries(
          enabledOccasions
            .filter((o) => o.occasionSlug && o.excludedCustomerIds.length)
            .map((o) => [o.occasionSlug!, o.excludedCustomerIds])
        ),
      },
      {
        onSuccess: (data) => {
          if (!cancelled) setPreviewResult(data as PreviewResult);
        },
        onError: (err) => {
          if (!cancelled) {
            setPreviewError(
              err instanceof Error ? err.message : "Preview failed"
            );
          }
        },
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerKey, occasionKey, startDate, endDate, timezone]);

  const customerName = (id: string) => {
    const c = customers?.find((x) => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : id.slice(0, 8);
  };

  return (
    <div className="space-y-5">
      <FreeTestingBanner
        estimatedCardCount={previewResult?.expectedCardCount}
        enrolledCustomerCount={customerIds.length}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
            Design
          </p>
          <p className="mt-1 text-sm font-bold text-[#0B1F3D]">
            {template?.name ?? "Not selected"}
          </p>
          {template ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                template.preview_image_url || template.front_background_url
              }
              alt=""
              className="mt-3 aspect-[5/3] w-full rounded-xl object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-3 rounded-2xl border border-[#C4EBF2] p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
              Campaign
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B1F3D]">{name}</p>
            <p className="text-xs text-[#557393]">
              {startDate} → {endDate} · {timezone}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
              Audience
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B1F3D]">
              {customerIds.length} customers
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
              Occasions
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-[#557393]">
              {enabledOccasions.map((o) => (
                <li key={o.key}>
                  {o.name} · {o.leadDays}d lead
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-[#F0FAFC] p-2">
              <p className="font-bold text-[#0B1F3D]">Billing</p>
              <p className="text-[#557393]">Free — no platform charges</p>
            </div>
            <div className="rounded-xl bg-[#F0FAFC] p-2">
              <p className="font-bold text-[#0B1F3D]">Mailing mode</p>
              <p className="text-[#557393]">Test (no physical mail)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#C4EBF2] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#0B1F3D]">
            Upcoming mailing schedule
          </h3>
          {previewResult ? (
            <span className="text-xs font-bold text-[#38B2D1]">
              ~{previewResult.expectedCardCount} cards expected
            </span>
          ) : null}
        </div>
        {preview.isPending ? (
          <div className="mt-4">
            <ThemeLoader label="Building schedule preview…" size="sm" />
          </div>
        ) : previewError ? (
          <p className="mt-3 text-sm text-rose-700">{previewError}</p>
        ) : previewResult ? (
          <div className="mt-3 space-y-4">
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[#557393]">
                  <tr>
                    <th className="py-1 font-bold">Occasion</th>
                    <th className="py-1 font-bold">Date</th>
                    <th className="py-1 font-bold">Send on</th>
                    <th className="py-1 font-bold">Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.upcomingOccasions
                    .slice(0, 40)
                    .map((row, i) => (
                      <tr
                        key={`${row.customerId}-${row.occasionDate}-${i}`}
                        className="border-t border-[#C4EBF2]"
                      >
                        <td className="py-1.5 text-[#0B1F3D]">
                          {row.occasionName}
                        </td>
                        <td className="py-1.5">{row.occasionDate}</td>
                        <td className="py-1.5">{row.sendOn}</td>
                        <td className="py-1.5">
                          {customerName(row.customerId)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {previewResult.skipped.length > 0 ? (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Skipped / warnings ({previewResult.skipped.length})
                </h4>
                <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-[#557393]">
                  {previewResult.skipped.slice(0, 30).map((s, i) => (
                    <li key={i}>
                      {s.occasionName}: {s.reason.replace(/_/g, " ")}
                      {s.detail ? ` — ${s.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#557393]">
            Select customers and occasions to preview the schedule.
          </p>
        )}
      </div>
    </div>
  );
}
