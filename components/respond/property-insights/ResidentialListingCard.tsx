"use client";

import type { NearbyListing } from "@/lib/types/property-intelligence";
import {
  formatArea,
  formatBedsBaths,
  formatDistanceMiles,
  formatListingStatus,
  formatMoney,
} from "./format";

export function ResidentialListingCard({ listing }: { listing: NearbyListing }) {
  const address =
    listing.identity.components.formatted ||
    listing.identity.components.line1 ||
    "Nearby home";
  const price = formatMoney(listing.listPrice);
  const bedsBaths = formatBedsBaths(
    listing.specifications.bedrooms,
    listing.specifications.bathrooms
  );
  const living = formatArea(listing.specifications.livingArea);
  const distance = formatDistanceMiles(listing.distanceMiles);
  const status = formatListingStatus(listing.status);
  const statusTone =
    listing.status === "active"
      ? "bg-[#E6F7EE] text-[#1F8A4C]"
      : listing.status === "sold"
        ? "bg-[#E8EEF5] text-[#557393]"
        : listing.status === "pending"
          ? "bg-[#FFF4E5] text-[#B87500]"
          : "bg-[#EEF3F7] text-[#6B849E]";

  const meta = [bedsBaths, living, distance].filter(Boolean);

  return (
    <article className="flex gap-3 rounded-xl border border-[#E5F4F8] bg-[#F7FCFE]/70 p-2.5 transition hover:bg-[#F0FAFC] sm:p-3">
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[linear-gradient(145deg,#E8F7FB_0%,#C4EBF2_100%)] text-[#38B2D1] sm:h-16 sm:w-16"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusTone}`}
          >
            {status}
          </span>
        </div>
        <h4 className="mt-1 truncate text-[13px] font-extrabold leading-snug text-[#0B1F3D] sm:text-sm">
          {address}
        </h4>
        {price ? (
          <p className="mt-0.5 text-sm font-extrabold text-[#0B1F3D] sm:text-[15px]">
            {price}
          </p>
        ) : null}
        {meta.length ? (
          <p className="mt-0.5 truncate text-[11px] leading-relaxed text-[#557393] sm:text-xs">
            {meta.join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
