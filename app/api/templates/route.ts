import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { isMasterDesignUsable } from "@/lib/campaigns/master-design";
import type { CardTemplate, DesignConfig } from "@/lib/types/cards";

export async function GET(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const campaignEligible =
      new URL(request.url).searchParams.get("campaignEligible") === "1";

    const supabase = createClient();

    let query = supabase
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
        updated_at,
        card_template_industries (
          industry_id,
          industry:industries (
            id,
            name,
            slug
          )
        )
      `
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data, error } = await query;

    if (error) {
      return apiError(
        { code: "TEMPLATES_ERROR", message: error.message },
        500
      );
    }

    const templates = ((data ?? []) as unknown as Array<
      CardTemplate & {
        card_template_industries?: Array<{
          industry_id: string;
          industry:
            | { id: string; name: string; slug: string }
            | { id: string; name: string; slug: string }[]
            | null;
        }>;
      }
    >)
      .map((row) => {
        const industries =
          row.card_template_industries
            ?.map((link) => {
              const industry = Array.isArray(link.industry)
                ? link.industry[0]
                : link.industry;
              return industry ?? null;
            })
            .filter(Boolean) ?? [];

        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          category: row.category,
          preview_image_url: row.preview_image_url,
          front_background_url: row.front_background_url,
          back_background_url: row.back_background_url,
          design_config: row.design_config as DesignConfig,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          industries: industries as { id: string; name: string; slug: string }[],
          _industryIds:
            row.card_template_industries?.map((l) => l.industry_id) ?? [],
        };
      })
      .filter((template) => {
        if (!template._industryIds.length) return true;
        if (!ctx.industryId) return true;
        return template._industryIds.includes(ctx.industryId);
      })
      .filter((template) =>
        campaignEligible
          ? isMasterDesignUsable(template.design_config as DesignConfig)
          : true
      )
      .map(({ _industryIds, ...template }) => template);

    return apiSuccess({ templates });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load templates",
      },
      500
    );
  }
}
