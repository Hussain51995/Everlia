"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isToolUIPart, type UIMessage } from "ai";
import {
  extractLatestProposedDraft,
  type AiMessageDraft,
} from "@/lib/campaigns/ai-messages";
import {
  CARD_FOOTER_MAX,
  CARD_GREETING_MAX,
  CARD_MESSAGE_MAX,
} from "@/lib/campaigns/messages";
import { useOccasionMessageAiChat } from "@/hooks/campaigns/use-occasion-message-ai-chat";
import {
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";

const REFINE_CHIPS = [
  {
    label: "Make it warmer",
    prompt: "Make the greeting, body, and footer warmer and more personal.",
  },
  {
    label: "Make it shorter",
    prompt: "Shorten the greeting, body, and footer while keeping the meaning.",
  },
  {
    label: "More professional",
    prompt: "Make the tone more professional and polished.",
  },
  {
    label: "Include their first name",
    prompt:
      "Naturally include the client's first name using the {{customer.firstName}} placeholder in the greeting or body.",
  },
] as const;

function buildWritePrompt(brief: string, isRewrite: boolean): string {
  const trimmed = brief.trim();
  if (isRewrite) {
    return trimmed
      ? `Rewrite the current greeting, body, and footer. Direction from the user: ${trimmed}`
      : "Rewrite the current greeting, body, and footer for this occasion. Keep it warm and personal.";
  }
  return trimmed
    ? `Write a new greeting, body, and footer for this occasion. Direction from the user: ${trimmed}`
    : "Write a new greeting, body, and footer for this occasion. Keep it warm and personal.";
}

type DraftFields = {
  greetingTemplate: string;
  messageTemplate: string;
  footerTemplate: string;
};

type Props = {
  occasionSlug: string;
  occasionName: string;
  draft: DraftFields;
  onDraftChange: (draft: DraftFields) => void;
};

function latestDraftFromMessages(messages: UIMessage[]): AiMessageDraft | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const draft = extractLatestProposedDraft(
      msg.parts.map((part) => {
        if (!isToolUIPart(part)) {
          return { type: part.type };
        }
        return {
          type: part.type,
          state: part.state,
          output:
            "output" in part && part.state === "output-available"
              ? part.output
              : undefined,
          input: "input" in part ? part.input : undefined,
        };
      })
    );
    if (draft) return draft;
  }
  return null;
}

function draftKey(draft: AiMessageDraft): string {
  return [
    draft.greetingTemplate,
    draft.messageTemplate,
    draft.footerTemplate || "",
  ].join("\n---\n");
}

