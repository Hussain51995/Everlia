import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  mapAuthError,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import { getSessionPayload } from "@/lib/auth/session";
import { setupPasswordSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = setupPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid password")
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedError(
        "Your setup session expired. Use the email link again or sign up again."
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
      data: {
        needs_password_setup: false,
      },
    });

    if (error) {
      return apiError(mapAuthError(error.message), 400);
    }

    const session = await getSessionPayload();

    return apiSuccess({
      updated: true,
      session,
      next: "/dashboard",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to set password",
      },
      500
    );
  }
}
