"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import {
  LayoutDashboardIcon,
  UsersIcon,
  SendIcon,
  ChartIcon,
  CalendarIcon,
  GiftIcon,
  LogOutIcon,
  ChevronRightIcon,
  SparklesIcon,
  CloseIcon,
} from "@/components/ui/Icons";

function SettingsHelperIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboardIcon, badge: null },
  { name: "Clients & Contacts", href: "#clients", icon: UsersIcon, badge: "2,845" },
  { name: "Mail Campaigns", href: "#campaigns", icon: SendIcon, badge: "Active" },
  { name: "Analytics & ROI", href: "#analytics", icon: ChartIcon, badge: null },
  { name: "Automations Calendar", href: "#calendar", icon: CalendarIcon, badge: "12 Pending" },
  { name: "Gifts & Touchpoints", href: "#gifts", icon: GiftIcon, badge: null },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLaunchCampaign: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile, onLaunchCampaign }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#0B1F3D]/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 top-0 z-50 flex w-64 shrink-0 flex-col justify-between border-r border-[#C4EBF2] bg-[#0B1F3D] p-4 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group select-none"
              aria-label="Back to HomeLink website"
            >
              <span className="grid h-9 w-9 place-items-center text-[#38B2D1] sm:h-10 sm:w-10 transition-transform group-hover:scale-105">
                <svg viewBox="0 0 32 32" className="h-full w-full fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.5L16 4.5L28 14.5V26.5C28 27.0523 27.5523 27.5 27 27.5H5C4.44772 27.5 4 27.0523 4 26.5V14.5Z" />
                  <circle cx="16" cy="18" r="3.5" strokeWidth="2" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-[17px] font-extrabold tracking-[-0.03em] text-white">HomeLink™</span>
                <span className="block text-[8px] font-bold tracking-[0.14em] text-[#C4EBF2] uppercase">Clients For Life</span>
              </span>
            </Link>
            <button
              onClick={onCloseMobile}
              className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 lg:hidden"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                onCloseMobile();
                onLaunchCampaign();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] py-3 text-xs font-bold text-white shadow-lg shadow-[#38B2D1]/25 transition-all hover:bg-[#43c5e6] active:scale-[0.98]"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Launch New Campaign</span>
            </button>
          </div>

          <nav className="mt-6 space-y-1.5">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#C4EBF2]/60 mb-2">
              Main Menu
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all ${isActive
                    ? "bg-[#38B2D1] text-white shadow-md shadow-[#38B2D1]/30"
                    : "text-[#C4EBF2]/80 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#38B2D1]"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive
                        ? "bg-white/25 text-white"
                        : "bg-white/10 text-[#C4EBF2]"
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-6 border-t border-white/10">
          <Link
            href="#settings"
            className="flex items-center gap-3 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#C4EBF2]/80 hover:bg-white/10 hover:text-white transition-all"
          >
            <SettingsHelperIcon className="h-4 w-4 text-[#38B2D1]" />
            <span>CRM Preferences</span>
          </Link>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
                  alt="Sarah Jenkins Avatar"
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-[#38B2D1]"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0B1F3D] bg-emerald-500" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">Sarah Jenkins</div>
                <div className="text-[10px] text-[#C4EBF2]/70">Compass Premier</div>
              </div>
            </div>

            <Link
              href="/sign-in"
              title="Sign Out"
              className="grid h-7 w-7 place-items-center rounded-lg text-[#C4EBF2]/70 hover:bg-white/10 hover:text-rose-400 transition-colors"
            >
              <LogOutIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
