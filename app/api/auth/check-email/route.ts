import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  hashRateLimitIdentity,
} from "@/lib/onboarding/rate-limit";
import { normalizeEmailAddress } from "@/lib/onboarding/normalize-email";
import { emailSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

const checkEmailSchema = z.object({
  email: emailSchema,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkEmailSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid email"));
    }

    const email = normalizeEmailAddress(parsed.data.email);
    if (!email) {
      return validationError("Enter a valid email address");
    }

    const ip = getClientIp(request);
    const emailHash = await hashRateLimitIdentity(email);
    const limit = checkRateLimit({
      key: `auth:check-email:${ip}:${emailHash}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many attempts. Please try again later.",
        },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    return apiSuccess({
      email,
      nextStep: "continue" as const,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to check email",
      },
      500
    );
  }
}
