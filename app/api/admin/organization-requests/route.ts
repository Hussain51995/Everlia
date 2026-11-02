import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { listOrganizationRequests } from "@/lib/onboarding/organization-lifecycle";
import { z } from "zod";

const statusSchema = z
  .enum(["pending", "approved", "rejected"])
  .optional();

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const statusRaw = url.searchParams.get("status") ?? undefined;
    const parsed = statusSchema.safeParse(statusRaw);
    if (!parsed.success) {
      return validationError("Invalid status filter");
    }

    const data = await listOrganizationRequests({ status: parsed.data });
    return apiSuccess(data);
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to list organization requests",
      },
      500
    );
  }
}
