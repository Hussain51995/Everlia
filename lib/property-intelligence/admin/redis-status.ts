import { resolveUpstashRedisConfig } from "@/lib/property-intelligence/cache/provider/config";
import { createPropertyIntelligenceCacheProvider } from "@/lib/property-intelligence/cache/provider/factory";
import { UPSTASH_DASHBOARD_URL } from "@/lib/property-intelligence/settings/ttl-policy";

export type RedisConnectionStatus =
  | "connected"
  | "not_configured"
  | "temporarily_unavailable";

export type PropertyIntelligenceRedisStatus = {
  infrastructure: "Upstash Redis";
  status: RedisConnectionStatus;
  environment: string | null;
  checkedAt: string | null;
  liveCheck: boolean;
  dashboardUrl: string;
  note: string;
};

export function getRedisConfigStatus(
  env: NodeJS.ProcessEnv = process.env
): PropertyIntelligenceRedisStatus {
  const config = resolveUpstashRedisConfig(env);
  if (!config.configured) {
    return {
      infrastructure: "Upstash Redis",
      status: "not_configured",
      environment: null,
      checkedAt: null,
      liveCheck: false,
      dashboardUrl: UPSTASH_DASHBOARD_URL,
      note: "Upstash Redis is not configured for this environment.",
    };
  }
  return {
    infrastructure: "Upstash Redis",
    status: "connected",
    environment: config.environment,
    checkedAt: null,
    liveCheck: false,
    dashboardUrl: UPSTASH_DASHBOARD_URL,
    note: "Credentials configured. Use the health check for a live ping (not run automatically on every render).",
  };
}

export async function pingRedisStatus(
  env: NodeJS.ProcessEnv = process.env
): Promise<PropertyIntelligenceRedisStatus> {
  const base = getRedisConfigStatus(env);
  if (base.status === "not_configured") {
    return { ...base, checkedAt: new Date().toISOString(), liveCheck: true };
  }

  try {
    const provider = createPropertyIntelligenceCacheProvider({
      backend: "redis",
      env,
    });
    const ping = await provider.ping();
    if (ping.ok) {
      return {
        ...base,
        status: "connected",
        checkedAt: new Date().toISOString(),
        liveCheck: true,
        note: `Live ping ok${ping.latencyMs != null ? ` (${ping.latencyMs}ms)` : ""}.`,
      };
    }
    return {
      ...base,
      status: "temporarily_unavailable",
      checkedAt: new Date().toISOString(),
      liveCheck: true,
      note: ping.error?.message ?? "Redis ping failed",
    };
  } catch (error) {
    return {
      ...base,
      status: "temporarily_unavailable",
      checkedAt: new Date().toISOString(),
      liveCheck: true,
      note: error instanceof Error ? error.message : "Redis ping failed",
    };
  }
}
