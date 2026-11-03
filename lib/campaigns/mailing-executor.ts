import { createAdminClient } from "@/lib/supabase/admin";
import { writeCampaignAuditEvent } from "@/lib/campaigns/audit";
import { completeDueCampaigns } from "@/lib/campaigns/complete";
import { todayInTimezone } from "@/lib/campaigns/civil-today";
import { personalizeCampaignCard } from "@/lib/campaigns/personalize";
import { preflightCampaignMailing } from "@/lib/campaigns/preflight";
import { MAX_MAILING_RETRIES, computeNextRetryAt } from "@/lib/campaigns/retry";
import {
  DEFAULT_SCHEDULING_HORIZON_DAYS,
  generateDurableSchedule,
} from "@/lib/campaigns/schedule";
import { authorizeCampaignMailingSpend } from "@/lib/campaigns/budget";
import { recordUsageEvent, refreshCampaignUsageProfile } from "@/lib/campaigns/usage";
import { materializeGreetingCard } from "@/lib/cards/materialize";
import { generateCardArtwork } from "@/lib/cards/generate-artwork";
import { submitCardMail } from "@/lib/cards/submit-mail";
import type { CampaignMailing } from "@/lib/types/campaigns";
import type { DesignConfig, GreetingCardFieldValues } from "@/lib/types/cards";

export type ExecutorRunResult = {
  claimed: number;
  processed: number;
  submitted: number;
  failed: number;
  skipped: number;
  requeued: number;
  completedCampaigns: string[];
  refreshedSchedules: number;
  errors: Array<{ mailingId: string; message: string }>;
};

async function setMailingStatus(
  mailingId: string,
  patch: Record<string, unknown>
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("campaign_mailings")
    .update(patch)
    .eq("id", mailingId);
  if (error) throw new Error(error.message);
}

async function releaseToPlanned(mailingId: string, reason: string) {
  await setMailingStatus(mailingId, {
    status: "planned",
    queued_at: null,
    error_message: reason,
  });
}

async function skipMailing(
  mailing: CampaignMailing,
  status:
    | "skipped_window"
    | "skipped_paused"
    | "skipped_cancelled"
    | "skipped_past",
  reason: string,
  actorUserId?: string | null
) {
  await setMailingStatus(mailing.id, {
    status,
    skip_reason: reason,
    error_message: reason,
  });
  await writeCampaignAuditEvent({
    organizationId: mailing.organization_id,
    campaignId: mailing.campaign_id,
    actorUserId,
    action: "mailing_skipped",
    mailingId: mailing.id,
    fromStatus: mailing.status,
    toStatus: status,
    payload: { reason },
  });

  await recordUsageEvent({
    organizationId: mailing.organization_id,
    campaignId: mailing.campaign_id,
    mailingId: mailing.id,
    eventType: "mailing_skipped",
    billingMode: "waived",
    mailingMode: "test",
    idempotencyKey: `skip:${mailing.id}:${status}`,
    payload: { reason, status },
  });
}

async function failOrRetry(
  mailing: CampaignMailing,
  message: string,
  recoverable: boolean
) {
  const admin = createAdminClient();
  const nextRetry = mailing.retry_count + 1;

  if (recoverable && nextRetry < MAX_MAILING_RETRIES) {
    await admin
      .from("campaign_mailings")
      .update({
        status: "planned",
        retry_count: nextRetry,
        next_retry_at: computeNextRetryAt(nextRetry).toISOString(),
        error_message: message,
        queued_at: null,
      })
      .eq("id", mailing.id);
    return "requeued" as const;
  }

  await admin
    .from("campaign_mailings")
    .update({
      status: "failed",
      retry_count: nextRetry,
      error_message: message,
      failed_at: new Date().toISOString(),
    })
    .eq("id", mailing.id);

  await writeCampaignAuditEvent({
    organizationId: mailing.organization_id,
    campaignId: mailing.campaign_id,
    action: "mailing_failed",
    mailingId: mailing.id,
    fromStatus: mailing.status,
    toStatus: "failed",
    payload: { message, retryCount: nextRetry },
  });

  await recordUsageEvent({
    organizationId: mailing.organization_id,
    campaignId: mailing.campaign_id,
    mailingId: mailing.id,
    eventType: "mailing_failed",
    billingMode: "waived",
    mailingMode: "test",
    idempotencyKey: `fail:${mailing.id}:${nextRetry}`,
    payload: { message },
  });

  return "failed" as const;
}

