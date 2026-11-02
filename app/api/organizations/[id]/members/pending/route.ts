import {
  apiError,
  apiSuccess,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import { getAuthenticatedUser } from "@/lib/auth/platform-admin";
import { listPendingMemberships } from "@/lib/onboarding/membership-moderation";
import { uuidSchema } from "@/lib/validations/auth";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedError();

    const orgParsed = uuidSchema.safeParse(context.params.id);
    if (!orgParsed.success) return validationError("Invalid organization id");

    const pending = await listPendingMemberships({
      organizationId: orgParsed.data,
      actorUserId: user.id,
    });

    return apiSuccess(pending);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list pending members";
    const status = message === "Forbidden" ? 403 : 500;
    return apiError(
      {
        code: status === 403 ? "FORBIDDEN" : "FETCH_FAILED",
        message,
      },
      status
    );
  }
}
