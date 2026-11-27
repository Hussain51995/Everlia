"use client";

import { formatMoney } from "../format";

export type ScatterPoint = {
  id: string;
  x: number;
  y: number;
  label: string;
  emphasize?: boolean;
};

export function ScatterPlotChart({
  title,
  points,
  xLabel,
  yLabel,
  caption,
}: {
  title: string;
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  caption?: string;
}) {
  const valid = points.filter(
    (p) =>
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      p.x >= 0 &&
      p.y > 0
  );
  if (valid.length < 3) return null;

  const width = 320;
  const height = 170;
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 32;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xs = valid.map((p) => p.x);
  const ys = valid.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, maxX * 0.05, 0.1);
  const spanY = Math.max(maxY - minY, maxY * 0.05, 1);
  const x0 = minX - spanX * 0.08;
  const x1 = maxX + spanX * 0.08;
  const y0 = minY - spanY * 0.08;
  const y1 = maxY + spanY * 0.08;

  const coords = valid.map((p) => ({
    ...p,
    cx: padL + ((p.x - x0) / (x1 - x0)) * plotW,
    cy: padT + (1 - (p.y - y0) / (y1 - y0)) * plotH,
  }));

  const yLow = formatMoney({ amount: y0, currency: "USD" }, { compact: true });
  const yHigh = formatMoney({ amount: y1, currency: "USD" }, { compact: true });
  const description = `${title}: ${valid.length} listings plotted by ${xLabel} vs ${yLabel}.`;

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
        {[0, 0.5, 1].map((f) => {
          const y = padT + (1 - f) * plotH;
          return (
            <line
              key={`h-${f}`}
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="#E8F7FB"
              strokeWidth="1"
            />
          );
        })}
        {[0, 0.5, 1].map((f) => {
          const x = padL + f * plotW;
          return (
            <line
              key={`v-${f}`}
              x1={x}
              x2={x}
              y1={padT}
              y2={padT + plotH}
              stroke="#E8F7FB"
              strokeWidth="1"
            />
          );
        })}
        {coords.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r={p.emphasize ? 6 : 4.5}
              fill={p.emphasize ? "#0B1F3D" : "#38B2D1"}
              opacity={0.9}
            >
              <title>
                {p.label}: {formatMoney({ amount: p.y, currency: "USD" })} ·{" "}
                {p.x.toFixed(1)} mi
              </title>
            </circle>
            {p.emphasize ? (
              <circle
                cx={p.cx}
                cy={p.cy}
                r={2.5}
                fill="#fff"
              />
            ) : null}
          </g>
        ))}
        <text
          x={padL}
          y={height - 8}
          className="fill-[#9BB0C2]"
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          {xLabel}
        </text>
        <text
          x={width - padR}
          y={height - 8}
          textAnchor="end"
          className="fill-[#9BB0C2]"
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          {maxX.toFixed(1)} mi
        </text>
        <text
          x={4}
          y={padT + 4}
          className="fill-[#9BB0C2]"
          style={{ fontSize: 8, fontWeight: 600 }}
        >
          {yHigh}
        </text>
        <text
          x={4}
          y={padT + plotH}
          className="fill-[#9BB0C2]"
          style={{ fontSize: 8, fontWeight: 600 }}
        >
          {yLow}
        </text>
      </svg>
      {caption ? (
        <p className="mt-1 text-[10px] leading-relaxed text-[#9BB0C2]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
