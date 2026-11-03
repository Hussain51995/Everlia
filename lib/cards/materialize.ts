import { createAdminClient } from "@/lib/supabase/admin";
import type { GreetingCard, GreetingCardFieldValues } from "@/lib/types/cards";

export type MaterializeGreetingCardInput = {
  organizationId: string;
  createdBy: string;
  templateId: string;
  customerId: string;
  fieldValues?: GreetingCardFieldValues;
  campaignId?: string | null;
  campaignMailingId?: string | null;
};

export async function materializeGreetingCard(
  input: MaterializeGreetingCardInput
): Promise<GreetingCard> {
  const admin = createAdminClient();

  const { data: template, error: templateError } = await admin
    .from("card_templates")
    .select("id")
    .eq("id", input.templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (templateError) throw new Error(templateError.message);
  if (!template) throw new Error("Template not found or inactive");

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id, organization_id")
    .eq("id", input.customerId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (customerError) throw new Error(customerError.message);
  if (!customer) throw new Error("Customer not found in organization");

  if (input.campaignMailingId) {
    const { data: existing } = await admin
      .from("greeting_cards")
      .select("*")
      .eq("campaign_mailing_id", input.campaignMailingId)
      .maybeSingle();
    if (existing) return existing as GreetingCard;
  }

  const { data, error } = await admin
    .from("greeting_cards")
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      template_id: input.templateId,
      customer_id: input.customerId,
      field_values: input.fieldValues ?? {},
      status: "draft",
      campaign_id: input.campaignId ?? null,
      campaign_mailing_id: input.campaignMailingId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create greeting card");
  }

  return data as GreetingCard;
}
