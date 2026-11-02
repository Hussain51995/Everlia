import { createAdminClient } from "@/lib/supabase/admin";
import {
  slugifyOrganizationName,
  withSlugSuffix,
} from "@/lib/auth/slugify";
import type { Industry, Organization } from "@/lib/types/auth";

type CreateOrganizationInput = {
  industryId: string;
  name: string;
  slug?: string;
  isActive?: boolean;
};

type CreateIndustryInput = {
  name: string;
  slug?: string;
  isActive?: boolean;
};

export async function assertActiveIndustry(industryId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industries")
    .select("id")
    .eq("id", industryId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selected industry is invalid or inactive");
  }
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<Organization> {
  await assertActiveIndustry(input.industryId);

  const admin = createAdminClient();
  const baseSlug = input.slug?.trim()
    ? slugifyOrganizationName(input.slug)
    : slugifyOrganizationName(input.name);

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);
    const { data, error } = await admin
      .from("organizations")
      .insert({
        industry_id: input.industryId,
        name: input.name.trim(),
        slug,
        is_active: input.isActive ?? true,
      })
      .select("id, name, slug, industry_id, is_active")
      .single();

    if (!error && data) {
      return data as Organization;
    }

    lastError = error?.message ?? "Failed to create organization";

    if (error?.code === "23505") {
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError ?? "Failed to create organization");
}

export async function createIndustry(
  input: CreateIndustryInput
): Promise<{ industry: Industry & { is_active?: boolean } }> {
  const admin = createAdminClient();
  const baseSlug = input.slug?.trim()
    ? slugifyOrganizationName(input.slug)
    : slugifyOrganizationName(input.name);

  let industry: (Industry & { is_active?: boolean }) | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);
    const { data, error } = await admin
      .from("industries")
      .insert({
        name: input.name.trim(),
        slug,
        is_active: input.isActive ?? true,
      })
      .select("id, name, slug, is_active")
      .single();

    if (!error && data) {
      industry = data as Industry & { is_active?: boolean };
      break;
    }

    lastError = error?.message ?? "Failed to create industry";
    if (error?.code === "23505") {
      continue;
    }
    throw new Error(lastError);
  }

  if (!industry) {
    throw new Error(lastError ?? "Failed to create industry");
  }

  return { industry };
}

export async function createIndustryWithOtherOrg(
  input: CreateIndustryInput
): Promise<{ industry: Industry & { is_active?: boolean } }> {
  return createIndustry(input);
}
