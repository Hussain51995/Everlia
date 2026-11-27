import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentBillingPeriodKey } from "@/lib/property-intelligence/execution/billing-period";
import { resolveProviderMonthlyBudget } from "@/lib/property-intelligence/execution/budget-config";
import { SupabasePropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";
import { UPSTASH_DASHBOARD_URL } from "@/lib/property-intelligence/settings/ttl-policy";

function unavailable(note: string) {
  return { available: false as const, value: null, note };
}

function measured(value: number, note: string) {
  return { available: true as const, value, note };
}

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const admin = createAdminClient();
    const settings = new SupabasePropertyIntelligenceSettingsRepository(admin);
    const config = await settings.getResolvedConfig();
    const billingPeriod = currentBillingPeriodKey();
    const configuredBudget = resolveProviderMonthlyBudget({
      settingsBudget: config.global.monthlyApiBudget,
    });

    const { data: counters } = await admin
      .from("property_intelligence_budget_counters")
      .select(
        "provider_id, api_account_scope, billing_period, units_reserved, units_consumed"
      )
      .eq("billing_period", billingPeriod);

    const { data: usageRows } = await admin
      .from("property_intelligence_usage")
      .select(
        "provider_id, endpoint_or_operation, outcome, units_reserved, units_consumed"
      )
      .eq("billing_period", billingPeriod)
      .limit(5000);

    const byProvider: Record<
      string,
      { reserved: number; consumed: number; succeeded: number; failed: number; budgetDenied: number }
    > = {};
    const byOperation: Record<
      string,
      { count: number; succeeded: number; failed: number }
    > = {};

    let succeeded = 0;
    let failed = 0;
    let budgetBlocked = 0;
    let skipped = 0;

    for (const row of usageRows ?? []) {
      const providerId = String(row.provider_id);
      const op = String(row.endpoint_or_operation);
      const outcome = String(row.outcome);
      if (!byProvider[providerId]) {
        byProvider[providerId] = {
          reserved: 0,
          consumed: 0,
          succeeded: 0,
          failed: 0,
          budgetDenied: 0,
        };
      }
      if (!byOperation[op]) {
        byOperation[op] = { count: 0, succeeded: 0, failed: 0 };
      }
      byOperation[op]!.count += 1;
      byProvider[providerId]!.reserved += Number(row.units_reserved ?? 0);
      byProvider[providerId]!.consumed += Number(row.units_consumed ?? 0);

      if (outcome === "succeeded") {
        succeeded += 1;
        byProvider[providerId]!.succeeded += 1;
        byOperation[op]!.succeeded += 1;
      } else if (outcome === "failed") {
        failed += 1;
        byProvider[providerId]!.failed += 1;
        byOperation[op]!.failed += 1;
      } else if (outcome === "budget_denied") {
        budgetBlocked += 1;
        byProvider[providerId]!.budgetDenied += 1;
      } else if (outcome === "skipped") {
        skipped += 1;
      }
    }

    const primary =
      (counters ?? []).find((c) => c.provider_id === "rentcast") ??
      (counters ?? [])[0];
    const unitsReserved = Number(primary?.units_reserved ?? 0);
    const unitsConsumed = Number(primary?.units_consumed ?? 0);
    const remaining = Math.max(0, configuredBudget - unitsReserved);

    const notAggregated =
      "Not aggregated into a durable rollup yet. Sampled in-process telemetry is not written per hit.";

    return apiSuccess({
      billingPeriod,
      configuredBudget,
      applicationLocal: {
        label: "Everlia application counters (not a verified RentCast ledger)",
        unitsReserved,
        unitsConsumed,
        remaining,
        counters: counters ?? [],
        successfulRequests: succeeded,
        failedRequests: failed,
        budgetBlockedRequests: budgetBlocked,
        skippedRequests: skipped,
        byProvider,
        byOperation,
      },
      cacheMetrics: {
        browserCacheHits: unavailable(
          "Browser L1 telemetry is sampled client-side and is not written per hit."
        ),
        browserCacheMisses: unavailable(
          "Browser L1 miss counts are sampled client-side only."
        ),
        redisCacheHits: unavailable(notAggregated),
        redisCacheMisses: unavailable(notAggregated),
        redisCacheHitRate: unavailable(
          "L2 hit rate requires durable aggregated counters (not enabled)."
        ),
        redisConnectionFailures: unavailable(
          "Operational Redis failures are logged server-side; durable rollup not enabled."
        ),
        redisWriteFailures: unavailable(
          "Write failures are recorded in-process / logs; durable rollup not enabled."
        ),
        externalProviderRequests: measured(
          succeeded + failed,
          "Succeeded + failed provider outcomes in the current billing period (Everlia usage table)."
        ),
        requestsAvoided: unavailable(
          "Endpoint optimization avoidances are in-process only."
        ),
        apiBudgetUsed: measured(
          unitsReserved,
          "Application-local units reserved for the billing period."
        ),
        apiBudgetRemaining: measured(
          remaining,
          "Configured budget minus reserved units."
        ),
        deduplicatedRequests: unavailable(
          "Dedup events are tracked in-process during requests; durable rollup not enabled."
        ),
      },
      upstashInfrastructure: {
        storageUsage: unavailable(
          "Not available via Everlia. See the Upstash console for storage metrics."
        ),
        commandUsage: unavailable(
          "Not available via Everlia. See the Upstash console for command usage."
        ),
        bandwidthUsage: unavailable(
          "Not available via Everlia. See the Upstash console for bandwidth."
        ),
        evictedKeys: unavailable(
          "Not available via Everlia. See the Upstash console for eviction stats."
        ),
        dashboardUrl: UPSTASH_DASHBOARD_URL,
      },
      measuredServerSide: {
        serverCacheHitRate: unavailable(
          "L2 (Redis) hit/miss rates are not aggregated into a durable metric yet."
        ),
        deduplicatedRequests: unavailable(
          "Dedup events are tracked in-process during requests; durable rollup not enabled."
        ),
        endpointOptimizationsAvoided: unavailable(
          "Optimization avoidances are in-process metrics only."
        ),
      },
      notMeasuredServerSide: {
        browserCacheHitRate: unavailable(
          "Browser L1 telemetry is sampled client-side and is not written per hit."
        ),
        verifiedProviderAccountUsage: unavailable(
          "Does not include RentCast usage outside Everlia. Verify the live account allowance separately."
        ),
      },
      note: "No savings figures are invented. Unavailable metrics are marked explicitly. Detailed Redis infrastructure stats are in the Upstash dashboard.",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load usage dashboard",
      },
      500
    );
  }
}
