"use client";

import type { ReactNode } from "react";
import type {
  MarketStatistics,
  NearbyListing,
  PropertyCategoryResult,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import { MarketHistoryChart } from "./MarketHistoryChart";
import { VerticalBarChart, type VerticalBarItem } from "./VerticalBarChart";
import { PieDonutChart, type PieSlice } from "./PieDonutChart";
import { PriceHistogram } from "./PriceHistogram";
import { ScatterPlotChart, type ScatterPoint } from "./ScatterPlotChart";

const PIE_COLORS = ["#0B1F3D", "#38B2D1", "#1F8A4C", "#7BC8DE", "#557393", "#9FD8E8"];

function isAvailable<T>(
  result: PropertyCategoryResult<T> | null | undefined
): result is PropertyCategoryResult<T> & { data: T } {
  return result?.status === "available" && result.data != null;
}

function bedroomSlices(listings: NearbyListing[]): PieSlice[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const beds = listing.specifications.bedrooms;
    const key =
      beds == null || !Number.isFinite(beds)
        ? "Unknown"
        : beds >= 5
          ? "5+ bed"
          : `${Math.round(beds)} bed`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order = ["1 bed", "2 bed", "3 bed", "4 bed", "5+ bed", "Unknown"];
  const keys = [
    ...order.filter((k) => counts.has(k)),
    ...[...counts.keys()].filter((k) => !order.includes(k)),
  ];
  return keys.map((label, i) => ({
    id: label,
    label,
    value: counts.get(label) ?? 0,
    color: PIE_COLORS[i % PIE_COLORS.length]!,
  }));
}

function propertyTypeSlices(listings: NearbyListing[]): PieSlice[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const type = listing.specifications.propertyType || "unknown";
    const label =
      type === "single_family"
        ? "Single family"
        : type === "condo"
          ? "Condo"
          : type === "townhouse"
            ? "Townhouse"
            : type === "multi_family"
              ? "Multi-family"
              : type === "land"
                ? "Land"
                : type === "unknown"
                  ? "Unknown"
                  : type.replace(/_/g, " ");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value], i) => ({
    id: label,
    label,
    value,
    color: PIE_COLORS[i % PIE_COLORS.length]!,
  }));
}

type SecondaryChart = {
  id: string;
  node: ReactNode;
};

