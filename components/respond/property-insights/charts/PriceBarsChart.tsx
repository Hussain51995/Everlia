"use client";

import { formatMoney } from "../format";

export type PriceBarItem = {
  id: string;
  label: string;
  amount: number;
  currency?: "USD";
  emphasize?: boolean;
  tone?: "teal" | "navy" | "green" | "muted";
};

export function PriceBarsChart({
  title,
  items,
  caption,
  flush = false,
}: {
  title: string;
  items: PriceBarItem[];
  caption?: string;
  flush?: boolean;
}) {
  const valid = items.filter(
    (item) => Number.isFinite(item.amount) && item.amount > 0
  );
  if (valid.length === 0) return null;

  const max = Math.max(...valid.map((i) => i.amount));

  return (
    <div
      className={
        flush ? "pt-2" : "mt-4 border-t border-[#E8F7FB] pt-3"
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
        {title}
      </p>
      <ul className="mt-2.5 space-y-2.5">
        {valid.map((item) => {
          const pct = Math.max(8, (item.amount / max) * 100);
          const price = formatMoney({
            amount: item.amount,
            currency: item.currency || "USD",
          });
          const bar =
            item.tone === "navy"
              ? "bg-[#0B1F3D]"
              : item.tone === "green"
                ? "bg-[#1F8A4C]"
                : item.tone === "muted"
                  ? "bg-[#B7D5DF]"
                  : "bg-[#38B2D1]";
          return (
            <li key={item.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span
                  className={`truncate text-[11px] font-semibold sm:text-xs ${
                    item.emphasize ? "text-[#0B1F3D]" : "text-[#557393]"
                  }`}
                >
                  {item.label}
                </span>
                <span className="shrink-0 text-[11px] font-extrabold text-[#0B1F3D] sm:text-xs">
                  {price}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E8F7FB]">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {caption ? (
        <p className="mt-2 text-[10px] leading-relaxed text-[#9BB0C2]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
