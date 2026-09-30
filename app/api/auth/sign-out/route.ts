import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { clearActiveOrganizationCookie } from "@/lib/auth/active-organization";

export async function POST() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return apiError(
        { code: "SIGN_OUT_FAILED", message: error.message },
        400
      );
    }

    clearActiveOrganizationCookie();

    return apiSuccess({ signedOut: true });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Sign out failed",
      },
      500
    );
  }
}
