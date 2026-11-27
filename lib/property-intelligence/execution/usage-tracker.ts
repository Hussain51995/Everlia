import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingPeriodKey } from "@/lib/property-intelligence/execution/billing-period";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";

export type UsageOutcome =
  | "reserved"
  | "succeeded"
  | "failed"
  | "skipped"
  | "budget_denied";

export type UsageEventInput = {
  providerId: string;
  apiAccountScope?: string;
  endpointOrOperation: string;
  category?: PropertyDataCategory | null;
  organizationId?: string | null;
  billingPeriod: BillingPeriodKey;
  outcome: UsageOutcome;
  unitsReserved?: number;
  unitsConsumed?: number;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessageSanitized?: string | null;
};

export type UsageMetricsSnapshot = {
  providerRequests: number;
  providerRequestUnits: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  expiredRecords: number;
  cacheUnavailable: number;
  cacheWriteFailures: number;
  endpointOptimizationsAvoided: number;
  deduplicatedRequests: number;
  budgetBlockedRequests: number;
};

export interface PropertyUsageRepository {
  append(event: UsageEventInput): Promise<void>;
}

export class MemoryPropertyUsageRepository implements PropertyUsageRepository {
  readonly events: UsageEventInput[] = [];

  async append(event: UsageEventInput): Promise<void> {
    this.events.push({ ...event });
  }
}

export class SupabasePropertyUsageRepository
  implements PropertyUsageRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async append(event: UsageEventInput): Promise<void> {
    const { error } = await this.client.from("property_intelligence_usage").insert({
      id: randomUUID(),
      provider_id: event.providerId,
      api_account_scope: event.apiAccountScope ?? "default",
      endpoint_or_operation: event.endpointOrOperation,
      category: event.category ?? null,
      organization_id: event.organizationId ?? null,
      billing_period: event.billingPeriod,
      outcome: event.outcome,
      units_reserved: event.unitsReserved ?? 0,
      units_consumed: event.unitsConsumed ?? 0,
      http_status: event.httpStatus ?? null,
      error_code: event.errorCode ?? null,
      error_message_sanitized: event.errorMessageSanitized ?? null,
    });
    if (error) {
      console.error("[property-intelligence/usage]", error.message);
    }
  }
}

export class PropertyUsageTracker {
  private metrics: UsageMetricsSnapshot = emptyMetrics();

  constructor(private readonly repo?: PropertyUsageRepository) {}

  getMetrics(): UsageMetricsSnapshot {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = emptyMetrics();
  }

  recordCacheHit() {
    this.metrics.cacheHits += 1;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses += 1;
  }

  recordExpired() {
    this.metrics.expiredRecords += 1;
  }

  recordCacheUnavailable() {
    this.metrics.cacheUnavailable += 1;
  }

  recordCacheWriteFailure() {
    this.metrics.cacheWriteFailures += 1;
  }

  recordEndpointOptimizationAvoided() {
    this.metrics.endpointOptimizationsAvoided += 1;
  }

  recordDeduplicated() {
    this.metrics.deduplicatedRequests += 1;
  }

  recordBudgetBlocked() {
    this.metrics.budgetBlockedRequests += 1;
  }

  async track(event: UsageEventInput): Promise<void> {
    if (event.outcome === "succeeded") {
      this.metrics.providerRequests += 1;
      this.metrics.successfulRequests += 1;
      this.metrics.providerRequestUnits += event.unitsConsumed ?? event.unitsReserved ?? 0;
    } else if (event.outcome === "failed") {
      this.metrics.providerRequests += 1;
      this.metrics.failedRequests += 1;
      this.metrics.providerRequestUnits += event.unitsConsumed ?? event.unitsReserved ?? 0;
    } else if (event.outcome === "budget_denied") {
      this.metrics.budgetBlockedRequests += 1;
    }

    if (this.repo) {
      await this.repo.append(event);
    }
  }
}

function emptyMetrics(): UsageMetricsSnapshot {
  return {
    providerRequests: 0,
    providerRequestUnits: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    expiredRecords: 0,
    cacheUnavailable: 0,
    cacheWriteFailures: 0,
    endpointOptimizationsAvoided: 0,
    deduplicatedRequests: 0,
    budgetBlockedRequests: 0,
  };
}

export function createUsageTracker(
  repo?: PropertyUsageRepository
): PropertyUsageTracker {
  return new PropertyUsageTracker(repo);
}
