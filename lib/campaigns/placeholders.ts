

export const CAMPAIGN_PLACEHOLDERS = [
  "customer.firstName",
  "customer.lastName",
  "customer.fullName",
  "milestone.years",
  "milestone.date",
  "milestone.label",
  "milestone.type",
  "occasion.name",
  "occasion.slug",
  "sender.firstName",
  "sender.lastName",
  "sender.fullName",
  "sender.title",
  "campaign.name",
] as const;

export type CampaignPlaceholder = (typeof CAMPAIGN_PLACEHOLDERS)[number];

export type PlaceholderContext = {
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
  };
  milestone?: {
    years?: number | null;
    date?: string | null;
    label?: string | null;
    type?: string | null;
  };
  occasion?: {
    name?: string | null;
    slug?: string | null;
  };
  sender?: {
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
  };
  campaign?: {
    name?: string | null;
  };
};

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function listPlaceholdersInTemplate(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

export function isKnownPlaceholder(path: string): path is CampaignPlaceholder {
  return (CAMPAIGN_PLACEHOLDERS as readonly string[]).includes(path);
}

export type PlaceholderValidationResult =
  | { ok: true; placeholders: string[] }
  | { ok: false; unknowns: string[]; placeholders: string[] };

export function validateMessageTemplate(
  template: string
): PlaceholderValidationResult {
  const placeholders = listPlaceholdersInTemplate(template);
  const unknowns = placeholders.filter((p) => !isKnownPlaceholder(p));
  if (unknowns.length > 0) {
    return { ok: false, unknowns, placeholders };
  }
  return { ok: true, placeholders };
}

function fullName(first?: string | null, last?: string | null): string {
  return [first, last].map((p) => p?.trim()).filter(Boolean).join(" ");
}

export function buildPlaceholderValues(
  ctx: PlaceholderContext
): Record<CampaignPlaceholder, string> {
  const first = ctx.customer?.firstName?.trim() ?? "";
  const last = ctx.customer?.lastName?.trim() ?? "";
  const senderFirst = ctx.sender?.firstName?.trim() ?? "";
  const senderLast = ctx.sender?.lastName?.trim() ?? "";

  return {
    "customer.firstName": first,
    "customer.lastName": last,
    "customer.fullName": fullName(first, last),
    "milestone.years":
      ctx.milestone?.years != null && Number.isFinite(ctx.milestone.years)
        ? String(Math.max(0, Math.floor(ctx.milestone.years)))
        : "",
    "milestone.date": ctx.milestone?.date?.trim() ?? "",
    "milestone.label": ctx.milestone?.label?.trim() ?? "",
    "milestone.type": ctx.milestone?.type?.trim() ?? "",
    "occasion.name": ctx.occasion?.name?.trim() ?? "",
    "occasion.slug": ctx.occasion?.slug?.trim() ?? "",
    "sender.firstName": senderFirst,
    "sender.lastName": senderLast,
    "sender.fullName": fullName(senderFirst, senderLast),
    "sender.title": ctx.sender?.title?.trim() ?? "",
    "campaign.name": ctx.campaign?.name?.trim() ?? "",
  };
}

export function sanitizeDynamicText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeDynamicContent(value: string): string {
  return sanitizeDynamicText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanupResolvedCopy(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,!;:.?])/g, "$1")
    .replace(/([,;:])\s*([,;:.])/g, "$2")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+years since/gi, (m, offset, whole) => {
      return whole.slice(Math.max(0, offset - 1), offset).trim() === ""
        ? m
        : m;
    })
    .replace(/Celebrating\s+years since/gi, "Celebrating your home closing —")
    .replace(/Happy Birthday,\s*!/gi, "Happy Birthday!")
    .replace(/,\s*!/g, "!")
    .replace(/\s+/g, " ")
    .trim();
}

export type ResolveOptions = {
  escape?: boolean;
  maxLength?: number;
};

export function resolveMessageTemplate(
  template: string,
  ctx: PlaceholderContext,
  options: ResolveOptions = {}
): string {
  const values = buildPlaceholderValues(ctx);
  const escape = options.escape ?? false;

  let resolved = template.replace(PLACEHOLDER_RE, (_full, path: string) => {
    if (!isKnownPlaceholder(path)) {
      return "";
    }
    const raw = values[path] ?? "";
    return escape ? escapeDynamicContent(raw) : sanitizeDynamicText(raw);
  });

  resolved = cleanupResolvedCopy(resolved);

  const max = options.maxLength;
  if (max != null && max > 0 && resolved.length > max) {
    if (max <= 1) return "…";
    return `${resolved.slice(0, max - 1).trimEnd()}…`;
  }

  return resolved;
}

export function computeMilestoneYears(
  anchorDate: string | Date,
  asOf: Date = new Date()
): number {
  const anchor =
    typeof anchorDate === "string" ? new Date(`${anchorDate}T12:00:00`) : anchorDate;
  if (Number.isNaN(anchor.getTime())) return 0;

  let years = asOf.getFullYear() - anchor.getFullYear();
  const monthDiff = asOf.getMonth() - anchor.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && asOf.getDate() < anchor.getDate())
  ) {
    years -= 1;
  }
  return Math.max(0, years);
}
