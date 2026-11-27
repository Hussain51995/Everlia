import { createAltavistaProvider } from "@/lib/property-intelligence/providers/altavista/provider";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import { RENTCAST_CAPABILITIES } from "@/lib/property-intelligence/providers/rentcast/capabilities";
import {
  PROPERTY_DATA_CATEGORIES,
  type PropertyDataCategory,
  type PropertyProviderId,
  type ProviderCapability,
} from "@/lib/types/property-intelligence";

export type AdminProviderStatus = {
  id: PropertyProviderId;
  displayName: string;
  isMock: boolean;
  configured: boolean;
  configurationNote: string;
  selectable: boolean;
  supportedCategories: PropertyDataCategory[];
  capabilities: Array<{
    category: PropertyDataCategory;
    supported: boolean;
    requestCostUnits: number;
    maxRedisTtlSeconds: number | null;
    retentionNotes: string | null;
    endpointCoverage: string[];
    mayAlsoProvide: PropertyDataCategory[];
  }>;
};

function mapCapabilities(
  capabilities: ProviderCapability[]
): AdminProviderStatus["capabilities"] {
  return capabilities.map((c) => ({
    category: c.category,
    supported: c.supported,
    requestCostUnits: c.requestCostUnits ?? 1,
    maxRedisTtlSeconds: c.retention.maxRedisTtlSeconds,
    retentionNotes: c.retention.notes,
    endpointCoverage: c.endpointCoverage,
    mayAlsoProvide: c.mayAlsoProvide,
  }));
}

export function listAdminProviderCatalog(env: NodeJS.ProcessEnv = process.env): AdminProviderStatus[] {
  const rentcastConfigured = Boolean(env.RENTCAST_API_KEY?.trim());
  const mock = createMockProvider();

  const rentcastSupported = RENTCAST_CAPABILITIES.filter((c) => c.supported).map(
    (c) => c.category
  );

  const altavista = createAltavistaProvider();
  const altavistaSupported = altavista
    .capabilities()
    .filter((c) => c.supported)
    .map((c) => c.category);

  return [
    {
      id: "rentcast",
      displayName: "RentCast",
      isMock: false,
      configured: rentcastConfigured,
      configurationNote: rentcastConfigured
        ? "API key is configured on the server (value never shown)."
        : "RENTCAST_API_KEY is not set. Live requests remain unavailable.",
      selectable: true,
      supportedCategories: rentcastSupported,
      capabilities: mapCapabilities(RENTCAST_CAPABILITIES),
    },
    {
      id: "mock",
      displayName: mock.displayName,
      isMock: true,
      configured: true,
      configurationNote:
        "Development/testing only. Deterministic fixtures — no external network calls.",
      selectable: true,
      supportedCategories: [...PROPERTY_DATA_CATEGORIES],
      capabilities: mapCapabilities(mock.capabilities()),
    },
    {
      id: "altavista",
      displayName: altavista.displayName,
      isMock: true,
      configured: true,
      configurationNote:
        "Replacement-test fixture only. Different payload shape from RentCast — not a live vendor.",
      selectable: true,
      supportedCategories: altavistaSupported,
      capabilities: mapCapabilities(altavista.capabilities()),
    },
  ];
}

export function providerSupportsCategory(
  providerId: string,
  category: PropertyDataCategory,
  catalog = listAdminProviderCatalog()
): boolean {
  const provider = catalog.find((p) => p.id === providerId);
  if (!provider || !provider.selectable) return false;
  return provider.supportedCategories.includes(category);
}
