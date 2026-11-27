import { describe, expect, it } from "vitest";
import {
  nextBillingPeriodKey,
  currentBillingPeriodKey,
} from "@/lib/property-intelligence/execution/billing-period";
import { resolveProviderMonthlyBudget } from "@/lib/property-intelligence/execution/budget-config";
import { MemoryPropertyBudgetRepository } from "@/lib/property-intelligence/execution/budget-repository";
import { createBudgetService } from "@/lib/property-intelligence/execution/budget-service";
import {
  MemoryPropertyFetchDedupeRepository,
  buildFetchLockKey,
} from "@/lib/property-intelligence/execution/dedupe";
import {
  createProviderExecutionGateway,
} from "@/lib/property-intelligence/execution/provider-gateway";
import {
  isRetryableProviderError,
  computeBackoffDelayMs,
} from "@/lib/property-intelligence/execution/retry";
import {
  createUsageTracker,
  MemoryPropertyUsageRepository,
} from "@/lib/property-intelligence/execution/usage-tracker";
import { createMockProvider } from "@/lib/property-intelligence/providers/mock/provider";
import type { PlannedProviderOperation } from "@/lib/property-intelligence/planner/types";
import type {
  PropertyLookup,
  ProviderOutcome,
  PropertyDetails,
} from "@/lib/types/property-intelligence";
import { createProviderError } from "@/lib/property-intelligence/errors";
import { addressNormalizationService } from "@/lib/property-intelligence/address-normalization";
import { resetRateLimitBuckets } from "@/lib/onboarding/rate-limit";
import { checkPublicInsightsRateLimit } from "@/lib/property-intelligence/execution/public-rate-limit";

function makeLookup(): PropertyLookup {
  const norm = addressNormalizationService.normalize(
    "5500 Grand Lake Dr, San Antonio, TX 78244"
  );
  return {
    address: "5500 Grand Lake Dr, San Antonio, TX 78244",
    identity: norm.identity,
    zipCode: "78244",
    organizationId: "org-1",
    customerId: "cust-1",
    categories: ["property_details"],
  };
}

function makeOperation(
  overrides?: Partial<PlannedProviderOperation>
): PlannedProviderOperation {
  const lookup = makeLookup();
  const fingerprint = "fp-details";
  return {
    category: "property_details",
    providerId: "mock",
    operation: "getPropertyDetails",
    reason: "missing",
    cacheKey: {
      cacheKey: "cache|details",
      requestParamsFingerprint: fingerprint,
      normalizedIdentityKey: lookup.identity.normalizedKey,
      schemaVersion: 1,
      accessScope: "public_qr",
      providerDataset: null,
      requestParams: {},
    },
    costUnits: 1,
    capability: createMockProvider().getCapability("property_details")!,
    maySatisfyCategories: [],
    conditional: false,
    ...overrides,
  };
}

function buildGateway(input?: {
  budget?: number;
  period?: string;
  sleep?: (ms: number) => Promise<void>;
}) {
  const repo = new MemoryPropertyBudgetRepository();
  const budget = createBudgetService(repo, {
    monthlyBudget: input?.budget ?? 5,
    apiAccountScope: "default",
    now: () =>
      input?.period
        ? new Date(`${input.period}-15T00:00:00.000Z`)
        : new Date("2025-06-15T00:00:00.000Z"),
  });
  const dedupe = new MemoryPropertyFetchDedupeRepository();
  const usageRepo = new MemoryPropertyUsageRepository();
  const usage = createUsageTracker(usageRepo);
  const gateway = createProviderExecutionGateway({
    budget,
    dedupe,
    usage,
    enforceBudgetForMock: true,
    retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
    sleep: input?.sleep ?? (async () => undefined),
    pollIntervalMs: 1,
    waitTimeoutMs: 50,
  });
  return { gateway, budget, repo, dedupe, usage, usageRepo };
}

describe("budget config + period", () => {
  it("defaults to 50 for free-plan testing", () => {
    expect(resolveProviderMonthlyBudget({ env: {} as NodeJS.ProcessEnv })).toBe(
      50
    );
  });

  it("prefers PROPERTY_INTELLIGENCE_MONTHLY_BUDGET", () => {
    expect(
      resolveProviderMonthlyBudget({
        env: {
          PROPERTY_INTELLIGENCE_MONTHLY_BUDGET: "40",
          RENTCAST_TEST_MONTHLY_BUDGET: "99",
        } as unknown as NodeJS.ProcessEnv,
      })
    ).toBe(40);
  });

  it("rolls billing period keys", () => {
    expect(currentBillingPeriodKey(new Date("2025-12-01T00:00:00Z"))).toBe(
      "2025-12"
    );
    expect(nextBillingPeriodKey("2025-12")).toBe("2026-01");
  });
});

