import { createAdminClient } from "@/lib/supabase/admin";
import { writeCampaignAuditEvent } from "@/lib/campaigns/audit";
import { todayInTimezone } from "@/lib/campaigns/civil-today";
import { compareCivil } from "@/lib/campaigns/occasions";

const OPEN_STATUSES = [
  "planned",
  "queued",
  "generating",
  "ready",
  "submitting",
] as const;

export async function completeDueCampaigns(params?: {
  organizationId?: string;
}): Promise<{ completedIds: string[] }> {
  const admin = createAdminClient();

  let query = admin
    .from("campaigns")
    .select("id, organization_id, end_date, timezone, status")
    .in("status", ["active", "paused"]);

  if (params?.organizationId) {
    query = query.eq("organization_id", params.organizationId);
  }

  const { data: campaigns, error } = await query;
  if (error) throw new Error(error.message);

  const completedIds: string[] = [];

  for (const campaign of campaigns ?? []) {
    const today = todayInTimezone(campaign.timezone);
    if (compareCivil(today, campaign.end_date) <= 0) continue;

    const { count, error: countError } = await admin
      .from("campaign_mailings")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .in("status", [...OPEN_STATUSES]);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) continue;

    const { error: updateError } = await admin
      .from("campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign.id)
      .in("status", ["active", "paused"]);

    if (updateError) throw new Error(updateError.message);

    await writeCampaignAuditEvent({
      organizationId: campaign.organization_id,
      campaignId: campaign.id,
      action: "completed",
      fromStatus: campaign.status,
      toStatus: "completed",
      payload: { reason: "end_date_passed_no_open_mailings" },
    });

    completedIds.push(campaign.id);
  }

  return { completedIds };
}
