"use client";

import Link from "next/link";
import { useResponses } from "@/hooks/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { ApiClientError } from "@/lib/api/client";

const TYPE_LABELS = {
  thank: "Thank you",
  message: "Message",
  contact_request: "Contact request",
} as const;

export default function ResponsesPage() {
  const { data: responses, isLoading, error, refetch, isFetching } = useResponses();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F3D]">
            Customer Responses
          </h1>
          <p className="mt-1 text-sm text-[#557393]">
            Conversations started from QR codes on your greeting cards.
          </p>
        </div>
        <RefetchButton
          onClick={() => refetch()}
          isRefreshing={isFetching && !isLoading}
        />
      </div>

      {isLoading ? (
        <div className="py-16">
          <ThemeLoader label="Loading responses…" size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error instanceof ApiClientError
            ? error.message
            : "Failed to load responses"}
        </div>
      ) : (responses ?? []).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#C4EBF2] bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#0B1F3D]">No responses yet</p>
          <p className="mt-1 text-xs text-[#557393]">
            When a customer scans a card QR and replies, it will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(responses ?? []).map((response) => {
            const customer = response.customer as
              | { first_name?: string; last_name?: string }
              | null
              | undefined;
            const card = response.greeting_card as
              | {
                  id?: string;
                  template?: { name?: string } | null;
                }
              | null
              | undefined;

            return (
              <article
                key={response.id}
                className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold text-[#0B1F3D]">
                      {[customer?.first_name, customer?.last_name]
                        .filter(Boolean)
                        .join(" ") || "Customer"}
                    </div>
                    <div className="mt-0.5 text-xs text-[#557393]">
                      {card?.template?.name ?? "Greeting card"} ·{" "}
                      {TYPE_LABELS[response.response_type]}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-[#557393]">
                    {response.created_at
                      ? new Date(response.created_at).toLocaleString()
                      : ""}
                  </div>
                </div>
                {response.message ? (
                  <p className="mt-3 text-sm leading-relaxed text-[#0B1F3D]">
                    “{response.message}”
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[#557393]">
                    {response.response_type === "thank"
                      ? "Sent appreciation."
                      : response.response_type === "contact_request"
                        ? "Asked to be contacted."
                        : "No message provided."}
                  </p>
                )}
                {card?.id ? (
                  <Link
                    href={`/dashboard/cards/${card.id}`}
                    className="mt-3 inline-block text-xs font-bold text-[#38B2D1] hover:underline"
                  >
                    View card →
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
