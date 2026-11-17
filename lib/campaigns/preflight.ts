import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimezone } from "@/lib/campaigns/civil-today";
import { compareCivil } from "@/lib/campaigns/occasions";
import { isCampaignWorkerMode } from "@/lib/mail/mode-guard";
import type { CampaignMailing, CampaignMailingMode } from "@/lib/types/campaigns";

export type PreflightFailureCode =
  | "campaign_not_active"
  | "organization_inactive"
  | "customer_not_enrolled"
  | "customer_opted_out"
  | "occasion_disabled"
  | "invalid_address"
  | "missing_content"
  | "outside_schedule_window"
  | "send_on_in_future"
  | "late_submission_blocked"
  | "duplicate_committed"
  | "mode_not_allowed"
  | "mailing_not_claimable";

export type PreflightResult =
  | { ok: true; mailing: CampaignMailing; context: PreflightContext }
  | {
      ok: false;
      code: PreflightFailureCode;
      message: string;
      recoverable: boolean;
      skipStatus?:
        | "skipped_window"
        | "skipped_paused"
        | "skipped_cancelled"
        | "skipped_past";
    };

export type PreflightContext = {
  campaign: {
    id: string;
    status: string;
    mailing_mode: string;
    start_date: string;
    end_date: string;
    timezone: string;
    created_by: string;
    default_template_id: string;
    name: string;
    organization_id: string;
    configuration: Record<string, unknown> | null;
  };
  organization: {
    id: string;
    name: string;
    is_active: boolean | null;
    onboarding_status: string | null;
  };
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    address_line1: string;
    city: string;
    province_or_state: string;
    postal_or_zip: string;
    country_code: string;
    metadata: Record<string, unknown> | null;
  };
  enrollment: { id: string; status: string };
  occasion: {
    id: string;
    is_enabled: boolean;
    message_template: string | null;
    lead_days: number | null;
    occasion_id: string | null;
    custom_name: string | null;
    occasion?: {
      slug: string;
      name: string;
    } | null;
  };
  template: {
    id: string;
    design_config: unknown;
    is_active: boolean;
  };
};

function hasValidAddress(customer: PreflightContext["customer"]): boolean {
  return Boolean(
    customer.address_line1?.trim() &&
      customer.city?.trim() &&
      customer.province_or_state?.trim() &&
      customer.postal_or_zip?.trim()
  );
}

export function isMailingAlreadyCommitted(mailing: {
  status: string;
  greeting_card_id?: string | null;
  mail_transaction_id?: string | null;
}): boolean {
  if (mailing.status === "submitted") return true;
  if (mailing.mail_transaction_id) return true;
  return false;
}

