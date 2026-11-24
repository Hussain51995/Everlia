
export const RENTCAST_BASE = "https://api.rentcast.io/v1";

export type RentCastCategory =
  | "propertyDetails"
  | "valuation"
  | "nearbyHouses"
  | "nearbyLand"
  | "marketStatistics";

export interface CategoryResult {
  status: "success" | "error" | "skipped";
  httpStatus: number | null;
  endpoint: string;
  parameters: Record<string, string | number | boolean | null>;
  requestedAt: string;
  data: unknown;
  errorMessage?: string;
}

export interface TesterResponse {
  inputAddress: string;
  provider: "rentcast";
  requestedAt: string;
  summary: {
    successfulRequests: number;
    failedRequests: number;
    skippedRequests: number;
    totalRequests: number;
  };
  results: Partial<Record<RentCastCategory, CategoryResult>>;
}

function getApiKey(): string {
  const key = process.env.RENTCAST_API_KEY;
  if (!key) {
    throw new Error(
      "RENTCAST_API_KEY is not configured. Add it to your environment variables."
    );
  }
  return key;
}

function rentcastHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "X-Api-Key": getApiKey(),
  };
}

async function fetchRentCast(
  path: string,
  params: Record<string, string | number | boolean | null>
): Promise<{ httpStatus: number; data: unknown; error?: string }> {
  const url = new URL(`${RENTCAST_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: rentcastHeaders(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { httpStatus: 0, data: null, error: msg };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errMsg =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : null) ?? `HTTP ${response.status}`;
    return { httpStatus: response.status, data, error: errMsg };
  }

  return { httpStatus: response.status, data };
}

export async function fetchPropertyDetails(
  address: string
): Promise<CategoryResult> {
  const endpoint = "/properties";
  const parameters = { address };
  const requestedAt = new Date().toISOString();

  const { httpStatus, data, error } = await fetchRentCast(endpoint, parameters);

  if (error) {
    return {
      status: "error",
      httpStatus,
      endpoint: `${RENTCAST_BASE}${endpoint}`,
      parameters,
      requestedAt,
      data,
      errorMessage: error,
    };
  }

  return {
    status: "success",
    httpStatus,
    endpoint: `${RENTCAST_BASE}${endpoint}`,
    parameters,
    requestedAt,
    data,
  };
}

export async function fetchValuation(
  address: string
): Promise<CategoryResult> {
  const endpoint = "/avm/value";
  const parameters = { address, compCount: 5 };
  const requestedAt = new Date().toISOString();

  const { httpStatus, data, error } = await fetchRentCast(endpoint, parameters);

  if (error) {
    return {
      status: "error",
      httpStatus,
      endpoint: `${RENTCAST_BASE}${endpoint}`,
      parameters,
      requestedAt,
      data,
      errorMessage: error,
    };
  }

  return {
    status: "success",
    httpStatus,
    endpoint: `${RENTCAST_BASE}${endpoint}`,
    parameters,
    requestedAt,
    data,
  };
}

export async function fetchNearbyHouses(
  address: string
): Promise<CategoryResult> {
  const endpoint = "/listings/sale";
  const parameters = {
    address,
    propertyType: "Single Family|Condo|Townhouse|Multi-Family|Manufactured",
    status: "Active",
    radius: 1,
    limit: 10,
  };
  const requestedAt = new Date().toISOString();

  const { httpStatus, data, error } = await fetchRentCast(endpoint, parameters);

  if (error) {
    return {
      status: "error",
      httpStatus,
      endpoint: `${RENTCAST_BASE}${endpoint}`,
      parameters,
      requestedAt,
      data,
      errorMessage: error,
    };
  }

  return {
    status: "success",
    httpStatus,
    endpoint: `${RENTCAST_BASE}${endpoint}`,
    parameters,
    requestedAt,
    data,
  };
}

export async function fetchNearbyLand(
  address: string
): Promise<CategoryResult> {
  const endpoint = "/listings/sale";
  const parameters = {
    address,
    propertyType: "Land",
    status: "Active",
    radius: 5,
    limit: 10,
  };
  const requestedAt = new Date().toISOString();

  const { httpStatus, data, error } = await fetchRentCast(endpoint, parameters);

  if (error) {
    return {
      status: "error",
      httpStatus,
      endpoint: `${RENTCAST_BASE}${endpoint}`,
      parameters,
      requestedAt,
      data,
      errorMessage: error,
    };
  }

  return {
    status: "success",
    httpStatus,
    endpoint: `${RENTCAST_BASE}${endpoint}`,
    parameters,
    requestedAt,
    data,
  };
}

export async function fetchMarketStatistics(
  zipCode: string | null | undefined
): Promise<CategoryResult> {
  const endpoint = "/markets";
  const requestedAt = new Date().toISOString();

  if (!zipCode) {
    return {
      status: "skipped",
      httpStatus: null,
      endpoint: `${RENTCAST_BASE}${endpoint}`,
      parameters: {},
      requestedAt,
      data: null,
      errorMessage:
        "Skipped: ZIP code is required for market statistics but could not be resolved from the property record.",
    };
  }

  const parameters = { zipCode };

  const { httpStatus, data, error } = await fetchRentCast(endpoint, parameters);

  if (error) {
    return {
      status: "error",
      httpStatus,
      endpoint: `${RENTCAST_BASE}${endpoint}`,
      parameters,
      requestedAt,
      data,
      errorMessage: error,
    };
  }

  return {
    status: "success",
    httpStatus,
    endpoint: `${RENTCAST_BASE}${endpoint}`,
    parameters,
    requestedAt,
    data,
  };
}


export function extractZipCode(propertyData: unknown): string | null {
  if (!propertyData || typeof propertyData !== "object") return null;

  const record = Array.isArray(propertyData)
    ? (propertyData[0] as Record<string, unknown>)
    : (propertyData as Record<string, unknown>);

  if (!record) return null;

  if (typeof record.zipCode === "string" && record.zipCode) return record.zipCode;
  if (typeof record.zip_code === "string" && record.zip_code) return record.zip_code;
  if (typeof record.zip === "string" && record.zip) return record.zip;

  if (typeof record.addressLine2 === "string") {
    const m = record.addressLine2.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (m) return m[1];
  }

  return null;
}

export function estimateCallCount(categories: RentCastCategory[]): number {
  return categories.length;
}
