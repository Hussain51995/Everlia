import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  resetRateLimitBuckets,
} from "@/lib/onboarding/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("allows requests under the limit", () => {
    const first = checkRateLimit({
      key: "test",
      limit: 2,
      windowMs: 60_000,
      now: 1_000,
    });
    const second = checkRateLimit({
      key: "test",
      limit: 2,
      windowMs: 60_000,
      now: 1_100,
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks when the limit is exceeded", () => {
    checkRateLimit({ key: "test", limit: 1, windowMs: 60_000, now: 1_000 });
    const blocked = checkRateLimit({
      key: "test",
      limit: 1,
      windowMs: 60_000,
      now: 1_100,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