describe("atomic quota reservation", () => {
  it("allows requests while budget remains and blocks at exact exhaustion", async () => {
    const { gateway, budget } = buildGateway({ budget: 2 });
    const provider = createMockProvider({ scenario: "success" });
    const lookup = makeLookup();

    const opA = makeOperation({
      cacheKey: {
        ...makeOperation().cacheKey,
        cacheKey: "a",
        requestParamsFingerprint: "fp-a",
      },
    });
    const opB = makeOperation({
      cacheKey: {
        ...makeOperation().cacheKey,
        cacheKey: "b",
        requestParamsFingerprint: "fp-b",
      },
    });
    const opC = makeOperation({
      cacheKey: {
        ...makeOperation().cacheKey,
        cacheKey: "c",
        requestParamsFingerprint: "fp-c",
      },
    });

    const a = await gateway.execute({
      provider,
      operation: opA,
      lookup,
      run: () => provider.getPropertyDetails(lookup),
    });
    expect(a.status).toBe("ok");

    const b = await gateway.execute({
      provider,
      operation: opB,
      lookup,
      run: () => provider.getPropertyDetails(lookup),
    });
    expect(b.status).toBe("ok");

    const c = await gateway.execute({
      provider,
      operation: opC,
      lookup,
      run: () => provider.getPropertyDetails(lookup),
    });
    expect(c.status).toBe("error");
    if (c.status === "error") expect(c.error.code).toBe("budget_denied");

    const snap = await budget.getSnapshot({ providerId: "mock" });
    expect(snap.unitsReserved).toBe(2);
    expect(snap.remaining).toBe(0);
  });

  it("handles concurrent reservations without exceeding the limit", async () => {
    const repo = new MemoryPropertyBudgetRepository();
    const budget = createBudgetService(repo, {
      monthlyBudget: 5,
      now: () => new Date("2025-06-15T00:00:00.000Z"),
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        budget.reserve({ providerId: "rentcast", units: 1 })
      )
    );
    const allowed = results.filter((r) => r.allowed).length;
    const denied = results.filter((r) => !r.allowed).length;
    expect(allowed).toBe(5);
    expect(denied).toBe(15);
    const snap = await budget.getSnapshot({ providerId: "rentcast" });
    expect(snap.unitsReserved).toBe(5);
  });

  it("partial budget availability rejects oversized single reservations", async () => {
    const { budget } = buildGateway({ budget: 3 });
    await budget.reserve({ providerId: "mock", units: 2 });
    const denied = await budget.reserve({ providerId: "mock", units: 2 });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.remaining).toBe(1);
  });

  it("does not release on uncertain failures (consumes instead)", async () => {
    const { gateway, budget } = buildGateway({ budget: 3 });
    const provider = createMockProvider({ scenario: "success" });
    const lookup = makeLookup();
    const op = makeOperation();

    const outcome = await gateway.execute({
      provider,
      operation: op,
      lookup,
      run: async () =>
        ({
          status: "error",
          error: createProviderError({
            code: "timeout",
            message: "upstream timeout",
            providerId: "mock",
            category: "property_details",
            retryable: true,
          }),
        }) satisfies ProviderOutcome<PropertyDetails>,
    });
    expect(outcome.status).toBe("error");
    const snap = await budget.getSnapshot({ providerId: "mock" });
    expect(snap.unitsReserved).toBe(3);
    expect(snap.unitsConsumed).toBe(3);
  });

  it("billing period rollover resets available budget", async () => {
    const repo = new MemoryPropertyBudgetRepository();
    let period = "2025-06";
    const budget = createBudgetService(repo, {
      monthlyBudget: 1,
      now: () => new Date(`${period}-15T00:00:00.000Z`),
    });
    const first = await budget.reserve({ providerId: "rentcast", units: 1 });
    expect(first.allowed).toBe(true);
    const exhausted = await budget.reserve({ providerId: "rentcast", units: 1 });
    expect(exhausted.allowed).toBe(false);

    period = "2025-07";
    const next = await budget.reserve({ providerId: "rentcast", units: 1 });
    expect(next.allowed).toBe(true);
  });
});

