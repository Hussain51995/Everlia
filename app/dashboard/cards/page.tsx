"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useCards,
} from "@/hooks/cards";
import { CARD_STATUS_LABELS, type GreetingCardStatus } from "@/lib/types/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { ApiClientError } from "@/lib/api/client";

const STATUS_COLORS: Partial<Record<GreetingCardStatus, string>> = {
  draft: "bg-slate-100 text-slate-700",
  ready_to_send: "bg-sky-100 text-sky-800",
  submitted: "bg-indigo-100 text-indigo-800",
  processing: "bg-amber-100 text-amber-800",
  mailed: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  qr_scanned: "bg-violet-100 text-violet-800",
  response_received: "bg-teal-100 text-teal-800",
};

export default function CardsListPage() {
  const { data: cards, isLoading, error, refetch, isFetching } = useCards();
  const [filter, setFilter] = useState<"all" | "draft" | "sent">("all");

  const filtered = useMemo(() => {
    if (!cards) return [];
    if (filter === "draft") {
      return cards.filter((c) => c.status === "draft" || c.status === "ready_to_send");
    }
    if (filter === "sent") {
      return cards.filter(
        (c) => c.status !== "draft" && c.status !== "ready_to_send"
      );
    }
    return cards;
  }, [cards, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F3D]">My Cards</h1>
          <p className="mt-1 text-sm text-[#557393]">
            Track drafts, mail status, QR scans, and responses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefetchButton
            onClick={() => refetch()}
            isRefreshing={isFetching && !isLoading}
          />
          <Link
            href="/dashboard/templates"
            className="inline-flex items-center justify-center rounded-xl bg-[#38B2D1] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#38B2D1]/20 hover:bg-[#2ca0be]"
          >
            Send a Card
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "draft", "sent"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
              filter === f
                ? "bg-[#0B1F3D] text-white"
                : "border border-[#C4EBF2] bg-white text-[#557393]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16">
          <ThemeLoader label="Loading cards…" size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error instanceof ApiClientError ? error.message : "Failed to load cards"}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#C4EBF2] bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#0B1F3D]">No cards yet</p>
          <Link
            href="/dashboard/templates"
            className="mt-3 inline-block text-xs font-bold text-[#38B2D1] hover:underline"
          >
            Browse templates
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#C4EBF2] bg-[#F0FAFC] text-[11px] uppercase tracking-wider text-[#557393]">
              <tr>
                <th className="px-4 py-3 font-bold">Recipient</th>
                <th className="px-4 py-3 font-bold">Template</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => {
                const customer = card.customer as
                  | { first_name?: string; last_name?: string }
                  | null
                  | undefined;
                const template = card.template as
                  | { name?: string }
                  | null
                  | undefined;
                return (
                  <tr
                    key={card.id}
                    className="border-b border-[#EEF6F8] last:border-0 hover:bg-[#F8FCFD]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/cards/${card.id}`}
                        className="font-bold text-[#0B1F3D] hover:text-[#38B2D1]"
                      >
                        {[customer?.first_name, customer?.last_name]
                          .filter(Boolean)
                          .join(" ") || "Recipient"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#557393]">
                      {template?.name ?? "Template"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          STATUS_COLORS[card.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {CARD_STATUS_LABELS[card.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#557393]">
                      {card.updated_at
                        ? new Date(card.updated_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
