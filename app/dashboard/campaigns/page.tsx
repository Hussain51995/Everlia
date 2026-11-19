"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCampaigns } from "@/hooks/campaigns";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { SparklesIcon } from "@/components/ui/Icons";
import {
  CampaignStatusBadge,
  fieldLabelClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";
import { StartCampaignDialog } from "@/components/dashboard/campaigns/StartCampaignDialog";
import type { CampaignStatus } from "@/lib/types/campaigns";

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Completed", value: "completed" },
];

export default function CampaignsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: campaigns, isLoading, isFetching, refetch } = useCampaigns({
    status: status || undefined,
    q: q.trim() || undefined,
  });

  const sorted = useMemo(() => campaigns ?? [], [campaigns]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-[#C4EBF2] bg-[#0B1F3D] p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
            <SparklesIcon className="h-3.5 w-3.5" />
            Automated campaigns
          </p>
          <h1 className="mt-1 text-xl font-black sm:text-3xl">Campaigns</h1>
          <p className="mt-1 text-xs text-white/80 sm:text-sm">
            Create, monitor, and manage greeting card journeys. Test mode only —
            no live postage yet.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#38B2D1] px-3.5 py-2.5 text-[11px] font-bold text-white shadow-md shadow-[#38B2D1]/25 transition-all hover:bg-[#2ca0be] sm:w-auto sm:rounded-2xl sm:px-4 sm:text-xs"
          onClick={() => setDialogOpen(true)}
        >
          <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
          Start Campaign
        </button>
      </div>

      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className={fieldLabelClass} htmlFor="campaign-search">
              Search
            </label>
            <input
              id="campaign-search"
              className={textInputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || "all"}
                type="button"
                onClick={() => setStatus(f.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  status === f.value
                    ? "border-[#38B2D1] bg-[#F0FAFC] text-[#0B1F3D]"
                    : "border-[#C4EBF2] text-[#557393] hover:bg-[#F0FAFC]"
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full border border-[#C4EBF2] px-3 py-1.5 text-xs font-bold text-[#557393]"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="grid min-h-[200px] place-items-center">
              <ThemeLoader label="Loading campaigns…" />
            </div>
          ) : !sorted.length ? (
            <div className="rounded-2xl border border-dashed border-[#C4EBF2] px-4 py-10 text-center">
              <p className="text-sm font-bold text-[#0B1F3D]">No campaigns yet</p>
              <p className="mt-1 text-xs text-[#557393]">
                Start a campaign to enroll customers in automated occasions.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#38B2D1] px-3.5 py-2.5 text-[11px] font-bold text-white shadow-md shadow-[#38B2D1]/25 transition-all hover:bg-[#2ca0be] sm:rounded-2xl sm:px-4 sm:text-xs"
                onClick={() => setDialogOpen(true)}
              >
                <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
                Start Campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[#557393]">
                  <tr className="border-b border-[#C4EBF2]">
                    <th className="pb-2 font-bold">Campaign</th>
                    <th className="pb-2 font-bold">Status</th>
                    <th className="pb-2 font-bold">Window</th>
                    <th className="pb-2 font-bold">Customers</th>
                    <th className="pb-2 font-bold">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="cursor-pointer border-b border-[#C4EBF2]/70 hover:bg-[#F0FAFC]/70"
                      onClick={() =>
                        router.push(`/dashboard/campaigns/${campaign.id}`)
                      }
                    >
                      <td className="py-3">
                        <p className="font-bold text-[#0B1F3D]">{campaign.name}</p>
                        <p className="text-xs text-[#557393]">
                          {campaign.template?.name ?? "Design"}
                        </p>
                      </td>
                      <td className="py-3">
                        <CampaignStatusBadge
                          status={campaign.status as CampaignStatus}
                        />
                      </td>
                      <td className="py-3 text-xs text-[#557393]">
                        {campaign.start_date} → {campaign.end_date}
                      </td>
                      <td className="py-3 text-xs font-bold text-[#0B1F3D]">
                        {campaign.enrolled_count ?? "—"}
                      </td>
                      <td className="py-3 text-xs capitalize text-[#557393]">
                        {campaign.mailing_mode.replace("_", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-[#557393]">
          Campaign status (draft / active / paused…) is separate from individual
          mailing job status (planned / skipped / submitted…).{" "}
          <Link href="/dashboard/customers" className="font-bold text-[#38B2D1]">
            Manage milestones
          </Link>
        </p>
      </div>

      <StartCampaignDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
