"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  SendIcon,
} from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import type { ActivityItem, ActivityStatus } from "@/lib/dashboard/stats";

type RecentActivityTableProps = {
  activities: ActivityItem[];
  isLoading?: boolean;
};

export function RecentActivityTable({
  activities,
  isLoading = false,
}: RecentActivityTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filteredItems = activities.filter((item) => {
    return filterStatus === "All" || item.status === filterStatus;
  });

  const getStatusBadge = (status: ActivityStatus) => {
    const base =
      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-extrabold";
    switch (status) {
      case "Scanned QR":
        return (
          <span className={`${base} border-[#38B2D1]/30 bg-[#38B2D1]/15 text-[#38B2D1]`}>
            <SparklesIcon className="h-3 w-3 shrink-0" />
            Scanned QR
          </span>
        );
      case "Delivered":
        return (
          <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-600`}>
            <CheckCircleIcon className="h-3 w-3 shrink-0" />
            Delivered
          </span>
        );
      case "In Transit":
        return (
          <span className={`${base} border-amber-200 bg-amber-50 text-amber-600`}>
            <SendIcon className="h-3 w-3 shrink-0" />
            In Transit
          </span>
        );
      case "Pending Review":
        return (
          <span className={`${base} border-slate-200 bg-slate-100 text-slate-600`}>
            <ClockIcon className="h-3 w-3 shrink-0" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5">
      <div className="flex flex-col gap-4 border-b border-[#C4EBF2] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-[#0B1F3D]">
            Recent Client Touchpoints
          </h3>
          <p className="mt-0.5 text-xs text-[#557393]">
            Latest cards, delivery status, and QR activity
          </p>
        </div>

        <div className="flex max-w-full overflow-x-auto pb-0.5">
          <div className="flex shrink-0 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-1">
            {["All", "Scanned QR", "Delivered", "In Transit", "Pending Review"].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filterStatus === st
                      ? "bg-[#38B2D1] text-white shadow-xs"
                      : "text-[#557393] hover:text-[#0B1F3D]"
                  }`}
                >
                  {st === "Pending Review" ? "Pending" : st}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-[200px] place-items-center py-10">
          <ThemeLoader label="Loading activity…" size="md" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="grid min-h-[160px] place-items-center py-10 text-center">
          <p className="text-sm font-semibold text-[#0B1F3D]">
            {activities.length === 0
              ? "No cards yet"
              : "No matching touchpoints"}
          </p>
          <p className="mt-1 text-xs text-[#557393]">
            {activities.length === 0
              ? "Send a card to see recent client activity here."
              : "Try a different status filter."}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#C4EBF2] text-[10px] font-extrabold uppercase tracking-wider text-[#557393]">
                <th className="px-3 py-3">Client &amp; Address</th>
                <th className="px-3 py-3">Campaign Mailer</th>
                <th className="px-3 py-3">Tracking ID</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Status &amp; Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C4EBF2]/60">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-[#F0FAFC]"
                >
                  <td className="px-3 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#38B2D1]/15 text-[11px] font-extrabold text-[#38B2D1] ring-1 ring-[#C4EBF2]">
                        {item.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#0B1F3D] sm:text-sm">
                          {item.clientName}
                        </div>
                        <div className="truncate text-[11px] text-[#557393]">
                          {item.address}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-3.5 font-semibold text-[#10284D]">
                    {item.campaign}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[11px] font-bold text-[#38B2D1]">
                    {item.trackingId}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-medium text-[#557393]">
                    {item.dateSent}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center rounded-xl border border-[#C4EBF2] bg-white px-3 py-1.5 text-[11px] font-bold text-[#0B1F3D] shadow-xs transition-all hover:border-[#38B2D1] hover:bg-[#38B2D1] hover:text-white"
                      >
                        View Card
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
