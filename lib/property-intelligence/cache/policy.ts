import { computeExpiresAt, evaluateCacheFreshness } from "@/lib/property-intelligence/cache/freshness";
import {
  computeEffectiveExpiresAt,
  resolveEffectiveTtlSeconds,
} from "@/lib/property-intelligence/cache/policy-math";
import type {
  CacheFreshnessPolicy,
  CacheLookupResult,
  CacheRecord,
} from "@/lib/property-intelligence/cache/types";
import type {
  PropertyDataCategory,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";

export {
  computeEffectiveExpiresAt,
  resolveEffectiveTtlSeconds,
} from "@/lib/property-intelligence/cache/policy-math";

export function buildCategoryCachePolicy(input: {
  databaseTtlSeconds: number;
  maxDatabaseTtlSeconds?: number | null;
  categoryConfigVersion?: number;
  permitStaleDisplay?: boolean;
}): CacheFreshnessPolicy {
  return {
    databaseTtlSeconds: resolveEffectiveTtlSeconds(
      input.databaseTtlSeconds,
      input.maxDatabaseTtlSeconds
    ),
    maxDatabaseTtlSeconds: input.maxDatabaseTtlSeconds ?? null,
    categoryConfigVersion: input.categoryConfigVersion,
    permitStaleDisplay: input.permitStaleDisplay ?? false,
  };
}

export class PropertyCachePolicyService {
  computeWriteExpiry(input: {
    fetchedAt: Date | string;
    databaseTtlSeconds: number;
    maxDatabaseTtlSeconds?: number | null;
  }): { fetchedAt: string; expiresAt: string; ttlSeconds: number } {
    const fetchedAt =
      typeof input.fetchedAt === "string"
        ? new Date(input.fetchedAt)
        : input.fetchedAt;
    const ttlSeconds = resolveEffectiveTtlSeconds(
      input.databaseTtlSeconds,
      input.maxDatabaseTtlSeconds
    );
    return {
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: computeExpiresAt(fetchedAt, ttlSeconds),
      ttlSeconds,
    };
  }

  evaluateEffectiveExpiry(input: {
    fetchedAt: string;
    storedExpiresAt: string;
    policy?: CacheFreshnessPolicy | null;
  }) {
    return computeEffectiveExpiresAt(input);
  }

  evaluate(input: {
    record: CacheRecord | null | undefined;
    expected: {
      providerId: PropertyProviderId;
      category: PropertyDataCategory;
      cacheKey: string;
      schemaVersion?: number;
      accessScope?: string;
    };
    policy?: CacheFreshnessPolicy | null;
    now?: Date;
  }): CacheLookupResult {
    return evaluateCacheFreshness(input);
  }
}

export function createCachePolicyService(): PropertyCachePolicyService {
  return new PropertyCachePolicyService();
}
