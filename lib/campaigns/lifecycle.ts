import { createClient } from "@/lib/supabase/server";
import { writeCampaignAuditEvent } from "@/lib/campaigns/audit";
import { todayInTimezone } from "@/lib/campaigns/civil-today";
import { assertCampaignLifecycleAdmin } from "@/lib/campaigns/rbac";
import { generateDurableSchedule } from "@/lib/campaigns/schedule";
import { compareCivil } from "@/lib/campaigns/occasions";
import { isCampaignLiveMailEnabled } from "@/lib/mail/mode-guard";
import type { Campaign, CampaignStatus } from "@/lib/types/campaigns";

type Ctx = {
  organizationId: string;
  actorUserId: string;
  campaignId: string;
};

async function loadCampaign(ctx: Ctx): Promise<Campaign> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", ctx.campaignId)
    .eq("organization_id", ctx.organizationId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Campaign not found");
  }
  return data as Campaign;
}

async function setStatus(params: {
  ctx: Ctx;
  from: CampaignStatus;
  to: CampaignStatus;
  timestamps?: Record<string, string | null>;
  action: "activated" | "paused" | "resumed" | "cancelled" | "completed";
  payload?: Record<string, unknown>;
}): Promise<Campaign> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: params.to,
      ...(params.timestamps ?? {}),
    })
    .eq("id", params.ctx.campaignId)
    .eq("organization_id", params.ctx.organizationId)
    .eq("status", params.from)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? `Could not transition campaign to ${params.to}`);
  }

  await writeCampaignAuditEvent({
    organizationId: params.ctx.organizationId,
    campaignId: params.ctx.campaignId,
    actorUserId: params.ctx.actorUserId,
    action: params.action,
    fromStatus: params.from,
    toStatus: params.to,
    payload: params.payload,
  });

  return data as Campaign;
}

export async function activateCampaign(ctx: Ctx): Promise<{
  campaign: Campaign;
  schedule: Awaited<ReturnType<typeof generateDurableSchedule>>;
}> {
  await assertCampaignLifecycleAdmin(ctx);
  const campaign = await loadCampaign(ctx);

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    throw new Error("Only draft campaigns can be activated");
  }
  if (campaign.mailing_mode === "dry_run") {
    throw new Error("Dry-run campaigns cannot be activated; use test mode");
  }
  if (campaign.mailing_mode === "live" && !isCampaignLiveMailEnabled()) {
    throw new Error(
      "Live mailing mode is disabled. Set CAMPAIGN_LIVE_MAIL_ENABLED=true and POSTGRID_MODE=live."
    );
  }

  const supabase = createClient();

  if (
    campaign.mailing_mode !== "test" &&
    campaign.mailing_mode !== "live"
  ) {
    await supabase
      .from("campaigns")
      .update({ mailing_mode: "test" })
      .eq("id", ctx.campaignId);
  }

  const schedule = await generateDurableSchedule({
    supabase,
    organizationId: ctx.organizationId,
    campaignId: ctx.campaignId,
    actorUserId: ctx.actorUserId,
    replaceFuturePlanned: true,
  });

  if (schedule.plannedCount < 1) {
    throw new Error(
      "No future mailings to schedule. Adjust the campaign window, occasions, or customer milestones."
    );
  }

  const activated = await setStatus({
    ctx,
    from: campaign.status,
    to: "active",
    timestamps: {
      activated_at: new Date().toISOString(),
      paused_at: null,
    },
    action: "activated",
    payload: {
      mailingMode: "test",
      plannedCount: schedule.plannedCount,
      note: "Scheduling lifecycle activated; no physical mail submitted yet",
    },
  });

  return { campaign: activated, schedule };
}

export async function pauseCampaign(ctx: Ctx): Promise<Campaign> {
  await assertCampaignLifecycleAdmin(ctx);
  const campaign = await loadCampaign(ctx);
  if (campaign.status !== "active") {
    throw new Error("Only active campaigns can be paused");
  }

  return setStatus({
    ctx,
    from: "active",
    to: "paused",
    timestamps: { paused_at: new Date().toISOString() },
    action: "paused",
  });
}

