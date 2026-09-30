import { createAdminClient } from "@/lib/supabase/admin";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { slugifyOrganizationName } from "@/lib/auth/slugify";
import { updateOrganizationSchema } from "@/lib/validations/auth";
import { firstZodError } from "@/lib/validations/errors";
import { uuidSchema } from "@/lib/validations/auth";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requirePlatformAdmin();
    if ("response" in auth) return auth.response;

    const idParsed = uuidSchema.safeParse(context.params.id);
    if (!idParsed.success) {
      return validationError("Invalid organization id");
    }

    const body = await request.json();
    const parsed = updateOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid organization update")
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
      .from("organizations")
      .update(updates)
      .eq("id", idParsed.data)
      .select("id, name, slug, industry_id, is_active")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "ORGANIZATION_UPDATE_FAILED", message: error.message },
        400
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Organization not found" },
        404
      );
    }

    return apiSuccess({ organization: data });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update organization",
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
      return validationError("Invalid organization id");
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .delete()
      .eq("id", idParsed.data)
      .select("id, name")
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "ORGANIZATION_DELETE_FAILED", message: error.message },
        400
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Organization not found" },
        404
      );
    }

    return apiSuccess({ deleted: true, organization: data });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete organization",
      },
      500
    );
  }
}
