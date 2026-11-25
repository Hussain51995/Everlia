import {
  normalizeMoney,
  normalizePropertyAddress,
  normalizePropertyType,
} from "@/lib/property-intelligence/normalize";
import type {
  MarketStatistics,
  PropertyDetails,
  PropertyLookup,
  PropertyValuation,
} from "@/lib/types/property-intelligence";
import type {
  AltavistaRawDetails,
  AltavistaRawMarket,
  AltavistaRawValuation,
} from "./raw";

function mapStructureKind(kind: string) {
  if (kind === "DetachedResidence") return normalizePropertyType("Single Family");
  return normalizePropertyType(kind);
}

export function mapAltavistaDetails(
  raw: AltavistaRawDetails,
  lookup: PropertyLookup
): PropertyDetails {
  const bundle = raw.payload.bundle;
  const facts = bundle.home_facts;
  const parsed = normalizePropertyAddress(bundle.situs.full_line);
  const identity = {
    ...(parsed.components.line1 ? parsed : lookup.identity),
    providerPropertyId: bundle.av_property_id,
  };

  return {
    identity,
    specifications: {
      bedrooms: facts.bed_count,
      bathrooms: facts.bath_count,
      livingArea: { value: facts.living_sq_ft, unit: "sqft" },
      lotSize: { value: facts.lot_sq_ft, unit: "sqft" },
      yearBuilt: facts.yr_built,
      stories: null,
      garageSpaces: null,
      propertyType: mapStructureKind(facts.structure_kind),
    },
    county: bundle.geo_county,
    lastSaleDate: null,
    lastSalePrice: null,
  };
}

export function mapAltavistaValuation(
  raw: AltavistaRawValuation
): PropertyValuation {
  const node = raw.result_set.avm_node;
  return {
    estimate: normalizeMoney(node.value_usd),
    range: {
      low: normalizeMoney(node.band_low_usd),
      high: normalizeMoney(node.band_high_usd),
    },
    subjectDetails: null,
    comparables: [],
  };
}

export function mapAltavistaMarket(
  raw: AltavistaRawMarket
): MarketStatistics {
  const board = raw.market_pack.sale_board;
  return {
    zipCode: raw.market_pack.postal_key,
    sale: {
      averagePrice: normalizeMoney(board.avg_ask_usd),
      medianPrice: normalizeMoney(board.med_ask_usd),
      minPrice: null,
      maxPrice: null,
      averagePricePerSqft: normalizeMoney(board.ask_per_sqft_usd),
      medianPricePerSqft: null,
      averageDaysOnMarket: board.avg_dom,
      medianDaysOnMarket: null,
      totalListings: board.listing_total,
      newListings: board.listing_new,
    },
    rental: null,
    history: {
      series: raw.market_pack.history_rows.map((row) => ({
        periodStart: row.period_iso,
        metrics: {
          averagePrice: normalizeMoney(row.avg_ask_usd),
          medianPrice: normalizeMoney(row.med_ask_usd),
          minPrice: null,
          maxPrice: null,
          averagePricePerSqft: null,
          medianPricePerSqft: null,
          averageDaysOnMarket: null,
          medianDaysOnMarket: null,
          totalListings: null,
          newListings: null,
        },
      })),
    },
  };
}
