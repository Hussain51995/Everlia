import { createHash, randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fingerprintParams, stableStringify } from "@/lib/property-intelligence/cache/keys";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export type FetchLockClaimResult =
  | {
      result: "claimed";
      lockId: string;
      ownerToken: string;
      expiresAt: string;
    }
  | {
      result: "waiting";
      lockId: string;
      ownerToken: string;
      expiresAt: string;
    }
  | {
      result: "taken";
      lockId: string;
      ownerToken: string;
      expiresAt: string;
    };

export type DedupeLockIdentity = {
  providerId: string;
  apiAccountScope: string;
  operation: string;
  category: PropertyDataCategory;
  normalizedIdentityKey: string;
  requestParamsFingerprint: string;
  accessScope: string;
};

export function buildFetchLockKey(identity: DedupeLockIdentity): string {
  const material = stableStringify({
    providerId: identity.providerId,
    apiAccountScope: identity.apiAccountScope,
    operation: identity.operation,
    category: identity.category,
    normalizedIdentityKey: identity.normalizedIdentityKey,
    requestParamsFingerprint: identity.requestParamsFingerprint,
    accessScope: identity.accessScope,
  });
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 40);
  return `pi-fetch:${identity.providerId}:${identity.category}:${hash}`;
}

export function fingerprintDedupeParams(
  params: Record<string, unknown>
): string {
  return fingerprintParams(params);
}

export interface PropertyFetchDedupeRepository {
  tryClaim(input: {
    lockKey: string;
    providerId: string;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    requestParamsFingerprint: string;
    ownerToken: string;
    leaseSeconds?: number;
  }): Promise<FetchLockClaimResult>;

  complete(input: {
    lockKey: string;
    ownerToken: string;
    resultCacheId?: string | null;
  }): Promise<boolean>;

  fail(input: {
    lockKey: string;
    ownerToken: string;
    errorSanitized?: string | null;
  }): Promise<boolean>;
}

type MemoryLock = {
  id: string;
  lockKey: string;
  providerId: string;
  category: PropertyDataCategory;
  normalizedIdentityKey: string;
  requestParamsFingerprint: string;
  status: "claimed" | "completed" | "failed" | "expired";
  ownerToken: string;
  claimedAt: string;
  expiresAt: string;
  attemptCount: number;
  resultCacheId: string | null;
  lastErrorSanitized: string | null;
  updatedAt: string;
};

