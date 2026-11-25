import type { CacheFreshnessPolicy } from "@/lib/property-intelligence/cache/types";

export function resolveEffectiveTtlSeconds(
  databaseTtlSeconds: number,
  maxDatabaseTtlSeconds?: number | null
): number {
  const admin = Math.max(1, Math.floor(databaseTtlSeconds));
  if (
    maxDatabaseTtlSeconds == null ||
    !Number.isFinite(maxDatabaseTtlSeconds) ||
    maxDatabaseTtlSeconds <= 0
  ) {
    return admin;
  }
  return Math.min(admin, Math.floor(maxDatabaseTtlSeconds));
}

export function computeEffectiveExpiresAt(input: {
  fetchedAt: string;
  storedExpiresAt: string;
  policy?: Pick<
    CacheFreshnessPolicy,
    "databaseTtlSeconds" | "maxDatabaseTtlSeconds"
  > | null;
}): {
  effectiveExpiresAt: string;
  storedExpiresAt: string;
  effectiveExpiresAtMs: number;
  storedExpiresAtMs: number;
  tightenedByConfig: boolean;
} {
  const fetchedMs = Date.parse(input.fetchedAt);
  const storedMs = Date.parse(input.storedExpiresAt);

  if (!Number.isFinite(fetchedMs) || !Number.isFinite(storedMs)) {
    return {
      effectiveExpiresAt: input.storedExpiresAt,
      storedExpiresAt: input.storedExpiresAt,
      effectiveExpiresAtMs: storedMs,
      storedExpiresAtMs: storedMs,
      tightenedByConfig: false,
    };
  }

  if (!input.policy) {
    return {
      effectiveExpiresAt: new Date(storedMs).toISOString(),
      storedExpiresAt: new Date(storedMs).toISOString(),
      effectiveExpiresAtMs: storedMs,
      storedExpiresAtMs: storedMs,
      tightenedByConfig: false,
    };
  }

  const ttlSeconds = resolveEffectiveTtlSeconds(
    input.policy.databaseTtlSeconds,
    input.policy.maxDatabaseTtlSeconds
  );
  const fromConfigMs = fetchedMs + ttlSeconds * 1000;
  const effectiveMs = Math.min(storedMs, fromConfigMs);

  return {
    effectiveExpiresAt: new Date(effectiveMs).toISOString(),
    storedExpiresAt: new Date(storedMs).toISOString(),
    effectiveExpiresAtMs: effectiveMs,
    storedExpiresAtMs: storedMs,
    tightenedByConfig: effectiveMs < storedMs,
  };
}
