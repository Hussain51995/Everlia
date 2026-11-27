import { randomUUID } from "crypto";
import { createProviderError } from "@/lib/property-intelligence/errors";
import type { PropertyBudgetService } from "@/lib/property-intelligence/execution/budget-service";
import type { BudgetReservationTicket } from "@/lib/property-intelligence/execution/budget-service";
import {
  buildFetchLockKey,
  fingerprintDedupeParams,
  type PropertyFetchDedupeRepository,
} from "@/lib/property-intelligence/execution/dedupe";
import {
  DEFAULT_RETRY_POLICY,
  isRetryableProviderError,
  sleepBackoff,
  type RetryPolicyOptions,
} from "@/lib/property-intelligence/execution/retry";
import type { PropertyUsageTracker } from "@/lib/property-intelligence/execution/usage-tracker";
import type { PropertyBudgetGateway } from "@/lib/property-intelligence/execution/budget-gateway";
import type { PlannedProviderOperation } from "@/lib/property-intelligence/planner/types";
import type { PropertyDataProvider } from "@/lib/property-intelligence/providers/types";
import type {
  NearbyListingsQuery,
  PropertyLookup,
  ProviderOutcome,
} from "@/lib/types/property-intelligence";
import { DEFAULT_ACCESS_SCOPE } from "@/lib/property-intelligence/cache/types";

export type ProviderGatewayOptions = {
  budget: PropertyBudgetService;
  dedupe: PropertyFetchDedupeRepository;
  usage?: PropertyUsageTracker;
  retry?: Partial<RetryPolicyOptions>;
  waitTimeoutMs?: number;
  pollIntervalMs?: number;
  leaseSeconds?: number;
  apiAccountScope?: string;
  accessScope?: string;
  enforceBudgetForMock?: boolean;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
};

export type GatewayExecuteInput<T> = {
  provider: PropertyDataProvider;
  operation: PlannedProviderOperation;
  lookup: PropertyLookup;
  listingsQuery?: NearbyListingsQuery;
  run: () => Promise<ProviderOutcome<T>>;
  recheckCache?: () => Promise<ProviderOutcome<T> | null>;
};

