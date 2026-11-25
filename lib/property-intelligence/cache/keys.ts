import { createHash } from "crypto";
import type {
  NearbyListingsQuery,
  PropertyDataCategory,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";
import {
  DEFAULT_ACCESS_SCOPE,
  PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION,
  type BuiltCacheKey,
  type CacheKeyInput,
  type CacheRequestParams,
  type ListingsCacheParams,
  type MarketCacheParams,
} from "@/lib/property-intelligence/cache/types";

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      if (v === undefined) continue;
      out[key] = sortValue(v);
    }
    return out;
  }
  return value;
}

export function fingerprintParams(params: CacheRequestParams): string {
  return createHash("sha256")
    .update(stableStringify(params ?? {}))
    .digest("hex")
    .slice(0, 32);
}

export function buildCacheKey(input: CacheKeyInput): BuiltCacheKey {
  const schemaVersion =
    input.schemaVersion ?? PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION;
  const accessScope = input.accessScope ?? DEFAULT_ACCESS_SCOPE;
  const providerDataset = input.providerDataset ?? null;
  const requestParams = normalizeRequestParams(input.requestParams ?? {});
  const requestParamsFingerprint = fingerprintParams(requestParams);

  const cacheKey = [
    "pi",
    String(schemaVersion),
    accessScope,
    input.providerId,
    providerDataset ?? "-",
    input.category,
    input.normalizedIdentityKey,
    requestParamsFingerprint,
  ].join("::");

  return {
    cacheKey,
    requestParamsFingerprint,
    normalizedIdentityKey: input.normalizedIdentityKey,
    schemaVersion,
    accessScope,
    providerDataset,
    requestParams,
  };
}

function normalizeRequestParams(
  params: CacheRequestParams
): CacheRequestParams {
  const out: CacheRequestParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function buildPropertyDetailsCacheKey(input: {
  providerId: PropertyProviderId;
  normalizedIdentityKey: string;
  providerDataset?: string | null;
  params?: CacheRequestParams;
  schemaVersion?: number;
  accessScope?: string;
}): BuiltCacheKey {
  return buildCacheKey({
    providerId: input.providerId,
    providerDataset: input.providerDataset,
    category: "property_details",
    normalizedIdentityKey: input.normalizedIdentityKey,
    requestParams: input.params ?? {},
    schemaVersion: input.schemaVersion,
    accessScope: input.accessScope,
  });
}

export function buildPropertyValuationCacheKey(input: {
  providerId: PropertyProviderId;
  normalizedIdentityKey: string;
  providerDataset?: string | null;
  valuationParams?: CacheRequestParams;
  schemaVersion?: number;
  accessScope?: string;
}): BuiltCacheKey {
  return buildCacheKey({
    providerId: input.providerId,
    providerDataset: input.providerDataset,
    category: "property_valuation",
    normalizedIdentityKey: input.normalizedIdentityKey,
    requestParams: {
      compCount: 5,
      ...(input.valuationParams ?? {}),
    },
    schemaVersion: input.schemaVersion,
    accessScope: input.accessScope,
  });
}

export function buildNearbyListingsCacheKey(input: {
  providerId: PropertyProviderId;
  category: Extract<PropertyDataCategory, "nearby_houses" | "nearby_land">;
  searchCenterKey: string;
  query: ListingsCacheParams | NearbyListingsQuery;
  providerDataset?: string | null;
  schemaVersion?: number;
  accessScope?: string;
}): BuiltCacheKey {
  const q = input.query as ListingsCacheParams;
  return buildCacheKey({
    providerId: input.providerId,
    providerDataset: input.providerDataset,
    category: input.category,
    normalizedIdentityKey: `search:${input.searchCenterKey}`,
    requestParams: {
      kind: q.kind,
      radiusMiles: q.radiusMiles,
      limit: q.limit,
      status: q.status ?? "active",
      propertyTypes: q.propertyTypes ?? null,
      filters: q.filters ?? {},
    },
    schemaVersion: input.schemaVersion,
    accessScope: input.accessScope,
  });
}

export function buildMarketStatisticsCacheKey(input: {
  providerId: PropertyProviderId;
  market: MarketCacheParams;
  providerDataset?: string | null;
  schemaVersion?: number;
  accessScope?: string;
}): BuiltCacheKey {
  const country = input.market.countryCode.toUpperCase();
  const zip = input.market.zipCode.trim();
  return buildCacheKey({
    providerId: input.providerId,
    providerDataset: input.providerDataset,
    category: "market_statistics",
    normalizedIdentityKey: `market:${country}:${zip}`,
    requestParams: {
      countryCode: country,
      zipCode: zip,
      dataType: input.market.dataType ?? "All",
    },
    schemaVersion: input.schemaVersion,
    accessScope: input.accessScope,
  });
}
