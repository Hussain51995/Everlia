import {
  createProviderError,
  isTimeoutMessage,
  mapHttpStatusToErrorCode,
  sanitizeProviderMessage,
} from "@/lib/property-intelligence/errors";
import type { ProviderError } from "@/lib/types/property-intelligence";

export const RENTCAST_API_BASE = "https://api.rentcast.io/v1";

export type RentCastHttpResult =
  | { ok: true; httpStatus: number; data: unknown }
  | { ok: false; httpStatus: number; data: unknown; error: ProviderError };

export type RentCastHttpClient = {
  get(
    path: string,
    params: Record<string, string | number | boolean | null | undefined>
  ): Promise<RentCastHttpResult>;
};

function resolveApiKey(): string {
  const key = process.env.RENTCAST_API_KEY;
  if (!key) {
    throw createProviderError({
      code: "configuration_error",
      message: "RENTCAST_API_KEY is not configured",
      providerId: "rentcast",
      retryable: false,
    });
  }
  return key;
}

export function createRentCastHttpClient(options?: {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  baseUrl?: string;
}): RentCastHttpClient {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const baseUrl = options?.baseUrl ?? RENTCAST_API_BASE;

  return {
    async get(path, params) {
      let apiKey: string;
      try {
        apiKey = options?.apiKey ?? resolveApiKey();
      } catch (err) {
        const error =
          err && typeof err === "object" && "code" in err
            ? (err as ProviderError)
            : createProviderError({
                code: "configuration_error",
                message: "RENTCAST_API_KEY is not configured",
                providerId: "rentcast",
                retryable: false,
              });
        return { ok: false, httpStatus: 0, data: null, error };
      }

      const url = new URL(`${baseUrl}${path}`);
      for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }

      let response: Response;
      try {
        response = await fetchImpl(url.toString(), {
          headers: {
            Accept: "application/json",
            "X-Api-Key": apiKey,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        const code = isTimeoutMessage(msg) ? "timeout" : "provider_failure";
        return {
          ok: false,
          httpStatus: 0,
          data: null,
          error: createProviderError({
            code,
            message: sanitizeProviderMessage(msg),
            providerId: "rentcast",
            retryable: true,
            httpStatus: 0,
          }),
        };
      }

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const upstreamMessage =
          data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : `HTTP ${response.status}`;
        return {
          ok: false,
          httpStatus: response.status,
          data,
          error: createProviderError({
            code: mapHttpStatusToErrorCode(response.status),
            message: upstreamMessage,
            providerId: "rentcast",
            httpStatus: response.status,
            retryable:
              response.status === 429 ||
              response.status === 408 ||
              response.status >= 500,
          }),
        };
      }

      return { ok: true, httpStatus: response.status, data };
    },
  };
}
