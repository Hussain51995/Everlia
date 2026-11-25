import type { CacheRecord } from "@/lib/property-intelligence/cache/types";
import {
  DEFAULT_ACCESS_SCOPE,
  PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION,
  type CacheFreshnessPolicy,
  type CacheLookupResult,
  type CacheNegativePayload,
  type CachePayload,
} from "@/lib/property-intelligence/cache/types";
import {
  computeEffectiveExpiresAt,
  resolveEffectiveTtlSeconds,
} from "@/lib/property-intelligence/cache/policy-math";
import type {
  PropertyDataCategory,
  PropertyProviderId,
} from "@/lib/types/property-intelligence";

const FORBIDDEN_PAYLOAD_KEYS = [
  "organization_id",
  "customer_id",
  "greeting_card_id",
  "qr_token",
  "personal_message",
  "api_key",
  "access_token",
  "customer_name",
  "first_name",
  "last_name",
  "email",
  "phone",
] as const;

export function isNegativePayload(
  payload: CachePayload
): payload is CacheNegativePayload {
  return (
    !!payload &&
    typeof payload === "object" &&
    (payload as CacheNegativePayload).kind === "negative"
  );
}

export function assertSafeCachePayload(payload: CachePayload): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Cache payload must be a plain object");
  }
  for (const key of FORBIDDEN_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      throw new Error(`Cache payload must not include private key: ${key}`);
    }
  }
}

export function evaluateCacheFreshness(input: {
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
  const now = input.now ?? new Date();
  const schemaVersion =
    input.expected.schemaVersion ?? PROPERTY_INTELLIGENCE_DOMAIN_SCHEMA_VERSION;
  const accessScope = input.expected.accessScope ?? DEFAULT_ACCESS_SCOPE;
  const record = input.record;
  const configVersion = input.policy?.categoryConfigVersion;

  if (!record) {
    return { status: "miss", reason: "not_found", categoryConfigVersion: configVersion };
  }

  if (record.cacheKey !== input.expected.cacheKey) {
    return {
      status: "miss",
      reason: "not_found",
      record,
      categoryConfigVersion: configVersion,
    };
  }

  if (record.providerId !== input.expected.providerId) {
    return {
      status: "miss",
      reason: "provider_mismatch",
      record,
      categoryConfigVersion: configVersion,
    };
  }

  if (record.category !== input.expected.category) {
    return {
      status: "miss",
      reason: "not_found",
      record,
      categoryConfigVersion: configVersion,
    };
  }

  if (record.schemaVersion !== schemaVersion) {
    return {
      status: "miss",
      reason: "schema_mismatch",
      record,
      categoryConfigVersion: configVersion,
    };
  }

  if (record.accessScope !== accessScope) {
    return {
      status: "miss",
      reason: "scope_mismatch",
      record,
      categoryConfigVersion: configVersion,
    };
  }

  if (record.status === "invalidated" || record.invalidatedAt) {
    return {
      status: "miss",
      reason: "invalidated",
      record,
      categoryConfigVersion: configVersion,
    };
  }

  const effective = computeEffectiveExpiresAt({
    fetchedAt: record.fetchedAt,
    storedExpiresAt: record.expiresAt,
    policy: input.policy
      ? {
          databaseTtlSeconds: resolveEffectiveTtlSeconds(
            input.policy.databaseTtlSeconds,
            input.policy.maxDatabaseTtlSeconds
          ),
          maxDatabaseTtlSeconds: input.policy.maxDatabaseTtlSeconds,
        }
      : null,
  });

  if (
    !Number.isFinite(effective.effectiveExpiresAtMs) ||
    effective.effectiveExpiresAtMs <= now.getTime()
  ) {
    if (input.policy?.permitStaleDisplay === true && record.payload) {
    }
    return {
      status: "miss",
      reason: "expired",
      record,
      effectiveExpiresAt: effective.effectiveExpiresAt,
      tightenedByConfig: effective.tightenedByConfig,
      categoryConfigVersion: configVersion,
    };
  }

  const remainingTtlSeconds = Math.max(
    0,
    Math.floor((effective.effectiveExpiresAtMs - now.getTime()) / 1000)
  );

  return {
    status: "hit",
    record,
    isNegative: isNegativePayload(record.payload),
    remainingTtlSeconds,
    effectiveExpiresAt: effective.effectiveExpiresAt,
    tightenedByConfig: effective.tightenedByConfig,
    categoryConfigVersion: configVersion,
  };
}

export function computeExpiresAt(
  fetchedAt: Date,
  ttlSeconds: number
): string {
  const ms = Math.max(1, ttlSeconds) * 1000;
  return new Date(fetchedAt.getTime() + ms).toISOString();
}

export function utcNowIso(now = new Date()): string {
  return now.toISOString();
}

export { resolveEffectiveTtlSeconds, computeEffectiveExpiresAt };
