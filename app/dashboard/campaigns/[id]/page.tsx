"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useActivateCampaign,
  useCancelCampaign,
  useCampaign,
  useCampaignActivity,
  useCampaignArtworkPreview,
  useCampaignMailings,
  useCampaignUsage,
  useDeleteCampaign,
  useExtendCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useUpdateCampaign,
} from "@/hooks/campaigns";
import { FreeTestingBanner } from "@/components/dashboard/campaigns/FreeTestingBanner";
import {
  CardArtworkLightbox,
  type ArtworkLightboxSource,
} from "@/components/dashboard/campaigns/CardArtworkLightbox";
import { ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { TrashIcon } from "@/components/ui/Icons";
import {
  CampaignStatusBadge,
  fieldLabelClass,
  MailingStatusBadge,
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";
import type {
  CampaignMailing,
  CampaignMailingStatus,
} from "@/lib/types/campaigns";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { showToast } = useToast();

  const { data: campaign, isLoading, refetch } = useCampaign(id);
  const {
    data: upcoming,
    isLoading: upcomingLoading,
    isError: upcomingError,
    error: upcomingErr,
    refetch: refetchUpcoming,
  } = useCampaignMailings(id, "upcoming");
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErr,
    refetch: refetchHistory,
  } = useCampaignMailings(id, "history");
  const { data: activity } = useCampaignActivity(id);
  const { data: usagePayload } = useCampaignUsage(id);

  const activate = useActivateCampaign();
  const pause = usePauseCampaign();
  const resume = useResumeCampaign();
  const cancel = useCancelCampaign();
  const deleteCampaign = useDeleteCampaign();
  const extend = useExtendCampaign(id);
  const update = useUpdateCampaign(id);

  const [extendDate, setExtendDate] = useState("");
  const [editName, setEditName] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "history" | "customers" | "activity">(
    "upcoming"
  );
  const [lightbox, setLightbox] = useState<ArtworkLightboxSource | null>(null);
  const samplePreview = useCampaignArtworkPreview();

  const statusCounts = useMemo(
    () => campaign?.mailing_status_counts ?? {},
    [campaign]
  );

  const handleSamplePreview = async (mailing: CampaignMailing) => {
    if (!campaign) return;
    const occasionRel = mailing.campaign_occasion?.occasion;
    const occasion = Array.isArray(occasionRel) ? occasionRel[0] : occasionRel;
    const customerLabel = mailing.customer
      ? `${mailing.customer.first_name} ${mailing.customer.last_name}`
      : "Customer";

    try {
      const result = await samplePreview.mutateAsync({
        mailingId: mailing.id,
        templateId: mailing.template_id || campaign.default_template_id,
        customerId: mailing.customer_id,
        occasionSlug: occasion?.slug,
        occasionName: occasion?.name,
        messageTemplateOverride:
          mailing.campaign_occasion?.message_template ?? null,
        campaignName: campaign.name,
        customerLabel,
        includeCompanyLogo:
          (campaign.configuration as Record<string, unknown> | null)
            ?.includeCompanyLogo === true,
      });

      setLightbox({
        title: customerLabel,
        subtitle: `Sample · ${mailing.occasion_date} · send ${mailing.send_on}`,
        frontUrl: `data:image/png;base64,${result.artwork.frontPngBase64}`,
        backUrl: `data:image/png;base64,${result.artwork.backPngBase64}`,
        isSample: true,
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Sample preview failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : "Could not compose a sample card.",
      });
    }
  };

  const runAction = async (
    label: string,
    fn: () => Promise<unknown>
  ) => {
    try {
      await fn();
      showToast({ tone: "success", title: label });
      await refetch();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Action failed",
        description:
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unknown error",
      });
    }
  };

  if (isLoading || !campaign) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white">
        <ThemeLoader label="Loading campaign…" />
      </div>
    );
  }

  const enrolled =
    campaign.customers?.filter((c) => c.status === "enrolled") ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/campaigns"
              className="text-xs font-bold text-[#38B2D1] hover:underline"
            >
              ← All campaigns
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-[#0B1F3D]">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-[#557393]">
              {campaign.start_date} → {campaign.end_date} · {campaign.timezone}
            </p>
            <p className="mt-1 text-xs text-[#557393]">
              Campaign status is separate from mailing job status. Mode:{" "}
              <span className="font-bold capitalize">
                {campaign.mailing_mode.replace("_", " ")}
              </span>{" "}
              · Billing:{" "}
              <span className="font-bold">
                {campaign.billing?.billing_mode ?? "waived"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {campaign.status === "draft" ? (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={activate.isPending}
                onClick={() =>
                  runAction("Campaign activated", () =>
                    activate.mutateAsync(id)
                  )
                }
              >
                Activate
              </button>
            ) : null}
            {campaign.status === "active" ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={pause.isPending}
                onClick={() =>
                  runAction("Campaign paused", () => pause.mutateAsync(id))
                }
              >
                Pause
              </button>
            ) : null}
            {campaign.status === "paused" ? (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={resume.isPending}
                onClick={() =>
                  runAction("Campaign resumed", () => resume.mutateAsync(id))
                }
              >
                Resume
              </button>
            ) : null}
            {campaign.status === "active" || campaign.status === "paused" ? (
              <button
                type="button"
                className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  setConfirmDelete(false);
                  setConfirmCancel(true);
                }}
              >
                Cancel
              </button>
            ) : null}
            {campaign.status === "draft" ||
            campaign.status === "scheduled" ||
            campaign.status === "cancelled" ||
            campaign.status === "completed" ? (
              <button
                type="button"
                className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  setConfirmCancel(false);
                  setConfirmDelete(true);
                }}
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <FreeTestingBanner
            estimatedCardCount={usagePayload?.usage.cardsScheduled}
            enrolledCustomerCount={usagePayload?.usage.enrolledCustomers}
          />
          {usagePayload?.usage ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {(
                [
                  ["Scheduled", usagePayload.usage.cardsScheduled],
                  ["Artworks", usagePayload.usage.artworksGenerated],
                  ["Test mail", usagePayload.usage.testMailings],
                  ["Live mail", usagePayload.usage.liveMailings],
                  ["Failed", usagePayload.usage.failedMailings],
                  ["Skipped", usagePayload.usage.skippedMailings],
                  ["Planned", usagePayload.usage.plannedMailings],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
                    {label}
                  </p>
                  <p className="text-lg font-black text-[#0B1F3D]">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {confirmCancel ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-900">
              Cancel this campaign?
            </p>
            <p className="mt-1 text-xs text-rose-800">
              Future uncommitted mailings will be skipped. Submitted mail is not
              undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white"
                disabled={cancel.isPending}
                onClick={() =>
                  runAction("Campaign cancelled", async () => {
                    await cancel.mutateAsync(id);
                    setConfirmCancel(false);
                  })
                }
              >
                Confirm cancel
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfirmCancel(false)}
              >
                Keep campaign
              </button>
            </div>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-900">
              Delete this campaign permanently?
            </p>
            <p className="mt-1 text-xs text-rose-800">
              This removes the campaign and its schedule from your workspace.
              This cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white"
                disabled={deleteCampaign.isPending}
                onClick={async () => {
                  try {
                    await deleteCampaign.mutateAsync(id);
                    showToast({
                      tone: "success",
                      title: "Campaign deleted",
                    });
                    router.push("/dashboard/campaigns");
                  } catch (error) {
                    showToast({
                      tone: "error",
                      title: "Delete failed",
                      description:
                        error instanceof ApiClientError
                          ? error.message
                          : error instanceof Error
                            ? error.message
                            : "Unknown error",
                    });
                  }
                }}
              >
                {deleteCampaign.isPending ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfirmDelete(false)}
              >
                Keep campaign
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
                {status.replace(/_/g, " ")}
              </p>
              <p className="text-lg font-black text-[#0B1F3D]">{count}</p>
            </div>
          ))}
          {!Object.keys(statusCounts).length ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-[#C4EBF2] px-3 py-2 text-xs text-[#557393] sm:col-span-4">
              No durable mailings yet — activate to generate the schedule.
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-3xl border border-[#C4EBF2] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap gap-2 border-b border-[#C4EBF2] pb-3">
              {(
                [
                  ["upcoming", "Upcoming mailings"],
                  ["history", "Mailing history"],
                  ["customers", "Enrollment"],
                  ["activity", "Activity"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    tab === key
                      ? "bg-[#0B1F3D] text-white"
                      : "bg-[#F0FAFC] text-[#557393]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === "upcoming" ? (
                upcomingLoading ? (
                  <div className="py-8">
                    <ThemeLoader label="Loading upcoming mailings…" />
                  </div>
                ) : upcomingError ? (
                  <MailingsLoadError
                    message={
                      upcomingErr instanceof ApiClientError
                        ? upcomingErr.message
                        : "Could not load upcoming mailings."
                    }
                    onRetry={() => void refetchUpcoming()}
                  />
                ) : (
                  <MailingsTable
                    rows={upcoming ?? []}
                    empty={
                      campaign.status === "draft"
                        ? "No upcoming mailings yet — activate this campaign to generate the schedule."
                        : (statusCounts.planned ?? 0) > 0
                          ? "Planned mailings exist but could not be listed. Try refresh."
                          : (history?.length ?? 0) > 0
                            ? "No upcoming mailings. Check History for skipped or already-sent jobs."
                            : "No upcoming mailings. Confirm enrolled customers, enabled occasions, and that milestone dates fall inside the campaign window."
                    }
                    templateId={campaign.default_template_id}
                    campaignName={campaign.name}
                    sampleLoadingId={
                      samplePreview.isPending
                        ? (
                            samplePreview.variables as
                              | { mailingId?: string }
                              | undefined
                          )?.mailingId ?? null
                        : null
                    }
                    onOpenArtwork={setLightbox}
                    onSamplePreview={(mailing) =>
                      void handleSamplePreview(mailing)
                    }
                  />
                )
              ) : null}
              {tab === "history" ? (
                historyLoading ? (
                  <div className="py-8">
                    <ThemeLoader label="Loading mailing history…" />
                  </div>
                ) : historyError ? (
                  <MailingsLoadError
                    message={
                      historyErr instanceof ApiClientError
                        ? historyErr.message
                        : "Could not load mailing history."
                    }
                    onRetry={() => void refetchHistory()}
                  />
                ) : (
                  <MailingsTable
                    rows={history ?? []}
                    empty="No mailing history yet."
                    templateId={campaign.default_template_id}
                    campaignName={campaign.name}
                    sampleLoadingId={
                      samplePreview.isPending
                        ? (
                            samplePreview.variables as
                              | { mailingId?: string }
                              | undefined
                          )?.mailingId ?? null
                        : null
                    }
                    onOpenArtwork={setLightbox}
                    onSamplePreview={(mailing) =>
                      void handleSamplePreview(mailing)
                    }
                  />
                )
              ) : null}
              {tab === "customers" ? (
                <div className="space-y-2">
                  {enrolled.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-2xl border border-[#C4EBF2] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0B1F3D]">
                          {row.customer
                            ? `${row.customer.first_name} ${row.customer.last_name}`
                            : row.customer_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-[#557393]">
                          Enrolled {new Date(row.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-emerald-700">
                        {row.status}
                      </span>
                    </div>
                  ))}
                  {!enrolled.length ? (
                    <p className="text-sm text-[#557393]">No enrolled customers.</p>
                  ) : null}
                </div>
              ) : null}
              {tab === "activity" ? (
                <div className="max-h-[420px] space-y-2 overflow-y-auto">
                  {(activity ?? []).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-[#C4EBF2] px-3 py-2"
                    >
                      <p className="text-xs font-bold uppercase text-[#38B2D1]">
                        {event.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-[#557393]">
                        {new Date(event.created_at).toLocaleString()}
                        {event.from_status
                          ? ` · ${event.from_status} → ${event.to_status}`
                          : ""}
                      </p>
                    </div>
                  ))}
                  {!activity?.length ? (
                    <p className="text-sm text-[#557393]">No activity yet.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-[#C4EBF2] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-bold text-[#0B1F3D]">Edit</h2>
            <p className="mt-1 text-xs text-[#557393]">
              Changes only affect future uncommitted (planned) mailings.
            </p>
            <div className="mt-3">
              <label className={fieldLabelClass}>Campaign name</label>
              <input
                className={textInputClass}
                defaultValue={campaign.name}
                onChange={(e) => setEditName(e.target.value)}
              />
              <button
                type="button"
                className={`${secondaryButtonClass} mt-2 w-full`}
                disabled={update.isPending}
                onClick={() =>
                  runAction("Campaign updated", () =>
                    update.mutateAsync({
                      name: (editName || campaign.name).trim(),
                    })
                  )
                }
              >
                Save name
              </button>
            </div>

            {(campaign.status === "active" || campaign.status === "paused") && (
              <div className="mt-4 border-t border-[#C4EBF2] pt-4">
                <label className={fieldLabelClass}>Extend end date</label>
                <input
                  type="date"
                  className={textInputClass}
                  value={extendDate}
                  min={campaign.end_date}
                  onChange={(e) => setExtendDate(e.target.value)}
                />
                <button
                  type="button"
                  className={`${primaryButtonClass} mt-2 w-full`}
                  disabled={extend.isPending || !extendDate}
                  onClick={() =>
                    runAction("Campaign extended", () =>
                      extend.mutateAsync({ endDate: extendDate })
                    )
                  }
                >
                  Extend window
                </button>
              </div>
            )}

            {campaign.status === "draft" ? (
              <button
                type="button"
                className={`${secondaryButtonClass} mt-4 w-full`}
                onClick={() =>
                  router.push(`/dashboard/campaigns/new?templateId=${campaign.default_template_id}`)
                }
              >
                Open wizard with this design
              </button>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[#C4EBF2] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-bold text-[#0B1F3D]">Occasions</h2>
            <ul className="mt-2 space-y-2">
              {(campaign.occasions ?? []).map((occ) => (
                <li
                  key={occ.id}
                  className="rounded-xl border border-[#C4EBF2] px-3 py-2 text-xs"
                >
                  <p className="font-bold text-[#0B1F3D]">
                    {occ.occasion?.name ?? occ.custom_name ?? "Custom"}
                    {!occ.is_enabled ? " (disabled)" : ""}
                  </p>
                  <p className="text-[#557393]">
                    Lead {occ.lead_days ?? occ.occasion?.default_lead_days ?? 7}{" "}
                    days
                    {occ.occurrence_date ? ` · ${occ.occurrence_date}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {campaign.template ? (
            <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  campaign.template.preview_image_url ||
                  campaign.template.front_background_url
                }
                alt=""
                className="aspect-[5/3] w-full object-cover"
              />
              <p className="p-3 text-sm font-bold text-[#0B1F3D]">
                {campaign.template.name}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <CardArtworkLightbox
        source={lightbox}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

function MailingsLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
      <p className="text-sm font-bold text-rose-900">Could not load mailings</p>
      <p className="mt-1 text-xs text-rose-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}

function MailingsTable({
  rows,
  empty,
  sampleLoadingId,
  onOpenArtwork,
  onSamplePreview,
}: {
  rows: CampaignMailing[];
  empty: string;
  templateId?: string;
  campaignName?: string;
  sampleLoadingId: string | null;
  onOpenArtwork: (source: ArtworkLightboxSource) => void;
  onSamplePreview: (mailing: CampaignMailing) => void;
}) {
  if (!rows.length) {
    return <p className="text-sm text-[#557393]">{empty}</p>;
  }

  return (
    <div className="max-h-[480px] overflow-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="text-[#557393]">
          <tr>
            <th className="pb-2 font-bold">Card</th>
            <th className="pb-2 font-bold">Customer</th>
            <th className="pb-2 font-bold">Occasion</th>
            <th className="pb-2 font-bold">Send on</th>
            <th className="pb-2 font-bold">Status</th>
            <th className="pb-2 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const card = row.greeting_card;
            const frontUrl = card?.front_artwork_url ?? null;
            const backUrl = card?.back_artwork_url ?? null;
            const hasArtwork = Boolean(frontUrl);
            const customerLabel = row.customer
              ? `${row.customer.first_name} ${row.customer.last_name}`
              : "—";
            const loadingSample = sampleLoadingId === row.id;

            return (
              <tr key={row.id} className="border-t border-[#C4EBF2]">
                <td className="py-2 pr-2">
                  {hasArtwork ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenArtwork({
                          title: customerLabel,
                          subtitle: `${row.occasion_date} · send ${row.send_on}`,
                          frontUrl,
                          backUrl,
                          cardId: card?.id,
                        })
                      }
                      className="block h-12 w-[72px] overflow-hidden rounded-lg border border-[#C4EBF2] bg-[#F0FAFC] transition hover:ring-2 hover:ring-[#38B2D1]/40"
                      title="View artwork"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={frontUrl!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="grid h-12 w-[72px] place-items-center rounded-lg border border-dashed border-[#C4EBF2] bg-[#F8FCFD] px-1 text-center text-[9px] font-semibold leading-tight text-[#557393]">
                      Artwork pending
                    </div>
                  )}
                </td>
                <td className="py-2 font-medium text-[#0B1F3D]">
                  {customerLabel}
                </td>
                <td className="py-2">{row.occasion_date}</td>
                <td className="py-2">{row.send_on}</td>
                <td className="py-2">
                  <MailingStatusBadge status={row.status as CampaignMailingStatus} />
                  {row.skip_reason ? (
                    <p className="mt-0.5 text-[10px] text-[#557393]">
                      {row.skip_reason}
                    </p>
                  ) : null}
                  {!row.skip_reason && row.error_message ? (
                    <p className="mt-0.5 text-[10px] text-[#B45309]">
                      {row.error_message}
                    </p>
                  ) : null}
                </td>
                <td className="py-2">
                  <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                    {hasArtwork ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenArtwork({
                              title: customerLabel,
                              subtitle: `${row.occasion_date} · send ${row.send_on}`,
                              frontUrl,
                              backUrl,
                              cardId: card?.id,
                            })
                          }
                          className="text-[11px] font-bold text-[#38B2D1] hover:underline"
                        >
                          Preview
                        </button>
                        {card?.id ? (
                          <Link
                            href={`/dashboard/cards/${card.id}`}
                            className="text-[11px] font-bold text-[#0B1F3D] hover:underline"
                          >
                            View card
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={loadingSample}
                        onClick={() => onSamplePreview(row)}
                        className="text-[11px] font-bold text-[#38B2D1] hover:underline disabled:opacity-50"
                      >
                        {loadingSample ? "Composing…" : "Sample preview"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
