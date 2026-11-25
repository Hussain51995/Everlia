import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export const propertyIntelligenceKeys = {
  all: ["property-intelligence"] as const,
  respondBootstrap: (token: string) =>
    [...propertyIntelligenceKeys.all, "respond-bootstrap", token] as const,
  insights: (
    responseContextId: string,
    propertyIdentityKey: string | null,
    categories: PropertyDataCategory[]
  ) =>
    [
      ...propertyIntelligenceKeys.all,
      "insights",
      responseContextId,
      propertyIdentityKey,
      [...categories].sort().join(","),
    ] as const,
};
