import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import {
  PROPERTY_INSIGHTS_NO_STORE_HEADERS,
  sanitizeInsightsForPublic,
} from "@/lib/property-intelligence/api/contract";
import { checkPublicInsightsRateLimit } from "@/lib/property-intelligence/execution/public-rate-limit";
import { createPropertyInsightsService } from "@/lib/property-intelligence/service/factory";
import { propertyInsightsRequestSchema } from "@/lib/validations/property-intelligence";
import { firstZodError } from "@/lib/validations/errors";

type Params = { params: { token: string } };

export async function GET(request: Request, { params }: Params) {
  return handleInsights(request, params.token);
}

export async function POST(request: Request, { params }: Params) {
  return handleInsights(request, params.token);
}

async function handleInsights(request: Request, token: string) {
  try {
    let categories: string[] | undefined;
    if (request.method === "POST") {
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const parsed = propertyInsightsRequestSchema.safeParse(body ?? {});
      if (!parsed.success) {
        return validationError(
          firstZodError(parsed.error, "Invalid property insights request")
        );
      }
      categories = parsed.data.categories;
    } else {
      const url = new URL(request.url);
      const raw = url.searchParams.getAll("category");
      if (raw.length > 0) {
        const parsed = propertyInsightsRequestSchema.safeParse({
          categories: raw,
        });
        if (!parsed.success) {
          return validationError(
            firstZodError(parsed.error, "Invalid category query")
          );
        }
        categories = parsed.data.categories;
      }
    }

    const admin = createAdminClient();
    const { data: qr, error } = await admin
      .from("qr_tokens")
      .select(
        `
        id,
        token,
        greeting_card:greeting_cards (
          id,
          organization_id,
          customer:customers (
            id,
            property_address,
            address_line1,
            city,
            province_or_state,
            postal_or_zip
          )
        )
      `
      )
      .eq("token", token)
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "RESPOND_ERROR", message: error.message },
        500,
        { headers: PROPERTY_INSIGHTS_NO_STORE_HEADERS }
      );
    }

    if (!qr?.greeting_card) {
      return apiError(
        { code: "NOT_FOUND", message: "This response link is invalid" },
        404,
        { headers: PROPERTY_INSIGHTS_NO_STORE_HEADERS }
      );
    }

    const cardRaw = Array.isArray(qr.greeting_card)
      ? qr.greeting_card[0]
      : qr.greeting_card;
    if (!cardRaw) {
      return apiError(
        { code: "NOT_FOUND", message: "This response link is invalid" },
        404,
        { headers: PROPERTY_INSIGHTS_NO_STORE_HEADERS }
      );
    }

    const customerRaw = Array.isArray(cardRaw.customer)
      ? cardRaw.customer[0]
      : cardRaw.customer;

    const rate = await checkPublicInsightsRateLimit({
      request,
      qrToken: token,
      organizationId: cardRaw.organization_id ?? null,
    });
    if (!rate.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many property insight requests. Please try again shortly.",
        },
        429,
        {
          headers: {
            ...PROPERTY_INSIGHTS_NO_STORE_HEADERS,
            "Retry-After": String(rate.retryAfterSeconds),
          },
        }
      );
    }

    const service = createPropertyInsightsService();
    const insights = await service.getInsights({
      auth: {
        organizationId: cardRaw.organization_id ?? null,
        customerId: customerRaw?.id ?? null,
        customer: {
          property_address: customerRaw?.property_address ?? null,
          address_line1: customerRaw?.address_line1 ?? null,
          city: customerRaw?.city ?? null,
          province_or_state: customerRaw?.province_or_state ?? null,
          postal_or_zip: customerRaw?.postal_or_zip ?? null,
        },
      },
      requestedCategories: categories as
        | import("@/lib/types/property-intelligence").PropertyDataCategory[]
        | undefined,
    });

    return apiSuccess(
      { insights: sanitizeInsightsForPublic(insights) },
      { headers: PROPERTY_INSIGHTS_NO_STORE_HEADERS }
    );
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load property insights",
      },
      500,
      { headers: PROPERTY_INSIGHTS_NO_STORE_HEADERS }
    );
  }
}
