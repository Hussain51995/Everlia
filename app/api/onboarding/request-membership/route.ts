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
import { requestOrganizationMembership } from "@/lib/onboarding/membership";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";
import { requestMembershipSchema } from "@/lib/validations/onboarding";
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
            "Platform admins manage industries and organizations — joining orgs is for members only",
        },
        403
      );
    }

    const body = await request.json();
    const parsed = requestMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid membership request")
      );
    }

    const limit = checkRateLimit({
      key: `onboarding:membership:${getClientIp(request)}:${user.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many membership requests. Please try again later.",
        },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const result = await requestOrganizationMembership({
      userId: user.id,
      organizationId: parsed.data.organizationId,
      invitationToken: parsed.data.invitationToken,
    });

    if (
      result.activation === "invitation_required" ||
      result.activation === "domain_mismatch"
    ) {
      return apiError(
        {
          code: result.activation.toUpperCase(),
          message: result.message,
        },
        403
      );
    }

    if (
      result.activation === "active" ||
      result.activation === "already_member"
    ) {
      setActiveOrganizationCookie(result.organizationId);
    }

    const session = await getSessionPayload();

    return apiSuccess({ ...result, session });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to request membership",
      },
      500
    );
  }
}
