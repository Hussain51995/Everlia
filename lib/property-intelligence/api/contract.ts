import type { PropertyIntelligenceResult } from "@/lib/types/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export type PropertyInsightsApiRequest = {
  categories?: PropertyDataCategory[];
};

export type PropertyInsightsApiResponse = {
  insights: PropertyIntelligenceResult;
};

export const PROPERTY_INSIGHTS_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

export function sanitizeInsightsForPublic(
  insights: PropertyIntelligenceResult
): PropertyIntelligenceResult {
  const categories = { ...insights.categories };
  for (const key of Object.keys(categories) as Array<
    keyof typeof categories
  >) {
    const entry = categories[key];
    if (entry.status === "disabled") {
      categories[key] = {
        ...entry,
        data: null,
        source: null,
        error: null,
        cache: null,
      };
    }
  }
  return { ...insights, categories };
}