export class MemoryPropertyFetchDedupeRepository
  implements PropertyFetchDedupeRepository
{
  readonly locks = new Map<string, MemoryLock>();
  private chain: Promise<unknown> = Promise.resolve();
  now: () => Date = () => new Date();

  private async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async tryClaim(input: {
    lockKey: string;
    providerId: string;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    requestParamsFingerprint: string;
    ownerToken: string;
    leaseSeconds?: number;
  }): Promise<FetchLockClaimResult> {
    return this.withLock(() => {
      const now = this.now();
      const lease = Math.max(5, Math.min(input.leaseSeconds ?? 45, 300));
      const expiresAt = new Date(now.getTime() + lease * 1000).toISOString();
      const existing = this.locks.get(input.lockKey);

      if (!existing) {
        const row: MemoryLock = {
          id: randomUUID(),
          lockKey: input.lockKey,
          providerId: input.providerId,
          category: input.category,
          normalizedIdentityKey: input.normalizedIdentityKey,
          requestParamsFingerprint: input.requestParamsFingerprint,
          status: "claimed",
          ownerToken: input.ownerToken,
          claimedAt: now.toISOString(),
          expiresAt,
          attemptCount: 1,
          resultCacheId: null,
          lastErrorSanitized: null,
          updatedAt: now.toISOString(),
        };
        this.locks.set(input.lockKey, row);
        return {
          result: "claimed",
          lockId: row.id,
          ownerToken: row.ownerToken,
          expiresAt: row.expiresAt,
        };
      }

      if (
        existing.status === "claimed" &&
        Date.parse(existing.expiresAt) <= now.getTime()
      ) {
        existing.status = "expired";
        existing.updatedAt = now.toISOString();
      }

      if (
        existing.status === "claimed" &&
        Date.parse(existing.expiresAt) > now.getTime()
      ) {
        if (existing.ownerToken === input.ownerToken) {
          existing.expiresAt = expiresAt;
          existing.updatedAt = now.toISOString();
          return {
            result: "claimed",
            lockId: existing.id,
            ownerToken: existing.ownerToken,
            expiresAt: existing.expiresAt,
          };
        }
        return {
          result: "waiting",
          lockId: existing.id,
          ownerToken: existing.ownerToken,
          expiresAt: existing.expiresAt,
        };
      }

      if (
        existing.status === "completed" &&
        existing.resultCacheId &&
        Date.parse(existing.expiresAt) > now.getTime()
      ) {
        return {
          result: "taken",
          lockId: existing.id,
          ownerToken: existing.ownerToken,
          expiresAt: existing.expiresAt,
        };
      }

      existing.providerId = input.providerId;
      existing.category = input.category;
      existing.normalizedIdentityKey = input.normalizedIdentityKey;
      existing.requestParamsFingerprint = input.requestParamsFingerprint;
      existing.status = "claimed";
      existing.ownerToken = input.ownerToken;
      existing.claimedAt = now.toISOString();
      existing.expiresAt = expiresAt;
      existing.attemptCount += 1;
      existing.resultCacheId = null;
      existing.lastErrorSanitized = null;
      existing.updatedAt = now.toISOString();
      return {
        result: "claimed",
        lockId: existing.id,
        ownerToken: existing.ownerToken,
        expiresAt: existing.expiresAt,
      };
    });
  }

  async complete(input: {
    lockKey: string;
    ownerToken: string;
    resultCacheId?: string | null;
  }): Promise<boolean> {
    return this.withLock(() => {
      const row = this.locks.get(input.lockKey);
      if (!row || row.ownerToken !== input.ownerToken || row.status !== "claimed") {
        return false;
      }
      row.status = "completed";
      row.resultCacheId = input.resultCacheId ?? randomUUID();
      row.updatedAt = this.now().toISOString();
      return true;
    });
  }

  async fail(input: {
    lockKey: string;
    ownerToken: string;
    errorSanitized?: string | null;
  }): Promise<boolean> {
    return this.withLock(() => {
      const row = this.locks.get(input.lockKey);
      if (!row || row.ownerToken !== input.ownerToken || row.status !== "claimed") {
        return false;
      }
      row.status = "failed";
      row.lastErrorSanitized = input.errorSanitized ?? null;
      row.updatedAt = this.now().toISOString();
      return true;
    });
  }
}

export class SupabasePropertyFetchDedupeRepository
  implements PropertyFetchDedupeRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async tryClaim(input: {
    lockKey: string;
    providerId: string;
    category: PropertyDataCategory;
    normalizedIdentityKey: string;
    requestParamsFingerprint: string;
    ownerToken: string;
    leaseSeconds?: number;
  }): Promise<FetchLockClaimResult> {
    const { data, error } = await this.client.rpc(
      "property_intelligence_try_claim_fetch",
      {
        p_lock_key: input.lockKey,
        p_provider_id: input.providerId,
        p_category: input.category,
        p_normalized_identity_key: input.normalizedIdentityKey,
        p_request_params_fingerprint: input.requestParamsFingerprint,
        p_owner_token: input.ownerToken,
        p_lease_seconds: input.leaseSeconds ?? 45,
      }
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Empty claim result");
    return {
      result: row.result as FetchLockClaimResult["result"],
      lockId: String(row.lock_id),
      ownerToken: String(row.owner_token),
      expiresAt: String(row.expires_at),
    };
  }

  async complete(input: {
    lockKey: string;
    ownerToken: string;
    resultCacheId?: string | null;
  }): Promise<boolean> {
    const { data, error } = await this.client.rpc(
      "property_intelligence_complete_fetch",
      {
        p_lock_key: input.lockKey,
        p_owner_token: input.ownerToken,
        p_result_cache_id: input.resultCacheId ?? null,
      }
    );
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async fail(input: {
    lockKey: string;
    ownerToken: string;
    errorSanitized?: string | null;
  }): Promise<boolean> {
    const { data, error } = await this.client.rpc(
      "property_intelligence_fail_fetch",
      {
        p_lock_key: input.lockKey,
        p_owner_token: input.ownerToken,
        p_error_sanitized: input.errorSanitized ?? null,
      }
    );
    if (error) throw new Error(error.message);
    return Boolean(data);
  }
}
