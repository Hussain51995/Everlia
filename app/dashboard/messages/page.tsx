"use client";

import { useMemo, useState } from "react";
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
import {
  CATEGORY_LABELS,
} from "@/components/dashboard/campaigns/wizard/occasions-step-shared";

const PLACEHOLDER_HINT =
  "Optional placeholders: {{customer.firstName}}, {{milestone.years}}, {{occasion.name}}, {{sender.firstName}}, {{campaign.name}}";

export default function OccasionMessagesPage() {
  const { showToast } = useToast();
  const messagesQuery = useOrgOccasionMessages();
  const upsert = useUpsertOrgOccasionMessage();
  const reset = useResetOrgOccasionMessage();

  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<EffectiveOccasionMessage | null>(null);
  const [adding, setAdding] = useState(false);
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

  const openEdit = (row: EffectiveOccasionMessage) => {
    setAdding(false);
    setEditing(row);
    setGreetingTemplate(row.greetingTemplate);
    setMessageTemplate(row.messageTemplate);
    setFooterTemplate(row.footerTemplate ?? "");
  };

  const openAdd = () => {
    setEditing(null);
    setAdding(true);
    const first = platformOnly[0];
    setAddSlug(first?.occasionSlug ?? "");
    setGreetingTemplate(first?.greetingTemplate ?? "");
    setMessageTemplate(first?.messageTemplate ?? "");
    setFooterTemplate(first?.footerTemplate ?? "");
  };

  const onPickAddSlug = (slug: string) => {
    setAddSlug(slug);
    const row = messages.find((m) => m.occasionSlug === slug);
    if (!row) return;
    setGreetingTemplate(row.greetingTemplate);
    setMessageTemplate(row.messageTemplate);
    setFooterTemplate(row.footerTemplate ?? "");
  };

  const closeEditor = () => {
    setEditing(null);
    setAdding(false);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3D]">Messages</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#557393]">
            Default greeting, body, and footer copy for each occasion. When a
            campaign occasion has no custom message, this library text is used.
          </p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={openAdd}>
          Add / customize
        </button>
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
                  onClick={() => openEdit(row)}
                >
                  Edit
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
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0B1F3D]">
                  {adding ? "Customize occasion message" : "Edit message"}
                </h2>
                <p className="mt-1 text-xs text-[#557393]">{PLACEHOLDER_HINT}</p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[#557393]"
                onClick={closeEditor}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
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
              ) : (
                <p className="text-sm font-semibold text-[#0B1F3D]">
                  {editing?.occasionName}
                </p>
              )}

              <div>
                <label className={fieldLabelClass} htmlFor="msg-greeting">
                  Greeting / heading
                </label>
                <input
                  id="msg-greeting"
                  className={textInputClass}
                  value={greetingTemplate}
                  onChange={(e) => setGreetingTemplate(e.target.value)}
                />
              </div>

              <div>
                <label className={fieldLabelClass} htmlFor="msg-body">
                  Message body
                </label>
                <textarea
                  id="msg-body"
                  className={`${textInputClass} min-h-[120px]`}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                />
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
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={
                  upsert.isPending ||
                  !greetingTemplate.trim() ||
                  !messageTemplate.trim() ||
                  (adding && !addSlug)
                }
                onClick={() => void save()}
              >
                {upsert.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