export async function resumeCampaign(ctx: Ctx): Promise<Campaign> {
  await assertCampaignLifecycleAdmin(ctx);
  const campaign = await loadCampaign(ctx);
  if (campaign.status !== "paused") {
    throw new Error("Only paused campaigns can be resumed");
  }

  const supabase = createClient();
  const today = todayInTimezone(campaign.timezone);

  const { data: missed, error: missedError } = await supabase
    .from("campaign_mailings")
    .select("id")
    .eq("campaign_id", ctx.campaignId)
    .eq("organization_id", ctx.organizationId)
    .eq("status", "planned")
    .lt("send_on", today);

  if (missedError) throw new Error(missedError.message);

  if (missed && missed.length > 0) {
    const { error: skipError } = await supabase
      .from("campaign_mailings")
      .update({
        status: "skipped_paused",
        skip_reason: "Missed while campaign was paused (SKIP_MISSED)",
      })
      .in(
        "id",
        missed.map((m) => m.id)
      );

    if (skipError) throw new Error(skipError.message);

    for (const row of missed) {
      await writeCampaignAuditEvent({
        organizationId: ctx.organizationId,
        campaignId: ctx.campaignId,
        actorUserId: ctx.actorUserId,
        action: "mailing_skipped",
        mailingId: row.id,
        fromStatus: "planned",
        toStatus: "skipped_paused",
        payload: { reason: "SKIP_MISSED" },
      });
    }
  }

  return setStatus({
    ctx,
    from: "paused",
    to: "active",
    timestamps: { paused_at: null },
    action: "resumed",
    payload: { skippedMissedCount: missed?.length ?? 0 },
  });
}

export async function cancelCampaign(ctx: Ctx): Promise<Campaign> {
  await assertCampaignLifecycleAdmin(ctx);
  const campaign = await loadCampaign(ctx);
  if (
    campaign.status === "cancelled" ||
    campaign.status === "completed" ||
    campaign.status === "draft"
  ) {
    throw new Error("Campaign cannot be cancelled from its current status");
  }

  const supabase = createClient();
  await supabase
    .from("campaign_mailings")
    .update({
      status: "skipped_cancelled",
      skip_reason: "Campaign cancelled",
    })
    .eq("campaign_id", ctx.campaignId)
    .eq("organization_id", ctx.organizationId)
    .in("status", ["planned", "queued"]);

  return setStatus({
    ctx,
    from: campaign.status,
    to: "cancelled",
    timestamps: { cancelled_at: new Date().toISOString() },
    action: "cancelled",
  });
}

export async function extendCampaign(
  ctx: Ctx,
  endDate: string
): Promise<{ campaign: Campaign; schedule: Awaited<ReturnType<typeof generateDurableSchedule>> }> {
  await assertCampaignLifecycleAdmin(ctx);
  const campaign = await loadCampaign(ctx);

  if (campaign.status !== "active" && campaign.status !== "paused") {
    throw new Error("Only active or paused campaigns can be extended");
  }
  if (compareCivil(endDate, campaign.end_date) <= 0) {
    throw new Error("New end date must be after the current end date");
  }
  if (compareCivil(endDate, campaign.start_date) < 0) {
    throw new Error("End date cannot be before start date");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({ end_date: endDate })
    .eq("id", ctx.campaignId)
    .eq("organization_id", ctx.organizationId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to extend campaign");

  await writeCampaignAuditEvent({
    organizationId: ctx.organizationId,
    campaignId: ctx.campaignId,
    actorUserId: ctx.actorUserId,
    action: "updated",
    payload: {
      extendEndDate: endDate,
      previousEndDate: campaign.end_date,
    },
  });

  const schedule = await generateDurableSchedule({
    supabase,
    organizationId: ctx.organizationId,
    campaignId: ctx.campaignId,
    actorUserId: ctx.actorUserId,
    replaceFuturePlanned: true,
  });

  return { campaign: data as Campaign, schedule };
}
