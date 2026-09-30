import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { z } from "zod";

const checkEmailSchema = z.object({
  email: emailSchema,
});

async function authUserExistsByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data: row, error: schemaError } = await admin
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (!schemaError) {
    return Boolean(row?.id);
  }

  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.some(
      (user) => user.email?.toLowerCase() === normalized
    );
    if (match) return true;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkEmailSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(firstZodError(parsed.error, "Invalid email"));
    }

    const email = parsed.data.email.toLowerCase();
    const exists = await authUserExistsByEmail(email);

    return apiSuccess({ exists, email });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to check email",
      },
      500
    );
  }
}