export async function processClaimedMailing(
  mailingId: string
): Promise<"submitted" | "failed" | "skipped" | "requeued"> {
  const admin = createAdminClient();
  const preflight = await preflightCampaignMailing(mailingId);

  if (!preflight.ok) {
    const { data: mailing } = await admin
      .from("campaign_mailings")
      .select("*")
      .eq("id", mailingId)
      .maybeSingle();

    if (!mailing) return "failed";

    if (preflight.code === "campaign_not_active" && preflight.recoverable) {
      await releaseToPlanned(mailingId, preflight.message);
      return "requeued";
    }

    if (preflight.skipStatus) {
      await skipMailing(
        mailing as CampaignMailing,
        preflight.skipStatus,
        preflight.message
      );
      return "skipped";
    }

    if (preflight.code === "send_on_in_future") {
      await releaseToPlanned(mailingId, preflight.message);
      return "requeued";
    }

    return failOrRetry(
      mailing as CampaignMailing,
      preflight.message,
      preflight.recoverable
    );
  }

  const { mailing, context } = preflight;

  try {
    await setMailingStatus(mailing.id, {
      status: "generating",
      error_message: null,
    });

    const { data: milestone } = await admin
      .from("customer_milestones")
      .select("anchor_date, label, milestone_type")
      .eq("customer_id", mailing.customer_id)
      .eq("organization_id", mailing.organization_id)
      .eq("is_active", true)
      .order("anchor_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const personalized = personalizeCampaignCard({
      designConfig: context.template.design_config as DesignConfig,
      occasionSlug: context.occasion.occasion?.slug,
      occasionName:
        context.occasion.occasion?.name ?? context.occasion.custom_name,
      messageTemplateOverride: context.occasion.message_template,
      customer: {
        first_name: context.customer.first_name,
        last_name: context.customer.last_name,
      },
      sender: {
        first_name: null,
        last_name: null,
      },
      milestone: milestone
        ? {
            anchor_date: milestone.anchor_date,
            label: milestone.label,
            type: milestone.milestone_type,
          }
        : null,
      campaignName: context.campaign.name,
      baseFieldValues: (mailing.field_values ?? {}) as GreetingCardFieldValues,
      asOf: new Date(`${mailing.occasion_date}T12:00:00Z`),
    });

    await setMailingStatus(mailing.id, {
      field_values: personalized.fieldValues,
      content_snapshot: {
        greeting: personalized.greeting,
        message: personalized.message,
        footer: personalized.footer,
        occasionDate: mailing.occasion_date,
        sendOn: mailing.send_on,
        artworkPrepareOn: mailing.artwork_prepare_on ?? null,
        mode: context.campaign.mailing_mode,
        simulated: true,
      },
    });

    const card = await materializeGreetingCard({
      organizationId: mailing.organization_id,
      createdBy: context.campaign.created_by,
      templateId: mailing.template_id || context.campaign.default_template_id,
      customerId: mailing.customer_id,
      fieldValues: personalized.fieldValues,
      campaignId: mailing.campaign_id,
      campaignMailingId: mailing.id,
    });

    await setMailingStatus(mailing.id, {
      greeting_card_id: card.id,
      status: "generating",
    });

    const artwork = await generateCardArtwork({
      cardId: card.id,
      organizationId: mailing.organization_id,
      defaultSenderName: context.organization.name,
    });

    await setMailingStatus(mailing.id, {
      status: "ready",
      greeting_card_id: artwork.card.id,
    });

    await recordUsageEvent({
      organizationId: mailing.organization_id,
      campaignId: mailing.campaign_id,
      mailingId: mailing.id,
      eventType: "artwork_generated",
      billingMode: "waived",
      mailingMode: "test",
      idempotencyKey: `artwork:${mailing.id}:${artwork.card.id}`,
      payload: { greetingCardId: artwork.card.id },
    });

    const again = await preflightCampaignMailing(mailing.id);
    if (!again.ok) {
      if (again.recoverable && again.code === "campaign_not_active") {
        await releaseToPlanned(mailing.id, again.message);
        return "requeued";
      }
      if (again.skipStatus) {
        await skipMailing(mailing, again.skipStatus, again.message);
        return "skipped";
      }
      return failOrRetry(mailing, again.message, again.recoverable);
    }

    const authz = await authorizeCampaignMailingSpend({
      organizationId: mailing.organization_id,
      campaignId: mailing.campaign_id,
      mailingId: mailing.id,
      mailingMode: "test",
    });

    if (!authz.allowed) {
      return failOrRetry(mailing, authz.message, authz.reason === "insufficient_budget");
    }

    await setMailingStatus(mailing.id, { status: "submitting" });

    const send = await submitCardMail({
      cardId: artwork.card.id,
      organizationId: mailing.organization_id,
      campaignMailingMode: "test",
      orgName: context.organization.name,
      testLabel: true,
    });

    await setMailingStatus(mailing.id, {
      status: "submitted",
      greeting_card_id: send.card.id,
      mail_transaction_id: send.mailTransactionId,
      provider_mail_id: send.providerMailId,
      last_provider_status: send.providerStatus,
      submitted_at: new Date().toISOString(),
      error_message: null,
      next_retry_at: null,
    });

    await recordUsageEvent({
      organizationId: mailing.organization_id,
      campaignId: mailing.campaign_id,
      mailingId: mailing.id,
      eventType: "mailing_test_submitted",
      amountCents: authz.amountCents,
      currency: authz.currency,
      billingMode: authz.billingMode,
      mailingMode: "test",
      idempotencyKey: `submit:test:${mailing.id}:${send.providerMailId}`,
      payload: {
        provider: send.provider,
        simulated: send.simulated,
        authorizationId: authz.authorizationId,
      },
    });

    await writeCampaignAuditEvent({
      organizationId: mailing.organization_id,
      campaignId: mailing.campaign_id,
      action: "mailing_submitted",
      mailingId: mailing.id,
      fromStatus: "submitting",
      toStatus: "submitted",
      payload: {
        provider: send.provider,
        providerMailId: send.providerMailId,
        environment: send.environment,
        simulated: send.simulated,
        greetingCardId: send.card.id,
        amountCents: authz.amountCents,
      },
    });

    await refreshCampaignUsageProfile({
      organizationId: mailing.organization_id,
      campaignId: mailing.campaign_id,
    });

    return "submitted";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mailing processing failed";
    return failOrRetry(mailing, message, true);
  }
}

