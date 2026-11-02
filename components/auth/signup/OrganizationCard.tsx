"use client";

import { BuildingIcon, CheckIcon } from "@/components/ui/Icons";
import type { DiscoverableOrganizationSummary } from "@/lib/types/onboarding";
import { joinPolicyLabel } from "@/components/auth/signup/shared";

type OrganizationCardProps = {
  organization: DiscoverableOrganizationSummary;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
};

export function OrganizationCard({
  organization,
  selected = false,
  onSelect,
  selectable = false,
}: OrganizationCardProps) {
  const content = (
    <>
      <span
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          selected
            ? "bg-[#38B2D1] text-white"
            : "bg-[#E8F4F7] text-[#557393]",
        ].join(" ")}
      >
        <BuildingIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-[#0B1F3D]">
            {organization.name}
          </span>
          {selected ? (
            <CheckIcon className="h-4 w-4 shrink-0 text-[#38B2D1]" />
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-[#557393]">
          {joinPolicyLabel(organization.joinPolicy)} · matched{" "}
          <span className="font-semibold">{organization.matchedDomain}</span>
        </span>
      </span>
    </>
  );

  if (!selectable) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#38B2D1] bg-[#F0FAFC] px-3.5 py-3 ring-4 ring-[#38B2D1]/10">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all",
        selected
          ? "border-[#38B2D1] bg-[#F0FAFC] ring-4 ring-[#38B2D1]/15"
          : "border-[#C4EBF2] bg-white hover:bg-[#F0FAFC]",
      ].join(" ")}
    >
      {content}
    </button>
  );
}
