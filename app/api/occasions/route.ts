import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import {
  getDefaultSelectedOccasions,
  occasionFromDbRow,
  US_OCCASION_CATALOG,
} from "@/lib/campaigns/occasions";

export async function GET(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const url = new URL(request.url);
    const defaultsOnly = url.searchParams.get("defaults") === "1";
    const category = url.searchParams.get("category");

    const supabase = createClient();
    let query = supabase
      .from("occasions")
      .select(
        "id, slug, name, kind, category, country_code, rule, default_lead_days, is_active, is_default_selected, sort_order"
      )
      .eq("is_active", true)
      .eq("country_code", "US")
      .order("sort_order", { ascending: true });

    if (defaultsOnly) {
      query = query.eq("is_default_selected", true);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      // Table may not be migrated yet — serve code catalog
      const fallback = (
        defaultsOnly ? getDefaultSelectedOccasions() : US_OCCASION_CATALOG
      )
        .filter((o) => !category || o.category === category)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));

      return apiSuccess({
        occasions: fallback,
        source: "catalog",
      });
    }

    if (!data || data.length === 0) {
      const fallback = (
        defaultsOnly ? getDefaultSelectedOccasions() : US_OCCASION_CATALOG
      )
        .filter((o) => !category || o.category === category)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
      return apiSuccess({ occasions: fallback, source: "catalog" });
    }

    return apiSuccess({
      occasions: data.map(occasionFromDbRow),
      source: "database",
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load occasions",
      },
      500
    );
  }
}
