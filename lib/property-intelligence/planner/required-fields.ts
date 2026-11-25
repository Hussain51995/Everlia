import type {
  PropertyDataCategory,
  PropertyDetails,
  PropertyValuation,
} from "@/lib/types/property-intelligence";

export const PROPERTY_DETAILS_REQUIRED_COVERAGE = [
  "identity",
  "specifications.propertyType",
  "specifications.atLeastOneStructural",
] as const;

export function propertyDetailsSatisfiesRequiredCoverage(
  details: PropertyDetails | null | undefined
): boolean {
  if (!details) return false;
  if (!details.identity) return false;

  const hasLocationSignal = Boolean(
    details.identity.components.formatted ||
      details.identity.components.line1 ||
      details.identity.normalizedKey !== "UNKNOWN"
  );
  if (!hasLocationSignal) return false;

  const specs = details.specifications;
  if (!specs) return false;
  if (!specs.propertyType || specs.propertyType === "unknown") return false;

  const hasStructural =
    specs.bedrooms !== null ||
    specs.bathrooms !== null ||
    specs.livingArea !== null ||
    specs.lotSize !== null ||
    specs.yearBuilt !== null;

  return hasStructural;
}

export function extractDetailsFromValuation(
  valuation: PropertyValuation | null | undefined
): PropertyDetails | null {
  if (!valuation?.subjectDetails) return null;
  return valuation.subjectDetails;
}

export function incidentalDetailsAreComplete(
  valuation: PropertyValuation | null | undefined
): boolean {
  return propertyDetailsSatisfiesRequiredCoverage(
    extractDetailsFromValuation(valuation)
  );
}

export function isIncidentalPersistAllowed(
  category: PropertyDataCategory,
  categoryEnabled: boolean
): boolean {
  return categoryEnabled;
}
