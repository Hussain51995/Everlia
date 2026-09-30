import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  mapAuthError,
  validationError,
} from "@/lib/api/response";
import { getSessionPayload } from "@/lib/auth/session";
import { signInSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid sign-in data"));
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return apiError(mapAuthError(error.message), 401);
    }

    const session = await getSessionPayload();

    if (!session) {
      return apiError(
        {
          code: "SESSION_ERROR",
          message: "Signed in but session could not be loaded",
        },
        500
      );
    }

    return apiSuccess({ session });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Sign in failed",
      },
      500
    );
  }
}
