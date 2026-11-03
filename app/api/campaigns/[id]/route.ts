import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { writeCampaignAuditEvent } from "@/lib/campaigns/audit";
import { generateDurableSchedule } from "@/lib/campaigns/schedule";
import {
  campaignPatchFromUpdate,
  replaceCampaignCustomers,
  replaceCampaignOccasions,
} from "@/lib/campaigns/persist";
import { campaignUpdateSchema } from "@/lib/validations/campaigns";
import { firstZodError } from "@/lib/validations/errors";
import type { CampaignDetail, CampaignMailingStatus } from "@/lib/types/campaigns";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select(
        `
        *,
        template:card_templates!campaigns_default_template_id_fkey (
          id, name, slug, preview_image_url, front_background_url, design_config
        )
      `
      )
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (error) {
      return apiError({ code: "CAMPAIGN_ERROR", message: error.message }, 500);
    }
    if (!campaign) {
      return apiError({ code: "NOT_FOUND", message: "Campaign not found" }, 404);
    }

    const [{ data: customers }, { data: occasions }, { data: billing }, { data: mailings }] =
      await Promise.all([
        supabase
          .from("campaign_customers")
          .select(
            `
            *,
            customer:customers (
              id, first_name, last_name, email, address_line1, city, province_or_state, postal_or_zip
            )
          `
          )
          .eq("campaign_id", params.id)
          .eq("organization_id", ctx.organizationId)
          .order("enrolled_at", { ascending: true }),
        supabase
          .from("campaign_occasions")
          .select(
            `
            *,
            occasion:occasions (
              id, slug, name, category, kind, rule, default_lead_days
            ),
            exclusions:campaign_occasion_exclusions ( id, customer_id, organization_id, campaign_occasion_id, created_at )
          `
          )
          .eq("campaign_id", params.id)
          .eq("organization_id", ctx.organizationId),
        supabase
          .from("campaign_billing_profiles")
          .select("*")
          .eq("campaign_id", params.id)
          .maybeSingle(),
        supabase
          .from("campaign_mailings")
          .select("status")
          .eq("campaign_id", params.id)
          .eq("organization_id", ctx.organizationId),
      ]);

    const mailing_status_counts: Partial<Record<CampaignMailingStatus, number>> =
      {};
    for (const row of mailings ?? []) {
      const key = row.status as CampaignMailingStatus;
      mailing_status_counts[key] = (mailing_status_counts[key] ?? 0) + 1;
    }

    const detail: CampaignDetail = {
      ...(campaign as CampaignDetail),
      customers: customers ?? [],
      occasions: occasions ?? [],
      billing: billing ?? null,
      mailing_status_counts,
    };

    return apiSuccess({ campaign: detail });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to load campaign",
      },
      500
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = campaignUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        firstZodError(parsed.error, "Invalid campaign update")
      );
    }

    const supabase = createClient();
    const { data: existing, error: loadError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (loadError) {
      return apiError({ code: "CAMPAIGN_ERROR", message: loadError.message }, 500);
    }
    if (!existing) {
      return apiError({ code: "NOT_FOUND", message: "Campaign not found" }, 404);
    }

    if (existing.status === "cancelled" || existing.status === "completed") {
      return apiError(
        {
          code: "IMMUTABLE",
          message: "Cancelled or completed campaigns cannot be edited",
        },
        400
      );
    }

    const input = parsed.data;
    const patch = campaignPatchFromUpdate(input);

    if (existing.status !== "draft" && input.startDate && input.startDate !== existing.start_date) {
      return validationError("Start date can only be changed while the campaign is a draft");
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from("campaigns")
        .update(patch)
        .eq("id", params.id)
        .eq("organization_id", ctx.organizationId);
      if (updateError) {
        return apiError({ code: "UPDATE_ERROR", message: updateError.message }, 500);
      }
    }

    if (input.customerIds) {
      await replaceCampaignCustomers({
        supabase,
        organizationId: ctx.organizationId,
        campaignId: params.id,
        customerIds: input.customerIds,
      });
    }

    if (input.occasions) {
      await replaceCampaignOccasions({
        supabase,
        organizationId: ctx.organizationId,
        campaignId: params.id,
        occasions: input.occasions,
      });
    }

    if (existing.status === "active" || existing.status === "paused") {
      await generateDurableSchedule({
        supabase,
        organizationId: ctx.organizationId,
        campaignId: params.id,
        actorUserId: ctx.user.id,
        replaceFuturePlanned: true,
      });
    }

    await writeCampaignAuditEvent({
      organizationId: ctx.organizationId,
      campaignId: params.id,
      actorUserId: ctx.user.id,
      action: "updated",
      payload: { fields: Object.keys(input) },
    });

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .single();

    return apiSuccess({ campaign });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update campaign",
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const supabase = createClient();
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", params.id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (!existing) {
      return apiError({ code: "NOT_FOUND", message: "Campaign not found" }, 404);
    }

    if (existing.status === "active" || existing.status === "paused") {
      return apiError(
        {
          code: "NOT_DELETABLE",
          message:
            "Cancel this campaign first, then delete it. Running campaigns cannot be removed while active or paused.",
        },
        400
      );
    }

    if (existing.status === "draft") {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", params.id)
        .eq("organization_id", ctx.organizationId);

      if (error) {
        return apiError({ code: "DELETE_ERROR", message: error.message }, 500);
      }
    } else {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { error } = await admin
        .from("campaigns")
        .delete()
        .eq("id", params.id)
        .eq("organization_id", ctx.organizationId)
        .in("status", ["scheduled", "cancelled", "completed"]);

      if (error) {
        return apiError({ code: "DELETE_ERROR", message: error.message }, 500);
      }
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete campaign",
      },
      500
    );
  }
}
