import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import type {
  CacheRecord,
  StoreCacheInput,
} from "@/lib/property-intelligence/cache/types";

export type CacheCleanupSelectOptions = {
  nowIso: string;
  limit: number;
  expiredBeforeIso?: string;
  invalidatedBeforeIso?: string;
  obsoleteSchemaVersion?: number;
  negativeOnly?: boolean;
};

export interface PropertyCacheRepository {
  getByCacheKey(cacheKey: string): Promise<CacheRecord | null>;
  getByCacheKeys(cacheKeys: string[]): Promise<CacheRecord[]>;
  upsert(input: StoreCacheInput): Promise<CacheRecord>;
  invalidateByCacheKeys(cacheKeys: string[], at: string): Promise<number>;
  invalidateByIdentityKey(
    normalizedIdentityKey: string,
    at: string
  ): Promise<number>;
  invalidateByProvider(providerId: string, at: string): Promise<number>;
  invalidateByCategory(
    category: PropertyDataCategory,
    normalizedIdentityKey: string | null,
    at: string
  ): Promise<number>;
  invalidateByIdentityKeyPrefix(
    prefix: string,
    at: string
  ): Promise<number>;
  invalidateAll(at: string): Promise<number>;
  deleteByIds(ids: string[]): Promise<number>;
  listCleanupCandidates(
    options: CacheCleanupSelectOptions
  ): Promise<CacheRecord[]>;
  searchByIdentityKeyPrefix(
    prefix: string,
    limit?: number
  ): Promise<CacheRecord[]>;
  listRecent(limit?: number): Promise<CacheRecord[]>;
}

