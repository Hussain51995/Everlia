"use client";

import { formatMoney } from "../format";

export type HistogramBin = {
  id: string;
  label: string;
  count: number;
};

function buildBins(amounts: number[], maxBins = 5): HistogramBin[] {
  const sorted = amounts
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (sorted.length < 3) return [];

  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  if (max <= min) {
    return [
      {
        id: "all",
        label:
          formatMoney({ amount: min, currency: "USD" }, { compact: true }) ??
          "All",
        count: sorted.length,
      },
    ];
  }

  const binCount = Math.min(maxBins, Math.max(3, Math.round(Math.sqrt(sorted.length))));
  const width = (max - min) / binCount;
  const bins: HistogramBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const lo = min + i * width;
    const hi = i === binCount - 1 ? max + 1e-9 : min + (i + 1) * width;
    const count = sorted.filter((v) => v >= lo && v < hi).length;
    const loLabel =
      formatMoney({ amount: lo, currency: "USD" }, { compact: true }) ?? "";
    const hiLabel =
      formatMoney(
        { amount: i === binCount - 1 ? max : hi, currency: "USD" },
        { compact: true }
      ) ?? "";
    bins.push({
      id: `bin-${i}`,
      label: `${loLabel}–${hiLabel}`,
      count,
    });
  }

  return bins.filter((b) => b.count > 0);
}

export function PriceHistogram({
  title,
  amounts,
  caption,
}: {
  title: string;
  amounts: number[];
  caption?: string;
}) {
  const bins = buildBins(amounts);
  if (bins.length < 2) return null;

  const maxCount = Math.max(...bins.map((b) => b.count));
  const width = 320;
  const height = 150;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const gap = 6;
  const barW = Math.max(16, (plotW - gap * (bins.length - 1)) / bins.length);

  const description = `${title}: ${bins
    .map((b) => `${b.label} (${b.count})`)
    .join(", ")}`;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
        {title}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-36 w-full"
        role="img"
        aria-label={description}
      >
        <title>{description}</title>
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = padT + (1 - f) * plotH;
          return (
            <line
              key={f}
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="#E8F7FB"
              strokeWidth="1"
            />
          );
        })}
        {bins.map((bin, i) => {
          const h = Math.max(4, (bin.count / maxCount) * plotH);
          const x = padL + i * (barW + gap);
          const y = padT + plotH - h;
          return (
            <g key={bin.id}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                fill="#38B2D1"
                opacity={0.85}
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-[#0B1F3D]"
                style={{ fontSize: 10, fontWeight: 800 }}
              >
                {bin.count}
              </text>
              <text
                x={x + barW / 2}
                y={height - 12}
                textAnchor="middle"
                className="fill-[#9BB0C2]"
                style={{ fontSize: 8, fontWeight: 600 }}
              >
                {bin.label}
              </text>
            </g>
          );
        })}
      </svg>
      {caption ? (
        <p className="mt-1 text-[10px] leading-relaxed text-[#9BB0C2]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
