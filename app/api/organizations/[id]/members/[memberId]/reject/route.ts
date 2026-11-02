import {
  apiError,
  apiSuccess,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import { getAuthenticatedUser } from "@/lib/auth/platform-admin";
import { rejectPendingMembership } from "@/lib/onboarding/membership-moderation";
import { uuidSchema } from "@/lib/validations/auth";

type RouteContext = { params: { id: string; memberId: string } };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedError();

    const orgParsed = uuidSchema.safeParse(context.params.id);
    const memberParsed = uuidSchema.safeParse(context.params.memberId);
    if (!orgParsed.success || !memberParsed.success) {
      return validationError("Invalid organization or membership id");
    }

    const membership = await rejectPendingMembership({
      organizationId: orgParsed.data,
      membershipId: memberParsed.data,
      actorUserId: user.id,
    });

    return apiSuccess({ membership });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reject membership";
    const status = message === "Forbidden" ? 403 : 400;
    return apiError(
      {
        code: status === 403 ? "FORBIDDEN" : "REJECT_FAILED",
        message,
      },
      status
    );
  }
}
