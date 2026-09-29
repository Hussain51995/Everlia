import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { slugifyOrganizationName } from "@/lib/auth/slugify";
import { updateIndustrySchema, uuidSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) {
      return validationError("Invalid industry id");
    }

    const body = await request.json();
    const parsed = updateIndustrySchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid industry update")
      );
    }

    const updates: Record<string, string | boolean> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.slug !== undefined) {
      updates.slug = slugifyOrganizationName(parsed.data.slug);
    }
    if (parsed.data.isActive !== undefined) {
      updates.is_active = parsed.data.isActive;
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("industries")
      .update(updates)
      .eq("id", idParsed.data)
      .select("id, name, slug, is_active")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "INDUSTRY_UPDATE_FAILED", message: error.message },
        400
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Industry not found" },
        404
      );
    }

    return apiSuccess({ industry: data });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update industry",
      },
      500
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) {
      return validationError("Invalid industry id");
    }

    const admin = createAdminClient();
    const industryId = idParsed.data;

    const { error: orgsError } = await admin
      .from("organizations")
      .delete()
      .eq("industry_id", industryId);

    if (orgsError) {
      return apiError(
        {
          code: "INDUSTRY_DELETE_FAILED",
          message: orgsError.message,
        },
        400
      );
    }

    const { data, error } = await admin
      .from("industries")
      .delete()
      .eq("id", industryId)
      .select("id, name")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "INDUSTRY_DELETE_FAILED", message: error.message },
        400
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Industry not found" },
        404
      );
    }

    return apiSuccess({ deleted: true, industry: data });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete industry",
      },
      500
    );
  }
}
