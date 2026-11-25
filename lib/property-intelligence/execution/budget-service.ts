import {
  currentBillingPeriodKey,
  type BillingPeriodKey,
} from "@/lib/property-intelligence/execution/billing-period";
import {
  resolveApiAccountScope,
  resolveProviderMonthlyBudget,
} from "@/lib/property-intelligence/execution/budget-config";
import type {
  BudgetCounterSnapshot,
  PropertyBudgetRepository,
} from "@/lib/property-intelligence/execution/budget-repository";

export type BudgetReservationTicket = {
  allowed: true;
  providerId: string;
  apiAccountScope: string;
  billingPeriod: BillingPeriodKey;
  units: number;
  remainingAfterReserve: number;
};

export type BudgetDenial = {
  allowed: false;
  reason: "budget_exhausted";
  providerId: string;
  apiAccountScope: string;
  billingPeriod: BillingPeriodKey;
  unitsRequested: number;
  remaining: number;
  monthlyBudget: number;
};

export type BudgetReserveResult = BudgetReservationTicket | BudgetDenial;

export class PropertyBudgetService {
  constructor(
    private readonly repo: PropertyBudgetRepository,
    private readonly options?: {
      monthlyBudget?: number;
      apiAccountScope?: string;
      now?: () => Date;
      settingsBudget?: number | null;
    }
  ) {}

  get monthlyBudget(): number {
    return resolveProviderMonthlyBudget({
      settingsBudget:
        this.options?.monthlyBudget ?? this.options?.settingsBudget ?? null,
    });
  }

  get apiAccountScope(): string {
    return this.options?.apiAccountScope ?? resolveApiAccountScope();
  }

  billingPeriod(now = this.options?.now?.() ?? new Date()): BillingPeriodKey {
    return currentBillingPeriodKey(now);
  }

  async reserve(input: {
    providerId: string;
    units: number;
    apiAccountScope?: string;
    billingPeriod?: BillingPeriodKey;
    budget?: number;
  }): Promise<BudgetReserveResult> {
    const units = Math.max(1, Math.floor(input.units));
    const apiAccountScope = input.apiAccountScope ?? this.apiAccountScope;
    const billingPeriod = input.billingPeriod ?? this.billingPeriod();
    const budget = input.budget ?? this.monthlyBudget;

    const ok = await this.repo.reserve({
      providerId: input.providerId,
      apiAccountScope,
      billingPeriod,
      units,
      budget,
    });

    const snap = await this.repo.getSnapshot({
      providerId: input.providerId,
      apiAccountScope,
      billingPeriod,
      budget,
    });

    if (!ok) {
      return {
        allowed: false,
        reason: "budget_exhausted",
        providerId: input.providerId,
        apiAccountScope,
        billingPeriod,
        unitsRequested: units,
        remaining: snap.remaining,
        monthlyBudget: budget,
      };
    }

    return {
      allowed: true,
      providerId: input.providerId,
      apiAccountScope,
      billingPeriod,
      units,
      remainingAfterReserve: snap.remaining,
    };
  }

  async consume(ticket: BudgetReservationTicket): Promise<void> {
    await this.repo.consume({
      providerId: ticket.providerId,
      apiAccountScope: ticket.apiAccountScope,
      billingPeriod: ticket.billingPeriod,
      units: ticket.units,
    });
  }

  async release(ticket: BudgetReservationTicket): Promise<void> {
    await this.repo.release({
      providerId: ticket.providerId,
      apiAccountScope: ticket.apiAccountScope,
      billingPeriod: ticket.billingPeriod,
      units: ticket.units,
    });
  }

  async getSnapshot(input: {
    providerId: string;
    apiAccountScope?: string;
    billingPeriod?: BillingPeriodKey;
  }): Promise<BudgetCounterSnapshot> {
    const budget = this.monthlyBudget;
    return this.repo.getSnapshot({
      providerId: input.providerId,
      apiAccountScope: input.apiAccountScope ?? this.apiAccountScope,
      billingPeriod: input.billingPeriod ?? this.billingPeriod(),
      budget,
    });
  }
}

export function createBudgetService(
  repo: PropertyBudgetRepository,
  options?: ConstructorParameters<typeof PropertyBudgetService>[1]
): PropertyBudgetService {
  return new PropertyBudgetService(repo, options);
}
