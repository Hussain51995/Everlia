import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { sortOrganizationsWithOtherLast } from "@/lib/auth/sort-organizations";
import { organizationsQuerySchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = organizationsQuerySchema.safeParse({
      industry_id: searchParams.get("industry_id"),
    });

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "industry_id is required")
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, industry_id")
      .eq("industry_id", parsed.data.industry_id)
      .eq("is_active", true)
      .order("name");

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