export class PropertyProviderExecutionGateway
  implements PropertyBudgetGateway
{
  private readonly retry: RetryPolicyOptions;
  private readonly waitTimeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly leaseSeconds: number;
  private readonly apiAccountScope: string;
  private readonly accessScope: string;
  private readonly enforceBudgetForMock: boolean;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => Date;

  constructor(private readonly options: ProviderGatewayOptions) {
    this.retry = { ...DEFAULT_RETRY_POLICY, ...options.retry };
    this.waitTimeoutMs = options.waitTimeoutMs ?? 30_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 150;
    this.leaseSeconds = options.leaseSeconds ?? 45;
    this.apiAccountScope =
      options.apiAccountScope ?? options.budget.apiAccountScope;
    this.accessScope = options.accessScope ?? DEFAULT_ACCESS_SCOPE;
    this.enforceBudgetForMock = options.enforceBudgetForMock ?? true;
    this.sleep =
      options.sleep ??
      options.retry?.sleep ??
      ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    this.now = options.now ?? (() => new Date());
  }

  async reserve(input: {
    providerId: string;
    units: number;
    organizationId?: string | null;
  }) {
    const result = await this.options.budget.reserve({
      providerId: input.providerId,
      units: input.units,
      apiAccountScope: this.apiAccountScope,
    });
    if (!result.allowed) {
      this.options.usage?.recordBudgetBlocked();
      await this.options.usage?.track({
        providerId: input.providerId,
        apiAccountScope: this.apiAccountScope,
        endpointOrOperation: "reserve",
        organizationId: input.organizationId,
        billingPeriod: result.billingPeriod,
        outcome: "budget_denied",
        unitsReserved: 0,
        errorCode: "budget_denied",
      });
      return {
        allowed: false as const,
        reason: "budget_exhausted" as const,
        remaining: result.remaining,
      };
    }
    return {
      allowed: true as const,
      remaining: result.remainingAfterReserve,
    };
  }

  async execute<T>(input: GatewayExecuteInput<T>): Promise<ProviderOutcome<T>> {
    const { provider, operation, lookup } = input;
    const ownerToken = randomUUID();
    const lockKey = buildFetchLockKey({
      providerId: operation.providerId,
      apiAccountScope: this.apiAccountScope,
      operation: operation.operation,
      category: operation.category,
      normalizedIdentityKey: operation.cacheKey.normalizedIdentityKey,
      requestParamsFingerprint: operation.cacheKey.requestParamsFingerprint,
      accessScope: this.accessScope,
    });

    // --- Deduplication ---
    let claim = await this.options.dedupe.tryClaim({
      lockKey,
      providerId: operation.providerId,
      category: operation.category,
      normalizedIdentityKey: operation.cacheKey.normalizedIdentityKey,
      requestParamsFingerprint: operation.cacheKey.requestParamsFingerprint,
      ownerToken,
      leaseSeconds: this.leaseSeconds,
    });

    if (claim.result === "waiting" || claim.result === "taken") {
      this.options.usage?.recordDeduplicated();
      const cached = await this.waitForPeerAndRecheck(input, claim.expiresAt);
      if (cached) return cached;

      claim = await this.options.dedupe.tryClaim({
        lockKey,
        providerId: operation.providerId,
        category: operation.category,
        normalizedIdentityKey: operation.cacheKey.normalizedIdentityKey,
        requestParamsFingerprint: operation.cacheKey.requestParamsFingerprint,
        ownerToken,
        leaseSeconds: this.leaseSeconds,
      });
      if (claim.result !== "claimed") {
        const again = input.recheckCache ? await input.recheckCache() : null;
        if (again) return again;
        return {
          status: "error",
          error: createProviderError({
            code: "provider_failure",
            message: "Concurrent fetch in progress; try again shortly",
            providerId: operation.providerId,
            category: operation.category,
            retryable: true,
          }),
        };
      }
    }

    if (input.recheckCache) {
      const hit = await input.recheckCache();
      if (hit) {
        await this.options.dedupe.complete({
          lockKey,
          ownerToken,
        });
        this.options.usage?.recordDeduplicated();
        return hit;
      }
    }

    const maxAttempts = Math.max(1, this.retry.maxAttempts);
    let lastOutcome: ProviderOutcome<T> | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleepBackoff(attempt - 1, {
          ...this.retry,
          sleep: this.sleep,
        });
      }

      const shouldEnforce =
        this.enforceBudgetForMock || !provider.isMock;

      let ticket: BudgetReservationTicket | null = null;

      if (shouldEnforce) {
        const reservation = await this.options.budget.reserve({
          providerId: operation.providerId,
          units: operation.costUnits,
          apiAccountScope: this.apiAccountScope,
        });

        if (!reservation.allowed) {
          this.options.usage?.recordBudgetBlocked();
          await this.options.usage?.track({
            providerId: operation.providerId,
            apiAccountScope: this.apiAccountScope,
            endpointOrOperation: operation.operation,
            category: operation.category,
            organizationId: lookup.organizationId,
            billingPeriod: reservation.billingPeriod,
            outcome: "budget_denied",
            unitsReserved: 0,
            errorCode: "budget_denied",
          });
          await this.options.dedupe.fail({
            lockKey,
            ownerToken,
            errorSanitized: "budget_exhausted",
          });
          return {
            status: "error",
            error: createProviderError({
              code: "budget_denied",
              message: "Property Intelligence API budget exhausted",
              providerId: operation.providerId,
              category: operation.category,
              retryable: false,
            }),
          };
        }
        ticket = reservation;
        await this.options.usage?.track({
          providerId: operation.providerId,
          apiAccountScope: this.apiAccountScope,
          endpointOrOperation: operation.operation,
          category: operation.category,
          organizationId: lookup.organizationId,
          billingPeriod: ticket.billingPeriod,
          outcome: "reserved",
          unitsReserved: ticket.units,
        });
      }

      let contactedProvider = false;
      try {
        contactedProvider = true;
        const outcome = await input.run();
        lastOutcome = outcome;

        if (outcome.status === "ok") {
          if (ticket) await this.options.budget.consume(ticket);
          await this.options.usage?.track({
            providerId: operation.providerId,
            apiAccountScope: this.apiAccountScope,
            endpointOrOperation: operation.operation,
            category: operation.category,
            organizationId: lookup.organizationId,
            billingPeriod:
              ticket?.billingPeriod ?? this.options.budget.billingPeriod(this.now()),
            outcome: "succeeded",
            unitsReserved: ticket?.units ?? 0,
            unitsConsumed: ticket?.units ?? 0,
          });
          await this.options.dedupe.complete({ lockKey, ownerToken });
          return outcome;
        }

        if (outcome.status === "unsupported") {
          if (ticket) {
            if (contactedProvider) await this.options.budget.consume(ticket);
            else await this.options.budget.release(ticket);
          }
          await this.options.dedupe.fail({
            lockKey,
            ownerToken,
            errorSanitized: outcome.error.message,
          });
          return outcome;
        }

        if (ticket) {
          await this.options.budget.consume(ticket);
        }
        await this.options.usage?.track({
          providerId: operation.providerId,
          apiAccountScope: this.apiAccountScope,
          endpointOrOperation: operation.operation,
          category: operation.category,
          organizationId: lookup.organizationId,
          billingPeriod:
            ticket?.billingPeriod ?? this.options.budget.billingPeriod(this.now()),
          outcome: "failed",
          unitsReserved: ticket?.units ?? 0,
          unitsConsumed: ticket?.units ?? 0,
          errorCode: outcome.error.code,
          errorMessageSanitized: outcome.error.message,
          httpStatus: outcome.error.httpStatus,
        });

        if (
          attempt < maxAttempts - 1 &&
          isRetryableProviderError(outcome.error)
        ) {
          continue;
        }

        await this.options.dedupe.fail({
          lockKey,
          ownerToken,
          errorSanitized: outcome.error.message,
        });
        return outcome;
      } catch (err) {
        if (ticket) {
          if (contactedProvider) await this.options.budget.consume(ticket);
          else await this.options.budget.release(ticket);
        }
        const message =
          err instanceof Error ? err.message : "Provider execution failed";
        const failure: ProviderOutcome<T> = {
          status: "error",
          error: createProviderError({
            code: "provider_failure",
            message,
            providerId: operation.providerId,
            category: operation.category,
            retryable: true,
          }),
        };
        lastOutcome = failure;
        if (attempt < maxAttempts - 1) continue;
        await this.options.dedupe.fail({
          lockKey,
          ownerToken,
          errorSanitized: message,
        });
        return failure;
      }
    }

    await this.options.dedupe.fail({
      lockKey,
      ownerToken,
      errorSanitized: "exhausted_retries",
    });
    return (
      lastOutcome ?? {
        status: "error",
        error: createProviderError({
          code: "provider_failure",
          message: "Provider execution failed after retries",
          providerId: operation.providerId,
          category: operation.category,
          retryable: false,
        }),
      }
    );
  }

  private async waitForPeerAndRecheck<T>(
    input: GatewayExecuteInput<T>,
    peerExpiresAt: string
  ): Promise<ProviderOutcome<T> | null> {
    const deadline = Math.min(
      this.now().getTime() + this.waitTimeoutMs,
      Date.parse(peerExpiresAt) + 500
    );

    while (this.now().getTime() < deadline) {
      if (input.recheckCache) {
        const hit = await input.recheckCache();
        if (hit) return hit;
      }
      await this.sleep(this.pollIntervalMs);
    }

    if (input.recheckCache) {
      return input.recheckCache();
    }
    return null;
  }
}

export function createProviderExecutionGateway(
  options: ProviderGatewayOptions
): PropertyProviderExecutionGateway {
  return new PropertyProviderExecutionGateway(options);
}

export function listingsQueryFingerprint(
  query: NearbyListingsQuery | undefined
): string {
  if (!query) return fingerprintDedupeParams({});
  return fingerprintDedupeParams({
    kind: query.kind,
    radiusMiles: query.radiusMiles,
    limit: query.limit,
    status: query.status ?? null,
  });
}