export async function refreshActiveCampaignSchedules(limit = 25): Promise<number> {
  const admin = createAdminClient();
  const { data: campaigns, error } = await admin
    .from("campaigns")
    .select("id, organization_id, created_by, configuration, timezone")
    .eq("status", "active")
    .eq("mailing_mode", "test")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let refreshed = 0;
  for (const campaign of campaigns ?? []) {
    const config = (campaign.configuration ?? {}) as Record<string, unknown>;
    const horizon =
      typeof config.schedulingHorizonDays === "number"
        ? config.schedulingHorizonDays
        : DEFAULT_SCHEDULING_HORIZON_DAYS;

    const lastRefresh = typeof config.lastScheduleRefreshAt === "string"
      ? Date.parse(config.lastScheduleRefreshAt)
      : 0;
    if (lastRefresh && Date.now() - lastRefresh < 6 * 60 * 60 * 1000) {
      continue;
    }

    await generateDurableSchedule({
      supabase: admin,
      organizationId: campaign.organization_id,
      campaignId: campaign.id,
      actorUserId: campaign.created_by,
      replaceFuturePlanned: true,
    });

    await admin
      .from("campaigns")
      .update({
        configuration: {
          ...config,
          schedulingHorizonDays: horizon,
          lastScheduleRefreshAt: new Date().toISOString(),
          timezoneNote: todayInTimezone(campaign.timezone),
        },
      })
      .eq("id", campaign.id);

    refreshed += 1;
  }

  return refreshed;
}

export async function runCampaignMailingWorker(options?: {
  batchSize?: number;
  refreshSchedules?: boolean;
}): Promise<ExecutorRunResult> {
  const admin = createAdminClient();
  const batchSize = Math.min(Math.max(options?.batchSize ?? 10, 1), 50);

  let refreshedSchedules = 0;
  if (options?.refreshSchedules !== false) {
    refreshedSchedules = await refreshActiveCampaignSchedules(10);
  }

  const { completedIds } = await completeDueCampaigns();

  const asOf = new Date().toISOString().slice(0, 10);

  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_campaign_mailings",
    {
      p_limit: batchSize,
      p_as_of_date: asOf,
    }
  );

  if (claimError) {
    throw new Error(`claim_campaign_mailings failed: ${claimError.message}`);
  }

  const mailings = (claimed ?? []) as CampaignMailing[];
  const result: ExecutorRunResult = {
    claimed: mailings.length,
    processed: 0,
    submitted: 0,
    failed: 0,
    skipped: 0,
    requeued: 0,
    completedCampaigns: completedIds,
    refreshedSchedules,
    errors: [],
  };

  for (const mailing of mailings) {
    try {
      const outcome = await processClaimedMailing(mailing.id);
      result.processed += 1;
      if (outcome === "submitted") result.submitted += 1;
      else if (outcome === "failed") result.failed += 1;
      else if (outcome === "skipped") result.skipped += 1;
      else if (outcome === "requeued") result.requeued += 1;
    } catch (error) {
      result.processed += 1;
      result.failed += 1;
      result.errors.push({
        mailingId: mailing.id,
        message:
          error instanceof Error ? error.message : "Unknown worker error",
      });
    }
  }

  return result;
}
