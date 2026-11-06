"use client";

import { useEffect, useState } from "react";

export type ArtworkLightboxSource = {
  title: string;
  subtitle?: string;
  frontUrl: string | null;
  backUrl: string | null;
  cardId?: string | null;
  isSample?: boolean;
};

type CardArtworkLightboxProps = {
  source: ArtworkLightboxSource | null;
  onClose: () => void;
};

export function CardArtworkLightbox({
  source,
  onClose,
}: CardArtworkLightboxProps) {
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    setSide("front");
  }, [source?.frontUrl, source?.backUrl, source?.title]);

  useEffect(() => {
    if (!source) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source, onClose]);

  if (!source) return null;

  const activeUrl = side === "front" ? source.frontUrl : source.backUrl;
  const hasBack = Boolean(source.backUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1F3D]/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={source.title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#C4EBF2] px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-extrabold text-[#0B1F3D]">
              {source.title}
            </p>
            {source.subtitle ? (
              <p className="mt-0.5 text-xs text-[#557393]">{source.subtitle}</p>
            ) : null}
            {source.isSample ? (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Sample preview — not final mailed artwork
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#C4EBF2] px-2.5 py-1 text-xs font-bold text-[#557393] hover:bg-[#F0FAFC]"
          >
            Close
          </button>
        </div>

        <div className="bg-[#F0FAFC] p-4 sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-[#C4EBF2] bg-white">
            <div className="aspect-[3/2] bg-[#E8F4F8]">
              {activeUrl ? (
                <img
                  src={activeUrl}
                  alt={`${side} artwork`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-[#557393]">
                  No {side} artwork
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSide("front")}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  side === "front"
                    ? "bg-[#0B1F3D] text-white"
                    : "bg-white text-[#557393] ring-1 ring-[#C4EBF2]"
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setSide("back")}
                disabled={!hasBack}
                className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${
                  side === "back"
                    ? "bg-[#0B1F3D] text-white"
                    : "bg-white text-[#557393] ring-1 ring-[#C4EBF2]"
                }`}
              >
                Back
              </button>
            </div>
            {source.cardId ? (
              <a
                href={`/dashboard/cards/${source.cardId}`}
                className="text-xs font-bold text-[#38B2D1] hover:underline"
              >
                Open card details →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
