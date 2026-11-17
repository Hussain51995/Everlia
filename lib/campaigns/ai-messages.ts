import { z } from "zod";
import {
  CAMPAIGN_PLACEHOLDERS,
  listPlaceholdersInTemplate,
  validateMessageTemplate,
} from "@/lib/campaigns/placeholders";

export const AI_MESSAGE_GREETING_MAX = 200;
export const AI_MESSAGE_BODY_MAX = 800;
export const AI_MESSAGE_FOOTER_MAX = 200;
export const AI_CHAT_HISTORY_MAX_TURNS = 12;

export const aiMessageDraftSchema = z.object({
  greetingTemplate: z.string().trim().min(1).max(AI_MESSAGE_GREETING_MAX),
  messageTemplate: z.string().trim().min(1).max(AI_MESSAGE_BODY_MAX),
  footerTemplate: z
    .union([z.string().trim().max(AI_MESSAGE_FOOTER_MAX), z.literal("")])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return "";
      return value;
    }),
});

export type AiMessageDraft = z.infer<typeof aiMessageDraftSchema>;

export const aiMessageChatRequestSchema = z.object({
  occasionSlug: z.string().trim().min(1).max(80),
  occasionName: z.string().trim().min(1).max(120).optional(),
  currentDraft: z.object({
    greetingTemplate: z.string().max(AI_MESSAGE_GREETING_MAX),
    messageTemplate: z.string().max(AI_MESSAGE_BODY_MAX),
    footerTemplate: z.string().max(AI_MESSAGE_FOOTER_MAX).optional().nullable(),
  }),
  messages: z.array(z.unknown()).max(40),
});

export type AiMessageChatRequest = z.infer<typeof aiMessageChatRequestSchema>;

const UNKNOWN_PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function stripUnknownPlaceholders(template: string): string {
  return template.replace(UNKNOWN_PLACEHOLDER_RE, (full, path: string) => {
    return (CAMPAIGN_PLACEHOLDERS as readonly string[]).includes(path)
      ? full
      : "";
  });
}

export function clampTemplate(template: string, max: number): string {
  const trimmed = template.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

export function sanitizeAiMessageDraft(raw: {
  greetingTemplate?: unknown;
  messageTemplate?: unknown;
  footerTemplate?: unknown;
}):
  | { ok: true; draft: AiMessageDraft }
  | { ok: false; error: string } {
  const greeting = clampTemplate(
    stripUnknownPlaceholders(String(raw.greetingTemplate ?? "")),
    AI_MESSAGE_GREETING_MAX
  );
  const message = clampTemplate(
    stripUnknownPlaceholders(String(raw.messageTemplate ?? "")),
    AI_MESSAGE_BODY_MAX
  );
  const footerRaw = String(raw.footerTemplate ?? "").trim();
  const footer = footerRaw
    ? clampTemplate(stripUnknownPlaceholders(footerRaw), AI_MESSAGE_FOOTER_MAX)
    : "";

  if (!greeting || !message) {
    return {
      ok: false,
      error: "AI draft missing greeting or message body after sanitization",
    };
  }

  for (const [field, template] of [
    ["greeting", greeting],
    ["body", message],
    ["footer", footer],
  ] as const) {
    if (!template) continue;
    const validation = validateMessageTemplate(template);
    if (!validation.ok) {
      return {
        ok: false,
        error: `${field} has unknown placeholders: ${validation.unknowns.join(", ")}`,
      };
    }
  }

  const parsed = aiMessageDraftSchema.safeParse({
    greetingTemplate: greeting,
    messageTemplate: message,
    footerTemplate: footer,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid AI draft",
    };
  }

  return { ok: true, draft: parsed.data };
}

export type AiMessageBrandContext = {
  organizationName?: string | null;
  senderDisplayName?: string | null;
};

export function buildAiMessageSystemPrompt(input: {
  occasionSlug: string;
  occasionName?: string | null;
  currentDraft: {
    greetingTemplate: string;
    messageTemplate: string;
    footerTemplate?: string | null;
  };
  brand?: AiMessageBrandContext;
}): string {
  const occasionLabel = input.occasionName?.trim() || input.occasionSlug;
  const placeholders = CAMPAIGN_PLACEHOLDERS.map((p) => `{{${p}}}`).join(", ");
  const org = input.brand?.organizationName?.trim() || "the organization";
  const sender =
    input.brand?.senderDisplayName?.trim() || "the sender / agent";

  return [
    "You write warm greeting-card messages for US real-estate and home clients.",
    "Keep assistant chat text very short (one sentence max) or empty—users mostly see the card fields.",
    "Whenever you have a usable draft, you MUST call the propose_message tool with greetingTemplate, messageTemplate, and footerTemplate.",
    "Field limits:",
    `- greetingTemplate: short heading (max ${AI_MESSAGE_GREETING_MAX} chars)`,
    `- messageTemplate: card body (max ${AI_MESSAGE_BODY_MAX} chars)`,
    `- footerTemplate: optional short tagline, often uppercase (max ${AI_MESSAGE_FOOTER_MAX} chars); use empty string if none`,
    `Allowed placeholders only: ${placeholders}`,
    "Never invent placeholders. Prefer {{customer.firstName}}, {{milestone.years}}, {{occasion.name}}, {{sender.firstName}} when personalization helps.",
    "Tone: warm, professional, personal — never salesy, spammy, or emoji-heavy.",
    `Occasion: ${occasionLabel} (slug: ${input.occasionSlug}).`,
    `Organization: ${org}. Sender display name: ${sender}.`,
    "Current card draft the user may want refined:",
    `Greeting: ${input.currentDraft.greetingTemplate || "(empty)"}`,
    `Body: ${input.currentDraft.messageTemplate || "(empty)"}`,
    `Footer: ${input.currentDraft.footerTemplate?.trim() || "(empty)"}`,
  ].join("\n");
}

export function takeRecentChatMessages<T>(messages: T[], max = AI_CHAT_HISTORY_MAX_TURNS): T[] {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}

export function extractLatestProposedDraft(
  parts: Array<{ type: string; state?: string; output?: unknown; input?: unknown }>
): AiMessageDraft | null {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (part.type !== "tool-propose_message") continue;
    if (part.state === "output-available" && part.output) {
      const out = part.output as Record<string, unknown>;
      if (out.ok === false) continue;
      const sanitized = sanitizeAiMessageDraft(out);
      if (sanitized.ok) return sanitized.draft;
    }
    if (
      (part.state === "input-available" || part.state === "input-streaming") &&
      part.input
    ) {
      const sanitized = sanitizeAiMessageDraft(
        part.input as Record<string, unknown>
      );
      if (sanitized.ok) return sanitized.draft;
    }
  }
  return null;
}

export function draftUsesOnlyKnownPlaceholders(draft: AiMessageDraft): boolean {
  for (const template of [
    draft.greetingTemplate,
    draft.messageTemplate,
    draft.footerTemplate,
  ]) {
    if (!template) continue;
    const found = listPlaceholdersInTemplate(template);
    if (found.some((p) => !(CAMPAIGN_PLACEHOLDERS as readonly string[]).includes(p))) {
      return false;
    }
  }
  return true;
}
