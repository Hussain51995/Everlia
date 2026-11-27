import type { CacheFreshnessPolicy } from "@/lib/property-intelligence/cache/types";

export function resolveEffectiveTtlSeconds(
  redisTtlSeconds: number,
  maxRedisTtlSeconds?: number | null
): number {
  const admin = Math.max(1, Math.floor(redisTtlSeconds));
  if (
    maxRedisTtlSeconds == null ||
    !Number.isFinite(maxRedisTtlSeconds) ||
    maxRedisTtlSeconds <= 0
  ) {
    return admin;
  }
  return Math.min(admin, Math.floor(maxRedisTtlSeconds));
}

export function computeEffectiveExpiresAt(input: {
  fetchedAt: string;
  storedExpiresAt: string;
  policy?: Pick<
    CacheFreshnessPolicy,
    "redisTtlSeconds" | "maxRedisTtlSeconds"
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
    input.policy.redisTtlSeconds,
    input.policy.maxRedisTtlSeconds
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
