import {
  buildWriteTimestamps,
  isBrowserRecordFresh,
  remainingBrowserTtlSeconds,
} from "@/lib/property-intelligence/browser/policy";
import {
  browserCacheStorageKey,
  BrowserStorageError,
  type BrowserCacheStorage,
} from "@/lib/property-intelligence/browser/storage";
import {
  BROWSER_CACHE_SCHEMA_VERSION,
  type BrowserCacheKeyParts,
  type BrowserCacheLookupResult,
  type BrowserCachePolicySnapshot,
  type BrowserCacheRecord,
  type BrowserCacheWriteInput,
  type ResponseContextId,
} from "@/lib/property-intelligence/browser/types";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import type { BrowserCacheTelemetry } from "@/lib/property-intelligence/browser/telemetry";

export type BrowserCacheServiceOptions = {
  storage: BrowserCacheStorage;
  now?: () => Date;
  telemetry?: BrowserCacheTelemetry;
  browserCachingEnabled?: boolean;
};

export class PropertyBrowserCacheService {
  private readonly now: () => Date;
  private browserCachingEnabled: boolean;

  constructor(
    private readonly storage: BrowserCacheStorage,
    options?: Omit<BrowserCacheServiceOptions, "storage">
  ) {
    this.now = options?.now ?? (() => new Date());
    this.browserCachingEnabled = options?.browserCachingEnabled ?? true;
    this.telemetry = options?.telemetry;
  }

  private readonly telemetry?: BrowserCacheTelemetry;

  setBrowserCachingEnabled(enabled: boolean) {
    this.browserCachingEnabled = enabled;
  }

  async get(
    parts: BrowserCacheKeyParts,
    expected?: {
      schemaVersion?: number;
      categoryConfigVersion?: number;
      invalidationVersion?: number;
      propertyIdentityKey?: string;
    }
  ): Promise<BrowserCacheLookupResult> {
    if (!this.browserCachingEnabled) {
      this.telemetry?.recordMiss("browser_caching_disabled");
      return { status: "miss", reason: "browser_caching_disabled" };
    }

    try {
      const key = browserCacheStorageKey(parts);
      const record = await this.storage.get(key);
      return this.evaluate(record, parts, expected);
    } catch (err) {
      this.telemetry?.recordMiss("storage_unavailable");
      if (err instanceof BrowserStorageError && err.code === "unavailable") {
        return { status: "miss", reason: "storage_unavailable" };
      }
      return { status: "miss", reason: "storage_unavailable" };
    }
  }

  async getMany(
    partsList: BrowserCacheKeyParts[],
    expected?: {
      schemaVersion?: number;
      categoryConfigVersions?: Partial<Record<PropertyDataCategory, number>>;
      invalidationVersion?: number;
      propertyIdentityKey?: string;
    }
  ): Promise<Map<PropertyDataCategory, BrowserCacheLookupResult>> {
    const results = new Map<PropertyDataCategory, BrowserCacheLookupResult>();
    if (!this.browserCachingEnabled) {
      for (const parts of partsList) {
        results.set(parts.category, {
          status: "miss",
          reason: "browser_caching_disabled",
        });
      }
      return results;
    }

    try {
      const keys = partsList.map(browserCacheStorageKey);
      const rows = await this.storage.getMany(keys);
      for (const parts of partsList) {
        const key = browserCacheStorageKey(parts);
        const expectedForCat = {
          schemaVersion: expected?.schemaVersion,
          categoryConfigVersion:
            expected?.categoryConfigVersions?.[parts.category],
          invalidationVersion: expected?.invalidationVersion,
          propertyIdentityKey: expected?.propertyIdentityKey,
        };
        results.set(
          parts.category,
          this.evaluate(rows.get(key) ?? null, parts, expectedForCat)
        );
      }
    } catch {
      for (const parts of partsList) {
        results.set(parts.category, {
          status: "miss",
          reason: "storage_unavailable",
        });
        this.telemetry?.recordMiss("storage_unavailable");
      }
    }
    return results;
  }

