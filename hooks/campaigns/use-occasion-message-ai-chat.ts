"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export type OccasionMessageAiDraftInput = {
  greetingTemplate: string;
  messageTemplate: string;
  footerTemplate: string;
};

export function useOccasionMessageAiChat(options: {
  occasionSlug: string;
  occasionName: string;
  currentDraft: OccasionMessageAiDraftInput;
}) {
  const draftRef = useRef(options.currentDraft);
  const occasionRef = useRef({
    occasionSlug: options.occasionSlug,
    occasionName: options.occasionName,
  });

  useEffect(() => {
    draftRef.current = options.currentDraft;
  }, [options.currentDraft]);

  useEffect(() => {
    occasionRef.current = {
      occasionSlug: options.occasionSlug,
      occasionName: options.occasionName,
    };
  }, [options.occasionSlug, options.occasionName]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/organization/occasion-messages/ai",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            ...body,
            id,
            messages,
            occasionSlug: occasionRef.current.occasionSlug,
            occasionName: occasionRef.current.occasionName,
            currentDraft: {
              greetingTemplate: draftRef.current.greetingTemplate,
              messageTemplate: draftRef.current.messageTemplate,
              footerTemplate: draftRef.current.footerTemplate || null,
            },
          },
        }),
      }),
    []
  );

  return useChat({ transport });
}
