import type { ProviderError, ProviderErrorCode } from "@/lib/types/property-intelligence";

export type RetryPolicyOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicyOptions = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 4000,
};

const NON_RETRYABLE: ReadonlySet<ProviderErrorCode> = new Set([
  "unsupported_capability",
  "invalid_input",
  "not_found",
  "validation_failed",
  "configuration_error",
  "budget_denied",
]);

export function isRetryableProviderError(error: ProviderError): boolean {
  if (!error.retryable) return false;
  if (NON_RETRYABLE.has(error.code)) return false;
  return error.code === "rate_limited" ||
    error.code === "timeout" ||
    error.code === "provider_failure";
}

export function computeBackoffDelayMs(
  attemptIndex: number,
  options: RetryPolicyOptions = DEFAULT_RETRY_POLICY
): number {
  const exp = Math.min(
    options.maxDelayMs,
    options.baseDelayMs * 2 ** Math.max(0, attemptIndex)
  );
  const jitter = (options.random ?? Math.random)() * options.baseDelayMs;
  return Math.min(options.maxDelayMs, Math.floor(exp + jitter));
}

export async function sleepBackoff(
  attemptIndex: number,
  options: RetryPolicyOptions = DEFAULT_RETRY_POLICY
): Promise<void> {
  const delay = computeBackoffDelayMs(attemptIndex, options);
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  await sleep(delay);
}
