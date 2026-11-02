"use client";

import { BuildingIcon, ArrowIcon } from "@/components/ui/Icons";
import { useIndustries } from "@/hooks/auth";
import {
  FormError,
  InfoBanner,
  primaryButtonClass,
  Spinner,
} from "@/components/auth/signup/shared";

type IndustryStepProps = {
  industryId: string | null;
  error: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
};

export function IndustryStep({
  industryId,
  error,
  onSelect,
  onContinue,
}: IndustryStepProps) {
  const industriesQuery = useIndustries();

  return (
    <div className="space-y-4">
      <FormError message={error} />

      {industriesQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#557393]">
          <Spinner className="h-5 w-5 border-[#38B2D1]" />
          Loading industries…
        </div>
      ) : null}

      {industriesQuery.isError ? (
        <FormError message="Unable to load industries. Please refresh and try again." />
      ) : null}

      {!industriesQuery.isLoading &&
      !industriesQuery.isError &&
      (industriesQuery.data?.length ?? 0) === 0 ? (
        <InfoBanner tone="warning">
          No active industries are available yet. Ask a platform admin to create
          one before signing up.
        </InfoBanner>
      ) : null}

      <div
        role="radiogroup"
        aria-label="Select your industry"
        className="max-h-64 space-y-2 overflow-y-auto pr-1"
      >
        {(industriesQuery.data ?? []).map((industry) => {
          const selected = industryId === industry.id;
          return (
            <button
              key={industry.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(industry.id)}
              className={[
                "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all",
                selected
                  ? "border-[#38B2D1] bg-[#F0FAFC] ring-4 ring-[#38B2D1]/15"
                  : "border-[#C4EBF2] bg-white hover:bg-[#F0FAFC]",
              ].join(" ")}
            >
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
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#0B1F3D]">
                  {industry.name}
                </span>
                <span className="block truncate text-[11px] text-[#557393]">
                  {industry.slug}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!industryId || industriesQuery.isLoading}
        className={`w-full ${primaryButtonClass}`}
      >
        Continue
        <ArrowIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
