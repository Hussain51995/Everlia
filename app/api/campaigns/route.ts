import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { writeCampaignAuditEvent } from "@/lib/campaigns/audit";
import { activateCampaign } from "@/lib/campaigns/lifecycle";
import {
  campaignPatchFromUpdate,
  ensureBillingStub,
  replaceCampaignCustomers,
  replaceCampaignOccasions,
} from "@/lib/campaigns/persist";
import { assertMasterDesignUsable } from "@/lib/campaigns/master-design";
import { campaignCreateSchema } from "@/lib/validations/campaigns";
import { firstZodError } from "@/lib/validations/errors";
import type { DesignConfig } from "@/lib/types/cards";
import type { CampaignListItem } from "@/lib/types/campaigns";

export async function GET(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim().toLowerCase();

    const supabase = createClient();
    let query = supabase
      .from("campaigns")
      .select(
        `
        *,
        template:card_templates!campaigns_default_template_id_fkey (
          id, name, preview_image_url, front_background_url
        )
      `
      )
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return apiError({ code: "CAMPAIGNS_ERROR", message: error.message }, 500);
    }

    let campaigns = (data ?? []) as CampaignListItem[];
    if (q) {
      campaigns = campaigns.filter((c) => c.name.toLowerCase().includes(q));
    }

    const ids = campaigns.map((c) => c.id);
    const counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: enrollments } = await supabase
        .from("campaign_customers")
        .select("campaign_id")
        .eq("organization_id", ctx.organizationId)
        .eq("status", "enrolled")
        .in("campaign_id", ids);

      for (const row of enrollments ?? []) {
        counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
      }
    }

    return apiSuccess({
      campaigns: campaigns.map((c) => ({
        ...c,
        enrolled_count: counts.get(c.id) ?? 0,
      })),
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load campaigns",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = campaignCreateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid campaign data")
      );
    }

    const input = parsed.data;
    const supabase = createClient();

    const { data: template, error: templateError } = await supabase
      .from("card_templates")
      .select("id, design_config, is_active")
      .eq("id", input.defaultTemplateId)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError || !template) {
      return apiError(
        { code: "TEMPLATE_NOT_FOUND", message: "Design not found or inactive" },
        404
      );
    }

    try {
      assertMasterDesignUsable(template.design_config as DesignConfig);
    } catch (err) {
      return validationError(
        err instanceof Error ? err.message : "Design is not campaign-eligible"
      );
    }

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .in("id", input.customerIds);

    if (customerError) {
      return apiError(
        { code: "CUSTOMER_ERROR", message: customerError.message },
        500
      );
    }
    if ((customers ?? []).length !== input.customerIds.length) {
      return validationError("One or more customers were not found in this organization");
    }

    const patch = campaignPatchFromUpdate(input);
    const { data: campaign, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        organization_id: ctx.organizationId,
        created_by: ctx.user.id,
        status: "draft",
        mailing_mode: input.mailingMode === "dry_run" ? "test" : input.mailingMode,
        ...patch,
      })
      .select("*")
      .single();

    if (insertError || !campaign) {
      return apiError(
        { code: "CREATE_ERROR", message: insertError?.message ?? "Create failed" },
        500
      );
    }

    await replaceCampaignCustomers({
      supabase,
      organizationId: ctx.organizationId,
      campaignId: campaign.id,
      customerIds: input.customerIds,
    });

    await replaceCampaignOccasions({
      supabase,
      organizationId: ctx.organizationId,
      campaignId: campaign.id,
      occasions: input.occasions,
    });

    await ensureBillingStub({
      supabase,
      organizationId: ctx.organizationId,
      campaignId: campaign.id,
    });

    await writeCampaignAuditEvent({
      organizationId: ctx.organizationId,
      campaignId: campaign.id,
      actorUserId: ctx.user.id,
      action: "created",
      toStatus: "draft",
      payload: { name: campaign.name },
    });

    if (input.activate) {
      try {
        const result = await activateCampaign({
          organizationId: ctx.organizationId,
          actorUserId: ctx.user.id,
          campaignId: campaign.id,
        });
        return apiSuccess({
          campaign: result.campaign,
          schedule: result.schedule,
          activated: true,
        });
      } catch (activateError) {
        return apiError(
          {
            code: "ACTIVATE_ERROR",
            message:
              activateError instanceof Error
                ? `${activateError.message} (draft saved: ${campaign.id})`
                : `Campaign created but activation failed (draft saved: ${campaign.id})`,
          },
          400
        );
      }
    }

    return apiSuccess({ campaign, activated: false });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      500
    );
  }
}
