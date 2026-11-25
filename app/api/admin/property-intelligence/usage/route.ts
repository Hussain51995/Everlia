import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentBillingPeriodKey } from "@/lib/property-intelligence/execution/billing-period";
import { resolveProviderMonthlyBudget } from "@/lib/property-intelligence/execution/budget-config";
import { SupabasePropertyIntelligenceSettingsRepository } from "@/lib/property-intelligence/settings/repository";

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

    return apiSuccess({
      billingPeriod,
      configuredBudget,
      applicationLocal: {
        label: "Everlia application counters (not a verified RentCast ledger)",
        unitsReserved,
        unitsConsumed,
        remaining: Math.max(0, configuredBudget - unitsReserved),
        counters: counters ?? [],
        successfulRequests: succeeded,
        failedRequests: failed,
        budgetBlockedRequests: budgetBlocked,
        skippedRequests: skipped,
        byProvider,
        byOperation,
      },
      measuredServerSide: {
        databaseCacheHitRate: {
          available: false,
          note: "L2 hit/miss rates are not aggregated into a durable metric yet.",
        },
        deduplicatedRequests: {
          available: false,
          note: "Dedup events are tracked in-process during requests; durable rollup not enabled.",
        },
        endpointOptimizationsAvoided: {
          available: false,
          note: "Optimization avoidances are in-process metrics only.",
        },
      },
      notMeasuredServerSide: {
        browserCacheHitRate: {
          available: false,
          note: "Browser L1 telemetry is sampled client-side and is not written per hit.",
        },
        verifiedProviderAccountUsage: {
          available: false,
          note: "Does not include RentCast usage outside Everlia. Verify the live account allowance separately.",
        },
      },
      note: "No savings figures are invented. Values above are application-local unless marked otherwise.",
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
