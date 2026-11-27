import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  fetchPropertyDetails,
  fetchValuation,
  fetchNearbyHouses,
  fetchNearbyLand,
  fetchMarketStatistics,
  extractZipCode,
  estimateCallCount,
  type RentCastCategory,
  type TesterResponse,
  type CategoryResult,
} from "@/lib/rentcast/client";

import { resolveProviderMonthlyBudget } from "@/lib/property-intelligence/execution/budget-config";
import { currentBillingPeriodKey } from "@/lib/property-intelligence/execution/billing-period";

function getMonthlyBudget(): number {
  return resolveProviderMonthlyBudget();
}

function currentMonthKey(): string {
  return currentBillingPeriodKey();
}

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const admin = createAdminClient();
    const monthKey = currentMonthKey();
    const budget = getMonthlyBudget();

    const { data: shared } = await admin
      .from("property_intelligence_budget_counters")
      .select("units_reserved, units_consumed")
      .eq("provider_id", "rentcast")
      .eq("api_account_scope", "default")
      .eq("billing_period", monthKey)
      .maybeSingle();

    let used = Number(shared?.units_reserved ?? 0);
    if (!shared) {
      const { data } = await admin
        .from("rentcast_tester_usage")
        .select("calls_made")
        .eq("month_key", monthKey)
        .maybeSingle();
      used = data?.calls_made ?? 0;
    }

    return apiSuccess({
      monthKey,
      budget,
      used,
      remaining: Math.max(0, budget - used),
      sharedWithPropertyIntelligence: true,
      note: "Tester and Property Intelligence share the RentCast account budget. Verify the live RentCast allowance before enabling production insights.",
    });
  } catch (err) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "Failed to load usage",
      },
      500
    );
  }
}

const VALID_CATEGORIES = new Set<RentCastCategory>([
  "propertyDetails",
  "valuation",
  "nearbyHouses",
  "nearbyLand",
  "marketStatistics",
]);

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError({ code: "VALIDATION_ERROR", message: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body !== "object") {
      return apiError({ code: "VALIDATION_ERROR", message: "Request body is required" }, 400);
    }

    const { address, categories } = body as {
      address?: unknown;
      categories?: unknown;
    };

    if (typeof address !== "string" || address.trim().length === 0) {
      return apiError(
        { code: "VALIDATION_ERROR", message: "address is required and must be a non-empty string" },
        400
      );
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return apiError(
        { code: "VALIDATION_ERROR", message: "categories must be a non-empty array" },
        400
      );
    }

    const resolvedCategories = categories.filter(
      (c): c is RentCastCategory => typeof c === "string" && VALID_CATEGORIES.has(c as RentCastCategory)
    );

    if (resolvedCategories.length === 0) {
      return apiError(
        { code: "VALIDATION_ERROR", message: "No valid categories provided" },
        400
      );
    }

    const cleanAddress = address.trim();
    const callsNeeded = estimateCallCount(resolvedCategories);
    const budget = getMonthlyBudget();
    const monthKey = currentMonthKey();

    const admin = createAdminClient();

    const { data: reserved, error: reserveError } = await admin.rpc(
      "rentcast_tester_reserve_calls",
      {
        p_month_key: monthKey,
        p_calls: callsNeeded,
        p_budget: budget,
      }
    );

    if (reserveError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BUDGET_ERROR",
            message: `Could not reserve API budget: ${reserveError.message}`,
          },
        },
        { status: 500 }
      );
    }

    if (!reserved) {
      const { data: usageRow } = await admin
        .from("rentcast_tester_usage")
        .select("calls_made")
        .eq("month_key", monthKey)
        .maybeSingle();

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BUDGET_EXCEEDED",
            message: `Monthly tester budget of ${budget} calls would be exceeded. Currently used: ${usageRow?.calls_made ?? 0}. This submission would require ${callsNeeded} more call(s).`,
          },
        },
        { status: 429 }
      );
    }

    if (!process.env.RENTCAST_API_KEY) {
      return apiError(
        {
          code: "CONFIGURATION_ERROR",
          message:
            "RENTCAST_API_KEY is not configured. Add it to your server environment variables.",
        },
        503
      );
    }

    const requestedAt = new Date().toISOString();
    const results: Partial<Record<RentCastCategory, CategoryResult>> = {};

    const orderedCategories = [
      ...resolvedCategories.filter((c) => c === "propertyDetails"),
      ...resolvedCategories.filter((c) => c !== "propertyDetails"),
    ];

    let resolvedZip: string | null = null;

    for (const category of orderedCategories) {
      let result: CategoryResult;

      switch (category) {
        case "propertyDetails":
          result = await fetchPropertyDetails(cleanAddress);
          if (result.status === "success") {
            resolvedZip = extractZipCode(result.data);
          }
          break;

        case "valuation":
          result = await fetchValuation(cleanAddress);
          break;

        case "nearbyHouses":
          result = await fetchNearbyHouses(cleanAddress);
          break;

        case "nearbyLand":
          result = await fetchNearbyLand(cleanAddress);
          break;

        case "marketStatistics": {
          const zip =
            resolvedZip ??
            (/\b(\d{5})(?:-\d{4})?\b/.exec(cleanAddress)?.[1] ?? null);
          result = await fetchMarketStatistics(zip);
          break;
        }

        default:
          continue;
      }

      results[category] = result;
    }

    const values = Object.values(results) as CategoryResult[];
    const summary = {
      successfulRequests: values.filter((r) => r.status === "success").length,
      failedRequests: values.filter((r) => r.status === "error").length,
      skippedRequests: values.filter((r) => r.status === "skipped").length,
      totalRequests: callsNeeded,
    };

    const testerResponse: TesterResponse = {
      inputAddress: cleanAddress,
      provider: "rentcast",
      requestedAt,
      summary,
      results,
    };

    return apiSuccess(testerResponse);
  } catch (err) {
    console.error("[RentCast Tester] Unexpected error:", err instanceof Error ? err.message : err);
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred in the RentCast tester.",
      },
      500
    );
  }
}
