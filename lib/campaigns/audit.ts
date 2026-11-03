import { createAdminClient } from "@/lib/supabase/admin";
import type { CampaignAuditAction } from "@/lib/types/campaigns";

export async function writeCampaignAuditEvent(params: {
  organizationId: string;
  campaignId: string;
  actorUserId?: string | null;
  action: CampaignAuditAction;
  mailingId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("campaign_audit_events").insert({
    organization_id: params.organizationId,
    campaign_id: params.campaignId,
    actor_user_id: params.actorUserId ?? null,
    action: params.action,
    mailing_id: params.mailingId ?? null,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    payload: params.payload ?? {},
  });

  if (error) {
    throw new Error(`Failed to write campaign audit: ${error.message}`);
  }
}