describe("deduplication + interrupted locks", () => {
  it("runs only one provider call for duplicate concurrent fetches", async () => {
    const { gateway, usage } = buildGateway({ budget: 50 });
    let calls = 0;
    const provider = createMockProvider({ scenario: "success" });
    const lookup = makeLookup();
    const op = makeOperation();

    let release!: () => void;
    const hold = new Promise<void>((r) => {
      release = r;
    });
    let cached: ProviderOutcome<PropertyDetails> | null = null;

    const p1 = gateway.execute({
      provider,
      operation: op,
      lookup,
      run: async () => {
        calls += 1;
        await hold;
        const result = await provider.getPropertyDetails(lookup);
        cached = result;
        return result;
      },
    });

    await new Promise((r) => setTimeout(r, 10));

    const p2 = gateway.execute({
      provider,
      operation: op,
      lookup,
      recheckCache: async () => cached,
      run: async () => {
        calls += 1;
        return provider.getPropertyDetails(lookup);
      },
    });

    release();
    const [a, b] = await Promise.all([p1, p2]);
    expect(a.status).toBe("ok");
    expect(b.status).toBe("ok");
    expect(calls).toBe(1);
    expect(usage.getMetrics().deduplicatedRequests).toBeGreaterThanOrEqual(1);
  });

  it("reclaims expired / interrupted locks", async () => {
    const dedupe = new MemoryPropertyFetchDedupeRepository();
    dedupe.now = () => new Date("2025-01-01T00:00:00.000Z");
    const key = buildFetchLockKey({
      providerId: "mock",
      apiAccountScope: "default",
      operation: "getPropertyDetails",
      category: "property_details",
      normalizedIdentityKey: "P",
      requestParamsFingerprint: "fp",
      accessScope: "public_qr",
    });

    const first = await dedupe.tryClaim({
      lockKey: key,
      providerId: "mock",
      category: "property_details",
      normalizedIdentityKey: "P",
      requestParamsFingerprint: "fp",
      ownerToken: "owner-a",
      leaseSeconds: 5,
    });
    expect(first.result).toBe("claimed");

    dedupe.now = () => new Date("2025-01-01T00:01:00.000Z");
    const reclaim = await dedupe.tryClaim({
      lockKey: key,
      providerId: "mock",
      category: "property_details",
      normalizedIdentityKey: "P",
      requestParamsFingerprint: "fp",
      ownerToken: "owner-b",
      leaseSeconds: 5,
    });
    expect(reclaim.result).toBe("claimed");
    expect(reclaim.ownerToken).toBe("owner-b");
  });
});

describe("retry policy", () => {
  it("retries temporary failures with budget on each attempt", async () => {
    const { gateway, budget } = buildGateway({ budget: 10 });
    let attempts = 0;
    const provider = createMockProvider({ scenario: "success" });
    const lookup = makeLookup();
    const op = makeOperation();

    const outcome = await gateway.execute({
      provider,
      operation: op,
      lookup,
      run: async () => {
        attempts += 1;
        if (attempts < 3) {
          return {
            status: "error",
            error: createProviderError({
              code: "rate_limited",
              message: "slow down",
              providerId: "mock",
              category: "property_details",
              retryable: true,
              httpStatus: 429,
            }),
          };
        }
        return provider.getPropertyDetails(lookup);
      },
    });
    expect(outcome.status).toBe("ok");
    expect(attempts).toBe(3);
    const snap = await budget.getSnapshot({ providerId: "mock" });
    expect(snap.unitsReserved).toBe(3);
  });

  it("does not retry permanent errors", () => {
    expect(
      isRetryableProviderError(
        createProviderError({
          code: "invalid_input",
          message: "bad address",
          providerId: "mock",
          retryable: false,
        })
      )
    ).toBe(false);
    expect(
      isRetryableProviderError(
        createProviderError({
          code: "budget_denied",
          message: "no budget",
          providerId: "mock",
          retryable: false,
        })
      )
    ).toBe(false);
    expect(computeBackoffDelayMs(0, { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, random: () => 0 })).toBe(100);
  });
});

describe("tester + production shared budget identity", () => {
  it("uses the same counter namespace for rentcast tester and PI", async () => {
    const repo = new MemoryPropertyBudgetRepository();
    const budget = createBudgetService(repo, {
      monthlyBudget: 50,
      apiAccountScope: "default",
      now: () => new Date("2025-06-15T00:00:00.000Z"),
    });

    const tester = await budget.reserve({
      providerId: "rentcast",
      units: 3,
    });
    expect(tester.allowed).toBe(true);

    const pi = await budget.reserve({
      providerId: "rentcast",
      units: 47,
    });
    expect(pi.allowed).toBe(true);

    const blocked = await budget.reserve({
      providerId: "rentcast",
      units: 1,
    });
    expect(blocked.allowed).toBe(false);
  });
});

describe("public rate limits", () => {
  it("blocks abusive token hammering", async () => {
    resetRateLimitBuckets();
    const req = new Request("http://localhost/api/respond/t/property-insights", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    let lastAllowed = true;
    for (let i = 0; i < 35; i++) {
      const result = await checkPublicInsightsRateLimit({
        request: req,
        qrToken: "same-token",
        organizationId: "org",
      });
      lastAllowed = result.allowed;
    }
    expect(lastAllowed).toBe(false);
  });
});

describe("lock key identity", () => {
  it("includes provider account scope and access scope", () => {
    const a = buildFetchLockKey({
      providerId: "rentcast",
      apiAccountScope: "default",
      operation: "getPropertyDetails",
      category: "property_details",
      normalizedIdentityKey: "P",
      requestParamsFingerprint: "fp",
      accessScope: "public_qr",
    });
    const b = buildFetchLockKey({
      providerId: "rentcast",
      apiAccountScope: "default",
      operation: "getPropertyDetails",
      category: "property_details",
      normalizedIdentityKey: "P",
      requestParamsFingerprint: "fp",
      accessScope: "restricted",
    });
    expect(a).not.toBe(b);
  });
});
