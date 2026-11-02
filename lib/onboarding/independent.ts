import { createAdminClient } from "@/lib/supabase/admin";
import type { IndependentWorkspaceResult } from "@/lib/types/onboarding";

export async function provisionIndependentWorkspace(params: {
  userId: string;
  industryId: string;
  displayName?: string;
}): Promise<IndependentWorkspaceResult> {
  const admin = createAdminClient();

  const { data: industry, error: industryError } = await admin
    .from("industries")
    .select("id")
    .eq("id", params.industryId)
    .eq("is_active", true)
    .maybeSingle();

  if (industryError) throw new Error(industryError.message);
  if (!industry) {
    throw new Error("Selected industry is invalid or inactive");
  }

  const displayName = params.displayName?.trim() || null;

  const { data, error } = await admin.rpc("provision_independent_workspace", {
    p_user_id: params.userId,
    p_industry_id: params.industryId,
    p_display_name: displayName,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error("Failed to provision independent workspace");
  }

  return {
    organizationId: row.id as string,
    organizationName: (row.name as string) ?? "Independent Workspace",
    workspaceType: "independent",
    role: "owner",
  };
}
