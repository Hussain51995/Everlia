import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  mapAuthError,
  unauthorizedError,
  validationError,
} from "@/lib/api/response";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = updatePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid password"));
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedError("Recovery session expired. Request a new link.");
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return apiError(mapAuthError(error.message), 400);
    }

    return apiSuccess({ updated: true });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update password",
      },
      500
    );
  }
}
