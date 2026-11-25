"use client";

import type { PublicRespondPayload } from "@/lib/types/cards";

type Props = {
  respond: PublicRespondPayload;
};

export function AgentContactSection({ respond }: Props) {
  const phone = respond.senderPhone?.trim() || null;
  const email = respond.senderEmail?.trim() || null;
  const website = respond.senderWebsite?.trim() || null;
  const first = respond.senderName.split(" ")[0] || respond.senderName;

  return (
    <section
      className="flex h-full flex-col rounded-2xl border border-[#0B1F3D]/10 bg-[#0B1F3D] px-4 py-5 text-white shadow-[0_14px_36px_-16px_rgba(11,31,61,0.55)] sm:px-5 sm:py-6"
      aria-labelledby="pi-agent-cta-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8FD4E6]">
        Your agent
      </p>
      <h3
        id="pi-agent-cta-heading"
        className="mt-1 text-lg font-extrabold tracking-tight sm:text-xl"
      >
        Ready to talk it through?
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/75">
        {first} is your Everlia contact — not a third-party listing agent shown
        in nearby comps.
      </p>

      <div className="mt-4 space-y-0.5 text-sm">
        <p className="font-bold">{respond.senderName}</p>
        {respond.senderTitle ? (
          <p className="text-white/70">{respond.senderTitle}</p>
        ) : null}
        {respond.organizationName ? (
          <p className="text-white/70">{respond.organizationName}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#38B2D1] px-4 text-sm font-bold text-white transition hover:bg-[#2ca0be] active:scale-[0.98]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.5-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9Z" />
            </svg>
            Call {first}
          </a>
        ) : null}
        {email ? (
          <a
            href={`mailto:${email}`}
            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-white/30 bg-transparent px-4 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
          >
            Email {first}
          </a>
        ) : null}
        {website ? (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-white/30 bg-transparent px-4 text-sm font-bold text-white/90 transition hover:bg-white/10 active:scale-[0.98]"
          >
            Visit website
          </a>
        ) : null}
      </div>

      {!phone && !email && !website ? (
        <p className="mt-auto pt-4 text-xs text-white/60">
          Use the reply options above to thank {first} or ask them to contact
          you.
        </p>
      ) : null}
    </section>
  );
}
