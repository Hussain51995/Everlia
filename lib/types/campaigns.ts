export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type CampaignMailingMode = "dry_run" | "test" | "live";

export type CampaignCustomerStatus = "enrolled" | "removed";

export type CampaignMailingStatus =
  | "planned"
  | "queued"
  | "generating"
  | "ready"
  | "submitting"
  | "submitted"
  | "failed"
  | "cancelled"
  | "skipped_past"
  | "skipped_paused"
  | "skipped_window"
  | "skipped_cancelled";

export type CampaignBillingMode = "waived" | "usage" | "prepaid" | "invoice";

export type CampaignBillingState = "waived" | "pending" | "charged" | "failed";

export type CampaignAuditAction =
  | "created"
  | "updated"
  | "edited"
  | "activated"
  | "paused"
  | "resumed"
  | "cancelled"
  | "completed"
  | "schedule_generated"
  | "mailing_skipped"
  | "mailing_submitted"
  | "mailing_failed"
  | "mode_changed"
  | "customers_changed"
  | "occasions_changed";

export type Campaign = {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  status: CampaignStatus;
  default_template_id: string;
  start_date: string;
  end_date: string;
  mailing_mode: CampaignMailingMode;
  timezone: string;
  configuration: Record<string, unknown>;
  field_value_defaults: Record<string, unknown>;
  last_error: Record<string, unknown> | null;
  activated_at: string | null;
  paused_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignCustomer = {
  id: string;
  campaign_id: string;
  organization_id: string;
  customer_id: string;
  status: CampaignCustomerStatus;
  enrolled_at: string;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    address_line1: string;
    city: string;
    province_or_state: string;
    postal_or_zip: string;
  } | null;
};

export type CampaignOccasion = {
  id: string;
  campaign_id: string;
  organization_id: string;
  occasion_id: string | null;
  custom_name: string | null;
  occurrence_date: string | null;
  recurrence_rule: Record<string, unknown> | null;
  template_id: string | null;
  lead_days: number | null;
  message_template: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  occasion?: {
    id: string;
    slug: string;
    name: string;
    category: string;
    kind: string;
    rule: Record<string, unknown>;
    default_lead_days: number | null;
  } | null;
  exclusions?: CampaignOccasionExclusion[];
};

export type CampaignOccasionExclusion = {
  id: string;
  campaign_occasion_id: string;
  organization_id: string;
  customer_id: string;
  created_at: string;
};

export type CampaignMailing = {
  id: string;
  campaign_id: string;
  organization_id: string;
  campaign_customer_id: string;
  customer_id: string;
  campaign_occasion_id: string;
  occasion_date: string;
  send_on: string;
  artwork_prepare_on?: string | null;
  template_id: string;
  status: CampaignMailingStatus;
  skip_reason: string | null;
  greeting_card_id: string | null;
  mail_transaction_id: string | null;
  provider_mail_id: string | null;
  last_provider_status?: string | null;
  field_values: Record<string, unknown>;
  content_snapshot: Record<string, unknown> | null;
  idempotency_key: string;
  retry_count: number;
  error_message: string | null;
  next_retry_at?: string | null;
  queued_at: string | null;
  submitted_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

export type CampaignBillingProfile = {
  campaign_id: string;
  organization_id: string;
  billing_mode: CampaignBillingMode;
  currency: string;
  unit_postage_cents: number;
  unit_platform_cents: number;
  price_configuration: Record<string, unknown>;
  spending_limit_cents: number | null;
  mailings_planned_count: number;
  mailings_submitted_count: number;
  mailings_failed_count: number;
  estimated_total_cents: number;
  enrolled_customers_count?: number;
  artworks_generated_count?: number;
  test_mailings_count?: number;
  live_mailings_count?: number;
  mailings_skipped_count?: number;
  committed_spend_cents?: number;
  billing_state: CampaignBillingState;
  created_at: string;
  updated_at: string;
};

export type CampaignUsageEvent = {
  id: string;
  organization_id: string;
  campaign_id: string;
  mailing_id: string | null;
  event_type: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  billing_mode: CampaignBillingMode;
  mailing_mode: CampaignMailingMode | null;
  idempotency_key: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type CampaignAuditEvent = {
  id: string;
  organization_id: string;
  campaign_id: string;
  actor_user_id: string | null;
  action: CampaignAuditAction;
  mailing_id: string | null;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type CampaignListItem = Campaign & {
  enrolled_count?: number;
  planned_count?: number;
  template?: {
    id: string;
    name: string;
    preview_image_url: string | null;
    front_background_url: string;
  } | null;
};

export type CampaignDetail = Campaign & {
  template?: {
    id: string;
    name: string;
    slug: string;
    preview_image_url: string | null;
    front_background_url: string;
    design_config: unknown;
  } | null;
  customers: CampaignCustomer[];
  occasions: CampaignOccasion[];
  billing?: CampaignBillingProfile | null;
  mailing_status_counts?: Partial<Record<CampaignMailingStatus, number>>;
};
