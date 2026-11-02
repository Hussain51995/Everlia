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
import { findValidInvitationByToken } from "@/lib/onboarding/invitations";
import { requestOrganizationMembership } from "@/lib/onboarding/membership";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";
import { acceptInvitationSchema } from "@/lib/validations/onboarding";
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
          message: "Platform admins cannot redeem member invitations",
        },
        403
      );
    }

    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid invitation")
      );
    }

    const limit = checkRateLimit({
      key: `onboarding:invite:${getClientIp(request)}:${user.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        {
          code: "RATE_LIMITED",
          message: "Too many invitation attempts.",
        },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const { organization } = await findValidInvitationByToken(
      parsed.data.invitationToken
    );

    const result = await requestOrganizationMembership({
      userId: user.id,
      organizationId: organization.id,
      invitationToken: parsed.data.invitationToken,
    });

    if (
      result.activation === "active" ||
      result.activation === "already_member"
    ) {
      setActiveOrganizationCookie(result.organizationId);
    }

    const session = await getSessionPayload();
    return apiSuccess({ ...result, session });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept invitation";
    const lower = message.toLowerCase();
    if (
      lower.includes("invitation") ||
      lower.includes("expired") ||
      lower.includes("revoked")
    ) {
      return apiError({ code: "INVALID_INVITATION", message }, 400);
    }
    return apiError({ code: "SERVER_ERROR", message }, 500);
  }
}
