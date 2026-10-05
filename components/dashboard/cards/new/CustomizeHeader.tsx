"use client";

import { RefetchButton } from "@/components/ui/RefetchButton";
import type { CardSide } from "./types";

type CustomizeHeaderProps = {
  templateName: string;
  activeSide: CardSide;
  onRefetch: () => void;
  isRefreshing: boolean;
};

export function CustomizeHeader({
  templateName,
  activeSide,
  onRefetch,
  isRefreshing,
}: CustomizeHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#38B2D1]">
            Customize
          </div>
          <span className="rounded-full bg-[#F0FAFC] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#557393]">
            {activeSide === "front" ? "Step 1 of 2" : "Step 2 of 2"}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-[#0B1F3D]">
          {templateName}
        </h1>
        <p
          key={activeSide}
          aria-live="polite"
          className="card-step-copy mt-1 text-sm text-[#557393]"
        >
          {activeSide === "front"
            ? "Personalize the front of the card, then continue to the back."
            : "Add the sender information that should appear on the back."}
        </p>
      </div>
      <RefetchButton onClick={onRefetch} isRefreshing={isRefreshing} />
      <style jsx>{`
        @keyframes card-step-copy-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .card-step-copy {
          animation: card-step-copy-in 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .card-step-copy {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
