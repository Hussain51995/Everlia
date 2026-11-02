import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { approveOrganizationRequestById } from "@/lib/onboarding/organization-lifecycle";
import { uuidSchema } from "@/lib/validations/auth";

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid request id");

    const organization = await approveOrganizationRequestById({
      requestId: idParsed.data,
      reviewerId: auth.user.id,
    });

    return apiSuccess({ organization });
  } catch (error) {
    return apiError(
      {
        code: "APPROVE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to approve organization request",
      },
      400
    );
  }
}
