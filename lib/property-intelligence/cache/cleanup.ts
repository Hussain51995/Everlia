import type { PropertyCacheRepository } from "@/lib/property-intelligence/cache/cache-repository";
import type { PropertyFetchLockRepository } from "@/lib/property-intelligence/cache/fetch-locks";
import { utcNowIso } from "@/lib/property-intelligence/cache/freshness";
import { PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION } from "@/lib/property-intelligence/cache/types";

export type PropertyCacheCleanupConfig = {
  batchSize: number;
  expiredRetentionSeconds: number;
  invalidatedRetentionSeconds: number;
  terminalLockRetentionSeconds: number;
  currentSchemaVersion: number;
};

export const DEFAULT_CACHE_CLEANUP_CONFIG: PropertyCacheCleanupConfig = {
  batchSize: 100,
  expiredRetentionSeconds: 0,
  invalidatedRetentionSeconds: 7 * 24 * 60 * 60,
  terminalLockRetentionSeconds: 24 * 60 * 60,
  currentSchemaVersion: PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION,
};

export type PropertyCacheCleanupReport = {
  ranAt: string;
  expiredDeleted: number;
  negativeDeleted: number;
  invalidatedDeleted: number;
  obsoleteSchemaDeleted: number;
  locksExpired: number;
  terminalLocksDeleted: number;
  triggeredProviderFetch: false;
};

export class PropertyCacheCleanupService {
  constructor(
    private readonly cacheRepo: PropertyCacheRepository,
    private readonly lockRepo: PropertyFetchLockRepository,
    private readonly config: PropertyCacheCleanupConfig = DEFAULT_CACHE_CLEANUP_CONFIG,
    private readonly now: () => Date = () => new Date()
  ) {}

  async run(): Promise<PropertyCacheCleanupReport> {
    const now = this.now();
    const ranAt = utcNowIso(now);
    const batch = this.config.batchSize;

    const expiredBefore = new Date(
      now.getTime() - this.config.expiredRetentionSeconds * 1000
    ).toISOString();
    const invalidatedBefore = new Date(
      now.getTime() - this.config.invalidatedRetentionSeconds * 1000
    ).toISOString();
    const locksOlderThan = new Date(
      now.getTime() - this.config.terminalLockRetentionSeconds * 1000
    ).toISOString();

    const expired = await this.cacheRepo.listCleanupCandidates({
      nowIso: ranAt,
      limit: batch,
      expiredBeforeIso: expiredBefore,
    });
    const expiredDeleted = await this.cacheRepo.deleteByIds(
      expired.map((r) => r.id)
    );

    const negatives = await this.cacheRepo.listCleanupCandidates({
      nowIso: ranAt,
      limit: batch,
      expiredBeforeIso: expiredBefore,
      negativeOnly: true,
    });
    const negativeDeleted = await this.cacheRepo.deleteByIds(
      negatives.map((r) => r.id)
    );

    const invalidated = await this.cacheRepo.listCleanupCandidates({
      nowIso: ranAt,
      limit: batch,
      invalidatedBeforeIso: invalidatedBefore,
    });
    const invalidatedDeleted = await this.cacheRepo.deleteByIds(
      invalidated.map((r) => r.id)
    );

    const obsolete = await this.cacheRepo.listCleanupCandidates({
      nowIso: ranAt,
      limit: batch,
      obsoleteSchemaVersion: this.config.currentSchemaVersion,
    });
    const obsoleteSchemaDeleted = await this.cacheRepo.deleteByIds(
      obsolete.map((r) => r.id)
    );

    const locksExpired = await this.lockRepo.expireStaleLocks(batch, ranAt);
    const terminalLocksDeleted = await this.lockRepo.deleteTerminalLocks(
      locksOlderThan,
      batch
    );

    return {
      ranAt,
      expiredDeleted,
      negativeDeleted,
      invalidatedDeleted,
      obsoleteSchemaDeleted,
      locksExpired,
      terminalLocksDeleted,
      triggeredProviderFetch: false,
    };
  }
}

export function createCacheCleanupService(input: {
  cacheRepo: PropertyCacheRepository;
  lockRepo: PropertyFetchLockRepository;
  config?: Partial<PropertyCacheCleanupConfig>;
  now?: () => Date;
}): PropertyCacheCleanupService {
  return new PropertyCacheCleanupService(
    input.cacheRepo,
    input.lockRepo,
    { ...DEFAULT_CACHE_CLEANUP_CONFIG, ...input.config },
    input.now
  );
}
