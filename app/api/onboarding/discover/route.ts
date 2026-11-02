import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { findAuthUserIdByEmail } from "@/lib/onboarding/account";
import { discoverOrganizations } from "@/lib/onboarding/discover";
import { normalizeEmailAddress } from "@/lib/onboarding/normalize-email";
import {
  checkRateLimit,
  getClientIp,
  hashRateLimitIdentity,
} from "@/lib/onboarding/rate-limit";
import { discoverOrganizationsSchema } from "@/lib/validations/onboarding";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = discoverOrganizationsSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid discovery request")
      );
    }

    const email =
      normalizeEmailAddress(parsed.data.email) ??
      parsed.data.email.trim().toLowerCase();
    const ip = getClientIp(request);
    const emailHash = await hashRateLimitIdentity(email);
    const limit = checkRateLimit({
      key: `onboarding:discover:${ip}:${emailHash}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many discovery attempts. Please try again later.",
        },
        429,
        {
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        }
      );
    }

    const existingUserId = await findAuthUserIdByEmail(email);
    if (existingUserId) {
      return apiError(
        {
          code: "USER_EXISTS",
          message:
            "An account with this email already exists. Go to Sign in to log in.",
        },
        409
      );
    }

    const result = await discoverOrganizations({
      industryId: parsed.data.industryId,
      email,
    });

    return apiSuccess(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Discovery failed";

    if (message.toLowerCase().includes("industry")) {
      return apiError({ code: "INVALID_INDUSTRY", message }, 400);
    }

    return apiError({ code: "SERVER_ERROR", message }, 500);
  }
}
