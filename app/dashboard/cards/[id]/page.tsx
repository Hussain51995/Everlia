"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCard,
  useCardStatus,
  useDeleteCard,
  useGenerateArtwork,
  useSendCard,
} from "@/hooks/cards";
import { CARD_STATUS_LABELS } from "@/lib/types/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { TrashIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api/client";

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data, isLoading, error, refetch, isFetching } = useCard(id);
  const card = data?.card;
  const respondUrl = data?.respondUrl ?? null;
  const { data: statusData, refetch: refetchStatus } = useCardStatus(id);
  const generateArtwork = useGenerateArtwork();
  const sendCard = useSendCard();
  const deleteCard = useDeleteCard();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="py-16">
        <ThemeLoader label="Loading card…" size="lg" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error instanceof ApiClientError ? error.message : "Card not found"}
      </div>
    );
  }

  const customer = card.customer as
    | {
        first_name: string;
        last_name: string;
        address_line1: string;
        city: string;
        province_or_state: string;
        postal_or_zip: string;
      }
    | null
    | undefined;
  const template = card.template as { name?: string } | null | undefined;
  const canGenerate =
    card.status === "draft" || card.status === "ready_to_send";
  const canSend = card.status === "ready_to_send";
  const canDelete =
    card.status === "draft" || card.status === "ready_to_send";

  const handleGenerate = async () => {
    try {
      await generateArtwork.mutateAsync(card.id);
      showToast({
        tone: "success",
        title: "Artwork ready",
        description: "Print-ready front/back images were generated with your QR.",
      });
    } catch (err) {
      showToast({
        tone: "error",
        title: "Artwork failed",
        description:
          err instanceof ApiClientError ? err.message : "Please try again.",
      });
    }
  };

  const handleSend = async () => {
    try {
      const result = await sendCard.mutateAsync(card.id);
      showToast({
        tone: "success",
        title: "Card submitted",
        description: `Provider ID: ${result.mail.providerMailId}`,
      });
    } catch (err) {
      showToast({
        tone: "error",
        title: "Send failed",
        description:
          err instanceof ApiClientError ? err.message : "Please try again.",
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this card? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await deleteCard.mutateAsync(card.id);
      showToast({
        tone: "success",
        title: "Card deleted",
      });
      router.push("/dashboard/cards");
    } catch (err) {
      showToast({
        tone: "error",
        title: "Delete failed",
        description:
          err instanceof ApiClientError ? err.message : "Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/cards"
            className="text-xs font-bold text-[#38B2D1] hover:underline"
          >
            ← My cards
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-[#0B1F3D]">
            {template?.name ?? "Greeting card"}
          </h1>
          <p className="mt-1 text-sm text-[#557393]">
            To{" "}
            <span className="font-semibold text-[#0B1F3D]">
              {[customer?.first_name, customer?.last_name]
                .filter(Boolean)
                .join(" ")}
            </span>
            {customer
              ? ` · ${customer.address_line1}, ${customer.city}, ${customer.province_or_state} ${customer.postal_or_zip}`
              : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefetchButton
            onClick={() => {
              void refetch();
              void refetchStatus();
            }}
            isRefreshing={isFetching && !isLoading}
          />
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteCard.isPending}
              title="Delete card"
              aria-label="Delete card"
              className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-60"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : null}
          <span className="inline-flex rounded-full bg-[#F0FAFC] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] ring-1 ring-[#C4EBF2]">
            {CARD_STATUS_LABELS[card.status]}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white">
          <div className="border-b border-[#C4EBF2] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#557393]">
            Front
          </div>
          <div className="aspect-[3/2] bg-[#F0FAFC]">
            {card.front_artwork_url ? (
              <img
                src={card.front_artwork_url}
                alt="Front artwork"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-xs text-[#557393]">
                Artwork not generated yet
              </div>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white">
          <div className="border-b border-[#C4EBF2] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#557393]">
            Back
          </div>
          <div className="aspect-[3/2] bg-[#F0FAFC]">
            {card.back_artwork_url ? (
              <img
                src={card.back_artwork_url}
                alt="Back artwork"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-xs text-[#557393]">
                Artwork not generated yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:p-6">
        <h2 className="text-sm font-extrabold text-[#0B1F3D]">Card details</h2>
        <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
          <div className="space-y-1.5">
            <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
              Customer name
            </dt>
            <dd className="text-base font-semibold text-[#0B1F3D]">
              {card.field_values?.customer_name || "—"}
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
              Sender
            </dt>
            <dd className="text-base font-semibold text-[#0B1F3D]">
              {card.field_values?.sender_name || "—"}
              {card.field_values?.sender_title && (
                <span className="ml-2 text-xs font-normal text-[#557393]">
                  {card.field_values.sender_title}
                </span>
              )}
            </dd>
          </div>
          {card.field_values?.phone && (
            <div className="space-y-1.5">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">Phone</dt>
              <dd className="text-sm text-[#0B1F3D]">{card.field_values.phone}</dd>
            </div>
          )}
          {card.field_values?.email_address && (
            <div className="space-y-1.5">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">Email</dt>
              <dd className="text-sm text-[#0B1F3D]">{card.field_values.email_address}</dd>
            </div>
          )}
          {card.field_values?.website && (
            <div className="space-y-1.5">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">Website</dt>
              <dd className="text-sm text-[#38B2D1]">{card.field_values.website}</dd>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
              Message
            </dt>
            <dd className="text-base font-medium leading-relaxed text-[#0B1F3D]">
              {card.field_values?.personal_message || "—"}
            </dd>
          </div>
          {card.field_values?.footer_note && (
            <div className="space-y-1.5 sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">Footer note</dt>
              <dd className="text-xs font-bold uppercase tracking-widest text-[#557393]">{card.field_values.footer_note}</dd>
            </div>
          )}
          {respondUrl ? (
            <div className="space-y-1.5 sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
                QR link
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <a
                  href={respondUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm font-medium text-[#38B2D1] hover:underline"
                >
                  {respondUrl}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(respondUrl);
                      showToast({
                        tone: "success",
                        title: "QR link copied",
                      });
                    } catch {
                      showToast({
                        tone: "error",
                        title: "Copy failed",
                        description: "Could not copy the QR link.",
                      });
                    }
                  }}
                  className="rounded-lg border border-[#C4EBF2] px-2.5 py-1 text-[11px] font-bold text-[#0B1F3D] hover:bg-[#F0FAFC]"
                >
                  Copy
                </button>
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {canGenerate ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateArtwork.isPending}
              className="rounded-xl bg-[#0B1F3D] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {generateArtwork.isPending
                ? "Generating…"
                : card.front_artwork_url
                  ? "Regenerate artwork"
                  : "Generate artwork + QR"}
            </button>
          ) : null}
          {canSend ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sendCard.isPending}
              className="rounded-xl bg-[#38B2D1] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#38B2D1]/20 disabled:opacity-60"
            >
              {sendCard.isPending ? "Sending…" : "Send via mail provider"}
            </button>
          ) : null}
          <Link
            href="/dashboard/responses"
            className="rounded-xl border border-[#C4EBF2] px-4 py-2.5 text-xs font-bold text-[#0B1F3D] hover:bg-[#F0FAFC]"
          >
            View responses
          </Link>
        </div>
      </div>

      {statusData?.latestTransaction ? (
        <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-extrabold text-[#0B1F3D]">
            Mail transaction
          </h2>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
            <div className="space-y-1.5">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
                Provider mail ID
              </dt>
              <dd className="font-mono text-xs text-[#0B1F3D]">
                {statusData.latestTransaction.provider_mail_id || "—"}
              </dd>
            </div>
            <div className="space-y-1.5">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
                Provider status
              </dt>
              <dd className="font-semibold text-[#0B1F3D]">
                {statusData.latestTransaction.provider_status_raw || "—"}
              </dd>
            </div>
            <div className="space-y-1.5">
              <dt className="text-xs font-bold uppercase tracking-wider text-[#557393]">
                Internal status
              </dt>
              <dd className="font-semibold text-[#0B1F3D]">
                {CARD_STATUS_LABELS[statusData.latestTransaction.internal_status]}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