  async set(input: BrowserCacheWriteInput): Promise<BrowserCacheRecord | null> {
    if (!this.browserCachingEnabled) return null;

    const timestamps = buildWriteTimestamps(input);
    if (!isBrowserRecordFresh(timestamps.browserExpiresAt, input.now ?? this.now())) {
      return null;
    }

    let safeData: unknown;
    try {
      safeData = assertPublicSafeBrowserPayload(input.data);
    } catch {
      return null;
    }

    const record: BrowserCacheRecord = {
      responseContextId: input.responseContextId,
      propertyIdentityKey: input.propertyIdentityKey,
      category: input.category,
      providerId: input.providerId,
      schemaVersion: input.schemaVersion ?? BROWSER_CACHE_SCHEMA_VERSION,
      categoryConfigVersion: input.categoryConfigVersion,
      invalidationVersion: input.invalidationVersion,
      providerFetchedAt: input.providerFetchedAt,
      databaseExpiresAt: input.databaseExpiresAt,
      browserExpiresAt: timestamps.browserExpiresAt,
      data: safeData,
      writtenAt: timestamps.writtenAt,
    };

    const key = browserCacheStorageKey({
      responseContextId: record.responseContextId,
      propertyIdentityKey: record.propertyIdentityKey,
      category: record.category,
      providerId: record.providerId,
    });

    try {
      await this.storage.set(key, record);
      return record;
    } catch (err) {
      // Quota / IDB failures — continue with server cache only.
      if (err instanceof BrowserStorageError && err.code === "quota_exceeded") {
        try {
          await this.cleanupExpired({ limit: 50 });
          await this.storage.set(key, record);
          return record;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async invalidateCategory(
    parts: BrowserCacheKeyParts
  ): Promise<void> {
    try {
      await this.storage.delete(browserCacheStorageKey(parts));
    } catch {
    }
  }

  async invalidateResponseContext(
    responseContextId: ResponseContextId
  ): Promise<number> {
    try {
      return await this.storage.deleteByPrefix(`${responseContextId}|`);
    } catch {
      return 0;
    }
  }

  async invalidateIncompatibleSchema(
    currentSchemaVersion = BROWSER_CACHE_SCHEMA_VERSION,
    limit = 200
  ): Promise<number> {
    let removed = 0;
    try {
      const keys = await this.storage.listKeys(limit);
      for (const key of keys) {
        const row = await this.storage.get(key);
        if (row && row.schemaVersion !== currentSchemaVersion) {
          await this.storage.delete(key);
          removed += 1;
        }
      }
    } catch {
      return removed;
    }
    return removed;
  }

  async cleanupExpired(options?: { limit?: number; now?: Date }): Promise<number> {
    const limit = options?.limit ?? 100;
    const now = options?.now ?? this.now();
    let removed = 0;
    try {
      const keys = await this.storage.listKeys(limit * 2);
      for (const key of keys) {
        if (removed >= limit) break;
        const row = await this.storage.get(key);
        if (!row) continue;
        if (!isBrowserRecordFresh(row.browserExpiresAt, now)) {
          await this.storage.delete(key);
          removed += 1;
        }
      }
    } catch {
      return removed;
    }
    return removed;
  }

  async reconcileWithPolicy(
    responseContextId: ResponseContextId,
    policy: BrowserCachePolicySnapshot,
    propertyIdentityKey: string | null
  ): Promise<number> {
    let removed = 0;
    try {
      const keys = await this.storage.listKeys(500);
      const prefix = `${responseContextId}|`;
      for (const key of keys) {
        if (!key.startsWith(prefix)) continue;
        const row = await this.storage.get(key);
        if (!row) continue;

        const catPolicy = policy.categories[row.category];
        const drop =
          !policy.browserCachingEnabled ||
          !catPolicy?.enabled ||
          !catPolicy.browserCachingAllowed ||
          catPolicy.providerId !== row.providerId ||
          catPolicy.categoryConfigVersion !== row.categoryConfigVersion ||
          row.invalidationVersion !== policy.invalidationVersion ||
          row.schemaVersion !== policy.schemaVersion ||
          (propertyIdentityKey != null &&
            row.propertyIdentityKey !== propertyIdentityKey) ||
          !isBrowserRecordFresh(row.browserExpiresAt, this.now());

        if (drop) {
          await this.storage.delete(key);
          removed += 1;
        }
      }
    } catch {
      return removed;
    }
    return removed;
  }

  private evaluate(
    record: BrowserCacheRecord | null | undefined,
    parts: BrowserCacheKeyParts,
    expected?: {
      schemaVersion?: number;
      categoryConfigVersion?: number;
      invalidationVersion?: number;
      propertyIdentityKey?: string;
    }
  ): BrowserCacheLookupResult {
    if (!record) {
      this.telemetry?.recordMiss("not_found");
      return { status: "miss", reason: "not_found" };
    }

    if (record.responseContextId !== parts.responseContextId) {
      this.telemetry?.recordMiss("context_mismatch");
      return { status: "miss", reason: "context_mismatch", record };
    }

    if (record.category !== parts.category) {
      this.telemetry?.recordMiss("not_found");
      return { status: "miss", reason: "not_found", record };
    }

    if (record.providerId !== parts.providerId) {
      this.telemetry?.recordMiss("provider_mismatch");
      return { status: "miss", reason: "provider_mismatch", record };
    }

    if (
      expected?.propertyIdentityKey &&
      record.propertyIdentityKey !== expected.propertyIdentityKey
    ) {
      this.telemetry?.recordMiss("identity_mismatch");
      return { status: "miss", reason: "identity_mismatch", record };
    }

    const schema = expected?.schemaVersion ?? BROWSER_CACHE_SCHEMA_VERSION;
    if (record.schemaVersion !== schema) {
      this.telemetry?.recordMiss("schema_mismatch");
      return { status: "miss", reason: "schema_mismatch", record };
    }

    if (
      expected?.categoryConfigVersion != null &&
      record.categoryConfigVersion !== expected.categoryConfigVersion
    ) {
      this.telemetry?.recordMiss("config_mismatch");
      return { status: "miss", reason: "config_mismatch", record };
    }

    if (
      expected?.invalidationVersion != null &&
      record.invalidationVersion !== expected.invalidationVersion
    ) {
      this.telemetry?.recordMiss("invalidation");
      return { status: "miss", reason: "invalidation", record };
    }

    if (!isBrowserRecordFresh(record.browserExpiresAt, this.now())) {
      this.telemetry?.recordMiss("expired");
      void this.storage.delete(browserCacheStorageKey(parts)).catch(() => undefined);
      return { status: "miss", reason: "expired", record };
    }

    this.telemetry?.recordHit();
    return {
      status: "hit",
      record,
      remainingTtlSeconds: remainingBrowserTtlSeconds(
        record.browserExpiresAt,
        this.now()
      ),
    };
  }
}

export function createBrowserCacheService(
  options: BrowserCacheServiceOptions
): PropertyBrowserCacheService {
  return new PropertyBrowserCacheService(options.storage, options);
}

const FORBIDDEN_BROWSER_KEYS = [
  "organization_id",
  "customer_id",
  "greeting_card_id",
  "qr_token",
  "token",
  "personal_message",
  "api_key",
  "access_token",
  "customer_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "owner",
] as const;

export function assertPublicSafeBrowserPayload(data: unknown): unknown {
  if (data == null) return data;
  if (Array.isArray(data)) {
    return data.map((item) => assertPublicSafeBrowserPayload(item));
  }
  if (typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  for (const key of FORBIDDEN_BROWSER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`Browser cache payload must not include private key: ${key}`);
    }
  }
  return data;
}
