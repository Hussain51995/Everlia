"use client";

import { usePropertyInsights } from "@/hooks/property-intelligence/use-property-insights";
import type { PublicRespondPayload } from "@/lib/types/cards";
import type {
  MarketStatistics,
  NearbyListing,
  PropertyCategoryResult,
  PropertyDetails,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import { AgentContactSection } from "./AgentContactSection";
import { InsightsHeader } from "./InsightsHeader";
import { MarketStatisticsSection } from "./MarketStatisticsSection";
import {
  NearbyHousesSection,
  NearbyLandSection,
} from "./NearbyListingsSection";
import { PropertyDetailsSection } from "./PropertyDetailsSection";
import { SourceAttribution } from "./SourceAttribution";
import { ValuationSection } from "./ValuationSection";
import { CategoryUnavailable } from "./CategoryState";

export function PropertyInsightsExperience({
  token,
  respond,
}: {
  token: string;
  respond: PublicRespondPayload;
}) {
  const {
    data,
    featureEnabled,
    bootstrap,
    isFetching,
    isError,
  } = usePropertyInsights({ token, respond });

  if (!featureEnabled) return null;

  const enabled = bootstrap?.enabledCategories ?? [];
  if (enabled.length === 0) return null;

  const missingAddress = !bootstrap?.propertyIdentityKey;

  const categories = data?.categories;
  const showInitialLoading = !categories && (isFetching || !missingAddress);

  if (missingAddress) {
    return (
      <section className="space-y-4 p-1" aria-label="Property insights">
        <InsightsHeader customerFirstName={respond.customerFirstName} />
        <CategoryUnavailable label="Home insights" status="unavailable" />
        <AgentContactSection respond={respond} />
      </section>
    );
  }

  if (showInitialLoading && !categories) {
    return (
      <section className="space-y-4 p-1" aria-label="Property insights">
        <InsightsHeader
          customerFirstName={respond.customerFirstName}
          displayHint={bootstrap?.propertyDisplayHint}
        />
        <div
          className="grid gap-3 sm:grid-cols-2 lg:gap-4"
          aria-busy="true"
        >
          <div className="h-36 animate-pulse rounded-2xl bg-[#E8F7FB]" />
          <div className="h-36 animate-pulse rounded-2xl bg-[#E8F7FB]" />
          <div className="h-40 animate-pulse rounded-2xl bg-[#E8F7FB] sm:col-span-2" />
          <div className="h-32 animate-pulse rounded-2xl bg-[#E8F7FB] sm:col-span-2" />
        </div>
      </section>
    );
  }

  if (isError && !categories) {
    return (
      <section className="space-y-4 p-1" aria-label="Property insights">
        <InsightsHeader
          customerFirstName={respond.customerFirstName}
          displayHint={bootstrap?.propertyDisplayHint}
        />
        <CategoryUnavailable label="Home insights" status="error" />
        <AgentContactSection respond={respond} />
      </section>
    );
  }

  if (!categories) return null;

  const valuation = categories.property_valuation as PropertyCategoryResult<PropertyValuation>;
  const details = categories.property_details as PropertyCategoryResult<PropertyDetails>;
  const market = categories.market_statistics as PropertyCategoryResult<MarketStatistics>;
  const houses = categories.nearby_houses as PropertyCategoryResult<NearbyListing[]>;
  const land = categories.nearby_land as PropertyCategoryResult<NearbyListing[]>;

  const visibleOrder = enabled.filter((c) => categories[c]?.status !== "disabled");
  if (visibleOrder.length === 0) return null;

  const showValuation = enabled.includes("property_valuation");
  const showDetails = enabled.includes("property_details");
  const showMarket = enabled.includes("market_statistics");
  const showHouses = enabled.includes("nearby_houses");
  const showLand = enabled.includes("nearby_land");

  const sources = [
    valuation?.source,
    details?.source,
    market?.source,
    houses?.source,
    land?.source,
  ];

  return (
    <section className="space-y-4 p-1 sm:space-y-5" aria-label="Property insights">
      <InsightsHeader
        customerFirstName={respond.customerFirstName}
        displayHint={bootstrap?.propertyDisplayHint}
      />

      {/* Top row: valuation + details */}
      {showValuation || showDetails ? (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {showValuation ? <ValuationSection result={valuation} /> : null}
          {showDetails ? <PropertyDetailsSection result={details} /> : null}
        </div>
      ) : null}

      {/* Middle: nearby homes + land */}
      {showHouses || showLand ? (
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          {showHouses ? <NearbyHousesSection result={houses} /> : null}
          {showLand ? <NearbyLandSection result={land} /> : null}
        </div>
      ) : null}

      {/* Bottom: market + agent CTA */}
      {showMarket ? (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
          <MarketStatisticsSection
            result={market}
            valuation={showValuation ? valuation : null}
          />
          <AgentContactSection respond={respond} />
        </div>
      ) : (
        <AgentContactSection respond={respond} />
      )}

      <SourceAttribution sources={sources} />
    </section>
  );
}
