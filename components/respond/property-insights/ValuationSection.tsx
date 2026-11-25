"use client";

import type {
  PropertyCategoryResult,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import {
  CategoryEmpty,
  CategorySkeleton,
  CategoryUnavailable,
  shouldRenderCategoryShell,
} from "./CategoryState";
import { formatMoney, formatBedsBaths, formatDistanceMiles } from "./format";
import { PriceBarsChart } from "./charts/PriceBarsChart";
import { InlineSourceLine } from "./SourceAttribution";

const LABEL = "Estimated value";

export function ValuationSection({
  result,
}: {
  result: PropertyCategoryResult<PropertyValuation>;
}) {
  const mode = shouldRenderCategoryShell(result.status, result.data);
  if (mode === "hide") return null;
  if (mode === "loading") return <CategorySkeleton label={LABEL} />;
  if (mode === "unavailable") {
    return <CategoryUnavailable label={LABEL} status={result.status} />;
  }
  if (mode === "empty" || !result.data) {
    return <CategoryEmpty label={LABEL} />;
  }

  const { estimate, range, comparables } = result.data;
  const estimateLabel = formatMoney(estimate);
  const low = formatMoney(range.low);
  const high = formatMoney(range.high);
  const lowAmt = range.low?.amount;
  const highAmt = range.high?.amount;
  const midAmt = estimate?.amount;
  const hasRange =
    lowAmt != null && highAmt != null && midAmt != null && highAmt > lowAmt;

  const markerPct = hasRange
    ? Math.min(
        100,
        Math.max(0, ((midAmt! - lowAmt!) / (highAmt! - lowAmt!)) * 100)
      )
    : 50;

  const compOnlyBars = comparables
    .map((comp, index) => {
      const amount = comp.listPrice?.amount;
      if (amount == null || !Number.isFinite(amount)) return null;
      const address =
        comp.identity.components.line1 ||
        comp.identity.components.formatted ||
        `Comp ${index + 1}`;
      return {
        id: `comp-${index}`,
        label: address,
        amount,
        tone: "teal" as const,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b != null);

  const compBars =
    midAmt != null && Number.isFinite(midAmt) && compOnlyBars.length > 0
      ? [
          {
            id: "subject",
            label: "Your estimate",
            amount: midAmt,
            tone: "navy" as const,
            emphasize: true,
          },
          ...compOnlyBars,
        ]
      : compOnlyBars;

  return (
    <section
      className="rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-4 sm:p-5"
      aria-labelledby="pi-valuation-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        Estimated value
      </p>

      {estimateLabel ? (
        <p
          id="pi-valuation-heading"
          className="mt-2 text-[2rem] font-extrabold tracking-tight text-[#0B1F3D] sm:text-[2.35rem]"
        >
          {estimateLabel}
        </p>
      ) : (
        <p
          id="pi-valuation-heading"
          className="mt-2 text-sm font-semibold text-[#557393]"
        >
          Estimate not published
        </p>
      )}

      <p className="mt-1 text-xs font-medium text-[#6B849E]">
        Automated estimate — not a professional appraisal
      </p>

      {hasRange ? (
        <div className="mt-5 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#E8F7FB]">
          <div className="flex justify-between text-[11px] font-semibold text-[#557393]">
            <span>Low {low}</span>
            <span>High {high}</span>
          </div>
          <div
            className="relative mt-3 h-3 overflow-hidden rounded-full bg-[#E8F7FB]"
            role="img"
            aria-label={`Estimated value between ${low} and ${high}`}
          >
            <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-[#9FD8E8] via-[#38B2D1] to-[#7BC8DE]" />
            <span
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#0B1F3D] shadow-md"
              style={{ left: `${markerPct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[11px] font-bold text-[#0B1F3D]">
            Estimate sits at {Math.round(markerPct)}% of the published range
          </p>
        </div>
      ) : null}

      {compBars.length >= 2 ? (
        <PriceBarsChart
          title="Estimate vs nearby comps"
          items={compBars.slice(0, 5)}
          caption="Bars use published list prices from valuation comparables only."
        />
      ) : null}

      {comparables.length > 0 ? (
        <div className="mt-4 border-t border-[#E8F7FB] pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#557393]">
            Nearby comparables
          </p>
          <ul className="mt-2 space-y-2">
            {comparables.slice(0, 3).map((comp, index) => {
              const price = formatMoney(comp.listPrice);
              const beds = formatBedsBaths(
                comp.specifications.bedrooms,
                comp.specifications.bathrooms
              );
              const distance = formatDistanceMiles(comp.distanceMiles);
              const address =
                comp.identity.components.formatted ||
                comp.identity.components.line1 ||
                "Comparable property";
              return (
                <li
                  key={`${address}-${index}`}
                  className="rounded-xl bg-white px-3 py-2 text-xs text-[#557393] ring-1 ring-[#E8F7FB]"
                >
                  <p className="font-semibold text-[#0B1F3D]">{address}</p>
                  <p className="mt-0.5">
                    {[price, beds, distance].filter(Boolean).join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <InlineSourceLine source={result.source} />
    </section>
  );
}
