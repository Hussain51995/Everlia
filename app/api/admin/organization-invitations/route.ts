import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createOrganizationInvitation } from "@/lib/onboarding/invitations";
import { createOrganizationInvitationSchema } from "@/lib/validations/onboarding";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = createOrganizationInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid invitation request")
      );
    }

    const invitation = await createOrganizationInvitation({
      organizationId: parsed.data.organizationId,
      createdBy: auth.user.id,
      email: parsed.data.email,
      expiresInHours: parsed.data.expiresInHours,
    });

    return apiSuccess({
      invitationId: invitation.invitationId,
      organizationId: invitation.organizationId,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      token: invitation.token,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create invitation",
      },
      500
    );
  }
}
