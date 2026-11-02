import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { findValidInvitationByToken } from "@/lib/onboarding/invitations";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/onboarding/rate-limit";
import { acceptInvitationSchema } from "@/lib/validations/onboarding";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid invitation"));
    }

    const limit = checkRateLimit({
      key: `onboarding:resolve-invite:${getClientIp(request)}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!limit.allowed) {
      return apiError(
        { code: "RATE_LIMITED", message: "Too many attempts." },
        429,
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const { invitation, organization } = await findValidInvitationByToken(
      parsed.data.invitationToken
    );

    return apiSuccess({
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      emailLockedTo: invitation.email,
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid invitation";
    return apiError({ code: "INVALID_INVITATION", message }, 400);
  }
}
