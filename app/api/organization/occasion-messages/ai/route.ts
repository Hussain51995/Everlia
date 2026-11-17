import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, validationError } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/cards/require-org";
import {
  aiMessageChatRequestSchema,
  buildAiMessageSystemPrompt,
  sanitizeAiMessageDraft,
  takeRecentChatMessages,
} from "@/lib/campaigns/ai-messages";
import {
  CARD_FOOTER_MAX,
  CARD_GREETING_MAX,
  CARD_MESSAGE_MAX,
} from "@/lib/campaigns/messages";

export const maxDuration = 60;

const proposeMessageInputSchema = z.object({
  greetingTemplate: z.string().min(1).max(CARD_GREETING_MAX),
  messageTemplate: z.string().min(1).max(CARD_MESSAGE_MAX),
  footerTemplate: z.string().max(CARD_FOOTER_MAX).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireActiveOrganization();
    if ("response" in ctx) return ctx.response;

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return apiError(
        {
          code: "AI_NOT_CONFIGURED",
          message:
            "OPENAI_API_KEY is not configured. Add it to the server environment to use Write with AI.",
        },
        503
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return validationError("Invalid AI chat payload");
    }

    const parsed = aiMessageChatRequestSchema.safeParse({
      occasionSlug: (body as { occasionSlug?: unknown }).occasionSlug,
      occasionName: (body as { occasionName?: unknown }).occasionName,
      currentDraft: (body as { currentDraft?: unknown }).currentDraft,
      messages: (body as { messages?: unknown }).messages ?? [],
    });
    if (!parsed.success) {
      return validationError(
        parsed.error.issues[0]?.message ?? "Invalid AI chat payload"
      );
    }

    const { occasionSlug, occasionName, currentDraft } = parsed.data;
    const messages = takeRecentChatMessages(
      parsed.data.messages as UIMessage[]
    );

    if (messages.length === 0) {
      return validationError("At least one chat message is required");
    }

    const membership =
      ctx.session.memberships.find(
        (m) => m.organization_id === ctx.organizationId
      ) ?? null;
    const organizationName = membership?.organization?.name ?? null;

    const supabase = createClient();
    const { data: branding } = await supabase
      .from("organization_branding")
      .select("sender_display_name")
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    const system = buildAiMessageSystemPrompt({
      occasionSlug,
      occasionName,
      currentDraft: {
        greetingTemplate: currentDraft.greetingTemplate,
        messageTemplate: currentDraft.messageTemplate,
        footerTemplate: currentDraft.footerTemplate ?? "",
      },
      brand: {
        organizationName,
        senderDisplayName: branding?.sender_display_name ?? null,
      },
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system,
      messages: modelMessages,
      stopWhen: stepCountIs(4),
      maxOutputTokens: 900,
      tools: {
        propose_message: tool({
          description:
            "Propose greeting, body, and optional footer copy for the occasion postcard. Call this whenever you have a usable draft the user can apply.",
          inputSchema: proposeMessageInputSchema,
          execute: async (input) => {
            const sanitized = sanitizeAiMessageDraft(input);
            if (!sanitized.ok) {
              return {
                ok: false as const,
                error: sanitized.error,
              };
            }
            return {
              ok: true as const,
              greetingTemplate: sanitized.draft.greetingTemplate,
              messageTemplate: sanitized.draft.messageTemplate,
              footerTemplate: sanitized.draft.footerTemplate || "",
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return apiError(
      {
        code: "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate occasion message",
      },
      500
    );
  }
}
