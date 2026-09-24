"use client";

import { useState } from "react";
import { SearchIcon, FilterIcon, SparklesIcon, CheckCircleIcon, ClockIcon, SendIcon } from "@/components/ui/Icons";

interface ActivityItem {
  id: string;
  clientName: string;
  avatar: string;
  address: string;
  campaign: string;
  trackingId: string;
  dateSent: string;
  status: "Delivered" | "Scanned QR" | "In Transit" | "Pending Review";
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: "ACT-8921",
    clientName: "Robert & Maria Garcia",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    address: "1420 Highland Ave, Austin TX",
    campaign: "3-Year Home Anniversary Card",
    trackingId: "HL-9048-TX",
    dateSent: "Today at 09:42 AM",
    status: "Scanned QR",
  },
  {
    id: "ACT-8920",
    clientName: "David Miller",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    address: "882 Oakhaven Dr, Austin TX",
    campaign: "Neighborhood Just Sold Postcard",
    trackingId: "HL-9047-TX",
    dateSent: "Yesterday at 04:15 PM",
    status: "Delivered",
  },
  {
    id: "ACT-8919",
    clientName: "Eleanor & James Sterling",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    address: "512 Barton Creek Blvd, Austin TX",
    campaign: "Q3 Market Valuation Report",
    trackingId: "HL-9046-TX",
    dateSent: "Sep 22, 2026",
    status: "In Transit",
  },
  {
    id: "ACT-8918",
    clientName: "Marcus Vance",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    address: "304 Riverside Dr, Austin TX",
    campaign: "Handwritten Birthday Note + Gift Card",
    trackingId: "HL-9045-TX",
    dateSent: "Sep 21, 2026",
    status: "Scanned QR",
  },
  {
    id: "ACT-8917",
    clientName: "Sophia Martinez",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    address: "710 Elmhurst Rd, Austin TX",
    campaign: "Spring Maintenance Checklist",
    trackingId: "HL-9044-TX",
    dateSent: "Sep 20, 2026",
    status: "Pending Review",
  },
];

export function RecentActivityTable() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filteredItems = ACTIVITIES.filter((item) => {
    const matchesSearch =
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      item.address.toLowerCase().includes(search.toLowerCase()) ||
      item.trackingId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ActivityItem["status"]) => {
    switch (status) {
      case "Scanned QR":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#38B2D1]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#38B2D1] border border-[#38B2D1]/30">
            <SparklesIcon className="h-3 w-3" />
            Scanned QR
          </span>
        );
      case "Delivered":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600 border border-emerald-200">
            <CheckCircleIcon className="h-3 w-3" />
            Delivered
          </span>
        );
      case "In Transit":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-600 border border-amber-200">
            <SendIcon className="h-3 w-3" />
            In Transit
          </span>
        );
      case "Pending Review":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 border border-slate-200">
            <ClockIcon className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-md shadow-[#38b2d1]/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#C4EBF2]">
        <div>
          <h3 className="text-base font-extrabold text-[#0B1F3D]">Recent Client Touchpoints</h3>
          <p className="mt-0.5 text-xs text-[#557393]">
            Track delivery status, QR responses & client interactions in real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-1">
            {["All", "Scanned QR", "Delivered", "In Transit"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${filterStatus === st
                  ? "bg-[#38B2D1] text-white shadow-xs"
                  : "text-[#557393] hover:text-[#0B1F3D]"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#C4EBF2] text-[10px] font-extrabold uppercase tracking-wider text-[#557393]">
              <th className="py-3 px-3">Client & Property Address</th>
              <th className="py-3 px-3">Campaign Mailer</th>
              <th className="py-3 px-3">Tracking ID</th>
              <th className="py-3 px-3">Date Dispatched</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C4EBF2]/60">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="group transition-colors hover:bg-[#F0FAFC]"
              >
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.avatar}
                      alt={item.clientName}
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-[#C4EBF2]"
                    />
                    <div>
                      <div className="font-bold text-[#0B1F3D] text-xs sm:text-sm">
                        {item.clientName}
                      </div>
                      <div className="text-[11px] text-[#557393]">{item.address}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 font-semibold text-[#10284D]">
                  {item.campaign}
                </td>
                <td className="py-3.5 px-3 font-mono text-[11px] text-[#38B2D1] font-bold">
                  {item.trackingId}
                </td>
                <td className="py-3.5 px-3 text-[#557393] font-medium">
                  {item.dateSent}
                </td>
                <td className="py-3.5 px-3">{getStatusBadge(item.status)}</td>
                <td className="py-3.5 px-3 text-right">
                  <button className="rounded-xl border border-[#C4EBF2] bg-white px-3 py-1.5 text-[11px] font-bold text-[#0B1F3D] shadow-xs transition-all hover:bg-[#38B2D1] hover:text-white hover:border-[#38B2D1]">
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
