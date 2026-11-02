import {
  apiError,
  apiSuccess,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const industryId = url.searchParams.get("industry_id");

    const admin = createAdminClient();
    let query = admin
      .from("organization_domains")
      .select(
        `
        id,
        organization_id,
        domain,
        verification_status,
        verification_method,
        verified_at,
        organization:organizations (
          id,
          name,
          slug,
          industry_id,
          is_active,
          workspace_type,
          onboarding_status
        )
      `
      )
      .order("domain", { ascending: true });

    if (status === "verified" || status === "pending") {
      query = query.eq("verification_status", status);
    }

    const { data, error } = await query;
    if (error) {
      return apiError({ code: "FETCH_FAILED", message: error.message }, 500);
    }

    let rows = data ?? [];
    if (industryId) {
      rows = rows.filter((row) => {
        const orgRaw = row.organization;
        const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
        return org?.industry_id === industryId;
      });
    }

    const byDomain = new Map<
      string,
      {
        domain: string;
        verificationStatuses: string[];
        organizationCount: number;
        organizations: Array<{
          id: string;
          name: string;
          industryId: string | null;
          isActive: boolean;
        }>;
      }
    >();

    for (const row of rows) {
      const orgRaw = row.organization;
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
      const key = String(row.domain).toLowerCase();
      const existing = byDomain.get(key) ?? {
        domain: key,
        verificationStatuses: [],
        organizationCount: 0,
        organizations: [],
      };
      existing.verificationStatuses.push(String(row.verification_status));
      existing.organizationCount += 1;
      if (org) {
        existing.organizations.push({
          id: org.id as string,
          name: org.name as string,
          industryId: (org.industry_id as string | null) ?? null,
          isActive: Boolean(org.is_active),
        });
      }
      byDomain.set(key, existing);
    }

    return apiSuccess({
      domains: Array.from(byDomain.values()).sort((a, b) =>
        a.domain.localeCompare(b.domain)
      ),
      rows,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to list domains",
      },
      500
    );
  }
}
