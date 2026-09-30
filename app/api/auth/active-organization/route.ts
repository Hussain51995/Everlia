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
import { createClient } from "@/lib/supabase/server";
import { activeOrganizationSchema } from "@/lib/validations/auth";
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
            "Platform admins manage industries and organizations — org switching is for members only",
        },
        403
      );
    }

    const body = await request.json();
    const parsed = activeOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid active organization")
      );
    }

    const supabase = createClient();
    const { data: membership, error } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", parsed.data.organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "MEMBERSHIP_CHECK_FAILED", message: error.message },
        500
      );
    }

    if (!membership) {
      return apiError(
        {
          code: "NOT_A_MEMBER",
          message: "You are not a member of that organization",
        },
        403
      );
    }

    setActiveOrganizationCookie(parsed.data.organizationId);
    const session = await getSessionPayload();

    return apiSuccess({ session });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to set active organization",
      },
      500
    );
  }
}
