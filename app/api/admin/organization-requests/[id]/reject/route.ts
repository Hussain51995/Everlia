import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { rejectOrganizationRequestById } from "@/lib/onboarding/organization-lifecycle";
import { uuidSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

type RouteContext = { params: { id: string } };

const bodySchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid request id");

    let notes: string | undefined;
    try {
      const body = await request.json();
      const parsed = bodySchema.safeParse(body ?? {});
      if (!parsed.success) {
        return validationError(firstZodError(parsed.error, "Invalid body"));
      }
      notes = parsed.data.notes;
    } catch {
    }

    const organizationRequest = await rejectOrganizationRequestById({
      requestId: idParsed.data,
      reviewerId: auth.user.id,
      notes,
    });

    return apiSuccess({ request: organizationRequest });
  } catch (error) {
    return apiError(
      {
        code: "REJECT_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to reject organization request",
      },
      400
    );
  }
}
