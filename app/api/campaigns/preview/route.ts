import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import { campaignPreviewSchema } from "@/lib/validations/campaigns";
import { generateCampaignArtworkPreview } from "@/lib/campaigns/preview";
import {
  getOrgOccasionMessageRow,
  rowToDefinition,
} from "@/lib/campaigns/org-messages";
import type { DesignConfig } from "@/lib/types/cards";


export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    const body = await request.json().catch(() => null);
    const parsed = campaignPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues[0]?.message ?? "Invalid preview request"
      );
    }

    const input = parsed.data;
    const supabase = createClient();

    const { data: template, error: templateError } = await supabase
      .from("card_templates")
      .select(
        "id, slug, name, category, front_background_url, back_background_url, design_config, is_active"
      )
      .eq("id", input.templateId)
      .maybeSingle();

    if (templateError) {
      return apiError(
        { code: "TEMPLATE_ERROR", message: templateError.message },
        500
      );
    }
    if (!template || template.is_active === false) {
      return apiError(
        { code: "TEMPLATE_NOT_FOUND", message: "Template not found" },
        404
      );
    }

    let customer = input.customer
      ? {
          first_name: input.customer.first_name ?? "",
          last_name: input.customer.last_name ?? "",
        }
      : null;

    if (input.customerId) {
      const { data: row, error: customerError } = await supabase
        .from("customers")
        .select("id, first_name, last_name, organization_id")
        .eq("id", input.customerId)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();

      if (customerError) {
        return apiError(
          { code: "CUSTOMER_ERROR", message: customerError.message },
          500
        );
      }
      if (!row) {
        return apiError(
          { code: "CUSTOMER_NOT_FOUND", message: "Customer not found" },
          404
        );
      }
      customer = {
        first_name: row.first_name,
        last_name: row.last_name,
      };
    }

    if (!customer) {
      return validationError("Customer is required");
    }

    let occasionSlug = input.occasionSlug ?? null;
    let occasionName = input.occasionName ?? null;

    if (input.occasionId) {
      const { data: occasion, error: occasionError } = await supabase
        .from("occasions")
        .select("id, slug, name, is_active")
        .eq("id", input.occasionId)
        .maybeSingle();

      if (occasionError) {
        return apiError(
          { code: "OCCASION_ERROR", message: occasionError.message },
          500
        );
      }
      if (!occasion || occasion.is_active === false) {
        return apiError(
          { code: "OCCASION_NOT_FOUND", message: "Occasion not found" },
          404
        );
      }
      occasionSlug = occasion.slug;
      occasionName = occasion.name;
    }

    const profile = ctx.session.profile;

    const { data: branding } = await supabase
      .from("organization_branding")
      .select("logo_url")
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    const orgMessageRow = occasionSlug
      ? await getOrgOccasionMessageRow(
          supabase,
          ctx.organizationId,
          occasionSlug
        )
      : null;

    const preview = await generateCampaignArtworkPreview({
      designConfig: template.design_config as DesignConfig,
      frontBackgroundUrl: template.front_background_url,
      backBackgroundUrl: template.back_background_url,
      customer,
      sender: {
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        title: null,
        phone: profile?.phone,
        email: ctx.session.user.email,
      },
      occasionSlug,
      occasionName,
      messageTemplateOverride: input.messageTemplateOverride,
      orgMessageDefinition: orgMessageRow
        ? rowToDefinition(orgMessageRow)
        : null,
      milestone: input.milestone,
      campaignName: input.campaignName,
      includePdf: input.includePdf,
      baseFieldValues:
        input.includeCompanyLogo && branding?.logo_url?.trim()
          ? { company_logo: branding.logo_url.trim() }
          : undefined,
    });

    return apiSuccess({
      template: {
        id: template.id,
        slug: template.slug,
        name: template.name,
        category: template.category,
      },
      occasion: occasionSlug
        ? { slug: occasionSlug, name: occasionName }
        : null,
      copy: {
        greeting: preview.greeting,
        message: preview.message,
        footer: preview.footer,
      },
      fieldValues: preview.fieldValues,
      artwork: {
        frontPngBase64: preview.frontPngBase64,
        backPngBase64: preview.backPngBase64,
        pdfBase64: preview.pdfBase64 ?? null,
        contentType: "image/png",
        width: (template.design_config as DesignConfig)?.width ?? 1800,
        height: (template.design_config as DesignConfig)?.height ?? 1200,
      },
      qrToken: preview.qrToken,
      mailingSubmitted: false,
    });
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate campaign preview",
      },
      500
    );
  }
}
