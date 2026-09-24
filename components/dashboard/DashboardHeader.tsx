"use client";

import { useState } from "react";
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  PlusIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  MailIcon,
} from "@/components/ui/Icons";

interface DashboardHeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenQuickCampaign: () => void;
}

export function DashboardHeader({ onOpenMobileSidebar, onOpenQuickCampaign }: DashboardHeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const NOTIFICATIONS = [
    {
      id: 1,
      title: "QR Code Scanned!",
      desc: "Client Michael Vance scanned postcard for 742 Evergreen Terr.",
      time: "10 mins ago",
      type: "scan",
    },
    {
      id: 2,
      title: "Direct Mail Delivered",
      desc: "Batch #410 (45 Home Anniversary Cards) delivered by USPS.",
      time: "1 hour ago",
      type: "mail",
    },
    {
      id: 3,
      title: "Valuation Request",
      desc: "Emma Thompson requested updated home valuation via QR portal.",
      time: "3 hours ago",
      type: "lead",
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#C4EBF2] bg-white/90 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] text-[#0B1F3D] hover:bg-white lg:hidden"
          aria-label="Toggle mobile menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-base font-extrabold text-[#0B1F3D]">CRM Overview</h2>
          <p className="text-[11px] text-[#557393]">Real estate client retention & campaign metrics</p>
        </div>
      </div>

      <div className="mx-4 flex-1 max-w-md">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#557393]">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts, properties, or mail tracking ID..."
            className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-2 pl-9 pr-12 text-xs font-medium text-[#0B1F3D] outline-none transition-all placeholder:text-[#557393]/60 focus:border-[#38B2D1] focus:bg-white focus:ring-4 focus:ring-[#38B2D1]/15"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden rounded-md border border-[#C4EBF2] bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#557393] sm:inline-block">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenQuickCampaign}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#38B2D1] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-[#38B2D1]/20 transition-all hover:bg-[#2ca0be]"
        >
          <PlusIcon className="h-4 w-4" />
          <span>New Postcard</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] text-[#0B1F3D] transition-colors hover:bg-white"
            aria-label="Notifications"
          >
            <BellIcon className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-3xl border border-[#C4EBF2] bg-white p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#C4EBF2]">
                <div className="text-xs font-extrabold text-[#0B1F3D]">Notifications</div>
                <span className="rounded-full bg-[#38B2D1]/10 px-2 py-0.5 text-[10px] font-bold text-[#38B2D1]">
                  3 New
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 rounded-2xl bg-[#F0FAFC] p-2.5 transition-colors hover:bg-[#E2F5F8]"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#38B2D1] text-white">
                      {n.type === "scan" ? (
                        <SparklesIcon className="h-4 w-4" />
                      ) : n.type === "mail" ? (
                        <MailIcon className="h-4 w-4" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-xs font-bold text-[#0B1F3D]">{n.title}</div>
                      <div className="mt-0.5 text-[11px] text-[#557393] leading-snug">{n.desc}</div>
                      <div className="mt-1 text-[9px] font-medium text-[#38B2D1]">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] p-1 pr-2.5">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
            alt="User"
            className="h-7 w-7 rounded-lg object-cover"
          />
          <span className="hidden md:inline-block text-xs font-bold text-[#0B1F3D]">Sarah J.</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-[#557393]" />
        </div>
      </div>
    </header>
  );
}
