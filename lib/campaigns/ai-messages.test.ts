import { describe, expect, it } from "vitest";
import {
  aiMessageChatRequestSchema,
  aiMessageDraftSchema,
  buildAiMessageSystemPrompt,
  clampTemplate,
  draftUsesOnlyKnownPlaceholders,
  extractLatestProposedDraft,
  sanitizeAiMessageDraft,
  stripUnknownPlaceholders,
  takeRecentChatMessages,
} from "@/lib/campaigns/ai-messages";

describe("AI occasion message drafts", () => {
  it("strips unknown placeholders and keeps allowlisted ones", () => {
    expect(
      stripUnknownPlaceholders(
        "Hi {{customer.firstName}} and {{customer.ssn}}!"
      )
    ).toBe("Hi {{customer.firstName}} and !");
  });

  it("clamps template length", () => {
    expect(clampTemplate("  hello   world  ", 20)).toBe("hello world");
    expect(clampTemplate("abcdefghij", 5)).toBe("abcde");
  });

  it("sanitizes a valid draft", () => {
    const result = sanitizeAiMessageDraft({
      greetingTemplate: "Happy Birthday!",
      messageTemplate: "Wishing you well, {{customer.firstName}}.",
      footerTemplate: "WITH CARE.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.greetingTemplate).toBe("Happy Birthday!");
      expect(result.draft.messageTemplate).toContain("{{customer.firstName}}");
      expect(draftUsesOnlyKnownPlaceholders(result.draft)).toBe(true);
    }
  });

  it("rejects empty greeting/body after sanitization", () => {
    const result = sanitizeAiMessageDraft({
      greetingTemplate: "{{bad.placeholder}}",
      messageTemplate: "Body text",
      footerTemplate: "",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts AI chat request schema with draft + messages", () => {
    const parsed = aiMessageChatRequestSchema.safeParse({
      occasionSlug: "birthday",
      occasionName: "Birthday",
      currentDraft: {
        greetingTemplate: "Happy Birthday!",
        messageTemplate: "Have a great day.",
        footerTemplate: null,
      },
      messages: [{ role: "user", parts: [{ type: "text", text: "Write one" }] }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects oversized greeting in draft schema", () => {
    const parsed = aiMessageDraftSchema.safeParse({
      greetingTemplate: "x".repeat(201),
      messageTemplate: "Body",
      footerTemplate: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("takes only the most recent chat turns", () => {
    const msgs = Array.from({ length: 20 }, (_, i) => i);
    expect(takeRecentChatMessages(msgs, 12)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 8)
    );
  });

  it("extracts latest propose_message tool output", () => {
    const draft = extractLatestProposedDraft([
      {
        type: "tool-propose_message",
        state: "output-available",
        output: {
          ok: true,
          greetingTemplate: "Hello!",
          messageTemplate: "Body for {{customer.firstName}}.",
          footerTemplate: "THANKS.",
        },
      },
    ]);
    expect(draft).toEqual({
      greetingTemplate: "Hello!",
      messageTemplate: "Body for {{customer.firstName}}.",
      footerTemplate: "THANKS.",
    });
  });

  it("system prompt includes occasion and placeholder allowlist", () => {
    const prompt = buildAiMessageSystemPrompt({
      occasionSlug: "us-thanksgiving",
      occasionName: "Thanksgiving",
      currentDraft: {
        greetingTemplate: "Happy Thanksgiving!",
        messageTemplate: "Grateful for you.",
        footerTemplate: "",
      },
      brand: {
        organizationName: "River Homes",
        senderDisplayName: "Pat Lee",
      },
    });
    expect(prompt).toContain("Thanksgiving");
    expect(prompt).toContain("us-thanksgiving");
    expect(prompt).toContain("River Homes");
    expect(prompt).toContain("{{customer.firstName}}");
    expect(prompt).toContain("propose_message");
    expect(prompt).toContain("warm greeting-card");
  });
});
