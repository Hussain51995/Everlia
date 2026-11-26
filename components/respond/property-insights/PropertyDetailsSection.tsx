"use client";

import type {
  PropertyCategoryResult,
  PropertyDetails,
} from "@/lib/types/property-intelligence";
import {
  CategoryEmpty,
  CategorySkeleton,
  CategoryUnavailable,
  shouldRenderCategoryShell,
} from "./CategoryState";
import {
  formatArea,
  formatMoney,
  formatPropertyType,
  formatDateLabel,
} from "./format";

const LABEL = "Property details";

function SpecIcon({ kind }: { kind: string }) {
  const common =
    "h-8 w-8 shrink-0 rounded-lg bg-[#E8F7FB] text-[#38B2D1] grid place-items-center";
  return (
    <span className={common} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 fill-none stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "home" ? (
          <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
        ) : kind === "bath" ? (
          <>
            <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
            <path d="M6 12V7a2 2 0 0 1 2-2h1" />
          </>
        ) : kind === "bed" ? (
          <>
            <path d="M3 18v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5" />
            <path d="M3 18h18M6 10V8a2 2 0 0 1 2-2h3" />
          </>
        ) : kind === "ruler" ? (
          <path d="M4 20 20 4M9 19l2-2M13 15l2-2M7 17l1.5-1.5" />
        ) : kind === "calendar" ? (
          <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </>
        ) : (
          <circle cx="12" cy="12" r="7" />
        )}
      </svg>
    </span>
  );
}

function SpecItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-[#F7FCFE] px-3 py-2.5">
      <SpecIcon kind={icon} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9BB0C2]">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[#0B1F3D]">{value}</p>
      </div>
    </div>
  );
}

export function PropertyDetailsSection({
  result,
}: {
  result: PropertyCategoryResult<PropertyDetails>;
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

  const { specifications, county, lastSaleDate, lastSalePrice } = result.data;
  const items: Array<{ label: string; value: string; icon: string }> = [];

  const type = formatPropertyType(specifications.propertyType);
  if (type) items.push({ label: "Type", value: type, icon: "home" });
  if (specifications.bedrooms != null) {
    items.push({
      label: "Bedrooms",
      value: String(specifications.bedrooms),
      icon: "bed",
    });
  }
  if (specifications.bathrooms != null) {
    items.push({
      label: "Bathrooms",
      value: String(specifications.bathrooms),
      icon: "bath",
    });
  }
  const living = formatArea(specifications.livingArea);
  if (living) items.push({ label: "Living area", value: living, icon: "ruler" });
  const lot = formatArea(specifications.lotSize);
  if (lot) items.push({ label: "Lot size", value: lot, icon: "ruler" });
  if (specifications.yearBuilt != null) {
    items.push({
      label: "Year built",
      value: String(specifications.yearBuilt),
      icon: "calendar",
    });
  }
  if (specifications.stories != null) {
    items.push({
      label: "Stories",
      value: String(specifications.stories),
      icon: "home",
    });
  }
  if (specifications.garageSpaces != null) {
    items.push({
      label: "Parking",
      value: `${specifications.garageSpaces} space${
        specifications.garageSpaces === 1 ? "" : "s"
      }`,
      icon: "home",
    });
  }
  if (county) items.push({ label: "County", value: county, icon: "home" });

  const saleDate = formatDateLabel(lastSaleDate);
  const salePrice = formatMoney(lastSalePrice);
  if (saleDate || salePrice) {
    items.push({
      label: "Last recorded sale",
      value: [salePrice, saleDate].filter(Boolean).join(" · "),
      icon: "calendar",
    });
  }

  if (items.length === 0) {
    return <CategoryEmpty label={LABEL} />;
  }

  return (
    <section
      className="rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-4 sm:p-5"
      aria-labelledby="pi-details-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        Property details
      </p>
      <h3 id="pi-details-heading" className="sr-only">
        {LABEL}
      </h3>
      {/* Keep a compact 2-col grid so the panel stays dense beside valuation */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
        {items.map((item) => (
          <SpecItem
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </div>
    </section>
  );
}
