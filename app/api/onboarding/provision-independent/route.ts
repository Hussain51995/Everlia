import {
  apiError,
  apiSuccess,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import { setActiveOrganizationCookie } from "@/lib/auth/active-organization";
import {
  getAuthenticatedUser,
  isPlatformAdmin,
} from "@/lib/auth/platform-admin";
import { getSessionPayload } from "@/lib/auth/session";
import { provisionIndependentWorkspace } from "@/lib/onboarding/independent";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";
import { provisionIndependentSchema } from "@/lib/validations/onboarding";
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
          message:
            "Platform admins do not use independent member workspaces",
        },
        403
      );
    }

    const body = await request.json();
    const parsed = provisionIndependentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid independent workspace request")
      );
    }

    const limit = checkRateLimit({
      key: `onboarding:independent:${getClientIp(request)}:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many workspace provisioning attempts.",
        },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await provisionIndependentWorkspace({
      userId: user.id,
      industryId: parsed.data.industryId,
      displayName: parsed.data.displayName || undefined,
    });

    setActiveOrganizationCookie(result.organizationId);
    const session = await getSessionPayload();

    return apiSuccess({ ...result, session });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to provision independent workspace",
      },
      500
    );
  }
}
