import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_OCCASION_MESSAGES,
  FALLBACK_OCCASION_MESSAGE,
  mergeOccasionMessageDefinition,
  type OccasionMessageDefinition,
  type OccasionMessageOverride,
} from "@/lib/campaigns/messages";
import { US_OCCASION_CATALOG } from "@/lib/campaigns/occasions/catalog";

export type OrganizationOccasionMessageRow = {
  id: string;
  organization_id: string;
  occasion_slug: string;
  greeting_template: string;
  message_template: string;
  footer_template: string | null;
  created_at: string;
  updated_at: string;
};

export type EffectiveOccasionMessage = {
  occasionSlug: string;
  occasionName: string;
  category?: string;
  greetingTemplate: string;
  messageTemplate: string;
  footerTemplate: string | null;
  isOrgCustomized: boolean;
  source: "organization" | "platform";
  rowId: string | null;
};

export function rowToDefinition(
  row: Pick<
    OrganizationOccasionMessageRow,
    "occasion_slug" | "greeting_template" | "message_template" | "footer_template"
  >
): OccasionMessageDefinition {
  return {
    slug: row.occasion_slug,
    greetingTemplate: row.greeting_template,
    messageTemplate: row.message_template,
    footerTemplate: row.footer_template ?? undefined,
  };
}

export function orgRowsToDefinitionMap(
  rows: OrganizationOccasionMessageRow[]
): Record<string, OccasionMessageDefinition> {
  const map: Record<string, OccasionMessageDefinition> = {};
  for (const row of rows) {
    map[row.occasion_slug] = rowToDefinition(row);
  }
  return map;
}

export async function listOrgOccasionMessageRows(
  admin: SupabaseClient,
  organizationId: string
): Promise<OrganizationOccasionMessageRow[]> {
  const { data, error } = await admin
    .from("organization_occasion_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .order("occasion_slug", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrganizationOccasionMessageRow[];
}

export async function getOrgOccasionMessageRow(
  admin: SupabaseClient,
  organizationId: string,
  occasionSlug: string
): Promise<OrganizationOccasionMessageRow | null> {
  const { data, error } = await admin
    .from("organization_occasion_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("occasion_slug", occasionSlug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OrganizationOccasionMessageRow | null) ?? null;
}

export async function upsertOrgOccasionMessage(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    occasionSlug: string;
    greetingTemplate: string;
    messageTemplate: string;
    footerTemplate?: string | null;
  }
): Promise<OrganizationOccasionMessageRow> {
  const payload = {
    organization_id: input.organizationId,
    occasion_slug: input.occasionSlug.trim(),
    greeting_template: input.greetingTemplate.trim(),
    message_template: input.messageTemplate.trim(),
    footer_template: input.footerTemplate?.trim()
      ? input.footerTemplate.trim()
      : null,
  };

  const { data, error } = await admin
    .from("organization_occasion_messages")
    .upsert(payload, { onConflict: "organization_id,occasion_slug" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save occasion message");
  }
  return data as OrganizationOccasionMessageRow;
}

export async function deleteOrgOccasionMessage(
  admin: SupabaseClient,
  organizationId: string,
  occasionSlug: string
): Promise<void> {
  const { error } = await admin
    .from("organization_occasion_messages")
    .delete()
    .eq("organization_id", organizationId)
    .eq("occasion_slug", occasionSlug);

  if (error) throw new Error(error.message);
}

export function buildEffectiveOccasionMessages(
  orgRows: OrganizationOccasionMessageRow[]
): EffectiveOccasionMessage[] {
  const orgMap = orgRowsToDefinitionMap(orgRows);
  const bySlug = new Map(
    US_OCCASION_CATALOG.map((o) => [o.slug, o] as const)
  );

  const slugs = new Set<string>([
    ...US_OCCASION_CATALOG.map((o) => o.slug),
    ...Object.keys(DEFAULT_OCCASION_MESSAGES),
    ...Object.keys(orgMap),
  ]);

  const items: EffectiveOccasionMessage[] = [];
  for (const slug of slugs) {
    const catalog = bySlug.get(slug);
    const org = orgMap[slug];
    const effective = mergeOccasionMessageDefinition(
      slug,
      null,
      org ?? null
    );

    const row = orgRows.find((r) => r.occasion_slug === slug) ?? null;
    items.push({
      occasionSlug: slug,
      occasionName: catalog?.name ?? effective.slug,
      category: catalog?.category,
      greetingTemplate: effective.greetingTemplate,
      messageTemplate: effective.messageTemplate,
      footerTemplate: effective.footerTemplate ?? null,
      isOrgCustomized: Boolean(org),
      source: org ? "organization" : "platform",
      rowId: row?.id ?? null,
    });
  }

  items.sort((a, b) => {
    const ao = bySlug.get(a.occasionSlug)?.sortOrder ?? 9999;
    const bo = bySlug.get(b.occasionSlug)?.sortOrder ?? 9999;
    if (ao !== bo) return ao - bo;
    return a.occasionName.localeCompare(b.occasionName);
  });

  return items;
}

export function definitionForSlug(
  slug: string | null | undefined,
  orgMap?: Record<string, OccasionMessageDefinition> | null
): OccasionMessageDefinition {
  if (!slug) {
    return orgMap?.custom ?? FALLBACK_OCCASION_MESSAGE;
  }
  return mergeOccasionMessageDefinition(slug, null, orgMap?.[slug] ?? null);
}

export type { OccasionMessageOverride };
