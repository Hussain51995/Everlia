"use client";

import type { NearbyListing } from "@/lib/types/property-intelligence";
import {
  formatArea,
  formatDistanceMiles,
  formatListingStatus,
  formatMoney,
} from "./format";

export function LandListingCard({ listing }: { listing: NearbyListing }) {
  const address =
    listing.identity.components.formatted ||
    listing.identity.components.line1 ||
    "Nearby land";
  const price = formatMoney(listing.listPrice);
  const lot = formatArea(listing.specifications.lotSize);
  const distance = formatDistanceMiles(listing.distanceMiles);
  const status = formatListingStatus(listing.status);
  const statusTone =
    listing.status === "active"
      ? "bg-[#E6F7EE] text-[#1F8A4C]"
      : listing.status === "sold"
        ? "bg-[#E8EEF5] text-[#557393]"
        : "bg-[#EEF3F7] text-[#6B849E]";

  const meta = [lot, distance].filter(Boolean);

  return (
    <article className="flex gap-3 rounded-xl border border-[#E0ECD8] bg-[#FBFFF8] p-2.5 transition hover:bg-[#F4FAEE] sm:p-3">
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[linear-gradient(145deg,#E7F2DC_0%,#C8DDB0_100%)] text-[#5A7A45] sm:h-16 sm:w-16"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 18h18M5 18 8 9l3 4 3-6 5 11" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusTone}`}
        >
          Land · {status}
        </span>
        <h4 className="mt-1 truncate text-[13px] font-extrabold leading-snug text-[#0B1F3D] sm:text-sm">
          {address}
        </h4>
        {price ? (
          <p className="mt-0.5 text-sm font-extrabold text-[#0B1F3D] sm:text-[15px]">
            {price}
          </p>
        ) : null}
        {meta.length ? (
          <p className="mt-0.5 truncate text-[11px] leading-relaxed text-[#5A7A45] sm:text-xs">
            {meta.join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
