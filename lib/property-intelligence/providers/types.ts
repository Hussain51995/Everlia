import type {
  MarketStatistics,
  NearbyListing,
  NearbyListingsQuery,
  PropertyDataCategory,
  PropertyDataSource,
  PropertyDetails,
  PropertyLookup,
  PropertyProviderId,
  PropertyValuation,
  ProviderCapability,
  ProviderOutcome,
} from "@/lib/types/property-intelligence";

export interface PropertyDataProvider {
  readonly id: PropertyProviderId;
  readonly displayName: string;
  readonly isMock: boolean;

  capabilities(): ProviderCapability[];
  getCapability(category: PropertyDataCategory): ProviderCapability | null;

  getPropertyDetails(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyDetails>>;

  getPropertyValuation(
    input: PropertyLookup
  ): Promise<ProviderOutcome<PropertyValuation>>;

  getNearbyResidentialListings(
    input: PropertyLookup,
    query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>>;

  getNearbyLandListings(
    input: PropertyLookup,
    query: NearbyListingsQuery
  ): Promise<ProviderOutcome<NearbyListing[]>>;

  getMarketStatistics(
    input: PropertyLookup
  ): Promise<ProviderOutcome<MarketStatistics>>;
}

export type CategoryProviderMap = Partial<
  Record<PropertyDataCategory, PropertyProviderId>
>;

export type ProviderRegistryConfig = {
  categoryProviders: CategoryProviderMap;
  defaultProviderId: PropertyProviderId;
};

export function buildDataSource(input: {
  providerId: PropertyProviderId;
  category: PropertyDataCategory;
  isMock: boolean;
  providerDataset?: string | null;
  sourceDataAt?: string | null;
  attribution?: string | null;
  freshnessLabel?: string | null;
  accessScope?: string;
  schemaVersion?: number;
  restrictions?: string[];
  retrievedAt?: string;
}): PropertyDataSource {
  return {
    providerId: input.providerId,
    providerDataset: input.providerDataset ?? null,
    category: input.category,
    retrievedAt: input.retrievedAt ?? new Date().toISOString(),
    sourceDataAt: input.sourceDataAt ?? null,
    attribution: input.attribution ?? null,
    freshnessLabel: input.freshnessLabel ?? null,
    accessScope: input.accessScope ?? "public_qr",
    schemaVersion: input.schemaVersion ?? 1,
    isMock: input.isMock,
    restrictions: input.restrictions ?? [],
  };
}
