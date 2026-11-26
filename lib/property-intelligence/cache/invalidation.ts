import type { PropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { utcNowIso } from "@/lib/property-intelligence/cache/freshness";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export type CacheInvalidationTarget =
  | { scope: "property"; normalizedIdentityKey: string }
  | {
      scope: "category";
      category: PropertyDataCategory;
      normalizedIdentityKey?: string | null;
    }
  | { scope: "zip"; countryCode: string; zipCode: string }
  | { scope: "provider"; providerId: string }
  | { scope: "all" };

export type CacheInvalidationResult = {
  scope: CacheInvalidationTarget["scope"];
  invalidatedCount: number;
  triggeredProviderFetch: false;
  at: string;
  invalidationGeneration?: number;
};

export class PropertyCacheInvalidationService {
  constructor(
    private readonly cache: PropertyCacheService,
    private readonly now: () => Date = () => new Date()
  ) {}

  async invalidate(
    target: CacheInvalidationTarget
  ): Promise<CacheInvalidationResult> {
    const at = utcNowIso(this.now());
    let invalidatedCount = 0;

    switch (target.scope) {
      case "property":
        invalidatedCount = await this.cache.invalidateProperty(
          target.normalizedIdentityKey
        );
        break;
      case "category":
        invalidatedCount = await this.cache.invalidateCategory(
          target.category,
          target.normalizedIdentityKey ?? null
        );
        break;
      case "zip":
        invalidatedCount = await this.cache.invalidateZip({
          countryCode: target.countryCode,
          zipCode: target.zipCode,
        });
        break;
      case "provider":
        invalidatedCount = await this.cache.invalidateProvider(
          target.providerId
        );
        break;
      case "all":
        invalidatedCount = await this.cache.invalidateAll();
        break;
    }

    return {
      scope: target.scope,
      invalidatedCount,
      triggeredProviderFetch: false,
      at,
    };
  }
}

export function createCacheInvalidationService(
  cache: PropertyCacheService,
  now?: () => Date
): PropertyCacheInvalidationService {
  return new PropertyCacheInvalidationService(cache, now);
}
