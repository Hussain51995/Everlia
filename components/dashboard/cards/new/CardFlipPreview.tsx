"use client";

import type { CardTemplate } from "@/lib/types/cards";
import { metaFromDesignConfig } from "@/lib/cards/template-meta";
import type { CardSide } from "./types";

type CardFlipPreviewProps = {
  template: CardTemplate;
  activeSide: CardSide;
  customerName: string;
  occasionHeading?: string;
  previewMessage: string;
  senderName: string;
  senderTitle: string;
  phone: string;
  emailAddress: string;
  website: string;
};

function dearLine(customerName: string): string | null {
  const trimmed = customerName.trim();
  if (!trimmed) return null;
  if (/^dear\s+/i.test(trimmed)) return trimmed;
  const first = trimmed.split(/\s+/).filter(Boolean)[0];
  return first ? `Dear ${first}` : null;
}

export function CardFlipPreview({
  template,
  activeSide,
  customerName,
  occasionHeading = "",
  previewMessage,
  senderName,
  senderTitle,
  phone,
  emailAddress,
  website,
}: CardFlipPreviewProps) {
  const frontMeta = metaFromDesignConfig(
    template.design_config,
    "front",
    template.slug
  );
  const backMeta = metaFromDesignConfig(
    template.design_config,
    "back",
    template.slug
  );

  const dear = dearLine(customerName);
  const hasFrontContent =
    Boolean(occasionHeading.trim()) ||
    Boolean(dear) ||
    Boolean(previewMessage.trim());
  const hasSenderInfo =
    Boolean(senderName) ||
    Boolean(senderTitle) ||
    Boolean(phone) ||
    Boolean(emailAddress) ||
    Boolean(website);

  return (
    <section className="space-y-3 lg:sticky lg:top-6">
      <div
        className="relative aspect-[3/2] w-full"
        style={{ perspective: "1400px" }}
      >
        <div
          className="relative h-full w-full transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: "preserve-3d",
            transform:
              activeSide === "back" ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="relative h-full w-full overflow-hidden bg-[#F0FAFC]">
              <img
                src={template.front_background_url}
                alt={`${template.name} front preview`}
                className="h-full w-full object-cover"
              />
              {hasFrontContent ? (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[48%] flex-col justify-start px-5 pt-6">
                  {occasionHeading.trim() ? (
                    <p
                      className="text-sm font-extrabold leading-tight"
                      style={{ color: frontMeta.headingColor }}
                    >
                      {occasionHeading}
                    </p>
                  ) : null}
                  {dear ? (
                    <p
                      className={`${occasionHeading.trim() ? "mt-3" : ""} font-cursive text-sm font-bold italic`}
                      style={{ color: frontMeta.dearColor }}
                    >
                      {dear}
                    </p>
                  ) : null}
                  {previewMessage.trim() ? (
                    <>
                      <div
                        className="mt-3 h-0.5 w-6 rounded-full"
                        style={{ backgroundColor: frontMeta.accentColor }}
                      />
                      <p
                        className="mt-2.5 line-clamp-6 text-[10px] font-semibold leading-relaxed"
                        style={{
                          color: frontMeta.bodyColor,
                          textShadow: "0 1px 3px rgba(10,8,12,0.55)",
                        }}
                      >
                        {previewMessage}
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="absolute inset-0 overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="relative h-full w-full overflow-hidden bg-[#F8FCFD]">
              <img
                src={template.back_background_url}
                alt={`${template.name} back preview`}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[52%] flex-col justify-between px-5 pb-4 pt-6">
                {hasSenderInfo ? (
                  <div className="space-y-1.5">
                    {senderName ? (
                      <p
                        className="text-[11px] font-extrabold"
                        style={{ color: backMeta.headingColor }}
                      >
                        {senderName}
                      </p>
                    ) : null}
                    {senderTitle ? (
                      <p
                        className="text-[9px] font-bold uppercase tracking-wide"
                        style={{ color: backMeta.bodyColor }}
                      >
                        {senderTitle}
                      </p>
                    ) : null}
                    {phone ? (
                      <p
                        className="text-[9px]"
                        style={{ color: backMeta.bodyColor }}
                      >
                        {phone}
                      </p>
                    ) : null}
                    {emailAddress ? (
                      <p
                        className="break-all text-[9px]"
                        style={{ color: backMeta.bodyColor }}
                      >
                        {emailAddress}
                      </p>
                    ) : null}
                    {website ? (
                      <p
                        className="break-all text-[9px]"
                        style={{ color: backMeta.accentColor }}
                      >
                        {website}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-end gap-3">
                  <div
                    className="grid h-14 w-14 place-items-center rounded-md border border-black/10 bg-white/90"
                    aria-hidden
                  >
                    <div
                      className="h-10 w-10"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 4px),repeating-linear-gradient(0deg,#111 0 2px,transparent 2px 4px)",
                        backgroundSize: "4px 4px",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <div
                    className="flex h-10 min-w-[7rem] items-center gap-1.5 rounded-md px-2"
                    style={{ backgroundColor: `${backMeta.accentColor}22` }}
                  >
                    <span
                      className="grid h-6 w-6 place-items-center rounded-md text-[8px] font-black text-white"
                      style={{ backgroundColor: backMeta.accentColor }}
                    >
                      E
                    </span>
                    <span
                      className="text-[9px] font-extrabold tracking-tight"
                      style={{ color: backMeta.headingColor }}
                    >
                      Everlia™
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span
          className={`h-1.5 rounded-full transition-all ${
            activeSide === "front" ? "w-6 bg-[#38B2D1]" : "w-1.5 bg-[#C4EBF2]"
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all ${
            activeSide === "back" ? "w-6 bg-[#38B2D1]" : "w-1.5 bg-[#C4EBF2]"
          }`}
        />
      </div>
      <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557393]">
        {activeSide === "front" ? "Front Preview" : "Back Preview"}
      </p>
      <p className="text-center text-xs leading-relaxed text-[#557393]">
        Preview uses this design&apos;s print colors. Final artwork with live QR
        and logo is generated when you save or a campaign mails.
      </p>
    </section>
  );
}
