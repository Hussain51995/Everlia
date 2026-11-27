import { createPropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import type { PropertyCacheService } from "@/lib/property-intelligence/cache/cache-service";
import { MemoryPropertyIdentityRepository } from "@/lib/property-intelligence/cache/identity-repository";
import {
  createMemoryCacheProvider,
  type MemoryCacheProvider,
} from "@/lib/property-intelligence/cache/provider";
import { MemoryPropertyCacheIndexStore } from "@/lib/property-intelligence/cache/provider/index-store";
import type { CacheServiceOptions } from "@/lib/property-intelligence/cache/types";

export function createTestPropertyCacheService(input?: {
  provider?: MemoryCacheProvider;
  options?: CacheServiceOptions;
  getInvalidationGeneration?: () => number | Promise<number>;
  environment?: string;
}): {
  cache: PropertyCacheService;
  provider: MemoryCacheProvider;
  indexStore: MemoryPropertyCacheIndexStore;
  identityRepo: MemoryPropertyIdentityRepository;
} {
  const provider =
    input?.provider ??
    createMemoryCacheProvider({
      now: input?.options?.now,
    });
  const indexStore = new MemoryPropertyCacheIndexStore();
  const identityRepo = new MemoryPropertyIdentityRepository();
  const cache = createPropertyCacheService({
    provider,
    identityRepo,
    indexStore,
    environment: input?.environment ?? "test",
    getInvalidationGeneration: input?.getInvalidationGeneration ?? (() => 1),
    options: input?.options,
  });
  return { cache, provider, indexStore, identityRepo };
}
