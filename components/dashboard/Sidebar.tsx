"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboardIcon,
  UsersIcon,
  SendIcon,
  ChartIcon,
  GiftIcon,
  LogOutIcon,
  CloseIcon,
  BuildingIcon,
  SparklesIcon,
  PlusIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { useSetActiveOrganization, useSignOut } from "@/hooks/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/Toast";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { ApiClientError } from "@/lib/api/client";

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
  { name: "Campaigns", href: "/dashboard/campaigns", icon: CalendarIcon, badge: null },
  { name: "Messages", href: "/dashboard/messages", icon: SparklesIcon, badge: null },
  { name: "Templates", href: "/dashboard/templates", icon: GiftIcon, badge: null },
  { name: "My Cards", href: "/dashboard/cards", icon: SendIcon, badge: null },
  { name: "Customers", href: "/dashboard/customers", icon: UsersIcon, badge: null },
  { name: "Responses", href: "/dashboard/responses", icon: ChartIcon, badge: null },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onStartCampaign: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  onStartCampaign,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const setActiveOrganization = useSetActiveOrganization();
  const { showToast } = useToast();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const activeOrganizationId = useAuthStore((state) => state.activeOrganizationId);
  const isPlatformAdmin = useAuthStore((state) => state.isPlatformAdmin);
  const canUseMemberOrganizations = useAuthStore(
    (state) => state.canUseMemberOrganizations
  );
  const sessionReady = useAuthStore((state) => state.sessionReady);

  const displayName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const navItems = [
    ...NAV_ITEMS,
    ...(canUseMemberOrganizations
      ? [
          {
            name: "Join organization",
            href: "/dashboard/join-organization",
            icon: PlusIcon,
            badge: null as string | null,
          },
        ]
      : []),
    ...(canUseMemberOrganizations &&
    memberships.some(
      (m) =>
        m.organization_id === activeOrganizationId &&
        m.status === "active" &&
        (m.role === "owner" || m.role === "admin" || m.role === "org_admin")
    )
      ? [
          {
            name: "Pending members",
            href: "/dashboard/members",
            icon: UsersIcon,
            badge: null as string | null,
          },
        ]
      : []),
    ...(isPlatformAdmin
      ? [
          {
            name: "Industries & Orgs",
            href: "/dashboard/admin/organizations",
            icon: BuildingIcon,
            badge: "Admin" as string | null,
          },
        ]
      : []),
  ];

  const handleOrgChange = (organizationId: string) => {
    if (!organizationId || organizationId === activeOrganizationId) return;

    setActiveOrganization.mutate(
      { organizationId },
      {
        onError: (error) => {
          showToast({
            tone: "error",
            title: "Could not switch organization",
            description:
              error instanceof ApiClientError
                ? error.message
                : "Please try again.",
          });
        },
      }
    );
  };

  const labelClass = collapsed ? "lg:hidden" : "";
  const railOnlyClass = collapsed ? "hidden lg:flex" : "hidden";

  return (
    <>
      {setActiveOrganization.isPending ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0B1F3D]/55 backdrop-blur-sm">
          <div className="rounded-3xl border border-[#C4EBF2] bg-white px-8 py-7 shadow-2xl">
            <ThemeLoader label="Switching organization…" size="lg" />
          </div>
        </div>
      ) : null}

      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#0B1F3D]/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 top-0 z-50 flex w-64 shrink-0 flex-col justify-between overflow-visible border-r border-[#C4EBF2] bg-[#0B1F3D] p-4 text-white transition-[width,transform,padding] duration-300 lg:relative lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[72px] lg:p-2.5" : "lg:w-64"}`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute top-[4.75rem] right-0 z-[60] hidden h-7 w-7 translate-x-1/2 place-items-center rounded-full border border-[#C4EBF2] bg-white text-[#0B1F3D] shadow-[0_2px_8px_rgba(11,31,61,0.18)] transition hover:bg-[#F0FAFC] hover:text-[#38B2D1] lg:grid"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative flex items-center justify-center border-b border-white/10 pb-4">
            <Logo variant="white" href="/" height={48} />
            <button
              onClick={onCloseMobile}
              className="absolute right-0 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 lg:hidden"
              aria-label="Close sidebar"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className={`mt-4 space-y-2 ${collapsed ? "lg:mt-8" : ""}`}>
            <button
              type="button"
              title="Start Campaign"
              onClick={() => {
                onCloseMobile();
                onStartCampaign();
              }}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#38B2D1] px-3 py-2.5 text-[11px] font-bold text-white shadow-md shadow-[#38B2D1]/20 transition-all hover:bg-[#43c5e6] active:scale-[0.98] sm:text-xs ${
                collapsed ? "lg:h-10 lg:px-0" : ""
              }`}
            >
              <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
              <span className={labelClass}>Start Campaign</span>
            </button>
            <Link
              href="/dashboard/templates"
              onClick={onCloseMobile}
              title="Send one-off card"
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold text-[#C4EBF2] transition-all hover:bg-white/10 hover:text-white sm:py-2.5 ${
                collapsed ? "lg:h-10 lg:px-0" : ""
              }`}
            >
              <SendIcon className="h-3.5 w-3.5 shrink-0" />
              <span className={labelClass}>Send one-off card</span>
            </Link>
          </div>

          {sessionReady &&
          canUseMemberOrganizations &&
          memberships.length > 0 ? (
            <>
              <div className={`mt-4 space-y-1.5 ${collapsed ? "lg:hidden" : ""}`}>
                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#C4EBF2]/60">
                  Active organization
                </div>
                <select
                  value={activeOrganizationId ?? ""}
                  disabled={setActiveOrganization.isPending}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#38B2D1] disabled:cursor-wait disabled:opacity-60"
                >
                  {memberships.map((membership) => (
                    <option
                      key={membership.id}
                      value={membership.organization_id}
                      className="text-[#0B1F3D]"
                    >
                      {membership.organization?.name ?? "Organization"}
                      {membership.organization?.industry?.name
                        ? ` · ${membership.organization.industry.name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={`${railOnlyClass} mt-4 justify-center`}
                title={
                  memberships.find((m) => m.organization_id === activeOrganizationId)
                    ?.organization?.name ?? "Active organization"
                }
              >
                <BuildingIcon className="h-4 w-4 text-[#38B2D1]" />
              </div>
            </>
          ) : null}

          <nav className="mt-6 space-y-1.5">
            <div
              className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[#C4EBF2]/60 ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              Main Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={item.name}
                  className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    collapsed ? "lg:justify-center lg:px-0" : ""
                  } ${
                    isActive
                      ? "bg-[#38B2D1] text-white shadow-md shadow-[#38B2D1]/30"
                      : "text-[#C4EBF2]/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className={`flex items-center gap-3 ${collapsed ? "lg:gap-0" : ""}`}>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-white" : "text-[#38B2D1]"
                      }`}
                    />
                    <span className={labelClass}>{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        collapsed ? "lg:hidden" : ""
                      } ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-white/10 text-[#C4EBF2]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <Link
            href="/dashboard/settings/branding"
            onClick={onCloseMobile}
            title="Organization branding"
            className={`flex items-center gap-3 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#C4EBF2]/80 transition-all hover:bg-white/10 hover:text-white ${
              collapsed ? "lg:justify-center lg:gap-0 lg:px-0" : ""
            }`}
          >
            <SettingsHelperIcon className="h-4 w-4 shrink-0 text-[#38B2D1]" />
            <span className={labelClass}>Organization branding</span>
          </Link>

          <div
            className={`flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md ${
              collapsed ? "lg:flex-col lg:gap-2 lg:p-2" : ""
            }`}
          >
            <div className={`flex items-center gap-3 ${collapsed ? "lg:gap-0" : ""}`}>
              <div className="relative">
                <img
                  src="/avatars/avatar-01.webp"
                  alt="User avatar"
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-[#38B2D1]"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0B1F3D] bg-emerald-500" />
              </div>
              <div className={`min-w-0 text-left ${collapsed ? "lg:hidden" : ""}`}>
                <div className="truncate text-xs font-bold leading-tight text-white">
                  {displayName || "Everlia User"}
                </div>
                <div className="max-w-[120px] truncate text-[10px] text-[#C4EBF2]/70">
                  {user?.email ?? "Member"}
                </div>
              </div>
            </div>

            <button
              type="button"
              title="Sign Out"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
              className="grid h-7 w-7 place-items-center rounded-lg text-[#C4EBF2]/70 transition-colors hover:bg-white/10 hover:text-rose-400 disabled:opacity-60"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
