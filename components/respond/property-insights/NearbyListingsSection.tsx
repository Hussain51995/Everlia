"use client";

import type {
  NearbyListing,
  PropertyCategoryResult,
} from "@/lib/types/property-intelligence";
import {
  CategoryEmpty,
  CategorySkeleton,
  CategoryUnavailable,
  shouldRenderCategoryShell,
} from "./CategoryState";
import { LandListingCard } from "./LandListingCard";
import { ResidentialListingCard } from "./ResidentialListingCard";
import { VerticalBarChart } from "./charts/VerticalBarChart";

export function NearbyHousesSection({
  result,
}: {
  result: PropertyCategoryResult<NearbyListing[]>;
}) {
  return (
    <NearbySection
      label="Nearby homes"
      eyebrow="Nearby homes"
      result={result}
      showPriceBars={false}
      renderCard={(listing) => <ResidentialListingCard listing={listing} />}
    />
  );
}

export function NearbyLandSection({
  result,
}: {
  result: PropertyCategoryResult<NearbyListing[]>;
}) {
  return (
    <NearbySection
      label="Nearby land"
      eyebrow="Nearby land (vacant lots)"
      result={result}
      showPriceBars
      priceChartTitle="Land asking prices"
      renderCard={(listing) => <LandListingCard listing={listing} />}
    />
  );
}

function NearbySection({
  label,
  eyebrow,
  result,
  showPriceBars,
  priceChartTitle,
  renderCard,
}: {
  label: string;
  eyebrow: string;
  result: PropertyCategoryResult<NearbyListing[]>;
  showPriceBars: boolean;
  priceChartTitle?: string;
  renderCard: (listing: NearbyListing) => React.ReactNode;
}) {
  const mode = shouldRenderCategoryShell(result.status, result.data);
  if (mode === "hide") return null;
  if (mode === "loading") return <CategorySkeleton label={label} />;
  if (mode === "unavailable") {
    return <CategoryUnavailable label={label} status={result.status} />;
  }
  if (mode === "empty" || !result.data?.length) {
    return (
      <CategoryEmpty
        label={label}
        title="No listings found"
        body="Nothing matching this search is available right now."
      />
    );
  }

  const priceBars = showPriceBars
    ? result.data
        .map((listing, index) => {
          const amount = listing.listPrice?.amount;
          if (amount == null || !Number.isFinite(amount)) return null;
          const address =
            listing.identity.components.line1 ||
            listing.identity.components.formatted ||
            `Listing ${index + 1}`;
          return {
            id: `${listing.identity.normalizedKey}-${index}`,
            label: address,
            amount,
            tone: "teal" as const,
          };
        })
        .filter((b): b is NonNullable<typeof b> => b != null)
        .slice(0, 5)
    : [];

  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-3.5 sm:p-4"
      aria-label={label}
    >
      <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        {eyebrow}
      </p>

      {priceBars.length >= 2 && priceChartTitle ? (
        <div className="mt-2 min-w-0 overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#E8F7FB]">
          <VerticalBarChart
            title={priceChartTitle}
            items={priceBars}
            caption="Mapped from listing ask prices in this response."
          />
        </div>
      ) : null}

      {/* Full-width vertical list on all sizes — avoids 85vw carousel cards
          overflowing the padded insights pane on mobile. */}
      <ul className="mt-3 flex flex-col gap-2.5">
        {result.data.map((listing, index) => (
          <li
            key={`${listing.identity.normalizedKey}-${index}`}
            className="min-w-0 w-full"
          >
            {renderCard(listing)}
          </li>
        ))}
      </ul>
    </section>
  );
}
