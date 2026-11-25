"use client";

import { useState } from "react";
import type { PublicRespondPayload } from "@/lib/types/cards";
import { UserIcon } from "@/components/ui/Icons";

function MapPinIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

const avatarClassName =
  "h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#E8F7FB] shadow-[0_8px_24px_-10px_rgba(11,31,61,0.35)] ring-[3px] ring-white min-[360px]:h-[4.5rem] min-[360px]:w-[4.5rem] sm:h-20 sm:w-20 lg:h-[4.75rem] lg:w-[4.75rem]";

function AgentAvatarFallback() {
  return (
    <div
      className={`grid place-items-center text-[#38B2D1] ${avatarClassName}`}
      aria-hidden
    >
      <UserIcon className="h-7 w-7 sm:h-8 sm:w-8" />
    </div>
  );
}

const FALLBACK_AVATARS = [
  "/avatars/avatar-01.webp",
  "/avatars/avatar-02.webp",
  "/avatars/avatar-03.webp",
  "/avatars/avatar-04.webp",
  "/avatars/avatar-05.webp",
  "/avatars/avatar-06.webp",
  "/avatars/avatar-07.webp",
  "/avatars/avatar-08.webp",
  "/avatars/avatar-09.webp",
  "/avatars/avatar-10.webp",
];

function getFallbackAvatar(name: string) {
  const seed = (name || "agent").trim();
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_AVATARS[Math.abs(hash) % FALLBACK_AVATARS.length];
}

function AgentAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const fallbackUrl = getFallbackAvatar(name);

  if (fallbackFailed) {
    return <AgentAvatarFallback />;
  }

  const hasCustomPhoto = Boolean(imageUrl && imageUrl.trim());
  const currentSrc =
    !hasCustomPhoto || photoFailed ? fallbackUrl : imageUrl || fallbackUrl;

  return (
    <div className={avatarClassName}>
      <img
        src={currentSrc}
        alt={name}
        onError={() => {
          if (!photoFailed && hasCustomPhoto) {
            setPhotoFailed(true);
          } else {
            setFallbackFailed(true);
          }
        }}
        className="h-full w-full rounded-full object-cover object-center"
      />
    </div>
  );
}

export function AgentProfileCard({ data }: { data: PublicRespondPayload }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#C4EBF2]/80 bg-[#F7FCFE]/90 p-3 shadow-xs backdrop-blur-xs min-[360px]:p-3.5 sm:p-4">
      <div className="flex w-full flex-col items-center gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3.5 sm:gap-4.5">
        <AgentAvatar name={data.senderName} imageUrl={data.profileImageUrl} />

        <div className="flex min-w-0 w-full flex-1 flex-col justify-center text-center min-[380px]:w-auto min-[380px]:py-0.5 min-[380px]:text-left">
          <p className="break-words [overflow-wrap:anywhere] text-[15px] font-extrabold leading-snug text-[#0B1F3D] min-[360px]:text-[16px] sm:text-lg">
            {data.senderName}
          </p>

          <p className="mt-0.5 break-words [overflow-wrap:anywhere] text-[11.5px] font-medium leading-relaxed text-[#557393] min-[360px]:text-[12px] sm:text-[13px]">
            {data.senderTitle || "Real Estate Agent"}
          </p>

          {data.organizationName ? (
            <p className="mt-0.5 break-words [overflow-wrap:anywhere] text-[11.5px] leading-relaxed text-[#557393] min-[360px]:text-[12px] sm:text-[13px]">
              {data.organizationName}
            </p>
          ) : null}

          <div className="mt-2 flex justify-center min-[380px]:justify-start sm:mt-2.5">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#38B2D1] px-2.5 py-1 text-[10px] font-bold leading-none text-white shadow-xs">
              <MapPinIcon className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">Local market expert</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuoteIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 24"
      className={`fill-current ${className}`}
      aria-hidden
    >
      <path d="M0 24V14.4C0 9.2 1.3 5.3 3.9 2.7 6.5.9 9.7 0 13.4 0v5.1c-2.3.2-4 1-5.1 2.3-1.1 1.3-1.6 3.2-1.6 5.7H13V24H0Zm19 0V14.4c0-5.2 1.3-9.1 3.9-11.7C25.5.9 28.7 0 32.4 0v5.1c-2.3.2-4 1-5.1 2.3-1.1 1.3-1.6 3.2-1.6 5.7H32V24H19Z" />
    </svg>
  );
}
