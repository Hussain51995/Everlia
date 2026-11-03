import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { campaignSchedulePreviewSchema } from "@/lib/validations/campaigns";
import { firstZodError } from "@/lib/validations/errors";
import {
  getOccasionBySlug,
  occasionFromDbRow,
  previewCampaignSchedule,
  type CustomerMilestoneInput,
  type OccasionDefinition,
} from "@/lib/campaigns/occasions";


export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = campaignSchedulePreviewSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid schedule preview request")
      );
    }

    const input = parsed.data;
    const supabase = createClient();

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("organization_id", ctx.organizationId)
      .in("id", input.customerIds);

    if (customerError) {
      return apiError(
        { code: "CUSTOMER_ERROR", message: customerError.message },
        500
      );
    }

    const customerRows = customers ?? [];
    if (customerRows.length === 0) {
      return apiError(
        { code: "CUSTOMERS_NOT_FOUND", message: "No matching customers" },
        404
      );
    }

    const { data: milestoneRows, error: milestoneError } = await supabase
      .from("customer_milestones")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .in(
        "customer_id",
        customerRows.map((c) => c.id)
      )
      .eq("is_active", true);

    if (milestoneError) {
      return apiError(
        { code: "MILESTONE_ERROR", message: milestoneError.message },
        500
      );
    }

    const milestonesByCustomer = new Map<string, CustomerMilestoneInput[]>();
    for (const row of milestoneRows ?? []) {
      const list = milestonesByCustomer.get(row.customer_id) ?? [];
      list.push({
        id: row.id,
        customerId: row.customer_id,
        milestoneType: row.milestone_type,
        anchorDate: row.anchor_date,
        label: row.label,
        propertyType: row.property_type,
        recursAnnually: row.recurs_annually,
        isActive: row.is_active,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
      });
      milestonesByCustomer.set(row.customer_id, list);
    }

    const occasions: OccasionDefinition[] = [];

    if (input.occasionSlugs.length > 0) {
      const { data: occasionRows } = await supabase
        .from("occasions")
        .select(
          "id, slug, name, kind, category, country_code, rule, default_lead_days, is_active, is_default_selected, sort_order"
        )
        .eq("is_active", true)
        .in("slug", input.occasionSlugs);

      for (const slug of input.occasionSlugs) {
        const row = (occasionRows ?? []).find((o) => o.slug === slug);
        if (row) {
          occasions.push(occasionFromDbRow(row));
          continue;
        }
        const fromCatalog = getOccasionBySlug(slug);
        if (fromCatalog) {
          occasions.push(fromCatalog);
        }
      }
    }

    const leadDaysByOccasionSlug = {
      ...(input.leadDaysByOccasionSlug ?? {}),
    };
    const exclusionsByOccasionSlug = {
      ...(input.exclusionsByOccasionSlug ?? {}),
    };

    for (const custom of input.customOccasions) {
      const slug = `custom-preview-${custom.key}`;
      occasions.push({
        slug,
        name: custom.name,
        kind: "custom",
        category: "custom",
        rule: { type: "custom_once", date: custom.occurrenceDate },
        defaultLeadDays: custom.leadDays,
        isDefaultSelected: false,
      });
      leadDaysByOccasionSlug[slug] = custom.leadDays;
      if (custom.excludedCustomerIds?.length) {
        exclusionsByOccasionSlug[slug] = custom.excludedCustomerIds;
      }
    }

    if (occasions.length === 0) {
      return apiError(
        { code: "OCCASIONS_NOT_FOUND", message: "No matching occasions" },
        404
      );
    }

    const preview = previewCampaignSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone,
      customers: customerRows.map((c) => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        milestones: milestonesByCustomer.get(c.id) ?? [],
      })),
      occasions,
      leadDaysByOccasionSlug,
      exclusionsByOccasionSlug,
    });

    return apiSuccess({
      ...preview,
      cardsScheduled: false,
      mailingSubmitted: false,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to preview campaign schedule",
      },
      500
    );
  }
}
