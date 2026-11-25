"use client";

import type {
  MarketMetricSet,
  MarketStatistics,
  PropertyCategoryResult,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import {
  CategoryEmpty,
  CategorySkeleton,
  CategoryUnavailable,
  shouldRenderCategoryShell,
} from "./CategoryState";
import { formatMoney } from "./format";
import { MarketHistoryChart } from "./charts/MarketHistoryChart";
import {
  buildMetricTrends,
  MetricTrendCards,
} from "./charts/MetricTrendCards";
import { InventorySparkline } from "./charts/InventorySparkline";
import { PriceBarsChart } from "./charts/PriceBarsChart";
import { InlineSourceLine } from "./SourceAttribution";

const LABEL = "Market trends";

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-[#F7FCFE] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9BB0C2]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[#0B1F3D] sm:text-[15px]">
        {value}
      </p>
    </div>
  );
}

function extraMetricItems(set: MarketMetricSet | null, kind: "sale" | "rental") {
  if (!set) return [];
  const prefix = kind === "rental" ? "Rent · " : "";
  const shownInTrends = new Set([
    "Avg. days on market",
    "Inventory",
    "Avg asking",
    "New listings",
  ]);
  return [
    {
      label: `${prefix}Median asking`,
      value: formatMoney(set.medianPrice),
    },
    {
      label: `${prefix}Avg $/sq ft`,
      value: formatMoney(set.averagePricePerSqft),
    },
    {
      label: `${prefix}Median $/sq ft`,
      value: formatMoney(set.medianPricePerSqft),
    },
    {
      label: `${prefix}Min asking`,
      value: formatMoney(set.minPrice),
    },
    {
      label: `${prefix}Max asking`,
      value: formatMoney(set.maxPrice),
    },
  ].filter((m) => m.value && !shownInTrends.has(m.label.replace(prefix, "")));
}

export function MarketStatisticsSection({
  result,
  valuation,
}: {
  result: PropertyCategoryResult<MarketStatistics>;
  valuation?: PropertyCategoryResult<PropertyValuation> | null;
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

  const data = result.data;
  const history = data.history?.series ?? [];
  const trendCards = buildMetricTrends(data.sale, history);
  const extraSale = extraMetricItems(data.sale, "sale");
  const rentItems = [
    {
      label: "Rent · Avg asking",
      value: formatMoney(data.rental?.averagePrice),
    },
    {
      label: "Rent · Median asking",
      value: formatMoney(data.rental?.medianPrice),
    },
    {
      label: "Rent · Avg $/sq ft",
      value: formatMoney(data.rental?.averagePricePerSqft),
    },
    ...extraMetricItems(data.rental, "rental"),
  ].filter((m) => m.value);

  const hasAnything =
    trendCards.length > 0 ||
    extraSale.length > 0 ||
    rentItems.length > 0 ||
    history.length > 0;

  if (!hasAnything) {
    return <CategoryEmpty label={LABEL} />;
  }

  const estimateAmt = valuation?.data?.estimate?.amount;
  const marketAvg = data.sale?.averagePrice?.amount;
  const marketMed = data.sale?.medianPrice?.amount;
  const compareBars = [];
  if (estimateAmt != null && Number.isFinite(estimateAmt)) {
    compareBars.push({
      id: "home",
      label: "Your home estimate",
      amount: estimateAmt,
      emphasize: true,
      tone: "navy" as const,
    });
  }
  if (marketAvg != null && Number.isFinite(marketAvg)) {
    compareBars.push({
      id: "avg",
      label: "ZIP avg asking",
      amount: marketAvg,
      tone: "teal" as const,
    });
  }
  if (marketMed != null && Number.isFinite(marketMed)) {
    compareBars.push({
      id: "med",
      label: "ZIP median asking",
      amount: marketMed,
      tone: "muted" as const,
    });
  }

  return (
    <section
      className="rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-4 sm:p-5"
      aria-labelledby="pi-market-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        Market trends
      </p>
      <h3 id="pi-market-heading" className="sr-only">
        {LABEL}
      </h3>
      <p className="mt-1 text-xs text-[#6B849E]">
        ZIP-level asking-price statistics
        {data.zipCode ? (
          <>
            {" "}
            for{" "}
            <span className="font-semibold text-[#0B1F3D]">{data.zipCode}</span>
          </>
        ) : null}
        . Not completed-sale trends.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(160px,0.85fr)] lg:items-start">
        <div className="min-w-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#E8F7FB]">
          <MarketHistoryChart series={history} metric="averagePrice" />
        </div>

        {trendCards.length > 0 ? (
          <MetricTrendCards cards={trendCards} />
        ) : null}
      </div>

      <InventorySparkline series={history} />

      {compareBars.length >= 2 ? (
        <PriceBarsChart
          title="Your estimate vs local asking"
          items={compareBars}
          caption="Uses your published estimate and ZIP asking averages from the same response payload."
        />
      ) : null}

      {extraSale.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {extraSale.map((item) => (
            <Metric key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      ) : null}

      {rentItems.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rentItems.map((item) => (
            <Metric key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      ) : null}

      <InlineSourceLine source={result.source} />
    </section>
  );
}
