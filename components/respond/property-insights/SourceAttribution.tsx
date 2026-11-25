"use client";

import type { PropertyDataSource } from "@/lib/types/property-intelligence";
import { formatDateLabel } from "./format";

export function SourceAttribution({
  sources,
}: {
  sources: Array<PropertyDataSource | null | undefined>;
}) {
  const unique = new Map<string, PropertyDataSource>();
  for (const source of sources) {
    if (!source) continue;
    const key = `${source.providerId}|${source.attribution ?? ""}|${source.retrievedAt}`;
    if (!unique.has(key)) unique.set(key, source);
  }

  if (unique.size === 0) return null;

  const items = [...unique.values()];
  const hasMock = items.some((s) => s.isMock);

  return (
    <footer
      className="rounded-xl border border-[#E5F4F8] bg-[#EAF6FA]/70 px-3.5 py-3 sm:px-4"
      aria-label="Data sources and freshness"
    >
      {hasMock ? (
        <p className="text-[11px] font-semibold text-[#0B1F3D] sm:text-xs">
          MOCK DATA — Everlia sample fixture (not live market data)
        </p>
      ) : (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9BB0C2]">
          Data & freshness
        </p>
      )}
      <ul className="mt-1.5 space-y-1">
        {items.map((source) => {
          const updated =
            formatDateLabel(source.sourceDataAt) ||
            formatDateLabel(source.retrievedAt);
          return (
            <li
              key={`${source.providerId}-${source.category}-${source.retrievedAt}`}
              className="text-[11px] leading-relaxed text-[#6B849E] sm:text-xs"
            >
              <span className="font-semibold text-[#0B1F3D]">
                {source.attribution ||
                  (source.isMock
                    ? "Sample insight data"
                    : `Source: ${source.providerId}`)}
              </span>
              {updated ? (
                <span>
                  {" "}
                  · Updated {updated}
                  {source.freshnessLabel ? ` (${source.freshnessLabel})` : ""}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#9BB0C2]">
        Values are automated estimates and public listing snapshots. They are
        not a professional appraisal and may differ from an agent’s opinion of
        value.
      </p>
    </footer>
  );
}

export function InlineSourceLine({
  source,
}: {
  source: PropertyDataSource | null | undefined;
}) {
  if (!source) return null;
  const updated =
    formatDateLabel(source.sourceDataAt) ||
    formatDateLabel(source.retrievedAt);
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-[#9BB0C2]">
      {source.attribution || (source.isMock ? "Sample data" : null)}
      {updated ? ` · Updated ${updated}` : null}
    </p>
  );
}
