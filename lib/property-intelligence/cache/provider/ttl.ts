import { resolveEffectiveTtlSeconds } from "@/lib/property-intelligence/cache/policy-math";
import { computeExpiresAt } from "@/lib/property-intelligence/cache/freshness";

export type RedisWriteTtlInput = {
  configuredTtlSeconds: number;
  maxProviderTtlSeconds?: number | null;
  fetchedAt: Date | string;
  sourceFreshnessDeadline?: string | null;
  providerRetentionDeadline?: string | null;
  now?: Date;
};

export type RedisWriteTtlResult = {
  ttlSeconds: number;
  expiresAt: string;
  fetchedAt: string;
};

export function resolveRedisWriteTtl(
  input: RedisWriteTtlInput
): RedisWriteTtlResult {
  const now = input.now ?? new Date();
  const fetchedAt =
    typeof input.fetchedAt === "string"
      ? new Date(input.fetchedAt)
      : input.fetchedAt;

  if (!Number.isFinite(fetchedAt.getTime())) {
    throw new Error("fetchedAt must be a valid timestamp");
  }

  const configured = resolveEffectiveTtlSeconds(
    input.configuredTtlSeconds,
    input.maxProviderTtlSeconds
  );

  let expiresAtMs = fetchedAt.getTime() + configured * 1000;

  for (const deadline of [
    input.sourceFreshnessDeadline,
    input.providerRetentionDeadline,
  ]) {
    if (!deadline) continue;
    const ms = Date.parse(deadline);
    if (Number.isFinite(ms)) {
      expiresAtMs = Math.min(expiresAtMs, ms);
    }
  }

  let ttlSeconds = Math.floor((expiresAtMs - now.getTime()) / 1000);

  if (ttlSeconds < 1) {
    ttlSeconds = 1;
    expiresAtMs = now.getTime() + 1000;
  }

  const ABSOLUTE_MAX_SECONDS = 90 * 24 * 60 * 60;
  ttlSeconds = Math.min(ttlSeconds, ABSOLUTE_MAX_SECONDS);

  return {
    ttlSeconds,
    expiresAt: new Date(expiresAtMs).toISOString(),
    fetchedAt: fetchedAt.toISOString(),
  };
}

export function remainingTtlSeconds(
  expiresAt: string,
  now = new Date()
): number {
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor((ms - now.getTime()) / 1000));
}

export function buildExpiresAtFromTtl(
  fetchedAt: Date | string,
  ttlSeconds: number
): string {
  const fetched =
    typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt;
  return computeExpiresAt(fetched, ttlSeconds);
}