export function InsightsChartsSection({
  valuation,
  market,
  nearbyHouses,
}: {
  valuation?: PropertyCategoryResult<PropertyValuation> | null;
  market?: PropertyCategoryResult<MarketStatistics> | null;
  nearbyHouses?: PropertyCategoryResult<NearbyListing[]> | null;
}) {
  const valuationData = isAvailable(valuation) ? valuation.data : null;
  const marketData = isAvailable(market) ? market.data : null;
  const houses = isAvailable(nearbyHouses) ? nearbyHouses.data : [];

  const history = marketData?.history?.series ?? [];
  const estimateAmt = valuationData?.estimate?.amount;
  const marketAvg = marketData?.sale?.averagePrice?.amount;
  const marketMed = marketData?.sale?.medianPrice?.amount;

  const compareBars: VerticalBarItem[] = [];
  if (estimateAmt != null && Number.isFinite(estimateAmt)) {
    compareBars.push({
      id: "home",
      label: "Your home",
      amount: estimateAmt,
      emphasize: true,
      tone: "navy",
    });
  }
  if (marketAvg != null && Number.isFinite(marketAvg)) {
    compareBars.push({
      id: "avg",
      label: "ZIP avg",
      amount: marketAvg,
      tone: "teal",
    });
  }
  if (marketMed != null && Number.isFinite(marketMed)) {
    compareBars.push({
      id: "med",
      label: "ZIP median",
      amount: marketMed,
      tone: "muted",
    });
  }

  const bedPie = bedroomSlices(houses);
  const typePie = propertyTypeSlices(houses);
  const pieSlices = bedPie.length >= 2 ? bedPie : typePie;

  const priceAmounts = houses
    .map((h) => h.listPrice?.amount)
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0);

  const scatterPoints: ScatterPoint[] = houses
    .map((listing, index) => {
      const y = listing.listPrice?.amount;
      const x = listing.distanceMiles;
      if (y == null || x == null || !Number.isFinite(y) || !Number.isFinite(x)) {
        return null;
      }
      return {
        id: `${listing.identity.normalizedKey}-${index}`,
        x,
        y,
        label:
          listing.identity.components.line1 ||
          listing.identity.components.formatted ||
          `Listing ${index + 1}`,
      };
    })
    .filter((p): p is ScatterPoint => p != null);

  const hasLine = history.length >= 2;
  const hasBar = compareBars.length >= 2;
  const hasPie = pieSlices.length >= 2;
  const hasHist = priceAmounts.length >= 3;
  const hasScatter = scatterPoints.length >= 3;

  const secondaryCharts: SecondaryChart[] = [];
  if (hasBar) {
    secondaryCharts.push({
      id: "bar",
      node: (
        <VerticalBarChart
          title="Estimate vs ZIP asking"
          items={compareBars}
          caption="Your published estimate compared with ZIP asking averages."
        />
      ),
    });
  }
  if (hasPie) {
    secondaryCharts.push({
      id: "pie",
      node: (
        <PieDonutChart
          title={
            bedPie.length >= 2
              ? "Nearby bedroom mix"
              : "Nearby home types"
          }
          slices={pieSlices}
          centerLabel="Homes"
          caption="Share of nearby homes in this response."
        />
      ),
    });
  }
  if (hasHist) {
    secondaryCharts.push({
      id: "histogram",
      node: (
        <PriceHistogram
          title="Nearby asking prices"
          amounts={priceAmounts}
          caption="Distribution of asking prices among nearby homes."
        />
      ),
    });
  }
  if (hasScatter) {
    secondaryCharts.push({
      id: "scatter",
      node: (
        <ScatterPlotChart
          title="Price vs distance"
          points={scatterPoints}
          xLabel="Distance"
          yLabel="Asking price"
          caption="Each point is a nearby home with asking price and distance."
        />
      ),
    });
  }

  if (!hasLine && secondaryCharts.length === 0) {
    return null;
  }

  const secondaryCount = secondaryCharts.length;
  const secondaryGridClass =
    secondaryCount > 1 ? "mt-3 grid gap-3 sm:grid-cols-2" : "mt-3 grid gap-3";
  const orphanSpansFull =
    secondaryCount > 1 && secondaryCount % 2 === 1;

  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-[#E5F4F8] bg-white p-4 shadow-sm ring-1 ring-[#E8F7FB] sm:p-5"
      aria-labelledby="pi-charts-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        Visual insights
      </p>
      <h3
        id="pi-charts-heading"
        className="mt-1 text-base font-extrabold text-[#0B1F3D]"
      >
        How your market looks
      </h3>
      <p className="mt-0.5 text-xs text-[#6B849E]">
        Charts use only published asking-price and listing fields from this
        response.
      </p>

      <div className="mt-4 space-y-3">
        {hasLine ? (
          <div className="rounded-xl bg-[#F7FCFE] p-3 ring-1 ring-[#E8F7FB]">
            <MarketHistoryChart series={history} metric="averagePrice" />
            <p className="mt-1 text-[10px] text-[#9BB0C2]">
              ZIP asking-price trend over time
            </p>
          </div>
        ) : null}

        {secondaryCount > 0 ? (
          <div className={secondaryGridClass}>
            {secondaryCharts.map((chart, index) => {
              const isOrphan =
                orphanSpansFull && index === secondaryCount - 1;
              return (
                <div
                  key={chart.id}
                  className={`rounded-xl bg-[#F7FCFE] p-3 ring-1 ring-[#E8F7FB]${
                    isOrphan ? " sm:col-span-2" : ""
                  }`}
                >
                  {chart.node}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
