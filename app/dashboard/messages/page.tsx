"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useOrgOccasionMessages,
  useResetOrgOccasionMessage,
  useUpsertOrgOccasionMessage,
} from "@/hooks/campaigns";
import type { EffectiveOccasionMessage } from "@/lib/campaigns/org-messages";
import { useToast } from "@/components/ui/Toast";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { ApiClientError } from "@/lib/api/client";
import {
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";
import { CATEGORY_LABELS } from "@/components/dashboard/campaigns/wizard/occasions-step-shared";
import { AiMessageStudio } from "@/components/dashboard/messages/AiMessageStudio";

type EditorMode = "manual" | "ai";

const aiCtaClass =
  "relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#0E7490] via-[#14B8A6] to-[#0891B2] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_0_1px_rgba(20,184,166,0.35),0_0_28px_rgba(20,184,166,0.55)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(20,184,166,0.5),0_0_40px_rgba(20,184,166,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]";

export default function OccasionMessagesPage() {
  const { showToast } = useToast();
  const messagesQuery = useOrgOccasionMessages();
  const upsert = useUpsertOrgOccasionMessage();
  const reset = useResetOrgOccasionMessage();

  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<EffectiveOccasionMessage | null>(null);
  const [adding, setAdding] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("manual");
  const [greetingTemplate, setGreetingTemplate] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [footerTemplate, setFooterTemplate] = useState("");
  const [addSlug, setAddSlug] = useState("");

  const messages = messagesQuery.data?.messages ?? [];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.occasionName.toLowerCase().includes(q) ||
        m.occasionSlug.toLowerCase().includes(q) ||
        m.messageTemplate.toLowerCase().includes(q)
    );
  }, [filter, messages]);

  const platformOnly = useMemo(
    () => messages.filter((m) => !m.isOrgCustomized),
    [messages]
  );

  const seedFromRow = (row: EffectiveOccasionMessage | undefined) => {
    setGreetingTemplate(row?.greetingTemplate ?? "");
    setMessageTemplate(row?.messageTemplate ?? "");
    setFooterTemplate(row?.footerTemplate ?? "");
  };

  const openEdit = (row: EffectiveOccasionMessage, mode: EditorMode) => {
    setAdding(false);
    setEditing(row);
    setEditorMode(mode);
    seedFromRow(row);
  };

  const openAdd = (mode: EditorMode) => {
    setEditing(null);
    setAdding(true);
    setEditorMode(mode);
    const first = platformOnly[0] ?? messages[0];
    setAddSlug(first?.occasionSlug ?? "");
    if (mode === "ai") {
      setGreetingTemplate("");
      setMessageTemplate("");
      setFooterTemplate("");
    } else {
      seedFromRow(first);
    }
  };

  const onPickAddSlug = (slug: string) => {
    setAddSlug(slug);
    const row = messages.find((m) => m.occasionSlug === slug);
    if (editorMode === "ai") {
      if (!greetingTemplate.trim() && !messageTemplate.trim()) return;
      return;
    }
    if (!row) return;
    seedFromRow(row);
  };

  const closeEditor = () => {
    setEditing(null);
    setAdding(false);
  };

  const onDraftChange = useCallback(
    (draft: {
      greetingTemplate: string;
      messageTemplate: string;
      footerTemplate: string;
    }) => {
      setGreetingTemplate(draft.greetingTemplate);
      setMessageTemplate(draft.messageTemplate);
      setFooterTemplate(draft.footerTemplate);
    },
    []
  );

  const save = async () => {
    const slug = adding ? addSlug : editing?.occasionSlug;
    if (!slug) return;
    try {
      await upsert.mutateAsync({
        occasionSlug: slug,
        greetingTemplate,
        messageTemplate,
        footerTemplate: footerTemplate.trim() || null,
      });
      showToast({
        tone: "success",
        title: adding ? "Message added" : "Message saved",
        description:
          "Campaigns without a custom message will use this copy for the occasion.",
      });
      closeEditor();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not save message",
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please try again.",
      });
    }
  };

  const resetToPlatform = async (row: EffectiveOccasionMessage) => {
    try {
      await reset.mutateAsync(row.occasionSlug);
      showToast({
        tone: "success",
        title: "Reset to platform default",
        description: `${row.occasionName} now uses the built-in message again.`,
      });
      if (editing?.occasionSlug === row.occasionSlug) closeEditor();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not reset message",
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please try again.",
      });
    }
  };

  if (messagesQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-[#C4EBF2] bg-white">
        <ThemeLoader label="Loading messages…" />
      </div>
    );
  }

  if (messagesQuery.isError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {messagesQuery.error instanceof Error
          ? messagesQuery.error.message
          : "Failed to load occasion messages."}
      </div>
    );
  }

  const editorOpen = Boolean(editing) || adding;
  const isAi = editorMode === "ai";
  const occasionSlug = adding ? addSlug : editing?.occasionSlug ?? "";
  const occasionName = adding
    ? messages.find((m) => m.occasionSlug === addSlug)?.occasionName ?? addSlug
    : editing?.occasionName ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3D]">Messages</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#557393]">
            Default card text for each occasion. Write it yourself, or let AI
            draft it for you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => openAdd("manual")}
          >
            New message
          </button>
          <button
            type="button"
            className={aiCtaClass}
            onClick={() => openAdd("ai")}
          >
            New message with AI
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${textInputClass} max-w-sm`}
          placeholder="Search occasions or message text…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[#557393]">
          {messagesQuery.data?.customizedCount ?? 0} customized
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white">
        <ul className="divide-y divide-[#EEF6F8]">
          {filtered.map((row) => (
            <li
              key={row.occasionSlug}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[#0B1F3D]">{row.occasionName}</p>
                  <span className="rounded-full bg-[#E6F7FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0E7490]">
                    {CATEGORY_LABELS[row.category ?? ""] ?? "Occasion"}
                  </span>
                  {row.isOrgCustomized ? (
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      Customized
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#F0FAFC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#557393]">
                      Platform default
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#0B1F3D]">
                  {row.greetingTemplate}
                </p>
                <p className="line-clamp-2 text-sm text-[#557393]">
                  {row.messageTemplate}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => openEdit(row, "manual")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 shadow-[0_0_12px_rgba(20,184,166,0.25)] transition hover:bg-teal-100"
                  onClick={() => openEdit(row, "ai")}
                >
                  Edit with AI
                </button>
                {row.isOrgCustomized ? (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={reset.isPending}
                    onClick={() => void resetToPlatform(row)}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-[#557393]">
              No occasions match your search.
            </li>
          ) : null}
        </ul>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1F3D]/40 p-4 sm:items-center">
          <div
            className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl p-5 shadow-xl sm:p-6 ${
              isAi
                ? "max-w-3xl border border-teal-200/80 bg-gradient-to-b from-[#E6F7FB] via-white to-white shadow-[0_0_48px_rgba(20,184,166,0.28)]"
                : "max-w-xl border border-[#C4EBF2] bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {isAi ? (
                  <p className="mb-1 inline-flex items-center rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    AI writing
                  </p>
                ) : null}
                <h2 className="text-lg font-bold text-[#0B1F3D]">
                  {isAi
                    ? adding
                      ? "New message with AI"
                      : `Rewrite ${occasionName} with AI`
                    : adding
                      ? "New message"
                      : `Edit ${occasionName}`}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-[#557393]">
                  {isAi
                    ? "Tell AI what you want, then tweak the card text and save."
                    : "Type the greeting, body, and footer clients will see on the card."}
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[#557393]"
                onClick={closeEditor}
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {adding ? (
                <div>
                  <label className={fieldLabelClass} htmlFor="msg-occasion">
                    Occasion
                  </label>
                  <select
                    id="msg-occasion"
                    className={textInputClass}
                    value={addSlug}
                    onChange={(e) => onPickAddSlug(e.target.value)}
                  >
                    {messages.map((m) => (
                      <option key={m.occasionSlug} value={m.occasionSlug}>
                        {m.occasionName}
                        {m.isOrgCustomized ? " (customized)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isAi ? (
                <AiMessageStudio
                  key={`ai-${occasionSlug}`}
                  occasionSlug={occasionSlug}
                  occasionName={occasionName}
                  draft={{
                    greetingTemplate,
                    messageTemplate,
                    footerTemplate,
                  }}
                  onDraftChange={onDraftChange}
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className={fieldLabelClass} htmlFor="msg-greeting">
                      Greeting / heading
                    </label>
                    <input
                      id="msg-greeting"
                      className={textInputClass}
                      value={greetingTemplate}
                      onChange={(e) => setGreetingTemplate(e.target.value)}
                      placeholder="e.g. Happy Birthday!"
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="msg-body">
                      Message body
                    </label>
                    <textarea
                      id="msg-body"
                      className={`${textInputClass} min-h-[140px]`}
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      placeholder="Write the main message for the card…"
                    />
                    <p className="mt-1.5 text-xs text-[#557393]">
                      Tip: you can use the client’s first name later with AI, or
                      keep the wording general.
                    </p>
                  </div>
                  <div>
                    <label className={fieldLabelClass} htmlFor="msg-footer">
                      Footer (optional)
                    </label>
                    <input
                      id="msg-footer"
                      className={textInputClass}
                      value={footerTemplate}
                      onChange={(e) => setFooterTemplate(e.target.value)}
                      placeholder="e.g. WITH APPRECIATION"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#EEF6F8] pt-4">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className={isAi ? aiCtaClass : primaryButtonClass}
                disabled={
                  upsert.isPending ||
                  !greetingTemplate.trim() ||
                  !messageTemplate.trim() ||
                  (adding && !addSlug)
                }
                onClick={() => void save()}
              >
                {upsert.isPending ? "Saving…" : "Save message"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
