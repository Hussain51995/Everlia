"use client";

import type { MarketHistoricalPoint, MarketMetricSet } from "@/lib/types/property-intelligence";
import { formatMoney } from "../format";

type TrendCard = {
  id: string;
  label: string;
  value: string;
  delta: string | null;
  positive: boolean | null;
};

function deltaLabel(
  current: number,
  previous: number,
  invertGood = false
): { text: string; positive: boolean } | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const improved = invertGood ? pct <= 0 : pct >= 0;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    positive: improved,
  };
}

export function buildMetricTrends(
  sale: MarketMetricSet | null,
  series: MarketHistoricalPoint[]
): TrendCard[] {
  if (!sale) return [];

  const sorted = [...series].sort(
    (a, b) => Date.parse(a.periodStart) - Date.parse(b.periodStart)
  );
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2]!.metrics : null;

  const cards: TrendCard[] = [];

  if (sale.averageDaysOnMarket != null) {
    const d =
      prev?.averageDaysOnMarket != null
        ? deltaLabel(sale.averageDaysOnMarket, prev.averageDaysOnMarket, true)
        : null;
    cards.push({
      id: "dom",
      label: "Avg. days on market",
      value: `${Math.round(sale.averageDaysOnMarket)} days`,
      delta: d?.text ?? null,
      positive: d?.positive ?? null,
    });
  }

  if (sale.totalListings != null) {
    const d =
      prev?.totalListings != null
        ? deltaLabel(sale.totalListings, prev.totalListings)
        : null;
    cards.push({
      id: "inv",
      label: "Inventory",
      value: String(sale.totalListings),
      delta: d?.text ?? null,
      positive: d?.positive ?? null,
    });
  }

  if (sale.averagePrice) {
    const d =
      prev?.averagePrice?.amount != null
        ? deltaLabel(sale.averagePrice.amount, prev.averagePrice.amount)
        : null;
    const value = formatMoney(sale.averagePrice);
    if (value) {
      cards.push({
        id: "avg",
        label: "Avg asking",
        value,
        delta: d?.text ?? null,
        positive: d?.positive ?? null,
      });
    }
  }

  if (sale.newListings != null) {
    const d =
      prev?.newListings != null
        ? deltaLabel(sale.newListings, prev.newListings)
        : null;
    cards.push({
      id: "new",
      label: "New listings",
      value: String(sale.newListings),
      delta: d?.text ?? null,
      positive: d?.positive ?? null,
    });
  }

  return cards.slice(0, 4);
}

export function MetricTrendCards({ cards }: { cards: TrendCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-xl bg-[#F7FCFE] px-3 py-2.5"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9BB0C2]">
            {card.label}
          </p>
          <p className="mt-0.5 text-sm font-extrabold text-[#0B1F3D] sm:text-[15px]">
            {card.value}
          </p>
          {card.delta ? (
            <p
              className={`mt-0.5 text-[11px] font-bold ${
                card.positive == null
                  ? "text-[#6B849E]"
                  : card.positive
                    ? "text-[#1F8A4C]"
                    : "text-rose-600"
              }`}
            >
              {card.delta} vs prior period
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
