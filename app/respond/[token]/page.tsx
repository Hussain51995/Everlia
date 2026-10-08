"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiClient, ApiClientError } from "@/lib/api/client";
import type { PublicRespondPayload } from "@/lib/types/cards";
import { UserIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

type ResponseType = "thank" | "message" | "contact_request";

function EverliaMark({
  className = "h-14 w-14",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`fill-none stroke-current ${className}`}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 14.5L16 4.5L28 14.5V26.5C28 27.0523 27.5523 27.5 27 27.5H5C4.44772 27.5 4 27.0523 4 26.5V14.5Z" />
      <circle cx="16" cy="18" r="3.5" strokeWidth="2" />
    </svg>
  );
}

function MapPinIcon({
  className = "h-3 w-3",
}: {
  className?: string;
}) {
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

function QuoteIcon({
  className = "h-7 w-7",
}: {
  className?: string;
}) {
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

function BrandHeader() {
  return (
    <header className="flex flex-col items-center pb-3 pt-1 text-center min-[360px]:pb-3.5 sm:pb-5 sm:pt-2">
      <div className="grid h-12 w-12 place-items-center rounded-[1rem] bg-white/95 text-[#38B2D1] shadow-[0_10px_30px_-12px_rgba(56,178,209,0.55)] ring-1 ring-[#C4EBF2] backdrop-blur-sm min-[360px]:h-14 min-[360px]:w-14 min-[360px]:rounded-2xl sm:h-20 sm:w-20 sm:rounded-[1.5rem]">
        <EverliaMark className="h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 sm:h-12 sm:w-12" />
      </div>

      <p className="mt-2 text-[1.35rem] font-extrabold leading-none tracking-[-0.04em] text-[#0B1F3D] min-[360px]:mt-2.5 min-[360px]:text-2xl sm:mt-3.5 sm:text-3xl">
        Everlia™
      </p>

      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#38B2D1] min-[360px]:text-[9px] min-[360px]:tracking-[0.22em]">
        Clients for life
      </p>
    </header>
  );
}

const avatarClassName =
  "h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#E8F7FB] shadow-[0_8px_24px_-10px_rgba(11,31,61,0.35)] ring-[3px] ring-white min-[360px]:h-24 min-[360px]:w-24 min-[410px]:h-28 min-[410px]:w-28 sm:h-32 sm:w-32";

function AgentAvatarFallback() {
  return (
    <div
      className={`grid place-items-center text-[#38B2D1] ${avatarClassName}`}
      aria-hidden
    >
      <UserIcon className="h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 sm:h-14 sm:w-14" />
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
  const hash = [...seed].reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );

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


function AgentProfileCard({
  data,
}: {
  data: PublicRespondPayload;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#C4EBF2]/80 bg-[#F7FCFE]/90 p-3 shadow-xs backdrop-blur-xs min-[360px]:p-3.5 sm:p-4">
      <div className="flex w-full flex-col items-center gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3.5 sm:gap-4.5">
        <AgentAvatar
          name={data.senderName}
          imageUrl={data.profileImageUrl}
        />

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

export default function PublicRespondPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [selected, setSelected] = useState<ResponseType | null>("thank");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["respond", token],
    queryFn: async () => {
      const result = await apiClient<{
        respond: PublicRespondPayload;
      }>(`/api/respond/${token}`);

      return result.respond;
    },
  });

  const submit = useMutation({
    mutationFn: (body: {
      response_type: ResponseType;
      message?: string;
    }) =>
      apiClient(`/api/respond/${token}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => setSubmitted(true),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selected) return;

    await submit.mutateAsync({
      response_type: selected,
      message: selected === "message" ? message : message || undefined,
    });
  };

  const senderFirst = data?.senderName?.split(" ")[0] || "them";

  return (
    <div className="relative min-h-screen min-h-[100svh] overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <img
          src="/images/hero-house-hd.png"
          alt=""
          className="h-full w-full scale-[1.02] object-cover object-[68%_center] min-[480px]:scale-100 min-[480px]:object-[62%_center] sm:object-center"
        />

        <div className="absolute inset-0 bg-[#E2F2F6]/75 backdrop-blur-[2px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen min-h-[100svh] w-full max-w-[30rem] flex-col px-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] min-[340px]:px-3 min-[360px]:px-3.5 min-[360px]:pb-[max(1.75rem,env(safe-area-inset-bottom))] min-[360px]:pt-[max(0.75rem,env(safe-area-inset-top))] sm:max-w-md sm:px-4">
        <BrandHeader />

        {isLoading ? (
          <div className="rounded-[1.35rem] border border-white/80 bg-white/95 p-6 shadow-[0_20px_50px_-15px_rgba(11,31,61,0.22)] backdrop-blur-md min-[360px]:rounded-3xl min-[360px]:p-8 sm:p-10">
            <ThemeLoader label="Opening your card…" size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-[1.35rem] border border-white/80 bg-white/95 px-4 py-7 text-center shadow-[0_20px_50px_-15px_rgba(11,31,61,0.22)] backdrop-blur-md min-[360px]:rounded-3xl min-[360px]:px-5 min-[360px]:py-8 sm:px-6">
            <h1 className="text-lg font-extrabold text-[#0B1F3D] min-[360px]:text-xl">
              Link unavailable
            </h1>

            <p className="mt-2 break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed text-[#557393] min-[360px]:text-sm">
              {error instanceof ApiClientError
                ? error.message
                : "This link is invalid or expired."}
            </p>
          </div>
        ) : submitted ? (
          <div className="rounded-[1.35rem] border border-white/80 bg-white/95 px-4 py-8 text-center shadow-[0_20px_50px_-15px_rgba(11,31,61,0.22)] backdrop-blur-md min-[360px]:rounded-3xl min-[360px]:px-5 min-[360px]:py-9 sm:px-6 sm:py-10">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E8F7FB] text-[#38B2D1] ring-1 ring-[#C4EBF2] min-[360px]:h-14 min-[360px]:w-14">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-current min-[360px]:h-7 min-[360px]:w-7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="mt-4 text-[1.4rem] font-extrabold tracking-tight text-[#0B1F3D] min-[360px]:mt-5 min-[360px]:text-2xl">
              Thank you
            </h1>

            <p className="mx-auto mt-2.5 max-w-sm break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed text-[#557393] min-[360px]:mt-3 min-[360px]:text-sm">
              Your message is on its way to{" "}
              <span className="font-semibold text-[#0B1F3D]">
                {data?.senderName}
              </span>
              . Relationships grow one thoughtful note at a time.
            </p>
          </div>
        ) : (
          <section className="w-full rounded-[1.35rem] border border-white/80 bg-white/95 px-3 py-4 shadow-[0_20px_50px_-15px_rgba(11,31,61,0.22)] backdrop-blur-md min-[340px]:px-3.5 min-[360px]:rounded-3xl min-[360px]:px-4 min-[360px]:py-5 sm:rounded-[1.75rem] sm:px-6 sm:py-7">
            <p className="break-words [overflow-wrap:anywhere] text-[9px] font-bold uppercase tracking-[0.16em] text-[#38B2D1] min-[360px]:text-[10px] min-[360px]:tracking-[0.18em]">
              {data?.occasionLabel ?? "A personal note"}
            </p>

            <h1 className="font-cursive mt-1 break-words [overflow-wrap:anywhere] text-[1.7rem] font-bold italic leading-[1.08] text-[#0B1F3D] min-[360px]:text-[1.95rem] sm:text-[2.4rem]">
              Dear {data?.customerFirstName},
            </h1>

            <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B849E] min-[360px]:text-[12.5px] sm:text-[13px]">
              You&apos;re responding to your real estate agent.
            </p>

            {data ? (
              <div className="mt-3 min-[360px]:mt-3.5 sm:mt-4">
                <AgentProfileCard data={data} />
              </div>
            ) : null}

            {data?.personalMessage ? (
              <div className="mt-3 rounded-2xl border border-[#DDF3F8] bg-[#EEF8FB] px-3 py-2.5 min-[360px]:mt-3.5 min-[360px]:px-3.5 min-[360px]:py-3 sm:mt-4 sm:px-4 sm:py-3.5">
                <QuoteIcon className="h-4 w-5 text-[#8FD4E6] sm:h-5 sm:w-6" />

                <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] font-medium leading-relaxed text-[#0B1F3D] min-[360px]:text-[13.5px] sm:text-[14px]">
                  {data.personalMessage}
                </p>
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="mt-4 space-y-2.5 min-[360px]:mt-5 sm:mt-6 sm:space-y-3"
            >
              <p className="text-[13.5px] font-extrabold leading-snug text-[#0B1F3D] min-[360px]:text-[14px] sm:text-[15px]">
                How would you like to respond?
              </p>

              {(
                [
                  {
                    id: "thank" as const,
                    title: `Thank ${senderFirst}`,
                    desc: "Send a warm note of appreciation.",
                  },
                  {
                    id: "message" as const,
                    title: "Send a Message",
                    desc: "Write a personal reply.",
                  },
                  {
                    id: "contact_request" as const,
                    title: `Ask ${senderFirst} to Contact Me`,
                    desc: "Let them know you’d like to connect.",
                  },
                ] as const
              ).map((option) => {
                const isActive = selected === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelected(option.id)}
                    aria-pressed={isActive}
                    className={`flex min-h-12 w-full touch-manipulation items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] min-[360px]:min-h-[3.4rem] min-[360px]:items-center min-[360px]:gap-3 min-[360px]:px-3.5 sm:min-h-[3.6rem] sm:py-3 ${isActive
                      ? "border-[#38B2D1] bg-[#F0FAFC] shadow-xs"
                      : "border-[#D7E8EE] bg-white/90 hover:bg-[#F9FDFE]"
                      }`}
                  >
                    <span
                      className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 min-[360px]:mt-0 ${isActive
                        ? "border-[#38B2D1] bg-[#38B2D1]"
                        : "border-[#B7D5DF] bg-white"
                        }`}
                      aria-hidden
                    >
                      {isActive ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block break-words [overflow-wrap:anywhere] text-[13px] font-extrabold leading-snug text-[#0B1F3D] min-[360px]:text-[13.5px] sm:text-sm">
                        {option.title}
                      </span>

                      <span className="mt-0.5 block break-words [overflow-wrap:anywhere] text-[11px] leading-snug text-[#6B849E] min-[360px]:text-[11.5px] sm:text-xs">
                        {option.desc}
                      </span>
                    </span>
                  </button>
                );
              })}

              {selected ? (
                <label className="block space-y-1.5 pt-0.5 min-[360px]:pt-1">
                  <span className="text-[11.5px] font-bold text-[#0B1F3D] min-[360px]:text-xs">
                    {selected === "message" ? "Your message" : "Optional note"}
                  </span>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    required={selected === "message"}
                    placeholder={
                      selected === "message"
                        ? "Write your message…"
                        : "Add a personal note (optional)..."
                    }
                    className="min-h-[6.5rem] w-full resize-y rounded-2xl border border-[#D7E8EE] bg-white px-3 py-2.5 text-base leading-relaxed text-[#0B1F3D] outline-none transition placeholder:text-[#9BB0C2] focus:border-[#38B2D1] focus:ring-2 focus:ring-[#38B2D1]/15 min-[360px]:px-3.5 min-[360px]:py-3 sm:min-h-0 sm:resize-none sm:text-sm"
                  />
                </label>
              ) : null}

              {submit.isError ? (
                <p className="break-words [overflow-wrap:anywhere] text-xs font-semibold text-rose-600">
                  {submit.error instanceof ApiClientError
                    ? submit.error.message
                    : "Something went wrong."}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!selected || submit.isPending}
                className="mt-1 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#0B1F3D] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_25px_-8px_rgba(11,31,61,0.45)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 min-[360px]:min-h-[3.25rem] min-[360px]:text-[15px] sm:min-h-[3.35rem]"
              >
                {submit.isPending ? "Sending…" : "Send response"}

                {!submit.isPending ? (
                  <span aria-hidden className="text-base leading-none">
                    →
                  </span>
                ) : null}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