function toCacheRecord(row: Record<string, unknown>): CacheRecord {
  return {
    id: String(row.id),
    cacheKey: String(row.cache_key),
    providerId: String(row.provider_id),
    providerDataset: (row.provider_dataset as string) ?? null,
    category: row.category as PropertyDataCategory,
    identityId: (row.identity_id as string) ?? null,
    normalizedIdentityKey: String(row.normalized_identity_key),
    requestParams: (row.request_params as Record<string, unknown>) ?? {},
    requestParamsFingerprint: String(row.request_params_fingerprint),
    payload: row.payload as CacheRecord["payload"],
    schemaVersion: Number(row.schema_version),
    accessScope: String(row.access_scope),
    fetchedAt: String(row.fetched_at),
    expiresAt: String(row.expires_at),
    sourceDataAt: (row.source_data_at as string) ?? null,
    status: row.status as "active" | "invalidated",
    invalidatedAt: (row.invalidated_at as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class MemoryPropertyCacheRepository implements PropertyCacheRepository {
  readonly rows = new Map<string, CacheRecord>();
  private writeChain: Promise<void> = Promise.resolve();

  private async withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = this.writeChain.then(fn, fn);
    this.writeChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async getByCacheKey(cacheKey: string): Promise<CacheRecord | null> {
    return this.rows.get(cacheKey) ?? null;
  }

  async getByCacheKeys(cacheKeys: string[]): Promise<CacheRecord[]> {
    const out: CacheRecord[] = [];
    for (const key of cacheKeys) {
      const row = this.rows.get(key);
      if (row) out.push(row);
    }
    return out;
  }

  async upsert(input: StoreCacheInput): Promise<CacheRecord> {
    return this.withWriteLock(() => {
      const now = new Date().toISOString();
      const existing = this.rows.get(input.key.cacheKey);
      const record: CacheRecord = {
        id: existing?.id ?? randomUUID(),
        cacheKey: input.key.cacheKey,
        providerId: String(input.providerId),
        providerDataset: input.key.providerDataset,
        category: input.category,
        identityId: input.identityId ?? null,
        normalizedIdentityKey: input.key.normalizedIdentityKey,
        requestParams: input.key.requestParams,
        requestParamsFingerprint: input.key.requestParamsFingerprint,
        payload: input.payload,
        schemaVersion: input.key.schemaVersion,
        accessScope: input.key.accessScope,
        fetchedAt: input.fetchedAt,
        expiresAt: input.expiresAt,
        sourceDataAt: input.sourceDataAt ?? null,
        status: "active",
        invalidatedAt: null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      this.rows.set(record.cacheKey, record);
      return record;
    });
  }

  async invalidateByCacheKeys(
    cacheKeys: string[],
    at: string
  ): Promise<number> {
    return this.withWriteLock(() => {
      let n = 0;
      for (const key of cacheKeys) {
        const row = this.rows.get(key);
        if (row && row.status === "active") {
          this.rows.set(key, {
            ...row,
            status: "invalidated",
            invalidatedAt: at,
            updatedAt: at,
          });
          n += 1;
        }
      }
      return n;
    });
  }

  async invalidateByIdentityKey(
    normalizedIdentityKey: string,
    at: string
  ): Promise<number> {
    return this.invalidateMatching(
      (r) => r.normalizedIdentityKey === normalizedIdentityKey,
      at
    );
  }

  async invalidateByProvider(providerId: string, at: string): Promise<number> {
    return this.invalidateMatching((r) => r.providerId === providerId, at);
  }

  async invalidateByCategory(
    category: PropertyDataCategory,
    normalizedIdentityKey: string | null,
    at: string
  ): Promise<number> {
    return this.invalidateMatching(
      (r) =>
        r.category === category &&
        (normalizedIdentityKey === null ||
          r.normalizedIdentityKey === normalizedIdentityKey),
      at
    );
  }

  async invalidateByIdentityKeyPrefix(
    prefix: string,
    at: string
  ): Promise<number> {
    return this.invalidateMatching(
      (r) => r.normalizedIdentityKey.startsWith(prefix),
      at
    );
  }

  async invalidateAll(at: string): Promise<number> {
    return this.invalidateMatching(() => true, at);
  }

  async deleteByIds(ids: string[]): Promise<number> {
    return this.withWriteLock(() => {
      const idSet = new Set(ids);
      let n = 0;
      for (const [key, row] of this.rows) {
        if (idSet.has(row.id)) {
          this.rows.delete(key);
          n += 1;
        }
      }
      return n;
    });
  }

  async listCleanupCandidates(
    options: CacheCleanupSelectOptions
  ): Promise<CacheRecord[]> {
    const limit = Math.max(1, Math.min(options.limit, 1000));
    const out: CacheRecord[] = [];
    for (const row of this.rows.values()) {
      if (matchesCleanup(row, options)) {
        out.push(row);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  async searchByIdentityKeyPrefix(
    prefix: string,
    limit = 50
  ): Promise<CacheRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const out: CacheRecord[] = [];
    for (const row of this.rows.values()) {
      if (row.normalizedIdentityKey.startsWith(prefix)) {
        out.push(row);
        if (out.length >= capped) break;
      }
    }
    return out;
  }

  async listRecent(limit = 50): Promise<CacheRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    return [...this.rows.values()]
      .sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      )
      .slice(0, capped);
  }

  private async invalidateMatching(
    pred: (r: CacheRecord) => boolean,
    at: string
  ): Promise<number> {
    return this.withWriteLock(() => {
      let n = 0;
      for (const [key, row] of this.rows) {
        if (row.status === "active" && pred(row)) {
          this.rows.set(key, {
            ...row,
            status: "invalidated",
            invalidatedAt: at,
            updatedAt: at,
          });
          n += 1;
        }
      }
      return n;
    });
  }
}

function isNegativeRow(row: CacheRecord): boolean {
  const payload = row.payload as { kind?: string } | null;
  return !!payload && typeof payload === "object" && payload.kind === "negative";
}

function matchesCleanup(
  row: CacheRecord,
  options: CacheCleanupSelectOptions
): boolean {
  if (options.negativeOnly && !isNegativeRow(row)) return false;

  if (
    options.obsoleteSchemaVersion != null &&
    row.schemaVersion !== options.obsoleteSchemaVersion
  ) {
    return true;
  }

  if (options.expiredBeforeIso) {
    const expired =
      row.status === "active" &&
      Date.parse(row.expiresAt) <= Date.parse(options.expiredBeforeIso);
    if (expired) {
      if (options.negativeOnly) return isNegativeRow(row);
      return true;
    }
  }

  if (options.invalidatedBeforeIso && row.status === "invalidated") {
    const at = row.invalidatedAt ?? row.updatedAt;
    if (Date.parse(at) <= Date.parse(options.invalidatedBeforeIso)) {
      return true;
    }
  }

  return false;
}

export class SupabasePropertyCacheRepository
  implements PropertyCacheRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async getByCacheKey(cacheKey: string): Promise<CacheRecord | null> {
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCacheRecord(data as Record<string, unknown>) : null;
  }

  async getByCacheKeys(cacheKeys: string[]): Promise<CacheRecord[]> {
    if (cacheKeys.length === 0) return [];
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .select("*")
      .in("cache_key", cacheKeys);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toCacheRecord(row as Record<string, unknown>)
    );
  }

  async upsert(input: StoreCacheInput): Promise<CacheRecord> {
    const row = {
      cache_key: input.key.cacheKey,
      provider_id: input.providerId,
      provider_dataset: input.key.providerDataset,
      category: input.category,
      identity_id: input.identityId ?? null,
      normalized_identity_key: input.key.normalizedIdentityKey,
      request_params: input.key.requestParams,
      request_params_fingerprint: input.key.requestParamsFingerprint,
      payload: input.payload,
      schema_version: input.key.schemaVersion,
      access_scope: input.key.accessScope,
      fetched_at: input.fetchedAt,
      expires_at: input.expiresAt,
      source_data_at: input.sourceDataAt ?? null,
      status: "active",
      invalidated_at: null,
    };

    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .upsert(row, { onConflict: "cache_key" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toCacheRecord(data as Record<string, unknown>);
  }

  async invalidateByCacheKeys(
    cacheKeys: string[],
    at: string
  ): Promise<number> {
    if (cacheKeys.length === 0) return 0;
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .update({
        status: "invalidated",
        invalidated_at: at,
        updated_at: at,
      })
      .in("cache_key", cacheKeys)
      .eq("status", "active")
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async invalidateByIdentityKey(
    normalizedIdentityKey: string,
    at: string
  ): Promise<number> {
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .update({
        status: "invalidated",
        invalidated_at: at,
        updated_at: at,
      })
      .eq("normalized_identity_key", normalizedIdentityKey)
      .eq("status", "active")
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async invalidateByProvider(providerId: string, at: string): Promise<number> {
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .update({
        status: "invalidated",
        invalidated_at: at,
        updated_at: at,
      })
      .eq("provider_id", providerId)
      .eq("status", "active")
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async invalidateByCategory(
    category: PropertyDataCategory,
    normalizedIdentityKey: string | null,
    at: string
  ): Promise<number> {
    let query = this.client
      .from("property_intelligence_cache")
      .update({
        status: "invalidated",
        invalidated_at: at,
        updated_at: at,
      })
      .eq("category", category)
      .eq("status", "active");

    if (normalizedIdentityKey) {
      query = query.eq("normalized_identity_key", normalizedIdentityKey);
    }

    const { data, error } = await query.select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async invalidateByIdentityKeyPrefix(
    prefix: string,
    at: string
  ): Promise<number> {
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .update({
        status: "invalidated",
        invalidated_at: at,
        updated_at: at,
      })
      .like("normalized_identity_key", `${prefix}%`)
      .eq("status", "active")
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async invalidateAll(at: string): Promise<number> {
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .update({
        status: "invalidated",
        invalidated_at: at,
        updated_at: at,
      })
      .eq("status", "active")
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .delete()
      .in("id", ids)
      .select("id");
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async listCleanupCandidates(
    options: CacheCleanupSelectOptions
  ): Promise<CacheRecord[]> {
    const limit = Math.max(1, Math.min(options.limit, 1000));

    if (options.obsoleteSchemaVersion != null) {
      const { data, error } = await this.client
        .from("property_intelligence_cache")
        .select("*")
        .neq("schema_version", options.obsoleteSchemaVersion)
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) =>
        toCacheRecord(row as Record<string, unknown>)
      );
    }

    if (options.invalidatedBeforeIso) {
      const { data, error } = await this.client
        .from("property_intelligence_cache")
        .select("*")
        .eq("status", "invalidated")
        .lte("invalidated_at", options.invalidatedBeforeIso)
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) =>
        toCacheRecord(row as Record<string, unknown>)
      );
    }

    if (options.expiredBeforeIso) {
      let query = this.client
        .from("property_intelligence_cache")
        .select("*")
        .eq("status", "active")
        .lte("expires_at", options.expiredBeforeIso)
        .limit(limit);
      if (options.negativeOnly) {
        query = query.contains("payload", { kind: "negative" });
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) =>
        toCacheRecord(row as Record<string, unknown>)
      );
    }

    return [];
  }

  async searchByIdentityKeyPrefix(
    prefix: string,
    limit = 50
  ): Promise<CacheRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .select("*")
      .like("normalized_identity_key", `${prefix}%`)
      .order("updated_at", { ascending: false })
      .limit(capped);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toCacheRecord(row as Record<string, unknown>)
    );
  }

  async listRecent(limit = 50): Promise<CacheRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const { data, error } = await this.client
      .from("property_intelligence_cache")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(capped);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toCacheRecord(row as Record<string, unknown>)
    );
  }
}
