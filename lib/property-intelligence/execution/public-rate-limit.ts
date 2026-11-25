import {
  checkRateLimit,
  getClientIp,
  hashRateLimitIdentity,
  type RateLimitResult,
} from "@/lib/onboarding/rate-limit";


export const PUBLIC_INSIGHTS_RATE_LIMITS = {
  perToken: { limit: 30, windowMs: 60_000 },
  perIp: { limit: 60, windowMs: 60_000 },
  perOrganization: { limit: 120, windowMs: 60_000 },
} as const;

export type PublicInsightsRateLimitInput = {
  request: Request;
  qrToken: string;
  organizationId?: string | null;
};

export type PublicInsightsRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  scope?: "token" | "ip" | "organization";
  remaining: number;
};

export async function checkPublicInsightsRateLimit(
  input: PublicInsightsRateLimitInput
): Promise<PublicInsightsRateLimitDecision> {
  const tokenHash = await hashRateLimitIdentity(`pi:token:${input.qrToken}`);
  const tokenResult = checkRateLimit({
    key: `pi:insights:token:${tokenHash}`,
    limit: PUBLIC_INSIGHTS_RATE_LIMITS.perToken.limit,
    windowMs: PUBLIC_INSIGHTS_RATE_LIMITS.perToken.windowMs,
  });
  if (!tokenResult.allowed) {
    return toDecision(tokenResult, "token");
  }

  const ip = getClientIp(input.request);
  const ipHash = await hashRateLimitIdentity(`pi:ip:${ip}`);
  const ipResult = checkRateLimit({
    key: `pi:insights:ip:${ipHash}`,
    limit: PUBLIC_INSIGHTS_RATE_LIMITS.perIp.limit,
    windowMs: PUBLIC_INSIGHTS_RATE_LIMITS.perIp.windowMs,
  });
  if (!ipResult.allowed) {
    return toDecision(ipResult, "ip");
  }

  if (input.organizationId) {
    const orgHash = await hashRateLimitIdentity(
      `pi:org:${input.organizationId}`
    );
    const orgResult = checkRateLimit({
      key: `pi:insights:org:${orgHash}`,
      limit: PUBLIC_INSIGHTS_RATE_LIMITS.perOrganization.limit,
      windowMs: PUBLIC_INSIGHTS_RATE_LIMITS.perOrganization.windowMs,
    });
    if (!orgResult.allowed) {
      return toDecision(orgResult, "organization");
    }
    return toDecision(orgResult);
  }

  return toDecision(ipResult);
}

function toDecision(
  result: RateLimitResult,
  scope?: PublicInsightsRateLimitDecision["scope"]
): PublicInsightsRateLimitDecision {
  return {
    allowed: result.allowed,
    retryAfterSeconds: result.retryAfterSeconds,
    remaining: result.remaining,
    scope,
  };
}
