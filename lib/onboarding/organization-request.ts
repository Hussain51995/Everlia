import { createAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import type { OrganizationRequestSubmitResult } from "@/lib/types/onboarding";

export async function submitOrganizationRequest(params: {
  userId: string;
  industryId: string;
  name: string;
  domain?: string;
  workspaceType: "company" | "team";
}): Promise<OrganizationRequestSubmitResult> {
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

  const requestedDomain = params.domain?.trim()
    ? extractEmailDomain(params.domain)
    : null;

  if (params.domain?.trim() && !requestedDomain) {
    throw new Error("Requested domain is invalid");
  }

  const { data: existingPending, error: pendingError } = await admin
    .from("organization_requests")
    .select("id")
    .eq("requesting_user_id", params.userId)
    .eq("status", "pending")
    .limit(5);

  if (pendingError) throw new Error(pendingError.message);
  if ((existingPending?.length ?? 0) >= 5) {
    throw new Error("Too many pending organization requests");
  }

  const { data, error } = await admin
    .from("organization_requests")
    .insert({
      industry_id: params.industryId,
      requesting_user_id: params.userId,
      requested_name: params.name.trim(),
      requested_domain: requestedDomain,
      requested_workspace_type: params.workspaceType,
      status: "pending",
    })
    .select("id, requested_name, industry_id, status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to submit organization request");
  }

  return {
    requestId: data.id as string,
    status: "pending",
    requestedName: data.requested_name as string,
    industryId: data.industry_id as string,
  };
}
