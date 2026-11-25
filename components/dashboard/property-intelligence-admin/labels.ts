import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export const CATEGORY_LABELS: Record<PropertyDataCategory, string> = {
  property_details: "Property Details",
  property_valuation: "Property Valuation",
  nearby_houses: "Nearby Houses",
  nearby_land: "Nearby Land",
  market_statistics: "Market Statistics",
};

export function categorySupportsRadius(
  category: PropertyDataCategory
): boolean {
  return category === "nearby_houses" || category === "nearby_land";
}

export function categorySupportsListingLimit(
  category: PropertyDataCategory
): boolean {
  return category === "nearby_houses" || category === "nearby_land";
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)}d`;
  return `${Math.round(seconds / 2592000)}mo`;
}
