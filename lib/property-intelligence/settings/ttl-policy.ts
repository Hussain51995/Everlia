import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export const BROWSER_TTL_ALLOWLIST = [
  1800,
  3600,
  5400,
  7200,
  9000,
  10800,
] as const;

export type AllowedBrowserTtlSeconds = (typeof BROWSER_TTL_ALLOWLIST)[number];

export const MIN_BROWSER_TTL_SECONDS: AllowedBrowserTtlSeconds = 1800;
export const MAX_BROWSER_TTL_SECONDS: AllowedBrowserTtlSeconds = 10800;

export const BROWSER_TTL_LABELS: Record<AllowedBrowserTtlSeconds, string> = {
  1800: "30 minutes",
  3600: "1 hour",
  5400: "1.5 hours",
  7200: "2 hours",
  9000: "2.5 hours",
  10800: "3 hours",
};

export const DEFAULT_BROWSER_TTL_SECONDS: Record<
  PropertyDataCategory,
  AllowedBrowserTtlSeconds
> = {
  property_details: 10800,
  property_valuation: 10800,
  nearby_houses: 7200,
  nearby_land: 7200,
  market_statistics: 10800,
};

const DAY = 86_400;

export const REDIS_TTL_ALLOWLIST = [
  1 * DAY,
  2 * DAY,
  3 * DAY,
  5 * DAY,
  7 * DAY,
  14 * DAY,
  21 * DAY,
  30 * DAY,
  45 * DAY,
  60 * DAY,
  90 * DAY,
] as const;

export type AllowedRedisTtlSeconds = (typeof REDIS_TTL_ALLOWLIST)[number];

export const MIN_REDIS_TTL_SECONDS: AllowedRedisTtlSeconds = 1 * DAY;
export const MAX_REDIS_TTL_SECONDS: AllowedRedisTtlSeconds = 90 * DAY;

export const REDIS_TTL_LABELS: Record<AllowedRedisTtlSeconds, string> = {
  [1 * DAY]: "1 day",
  [2 * DAY]: "2 days",
  [3 * DAY]: "3 days",
  [5 * DAY]: "5 days",
  [7 * DAY]: "7 days",
  [14 * DAY]: "14 days",
  [21 * DAY]: "21 days",
  [30 * DAY]: "30 days",
  [45 * DAY]: "45 days",
  [60 * DAY]: "60 days",
  [90 * DAY]: "90 days",
};

export const DEFAULT_REDIS_TTL_SECONDS: Record<
  PropertyDataCategory,
  AllowedRedisTtlSeconds
> = {
  property_details: 90 * DAY,
  property_valuation: 30 * DAY,
  nearby_houses: 3 * DAY,
  nearby_land: 7 * DAY,
  market_statistics: 30 * DAY,
};

export function isAllowedBrowserTtlSeconds(
  value: number
): value is AllowedBrowserTtlSeconds {
  return (BROWSER_TTL_ALLOWLIST as readonly number[]).includes(
    Math.floor(value)
  );
}

export function assertAllowedBrowserTtlSeconds(
  value: number
): AllowedBrowserTtlSeconds {
  const n = Math.floor(value);
  if (!isAllowedBrowserTtlSeconds(n)) {
    throw new Error(
      `Browser TTL must be one of: ${BROWSER_TTL_ALLOWLIST.join(", ")} seconds`
    );
  }
  return n;
}

export function coerceBrowserTtlSeconds(
  value: number
): AllowedBrowserTtlSeconds {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return MIN_BROWSER_TTL_SECONDS;
  if (isAllowedBrowserTtlSeconds(n)) return n;
  if (n >= MAX_BROWSER_TTL_SECONDS) return MAX_BROWSER_TTL_SECONDS;
  let best: AllowedBrowserTtlSeconds = MIN_BROWSER_TTL_SECONDS;
  for (const allowed of BROWSER_TTL_ALLOWLIST) {
    if (allowed <= n) best = allowed;
  }
  return best;
}

export function isAllowedRedisTtlSeconds(
  value: number
): value is AllowedRedisTtlSeconds {
  return (REDIS_TTL_ALLOWLIST as readonly number[]).includes(Math.floor(value));
}

export function assertAllowedRedisTtlSeconds(
  value: number
): AllowedRedisTtlSeconds {
  const n = Math.floor(value);
  if (!isAllowedRedisTtlSeconds(n)) {
    throw new Error(
      `Redis TTL must be one of: ${REDIS_TTL_ALLOWLIST.join(", ")} seconds`
    );
  }
  return n;
}

export function coerceRedisTtlSeconds(value: number): AllowedRedisTtlSeconds {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return MIN_REDIS_TTL_SECONDS;
  if (isAllowedRedisTtlSeconds(n)) return n;
  if (n >= MAX_REDIS_TTL_SECONDS) return MAX_REDIS_TTL_SECONDS;
  let best: AllowedRedisTtlSeconds = MIN_REDIS_TTL_SECONDS;
  for (const allowed of REDIS_TTL_ALLOWLIST) {
    if (allowed <= n) best = allowed;
  }
  return best;
}

export function maxBrowserExpiryIso(writtenAt: string | Date): string {
  const written =
    typeof writtenAt === "string" ? Date.parse(writtenAt) : writtenAt.getTime();
  const base = Number.isFinite(written) ? written : Date.now();
  return new Date(base + MAX_BROWSER_TTL_SECONDS * 1000).toISOString();
}

export function getRecommendedTtlDefaults(category: PropertyDataCategory): {
  browserTtlSeconds: AllowedBrowserTtlSeconds;
  redisTtlSeconds: AllowedRedisTtlSeconds;
} {
  return {
    browserTtlSeconds: DEFAULT_BROWSER_TTL_SECONDS[category],
    redisTtlSeconds: DEFAULT_REDIS_TTL_SECONDS[category],
  };
}

export function secondsToDays(seconds: number): number {
  return Math.round(seconds / DAY);
}

export function daysToSeconds(days: number): number {
  return Math.floor(days) * DAY;
}

export function formatTtlSeconds(seconds: number): string {
  if (isAllowedBrowserTtlSeconds(seconds)) {
    return BROWSER_TTL_LABELS[seconds];
  }
  if (isAllowedRedisTtlSeconds(seconds)) {
    return REDIS_TTL_LABELS[seconds];
  }
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < DAY) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / DAY)}d`;
}

export const UPSTASH_DASHBOARD_URL = "https://console.upstash.com/";
