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
import { CompBarsCard } from "./CompBarsCard";
import { ValuationSection } from "./ValuationSection";
import { CategoryUnavailable } from "./CategoryState";
import { InsightsChartsSection } from "./charts/InsightsChartsSection";
import { Footer } from "@/components/sections/Footer";

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

  const topCount = (showValuation ? 1 : 0) + (showDetails ? 1 : 0);
  const nearbyCount = (showHouses ? 1 : 0) + (showLand ? 1 : 0);

  return (
    <section className="min-w-0 space-y-4 p-1 sm:space-y-5" aria-label="Property insights">
      <InsightsHeader
        customerFirstName={respond.customerFirstName}
        displayHint={bootstrap?.propertyDisplayHint}
      />
      {topCount > 0 ? (
        <div
          className={
            topCount > 1
              ? "grid items-stretch gap-3 sm:gap-4 lg:grid-cols-2"
              : "grid gap-3"
          }
        >
          {showValuation ? (
            <ValuationSection
              result={valuation}
              showComparablesList
              showCompBars={!(topCount > 1 && showDetails)}
            />
          ) : null}
          {showDetails ? (
            topCount > 1 && showValuation ? (
              <div className="grid gap-3 self-stretch">
                <PropertyDetailsSection result={details} />
                {valuation?.status === "available" && valuation.data ? (
                  <CompBarsCard valuation={valuation.data} />
                ) : null}
              </div>
            ) : (
              <PropertyDetailsSection result={details} />
            )
          ) : null}
        </div>
      ) : null}

      <InsightsChartsSection
        valuation={showValuation ? valuation : null}
        market={showMarket ? market : null}
        nearbyHouses={showHouses ? houses : null}
      />

      {showMarket ? <MarketStatisticsSection result={market} /> : null}

      {nearbyCount > 0 ? (
        <div
          className={
            nearbyCount > 1
              ? "grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2"
              : "grid min-w-0 gap-3"
          }
        >
          {showHouses ? <NearbyHousesSection result={houses} /> : null}
          {showLand ? <NearbyLandSection result={land} /> : null}
        </div>
      ) : null}

      <AgentContactSection respond={respond} />

      <div className="-mx-3 overflow-hidden rounded-2xl border border-[#E5F4F8] sm:-mx-4 lg:-mx-5">
        <Footer />
      </div>
    </section>
  );
}
