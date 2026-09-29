import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unauthorizedError } from "@/lib/api/response";
import type { User } from "@supabase/supabase-js";

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_platform_admin", {
    check_user_id: userId,
  });

  if (!error && typeof data === "boolean") {
    return data;
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(row);
}

export async function requirePlatformAdmin(): Promise<
  { user: User } | { response: Response }
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { response: unauthorizedError() };
  }

  const admin = await isPlatformAdmin(user.id);
  if (!admin) {
    return {
      response: unauthorizedError("Platform admin access required"),
    };
  }

  return { user };
}
