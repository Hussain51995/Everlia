export type CacheProviderErrorCode =
  | "unavailable"
  | "timeout"
  | "write_failed"
  | "read_failed"
  | "serialization_failed"
  | "validation_failed"
  | "misconfigured"
  | "not_supported";

export class CacheProviderError extends Error {
  readonly code: CacheProviderErrorCode;
  readonly retryable: boolean;
  readonly causeMessage: string | null;

  constructor(input: {
    code: CacheProviderErrorCode;
    message: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(sanitizeCacheErrorMessage(input.message));
    this.name = "CacheProviderError";
    this.code = input.code;
    this.retryable =
      input.retryable ??
      (input.code === "unavailable" ||
        input.code === "timeout" ||
        input.code === "read_failed" ||
        input.code === "write_failed");
    this.causeMessage =
      input.cause instanceof Error
        ? sanitizeCacheErrorMessage(input.cause.message)
        : null;
  }
}

export function sanitizeCacheErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/UPSTASH_REDIS_REST_TOKEN[=:\s]+\S+/gi, "UPSTASH_REDIS_REST_TOKEN=[redacted]")
    .replace(/token["'\s:=]+[^\s"',}]+/gi, "token=[redacted]")
    .replace(/api[_-]?key["'\s:=]+[^\s"',}]+/gi, "api_key=[redacted]")
    .slice(0, 500);
}

export function isCacheUnavailableError(
  error: unknown
): error is CacheProviderError {
  return (
    error instanceof CacheProviderError &&
    (error.code === "unavailable" ||
      error.code === "timeout" ||
      error.code === "misconfigured")
  );
}