export async function preflightCampaignMailing(
  mailingId: string
): Promise<PreflightResult> {
  const admin = createAdminClient();

  const { data: mailing, error } = await admin
    .from("campaign_mailings")
    .select("*")
    .eq("id", mailingId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      code: "mailing_not_claimable",
      message: error.message,
      recoverable: true,
    };
  }
  if (!mailing) {
    return {
      ok: false,
      code: "mailing_not_claimable",
      message: "Mailing not found",
      recoverable: false,
    };
  }

  if (isMailingAlreadyCommitted(mailing)) {
    return {
      ok: false,
      code: "duplicate_committed",
      message: "Mailing already has a committed card or provider order",
      recoverable: false,
    };
  }

  if (!["queued", "generating", "ready", "submitting"].includes(mailing.status)) {
    return {
      ok: false,
      code: "mailing_not_claimable",
      message: `Mailing status ${mailing.status} is not executable`,
      recoverable: false,
    };
  }

  const { data: campaign } = await admin
    .from("campaigns")
    .select(
      "id, status, mailing_mode, start_date, end_date, timezone, created_by, default_template_id, name, organization_id, configuration"
    )
    .eq("id", mailing.campaign_id)
    .maybeSingle();

  if (!campaign) {
    return {
      ok: false,
      code: "campaign_not_active",
      message: "Campaign missing",
      recoverable: false,
      skipStatus: "skipped_cancelled",
    };
  }

  if (campaign.status === "paused") {
    return {
      ok: false,
      code: "campaign_not_active",
      message: "Campaign is paused — provider submission blocked",
      recoverable: true,
    };
  }

  if (campaign.status === "cancelled") {
    return {
      ok: false,
      code: "campaign_not_active",
      message: "Campaign is cancelled",
      recoverable: false,
      skipStatus: "skipped_cancelled",
    };
  }

  if (campaign.status !== "active") {
    return {
      ok: false,
      code: "campaign_not_active",
      message: `Campaign status is ${campaign.status}`,
      recoverable: false,
    };
  }

  if (!isCampaignWorkerMode(campaign.mailing_mode as CampaignMailingMode)) {
    return {
      ok: false,
      code: "mode_not_allowed",
      message: `Mailing mode ${campaign.mailing_mode} is not executable by the worker`,
      recoverable: campaign.mailing_mode === "live",
    };
  }

  const { data: organization } = await admin
    .from("organizations")
    .select("id, name, is_active, onboarding_status")
    .eq("id", campaign.organization_id)
    .maybeSingle();

  if (
    !organization ||
    organization.is_active === false ||
    (organization.onboarding_status &&
      organization.onboarding_status !== "active")
  ) {
    return {
      ok: false,
      code: "organization_inactive",
      message: "Organization is not active",
      recoverable: true,
    };
  }

  const { data: enrollment } = await admin
    .from("campaign_customers")
    .select("id, status")
    .eq("id", mailing.campaign_customer_id)
    .maybeSingle();

  if (!enrollment || enrollment.status !== "enrolled") {
    return {
      ok: false,
      code: "customer_not_enrolled",
      message: "Customer is no longer enrolled",
      recoverable: false,
      skipStatus: "skipped_cancelled",
    };
  }

  const { data: customer } = await admin
    .from("customers")
    .select(
      "id, first_name, last_name, address_line1, city, province_or_state, postal_or_zip, country_code, metadata"
    )
    .eq("id", mailing.customer_id)
    .maybeSingle();

  if (!customer) {
    return {
      ok: false,
      code: "customer_not_enrolled",
      message: "Customer record missing",
      recoverable: false,
      skipStatus: "skipped_cancelled",
    };
  }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>;
  if (
    metadata.do_not_mail === true ||
    metadata.opted_out === true ||
    metadata.opt_out === true
  ) {
    return {
      ok: false,
      code: "customer_opted_out",
      message: "Customer opted out of mail",
      recoverable: false,
      skipStatus: "skipped_cancelled",
    };
  }

  if (!hasValidAddress(customer as PreflightContext["customer"])) {
    return {
      ok: false,
      code: "invalid_address",
      message: "Customer mailing address is incomplete",
      recoverable: true,
    };
  }

  const { data: occasion } = await admin
    .from("campaign_occasions")
    .select(
      `
      id, is_enabled, message_template, lead_days, occasion_id, custom_name,
      occasion:occasions ( slug, name )
    `
    )
    .eq("id", mailing.campaign_occasion_id)
    .maybeSingle();

  if (!occasion || !occasion.is_enabled) {
    return {
      ok: false,
      code: "occasion_disabled",
      message: "Campaign occasion is disabled or missing",
      recoverable: false,
      skipStatus: "skipped_cancelled",
    };
  }

  const templateId = mailing.template_id || campaign.default_template_id;
  const { data: template } = await admin
    .from("card_templates")
    .select("id, design_config, is_active")
    .eq("id", templateId)
    .maybeSingle();

  if (!template?.is_active || !template.design_config) {
    return {
      ok: false,
      code: "missing_content",
      message: "Template missing or inactive",
      recoverable: true,
    };
  }

  const today = todayInTimezone(campaign.timezone);

  if (compareCivil(mailing.occasion_date, campaign.start_date) < 0) {
    return {
      ok: false,
      code: "outside_schedule_window",
      message: "Occasion date before campaign start",
      recoverable: false,
      skipStatus: "skipped_window",
    };
  }

  if (compareCivil(mailing.occasion_date, campaign.end_date) > 0) {
    return {
      ok: false,
      code: "outside_schedule_window",
      message: "Occasion date after campaign end",
      recoverable: false,
      skipStatus: "skipped_window",
    };
  }

  if (compareCivil(mailing.send_on, today) > 0) {
    return {
      ok: false,
      code: "send_on_in_future",
      message: "Planned submission date is still in the future",
      recoverable: true,
    };
  }

  if (compareCivil(mailing.send_on, campaign.end_date) > 0) {
    return {
      ok: false,
      code: "late_submission_blocked",
      message: "Submission date outside campaign window",
      recoverable: false,
      skipStatus: "skipped_window",
    };
  }

  const occasionRel = occasion.occasion as
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;

  const occasionInfo = Array.isArray(occasionRel)
    ? occasionRel[0]
    : occasionRel;

  return {
    ok: true,
    mailing: mailing as CampaignMailing,
    context: {
      campaign,
      organization,
      customer: customer as PreflightContext["customer"],
      enrollment,
      occasion: {
        ...occasion,
        occasion: occasionInfo ?? null,
      },
      template,
    },
  };
}
