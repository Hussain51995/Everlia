"use client";

import type { ReactNode } from "react";
import type { CampaignStatus, CampaignMailingStatus } from "@/lib/types/campaigns";

export {
  fieldLabelClass,
  textInputNoIconClass as textInputClass,
  primaryButtonClass,
  secondaryButtonClass,
  FormError,
  InfoBanner,
  Spinner,
} from "@/components/auth/signup/shared";

const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-sky-50 text-sky-800 border-sky-200",
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  paused: "bg-amber-50 text-amber-900 border-amber-200",
  completed: "bg-indigo-50 text-indigo-800 border-indigo-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
};

const MAILING_STATUS_STYLES: Partial<Record<CampaignMailingStatus, string>> = {
  planned: "bg-sky-50 text-sky-800 border-sky-200",
  submitted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
  skipped_past: "bg-slate-100 text-slate-600 border-slate-200",
  skipped_paused: "bg-amber-50 text-amber-800 border-amber-200",
  skipped_window: "bg-slate-100 text-slate-600 border-slate-200",
  skipped_cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${CAMPAIGN_STATUS_STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function MailingStatusBadge({ status }: { status: CampaignMailingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        MAILING_STATUS_STYLES[status] ??
        "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function WizardShell({
  title,
  subtitle,
  step,
  totalSteps = 6,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
              Step {step} of {totalSteps}
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#0B1F3D]">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[#557393]">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-7 rounded-full ${
                  i + 1 <= step ? "bg-[#38B2D1]" : "bg-[#C4EBF2]"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#C4EBF2] pt-4 sm:flex-row sm:justify-between">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function customerHasAddress(customer: {
  address_line1?: string | null;
  city?: string | null;
  province_or_state?: string | null;
  postal_or_zip?: string | null;
}): boolean {
  return Boolean(
    customer.address_line1?.trim() &&
      customer.city?.trim() &&
      customer.province_or_state?.trim() &&
      customer.postal_or_zip?.trim()
  );
}
