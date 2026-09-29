import {
  apiError,
  apiSuccess,
  mapAuthError,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import { setActiveOrganizationCookie } from "@/lib/auth/active-organization";
import { joinOrganizationAsMember } from "@/lib/auth/join-organization";
import {
  getAuthenticatedUser,
  isPlatformAdmin,
} from "@/lib/auth/platform-admin";
import { getSessionPayload } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { joinOrganizationSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = joinOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid join organization data")
      );
    }

    const { organizationId, email, password } = parsed.data;
    let userId: string | null = null;

    if (email && password) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return apiError(mapAuthError(error?.message), 401);
      }

      userId = data.user.id;
    } else {
      const user = await getAuthenticatedUser();
      if (!user) {
        return unauthorizedError();
      }
      userId = user.id;
    }

    if (await isPlatformAdmin(userId)) {
      return apiError(
        {
          code: "PLATFORM_ADMIN_FORBIDDEN",
          message:
            "Platform admins manage industries and organizations — joining orgs is for members only",
        },
        403
      );
    }

    const result = await joinOrganizationAsMember(userId, organizationId);
    setActiveOrganizationCookie(organizationId);

    const session = await getSessionPayload();

    return apiSuccess({
      joined: !result.alreadyMember,
      alreadyMember: result.alreadyMember,
      organization: result.organization,
      organizationName: result.organization.name,
      session,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to join organization",
      },
      500
    );
  }
}
