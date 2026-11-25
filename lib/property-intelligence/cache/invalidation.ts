import type { PropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import { utcNowIso } from "@/lib/property-intelligence/cache/freshness";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export type CacheInvalidationTarget =
  | { scope: "property"; normalizedIdentityKey: string }
  | { scope: "category"; category: PropertyDataCategory; normalizedIdentityKey?: string | null }
  | { scope: "zip"; countryCode: string; zipCode: string }
  | { scope: "provider"; providerId: string }
  | { scope: "all" };

export type CacheInvalidationResult = {
  scope: CacheInvalidationTarget["scope"];
  invalidatedCount: number;
  triggeredProviderFetch: false;
  at: string;
};

export class PropertyCacheInvalidationService {
  constructor(
    private readonly cacheRepo: PropertyCacheRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async invalidate(
    target: CacheInvalidationTarget
  ): Promise<CacheInvalidationResult> {
    const at = utcNowIso(this.now());
    let invalidatedCount = 0;

    switch (target.scope) {
      case "property":
        invalidatedCount = await this.cacheRepo.invalidateByIdentityKey(
          target.normalizedIdentityKey,
          at
        );
        break;
      case "category":
        invalidatedCount = await this.cacheRepo.invalidateByCategory(
          target.category,
          target.normalizedIdentityKey ?? null,
          at
        );
        break;
      case "zip": {
        const prefix = `market:${target.countryCode.toUpperCase()}:${target.zipCode.trim()}`;
        invalidatedCount = await this.cacheRepo.invalidateByIdentityKeyPrefix(
          prefix,
          at
        );
        break;
      }
      case "provider":
        invalidatedCount = await this.cacheRepo.invalidateByProvider(
          target.providerId,
          at
        );
        break;
      case "all":
        invalidatedCount = await this.cacheRepo.invalidateAll(at);
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
  cacheRepo: PropertyCacheRepository,
  now?: () => Date
): PropertyCacheInvalidationService {
  return new PropertyCacheInvalidationService(cacheRepo, now);
}
