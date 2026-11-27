
export {
  BROWSER_TTL_ALLOWLIST,
  BROWSER_TTL_LABELS,
  DEFAULT_BROWSER_TTL_SECONDS,
  MIN_BROWSER_TTL_SECONDS,
  MAX_BROWSER_TTL_SECONDS,
  isAllowedBrowserTtlSeconds,
  assertAllowedBrowserTtlSeconds,
  coerceBrowserTtlSeconds,
  maxBrowserExpiryIso,
  type AllowedBrowserTtlSeconds,
} from "@/lib/property-intelligence/settings/ttl-policy";
