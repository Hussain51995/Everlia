import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import type { CardTemplate, DesignConfig } from "@/lib/types/cards";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("card_templates")
      .select(
        `
        id,
        slug,
        name,
        category,
        preview_image_url,
        front_background_url,
        back_background_url,
        design_config,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq("id", params.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return apiError(
        { code: "TEMPLATE_ERROR", message: error.message },
        500
      );
    }

    if (!data) {
      return apiError(
        { code: "NOT_FOUND", message: "Template not found" },
        404
      );
    }

    const template: CardTemplate = {
      ...(data as CardTemplate),
      design_config: data.design_config as DesignConfig,
    };

    return apiSuccess({ template });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load template",
      },
      500
    );
  }
}
