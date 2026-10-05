"use client";

import type { CardTemplate } from "@/lib/types/cards";
import type { TemplateMeta } from "@/lib/cards/template-meta";
import type { CardSide } from "./types";

type CardFlipPreviewProps = {
  template: CardTemplate;
  templateMeta: TemplateMeta;
  activeSide: CardSide;
  customerName: string;
  previewMessage: string;
  footerNote: string;
  senderName: string;
  senderTitle: string;
  phone: string;
  emailAddress: string;
  website: string;
};

export function CardFlipPreview({
  template,
  templateMeta,
  activeSide,
  customerName,
  previewMessage,
  footerNote,
  senderName,
  senderTitle,
  phone,
  emailAddress,
  website,
}: CardFlipPreviewProps) {
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
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[42%] flex-col justify-end px-5 pb-7">
                <p className="font-cursive text-sm font-bold italic text-[#0B1F3D]">
                  {customerName ? `Dear ${customerName}` : "Dear Customer"}
                </p>
                <div
                  className="mt-1.5 h-0.5 w-6 rounded-full"
                  style={{ backgroundColor: templateMeta.accentColor }}
                />
                <p className="mt-2 line-clamp-4 text-[10px] leading-relaxed text-[#557393]">
                  {previewMessage}
                </p>
                {footerNote ? (
                  <p
                    className="mt-2.5 text-[8px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: templateMeta.accentColor }}
                  >
                    {footerNote}
                  </p>
                ) : null}
              </div>
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
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[50%] flex-col justify-center px-5 py-5">
                {hasSenderInfo ? (
                  <div className="space-y-1.5 rounded-xl p-3 backdrop-blur-sm">
                    {senderName ? (
                      <p className="text-[11px] font-extrabold text-[#0B1F3D]">
                        {senderName}
                      </p>
                    ) : null}
                    {senderTitle ? (
                      <p className="text-[9px] font-bold uppercase tracking-wide text-[#557393]">
                        {senderTitle}
                      </p>
                    ) : null}
                    {phone ? (
                      <p className="text-[9px] text-[#557393]">{phone}</p>
                    ) : null}
                    {emailAddress ? (
                      <p className="break-all text-[9px] text-[#557393]">
                        {emailAddress}
                      </p>
                    ) : null}
                    {website ? (
                      <p
                        className="break-all text-[9px]"
                        style={{ color: templateMeta.accentColor }}
                      >
                        {website}
                      </p>
                    ) : null}
                  </div>
                ) : null}
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
        Preview is approximate. Final print artwork with QR code, profile photo,
        and exact typography is generated on the next step.
      </p>
    </section>
  );
}
