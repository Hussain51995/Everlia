import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingPeriodKey } from "@/lib/property-intelligence/execution/billing-period";

export type BudgetCounterSnapshot = {
  providerId: string;
  apiAccountScope: string;
  billingPeriod: BillingPeriodKey;
  unitsReserved: number;
  unitsConsumed: number;
  monthlyBudget: number;
  remaining: number;
};

export interface PropertyBudgetRepository {
  reserve(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
    budget: number;
  }): Promise<boolean>;

  consume(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
  }): Promise<void>;

  release(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
  }): Promise<void>;

  getSnapshot(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    budget: number;
  }): Promise<BudgetCounterSnapshot>;
}

type MemoryCounter = {
  unitsReserved: number;
  unitsConsumed: number;
};

function counterKey(
  providerId: string,
  scope: string,
  period: string
): string {
  return `${providerId}|${scope}|${period}`;
}

export class MemoryPropertyBudgetRepository implements PropertyBudgetRepository {
  readonly counters = new Map<string, MemoryCounter>();
  private chain: Promise<unknown> = Promise.resolve();

  private async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async reserve(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
    budget: number;
  }): Promise<boolean> {
    return this.withLock(() => {
      const key = counterKey(
        input.providerId,
        input.apiAccountScope,
        input.billingPeriod
      );
      const current = this.counters.get(key) ?? {
        unitsReserved: 0,
        unitsConsumed: 0,
      };
      if (current.unitsReserved + input.units > input.budget) {
        return false;
      }
      this.counters.set(key, {
        ...current,
        unitsReserved: current.unitsReserved + input.units,
      });
      return true;
    });
  }

  async consume(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
  }): Promise<void> {
    await this.withLock(() => {
      const key = counterKey(
        input.providerId,
        input.apiAccountScope,
        input.billingPeriod
      );
      const current = this.counters.get(key) ?? {
        unitsReserved: 0,
        unitsConsumed: 0,
      };
      this.counters.set(key, {
        ...current,
        unitsConsumed: current.unitsConsumed + input.units,
      });
    });
  }

  async release(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
  }): Promise<void> {
    await this.withLock(() => {
      const key = counterKey(
        input.providerId,
        input.apiAccountScope,
        input.billingPeriod
      );
      const current = this.counters.get(key);
      if (!current) return;
      this.counters.set(key, {
        ...current,
        unitsReserved: Math.max(0, current.unitsReserved - input.units),
      });
    });
  }

  async getSnapshot(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    budget: number;
  }): Promise<BudgetCounterSnapshot> {
    const key = counterKey(
      input.providerId,
      input.apiAccountScope,
      input.billingPeriod
    );
    const current = this.counters.get(key) ?? {
      unitsReserved: 0,
      unitsConsumed: 0,
    };
    return {
      providerId: input.providerId,
      apiAccountScope: input.apiAccountScope,
      billingPeriod: input.billingPeriod,
      unitsReserved: current.unitsReserved,
      unitsConsumed: current.unitsConsumed,
      monthlyBudget: input.budget,
      remaining: Math.max(0, input.budget - current.unitsReserved),
    };
  }
}

export class SupabasePropertyBudgetRepository
  implements PropertyBudgetRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async reserve(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
    budget: number;
  }): Promise<boolean> {
    const { data, error } = await this.client.rpc(
      "property_intelligence_reserve_units",
      {
        p_provider_id: input.providerId,
        p_api_account_scope: input.apiAccountScope,
        p_billing_period: input.billingPeriod,
        p_units: input.units,
        p_budget: input.budget,
      }
    );
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async consume(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
  }): Promise<void> {
    const { error } = await this.client.rpc(
      "property_intelligence_consume_units",
      {
        p_provider_id: input.providerId,
        p_api_account_scope: input.apiAccountScope,
        p_billing_period: input.billingPeriod,
        p_units: input.units,
      }
    );
    if (error) throw new Error(error.message);
  }

  async release(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    units: number;
  }): Promise<void> {
    const { error } = await this.client.rpc(
      "property_intelligence_release_units",
      {
        p_provider_id: input.providerId,
        p_api_account_scope: input.apiAccountScope,
        p_billing_period: input.billingPeriod,
        p_units: input.units,
      }
    );
    if (error) throw new Error(error.message);
  }

  async getSnapshot(input: {
    providerId: string;
    apiAccountScope: string;
    billingPeriod: BillingPeriodKey;
    budget: number;
  }): Promise<BudgetCounterSnapshot> {
    const { data, error } = await this.client
      .from("property_intelligence_budget_counters")
      .select("units_reserved, units_consumed")
      .eq("provider_id", input.providerId)
      .eq("api_account_scope", input.apiAccountScope)
      .eq("billing_period", input.billingPeriod)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const reserved = Number(data?.units_reserved ?? 0);
    const consumed = Number(data?.units_consumed ?? 0);
    return {
      providerId: input.providerId,
      apiAccountScope: input.apiAccountScope,
      billingPeriod: input.billingPeriod,
      unitsReserved: reserved,
      unitsConsumed: consumed,
      monthlyBudget: input.budget,
      remaining: Math.max(0, input.budget - reserved),
    };
  }
}
