import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmailAddress } from "@/lib/onboarding/normalize-email";

export async function findAuthUserIdByEmail(
  email: string
): Promise<string | null> {
  const normalized = normalizeEmailAddress(email);
  if (!normalized) return null;

  const admin = createAdminClient();

  const { data: row, error: schemaError } = await admin
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (!schemaError && row?.id) {
    return row.id as string;
  }

  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized
    );
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
