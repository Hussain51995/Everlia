import {
  apiError,
  apiSuccess,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import {
  getAuthenticatedUser,
  isPlatformAdmin,
} from "@/lib/auth/platform-admin";
import { submitOrganizationRequest } from "@/lib/onboarding/organization-request";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";
import { requestOrganizationSchema } from "@/lib/validations/onboarding";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return unauthorizedError();
    }

    if (await isPlatformAdmin(user.id)) {
      return apiError(
        {
          code: "PLATFORM_ADMIN_FORBIDDEN",
          message: "Platform admins create organizations from the admin console",
        },
        403
      );
    }

    const body = await request.json();
    const parsed = requestOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid organization request")
      );
    }

    const limit = checkRateLimit({
      key: `onboarding:request-org:${getClientIp(request)}:${user.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many organization requests. Please try again later.",
        },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await submitOrganizationRequest({
      userId: user.id,
      industryId: parsed.data.industryId,
      name: parsed.data.name,
      domain: parsed.data.domain || undefined,
      workspaceType: parsed.data.workspaceType,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit organization request",
      },
      500
    );
  }
}
