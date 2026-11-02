import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { createOrganization } from "@/lib/auth/organizations";
import { sortOrganizationsWithOtherLast } from "@/lib/auth/sort-organizations";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createOrganizationSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { uuidSchema } from "@/lib/validations/auth";

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get("industry_id");

    if (industryId) {
      const parsed = uuidSchema.safeParse(industryId);
      if (!parsed.success) {
        return validationError(firstZodError(parsed.error, "Invalid industry_id"));
      }
    }

    const admin = createAdminClient();
    let query = admin
      .from("organizations")
      .select(
        "id, name, slug, industry_id, is_active, is_system_other, onboarding_status, join_policy, workspace_type, created_at, industry:industries(id, name, slug, is_active)"
      )
      .order("name");

    if (industryId) {
      query = query.eq("industry_id", industryId);
    }

    const { data, error } = await query;

    if (error) {
      return apiError(
        { code: "ORGANIZATIONS_FETCH_FAILED", message: error.message },
        500
      );
    }

    return apiSuccess(sortOrganizationsWithOtherLast(data ?? []));
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load organizations",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = createOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid organization data")
      );
    }

    const organization = await createOrganization({
      industryId: parsed.data.industryId,
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      isActive: parsed.data.isActive,
    });

    return apiSuccess({ organization });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create organization",
      },
      500
    );
  }
}