export function AiMessageStudio({
  occasionSlug,
  occasionName,
  draft,
  onDraftChange,
}: Props) {
  const [brief, setBrief] = useState("");
  const [tweak, setTweak] = useState("");
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const awaitingApplyRef = useRef(false);
  const lastAppliedKeyRef = useRef<string>("");

  const { messages, sendMessage, setMessages, status, error, clearError, stop } =
    useOccasionMessageAiChat({
      occasionSlug,
      occasionName,
      currentDraft: draft,
    });

  const pending = status === "submitted" || status === "streaming";
  const hasContent = Boolean(
    draft.greetingTemplate.trim() && draft.messageTemplate.trim()
  );
  const proposed = useMemo(
    () => latestDraftFromMessages(messages),
    [messages]
  );

  useEffect(() => {
    if (pending || !awaitingApplyRef.current) return;

    if (!proposed) {
      awaitingApplyRef.current = false;
      setStatusNote("Couldn’t update the message. Try again.");
      return;
    }

    const key = draftKey(proposed);
    if (key === lastAppliedKeyRef.current) {
      awaitingApplyRef.current = false;
      return;
    }

    lastAppliedKeyRef.current = key;
    awaitingApplyRef.current = false;
    onDraftChange({
      greetingTemplate: proposed.greetingTemplate,
      messageTemplate: proposed.messageTemplate,
      footerTemplate: proposed.footerTemplate || "",
    });
    setStatusNote("Updated.");
  }, [pending, proposed, onDraftChange]);

  const runAi = async (prompt: string) => {
    if (!prompt.trim() || pending || !occasionSlug) return;
    clearError();
    setStatusNote(null);
    awaitingApplyRef.current = true;
    await sendMessage({ text: prompt.trim() });
  };

  const onWrite = () => {
    void runAi(buildWritePrompt(brief, hasContent));
  };

  const onTweak = () => {
    const text = tweak.trim();
    if (!text) return;
    setTweak("");
    void runAi(text);
  };

  const startOver = () => {
    stop();
    setMessages([]);
    clearError();
    awaitingApplyRef.current = false;
    setStatusNote(null);
    setBrief("");
    setTweak("");
  };

  const patch = (partial: Partial<DraftFields>) => {
    onDraftChange({ ...draft, ...partial });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#C4EBF2] bg-gradient-to-br from-[#F0FAFC] via-white to-[#E6F7FB] p-4 sm:p-5">
        <p className="text-sm font-bold text-[#0B1F3D]">Create with AI</p>
        <p className="mt-1 text-sm text-[#557393]">
          Describe what you want, or just tap the button—we’ll write the card
          text for you.
        </p>

        <label className={`${fieldLabelClass} mt-4`} htmlFor="ai-brief">
          What should it say? (optional)
        </label>
        <input
          id="ai-brief"
          className={textInputClass}
          value={brief}
          disabled={pending || !occasionSlug}
          placeholder="e.g. Thank them for their referral"
          onChange={(e) => setBrief(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={pending || !occasionSlug}
            onClick={onWrite}
          >
            {pending
              ? "Writing…"
              : hasContent
                ? "Rewrite with AI"
                : "Write a message"}
          </button>
          {messages.length > 0 || pending ? (
            <button
              type="button"
              className="text-xs font-semibold text-[#557393] underline-offset-2 hover:underline"
              onClick={startOver}
            >
              Clear AI history
            </button>
          ) : null}
        </div>

        {!occasionSlug ? (
          <p className="mt-2 text-xs text-[#557393]">
            Choose an occasion above first.
          </p>
        ) : null}

        {pending ? (
          <p className="mt-3 text-sm font-semibold text-[#0E7490]">
            Writing your message…
          </p>
        ) : null}
        {!pending && statusNote ? (
          <p className="mt-3 text-sm font-semibold text-[#0E7490]">{statusNote}</p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message ||
              "Something went wrong writing the message. Please try again."}
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#0B1F3D]">Your message</p>
            <p className="text-xs text-[#557393]">
              Keep it short so it fits on the card. Then save.
            </p>
          </div>
          <p
            className={`text-xs font-semibold tabular-nums ${
              draft.messageTemplate.length >= CARD_MESSAGE_MAX
                ? "text-red-600"
                : "text-[#557393]"
            }`}
          >
            {draft.messageTemplate.length}/{CARD_MESSAGE_MAX}
          </p>
        </div>

        <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
          <label className="sr-only" htmlFor="studio-greeting">
            Greeting
          </label>
          <input
            id="studio-greeting"
            className="w-full border-0 bg-transparent text-center text-xl font-bold text-[#0B1F3D] outline-none placeholder:text-[#9BB0C4] focus:ring-0"
            value={draft.greetingTemplate}
            maxLength={CARD_GREETING_MAX}
            placeholder="Greeting"
            onChange={(e) => patch({ greetingTemplate: e.target.value })}
          />
          <p className="mt-1 text-center text-[10px] tabular-nums text-[#9BB0C4]">
            {draft.greetingTemplate.length}/{CARD_GREETING_MAX}
          </p>
          <div className="mx-auto my-3 h-px w-16 bg-[#C4EBF2]" />
          <label className="sr-only" htmlFor="studio-body">
            Message body
          </label>
          <textarea
            id="studio-body"
            className="min-h-[140px] w-full resize-y border-0 bg-transparent text-center text-[15px] leading-relaxed text-[#557393] outline-none placeholder:text-[#9BB0C4] focus:ring-0"
            value={draft.messageTemplate}
            maxLength={CARD_MESSAGE_MAX}
            placeholder="Message body"
            onChange={(e) => patch({ messageTemplate: e.target.value })}
          />
          <label className="sr-only" htmlFor="studio-footer">
            Footer
          </label>
          <input
            id="studio-footer"
            className="mt-3 w-full border-0 bg-transparent text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#0E7490] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#9BB0C4] focus:ring-0"
            value={draft.footerTemplate}
            maxLength={CARD_FOOTER_MAX}
            placeholder="Optional footer"
            onChange={(e) => patch({ footerTemplate: e.target.value })}
          />
          <p className="mt-1 text-center text-[10px] tabular-nums text-[#9BB0C4]">
            {draft.footerTemplate.length}/{CARD_FOOTER_MAX}
          </p>
        </div>

        <p className="mt-2 text-xs text-[#557393]">
          Tip: you can personalize with the client’s first name—use “Include
          their first name” below, or ask AI to add it.
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-bold text-[#0B1F3D]">Refine</p>
        <div className="flex flex-wrap gap-2">
          {REFINE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={`${secondaryButtonClass} !px-3 !py-1.5 !text-xs`}
              disabled={pending || !occasionSlug || !hasContent}
              onClick={() => void runAi(chip.prompt)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            onTweak();
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="ai-tweak">
              Tell AI what to change
            </label>
            <input
              id="ai-tweak"
              className={textInputClass}
              value={tweak}
              disabled={pending || !occasionSlug || !hasContent}
              placeholder="Tell AI what to change…"
              onChange={(e) => setTweak(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={secondaryButtonClass}
            disabled={
              pending || !occasionSlug || !hasContent || !tweak.trim()
            }
          >
            Update
          </button>
        </form>
      </section>
    </div>
  );
}
