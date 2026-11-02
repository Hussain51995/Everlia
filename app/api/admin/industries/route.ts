import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { createIndustry } from "@/lib/auth/organizations";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createIndustrySchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("industries")
      .select("id, name, slug, is_active, created_at")
      .order("name");

    if (error) {
      return apiError(
        { code: "INDUSTRIES_FETCH_FAILED", message: error.message },
        500
      );
    }

    return apiSuccess(data ?? []);
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load industries",
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
    const parsed = createIndustrySchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid industry data")
      );
    }

    const result = await createIndustry({
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      isActive: parsed.data.isActive,
    });

    return apiSuccess({
      industry: result.industry,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create industry",
      },
      500
    );
  }
}
