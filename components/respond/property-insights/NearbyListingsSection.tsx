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
import { PriceBarsChart } from "./charts/PriceBarsChart";
import { InlineSourceLine } from "./SourceAttribution";

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
      priceChartTitle="Asking prices nearby"
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
      priceChartTitle="Land asking prices"
      renderCard={(listing) => <LandListingCard listing={listing} />}
    />
  );
}

function NearbySection({
  label,
  eyebrow,
  result,
  priceChartTitle,
  renderCard,
}: {
  label: string;
  eyebrow: string;
  result: PropertyCategoryResult<NearbyListing[]>;
  priceChartTitle: string;
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

  const priceBars = result.data
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
    .slice(0, 5);

  return (
    <section
      className="rounded-2xl border border-[#E5F4F8] bg-[#F7FCFE]/90 p-3.5 sm:p-4"
      aria-label={label}
    >
      <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#38B2D1]">
        {eyebrow}
      </p>

      {priceBars.length >= 2 ? (
        <div className="mt-2 rounded-xl bg-white px-3 pb-1 pt-0.5 shadow-sm ring-1 ring-[#E8F7FB]">
          <PriceBarsChart
            title={priceChartTitle}
            items={priceBars}
            flush
            caption="Mapped from listing ask prices in this response."
          />
        </div>
      ) : null}

      <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-col sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
        {result.data.map((listing, index) => (
          <div
            key={`${listing.identity.normalizedKey}-${index}`}
            className="w-[min(85vw,280px)] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            {renderCard(listing)}
          </div>
        ))}
      </div>
      <InlineSourceLine source={result.source} />
    </section>
  );
}
