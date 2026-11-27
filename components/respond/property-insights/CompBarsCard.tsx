"use client";

import type { PropertyValuation } from "@/lib/types/property-intelligence";
import { VerticalBarChart, type VerticalBarItem } from "./charts/VerticalBarChart";

export function CompBarsCard({
  valuation,
}: {
  valuation: PropertyValuation;
}) {
  const midAmt = valuation.estimate?.amount;
  const items: VerticalBarItem[] = [];

  if (midAmt != null && Number.isFinite(midAmt)) {
    items.push({
      id: "subject",
      label: "Your estimate",
      amount: midAmt,
      tone: "navy",
      emphasize: true,
    });
  }

  for (const [index, comp] of valuation.comparables.entries()) {
    const amount = comp.listPrice?.amount;
    if (amount == null || !Number.isFinite(amount)) continue;
    const address =
      comp.identity.components.line1 ||
      comp.identity.components.formatted ||
      `Comp ${index + 1}`;
    items.push({
      id: `comp-${index}`,
      label: address,
      amount,
      tone: "teal",
    });
    if (items.length >= 5) break;
  }

  if (items.length < 2) return null;

  return (
    <div className="rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-4 sm:p-5">
      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#E8F7FB]">
        <VerticalBarChart
          title="Estimate vs nearby comps"
          items={items}
          caption="Bars use published list prices from valuation comparables only."
        />
      </div>
    </div>
  );
}
