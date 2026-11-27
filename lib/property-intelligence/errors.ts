import type {
  PropertyDataCategory,
  PropertyProviderId,
  ProviderError,
  ProviderErrorCode,
} from "@/lib/types/property-intelligence";

export function sanitizeProviderMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key["'\s:=]+[^\s"',}]+/gi, "api_key=[redacted]")
    .replace(/X-Api-Key["'\s:=]+[^\s"',}]+/gi, "X-Api-Key=[redacted]")
    .replace(/service_role[^\s"',}]*/gi, "[redacted]")
    .slice(0, 500);
}

export function createProviderError(input: {
  code: ProviderErrorCode;
  message: string;
  providerId: PropertyProviderId;
  retryable?: boolean;
  category?: PropertyDataCategory;
  httpStatus?: number | null;
}): ProviderError {
  const retryable =
    input.retryable ??
    (input.code === "rate_limited" ||
      input.code === "timeout" ||
      input.code === "provider_failure");

  return {
    code: input.code,
    message: sanitizeProviderMessage(input.message),
    retryable,
    providerId: input.providerId,
    category: input.category,
    httpStatus: input.httpStatus ?? null,
  };
}

export function mapHttpStatusToErrorCode(status: number): ProviderErrorCode {
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "invalid_input";
  if (status === 401 || status === 403) return "configuration_error";
  if (status === 429) return "rate_limited";
  if (status === 408) return "timeout";
  if (status >= 500) return "provider_failure";
  return "provider_failure";
}

export function isTimeoutMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("timeout") || m.includes("aborted") || m.includes("timed out");
}
