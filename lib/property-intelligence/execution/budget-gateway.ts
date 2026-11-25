import { createProviderError } from "@/lib/property-intelligence/errors";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";
import type { PlannedProviderOperation } from "@/lib/property-intelligence/planner/types";
import type {
  NearbyListingsQuery,
  PropertyLookup,
  ProviderOutcome,
} from "@/lib/types/property-intelligence";

export type BudgetReservation = {
  allowed: boolean;
  reason?: "budget_exhausted";
  remaining?: number;
};

export interface PropertyBudgetGateway {
  reserve(input: {
    providerId: string;
    units: number;
    organizationId?: string | null;
  }): Promise<BudgetReservation>;

  execute<T>(input: {
    provider: PropertyDataProvider;
    operation: PlannedProviderOperation;
    lookup: PropertyLookup;
    listingsQuery?: NearbyListingsQuery;
    run: () => Promise<ProviderOutcome<T>>;
    recheckCache?: () => Promise<ProviderOutcome<T> | null>;
  }): Promise<ProviderOutcome<T>>;
}

export type StubBudgetGatewayOptions = {
  allow?: boolean;
  monthlyBudget?: number;
};

export class StubPropertyBudgetGateway implements PropertyBudgetGateway {
  private used = 0;
  private readonly allow: boolean;
  private readonly monthlyBudget: number;

  constructor(options?: StubBudgetGatewayOptions) {
    this.allow = options?.allow ?? true;
    this.monthlyBudget = options?.monthlyBudget ?? Number.MAX_SAFE_INTEGER;
  }

  async reserve(input: {
    providerId: string;
    units: number;
    organizationId?: string | null;
  }): Promise<BudgetReservation> {
    void input.providerId;
    void input.organizationId;
    if (!this.allow) {
      return { allowed: false, reason: "budget_exhausted", remaining: 0 };
    }
    if (this.used + input.units > this.monthlyBudget) {
      return {
        allowed: false,
        reason: "budget_exhausted",
        remaining: Math.max(0, this.monthlyBudget - this.used),
      };
    }
    this.used += input.units;
    return {
      allowed: true,
      remaining: this.monthlyBudget - this.used,
    };
  }

  async execute<T>(input: {
    provider: PropertyDataProvider;
    operation: PlannedProviderOperation;
    lookup: PropertyLookup;
    run: () => Promise<ProviderOutcome<T>>;
    recheckCache?: () => Promise<ProviderOutcome<T> | null>;
  }): Promise<ProviderOutcome<T>> {
    if (input.recheckCache) {
      const hit = await input.recheckCache();
      if (hit) return hit;
    }

    const reservation = await this.reserve({
      providerId: input.operation.providerId,
      units: input.operation.costUnits,
      organizationId: input.lookup.organizationId,
    });

    if (!reservation.allowed) {
      return {
        status: "error",
        error: createProviderError({
          code: "budget_denied",
          message: "Property Intelligence API budget exhausted",
          providerId: input.operation.providerId,
          category: input.operation.category,
          retryable: false,
        }),
      };
    }

    return input.run();
  }

  getUsedUnits() {
    return this.used;
  }
}

export function createStubBudgetGateway(
  options?: StubBudgetGatewayOptions
): PropertyBudgetGateway {
  return new StubPropertyBudgetGateway(options);
}
