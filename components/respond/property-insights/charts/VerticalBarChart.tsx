"use client";

import { formatMoney } from "../format";

export type VerticalBarItem = {
  id: string;
  label: string;
  amount: number;
  emphasize?: boolean;
  tone?: "teal" | "navy" | "green" | "muted";
};

const TONE_FILL: Record<NonNullable<VerticalBarItem["tone"]>, string> = {
  teal: "#38B2D1",
  navy: "#0B1F3D",
  green: "#1F8A4C",
  muted: "#9BB0C2",
};

export function VerticalBarChart({
  title,
  items,
  caption,
}: {
  title: string;
  items: VerticalBarItem[];
  caption?: string;
}) {
  const valid = items
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
    .slice(0, 6);
  if (valid.length < 2) return null;

  const max = Math.max(...valid.map((i) => i.amount));
  const width = 320;
  const height = 160;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const gap = 10;
  const barW = Math.max(18, (plotW - gap * (valid.length - 1)) / valid.length);

  const description = `${title}: ${valid
    .map((v) => `${v.label} ${formatMoney({ amount: v.amount, currency: "USD" }, { compact: true })}`)
    .join(", ")}`;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
        {title}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-40 w-full"
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
        {valid.map((item, i) => {
          const h = Math.max(4, (item.amount / max) * plotH);
          const x = padL + i * (barW + gap);
          const y = padT + plotH - h;
          const fill = TONE_FILL[item.tone ?? "teal"];
          const shortLabel =
            item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label;
          const value = formatMoney(
            { amount: item.amount, currency: "USD" },
            { compact: true }
          );
          return (
            <g key={item.id}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={6}
                fill={fill}
                opacity={item.emphasize ? 1 : 0.88}
              >
                <animate
                  attributeName="height"
                  from="0"
                  to={String(h)}
                  dur="0.55s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.2 0.8 0.2 1"
                />
                <animate
                  attributeName="y"
                  from={String(padT + plotH)}
                  to={String(y)}
                  dur="0.55s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.2 0.8 0.2 1"
                />
              </rect>
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-[#0B1F3D]"
                style={{ fontSize: 9, fontWeight: 800 }}
              >
                {value}
              </text>
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-[#9BB0C2]"
                style={{ fontSize: 9, fontWeight: 600 }}
              >
                {shortLabel}
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
