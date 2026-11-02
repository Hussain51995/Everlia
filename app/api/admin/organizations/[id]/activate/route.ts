import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { setOrganizationActiveState } from "@/lib/onboarding/organization-lifecycle";
import { uuidSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

type RouteContext = { params: { id: string } };

const bodySchema = z.object({
  isActive: z.boolean(),
  onboardingStatus: z.enum(["pending", "active", "rejected"]).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) return validationError("Invalid organization id");

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid body"));
    }

    const onboardingStatus =
      parsed.data.onboardingStatus ??
      (parsed.data.isActive ? "active" : "pending");

    const organization = await setOrganizationActiveState({
      organizationId: idParsed.data,
      isActive: parsed.data.isActive,
      onboardingStatus,
    });

    return apiSuccess({ organization });
  } catch (error) {
    return apiError(
      {
        code: "ACTIVATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update organization activation",
      },
      400
    );
  }
}
