import { createAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/onboarding/normalize-email";
import type {
  DomainVerificationMethod,
  OrganizationDomain,
} from "@/lib/types/auth";

export async function addOrganizationDomain(params: {
  organizationId: string;
  domain: string;
}): Promise<OrganizationDomain> {
  const admin = createAdminClient();
  const domain = extractEmailDomain(params.domain);
  if (!domain) {
    throw new Error("Domain is invalid");
  }

  const { data, error } = await admin
    .from("organization_domains")
    .insert({
      organization_id: params.organizationId,
      domain,
      verification_status: "pending",
    })
    .select(
      "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to add organization domain");
  }

  return data as OrganizationDomain;
}

export async function verifyOrganizationDomain(params: {
  domainId: string;
  method?: DomainVerificationMethod;
}): Promise<OrganizationDomain> {
  const admin = createAdminClient();
  const method = params.method ?? "platform_admin";

  const { data: updated, error: updateError } = await admin
    .from("organization_domains")
    .update({
      verification_status: "verified",
      verification_method: method,
      verified_at: new Date().toISOString(),
    })
    .eq("id", params.domainId)
    .select(
      "id, organization_id, domain, verification_status, verification_method, verified_at, created_at, updated_at"
    )
    .maybeSingle();

  if (!updateError && updated?.id) {
    return updated as OrganizationDomain;
  }

  const { data, error } = await admin.rpc("verify_organization_domain", {
    p_domain_id: params.domainId,
    p_method: method,
  });

  if (error) {
    throw new Error(
      updateError?.message
        ? `${error.message} (direct update: ${updateError.message})`
        : error.message
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error("Failed to verify organization domain");
  }

  return row as OrganizationDomain;
}
